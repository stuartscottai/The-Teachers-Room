
import React, { useState, useEffect, useRef } from 'react';
import { GameType, GameConfig, GeneratedGame, UploadedFile } from '../../types';
import { generateGameContent, generateStopTheFireCategories } from '../../services/geminiService';
import { processFile } from '../../utils/gameUtils';
import { ArrowLeft, Settings, Sparkles, Edit, X, Paperclip, FileText, HardDrive, Mic, MicOff, Copy, Upload, ChevronDown } from 'lucide-react';
import { useDictation } from '../../utils/useDictation';
import { useAuth } from '../../contexts/AuthContext';
import { promptSignupForFree, promptUpgradeForAi } from '../../services/accountAccess';
import { SchoolStorageBrowser } from '../school/SchoolStorageBrowser';
import { SchoolStorageFolder, ensureSchoolStorageCapacity, listSchoolStorageFolders, uploadSchoolStorageFile, uploadUploadedFileToSchoolStorage } from '../../services/schoolStorage';
import { buildExternalLlmGamePrompt, MANUAL_GAME_IMPORT_ACCEPT, parseImportedGameContent } from '../../utils/gameImport';

const WORD_WHEEL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const SOURCE_ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp';
const SOURCE_MAX_SIZE_BYTES = 4 * 1024 * 1024;
const GAME_BACKDROP_IMAGES: Record<GameType, string> = {
    [GameType.SNAKES_LADDERS]: '/assets/games/snakes.png',
    [GameType.TRIVIA]: '/assets/games/trivia.png',
    [GameType.JEOPARDY]: '/assets/games/jeopardy.png',
    [GameType.DARTS]: '/assets/games/darts.png',
    [GameType.PUB_QUIZ]: '/assets/games/pubquiz.png',
    [GameType.MILLIONAIRE]: '/assets/games/millionaire.png',
    [GameType.TIME_BOMB]: '/assets/games/timebomb.png',
    [GameType.SURVEY_SHOWDOWN]: '/assets/games/survey.png',
    [GameType.STOP_THE_FIRE]: '/assets/games/stopthefire.png',
    [GameType.WORD_WHEEL]: '/assets/games/wordwheel.png',
    [GameType.LIVE_QUIZ_CHALLENGE]: '/assets/games/livequiz.png',
};

const copyTextToClipboard = async (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }

    if (typeof document === 'undefined') {
        throw new Error('Clipboard access is not available here.');
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
};

// Mode Selector Sub-Component
export const ModeSelector: React.FC<{ type: GameType, onBack: () => void, onModeSelect: (mode: 'ai' | 'manual' | 'bank') => void, mobileTopInset?: number }> = ({ type, onBack, onModeSelect, mobileTopInset = 0 }) => {
    const isStopTheFire = type === GameType.STOP_THE_FIRE;
    const [isCompactHeight, setIsCompactHeight] = useState(false);
    const [showDialog, setShowDialog] = useState(false);
    const shouldOffsetForTour = mobileTopInset > 0;
    const backdropImage = GAME_BACKDROP_IMAGES[type];
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

    useEffect(() => {
        setShowDialog(false);
        const timeoutId = window.setTimeout(() => setShowDialog(true), 500);
        return () => window.clearTimeout(timeoutId);
    }, [type]);

    return (
        <div
            className={`fixed inset-0 z-[100] flex ${(isCompactHeight || shouldOffsetForTour) ? 'items-start overflow-y-auto pb-6' : 'items-center'} justify-center px-4 animate-fade-in`}
            style={(isCompactHeight || shouldOffsetForTour)
                ? {
                    paddingTop: shouldOffsetForTour
                        ? `calc(4rem + env(safe-area-inset-top) + ${mobileTopInset}px)`
                        : 'calc(4rem + env(safe-area-inset-top))'
                  }
                : undefined}
        >
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-slate-900" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_48%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_58%)]" />
                <div className="absolute inset-0 sm:hidden">
                    <img
                        src={backdropImage}
                        alt=""
                        aria-hidden="true"
                        className="w-full h-full object-cover scale-110 blur-xl opacity-72"
                    />
                    <div className="absolute inset-0 bg-slate-900/44" />
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-900/28 via-transparent to-slate-950/38" />
                </div>
                <div className="absolute inset-0 hidden sm:flex items-center justify-center px-4 py-6">
                    <div
                        className="relative aspect-[3/2]"
                        style={{ width: 'min(calc(100vw - 2rem), calc((100dvh - 2rem) * 1.5), 1280px)' }}
                    >
                        <img
                            src={backdropImage}
                            alt=""
                            aria-hidden="true"
                            className="w-full h-full object-contain opacity-92"
                        />
                        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-slate-900 via-slate-900/42 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-900 via-slate-900/42 to-transparent" />
                        <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-slate-900 via-slate-900/38 to-transparent" />
                        <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-slate-900 via-slate-900/38 to-transparent" />
                    </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900/16 via-transparent to-slate-950/26" />
            </div>
            {showDialog && (
            <div
                className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 max-w-lg w-full relative animate-slide-up border border-white/60"
            >
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
            )}
        </div>
    );
}

