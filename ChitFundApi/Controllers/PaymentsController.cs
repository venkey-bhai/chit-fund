using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ChitFundApi.Data;
using ChitFundApi.Models;
using ChitFundApi.DTOs;
using ChitFundApi.Services;

namespace ChitFundApi.Controllers
{
    [ApiController]
    [Route("api/v1/payments")]
    [Route("api/collections")]
    public class PaymentsController : ControllerBase
    {
        private readonly ChitFundDbContext _context;
        private readonly IAuditService _auditService;
        private readonly INotificationService _notifications;

        public PaymentsController(ChitFundDbContext context, IAuditService auditService, INotificationService notifications)
        {
            _context = context;
            _auditService = auditService;
            _notifications = notifications;
        }

        // GET: api/v1/payments & api/collections
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int? chitGroupId, [FromQuery] int? customerId, [FromQuery] string? search)
        {
            var query = _context.Payments
                .Include(p => p.ChitGroup)
                .Include(p => p.PaymentMode)
                .Include(p => p.Customer)
                .AsQueryable();

            if (chitGroupId.HasValue && chitGroupId.Value > 0)
            {
                query = query.Where(p => p.ChitGroupId == chitGroupId.Value);
            }

            if (customerId.HasValue && customerId.Value > 0)
            {
                query = query.Where(p => p.CustomerId == customerId.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(p =>
                    p.ChitPerson.ToLower().Contains(term) ||
                    p.ReceiptNumber.ToLower().Contains(term) ||
                    (p.ChitGroup != null && p.ChitGroup.GroupName.ToLower().Contains(term)) ||
                    (p.PaymentMode != null && p.PaymentMode.Name.ToLower().Contains(term)));
            }

            var list = await query
                .OrderByDescending(p => p.CollectionDate)
                .Select(p => new
                {
                    p.Id,
                    p.ChitGroupId,
                    ChitGroupTitle = p.ChitGroup != null ? p.ChitGroup.GroupName : "N/A",
                    ChitGroupCode = p.ChitGroup != null ? p.ChitGroup.GroupCode : "N/A",
                    p.CustomerId,
                    MemberId = p.CustomerId, // compatibility
                    // chitfund.txt input fields:
                    p.CollectionDate,
                    p.ChitDate,
                    p.ChitPerson,
                    p.Amount,
                    // Additional info:
                    PaymentMode = p.PaymentMode != null ? p.PaymentMode.Name : "Cash",
                    p.PaymentModeId,
                    ReferenceNumber = p.TransactionReference,
                    TransactionReference = p.TransactionReference,
                    p.ReceiptNumber,
                    p.LateFine,
                    p.Status,
                    p.Remarks,
                    p.CreatedAt
                })
                .ToListAsync();

            return Ok(list);
        }

        // GET: api/v1/payments/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(long id)
        {
            var payment = await _context.Payments
                .Include(p => p.ChitGroup)
                .Include(p => p.PaymentMode)
                .Include(p => p.Customer)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (payment == null) return NotFound(ApiResponse<string>.Fail("Payment record not found."));

            return Ok(new
            {
                payment.Id,
                payment.ChitGroupId,
                ChitGroupTitle = payment.ChitGroup?.GroupName ?? "N/A",
                ChitGroupCode = payment.ChitGroup?.GroupCode ?? "N/A",
                payment.CustomerId,
                MemberId = payment.CustomerId,
                // chitfund.txt input fields:
                payment.CollectionDate,
                payment.ChitDate,
                payment.ChitPerson,
                payment.Amount,
                // Additional info:
                PaymentMode = payment.PaymentMode?.Name ?? "Cash",
                payment.TransactionReference,
                ReferenceNumber = payment.TransactionReference,
                payment.ReceiptNumber,
                payment.LateFine,
                payment.Status,
                payment.Remarks,
                payment.CreatedAt
            });
        }

        // POST: api/v1/payments (Payment Collection Entry)
        // Implements: collection date, chit date, chit person, amount
        [HttpPost]
        public async Task<IActionResult> RecordPayment([FromBody] PaymentCollectionRequest req)
        {
            if (req.Amount <= 0)
            {
                return BadRequest(ApiResponse<string>.Fail("Payment amount must be greater than 0."));
            }
            if (string.IsNullOrWhiteSpace(req.ChitPerson))
            {
                return BadRequest(ApiResponse<string>.Fail("Chit Person name is required."));
            }

            var group = await _context.ChitGroups.FindAsync(req.ChitGroupId);
            if (group == null)
            {
                return BadRequest(ApiResponse<string>.Fail("Valid Chit Scheme is required."));
            }

            // Find or link customer
            int? customerId = req.CustomerId;
            if (!customerId.HasValue || customerId.Value <= 0)
            {
                var existingCustomer = await _context.Customers
                    .FirstOrDefaultAsync(c => c.FullName.ToLower() == req.ChitPerson.Trim().ToLower());
                if (existingCustomer != null)
                {
                    customerId = existingCustomer.Id;
                }
            }

            // Resolve PaymentModeId
            int modeId = req.PaymentModeId > 0 ? req.PaymentModeId : 1;
            if (!string.IsNullOrWhiteSpace(req.PaymentModeName))
            {
                var mode = await _context.PaymentModes.FirstOrDefaultAsync(m => m.Name.ToLower() == req.PaymentModeName.Trim().ToLower());
                if (mode != null) modeId = mode.Id;
            }

            // Generate receipt number REC-YYYYMMDD-XXXX
            var date = req.CollectionDate != default ? req.CollectionDate : DateTime.UtcNow;
            int todayCount = await _context.Payments.CountAsync(p => p.CollectionDate.Date == date.Date);
            string receiptNumber = $"REC-{date:yyyyMMdd}-{(todayCount + 1):D4}";

            // Calculate grace days check
            string status = "Completed";
            var chitDate = req.ChitDate != default ? req.ChitDate : date;
            var graceEndDate = chitDate.AddDays(group.GraceDays);

            decimal lateFine = req.LateFine;
            if (date.Date > graceEndDate.Date && lateFine == 0)
            {
                lateFine = Math.Round(req.Amount * 0.02m, 2); // 2% late fee penalty
            }

            var payment = new Payment
            {
                ChitGroupId = req.ChitGroupId,
                CustomerId = customerId,
                InstallmentId = req.InstallmentId,
                PaymentModeId = modeId,
                ReceiptNumber = receiptNumber,
                Amount = req.Amount,
                CollectionDate = date,
                ChitDate = chitDate,
                ChitPerson = req.ChitPerson.Trim(),
                PaymentDate = date,
                TransactionReference = req.TransactionReference?.Trim(),
                LateFine = lateFine,
                Status = status,
                Remarks = req.Remarks?.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            _context.Payments.Add(payment);
            await _context.SaveChangesAsync();

            await _auditService.LogAsync(1, "RECORD_PAYMENT", "Payment", payment.Id.ToString(), $"Collected ₹{payment.Amount:N2} from {payment.ChitPerson} ({receiptNumber})");

            _notifications.QueuePaymentReceipt(payment.Id); // SMS + WhatsApp receipt (background)

            var modeObj = await _context.PaymentModes.FindAsync(modeId);

            var responseObj = new
            {
                payment.Id,
                payment.ChitGroupId,
                ChitGroupTitle = group.GroupName,
                ChitGroupCode = group.GroupCode,
                payment.CustomerId,
                MemberId = payment.CustomerId,
                payment.CollectionDate,
                payment.ChitDate,
                payment.ChitPerson,
                payment.Amount,
                PaymentMode = modeObj?.Name ?? "Cash",
                payment.TransactionReference,
                ReferenceNumber = payment.TransactionReference,
                payment.ReceiptNumber,
                payment.LateFine,
                payment.Status,
                payment.Remarks,
                payment.CreatedAt
            };

            return CreatedAtAction(nameof(GetById), new { id = payment.Id }, responseObj);
        }

        // POST: api/v1/payments/{id}/reverse (Reversal workflow per FR-07)
        [HttpPost("{id}/reverse")]
        public async Task<IActionResult> ReversePayment(long id, [FromBody] string? reason)
        {
            var payment = await _context.Payments.FindAsync(id);
            if (payment == null) return NotFound(ApiResponse<string>.Fail("Payment not found."));

            payment.Status = "Reversed";
            payment.Remarks = (payment.Remarks + $" [Reversed: {reason ?? "Admin correction"}]").Trim();
            await _context.SaveChangesAsync();

            await _auditService.LogAsync(1, "REVERSE_PAYMENT", "Payment", id.ToString(), reason ?? "Reversal requested");

            return Ok(ApiResponse<string>.Ok("Payment reversed successfully. Audit record created."));
        }

        // DELETE: api/v1/payments/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(long id)
        {
            var payment = await _context.Payments.FindAsync(id);
            if (payment == null) return NotFound(ApiResponse<string>.Fail("Payment not found."));

            _context.Payments.Remove(payment);
            await _context.SaveChangesAsync();
            await _auditService.LogAsync(1, "DELETE_PAYMENT", "Payment", id.ToString());

            return Ok(ApiResponse<string>.Ok("Payment record deleted."));
        }
    }
}
