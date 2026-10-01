import { translateInterfaceText as ui, useInterfaceLanguage as useUiLanguage } from '../../utils/interfaceLanguage';
import React, { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import './question-card-zoom.css';

type Camera = { scene: HTMLElement; card: HTMLElement; viewport: HTMLElement; viewportStyle: string | null; fixed: Array<{ element: HTMLElement; style: string | null }> };

/** Moves the game view like a camera while keeping the live answer controls usable. */
export const QuestionCardZoomButton: React.FC<{ targetSelector?: string; resetKey?: string | number }> = ({ targetSelector, resetKey }) => {
  useUiLanguage();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const cameraRef = useRef<Camera | null>(null);
  const restoreTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);

  const restore = () => {
    const camera = cameraRef.current;
    if (!camera) return;
    camera.scene.classList.remove('game-view-camera', 'game-view-zoomed');
    camera.card.classList.remove('game-question-zoomed');
    if (camera.viewportStyle === null) camera.viewport.removeAttribute('style');
    else camera.viewport.setAttribute('style', camera.viewportStyle);
    for (const { element, style } of camera.fixed) {
      if (style === null) element.removeAttribute('style');
      else element.setAttribute('style', style);
    }
    cameraRef.current = null;
  };

  const close = (immediate = false) => {
    if (restoreTimer.current) clearTimeout(restoreTimer.current);
    cameraRef.current?.scene.classList.remove('game-view-zoomed');
    setOpen(false);
    if (immediate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) restore();
    else restoreTimer.current = setTimeout(restore, 340);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    const onResize = () => close(true);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('fullscreenchange', onResize);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('fullscreenchange', onResize);
      window.removeEventListener('resize', onResize);
      if (restoreTimer.current) clearTimeout(restoreTimer.current);
      restore();
    };
  }, []);

  useEffect(() => { close(true); }, [resetKey]);

  const toggle = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (open) { close(); return; }
    if (restoreTimer.current) clearTimeout(restoreTimer.current);
    restore();
    const card = targetSelector ? buttonRef.current?.closest<HTMLElement>(targetSelector) : buttonRef.current?.parentElement;
    if (!card) return;
    const fullscreen = document.fullscreenElement;
    const scene = card.closest<HTMLElement>('.gameplay-appearance');
    const viewport = scene?.closest<HTMLElement>('.gameplay-viewport');
    if (!scene || !viewport) return;
    const rect = card.getBoundingClientRect();
    const sceneRect = scene.getBoundingClientRect();
    const navBottom = fullscreen ? 0 : Math.max(0, ...Array.from(document.querySelectorAll('nav')).map(nav => {
      const bounds = nav.getBoundingClientRect();
      return bounds.top <= 0 && bounds.bottom > 0 ? bounds.bottom : 0;
    }));
    const margin = 16;
    const top = navBottom + margin;
    const availableHeight = window.innerHeight - top - margin;
    const scale = Math.min(1.4, (window.innerWidth - margin * 2) / rect.width, availableHeight / rect.height);
    const localX = rect.left + rect.width / 2 - sceneRect.left;
    const localY = rect.top + rect.height / 2 - sceneRect.top;
    const shiftX = window.innerWidth / 2 - sceneRect.left - scale * localX;
    const shiftY = top + availableHeight / 2 - sceneRect.top - scale * localY;

    // A transformed page becomes the reference for fixed overlays. Preserve their
    // existing coordinates so entering the camera view does not cause a jump.
    const fixed: Camera['fixed'] = [];
    if (scene !== card) {
      for (const element of Array.from(scene.querySelectorAll<HTMLElement>('*'))) {
        if (getComputedStyle(element).position !== 'fixed') continue;
        const bounds = element.getBoundingClientRect();
        fixed.push({ element, style: element.getAttribute('style') });
        for (const [property, value] of Object.entries({ left: `${bounds.left - sceneRect.left}px`, top: `${bounds.top - sceneRect.top}px`, width: `${bounds.width}px`, height: `${bounds.height}px`, right: 'auto', bottom: 'auto' })) {
          element.style.setProperty(property, value, 'important');
        }
      }
    }
    // Fixed-position games have no flow height. Give the clipping viewport room
    // for the camera view; otherwise it clips the game and exposes the footer.
    const viewportStyle = viewport.getAttribute('style');
    viewport.style.minHeight = `${Math.max(0, window.innerHeight - viewport.getBoundingClientRect().top)}px`;
    cameraRef.current = { scene, card, viewport, viewportStyle, fixed };
    scene.style.setProperty('--game-view-scale', String(scale));
    scene.style.setProperty('--game-view-x', `${shiftX}px`);
    scene.style.setProperty('--game-view-y', `${shiftY}px`);
    scene.classList.add('game-view-camera');
    card.classList.add('game-question-zoomed');
    // Commit the unchanged starting frame before animating the entire game view.
    void scene.offsetWidth;
    scene.classList.add('game-view-zoomed');
    setOpen(true);
  };

  return <button ref={buttonRef} type="button" className="question-card-zoom-button" onClick={toggle}
    aria-label={open ? ui("Close enlarged question card") : ui("Enlarge question card")}
    aria-pressed={open} title={open ? ui("Zoom out") : ui("Zoom in")}>
    {open ? <ZoomOut size={18} strokeWidth={1.8} /> : <ZoomIn size={18} strokeWidth={1.8} />}
  </button>;
};
