import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Radio, X } from 'lucide-react';

export const LiveQuizCodeEntry: React.FC = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState('');

  const cleanCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-white flex items-center justify-center">
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white p-6 text-slate-900 shadow-2xl">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="Go back to homepage"
          title="Go back to homepage"
        >
          <X size={20} />
        </button>
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-brand-yellow px-3 py-1 text-xs font-black uppercase text-slate-900">
          <Radio size={14} />
          Join Live Quiz
        </div>
        <h1 className="text-3xl font-black leading-tight">Enter your game code</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Use the 6-character code shown on your teacher&apos;s screen.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (cleanCode.length < 4) return;
            navigate(`/live/join/${cleanCode}`);
          }}
        >
          <input
            value={cleanCode}
            onChange={(event) => setCode(event.target.value)}
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 p-5 text-center font-mono text-4xl font-black uppercase tracking-[0.2em] outline-none focus:border-brand-blue focus:ring-4 focus:ring-sky-100"
            placeholder="ABC123"
            autoFocus
          />
          <button
            type="submit"
            disabled={cleanCode.length < 4}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-yellow px-6 py-4 text-xl font-black text-slate-900 hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Join Game
            <ArrowRight size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};
