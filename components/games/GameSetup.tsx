
import React, { useState, useEffect } from 'react';
import { BonusCardType, GeneratedGame, GameRunOptions, GameType } from '../../types';
import { Play, Clock, Users, Gift, ArrowLeft, Grid, Edit3, AlertCircle, Volume2, VolumeX, Music, X, Settings2, Target, Hash, Zap, Heart, Shuffle, List } from 'lucide-react';
import { playSound, SOUND_VARIANTS } from '../../utils/gameUtils';

interface GameSetupProps {
  game: GeneratedGame;
  onBack: () => void;
  onStart: (options: GameRunOptions) => void;
  backLabel?: string;
}

export const GameSetup: React.FC<GameSetupProps> = ({ game, onBack, onStart, backLabel = 'Back to Editor' }) => {
  // Default settings
  const [options, setOptions] = useState<GameRunOptions>({
    players: 2,
    timerSeconds: game.config.type === GameType.TIME_BOMB ? 60 : 30, // Default for time bomb
    enableBonuses: false,
    bonusOptions: ['double', 'bust', 'steal', 'lose-all', 'reset-score', 'first-place', 'last-place'],
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
  });

  const [showSoundLab, setShowSoundLab] = useState(false);

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
    if (game.config.type !== GameType.WORD_WHEEL) return;
    if (options.players <= 4) return;
    setOptions(prev => ({ ...prev, players: 4 }));
  }, [game.config.type, options.players]);

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
  const playerOptions = game.config.type === GameType.WORD_WHEEL ? [1, 2, 3, 4] : [1, 2, 3, 4, 5, 6];
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
  const setupCardClass = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
  const setupLabelClass = 'mb-3 flex items-center text-sm font-black uppercase tracking-wide text-slate-600';

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex items-center justify-between gap-3">
            <button 
              onClick={onBack} 
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 shadow-sm hover:border-sky-200 hover:text-brand-blue"
            >
            <ArrowLeft size={16} className="mr-2" /> {backLabel}
            </button>
              <button 
                onClick={() => setOptions({ ...options, muted: !options.muted })}
            className={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-black shadow-sm transition-colors ${options.muted ? 'bg-white text-slate-400 border border-slate-200' : 'bg-sky-50 text-brand-blue border border-sky-100'}`}
                title="Toggle Sound"
              >
            {options.muted ? <VolumeX size={18} className="mr-2" /> : <Volume2 size={18} className="mr-2" />}
            {options.muted ? 'Sound Off' : 'Sound On'}
              </button>
          </div>

        <div className="mb-6 rounded-3xl bg-brand-blue p-6 text-white shadow-xl shadow-sky-100">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
            <div className="min-w-0">
              <p className="mb-2 text-sm font-black uppercase tracking-wide text-sky-100">{game.config.type}</p>
              <h1 className="font-display text-4xl font-black leading-tight sm:text-5xl">{game.title}</h1>
              <p className="mt-4 max-w-3xl text-base font-semibold text-sky-50">
                Topic: {game.config.topic || 'General Knowledge'}
              </p>
            </div>
            <button 
              onClick={() => setShowSoundLab(true)}
              className="inline-flex h-14 items-center justify-center rounded-2xl bg-white/16 px-5 font-black text-white ring-1 ring-white/20 transition-colors hover:bg-white/24"
            >
              <Settings2 size={18} className="mr-2" /> Configure Sounds
            </button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className={setupCardClass}>
            <h2 className="mb-5 font-display text-2xl font-black text-slate-900">Teams</h2>
            <div className="space-y-6">
              <div>
                <label className={setupLabelClass}>
                    <Users size={16} className="mr-2 text-brand-blue" /> Players / Teams
                  </label>
                <div className="grid grid-cols-6 gap-2">
                    {playerOptions.map(num => (
                      <button
                        key={num}
                        onClick={() => setOptions({ ...options, players: num })}
                      className={`h-12 rounded-xl font-black transition-all
                          ${options.players === num 
                          ? 'bg-brand-blue text-white shadow-md shadow-sky-100' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
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
                <div className="grid max-h-[245px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                        {options.teamNames?.map((name, idx) => (
                    <div key={idx} className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-slate-400">{idx + 1}</span>
                                <input 
                                    type="text" 
                                    value={name}
                                    onChange={(e) => handleTeamNameChange(idx, e.target.value)}
                        className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-800 outline-none"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          </section>

          <section className={setupCardClass}>
            <h2 className="mb-5 font-display text-2xl font-black text-slate-900">Game Rules</h2>
            <div className="grid gap-5">
                
                {/* CONFIGURATION OPTIONS BASED ON GAME TYPE */}
                
                {game.config.type === GameType.TIME_BOMB ? (
                    <>
                        <div>
                            <label className={setupLabelClass}>
                                <Zap size={16} className="mr-2 text-brand-blue" /> Initial Bomb Time
                            </label>
                            <select 
                                value={options.bombDuration}
                                onChange={(e) => setOptions({ ...options, bombDuration: Number(e.target.value) })}
                                className="w-full rounded-xl border border-slate-200 bg-white p-4 font-bold outline-none focus:ring-2 focus:ring-brand-blue"
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
                                        onClick={() => setOptions({ ...options, teamLives: num })}
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
                            value={options.timerSeconds}
                            onChange={(e) => setOptions({ ...options, timerSeconds: Number(e.target.value) })}
                            className="w-full rounded-xl border border-slate-200 bg-white p-4 font-bold outline-none focus:ring-2 focus:ring-brand-blue"
                        >
                            <option value={0}>No Timer</option>
                            <option value={15}>15 Seconds</option>
                            <option value={30}>30 Seconds</option>
                            <option value={60}>60 Seconds</option>
                        </select>
                    </div>
                )}

                {/* Question Randomization Toggle (Where applicable) */}
                {showRandomizeOption && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <label className={setupLabelClass}>
                            <Shuffle size={16} className="mr-2 text-brand-blue" /> Question Order
                        </label>
                        <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-300 bg-white">
                            <button
                                onClick={() => setOptions({...options, randomizeQuestions: true})}
                                className={`py-3 text-sm font-black transition-colors ${options.randomizeQuestions ? 'bg-brand-blue text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                            >
                                Random
                            </button>
                            <button
                                onClick={() => setOptions({...options, randomizeQuestions: false})}
                                className={`py-3 text-sm font-black transition-colors ${!options.randomizeQuestions ? 'bg-brand-blue text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                            >
                                Sequential
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                            {options.randomizeQuestions ? "Shuffle questions each time." : "Play in created order."}
                        </p>
                    </div>
                )}

            </div>
          </section>

          <section className={`${setupCardClass} lg:col-span-2`}>
            <h2 className="mb-5 font-display text-2xl font-black text-slate-900">Game Options</h2>
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-5">
                {/* Darts Mode Selection */}
                {game.config.type === GameType.DARTS && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div>
                            <label className={setupLabelClass}>
                                <Target size={16} className="mr-2 text-brand-blue" /> Game Mode
                            </label>
                            <select 
                                value={options.dartsMode}
                                onChange={(e) => setOptions({ ...options, dartsMode: e.target.value as any })}
                                className="w-full rounded-xl border border-slate-200 bg-white p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-brand-blue"
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
                                    value={options.dartsLegs}
                                    onChange={(e) => setOptions({ ...options, dartsLegs: Number(e.target.value) })}
                                    className="w-full rounded-xl border border-slate-200 bg-white p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-brand-blue"
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
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <label className={setupLabelClass}>
                                <Grid size={16} className="mr-2 text-brand-blue" /> Grid Size (Questions)
                            </label>
                            {validQuestionCounts.length > 0 ? (
                                <select 
                                    value={options.questionLimit}
                                    onChange={(e) => setOptions({ ...options, questionLimit: Number(e.target.value) })}
                                    className="w-full rounded-xl border border-slate-200 bg-white p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-brand-blue"
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
                            <p className="mt-2 text-xs font-semibold text-slate-400">
                               Total questions must divide evenly by the number of teams.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <label className={setupLabelClass}>Question Points</label>
                            <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-300 bg-white">
                                <button
                                    onClick={() => setOptions({ ...options, triviaRandomPoints: false })}
                                    className={`py-3 text-sm font-black transition-colors ${!options.triviaRandomPoints ? 'bg-brand-blue text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                                >
                                    Saved Points
                                </button>
                                <button
                                    onClick={() => setOptions({ ...options, triviaRandomPoints: true })}
                                    className={`py-3 text-sm font-black transition-colors ${options.triviaRandomPoints ? 'bg-brand-blue text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                                >
                                    Random
                                </button>
                            </div>
                            <p className="mt-2 text-xs font-semibold text-slate-400">
                                {options.triviaRandomPoints
                                    ? 'Each card gets a random value at game start.'
                                    : 'Keep the points currently saved in this game.'}
                            </p>
                        </div>
                    </>
                )}

                {game.config.type === GameType.WORD_WHEEL && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <label className={setupLabelClass}>
                            <Zap size={16} className="mr-2 text-brand-blue" /> Scoring Mode
                        </label>
                        <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-300 bg-white">
                            <button
                                onClick={() => setOptions({ ...options, wordWheelScoringMode: 'classic' })}
                                className={`py-3 text-sm font-black transition-colors ${options.wordWheelScoringMode !== 'speed-bonus' ? 'bg-brand-blue text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                            >
                                Classic
                            </button>
                            <button
                                onClick={() => setOptions({ ...options, wordWheelScoringMode: 'speed-bonus' })}
                                className={`py-3 text-sm font-black transition-colors ${options.wordWheelScoringMode === 'speed-bonus' ? 'bg-brand-blue text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                            >
                                Speed Bonus
                            </button>
                        </div>
                        <p className="mt-2 text-xs font-semibold text-slate-400">
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

                {![
                  GameType.DARTS,
                  GameType.TRIVIA,
                  GameType.WORD_WHEEL,
                ].includes(game.config.type) && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                    <p className="font-bold text-slate-500">No extra setup needed for this game type.</p>
                  </div>
                )}
              </div>

              <div>
                {game.config.type !== GameType.PUB_QUIZ && game.config.type !== GameType.DARTS && game.config.type !== GameType.TIME_BOMB && game.config.type !== GameType.SURVEY_SHOWDOWN && game.config.type !== GameType.WORD_WHEEL ? (
                  <div className={`rounded-2xl border-2 p-4 transition-all ${options.enableBonuses ? 'border-brand-yellow bg-yellow-50' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        className="flex min-w-0 items-center text-left"
                        onClick={() => setOptions({ ...options, enableBonuses: !options.enableBonuses })}
                      >
                        <div className={`mr-3 rounded-full p-3 ${options.enableBonuses ? 'bg-brand-yellow text-slate-900' : 'bg-white text-slate-400'}`}>
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
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                    <Gift className="mx-auto mb-2 text-slate-300" size={28} />
                    <p className="font-bold text-slate-500">Bonus cards are not used in this game type.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

          <div className="mt-6">
            <button 
              onClick={() => onStart(options)}
              disabled={game.config.type === GameType.TRIVIA && validQuestionCounts.length === 0}
            className={`flex w-full items-center justify-center rounded-2xl bg-brand-blue py-5 text-xl font-black text-white shadow-lg shadow-sky-100 transition-all hover:-translate-y-0.5 hover:bg-sky-600 hover:shadow-xl
                ${game.config.type === GameType.TRIVIA && validQuestionCounts.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Play size={20} className="mr-2" /> Start Game
            </button>
          </div>
      </div>

      {/* SOUND LAB MODAL */}
      {showSoundLab && (
        <div className="fixed inset-x-0 bottom-0 top-[calc(4rem+env(safe-area-inset-top))] sm:inset-0 z-[100] flex items-start sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full h-full max-h-full sm:h-auto sm:max-h-[90vh] p-6 animate-fade-in relative overflow-y-auto">
                <button 
                    onClick={() => setShowSoundLab(false)}
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
                        { id: 'correct', label: 'Correct Answer', color: 'green' },
                        { id: 'incorrect', label: 'Incorrect Answer', color: 'red' },
                        { id: 'select', label: 'Tile Select', color: 'sky' },
                        { id: 'win', label: 'Game Win', color: 'yellow' },
                        { id: 'bonus', label: 'Bonus Reveal', color: 'purple' },
                        { id: 'timesUp', label: 'Time\'s Up', color: 'slate', soundId: 'times-up' }
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
                                    className={`ml-4 p-3 rounded-full shadow-sm hover:shadow-md transition-all active:scale-95 bg-${item.color}-100 text-${item.color}-700 hover:bg-${item.color}-200`}
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
