
import React, { useState, useEffect } from 'react';
import { GeneratedGame, GameRunOptions, GameType } from '../../types';
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

  const showRandomizeOption = ![GameType.JEOPARDY, GameType.PUB_QUIZ, GameType.MILLIONAIRE].includes(game.config.type);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side - Hero/Summary */}
        <div className="bg-brand-blue text-white p-8 md:w-1/3 flex flex-col justify-between">
          <div>
            <button 
              onClick={onBack} 
              className="text-sky-200 hover:text-white flex items-center mb-6 text-sm font-bold"
            >
              <ArrowLeft size={16} className="mr-1" /> {backLabel}
            </button>
            <h1 className="font-display text-3xl font-bold mb-2 leading-tight">{game.title}</h1>
            <p className="text-sky-100 text-sm">{game.config.type}</p>
          </div>
          <div className="mt-8">
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wider font-bold text-sky-300 mb-1">Topic</p>
              <p className="font-medium">{game.config.topic || "General Knowledge"}</p>
            </div>
            {/* Sound Lab Entry */}
            <button 
                onClick={() => setShowSoundLab(true)}
                className="mt-6 w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold flex items-center justify-center transition-colors"
            >
                <Settings2 size={16} className="mr-2" /> Configure Sounds
            </button>
          </div>
        </div>

        {/* Right Side - Configuration */}
        <div className="p-8 md:w-2/3">
          <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Game Setup</h2>
              <button 
                onClick={() => setOptions({ ...options, muted: !options.muted })}
                className={`p-2 rounded-full transition-colors ${options.muted ? 'bg-slate-100 text-slate-400' : 'bg-sky-50 text-brand-blue'}`}
                title="Toggle Sound"
              >
                  {options.muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                {/* Teams Count */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
                    <Users size={16} className="mr-2 text-brand-blue" /> Players / Teams
                  </label>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <button
                        key={num}
                        onClick={() => setOptions({ ...options, players: num })}
                        className={`w-10 h-10 rounded-lg font-bold transition-all
                          ${options.players === num 
                            ? 'bg-brand-blue text-white shadow-md scale-110' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Team Names Inputs */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
                        <Edit3 size={16} className="mr-2 text-brand-blue" /> Names
                    </label>
                    <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto pr-2">
                        {options.teamNames?.map((name, idx) => (
                            <div key={idx} className="flex items-center">
                                <span className="text-xs font-bold text-slate-400 w-6">{idx + 1}.</span>
                                <input 
                                    type="text" 
                                    value={name}
                                    onChange={(e) => handleTeamNameChange(idx, e.target.value)}
                                    className="flex-1 p-2 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-brand-blue outline-none"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                
                {/* CONFIGURATION OPTIONS BASED ON GAME TYPE */}
                
                {game.config.type === GameType.TIME_BOMB ? (
                    <>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
                                <Zap size={16} className="mr-2 text-brand-blue" /> Initial Bomb Time
                            </label>
                            <select 
                                value={options.bombDuration}
                                onChange={(e) => setOptions({ ...options, bombDuration: Number(e.target.value) })}
                                className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-blue outline-none bg-white font-bold"
                            >
                                <option value={30}>30 Seconds (Blitz)</option>
                                <option value={45}>45 Seconds (Fast)</option>
                                <option value={60}>60 Seconds (Standard)</option>
                                <option value={90}>90 Seconds (Long)</option>
                                <option value={120}>2 Minutes (Marathon)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
                                <Heart size={16} className="mr-2 text-brand-blue" /> Lives per Team
                            </label>
                            <div className="flex space-x-2">
                                {[1, 2, 3, 5].map(num => (
                                    <button
                                        key={num}
                                        onClick={() => setOptions({ ...options, teamLives: num })}
                                        className={`flex-1 py-2 rounded-lg font-bold transition-all border
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
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
                            <Clock size={16} className="mr-2 text-brand-blue" /> Answer Timer
                        </label>
                        <select 
                            value={options.timerSeconds}
                            onChange={(e) => setOptions({ ...options, timerSeconds: Number(e.target.value) })}
                            className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-blue outline-none bg-white"
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
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
                            <Shuffle size={16} className="mr-2 text-brand-blue" /> Question Order
                        </label>
                        <div className="flex rounded-lg overflow-hidden border border-slate-300">
                            <button
                                onClick={() => setOptions({...options, randomizeQuestions: true})}
                                className={`flex-1 py-2 text-xs font-bold transition-colors ${options.randomizeQuestions ? 'bg-brand-blue text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                            >
                                Random
                            </button>
                            <button
                                onClick={() => setOptions({...options, randomizeQuestions: false})}
                                className={`flex-1 py-2 text-xs font-bold transition-colors ${!options.randomizeQuestions ? 'bg-brand-blue text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                            >
                                Sequential
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                            {options.randomizeQuestions ? "Shuffle questions each time." : "Play in created order."}
                        </p>
                    </div>
                )}

                {/* Darts Mode Selection */}
                {game.config.type === GameType.DARTS && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
                                <Target size={16} className="mr-2 text-brand-blue" /> Game Mode
                            </label>
                            <select 
                                value={options.dartsMode}
                                onChange={(e) => setOptions({ ...options, dartsMode: e.target.value as any })}
                                className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-blue outline-none bg-white font-bold text-slate-800"
                            >
                                <option value="high-score">High Score (Standard)</option>
                                <option value="301">301 (Double Out)</option>
                            </select>
                        </div>
                        
                        {options.dartsMode === 'high-score' && (
                            <div className="animate-fade-in">
                                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
                                    <Hash size={16} className="mr-2 text-brand-blue" /> Turns per Player
                                </label>
                                <select 
                                    value={options.dartsLegs}
                                    onChange={(e) => setOptions({ ...options, dartsLegs: Number(e.target.value) })}
                                    className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-blue outline-none bg-white font-bold text-slate-800"
                                >
                                    <option value={3}>3 Turns (Short)</option>
                                    <option value={5}>5 Turns (Standard)</option>
                                    <option value={10}>10 Turns (Long)</option>
                                    <option value={15}>15 Turns (Marathon)</option>
                                </select>
                            </div>
                        )}
                        <p className="text-xs text-slate-500">
                            {options.dartsMode === '301' 
                                ? "Start at 301, finish exactly on 0. Must end with a Double."
                                : `Players take turns scoring. Highest score after ${options.dartsLegs} turns wins.`}
                        </p>
                    </div>
                )}

                {/* Trivia Specific: Grid Size Selection */}
                {game.config.type === GameType.TRIVIA && (
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
                            <Grid size={16} className="mr-2 text-brand-blue" /> Grid Size (Questions)
                        </label>
                        {validQuestionCounts.length > 0 ? (
                            <select 
                                value={options.questionLimit}
                                onChange={(e) => setOptions({ ...options, questionLimit: Number(e.target.value) })}
                                className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-blue outline-none bg-white font-bold text-slate-800"
                            >
                                {validQuestionCounts.map(count => (
                                    <option key={count} value={count}>
                                        {count} Questions ({(count / options.players).toFixed(0)} turns each)
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <div className="text-xs text-red-500 font-bold bg-red-50 p-2 rounded flex items-center">
                                <AlertCircle size={14} className="mr-1" />
                                Can't split {game.questions?.length} Qs evenly among {options.players} teams.
                            </div>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1">
                           * We enforce fairness: Total questions must be divisible by the number of teams.
                        </p>
                    </div>
                )}

                {/* Random Bonuses - Hidden for Pub Quiz, Time Bomb, and Survey Showdown */}
                {game.config.type !== GameType.PUB_QUIZ && game.config.type !== GameType.DARTS && game.config.type !== GameType.TIME_BOMB && game.config.type !== GameType.SURVEY_SHOWDOWN && (
                    <div 
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all
                        ${options.enableBonuses 
                          ? 'border-brand-yellow bg-yellow-50' 
                          : 'border-slate-100 hover:border-slate-200'}`}
                      onClick={() => setOptions({ ...options, enableBonuses: !options.enableBonuses })}
                    >
                      <div className="flex items-center justify-between">
                         <div className="flex items-center">
                            <div className={`p-2 rounded-full mr-3 ${options.enableBonuses ? 'bg-brand-yellow text-slate-900' : 'bg-slate-100 text-slate-400'}`}>
                              <Gift size={20} />
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-800">Chaos Mode</h3>
                              <p className="text-xs text-slate-500">Hides 20% bonuses behind questions.</p>
                            </div>
                         </div>
                         <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center
                            ${options.enableBonuses ? 'border-brand-blue bg-brand-blue' : 'border-slate-300'}`}>
                            {options.enableBonuses && <div className="w-2 h-2 bg-white rounded-full" />}
                         </div>
                      </div>
                    </div>
                )}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <button 
              onClick={() => onStart(options)}
              disabled={game.config.type === GameType.TRIVIA && validQuestionCounts.length === 0}
              className={`w-full py-4 bg-brand-blue text-white text-lg font-bold rounded-xl shadow-lg hover:bg-sky-600 hover:shadow-xl transition-all flex items-center justify-center transform hover:-translate-y-1
                ${game.config.type === GameType.TRIVIA && validQuestionCounts.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Play size={20} className="mr-2" /> Start Game
            </button>
          </div>
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
