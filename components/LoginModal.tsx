import React, { useEffect, useState } from 'react';
import { X, LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { dispatchEmailConfirmationPrompt } from '../services/accountAccess';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'signup';
  titleOverride?: string;
  messageOverride?: string;
}

type AuthView = 'login' | 'signup' | 'forgot-password';

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'login',
  titleOverride,
  messageOverride
}) => {
  const [view, setView] = useState<AuthView>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [hasSchoolCode, setHasSchoolCode] = useState(false);
  const [schoolCode, setSchoolCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordResetRequestedEmail, setPasswordResetRequestedEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, signup, requestPasswordReset } = useAuth();

  const shouldShowExistingSignupEmailPrompt = (authError: unknown) => {
    if (!authError || typeof authError !== 'object') return false;
    const message = String((authError as any).message || '').toLowerCase();
    const code = String((authError as any).code || '').toLowerCase();

    return (
      code === 'user_already_exists' ||
      code === 'over_email_send_rate_limit' ||
      message.includes('already registered') ||
      message.includes('already exists') ||
      message.includes('user already exists') ||
      message.includes('user already registered') ||
      message.includes('request this after') ||
      message.includes('email send rate limit')
    );
  };

  const shouldShowGenericPasswordResetPrompt = (authError: unknown) => {
    if (!authError || typeof authError !== 'object') return false;
    const message = String((authError as any).message || '').toLowerCase();
    const code = String((authError as any).code || '').toLowerCase();

    return (
      code === 'over_email_send_rate_limit' ||
      code === 'user_not_found' ||
      message.includes('request this after') ||
      message.includes('email send rate limit') ||
      message.includes('rate limit') ||
      message.includes('user not found') ||
      message.includes('not found')
    );
  };

  const isLogin = view === 'login';
  const isForgotPassword = view === 'forgot-password';

  useEffect(() => {
    if (!isOpen) return;
    setView(defaultMode === 'signup' ? 'signup' : 'login');
    setError(null);
    setHasSchoolCode(false);
    setSchoolCode('');
    setPassword('');
    setShowPassword(false);
    setPasswordResetRequestedEmail(null);
  }, [defaultMode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isForgotPassword) {
        const trimmedEmail = email.trim();
        const { error } = await requestPasswordReset(trimmedEmail);
        if (error && !shouldShowGenericPasswordResetPrompt(error)) throw error;
        setPasswordResetRequestedEmail(trimmedEmail);
        return;
      }

      if (isLogin) {
        const { error } = await login(email, password);
        if (error) throw error;
      } else {
        if (!name) {
          setError('Name is required');
          setLoading(false);
          return;
        }

        const cleanSchoolCode = hasSchoolCode ? schoolCode.trim().toUpperCase() : '';
        const { error, requiresEmailConfirmation, email: signupEmail } = await signup(
          email,
          password,
          name,
          cleanSchoolCode || undefined
        );

        if (error) throw error;

        if (requiresEmailConfirmation) {
          dispatchEmailConfirmationPrompt({ email: signupEmail || email, reason: 'new-signup' });
          onClose();
          return;
        }
      }

      onClose();
    } catch (authError: any) {
      if (!isLogin && !isForgotPassword && shouldShowExistingSignupEmailPrompt(authError)) {
        dispatchEmailConfirmationPrompt({ email, reason: 'existing-signup' });
        onClose();
        return;
      }

      setError(authError.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const renderTitle = () => {
    if (isForgotPassword) return 'Reset Your Password';
    return titleOverride || (isLogin ? 'Welcome Back' : 'Join the Community');
  };

  const renderSubtitle = () => {
    if (isForgotPassword) {
      return "Enter your email and we'll send a reset link if an account exists.";
    }
    return messageOverride || (isLogin ? 'Login to access your saved games' : 'Create an account to start saving');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full p-1"
        >
          <X size={20} />
        </button>

        <div className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex bg-brand-yellow p-3 rounded-full mb-4">
              <LogIn className="text-slate-900" size={24} />
            </div>
            <h2 className="font-display text-2xl font-bold text-slate-800">{renderTitle()}</h2>
            <p className="text-slate-500 text-sm mt-1">{renderSubtitle()}</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-start">
              <AlertCircle size={16} className="mr-2 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {isForgotPassword && passwordResetRequestedEmail ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-5 text-sm text-emerald-800">
                <p className="font-semibold text-emerald-900">Check your email</p>
                <p className="mt-2">
                  If an account exists for <span className="font-semibold">{passwordResetRequestedEmail}</span>, a password reset link has been sent.
                </p>
                <p className="mt-2 text-emerald-700">Check your inbox and spam folder.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setView('login');
                  setError(null);
                  setPasswordResetRequestedEmail(null);
                }}
                className="w-full py-3 bg-brand-blue text-white font-bold rounded-lg hover:bg-sky-600 transition-colors shadow-md"
              >
                Back To Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setPasswordResetRequestedEmail(null);
                  setError(null);
                }}
                className="w-full py-3 border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors"
              >
                Try Another Email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && !isForgotPassword && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-blue outline-none"
                    placeholder="Teacher Name"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-blue outline-none"
                  placeholder="name@school.edu"
                />
              </div>

              {!isForgotPassword && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-blue outline-none pr-10"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {isLogin && (
                    <div className="mt-2 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setView('forgot-password');
                          setError(null);
                          setPasswordResetRequestedEmail(null);
                          setPassword('');
                        }}
                        className="text-sm font-bold text-brand-blue hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}
                </div>
              )}

              {!isLogin && !isForgotPassword && (
                <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                  <label className="inline-flex items-center text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={hasSchoolCode}
                      onChange={(e) => setHasSchoolCode(e.target.checked)}
                      className="mr-2 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                    />
                    I have a school code
                  </label>
                  {hasSchoolCode && (
                    <div className="mt-3">
                      <input
                        type="text"
                        value={schoolCode}
                        onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                        className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-blue outline-none font-mono tracking-wide"
                        placeholder="Enter school code"
                      />
                      <p className="mt-2 text-xs text-slate-500">
                        Your request will be pending until a school admin approves it.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 bg-brand-blue text-white font-bold rounded-lg hover:bg-sky-600 transition-colors shadow-md mt-4 flex items-center justify-center ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : isForgotPassword ? (
                  'Send Reset Link'
                ) : isLogin ? (
                  'Sign In'
                ) : (
                  'Create Account'
                )}
              </button>
            </form>
          )}

          <div className="mt-6 text-center pt-6 border-t border-slate-100">
            {isForgotPassword ? (
              <p className="text-sm text-slate-500">
                Remembered your password?{' '}
                <button
                  onClick={() => {
                    setView('login');
                    setError(null);
                    setPasswordResetRequestedEmail(null);
                  }}
                  className="text-brand-blue font-bold hover:underline"
                >
                  Log In
                </button>
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <button
                  onClick={() => {
                    setView(isLogin ? 'signup' : 'login');
                    setError(null);
                    setPasswordResetRequestedEmail(null);
                  }}
                  className="text-brand-blue font-bold hover:underline"
                >
                  {isLogin ? 'Sign Up' : 'Log In'}
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
