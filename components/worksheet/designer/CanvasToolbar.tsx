import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, ChevronDown, ChevronUp } from 'lucide-react';
import { WorksheetElementStyles, WorksheetPlacedElement } from './designerTypes';

const FONT_OPTIONS = [
  { label: 'Quicksand', value: 'Quicksand, sans-serif' },
  { label: 'Fredoka', value: 'Fredoka, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times', value: '"Times New Roman", serif' },
  { label: 'Courier', value: '"Courier New", monospace' },
];

const BORDER_STYLES = ['none', 'solid', 'dashed', 'dotted'] as const;

const ensurePx = (value: string | number | undefined, fallback: string): string => {
  if (value === undefined || value === null) return fallback;
  const s = String(value).trim();
  if (!s) return fallback;
  if (s.endsWith('px')) return s;
  if (/^\d+(\.\d+)?$/.test(s)) return `${s}px`;
  return s;
};

const ensureLineHeight = (value: string | number | undefined, fallback: string): string => {
  if (value === undefined || value === null) return fallback;
  const s = String(value).trim();
  if (!s) return fallback;
  return s;
};

const shadowFor = (level: number): string => {
  if (level <= 0) return 'none';
  if (level === 1) return '0 8px 24px rgba(15,23,42,0.15)';
  if (level === 2) return '0 12px 30px rgba(15,23,42,0.22)';
  return '0 20px 50px rgba(15,23,42,0.28)';
};

const shadowLevelFrom = (boxShadow?: string): number => {
  if (!boxShadow || boxShadow === 'none') return 0;
  if (boxShadow.includes('50px')) return 3;
  if (boxShadow.includes('30px')) return 2;
  return 1;
};

