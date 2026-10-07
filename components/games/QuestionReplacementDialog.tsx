import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import type { GeneratedGame, GeneratedQuestion } from '../../types';
import { replaceGameQuestion } from '../../services/geminiService';
import { isReplacementSourceRequired, type ReplacementReason } from '../../utils/questionReplacement';
import { translateInterfaceText as ui, useInterfaceLanguage } from '../../utils/interfaceLanguage';
import { useWorkspaceDialog } from './GameWorkspace';

export const QuestionReplacementDialog: React.FC<{
  game: GeneratedGame;
  question: GeneratedQuestion;
  category?: string;
  otherPrompts: string[];
  onAccept: (replacement: GeneratedQuestion, chooseImage?: boolean) => void;
  onClose: () => void;
}> = ({ game, question, category, otherPrompts, onAccept, onClose }) => {
  useInterfaceLanguage();
  const dialog = useWorkspaceDialog(true, onClose);
  const [reason, setReason] = useState<ReplacementReason>('different');
  const [feedback, setFeedback] = useState('');
  const [sourceExcerpt, setSourceExcerpt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [proposal, setProposal] = useState<GeneratedQuestion | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);
  const sourceRequired = isReplacementSourceRequired(game.config, question);

  const generate = async () => {
    if (busy || proposal) return;
    setBusy(true); setError('');
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      const next = await replaceGameQuestion({ config: game.config, original: question, category, reason, feedback, sourceExcerpt, sourceRequired, otherPrompts }, controller.signal);
      if (!controller.signal.aborted) setProposal(next);
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'The replacement could not be generated. Your original question is unchanged.');
    } finally { if (!controller.signal.aborted) setBusy(false); }
  };

  return <div className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
    <div ref={dialog} role="dialog" aria-modal="true" aria-label={ui('Replace question')} tabIndex={-1}
      className="relative max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <button type="button" aria-label={ui('Close replacement')} onClick={onClose} className="absolute top-3 right-3 rounded-lg p-2 text-slate-500"><X size={20} /></button>
      <h2 className="pr-10 text-xl font-bold">{ui('Replace question')}</h2>
      <p className="mt-2 text-sm text-slate-600">{ui('Review one replacement before accepting it. Your original question stays until you choose to replace it.')}</p>
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <h3 className="mb-1 text-xs font-bold uppercase text-slate-500">{ui('Original question')}</h3>
        <p translate="no" className="notranslate whitespace-pre-wrap break-words text-sm">{question.question}</p>
      </div>
      {!proposal && <div className="mt-4 space-y-4">
        <label className="block text-sm font-semibold">{ui('What should change?')}
          <select aria-label={ui('What should change?')} value={reason} disabled={busy} onChange={event => setReason(event.target.value as ReplacementReason)} className="mt-1 w-full rounded-lg border-slate-300 text-sm">
            <option value="different">{ui('Give me a different question')}</option>
            <option value="wrong-answer">{ui('The answer is wrong')}</option>
            <option value="ambiguous">{ui('More than one answer could be correct')}</option>
            <option value="off-topic">{ui('The question is off-topic')}</option>
            <option value="too-easy">{ui('The question is too easy')}</option>
            <option value="too-difficult">{ui('The question is too difficult')}</option>
          </select>
        </label>
        <label className="block text-sm font-semibold">{ui('Tell the AI more (optional)')}
          <textarea aria-label={ui('Tell the AI more (optional)')} value={feedback} maxLength={1000} rows={2} disabled={busy} onChange={event => setFeedback(event.target.value)} className="mt-1 w-full rounded-lg border-slate-300 text-sm" />
        </label>
        <label className="block text-sm font-semibold">{sourceRequired ? ui('Relevant source passage (required)') : ui('Relevant source passage (optional)')}
          <textarea aria-label={sourceRequired ? ui('Relevant source passage (required)') : ui('Relevant source passage (optional)')} value={sourceExcerpt} maxLength={12000} rows={3} disabled={busy} onChange={event => setSourceExcerpt(event.target.value)} className="mt-1 w-full rounded-lg border-slate-300 text-sm" />
          {sourceRequired && <span className="mt-1 block text-xs font-normal text-slate-500">{ui('Paste the relevant part of your source so the replacement stays accurate without rereading the whole document.')}</span>}
        </label>
      </div>}
      {proposal && <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-3">
        <h3 className="mb-2 text-sm font-bold">{ui('Proposed replacement')}</h3>
        <div translate="no" className="notranslate space-y-2 whitespace-pre-wrap break-words text-sm">
          <p className="font-semibold">{proposal.question}</p>
          {proposal.options?.map((option, index) => <p key={index}>{String.fromCharCode(65 + index)}. {option}</p>)}
          <p><strong>{ui('Answer:')}</strong> {proposal.answer}</p>
          {proposal.surveyAnswers?.map((answer, index) => <p key={index}>{answer.text} · {answer.score}</p>)}
        </div>
        {!!question.image && <p className="mt-3 text-xs text-slate-600">{ui('The old question image will be removed. You can choose a new image after accepting.')}</p>}
      </div>}
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{ui(error)}</p>}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onClose} className="workspace-button">{ui('Keep original')}</button>
        {proposal ? <>
          <button type="button" onClick={() => onAccept(proposal)} className="workspace-button">{ui('Use this question')}</button>
          <button type="button" onClick={() => onAccept(proposal, true)} className="workspace-button workspace-button-primary">{ui('Use question & choose image')}</button>
        </>
          : <button type="button" disabled={busy || (sourceRequired && !sourceExcerpt.trim())} onClick={() => void generate()} className="workspace-button workspace-button-primary"><RefreshCw size={16} aria-hidden="true" />{busy ? ui('Generating replacement...') : ui('Suggest a replacement')}</button>}
      </div>
    </div>
  </div>;
};
