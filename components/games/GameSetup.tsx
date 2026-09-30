import { useWorkspaceDialog } from './GameWorkspace';

import React, { useState, useEffect } from 'react';
import { BonusCardType, GeneratedGame, GameRunOptions, GameType, SnakesLaddersBonusType } from '../../types';
import { Play, Clock, Users, Gift, ArrowLeft, Grid, Edit3, AlertCircle, Volume2, VolumeX, Music, X, Settings2, Target, Hash, Zap, Heart, Shuffle, Hexagon } from 'lucide-react';
import { playSound, SOUND_VARIANTS } from '../../utils/gameUtils';

interface GameSetupProps {
  game: GeneratedGame;
  onBack: () => void;
  onStart: (options: GameRunOptions) => void;
  backLabel?: string;
}

const SNAKES_LADDERS_BONUS_CHOICES: Array<{
  id: SnakesLaddersBonusType;
  label: string;
  description: string;
  requiresOpponent?: boolean;
}> = [
  { id: 'move-forward', label: 'Move forward', description: 'Move forward by 2, 5, 7 or 10 spaces.' },
  { id: 'move-five', label: 'Up to 5 forward or back', description: 'Choose any square from 1 to 5 spaces ahead or behind.' },
  { id: 'swap-positions', label: 'Swap positions', description: 'Choose another player and exchange positions.', requiresOpponent: true },
  { id: 'extra-turn', label: 'Take another turn', description: 'Roll again and answer another question.' },
  { id: 'skip-next', label: 'Skip next player', description: 'The next player in turn order misses one turn.', requiresOpponent: true },
  { id: 'move-rival-back', label: 'Move a rival back', description: 'Choose another player and move them back 5 spaces.', requiresOpponent: true },
  { id: 'send-rival-to-snake', label: 'Send rival down a snake', description: 'Choose a rival and send them down the nearest snake behind them.', requiresOpponent: true },
];

