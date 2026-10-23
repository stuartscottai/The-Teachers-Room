import type { TriviaStyle } from '../types';

export const TRIVIA_STYLES = ['classic', 'comic-pop', 'pinball-chrome', 'toy-blocks', 'paper-cut', 'candy-circuit', 'halloween', 'neon-lights'] as const;
// Hide the seasonal option here when the event ends; saved Halloween games remain valid.
export const HALLOWEEN_STYLE_END = '2026-11-02T00:00:00Z';
export const HALLOWEEN_STYLE_ENABLED = Date.now() < Date.parse(HALLOWEEN_STYLE_END);
export const PICKABLE_TRIVIA_STYLES = TRIVIA_STYLES.filter(style => style !== 'halloween' || HALLOWEEN_STYLE_ENABLED);
export const TRIVIA_STYLE_LABELS: Record<TriviaStyle,string> = {
  classic:'Classic', 'comic-pop':'Comic Pop', 'pinball-chrome':'Pinball Chrome', 'toy-blocks':'Toy Blocks', 'paper-cut':'Paper Cut', 'candy-circuit':'Candy Circuit', halloween:'Halloween', 'neon-lights':'Neon Lights',
};
/** Old games, missing settings and unsupported imported values all use Classic. */
export function normalizeTriviaStyle(value:unknown):TriviaStyle {
  return (TRIVIA_STYLES as readonly unknown[]).includes(value)?value as TriviaStyle:'classic';
}
