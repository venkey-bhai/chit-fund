using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ChitFundApi.Data;
using ChitFundApi.Models;
using ChitFundApi.DTOs;
using ChitFundApi.Services;

namespace ChitFundApi.Controllers
{
    [ApiController]
    [Route("api/v1/chit-groups")]
    [Route("api/chitgroups")]
    public class ChitGroupsController : ControllerBase
    {
        private readonly ChitFundDbContext _context;
        private readonly IAuditService _auditService;

        public ChitGroupsController(ChitFundDbContext context, IAuditService auditService)
        {
            _context = context;
            _auditService = auditService;
        }

        // GET: api/v1/chit-groups
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var groups = await _context.ChitGroups
                .Include(g => g.Members)
                .OrderByDescending(g => g.CreatedAt)
                .Select(g => new
                {
                    g.Id,
                    g.GroupCode,
                    GroupName = g.GroupName,
                    Title = g.GroupName, // compatibility
                    TotalAmount = g.ChitValue, // compatibility
                    g.ChitValue,
                    g.DurationYears,
                    DurationMonths = g.DurationMonths,
                    NumberOfMonths = g.DurationMonths, // compatibility
                    TotalMembers = g.TotalMembers,
                    NumberOfMembers = g.TotalMembers, // compatibility
                    g.MaxMembers,
                    g.StartDate,
                    g.EndDate,
                    g.MonthlyStartingDate,
                    g.GraceDays,
                    g.GracePeriod,
                    MonthlySubscription = g.MonthlySubscription,
                    MonthlyInstallment = g.MonthlySubscription, // compatibility
                    g.ForemanCommissionPercentage,
                    g.Status,
                    EnrolledCount = g.Members.Count,
                    TotalCollected = _context.Payments
                        .Where(p => p.ChitGroupId == g.Id && p.Status == "Completed")
                        .Sum(p => (decimal?)p.Amount) ?? 0,
                    g.CreatedAt
                })
                .ToListAsync();

            return Ok(groups);
        }

        // GET: api/v1/chit-groups/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var group = await _context.ChitGroups
                .Include(g => g.Members)
                    .ThenInclude(m => m.Customer)
                .Include(g => g.Auctions)
                    .ThenInclude(a => a.Result)
                .FirstOrDefaultAsync(g => g.Id == id);

            if (group == null)
            {
                return NotFound(ApiResponse<string>.Fail("Chit group not found."));
            }

            var totalCollected = await _context.Payments
                .Where(p => p.ChitGroupId == id && p.Status == "Completed")
                .SumAsync(p => (decimal?)p.Amount) ?? 0;

            // Generate monthly schedule table with:
            // "how much amount will pay" and "remaining amount to company"
            var schedules = GenerateScheduleTable(group);

            var response = new
            {
                group.Id,
                group.GroupCode,
                GroupName = group.GroupName,
                Title = group.GroupName,
                TotalAmount = group.ChitValue,
                group.ChitValue,
                group.DurationYears,
                DurationMonths = group.DurationMonths,
                NumberOfMonths = group.DurationMonths,
                TotalMembers = group.TotalMembers,
                NumberOfMembers = group.TotalMembers,
                group.MaxMembers,
                group.StartDate,
                group.EndDate,
                group.MonthlyStartingDate,
                group.GraceDays,
                group.GracePeriod,
                MonthlySubscription = group.MonthlySubscription,
                MonthlyInstallment = group.MonthlySubscription,
                group.ForemanCommissionPercentage,
                group.Status,
                group.AgreementReference,
                TotalCollected = totalCollected,
                Memberships = group.Members.Select(m => new
                {
                    m.Id,
                    m.CustomerId,
                    MemberName = m.Customer?.FullName ?? "Unknown",
                    Phone = m.Customer?.Mobile,
                    m.Customer?.Email,
                    m.MemberCode,
                    m.TicketNumber,
                    m.JoiningDate,
                    m.HasPrized,
                    m.PrizedMonthNumber,
                    m.PrizedAmount
                }).OrderBy(m => m.TicketNumber),
                Schedules = schedules
            };

