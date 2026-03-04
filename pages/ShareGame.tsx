import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, LogIn } from 'lucide-react';
import { GameRunOptions, GameType, GeneratedGame } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getGameShareUrl, getSharedGame, isUUID, prepareGameForLibrarySave, saveGameToLibrary } from '../utils/gameUtils';
import { LoginModal } from '../components/LoginModal';
import { GameSetup } from '../components/games/GameSetup';
import { GamePreview } from '../components/games/GamePreview';
import { GameEditor } from '../components/games/GameEditor';
import { JeopardyGame } from '../components/games/JeopardyGame';
import { TriviaGame } from '../components/games/TriviaGame';
import { PubQuizGame } from '../components/games/PubQuizGame';
import { DartsGame } from '../components/games/DartsGame';
import { SnakesLaddersGame } from '../components/games/SnakesLaddersGame';
import { MillionaireGame } from '../components/games/MillionaireGame';
import { TimeBombGame } from '../components/games/TimeBombGame';
import { SurveyShowdownGame } from '../components/games/SurveyShowdownGame';
import { StopTheFireGame } from '../components/games/StopTheFireGame';
import { WordWheelGame } from '../components/games/WordWheelGame';

type LoadState = 'idle' | 'loading' | 'ready' | 'not-found' | 'error';

