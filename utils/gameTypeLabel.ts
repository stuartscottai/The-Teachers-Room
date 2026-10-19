import { GameType } from '../types';

/** Keep the original stored type so existing games remain playable. */
export const gameTypeLabel = (type: GameType | string) => type === GameType.PLINKO ? 'Plinkemoji' : type;
