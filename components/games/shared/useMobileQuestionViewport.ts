import { useLayoutEffect, type RefObject } from 'react';

/** Restore the score header before an overlay is painted, then keep it in view. */
export function useMobileQuestionViewport(
  containerRef: RefObject<HTMLElement>,
  active: boolean,
  { includeDesktop = false, resetKey }: { includeDesktop?: boolean; resetKey?: string } = {},
) {
  useLayoutEffect(() => {
    if (!active) return;
    const media = window.matchMedia('(max-width: 639px)');
    let unlock: (() => void) | undefined;

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

      // Games manage their own body lock. Lock the page root separately so this
      // shared rule does not overwrite those locks or block scrolling in cards.
      const root = document.documentElement;
      const overflow = root.style.overflow;
      root.style.overflow = 'hidden';
      unlock = () => { root.style.overflow = overflow; };
    };

    update();
    media.addEventListener('change', update);
    return () => {
      media.removeEventListener('change', update);
      unlock?.();
    };
  }, [containerRef, active, includeDesktop, resetKey]);
}
