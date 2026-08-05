import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { GeneratedGame, GameRunOptions } from '../../types';
import { playSound } from '../../utils/gameUtils';
import { resolveGameQuestionImageUrl } from '../../utils/gameImage';
import { WinnerCeremonyHero, WinnerCeremonyStandingsTable } from './shared/WinnerCeremonyHero';
import { PracticeReviewSummary } from './shared/PracticeReviewSummary';
import { ArrowLeft, Clock, ArrowRight, RotateCcw, CheckCircle, XCircle, Plus, Minus, List, Play, Check, Edit2, Volume2, VolumeX, Maximize2, Minimize2, AlertTriangle, Star, X, Flag } from 'lucide-react';

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
        <div className="flex items-center justify-center gap-1.5">
            <div data-testid="pubquiz-score-value" className={`font-black font-mono leading-none tracking-tight transition-all text-white ${className || 'text-5xl'}`}>
                {displayScore}
            </div>
            {diff !== 0 && (
                <div data-testid="pubquiz-score-change" className={`shrink-0 whitespace-nowrap font-black leading-none animate-pulse ${diffClassName || 'text-xl'}
                    ${diff > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
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
    const [selectedStudentAnswers, setSelectedStudentAnswers] = useState<Record<string, string>>({});
    
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
    const [isImageZoomOpen, setIsImageZoomOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const scorebarRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showQuitConfirm, setShowQuitConfirm] = useState(false);
    const [showEndGameConfirm, setShowEndGameConfirm] = useState(false);
    const [scorebarHeight, setScorebarHeight] = useState(140);
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const questionWrapRef = useRef<HTMLDivElement>(null);
    const questionTextRef = useRef<HTMLDivElement>(null);
    const [questionFontSize, setQuestionFontSize] = useState<number | null>(null);
    const answerWrapRef = useRef<HTMLDivElement>(null);
    const answerTextRef = useRef<HTMLDivElement>(null);
    const [answerFontSize, setAnswerFontSize] = useState<number | null>(null);
    const optionGridRef = useRef<HTMLDivElement>(null);
    const optionMeasureRef = useRef<HTMLDivElement>(null);
    const [optionFontSize, setOptionFontSize] = useState<number | null>(null);
    const [resizeTick, setResizeTick] = useState(0);

    // Timer State
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [isTimesUp, setIsTimesUp] = useState(false);
    const timerRef = useRef<any>(null);

    const rounds = game.pubQuizRounds || [];
    const currentRound = currentRoundIndex !== null ? rounds[currentRoundIndex] : null;
    const currentQuestion = currentRound ? currentRound.questions[currentQuestionIndex] : null;
    const hasOptions = !!currentQuestion?.options && currentQuestion.options.length > 0;
    const currentQuestionKey = currentRoundIndex !== null ? `${currentRoundIndex}-${currentQuestionIndex}` : '';
    const selectedStudentAnswer = currentQuestionKey ? selectedStudentAnswers[currentQuestionKey] : undefined;
    const optionKey = currentQuestion?.options?.join('|') || '';
    const questionImageUrl = resolveGameQuestionImageUrl(currentQuestion?.image);
    const questionImageAlt = currentQuestion?.image?.alt || '';

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

    const stripOptionPrefix = (value: string) => value.replace(/^[A-D][.)]\s*/i, '').trim();
    const normalizeAnswerValue = (value: string) => stripOptionPrefix(value).trim().toLowerCase();

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

    useLayoutEffect(() => {
        if (phase !== 'play' || !currentQuestion) {
            setQuestionFontSize(null);
            return;
        }
        const wrap = questionWrapRef.current;
        const textEl = questionTextRef.current;
        if (!wrap || !textEl) return;
        const availableHeight = wrap.clientHeight;
        const availableWidth = textEl.clientWidth;
        if (availableHeight === 0 || availableWidth === 0) return;
        const maxSize = Math.min(hasOptions ? 54 : 72, Math.max(30, Math.floor(window.innerWidth / (hasOptions ? 8 : 7))));
        const minSize = 16;
        let size = maxSize;
        textEl.style.lineHeight = '1.15';
        textEl.style.fontSize = `${size}px`;
        while ((textEl.scrollHeight > availableHeight || textEl.scrollWidth > availableWidth) && size > minSize) {
            size -= 1;
            textEl.style.fontSize = `${size}px`;
        }
        setQuestionFontSize(size);
    }, [isMobileViewport, hasOptions, phase, currentQuestion?.question, currentQuestion?.options?.length, resizeTick]);

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

    useLayoutEffect(() => {
        if (!hasOptions || !currentQuestion?.options || phase !== 'play' || isFlipped) {
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
    }, [hasOptions, optionKey, phase, isFlipped, isMobileViewport, resizeTick]);

    // Body Scroll Lock
    useEffect(() => {
        const shouldLock = phase === 'play' || editingTeamIndex !== null;
        document.body.style.overflow = shouldLock ? 'hidden' : 'auto';
        return () => { document.body.style.overflow = 'auto'; };
    }, [phase, editingTeamIndex]);

    // Timer Effect
    useEffect(() => {
        const hasCheckedStudentOption = options.studentPractice && hasOptions && Boolean(selectedStudentAnswer);
        if (phase === 'play' && !isFlipped && !isTimesUp && !hasCheckedStudentOption) {
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
    }, [phase, isFlipped, isTimesUp, options.timerSeconds, options.studentPractice, hasOptions, selectedStudentAnswer]);

    // Check Time's Up
    useEffect(() => {
        const hasCheckedStudentOption = options.studentPractice && hasOptions && Boolean(selectedStudentAnswer);
        if (timeLeft === 0 && options.timerSeconds > 0 && phase === 'play' && !isFlipped && !isTimesUp && !hasCheckedStudentOption) {
            setIsTimesUp(true);
            playSound('times-up', isMuted, options.soundConfig?.timesUp);
        }
    }, [timeLeft, options.timerSeconds, phase, isFlipped, isTimesUp, isMuted, options.soundConfig, options.studentPractice, hasOptions, selectedStudentAnswer]);

    // Review Mode Reset
    useEffect(() => {
        if (phase === 'review' && currentRound) {
            setRevealedReviewAnswers(Array(currentRound.questions.length).fill(false));
        }
    }, [phase, currentRound]);

    useLayoutEffect(() => {
        const el = scorebarRef.current;
        if (!el) return;

        const update = () => {
            const h = Math.ceil(el.getBoundingClientRect().height);
            if (h > 0) setScorebarHeight(h);
        };

        update();
        const ro = new ResizeObserver(() => update());
        ro.observe(el);
        window.addEventListener('resize', update);
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', update);
        };
    }, [phase, isFullscreen, options.players]);

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
                if (options.studentPractice) {
                    if (currentRoundIndex !== null) {
                        setCompletedRounds(prev => [...prev, currentRoundIndex]);
                    }
                    const nextRoundIndex = rounds.findIndex((_, index) => index !== currentRoundIndex && !completedRounds.includes(index));
                    if (nextRoundIndex >= 0) {
                        startRound(nextRoundIndex);
                    } else {
                        setPhase('gameover');
                    }
                    return;
                }
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

    const handleStudentOptionSelect = (option: string) => {
        if (!options.studentPractice || !currentQuestion || !currentQuestionKey || selectedStudentAnswer) return;

        const isCorrect = normalizeAnswerValue(option) === normalizeAnswerValue(currentQuestion.answer);
        setSelectedStudentAnswers(prev => ({ ...prev, [currentQuestionKey]: option }));
        if (isCorrect) {
            setScores(prev => {
                const next = [...prev];
                next[0] = (next[0] || 0) + 1;
                return next;
            });
            playSound('correct', isMuted, options.soundConfig?.correct);
        } else {
            playSound('incorrect', isMuted, options.soundConfig?.incorrect);
        }
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

    const pubQuizBackgroundStyle = {
        backgroundImage: `linear-gradient(rgba(7, 34, 37, 0.36), rgba(7, 27, 31, 0.52)), url("${isMobileViewport ? '/assets/background/pub-quiz-background-mobile.webp' : '/assets/background/pub-quiz-background.webp'}")`,
        backgroundPosition: isMobileViewport ? 'center top' : 'center center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
    };

    if (phase === 'gameover') {
        if (options.studentPractice) {
            const allQuestions = (game.pubQuizRounds || []).flatMap((round, roundIndex) =>
                (round.questions || []).map((question, questionIndex) => ({
                    id: `${roundIndex}-${questionIndex}`,
                    question: question.question,
                    correctAnswer: question.answer,
                    studentAnswer: selectedStudentAnswers[`${roundIndex}-${questionIndex}`],
                    context: round.name,
                }))
            );
            const correctCount = allQuestions.filter((item) =>
                item.studentAnswer && normalizeAnswerValue(item.studentAnswer) === normalizeAnswerValue(item.correctAnswer)
            ).length;
            const missedItems = allQuestions.filter((item) =>
                !item.studentAnswer || normalizeAnswerValue(item.studentAnswer) !== normalizeAnswerValue(item.correctAnswer)
            );
            return (
                <PracticeReviewSummary
                    playerName={teamNames[0]}
                    correctCount={correctCount}
                    totalCount={allQuestions.length}
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
                className={`${isFullscreen ? 'fixed inset-0 overflow-y-auto overflow-x-hidden' : 'relative min-h-[calc(100vh-4rem)]'} z-[300] bg-[#102b2d] text-white`}
                style={pubQuizBackgroundStyle}
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

    const mainContentAlign = phase === 'home'
        ? 'justify-start pt-16 md:pt-20'
        : phase === 'scoring' || phase === 'review'
            ? 'justify-start pt-4 sm:justify-center sm:pt-6'
            : 'justify-center pt-6';
    const mainContentOverflow = phase === 'home'
        ? 'overflow-visible'
        : phase === 'review'
            ? 'overflow-y-auto'
            : 'overflow-hidden';
    const containerOverflowClass = phase === 'home' ? 'overflow-visible' : 'overflow-hidden';
    const containerHeightClass = isFullscreen
        ? 'h-screen'
        : phase === 'home'
            ? 'min-h-[calc(var(--app-vh,1vh)*100-4rem)]'
            : 'h-[calc(var(--app-vh,1vh)*100-4rem)]';
    const navOffset = isFullscreen ? 0 : 64;
    const questionOverlayTopStyle = { top: `calc(${navOffset + scorebarHeight}px + env(safe-area-inset-top))` };
    const mobileUsesTwoRowHeader = isMobileViewport && scores.length >= 4;
    const mobileHeaderColumns = scores.length >= 5 ? 3 : scores.length === 4 ? 2 : Math.max(scores.length, 1);

    return (
        <div ref={containerRef} className={`bg-[#102b2d] flex flex-col ${containerHeightClass} ${containerOverflowClass} relative transition-colors duration-500`} style={pubQuizBackgroundStyle}>
            
            {/* 1. HEADER (Scoreboard) - Fixed Z-Index */}
            <div ref={scorebarRef} className={`bg-[#e9f2f0] ${mobileUsesTwoRowHeader ? 'px-2 py-1.5 h-[110px]' : 'p-2 min-h-[70px]'} sm:p-4 shrink-0 z-[250] shadow-[0_8px_24px_rgba(5,35,38,0.3)] border-b-2 border-[#6fa8a2] relative sm:min-h-[140px]`}>
                <div className="hidden sm:flex justify-between items-center gap-4">
                    <div className="flex flex-col items-start gap-2 min-w-[140px]">
                        <button 
                            onClick={() => setShowQuitConfirm(true)} 
                            className="w-[140px] justify-center text-[#29464d] hover:text-[#e05245] flex items-center text-sm bg-white hover:bg-[#e1efed] px-4 py-2 rounded-lg transition-colors font-bold border border-[#99beb8]"
                        >
                            <ArrowLeft size={16} className="mr-2" /> Quit
                        </button>
                        <button
                            onClick={() => setShowEndGameConfirm(true)}
                            className="w-[140px] justify-center text-white flex items-center text-sm bg-[#e05245] hover:bg-[#ef6759] px-4 py-2 rounded-lg transition-colors font-bold border border-[#ad3c34]"
                            title="End game now"
                        >
                            <Flag size={16} className="mr-2" /> End Game
                        </button>
                    </div>

                    <div className="flex-1 flex justify-center gap-4 overflow-x-auto no-scrollbar px-4 h-full items-center">
                        {scores.map((score, idx) => (
                            <button 
                                key={idx} 
                                onClick={() => openEditTeam(idx)}
                                className="px-6 py-3 rounded-xl text-center transition-all border-b-4 min-w-[150px] relative group h-28 flex flex-col justify-center items-center shadow-[0_5px_12px_rgba(5,50,52,0.3)] bg-[#126c68] border-[#0b4745] text-white hover:bg-[#16807b] hover:border-[#105957] hover:scale-105 hover:-rotate-1"
                            >
                                <div className="text-lg uppercase font-bold tracking-wider truncate max-w-[130px] mb-1 flex items-center gap-1">
                                    {teamNames[idx]}
                                </div>
                                <AnimatedScore score={score} />
                                <div className="absolute top-2 right-2 bg-white/15 text-[#ffd166] rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Edit2 size={12} />
                                </div>
                            </button>
                        ))}
                    </div>
                    
                    <div className="flex flex-col items-end justify-center min-w-[72px] gap-2">
                        <button 
                            onClick={() => setIsMuted(!isMuted)} 
                            className="text-[#45646a] hover:text-[#126c68] p-3 bg-white hover:bg-[#e1efed] rounded-xl transition-colors border border-[#99beb8]"
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                             {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                        </button>
                        <button onClick={toggleFullscreen} className="text-[#45646a] hover:text-[#126c68] p-3 bg-white hover:bg-[#e1efed] rounded-xl transition-colors border border-[#99beb8]">
                            {isFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
                        </button>
                    </div>
                </div>

                <div className={`flex sm:hidden ${mobileUsesTwoRowHeader ? 'gap-2 items-start' : 'gap-3 items-center'}`}>
                    <div className={`flex shrink-0 ${mobileUsesTwoRowHeader ? 'gap-1' : 'gap-1.5'} ${mobileUsesTwoRowHeader ? 'flex-col items-start' : 'flex-row items-center'}`}>
                        <button 
                            onClick={() => setShowQuitConfirm(true)}
                            className={`${mobileUsesTwoRowHeader ? 'w-[30px] h-[30px] rounded-md' : 'w-9 h-9 rounded-lg'} flex items-center justify-center text-[#45646a] hover:text-[#e05245] bg-white hover:bg-[#e1efed] transition-colors border border-[#99beb8]`}
                            title="Quit"
                        >
                            <X size={mobileUsesTwoRowHeader ? 14 : 17} />
                        </button>
                        <button
                            onClick={() => setShowEndGameConfirm(true)}
                            className={`${mobileUsesTwoRowHeader ? 'w-[30px] h-[30px] rounded-md' : 'w-9 h-9 rounded-lg'} flex items-center justify-center text-white bg-[#e05245] hover:bg-[#ef6759] transition-colors border border-[#ad3c34]`}
                            title="End game now"
                        >
                            <Flag size={mobileUsesTwoRowHeader ? 12 : 14} />
                        </button>
                        <button 
                            onClick={() => setIsMuted(!isMuted)} 
                            className={`${mobileUsesTwoRowHeader ? 'w-[30px] h-[30px] rounded-md' : 'w-9 h-9 rounded-lg'} flex items-center justify-center text-[#45646a] hover:text-[#126c68] bg-white hover:bg-[#e1efed] transition-colors border border-[#99beb8]`}
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                             {isMuted ? <VolumeX size={mobileUsesTwoRowHeader ? 14 : 17} /> : <Volume2 size={mobileUsesTwoRowHeader ? 14 : 17} />}
                        </button>
                    </div>
                    <div
                        className={`flex-1 grid ${mobileUsesTwoRowHeader ? 'gap-1 content-start' : 'gap-1.5'} items-stretch`}
                        style={{ gridTemplateColumns: `repeat(${mobileHeaderColumns}, minmax(0, 1fr))` }}
                    >
                        {scores.map((score, idx) => (
                            <button
                                key={idx}
                                onClick={() => openEditTeam(idx)}
                                className={`w-full min-w-0 ${mobileUsesTwoRowHeader ? 'h-[46px]' : 'h-12'} px-2 py-1 rounded-xl text-center transition-all border-b-4 flex flex-col justify-center items-center shadow-sm bg-[#126c68] border-[#0b4745] text-white`}
                            >
                                <div className="text-[10px] uppercase font-bold tracking-wider truncate w-full text-center">
                                    {teamNames[idx]}
                                </div>
                                <AnimatedScore score={score} className={`${mobileUsesTwoRowHeader ? 'text-base' : 'text-lg'}`} diffClassName="text-[10px] -top-5" />
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
                            <h2 className="text-5xl font-display font-black text-white mb-2 drop-shadow-[0_3px_8px_rgba(0,0,0,0.75)]">Select a Round</h2>
                            <p className="text-[#d9ebe8] font-bold text-lg drop-shadow-md">Choose the next category to play.</p>
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
                                                ? 'bg-[#526468] border-[#33474b] opacity-70 cursor-not-allowed grayscale'
                                                : `bg-[#f8fbfa] border-[#6fa8a2] hover:border-[#e05245] hover:scale-105 hover:shadow-[0_12px_35px_rgba(5,40,43,0.5)]`}`}
                                    >
                                        <div className="flex justify-between items-start mb-6">
                                            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider 
                                                ${isCompleted ? 'bg-[#42575b] text-[#c6d4d2]' : 'bg-[#e05245] text-white'}`}>
                                                Round {idx + 1}
                                            </span>
                                            {isCompleted ? <CheckCircle className="text-[#8fc6aa]" size={32} /> : <Star className="text-[#f3b844] group-hover:scale-110 transition-transform" size={32} fill="currentColor" />}
                                        </div>
                                        <h3 className={`text-4xl font-display font-black mb-2 drop-shadow-sm leading-tight
                                            ${isCompleted ? 'text-[#9babad]' : 'text-[#172d36] group-hover:text-[#126c68]'}`}>
                                            {round.name}
                                        </h3>
                                        <p className="text-[#526c72] font-bold text-lg">
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
                                    className="px-12 py-4 bg-[#f3b844] text-[#17333b] rounded-full font-bold text-2xl hover:bg-[#ffc957] hover:scale-105 transition-transform shadow-lg animate-bounce border-2 border-[#ffe09a]"
                                >
                                    Finish Game & See Winners
                                </button>
                            ) : (
                                <p className="text-[#d9ebe8] italic font-medium drop-shadow-md">Complete all rounds to finish the game.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* INTRO PHASE */}
                {phase === 'intro' && currentRound && (
                    <div className="text-center animate-fade-in max-w-4xl w-full">
                        <h2 className="text-3xl font-bold text-[#ffd166] mb-4 uppercase tracking-widest drop-shadow-lg">Round {currentRoundIndex! + 1}</h2>
                        <h1 className="text-7xl md:text-9xl font-display font-black text-white mb-16 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">{currentRound.name}</h1>
                        <button 
                            onClick={() => { setPhase('play'); setTimeLeft(options.timerSeconds); setIsTimesUp(false); }}
                            className="bg-[#f3b844] text-[#17333b] px-16 py-6 rounded-full font-bold text-3xl hover:bg-[#ffc957] hover:scale-105 hover:shadow-2xl transition-all border-b-8 border-[#b77a16] active:border-b-0 active:translate-y-2 flex items-center mx-auto"
                        >
                            <Play size={32} fill="currentColor" className="mr-4" /> Start
                        </button>
                    </div>
                )}

                {/* REVIEW PHASE */}
                {phase === 'review' && currentRound && (
                    <div className="w-full max-w-6xl h-full min-h-0 flex flex-col animate-fade-in">
                        <div className="text-center mb-3 sm:mb-6">
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-white drop-shadow-lg">Round Review: {currentRound.name}</h2>
                            <p className="text-[#d9ebe8] font-bold text-sm sm:text-base md:text-lg">Review answers before scoring.</p>
                        </div>
                        
                        <div className="flex-1 min-h-0 overflow-y-auto bg-[#f8fbfa] rounded-3xl shadow-2xl border-4 border-[#6fa8a2] p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
                            {currentRound.questions.map((q, idx) => (
                                <div key={idx} className="border-b border-[#c5dad7] pb-4 sm:pb-6 last:border-0">
                                    <div className="flex justify-between items-start mb-2 sm:mb-3">
                                        <span className="bg-[#126c68] text-white w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-lg flex-shrink-0 mr-3 sm:mr-4 shadow-sm">{idx + 1}</span>
                                        <p className="font-bold text-base sm:text-xl md:text-2xl text-[#172d36] flex-1 leading-tight">{q.question}</p>
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
                                                className="text-sm sm:text-base font-bold text-[#126c68] hover:text-white hover:bg-[#126c68] border-2 border-[#126c68] px-3 sm:px-4 py-2 rounded-lg transition-colors mt-2"
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
                                className="px-4 sm:px-6 py-2 sm:py-3 bg-white text-[#29464d] rounded-xl font-bold text-sm sm:text-base hover:bg-[#e1efed] shadow-lg transition-transform hover:scale-105 border border-[#99beb8]"
                            >
                                Reveal All
                            </button>
                            <button 
                                onClick={() => setPhase('scoring')}
                                className="px-5 sm:px-6 py-2 sm:py-3 bg-[#f3b844] text-[#17333b] rounded-xl font-bold text-sm sm:text-base hover:bg-[#ffc957] shadow-lg transition-transform hover:scale-105"
                            >
                                Go to Scoring
                            </button>
                        </div>
                    </div>
                )}

                {/* SCORING PHASE */}
                {phase === 'scoring' && (
                    <div className="w-full max-w-2xl bg-[#f8fbfa] rounded-2xl shadow-2xl p-4 sm:p-8 animate-fade-in border-4 border-[#6fa8a2] flex flex-col h-full max-h-full sm:h-auto sm:max-h-none min-h-0">
                        <h2 className="text-2xl sm:text-4xl font-display font-bold text-[#172d36] text-center mb-2">Round Complete!</h2>
                        <p className="text-center text-[#526c72] mb-4 sm:mb-8 text-sm sm:text-lg font-medium">Enter points for this round.</p>
                        <div className="space-y-3 sm:space-y-4 overflow-y-auto pr-1 sm:pr-0 flex-1 min-h-0">
                            {scores.map((score, i) => (
                                <div key={i} className="flex items-center justify-between p-3 sm:p-4 bg-white rounded-xl border border-[#b9d2cf]">
                                    <div className="font-bold text-base sm:text-xl text-[#29464d] w-1/3 truncate">{teamNames[i]}</div>
                                    <div className="font-mono font-bold text-2xl sm:text-3xl text-[#126c68] w-1/3 text-center">{score}</div>
                                    <div className="flex items-center gap-2 w-1/3 justify-end">
                                        <button 
                                            onClick={() => handleScoreUpdate(i, -1)}
                                            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white border-2 border-[#b9d2cf] rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors"
                                        >
                                            <Minus size={20} className="sm:w-6 sm:h-6" />
                                        </button>
                                        <button 
                                            onClick={() => handleScoreUpdate(i, 1)}
                                            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white border-2 border-[#b9d2cf] rounded-lg hover:bg-green-50 hover:text-green-600 hover:border-green-300 transition-colors"
                                        >
                                            <Plus size={20} className="sm:w-6 sm:h-6" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button 
                            onClick={finishRound}
                            className="w-full mt-4 sm:mt-8 py-3 sm:py-4 bg-[#126c68] text-white rounded-xl font-bold text-base sm:text-xl hover:bg-[#16807b] transition-all shadow-md flex items-center justify-center"
                        >
                            Return to Dashboard <ArrowRight className="ml-2" />
                        </button>
                    </div>
                )}
            </div>

            {/* TEAM EDIT MODAL */}
            {editingTeamIndex !== null && (
                <div data-testid="pubquiz-team-edit-modal" className="fixed inset-0 z-[700] flex items-center justify-center bg-[#09282a]/70 backdrop-blur-sm p-4">
                    <div className="bg-[#f8fbfa] p-4 sm:p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-fade-in border-2 border-[#6fa8a2]">
                        <h3 className="text-lg sm:text-xl font-bold text-[#172d36] mb-3 sm:mb-4">Edit Team Details</h3>
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Team Name</label>
                            <input 
                                type="text" 
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full p-2.5 sm:p-3 border border-[#99beb8] bg-white rounded-lg focus:ring-2 focus:ring-[#126c68] outline-none font-bold text-base sm:text-lg text-[#172d36]"
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
                                className="flex-1 py-3 bg-[#126c68] text-white font-bold rounded-lg hover:bg-[#16807b]"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PLAY PHASE: QUESTION CARD MODAL */}
            {phase === 'play' && currentQuestion && (
                <div data-testid="pubquiz-question-overlay" style={questionOverlayTopStyle} className="fixed inset-x-0 bottom-0 z-[500] flex items-center justify-center bg-[#09282a]/40 backdrop-blur-[2px] p-3 sm:p-4 animate-fade-in overflow-hidden">
                    <div className="w-full max-w-[420px] h-full max-h-full sm:max-w-[560px] sm:h-full sm:max-h-[90vh] md:max-w-6xl md:h-auto md:max-h-full md:aspect-[16/9] [perspective:1000px]">
                        <div className={`relative w-full h-full transition-all duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                            
                            {/* FRONT */}
                            <div className={`absolute inset-0 [backface-visibility:hidden] [transform:translateZ(0)] rounded-2xl shadow-[0_24px_70px_rgba(4,28,31,0.6)] overflow-hidden flex flex-col h-full bg-[#f8fbfa] border border-[#6fa8a2] ${isFlipped ? 'pointer-events-none' : ''}`}>
                                {/* Header */}
                                <div className="bg-[#126c68] text-white p-3 sm:p-3 md:p-4 flex justify-between items-center h-[clamp(72px,12vh,96px)] sm:h-20 md:h-24 flex-shrink-0 relative z-10 border-b-2 border-[#f3b844]">
                                    <div className="font-bold text-lg sm:text-xl md:text-2xl opacity-90 truncate max-w-[55%]">{currentRound?.name}</div>
                                    <div className="bg-[#ffd166] text-[#17333b] px-3 py-1 rounded-full font-black text-lg sm:text-xl md:text-2xl shadow-inner">Q{currentQuestionIndex + 1}</div>
                                    <div className="font-bold text-sm sm:text-base md:text-xl opacity-80 text-right">{currentRound?.questions.length} Total</div>
                                </div>

                                {/* Body */}
                                <div className={`bg-[#f8fbfa] flex-grow w-full flex flex-col px-0 ${hasOptions ? 'pt-3 sm:pt-4 md:pt-6 pb-0' : 'py-3 sm:py-4 md:py-6'} relative overflow-hidden z-0`}>
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
                                                    className={`font-display font-bold text-[#172d36] leading-tight w-full whitespace-pre-wrap break-normal hyphens-none ${isMobileViewport ? 'text-center' : 'text-left'} ${getQuestionFontSizeClass(currentQuestion.question)}`}
                                                    >
                                                        {currentQuestion.question}
                                                    </div>
                                                </div>
                                            </div>

                                            {hasOptions && !isFlipped && (
                                                <div
                                                    className="w-full flex-1 min-h-0 mt-2 sm:mt-4 md:mt-6 flex-shrink-0 relative z-10 overflow-hidden"
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
                                                                const isSelected = selectedStudentAnswer === opt;
                                                                const isCorrect = normalizeAnswerValue(opt) === normalizeAnswerValue(currentQuestion.answer);
                                                                const studentOptionClass = options.studentPractice
                                                                    ? selectedStudentAnswer
                                                                        ? isSelected
                                                                            ? isCorrect
                                                                                ? 'bg-emerald-100 border-emerald-400 text-emerald-800'
                                                                                : 'bg-red-100 border-red-400 text-red-800'
                                                                            : isCorrect
                                                                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                                                            : 'bg-[#e6f0ee] border-[#b9d2cf] text-[#61767b]'
                                                                        : 'bg-white border-[#b9d2cf] text-[#213a43] hover:bg-[#e4f2f0] hover:border-[#e05245] cursor-pointer'
                                                                    : 'bg-white border-[#b9d2cf] text-[#213a43]';
                                                                return (
                                                                    <button
                                                                        type="button"
                                                                        key={i}
                                                                        onClick={() => handleStudentOptionSelect(opt)}
                                                                        disabled={!options.studentPractice || Boolean(selectedStudentAnswer)}
                                                                        style={optionFontSize ? { fontSize: `${optionFontSize}px`, lineHeight: '1.2' } : undefined}
                                                                        className={`relative p-3 sm:p-4 md:p-5 border-2 rounded-none font-bold text-center flex items-center justify-center w-full h-full whitespace-normal break-normal hyphens-none transition-colors disabled:cursor-default ${studentOptionClass} ${uniformSize}`}
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
                                                    className={`font-display font-bold text-[#172d36] leading-tight text-center w-full whitespace-pre-wrap break-normal hyphens-none ${getQuestionFontSizeClass(currentQuestion.question)}`}
                                                >
                                                    {currentQuestion.question}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col flex-1 min-h-0">
                                            <div ref={questionWrapRef} className={`w-full flex-1 min-h-0 flex flex-col items-center overflow-hidden px-4 sm:px-6 md:px-8 ${hasOptions ? 'justify-start mb-1 sm:mb-3' : 'justify-center'}`}>
                                                <div
                                                    ref={questionTextRef}
                                                    style={questionFontSize ? { fontSize: `${questionFontSize}px`, lineHeight: '1.15' } : undefined}
                                                    className={`font-display font-bold text-[#172d36] leading-tight text-center w-full whitespace-pre-wrap break-normal hyphens-none ${getQuestionFontSizeClass(currentQuestion.question)}`}
                                                >
                                                    {currentQuestion.question}
                                                </div>
                                            </div>
                                            {/* Options */}
                                            {hasOptions && !isFlipped && (
                                                <div className="w-full flex-1 min-h-0 mt-2 sm:mt-4 md:mt-6 flex-shrink-0 relative z-10 overflow-hidden">
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
                                                                const isSelected = selectedStudentAnswer === opt;
                                                                const isCorrect = normalizeAnswerValue(opt) === normalizeAnswerValue(currentQuestion.answer);
                                                                const studentOptionClass = options.studentPractice
                                                                    ? selectedStudentAnswer
                                                                        ? isSelected
                                                                            ? isCorrect
                                                                                ? 'bg-emerald-100 border-emerald-400 text-emerald-800'
                                                                                : 'bg-red-100 border-red-400 text-red-800'
                                                                            : isCorrect
                                                                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                                                            : 'bg-[#e6f0ee] border-[#b9d2cf] text-[#61767b]'
                                                                        : 'bg-white border-[#b9d2cf] text-[#213a43] hover:bg-[#e4f2f0] hover:border-[#e05245] cursor-pointer'
                                                                    : 'bg-white border-[#b9d2cf] text-[#213a43]';
                                                                return (
                                                                    <button
                                                                        type="button"
                                                                        key={i}
                                                                        onClick={() => handleStudentOptionSelect(opt)}
                                                                        disabled={!options.studentPractice || Boolean(selectedStudentAnswer)}
                                                                        style={optionFontSize ? { fontSize: `${optionFontSize}px`, lineHeight: '1.2' } : undefined}
                                                                        className={`relative p-3 sm:p-4 md:p-5 border-2 rounded-none font-bold text-center flex items-center justify-center w-full h-full whitespace-normal break-normal hyphens-none transition-colors disabled:cursor-default ${studentOptionClass} ${uniformSize}`}
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

                                {/* Footer */}
                                <div className="flex flex-col relative flex-shrink-0 z-50 bg-[#f8fbfa] px-0 border-t border-[#b9d2cf]">
                                    <div className="w-full flex-1 flex items-center justify-between gap-3 px-3 sm:px-4 md:px-8 py-2 sm:py-3">
                                        {!(options.studentPractice && hasOptions) ? (
                                            <button
                                                onClick={() => setIsFlipped(true)}
                                                className="bg-[#e05245] text-white px-4 sm:px-6 py-2 rounded-full font-bold text-sm sm:text-lg md:text-2xl shadow-lg hover:bg-[#ef6759] hover:scale-105 transition-transform flex items-center relative z-50 border-2 border-[#ad3c34]"
                                            >
                                                Reveal Answer
                                            </button>
                                        ) : (
                                            <div className="text-xs sm:text-sm md:text-base font-bold text-slate-500">
                                                Choose an option to check your answer
                                            </div>
                                        )}

                                        <button 
                                            onClick={handleNextQuestion}
                                            className="text-[#29464d] font-bold text-xs sm:text-base md:text-xl hover:bg-[#e1efed] px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center relative z-50"
                                        >
                                            <span className="sm:hidden">Next</span>
                                            <span className="hidden sm:inline">Go to next question</span>
                                            <ArrowRight size={16} className="ml-2 md:w-6 md:h-6" />
                                        </button>
                                    </div>

                                    {options.timerSeconds > 0 && (
                                        <div className="relative h-[clamp(24px,4.5vh,32px)] bg-[#dcebea] overflow-hidden flex items-center justify-start pointer-events-none border-t border-[#99beb8]">
                                            {!isTimesUp && (
                                                <div className="absolute inset-y-0 left-0 bg-[#f3b844] transition-all duration-1000" style={{ width: `${(timeLeft / options.timerSeconds) * 100}%` }} />
                                            )}
                                            <div className="absolute inset-0 flex items-center justify-center text-[10px] sm:text-base md:text-lg font-black text-[#17333b] tracking-wider">
                                                {isTimesUp ? "TIME'S UP!" : (
                                                    <><Clock size={12} className="mr-1" /> {timeLeft}s</>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* BACK (Answer) */}
                            <div className={`absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full bg-[#f8fbfa] border border-[#6fa8a2] ${!isFlipped ? 'pointer-events-none' : ''}`}>
                                <div className="bg-[#0f5555] text-white p-3 md:p-4 flex justify-between items-center h-20 md:h-24 flex-shrink-0 relative z-10 border-b-2 border-[#f3b844]">
                                    <div className="font-bold text-lg sm:text-xl md:text-2xl opacity-80">Answer</div>
                                    <button onClick={() => setIsFlipped(false)} className="p-2 bg-white rounded-full hover:bg-[#e1efed] text-[#29464d]" title="Flip Back"><RotateCcw size={20} className="md:w-6 md:h-6" /></button>
                                </div>

                                <div className="flex-grow flex flex-col items-center justify-center p-4 md:p-8 bg-[#f8fbfa] text-center overflow-hidden w-full relative z-0">
                                    <div ref={answerWrapRef} className="flex-1 overflow-hidden flex flex-col items-center justify-center w-full min-h-0 px-2 py-2">
                                        <div
                                            ref={answerTextRef}
                                            style={answerFontSize ? { fontSize: `${answerFontSize}px`, lineHeight: '1.15' } : undefined}
                                            className={`font-display font-bold text-[#172d36] leading-snug whitespace-pre-wrap break-words hyphens-none ${getAnswerFontSizeClass(currentQuestion.answer)}`}
                                        >
                                            {currentQuestion.answer}
                                        </div>
                                    </div>
                                    
                                    {/* IMMEDIATE SCORING PANEL */}
                                    {!options.studentPractice && (
                                    <div className="mt-3 w-full bg-[#e6f0ee] rounded-2xl p-3 md:p-4 border-2 border-[#b9d2cf] flex-shrink-0 relative z-10">
                                        <h4 className="text-xs md:text-sm font-bold text-[#61767b] uppercase mb-2 md:mb-3 tracking-widest">Quick Score (+1 Point)</h4>
                                        <div className="flex flex-wrap justify-center gap-2 md:gap-3">
                                            {scores.map((s, i) => (
                                                <button 
                                                    key={i}
                                                    onClick={(e) => { e.stopPropagation(); handleScoreUpdate(i, 1); }}
                                                    className="px-3 md:px-4 py-1.5 md:py-2 bg-white border border-[#99beb8] rounded-lg text-[#29464d] text-xs md:text-sm font-bold hover:bg-[#eef8f1] hover:border-green-400 hover:text-green-700 transition-all shadow-sm active:scale-95 flex items-center"
                                                >
                                                    {teamNames[i]} <Plus size={14} className="ml-1" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    )}
                                </div>

                                <div className="h-20 md:h-24 flex flex-shrink-0 relative z-50">
                                    <button 
                                        onClick={handleNextQuestion}
                                        className="flex-1 bg-[#e05245] text-white font-bold text-base sm:text-lg md:text-2xl hover:bg-[#ef6759] transition-colors flex items-center justify-center"
                                    >
                                        Go to next question <ArrowRight size={18} className="ml-2 md:w-6 md:h-6" />
                                    </button>
                                </div>
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
        </div>
    );
};

