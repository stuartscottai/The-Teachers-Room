
import React, { useState, useEffect, useRef } from 'react';
import { GeneratedGame, GameRunOptions, SurveyAnswer } from '../../types';
import { playSound } from '../../utils/gameUtils';
import { ArrowLeft, X, Edit2, Volume2, VolumeX, Maximize2, Minimize2, Check, Send, Eye, EyeOff, Shield, Coins, Trophy, RefreshCw, Plus, Minus } from 'lucide-react';

interface SurveyShowdownGameProps {
    game: GeneratedGame;
    options: GameRunOptions;
    onBack: () => void;
    onFinish: () => void;
    onReplay: () => void;
}

// Levenshtein Distance for fuzzy matching
const levenshteinDistance = (a: string, b: string): number => {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1  // deletion
                    )
                );
            }
        }
    }
    return matrix[b.length][a.length];
};

const isMatch = (input: string, target: string): boolean => {
    const cleanInput = input.trim().toLowerCase();
    const cleanTarget = target.trim().toLowerCase();
    
    // Direct match check first
    if (cleanInput === cleanTarget) return true;

    // Singular / Plural Checks (English rules simplified)
    if (cleanInput + 's' === cleanTarget) return true; // bag -> bags
    if (cleanInput === cleanTarget + 's') return true; // bags -> bag
    if (cleanInput + 'es' === cleanTarget) return true; // box -> boxes
    if (cleanInput === cleanTarget + 'es') return true; // boxes -> box
    
    // Length based tolerance
    const dist = levenshteinDistance(cleanInput, cleanTarget);
    if (cleanTarget.length <= 4) return dist === 0; // Strict for short words
    if (cleanTarget.length <= 7) return dist <= 1;  // Allow 1 typo
    return dist <= 2; // Allow 2 typos for long words
};

