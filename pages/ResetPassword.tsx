import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading, clearPasswordRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    return () => {
      clearPasswordRecovery();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long.' });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (error) {
      setMessage({ type: 'error', text: error.message || 'Could not update your password.' });
      return;
    }

    clearPasswordRecovery();
    setMessage({ type: 'success', text: 'Your password has been updated. You can continue into the app.' });
    setPassword('');
    setConfirmPassword('');
  };

  if (isLoading) {
    return (
      <section className="min-h-[calc(100vh-8rem)] bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-xl">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand-blue border-t-transparent"></div>
          <p className="mt-4 text-sm text-slate-500">Loading reset link...</p>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="min-h-[calc(100vh-8rem)] bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-xl">
          <div className="mx-auto inline-flex rounded-full bg-red-50 p-4 text-red-500">
            <AlertCircle size={28} />
          </div>
          <h1 className="mt-5 font-display text-3xl font-bold text-slate-800">Reset Link Unavailable</h1>
          <p className="mt-3 text-slate-500">
            This password reset link is invalid, expired, or has already been used.
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Request another password reset from the login form and use the newest email link.
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-6 rounded-xl bg-brand-blue px-6 py-3 font-bold text-white transition-colors hover:bg-sky-600"
          >
            Go Home
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-[calc(100vh-8rem)] bg-slate-50 px-4 py-16">
      <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 shadow-xl">
        <div className="text-center">
          <div className="inline-flex rounded-full bg-brand-yellow p-4 text-slate-900">
            <KeyRound size={28} />
          </div>
          <h1 className="mt-5 font-display text-3xl font-bold text-slate-800">Choose A New Password</h1>
          <p className="mt-3 text-slate-500">
            Enter a new password for <span className="font-semibold text-slate-700">{user.email}</span>.
          </p>
        </div>

        {message && (
          <div
            className={`mt-6 rounded-xl px-4 py-4 text-sm ${
              message.type === 'success'
                ? 'border border-emerald-100 bg-emerald-50 text-emerald-800'
                : 'border border-red-100 bg-red-50 text-red-600'
            }`}
          >
            <div className="flex items-start gap-2">
              {message.type === 'success' ? (
                <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-3 pr-10 outline-none focus:ring-2 focus:ring-brand-blue"
                placeholder="Minimum 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-3 pr-10 outline-none focus:ring-2 focus:ring-brand-blue"
                placeholder="Re-enter your new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full rounded-xl bg-brand-blue py-3 font-bold text-white transition-colors hover:bg-sky-600 ${
              isSubmitting ? 'cursor-not-allowed opacity-70' : ''
            }`}
          >
            {isSubmitting ? 'Saving...' : 'Save New Password'}
          </button>

          {message?.type === 'success' && (
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full rounded-xl border border-slate-200 py-3 font-bold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Continue To The App
            </button>
          )}
        </form>
      </div>
    </section>
  );
};
