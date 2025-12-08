
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { GameType, GeneratedGame, GameRunOptions } from '../types';
import { Dice5, Target, Grid, HelpCircle, Sparkles, BookOpen, LogIn, Trash2, Beer, DollarSign, Timer, List, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUnsavedChanges } from '../contexts/UnsavedChangesContext';
import { getSavedGames, deleteSavedGame, resolvePath } from '../utils/gameUtils';

// Import Modular Components
import { JeopardyGame } from '../components/games/JeopardyGame';
import { TriviaGame } from '../components/games/TriviaGame';
import { PubQuizGame } from '../components/games/PubQuizGame';
import { DartsGame } from '../components/games/DartsGame';
import { SnakesLaddersGame } from '../components/games/SnakesLaddersGame';
import { MillionaireGame } from '../components/games/MillionaireGame';
import { TimeBombGame } from '../components/games/TimeBombGame';
import { SurveyShowdownGame } from '../components/games/SurveyShowdownGame';
import { GameEditor } from '../components/games/GameEditor';
import { GameConfigurator, ModeSelector } from '../components/games/GameConfigurator';
import { GameSetup } from '../components/games/GameSetup';

// Robust Card Component handles Image Errors Gracefully
const GameCard: React.FC<{ 
    game: { type: GameType, icon: React.ReactNode, desc: string, image: string, color: string }, 
    onSelect: (type: GameType) => void 
}> = ({ game, onSelect }) => {
    const [imgError, setImgError] = useState(false);

    return (
        <button 
            onClick={() => onSelect(game.type)}
            className="group relative flex flex-col text-left bg-white rounded-2xl shadow-sm hover:shadow-xl border border-slate-200 transition-all duration-300 overflow-hidden h-full hover:-translate-y-1"
        >
            {/* Image Container */}
            <div className={`h-48 w-full relative overflow-hidden ${imgError ? game.color : 'bg-slate-100'}`}>
                {!imgError ? (
                    <img 
                        src={resolvePath(game.image)} 
                        alt={game.type}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    // Fallback State - Beautiful Gradient and Icon
                    <div className="w-full h-full flex flex-col items-center justify-center text-white/80 relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                        <div className="scale-150 mb-2 transform group-hover:scale-125 transition-transform duration-500">
                            {game.icon}
                        </div>
                    </div>
                )}

                {/* Decoration Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent opacity-80 transition-opacity" />
                
                {/* Floating Icon Badge (only show if image loaded to avoid double icon) */}
                {!imgError && (
                    <div className="absolute top-3 right-3 p-2 rounded-xl backdrop-blur-md bg-white/20 border border-white/30 text-white shadow-lg">
                        {game.icon}
                    </div>
                )}
                
                {/* Title Overlay */}
                <div className="absolute bottom-4 left-4 right-4">
                     <h3 className="font-display font-bold text-xl text-white mb-1 drop-shadow-md">{game.type}</h3>
                </div>
            </div>
            
            {/* Content Body */}
            <div className="p-6 flex-grow flex flex-col">
                <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-grow">{game.desc}</p>
                
                <div className="text-brand-blue font-bold text-sm flex items-center group-hover:translate-x-1 transition-transform mt-auto">
                    Create Game <ArrowRight size={16} className="ml-1" />
                </div>
            </div>
        </button>
    );
};

