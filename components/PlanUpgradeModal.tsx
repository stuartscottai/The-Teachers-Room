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
    <div className="fixed inset-0 z-[130] flex items-center justify-center overflow-y-auto bg-slate-900/55 p-3 backdrop-blur-sm sm:p-4">
      <div className="w-full max-w-lg max-h-full bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-y-auto relative animate-fade-in">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-full bg-slate-100 text-slate-500 hover:text-slate-700"
          aria-label="Close upgrade modal"
        >
          <X size={18} />
        </button>

        <div className="p-5 sm:p-8">
          <h2 className="font-display text-2xl font-bold text-slate-800 mb-2">
            {title || 'Activate Teacher Plan'}
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            {message ||
              'The Teacher Plan includes AI generation and is currently free during early access. No payment is required.'}
          </p>

          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 font-bold text-slate-800 mb-2">
                <GraduationCap size={16} className="text-brand-blue" /> Teacher Plan
              </div>
              <p className="text-xs text-slate-500">AI game credits for one teacher account. Free during early access.</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 font-bold text-slate-800 mb-2">
                <Building2 size={16} className="text-brand-blue" /> School Plan
              </div>
              <p className="text-xs text-slate-500">School-wide teacher management with AI credits per teacher.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={goToPlanPage}
            className="w-full rounded-xl bg-brand-blue py-3 font-bold text-white hover:bg-sky-600 transition-colors"
          >
            View Plans
          </button>
        </div>
      </div>
    </div>
  );
};
