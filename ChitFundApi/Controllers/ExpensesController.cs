using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ChitFundApi.Data;
using ChitFundApi.Models;
using ChitFundApi.DTOs;
using ChitFundApi.Services;

namespace ChitFundApi.Controllers
{
    [ApiController]
    [Route("api/v1/expenses")]
    public class ExpensesController : ControllerBase
    {
        private readonly ChitFundDbContext _context;
        private readonly IAuditService _auditService;

        public ExpensesController(ChitFundDbContext context, IAuditService auditService)
        {
            _context = context;
            _auditService = auditService;
        }

        // GET: api/v1/expenses
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? category)
        {
            var query = _context.Expenses.AsQueryable();
            if (!string.IsNullOrWhiteSpace(category))
            {
                query = query.Where(e => e.Category.ToLower() == category.Trim().ToLower());
            }

            var list = await query.OrderByDescending(e => e.ExpenseDate).ToListAsync();
            return Ok(list);
        }

        // POST: api/v1/expenses
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] ExpenseCreateRequest req)
        {
            if (req.Amount <= 0)
            {
                return BadRequest(ApiResponse<string>.Fail("Amount must be greater than 0."));
            }
            if (string.IsNullOrWhiteSpace(req.Description))
            {
                return BadRequest(ApiResponse<string>.Fail("Expense description is required."));
            }

            var expense = new Expense
            {
                Category = string.IsNullOrWhiteSpace(req.Category) ? "General" : req.Category.Trim(),
                Description = req.Description.Trim(),
                Amount = req.Amount,
                ExpenseDate = req.ExpenseDate != default ? req.ExpenseDate.Date : DateTime.UtcNow.Date,
                Status = "Approved",
                CreatedAt = DateTime.UtcNow
            };

            _context.Expenses.Add(expense);
            await _context.SaveChangesAsync();

            await _auditService.LogAsync(1, "CREATE_EXPENSE", "Expense", expense.Id.ToString(), $"Recorded expense ₹{expense.Amount:N2} ({expense.Category})");

            return Ok(expense);
        }

        // DELETE: api/v1/expenses/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var expense = await _context.Expenses.FindAsync(id);
            if (expense == null) return NotFound(ApiResponse<string>.Fail("Expense not found."));

            _context.Expenses.Remove(expense);
            await _context.SaveChangesAsync();
            await _auditService.LogAsync(1, "DELETE_EXPENSE", "Expense", id.ToString());

            return Ok(ApiResponse<string>.Ok("Expense deleted successfully."));
        }
    }
}
