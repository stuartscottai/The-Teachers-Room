
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GeneratedGame, GameRunOptions, GeneratedQuestion } from '../../types';
import { playSound } from '../../utils/gameUtils';
import { ArrowLeft, Maximize2, Minimize2, RotateCcw, X, Check, Trophy, Edit2, Clock, Volume2, VolumeX, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface TriviaGameProps {
    game: GeneratedGame;
    options: GameRunOptions;
    onBack: () => void;
    onFinish: () => void;
    onReplay: () => void;
}

// Sub-component for animated score numbers
const AnimatedScore: React.FC<{ score: number }> = ({ score }) => {
    const [displayScore, setDisplayScore] = useState(score);
    const [diff, setDiff] = useState(0);

    useEffect(() => {
        if (score === displayScore) return;
        
        const difference = score - displayScore;
        setDiff(difference);

        // Animate slowly
        const step = difference > 0 ? Math.ceil(difference / 20) : Math.floor(difference / 20);
        
        const timer = setInterval(() => {
            setDisplayScore(prev => {
                const next = prev + step;
                if ((difference > 0 && next >= score) || (difference < 0 && next <= score)) {
                    clearInterval(timer);
                    setTimeout(() => setDiff(0), 1000); // Clear diff display after 1s
                    return score;
                }
                return next;
            });
        }, 30);

        return () => clearInterval(timer);
    }, [score]);

    return (
        <div className="relative">
            <div className="text-5xl font-black font-mono leading-none tracking-tight transition-all">
                {displayScore}
            </div>
            {diff !== 0 && (
                <div className={`absolute -top-8 left-1/2 -translate-x-1/2 font-bold text-xl animate-bounce
                    ${diff > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {diff > 0 ? '+' : ''}{diff}
                </div>
            )}
        </div>
    );
};

export const TriviaGame: React.FC<TriviaGameProps> = ({ game, options, onBack, onFinish, onReplay }) => {
    const [scores, setScores] = useState<number[]>(Array(options.players).fill(0));
    const [teamNames, setTeamNames] = useState<string[]>(options.teamNames || Array.from({length: options.players}, (_, i) => `Team ${i+1}`));
    const [currentTeam, setCurrentTeam] = useState(0);
    const [activeQuestionIndex, setActiveQuestionIndex] = useState<number | null>(null);
    const [answeredIndices, setAnsweredIndices] = useState<number[]>([]);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isGameOver, setIsGameOver] = useState(false);
    const [showQuitConfirm, setShowQuitConfirm] = useState(false);
    const [mcResult, setMcResult] = useState<'correct' | 'incorrect' | null>(null);
    
    // Lock state to prevent double clicks/points
    const [isProcessing, setIsProcessing] = useState(false);

    
    // Audio State
    const [isMuted, setIsMuted] = useState(options.muted);

    // Team Edit State
    const [editingTeamIndex, setEditingTeamIndex] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editScore, setEditScore] = useState(0);

    // Local state for runtime questions
    const [gameQuestions, setGameQuestions] = useState<GeneratedQuestion[]>([]);

    // Fullscreen logic
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Grid Calculation State
    const [gridDimensions, setGridDimensions] = useState({ width: 100, height: 100 });
    const gridWrapperRef = useRef<HTMLDivElement>(null);

    // Timer
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [isTimesUp, setIsTimesUp] = useState(false);
    const timerRef = useRef<any>(null);

    // BODY SCROLL LOCK
    useEffect(() => {
        const shouldLock = activeQuestionIndex !== null || isGameOver || editingTeamIndex !== null;
        document.body.style.overflow = shouldLock ? 'hidden' : 'auto';
        return () => { document.body.style.overflow = 'auto'; };
    }, [activeQuestionIndex, isGameOver, editingTeamIndex]);

    // Update dimensions using ResizeObserver for robustness
    useEffect(() => {
        if (!gridWrapperRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                 setGridDimensions({
                     width: entry.contentRect.width,
                     height: entry.contentRect.height
                 });
            }
        });
        observer.observe(gridWrapperRef.current);
        return () => observer.disconnect();
    }, []);

    // Clean up fullscreen on unmount
    useEffect(() => {
        return () => {
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(err => console.log(err));
            }
        };
    }, []);

    // Sync fullscreen state if user exits via ESC or browser UI
    useEffect(() => {
        const handleFsChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);

    // Initialize Game Logic (Divisibility & Bonuses)
    useEffect(() => {
        if (!game.questions) return;
        
        // 1. Enforce Divisibility by Players (handled partially by Setup, but confirmed here)
        const rawLimit = options.questionLimit || game.questions.length;
        const validCount = Math.floor(rawLimit / options.players) * options.players;
        
        let pool = JSON.parse(JSON.stringify(game.questions));
        
        // --- RANDOMIZE ---
        if (options.randomizeQuestions) {
            for (let i = pool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pool[i], pool[j]] = [pool[j], pool[i]];
            }
        }

        let questionsCopy = pool.slice(0, validCount);
        
        // 2. Apply Chaos Mode (Bonuses) - 20%
        if (options.enableBonuses) {
            const indices = questionsCopy.map((_: any, i: number) => i);
            // Shuffle indices
            for (let i = indices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [indices[i], indices[j]] = [indices[j], indices[i]];
            }
            
            const bonusCount = Math.max(2, Math.floor(questionsCopy.length * 0.20));
            const bonusTypes = ['double', 'bust', 'steal', 'double'];
            
            for (let i = 0; i < bonusCount; i++) {
                const targetIndex = indices[i];
                if (questionsCopy[targetIndex]) {
                    questionsCopy[targetIndex].isBonus = true;
                    questionsCopy[targetIndex].bonusType = bonusTypes[i % bonusTypes.length];
                }
            }
        }
        setGameQuestions(questionsCopy);
    }, [game, options.enableBonuses, options.questionLimit, options.players, options.randomizeQuestions]);

    // Calculate Optimal Grid Dimensions (Perfect Rectangles Priority)
    const gridStyle = useMemo(() => {
        const count = gameQuestions.length;
        if (count === 0) return {};

        // Find factor pairs that make perfect rectangles
        const pairs: {r: number, c: number, ratio: number}[] = [];
        for (let i = 1; i <= Math.sqrt(count); i++) {
            if (count % i === 0) {
                const r = i;
                const c = count / i;
                // We typically want columns > rows for landscape screens
                pairs.push({ r, c, ratio: c / r });
                if (r !== c) {
                     pairs.push({ r: c, c: r, ratio: r / c });
                }
            }
        }
        
        // If no perfect factors (shouldn't happen with our valid counts, but just in case), fall back
        if (pairs.length === 0) pairs.push({r: 1, c: count, ratio: count});

        const { width, height } = gridDimensions;
        const containerRatio = (width || 1000) / (height || 600);

        // Find the pair closest to the container aspect ratio to maximize tile size
        let bestPair = pairs[0];
        let bestDiff = Infinity;

        pairs.forEach(p => {
            const diff = Math.abs(p.ratio - containerRatio);
            if (diff < bestDiff) {
                bestDiff = diff;
                bestPair = p;
            }
        });

        // Use the rows/cols from the best fit pair
        const bestRows = bestPair.r > bestPair.c && containerRatio > 1 ? bestPair.c : bestPair.r; // Swap if tall but container is wide
        const bestCols = count / bestRows;

        return {
            display: 'grid',
            gridTemplateColumns: `repeat(${bestCols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${bestRows}, minmax(0, 1fr))`, 
            gap: isFullscreen ? '0.5rem' : '0.35rem', 
            width: '100%',
            height: '100%', 
            paddingBottom: '0.5rem'
        };
    }, [gameQuestions.length, gridDimensions, isFullscreen]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Timer Logic
    useEffect(() => {
        if (activeQuestionIndex !== null && !isFlipped && !isGameOver && gameQuestions.length > 0) {
            const q = gameQuestions[activeQuestionIndex];
            if (!q.isBonus) {
                const duration = options.timerSeconds;
                if (duration > 0 && timeLeft > 0) {
                     // Ensure we don't start multiple intervals
                     if (timerRef.current) clearInterval(timerRef.current);
                     
                     timerRef.current = setInterval(() => {
                        setTimeLeft(prev => {
                            if (prev <= 1) {
                                clearInterval(timerRef.current);
                                return 0;
                            }
                            return prev - 1;
                        });
                    }, 1000);
                }
            }
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [activeQuestionIndex, isFlipped, gameQuestions, options.timerSeconds, isGameOver]);

    // Check for Time's Up Detection
    useEffect(() => {
        if (timeLeft === 0 && options.timerSeconds > 0 && activeQuestionIndex !== null && !isFlipped && !isTimesUp && !isGameOver) {
            setIsTimesUp(true);
            playSound('times-up', isMuted, options.soundConfig?.timesUp);
        }
    }, [timeLeft, options.timerSeconds, activeQuestionIndex, isFlipped, isTimesUp, isGameOver, isMuted, options.soundConfig]);

    const handleCardClick = (index: number) => {
        if (answeredIndices.includes(index) || isProcessing) return;
        
        const q = gameQuestions[index];
        if (q.isBonus) {
            playSound('bonus', isMuted, options.soundConfig?.bonus);
        } else {
            playSound('select', isMuted, options.soundConfig?.select);
        }
        
        // Initialize timer immediately to avoid 0 flash
        setTimeLeft(options.timerSeconds);
        setIsTimesUp(false);
        setMcResult(null);
        setIsProcessing(false); // Reset lock for new question
        setActiveQuestionIndex(index);
        setIsFlipped(false);
    };

    const handleAnswer = (correct: boolean) => {
        if (activeQuestionIndex === null || isProcessing) return;
        setIsProcessing(true);
        
        playSound(correct ? 'correct' : 'incorrect', isMuted, correct ? options.soundConfig?.correct : options.soundConfig?.incorrect);
        
        const q = gameQuestions[activeQuestionIndex];
        const points = q.points || 100;
        const newScores = [...scores];
        
        if (correct) {
            newScores[currentTeam] += points;
        } else {
            newScores[currentTeam] -= points;
        }
        
        setScores(newScores);
        finalizeTurn();
    };

    const handleMcSelect = (selectedOption: string) => {
        if (activeQuestionIndex === null) return;
        const q = gameQuestions[activeQuestionIndex];
        
        // Normalize Strings (remove "A) ", trim, lowercase)
        const clean = (s: string) => s.replace(/^[A-Z]\)\s*/i, '').trim().toLowerCase();
        
        const isCorrect = clean(selectedOption) === clean(q.answer);
        
        setMcResult(isCorrect ? 'correct' : 'incorrect');
        setIsFlipped(true);
    };

    const handleBonusAction = () => {
        if (activeQuestionIndex === null || isProcessing) return;
        setIsProcessing(true);
        
        const q = gameQuestions[activeQuestionIndex];
        const newScores = [...scores];
        const points = q.points || 100;

        if (q.bonusType === 'double') {
            newScores[currentTeam] += (points * 2);
        } else if (q.bonusType === 'bust') {
            newScores[currentTeam] -= points;
        } else if (q.bonusType === 'steal') {
             let victimIdx = -1;
             let maxS = -Infinity;
             scores.forEach((s, i) => {
                 if (i !== currentTeam && s > maxS) {
                     maxS = s;
                     victimIdx = i;
                 }
             });

             if (victimIdx !== -1) {
                 newScores[victimIdx] -= points;
                 newScores[currentTeam] += points;
             } else {
                 newScores[currentTeam] += points;
             }
        }
        
        setScores(newScores);
        finalizeTurn();
    };

    const finalizeTurn = () => {
        if (activeQuestionIndex !== null) {
            setAnsweredIndices(prev => {
                // Prevent duplicates
                if (prev.includes(activeQuestionIndex)) return prev;
                return [...prev, activeQuestionIndex];
            });
        }
        setIsTimesUp(false);
        setTimeout(() => {
            setActiveQuestionIndex(null);
            setCurrentTeam((prev) => (prev + 1) % options.players);
            setIsProcessing(false); // Unlock for next turn
        }, 1500);
    };

    // Edit Team Handler
    const openEditTeam = (index: number) => {
        setEditingTeamIndex(index);
        setEditName(teamNames[index]);
        setEditScore(scores[index]);
    };

    const saveTeamEdit = () => {
        if (editingTeamIndex === null) return;
        const newNames = [...teamNames];
        newNames[editingTeamIndex] = editName;
        setTeamNames(newNames);
        const newScores = [...scores];
        newScores[editingTeamIndex] = editScore;
        setScores(newScores);
        setEditingTeamIndex(null);
    };

    // Check Winner
    useEffect(() => {
        if (gameQuestions.length > 0 && answeredIndices.length === gameQuestions.length && !isGameOver) {
            playSound('win', isMuted, options.soundConfig?.win);
            setIsGameOver(true);
        }
    }, [answeredIndices, gameQuestions, isGameOver, isMuted, options.soundConfig]);

    // Helper for dynamic font size to avoid scrollbars on cards
    const getQuestionFontSizeClass = (text: string) => {
        const len = text ? text.length : 0;
        if (len < 30) return 'text-6xl md:text-7xl';
        if (len < 60) return 'text-5xl md:text-6xl';
        if (len < 110) return 'text-4xl md:text-5xl';
        if (len < 180) return 'text-3xl md:text-4xl';
        if (len < 260) return 'text-2xl md:text-3xl';
        if (len < 360) return 'text-xl md:text-2xl';
        return 'text-lg md:text-xl';
    };

    const getAnswerFontSizeClass = (text: string) => {
        const len = text ? text.length : 0;
        if (len < 30) return 'text-6xl md:text-7xl';
        if (len < 70) return 'text-5xl md:text-6xl';
        if (len < 130) return 'text-4xl md:text-5xl';
        if (len < 200) return 'text-3xl md:text-4xl';
        if (len < 300) return 'text-2xl md:text-3xl';
        if (len < 420) return 'text-xl md:text-2xl';
        return 'text-lg md:text-xl';
    };

    const getBonusEffectSizeClass = (text: string) => {
        const len = text ? text.length : 0;
        if (len < 14) return 'text-7xl md:text-8xl';
        if (len < 22) return 'text-6xl md:text-7xl';
        return 'text-5xl md:text-6xl';
    };

    const getBonusDetailSizeClass = (text: string) => {
        const len = text ? text.length : 0;
        if (len < 60) return 'text-3xl md:text-4xl';
        if (len < 120) return 'text-2xl md:text-3xl';
        return 'text-xl md:text-2xl';
    };

    // Helper for option font size - Conservative to prevent overflow
    const getOptionFontSizeClass = (text: string) => {
        const len = text ? text.length : 0;
        if (len < 20) return 'text-3xl md:text-5xl';
        if (len < 35) return 'text-2xl md:text-4xl';
        if (len < 60) return 'text-xl md:text-3xl';
        return 'text-lg md:text-2xl';
    };

    if (gameQuestions.length === 0) return <div className="text-slate-500 text-center p-8">Loading Game...</div>;

    // Winner Screen with Podium
    if (isGameOver) {
        // Calculate Winners
        const maxScore = Math.max(...scores);
        const winners = scores.map((s, i) => s === maxScore ? { name: teamNames[i], score: s, id: i } : null).filter(Boolean) as {name: string, score: number, id: number}[];
        const isTie = winners.length > 1;

        // Rank others for 2nd/3rd
        const otherTeams = scores
            .map((score, index) => ({ name: teamNames[index], score, id: index }))
            .filter(t => t.score < maxScore)
            .sort((a, b) => b.score - a.score);
        
        const second = otherTeams[0];
        const third = otherTeams[1];

        return (
            <div className="fixed inset-0 bg-gradient-to-br from-sky-50 to-indigo-100 z-[300] flex flex-col items-center justify-center overflow-hidden">
                {/* Realistic 3D Confetti CSS */}
                <style>
                    {`
                    @keyframes confetti-fall {
                        0% { transform: translateY(-10vh) translateX(0) rotate3d(1, 1, 1, 0deg); opacity: 1; }
                        25% { transform: translateY(25vh) translateX(20px) rotate3d(1, 1, 1, 90deg); }
                        50% { transform: translateY(50vh) translateX(-20px) rotate3d(1, 1, 1, 180deg); }
                        75% { transform: translateY(75vh) translateX(20px) rotate3d(1, 1, 1, 270deg); }
                        100% { transform: translateY(110vh) translateX(0) rotate3d(1, 1, 1, 360deg); opacity: 0; }
                    }
                    .confetti-piece {
                        position: absolute;
                        animation: confetti-fall 4s linear infinite;
                        box-shadow: 1px 1px 2px rgba(0,0,0,0.2);
                    }
                    `}
                </style>
                
                {/* Confetti Particles */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {Array.from({length: 150}).map((_, i) => (
                        <div key={i} className="confetti-piece" style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * -20}%`,
                            backgroundColor: ['#FACC15', '#0EA5E9', '#FB923C', '#22C55E', '#EC4899', '#FFF'][Math.floor(Math.random() * 6)],
                            width: `${Math.random() * 12 + 6}px`,
                            height: `${Math.random() * 18 + 6}px`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${Math.random() * 2 + 3}s`,
                            opacity: Math.random() + 0.5
                        }} />
                    ))}
                </div>
                
                <div className="relative z-10 w-full max-w-6xl px-4 flex flex-col items-center justify-start md:justify-center h-full overflow-hidden pt-36 md:pt-32 pb-12">
                    <h1 className="font-display text-5xl md:text-7xl font-black mb-8 text-slate-800 drop-shadow-xl animate-fade-in tracking-widest uppercase text-center break-words w-full px-4" style={{ textShadow: '4px 4px 0px #fff' }}>
                        {isTie ? "It's a Tie!" : "Winner!"}
                    </h1>

                    {/* PODIUM */}
                    <div className="flex items-end justify-center gap-4 md:gap-8 mb-12 w-full max-w-4xl flex-wrap md:flex-nowrap flex-shrink-0">
                        
                        {/* 2ND PLACE */}
                        {second && (
                            <div className="flex flex-col items-center order-2 md:order-1 w-1/3 md:w-1/4 animate-[slide-up_1s_ease-out]">
                                <div className="text-slate-600 font-bold text-xl md:text-2xl mb-2 text-center drop-shadow-sm truncate w-full">{second.name}</div>
                                <div className="w-full h-24 md:h-48 bg-gradient-to-b from-slate-200 to-slate-300 rounded-t-xl flex items-center justify-center border-t-4 border-white/50 relative shadow-xl">
                                     <span className="text-6xl md:text-7xl font-black text-slate-400 opacity-50">2</span>
                                </div>
                                <div className="bg-white px-4 py-2 rounded-b-xl mt-2 text-slate-600 font-mono text-xl md:text-3xl font-bold border border-slate-200 min-w-[80px] text-center shadow-md">
                                    {second.score}
                                </div>
                            </div>
                        )}

                        {/* 1ST PLACE (Winner or Tie) */}
                        <div className="flex flex-col items-center order-1 md:order-2 w-full md:w-1/3 z-20 animate-[slide-up_0.8s_ease-out]">
                             <Trophy size={80} className="text-brand-yellow mb-4 animate-pulse drop-shadow-xl" />
                             
                             <div className="flex flex-col items-center w-full">
                                {winners.map((w, idx) => (
                                    <div key={idx} className="text-brand-blue font-bold text-3xl md:text-5xl mb-2 text-center drop-shadow-sm w-full leading-tight">
                                        {w.name} {idx < winners.length - 1 && <span className="text-slate-400 text-2xl">&</span>}
                                    </div>
                                ))}
                             </div>

                             <div className="w-full h-40 md:h-72 bg-gradient-to-b from-brand-yellow to-yellow-500 rounded-t-xl flex items-center justify-center border-t-8 border-yellow-200 relative shadow-2xl shadow-yellow-500/20 mt-4">
                                 <span className="text-8xl md:text-9xl font-black text-white opacity-40">1</span>
                             </div>
                             <div className="bg-white px-6 py-3 rounded-b-2xl mt-2 text-brand-yellow font-mono text-4xl md:text-6xl font-black border-2 border-yellow-100 min-w-[120px] text-center shadow-lg">
                                {maxScore}
                             </div>
                        </div>

                        {/* 3RD PLACE */}
                        {third && (
                            <div className="flex flex-col items-center order-3 w-1/3 md:w-1/4 animate-[slide-up_1.2s_ease-out]">
                                <div className="text-orange-800 font-bold text-xl md:text-2xl mb-2 text-center drop-shadow-sm truncate w-full">{third.name}</div>
                                <div className="w-full h-16 md:h-36 bg-gradient-to-b from-orange-300 to-orange-400 rounded-t-xl flex items-center justify-center border-t-4 border-orange-200 relative shadow-xl">
                                     <span className="text-5xl md:text-6xl font-black text-orange-800 opacity-30">3</span>
                                </div>
                                <div className="bg-white px-4 py-2 rounded-b-xl mt-2 text-orange-500 font-mono text-xl md:text-3xl font-bold border border-slate-200 min-w-[80px] text-center shadow-md">
                                    {third.score}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4 mb-8 flex-shrink-0">
                        <button 
                            onClick={onReplay} 
                            className="px-12 py-5 bg-brand-blue text-white rounded-full font-bold text-2xl hover:bg-sky-600 hover:scale-105 transition-all shadow-xl hover:shadow-2xl border-2 border-brand-blue flex items-center"
                        >
                            <RefreshCw size={24} className="mr-3" /> Play Again
                        </button>
                        <button 
                            onClick={onFinish} 
                            className="px-12 py-5 bg-white text-slate-800 rounded-full font-bold text-2xl hover:bg-slate-50 hover:scale-105 transition-all shadow-xl hover:shadow-2xl border-2 border-slate-100"
                        >
                            Back to Library
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const activeQ = activeQuestionIndex !== null ? gameQuestions[activeQuestionIndex] : null;
    const isBonus = activeQ?.isBonus;
    const hasOptions = activeQ?.options && activeQ.options.length > 0;
    const isPositiveBonus = activeQ?.bonusType === 'double' || activeQ?.bonusType === 'steal';
    const isNegativeBonus = activeQ?.bonusType === 'bust';
    const bonusEffectText =
        activeQ?.bonusType === 'double' ? 'DOUBLE POINTS!' :
        activeQ?.bonusType === 'bust' ? 'OH NO! BUSTED!' :
        activeQ?.bonusType === 'steal' ? 'POINT STEAL!' : '';
    const bonusDetailText =
        activeQ?.bonusType === 'double' ? `You get 2x points (+${(activeQ?.points || 100) * 2}) automatically!` :
        activeQ?.bonusType === 'bust' ? `You lose the value of this tile (-${activeQ?.points || 100}).` :
        activeQ?.bonusType === 'steal' ? "Steal this tile's value from the current leader!" : '';

    return (
        <div ref={containerRef} className={`bg-sky-50 flex flex-col ${isFullscreen ? 'h-screen' : 'h-[calc(100vh-4rem)]'} overflow-hidden transition-all duration-300 relative`}>
            <style>
                {`
                @keyframes bonus-pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(0.97); }
                }
                @keyframes bonus-shimmer {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 200% 50%; }
                }
                .bonus-pulse {
                    animation: bonus-pulse 2.2s ease-in-out infinite;
                    will-change: transform;
                }
                .bonus-glow {
                    box-shadow: 0 0 30px rgba(250, 204, 21, 0.45), inset 0 0 20px rgba(255, 255, 255, 0.2);
                }
                .bonus-sparkle {
                    background-image:
                        radial-gradient(circle at 20% 20%, rgba(255,255,255,0.25) 0%, transparent 55%),
                        radial-gradient(circle at 80% 30%, rgba(255,255,255,0.18) 0%, transparent 60%),
                        radial-gradient(circle at 50% 80%, rgba(255,255,255,0.12) 0%, transparent 55%);
                }
                .bonus-shine {
                    background-image:
                        linear-gradient(120deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 35%, transparent 60%),
                        linear-gradient(330deg, rgba(255,255,255,0.18) 0%, transparent 55%);
                }
                .bonus-shimmer {
                    background-size: 200% 100%;
                    animation: bonus-shimmer 2.6s linear infinite;
                }
                `}
            </style>
            
            {/* 1. FIXED HEADER (Scoreboard) - Z-Index 250 */}
            <div className="bg-white p-4 shrink-0 z-[250] shadow-sm flex justify-between items-center gap-4 min-h-[140px] border-b border-slate-200 relative">
                <div className="flex flex-col items-start gap-2 min-w-[140px]">
                    <button 
                        onClick={() => setShowQuitConfirm(true)} 
                        className="text-slate-500 hover:text-red-600 flex items-center text-sm bg-slate-100 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors font-bold border border-slate-200"
                    >
                        <ArrowLeft size={16} className="mr-2" /> Quit
                    </button>
                    <h1 className="text-slate-800 font-display font-bold text-lg truncate max-w-[200px] hidden md:block opacity-80">{game.title}</h1>
                </div>
                
                {/* Scoreboard Cards */}
                <div className="flex-1 flex justify-center gap-4 overflow-x-auto no-scrollbar px-4 h-full items-center">
                    {scores.map((score, idx) => (
                        <button 
                            key={idx} 
                            onClick={() => openEditTeam(idx)}
                            className={`px-6 py-3 rounded-xl text-center transition-all border-b-4 min-w-[150px] relative group h-28 flex flex-col justify-center items-center shadow-sm
                                ${currentTeam === idx 
                                    ? 'bg-brand-blue border-sky-600 text-white shadow-lg scale-110 ring-4 ring-sky-100 z-10' 
                                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'}`}
                        >
                            <div className="text-lg uppercase font-bold tracking-wider truncate max-w-[130px] mb-1 flex items-center gap-1">
                                {teamNames[idx]}
                                {currentTeam === idx && <div className="w-2 h-2 rounded-full bg-brand-yellow animate-pulse ml-1"></div>}
                            </div>
                            <AnimatedScore score={score} />
                            
                            {/* Hover Edit Icon */}
                            <div className="absolute top-2 right-2 bg-slate-100 text-slate-900 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Edit2 size={12} />
                            </div>
                        </button>
                    ))}
                </div>

                <div className="flex items-center justify-end min-w-[140px] gap-2">
                    <button 
                        onClick={() => setIsMuted(!isMuted)} 
                        className="text-slate-400 hover:text-brand-blue p-3 bg-slate-100 hover:bg-sky-50 rounded-xl transition-colors border border-slate-200"
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                         {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                    </button>
                    <button onClick={toggleFullscreen} className="text-slate-400 hover:text-brand-blue p-3 bg-slate-100 hover:bg-sky-50 rounded-xl transition-colors border border-slate-200">
                        {isFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
                    </button>
                </div>
            </div>

            {/* 2. MAIN GRID AREA */}
            <div ref={gridWrapperRef} className="flex-grow w-full h-full relative p-2 overflow-hidden flex flex-col items-center justify-center z-10">
                <div className="w-full h-full">
                     <div style={gridStyle}>
                        {gameQuestions.map((q, idx) => {
                            const isAnswered = answeredIndices.includes(idx);
                            
                            // Vibrant colors
                            const styles = [
                                { bg: 'bg-sky-500', border: 'border-sky-700', text: 'text-white' },
                                { bg: 'bg-yellow-400', border: 'border-yellow-600', text: 'text-slate-900' },
                                { bg: 'bg-emerald-500', border: 'border-emerald-700', text: 'text-white' },
                                { bg: 'bg-violet-500', border: 'border-violet-700', text: 'text-white' },
                                { bg: 'bg-orange-500', border: 'border-orange-700', text: 'text-white' },
                            ];
                            const style = styles[idx % styles.length];

                            return (
                                <button
                                    key={idx}
                                    disabled={isAnswered}
                                    onClick={() => handleCardClick(idx)}
                                    className={`
                                        w-full h-full rounded-lg font-display font-black shadow-md relative overflow-hidden flex flex-col items-center justify-center
                                        border-b-[4px] active:border-b-0 active:translate-y-[4px]
                                        transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                                        ${gameQuestions.length > 20 ? 'text-3xl md:text-5xl' : 'text-5xl md:text-8xl'}
                                        ${isAnswered 
                                            ? 'bg-slate-200 border-slate-300 text-slate-400 shadow-none cursor-default border-b-0 translate-y-[2px]' 
                                            : `${style.bg} ${style.border} ${style.text} hover:bg-white hover:text-slate-900 hover:border-slate-300 hover:scale-110 z-10 hover:z-50 hover:shadow-2xl`}
                                    `}
                                >
                                    <span className="relative z-10 drop-shadow-md">{idx + 1}</span>
                                    {!isAnswered && (
                                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 3. TEAM EDIT MODAL */}
            {editingTeamIndex !== null && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-fade-in border border-slate-100">
                        <h3 className="text-xl font-bold text-slate-800 mb-4">Edit Team Details</h3>
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Team Name</label>
                            <input 
                                type="text" 
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none font-bold text-lg"
                            />
                        </div>
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Score Override</label>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setEditScore(s => s - 50)} className="p-2 bg-slate-100 rounded hover:bg-slate-200">-50</button>
                                <input 
                                    type="number" 
                                    value={editScore}
                                    onChange={(e) => setEditScore(parseInt(e.target.value) || 0)}
                                    className="flex-1 p-3 border border-slate-200 rounded-lg text-center font-mono font-bold text-xl"
                                />
                                <button onClick={() => setEditScore(s => s + 50)} className="p-2 bg-slate-100 rounded hover:bg-slate-200">+50</button>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setEditingTeamIndex(null)}
                                className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={saveTeamEdit}
                                className="flex-1 py-3 bg-brand-blue text-white font-bold rounded-lg hover:bg-sky-600"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. ACTIVE QUESTION OVERLAY */}
            {activeQ && (
                <div className="absolute inset-0 z-[200] flex items-center justify-center bg-slate-900/50 backdrop-blur-md p-4 animate-fade-in pt-[150px] overflow-hidden">
                    
                    <div className="w-full max-w-6xl aspect-[16/9] max-h-full [perspective:1000px]">
                        <div 
                            className={`relative w-full h-full transition-all duration-700 [transform-style:preserve-3d] 
                            ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
                        >
                            {/* FRONT (QUESTION) */}
                            <div className={`absolute inset-0 [backface-visibility:hidden] rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full
                                ${isBonus ? 'relative bg-gradient-to-br from-purple-700 via-purple-600 to-indigo-700 border-4 border-yellow-300/80 bonus-glow bonus-pulse' : 'bg-white'} ${isFlipped ? 'pointer-events-none' : ''}`}>
                                
                                {isBonus ? (
                                    <div
                                        className="relative p-8 md:p-12 text-center flex flex-col items-center justify-center h-full cursor-pointer"
                                        onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }}
                                        title="Reveal bonus"
                                    >
                                        <div className="absolute inset-0 bonus-sparkle bonus-shine opacity-60 pointer-events-none"></div>
                                        <div className="bonus-shimmer text-transparent bg-clip-text bg-gradient-to-r from-yellow-100 via-amber-300 to-yellow-200 font-display font-black text-7xl md:text-9xl tracking-[0.15em] drop-shadow-[0_8px_20px_rgba(250,204,21,0.6)]">
                                            BONUS
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* HEADER BAR (Blue) */}
                                        <div className="bg-brand-blue text-white p-4 flex justify-between items-center h-20 flex-shrink-0 relative z-10">
                                             <div className="font-bold text-xl opacity-80">Question {activeQuestionIndex! + 1}</div>
                                             <div className="font-black text-4xl">{activeQ.points || 100}</div>
                                             <div className="font-bold text-xl opacity-80">{teamNames[currentTeam]}</div>
                                        </div>

                                        {/* CONTENT BODY (White) - Scrollable */}
                                        <div className="bg-white flex-grow w-full flex flex-col p-8 relative overflow-hidden z-0">
                                            {/* Scrollable Content Container */}
                                            <div className="flex-1 overflow-hidden flex flex-col items-center justify-center w-full min-h-0">
                                                 <div className={`font-display font-bold text-slate-800 leading-tight text-center w-full whitespace-pre-wrap break-words ${getQuestionFontSizeClass(activeQ.question)}`}>
                                                    {activeQ.question}
                                                </div>
                                            </div>

                                            {/* Multiple Choice Buttons - Fixed at bottom of the body */}
                                            {hasOptions && !isFlipped && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-5xl mt-6 flex-shrink-0 relative z-10">
                                                    {(() => {
                                                        const longestText = activeQ.options!.reduce((a, b) => a.length > b.length ? a : b, '');
                                                        const uniformSize = getOptionFontSizeClass(longestText);
                                                        
                                                        return activeQ.options!.map((opt, i) => (
                                                        <button 
                                                            key={i}
                                                            onClick={(e) => { e.stopPropagation(); handleMcSelect(opt); }}
                                                            className={`p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-brand-yellow hover:border-yellow-400 hover:text-slate-900 transition-all text-center shadow-sm flex items-center justify-center min-h-[80px] ${uniformSize} cursor-pointer relative z-50`}
                                                        >
                                                            {opt}
                                                        </button>
                                                    ))})()}
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* FOOTER BAR (Blue/Gradient/Red) */}
                                        <div className={`h-24 flex items-center justify-center relative z-50 flex-shrink-0 transition-colors duration-300 
                                            ${isTimesUp ? 'bg-red-600' : 'bg-gradient-to-r from-brand-blue to-sky-500'}`}>
                                            
                                            {/* Timer Overlay (Only if not Time's Up) */}
                                            {options.timerSeconds > 0 && timeLeft > 0 && !isTimesUp && (
                                                <div className="absolute inset-0 bg-black/10 flex items-center justify-start pointer-events-none">
                                                    <div 
                                                        className="h-full bg-white/20 transition-all duration-1000"
                                                        style={{ width: `${(timeLeft / options.timerSeconds) * 100}%` }}
                                                    />
                                                </div>
                                            )}
                                            
                                            {!hasOptions && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }}
                                                    className="bg-white text-brand-blue px-12 py-3 rounded-full font-bold text-xl shadow-lg hover:scale-105 transition-transform relative z-50 flex items-center cursor-pointer"
                                                >
                                                    Check
                                                </button>
                                            )}

                                            {/* Clock Display or TIME'S UP Text */}
                                            {options.timerSeconds > 0 && (
                                                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-white font-mono font-bold text-3xl opacity-80 flex items-center pointer-events-none">
                                                    {isTimesUp ? (
                                                        <span className="animate-pulse font-black text-white drop-shadow-md">TIME'S UP!</span>
                                                    ) : (
                                                        <><Clock size={24} className="mr-2" /> {timeLeft}</>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* BACK (ANSWER) */}
                            <div className={`absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full
                                ${isBonus ? (isPositiveBonus ? 'bg-gradient-to-br from-yellow-100 via-amber-200 to-yellow-300 border-4 border-yellow-300/80 bonus-glow bonus-shimmer' : 'bg-gradient-to-br from-red-200 via-rose-200 to-red-300 border-4 border-red-300') : 'bg-slate-50'} ${!isFlipped ? 'pointer-events-none' : ''}`}>
                                
                                {isBonus ? (
                                    <div className="flex-grow flex flex-col items-center justify-center p-8 md:p-12 text-center overflow-hidden">
                                        <div className="w-full flex flex-col items-center justify-center gap-6">
                                            <div className={`font-display font-black leading-tight break-words ${isNegativeBonus ? 'text-red-900' : 'text-slate-800'} ${getBonusEffectSizeClass(bonusEffectText)}`}>
                                                {bonusEffectText}
                                            </div>
                                            <div className={`font-semibold leading-tight break-words max-w-5xl ${isNegativeBonus ? 'text-red-800' : 'text-slate-700'} ${getBonusDetailSizeClass(bonusDetailText)}`}>
                                                {bonusDetailText}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleBonusAction(); }}
                                            className={`mt-6 px-10 py-4 ${isNegativeBonus ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'} text-white rounded-xl font-bold text-xl transition-colors shadow-lg cursor-pointer relative z-50`}
                                        >
                                            Apply Effect
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {/* HEADER (Gray) */}
                                        <div className="bg-slate-200 text-slate-600 p-4 flex justify-between items-center h-20 flex-shrink-0 relative z-10">
                                            <div className="font-bold text-xl opacity-80">Answer</div>
                                            
                                            {/* ALWAYS SHOW FLIP BACK BUTTON */}
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}
                                                className="p-2 bg-white rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer relative z-50"
                                                title="Flip back to question"
                                            >
                                                <RotateCcw size={20} />
                                            </button>
                                        </div>

                                        {/* CONTENT (White) */}
                                        <div className="flex-grow flex flex-col items-center justify-center p-12 bg-white text-center overflow-hidden w-full relative z-0">
                                            <div className="flex-1 overflow-hidden flex flex-col items-center justify-center w-full min-h-0">
                                                {/* Multiple Choice Result UI */}
                                                {hasOptions && mcResult ? (
                                                    <div className="animate-bounce mb-8">
                                                        {mcResult === 'correct' ? (
                                                            <div className="flex flex-col items-center">
                                                                <CheckCircle size={80} className="text-green-500 mb-4" />
                                                                <h2 className="text-6xl font-black text-green-500 uppercase tracking-widest">Correct!</h2>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center">
                                                                <XCircle size={80} className="text-red-500 mb-4" />
                                                                <h2 className="text-6xl font-black text-red-500 uppercase tracking-widest">Incorrect</h2>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : null}

                                                <div className={`font-display font-bold text-slate-800 leading-tight whitespace-pre-wrap break-words ${getAnswerFontSizeClass(activeQ.answer)}`}>
                                                    {activeQ.answer}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* FOOTER (Buttons) */}
                                        <div className="h-24 flex flex-shrink-0 relative z-50">
                                            {hasOptions ? (
                                                // Multiple Choice Footer
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleAnswer(mcResult === 'correct'); }}
                                                    className={`flex-1 text-white font-bold text-2xl transition-colors flex items-center justify-center border-t-4 active:border-t-0 cursor-pointer relative z-50
                                                        ${mcResult === 'correct' 
                                                            ? 'bg-green-500 hover:bg-green-600 border-green-700' 
                                                            : 'bg-red-500 hover:bg-red-600 border-red-700'}`}
                                                >
                                                    Continue
                                                </button>
                                            ) : (
                                                // Standard Footer
                                                <>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleAnswer(false); }}
                                                        className="flex-1 bg-red-500 text-white font-bold text-2xl hover:bg-red-600 transition-colors flex items-center justify-center border-t-4 border-red-700 active:border-t-0 cursor-pointer relative z-50"
                                                    >
                                                        <X size={32} className="mr-3" /> Oops
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleAnswer(true); }}
                                                        className="flex-1 bg-green-500 text-white font-bold text-2xl hover:bg-green-600 transition-colors flex items-center justify-center border-t-4 border-green-700 active:border-t-0 cursor-pointer relative z-50"
                                                    >
                                                        <Check size={32} className="mr-3" /> OK
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 5. QUIT CONFIRM */}
            {showQuitConfirm && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white text-slate-900 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl border border-slate-100">
                        <h2 className="text-2xl font-bold mb-2">Quit current game?</h2>
                        <p className="text-slate-500 mb-6">Unsaved progress will be lost.</p>
                        <div className="flex space-x-4">
                            <button 
                                onClick={() => setShowQuitConfirm(false)}
                                className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors"
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
        </div>
    );
};
