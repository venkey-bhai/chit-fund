using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ChitFundApi.Data;
using ChitFundApi.Models;
using ChitFundApi.DTOs;
using ChitFundApi.Services;

namespace ChitFundApi.Controllers
{
    [ApiController]
    [Route("api/v1/customers")]
    [Route("api/members")]
    public class CustomersController : ControllerBase
    {
        private readonly ChitFundDbContext _context;
        private readonly IAuditService _auditService;

        public CustomersController(ChitFundDbContext context, IAuditService auditService)
        {
            _context = context;
            _auditService = auditService;
        }

        // GET: api/v1/customers
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? search)
        {
            var query = _context.Customers
                .Include(c => c.Memberships)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(c =>
                    c.FullName.ToLower().Contains(term) ||
                    c.CustomerCode.ToLower().Contains(term) ||
                    c.Mobile.Contains(term) ||
                    (c.Email != null && c.Email.ToLower().Contains(term)) ||
                    (c.AadhaarOrPan != null && c.AadhaarOrPan.ToLower().Contains(term)));
            }

            var list = await query
                .OrderBy(c => c.FullName)
                .Select(c => new
                {
                    c.Id,
                    c.CustomerCode,
                    c.FullName,
                    c.Mobile,
                    Phone = c.Mobile, // compatibility alias
                    c.Email,
                    c.AadhaarOrPan,
                    c.Address,
                    c.NomineeName,
                    c.NomineeRelation,
                    c.KycStatus,
                    c.Status,
                    EnrolledChitsCount = c.Memberships.Count,
                    TotalPaid = _context.Payments
                        .Where(p => p.CustomerId == c.Id || p.ChitPerson.ToLower() == c.FullName.ToLower())
                        .Sum(p => (decimal?)p.Amount) ?? 0,
                    c.RegistrationDate,
                    c.CreatedAt
                })
                .ToListAsync();

