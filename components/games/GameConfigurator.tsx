
import React, { useState, useEffect, useRef } from 'react';
import { GameType, GameConfig, GeneratedGame, UploadedFile } from '../../types';
import { generateGameContent, generateStopTheFireCategories } from '../../services/geminiService';
import { processFile } from '../../utils/gameUtils';
import { ArrowLeft, Settings, Sparkles, Edit, X, Paperclip, FileText, Mic, MicOff } from 'lucide-react';
import { useDictation } from '../../utils/useDictation';

// Mode Selector Sub-Component
export const ModeSelector: React.FC<{ type: GameType, onBack: () => void, onModeSelect: (mode: 'ai' | 'manual' | 'bank') => void }> = ({ type, onBack, onModeSelect }) => {
    const isStopTheFire = type === GameType.STOP_THE_FIRE;
    const [isCompactHeight, setIsCompactHeight] = useState(false);
    // Lock body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);
    useEffect(() => {
        const media = window.matchMedia('(max-height: 740px)');
        const handleChange = () => setIsCompactHeight(media.matches);
        handleChange();
        media.addEventListener('change', handleChange);
        return () => media.removeEventListener('change', handleChange);
    }, []);

    return (
        <div
            className={`fixed inset-0 z-[100] flex ${isCompactHeight ? 'items-start overflow-y-auto pt-[calc(4rem+env(safe-area-inset-top))] pb-6' : 'items-center'} justify-center bg-slate-900/50 backdrop-blur-sm px-4 animate-fade-in`}
        >
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full relative animate-slide-up max-h-[90vh] overflow-y-auto">
                <button onClick={onBack} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                    <X size={24} />
                </button>
                <h2 className="font-display text-3xl font-bold text-slate-800 mb-2 text-center">Create {type}</h2>
                <p className="text-center text-slate-500 mb-8">How would you like to build your game?</p>
                
                <div className="space-y-4">
                    {isStopTheFire ? (
                        <>
                            <button 
                                onClick={() => onModeSelect('manual')}
                                className="w-full p-6 border-2 border-slate-200 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-all group flex items-center"
                            >
                                <div className="bg-orange-100 p-3 rounded-full mr-4 group-hover:bg-white">
                                    <Edit className="text-orange-600" size={24} />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-slate-800 text-lg">Manual Categories</h3>
                                    <p className="text-slate-500 text-sm">Create and use your own custom category list.</p>
                                </div>
                            </button>
                            <button 
                                onClick={() => onModeSelect('bank')}
                                className="w-full p-6 border-2 border-slate-200 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-all group flex items-center"
                            >
                                <div className="bg-orange-100 p-3 rounded-full mr-4 group-hover:bg-white">
                                    <Sparkles className="text-orange-600" size={24} />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-slate-800 text-lg">Use Word Bank</h3>
                                    <p className="text-slate-500 text-sm">Choose from the built-in 1000-category bank.</p>
                                </div>
                            </button>
                            <button 
                                onClick={() => onModeSelect('ai')}
                                className="w-full p-6 border-2 border-slate-200 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-all group flex items-center"
                            >
                                <div className="bg-orange-100 p-3 rounded-full mr-4 group-hover:bg-white">
                                    <Sparkles className="text-orange-600" size={24} />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-slate-800 text-lg">Use AI to Create Word Bank</h3>
                                    <p className="text-slate-500 text-sm">Upload files or add instructions to generate categories.</p>
                                </div>
                            </button>
                        </>
                    ) : (
                        <>
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
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

interface GameConfiguratorProps {
    type: GameType;
    mode: 'ai' | 'manual' | 'bank';
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
                         type === GameType.SURVEY_SHOWDOWN ? 5 : 
                         type === GameType.STOP_THE_FIRE ? 10 : 10;
    
    // Millionaire requires exactly 15
    if (type === GameType.MILLIONAIRE) defaultCount = 15;

    const [config, setConfig] = useState<GameConfig>(() => {
        const defaults: GameConfig = {
            type,
            title: '',
            questionCount: defaultCount,
            questionType: type === GameType.MILLIONAIRE ? 'multiple-choice' : (type === GameType.TIME_BOMB || type === GameType.STOP_THE_FIRE ? 'open' : 'mixed'),
            mcOptionCount: 4, // Default to 4 options for multiple choice
            pointsMode: 'fixed',
            topic: '',
            isAI: mode === 'ai',
            isPublic: true, // Default to Public
            customInstructions: '',
            files: [],
            includeImages: false,
            imageMode: 'manual',
            // Jeopardy
            jeopardyCategories: 5,
            jeopardyCategoryNames: Array(5).fill(''),
            jeopardyRows: 5,
            strictMode: false,
            // Pub Quiz
            pubQuizRoundsCount: 3,
            pubQuizRoundNames: Array(3).fill(''),
            pubQuizQuestionsPerRound: 5,
            stopTheFireMode: type === GameType.STOP_THE_FIRE
                ? (mode === 'bank' ? 'bank' : mode === 'ai' ? 'ai' : 'manual')
                : undefined
        };
        if (initialConfig && initialConfig.type === type) {
            return { ...defaults, ...initialConfig };
        }
        return defaults;
    });

    const supportsQuestionImages = mode === 'ai' && ![GameType.STOP_THE_FIRE].includes(type);
    const hasStockImageKey = Boolean(import.meta.env.VITE_PIXABAY_API_KEY);
    
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
        setConfig(prev => ({
            ...prev,
            isAI: mode === 'ai',
            stopTheFireMode: type === GameType.STOP_THE_FIRE
                ? (mode === 'bank' ? 'bank' : mode === 'ai' ? 'ai' : 'manual')
                : prev.stopTheFireMode
        }));
    }, [mode, type]);

    const [manualCategories, setManualCategories] = useState<string[]>(Array(10).fill(''));
    const [bulkManualInput, setBulkManualInput] = useState('');

    const [loading, setLoading] = useState(false);
    const dictation = useDictation({ model: 'tiny', language: 'auto' });
    const sourceInputRef = useRef<HTMLInputElement>(null);

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

    const openSourcePicker = () => {
        sourceInputRef.current?.click();
    };

    const toggleDictation = () => {
        void dictation.toggle({
            getValue: () => config.customInstructions || '',
            onUpdate: (value) => setConfig(prev => ({ ...prev, customInstructions: value }))
        });
    };

    const handleGenerate = async () => {
        if (!config.title) {
            alert("Please enter a Game Title!");
            return;
        }
        
        // AI MODE
        if (mode === 'ai') {
            if (type === GameType.STOP_THE_FIRE) {
                const hasSource = (config.topic && config.topic.trim()) || uploadedFiles.length > 0 || (config.customInstructions && config.customInstructions.trim());
                if (!hasSource) {
                    alert("Please enter a topic, add instructions, or upload a file to build a word bank.");
                    return;
                }
                setLoading(true);
                try {
                    const finalConfig = { ...config, files: uploadedFiles };
                    const categories = await generateStopTheFireCategories(finalConfig);
                    const bank = categories.length > 0 ? categories : [];
                    const aiGame: GeneratedGame = {
                        id: Date.now().toString(),
                        createdAt: new Date().toISOString(),
                        title: config.title,
                        config: { ...finalConfig, stopTheFireMode: 'ai' },
                        questions: [],
                        stopTheFireCategories: bank
                    };
                    onProceed(aiGame);
                } catch (err) {
                    console.error(err);
                    alert("Failed to generate word bank. Please check API configuration.");
                } finally {
                    setLoading(false);
                }
                return;
            }
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
            if (type === GameType.STOP_THE_FIRE && mode === 'manual') {
                const cleaned = manualCategories.map(c => c.trim()).filter(Boolean);
                if (cleaned.length === 0) {
                    alert("Please enter at least one category.");
                    return;
                }
            }
            // Create empty shell game
            const emptyGame: GeneratedGame = {
                id: Date.now().toString(),
                createdAt: new Date().toISOString(),
                title: config.title,
                config: config,
                questions: (type !== GameType.JEOPARDY && type !== GameType.PUB_QUIZ && type !== GameType.STOP_THE_FIRE) 
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
                    : undefined,
                stopTheFireCategories: type === GameType.STOP_THE_FIRE && mode === 'manual'
                    ? manualCategories.map(c => c.trim()).filter(Boolean)
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
                            ) : type === GameType.STOP_THE_FIRE ? (
                                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-6">
                                    {mode === 'manual' ? (
                                        <>
                                            <div className="flex items-start">
                                                <div className="bg-orange-100 p-2 rounded-lg mr-3 text-orange-700">
                                                    <Edit size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-800">Your Custom Categories</h3>
                                                    <p className="text-sm text-slate-600 mt-1">
                                                        Enter the categories you want to use. These will be the only categories used in the game.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="bg-white border border-slate-200 rounded-xl p-4">
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Add multiple categories</label>
                                                <textarea
                                                    value={bulkManualInput}
                                                    onChange={(e) => setBulkManualInput(e.target.value)}
                                                    placeholder="Paste categories here, one per line."
                                                    className="w-full min-h-[90px] p-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-orange-200 outline-none"
                                                />
                                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const incoming = bulkManualInput
                                                                .split(/\r?\n|,/)
                                                                .map((cat) => cat.trim())
                                                                .filter(Boolean);
                                                            if (incoming.length === 0) return;
                                                            setManualCategories((prev) => {
                                                                const existing = prev.map((cat) => cat.trim()).filter(Boolean);
                                                                const merged = [...existing];
                                                                incoming.forEach((cat) => {
                                                                    if (!merged.includes(cat)) merged.push(cat);
                                                                });
                                                                return merged.length ? merged : [''];
                                                            });
                                                            setBulkManualInput('');
                                                        }}
                                                        className="px-4 py-2 rounded-lg bg-orange-500 text-white font-bold text-sm hover:bg-orange-600"
                                                    >
                                                        Add to Bank
                                                    </button>
                                                    <span className="text-xs text-slate-400">
                                                        One category per line. Duplicates are ignored.
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                                {manualCategories.map((cat, idx) => (
                                                    <div key={idx} className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-slate-400 w-6">{idx + 1}.</span>
                                                        <input
                                                            type="text"
                                                            value={cat}
                                                            onChange={(e) => {
                                                                const next = [...manualCategories];
                                                                next[idx] = e.target.value;
                                                                setManualCategories(next);
                                                            }}
                                                            className="flex-1 p-2 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-orange-300 outline-none"
                                                            placeholder="e.g., Things in a kitchen"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const next = manualCategories.filter((_, i) => i !== idx);
                                                                setManualCategories(next.length ? next : ['']);
                                                            }}
                                                            className="px-2 py-1 text-xs font-bold text-slate-500 hover:text-red-600"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setManualCategories((prev) => [...prev, ''])}
                                                className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 font-bold hover:border-orange-300 hover:text-orange-600 transition-colors"
                                            >
                                                + Add Category
                                            </button>
                                        </>
                                    ) : mode === 'ai' ? (
                                        <div className="flex items-start">
                                            <div className="bg-orange-100 p-2 rounded-lg mr-3 text-orange-700">
                                                <Sparkles size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800">AI Word Bank</h3>
                                                <p className="text-sm text-slate-600 mt-1">
                                                    Provide a topic or upload files, and AI will generate a word bank (about 100 categories) you can edit later.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-start">
                                            <div className="bg-orange-100 p-2 rounded-lg mr-3 text-orange-700">
                                                <Sparkles size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800">Built-in Category Bank</h3>
                                                <p className="text-sm text-slate-600 mt-1">
                                                    Stop the Fire uses a curated bank of 1000 categories. You will choose difficulty, category count, timer, and letter inside the game setup card.
                                                </p>
                                            </div>
                                        </div>
                                    )}
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

                            {supportsQuestionImages && (
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-800">Include images</label>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Add a visual to each question card. You can still edit or replace images later in the editor.
                                            </p>
                                        </div>
                                        <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(config.includeImages)}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setConfig({
                                                        ...config,
                                                        includeImages: checked,
                                                        imageMode: checked ? (config.imageMode || 'auto') : 'manual',
                                                    });
                                                }}
                                                className="h-4 w-4 text-brand-blue rounded border-slate-300"
                                            />
                                            Enable
                                        </label>
                                    </div>

                                    {config.includeImages && (
                                        <div className="mt-4 space-y-3">
                                            <label className="flex items-start gap-3 text-sm text-slate-700">
                                                <input
                                                    type="radio"
                                                    name="imageMode"
                                                    value="auto"
                                                    disabled={!hasStockImageKey}
                                                    checked={(config.imageMode || 'auto') === 'auto'}
                                                    onChange={() => setConfig({ ...config, imageMode: 'auto' })}
                                                    className="mt-1 h-4 w-4 text-brand-blue border-slate-300"
                                                />
                                                <span>
                                                    <span className="font-semibold text-slate-800">Auto-pick images</span>
                                                    <span className="block text-xs text-slate-500">
                                                        The AI will choose a suitable stock image for each question.
                                                    </span>
                                                </span>
                                            </label>
                                            <label className="flex items-start gap-3 text-sm text-slate-700">
                                                <input
                                                    type="radio"
                                                    name="imageMode"
                                                    value="manual"
                                                    checked={(config.imageMode || 'manual') === 'manual'}
                                                    onChange={() => setConfig({ ...config, imageMode: 'manual' })}
                                                    className="mt-1 h-4 w-4 text-brand-blue border-slate-300"
                                                />
                                                <span>
                                                    <span className="font-semibold text-slate-800">Pick later (manual)</span>
                                                    <span className="block text-xs text-slate-500">
                                                        Generate questions first, then choose images in the editor.
                                                    </span>
                                                </span>
                                            </label>
                                            {!hasStockImageKey && (
                                                <p className="text-xs text-amber-600">
                                                    Auto-pick requires VITE_PIXABAY_API_KEY in your .env.local.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {mode === 'ai' && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-medium text-slate-700">AI Instructions</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                ref={sourceInputRef}
                                                type="file"
                                                multiple
                                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                                                onChange={handleFileChange}
                                                className="hidden"
                                            />
                                            <button
                                                type="button"
                                                onClick={openSourcePicker}
                                                title="Add source material"
                                                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:border-brand-blue hover:text-brand-blue transition-colors"
                                            >
                                                <Paperclip size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={toggleDictation}
                                                disabled={dictation.isBusy}
                                                title={dictation.isListening ? 'Stop dictation' : 'Start dictation'}
                                                className={`p-2 rounded-lg border transition-colors
                                                    ${dictation.isListening ? 'bg-red-50 border-red-200 text-red-600' : 'border-slate-200 text-slate-500 hover:border-brand-blue hover:text-brand-blue'}
                                                    ${dictation.isBusy ? 'opacity-60 cursor-not-allowed' : ''}`}
                                            >
                                                {dictation.isListening ? <MicOff size={16} /> : <Mic size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                    <textarea 
                                        value={config.customInstructions}
                                        onChange={(e) => setConfig({...config, customInstructions: e.target.value})}
                                        placeholder="e.g., Make questions suitable for 5th graders. Focus on vocabulary."
                                        className="w-full p-3 rounded-lg border border-slate-200 outline-none h-24 resize-none"
                                    />
                                    <p className="mt-2 text-xs text-slate-500">Add class level, age range, focus areas, or attach source material to guide the game.</p>
                                    {dictation.statusMessage && (
                                        <p className="mt-1 text-xs text-slate-500">{dictation.statusMessage}</p>
                                    )}
                                    {uploadedFiles.length > 0 && (
                                        <div className="mt-3 space-y-2">
                                            {uploadedFiles.map((file, idx) => (
                                                <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
                                                    <div className="flex items-center truncate">
                                                        <FileText size={16} className="text-slate-400 mr-2 flex-shrink-0" />
                                                        <span className="text-sm text-slate-600 truncate max-w-[220px]">{file.name}</span>
                                                    </div>
                                                    <button onClick={() => removeFile(idx)} className="text-red-400 hover:text-red-600 p-1">
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
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
