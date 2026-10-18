import { translateInterfaceText as ui, useInterfaceLanguage as useUiLanguage } from '../utils/interfaceLanguage';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Radio, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { PlayfulHeading } from '../components/PlayfulHeading';

export const LiveQuizCodeEntry: React.FC = () => {
  useUiLanguage();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [leavingTo, setLeavingTo] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  const cleanCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

  return (
    <div className="playful-page playful-live-entry px-4 py-10 flex items-center justify-center">
      <AnimatePresence onExitComplete={() => { if (leavingTo) navigate(leavingTo); }}>
      {!leavingTo && <motion.div
        key="live-code-card"
        initial={{ opacity: 0, scale: reduceMotion ? 1 : .78, rotate: reduceMotion ? 0 : -4 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={reduceMotion ? { duration: .12 } : { type: 'spring', stiffness: 340, damping: 22 }}
        exit={{ opacity: 0, scale: reduceMotion ? 1 : .6, y: reduceMotion ? 0 : 45, rotate: reduceMotion ? 0 : 5, transition: { duration: reduceMotion ? 0 : .22 } }}
        className="playful-live-card relative w-full max-w-md p-6 sm:p-8"
      >
        <button
          type="button"
          onClick={() => setLeavingTo('/')}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label={ui("Go back to homepage")}
          title={ui("Go back to homepage")}
        >
          <X size={20} />
        </button>
        <div className="playful-live-badge">
          <Radio size={14} />
          {ui("Join Live Quiz")}</div>
        <PlayfulHeading centered icon={<Radio size={34} />} title={ui("Enter your game code")} description={ui("Use the 6-character code shown on your teacher's screen.")} />

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (cleanCode.length < 4) return;
            setLeavingTo(`/live/join/${cleanCode}`);
          }}
        >
          <input
            aria-label={ui("Enter your game code")}
            value={cleanCode}
            onChange={(event) => setCode(event.target.value)}
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 p-5 text-center font-mono text-4xl font-black uppercase tracking-[0.2em] outline-none focus:border-brand-blue focus:ring-4 focus:ring-sky-100"
            placeholder="ABC123"
            autoFocus
          />
          <button
            type="submit"
            disabled={cleanCode.length < 4}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-blue px-6 py-4 text-xl font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {ui("Join Game")}<ArrowRight size={20} />
          </button>
        </form>
      </motion.div>}
      </AnimatePresence>
    </div>
  );
};
