import React, { useState, useEffect } from 'react';
import { GameType, GameConfig, GeneratedGame } from '../../types';
import { generateGameContent } from '../../services/geminiService';
import { ArrowLeft, Settings, Sparkles, Edit, Gift, X } from 'lucide-react';

// Mode Selector Sub-Component
export const ModeSelector: React.FC<{ type: GameType, onBack: () => void, onModeSelect: (mode: 'ai' | 'manual') => void }> = ({ type, onBack, onModeSelect }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full relative">
                <button onClick={onBack} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                    <X size={24} />
                </button>
                <h2 className="font-display text-3xl font-bold text-slate-800 mb-2 text-center">Create {type}</h2>
                <p className="text-center text-slate-500 mb-8">How would you like to build your game?</p>
                
                <div className="space-y-4">
                    <button 
                        onClick={() => onModeSelect('manual')}
                        className="w-full p-6 border-2 border-slate-200 rounded-xl hover:border-sky-500 hover:bg-sky-50 transition-all group flex items-center"
                    >
                        <div className="bg-slate-100 p-3 rounded-full mr-4 group-hover:bg-white">
                            <Edit className="text-slate-700 group-hover:text-sky-600" size={24} />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-slate-800 text-lg">Manual Creation</h3>
                            <p className="text-slate-500 text-sm">Build from scratch using the editor table.</p>
                        </div>
                    </button>

                    <button 
                        onClick={() => onModeSelect('ai')}
                        className="w-full p-6 border-2 border-brand-yellow/50 rounded-xl hover:border-brand-yellow hover:bg-yellow-50 transition-all group flex items-center"
                    >
                        <div className="bg-brand-yellow p-3 rounded-full mr-4">
                            <Sparkles className="text-slate-900" size={24} />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-slate-800 text-lg">Use AI Assistant</h3>
                            <p className="text-slate-500 text-sm">Generate questions instantly with a prompt.</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}

interface GameConfiguratorProps {
    type: GameType;
    mode: 'ai' | 'manual';
    onBack: () => void;
    onProceed: (game: GeneratedGame) => void;
}

