using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using ChitFundApi.Data;
using ChitFundApi.Models;

namespace ChitFundApi.Services
{
    // Bound from the "Twilio" section of appsettings.json
    public class TwilioOptions
    {
        public bool Enabled { get; set; } = false;
        public string AccountSid { get; set; } = string.Empty;
        public string AuthToken { get; set; } = string.Empty;
        public string SmsFrom { get; set; } = string.Empty;        // e.g. +15551234567
        public string WhatsAppFrom { get; set; } = string.Empty;   // e.g. +14155238886 (sandbox) or your approved number
        public bool SendSms { get; set; } = true;
        public bool SendWhatsApp { get; set; } = true;
        public string DefaultCountryCode { get; set; } = "+91";
        public int ReminderDaysBefore { get; set; } = 2;           // remind this many days before due date
        public int ReminderHour { get; set; } = 9;                 // local server hour (0-23) for the daily reminder run
    }

    public record SendOutcome(string Channel, bool Success, string? Error);

    public interface INotificationService
    {
        Task<List<SendOutcome>> SendAsync(ChitFundDbContext db, Customer customer, string type, string message);
        void QueuePaymentReceipt(long paymentId);
        void QueueAuctionResult(int auctionId);
        Task<int> SendDueRemindersAsync();
    }

    public class NotificationService : INotificationService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IHttpClientFactory _http;
        private readonly TwilioOptions _opt;
        private readonly ILogger<NotificationService> _log;

        public NotificationService(IServiceScopeFactory scopeFactory, IHttpClientFactory http,
            IOptions<TwilioOptions> opt, ILogger<NotificationService> log)
        {
            _scopeFactory = scopeFactory;
            _http = http;
            _opt = opt.Value;
            _log = log;
        }

        // ---------- Core sending ----------

        public async Task<List<SendOutcome>> SendAsync(ChitFundDbContext db, Customer customer, string type, string message)
        {
            var outcomes = new List<SendOutcome>();
            var phone = NormalizePhone(customer.Mobile);

            if (!_opt.Enabled)
            {
                outcomes.Add(new SendOutcome("All", false, "Messaging is turned off. Set Twilio:Enabled to true in appsettings.json."));
                return outcomes;
            }
            if (string.IsNullOrWhiteSpace(_opt.AccountSid) || string.IsNullOrWhiteSpace(_opt.AuthToken))
            {
                outcomes.Add(new SendOutcome("All", false, "Twilio Account SID / Auth Token are missing. Add them under \"Twilio\" in appsettings.json and restart the API."));
                return outcomes;
            }
            if (phone == null)
            {
                outcomes.Add(new SendOutcome("All", false, $"Invalid mobile number for {customer.FullName}."));
                return outcomes;
            }

            if (_opt.SendSms && !string.IsNullOrWhiteSpace(_opt.SmsFrom))
                outcomes.Add(await SendOneAsync(db, customer, type, message, "SMS", phone, _opt.SmsFrom));
            if (_opt.SendWhatsApp && !string.IsNullOrWhiteSpace(_opt.WhatsAppFrom))
                outcomes.Add(await SendOneAsync(db, customer, type, message, "WhatsApp", $"whatsapp:{phone}", $"whatsapp:{_opt.WhatsAppFrom}"));

            if (outcomes.Count == 0)
                outcomes.Add(new SendOutcome("All", false, "No channel configured. Set Twilio:SmsFrom and/or Twilio:WhatsAppFrom."));
            return outcomes;
        }

