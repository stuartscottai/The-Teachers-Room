import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { GeneratedGame, GameRunOptions, GeneratedQuestion } from '../../types';
import { playSound } from '../../utils/gameUtils';
import { resolveGameImageUrl } from '../../utils/gameImage';
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    Edit2,
    Maximize2,
    Minimize2,
    RefreshCw,
    Trophy,
    Volume2,
    VolumeX,
    X,
    XCircle,
} from 'lucide-react';

interface WordWheelGameProps {
    game: GeneratedGame;
    options: GameRunOptions;
    onBack: () => void;
    onFinish: () => void;
    onReplay: () => void;
}

type WheelStatus = 'pending' | 'passed' | 'solved' | 'missed';
type CardState = 'hidden' | 'question' | 'answer';
type RevealKind = 'correct' | 'incorrect' | 'passed' | 'timeout';

interface WheelEntry {
    id: number;
    letter: string;
    question: string;
    answer: string;
    answerAliases: string[];
    points: number;
    status: WheelStatus;
    passedByTeams: number[];
    solvedBy?: number;
    image?: GeneratedQuestion['image'];
}

interface RevealState {
    kind: RevealKind;
    answer?: string;
    revealAnswer?: boolean;
    gained?: number;
    speedBonus?: number;
    penalty?: number;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const CONTAINS_HARD_LETTERS = new Set(['Q', 'V', 'X', 'Y', 'Z']);

const getLetterRelation = (rule: 'starts-with' | 'contains-hard', letter: string) => {
    if (rule === 'contains-hard' && CONTAINS_HARD_LETTERS.has(letter)) return 'contains';
    return 'starts-with';
};

const normalizeText = (text: string) =>
    text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const normalizeAnswer = (text: string) => normalizeText(text).replace(/^(a|an|the)\s+/i, '');

const singularize = (text: string) => {
    if (text.endsWith('ies') && text.length > 3) return `${text.slice(0, -3)}y`;
    if (text.endsWith('es') && text.length > 3) return text.slice(0, -2);
    if (text.endsWith('s') && text.length > 2) return text.slice(0, -1);
    return text;
};

const matchesEntry = (entry: WheelEntry, guess: string) => {
    const normalizedGuess = normalizeAnswer(guess);
    if (!normalizedGuess) return false;
    const guessSingular = singularize(normalizedGuess);

    const candidates = [entry.answer, ...(entry.answerAliases || [])]
        .map((value) => normalizeAnswer(value))
        .filter(Boolean);

    return candidates.some((candidate) => {
        if (candidate === normalizedGuess) return true;
        const candidateSingular = singularize(candidate);
        return candidateSingular === guessSingular;
    });
};

const getDefaultTeamNames = (count: number) =>
    Array.from({ length: count }, (_, index) => (count === 1 ? 'Player 1' : `Team ${index + 1}`));

const appendPassByTeam = (entry: WheelEntry, teamIndex: number) => {
    const unique = new Set(entry.passedByTeams || []);
    unique.add(teamIndex);
    return Array.from(unique);
};

const hasBeenPassedByAllTeams = (entry: WheelEntry, teamCount: number) => {
    if (!entry || teamCount <= 0) return false;
    const unique = new Set(entry.passedByTeams || []);
    return unique.size >= teamCount;
};

const buildEntries = (questions: GeneratedQuestion[]): WheelEntry[] => {
    const byLetter = new Map<string, GeneratedQuestion>();

    (questions || []).forEach((question, index) => {
        const explicit = (question.letter || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 1);
        const fallback = (question.answer || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 1);
        const letter = explicit || LETTERS[index] || fallback || '';
        if (!LETTERS.includes(letter)) return;
        if (byLetter.has(letter)) return;
        byLetter.set(letter, question);
    });

    return LETTERS.map((letter, index) => {
        const source = byLetter.get(letter);
        const question = (source?.question || '').trim();
        const answer = (source?.answer || '').trim();
        const aliases = Array.isArray(source?.answerAliases)
            ? source.answerAliases.map((value) => String(value || '').trim()).filter(Boolean)
            : [];
        const playable = Boolean(question && answer);

        return {
            id: index,
            letter,
            question,
            answer,
            answerAliases: aliases,
            points: Number(source?.points) > 0 ? Number(source.points) : 10,
            status: playable ? 'pending' : 'missed',
            passedByTeams: [],
            image: source?.image,
        };
    });
};

const findNextPlayableIndex = (entries: WheelEntry[], startIndex: number) => {
    if (!entries.length) return -1;
    for (let offset = 1; offset <= entries.length; offset += 1) {
        const idx = (startIndex + offset + entries.length) % entries.length;
        const status = entries[idx]?.status;
        if (status === 'pending' || status === 'passed') return idx;
    }
    return -1;
};

const getCircularDistance = (from: number, to: number, total: number) => {
    let diff = to - from;
    const half = Math.floor(total / 2);
    if (diff > half) diff -= total;
    if (diff < -half) diff += total;
    return diff;
};

const getWheelBallSize = (abs: number) => {
    const mainSize = 176;
    const nearSize = Math.round(mainSize * 0.75); // +/-1 letters are 75% of center
    if (abs === 0) return mainSize;
    if (abs === 1) return nearSize;
    if (abs === 2) return 112;
    if (abs === 3) return 96;
    if (abs === 4) return 84;
    return 72;
};

const getWheelBallFont = (abs: number) => {
    if (abs === 0) return 80;
    if (abs === 1) return 60;
    if (abs === 2) return 48;
    if (abs === 3) return 40;
    return 34;
};

const interpolateStops = (distance: number, stops: number[]) => {
    if (distance <= 0) return stops[0];
    const maxIndex = stops.length - 1;
    if (distance >= maxIndex) return stops[maxIndex];

    const lower = Math.floor(distance);
    const upper = Math.min(maxIndex, lower + 1);
    const mix = distance - lower;

    return stops[lower] + (stops[upper] - stops[lower]) * mix;
};

const getWheelBallSizeSmooth = (distance: number) => interpolateStops(distance, [176, 132, 112, 96, 84, 72, 72]);
const getWheelBallFontSmooth = (distance: number) => interpolateStops(distance, [80, 60, 48, 40, 34, 32, 32]);

const getCircularDistanceFloat = (from: number, to: number, total: number) => {
    let diff = to - from;
    const half = total / 2;
    if (diff > half) diff -= total;
    if (diff < -half) diff += total;
    return diff;
};

const normalizeWheelAnchor = (value: number, total: number) => {
    if (total <= 0) return 0;
    return ((value % total) + total) % total;
};

const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3);

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const WHEEL_SPIN_DELAY_MS = 180;
const LETTER_POP_MS = 340;
const WHEEL_SPIN_DURATION_MS = 760;
const LETTER_PULSE_MS = 1700;

