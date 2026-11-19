using System;
using System.Threading.Tasks;
using ChitFundApi.Data;
using ChitFundApi.Models;

namespace ChitFundApi.Services
{
    public interface IAuditService
    {
        Task LogAsync(int? userId, string action, string entityType, string entityId, string? reason = null, string? beforeData = null, string? afterData = null);
    }

    public class AuditService : IAuditService
    {
        private readonly ChitFundDbContext _context;

        public AuditService(ChitFundDbContext context)
        {
            _context = context;
        }

        public async Task LogAsync(int? userId, string action, string entityType, string entityId, string? reason = null, string? beforeData = null, string? afterData = null)
        {
            try
            {
                var auditLog = new AuditLog
                {
                    UserId = userId,
                    Action = action,
                    EntityType = entityType,
                    EntityId = entityId,
                    Reason = reason,
                    BeforeData = beforeData,
                    AfterData = afterData,
                    CreatedAt = DateTime.UtcNow
                };

                _context.AuditLogs.Add(auditLog);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AuditService Warning] Failed to log audit record: {ex.Message}");
            }
        }
    }
}
