
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { GameType, GeneratedGame, GameRunOptions } from '../types';
import { Dice5, Target, Grid, HelpCircle, Sparkles, BookOpen, LogIn, Trash2, Beer, DollarSign, Timer, List, ArrowRight, ArrowLeft, Search, Play, Globe, Filter, SortAsc, SortDesc, ChevronLeft, ChevronRight, HardDrive, Cloud, User, RefreshCw, AlertTriangle, Library, Plus, Copy, Layers, PenTool, Flame } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUnsavedChanges } from '../contexts/UnsavedChangesContext';
import { getSavedGames, deleteSavedGame, getCommunityGames, getLocalGames } from '../utils/gameUtils';

// Import Modular Components
import { JeopardyGame } from '../components/games/JeopardyGame';
import { TriviaGame } from '../components/games/TriviaGame';
import { PubQuizGame } from '../components/games/PubQuizGame';
import { DartsGame } from '../components/games/DartsGame';
import { SnakesLaddersGame } from '../components/games/SnakesLaddersGame';
import { MillionaireGame } from '../components/games/MillionaireGame';
import { TimeBombGame } from '../components/games/TimeBombGame';
import { SurveyShowdownGame } from '../components/games/SurveyShowdownGame';
import { StopTheFireGame } from '../components/games/StopTheFireGame';
import { WordWheelGame } from '../components/games/WordWheelGame';
import { GameEditor } from '../components/games/GameEditor';
import { GameConfigurator, ModeSelector } from '../components/games/GameConfigurator';
import { GameSetup } from '../components/games/GameSetup';
import { AiAssistantChat } from '../components/games/AiAssistantChat';
import { Avatar } from '../components/Avatar';

// Helper to extract stats for display
const getGameStats = (game: GeneratedGame) => {
    const type = game.config.type;
    const stats = [];

    // Counts
    if (type === GameType.JEOPARDY) {
        const cats = game.jeopardyBoard?.length || 0;
        const qs = game.jeopardyBoard?.reduce((acc: number, cat: any) => acc + (cat.questions?.length || 0), 0) || 0;
        stats.push({ label: 'Cats', value: cats, icon: <Grid size={12} /> });
        stats.push({ label: 'Qs', value: qs, icon: <HelpCircle size={12} /> });
    } else if (type === GameType.PUB_QUIZ) {
        const rounds = game.pubQuizRounds?.length || 0;
        const qs = game.pubQuizRounds?.reduce((acc: number, rnd: any) => acc + (rnd.questions?.length || 0), 0) || 0;
        stats.push({ label: 'Rounds', value: rounds, icon: <Layers size={12} /> });
        stats.push({ label: 'Qs', value: qs, icon: <HelpCircle size={12} /> });
    } else if (type === GameType.SURVEY_SHOWDOWN) {
        const rounds = game.questions?.length || 0;
        stats.push({ label: 'Rounds', value: rounds, icon: <List size={12} /> });
    } else if (type === GameType.STOP_THE_FIRE) {
        const cats = game.stopTheFireCategories?.length || game.config.stopTheFireCategories?.length || 0;
        stats.push({ label: 'Cats', value: cats, icon: <List size={12} /> });
    } else if (type === GameType.WORD_WHEEL) {
        const count = game.questions?.length || 0;
        stats.push({ label: 'Letters', value: count, icon: <RefreshCw size={12} /> });
    } else {
        const count = game.questions?.length || 0;
        stats.push({ label: 'Qs', value: count, icon: <HelpCircle size={12} /> });
    }

    // Type Detail
    if (game.config.questionType === 'multiple-choice') {
         stats.push({ label: 'MC', value: '', icon: <List size={12} /> });
    }

    return stats;
};

