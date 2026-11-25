using System;
using System.Collections.Generic;

namespace ChitFundApi.Models
{
    // FR-01: Admin Users
    public class User
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string FullName { get; set; } = "Administrator";
        public string Role { get; set; } = "Admin";
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }

    // FR-03: Customers
    public class Customer
    {
        public int Id { get; set; }
        public string CustomerCode { get; set; } = string.Empty; // e.g. CUS-0001
        public string FullName { get; set; } = string.Empty;
        public string Mobile { get; set; } = string.Empty;
        public string? Email { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Address { get; set; }
        public string? AadhaarOrPan { get; set; }
        public string? NomineeName { get; set; }
        public string? NomineeRelation { get; set; }
        public string KycStatus { get; set; } = "Verified"; // Verified, Pending, Rejected
        public DateTime RegistrationDate { get; set; } = DateTime.UtcNow.Date;
        public string Status { get; set; } = "Active"; // Active, Deactivated
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        public ICollection<CustomerDocument> Documents { get; set; } = new List<CustomerDocument>();
        public ICollection<ChitMember> Memberships { get; set; } = new List<ChitMember>();
    }

    // FR-03: Customer Documents
    public class CustomerDocument
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public Customer? Customer { get; set; }
        public string DocumentType { get; set; } = string.Empty; // Aadhaar, PAN, Address Proof, Photo
        public string FileReference { get; set; } = string.Empty;
        public string VerificationStatus { get; set; } = "Verified";
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
        public DateTime? VerifiedAt { get; set; }
    }

    // FR-04: Chit Groups (including chitfund.txt parameters)
    public class ChitGroup
    {
        public int Id { get; set; }
        public string GroupCode { get; set; } = string.Empty; // e.g. CF-2026-GOLD12
        public string GroupName { get; set; } = string.Empty;
        public decimal ChitValue { get; set; } // Total Chit Amount
        public int TotalMembers { get; set; }
        public int MaxMembers { get; set; } = 20;
        public int DurationMonths { get; set; }
        public decimal DurationYears { get; set; } = 1.0m;
        public decimal MonthlySubscription { get; set; } // Base Installment
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }

        // chitfund.txt specific features
        public int MonthlyStartingDate { get; set; } = 5;
        public int GraceDays { get; set; } = 5;
        public string GracePeriod { get; set; } = "5 days grace period after monthly due date.";
        public decimal ForemanCommissionPercentage { get; set; } = 5.0m;

        public string Status { get; set; } = "Active"; // Draft, Active, Completed, Closed
        public string? AgreementReference { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        public ICollection<ChitMember> Members { get; set; } = new List<ChitMember>();
        public ICollection<Auction> Auctions { get; set; } = new List<Auction>();
        public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    }

    // FR-05: Chit Memberships
    public class ChitMember
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public Customer? Customer { get; set; }

        public int ChitGroupId { get; set; }
        public ChitGroup? ChitGroup { get; set; }

        public string MemberCode { get; set; } = string.Empty; // e.g. MEM-0001
        public int TicketNumber { get; set; } // Ticket/Seat Number
        public DateTime JoiningDate { get; set; } = DateTime.UtcNow.Date;
        public bool HasPrized { get; set; } = false;
        public int? PrizedMonthNumber { get; set; }
        public decimal? PrizedAmount { get; set; }
        public string Status { get; set; } = "Active";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<Installment> Installments { get; set; } = new List<Installment>();
        public ICollection<AuctionBid> Bids { get; set; } = new List<AuctionBid>();
        public ICollection<DividendAllocation> Dividends { get; set; } = new List<DividendAllocation>();
    }

    // FR-06: Installments Schedule ("how much amount will pay")
    public class Installment
    {
        public int Id { get; set; }
        public int ChitMemberId { get; set; }
        public ChitMember? ChitMember { get; set; }

        public int InstallmentNumber { get; set; }
        public DateTime DueDate { get; set; }
        public DateTime GraceEndDate { get; set; }
        public decimal DueAmount { get; set; } // Base installment
        public decimal DividendDeduction { get; set; } = 0m;
        public decimal NetPayableAmount { get; set; } // "how much amount will pay"
        public decimal PaidAmount { get; set; } = 0m;
        public string Status { get; set; } = "Due"; // Due, Paid, PartiallyPaid, Overdue
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    }

    // FR-07: Payment Modes
    public class PaymentMode
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty; // Cash, UPI, Bank Transfer, Cheque, Card
        public bool IsActive { get; set; } = true;
    }

    // FR-07: Payments (with collection date, chit date, chit person, amount)
    public class Payment
    {
        public long Id { get; set; }
        public int? InstallmentId { get; set; }
        public Installment? Installment { get; set; }

        public int ChitGroupId { get; set; }
        public ChitGroup? ChitGroup { get; set; }

        public int? CustomerId { get; set; }
        public Customer? Customer { get; set; }

        public int PaymentModeId { get; set; }
        public PaymentMode? PaymentMode { get; set; }

        public int? RecordedByUserId { get; set; }
        public string ReceiptNumber { get; set; } = string.Empty; // e.g. REC-20261119-0001
        public decimal Amount { get; set; }

        // chitfund.txt input fields:
        public DateTime CollectionDate { get; set; } = DateTime.UtcNow;
        public DateTime ChitDate { get; set; }
        public string ChitPerson { get; set; } = string.Empty;

        public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
        public string? TransactionReference { get; set; }
        public decimal LateFine { get; set; } = 0m;
        public string Status { get; set; } = "Completed"; // Completed, Reversed, Pending
        public string? IdempotencyKey { get; set; }
        public string? Remarks { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    // FR-08: Auctions
    public class Auction
    {
        public int Id { get; set; }
        public int ChitGroupId { get; set; }
        public ChitGroup? ChitGroup { get; set; }

        public int AuctionNumber { get; set; }
        public DateTime AuctionDate { get; set; }
        public string Status { get; set; } = "Scheduled"; // Scheduled, Completed, Approved, Cancelled
        public int? CreatedByUserId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<AuctionBid> Bids { get; set; } = new List<AuctionBid>();
        public AuctionResult? Result { get; set; }
    }

    // FR-08: Auction Bids
    public class AuctionBid
    {
        public int Id { get; set; }
        public int AuctionId { get; set; }
        public Auction? Auction { get; set; }

        public int ChitMemberId { get; set; }
        public ChitMember? ChitMember { get; set; }

        public decimal BidAmount { get; set; }
        public DateTime BidTime { get; set; } = DateTime.UtcNow;
        public string Status { get; set; } = "Submitted";
    }

    // FR-08: Auction Results
    public class AuctionResult
    {
        public int Id { get; set; }
        public int AuctionId { get; set; }
        public Auction? Auction { get; set; }

        public int WinnerMemberId { get; set; }
        public ChitMember? WinnerMember { get; set; }

        public decimal DiscountAmount { get; set; } // Bid discount
        public decimal GrossPrizeAmount { get; set; } // Total Chit Value - Discount
        public decimal ForemanCommission { get; set; } // e.g. 5%
        public decimal DistributableDividend { get; set; } // Discount - Commission
        public int? ApprovedByUserId { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public string Status { get; set; } = "Approved"; // PendingApproval, Approved, Rejected

        public ICollection<DividendAllocation> Dividends { get; set; } = new List<DividendAllocation>();
        public PrizePayout? Payout { get; set; }
    }

    // FR-09: Dividend Allocations
    public class DividendAllocation
    {
        public int Id { get; set; }
        public int AuctionResultId { get; set; }
        public AuctionResult? AuctionResult { get; set; }

        public int ChitMemberId { get; set; }
        public ChitMember? ChitMember { get; set; }

        public decimal DividendAmount { get; set; }
        public string CalculationVersion { get; set; } = "v1.0";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    // FR-10: Prize Payouts
    public class PrizePayout
    {
        public long Id { get; set; }
        public int AuctionResultId { get; set; }
        public AuctionResult? AuctionResult { get; set; }

        public decimal GrossAmount { get; set; }
        public decimal Deductions { get; set; } = 0m;
        public decimal NetAmount { get; set; }
        public string Status { get; set; } = "Approved"; // PendingVerification, Verified, Approved, Disbursed
        public int? VerifiedByUserId { get; set; }
        public int? ApprovedByUserId { get; set; }
        public DateTime? PaidAt { get; set; }
        public string? TransactionReference { get; set; }
    }

    // FR-12: Expenses
    public class Expense
    {
        public int Id { get; set; }
        public string Category { get; set; } = string.Empty; // Rent, Salaries, Legal, Office, Utilities
        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime ExpenseDate { get; set; } = DateTime.UtcNow.Date;
        public int? RecordedByUserId { get; set; }
        public string Status { get; set; } = "Approved";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    // FR-14: Notifications
    public class Notification
    {
        public long Id { get; set; }
        public int? CustomerId { get; set; }
        public Customer? Customer { get; set; }
        public string NotificationType { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string Channel { get; set; } = "InApp";
        public string DeliveryStatus { get; set; } = "Delivered";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? SentAt { get; set; }
    }

    // FR-15: Audit Logs
    public class AuditLog
    {
        public long Id { get; set; }
        public int? UserId { get; set; }
        public string Action { get; set; } = string.Empty; // LOGIN, CREATE_CUSTOMER, RECORD_PAYMENT, etc.
        public string EntityType { get; set; } = string.Empty;
        public string EntityId { get; set; } = string.Empty;
        public string? Reason { get; set; }
        public string? BeforeData { get; set; }
        public string? AfterData { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    // FR-16: Company Settings
    public class CompanySetting
    {
        public int Id { get; set; }
        public string CompanyName { get; set; } = "";
        public string? Address { get; set; } = "";
        public string? Phone { get; set; } = "";
        public string? Email { get; set; } = "";
        public string CurrencyCode { get; set; } = "INR";
        public DateTime? FinancialYearStart { get; set; } = new DateTime(2026, 4, 1);
        public string ReceiptPrefix { get; set; } = "REC";
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    // Schedule Table Model ("how much amount will pay remaining amount to company")
    public class ChitSchedule
    {
        public int Id { get; set; }
        public int ChitGroupId { get; set; }
        public int MonthNumber { get; set; }
        public DateTime ChitDate { get; set; }
        public DateTime GraceEndDate { get; set; }
        public decimal BaseInstallment { get; set; }
        public bool IsAuctionCompleted { get; set; }
        public DateTime? AuctionDate { get; set; }
        public int? WinnerMemberId { get; set; }
        public string WinnerMemberName { get; set; } = string.Empty;
        public decimal BidAmount { get; set; }
        public decimal CompanyCommission { get; set; }
        public decimal TotalDividend { get; set; }
        public decimal DividendPerMember { get; set; }
        public decimal NetPayablePerMember { get; set; } // "how much amount will pay"
        public decimal PrizeAmountPaidToWinner { get; set; }
        public decimal TotalExpectedCollection { get; set; }
        public decimal TotalActualCollected { get; set; }
        public decimal RemainingAmountToCompany { get; set; } // "remaining amount to company"
        public string Status { get; set; } = "Scheduled";
        public string Notes { get; set; } = string.Empty;
    }
}
