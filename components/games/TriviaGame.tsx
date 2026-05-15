
import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { BonusCardType, GeneratedGame, GameRunOptions, GeneratedQuestion, PracticeReviewItem } from '../../types';
import { playSound } from '../../utils/gameUtils';
import { resolveGameImageUrl } from '../../utils/gameImage';
import { WinnerCeremonyHero, WinnerCeremonyStandingsTable } from './shared/WinnerCeremonyHero';
import { PracticeReviewSummary } from './shared/PracticeReviewSummary';
import { ArrowLeft, Maximize2, Minimize2, RotateCcw, X, Check, Edit2, Clock, Volume2, VolumeX, CheckCircle, XCircle, Flag } from 'lucide-react';

interface TriviaGameProps {
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
            <div className={`font-black font-mono leading-none tracking-tight transition-all ${className || 'text-5xl'}`}>
                {displayScore}
            </div>
            {diff !== 0 && (
                <div className={`absolute -top-8 left-1/2 -translate-x-1/2 font-bold animate-bounce ${diffClassName || 'text-xl'}
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
    const [showEndGameConfirm, setShowEndGameConfirm] = useState(false);
    const [mcResult, setMcResult] = useState<'correct' | 'incorrect' | null>(null);
    const [selectedMcAnswer, setSelectedMcAnswer] = useState('');
    const [missedItems, setMissedItems] = useState<PracticeReviewItem[]>([]);
    
    // Lock state to prevent double clicks/points
    const [isProcessing, setIsProcessing] = useState(false);

    
    // Audio State
    const [isMuted, setIsMuted] = useState(options.muted);
    const [isImageZoomOpen, setIsImageZoomOpen] = useState(false);

    // Team Edit State
    const [editingTeamIndex, setEditingTeamIndex] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editScore, setEditScore] = useState(0);

    // Local state for runtime questions
    const [gameQuestions, setGameQuestions] = useState<GeneratedQuestion[]>([]);

    // Fullscreen logic
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const [resizeTick, setResizeTick] = useState(0);
    const questionWrapRef = useRef<HTMLDivElement>(null);
    const questionTextRef = useRef<HTMLDivElement>(null);
    const [questionFontSize, setQuestionFontSize] = useState<number | null>(null);
    const answerWrapRef = useRef<HTMLDivElement>(null);
    const answerTextRef = useRef<HTMLDivElement>(null);
    const [answerFontSize, setAnswerFontSize] = useState<number | null>(null);
    const optionGridRef = useRef<HTMLDivElement>(null);
    const optionMeasureRef = useRef<HTMLDivElement>(null);
    const [optionFontSize, setOptionFontSize] = useState<number | null>(null);

    // Grid Calculation State
    const [gridDimensions, setGridDimensions] = useState({ width: 100, height: 100 });
    const gridWrapperRef = useRef<HTMLDivElement>(null);

    // Timer
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [isTimesUp, setIsTimesUp] = useState(false);
    const timerRef = useRef<any>(null);

    const activeQ = activeQuestionIndex !== null ? gameQuestions[activeQuestionIndex] : null;
    const isBonus = activeQ?.isBonus;
    const hasOptions = activeQ?.options && activeQ.options.length > 0;
    const optionKey = activeQ?.options?.join('|') || '';
    const isPositiveBonus = activeQ?.bonusType === 'double' || activeQ?.bonusType === 'steal' || activeQ?.bonusType === 'first-place';
    const isNegativeBonus = activeQ?.bonusType === 'bust' || activeQ?.bonusType === 'lose-all' || activeQ?.bonusType === 'reset-score' || activeQ?.bonusType === 'last-place';
    const questionImageUrl = resolveGameImageUrl(activeQ?.image?.url, activeQ?.image?.thumbUrl);
    const questionImageAlt = activeQ?.image?.alt || '';
    const bonusEffectText =
        activeQ?.bonusType === 'double' ? 'DOUBLE POINTS!' :
        activeQ?.bonusType === 'bust' ? 'OH NO! BUSTED!' :
        activeQ?.bonusType === 'steal' ? 'POINT STEAL!' :
        activeQ?.bonusType === 'lose-all' ? 'LOSE ALL POINTS!' :
        activeQ?.bonusType === 'reset-score' ? 'RESET SCORE!' :
        activeQ?.bonusType === 'first-place' ? 'FIRST PLACE!' :
        activeQ?.bonusType === 'last-place' ? 'LAST PLACE!' : '';
    const bonusDetailText =
        activeQ?.bonusType === 'double' ? `You get 2x points (+${(activeQ?.points || 100) * 2}) automatically!` :
        activeQ?.bonusType === 'bust' ? `You lose the value of this tile (-${activeQ?.points || 100}).` :
        activeQ?.bonusType === 'steal' ? "Steal this tile's value from the current leader!" :
        activeQ?.bonusType === 'lose-all' ? 'Your team loses every point it has.' :
        activeQ?.bonusType === 'reset-score' ? 'Your team score goes back to 0.' :
        activeQ?.bonusType === 'first-place' ? 'Your team jumps just ahead of the current leader.' :
        activeQ?.bonusType === 'last-place' ? 'Your team drops just behind the lowest score.' : '';
    const timerProgress = options.timerSeconds > 0
        ? Math.max(0, Math.min(1, timeLeft / options.timerSeconds))
        : 0;

    // BODY SCROLL LOCK
    useEffect(() => {
        const shouldLock = activeQuestionIndex !== null || editingTeamIndex !== null;
        document.body.style.overflow = shouldLock ? 'hidden' : 'auto';
        return () => { document.body.style.overflow = 'auto'; };
    }, [activeQuestionIndex, isGameOver, editingTeamIndex]);

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

    useLayoutEffect(() => {
        if (!hasOptions) return;
        const grid = optionGridRef.current;
        if (!grid) return;
        const observer = new ResizeObserver(() => setResizeTick(prev => prev + 1));
        observer.observe(grid);
        return () => observer.disconnect();
    }, [hasOptions]);

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

        // Optional runtime mode: randomize card values without regenerating content
        if (options.triviaRandomPoints) {
            const randomValues = [25, 50, 75, 100] as const;
            questionsCopy = questionsCopy.map((q: any) => ({
                ...q,
                points: randomValues[Math.floor(Math.random() * randomValues.length)]
            }));
        }
        
        // 2. Apply Chaos Mode (Bonuses) - 20%
        if (options.enableBonuses) {
            const indices = questionsCopy.map((_: any, i: number) => i);
            // Shuffle indices
            for (let i = indices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [indices[i], indices[j]] = [indices[j], indices[i]];
            }
            
            const bonusCount = Math.max(2, Math.floor(questionsCopy.length * 0.20));
            const selectedBonusTypes: BonusCardType[] = options.bonusOptions?.length
                ? options.bonusOptions
                : ['double', 'bust', 'steal'];
            
            for (let i = 0; i < bonusCount; i++) {
                const targetIndex = indices[i];
                if (questionsCopy[targetIndex]) {
                    questionsCopy[targetIndex].isBonus = true;
                    questionsCopy[targetIndex].bonusType = selectedBonusTypes[i % selectedBonusTypes.length];
                }
            }
        }
        setGameQuestions(questionsCopy);
    }, [game, options.bonusOptions, options.enableBonuses, options.questionLimit, options.players, options.randomizeQuestions, options.triviaRandomPoints]);

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
        setSelectedMcAnswer('');
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
            if (q && !q.isBonus) {
                setMissedItems((prev) => [
                    ...prev,
                    {
                        id: String(q.id ?? activeQuestionIndex),
                        question: q.question,
                        correctAnswer: q.answer,
                        studentAnswer: selectedMcAnswer || undefined,
                        context: q.category,
                    },
                ]);
            }
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
        
        setSelectedMcAnswer(selectedOption);
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
        } else if (q.bonusType === 'lose-all' || q.bonusType === 'reset-score') {
            newScores[currentTeam] = 0;
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
        } else if (q.bonusType === 'first-place') {
            const leaderScore = Math.max(...scores.filter((_, i) => i !== currentTeam), 0);
            newScores[currentTeam] = Math.max(newScores[currentTeam], leaderScore + points);
        } else if (q.bonusType === 'last-place') {
            const lowestScore = Math.min(...scores.filter((_, i) => i !== currentTeam), 0);
            newScores[currentTeam] = Math.min(newScores[currentTeam], lowestScore - points);
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

    const stripOptionPrefix = (value: string) => value.replace(/^[A-D]\)\s*/i, '').trim();

    useLayoutEffect(() => {
        if (!activeQ || isBonus || isFlipped) {
            setQuestionFontSize(null);
            return;
        }
        const wrap = questionWrapRef.current;
        const textEl = questionTextRef.current;
        if (!wrap || !textEl) return;
        const availableHeight = wrap.clientHeight;
        const availableWidth = textEl.clientWidth;
        if (availableHeight === 0 || availableWidth === 0) return;
        const maxSize = Math.min(hasOptions ? 48 : 72, Math.max(22, Math.floor(window.innerWidth / (hasOptions ? 9 : 7))));
        const minSize = 12;
        let size = maxSize;
        textEl.style.lineHeight = '1.15';
        textEl.style.fontSize = `${size}px`;
        while ((textEl.scrollHeight > availableHeight || textEl.scrollWidth > availableWidth) && size > minSize) {
            size -= 1;
            textEl.style.fontSize = `${size}px`;
        }
        setQuestionFontSize(size);
    }, [isMobileViewport, hasOptions, activeQ?.question, activeQ?.options?.length, isBonus, isFlipped, resizeTick]);

    useLayoutEffect(() => {
        if (!isMobileViewport || !activeQ || isBonus || !isFlipped) {
            setAnswerFontSize(null);
            return;
        }
        const wrap = answerWrapRef.current;
        const textEl = answerTextRef.current;
        if (!wrap || !textEl) return;
        const availableHeight = wrap.clientHeight;
        if (availableHeight === 0) return;
        const maxSize = Math.min(44, Math.max(22, Math.floor(window.innerWidth / 9.2)));
        const minSize = 12;
        let size = maxSize;
        textEl.style.lineHeight = '1.15';
        textEl.style.fontSize = `${size}px`;
        while (textEl.scrollHeight > availableHeight && size > minSize) {
            size -= 1;
            textEl.style.fontSize = `${size}px`;
        }
        setAnswerFontSize(size);
    }, [isMobileViewport, activeQ?.answer, isBonus, isFlipped, resizeTick]);

    useLayoutEffect(() => {
        if (!hasOptions || !activeQ?.options || isBonus || isFlipped) {
            setOptionFontSize(null);
            return;
        }
        const gridEl = optionGridRef.current;
        const measureEl = optionMeasureRef.current;
        if (!gridEl || !measureEl) return;
        const sampleCell = gridEl.firstElementChild as HTMLElement | null;
        if (!sampleCell) return;

        const rect = sampleCell.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const styles = window.getComputedStyle(sampleCell);
        const paddingX = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
        const paddingY = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
        const innerWidth = Math.max(0, rect.width - paddingX);
        const innerHeight = Math.max(0, rect.height - paddingY);
        if (innerWidth === 0 || innerHeight === 0) return;

        const textEl = sampleCell.querySelector('[data-option-text="true"]') as HTMLElement | null;
        const textStyles = textEl ? window.getComputedStyle(textEl) : null;

        measureEl.style.width = `${innerWidth}px`;
        measureEl.style.boxSizing = 'border-box';
        measureEl.style.fontFamily = styles.fontFamily;
        measureEl.style.fontWeight = styles.fontWeight;
        measureEl.style.letterSpacing = styles.letterSpacing;
        measureEl.style.whiteSpace = 'normal';
        measureEl.style.wordBreak = 'normal';
        measureEl.style.overflowWrap = 'normal';
        measureEl.style.hyphens = 'none';
        measureEl.style.paddingLeft = textStyles?.paddingLeft || '0px';
        measureEl.style.paddingRight = textStyles?.paddingRight || '0px';

        const lineHeight = 1.2;
        const maxSize = Math.min(48, Math.max(14, Math.floor(innerHeight * 0.85)));
        const minSize = 12;
        let size = maxSize;

        const fitsAll = (fontSize: number) => {
            measureEl.style.fontSize = `${fontSize}px`;
            measureEl.style.lineHeight = `${lineHeight}`;
            return activeQ.options!.every((opt) => {
                measureEl.textContent = stripOptionPrefix(opt);
                return measureEl.scrollHeight <= innerHeight && measureEl.scrollWidth <= innerWidth + 1;
            });
        };

        while (size > minSize && !fitsAll(size)) {
            size -= 1;
        }
        setOptionFontSize(size);
    }, [hasOptions, optionKey, isBonus, isFlipped, isMobileViewport, resizeTick]);

    if (gameQuestions.length === 0) return <div className="text-slate-500 text-center p-8">Loading Game...</div>;

    if (isGameOver) {
        if (options.studentPractice) {
            return (
                <PracticeReviewSummary
                    playerName={teamNames[0]}
                    correctCount={Math.max(0, answeredIndices.length - missedItems.length)}
                    totalCount={gameQuestions.length}
                    missedItems={missedItems}
                    onReplay={onReplay}
                    onExit={onFinish}
                />
            );
        }

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

    const mobileUsesTwoRowHeader = isMobileViewport && scores.length >= 4;
    const mobileHeaderColumns = scores.length >= 5 ? 3 : scores.length === 4 ? 2 : Math.max(scores.length, 1);
    const questionOverlayTopClass = isFullscreen
        ? `${mobileUsesTwoRowHeader ? 'top-[calc(7rem+env(safe-area-inset-top))]' : 'top-[calc(4.5rem+env(safe-area-inset-top))]'} sm:top-[calc(8.75rem+env(safe-area-inset-top))]`
        : `${mobileUsesTwoRowHeader ? 'top-[calc(11rem+env(safe-area-inset-top))]' : 'top-[calc(8.5rem+env(safe-area-inset-top))]'} sm:top-[calc(12.75rem+env(safe-area-inset-top))]`;

    return (
        <div ref={containerRef} className={`bg-sky-50 flex flex-col ${isFullscreen ? 'h-[calc(var(--app-vh,1vh)*100)]' : 'h-[calc(var(--app-vh,1vh)*100-4rem)]'} overflow-hidden transition-all duration-300 relative`}>
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
            <div className={`bg-white ${mobileUsesTwoRowHeader ? 'px-2 py-1.5 h-[110px]' : 'p-2 min-h-[70px]'} sm:p-4 shrink-0 z-[250] shadow-sm border-b border-slate-200 relative sm:min-h-[140px]`}>
                <div className={`flex w-full ${mobileUsesTwoRowHeader ? 'gap-2 items-start' : 'gap-3 sm:gap-4 items-center'}`}>
                    <div className={`flex min-w-fit shrink-0 ${mobileUsesTwoRowHeader ? 'gap-1' : 'gap-1.5'} sm:flex-col sm:items-start sm:gap-2 sm:min-w-[64px] ${mobileUsesTwoRowHeader ? 'flex-col items-start' : 'flex-row items-center'}`}>
                        <button 
                            onClick={() => setShowQuitConfirm(true)} 
                            className="hidden sm:flex w-[140px] justify-center text-slate-500 hover:text-red-600 items-center text-sm bg-slate-100 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors font-bold border border-slate-200"
                        >
                            <ArrowLeft size={16} className="mr-2" /> Quit
                        </button>
                        <button
                            onClick={() => setShowEndGameConfirm(true)}
                            className="hidden sm:flex w-[140px] justify-center text-white items-center text-sm bg-rose-700 hover:bg-rose-600 px-4 py-2 rounded-lg transition-colors font-bold border border-rose-800"
                            title="End game now"
                        >
                            <Flag size={16} className="mr-2" /> End Game
                        </button>
                        <button
                            onClick={() => setShowQuitConfirm(true)}
                            className={`sm:hidden ${mobileUsesTwoRowHeader ? 'w-[30px] h-[30px] rounded-md' : 'w-9 h-9 rounded-lg'} flex items-center justify-center border border-slate-200 bg-slate-100 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors`}
                            title="Quit"
                        >
                            <X size={mobileUsesTwoRowHeader ? 14 : 17} />
                        </button>
                        <button
                            onClick={() => setShowEndGameConfirm(true)}
                            className={`sm:hidden ${mobileUsesTwoRowHeader ? 'w-[30px] h-[30px] rounded-md' : 'w-9 h-9 rounded-lg'} flex items-center justify-center border border-rose-700 bg-rose-700 text-white hover:bg-rose-600 transition-colors`}
                            title="End game now"
                        >
                            <Flag size={mobileUsesTwoRowHeader ? 12 : 14} />
                        </button>
                        <button 
                            onClick={() => setIsMuted(!isMuted)} 
                            className={`sm:hidden ${mobileUsesTwoRowHeader ? 'w-[30px] h-[30px] rounded-md' : 'w-9 h-9 rounded-lg'} flex items-center justify-center border border-slate-200 bg-slate-100 text-slate-500 hover:text-brand-blue hover:bg-sky-50 transition-colors`}
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted ? <VolumeX size={mobileUsesTwoRowHeader ? 14 : 17} /> : <Volume2 size={mobileUsesTwoRowHeader ? 14 : 17} />}
                        </button>
                    </div>
                    
                    {/* Scoreboard Cards */}
                    <div
                        className={isMobileViewport
                            ? `flex-1 grid ${mobileUsesTwoRowHeader ? 'gap-1 content-start' : 'gap-1.5'} items-stretch`
                            : 'flex-1 flex justify-end sm:justify-center gap-2 sm:gap-4 flex-wrap sm:flex-nowrap overflow-x-auto no-scrollbar px-1 sm:px-4 h-full items-center'}
                        style={isMobileViewport ? { gridTemplateColumns: `repeat(${mobileHeaderColumns}, minmax(0, 1fr))` } : undefined}
                    >
                        {scores.map((score, idx) => (
                            <button 
                                key={idx} 
                                onClick={() => openEditTeam(idx)}
                                className={`${isMobileViewport ? `${mobileUsesTwoRowHeader ? 'h-[46px]' : 'h-12'} w-full min-w-0 px-2 py-1` : 'px-2 py-1 sm:px-6 sm:py-3 min-w-[86px] sm:min-w-[150px] h-12 sm:h-28'} rounded-xl text-center transition-all border-b-4 relative group flex flex-col justify-center items-center shadow-sm
                                    ${currentTeam === idx 
                                        ? 'bg-brand-blue border-sky-600 text-white shadow-lg ring-2 sm:ring-4 ring-sky-100 sm:scale-110 z-10' 
                                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'}`}
                            >
                                <div className="text-[10px] sm:text-lg uppercase font-bold tracking-wider truncate max-w-full sm:max-w-[130px] mb-0.5 sm:mb-1 flex items-center gap-1">
                                    {teamNames[idx]}
                                    {currentTeam === idx && <div className="w-2 h-2 rounded-full bg-brand-yellow animate-pulse ml-1"></div>}
                                </div>
                                <AnimatedScore score={score} className={`${mobileUsesTwoRowHeader ? 'text-base' : 'text-lg'} sm:text-5xl`} diffClassName="text-[10px] sm:text-xl -top-5 sm:-top-8" />
                                
                                {/* Hover Edit Icon */}
                                <div className="absolute top-2 right-2 bg-slate-100 text-slate-900 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Edit2 size={12} />
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="hidden sm:flex flex-col items-end justify-center min-w-[72px] gap-2">
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

            {/* 4. ACTIVE QUESTION OVERLAY */}
            {activeQ && (
                <div className={`fixed inset-x-0 bottom-0 ${questionOverlayTopClass} z-[500] flex items-center justify-center bg-slate-900/50 backdrop-blur-md p-3 sm:p-4 animate-fade-in overflow-hidden`}>
                    <div className="w-full max-w-[420px] h-full max-h-full sm:max-w-[560px] sm:h-full sm:max-h-[90vh] md:max-w-6xl md:h-auto md:max-h-full md:aspect-[16/9] [perspective:1000px]">
                        <div 
                            className={`relative w-full h-full transition-all duration-700 [transform-style:preserve-3d] 
                            ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
                        >
                            {/* FRONT (QUESTION) */}
                            <div className={`absolute inset-0 [backface-visibility:hidden] [transform:translateZ(0)] rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full
                                ${isBonus ? 'relative bg-gradient-to-br from-purple-700 via-purple-600 to-indigo-700 border-4 border-yellow-300/80 bonus-glow bonus-pulse' : 'bg-white'} ${isFlipped ? 'pointer-events-none' : ''}`}>
                                
                                {isBonus ? (
                                    <div
                                        className="relative p-4 sm:p-8 md:p-12 text-center flex flex-col items-center justify-center h-full cursor-pointer"
                                        onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }}
                                        title="Reveal bonus"
                                    >
                                        <div className="absolute inset-0 bonus-sparkle bonus-shine opacity-60 pointer-events-none"></div>
                                        <div className="bonus-shimmer text-transparent bg-clip-text bg-gradient-to-r from-yellow-100 via-amber-300 to-yellow-200 font-display font-black text-5xl sm:text-7xl md:text-9xl tracking-[0.15em] drop-shadow-[0_8px_20px_rgba(250,204,21,0.6)]">
                                            BONUS
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* HEADER BAR (Blue) */}
                                        <div className="bg-brand-blue text-white p-3 md:p-4 flex justify-between items-center h-[clamp(72px,12vh,96px)] sm:h-20 md:h-24 flex-shrink-0 relative z-10">
                                            <div className="font-bold text-sm sm:text-xl opacity-80">Question {activeQuestionIndex! + 1}</div>
                                            <div className="font-black text-2xl sm:text-4xl">{activeQ.points || 100}</div>
                                            <div className="font-bold text-sm sm:text-xl opacity-80 text-right max-w-[35%] truncate">{teamNames[currentTeam]}</div>
                                        </div>

                                        {/* CONTENT BODY (White) */}
                                        <div className={`bg-white flex-grow w-full flex flex-col px-0 ${hasOptions ? 'pt-3 sm:pt-4 md:pt-6 pb-0' : 'py-3 sm:py-4 md:py-6'} relative overflow-hidden z-0`}>
                                            {questionImageUrl && hasOptions ? (
                                                <div className="flex flex-col flex-1 min-h-0">
                                                    <div
                                                        className={`flex flex-1 min-h-0 ${isMobileViewport ? 'flex-col' : 'flex-row'} gap-3 px-4 sm:px-6 md:px-8`}
                                                        style={isMobileViewport ? { flex: '2 1 0%' } : undefined}
                                                    >
                                                        <div className={isMobileViewport ? 'w-full h-32 sm:h-36 flex items-center justify-center flex-none' : 'flex-1 min-h-0 flex items-center justify-center'}>
                                                            <img
                                                                src={questionImageUrl}
                                                                alt={questionImageAlt}
                                                                onLoad={() => setResizeTick((prev) => prev + 1)}
                                                                onClick={isMobileViewport ? undefined : openImageZoom}
                                                                onKeyDown={isMobileViewport ? undefined : handleImageKeyDown}
                                                                role={isMobileViewport ? undefined : 'button'}
                                                                tabIndex={isMobileViewport ? -1 : 0}
                                                                title={isMobileViewport ? undefined : 'Click to zoom'}
                                                                className={`h-full w-full rounded-xl object-contain border border-slate-200/70 bg-white shadow-sm ${isMobileViewport ? '' : 'cursor-zoom-in'}`}
                                                            />
                                                        </div>
                                                        <div
                                                            ref={questionWrapRef}
                                                            className={`flex-1 min-h-0 flex items-center justify-center ${isMobileViewport ? 'text-center' : 'text-left'}`}
                                                        >
                                                            <div
                                                                ref={questionTextRef}
                                                                style={questionFontSize ? { fontSize: `${questionFontSize}px`, lineHeight: '1.15' } : undefined}
                                                                className={`font-display font-bold text-slate-800 leading-tight w-full whitespace-pre-wrap break-normal hyphens-none ${isMobileViewport ? 'text-center' : 'text-left'} ${getQuestionFontSizeClass(activeQ.question)}`}
                                                            >
                                                                {activeQ.question}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {hasOptions && !isFlipped && (
                                                        <div
                                                            className="w-full flex-1 min-h-0 mt-2 sm:mt-4 relative z-10 overflow-hidden"
                                                            style={isMobileViewport ? { flex: '1 1 0%' } : undefined}
                                                        >
                                                            <div ref={optionGridRef} className="grid grid-cols-2 md:grid-cols-2 gap-0 w-full h-full auto-rows-fr">
                                                                {(() => {
                                                                    const longestText = activeQ.options!.reduce(
                                                                        (a, b) => (stripOptionPrefix(a).length > stripOptionPrefix(b).length ? a : b),
                                                                        ''
                                                                    );
                                                                    const uniformSize = optionFontSize ? '' : getOptionFontSizeClass(stripOptionPrefix(longestText));
                                                                    return activeQ.options!.map((opt, i) => {
                                                                        const optionLabel = String.fromCharCode(65 + i);
                                                                        const displayOpt = stripOptionPrefix(opt);
                                                                        return (
                                                                            <button
                                                                                key={i}
                                                                                onClick={(e) => { e.stopPropagation(); handleMcSelect(opt); }}
                                                                                style={optionFontSize ? { fontSize: `${optionFontSize}px`, lineHeight: '1.2' } : undefined}
                                                                                className={`relative p-4 sm:p-6 bg-slate-50 border border-slate-200 rounded-none font-bold text-slate-800 sm:hover:bg-brand-yellow sm:hover:border-yellow-400 sm:hover:text-slate-900 transition-all text-center flex items-center justify-center w-full h-full ${uniformSize} cursor-pointer z-50 whitespace-normal break-normal hyphens-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0`}
                                                                            >
                                                                                <span
                                                                                    aria-hidden="true"
                                                                                    data-option-label="true"
                                                                                    className="hidden sm:inline-flex absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 items-center justify-center w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-amber-200 via-amber-300 to-amber-500 text-slate-900 text-base sm:text-lg md:text-xl font-black border-2 border-amber-100/80 shadow-[0_8px_16px_rgba(245,158,11,0.35)] ring-2 ring-amber-200/60"
                                                                                >
                                                                                    {optionLabel}
                                                                                </span>
                                                                                <span
                                                                                    data-option-text="true"
                                                                                    className="w-full text-center sm:pl-12 md:pl-16"
                                                                                >
                                                                                    {displayOpt}
                                                                                </span>
                                                                            </button>
                                                                        );
                                                                    });
                                                                })()}
                                                            </div>
                                                            <div
                                                                ref={optionMeasureRef}
                                                                aria-hidden="true"
                                                                className="absolute -left-[9999px] -top-[9999px] invisible"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            ) : questionImageUrl ? (
                                                <div className="flex flex-col flex-1 min-h-0 items-center justify-center gap-4 px-4 sm:px-6 md:px-8 text-center">
                                                    <img
                                                        src={questionImageUrl}
                                                        alt={questionImageAlt}
                                                        onLoad={() => setResizeTick((prev) => prev + 1)}
                                                        onClick={isMobileViewport ? undefined : openImageZoom}
                                                        onKeyDown={isMobileViewport ? undefined : handleImageKeyDown}
                                                        role={isMobileViewport ? undefined : 'button'}
                                                        tabIndex={isMobileViewport ? -1 : 0}
                                                        title={isMobileViewport ? undefined : 'Click to zoom'}
                                                        className={`h-44 sm:h-52 md:h-60 w-full rounded-xl object-contain border border-slate-200/70 bg-white shadow-sm ${isMobileViewport ? '' : 'cursor-zoom-in'}`}
                                                    />
                                                    <div
                                                        ref={questionWrapRef}
                                                        className="w-full flex-1 min-h-0 flex items-center justify-center"
                                                    >
                                                        <div
                                                            ref={questionTextRef}
                                                            style={questionFontSize ? { fontSize: `${questionFontSize}px`, lineHeight: '1.15' } : undefined}
                                                            className={`font-display font-bold text-slate-800 leading-tight text-center w-full whitespace-pre-wrap break-normal hyphens-none ${getQuestionFontSizeClass(activeQ.question)}`}
                                                        >
                                                            {activeQ.question}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col flex-1 min-h-0">
                                                    <div
                                                        ref={questionWrapRef}
                                                        className={`w-full flex-1 min-h-0 flex flex-col items-center overflow-hidden px-4 sm:px-6 md:px-8 ${hasOptions ? 'justify-start mb-1 sm:mb-3' : 'justify-center'}`}
                                                    >
                                                        <div
                                                            ref={questionTextRef}
                                                            style={questionFontSize ? { fontSize: `${questionFontSize}px`, lineHeight: '1.15' } : undefined}
                                                            className={`font-display font-bold text-slate-800 leading-tight text-center w-full whitespace-pre-wrap break-normal hyphens-none ${getQuestionFontSizeClass(activeQ.question)}`}
                                                        >
                                                            {activeQ.question}
                                                        </div>
                                                    </div>

                                                    {hasOptions && !isFlipped && (
                                                        <div className="w-full flex-1 min-h-0 mt-2 sm:mt-4 relative z-10 overflow-hidden">
                                                            <div ref={optionGridRef} className="grid grid-cols-2 md:grid-cols-2 gap-0 w-full h-full auto-rows-fr">
                                                                {(() => {
                                                                    const longestText = activeQ.options!.reduce(
                                                                        (a, b) => (stripOptionPrefix(a).length > stripOptionPrefix(b).length ? a : b),
                                                                        ''
                                                                    );
                                                                    const uniformSize = optionFontSize ? '' : getOptionFontSizeClass(stripOptionPrefix(longestText));
                                                                    return activeQ.options!.map((opt, i) => {
                                                                        const optionLabel = String.fromCharCode(65 + i);
                                                                        const displayOpt = stripOptionPrefix(opt);
                                                                        return (
                                                                            <button
                                                                                key={i}
                                                                                onClick={(e) => { e.stopPropagation(); handleMcSelect(opt); }}
                                                                                style={optionFontSize ? { fontSize: `${optionFontSize}px`, lineHeight: '1.2' } : undefined}
                                                                                className={`relative p-4 sm:p-6 bg-slate-50 border border-slate-200 rounded-none font-bold text-slate-800 sm:hover:bg-brand-yellow sm:hover:border-yellow-400 sm:hover:text-slate-900 transition-all text-center flex items-center justify-center w-full h-full ${uniformSize} cursor-pointer z-50 whitespace-normal break-normal hyphens-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0`}
                                                                            >
                                                                                <span
                                                                                    aria-hidden="true"
                                                                                    data-option-label="true"
                                                                                    className="hidden sm:inline-flex absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 items-center justify-center w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-amber-200 via-amber-300 to-amber-500 text-slate-900 text-base sm:text-lg md:text-xl font-black border-2 border-amber-100/80 shadow-[0_8px_16px_rgba(245,158,11,0.35)] ring-2 ring-amber-200/60"
                                                                                >
                                                                                    {optionLabel}
                                                                                </span>
                                                                                <span
                                                                                    data-option-text="true"
                                                                                    className="w-full text-center sm:pl-12 md:pl-16"
                                                                                >
                                                                                    {displayOpt}
                                                                                </span>
                                                                            </button>
                                                                        );
                                                                    });
                                                                })()}
                                                            </div>
                                                            <div
                                                                ref={optionMeasureRef}
                                                                aria-hidden="true"
                                                                className="absolute -left-[9999px] -top-[9999px] invisible"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* FOOTER BAR */}
                                        <div className={`flex flex-col relative flex-shrink-0 z-50 bg-white ${hasOptions ? 'h-[clamp(38px,6.5vh,46px)] sm:h-[clamp(32px,5.5vh,40px)] px-0 py-0' : 'h-[clamp(76px,12vh,104px)] sm:h-[clamp(88px,14vh,120px)] px-3 sm:px-4 md:px-8 py-1 sm:py-2 md:py-0'}`}>
                                            
                                            {options.timerSeconds > 0 && (
                                                <div className={`relative ${hasOptions ? 'h-full' : 'h-[clamp(38px,6.5vh,46px)] sm:h-[clamp(32px,5.5vh,40px)] -mx-3 sm:-mx-4 md:-mx-8'} bg-white overflow-hidden flex items-center justify-start pointer-events-none`}>
                                                    {!isTimesUp && (
                                                        <div 
                                                            className="absolute inset-y-0 left-0 bg-brand-blue transition-all duration-1000"
                                                            style={{ width: `${timerProgress * 100}%` }}
                                                        />
                                                    )}
                                                    <div className="absolute inset-0 flex items-center justify-center text-sm sm:text-lg md:text-xl font-black text-slate-900 tracking-wider">
                                                        {isTimesUp ? "TIME'S UP!" : (
                                                            <><Clock size={18} className="mr-2" /> {timeLeft}s</>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {!hasOptions && (
                                                <div className="w-full flex-1 flex items-center justify-center py-2 sm:py-3">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }}
                                                        className="bg-brand-blue text-white px-6 sm:px-12 py-2 rounded-full font-bold text-base sm:text-xl shadow-lg hover:bg-brand-blue/90 hover:scale-105 transition-transform relative z-50 flex items-center cursor-pointer"
                                                    >
                                                        Check
                                                    </button>
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
                                    <div className="flex-grow flex flex-col items-center justify-center p-4 sm:p-8 md:p-12 text-center overflow-hidden">
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
                                            className={`mt-6 px-6 sm:px-10 py-3 sm:py-4 ${isNegativeBonus ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'} text-white rounded-xl font-bold text-base sm:text-xl transition-colors shadow-lg cursor-pointer relative z-50`}
                                        >
                                            Apply Effect
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {/* HEADER (Gray) */}
                                        <div className="bg-slate-200 text-slate-600 p-3 md:p-4 flex justify-between items-center h-[clamp(72px,12vh,96px)] sm:h-20 md:h-24 flex-shrink-0 relative z-10">
                                            <div className="font-bold text-base sm:text-xl opacity-80">Answer</div>
                                            
                                            {/* ALWAYS SHOW FLIP BACK BUTTON */}
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}
                                                className="p-2 bg-white rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer relative z-50"
                                                title="Flip back to question"
                                            >
                                                <RotateCcw size={18} className="sm:w-5 sm:h-5" />
                                            </button>
                                        </div>

                                        {/* CONTENT (White) */}
                                        <div className="flex-grow flex flex-col items-center justify-center p-4 sm:p-6 md:p-12 bg-white text-center overflow-hidden w-full relative z-0">
                                            <div ref={answerWrapRef} className="flex-1 overflow-hidden flex flex-col items-center justify-center w-full min-h-0">
                                                {/* Multiple Choice Result UI */}
                                                {hasOptions && mcResult ? (
                                                    <div className="animate-bounce mb-4 sm:mb-8">
                                                        {mcResult === 'correct' ? (
                                                            <div className="flex flex-col items-center">
                                                                <CheckCircle size={56} className="text-green-500 mb-3 sm:w-20 sm:h-20 sm:mb-4" />
                                                                <h2 className="text-3xl sm:text-6xl font-black text-green-500 uppercase tracking-widest">Correct!</h2>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center">
                                                                <XCircle size={56} className="text-red-500 mb-3 sm:w-20 sm:h-20 sm:mb-4" />
                                                                <h2 className="text-3xl sm:text-6xl font-black text-red-500 uppercase tracking-widest">Incorrect</h2>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : null}

                                                <div
                                                    ref={answerTextRef}
                                                    style={answerFontSize ? { fontSize: `${answerFontSize}px`, lineHeight: '1.15' } : undefined}
                                                    className={`font-display font-bold text-slate-800 leading-tight whitespace-pre-wrap break-words ${getAnswerFontSizeClass(activeQ.answer)}`}
                                                >
                                                    {activeQ.answer}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* FOOTER (Buttons) */}
                                        <div className="h-[clamp(88px,14vh,120px)] flex flex-shrink-0 relative z-50">
                                            {hasOptions ? (
                                                // Multiple Choice Footer
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleAnswer(mcResult === 'correct'); }}
                                                    className={`flex-1 text-white font-black text-2xl sm:text-4xl transition-colors flex items-center justify-center border-t-4 active:border-t-0 cursor-pointer relative z-50
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
                                                        className="flex-1 bg-red-500 text-white font-bold text-lg sm:text-2xl hover:bg-red-600 transition-colors flex items-center justify-center border-t-4 border-red-700 active:border-t-0 cursor-pointer relative z-50"
                                                    >
                                                        <X size={24} className="mr-2 sm:w-8 sm:h-8 sm:mr-3" /> Oops
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleAnswer(true); }}
                                                        className="flex-1 bg-green-500 text-white font-bold text-lg sm:text-2xl hover:bg-green-600 transition-colors flex items-center justify-center border-t-4 border-green-700 active:border-t-0 cursor-pointer relative z-50"
                                                    >
                                                        <Check size={24} className="mr-2 sm:w-8 sm:h-8 sm:mr-3" /> OK
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

            {/* IMAGE ZOOM */}
            {isImageZoomOpen && questionImageUrl && (
                <div
                    className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
                    onClick={() => setIsImageZoomOpen(false)}
                >
                    <div
                        className="relative w-full max-w-[90vw] max-h-[90vh] flex items-center justify-center overflow-visible"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setIsImageZoomOpen(false)}
                            className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-9 h-9 flex items-center justify-center hover:bg-black/80 transition-colors"
                            aria-label="Close image"
                        >
                            X
                        </button>
                        <img
                            src={questionImageUrl}
                            alt={questionImageAlt}
                            onClick={() => setIsImageZoomOpen(false)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
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
                                maxHeight: 'calc((100vh - 4rem - env(safe-area-inset-top)) * 0.25)',
                            }}
                            className="rounded-2xl object-contain border border-white/10 shadow-2xl cursor-zoom-out"
                        />
                    </div>
                </div>
            )}

            {/* 5. QUIT CONFIRM */}
            {showQuitConfirm && (
                <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
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

            {showEndGameConfirm && (
                <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white text-slate-900 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl border border-slate-100">
                        <h2 className="text-2xl font-bold mb-2">End game now?</h2>
                        <p className="text-slate-500 mb-6">The game will stop and move to the winners screen.</p>
                        <div className="flex space-x-4">
                            <button
                                onClick={() => setShowEndGameConfirm(false)}
                                className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setShowEndGameConfirm(false);
                                    setIsGameOver(true);
                                }}
                                className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 transition-colors"
                            >
                                End game
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

