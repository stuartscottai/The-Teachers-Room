import React, { useMemo, useRef, useState } from 'react';
import { WorksheetDesignerPage, WorksheetPlacedElement } from './designerTypes';
import { PlacedElement } from './PlacedElement';

type CanvasGuideLine = { pos: number; color: string };
type CanvasGuides = { v?: CanvasGuideLine[]; h?: CanvasGuideLine[] } | null;
type GuidesState = { guides: CanvasGuides; visible: boolean };

export const PagesCanvas: React.FC<{
  pages: WorksheetDesignerPage[];
  elements: WorksheetPlacedElement[];
  marginMm: number;
  selectedElementId: string | null;
  onSelectElementId: (id: string | null) => void;
  onCommitElement: (id: string, patch: Partial<WorksheetPlacedElement>) => void;
  onAddPage?: () => void;
  editingElementId?: string | null;
  onStartEditing?: (id: string) => void;
  onStopEditing?: () => void;
  onDeletePage?: (pageId: string) => void;
  pageScale?: number;
}> = ({
  pages,
  elements,
  marginMm,
  selectedElementId,
  onSelectElementId,
  onCommitElement,
  onAddPage,
  editingElementId,
  onStartEditing,
  onStopEditing,
  onDeletePage,
  pageScale = 1,
}) => {
  const guidesByPageRef = useRef<Record<string, GuidesState>>({});
  const rafRef = useRef<number | null>(null);
  const clearTimersRef = useRef<Record<string, number>>({});
  const [, bump] = useState(0);
  const scale = Math.max(0.1, pageScale || 1);

  const setGuidesForPage = (pageId: string, guides: CanvasGuides) => {
    const timers = clearTimersRef.current;
    if (timers[pageId]) {
      window.clearTimeout(timers[pageId]);
      delete timers[pageId];
    }

    const prev = guidesByPageRef.current[pageId];
    if (!guides) {
      // Keep last position briefly to allow a smooth fade-out.
      if (prev?.guides) {
        guidesByPageRef.current[pageId] = { guides: prev.guides, visible: false };
        timers[pageId] = window.setTimeout(() => {
          delete timers[pageId];
          delete guidesByPageRef.current[pageId];
          bump((v) => v + 1);
        }, 160);
      } else {
        delete guidesByPageRef.current[pageId];
      }
    } else {
      guidesByPageRef.current[pageId] = { guides, visible: true };
    }

    if (rafRef.current) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      bump((v) => v + 1);
    });
  };

  const elementsByPage = useMemo(() => {
    const map = new Map<string, WorksheetPlacedElement[]>();
    for (const el of elements) {
      const list = map.get(el.pageId) ?? [];
      list.push(el);
      map.set(el.pageId, list);
    }
    return map;
  }, [elements]);

  const getHitElements = (pageId: string, x: number, y: number) => {
    const list = elementsByPage.get(pageId) ?? [];
    return list.filter((el) => x >= el.x && x <= el.x + el.w && y >= el.y && y <= el.y + el.h);
  };

  return (
    <div
      className={`ws-canvas flex-1 min-w-0 bg-slate-200 ${scale < 1 ? 'overflow-x-hidden overflow-y-auto' : 'overflow-auto'}`}
      onMouseDown={() => onSelectElementId(null)}
    >
      <div
        className="ws-pages-wrap py-8 px-4 pb-36 flex flex-col items-center gap-6"
        style={
          {
            ['--ws-page-scale' as any]: scale,
            ['--ws-page-overflow' as any]: scale < 1 ? 'hidden' : 'visible',
          } as React.CSSProperties
        }
      >
        {pages.map((p, idx) => (
          <div
            key={p.id}
            className="ws-page relative shadow-xl border border-slate-200 bg-white"
            style={{ ['--ws-page-pad' as any]: `${marginMm}mm` }}
          >
            <div className="ws-page-scale">
              {/* Page chrome overlays */}
              <div className="no-print ws-page-chrome">
                <div className="ws-page-margin-guides" />
              </div>
              <div
                className="ws-page-inner"
                data-page-id={p.id}
                onMouseDownCapture={(e) => {
                  if (!e.altKey) return;
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const x = (e.clientX - rect.left) / scale;
                  const y = (e.clientY - rect.top) / scale;
                  const hits = getHitElements(p.id, x, y);
                  if (hits.length < 2) return;
                  e.preventDefault();
                  e.stopPropagation();
                  const selectedIndex = hits.findIndex((el) => el.id === selectedElementId);
                  const nextIndex = selectedIndex <= 0 ? hits.length - 1 : selectedIndex - 1;
                  onSelectElementId(hits[nextIndex]?.id || null);
                }}
                onMouseDown={(e) => {
                  // prevent page click from selecting elements via bubbling; handled at root
                  e.stopPropagation();
                  onSelectElementId(null);
                }}
              >
                {/* Alignment guides (only when dragging/resizing) */}
                {(() => {
                  const state = guidesByPageRef.current[p.id];
                  const guides = state?.guides || null;
                  if (!guides) return null;
                  const v = guides.v ?? [];
                  const h = guides.h ?? [];
                  if (!v.length && !h.length) return null;
                  return (
                    <div
                      className="no-print absolute inset-0 pointer-events-none"
                      style={{
                        zIndex: 260,
                        opacity: state?.visible ? 1 : 0,
                        transition: 'opacity 140ms ease',
                      }}
                    >
                      {v.map((g, i) => (
                        <div
                          key={`v-${i}`}
                          style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: `${g.pos}px`,
                            width: '1px',
                            background: g.color,
                            borderRadius: '1px',
                            boxShadow: '0 0 0 1px rgba(255,255,255,0.25)',
                            transition: 'left 55ms linear',
                          }}
                        />
                      ))}
                      {h.map((g, i) => (
                        <div
                          key={`h-${i}`}
                          style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: `${g.pos}px`,
                            height: '1px',
                            background: g.color,
                            borderRadius: '1px',
                            boxShadow: '0 0 0 1px rgba(255,255,255,0.25)',
                            transition: 'top 55ms linear',
                          }}
                        />
                      ))}
                    </div>
                  );
                })()}

                {(elementsByPage.get(p.id) ?? []).map((el) => (
                  <PlacedElement
                    key={el.id}
                    element={el}
                    otherElements={(elementsByPage.get(p.id) ?? []).filter((o) => o.id !== el.id)}
                    selected={selectedElementId === el.id}
                    editing={editingElementId === el.id}
                    onSelect={() => onSelectElementId(el.id)}
                    onRequestEdit={() => onStartEditing?.(el.id)}
                    onStopEdit={() => onStopEditing?.()}
                    onCommit={(patch) => onCommitElement(el.id, patch)}
                    onGuidesChange={setGuidesForPage}
                    pageScale={scale}
                  />
                ))}
              </div>
            </div>
            <div className="no-print text-[10px] text-slate-400 px-3 py-2 border-t border-slate-100 flex items-center justify-between">
              <span>Page {idx + 1}</span>
            </div>
          </div>
        ))}

        {onAddPage && (
          <button
            type="button"
            onClick={onAddPage}
            className="no-print ws-add-page max-w-full py-3 rounded-2xl border-2 border-dashed border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-extrabold"
          >
            + Add Page
          </button>
        )}
      </div>
    </div>
  );
};
