import React, { useEffect, useRef, useState } from 'react';
import type { GameCoverImage } from '../../types';
import { GameCover } from '../shared/GameCover';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
type Point = { x: number; y: number };
const gesture = (points: Map<number, Point>) => {
  const [a, b] = [...points.values()];
  return a ? { x: b ? (a.x + b.x) / 2 : a.x, y: b ? (a.y + b.y) / 2 : a.y,
    distance: b ? Math.hypot(b.x - a.x, b.y - a.y) : 0 } : null;
};

export const InteractiveGameCover: React.FC<{
  cover?: GameCoverImage; title: string; disabled?: boolean;
  onChange: (cover: GameCoverImage) => void;
}> = ({ cover, title, disabled, onChange }) => {
  const frame = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const latest = useRef({ cover, onChange, disabled });
  latest.current = { cover, onChange, disabled };
  const [active, setActive] = useState(false);
  const [dragging, setDragging] = useState(false);

  const adjust = (dx: number, dy: number, ratio = 1) => {
    const { cover: current, onChange: change, disabled: locked } = latest.current;
    const image = frame.current?.querySelector('img');
    if (!current || locked || !image?.naturalWidth || !frame.current) return;
    const { width, height } = frame.current.getBoundingClientRect();
    const zoom = clamp((current.zoom || 1) * ratio, 1, 4);
    const fit = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const overflowX = image.naturalWidth * fit * zoom - width;
    const overflowY = image.naturalHeight * fit * zoom - height;
    const next = { ...current, selection: 'creator' as const, zoom,
      positionX: overflowX > 0.5 ? clamp((current.positionX ?? 50) - dx / overflowX * 100, 0, 100) : 50,
      positionY: overflowY > 0.5 ? clamp((current.positionY ?? 50) - dy / overflowY * 100, 0, 100) : 50 };
    latest.current.cover = next;
    change(next);
  };
  const adjustRef = useRef(adjust);
  adjustRef.current = adjust;

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      if (!active || latest.current.disabled || !latest.current.cover) return;
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1);
      adjustRef.current(0, 0, Math.exp(-clamp(delta, -200, 200) * 0.002));
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [active]);

  useEffect(() => { pointers.current.clear(); setDragging(false); setActive(false); }, [cover?.url, disabled]);

  const endPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    setDragging(pointers.current.size > 0);
  };

  return <>
    <div ref={frame} role="group" aria-label="Reposition game cover" tabIndex={cover && !disabled ? 0 : -1}
      aria-disabled={disabled || !cover} aria-describedby="cover-gesture-help"
      className={`rounded-xl outline-none select-none ${active ? 'ring-2 ring-sky-500 ring-offset-2' : ''} ${cover && !disabled ? dragging ? 'cursor-grabbing' : 'cursor-grab' : ''}`}
      style={{ touchAction: active && !disabled ? 'none' : 'auto' }}
      onFocus={() => { if (cover && !disabled) setActive(true); }}
      onBlur={() => { setActive(false); pointers.current.clear(); setDragging(false); }}
      onPointerDown={event => {
        if (!cover || disabled || event.button !== 0) return;
        event.currentTarget.focus(); setActive(true);
        event.currentTarget.setPointerCapture(event.pointerId);
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY }); setDragging(true);
      }}
      onPointerMove={event => {
        if (!pointers.current.has(event.pointerId)) return;
        const previous = gesture(pointers.current)!;
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const next = gesture(pointers.current)!;
        adjust(next.x - previous.x, next.y - previous.y,
          previous.distance > 0 && next.distance > 0 ? next.distance / previous.distance : 1);
      }}
      onPointerUp={endPointer} onPointerCancel={endPointer} onLostPointerCapture={endPointer}
      onKeyDown={event => {
        if (!cover || disabled) return;
        if (event.key === 'Escape') { event.currentTarget.blur(); return; }
        const moves: Record<string, [number, number]> = { ArrowLeft: [-8, 0], ArrowRight: [8, 0], ArrowUp: [0, -8], ArrowDown: [0, 8] };
        if (moves[event.key]) { event.preventDefault(); adjust(...moves[event.key]); }
        if (['+', '=', '-'].includes(event.key)) { event.preventDefault(); adjust(0, 0, event.key === '-' ? 1 / 1.1 : 1.1); }
      }}>
      <GameCover cover={cover} title={title} className="aspect-[16/7] rounded-xl pointer-events-none" />
    </div>
    {cover && <p id="cover-gesture-help" className="mt-2 text-xs text-slate-500">
      Tap or click to adjust. Drag to move; pinch or scroll to zoom. Tap outside to finish.
      <span className="sr-only"> Use arrow keys to move, plus or minus to zoom, and Escape to finish.</span>
    </p>}
  </>;
};