export const ShareGame: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [game, setGame] = useState<GeneratedGame | null>(null);
  const [sessionGame, setSessionGame] = useState<GeneratedGame | null>(null);
  const [step, setStep] = useState<'preview' | 'editor' | 'setup' | 'play'>('preview');
  const [playReturnStep, setPlayReturnStep] = useState<'editor' | 'preview'>('preview');
  const [playOptions, setPlayOptions] = useState<GameRunOptions | null>(null);
  const [playKey, setPlayKey] = useState(0);

  useEffect(() => {
    if (!isLoading && !user) {
      setShowLogin(true);
    }
  }, [isLoading, user]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) return;
    if (!id) {
      setLoadState('error');
      return;
    }

    setLoadState('loading');
    getSharedGame(id)
      .then((shared) => {
        if (!shared) {
          setLoadState('not-found');
          setGame(null);
          return;
        }
        const safeGame: GeneratedGame = {
          ...shared,
          id: undefined,
          sourceGameId: shared.id,
          config: {
            ...shared.config,
            isPublic: false,
            originalCreatorName: shared.config.originalCreatorName || shared.authorName || 'Teacher',
            originalCreatorId: shared.config.originalCreatorId || shared.authorId,
            originalCreatorAvatar: shared.config.originalCreatorAvatar || shared.authorAvatar || shared.config.authorAvatar || null,
            lastEditorName: undefined,
            lastEditorId: undefined,
          },
        };
        setGame(safeGame);
        setSessionGame(null);
        setStep('preview');
        setLoadState('ready');
      })
      .catch(() => {
        setLoadState('error');
      });
  }, [id, isLoading, user]);

  useEffect(() => {
    if (step === 'play') {
      document.body.classList.add('gameplay-active');
    } else {
      document.body.classList.remove('gameplay-active');
    }
    return () => {
      document.body.classList.remove('gameplay-active');
    };
  }, [step]);

  const handleGameStart = (options: GameRunOptions) => {
    setPlayOptions(options);
    setStep('play');
  };

  const copyPreviewShareLink = async (gameId: string) => {
    const shareUrl = getGameShareUrl(gameId);
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Share link copied!');
    } catch (error) {
      alert(`Copy failed. Share this link:\n${shareUrl}`);
    }
  };

  const persistPreviewGame = async (gameToSave: GeneratedGame, opts?: { overrideIsPublic?: boolean }) => {
    if (gameToSave.config.type === GameType.STOP_THE_FIRE && gameToSave.config.stopTheFireMode === 'bank') {
      alert('Word Bank games cannot be shared or saved. Switch to Manual or AI to save this game.');
      return null;
    }

    const nextGame = prepareGameForLibrarySave(gameToSave, user, opts?.overrideIsPublic);
    const result = await saveGameToLibrary(nextGame, user?.id, user?.name);
    if (!result.success) {
      alert('Failed to save. Please try again.');
      return null;
    }

    const savedGame = { ...nextGame, id: result.id ?? nextGame.id };
    setGame(savedGame);
    setSessionGame(null);
    return savedGame;
  };

  const handlePreviewSave = async () => {
    if (!game) return;
    const savedGame = await persistPreviewGame(game);
    if (!savedGame) return;
    alert('Game saved to your library.');
  };

  const handlePreviewEdit = () => {
    setSessionGame(null);
    setStep('editor');
  };

  const handlePreviewPlay = (gameToPlay: GeneratedGame) => {
    setSessionGame(gameToPlay);
    setPlayReturnStep('preview');

    if (gameToPlay.config.type === GameType.MILLIONAIRE) {
      setPlayOptions({
        players: 1,
        timerSeconds: 0,
        enableBonuses: false,
        strictMode: false,
        muted: false,
      });
      setStep('play');
    } else if (gameToPlay.config.type === GameType.STOP_THE_FIRE) {
      setPlayOptions({
        players: 2,
        timerSeconds: 60,
        enableBonuses: false,
        strictMode: false,
        muted: false,
        stopTheFireCategoryCount: 10,
        stopTheFireDifficulty: 'beginner',
      });
      setStep('play');
    } else if (gameToPlay.config.type === GameType.SURVEY_SHOWDOWN) {
      setPlayOptions({
        players: 2,
        timerSeconds: 0,
        enableBonuses: false,
        strictMode: false,
        muted: false,
      });
      setStep('setup');
    } else {
      setStep('setup');
    }
  };

  const handleGameEnd = () => {
    setStep(playReturnStep);
  };

  const handlePreviewShare = async () => {
    if (!game) return;

    if (game.config.type === GameType.STOP_THE_FIRE && game.config.stopTheFireMode === 'bank') {
      alert('Word Bank games cannot be shared or saved. Switch to Manual or AI to save this game.');
      return;
    }

    if (game.sourceGameId && isUUID(game.sourceGameId)) {
      await copyPreviewShareLink(game.sourceGameId);
      return;
    }

    let shareGame = game;
    if (!shareGame.config.isPublic) {
      const confirmPublic = window.confirm('This game is private. Make it public to share?');
      if (!confirmPublic) return;
      const savedGame = await persistPreviewGame(shareGame, { overrideIsPublic: true });
      if (!savedGame) return;
      shareGame = savedGame;
    } else if (!isUUID(shareGame.id)) {
      const savedGame = await persistPreviewGame(shareGame);
      if (!savedGame) return;
      shareGame = savedGame;
    }

    if (!shareGame.id || !isUUID(shareGame.id)) {
      alert('Please save this game before sharing.');
      return;
    }

    await copyPreviewShareLink(shareGame.id);
  };

  const handleReplay = () => {
    setPlayKey((prev) => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg max-w-lg w-full p-8 text-center">
          <h1 className="font-display text-2xl font-bold text-slate-800 mb-2">Sign in to view this shared game</h1>
          <p className="text-slate-500 mb-6">
            Shared games are available to registered teachers. Create a free account to continue.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setShowLogin(true)}
              className="bg-brand-blue text-white font-bold px-6 py-3 rounded-xl flex items-center justify-center"
            >
              <LogIn size={16} className="mr-2" /> Log in / Sign up
            </button>
            <button
              onClick={() => navigate('/games')}
              className="bg-white border border-slate-200 text-slate-700 font-bold px-6 py-3 rounded-xl"
            >
              Back to Games
            </button>
          </div>
        </div>
        <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
      </div>
    );
  }

  if (loadState === 'loading' || loadState === 'idle') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (loadState === 'not-found') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg max-w-lg w-full p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle size={22} />
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-800 mb-2">Game not available</h1>
          <p className="text-slate-500 mb-6">
            This game may have been set to private or removed by the owner.
          </p>
          <button
            onClick={() => navigate('/games')}
            className="bg-brand-blue text-white font-bold px-6 py-3 rounded-xl"
          >
            Back to Games
          </button>
        </div>
      </div>
    );
  }

  if (loadState === 'error' || !game) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg max-w-lg w-full p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
            <AlertTriangle size={22} />
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-800 mb-2">Unable to load game</h1>
          <p className="text-slate-500 mb-6">Please try again or ask the owner to reshare.</p>
          <button
            onClick={() => navigate('/games')}
            className="bg-brand-blue text-white font-bold px-6 py-3 rounded-xl"
          >
            Back to Games
          </button>
        </div>
      </div>
    );
  }

  if (step === 'preview' && game) {
    return (
      <GamePreview
        game={game}
        source="community"
        onBack={() => navigate('/games')}
        onEdit={handlePreviewEdit}
        onPlay={handlePreviewPlay}
        onSave={handlePreviewSave}
        onShare={handlePreviewShare}
        saveLabel="Save copy"
      />
    );
  }

  if (step === 'editor' && game) {
    return (
      <GameEditor
        game={game}
        onSave={(updated) => {
          setGame(updated);
          setSessionGame(null);
        }}
        onPlay={(updated) => {
          setGame(updated);
          setSessionGame(updated);
          setPlayReturnStep('editor');
          if (updated.config.type === GameType.MILLIONAIRE) {
            setPlayOptions({
              players: 1,
              timerSeconds: 0,
              enableBonuses: false,
              strictMode: false,
              muted: false,
            });
            setStep('play');
          } else if (updated.config.type === GameType.STOP_THE_FIRE) {
            setPlayOptions({
              players: 2,
              timerSeconds: 60,
              enableBonuses: false,
              strictMode: false,
              muted: false,
              stopTheFireCategoryCount: 10,
              stopTheFireDifficulty: 'beginner',
            });
            setStep('play');
          } else if (updated.config.type === GameType.SURVEY_SHOWDOWN) {
            setPlayOptions({
              players: 2,
              timerSeconds: 0,
              enableBonuses: false,
              strictMode: false,
              muted: false,
            });
            setStep('setup');
          } else {
            setStep('setup');
          }
        }}
        onBack={() => setStep('preview')}
      />
    );
  }

  if (step === 'setup' && (sessionGame || game)) {
    return (
      <GameSetup
        game={sessionGame || game!}
        onBack={() => setStep(playReturnStep)}
        onStart={handleGameStart}
        backLabel={playReturnStep === 'preview' ? 'Back to Preview' : 'Back to Editor'}
      />
    );
  }

  if (!playOptions || !(sessionGame || game)) {
    return null;
  }

  const commonProps = {
    game: sessionGame || game!,
    options: playOptions,
    onFinish: () => navigate('/games'),
    onReplay: handleReplay,
  };

  if (game.config.type === GameType.JEOPARDY) {
    return <JeopardyGame key={playKey} {...commonProps} onBack={handleGameEnd} />;
  }
  if (game.config.type === GameType.TRIVIA) {
    return <TriviaGame key={playKey} {...commonProps} onBack={handleGameEnd} />;
  }
  if (game.config.type === GameType.PUB_QUIZ) {
    return <PubQuizGame key={playKey} {...commonProps} onBack={handleGameEnd} />;
  }
  if (game.config.type === GameType.DARTS) {
    return <DartsGame key={playKey} {...commonProps} onBack={handleGameEnd} />;
  }
  if (game.config.type === GameType.SNAKES_LADDERS) {
    return <SnakesLaddersGame key={playKey} {...commonProps} onBack={handleGameEnd} />;
  }
  if (game.config.type === GameType.MILLIONAIRE) {
    return <MillionaireGame key={playKey} {...commonProps} onBack={handleGameEnd} />;
  }
  if (game.config.type === GameType.TIME_BOMB) {
    return <TimeBombGame key={playKey} {...commonProps} onBack={handleGameEnd} />;
  }
  if (game.config.type === GameType.SURVEY_SHOWDOWN) {
    return <SurveyShowdownGame key={playKey} {...commonProps} onBack={handleGameEnd} />;
  }
  if (game.config.type === GameType.STOP_THE_FIRE) {
    return <StopTheFireGame key={playKey} {...commonProps} onBack={handleGameEnd} />;
  }
  if (game.config.type === GameType.WORD_WHEEL) {
    return <WordWheelGame key={playKey} {...commonProps} onBack={handleGameEnd} />;
  }

  return null;
};
