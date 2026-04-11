/**
 * AuthPage — Login + Register
 *
 * Single page with a toggle between Login and Register.
 * Matches the app's warm editorial design system:
 *   - DM Serif Display heading
 *   - surface-bg background with white card
 *   - brand indigo primary button
 *   - ring-1 ring-black/[0.03] shadow-sm card style
 *
 * On success, calls UserContext.login() and navigates to /trips.
 */

import { useState } from 'react';
import type { FC, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { apiService } from '../services/api';
import logoAsset from '../assets/tripMind_logo.png';

// ── SVG icons ─────────────────────────────────────────────────
const EyeIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

const MailIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
  </svg>
);

const LockIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const UserIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

// ── Shared input field ────────────────────────────────────────

interface InputFieldProps {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  icon: React.ReactNode;
  rightSlot?: React.ReactNode;
  autoComplete?: string;
  disabled?: boolean;
}

function InputField({
  label, type, value, onChange, placeholder, icon, rightSlot, autoComplete, disabled,
}: InputFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink mb-1.5">{label}</label>
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-tertiary pointer-events-none">
          {icon}
        </div>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          className="w-full pl-11 pr-11 py-3 bg-surface-bg border border-surface-muted rounded-xl text-sm text-ink placeholder-ink-tertiary focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent focus:bg-white disabled:opacity-60 transition-colors"
        />
        {rightSlot && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            {rightSlot}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────

type Mode = 'login' | 'register';

const AuthPage: FC = () => {
  const navigate = useNavigate();
  const { login } = useUser();

  const [mode, setMode] = useState<Mode>('login');

  // Form fields
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [fullName,  setFullName]  = useState('');
  const [showPass,  setShowPass]  = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setPassword('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setError(null);
    setIsLoading(true);

    try {
      let result;

      if (mode === 'register') {
        if (password.length < 8) {
          setError('Password must be at least 8 characters.');
          return;
        }
        if (!fullName.trim()) {
          setError('Please enter your name.');
          return;
        }
        result = await apiService.register({
          email: email.trim(),
          password,
          full_name: fullName.trim(),
        });
      } else {
        result = await apiService.login({
          email: email.trim(),
          password,
        });
      }

      // Save tokens and update context
      login(result.access_token, result.refresh_token, result.user);

      // Navigate to trips page
      navigate('/trips', { replace: true });
    } catch (err: unknown) {
      // Try to extract a useful error message from the API response
      const axiosError = err as { response?: { data?: { detail?: string } } };
      const detail = axiosError?.response?.data?.detail;

      if (detail) {
        setError(detail);
      } else if (mode === 'login') {
        setError('Invalid email or password. Please try again.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-bg flex flex-col items-center justify-center px-4 py-12">

      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-11 h-11 rounded-xl overflow-hidden">
          <img src={logoAsset} alt="TripMind" className="w-full h-full object-cover" />
        </div>
        <span className="font-display text-2xl text-ink font-semibold">TripMind</span>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl ring-1 ring-black/[0.05] shadow-modal w-full max-w-md p-8">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl text-ink mb-2">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-sm text-ink-secondary">
            {mode === 'login'
              ? 'Sign in to continue planning your trips'
              : 'Start planning your next adventure'}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex bg-surface-bg rounded-xl p-1 mb-7 ring-1 ring-surface-muted">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                mode === m
                  ? 'bg-white text-ink shadow-card ring-1 ring-black/[0.05]'
                  : 'text-ink-secondary hover:text-ink'
              }`}
            >
              {m === 'login' ? 'Log in' : 'Register'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Name — register only */}
          {mode === 'register' && (
            <InputField
              label="Full name"
              type="text"
              value={fullName}
              onChange={setFullName}
              placeholder="Your name"
              autoComplete="name"
              disabled={isLoading}
              icon={<UserIcon />}
            />
          )}

          {/* Email */}
          <InputField
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            autoComplete={mode === 'login' ? 'email' : 'email'}
            disabled={isLoading}
            icon={<MailIcon />}
          />

          {/* Password */}
          <InputField
            label="Password"
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={setPassword}
            placeholder={mode === 'register' ? 'Min. 8 characters' : 'Your password'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            disabled={isLoading}
            icon={<LockIcon />}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="text-ink-tertiary hover:text-ink transition-colors"
                tabIndex={-1}
              >
                {showPass ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            }
          />

          {/* Error */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className="w-full py-3 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 disabled:bg-brand-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {mode === 'login' ? 'Signing in...' : 'Creating account...'}
              </>
            ) : (
              mode === 'login' ? 'Sign in' : 'Create account'
            )}
          </button>
        </form>

        {/* Footer note */}
        <p className="text-center text-xs text-ink-tertiary mt-6">
          {mode === 'login'
            ? "Don't have an account? "
            : 'Already have an account? '}
          <button
            onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            className="text-brand-600 hover:text-brand-700 font-medium transition-colors"
          >
            {mode === 'login' ? 'Register' : 'Log in'}
          </button>
        </p>
      </div>

      {/* Decorative tagline */}
      <p className="text-xs text-ink-tertiary mt-6">
        Your next adventure is one conversation away.
      </p>
    </div>
  );
};

export default AuthPage;