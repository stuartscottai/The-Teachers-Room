import React, { useState } from 'react';
import { GameCoverEditor } from '../components/games/GameCoverEditor';
import { GameType, GeneratedGame } from '../types';
import { getLocalGames, saveGameToLibrary } from '../utils/gameUtils';

const fixture: GeneratedGame = {
  id: 'cover-smoke', title: 'Premier League Football',
  config: { type: GameType.TRIVIA, topic: 'Football', questionCount: 1, questionType: 'open', isAI: false },
  questions: [{ id: 1, question: 'How many players?', answer: '11', points: 1, isBonus: false,
    image: { url: '/question-image-unchanged.png', source: 'upload' } }],
};
export const GameCoverSmokeTest = () => {
  const [game, setGame] = useState(() => getLocalGames().find(g => g.id === fixture.id) || fixture);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  return <main className="mx-auto max-w-4xl p-6">
    <GameCoverEditor game={game} onBusyChange={setBusy} onChange={coverImage => setGame(g => ({ ...g, config: { ...g.config, coverImage } }))} />
    <button disabled={busy} onClick={async () => setSaved((await saveGameToLibrary(game)).success)}>Save fixture</button>
    {saved && <p role="status">Fixture saved</p>}
  </main>;
};
