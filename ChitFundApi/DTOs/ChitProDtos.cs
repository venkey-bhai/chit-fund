using System;
using System.Collections.Generic;

namespace ChitFundApi.DTOs
{
    // Standard response format (SRS Section 12)
    public class ApiResponse<T>
    {
        public bool Success { get; set; } = true;
        public string Message { get; set; } = string.Empty;
        public T? Data { get; set; }
        public List<string> Errors { get; set; } = new List<string>();

        public static ApiResponse<T> Ok(T data, string message = "Success")
        {
            return new ApiResponse<T> { Success = true, Message = message, Data = data };
        }

        public static ApiResponse<T> Fail(string message, List<string>? errors = null)
        {
            return new ApiResponse<T> { Success = false, Message = message, Errors = errors ?? new List<string>() };
        }
    }

    // FR-01 Authentication DTOs
    public class LoginRequestDto
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class LoginResponseDto
    {
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
    }

    public class ForgotPasswordRequestDto
    {
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
    }

    public class ResetPasswordRequestDto
    {
        public string ResetToken { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }

    public class CustomerStatusDto
    {
        public bool IsActive { get; set; }
    }

    public class ChangePasswordDto
    {
        public string OldPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }

    // FR-03 Customer DTOs
    public class CustomerCreateDto
    {
        public string FullName { get; set; } = string.Empty;
        public string Mobile { get; set; } = string.Empty;
        public string? Email { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Address { get; set; }
        public string? AadhaarOrPan { get; set; }
        public string? NomineeName { get; set; }
        public string? NomineeRelation { get; set; }
    }

    // FR-04 Chit Group DTOs (incorporating chitfund.txt parameters)
    public class ChitGroupCreateRequest
    {
        public string GroupName { get; set; } = string.Empty;
        public string? GroupCode { get; set; }
        public decimal ChitValue { get; set; }
        public decimal DurationYears { get; set; } = 1.0m;
        public int DurationMonths { get; set; } = 12;
        public int TotalMembers { get; set; } = 12;
        public int MaxMembers { get; set; } = 12;
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int MonthlyStartingDate { get; set; } = 5;
        public int GraceDays { get; set; } = 5;
        public string GracePeriod { get; set; } = "5 days grace period after monthly due date.";
        public decimal ForemanCommissionPercentage { get; set; } = 5.0m;
        public string? AgreementReference { get; set; }
    }

    // Edit scheme: only fields that don't invalidate already-generated installments
    public class ChitGroupUpdateRequest
    {
        public string GroupName { get; set; } = string.Empty;
        public string? GroupCode { get; set; }
        public int TotalMembers { get; set; }
        public int MaxMembers { get; set; }
        public int GraceDays { get; set; }
        public string? GracePeriod { get; set; }
        public decimal ForemanCommissionPercentage { get; set; }
        public string? Status { get; set; }
    }

    // FR-05 Member Enrollment DTO
    public class EnrollMemberRequest
    {
        public int CustomerId { get; set; }
        public int TicketNumber { get; set; }
    }

    // FR-07 Payment Collection DTO (chitfund.txt fields)
    public class PaymentCollectionRequest
    {
        public int ChitGroupId { get; set; }
        public int? InstallmentId { get; set; }
        public int? CustomerId { get; set; }
        public int PaymentModeId { get; set; } = 1; // 1 = Cash, 2 = UPI, 3 = Bank Transfer, 4 = Cheque

        // Core fields specified in chitfund.txt:
        public DateTime CollectionDate { get; set; } = DateTime.UtcNow;
        public DateTime ChitDate { get; set; }
        public string ChitPerson { get; set; } = string.Empty;
        public decimal Amount { get; set; }

        public string? PaymentModeName { get; set; }
        public string? TransactionReference { get; set; }
        public decimal LateFine { get; set; } = 0m;
        public string? Remarks { get; set; }
    }

    // FR-08 Auction DTOs
    public class CreateAuctionRequest
    {
        public int ChitGroupId { get; set; }
        public int AuctionNumber { get; set; }
        public DateTime AuctionDate { get; set; }
    }

    public class PlaceBidRequest
    {
        public int ChitMemberId { get; set; }
        public decimal BidAmount { get; set; }
    }

    public class SubmitAuctionResultRequest
    {
        // Chit group the month belongs to (the route id is only a month number for schedule rows)
        public int ChitGroupId { get; set; }
        public int WinnerMemberId { get; set; }
        public string? WinnerName { get; set; }
        // Optional: one or more winners (names). First one is the primary winner.
        public List<string>? WinnerNames { get; set; }
        public List<int>? WinnerMemberIds { get; set; }
        public decimal DiscountAmount { get; set; }
    }

    // FR-10 Payout DTO
    public class PrizePayoutRequest
    {
        public int AuctionResultId { get; set; }
        public decimal Deductions { get; set; } = 0m;
        public string? TransactionReference { get; set; }
    }

    // FR-12 Expense DTO
    public class ExpenseCreateRequest
    {
        public string Category { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime ExpenseDate { get; set; } = DateTime.UtcNow.Date;
    }

    // FR-16 Company Settings DTO
    public class CompanySettingsUpdateDto
    {
        public string CompanyName { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string CurrencyCode { get; set; } = "INR";
        public DateTime? FinancialYearStart { get; set; }
        public string ReceiptPrefix { get; set; } = "REC";
    }

    // FR-02 Dashboard Summary DTO
    public class DashboardSummaryDto
    {
        public int TotalCustomers { get; set; }
        public int ActiveChitGroups { get; set; }
        public decimal TotalChitValueUnderManagement { get; set; }
        public decimal TodayCollection { get; set; }
        public decimal MonthlyCollection { get; set; }
        public decimal OutstandingInstallments { get; set; }
        public decimal TotalRemainingAmountToCompany { get; set; }
        public decimal TotalPrizeMoneyDisbursed { get; set; }
        public int TotalCollectionsCount { get; set; }
        public List<RecentPaymentSummaryDto> RecentPayments { get; set; } = new List<RecentPaymentSummaryDto>();
        public List<UpcomingAuctionSummaryDto> UpcomingAuctions { get; set; } = new List<UpcomingAuctionSummaryDto>();
    }

    public class RecentPaymentSummaryDto
    {
        public long Id { get; set; }
        public string ReceiptNumber { get; set; } = string.Empty;
        public string ChitPerson { get; set; } = string.Empty;
        public string ChitGroupTitle { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime CollectionDate { get; set; }
        public DateTime ChitDate { get; set; }
        public string PaymentMode { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }

    public class UpcomingAuctionSummaryDto
    {
        public int Id { get; set; }
        public string ChitGroupName { get; set; } = string.Empty;
        public string ChitGroupCode { get; set; } = string.Empty;
        public int AuctionNumber { get; set; }
        public DateTime AuctionDate { get; set; }
        public decimal ChitValue { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}
