using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ChitFundApi.Data;

namespace ChitFundApi.Controllers
{
    [ApiController]
    [Route("api/v1/audit-logs")]
    public class AuditLogsController : ControllerBase
    {
        private readonly ChitFundDbContext _context;

        public AuditLogsController(ChitFundDbContext context)
        {
            _context = context;
        }

        // GET: api/v1/audit-logs
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? action, [FromQuery] string? entityType)
        {
            var query = _context.AuditLogs.AsQueryable();

            if (!string.IsNullOrWhiteSpace(action))
            {
                query = query.Where(a => a.Action.ToLower().Contains(action.Trim().ToLower()));
            }

            if (!string.IsNullOrWhiteSpace(entityType))
            {
                query = query.Where(a => a.EntityType.ToLower() == entityType.Trim().ToLower());
            }

            var logs = await query
                .OrderByDescending(a => a.CreatedAt)
                .Take(50)
                .ToListAsync();

            return Ok(logs);
        }
    }
}
