import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { GeneratedGame, GameRunOptions, GeneratedQuestion } from '../../types';
import { playSound } from '../../utils/gameUtils';
import { resolveGameImageUrl } from '../../utils/gameImage';
import { WinnerCeremonyHero } from './shared/WinnerCeremonyHero';
import { PracticeReviewSummary } from './shared/PracticeReviewSummary';
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    Edit2,
    Flag,
    Maximize2,
    Minimize2,
    Pause,
    Play,
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
    revealedLetterIndices: number[];
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
const MAX_TEAM_CLUES = 3;

const normalizeRelationAnswer = (value: string) => String(value || '').toUpperCase().replace(/[^A-Z]/g, '');

const getLetterRelation = (rule: 'starts-with' | 'contains-hard', letter: string, answer = '') => {
    if (rule === 'contains-hard' && CONTAINS_HARD_LETTERS.has(letter)) {
        const normalizedAnswer = normalizeRelationAnswer(answer);
        if (normalizedAnswer.startsWith(letter)) return 'starts-with';
        return 'contains';
    }
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

const hasBeenPassedByTeam = (entry: WheelEntry, teamIndex: number) =>
    Boolean(entry?.passedByTeams?.includes(teamIndex));

const getOriginalPassingTeam = (entry: WheelEntry, fallbackTeam: number, teamCount: number) => {
    const owner = entry.passedByTeams?.[0];
    if (typeof owner === 'number' && owner >= 0 && owner < teamCount) return owner;
    return ((fallbackTeam % teamCount) + teamCount) % teamCount;
};

const pickTeamForEntryTurn = (entry: WheelEntry | undefined, preferredTeam: number, teamCount: number) => {
    if (teamCount <= 1) return 0;
    if (!entry) return ((preferredTeam % teamCount) + teamCount) % teamCount;
    if (entry.status === 'passed') return getOriginalPassingTeam(entry, preferredTeam, teamCount);
    return ((preferredTeam % teamCount) + teamCount) % teamCount;
};

const getRevealableAnswerIndices = (answer: string) =>
    Array.from(answer || '')
        .map((char, index) => ({ char, index }))
        .filter(({ char }) => /[A-Za-z0-9]/.test(char))
        .map(({ index }) => index);

const getFirstRevealableIndex = (answer: string) => {
    const revealable = getRevealableAnswerIndices(answer);
    return revealable.length ? revealable[0] : -1;
};

const getBaselineHintIndices = (entry: WheelEntry) => {
    const baseline = new Set<number>();
    const firstIndex = getFirstRevealableIndex(entry.answer || '');
    if (firstIndex >= 0) baseline.add(firstIndex);
    return baseline;
};

const pickRandom = <T,>(items: T[], count: number) => {
    if (count <= 0 || !items.length) return [];
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
};

const revealAnswerLetters = (entry: WheelEntry, ratio = 0.2, excludedIndices?: Set<number>) => {
    const revealable = getRevealableAnswerIndices(entry.answer || '');
    if (!revealable.length) return [];

    const current = new Set(entry.revealedLetterIndices || []);
    const excluded = excludedIndices || new Set<number>();
    const hiddenRevealable = revealable.filter((index) => !current.has(index) && !excluded.has(index));
    if (!hiddenRevealable.length) return Array.from(current).sort((a, b) => a - b);

    // Baseline helper letters (like first letter) are excluded, and do not count toward the 20% reveal.
    const revealCount = Math.max(1, Math.ceil(revealable.length * ratio));

    const picks: number[] = [];
    const primaryPicks = pickRandom(hiddenRevealable, revealCount);
    primaryPicks.forEach((index) => picks.push(index));

    picks.forEach((index) => current.add(index));

    return Array.from(current).sort((a, b) => a - b);
};

const hasHiddenHintLetters = (entry: WheelEntry, excludedIndices?: Set<number>) => {
    const revealable = getRevealableAnswerIndices(entry.answer || '');
    if (!revealable.length) return false;
    const revealed = new Set(entry.revealedLetterIndices || []);
    const excluded = excludedIndices || new Set<number>();
    return revealable.some((index) => !revealed.has(index) && !excluded.has(index));
};

const buildHintPreview = (
    entry: WheelEntry,
    alwaysRevealedIndices?: Set<number>,
    separator = '\u2009'
) => {
    const revealSet = new Set(entry.revealedLetterIndices || []);
    if (alwaysRevealedIndices) {
        alwaysRevealedIndices.forEach((index) => revealSet.add(index));
    }
    return Array.from(entry.answer || '')
        .map((char, index) => {
            if (!/[A-Za-z0-9]/.test(char)) return char;
            return revealSet.has(index) ? char.toUpperCase() : '_';
        })
        .join(separator);
};

const getAnswerRevealTone = (status: WheelStatus) => {
    if (status === 'solved') {
        return {
            label: 'Correct',
            listRowClass: 'bg-emerald-500/15 border-emerald-300/45 hover:bg-emerald-500/25',
            listAnswerClass: 'text-emerald-200',
            badgeClass: 'bg-emerald-500/20 text-emerald-100 border-emerald-300/40',
            modalAnswerClass: 'text-emerald-600',
            modalBadgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
    }
    if (status === 'passed') {
        return {
            label: 'Passed',
            listRowClass: 'bg-amber-500/15 border-amber-300/45 hover:bg-amber-500/25',
            listAnswerClass: 'text-amber-100',
            badgeClass: 'bg-amber-500/20 text-amber-100 border-amber-300/40',
            modalAnswerClass: 'text-amber-600',
            modalBadgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        };
    }
    return {
        label: 'Failed',
        listRowClass: 'bg-rose-500/15 border-rose-300/45 hover:bg-rose-500/25',
        listAnswerClass: 'text-rose-200',
        badgeClass: 'bg-rose-500/20 text-rose-100 border-rose-300/40',
        modalAnswerClass: 'text-rose-600',
        modalBadgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    };
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
            revealedLetterIndices: [],
            image: source?.image,
        };
    });
};

