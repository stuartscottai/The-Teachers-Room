
import React, { useState } from 'react';
import { GeneratedGame, GameRunOptions } from '../../types';
import { Play, Clock, Users, Gift, ArrowLeft } from 'lucide-react';

interface GameSetupProps {
  game: GeneratedGame;
  onBack: () => void;
  onStart: (options: GameRunOptions) => void;
}

export const GameSetup: React.FC<GameSetupProps> = ({ game, onBack, onStart }) => {
  // Default settings
  const [options, setOptions] = useState<GameRunOptions>({
    players: 2,
    timerSeconds: 30,
    enableBonuses: false,
    strictMode: game.config.strictMode || false
  });

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side - Hero/Summary */}
        <div className="bg-brand-blue text-white p-8 md:w-2/5 flex flex-col justify-between">
          <div>
            <button 
              onClick={onBack} 
              className="text-sky-200 hover:text-white flex items-center mb-6 text-sm font-bold"
            >
              <ArrowLeft size={16} className="mr-1" /> Back to Editor
            </button>
            <h1 className="font-display text-3xl font-bold mb-2 leading-tight">{game.title}</h1>
            <p className="text-sky-100 text-sm">{game.config.type}</p>
          </div>
          <div className="mt-8">
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wider font-bold text-sky-300 mb-1">Topic</p>
              <p className="font-medium">{game.config.topic || "General Knowledge"}</p>
            </div>
          </div>
        </div>

        {/* Right Side - Configuration */}
        <div className="p-8 md:w-3/5">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Game Setup</h2>
          
          <div className="space-y-6">
            {/* Teams */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
                <Users size={16} className="mr-2 text-brand-blue" /> Number of Teams
              </label>
              <div className="flex space-x-2">
                {[2, 3, 4, 5, 6].map(num => (
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

            {/* Timer */}
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

            {/* Random Bonuses */}
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
                      <p className="text-xs text-slate-500">Randomly hides bonuses (2x points, Steals, Bombs) behind questions.</p>
                    </div>
                 </div>
                 <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center
                    ${options.enableBonuses ? 'border-brand-blue bg-brand-blue' : 'border-slate-300'}`}>
                    {options.enableBonuses && <div className="w-2 h-2 bg-white rounded-full" />}
                 </div>
              </div>
            </div>

            <button 
              onClick={() => onStart(options)}
              className="w-full py-4 bg-brand-blue text-white text-lg font-bold rounded-xl shadow-lg hover:bg-sky-600 hover:shadow-xl transition-all flex items-center justify-center transform hover:-translate-y-1"
            >
              <Play size={20} className="mr-2" /> Start Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
