import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { GeneratedGame, GameRunOptions } from '../../types';
import { playSound } from '../../utils/gameUtils';
import { ArrowLeft, Clock, ArrowRight, RotateCcw, CheckCircle, XCircle, Plus, Minus, List, Trophy, RefreshCw, Play, Check, Edit2, Volume2, VolumeX, Maximize2, Minimize2, AlertTriangle, Star, X } from 'lucide-react';

interface PubQuizGameProps {
    game: GeneratedGame;
    options: GameRunOptions;
    onBack: () => void;
    onFinish: () => void;
    onReplay: () => void;
}

// Sub-component for animated score numbers
const AnimatedScore: React.FC<{ score: number; className?: string; diffClassName?: string }> = ({ score, className, diffClassName }) => {
    const [displayScore, setDisplayScore] = useState(score);
    const [diff, setDiff] = useState(0);

    useEffect(() => {
        if (score === displayScore) return;
        
        const difference = score - displayScore;
        setDiff(difference);

        const step = difference > 0 ? Math.ceil(difference / 20) : Math.floor(difference / 20);
        
        const timer = setInterval(() => {
            setDisplayScore(prev => {
                const next = prev + step;
                if ((difference > 0 && next >= score) || (difference < 0 && next <= score)) {
                    clearInterval(timer);
                    setTimeout(() => setDiff(0), 1000);
                    return score;
                }
                return next;
            });
        }, 30);

        return () => clearInterval(timer);
    }, [score]);

    return (
        <div className="relative">
            <div className={`font-black font-mono leading-none tracking-tight transition-all text-slate-900 ${className || 'text-5xl'}`}>
                {displayScore}
            </div>
            {diff !== 0 && (
                <div className={`absolute -top-8 left-1/2 -translate-x-1/2 font-bold animate-bounce ${diffClassName || 'text-xl'}
                    ${diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {diff > 0 ? '+' : ''}{diff}
                </div>
            )}
        </div>
    );
};

export const PubQuizGame: React.FC<PubQuizGameProps> = ({ game, options, onBack, onFinish, onReplay }) => {
    const [currentRoundIndex, setCurrentRoundIndex] = useState<number | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [phase, setPhase] = useState<'home' | 'intro' | 'play' | 'review' | 'scoring' | 'gameover'>('home');
    const [scores, setScores] = useState<number[]>(Array(options.players).fill(0));
    const [isFlipped, setIsFlipped] = useState(false);
    
    // Track completed rounds
    const [completedRounds, setCompletedRounds] = useState<number[]>([]);
    
    // For Review Mode: reveal state for answers
    const [revealedReviewAnswers, setRevealedReviewAnswers] = useState<boolean[]>([]);

    // Edit Team State
    const [teamNames, setTeamNames] = useState<string[]>(options.teamNames || Array.from({length: options.players}, (_, i) => `Team ${i+1}`));
    const [editingTeamIndex, setEditingTeamIndex] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editScore, setEditScore] = useState(0);

    // Audio & Fullscreen
    const [isMuted, setIsMuted] = useState(options.muted);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showQuitConfirm, setShowQuitConfirm] = useState(false);
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const questionWrapRef = useRef<HTMLDivElement>(null);
    const questionTextRef = useRef<HTMLDivElement>(null);
    const [questionFontSize, setQuestionFontSize] = useState<number | null>(null);
    const answerWrapRef = useRef<HTMLDivElement>(null);
    const answerTextRef = useRef<HTMLDivElement>(null);
    const [answerFontSize, setAnswerFontSize] = useState<number | null>(null);
    const [resizeTick, setResizeTick] = useState(0);

    // Timer State
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [isTimesUp, setIsTimesUp] = useState(false);
    const timerRef = useRef<any>(null);

    const rounds = game.pubQuizRounds || [];
    const currentRound = currentRoundIndex !== null ? rounds[currentRoundIndex] : null;
    const currentQuestion = currentRound ? currentRound.questions[currentQuestionIndex] : null;

    // Font Sizer Helper
    const getQuestionFontSizeClass = (text: string) => {
        const len = text ? text.length : 0;
        if (len < 30) return 'text-3xl sm:text-5xl md:text-7xl';
        if (len < 60) return 'text-2xl sm:text-4xl md:text-6xl';
        if (len < 110) return 'text-xl sm:text-3xl md:text-5xl';
        if (len < 180) return 'text-lg sm:text-2xl md:text-4xl';
        if (len < 260) return 'text-base sm:text-xl md:text-3xl';
        if (len < 360) return 'text-sm sm:text-lg md:text-2xl';
        return 'text-xs sm:text-base md:text-xl';
    };

    const getAnswerFontSizeClass = (text: string) => {
        const len = text ? text.length : 0;
        if (len < 30) return 'text-3xl sm:text-5xl md:text-7xl';
        if (len < 70) return 'text-2xl sm:text-4xl md:text-6xl';
        if (len < 130) return 'text-xl sm:text-3xl md:text-5xl';
        if (len < 200) return 'text-lg sm:text-2xl md:text-4xl';
        if (len < 300) return 'text-base sm:text-xl md:text-3xl';
        if (len < 420) return 'text-sm sm:text-lg md:text-2xl';
        return 'text-xs sm:text-base md:text-xl';
    };

    const getOptionFontSizeClass = (text: string) => {
        const len = text ? text.length : 0;
        if (len < 20) return 'text-lg sm:text-2xl md:text-5xl';
        if (len < 35) return 'text-base sm:text-xl md:text-4xl';
        if (len < 60) return 'text-sm sm:text-lg md:text-3xl';
        return 'text-xs sm:text-base md:text-2xl';
    };

    const getMobileOptionFontSize = (text: string) => {
        const len = text ? text.length : 0;
        if (len < 12) return 20;
        if (len < 20) return 18;
        if (len < 30) return 16;
        if (len < 40) return 15;
        return 14;
    };

    useEffect(() => {
        const media = window.matchMedia('(max-width: 639px)');
        const handleChange = () => setIsMobileViewport(media.matches);
        handleChange();
        media.addEventListener('change', handleChange);
        return () => media.removeEventListener('change', handleChange);
    }, []);

    useEffect(() => {
        const handleResize = () => setResizeTick(prev => prev + 1);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useLayoutEffect(() => {
        if (!isMobileViewport || phase !== 'play') {
            setQuestionFontSize(null);
            return;
        }
        const wrap = questionWrapRef.current;
        const textEl = questionTextRef.current;
        if (!wrap || !textEl) return;
        const availableHeight = wrap.clientHeight;
        if (availableHeight === 0) return;
        const maxSize = Math.min(54, Math.max(30, Math.floor(window.innerWidth / 8)));
        const minSize = 16;
        let size = maxSize;
        textEl.style.lineHeight = '1.15';
        textEl.style.fontSize = `${size}px`;
        while (textEl.scrollHeight > availableHeight && size > minSize) {
            size -= 1;
            textEl.style.fontSize = `${size}px`;
        }
        setQuestionFontSize(size);
    }, [isMobileViewport, phase, currentQuestion?.question, currentQuestion?.options?.length, resizeTick]);

    useLayoutEffect(() => {
        if (!isMobileViewport || phase !== 'play' || !isFlipped) {
            setAnswerFontSize(null);
            return;
        }
        const wrap = answerWrapRef.current;
        const textEl = answerTextRef.current;
        if (!wrap || !textEl) return;
        const availableHeight = wrap.clientHeight;
        if (availableHeight === 0) return;
        const maxSize = Math.min(50, Math.max(28, Math.floor(window.innerWidth / 7.5)));
        const minSize = 16;
        let size = maxSize;
        textEl.style.lineHeight = '1.15';
        textEl.style.fontSize = `${size}px`;
        while (textEl.scrollHeight > availableHeight && size > minSize) {
            size -= 1;
            textEl.style.fontSize = `${size}px`;
        }
        setAnswerFontSize(size);
    }, [isMobileViewport, phase, isFlipped, currentQuestion?.answer, resizeTick]);

    // Body Scroll Lock
    useEffect(() => {
        const shouldLock = phase === 'play' || phase === 'gameover' || editingTeamIndex !== null;
        document.body.style.overflow = shouldLock ? 'hidden' : 'auto';
        return () => { document.body.style.overflow = 'auto'; };
    }, [phase, editingTeamIndex]);

    // Timer Effect
    useEffect(() => {
        if (phase === 'play' && !isFlipped && !isTimesUp) {
             const duration = options.timerSeconds;
             if (duration > 0 && timeLeft > 0) {
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
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [phase, isFlipped, isTimesUp, options.timerSeconds]);

    // Check Time's Up
    useEffect(() => {
        if (timeLeft === 0 && options.timerSeconds > 0 && phase === 'play' && !isFlipped && !isTimesUp) {
            setIsTimesUp(true);
            playSound('times-up', isMuted, options.soundConfig?.timesUp);
        }
    }, [timeLeft, options.timerSeconds, phase, isFlipped, isTimesUp, isMuted, options.soundConfig]);

    // Review Mode Reset
    useEffect(() => {
        if (phase === 'review' && currentRound) {
            setRevealedReviewAnswers(Array(currentRound.questions.length).fill(false));
        }
    }, [phase, currentRound]);

    const startRound = (index: number) => {
        setCurrentRoundIndex(index);
        setCurrentQuestionIndex(0);
        setIsFlipped(false);
        setPhase('intro');
    };

    // BUG FIX: Flip card back before loading next question to prevent "flashing" answer
    const handleNextQuestion = () => {
        const proceed = () => {
            if (currentRound && currentQuestionIndex < currentRound.questions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
                setIsFlipped(false);
                setTimeLeft(options.timerSeconds);
                setIsTimesUp(false);
            } else {
                setPhase('review');
            }
        };

        if (isFlipped) {
            setIsFlipped(false);
            setTimeout(proceed, 600); // Wait for CSS transition (700ms)
        } else {
            proceed();
        }
    };

    const handleScoreUpdate = (teamIndex: number, delta: number) => {
        setScores(prev => {
            const newScores = [...prev];
            newScores[teamIndex] += delta;
            return newScores;
        });
        if (delta > 0) playSound('correct', isMuted, 'Retro');
    };

    const finishRound = () => {
        if (currentRoundIndex !== null) {
            setCompletedRounds(prev => [...prev, currentRoundIndex]);
        }
        setPhase('home');
    };

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

    if (phase === 'gameover') {
        const maxScore = Math.max(...scores);
        const winners = scores.map((s, i) => s === maxScore ? { name: teamNames[i], score: s, id: i } : null).filter(Boolean) as {name: string, score: number, id: number}[];
        const isTie = winners.length > 1;

        const rankedTeams = scores
            .map((score, index) => ({ name: teamNames[index], score, id: index }))
            .sort((a, b) => b.score - a.score);

        // Rank others
        const otherTeams = scores
            .map((score, index) => ({ name: teamNames[index], score, id: index }))
            .filter(t => t.score < maxScore)
            .sort((a, b) => b.score - a.score);
        
        const second = otherTeams[0];
        const third = otherTeams[1];

        if (isMobileViewport) {
            return (
                <div className="fixed inset-0 bg-slate-800 z-[300] flex flex-col items-center justify-center overflow-hidden">
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
                    <div className="relative z-10 w-full h-full overflow-y-auto px-4 pt-24 pb-10 text-center">
                        <div className="min-h-[75vh] flex flex-col items-center justify-center">
                            <h1 className="font-display text-4xl font-black mb-4 text-white drop-shadow-xl tracking-widest uppercase" style={{ textShadow: '4px 4px 0px rgba(0,0,0,0.3)' }}>
                                {isTie ? "It's a Tie!" : "Winner!"}
                            </h1>
                            <Trophy size={72} className="text-brand-yellow mb-4 animate-pulse drop-shadow-xl" />
                            <div className="text-white font-bold text-2xl mb-4">
                                {winners.map(w => w.name).join(' & ')}
                            </div>
                            <div className="bg-white px-6 py-3 rounded-2xl text-brand-yellow font-mono text-3xl font-black border-2 border-yellow-100 shadow-lg">
                                {maxScore}
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button onClick={onReplay} className="px-6 py-3 bg-brand-yellow text-slate-900 rounded-full font-bold text-base shadow-lg">
                                    Play Again
                                </button>
                                <button onClick={onFinish} className="px-6 py-3 bg-white/20 text-white rounded-full font-bold text-base shadow-lg border border-white/30">
                                    Back to Library
                                </button>
                            </div>
                        </div>

                        <div className="mt-10 pt-6 border-t border-white/20">
                            <h2 className="text-xs uppercase tracking-widest text-white/60 mb-4">Full Standings</h2>
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
            <div className="fixed inset-0 bg-slate-800 z-[300] flex flex-col items-center justify-center overflow-hidden">
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

                <div className="relative z-10 w-full max-w-6xl px-4 flex flex-col items-center justify-start md:justify-center h-full overflow-y-auto pt-24 pb-12">
                    <h1 className="font-display text-5xl md:text-7xl font-black mb-8 text-white drop-shadow-xl animate-bounce tracking-widest uppercase text-center break-words w-full px-4" style={{ textShadow: '4px 4px 0px rgba(0,0,0,0.3)' }}>
                        {isTie ? "It's a Tie!" : "Winner!"}
                    </h1>
                    
                    {/* PODIUM */}
                    <div className="flex items-end justify-center gap-4 md:gap-8 mb-12 w-full max-w-4xl flex-wrap md:flex-nowrap flex-shrink-0">
                        {second && (
                            <div className="flex flex-col items-center order-2 md:order-1 w-1/3 md:w-1/4 animate-[slide-up_1s_ease-out]">
                                <div className="text-white font-bold text-xl md:text-2xl mb-2 text-center drop-shadow-md truncate w-full">{second.name}</div>
                                <div className="w-full h-24 md:h-48 bg-gradient-to-b from-slate-400 to-slate-500 rounded-t-xl flex items-center justify-center border-t-4 border-white/50 relative shadow-xl">
                                     <span className="text-6xl md:text-7xl font-black text-slate-800 opacity-50">2</span>
                                </div>
                                <div className="bg-white px-4 py-2 rounded-b-xl mt-2 text-slate-600 font-mono text-xl md:text-3xl font-bold border border-slate-200 min-w-[80px] text-center shadow-md">
                                    {second.score}
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col items-center order-1 md:order-2 w-full md:w-1/3 z-20 animate-[slide-up_0.8s_ease-out]">
                             <Trophy size={80} className="text-brand-yellow mb-4 animate-pulse drop-shadow-xl" />
                             <div className="flex flex-col items-center w-full">
                                {winners.map((w, idx) => (
                                    <div key={idx} className="text-white font-bold text-3xl md:text-5xl mb-2 text-center drop-shadow-md w-full leading-tight">
                                        {w.name} {idx < winners.length - 1 && <span className="text-white/80 text-2xl">&</span>}
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

                        {third && (
                            <div className="flex flex-col items-center order-3 w-1/3 md:w-1/4 animate-[slide-up_1.2s_ease-out]">
                                <div className="text-orange-200 font-bold text-xl md:text-2xl mb-2 text-center drop-shadow-md truncate w-full">{third.name}</div>
                                <div className="w-full h-16 md:h-36 bg-gradient-to-b from-orange-400 to-orange-500 rounded-t-xl flex items-center justify-center border-t-4 border-orange-200 relative shadow-xl">
                                     <span className="text-5xl md:text-6xl font-black text-orange-800 opacity-30">3</span>
                                </div>
                                <div className="bg-white px-4 py-2 rounded-b-xl mt-2 text-orange-500 font-mono text-xl md:text-3xl font-bold border border-slate-200 min-w-[80px] text-center shadow-md">
                                    {third.score}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4">
                        <button onClick={onReplay} className="px-8 py-4 bg-brand-yellow text-slate-900 rounded-xl font-bold text-xl hover:scale-105 transition-all shadow-lg flex items-center">
                            <RefreshCw size={24} className="mr-2" /> Play Again
                        </button>
                        <button onClick={onFinish} className="px-8 py-4 bg-white/20 text-white backdrop-blur-md rounded-xl font-bold text-xl hover:bg-white/30 hover:scale-105 transition-all shadow-lg border-2 border-white/50">
                            Back to Library
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const mainContentAlign = phase === 'home'
        ? 'justify-start pt-16 md:pt-20'
        : phase === 'scoring'
            ? 'justify-start pt-4 sm:justify-center sm:pt-6'
            : 'justify-center pt-6';
    const mainContentOverflow = phase === 'home' ? 'overflow-visible' : 'overflow-hidden';
    const containerOverflowClass = phase === 'home' ? 'overflow-visible' : 'overflow-hidden';
    const containerHeightClass = isFullscreen
        ? 'h-screen'
        : phase === 'home'
            ? 'min-h-[calc(var(--app-vh,1vh)*100-4rem)]'
            : 'h-[calc(var(--app-vh,1vh)*100-4rem)]';

    return (
        <div ref={containerRef} className={`bg-slate-800 flex flex-col ${containerHeightClass} ${containerOverflowClass} relative transition-colors duration-500`}>
            
            {/* 1. HEADER (Scoreboard) - Fixed Z-Index */}
            <div className="bg-white p-2 md:p-4 shrink-0 z-[250] shadow-md border-b border-slate-200 relative min-h-[70px] md:min-h-[140px]">
                <div className="hidden md:flex justify-between items-center gap-4">
                    <div className="flex flex-col items-start gap-2 min-w-[140px]">
                        <button 
                            onClick={() => setShowQuitConfirm(true)} 
                            className="text-slate-500 hover:text-red-600 flex items-center text-sm bg-slate-100 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors font-bold border border-slate-200"
                        >
                            <ArrowLeft size={16} className="mr-2" /> Quit
                        </button>
                        <h1 className="text-slate-800 font-display font-bold text-lg truncate max-w-[200px] hidden md:block opacity-80">{game.title}</h1>
                    </div>

                    <div className="flex-1 flex justify-center gap-4 overflow-x-auto no-scrollbar px-4 h-full items-center">
                        {scores.map((score, idx) => (
                            <button 
                                key={idx} 
                                onClick={() => openEditTeam(idx)}
                                className="px-6 py-3 rounded-xl text-center transition-all border-b-4 min-w-[150px] relative group h-28 flex flex-col justify-center items-center shadow-sm bg-brand-yellow border-yellow-500 text-slate-900 hover:bg-yellow-300 hover:border-yellow-400 hover:scale-105 hover:-rotate-1"
                            >
                                <div className="text-lg uppercase font-bold tracking-wider truncate max-w-[130px] mb-1 flex items-center gap-1">
                                    {teamNames[idx]}
                                </div>
                                <AnimatedScore score={score} />
                                <div className="absolute top-2 right-2 bg-slate-900/10 text-slate-900 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

                <div className="flex md:hidden items-center gap-3">
                    <div className="flex flex-col items-start gap-2 shrink-0">
                        <button 
                            onClick={() => setShowQuitConfirm(true)}
                            className="text-slate-400 hover:text-red-600 p-1.5 bg-slate-100 hover:bg-red-50 rounded-md transition-colors border border-slate-200"
                            title="Quit"
                        >
                            <X size={16} />
                        </button>
                        <button 
                            onClick={() => setIsMuted(!isMuted)} 
                            className="text-slate-400 hover:text-brand-blue p-1.5 bg-slate-100 hover:bg-sky-50 rounded-md transition-colors border border-slate-200"
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                             {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                        </button>
                    </div>
                    <div className="flex-1 flex flex-wrap justify-end gap-2 items-center">
                        {scores.map((score, idx) => (
                            <button
                                key={idx}
                                onClick={() => openEditTeam(idx)}
                                className="px-2 py-1 rounded-lg text-center transition-all border min-w-[74px] max-w-[96px] flex flex-col justify-center items-center shadow-sm bg-brand-yellow border-yellow-500 text-slate-900"
                            >
                                <div className="text-[10px] uppercase font-bold tracking-wider truncate w-full text-center">
                                    {teamNames[idx]}
                                </div>
                                <AnimatedScore score={score} className="text-lg" diffClassName="text-[10px] -top-5" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 2. MAIN CONTENT AREA */}
            <div className={`flex-1 flex flex-col items-center ${mainContentAlign} pb-16 px-4 relative z-10 ${mainContentOverflow} min-h-0`}>
                
                {/* HOME PHASE: Round Selection */}
                {phase === 'home' && (
                    <div className="w-full max-w-6xl animate-fade-in pb-24">
                        <div className="text-center mb-10">
                            <h2 className="text-5xl font-display font-black text-white mb-2 drop-shadow-md">Select a Round</h2>
                            <p className="text-white/60 font-bold text-lg">Choose the next category to play.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {rounds.map((round, idx) => {
                                const isCompleted = completedRounds.includes(idx);

                                return (
                                    <button 
                                        key={idx}
                                        onClick={() => !isCompleted && startRound(idx)}
                                        disabled={isCompleted}
                                        className={`group relative overflow-hidden rounded-2xl p-8 text-left transition-all border-4 shadow-xl
                                            ${isCompleted 
                                                ? 'bg-slate-700 border-slate-600 opacity-60 cursor-not-allowed grayscale' 
                                                : `bg-white border-slate-200 hover:border-brand-blue hover:scale-105 hover:shadow-brand-blue/20`}`}
                                    >
                                        <div className="flex justify-between items-start mb-6">
                                            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider 
                                                ${isCompleted ? 'bg-slate-600 text-slate-400' : 'bg-brand-blue text-white'}`}>
                                                Round {idx + 1}
                                            </span>
                                            {isCompleted ? <CheckCircle className="text-green-500" size={32} /> : <Star className="text-brand-yellow group-hover:scale-110 transition-transform" size={32} fill="currentColor" />}
                                        </div>
                                        <h3 className={`text-4xl font-display font-black mb-2 drop-shadow-sm leading-tight
                                            ${isCompleted ? 'text-slate-500' : 'text-slate-800 group-hover:text-brand-blue'}`}>
                                            {round.name}
                                        </h3>
                                        <p className="text-slate-500 font-bold text-lg">
                                            {round.questions.length} Questions
                                        </p>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-12 text-center">
                            {completedRounds.length === rounds.length ? (
                                <button 
                                    onClick={() => setPhase('gameover')}
                                    className="px-12 py-4 bg-brand-yellow text-slate-900 rounded-full font-bold text-2xl hover:scale-105 transition-transform shadow-lg animate-bounce"
                                >
                                    Finish Game & See Winners
                                </button>
                            ) : (
                                <p className="text-white/40 italic font-medium">Complete all rounds to finish the game.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* INTRO PHASE */}
                {phase === 'intro' && currentRound && (
                    <div className="text-center animate-fade-in max-w-4xl w-full">
                        <h2 className="text-3xl font-bold text-white/40 mb-4 uppercase tracking-widest">Round {currentRoundIndex! + 1}</h2>
                        <h1 className="text-7xl md:text-9xl font-display font-black text-white mb-16 drop-shadow-lg">{currentRound.name}</h1>
                        <button 
                            onClick={() => { setPhase('play'); setTimeLeft(options.timerSeconds); setIsTimesUp(false); }}
                            className="bg-brand-yellow text-slate-900 px-16 py-6 rounded-full font-bold text-3xl hover:scale-105 hover:shadow-2xl transition-all border-b-8 border-yellow-600 active:border-b-0 active:translate-y-2 flex items-center mx-auto"
                        >
                            <Play size={32} fill="currentColor" className="mr-4" /> Start
                        </button>
                    </div>
                )}

                {/* REVIEW PHASE */}
                {phase === 'review' && currentRound && (
                    <div className="w-full max-w-6xl h-full flex flex-col animate-fade-in">
                        <div className="text-center mb-3 sm:mb-6">
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-white drop-shadow-md">Round Review: {currentRound.name}</h2>
                            <p className="text-white/60 font-bold text-sm sm:text-base md:text-lg">Review answers before scoring.</p>
                        </div>
                        
                        <div className="flex-1 min-h-[57vh] sm:min-h-0 overflow-y-auto bg-white rounded-3xl shadow-2xl border-4 border-slate-200 p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
                            {currentRound.questions.map((q, idx) => (
                                <div key={idx} className="border-b border-slate-100 pb-4 sm:pb-6 last:border-0">
                                    <div className="flex justify-between items-start mb-2 sm:mb-3">
                                        <span className="bg-slate-900 text-white w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-lg flex-shrink-0 mr-3 sm:mr-4 shadow-sm">{idx + 1}</span>
                                        <p className="font-bold text-base sm:text-xl md:text-2xl text-slate-800 flex-1 leading-tight">{q.question}</p>
                                    </div>
                                    <div className="ml-11 sm:ml-14">
                                        {revealedReviewAnswers[idx] ? (
                                            <div className="text-green-600 font-bold text-lg sm:text-2xl md:text-3xl animate-fade-in flex items-start gap-2 sm:gap-3 mt-2">
                                                <CheckCircle size={24} className="mt-1 flex-shrink-0 sm:w-8 sm:h-8" /> {q.answer}
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => {
                                                    const newRevealed = [...revealedReviewAnswers];
                                                    newRevealed[idx] = true;
                                                    setRevealedReviewAnswers(newRevealed);
                                                }}
                                                className="text-sm sm:text-base font-bold text-brand-blue hover:text-white hover:bg-brand-blue border-2 border-brand-blue px-3 sm:px-4 py-2 rounded-lg transition-colors mt-2"
                                            >
                                                Reveal Answer
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-auto flex justify-center pt-4 pb-3 sm:py-6 gap-3 sm:gap-4">
                            <button 
                                onClick={() => {
                                    const allRevealed = Array(currentRound.questions.length).fill(true);
                                    setRevealedReviewAnswers(allRevealed);
                                }}
                                className="px-4 sm:px-6 py-2 sm:py-3 bg-white text-slate-700 rounded-xl font-bold text-sm sm:text-base hover:bg-slate-100 shadow-lg transition-transform hover:scale-105"
                            >
                                Reveal All
                            </button>
                            <button 
                                onClick={() => setPhase('scoring')}
                                className="px-5 sm:px-6 py-2 sm:py-3 bg-brand-yellow text-slate-900 rounded-xl font-bold text-sm sm:text-base hover:bg-yellow-300 shadow-lg transition-transform hover:scale-105"
                            >
                                Go to Scoring
                            </button>
                        </div>
                    </div>
                )}

                {/* SCORING PHASE */}
                {phase === 'scoring' && (
                    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-4 sm:p-8 animate-fade-in border-4 border-slate-200 flex flex-col h-full max-h-full sm:h-auto sm:max-h-none min-h-0">
                        <h2 className="text-2xl sm:text-4xl font-display font-bold text-slate-800 text-center mb-2">Round Complete!</h2>
                        <p className="text-center text-slate-500 mb-4 sm:mb-8 text-sm sm:text-lg font-medium">Enter points for this round.</p>
                        <div className="space-y-3 sm:space-y-4 overflow-y-auto pr-1 sm:pr-0 flex-1 min-h-0">
                            {scores.map((score, i) => (
                                <div key={i} className="flex items-center justify-between p-3 sm:p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="font-bold text-base sm:text-xl text-slate-700 w-1/3 truncate">{teamNames[i]}</div>
                                    <div className="font-mono font-bold text-2xl sm:text-3xl text-brand-blue w-1/3 text-center">{score}</div>
                                    <div className="flex items-center gap-2 w-1/3 justify-end">
                                        <button 
                                            onClick={() => handleScoreUpdate(i, -1)}
                                            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white border-2 border-slate-200 rounded-lg hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
                                        >
                                            <Minus size={20} className="sm:w-6 sm:h-6" />
                                        </button>
                                        <button 
                                            onClick={() => handleScoreUpdate(i, 1)}
                                            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white border-2 border-slate-200 rounded-lg hover:bg-green-50 hover:text-green-500 hover:border-green-200 transition-colors"
                                        >
                                            <Plus size={20} className="sm:w-6 sm:h-6" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button 
                            onClick={finishRound}
                            className="w-full mt-4 sm:mt-8 py-3 sm:py-4 bg-brand-blue text-white rounded-xl font-bold text-base sm:text-xl hover:bg-sky-600 transition-all shadow-md flex items-center justify-center"
                        >
                            Return to Dashboard <ArrowRight className="ml-2" />
                        </button>
                    </div>
                )}
            </div>

            {/* TEAM EDIT MODAL */}
            {editingTeamIndex !== null && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white p-4 sm:p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-fade-in border border-slate-100">
                        <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-3 sm:mb-4">Edit Team Details</h3>
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Team Name</label>
                            <input 
                                type="text" 
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full p-2.5 sm:p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none font-bold text-base sm:text-lg"
                            />
                        </div>
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Score Override</label>
                            <div className="flex items-center gap-2 justify-center">
                                <button onClick={() => setEditScore(s => s - 50)} className="px-3 py-2 bg-slate-100 rounded hover:bg-slate-200 text-sm font-bold">-50</button>
                                <input 
                                    type="number" 
                                    value={editScore}
                                    onChange={(e) => setEditScore(parseInt(e.target.value) || 0)}
                                    className="w-28 sm:w-32 p-2.5 sm:p-3 border border-slate-200 rounded-lg text-center font-mono font-bold text-lg sm:text-xl"
                                />
                                <button onClick={() => setEditScore(s => s + 50)} className="px-3 py-2 bg-slate-100 rounded hover:bg-slate-200 text-sm font-bold">+50</button>
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

            {/* PLAY PHASE: QUESTION CARD MODAL */}
            {phase === 'play' && currentQuestion && (
                <div className="fixed inset-x-0 bottom-0 top-[calc(4rem+env(safe-area-inset-top))] z-[500] flex items-center justify-center bg-slate-900/50 backdrop-blur-md p-3 sm:p-4 animate-fade-in overflow-hidden">
                    <div className="w-full max-w-[420px] h-full max-h-full sm:max-w-[560px] sm:h-full sm:max-h-[90vh] md:max-w-6xl md:h-auto md:max-h-full md:aspect-[16/9] [perspective:1000px]">
                        <div className={`relative w-full h-full transition-all duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                            
                            {/* FRONT */}
                            <div className={`absolute inset-0 [backface-visibility:hidden] rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full bg-white ${isFlipped ? 'pointer-events-none' : ''}`}>
                                {/* Header */}
                                <div className="bg-brand-blue text-white p-3 sm:p-3 md:p-4 flex justify-between items-center h-[clamp(72px,12vh,96px)] sm:h-20 md:h-24 flex-shrink-0 relative z-10">
                                    <div className="font-bold text-lg sm:text-xl md:text-2xl opacity-90 truncate max-w-[55%]">{currentRound?.name}</div>
                                    <div className="bg-white/20 px-3 py-1 rounded-full font-black text-lg sm:text-xl md:text-2xl">Q{currentQuestionIndex + 1}</div>
                                    <div className="font-bold text-sm sm:text-base md:text-xl opacity-80 text-right">{currentRound?.questions.length} Total</div>
                                </div>

                                {/* Body */}
                                <div className="bg-white flex-grow w-full flex flex-col p-3 sm:p-4 md:p-8 relative overflow-hidden z-0">
                                    <div className="flex flex-col flex-1 min-h-0">
                                        <div ref={questionWrapRef} className="w-full flex-1 min-h-0 flex flex-col items-center justify-start overflow-hidden px-1 sm:px-0 mb-1 sm:mb-3">
                                            <div
                                                ref={questionTextRef}
                                                style={questionFontSize ? { fontSize: `${questionFontSize}px`, lineHeight: '1.15' } : undefined}
                                                className={`font-display font-bold text-slate-800 leading-tight text-center w-full whitespace-pre-wrap break-words hyphens-none ${getQuestionFontSizeClass(currentQuestion.question)}`}
                                            >
                                                {currentQuestion.question}
                                            </div>
                                        </div>
                                        {/* Options */}
                                        {currentQuestion.options && currentQuestion.options.length > 0 && !isFlipped && (
                                            <div className="w-full flex-1 min-h-0 mt-1 sm:mt-3 md:mt-6 flex-shrink-0 relative z-10 overflow-hidden">
                                                <div className="grid grid-cols-2 md:grid-cols-2 gap-2 sm:gap-3 md:gap-4 w-full h-full max-w-5xl auto-rows-fr">
                                                    {(() => {
                                                        const longestText = currentQuestion.options!.reduce((a, b) => a.length > b.length ? a : b, '');
                                                        const uniformSize = getOptionFontSizeClass(longestText);
                                                        const mobileFontSize = isMobileViewport ? getMobileOptionFontSize(longestText) : null;
                                                        return currentQuestion.options!.map((opt, i) => (
                                                            <div
                                                                key={i}
                                                                style={mobileFontSize ? { fontSize: `${mobileFontSize}px`, lineHeight: '1.2' } : undefined}
                                                                className={`p-2 sm:p-3 md:p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-700 text-center shadow-sm flex items-center justify-center min-h-[60px] sm:min-h-[56px] md:min-h-[80px] h-full whitespace-normal break-words hyphens-none ${uniformSize}`}
                                                            >
                                                                {opt}
                                                            </div>
                                                        ));
                                                    })()}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className={`h-[clamp(88px,14vh,120px)] sm:h-24 md:h-24 flex flex-col px-3 sm:px-4 md:px-8 py-2 md:py-0 relative flex-shrink-0 z-50 transition-colors duration-300 ${isTimesUp ? 'bg-red-600' : 'bg-gradient-to-r from-brand-blue to-sky-500'}`}>
                                    {/* Timer Strip */}
                                    {options.timerSeconds > 0 && (
                                        <div className="relative h-[clamp(24px,4.5vh,32px)] bg-black/10 flex items-center justify-start pointer-events-none">
                                            {!isTimesUp && (
                                                <div className="absolute inset-y-0 left-0 bg-white/30 transition-all duration-1000" style={{ width: `${(timeLeft / options.timerSeconds) * 100}%` }} />
                                            )}
                                            <div className="absolute inset-0 flex items-center justify-center text-[10px] sm:text-xs font-bold text-white tracking-wider">
                                                {isTimesUp ? "TIME'S UP!" : (
                                                    <><Clock size={12} className="mr-1" /> {timeLeft}s</>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="w-full flex-1 flex items-center justify-between gap-3 py-3">
                                        <button 
                                            onClick={() => setIsFlipped(true)}
                                            className="bg-white text-brand-blue px-4 sm:px-6 py-2 rounded-full font-bold text-sm sm:text-lg md:text-2xl shadow-lg hover:scale-105 transition-transform flex items-center relative z-50 border-2 border-white"
                                        >
                                            Reveal Answer
                                        </button>

                                        <button 
                                            onClick={handleNextQuestion}
                                            className="text-white font-bold text-xs sm:text-base md:text-xl hover:bg-white/20 px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center opacity-90 hover:opacity-100 relative z-50"
                                        >
                                            <span className="sm:hidden">Next</span>
                                            <span className="hidden sm:inline">Go to next question</span>
                                            <ArrowRight size={16} className="ml-2 md:w-6 md:h-6" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* BACK (Answer) */}
                            <div className={`absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full bg-slate-50 ${!isFlipped ? 'pointer-events-none' : ''}`}>
                                <div className="bg-slate-200 text-slate-600 p-3 md:p-4 flex justify-between items-center h-20 md:h-24 flex-shrink-0 relative z-10">
                                    <div className="font-bold text-lg sm:text-xl md:text-2xl opacity-80">Answer</div>
                                    <button onClick={() => setIsFlipped(false)} className="p-2 bg-white rounded-full hover:bg-slate-100 text-slate-500" title="Flip Back"><RotateCcw size={20} className="md:w-6 md:h-6" /></button>
                                </div>

                                <div className="flex-grow flex flex-col items-center justify-center p-4 md:p-8 bg-white text-center overflow-hidden w-full relative z-0">
                                    <div ref={answerWrapRef} className="flex-1 overflow-hidden flex flex-col items-center justify-center w-full min-h-0 px-2 py-2">
                                        <div
                                            ref={answerTextRef}
                                            style={answerFontSize ? { fontSize: `${answerFontSize}px`, lineHeight: '1.15' } : undefined}
                                            className={`font-display font-bold text-slate-800 leading-snug whitespace-pre-wrap break-words hyphens-none ${getAnswerFontSizeClass(currentQuestion.answer)}`}
                                        >
                                            {currentQuestion.answer}
                                        </div>
                                    </div>
                                    
                                    {/* IMMEDIATE SCORING PANEL */}
                                    <div className="mt-3 w-full bg-slate-50 rounded-2xl p-3 md:p-4 border-2 border-slate-200 flex-shrink-0 relative z-10">
                                        <h4 className="text-xs md:text-sm font-bold text-slate-400 uppercase mb-2 md:mb-3 tracking-widest">Quick Score (+1 Point)</h4>
                                        <div className="flex flex-wrap justify-center gap-2 md:gap-3">
                                            {scores.map((s, i) => (
                                                <button 
                                                    key={i}
                                                    onClick={(e) => { e.stopPropagation(); handleScoreUpdate(i, 1); }}
                                                    className="px-3 md:px-4 py-1.5 md:py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs md:text-sm font-bold hover:bg-green-50 hover:border-green-300 hover:text-green-600 transition-all shadow-sm active:scale-95 flex items-center"
                                                >
                                                    {teamNames[i]} <Plus size={14} className="ml-1" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="h-20 md:h-24 flex flex-shrink-0 relative z-50">
                                    <button 
                                        onClick={handleNextQuestion}
                                        className="flex-1 bg-brand-blue text-white font-bold text-base sm:text-lg md:text-2xl hover:bg-sky-600 transition-colors flex items-center justify-center"
                                    >
                                        Go to next question <ArrowRight size={18} className="ml-2 md:w-6 md:h-6" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quit Confirmation Modal */}
            {showQuitConfirm && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white text-slate-900 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl border border-slate-100">
                        <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Quit current game?</h2>
                        <p className="text-slate-500 mb-6">Your progress will be lost if you haven't saved.</p>
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