export const GameConfigurator: React.FC<GameConfiguratorProps> = ({ type, mode, onBack, onProceed }) => {
    const [config, setConfig] = useState<GameConfig>({
        type,
        title: '',
        players: 2,
        questionCount: 10,
        timerSeconds: 30,
        bonusQuestions: true,
        questionType: 'mixed',
        topic: '',
        isAI: mode === 'ai',
        customInstructions: '',
        jeopardyCategories: 5,
        jeopardyCategoryNames: Array(5).fill(''),
        jeopardyRows: 5,
        strictMode: false,
        hiddenBonuses: false
    });
    const [loading, setLoading] = useState(false);

    // Update category names array when number of categories changes
    useEffect(() => {
        if (type === GameType.JEOPARDY && config.jeopardyCategories) {
            setConfig(prev => {
                const current = prev.jeopardyCategoryNames || [];
                const targetLen = prev.jeopardyCategories || 5;
                if (current.length === targetLen) return prev;
                
                const newNames = [...current];
                if (newNames.length < targetLen) {
                    return { ...prev, jeopardyCategoryNames: [...newNames, ...Array(targetLen - newNames.length).fill('')] };
                } else {
                    return { ...prev, jeopardyCategoryNames: newNames.slice(0, targetLen) };
                }
            });
        }
    }, [config.jeopardyCategories, type]);

    const handleGenerate = async () => {
        if (!config.title) {
            alert("Please enter a Game Title!");
            return;
        }
        
        // AI MODE
        if (mode === 'ai') {
            if (type !== GameType.JEOPARDY && !config.topic) {
                alert("Please enter a Topic!");
                return;
            }
            if (type === GameType.JEOPARDY) {
                 if (config.jeopardyCategoryNames?.some(n => !n.trim())) {
                    alert("Please name all your Jeopardy Categories!");
                    return;
                }
            }

            setLoading(true);
            try {
                const gameData = await generateGameContent(config);
                onProceed(gameData);
            } catch (err) {
                alert("Failed to generate game. Please check API configuration.");
            } finally {
                setLoading(false);
            }
        } 
        // MANUAL MODE
        else {
            // Create empty shell game
            const emptyGame: GeneratedGame = {
                id: Date.now().toString(),
                createdAt: new Date().toISOString(),
                title: config.title,
                config: config,
                questions: [],
                jeopardyBoard: type === GameType.JEOPARDY 
                    ? (config.jeopardyCategoryNames || []).map(name => ({
                        name: name || 'Category',
                        questions: Array.from({ length: config.jeopardyRows || 5 }).map((_, i) => ({
                            id: i,
                            question: '',
                            answer: '',
                            points: (i + 1) * 100,
                            isBonus: false,
                            bonusType: 'none'
                        }))
                    }))
                    : []
            };
            onProceed(emptyGame);
        }
    };

    return (
        <div className="max-w-3xl mx-auto px-4 py-12">
            <button onClick={onBack} className="flex items-center text-slate-500 hover:text-sky-600 mb-8">
                <ArrowLeft size={18} className="mr-2" /> Back
            </button>
            
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
                <div className="flex items-center mb-8 pb-6 border-b border-slate-100">
                    <div className="bg-brand-yellow p-3 rounded-lg mr-4 shadow-sm">
                        <Settings className="text-slate-800" size={24} />
                    </div>
                    <div>
                        <h2 className="font-display text-2xl font-bold text-slate-800">Configure {type}</h2>
                        <p className="text-slate-500 text-sm">{mode === 'ai' ? 'Define parameters for AI generation' : 'Setup game structure'}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Global Title Field */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Game Title <span className="text-red-500">*</span></label>
                        <input 
                            type="text" 
                            value={config.title}
                            onChange={(e) => setConfig({...config, title: e.target.value})}
                            placeholder="e.g., Class 5B Friday Fun" 
                            className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-400 outline-none" 
                        />
                    </div>

                    {/* AI Specific Fields */}
                    {mode === 'ai' && type !== GameType.JEOPARDY && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Topic / Subject <span className="text-red-500">*</span></label>
                            <input 
                                type="text" 
                                value={config.topic}
                                onChange={(e) => setConfig({...config, topic: e.target.value})}
                                placeholder="e.g., Ancient Rome, Multiplication Tables" 
                                className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-400 outline-none" 
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Number of Players/Teams</label>
                            <select 
                                value={config.players}
                                onChange={(e) => setConfig({...config, players: Number(e.target.value)})}
                                className="w-full p-3 rounded-lg border border-slate-200 outline-none"
                            >
                                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} Teams</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Timer (Seconds)</label>
                            <select 
                                value={config.timerSeconds}
                                onChange={(e) => setConfig({...config, timerSeconds: Number(e.target.value)})}
                                className="w-full p-3 rounded-lg border border-slate-200 outline-none"
                            >
                                <option value={0}>No Timer</option>
                                <option value={15}>15s</option>
                                <option value={30}>30s</option>
                                <option value={60}>60s</option>
                            </select>
                        </div>
                    </div>

                    {/* Specific Jeopardy Settings */}
                    {type === GameType.JEOPARDY ? (
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-6">
                             <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Number of Categories</label>
                                    <select 
                                        value={config.jeopardyCategories}
                                        onChange={(e) => setConfig({...config, jeopardyCategories: Number(e.target.value)})}
                                        className="w-full p-3 rounded-lg border border-slate-200 outline-none"
                                    >
                                        {[3, 4, 5, 6].map(n => <option key={n} value={n}>{n} Categories</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Questions per Category</label>
                                    <select 
                                        value={config.jeopardyRows}
                                        onChange={(e) => setConfig({...config, jeopardyRows: Number(e.target.value)})}
                                        className="w-full p-3 rounded-lg border border-slate-200 outline-none"
                                    >
                                        {[3, 4, 5].map(n => <option key={n} value={n}>{n} Rows</option>)}
                                    </select>
                                </div>
                            </div>

                            {mode === 'ai' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Question Type</label>
                                    <select 
                                        value={config.questionType}
                                        onChange={(e) => setConfig({...config, questionType: e.target.value as any})}
                                        className="w-full p-3 rounded-lg border border-slate-200 outline-none"
                                    >
                                        <option value="open">Open Ended (Standard)</option>
                                        <option value="multiple-choice">Multiple Choice</option>
                                        <option value="gap-fill">Gap Fill</option>
                                        <option value="mixed">Mixed Variety</option>
                                        <option value="ai-decide">Let AI Decide</option>
                                    </select>
                                </div>
                            )}
                            
                            {/* Dynamic Category Name Inputs */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-3">Category Names <span className="text-red-500">*</span></label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {config.jeopardyCategoryNames?.map((name, idx) => (
                                        <input 
                                            key={idx}
                                            type="text"
                                            value={name}
                                            onChange={(e) => {
                                                const newNames = [...(config.jeopardyCategoryNames || [])];
                                                newNames[idx] = e.target.value;
                                                setConfig({...config, jeopardyCategoryNames: newNames});
                                            }}
                                            placeholder={`Category ${idx + 1} Name`}
                                            className="p-2 rounded border border-slate-300 text-sm focus:border-sky-500 outline-none"
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col space-y-3 pt-2 border-t border-slate-200">
                                <div className="flex items-center space-x-3">
                                    <input 
                                        type="checkbox" 
                                        id="strictMode"
                                        checked={config.strictMode}
                                        onChange={(e) => setConfig({...config, strictMode: e.target.checked})}
                                        className="w-5 h-5 text-sky-600 rounded focus:ring-sky-500"
                                    />
                                    <label htmlFor="strictMode" className="text-slate-700 text-sm font-medium">Strict Mode (Must say "What is...")</label>
                                </div>
                                {mode === 'ai' && (
                                    <div className="flex items-center space-x-3">
                                        <input 
                                            type="checkbox" 
                                            id="hiddenBonuses"
                                            checked={config.hiddenBonuses}
                                            onChange={(e) => setConfig({...config, hiddenBonuses: e.target.checked})}
                                            className="w-5 h-5 text-sky-600 rounded focus:ring-sky-500"
                                        />
                                        <label htmlFor="hiddenBonuses" className="text-slate-700 text-sm font-medium flex items-center">
                                            <Gift size={16} className="mr-2 text-brand-accent" />
                                            Random Hidden Bonuses (Double pts, Bankrupt, Steal)
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        // Standard Game config parts...
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Question Count</label>
                                <input 
                                    type="number" 
                                    min={5} 
                                    max={50}
                                    value={config.questionCount}
                                    onChange={(e) => setConfig({...config, questionCount: Number(e.target.value)})}
                                    className="w-full p-3 rounded-lg border border-slate-200 outline-none"
                                />
                            </div>
                            {mode === 'ai' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Question Type</label>
                                    <select 
                                        value={config.questionType}
                                        onChange={(e) => setConfig({...config, questionType: e.target.value as any})}
                                        className="w-full p-3 rounded-lg border border-slate-200 outline-none"
                                    >
                                        <option value="multiple-choice">Multiple Choice</option>
                                        <option value="gap-fill">Gap Fill</option>
                                        <option value="open">Open Ended</option>
                                        <option value="mixed">Mixed Variety</option>
                                        <option value="ai-decide">Let AI Decide</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    {mode === 'ai' && (
                         <div>
                             <label className="block text-sm font-medium text-slate-700 mb-2">AI Instructions (Optional)</label>
                             <textarea 
                                value={config.customInstructions}
                                onChange={(e) => setConfig({...config, customInstructions: e.target.value})}
                                placeholder="e.g., Make questions suitable for 5th graders. Focus on vocabulary."
                                className="w-full p-3 rounded-lg border border-slate-200 outline-none h-24 resize-none"
                             />
                        </div>
                    )}

                    <button 
                        onClick={handleGenerate}
                        disabled={loading}
                        className={`w-full py-4 rounded-xl font-bold text-lg shadow-md transition-all flex items-center justify-center
                        ${loading ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-brand-blue text-white hover:bg-sky-600 hover:shadow-lg'}`}
                    >
                        {loading ? (
                            <>Generating Game...</>
                        ) : (
                            <>{mode === 'ai' ? <Sparkles className="mr-2" /> : <Edit className="mr-2" />} 
                              {mode === 'ai' ? 'Create Game with AI' : 'Open Game Editor'}</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
