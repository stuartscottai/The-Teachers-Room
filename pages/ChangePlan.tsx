import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Building2, Check, GraduationCap, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AccountType } from '../types';
import { changeMyAccountPlan, promptSignupForFree } from '../services/accountAccess';
import { uploadSchoolLogoForSchool } from '../utils/schoolLogoStorage';
import { supabase } from '../services/supabase';
import { CompanyLogo } from '../components/CompanyLogo';

type Feedback = { type: 'success' | 'error'; text: string } | null;

const PLAN_DEFS: Record<AccountType, { title: string; subtitle: string; features: string[] }> = {
  free: {
    title: 'Starter',
    subtitle: 'Manual tools for everything, no built-in AI generation.',
    features: [
      'Use all manual creation tools',
      'Save and share games',
      'Community library browsing',
      'Built-in AI generation not included'
    ]
  },
  teacher: {
    title: 'Teacher Plan',
    subtitle: 'Currently free during early access. Includes AI game credits for one teacher.',
    features: [
      'Credits for approximately 50 AI-created games per month',
      'Unlimited manual game creation',
      'Manual tools stay fully available',
      'No credit card information required to sign up'
    ]
  },
  school: {
    title: 'School Plan',
    subtitle: 'Currently free during early access for schools testing the platform.',
    features: [
      'AI game credits for each teacher account',
      'Minimum 5 teacher seats',
      'School-level teacher spot management',
      'Teacher invites',
      'School admin dashboard'
    ]
  }
};

interface ChangePlanProps {
  mode?: 'settings' | 'onboarding';
}

