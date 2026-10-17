import React, { useEffect, useId, useRef, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { GameConfig, GameRunOptions, GeneratedQuestion } from '../../../types';
import { getAnswerMethod, getWrittenQuestionType, matchesWrittenAnswer, supportsWrittenAnswers } from '../../../utils/writtenAnswers';
import { translateInterfaceText as ui, useInterfaceLanguage } from '../../../utils/interfaceLanguage';
import './written-answer.css';

export function useWrittenAnswer(question: GeneratedQuestion | null | undefined, config: GameConfig, options: GameRunOptions, key: string | number | null, hasChoices = Boolean(question?.options?.length)) {
  const method = getAnswerMethod(config, options);
  const enabled = Boolean(question && !question.isBonus && !hasChoices && supportsWrittenAnswers(config.type));
  const [state, setState] = useState({ key, text: '', submitted: false });
  const [layoutTick, setLayoutTick] = useState(0);
  useEffect(() => {
    const viewport = window.visualViewport;
    const resize = () => setLayoutTick(tick => tick + 1);
    viewport?.addEventListener('resize', resize);
    return () => viewport?.removeEventListener('resize', resize);
  }, []);
  // Reset immediately when changing cards, including returning to the same tile.
  const current = state.key === key ? state : { key, text: '', submitted: false };
  if (state.key !== key) setState(current);
  return {
    enabled, method, layoutTick, ...current,
    writing: enabled && method === 'write',
    kind: question ? getWrittenQuestionType(question, config) : 'open' as const,
    matches: question ? matchesWrittenAnswer(current.text, question) : false,
    setText: (text: string) => setState({ ...current, text, submitted: false }),
    submit: () => setState({ ...current, submitted: true }),
  };
}

type AnswerState = ReturnType<typeof useWrittenAnswer>;

export const WrittenAnswerInput: React.FC<{ state: AnswerState; onReveal: () => void; disabled?: boolean; teamName?: string }> = ({ state, onReveal, disabled = false, teamName }) => {
  useInterfaceLanguage();
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const form = formRef.current;
    const viewport = window.visualViewport;
    const overlay = form?.closest<HTMLElement>('[data-written-question-overlay]');
    if (!form || !viewport || !overlay || !window.matchMedia('(max-width: 639px)').matches) return;
    const update = () => {
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      overlay.style.setProperty('--writing-keyboard-inset', `${inset}px`);
      if (form.contains(document.activeElement)) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    form.addEventListener('focusin', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      form.removeEventListener('focusin', update);
      overlay.style.removeProperty('--writing-keyboard-inset');
    };
  }, [state.writing]);
  if (!state.writing) return null;
  return <form ref={formRef} className="written-answer-entry" onClick={event => event.stopPropagation()} onSubmit={event => {
    event.preventDefault();
    if (disabled || !state.text.trim()) return;
    if (!state.submitted) state.submit();
    // Dismiss the phone keyboard before revealing the answer side.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    onReveal();
  }}>
    <label className="sr-only" htmlFor={id}>{ui("Your answer")}</label>
    {teamName && <div className="written-answer-label">{teamName}</div>}
    <div className="written-answer-controls">
      <textarea id={id} rows={state.kind === 'open' ? 2 : 1} value={state.text} disabled={disabled || state.submitted} maxLength={2000}
        onChange={event => state.setText(event.target.value)} placeholder={ui("Type your answer...")} autoComplete="off" autoCorrect="off" autoCapitalize="sentences" spellCheck={false}
        onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }} />
      <button type="submit" disabled={disabled || !state.text.trim()}>{state.submitted ? ui("Show result") : ui("Submit")}</button>
    </div>
  </form>;
};

export const WrittenAnswerReview: React.FC<{ state: AnswerState }> = ({ state }) => {
  useInterfaceLanguage();
  if (!state.enabled || !state.submitted) return null;
  return <div className="written-answer-review" data-result={state.matches ? 'correct' : 'incorrect'} role="status">
    <div className="written-answer-result">
      {state.matches ? <CheckCircle aria-hidden="true" /> : <XCircle aria-hidden="true" />}
      <h2>{state.matches ? ui("Correct!") : ui("Incorrect")}</h2>
    </div>
  </div>;
};

export const WrittenAnswerContinue: React.FC<{ state: AnswerState; onContinue: () => void; disabled?: boolean }> = ({ state, onContinue, disabled = false }) => {
  useInterfaceLanguage();
  const clicked = useRef(false);
  const [committed, setCommitted] = useState(false);
  return <button type="button" className={`written-answer-continue ${state.matches ? 'is-correct' : 'is-incorrect'}`}
    disabled={disabled || committed || !state.submitted} onClick={event => {
      event.stopPropagation();
      if (clicked.current || disabled || !state.submitted) return;
      clicked.current = true;
      setCommitted(true);
      onContinue();
    }}>{ui("Continue")}</button>;
};