            return Ok(list);
        }

        // GET: api/v1/customers/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var customer = await _context.Customers
                .Include(c => c.Memberships)
                    .ThenInclude(m => m.ChitGroup)
                .Include(c => c.Documents)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (customer == null)
            {
                return NotFound(ApiResponse<string>.Fail("Customer not found."));
            }

            var payments = await _context.Payments
                .Include(p => p.ChitGroup)
                .Include(p => p.PaymentMode)
                .Where(p => p.CustomerId == id || p.ChitPerson.ToLower() == customer.FullName.ToLower())
                .OrderByDescending(p => p.CollectionDate)
                .Select(p => new
                {
                    p.Id,
                    p.ReceiptNumber,
                    p.CollectionDate,
                    p.ChitDate,
                    p.Amount,
                    PaymentMode = p.PaymentMode != null ? p.PaymentMode.Name : "Cash",
                    p.TransactionReference,
                    p.Status,
                    ChitGroupTitle = p.ChitGroup != null ? p.ChitGroup.GroupName : "N/A"
                })
                .ToListAsync();

            var result = new
            {
                customer.Id,
                customer.CustomerCode,
                customer.FullName,
                customer.Mobile,
                Phone = customer.Mobile,
                customer.Email,
                customer.DateOfBirth,
                customer.Address,
                customer.AadhaarOrPan,
                customer.NomineeName,
                customer.NomineeRelation,
                customer.KycStatus,
                customer.Status,
                customer.RegistrationDate,
                customer.CreatedAt,
                TotalPaid = payments.Sum(p => p.Amount),
                Memberships = customer.Memberships.Select(m => new
                {
                    m.Id,
                    m.ChitGroupId,
                    ChitGroupTitle = m.ChitGroup?.GroupName ?? "N/A",
                    ChitGroupCode = m.ChitGroup?.GroupCode ?? "N/A",
                    m.MemberCode,
                    m.TicketNumber,
                    m.JoiningDate,
                    m.HasPrized,
                    m.PrizedMonthNumber,
                    m.PrizedAmount
                }),
                Passbook = payments,
                Documents = customer.Documents
            };

            return Ok(result);
        }

        // POST: api/v1/customers
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CustomerCreateDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.FullName))
            {
                return BadRequest(ApiResponse<string>.Fail("Customer full name is required."));
            }
            if (string.IsNullOrWhiteSpace(dto.Mobile))
            {
                return BadRequest(ApiResponse<string>.Fail("Mobile number is required."));
            }

            // Generate unique customer code CUS-XXXX
            int count = await _context.Customers.CountAsync();
            string code = $"CUS-{(count + 1):D4}";

            var customer = new Customer
            {
                CustomerCode = code,
                FullName = dto.FullName.Trim(),
                Mobile = dto.Mobile.Trim(),
                Email = dto.Email?.Trim(),
                DateOfBirth = dto.DateOfBirth,
                Address = dto.Address?.Trim(),
                AadhaarOrPan = dto.AadhaarOrPan?.Trim().ToUpper(),
                NomineeName = dto.NomineeName?.Trim(),
                NomineeRelation = dto.NomineeRelation?.Trim(),
                KycStatus = "Verified",
                RegistrationDate = DateTime.UtcNow.Date,
                Status = "Active",
                CreatedAt = DateTime.UtcNow
            };

            _context.Customers.Add(customer);
            await _context.SaveChangesAsync();

            await _auditService.LogAsync(1, "CREATE_CUSTOMER", "Customer", customer.Id.ToString(), $"Registered {customer.FullName}");

            return CreatedAtAction(nameof(GetById), new { id = customer.Id }, customer);
        }

        // PUT: api/v1/customers/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] CustomerCreateDto dto)
        {
            var customer = await _context.Customers.FindAsync(id);
            if (customer == null)
            {
                return NotFound(ApiResponse<string>.Fail("Customer not found."));
            }

            customer.FullName = dto.FullName.Trim();
            customer.Mobile = dto.Mobile.Trim();
            customer.Email = dto.Email?.Trim();
            customer.DateOfBirth = dto.DateOfBirth;
            customer.Address = dto.Address?.Trim();
            customer.AadhaarOrPan = dto.AadhaarOrPan?.Trim().ToUpper();
            customer.NomineeName = dto.NomineeName?.Trim();
            customer.NomineeRelation = dto.NomineeRelation?.Trim();
            customer.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            await _auditService.LogAsync(1, "UPDATE_CUSTOMER", "Customer", customer.Id.ToString());

            return Ok(customer);
        }

        // DELETE: api/v1/customers/{id} (Soft-deactivate per FR-03)
        [HttpDelete("{id}")]
        public async Task<IActionResult> Deactivate(int id)
        {
            var customer = await _context.Customers.FindAsync(id);
            if (customer == null)
            {
                return NotFound(ApiResponse<string>.Fail("Customer not found."));
            }

            customer.Status = "Deactivated";
            customer.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await _auditService.LogAsync(1, "DEACTIVATE_CUSTOMER", "Customer", customer.Id.ToString());
            return Ok(ApiResponse<string>.Ok("Customer deactivated successfully. Financial history preserved."));
        }

        // PUT: api/v1/customers/{id}/status (checked = Active, unchecked = Deactivated)
        [HttpPut("{id}/status")]
        public async Task<IActionResult> SetStatus(int id, [FromBody] CustomerStatusDto dto)
        {
            var customer = await _context.Customers.FindAsync(id);
            if (customer == null)
            {
                return NotFound(ApiResponse<string>.Fail("Customer not found."));
            }

            customer.Status = dto.IsActive ? "Active" : "Deactivated";
            customer.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await _auditService.LogAsync(1, dto.IsActive ? "ACTIVATE_CUSTOMER" : "DEACTIVATE_CUSTOMER", "Customer", customer.Id.ToString());
            return Ok(ApiResponse<string>.Ok(customer.Status, $"Customer {customer.Status.ToLower()}."));
        }

        // GET: api/v1/customers/{id}/memberships
        [HttpGet("{id}/memberships")]
        public async Task<IActionResult> GetMemberships(int id)
        {
            var memberships = await _context.ChitMembers
                .Include(m => m.ChitGroup)
                .Where(m => m.CustomerId == id)
                .ToListAsync();

            return Ok(ApiResponse<object>.Ok(memberships));
        }

        // GET: api/v1/customers/{id}/payments
        [HttpGet("{id}/payments")]
        public async Task<IActionResult> GetPayments(int id)
        {
            var payments = await _context.Payments
                .Include(p => p.ChitGroup)
                .Include(p => p.PaymentMode)
                .Where(p => p.CustomerId == id)
                .OrderByDescending(p => p.CollectionDate)
                .ToListAsync();

            return Ok(ApiResponse<object>.Ok(payments));
        }
    }
}