            return Ok(response);
        }

        // POST: api/v1/chit-groups
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] ChitGroupCreateRequest req)
        {
            if (req.ChitValue <= 0)
            {
                return BadRequest(ApiResponse<string>.Fail("Total chit value must be greater than 0."));
            }

            int months = req.DurationMonths;
            decimal years = req.DurationYears;

            if (months <= 0 && years > 0)
            {
                months = (int)Math.Round(years * 12);
            }
            else if (years <= 0 && months > 0)
            {
                years = Math.Round((decimal)months / 12.0m, 2);
            }

            if (months <= 0) months = 12;

            int members = req.TotalMembers > 0 ? req.TotalMembers : months;
            int maxMembers = req.MaxMembers > 0 ? req.MaxMembers : members;

            var startDate = req.StartDate != default ? req.StartDate.Date : DateTime.UtcNow.Date;
            var endDate = req.EndDate.HasValue && req.EndDate.Value > startDate
                ? req.EndDate.Value.Date
                : startDate.AddMonths(months - 1);

            decimal monthlySub = Math.Round(req.ChitValue / months, 2);

            var group = new ChitGroup
            {
                GroupCode = string.IsNullOrWhiteSpace(req.GroupCode) ? $"CF-{DateTime.UtcNow:yyyyMM}-{Guid.NewGuid().ToString().Substring(0, 4).ToUpper()}" : req.GroupCode.Trim().ToUpper(),
                GroupName = string.IsNullOrWhiteSpace(req.GroupName) ? $"Chit Fund ₹{req.ChitValue:N0} ({months}M)" : req.GroupName.Trim(),
                ChitValue = req.ChitValue,
                DurationYears = years,
                DurationMonths = months,
                TotalMembers = members,
                MaxMembers = maxMembers,
                StartDate = startDate,
                EndDate = endDate,
                MonthlyStartingDate = req.MonthlyStartingDate > 0 && req.MonthlyStartingDate <= 31 ? req.MonthlyStartingDate : 5,
                GraceDays = req.GraceDays >= 0 ? req.GraceDays : 5,
                GracePeriod = string.IsNullOrWhiteSpace(req.GracePeriod) ? $"{req.GraceDays} days grace period after due date." : req.GracePeriod.Trim(),
                MonthlySubscription = monthlySub,
                ForemanCommissionPercentage = req.ForemanCommissionPercentage > 0 ? req.ForemanCommissionPercentage : 5.0m,
                AgreementReference = req.AgreementReference?.Trim(),
                Status = "Active",
                CreatedAt = DateTime.UtcNow
            };

            _context.ChitGroups.Add(group);
            await _context.SaveChangesAsync();

            await _auditService.LogAsync(1, "CREATE_CHIT_GROUP", "ChitGroup", group.Id.ToString(), $"Created {group.GroupName}");

            return CreatedAtAction(nameof(GetById), new { id = group.Id }, group);
        }

        // POST: api/v1/chit-groups/{id}/members (Enroll member)
        [HttpPost("{id}/members")]
        [HttpPost("{id}/enroll")]
        public async Task<IActionResult> EnrollMember(int id, [FromBody] EnrollMemberRequest req)
        {
            var group = await _context.ChitGroups.Include(g => g.Members).FirstOrDefaultAsync(g => g.Id == id);
            if (group == null) return NotFound(ApiResponse<string>.Fail("Chit group not found."));

            var customer = await _context.Customers.FindAsync(req.CustomerId);
            if (customer == null) return NotFound(ApiResponse<string>.Fail("Customer not found."));

            if (group.Members.Any(m => m.CustomerId == req.CustomerId))
            {
                return BadRequest(ApiResponse<string>.Fail("Customer is already enrolled in this chit group."));
            }

            if (group.Members.Count >= group.MaxMembers)
            {
                return BadRequest(ApiResponse<string>.Fail($"Group has reached maximum limit of {group.MaxMembers} members."));
            }

            int ticket = req.TicketNumber > 0 ? req.TicketNumber : group.Members.Count + 1;
            var usedTickets = group.Members.Select(m => m.TicketNumber).ToHashSet();
            while (usedTickets.Contains(ticket))
            {
                ticket++;
            }

            var membership = new ChitMember
            {
                CustomerId = req.CustomerId,
                ChitGroupId = id,
                MemberCode = $"MEM-G{id}-{ticket:D3}",
                TicketNumber = ticket,
                JoiningDate = DateTime.UtcNow.Date,
                Status = "Active"
            };

            _context.ChitMembers.Add(membership);
            await _context.SaveChangesAsync();

            // Auto-generate member installments
            for (int m = 1; m <= group.DurationMonths; m++)
            {
                var dueDate = group.StartDate.AddMonths(m - 1);
                var graceDate = dueDate.AddDays(group.GraceDays);
                _context.Installments.Add(new Installment
                {
                    ChitMemberId = membership.Id,
                    InstallmentNumber = m,
                    DueDate = dueDate,
                    GraceEndDate = graceDate,
                    DueAmount = group.MonthlySubscription,
                    NetPayableAmount = group.MonthlySubscription,
                    Status = "Due"
                });
            }
            await _context.SaveChangesAsync();

            await _auditService.LogAsync(1, "ENROLL_MEMBER", "ChitMember", membership.Id.ToString(), $"Enrolled {customer.FullName} to {group.GroupName}");

            return Ok(ApiResponse<object>.Ok(new
            {
                membershipId = membership.Id,
                ticketNumber = ticket,
                memberCode = membership.MemberCode
            }, "Member enrolled successfully"));
        }

        // GET: api/v1/chit-groups/{id}/schedules & api/chitschedules/group/{id}
        [HttpGet("{id}/schedules")]
        [HttpGet("/api/chitschedules/group/{id}")]
        public async Task<IActionResult> GetSchedules(int id)
        {
            var group = await _context.ChitGroups
                .Include(g => g.Auctions)
                    .ThenInclude(a => a.Result)
                .FirstOrDefaultAsync(g => g.Id == id);

            if (group == null) return NotFound(ApiResponse<string>.Fail("Chit group not found."));

            var schedules = GenerateScheduleTable(group);

            return Ok(new
            {
                chitGroup = new
                {
                    group.Id,
                    group.GroupCode,
                    title = group.GroupName,
                    groupName = group.GroupName,
                    totalAmount = group.ChitValue,
                    chitValue = group.ChitValue,
                    durationYears = group.DurationYears,
                    numberOfMonths = group.DurationMonths,
                    totalMembers = group.TotalMembers,
                    numberOfMembers = group.TotalMembers,
                    maxMembers = group.MaxMembers,
                    startDate = group.StartDate,
                    endDate = group.EndDate,
                    monthlyStartingDate = group.MonthlyStartingDate,
                    graceDays = group.GraceDays,
                    gracePeriod = group.GracePeriod,
                    monthlyInstallment = group.MonthlySubscription,
                    foremanCommissionPercentage = group.ForemanCommissionPercentage
                },
                schedules
            });
        }

        // Helper to generate the exact Chit Schedules Table specified in chitfund.txt:
        // "table to chit schedules with how much amount will pay remaining amount to company"
        private List<object> GenerateScheduleTable(ChitGroup group)
        {
            var schedules = new List<object>();
            decimal commissionRate = group.ForemanCommissionPercentage / 100m;
            decimal companyCommission = Math.Round(group.ChitValue * commissionRate, 2);

            for (int i = 1; i <= group.DurationMonths; i++)
            {
                var dueDate = group.StartDate.AddMonths(i - 1);
                int day = Math.Min(group.MonthlyStartingDate, DateTime.DaysInMonth(dueDate.Year, dueDate.Month));
                var chitDate = new DateTime(dueDate.Year, dueDate.Month, day);
                var graceEndDate = chitDate.AddDays(group.GraceDays);

                // Find if an auction result exists for this month
                var auction = group.Auctions?.FirstOrDefault(a => a.AuctionNumber == i);
                var result = auction?.Result;

                decimal bidDiscount = 0m;
                string winnerName = "";
                decimal dividendPerMember = 0m;
                decimal netPayable = group.MonthlySubscription;
                decimal prizeToWinner = group.ChitValue;
                decimal remainingToCompany = companyCommission;
                string status = i == 1 ? "Foreman Month" : "Scheduled";

                if (i == 1)
                {
                    // Month 1: Foreman takes chit or commission
                    winnerName = "Company Foreman";
                    bidDiscount = companyCommission;
                    dividendPerMember = 0;
                    netPayable = group.MonthlySubscription;
                    prizeToWinner = group.ChitValue - companyCommission;
                    remainingToCompany = companyCommission;
                    status = "Completed";
                }
                else if (result != null && result.Status == "Approved")
                {
                    winnerName = result.WinnerMember?.Customer?.FullName ?? "Auction Winner";
                    bidDiscount = result.DiscountAmount;
                    decimal totalDiv = result.DistributableDividend;
                    dividendPerMember = group.TotalMembers > 0 ? Math.Round(totalDiv / group.TotalMembers, 2) : 0;
                    netPayable = group.MonthlySubscription - dividendPerMember;
                    prizeToWinner = result.GrossPrizeAmount;
                    remainingToCompany = result.ForemanCommission;
                    status = "AuctionCompleted";
                }

                // Sum actual collections received for month i
                decimal actualCollected = _context.Payments
                    .Where(p => p.ChitGroupId == group.Id && p.ChitDate.Month == chitDate.Month && p.ChitDate.Year == chitDate.Year && p.Status == "Completed")
                    .Sum(p => (decimal?)p.Amount) ?? 0;

                schedules.Add(new
                {
                    id = i,
                    monthNumber = i,
                    chitDate = chitDate,
                    graceEndDate = graceEndDate,
                    baseInstallment = group.MonthlySubscription,
                    bidAmount = bidDiscount,
                    winnerMemberName = winnerName,
                    companyCommission = companyCommission,
                    dividendPerMember = dividendPerMember,
                    netPayablePerMember = netPayable, // "how much amount will pay"
                    prizeAmountPaidToWinner = prizeToWinner,
                    totalExpectedCollection = netPayable * group.TotalMembers,
                    totalActualCollected = actualCollected,
                    remainingAmountToCompany = remainingToCompany, // "remaining amount to company"
                    status = status,
                    isAuctionCompleted = result != null || i == 1
                });
            }

            return schedules;
        }

        // DELETE: api/v1/chit-groups/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var group = await _context.ChitGroups.FindAsync(id);
            if (group == null) return NotFound(ApiResponse<string>.Fail("Chit group not found."));

            _context.ChitGroups.Remove(group);
            await _context.SaveChangesAsync();
            await _auditService.LogAsync(1, "DELETE_CHIT_GROUP", "ChitGroup", id.ToString());

            return Ok(ApiResponse<string>.Ok("Chit group deleted successfully."));
        }
    }
}
