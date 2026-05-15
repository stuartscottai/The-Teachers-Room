
import React, { useState, useEffect, useRef } from 'react';
import { GeneratedGame, GameRunOptions, SurveyAnswer } from '../../types';
import { playSound } from '../../utils/gameUtils';
import { resolveGameImageUrl } from '../../utils/gameImage';
import { WinnerCeremonyHero, WinnerCeremonyStandingsTable } from './shared/WinnerCeremonyHero';
import { ArrowLeft, X, Edit2, Volume2, VolumeX, Maximize2, Minimize2, Check, Send, Eye, EyeOff, Shield, Coins, Plus, Minus, AlertTriangle, Flag } from 'lucide-react';

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

const normalizeText = (text: string): string =>
    text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const stopWords = new Set(['a', 'an', 'the', 'to', 'of', 'and', 'or', 'for', 'in', 'on', 'with', 'at', 'by']);

const synonymMap: Record<string, string> = {
    mobile: 'phone',
    cellphone: 'phone',
    cell: 'phone',
    telephone: 'phone',
    tv: 'television',
};

const stemWord = (word: string): string => {
    if (word.length <= 4) return word;
    if (word.endsWith('ing')) return word.slice(0, -3);
    if (word.endsWith('ed')) return word.slice(0, -2);
    if (word.endsWith('es')) return word.slice(0, -2);
    if (word.endsWith('s')) return word.slice(0, -1);
    return word;
};

const toTokens = (text: string): string[] =>
    normalizeText(text)
        .split(' ')
        .filter(Boolean)
        .filter(word => !stopWords.has(word))
        .map(word => synonymMap[word] ?? word)
        .map(stemWord);

