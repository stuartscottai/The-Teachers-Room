import React, { useState, useEffect } from 'react';
import { GameType, GeneratedGame } from '../types';
import { Dice5, Target, Grid, HelpCircle, Sparkles, ArrowLeft, BookOpen, LogIn, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getSavedGames, deleteSavedGame } from '../utils/gameUtils';

// Import Modular Components
import { JeopardyGame } from '../components/games/JeopardyGame';
import { GameEditor } from '../components/games/GameEditor';
import { GameConfigurator, ModeSelector } from '../components/games/GameConfigurator';

// 1. Game Hub Selection
const GameHub: React.FC<{ onSelect: (type: GameType) => void, onViewLibrary: () => void }> = ({ onSelect, onViewLibrary }) => {
    const { user } = useAuth();
    const games = [
        { type: GameType.SNAKES_LADDERS, icon: <Dice5 size={40} />, desc: "Classic board game fun with a learning twist." },
        { type: GameType.TRIVIA, icon: <HelpCircle size={40} />, desc: "Fast-paced questions to test knowledge." },
        { type: GameType.JEOPARDY, icon: <Grid size={40} />, desc: "Strategic team quiz based on categories." },
        { type: GameType.DARTS, icon: <Target size={40} />, desc: "Hit the target by answering correctly." },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="font-display text-4xl font-bold text-slate-800 mb-2">Game Library</h1>
                    <p className="text-slate-500">Choose a game template to start building</p>
                </div>
                <button 
                    onClick={onViewLibrary}
                    className="bg-white border-2 border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold hover:border-brand-yellow hover:bg-yellow-50 transition-colors flex items-center shadow-sm"
                >
                    {user ? <BookOpen size={20} className="mr-2 text-brand-accent" /> : <LogIn size={20} className="mr-2 text-slate-400" />}
                    {user ? 'My Saved Games' : 'Log in to View Saved Games'}
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {games.map((game) => (
                    <button 
                        key={game.type}
                        onClick={() => onSelect(game.type)}
                        className="flex flex-col items-center p-8 bg-white rounded-2xl shadow-sm hover:shadow-xl border border-slate-100 transition-all transform hover:-translate-y-2 text-center group"
                    >
                        <div className="w-20 h-20 bg-brand-yellow rounded-full flex items-center justify-center mb-6 text-slate-800 group-hover:scale-110 transition-transform">
                            {game.icon}
                        </div>
                        <h3 className="font-display text-xl font-bold text-slate-800 mb-3">{game.type}</h3>
                        <p className="text-slate-500 text-sm">{game.desc}</p>
                    </button>
                ))}
            </div>

            {/* AI Chatbot Teaser */}
            <div className="mt-20 bg-brand-blue rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between shadow-xl shadow-sky-100">
                <div className="md:w-2/3 mb-8 md:mb-0">
                    <h3 className="font-display text-2xl font-bold text-white mb-4 flex items-center">
                        <Sparkles className="text-brand-yellow mr-2" /> Create with AI Assistant
                    </h3>
                    <p className="text-sky-50 mb-6">
                        Don't see what you need? Chat with our AI to build a completely custom game structure tailored to your specific lesson plan.
                    </p>
                    <div className="flex gap-2">
                        <input type="text" placeholder="Describe your game idea..." className="flex-1 p-3 rounded-lg border-0 focus:ring-2 focus:ring-brand-yellow outline-none text-slate-800 shadow-inner" />
                        <button className="bg-brand-yellow text-slate-900 px-6 py-3 rounded-lg font-bold hover:bg-yellow-300 transition-colors shadow-md">Generate</button>
                    </div>
                </div>
                <div className="md:w-1/3 flex justify-center">
                     <img src="https://picsum.photos/seed/robot/200/200" alt="AI Robot" className="rounded-full border-4 border-white/20 shadow-lg" />
                </div>
            </div>
        </div>
    );
};

