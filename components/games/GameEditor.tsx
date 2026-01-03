
import React, { useState, useEffect, useRef } from 'react';
import { GameType, GeneratedGame } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useUnsavedChanges } from '../../contexts/UnsavedChangesContext';
import { saveGameToLibrary } from '../../utils/gameUtils';
import { Save, Play, Check, AlertCircle, Plus, Trash2, Coins, ArrowLeft, Layers, List, Globe, Lock, Sparkles, X, FileText, Copy, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';

interface GameEditorProps {
    game: GeneratedGame;
    onSave: (g: GeneratedGame) => void;
    onPlay: (g: GeneratedGame) => void;
    onBack: () => void;
}

export const GameEditor: React.FC<GameEditorProps> = ({ game, onSave, onPlay, onBack }) => {
    const [editedGame, setEditedGame] = useState<GeneratedGame>(game);
    const [activeTab, setActiveTab] = useState<number>(0);
    const [isPublic, setIsPublic] = useState(game.config.isPublic || false); // New Local State for Visibility
    const [showAiPrompt, setShowAiPrompt] = useState(false);
    const [showCopyToast, setShowCopyToast] = useState(false);
    const tabsScrollRef = useRef<HTMLDivElement>(null);
    const [currentPage, setCurrentPage] = useState(1);
    
    const { user } = useAuth();
    const { setIsDirty, confirmAction } = useUnsavedChanges();
    
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    // Lock body scroll when editor is active
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    // Sync isPublic back to editedGame config when changed
    useEffect(() => {
        setEditedGame(prev => ({
            ...prev,
            config: { ...prev.config, isPublic }
        }));
        setIsDirty(true);
    }, [isPublic]);

    const handleSave = async () => {
        if (!user) {
            alert('Please log in to save games to your profile.');
            return;
        }
        setSaveStatus('saving');
        
        // Ensure config is synced
        const finalGame = {
            ...editedGame,
            config: { ...editedGame.config, isPublic }
        };

        // Async save with Author Name
        const success = await saveGameToLibrary(finalGame, user.id, user.name);
        
        if (success) {
            setSaveStatus('saved');
            setIsDirty(false);
            onSave(finalGame);
            setTimeout(() => setSaveStatus('idle'), 2000);
        } else {
            setSaveStatus('idle');
            alert("Failed to save. Please try again.");
        }
    };

    const handlePlay = () => {
        onPlay(editedGame);
    };

    const handleChange = (updater: (prev: GeneratedGame) => GeneratedGame) => {
        setEditedGame(updater);
        setIsDirty(true);
        setSaveStatus('idle');
    };

    const handleVisibilityToggle = () => {
        if (!user) {
            alert("Guests cannot publish games to the community. Please log in to share your creation!");
            return;
        }
        setIsPublic(!isPublic);
    };

    const handleCopyInstructions = () => {
        navigator.clipboard.writeText(editedGame.config.customInstructions || "");
        setShowCopyToast(true);
        setTimeout(() => setShowCopyToast(false), 2000);
    };

    const handleTabsScroll = (direction: 'left' | 'right') => {
        const el = tabsScrollRef.current;
        if (!el) return;
        const amount = Math.round(el.clientWidth * 0.6);
        el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
    };

    const addQuestion = () => {
        handleChange(prev => ({
            ...prev,
            questions: [
                ...prev.questions,
                {
                    id: prev.questions.length,
                    question: '',
                    answer: '',
                    points: 100,
                    isBonus: false,
                    difficulty: prev.config.type === GameType.DARTS ? 'easy' : undefined,
                    surveyAnswers: prev.config.type === GameType.SURVEY_SHOWDOWN ? Array(8).fill({text: "", score: 0}) : undefined
                }
            ]
        }));
        setCurrentPage(Math.ceil((displayQuestions.length + 1) / QUESTIONS_PER_PAGE));
    };

    const removeQuestion = (index: number) => {
        confirmAction("Delete this question permanently?", () => {
            handleChange(prev => ({
                ...prev,
                questions: prev.questions.filter((_, i) => i !== index)
            }));
        });
    };

    // --- STANDARD EDITOR HELPERS ---
    const updateQuestionType = (index: number, type: 'open' | 'multiple-choice') => {
        handleChange(prev => {
            const newQuestions = [...prev.questions];
            if (type === 'open') {
                newQuestions[index].options = undefined;
            } else {
                if (!newQuestions[index].options || newQuestions[index].options.length === 0) {
                    newQuestions[index].options = ["", "", "", ""];
                }
            }
            return { ...prev, questions: newQuestions };
        });
    };

    const updateQuestionOptionCount = (index: number, count: number) => {
        handleChange(prev => {
            const newQuestions = [...prev.questions];
            const current = newQuestions[index].options || [];
            if (count > current.length) {
                const added = Array(count - current.length).fill("");
                newQuestions[index].options = [...current, ...added];
            } else {
                newQuestions[index].options = current.slice(0, count);
            }
            return { ...prev, questions: newQuestions };
        });
    };

    const updateQuestionDifficulty = (index: number, difficulty: string) => {
        handleChange(prev => {
            const newQuestions = [...prev.questions];
            newQuestions[index].difficulty = difficulty as 'easy' | 'medium' | 'hard';
            return { ...prev, questions: newQuestions };
        });
    };

    // --- JEOPARDY / PUB QUIZ EDITOR HELPERS ---
    const updateGroupedType = (qIdx: number, type: 'open' | 'multiple-choice') => {
        handleChange(prev => {
            const isJeopardy = prev.config.type === GameType.JEOPARDY;
            const groups = isJeopardy ? [...prev.jeopardyBoard!] : [...prev.pubQuizRounds!];
            
            // Shallow copy the group object
            groups[activeTab] = { ...groups[activeTab], questions: [...groups[activeTab].questions] };
            const q = groups[activeTab].questions[qIdx];
            
            if (type === 'open') {
                q.options = undefined;
            } else {
                if (!q.options || q.options.length === 0) {
                    q.options = ["", "", "", ""];
                }
            }
            
            if (isJeopardy) return {...prev, jeopardyBoard: groups};
            else return {...prev, pubQuizRounds: groups};
        });
    };

    const updateGroupedOptionCount = (qIdx: number, count: number) => {
        handleChange(prev => {
            const isJeopardy = prev.config.type === GameType.JEOPARDY;
            const groups = isJeopardy ? [...prev.jeopardyBoard!] : [...prev.pubQuizRounds!];
            
            // Shallow copy the group object
            groups[activeTab] = { ...groups[activeTab], questions: [...groups[activeTab].questions] };
            const q = groups[activeTab].questions[qIdx];
            
            const current = q.options || [];
            if (count > current.length) {
                q.options = [...current, ...Array(count - current.length).fill("")];
            } else {
                q.options = current.slice(0, count);
            }
            
            if (isJeopardy) return {...prev, jeopardyBoard: groups};
            else return {...prev, pubQuizRounds: groups};
        });
    };

    // Determine Group Data Source (Jeopardy or Pub Quiz)
    const isGrouped = editedGame.config.type === GameType.JEOPARDY || editedGame.config.type === GameType.PUB_QUIZ;
    const groups = editedGame.config.type === GameType.JEOPARDY ? editedGame.jeopardyBoard : editedGame.pubQuizRounds;
    const groupLabel = editedGame.config.type === GameType.JEOPARDY ? "Category" : "Round";
    const isMillionaire = editedGame.config.type === GameType.MILLIONAIRE;
    const isSurvey = editedGame.config.type === GameType.SURVEY_SHOWDOWN;

    // For Darts, we hide the reserve questions in the editor view (but keep them in data)
    // The main questions are indices 0 to config.questionCount - 1
    const baseQuestions = editedGame.questions ?? [];
    const displayQuestions = (editedGame.config.type === GameType.DARTS) 
        ? baseQuestions.slice(0, editedGame.config.questionCount) 
        : baseQuestions;
    const QUESTIONS_PER_PAGE = 10;
    const totalPages = Math.max(1, Math.ceil(displayQuestions.length / QUESTIONS_PER_PAGE));
    const pageStart = (currentPage - 1) * QUESTIONS_PER_PAGE;
    const pagedQuestions = displayQuestions.slice(pageStart, pageStart + QUESTIONS_PER_PAGE);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    return (
        <div className="fixed inset-0 top-16 bg-slate-50 z-50 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-7xl mx-auto px-4 py-8 relative z-20">
                        <div className="flex flex-col gap-4 mb-6">
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={onBack}
                                    className="self-start text-slate-500 hover:text-sky-600 flex items-center font-bold text-sm transition-colors cursor-pointer bg-slate-50 hover:bg-white px-3 py-2 rounded-lg border border-transparent hover:border-slate-200"
                                >
                                    <ArrowLeft size={18} className="mr-1" /> Back to Config
                                </button>
                                
                                {editedGame.config.isAI && (
                                    <button 
                                        onClick={() => setShowAiPrompt(true)}
                                        className="self-start text-indigo-500 hover:text-indigo-700 flex items-center font-bold text-sm transition-colors cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg border border-indigo-100"
                                        title="View AI Instructions"
                                    >
                                        <Sparkles size={16} className="mr-1" /> AI Prompt
                                    </button>
                                )}
                            </div>
                            
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <h1 className="font-display text-3xl font-bold text-slate-800 truncate w-full md:w-auto">
                                    Editor: {editedGame.title} 
                                    <span className="text-sm font-normal text-slate-500 ml-3 bg-slate-100 px-2 py-1 rounded-lg align-middle">
                                        {editedGame.config.type}
                                    </span>
                                </h1>
                                
                                <div className="w-full md:w-auto items-center flex flex-row flex-nowrap justify-center gap-2 sm:justify-start sm:gap-3">
                                    {/* VISIBILITY TOGGLE */}
                                    <div className={`flex items-center bg-slate-200 rounded-full cursor-pointer select-none p-0.5 sm:p-1 ${!user ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={handleVisibilityToggle}>
                                        <div className={`flex items-center rounded-full font-bold transition-all px-2 py-1 text-[11px] sm:px-3 sm:py-1.5 sm:text-xs ${!isPublic ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
                                            <Lock size={12} className="mr-1" /> Private
                                        </div>
                                        <div className={`flex items-center rounded-full font-bold transition-all px-2 py-1 text-[11px] sm:px-3 sm:py-1.5 sm:text-xs ${isPublic ? 'bg-green-500 text-white shadow-sm' : 'text-slate-500'}`}>
                                            <Globe size={12} className="mr-1" /> Public
                                        </div>
                                    </div>

                                    <button 
                                        onClick={handleSave} 
                                        disabled={saveStatus === 'saving'}
                                        className={`font-bold flex items-center justify-center transition-all shadow-sm border cursor-pointer flex-none sm:flex-1 md:flex-none px-3 py-2 rounded-lg text-xs min-w-[92px] sm:px-6 sm:py-3 sm:rounded-xl sm:text-base sm:min-w-[140px]
                                            ${saveStatus === 'saved' 
                                                ? 'bg-green-50 text-green-600 border-green-200' 
                                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-brand-blue'}`}
                                    >
                                        {saveStatus === 'saving' && <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-400 border-t-transparent mr-2"></div>}
                                        {saveStatus === 'saved' && <Check size={18} className="mr-2" />}
                                        {saveStatus === 'idle' && <Save size={18} className="mr-2" />}
                                        
                                        {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save Game'}
                                    </button>
                                    <button 
                                        onClick={handlePlay} 
                                        className="bg-brand-yellow text-slate-900 font-bold shadow-md hover:bg-yellow-300 flex items-center justify-center hover:scale-105 transition-transform cursor-pointer flex-none sm:flex-1 md:flex-none px-4 py-2 rounded-lg text-xs sm:px-8 sm:py-3 sm:rounded-xl sm:text-base"
                                    >
                                        <Play size={18} className="mr-2" /> Play
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        {!user && (
                        <div className="mb-6 bg-sky-50 p-4 rounded-xl flex items-center text-sky-800 text-sm border border-sky-100">
                            <AlertCircle size={16} className="mr-2" />
                            <span>You are editing as a guest. Log in to save this game permanently to your profile and share it with the community.</span>
                        </div>
                        )}

                        {/* GROUPED EDITOR (JEOPARDY / PUB QUIZ) */}
                        {isGrouped && groups ? (
                            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                                {/* Tabs */}
                            <div className="relative">
                                <div ref={tabsScrollRef} className="flex overflow-x-auto bg-slate-100 border-b border-slate-200 no-scrollbar">
                                    {groups.map((cat, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={() => setActiveTab(idx)}
                                            className={`px-4 py-3 sm:px-6 sm:py-4 font-bold text-xs sm:text-sm whitespace-normal sm:whitespace-nowrap text-center sm:text-left leading-tight break-words transition-colors min-w-[110px] sm:min-w-[120px] max-w-[140px] sm:max-w-none border-r border-slate-200 sm:border-r-0 cursor-pointer last:border-r-0
                                                ${activeTab === idx 
                                                    ? 'bg-white text-sky-600 border-t-2 border-t-sky-600 shadow-sm relative z-10' 
                                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
                                        >
                                            {cat.name || `${groupLabel} ${idx + 1}`}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleTabsScroll('left')}
                                    className="sm:hidden absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/90 border border-slate-200 text-slate-400 shadow-sm hover:text-slate-600 transition-colors"
                                    aria-label="Scroll tabs left"
                                >
                                    <ChevronLeft size={16} className="mx-auto" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleTabsScroll('right')}
                                    className="sm:hidden absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/90 border border-slate-200 text-slate-400 shadow-sm hover:text-slate-600 transition-colors"
                                    aria-label="Scroll tabs right"
                                >
                                    <ChevronRight size={16} className="mx-auto" />
                                </button>
                            </div>

                                <div className="p-6">
                                    <div className="mb-8">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Current {groupLabel} Name</label>
                                        <input 
                                            type="text" 
                                            value={groups[activeTab].name} 
                                            onChange={(e) => handleChange(prev => {
                                                const newGroups = editedGame.config.type === GameType.JEOPARDY ? [...prev.jeopardyBoard!] : [...prev.pubQuizRounds!];
                                                // Create a shallow copy of the object to avoid mutation
                                                newGroups[activeTab] = { ...newGroups[activeTab], name: e.target.value };
                                                return editedGame.config.type === GameType.JEOPARDY 
                                                    ? {...prev, jeopardyBoard: newGroups} 
                                                    : {...prev, pubQuizRounds: newGroups};
                                            })}
                                            className="w-full p-4 text-xl font-bold border border-slate-200 rounded-lg focus:border-brand-blue focus:ring-2 focus:ring-sky-100 outline-none transition-all bg-slate-50/50"
                                            placeholder={`Enter ${groupLabel} Name`}
                                        />
                                    </div>

                                    <div className="space-y-6">
                                        {groups[activeTab].questions.map((q, qIdx) => (
                                            <div key={qIdx} className="bg-slate-50 p-6 rounded-xl border border-slate-200 hover:border-sky-200 transition-colors">
                                                <div className="flex items-center justify-between mb-4">
                                                    <span className="font-bold text-sky-700 bg-sky-100 px-3 py-1 rounded-full text-sm">
                                                        {editedGame.config.type === GameType.JEOPARDY ? `${q.points} Points` : `Question ${qIdx + 1}`}
                                                    </span>
                                                    
                                                    {/* TYPE TOGGLE */}
                                                    <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-slate-200">
                                                        <button 
                                                            onClick={() => updateGroupedType(qIdx, 'open')}
                                                            className={`px-2 py-1 text-[10px] font-bold rounded ${!q.options ? 'bg-slate-100 text-slate-600' : 'text-slate-400 hover:text-slate-600'}`}
                                                            disabled={!q.options}
                                                        >
                                                            Open
                                                        </button>
                                                        <button 
                                                            onClick={() => updateGroupedType(qIdx, 'multiple-choice')}
                                                            className={`px-2 py-1 text-[10px] font-bold rounded ${q.options ? 'bg-sky-100 text-sky-600' : 'text-slate-400 hover:text-slate-600'}`}
                                                            disabled={!!q.options}
                                                        >
                                                            Multi-Choice
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Question / Clue</label>
                                                        <textarea 
                                                            value={q.question}
                                                            onChange={(e) => handleChange(prev => {
                                                                const newGroups = editedGame.config.type === GameType.JEOPARDY ? [...prev.jeopardyBoard!] : [...prev.pubQuizRounds!];
                                                                // Deep copy questions array for this group
                                                                newGroups[activeTab] = { 
                                                                    ...newGroups[activeTab], 
                                                                    questions: [...newGroups[activeTab].questions] 
                                                                };
                                                                newGroups[activeTab].questions[qIdx] = { 
                                                                    ...newGroups[activeTab].questions[qIdx], 
                                                                    question: e.target.value 
                                                                };
                                                                return editedGame.config.type === GameType.JEOPARDY ? {...prev, jeopardyBoard: newGroups} : {...prev, pubQuizRounds: newGroups};
                                                            })}
                                                            className="w-full p-3 rounded-lg border border-slate-300 text-sm h-28 resize-none focus:ring-2 focus:ring-sky-200 outline-none transition-all"
                                                            placeholder="Enter the question here..."
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Answer</label>
                                                        <textarea 
                                                            value={q.answer}
                                                            onChange={(e) => handleChange(prev => {
                                                                const newGroups = editedGame.config.type === GameType.JEOPARDY ? [...prev.jeopardyBoard!] : [...prev.pubQuizRounds!];
                                                                newGroups[activeTab] = { 
                                                                    ...newGroups[activeTab], 
                                                                    questions: [...newGroups[activeTab].questions] 
                                                                };
                                                                newGroups[activeTab].questions[qIdx] = { 
                                                                    ...newGroups[activeTab].questions[qIdx], 
                                                                    answer: e.target.value 
                                                                };
                                                                return editedGame.config.type === GameType.JEOPARDY ? {...prev, jeopardyBoard: newGroups} : {...prev, pubQuizRounds: newGroups};
                                                            })}
                                                            className="w-full p-3 rounded-lg border border-slate-300 text-sm h-28 resize-none focus:ring-2 focus:ring-green-200 outline-none transition-all"
                                                            placeholder="Enter the answer here..."
                                                        />
                                                    </div>
                                                </div>

                                                {/* OPTIONS EDITOR */}
                                                {q.options && q.options.length > 0 && (
                                                    <div className="mt-4 pt-4 border-t border-slate-200 animate-fade-in">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <label className="block text-xs font-bold text-slate-500 uppercase">Multiple Choice Options</label>
                                                            <div className="flex bg-white rounded border border-slate-200 overflow-hidden">
                                                                {[2, 3, 4].map(num => (
                                                                    <button 
                                                                        key={num}
                                                                        onClick={() => updateGroupedOptionCount(qIdx, num)}
                                                                        className={`px-2 py-0.5 text-[10px] font-bold transition-colors ${q.options!.length === num ? 'bg-brand-yellow text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
                                                                    >
                                                                        {num} Opts
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            {q.options.map((opt, optIdx) => (
                                                                <div key={optIdx} className="relative">
                                                                    <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold bg-slate-100 px-1.5 py-0.5 rounded">{String.fromCharCode(65 + optIdx)}</span>
                                                                    <input
                                                                        type="text"
                                                                        value={opt}
                                                                        onChange={(e) => handleChange(prev => {
                                                                            const newGroups = editedGame.config.type === GameType.JEOPARDY ? [...prev.jeopardyBoard!] : [...prev.pubQuizRounds!];
                                                                            newGroups[activeTab] = { ...newGroups[activeTab], questions: [...newGroups[activeTab].questions] };
                                                                            const newOptions = [...(newGroups[activeTab].questions[qIdx].options || [])];
                                                                            newOptions[optIdx] = e.target.value;
                                                                            newGroups[activeTab].questions[qIdx] = { ...newGroups[activeTab].questions[qIdx], options: newOptions };
                                                                            return editedGame.config.type === GameType.JEOPARDY ? {...prev, jeopardyBoard: newGroups} : {...prev, pubQuizRounds: newGroups};
                                                                        })}
                                                                        className="w-full pl-10 p-2 rounded border border-slate-300 text-sm outline-none focus:border-brand-blue"
                                                                        placeholder={`Option ${optIdx + 1}`}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // STANDARD EDITOR (Trivia, Snakes, Darts, Millionaire, Survey)
                            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden p-6">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
                                    <p className="text-xs text-slate-500 font-medium">
                                        Showing {displayQuestions.length === 0 ? 0 : pageStart + 1}-{Math.min(pageStart + QUESTIONS_PER_PAGE, displayQuestions.length)} of {displayQuestions.length} questions
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center"
                                        >
                                            <ChevronLeft size={14} className="mr-1" /> Prev
                                        </button>
                                        <span className="text-xs font-bold text-slate-600">
                                            Page {currentPage} of {totalPages}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                            disabled={currentPage === totalPages}
                                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center"
                                        >
                                            Next <ChevronRight size={14} className="ml-1" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {pagedQuestions.map((q, index) => {
                                        const questionIndex = pageStart + index;
                                        return (
                                        <div key={questionIndex} className="bg-slate-50 p-6 rounded-xl border border-slate-200 relative hover:border-sky-200 transition-colors">
                                            <button 
                                                onClick={() => removeQuestion(questionIndex)}
                                                className="absolute top-4 right-4 text-slate-300 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                                                title="Delete Question"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                            <div className="flex items-center justify-between mb-4 pr-10">
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-slate-200 text-slate-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                                                        {questionIndex + 1}
                                                    </span>
                                                    
                                                    {/* Millionaire Label */}
                                                    {isMillionaire && (
                                                        <span className="bg-brand-yellow text-slate-900 px-3 py-1 rounded-full text-xs font-bold uppercase ml-2">
                                                            Level {questionIndex + 1}
                                                        </span>
                                                    )}

                                                    {/* Points Editor (Hidden for Darts, Millionaire, Survey) */}
                                                    {editedGame.config.type !== GameType.DARTS && !isMillionaire && !isSurvey && (
                                                        <div className="flex items-center ml-2 bg-white px-2 py-1 rounded border border-slate-200">
                                                            <Coins size={14} className="text-brand-yellow mr-2" />
                                                            <input 
                                                                type="number"
                                                                value={q.points}
                                                                onChange={(e) => handleChange(prev => {
                                                                    const newQuestions = [...prev.questions];
                                                                    newQuestions[questionIndex].points = parseInt(e.target.value) || 0;
                                                                    return {...prev, questions: newQuestions};
                                                                })}
                                                                className="w-12 p-0.5 text-xs border-none text-center focus:ring-0 outline-none font-bold"
                                                            />
                                                            <span className="text-[10px] font-bold text-slate-400 ml-1">pts</span>
                                                        </div>
                                                    )}

                                                    {/* Darts Difficulty Selector */}
                                                    {editedGame.config.type === GameType.DARTS && (
                                                        <div className="flex items-center ml-2">
                                                            <select 
                                                                value={q.difficulty || 'easy'}
                                                                onChange={(e) => updateQuestionDifficulty(questionIndex, e.target.value)}
                                                                className={`text-xs font-bold uppercase py-1 px-2 rounded border border-slate-200 outline-none
                                                                    ${q.difficulty === 'hard' ? 'text-red-600 bg-red-50' : 
                                                                      q.difficulty === 'medium' ? 'text-yellow-600 bg-yellow-50' : 
                                                                      'text-green-600 bg-green-50'}`}
                                                            >
                                                                <option value="easy">Easy</option>
                                                                <option value="medium">Medium</option>
                                                                <option value="hard">Hard</option>
                                                            </select>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* QUESTION TYPE TOGGLE BAR - Hidden for Millionaire and Survey */}
                                            {!isMillionaire && !isSurvey && (
                                                <div className="flex flex-wrap items-center gap-4 mb-4 bg-slate-100 p-2 rounded-lg border border-slate-200">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Format:</span>
                                                        <div className="flex bg-white rounded border border-slate-200 overflow-hidden shadow-sm">
                                                            <button 
                                                                onClick={() => updateQuestionType(questionIndex, 'open')}
                                                                className={`px-3 py-1 text-xs font-bold transition-colors ${!q.options || q.options.length === 0 ? 'bg-brand-blue text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                                                            >
                                                                Open
                                                            </button>
                                                            <button 
                                                                onClick={() => updateQuestionType(questionIndex, 'multiple-choice')}
                                                                className={`px-3 py-1 text-xs font-bold transition-colors ${q.options && q.options.length > 0 ? 'bg-brand-blue text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                                                            >
                                                                Multi-Choice
                                                            </button>
                                                        </div>
                                                    </div>
                                                    
                                                    {q.options && q.options.length > 0 && (
                                                        <div className="flex items-center gap-2 animate-fade-in">
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Options:</span>
                                                            <div className="flex bg-white rounded border border-slate-200 overflow-hidden shadow-sm">
                                                                {[2, 3, 4].map(num => (
                                                                    <button 
                                                                        key={num}
                                                                        onClick={() => updateQuestionOptionCount(questionIndex, num)}
                                                                        className={`px-3 py-1 text-xs font-bold transition-colors ${q.options!.length === num ? 'bg-brand-yellow text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}
                                                                    >
                                                                        {num}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Question / Prompt</label>
                                                    <textarea 
                                                        value={q.question}
                                                        onChange={(e) => handleChange(prev => {
                                                            const newQuestions = [...prev.questions];
                                                            newQuestions[questionIndex].question = e.target.value;
                                                            return {...prev, questions: newQuestions};
                                                        })}
                                                        className="w-full p-3 rounded-lg border border-slate-300 text-sm h-24 resize-none focus:ring-2 focus:ring-sky-200 outline-none"
                                                        placeholder="Type question here..."
                                                    />
                                                </div>
                                                {!isSurvey && (
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Answer {isMillionaire && <span className="text-red-500">(Must match option text)</span>}</label>
                                                    <textarea 
                                                        value={q.answer}
                                                        onChange={(e) => handleChange(prev => {
                                                            const newQuestions = [...prev.questions];
                                                            newQuestions[questionIndex].answer = e.target.value;
                                                            return {...prev, questions: newQuestions};
                                                        })}
                                                        className="w-full p-3 rounded-lg border border-slate-300 text-sm h-24 resize-none focus:ring-2 focus:ring-green-200 outline-none"
                                                            placeholder="Type answer here..."
                                                        />
                                                    </div>
                                                )}
                                                
                                                {/* SURVEY ANSWERS EDITOR */}
                                                {isSurvey && (
                                                    <div className="col-span-1 md:col-span-2 bg-white rounded border border-slate-200 p-4">
                                                        <label className="block text-xs font-bold text-slate-500 mb-3 uppercase">Top 8 Survey Answers</label>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                                            {(q.surveyAnswers || Array(8).fill({text:"", score:0})).map((ans, aIdx) => (
                                                                <div key={aIdx} className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2 items-start sm:items-center">
                                                                    <div className="w-7 sm:w-8 flex items-center justify-center font-bold text-slate-400">#{aIdx+1}</div>
                                                                    <textarea 
                                                                        value={ans.text} 
                                                                        placeholder="Answer"
                                                                        rows={2}
                                                                        onChange={(e) => handleChange(prev => {
                                                                            const newQuestions = [...prev.questions];
                                                                            const newAnswers = [...(newQuestions[questionIndex].surveyAnswers || [])];
                                                                            // Ensure array size
                                                                            while(newAnswers.length <= aIdx) newAnswers.push({text:"", score:0});
                                                                            newAnswers[aIdx] = { ...newAnswers[aIdx], text: e.target.value };
                                                                            newQuestions[questionIndex].surveyAnswers = newAnswers;
                                                                            return {...prev, questions: newQuestions};
                                                                        })}
                                                                        className="w-full min-w-0 p-2 text-sm border border-slate-300 rounded leading-snug resize-none"
                                                                    />
                                                                    <input 
                                                                        type="number" 
                                                                        value={ans.score} 
                                                                        placeholder="Pts"
                                                                        onChange={(e) => handleChange(prev => {
                                                                            const newQuestions = [...prev.questions];
                                                                            const newAnswers = [...(newQuestions[questionIndex].surveyAnswers || [])];
                                                                            while(newAnswers.length <= aIdx) newAnswers.push({text:"", score:0});
                                                                            newAnswers[aIdx] = { ...newAnswers[aIdx], score: parseInt(e.target.value) || 0 };
                                                                            newQuestions[questionIndex].surveyAnswers = newAnswers;
                                                                            return {...prev, questions: newQuestions};
                                                                        })}
                                                                        className="w-16 sm:w-16 p-2 text-sm border border-slate-300 rounded text-center"
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* OPTIONS EDITOR (MC) */}
                                            {q.options && q.options.length > 0 && !isSurvey && (
                                                <div className="mt-4 pt-4 border-t border-slate-200 animate-fade-in">
                                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Multiple Choice Options</label>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {q.options.map((opt, optIdx) => (
                                                            <div key={optIdx} className="relative">
                                                                <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold bg-slate-100 px-1.5 py-0.5 rounded">{String.fromCharCode(65 + optIdx)}</span>
                                                                <input
                                                                    type="text"
                                                                    value={opt}
                                                                    onChange={(e) => handleChange(prev => {
                                                                        const newQuestions = [...prev.questions];
                                                                        const newOptions = [...(newQuestions[questionIndex].options || [])];
                                                                        newOptions[optIdx] = e.target.value;
                                                                        newQuestions[questionIndex].options = newOptions;
                                                                        return {...prev, questions: newQuestions};
                                                                    })}
                                                                    className="w-full pl-10 p-2 rounded border border-slate-300 text-sm outline-none focus:border-brand-blue"
                                                                    placeholder={`Option ${optIdx + 1}`}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )})}
                                </div>

                                <div className="flex items-center justify-center gap-2 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center"
                                    >
                                        <ChevronLeft size={14} className="mr-1" /> Prev
                                    </button>
                                    <span className="text-xs font-bold text-slate-600">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center"
                                    >
                                        Next <ChevronRight size={14} className="ml-1" />
                                    </button>
                                </div>
                                
                                <button 
                                    onClick={addQuestion}
                                    className="mt-8 w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:border-sky-400 hover:text-sky-600 transition-colors flex items-center justify-center cursor-pointer"
                                >
                                    <Plus size={20} className="mr-2" /> Add New Question Pair
                                </button>
                            </div>
                        )}
                </div>
            </div>

            {/* AI Prompt Info Modal */}
            {showAiPrompt && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full relative animate-slide-up border border-indigo-100">
                        <button onClick={() => setShowAiPrompt(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                            <X size={24} />
                        </button>
                        <div className="flex items-center mb-6">
                            <div className="bg-indigo-100 p-3 rounded-full mr-4 text-indigo-600">
                                <Sparkles size={24} />
                            </div>
                            <h2 className="font-display text-2xl font-bold text-slate-800">AI Generation Info</h2>
                        </div>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Original Topic</label>
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 font-medium">
                                    {editedGame.config.topic || "N/A (Jeopardy/Pub Quiz Mode)"}
                                </div>
                            </div>
                            
                            <div className="relative">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex justify-between items-center">
                                    Custom Instructions
                                    <button 
                                        onClick={handleCopyInstructions}
                                        className="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold flex items-center"
                                        title="Copy Instructions"
                                    >
                                        <Copy size={12} className="mr-1" /> Copy
                                    </button>
                                </label>
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 text-sm min-h-[80px]">
                                    {editedGame.config.customInstructions || <span className="italic text-slate-400">No custom instructions provided.</span>}
                                </div>
                                {showCopyToast && (
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg flex items-center gap-1.5 animate-fade-in z-[110]">
                                        <CheckCircle size={12} className="text-green-400" /> Instructions Copied!
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-center pt-2 text-xs text-slate-400">
                                <div className="flex items-center">
                                    <FileText size={14} className="mr-1" />
                                    <span>Questions: {editedGame.config.questionCount || 'Auto'}</span>
                                </div>
                                <div className="uppercase font-bold tracking-wider">Generated by AI</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
