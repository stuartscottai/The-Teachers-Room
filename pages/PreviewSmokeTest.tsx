import React from 'react';
import { GamePreview } from '../components/games/GamePreview';
import { GameType, GeneratedGame } from '../types';

const smokeImage =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect width="320" height="180" fill="#0ea5e9"/><circle cx="160" cy="90" r="52" fill="#facc15"/><text x="160" y="99" text-anchor="middle" font-family="Arial" font-size="22" font-weight="700" fill="#0f172a">Preview</text></svg>'
  );

const game: GeneratedGame = {
  id: 'preview-smoke',
  title: 'Preview Smoke Game',
  description: 'Preview smoke fixture',
  questions: [
    {
      question: 'Which image should load?',
      answer: 'The preview image',
      options: ['The preview image', 'A missing image', 'No image', 'A video'],
      points: 1,
      image: {
        id: 'preview-smoke-image',
        url: smokeImage,
        thumbUrl: smokeImage,
        alt: 'Preview smoke image',
      },
    },
    {
      question: 'This card has a deliberately broken image URL.',
      answer: 'It should not show a broken image icon',
      options: ['Broken icon', 'Hidden cleanly', 'Crash', 'Reload'],
      points: 1,
      image: {
        id: 'preview-broken-image',
        url: '/assets/does-not-exist-preview-smoke.png',
        thumbUrl: '/assets/does-not-exist-preview-smoke.png',
        alt: 'Broken preview smoke image',
      },
    },
  ],
  config: {
    type: GameType.TRIVIA,
    questionCount: 2,
    classLevel: 'Smoke',
    timeLimit: 30,
    teamMode: false,
    isAI: false,
  },
  createdAt: '2026-01-01T00:00:00.000Z',
};

export const PreviewSmokeTest: React.FC = () => (
  <GamePreview
    game={game}
    source="library"
    onBack={() => undefined}
    onPlay={() => undefined}
    onEdit={() => undefined}
  />
);
