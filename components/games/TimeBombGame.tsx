
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { GeneratedGame, GameRunOptions, GeneratedQuestion, PracticeReviewItem } from '../../types';
import { playSound } from '../../utils/gameUtils';
import { resolveGameImageUrl } from '../../utils/gameImage';
import { WinnerCeremonyHero } from './shared/WinnerCeremonyHero';
import { PracticeReviewSummary } from './shared/PracticeReviewSummary';
import { ArrowLeft, Volume2, VolumeX, Maximize2, Minimize2, AlertTriangle, Heart, Zap, CheckCircle, XCircle, RotateCcw, Clock, Play, SkipForward, Pause, Skull, Flag } from 'lucide-react';

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
    const [usedQuestionIds, setUsedQuestionIds] = useState<number[]>(() => {
        const firstId = game.questions?.[0]?.id;
        return typeof firstId === 'number' ? [firstId] : [];
    });

    // Card State
    const [isFlipped, setIsFlipped] = useState(false);
    const [disabledOptions, setDisabledOptions] = useState<number[]>([]); // For MC

    // Audio & UI
    const [isMuted, setIsMuted] = useState(options.muted);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<any>(null);
    const [showQuitConfirm, setShowQuitConfirm] = useState(false);
    const [showEndGameConfirm, setShowEndGameConfirm] = useState(false);
    const [showExplosionModal, setShowExplosionModal] = useState(false);
    const [isImageZoomOpen, setIsImageZoomOpen] = useState(false);
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const questionWrapRef = useRef<HTMLDivElement>(null);
    const questionTextRef = useRef<HTMLHeadingElement>(null);
    const [questionFontSize, setQuestionFontSize] = useState<number | null>(null);
    const answerWrapRef = useRef<HTMLDivElement>(null);
    const answerTextRef = useRef<HTMLHeadingElement>(null);
    const [answerFontSize, setAnswerFontSize] = useState<number | null>(null);
    const optionGridRef = useRef<HTMLDivElement>(null);
    const optionMeasureRef = useRef<HTMLDivElement>(null);
    const [optionFontSize, setOptionFontSize] = useState<number | null>(null);
    const [resizeTick, setResizeTick] = useState(0);
    const [explosionKey, setExplosionKey] = useState(0);
    const explosionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [mcFeedback, setMcFeedback] = useState<{ index: number; status: 'correct' | 'wrong' } | null>(null);
    const [missedItems, setMissedItems] = useState<PracticeReviewItem[]>([]);
    const [correctCount, setCorrectCount] = useState(0);
    const [isResolvingMc, setIsResolvingMc] = useState(false);
    const mcFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fuse Ref for Spark Calculation
    const fusePathRef = useRef<SVGPathElement>(null);
    const cardFrameRef = useRef<HTMLDivElement>(null);
    const [fuseBox, setFuseBox] = useState({ width: 0, height: 0 });
    const [fuseLength, setFuseLength] = useState(0);
    const [sparkPos, setSparkPos] = useState({ x: 8, y: 24 });
    const [explosionOrigin, setExplosionOrigin] = useState({ x: 0, y: 0 });
    const arenaRef = useRef<HTMLDivElement>(null);
    const dynamiteRef = useRef<HTMLDivElement>(null);

    // Initial Question Setup
    const currentQuestion = questions[currentQuestionIndex];
    const hasOptions = currentQuestion?.options && currentQuestion.options.length > 0;
    const optionKey = currentQuestion?.options?.join('|') || '';
    const questionImageUrl = resolveGameImageUrl(currentQuestion?.image?.url, currentQuestion?.image?.thumbUrl);
    const questionImageAlt = currentQuestion?.image?.alt || '';

    const buildFusePath = (width: number, height: number) => {
        const padX = 6;
        const padY = 6;
        if (width <= padX * 2 || height <= padY * 2) return '';
        const radius = Math.min(24, (width - padX * 2) / 2, (height - padY * 2) / 2);
        const left = padX;
        const top = padY;
        const right = width - padX;
        const bottom = height - padY;
        const midX = (left + right) / 2;

        return `M ${midX} ${top} H ${left + radius} Q ${left} ${top} ${left} ${top + radius} ` +
            `V ${bottom - radius} Q ${left} ${bottom} ${left + radius} ${bottom} H ${right - radius} ` +
            `Q ${right} ${bottom} ${right} ${bottom - radius} V ${top + radius} Q ${right} ${top} ${right - radius} ${top} ` +
            `H ${midX}`;
    };

    const fuseProgress = Math.max(0, Math.min(1, 1 - (bombTime / (options.bombDuration || 60))));
    const fuseWidth = fuseBox.width || 1000;
    const fuseHeight = fuseBox.height || 700;
    const fusePath = buildFusePath(fuseWidth, fuseHeight);
    const fuseViewBox = `0 0 ${fuseWidth} ${fuseHeight}`;

    // Scroll Lock
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

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

    // --- GAMEPLAY LOGIC ---

    const captureExplosionOrigin = () => {
        const arena = arenaRef.current;
        if (!arena) return;
        const arenaRect = arena.getBoundingClientRect();
        let x = arenaRect.width / 2;
        let y = arenaRect.height / 3;
        const dynamite = dynamiteRef.current;
        if (dynamite) {
            const dynRect = dynamite.getBoundingClientRect();
            x = dynRect.left + dynRect.width / 2 - arenaRect.left;
            y = dynRect.top + dynRect.height / 2 - arenaRect.top;
        }
        setExplosionOrigin({ x, y });
    };

    const handleExplosion = () => {
        captureExplosionOrigin();
        setIsTicking(false);
        setIsExploded(true);
        setGameState('exploded');
        setExplosionKey(prev => prev + 1);
        setShowExplosionModal(false);
        playSound('incorrect', isMuted, 'Explosion'); 

        if (options.studentPractice) {
            if (currentQuestion) {
                setMissedItems((prev) => [
                    ...prev,
                    {
                        id: `timeout-${currentQuestion.id}-${prev.length}`,
                        question: currentQuestion.question,
                        correctAnswer: currentQuestion.answer,
                        context: "Time ran out",
                    },
                ]);
            }

            if (explosionTimerRef.current) {
                clearTimeout(explosionTimerRef.current);
            }
            explosionTimerRef.current = setTimeout(() => {
                setShowExplosionModal(true);
            }, 1400);
            return;
        }

        // Deduct Life immediately
        setTeamLives(prev => {
            const newLives = [...prev];
            newLives[activeTeamIndex] -= 1;
            return newLives;
        });

        // Show Modal after blast animation
        if (explosionTimerRef.current) {
            clearTimeout(explosionTimerRef.current);
        }
        explosionTimerRef.current = setTimeout(() => {
            setShowExplosionModal(true);
        }, 1400);
    };

    const handleContinueAfterExplosion = () => {
        setShowExplosionModal(false);
        if (options.studentPractice) {
            setBombTime(options.bombDuration || 60);
            setIsExploded(false);
            setGameState('play');
            setIsTicking(true);
            nextQuestion();
            return;
        }
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

    useEffect(() => {
        return () => {
            if (explosionTimerRef.current) {
                clearTimeout(explosionTimerRef.current);
            }
        };
    }, []);
    useEffect(() => {
        return () => {
            if (mcFeedbackTimerRef.current) {
                clearTimeout(mcFeedbackTimerRef.current);
            }
        };
    }, []);

    useLayoutEffect(() => {
        const el = cardFrameRef.current;
        if (!el) return;
        const update = () => {
            const rect = el.getBoundingClientRect();
            const width = Math.round(rect.width);
            const height = Math.round(rect.height);
            setFuseBox(prev => (
                prev.width === width && prev.height === height
                    ? prev
                    : { width, height }
            ));
        };
        update();
        const observer = new ResizeObserver(update);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    useLayoutEffect(() => {
        if (!fusePathRef.current) return;
        const length = fusePathRef.current.getTotalLength();
        if (length && length !== fuseLength) {
            setFuseLength(length);
        }
    }, [fusePath, fuseBox.width, fuseBox.height, fuseLength]);

    useLayoutEffect(() => {
        if (!isExploded) return;
        captureExplosionOrigin();
    }, [isExploded, explosionKey, resizeTick]);

    // Spark Position Logic (Follows Fuse)
    useEffect(() => {
        if (fusePathRef.current && bombTime > 0) {
            const max = options.bombDuration || 60;
            const length = fusePathRef.current.getTotalLength();
            const ratio = Math.max(0, Math.min(1, bombTime / max));
            const burnProgress = 1 - ratio;
            const point = fusePathRef.current.getPointAtLength(length * burnProgress);

            setSparkPos({ x: point.x, y: point.y });
        }
    }, [bombTime, options.bombDuration, fuseBox.width, fuseBox.height]);

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
        setMcFeedback(null);
        setIsResolvingMc(false);
        if (mcFeedbackTimerRef.current) {
            clearTimeout(mcFeedbackTimerRef.current);
        }
        
        const available = questions.filter(q => !usedQuestionIds.includes(q.id));
        
        if (available.length === 0) {
            if (options.studentPractice) {
                setGameState('gameover');
                playSound('win', isMuted);
                return;
            }
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
        setCorrectCount((prev) => prev + 1);
        playSound('correct', isMuted, 'Magic');
        passBombToNextSurvivor();
        setBombTime(t => Math.min(t + 5, options.bombDuration || 60)); 
        nextQuestion();
    };

    const handleIncorrect = () => {
        if (currentQuestion) {
            setMissedItems((prev) => [
                ...prev,
                {
                    id: String(currentQuestion.id),
                    question: currentQuestion.question,
                    correctAnswer: currentQuestion.answer,
                },
            ]);
        }
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
        if (disabledOptions.includes(index) || isPaused || isExploded || isResolvingMc) return;

        // Clean strings for comparison
        const cleanOpt = stripOptionPrefix(option).toLowerCase();
        const cleanAns = stripOptionPrefix(currentQuestion.answer).toLowerCase();

        if (cleanOpt === cleanAns) {
            setIsResolvingMc(true);
            setMcFeedback({ index, status: 'correct' });
            if (mcFeedbackTimerRef.current) {
                clearTimeout(mcFeedbackTimerRef.current);
            }
            mcFeedbackTimerRef.current = setTimeout(() => {
                handleCorrect();
                setMcFeedback(null);
                setIsResolvingMc(false);
            }, 350);
        } else {
            // Wrong MC answer
            setMissedItems((prev) => [
                ...prev,
                {
                    id: `${currentQuestion.id}-${index}`,
                    question: currentQuestion.question,
                    correctAnswer: currentQuestion.answer,
                    studentAnswer: option,
                },
            ]);
            playSound('incorrect', isMuted, 'Buzz');
            setBombTime(t => Math.max(0.1, t - 10)); // Penalty
            setDisabledOptions(prev => [...prev, index]); // Disable this option
            setMcFeedback({ index, status: 'wrong' });
            if (mcFeedbackTimerRef.current) {
                clearTimeout(mcFeedbackTimerRef.current);
            }
            mcFeedbackTimerRef.current = setTimeout(() => {
                setMcFeedback(null);
            }, 300);
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

    const formatBombTime = (time: number) => {
        const safe = Math.max(0, time);
        const display = safe.toFixed(1);
        return display.length < 4 ? display.padStart(4, '0') : display;
    };


    // Responsive Font Size Logic
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

    // Helper for option font size - maximized legibility
    const getOptionFontSizeClass = (text: string) => {
        const len = text ? text.length : 0;
        if (len < 20) return 'text-2xl md:text-3xl';
        if (len < 35) return 'text-xl md:text-2xl';
        if (len < 60) return 'text-lg md:text-xl';
        return 'text-base md:text-lg';
    };

    const stripOptionPrefix = (value: string) => value.replace(/^[A-D]\)\s*/i, '').trim();

    useLayoutEffect(() => {
        if (!currentQuestion || isFlipped || gameState !== 'play') {
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
    }, [isMobileViewport, hasOptions, currentQuestion?.question, currentQuestion?.options?.length, isFlipped, gameState, resizeTick]);

    useLayoutEffect(() => {
        if (!isMobileViewport || !currentQuestion || !isFlipped || gameState !== 'play') {
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
    }, [isMobileViewport, currentQuestion?.answer, isFlipped, gameState, resizeTick]);

    useLayoutEffect(() => {
        if (!hasOptions || !currentQuestion?.options || gameState !== 'play') {
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
            return currentQuestion.options!.every((opt) => {
                measureEl.textContent = stripOptionPrefix(opt);
                return measureEl.scrollHeight <= innerHeight && measureEl.scrollWidth <= innerWidth + 1;
            });
        };

        while (size > minSize && !fitsAll(size)) {
            size -= 1;
        }
        setOptionFontSize(size);
    }, [hasOptions, optionKey, gameState, isMobileViewport, resizeTick]);

    if (gameState === 'gameover') {
        if (options.studentPractice) {
            return (
                <PracticeReviewSummary
                    playerName={teamNames[0]}
                    correctCount={correctCount}
                    totalCount={correctCount + missedItems.length}
                    missedItems={missedItems}
                    onReplay={onReplay}
                    onExit={onFinish}
                />
            );
        }

        const ranking = teamLives
            .map((lives, index) => ({
                index,
                score: lives,
                name: teamNames[index] || `Team ${index + 1}`,
            }))
            .sort((a, b) => b.score - a.score);
        const winnerScore = ranking.length ? ranking[0].score : 0;
        const winners = ranking.filter((team) => team.score === winnerScore && team.score > 0);
        const winnerHeadline = winners.length === 0
            ? 'NO SURVIVOR'
            : winners.length > 1
                ? `WINNERS: ${winners.map((team) => team.name).join(' & ')}`
                : `WINNER: ${winners[0].name}`;

        return (
            <div
                className={`${isFullscreen ? 'fixed inset-0' : 'fixed inset-x-0 bottom-0 top-[calc(4rem+env(safe-area-inset-top))]'} z-[300] bg-gradient-to-br from-teal-900 via-cyan-900 to-slate-950 text-white overflow-hidden`}
            >
                <WinnerCeremonyHero
                    winnerHeadline={winnerHeadline}
                    subtitle="Final survival standings"
                    ranking={ranking}
                    isMobileViewport={isMobileViewport}
                    onPlayAgain={onReplay}
                    onExit={onFinish}
                >
                    <div className="w-full max-w-4xl bg-white/10 border border-white/20 rounded-2xl p-4 md:p-6">
                        <div className="space-y-3">
                            {ranking.map((team, idx) => (
                                <div key={team.index} className="bg-white/10 rounded-xl px-4 py-3 flex items-center justify-between">
                                    <div className="font-bold">#{idx + 1} {team.name}</div>
                                    <div className="font-mono font-black text-xl">
                                        {team.score} {team.score === 1 ? 'life' : 'lives'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </WinnerCeremonyHero>
            </div>
        );
    }

    const mobileUsesTwoRowHeader = isMobileViewport && teamNames.length >= 4;
    const mobileHeaderColumns = teamNames.length >= 5 ? 3 : teamNames.length === 4 ? 2 : Math.max(teamNames.length, 1);
    const mobileControlCount = gameState === 'play' ? 4 : 3;
    const mobileUsesButtonGrid = mobileUsesTwoRowHeader && mobileControlCount >= 4;

    return (
        <div ref={containerRef} className={`bg-slate-950 flex flex-col ${isFullscreen ? 'h-[calc(var(--app-vh,1vh)*100)]' : 'h-[calc(var(--app-vh,1vh)*100-4rem)]'} overflow-hidden relative text-white font-sans`}>
            <style>{`
                @keyframes timeBombBlast {
                    0% { transform: translate(-50%, -50%) scale(0.05); opacity: 0.9; }
                    45% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(12); opacity: 0; }
                }
                @keyframes timeBombFire {
                    0% { opacity: 1; transform: scale(0.85); }
                    60% { opacity: 0.9; transform: scale(1.1); }
                    100% { opacity: 0; transform: scale(1.3); }
                }
                @keyframes timeBombSmoke {
                    0% { opacity: 0.15; transform: scale(0.8); }
                    40% { opacity: 0.35; }
                    100% { opacity: 0; transform: scale(1.6); }
                }
                @keyframes timeBombShockwave {
                    0% { opacity: 0.6; transform: scale(0.6); }
                    100% { opacity: 0; transform: scale(1.9); }
                }
                @keyframes mcFlashGreen {
                    0% { transform: scale(1); filter: brightness(1.15); }
                    50% { transform: scale(1.02); filter: brightness(1.3); }
                    100% { transform: scale(1); filter: brightness(1); }
                }
                @keyframes mcFlashRed {
                    0% { transform: scale(1); filter: brightness(1.1); }
                    50% { transform: scale(0.99); filter: brightness(1.25); }
                    100% { transform: scale(1); filter: brightness(1); }
                }
            `}</style>
            
            {/* 1. HEADER */}
            <div className={`bg-slate-900/90 backdrop-blur-md px-2 py-2 sm:p-4 shrink-0 z-50 border-b border-slate-800 flex justify-between gap-3 sm:gap-4 ${mobileUsesTwoRowHeader ? 'h-[148px]' : 'min-h-[70px]'} sm:min-h-[140px] shadow-2xl relative overflow-visible ${mobileUsesTwoRowHeader ? 'items-start' : 'items-center'}`}>
                <div className={`min-w-fit shrink-0 sm:hidden gap-1.5 ${mobileUsesButtonGrid ? 'grid grid-cols-2' : mobileUsesTwoRowHeader ? 'flex flex-col items-start' : 'flex flex-row items-center'}`}>
                    <button onClick={() => setShowQuitConfirm(true)} className="w-9 h-9 text-slate-400 hover:text-red-500 bg-slate-800 rounded-lg transition-colors flex items-center justify-center text-sm font-bold border border-slate-700 hover:border-red-500/50">
                        <ArrowLeft size={17} />
                    </button>
                    <button
                        onClick={() => setShowEndGameConfirm(true)}
                        className="w-9 h-9 text-white bg-rose-700 hover:bg-rose-600 rounded-lg transition-colors flex items-center justify-center text-sm font-bold border border-rose-800"
                        title="End game now"
                    >
                        <Flag size={14} />
                    </button>
                    {gameState === 'play' && (
                        <button 
                            onClick={() => setIsPaused(!isPaused)} 
                            className={`w-9 h-9 text-slate-400 hover:text-white rounded-lg transition-colors border flex items-center justify-center ${isPaused ? 'bg-yellow-500 text-slate-900 border-yellow-600' : 'bg-slate-800 hover:bg-slate-700 border-slate-700'}`}
                            title={isPaused ? "Resume" : "Pause"}
                        >
                            {isPaused ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
                        </button>
                    )}
                    <button onClick={() => setIsMuted(!isMuted)} className="w-9 h-9 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 flex items-center justify-center">
                        {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                    </button>
                </div>

                <div className="hidden sm:flex flex-col items-start gap-2 min-w-[140px]">
                    <button onClick={() => setShowQuitConfirm(true)} className="w-[140px] justify-center text-slate-400 hover:text-red-500 bg-slate-800 px-3 py-2 rounded-lg transition-colors flex items-center text-sm font-bold border border-slate-700 hover:border-red-500/50">
                        <ArrowLeft size={16} className="mr-2" /> Quit
                    </button>
                    <button
                        onClick={() => setShowEndGameConfirm(true)}
                        className="w-[140px] justify-center text-white bg-rose-700 hover:bg-rose-600 px-3 py-2 rounded-lg transition-colors flex items-center text-sm font-bold border border-rose-800"
                        title="End game now"
                    >
                        <Flag size={16} className="mr-2" /> End Game
                    </button>
                </div>

                {/* Team Status Bar */}
                <div
                    className={isMobileViewport
                        ? 'flex-1 grid gap-1.5 items-stretch px-1'
                        : 'flex-1 sm:flex sm:justify-center sm:gap-4 sm:overflow-x-auto sm:no-scrollbar sm:px-3 sm:py-2 sm:items-center'}
                    style={isMobileViewport ? { gridTemplateColumns: `repeat(${mobileHeaderColumns}, minmax(0, 1fr))` } : undefined}
                >
                    {teamNames.map((name, idx) => {
                        const isAlive = options.studentPractice || teamLives[idx] > 0;
                        const isActive = idx === activeTeamIndex;
                        return (
                            <div 
                                key={idx} 
                                className={`
                                    relative w-full min-w-0 px-1.5 py-1 sm:px-4 sm:py-2 rounded-xl border-2 transition-all ${mobileUsesTwoRowHeader ? 'h-[46px]' : 'min-h-[52px]'} sm:min-h-[5rem] sm:w-auto sm:min-w-[130px] flex flex-col items-center justify-center text-center
                                    ${!isAlive ? 'border-slate-800 bg-slate-900/50 opacity-40 grayscale' : 
                                      isActive ? 'border-yellow-500 bg-yellow-500/10 shadow-[0_0_25px_rgba(234,179,8,0.4)] sm:scale-110 z-10 ring-2 ring-yellow-500/50' : 
                                      'border-slate-700 bg-slate-800/80 text-slate-400'}
                                `}
                            >
                                <div className="text-[10px] sm:text-sm font-black uppercase tracking-wider leading-tight mb-0.5 sm:mb-2 text-center truncate w-full">
                                    {name}
                                </div>
                                {options.studentPractice ? (
                                    <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-yellow-200">
                                        Practice mode
                                    </div>
                                ) : (
                                    <div className="flex gap-1">
                                        {Array.from({length: Math.max(0, teamLives[idx])}).map((_, i) => (
                                            <Heart key={i} size={isMobileViewport ? 10 : 20} className="fill-red-500 text-red-500 drop-shadow-sm" />
                                        ))}
                                        {teamLives[idx] === 0 && <span className="text-[10px] sm:text-xs font-bold text-red-900 uppercase">Eliminated</span>}
                                    </div>
                                )}
                                
                                {/* Active Indicator (Center Left) */}
                                {isActive && isAlive && (
                                    <div className="absolute -left-2 sm:-left-3 top-1/2 -translate-y-1/2 bg-yellow-500 text-black p-1 sm:p-2 rounded-full animate-bounce shadow-lg border-2 border-black z-20">
                                        <Zap size={isMobileViewport ? 10 : 16} className="fill-black" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="hidden sm:flex flex-col items-end gap-2 min-w-[72px] justify-center">
                    {gameState === 'play' && (
                        <button 
                            onClick={() => setIsPaused(!isPaused)} 
                            className={`text-slate-400 hover:text-white p-2.5 rounded-xl transition-colors border ${isPaused ? 'bg-yellow-500 text-slate-900 border-yellow-600' : 'bg-slate-800 hover:bg-slate-700 border-slate-700'}`}
                            title={isPaused ? "Resume" : "Pause"}
                        >
                            {isPaused ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
                        </button>
                    )}
                    <button onClick={() => setIsMuted(!isMuted)} className="text-slate-400 hover:text-white p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700">{isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>
                    <button onClick={toggleFullscreen} className="text-slate-400 hover:text-white p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700">{isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}</button>
                </div>
            </div>

            {/* 2. MAIN ARENA */}
            <div ref={arenaRef} className="flex-1 relative flex flex-col md:flex-row overflow-hidden">
                
                {/* Background Effects */}
                <div className={`absolute inset-0 transition-colors duration-200 z-0 ${isExploded ? 'bg-red-900/60' : 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black'}`}>
                    {!isExploded && <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vh] bg-blue-900/10 blur-[100px] rounded-full pointer-events-none"></div>}
                </div>

                {isExploded && (
                    <div className="pointer-events-none absolute inset-0 z-[420]">
                        <div
                            key={explosionKey}
                            className="absolute rounded-full"
                            style={{
                                left: explosionOrigin.x,
                                top: explosionOrigin.y,
                                width: '18vmax',
                                height: '18vmax',
                                animation: 'timeBombBlast 1.4s ease-out forwards'
                            }}
                        >
                            <div
                                className="absolute inset-0 rounded-full"
                                style={{
                                    background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(253,224,71,0.95) 18%, rgba(249,115,22,0.8) 45%, rgba(239,68,68,0.6) 70%, rgba(239,68,68,0) 100%)'
                                }}
                            />
                            <div
                                className="absolute inset-0 rounded-full"
                                style={{
                                    background: 'radial-gradient(circle, rgba(255,214,102,0.9) 0%, rgba(249,115,22,0.65) 50%, rgba(239,68,68,0) 80%)',
                                    animation: 'timeBombFire 1.4s ease-out forwards',
                                    mixBlendMode: 'screen'
                                }}
                            />
                            <div
                                className="absolute inset-0 rounded-full"
                                style={{
                                    background: 'radial-gradient(circle, rgba(148,163,184,0.6) 0%, rgba(71,85,105,0.35) 40%, rgba(30,41,59,0) 75%)',
                                    animation: 'timeBombSmoke 1.8s ease-out forwards',
                                    filter: 'blur(6px)'
                                }}
                            />
                            <div
                                className="absolute inset-0 rounded-full"
                                style={{
                                    border: '4px solid rgba(248,250,252,0.35)',
                                    animation: 'timeBombShockwave 1.2s ease-out forwards'
                                }}
                            />
                        </div>
                    </div>
                )}

                

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
                        {/* MAIN CONTENT */}
                        <div className="flex-1 min-h-0 p-2 sm:p-4 flex flex-col items-center justify-start sm:justify-center relative z-10">
                            <div className="w-full flex flex-col items-center gap-2 sm:gap-4">
                                {(gameState === 'play' || gameState === 'exploded') && (
                                    <div className="relative flex items-center justify-center w-full">
                                        <div
                                            ref={dynamiteRef}
                                            className="relative w-[min(140px,38vw)] sm:w-[min(210px,40vw)] md:w-[min(260px,30vw)] transition-transform duration-200 origin-center"
                                            style={{ transform: `scale(${getBombScale()})` }}
                                        >
                                            <img
                                                src="/assets/game_elements/dynamite.png"
                                                alt="Dynamite"
                                                className="w-full h-auto drop-shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
                                            />
                                            <div className="absolute left-[46%] top-1/2 -translate-x-1/2 -translate-y-[45%]">
                                                <span
                                                    className="font-mono text-[clamp(22px,5.6vw,34px)] sm:text-4xl tracking-widest drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                                                    style={{ color: getTimerColor() }}
                                                >
                                                    {formatBombTime(bombTime)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!isExploded && gameState === 'play' && (
                                    <div
                                        ref={cardFrameRef}
                                        className="relative w-full max-w-[92vw] h-[min(56vh,520px)] sm:max-w-[560px] sm:h-full sm:max-h-[68vh] md:max-w-6xl md:h-auto md:max-h-[60vh] md:aspect-[16/9] [perspective:1000px] overflow-visible"
                                    >
                                        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
                                            <svg
                                                className="w-full h-full"
                                                viewBox={fuseViewBox}
                                                preserveAspectRatio="none"
                                            >
                                            <defs>
                                                <filter id="fuseGlow" x="-20%" y="-20%" width="140%" height="140%">
                                                    <feGaussianBlur stdDeviation="4" result="blur" />
                                                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                                </filter>
                                            </defs>
                                            {fusePath && (
                                                <>
                                                    <path
                                                        ref={fusePathRef}
                                                        d={fusePath}
                                                        fill="none"
                                                        stroke="none"
                                                    />
                                                    <path
                                                        d={fusePath}
                                                        fill="none"
                                                        stroke="#fbbf24"
                                                        strokeWidth="6"
                                                        strokeLinecap="round"
                                                        filter="url(#fuseGlow)"
                                                    />
                                                    <path
                                                        d={fusePath}
                                                        pathLength={1000}
                                                        fill="none"
                                                        stroke="#7c2d12"
                                                        strokeWidth="4"
                                                        strokeLinecap="round"
                                                        strokeDasharray={`${1000 * fuseProgress} 1000`}
                                                        strokeDashoffset={0}
                                                        className="transition-all duration-100 ease-linear"
                                                    />
                                                    {isTicking && !isPaused && bombTime > 0 && (
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
                                                </>
                                            )}
                                            </svg>
                                        </div>
                                        <div className={`relative w-full h-full transition-all duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                                        
                                        {/* FRONT: QUESTION & CONTROLS */}
                                        <div className={`absolute inset-0 [backface-visibility:hidden] [transform:translateZ(0)] rounded-3xl shadow-2xl overflow-hidden flex flex-col bg-slate-900 border-4 border-indigo-500 ${isFlipped ? 'pointer-events-none' : ''}`}>
                                            <div className="bg-indigo-900/50 px-3 py-[clamp(5px,1.4vh,8px)] sm:p-4 border-b border-indigo-800 flex justify-between items-center shrink-0">
                                                <span className="font-bold text-indigo-300 uppercase tracking-widest text-[clamp(9px,2vw,12px)] sm:text-sm">Question</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse border border-red-800"></span>
                                                    <span className="text-indigo-200 font-bold text-[clamp(9px,2vw,12px)] sm:text-xs uppercase">Live Timer</span>
                                                </div>
                                            </div>
                                            
                                            {/* CONTENT BODY */}
                                            <div className={`flex-1 min-h-0 flex flex-col px-0 ${hasOptions ? 'pt-3 sm:pt-4 md:pt-6 pb-0' : 'py-3 sm:py-4 md:py-6'} overflow-hidden bg-slate-800 relative`}>
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
                                                                    className={`h-full w-full rounded-xl object-contain border border-slate-700/70 bg-slate-900 shadow-sm ${isMobileViewport ? '' : 'cursor-zoom-in'}`}
                                                                />
                                                            </div>
                                                            <div
                                                                ref={questionWrapRef}
                                                                className={`flex-1 min-h-0 flex items-center justify-center ${isMobileViewport ? 'text-center' : 'text-left'}`}
                                                            >
                                                                <h3
                                                                    ref={questionTextRef}
                                                                    style={questionFontSize ? { fontSize: `${questionFontSize}px`, lineHeight: '1.15' } : undefined}
                                                                    className={`w-full font-display font-bold text-white leading-tight whitespace-pre-wrap break-normal hyphens-none ${isMobileViewport ? 'text-center' : 'text-left'} ${getQuestionFontSizeClass(currentQuestion?.question || "Loading...")}`}
                                                                >
                                                                    {currentQuestion?.question || "Loading question..."}
                                                                </h3>
                                                            </div>
                                                        </div>

                                                        <div
                                                            className="w-full flex-1 min-h-0 mt-2 sm:mt-3 md:mt-6 flex-shrink-0 relative z-10 overflow-hidden"
                                                            style={isMobileViewport ? { flex: '1 1 0%' } : undefined}
                                                        >
                                                            <div ref={optionGridRef} className="grid grid-cols-2 md:grid-cols-2 gap-0 w-full h-full auto-rows-fr">
                                                                {(() => {
                                                                    const longestText = currentQuestion.options!.reduce(
                                                                        (a, b) => (stripOptionPrefix(a).length > stripOptionPrefix(b).length ? a : b),
                                                                        ''
                                                                    );
                                                                    const uniformSize = optionFontSize ? '' : getOptionFontSizeClass(stripOptionPrefix(longestText));
                                                                    
                                                                    return currentQuestion.options!.map((opt, i) => {
                                                                        const optionLabel = String.fromCharCode(65 + i);
                                                                        const displayOpt = stripOptionPrefix(opt);
                                                                        const isDisabled = disabledOptions.includes(i);
                                                                        const isCorrect = mcFeedback?.index === i && mcFeedback.status === 'correct';
                                                                        const isWrong = mcFeedback?.index === i && mcFeedback.status === 'wrong';
                                                                        const stateClass = isCorrect
                                                                            ? 'bg-green-600 border-green-400 text-white animate-[mcFlashGreen_0.35s_ease-out_1]'
                                                                            : isWrong
                                                                                ? 'bg-red-600 border-red-500 text-white animate-[mcFlashRed_0.3s_ease-out_1]'
                                                                                : isDisabled
                                                                                    ? 'bg-slate-800/50 border-slate-700 text-slate-500 cursor-not-allowed line-through'
                                                                            : 'bg-slate-700 border-slate-600 text-slate-200 sm:hover:bg-indigo-600 sm:hover:border-indigo-400 sm:hover:text-white active:scale-95 shadow-sm';
                                                                        return (
                                                                        <button
                                                                            key={i}
                                                                            disabled={isDisabled || isPaused || isResolvingMc}
                                                                            onClick={() => handleMCOptionClick(opt, i)}
                                                                            style={optionFontSize ? { fontSize: `${optionFontSize}px`, lineHeight: '1.2' } : undefined}
                                                                            className={`relative p-3 sm:p-4 md:p-5 rounded-none border-2 font-bold transition-all flex items-center justify-center w-full h-full whitespace-normal break-normal hyphens-none ${uniformSize} ${stateClass} focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0`}
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
                                                            className={`h-44 sm:h-52 md:h-60 w-full rounded-xl object-contain border border-slate-700/70 bg-slate-900 shadow-sm ${isMobileViewport ? '' : 'cursor-zoom-in'}`}
                                                        />
                                                        <div
                                                            ref={questionWrapRef}
                                                            className="w-full flex-1 min-h-0 flex items-center justify-center"
                                                        >
                                                            <h3
                                                                ref={questionTextRef}
                                                                style={questionFontSize ? { fontSize: `${questionFontSize}px`, lineHeight: '1.15' } : undefined}
                                                                className={`w-full font-display font-bold text-white text-center leading-tight whitespace-pre-wrap break-normal hyphens-none ${getQuestionFontSizeClass(currentQuestion?.question || "Loading...")}`}
                                                            >
                                                                {currentQuestion?.question || "Loading question..."}
                                                            </h3>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {/* Question Text Area - Flex-1 to take available space */}
                                                        <div
                                                            ref={questionWrapRef}
                                                            style={isMobileViewport && hasOptions ? { flex: '1 1 0%' } : undefined}
                                                            className={`flex-1 md:flex-[2] min-h-0 flex items-center w-full px-4 sm:px-6 md:px-8 ${hasOptions ? 'justify-start mb-2' : 'justify-center'}`}
                                                        >
                                                            <h3
                                                                ref={questionTextRef}
                                                                style={questionFontSize ? { fontSize: `${questionFontSize}px`, lineHeight: '1.15' } : undefined}
                                                                className={`w-full font-display font-bold text-white text-center leading-tight whitespace-pre-wrap break-normal hyphens-none ${getQuestionFontSizeClass(currentQuestion?.question || "Loading...")}`}
                                                            >
                                                                {currentQuestion?.question || "Loading question..."}
                                                            </h3>
                                                        </div>

                                                        {/* MULTIPLE CHOICE GRID - Pushed to bottom */}
                                                        {hasOptions && (
                                                            <div
                                                                className="w-full flex-1 md:flex-[3] min-h-0 mt-2 sm:mt-3 md:mt-6 flex-shrink-0 relative z-10 overflow-hidden"
                                                                style={isMobileViewport ? { flex: '1 1 0%' } : undefined}
                                                            >
                                                            <div ref={optionGridRef} className="grid grid-cols-2 md:grid-cols-2 gap-0 w-full h-full auto-rows-fr">
                                                                {(() => {
                                                                    const longestText = currentQuestion.options!.reduce(
                                                                        (a, b) => (stripOptionPrefix(a).length > stripOptionPrefix(b).length ? a : b),
                                                                        ''
                                                                    );
                                                                    const uniformSize = optionFontSize ? '' : getOptionFontSizeClass(stripOptionPrefix(longestText));
                                                                    
                                                                    return currentQuestion.options!.map((opt, i) => {
                                                                        const optionLabel = String.fromCharCode(65 + i);
                                                                        const displayOpt = stripOptionPrefix(opt);
                                                                        const isDisabled = disabledOptions.includes(i);
                                                                        const isCorrect = mcFeedback?.index === i && mcFeedback.status === 'correct';
                                                                        const isWrong = mcFeedback?.index === i && mcFeedback.status === 'wrong';
                                                                        const stateClass = isCorrect
                                                                            ? 'bg-green-600 border-green-400 text-white animate-[mcFlashGreen_0.35s_ease-out_1]'
                                                                            : isWrong
                                                                                ? 'bg-red-600 border-red-500 text-white animate-[mcFlashRed_0.3s_ease-out_1]'
                                                                                : isDisabled
                                                                                    ? 'bg-slate-800/50 border-slate-700 text-slate-500 cursor-not-allowed line-through'
                                                                            : 'bg-slate-700 border-slate-600 text-slate-200 sm:hover:bg-indigo-600 sm:hover:border-indigo-400 sm:hover:text-white active:scale-95 shadow-sm';
                                                                        return (
                                                                        <button
                                                                            key={i}
                                                                            disabled={isDisabled || isPaused || isResolvingMc}
                                                                            onClick={() => handleMCOptionClick(opt, i)}
                                                                            style={optionFontSize ? { fontSize: `${optionFontSize}px`, lineHeight: '1.2' } : undefined}
                                                                            className={`relative p-3 sm:p-4 md:p-5 rounded-none border-2 font-bold transition-all flex items-center justify-center w-full h-full whitespace-normal break-normal hyphens-none ${uniformSize} ${stateClass} focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0`}
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
                                                    </>
                                                )}
                                            </div>
                                            
                                            {/* FOOTER */}
                                            <div className="px-3 py-[clamp(3px,0.8vh,5px)] sm:px-4 sm:py-2 bg-slate-900 border-t border-indigo-900 flex justify-center gap-2 sm:gap-4 shrink-0">
                                                <button 
                                                    onClick={handlePass}
                                                    disabled={isPaused}
                                                    className="bg-slate-800 text-slate-300 w-[clamp(160px,60%,240px)] sm:w-auto px-4 sm:px-6 py-[clamp(3px,1.1vh,8px)] sm:py-2 rounded-full font-bold text-[clamp(11px,2.4vw,14px)] sm:text-lg hover:bg-slate-700 transition-colors flex items-center justify-center border-b-4 border-slate-950 active:border-b-0 active:translate-y-1 disabled:opacity-50"
                                                >
                                                    <SkipForward size={14} className="mr-2" /> Skip (-5s)
                                                </button>
                                                
                                                {!hasOptions && (
                                                    <button 
                                                        onClick={() => setIsFlipped(true)}
                                                        disabled={isPaused}
                                                        className="bg-brand-blue text-white px-6 sm:px-10 py-1.5 sm:py-2.5 rounded-full font-bold text-base sm:text-xl shadow-lg hover:scale-105 transition-transform flex items-center border-b-4 border-sky-800 active:border-b-0 active:translate-y-1 disabled:opacity-50"
                                                    >
                                                        Reveal Answer
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* BACK: ANSWER & SCORING */}
                                        <div className={`absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-3xl shadow-2xl overflow-hidden flex flex-col bg-slate-900 border-4 border-indigo-500 ${!isFlipped ? 'pointer-events-none' : ''}`}>
                                            <div className="bg-indigo-900/50 p-3 sm:p-4 border-b border-indigo-800 flex justify-between items-center">
                                                <span className="font-bold text-indigo-300 uppercase tracking-widest text-[10px] sm:text-sm">Answer</span>
                                                <button onClick={() => setIsFlipped(false)} className="p-2 bg-indigo-800 rounded-full text-indigo-200 hover:text-white transition-colors" title="Flip Back">
                                                    <RotateCcw size={20} />
                                                </button>
                                            </div>
                                            
                                            <div ref={answerWrapRef} className="flex-1 min-h-0 flex items-center justify-center p-4 sm:p-6 md:p-8 text-center overflow-hidden bg-slate-800">
                                                <h3
                                                    ref={answerTextRef}
                                                    style={answerFontSize ? { fontSize: `${answerFontSize}px`, lineHeight: '1.15' } : undefined}
                                                    className={`font-display font-bold text-white leading-tight whitespace-pre-wrap break-words hyphens-none ${getAnswerFontSizeClass(currentQuestion?.answer || "")}`}
                                                >
                                                    {currentQuestion?.answer}
                                                </h3>
                                            </div>
                                            
                                            <div className="p-3 sm:p-4 md:p-6 bg-slate-900 border-t border-indigo-900 grid grid-cols-2 gap-2 sm:gap-4">
                                                <button 
                                                    onClick={handleIncorrect}
                                                    disabled={isPaused}
                                                    className="bg-red-600 text-white font-bold text-sm sm:text-lg md:text-xl rounded-xl py-2.5 sm:py-4 hover:bg-red-500 transition-colors flex flex-col md:flex-row items-center justify-center border-b-4 border-red-800 active:border-b-0 active:translate-y-1 group disabled:opacity-50"
                                                >
                                                    <XCircle size={20} className="md:mr-2 mb-1 md:mb-0 group-hover:scale-110 transition-transform" />
                                                    <span>Wrong <span className="text-red-200 text-sm block md:inline">(-10s)</span></span>
                                                </button>

                                                <button 
                                                    onClick={handleCorrect}
                                                    disabled={isPaused}
                                                    className="bg-green-600 text-white font-bold text-sm sm:text-lg md:text-xl rounded-xl py-2.5 sm:py-4 hover:bg-green-500 transition-colors flex flex-col md:flex-row items-center justify-center border-b-4 border-green-800 active:border-b-0 active:translate-y-1 shadow-[0_0_20px_rgba(22,163,74,0.4)] group disabled:opacity-50"
                                                >
                                                    <CheckCircle size={20} className="md:mr-2 mb-1 md:mb-0 group-hover:scale-110 transition-transform" />
                                                    <span>Correct <span className="text-green-200 text-sm block md:inline">(Pass)</span></span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            </div>
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
                                {options.studentPractice ? (
                                    <XCircle size={100} className="text-red-500 animate-bounce" />
                                ) : (
                                    <Skull size={100} className="text-red-500 animate-bounce" />
                                )}
                            </div>
                        </div>
                        <h2 className="text-6xl font-display font-black mb-4 text-red-500 drop-shadow-md">BOOM!</h2>
                        <div className="bg-slate-900/80 rounded-xl p-4 mb-8 border border-red-900/50">
                            <p className="text-3xl font-bold text-white mb-2">{teamNames[activeTeamIndex]}</p>
                            <p className="text-xl text-red-400 font-mono tracking-widest uppercase">
                                {options.studentPractice ? "Time's up!" : 'Lost a Life!'}
                            </p>
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

            {/* QUIT CONFIRM */}
            {showQuitConfirm && (
                <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
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

            {showEndGameConfirm && (
                <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700 text-white p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl">
                        <h2 className="text-2xl font-bold mb-2">End game now?</h2>
                        <p className="text-slate-400 mb-6">The game will stop and move to the winners screen.</p>
                        <div className="flex space-x-4">
                            <button
                                onClick={() => setShowEndGameConfirm(false)}
                                className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold rounded-lg hover:bg-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setShowEndGameConfirm(false);
                                    setGameState('gameover');
                                }}
                                className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-500"
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

