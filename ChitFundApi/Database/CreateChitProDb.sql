-- ============================================================
-- ChitPro - Chit Fund Management System
-- Database Schema Script for Microsoft SQL Server (SSMS)
-- Database Name: ChitProDB
-- Version: 1.0 (Based on ChitPro SRS & Architecture Specification)
-- ============================================================

USE [master];
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'ChitProDB')
BEGIN
    CREATE DATABASE [ChitProDB];
    PRINT 'Database ChitProDB created successfully.';
END
GO

USE [ChitProDB];
GO

-- 1. USERS TABLE (FR-01, Section 9.1)
IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Users] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Username] NVARCHAR(100) NOT NULL UNIQUE,
        [PasswordHash] NVARCHAR(500) NOT NULL,
        [Email] NVARCHAR(255) NULL,
        [FullName] NVARCHAR(150) NOT NULL DEFAULT 'Administrator',
        [Role] NVARCHAR(50) NOT NULL DEFAULT 'Admin',
        [IsActive] BIT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME(),
        [UpdatedAt] DATETIME2(7) NULL
    );
    PRINT 'Table Users created.';
END
GO

-- 2. CUSTOMERS TABLE (FR-03, Section 9.2)
IF OBJECT_ID(N'dbo.Customers', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Customers] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [CustomerCode] NVARCHAR(30) NOT NULL UNIQUE,
        [FullName] NVARCHAR(200) NOT NULL,
        [Mobile] NVARCHAR(20) NOT NULL,
        [Email] NVARCHAR(255) NULL,
        [DateOfBirth] DATE NULL,
        [Address] NVARCHAR(1000) NULL,
        [AadhaarOrPan] NVARCHAR(50) NULL,
        [NomineeName] NVARCHAR(150) NULL,
        [NomineeRelation] NVARCHAR(50) NULL,
        [KycStatus] NVARCHAR(30) NOT NULL DEFAULT 'Verified',
        [RegistrationDate] DATE NOT NULL,
        [Status] NVARCHAR(30) NOT NULL DEFAULT 'Active',
        [CreatedAt] DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME(),
        [UpdatedAt] DATETIME2(7) NULL
    );
    PRINT 'Table Customers created.';
END
GO

-- 3. CUSTOMER_DOCUMENTS TABLE (FR-03, Section 9.3)
IF OBJECT_ID(N'dbo.CustomerDocuments', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[CustomerDocuments] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [CustomerId] INT NOT NULL,
        [DocumentType] NVARCHAR(50) NOT NULL,
        [FileReference] NVARCHAR(500) NOT NULL,
        [VerificationStatus] NVARCHAR(30) NOT NULL DEFAULT 'Pending',
        [UploadedAt] DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME(),
        [VerifiedAt] DATETIME2(7) NULL,
        CONSTRAINT [FK_CustomerDocuments_Customers] FOREIGN KEY ([CustomerId]) REFERENCES [dbo].[Customers]([Id]) ON DELETE CASCADE
    );
    PRINT 'Table CustomerDocuments created.';
END
GO

-- 4. CHIT_GROUPS TABLE (FR-04, Section 9.4)
IF OBJECT_ID(N'dbo.ChitGroups', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ChitGroups] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [GroupCode] NVARCHAR(30) NOT NULL UNIQUE,
        [GroupName] NVARCHAR(150) NOT NULL,
        [ChitValue] DECIMAL(18,2) NOT NULL,
        [TotalMembers] INT NOT NULL,
        [MaxMembers] INT NOT NULL DEFAULT 20,
        [DurationMonths] INT NOT NULL,
        [DurationYears] DECIMAL(18,2) NOT NULL DEFAULT 1.0,
        [MonthlySubscription] DECIMAL(18,2) NOT NULL,
        [StartDate] DATE NOT NULL,
        [EndDate] DATE NULL,
        [MonthlyStartingDate] INT NOT NULL DEFAULT 5,
        [GraceDays] INT NOT NULL DEFAULT 5,
        [GracePeriod] NVARCHAR(500) NOT NULL DEFAULT '5 days grace period after due date.',
        [ForemanCommissionPercentage] DECIMAL(18,2) NOT NULL DEFAULT 5.0,
        [Status] NVARCHAR(30) NOT NULL DEFAULT 'Active',
        [AgreementReference] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME(),
        [UpdatedAt] DATETIME2(7) NULL
    );
    PRINT 'Table ChitGroups created.';