export const GameSetup: React.FC<GameSetupProps> = ({ game, onBack, onStart, backLabel = 'Back to Editor' }) => {
  // Default settings
  const [options, setOptions] = useState<GameRunOptions>({
    players: 2,
    timerSeconds: game.config.type === GameType.TIME_BOMB ? 60 : 30, // Default for time bomb
    enableBonuses: false,
    bonusOptions: ['double', 'bust', 'steal', 'lose-all', 'reset-score', 'first-place', 'last-place'],
    snakesLaddersBonusOptions: SNAKES_LADDERS_BONUS_CHOICES.map((choice) => choice.id),
    strictMode: game.config.strictMode || false,
    questionLimit: game.questions?.length || 0,
    teamNames: ['Team 1', 'Team 2'],
    muted: false,
    soundConfig: {
        correct: 'LevelUp',
        incorrect: 'WompWomp',
        select: 'Blip',
        win: 'Orchestral',
        bonus: 'Secret',
        timesUp: 'Gong'
    },
    dartsMode: 'high-score',
    dartsLegs: 5,
    teamLives: 3, // Default lives
    bombDuration: 60,
    randomizeQuestions: true, // Default to random
    triviaRandomPoints: false,
    wordWheelScoringMode: game.config.wordWheelScoringMode || 'classic',
    wordWheelLetterRule: game.config.wordWheelLetterRule || 'contains-hard',
    blockBeatersMode: game.config.blockBeatersMode || (game.config.questionType === 'open' ? 'letters' : 'numbers'),
    blockBeatersBoardSize: game.config.blockBeatersBoardSize || 'small',
    blockBeatersPoints: 10,
    blockBeatersSteals: true,
    blockBeatersStealLimit: 3,
  });

  const [showSoundLab, setShowSoundLab] = useState(false);
  const soundDialogRef = useWorkspaceDialog(showSoundLab, () => setShowSoundLab(false));
  const blockBeatersQuestionCount = game.questions?.length || 0;
  const blockBeatersSinglePlayer = game.config.type === GameType.BLOCK_BEATERS && (options.players || 1) <= 1;
  const getBlockBeatersRequiredQuestions = (boardSize: 'small' | 'medium' | 'large') => {
    const tiles = boardSize === 'large' ? 49 : boardSize === 'medium' ? 36 : 25;
    return tiles + 12;
  };
  const blockBeatersBoardOptions: Array<{ value: 'small' | 'medium' | 'large'; label: string; required: number }> = [
    { value: 'small', label: 'Small - 5 x 5', required: getBlockBeatersRequiredQuestions('small') },
    { value: 'medium', label: 'Medium - 6 x 6', required: getBlockBeatersRequiredQuestions('medium') },
    { value: 'large', label: 'Large - 7 x 7', required: getBlockBeatersRequiredQuestions('large') },
  ];
  const blockBeatersSelectedRequired = getBlockBeatersRequiredQuestions(options.blockBeatersBoardSize || 'small');
  const blockBeatersWillRepeatQuestions = game.config.type === GameType.BLOCK_BEATERS && blockBeatersQuestionCount > 0 && blockBeatersQuestionCount < blockBeatersSelectedRequired;

  // Lock scroll when sound lab is open
  useEffect(() => {
    if (showSoundLab) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showSoundLab]);

  // Calculate valid question counts for Trivia (must be divisible by players)
  const [validQuestionCounts, setValidQuestionCounts] = useState<number[]>([]);

  useEffect(() => {
    if (![GameType.WORD_WHEEL, GameType.BLOCK_BEATERS].includes(game.config.type)) return;
    if (options.players <= 4) return;
    setOptions(prev => ({ ...prev, players: 4 }));
  }, [game.config.type, options.players]);

  useEffect(() => {
    if (!blockBeatersSinglePlayer || !options.enableBonuses) return;
    setOptions(prev => ({ ...prev, enableBonuses: false }));
  }, [blockBeatersSinglePlayer, options.enableBonuses]);

  // Update team names array when player count changes
  useEffect(() => {
    setOptions(prev => {
        const currentNames = prev.teamNames || [];
        const newNames = Array.from({ length: prev.players }, (_, i) => {
            return currentNames[i] || (prev.players === 1 ? 'Player 1' : `Team ${i + 1}`);
        });
        return { ...prev, teamNames: newNames };
    });
  }, [options.players]);

  useEffect(() => {
    if (game.config.type === GameType.TRIVIA && game.questions) {
        const totalAvailable = game.questions.length;
        const validOptions: number[] = [];

        const maxValid = Math.floor(totalAvailable / options.players) * options.players;

        for (let i = maxValid; i >= options.players; i -= options.players) {
            if (i >= 4) {
                 validOptions.unshift(i);
            }
        }

        setValidQuestionCounts(validOptions);

        if (validOptions.length > 0) {
            setOptions(prev => ({ ...prev, questionLimit: validOptions[validOptions.length - 1] }));
        }
    }
  }, [game.config.type, game.questions, options.players]);

  const handleTeamNameChange = (index: number, name: string) => {
      const newNames = [...(options.teamNames || [])];
      newNames[index] = name;
      setOptions({ ...options, teamNames: newNames });
  };

  const updateSoundConfig = (type: string, variant: string) => {
      setOptions(prev => ({
          ...prev,
          soundConfig: {
              ...prev.soundConfig!,
              [type]: variant
          }
      }));
  };

  const showRandomizeOption = ![GameType.JEOPARDY, GameType.PUB_QUIZ, GameType.MILLIONAIRE, GameType.WORD_WHEEL].includes(game.config.type);
  const playerOptions = [GameType.WORD_WHEEL, GameType.BLOCK_BEATERS].includes(game.config.type) ? [1, 2, 3, 4] : [1, 2, 3, 4, 5, 6];
  const bonusChoices: { id: BonusCardType; label: string; description: string }[] = [
    { id: 'double', label: 'Double points', description: 'Current team gets double this card value.' },
    { id: 'bust', label: 'Lose card value', description: 'Current team loses this card value.' },
    { id: 'steal', label: 'Point steal', description: 'Current team steals points from the leader.' },
    { id: 'lose-all', label: 'Lose all points', description: 'Current team drops to 0 points.' },
    { id: 'reset-score', label: 'Reset score', description: 'Current team goes back to 0 points.' },
    { id: 'first-place', label: 'Go into first place', description: 'Current team jumps just ahead of the leader.' },
    { id: 'last-place', label: 'Go to last place', description: 'Current team drops just behind the lowest team.' },
  ];
  const toggleBonusChoice = (bonusType: BonusCardType) => {
    setOptions((prev) => {
      const current = prev.bonusOptions?.length ? prev.bonusOptions : bonusChoices.map((choice) => choice.id);
      const next = current.includes(bonusType)
        ? current.filter((item) => item !== bonusType)
        : [...current, bonusType];
      return { ...prev, bonusOptions: next.length ? next : current };
    });
  };
  const toggleSnakesLaddersBonusChoice = (bonusType: SnakesLaddersBonusType) => {
    setOptions((prev) => {
      const current = prev.snakesLaddersBonusOptions?.length
        ? prev.snakesLaddersBonusOptions
        : SNAKES_LADDERS_BONUS_CHOICES.map((choice) => choice.id);
      const next = current.includes(bonusType)
        ? current.filter((item) => item !== bonusType)
        : [...current, bonusType];
      return { ...prev, snakesLaddersBonusOptions: next.length ? next : current };
    });
  };
  const setupCardClass = 'workspace-setup-card';
  const hasExtraRules = [GameType.DARTS, GameType.TRIVIA, GameType.WORD_WHEEL, GameType.BLOCK_BEATERS].includes(game.config.type);
  const hasBonusOptions = ![GameType.PUB_QUIZ, GameType.DARTS, GameType.TIME_BOMB, GameType.SURVEY_SHOWDOWN, GameType.WORD_WHEEL].includes(game.config.type);
  const setupLabelClass = 'mb-2 flex items-center text-sm font-semibold text-slate-700';

  // Derive the recap from the same values passed to Start Game, including
  // questions already selected in Preview and this screen's Trivia limit.
  const groupedQuestions = game.config.type === GameType.JEOPARDY
    ? game.jeopardyBoard : game.config.type === GameType.PUB_QUIZ ? game.pubQuizRounds : undefined;
  const availableQuestionCount = groupedQuestions?.length
    ? groupedQuestions.reduce((total, group) => total + group.questions.length, 0)
    : game.questions?.length || 0;
  const selectedQuestionCount = game.config.type === GameType.TRIVIA
    ? validQuestionCounts.includes(options.questionLimit || 0) ? options.questionLimit! : 0
    : availableQuestionCount;
  const categoryCount = (game.stopTheFireCategories || []).filter(category => category.trim()).length
    || (game.stopTheFireRounds || []).reduce((total, round) => total + round.categories.filter(category => category.trim()).length, 0);

  return (
    <div className="game-workspace workspace-setup min-h-screen">
      <div className="workspace-shell">
        <button onClick={onBack} className="workspace-back"><ArrowLeft size={18} /> {backLabel}</button>
        <header className="workspace-setup-header">
          <div className="min-w-0">
            <p className="workspace-eyebrow mb-2">Ready to play <span className="px-1 text-slate-300">/</span> {game.config.type}</p>
            <h1 className="workspace-heading">{game.title}</h1>
            <p className="mt-2 text-sm text-slate-600">{game.config.topic || 'Choose your teams and game settings.'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button type="button" onClick={() => setOptions({ ...options, muted: !options.muted })} className="workspace-button" aria-pressed={!options.muted} title="Toggle Sound">
              {options.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}{options.muted ? 'Sound off' : 'Sound on'}
            </button>
            <button type="button" onClick={() => setShowSoundLab(true)} className="workspace-button"><Settings2 size={18} /> Configure Sounds</button>
          </div>
        </header>

        <div className="workspace-setup-grid">
          <section className={setupCardClass}>
            <h2 className="workspace-section-title">Teams</h2>
            <div className="space-y-4">
              <div>
                <label className={setupLabelClass}>
                    <Users size={16} className="mr-2 text-brand-blue" /> Players / Teams
                  </label>
                <div className="grid grid-cols-6 gap-2">
                    {playerOptions.map(num => (
                      <button
                        key={num}
                        onClick={() => setOptions({ ...options, players: num })}
                      aria-pressed={options.players === num}
                      className={`h-11 rounded-lg border font-bold transition-colors
                          ${options.players === num
                          ? 'bg-sky-50 text-sky-800 border-sky-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
              </div>
              <div>
                <label className={setupLabelClass}>
                        <Edit3 size={16} className="mr-2 text-brand-blue" /> Names
                    </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {options.teamNames?.map((name, idx) => (
                    <div key={idx} className="workspace-team-name">
                      <span className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-slate-400">{idx + 1}</span>
                                <input
                                    type="text"
                                    value={name} aria-label={`Team ${idx + 1} name`}
                                    onChange={(e) => handleTeamNameChange(idx, e.target.value)}
                        className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-semibold text-slate-800 outline-none focus:ring-0"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          </section>

          <section className={setupCardClass}>
            <h2 className="workspace-section-title">Game rules</h2>
            <div className="grid gap-4">

                {/* CONFIGURATION OPTIONS BASED ON GAME TYPE */}

                {game.config.type === GameType.TIME_BOMB ? (
                    <>
                        <div>
                            <label className={setupLabelClass}>
                                <Zap size={16} className="mr-2 text-brand-blue" /> Initial Bomb Time
                            </label>
                            <select
                                aria-label="Initial bomb time" value={options.bombDuration}
                                onChange={(e) => setOptions({ ...options, bombDuration: Number(e.target.value) })}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-blue"
                            >
                                <option value={30}>30 Seconds (Blitz)</option>
                                <option value={45}>45 Seconds (Fast)</option>
                                <option value={60}>60 Seconds (Standard)</option>
                                <option value={90}>90 Seconds (Long)</option>
                                <option value={120}>2 Minutes (Marathon)</option>
                            </select>
                        </div>
                        <div>
                            <label className={setupLabelClass}>
                                <Heart size={16} className="mr-2 text-brand-blue" /> Lives per Team
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {[1, 2, 3, 5].map(num => (
                                    <button
                                        key={num}
                                        aria-pressed={options.teamLives === num} onClick={() => setOptions({ ...options, teamLives: num })}
                                        className={`rounded-xl border py-3 font-bold transition-all
                                        ${options.teamLives === num
                                            ? 'bg-red-100 text-red-600 border-red-300'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <div>
                        <label className={setupLabelClass}>
                            <Clock size={16} className="mr-2 text-brand-blue" /> Answer Timer
                        </label>
                        <select
                            aria-label="Answer timer" value={options.timerSeconds}
                            onChange={(e) => setOptions({ ...options, timerSeconds: Number(e.target.value) })}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-blue"
                        >
                            <option value={0}>No Timer</option>
                            <option value={15}>15 Seconds</option>
                            <option value={30}>30 Seconds</option>
                            <option value={60}>60 Seconds</option>
                        </select>
                        {game.config.type === GameType.SURVEY_SHOWDOWN && <p className="mt-2 text-sm text-slate-500">Time for each team’s guess. Running out of time adds a strike and passes the turn. You can pause during play.</p>}
                    </div>
                )}

                {/* Question Randomization Toggle (Where applicable) */}
                {showRandomizeOption && (
                    <div className="workspace-setup-field-group">
                        <label className={setupLabelClass}>
                            <Shuffle size={16} className="mr-2 text-brand-blue" /> Question Order
                        </label>
                        <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-300 bg-white">
                            <button
                                aria-pressed={options.randomizeQuestions} onClick={() => setOptions({...options, randomizeQuestions: true})}
                                className={`py-3 text-sm font-black transition-colors ${options.randomizeQuestions ? 'bg-sky-50 text-sky-800' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                            >
                                Random
                            </button>
                            <button
                                aria-pressed={!options.randomizeQuestions} onClick={() => setOptions({...options, randomizeQuestions: false})}
                                className={`py-3 text-sm font-black transition-colors ${!options.randomizeQuestions ? 'bg-sky-50 text-sky-800' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                            >
                                Sequential
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            {options.randomizeQuestions ? "Shuffle questions each time." : "Play in created order."}
                        </p>
                    </div>
                )}

            </div>
          </section>

          {(hasExtraRules || hasBonusOptions) && <section className={`${setupCardClass} lg:col-span-2 workspace-setup-options`}>
            <h2 className="workspace-section-title">Game options</h2>
            <div className={`grid gap-5 ${hasExtraRules && hasBonusOptions ? 'lg:grid-cols-2' : ''}`}>
              <div className={hasExtraRules ? `workspace-setup-extra ${game.config.type === GameType.DARTS ? 'workspace-setup-extra-wide' : ''}` : 'hidden'}>
                {/* Darts Mode Selection */}
                {game.config.type === GameType.DARTS && (
                    <div className="workspace-setup-field-group">
                        <div>
                            <label className={setupLabelClass}>
                                <Target size={16} className="mr-2 text-brand-blue" /> Game Mode
                            </label>
                            <select
                                aria-label="Game mode" value={options.dartsMode}
                                onChange={(e) => setOptions({ ...options, dartsMode: e.target.value as any })}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-brand-blue"
                            >
                                <option value="high-score">High Score (Standard)</option>
                                <option value="301">301 (Double Out)</option>
                            </select>
                        </div>

                        {options.dartsMode === 'high-score' && (
                            <div className="mt-4 animate-fade-in">
                                <label className={setupLabelClass}>
                                    <Hash size={16} className="mr-2 text-brand-blue" /> Turns per Player
                                </label>
                                <select
                                    aria-label="Turns per player" value={options.dartsLegs}
                                    onChange={(e) => setOptions({ ...options, dartsLegs: Number(e.target.value) })}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-brand-blue"
                                >
                                    <option value={3}>3 Turns (Short)</option>
                                    <option value={5}>5 Turns (Standard)</option>
                                    <option value={10}>10 Turns (Long)</option>
                                    <option value={15}>15 Turns (Marathon)</option>
                                </select>
                            </div>
                        )}
                        <p className="mt-3 text-xs font-semibold text-slate-500">
                            {options.dartsMode === '301'
                                ? "Start at 301, finish exactly on 0. Must end with a Double."
                                : `Players take turns scoring. Highest score after ${options.dartsLegs} turns wins.`}
                        </p>
                    </div>
                )}

                {/* Trivia Specific: Grid Size Selection */}
                {game.config.type === GameType.TRIVIA && (
                    <>
                        <div className="workspace-setup-field-group">
                            <label className={setupLabelClass}>
                                <Grid size={16} className="mr-2 text-brand-blue" /> Grid Size (Questions)
                            </label>
                            {validQuestionCounts.length > 0 ? (
                                <select
                                    aria-label="Grid size" value={options.questionLimit}
                                    onChange={(e) => setOptions({ ...options, questionLimit: Number(e.target.value) })}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-brand-blue"
                                >
                                    {validQuestionCounts.map(count => (
                                        <option key={count} value={count}>
                                            {count} Questions ({(count / options.players).toFixed(0)} turns each)
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <div className="flex rounded-xl bg-red-50 p-3 text-xs font-bold text-red-500">
                                    <AlertCircle size={14} className="mr-1" />
                                    Can't split {game.questions?.length} Qs evenly among {options.players} teams.
                                </div>
                            )}
                            <p className="mt-2 text-xs text-slate-600">
                               Total questions must divide evenly by the number of teams.
                            </p>
                        </div>

                        <div className="workspace-setup-field-group">
                            <label className={setupLabelClass}>Question Points</label>
                            <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-300 bg-white">
                                <button
                                    aria-pressed={!options.triviaRandomPoints} onClick={() => setOptions({ ...options, triviaRandomPoints: false })}
                                    className={`py-3 text-sm font-black transition-colors ${!options.triviaRandomPoints ? 'bg-sky-50 text-sky-800' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                                >
                                    Saved Points
                                </button>
                                <button
                                    aria-pressed={options.triviaRandomPoints} onClick={() => setOptions({ ...options, triviaRandomPoints: true })}
                                    className={`py-3 text-sm font-black transition-colors ${options.triviaRandomPoints ? 'bg-sky-50 text-sky-800' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                                >
                                    Random
                                </button>
                            </div>
                            <p className="mt-2 text-xs text-slate-600">
                                {options.triviaRandomPoints
                                    ? 'Each card gets a random value at game start.'
                                    : 'Keep the points currently saved in this game.'}
                            </p>
                        </div>
                    </>
                )}

                {game.config.type === GameType.WORD_WHEEL && (
                    <div className="workspace-setup-field-group">
                        <label className={setupLabelClass}>
                            <Zap size={16} className="mr-2 text-brand-blue" /> Scoring Mode
                        </label>
                        <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-300 bg-white">
                            <button
                                aria-pressed={options.wordWheelScoringMode !== 'speed-bonus'} onClick={() => setOptions({ ...options, wordWheelScoringMode: 'classic' })}
                                className={`py-3 text-sm font-black transition-colors ${options.wordWheelScoringMode !== 'speed-bonus' ? 'bg-sky-50 text-sky-800' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                            >
                                Classic
                            </button>
                            <button
                                aria-pressed={options.wordWheelScoringMode === 'speed-bonus'} onClick={() => setOptions({ ...options, wordWheelScoringMode: 'speed-bonus' })}
                                className={`py-3 text-sm font-black transition-colors ${options.wordWheelScoringMode === 'speed-bonus' ? 'bg-sky-50 text-sky-800' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                            >
                                Speed Bonus
                            </button>
                        </div>
                        <p className="mt-2 text-xs text-slate-600">
                            {options.wordWheelScoringMode === 'speed-bonus'
                                ? 'Correct answers can earn up to 10 extra points based on remaining time.'
                                : 'Each correct answer gives fixed points.'}
                        </p>
                        <p className="mt-2 text-xs font-semibold text-slate-500">
                            Letter rule: {(options.wordWheelLetterRule || 'contains-hard') === 'contains-hard'
                                ? 'Q/V/X/Y/Z can contain or start with the letter; others start with the letter.'
                                : 'All letters use starts with.'}
                        </p>
                    </div>
                )}

                {game.config.type === GameType.BLOCK_BEATERS && (
                    <div className="workspace-setup-field-group">
                        <label className={setupLabelClass}>
                            <Hexagon size={16} className="mr-2 text-brand-blue" /> Block Beaters Rules
                        </label>
                        <div className="grid gap-4">
                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                                <span className="block text-xs font-black uppercase tracking-wide text-slate-500">Content Mode</span>
                                <span className="mt-1 block text-base font-black text-slate-800">
                                    {(game.config.blockBeatersMode || options.blockBeatersMode || 'letters') === 'numbers' ? 'Numbers' : 'Letters'}
                                </span>
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                    This is decided when the game is created.
                                </p>
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">Board Size</label>
                                <select
                                    aria-label="Board size" value={options.blockBeatersBoardSize}
                                    onChange={(event) => setOptions({ ...options, blockBeatersBoardSize: event.target.value as any })}
                                    className="w-full rounded-xl border border-slate-200 bg-white p-3 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-brand-blue"
                                >
                                    {blockBeatersBoardOptions.map((board) => (
                                        <option
                                            key={board.value}
                                            value={board.value}
                                        >
                                            {board.label} - {board.required} questions recommended
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-2 text-xs font-semibold text-slate-500">
                                    Questions are drawn when tiles are selected. This game has {blockBeatersQuestionCount} questions.
                                </p>
                                {blockBeatersWillRepeatQuestions && (
                                    <div className="setup-warning mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                                        <AlertCircle size={18} className="mt-0.5 shrink-0" />
                                        <p className="text-xs font-bold leading-5">
                                            This set has fewer questions than recommended for this board size, so some questions may be repeated during the game.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="block">
                                    <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">Correct Answer Points</span>
                                    <input
                                        type="number"
                                        min={1}
                                        max={100}
                                        value={options.blockBeatersPoints || 10}
                                        onChange={(event) => setOptions({ ...options, blockBeatersPoints: Math.max(1, Number(event.target.value) || 10) })}
                                        className="w-full rounded-xl border border-slate-200 bg-white p-3 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-brand-blue"
                                    />
                                </label>
                                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                                    <input
                                        type="checkbox"
                                        checked={options.blockBeatersSteals !== false}
                                        onChange={(event) => setOptions({ ...options, blockBeatersSteals: event.target.checked })}
                                        className="h-4 w-4 rounded border-slate-300 text-brand-blue"
                                    />
                                    <span>
                                        <span className="block text-sm font-black text-slate-800">Tile stealing</span>
                                        <span className="block text-xs font-semibold text-slate-500">Teams can retake owned tiles.</span>
                                    </span>
                                </label>
                            </div>
                            {options.blockBeatersSteals !== false && !blockBeatersSinglePlayer && (
                                <div>
                                    <label htmlFor="block-beaters-steal-limit" className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">Steals per team</label>
                                    <select
                                        id="block-beaters-steal-limit"
                                        value={options.blockBeatersStealLimit ?? 3}
                                        onChange={(event) => setOptions({ ...options, blockBeatersStealLimit: Number(event.target.value) })}
                                        className="w-full rounded-xl border border-slate-200 bg-white p-3 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-brand-blue"
                                    >
                                        {[1, 2, 3, 4].map((count) => <option key={count} value={count}>{count} {count === 1 ? 'steal' : 'steals'}</option>)}
                                    </select>
                                    <p className="mt-2 text-xs font-semibold text-slate-500">Each team can retake this many tiles from opponents.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}


              </div>

              <div className={hasBonusOptions ? "workspace-setup-bonuses" : "hidden"}>
                {game.config.type === GameType.BLOCK_BEATERS ? (
                  <div className={`setup-bonus-panel rounded-2xl border-2 p-4 transition-all ${options.enableBonuses ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-slate-50'} ${blockBeatersSinglePlayer ? 'opacity-75' : ''}`}>
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        className="flex min-w-0 items-center text-left"
                        onClick={() => {
                          if (blockBeatersSinglePlayer) return;
                          setOptions({ ...options, enableBonuses: !options.enableBonuses });
                        }}
                        disabled={blockBeatersSinglePlayer}
                      >
                        <div className={`mr-3 rounded-full p-3 ${options.enableBonuses ? 'bg-brand-blue text-white' : 'bg-white text-slate-400'}`}>
                          <Gift size={22} />
                        </div>
                        <div>
                          <h3 className="font-display text-xl font-black text-slate-900">Board Bonuses</h3>
                          <p className="text-sm font-semibold text-slate-500">
                            {blockBeatersSinglePlayer
                              ? 'Bonuses are disabled for one-player games.'
                              : 'Hidden rewards change tile ownership, not points.'}
                          </p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (blockBeatersSinglePlayer) return;
                          setOptions({ ...options, enableBonuses: !options.enableBonuses });
                        }}
                        disabled={blockBeatersSinglePlayer}
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${options.enableBonuses ? 'border-brand-blue bg-brand-blue' : 'border-slate-300 bg-white'} ${blockBeatersSinglePlayer ? 'cursor-not-allowed' : ''}`}
                        aria-label={options.enableBonuses ? 'Disable board bonuses' : 'Enable board bonuses'}
                        aria-pressed={options.enableBonuses}
                      >
                        {options.enableBonuses && <div className="h-3 w-3 rounded-full bg-white" />}
                      </button>
                    </div>
                    {options.enableBonuses && (
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {[
                          ['Free tile', 'Claim one open tile.'],
                          ['Steal tile', 'Change an opponent tile to yours.'],
                          ['Remove tile', 'Clear an opponent tile.'],
                          ['Shield tile', 'Protect one tile from the next steal.'],
                          ['Extra turn', 'Take one more turn immediately.'],
                          ['Swap tile', 'Swap one of your tiles with an opponent tile.'],
                        ].map(([label, description]) => (
                          <div key={label} className="rounded-xl border border-sky-200 bg-white p-3">
                            <span className="block text-sm font-black text-slate-800">{label}</span>
                            <span className="block text-xs leading-4 text-slate-500">{description}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : game.config.type === GameType.SNAKES_LADDERS ? (
                  <div className={`setup-bonus-panel rounded-2xl border-2 p-4 transition-all ${options.enableBonuses ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        className="flex min-w-0 items-center text-left"
                        onClick={() => setOptions({ ...options, enableBonuses: !options.enableBonuses })}
                      >
                        <div className={`mr-3 rounded-full p-3 ${options.enableBonuses ? 'bg-brand-blue text-white' : 'bg-white text-slate-400'}`}>
                          <Gift size={22} />
                        </div>
                        <div>
                          <h3 className="font-display text-xl font-black text-slate-900">Bonus Orbs</h3>
                          <p className="text-sm font-semibold text-slate-500">Land on a floating star to trigger one of your selected effects.</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setOptions({ ...options, enableBonuses: !options.enableBonuses })}
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${options.enableBonuses ? 'border-brand-blue bg-brand-blue' : 'border-slate-300 bg-white'}`}
                        aria-label={options.enableBonuses ? 'Disable bonus orbs' : 'Enable bonus orbs'}
                        aria-pressed={options.enableBonuses}
                      >
                        {options.enableBonuses && <div className="h-3 w-3 rounded-full bg-white" />}
                      </button>
                    </div>
                    {options.enableBonuses && (
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {SNAKES_LADDERS_BONUS_CHOICES.map((choice) => {
                          const unavailable = Boolean(choice.requiresOpponent && options.players < 2);
                          const checked = !unavailable && (options.snakesLaddersBonusOptions || []).includes(choice.id);
                          return (
                            <button
                              key={choice.id}
                              type="button"
                              disabled={unavailable}
                              onClick={() => toggleSnakesLaddersBonusChoice(choice.id)}
                              className={`flex min-h-[78px] items-start gap-2 rounded-xl border p-3 text-left transition-colors ${checked ? 'border-brand-blue bg-white text-slate-800' : 'border-slate-200 bg-white/70 text-slate-500'} ${unavailable ? 'cursor-not-allowed opacity-55' : ''}`}
                            >
                              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${checked ? 'border-brand-blue bg-brand-blue' : 'border-slate-300 bg-white'}`}>
                                {checked && <span className="h-2 w-2 rounded-sm bg-white" />}
                              </span>
                              <span>
                                <span className="block text-sm font-black">{choice.label}</span>
                                <span className="block text-xs leading-4">
                                  {unavailable ? 'Requires at least two players.' : choice.description}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : game.config.type !== GameType.PUB_QUIZ && game.config.type !== GameType.DARTS && game.config.type !== GameType.TIME_BOMB && game.config.type !== GameType.SURVEY_SHOWDOWN && game.config.type !== GameType.WORD_WHEEL ? (
                  <div className={`setup-bonus-panel chaos-options rounded-2xl border-2 p-4 transition-all ${options.enableBonuses ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        className="flex min-w-0 items-center text-left"
                        onClick={() => setOptions({ ...options, enableBonuses: !options.enableBonuses })}
                      >
                        <div className={`mr-3 rounded-full p-3 ${options.enableBonuses ? 'bg-brand-blue text-white' : 'bg-white text-slate-400'}`}>
                          <Gift size={22} />
                        </div>
                        <div>
                          <h3 className="font-display text-xl font-black text-slate-900">Chaos Mode</h3>
                          <p className="text-sm font-semibold text-slate-500">Hide bonus cards behind questions.</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setOptions({ ...options, enableBonuses: !options.enableBonuses })}
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${options.enableBonuses ? 'border-brand-blue bg-brand-blue' : 'border-slate-300 bg-white'}`}
                        aria-label={options.enableBonuses ? 'Disable chaos mode' : 'Enable chaos mode'}
                        aria-pressed={options.enableBonuses}
                      >
                        {options.enableBonuses && <div className="h-3 w-3 rounded-full bg-white" />}
                      </button>
                    </div>
                    {options.enableBonuses && (
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {bonusChoices.map((choice) => {
                          const checked = (options.bonusOptions || []).includes(choice.id);
                          return (
                            <button
                              key={choice.id}
                              type="button"
                              onClick={() => toggleBonusChoice(choice.id)}
                              className={`flex min-h-[78px] items-start gap-2 rounded-xl border p-3 text-left transition-colors ${checked ? 'border-brand-blue bg-white text-slate-800' : 'border-slate-200 bg-white/70 text-slate-500'}`}
                            >
                              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${checked ? 'border-brand-blue bg-brand-blue' : 'border-slate-300 bg-white'}`}>
                                {checked && <span className="h-2 w-2 rounded-sm bg-white" />}
                              </span>
                              <span>
                                <span className="block text-sm font-black">{choice.label}</span>
                                <span className="block text-xs leading-4">{choice.description}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </section>}
        </div>

          <section className="workspace-start-bar" aria-label="Game setup summary">
            <div className="workspace-setup-summary">
              <h2 className="font-semibold text-slate-800">{options.players} {options.players === 1 ? 'player' : 'teams'} ready</h2>
              <p className="mt-1 text-sm text-slate-600">{game.config.type === GameType.STOP_THE_FIRE
                ? categoryCount ? `${categoryCount} categories selected` : 'Built-in category bank'
                : `${selectedQuestionCount} ${selectedQuestionCount === 1 ? 'question' : 'questions'} selected of ${availableQuestionCount} available`}</p>
            </div>
            <button
              onClick={() => onStart(options)}
              disabled={game.config.type === GameType.TRIVIA && validQuestionCounts.length === 0}
            className="workspace-button workspace-button-play"
            >
              <Play size={20} className="mr-2" /> Start Game
            </button>
          </section>
      </div>

      {/* SOUND LAB MODAL */}
      {showSoundLab && (
        <div className="fixed inset-x-0 bottom-0 top-[calc(4rem+env(safe-area-inset-top))] z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-3 backdrop-blur-sm sm:p-4">
            <div ref={soundDialogRef} role="dialog" aria-modal="true" aria-label="Sound Lab" tabIndex={-1} className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-full p-4 sm:p-6 animate-fade-in relative overflow-y-auto">
                <button
                    onClick={() => setShowSoundLab(false)} aria-label="Close sound settings"
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full p-1"
                >
                    <X size={20} />
                </button>

                <h2 className="font-display text-2xl font-bold text-slate-800 mb-1 flex items-center">
                    <Music className="mr-2 text-brand-blue" /> Sound Lab
                </h2>
                <p className="text-slate-500 text-sm mb-6 border-b border-slate-100 pb-4">Customize the sound effects for your game.</p>

                <div className="space-y-4">
                    {[
                        { id: 'correct', label: 'Correct Answer' },
                        { id: 'incorrect', label: 'Incorrect Answer' },
                        { id: 'select', label: 'Tile Select' },
                        { id: 'win', label: 'Game Win' },
                        { id: 'bonus', label: 'Bonus Reveal' },
                        { id: 'timesUp', label: 'Time\'s Up', soundId: 'times-up' }
                    ].map((item) => {
                        const configKey = item.id;
                        const soundType = item.soundId || item.id;
                        return (
                            <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">{item.label}</label>
                                    <select
                                        value={options.soundConfig?.[configKey as keyof typeof options.soundConfig]}
                                        onChange={(e) => updateSoundConfig(configKey, e.target.value)}
                                        className="w-full text-sm font-bold text-slate-800 bg-white border border-slate-200 rounded p-1.5 focus:border-brand-blue outline-none cursor-pointer"
                                    >
                                        {SOUND_VARIANTS[configKey as keyof typeof SOUND_VARIANTS].map((variant) => (
                                            <option key={variant} value={variant}>{variant}</option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    onClick={() => playSound(soundType as any, false, options.soundConfig?.[configKey as keyof typeof options.soundConfig])}
                                    className="sound-lab-play ml-4 rounded-full p-3 shadow-sm transition-colors"
                                    title="Test Sound"
                                >
                                    <Play size={16} fill="currentColor" />
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-8">
                     <button
                        onClick={() => setShowSoundLab(false)}
                        className="w-full py-3 bg-brand-blue text-white font-bold rounded-xl hover:bg-sky-600 transition-colors"
                     >
                        Done
                     </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