        private async Task<SendOutcome> SendOneAsync(ChitFundDbContext db, Customer customer, string type, string message,
            string channel, string to, string from)
        {
            string? error = null;
            try
            {
                var client = _http.CreateClient();
                var req = new HttpRequestMessage(HttpMethod.Post,
                    $"https://api.twilio.com/2010-04-01/Accounts/{_opt.AccountSid}/Messages.json")
                {
                    Content = new FormUrlEncodedContent(new Dictionary<string, string>
                    {
                        ["To"] = to,
                        ["From"] = from,
                        ["Body"] = message
                    })
                };
                req.Headers.Authorization = new AuthenticationHeaderValue("Basic",
                    Convert.ToBase64String(Encoding.ASCII.GetBytes($"{_opt.AccountSid}:{_opt.AuthToken}")));

                var res = await client.SendAsync(req);
                if (!res.IsSuccessStatusCode)
                {
                    var body = await res.Content.ReadAsStringAsync();
                    error = ExtractTwilioError(body) ?? $"Twilio returned {(int)res.StatusCode}.";
                }
            }
            catch (Exception ex)
            {
                error = ex.Message;
            }

            if (error != null) _log.LogWarning("{Channel} to {Customer} failed: {Error}", channel, customer.FullName, error);

            try
            {
                db.Notifications.Add(new Notification
                {
                    CustomerId = customer.Id,
                    NotificationType = type,
                    Message = message,
                    Channel = channel,
                    DeliveryStatus = error == null ? "Sent" : "Failed",
                    CreatedAt = DateTime.UtcNow,
                    SentAt = error == null ? DateTime.UtcNow : null
                });
                await db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _log.LogWarning(ex, "Could not save notification log.");
            }

            return new SendOutcome(channel, error == null, error);
        }

        private static string? ExtractTwilioError(string body)
        {
            try
            {
                using var doc = JsonDocument.Parse(body);
                return doc.RootElement.TryGetProperty("message", out var m) ? m.GetString() : null;
            }
            catch { return null; }
        }

        // Accepts 10 digit numbers, 91XXXXXXXXXX, or full +CCXXXXXXXX
        private string? NormalizePhone(string? mobile)
        {
            if (string.IsNullOrWhiteSpace(mobile)) return null;
            var digits = new string(mobile.Where(char.IsDigit).ToArray());
            if (mobile.TrimStart().StartsWith("+") && digits.Length >= 8) return "+" + digits;
            if (digits.Length == 10) return _opt.DefaultCountryCode + digits;
            var cc = _opt.DefaultCountryCode.TrimStart('+');
            if (digits.Length == 12 && digits.StartsWith(cc)) return "+" + digits;
            return null;
        }

        // ---------- Automatic messages (run in the background so requests stay fast) ----------

