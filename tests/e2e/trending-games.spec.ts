import { expect, test } from '@playwright/test';
import { GameType, type GeneratedGame } from '../../types';
import { selectTrendingGamesByMode } from '../../utils/trendingGames';

const game = (id: string, type: GameType, playCount: number): GeneratedGame => ({
  id,
  title: id,
  playCount,
  createdAt: '2026-09-28T00:00:00Z',
  config: { type, topic: '', questionCount: 1, questionType: 'open', isAI: false },
  questions: [],
});

test('home trending selects the top five recent game modes without repeating a mode', () => {
  const games = [
    game('trivia-old-hit', GameType.TRIVIA, 100),
    game('trivia-recent-hit', GameType.TRIVIA, 20),
    game('jeopardy', GameType.JEOPARDY, 50),
    game('live', GameType.LIVE_QUIZ_CHALLENGE, 40),
    game('darts', GameType.DARTS, 30),
    game('pub', GameType.PUB_QUIZ, 25),
    game('time-bomb', GameType.TIME_BOMB, 200),
  ];
  const recent = new Map([
    ['trivia-old-hit', 2], ['trivia-recent-hit', 8], ['jeopardy', 9],
    ['live', 7], ['darts', 6], ['pub', 5], ['time-bomb', 0],
  ]);

  const selected = selectTrendingGamesByMode(games, recent, 5);
  expect(selected.map(item => item.id)).toEqual([
    'trivia-recent-hit', 'jeopardy', 'live', 'darts', 'pub',
  ]);
  expect(new Set(selected.map(item => item.config.type)).size).toBe(5);
});

test('home trending falls back to lifetime plays when recent counts are unavailable', () => {
  const games = [
    game('trivia-best', GameType.TRIVIA, 100),
    game('trivia-other', GameType.TRIVIA, 90),
    game('jeopardy', GameType.JEOPARDY, 80),
    game('live', GameType.LIVE_QUIZ_CHALLENGE, 70),
  ];

  expect(selectTrendingGamesByMode(games, new Map(), 5).map(item => item.id)).toEqual([
    'trivia-best', 'jeopardy', 'live',
  ]);
});
