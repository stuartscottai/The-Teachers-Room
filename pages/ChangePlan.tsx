import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Building2, Check, GraduationCap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AccountType } from '../types';
import { changeMyAccountPlan, promptSignupForFree } from '../services/accountAccess';
import { uploadSchoolLogoForSchool } from '../utils/schoolLogoStorage';
import { supabase } from '../services/supabase';

type Feedback = { type: 'success' | 'error'; text: string } | null;

const PLAN_DEFS: Record<AccountType, { title: string; subtitle: string; features: string[] }> = {
  free: {
    title: 'Free',
    subtitle: 'Manual tools for everything, no AI generation.',
    features: [
      'Access to all manual creation tools',
      'Save and share games/worksheets',
      'Community library access',
      'AI generation locked'
    ]
  },
  teacher: {
    title: 'Teacher',
    subtitle: 'Unlimited AI generation for your own account.',
    features: [
      'Unlimited AI game generation',
      'Unlimited AI worksheet generation',
      'Manual tools stay fully available',
      'Single-teacher plan'
    ]
  },
  school: {
    title: 'School',
    subtitle: 'Unlimited AI plus school-wide teacher management.',
    features: [
      'Unlimited AI across school members',
      'School-level teacher spot management',
      'Teacher invites',
      'School admin dashboard'
    ]
  }
};

export const ChangePlan: React.FC = () => {
  const { user, refreshUserAccess } = useAuth();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pendingTarget, setPendingTarget] = useState<AccountType | null>(null);
  const [showSchoolSetup, setShowSchoolSetup] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [teacherSeatLimit, setTeacherSeatLimit] = useState(10);
  const [schoolLogoFile, setSchoolLogoFile] = useState<File | null>(null);
  const schoolLogoInputRef = useRef<HTMLInputElement | null>(null);

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

  const applyPlan = async (target: AccountType) => {
    if (!user || target === user.accountType) return;

    if (user.accountType === 'school' && (target === 'teacher' || target === 'free')) {
      const isSchoolTeacher = user.schoolAccess?.role === 'teacher';
      const confirmationMessage = isSchoolTeacher
        ? `Switch to ${target === 'teacher' ? 'Teacher' : 'Free'}? This removes your school membership for this account.`
        : `Switch to ${target === 'teacher' ? 'Teacher' : 'Free'}? This removes your active school membership for this account. Downgrades are only allowed when all school members are inactive. If you own the school, affiliated members are moved to Free.`;
      const confirmed = window.confirm(
        confirmationMessage
      );
      if (!confirmed) return;
    }

    setFeedback(null);
    setPendingTarget(target);
    const { error } = await changeMyAccountPlan({ targetAccountType: target });
    setPendingTarget(null);

    if (error) {
      setFeedback({ type: 'error', text: getErrorMessage(error, 'Could not change plan.') });
      return;
    }

    await refreshUserAccess();
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
      teacherSeatLimit
    });

    if (error) {
      setPendingTarget(null);
      setFeedback({ type: 'error', text: getErrorMessage(error, 'Could not switch to School.') });
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
          text: `Plan switched to School, but logo upload failed: ${getErrorMessage(logoError, 'Please try again.')}`
        });
        return;
      }
    }

    setPendingTarget(null);
    setShowSchoolSetup(false);
    setSchoolLogoFile(null);
    await refreshUserAccess();
    setFeedback({ type: 'success', text: 'Plan switched to School.' });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-8 max-w-xl w-full text-center">
          <h1 className="font-display text-2xl font-bold text-slate-800 mb-2">Change Plan</h1>
          <p className="text-slate-500 mb-6">Sign up or log in first to change your plan.</p>
          <button
            type="button"
            onClick={() => promptSignupForFree('Create a free account to continue.')}
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
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <Link to="/profile" className="inline-flex items-center text-sm font-semibold text-slate-600 hover:text-slate-800 mb-4">
            <ArrowLeft size={14} className="mr-2" /> Back to Profile
          </Link>
          <h1 className="font-display text-3xl font-bold text-slate-800">Change Plan</h1>
          <p className="text-slate-500 mt-1">Choose the plan that fits now. You can move up or down between plans.</p>
          <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            Current: {PLAN_DEFS[user.accountType].title}
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
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-1">Free</h2>
            <p className="text-sm text-slate-500 mb-4">{PLAN_DEFS.free.subtitle}</p>
            <ul className="space-y-2 mb-6">
              {PLAN_DEFS.free.features.map((feature) => (
                <li key={feature} className="flex items-start text-sm text-slate-600">
                  <Check size={15} className="text-teal-500 mt-0.5 mr-2 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={pendingTarget === 'free' || user.accountType === 'free'}
              onClick={() => void applyPlan('free')}
              className={`w-full py-2.5 rounded-lg font-bold transition-colors ${
                user.accountType === 'free'
                  ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                  : 'bg-brand-blue text-white hover:bg-sky-600'
              } ${pendingTarget === 'free' ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {user.accountType === 'free' ? 'Current Plan' : pendingTarget === 'free' ? 'Switching...' : 'Switch To Free'}
            </button>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-1 flex items-center">
              <GraduationCap size={18} className="mr-2 text-brand-blue" /> Teacher
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
              disabled={pendingTarget === 'teacher' || user.accountType === 'teacher'}
              onClick={() => void applyPlan('teacher')}
              className={`w-full py-2.5 rounded-lg font-bold transition-colors ${
                user.accountType === 'teacher'
                  ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                  : 'bg-brand-blue text-white hover:bg-sky-600'
              } ${pendingTarget === 'teacher' ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {user.accountType === 'teacher' ? 'Current Plan' : pendingTarget === 'teacher' ? 'Switching...' : 'Switch To Teacher'}
            </button>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-1 flex items-center">
              <Building2 size={18} className="mr-2 text-brand-blue" /> School
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
            {user.accountType === 'school' ? (
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
                onClick={() => setShowSchoolSetup((prev) => !prev)}
                className="w-full py-2.5 rounded-lg font-bold bg-brand-blue text-white hover:bg-sky-600 transition-colors"
              >
                {showSchoolSetup ? 'Hide School Setup' : 'Switch To School'}
              </button>
            )}
          </section>
        </div>

        {showSchoolSetup && user.accountType !== 'school' && (
          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-1">School Setup</h3>
            <p className="text-sm text-slate-500 mb-4">
              Add initial school details to switch to the School plan.
            </p>
            <form onSubmit={handleConfirmSchoolPlan} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">School Name</label>
                  <input
                    value={schoolName}
                    onChange={(event) => setSchoolName(event.target.value)}
                    placeholder="My School"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:ring-brand-blue focus:border-brand-blue outline-none text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">number of teacher spots</label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={teacherSeatLimit}
                    onChange={(event) => setTeacherSeatLimit(Number(event.target.value))}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:ring-brand-blue focus:border-brand-blue outline-none text-sm"
                  />
                </div>
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
                {pendingTarget === 'school' ? 'Switching...' : 'Confirm School Plan'}
              </button>
            </form>
          </section>
        )}

        {user.accountType === 'school' && user.schoolAccess?.role === 'admin' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm flex items-start">
            <AlertCircle size={16} className="mr-2 mt-0.5 shrink-0" />
            School accounts can downgrade only when all school members are inactive. If the owner downgrades, affiliated members move to Free.
          </div>
        )}
      </div>
    </div>
  );
};