export const WordWheelGame: React.FC<WordWheelGameProps> = ({ game, options, onBack, onFinish, onReplay }) => {
    const teamCount = Math.max(1, Math.min(4, options.players || 1));
    const initialTeamNames = useMemo(() => {
        const provided = (options.teamNames || []).slice(0, teamCount);
        if (provided.length === teamCount) return provided;
        const defaults = getDefaultTeamNames(teamCount);
        return defaults.map((fallback, index) => provided[index] || fallback);
    }, [options.teamNames, teamCount]);

    const initialEntries = useMemo(() => buildEntries(game.questions || []), [game.questions]);
    const initialIndex = useMemo(() => findNextPlayableIndex(initialEntries, -1), [initialEntries]);

    const [entries, setEntries] = useState<WheelEntry[]>(initialEntries);
    const [scores, setScores] = useState<number[]>(() => Array(teamCount).fill(0));
    const [teamNames, setTeamNames] = useState<string[]>(() => [...initialTeamNames]);
    const [currentTeam, setCurrentTeam] = useState(0);
    const [activeIndex, setActiveIndex] = useState(initialIndex);
    const [wheelAnchor, setWheelAnchor] = useState(initialIndex >= 0 ? initialIndex : 0);
    const [isWheelSpinning, setIsWheelSpinning] = useState(false);
    const [input, setInput] = useState('');
    const [phase, setPhase] = useState<'play' | 'gameover'>('play');
    const [isMuted, setIsMuted] = useState(Boolean(options.muted));
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showQuitConfirm, setShowQuitConfirm] = useState(false);
    const [editingTeamIndex, setEditingTeamIndex] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editScore, setEditScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(options.timerSeconds > 0 ? options.timerSeconds : 0);
    const [cardState, setCardState] = useState<CardState>('hidden');
    const [isFlipped, setIsFlipped] = useState(false);
    const [revealState, setRevealState] = useState<RevealState | null>(null);
    const [hasStartedWheel, setHasStartedWheel] = useState(false);
    const [poppingLetterIndex, setPoppingLetterIndex] = useState<number | null>(null);
    const [wheelTrackWidth, setWheelTrackWidth] = useState(0);
    const [wheelTrackHeight, setWheelTrackHeight] = useState(0);
    const [headerHeight, setHeaderHeight] = useState(88);
    const [isMobileViewport, setIsMobileViewport] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth < 768 : false
    );
    const [mobileQuestionFontSize, setMobileQuestionFontSize] = useState<number | null>(null);
    const [questionResizeTick, setQuestionResizeTick] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const wheelTrackRef = useRef<HTMLDivElement>(null);
    const questionWrapRef = useRef<HTMLDivElement>(null);
    const questionTextRef = useRef<HTMLParagraphElement>(null);
    const spinTimeoutRef = useRef<number | null>(null);
    const spinFrameRef = useRef<number | null>(null);
    const popTimeoutRef = useRef<number | null>(null);

    const scoringMode = options.wordWheelScoringMode || game.config.wordWheelScoringMode || 'classic';
    const letterRule = options.wordWheelLetterRule || game.config.wordWheelLetterRule || 'contains-hard';
    const hasTimer = options.timerSeconds > 0;
    const activeEntry = activeIndex >= 0 ? entries[activeIndex] : null;
    const activeRelation = activeEntry ? getLetterRelation(letterRule, activeEntry.letter) : 'starts-with';
    const activeRelationHeader = activeRelation === 'contains' ? 'Contains the letter' : 'Starts with the letter';
    const solvedCount = entries.filter((entry) => entry.status === 'solved').length;
    const cardOverlayTop = Math.max(0, headerHeight);
    const clearWheelMotionTimeouts = () => {
        if (spinTimeoutRef.current !== null) {
            window.clearTimeout(spinTimeoutRef.current);
            spinTimeoutRef.current = null;
        }
        if (spinFrameRef.current !== null) {
            window.cancelAnimationFrame(spinFrameRef.current);
            spinFrameRef.current = null;
        }
        if (popTimeoutRef.current !== null) {
            window.clearTimeout(popTimeoutRef.current);
            popTimeoutRef.current = null;
        }
        setIsWheelSpinning(false);
    };
    const startWheelSpin = (nextIndex: number, nextTeam: number) => {
        const total = entries.length;
        if (!total) return;

        const fromAnchor = normalizeWheelAnchor(wheelAnchor, total);
        const delta = getCircularDistanceFloat(fromAnchor, nextIndex, total);
        const toAnchor = fromAnchor + delta;
        const duration = WHEEL_SPIN_DURATION_MS + Math.max(0, Math.abs(delta) - 1) * 90;
        const startTime = performance.now();

        setIsWheelSpinning(true);
        setPoppingLetterIndex(null);

        const tick = (now: number) => {
            const progress = Math.min(1, (now - startTime) / duration);
            const eased = easeOutCubic(progress);
            const currentAnchor = fromAnchor + (toAnchor - fromAnchor) * eased;
            setWheelAnchor(currentAnchor);

            if (progress < 1) {
                spinFrameRef.current = window.requestAnimationFrame(tick);
                return;
            }

            const normalizedNext = normalizeWheelAnchor(nextIndex, total);
            setWheelAnchor(normalizedNext);
            setCurrentTeam(nextTeam);
            setActiveIndex(nextIndex);
            setIsWheelSpinning(false);
            setPoppingLetterIndex(nextIndex);

            popTimeoutRef.current = window.setTimeout(() => {
                setPoppingLetterIndex((prev) => (prev === nextIndex ? null : prev));
                popTimeoutRef.current = null;
            }, LETTER_POP_MS);

            spinFrameRef.current = null;
        };

        spinFrameRef.current = window.requestAnimationFrame(tick);
    };
    const wheelRingEntries = useMemo(() => {
        if (!entries.length) return [];

        const anchor = entries.length ? normalizeWheelAnchor(wheelAnchor, entries.length) : 0;
        const total = entries.length;
        const width = Math.max(320, wheelTrackWidth || 0);
        const height = Math.max(280, wheelTrackHeight || 0);
        const frontSize = width >= 1200 ? 176 : width >= 900 ? 164 : width >= 720 ? 146 : 126;
        const frontBase = getWheelBallSizeSmooth(0) || 176;
        const baseScale = frontSize / frontBase;
        const radiusX = Math.max(108, width / 2 - Math.max(24, frontSize * 0.48));
        const radiusY = clamp(height * 0.24, 64, 160);
        const centerY = clamp(height * 0.42, frontSize * 0.45, height - frontSize * 0.62);

        return entries
            .map((entry, index) => {
                const rel = getCircularDistanceFloat(anchor, index, total);
                const angle = (-rel / total) * Math.PI * 2 + Math.PI / 2; // active letter at front, clockwise alphabetical order
                const x = Math.cos(angle);
                const y = Math.sin(angle);
                const depth = (y + 1) / 2; // 0 back -> 1 front
                const absRel = Math.abs(rel);
                const focusSize = getWheelBallSizeSmooth(absRel) * baseScale;
                const size = Math.max(24, focusSize * (0.42 + depth * 0.58));
                const isActive = isWheelSpinning ? absRel < 0.5 : index === activeIndex;
                const finalSize = size * (isActive ? 1.04 : 1);
                const focusFont = getWheelBallFontSmooth(absRel) * baseScale;
                const font = Math.max(12, focusFont * (0.34 + depth * 0.66) * (isActive ? 1.04 : 1));
                const leftPx = width / 2 + x * radiusX;
                const topPx = centerY + y * radiusY;
                const opacity = 0.24 + depth * 0.76;
                const zIndex = Math.round(30 + depth * 140 + (isActive ? 300 : 0));

                return {
                    entry,
                    index,
                    isActive,
                    leftPx,
                    topPx,
                    size: finalSize,
                    font,
                    opacity,
                    zIndex,
                };
            })
            .sort((a, b) => a.zIndex - b.zIndex);
    }, [entries, activeIndex, isWheelSpinning, wheelAnchor, wheelTrackWidth, wheelTrackHeight]);

    const ranking = useMemo(
        () =>
            scores
                .map((score, index) => ({ index, score, name: teamNames[index] }))
                .sort((a, b) => b.score - a.score),
        [scores, teamNames]
    );

    const winnerScore = ranking.length ? ranking[0].score : 0;
    const winners = ranking.filter((team) => team.score === winnerScore);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    useEffect(() => {
        const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    useEffect(() => {
        const updateViewport = () => setIsMobileViewport(window.innerWidth < 768);
        updateViewport();
        window.addEventListener('resize', updateViewport);
        return () => window.removeEventListener('resize', updateViewport);
    }, []);

    useEffect(() => {
        return () => {
            if (spinTimeoutRef.current !== null) {
                window.clearTimeout(spinTimeoutRef.current);
                spinTimeoutRef.current = null;
            }
            if (spinFrameRef.current !== null) {
                window.cancelAnimationFrame(spinFrameRef.current);
                spinFrameRef.current = null;
            }
            if (popTimeoutRef.current !== null) {
                window.clearTimeout(popTimeoutRef.current);
                popTimeoutRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const node = wheelTrackRef.current;
        if (!node) return;

        const update = () => {
            setWheelTrackWidth(node.clientWidth || 0);
            setWheelTrackHeight(node.clientHeight || 0);
        };
        update();

        const observer = new ResizeObserver(() => update());
        observer.observe(node);

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const node = headerRef.current;
        if (!node) return;

        const update = () => setHeaderHeight(node.clientHeight || 88);
        update();

        const observer = new ResizeObserver(() => update());
        observer.observe(node);

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const node = questionWrapRef.current;
        if (!node) return;

        const observer = new ResizeObserver(() => setQuestionResizeTick((prev) => prev + 1));
        observer.observe(node);

        return () => observer.disconnect();
    }, [cardState, isFlipped, activeEntry?.id]);

    useLayoutEffect(() => {
        if (!isMobileViewport || cardState !== 'question' || isFlipped || !activeEntry) {
            setMobileQuestionFontSize(null);
            return;
        }

        const wrap = questionWrapRef.current;
        const textEl = questionTextRef.current;
        if (!wrap || !textEl) return;

        const availableHeight = wrap.clientHeight;
        const availableWidth = textEl.clientWidth || wrap.clientWidth;
        if (availableHeight <= 0 || availableWidth <= 0) return;

        const minSize = 28;
        const maxFromWidth = Math.floor(availableWidth / 6.3);
        const maxSize = Math.max(minSize, Math.min(64, maxFromWidth));
        let size = maxSize;

        textEl.style.lineHeight = '1.14';
        textEl.style.fontSize = `${size}px`;

        while ((textEl.scrollHeight > availableHeight || textEl.scrollWidth > availableWidth) && size > minSize) {
            size -= 1;
            textEl.style.fontSize = `${size}px`;
        }

        setMobileQuestionFontSize(size);
    }, [
        isMobileViewport,
        cardState,
        isFlipped,
        activeEntry?.id,
        activeEntry?.question,
        activeEntry?.image?.url,
        activeEntry?.image?.thumbUrl,
        questionResizeTick,
    ]);

    useEffect(() => {
        if (phase !== 'play') return;
        if (activeIndex !== -1) return;
        setPhase('gameover');
    }, [phase, activeIndex]);

    const toggleFullscreen = async () => {
        if (!document.fullscreenElement) {
            await containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
            return;
        }
        await document.exitFullscreen();
        setIsFullscreen(false);
    };

    const resolveTurn = (kind: RevealKind, extras?: { gained?: number; speedBonus?: number }) => {
        if (phase !== 'play') return;
        if (cardState !== 'question') return;
        if (!activeEntry || activeIndex < 0) return;

        if (kind === 'correct') {
            const gained = extras?.gained || activeEntry.points;
            const speedBonus = extras?.speedBonus || 0;
            const nextEntries = entries.map((entry, index) =>
                index === activeIndex ? { ...entry, status: 'solved' as WheelStatus, solvedBy: currentTeam } : entry
            );
            setEntries(nextEntries);
            setScores((prev) => {
                const next = [...prev];
                next[currentTeam] += gained;
                return next;
            });
            setRevealState({ kind, answer: activeEntry.answer, revealAnswer: true, gained, speedBonus });
            setCardState('answer');
            setIsFlipped(true);
            setInput('');
            playSound('correct', isMuted, options.soundConfig?.correct);
            return;
        }

        if (kind === 'timeout' && hasBeenPassedByAllTeams(activeEntry, teamCount)) {
            const nextEntries = entries.map((entry, index) =>
                index === activeIndex ? { ...entry, status: 'missed' as WheelStatus } : entry
            );
            setEntries(nextEntries);
            setScores((prev) => {
                const next = [...prev];
                next[currentTeam] -= activeEntry.points;
                return next;
            });
            setRevealState({
                kind: 'incorrect',
                answer: activeEntry.answer,
                revealAnswer: true,
                penalty: activeEntry.points,
            });
            setCardState('answer');
            setIsFlipped(true);
            setInput('');
            playSound('incorrect', isMuted, options.soundConfig?.incorrect);
            return;
        }

        if (kind === 'incorrect') {
            const nextEntries = entries.map((entry, index) =>
                index === activeIndex ? { ...entry, status: 'missed' as WheelStatus } : entry
            );
            setEntries(nextEntries);
            setScores((prev) => {
                const next = [...prev];
                next[currentTeam] -= activeEntry.points;
                return next;
            });
            setRevealState({ kind, answer: activeEntry.answer, revealAnswer: true, penalty: activeEntry.points });
            setCardState('answer');
            setIsFlipped(true);
            setInput('');
            playSound('incorrect', isMuted, options.soundConfig?.incorrect);
            return;
        }

        const nextEntries = entries.map((entry, index) =>
            index === activeIndex
                ? {
                      ...entry,
                      status: (entry.status === 'pending' ? 'passed' : entry.status) as WheelStatus,
                      passedByTeams: appendPassByTeam(entry, currentTeam),
                  }
                : entry
        );
        setEntries(nextEntries);
        setRevealState({ kind, revealAnswer: false });
        setCardState('answer');
        setIsFlipped(true);
        setInput('');
        if (kind === 'timeout') {
            playSound('times-up', isMuted, options.soundConfig?.timesUp);
        } else {
            playSound('select', isMuted, options.soundConfig?.select);
        }
    };

    const handleOpenCard = () => {
        if (phase !== 'play') return;
        if (!activeEntry || activeIndex < 0) return;
        if (!activeEntry.question || !activeEntry.answer) return;

        setInput('');
        setRevealState(null);
        setIsFlipped(false);
        setHasStartedWheel(true);
        setCardState('question');
        if (hasTimer) {
            setTimeLeft(options.timerSeconds);
        }
        playSound('select', isMuted, options.soundConfig?.select);
    };

    const handlePass = (fromTimeout = false) => {
        if (!activeEntry) return;
        if (!fromTimeout && hasBeenPassedByAllTeams(activeEntry, teamCount)) return;
        resolveTurn(fromTimeout ? 'timeout' : 'passed');
    };

    const openEditTeam = (index: number) => {
        setEditingTeamIndex(index);
        setEditName(teamNames[index] || `Team ${index + 1}`);
        setEditScore(scores[index] || 0);
    };

    const saveTeamEdit = () => {
        if (editingTeamIndex === null) return;

        const nextNames = [...teamNames];
        const cleanedName = editName.trim();
        nextNames[editingTeamIndex] = cleanedName || `Team ${editingTeamIndex + 1}`;
        setTeamNames(nextNames);

        const nextScores = [...scores];
        const normalizedScore = Number.isFinite(Number(editScore)) ? Number(editScore) : 0;
        nextScores[editingTeamIndex] = normalizedScore;
        setScores(nextScores);

        setEditingTeamIndex(null);
    };

    const handleSubmit = (event?: React.FormEvent) => {
        if (event) event.preventDefault();
        if (phase !== 'play') return;
        if (cardState !== 'question') return;
        if (!activeEntry || activeIndex < 0) return;
        if (!input.trim()) return;

        const correct = matchesEntry(activeEntry, input);
        if (correct) {
            const speedBonus =
                scoringMode === 'speed-bonus' && hasTimer
                    ? Math.max(0, Math.round((timeLeft / Math.max(options.timerSeconds, 1)) * 5))
                    : 0;
            const gained = activeEntry.points + speedBonus;
            resolveTurn('correct', { gained, speedBonus });
            return;
        }

        resolveTurn('incorrect');
    };

    const handleReturnToWheel = () => {
        if (phase !== 'play') return;
        if (activeIndex < 0) return;

        setCardState('hidden');
        setIsFlipped(false);
        setRevealState(null);
        setInput('');

        const nextIndex = findNextPlayableIndex(entries, activeIndex);
        if (nextIndex === -1) {
            clearWheelMotionTimeouts();
            setPhase('gameover');
            playSound('win', isMuted, options.soundConfig?.win);
            return;
        }

        const nextTeam = teamCount === 1 ? 0 : (currentTeam + 1) % teamCount;
        clearWheelMotionTimeouts();

        spinTimeoutRef.current = window.setTimeout(() => {
            startWheelSpin(nextIndex, nextTeam);
            spinTimeoutRef.current = null;
        }, WHEEL_SPIN_DELAY_MS);
    };

    useEffect(() => {
        if (phase !== 'play') return;
        if (cardState !== 'answer') return;
        if (!isFlipped) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Enter') return;
            if (event.repeat) return;

            event.preventDefault();
            handleReturnToWheel();
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [phase, cardState, isFlipped, handleReturnToWheel]);

    useEffect(() => {
        if (phase !== 'play') return;
        if (cardState !== 'question') return;
        if (!hasTimer) return;
        if (!activeEntry) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handlePass(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cardState, activeIndex, currentTeam, phase, hasTimer, options.timerSeconds]);

    if (phase === 'gameover') {
        return (
            <div className="fixed inset-0 z-[300] bg-gradient-to-br from-teal-900 via-cyan-900 to-slate-950 text-white overflow-y-auto">
                <div className="max-w-4xl mx-auto px-4 py-12 text-center">
                    <Trophy size={72} className="mx-auto text-brand-yellow mb-4" />
                    <h1 className="font-display text-4xl md:text-6xl font-black mb-4">Word Wheel Complete</h1>
                    <p className="text-lg text-cyan-100 mb-8">
                        {winners.length > 1
                            ? `Tie: ${winners.map((winner) => winner.name).join(' & ')}`
                            : `Winner: ${winners[0]?.name || 'No winner'}`}
                    </p>

                    <div className="bg-white/10 border border-white/20 rounded-2xl p-4 md:p-6 mb-8">
                        <div className="space-y-3">
                            {ranking.map((team, index) => (
                                <div key={team.index} className="bg-white/10 rounded-xl px-4 py-3 flex items-center justify-between">
                                    <div className="font-bold">
                                        {index + 1}. {team.name}
                                    </div>
                                    <div className="font-mono font-black text-xl">{team.score}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={onReplay}
                            className="px-8 py-3 rounded-xl bg-brand-yellow text-slate-900 font-bold flex items-center justify-center"
                        >
                            <RefreshCw size={18} className="mr-2" /> Play Again
                        </button>
                        <button
                            onClick={onFinish}
                            className="px-8 py-3 rounded-xl bg-white text-slate-900 font-bold"
                        >
                            Exit to Game Hub
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const questionImageUrl = resolveGameImageUrl(activeEntry?.image?.url, activeEntry?.image?.thumbUrl);
    const questionImageAlt = activeEntry?.image?.alt || 'Clue image';
    const timerProgress = hasTimer ? Math.max(0, Math.min(1, timeLeft / Math.max(options.timerSeconds, 1))) : 0;
    const cardPlayable = Boolean(activeEntry && activeEntry.question && activeEntry.answer);
    const canPassCurrent = Boolean(activeEntry && !hasBeenPassedByAllTeams(activeEntry, teamCount));
    const openCardButtonLabel = isWheelSpinning ? 'Spinning...' : hasStartedWheel ? 'Continue' : 'Start';

    return (
        <div
            ref={containerRef}
            className={`relative bg-slate-900 text-white flex flex-col ${isFullscreen ? 'h-[calc(var(--app-vh,1vh)_*_100)]' : 'h-[calc(var(--app-vh,1vh)_*_100_-_4rem)]'} overflow-hidden`}
        >
            <style>{`
                @keyframes word-wheel-pop {
                    0% { transform: translate(-50%, -50%) scale(1); }
                    45% { transform: translate(-50%, -50%) scale(1.11); }
                    100% { transform: translate(-50%, -50%) scale(1); }
                }
                @keyframes word-wheel-pulse {
                    0% { transform: translate(-50%, -50%) scale(1); }
                    50% { transform: translate(-50%, -50%) scale(1.045); }
                    100% { transform: translate(-50%, -50%) scale(1); }
                }
            `}</style>
            <div ref={headerRef} className="bg-slate-800 border-b border-slate-700 p-2 sm:p-4 shrink-0">
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex flex-col gap-1 shrink-0">
                        <button
                            onClick={() => setShowQuitConfirm(true)}
                            className="w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm font-bold flex items-center justify-center"
                            title="Quit"
                        >
                            <ArrowLeft size={16} className="sm:mr-1" />
                            <span className="hidden sm:inline">Quit</span>
                        </button>
                    </div>

                    <div className="flex-1 flex items-center justify-end sm:justify-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
                        {scores.map((score, index) => {
                            const active = currentTeam === index;
                            return (
                                <button
                                    key={index}
                                    onClick={() => openEditTeam(index)}
                                    className={`min-w-[110px] sm:min-w-[160px] rounded-xl border px-2 py-2 sm:px-4 sm:py-3 text-center transition-all ${
                                        active ? 'bg-cyan-600/20 border-cyan-300 shadow-lg' : 'bg-slate-700/60 border-slate-600'
                                    } relative group`}
                                >
                                    <div className="text-[10px] sm:text-sm uppercase tracking-wider text-cyan-100 font-bold truncate">
                                        {teamNames[index]}
                                    </div>
                                    <div className="font-mono font-black text-2xl sm:text-4xl">{score}</div>
                                    <div className="absolute top-1.5 right-1.5 rounded-full bg-slate-200/90 text-slate-800 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Edit2 size={10} />
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="shrink-0 flex flex-col items-end justify-center gap-2 self-center">
                        <button
                            onClick={toggleFullscreen}
                            className="hidden sm:flex w-10 h-10 rounded-lg bg-slate-700 hover:bg-slate-600 items-center justify-center"
                            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                        >
                            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                        </button>
                        <button
                            onClick={() => setIsMuted((prev) => !prev)}
                            className="w-10 h-10 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 flex items-center justify-center"
                            title={isMuted ? 'Unmute' : 'Mute'}
                        >
                            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>
                    </div>
                </div>
            </div>

            <div className="relative flex-1 min-h-0 overflow-hidden px-3 pt-3 pb-4 sm:px-6 sm:pt-4 sm:pb-5">
                <div className="absolute inset-0">
                    <img
                        src="/assets/background/wordwheel-stage-bg.webp"
                        alt=""
                        aria-hidden="true"
                        className="w-full h-full object-cover object-center select-none pointer-events-none"
                        draggable={false}
                    />
                </div>
                <div className="relative z-10 max-w-7xl mx-auto h-full flex flex-col items-center justify-between gap-2 sm:gap-3">
                    <div className="text-center shrink-0">
                        <div className="text-sm sm:text-2xl font-black uppercase tracking-wider text-cyan-100">
                            {teamNames[currentTeam]} Turn
                        </div>
                        <div className="text-xs sm:text-base text-slate-300 mt-1">
                            Solved {solvedCount} / {entries.length}
                        </div>
                    </div>

                    <div className="w-full max-w-[1200px] flex-1 min-h-0 flex items-center">
                        <div className="relative w-full h-full min-h-[320px] max-h-[560px] mx-auto overflow-hidden">
                            <div ref={wheelTrackRef} className="absolute inset-0 overflow-hidden">
                                {wheelRingEntries.map((item) => {
                                    const isPopping = item.index === poppingLetterIndex;
                                    const isCurrentLetter = item.index === activeIndex && !isWheelSpinning;
                                    const activeAnimation = isPopping
                                        ? `word-wheel-pop ${LETTER_POP_MS}ms cubic-bezier(0.22,1,0.36,1), word-wheel-pulse ${LETTER_PULSE_MS}ms ease-in-out ${LETTER_POP_MS}ms infinite`
                                        : isCurrentLetter
                                          ? `word-wheel-pulse ${LETTER_PULSE_MS}ms ease-in-out infinite`
                                          : undefined;
                                    const spherePalette =
                                        item.entry.status === 'solved'
                                            ? {
                                                  gradient: 'from-emerald-200 via-emerald-500 to-emerald-800',
                                                  border: 'border-emerald-100/90',
                                                  text: 'text-white',
                                                  shadow: 'shadow-[0_10px_24px_rgba(16,185,129,0.32)]'
                                              }
                                            : item.entry.status === 'missed'
                                              ? {
                                                    gradient: 'from-rose-200 via-rose-500 to-rose-800',
                                                    border: 'border-rose-100/90',
                                                    text: 'text-white',
                                                    shadow: 'shadow-[0_10px_24px_rgba(244,63,94,0.3)]'
                                                }
                                              : item.entry.status === 'passed'
                                                ? {
                                                      gradient: 'from-amber-200 via-amber-400 to-amber-700',
                                                      border: 'border-amber-100/90',
                                                      text: 'text-slate-900',
                                                      shadow: 'shadow-[0_10px_24px_rgba(245,158,11,0.3)]'
                                                  }
                                                : {
                                                      gradient: 'from-slate-100 via-slate-300 to-slate-500',
                                                      border: 'border-slate-100/90',
                                                      text: 'text-slate-800',
                                                      shadow: 'shadow-[0_10px_24px_rgba(148,163,184,0.3)]'
                                                  };
                                    const shellBorderClass = item.isActive ? `border ${spherePalette.border}` : 'border-0';

                                    return (
                                        <div
                                            key={`${item.entry.letter}-${item.index}`}
                                            className={`absolute overflow-hidden rounded-full bg-gradient-to-br font-black flex items-center justify-center transition-[opacity,box-shadow,filter] duration-300 ease-out ${shellBorderClass} ${spherePalette.gradient} ${spherePalette.text} ${spherePalette.shadow} ${item.isActive ? 'ring-4 ring-brand-yellow shadow-[0_12px_34px_rgba(250,204,21,0.45)]' : ''}`}
                                            style={{
                                                left: `${item.leftPx}px`,
                                                top: `${item.topPx}px`,
                                                width: `${item.size}px`,
                                                height: `${item.size}px`,
                                                fontSize: `${item.font}px`,
                                                opacity: item.opacity,
                                                zIndex: item.zIndex,
                                                transform: 'translate(-50%, -50%)',
                                                animation: activeAnimation,
                                                willChange: isWheelSpinning ? 'left,top,width,height,font-size,opacity,transform' : undefined,
                                            }}
                                        >
                                            <div className="absolute left-[14%] top-[12%] h-[34%] w-[46%] rounded-full bg-white/55 blur-[0.6px] pointer-events-none" />
                                            <div className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle_at_28%_24%,rgba(255,255,255,0.85),rgba(255,255,255,0)_58%)] pointer-events-none" />
                                            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_74%_80%,rgba(2,6,23,0.28),rgba(2,6,23,0)_52%)] pointer-events-none" />
                                            <span className="relative z-10 drop-shadow-[0_1px_1px_rgba(15,23,42,0.35)]">{item.entry.letter}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="w-full max-w-xl text-center shrink-0">
                        <button
                            onClick={handleOpenCard}
                            disabled={!cardPlayable || cardState !== 'hidden' || isWheelSpinning}
                            className="w-full py-4 sm:py-5 rounded-2xl bg-brand-yellow text-slate-900 font-black text-xl sm:text-3xl disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-105 transition-all"
                        >
                            {openCardButtonLabel}
                        </button>
                    </div>
                </div>
            </div>

            {cardState !== 'hidden' && activeEntry && (
                <div
                    className="absolute inset-x-0 bottom-0 z-[520] flex items-center justify-center bg-slate-900/54 backdrop-blur-md p-3 sm:p-4 animate-fade-in overflow-hidden"
                    style={{ top: `${cardOverlayTop}px` }}
                >
                    <div className="w-full max-w-[420px] h-full max-h-full sm:max-w-[560px] sm:h-full sm:max-h-[90vh] md:max-w-6xl md:h-auto md:max-h-full md:aspect-[16/9] [perspective:1000px]">
                        <div className={`relative w-full h-full transition-all duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                            <div className={`absolute inset-0 [backface-visibility:hidden] [transform:translateZ(0)] rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full bg-white ${isFlipped ? 'pointer-events-none' : ''}`}>
                                <div className="bg-brand-blue text-white p-3 md:p-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3 h-[clamp(72px,12vh,96px)] sm:h-20 md:h-24 flex-shrink-0">
                                    <div className="font-black text-sm sm:text-xl truncate">{teamNames[currentTeam]}</div>
                                    <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 min-w-0 leading-none">
                                        <div className="text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-wide opacity-90 whitespace-nowrap text-right">
                                            {activeRelationHeader}
                                        </div>
                                        <div className="font-black leading-[0.82] [font-size:clamp(2.4rem,8vw,5.6rem)]">
                                            {activeEntry.letter}
                                        </div>
                                    </div>
                                    <div className="text-right justify-self-end">
                                        {hasTimer ? (
                                            <div className="font-black text-lg sm:text-3xl leading-none flex items-center justify-end">
                                                <Clock size={16} className="mr-1" /> {timeLeft}s
                                            </div>
                                        ) : (
                                            <div className="font-bold text-xs sm:text-sm uppercase tracking-wide opacity-80">No Timer</div>
                                        )}
                                    </div>
                                </div>

                                {hasTimer && (
                                    <div className="h-2 bg-slate-200">
                                        <div className="h-full bg-brand-yellow transition-all duration-300" style={{ width: `${timerProgress * 100}%` }} />
                                    </div>
                                )}

                                <div className="flex-1 min-h-0 flex flex-col bg-white">
                                    <div
                                        ref={questionWrapRef}
                                        className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-7 md:p-10 text-center flex flex-col items-center justify-center"
                                    >
                                        {questionImageUrl && (
                                            <img
                                                src={questionImageUrl}
                                                alt={questionImageAlt}
                                                className="mb-4 max-h-[30vh] w-auto rounded-lg border border-slate-200 bg-white object-contain"
                                            />
                                        )}
                                        <p
                                            ref={questionTextRef}
                                            style={mobileQuestionFontSize ? { fontSize: `${mobileQuestionFontSize}px`, lineHeight: '1.14' } : undefined}
                                            className="font-display font-bold text-slate-800 leading-tight text-3xl sm:text-4xl md:text-5xl whitespace-pre-wrap break-words"
                                        >
                                            {activeEntry.question}
                                        </p>
                                    </div>

                                    <form onSubmit={handleSubmit} className="border-t border-slate-200 p-3 sm:p-4 bg-slate-50">
                                        <input
                                            type="text"
                                            value={input}
                                            onChange={(event) => setInput(event.target.value)}
                                            placeholder="Type your answer"
                                            className="w-full p-3 sm:p-4 rounded-xl border border-slate-300 bg-white text-slate-900 text-lg sm:text-2xl font-bold outline-none focus:ring-2 focus:ring-brand-yellow"
                                            autoFocus
                                        />
                                        <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-3">
                                            <button
                                                type="submit"
                                                className="py-3 sm:py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-lg sm:text-2xl disabled:opacity-50"
                                                disabled={!input.trim()}
                                            >
                                                Submit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handlePass(false)}
                                                className="py-3 sm:py-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-black text-lg sm:text-2xl disabled:opacity-45 disabled:cursor-not-allowed"
                                                disabled={!canPassCurrent}
                                            >
                                                Pass
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>

                            <div className={`absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full bg-slate-50 ${!isFlipped ? 'pointer-events-none' : ''}`}>
                                <div className="bg-slate-200 text-slate-700 p-3 md:p-4 flex items-center h-[clamp(72px,12vh,96px)] sm:h-20 md:h-24 flex-shrink-0">
                                    <div className="font-black text-lg sm:text-3xl">Result</div>
                                </div>

                                <div className="flex-1 min-h-0 flex flex-col p-5 sm:p-8 md:p-12 overflow-auto">
                                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                                        {revealState?.kind === 'correct' ? (
                                            <div className="flex flex-col items-center mb-5 sm:mb-7">
                                                <CheckCircle2 size={72} className="text-green-500 sm:w-24 sm:h-24" />
                                                <h2 className="mt-3 text-4xl sm:text-6xl font-black text-green-500 uppercase">Correct</h2>
                                                <p className="mt-2 text-lg sm:text-3xl font-black text-slate-700">
                                                    +{revealState.gained || activeEntry.points}
                                                    {Number(revealState.speedBonus) > 0 ? ` (${activeEntry.points}+${revealState.speedBonus})` : ''}
                                                </p>
                                            </div>
                                        ) : revealState?.kind === 'incorrect' ? (
                                            <div className="flex flex-col items-center mb-5 sm:mb-7">
                                                <XCircle size={72} className="text-red-500 sm:w-24 sm:h-24" />
                                                <h2 className="mt-3 text-4xl sm:text-6xl font-black text-red-500 uppercase">Incorrect</h2>
                                                <p className="mt-2 text-lg sm:text-3xl font-black text-slate-700">
                                                    -{revealState.penalty || activeEntry.points}
                                                </p>
                                            </div>
                                        ) : revealState?.kind === 'timeout' ? (
                                            <div className="flex flex-col items-center mb-5 sm:mb-7">
                                                <Clock size={72} className="text-amber-500 sm:w-24 sm:h-24" />
                                                <h2 className="mt-3 text-4xl sm:text-6xl font-black text-amber-500 uppercase">Time Up</h2>
                                                <p className="mt-2 text-base sm:text-xl font-bold text-slate-600">Letter marked as passed.</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center mb-5 sm:mb-7">
                                                <Clock size={72} className="text-amber-500 sm:w-24 sm:h-24" />
                                                <h2 className="mt-3 text-4xl sm:text-6xl font-black text-amber-500 uppercase">Passed</h2>
                                            </div>
                                        )}

                                        {revealState?.revealAnswer === false ? (
                                            <p className="text-base sm:text-2xl font-bold text-slate-500">
                                                Answer hidden. This clue stays in play.
                                            </p>
                                        ) : (
                                            <div className="font-display font-black text-slate-800 leading-tight text-3xl sm:text-6xl whitespace-pre-wrap break-words max-w-full">
                                                {revealState?.answer || activeEntry.answer || 'No answer'}
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                        <button
                                            onClick={handleReturnToWheel}
                                            className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-brand-blue text-white font-black text-base sm:text-xl hover:brightness-110 transition-all"
                                        >
                                            Continue
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showQuitConfirm && (
                <div className="fixed inset-0 z-[500] bg-black/50 backdrop-blur-sm p-4 flex items-center justify-center">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center">
                        <button
                            onClick={() => setShowQuitConfirm(false)}
                            className="ml-auto mb-2 text-slate-400 hover:text-slate-600 block"
                            aria-label="Close"
                        >
                            <X size={20} />
                        </button>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Quit this game?</h2>
                        <p className="text-slate-500 text-sm mb-5">Current progress in this round will be lost.</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setShowQuitConfirm(false)}
                                className="py-2.5 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                            >
                                Continue
                            </button>
                            <button
                                onClick={onBack}
                                className="py-2.5 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600"
                            >
                                Quit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {editingTeamIndex !== null && (
                <div className="fixed inset-0 z-[540] bg-black/50 backdrop-blur-sm p-4 flex items-center justify-center">
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            saveTeamEdit();
                        }}
                        className="bg-white rounded-2xl max-w-sm w-full p-6"
                    >
                        <button
                            type="button"
                            onClick={() => setEditingTeamIndex(null)}
                            className="ml-auto mb-2 text-slate-400 hover:text-slate-600 block"
                            aria-label="Close"
                        >
                            <X size={20} />
                        </button>
                        <h2 className="text-xl font-bold text-slate-800 mb-4">
                            Edit {teamNames[editingTeamIndex] || `Team ${editingTeamIndex + 1}`}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-slate-500 font-bold mb-1.5">
                                    Team Name
                                </label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(event) => setEditName(event.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-yellow"
                                    maxLength={32}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-slate-500 font-bold mb-1.5">
                                    Score
                                </label>
                                <input
                                    type="number"
                                    value={editScore}
                                    onChange={(event) => setEditScore(Number(event.target.value))}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-yellow"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-5">
                            <button
                                type="button"
                                onClick={() => setEditingTeamIndex(null)}
                                className="py-2.5 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="py-2.5 rounded-lg bg-brand-blue text-white font-bold hover:brightness-110"
                            >
                                Save
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

