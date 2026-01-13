import React, { useEffect, useMemo, useRef } from 'react';
import interact from 'interactjs';
import { sanitizeHtml } from './designerHelpers';
import { WorksheetPlacedElement } from './designerTypes';

type CommitPatch = Partial<Pick<WorksheetPlacedElement, 'x' | 'y' | 'w' | 'h' | 'html' | 'styles' | 'pageId'>>;
type CanvasGuideLine = { pos: number; color: string };
type CanvasGuides = { v?: CanvasGuideLine[]; h?: CanvasGuideLine[] } | null;

type PlacedElementProps = {
  element: WorksheetPlacedElement;
  otherElements: WorksheetPlacedElement[];
  selected: boolean;
  editing: boolean;
  onSelect: () => void;
  onRequestEdit: () => void;
  onStopEdit: () => void;
  onCommit: (patch: CommitPatch) => void;
  onGuidesChange?: (pageId: string, guides: CanvasGuides) => void;
  pageScale?: number;
};

const PlacedElementImpl: React.FC<PlacedElementProps> = ({
  element,
  otherElements,
  selected,
  editing,
  onSelect,
  onRequestEdit,
  onStopEdit,
  onCommit,
  onGuidesChange,
  pageScale = 1,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<{ t: number; x: number; y: number } | null>(null);
  const downRef = useRef<{ x: number; y: number } | null>(null);
  const lastAutoFitKeyRef = useRef<string>('');
  const lastImageFitKeyRef = useRef<string>('');
  const suppressDragRef = useRef(false);
  const requestEditRef = useRef<() => void>(() => {});
  const scale = Math.max(0.1, pageScale || 1);

  const requestEdit = () => {
    if (editing) return;
    onSelect();
    onRequestEdit();
    window.setTimeout(() => {
      contentRef.current?.focus();
    }, 0);
  };
  requestEditRef.current = requestEdit;

  const wrapperStyle = useMemo<React.CSSProperties>(() => {
    const s = element.styles || {};
    const borderStyle = s.borderStyle && s.borderStyle !== 'none' ? s.borderStyle : 'none';
    const borderWidth = borderStyle === 'none' ? '0px' : s.borderWidth || '1px';
    const borderColor = s.borderColor || '#e2e8f0';
    return {
      width: `${element.w}px`,
      height: `${element.h}px`,
      transform: `translate(${element.x}px, ${element.y}px)`,
      borderStyle,
      borderWidth,
      borderColor,
      borderRadius: s.borderRadius || '10px',
      backgroundColor: s.backgroundColor || 'transparent',
      boxShadow: s.boxShadow || 'none',
      position: 'absolute',
      left: 0,
      top: 0,
      overflow: 'hidden',
      userSelect: editing ? 'text' : 'none',
      zIndex: selected ? 50 : 10,
      cursor: editing ? 'text' : 'grab',
    };
  }, [editing, element.h, element.styles, element.w, element.x, element.y, selected]);

  const contentStyle = useMemo<React.CSSProperties>(() => {
    const s = element.styles || {};
    const isImage = element.type === 'image';
    return {
      fontFamily: s.fontFamily || 'Quicksand, sans-serif',
      fontSize: s.fontSize || '14px',
      fontWeight: s.fontWeight || '400',
      fontStyle: s.fontStyle || 'normal',
      textDecoration: s.textDecoration || 'none',
      textAlign: s.textAlign || 'left',
      lineHeight: s.lineHeight || '1.35',
      color: s.color || '#0f172a',
      padding: isImage ? '0px' : s.padding || '12px',
      width: '100%',
      height: '100%',
      outline: 'none',
      overflow: 'hidden',
    };
  }, [element.styles, element.type]);

  useEffect(() => {
    if (editing) return;
    const content = contentRef.current;
    if (!content) return;

    const key = `${element.id}|${element.html}`;
    if (lastAutoFitKeyRef.current === key) return;
    lastAutoFitKeyRef.current = key;

    window.requestAnimationFrame(() => {
      const measured = contentRef.current?.scrollHeight ?? 0;
      if (!measured) return;
      const nextH = Math.max(MIN_H, Math.ceil(measured));
      // Only shrink (avoid unexpected growth); require meaningful whitespace removal
      if (nextH > 0 && nextH < element.h - 24) {
        onCommit({ h: nextH });
      }
    });
  }, [editing, element.h, element.html, element.id, onCommit]);

  useEffect(() => {
    if (editing || element.type !== 'image') return;
    const content = contentRef.current;
    if (!content) return;
    const img = content.querySelector('img') as HTMLImageElement | null;
    if (!img) return;
    const key = `${element.id}|${element.html}|${element.w}|${element.h}`;
    if (lastImageFitKeyRef.current === key) return;
    const applyFit = () => {
      if (!img.naturalWidth || !img.naturalHeight) return;
      const ratio = img.naturalHeight / img.naturalWidth;
      const targetH = Math.max(MIN_H, Math.round(element.w * ratio));
      const targetW = Math.max(80, Math.round(element.h / ratio));
      const deltaH = Math.abs(targetH - element.h);
      const deltaW = Math.abs(targetW - element.w);
      if (deltaH <= deltaW && deltaH > 8) {
        onCommit({ h: targetH });
      } else if (deltaW < deltaH && deltaW > 8) {
        onCommit({ w: targetW });
      }
      lastImageFitKeyRef.current = key;
    };
    if (img.complete) {
      applyFit();
      return;
    }
    const handleLoad = () => {
      applyFit();
    };
    img.addEventListener('load', handleLoad);
    return () => img.removeEventListener('load', handleLoad);
  }, [editing, element.h, element.html, element.id, element.type, element.w, onCommit]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    el.setAttribute('data-x', String(element.x));
    el.setAttribute('data-y', String(element.y));
  }, [element.x, element.y]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

      const updateTransform = (target: HTMLElement, x: number, y: number) => {
        target.style.transform = `translate(${x}px, ${y}px)`;
        target.setAttribute('data-x', String(x));
        target.setAttribute('data-y', String(y));
    };

    const elevate = (target: HTMLElement) => {
      target.style.willChange = 'transform';
      target.style.zIndex = '200';
    };

    const unelevate = (target: HTMLElement) => {
      target.style.willChange = '';
      target.style.zIndex = '';
    };

    const interactable = interact(el);

    if (!editing) {
      interactable.draggable({
        inertia: false,
        // Drag from anywhere when not editing
        ignoreFrom: '.ws-resize-handle, input, select, button, a',
        modifiers: [],
        listeners: {
          start(event) {
            if (suppressDragRef.current) {
              suppressDragRef.current = false;
              event.interaction.stop();
              return;
            }
            elevate(event.target as HTMLElement);
            onGuidesChange?.(element.pageId, null);
          },
          move(event) {
            const target = event.target as HTMLElement;
            const rawX = (parseFloat(target.getAttribute('data-x') || '0') || 0) + event.dx / scale;
            const rawY = (parseFloat(target.getAttribute('data-y') || '0') || 0) + event.dy / scale;
            const snapped = computeMoveSnapAndGuides({
              x: rawX,
              y: rawY,
              w: element.w,
              h: element.h,
              otherElements,
              parentEl: target.parentElement as HTMLElement | null,
              allowOverflow: true,
              pageScale: scale,
            });
            updateTransform(target, snapped.x, snapped.y);
            onGuidesChange?.(element.pageId, snapped.guides);
          },
          end(event) {
            const target = event.target as HTMLElement;
            unelevate(target);
            const x = parseFloat(target.getAttribute('data-x') || '0') || 0;
            const y = parseFloat(target.getAttribute('data-y') || '0') || 0;
            const targetRect = target.getBoundingClientRect();
            const clientX =
              (event as any).clientX ??
              (event as any).pageX ??
              (event as any).interaction?.coords?.cur?.client?.x ??
              0;
            const clientY =
              (event as any).clientY ??
              (event as any).pageY ??
              (event as any).interaction?.coords?.cur?.client?.y ??
              0;
            const hit = document
              .elementsFromPoint(clientX, clientY)
              .find((el) => (el as HTMLElement).classList?.contains('ws-page-inner')) as HTMLElement | undefined;
            if (hit) {
              const pageId = hit.getAttribute('data-page-id') || element.pageId;
              const pageRect = hit.getBoundingClientRect();
              const nextX = (targetRect.left - pageRect.left) / scale;
              const nextY = (targetRect.top - pageRect.top) / scale;
              onCommit({ x: nextX, y: nextY, pageId });
            } else {
              onCommit({ x, y });
            }
            onGuidesChange?.(element.pageId, null);
          },
        },
      });

      interactable.resizable({
        inertia: false,
        edges: {
          left: '.ws-resize-handle-w, .ws-resize-handle-nw, .ws-resize-handle-sw',
          right: '.ws-resize-handle-e, .ws-resize-handle-ne, .ws-resize-handle-se',
          top: '.ws-resize-handle-n, .ws-resize-handle-nw, .ws-resize-handle-ne',
          bottom: '.ws-resize-handle-s, .ws-resize-handle-sw, .ws-resize-handle-se',
        },
        modifiers: [
          interact.modifiers.restrictEdges({
            outer: 'parent',
            endOnly: false,
          }),
          interact.modifiers.restrictSize({
            min: { width: 80, height: 50 },
          }),
        ],
        listeners: {
          start(event) {
            elevate(event.target as HTMLElement);
            onGuidesChange?.(element.pageId, null);
          },
          move(event) {
            const target = event.target as HTMLElement;
            const deltaLeft = (event.deltaRect?.left || 0) / scale;
            const deltaTop = (event.deltaRect?.top || 0) / scale;
            const deltaRight = (event.deltaRect?.right || 0) / scale;
            const deltaBottom = (event.deltaRect?.bottom || 0) / scale;
            const x = (parseFloat(target.getAttribute('data-x') || '0') || 0) + deltaLeft;
            const y = (parseFloat(target.getAttribute('data-y') || '0') || 0) + deltaTop;

            let rawW = event.rect.width / scale;
            let rawH = event.rect.height / scale;
            const edges = (event as any).edges as
              | { left?: boolean; right?: boolean; top?: boolean; bottom?: boolean }
              | undefined;
            let nextX = x;
            let nextY = y;

            if (element.type === 'image' && edges) {
              const isCorner = (edges.left || edges.right) && (edges.top || edges.bottom);
              if (isCorner) {
                const ratio = element.w > 0 ? element.h / element.w : 1;
                const dx = Math.abs(deltaLeft + deltaRight);
                const dy = Math.abs(deltaTop + deltaBottom);
                if (dy > dx) {
                  rawH = Math.max(50, rawH);
                  rawW = Math.max(80, Math.round(rawH / (ratio || 1)));
                } else {
                  rawW = Math.max(80, rawW);
                  rawH = Math.max(50, Math.round(rawW * (ratio || 1)));
                }

                const deltaW = rawW - event.rect.width;
                const deltaH = rawH - event.rect.height;
                if (edges.left) nextX -= deltaW;
                if (edges.top) nextY -= deltaH;
              }
            }

            const snapped = computeResizeSnapAndGuides({
              x: nextX,
              y: nextY,
              w: rawW,
              h: rawH,
              otherElements,
              parentEl: target.parentElement as HTMLElement | null,
              edges,
              pageScale: scale,
            });

            target.style.width = `${snapped.w}px`;
            target.style.height = `${snapped.h}px`;
            updateTransform(target, snapped.x, snapped.y);
            onGuidesChange?.(element.pageId, snapped.guides);
          },
          end(event) {
            const target = event.target as HTMLElement;
            unelevate(target);
            const x = parseFloat(target.getAttribute('data-x') || '0') || 0;
            const y = parseFloat(target.getAttribute('data-y') || '0') || 0;
            const w = parseFloat(target.style.width || String(element.w)) || element.w;
            const h = parseFloat(target.style.height || String(element.h)) || element.h;
            onCommit({ x, y, w, h });
            onGuidesChange?.(element.pageId, null);
          },
        },
      });
    } else {
      // Editing mode: disable move/resize so text selection is smooth
      interactable.draggable(false);
      interactable.resizable(false);
    }

    return () => {
      interactable.unset();
    };
  }, [editing, element.h, element.w, onCommit, pageScale]);

  const isActive = selected || editing;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const handleDblClick = (event: MouseEvent) => {
      if (editing) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('.ws-resize-handle')) return;
      event.preventDefault();
      event.stopPropagation();
      suppressDragRef.current = true;
      requestEditRef.current();
    };
    root.addEventListener('dblclick', handleDblClick, true);
    return () => root.removeEventListener('dblclick', handleDblClick, true);
  }, [editing]);

  return (
    <div
      ref={rootRef}
      className={`ws-placed-element group ${isActive ? 'is-active' : 'hover:ring-1 hover:ring-slate-300'} `}
      style={wrapperStyle}
      tabIndex={0}
      onMouseDown={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseDownCapture={(e) => {
        if (editing) return;
        if (e.detail === 2) {
          e.preventDefault();
          e.stopPropagation();
          suppressDragRef.current = true;
          requestEdit();
        }
      }}
      onClick={(e) => {
        if (editing) return;
        if (e.detail === 2) {
          e.preventDefault();
          e.stopPropagation();
          suppressDragRef.current = true;
          requestEdit();
        }
      }}
      onPointerDown={(e) => {
        // Reliable double-click / double-tap detection (React dblclick can be flaky with pointer-based dragging).
        downRef.current = { x: e.clientX, y: e.clientY };
      }}
      onDoubleClick={(e) => {
        if (editing) return;
        e.preventDefault();
        e.stopPropagation();
        onSelect();
        onRequestEdit();
      }}
      onPointerUp={(e) => {
        if (editing) return;
        const down = downRef.current;
        downRef.current = null;
        if (!down) return;
        const dx = e.clientX - down.x;
        const dy = e.clientY - down.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 6) return;

        const now = Date.now();
        const last = lastTapRef.current;
        lastTapRef.current = { t: now, x: e.clientX, y: e.clientY };
        if (!last) return;

        const dt = now - last.t;
        const dd = Math.hypot(e.clientX - last.x, e.clientY - last.y);
        if (dt <= 320 && dd <= 10) {
          e.preventDefault();
          e.stopPropagation();
          suppressDragRef.current = true;
          requestEdit();
        }
      }}
      data-element-id={element.id}
    >
      <div
        ref={contentRef}
        className="ws-element-content"
        style={contentStyle}
        contentEditable={editing}
        suppressContentEditableWarning={true}
        onBlur={() => {
          const raw = contentRef.current?.innerHTML ?? '';
          if (editing) {
            const safe = sanitizeHtml(raw);
            const measured = contentRef.current?.scrollHeight ?? 0;
            const nextH = measured ? Math.max(MIN_H, Math.ceil(measured)) : element.h;
            onCommit({ html: safe, h: nextH < element.h - 12 ? nextH : element.h });
            onStopEdit();
          }
        }}
        onPaste={(e) => {
          if (!e.clipboardData) return;
          const html = e.clipboardData.getData('text/html');
          const text = e.clipboardData.getData('text/plain');
          if (html) {
            e.preventDefault();
            document.execCommand('insertHTML', false, sanitizeHtml(html));
          } else if (text) {
            e.preventDefault();
            document.execCommand('insertText', false, text);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            const raw = contentRef.current?.innerHTML ?? '';
            const safe = sanitizeHtml(raw);
            const measured = contentRef.current?.scrollHeight ?? 0;
            const nextH = measured ? Math.max(MIN_H, Math.ceil(measured)) : element.h;
            onCommit({ html: safe, h: nextH < element.h - 12 ? nextH : element.h });
            onStopEdit();
            (rootRef.current as HTMLElement | null)?.focus?.();
          }
        }}
        dangerouslySetInnerHTML={{ __html: element.html }}
      />

      {(['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'] as const).map((pos) => (
        <div
          key={pos}
          className={`ws-resize-handle ws-resize-handle-${pos} absolute w-3 h-3 rounded bg-brand-blue border-2 border-white shadow-sm ${
            selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          style={getHandleStyle(pos)}
        />
      ))}
    </div>
  );
};

// Important: avoid React rerenders during interact.js move/resize.
// Rerenders can overwrite DOM transforms mid-interaction and make dragging feel "stuck".
export const PlacedElement = React.memo(PlacedElementImpl, (prev, next) => {
  return (
    prev.element === next.element &&
    prev.selected === next.selected &&
    prev.editing === next.editing &&
    prev.pageScale === next.pageScale
  );
});

const getHandleStyle = (
  pos: 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se'
): React.CSSProperties => {
  const common: React.CSSProperties = { zIndex: 20 };
  if (pos === 'n') return { ...common, top: 1, left: '50%', marginLeft: -6, cursor: 'ns-resize' };
  if (pos === 's') return { ...common, bottom: 1, left: '50%', marginLeft: -6, cursor: 'ns-resize' };
  if (pos === 'e') return { ...common, right: 1, top: '50%', marginTop: -6, cursor: 'ew-resize' };
  if (pos === 'w') return { ...common, left: 1, top: '50%', marginTop: -6, cursor: 'ew-resize' };
  if (pos === 'nw') return { ...common, left: 1, top: 1, cursor: 'nwse-resize' };
  if (pos === 'ne') return { ...common, right: 1, top: 1, cursor: 'nesw-resize' };
  if (pos === 'sw') return { ...common, left: 1, bottom: 1, cursor: 'nesw-resize' };
  return { ...common, right: 1, bottom: 1, cursor: 'nwse-resize' };
};

const COLOR_ALIGN = 'rgba(2,132,199,0.35)';
const COLOR_PAGE = 'rgba(148,163,184,0.22)';
const SNAP_THRESHOLD_PX = 3;
const MIN_W = 80;
const MIN_H = 50;

const computeMoveSnapAndGuides = (opts: {
  x: number;
  y: number;
  w: number;
  h: number;
  otherElements: WorksheetPlacedElement[];
  parentEl: HTMLElement | null;
  allowOverflow?: boolean;
  pageScale?: number;
}): { x: number; y: number; guides: CanvasGuides } => {
  const { otherElements, parentEl, allowOverflow } = opts;
  const parentRect = parentEl?.getBoundingClientRect();
  const scale = Math.max(0.1, opts.pageScale || 1);
  const parentW = parentRect?.width ? parentRect.width / scale : 0;
  const parentH = parentRect?.height ? parentRect.height / scale : 0;

  let x = opts.x;
  let y = opts.y;

  // Clamp within parent bounds (best effort; modifiers also restrict)
  if (!allowOverflow) {
    if (parentW) x = Math.max(0, Math.min(x, Math.max(0, parentW - opts.w)));
    if (parentH) y = Math.max(0, Math.min(y, Math.max(0, parentH - opts.h)));
  }

  const moving = {
    left: x,
    right: x + opts.w,
    cx: x + opts.w / 2,
    top: y,
    bottom: y + opts.h,
    cy: y + opts.h / 2,
  };

  const candidatesX: Array<{ snapX: number; guide: number; delta: number; color: string }> = [];
  const candidatesY: Array<{ snapY: number; guide: number; delta: number; color: string }> = [];

  // Page edges
  if (parentW) {
    candidatesX.push({ snapX: 0, guide: 0, delta: Math.abs(moving.left - 0), color: COLOR_PAGE });
    candidatesX.push({
      snapX: parentW - opts.w,
      guide: parentW,
      delta: Math.abs(moving.right - parentW),
      color: COLOR_PAGE,
    });
    candidatesX.push({
      snapX: parentW / 2 - opts.w / 2,
      guide: parentW / 2,
      delta: Math.abs(moving.cx - parentW / 2),
      color: COLOR_PAGE,
    });
  }
  if (parentH) {
    candidatesY.push({ snapY: 0, guide: 0, delta: Math.abs(moving.top - 0), color: COLOR_PAGE });
    candidatesY.push({
      snapY: parentH - opts.h,
      guide: parentH,
      delta: Math.abs(moving.bottom - parentH),
      color: COLOR_PAGE,
    });
    candidatesY.push({
      snapY: parentH / 2 - opts.h / 2,
      guide: parentH / 2,
      delta: Math.abs(moving.cy - parentH / 2),
      color: COLOR_PAGE,
    });
  }

  // Other elements alignment
  for (const o of otherElements) {
    const oLeft = o.x;
    const oRight = o.x + o.w;
    const oCx = o.x + o.w / 2;
    const oTop = o.y;
    const oBottom = o.y + o.h;
    const oCy = o.y + o.h / 2;

    // X align: left/center/right to other left/center/right
    for (const targetX of [oLeft, oCx, oRight]) {
      candidatesX.push({ snapX: targetX, guide: targetX, delta: Math.abs(moving.left - targetX), color: COLOR_ALIGN });
      candidatesX.push({
        snapX: targetX - opts.w / 2,
        guide: targetX,
        delta: Math.abs(moving.cx - targetX),
        color: COLOR_ALIGN,
      });
      candidatesX.push({
        snapX: targetX - opts.w,
        guide: targetX,
        delta: Math.abs(moving.right - targetX),
        color: COLOR_ALIGN,
      });
    }

    // Y align: top/center/bottom to other top/center/bottom
    for (const targetY of [oTop, oCy, oBottom]) {
      candidatesY.push({ snapY: targetY, guide: targetY, delta: Math.abs(moving.top - targetY), color: COLOR_ALIGN });
      candidatesY.push({
        snapY: targetY - opts.h / 2,
        guide: targetY,
        delta: Math.abs(moving.cy - targetY),
        color: COLOR_ALIGN,
      });
      candidatesY.push({
        snapY: targetY - opts.h,
        guide: targetY,
        delta: Math.abs(moving.bottom - targetY),
        color: COLOR_ALIGN,
      });
    }
  }

  const bestX = candidatesX.reduce<{ snapX: number; guide: number; delta: number; color: string } | null>((best, c) => {
    if (c.delta > SNAP_THRESHOLD_PX) return best;
    if (!best || c.delta < best.delta) return c;
    return best;
  }, null);

  const bestY = candidatesY.reduce<{ snapY: number; guide: number; delta: number; color: string } | null>((best, c) => {
    if (c.delta > SNAP_THRESHOLD_PX) return best;
    if (!best || c.delta < best.delta) return c;
    return best;
  }, null);

  // Soft snap: "magnet" into alignment to avoid jumpy motion.
  if (bestX && parentW) {
    const t = Math.max(0, Math.min(1, 1 - bestX.delta / SNAP_THRESHOLD_PX));
    const magnetX = x + (bestX.snapX - x) * t;
    x = allowOverflow ? magnetX : Math.max(0, Math.min(magnetX, Math.max(0, parentW - opts.w)));
  }
  if (bestY && parentH) {
    const t = Math.max(0, Math.min(1, 1 - bestY.delta / SNAP_THRESHOLD_PX));
    const magnetY = y + (bestY.snapY - y) * t;
    y = allowOverflow ? magnetY : Math.max(0, Math.min(magnetY, Math.max(0, parentH - opts.h)));
  }

  const guides: CanvasGuides =
    bestX || bestY
      ? {
          v: bestX ? [{ pos: bestX.guide, color: bestX.color }] : undefined,
          h: bestY ? [{ pos: bestY.guide, color: bestY.color }] : undefined,
        }
      : null;

  return { x, y, guides };
};

const computeResizeSnapAndGuides = (opts: {
  x: number;
  y: number;
  w: number;
  h: number;
  otherElements: WorksheetPlacedElement[];
  parentEl: HTMLElement | null;
  edges?: { left?: boolean; right?: boolean; top?: boolean; bottom?: boolean };
  pageScale?: number;
}): { x: number; y: number; w: number; h: number; guides: CanvasGuides } => {
  const parentRect = opts.parentEl?.getBoundingClientRect();
  const scale = Math.max(0.1, opts.pageScale || 1);
  const parentW = parentRect?.width ? parentRect.width / scale : 0;
  const parentH = parentRect?.height ? parentRect.height / scale : 0;

  const edges = opts.edges || {};
  let x = opts.x;
  let y = opts.y;
  let w = Math.max(MIN_W, opts.w);
  let h = Math.max(MIN_H, opts.h);

  const right = x + w;
  const bottom = y + h;

  const vCandidates: Array<{ pos: number; delta: number; kind: 'left' | 'right'; color: string }> = [];
  const hCandidates: Array<{ pos: number; delta: number; kind: 'top' | 'bottom'; color: string }> = [];

  const addVCandidate = (pos: number, delta: number, kind: 'left' | 'right', color: string) => {
    if (delta <= SNAP_THRESHOLD_PX) vCandidates.push({ pos, delta, kind, color });
  };
  const addHCandidate = (pos: number, delta: number, kind: 'top' | 'bottom', color: string) => {
    if (delta <= SNAP_THRESHOLD_PX) hCandidates.push({ pos, delta, kind, color });
  };

  if (parentW) {
    if (edges.left) addVCandidate(0, Math.abs(x - 0), 'left', COLOR_PAGE);
    if (edges.right) addVCandidate(parentW, Math.abs(right - parentW), 'right', COLOR_PAGE);
  }
  if (parentH) {
    if (edges.top) addHCandidate(0, Math.abs(y - 0), 'top', COLOR_PAGE);
    if (edges.bottom) addHCandidate(parentH, Math.abs(bottom - parentH), 'bottom', COLOR_PAGE);
  }

  for (const o of opts.otherElements) {
    const oLeft = o.x;
    const oRight = o.x + o.w;
    const oCx = o.x + o.w / 2;
    const oTop = o.y;
    const oBottom = o.y + o.h;
    const oCy = o.y + o.h / 2;

    if (edges.left) {
      addVCandidate(oLeft, Math.abs(x - oLeft), 'left', COLOR_ALIGN);
      addVCandidate(oCx, Math.abs(x - oCx), 'left', COLOR_ALIGN);
      addVCandidate(oRight, Math.abs(x - oRight), 'left', COLOR_ALIGN);
    }
    if (edges.right) {
      addVCandidate(oLeft, Math.abs(right - oLeft), 'right', COLOR_ALIGN);
      addVCandidate(oCx, Math.abs(right - oCx), 'right', COLOR_ALIGN);
      addVCandidate(oRight, Math.abs(right - oRight), 'right', COLOR_ALIGN);
    }
    if (edges.top) {
      addHCandidate(oTop, Math.abs(y - oTop), 'top', COLOR_ALIGN);
      addHCandidate(oCy, Math.abs(y - oCy), 'top', COLOR_ALIGN);
      addHCandidate(oBottom, Math.abs(y - oBottom), 'top', COLOR_ALIGN);
    }
    if (edges.bottom) {
      addHCandidate(oTop, Math.abs(bottom - oTop), 'bottom', COLOR_ALIGN);
      addHCandidate(oCy, Math.abs(bottom - oCy), 'bottom', COLOR_ALIGN);
      addHCandidate(oBottom, Math.abs(bottom - oBottom), 'bottom', COLOR_ALIGN);
    }
  }

  const bestV = vCandidates.reduce<typeof vCandidates[number] | null>((best, c) => {
    if (!best || c.delta < best.delta) return c;
    return best;
  }, null);
  const bestH = hCandidates.reduce<typeof hCandidates[number] | null>((best, c) => {
    if (!best || c.delta < best.delta) return c;
    return best;
  }, null);

  // Apply snapping along vertical axis (x/w)
  if (bestV) {
    if (bestV.kind === 'right') {
      const newRight = bestV.pos;
      w = Math.max(MIN_W, newRight - x);
    } else {
      const newLeft = bestV.pos;
      const currentRight = x + w;
      x = newLeft;
      w = Math.max(MIN_W, currentRight - x);
    }
  }

  // Apply snapping along horizontal axis (y/h)
  if (bestH) {
    if (bestH.kind === 'bottom') {
      const newBottom = bestH.pos;
      h = Math.max(MIN_H, newBottom - y);
    } else {
      const newTop = bestH.pos;
      const currentBottom = y + h;
      y = newTop;
      h = Math.max(MIN_H, currentBottom - y);
    }
  }

  // Clamp within parent bounds (best-effort)
  if (parentW) {
    if (x < 0) x = 0;
    if (x + w > parentW) w = Math.max(MIN_W, parentW - x);
  }
  if (parentH) {
    if (y < 0) y = 0;
    if (y + h > parentH) h = Math.max(MIN_H, parentH - y);
  }

  const guides: CanvasGuides =
    bestV || bestH
      ? {
          v: bestV ? [{ pos: bestV.pos, color: bestV.color }] : undefined,
          h: bestH ? [{ pos: bestH.pos, color: bestH.color }] : undefined,
        }
      : null;

  return { x, y, w, h, guides };
};
