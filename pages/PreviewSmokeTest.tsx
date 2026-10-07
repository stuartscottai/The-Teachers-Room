import React, { useState } from 'react';
import { GamePreview } from '../components/games/GamePreview';
import { GameEditor } from '../components/games/GameEditor';
import { GameType, GeneratedGame } from '../types';

const smokeImage =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect width="320" height="180" fill="#0ea5e9"/><circle cx="160" cy="90" r="52" fill="#facc15"/><text x="160" y="99" text-anchor="middle" font-family="Arial" font-size="22" font-weight="700" fill="#0f172a">Preview</text></svg>'
  );

const game: GeneratedGame = {
  id: 'preview-smoke',
  title: 'Preview Smoke Game',
  questions: [
    {
      id: 0,
      isBonus: false,
      question: 'Which image should load?',
      answer: 'The preview image',
      options: ['The preview image', 'A missing image', 'No image', 'A video'],
      points: 1,
      image: {
        url: smokeImage,
        thumbUrl: smokeImage,
        alt: 'Preview smoke image',
      },
    },
    {
      id: 1,
      isBonus: false,
      question: 'This card has a deliberately broken image URL.',
      answer: 'It should not show a broken image icon',
      options: ['Broken icon', 'Hidden cleanly', 'Crash', 'Reload'],
      points: 1,
      image: {
        url: '/assets/does-not-exist-preview-smoke.png',
        thumbUrl: '/assets/does-not-exist-preview-smoke.png',
        alt: 'Broken preview smoke image',
      },
    },
  ],
  config: {
    type: GameType.TRIVIA,
    questionCount: 2,
    topic: 'Smoke',
    questionType: 'multiple-choice',
    isAI: false,
  },
  createdAt: '2026-01-01T00:00:00.000Z',
};

export const PreviewSmokeTest: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const [liveQuizSelection, setLiveQuizSelection] = useState<string[] | null>(null);
  const mode = params.get('mode');
  const groupedType = mode === 'jeopardy' ? GameType.JEOPARDY : mode === 'pubquiz' ? GameType.PUB_QUIZ : undefined;
  const groups = [
    { name: 'Present Perfect Simple/Continuous', questions: [game.questions[0]] },
    { name: 'Vocabulary and expressions', questions: [game.questions[1]] },
    { name: 'Present Perfect Simple/Continuous', questions: [{ ...game.questions[0], question: 'A question in a separate category with the same name.' }] },
  ];
  const previewGame: GeneratedGame = groupedType ? {
    ...game,
    title: 'Open World B2 First Starter Unit Review',
    config: { ...game.config, type: groupedType, questionCount: 3, customInstructions: 'Review the starter unit.' },
    ...(groupedType === GameType.JEOPARDY ? { jeopardyBoard: groups } : { pubQuizRounds: groups }),
  } : game;
  if (params.get('saved') === '1') {
    previewGame.id = '00000000-0000-4000-8000-000000000001';
    previewGame.config = { ...previewGame.config, coverImage: { url: smokeImage, source: 'upload', selection: 'creator' } };
  }
  if (liveQuizSelection) return <pre role="status">{JSON.stringify(liveQuizSelection)}</pre>;
  if (params.get('view') === 'editor') {
    return <GameEditor game={previewGame} onBack={() => undefined} onSave={() => undefined} onPlay={() => undefined} onLiveQuiz={(_game, selectedItemIds = []) => setLiveQuizSelection(selectedItemIds)} />;
  }
  return (
  <GamePreview
    game={previewGame}
    source="library"
    onBack={() => undefined}
    onPlay={() => undefined}
    onEdit={() => undefined}
    onSave={() => undefined}
    onShare={() => undefined}
    onLiveQuiz={() => undefined}
  />
  );
};