export const SurveyShowdownGame: React.FC<SurveyShowdownGameProps> = ({ game, options, onBack, onFinish, onReplay }) => {
    const initialTeamNames = options.teamNames && options.teamNames.length > 0 ? options.teamNames : ["Team 1", "Team 2"];
    const [teamNames, setTeamNames] = useState<string[]>(initialTeamNames);
    const [scores, setScores] = useState<number[]>(() => new Array(initialTeamNames.length).fill(0));
    const [activeTeamIndex, setActiveTeamIndex] = useState(0); 
    
    const [currentRound, setCurrentRound] = useState(0);
    const [revealedAnswers, setRevealedAnswers] = useState<boolean[]>([]);
    
    // Strikes are now per team
    const [teamStrikes, setTeamStrikes] = useState<number[]>(() => new Array(initialTeamNames.length).fill(0));
    
    const [input, setInput] = useState("");
    const [showStrikeOverlay, setShowStrikeOverlay] = useState(false);
    const [shakeInput, setShakeInput] = useState(false);
    const [isMuted, setIsMuted] = useState(options.muted);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    
    const [phase, setPhase] = useState<'play' | 'gameover'>('play');
    
    // Host Mode allows clicking to preview (secret feature)
    const [hostMode, setHostMode] = useState(false);
    const [hostPreview, setHostPreview] = useState<boolean[]>(() => new Array(8).fill(false));

    const toggleHostMode = () => {
        setHostMode(prev => {
            if (prev) {
                setHostPreview(new Array(8).fill(false));
            }
            return !prev;
        });
    };

    const teamCount = teamNames.length;
    const activeTeamName = teamNames[activeTeamIndex] || `Team ${activeTeamIndex + 1}`;
    const activeRingClass = activeTeamIndex % 2 === 0 ? 'focus:ring-brand-blue' : 'focus:ring-brand-yellow';

    const normalizeArray = (values: number[], length: number, fillValue: number) => {
        const next = values.slice(0, length);
        while (next.length < length) next.push(fillValue);
        return next;
    };

    useEffect(() => {
        if (teamCount === 0) return;
        setScores(prev => normalizeArray(prev, teamCount, 0));
        setTeamStrikes(prev => normalizeArray(prev, teamCount, 0));
        setActiveTeamIndex(prev => Math.min(prev, teamCount - 1));
    }, [teamCount]);

    // Editing State
    const [editingTeamIndex, setEditingTeamIndex] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editScore, setEditScore] = useState(0);
    const [editStrikes, setEditStrikes] = useState(0);

    const questions = game.questions || [];
    const currentQ = questions[currentRound];
    
    // Ensure surveyAnswers exists, pad if necessary to 8
    const answers = React.useMemo(() => {
        if (!currentQ) return [];
        let raw = currentQ.surveyAnswers || [];
        // If generated via old schema, fallback
        if (raw.length === 0 && currentQ.options) {
            raw = currentQ.options.map((o, i) => ({ text: o, score: 20 - i*2, alts: [] }));
        }
        // Ensure exactly 8 slots for the grid (fill with empty if needed)
        const padded = [...raw];
        while(padded.length < 8) {
            padded.push({ text: "---", score: 0, alts: [] });
        }
        return padded.slice(0, 8); // Cap at 8
    }, [currentQ]);

    // Reset round state when round changes
    useEffect(() => {
        setRevealedAnswers(new Array(8).fill(false));
        setTeamStrikes(new Array(teamCount).fill(0));
        setHostPreview(new Array(8).fill(false));
        setInput("");
        const startingIndex = teamCount > 0 ? currentRound % teamCount : 0;
        setActiveTeamIndex(startingIndex);
        if(inputRef.current) inputRef.current.focus();
    }, [currentRound, teamCount]);

    // SCROLL LOCK EFFECT
    useEffect(() => {
        const shouldLock = phase === 'gameover' || editingTeamIndex !== null;
        document.body.style.overflow = shouldLock ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [phase, editingTeamIndex]);

    useEffect(() => {
        const media = window.matchMedia('(max-width: 639px)');
        const handleChange = () => setIsMobileViewport(media.matches);
        handleChange();
        media.addEventListener('change', handleChange);
        return () => media.removeEventListener('change', handleChange);
    }, []);

    // Enhanced matching logic checking both main text and alternates
    const checkMatch = (userInput: string, answer: SurveyAnswer): boolean => {
        if (isMatch(userInput, answer.text)) return true;
        if (answer.alts && answer.alts.length > 0) {
            return answer.alts.some(alt => isMatch(userInput, alt));
        }
        return false;
    };

    const handleInputSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim()) return;

        // Check against all UNREVEALED answers
        let foundIndex = -1;
        for (let i = 0; i < answers.length; i++) {
            if (!revealedAnswers[i] && answers[i].text !== "---") {
                if (checkMatch(input, answers[i])) {
                    foundIndex = i;
                    break;
                }
            }
        }

        if (foundIndex !== -1) {
            // Match!
            revealAnswer(foundIndex);
            
            // AUTOMATICALLY AWARD POINTS TO ACTIVE TEAM
            const points = answers[foundIndex].score;
            setScores(prev => {
                const newScores = [...prev];
                newScores[activeTeamIndex] += points;
                return newScores;
            });
            
            setInput("");
            nextTurn();
        } else {
            // No Match
            triggerStrike();
            setInput("");
            // Turn switch handled inside triggerStrike timeout
        }
    };

    const toggleHostPreview = (index: number) => {
        if (revealedAnswers[index]) return;
        setHostPreview(prev => {
            const next = [...prev];
            next[index] = !next[index];
            return next;
        });
    };

    const revealAnswer = (index: number) => {
        if (revealedAnswers[index]) return;
        playSound('correct', isMuted, 'Chime');
        const newRevealed = [...revealedAnswers];
        newRevealed[index] = true;
        setRevealedAnswers(newRevealed);
    };

    const triggerStrike = () => {
        playSound('incorrect', isMuted, 'Buzz');
        
        // Add strike to current team
        setTeamStrikes(prev => {
            const newStrikes = [...prev];
            newStrikes[activeTeamIndex] = Math.min(newStrikes[activeTeamIndex] + 1, 3);
            return newStrikes;
        });

        setShowStrikeOverlay(true);
        setShakeInput(true);
        
        setTimeout(() => {
            setShowStrikeOverlay(false);
            setShakeInput(false);
            
            // Turn logic happens after overlay
            nextTurn();
        }, 1500);
    };

    const nextTurn = () => {
        if (teamCount <= 1) return;
        for (let step = 1; step <= teamCount; step++) {
            const candidate = (activeTeamIndex + step) % teamCount;
            if ((teamStrikes[candidate] ?? 0) < 3) {
                setActiveTeamIndex(candidate);
                return;
            }
        }
        setActiveTeamIndex(activeTeamIndex);
    };

    const nextRound = () => {
        if (currentRound < questions.length - 1) {
            setCurrentRound(prev => prev + 1);
        } else {
            setPhase('gameover');
            playSound('win', isMuted);
        }
    };

    const toggleFullscreen = () => {
        if (window.innerWidth < 768) return;
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const openEditTeam = (index: number) => {
        setEditingTeamIndex(index);
        setEditName(teamNames[index] || `Team ${index + 1}`);
        setEditScore(scores[index] ?? 0);
        setEditStrikes(teamStrikes[index] ?? 0);
    };

    const saveTeamEdit = () => {
        if (editingTeamIndex === null) return;

        const newNames = [...teamNames];
        newNames[editingTeamIndex] = editName;
        setTeamNames(newNames);

        const newScores = [...scores];
        newScores[editingTeamIndex] = editScore;
        setScores(newScores);

        const newStrikes = [...teamStrikes];
        newStrikes[editingTeamIndex] = Math.max(0, Math.min(3, editStrikes)); // Clamp 0-3
        setTeamStrikes(newStrikes);

        setEditingTeamIndex(null);
    };

    if (!currentQ) return <div className="p-8 text-center text-slate-500">Loading Game Data...</div>;

    // Check if round is "over"
    const allRevealed = answers.every((a, i) => revealedAnswers[i] || a.text === "---");
    const allStrikesOut = teamStrikes.every(s => s >= 3);
    const roundOver = allRevealed || allStrikesOut;
    const isLastRound = currentRound === questions.length - 1;

    // --- GAME OVER SCREEN ---
    if (phase === 'gameover') {
        const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
        const winnerIndices = scores.reduce<number[]>((acc, score, idx) => {
            if (score === maxScore) acc.push(idx);
            return acc;
        }, []);
        const winnerTitle = winnerIndices.length === 1 ? "Winning Team" : "Top Teams";
        const winnerName = winnerIndices.length === 1
            ? teamNames[winnerIndices[0]]
            : winnerIndices.length > 1
                ? winnerIndices.map(i => teamNames[i]).join(' & ')
                : "No teams";
        
        if (isMobileViewport) {
            const rankedTeams = scores
                .map((score, index) => ({ name: teamNames[index], score, id: index }))
                .sort((a, b) => b.score - a.score);

            return (
                <div className="fixed inset-0 bg-gradient-to-br from-indigo-900 to-purple-900 z-[300] flex flex-col items-center justify-center animate-fade-in text-white overflow-hidden">
                    <style>
                        {`
                        @keyframes confetti-fall {
                            0% { transform: translateY(-10vh) translateX(0) rotate3d(1, 1, 1, 0deg); opacity: 1; }
                            100% { transform: translateY(110vh) translateX(20px) rotate3d(1, 1, 1, 360deg); opacity: 0; }
                        }
                        .confetti-piece {
                            position: absolute;
                            animation: confetti-fall 4s linear infinite;
                            box-shadow: 1px 1px 2px rgba(0,0,0,0.2);
                        }
                        `}
                    </style>
                    <div className="absolute inset-0 pointer-events-none">
                        {Array.from({length: 100}).map((_, i) => (
                            <div key={i} className="confetti-piece" style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * -20}%`,
                                backgroundColor: ['#FACC15', '#0EA5E9', '#EC4899', '#FFF'][Math.floor(Math.random() * 4)],
                                width: `${Math.random() * 10 + 5}px`,
                                height: `${Math.random() * 15 + 5}px`,
                                animationDelay: `${Math.random() * 5}s`,
                                animationDuration: `${Math.random() * 2 + 3}s`
                            }} />
                        ))}
                    </div>

                    <div className="relative z-10 w-full h-full overflow-y-auto px-4 pt-24 pb-10 text-center">
                        <div className="min-h-[75vh] flex flex-col items-center justify-center">
                            <Trophy size={72} className="text-brand-yellow mb-4 animate-bounce drop-shadow-xl" />
                            <h1 className="text-4xl font-black mb-2 tracking-widest uppercase text-shadow-lg">Game Over</h1>
                            <div className="text-sm font-bold text-indigo-200 uppercase tracking-wider mb-2">{winnerTitle}</div>
                            <div className="text-2xl font-display font-black text-white drop-shadow-md mb-4">{winnerName}</div>

                            <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 text-center shadow-2xl">
                                <div className="text-xs font-bold text-indigo-200 uppercase tracking-wider mb-1">Top Score</div>
                                <div className="text-3xl font-mono font-black text-brand-yellow">{maxScore}</div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button onClick={onReplay} className="px-6 py-3 bg-brand-yellow text-slate-900 rounded-full font-bold text-base shadow-lg">
                                    Play Again
                                </button>
                                <button onClick={onFinish} className="px-6 py-3 bg-slate-800 text-white rounded-full font-bold text-base shadow-lg border border-slate-600">
                                    Exit to Library
                                </button>
                            </div>
                        </div>

                        <div className="mt-10 pt-6 border-t border-white/10">
                            <h2 className="text-xs uppercase tracking-widest text-indigo-200 text-center mb-4">Full Standings</h2>
                            <div className="space-y-3">
                                {rankedTeams.map((team, idx) => (
                                    <div key={team.id} className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between">
                                        <div className="font-bold text-white">#{idx + 1} {team.name}</div>
                                        <div className="font-mono font-bold text-white">{team.score}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="fixed inset-0 bg-gradient-to-br from-indigo-900 to-purple-900 z-[300] flex flex-col items-center justify-center animate-fade-in text-white overflow-hidden">
                <style>
                    {`
                    @keyframes confetti-fall {
                        0% { transform: translateY(-10vh) translateX(0) rotate3d(1, 1, 1, 0deg); opacity: 1; }
                        100% { transform: translateY(110vh) translateX(20px) rotate3d(1, 1, 1, 360deg); opacity: 0; }
                    }
                    .confetti-piece {
                        position: absolute;
                        animation: confetti-fall 4s linear infinite;
                        box-shadow: 1px 1px 2px rgba(0,0,0,0.2);
                    }
                    `}
                </style>
                <div className="absolute inset-0 pointer-events-none">
                    {Array.from({length: 100}).map((_, i) => (
                        <div key={i} className="confetti-piece" style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * -20}%`,
                            backgroundColor: ['#FACC15', '#0EA5E9', '#EC4899', '#FFF'][Math.floor(Math.random() * 4)],
                            width: `${Math.random() * 10 + 5}px`,
                            height: `${Math.random() * 15 + 5}px`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${Math.random() * 2 + 3}s`
                        }} />
                    ))}
                </div>

                <Trophy size={100} className="text-brand-yellow mb-6 animate-bounce drop-shadow-xl" />
                <h1 className="text-6xl font-black mb-4 tracking-widest uppercase text-shadow-lg">GAME OVER</h1>
                
                <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 mb-12 text-center shadow-2xl">
                    <h2 className="text-2xl font-bold text-indigo-200 mb-2 uppercase tracking-wider">{winnerTitle}</h2>
                    <div className="text-5xl font-display font-black text-white drop-shadow-md mb-6">{winnerName}</div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {teamNames.map((name, idx) => (
                            <div
                                key={`${name}-${idx}`}
                                className={`text-center p-4 rounded-2xl border ${
                                    winnerIndices.includes(idx)
                                        ? 'border-brand-yellow bg-white/10'
                                        : 'border-white/10 bg-white/5'
                                }`}
                            >
                                <p className="text-xs font-bold text-slate-400 uppercase">{name}</p>
                                <p className="text-3xl font-mono font-bold text-brand-yellow">{scores[idx] ?? 0}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex gap-4 relative z-50">
                    <button onClick={onReplay} className="px-8 py-3 bg-brand-yellow text-slate-900 rounded-full font-bold text-xl hover:scale-105 transition-transform flex items-center shadow-lg">
                        <RefreshCw size={24} className="mr-2" /> Play Again
                    </button>
                    <button onClick={onFinish} className="px-8 py-3 bg-slate-800 text-white rounded-full font-bold text-xl hover:bg-slate-700 transition-transform shadow-lg border-2 border-slate-600">
                        Exit to Library
                    </button>
                </div>
            </div>
        );
    }

    return (
        // MAIN CONTAINER: Fixed Height, No Scroll on Body
        <div ref={containerRef} className={`bg-slate-900 flex flex-col ${isFullscreen ? 'h-[calc(var(--app-vh,1vh)*100)]' : 'h-[calc(var(--app-vh,1vh)*100-4rem)]'} overflow-hidden relative text-white font-sans`}>
            
            {/* 1. HEADER / SCOREBOARD (Increased Height to match Trivia) */}
            <div className="bg-slate-800/90 backdrop-blur-md px-2 py-2 sm:p-4 shrink-0 border-b border-slate-700 shadow-lg z-20 min-h-[56px] sm:min-h-[140px]">
                <div className="flex w-full items-center gap-2 sm:gap-4">
                    <div className="flex flex-col items-start gap-1 min-w-[52px]">
                        <button onClick={onBack} className="hidden sm:flex bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition-colors items-center text-sm font-bold text-slate-300">
                            <ArrowLeft size={16} className="mr-2" /> Quit
                        </button>
                        <button
                            onClick={onBack}
                            className="sm:hidden w-9 h-9 flex items-center justify-center rounded-lg border border-slate-700 bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                            title="Quit"
                        >
                            <X size={18} />
                        </button>
                        <div className="sm:hidden flex flex-col gap-1">
                            <button 
                                onClick={toggleHostMode} 
                                className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${hostMode ? 'bg-red-900/50 text-red-400 border border-red-800' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                                title="Host Mode (Click to Preview)"
                            >
                                <Shield size={18} />
                            </button>
                            <button onClick={() => setIsMuted(!isMuted)} className="w-9 h-9 flex items-center justify-center bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors text-slate-300">
                                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                            </button>
                        </div>
                        <h1 className="font-display font-bold text-xl hidden md:block opacity-80 max-w-[200px] truncate">{game.title}</h1>
                    </div>

                    {/* TEAMS CENTER STAGE */}
                    <div className="flex-1 flex justify-end sm:justify-center gap-2 sm:gap-4 flex-wrap sm:flex-nowrap overflow-x-auto no-scrollbar px-1 sm:px-2 h-full items-center">
                        {teamNames.map((name, idx) => {
                            const isActive = activeTeamIndex === idx;
                            const strikeCount = teamStrikes[idx] ?? 0;
                            const teamScore = scores[idx] ?? 0;
                            return (
                                <button 
                                    key={`${name}-${idx}`}
                                    onClick={() => openEditTeam(idx)}
                                    className={`flex flex-col items-center transition-all px-2 py-1 sm:px-4 sm:py-3 rounded-xl border-4 relative min-w-[100px] sm:min-w-[120px] cursor-pointer group
                                    ${isActive 
                                        ? 'border-brand-yellow bg-slate-700 ring-2 sm:ring-4 ring-yellow-300/30 sm:scale-110 z-10' 
                                        : 'border-slate-600 bg-slate-800 opacity-70 hover:opacity-100 hover:border-slate-500'}`}
                                >
                                    <div className="absolute -top-2 -right-2 bg-slate-100 text-slate-900 p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                        <Edit2 size={12} />
                                    </div>
                                    <span className={`text-[10px] sm:text-sm font-bold uppercase tracking-wider mb-1 ${isActive ? 'text-brand-yellow' : 'text-slate-400'}`}>
                                        {name}
                                    </span>
                                    <div className="text-xl sm:text-4xl font-black text-white font-mono leading-none mb-1">{teamScore}</div>
                                    <div className="flex gap-1">
                                        {[0, 1, 2].map(i => (
                                            <div key={i} className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${strikeCount > i ? 'bg-red-500 shadow-[0_0_8px_red]' : 'bg-slate-900 border border-slate-600'}`}></div>
                                        ))}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="hidden sm:flex gap-2 flex-col items-end">
                        <div className="flex gap-2">
                            <button 
                                onClick={toggleHostMode} 
                                className={`p-3 rounded-lg transition-colors ${hostMode ? 'bg-red-900/50 text-red-400 border border-red-800' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                                title="Host Mode (Click to Preview)"
                            >
                                <Shield size={20} />
                            </button>
                            <button onClick={() => setIsMuted(!isMuted)} className="p-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors text-slate-300">
                                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </button>
                        </div>
                        <button onClick={toggleFullscreen} className="p-2 text-xs font-bold text-slate-500 hover:text-white flex items-center">
                            {isFullscreen ? <><Minimize2 size={14} className="mr-1"/> Exit Full</> : <><Maximize2 size={14} className="mr-1"/> Fullscreen</>}
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. MAIN BOARD AREA (Flex Grow, No Scroll) */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed overflow-hidden w-full relative">
                
                {/* QUESTION DISPLAY */}
                <div className="bg-blue-600 text-white px-8 py-3 rounded-2xl border-b-8 border-blue-800 shadow-2xl mb-4 text-center max-w-4xl w-full shrink-0 z-10">
                    <h2 className="text-xl md:text-2xl font-display font-black leading-tight drop-shadow-md uppercase tracking-wide whitespace-normal break-words">
                        {currentQ.question}
                    </h2>
                </div>

                {/* THE BOARD (Grid - 2 Columns for High -> Low flow) */}
                <div className="flex-1 w-full max-w-5xl min-h-0 relative">
                    <div className="absolute inset-0 grid grid-cols-2 grid-rows-4 gap-3 md:gap-4 pb-2">
                        {answers.map((ans, i) => {
                            const isCardRevealed = revealedAnswers[i] || (hostMode && hostPreview[i]);
                            return (
                                <div 
                                    key={i} 
                                    className="w-full h-full [perspective:1000px] relative cursor-pointer group"
                                    onClick={() => { if (hostMode) toggleHostPreview(i); }}
                                >
                                    {/* Host Indicator */}
                                    {hostMode && (
                                        <div className={`absolute top-1 right-1 z-50 w-2 h-2 rounded-full ${isCardRevealed ? 'bg-green-500' : 'bg-red-500'} border border-white`} title="Click to Toggle" />
                                    )}

                                    <div className={`relative w-full h-full transition-all duration-700 [transform-style:preserve-3d] ${isCardRevealed ? '[transform:rotateX(180deg)]' : ''}`}>
                                    
                                    {/* FRONT (Number) */}
                                    <div className="absolute inset-0 [backface-visibility:hidden] bg-gradient-to-b from-blue-800 to-blue-950 border-2 border-blue-500 rounded-lg shadow-[0_4px_0_rgba(0,0,0,0.3)] flex items-center justify-center">
                                        <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-blue-950 flex items-center justify-center border-2 border-blue-400 shadow-inner group-hover:scale-110 transition-transform">
                                            <span className="text-xl md:text-3xl font-black text-blue-200">{i + 1}</span>
                                        </div>
                                        {ans.text === "---" && <div className="absolute inset-0 bg-black/60 rounded-lg backdrop-blur-sm flex items-center justify-center text-slate-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Empty</div>}
                                    </div>

                                    {/* BACK (Answer) */}
                                    <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateX(180deg)] bg-gradient-to-b from-slate-100 to-slate-200 border-4 border-white rounded-lg shadow-[0_4px_0_rgba(0,0,0,0.3)] flex items-center justify-between px-3 md:px-6 overflow-hidden">
                                        {ans.text !== "---" ? (
                                            <>
                                                <span className="text-base md:text-2xl font-black text-slate-800 uppercase truncate pr-2 drop-shadow-sm flex-1 text-left">{ans.text}</span>
                                                <div className="bg-blue-600 text-white px-2 py-1 md:px-4 md:py-1 font-mono font-bold text-lg md:text-2xl border-2 border-blue-800 shadow-inner min-w-[2.5rem] text-center rounded-md">
                                                    {ans.score}
                                                </div>
                                            </>
                                        ) : (
                                            <span className="w-full text-center text-slate-400 font-bold">---</span>
                                        )}
                                    </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 3. FOOTER CONTROLS */}
            <div className="bg-slate-900 border-t-4 border-slate-800 p-4 shrink-0 z-30 shadow-2xl relative min-h-[100px] flex items-center">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-4 items-center w-full">
                    
                    {/* INPUT AREA */}
                    {!roundOver ? (
                        <div className="flex-1 w-full relative flex gap-2 sm:gap-4 items-center">
                            <form onSubmit={handleInputSubmit} className={`flex-1 min-w-0 relative ${shakeInput ? 'animate-shake' : ''}`}>
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span className="text-slate-500 font-bold uppercase text-xs tracking-wider hidden md:block">
                                        {activeTeamName} Guess:
                                    </span>
                                </div>
                                <input 
                                    ref={inputRef}
                                    type="text" 
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="TYPE ANSWER..."
                                    className={`w-full p-4 pl-4 md:pl-32 pr-16 rounded-full bg-slate-100 text-slate-900 text-xl md:text-2xl font-bold uppercase tracking-wider focus:ring-4 outline-none transition-all placeholder:text-slate-400 shadow-inner border-4 ${activeRingClass} border-slate-300`}
                                    autoFocus
                                />
                                <button 
                                    type="submit" 
                                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-brand-blue hover:bg-sky-500 text-white p-2.5 rounded-full transition-colors shadow-md active:scale-95"
                                >
                                    <Send size={20} className="ml-0.5" />
                                </button>
                            </form>
                            
                            {/* MANUAL STRIKE */}
                            <button 
                                onClick={triggerStrike}
                                className="w-12 h-12 sm:w-auto sm:h-auto sm:px-6 sm:py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold uppercase tracking-wider shadow-[0_4px_0_#991b1b] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center shrink-0"
                            >
                                <X size={20} />
                                <span className="hidden sm:inline ml-2">Strike</span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col gap-3 w-full">
                            <h3 className="text-base sm:text-xl font-bold text-white uppercase tracking-wider text-center">Round Over!</h3>

                            <div className="flex items-center justify-between gap-3 w-full">
                                {!allRevealed ? (
                                    <button
                                        onClick={() => setRevealedAnswers(new Array(8).fill(true))}
                                        className="px-4 py-2 sm:px-6 sm:py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg sm:rounded-full text-sm sm:text-base font-bold shadow-md transition-transform hover:scale-105"
                                    >
                                        Reveal All
                                    </button>
                                ) : (
                                    <div />
                                )}

                                <button 
                                    onClick={nextRound}
                                    className="px-5 py-2 sm:px-10 sm:py-3 bg-brand-yellow text-slate-900 rounded-lg sm:rounded-full text-sm sm:text-lg font-bold uppercase tracking-wider shadow-md hover:scale-105 transition-transform animate-pulse"
                                >
                                    {isLastRound ? "Finish Game" : "Start Next Round"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* FULL SCREEN STRIKE OVERLAY */}
            {showStrikeOverlay && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-red-900/60 backdrop-blur-sm animate-pulse pointer-events-none">
                    <div className="text-[15rem] md:text-[25rem] font-black text-red-500 drop-shadow-[0_0_100px_rgba(255,0,0,1)] animate-bounce-slow transform scale-150 border-8 border-red-500 w-[250px] h-[250px] md:w-[400px] md:h-[400px] rounded-full flex items-center justify-center leading-none">
                        X
                    </div>
                </div>
            )}

            {/* EDIT TEAM MODAL */}
            {editingTeamIndex !== null && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white p-4 sm:p-6 rounded-2xl w-full max-w-sm shadow-2xl border-4 border-slate-200">
                        <div className="flex justify-between items-center mb-4 sm:mb-6">
                            <h3 className="text-lg sm:text-xl font-bold text-slate-800">Edit {teamNames[editingTeamIndex] || `Team ${editingTeamIndex + 1}`}</h3>
                            <button onClick={() => setEditingTeamIndex(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        
                        <div className="space-y-4 sm:space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Team Name</label>
                                <input 
                                    type="text" 
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full p-2.5 sm:p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none font-bold text-base sm:text-lg text-slate-800"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Score Adjustment</label>
                                <div className="flex items-center gap-2 justify-center">
                                    <button onClick={() => setEditScore(s => s - 10)} className="px-3 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-600 text-sm font-bold">-10</button>
                                    <input 
                                        type="number" 
                                        value={editScore}
                                        onChange={(e) => setEditScore(parseInt(e.target.value) || 0)}
                                        className="w-28 sm:w-32 p-2.5 sm:p-3 border border-slate-300 rounded-lg text-center font-mono font-bold text-lg sm:text-xl text-slate-800"
                                    />
                                    <button onClick={() => setEditScore(s => s + 10)} className="px-3 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-600 text-sm font-bold">+10</button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Strikes</label>
                                <div className="flex gap-2">
                                    {[0, 1, 2, 3].map(count => (
                                        <button 
                                            key={count}
                                            onClick={() => setEditStrikes(count)}
                                            className={`flex-1 py-2 sm:py-3 rounded-lg font-bold transition-all border-2 text-sm sm:text-base
                                                ${editStrikes === count 
                                                    ? 'bg-red-500 border-red-600 text-white shadow-md scale-105' 
                                                    : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200'}`}
                                        >
                                            {count}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2 italic">Reducing strikes from 3 will resume the team's turn if round not over.</p>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6 sm:mt-8">
                            <button 
                                onClick={() => setEditingTeamIndex(null)}
                                className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={saveTeamEdit}
                                className="flex-1 py-3 bg-brand-blue text-white font-bold rounded-lg hover:bg-sky-600 transition-colors shadow-md"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CSS for Shake Animation */}
            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-10px); }
                    75% { transform: translateX(10px); }
                }
                .animate-shake {
                    animation: shake 0.3s ease-in-out;
                }
            `}</style>
        </div>
    );
};
