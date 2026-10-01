import { translateInterfaceText as ui, useInterfaceLanguage } from '../../utils/interfaceLanguage';
import React, { useEffect, useRef, useState, useId } from 'react';

export type TextMark = { start: number; end: number; highlight: boolean; underline: boolean };

// Store text offsets, never editable HTML, so overlapping marks remain predictable.
export function ReadingPassage({ title, text, marks, onChange, emphasis, readOnly = false }: {
  title: string; text: string; marks: TextMark[]; onChange: (marks: TextMark[]) => void; emphasis?: { start: number; end: number }[]; readOnly?: boolean;
}) {
  useInterfaceLanguage();
  const helpId = useId();
  const passage = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<{ start: number; end: number } | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (readOnly) return;
    const capture = () => {
      const selection = window.getSelection();
      const root = passage.current;
      if (!root || !selection?.rangeCount || selection.isCollapsed) { setSelected(null); return; }
      const range = selection.getRangeAt(0);
      if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) { setSelected(null); return; }
      const before = range.cloneRange();
      before.selectNodeContents(root);
      before.setEnd(range.startContainer, range.startOffset);
      const start = before.toString().length;
      setSelected({ start, end: start + range.toString().length });
    };
    document.addEventListener('selectionchange', capture);
    return () => document.removeEventListener('selectionchange', capture);
  }, [text, readOnly]);

  const apply = (action: 'highlight' | 'underline' | 'remove') => {
    if (!selected) return;
    const flags = Array.from({ length: text.length }, () => ({ highlight: false, underline: false }));
    for (const mark of marks) for (let i = mark.start; i < Math.min(mark.end, text.length); i++) {
      if (i >= 0) flags[i] = { highlight: mark.highlight, underline: mark.underline };
    }
    for (let i = selected.start; i < Math.min(selected.end, text.length); i++) {
      if (action === 'remove') flags[i] = { highlight: false, underline: false };
      else flags[i][action] = true;
    }
    const result: TextMark[] = [];
    flags.forEach((flag, i) => {
      if (!flag.highlight && !flag.underline) return;
      const last = result[result.length - 1];
      if (last && last.end === i && last.highlight === flag.highlight && last.underline === flag.underline) last.end++;
      else result.push({ start: i, end: i + 1, ...flag });
    });
    onChange(result);
    setNotice(action === 'remove' ? 'Marks removed from selected text.' : `${action === 'highlight' ? 'Highlight' : 'Underline'} added.`);
    window.getSelection()?.removeAllRanges();
    setSelected(null);
  };

  const sourceHighlights = emphasis || [];
  const boundaries = [...new Set([0, text.length, ...[...marks, ...sourceHighlights].flatMap(mark => [mark.start, mark.end])])].sort((a, b) => a - b);
  return <section className="class-reading" aria-label={title}>
    <h3>{title}</h3>
    {!readOnly && <><p className="class-help" id={helpId}>{ui("Select text below, then choose a tool. Remove marks clears your highlighting and underlining.")}{emphasis && ui(" Yellow words supplied by the exercise stay highlighted.")}</p>
    <div className="class-tools" role="group" aria-label={ui("Reading annotation tools")}>
      {(['highlight', 'underline', 'remove'] as const).map(action => <button key={action} type="button" disabled={!selected}
        onPointerDown={event => event.preventDefault()} onClick={() => apply(action)}>
        {ui(action === 'remove' ? "Remove marks" : action === 'highlight' ? "Highlight" : "Underline")}
      </button>)}
    </div></>}
    <div ref={passage} className="class-passage" tabIndex={readOnly ? undefined : 0} aria-describedby={readOnly ? undefined : helpId} data-testid={readOnly ? undefined : 'reading-passage'}>
      {boundaries.slice(0, -1).map((start, i) => {
        const mark = marks.find(item => item.start <= start && item.end > start);
        const sourceHighlight = sourceHighlights.some(item => item.start <= start && item.end > start);
        return <span key={start} className={`${mark?.highlight || sourceHighlight ? 'class-highlight' : ''} ${mark?.underline ? 'class-underline' : ''}`}>{text.slice(start, boundaries[i + 1])}</span>;
      })}
    </div>
    {!readOnly && <p className="class-help class-announcement" role="status">{ui(notice)}</p>}
  </section>;
}
