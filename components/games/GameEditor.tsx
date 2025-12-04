import React, { useState, useEffect } from 'react';
import { GameType, GeneratedGame } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useUnsavedChanges } from '../../contexts/UnsavedChangesContext';
import { saveGameToLibrary } from '../../utils/gameUtils';
import { Save, Play, Check, AlertCircle, Plus, Trash2, Coins, ArrowLeft, Layers, List } from 'lucide-react';

interface GameEditorProps {
    game: GeneratedGame;
    onSave: (g: GeneratedGame) => void;
    onPlay: (g: GeneratedGame) => void;
    onBack: () => void;
}

export const GameEditor: React.FC<GameEditorProps> = ({ game, onSave, onPlay, onBack }) => {
    const [editedGame, setEditedGame] = useState<GeneratedGame>(game);
    const [activeTab, setActiveTab] = useState<number>(0);
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

    useEffect(() => {
    }, [editedGame]);

    const handleSave = async () => {
        if (!user) {
            alert('Please log in to save games to your profile.');
            return;
        }
        setSaveStatus('saving');
        
        // Async save
        const success = await saveGameToLibrary(editedGame, user.id);
        
        if (success) {
            setSaveStatus('saved');
            setIsDirty(false);
            onSave(editedGame);
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
                    difficulty: prev.config.type === GameType.DARTS ? 'easy' : undefined
                }
            ]
        }));
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

    // For Darts, we hide the reserve questions in the editor view (but keep them in data)
    // The main questions are indices 0 to config.questionCount - 1
    const displayQuestions = (editedGame.config.type === GameType.DARTS) 
        ? editedGame.questions.slice(0, editedGame.config.questionCount) 
        : editedGame.questions;

    return (
        <div className="fixed inset-0 top-16 bg-slate-50 z-40 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-7xl mx-auto px-4 py-8 relative z-20">
                        <div className="flex flex-col gap-4 mb-6">
                            <button 
                                onClick={onBack}
                                className="self-start text-slate-500 hover:text-sky-600 flex items-center font-bold text-sm transition-colors cursor-pointer bg-slate-50 hover:bg-white px-3 py-2 rounded-lg border border-transparent hover:border-slate-200"
                            >
                                <ArrowLeft size={18} className="mr-1" /> Back to Config
                            </button>
                            
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <h1 className="font-display text-3xl font-bold text-slate-800 truncate w-full md:w-auto">Editor: {editedGame.title}</h1>
                                <div className="flex gap-3 w-full md:w-auto">
                                    <button 
                                        onClick={handleSave} 
                                        disabled={saveStatus === 'saving'}
                                        className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-bold flex items-center justify-center transition-all shadow-sm border cursor-pointer
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
                                        className="flex-1 md:flex-none px-8 py-3 bg-brand-yellow text-slate-900 font-bold rounded-xl shadow-md hover:bg-yellow-300 flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
                                    >
                                        <Play size={18} className="mr-2" /> Play
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        {!user && (
                        <div className="mb-6 bg-sky-50 p-4 rounded-xl flex items-center text-sky-800 text-sm border border-sky-100">
                            <AlertCircle size={16} className="mr-2" />
                            <span>You are editing as a guest. Log in to save this game permanently to your profile.</span>
                        </div>
                        )}

                        {/* GROUPED EDITOR (JEOPARDY / PUB QUIZ) */}
                        {isGrouped && groups ? (
                            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                                {/* Tabs */}
                                <div className="flex overflow-x-auto bg-slate-100 border-b border-slate-200 no-scrollbar">
                                    {groups.map((cat, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={() => setActiveTab(idx)}
                                            className={`px-6 py-4 font-bold text-sm whitespace-nowrap transition-colors min-w-[120px] cursor-pointer
                                                ${activeTab === idx 
                                                    ? 'bg-white text-sky-600 border-t-2 border-t-sky-600 shadow-sm relative z-10' 
                                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
                                        >
                                            {cat.name || `${groupLabel} ${idx + 1}`}
                                        </button>
                                    ))}
                                </div>

                                <div className="p-6">
                                    <div className="mb-8">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Current {groupLabel} Name</label>
                                        <input 
                                            type="text" 
                                            value={groups[activeTab].name} 
                                            onChange={(e) => handleChange(prev => {
                                                const newGroups = editedGame.config.type === GameType.JEOPARDY ? [...prev.jeopardyBoard!] : [...prev.pubQuizRounds!];
                                                newGroups[activeTab].name = e.target.value;
                                                return editedGame.config.type === GameType.JEOPARDY 
                                                    ? {...prev, jeopardyBoard: newGroups} 
                                                    : {...prev, pubQuizRounds: newGroups};
                                            })}
                                            className="w-full p-4 text-xl font-bold border border-slate-200 rounded-lg focus:border-brand-blue focus:ring-2 focus:ring-sky-100 outline-none transition-all"
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
                                                                newGroups[activeTab].questions[qIdx].question = e.target.value;
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
                                                                newGroups[activeTab].questions[qIdx].answer = e.target.value;
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
                                                                            const newOptions = [...(newGroups[activeTab].questions[qIdx].options || [])];
                                                                            newOptions[optIdx] = e.target.value;
                                                                            newGroups[activeTab].questions[qIdx].options = newOptions;
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
                            // STANDARD EDITOR (Trivia, Snakes, Darts, etc.)
                            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden p-6">
                                <div className="space-y-6">
                                    {displayQuestions.map((q, index) => (
                                        <div key={index} className="bg-slate-50 p-6 rounded-xl border border-slate-200 relative hover:border-sky-200 transition-colors">
                                            <button 
                                                onClick={() => removeQuestion(index)}
                                                className="absolute top-4 right-4 text-slate-300 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                                                title="Delete Question"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                            <div className="flex items-center justify-between mb-4 pr-10">
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-slate-200 text-slate-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                                                        {index + 1}
                                                    </span>
                                                    
                                                    {/* Points Editor (If not Darts - Darts points are dynamic) */}
                                                    {editedGame.config.type !== GameType.DARTS && (
                                                        <div className="flex items-center ml-2 bg-white px-2 py-1 rounded border border-slate-200">
                                                            <Coins size={14} className="text-brand-yellow mr-2" />
                                                            <input 
                                                                type="number"
                                                                value={q.points}
                                                                onChange={(e) => handleChange(prev => {
                                                                    const newQuestions = [...prev.questions];
                                                                    newQuestions[index].points = parseInt(e.target.value) || 0;
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
                                                                onChange={(e) => updateQuestionDifficulty(index, e.target.value)}
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

                                            {/* QUESTION TYPE TOGGLE BAR */}
                                            <div className="flex flex-wrap items-center gap-4 mb-4 bg-slate-100 p-2 rounded-lg border border-slate-200">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Format:</span>
                                                    <div className="flex bg-white rounded border border-slate-200 overflow-hidden shadow-sm">
                                                        <button 
                                                            onClick={() => updateQuestionType(index, 'open')}
                                                            className={`px-3 py-1 text-xs font-bold transition-colors ${!q.options || q.options.length === 0 ? 'bg-brand-blue text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                                                        >
                                                            Open
                                                        </button>
                                                        <button 
                                                            onClick={() => updateQuestionType(index, 'multiple-choice')}
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
                                                                    onClick={() => updateQuestionOptionCount(index, num)}
                                                                    className={`px-3 py-1 text-xs font-bold transition-colors ${q.options!.length === num ? 'bg-brand-yellow text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}
                                                                >
                                                                    {num}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Question</label>
                                                    <textarea 
                                                        value={q.question}
                                                        onChange={(e) => handleChange(prev => {
                                                            const newQuestions = [...prev.questions];
                                                            newQuestions[index].question = e.target.value;
                                                            return {...prev, questions: newQuestions};
                                                        })}
                                                        className="w-full p-3 rounded-lg border border-slate-300 text-sm h-24 resize-none focus:ring-2 focus:ring-sky-200 outline-none"
                                                        placeholder="Type question here..."
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Answer</label>
                                                    <textarea 
                                                        value={q.answer}
                                                        onChange={(e) => handleChange(prev => {
                                                            const newQuestions = [...prev.questions];
                                                            newQuestions[index].answer = e.target.value;
                                                            return {...prev, questions: newQuestions};
                                                        })}
                                                        className="w-full p-3 rounded-lg border border-slate-300 text-sm h-24 resize-none focus:ring-2 focus:ring-green-200 outline-none"
                                                        placeholder="Type answer here..."
                                                    />
                                                </div>
                                            </div>

                                            {/* OPTIONS EDITOR FOR STANDARD GAMES */}
                                            {q.options && q.options.length > 0 && (
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
                                                                        const newOptions = [...(newQuestions[index].options || [])];
                                                                        newOptions[optIdx] = e.target.value;
                                                                        newQuestions[index].options = newOptions;
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
                                    ))}
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
        </div>
    );
};
