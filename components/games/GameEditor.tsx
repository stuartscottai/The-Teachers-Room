import React, { useState } from 'react';
import { GameType, GeneratedGame } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { saveGameToLibrary } from '../../utils/gameUtils';
import { Save, Play } from 'lucide-react';

interface GameEditorProps {
    game: GeneratedGame;
    onSave: (g: GeneratedGame) => void;
    onPlay: (g: GeneratedGame) => void;
}

export const GameEditor: React.FC<GameEditorProps> = ({ game, onSave, onPlay }) => {
    const [editedGame, setEditedGame] = useState<GeneratedGame>(game);
    const [activeTab, setActiveTab] = useState<number>(0); // For Jeopardy: Category Index
    const { user } = useAuth();

    const handleSave = () => {
        if (!user) {
            alert('Please log in to save games to your profile.');
            return;
        }
        saveGameToLibrary(editedGame);
        onSave(editedGame);
    };

    const handlePlay = () => {
        // Auto save logic if user is logged in? Optional. 
        // For now just proceed.
        onPlay(editedGame);
    };

    // Jeopardy Editing
    if (editedGame.config.type === GameType.JEOPARDY && editedGame.jeopardyBoard) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                 <div className="flex items-center justify-between mb-6">
                    <h1 className="font-display text-3xl font-bold text-slate-800">Editor: {editedGame.title}</h1>
                    <div className="flex gap-3">
                        <button onClick={handleSave} className="px-4 py-2 bg-white border border-slate-300 rounded-lg flex items-center hover:bg-slate-50 shadow-sm">
                            <Save size={18} className="mr-2" /> {user ? 'Save to Profile' : 'Login to Save'}
                        </button>
                        <button onClick={handlePlay} className="px-6 py-2 bg-brand-yellow text-slate-900 font-bold rounded-lg shadow-md hover:bg-yellow-300 flex items-center">
                            <Play size={18} className="mr-2" /> Play Game
                        </button>
                    </div>
                 </div>

                 <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                    {/* Category Tabs */}
                    <div className="flex overflow-x-auto bg-slate-100 border-b border-slate-200">
                        {editedGame.jeopardyBoard.map((cat, idx) => (
                            <button 
                                key={idx}
                                onClick={() => setActiveTab(idx)}
                                className={`px-6 py-4 font-bold text-sm whitespace-nowrap transition-colors ${activeTab === idx ? 'bg-white text-sky-600 border-b-2 border-sky-600' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                {cat.name || `Category ${idx + 1}`}
                            </button>
                        ))}
                    </div>

                    <div className="p-6">
                        {/* Edit Category Name */}
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category Name</label>
                            <input 
                                type="text" 
                                value={editedGame.jeopardyBoard[activeTab].name} 
                                onChange={(e) => {
                                    const newBoard = [...editedGame.jeopardyBoard!];
                                    newBoard[activeTab].name = e.target.value;
                                    setEditedGame({...editedGame, jeopardyBoard: newBoard});
                                }}
                                className="w-full p-3 text-lg font-bold border-b-2 border-slate-200 focus:border-sky-500 outline-none"
                            />
                        </div>

                        {/* Questions Table */}
                        <div className="space-y-6">
                            {editedGame.jeopardyBoard[activeTab].questions.map((q, qIdx) => (
                                <div key={qIdx} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="font-bold text-sky-700 bg-sky-100 px-2 py-1 rounded text-sm">{q.points} Points</span>
                                        <div className="flex items-center space-x-2">
                                            <label className="flex items-center text-xs text-slate-500">
                                                <input 
                                                    type="checkbox" 
                                                    checked={q.isBonus}
                                                    onChange={(e) => {
                                                         const newBoard = [...editedGame.jeopardyBoard!];
                                                         newBoard[activeTab].questions[qIdx].isBonus = e.target.checked;
                                                         if(e.target.checked) newBoard[activeTab].questions[qIdx].bonusType = 'double';
                                                         else newBoard[activeTab].questions[qIdx].bonusType = 'none';
                                                         setEditedGame({...editedGame, jeopardyBoard: newBoard});
                                                    }}
                                                    className="mr-1"
                                                /> Bonus Tile
                                            </label>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Question / Clue</label>
                                            <textarea 
                                                value={q.question}
                                                onChange={(e) => {
                                                    const newBoard = [...editedGame.jeopardyBoard!];
                                                    newBoard[activeTab].questions[qIdx].question = e.target.value;
                                                    setEditedGame({...editedGame, jeopardyBoard: newBoard});
                                                }}
                                                className="w-full p-2 rounded border border-slate-300 text-sm h-24 resize-none focus:ring-2 focus:ring-sky-200 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Answer</label>
                                            <textarea 
                                                value={q.answer}
                                                onChange={(e) => {
                                                    const newBoard = [...editedGame.jeopardyBoard!];
                                                    newBoard[activeTab].questions[qIdx].answer = e.target.value;
                                                    setEditedGame({...editedGame, jeopardyBoard: newBoard});
                                                }}
                                                className="w-full p-2 rounded border border-slate-300 text-sm h-24 resize-none focus:ring-2 focus:ring-green-200 outline-none"
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

    // Standard Game Editing (Placeholder logic)
    return (
        <div className="p-8 text-center">
            <h2 className="text-xl font-bold">Standard Editor coming soon</h2>
            <button onClick={handlePlay} className="mt-4 bg-brand-yellow px-6 py-2 rounded font-bold">Play Now</button>
        </div>
    );
};
