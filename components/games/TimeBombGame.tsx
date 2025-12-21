
import React, { useState, useEffect, useRef } from 'react';
import { GeneratedGame, GameRunOptions, GeneratedQuestion } from '../../types';
import { playSound } from '../../utils/gameUtils';
import { ArrowLeft, Volume2, VolumeX, Maximize2, Minimize2, AlertTriangle, Heart, Zap, Trophy, RefreshCw, CheckCircle, XCircle, RotateCcw, Clock, Play, SkipForward, Pause, Skull } from 'lucide-react';

interface TimeBombGameProps {
    game: GeneratedGame;
    options: GameRunOptions;
    onBack: () => void;
    onFinish: () => void;
    onReplay: () => void;
}

export const TimeBombGame: React.FC<TimeBombGameProps> = ({ game, options, onBack, onFinish, onReplay }) => {
    // Game State
    const [teamNames] = useState<string[]>(options.teamNames || Array.from({length: options.players}, (_, i) => `Team ${i+1}`));
    const [teamLives, setTeamLives] = useState<number[]>(Array(options.players).fill(options.teamLives || 3));
    const [activeTeamIndex, setActiveTeamIndex] = useState(0);
    const [isEliminated, setIsEliminated] = useState<boolean[]>(Array(options.players).fill(false));
    
    // Timer State
    const [bombTime, setBombTime] = useState(options.bombDuration || 60);
    const [isTicking, setIsTicking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isExploded, setIsExploded] = useState(false);
    const [gameState, setGameState] = useState<'intro' | 'play' | 'exploded' | 'gameover'>('intro');
    
    // Questions
    const [questions] = useState<GeneratedQuestion[]>(game.questions || []);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [usedQuestionIds, setUsedQuestionIds] = useState<number[]>([]);

    // Card State
    const [isFlipped, setIsFlipped] = useState(false);
    const [disabledOptions, setDisabledOptions] = useState<number[]>([]); // For MC

    // Audio & UI
    const [isMuted, setIsMuted] = useState(options.muted);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<any>(null);
    const [showQuitConfirm, setShowQuitConfirm] = useState(false);
    const [showExplosionModal, setShowExplosionModal] = useState(false);

    // Fuse Ref for Spark Calculation
    const fusePathRef = useRef<SVGPathElement>(null);
    const [sparkPos, setSparkPos] = useState({ x: 160, y: 10 }); // Default start pos matches SVG path start

    // Initial Question Setup
    const currentQuestion = questions[currentQuestionIndex];
    const hasOptions = currentQuestion?.options && currentQuestion.options.length > 0;

    // Scroll Lock
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    // Fullscreen Handling
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // --- GAMEPLAY LOGIC ---

    const handleExplosion = () => {
        setIsTicking(false);
        setIsExploded(true);
        setGameState('exploded');
        playSound('incorrect', isMuted, 'Explosion'); 

        // Deduct Life immediately
        setTeamLives(prev => {
            const newLives = [...prev];
            newLives[activeTeamIndex] -= 1;
            return newLives;
        });

        // Show Modal instead of auto-continuing
        setShowExplosionModal(true);
    };

    const handleContinueAfterExplosion = () => {
        setShowExplosionModal(false);
        checkElimination();
    };

    // Ref to hold the latest version of handleExplosion to avoid stale closures in setInterval
    const handleExplosionRef = useRef(handleExplosion);
    useEffect(() => {
        handleExplosionRef.current = handleExplosion;
    });

    // Timer Logic
    useEffect(() => {
        if (isTicking && !isPaused && bombTime > 0) {
            timerRef.current = setInterval(() => {
                setBombTime(prev => {
                    if (prev <= 0.1) { // Precision check
                        clearInterval(timerRef.current);
                        if (handleExplosionRef.current) handleExplosionRef.current();
                        return 0;
                    }
                    return prev - 0.1; // 100ms ticks for smoothness
                });
            }, 100);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [isTicking, isPaused]);

    // Spark Position Logic (Follows Fuse)
    useEffect(() => {
        if (fusePathRef.current && bombTime > 0) {
            const max = options.bombDuration || 60;
            const length = fusePathRef.current.getTotalLength();
            // Adjust ratio to match visual fuse length
            const ratio = Math.max(0, Math.min(1, bombTime / max));
            const point = fusePathRef.current.getPointAtLength(length * ratio);
            
            setSparkPos({ x: point.x, y: point.y });
        }
    }, [bombTime, options.bombDuration]);

    const checkElimination = () => {
        setTeamLives(currentLives => {
            const activeLife = currentLives[activeTeamIndex];
            if (activeLife <= 0) {
                setIsEliminated(prev => {
                    const newElim = [...prev];
                    newElim[activeTeamIndex] = true;
                    return newElim;
                });
            }
            return currentLives;
        });

        // Small delay to allow state update before checking winner
        setTimeout(() => {
            setTeamLives(finalLives => {
                const survivors = finalLives.map((l, i) => l > 0).filter(Boolean).length;
                if (survivors <= 1 && options.players > 1) {
                    setGameState('gameover');
                    playSound('win', isMuted);
                } else {
                    passBombToNextSurvivor();
                    setBombTime(options.bombDuration || 60);
                    setIsExploded(false);
                    setGameState('play');
                    setIsTicking(true);
                    nextQuestion();
                }
                return finalLives;
            });
        }, 300);
    };

    const passBombToNextSurvivor = () => {
        setActiveTeamIndex(prev => {
            let nextIndex = (prev + 1) % options.players;
            let loops = 0;
            while (loops < options.players) {
                if (teamLives[nextIndex] > 0) return nextIndex;
                nextIndex = (nextIndex + 1) % options.players;
                loops++;
            }
            return nextIndex; 
        });
    };

    const nextQuestion = () => {
        setIsFlipped(false);
        setDisabledOptions([]); // Reset MC state
        
        const available = questions.filter(q => !usedQuestionIds.includes(q.id));
        
        if (available.length === 0) {
            setUsedQuestionIds([]);
            // Restart
            if (options.randomizeQuestions) {
                setCurrentQuestionIndex(Math.floor(Math.random() * questions.length));
            } else {
                setCurrentQuestionIndex(0);
            }
        } else {
            let nextQ: GeneratedQuestion;
            if (options.randomizeQuestions) {
                nextQ = available[Math.floor(Math.random() * available.length)];
            } else {
                // Sequential: lowest ID available
                nextQ = available.sort((a, b) => a.id - b.id)[0];
            }
            
            setCurrentQuestionIndex(questions.indexOf(nextQ));
            setUsedQuestionIds(prev => [...prev, nextQ.id]);
        }
    };

    const handleCorrect = () => {
        playSound('correct', isMuted, 'Magic');
        passBombToNextSurvivor();
        setBombTime(t => Math.min(t + 5, options.bombDuration || 60)); 
        nextQuestion();
    };

    const handleIncorrect = () => {
        playSound('incorrect', isMuted, 'Buzz');
        setBombTime(t => Math.max(0.1, t - 10)); // Big penalty
        // For Open questions, we skip to next. For MC, we let them try again (handled in handleMCOptionClick)
        if (!hasOptions) {
            nextQuestion();
        }
    };

    const handlePass = () => {
        playSound('select', isMuted, 'Glitch');
        setBombTime(t => Math.max(0.1, t - 5)); // Small penalty
        nextQuestion();
    };

    const handleMCOptionClick = (option: string, index: number) => {
        if (disabledOptions.includes(index) || isPaused || isExploded) return;

        // Clean strings for comparison
        const cleanOpt = option.replace(/^[A-Z]\)\s*/i, '').trim().toLowerCase();
        const cleanAns = currentQuestion.answer.replace(/^[A-Z]\)\s*/i, '').trim().toLowerCase();

        if (cleanOpt === cleanAns) {
            handleCorrect();
        } else {
            // Wrong MC answer
            playSound('incorrect', isMuted, 'Buzz');
            setBombTime(t => Math.max(0.1, t - 10)); // Penalty
            setDisabledOptions(prev => [...prev, index]); // Disable this option
        }
    };

    // Styling Helpers
    const getTimerColor = () => {
        const ratio = bombTime / (options.bombDuration || 60);
        if (ratio > 0.5) return '#fbbf24'; // Yellow
        if (ratio > 0.2) return '#f97316'; // Orange
        return '#ef4444'; // Red
    };

    const getBombScale = () => {
        if (!isTicking || isPaused) return 1;
        const ratio = 1 - (bombTime / (options.bombDuration || 60));
        // Pulse faster as time runs out
        return 1 + (Math.sin(Date.now() / (ratio > 0.8 ? 50 : 200)) * 0.02);
    };

    // Responsive Font Size Logic
    const getQuestionFontSizeClass = (text: string, hasOptions: boolean) => {
        const len = text ? text.length : 0;
        if (!hasOptions) {
            if (len < 25) return 'text-6xl md:text-7xl';
            if (len < 60) return 'text-5xl md:text-6xl';
            if (len < 100) return 'text-4xl md:text-5xl';
            if (len < 160) return 'text-3xl md:text-4xl';
            if (len < 240) return 'text-2xl md:text-3xl';
            if (len < 340) return 'text-xl md:text-2xl';
            return 'text-lg md:text-xl';
        } else {
            if (len < 30) return 'text-4xl md:text-5xl';
            if (len < 60) return 'text-3xl md:text-4xl';
            if (len < 100) return 'text-2xl md:text-3xl';
            if (len < 150) return 'text-xl md:text-2xl';
            return 'text-lg md:text-xl';
        }
    };

    const getAnswerFontSizeClass = (text: string) => {
        const len = text ? text.length : 0;
        if (len < 25) return 'text-6xl md:text-7xl';
        if (len < 60) return 'text-5xl md:text-6xl';
        if (len < 110) return 'text-4xl md:text-5xl';
        if (len < 180) return 'text-3xl md:text-4xl';
        if (len < 260) return 'text-2xl md:text-3xl';
        if (len < 360) return 'text-xl md:text-2xl';
        return 'text-lg md:text-xl';
    };

    // Helper for option font size - maximized legibility
    const getOptionFontSizeClass = (text: string) => {
        const len = text ? text.length : 0;
        if (len < 20) return 'text-2xl md:text-3xl';
        if (len < 35) return 'text-xl md:text-2xl';
        if (len < 60) return 'text-lg md:text-xl';
        return 'text-base md:text-lg';
    };

    if (gameState === 'gameover') {
        const winnerIndex = teamLives.findIndex(l => l > 0);
        const winnerName = winnerIndex !== -1 ? teamNames[winnerIndex] : "Everyone Exploded!";

        return (
            <div className="fixed inset-0 bg-slate-900 z-[300] flex flex-col items-center justify-center animate-fade-in">
                <Trophy size={100} className="text-brand-yellow mb-6 animate-bounce" />
                <h1 className="text-white text-6xl font-black mb-4">SURVIVOR!</h1>
                <h2 className="text-brand-blue text-4xl font-display font-bold bg-white px-8 py-4 rounded-full mb-8 shadow-xl">
                    {winnerName}
                </h2>
                <div className="flex gap-4">
                    <button onClick={onReplay} className="px-8 py-3 bg-brand-yellow text-slate-900 rounded-xl font-bold hover:scale-105 transition-transform flex items-center">
                        <RefreshCw className="mr-2" /> Play Again
                    </button>
                    <button onClick={onFinish} className="px-8 py-3 bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-600 transition-transform">
                        Exit
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={`bg-slate-950 flex flex-col ${isFullscreen ? 'h-screen' : 'h-[calc(100vh-4rem)]'} overflow-hidden relative text-white font-sans`}>
            
            {/* 1. HEADER */}
            <div className="bg-slate-900/90 backdrop-blur-md p-4 shrink-0 z-50 border-b border-slate-800 flex justify-between items-center min-h-[180px] shadow-2xl relative overflow-visible">
                <div className="flex flex-col items-start gap-2 min-w-[140px]">
                    <button onClick={() => setShowQuitConfirm(true)} className="text-slate-400 hover:text-red-500 bg-slate-800 p-2 rounded-lg transition-colors flex items-center text-sm font-bold border border-slate-700 hover:border-red-500/50">
                        <ArrowLeft size={16} className="mr-2" /> Quit
                    </button>
                    <h1 className="text-slate-200 font-display font-bold text-lg truncate max-w-[200px] hidden md:block opacity-80 uppercase tracking-widest mt-1">{game.title}</h1>
                </div>

                {/* Team Status Bar */}
                <div className="flex-1 flex justify-center gap-6 overflow-x-auto no-scrollbar px-4 py-2 h-full items-center">
                    {teamNames.map((name, idx) => {
                        const isAlive = teamLives[idx] > 0;
                        const isActive = idx === activeTeamIndex;
                        return (
                            <div 
                                key={idx} 
                                className={`
                                    relative px-6 py-3 rounded-xl border-2 transition-all min-w-[140px] flex flex-col items-center justify-center min-h-[6rem]
                                    ${!isAlive ? 'border-slate-800 bg-slate-900/50 opacity-40 grayscale' : 
                                      isActive ? 'border-yellow-500 bg-yellow-500/10 shadow-[0_0_25px_rgba(234,179,8,0.4)] scale-110 z-10 ring-2 ring-yellow-500/50' : 
                                      'border-slate-700 bg-slate-800/80 text-slate-400'}
                                `}
                            >
                                <div className="text-xs md:text-sm font-black uppercase tracking-wider leading-tight mb-2 text-center break-words max-w-[140px]">
                                    {name}
                                </div>
                                <div className="flex gap-1.5">
                                    {Array.from({length: Math.max(0, teamLives[idx])}).map((_, i) => (
                                        <Heart key={i} size={20} className="fill-red-500 text-red-500 drop-shadow-sm" />
                                    ))}
                                    {teamLives[idx] === 0 && <span className="text-xs font-bold text-red-900 uppercase">Eliminated</span>}
                                </div>
                                
                                {/* Active Indicator (Center Left) */}
                                {isActive && isAlive && (
                                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 bg-yellow-500 text-black p-2 rounded-full animate-bounce shadow-lg border-2 border-black z-20">
                                        <Zap size={16} className="fill-black" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="flex items-center gap-2 min-w-[140px] justify-end">
                    {gameState === 'play' && (
                        <button 
                            onClick={() => setIsPaused(!isPaused)} 
                            className={`text-slate-400 hover:text-white p-3 rounded-xl transition-colors border ${isPaused ? 'bg-yellow-500 text-slate-900 border-yellow-600' : 'bg-slate-800 hover:bg-slate-700 border-slate-700'}`}
                            title={isPaused ? "Resume" : "Pause"}
                        >
                            {isPaused ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
                        </button>
                    )}
                    <button onClick={() => setIsMuted(!isMuted)} className="text-slate-400 hover:text-white p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700">{isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>
                    <button onClick={toggleFullscreen} className="text-slate-400 hover:text-white p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700">{isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}</button>
                </div>
            </div>

            {/* 2. MAIN ARENA */}
            <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden">
                
                {/* Background Effects */}
                <div className={`absolute inset-0 transition-colors duration-200 z-0 ${isExploded ? 'bg-red-900/60' : 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black'}`}>
                    {!isExploded && <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vh] bg-blue-900/10 blur-[100px] rounded-full pointer-events-none"></div>}
                </div>

                {/* INTRO OVERLAY (Centered Full Screen) */}
                {gameState === 'intro' ? (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
                        <div className="flex flex-col items-center justify-center max-w-2xl relative">
                            <h1 className="text-6xl md:text-8xl font-display font-black text-white mb-6 tracking-tight drop-shadow-2xl text-center">TIME BOMB</h1>
                            <p className="text-2xl text-slate-300 mb-12 leading-relaxed font-light text-center">
                                Pass the bomb by answering correctly. <br/>
                                Wrong answers cost time. <br/>
                                <span className="text-red-400 font-bold">Don't explode!</span>
                            </p>
                            <button 
                                onClick={() => { setGameState('play'); setIsTicking(true); }}
                                className="bg-red-600 hover:bg-red-500 text-white text-3xl font-bold py-6 px-16 rounded-full shadow-[0_0_50px_rgba(220,38,38,0.6)] transition-all hover:scale-105 active:scale-95 border-4 border-red-800 relative z-20 animate-pulse"
                            >
                                ARM BOMB
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* LEFT: QUESTION ZONE (75%) - No Border */}
                        <div className="flex-1 md:flex-[3] p-4 md:p-6 flex items-center justify-center relative z-10">
                            {/* QUESTION CARD */}
                            {!isExploded && gameState === 'play' && (
                                <div className="w-[85%] max-w-5xl aspect-[16/9] max-h-[60vh] relative [perspective:1000px]">
                                    <div className={`relative w-full h-full transition-all duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                                        
                                        {/* FRONT: QUESTION & CONTROLS */}
                                        <div className={`absolute inset-0 [backface-visibility:hidden] rounded-3xl shadow-2xl overflow-hidden flex flex-col bg-slate-900 border-4 border-indigo-500 ${isFlipped ? 'pointer-events-none' : ''}`}>
                                            <div className="bg-indigo-900/50 p-4 border-b border-indigo-800 flex justify-between items-center shrink-0">
                                                <span className="font-bold text-indigo-300 uppercase tracking-widest text-sm">Question</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse border border-red-800"></span>
                                                    <span className="text-indigo-200 font-bold text-xs uppercase">Live Timer</span>
                                                </div>
                                            </div>
                                            
                                            {/* CONTENT BODY */}
                                            <div className="flex-1 flex flex-col p-6 md:p-8 text-center overflow-hidden bg-slate-800 relative">
                                                {/* Question Text Area - Flex-1 to take available space */}
                                                <div className={`flex-1 flex items-center justify-center w-full ${hasOptions ? 'mb-2' : ''}`}>
                                                    <h3 className={`font-display font-bold text-white leading-tight whitespace-pre-wrap break-words break-all ${getQuestionFontSizeClass(currentQuestion?.question || "Loading...", hasOptions)}`}>
                                                        {currentQuestion?.question || "Loading question..."}
                                                    </h3>
                                                </div>

                                                {/* MULTIPLE CHOICE GRID - Pushed to bottom */}
                                                {hasOptions && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full mt-auto pt-2 shrink-0">
                                                        {(() => {
                                                            const longestText = currentQuestion.options!.reduce((a, b) => a.length > b.length ? a : b, '');
                                                            const uniformSize = getOptionFontSizeClass(longestText);
                                                            
                                                            return currentQuestion.options!.map((opt, i) => (
                                                                <button
                                                                    key={i}
                                                                    disabled={disabledOptions.includes(i) || isPaused}
                                                                    onClick={() => handleMCOptionClick(opt, i)}
                                                                    className={`p-2 rounded-xl border-2 font-bold transition-all min-h-[50px] flex items-center justify-center ${uniformSize}
                                                                        ${disabledOptions.includes(i) 
                                                                            ? 'bg-slate-800/50 border-slate-700 text-slate-500 cursor-not-allowed line-through' 
                                                                            : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-indigo-600 hover:border-indigo-400 hover:text-white active:scale-95 shadow-sm'}`}
                                                                >
                                                                    {opt}
                                                                </button>
                                                            ));
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* FOOTER */}
                                            <div className="p-4 bg-slate-900 border-t border-indigo-900 flex justify-center gap-4 shrink-0">
                                                <button 
                                                    onClick={handlePass}
                                                    disabled={isPaused}
                                                    className="bg-slate-800 text-slate-300 px-6 py-4 rounded-full font-bold text-lg hover:bg-slate-700 transition-colors flex items-center border-b-4 border-slate-950 active:border-b-0 active:translate-y-1 disabled:opacity-50"
                                                >
                                                    <SkipForward size={20} className="mr-2" /> Skip (-5s)
                                                </button>
                                                
                                                {!hasOptions && (
                                                    <button 
                                                        onClick={() => setIsFlipped(true)}
                                                        disabled={isPaused}
                                                        className="bg-brand-blue text-white px-10 py-4 rounded-full font-bold text-xl shadow-lg hover:scale-105 transition-transform flex items-center border-b-4 border-sky-800 active:border-b-0 active:translate-y-1 disabled:opacity-50"
                                                    >
                                                        Reveal Answer
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* BACK: ANSWER & SCORING */}
                                        <div className={`absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-3xl shadow-2xl overflow-hidden flex flex-col bg-slate-900 border-4 border-indigo-500 ${!isFlipped ? 'pointer-events-none' : ''}`}>
                                            <div className="bg-indigo-900/50 p-4 border-b border-indigo-800 flex justify-between items-center">
                                                <span className="font-bold text-indigo-300 uppercase tracking-widest text-sm">Answer</span>
                                                <button onClick={() => setIsFlipped(false)} className="p-2 bg-indigo-800 rounded-full text-indigo-200 hover:text-white transition-colors" title="Flip Back">
                                                    <RotateCcw size={20} />
                                                </button>
                                            </div>
                                            
                                            <div className="flex-1 flex items-center justify-center p-8 text-center overflow-hidden bg-slate-800">
                                                <h3 className={`font-display font-bold text-white leading-tight whitespace-pre-wrap break-words break-all ${getAnswerFontSizeClass(currentQuestion?.answer || "")}`}>
                                                    {currentQuestion?.answer}
                                                </h3>
                                            </div>
                                            
                                            <div className="p-6 bg-slate-900 border-t border-indigo-900 grid grid-cols-2 gap-4">
                                                <button 
                                                    onClick={handleIncorrect}
                                                    disabled={isPaused}
                                                    className="bg-red-600 text-white font-bold text-lg md:text-xl rounded-xl py-4 hover:bg-red-500 transition-colors flex flex-col md:flex-row items-center justify-center border-b-4 border-red-800 active:border-b-0 active:translate-y-1 group disabled:opacity-50"
                                                >
                                                    <XCircle size={28} className="md:mr-2 mb-1 md:mb-0 group-hover:scale-110 transition-transform" />
                                                    <span>Wrong <span className="text-red-200 text-sm block md:inline">(-10s)</span></span>
                                                </button>

                                                <button 
                                                    onClick={handleCorrect}
                                                    disabled={isPaused}
                                                    className="bg-green-600 text-white font-bold text-lg md:text-xl rounded-xl py-4 hover:bg-green-500 transition-colors flex flex-col md:flex-row items-center justify-center border-b-4 border-green-800 active:border-b-0 active:translate-y-1 shadow-[0_0_20px_rgba(22,163,74,0.4)] group disabled:opacity-50"
                                                >
                                                    <CheckCircle size={28} className="md:mr-2 mb-1 md:mb-0 group-hover:scale-110 transition-transform" />
                                                    <span>Correct <span className="text-green-200 text-sm block md:inline">(Pass)</span></span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* RIGHT: BOMB ZONE (25%) - No Border, adjusted padding */}
                        <div className="flex-1 md:flex-1 p-4 flex items-center justify-center relative z-10 bg-black/20">
                            {(gameState === 'play' || gameState === 'exploded') && (
                                <div className="relative flex-shrink-0 transition-all duration-300" style={{ transform: `scale(${getBombScale()})` }}>
                                    {isExploded ? (
                                        <g className="animate-pulse origin-center" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
                                            <svg width="300" height="300" viewBox="0 0 200 200" overflow="visible" className="w-full h-auto max-w-[300px]">
                                                <path 
                                                    d="M100,10 L125,70 L190,60 L145,110 L180,170 L120,150 L100,200 L80,150 L20,170 L55,110 L10,60 L75,70 Z" 
                                                    fill="#fef2f2" 
                                                    stroke="#ef4444" 
                                                    strokeWidth="6" 
                                                    className="animate-[pulse_0.2s_ease-in-out_infinite]"
                                                />
                                                <text x="100" y="125" textAnchor="middle" fill="#ef4444" fontSize="50" fontFamily="sans-serif" fontWeight="900">BOOM!</text>
                                            </svg>
                                        </g>
                                    ) : (
                                        <svg width="300" height="350" viewBox="0 0 200 240" overflow="visible" className="w-full h-auto max-w-[300px]">
                                            <defs>
                                                <radialGradient id="bombBody" cx="35%" cy="35%" r="65%">
                                                    <stop offset="0%" stopColor="#64748b" />
                                                    <stop offset="40%" stopColor="#1e293b" />
                                                    <stop offset="100%" stopColor="#020617" />
                                                </radialGradient>
                                                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                                    <feGaussianBlur stdDeviation="4" result="blur" />
                                                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                                </filter>
                                            </defs>

                                            {/* FUSE PATH */}
                                            <path ref={fusePathRef} d="M100,60 C100,30 140,40 160,10" fill="none" stroke="none" />
                                            
                                            <path d="M100,60 C100,30 140,40 160,10" fill="none" stroke="#713f12" strokeWidth="6" strokeLinecap="round" />
                                            
                                            <path 
                                                d="M100,60 C100,30 140,40 160,10" 
                                                fill="none" 
                                                stroke="#fbbf24" 
                                                strokeWidth="4" 
                                                strokeLinecap="round"
                                                strokeDasharray={fusePathRef.current?.getTotalLength() || 100}
                                                strokeDashoffset={(fusePathRef.current?.getTotalLength() || 100) * (1 - (bombTime / (options.bombDuration || 60)))}
                                                className="transition-all duration-100 ease-linear"
                                                filter="url(#glow)"
                                            />

                                            {/* SPARK PARTICLE */}
                                            {isTicking && !isPaused && (
                                                <g transform={`translate(${sparkPos.x}, ${sparkPos.y})`}>
                                                    <circle r="8" fill="#fef08a" className="animate-ping" opacity="0.8" />
                                                    <circle r="5" fill="#fff" />
                                                    <path 
                                                        d="M-8,0 L8,0 M0,-8 L0,8 M-6,-6 L6,6 M-6,6 L6,-6" 
                                                        stroke="#fbbf24" 
                                                        strokeWidth="2" 
                                                        className="animate-spin" 
                                                        style={{ animationDuration: '1s', transformBox: 'fill-box', transformOrigin: 'center' }} 
                                                    />
                                                </g>
                                            )}

                                            <rect x="85" y="50" width="30" height="20" rx="4" fill="#334155" stroke="#1e293b" strokeWidth="2" />
                                            <circle cx="100" cy="140" r="80" fill="url(#bombBody)" stroke="#000" strokeWidth="2" />
                                            <ellipse cx="70" cy="100" rx="25" ry="12" fill="rgba(255,255,255,0.15)" transform="rotate(-45 70 100)" />

                                            <g transform="translate(100, 150)">
                                                <text 
                                                    textAnchor="middle" 
                                                    fill={getTimerColor()} 
                                                    fontSize="56" 
                                                    fontFamily="monospace" 
                                                    fontWeight="900"
                                                    dy="10"
                                                    filter="url(#glow)"
                                                    style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}
                                                >
                                                    {bombTime.toFixed(1)}
                                                </text>
                                            </g>
                                        </svg>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* PAUSE MODAL */}
            {isPaused && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-slate-800 border-2 border-slate-600 text-white p-12 rounded-3xl max-w-md w-full text-center shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-yellow-500/10 animate-pulse pointer-events-none"></div>
                        <Pause size={80} className="text-yellow-400 mx-auto mb-6" />
                        <h2 className="text-4xl font-display font-black mb-4">GAME PAUSED</h2>
                        <p className="text-slate-400 mb-8 text-lg">Timer stopped. Take a breather.</p>
                        <button 
                            onClick={() => setIsPaused(false)}
                            className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 text-xl font-bold py-4 px-10 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center justify-center mx-auto"
                        >
                            <Play size={24} fill="currentColor" className="mr-2" /> Resume
                        </button>
                    </div>
                </div>
            )}

            {/* EXPLOSION MODAL */}
            {showExplosionModal && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center bg-red-900/80 backdrop-blur-md p-4 animate-fade-in">
                    <div className="bg-black border-4 border-red-600 text-white p-12 rounded-[2rem] max-w-lg w-full text-center shadow-[0_0_60px_rgba(220,38,38,0.5)] relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-red-600 animate-[pulse_0.5s_ease-in-out_infinite]"></div>
                        <div className="mb-8 relative">
                            <div className="absolute inset-0 bg-red-500 blur-[40px] opacity-30 rounded-full"></div>
                            <div className="relative z-10 flex justify-center items-center">
                                <Skull size={100} className="text-red-500 animate-bounce" />
                            </div>
                        </div>
                        <h2 className="text-6xl font-display font-black mb-4 text-red-500 drop-shadow-md">BOOM!</h2>
                        <div className="bg-slate-900/80 rounded-xl p-4 mb-8 border border-red-900/50">
                            <p className="text-3xl font-bold text-white mb-2">{teamNames[activeTeamIndex]}</p>
                            <p className="text-xl text-red-400 font-mono tracking-widest uppercase">Lost a Life!</p>
                        </div>
                        
                        <button 
                            onClick={handleContinueAfterExplosion}
                            className="bg-white text-red-900 text-2xl font-bold py-4 px-12 rounded-full shadow-xl hover:bg-red-50 transition-transform hover:scale-105 active:scale-95 border-b-4 border-slate-300 active:border-b-0 active:translate-y-1"
                        >
                            Continue
                        </button>
                    </div>
                </div>
            )}

            {/* QUIT CONFIRM */}
            {showQuitConfirm && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700 text-white p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl">
                        <h2 className="text-2xl font-bold mb-2">Abandon Mission?</h2>
                        <p className="text-slate-400 mb-6">The bomb will remain armed.</p>
                        <div className="flex space-x-4">
                            <button onClick={() => setShowQuitConfirm(false)} className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold rounded-lg hover:bg-slate-700">Cancel</button>
                            <button onClick={() => { setShowQuitConfirm(false); onBack(); }} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-500">Quit</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