export const ChangePlan: React.FC<ChangePlanProps> = ({ mode = 'settings' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshUserAccess, completePlanSelection } = useAuth();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [showBetaNotice, setShowBetaNotice] = useState(true);
  const [pendingTarget, setPendingTarget] = useState<AccountType | null>(null);
  const [showSchoolSetup, setShowSchoolSetup] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [teacherSeatLimit, setTeacherSeatLimit] = useState(5);
  const [schoolLogoFile, setSchoolLogoFile] = useState<File | null>(null);
  const schoolLogoInputRef = useRef<HTMLInputElement | null>(null);
  const isOnboarding = mode === 'onboarding';
  const targetPlanFromNavigation = (location.state as { targetPlan?: AccountType } | null)?.targetPlan;

  useEffect(() => {
    if (!user || targetPlanFromNavigation !== 'school' || user.accountType === 'school') return;
    setShowSchoolSetup(true);
  }, [targetPlanFromNavigation, user]);

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as any).message || fallback);
    }
    return fallback;
  };

  const resolveMyActiveSchoolId = async (): Promise<string | null> => {
    if (!user) return null;
    let data: any = null;
    try {
      const response = await supabase
        .from('school_memberships')
        .select('school_id, role')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      data = response.data;
    } catch {
      data = null;
    }

    return data && typeof (data as any).school_id === 'string' ? (data as any).school_id : null;
  };

  const finishOnboarding = async (nextPath: string) => {
    const { error } = await completePlanSelection();
    if (error) {
      setFeedback({
        type: 'error',
        text: getErrorMessage(error, 'Your account was updated, but onboarding could not be completed.')
      });
      return false;
    }

    navigate(nextPath, { replace: true });
    return true;
  };

  const applyPlan = async (target: AccountType) => {
    if (!user) return;

    if (!isOnboarding && target === user.accountType) return;

    if (isOnboarding && target === user.accountType) {
      setFeedback(null);
      setPendingTarget(target);
      if (!(await finishOnboarding(target === 'school' ? '/school-admin' : '/'))) {
        setPendingTarget(null);
      }
      return;
    }

    if (user.accountType === 'school' && (target === 'teacher' || target === 'free')) {
      const isSchoolTeacher = user.schoolAccess?.role === 'teacher';
      const confirmationMessage = isSchoolTeacher
        ? `Switch to ${target === 'teacher' ? 'Teacher Plan' : 'Starter'}? This removes your school membership for this account.`
        : `Switch to ${target === 'teacher' ? 'Teacher Plan' : 'Starter'}? This removes your active school membership for this account. Downgrades are only allowed when all school members are inactive. If you own the school, affiliated members are moved to Starter.`;
      const confirmed = window.confirm(
        confirmationMessage
      );
      if (!confirmed) return;
    }

    setShowSchoolSetup(false);
    setFeedback(null);
    setPendingTarget(target);
    const { error } = await changeMyAccountPlan({ targetAccountType: target });

    if (error) {
      setPendingTarget(null);
      setFeedback({ type: 'error', text: getErrorMessage(error, 'Could not change plan.') });
      return;
    }

    await refreshUserAccess();

    if (isOnboarding) {
      if (!(await finishOnboarding(target === 'school' ? '/school-admin' : '/'))) {
        setPendingTarget(null);
      }
      return;
    }

    setPendingTarget(null);
    setFeedback({ type: 'success', text: `Plan switched to ${PLAN_DEFS[target].title}.` });
  };

  const handlePickSchoolLogo = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    event.target.value = '';
    if (!file) return;

    if (!file.type || !file.type.startsWith('image/')) {
      setFeedback({ type: 'error', text: 'Please choose an image file for your school logo.' });
      return;
    }

    setSchoolLogoFile(file);
  };

  const handleConfirmSchoolPlan = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    const cleanSchoolName = schoolName.trim();
    if (!cleanSchoolName) {
      setFeedback({ type: 'error', text: 'Please enter your school name.' });
      return;
    }

    setFeedback(null);
    setPendingTarget('school');
    const { error, schoolId } = await changeMyAccountPlan({
      targetAccountType: 'school',
      schoolName: cleanSchoolName,
      teacherSeatLimit: Math.max(5, teacherSeatLimit)
    });

    if (error) {
      setPendingTarget(null);
      setFeedback({ type: 'error', text: getErrorMessage(error, 'Could not switch to School Plan.') });
      return;
    }

    let targetSchoolId = schoolId || (await resolveMyActiveSchoolId());
    if (schoolLogoFile && targetSchoolId) {
      try {
        await uploadSchoolLogoForSchool({ schoolId: targetSchoolId, file: schoolLogoFile });
      } catch (logoError) {
        setPendingTarget(null);
        await refreshUserAccess();
        setFeedback({
          type: 'error',
          text: `Plan switched to School Plan, but logo upload failed: ${getErrorMessage(logoError, 'Please try again.')}`
        });
        return;
      }
    }

    setShowSchoolSetup(false);
    setSchoolLogoFile(null);
    await refreshUserAccess();

    if (isOnboarding) {
      if (!(await finishOnboarding('/school-admin'))) {
        setPendingTarget(null);
      }
      return;
    }

    setPendingTarget(null);
    setFeedback({ type: 'success', text: 'Plan switched to School Plan.' });
  };

  const pageTitle = isOnboarding ? 'Choose Your Plan' : 'Change Plan';
  const pageDescription = isOnboarding
    ? 'Your account is confirmed. Teacher Plan is free during early access, so you can start creating games straight away.'
    : 'Choose the plan that fits now. These plans are free during early access, and no credit card information is required to sign up.';
  const badgeText =
    isOnboarding && user?.accountType === 'teacher'
      ? 'Default: Teacher Plan'
      : `Current: ${PLAN_DEFS[user?.accountType || 'free'].title}`;

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-8 max-w-xl w-full text-center">
          <h1 className="font-display text-2xl font-bold text-slate-800 mb-2">{pageTitle}</h1>
          <p className="text-slate-500 mb-6">
            {isOnboarding
              ? 'Sign up or log in first to choose a plan.'
              : 'Sign up or log in first to change your plan.'}
          </p>
          <button
            type="button"
            onClick={() => promptSignupForFree('Create a free account on the Teacher Plan to continue.')}
            className="px-6 py-3 rounded-xl bg-brand-blue text-white font-bold hover:bg-sky-600 transition-colors"
          >
            Sign Up Free
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      {showBetaNotice && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/55 backdrop-blur-sm px-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-2xl animate-fade-in">
            <button
              type="button"
              onClick={() => setShowBetaNotice(false)}
              className="absolute right-4 top-4 rounded-full bg-slate-100 p-1 text-slate-500 hover:text-slate-700"
              aria-label="Close beta trial notice"
            >
              <X size={18} />
            </button>
            <CompanyLogo
              showName
              className="mb-5 flex flex-col items-center"
              imageClassName="h-16 w-16 object-contain"
              nameClassName="mt-2 font-display text-xl font-bold text-slate-800"
            />
            <h2 className="font-display text-2xl font-bold text-slate-800 mb-2">Early Access Period</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              The Teacher Plan and School Plan are free during early access, and no credit card information is required to sign up.
            </p>
            <button
              type="button"
              onClick={() => setShowBetaNotice(false)}
              className="mt-6 w-full rounded-xl bg-brand-blue py-3 font-bold text-white hover:bg-sky-600 transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          {!isOnboarding && (
            <Link to="/profile" className="inline-flex items-center text-sm font-semibold text-slate-600 hover:text-slate-800 mb-4">
              <ArrowLeft size={14} className="mr-2" /> Back to Profile
            </Link>
          )}
          <h1 className="font-display text-3xl font-bold text-slate-800">{pageTitle}</h1>
          <p className="text-slate-500 mt-1">{pageDescription}</p>
          <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            {badgeText}
          </div>
        </div>

        {feedback && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              feedback.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {feedback.text}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          <section
            className={`bg-white rounded-2xl border shadow-sm p-6 ${
              user.accountType === 'free' ? 'border-brand-blue' : 'border-slate-200'
            }`}
          >
            <h2 className="text-xl font-bold text-slate-800 mb-1">Starter</h2>
            <p className="text-sm text-slate-500 mb-4">{PLAN_DEFS.free.subtitle}</p>
            <ul className="space-y-2 mb-6">
              {PLAN_DEFS.free.features.map((feature) => (
                <li key={feature} className="flex items-start text-sm text-slate-600">
                  {feature.includes('not included') ? (
                    <X size={15} className="text-red-500 mt-0.5 mr-2 shrink-0" />
                  ) : (
                    <Check size={15} className="text-teal-500 mt-0.5 mr-2 shrink-0" />
                  )}
                  {feature}
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={pendingTarget === 'free' || (!isOnboarding && user.accountType === 'free')}
              onClick={() => void applyPlan('free')}
              className={`w-full py-2.5 rounded-lg font-bold transition-colors ${
                !isOnboarding && user.accountType === 'free'
                  ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                  : 'bg-brand-blue text-white hover:bg-sky-600'
              } ${pendingTarget === 'free' ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isOnboarding
                ? pendingTarget === 'free'
                  ? 'Continuing...'
                  : user.accountType === 'free'
                    ? 'Continue With Starter'
                    : 'Switch To Starter'
                : user.accountType === 'free'
                  ? 'Current Plan'
                  : pendingTarget === 'free'
                    ? 'Switching...'
                    : 'Switch To Starter'}
            </button>
          </section>

          <section
            className={`bg-white rounded-2xl border shadow-sm p-6 ${
              user.accountType === 'teacher' ? 'border-brand-blue' : 'border-slate-200'
            }`}
          >
            <h2 className="text-xl font-bold text-slate-800 mb-1 flex items-center">
              <GraduationCap size={18} className="mr-2 text-brand-blue" /> Teacher Plan
            </h2>
            <p className="text-sm text-slate-500 mb-4">{PLAN_DEFS.teacher.subtitle}</p>
            <ul className="space-y-2 mb-6">
              {PLAN_DEFS.teacher.features.map((feature) => (
                <li key={feature} className="flex items-start text-sm text-slate-600">
                  <Check size={15} className="text-teal-500 mt-0.5 mr-2 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={pendingTarget === 'teacher' || (!isOnboarding && user.accountType === 'teacher')}
              onClick={() => void applyPlan('teacher')}
              className={`w-full py-2.5 rounded-lg font-bold transition-colors ${
                !isOnboarding && user.accountType === 'teacher'
                  ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                  : 'bg-brand-blue text-white hover:bg-sky-600'
              } ${pendingTarget === 'teacher' ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isOnboarding
                ? pendingTarget === 'teacher'
                  ? user.accountType === 'teacher'
                    ? 'Continuing...'
                    : 'Upgrading...'
                  : user.accountType === 'teacher'
                    ? 'Continue With Teacher Plan'
                    : 'Activate Teacher Plan'
                : user.accountType === 'teacher'
                  ? 'Current Plan'
                  : pendingTarget === 'teacher'
                    ? 'Switching...'
                    : 'Switch To Teacher Plan'}
            </button>
          </section>

          <section
            className={`bg-white rounded-2xl border shadow-sm p-6 ${
              user.accountType === 'school' ? 'border-brand-blue' : 'border-slate-200'
            }`}
          >
            <h2 className="text-xl font-bold text-slate-800 mb-1 flex items-center">
              <Building2 size={18} className="mr-2 text-brand-blue" /> School Plan
            </h2>
            <p className="text-sm text-slate-500 mb-4">{PLAN_DEFS.school.subtitle}</p>
            <ul className="space-y-2 mb-6">
              {PLAN_DEFS.school.features.map((feature) => (
                <li key={feature} className="flex items-start text-sm text-slate-600">
                  <Check size={15} className="text-teal-500 mt-0.5 mr-2 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            {user.accountType === 'school' && !isOnboarding ? (
              <button
                type="button"
                disabled
                className="w-full py-2.5 rounded-lg font-bold bg-slate-100 text-slate-500 cursor-not-allowed"
              >
                Current Plan
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (user.accountType === 'school' && isOnboarding) {
                    void applyPlan('school');
                    return;
                  }
                  setShowSchoolSetup((prev) => !prev);
                }}
                className="w-full py-2.5 rounded-lg font-bold bg-brand-blue text-white hover:bg-sky-600 transition-colors"
              >
                {isOnboarding
                  ? user.accountType === 'school'
                    ? pendingTarget === 'school'
                      ? 'Continuing...'
                      : 'Continue With School Plan'
                    : showSchoolSetup
                      ? 'Hide School Setup'
                      : 'Set Up School Plan'
                  : showSchoolSetup
                    ? 'Hide School Setup'
                    : 'Switch To School Plan'}
              </button>
            )}
          </section>
        </div>

        {showSchoolSetup && user.accountType !== 'school' && (
          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-1">School Setup</h3>
            <p className="text-sm text-slate-500 mb-4">
              {isOnboarding
                ? 'Add the basics for your school account. You can adjust the rest later.'
                : 'Add initial school details to switch to School Plan.'}
            </p>
            <form onSubmit={handleConfirmSchoolPlan} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className={isOnboarding ? 'md:col-span-3' : 'md:col-span-2'}>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">School Name</label>
                  <input
                    value={schoolName}
                    onChange={(event) => setSchoolName(event.target.value)}
                    placeholder="My School"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:ring-brand-blue focus:border-brand-blue outline-none text-sm"
                    required
                  />
                </div>
                {!isOnboarding && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">number of teacher spots</label>
                    <input
                      type="number"
                      min={5}
                      max={500}
                      value={teacherSeatLimit}
                      onChange={(event) => setTeacherSeatLimit(Math.max(5, Number(event.target.value)))}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:ring-brand-blue focus:border-brand-blue outline-none text-sm"
                    />
                  </div>
                )}
                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">School logo (optional)</label>
                  <input
                    ref={schoolLogoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePickSchoolLogo}
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <button
                      type="button"
                      onClick={() => schoolLogoInputRef.current?.click()}
                      className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Choose Logo File
                    </button>
                    <span className="text-xs text-slate-500">
                      {schoolLogoFile ? schoolLogoFile.name : 'No file selected'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={pendingTarget === 'school'}
                className={`px-5 py-2.5 rounded-lg font-bold text-white bg-brand-blue hover:bg-sky-600 transition-colors ${
                  pendingTarget === 'school' ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {pendingTarget === 'school'
                  ? isOnboarding
                    ? 'Creating...'
                    : 'Switching...'
                  : isOnboarding
                    ? 'Continue With School Plan'
                    : 'Confirm School Plan'}
              </button>
            </form>
          </section>
        )}

        {user.accountType === 'school' && user.schoolAccess?.role === 'admin' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm flex items-start">
            <AlertCircle size={16} className="mr-2 mt-0.5 shrink-0" />
            School accounts can switch away from the School Plan only when all school members are inactive. If the owner switches away, affiliated members move to Starter.
          </div>
        )}
      </div>
    </div>
  );
};
