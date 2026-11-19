using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ChitFundApi.Data;
using ChitFundApi.Models;
using ChitFundApi.DTOs;
using ChitFundApi.Services;

namespace ChitFundApi.Controllers
{
    [ApiController]
    [Route("api/v1/payouts")]
    public class PayoutsController : ControllerBase
    {
        private readonly ChitFundDbContext _context;
        private readonly IAuditService _auditService;

        public PayoutsController(ChitFundDbContext context, IAuditService auditService)
        {
            _context = context;
            _auditService = auditService;
        }

        // GET: api/v1/payouts
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var payouts = await _context.PrizePayouts
                .Include(p => p.AuctionResult)
                    .ThenInclude(r => r!.WinnerMember)
                        .ThenInclude(m => m.Customer)
                .Include(p => p.AuctionResult)
                    .ThenInclude(r => r!.Auction)
                        .ThenInclude(a => a.ChitGroup)
                .OrderByDescending(p => p.Id)
                .Select(p => new
                {
                    p.Id,
                    p.AuctionResultId,
                    ChitGroupTitle = p.AuctionResult != null && p.AuctionResult.Auction != null && p.AuctionResult.Auction.ChitGroup != null ? p.AuctionResult.Auction.ChitGroup.GroupName : "N/A",
                    MonthNumber = p.AuctionResult != null && p.AuctionResult.Auction != null ? p.AuctionResult.Auction.AuctionNumber : 1,
                    WinnerName = p.AuctionResult != null && p.AuctionResult.WinnerMember != null && p.AuctionResult.WinnerMember.Customer != null ? p.AuctionResult.WinnerMember.Customer.FullName : "Winner",
                    WinnerPhone = p.AuctionResult != null && p.AuctionResult.WinnerMember != null && p.AuctionResult.WinnerMember.Customer != null ? p.AuctionResult.WinnerMember.Customer.Mobile : "N/A",
                    p.GrossAmount,
                    p.Deductions,
                    p.NetAmount,
                    p.Status,
                    p.PaidAt,
                    p.TransactionReference
                })
                .ToListAsync();

            return Ok(payouts);
        }

        // POST: api/v1/payouts/{id}/mark-paid
        [HttpPost("{id}/mark-paid")]
        public async Task<IActionResult> MarkPaid(long id, [FromBody] string? transactionRef)
        {
            var payout = await _context.PrizePayouts.FindAsync(id);
            if (payout == null) return NotFound(ApiResponse<string>.Fail("Payout not found."));

            payout.Status = "Disbursed";
            payout.PaidAt = DateTime.UtcNow;
            payout.TransactionReference = transactionRef ?? $"NEFT-{DateTime.UtcNow:yyyyMMdd}-{id:D4}";
            await _context.SaveChangesAsync();

            await _auditService.LogAsync(1, "DISBURSE_PRIZE_PAYOUT", "PrizePayout", id.ToString(), $"Disbursed net prize ₹{payout.NetAmount:N2}");

            return Ok(ApiResponse<object>.Ok(payout, "Payout marked as disbursed"));
        }
    }
}
