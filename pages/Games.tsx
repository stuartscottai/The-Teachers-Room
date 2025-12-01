
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { GameType, GeneratedGame, GameRunOptions } from '../types';
import { Dice5, Target, Grid, HelpCircle, Sparkles, ArrowLeft, BookOpen, LogIn, Trash2, Beer } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUnsavedChanges } from '../contexts/UnsavedChangesContext';
import { getSavedGames, deleteSavedGame } from '../utils/gameUtils';

// Import Modular Components
import { JeopardyGame } from '../components/games/JeopardyGame';
import { TriviaGame } from '../components/games/TriviaGame';
import { PubQuizGame } from '../components/games/PubQuizGame';
import { GameEditor } from '../components/games/GameEditor';
import { GameConfigurator, ModeSelector } from '../components/games/GameConfigurator';
import { GameSetup } from '../components/games/GameSetup';

// 1. Game Hub Selection
const GameHub: React.FC<{ onSelect: (type: GameType) => void, onViewLibrary: () => void }> = ({ onSelect, onViewLibrary }) => {
    const { user } = useAuth();
    const games = [
        { type: GameType.SNAKES_LADDERS, icon: <Dice5 size={40} />, desc: "Classic board game fun with a learning twist." },
        { type: GameType.TRIVIA, icon: <HelpCircle size={40} />, desc: "Fast-paced questions to test knowledge." },
        { type: GameType.JEOPARDY, icon: <Grid size={40} />, desc: "Strategic team quiz based on categories." },
        { type: GameType.PUB_QUIZ, icon: <Beer size={40} />, desc: "Round-based quiz with manual scoring." },
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
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        setLoading(true);
        // Async Fetch
        getSavedGames(user?.id).then(games => {
            setSavedGames(games);
            setLoading(false);
        });
    }, [user?.id]);

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.preventDefault(); 
        e.stopPropagation(); 
        if (window.confirm("Are you sure you want to delete this game?")) {
            deleteSavedGame(id, user?.id).then(() => {
                setSavedGames(prev => prev.filter(g => g.id !== id));
            });
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

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-12 text-center">
                <button onClick={onBack} className="flex items-center text-slate-500 hover:text-sky-600 mb-8">
                    <ArrowLeft size={18} className="mr-2" /> Back to Hub
                </button>
                <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p>Loading your library...</p>
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
                        <div key={game.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 p-6 relative group cursor-pointer" onClick={() => onLoadGame(game)}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-sky-50 text-sky-700 px-3 py-1 rounded-full text-xs font-bold uppercase">
                                    {game.config.type}
                                </div>
                                <button 
                                    onClick={(e) => handleDelete(game.id!, e)}
                                    className="text-slate-300 hover:text-red-500 p-2 -mr-2 -mt-2 rounded-full hover:bg-red-50 transition-colors z-10"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                            <h3 className="font-bold text-xl text-slate-800 mb-2 line-clamp-1">{game.title}</h3>
                            <p className="text-slate-500 text-sm mb-6">
                                Created: {new Date(game.createdAt || Date.now()).toLocaleDateString()}
                            </p>
                            <div 
                                className="w-full py-3 text-center bg-white border-2 border-brand-yellow text-slate-800 font-bold rounded-lg group-hover:bg-brand-yellow transition-colors"
                            >
                                Open Game
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// 7. MAIN COMPONENT
export const Games: React.FC = () => {
    const [step, setStep] = useState<'hub' | 'mode' | 'config' | 'editor' | 'setup' | 'play' | 'library'>('hub');
    const [selectedType, setSelectedType] = useState<GameType | null>(null);
    const [creationMode, setCreationMode] = useState<'ai' | 'manual'>('ai');
    const [generatedGame, setGeneratedGame] = useState<GeneratedGame | null>(null);
    const [playOptions, setPlayOptions] = useState<GameRunOptions | null>(null);
    const [editorReturnStep, setEditorReturnStep] = useState<'config' | 'library' | 'hub'>('hub');

    const location = useLocation();
    const { setIsDirty, confirmAction } = useUnsavedChanges();

    // Check for navigation from Navbar "My Saved Games"
    useEffect(() => {
        if (location.state && location.state.view === 'library') {
            setIsDirty(false); 
            setStep('library');
        }
    }, [location, setIsDirty]);

    const handleSelect = (type: GameType) => {
        setSelectedType(type);
        setGeneratedGame(null); // Ensure fresh start for new game types
        if (type === GameType.JEOPARDY || type === GameType.TRIVIA || type === GameType.PUB_QUIZ) {
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
        setEditorReturnStep('config');
        setStep('editor');
        setIsDirty(true); // New game unsaved
    };

    const handleEditorSave = (updatedGame: GeneratedGame) => {
        setGeneratedGame(updatedGame);
    };

    const handleEditorPlay = (updatedGame: GeneratedGame) => {
        setGeneratedGame(updatedGame);
        setIsDirty(false); // Playing is fine, changes likely saved or user accepts loss
        // Move to Setup Screen first
        setStep('setup');
    };

    const handleGameStart = (options: GameRunOptions) => {
        setPlayOptions(options);
        setStep('play');
    };

    const handleLoadGame = (game: GeneratedGame) => {
        setGeneratedGame(game);
        // Determine type based on saved config
        setSelectedType(game.config.type);
        setEditorReturnStep('library');
        setStep('editor');
        setIsDirty(false); 
    };

    const handleBack = () => {
        const performBack = () => {
            setIsDirty(false);
            if (step === 'play') {
                setStep('setup');
            } else if (step === 'setup') {
                setStep('editor');
            } else if (step === 'editor') {
                setStep(editorReturnStep);
            } else if (step === 'config') {
                (selectedType === GameType.JEOPARDY || selectedType === GameType.TRIVIA || selectedType === GameType.PUB_QUIZ) ? setStep('mode') : setStep('hub');
            } else if (step === 'mode') {
                setStep('hub');
            } else if (step === 'library') {
                setStep('hub');
            } else {
                setStep('hub');
            }
        };

        if (step === 'editor') {
             // Use custom modal action
             confirmAction("Leave editor? Any unsaved changes will be lost.", performBack);
        } else {
            performBack();
        }
    };

    const handleGameEnd = () => {
        setStep('editor'); 
    };

    const handleReplay = () => {
        setIsDirty(false);
        setStep('setup');
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {step === 'hub' && <GameHub onSelect={handleSelect} onViewLibrary={() => setStep('library')} />}

            {step === 'library' && <LibraryView onBack={() => setStep('hub')} onLoadGame={handleLoadGame} />}
            
            {step === 'mode' && selectedType && (
                <ModeSelector type={selectedType} onBack={() => setStep('hub')} onModeSelect={handleModeSelect} />
            )}

            {step === 'config' && selectedType && (
                <GameConfigurator 
                    type={selectedType} 
                    mode={creationMode}
                    onBack={handleBack} 
                    onProceed={handleConfigProceed} 
                    initialConfig={generatedGame?.config}
                />
            )}
            
            {step === 'editor' && generatedGame && (
                <GameEditor 
                    game={generatedGame} 
                    onSave={handleEditorSave} 
                    onPlay={handleEditorPlay} 
                    onBack={handleBack}
                />
            )}

            {step === 'setup' && generatedGame && (
                <GameSetup 
                    game={generatedGame}
                    onBack={() => setStep('editor')}
                    onStart={handleGameStart}
                />
            )}

            {step === 'play' && generatedGame && playOptions && (
                selectedType === GameType.JEOPARDY ? (
                    <JeopardyGame 
                        game={generatedGame} 
                        options={playOptions}
                        onBack={handleGameEnd} 
                        onFinish={() => setStep('library')} 
                        onReplay={handleReplay}
                    />
                ) : selectedType === GameType.TRIVIA ? (
                    <TriviaGame 
                        game={generatedGame} 
                        options={playOptions}
                        onBack={handleGameEnd} 
                        onFinish={() => setStep('library')} 
                        onReplay={handleReplay}
                    />
                ) : selectedType === GameType.PUB_QUIZ ? (
                    <PubQuizGame 
                        game={generatedGame} 
                        options={playOptions}
                        onBack={handleGameEnd} 
                        onFinish={() => setStep('library')} 
                        onReplay={handleReplay}
                    />
                ) : (
                    <div className="max-w-6xl mx-auto px-4 py-12">
                         <div className="flex items-center justify-between mb-8">
                            <button onClick={handleGameEnd} className="flex items-center text-slate-500 hover:text-sky-600">
                                <ArrowLeft size={18} className="mr-2" /> Exit Game
                            </button>
                        </div>
                        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                            <div className="bg-slate-800 p-6 text-white">
                                <h1 className="text-2xl font-display font-bold">{generatedGame.title}</h1>
                            </div>
                            <div className="p-8 text-center text-slate-500">
                                Standard game mode under construction. Please try Jeopardy or Trivia!
                            </div>
                        </div>
                    </div>
                )
            )}
        </div>
    );
};
