import React from 'react';
import { WorksheetBlock } from './designerTypes';

export const BlocksTray: React.FC<{
  blocks: WorksheetBlock[];
  onClear?: () => void;
}> = ({ blocks, onClear }) => {
  return (
    <div className="no-print flex flex-col">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-200 bg-white">
        <div>
          <div className="text-sm font-extrabold text-slate-800">Blocks</div>
          <div className="text-[11px] text-slate-500">Drag onto the page</div>
        </div>
        {onClear && blocks.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] font-bold px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
          >
            Clear
          </button>
        )}
      </div>

      <div className="p-3 space-y-2 bg-slate-50">
        {blocks.length === 0 ? (
          <div className="text-xs text-slate-500 bg-white border border-slate-200 rounded-xl p-3">
            Generate with AI to populate blocks.
          </div>
        ) : (
          blocks.map((b) => (
            <div
              key={b.id}
              data-block-id={b.id}
              className="ws-block-card select-none bg-white border border-slate-200 rounded-xl p-2 shadow-sm hover:shadow transition-shadow cursor-grab active:cursor-grabbing"
              title="Drag onto the page"
            >
              <div className="text-[11px] font-extrabold text-slate-700 mb-1">{b.title}</div>
              <div
                className="text-[11px] text-slate-600 leading-snug max-h-20 overflow-hidden rounded-lg border border-slate-100 bg-slate-50 p-2"
                dangerouslySetInnerHTML={{ __html: b.previewHtml }}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