interface GameConfiguratorProps {
    type: GameType;
    mode: 'ai' | 'manual' | 'bank';
    onBack: () => void;
    onProceed: (game: GeneratedGame) => void;
    initialConfig?: GameConfig;
    mobileTopInset?: number;
}

export const GameConfigurator: React.FC<GameConfiguratorProps> = ({ type, mode, onBack, onProceed, initialConfig, mobileTopInset = 0 }) => {
    const { user } = useAuth();
    // Lock body scroll when configurator is active
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    // Set default question count based on game type
    let defaultCount = type === GameType.LIVE_QUIZ_CHALLENGE ? 10 :
                         type === GameType.TRIVIA ? 12 : 
                         type === GameType.SNAKES_LADDERS ? 20 : 
                         type === GameType.TIME_BOMB ? 25 : 
                         type === GameType.SURVEY_SHOWDOWN ? 5 : 
                         type === GameType.STOP_THE_FIRE ? 10 :
                         type === GameType.WORD_WHEEL ? WORD_WHEEL_LETTERS.length : 10;
    
    // Millionaire requires exactly 15
    if (type === GameType.MILLIONAIRE) defaultCount = 15;

    const [config, setConfig] = useState<GameConfig>(() => {
        const defaults: GameConfig = {
            type,
            title: '',
            questionCount: defaultCount,
            questionType:
                type === GameType.LIVE_QUIZ_CHALLENGE
                    ? 'multiple-choice'
                    : type === GameType.MILLIONAIRE
                    ? 'multiple-choice'
                    : (type === GameType.TIME_BOMB || type === GameType.STOP_THE_FIRE || type === GameType.WORD_WHEEL ? 'open' : 'mixed'),
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
            wordWheelScoringMode: 'classic',
            wordWheelLetterRule: 'contains-hard',
            stopTheFireMode: type === GameType.STOP_THE_FIRE
                ? (mode === 'bank' ? 'bank' : mode === 'ai' ? 'ai' : 'manual')
                : undefined
        };
        if (initialConfig && initialConfig.type === type) {
            return { ...defaults, ...initialConfig };
        }
        return defaults;
    });

    const getEffectiveMcOptionStrategy = (currentConfig: GameConfig): 'fixed' | 'vary' => {
        if (type === GameType.MILLIONAIRE || type === GameType.LIVE_QUIZ_CHALLENGE) return 'fixed';
        if (currentConfig.mcOptionStrategy === 'fixed' || currentConfig.mcOptionStrategy === 'vary') {
            return currentConfig.mcOptionStrategy;
        }
        return currentConfig.questionType === 'multiple-choice' ? 'fixed' : 'vary';
    };

    const getEffectiveMcOptionCount = (currentConfig: GameConfig): 2 | 3 | 4 => {
        const parsed = Number(currentConfig.mcOptionCount);
        if (!Number.isFinite(parsed)) return 4;
        return Math.min(4, Math.max(2, Math.round(parsed))) as 2 | 3 | 4;
    };

    const updateQuestionType = (questionType: GameConfig['questionType']) => {
        setConfig(prev => ({ ...prev, questionType }));
    };

    const updateMcOptionStrategy = (mcOptionStrategy: 'fixed' | 'vary') => {
        setConfig(prev => ({ ...prev, mcOptionStrategy }));
    };

    const updateMcOptionCount = (mcOptionCount: 2 | 3 | 4) => {
        setConfig(prev => ({ ...prev, mcOptionStrategy: 'fixed', mcOptionCount }));
    };

    const renderMcOptionControls = (selectClassName: string) => {
        if (type === GameType.MILLIONAIRE || type === GameType.LIVE_QUIZ_CHALLENGE) return null;
        if (!['multiple-choice', 'mixed', 'ai-decide'].includes(config.questionType)) return null;

        const strategy = getEffectiveMcOptionStrategy(config);
        const optionCount = getEffectiveMcOptionCount(config);
        const isExplicitMcq = config.questionType === 'multiple-choice';

        return (
            <>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">MCQ Option Strategy</label>
                    <select
                        value={strategy}
                        onChange={(e) => updateMcOptionStrategy(e.target.value as 'fixed' | 'vary')}
                        className={selectClassName}
                    >
                        <option value="vary">Let AI Vary (2-4)</option>
                        <option value="fixed">Fixed Count</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                        {isExplicitMcq
                            ? 'Use a fixed count for exam-style consistency, or let AI vary between 2, 3, and 4 options.'
                            : 'If AI includes MCQs, this controls whether they stay fixed or vary between 2, 3, and 4 options.'}
                    </p>
                </div>

                {strategy === 'fixed' && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Number of Options</label>
                        <select
                            value={optionCount}
                            onChange={(e) => updateMcOptionCount(Number(e.target.value) as 2 | 3 | 4)}
                            className={selectClassName}
                        >
                            <option value="2">2 Options</option>
                            <option value="3">3 Options</option>
                            <option value="4">4 Options</option>
                        </select>
                    </div>
                )}
            </>
        );
    };

    const supportsQuestionImages = mode === 'ai' && ![GameType.STOP_THE_FIRE].includes(type);
    
    // Files state separate from config until generation for cleaner updates
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const schoolId = user?.schoolAccess?.schoolId || '';
    const canUseSchoolStorage = Boolean(user?.accountType === 'school' && schoolId);
    const [schoolStorageFolders, setSchoolStorageFolders] = useState<SchoolStorageFolder[]>([]);
    const [schoolStorageLoading, setSchoolStorageLoading] = useState(false);
    const [schoolStorageBrowserOpen, setSchoolStorageBrowserOpen] = useState(false);
    const [saveUploadsToSchoolStorage, setSaveUploadsToSchoolStorage] = useState(false);
    const [schoolUploadFolderId, setSchoolUploadFolderId] = useState<string>('');
    const [schoolStorageSavingUploads, setSchoolStorageSavingUploads] = useState(false);

    // For Survey Showdown custom prompts
    const [roundPrompts, setRoundPrompts] = useState<string[]>([]);

    useEffect(() => {
        if (!canUseSchoolStorage) {
            setSchoolStorageFolders([]);
            setSaveUploadsToSchoolStorage(false);
            setSchoolUploadFolderId('');
            return;
        }

        let active = true;
        const loadFolders = async () => {
            setSchoolStorageLoading(true);
            try {
                const nextFolders = await listSchoolStorageFolders(schoolId);
                if (!active) return;
                setSchoolStorageFolders(nextFolders);
            } catch (error) {
                if (!active) return;
                console.warn('Failed to load school storage folders:', error);
                setSchoolStorageFolders([]);
            } finally {
                if (active) setSchoolStorageLoading(false);
            }
        };

        void loadFolders();
        return () => {
            active = false;
        };
    }, [canUseSchoolStorage, schoolId]);

    useEffect(() => {
        const hasLocalUploads = uploadedFiles.some((file) => file.source !== 'school-storage');
        if (!hasLocalUploads) {
            setSaveUploadsToSchoolStorage(false);
        }
    }, [uploadedFiles]);

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

    useEffect(() => {
        if (type !== GameType.WORD_WHEEL) return;
        setConfig(prev => ({
            ...prev,
            questionCount: WORD_WHEEL_LETTERS.length,
            questionType: 'open',
            wordWheelScoringMode: prev.wordWheelScoringMode || 'classic',
            wordWheelLetterRule: prev.wordWheelLetterRule || 'contains-hard'
        }));
    }, [type]);
    
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
    const [manualImportExpanded, setManualImportExpanded] = useState(false);
    const [manualImportBusy, setManualImportBusy] = useState(false);
    const [manualImportText, setManualImportText] = useState('');
    const [externalPromptPointsMode, setExternalPromptPointsMode] = useState<'fixed' | 'random' | 'ai-random' | 'manual'>('fixed');
    const [manualImportFeedback, setManualImportFeedback] = useState<{ tone: 'neutral' | 'success' | 'error'; text: string } | null>(null);

    const [loading, setLoading] = useState(false);
    const dictation = useDictation({ model: 'tiny', language: 'auto' });
    const sourceInputRef = useRef<HTMLInputElement>(null);
    const manualImportInputRef = useRef<HTMLInputElement>(null);

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
            const rawFiles = Array.from(e.target.files);
            const filesToSaveToSchool: Array<{ rawFile: File; uploadedFile: UploadedFile }> = [];
            
            for (let i = 0; i < rawFiles.length; i++) {
                const file = rawFiles[i];
                if (file.size > SOURCE_MAX_SIZE_BYTES) {
                    alert(`File "${file.name}" exceeds the 4MB limit.`);
                    continue;
                }
                if (uploadedFiles.length + newFiles.length >= 3) {
                    alert("Maximum 3 files allowed.");
                    break;
                }
                try {
                    const processed = await processFile(file);
                    const nextUploadedFile: UploadedFile = {
                        ...processed,
                        source: 'upload',
                        sizeBytes: file.size,
                        savedToSchoolStorage: false,
                    };
                    newFiles.push(nextUploadedFile);
                    if (saveUploadsToSchoolStorage && canUseSchoolStorage) {
                        filesToSaveToSchool.push({ rawFile: file, uploadedFile: nextUploadedFile });
                    }
                } catch (err) {
                    console.error("Error reading file", err);
                    alert(`Failed to read file: ${file.name}`);
                }
            }

            if (filesToSaveToSchool.length > 0) {
                try {
                    await ensureSchoolStorageCapacity({
                        schoolId,
                        additionalBytes: filesToSaveToSchool.reduce(
                            (sum, { rawFile }) => sum + Math.max(0, Number(rawFile.size || 0)),
                            0
                        ),
                    });
                    setSchoolStorageSavingUploads(true);
                    const results = await Promise.allSettled(
                        filesToSaveToSchool.map(({ rawFile }) =>
                            uploadSchoolStorageFile({
                                schoolId,
                                folderId: schoolUploadFolderId || null,
                                file: rawFile
                            })
                        )
                    );
                    results.forEach((result, index) => {
                        if (result.status === 'fulfilled') {
                            filesToSaveToSchool[index].uploadedFile.savedToSchoolStorage = true;
                        }
                    });
                    const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
                    if (failures.length > 0) {
                        setSaveUploadsToSchoolStorage(false);
                        console.warn('Some files were not saved to school storage:', failures);
                        alert('One or more files could not be saved to School Storage. They were still attached locally for this game.');
                    }
                } catch (err) {
                    setSaveUploadsToSchoolStorage(false);
                    const message = err instanceof Error ? err.message : 'School Storage is full.';
                    alert(`${message} These files were still attached locally for this game.`);
                } finally {
                    setSchoolStorageSavingUploads(false);
                }
            }

            setUploadedFiles(prev => [...prev, ...newFiles]);
            // Reset input value to allow re-uploading same file if deleted
            e.target.value = '';
        }
    };

    const externalLlmPrompt = buildExternalLlmGamePrompt(config, { pointsStrategy: externalPromptPointsMode });
    const supportsExternalTopic = mode === 'manual';
    const supportsExternalQuestionType =
        mode === 'manual' &&
        ![GameType.MILLIONAIRE, GameType.LIVE_QUIZ_CHALLENGE, GameType.SURVEY_SHOWDOWN, GameType.WORD_WHEEL, GameType.STOP_THE_FIRE].includes(type);
    const supportsExternalPointsMode =
        mode === 'manual' &&
        ![GameType.JEOPARDY, GameType.PUB_QUIZ, GameType.MILLIONAIRE, GameType.LIVE_QUIZ_CHALLENGE, GameType.DARTS, GameType.SURVEY_SHOWDOWN, GameType.WORD_WHEEL, GameType.STOP_THE_FIRE].includes(type);

    const handleCopyExternalPrompt = async () => {
        try {
            setManualImportExpanded(true);
            await copyTextToClipboard(externalLlmPrompt);
            setManualImportFeedback({
                tone: 'success',
                text: 'Prompt copied. Paste it into ChatGPT or another AI tool, then upload or paste the result here.'
            });
        } catch (error) {
            console.error('Failed to copy external LLM prompt', error);
            setManualImportFeedback({
                tone: 'error',
                text: 'Could not copy the prompt automatically. Please try again.'
            });
        }
    };

    const openManualImportPicker = () => {
        manualImportInputRef.current?.click();
    };

    const processManualImport = async (text: string, label: string) => {
        setManualImportBusy(true);
        setManualImportExpanded(true);
        setManualImportFeedback({
            tone: 'neutral',
            text: `Importing ${label}...`
        });

        try {
            const importedGame = parseImportedGameContent(text, config);
            onProceed(importedGame);
        } catch (error) {
            console.error('Failed to import manual game JSON', error);
            setManualImportFeedback({
                tone: 'error',
                text: error instanceof Error ? error.message : `Could not import ${label}.`
            });
        } finally {
            setManualImportBusy(false);
        }
    };

    const handleManualImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        const text = await file.text();
        await processManualImport(text, file.name);
    };

    const handleManualImportPaste = async () => {
        const trimmed = manualImportText.trim();
        if (!trimmed) {
            setManualImportExpanded(true);
            setManualImportFeedback({
                tone: 'error',
                text: 'Paste the result from your AI tool before importing.'
            });
            return;
        }

        await processManualImport(trimmed, 'pasted JSON');
    };

    const removeFile = (index: number) => {
        setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleAttachSchoolFiles = (filesFromSchool: UploadedFile[]) => {
        setUploadedFiles((prev) => [...prev, ...filesFromSchool].slice(0, 3));
    };

    const hasLocalUploads = uploadedFiles.some((file) => file.source !== 'school-storage');
    const localUploadsPendingSchoolSave = uploadedFiles.filter(
        (file) => file.source !== 'school-storage' && !file.savedToSchoolStorage
    ).length;

    const handleSaveUploadsToSchoolStorageChange = async (checked: boolean) => {
        if (!checked) {
            setSaveUploadsToSchoolStorage(false);
            return;
        }

        const filesToPersist = uploadedFiles.filter(
            (file) => file.source !== 'school-storage' && !file.savedToSchoolStorage
        );

        if (filesToPersist.length === 0) {
            setSaveUploadsToSchoolStorage(true);
            return;
        }

        try {
            await ensureSchoolStorageCapacity({
                schoolId,
                additionalBytes: filesToPersist.reduce(
                    (sum, file) => sum + Math.max(0, Number(file.sizeBytes || 0)),
                    0
                ),
            });
        } catch (err) {
            setSaveUploadsToSchoolStorage(false);
            alert(err instanceof Error ? err.message : 'School Storage is full.');
            return;
        }

        setSchoolStorageSavingUploads(true);
        const results = await Promise.allSettled(
            filesToPersist.map((file) =>
                uploadUploadedFileToSchoolStorage({
                    schoolId,
                    folderId: schoolUploadFolderId || null,
                    uploadedFile: file,
                })
            )
        );

        const successfulFiles = filesToPersist.filter((_, index) => results[index].status === 'fulfilled');
        if (successfulFiles.length > 0) {
            setUploadedFiles((prev) =>
                prev.map((file) =>
                    successfulFiles.includes(file)
                        ? { ...file, savedToSchoolStorage: true }
                        : file
                )
            );
        }

        const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
        if (failures.length > 0) {
            setSaveUploadsToSchoolStorage(false);
            console.warn('Some existing uploads were not saved to school storage:', failures);
            alert('One or more uploaded files could not be saved to School Storage. Please try again.');
            setSchoolStorageSavingUploads(false);
            return;
        }

        setSaveUploadsToSchoolStorage(true);
        setSchoolStorageSavingUploads(false);
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

        if (!user) {
            promptSignupForFree('Create a free account on the Teacher Plan to create games and save your work.');
            return;
        }
        
        // AI MODE
        if (mode === 'ai') {
            if (user.accountType === 'free') {
                promptUpgradeForAi('AI game generation is included with the Teacher Plan during early access.');
                return;
            }
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
                    alert(err instanceof Error ? err.message : "Failed to generate word bank. Please check API configuration.");
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
                if (type === GameType.LIVE_QUIZ_CHALLENGE) {
                    finalConfig = {
                        ...finalConfig,
                        questionType: 'multiple-choice',
                        mcOptionStrategy: 'fixed',
                        mcOptionCount: 4,
                        pointsMode: 'fixed',
                    };
                }
                if (type === GameType.SURVEY_SHOWDOWN && roundPrompts.some(p => p.trim())) {
                    const customList = roundPrompts.map((p, i) => p.trim() ? `Round ${i+1}: ${p}` : `Round ${i+1}: AI Decide`).join('; ');
                    finalConfig.customInstructions = (finalConfig.customInstructions || "") + `\n\nUSE THESE SPECIFIC QUESTIONS FOR ROUNDS: ${customList}`;
                }

                const gameData = await generateGameContent(finalConfig);
                onProceed(gameData);
            } catch (err) {
                console.error(err);
                alert(err instanceof Error ? err.message : "Failed to generate game. Please check API configuration.");
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
                    ? (
                        type === GameType.WORD_WHEEL
                            ? WORD_WHEEL_LETTERS.map((letter, i) => ({
                                id: i,
                                letter,
                                question: '',
                                answer: '',
                                answerAliases: [],
                                points: 10,
                                isBonus: false,
                            }))
                            : Array.from({ length: config.questionCount }).map((_, i) => ({
                                id: i,
                                question: '',
                                answer: '',
                                points: type === GameType.LIVE_QUIZ_CHALLENGE ? 1000 : 100,
                                isBonus: false,
                                difficulty: type === GameType.DARTS ? 'easy' : undefined,
                                options: (type === GameType.MILLIONAIRE || type === GameType.LIVE_QUIZ_CHALLENGE) ? ["", "", "", ""] : undefined,
                                // Survey Init
                                surveyAnswers: type === GameType.SURVEY_SHOWDOWN ? Array(8).fill({text: "", score: 0}) : undefined
                            }))
                    )
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
        <div
            className="fixed inset-x-0 bottom-0 top-16 bg-slate-50 z-40 overflow-y-auto transition-[top] duration-200"
            style={mobileTopInset > 0 ? { top: `calc(4rem + ${mobileTopInset}px)` } : undefined}
        >
            <div>
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
                                                    onChange={(e) => updateQuestionType(e.target.value as GameConfig['questionType'])}
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
                                            {renderMcOptionControls("w-full p-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-sky-400")}
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
                            ) : type === GameType.WORD_WHEEL ? (
                                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-6">
                                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                                        <h3 className="text-sm font-bold text-slate-800 mb-1">Word Wheel Structure</h3>
                                        <p className="text-sm text-slate-600">
                                            This mode uses an English A-Z wheel (26 clues), one clue per letter.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Letter Rule</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setConfig({ ...config, wordWheelLetterRule: 'contains-hard' })}
                                                className={`text-left p-4 rounded-xl border transition-colors ${
                                                    (config.wordWheelLetterRule || 'contains-hard') === 'contains-hard'
                                                        ? 'border-brand-blue bg-sky-50'
                                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                                }`}
                                            >
                                                <div className="text-sm font-bold text-slate-800">Flexible Q/V/X/Y/Z</div>
                                                <p className="text-xs text-slate-500 mt-1">Hard letters can contain or start with the letter (contains preferred); all others start with the letter.</p>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setConfig({ ...config, wordWheelLetterRule: 'starts-with' })}
                                                className={`text-left p-4 rounded-xl border transition-colors ${
                                                    config.wordWheelLetterRule === 'starts-with'
                                                        ? 'border-brand-blue bg-sky-50'
                                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                                }`}
                                            >
                                                <div className="text-sm font-bold text-slate-800">Starts with all letters</div>
                                                <p className="text-xs text-slate-500 mt-1">Every answer must start with its assigned letter.</p>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Letters</label>
                                            <div className="p-3 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700">
                                                26 (A-Z)
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Answer Format</label>
                                            <div className="p-3 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700">
                                                Open response
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Letter Matching</label>
                                            <div className="p-3 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700">
                                                {(config.wordWheelLetterRule || 'contains-hard') === 'contains-hard'
                                                    ? 'Q/V/X/Y/Z can contain or start with the letter (contains preferred); others start with the letter'
                                                    : 'All letters use starts with'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : type === GameType.TRIVIA || type === GameType.LIVE_QUIZ_CHALLENGE ? (
                                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">
                                            {type === GameType.LIVE_QUIZ_CHALLENGE ? 'Question Count' : 'Grid Size'}
                                        </label>
                                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                                            {(type === GameType.LIVE_QUIZ_CHALLENGE ? [5, 10, 15, 20, 25, 30] : [12, 15, 20, 24, 30, 36]).map(num => (
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

                                    {type === GameType.LIVE_QUIZ_CHALLENGE ? (
                                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                                            <div className="text-sm font-bold text-slate-800">Live quiz format</div>
                                            <p className="mt-1 text-xs font-semibold text-slate-500">
                                                Every question uses 4 multiple-choice options and 1000 max points for speed-based live scoring.
                                            </p>
                                        </div>
                                    ) : mode === 'ai' && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Question Type</label>
                                                <select
                                                    value={config.questionType}
                                                    onChange={(e) => updateQuestionType(e.target.value as GameConfig['questionType'])}
                                                    className="w-full p-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-sky-400"
                                                >
                                                    <option value="ai-decide">AI Decide (Mixed)</option>
                                                    <option value="multiple-choice">Multiple Choice</option>
                                                    <option value="gap-fill">Gap Fill</option>
                                                    <option value="open">Open Ended</option>
                                                    <option value="mixed">Mixed Format</option>
                                                </select>
                                            </div>

                                            {renderMcOptionControls("w-full p-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-sky-400")}
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
                                                    onChange={(e) => updateQuestionType(e.target.value as GameConfig['questionType'])}
                                                    className="w-full p-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-sky-400"
                                                >
                                                    <option value="ai-decide">AI Decide (Mixed)</option>
                                                    <option value="multiple-choice">Multiple Choice</option>
                                                    <option value="gap-fill">Gap Fill</option>
                                                    <option value="open">Open Ended</option>
                                                    <option value="mixed">Mixed Format</option>
                                                </select>
                                            </div>
                                            {renderMcOptionControls("w-full p-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-sky-400")}
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
                                                onChange={(e) => updateQuestionType(e.target.value as GameConfig['questionType'])}
                                                className="w-full p-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-sky-400"
                                            >
                                                <option value="ai-decide">AI Decide (Mixed)</option>
                                                <option value="multiple-choice">Multiple Choice</option>
                                                <option value="gap-fill">Gap Fill</option>
                                                <option value="open">Open Ended</option>
                                                <option value="mixed">Mixed Format</option>
                                            </select>
                                        </div>
                                        {renderMcOptionControls("w-full p-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-sky-400")}
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
                                                    onChange={(e) => updateQuestionType(e.target.value as GameConfig['questionType'])}
                                                    className="w-full p-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-sky-400"
                                                >
                                                    <option value="ai-decide">AI Decide (Mixed)</option>
                                                    <option value="multiple-choice">Multiple Choice</option>
                                                    <option value="gap-fill">Gap Fill</option>
                                                    <option value="open">Open Ended</option>
                                                    <option value="mixed">Mixed Format</option>
                                                </select>
                                            </div>
                                            {renderMcOptionControls("w-full p-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-sky-400")}
                                        </>
                                    )}
                                </div>
                            )}

                            {mode === 'manual' && (
                                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
                                    <input
                                        ref={manualImportInputRef}
                                        type="file"
                                        accept={MANUAL_GAME_IMPORT_ACCEPT}
                                        onChange={handleManualImportFileChange}
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setManualImportExpanded((prev) => !prev)}
                                        aria-expanded={manualImportExpanded}
                                        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-brand-blue"
                                    >
                                        <span className="flex items-center gap-3">
                                            <span className="bg-sky-100 p-2 rounded-lg text-sky-700">
                                                <Upload size={18} />
                                            </span>
                                            <span className="font-bold text-slate-800">Import from Another AI Tool</span>
                                        </span>
                                        <ChevronDown
                                            size={18}
                                            className={`text-slate-500 transition-transform ${manualImportExpanded ? 'rotate-180' : ''}`}
                                        />
                                    </button>

                                    {manualImportExpanded && (
                                        <div className="space-y-4">
                                            <p className="text-sm text-slate-600">
                                                Fill in the game settings above, then copy a prompt built from those settings. Use ChatGPT, Claude, Gemini, or another AI tool to generate the game content, then upload or paste it here to open a prefilled editor.
                                            </p>

                                            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
                                                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                                                    Prompt Settings
                                                </label>

                                                {supportsExternalTopic && (
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-2">Topic / Theme</label>
                                                        <input
                                                            type="text"
                                                            value={config.topic}
                                                            onChange={(e) => setConfig({ ...config, topic: e.target.value })}
                                                            placeholder="e.g., Ancient Rome, Ecosystems, Easter revision"
                                                            className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-brand-blue"
                                                        />
                                                    </div>
                                                )}

                                                {supportsExternalQuestionType && (
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-2">Question Type</label>
                                                        <select
                                                            value={config.questionType}
                                                            onChange={(e) => updateQuestionType(e.target.value as GameConfig['questionType'])}
                                                            className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-brand-blue"
                                                        >
                                                            <option value="ai-decide">AI Decides (Mixed)</option>
                                                            <option value="mixed">Mixed Format</option>
                                                            <option value="multiple-choice">Multiple Choice</option>
                                                            <option value="gap-fill">Gap Fill</option>
                                                            <option value="open">Open Ended</option>
                                                        </select>
                                                    </div>
                                                )}

                                                {supportsExternalQuestionType && renderMcOptionControls("w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-brand-blue")}

                                                {supportsExternalPointsMode && (
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-2">Points Strategy</label>
                                                        <select
                                                            value={externalPromptPointsMode}
                                                            onChange={(e) => setExternalPromptPointsMode(e.target.value as 'fixed' | 'random' | 'ai-random' | 'manual')}
                                                            className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-brand-blue"
                                                        >
                                                            <option value="fixed">Fixed Points</option>
                                                            <option value="random">Random Points</option>
                                                            <option value="ai-random">Vary By Difficulty</option>
                                                            <option value="manual">Edit Points Later</option>
                                                        </select>
                                                    </div>
                                                )}

                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-2">Extra Instructions</label>
                                                    <textarea
                                                        value={config.customInstructions}
                                                        onChange={(e) => setConfig({ ...config, customInstructions: e.target.value })}
                                                        placeholder="e.g., Keep the language around B1 level. Avoid trick questions. Focus on phrasal verbs."
                                                        className="w-full min-h-[110px] rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-brand-blue"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => void handleCopyExternalPrompt()}
                                                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-brand-blue hover:text-brand-blue"
                                                >
                                                    <Copy size={16} />
                                                    Copy Prompt for AI Tool
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={openManualImportPicker}
                                                    disabled={manualImportBusy}
                                                    className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                                                >
                                                    <Upload size={16} />
                                                    {manualImportBusy ? 'Importing...' : 'Upload JSON / MD'}
                                                </button>
                                            </div>

                                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
                                                    How To Use It
                                                </label>
                                                <p className="text-sm text-slate-600">
                                                    Complete the information above first. Then copy the prompt, paste it into your AI tool, and copy the response it gives you back into the box below.
                                                </p>
                                                <p className="mt-2 text-xs text-slate-500">
                                                    Accepted formats: <span className="font-mono">.json</span>, <span className="font-mono">.txt</span>, or <span className="font-mono">.md</span> containing JSON.
                                                </p>
                                            </div>

                                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
                                                    Paste JSON Directly
                                                </label>
                                                <textarea
                                                    value={manualImportText}
                                                    onChange={(e) => setManualImportText(e.target.value)}
                                                    placeholder="Paste the result from your AI tool here."
                                                    className="w-full min-h-[180px] rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-brand-blue"
                                                />
                                                <div className="mt-3 flex flex-wrap gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleManualImportPaste()}
                                                        disabled={manualImportBusy || !manualImportText.trim()}
                                                        className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                                                    >
                                                        <Upload size={16} />
                                                        {manualImportBusy ? 'Importing...' : 'Import Pasted JSON'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setManualImportText('')}
                                                        disabled={manualImportBusy || !manualImportText}
                                                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-brand-blue hover:text-brand-blue disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                                    >
                                                        Clear
                                                    </button>
                                                </div>
                                            </div>

                                            {manualImportFeedback && (
                                                <div
                                                    className={`rounded-xl px-4 py-3 text-sm ${
                                                        manualImportFeedback.tone === 'error'
                                                            ? 'border border-red-200 bg-red-50 text-red-700'
                                                            : manualImportFeedback.tone === 'success'
                                                                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                                                                : 'border border-slate-200 bg-white text-slate-600'
                                                    }`}
                                                >
                                                    {manualImportFeedback.text}
                                                </div>
                                            )}
                                        </div>
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
                                                    checked={(config.imageMode || 'auto') === 'auto'}
                                                    onChange={() => setConfig({ ...config, imageMode: 'auto' })}
                                                    className="mt-1 h-4 w-4 text-brand-blue border-slate-300"
                                                />
                                                <span>
                                                    <span className="font-semibold text-slate-800">Auto-pick images</span>
                                                    <span className="block text-xs text-slate-500">
                                                        The AI will choose a suitable stock image for each question.
                                                    </span>
                                                    <span className="mt-1 block text-[11px] text-amber-700">
                                                        Auto-selected images are suggestions. Please review them and replace any that are not a good fit.
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
                                                accept={SOURCE_ACCEPT}
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
                                            {canUseSchoolStorage && (
                                                <button
                                                    type="button"
                                                    onClick={() => setSchoolStorageBrowserOpen(true)}
                                                    title="Browse School Storage"
                                                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:border-brand-blue hover:text-brand-blue transition-colors"
                                                >
                                                    <HardDrive size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <textarea 
                                        value={config.customInstructions}
                                        onChange={(e) => setConfig({...config, customInstructions: e.target.value})}
                                        placeholder="e.g., Make questions suitable for 5th graders. Focus on vocabulary."
                                        className="w-full p-3 rounded-lg border border-slate-200 outline-none h-24 resize-none"
                                    />
                                    <p className="mt-2 text-xs text-slate-500">Add class level, age range, focus areas, or attach source material to guide the game. PDFs, Word docs, and images are supported.</p>
                                    {dictation.statusMessage && (
                                        <p className={`mt-1 text-xs ${dictation.isListening || dictation.status === 'error' ? 'font-semibold text-red-600' : 'text-slate-500'}`}>
                                            {dictation.statusMessage}
                                        </p>
                                    )}
                                    {canUseSchoolStorage && hasLocalUploads && (
                                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                            <div className="flex flex-wrap items-center gap-3 justify-between">
                                                <label className="flex items-center gap-2 text-sm text-slate-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={saveUploadsToSchoolStorage}
                                                        onChange={(event) => void handleSaveUploadsToSchoolStorageChange(event.target.checked)}
                                                        disabled={schoolStorageSavingUploads}
                                                        className="h-4 w-4 rounded border-slate-300 text-brand-blue"
                                                    />
                                                    <span className="font-medium">
                                                        {schoolStorageSavingUploads ? 'Saving uploads to School Storage...' : 'Save uploaded files to School Storage'}
                                                    </span>
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => setSchoolStorageBrowserOpen(true)}
                                                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-brand-blue hover:text-brand-blue"
                                                >
                                                    <HardDrive size={14} /> Browse School Storage
                                                </button>
                                            </div>
                                            <div className="mt-3">
                                                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">
                                                    School folder for new uploads
                                                </label>
                                                <select
                                                    value={schoolUploadFolderId}
                                                    onChange={(event) => setSchoolUploadFolderId(event.target.value)}
                                                    disabled={schoolStorageLoading}
                                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-blue disabled:opacity-60"
                                                >
                                                    <option value="">Root folder</option>
                                                    {schoolStorageFolders.map((folder) => (
                                                        <option key={folder.id} value={folder.id}>
                                                            {folder.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <p className="mt-2 text-xs text-slate-500">
                                                {localUploadsPendingSchoolSave > 0
                                                    ? `${localUploadsPendingSchoolSave} uploaded file${localUploadsPendingSchoolSave === 1 ? '' : 's'} not yet saved to School Storage.`
                                                    : 'Current uploaded files are already saved to School Storage.'}
                                            </p>
                                        </div>
                                    )}
                                    {uploadedFiles.length > 0 && (
                                        <div className="mt-3 space-y-2">
                                            {uploadedFiles.map((file, idx) => (
                                                <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
                                                    <div className="flex items-center truncate">
                                                        <FileText size={16} className="text-slate-400 mr-2 flex-shrink-0" />
                                                        <span className="text-sm text-slate-600 truncate max-w-[220px]">
                                                            {file.name}
                                                            {file.source === 'school-storage' ? ' (school storage)' : ''}
                                                        </span>
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
                                aria-busy={loading}
                                className={`relative w-full overflow-hidden py-4 rounded-xl font-bold text-lg shadow-md transition-all flex items-center justify-center
                                ${loading ? 'bg-brand-blue text-white cursor-wait shadow-lg' : 'bg-brand-blue text-white hover:bg-sky-600 hover:shadow-lg'}`}
                            >
                                {loading && (
                                    <span
                                        aria-hidden="true"
                                        className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.08)_28%,rgba(255,255,255,0.26)_28%,rgba(255,255,255,0.26)_48%,rgba(255,255,255,0.08)_48%,rgba(255,255,255,0.08)_100%)] bg-[length:48px_100%] animate-creating-game"
                                    />
                                )}
                                <span className="relative z-10 flex items-center justify-center">
                                {loading ? (
                                    <>Creating Game, please wait...</>
                                ) : (
                                    <>{mode === 'ai' ? <Sparkles className="mr-2" /> : <Edit className="mr-2" />} 
                                    {mode === 'ai' ? 'Create Game' : 'Open Blank Editor'}</>
                                )}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <SchoolStorageBrowser
                isOpen={schoolStorageBrowserOpen}
                schoolId={schoolId}
                existingCount={uploadedFiles.length}
                onAttach={handleAttachSchoolFiles}
                onClose={() => setSchoolStorageBrowserOpen(false)}
            />
        </div>
    );
};