export const CanvasToolbar: React.FC<{
  selected: WorksheetPlacedElement | null;
  editing?: boolean;
  onChangeStyles: (patch: Partial<WorksheetElementStyles>) => void;
  onDelete: () => void;
  onFocusContent: () => void;
  onSendToTray?: () => void;
  onSplit?: () => void;
  onMerge?: () => void;
  canSplit?: boolean;
  canMerge?: boolean;
}> = ({ selected, editing, onChangeStyles, onDelete, onFocusContent, onSendToTray, onSplit, onMerge, canSplit, canMerge }) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (root.contains(e.target as Node)) return;
      const target = e.target as HTMLElement | null;
      if (target && target.closest('.ws-placed-element')) return;
      setIsMoreOpen(false);
    };
    document.addEventListener('mousedown', onDown, true);
    return () => document.removeEventListener('mousedown', onDown, true);
  }, []);

  if (!selected) return null;

  const s = selected.styles || {};
  const isBold = (s.fontWeight || '400') === '700';
  const isItalic = (s.fontStyle || 'normal') === 'italic';
  const isUnderline = (s.textDecoration || 'none') === 'underline';
  const align = s.textAlign || 'left';
  const bgEnabled = (s.backgroundColor || 'transparent') !== 'transparent';
  const borderEnabled = (s.borderStyle || 'none') !== 'none';
  const shadowLevel = shadowLevelFrom(s.boxShadow);

  const fontSizeNumber = useMemo(() => {
    const n = parseFloat(s.fontSize || '12');
    return Number.isFinite(n) ? n : 12;
  }, [s.fontSize]);

  const paddingNumber = useMemo(() => {
    const n = parseFloat(s.padding || '12');
    return Number.isFinite(n) ? n : 12;
  }, [s.padding]);

  const radiusNumber = useMemo(() => {
    const n = parseFloat(s.borderRadius || '10');
    return Number.isFinite(n) ? n : 10;
  }, [s.borderRadius]);

  const borderWidthNumber = useMemo(() => {
    const n = parseFloat(s.borderWidth || '1');
    return Number.isFinite(n) ? n : 1;
  }, [s.borderWidth]);

  const lineHeightNumber = useMemo(() => {
    const n = parseFloat(s.lineHeight || '1.35');
    return Number.isFinite(n) ? n : 1.35;
  }, [s.lineHeight]);

  const applyInline = (command: 'bold' | 'italic' | 'underline', fallback: () => void) => {
    if (!editing || !selected) {
      fallback();
      return;
    }
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      fallback();
      return;
    }
    const root = document.querySelector(`[data-element-id="${selected.id}"] .ws-element-content`) as HTMLElement | null;
    if (!root || !root.contains(selection.anchorNode)) {
      fallback();
      return;
    }
    document.execCommand(command);
  };

  const runHistoryCommand = (command: 'undo' | 'redo') => {
    if (!selected) return;
    const exec = () => {
      const root = document.querySelector(
        `[data-element-id="${selected.id}"] .ws-element-content`
      ) as HTMLElement | null;
      if (!root) return;
      root.focus();
      document.execCommand(command);
    };

    if (!editing) {
      onFocusContent();
      window.setTimeout(exec, 0);
    } else {
      exec();
    }
  };

  return (
    <div
      ref={rootRef}
      className="no-print ws-canvas-toolbar pointer-events-auto relative"
      style={{ zIndex: 10060 }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="bg-white/95 backdrop-blur border border-slate-200 shadow-lg rounded-2xl px-2 py-2 flex flex-col gap-1.5">
        {isMoreOpen ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            <select
              value={s.fontFamily || 'Quicksand, sans-serif'}
              onChange={(e) => onChangeStyles({ fontFamily: e.target.value })}
              className="w-32 px-2 py-1.5 rounded-xl border border-slate-200 text-xs bg-white font-extrabold text-slate-700"
              title="Font family"
              aria-label="Font family"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>

            <input
              type="number"
              step="0.05"
              min={1}
              max={2.5}
              value={lineHeightNumber}
              onChange={(e) => onChangeStyles({ lineHeight: ensureLineHeight(e.target.value, '1.35') })}
              className="w-16 px-2 py-1.5 rounded-xl border border-slate-200 text-xs bg-white font-extrabold text-slate-700"
              title="Line height"
              aria-label="Line height"
            />

            <input
              type="number"
              min={0}
              max={80}
              value={paddingNumber}
              onChange={(e) => onChangeStyles({ padding: ensurePx(e.target.value, '12px') })}
              className="w-16 px-2 py-1.5 rounded-xl border border-slate-200 text-xs bg-white font-extrabold text-slate-700"
              title="Padding (px)"
              aria-label="Padding"
            />

            <input
              type="number"
              min={0}
              max={60}
              value={radiusNumber}
              onChange={(e) => onChangeStyles({ borderRadius: ensurePx(e.target.value, '10px') })}
              className="w-16 px-2 py-1.5 rounded-xl border border-slate-200 text-xs bg-white font-extrabold text-slate-700"
              title="Corner radius (px)"
              aria-label="Corner radius"
            />

            <input
              type="color"
              value={s.color || '#0f172a'}
              onChange={(e) => onChangeStyles({ color: e.target.value })}
              className="w-9 h-9 rounded-xl border border-slate-200 bg-white"
              title="Text color"
              aria-label="Text color"
            />

            <button
              type="button"
              onClick={() => onChangeStyles({ backgroundColor: bgEnabled ? 'transparent' : '#ffffff' })}
              className={`px-2.5 py-2 rounded-xl text-xs font-extrabold border ${
                bgEnabled ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-700'
              }`}
              title="Toggle background"
            >
              Bg
            </button>
            <input
              type="color"
              value={(s.backgroundColor && s.backgroundColor !== 'transparent' ? s.backgroundColor : '#ffffff') as string}
              onChange={(e) => onChangeStyles({ backgroundColor: e.target.value })}
              className="w-9 h-9 rounded-xl border border-slate-200 bg-white"
              disabled={!bgEnabled}
              title="Background color"
              aria-label="Background color"
            />

            <button
              type="button"
              onClick={() =>
                onChangeStyles(
                  borderEnabled
                    ? { borderStyle: 'none', borderWidth: '0px', borderColor: 'transparent' }
                    : { borderStyle: 'solid', borderWidth: '1px', borderColor: '#e2e8f0' }
                )
              }
              className={`px-2.5 py-2 rounded-xl text-xs font-extrabold border ${
                borderEnabled ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-700'
              }`}
              title="Toggle border"
            >
              Bd
            </button>

            <input
              type="number"
              min={0}
              max={20}
              value={borderWidthNumber}
              onChange={(e) => onChangeStyles({ borderWidth: ensurePx(e.target.value, '1px') })}
              className="w-14 px-2 py-1.5 rounded-xl border border-slate-200 text-xs bg-white font-extrabold text-slate-700"
              disabled={!borderEnabled}
              title="Border width (px)"
              aria-label="Border width"
            />

            <select
              value={s.borderStyle || 'solid'}
              onChange={(e) => onChangeStyles({ borderStyle: e.target.value as any })}
              className="w-20 px-2 py-1.5 rounded-xl border border-slate-200 text-xs bg-white font-extrabold text-slate-700"
              disabled={!borderEnabled}
              title="Border style"
              aria-label="Border style"
            >
              {BORDER_STYLES.map((bs) => (
                <option key={bs} value={bs}>
                  {bs}
                </option>
              ))}
            </select>

            <input
              type="color"
              value={s.borderColor || '#e2e8f0'}
              onChange={(e) => onChangeStyles({ borderColor: e.target.value })}
              className="w-9 h-9 rounded-xl border border-slate-200 bg-white"
              disabled={!borderEnabled}
              title="Border color"
              aria-label="Border color"
            />

            <input
              type="range"
              min={0}
              max={3}
              step={1}
              value={shadowLevel}
              onChange={(e) => onChangeStyles({ boxShadow: shadowFor(parseInt(e.target.value, 10) || 0) })}
              className="w-16"
              title="Shadow intensity"
              aria-label="Shadow intensity"
            />
          </div>
        ) : null}

        <div className="flex items-center gap-1.5 flex-nowrap whitespace-nowrap overflow-x-auto">
          <button
            type="button"
            onClick={onFocusContent}
            className="px-3 py-2 rounded-xl text-xs font-extrabold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            title="Edit text (double-click also works)"
          >
            Edit
          </button>

          {onSendToTray && (
            <button
              type="button"
              onClick={onSendToTray}
              className="px-3 py-2 rounded-xl text-xs font-extrabold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              title="Remove from page and return to blocks tray"
            >
              To Tray
            </button>
          )}

          {onSplit && canSplit && (
            <button
              type="button"
              onClick={onSplit}
              className="px-3 py-2 rounded-xl text-xs font-extrabold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              title="Split this text block across pages"
            >
              Split
            </button>
          )}

          {onMerge && canMerge && (
            <button
              type="button"
              onClick={onMerge}
              className="px-3 py-2 rounded-xl text-xs font-extrabold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              title="Merge split blocks back together"
            >
              Merge
            </button>
          )}

          <div className="h-7 w-px bg-slate-200 mx-1" />

          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            Sz
            <input
              type="number"
              min={8}
              max={80}
              value={fontSizeNumber}
              onChange={(e) => onChangeStyles({ fontSize: ensurePx(e.target.value, '12px') })}
              className="w-16 p-2 rounded-xl border border-slate-200 text-xs bg-white"
              title="Font size"
              aria-label="Font size"
            />
          </div>

          <button
            type="button"
            onClick={() => runHistoryCommand('undo')}
            onMouseDown={(e) => e.preventDefault()}
            className="px-3 py-2 rounded-xl text-xs font-extrabold border bg-white border-slate-200 text-slate-700"
            title="Undo"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => runHistoryCommand('redo')}
            onMouseDown={(e) => e.preventDefault()}
            className="px-3 py-2 rounded-xl text-xs font-extrabold border bg-white border-slate-200 text-slate-700"
            title="Redo"
          >
            Redo
          </button>

          <button
            type="button"
            onClick={() =>
              applyInline('bold', () => onChangeStyles({ fontWeight: isBold ? '400' : '700' }))
            }
            onMouseDown={(e) => e.preventDefault()}
            className={`px-3 py-2 rounded-xl text-xs font-extrabold border ${
              isBold ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white border-slate-200 text-slate-700'
            }`}
            title="Bold"
          >
            B
          </button>
          <button
            type="button"
            onClick={() =>
              applyInline('italic', () => onChangeStyles({ fontStyle: isItalic ? 'normal' : 'italic' }))
            }
            onMouseDown={(e) => e.preventDefault()}
            className={`px-3 py-2 rounded-xl text-xs font-extrabold border ${
              isItalic ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white border-slate-200 text-slate-700'
            }`}
            title="Italic"
          >
            I
          </button>
          <button
            type="button"
            onClick={() =>
              applyInline('underline', () =>
                onChangeStyles({ textDecoration: isUnderline ? 'none' : 'underline' })
              )
            }
            onMouseDown={(e) => e.preventDefault()}
            className={`px-3 py-2 rounded-xl text-xs font-extrabold border ${
              isUnderline ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white border-slate-200 text-slate-700'
            }`}
            title="Underline"
          >
            U
          </button>

          <div className="h-7 w-px bg-slate-200 mx-1" />

          <button
            type="button"
            onClick={() => onChangeStyles({ textAlign: 'left' })}
            className={`px-3 py-2 rounded-xl text-xs font-extrabold border ${
              align === 'left' ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white border-slate-200 text-slate-700'
            }`}
            title="Align left"
            aria-label="Align left"
          >
            <AlignLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => onChangeStyles({ textAlign: 'center' })}
            className={`px-3 py-2 rounded-xl text-xs font-extrabold border ${
              align === 'center'
                ? 'bg-brand-blue text-white border-brand-blue'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
            title="Align center"
            aria-label="Align center"
          >
            <AlignCenter size={16} />
          </button>
          <button
            type="button"
            onClick={() => onChangeStyles({ textAlign: 'right' })}
            className={`px-3 py-2 rounded-xl text-xs font-extrabold border ${
              align === 'right' ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white border-slate-200 text-slate-700'
            }`}
            title="Align right"
            aria-label="Align right"
          >
            <AlignRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => onChangeStyles({ textAlign: 'justify' })}
            className={`px-3 py-2 rounded-xl text-xs font-extrabold border ${
              align === 'justify'
                ? 'bg-brand-blue text-white border-brand-blue'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
            title="Justify"
            aria-label="Justify"
          >
            <AlignJustify size={16} />
          </button>

          <div className="h-7 w-px bg-slate-200 mx-1" />

          <button
            type="button"
            onClick={() => setIsMoreOpen((v) => !v)}
            className={`px-3 py-2 rounded-xl text-xs font-extrabold border ${
              isMoreOpen ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-700'
            }`}
            title={isMoreOpen ? 'Hide extra tools' : 'Show extra tools'}
          >
            <span className="inline-flex items-center gap-1">
              More {isMoreOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </span>
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="px-3 py-2 rounded-xl text-xs font-extrabold border border-red-200 bg-red-50 hover:bg-red-100 text-red-700"
            title="Delete element"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