END
GO

-- 5. CHIT_MEMBERS TABLE (FR-05, Section 9.5)
IF OBJECT_ID(N'dbo.ChitMembers', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ChitMembers] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [CustomerId] INT NOT NULL,
        [ChitGroupId] INT NOT NULL,
        [MemberCode] NVARCHAR(30) NOT NULL,
        [TicketNumber] INT NOT NULL DEFAULT 1,
        [JoiningDate] DATE NOT NULL,
        [HasPrized] BIT NOT NULL DEFAULT 0,
        [PrizedMonthNumber] INT NULL,
        [PrizedAmount] DECIMAL(18,2) NULL,
        [Status] NVARCHAR(30) NOT NULL DEFAULT 'Active',
        [CreatedAt] DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [FK_ChitMembers_Customers] FOREIGN KEY ([CustomerId]) REFERENCES [dbo].[Customers]([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_ChitMembers_ChitGroups] FOREIGN KEY ([ChitGroupId]) REFERENCES [dbo].[ChitGroups]([Id]) ON DELETE CASCADE
    );
    PRINT 'Table ChitMembers created.';
END
GO

-- 6. INSTALLMENTS TABLE (FR-06, Section 9.6)
IF OBJECT_ID(N'dbo.Installments', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Installments] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [ChitMemberId] INT NOT NULL,
        [InstallmentNumber] INT NOT NULL,
        [DueDate] DATE NOT NULL,
        [GraceEndDate] DATE NOT NULL,
        [DueAmount] DECIMAL(18,2) NOT NULL,
        [DividendDeduction] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [NetPayableAmount] DECIMAL(18,2) NOT NULL,
        [PaidAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [Status] NVARCHAR(30) NOT NULL DEFAULT 'Due', -- Due, Paid, PartiallyPaid, Overdue
        [CreatedAt] DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [FK_Installments_ChitMembers] FOREIGN KEY ([ChitMemberId]) REFERENCES [dbo].[ChitMembers]([Id]) ON DELETE CASCADE,
        CONSTRAINT [UQ_ChitMember_Installment] UNIQUE ([ChitMemberId], [InstallmentNumber])
    );
    PRINT 'Table Installments created.';
END
GO

-- 7. PAYMENT_MODES TABLE (FR-07, Section 9.7)
IF OBJECT_ID(N'dbo.PaymentModes', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[PaymentModes] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Name] NVARCHAR(50) NOT NULL UNIQUE,
        [IsActive] BIT NOT NULL DEFAULT 1
    );
    PRINT 'Table PaymentModes created.';
END
GO

-- 8. PAYMENTS TABLE (FR-07, Section 9.8)
IF OBJECT_ID(N'dbo.Payments', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Payments] (
        [Id] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [InstallmentId] INT NULL,
        [ChitGroupId] INT NOT NULL,
        [CustomerId] INT NULL,
        [PaymentModeId] INT NOT NULL,
        [RecordedByUserId] INT NULL,
        [ReceiptNumber] NVARCHAR(50) NOT NULL UNIQUE,
        [Amount] DECIMAL(18,2) NOT NULL,
        [CollectionDate] DATETIME2(7) NOT NULL,
        [ChitDate] DATETIME2(7) NOT NULL,
        [ChitPerson] NVARCHAR(200) NOT NULL,
        [PaymentDate] DATETIME2(7) NOT NULL,
        [TransactionReference] NVARCHAR(150) NULL,
        [LateFine] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [Status] NVARCHAR(30) NOT NULL DEFAULT 'Completed', -- Completed, Reversed, Pending
        [IdempotencyKey] NVARCHAR(100) NULL,
        [Remarks] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [FK_Payments_Installments] FOREIGN KEY ([InstallmentId]) REFERENCES [dbo].[Installments]([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Payments_ChitGroups] FOREIGN KEY ([ChitGroupId]) REFERENCES [dbo].[ChitGroups]([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Payments_PaymentModes] FOREIGN KEY ([PaymentModeId]) REFERENCES [dbo].[PaymentModes]([Id]) ON DELETE NO ACTION
    );
    PRINT 'Table Payments created.';
END
GO

-- 9. AUCTIONS TABLE (FR-08, Section 9.9)
IF OBJECT_ID(N'dbo.Auctions', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Auctions] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [ChitGroupId] INT NOT NULL,
        [AuctionNumber] INT NOT NULL,
        [AuctionDate] DATETIME2(7) NOT NULL,
        [Status] NVARCHAR(30) NOT NULL DEFAULT 'Scheduled', -- Scheduled, Completed, Approved, Cancelled
        [CreatedByUserId] INT NULL,
        [CreatedAt] DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [FK_Auctions_ChitGroups] FOREIGN KEY ([ChitGroupId]) REFERENCES [dbo].[ChitGroups]([Id]) ON DELETE CASCADE,
        CONSTRAINT [UQ_ChitGroup_AuctionNumber] UNIQUE ([ChitGroupId], [AuctionNumber])
    );
    PRINT 'Table Auctions created.';
END
GO

-- 10. AUCTION_BIDS TABLE (FR-08, Section 9.10)
IF OBJECT_ID(N'dbo.AuctionBids', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[AuctionBids] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [AuctionId] INT NOT NULL,
        [ChitMemberId] INT NOT NULL,
        [BidAmount] DECIMAL(18,2) NOT NULL,
        [BidTime] DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME(),
        [Status] NVARCHAR(30) NOT NULL DEFAULT 'Submitted',
        CONSTRAINT [FK_AuctionBids_Auctions] FOREIGN KEY ([AuctionId]) REFERENCES [dbo].[Auctions]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_AuctionBids_ChitMembers] FOREIGN KEY ([ChitMemberId]) REFERENCES [dbo].[ChitMembers]([Id]) ON DELETE NO ACTION
    );
    PRINT 'Table AuctionBids created.';
