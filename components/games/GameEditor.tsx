
import React, { useState, useEffect } from 'react';
import { GameType, GeneratedGame } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useUnsavedChanges } from '../../contexts/UnsavedChangesContext';
import { saveGameToLibrary } from '../../utils/gameUtils';
import { Save, Play, Check, AlertCircle } from 'lucide-react';

interface GameEditorProps {
    game: GeneratedGame;
    onSave: (g: GeneratedGame) => void;
    onPlay: (g: GeneratedGame) => void;
}

export const GameEditor: React.FC<GameEditorProps> = ({ game, onSave, onPlay }) => {
    const [editedGame, setEditedGame] = useState<GeneratedGame>(game);
    const [activeTab, setActiveTab] = useState<number>(0);
    const { user } = useAuth();
    const { setIsDirty } = useUnsavedChanges();
    
    // Save button state
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    // Mark as dirty when game changes
    useEffect(() => {
        // Don't mark as dirty on initial mount, only on subsequent updates
    }, [editedGame]);

    const handleSave = () => {
        if (!user) {
            alert('Please log in to save games to your profile.');
            return;
        }
        
        setSaveStatus('saving');
        setTimeout(() => {
            const success = saveGameToLibrary(editedGame);
            if (success) {
                setSaveStatus('saved');
                setIsDirty(false);
                onSave(editedGame);
                // Reset back to idle after a delay
                setTimeout(() => setSaveStatus('idle'), 2000);
            } else {
                setSaveStatus('idle');
                alert("Failed to save. Please try again.");
            }
        }, 800); // Fake network delay for UX
    };

    const handlePlay = () => {
        onPlay(editedGame);
    };

    const handleChange = (updater: (prev: GeneratedGame) => GeneratedGame) => {
        setEditedGame(updater);
        setIsDirty(true);
        setSaveStatus('idle');
    };

    // Jeopardy Editing
    if (editedGame.config.type === GameType.JEOPARDY && editedGame.jeopardyBoard) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8 relative z-0">
                 <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                    <h1 className="font-display text-3xl font-bold text-slate-800 truncate w-full md:w-auto">Editor: {editedGame.title}</h1>
                    <div className="flex gap-3 w-full md:w-auto">
                        <button 
                            onClick={handleSave} 
                            disabled={saveStatus === 'saving'}
                            className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-bold flex items-center justify-center transition-all shadow-sm border
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
                            className="flex-1 md:flex-none px-8 py-3 bg-brand-yellow text-slate-900 font-bold rounded-xl shadow-md hover:bg-yellow-300 flex items-center justify-center hover:scale-105 transition-transform"
                        >
                            <Play size={18} className="mr-2" /> Play
                        </button>
                    </div>
                 </div>
                 
                 {!user && (
                    <div className="mb-6 bg-sky-50 p-4 rounded-xl flex items-center text-sky-800 text-sm border border-sky-100">
                        <AlertCircle size={16} className="mr-2" />
                        <span>You are editing as a guest. Log in to save this game permanently to your profile.</span>
                    </div>
                 )}

                 <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                    {/* Category Tabs */}
                    <div className="flex overflow-x-auto bg-slate-100 border-b border-slate-200 no-scrollbar">
                        {editedGame.jeopardyBoard.map((cat, idx) => (
                            <button 
                                key={idx}
                                onClick={() => setActiveTab(idx)}
                                className={`px-6 py-4 font-bold text-sm whitespace-nowrap transition-colors min-w-[120px]
                                    ${activeTab === idx 
                                        ? 'bg-white text-sky-600 border-t-2 border-t-sky-600 shadow-sm relative z-10' 
                                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
                            >
                                {cat.name || `Category ${idx + 1}`}
                            </button>
                        ))}
                    </div>

                    <div className="p-6">
                        {/* Edit Category Name */}
                        <div className="mb-8">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Current Category Name</label>
                            <input 
                                type="text" 
                                value={editedGame.jeopardyBoard[activeTab].name} 
                                onChange={(e) => handleChange(prev => {
                                    const newBoard = [...prev.jeopardyBoard!];
                                    newBoard[activeTab].name = e.target.value;
                                    return {...prev, jeopardyBoard: newBoard};
                                })}
                                className="w-full p-4 text-xl font-bold border border-slate-200 rounded-lg focus:border-brand-blue focus:ring-2 focus:ring-sky-100 outline-none transition-all"
                            />
                        </div>

                        {/* Questions Table */}
                        <div className="space-y-6">
                            {editedGame.jeopardyBoard[activeTab].questions.map((q, qIdx) => (
                                <div key={qIdx} className="bg-slate-50 p-6 rounded-xl border border-slate-200 hover:border-sky-200 transition-colors">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="font-bold text-sky-700 bg-sky-100 px-3 py-1 rounded-full text-sm">{q.points} Points</span>
                                        <span className="text-xs text-slate-400">Question #{qIdx + 1}</span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Question / Clue</label>
                                            <textarea 
                                                value={q.question}
                                                onChange={(e) => handleChange(prev => {
                                                    const newBoard = [...prev.jeopardyBoard!];
                                                    newBoard[activeTab].questions[qIdx].question = e.target.value;
                                                    return {...prev, jeopardyBoard: newBoard};
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
                                                    const newBoard = [...prev.jeopardyBoard!];
                                                    newBoard[activeTab].questions[qIdx].answer = e.target.value;
                                                    return {...prev, jeopardyBoard: newBoard};
                                                })}
                                                className="w-full p-3 rounded-lg border border-slate-300 text-sm h-28 resize-none focus:ring-2 focus:ring-green-200 outline-none transition-all"
                                                placeholder="Enter the answer here..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                 </div>
            </div>
        );
    }

    // Standard Game Editing
    return (
        <div className="p-12 text-center max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">Standard Game Editor</h2>
                <p className="text-slate-500 mb-8">We are currently polishing the editor for non-Jeopardy games. It will be available in the next update!</p>
                <button onClick={handlePlay} className="w-full bg-brand-yellow px-6 py-4 rounded-xl font-bold text-slate-900 hover:bg-yellow-300 transition-colors shadow-md">
                    Play Generated Game Now
                </button>
            </div>
        </div>
    );
};
