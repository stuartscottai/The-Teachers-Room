import React from 'react';
import { Trophy, RefreshCw, AlertTriangle } from 'lucide-react';

type TargetStatus = { text: string; color: string; size: string };

const baseStatus: TargetStatus = { text: 'Target: Square 11', color: 'text-slate-200', size: 'text-lg md:text-xl' };
const bonusStatus: TargetStatus = { text: 'BONUS TILE!', color: 'text-purple-200 drop-shadow-[0_8px_15px_rgba(109,40,217,0.6)] tracking-[0.35em] uppercase', size: 'text-3xl md:text-5xl' };

const QuestionCard: React.FC<{ status: TargetStatus; question: string }> = ({ status, question }) => (
  <div className="relative w-[75vw] max-w-5xl aspect-[16/9]">
    <div className="absolute inset-0 rounded-3xl shadow-2xl overflow-hidden flex flex-col bg-white">
      <div className="bg-brand-blue text-white p-4 flex justify-between items-center h-20 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="font-bold text-xl opacity-90">Question for Team 1</div>
          <div className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-bold border border-white/30">You rolled a 4</div>
        </div>
        <div className={`font-bold text-right ${status.size} ${status.color}`}>{status.text}</div>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col items-center justify-center p-8 bg-white">
        <div className="font-display font-bold text-slate-800 leading-tight text-center text-6xl md:text-7xl">{question}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-8 max-w-2xl">
          {['Cat', 'Dog', 'Bird', 'Fish'].map((opt, i) => (
            <button key={i} className="p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-brand-yellow hover:border-yellow-400 hover:text-slate-900 transition-all text-center shadow-sm text-xl md:text-2xl h-full min-h-[80px] flex items-center justify-center">
              {opt}
            </button>
          ))}
        </div>
      </div>
      <div className="h-24 flex items-center justify-between px-8 relative flex-shrink-0 bg-gradient-to-r from-brand-blue to-sky-500">
        <div className="absolute inset-0 bg-black/10 flex items-center pointer-events-none">
          <div className="h-full bg-white/20" style={{ width: '70%' }} />
        </div>
        <div className="text-white font-mono font-bold text-3xl opacity-90 flex items-center pointer-events-none absolute left-1/2 -translate-x-1/2">
          <span className="flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 24 24" className="text-white">
              <path fill="currentColor" d="M12 8a1 1 0 0 1 1 1v4l2.5 1.5a1 1 0 0 1-1 1.73l-3-1.8A1 1 0 0 1 11 13V9a1 1 0 0 1 1-1Zm0-6a10 10 0 1 1-10 10A10 10 0 0 1 12 2Z" />
            </svg>
            28
          </span>
        </div>
      </div>
    </div>
  </div>
);

const WinnerOverlay: React.FC = () => (
  <div className="bg-slate-900 text-white rounded-3xl shadow-[0_40px_90px_rgba(15,23,42,0.7)] overflow-hidden px-8 py-16 flex flex-col items-center justify-center text-center">
    <Trophy size={120} className="text-brand-yellow mb-6 animate-bounce" />
    <h2 className="text-6xl font-black mb-4">WINNER!</h2>
    <div className="text-brand-blue text-4xl font-display font-bold bg-white px-10 py-4 rounded-full mb-10 shadow-xl">Team Alpha</div>
    <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
      <button className="px-10 py-4 bg-brand-yellow text-slate-900 rounded-xl font-bold hover:scale-105 transition-transform flex items-center justify-center text-lg">
        <RefreshCw className="mr-2" /> Play Again
      </button>
      <button className="px-10 py-4 bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-600 transition-colors text-lg">
        Exit
      </button>
    </div>
  </div>
);

export const TestBench: React.FC = () => {
  return (
    <div className="min-h-screen bg-stone-200 p-8 space-y-12 flex flex-col items-center">
      <QuestionCard status={baseStatus} question="Which animal barks and is often kept as a pet?" />
      <QuestionCard status={bonusStatus} question="She ______ to school yesterday." />
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl py-16 text-center">
        <div className="text-center">
          <AlertTriangle size={64} className="text-orange-500 mx-auto mb-4" />
          <h3 className="text-5xl font-black text-brand-yellow drop-shadow-xl uppercase tracking-[0.3em]">Bonus! +10 Spaces</h3>
        </div>
      </div>
      <div className="w-full max-w-4xl">
        <WinnerOverlay />
      </div>
    </div>
  );
};