END
GO

-- 11. AUCTION_RESULTS TABLE (FR-08, Section 9.11)
IF OBJECT_ID(N'dbo.AuctionResults', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[AuctionResults] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [AuctionId] INT NOT NULL UNIQUE,
        [WinnerMemberId] INT NOT NULL,
        [DiscountAmount] DECIMAL(18,2) NOT NULL,
        [GrossPrizeAmount] DECIMAL(18,2) NOT NULL,
        [ForemanCommission] DECIMAL(18,2) NOT NULL,
        [DistributableDividend] DECIMAL(18,2) NOT NULL,
        [ApprovedByUserId] INT NULL,
        [ApprovedAt] DATETIME2(7) NULL,
        [Status] NVARCHAR(30) NOT NULL DEFAULT 'PendingApproval', -- PendingApproval, Approved, Rejected
        CONSTRAINT [FK_AuctionResults_Auctions] FOREIGN KEY ([AuctionId]) REFERENCES [dbo].[Auctions]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_AuctionResults_ChitMembers] FOREIGN KEY ([WinnerMemberId]) REFERENCES [dbo].[ChitMembers]([Id]) ON DELETE NO ACTION
    );
    PRINT 'Table AuctionResults created.';
END
GO

-- 12. DIVIDEND_ALLOCATIONS TABLE (FR-09, Section 9.12)
IF OBJECT_ID(N'dbo.DividendAllocations', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[DividendAllocations] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [AuctionResultId] INT NOT NULL,
        [ChitMemberId] INT NOT NULL,
        [DividendAmount] DECIMAL(18,2) NOT NULL,
        [CalculationVersion] NVARCHAR(30) NOT NULL DEFAULT 'v1.0',
        [CreatedAt] DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [FK_DividendAllocations_AuctionResults] FOREIGN KEY ([AuctionResultId]) REFERENCES [dbo].[AuctionResults]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_DividendAllocations_ChitMembers] FOREIGN KEY ([ChitMemberId]) REFERENCES [dbo].[ChitMembers]([Id]) ON DELETE NO ACTION,
        CONSTRAINT [UQ_Result_Member_Dividend] UNIQUE ([AuctionResultId], [ChitMemberId])
    );
    PRINT 'Table DividendAllocations created.';
END
GO

