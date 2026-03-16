import React from 'react';
import { X, GraduationCap, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PlanUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

export const PlanUpgradeModal: React.FC<PlanUpgradeModalProps> = ({
  isOpen,
  onClose,
  title,
  message
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const goToPlanPage = () => {
    onClose();
    navigate('/change-plan');
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/55 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden relative animate-fade-in">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-full bg-slate-100 text-slate-500 hover:text-slate-700"
          aria-label="Close upgrade modal"
        >
          <X size={18} />
        </button>

        <div className="p-8">
          <h2 className="font-display text-2xl font-bold text-slate-800 mb-2">
            {title || 'Upgrade To Use AI Generation'}
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            {message ||
              'Free accounts can create and use all manual tools, but AI generation is available on Teacher and School plans.'}
          </p>

          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 font-bold text-slate-800 mb-2">
                <GraduationCap size={16} className="text-brand-blue" /> Teacher
              </div>
              <p className="text-xs text-slate-500">Unlimited AI generation for one account.</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 font-bold text-slate-800 mb-2">
                <Building2 size={16} className="text-brand-blue" /> School
              </div>
              <p className="text-xs text-slate-500">Unlimited AI plus school-wide teacher management.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={goToPlanPage}
            className="w-full rounded-xl bg-brand-blue py-3 font-bold text-white hover:bg-sky-600 transition-colors"
          >
            Change Plan
          </button>
        </div>
      </div>
    </div>
  );
};
