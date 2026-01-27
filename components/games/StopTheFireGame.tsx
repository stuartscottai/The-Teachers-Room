
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { GameRunOptions, GeneratedGame, StopTheFireDifficulty } from '../../types';
import { STOP_THE_FIRE_CATEGORIES } from '../../data/stopTheFireCategories';
import { playSound } from '../../utils/gameUtils';
import { ArrowLeft, Flame, RefreshCw, Trophy, Volume2, VolumeX } from 'lucide-react';

interface StopTheFireGameProps {
    game: GeneratedGame;
    options: GameRunOptions;
    onBack: () => void;
    onFinish: () => void;
    onReplay: () => void;
}

const CATEGORY_MIN = 1;
const CATEGORY_MAX = 20;
const TIMER_OPTIONS = [30, 45, 60, 90, 120];
const FULL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const buildLetterPool = () => {
    const excluded = new Set(['Q', 'X', 'Z']);
    return FULL_LETTERS.split('').filter((letter) => !excluded.has(letter));
};

const shuffle = <T,>(items: T[]) => {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

const getDefaultTeamNames = (count: number) =>
    Array.from({ length: count }, (_, i) => (count === 1 ? 'Player 1' : `Team ${i + 1}`));

export const StopTheFireGame: React.FC<StopTheFireGameProps> = ({ game, options, onBack, onFinish }) => {
    const [players, setPlayers] = useState<number>(options.players || 2);
    const [teamNames, setTeamNames] = useState<string[]>(
        options.teamNames || getDefaultTeamNames(options.players || 2)
    );
    const [scores, setScores] = useState<number[]>(Array(options.players || 2).fill(0));
    const [categoryCount, setCategoryCount] = useState<number>(options.stopTheFireCategoryCount || 10);
    const [difficulty, setDifficulty] = useState<StopTheFireDifficulty>(options.stopTheFireDifficulty || 'beginner');
    const [timerSeconds, setTimerSeconds] = useState<number>(options.timerSeconds || 60);
    const [isMuted, setIsMuted] = useState<boolean>(options.muted || false);

    const [isFlipped, setIsFlipped] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number>(timerSeconds);
    const [isTimesUp, setIsTimesUp] = useState(false);
    const [roundIndex, setRoundIndex] = useState(1);
    const [currentLetter, setCurrentLetter] = useState('');
    const [currentCategories, setCurrentCategories] = useState<string[]>([]);

    const [showReview, setShowReview] = useState(false);
    const [showRoundSummary, setShowRoundSummary] = useState(false);
    const [showWinner, setShowWinner] = useState(false);
    const [winnerIndex, setWinnerIndex] = useState<number | null>(null);

    const [isTieBreaker, setIsTieBreaker] = useState(false);
    const [tieBreakerTeams, setTieBreakerTeams] = useState<number[]>([]);
    const [showTieBreakerResolve, setShowTieBreakerResolve] = useState(false);

    const [roundScores, setRoundScores] = useState<number[][]>([]);
    const [reviewIndex, setReviewIndex] = useState(0);
    const [categoryFontSize, setCategoryFontSize] = useState<number | null>(null);
    const [categoryLayout, setCategoryLayout] = useState({ gap: 12, padding: 12, circle: 28, lineGap: 8, clamp: 2 });
    const [isTwoColumn, setIsTwoColumn] = useState(false);
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const [isCompactHeight, setIsCompactHeight] = useState(false);
    const [mobileSetupHeight, setMobileSetupHeight] = useState<number | null>(null);
    const [showStopPrompt, setShowStopPrompt] = useState(false);
    const [stopPromptMode, setStopPromptMode] = useState<'manual' | 'timeout'>('manual');
    const [extraTime, setExtraTime] = useState(30);
    const [roundDuration, setRoundDuration] = useState<number>(options.timerSeconds || 60);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const usedCategories = useRef<Set<string>>(new Set());
    const usedLetters = useRef<Set<string>>(new Set());
    const categoryGridRef = useRef<HTMLDivElement>(null);
    const setupFaceRef = useRef<HTMLDivElement>(null);

    const manualCategoryPool = useMemo(() => {
        if (!game.stopTheFireCategories || game.stopTheFireCategories.length === 0) return null;
        const cleaned = game.stopTheFireCategories.map((text) => text.trim()).filter(Boolean);
        if (cleaned.length === 0) return null;
        return cleaned.map((text) => ({ text }));
    }, [game.stopTheFireCategories]);

    const categoryPool = useMemo(() => {
        if (manualCategoryPool) {
            return manualCategoryPool;
        }
        return STOP_THE_FIRE_CATEGORIES.filter((c) => c.difficulty === difficulty);
    }, [difficulty, manualCategoryPool]);

    const letterPool = useMemo(() => buildLetterPool(), []);

    useEffect(() => {
        const shouldLock = isFlipped || showReview || showRoundSummary || showWinner || showTieBreakerResolve;
        document.body.style.overflow = shouldLock ? 'hidden' : 'auto';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isFlipped, showReview, showRoundSummary, showWinner, showTieBreakerResolve]);

    useEffect(() => {
        if (!currentLetter) {
            setCurrentLetter(getNextLetter());
        }
    }, [currentLetter]);

    useEffect(() => {
        if (showReview) {
            setReviewIndex(0);
        }
    }, [showReview]);

    useEffect(() => {
        setTimeLeft(timerSeconds);
        setRoundDuration(timerSeconds);
    }, [timerSeconds]);

    useEffect(() => {
        if (!manualCategoryPool) return;
        const maxAllowed = Math.min(CATEGORY_MAX, manualCategoryPool.length);
        if (categoryCount > maxAllowed) {
            setCategoryCount(Math.max(1, maxAllowed));
        }
    }, [manualCategoryPool, categoryCount]);

    useEffect(() => {
        setTeamNames((prev) => {
            const next = Array.from({ length: players }, (_, i) =>
                prev[i] || (players === 1 ? 'Player 1' : `Team ${i + 1}`)
            );
            return next;
        });
        setScores((prev) => {
            const next = Array.from({ length: players }, (_, i) => prev[i] || 0);
            return next;
        });
    }, [players]);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    useEffect(() => {
        const media = window.matchMedia('(min-width: 768px)');
        const handleChange = () => setIsTwoColumn(media.matches);
        handleChange();
        media.addEventListener('change', handleChange);
        return () => media.removeEventListener('change', handleChange);
    }, []);

    useEffect(() => {
        const media = window.matchMedia('(max-width: 639px)');
        const handleChange = () => setIsMobileViewport(media.matches);
        handleChange();
        media.addEventListener('change', handleChange);
        return () => media.removeEventListener('change', handleChange);
    }, []);

    useEffect(() => {
        const media = window.matchMedia('(max-height: 740px)');
        const handleChange = () => setIsCompactHeight(media.matches);
        handleChange();
        media.addEventListener('change', handleChange);
        return () => media.removeEventListener('change', handleChange);
    }, []);

    useLayoutEffect(() => {
        if (!isMobileViewport || isFlipped) {
            setMobileSetupHeight(null);
            return;
        }
        const el = setupFaceRef.current;
        if (!el) return;
        const nextHeight = el.scrollHeight;
        if (nextHeight > 0) {
            setMobileSetupHeight(nextHeight);
        }
    }, [isMobileViewport, isFlipped, players, teamNames, difficulty, categoryCount, timerSeconds, roundIndex]);

    useEffect(() => {
        const grid = categoryGridRef.current;
        if (!grid) return;
        const updateSize = () => {
            const rect = grid.getBoundingClientRect();
            if (isMobileViewport) {
                const columns = 1;
                const rows = Math.max(1, Math.ceil(currentCategories.length / columns));
                const perRow = rect.height / rows;
                const gap = Math.max(4, Math.min(8, Math.round(perRow * 0.14)));
                const contentHeight = rect.height - gap * (rows - 1);
                const rowHeight = contentHeight / rows;
                const base = Math.max(11, Math.min(18, Math.floor(rowHeight * 0.42)));
                const padding = Math.max(4, Math.min(8, Math.round(rowHeight * 0.18)));
                const circle = Math.max(18, Math.min(26, Math.round(rowHeight * 0.55)));
                const lineGap = Math.max(4, Math.min(6, Math.round(rowHeight * 0.12)));
                const clamp = rowHeight < 34 ? 1 : 2;
                setCategoryFontSize(base);
                setCategoryLayout({ gap, padding, circle, lineGap, clamp });
                return;
            }
            const columns = isTwoColumn ? 2 : 1;
            const rows = Math.max(1, Math.ceil(currentCategories.length / columns));
            const perRow = rect.height / rows;
            const gap = Math.max(6, Math.min(14, Math.round(perRow * 0.12)));
            const contentHeight = rect.height - gap * (rows - 1);
            const rowHeight = contentHeight / rows;
            const nextSize = Math.max(12, Math.min(38, Math.floor(rowHeight * 0.44)));
            const padding = Math.max(6, Math.min(14, Math.round(rowHeight * 0.16)));
            const circle = Math.max(22, Math.min(34, Math.round(rowHeight * 0.38)));
            const lineGap = Math.max(4, Math.min(8, Math.round(rowHeight * 0.1)));
            setCategoryFontSize(nextSize);
            setCategoryLayout({ gap, padding, circle, lineGap, clamp: 2 });
        };
        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(grid);
        return () => observer.disconnect();
    }, [currentCategories.length, isTwoColumn, isMobileViewport]);
    const getNextLetter = () => {
        const available = letterPool.filter((letter) => !usedLetters.current.has(letter));
        const pool = available.length > 0 ? available : letterPool;
        const letter = pool[Math.floor(Math.random() * pool.length)];
        usedLetters.current.add(letter);
        return letter;
    };

    const rerollLetter = () => {
        setCurrentLetter(getNextLetter());
        playSound('select', isMuted, options.soundConfig?.select);
    };

    const pickCategories = (count: number) => {
        const freshPool = categoryPool.filter((c) => !usedCategories.current.has(c.text));
        const pool = freshPool.length >= count ? freshPool : categoryPool;
        const chosen = shuffle(pool).slice(0, count).map((c) => c.text);
        chosen.forEach((text) => usedCategories.current.add(text));
        return chosen;
    };

    const startTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    timerRef.current = null;
                    setIsTimesUp(true);
                    playSound('times-up', isMuted, options.soundConfig?.timesUp);
                    setTimeout(() => openStopPrompt('timeout'), 150);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const beginRound = () => {
        const count = isTieBreaker ? 1 : categoryCount;
        const categories = pickCategories(count);
        setCurrentCategories(categories);
        setRoundScores(Array.from({ length: players }, () => Array(categories.length).fill(0)));
        setIsTimesUp(false);
        setTimeLeft(timerSeconds);
        setRoundDuration(timerSeconds);
        setIsFlipped(true);
        setShowReview(false);
        setShowRoundSummary(false);
        setShowTieBreakerResolve(false);
        startTimer();
        playSound('select', isMuted, options.soundConfig?.select);
    };

    const endRound = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        goToScoring();
    };

    const openStopPrompt = (mode: 'manual' | 'timeout') => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setStopPromptMode(mode);
        setShowStopPrompt(true);
    };

    const goToScoring = () => {
        if (isTieBreaker) {
            setShowTieBreakerResolve(true);
            return;
        }
        setShowReview(true);
    };

    const handleStop = () => {
        if (isTimesUp) return;
        openStopPrompt('manual');
    };

    const updateRoundScore = (teamIndex: number, categoryIndex: number, value: number) => {
        setRoundScores((prev) => {
            const next = prev.map((teamScores) => [...teamScores]);
            next[teamIndex][categoryIndex] = value;
            return next;
        });
    };

    const roundTotals = useMemo(
        () => roundScores.map((team) => team.reduce((acc, val) => acc + val, 0)),
        [roundScores]
    );

    const applyScores = () => {
        setScores((prev) => prev.map((score, i) => score + (roundTotals[i] || 0)));
        setShowReview(false);
        setShowRoundSummary(true);
        playSound('correct', isMuted, options.soundConfig?.correct);
    };

    const handleNextRound = () => {
        setRoundIndex((prev) => prev + 1);
        setIsFlipped(false);
        setShowRoundSummary(false);
        setIsTieBreaker(false);
        setTieBreakerTeams([]);
        setCurrentLetter(getNextLetter());
        setCurrentCategories([]);
    };

    const handleEndGame = () => {
        const maxScore = Math.max(...scores);
        const winners = scores
            .map((score, idx) => ({ score, idx }))
            .filter((entry) => entry.score === maxScore)
            .map((entry) => entry.idx);

        if (winners.length > 1) {
            setIsTieBreaker(true);
            setTieBreakerTeams(winners);
            setShowRoundSummary(false);
            setIsFlipped(false);
            setCurrentLetter(getNextLetter());
            setRoundIndex((prev) => prev + 1);
            return;
        }

        setWinnerIndex(winners[0]);
        setShowWinner(true);
        playSound('win', isMuted, options.soundConfig?.win);
    };

    const resolveTieBreaker = (winner: number) => {
        setScores((prev) => prev.map((score, idx) => (idx === winner ? score + 1 : score)));
        setWinnerIndex(winner);
        setShowTieBreakerResolve(false);
        setShowWinner(true);
        playSound('win', isMuted, options.soundConfig?.win);
    };

    const canEditTeams = scores.every((score) => score === 0) && roundIndex === 1 && !isTieBreaker;

    const timerProgress = roundDuration > 0 ? Math.max(0, Math.min(1, timeLeft / roundDuration)) : 0;
    const totalCategories = currentCategories.length;
    const currentReviewCategory = currentCategories[reviewIndex] || '';

    return (
        <div className="min-h-screen bg-orange-50 flex flex-col relative">
            <div className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-amber-100 bg-white/70 backdrop-blur-sm">
                <button onClick={onBack} className="flex items-center text-slate-500 hover:text-orange-600 font-bold">
                    <ArrowLeft size={18} className="mr-2" /> Back
                </button>
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 text-orange-600 font-bold">
                        <Flame size={18} /> {game.title}
                    </div>
                    <button
                        onClick={() => setIsMuted((prev) => !prev)}
                        className="p-2 rounded-full bg-white shadow-sm border border-slate-200 text-slate-500 hover:text-orange-600"
                        title="Toggle Sound"
                    >
                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                </div>
            </div>

            <div
                className={`flex-1 flex flex-col items-center px-4 pt-6 pb-12 ${
                    isMobileViewport ? 'justify-start overflow-y-auto' : 'justify-center'
                }`}
                style={{ paddingBottom: 'max(3rem, env(safe-area-inset-bottom))' }}
            >
                <div
                    className={`w-full max-w-[420px] ${
                        isMobileViewport
                            ? isFlipped
                                ? 'h-[68vh] max-h-[720px] min-h-[380px]'
                                : 'h-auto max-h-none'
                            : 'h-[68vh] max-h-[720px] min-h-[380px]'
                    } sm:max-w-[560px] sm:h-full sm:max-h-[90vh] md:max-w-6xl md:h-auto md:max-h-full md:aspect-[16/9] [perspective:1000px]`}
                    style={
                        isMobileViewport && !isFlipped && mobileSetupHeight
                            ? { height: mobileSetupHeight }
                            : undefined
                    }
                >
                    <div
                        className={`relative w-full ${isMobileViewport && !isFlipped ? 'h-auto' : 'h-full'} transition-all duration-700 [transform-style:preserve-3d] ${
                            isFlipped ? '[transform:rotateY(180deg)]' : ''
                        }`}
                    >
                        {/* FRONT - SETUP */}
                        <div
                            ref={setupFaceRef}
                            className={`${
                                isMobileViewport && !isFlipped
                                    ? 'relative w-full h-auto'
                                    : 'absolute inset-0 h-full'
                            } [backface-visibility:hidden] [transform:translateZ(0)] rounded-2xl shadow-2xl overflow-hidden flex flex-col bg-white ${
                                isFlipped ? 'pointer-events-none' : ''
                            }`}
                        >
                            <div className="bg-orange-500 text-white p-4 sm:p-6 flex items-center justify-between">
                                <div>
                                    <div className="text-xs uppercase tracking-widest text-orange-100">Setup</div>
                                    <div className="text-lg sm:text-2xl font-bold">
                                        {isTieBreaker ? 'Tie-breaker Round' : `Round ${roundIndex}`}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl sm:text-4xl font-black">{currentLetter}</div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-visible sm:overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Players / Teams</label>
                                        <div className="flex flex-wrap gap-2">
                                            {[1, 2, 3, 4, 5, 6].map((num) => (
                                                <button
                                                    key={num}
                                                    onClick={() => canEditTeams && setPlayers(num)}
                                                    disabled={!canEditTeams}
                                                    className={`w-10 h-10 rounded-lg font-bold transition-all ${
                                                        players === num
                                                            ? 'bg-orange-500 text-white shadow-md'
                                                            : 'bg-slate-100 text-slate-600'
                                                    } ${!canEditTeams ? 'opacity-50 cursor-not-allowed' : 'hover:bg-orange-100'}`}
                                                >
                                                    {num}
                                                </button>
                                            ))}
                                        </div>
                                        {!canEditTeams && (
                                            <p className="text-[11px] text-slate-400 mt-2">Team count locks after scoring starts.</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Team Names</label>
                                        <div className="space-y-2 max-h-44 overflow-y-auto pr-2">
                                            {teamNames.map((name, idx) => (
                                                <input
                                                    key={idx}
                                                    type="text"
                                                    value={name}
                                                    onChange={(e) =>
                                                        setTeamNames((prev) => {
                                                            const next = [...prev];
                                                            next[idx] = e.target.value;
                                                            return next;
                                                        })
                                                    }
                                                    className="w-full p-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-orange-200 outline-none"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Difficulty</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {(['beginner', 'intermediate', 'advanced'] as StopTheFireDifficulty[]).map((level) => (
                                                <button
                                                    key={level}
                                                    onClick={() => setDifficulty(level)}
                                                    disabled={!!manualCategoryPool}
                                                    className={`py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                                                        difficulty === level ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-orange-100'
                                                    } ${manualCategoryPool ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    {level}
                                                </button>
                                            ))}
                                        </div>
                                        {manualCategoryPool && (
                                            <p className="text-[11px] text-slate-400 mt-2">Using your custom category list.</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Categories</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="range"
                                                min={CATEGORY_MIN}
                                                max={manualCategoryPool ? Math.min(CATEGORY_MAX, manualCategoryPool.length) : CATEGORY_MAX}
                                                value={categoryCount}
                                                onChange={(e) => !isTieBreaker && setCategoryCount(Number(e.target.value))}
                                                disabled={isTieBreaker}
                                                className="w-full accent-orange-500"
                                            />
                                            <div className="min-w-[44px] text-center text-sm font-bold text-orange-600 bg-orange-50 border border-orange-200 rounded-lg py-1">
                                                {categoryCount}
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                                            <span>{CATEGORY_MIN}</span>
                                            <span>{manualCategoryPool ? Math.min(CATEGORY_MAX, manualCategoryPool.length) : CATEGORY_MAX}</span>
                                        </div>
                                        {isTieBreaker && <p className="text-[11px] text-slate-400 mt-2">Tie-breaker uses 1 category.</p>}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Timer</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {TIMER_OPTIONS.map((value) => (
                                                <button
                                                    key={value}
                                                    onClick={() => setTimerSeconds(value)}
                                                    className={`py-2 rounded-lg text-xs font-bold transition-all ${
                                                        timerSeconds === value ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-orange-100'
                                                    }`}
                                                >
                                                    {value}s
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center justify-between">
                                        <div>
                                            <div className="text-xs uppercase tracking-widest text-orange-500">Preview</div>
                                            <div className="text-3xl font-black text-orange-600">{currentLetter}</div>
                                        </div>
                                        <button
                                            onClick={rerollLetter}
                                            className="p-2 rounded-full bg-white text-orange-600 border border-orange-200 hover:bg-orange-100"
                                            title="Reroll letter"
                                        >
                                            <RefreshCw size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div
                                className={`p-4 sm:p-6 border-t border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between bg-white ${
                                    isMobileViewport ? '' : 'sticky bottom-0 z-10'
                                }`}
                            >
                                <div className="text-xs text-slate-400">
                                    {isTieBreaker ? 'Tie-breaker round: 1 category, first to answer.' : 'Scores carry over across rounds.'}
                                </div>
                                <button
                                    onClick={beginRound}
                                    className="bg-orange-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-orange-600 transition-colors"
                                >
                                    Start Round
                                </button>
                            </div>
                        </div>

                        {/* BACK - PLAY */}
                            {!(isMobileViewport && !isFlipped) && (
                                <div
                                    className={`absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full bg-orange-500 ${
                                        !isFlipped ? 'pointer-events-none' : ''
                                    }`}
                                >
                            <div className="p-4 sm:p-6 flex items-center justify-between text-white">
                                <div>
                                    <div className="text-xs uppercase tracking-widest text-orange-100">
                                        {isTieBreaker ? 'Tie-breaker' : `Round ${roundIndex}`}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={handleStop}
                                        className="bg-white text-orange-600 font-bold px-4 py-2 rounded-full shadow-md hover:bg-orange-50"
                                    >
                                        Stop
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 bg-white/95 rounded-t-3xl p-3 sm:p-6 flex flex-col min-h-0">
                                <div className="mb-3 sm:mb-4">
                                    <div className="relative h-8 sm:h-10 bg-orange-100 rounded-full overflow-hidden">
                                        <div
                                            className="absolute left-0 top-0 h-full bg-orange-500 transition-all duration-1000 flex items-center justify-end pr-3"
                                            style={{ width: `${timerProgress * 100}%` }}
                                        >
                                            <span className="text-white font-black text-sm sm:text-lg">
                                                {timeLeft}s
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className={`text-center ${currentCategories.length >= 10 ? 'mb-1 sm:mb-2' : 'mb-3 sm:mb-6'}`}>
                                    <div
                                        className={`font-black text-orange-600 leading-none ${
                                            isMobileViewport
                                                ? 'text-[clamp(36px,12vw,64px)]'
                                                : currentCategories.length >= 15
                                                    ? 'text-[clamp(48px,9vw,96px)]'
                                                    : currentCategories.length >= 10
                                                        ? 'text-[clamp(56px,10vw,120px)]'
                                                        : 'text-[clamp(64px,11vw,140px)]'
                                        }`}
                                    >
                                        {currentLetter}
                                    </div>
                                </div>
                                <div
                                    ref={categoryGridRef}
                                    className={`flex-1 min-h-0 ${
                                        isMobileViewport
                                            ? 'grid grid-cols-1 auto-rows-fr overflow-hidden'
                                            : 'grid grid-cols-1 md:grid-cols-2 auto-rows-fr overflow-hidden'
                                    }`}
                                    style={{ gap: `${categoryLayout.gap}px` }}
                                >
                                    {currentCategories.map((category, idx) => {
                                        const baseSize = categoryFontSize ?? 18;
                                        const length = category.length;
                                        let scale = 1;
                                        if (length > 52) scale = 0.62;
                                        else if (length > 46) scale = 0.7;
                                        else if (length > 40) scale = 0.78;
                                        else if (length > 34) scale = 0.86;
                                        else if (length > 28) scale = 0.94;
                                        const size = Math.max(12, Math.floor(baseSize * scale));
                                        return (
                                            <div
                                                key={category}
                                                className={`flex items-center gap-3 rounded-xl bg-white border border-orange-100 shadow-sm min-h-0 overflow-hidden ${
                                                    isMobileViewport ? '' : 'h-full'
                                                }`}
                                                style={{ padding: `${categoryLayout.padding}px` }}
                                            >
                                            <div
                                                className="rounded-full bg-orange-500 text-white font-bold flex items-center justify-center leading-none"
                                                style={{
                                                    width: `${categoryLayout.circle}px`,
                                                    height: `${categoryLayout.circle}px`,
                                                    fontSize: Math.max(12, Math.floor(categoryLayout.circle * 0.55)),
                                                    lineHeight: 1
                                                }}
                                            >
                                                <span className="leading-none" style={{ transform: 'translateY(1px)' }}>
                                                    {idx + 1}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0 overflow-hidden">
                                                <div
                                                    className="font-semibold text-slate-800 leading-tight overflow-hidden"
                                                    style={{
                                                        fontSize: size,
                                                        lineHeight: 1.08,
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: categoryLayout.clamp,
                                                        WebkitBoxOrient: 'vertical'
                                                    }}
                                                >
                                                    {category}
                                                </div>
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                            )}
                    </div>
                </div>

                <div className="w-full max-w-6xl mt-6 mb-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-wrap gap-3 items-center justify-center">
                        {scores.map((score, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-orange-50 border border-orange-100 px-4 py-2 rounded-full">
                                <span className="text-xs font-bold text-orange-600 uppercase">{teamNames[idx]}</span>
                                <span className="text-lg font-black text-slate-800">{score}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {showStopPrompt && (
                <div
                    className={`fixed inset-0 z-[500] flex ${isCompactHeight ? 'items-start overflow-y-auto py-6' : 'items-center'} justify-center bg-black/40 backdrop-blur-sm p-4`}
                >
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 text-center">
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Stop the Fire?</h2>
                        {stopPromptMode === 'timeout' ? (
                            <>
                                <p className="text-slate-500 mb-6">Time is up. Do you want to score now or add more time?</p>
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
                                    <div className="relative">
                                        <select
                                            value={extraTime}
                                            onChange={(e) => setExtraTime(Number(e.target.value))}
                                            className="px-4 pr-12 py-2 border border-slate-200 rounded-lg font-bold text-slate-700 appearance-none bg-transparent"
                                            style={{ appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', backgroundImage: 'none' }}
                                        >
                                            {[15, 30, 45, 60, 90, 120].map((value) => (
                                                <option key={value} value={value}>
                                                    +{value}s
                                                </option>
                                            ))}
                                        </select>
                                        <svg
                                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                                            width="14"
                                            height="14"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                        >
                                            <path d="M5.25 7.5l4.5 4.5 4.5-4.5" />
                                        </svg>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowStopPrompt(false);
                                            setIsTimesUp(false);
                                            setTimeLeft((prev) => {
                                                const next = prev + extraTime;
                                                setRoundDuration((prevDuration) => prevDuration + extraTime);
                                                return next;
                                            });
                                            startTimer();
                                        }}
                                        className="bg-orange-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-orange-600"
                                    >
                                        Add Time
                                    </button>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowStopPrompt(false);
                                        endRound();
                                    }}
                                    className="w-full bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200"
                                >
                                    Score Now
                                </button>
                            </>
                        ) : (
                            <>
                                <p className="text-slate-500 mb-6">Do you want to stop and score this round?</p>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={() => {
                                            setShowStopPrompt(false);
                                            endRound();
                                        }}
                                        className="flex-1 bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600"
                                    >
                                        Yes, Score
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowStopPrompt(false);
                                            if (!isTimesUp && timeLeft > 0) startTimer();
                                        }}
                                        className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200"
                                    >
                                        No, Keep Going
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
            {/* REVIEW MODAL */}
            {showReview && (
                <div
                    className={`fixed inset-0 z-[500] flex ${
                        isCompactHeight || isMobileViewport
                            ? 'items-start overflow-y-auto pt-[calc(4rem+1.5rem+env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]'
                            : 'items-center'
                    } justify-center bg-black/40 backdrop-blur-sm p-4`}
                >
                    <div
                        className={`bg-white rounded-2xl shadow-2xl w-[min(92vw,48rem)] max-w-3xl flex flex-col min-h-0 ${
                            isCompactHeight ? 'max-h-none overflow-visible' : 'max-h-[90vh] overflow-hidden'
                        }`}
                    >
                        <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Score Round</h2>
                                <p className="text-sm text-slate-500">
                                    Category {reviewIndex + 1} of {totalCategories}. Use 2 (unique), 1 (shared), 0 (invalid).
                                </p>
                            </div>
                        </div>

                        <div className={`flex-1 min-h-0 p-6 ${isCompactHeight ? 'overflow-visible' : 'overflow-auto'}`}>
                            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 sm:p-6 mb-6">
                                <div className="text-xs uppercase tracking-widest text-orange-400 mb-2">Category</div>
                                <div className="text-lg sm:text-2xl font-bold text-slate-800">{currentReviewCategory}</div>
                            </div>
                            <div className="space-y-3">
                                {teamNames.map((name, tIdx) => (
                                    <div key={name} className="flex items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl px-4 py-3">
                                        <div className="font-semibold text-slate-700">{name}</div>
                                        <div className="flex items-center gap-2">
                                            {[0, 1, 2].map((value) => {
                                                const active = (roundScores[tIdx]?.[reviewIndex] ?? 0) === value;
                                                return (
                                                    <button
                                                        key={value}
                                                        onClick={() => updateRoundScore(tIdx, reviewIndex, value)}
                                                        className={`w-10 h-10 rounded-lg font-bold border transition-colors ${
                                                            active
                                                                ? 'bg-orange-500 text-white border-orange-500'
                                                                : 'bg-white text-slate-600 border-slate-200 hover:bg-orange-50'
                                                        }`}
                                                    >
                                                        {value}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 sm:p-6 border-t border-slate-200 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                            <div className="flex flex-wrap gap-3 flex-1 min-w-0">
                                {roundTotals.map((total, idx) => (
                                    <div key={idx} className="bg-orange-50 text-orange-700 px-3 py-2 rounded-full text-sm font-bold">
                                        {teamNames[idx]} +{total}
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:ml-auto">
                                <button
                                    onClick={() => setReviewIndex((prev) => Math.max(0, prev - 1))}
                                    disabled={reviewIndex === 0}
                                    className="flex-1 sm:flex-none bg-slate-100 text-slate-600 font-bold px-5 py-3 rounded-xl hover:bg-slate-200 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                {reviewIndex < totalCategories - 1 ? (
                                    <button
                                        onClick={() => setReviewIndex((prev) => Math.min(totalCategories - 1, prev + 1))}
                                        className="flex-1 sm:flex-none bg-orange-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-orange-600"
                                    >
                                        Next Category
                                    </button>
                                ) : (
                                    <button
                                        onClick={applyScores}
                                        className="flex-1 sm:flex-none bg-orange-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-orange-600"
                                    >
                                        Apply Scores
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ROUND SUMMARY */}
            {showRoundSummary && (
                <div
                    className={`fixed inset-0 z-[500] flex ${isCompactHeight ? 'items-start overflow-y-auto py-6' : 'items-center'} justify-center bg-black/40 backdrop-blur-sm p-4`}
                >
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 text-center">
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Round Complete</h2>
                        <p className="text-slate-500 mb-6">Scores carry over to the next round.</p>
                        <div className="flex flex-wrap gap-3 justify-center mb-6">
                            {scores.map((score, idx) => (
                                <div key={idx} className="bg-orange-50 border border-orange-100 px-4 py-2 rounded-full font-bold text-slate-700">
                                    {teamNames[idx]}: {score}
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={handleNextRound}
                                className="flex-1 bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600"
                            >
                                Play Another Round
                            </button>
                            <button
                                onClick={handleEndGame}
                                className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200"
                            >
                                End Game
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TIE BREAKER RESOLVE */}
            {showTieBreakerResolve && (
                <div
                    className={`fixed inset-0 z-[500] flex ${isCompactHeight ? 'items-start overflow-y-auto py-6' : 'items-center'} justify-center bg-black/40 backdrop-blur-sm p-4`}
                >
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 text-center">
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Tie-breaker Winner</h2>
                        <p className="text-slate-500 mb-6">Select the team that answered first.</p>
                        <div className="space-y-3">
                            {tieBreakerTeams.map((idx) => (
                                <button
                                    key={idx}
                                    onClick={() => resolveTieBreaker(idx)}
                                    className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600"
                                >
                                    {teamNames[idx]} Wins
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* WINNER SCREEN */}
            {showWinner && winnerIndex !== null && (
                <div
                    className={`fixed inset-0 z-[500] flex ${isCompactHeight ? 'items-start overflow-y-auto py-6' : 'items-center'} justify-center bg-black/40 backdrop-blur-sm p-4`}
                >
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 text-center">
                        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                            <Trophy size={24} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Winner</h2>
                        <p className="text-xl font-black text-orange-600 mb-4">{teamNames[winnerIndex]}</p>
                        <div className="mb-6 text-slate-600">Final Score: {scores[winnerIndex]}</div>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => {
                                    setShowWinner(false);
                                    onFinish();
                                }}
                                className="bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600"
                            >
                                Back to Game Hub
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
