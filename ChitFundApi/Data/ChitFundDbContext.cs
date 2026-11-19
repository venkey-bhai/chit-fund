using Microsoft.EntityFrameworkCore;
using ChitFundApi.Models;

namespace ChitFundApi.Data
{
    public class ChitFundDbContext : DbContext
    {
        public ChitFundDbContext(DbContextOptions<ChitFundDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; } = null!;
        public DbSet<Customer> Customers { get; set; } = null!;
        public DbSet<CustomerDocument> CustomerDocuments { get; set; } = null!;
        public DbSet<ChitGroup> ChitGroups { get; set; } = null!;
        public DbSet<ChitMember> ChitMembers { get; set; } = null!;
        public DbSet<Installment> Installments { get; set; } = null!;
        public DbSet<PaymentMode> PaymentModes { get; set; } = null!;
        public DbSet<Payment> Payments { get; set; } = null!;
        public DbSet<Auction> Auctions { get; set; } = null!;
        public DbSet<AuctionBid> AuctionBids { get; set; } = null!;
        public DbSet<AuctionResult> AuctionResults { get; set; } = null!;
        public DbSet<DividendAllocation> DividendAllocations { get; set; } = null!;
        public DbSet<PrizePayout> PrizePayouts { get; set; } = null!;
        public DbSet<Expense> Expenses { get; set; } = null!;
        public DbSet<Notification> Notifications { get; set; } = null!;
        public DbSet<AuditLog> AuditLogs { get; set; } = null!;
        public DbSet<CompanySetting> CompanySettings { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure all decimal columns to precision(18,2)
            foreach (var property in modelBuilder.Model.GetEntityTypes()
                .SelectMany(t => t.GetProperties())
                .Where(p => p.ClrType == typeof(decimal) || p.ClrType == typeof(decimal?)))
            {
                property.SetPrecision(18);
                property.SetScale(2);
            }

            // Customer
            modelBuilder.Entity<Customer>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.CustomerCode).IsUnique();
            });

            // ChitGroup
            modelBuilder.Entity<ChitGroup>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.GroupCode).IsUnique();
            });

            // ChitMember
            modelBuilder.Entity<ChitMember>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.Customer)
                    .WithMany(c => c.Memberships)
                    .HasForeignKey(e => e.CustomerId)
                    .OnDelete(DeleteBehavior.NoAction);

                entity.HasOne(e => e.ChitGroup)
                    .WithMany(g => g.Members)
                    .HasForeignKey(e => e.ChitGroupId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Installment
            modelBuilder.Entity<Installment>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.ChitMember)
                    .WithMany(m => m.Installments)
                    .HasForeignKey(e => e.ChitMemberId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Payment
            modelBuilder.Entity<Payment>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.ReceiptNumber).IsUnique();

                entity.HasOne(e => e.Installment)
                    .WithMany(i => i.Payments)
                    .HasForeignKey(e => e.InstallmentId)
                    .OnDelete(DeleteBehavior.NoAction);

                entity.HasOne(e => e.ChitGroup)
                    .WithMany(g => g.Payments)
                    .HasForeignKey(e => e.ChitGroupId)
                    .OnDelete(DeleteBehavior.NoAction);

                entity.HasOne(e => e.PaymentMode)
                    .WithMany()
                    .HasForeignKey(e => e.PaymentModeId)
                    .OnDelete(DeleteBehavior.NoAction);
            });

            // Auction
            modelBuilder.Entity<Auction>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.ChitGroup)
                    .WithMany(g => g.Auctions)
                    .HasForeignKey(e => e.ChitGroupId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // AuctionResult
            modelBuilder.Entity<AuctionResult>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.Auction)
                    .WithOne(a => a.Result)
                    .HasForeignKey<AuctionResult>(e => e.AuctionId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.WinnerMember)
                    .WithMany()
                    .HasForeignKey(e => e.WinnerMemberId)
                    .OnDelete(DeleteBehavior.NoAction);
            });

            // DividendAllocation
            modelBuilder.Entity<DividendAllocation>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.AuctionResult)
                    .WithMany(r => r.Dividends)
                    .HasForeignKey(e => e.AuctionResultId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.ChitMember)
                    .WithMany(m => m.Dividends)
                    .HasForeignKey(e => e.ChitMemberId)
                    .OnDelete(DeleteBehavior.NoAction);
            });

            // PrizePayout
            modelBuilder.Entity<PrizePayout>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.AuctionResult)
                    .WithOne(r => r.Payout)
                    .HasForeignKey<PrizePayout>(e => e.AuctionResultId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}
