import { useLayoutEffect, type RefObject } from 'react';

/** Restore the score header before an overlay is painted, then keep it in view. */
export function useMobileQuestionViewport(
  containerRef: RefObject<HTMLElement>,
  active: boolean,
  { includeDesktop = true, resetKey }: { includeDesktop?: boolean; resetKey?: string } = {},
) {
  useLayoutEffect(() => {
    if (!active) return;
    const media = window.matchMedia('(max-width: 639px)');
    let unlock: (() => void) | undefined;
    const measure = () => {
      const container = containerRef.current;
      if (!container || container.closest('.game-view-zoomed')) return;
      const header = container.querySelector<HTMLElement>('.team-scoreboard-header, [data-scoreboard-header], [data-question-overlay-anchor]');
      const overlay = container.querySelector<HTMLElement>('[data-question-below-scoreboard]');
      if (header && overlay) overlay.style.top = `${Math.max(0, header.getBoundingClientRect().bottom)}px`;
    };

    const update = () => {
      unlock?.();
      unlock = undefined;
      if ((!includeDesktop && !media.matches) || !containerRef.current) return;

      // Reset the game and its scrolling parents, including the page. Do this
      // instantly: smooth scrolling would leave the grid behind the header gap.
      for (let element: HTMLElement | null = containerRef.current; element; element = element.parentElement) {
        element.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      // Use the real header edge, rather than a guessed nav/header height.
      // This also prevents gaps with wrapped team names or resized viewports.
      measure();

      // Games manage their own body lock. Lock the page root separately so this
      // shared rule does not overwrite those locks or block scrolling in cards.
      const root = document.documentElement;
      const overflow = root.style.overflow;
      root.style.overflow = 'hidden';
      unlock = () => { root.style.overflow = overflow; };
    };

    update();
    const header = containerRef.current?.querySelector('.team-scoreboard-header, [data-scoreboard-header], [data-question-overlay-anchor]');
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : undefined;
    if (header) observer?.observe(header);
    window.addEventListener('resize', measure);
    document.addEventListener('fullscreenchange', measure);
    media.addEventListener('change', update);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
      document.removeEventListener('fullscreenchange', measure);
      media.removeEventListener('change', update);
      unlock?.();
    };
  }, [containerRef, active, includeDesktop, resetKey]);
}
