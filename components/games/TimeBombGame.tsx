
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { GeneratedGame, GameRunOptions, GeneratedQuestion, PracticeReviewItem } from '../../types';
import { playSound } from '../../utils/gameUtils';
import { resolveGameQuestionImageUrl } from '../../utils/gameImage';
import { WinnerCeremonyHero, WinnerCeremonyStandingsTable } from './shared/WinnerCeremonyHero';
import { PracticeReviewSummary } from './shared/PracticeReviewSummary';
import { ArrowLeft, Volume2, VolumeX, Maximize2, Minimize2, AlertTriangle, Heart, Zap, CheckCircle, XCircle, RotateCcw, Clock, Play, SkipForward, Pause, Radiation, Flag } from 'lucide-react';

interface TimeBombGameProps {
    game: GeneratedGame;
    options: GameRunOptions;
    onBack: () => void;
    onFinish: () => void;
    onReplay: () => void;
}

const RADIOACTIVE_EXPLOSION_MODAL_DELAY_MS = 5400;

const slimeBubbles = [
    { left: '8%', size: 5, delay: '-0.6s', duration: '4.8s' },
    { left: '17%', size: 7, delay: '-2.2s', duration: '5.7s' },
    { left: '28%', size: 4, delay: '-1.3s', duration: '4.9s' },
    { left: '39%', size: 6, delay: '-3.7s', duration: '6.2s' },
    { left: '53%', size: 8, delay: '-0.9s', duration: '5.4s' },
    { left: '66%', size: 5, delay: '-2.9s', duration: '5.9s' },
    { left: '78%', size: 7, delay: '-1.8s', duration: '4.7s' },
    { left: '91%', size: 4, delay: '-3.2s', duration: '5.2s' },
];

const slimeDrips = [
    { left: '14%', width: 6, height: 13, delay: '-1.1s' },
    { left: '33%', width: 5, height: 9, delay: '-2.4s' },
    { left: '57%', width: 7, height: 15, delay: '-0.5s' },
    { left: '74%', width: 4, height: 10, delay: '-3.0s' },
    { left: '88%', width: 6, height: 12, delay: '-1.8s' },
];

type GooCircle = {
    id: string;
    x: number;
    y: number;
    xSpeed: number;
    ySpeed: number;
    r: number;
};

const initialGooCircles: GooCircle[] = [
    { id: 'a', x: 110, y: 26, xSpeed: 0.42, ySpeed: 0.32, r: 20 },
    { id: 'b', x: 230, y: 68, xSpeed: -0.34, ySpeed: 0.44, r: 17 },
    { id: 'c', x: 360, y: 38, xSpeed: 0.28, ySpeed: -0.38, r: 23 },
    { id: 'd', x: 500, y: 76, xSpeed: -0.48, ySpeed: 0.24, r: 19 },
    { id: 'e', x: 650, y: 30, xSpeed: 0.36, ySpeed: 0.52, r: 22 },
    { id: 'f', x: 790, y: 62, xSpeed: -0.3, ySpeed: -0.46, r: 18 },
    { id: 'g', x: 925, y: 24, xSpeed: -0.52, ySpeed: 0.34, r: 15 },
    { id: 'h', x: 60, y: 82, xSpeed: 0.5, ySpeed: -0.28, r: 13 },
    { id: 'i', x: 445, y: 17, xSpeed: 0.18, ySpeed: 0.58, r: 14 },
    { id: 'j', x: 710, y: 88, xSpeed: -0.22, ySpeed: -0.5, r: 16 },
    { id: 'k', x: 160, y: 54, xSpeed: 0.58, ySpeed: -0.36, r: 12 },
    { id: 'l', x: 315, y: 92, xSpeed: -0.44, ySpeed: -0.3, r: 15 },
    { id: 'm', x: 575, y: 14, xSpeed: 0.32, ySpeed: 0.4, r: 18 },
    { id: 'n', x: 835, y: 44, xSpeed: -0.4, ySpeed: 0.5, r: 14 },
    { id: 'o', x: 980, y: 92, xSpeed: -0.56, ySpeed: -0.24, r: 17 },
    { id: 'p', x: 25, y: 42, xSpeed: 0.38, ySpeed: 0.48, r: 15 },
    { id: 'q', x: 615, y: 54, xSpeed: -0.28, ySpeed: -0.52, r: 12 },
    { id: 'r', x: 885, y: 12, xSpeed: 0.24, ySpeed: 0.34, r: 13 },
    { id: 's', x: 95, y: 8, xSpeed: 0.46, ySpeed: 0.42, r: 11 },
    { id: 't', x: 205, y: 96, xSpeed: -0.26, ySpeed: -0.54, r: 12 },
    { id: 'u', x: 285, y: 34, xSpeed: 0.5, ySpeed: 0.26, r: 10 },
    { id: 'v', x: 390, y: 82, xSpeed: -0.36, ySpeed: -0.42, r: 13 },
    { id: 'w', x: 525, y: 44, xSpeed: 0.34, ySpeed: 0.48, r: 11 },
    { id: 'x', x: 745, y: 8, xSpeed: -0.5, ySpeed: 0.36, r: 12 },
    { id: 'y', x: 930, y: 62, xSpeed: -0.32, ySpeed: -0.4, r: 10 },
    { id: 'z', x: 345, y: 6, xSpeed: 0.22, ySpeed: 0.5, r: 9 },
];

const gooBounds = {
    minX: -45,
    minY: -18,
    maxX: 1045,
    maxY: 118,
};

const MetaballGooField: React.FC = () => {
    const [circles, setCircles] = useState<GooCircle[]>(initialGooCircles);
    const circlesRef = useRef<GooCircle[]>(initialGooCircles.map(circle => ({ ...circle })));
    const frameRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number | null>(null);

    useEffect(() => {
        const tick = (time: number) => {
            const lastTime = lastTimeRef.current ?? time;
            const delta = Math.min(2.2, Math.max(0.4, (time - lastTime) / 16.667));
            lastTimeRef.current = time;

            circlesRef.current = circlesRef.current.map(circle => {
                let x = circle.x + circle.xSpeed * delta;
                let y = circle.y + circle.ySpeed * delta;
                let xSpeed = circle.xSpeed;
                let ySpeed = circle.ySpeed;

                if (x < gooBounds.minX) {
                    x = gooBounds.minX;
                    xSpeed = Math.abs(xSpeed);
                } else if (x > gooBounds.maxX) {
                    x = gooBounds.maxX;
                    xSpeed = -Math.abs(xSpeed);
                }

                if (y < gooBounds.minY) {
                    y = gooBounds.minY;
                    ySpeed = Math.abs(ySpeed);
                } else if (y > gooBounds.maxY) {
                    y = gooBounds.maxY;
                    ySpeed = -Math.abs(ySpeed);
                }

                return { ...circle, x, y, xSpeed, ySpeed };
            });

            setCircles(circlesRef.current);
            frameRef.current = window.requestAnimationFrame(tick);
        };

        frameRef.current = window.requestAnimationFrame(tick);
        return () => {
            if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
        };
    }, []);

    return (
        <svg className="time-bomb-slime-goo-field" viewBox="0 0 1000 100" preserveAspectRatio="xMinYMid slice" focusable="false">
            <defs>
                <filter id="timeBombGooField" x="-10%" y="-80%" width="120%" height="260%" colorInterpolationFilters="sRGB">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="blur" />
                    <feColorMatrix
                        in="blur"
                        mode="matrix"
                        values="1 0 0 0 0
                            0 1 0 0 0
                            0 0 1 0 0
                            0 0 0 23 -8"
                        result="goo"
                    />
                    <feBlend in="SourceGraphic" in2="goo" />
                </filter>
                <radialGradient id="timeBombGooYellow" cx="35%" cy="28%" r="72%">
                    <stop offset="0%" stopColor="#fff9b8" />
                    <stop offset="32%" stopColor="#ffe91a" />
                    <stop offset="66%" stopColor="#d5b300" />
                    <stop offset="100%" stopColor="#7d6500" />
                </radialGradient>
            </defs>
            <g filter="url(#timeBombGooField)" className="time-bomb-slime-goo-group">
                <ellipse className="time-bomb-goo-rail goo-rail-top" cx="500" cy="6" rx="620" ry="34" fill="url(#timeBombGooYellow)" />
                <ellipse className="time-bomb-goo-rail goo-rail-bottom" cx="500" cy="94" rx="620" ry="32" fill="url(#timeBombGooYellow)" />
                <ellipse className="time-bomb-goo-rail goo-rail-left" cx="-18" cy="50" rx="52" ry="72" fill="url(#timeBombGooYellow)" />
                <ellipse className="time-bomb-goo-rail goo-rail-right" cx="1018" cy="50" rx="52" ry="72" fill="url(#timeBombGooYellow)" />
                {circles.map(circle => (
                    <circle
                        key={circle.id}
                        className="time-bomb-goo-ball"
                        cx={circle.x}
                        cy={circle.y}
                        r={circle.r}
                        fill="url(#timeBombGooYellow)"
                    />
                ))}
            </g>
        </svg>
    );
};