// 1. Game Hub Selection
const GameHub: React.FC<{ onSelect: (type: GameType) => void, onViewLibrary: () => void }> = ({ onSelect, onViewLibrary }) => {
    const { user } = useAuth();
    
    // Updated game list with relative image paths and color codes for fallbacks
    const games = [
        { 
            type: GameType.SNAKES_LADDERS, 
            icon: <Dice5 size={24} />, 
            desc: "Classic board game fun with a learning twist.",
            image: "assets/games/snakes.png",
            color: "bg-orange-500"
        },
        { 
            type: GameType.TRIVIA, 
            icon: <HelpCircle size={24} />, 
            desc: "Fast-paced questions to test knowledge.",
            image: "assets/games/trivia.png",
            color: "bg-purple-600"
        },
        { 
            type: GameType.JEOPARDY, 
            icon: <Grid size={24} />, 
            desc: "Strategic team quiz based on categories.",
            image: "assets/games/jeopardy.png",
            color: "bg-blue-600"
        },
        { 
            type: GameType.PUB_QUIZ, 
            icon: <Beer size={24} />, 
            desc: "Round-based quiz with manual scoring.",
            image: "assets/games/pubquiz.png",
            color: "bg-slate-700"
        },
        { 
            type: GameType.DARTS, 
            icon: <Target size={24} />, 
            desc: "Hit the target by answering correctly.",
            image: "assets/games/darts.png",
            color: "bg-red-600"
        },
        { 
            type: GameType.MILLIONAIRE, 
            icon: <DollarSign size={24} />, 
            desc: "Climb the ladder to win big.",
            image: "assets/games/millionaire.png",
            color: "bg-indigo-700"
        },
        { 
            type: GameType.TIME_BOMB, 
            icon: <Timer size={24} />, 
            desc: "Pass the bomb before time runs out!",
            image: "assets/games/timebomb.png",
            color: "bg-slate-900"
        },
        { 
            type: GameType.SURVEY_SHOWDOWN, 
            icon: <List size={24} />, 
            desc: "Guess top answers in this survey game!",
            image: "assets/games/survey.png",
            color: "bg-emerald-600"
        },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
                <div>
                    <h1 className="font-display text-4xl font-bold text-slate-800 mb-2">Game Library</h1>
                    <p className="text-slate-500 text-lg">Choose a template to start building your next lesson.</p>
                </div>
                <button 
                    onClick={onViewLibrary}
                    className="bg-white border-2 border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold hover:border-brand-yellow hover:bg-yellow-50 transition-colors flex items-center shadow-sm shrink-0"
                >
                    {user ? <BookOpen size={20} className="mr-2 text-brand-accent" /> : <LogIn size={20} className="mr-2 text-slate-400" />}
                    {user ? 'My Saved Games' : 'Log in to View Saved Games'}
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {games.map((game) => (
                    <GameCard key={game.type} game={game} onSelect={onSelect} />
                ))}
            </div>

            {/* AI Chatbot Teaser */}
            <div className="mt-20 bg-brand-blue rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between shadow-xl shadow-sky-100 overflow-hidden relative">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-yellow/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

                <div className="md:w-2/3 mb-8 md:mb-0 relative z-10">
                    <div className="inline-flex items-center bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-sky-100 text-xs font-bold uppercase tracking-wider mb-4 border border-white/20">
                        <Sparkles size={12} className="mr-2 text-brand-yellow" /> AI Assistant
                    </div>
                    <h3 className="font-display text-3xl font-bold text-white mb-4">
                        Can't decide? Let AI help you.
                    </h3>
                    <p className="text-sky-100 mb-8 text-lg max-w-xl leading-relaxed">
                        Describe your lesson topic, student level, or learning goals, and our AI will recommend the perfect game format and generate content for you instantly.
                    </p>
                    <button className="bg-white text-brand-blue px-8 py-4 rounded-xl font-bold hover:bg-sky-50 transition-colors shadow-lg flex items-center">
                        <Sparkles size={20} className="mr-2" /> Open AI Assistant
                    </button>
                </div>
                <div className="md:w-1/3 flex justify-center relative z-10">
                     <div className="relative">
                        <div className="absolute inset-0 bg-brand-yellow blur-[60px] opacity-40 rounded-full animate-pulse"></div>
                        <img src="https://picsum.photos/seed/robot/300/300" alt="AI Robot" className="rounded-2xl border-4 border-white/20 shadow-2xl relative z-10 w-64 h-64 object-cover" />
                     </div>
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
        if (type === GameType.JEOPARDY || type === GameType.TRIVIA || type === GameType.PUB_QUIZ || type === GameType.DARTS || type === GameType.MILLIONAIRE || type === GameType.TIME_BOMB || type === GameType.SURVEY_SHOWDOWN) {
             setStep('mode');
        } else {
             // Snakes usually AI preferred or direct config
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
        
        // Skip setup for Millionaire (standard rules)
        if (updatedGame.config.type === GameType.MILLIONAIRE) {
             setPlayOptions({
                 players: 1, // Single player focus
                 timerSeconds: 0,
                 enableBonuses: false,
                 strictMode: false,
                 muted: false
             });
             setStep('play');
        } else if (updatedGame.config.type === GameType.SURVEY_SHOWDOWN) {
             // Survey default options
             setPlayOptions({
                 players: 2, 
                 timerSeconds: 0, 
                 enableBonuses: false,
                 strictMode: false,
                 muted: false
             });
             setStep('setup');
        } else {
             setStep('setup');
        }
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
                if (selectedType === GameType.MILLIONAIRE) setStep('editor');
                else setStep('setup');
            } else if (step === 'setup') {
                setStep('editor');
            } else if (step === 'editor') {
                setStep(editorReturnStep);
            } else if (step === 'config') {
                (selectedType === GameType.JEOPARDY || selectedType === GameType.TRIVIA || selectedType === GameType.PUB_QUIZ || selectedType === GameType.DARTS || selectedType === GameType.MILLIONAIRE || selectedType === GameType.TIME_BOMB || selectedType === GameType.SURVEY_SHOWDOWN) ? setStep('mode') : setStep('hub');
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
        if (selectedType === GameType.MILLIONAIRE) {
             setStep('editor'); 
             setTimeout(() => setStep('play'), 50); 
        } else {
             setStep('setup');
        }
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
                ) : selectedType === GameType.DARTS ? (
                    <DartsGame
                        game={generatedGame}
                        options={playOptions}
                        onBack={handleGameEnd}
                        onFinish={() => setStep('library')}
                        onReplay={handleReplay}
                    />
                ) : selectedType === GameType.SNAKES_LADDERS ? (
                    <SnakesLaddersGame
                        game={generatedGame}
                        options={playOptions}
                        onBack={handleGameEnd}
                        onFinish={() => setStep('library')}
                        onReplay={handleReplay}
                    />
                ) : selectedType === GameType.MILLIONAIRE ? (
                    <MillionaireGame
                        game={generatedGame}
                        options={playOptions}
                        onBack={handleGameEnd}
                        onFinish={() => setStep('library')}
                        onReplay={handleReplay}
                    />
                ) : selectedType === GameType.TIME_BOMB ? (
                    <TimeBombGame
                        game={generatedGame}
                        options={playOptions}
                        onBack={handleGameEnd}
                        onFinish={() => setStep('library')}
                        onReplay={handleReplay}
                    />
                ) : selectedType === GameType.SURVEY_SHOWDOWN ? (
                    <SurveyShowdownGame
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
                                Standard game mode under construction.
                            </div>
                        </div>
                    </div>
                )
            )}
        </div>
    );
};