const findNextPlayableIndex = (entries: WheelEntry[], startIndex: number) => {
    if (!entries.length) return -1;
    for (let offset = 1; offset <= entries.length; offset += 1) {
        const idx = (startIndex + offset + entries.length) % entries.length;
        if (entries[idx]?.status === 'pending') return idx;
    }
    for (let offset = 1; offset <= entries.length; offset += 1) {
        const idx = (startIndex + offset + entries.length) % entries.length;
        if (entries[idx]?.status === 'passed') return idx;
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
const CLUE_PURCHASE_COST = 5;

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
    const [showEndGameConfirm, setShowEndGameConfirm] = useState(false);
    const [editingTeamIndex, setEditingTeamIndex] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editScore, setEditScore] = useState(0);
    const [teamCluesLeft, setTeamCluesLeft] = useState<number[]>(() => Array(teamCount).fill(MAX_TEAM_CLUES));
    const [endGameRevealList, setEndGameRevealList] = useState<Array<{ letter: string; answer: string }>>([]);
    const [reviewEntryId, setReviewEntryId] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState(options.timerSeconds > 0 ? options.timerSeconds : 0);
    const [isTimerPaused, setIsTimerPaused] = useState(false);
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
    const [mobileClueFontSize, setMobileClueFontSize] = useState<number | null>(null);
    const [questionResizeTick, setQuestionResizeTick] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const wheelTrackRef = useRef<HTMLDivElement>(null);
    const questionWrapRef = useRef<HTMLDivElement>(null);
    const questionTextRef = useRef<HTMLParagraphElement>(null);
    const cluePreviewTextRef = useRef<HTMLDivElement>(null);
    const spinTimeoutRef = useRef<number | null>(null);
    const spinFrameRef = useRef<number | null>(null);
    const popTimeoutRef = useRef<number | null>(null);
    const scoresRef = useRef<number[]>(scores);

    const scoringMode = options.wordWheelScoringMode || game.config.wordWheelScoringMode || 'classic';
    const letterRule = options.wordWheelLetterRule || game.config.wordWheelLetterRule || 'contains-hard';
    const hasTimer = options.timerSeconds > 0;
    const activeEntry = activeIndex >= 0 ? entries[activeIndex] : null;
    const activeRelation = activeEntry ? getLetterRelation(letterRule, activeEntry.letter, activeEntry.answer) : 'starts-with';
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
        scoresRef.current = scores;
    }, [scores]);

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
            setMobileClueFontSize(null);
            return;
        }

        const wrap = questionWrapRef.current;
        const textEl = questionTextRef.current;
        const clueEl = cluePreviewTextRef.current;
        if (!wrap || !textEl) return;

        const availableHeight = wrap.clientHeight;
        const availableWidth = textEl.clientWidth || wrap.clientWidth;
        if (availableHeight <= 0 || availableWidth <= 0) return;

        const minQuestionSize = 20;
        const maxQuestionFromWidth = Math.floor(availableWidth / 6.1);
        let questionSize = Math.max(minQuestionSize, Math.min(64, maxQuestionFromWidth));

        const clueWrapWidth = clueEl?.parentElement?.clientWidth || availableWidth;
        const minClueSize = 10;
        const maxClueFromWidth = Math.floor(clueWrapWidth / 6.5);
        let clueSize = clueEl ? Math.max(minClueSize, Math.min(52, maxClueFromWidth)) : null;
        let clueLetterSpacing = 0.02;

        textEl.style.lineHeight = '1.14';
        textEl.style.fontSize = `${questionSize}px`;
        if (clueEl && clueSize !== null) {
            clueEl.style.lineHeight = '1.08';
            clueEl.style.whiteSpace = 'nowrap';
            clueEl.style.letterSpacing = `${clueLetterSpacing}em`;
            clueEl.style.fontSize = `${clueSize}px`;
        }

        let guard = 0;
        while (guard < 280) {
            const wrapOverflow = wrap.scrollHeight > wrap.clientHeight;
            const questionOverflow = textEl.scrollWidth > availableWidth;
            const clueOverflow = clueEl
                ? clueEl.scrollWidth > ((clueEl.parentElement?.clientWidth || availableWidth) - 2)
                : false;

            if (!wrapOverflow && !questionOverflow && !clueOverflow) break;

            let changed = false;
            if (questionSize > minQuestionSize) {
                questionSize -= 1;
                textEl.style.fontSize = `${questionSize}px`;
                changed = true;
            }
            if (clueEl && clueSize !== null && clueSize > minClueSize && (wrapOverflow || clueOverflow)) {
                clueSize -= 1;
                clueEl.style.fontSize = `${clueSize}px`;
                changed = true;
            }
            if (clueEl && clueSize !== null && clueSize <= minClueSize && clueOverflow && clueLetterSpacing > -0.04) {
                clueLetterSpacing -= 0.005;
                clueEl.style.letterSpacing = `${clueLetterSpacing}em`;
                changed = true;
            }

            if (!changed) break;
            guard += 1;
        }

        setMobileQuestionFontSize(questionSize);
        setMobileClueFontSize(clueSize);
    }, [
        isMobileViewport,
        cardState,
        isFlipped,
        activeEntry?.id,
        activeEntry?.question,
        activeEntry?.image?.url,
        activeEntry?.image?.thumbUrl,
        activeEntry?.answer,
        activeEntry?.revealedLetterIndices,
        questionResizeTick,
    ]);

    useEffect(() => {
        if (phase !== 'play') return;
        if (activeIndex !== -1) return;
        setEndGameRevealList([]);
        setReviewEntryId(null);
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

        if (kind === 'timeout' && hasBeenPassedByTeam(activeEntry, currentTeam)) {
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
        setIsTimerPaused(false);
        setHasStartedWheel(true);
        setCardState('question');
        if (hasTimer) {
            setTimeLeft(options.timerSeconds);
        }
        playSound('select', isMuted, options.soundConfig?.select);
    };

    const handlePass = (fromTimeout = false) => {
        if (!activeEntry) return;
        const passBlocked = hasBeenPassedByTeam(activeEntry, currentTeam);
        if (!fromTimeout && passBlocked) return;
        resolveTurn(fromTimeout ? 'timeout' : 'passed');
    };

    const handleUseClue = () => {
        if (phase !== 'play') return;
        if (cardState !== 'question') return;
        if (!activeEntry || activeIndex < 0) return;
        if ((teamCluesLeft[currentTeam] || 0) <= 0) return;

        const excludedIndices = getBaselineHintIndices(activeEntry);
        const nextRevealed = revealAnswerLetters(activeEntry, 0.2, excludedIndices);
        const currentRevealedLength = activeEntry.revealedLetterIndices?.length || 0;
        if (nextRevealed.length <= currentRevealedLength) return;

        setEntries((prev) =>
            prev.map((entry, index) =>
                index === activeIndex ? { ...entry, revealedLetterIndices: nextRevealed } : entry
            )
        );
        setTeamCluesLeft((prev) => {
            const next = [...prev];
            next[currentTeam] = Math.max(0, (next[currentTeam] || 0) - 1);
            return next;
        });
        playSound('select', isMuted, options.soundConfig?.select);
    };

    const handleBuyClue = () => {
        if (phase !== 'play') return;
        if (cardState !== 'question') return;
        if (!activeEntry || activeIndex < 0) return;

        const baseline = getBaselineHintIndices(activeEntry);
        if (!hasHiddenHintLetters(activeEntry, baseline)) return;
        const nextRevealed = revealAnswerLetters(activeEntry, 0.2, baseline);
        const currentRevealedLength = activeEntry.revealedLetterIndices?.length || 0;
        if (nextRevealed.length <= currentRevealedLength) return;

        const currentScore = scoresRef.current[currentTeam] || 0;
        if (currentScore <= 0 || currentScore < CLUE_PURCHASE_COST) return;

        const nextScores = [...scoresRef.current];
        nextScores[currentTeam] = currentScore - CLUE_PURCHASE_COST;
        scoresRef.current = nextScores;
        setScores(nextScores);

        setEntries((prev) =>
            prev.map((entry, index) =>
                index === activeIndex ? { ...entry, revealedLetterIndices: nextRevealed } : entry
            )
        );

        playSound('select', isMuted, options.soundConfig?.select);
    };

    const handleEndGameNow = () => {
        if (phase !== 'play') return;

        clearWheelMotionTimeouts();
        const remaining = entries
            .filter((entry) => (entry.status === 'pending' || entry.status === 'passed') && String(entry.answer || '').trim().length > 0)
            .map((entry) => ({ letter: entry.letter, answer: entry.answer }));

        setEndGameRevealList(remaining);
        setIsTimerPaused(false);
        setEntries((prev) =>
            prev.map((entry) =>
                entry.status === 'pending'
                    ? { ...entry, status: 'missed' as WheelStatus }
                    : entry
            )
        );
        setCardState('hidden');
        setRevealState(null);
        setIsFlipped(false);
        setInput('');
        setReviewEntryId(null);
        setShowEndGameConfirm(false);
        setPhase('gameover');
        playSound('win', isMuted, options.soundConfig?.win);
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
                    ? Math.max(0, Math.min(10, Math.floor((timeLeft / Math.max(options.timerSeconds, 1)) * 10)))
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
        setIsTimerPaused(false);
        setRevealState(null);
        setInput('');

        const nextIndex = findNextPlayableIndex(entries, activeIndex);
        if (nextIndex === -1) {
            clearWheelMotionTimeouts();
            setEndGameRevealList([]);
            setReviewEntryId(null);
            setPhase('gameover');
            playSound('win', isMuted, options.soundConfig?.win);
            return;
        }

        const nextTeam = pickTeamForEntryTurn(entries[nextIndex], teamCount === 1 ? 0 : (currentTeam + 1) % teamCount, teamCount);
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
        if (cardState !== 'hidden') return;
        if (!cardPlayable || isWheelSpinning) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Enter') return;
            if (event.repeat) return;

            event.preventDefault();
            handleOpenCard();
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [phase, cardState, cardPlayable, isWheelSpinning, activeIndex, activeEntry?.id]);

    useEffect(() => {
        if (phase !== 'play') return;
        if (cardState !== 'question') return;
        if (!hasTimer) return;
        if (isTimerPaused) return;
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
    }, [cardState, activeIndex, currentTeam, phase, hasTimer, isTimerPaused, options.timerSeconds]);

    if (phase === 'gameover') {
        if (options.studentPractice) {
            const reviewableEntries = entries.filter(
                (entry) => String(entry.answer || '').trim().length > 0 && String(entry.question || '').trim().length > 0
            );
            const missedItems = reviewableEntries
                .filter((entry) => entry.status === 'missed' || entry.status === 'passed' || entry.status === 'pending')
                .map((entry) => ({
                    id: String(entry.id),
                    question: entry.question,
                    correctAnswer: entry.answer,
                    context: `Letter ${entry.letter}`,
                }));

            return (
                <PracticeReviewSummary
                    playerName={teamNames[0]}
                    correctCount={reviewableEntries.filter((entry) => entry.status === 'solved').length}
                    totalCount={reviewableEntries.length}
                    missedItems={missedItems}
                    onReplay={onReplay}
                    onExit={onFinish}
                />
            );
        }

        const isTie = winners.length > 1;
        const revealableEntries = entries.filter(
            (entry) => String(entry.answer || '').trim().length > 0 && String(entry.question || '').trim().length > 0
        );
        const selectedReviewEntry =
            reviewEntryId === null ? null : revealableEntries.find((entry) => entry.id === reviewEntryId) || null;
        const selectedReviewTone = selectedReviewEntry ? getAnswerRevealTone(selectedReviewEntry.status) : null;
        const selectedReviewRelation = selectedReviewEntry
            ? getLetterRelation(letterRule, selectedReviewEntry.letter, selectedReviewEntry.answer)
            : 'starts-with';
        const selectedReviewRelationHeader =
            selectedReviewRelation === 'contains' ? 'Contains the letter' : 'Starts with the letter';
        const winnerHeadline = isTie
            ? `WINNERS: ${winners.map((winner) => winner.name).join(' & ')}`
            : `WINNER: ${winners[0]?.name || 'No winner'}`;

        return (
            <div
                className={`${isFullscreen ? 'fixed inset-0' : 'fixed inset-x-0 bottom-0 top-[calc(4rem+env(safe-area-inset-top))]'} z-[300] bg-gradient-to-br from-teal-900 via-cyan-900 to-slate-950 text-white overflow-hidden`}
            >
                <WinnerCeremonyHero
                    winnerHeadline={winnerHeadline}
                    subtitle="Final standings"
                    ranking={ranking}
                    isMobileViewport={isMobileViewport}
                    onPlayAgain={onReplay}
                    onExit={onFinish}
                >
                    <div className="w-full max-w-4xl bg-white/10 border border-white/20 rounded-2xl p-4 md:p-6">
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

                    <div className="w-full max-w-5xl mt-6 bg-white/10 border border-white/20 rounded-2xl p-4 md:p-6">
                        <h3 className="text-lg sm:text-2xl font-black">Revealed Answers</h3>
                        <p className="text-xs sm:text-sm text-cyan-100/90 mt-1 mb-3">
                            Click an answer to open its clue card context.
                            {endGameRevealList.length > 0 ? ` (${endGameRevealList.length} unresolved clue${endGameRevealList.length === 1 ? '' : 's'} were revealed when ending early.)` : ''}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-left">
                            {revealableEntries.map((entry) => {
                                const tone = getAnswerRevealTone(entry.status);
                                return (
                                    <button
                                        key={`reveal-${entry.id}`}
                                        type="button"
                                        onClick={() => setReviewEntryId(entry.id)}
                                        className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${tone.listRowClass}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <span className="font-black text-cyan-100 mr-2">{entry.letter}:</span>
                                                <span className={`font-black text-base sm:text-lg break-words ${tone.listAnswerClass}`}>
                                                    {entry.answer}
                                                </span>
                                            </div>
                                            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] sm:text-xs font-black uppercase tracking-wide ${tone.badgeClass}`}>
                                                {tone.label}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </WinnerCeremonyHero>

                {selectedReviewEntry && selectedReviewTone && (
                    <div className="fixed inset-0 z-[560] bg-black/55 backdrop-blur-sm p-4 flex items-center justify-center">
                        <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden">
                            <div className="bg-brand-blue text-white p-4 sm:p-5 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="text-xs sm:text-xl md:text-2xl uppercase tracking-wide font-bold opacity-90 leading-none">
                                        {selectedReviewRelationHeader}
                                    </div>
                                    <div className="text-4xl sm:text-6xl font-black leading-none mt-1">
                                        {selectedReviewEntry.letter}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setReviewEntryId(null)}
                                    className="shrink-0 rounded-lg bg-white/15 hover:bg-white/25 p-2 text-white"
                                    aria-label="Close clue review"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-4 sm:p-6 md:p-7 space-y-4">
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="text-xs uppercase tracking-wide font-black text-slate-500">Question</div>
                                    <p className="mt-2 text-slate-800 font-display font-bold text-xl sm:text-3xl leading-tight break-words whitespace-pre-wrap">
                                        {selectedReviewEntry.question}
                                    </p>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-xs uppercase tracking-wide font-black text-slate-500">Answer</div>
                                        <span className={`rounded-full border px-2 py-0.5 text-[10px] sm:text-xs font-black uppercase tracking-wide ${selectedReviewTone.modalBadgeClass}`}>
                                            {selectedReviewTone.label}
                                        </span>
                                    </div>
                                    <p className={`mt-2 font-display font-black text-2xl sm:text-4xl leading-tight break-words whitespace-pre-wrap ${selectedReviewTone.modalAnswerClass}`}>
                                        {selectedReviewEntry.answer}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    const questionImageUrl = resolveGameImageUrl(activeEntry?.image?.url, activeEntry?.image?.thumbUrl);
    const questionImageAlt = activeEntry?.image?.alt || 'Clue image';
    const timerProgress = hasTimer ? Math.max(0, Math.min(1, timeLeft / Math.max(options.timerSeconds, 1))) : 0;
    const cardPlayable = Boolean(activeEntry && activeEntry.question && activeEntry.answer);
    const activeHintBaseline = activeEntry ? getBaselineHintIndices(activeEntry) : new Set<number>();
    const currentTeamClues = teamCluesLeft[currentTeam] || 0;
    const canPassCurrent = Boolean(
        activeEntry &&
        !hasBeenPassedByTeam(activeEntry, currentTeam)
    );
    const canUseClueCurrent = Boolean(
        activeEntry &&
        cardState === 'question' &&
        currentTeamClues > 0 &&
        hasHiddenHintLetters(activeEntry, activeHintBaseline)
    );
    const canBuyClueCurrent = Boolean(
        activeEntry &&
        cardState === 'question' &&
        (scores[currentTeam] || 0) > 0 &&
        (scores[currentTeam] || 0) >= CLUE_PURCHASE_COST &&
        hasHiddenHintLetters(activeEntry, activeHintBaseline)
    );
    const showBuyClueButton = currentTeamClues <= 0;
    const cluePreview =
        activeEntry && (activeEntry.revealedLetterIndices?.length || 0) > 0
            ? buildHintPreview(activeEntry, activeHintBaseline, isMobileViewport ? '' : '\u2009')
            : '';
    const openCardButtonLabel = isWheelSpinning ? 'Spinning...' : hasStartedWheel ? 'Continue' : 'Start';
    const mobileUsesTwoRowHeader = isMobileViewport && teamNames.length >= 4;
    const mobileHeaderColumns = teamNames.length >= 5 ? 3 : teamNames.length === 4 ? 2 : Math.max(teamNames.length, 1);

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
            <div ref={headerRef} className={`bg-slate-800 border-b border-slate-700 ${mobileUsesTwoRowHeader ? 'px-2 py-1.5 h-[114px]' : 'p-2 min-h-[70px]'} sm:p-4 shrink-0 sm:min-h-[140px]`}>
                <div className={`flex ${mobileUsesTwoRowHeader ? 'gap-2 items-start' : 'gap-3 sm:gap-4 items-center'}`}>
                    <div className={`flex min-w-fit shrink-0 ${mobileUsesTwoRowHeader ? 'gap-1' : 'gap-1.5'} sm:flex-col sm:items-start sm:gap-2 sm:min-w-[64px] ${mobileUsesTwoRowHeader ? 'flex-col items-start' : 'flex-row items-center'}`}>
                        <button
                            onClick={() => setShowQuitConfirm(true)}
                            className={`${mobileUsesTwoRowHeader ? 'w-[30px] h-[30px] rounded-md' : 'w-9 h-9 rounded-lg'} sm:w-[140px] sm:h-auto sm:px-4 sm:py-2 sm:justify-center bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm font-bold flex items-center justify-center`}
                            title="Quit"
                        >
                            <ArrowLeft size={mobileUsesTwoRowHeader ? 14 : 17} className="sm:mr-2" />
                            <span className="hidden sm:inline">Quit</span>
                        </button>
                        <button
                            onClick={() => setShowEndGameConfirm(true)}
                            className={`${mobileUsesTwoRowHeader ? 'w-[30px] h-[30px] rounded-md' : 'w-9 h-9 rounded-lg'} sm:w-[140px] sm:h-auto sm:px-4 sm:py-2 sm:justify-center bg-rose-700/90 hover:bg-rose-600 text-white text-sm font-bold flex items-center justify-center`}
                            title="End game now"
                        >
                            <Flag size={mobileUsesTwoRowHeader ? 12 : 14} className="sm:mr-2" />
                            <span className="hidden sm:inline">End Game</span>
                        </button>
                        <button
                            onClick={() => setIsMuted((prev) => !prev)}
                            className={`sm:hidden ${mobileUsesTwoRowHeader ? 'w-[30px] h-[30px] rounded-md' : 'w-9 h-9 rounded-lg'} border border-slate-700 bg-slate-700 hover:bg-slate-600 text-slate-100 flex items-center justify-center`}
                            title={isMuted ? 'Unmute' : 'Mute'}
                        >
                            {isMuted ? <VolumeX size={mobileUsesTwoRowHeader ? 14 : 17} /> : <Volume2 size={mobileUsesTwoRowHeader ? 14 : 17} />}
                        </button>
                    </div>

                    <div
                        className={isMobileViewport
                            ? `flex-1 grid ${mobileUsesTwoRowHeader ? 'gap-1 content-start' : 'gap-1.5'} items-stretch`
                            : 'flex-1 flex items-center justify-end sm:justify-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar px-1 sm:px-4 h-full'}
                        style={isMobileViewport ? { gridTemplateColumns: `repeat(${mobileHeaderColumns}, minmax(0, 1fr))` } : undefined}
                    >
                        {scores.map((score, index) => {
                            const active = currentTeam === index;
                            return (
                                <button
                                    key={index}
                                    onClick={() => openEditTeam(index)}
                                    className={`${isMobileViewport ? `${mobileUsesTwoRowHeader ? 'h-[48px] py-0.5' : 'min-h-[52px] py-1'} w-full min-w-0 px-2 flex flex-col items-center justify-center overflow-hidden` : 'min-w-[110px] sm:min-w-[160px] px-2 py-2 sm:px-4 sm:py-3'} rounded-xl border text-center transition-all ${
                                        active ? 'bg-cyan-600/20 border-cyan-300 shadow-lg' : 'bg-slate-700/60 border-slate-600'
                                    } relative group`}
                                >
                                    <div className={`${mobileUsesTwoRowHeader ? 'text-[9px] leading-none mb-0.5' : 'text-[10px] leading-tight'} sm:text-sm uppercase tracking-wider text-cyan-100 font-bold truncate w-full`}>
                                        {teamNames[index]}
                                    </div>
                                    <div className={`font-mono font-black leading-none ${mobileUsesTwoRowHeader ? 'text-sm' : 'text-lg'} sm:text-4xl`}>{score}</div>
                                    <div className={`${mobileUsesTwoRowHeader ? 'mt-0.5 min-h-[6px]' : 'mt-0.5'} flex items-center justify-center gap-1`}>
                                        {Array.from({ length: MAX_TEAM_CLUES }).map((_, clueIndex) => {
                                            const cluesRemaining = teamCluesLeft[index] ?? 0;
                                            const hasClue = clueIndex < cluesRemaining;
                                            return (
                                                <span
                                                    key={clueIndex}
                                                    className={`${mobileUsesTwoRowHeader ? 'w-1.5 h-1.5' : 'w-2 h-2'} sm:w-2.5 sm:h-2.5 rounded-full ${
                                                        hasClue
                                                            ? 'bg-cyan-100 shadow-[0_0_6px_rgba(207,250,254,0.75)]'
                                                            : 'bg-slate-900/40 border border-cyan-100/35'
                                                    }`}
                                                />
                                            );
                                        })}
                                    </div>
                                    <div className="absolute top-1.5 right-1.5 rounded-full bg-slate-200/90 text-slate-800 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Edit2 size={10} />
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="hidden sm:flex shrink-0 flex-col items-end justify-center min-w-[72px] gap-2 self-center">
                        <button
                            onClick={toggleFullscreen}
                            className="flex w-10 h-10 items-center justify-center rounded-lg bg-slate-700 text-slate-100 hover:bg-slate-600"
                            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                        >
                            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                        </button>
                        <button
                            onClick={() => setIsMuted((prev) => !prev)}
                            className="flex w-10 h-10 items-center justify-center rounded-lg bg-slate-700 text-slate-100 hover:bg-slate-600"
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
                                        <div className="text-[10px] sm:text-2xl md:text-[28px] font-bold uppercase tracking-wide opacity-90 whitespace-nowrap text-right leading-none">
                                            {activeRelationHeader}
                                        </div>
                                        <div className="font-black leading-[0.82] [font-size:clamp(2.4rem,8vw,5.6rem)]">
                                            {activeEntry.letter}
                                        </div>
                                    </div>
                                    <div className="text-right justify-self-end">
                                        {hasTimer ? (
                                            <>
                                                <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                                                    <div className="font-black text-lg sm:text-3xl leading-none flex items-center justify-end">
                                                        <Clock size={16} className="mr-1" /> {timeLeft}s
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsTimerPaused((prev) => !prev)}
                                                        className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-white transition-colors ${
                                                            isTimerPaused
                                                                ? 'border-emerald-300 bg-emerald-500 hover:bg-emerald-400'
                                                                : 'border-white/25 bg-white/15 hover:bg-white/25'
                                                        }`}
                                                        title={isTimerPaused ? 'Resume timer' : 'Pause timer'}
                                                        aria-label={isTimerPaused ? 'Resume timer' : 'Pause timer'}
                                                    >
                                                        {isTimerPaused ? <Play size={15} fill="currentColor" /> : <Pause size={15} fill="currentColor" />}
                                                    </button>
                                                </div>
                                                <div className="font-bold text-[10px] sm:text-sm uppercase tracking-wide opacity-90 mt-1">
                                                    {isTimerPaused ? 'Paused' : `Clues ${teamCluesLeft[currentTeam] ?? 0}`}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="font-bold text-xs sm:text-sm uppercase tracking-wide opacity-80">No Timer</div>
                                                <div className="font-bold text-[10px] sm:text-sm uppercase tracking-wide opacity-90 mt-1">
                                                    Clues {teamCluesLeft[currentTeam] ?? 0}
                                                </div>
                                            </>
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
                                        className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-7 md:p-10 text-center flex flex-col items-center justify-start sm:justify-center"
                                    >
                                        {questionImageUrl && (
                                            <img
                                                src={questionImageUrl}
                                                alt={questionImageAlt}
                                                className="mb-4 h-[30vh] w-full max-w-full rounded-lg border border-slate-200 bg-white object-contain"
                                            />
                                        )}
                                        <p
                                            ref={questionTextRef}
                                            style={mobileQuestionFontSize ? { fontSize: `${mobileQuestionFontSize}px`, lineHeight: '1.14' } : undefined}
                                            className="font-display font-bold text-slate-800 leading-tight text-3xl sm:text-4xl md:text-5xl whitespace-pre-wrap break-words"
                                        >
                                            {activeEntry.question}
                                        </p>
                                        {cluePreview && (
                                            <div className="mt-5 px-4 py-3 sm:px-5 sm:py-4 rounded-xl bg-sky-50 border border-sky-200 w-full max-w-4xl">
                                                <div className="text-sm sm:text-base md:text-lg uppercase tracking-wide text-sky-700 font-black mb-2">
                                                    Clue reveal
                                                </div>
                                                <div
                                                    ref={cluePreviewTextRef}
                                                    style={mobileClueFontSize ? { fontSize: `${mobileClueFontSize}px`, lineHeight: '1.08' } : undefined}
                                                    className="font-mono font-black text-slate-800 text-3xl sm:text-4xl md:text-5xl leading-tight whitespace-nowrap"
                                                >
                                                    {cluePreview}
                                                </div>
                                            </div>
                                        )}
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
                                        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-3">
                                            <button
                                                type="submit"
                                                className="py-3 sm:py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-sm sm:text-2xl disabled:opacity-50"
                                                disabled={!input.trim()}
                                            >
                                                Submit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handlePass(false)}
                                                className="py-3 sm:py-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-black text-sm sm:text-2xl disabled:opacity-45 disabled:cursor-not-allowed"
                                                disabled={!canPassCurrent}
                                            >
                                                Pass
                                            </button>
                                            <button
                                                type="button"
                                                onClick={showBuyClueButton ? handleBuyClue : handleUseClue}
                                                className={`py-3 sm:py-4 rounded-xl text-white font-black text-sm sm:text-xl disabled:opacity-45 disabled:cursor-not-allowed ${
                                                    showBuyClueButton
                                                        ? 'bg-slate-700 hover:bg-slate-600'
                                                        : 'bg-sky-600 hover:bg-sky-500'
                                                }`}
                                                disabled={showBuyClueButton ? !canBuyClueCurrent : !canUseClueCurrent}
                                            >
                                                {showBuyClueButton
                                                    ? `Buy Clue (-${CLUE_PURCHASE_COST})`
                                                    : `Use Clue (${currentTeamClues})`}
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
                                                {Number(revealState.speedBonus) > 0 ? (
                                                    <div className="mt-2 text-center">
                                                        <p className="text-lg sm:text-3xl font-black text-slate-700">
                                                            {activeEntry.points} points
                                                        </p>
                                                        <p className="mt-1 text-base sm:text-2xl font-black text-green-600">
                                                            + {revealState.speedBonus} bonus points!
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <p className="mt-2 text-lg sm:text-3xl font-black text-slate-700">
                                                        {activeEntry.points} points
                                                    </p>
                                                )}
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
                <div className="fixed inset-0 z-[900] bg-black/50 backdrop-blur-sm p-4 flex items-center justify-center">
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

            {showEndGameConfirm && (
                <div className="fixed inset-0 z-[900] bg-black/50 backdrop-blur-sm p-4 flex items-center justify-center">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center">
                        <button
                            onClick={() => setShowEndGameConfirm(false)}
                            className="ml-auto mb-2 text-slate-400 hover:text-slate-600 block"
                            aria-label="Close"
                        >
                            <X size={20} />
                        </button>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">End game now?</h2>
                        <p className="text-slate-500 text-sm mb-5">The game will stop immediately and all remaining answers will be revealed.</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setShowEndGameConfirm(false)}
                                className="py-2.5 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEndGameNow}
                                className="py-2.5 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700"
                            >
                                End game now
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

