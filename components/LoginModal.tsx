import React, { useEffect, useRef, useState } from 'react';
import { X, LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { dispatchEmailConfirmationPrompt } from '../services/accountAccess';
import { AuthTurnstile } from './AuthTurnstile';

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
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

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
    setCaptchaToken(null);
    setCaptchaResetKey((current) => current + 1);
    window.requestAnimationFrame(() => {
      if (scrollAreaRef.current) scrollAreaRef.current.scrollTop = 0;
    });
  }, [defaultMode, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!captchaToken) {
      setError('Please complete the human verification check before continuing.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isForgotPassword) {
        const trimmedEmail = email.trim();
        const { error } = await requestPasswordReset(trimmedEmail, captchaToken);
        if (error && !shouldShowGenericPasswordResetPrompt(error)) throw error;
        setPasswordResetRequestedEmail(trimmedEmail);
        return;
      }

      if (isLogin) {
        const { error } = await login(email, password, captchaToken);
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
          cleanSchoolCode || undefined,
          captchaToken
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
      setCaptchaToken(null);
      setCaptchaResetKey((current) => current + 1);
    }
  };

  const changeView = (nextView: AuthView) => {
    setView(nextView);
    setError(null);
    setPasswordResetRequestedEmail(null);
    setCaptchaToken(null);
    setCaptchaResetKey((current) => current + 1);
  };

  const renderTitle = () => {
    if (isForgotPassword) return 'Reset Your Password';
    return titleOverride || (isLogin ? 'Welcome Back' : 'Join the Community');
  };

  const renderSubtitle = () => {
    if (isForgotPassword) {
      return "Enter your email and we'll send a reset link if an account exists.";
    }
    return messageOverride || (isLogin ? 'Login to access your saved games' : 'Create a free account on the Teacher Plan to start saving and creating');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-slate-900/50 p-3 backdrop-blur-sm sm:p-4">
      <div className="relative flex h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-fade-in sm:h-auto sm:max-h-[calc(100dvh-2rem)]">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-20 rounded-full bg-slate-100/95 p-1 text-slate-400 backdrop-blur-sm hover:text-slate-600 sm:right-4 sm:top-4"
        >
          <X size={20} />
        </button>

        <div
          ref={scrollAreaRef}
          data-testid="auth-modal-scroll-area"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-5 [touch-action:pan-y] sm:p-8"
        >
          <div className="mb-5 text-center sm:mb-8">
            <div className="mb-3 inline-flex rounded-full bg-brand-yellow p-2.5 sm:mb-4 sm:p-3">
              <LogIn className="text-slate-900" size={24} />
            </div>
            <h2 className="font-display text-xl font-bold text-slate-800 sm:text-2xl">{renderTitle()}</h2>
            <p className="mt-1 text-sm leading-5 text-slate-500">{renderSubtitle()}</p>
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
                  changeView('login');
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
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              {!isLogin && !isForgotPassword && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 outline-none focus:ring-2 focus:ring-brand-blue sm:p-3"
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
                  className="w-full rounded-lg border border-slate-200 p-2.5 outline-none focus:ring-2 focus:ring-brand-blue sm:p-3"
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
                      className="w-full rounded-lg border border-slate-200 p-2.5 pr-10 outline-none focus:ring-2 focus:ring-brand-blue sm:p-3 sm:pr-10"
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
                          changeView('forgot-password');
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
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 sm:p-3">
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
                        className="w-full rounded-lg border border-slate-200 p-2.5 font-mono tracking-wide outline-none focus:ring-2 focus:ring-brand-blue sm:p-3"
                        placeholder="Enter school code"
                      />
                      <p className="mt-2 text-xs text-slate-500">
                        Your request will be pending until a school admin approves it.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <AuthTurnstile
                resetKey={captchaResetKey}
                onTokenChange={setCaptchaToken}
                discreet={isLogin}
              />

              <button
                type="submit"
                disabled={loading || !captchaToken}
                className={`mt-2 flex w-full items-center justify-center rounded-lg bg-brand-blue py-2.5 font-bold text-white shadow-md transition-colors hover:bg-sky-600 sm:mt-4 sm:py-3 ${
                  loading || !captchaToken ? 'opacity-70 cursor-not-allowed' : ''
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

          <div className="mt-4 border-t border-slate-100 pt-4 text-center sm:mt-6 sm:pt-6">
            {isForgotPassword ? (
              <p className="text-sm text-slate-500">
                Remembered your password?{' '}
                <button
                  onClick={() => {
                    changeView('login');
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
                    changeView(isLogin ? 'signup' : 'login');
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
