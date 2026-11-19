using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ChitFundApi.Data;
using ChitFundApi.Models;
using ChitFundApi.DTOs;
using ChitFundApi.Services;

namespace ChitFundApi.Controllers
{
    [ApiController]
    [Route("api/v1/settings")]
    public class SettingsController : ControllerBase
    {
        private readonly ChitFundDbContext _context;
        private readonly IAuditService _auditService;

        public SettingsController(ChitFundDbContext context, IAuditService auditService)
        {
            _context = context;
            _auditService = auditService;
        }

        // GET: api/v1/settings/company
        [HttpGet("company")]
        public async Task<IActionResult> GetCompanySettings()
        {
            var setting = await _context.CompanySettings.FirstOrDefaultAsync();
            if (setting == null)
            {
                setting = new CompanySetting
                {
                    CompanyName = "ChitPro Financial Services Ltd.",
                    Address = "100, Finance Hub, Anna Salai, Chennai, Tamil Nadu 600002",
                    Phone = "+91 98450 12345",
                    Email = "support@chitpro.com",
                    CurrencyCode = "INR",
                    FinancialYearStart = new DateTime(2026, 4, 1),
                    ReceiptPrefix = "REC"
                };
                _context.CompanySettings.Add(setting);
                await _context.SaveChangesAsync();
            }

            return Ok(setting);
        }

        // PUT: api/v1/settings/company
        [HttpPut("company")]
        public async Task<IActionResult> UpdateCompanySettings([FromBody] CompanySettingsUpdateDto dto)
        {
            var setting = await _context.CompanySettings.FirstOrDefaultAsync();
            if (setting == null)
            {
                setting = new CompanySetting();
                _context.CompanySettings.Add(setting);
            }

            setting.CompanyName = dto.CompanyName.Trim();
            setting.Address = dto.Address?.Trim();
            setting.Phone = dto.Phone?.Trim();
            setting.Email = dto.Email?.Trim();
            setting.CurrencyCode = string.IsNullOrWhiteSpace(dto.CurrencyCode) ? "INR" : dto.CurrencyCode.Trim();
            setting.FinancialYearStart = dto.FinancialYearStart;
            setting.ReceiptPrefix = string.IsNullOrWhiteSpace(dto.ReceiptPrefix) ? "REC" : dto.ReceiptPrefix.Trim();
            setting.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            await _auditService.LogAsync(1, "UPDATE_COMPANY_SETTINGS", "CompanySetting", setting.Id.ToString(), "Updated company details");

            return Ok(setting);
        }
    }
}
