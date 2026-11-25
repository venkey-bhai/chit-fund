using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using ChitFundApi.Models;

namespace ChitFundApi.Data
{
    public static class DbInitializer
    {
        public static void Initialize(ChitFundDbContext context)
        {
            context.Database.EnsureCreated();

            // 1. Seed Admin User
            if (!context.Users.Any())
            {
                context.Users.Add(new User
                {
                    Username = "admin",
                    PasswordHash = HashPassword("Admin@123"),
                    FullName = "ChitPro System Administrator",
                    Email = "admin@chitpro.com",
                    Role = "Admin",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                } );
                
                context.SaveChanges();
            }

            // 2. Seed Payment Modes
            if (!context.PaymentModes.Any())
            {
                context.PaymentModes.AddRange(
                    new PaymentMode { Name = "Cash", IsActive = true },
                    new PaymentMode { Name = "UPI", IsActive = true },
                    new PaymentMode { Name = "Bank Transfer", IsActive = true },
                    new PaymentMode { Name = "Cheque", IsActive = true },
                    new PaymentMode { Name = "Card", IsActive = true }
                );
                context.SaveChanges();
            }

            // 3. Seed Company Settings
            if (!context.CompanySettings.Any())
            {
                context.CompanySettings.Add(new CompanySetting
                {
                    CompanyName = "ChitPro Financial Services Ltd.",
                    Address = "100, Finance Hub, Anna Salai, Chennai, Tamil Nadu 600002",
                    Phone = "+91 98450 12345",
                    Email = "support@chitpro.com",
                    CurrencyCode = "INR",
                    FinancialYearStart = new DateTime(2026, 4, 1),
                    ReceiptPrefix = "REC",
                    UpdatedAt = DateTime.UtcNow
                });
                context.SaveChanges();
            }

            // 4. Seed Customers if none
            if (!context.Customers.Any())
            {
                var customers = new List<Customer>
                {
                    // new Customer { CustomerCode = "CUS-0001", FullName = "Rajesh Sharma", Mobile = "9845012345", Email = "rajesh.sharma@example.com", AadhaarOrPan = "ABCDP1234F", Address = "124, Gandhi Nagar, Hyderabad", NomineeName = "Pooja Sharma", NomineeRelation = "Spouse", RegistrationDate = new DateTime(2026, 1, 1), Status = "Active" },
                    // new Customer { CustomerCode = "CUS-0002", FullName = "Suresh Kumar", Mobile = "9845023456", Email = "suresh.kumar@example.com", AadhaarOrPan = "XYZPK5678G", Address = "45, Ring Road, Bengaluru", NomineeName = "Anitha Kumar", NomineeRelation = "Spouse", RegistrationDate = new DateTime(2026, 1, 2), Status = "Active" },
                    // new Customer { CustomerCode = "CUS-0003", FullName = "Priya Venkatesh", Mobile = "9845034567", Email = "priya.v@example.com", AadhaarOrPan = "PQRVK9012H", Address = "88, T. Nagar, Chennai", NomineeName = "K. Venkatesh", NomineeRelation = "Father", RegistrationDate = new DateTime(2026, 1, 3), Status = "Active" },
                    // new Customer { CustomerCode = "CUS-0004", FullName = "Anil Verma", Mobile = "9845045678", Email = "anil.verma@example.com", AadhaarOrPan = "MNBVA3456J", Address = "67, MG Road, Pune", NomineeName = "Sunita Verma", NomineeRelation = "Spouse", RegistrationDate = new DateTime(2026, 1, 4), Status = "Active" },
                    // new Customer { CustomerCode = "CUS-0005", FullName = "Meenakshi Sundaram", Mobile = "9845056789", Email = "meena.s@example.com", AadhaarOrPan = "LKJMS7890K", Address = "12, Temple St, Madurai", NomineeName = "S. Sundaram", NomineeRelation = "Spouse", RegistrationDate = new DateTime(2026, 1, 5), Status = "Active" },
                    // new Customer { CustomerCode = "CUS-0006", FullName = "Vikram Reddy", Mobile = "9845067890", Email = "vikram.reddy@example.com", AadhaarOrPan = "GFDVR2345L", Address = "302, Jubilee Hills, Hyderabad", NomineeName = "Kavitha Reddy", NomineeRelation = "Spouse", RegistrationDate = new DateTime(2026, 1, 6), Status = "Active" },
                    // new Customer { CustomerCode = "CUS-0007", FullName = "Lakshmi Narayanan", Mobile = "9845078901", Email = "lakshmi.n@example.com", AadhaarOrPan = "HGFNL6789M", Address = "54, Anna Salai, Chennai", NomineeName = "R. Narayanan", NomineeRelation = "Father", RegistrationDate = new DateTime(2026, 1, 7), Status = "Active" },
                    // new Customer { CustomerCode = "CUS-0008", FullName = "Ramesh Babu", Mobile = "9845089012", Email = "ramesh.babu@example.com", AadhaarOrPan = "TREBR0123N", Address = "71, Malleshwaram, Bengaluru", NomineeName = "Shobha Babu", NomineeRelation = "Spouse", RegistrationDate = new DateTime(2026, 1, 8), Status = "Active" },
                    // new Customer { CustomerCode = "CUS-0009", FullName = "Deepa Krishnan", Mobile = "9845090123", Email = "deepa.k@example.com", AadhaarOrPan = "YUIDK4567P", Address = "19, Alwarpet, Chennai", NomineeName = "Arun Krishnan", NomineeRelation = "Spouse", RegistrationDate = new DateTime(2026, 1, 9), Status = "Active" },
                    // new Customer { CustomerCode = "CUS-0010", FullName = "Gopal Rao", Mobile = "9845101234", Email = "gopal.rao@example.com", AadhaarOrPan = "IOPGR8901Q", Address = "105, Banjara Hills, Hyderabad", NomineeName = "Bhavani Rao", NomineeRelation = "Spouse", RegistrationDate = new DateTime(2026, 1, 10), Status = "Active" },
                    // new Customer { CustomerCode = "CUS-0011", FullName = "Karthik Subramanian", Mobile = "9845112345", Email = "karthik.s@example.com", AadhaarOrPan = "QWKS2345R", Address = "22, Besant Nagar, Chennai", NomineeName = "Nalini Subramanian", NomineeRelation = "Mother", RegistrationDate = new DateTime(2026, 1, 11), Status = "Active" },
                    // new Customer { CustomerCode = "CUS-0012", FullName = "Sunil Patel", Mobile = "9845123456", Email = "sunil.patel@example.com", AadhaarOrPan = "ASSP6789T", Address = "14, Navrangpura, Ahmedabad", NomineeName = "Dipti Patel", NomineeRelation = "Spouse", RegistrationDate = new DateTime(2026, 1, 12), Status = "Active" }
                };

                context.Customers.AddRange(customers);
                context.SaveChanges();

                // 5. Seed Chit Group 1: 1-Year Chit (12 Months, 12 Members, ₹1,200,000)
                var start1 = new DateTime(2026, 1, 10);
                var group1 = new ChitGroup
                {
                    GroupCode = "CF-2026-GOLD12",
                    GroupName = "Gold Wealth 1-Year Chit Scheme",
                    ChitValue = 1200000m,
                    DurationYears = 1.0m,
                    DurationMonths = 12,
                    TotalMembers = 12,
                    MaxMembers = 12,
                    MonthlySubscription = 100000m, // 1.2M / 12
                    StartDate = start1,
                    EndDate = start1.AddMonths(11),
                    MonthlyStartingDate = 10,
                    GraceDays = 5,
                    GracePeriod = "5 days grace period after due date. 2% monthly late fee applies thereafter.",
                    ForemanCommissionPercentage = 5.0m,
                    Status = "Active",
                    AgreementReference = "CHIT/AGR/2026/001"
                };

                // Seed Chit Group 2: 2-Year Chit (24 Months, 20 Members, ₹500,000)
                var start2 = new DateTime(2026, 2, 5);
                var group2 = new ChitGroup
                {
                    GroupCode = "CF-2026-PLAT24",
                    GroupName = "Platinum Future 2-Year Chit Scheme",
                    ChitValue = 500000m,
                    DurationYears = 2.0m,
                    DurationMonths = 24,
                    TotalMembers = 12,
                    MaxMembers = 24,
                    MonthlySubscription = 20833.33m,
                    StartDate = start2,
                    EndDate = start2.AddMonths(23),
                    MonthlyStartingDate = 5,
                    GraceDays = 7,
                    GracePeriod = "7 grace days allowed from the 5th of each month.",
                    ForemanCommissionPercentage = 5.0m,
                    Status = "Active",
                    AgreementReference = "CHIT/AGR/2026/002"
                };

                context.ChitGroups.AddRange(group1, group2);
                context.SaveChanges();

                // Enroll members into Group 1
                var memberships1 = new List<ChitMember>();
                for (int i = 0; i < customers.Count; i++)
                {
                    var m = new ChitMember
                    {
                        CustomerId = customers[i].Id,
                        ChitGroupId = group1.Id,
                        MemberCode = $"MEM-G1-{(i + 1):D3}",
                        TicketNumber = i + 1,
                        JoiningDate = start1.AddDays(-10),
                        HasPrized = (i == 1), // Suresh won month 2
                        PrizedMonthNumber = (i == 1 ? 2 : null),
                        PrizedAmount = (i == 1 ? 960000m : null),
                        Status = "Active"
                    };
                    memberships1.Add(m);
                }
                context.ChitMembers.AddRange(memberships1);
                context.SaveChanges();

                // Generate Installments for Group 1 (Month 1 to 12)
                var allInstallments = new List<Installment>();
                foreach (var member in memberships1)
                {
                    for (int m = 1; m <= group1.DurationMonths; m++)
                    {
                        var dueDate = new DateTime(start1.Year, start1.Month, group1.MonthlyStartingDate).AddMonths(m - 1);
                        var graceDate = dueDate.AddDays(group1.GraceDays);
                        decimal dividend = 0m;
                        if (m == 2) dividend = 15000m; // Month 2 dividend

                        decimal netPayable = group1.MonthlySubscription - dividend;
                        decimal paidAmt = (m == 1) ? netPayable : (m == 2 && member.TicketNumber == 1 ? netPayable : 0m);

                        allInstallments.Add(new Installment
                        {
                            ChitMemberId = member.Id,
                            InstallmentNumber = m,
                            DueDate = dueDate,
                            GraceEndDate = graceDate,
                            DueAmount = group1.MonthlySubscription,
                            DividendDeduction = dividend,
                            NetPayableAmount = netPayable,
                            PaidAmount = paidAmt,
                            Status = paidAmt >= netPayable ? "Paid" : (m <= 2 ? "Due" : "Due")
                        });
                    }
                }
                context.Installments.AddRange(allInstallments);
                context.SaveChanges();

                // Seed Auctions for Group 1 (Month 1 Foreman & Month 2 Completed)
                var auction1 = new Auction
                {
                    ChitGroupId = group1.Id,
                    AuctionNumber = 1,
                    AuctionDate = start1,
                    Status = "Approved",
                    CreatedAt = start1
                };
                var auction2 = new Auction
                {
                    ChitGroupId = group1.Id,
                    AuctionNumber = 2,
                    AuctionDate = start1.AddMonths(1),
                    Status = "Approved",
                    CreatedAt = start1.AddMonths(1)
                };
                context.Auctions.AddRange(auction1, auction2);
                context.SaveChanges();

                // Auction 2 Result: Suresh won with 240,000 discount
                var result2 = new AuctionResult
                {
                    AuctionId = auction2.Id,
                    WinnerMemberId = memberships1[1].Id,
                    DiscountAmount = 240000m,
                    GrossPrizeAmount = 960000m,
                    ForemanCommission = 60000m, // 5% of 1.2M
                    DistributableDividend = 180000m, // 240k - 60k
                    Status = "Approved",
                    ApprovedAt = start1.AddMonths(1)
                };
                context.AuctionResults.Add(result2);
                context.SaveChanges();

                // Dividend Allocations for Month 2 (180,000 / 12 = 15,000 each)
                foreach (var member in memberships1)
                {
                    context.DividendAllocations.Add(new DividendAllocation
                    {
                        AuctionResultId = result2.Id,
                        ChitMemberId = member.Id,
                        DividendAmount = 15000m,
                        CalculationVersion = "v1.0"
                    });
                }
                context.SaveChanges();

                // Prize Payout for Month 2
                context.PrizePayouts.Add(new PrizePayout
                {
                    AuctionResultId = result2.Id,
                    GrossAmount = 960000m,
                    Deductions = 0m,
                    NetAmount = 960000m,
                    Status = "Disbursed",
                    PaidAt = start1.AddMonths(1).AddDays(5),
                    TransactionReference = "NEFT-20260215-998811"
                });
                context.SaveChanges();

                // Seed Payments (FR-07) with exact collection date, chit date, chit person, amount
                var paymentModeUpi = context.PaymentModes.First(pm => pm.Name == "UPI");
                var paymentModeBank = context.PaymentModes.First(pm => pm.Name == "Bank Transfer");
                var paymentModeCash = context.PaymentModes.First(pm => pm.Name == "Cash");

                var payments = new List<Payment>
                {
                    new Payment
                    {
                        ChitGroupId = group1.Id,
                        CustomerId = customers[0].Id,
                        InstallmentId = allInstallments.First(i => i.ChitMemberId == memberships1[0].Id && i.InstallmentNumber == 1).Id,
                        PaymentModeId = paymentModeUpi.Id,
                        ReceiptNumber = "REC-20260112-0001",
                        Amount = 100000m,
                        CollectionDate = new DateTime(2026, 1, 12),
                        ChitDate = start1,
                        ChitPerson = customers[0].FullName,
                        PaymentDate = new DateTime(2026, 1, 12),
                        TransactionReference = "UPI-20260112-99881",
                        Status = "Completed",
                        Remarks = "Month 1 on-time payment"
                    },
                    new Payment
                    {
                        ChitGroupId = group1.Id,
                        CustomerId = customers[1].Id,
                        InstallmentId = allInstallments.First(i => i.ChitMemberId == memberships1[1].Id && i.InstallmentNumber == 1).Id,
                        PaymentModeId = paymentModeBank.Id,
                        ReceiptNumber = "REC-20260114-0002",
                        Amount = 100000m,
                        CollectionDate = new DateTime(2026, 1, 14),
                        ChitDate = start1,
                        ChitPerson = customers[1].FullName,
                        PaymentDate = new DateTime(2026, 1, 14),
                        TransactionReference = "IMPS-20260114-11223",
                        Status = "Completed",
                        Remarks = "Month 1 within grace days"
                    },
                    new Payment
                    {
                        ChitGroupId = group1.Id,
                        CustomerId = customers[2].Id,
                        InstallmentId = allInstallments.First(i => i.ChitMemberId == memberships1[2].Id && i.InstallmentNumber == 1).Id,
                        PaymentModeId = paymentModeCash.Id,
                        ReceiptNumber = "REC-20260110-0003",
                        Amount = 100000m,
                        CollectionDate = new DateTime(2026, 1, 10),
                        ChitDate = start1,
                        ChitPerson = customers[2].FullName,
                        PaymentDate = new DateTime(2026, 1, 10),
                        TransactionReference = "CSH-20260110-3344",
                        Status = "Completed",
                        Remarks = "Month 1 paid in cash"
                    },
                    new Payment
                    {
                        ChitGroupId = group1.Id,
                        CustomerId = customers[0].Id,
                        InstallmentId = allInstallments.First(i => i.ChitMemberId == memberships1[0].Id && i.InstallmentNumber == 2).Id,
                        PaymentModeId = paymentModeUpi.Id,
                        ReceiptNumber = "REC-20260208-0004",
                        Amount = 85000m, // Net payable after 15k dividend
                        CollectionDate = new DateTime(2026, 2, 8),
                        ChitDate = start1.AddMonths(1),
                        ChitPerson = customers[0].FullName,
                        PaymentDate = new DateTime(2026, 2, 8),
                        TransactionReference = "UPI-20260208-77112",
                        Status = "Completed",
                        Remarks = "Month 2 net payable after dividend deduction"
                    }
                };

                context.Payments.AddRange(payments);
                context.SaveChanges();

                // Seed Expenses (FR-12)
                context.Expenses.AddRange(
                    new Expense { Category = "Office Rent", Description = "Branch office rent for Jan 2026", Amount = 35000m, ExpenseDate = new DateTime(2026, 1, 5), Status = "Approved" },
                    new Expense { Category = "Salaries", Description = "Staff salaries for Jan 2026", Amount = 80000m, ExpenseDate = new DateTime(2026, 1, 31), Status = "Approved" },
                    new Expense { Category = "Legal & Filing", Description = "Chit fund registration and statutory audit fee", Amount = 15000m, ExpenseDate = new DateTime(2026, 1, 15), Status = "Approved" }
                );
                context.SaveChanges();

                // Seed Audit Logs (FR-15)
                context.AuditLogs.AddRange(
                    new AuditLog { Action = "SYSTEM_INITIALIZED", EntityType = "System", EntityId = "1", Reason = "Initial system setup & seed data", CreatedAt = DateTime.UtcNow.AddDays(-30) },
                    new AuditLog { Action = "CREATE_CHIT_GROUP", EntityType = "ChitGroup", EntityId = group1.Id.ToString(), Reason = "Group created", CreatedAt = start1.AddDays(-20) },
                    new AuditLog { Action = "RECORD_PAYMENT", EntityType = "Payment", EntityId = "REC-20260110-0003", Reason = "Installment collected", CreatedAt = new DateTime(2026, 1, 10) }
                );
                context.SaveChanges();
            }
        }

        private static string HashPassword(string password)
        {
            using var sha = SHA256.Create();
            var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(password));
            return Convert.ToBase64String(bytes);
        }
    }
}