        public void QueuePaymentReceipt(long paymentId)
        {
            if (!_opt.Enabled) return;
            _ = Task.Run(async () =>
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<ChitFundDbContext>();
                    var p = await db.Payments.Include(x => x.ChitGroup).Include(x => x.Customer)
                        .FirstOrDefaultAsync(x => x.Id == paymentId);
                    if (p?.Customer == null) return;

                    var company = await CompanyNameAsync(db);
                    var msg = $"{company}: Dear {p.Customer.FullName}, we received your payment of Rs.{p.Amount:N2} " +
                              $"for {p.ChitGroup?.GroupName ?? "your chit"} on {p.CollectionDate:dd-MMM-yyyy}. " +
                              $"Receipt No: {p.ReceiptNumber}. Thank you.";
                    await SendAsync(db, p.Customer, "PaymentReceipt", msg);
                }
                catch (Exception ex) { _log.LogError(ex, "Payment receipt notification failed."); }
            });
        }

        public void QueueAuctionResult(int auctionId)
        {
            if (!_opt.Enabled) return;
            _ = Task.Run(async () =>
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<ChitFundDbContext>();
                    var auction = await db.Auctions
                        .Include(a => a.Result)
                        .Include(a => a.ChitGroup).ThenInclude(g => g!.Members).ThenInclude(m => m.Customer)
                        .FirstOrDefaultAsync(a => a.Id == auctionId);
                    var group = auction?.ChitGroup;
                    if (auction?.Result == null || group == null) return;

                    var winners = group.Members
                        .Where(m => m.HasPrized && m.PrizedMonthNumber == auction.AuctionNumber)
                        .Select(m => m.Customer?.FullName).Where(n => n != null).ToList();
                    decimal divPerMember = group.TotalMembers > 0
                        ? Math.Round(auction.Result.DistributableDividend / group.TotalMembers, 2) : 0;
                    decimal payable = Math.Round(group.MonthlySubscription - divPerMember, 2);
                    var company = await CompanyNameAsync(db);

                    foreach (var member in group.Members.Where(m => m.Customer != null && m.Customer.Status == "Active"))
                    {
                        var msg = $"{company}: {group.GroupName} - Month {auction.AuctionNumber} auction completed. " +
                                  $"Winner: {(winners.Count > 0 ? string.Join(", ", winners) : "Company")}. " +
                                  $"Bid discount Rs.{auction.Result.DiscountAmount:N2}, your dividend Rs.{divPerMember:N2}. " +
                                  $"Amount you pay for this month: Rs.{payable:N2}.";
                        await SendAsync(db, member.Customer!, "AuctionResult", msg);
                    }
                }
                catch (Exception ex) { _log.LogError(ex, "Auction result notification failed."); }
            });
        }

        // Returns how many customers were reminded. Called daily by DueReminderService.
        public async Task<int> SendDueRemindersAsync()
        {
            if (!_opt.Enabled) return 0;
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ChitFundDbContext>();

            var today = DateTime.Now.Date;
            var horizon = today.AddDays(_opt.ReminderDaysBefore);
            var company = await CompanyNameAsync(db);

            var pending = await db.Installments
                .Include(i => i.ChitMember).ThenInclude(m => m!.Customer)
                .Include(i => i.ChitMember).ThenInclude(m => m!.ChitGroup)
                .Where(i => i.Status != "Paid" && i.DueDate <= horizon && i.ChitMember != null && i.ChitMember.Customer != null)
                .ToListAsync();

            int sent = 0;
            var recentCutoff = DateTime.UtcNow.AddDays(-3);
            foreach (var i in pending)
            {
                var customer = i.ChitMember!.Customer!;
                if (customer.Status != "Active") continue;
                decimal outstanding = i.NetPayableAmount - i.PaidAmount;
                if (outstanding <= 0) continue;

                bool overdue = i.DueDate.Date < today;
                var scheme = i.ChitMember.ChitGroup?.GroupName ?? "your chit";
                var msg = overdue
                    ? $"{company}: Dear {customer.FullName}, your installment #{i.InstallmentNumber} for {scheme} of Rs.{outstanding:N2} was due on {i.DueDate:dd-MMM-yyyy} and is overdue. Please pay as soon as possible."
                    : $"{company}: Dear {customer.FullName}, reminder: installment #{i.InstallmentNumber} for {scheme} of Rs.{outstanding:N2} is due on {i.DueDate:dd-MMM-yyyy}. Please pay on time.";

                // Don't repeat the same reminder more than once every 3 days
                bool already = await db.Notifications.AnyAsync(n =>
                    n.CustomerId == customer.Id && n.NotificationType == "DueReminder" &&
                    n.Message == msg && n.CreatedAt >= recentCutoff);
                if (already) continue;

                var outcomes = await SendAsync(db, customer, "DueReminder", msg);
                if (outcomes.Any(o => o.Success)) sent++;
            }
            return sent;
        }

        private static async Task<string> CompanyNameAsync(ChitFundDbContext db)
        {
            var s = await db.Set<CompanySetting>().FirstOrDefaultAsync();
            return s?.CompanyName ?? "ChitPro";
        }
    }

    // Runs once a day at Twilio:ReminderHour and sends due / overdue installment reminders
    public class DueReminderService : BackgroundService
    {
        private readonly INotificationService _notifications;
        private readonly TwilioOptions _opt;
        private readonly ILogger<DueReminderService> _log;

        public DueReminderService(INotificationService notifications, IOptions<TwilioOptions> opt, ILogger<DueReminderService> log)
        {
            _notifications = notifications;
            _opt = opt.Value;
            _log = log;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                var now = DateTime.Now;
                var next = now.Date.AddHours(_opt.ReminderHour);
                if (next <= now) next = next.AddDays(1);
                try { await Task.Delay(next - now, stoppingToken); }
                catch (TaskCanceledException) { break; }

                try
                {
                    int n = await _notifications.SendDueRemindersAsync();
                    _log.LogInformation("Due reminders sent to {Count} customer(s).", n);
                }
                catch (Exception ex) { _log.LogError(ex, "Due reminder run failed."); }
            }
        }
    }
}
