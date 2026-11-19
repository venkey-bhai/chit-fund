using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ChitFundApi.Data;
using ChitFundApi.DTOs;

namespace ChitFundApi.Controllers
{
    [ApiController]
    [Route("api/v1/reports")]
    public class ReportsController : ControllerBase
    {
        private readonly ChitFundDbContext _context;

        public ReportsController(ChitFundDbContext context)
        {
            _context = context;
        }

        // GET: api/v1/reports/collections
        [HttpGet("collections")]
        public async Task<IActionResult> GetCollectionsReport([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate, [FromQuery] int? chitGroupId)
        {
            var query = _context.Payments
                .Include(p => p.ChitGroup)
                .Include(p => p.PaymentMode)
                .Where(p => p.Status == "Completed")
                .AsQueryable();

            if (fromDate.HasValue) query = query.Where(p => p.CollectionDate.Date >= fromDate.Value.Date);
            if (toDate.HasValue) query = query.Where(p => p.CollectionDate.Date <= toDate.Value.Date);
            if (chitGroupId.HasValue && chitGroupId.Value > 0) query = query.Where(p => p.ChitGroupId == chitGroupId.Value);

            var items = await query.OrderByDescending(p => p.CollectionDate).ToListAsync();
            var totalAmount = items.Sum(p => p.Amount);

            return Ok(new
            {
                totalAmount,
                count = items.Count,
                items = items.Select(p => new
                {
                    p.Id,
                    p.ReceiptNumber,
                    p.ChitPerson,
                    ChitGroup = p.ChitGroup?.GroupName ?? "N/A",
                    p.CollectionDate,
                    p.ChitDate,
                    p.Amount,
                    PaymentMode = p.PaymentMode?.Name ?? "Cash",
                    p.Status
                })
            });
        }

        // GET: api/v1/reports/outstanding
        [HttpGet("outstanding")]
        public async Task<IActionResult> GetOutstandingReport()
        {
            var installments = await _context.Installments
                .Include(i => i.ChitMember)
                    .ThenInclude(m => m!.Customer)
                .Include(i => i.ChitMember)
                    .ThenInclude(m => m!.ChitGroup)
                .Where(i => i.Status == "Due" || i.Status == "Overdue")
                .OrderBy(i => i.DueDate)
                .Select(i => new
                {
                    i.Id,
                    CustomerName = i.ChitMember != null && i.ChitMember.Customer != null ? i.ChitMember.Customer.FullName : "N/A",
                    Mobile = i.ChitMember != null && i.ChitMember.Customer != null ? i.ChitMember.Customer.Mobile : "N/A",
                    ChitGroup = i.ChitMember != null && i.ChitMember.ChitGroup != null ? i.ChitMember.ChitGroup.GroupName : "N/A",
                    TicketNumber = i.ChitMember != null ? i.ChitMember.TicketNumber : 0,
                    i.InstallmentNumber,
                    i.DueDate,
                    i.GraceEndDate,
                    i.DueAmount,
                    i.DividendDeduction,
                    i.NetPayableAmount,
                    i.PaidAmount,
                    BalanceDue = i.NetPayableAmount - i.PaidAmount,
                    i.Status,
                    IsOverdue = DateTime.UtcNow.Date > i.GraceEndDate.Date
                })
                .ToListAsync();

            var totalOutstanding = installments.Sum(i => i.BalanceDue);

            return Ok(new
            {
                totalOutstanding,
                count = installments.Count,
                items = installments
            });
        }

        // GET: api/v1/reports/reconciliation
        [HttpGet("reconciliation")]
        public async Task<IActionResult> GetReconciliation()
        {
            decimal totalCollections = await _context.Payments.Where(p => p.Status == "Completed").SumAsync(p => (decimal?)p.Amount) ?? 0;
            decimal totalPrizePayouts = await _context.PrizePayouts.Where(p => p.Status == "Disbursed").SumAsync(p => (decimal?)p.NetAmount) ?? 0;
            decimal totalExpenses = await _context.Expenses.Where(e => e.Status == "Approved").SumAsync(e => (decimal?)e.Amount) ?? 0;
            decimal totalForemanCommission = await _context.AuctionResults.Where(r => r.Status == "Approved").SumAsync(r => (decimal?)r.ForemanCommission) ?? 0;

            decimal netOperatingBalance = totalCollections - totalPrizePayouts - totalExpenses;

            return Ok(new
            {
                totalCollections,
                totalPrizePayouts,
                totalExpenses,
                totalForemanCommission,
                netOperatingBalance,
                asOfDate = DateTime.UtcNow
            });
        }
    }
}
