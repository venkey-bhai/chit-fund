# ChitPro: Enterprise Chit Fund Management System

A full-stack, enterprise-grade Chit Fund Management System built in strict compliance with the **Chit Funds Act, 1982**, the operational requirements in `chitfund.txt`, and the enterprise architecture specifications in `ChitPro_SRS_Architecture_API_Roadmap.txt`.

---

## 🏛️ Architectural Overview & Tech Stack

| Layer | Technology | Description |
|---|---|---|
| **Backend** | **ASP.NET Core Web API (.NET 8.0)** | High-performance RESTful APIs, versioned under `/api/v1`, EF Core 8 with SQL Server, audit logging, and domain calculations |
| **Database** | **Microsoft SQL Server (`ChitProDB`)** | 17 normalized relational tables conforming to the ChitPro SRS, supporting SQL Server Management Studio (SSMS) |
| **Frontend** | **Next.js 14 (App Router)** | Built with **pure JavaScript (`.js` / `.jsx`) & Tailwind CSS** (strictly *No TypeScript*), responsive layout, Lucide React icons |

---

## 📋 Comprehensive Feature Implementation

### 1. Requirements from `chitfund.txt`
* **Choose How Many Years of Chit & No. of Months**:
  - Full two-way synchronization between duration in years (e.g. 1 Year, 1.5 Years, 2 Years, 2.5 Years, 3 Years, 5 Years) and duration in months (e.g. 12, 18, 24, 30, 36, 60).
* **Starting Date & Ending Date Details**:
  - Exact Day, Month, and Year inputs for commencement date, automatically calculating and maintaining the maturity / ending Day, Month, and Year.
* **Monthly Cycles & Grace Days**:
  - Configurable chit monthly starting day (e.g. 5th of every month).
  - Explicit grace days configuration (e.g. 5 days) with grace period policy definition and late-fine handling.
* **Chit Schedule Table with *"How Much Amount Will Pay"* & *"Remaining Amount to Company"***:
  - Month-by-month financial ledger detailing:
    - Base Monthly Installment
    - Winning Bid Discount
    - Company Commission (legal 5% retained by foreman)
    - Dividend Distributed Per Member: `(Bid Discount - Company Commission) / Total Members`
    - **"How Much Amount Will Pay"**: Net installment due by non-prized members (`Base Installment - Dividend`)
    - Winner Prize Disbursement: `Total Chit Value - Bid Discount`
    - Total Collected vs Expected
    - **"Remaining Amount to Company"**: Company commission and retained surplus ledger
* **Collection Payment Entry Form (Exact Input Fields)**:
  - **`collection date:` with input field** (date payment was received)
  - **`chit date:` with input field** (installment cycle due date)
  - **`chit person:` with input field** (member name, with autofill / member selector)
  - **`amount:` with input field** (currency input in ₹)
  - Payment mode (Cash, UPI, NEFT/RTGS, Cheque, Card), transaction reference, receipt number generation (`REC-YYYYMMDD-XXXX`), and printable receipt modal.

---

### 2. ChitPro SRS Modules (FR-01 to FR-16)

