import { translateInterfaceText as ui, useInterfaceLanguage as useUiLanguage } from '../../utils/interfaceLanguage';
import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import './game-workspace.css';

/** Keep keyboard focus inside a workspace dialog and restore it on close. */
export const useWorkspaceDialog = (open: boolean, onClose: () => void) => {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') || []).filter(el => el.getClientRects().length);
    (focusable()[0] || ref.current)?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const targets = focusable();
      if (!targets.length) { event.preventDefault(); ref.current?.focus(); return; }
      const first = targets[0], last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); if (previous?.isConnected) previous.focus(); };
  }, [open]);
  return ref;
};

/** Shared, keyboard-accessible disclosure for secondary workspace actions. */
export const WorkspaceMenu: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => {
  const [open, setOpen] = useState(false);
  const [alignStart, setAlignStart] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);
  return <div ref={root} className="workspace-menu" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
  }} onKeyDown={event => {
    if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
  }}>
    <button ref={trigger} type="button" className="workspace-button" aria-expanded={open} onClick={() => {
      setAlignStart((root.current?.getBoundingClientRect().right || 0) < 226);
      setOpen(!open);
    }}>
      {label}<ChevronDown size={16} />
    </button>
    {open && <div className="workspace-menu-panel" style={alignStart ? { left: 0, right: 'auto' } : undefined} onClick={event => {
      if ((event.target as HTMLElement).closest('button')) { setOpen(false); trigger.current?.focus(); }
    }}>{children}</div>}
  </div>;
};

export const QuestionEditorPanel: React.FC<{
  number: number; question: string; answer: string; format: string; warning?: string;
  initiallyOpen?: boolean; children: React.ReactNode;
}> = ({ number, question, answer, format, warning, initiallyOpen, children }) => {
  useUiLanguage();
  const [open, setOpen] = useState(Boolean(initiallyOpen || !question));
  return <section className={`workspace-question ${warning ? 'workspace-question-warning' : ''}`}>
    <button type="button" className="workspace-question-summary" aria-expanded={open} onClick={() => setOpen(!open)}>
      <span className="workspace-question-number">{String(number).padStart(2, '0')}</span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block font-semibold text-slate-800 break-words">{question || 'New question'}</span>
        <span className="mt-1 block text-sm text-slate-600">{format}{warning ? ` · ${warning}` : !answer.trim() ? ui(" · Needs an answer") : ''}</span>
      </span>
      <span className="workspace-edit-label">{open ? ui("Close") : ui("Edit")}</span>
      <ChevronDown size={18} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    <div hidden={!open} className="workspace-question-body">{children}</div>
  </section>;
};

/** One source of truth for an option and its correct-answer selection. */
export const AnswerOptions: React.FC<{
  options: string[]; answer: string; onChange: (options: string[], answer: string) => void;
}> = ({ options, answer, onChange }) => {
  useUiLanguage();
  const groupName = useId();
  const correctIndex = options.findIndex(option => option.trim() && option.trim() === answer.trim());
  return <fieldset className="workspace-answer-options">
    <legend className="mb-3 text-sm font-semibold text-slate-700">{ui("Answer options ")}<span className="font-normal text-slate-500">{ui("— choose the correct answer")}</span></legend>
    {correctIndex < 0 && <p className="mb-3 text-sm text-amber-800" role="status">
      {answer.trim() ? ui("Current answer: {answer}. Select a matching option below.", { "answer": (answer) }) : ui("Select the correct answer below.")}
    </p>}
    {options.map((option, index) => <div key={index} className={`workspace-answer-option ${index === correctIndex ? 'is-correct' : ''}`}>
      <label className="workspace-answer-select cursor-pointer">
        <input type="radio" name={groupName} className="sr-only" checked={index === correctIndex}
          aria-label={ui("Mark option {String.fromCharCode(65 + index)} as correct", { "String.fromCharCode(65 + index)": (String.fromCharCode(65 + index)) })} disabled={!option.trim()}
          onChange={() => onChange(options, option)} />
        {index === correctIndex ? <Check size={18} /> : String.fromCharCode(65 + index)}
      </label>
      <input aria-label={ui("Option {String.fromCharCode(65 + index)}", { "String.fromCharCode(65 + index)": (String.fromCharCode(65 + index)) })} value={option} placeholder={ui("Option {String.fromCharCode(65 + index)}", { "String.fromCharCode(65 + index)": (String.fromCharCode(65 + index)) })}
        onChange={event => {
          const updated = [...options]; updated[index] = event.target.value;
          onChange(updated, index === correctIndex ? event.target.value : answer);
        }} />
      {index === correctIndex && <span className="workspace-correct-label">{ui("Correct")}</span>}
    </div>)}
  </fieldset>;
};