// 2. Library View (Saved Games)
const LibraryView: React.FC<{ onBack: () => void, onLoadGame: (game: GeneratedGame) => void }> = ({ onBack, onLoadGame }) => {
    const [savedGames, setSavedGames] = useState<GeneratedGame[]>([]);
    const { user } = useAuth();

    useEffect(() => {
        setSavedGames(getSavedGames());
    }, []);

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this game?")) {
            deleteSavedGame(id);
            setSavedGames(prev => prev.filter(g => g.id !== id));
        }
    };

    if (!user) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-12 text-center">
                <button onClick={onBack} className="flex items-center text-slate-500 hover:text-sky-600 mb-8 mx-auto">
                    <ArrowLeft size={18} className="mr-2" /> Back to Hub
                </button>
                <div className="bg-white p-12 rounded-3xl shadow-lg border border-slate-100">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <LogIn size={40} className="text-slate-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Please Log In</h2>
                    <p className="text-slate-500 mb-6">You need to be logged in to view your saved games library.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-12">
            <button onClick={onBack} className="flex items-center text-slate-500 hover:text-sky-600 mb-8">
                <ArrowLeft size={18} className="mr-2" /> Back to Hub
            </button>
            
            <h1 className="font-display text-3xl font-bold text-slate-800 mb-8">My Saved Games</h1>
            
            {savedGames.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 border-dashed">
                    <p className="text-slate-400 text-lg">No games saved yet.</p>
                    <p className="text-slate-400 text-sm mt-2">Create a game and click "Save to Profile"!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {savedGames.map((game) => (
                        <div key={game.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 p-6 relative group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-sky-50 text-sky-700 px-3 py-1 rounded-full text-xs font-bold uppercase">
                                    {game.config.type}
                                </div>
                                <button 
                                    onClick={(e) => handleDelete(game.id!, e)}
                                    className="text-slate-300 hover:text-red-500 p-1 rounded transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                            <h3 className="font-bold text-xl text-slate-800 mb-2 line-clamp-1">{game.title}</h3>
                            <p className="text-slate-500 text-sm mb-6">
                                Created: {new Date(game.createdAt || Date.now()).toLocaleDateString()}
                            </p>
                            <button 
                                onClick={() => onLoadGame(game)}
                                className="w-full py-3 bg-white border-2 border-brand-yellow text-slate-800 font-bold rounded-lg hover:bg-brand-yellow transition-colors"
                            >
                                Open Game
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// 7. MAIN COMPONENT
export const Games: React.FC = () => {
    const [step, setStep] = useState<'hub' | 'mode' | 'config' | 'editor' | 'play' | 'library'>('hub');
    const [selectedType, setSelectedType] = useState<GameType | null>(null);
    const [creationMode, setCreationMode] = useState<'ai' | 'manual'>('ai');
    const [generatedGame, setGeneratedGame] = useState<GeneratedGame | null>(null);

    const handleSelect = (type: GameType) => {
        setSelectedType(type);
        if (type === GameType.JEOPARDY) {
             setStep('mode');
        } else {
             setCreationMode('ai');
             setStep('config');
        }
    };

    const handleModeSelect = (mode: 'ai' | 'manual') => {
        setCreationMode(mode);
        setStep('config');
    };

    const handleConfigProceed = (game: GeneratedGame) => {
        setGeneratedGame(game);
        setStep('editor');
    };

    const handleEditorSave = (updatedGame: GeneratedGame) => {
        setGeneratedGame(updatedGame);
    };

    const handleEditorPlay = (updatedGame: GeneratedGame) => {
        setGeneratedGame(updatedGame);
        setStep('play');
    };

    const handleLoadGame = (game: GeneratedGame) => {
        setGeneratedGame(game);
        setStep('editor');
    };

    const handleBack = () => {
        if (step === 'play') {
            // Logic handled by in-game modal now, this is fallback or confirmed action
            setStep('editor');
        } else if (step === 'editor') {
            // If viewing a saved game, simpler to go back to library, else config
            // For simplicity now, go to Hub to be safe, or previous step if tracked.
            setStep('hub');
        } else if (step === 'config') {
            selectedType === GameType.JEOPARDY ? setStep('mode') : setStep('hub');
        } else if (step === 'mode') {
            setStep('hub');
        } else if (step === 'library') {
            setStep('hub');
        } else {
            setStep('hub');
        }
    };

    const handleGameEnd = () => {
        setStep('editor'); 
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {step === 'hub' && <GameHub onSelect={handleSelect} onViewLibrary={() => setStep('library')} />}

            {step === 'library' && <LibraryView onBack={handleBack} onLoadGame={handleLoadGame} />}
            
            {step === 'mode' && selectedType && (
                <ModeSelector type={selectedType} onBack={handleBack} onModeSelect={handleModeSelect} />
            )}

            {step === 'config' && selectedType && (
                <GameConfigurator 
                    type={selectedType} 
                    mode={creationMode}
                    onBack={handleBack} 
                    onProceed={handleConfigProceed} 
                />
            )}
            
            {step === 'editor' && generatedGame && (
                <GameEditor 
                    game={generatedGame} 
                    onSave={handleEditorSave} 
                    onPlay={handleEditorPlay} 
                />
            )}

            {step === 'play' && generatedGame && (
                selectedType === GameType.JEOPARDY ? (
                    <JeopardyGame game={generatedGame} onBack={handleBack} onFinish={handleGameEnd} />
                ) : (
                    <div className="max-w-6xl mx-auto px-4 py-12">
                         <div className="flex items-center justify-between mb-8">
                            <button onClick={handleBack} className="flex items-center text-slate-500 hover:text-sky-600">
                                <ArrowLeft size={18} className="mr-2" /> Exit Game
                            </button>
                        </div>
                        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                            <div className="bg-slate-800 p-6 text-white">
                                <h1 className="text-2xl font-display font-bold">{generatedGame.title}</h1>
                            </div>
                            <div className="p-8 text-center text-slate-500">
                                Standard game mode under construction. Please try Jeopardy!
                            </div>
                        </div>
                    </div>
                )
            )}
        </div>
    );
};
