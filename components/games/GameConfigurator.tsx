
import React, { useState, useEffect } from 'react';
import { GameType, GameConfig, GeneratedGame, UploadedFile } from '../../types';
import { generateGameContent } from '../../services/geminiService';
import { processFile } from '../../utils/gameUtils';
import { ArrowLeft, Settings, Sparkles, Edit, X, Coins, Plus, Trash2, Paperclip, FileText } from 'lucide-react';

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
    let defaultCount = type === GameType.TRIVIA ? 12 : 
                         type === GameType.SNAKES_LADDERS ? 20 : 
                         type === GameType.TIME_BOMB ? 25 : 
                         type === GameType.SURVEY_SHOWDOWN ? 5 : 10;
    
    // Millionaire requires exactly 15
    if (type === GameType.MILLIONAIRE) defaultCount = 15;

    const [config, setConfig] = useState<GameConfig>(() => {
        if (initialConfig && initialConfig.type === type) {
            return initialConfig;
        }
        return {
            type,
            title: '',
            questionCount: defaultCount,
            questionType: type === GameType.MILLIONAIRE ? 'multiple-choice' : (type === GameType.TIME_BOMB ? 'open' : 'mixed'),
            mcOptionCount: 4, // Default to 4 options for multiple choice
            pointsMode: 'fixed',
            topic: '',
            isAI: mode === 'ai',
            isPublic: true, // Default to Public
            customInstructions: '',
            files: [],
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
    
    // Files state separate from config until generation for cleaner updates
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

    // For Survey Showdown custom prompts
    const [roundPrompts, setRoundPrompts] = useState<string[]>([]);

    useEffect(() => {
        if (type === GameType.SURVEY_SHOWDOWN) {
            setRoundPrompts(prev => {
                const count = config.questionCount || 5;
                if (prev.length === count) return prev;
                if (prev.length < count) return [...prev, ...Array(count - prev.length).fill('')];
                return prev.slice(0, count);
            });
        }
    }, [config.questionCount, type]);
    
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

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles: UploadedFile[] = [];
            const MAX_SIZE = 4 * 1024 * 1024; // 4MB
            
            for (let i = 0; i < e.target.files.length; i++) {
                const file = e.target.files[i];
                if (file.size > MAX_SIZE) {
                    alert(`File "${file.name}" exceeds the 4MB limit.`);
                    continue;
                }
                if (uploadedFiles.length + newFiles.length >= 3) {
                    alert("Maximum 3 files allowed.");
                    break;
                }
                try {
                    const processed = await processFile(file);
                    newFiles.push(processed);
                } catch (err) {
                    console.error("Error reading file", err);
                    alert(`Failed to read file: ${file.name}`);
                }
            }
            setUploadedFiles(prev => [...prev, ...newFiles]);
            // Reset input value to allow re-uploading same file if deleted
            e.target.value = '';
        }
    };

    const removeFile = (index: number) => {
        setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleGenerate = async () => {
        if (!config.title) {
            alert("Please enter a Game Title!");
            return;
        }
        
        // AI MODE
        if (mode === 'ai') {
            // Require topic OR files
            const hasSource = config.topic || uploadedFiles.length > 0;
            if (type !== GameType.JEOPARDY && type !== GameType.PUB_QUIZ && !hasSource) {
                alert("Please enter a Topic or Upload a File!");
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
                // For Survey Showdown, inject custom prompts into instruction
                let finalConfig = { ...config, files: uploadedFiles };
                if (type === GameType.SURVEY_SHOWDOWN && roundPrompts.some(p => p.trim())) {
                    const customList = roundPrompts.map((p, i) => p.trim() ? `Round ${i+1}: ${p}` : `Round ${i+1}: AI Decide`).join('; ');
                    finalConfig.customInstructions = (finalConfig.customInstructions || "") + `\n\nUSE THESE SPECIFIC QUESTIONS FOR ROUNDS: ${customList}`;
                }

                const gameData = await generateGameContent(finalConfig);
                onProceed(gameData);
            } catch (err) {
                console.error(err);
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
                        isBonus: false,
                        difficulty: type === GameType.DARTS ? 'easy' : undefined,
                        options: type === GameType.MILLIONAIRE ? ["", "", "", ""] : undefined,
                        // Survey Init
                        surveyAnswers: type === GameType.SURVEY_SHOWDOWN ? Array(8).fill({text: "", score: 0}) : undefined
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
                                    <p className="text-xs text-slate-400 mt-1">Or upload a document below to generate from source material.</p>
                                </div>
                            )}

                            {/* FILE UPLOAD FOR AI MODE */}
                            {mode === 'ai' && (
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
                                        <Paperclip size={16} className="mr-2 text-brand-blue" /> Upload Source Material
                                    </label>
                                    <p className="text-xs text-slate-500 mb-3">Upload PDFs or Images (Max 3 files, 4MB each). The AI will use these to generate questions.</p>
                                    
                                    <div className="space-y-3">
                                        {uploadedFiles.map((file, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
                                                <div className="flex items-center truncate">
                                                    <FileText size={16} className="text-slate-400 mr-2 flex-shrink-0" />
                                                    <span className="text-sm text-slate-600 truncate max-w-[200px]">{file.name}</span>
                                                </div>
                                                <button onClick={() => removeFile(idx)} className="text-red-400 hover:text-red-600 p-1">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))}
                                        
                                        {uploadedFiles.length < 3 && (
                                            <label className="flex items-center justify-center p-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-brand-blue hover:bg-sky-50 cursor-pointer transition-colors text-slate-500 font-bold text-sm">
                                                <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} className="hidden" />
                                                <Plus size={16} className="mr-2" /> Add Document
                                            </label>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* CONFIG RENDER SWITCH */}
                            {type === GameType.MILLIONAIRE ? (
                                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
                                    <div className="flex items-start">
                                        <div className="bg-blue-100 p-2 rounded-lg mr-3 text-blue-700">
                                            <Sparkles size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800">Format Locked</h3>
                                            <p className="text-sm text-slate-600 mt-1">
                                                This game mode uses a strict format of 15 multiple-choice questions with 4 options each, sorted by increasing difficulty.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : type === GameType.TIME_BOMB ? (
                                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Question Count</label>
                                        <input
                                            type="number"
                                            min={20}
                                            max={100}
                                            value={config.questionCount}
                                            onChange={(e) => setConfig({...config, questionCount: Number(e.target.value)})}
                                            className="w-full p-3 rounded-lg border border-slate-200 outline-none"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">More questions are better for Time Bomb to avoid repeats.</p>
                                    </div>

                                    {mode === 'ai' && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Question Type</label>
                                                <select
                                                    value={config.questionType}
                                                    onChange={(e) => setConfig({...config, questionType: e.target.value as any})}
                                                    className="w-full p-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-sky-400"
                                                >
                                                    <option value="ai-decide">AI Decide (Mixed)</option>
                                                    <option value="open">Open Ended</option>
                                                    <option value="gap-fill">Gap Fill</option>
                                                    <option value="multiple-choice">Multiple Choice</option>
                                                    <option value="mixed">Mixed Format</option>
                                                </select>
                                                <p className="text-xs text-slate-500 mt-1">Time Bomb works best with quick-answer formats.</p>
                                            </div>

                                            {config.questionType === 'multiple-choice' && (
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-2">Number of Options</label>
                                                    <select
                                                        value={config.mcOptionCount || 4}
                                                        onChange={(e) => setConfig({...config, mcOptionCount: Number(e.target.value) as 2 | 3 | 4})}
                                                        className="w-full p-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-sky-400"
                                                    >
                                                        <option value="2">2 Options</option>
                                                        <option value="3">3 Options</option>
                                                        <option value="4">4 Options</option>
                                                    </select>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            ) : type === GameType.SURVEY_SHOWDOWN ? (
                                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Number of Rounds</label>
                                        <input 
                                            type="number" 
                                            min={1} 
                                            max={20}
                                            value={config.questionCount}
                                            onChange={(e) => setConfig({...config, questionCount: Number(e.target.value)})}
                                            className="w-full p-3 rounded-lg border border-slate-200 outline-none"
                                        />
                                    </div>
                                    
                                    {/* Specific Prompts for Survey */}
                                    <div className="border-t border-slate-200 pt-4">
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Round Prompts (Optional)</label>
                                        {mode === 'ai' && <p className="text-xs text-slate-500 mb-3">Leave blank to let AI decide based on topic/files.</p>}
                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                            {roundPrompts.map((p, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-slate-400 w-6">#{i+1}</span>
                                                    <input 
                                                        type="text" 
                                                        value={p}
                                                        onChange={(e) => {
                                                            const newP = [...roundPrompts];
                                                            newP[i] = e.target.value;
                                                            setRoundPrompts(newP);
                                                        }}
                                                        placeholder={`e.g. Name a fruit (Round ${i+1})`}
                                                        className="flex-1 p-2 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-brand-blue outline-none"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : type === GameType.TRIVIA ? (
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
                                    </div>

                                    {mode === 'ai' && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Question Type</label>
                                                <select
                                                    value={config.questionType}
                                                    onChange={(e) => setConfig({...config, questionType: e.target.value as any})}
                                                    className="w-full p-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-sky-400"
                                                >
                                                    <option value="ai-decide">AI Decide (Mixed)</option>
                                                    <option value="multiple-choice">Multiple Choice</option>
                                                    <option value="gap-fill">Gap Fill</option>
                                                    <option value="open">Open Ended</option>
                                                    <option value="mixed">Mixed Format</option>
                                                </select>
                                            </div>

                                            {config.questionType === 'multiple-choice' && (
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-2">Number of Options</label>
                                                    <select
                                                        value={config.mcOptionCount || 4}
                                                        onChange={(e) => setConfig({...config, mcOptionCount: Number(e.target.value) as 2 | 3 | 4})}
                                                        className="w-full p-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-sky-400"
                                                    >
                                                        <option value="2">2 Options</option>
                                                        <option value="3">3 Options</option>
                                                        <option value="4">4 Options</option>
                                                    </select>
                                                </div>
                                            )}
                                        </>
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

                                    {mode === 'ai' && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Question Type</label>
                                                <select
                                                    value={config.questionType}
                                                    onChange={(e) => setConfig({...config, questionType: e.target.value as any})}
                                                    className="w-full p-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-sky-400"
                                                >
                                                    <option value="ai-decide">AI Decide (Mixed)</option>
                                                    <option value="multiple-choice">Multiple Choice</option>
                                                    <option value="gap-fill">Gap Fill</option>
                                                    <option value="open">Open Ended</option>
                                                    <option value="mixed">Mixed Format</option>
                                                </select>
                                            </div>

                                            {config.questionType === 'multiple-choice' && (
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-2">Number of Options</label>
                                                    <select
                                                        value={config.mcOptionCount || 4}
                                                        onChange={(e) => setConfig({...config, mcOptionCount: Number(e.target.value) as 2 | 3 | 4})}
                                                        className="w-full p-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-sky-400"
                                                    >
                                                        <option value="2">2 Options</option>
                                                        <option value="3">3 Options</option>
                                                        <option value="4">4 Options</option>
                                                    </select>
                                                </div>
                                            )}
                                        </>
                                    )}
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

                                {mode === 'ai' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Question Type</label>
                                            <select
                                                value={config.questionType}
                                                onChange={(e) => setConfig({...config, questionType: e.target.value as any})}
                                                className="w-full p-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-sky-400"
                                            >
                                                <option value="ai-decide">AI Decide (Mixed)</option>
                                                <option value="multiple-choice">Multiple Choice</option>
                                                <option value="gap-fill">Gap Fill</option>
                                                <option value="open">Open Ended</option>
                                                <option value="mixed">Mixed Format</option>
                                            </select>
                                        </div>

                                        {config.questionType === 'multiple-choice' && (
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Number of Options</label>
                                                <select
                                                    value={config.mcOptionCount || 4}
                                                    onChange={(e) => setConfig({...config, mcOptionCount: Number(e.target.value) as 2 | 3 | 4})}
                                                    className="w-full p-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-sky-400"
                                                >
                                                    <option value="2">2 Options</option>
                                                    <option value="3">3 Options</option>
                                                    <option value="4">4 Options</option>
                                                </select>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                            ) : (
                                // STANDARD GAME CONFIG (Fallback - Snakes & Ladders, Darts)
                                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-6">
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
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Question Type</label>
                                                <select
                                                    value={config.questionType}
                                                    onChange={(e) => setConfig({...config, questionType: e.target.value as any})}
                                                    className="w-full p-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-sky-400"
                                                >
                                                    <option value="ai-decide">AI Decide (Mixed)</option>
                                                    <option value="multiple-choice">Multiple Choice</option>
                                                    <option value="gap-fill">Gap Fill</option>
                                                    <option value="open">Open Ended</option>
                                                    <option value="mixed">Mixed Format</option>
                                                </select>
                                            </div>

                                            {config.questionType === 'multiple-choice' && (
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-2">Number of Options</label>
                                                    <select
                                                        value={config.mcOptionCount || 4}
                                                        onChange={(e) => setConfig({...config, mcOptionCount: Number(e.target.value) as 2 | 3 | 4})}
                                                        className="w-full p-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-sky-400"
                                                    >
                                                        <option value="2">2 Options</option>
                                                        <option value="3">3 Options</option>
                                                        <option value="4">4 Options</option>
                                                    </select>
                                                </div>
                                            )}
                                        </>
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
