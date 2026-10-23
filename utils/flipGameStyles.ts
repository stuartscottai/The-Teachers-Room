import { GameType } from '../types';
export const FLIP_STYLE_GAMES: readonly GameType[] = [GameType.PLINKO, GameType.TRIVIA, GameType.JEOPARDY, GameType.PUB_QUIZ, GameType.DARTS, GameType.SNAKES_LADDERS, GameType.STOP_THE_FIRE, GameType.WORD_WHEEL, GameType.BLOCK_BEATERS];
export const supportsFlipGameStyle = (type: GameType) => FLIP_STYLE_GAMES.includes(type);