-- 13. PRIZE_PAYOUTS TABLE (FR-10, Section 9.13)
IF OBJECT_ID(N'dbo.PrizePayouts', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[PrizePayouts] (
        [Id] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [AuctionResultId] INT NOT NULL UNIQUE,
        [GrossAmount] DECIMAL(18,2) NOT NULL,
        [Deductions] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [NetAmount] DECIMAL(18,2) NOT NULL,
        [Status] NVARCHAR(30) NOT NULL DEFAULT 'PendingVerification', -- PendingVerification, Verified, Approved, Disbursed
        [VerifiedByUserId] INT NULL,
        [ApprovedByUserId] INT NULL,
        [PaidAt] DATETIME2(7) NULL,
        [TransactionReference] NVARCHAR(150) NULL,
        CONSTRAINT [FK_PrizePayouts_AuctionResults] FOREIGN KEY ([AuctionResultId]) REFERENCES [dbo].[AuctionResults]([Id]) ON DELETE CASCADE
    );
    PRINT 'Table PrizePayouts created.';
END
GO

-- 14. EXPENSES TABLE (FR-12, Section 9.14)
IF OBJECT_ID(N'dbo.Expenses', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Expenses] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Category] NVARCHAR(100) NOT NULL,
        [Description] NVARCHAR(500) NOT NULL,
        [Amount] DECIMAL(18,2) NOT NULL,
        [ExpenseDate] DATE NOT NULL,
        [RecordedByUserId] INT NULL,
        [Status] NVARCHAR(30) NOT NULL DEFAULT 'Approved',
        [CreatedAt] DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME()
    );
    PRINT 'Table Expenses created.';
END
GO

-- 15. NOTIFICATIONS TABLE (FR-14, Section 9.15)
IF OBJECT_ID(N'dbo.Notifications', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Notifications] (
        [Id] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [CustomerId] INT NULL,
        [NotificationType] NVARCHAR(50) NOT NULL,
        [Message] NVARCHAR(1000) NOT NULL,
        [Channel] NVARCHAR(30) NOT NULL DEFAULT 'InApp',
        [DeliveryStatus] NVARCHAR(30) NOT NULL DEFAULT 'Delivered',
        [CreatedAt] DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME(),
        [SentAt] DATETIME2(7) NULL,
        CONSTRAINT [FK_Notifications_Customers] FOREIGN KEY ([CustomerId]) REFERENCES [dbo].[Customers]([Id]) ON DELETE SET NULL
    );
    PRINT 'Table Notifications created.';
END
GO

-- 16. AUDIT_LOGS TABLE (FR-15, Section 9.16)
IF OBJECT_ID(N'dbo.AuditLogs', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[AuditLogs] (
        [Id] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [UserId] INT NULL,
        [Action] NVARCHAR(100) NOT NULL,
        [EntityType] NVARCHAR(100) NOT NULL,
        [EntityId] NVARCHAR(100) NOT NULL,
        [Reason] NVARCHAR(500) NULL,
        [BeforeData] NVARCHAR(MAX) NULL,
        [AfterData] NVARCHAR(MAX) NULL,
        [CreatedAt] DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME()
    );
    PRINT 'Table AuditLogs created.';
END
GO

-- 17. COMPANY_SETTINGS TABLE (FR-16, Section 9.17)
IF OBJECT_ID(N'dbo.CompanySettings', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[CompanySettings] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [CompanyName] NVARCHAR(200) NOT NULL,
        [Address] NVARCHAR(1000) NULL,
        [Phone] NVARCHAR(30) NULL,
        [Email] NVARCHAR(255) NULL,
        [CurrencyCode] NVARCHAR(10) NOT NULL DEFAULT 'INR',
        [FinancialYearStart] DATE NULL,
        [ReceiptPrefix] NVARCHAR(20) NOT NULL DEFAULT 'REC',
        [UpdatedAt] DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME()
    );
    PRINT 'Table CompanySettings created.';
END
GO

-- PERFORMANCE INDEXES (Section 6 & 9)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Customers_CustomerCode')
    CREATE INDEX [IX_Customers_CustomerCode] ON [dbo].[Customers]([CustomerCode]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Customers_Mobile')
    CREATE INDEX [IX_Customers_Mobile] ON [dbo].[Customers]([Mobile]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Payments_ReceiptNumber')
    CREATE INDEX [IX_Payments_ReceiptNumber] ON [dbo].[Payments]([ReceiptNumber]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Payments_CollectionDate')
    CREATE INDEX [IX_Payments_CollectionDate] ON [dbo].[Payments]([CollectionDate]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLogs_CreatedAt')
    CREATE INDEX [IX_AuditLogs_CreatedAt] ON [dbo].[AuditLogs]([CreatedAt]);
GO

PRINT 'ChitProDB schema verified and ready for SQL Server Management Studio.';
GO
