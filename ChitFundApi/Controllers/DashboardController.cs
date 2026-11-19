using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ChitFundApi.Data;
using ChitFundApi.DTOs;

namespace ChitFundApi.Controllers
{
    [ApiController]
    [Route("api/v1/dashboard")]
    public class DashboardController : ControllerBase
    {
        private readonly ChitFundDbContext _context;

        public DashboardController(ChitFundDbContext context)
        {
            _context = context;
        }

        // GET: api/v1/dashboard/summary & /api/dashboard/stats
        [HttpGet("summary")]
        [HttpGet("/api/dashboard/stats")]
        public async Task<IActionResult> GetSummary()
        {
            int totalCustomers = await _context.Customers.CountAsync();
            int activeChitGroups = await _context.ChitGroups.CountAsync(g => g.Status == "Active");
            decimal totalChitValue = await _context.ChitGroups.SumAsync(g => (decimal?)g.ChitValue) ?? 0;

            var today = DateTime.UtcNow.Date;
            decimal todayCollection = await _context.Payments
                .Where(p => p.Status == "Completed" && p.CollectionDate.Date == today)
                .SumAsync(p => (decimal?)p.Amount) ?? 0;

            var currentMonth = today.Month;
            var currentYear = today.Year;
            decimal monthlyCollection = await _context.Payments
                .Where(p => p.Status == "Completed" && p.CollectionDate.Month == currentMonth && p.CollectionDate.Year == currentYear)
                .SumAsync(p => (decimal?)p.Amount) ?? 0;

            decimal totalCollectionsReceived = await _context.Payments
                .Where(p => p.Status == "Completed")
                .SumAsync(p => (decimal?)p.Amount) ?? 0;

            int totalCollectionsCount = await _context.Payments.CountAsync(p => p.Status == "Completed");

            decimal outstandingInstallments = await _context.Installments
                .Where(i => i.Status == "Due" || i.Status == "Overdue")
                .SumAsync(i => (decimal?)(i.NetPayableAmount - i.PaidAmount)) ?? 0;

            // Foreman commission retained
            decimal totalForemanCommission = await _context.AuctionResults
                .Where(r => r.Status == "Approved")
                .SumAsync(r => (decimal?)r.ForemanCommission) ?? 0;

            // If no completed auctions yet, calculate from month 1 foreman chits
            if (totalForemanCommission == 0)
            {
                totalForemanCommission = await _context.ChitGroups
                    .SumAsync(g => (decimal?)(g.ChitValue * (g.ForemanCommissionPercentage / 100m))) ?? 0;
            }

            decimal totalPrizeMoneyDisbursed = await _context.PrizePayouts
                .Where(p => p.Status == "Disbursed")
                .SumAsync(p => (decimal?)p.NetAmount) ?? 0;

            var recentPayments = await _context.Payments
                .Include(p => p.ChitGroup)
                .Include(p => p.PaymentMode)
                .Where(p => p.Status == "Completed")
                .OrderByDescending(p => p.CollectionDate)
                .Take(7)
                .Select(p => new RecentPaymentSummaryDto
                {
                    Id = p.Id,
                    ReceiptNumber = p.ReceiptNumber,
                    ChitPerson = p.ChitPerson,
                    ChitGroupTitle = p.ChitGroup != null ? p.ChitGroup.GroupName : "N/A",
                    Amount = p.Amount,
                    CollectionDate = p.CollectionDate,
                    ChitDate = p.ChitDate,
                    PaymentMode = p.PaymentMode != null ? p.PaymentMode.Name : "Cash",
                    Status = p.Status
                })
                .ToListAsync();

            var upcomingAuctions = await _context.Auctions
                .Include(a => a.ChitGroup)
                .Where(a => a.Status == "Scheduled")
                .OrderBy(a => a.AuctionDate)
                .Take(5)
                .Select(a => new UpcomingAuctionSummaryDto
                {
                    Id = a.Id,
                    ChitGroupName = a.ChitGroup != null ? a.ChitGroup.GroupName : "N/A",
                    ChitGroupCode = a.ChitGroup != null ? a.ChitGroup.GroupCode : "N/A",
                    AuctionNumber = a.AuctionNumber,
                    AuctionDate = a.AuctionDate,
                    ChitValue = a.ChitGroup != null ? a.ChitGroup.ChitValue : 0,
                    Status = a.Status
                })
                .ToListAsync();

            var summary = new DashboardSummaryDto
            {
                TotalCustomers = totalCustomers,
                ActiveChitGroups = activeChitGroups,
                TotalChitValueUnderManagement = totalChitValue,
                TodayCollection = todayCollection,
                MonthlyCollection = monthlyCollection,
                OutstandingInstallments = outstandingInstallments,
                TotalRemainingAmountToCompany = totalForemanCommission,
                TotalPrizeMoneyDisbursed = totalPrizeMoneyDisbursed,
                TotalCollectionsCount = totalCollectionsCount,
                RecentPayments = recentPayments,
                UpcomingAuctions = upcomingAuctions
            };

            // For backwards-compatibility with existing frontend format:
            var compatibilityObj = new
            {
                totalChits = activeChitGroups,
                activeChits = activeChitGroups,
                totalMembers = totalCustomers,
                totalChitValue = totalChitValue,
                totalCollectionsReceived = totalCollectionsReceived,
                totalRemainingAmountToCompany = totalForemanCommission,
                totalPrizeAmountDistributed = totalPrizeMoneyDisbursed,
                totalCollectionsCount = totalCollectionsCount,
                recentCollections = recentPayments.Select(r => new
                {
                    id = r.Id,
                    receiptNumber = r.ReceiptNumber,
                    chitPerson = r.ChitPerson,
                    chitGroupTitle = r.ChitGroupTitle,
                    amount = r.Amount,
                    collectionDate = r.CollectionDate,
                    chitDate = r.ChitDate,
                    paymentMode = r.PaymentMode,
                    status = r.Status
                }),
                summary
            };

            return Ok(compatibilityObj);
        }

        // GET: api/v1/dashboard/collections
        [HttpGet("collections")]
        public async Task<IActionResult> GetCollectionsChart()
        {
            var payments = await _context.Payments
                .Where(p => p.Status == "Completed")
                .GroupBy(p => new { p.CollectionDate.Year, p.CollectionDate.Month })
                .Select(g => new
                {
                    Year = g.Key.Year,
                    Month = g.Key.Month,
                    TotalAmount = g.Sum(p => p.Amount),
                    Count = g.Count()
                })
                .OrderBy(g => g.Year).ThenBy(g => g.Month)
                .ToListAsync();

            return Ok(ApiResponse<object>.Ok(payments));
        }

        // GET: api/v1/dashboard/upcoming-auctions
        [HttpGet("upcoming-auctions")]
        public async Task<IActionResult> GetUpcomingAuctions()
        {
            var auctions = await _context.Auctions
                .Include(a => a.ChitGroup)
                .Where(a => a.Status == "Scheduled")
                .OrderBy(a => a.AuctionDate)
                .ToListAsync();

            return Ok(ApiResponse<object>.Ok(auctions));
        }

        // GET: api/v1/dashboard/recent-payments
        [HttpGet("recent-payments")]
        public async Task<IActionResult> GetRecentPayments()
        {
            var payments = await _context.Payments
                .Include(p => p.ChitGroup)
                .Include(p => p.PaymentMode)
                .OrderByDescending(p => p.CollectionDate)
                .Take(10)
                .ToListAsync();

            return Ok(ApiResponse<object>.Ok(payments));
        }
    }
}
