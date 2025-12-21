import React from 'react';
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

export const PropertiesPanel: React.FC<{
  selected: WorksheetPlacedElement | null;
  onChangeStyles: (patch: Partial<WorksheetElementStyles>) => void;
  onDelete?: () => void;
}> = ({ selected, onChangeStyles, onDelete }) => {
  if (!selected) {
    return (
      <div className="no-print flex flex-col h-full min-h-0">
        <div className="px-3 py-2 border-b border-slate-200 bg-white">
          <div className="text-sm font-extrabold text-slate-800">Properties</div>
          <div className="text-[11px] text-slate-500">Select an element</div>
        </div>
        <div className="p-3 text-xs text-slate-500">Click an element on the page to edit styles.</div>
      </div>
    );
  }

  const s = selected.styles || {};
  const shadowEnabled = (s.boxShadow || 'none') !== 'none';

  return (
    <div className="no-print flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-200 bg-white">
        <div>
          <div className="text-sm font-extrabold text-slate-800">Properties</div>
          <div className="text-[11px] text-slate-500">{selected.type.toUpperCase()}</div>
        </div>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="text-[11px] font-bold px-2 py-1 rounded border border-red-200 bg-red-50 hover:bg-red-100 text-red-700"
          >
            Delete
          </button>
        )}
      </div>

      <div className="p-3 overflow-auto space-y-4 bg-slate-50">
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <div className="text-xs font-extrabold text-slate-700 mb-2">Text</div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] font-bold text-slate-600">
              Font
              <select
                value={s.fontFamily || 'Quicksand, sans-serif'}
                onChange={(e) => onChangeStyles({ fontFamily: e.target.value })}
                className="mt-1 w-full p-2 rounded border border-slate-200 text-xs bg-white"
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-[11px] font-bold text-slate-600">
              Size
              <input
                type="number"
                value={parseFloat(s.fontSize || '14')}
                onChange={(e) => onChangeStyles({ fontSize: ensurePx(e.target.value, '14px') })}
                className="mt-1 w-full p-2 rounded border border-slate-200 text-xs bg-white"
                min={8}
                max={80}
              />
            </label>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => onChangeStyles({ fontWeight: (s.fontWeight || '400') === '700' ? '400' : '700' })}
              className={`flex-1 px-3 py-2 rounded text-xs font-bold border ${
                (s.fontWeight || '400') === '700' ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white border-slate-200'
              }`}
            >
              B
            </button>
            <button
              type="button"
              onClick={() => onChangeStyles({ fontStyle: (s.fontStyle || 'normal') === 'italic' ? 'normal' : 'italic' })}
              className={`flex-1 px-3 py-2 rounded text-xs font-bold border ${
                (s.fontStyle || 'normal') === 'italic' ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white border-slate-200'
              }`}
            >
              I
            </button>
            <button
              type="button"
              onClick={() =>
                onChangeStyles({ textDecoration: (s.textDecoration || 'none') === 'underline' ? 'none' : 'underline' })
              }
              className={`flex-1 px-3 py-2 rounded text-xs font-bold border ${
                (s.textDecoration || 'none') === 'underline' ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white border-slate-200'
              }`}
            >
              U
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <label className="text-[11px] font-bold text-slate-600">
              Align
              <select
                value={s.textAlign || 'left'}
                onChange={(e) => onChangeStyles({ textAlign: e.target.value as any })}
                className="mt-1 w-full p-2 rounded border border-slate-200 text-xs bg-white"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
                <option value="justify">Justify</option>
              </select>
            </label>
            <label className="text-[11px] font-bold text-slate-600">
              Line Height
              <input
                type="number"
                step="0.05"
                value={parseFloat(s.lineHeight || '1.35')}
                onChange={(e) => onChangeStyles({ lineHeight: ensureLineHeight(e.target.value, '1.35') })}
                className="mt-1 w-full p-2 rounded border border-slate-200 text-xs bg-white"
                min={1}
                max={2.5}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <label className="text-[11px] font-bold text-slate-600">
              Text Color
              <input
                type="color"
                value={s.color || '#0f172a'}
                onChange={(e) => onChangeStyles({ color: e.target.value })}
                className="mt-1 w-full h-9 rounded border border-slate-200 bg-white"
              />
            </label>
            <label className="text-[11px] font-bold text-slate-600">
              Background
              <input
                type="color"
                value={s.backgroundColor || '#ffffff'}
                onChange={(e) => onChangeStyles({ backgroundColor: e.target.value })}
                className="mt-1 w-full h-9 rounded border border-slate-200 bg-white"
              />
            </label>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <div className="text-xs font-extrabold text-slate-700 mb-2">Box</div>

          <div className="grid grid-cols-3 gap-2">
            <label className="text-[11px] font-bold text-slate-600">
              Border
              <input
                type="number"
                value={parseFloat(s.borderWidth || '1')}
                onChange={(e) => onChangeStyles({ borderWidth: ensurePx(e.target.value, '1px') })}
                className="mt-1 w-full p-2 rounded border border-slate-200 text-xs bg-white"
                min={0}
                max={20}
              />
            </label>

            <label className="text-[11px] font-bold text-slate-600">
              Style
              <select
                value={s.borderStyle || 'solid'}
                onChange={(e) => onChangeStyles({ borderStyle: e.target.value as any })}
                className="mt-1 w-full p-2 rounded border border-slate-200 text-xs bg-white"
              >
                {BORDER_STYLES.map((bs) => (
                  <option key={bs} value={bs}>
                    {bs}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-[11px] font-bold text-slate-600">
              Color
              <input
                type="color"
                value={s.borderColor || '#e2e8f0'}
                onChange={(e) => onChangeStyles({ borderColor: e.target.value })}
                className="mt-1 w-full h-9 rounded border border-slate-200 bg-white"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <label className="text-[11px] font-bold text-slate-600">
              Radius
              <input
                type="number"
                value={parseFloat(s.borderRadius || '10')}
                onChange={(e) => onChangeStyles({ borderRadius: ensurePx(e.target.value, '10px') })}
                className="mt-1 w-full p-2 rounded border border-slate-200 text-xs bg-white"
                min={0}
                max={60}
              />
            </label>

            <label className="text-[11px] font-bold text-slate-600">
              Padding
              <input
                type="number"
                value={parseFloat(s.padding || '12')}
                onChange={(e) => onChangeStyles({ padding: ensurePx(e.target.value, '12px') })}
                className="mt-1 w-full p-2 rounded border border-slate-200 text-xs bg-white"
                min={0}
                max={80}
              />
            </label>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
              <input
                type="checkbox"
                checked={shadowEnabled}
                onChange={(e) =>
                  onChangeStyles({
                    boxShadow: e.target.checked ? '0 8px 24px rgba(15,23,42,0.15)' : 'none',
                  })
                }
              />
              Shadow
            </label>
            <button
              type="button"
              onClick={() =>
                onChangeStyles({
                  boxShadow: shadowEnabled ? '0 12px 30px rgba(15,23,42,0.22)' : '0 8px 24px rgba(15,23,42,0.15)',
                })
              }
              className="ml-auto text-[11px] font-bold px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
            >
              Boost
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

