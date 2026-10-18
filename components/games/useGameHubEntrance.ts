import { useLayoutEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

/** Measure game cards so they fly in from a shared point below the screen. */
export const useGameHubEntrance = (tab: string) => {
  const root = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  useLayoutEffect(() => {
    const node = root.current;
    if (!node || reduceMotion) return;
    const seen = new WeakSet<HTMLElement>();
    const selector = '.playful-game-card, .community-library-card, .personal-library-card';
    const prepare = () => {
      const items = Array.from(node.querySelectorAll<HTMLElement>(selector)).filter(item => !seen.has(item));
      if (!items.length) return;
      items.forEach(item => { item.style.animation = 'none'; });
      const centreX = innerWidth / 2;
      const positions = items.map(item => item.getBoundingClientRect());
      // Keep even the tallest card out of sight during the initial .22-scale gathering.
      const centreY = innerHeight + Math.max(160, ...positions.map(box => box.height * .22 / 2 + 32));
      items.forEach((item, index) => {
        const box = positions[index];
        item.style.setProperty('--fly-x', `${centreX - box.left - box.width / 2}px`);
        item.style.setProperty('--fly-y', `${centreY - box.top - box.height / 2}px`);
        seen.add(item);
      });
      // Commit the resting measurements before starting the shared keyframes.
      void node.offsetWidth;
      items.forEach((item, index) => {
        item.style.removeProperty('animation');
        item.style.animationDelay = `${Math.min(index, 10) * 25}ms`;
      });
    };
    prepare();
    // Library/community cards can arrive after the initial page content.
    const observer = new MutationObserver(prepare);
    observer.observe(node, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [tab, reduceMotion]);
  return root;
};
