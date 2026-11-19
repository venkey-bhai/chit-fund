using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ChitFundApi.Data;
using ChitFundApi.Models;
using ChitFundApi.DTOs;
using ChitFundApi.Services;

namespace ChitFundApi.Controllers
{
    [ApiController]
    [Route("api/v1/auctions")]
    [Route("api/auctions")]
    public class AuctionsController : ControllerBase
    {
        private readonly ChitFundDbContext _context;
        private readonly IAuditService _auditService;

        public AuctionsController(ChitFundDbContext context, IAuditService auditService)
        {
            _context = context;
            _auditService = auditService;
        }

        // GET: api/v1/auctions
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int? chitGroupId)
        {
            var query = _context.Auctions
                .Include(a => a.ChitGroup)
                .Include(a => a.Result)
                    .ThenInclude(r => r.WinnerMember)
                        .ThenInclude(m => m.Customer)
                .AsQueryable();

            if (chitGroupId.HasValue && chitGroupId.Value > 0)
            {
                query = query.Where(a => a.ChitGroupId == chitGroupId.Value);
            }

            var list = await query
                .OrderByDescending(a => a.AuctionDate)
                .Select(a => new
                {
                    a.Id,
                    a.ChitGroupId,
                    ChitGroupName = a.ChitGroup != null ? a.ChitGroup.GroupName : "N/A",
                    ChitGroupCode = a.ChitGroup != null ? a.ChitGroup.GroupCode : "N/A",
                    ChitValue = a.ChitGroup != null ? a.ChitGroup.ChitValue : 0,
                    a.AuctionNumber,
                    a.AuctionDate,
                    a.Status,
                    Result = a.Result != null ? new
                    {
                        a.Result.Id,
                        a.Result.WinnerMemberId,
                        WinnerName = a.Result.WinnerMember != null && a.Result.WinnerMember.Customer != null ? a.Result.WinnerMember.Customer.FullName : "Winner",
                        a.Result.DiscountAmount,
                        a.Result.GrossPrizeAmount,
                        a.Result.ForemanCommission,
                        a.Result.DistributableDividend,
                        DividendPerMember = a.ChitGroup != null && a.ChitGroup.TotalMembers > 0 ? Math.Round(a.Result.DistributableDividend / a.ChitGroup.TotalMembers, 2) : 0,
                        a.Result.Status
                    } : null
                })
                .ToListAsync();

            return Ok(list);
        }

        // GET: api/v1/auctions/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var auction = await _context.Auctions
                .Include(a => a.ChitGroup)
                .Include(a => a.Bids)
                    .ThenInclude(b => b.ChitMember)
                        .ThenInclude(m => m.Customer)
                .Include(a => a.Result)
                    .ThenInclude(r => r.WinnerMember)
                        .ThenInclude(m => m.Customer)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (auction == null) return NotFound(ApiResponse<string>.Fail("Auction not found."));

