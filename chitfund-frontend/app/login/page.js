'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, Mail, LogIn, Eye, EyeOff } from 'lucide-react';
import { login, forgotPassword, resetPassword } from '@/lib/api';
import { saveSession } from '@/lib/auth';

const inputWrap =
  'mt-1 flex items-center gap-2 border border-slate-300 rounded-md px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500';
const inputCls = 'w-full text-sm outline-none bg-transparent';
const btnCls =
  'w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold py-2 rounded-md transition-colors';

function PasswordInput({ value, onChange, autoComplete, show, onToggle }) {
  return (
    <div className={inputWrap}>
      <Lock className="w-3.5 h-3.5 text-slate-500" />
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required
        className={inputCls}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="text-slate-500 hover:text-slate-800"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  // 'login' | 'forgot' | 'reset'
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  function switchMode(next) {
    setMode(next);
    setError('');
    setShowPassword(false);
    setShowNew(false);
  }

  async function run(fn) {
    setError('');
    setLoading(true);
    try {
      await fn();
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const handleLogin = (e) => {
    e.preventDefault();
    run(async () => {
      const data = await login({ username: username.trim(), password });
      saveSession(data);
      router.replace('/');
    });
  };

  const handleForgot = (e) => {
    e.preventDefault();
    run(async () => {
      const data = await forgotPassword({ username: username.trim(), email: email.trim() });
      setResetToken(data.resetToken);
      setSuccess('');
      switchMode('reset');
    });
  };

  const handleReset = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    run(async () => {
      await resetPassword({ resetToken, newPassword });
      setResetToken('');
      setNewPassword('');
      setConfirmPassword('');
      setPassword('');
      setSuccess('Password reset successfully. Please sign in with your new password.');
      switchMode('login');
    });
  };

  const titles = { login: 'Admin Login', forgot: 'Forgot Password', reset: 'Set New Password' };
  const onSubmit = { login: handleLogin, forgot: handleForgot, reset: handleReset }[mode];

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4"
      >
        <div className="text-center">
          <h1 className="text-lg font-extrabold text-slate-900">ChitPro</h1>
          <p className="text-xs text-slate-600">{titles[mode]}</p>
        </div>

        {error && (
          <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}
        {success && mode === 'login' && (
          <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
            {success}
          </div>
        )}

        {mode !== 'reset' && (
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Username</span>
            <div className={inputWrap}>
              <User className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                autoFocus
                className={inputCls}
              />
            </div>
          </label>
        )}

        {mode === 'login' && (
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Password</span>
              
            </div>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              show={showPassword}
              onToggle={() => setShowPassword((v) => !v)}
            />

            <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="text-xs text-indigo-600 hover:underline"
              >
                Forgot password?
              </button>
          </div>
        )}

        {mode === 'forgot' && (
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Registered Email</span>
            <div className={inputWrap}>
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className={inputCls}
              />
            </div>
          </label>
        )}

        {mode === 'reset' && (
          <>
            <div>
              <span className="text-xs font-semibold text-slate-700">New Password</span>
              <PasswordInput
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                show={showNew}
                onToggle={() => setShowNew((v) => !v)}
              />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-700">Confirm Password</span>
              <PasswordInput
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                show={showNew}
                onToggle={() => setShowNew((v) => !v)}
              />
            </div>
          </>
        )}

        <button type="submit" disabled={loading} className={btnCls}>
          {mode === 'login' && <LogIn className="w-4 h-4" />}
          {mode === 'login' && (loading ? 'Signing in...' : 'Sign In')}
          {mode === 'forgot' && (loading ? 'Verifying...' : 'Verify & Continue')}
          {mode === 'reset' && (loading ? 'Saving...' : 'Reset Password')}
        </button>

        {mode !== 'login' && (
          <button
            type="button"
            onClick={() => switchMode('login')}
            className="w-full text-xs text-slate-600 hover:underline"
          >
            Back to login
          </button>
        )}
      </form>
    </div>
  );
}