// Robust Card Component handles Image Errors Gracefully
const GameCard: React.FC<{ 
    game: { type: GameType, icon: React.ReactNode, desc: string, image: string, color: string }, 
    onSelect: (type: GameType) => void 
}> = ({ game, onSelect }) => {
    const [hasError, setHasError] = useState(false);

    return (
        <button 
            onClick={() => onSelect(game.type)}
            className="group relative flex flex-col text-left bg-white rounded-2xl shadow-sm hover:shadow-xl border border-slate-200 transition-all duration-300 overflow-hidden h-full hover:-translate-y-1"
        >
            {/* Image Container */}
            <div className={`h-48 w-full relative overflow-hidden ${hasError ? game.color : 'bg-slate-100'}`}>
                <img 
                    crossOrigin="anonymous"
                    src={game.image} 
                    alt={game.type}
                    className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${hasError ? 'hidden' : 'block'}`}
                    onError={() => setHasError(true)}
                />
                
                {hasError && (
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
                {!hasError && (
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

// Icons Helper
const getIcon = (type: string) => {
    switch(type) {
        case GameType.JEOPARDY: return <Grid size={18} />;
        case GameType.TRIVIA: return <HelpCircle size={18} />;
        case GameType.PUB_QUIZ: return <Beer size={18} />;
        case GameType.MILLIONAIRE: return <DollarSign size={18} />;
        case GameType.DARTS: return <Target size={18} />;
        case GameType.TIME_BOMB: return <Timer size={18} />;
        case GameType.SURVEY_SHOWDOWN: return <List size={18} />;
        case GameType.STOP_THE_FIRE: return <Flame size={18} />;
        case GameType.WORD_WHEEL: return <RefreshCw size={18} />;
        default: return <Dice5 size={18} />;
    }
};

// --- PERSONAL LIBRARY COMPONENT ---
const PersonalLibrary: React.FC<{ onLoadGame: (game: GeneratedGame) => void }> = ({ onLoadGame }) => {
    const { user } = useAuth();
    const [games, setGames] = useState<GeneratedGame[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [sourceFilter, setSourceFilter] = useState<'all' | 'ai' | 'manual'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const pageSizeOptions = [10, 20, 30, 40, 50];

    const loadGames = async () => {
        setLoading(true);
        const data = await getSavedGames(user?.id);
        setGames(data);
        setLoading(false);
    };

    useEffect(() => {
        loadGames();
    }, [user]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, typeFilter, sortBy, sourceFilter, itemsPerPage]);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if(window.confirm("Are you sure you want to delete this game?")) {
            await deleteSavedGame(id, user?.id);
            loadGames();
        }
    };

    // Client-side Filtering & Sorting
    const filteredGames = games.filter(g => {
        // Search
        if (search) {
            const term = search.toLowerCase();
            const matchesTitle = g.title.toLowerCase().includes(term);
            const matchesTopic = g.config.topic?.toLowerCase().includes(term);
            if (!matchesTitle && !matchesTopic) return false;
        }

        // Type
        if (typeFilter !== 'all' && g.config.type !== typeFilter) return false;

        // Source
        if (sourceFilter === 'ai' && !g.config.isAI) return false;
        if (sourceFilter === 'manual' && g.config.isAI) return false;

        return true;
    }).sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        if (sortBy === 'oldest') return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        if (sortBy === 'az') return a.title.localeCompare(b.title);
        if (sortBy === 'za') return b.title.localeCompare(a.title);
        return 0;
    });

    const totalPages = Math.max(1, Math.ceil(filteredGames.length / itemsPerPage));
    const pageStart = (currentPage - 1) * itemsPerPage;
    const pageEnd = Math.min(pageStart + itemsPerPage, filteredGames.length);
    const pagedGames = filteredGames.slice(pageStart, pageEnd);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-slate-800">My Saved Games</h2>
            </div>

            {/* Control Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-grow w-full md:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text" 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search my games..." 
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-blue outline-none text-sm"
                    />
                </div>

                <div className="relative min-w-[160px] w-full md:w-auto">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select 
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="w-full pl-10 pr-8 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-blue outline-none appearance-none bg-white text-sm cursor-pointer"
                    >
                        <option value="all">All Types</option>
                        {Object.values(GameType).map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>

                <div className="relative min-w-[160px] w-full md:w-auto">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {sourceFilter === 'ai' ? <Sparkles size={18} /> : <PenTool size={18} />}
                    </div>
                    <select 
                        value={sourceFilter}
                        onChange={(e) => setSourceFilter(e.target.value as 'all' | 'ai' | 'manual')}
                        className="w-full pl-10 pr-8 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-blue outline-none appearance-none bg-white text-sm cursor-pointer"
                    >
                        <option value="all">All Sources</option>
                        <option value="ai">AI Generated</option>
                        <option value="manual">Handcrafted</option>
                    </select>
                </div>

                <div className="relative min-w-[160px] w-full md:w-auto">
                    <SortAsc className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full pl-10 pr-8 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-blue outline-none appearance-none bg-white text-sm cursor-pointer"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="az">A-Z (Title)</option>
                        <option value="za">Z-A (Title)</option>
                    </select>
                </div>

            </div>

            <div className="mb-4 text-sm text-slate-500 font-bold text-center md:text-left">
                Showing {filteredGames.length === 0 ? 0 : pageStart + 1}-{pageEnd} of {filteredGames.length} game{filteredGames.length !== 1 ? 's' : ''}
            </div>
            {filteredGames.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span className="text-sm font-bold text-slate-600">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="text-center py-20">
                    <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500">Loading library...</p>
                </div>
            ) : filteredGames.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 border-dashed">
                    <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BookOpen size={32} className="text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">No games found</h3>
                    <p className="text-slate-400 max-w-sm mx-auto mb-6">
                        {games.length === 0 ? "Create your first game to see it here." : "Try changing your filters."}
                    </p>
                </div>
            ) : (
                <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pagedGames.map(game => (
                        <div key={game.id} className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-lg transition-all p-5 flex flex-col group relative cursor-pointer" onClick={() => onLoadGame(game)}>
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2 max-w-[70%]">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold uppercase truncate max-w-full">
                                        {getIcon(game.config.type)} <span className="truncate">{game.config.type}</span>
                                    </div>
                                    {game.config.isAI && (
                                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200" title="AI Generated">
                                            <Sparkles size={10} /> AI
                                        </div>
                                    )}
                                </div>
                                <button 
                                    onClick={(e) => handleDelete(e, game.id!)}
                                    className="text-slate-300 hover:text-red-500 p-2 -mr-2 -mt-2 rounded-full hover:bg-red-50 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            
                            <h3 className="font-display font-bold text-lg text-slate-800 mb-1 line-clamp-1" title={game.title}>{game.title}</h3>
                            <p className="text-sm text-slate-500 mb-2 line-clamp-1">Topic: {game.config.topic || 'General'}</p>
                            
                            {/* STATS BADGES */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                {getGameStats(game).map((stat, i) => (
                                    <div key={i} className="flex items-center text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                                        <span className="mr-1.5 opacity-50">{stat.icon}</span>
                                        <span>{stat.value} {stat.label}</span>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                                <span className="text-[10px] text-slate-400 font-bold">
                                    {new Date(game.createdAt || Date.now()).toLocaleDateString()}
                                </span>
                                <div className="flex items-center gap-2">
                                    {game.config.isPublic ? (
                                        <div className="flex items-center text-green-600 text-[10px] font-bold bg-green-50 px-2 py-1 rounded">
                                            <Globe size={10} className="mr-1" /> Public
                                        </div>
                                    ) : (
                                        <div className="text-slate-300 text-[10px] font-bold uppercase flex items-center">
                                            <div className="w-2 h-2 bg-slate-300 rounded-full mr-1"></div> Private
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {filteredGames.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 py-6">
                    <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="text-sm font-bold text-slate-600">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight size={18} />
                    </button>
                    <div className="relative min-w-[120px] ml-auto">
                        <List className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select
                            value={itemsPerPage}
                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                            className="w-full pl-9 pr-7 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-blue outline-none appearance-none bg-white text-xs font-bold text-slate-600 cursor-pointer"
                        >
                            {pageSizeOptions.map((size) => (
                                <option key={size} value={size}>{size} per page</option>
                            ))}
                        </select>
                    </div>
                </div>
                )}
                </>
            )}
        </div>
    );
};

// --- COMMUNITY LIBRARY COMPONENT ---
const CommunityLibrary: React.FC<{ onLoadGame: (game: GeneratedGame) => void }> = ({ onLoadGame }) => {
    const [games, setGames] = useState<GeneratedGame[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchAutoFilled, setIsSearchAutoFilled] = useState(false);
    const [typeFilter, setTypeFilter] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [sourceFilter, setSourceFilter] = useState<'all' | 'ai' | 'manual'>('all');
    const [authorFilter, setAuthorFilter] = useState<{ id: string; name: string } | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const pageSizeOptions = [10, 20, 30, 40, 50];
    
    const fetchGames = async () => {
        setLoading(true);
        setError(null);
        
        // Strictly fetch PUBLIC games from Database
        const { data, count, error: fetchError } = await getCommunityGames(
            currentPage,
            itemsPerPage,
            searchQuery,
            typeFilter,
            sortBy,
            sourceFilter,
            authorFilter?.id
        );
        
        if (fetchError) {
            setError(fetchError);
            setLoading(false);
            return;
        }

        setGames(data);
        setTotalCount(count);
        setLoading(false);
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, typeFilter, sortBy, sourceFilter, itemsPerPage, authorFilter]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchGames();
        }, 500); 
        return () => clearTimeout(timer);
    }, [currentPage, searchQuery, typeFilter, sortBy, sourceFilter, itemsPerPage, authorFilter]);

    const applyAuthorFilter = (id: string, name: string) => {
        setAuthorFilter({ id, name });
        setSearchInput(name);
        setSearchQuery('');
        setIsSearchAutoFilled(true);
    };

    const clearAuthorFilter = () => {
        setAuthorFilter(null);
        if (isSearchAutoFilled) {
            setSearchInput('');
            setSearchQuery('');
            setIsSearchAutoFilled(false);
        }
    };

    const totalPages = Math.ceil(totalCount / itemsPerPage);
    const pageStart = (currentPage - 1) * itemsPerPage + 1;
    const pageEnd = Math.min(currentPage * itemsPerPage, totalCount);

    return (
        <div className="animate-fade-in">
            {/* Control Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-8 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-grow w-full md:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text" 
                        value={searchInput}
                        onChange={(e) => {
                            setSearchInput(e.target.value);
                            setSearchQuery(e.target.value);
                            setIsSearchAutoFilled(false);
                        }}
                        placeholder="Search community games..." 
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-blue outline-none text-sm"
                    />
                </div>

                <div className="relative min-w-[160px] w-full md:w-auto">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select 
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="w-full pl-10 pr-8 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-blue outline-none appearance-none bg-white text-sm cursor-pointer"
                    >
                        <option value="all">All Types</option>
                        {Object.values(GameType).map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>

                <div className="relative min-w-[160px] w-full md:w-auto">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {sourceFilter === 'ai' ? <Sparkles size={18} /> : <PenTool size={18} />}
                    </div>
                    <select 
                        value={sourceFilter}
                        onChange={(e) => setSourceFilter(e.target.value as 'all' | 'ai' | 'manual')}
                        className="w-full pl-10 pr-8 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-blue outline-none appearance-none bg-white text-sm cursor-pointer"
                    >
                        <option value="all">All Sources</option>
                        <option value="ai">AI Generated</option>
                        <option value="manual">Handcrafted</option>
                    </select>
                </div>

                <div className="relative min-w-[160px] w-full md:w-auto">
                    <SortAsc className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full pl-10 pr-8 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-blue outline-none appearance-none bg-white text-sm cursor-pointer"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="az">A-Z (Title)</option>
                        <option value="za">Z-A (Title)</option>
                    </select>
                </div>


                <button 
                    onClick={fetchGames}
                    className="p-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors border border-slate-200"
                    title="Refresh List"
                >
                    <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                </button>
            </div>
            {authorFilter && (
                <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-slate-500 font-semibold">Filtering by:</span>
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-100 font-bold">
                        {authorFilter.name}
                        <button
                            type="button"
                            onClick={clearAuthorFilter}
                            className="text-sky-700 hover:text-sky-900"
                            aria-label="Clear author filter"
                        >
                            x
                        </button>
                    </span>
                </div>
            )}

            {!loading && !error && totalCount > 0 && (
                <>
                <div className="mb-4 text-sm text-slate-500 font-bold text-center md:text-left">
                    Showing {pageStart}-{pageEnd} of {totalCount} games
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span className="text-sm font-bold text-slate-600">
                            Page {currentPage} of {totalPages || 1}
                        </span>
                        <button 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
                </>
            )}

            {loading ? (
                <div className="text-center py-20">
                    <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500">Loading community games...</p>
                </div>
            ) : error ? (
                <div className="text-center py-20 bg-red-50 rounded-2xl border border-red-100">
                    <AlertTriangle size={32} className="text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-red-700 mb-2">Connection Error</h3>
                    <p className="text-red-600 max-w-sm mx-auto mb-6">{error}</p>
                    <button onClick={fetchGames} className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors">Try Again</button>
                </div>
            ) : games.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 border-dashed">
                    <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Globe size={32} className="text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">No public games found</h3>
                    <p className="text-slate-400 max-w-sm mx-auto mb-6">Be the first to publish a game to the community!</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {games.map(game => (
                            <div key={game.id} className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-lg transition-all p-5 flex flex-col group relative">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2 max-w-[60%]">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold uppercase truncate max-w-full">
                                            {getIcon(game.config.type)} <span className="truncate">{game.config.type}</span>
                                        </div>
                                        {game.config.isAI && (
                                            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200" title="AI Generated">
                                                <Sparkles size={10} /> AI
                                            </div>
                                        )}
                                    </div>
                                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-sky-50 text-sky-600 border border-sky-100">
                                        <Globe size={12} />
                                    </div>
                                </div>
                                
                                <h3 className="font-display font-bold text-lg text-slate-800 mb-1 line-clamp-1" title={game.title}>{game.title}</h3>
                                <p className="text-sm text-slate-500 mb-1 line-clamp-1">Topic: {game.config.topic || 'General'}</p>
                                <p className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
                                    <span>By</span>
                                    <Avatar
                                        name={game.authorName || 'Teacher'}
                                        src={game.authorAvatar || game.config.authorAvatar}
                                        className="w-4 h-4"
                                        textClassName="text-[7px]"
                                    />
                                    {game.authorId ? (
                                        <button
                                            type="button"
                                            onClick={() => applyAuthorFilter(game.authorId!, game.authorName || 'Teacher')}
                                            className="truncate text-slate-600 hover:text-brand-blue hover:underline"
                                            title={`View all by ${game.authorName || 'Teacher'}`}
                                        >
                                            {game.authorName || 'Teacher'}
                                        </button>
                                    ) : (
                                        <span className="truncate">{game.authorName || 'Teacher'}</span>
                                    )}
                                </p>
                                
                                {/* STATS BADGES */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {getGameStats(game).map((stat, i) => (
                                        <div key={i} className="flex items-center text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                                            <span className="mr-1.5 opacity-50">{stat.icon}</span>
                                            <span>{stat.value} {stat.label}</span>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="mt-auto pt-4 border-t border-slate-50 flex items-center">
                                    <button 
                                        onClick={() => onLoadGame(game)}
                                        className="w-full px-3 py-2 bg-white border-2 border-slate-200 text-slate-600 rounded-lg font-bold hover:border-brand-blue hover:text-brand-blue transition-colors flex items-center justify-center gap-2 text-sm"
                                        title="Open in Editor"
                                    >
                                        <Play size={14} fill="currentColor" /> Play
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {totalCount > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                        <button 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span className="text-sm font-bold text-slate-600">
                            Page {currentPage} of {totalPages || 1}
                        </span>
                        <button 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={18} />
                        </button>
                        <div className="relative min-w-[120px] ml-auto">
                            <List className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <select
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                className="w-full pl-9 pr-7 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-blue outline-none appearance-none bg-white text-xs font-bold text-slate-600 cursor-pointer"
                            >
                                {pageSizeOptions.map((size) => (
                                    <option key={size} value={size}>{size} per page</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    )}
                </>
            )}
        </div>
    );
};

// --- MAIN GAME HUB ---
const GameHub: React.FC<{ 
    onSelect: (type: GameType) => void, 
    initialTab?: 'create' | 'community' | 'library',
    onLoadCommunityGame: (game: GeneratedGame) => void,
    onLoadPersonalGame: (game: GeneratedGame) => void,
    onOpenAiAssistant: () => void
}> = ({ onSelect, initialTab = 'create', onLoadCommunityGame, onLoadPersonalGame, onOpenAiAssistant }) => {
    const [activeTab, setActiveTab] = useState<'create' | 'community' | 'library'>(initialTab);
    
    // Sync internal state with prop changes (e.g. from Nav link)
    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    // Game Types Data
    const games = [
        { 
            type: GameType.SNAKES_LADDERS, 
            icon: <Dice5 size={24} />, 
            desc: "Classic board game fun with a learning twist.",
            image: "/assets/games/snakes.png",
            color: "bg-orange-500"
        },
        { 
            type: GameType.TRIVIA, 
            icon: <HelpCircle size={24} />, 
            desc: "Fast-paced questions to test knowledge.",
            image: "/assets/games/trivia.png",
            color: "bg-purple-600"
        },
        { 
            type: GameType.JEOPARDY, 
            icon: <Grid size={24} />, 
            desc: "Strategic team quiz based on categories.",
            image: "/assets/games/jeopardy.png",
            color: "bg-blue-600"
        },
        { 
            type: GameType.PUB_QUIZ, 
            icon: <Beer size={24} />, 
            desc: "Round-based quiz with manual scoring.",
            image: "/assets/games/pubquiz.png",
            color: "bg-slate-700"
        },
        { 
            type: GameType.DARTS, 
            icon: <Target size={24} />, 
            desc: "Hit the target by answering correctly.",
            image: "/assets/games/darts.png",
            color: "bg-red-600"
        },
        { 
            type: GameType.MILLIONAIRE, 
            icon: <DollarSign size={24} />, 
            desc: "Climb the ladder to win big.",
            image: "/assets/games/millionaire.png",
            color: "bg-indigo-700"
        },
        { 
            type: GameType.TIME_BOMB, 
            icon: <Timer size={24} />, 
            desc: "Pass the bomb before time runs out!",
            image: "/assets/games/timebomb.png",
            color: "bg-slate-900"
        },
        { 
            type: GameType.SURVEY_SHOWDOWN, 
            icon: <List size={24} />, 
            desc: "Guess top answers in this survey game!",
            image: "/assets/games/survey.png",
            color: "bg-emerald-600"
        },
        { 
            type: GameType.STOP_THE_FIRE, 
            icon: <Flame size={24} />, 
            desc: "Fast word race inspired by Scattergories.",
            image: "/assets/games/stopthefire.svg",
            color: "bg-orange-600"
        },
        { 
            type: GameType.WORD_WHEEL, 
            icon: <RefreshCw size={24} />, 
            desc: "Letter-by-letter clue race with pass-or-play pressure.",
            image: "/assets/games/wordwheel.svg",
            color: "bg-teal-600"
        },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div className="text-center md:text-left">
                    <h1 className="font-display text-4xl font-bold text-slate-800 mb-1">Game Hub</h1>
                    <p className="text-slate-500">Create, play, and share educational games.</p>
                </div>
                
                {/* PROMINENT TABS */}
                <div className="bg-white p-1.5 rounded-2xl md:rounded-full flex flex-wrap md:flex-nowrap shadow-md border border-slate-100 gap-1 w-full md:w-auto justify-center">
                    <button 
                        onClick={() => setActiveTab('create')}
                        className={`px-3 py-2 md:px-6 md:py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 md:gap-2 whitespace-nowrap
                            ${activeTab === 'create' ? 'bg-brand-blue text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                    >
                        <Sparkles size={16} /> Create New
                    </button>
                    <button 
                        onClick={() => setActiveTab('community')}
                        className={`px-3 py-2 md:px-6 md:py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 md:gap-2 whitespace-nowrap
                            ${activeTab === 'community' ? 'bg-brand-blue text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                    >
                        <Globe size={16} /> Community
                    </button>
                    <button 
                        onClick={() => setActiveTab('library')}
                        className={`px-3 py-2 md:px-6 md:py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 md:gap-2 whitespace-nowrap
                            ${activeTab === 'library' ? 'bg-brand-blue text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                    >
                        <Library size={16} /> My Library
                    </button>
                </div>
            </div>
            
            {activeTab === 'create' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 animate-fade-in">
                        {games.map((game) => (
                            <GameCard key={game.type} game={game} onSelect={onSelect} />
                        ))}
                    </div>

                    {/* AI Chatbot Teaser */}
                    <div className="mt-20 bg-brand-blue rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between shadow-xl shadow-sky-100 overflow-hidden relative animate-slide-up">
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
                            <button 
                                onClick={onOpenAiAssistant}
                                className="bg-white text-brand-blue px-8 py-4 rounded-xl font-bold hover:bg-sky-50 transition-colors shadow-lg flex items-center"
                            >
                                <Sparkles size={20} className="mr-2" /> Open AI Assistant
                            </button>
                        </div>
                        <div className="md:w-1/3 flex justify-center relative z-10">
                             <div className="relative">
                                <div className="absolute inset-0 bg-brand-yellow blur-[60px] opacity-40 rounded-full animate-pulse"></div>
                                <img src="https://picsum.photos/seed/robot/300/300" alt="AI Robot" crossOrigin="anonymous" className="rounded-2xl border-4 border-white/20 shadow-2xl relative z-10 w-64 h-64 object-cover" />
                             </div>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'community' && (
                <CommunityLibrary onLoadGame={onLoadCommunityGame} />
            )}

            {activeTab === 'library' && (
                <PersonalLibrary onLoadGame={onLoadPersonalGame} />
            )}
        </div>
    );
};

// MAIN COMPONENT
export const Games: React.FC = () => {
    const [step, setStep] = useState<'hub' | 'mode' | 'config' | 'editor' | 'setup' | 'play'>('hub');
    const [selectedType, setSelectedType] = useState<GameType | null>(null);
    const [creationMode, setCreationMode] = useState<'ai' | 'manual' | 'bank'>('ai');
    const [generatedGame, setGeneratedGame] = useState<GeneratedGame | null>(null);
    const [playOptions, setPlayOptions] = useState<GameRunOptions | null>(null);
    const [editorReturnStep, setEditorReturnStep] = useState<'config' | 'hub'>('hub');
    const [hubTab, setHubTab] = useState<'create' | 'community' | 'library'>('create');
    const [isAssistantOpen, setIsAssistantOpen] = useState(false);

    const location = useLocation();
    const { setIsDirty, confirmAction } = useUnsavedChanges();

    useEffect(() => {
        if (location.state && location.state.view === 'library') {
            setIsDirty(false); 
            setHubTab('library');
            setStep('hub');
        }
    }, [location, setIsDirty]);

    const handleSelect = (type: GameType) => {
        setSelectedType(type);
        setGeneratedGame(null);
        // Enable mode selection for all games
        setStep('mode');
    };

    const handleModeSelect = (mode: 'ai' | 'manual' | 'bank') => {
        setCreationMode(mode);
        setStep('config');
    };

    const handleConfigProceed = (game: GeneratedGame) => {
        setGeneratedGame(game);
        setEditorReturnStep('config');
        setStep('editor');
        setIsDirty(true);
    };

    const handleEditorSave = (updatedGame: GeneratedGame) => {
        setGeneratedGame(updatedGame);
    };

    const handleEditorPlay = (updatedGame: GeneratedGame) => {
        setGeneratedGame(updatedGame);
        setIsDirty(false);
        
        if (updatedGame.config.type === GameType.MILLIONAIRE) {
             setPlayOptions({
                 players: 1,
                 timerSeconds: 0,
                 enableBonuses: false,
                 strictMode: false,
                 muted: false
             });
             setStep('play');
        } else if (updatedGame.config.type === GameType.STOP_THE_FIRE) {
             setPlayOptions({
                 players: 2,
                 timerSeconds: 60,
                 enableBonuses: false,
                 strictMode: false,
                 muted: false,
                 stopTheFireCategoryCount: 10,
                 stopTheFireDifficulty: 'beginner'
             });
             setStep('play');
        } else if (updatedGame.config.type === GameType.SURVEY_SHOWDOWN) {
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

    const handleLoadPersonalGame = (game: GeneratedGame) => {
        setGeneratedGame(game);
        setSelectedType(game.config.type);
        setEditorReturnStep('hub');
        setHubTab('library'); // Remember tab
        setStep('editor');
        setIsDirty(false); 
    };

    const handleLoadCommunityGame = (game: GeneratedGame) => {
        // Strip ID to treat as template (avoid overwriting public game or confusing local store)
        // Also ensure visibility is reset to private for the remixer
        const safeGame = { 
            ...game, 
            id: undefined,
            authorName: undefined, // Will be set to new user on save
            config: { ...game.config, isPublic: false } 
        };
        
        setGeneratedGame(safeGame);
        setSelectedType(game.config.type);
        setEditorReturnStep('hub'); 
        setHubTab('community'); // Remember tab
        setStep('editor');
        setIsDirty(true); // Treated as new unsaved instance
    };

    const handleBack = () => {
        const performBack = () => {
            setIsDirty(false);
            if (step === 'play') {
                if (selectedType === GameType.MILLIONAIRE || selectedType === GameType.STOP_THE_FIRE) setStep('editor');
                else setStep('setup');
            } else if (step === 'setup') {
                setStep('editor');
            } else if (step === 'editor') {
                setStep(editorReturnStep);
            } else if (step === 'config') {
                setStep('mode');
            } else if (step === 'mode') {
                setStep('hub');
            } else {
                setStep('hub');
            }
        };

        if (step === 'editor') {
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
        } else if (selectedType === GameType.STOP_THE_FIRE) {
             setStep('play');
        } else {
             setStep('setup');
        }
    };

    // Handler for when the AI Chat creates a game
    const handleAiGameGenerated = (game: GeneratedGame) => {
        setIsAssistantOpen(false);
        setGeneratedGame(game);
        setSelectedType(game.config.type);
        setEditorReturnStep('hub');
        setStep('editor');
        setIsDirty(true);
    };

    useEffect(() => {
        if (step === 'play') {
            document.body.classList.add('gameplay-active');
        } else {
            document.body.classList.remove('gameplay-active');
        }
        return () => {
            document.body.classList.remove('gameplay-active');
        };
    }, [step]);

    useEffect(() => {
        if (step === 'setup' || step === 'play') {
            window.scrollTo(0, 0);
        }
    }, [step]);

    return (
        <div className="min-h-screen bg-slate-50">
            {step === 'hub' && (
                <GameHub 
                    onSelect={handleSelect} 
                    initialTab={hubTab}
                    onLoadCommunityGame={handleLoadCommunityGame}
                    onLoadPersonalGame={handleLoadPersonalGame}
                    onOpenAiAssistant={() => setIsAssistantOpen(true)}
                />
            )}
            
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
                        onFinish={() => setStep('hub')} 
                        onReplay={handleReplay}
                    />
                ) : selectedType === GameType.TRIVIA ? (
                    <TriviaGame 
                        game={generatedGame} 
                        options={playOptions}
                        onBack={handleGameEnd} 
                        onFinish={() => setStep('hub')} 
                        onReplay={handleReplay}
                    />
                ) : selectedType === GameType.PUB_QUIZ ? (
                    <PubQuizGame 
                        game={generatedGame} 
                        options={playOptions}
                        onBack={handleGameEnd} 
                        onFinish={() => setStep('hub')} 
                        onReplay={handleReplay}
                    />
                ) : selectedType === GameType.DARTS ? (
                    <DartsGame
                        game={generatedGame}
                        options={playOptions}
                        onBack={handleGameEnd}
                        onFinish={() => setStep('hub')}
                        onReplay={handleReplay}
                    />
                ) : selectedType === GameType.SNAKES_LADDERS ? (
                    <SnakesLaddersGame
                        game={generatedGame}
                        options={playOptions}
                        onBack={handleGameEnd}
                        onFinish={() => setStep('hub')}
                        onReplay={handleReplay}
                    />
                ) : selectedType === GameType.MILLIONAIRE ? (
                    <MillionaireGame
                        game={generatedGame}
                        options={playOptions}
                        onBack={handleGameEnd}
                        onFinish={() => setStep('hub')}
                        onReplay={handleReplay}
                    />
                ) : selectedType === GameType.TIME_BOMB ? (
                    <TimeBombGame
                        game={generatedGame}
                        options={playOptions}
                        onBack={handleGameEnd}
                        onFinish={() => setStep('hub')}
                        onReplay={handleReplay}
                    />
                ) : selectedType === GameType.SURVEY_SHOWDOWN ? (
                    <SurveyShowdownGame
                        game={generatedGame} 
                        options={playOptions}
                        onBack={handleGameEnd}
                        onFinish={() => setStep('hub')} 
                        onReplay={handleReplay}
                    />
                ) : selectedType === GameType.STOP_THE_FIRE ? (
                    <StopTheFireGame
                        game={generatedGame}
                        options={playOptions}
                        onBack={handleGameEnd}
                        onFinish={() => setStep('hub')}
                        onReplay={handleReplay}
                    />
                ) : selectedType === GameType.WORD_WHEEL ? (
                    <WordWheelGame
                        game={generatedGame}
                        options={playOptions}
                        onBack={handleGameEnd}
                        onFinish={() => setStep('hub')}
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

            {isAssistantOpen && (
                <AiAssistantChat 
                    onClose={() => setIsAssistantOpen(false)} 
                    onGameGenerated={handleAiGameGenerated} 
                />
            )}
        </div>
    );
};