            return Ok(auction);
        }

        // POST: api/v1/auctions (Schedule auction)
        [HttpPost]
        public async Task<IActionResult> CreateAuction([FromBody] CreateAuctionRequest req)
        {
            var group = await _context.ChitGroups.FindAsync(req.ChitGroupId);
            if (group == null) return BadRequest(ApiResponse<string>.Fail("Chit group not found."));

            var auction = new Auction
            {
                ChitGroupId = req.ChitGroupId,
                AuctionNumber = req.AuctionNumber,
                AuctionDate = req.AuctionDate,
                Status = "Scheduled",
                CreatedAt = DateTime.UtcNow
            };

            _context.Auctions.Add(auction);
            await _context.SaveChangesAsync();

            await _auditService.LogAsync(1, "CREATE_AUCTION", "Auction", auction.Id.ToString(), $"Scheduled Month {auction.AuctionNumber} for {group.GroupName}");

            return CreatedAtAction(nameof(GetById), new { id = auction.Id }, auction);
        }

        // POST: api/v1/auctions/{id}/bids (Place bid)
        [HttpPost("{id}/bids")]
        public async Task<IActionResult> PlaceBid(int id, [FromBody] PlaceBidRequest req)
        {
            var auction = await _context.Auctions.FindAsync(id);
            if (auction == null) return NotFound(ApiResponse<string>.Fail("Auction not found."));

            var bid = new AuctionBid
            {
                AuctionId = id,
                ChitMemberId = req.ChitMemberId,
                BidAmount = req.BidAmount,
                BidTime = DateTime.UtcNow,
                Status = "Submitted"
            };

            _context.AuctionBids.Add(bid);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(bid, "Bid recorded successfully"));
        }

        // POST: api/v1/auctions/{id}/submit-result (Submit & Approve auction result)
        // Also supports PUT /api/chitschedules/{id}/auction for existing frontend modal
        [HttpPost("{id}/submit-result")]
        [HttpPut("/api/chitschedules/{id}/auction")]
        public async Task<IActionResult> SubmitResult(int id, [FromBody] SubmitAuctionResultRequest req)
        {
            // Find existing auction or match by month
            var auction = await _context.Auctions
                .Include(a => a.ChitGroup)
                    .ThenInclude(g => g.Members)
                        .ThenInclude(m => m.Customer)
                .Include(a => a.Result)
                .FirstOrDefaultAsync(a => a.Id == id || a.AuctionNumber == id);

            if (auction == null)
            {
                // Create auction if it didn't exist for month id
                var firstGroup = await _context.ChitGroups.Include(g => g.Members).ThenInclude(m => m.Customer).FirstOrDefaultAsync();
                if (firstGroup == null) return BadRequest(ApiResponse<string>.Fail("No chit group available."));

                auction = new Auction
                {
                    ChitGroupId = firstGroup.Id,
                    AuctionNumber = id,
                    AuctionDate = DateTime.UtcNow,
                    Status = "Approved",
                    CreatedAt = DateTime.UtcNow
                };
                _context.Auctions.Add(auction);
                await _context.SaveChangesAsync();
            }

            var group = auction.ChitGroup ?? await _context.ChitGroups.Include(g => g.Members).ThenInclude(m => m.Customer).FirstAsync(g => g.Id == auction.ChitGroupId);

            // Resolve winning member
            int winnerMemberId = req.WinnerMemberId;
            if (winnerMemberId <= 0 && !string.IsNullOrWhiteSpace(req.WinnerName))
            {
                var member = group.Members.FirstOrDefault(m => m.Customer != null && m.Customer.FullName.ToLower() == req.WinnerName.Trim().ToLower());
                if (member != null) winnerMemberId = member.Id;
            }

            if (winnerMemberId <= 0 && group.Members.Any())
            {
                winnerMemberId = group.Members.First().Id;
            }

            decimal commissionRate = group.ForemanCommissionPercentage / 100m;
            decimal commission = Math.Round(group.ChitValue * commissionRate, 2);
            decimal distributable = Math.Max(0, req.DiscountAmount - commission);
            decimal grossPrize = Math.Round(group.ChitValue - req.DiscountAmount, 2);

            var result = auction.Result;
            if (result == null)
            {
                result = new AuctionResult
                {
                    AuctionId = auction.Id,
                    WinnerMemberId = winnerMemberId,
                    DiscountAmount = req.DiscountAmount,
                    GrossPrizeAmount = grossPrize,
                    ForemanCommission = commission,
                    DistributableDividend = distributable,
                    ApprovedAt = DateTime.UtcNow,
                    Status = "Approved"
                };
                _context.AuctionResults.Add(result);
            }
            else
            {
                result.WinnerMemberId = winnerMemberId;
                result.DiscountAmount = req.DiscountAmount;
                result.GrossPrizeAmount = grossPrize;
                result.ForemanCommission = commission;
                result.DistributableDividend = distributable;
                result.ApprovedAt = DateTime.UtcNow;
                result.Status = "Approved";
            }

            auction.Status = "Completed";
            await _context.SaveChangesAsync();

            // Mark winner member as prized
            var winner = await _context.ChitMembers.FindAsync(winnerMemberId);
            if (winner != null)
            {
                winner.HasPrized = true;
                winner.PrizedMonthNumber = auction.AuctionNumber;
                winner.PrizedAmount = grossPrize;
            }

            // Distribute dividends to all members
            decimal divPerMember = group.TotalMembers > 0 ? Math.Round(distributable / group.TotalMembers, 2) : 0;
            var existingDivs = await _context.DividendAllocations.Where(d => d.AuctionResultId == result.Id).ToListAsync();
            _context.DividendAllocations.RemoveRange(existingDivs);

            foreach (var m in group.Members)
            {
                _context.DividendAllocations.Add(new DividendAllocation
                {
                    AuctionResultId = result.Id,
                    ChitMemberId = m.Id,
                    DividendAmount = divPerMember,
                    CalculationVersion = "v1.0"
                });
            }

            // Update corresponding installments net payable
            var targetInstallments = await _context.Installments
                .Where(i => i.InstallmentNumber == auction.AuctionNumber && group.Members.Select(m => m.Id).Contains(i.ChitMemberId))
                .ToListAsync();

            foreach (var inst in targetInstallments)
            {
                inst.DividendDeduction = divPerMember;
                inst.NetPayableAmount = Math.Round(group.MonthlySubscription - divPerMember, 2);
            }

            // Create or update Prize Payout
            var existingPayout = await _context.PrizePayouts.FirstOrDefaultAsync(p => p.AuctionResultId == result.Id);
            if (existingPayout == null)
            {
                _context.PrizePayouts.Add(new PrizePayout
                {
                    AuctionResultId = result.Id,
                    GrossAmount = grossPrize,
                    Deductions = 0m,
                    NetAmount = grossPrize,
                    Status = "Approved",
                    PaidAt = DateTime.UtcNow.AddDays(5)
                });
            }

            await _context.SaveChangesAsync();

            await _auditService.LogAsync(1, "APPROVE_AUCTION", "AuctionResult", result.Id.ToString(), $"Approved Month {auction.AuctionNumber} auction with bid discount ₹{req.DiscountAmount:N2}");

            return Ok(new
            {
                message = "Auction updated and dividend calculated successfully",
                auction,
                result,
                dividendPerMember = divPerMember,
                remainingAmountToCompany = commission
            });
        }
    }
}
