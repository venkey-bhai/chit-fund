using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ChitFundApi.Data;
using ChitFundApi.DTOs;
using ChitFundApi.Services;

namespace ChitFundApi.Controllers
{
    public class SendCustomMessageRequest
    {
        public List<int> CustomerIds { get; set; } = new();
        public bool AllActive { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    [ApiController]
    [Authorize]
    [Route("api/v1/notifications")]
    public class NotificationsController : ControllerBase
    {
        private readonly ChitFundDbContext _context;
        private readonly INotificationService _notifications;
        private readonly IAuditService _auditService;

        public NotificationsController(ChitFundDbContext context, INotificationService notifications, IAuditService auditService)
        {
            _context = context;
            _notifications = notifications;
            _auditService = auditService;
        }

        // GET: api/v1/notifications (most recent sent messages)
        [HttpGet]
        public async Task<IActionResult> GetRecent([FromQuery] int take = 100)
        {
            var list = await _context.Notifications
                .Include(n => n.Customer)
                .OrderByDescending(n => n.CreatedAt)
                .Take(Math.Clamp(take, 1, 500))
                .Select(n => new
                {
                    n.Id,
                    n.CustomerId,
                    CustomerName = n.Customer != null ? n.Customer.FullName : "—",
                    n.NotificationType,
                    n.Channel,
                    n.DeliveryStatus,
                    n.Message,
                    n.CreatedAt
                })
                .ToListAsync();
            return Ok(list);
        }

        // POST: api/v1/notifications/send (custom message to chosen customers)
        [HttpPost("send")]
        public async Task<IActionResult> SendCustom([FromBody] SendCustomMessageRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Message))
                return BadRequest(ApiResponse<string>.Fail("Message is required."));
            if (req.Message.Length > 1000)
                return BadRequest(ApiResponse<string>.Fail("Message is too long (max 1000 characters)."));

            var query = _context.Customers.Where(c => c.Status == "Active");
            if (!req.AllActive)
            {
                if (req.CustomerIds.Count == 0)
                    return BadRequest(ApiResponse<string>.Fail("Select at least one customer."));
                query = query.Where(c => req.CustomerIds.Contains(c.Id));
            }
            var customers = await query.ToListAsync();
            if (customers.Count == 0)
                return BadRequest(ApiResponse<string>.Fail("No active customers found."));

            int delivered = 0, failed = 0;
            var errors = new List<string>();
            foreach (var c in customers)
            {
                var outcomes = await _notifications.SendAsync(_context, c, "Custom", req.Message.Trim());
                if (outcomes.Any(o => o.Success)) delivered++;
                else
                {
                    failed++;
                    var err = outcomes.FirstOrDefault(o => !o.Success)?.Error;
                    if (err != null && !errors.Contains(err)) errors.Add(err);
                }
            }

            await _auditService.LogAsync(1, "SEND_MESSAGE", "Notification", "custom", $"Sent to {delivered} customer(s), {failed} failed");

            var result = new { total = customers.Count, delivered, failed, errors };
            return failed == customers.Count
                ? BadRequest(ApiResponse<object>.Fail(errors.FirstOrDefault() ?? "Message could not be sent.", errors))
                : Ok(ApiResponse<object>.Ok(result, $"Sent to {delivered} of {customers.Count} customer(s)."));
        }

        // POST: api/v1/notifications/send-reminders (run the due-date reminders now)
        [HttpPost("send-reminders")]
        public async Task<IActionResult> SendRemindersNow()
        {
            int n = await _notifications.SendDueRemindersAsync();
            return Ok(ApiResponse<int>.Ok(n, $"Reminders sent to {n} customer(s)."));
        }
    }
}