const isMatch = (input: string, target: string): boolean => {
    const cleanInput = normalizeText(input);
    const cleanTarget = normalizeText(target);
    
    // Direct match check first
    if (cleanInput === cleanTarget) return true;

    const inputTokens = toTokens(input);
    const targetTokens = toTokens(target);

    if (inputTokens.length && targetTokens.length) {
        const inputJoined = inputTokens.join(' ');
        const targetJoined = targetTokens.join(' ');
        if (inputJoined === targetJoined) return true;

        const targetSet = new Set(targetTokens);
        const overlap = inputTokens.filter(token => targetSet.has(token)).length;
        const maxTokens = Math.max(inputTokens.length, targetTokens.length);
        if (overlap / maxTokens >= 0.8) return true;

        const inputAllInTarget = inputTokens.every(token => targetSet.has(token));
        if (inputAllInTarget && targetTokens.length <= inputTokens.length + 2) return true;

        const inputSet = new Set(inputTokens);
        const targetAllInInput = targetTokens.every(token => inputSet.has(token));
        if (targetAllInInput && inputTokens.length <= targetTokens.length + 2) return true;

        const tokenDist = levenshteinDistance(inputJoined, targetJoined);
        const tokenTolerance = Math.max(1, Math.floor(targetJoined.length * 0.15));
        if (targetJoined.length > 6 && tokenDist <= tokenTolerance) return true;
    }

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
    const [isImageZoomOpen, setIsImageZoomOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [showQuitConfirm, setShowQuitConfirm] = useState(false);
    const [showEndGameConfirm, setShowEndGameConfirm] = useState(false);
    
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

    const questions = React.useMemo(() => {
        const base = [...(game.questions || [])];
        if (!options.randomizeQuestions) return base;
        for (let i = base.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [base[i], base[j]] = [base[j], base[i]];
        }
        return base;
    }, [game.questions, options.randomizeQuestions]);
    const currentQ = questions[currentRound];
    const questionImageUrl = resolveGameImageUrl(currentQ?.image?.url, currentQ?.image?.thumbUrl);
    const questionImageAlt = currentQ?.image?.alt || '';
    
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
        const shouldLock = editingTeamIndex !== null;
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

    useEffect(() => {
        if (!isImageZoomOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsImageZoomOpen(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isImageZoomOpen]);

    useEffect(() => {
        if (!questionImageUrl && isImageZoomOpen) {
            setIsImageZoomOpen(false);
        }
    }, [questionImageUrl, isImageZoomOpen]);

    useEffect(() => {
        if (isMobileViewport && isImageZoomOpen) {
            setIsImageZoomOpen(false);
        }
    }, [isMobileViewport, isImageZoomOpen]);

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

    const openImageZoom = (event?: React.SyntheticEvent) => {
        if (event) {
            event.stopPropagation();
        }
        if (questionImageUrl && !isMobileViewport) {
            setIsImageZoomOpen(true);
        }
    };

    const handleImageKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openImageZoom(event);
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
        const ranking = scores
            .map((score, index) => ({ index, score, name: teamNames[index] || `Team ${index + 1}` }))
            .sort((a, b) => b.score - a.score);
        const winnerScore = ranking.length ? ranking[0].score : 0;
        const winners = ranking.filter((team) => team.score === winnerScore);
        const winnerHeadline = winners.length > 1
            ? `WINNERS: ${winners.map((team) => team.name).join(' & ')}`
            : `WINNER: ${winners[0]?.name || 'No winner'}`;

        return (
            <div
                className={`${isFullscreen ? 'fixed inset-0 overflow-y-auto overflow-x-hidden' : 'relative min-h-[calc(100vh-4rem)]'} z-[300] bg-gradient-to-br from-teal-900 via-cyan-900 to-slate-950 text-white`}
            >
                <WinnerCeremonyHero
                    winnerHeadline={winnerHeadline}
                    subtitle="Final standings"
                    ranking={ranking}
                    isMobileViewport={isMobileViewport}
                    musicEnabled={!isMuted}
                    onPlayAgain={onReplay}
                    onExit={onFinish}
                >
                    <WinnerCeremonyStandingsTable ranking={ranking} />
                </WinnerCeremonyHero>
            </div>
        );
    }

    const mobileUsesTwoRowHeader = isMobileViewport && teamNames.length >= 4;
    const mobileHeaderColumns = teamNames.length >= 5 ? 3 : teamNames.length === 4 ? 2 : Math.max(teamNames.length, 1);
    const mobileControlCount = 4;
    const mobileUsesButtonGrid = mobileUsesTwoRowHeader && mobileControlCount >= 4;
    const isCrowdedDesktopHeader = !isMobileViewport && teamNames.length >= 5;

    return (
        // MAIN CONTAINER: Fixed Height, No Scroll on Body
        <div ref={containerRef} className={`bg-slate-900 flex flex-col ${isFullscreen ? 'h-[calc(var(--app-vh,1vh)*100)]' : 'h-[calc(var(--app-vh,1vh)*100-4rem)]'} overflow-hidden relative text-white font-sans`}>
            
            {/* 1. HEADER / SCOREBOARD (Increased Height to match Trivia) */}
            <div className={`bg-slate-800/90 backdrop-blur-md ${mobileUsesTwoRowHeader ? 'px-2 py-1.5' : 'p-2'} sm:p-4 shrink-0 border-b border-slate-700 shadow-lg z-20 min-h-[70px] sm:min-h-[140px]`}>
                <div className={`flex w-full gap-3 sm:gap-4 ${mobileUsesTwoRowHeader ? 'items-start' : 'items-center'}`}>
                    <div className={`${mobileUsesButtonGrid ? 'grid grid-cols-2' : 'flex'} min-w-fit shrink-0 gap-1.5 sm:flex sm:flex-col sm:items-start sm:gap-2 sm:min-w-[64px] ${mobileUsesButtonGrid ? '' : mobileUsesTwoRowHeader ? 'flex-col items-start' : 'flex-row items-center'}`}>
                        <button onClick={() => setShowQuitConfirm(true)} className="hidden sm:flex w-[140px] justify-center bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition-colors items-center text-sm font-bold text-slate-300">
                            <ArrowLeft size={16} className="mr-2" /> Quit
                        </button>
                        <button
                            onClick={() => setShowEndGameConfirm(true)}
                            className="hidden sm:flex w-[140px] justify-center bg-rose-700 hover:bg-rose-600 px-4 py-2 rounded-lg transition-colors items-center text-sm font-bold text-white border border-rose-800"
                            title="End game now"
                        >
                            <Flag size={16} className="mr-2" /> End Game
                        </button>
                        <button
                            onClick={() => setShowQuitConfirm(true)}
                            className="sm:hidden w-9 h-9 flex items-center justify-center rounded-lg border border-slate-700 bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                            title="Quit"
                        >
                            <X size={17} />
                        </button>
                        <button
                            onClick={() => setShowEndGameConfirm(true)}
                            className="sm:hidden w-9 h-9 flex items-center justify-center rounded-lg border border-rose-700 bg-rose-700 text-white hover:bg-rose-600 transition-colors"
                            title="End game now"
                        >
                            <Flag size={14} />
                        </button>
                        <button 
                            onClick={toggleHostMode} 
                            className={`sm:hidden w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${hostMode ? 'bg-red-900/50 text-red-400 border border-red-800' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                            title="Host Mode (Click to Preview)"
                        >
                            <Shield size={17} />
                        </button>
                        <button onClick={() => setIsMuted(!isMuted)} className="sm:hidden w-9 h-9 flex items-center justify-center rounded-lg border border-slate-700 bg-slate-700 hover:bg-slate-600 transition-colors text-slate-300">
                            {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
                        </button>
                    </div>

                    {/* TEAMS CENTER STAGE */}
                    <div
                        className={isMobileViewport
                            ? 'flex-1 self-start grid gap-1 items-start content-start'
                            : `flex-1 flex justify-end sm:justify-center gap-2 ${isCrowdedDesktopHeader ? 'sm:gap-2' : 'sm:gap-4'} flex-wrap sm:flex-nowrap overflow-x-auto no-scrollbar px-1 sm:px-2 h-full items-center`}
                        style={isMobileViewport ? { gridTemplateColumns: `repeat(${mobileHeaderColumns}, minmax(0, 1fr))` } : undefined}
                    >
                        {teamNames.map((name, idx) => {
                            const isActive = activeTeamIndex === idx;
                            const strikeCount = teamStrikes[idx] ?? 0;
                            const teamScore = scores[idx] ?? 0;
                            return (
                                <button 
                                    key={`${name}-${idx}`}
                                    onClick={() => openEditTeam(idx)}
                                    className={`flex flex-col items-center justify-center transition-all w-full min-w-0 px-2 py-1 ${isCrowdedDesktopHeader ? 'sm:px-3 sm:py-2' : 'sm:px-4 sm:py-3'} rounded-xl ${isMobileViewport ? 'border-2' : 'border-4'} relative min-h-[52px] ${isCrowdedDesktopHeader ? 'sm:min-w-[108px]' : 'sm:min-w-[120px]'} cursor-pointer group
                                    ${isActive 
                                        ? `border-brand-yellow bg-slate-700 ring-2 ${isCrowdedDesktopHeader ? 'sm:ring-2' : 'sm:ring-4'} ring-yellow-300/30 ${isCrowdedDesktopHeader ? 'sm:scale-[1.03]' : 'sm:scale-110'} z-10` 
                                        : 'border-slate-600 bg-slate-800 opacity-70 hover:opacity-100 hover:border-slate-500'}`}
                                >
                                    <div className="absolute top-1 right-1 bg-slate-100 text-slate-900 p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                        <Edit2 size={12} />
                                    </div>
                                    <span className={`text-[8px] ${isCrowdedDesktopHeader ? 'sm:text-xs' : 'sm:text-sm'} font-bold uppercase tracking-wider mb-0.5 truncate w-full text-center leading-none ${isActive ? 'text-brand-yellow' : 'text-slate-400'}`}>
                                        {name}
                                    </span>
                                    <div className={`font-black text-white font-mono leading-none ${mobileUsesTwoRowHeader ? 'text-base mb-0.5' : 'text-xl mb-1'} ${isCrowdedDesktopHeader ? 'sm:text-3xl' : 'sm:text-4xl'}`}>{teamScore}</div>
                                    <div className="flex gap-0.5">
                                        {[0, 1, 2].map(i => (
                                            <div key={i} className={`${mobileUsesTwoRowHeader ? 'w-1.5 h-1.5' : 'w-2 h-2'} ${isCrowdedDesktopHeader ? 'sm:w-2.5 sm:h-2.5' : 'sm:w-3 sm:h-3'} rounded-full ${strikeCount > i ? 'bg-red-500 shadow-[0_0_8px_red]' : 'bg-slate-900 border border-slate-600'}`}></div>
                                        ))}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="hidden sm:flex gap-2 items-start">
                        <button 
                            onClick={toggleHostMode} 
                            className={`p-3 rounded-lg transition-colors ${hostMode ? 'bg-red-900/50 text-red-400 border border-red-800' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                            title="Host Mode (Click to Preview)"
                        >
                            <Shield size={20} />
                        </button>
                        <div className="flex flex-col gap-2 items-end">
                            <button onClick={() => setIsMuted(!isMuted)} className="p-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors text-slate-300">
                                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </button>
                            <button onClick={toggleFullscreen} className="p-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors text-slate-300">
                                {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. MAIN BOARD AREA (Flex Grow, No Scroll) */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-950 overflow-hidden w-full relative">
                
                {/* QUESTION DISPLAY */}
                <div className="bg-blue-600 text-white px-8 py-3 rounded-2xl border-b-8 border-blue-800 shadow-2xl mb-4 text-center max-w-4xl w-full shrink-0 z-10">
                    <div className="flex flex-col items-center gap-3">
                        {questionImageUrl && (
                            <img
                                src={questionImageUrl}
                                alt={questionImageAlt}
                                onClick={isMobileViewport ? undefined : openImageZoom}
                                onKeyDown={isMobileViewport ? undefined : handleImageKeyDown}
                                role={isMobileViewport ? undefined : 'button'}
                                tabIndex={isMobileViewport ? -1 : 0}
                                title={isMobileViewport ? undefined : 'Click to zoom'}
                                className={`h-36 sm:h-44 md:h-52 w-full rounded-xl object-contain border border-blue-300/40 bg-blue-900/40 shadow-sm ${isMobileViewport ? '' : 'cursor-zoom-in'}`}
                            />
                        )}
                        <h2 className="text-xl md:text-2xl font-display font-black leading-tight drop-shadow-md uppercase tracking-wide whitespace-normal break-words">
                            {currentQ.question}
                        </h2>
                    </div>
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
                                    <div className="absolute inset-0 [backface-visibility:hidden] [transform:translateZ(0)] bg-gradient-to-b from-blue-800 to-blue-950 border-2 border-blue-500 rounded-lg shadow-[0_4px_0_rgba(0,0,0,0.3)] flex items-center justify-center">
                                        <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-blue-950 flex items-center justify-center border-2 border-blue-400 shadow-inner group-hover:scale-110 transition-transform">
                                            <span className="text-xl md:text-3xl font-black text-blue-200">{i + 1}</span>
                                        </div>
                                        {ans.text === "---" && <div className="absolute inset-0 bg-black/60 rounded-lg backdrop-blur-sm flex items-center justify-center text-slate-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Empty</div>}
                                    </div>

                                    {/* BACK (Answer) */}
                                    <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateX(180deg)] bg-gradient-to-b from-slate-100 to-slate-200 border-4 border-white rounded-lg shadow-[0_4px_0_rgba(0,0,0,0.3)] flex items-center justify-between px-3 md:px-6 overflow-hidden">
                                        {ans.text !== "---" ? (
                                            <>
                                                <span
                                                    className={`font-black text-slate-800 uppercase pr-2 drop-shadow-sm flex-1 min-w-0 text-left whitespace-normal break-words leading-[1.1] ${
                                                        ans.text.length > 90 ? 'text-[8px] sm:text-[9px] md:text-xs' :
                                                        ans.text.length > 70 ? 'text-[9px] sm:text-[10px] md:text-sm' :
                                                        ans.text.length > 50 ? 'text-[10px] sm:text-xs md:text-base' :
                                                        ans.text.length > 35 ? 'text-[11px] sm:text-sm md:text-lg' :
                                                        'text-xs sm:text-base md:text-2xl'
                                                    }`}
                                                >
                                                    {ans.text}
                                                </span>
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

            {isImageZoomOpen && questionImageUrl && (
                <div
                    className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={() => setIsImageZoomOpen(false)}
                >
                    <div
                        className="relative w-full max-w-[90vw] max-h-[90vh] flex items-center justify-center overflow-visible"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            onClick={() => setIsImageZoomOpen(false)}
                            className="absolute -top-4 -right-4 bg-white text-slate-900 rounded-full w-9 h-9 flex items-center justify-center shadow-lg"
                            title="Close"
                        >
                            <span className="text-lg font-bold leading-none">X</span>
                        </button>
                        <img
                            src={questionImageUrl}
                            alt={questionImageAlt}
                            onClick={() => setIsImageZoomOpen(false)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    setIsImageZoomOpen(false);
                                }
                            }}
                            role="button"
                            tabIndex={0}
                            title="Click to close"
                            style={{
                                transform: 'scale(2)',
                                transformOrigin: 'center',
                                maxWidth: '25vw',
                                maxHeight: 'calc((100vh - 4rem - env(safe-area-inset-top)) * 0.25)'
                            }}
                            className="rounded-2xl object-contain border border-white/10 shadow-2xl cursor-zoom-out"
                        />
                    </div>
                </div>
            )}

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

            {/* Quit Confirmation Modal */}
            {showQuitConfirm && (
                <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white text-slate-900 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl border border-slate-100">
                        <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Quit current game?</h2>
                        <p className="text-slate-500 mb-6">Your progress will be lost if you haven't saved.</p>
                        <div className="flex space-x-4">
                            <button 
                                onClick={() => setShowQuitConfirm(false)}
                                className="flex-1 py-3 bg-slate-100 font-bold rounded-lg hover:bg-slate-200 transition-colors text-slate-700"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => { setShowQuitConfirm(false); onBack(); }}
                                className="flex-1 py-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors"
                            >
                                Quit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showEndGameConfirm && (
                <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white text-slate-900 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl border border-slate-100">
                        <h2 className="text-2xl font-bold mb-2">End game now?</h2>
                        <p className="text-slate-500 mb-6">The game will stop and move to the winners screen.</p>
                        <div className="flex space-x-4">
                            <button
                                onClick={() => setShowEndGameConfirm(false)}
                                className="flex-1 py-3 bg-slate-100 font-bold rounded-lg hover:bg-slate-200 transition-colors text-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setShowEndGameConfirm(false);
                                    setPhase('gameover');
                                }}
                                className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 transition-colors"
                            >
                                End game
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