const RadioactiveSlimeTimer: React.FC<{ isPaused: boolean; progress: number }> = ({ progress }) => {
    const clampedProgress = Math.max(0, Math.min(1, progress));
    const slimeFillWidth = `${Math.max(0, clampedProgress * 100)}%`;
    const showSlime = clampedProgress > 0.01;

    return (
        <div
            className="time-bomb-slime-stage"
            style={{ '--slime-progress': slimeFillWidth } as React.CSSProperties}
            aria-hidden="true"
        >
            <div className="time-bomb-slime-tank">
                <div className="time-bomb-slime-tank-texture" />
                <div className="time-bomb-slime-glass" />
                {showSlime && (
                    <div className="time-bomb-slime-fill-clip">
                        <div className="time-bomb-slime-glow" />
                        <div className="time-bomb-slime-fill">
                            <div className="time-bomb-slime-surface" />
                            <div className="time-bomb-slime-inner" />
                            <MetaballGooField />
                            <div className="time-bomb-slime-shimmer" />
                            <div className="time-bomb-slime-bubbles">
                                {slimeBubbles.map((bubble, index) => (
                                    <span
                                        key={index}
                                        style={{
                                            left: bubble.left,
                                            width: bubble.size,
                                            height: bubble.size,
                                            animationDelay: bubble.delay,
                                            animationDuration: bubble.duration,
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="time-bomb-slime-bottom-drips">
                            {slimeDrips.map((drip, index) => (
                                <span
                                    key={index}
                                    style={{
                                        left: drip.left,
                                        width: drip.width,
                                        height: drip.height,
                                        animationDelay: drip.delay,
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

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
    const eliminationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    const gameStateRef = useRef(gameState);

    // Initial Question Setup
    const currentQuestion = questions[currentQuestionIndex];
    const hasOptions = currentQuestion?.options && currentQuestion.options.length > 0;
    const optionKey = currentQuestion?.options?.join('|') || '';
    const questionImageUrl = resolveGameQuestionImageUrl(currentQuestion?.image);
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

    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    const stopActiveTimers = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (explosionTimerRef.current) {
            clearTimeout(explosionTimerRef.current);
            explosionTimerRef.current = null;
        }
        if (eliminationTimerRef.current) {
            clearTimeout(eliminationTimerRef.current);
            eliminationTimerRef.current = null;
        }
        if (mcFeedbackTimerRef.current) {
            clearTimeout(mcFeedbackTimerRef.current);
            mcFeedbackTimerRef.current = null;
        }
    };

    const finishGame = () => {
        stopActiveTimers();
        setIsTicking(false);
        setIsPaused(false);
        setIsExploded(false);
        setShowExplosionModal(false);
        setMcFeedback(null);
        setIsResolvingMc(false);
        setGameState('gameover');
    };

    // Scroll Lock
    useEffect(() => {
        document.body.style.overflow = gameState === 'gameover' ? '' : 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, [gameState]);

    useEffect(() => {
        if (gameState !== 'gameover') return;
        stopActiveTimers();
        setIsTicking(false);
        setIsExploded(false);
        setShowExplosionModal(false);
    }, [gameState]);

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
        if (gameStateRef.current === 'gameover') return;
        captureExplosionOrigin();
        setIsTicking(false);
        setIsExploded(true);
        setGameState('exploded');
        setExplosionKey(prev => prev + 1);
        setShowExplosionModal(false);

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
            }, RADIOACTIVE_EXPLOSION_MODAL_DELAY_MS);
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
        }, RADIOACTIVE_EXPLOSION_MODAL_DELAY_MS);
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
            if (eliminationTimerRef.current) {
                clearTimeout(eliminationTimerRef.current);
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
        if (eliminationTimerRef.current) {
            clearTimeout(eliminationTimerRef.current);
        }
        eliminationTimerRef.current = setTimeout(() => {
            if (gameStateRef.current === 'gameover') return;
            setTeamLives(finalLives => {
                const survivors = finalLives.map((l, i) => l > 0).filter(Boolean).length;
                if (survivors <= 1 && options.players > 1) {
                    finishGame();
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
                finishGame();
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
                className={`${isFullscreen ? 'fixed inset-0 overflow-y-auto overflow-x-hidden' : 'relative min-h-[calc(100vh-4rem)]'} z-[300] bg-gradient-to-br from-teal-900 via-cyan-900 to-slate-950 text-white`}
            >
                <WinnerCeremonyHero
                    winnerHeadline={winnerHeadline}
                    subtitle="Final survival standings"
                    ranking={ranking}
                    isMobileViewport={isMobileViewport}
                    musicEnabled={!isMuted}
                    onPlayAgain={onReplay}
                    onExit={onFinish}
                >
                    <WinnerCeremonyStandingsTable
                        ranking={ranking}
                        formatScore={(score) => `${score} ${score === 1 ? 'life' : 'lives'}`}
                    />
                </WinnerCeremonyHero>
            </div>
        );
    }

    const mobileUsesTwoRowHeader = isMobileViewport && teamNames.length >= 4;
    const mobileHeaderColumns = teamNames.length >= 5 ? 3 : teamNames.length === 4 ? 2 : Math.max(teamNames.length, 1);
    const mobileControlCount = 3;
    const mobileUsesButtonGrid = mobileUsesTwoRowHeader && mobileControlCount >= 4;

    return (
        <div ref={containerRef} className={`bg-slate-950 flex flex-col ${isFullscreen ? 'h-[100dvh]' : 'h-[calc(100dvh-4rem)]'} overflow-hidden relative text-white font-sans`}>
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
                @keyframes timeBombGooFlash {
                    0% { opacity: 0; }
                    8% { opacity: 0.98; }
                    100% { opacity: 0.7; }
                }
                @keyframes timeBombScreenSplat {
                    0% {
                        transform: translate(-50%, -50%) scale(0.18) rotate(var(--splat-rotate, 0deg));
                        opacity: 0;
                        filter: blur(4px) brightness(1.4);
                    }
                    18% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1.18) rotate(var(--splat-rotate, 0deg));
                        filter: blur(0.5px) brightness(1.12);
                    }
                    100% {
                        transform: translate(-50%, -50%) scale(var(--splat-scale, 1)) rotate(var(--splat-rotate, 0deg));
                        opacity: var(--splat-opacity, 0.84);
                        filter: blur(0);
                    }
                }
                @keyframes timeBombScreenStreak {
                    0% {
                        transform: translate(-50%, -50%) scaleX(0.12) scaleY(0.7) rotate(var(--streak-rotate, 0deg));
                        opacity: 0;
                        filter: blur(3px);
                    }
                    16% {
                        opacity: 0.96;
                        transform: translate(-50%, -50%) scaleX(1.08) scaleY(1) rotate(var(--streak-rotate, 0deg));
                        filter: blur(0);
                    }
                    100% {
                        opacity: var(--streak-opacity, 0.74);
                        transform: translate(-50%, -50%) scaleX(1) scaleY(1) rotate(var(--streak-rotate, 0deg));
                    }
                }
                @keyframes timeBombScreenDrip {
                    0% { transform: translateY(-18px) scaleY(0.1); opacity: 0; }
                    22% { opacity: 0.86; }
                    100% { transform: translateY(0) scaleY(1); opacity: 0.68; }
                }
                @keyframes timeBombGlassDrip {
                    0% {
                        transform: translateX(-50%) translateY(-10px) scaleY(0.04);
                        opacity: 0;
                    }
                    12% {
                        opacity: calc(var(--drip-opacity, 0.72) * 0.76);
                        transform: translateX(-50%) translateY(0) scaleY(0.24);
                    }
                    72% {
                        opacity: var(--drip-opacity, 0.72);
                        transform: translateX(calc(-50% + var(--drip-sway, 0px))) translateY(calc(var(--drip-fall, 90px) * 0.74)) scaleY(0.92);
                    }
                    100% {
                        transform: translateX(calc(-50% - var(--drip-sway, 0px))) translateY(var(--drip-fall, 90px)) scaleY(1);
                        opacity: var(--drip-opacity, 0.72);
                    }
                }
                @keyframes timeBombGlassDripBead {
                    0%, 12% {
                        transform: translate(-50%, -6px) scale(0.3);
                        opacity: 0;
                    }
                    66% {
                        opacity: calc(var(--drip-opacity, 0.72) + 0.12);
                        transform: translate(calc(-50% + var(--drip-sway, 0px)), calc(var(--bead-fall, 112px) * 0.52)) scale(0.82);
                    }
                    100% {
                        transform: translate(calc(-50% - var(--drip-sway, 0px)), var(--bead-fall, 112px)) scale(1);
                        opacity: calc(var(--drip-opacity, 0.72) + 0.04);
                    }
                }
                @keyframes timeBombSvgSplat {
                    0% {
                        transform: scale(0.08) rotate(var(--svg-rotate, 0deg));
                        opacity: 0;
                        filter: blur(5px) brightness(1.55);
                    }
                    16% {
                        transform: scale(1.08) rotate(var(--svg-rotate, 0deg));
                        opacity: 1;
                        filter: blur(0.3px) brightness(1.15);
                    }
                    100% {
                        transform: scale(1) rotate(var(--svg-rotate, 0deg));
                        opacity: var(--svg-opacity, 0.82);
                        filter: blur(0);
                    }
                }
                @keyframes timeBombSplatAssetImpact {
                    0% {
                        transform: translate(-50%, -50%) rotate(var(--splat-rotate, 0deg)) scale(0.08);
                        opacity: 0.18;
                        filter: blur(5px) brightness(1.8);
                    }
                    12% {
                        transform: translate(-50%, -50%) rotate(var(--splat-rotate, 0deg)) scale(0.18);
                        opacity: 0.56;
                        filter: blur(4px) brightness(1.72);
                    }
                    25% {
                        transform: translate(-50%, -50%) rotate(var(--splat-rotate, 0deg)) scale(0.32);
                        opacity: 0.78;
                        filter: blur(3px) brightness(1.58);
                    }
                    40% {
                        transform: translate(-50%, -50%) rotate(var(--splat-rotate, 0deg)) scale(0.5);
                        opacity: 0.9;
                        filter: blur(2px) brightness(1.42);
                    }
                    58% {
                        transform: translate(-50%, -50%) rotate(var(--splat-rotate, 0deg)) scale(0.72);
                        opacity: 0.96;
                        filter: blur(1px) brightness(1.28);
                    }
                    76% {
                        transform: translate(-50%, -50%) rotate(var(--splat-rotate, 0deg)) scale(0.91);
                        opacity: 0.98;
                        filter: blur(0.4px) brightness(1.12);
                    }
                    90% {
                        transform: translate(-50%, -50%) rotate(var(--splat-rotate, 0deg)) scale(1.02);
                        opacity: 1;
                        filter: blur(0.1px) brightness(1.05);
                    }
                    100% {
                        transform: translate(-50%, -50%) rotate(var(--splat-rotate, 0deg)) scale(1);
                        opacity: 0.96;
                        filter: blur(0) brightness(1);
                    }
                }
                @keyframes timeBombRadioactivePulse {
                    0%, 100% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(250, 204, 21, 0.42)); }
                    50% { transform: scale(1.05); filter: drop-shadow(0 0 24px rgba(250, 204, 21, 0.82)); }
                }
                .time-bomb-goo-screen {
                    position: absolute;
                    inset: 0;
                    background:
                        radial-gradient(circle at 50% 42%, rgba(255, 250, 142, 0.62), transparent 24%),
                        linear-gradient(180deg, rgba(250, 204, 21, 0.58), rgba(139, 92, 0, 0.42));
                    animation: timeBombGooFlash 0.28s ease-out forwards;
                }
                .time-bomb-goo-screen::before,
                .time-bomb-goo-screen::after {
                    content: "";
                    position: absolute;
                    inset: -4%;
                    pointer-events: none;
                    display: none;
                }
                .time-bomb-goo-screen::before {
                    background:
                        radial-gradient(ellipse at 11% 51%, rgba(255,248,118,0.54) 0 2.5%, transparent 3.2%),
                        radial-gradient(ellipse at 34% 45%, rgba(255,230,0,0.5) 0 2.8%, transparent 3.5%),
                        radial-gradient(ellipse at 79% 47%, rgba(255,236,0,0.52) 0 3.2%, transparent 4%),
                        radial-gradient(ellipse at 88% 58%, rgba(255,250,156,0.44) 0 2.4%, transparent 3.1%);
                    opacity: 0;
                    animation: timeBombScreenSplat 0.34s cubic-bezier(.08,.94,.19,1) forwards;
                }
                .time-bomb-goo-screen::after {
                    background:
                        linear-gradient(90deg, transparent 10%, rgba(255,238,30,0.46) 10.7% 12.2%, transparent 12.9%),
                        linear-gradient(90deg, transparent 48%, rgba(255,235,21,0.42) 48.4% 50.7%, transparent 51.3%),
                        linear-gradient(90deg, transparent 76%, rgba(255,246,112,0.46) 76.5% 78.1%, transparent 78.7%);
                    opacity: 0;
                    animation: timeBombScreenDrip 0.42s ease-out forwards;
                }
                .time-bomb-screen-splatter {
                    position: absolute;
                    left: var(--splat-x, 50%);
                    top: var(--splat-y, 50%);
                    width: var(--splat-size, 120px);
                    aspect-ratio: 1;
                    border-radius: 48% 52% 42% 58% / 45% 58% 42% 55%;
                    background:
                        radial-gradient(circle at 32% 26%, rgba(255,255,205,0.9), transparent 9%),
                        radial-gradient(circle at 62% 37%, rgba(255,245,73,0.92), transparent 16%),
                        radial-gradient(circle at 42% 62%, rgba(180,128,0,0.48), transparent 28%),
                        radial-gradient(circle, rgba(255,226,0,0.94) 0%, rgba(214,157,0,0.9) 56%, rgba(97,67,0,0.5) 100%);
                    box-shadow:
                        inset 0 -12px 24px rgba(75, 50, 0, 0.42),
                        inset 0 10px 16px rgba(255,255,190,0.46),
                        0 0 20px rgba(250, 204, 21, 0.5);
                    animation: timeBombScreenSplat var(--splat-speed, 0.38s) cubic-bezier(.08,.94,.19,1) forwards;
                }
                .time-bomb-screen-splatter::before,
                .time-bomb-screen-splatter::after {
                    content: "";
                    position: absolute;
                    border-radius: 999px;
                    background: radial-gradient(circle at 35% 30%, rgba(255,255,205,0.9), rgba(255,222,0,0.86) 48%, rgba(118,82,0,0.35) 100%);
                    box-shadow: 0 0 14px rgba(250,204,21,0.42);
                }
                .time-bomb-screen-splatter::before {
                    width: 42%;
                    height: 20%;
                    right: -22%;
                    top: 20%;
                    transform: rotate(20deg);
                }
                .time-bomb-screen-splatter::after {
                    width: 24%;
                    height: 34%;
                    left: 6%;
                    bottom: -20%;
                    transform: rotate(-16deg);
                }
                .time-bomb-screen-streak {
                    position: absolute;
                    left: var(--streak-x, 50%);
                    top: var(--streak-y, 50%);
                    width: var(--streak-w, 180px);
                    height: var(--streak-h, 34px);
                    border-radius: 999px 55% 55% 999px;
                    background:
                        radial-gradient(circle at 18% 42%, rgba(255,255,190,0.82), transparent 13%),
                        linear-gradient(90deg, rgba(255,246,92,0.94), rgba(218,160,0,0.86), rgba(115,80,0,0.24));
                    box-shadow:
                        inset 0 -7px 12px rgba(93,62,0,0.34),
                        0 0 18px rgba(250,204,21,0.42);
                    animation: timeBombScreenStreak var(--streak-speed, 0.36s) cubic-bezier(.08,.94,.19,1) forwards;
                }
                .time-bomb-screen-impact {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    overflow: visible;
                }
                .time-bomb-screen-impact .goo-main,
                .time-bomb-screen-impact .goo-small,
                .time-bomb-screen-impact .goo-fleck {
                    transform-box: fill-box;
                    transform-origin: center;
                    animation: timeBombSvgSplat var(--svg-speed, 0.28s) cubic-bezier(.08,.94,.19,1) forwards;
                }
                .time-bomb-screen-impact .goo-small {
                    --svg-speed: 0.34s;
                    --svg-opacity: 0.68;
                }
                .time-bomb-screen-impact .goo-fleck {
                    --svg-speed: 0.3s;
                    --svg-opacity: 0.58;
                }
                .time-bomb-splat-asset {
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    width: min(96vw, 1530px);
                    max-width: none;
                    max-height: 96%;
                    aspect-ratio: 1672 / 941;
                    transform-origin: center;
                    opacity: 0;
                    mix-blend-mode: normal;
                    filter: drop-shadow(0 18px 34px rgba(88, 58, 0, 0.45));
                    --splat-rotate: 0deg;
                    z-index: 1;
                    animation: timeBombSplatAssetImpact 1s linear forwards;
                }
                .time-bomb-splat-video-wrap {
                    position: absolute;
                    inset: 0;
                    z-index: 1;
                    overflow: hidden;
                    background: transparent;
                    box-shadow:
                        inset 24vw 0 18vw rgba(78, 57, 7, 0.58),
                        inset -24vw 0 18vw rgba(78, 57, 7, 0.58);
                    animation: timeBombGooFlash 0.28s ease-out forwards;
                }
                .time-bomb-splat-video {
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    z-index: 1;
                    height: 100%;
                    width: auto;
                    max-width: 100%;
                    aspect-ratio: 16 / 9;
                    object-fit: cover;
                    object-position: center;
                    transform: translate(-50%, -50%);
                    filter: saturate(1.08) contrast(1.04) brightness(0.95);
                    -webkit-mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.3) 5%, #000 16%, #000 84%, rgba(0,0,0,0.3) 95%, transparent 100%);
                    mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.3) 5%, #000 16%, #000 84%, rgba(0,0,0,0.3) 95%, transparent 100%);
                }
                .time-bomb-splat-video-wrap::after {
                    content: "";
                    position: absolute;
                    right: -2%;
                    bottom: -4%;
                    width: min(30vw, 430px);
                    height: min(32vh, 300px);
                    z-index: 4;
                    pointer-events: none;
                    background:
                        radial-gradient(ellipse at 50% 50%, rgba(47, 50, 48, 1) 0 34%, rgba(47, 50, 48, 0.96) 52%, rgba(47, 50, 48, 0.68) 70%, transparent 84%);
                    filter: blur(18px);
                    opacity: 1;
                }
                .time-bomb-video-watermark-cover {
                    position: absolute;
                    right: -18px;
                    bottom: -18px;
                    z-index: 5;
                    width: min(34vw, 500px);
                    height: min(34vh, 330px);
                    pointer-events: none;
                    background:
                        radial-gradient(ellipse at 54% 54%, rgba(48, 51, 48, 1) 0 32%, rgba(48, 51, 48, 0.98) 52%, rgba(48, 51, 48, 0.68) 72%, transparent 86%);
                    filter: blur(18px);
                    opacity: 1;
                }
                .time-bomb-splat-video-tint {
                    position: absolute;
                    inset: 0;
                    z-index: 2;
                    pointer-events: none;
                    background:
                        radial-gradient(circle at 50% 42%, rgba(250, 204, 21, 0.12), transparent 38%),
                        linear-gradient(180deg, rgba(250, 204, 21, 0.08), rgba(88, 58, 0, 0.2));
                    mix-blend-mode: screen;
                    opacity: 0.55;
                }
                .time-bomb-splat-image {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    z-index: 1;
                }
                .time-bomb-glass-drip {
                    position: absolute;
                    left: var(--drip-x, 50%);
                    top: var(--drip-y, 58%);
                    width: var(--drip-w, 14px);
                    height: var(--drip-h, 120px);
                    border-radius: 999px 999px 64% 64%;
                    transform-origin: top center;
                    background:
                        radial-gradient(circle at 35% 8%, rgba(255,255,202,0.94), transparent 15%),
                        radial-gradient(ellipse at 62% 76%, rgba(116, 83, 0, 0.5), transparent 42%),
                        linear-gradient(90deg, rgba(255, 255, 176, 0.34), rgba(255, 222, 0, 0.1) 32%, rgba(91, 63, 0, 0.26) 100%),
                        linear-gradient(180deg, rgba(255,238,0,0.9), rgba(220,158,0,0.8) 58%, rgba(113,76,0,0.5));
                    box-shadow:
                        inset -5px 0 10px rgba(80, 53, 0, 0.34),
                        inset 4px 0 9px rgba(255, 255, 184, 0.38),
                        0 0 16px rgba(250, 204, 21, 0.34);
                    opacity: 0;
                    z-index: 2;
                    filter: blur(0.15px) saturate(1.08);
                    mix-blend-mode: normal;
                    animation: timeBombGlassDrip var(--drip-duration, 1.75s) ease-in-out forwards;
                    animation-delay: var(--drip-delay, 0.12s);
                }
                .time-bomb-glass-drip::before {
                    content: "";
                    position: absolute;
                    left: 50%;
                    top: -14px;
                    width: calc(var(--drip-w, 14px) * 3.4);
                    height: calc(var(--drip-w, 14px) * 1.85);
                    transform: translateX(-50%);
                    border-radius: 45% 55% 60% 40% / 48% 44% 56% 52%;
                    background:
                        radial-gradient(circle at 31% 24%, rgba(255,255,204,0.82), transparent 21%),
                        radial-gradient(ellipse at 72% 58%, rgba(108,76,0,0.34), transparent 42%),
                        radial-gradient(circle, rgba(255,224,0,0.76), rgba(177,122,0,0.46) 72%, transparent 74%);
                    box-shadow:
                        inset -6px -4px 9px rgba(85,58,0,0.22),
                        0 0 13px rgba(250,204,21,0.28);
                }
                .time-bomb-glass-drip::after {
                    content: "";
                    position: absolute;
                    left: 50%;
                    bottom: -14px;
                    width: calc(var(--drip-w, 14px) * 1.9);
                    aspect-ratio: 1;
                    border-radius: 50% 50% 58% 42% / 48% 48% 62% 52%;
                    background:
                        radial-gradient(circle at 34% 26%, rgba(255,255,202,0.84), transparent 20%),
                        radial-gradient(circle at 65% 72%, rgba(105,73,0,0.36), transparent 48%),
                        radial-gradient(circle, rgba(255,220,0,0.84), rgba(176,123,0,0.64));
                    box-shadow:
                        inset -5px -5px 9px rgba(83,55,0,0.28),
                        0 0 13px rgba(250,204,21,0.32);
                    opacity: 0;
                    animation: timeBombGlassDripBead var(--drip-duration, 1.75s) ease-in-out forwards;
                    animation-delay: var(--drip-delay, 0.12s);
                }
                @media (max-width: 640px) {
                    .time-bomb-splat-asset {
                        width: min(160vw, 92dvh);
                        --splat-rotate: 90deg;
                    }
                    .time-bomb-splat-video {
                        width: 165vw;
                        height: auto;
                        max-width: none;
                        max-height: 100%;
                        transform: translate(-50%, -50%);
                        -webkit-mask-image: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.35) 6%, #000 18%, #000 82%, rgba(0,0,0,0.35) 94%, transparent 100%);
                        mask-image: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.35) 6%, #000 18%, #000 82%, rgba(0,0,0,0.35) 94%, transparent 100%);
                    }
                    .time-bomb-splat-video-wrap {
                        box-shadow:
                            inset 0 16vh 14vh rgba(78, 57, 7, 0.58),
                            inset 0 -16vh 14vh rgba(78, 57, 7, 0.58);
                    }
                    .time-bomb-splat-video-wrap::after {
                        width: 42vw;
                        height: 28vh;
                    }
                    .time-bomb-video-watermark-cover {
                        width: 48vw;
                        height: 30vh;
                    }
                    .time-bomb-glass-drip {
                        top: var(--drip-mobile-y, var(--drip-y, 58%));
                        height: calc(var(--drip-h, 120px) * 0.78);
                    }
                }
                .time-bomb-screen-drip {
                    position: absolute;
                    top: var(--drip-y, 0);
                    width: var(--drip-w, 16px);
                    height: var(--drip-h, 26vh);
                    left: var(--drip-x, 50%);
                    border-radius: 999px 999px 70% 70%;
                    background: linear-gradient(180deg, rgba(255,241,118,0.86), rgba(230,171,0,0.7), rgba(116,78,0,0.18));
                    box-shadow: 0 0 18px rgba(250,204,21,0.5);
                    transform-origin: top center;
                    animation: timeBombScreenDrip var(--drip-speed, 0.48s) ease-out forwards;
                }
                .time-bomb-radioactive-modal {
                    background:
                        linear-gradient(135deg, rgba(250,204,21,0.18) 0 12%, rgba(0,0,0,0.28) 12% 24%, rgba(250,204,21,0.18) 24% 36%, rgba(0,0,0,0.28) 36% 48%, rgba(250,204,21,0.18) 48% 60%, rgba(0,0,0,0.28) 60% 72%, rgba(250,204,21,0.18) 72% 84%, rgba(0,0,0,0.28) 84% 100%),
                        linear-gradient(180deg, #facc15, #b98500);
                }
                .time-bomb-radioactive-title {
                    font-size: clamp(2.15rem, 10vw, 3.5rem);
                    line-height: 0.92;
                    text-wrap: balance;
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
                .time-bomb-nuclear-bg {
                    background:
                        linear-gradient(to bottom, rgba(15, 23, 42, 0.16), rgba(15, 23, 42, 0.42)),
                        url('/assets/background/timebomb-nuclear-bg.png') center / cover no-repeat;
                }
                .time-bomb-nuclear-bg::before {
                    content: "";
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    background:
                        radial-gradient(circle at 50% 40%, rgba(254, 240, 138, 0.12), transparent 42%),
                        linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.26) 100%);
                }
                .time-bomb-nuclear-bg::after {
                    content: "";
                    display: none;
                }
                .time-bomb-hazard-header {
                    background:
                        radial-gradient(circle at 18% 22%, rgba(250, 204, 21, 0.08), transparent 22%),
                        linear-gradient(to bottom, #4b5563 0%, #374151 48%, #1f2937 100%);
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), inset 0 -4px 0 rgba(0, 0, 0, 0.42), inset 0 0 34px rgba(0, 0, 0, 0.26), 0 24px 42px rgba(0, 0, 0, 0.58);
                }
                .time-bomb-hazard-header::before {
                    content: "";
                    position: absolute;
                    inset: 0;
                    z-index: 0;
                    pointer-events: none;
                    background:
                        radial-gradient(circle at 12% 38%, rgba(0, 0, 0, 0.24) 0 1px, transparent 5px),
                        radial-gradient(circle at 43% 64%, rgba(0, 0, 0, 0.18) 0 1px, transparent 6px),
                        radial-gradient(circle at 78% 28%, rgba(0, 0, 0, 0.2) 0 1px, transparent 5px),
                        linear-gradient(to bottom, rgba(0, 0, 0, 0.08), transparent 42%, rgba(0, 0, 0, 0.24));
                }
                .time-bomb-hazard-header::after {
                    content: "";
                    position: absolute;
                    inset: 6px 8px;
                    z-index: 0;
                    pointer-events: none;
                    border-top: 1px solid rgba(255, 255, 255, 0.08);
                    border-bottom: 1px solid rgba(0, 0, 0, 0.42);
                }
                .time-bomb-hazard-header > * {
                    position: relative;
                    z-index: 1;
                }
                .time-bomb-slime-stage {
                    position: absolute;
                    inset: 0;
                    overflow: visible;
                    pointer-events: none;
                    z-index: 0;
                }
                .time-bomb-slime-tank {
                    position: absolute;
                    inset: 0;
                    overflow: hidden;
                    background:
                        radial-gradient(circle at 18% 30%, rgba(101, 163, 13, 0.18), transparent 22%),
                        radial-gradient(circle at 68% 55%, rgba(22, 101, 52, 0.2), transparent 28%),
                        linear-gradient(180deg, #071405 0%, #031000 44%, #010701 100%);
                    box-shadow:
                        inset 0 3px 8px rgba(255, 255, 255, 0.12),
                        inset 0 -8px 16px rgba(0, 0, 0, 0.72),
                        inset 0 0 30px rgba(0, 0, 0, 0.62);
                }
                .time-bomb-slime-tank-texture {
                    position: absolute;
                    inset: 0;
                    overflow: hidden;
                    opacity: 0.42;
                    background:
                        repeating-linear-gradient(90deg, rgba(190, 242, 100, 0.05) 0 1px, transparent 1px 28px),
                        linear-gradient(90deg, rgba(0, 0, 0, 0.22), transparent 42%, rgba(0, 0, 0, 0.42));
                }
                .time-bomb-slime-glass {
                    position: absolute;
                    inset: 0;
                    z-index: 8;
                    background:
                        linear-gradient(180deg, rgba(255, 255, 255, 0.24) 0%, rgba(255, 255, 255, 0.06) 14%, transparent 36%),
                        linear-gradient(90deg, rgba(255, 255, 255, 0.13), transparent 12%, transparent 88%, rgba(255, 255, 255, 0.08));
                    box-shadow: inset 0 0 0 1px rgba(250, 250, 160, 0.12);
                }
                .time-bomb-slime-fill-clip {
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: var(--slime-progress);
                    min-width: 0;
                    overflow: visible;
                    transition: width 80ms linear;
                    z-index: 2;
                }
                .time-bomb-slime-glow {
                    position: absolute;
                    inset: -6px -28px -8px -6px;
                    background: radial-gradient(ellipse at right center, rgba(255, 230, 0, 0.58), rgba(177, 143, 0, 0.24) 34%, transparent 72%);
                    filter: blur(8px);
                    opacity: 0.85;
                }
                .time-bomb-slime-fill {
                    position: absolute;
                    inset: 2px 0 2px 2px;
                    overflow: hidden;
                    background:
                        radial-gradient(ellipse at 18% 20%, rgba(255, 236, 52, 0.28), transparent 16%),
                        radial-gradient(ellipse at 42% 62%, rgba(86, 68, 0, 0.48), transparent 24%),
                        radial-gradient(ellipse at 72% 34%, rgba(221, 180, 0, 0.22), transparent 20%),
                        linear-gradient(180deg, #c8a900 0%, #9b7e00 28%, #655200 64%, #2f2700 100%);
                    box-shadow:
                        inset 0 4px 8px rgba(255, 239, 93, 0.34),
                        inset 0 -10px 18px rgba(58, 45, 0, 0.78),
                        0 0 14px rgba(255, 218, 0, 0.5);
                }
                .time-bomb-slime-fill::after {
                    content: "";
                    position: absolute;
                    inset: 0;
                    background:
                        radial-gradient(ellipse at 18% 76%, rgba(57, 44, 0, 0.48), transparent 21%),
                        radial-gradient(ellipse at 46% 64%, rgba(91, 71, 0, 0.34), transparent 20%),
                        radial-gradient(ellipse at 76% 78%, rgba(47, 36, 0, 0.42), transparent 22%),
                        linear-gradient(90deg, rgba(255, 241, 128, 0.12), transparent 18%, rgba(55, 43, 0, 0.2) 58%, rgba(255, 225, 50, 0.1));
                    mix-blend-mode: multiply;
                    opacity: 0.9;
                }
                .time-bomb-slime-surface {
                    position: absolute;
                    left: -6%;
                    top: -6px;
                    width: 112%;
                    height: 24px;
                    z-index: 4;
                    background:
                        radial-gradient(ellipse at 18% 50%, rgba(255, 243, 97, 0.62), transparent 27%),
                        radial-gradient(ellipse at 58% 42%, rgba(255, 226, 0, 0.48), transparent 30%),
                        linear-gradient(180deg, rgba(255, 232, 0, 0.52), rgba(155, 125, 0, 0.34) 74%, transparent);
                    clip-path: polygon(0 40%, 8% 33%, 18% 45%, 29% 28%, 40% 42%, 52% 31%, 64% 44%, 76% 30%, 89% 43%, 100% 34%, 100% 100%, 0 100%);
                    animation: timeBombSlimeSurface 3.2s ease-in-out infinite;
                    filter: drop-shadow(0 0 5px rgba(238, 255, 0, 0.78));
                }
                .time-bomb-slime-inner {
                    position: absolute;
                    inset: 9px 0 4px;
                    z-index: 3;
                    background:
                        radial-gradient(ellipse at 14% 18%, rgba(255, 243, 96, 0.5), transparent 9%),
                        radial-gradient(ellipse at 37% 42%, rgba(255, 226, 0, 0.44), transparent 12%),
                        radial-gradient(ellipse at 61% 28%, rgba(255, 239, 120, 0.38), transparent 10%),
                        radial-gradient(ellipse at 83% 68%, rgba(65, 49, 0, 0.44), transparent 14%),
                        linear-gradient(90deg, rgba(96, 74, 0, 0.22), transparent 42%, rgba(255, 222, 0, 0.22));
                    animation: timeBombSlimeInner 5.5s linear infinite;
                    opacity: 0.92;
                }
                .time-bomb-slime-goo-field {
                    position: absolute;
                    inset: -12px -1% -12px -1%;
                    width: 102%;
                    height: calc(100% + 24px);
                    z-index: 5;
                    overflow: visible;
                    opacity: 0.82;
                    mix-blend-mode: screen;
                    filter: drop-shadow(0 0 8px rgba(255, 221, 0, 0.58));
                }
                .time-bomb-slime-goo-group {
                    transform-box: fill-box;
                    transform-origin: center;
                }
                .time-bomb-goo-rail {
                    opacity: 0.78;
                }
                .time-bomb-goo-ball {
                    transform-box: fill-box;
                    transform-origin: center;
                    opacity: 0.95;
                    filter: drop-shadow(0 0 4px rgba(255, 232, 0, 0.34));
                }
                .time-bomb-slime-shimmer {
                    position: absolute;
                    inset: 0;
                    z-index: 6;
                    background: linear-gradient(105deg, transparent 0%, transparent 28%, rgba(255, 255, 190, 0.42) 38%, rgba(196, 255, 0, 0.16) 49%, transparent 62%, transparent 100%);
                    mix-blend-mode: screen;
                    transform: translateX(-80%);
                    animation: timeBombSlimeShimmer 4.8s ease-in-out infinite;
                }
                .time-bomb-slime-bubbles {
                    position: absolute;
                    inset: 5px 0 4px;
                    z-index: 5;
                }
                .time-bomb-slime-bubbles span {
                    position: absolute;
                    bottom: -8px;
                    border-radius: 999px;
                    border: 1px solid rgba(245, 255, 115, 0.7);
                    background:
                        radial-gradient(circle at 32% 28%, rgba(255, 255, 230, 0.88), rgba(223, 255, 42, 0.48) 34%, rgba(66, 181, 0, 0.12) 72%, rgba(66, 181, 0, 0));
                    box-shadow: 0 0 6px rgba(219, 255, 0, 0.5);
                    animation-name: timeBombSlimeBubble;
                    animation-timing-function: ease-in-out;
                    animation-iteration-count: infinite;
                }
                .time-bomb-slime-bottom-drips {
                    position: absolute;
                    left: 2px;
                    right: 0;
                    bottom: 0;
                    height: 10px;
                    z-index: 4;
                    overflow: hidden;
                }
                .time-bomb-slime-bottom-drips span {
                    position: absolute;
                    top: 0;
                    border-radius: 999px 999px 70% 70%;
                    background: linear-gradient(180deg, rgba(227, 255, 0, 0.9), rgba(81, 206, 0, 0.74), rgba(27, 115, 0, 0));
                    box-shadow: 0 0 7px rgba(193, 255, 0, 0.62);
                    transform-origin: top center;
                    animation: timeBombSlimeDrip 3.6s ease-in-out infinite;
                }
                @keyframes timeBombSlimeSurface {
                    0%, 100% {
                        transform: translateX(0) translateY(0);
                        clip-path: polygon(0 40%, 8% 33%, 18% 45%, 29% 28%, 40% 42%, 52% 31%, 64% 44%, 76% 30%, 89% 43%, 100% 34%, 100% 100%, 0 100%);
                    }
                    50% {
                        transform: translateX(-2%) translateY(2px);
                        clip-path: polygon(0 35%, 10% 44%, 22% 30%, 33% 45%, 45% 31%, 57% 43%, 68% 29%, 80% 46%, 91% 32%, 100% 42%, 100% 100%, 0 100%);
                    }
                }
                @keyframes timeBombSlimeInner {
                    0% { transform: translateX(-2%); }
                    100% { transform: translateX(4%); }
                }
                @keyframes timeBombSlimeShimmer {
                    0%, 46% { transform: translateX(-85%); opacity: 0; }
                    56% { opacity: 0.72; }
                    100% { transform: translateX(85%); opacity: 0; }
                }
                @keyframes timeBombSlimeBubble {
                    0% {
                        transform: translateY(10px) scale(0.76);
                        opacity: 0;
                    }
                    18% { opacity: 0.66; }
                    72% { opacity: 0.46; }
                    100% {
                        transform: translateY(-28px) scale(1.12);
                        opacity: 0;
                    }
                }
                @keyframes timeBombSlimeDrip {
                    0%, 100% { transform: scaleY(0.28); opacity: 0.12; }
                    42% { transform: scaleY(1); opacity: 0.72; }
                    68% { transform: scaleY(0.62) translateY(2px); opacity: 0.36; }
                }
            `}</style>
            
            {/* 1. HEADER */}
            <div className={`time-bomb-hazard-header px-2 py-2 sm:p-4 shrink-0 z-50 border-b border-yellow-500/70 flex justify-between gap-3 sm:gap-4 ${mobileUsesTwoRowHeader ? 'h-[110px]' : 'min-h-[70px]'} sm:min-h-[140px] relative overflow-visible ${mobileUsesTwoRowHeader ? 'items-start' : 'items-center'}`}>
                <div className={`min-w-fit shrink-0 sm:hidden gap-1.5 ${mobileUsesButtonGrid ? 'grid grid-cols-2' : mobileUsesTwoRowHeader ? 'flex flex-col items-start' : 'flex flex-row items-center'}`}>
                    <button onClick={() => setShowQuitConfirm(true)} className="w-9 h-9 text-yellow-100 hover:text-white bg-black/70 rounded-lg transition-colors flex items-center justify-center text-sm font-bold border border-yellow-400/60 hover:border-white/70">
                        <ArrowLeft size={17} />
                    </button>
                    <button
                        onClick={() => setShowEndGameConfirm(true)}
                        className="w-9 h-9 text-black bg-yellow-400 hover:bg-yellow-300 rounded-lg transition-colors flex items-center justify-center text-sm font-bold border border-black/60"
                        title="End game now"
                    >
                        <Flag size={14} />
                    </button>
                    <button onClick={() => setIsMuted(!isMuted)} className="w-9 h-9 text-yellow-100 hover:text-white bg-black/70 hover:bg-black/80 rounded-lg transition-colors border border-yellow-400/60 flex items-center justify-center">
                        {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                    </button>
                </div>

                <div className="hidden sm:flex flex-col items-start gap-2 min-w-[140px]">
                    <button onClick={() => setShowQuitConfirm(true)} className="w-[140px] justify-center text-yellow-100 hover:text-white bg-black/70 px-3 py-2 rounded-lg transition-colors flex items-center text-sm font-bold border border-yellow-400/60 hover:border-white/70">
                        <ArrowLeft size={16} className="mr-2" /> Quit
                    </button>
                    <button
                        onClick={() => setShowEndGameConfirm(true)}
                        className="w-[140px] justify-center text-black bg-yellow-400 hover:bg-yellow-300 px-3 py-2 rounded-lg transition-colors flex items-center text-sm font-bold border border-black/60"
                        title="End game now"
                    >
                        <Flag size={16} className="mr-2" /> End Game
                    </button>
                </div>

                {/* Team Status Bar */}
                <div
                    className={isMobileViewport
                        ? 'flex-1 grid gap-1.5 items-stretch px-1'
                        : 'flex-1 sm:flex sm:justify-center sm:gap-4 sm:overflow-x-auto sm:overflow-y-hidden sm:no-scrollbar sm:px-3 sm:items-center sm:h-full'}
                    style={isMobileViewport ? { gridTemplateColumns: `repeat(${mobileHeaderColumns}, minmax(0, 1fr))` } : undefined}
                >
                    {teamNames.map((name, idx) => {
                        const isAlive = options.studentPractice || teamLives[idx] > 0;
                        const isActive = idx === activeTeamIndex;
                        return (
                            <div 
                                key={idx} 
                                className={`
                                    relative w-full min-w-0 px-1.5 py-1 sm:px-4 sm:py-3 rounded-xl border-2 transition-all ${mobileUsesTwoRowHeader ? 'h-[46px]' : 'min-h-[52px]'} sm:h-28 sm:w-auto sm:min-w-[150px] flex flex-col items-center justify-center text-center
                                    ${!isAlive ? 'border-slate-800 bg-slate-900/50 opacity-40 grayscale' : 
                                      isActive ? 'border-black bg-yellow-400 text-black shadow-[0_0_28px_rgba(250,204,21,0.55)] z-10 ring-2 ring-black/40' : 
                                      'border-yellow-400/60 bg-black/70 text-yellow-100'}
                                `}
                            >
                                <div className="text-[10px] sm:text-sm font-black uppercase tracking-wider leading-tight mb-0.5 sm:mb-2 text-center truncate w-full">
                                    {name}
                                </div>
                                {options.studentPractice ? (
                                    <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-current">
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
                    <button onClick={() => setIsMuted(!isMuted)} className="text-yellow-100 hover:text-white p-2.5 bg-black/70 hover:bg-black/80 rounded-xl transition-colors border border-yellow-400/60">{isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>
                    <button onClick={toggleFullscreen} className="text-yellow-100 hover:text-white p-2.5 bg-black/70 hover:bg-black/80 rounded-xl transition-colors border border-yellow-400/60">{isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}</button>
                </div>
            </div>

            {/* 2. MAIN ARENA */}
            <div ref={arenaRef} className="flex-1 relative flex flex-col md:flex-row overflow-hidden">
                
                {/* Background Effects */}
                <div className="absolute inset-0 transition-colors duration-200 z-0 overflow-hidden time-bomb-nuclear-bg">
                    {!isExploded ? (
                        <>
                            <div className="absolute left-1/2 bottom-[-18%] h-[34vh] w-[120vw] -translate-x-1/2 rounded-[50%] bg-yellow-200/12 blur-[70px] pointer-events-none" />
                            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                        </>
                    ) : (
                        <div className="absolute inset-0 bg-yellow-500/20 pointer-events-none" />
                    )}
                </div>

                {isExploded && (
                    <div className="pointer-events-none absolute inset-0 z-[420] overflow-hidden">
                        <div className="time-bomb-splat-video-wrap">
                            <video
                                key={`${explosionKey}-video`}
                                className="time-bomb-splat-video"
                                src="/assets/effects/timebomb-radioactive-splat-animation.mp4"
                                autoPlay
                                muted={isMuted}
                                playsInline
                                preload="auto"
                                poster="/assets/effects/timebomb-radioactive-splat.png"
                            />
                            <div className="time-bomb-splat-video-tint" />
                            <div className="time-bomb-video-watermark-cover" />
                        </div>
                    </div>
                )}

                

                {/* INTRO OVERLAY (Centered Full Screen) */}
                {gameState === 'intro' ? (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 bg-lime-950/55 backdrop-blur-sm animate-fade-in">
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
                        <div className="flex-1 min-h-0 p-3 sm:p-4 flex flex-col items-center justify-center relative z-10">
                            <div className="w-full min-h-0 flex-1 flex flex-col items-center justify-center">
                                {!isExploded && gameState === 'play' && (
                                    <div
                                        ref={cardFrameRef}
                                        className="relative w-full max-w-[420px] h-full max-h-full sm:max-w-[560px] sm:h-full sm:max-h-[90vh] md:max-w-6xl md:h-auto md:max-h-full md:aspect-[16/9] [perspective:1000px] overflow-visible"
                                    >
                                        <div className="relative w-full h-full">
                                        
                                        {/* FRONT: QUESTION & CONTROLS */}
                                        <div className={`absolute inset-0 rounded-2xl shadow-2xl overflow-hidden flex-col bg-white border-4 border-yellow-400 ${isFlipped ? 'hidden pointer-events-none' : 'flex'}`}>
                                            <div className="relative z-10 h-[clamp(38px,6.5vh,46px)] sm:h-[clamp(32px,5.5vh,40px)] flex-shrink-0 overflow-visible bg-lime-950 shadow-[inset_0_-6px_12px_rgba(0,0,0,0.28)]">
                                                <RadioactiveSlimeTimer
                                                    isPaused={isPaused || !isTicking}
                                                    progress={Math.max(0, Math.min(1, bombTime / (options.bombDuration || 60)))}
                                                />
                                                <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                                                    <div className="flex items-center justify-center rounded-full border border-yellow-200/85 bg-black/78 px-3 py-0.5 text-yellow-100 font-black tracking-wider text-sm sm:text-lg md:text-xl shadow-[0_0_16px_rgba(0,0,0,0.72),0_0_12px_rgba(250,204,21,0.42)] backdrop-blur-sm ring-1 ring-black/70 [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]">
                                                    <Clock size={isMobileViewport ? 16 : 20} className="mr-2 text-yellow-200 drop-shadow" />
                                                    {formatBombTime(bombTime)}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* CONTENT BODY */}
                                            <div className={`flex-1 min-h-0 flex flex-col px-0 ${hasOptions ? 'pt-3 sm:pt-4 md:pt-6 pb-0' : 'py-3 sm:py-4 md:py-6'} overflow-hidden bg-white relative`}>
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
                                                                <h3
                                                                    ref={questionTextRef}
                                                                    style={questionFontSize ? { fontSize: `${questionFontSize}px`, lineHeight: '1.15' } : undefined}
                                                                    className={`w-full font-display font-bold text-slate-800 leading-tight whitespace-pre-wrap break-normal hyphens-none ${isMobileViewport ? 'text-center' : 'text-left'} ${getQuestionFontSizeClass(currentQuestion?.question || "Loading...")}`}
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
                                                                                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed line-through'
                                                                            : 'bg-slate-50 border-slate-200 text-slate-800 sm:hover:bg-brand-yellow sm:hover:border-yellow-400 sm:hover:text-slate-900 active:scale-95 shadow-sm';
                                                                        return (
                                                                        <button
                                                                            key={i}
                                                                            disabled={isDisabled || isPaused || isResolvingMc}
                                                                            onClick={() => handleMCOptionClick(opt, i)}
                                                                            style={optionFontSize ? { fontSize: `${optionFontSize}px`, lineHeight: '1.2' } : undefined}
                                                                            className={`relative p-4 sm:p-6 rounded-none border font-bold transition-all flex items-center justify-center w-full h-full whitespace-normal break-normal hyphens-none ${uniformSize} ${stateClass} focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0`}
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
                                                            className={`h-44 sm:h-52 md:h-60 w-full rounded-xl object-contain border border-slate-200/70 bg-white shadow-sm ${isMobileViewport ? '' : 'cursor-zoom-in'}`}
                                                        />
                                                        <div
                                                            ref={questionWrapRef}
                                                            className="w-full flex-1 min-h-0 flex items-center justify-center"
                                                        >
                                                            <h3
                                                                ref={questionTextRef}
                                                                style={questionFontSize ? { fontSize: `${questionFontSize}px`, lineHeight: '1.15' } : undefined}
                                                                className={`w-full font-display font-bold text-slate-800 text-center leading-tight whitespace-pre-wrap break-normal hyphens-none ${getQuestionFontSizeClass(currentQuestion?.question || "Loading...")}`}
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
                                                                className={`w-full font-display font-bold text-slate-800 text-center leading-tight whitespace-pre-wrap break-normal hyphens-none ${getQuestionFontSizeClass(currentQuestion?.question || "Loading...")}`}
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
                                                                                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed line-through'
                                                                            : 'bg-slate-50 border-slate-200 text-slate-800 sm:hover:bg-brand-yellow sm:hover:border-yellow-400 sm:hover:text-slate-900 active:scale-95 shadow-sm';
                                                                        return (
                                                                        <button
                                                                            key={i}
                                                                            disabled={isDisabled || isPaused || isResolvingMc}
                                                                            onClick={() => handleMCOptionClick(opt, i)}
                                                                            style={optionFontSize ? { fontSize: `${optionFontSize}px`, lineHeight: '1.2' } : undefined}
                                                                            className={`relative p-4 sm:p-6 rounded-none border font-bold transition-all flex items-center justify-center w-full h-full whitespace-normal break-normal hyphens-none ${uniformSize} ${stateClass} focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0`}
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
                                            <div className={`flex flex-wrap items-center justify-center gap-2 sm:gap-4 px-3 sm:px-4 md:px-8 bg-white border-t border-slate-200 shrink-0 ${hasOptions ? 'py-2 sm:py-2.5' : 'py-3 sm:py-4'}`}>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsPaused(!isPaused)}
                                                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full border-b-4 transition-all flex items-center justify-center font-bold active:border-b-0 active:translate-y-1 ${isPaused ? 'bg-yellow-400 text-slate-950 border-yellow-600' : 'bg-slate-800 text-slate-100 border-slate-950 hover:bg-slate-700'}`}
                                                    title={isPaused ? "Resume" : "Pause"}
                                                >
                                                    {isPaused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
                                                </button>
                                                <button 
                                                    onClick={handlePass}
                                                    disabled={isPaused}
                                                    className="bg-slate-800 text-slate-100 w-[clamp(150px,54%,240px)] sm:w-auto px-4 sm:px-6 py-2 rounded-full font-bold text-sm sm:text-lg hover:bg-slate-700 transition-colors flex items-center justify-center border-b-4 border-slate-950 active:border-b-0 active:translate-y-1 disabled:opacity-50"
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
                                        <div className={`absolute inset-0 rounded-2xl shadow-2xl overflow-hidden flex-col bg-white border-4 border-yellow-400 ${!isFlipped ? 'hidden pointer-events-none' : 'flex'}`}>
                                            <div className="bg-slate-800 text-white h-[clamp(52px,8vh,72px)] sm:h-20 md:h-24 px-3 sm:px-4 border-b border-slate-700 flex justify-between items-center gap-3 shrink-0">
                                                <span className="font-bold uppercase tracking-widest text-[10px] sm:text-sm text-slate-300">Answer</span>
                                                <button onClick={() => setIsFlipped(false)} className="p-2 bg-slate-700 rounded-full text-slate-200 hover:text-white hover:bg-slate-600 transition-colors" title="Back to question">
                                                    <RotateCcw size={20} />
                                                </button>
                                            </div>
                                            
                                            <div ref={answerWrapRef} className="flex-1 min-h-0 flex items-center justify-center p-4 sm:p-6 md:p-8 text-center overflow-hidden bg-white">
                                                <h3
                                                    ref={answerTextRef}
                                                    style={answerFontSize ? { fontSize: `${answerFontSize}px`, lineHeight: '1.15' } : undefined}
                                                    className={`font-display font-bold text-slate-800 leading-tight whitespace-pre-wrap break-words hyphens-none ${getAnswerFontSizeClass(currentQuestion?.answer || "")}`}
                                                >
                                                    {currentQuestion?.answer}
                                                </h3>
                                            </div>
                                            
                                            <div className="p-3 sm:p-4 md:p-6 bg-white border-t border-slate-200 grid grid-cols-[auto_1fr_1fr] gap-2 sm:gap-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsPaused(!isPaused)}
                                                    className={`w-10 h-full min-h-[48px] sm:w-12 rounded-xl border-b-4 transition-all flex items-center justify-center font-bold active:border-b-0 active:translate-y-1 ${isPaused ? 'bg-yellow-400 text-slate-950 border-yellow-600' : 'bg-slate-800 text-slate-100 border-slate-950 hover:bg-slate-700'}`}
                                                    title={isPaused ? "Resume" : "Pause"}
                                                >
                                                    {isPaused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
                                                </button>
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
                <div className="fixed inset-0 z-[500] flex items-center justify-center bg-yellow-950/60 backdrop-blur-md p-4 animate-fade-in">
                    <div className="time-bomb-radioactive-modal text-black p-2 rounded-[2rem] max-w-lg w-full text-center shadow-[0_0_70px_rgba(250,204,21,0.75)] relative overflow-hidden border-4 border-black">
                        <div className="bg-yellow-300/95 border-4 border-black rounded-[1.5rem] p-7 sm:p-10 relative overflow-hidden">
                            <div className="absolute left-0 top-0 h-8 w-full bg-[repeating-linear-gradient(135deg,#facc15_0_18px,#111827_18px_36px)] opacity-90" />
                            <div className="absolute inset-x-0 top-8 h-px bg-yellow-100/80" />
                            <div className="relative z-10 pt-7">
                                <div className="mb-6 relative">
                                    <div className="absolute inset-0 bg-yellow-300 blur-[42px] opacity-60 rounded-full" />
                                    <div className="relative z-10 flex justify-center items-center">
                                        <Radiation size={104} className="text-black animate-[timeBombRadioactivePulse_1.1s_ease-in-out_infinite]" />
                                    </div>
                                </div>
                                <h2 className="time-bomb-radioactive-title font-display font-black mb-4 text-black drop-shadow-[0_2px_0_rgba(250,204,21,0.7)] uppercase">
                                    <span className="block">Radioactive</span>
                                    <span className="block">Explosion</span>
                                </h2>
                                <div className="bg-black/90 rounded-xl p-4 mb-8 border-2 border-yellow-500 shadow-inner">
                                    <p className="text-xl sm:text-2xl text-yellow-100 font-mono tracking-widest uppercase">
                                        {options.studentPractice ? "Time's up!" : `${teamNames[activeTeamIndex]} has lost a life.`}
                                    </p>
                                </div>
                                
                                <button 
                                    onClick={handleContinueAfterExplosion}
                                    className="bg-black text-yellow-300 text-3xl sm:text-4xl font-black py-4 px-12 rounded-full shadow-xl hover:bg-slate-900 transition-transform hover:scale-105 active:scale-95 border-b-4 border-yellow-700 active:border-b-0 active:translate-y-1"
                                >
                                    Continue
                                </button>
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
                                    finishGame();
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

