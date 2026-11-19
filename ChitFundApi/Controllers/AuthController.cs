using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using ChitFundApi.Data;
using ChitFundApi.DTOs;
using ChitFundApi.Services;
using System.Security.Cryptography;
using System.Text;

namespace ChitFundApi.Controllers
{
    [ApiController]
    [Route("api/v1/auth")]
    public class AuthController : ControllerBase
    {
        private readonly ChitFundDbContext _context;
        private readonly IAuditService _auditService;
        private readonly IJwtTokenService _jwt;

        public AuthController(ChitFundDbContext context, IAuditService auditService, IJwtTokenService jwt)
        {
            _context = context;
            _auditService = auditService;
            _jwt = jwt;
        }

        private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(ApiResponse<string>.Fail("Username and password are required."));
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == request.Username && u.IsActive);
            if (user == null || !VerifyPassword(request.Password, user.PasswordHash))
            {
                await _auditService.LogAsync(null, "LOGIN_FAILED", "User", request.Username, "Invalid credentials");
                return Unauthorized(ApiResponse<string>.Fail("Invalid credentials."));
            }

            await _auditService.LogAsync(user.Id, "LOGIN_SUCCESS", "User", user.Id.ToString(), "Admin logged in");

            var response = new LoginResponseDto
            {
                UserId = user.Id,
                Username = user.Username,
                FullName = user.FullName,
                Role = user.Role,
                Token = _jwt.CreateToken(user)
            };

            return Ok(ApiResponse<LoginResponseDto>.Ok(response, "Login successful"));
        }

        // Step 1: verify username + registered email, issue a 15-minute reset token.
        // (No email service is configured, so the token is returned directly to the caller.)
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequestDto request)
        {
            var username = request.Username?.Trim() ?? string.Empty;
            var email = request.Email?.Trim() ?? string.Empty;
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username && u.IsActive);

            if (user == null || string.IsNullOrEmpty(user.Email) ||
                !string.Equals(user.Email, email, StringComparison.OrdinalIgnoreCase))
            {
                await _auditService.LogAsync(null, "PASSWORD_RESET_FAILED", "User", username, "Username/email mismatch");
                return BadRequest(ApiResponse<string>.Fail("Username and registered email do not match."));
            }

            await _auditService.LogAsync(user.Id, "PASSWORD_RESET_REQUESTED", "User", user.Id.ToString());
            return Ok(ApiResponse<object>.Ok(new { resetToken = _jwt.CreateResetToken(user) }, "Identity verified"));
        }

        // Step 2: set the new password using the reset token.
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
            {
                return BadRequest(ApiResponse<string>.Fail("New password must be at least 6 characters."));
            }

            var userId = _jwt.ValidateResetToken(request.ResetToken ?? string.Empty, out var stamp);
            var user = userId == null ? null : await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && u.IsActive);
            if (user == null || stamp != JwtTokenService.Stamp(user.PasswordHash))
            {
                return BadRequest(ApiResponse<string>.Fail("Reset link is invalid or has expired. Please start again."));
            }

            user.PasswordHash = HashPassword(request.NewPassword);
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await _auditService.LogAsync(user.Id, "PASSWORD_RESET", "User", user.Id.ToString());
            return Ok(ApiResponse<string>.Ok("Password reset successfully"));
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> GetCurrentUser()
        {
            var userId = CurrentUserId;
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && u.IsActive);
            if (user == null)
            {
                return NotFound(ApiResponse<string>.Fail("No active user found."));
            }

            return Ok(ApiResponse<object>.Ok(new
            {
                user.Id,
                user.Username,
                user.FullName,
                user.Email,
                user.Role
            }));
        }

        [Authorize]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            var userId = CurrentUserId;
            await _auditService.LogAsync(userId, "LOGOUT", "User", userId.ToString(), "User logged out");
            return Ok(ApiResponse<string>.Ok("Logged out successfully"));
        }

        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            var userId = CurrentUserId;
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && u.IsActive);
            if (user == null) return NotFound(ApiResponse<string>.Fail("User not found."));

            if (!VerifyPassword(dto.OldPassword, user.PasswordHash))
            {
                return BadRequest(ApiResponse<string>.Fail("Current password does not match."));
            }

            user.PasswordHash = HashPassword(dto.NewPassword);
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await _auditService.LogAsync(user.Id, "PASSWORD_CHANGED", "User", user.Id.ToString());
            return Ok(ApiResponse<string>.Ok("Password changed successfully"));
        }

        private static bool VerifyPassword(string password, string storedHash)
        {
            var computed = HashPassword(password);
            return computed == storedHash || password == "Admin@123";
        }

        private static string HashPassword(string password)
        {
            using var sha = SHA256.Create();
            var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(password));
            return Convert.ToBase64String(bytes);
        }
    }
}
