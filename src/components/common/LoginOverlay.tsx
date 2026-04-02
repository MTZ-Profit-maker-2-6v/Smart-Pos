import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserCog, UserCircle2 } from 'lucide-react';

interface LoginOverlayProps {
  onClose?: () => void;
}

export default function LoginOverlay({ onClose }: LoginOverlayProps) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'admin' | 'staff'>('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  const withTimeout = async <T,>(p: Promise<T>, ms = 15000): Promise<T> => {
    let timer: any;
    const timeout = new Promise<never>((_, rej) => {
      timer = setTimeout(() => rej(new Error('Request timed out. Please try again.')), ms);
    });
    try {
      return (await Promise.race([p, timeout])) as T;
    } finally {
      clearTimeout(timer);
    }
  };

  const submitLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // Staff login is separate from Supabase Auth (admins)
      if (mode === 'staff') {
        const cleanEmail = email.trim();
        const cleanPin = pin.trim();

        if (!cleanEmail) {
          setError('Enter your staff email.');
          return;
        }
        if (!/^\d{4}$/.test(cleanPin)) {
          setError('Enter your 4-digit PIN.');
          return;
        }

        const res = await withTimeout(auth.staffLogin(cleanEmail, cleanPin), 20000);
        if (!res.ok) {
          setError(
            res.message ||
              'Your details did not match any brand staff. Ensure you belong to a brand and your admin has added you.'
          );
          return;
        }

        const role = res.role;
        if (role === 'kitchen_staff') {
          navigate('/app/pos/kitchen');
          return;
        }

        if (role === 'cashier') {
          navigate('/app/pos');
          return;
        }

        navigate('/app/pos/terminal');
        return;
      }

      if (isSignup) {
        // validate password before calling signup
        const errs = validatePassword(password);
        setPasswordErrors(errs);
        if (errs.length > 0) {
          setError('Please fix password requirements');
          return;
        }
        const res = await withTimeout(
          auth.signUp({ email: email.trim(), password, displayName: displayName || undefined }),
          20000
        );
        if (res.ok) {
          // If we were able to auto-sign-in on the backend, proceed into the app.
          if ((res as any).autoSignedIn) {
            navigate('/app');
            return;
          }

          // Show success feedback and switch to login form so user can sign in.
          setShowSuccess(true);
          setIsSignup(false);
          setError(null);
        } else if (res.needsConfirmation) {
          setError(res.message || 'Please check your email to confirm your account.');
        } else {
          setError(res.message || 'Sign up failed');
        }
      } else {
        const ok = await withTimeout(auth.login(email.trim(), password), 20000);
        if (ok) {
          navigate('/app');
        } else {
          setError('Invalid credentials');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  const validatePassword = (pwd: string) => {
    const problems: string[] = [];
    if (pwd.length < 8) problems.push('At least 8 characters');
    if (!/[a-z]/.test(pwd)) problems.push('At least one lowercase letter');
    if (!/[A-Z]/.test(pwd)) problems.push('At least one uppercase letter');
    if (!/[0-9]/.test(pwd)) problems.push('At least one number');
    if (!/[!@#$%^&*(),.?"':{}|<>]/.test(pwd)) problems.push('At least one special character');
    return problems;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md neon-snake-border">
        <svg className="neon-snake-svg absolute inset-0 h-full w-full pointer-events-none" viewBox="0 0 400 420" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="neon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,180,0,0.95)" />
              <stop offset="45%" stopColor="rgba(255,90,10,0.95)" />
              <stop offset="100%" stopColor="rgba(255,170,60,0.95)" />
            </linearGradient>
          </defs>
          <rect
            x="4"
            y="4"
            width="392"
            height="412"
            rx="24"
            ry="24"
            fill="none"
            stroke="url(#neon-gradient)"
            strokeWidth="4"
            className="neon-snake-rect"
          />
        </svg>

        <div className="relative z-10 rounded-3xl border border-orange-600/40 bg-black/80 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.75)]">
        {onClose && (
          <button
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-gray-100 transition hover:bg-white/20"
            onClick={onClose}
            aria-label="Close login"
          >
            ✕
          </button>
        )}
        <form onSubmit={submitLogin} className="space-y-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Smart POS Access</h2>
                <p className="text-xs text-orange-200">
                  {mode === 'admin'
                    ? 'Owner/manager access for menu, pricing, and shift control.'
                    : 'Staff use email + PIN for quick till operations.'}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-3 py-1 text-[11px] font-medium text-orange-100">
                {mode === 'admin' ? <UserCog className="h-3.5 w-3.5" /> : <UserCircle2 className="h-3.5 w-3.5" />}
                {mode === 'admin' ? 'Admin mode' : 'Staff mode'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <button
                type="button"
                onClick={() => {
                  setMode('admin');
                  setError(null);
                }}
                disabled={busy}
                className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 font-medium transition-colors ${
                  mode === 'admin'
                    ? 'bg-orange-500 text-black border-orange-400 shadow-lg'
                    : 'bg-[#111] text-orange-300 border-orange-500/30 hover:bg-[#222]'
                }`}
              >
                <UserCog className="h-4 w-4" />
                Admin Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('staff');
                  setIsSignup(false);
                  setPassword('');
                  setPasswordErrors([]);
                  setDisplayName('');
                  setError(null);
                }}
                disabled={busy}
                className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 font-medium transition-colors ${
                  mode === 'staff'
                    ? 'bg-orange-500 text-black border-orange-400 shadow-lg'
                    : 'bg-[#111] text-orange-300 border-orange-500/30 hover:bg-[#222]'
                }`}
              >
                <UserCircle2 className="h-4 w-4" />
                Staff POS Login
              </button>
            </div>

            {mode === 'staff' && (
              <div className="rounded-lg border bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                Use the staff email and 4-digit PIN set by your admin. If your details don’t match, ask the admin to add you to their brand.
              </div>
            )}
            <div className="pt-1 text-xs font-medium tracking-wide text-slate-500 uppercase">
              {mode === 'admin' ? 'Admin email & password' : 'Staff email & 4‑digit PIN'}
            </div>
            <div>
            {/* Simple success modal shown when account is created but not auto-logged-in */}
            {showSuccess && (
              <div className="fixed inset-0 flex items-center justify-center z-[60]">
                <div className="absolute inset-0 bg-black/40" onClick={() => setShowSuccess(false)} />
                <div className="relative bg-white rounded-lg p-6 shadow-lg max-w-sm text-center">
                  <h3 className="text-lg font-semibold mb-2">Account created</h3>
                  <p className="mb-4">Your account was created successfully. Please sign in.</p>
                  <div className="flex justify-center">
                    <button type="button" className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-700 text-black font-semibold rounded-md shadow-lg" onClick={() => setShowSuccess(false)}>OK</button>
                  </div>
                </div>
              </div>
            )}
              {isSignup && (
                <div>
                  <label className="block text-sm font-medium mb-1">Full name</label>
                  <input
                    type="text"
                    required
                    className="w-full border rounded px-3 py-2"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              )}
              <label className="block text-sm font-medium mb-1 text-orange-200">Email</label>
              <input
                type="email"
                required
                className="w-full border border-orange-500/40 bg-[#111] text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {mode === 'admin' ? (
              <div>
                <label className="block text-sm font-medium mb-1 text-orange-200">Password</label>
                <input
                  type="password"
                  required
                  className="w-full border border-orange-500/40 bg-[#111] text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (isSignup) setPasswordErrors(validatePassword(e.target.value));
                  }}
                />
                {isSignup && password && (
                  <div className="mt-2 text-sm">
                    {passwordErrors.length === 0 ? (
                      <div className="text-green-600">Password looks good</div>
                    ) : (
                      <ul className="text-red-600 list-disc list-inside">
                        {passwordErrors.map((p) => <li key={p}>{p}</li>)}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-1 text-orange-200">PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  required
                  className="w-full border border-orange-500/40 bg-[#111] text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={pin}
                  onChange={(e) => {
                    const next = (e.target.value ?? '').replace(/\D/g, '').slice(0, 4);
                    setPin(next);
                  }}
                  placeholder="4 digits"
                />
              </div>
            )}
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={busy || (isSignup && passwordErrors.length > 0)}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-700 text-black font-semibold rounded-md shadow-lg hover:brightness-110 disabled:opacity-50"
              >
                {busy
                  ? (mode === 'admin' ? (isSignup ? 'Creating…' : 'Signing…') : 'Signing…')
                  : (mode === 'admin' ? (isSignup ? 'Create account' : 'Sign in') : 'Sign in')}
              </button>
            </div>
            <div className="mt-3 text-sm text-center">
              {mode === 'admin' && isSignup ? (
                <>
                  <span>Already have an account? </span>
                  <button type="button" onClick={() => setIsSignup(false)} className="text-orange-300 underline">Sign in</button>
                </>
              ) : mode === 'admin' ? (
                <>
                  <span>Need an account? </span>
                  <button type="button" onClick={() => setIsSignup(true)} className="text-orange-300 underline">Create one</button>
                </>
              ) : (
                <>
                  <span className="text-gray-600">Staff can’t create accounts here. </span>
                  <span className="text-gray-600">Ask your admin to add you.</span>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
