
import React, { useState, useEffect } from 'react';
import { GameType, GameConfig, GeneratedGame } from '../../types';
import { generateGameContent } from '../../services/geminiService';
import { ArrowLeft, Settings, Sparkles, Edit, X, Coins, RefreshCw, Type } from 'lucide-react';

// Mode Selector Sub-Component
export const ModeSelector: React.FC<{ type: GameType, onBack: () => void, onModeSelect: (mode: 'ai' | 'manual') => void }> = ({ type, onBack, onModeSelect }) => {
    // Lock body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full relative animate-slide-up">
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
    initialConfig?: GameConfig;
}

export const GameConfigurator: React.FC<GameConfiguratorProps> = ({ type, mode, onBack, onProceed, initialConfig }) => {
    // Lock body scroll when configurator is active
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    // Set default question count based on game type
    const defaultCount = type === GameType.TRIVIA ? 12 : 10;

    const [config, setConfig] = useState<GameConfig>(() => {
        if (initialConfig && initialConfig.type === type) {
            return initialConfig;
        }
        return {
            type,
            title: '',
            questionCount: defaultCount,
            questionType: 'mixed',
            pointsMode: 'fixed', // Default to fixed
            topic: '',
            isAI: mode === 'ai',
            customInstructions: '',
            // Jeopardy
            jeopardyCategories: 5,
            jeopardyCategoryNames: Array(5).fill(''),
            jeopardyRows: 5,
            strictMode: false,
            // Pub Quiz
            pubQuizRoundsCount: 3,
            pubQuizRoundNames: Array(3).fill(''),
            pubQuizQuestionsPerRound: 5,
        };
    });
    
    // Check if mode changed from saved config
    useEffect(() => {
        setConfig(prev => ({ ...prev, isAI: mode === 'ai' }));
    }, [mode]);

    const [loading, setLoading] = useState(false);

    // Update category names array (Jeopardy)
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

    // Update round names array (Pub Quiz)
    useEffect(() => {
        if (type === GameType.PUB_QUIZ && config.pubQuizRoundsCount) {
            setConfig(prev => {
                const current = prev.pubQuizRoundNames || [];
                const targetLen = prev.pubQuizRoundsCount || 3;
                if (current.length === targetLen) return prev;
                
                const newNames = [...current];
                if (newNames.length < targetLen) {
                    return { ...prev, pubQuizRoundNames: [...newNames, ...Array(targetLen - newNames.length).fill('')] };
                } else {
                    return { ...prev, pubQuizRoundNames: newNames.slice(0, targetLen) };
                }
            });
        }
    }, [config.pubQuizRoundsCount, type]);

    const handleGenerate = async () => {
        if (!config.title) {
            alert("Please enter a Game Title!");
            return;
        }
        
        // AI MODE
        if (mode === 'ai') {
            if (type !== GameType.JEOPARDY && type !== GameType.PUB_QUIZ && !config.topic) {
                alert("Please enter a Topic!");
                return;
            }
            if (type === GameType.JEOPARDY) {
                 if (config.jeopardyCategoryNames?.some(n => !n.trim())) {
                    alert("Please name all your Jeopardy Categories!");
                    return;
                }
            }
            if (type === GameType.PUB_QUIZ) {
                if (config.pubQuizRoundNames?.some(n => !n.trim())) {
                   alert("Please name all your Pub Quiz Rounds!");
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
                questions: (type !== GameType.JEOPARDY && type !== GameType.PUB_QUIZ) 
                    ? Array.from({ length: config.questionCount }).map((_, i) => ({
                        id: i,
                        question: '',
                        answer: '',
                        points: 100,
                        isBonus: false
                    }))
                    : [],
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
                    : undefined,
                pubQuizRounds: type === GameType.PUB_QUIZ
                    ? (config.pubQuizRoundNames || []).map(name => ({
                        name: name || 'Round',
                        questions: Array.from({ length: config.pubQuizQuestionsPerRound || 5 }).map((_, i) => ({
                            id: i,
                            question: '',
                            answer: '',
                            points: 1, // Pub quiz usually 1 point
                            isBonus: false,
                            bonusType: 'none'
                        }))
                    }))
                    : undefined
            };
            onProceed(emptyGame);
        }
    };

    return (
        <div className="fixed inset-0 top-16 bg-slate-50 z-40 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto">
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
                                <p className="text-slate-500 text-sm">{mode === 'ai' ? 'Define content parameters for AI generation' : 'Setup game structure'}</p>
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
                            {mode === 'ai' && type !== GameType.JEOPARDY && type !== GameType.PUB_QUIZ && (
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

                            {/* CONFIG RENDER SWITCH */}
                            {type === GameType.TRIVIA ? (
                                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Grid Size</label>
                                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                                            {[12, 15, 20, 24, 30, 36].map(num => (
                                                <button
                                                    key={num}
                                                    onClick={() => setConfig({...config, questionCount: num})}
                                                    className={`py-3 rounded-lg font-bold text-sm transition-all border-2
                                                        ${config.questionCount === num 
                                                            ? 'bg-brand-blue text-white border-brand-blue shadow-md' 
                                                            : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300'}`}
                                                >
                                                    {num}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-xs text-slate-500 mt-2">
                                            Choose a number that divides well by your student teams.
                                            <br/>(e.g. 20 questions works for 2, 4, or 5 teams).
                                        </p>
                                    </div>

                                    {mode === 'ai' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Question Type</label>
                                                <select 
                                                    value={config.questionType}
                                                    onChange={(e) => setConfig({...config, questionType: e.target.value as any})}
                                                    className="w-full p-3 rounded-lg border border-slate-200 outline-none"
                                                >
                                                    <option value="open">Open Ended (Standard)</option>
                                                    <option value="multiple-choice">Multiple Choice</option>
                                                    <option value="mixed">Mixed Variety</option>
                                                    <option value="ai-decide">Let AI Decide</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Points Strategy</label>
                                                <div className="flex space-x-2">
                                                    <button 
                                                        onClick={() => setConfig({...config, pointsMode: 'fixed'})}
                                                        className={`flex-1 py-2.5 rounded-lg border text-xs font-bold flex items-center justify-center
                                                            ${config.pointsMode === 'fixed' ? 'bg-sky-100 border-sky-300 text-sky-800' : 'bg-white border-slate-200 text-slate-600'}`}
                                                    >
                                                        <Coins size={14} className="mr-1" /> Fixed (100)
                                                    </button>
                                                    <button 
                                                        onClick={() => setConfig({...config, pointsMode: 'ai-random'})}
                                                        className={`flex-1 py-2.5 rounded-lg border text-xs font-bold flex items-center justify-center
                                                            ${config.pointsMode === 'ai-random' ? 'bg-purple-100 border-purple-300 text-purple-800' : 'bg-white border-slate-200 text-slate-600'}`}
                                                    >
                                                        <Sparkles size={14} className="mr-1" /> AI Random
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : type === GameType.JEOPARDY ? (
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
                                    </div>
                                </div>
                            ) : type === GameType.PUB_QUIZ ? (
                                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Number of Rounds</label>
                                        <select 
                                            value={config.pubQuizRoundsCount}
                                            onChange={(e) => setConfig({...config, pubQuizRoundsCount: Number(e.target.value)})}
                                            className="w-full p-3 rounded-lg border border-slate-200 outline-none"
                                        >
                                            {[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} Rounds</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Questions per Round</label>
                                        <select 
                                            value={config.pubQuizQuestionsPerRound}
                                            onChange={(e) => setConfig({...config, pubQuizQuestionsPerRound: Number(e.target.value)})}
                                            className="w-full p-3 rounded-lg border border-slate-200 outline-none"
                                        >
                                            {[3, 4, 5, 6, 8, 10].map(n => <option key={n} value={n}>{n} Questions</option>)}
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
                                            <option value="mixed">Mixed (Recommended)</option>
                                            <option value="open">Open Ended</option>
                                            <option value="multiple-choice">Multiple Choice</option>
                                            <option value="ai-decide">Let AI Decide</option>
                                        </select>
                                    </div>
                                )}
                                
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-3">Round Titles <span className="text-red-500">*</span></label>
                                    <div className="grid grid-cols-1 gap-3">
                                        {config.pubQuizRoundNames?.map((name, idx) => (
                                            <input 
                                                key={idx}
                                                type="text"
                                                value={name}
                                                onChange={(e) => {
                                                    const newNames = [...(config.pubQuizRoundNames || [])];
                                                    newNames[idx] = e.target.value;
                                                    setConfig({...config, pubQuizRoundNames: newNames});
                                                }}
                                                placeholder={`Round ${idx + 1} Name (e.g. Geography, Music)`}
                                                className="p-2 rounded border border-slate-300 text-sm focus:border-sky-500 outline-none"
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            ) : (
                                // STANDARD GAME CONFIG (Fallback)
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
                                    <>Generating Game Content...</>
                                ) : (
                                    <>{mode === 'ai' ? <Sparkles className="mr-2" /> : <Edit className="mr-2" />} 
                                    {mode === 'ai' ? 'Create Game' : 'Open Editor'}</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