| Code | Module | Endpoint / Route | Description |
|---|---|---|---|
| **FR-01** | **Authentication & RBAC** | `/api/v1/auth` | User login, JWT/token verification, password change, audit logging |
| **FR-02** | **Executive Dashboard** | `/` (`/api/v1/dashboard/summary`) | Summary KPIs (Total chits under management, today/monthly collections, outstanding balances, upcoming auctions) |
| **FR-03** | **Customer Management** | `/customers` (`/api/v1/customers`) | Customer onboarding, Aadhaar/PAN KYC status, contact, nominee, and passbook |
| **FR-04** | **Chit Scheme Creation** | `/chits` (`/api/v1/chit-groups`) | Scheme setup with value, months, years, member capacity, grace days, and start/end dates |
| **FR-05** | **Member Enrollment** | `/chits` (Modal) | Enroll customer into chit group with assigned ticket numbers (1 to N) |
| **FR-06** | **Chit Schedules** | `/chits/[id]` & `/schedules` | Dynamic schedule ledger with "how much amount will pay" and "remaining amount to company" |
| **FR-07** | **Payment Collection** | `/collections` (`/api/v1/payments`) | Payment collection entry with exact input fields, receipt numbering, and reversal capability |
| **FR-08** | **Auctions & Bidding** | `/auctions` (`/api/v1/auctions`) | Auction schedule, bid entry, minimum/maximum discount caps (5%–40%), winner declaration |
| **FR-09** | **Dividend Allocation** | Backend Service (`ChitCalculationService`) | Automatic calculation and distribution of dividend to all non-prized members |
| **FR-10** | **Prize Payouts** | `/payouts` (`/api/v1/payouts`) | Disburse prize money to auction winners after statutory foreman commission deductions |
| **FR-11** | **Passbook & History** | `/customers` & `/collections` | Chronological member ledger of all payments, dues, and dividends |
| **FR-12** | **Company Expenses** | `/expenses` (`/api/v1/expenses`) | Track operational expenses (Office Rent, Salaries, Legal, Printing, Tea/Snacks) |
| **FR-13** | **Reports & Audit** | `/reports` (`/api/v1/reports`) | Daily collections, outstanding arrears, reconciliation, and profit & loss |
| **FR-14** | **SMS / Notifications** | Backend Models (`Notifications`) | Customer payment receipts and auction schedule alerts |
| **FR-15** | **Audit Trail** | `/audit-logs` (`/api/v1/audit-logs`) | Immutable system action log for compliance with Chit Funds Act 1982 |
| **FR-16** | **Company Settings** | `/settings` (`/api/v1/settings`) | Legal company profile, registered office, contact, financial year, and receipt prefixes |

---

## 🗄️ Database Architecture (SQL Server `ChitProDB`)

All 17 tables are created and seeded in SQL Server:
1. `Users` — System operators and administrative credentials
2. `Customers` — Member profiles, Aadhaar/PAN KYC, nominee details
3. `CustomerDocuments` — Identity and address proof records
4. `ChitGroups` — Chit fund schemes, duration years/months, member capacity, grace days
5. `ChitMembers` — Ticket number assignments and prize status
6. `Installments` — Monthly installment schedules per ticket
7. `PaymentModes` — Cash, Bank Transfer (NEFT/RTGS), UPI, Cheque, Card
8. `Payments` — Payment collections (**collection date**, **chit date**, **chit person**, **amount**, receipt number)
9. `Auctions` — Monthly auction cycles
10. `AuctionBids` — Member auction bids and discounts
11. `AuctionResults` — Winning bids, foreman commission, net prize pool
12. `DividendAllocations` — Distributed dividend credits per member
13. `PrizePayouts` — Net prize money disbursements to winning members
14. `Expenses` — Company operating expenses categorized
15. `Notifications` — SMS / system notifications dispatch log
16. `AuditLogs` — Immutable audit trail with user, entity, action, and timestamp
17. `CompanySettings` — Single-company configuration, address, and receipt prefixes
18. `ChitSchedules` — Master schedule table with *"how much amount will pay"* and *"remaining amount to company"*

SQL Schema initialization script:
[`ChitFundApi/Database/CreateChitProDb.sql`](file:///c:/Users/Venkey-Bhai/Desktop/chitfund/ChitFundApi/Database/CreateChitProDb.sql)

---

## 🚀 Running the System

### Prerequisites
- .NET 8 SDK (`net8.0`)
- Node.js 18+ & npm
- Microsoft SQL Server (Local instance: `localhost\SQLEXPRESS`)

### 1. Start Backend API (.NET 8)
```powershell
cd ChitFundApi
dotnet run
```
- API Base URL: `http://localhost:5000`
- Interactive Swagger UI: `http://localhost:5000/swagger`

### 2. Start Frontend (Next.js 14)
```powershell
cd chitfund-frontend
npm run start -- -p 3000
# Or for development:
# npm run dev
```
- Frontend Web App: `http://localhost:3000`

---

## 🔐 Default Credentials
- **Username**: `admin`
- **Password**: `Admin@123`
