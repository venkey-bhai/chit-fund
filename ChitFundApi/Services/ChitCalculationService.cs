using System;
using System.Collections.Generic;
using ChitFundApi.Models;

namespace ChitFundApi.Services
{
    public interface IChitCalculationService
    {
        List<ChitSchedule> GenerateInitialSchedules(ChitGroup group);
        void RecalculateAuction(ChitSchedule schedule, ChitGroup group, decimal bidAmount, int winnerMemberId, string winnerName);
    }

    public class ChitCalculationService : IChitCalculationService
    {
        public List<ChitSchedule> GenerateInitialSchedules(ChitGroup group)
        {
            var schedules = new List<ChitSchedule>();
            decimal baseInstallment = group.DurationMonths > 0 
                ? Math.Round(group.ChitValue / group.DurationMonths, 2) 
                : 0;
            
            decimal companyCommission = Math.Round(group.ChitValue * (group.ForemanCommissionPercentage / 100m), 2);

            for (int i = 1; i <= group.DurationMonths; i++)
            {
                DateTime chitDate;
                try
                {
                    var targetMonthDate = group.StartDate.AddMonths(i - 1);
                    int day = Math.Min(group.MonthlyStartingDate, DateTime.DaysInMonth(targetMonthDate.Year, targetMonthDate.Month));
                    chitDate = new DateTime(targetMonthDate.Year, targetMonthDate.Month, day);
                }
                catch
                {
                    chitDate = group.StartDate.AddMonths(i - 1);
                }

                DateTime graceEndDate = chitDate.AddDays(group.GraceDays);

                var schedule = new ChitSchedule
                {
                    ChitGroupId = group.Id,
                    MonthNumber = i,
                    ChitDate = chitDate,
                    GraceEndDate = graceEndDate,
                    BaseInstallment = baseInstallment,
                    CompanyCommission = companyCommission,
                    BidAmount = 0,
                    TotalDividend = 0,
                    DividendPerMember = 0,
                    NetPayablePerMember = baseInstallment,
                    PrizeAmountPaidToWinner = group.ChitValue,
                    TotalExpectedCollection = Math.Round(baseInstallment * group.TotalMembers, 2),
                    TotalActualCollected = 0,
                    RemainingAmountToCompany = companyCommission,
                    Status = i == 1 ? "Active" : "Scheduled",
                    Notes = i == 1 ? "Month 1 - Foreman Commission Chit" : $"Month {i} Scheduled Auction"
                };

                if (i == 1)
                {
                    schedule.BidAmount = companyCommission;
                    schedule.TotalDividend = 0;
                    schedule.DividendPerMember = 0;
                    schedule.NetPayablePerMember = baseInstallment;
                    schedule.PrizeAmountPaidToWinner = group.ChitValue - companyCommission;
                    schedule.RemainingAmountToCompany = companyCommission;
                }

                schedules.Add(schedule);
            }

            return schedules;
        }

        public void RecalculateAuction(ChitSchedule schedule, ChitGroup group, decimal bidAmount, int winnerMemberId, string winnerName)
        {
            schedule.IsAuctionCompleted = true;
            schedule.AuctionDate = DateTime.UtcNow;
            schedule.WinnerMemberId = winnerMemberId;
            schedule.WinnerMemberName = winnerName;
            schedule.BidAmount = bidAmount;

            decimal commission = Math.Round(group.ChitValue * (group.ForemanCommissionPercentage / 100m), 2);
            schedule.CompanyCommission = commission;

            decimal totalDividend = Math.Max(0, bidAmount - commission);
            schedule.TotalDividend = totalDividend;

            decimal dividendPerMember = group.TotalMembers > 0 
                ? Math.Round(totalDividend / group.TotalMembers, 2) 
                : 0;
            schedule.DividendPerMember = dividendPerMember;

            schedule.NetPayablePerMember = Math.Round(schedule.BaseInstallment - dividendPerMember, 2);
            schedule.PrizeAmountPaidToWinner = Math.Round(group.ChitValue - bidAmount, 2);
            schedule.TotalExpectedCollection = Math.Round(schedule.NetPayablePerMember * group.TotalMembers, 2);
            schedule.RemainingAmountToCompany = commission;

            schedule.Status = "AuctionCompleted";
            schedule.Notes = $"Auction won by {winnerName} with bid discount ₹{bidAmount:N2}. Dividend ₹{dividendPerMember:N2}/member. Remaining to company ₹{commission:N2}.";
        }
    }
}
