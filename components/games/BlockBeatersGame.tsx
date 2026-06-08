import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, CheckCircle, Clock, Crown, Edit2, Flag, Maximize2, Minimize2, RotateCcw, Shield, Volume2, VolumeX, X, XCircle } from 'lucide-react';
import { GeneratedGame, GeneratedQuestion, GameRunOptions } from '../../types';
import { playSound } from '../../utils/gameUtils';
import { resolveGameQuestionImageUrl } from '../../utils/gameImage';
import { WinnerCeremonyHero, WinnerCeremonyStandingsTable } from './shared/WinnerCeremonyHero';

interface BlockBeatersGameProps {
    game: GeneratedGame;
    options: GameRunOptions;
    onBack: () => void;
    onFinish: () => void;
    onReplay: () => void;
}

const AnimatedScore: React.FC<{ score: number; className?: string; diffClassName?: string }> = ({ score, className, diffClassName }) => {
    const [displayScore, setDisplayScore] = useState(score);
    const [diff, setDiff] = useState(0);

    useEffect(() => {
        if (score === displayScore) return;
        const difference = score - displayScore;
        setDiff(difference);
        const step = difference > 0 ? Math.ceil(difference / 20) : Math.floor(difference / 20);
        const timer = window.setInterval(() => {
            setDisplayScore((prev) => {
                const next = prev + step;
                if ((difference > 0 && next >= score) || (difference < 0 && next <= score)) {
                    window.clearInterval(timer);
                    window.setTimeout(() => setDiff(0), 1000);
                    return score;
                }
                return next;
            });
        }, 30);
        return () => window.clearInterval(timer);
    }, [score, displayScore]);

    return (
        <div className="relative">
            <div className={`font-mono font-black leading-none tracking-tight transition-all ${className || 'text-5xl'}`}>{displayScore}</div>
            {diff !== 0 && (
                <div className={`pointer-events-none absolute left-1/2 -translate-x-1/2 font-bold ${diffClassName || 'text-xl'} ${diff > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {diff > 0 ? '+' : ''}{diff}
                </div>
            )}
        </div>
    );
};

type TileOwner = number | null;
type BonusKind = 'free' | 'steal' | 'remove' | 'shield' | 'extra-turn' | 'swap';
type BonusAction = Exclude<BonusKind, 'extra-turn'>;

interface HexTile {
    id: number;
    row: number;
    col: number;
    label: string;
    questionIndex: number;
    owner: TileOwner;
    shielded: boolean;
    bonus?: BonusKind;
    bonusUsed?: boolean;
}

interface HeldBonusCard {
    id: number;
    kind: BonusKind;
    team: number;
}

const MAX_STEALS_PER_TEAM = 3;

const PLAYER_COLORS = [
    { name: 'Teal', base: '#0f766e', strong: '#0d9488', soft: '#ccfbf1', text: '#f0fdfa' },
    { name: 'Coral', base: '#e11d48', strong: '#fb7185', soft: '#ffe4e6', text: '#fff1f2' },
    { name: 'Blue', base: '#2563eb', strong: '#38bdf8', soft: '#dbeafe', text: '#eff6ff' },
    { name: 'Orange', base: '#ea580c', strong: '#fb923c', soft: '#ffedd5', text: '#fff7ed' },
];

const BOARD_SIZES = {
    small: 5,
    medium: 6,
    large: 7,
} as const;

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const BONUS_KINDS: BonusKind[] = ['free', 'steal', 'remove', 'shield', 'extra-turn', 'swap'];

const normalizeAnswer = (value: string) =>
    String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^(a|an|the)\s+/, '');

const getTeamNames = (count: number, provided?: string[]) =>
    Array.from({ length: count }, (_, index) => provided?.[index]?.trim() || (count === 1 ? 'Player 1' : `Team ${index + 1}`));

const getNeighbors = (tile: HexTile, tiles: HexTile[]) => {
    const byPos = new Map(tiles.map((item) => [`${item.row},${item.col}`, item]));
    const offsets = tile.row % 2 === 0
        ? [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]]
        : [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]];
    return offsets
        .map(([dr, dc]) => byPos.get(`${tile.row + dr},${tile.col + dc}`))
        .filter((item): item is HexTile => Boolean(item));
};

const checkPath = (tiles: HexTile[], player: number, size: number) => {
    const owned = tiles.filter((tile) => tile.owner === player);
    const starts =
        player === 0 ? owned.filter((tile) => tile.col === 0) :
        player === 1 ? owned.filter((tile) => tile.row === 0) :
        player === 2 ? owned.filter((tile) => tile.col === size - 1) :
        owned.filter((tile) => tile.row === size - 1);
    const isTarget = (tile: HexTile) =>
        player === 0 ? tile.col === size - 1 :
        player === 1 ? tile.row === size - 1 :
        player === 2 ? tile.col === 0 :
        tile.row === 0;

    const queue = [...starts];
    const seen = new Set(queue.map((tile) => tile.id));
    while (queue.length) {
        const tile = queue.shift()!;
        if (isTarget(tile)) return true;
        getNeighbors(tile, tiles).forEach((next) => {
            if (next.owner !== player || seen.has(next.id)) return;
            seen.add(next.id);
            queue.push(next);
        });
    }
    return false;
};

const makeTiles = (size: number, enableBonuses: boolean): HexTile[] => {
    const total = size * size;
    const bonusCount = enableBonuses ? Math.max(2, Math.floor(total * 0.16)) : 0;
    const bonusSlots = new Set<number>();
    while (bonusSlots.size < bonusCount) bonusSlots.add(Math.floor(Math.random() * total));

    return Array.from({ length: total }, (_, id) => {
        return {
            id,
            row: Math.floor(id / size),
            col: id % size,
            label: String(id + 1),
            questionIndex: -1,
            owner: null,
            shielded: false,
            bonus: bonusSlots.has(id) ? BONUS_KINDS[id % BONUS_KINDS.length] : undefined,
        };
    });
};

const bonusLabel = (bonus?: BonusKind) =>
    bonus === 'free' ? 'Free tile' :
    bonus === 'steal' ? 'Steal tile' :
    bonus === 'remove' ? 'Remove tile' :
    bonus === 'shield' ? 'Shield tile' :
    bonus === 'extra-turn' ? 'Extra turn' :
    bonus === 'swap' ? 'Swap tile' : '';

const bonusDetail = (bonus?: BonusKind) =>
    bonus === 'free' ? 'Claim one empty tile.' :
    bonus === 'steal' ? 'Turn one opponent tile into yours.' :
    bonus === 'remove' ? 'Remove one opponent tile from the board.' :
    bonus === 'shield' ? 'Protect one of your tiles.' :
    bonus === 'extra-turn' ? 'Keep the turn and play again.' :
    bonus === 'swap' ? 'Swap one of your tiles with an opponent tile.' : '';

const getDirectionLabel = (index: number) =>
    index === 0 ? 'Left to right' :
    index === 1 ? 'Top to bottom' :
    index === 2 ? 'Right to left' :
    'Bottom to top';

const HEX_R = 44;
const HEX_W = Math.sqrt(3) * HEX_R;
const HEX_H = 2 * HEX_R;
const HEX_STROKE = 2;

const getHexPoints = (cx: number, cy: number, radius = HEX_R) => {
    const points = [
        [cx, cy - radius],
        [cx + (Math.sqrt(3) * radius) / 2, cy - radius / 2],
        [cx + (Math.sqrt(3) * radius) / 2, cy + radius / 2],
        [cx, cy + radius],
        [cx - (Math.sqrt(3) * radius) / 2, cy + radius / 2],
        [cx - (Math.sqrt(3) * radius) / 2, cy - radius / 2],
    ];
    return points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
};

const getRowParity = (row: number) => ((row % 2) + 2) % 2;

const getTileCenter = (row: number, col: number) => {
    const x = HEX_W + (col + 1) * HEX_W + getRowParity(row) * (HEX_W / 2);
    const y = HEX_R + (row + 1) * 1.5 * HEX_R;
    return { x, y };
};

export const BlockBeatersGame: React.FC<BlockBeatersGameProps> = ({ game, options, onBack, onFinish, onReplay }) => {
    const teamCount = Math.max(1, Math.min(4, options.players || 1));
    const teamNames = useMemo(() => getTeamNames(teamCount, options.teamNames), [teamCount, options.teamNames]);
    const mode = options.blockBeatersMode || game.config.blockBeatersMode || 'letters';
    const boardSizeKey = options.blockBeatersBoardSize || 'small';
    const size = BOARD_SIZES[boardSizeKey] || BOARD_SIZES.small;
    const fixedPoints = Math.max(1, Number(options.blockBeatersPoints || 10));
    const questions = useMemo(() => {
        const pool = [...(game.questions || [])].filter((question) => question.question && question.answer);
        if (options.randomizeQuestions) pool.sort(() => Math.random() - 0.5);
        return pool.length ? pool : [{ id: 0, question: 'No question saved.', answer: 'Answer', points: fixedPoints, isBonus: false }];
    }, [game.questions, options.randomizeQuestions, fixedPoints]);

    const [tiles, setTiles] = useState<HexTile[]>(() => makeTiles(size, Boolean(options.enableBonuses)));
    const [scores, setScores] = useState<number[]>(() => Array(teamCount).fill(0));
    const [correctCounts, setCorrectCounts] = useState<number[]>(() => Array(teamCount).fill(0));
    const [stealCounts, setStealCounts] = useState<number[]>(() => Array(teamCount).fill(0));
    const [currentTeam, setCurrentTeam] = useState(0);
    const [activeTileId, setActiveTileId] = useState<number | null>(null);
    const [activeQuestionIndex, setActiveQuestionIndex] = useState<number | null>(null);
    const [activeIsSteal, setActiveIsSteal] = useState(false);
    const [usedQuestionIndices, setUsedQuestionIndices] = useState<Set<number>>(() => new Set());
    const [isFlipped, setIsFlipped] = useState(false);
    const [typedAnswer, setTypedAnswer] = useState('');
    const [selectedMcAnswer, setSelectedMcAnswer] = useState('');
    const [mcResult, setMcResult] = useState<'correct' | 'incorrect' | null>(null);
    const [isGameOver, setIsGameOver] = useState(false);
    const [isMuted, setIsMuted] = useState(Boolean(options.muted));
    const [pendingFinal, setPendingFinal] = useState<number | null>(null);
    const [finalQuestionIndex, setFinalQuestionIndex] = useState(0);
    const [questionCardKey, setQuestionCardKey] = useState(0);
    const [bonusAction, setBonusAction] = useState<BonusAction | null>(null);
    const [bonusIntroTileId, setBonusIntroTileId] = useState<number | null>(null);
    const [awardedBonus, setAwardedBonus] = useState<{ kind: BonusKind; tiles: HexTile[]; oldOwner: TileOwner; tileId: number; extraTurn: boolean } | null>(null);
    const [heldBonusCards, setHeldBonusCards] = useState<HeldBonusCard[]>([]);
    const [activeBonusCardId, setActiveBonusCardId] = useState<number | null>(null);
    const [bonusCardPages, setBonusCardPages] = useState<number[]>(() => Array(teamCount).fill(0));
    const [reviewBonusKind, setReviewBonusKind] = useState<BonusKind | null>(null);
    const [swapSource, setSwapSource] = useState<number | null>(null);
    const [queuedExtraTurn, setQueuedExtraTurn] = useState(false);
    const [immediateBonusEndsTurn, setImmediateBonusEndsTurn] = useState(false);
    const [showQuitConfirm, setShowQuitConfirm] = useState(false);
    const [showEndGameConfirm, setShowEndGameConfirm] = useState(false);
    const [editingTeamIndex, setEditingTeamIndex] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editScore, setEditScore] = useState(0);
    const [localTeamNames, setLocalTeamNames] = useState(teamNames);
    const [timeLeft, setTimeLeft] = useState(options.timerSeconds || 0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const [resizeTick, setResizeTick] = useState(0);
    const [questionFontSize, setQuestionFontSize] = useState<number | null>(null);
    const [answerFontSize, setAnswerFontSize] = useState<number | null>(null);
    const [optionFontSize, setOptionFontSize] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<number | null>(null);
    const questionWrapRef = useRef<HTMLDivElement>(null);
    const questionTextRef = useRef<HTMLDivElement>(null);
    const answerWrapRef = useRef<HTMLDivElement>(null);
    const answerTextRef = useRef<HTMLDivElement>(null);
    const optionGridRef = useRef<HTMLDivElement>(null);
    const optionMeasureRef = useRef<HTMLDivElement>(null);

    const activeTile = activeTileId !== null ? tiles.find((tile) => tile.id === activeTileId) || null : null;
    const activeQuestion = questions[activeQuestionIndex ?? activeTile?.questionIndex ?? 0] || questions[0];
    const finalQuestion = questions[finalQuestionIndex % questions.length] || activeQuestion;
    const shownQuestion = pendingFinal !== null ? finalQuestion : activeQuestion;
    const showBonusIntro = bonusIntroTileId !== null && activeTileId !== null && !isFlipped && !awardedBonus;
    const showBonusAward = awardedBonus !== null;
    const hasOptions = mode === 'numbers' && Array.isArray(shownQuestion?.options) && shownQuestion.options.length > 0;
    const questionImageUrl = resolveGameQuestionImageUrl(shownQuestion?.image);
    const questionImageAlt = shownQuestion?.image?.alt || '';
    const timerProgress = options.timerSeconds > 0 ? Math.max(0, Math.min(1, timeLeft / options.timerSeconds)) : 0;

    const ranking = useMemo(() => localTeamNames.map((name, index) => ({
        index,
        name,
        score: scores[index] || 0,
    })).sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (correctCounts[b.index] || 0) - (correctCounts[a.index] || 0);
    }), [localTeamNames, scores, correctCounts]);

    useEffect(() => {
        setTiles(makeTiles(size, Boolean(options.enableBonuses)));
        setUsedQuestionIndices(new Set());
        setActiveTileId(null);
        setActiveQuestionIndex(null);
        setPendingFinal(null);
        setBonusIntroTileId(null);
        setAwardedBonus(null);
        setHeldBonusCards([]);
        setActiveBonusCardId(null);
        setReviewBonusKind(null);
    }, [size, options.enableBonuses]);

    useEffect(() => {
        const handleFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);

    useEffect(() => {
        const media = window.matchMedia('(max-width: 639px)');
        const handleChange = () => setIsMobileViewport(media.matches);
        handleChange();
        media.addEventListener('change', handleChange);
        return () => media.removeEventListener('change', handleChange);
    }, []);

    useEffect(() => {
        setBonusCardPages((prev) => Array.from({ length: teamCount }, (_, index) => prev[index] || 0));
    }, [teamCount]);

    useEffect(() => {
        setBonusCardPages((prev) => prev.map((page, teamIndex) => {
            const teamCards = heldBonusCards.filter((card) => card.team === teamIndex);
            if (!teamCards.length) return 0;
            return Math.min(page, teamCards.length - 1);
        }));
    }, [heldBonusCards]);

    useEffect(() => {
        const handleResize = () => setResizeTick((prev) => prev + 1);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const shouldLock = !isGameOver && (
            activeTileId !== null ||
            pendingFinal !== null ||
            editingTeamIndex !== null ||
            showQuitConfirm ||
            showEndGameConfirm
        );
        document.body.style.overflow = shouldLock ? 'hidden' : 'auto';
        return () => { document.body.style.overflow = 'auto'; };
    }, [activeTileId, pendingFinal, editingTeamIndex, showQuitConfirm, showEndGameConfirm, isGameOver]);

    useEffect(() => {
        if (activeTileId === null || isFlipped || isGameOver || showBonusIntro || showBonusAward || pendingFinal === null && !activeTile) return;
        if (options.timerSeconds <= 0) return;
        if (timerRef.current) window.clearInterval(timerRef.current);
        timerRef.current = window.setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    if (timerRef.current) window.clearInterval(timerRef.current);
                    playSound('times-up', isMuted, options.soundConfig?.timesUp);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => {
            if (timerRef.current) window.clearInterval(timerRef.current);
        };
    }, [activeTileId, activeTile, isFlipped, isGameOver, showBonusIntro, showBonusAward, options.timerSeconds, pendingFinal, isMuted, options.soundConfig]);

    const nextTeam = (extraTurn = false) => {
        if (!extraTurn) setCurrentTeam((prev) => (prev + 1) % teamCount);
    };

    const openTile = (tile: HexTile) => {
        if (bonusAction) {
            applyBonusTarget(tile);
            return;
        }
        if (tile.owner !== null && (tile.owner === currentTeam || options.blockBeatersSteals === false)) return;
        const isStealAttempt = tile.owner !== null && tile.owner !== currentTeam;
        if (isStealAttempt && (stealCounts[currentTeam] || 0) >= MAX_STEALS_PER_TEAM) return;
        const nextQuestionIndex = chooseQuestionIndex(tile.questionIndex);
        playSound(tile.bonus && !tile.bonusUsed ? 'bonus' : 'select', isMuted, tile.bonus && !tile.bonusUsed ? options.soundConfig?.bonus : options.soundConfig?.select);
        setActiveTileId(tile.id);
        setActiveQuestionIndex(nextQuestionIndex);
        setActiveIsSteal(isStealAttempt);
        setIsFlipped(false);
        setTypedAnswer('');
        setSelectedMcAnswer('');
        setMcResult(null);
        setBonusIntroTileId(tile.bonus && !tile.bonusUsed ? tile.id : null);
        setAwardedBonus(null);
        setTimeLeft(options.timerSeconds || 0);
    };

    const chooseQuestionIndex = (avoidQuestionIndex?: number) => {
        const avoid = new Set(usedQuestionIndices);
        if (typeof avoidQuestionIndex === 'number' && avoidQuestionIndex >= 0) avoid.add(avoidQuestionIndex);
        const anyUnused = questions
            .map((_, index) => index)
            .filter((index) => !avoid.has(index));
        if (anyUnused.length) return anyUnused[0];
        const fallback = questions
            .map((_, index) => index)
            .find((index) => index !== avoidQuestionIndex);
        return fallback ?? 0;
    };

    const checkTypedAnswer = () => {
        const guess = normalizeAnswer(typedAnswer);
        const candidates = [shownQuestion.answer, ...(shownQuestion.answerAliases || [])].map(normalizeAnswer);
        if (!guess) return false;
        const answerMatches = candidates.includes(guess);
        if (mode !== 'letters') return answerMatches;
        const required = (shownQuestion.letter || shownQuestion.answer || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 1);
        if (!required) return answerMatches;
        return answerMatches && normalizeAnswer(shownQuestion.answer).toUpperCase().startsWith(required);
    };

    const chooseMc = (answer: string) => {
        setSelectedMcAnswer(answer);
        const correct = normalizeAnswer(answer) === normalizeAnswer(shownQuestion.answer);
        setMcResult(correct ? 'correct' : 'incorrect');
        playSound(correct ? 'correct' : 'incorrect', isMuted, correct ? options.soundConfig?.correct : options.soundConfig?.incorrect);
        setIsFlipped(true);
    };

    const checkAndRevealTypedAnswer = () => {
        const correct = checkTypedAnswer();
        setMcResult(correct ? 'correct' : 'incorrect');
        playSound(correct ? 'correct' : 'incorrect', isMuted, correct ? options.soundConfig?.correct : options.soundConfig?.incorrect);
        setIsFlipped(true);
    };

    const startFinalQuestion = (teamIndex: number, excludeQuestionIndex?: number) => {
        const nextFinalQuestionIndex = chooseQuestionIndex(excludeQuestionIndex);
        setActiveTileId(null);
        setIsFlipped(false);
        setQuestionCardKey((key) => key + 1);
        setFinalQuestionIndex(nextFinalQuestionIndex);
        setPendingFinal(teamIndex);
        setActiveQuestionIndex(nextFinalQuestionIndex);
        setActiveIsSteal(false);
        setBonusIntroTileId(null);
        setAwardedBonus(null);
        setTypedAnswer('');
        setSelectedMcAnswer(null);
        setMcResult(null);
        setTimeLeft(options.timerSeconds || 0);
    };

    const finishClaimedTileTurn = (tilesAfterClaim: HexTile[], oldOwner: TileOwner, extraTurn = false, tileId = activeTileId) => {
        if (oldOwner !== currentTeam && checkPath(tilesAfterClaim, currentTeam, size)) {
            startFinalQuestion(currentTeam, activeQuestionIndex ?? undefined);
            return;
        }
        setActiveTileId(null);
        setActiveQuestionIndex(null);
        setActiveIsSteal(false);
        setBonusIntroTileId(null);
        setAwardedBonus(null);
        setIsFlipped(false);
        nextTeam(extraTurn);
    };

    const createHeldBonusCard = (kind: BonusKind, team = currentTeam): HeldBonusCard => ({
        id: Date.now() + Math.floor(Math.random() * 1000),
        kind,
        team,
    });

    const startBonusAction = (card: HeldBonusCard, allowAwardedCard = false) => {
        if (card.team !== currentTeam || bonusAction || (!allowAwardedCard && (activeTileId !== null || pendingFinal !== null))) return;
        if (card.kind === 'extra-turn') {
            setHeldBonusCards((prev) => prev.filter((item) => item.id !== card.id));
            setActiveBonusCardId(null);
            setQueuedExtraTurn(true);
            return;
        }
        setBonusAction(
            card.kind === 'free' ? 'free' :
            card.kind === 'steal' ? 'steal' :
            card.kind === 'remove' ? 'remove' :
            card.kind === 'shield' ? 'shield' :
            'swap'
        );
        setActiveBonusCardId(card.id);
    };

    const activateAwardedBonus = () => {
        if (!awardedBonus) return;
        if (awardedBonus.kind === 'extra-turn') {
            finishClaimedTileTurn(awardedBonus.tiles, awardedBonus.oldOwner, true, awardedBonus.tileId);
            return;
        }
        const card = createHeldBonusCard(awardedBonus.kind);
        setHeldBonusCards((prev) => [...prev, card]);
        startBonusAction(card, true);
        setImmediateBonusEndsTurn(true);
        setActiveTileId(null);
        setActiveQuestionIndex(null);
        setActiveIsSteal(false);
        setBonusIntroTileId(null);
        setAwardedBonus(null);
        setIsFlipped(false);
    };

    const saveAwardedBonus = () => {
        if (!awardedBonus) return;
        const card = createHeldBonusCard(awardedBonus.kind);
        setHeldBonusCards((prev) => [...prev, card]);
        finishClaimedTileTurn(awardedBonus.tiles, awardedBonus.oldOwner, false, awardedBonus.tileId);
    };

    const finishAnswer = (correct: boolean, playFeedback = true) => {
        if (playFeedback) {
            playSound(correct ? 'correct' : 'incorrect', isMuted, correct ? options.soundConfig?.correct : options.soundConfig?.incorrect);
        }
        if (pendingFinal !== null) {
            setUsedQuestionIndices((prev) => {
                const next = new Set(prev);
                next.add(finalQuestionIndex % questions.length);
                return next;
            });
            if (correct) {
                setScores((prev) => prev.map((score, index) => index === pendingFinal ? score + fixedPoints : score));
                setCorrectCounts((prev) => prev.map((count, index) => index === pendingFinal ? count + 1 : count));
                setIsGameOver(true);
                playSound('win', isMuted, options.soundConfig?.win);
            } else {
                setPendingFinal(null);
                setActiveTileId(null);
                setActiveQuestionIndex(null);
                setActiveIsSteal(false);
                setIsFlipped(false);
                nextTeam(false);
            }
            return;
        }
        if (!activeTile) return;
        const resolvedQuestionIndex = activeQuestionIndex ?? activeTile.questionIndex;
        setUsedQuestionIndices((prev) => {
            const next = new Set(prev);
            next.add(resolvedQuestionIndex);
            return next;
        });
        if (activeIsSteal) {
            setStealCounts((prev) => prev.map((count, index) => index === currentTeam ? count + 1 : count));
        }
        if (!correct) {
            setActiveTileId(null);
            setActiveQuestionIndex(null);
            setActiveIsSteal(false);
            setIsFlipped(false);
            const keepTurn = queuedExtraTurn;
            setQueuedExtraTurn(false);
            nextTeam(keepTurn);
            return;
        }

        const oldOwner = activeTile.owner;
        let extraTurn = queuedExtraTurn;
        setQueuedExtraTurn(false);
        const nextTiles = tiles.map((tile) => {
            if (tile.id !== activeTile.id) return tile;
            if (tile.shielded && tile.owner !== currentTeam) return { ...tile, shielded: false };
            return {
                ...tile,
                owner: currentTeam,
                shielded: false,
                questionIndex: resolvedQuestionIndex,
                label: tile.label,
            };
        });

        setScores((prev) => prev.map((score, index) => index === currentTeam ? score + fixedPoints : score));
        setCorrectCounts((prev) => prev.map((count, index) => index === currentTeam ? count + 1 : count));

        const bonus = activeTile.bonusUsed ? undefined : activeTile.bonus;
        const withBonusUsed = bonus ? nextTiles.map((tile) => tile.id === activeTile.id ? { ...tile, bonusUsed: true } : tile) : nextTiles;
        setTiles(withBonusUsed);

        if (bonus === 'extra-turn') extraTurn = true;
        if (bonus) {
            setAwardedBonus({ kind: bonus, tiles: withBonusUsed, oldOwner, tileId: activeTile.id, extraTurn });
            setBonusIntroTileId(null);
            setIsFlipped(false);
            playSound('bonus', isMuted, options.soundConfig?.bonus);
            return;
        }
        finishClaimedTileTurn(withBonusUsed, oldOwner, extraTurn, activeTile.id);
    };

    const applyBonusTarget = (tile: HexTile) => {
        if (!bonusAction) return;
        let closeBonus = true;
        let nextBoardState: HexTile[] | null = null;
        setTiles((current) => {
            if (bonusAction === 'free' && tile.owner === null) {
                nextBoardState = current.map((item) => item.id === tile.id ? { ...item, owner: currentTeam, shielded: false } : item);
                return nextBoardState;
            }
            if (bonusAction === 'steal' && tile.owner !== null && tile.owner !== currentTeam) {
                nextBoardState = current.map((item) => item.id === tile.id ? (item.shielded ? { ...item, shielded: false } : { ...item, owner: currentTeam, shielded: false }) : item);
                return nextBoardState;
            }
            if (bonusAction === 'remove' && tile.owner !== null && tile.owner !== currentTeam) {
                nextBoardState = current.map((item) => item.id === tile.id ? (item.shielded ? { ...item, shielded: false } : { ...item, owner: null, shielded: false }) : item);
                return nextBoardState;
            }
            if (bonusAction === 'shield' && tile.owner === currentTeam) {
                nextBoardState = current.map((item) => item.id === tile.id ? { ...item, shielded: true } : item);
                return nextBoardState;
            }
            if (bonusAction === 'swap') {
                if (swapSource === null && tile.owner !== null) {
                    closeBonus = false;
                    setSwapSource(tile.id);
                    return current;
                }
                if (swapSource !== null && tile.owner !== null) {
                    const source = current.find((item) => item.id === swapSource);
                    const sourceIsCurrentTeam = source?.owner === currentTeam;
                    const targetIsCurrentTeam = tile.owner === currentTeam;
                    if (!source || source.id === tile.id || sourceIsCurrentTeam === targetIsCurrentTeam) {
                        closeBonus = false;
                        return current;
                    }
                    nextBoardState = current.map((item) => {
                        if (item.id === swapSource) return { ...item, owner: tile.owner, shielded: false };
                        if (item.id === tile.id) return { ...item, owner: source?.owner ?? currentTeam, shielded: false };
                        return item;
                    });
                    return nextBoardState;
                }
            }
            closeBonus = false;
            return current;
        });
        if (closeBonus) {
            setBonusAction(null);
            setSwapSource(null);
            if (activeBonusCardId !== null) {
                setHeldBonusCards((prev) => prev.filter((card) => card.id !== activeBonusCardId));
                setActiveBonusCardId(null);
            }
            if (nextBoardState && checkPath(nextBoardState, currentTeam, size)) {
                setImmediateBonusEndsTurn(false);
                startFinalQuestion(currentTeam);
            } else if (immediateBonusEndsTurn) {
                setImmediateBonusEndsTurn(false);
                nextTeam(false);
            }
        }
    };

    const saveTeamEdit = () => {
        if (editingTeamIndex === null) return;
        setLocalTeamNames((prev) => prev.map((name, index) => index === editingTeamIndex ? editName.trim() || name : name));
        setScores((prev) => prev.map((score, index) => index === editingTeamIndex ? Number(editScore) || 0 : score));
        setEditingTeamIndex(null);
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
        else document.exitFullscreen().catch(() => undefined);
    };

    const boardTopOffset = HEX_STROKE * 2;
    const boardViewWidth = (size + 3) * HEX_W + HEX_STROKE * 2;
    const boardViewHeight = boardTopOffset + 2 * HEX_R + (size + 1) * 1.5 * HEX_R + HEX_STROKE * 2;
    const tileRows = Array.from({ length: size }, (_, row) => tiles.filter((tile) => tile.row === row));
    const leftRailColor = PLAYER_COLORS[0];
    const rightRailColor = teamCount >= 3 ? PLAYER_COLORS[2] : PLAYER_COLORS[0];
    const topRailColor = teamCount >= 2 ? PLAYER_COLORS[1] : null;
    const bottomRailColor = teamCount >= 4 ? PLAYER_COLORS[3] : topRailColor;
    const mobileUsesTwoRowHeader = isMobileViewport && teamCount >= 4;
    const mobileHeaderColumns = teamCount >= 4 ? 2 : Math.max(teamCount, 1);
    const questionOverlayTopClass = isFullscreen
        ? `${mobileUsesTwoRowHeader ? 'top-[calc(7rem+env(safe-area-inset-top))]' : 'top-[calc(4.5rem+env(safe-area-inset-top))]'} sm:top-[calc(8.75rem+env(safe-area-inset-top))]`
        : `${mobileUsesTwoRowHeader ? 'top-[calc(11rem+env(safe-area-inset-top))]' : 'top-[calc(8.5rem+env(safe-area-inset-top))]'} sm:top-[calc(12.75rem+env(safe-area-inset-top))]`;
    const canUseBonusBeforeTile = activeTileId === null && pendingFinal === null && !bonusAction;
    const currentTeamBonusCards = heldBonusCards.filter((card) => card.team === currentTeam);
    const currentTeamBonusPage = currentTeamBonusCards.length
        ? Math.min(bonusCardPages[currentTeam] || 0, currentTeamBonusCards.length - 1)
        : 0;
    const currentTeamBonusCard = currentTeamBonusCards[currentTeamBonusPage] || null;
    const compactBonusSlots = isMobileViewport;
    const currentTeamStealsRemaining = Math.max(0, MAX_STEALS_PER_TEAM - (stealCounts[currentTeam] || 0));
    const swapSourceTile = swapSource !== null ? tiles.find((tile) => tile.id === swapSource) : null;
    const bonusCardStatus = activeBonusCardId === currentTeamBonusCard?.id
        ? bonusAction === 'swap'
            ? swapSourceTile
                ? swapSourceTile.owner === currentTeam ? 'Pick opponent tile' : 'Pick your tile'
                : 'Pick any owned tile'
            : 'Pick target tile'
        : queuedExtraTurn && currentTeamBonusCard?.kind === 'extra-turn'
            ? 'Ready for next tile'
            : 'Ready';

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

    const getOptionFontSizeClass = (text: string) => {
        const len = text ? text.length : 0;
        if (len < 20) return 'text-3xl md:text-5xl';
        if (len < 35) return 'text-2xl md:text-4xl';
        if (len < 60) return 'text-xl md:text-3xl';
        return 'text-lg md:text-2xl';
    };

    const stripOptionPrefix = (value: string) => value.replace(/^[A-D]\)\s*/i, '').trim();

    useLayoutEffect(() => {
        if (!shownQuestion || isFlipped) {
            setQuestionFontSize(null);
            return;
        }
        const wrap = questionWrapRef.current;
        const textEl = questionTextRef.current;
        if (!wrap || !textEl) return;
        const availableHeight = Math.max(0, wrap.clientHeight - (mode === 'letters' ? 58 : 0));
        const availableWidth = textEl.clientWidth;
        if (availableHeight === 0 || availableWidth === 0) return;
        const maxSize = Math.min(hasOptions ? 48 : 64, Math.max(20, Math.floor(window.innerWidth / (hasOptions ? 9 : 8))));
        const minSize = 12;
        let fontSize = maxSize;
        textEl.style.lineHeight = '1.15';
        textEl.style.fontSize = `${fontSize}px`;
        while ((textEl.scrollHeight > availableHeight || textEl.scrollWidth > availableWidth) && fontSize > minSize) {
            fontSize -= 1;
            textEl.style.fontSize = `${fontSize}px`;
        }
        setQuestionFontSize(fontSize);
    }, [shownQuestion?.question, shownQuestion?.options?.length, hasOptions, isFlipped, isMobileViewport, resizeTick, mode]);

    useLayoutEffect(() => {
        if (!shownQuestion || !isFlipped) {
            setAnswerFontSize(null);
            return;
        }
        const wrap = answerWrapRef.current;
        const textEl = answerTextRef.current;
        if (!wrap || !textEl) return;
        const availableHeight = wrap.clientHeight;
        const availableWidth = textEl.clientWidth;
        if (availableHeight === 0 || availableWidth === 0) return;
        const maxSize = Math.min(72, Math.max(22, Math.floor(window.innerWidth / 8)));
        const minSize = 12;
        let fontSize = maxSize;
        textEl.style.lineHeight = '1.15';
        textEl.style.fontSize = `${fontSize}px`;
        while ((textEl.scrollHeight > availableHeight || textEl.scrollWidth > availableWidth) && fontSize > minSize) {
            fontSize -= 1;
            textEl.style.fontSize = `${fontSize}px`;
        }
        setAnswerFontSize(fontSize);
    }, [shownQuestion?.answer, isFlipped, isMobileViewport, resizeTick]);

    useLayoutEffect(() => {
        if (!hasOptions || !shownQuestion?.options || isFlipped) {
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
        measureEl.style.width = `${innerWidth}px`;
        measureEl.style.boxSizing = 'border-box';
        measureEl.style.fontFamily = styles.fontFamily;
        measureEl.style.fontWeight = styles.fontWeight;
        measureEl.style.letterSpacing = styles.letterSpacing;
        measureEl.style.whiteSpace = 'normal';
        measureEl.style.wordBreak = 'normal';
        measureEl.style.overflowWrap = 'normal';
        measureEl.style.hyphens = 'none';
        const maxSize = Math.min(48, Math.max(14, Math.floor(innerHeight * 0.85)));
        const minSize = 12;
        let fontSize = maxSize;
        const fitsAll = (sizeToTry: number) => {
            measureEl.style.fontSize = `${sizeToTry}px`;
            measureEl.style.lineHeight = '1.2';
            return shownQuestion.options!.every((option) => {
                measureEl.textContent = stripOptionPrefix(option);
                return measureEl.scrollHeight <= innerHeight && measureEl.scrollWidth <= innerWidth + 1;
            });
        };
        while (fontSize > minSize && !fitsAll(fontSize)) fontSize -= 1;
        setOptionFontSize(fontSize);
    }, [hasOptions, shownQuestion?.options?.join('|'), isFlipped, isMobileViewport, resizeTick]);

    if (isGameOver) {
        const winnerScore = ranking.length ? ranking[0].score : 0;
        const winnerCorrect = ranking.length ? (correctCounts[ranking[0].index] || 0) : 0;
        const winners = ranking.filter((team) => (
            team.score === winnerScore && (correctCounts[team.index] || 0) === winnerCorrect
        ));
        const winnerHeadline = winners.length > 1
            ? `WINNERS: ${winners.map((team) => team.name).join(' & ')}`
            : `WINNER: ${winners[0]?.name || 'No winner'}`;
        const formatBlockBeatersScore = (score: number, entry: typeof ranking[number]) => `${score} pts - ${correctCounts[entry.index] || 0} correct`;

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
                    <WinnerCeremonyStandingsTable ranking={ranking} formatScore={formatBlockBeatersScore} />
                </WinnerCeremonyHero>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={`${isFullscreen ? 'h-screen' : 'h-[calc(100vh-4rem)]'} min-h-0 bg-[#151614] text-[#fffaf0] overflow-hidden flex flex-col`}>
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
                            className={`sm:hidden ${mobileUsesTwoRowHeader ? 'w-[30px] h-[30px] rounded-md' : 'w-9 h-9 rounded-lg'} flex items-center justify-center border border-slate-200 bg-slate-100 text-slate-500 hover:text-[#0f766e] hover:bg-teal-50 transition-colors`}
                            title={isMuted ? 'Unmute' : 'Mute'}
                        >
                            {isMuted ? <VolumeX size={mobileUsesTwoRowHeader ? 14 : 17} /> : <Volume2 size={mobileUsesTwoRowHeader ? 14 : 17} />}
                        </button>
                    </div>

                    <div
                        className={isMobileViewport
                            ? `flex-1 grid ${mobileUsesTwoRowHeader ? 'gap-1 content-start' : 'gap-1.5'} items-stretch`
                            : 'flex-1 flex justify-end sm:justify-center gap-2 sm:gap-4 flex-wrap sm:flex-nowrap overflow-x-auto no-scrollbar px-1 sm:px-4 h-full items-center'}
                        style={isMobileViewport ? { gridTemplateColumns: `repeat(${mobileHeaderColumns}, minmax(0, 1fr))` } : undefined}
                    >
                        {localTeamNames.map((name, index) => {
                            const active = currentTeam === index;
                            return (
                                <button
                                    key={index}
                                    onClick={() => { setEditingTeamIndex(index); setEditName(name); setEditScore(scores[index] || 0); }}
                                    className={`${isMobileViewport ? `${mobileUsesTwoRowHeader ? 'h-[46px]' : 'h-12'} w-full min-w-0 px-2 py-1 overflow-hidden` : 'px-2 py-1 sm:px-6 sm:py-3 min-w-[86px] sm:min-w-[150px] h-12 sm:h-28'} rounded-xl text-center transition-all border-b-4 relative group flex flex-col justify-center items-center shadow-sm ${active ? 'text-white shadow-lg ring-0 sm:ring-4 z-10' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'}`}
                                    style={active ? { backgroundColor: PLAYER_COLORS[index].base, borderColor: PLAYER_COLORS[index].strong, boxShadow: `0 0 0 ${isMobileViewport ? 2 : 4}px ${PLAYER_COLORS[index].soft}` } : undefined}
                                >
                                    {isMobileViewport ? (
                                        <>
                                            <div className="flex max-w-full items-center gap-1 truncate text-[9px] font-black uppercase leading-none tracking-wider">
                                                <span className="truncate">{name}</span>
                                                {active && <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#f2c14e] animate-pulse" />}
                                            </div>
                                            <div className="mt-1 flex max-w-full items-baseline justify-center gap-1 truncate leading-none">
                                                <AnimatedScore score={scores[index] || 0} className="text-base leading-none" diffClassName="text-[10px] -top-5" />
                                                <span className="text-[8px] font-black opacity-75">/</span>
                                                <span className="truncate text-[8px] font-black uppercase opacity-75">{correctCounts[index] || 0} correct</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="text-[9px] leading-none sm:text-lg uppercase font-bold tracking-wider truncate max-w-full sm:max-w-[130px] mb-0.5 sm:mb-1 flex items-center gap-1">
                                                {name}
                                                {active && <div className="w-2 h-2 rounded-full bg-[#f2c14e] animate-pulse ml-1" />}
                                            </div>
                                            <AnimatedScore score={scores[index] || 0} className="text-xl leading-none sm:text-5xl" diffClassName="text-[10px] sm:text-xl -top-5 sm:-top-8" />
                                            <div className="text-[8px] leading-none sm:text-xs font-black uppercase opacity-75 mt-1">{correctCounts[index] || 0} correct</div>
                                        </>
                                    )}
                                    <div className="absolute top-2 right-2 bg-slate-100 text-slate-900 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Edit2 size={12} />
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="hidden sm:flex flex-col items-end justify-center min-w-[72px] gap-2">
                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            className="text-slate-400 hover:text-[#0f766e] p-3 bg-slate-100 hover:bg-teal-50 rounded-xl transition-colors border border-slate-200"
                            title={isMuted ? 'Unmute' : 'Mute'}
                        >
                            {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                        </button>
                        <button onClick={toggleFullscreen} className="text-slate-400 hover:text-[#0f766e] p-3 bg-slate-100 hover:bg-teal-50 rounded-xl transition-colors border border-slate-200">
                            {isFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
                        </button>
                    </div>
                </div>
            </div>

            <main className="relative flex-1 min-h-0 overflow-hidden p-2 sm:p-4">
                {currentTeamBonusCard && (
                    <div
                        className={`absolute bottom-3 left-3 z-30 hidden aspect-[2/3] flex-col overflow-hidden rounded-2xl border-[3px] p-2 text-center shadow-2xl sm:left-[1cm] sm:top-[1cm] sm:bottom-auto sm:flex sm:p-[clamp(0.45rem,0.8vw,0.75rem)] ${activeBonusCardId === currentTeamBonusCard.id ? 'border-yellow-100 ring-4 ring-yellow-300/40' : 'border-yellow-300/90'} bg-gradient-to-br from-purple-800 via-purple-600 to-indigo-800`}
                        style={{ width: 'clamp(8rem, min(15vw, 34vh), 17rem)' }}
                    >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.38),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.18),transparent_38%)]" />
                        <div className="relative z-10 mb-1 flex items-center justify-between gap-2">
                            <span className="truncate text-[clamp(0.45rem,0.65vw,0.625rem)] font-black uppercase tracking-[0.16em]" style={{ color: PLAYER_COLORS[currentTeam].text }}>
                                {localTeamNames[currentTeam]}
                            </span>
                            <span className="rounded-full bg-white/10 px-[clamp(0.35rem,0.45vw,0.5rem)] py-0.5 text-[clamp(0.45rem,0.65vw,0.625rem)] font-black text-white/80">
                                {currentTeamBonusCards.length}
                            </span>
                        </div>
                        <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
                            <div className="text-[clamp(0.45rem,0.8vw,0.75rem)] font-black uppercase tracking-[0.28em] text-yellow-100">Bonus</div>
                            <div className="mt-[clamp(0.25rem,1vh,1.25rem)] flex items-center font-display text-[clamp(0.95rem,2.4vw,1.875rem)] font-black leading-tight text-yellow-200">
                                {bonusLabel(currentTeamBonusCard.kind)}
                            </div>
                            <div className="mt-[clamp(0.25rem,0.8vh,0.75rem)] text-[clamp(0.6rem,1.05vw,1rem)] font-bold leading-tight text-white/90">
                                {bonusCardStatus}
                            </div>
                        </div>
                        {currentTeamBonusCards.length > 1 && (
                            <div className="relative z-10 mb-1 flex items-center justify-center gap-[clamp(0.25rem,0.5vw,0.5rem)]">
                                <button
                                    onClick={() => setBonusCardPages((prev) => prev.map((value, index) => index === currentTeam ? (value - 1 + currentTeamBonusCards.length) % currentTeamBonusCards.length : value))}
                                    className="flex h-[clamp(1.35rem,2vw,1.75rem)] w-[clamp(1.35rem,2vw,1.75rem)] items-center justify-center rounded-full bg-white/15 text-[clamp(0.65rem,1vw,0.875rem)] font-black text-white hover:bg-white/25"
                                >
                                    {'<'}
                                </button>
                                <span className="text-[clamp(0.5rem,0.75vw,0.625rem)] font-black text-white/80">{currentTeamBonusPage + 1}/{currentTeamBonusCards.length}</span>
                                <button
                                    onClick={() => setBonusCardPages((prev) => prev.map((value, index) => index === currentTeam ? (value + 1) % currentTeamBonusCards.length : value))}
                                    className="flex h-[clamp(1.35rem,2vw,1.75rem)] w-[clamp(1.35rem,2vw,1.75rem)] items-center justify-center rounded-full bg-white/15 text-[clamp(0.65rem,1vw,0.875rem)] font-black text-white hover:bg-white/25"
                                >
                                    {'>'}
                                </button>
                            </div>
                        )}
                        <button
                            onClick={() => setReviewBonusKind(currentTeamBonusCard.kind)}
                            className="relative z-10 mt-auto w-full rounded-lg bg-white/14 px-2 py-[clamp(0.3rem,0.6vw,0.375rem)] text-[clamp(0.55rem,0.9vw,0.875rem)] font-black text-white ring-1 ring-white/20 hover:bg-white/22"
                        >
                            See card
                        </button>
                        {activeBonusCardId !== currentTeamBonusCard.id ? (
                            <button
                                onClick={() => startBonusAction(currentTeamBonusCard)}
                                disabled={!canUseBonusBeforeTile}
                                className={`relative z-10 mt-[clamp(0.25rem,0.7vw,0.5rem)] w-full rounded-lg px-2 py-[clamp(0.3rem,0.6vw,0.375rem)] text-[clamp(0.55rem,0.9vw,0.875rem)] font-black ${canUseBonusBeforeTile ? 'bg-yellow-300 text-purple-950 hover:bg-yellow-200' : 'bg-white/10 text-white/45'}`}
                            >
                                Use card now
                            </button>
                        ) : (
                            <div className="relative z-10 mt-[clamp(0.25rem,0.7vw,0.5rem)] rounded-lg bg-yellow-300 px-2 py-[clamp(0.3rem,0.6vw,0.375rem)] text-[clamp(0.55rem,0.9vw,0.875rem)] font-black text-purple-950">
                                In use
                            </div>
                        )}
                    </div>
                )}

                <div
                    className="absolute bottom-3 right-3 z-30 hidden aspect-[2/3] flex-col overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-slate-950/92 via-[#121512]/90 to-[#0f2f2a]/88 p-2 text-white shadow-[0_18px_45px_rgba(0,0,0,0.45)] backdrop-blur-md sm:right-[1cm] sm:top-[1cm] sm:bottom-auto sm:flex sm:p-[clamp(0.35rem,0.7vw,0.75rem)]"
                    style={{ width: 'clamp(8rem, min(15vw, 34vh), 17rem)' }}
                >
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(242,193,78,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(13,148,136,0.24),transparent_40%)]" />
                    <div className="relative z-10 mb-[clamp(0.18rem,0.55vw,0.5rem)] flex items-center justify-between gap-[clamp(0.18rem,0.5vw,0.5rem)]">
                        <div className="flex min-w-0 items-center gap-[clamp(0.25rem,0.6vw,0.5rem)]">
                            <div className="flex h-[clamp(1.25rem,2vw,1.75rem)] w-[clamp(1.25rem,2vw,1.75rem)] shrink-0 items-center justify-center rounded-lg bg-[#f2c14e] text-slate-950 shadow-lg shadow-yellow-950/30">
                                <Shield className="h-[clamp(0.68rem,1.1vw,0.95rem)] w-[clamp(0.68rem,1.1vw,0.95rem)]" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[clamp(0.38rem,0.62vw,0.56rem)] font-black uppercase tracking-[0.14em] text-white/55">Steals</div>
                                <div className="truncate font-display text-[clamp(0.68rem,1.05vw,0.875rem)] font-black text-white">Remaining</div>
                            </div>
                        </div>
                        <div className="shrink-0 rounded-full border border-white/10 bg-white/10 px-[clamp(0.25rem,0.45vw,0.375rem)] py-0.5 text-[clamp(0.38rem,0.62vw,0.56rem)] font-black text-white/75">
                            max {MAX_STEALS_PER_TEAM}
                        </div>
                    </div>
                    <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-[clamp(0.16rem,0.45vw,0.42rem)]">
                        {localTeamNames.map((name, index) => {
                            const remaining = Math.max(0, MAX_STEALS_PER_TEAM - (stealCounts[index] || 0));
                            return (
                                <div key={index} className="flex min-h-0 flex-1 flex-col justify-center rounded-lg border border-white/10 bg-black/24 p-[clamp(0.14rem,0.55vw,0.5rem)]">
                                    <div className="mb-[clamp(0.12rem,0.3vw,0.25rem)] flex items-center justify-between gap-1.5">
                                        <span className="truncate text-[clamp(0.45rem,0.9vw,0.78rem)] font-black leading-tight" style={{ color: PLAYER_COLORS[index].text }}>{name}</span>
                                        <span className="font-mono text-[clamp(0.62rem,1.35vw,1.125rem)] font-black leading-none text-white">{remaining}</span>
                                    </div>
                                    <div className="flex gap-[clamp(0.15rem,0.35vw,0.25rem)]">
                                        {Array.from({ length: MAX_STEALS_PER_TEAM }, (_, stealIndex) => (
                                            <div
                                                key={stealIndex}
                                                className="h-[clamp(0.2rem,0.48vw,0.5rem)] flex-1 rounded-full"
                                                style={{ backgroundColor: stealIndex < remaining ? PLAYER_COLORS[index].strong : 'rgba(255,255,255,0.14)' }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="absolute inset-x-3 bottom-3 z-30 flex items-center gap-2 overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-slate-950/94 via-[#121512]/92 to-[#0f2f2a]/90 p-2 text-white shadow-[0_18px_45px_rgba(0,0,0,0.45)] backdrop-blur-md sm:hidden">
                    <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-black shadow-lg"
                        style={{ backgroundColor: PLAYER_COLORS[currentTeam].base, color: PLAYER_COLORS[currentTeam].text }}
                    >
                        {currentTeam + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate text-xs font-black uppercase tracking-[0.14em]" style={{ color: PLAYER_COLORS[currentTeam].text }}>
                                {localTeamNames[currentTeam]}'s turn
                            </span>
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-black text-white/75">
                                {currentTeamStealsRemaining} steals
                            </span>
                        </div>
                        <div className="mt-1 truncate text-[11px] font-bold text-white/70">
                            {currentTeamBonusCard ? `${currentTeamBonusCards.length} bonus${currentTeamBonusCards.length === 1 ? '' : 'es'}: ${bonusLabel(currentTeamBonusCard.kind)}` : 'No saved bonuses'}
                        </div>
                    </div>
                    {currentTeamBonusCard && (
                        <div className="flex shrink-0 flex-col gap-1">
                            <button
                                onClick={() => setReviewBonusKind(currentTeamBonusCard.kind)}
                                className="rounded-lg bg-white/14 px-3 py-1 text-[11px] font-black text-white ring-1 ring-white/20"
                            >
                                See
                            </button>
                            <button
                                onClick={() => startBonusAction(currentTeamBonusCard)}
                                disabled={!canUseBonusBeforeTile}
                                className={`rounded-lg px-3 py-1 text-[11px] font-black ${canUseBonusBeforeTile ? 'bg-yellow-300 text-purple-950' : 'bg-white/10 text-white/45'}`}
                            >
                                {activeBonusCardId === currentTeamBonusCard.id ? 'In use' : 'Use'}
                            </button>
                        </div>
                    )}
                </div>

                <section
                    className="relative flex h-full min-h-0 items-start justify-center overflow-hidden rounded-lg border border-[#f2c14e]/24 bg-[#08211f] bg-cover bg-center p-2 pt-3 pb-[5.25rem] shadow-inner sm:flex sm:h-full sm:items-center sm:p-4"
                    style={{ backgroundImage: "url('/assets/background/blockbeaters-electric-bg.png')" }}
                >
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(8,47,73,0.08),transparent_38%),linear-gradient(90deg,rgba(2,6,23,0.42),rgba(2,6,23,0.18)_26%,rgba(2,6,23,0.1)_50%,rgba(2,6,23,0.18)_74%,rgba(2,6,23,0.42))]" />
                    <div className="pointer-events-none absolute inset-0 bg-black/10" />
                    <svg
                        viewBox={`0 0 ${boardViewWidth} ${boardViewHeight}`}
                        className="relative z-10 h-full max-h-full w-full max-w-full"
                        role="img"
                        aria-label="Block Beaters hexagon board"
                    >
                        <style>
                            {`
                                .block-beaters-tile {
                                    transform-box: fill-box;
                                    transform-origin: center;
                                    transition: transform 160ms ease, filter 160ms ease;
                                }
                                .block-beaters-tile:hover,
                                .block-beaters-tile:focus {
                                    transform: translateY(-7px) scale(1.045);
                                    filter: drop-shadow(0 14px 12px rgba(0, 0, 0, 0.5));
                                }
                                .block-beaters-tile:hover text,
                                .block-beaters-tile:focus text {
                                    filter: drop-shadow(0 2px 1px rgba(255, 255, 255, 0.32));
                                }
                            `}
                        </style>
                        <defs>
                            <linearGradient id="block-beaters-yellow" x1="15%" y1="0%" x2="84%" y2="100%">
                                <stop offset="0%" stopColor="#fff9bd" />
                                <stop offset="18%" stopColor="#ffe766" />
                                <stop offset="58%" stopColor="#ffd000" />
                                <stop offset="82%" stopColor="#e8aa00" />
                                <stop offset="100%" stopColor="#9b6300" />
                            </linearGradient>
                            <linearGradient id="block-beaters-yellow-inner" x1="16%" y1="4%" x2="78%" y2="92%">
                                <stop offset="0%" stopColor="#fffbd0" />
                                <stop offset="42%" stopColor="#ffe45f" />
                                <stop offset="100%" stopColor="#f0bd05" />
                            </linearGradient>
                            <linearGradient id="block-beaters-gloss" x1="12%" y1="0%" x2="70%" y2="66%">
                                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.62" />
                                <stop offset="24%" stopColor="#ffffff" stopOpacity="0.28" />
                                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                            </linearGradient>
                            <linearGradient id="block-beaters-bottom-shadow" x1="50%" y1="30%" x2="50%" y2="100%">
                                <stop offset="0%" stopColor="#000000" stopOpacity="0" />
                                <stop offset="100%" stopColor="#000000" stopOpacity="0.32" />
                            </linearGradient>
                            {PLAYER_COLORS.map((color, index) => (
                                <linearGradient key={index} id={`block-beaters-player-${index}`} x1="15%" y1="2%" x2="85%" y2="100%">
                                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
                                    <stop offset="18%" stopColor={color.strong} />
                                    <stop offset="72%" stopColor={color.base} />
                                    <stop offset="100%" stopColor={color.base} />
                                </linearGradient>
                            ))}
                            <filter id="block-beaters-tile-shadow" x="-24%" y="-22%" width="148%" height="156%">
                                <feDropShadow dx="0" dy="7" stdDeviation="2.6" floodColor="#000000" floodOpacity="0.42" />
                                <feDropShadow dx="-2" dy="-2" stdDeviation="1.2" floodColor="#ffffff" floodOpacity="0.18" />
                            </filter>
                        </defs>

                        <g transform={`translate(0 ${boardTopOffset})`}>
                            {topRailColor && Array.from({ length: size }).map((_, col) => {
                                const { x, y } = getTileCenter(-1, col);
                                return (
                                    <polygon
                                        key={`top-rail-${col}`}
                                        points={getHexPoints(x, y)}
                                        fill="url(#block-beaters-player-1)"
                                        stroke="rgba(255,255,255,0.12)"
                                        strokeWidth={1.4}
                                        vectorEffect="non-scaling-stroke"
                                    />
                                );
                            })}

                            {bottomRailColor && Array.from({ length: size }).map((_, col) => {
                                const { x, y } = getTileCenter(size, col);
                                return (
                                    <polygon
                                        key={`bottom-rail-${col}`}
                                        points={getHexPoints(x, y)}
                                        fill={`url(#block-beaters-player-${teamCount >= 4 ? 3 : 1})`}
                                        stroke="rgba(255,255,255,0.12)"
                                        strokeWidth={1.4}
                                        vectorEffect="non-scaling-stroke"
                                    />
                                );
                            })}

                            {Array.from({ length: size }).map((_, row) => {
                                const left = getTileCenter(row, -1);
                                const right = getTileCenter(row, size);
                                return (
                                    <React.Fragment key={`rails-${row}`}>
                                        <polygon
                                            points={getHexPoints(left.x, left.y)}
                                            fill="url(#block-beaters-player-0)"
                                            stroke="rgba(255,255,255,0.12)"
                                            strokeWidth={1.4}
                                            vectorEffect="non-scaling-stroke"
                                        />
                                        <polygon
                                            points={getHexPoints(right.x, right.y)}
                                            fill={`url(#block-beaters-player-${teamCount >= 3 ? 2 : 0})`}
                                            stroke="rgba(255,255,255,0.12)"
                                            strokeWidth={1.4}
                                            vectorEffect="non-scaling-stroke"
                                        />
                                    </React.Fragment>
                                );
                            })}

                            {tileRows.flat().map((tile) => {
                                const ownerColor = tile.owner !== null ? PLAYER_COLORS[tile.owner] : null;
                                const { x, y } = getTileCenter(tile.row, tile.col);
                                const fill = ownerColor ? `url(#block-beaters-player-${tile.owner})` : 'url(#block-beaters-yellow)';
                                const extrusionFill = ownerColor ? ownerColor.base : '#9b6300';
                                const textColor = ownerColor ? ownerColor.text : '#111111';
                                return (
                                    <g
                                        key={tile.id}
                                        role="button"
                                        tabIndex={0}
                                        aria-label={`Tile ${tile.label}`}
                                        className="block-beaters-tile cursor-pointer outline-none"
                                        onClick={() => openTile(tile)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                openTile(tile);
                                            }
                                        }}
                                    >
                                        <polygon
                                            points={getHexPoints(x, y + HEX_R * 0.08)}
                                            fill={extrusionFill}
                                            opacity={ownerColor ? 0.76 : 0.88}
                                            stroke="rgba(0,0,0,0.24)"
                                            strokeWidth={1.2}
                                            vectorEffect="non-scaling-stroke"
                                            filter="url(#block-beaters-tile-shadow)"
                                        />
                                        <polygon
                                            points={getHexPoints(x, y)}
                                            fill={fill}
                                            stroke={ownerColor ? 'rgba(255,255,255,0.16)' : 'rgba(255,238,128,0.6)'}
                                            strokeWidth={1.4}
                                            vectorEffect="non-scaling-stroke"
                                        />
                                        <polygon
                                            points={getHexPoints(x, y, HEX_R * 0.82)}
                                            fill={ownerColor ? fill : 'url(#block-beaters-yellow-inner)'}
                                            opacity={ownerColor ? 0.48 : 0.86}
                                            pointerEvents="none"
                                        />
                                        <polygon
                                            points={getHexPoints(x - HEX_R * 0.04, y - HEX_R * 0.08, HEX_R * 0.78)}
                                            fill="url(#block-beaters-gloss)"
                                            opacity={ownerColor ? 0.42 : 0.58}
                                            pointerEvents="none"
                                        />
                                        <polygon
                                            points={getHexPoints(x, y + HEX_R * 0.04, HEX_R * 0.94)}
                                            fill="url(#block-beaters-bottom-shadow)"
                                            opacity={0.48}
                                            pointerEvents="none"
                                        />
                                        <polygon
                                            points={getHexPoints(x, y, HEX_R * 0.84)}
                                            fill="none"
                                            stroke={ownerColor ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.26)'}
                                            strokeWidth={1.2}
                                            vectorEffect="non-scaling-stroke"
                                            pointerEvents="none"
                                        />
                                        {tile.shielded && (
                                            <polygon
                                                points={getHexPoints(x, y, HEX_R * 0.86)}
                                                fill="none"
                                                stroke="#fff7c7"
                                                strokeWidth={4}
                                                vectorEffect="non-scaling-stroke"
                                            />
                                        )}
                                        <text
                                            x={x}
                                            y={y + HEX_R * 0.24}
                                            textAnchor="middle"
                                            fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
                                            fontSize={HEX_R * 0.92}
                                            fontWeight={900}
                                            fill={textColor}
                                            pointerEvents="none"
                                        >
                                            {tile.label}
                                        </text>
                                    </g>
                                );
                            })}
                        </g>
                    </svg>
                </section>
            </main>

            {(activeTileId !== null || pendingFinal !== null) && shownQuestion && (
                <div className={`fixed inset-x-0 bottom-0 ${questionOverlayTopClass} z-[500] flex items-center justify-center ${pendingFinal !== null ? 'bg-slate-950/88' : 'bg-slate-900/50'} backdrop-blur-md p-3 sm:p-4 animate-fade-in overflow-hidden`}>
                    {pendingFinal !== null && (
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.32)_0%,rgba(250,204,21,0.14)_28%,rgba(2,6,23,0.92)_68%)]" />
                    )}
                    <div className="w-full max-w-[420px] h-full max-h-full sm:max-w-[560px] sm:h-full sm:max-h-[90vh] md:max-w-6xl md:h-auto md:max-h-full md:aspect-[16/9] [perspective:1000px]">
                        {showBonusIntro ? (
                            <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-4 border-yellow-300/80 bg-gradient-to-br from-purple-800 via-purple-600 to-indigo-800 p-6 text-center shadow-2xl">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.45),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.24),transparent_36%)]" />
                                <button
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setActiveTileId(null);
                                        setBonusIntroTileId(null);
                                        setActiveQuestionIndex(null);
                                        setActiveIsSteal(false);
                                    }}
                                    className="absolute right-4 top-4 z-20 rounded-full bg-white/15 p-2 text-white hover:bg-white/25"
                                >
                                    <X size={20} />
                                </button>
                                <div className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-yellow-100 via-amber-300 to-yellow-200 font-display font-black text-6xl sm:text-8xl md:text-9xl tracking-[0.14em] drop-shadow-[0_8px_20px_rgba(250,204,21,0.55)]">
                                    BONUS
                                </div>
                                <div className="relative z-10 mt-5 text-xl sm:text-3xl font-black text-white">
                                    Answer the question to claim it
                                </div>
                                <button
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setBonusIntroTileId(null);
                                        setTimeLeft(options.timerSeconds || 0);
                                    }}
                                    className="relative z-10 mt-8 rounded-xl bg-yellow-300 px-8 py-4 text-lg sm:text-2xl font-black text-purple-950 shadow-lg transition-transform hover:scale-105 hover:bg-yellow-200"
                                >
                                    Show Question
                                </button>
                            </div>
                        ) : showBonusAward && awardedBonus ? (
                            <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-4 border-yellow-300/80 bg-gradient-to-br from-purple-800 via-purple-600 to-indigo-800 p-6 text-center shadow-2xl">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.45),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.24),transparent_36%)]" />
                                <div className="relative z-10 text-sm sm:text-lg font-black uppercase tracking-[0.3em] text-yellow-100">Bonus awarded</div>
                                <div className="relative z-10 mt-4 font-display text-5xl sm:text-7xl md:text-8xl font-black text-yellow-200 drop-shadow-[0_8px_20px_rgba(250,204,21,0.45)]">
                                    {bonusLabel(awardedBonus.kind)}
                                </div>
                                <div className="relative z-10 mt-4 max-w-3xl text-base sm:text-2xl font-bold text-white/90">
                                    {bonusDetail(awardedBonus.kind)}
                                </div>
                                <div className="relative z-10 mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-2">
                                    <button
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            saveAwardedBonus();
                                        }}
                                        className="rounded-xl bg-white/14 px-5 py-4 text-lg sm:text-xl font-black text-white ring-2 ring-white/20 transition-colors hover:bg-white/22"
                                    >
                                        Save for later
                                    </button>
                                    <button
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            activateAwardedBonus();
                                        }}
                                        className="rounded-xl bg-yellow-300 px-5 py-4 text-lg sm:text-xl font-black text-purple-950 shadow-lg transition-transform hover:scale-105 hover:bg-yellow-200"
                                    >
                                        Use card now
                                    </button>
                                </div>
                            </div>
                        ) : (
                        <div key={questionCardKey} className={`relative w-full h-full transition-all duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                            <div className={`absolute inset-0 [backface-visibility:hidden] [transform:translateZ(0)] rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full ${pendingFinal !== null ? 'border-4 border-amber-300 bg-gradient-to-br from-amber-50 via-white to-yellow-100 shadow-[0_0_90px_rgba(250,204,21,0.45)]' : 'bg-white'} ${isFlipped ? 'pointer-events-none' : ''}`}>
                                <div className={`${pendingFinal !== null ? 'bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 text-slate-950' : 'bg-[#0f766e] text-white'} p-3 md:p-4 flex justify-between items-center h-[clamp(72px,12vh,96px)] sm:h-20 md:h-24 flex-shrink-0 relative z-10`}>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 font-bold text-sm sm:text-xl opacity-85 truncate">
                                            {pendingFinal !== null && <Crown size={18} />}
                                            {pendingFinal !== null ? 'Final Question' : `Tile ${activeTile?.label}`}
                                        </div>
                                        <div className="font-black text-lg sm:text-3xl truncate">{pendingFinal !== null ? 'Beat the block' : localTeamNames[currentTeam]}</div>
                                    </div>
                                    <div className="font-black text-xl sm:text-4xl">{fixedPoints}</div>
                                    <button onClick={(event) => { event.stopPropagation(); setActiveTileId(null); setPendingFinal(null); setActiveQuestionIndex(null); setActiveIsSteal(false); }} className={`p-2 rounded-full cursor-pointer relative z-50 ${pendingFinal !== null ? 'bg-slate-950/10 text-slate-950 hover:bg-slate-950/20' : 'bg-white/15 text-white hover:bg-white/25'}`}>
                                        <X size={18} className="sm:w-5 sm:h-5" />
                                    </button>
                                </div>

                                <div className={`${pendingFinal !== null ? 'bg-gradient-to-br from-white via-amber-50 to-yellow-100' : 'bg-white'} flex-grow w-full flex flex-col px-0 ${hasOptions ? 'pt-3 sm:pt-4 md:pt-6 pb-0' : 'py-3 sm:py-4 md:py-6'} relative overflow-hidden z-0`}>
                                    {pendingFinal !== null && (
                                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.28),transparent_40%)]" />
                                    )}
                                    <div className="flex flex-col flex-1 min-h-0">
                                        {questionImageUrl && hasOptions ? (
                                            <>
                                                <div
                                                    className={`flex flex-1 min-h-0 ${isMobileViewport ? 'flex-col' : 'flex-row'} gap-3 px-4 sm:px-6 md:px-8`}
                                                    style={isMobileViewport ? { flex: '2 1 0%' } : undefined}
                                                >
                                                    <div className={isMobileViewport ? 'w-full h-32 sm:h-36 flex items-center justify-center flex-none' : 'flex-1 min-h-0 flex items-center justify-center'}>
                                                        <img
                                                            src={questionImageUrl}
                                                            alt={questionImageAlt}
                                                            onLoad={() => setResizeTick((prev) => prev + 1)}
                                                            className="h-full w-full rounded-xl object-contain border border-slate-200/70 bg-white shadow-sm"
                                                        />
                                                    </div>
                                                    <div
                                                        ref={questionWrapRef}
                                                        className={`flex-1 min-h-0 flex items-center justify-center ${isMobileViewport ? 'text-center' : 'text-left'}`}
                                                    >
                                                        <div
                                                            ref={questionTextRef}
                                                            style={questionFontSize ? { fontSize: `${questionFontSize}px`, lineHeight: '1.15' } : undefined}
                                                            className={`font-display font-bold ${pendingFinal !== null ? 'text-slate-950 drop-shadow-[0_2px_0_rgba(251,191,36,0.35)]' : 'text-slate-800'} leading-tight w-full whitespace-pre-wrap break-words hyphens-none ${isMobileViewport ? 'text-center' : 'text-left'} ${questionFontSize ? '' : getQuestionFontSizeClass(shownQuestion.question)}`}
                                                        >
                                                            {shownQuestion.question}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div
                                                    className="w-full flex-1 min-h-0 mt-2 sm:mt-4 relative z-10 overflow-hidden"
                                                    style={isMobileViewport ? { flex: '1 1 0%' } : undefined}
                                                >
                                                    <div ref={optionGridRef} className="grid grid-cols-2 gap-0 w-full h-full auto-rows-fr">
                                                        {shownQuestion.options!.map((option, index) => {
                                                            const optionLabel = String.fromCharCode(65 + index);
                                                            const displayOption = stripOptionPrefix(option);
                                                            const uniformSize = optionFontSize ? '' : getOptionFontSizeClass(displayOption);
                                                            return (
                                                                <button
                                                                    key={option}
                                                                    onClick={(event) => { event.stopPropagation(); chooseMc(option); }}
                                                                    style={optionFontSize ? { fontSize: `${optionFontSize}px`, lineHeight: '1.2' } : undefined}
                                                                    className={`relative p-4 sm:p-6 border rounded-none font-bold transition-all text-center flex items-center justify-center w-full h-full ${uniformSize} cursor-pointer z-50 whitespace-normal break-normal hyphens-none ${selectedMcAnswer === option ? 'bg-[#ccfbf1] border-[#0f766e] text-[#0f766e]' : 'bg-slate-50 border-slate-200 text-slate-800 sm:hover:bg-[#f2c14e] sm:hover:border-yellow-400 sm:hover:text-slate-900'}`}
                                                                >
                                                                    <span aria-hidden="true" className="hidden sm:inline-flex absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 items-center justify-center w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-amber-200 via-amber-300 to-amber-500 text-slate-900 text-base sm:text-lg md:text-xl font-black border-2 border-amber-100/80 shadow-[0_8px_16px_rgba(245,158,11,0.35)] ring-2 ring-amber-200/60">
                                                                        {optionLabel}
                                                                    </span>
                                                                    <span data-option-text="true" className="w-full text-center sm:pl-12 md:pl-16">{displayOption}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    <div ref={optionMeasureRef} aria-hidden="true" className="absolute -left-[9999px] -top-[9999px] invisible" />
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                {questionImageUrl && (
                                                    <div className="px-4 sm:px-6 md:px-8 mb-2 sm:mb-4 flex items-center justify-center flex-none">
                                                        <img
                                                            src={questionImageUrl}
                                                            alt={questionImageAlt}
                                                            onLoad={() => setResizeTick((prev) => prev + 1)}
                                                            className="h-32 sm:h-44 md:h-56 w-full rounded-xl object-contain border border-slate-200/70 bg-white shadow-sm"
                                                        />
                                                    </div>
                                                )}
                                                <div
                                                    ref={questionWrapRef}
                                                    className={`w-full flex-1 min-h-0 flex flex-col items-center overflow-hidden px-4 sm:px-6 md:px-8 ${hasOptions ? 'justify-start mb-1 sm:mb-3' : 'justify-center'}`}
                                                >
                                                    <div
                                                        ref={questionTextRef}
                                                        style={questionFontSize ? { fontSize: `${questionFontSize}px`, lineHeight: '1.15' } : undefined}
                                                        className={`font-display font-bold ${pendingFinal !== null ? 'text-slate-950 drop-shadow-[0_2px_0_rgba(251,191,36,0.35)]' : 'text-slate-800'} leading-tight text-center w-full whitespace-pre-wrap break-words hyphens-none ${questionFontSize ? '' : getQuestionFontSizeClass(shownQuestion.question)}`}
                                                    >
                                                        {shownQuestion.question}
                                                    </div>
                                                </div>

                                                {hasOptions ? (
                                                    <div className="w-full flex-1 min-h-0 mt-2 sm:mt-4 relative z-10 overflow-hidden">
                                                <div ref={optionGridRef} className="grid grid-cols-2 gap-0 w-full h-full auto-rows-fr">
                                                    {shownQuestion.options!.map((option, index) => {
                                                        const optionLabel = String.fromCharCode(65 + index);
                                                        const displayOption = stripOptionPrefix(option);
                                                        const uniformSize = optionFontSize ? '' : getOptionFontSizeClass(displayOption);
                                                        return (
                                                            <button
                                                                key={option}
                                                                onClick={(event) => { event.stopPropagation(); chooseMc(option); }}
                                                                style={optionFontSize ? { fontSize: `${optionFontSize}px`, lineHeight: '1.2' } : undefined}
                                                                className={`relative p-4 sm:p-6 border rounded-none font-bold transition-all text-center flex items-center justify-center w-full h-full ${uniformSize} cursor-pointer z-50 whitespace-normal break-normal hyphens-none ${selectedMcAnswer === option ? 'bg-[#ccfbf1] border-[#0f766e] text-[#0f766e]' : 'bg-slate-50 border-slate-200 text-slate-800 sm:hover:bg-[#f2c14e] sm:hover:border-yellow-400 sm:hover:text-slate-900'}`}
                                                            >
                                                                <span aria-hidden="true" className="hidden sm:inline-flex absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 items-center justify-center w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-amber-200 via-amber-300 to-amber-500 text-slate-900 text-base sm:text-lg md:text-xl font-black border-2 border-amber-100/80 shadow-[0_8px_16px_rgba(245,158,11,0.35)] ring-2 ring-amber-200/60">
                                                                    {optionLabel}
                                                                </span>
                                                                <span data-option-text="true" className="w-full text-center sm:pl-12 md:pl-16">{displayOption}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                <div ref={optionMeasureRef} aria-hidden="true" className="absolute -left-[9999px] -top-[9999px] invisible" />
                                            </div>
                                                ) : (
                                                    <div className="w-full flex-none px-4 sm:px-6 md:px-8 pb-2 sm:pb-4">
                                                        <input
                                                            value={typedAnswer}
                                                            onChange={(event) => setTypedAnswer(event.target.value)}
                                                            onKeyDown={(event) => {
                                                                if (event.key === 'Enter' && typedAnswer.trim()) checkAndRevealTypedAnswer();
                                                            }}
                                                            className={`mx-auto block w-full max-w-2xl rounded-xl border bg-white p-4 text-center text-xl sm:text-2xl font-bold text-slate-900 placeholder:text-slate-400 caret-slate-900 outline-none ${pendingFinal !== null ? 'border-amber-400 focus:ring-2 focus:ring-amber-400' : 'border-slate-300 focus:ring-2 focus:ring-[#0f766e]'}`}
                                                            placeholder="Type answer"
                                                            autoFocus
                                                        />
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className={`flex flex-col relative flex-shrink-0 z-50 ${pendingFinal !== null ? 'bg-amber-50' : 'bg-white'} ${hasOptions ? 'h-[clamp(38px,6.5vh,46px)] sm:h-[clamp(32px,5.5vh,40px)] px-0 py-0' : 'h-[clamp(76px,12vh,104px)] sm:h-[clamp(88px,14vh,120px)] px-3 sm:px-4 md:px-8 py-1 sm:py-2 md:py-0'}`}>
                                    {options.timerSeconds > 0 && (
                                        <div className={`relative ${hasOptions ? 'h-full' : 'h-[clamp(38px,6.5vh,46px)] sm:h-[clamp(32px,5.5vh,40px)] -mx-3 sm:-mx-4 md:-mx-8'} bg-white overflow-hidden flex items-center justify-start pointer-events-none`}>
                                            <div className={`absolute inset-y-0 left-0 ${pendingFinal !== null ? 'bg-amber-400' : 'bg-[#0f766e]'} transition-all duration-1000`} style={{ width: `${timerProgress * 100}%` }} />
                                            <div className="absolute inset-0 flex items-center justify-center text-sm sm:text-lg md:text-xl font-black text-slate-900 tracking-wider">
                                                <Clock size={18} className="mr-2" /> {timeLeft}s
                                            </div>
                                        </div>
                                    )}
                                    {!hasOptions && (
                                        <div className="w-full flex-1 flex items-center justify-center py-2 sm:py-3">
                                            <button onClick={(event) => { event.stopPropagation(); checkAndRevealTypedAnswer(); }} className={`${pendingFinal !== null ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 hover:from-amber-400 hover:to-yellow-300' : 'bg-[#0f766e] text-white hover:bg-[#0d9488]'} px-6 sm:px-12 py-2 rounded-full font-bold text-base sm:text-xl shadow-lg hover:scale-105 transition-transform relative z-50`}>
                                                Check
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={`absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full ${pendingFinal !== null ? 'border-4 border-amber-300 bg-gradient-to-br from-amber-50 via-white to-yellow-100 shadow-[0_0_90px_rgba(250,204,21,0.45)]' : 'bg-slate-50'} ${!isFlipped ? 'pointer-events-none' : ''}`}>
                                <div className={`${pendingFinal !== null ? 'bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 text-slate-950' : 'bg-slate-200 text-slate-600'} p-3 md:p-4 flex justify-between items-center h-[clamp(72px,12vh,96px)] sm:h-20 md:h-24 flex-shrink-0 relative z-10`}>
                                    <div className="font-bold text-base sm:text-xl opacity-80">Answer</div>
                                    <button onClick={(event) => { event.stopPropagation(); setIsFlipped(false); }} className="p-2 bg-white rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer relative z-50">
                                        <RotateCcw size={18} className="sm:w-5 sm:h-5" />
                                    </button>
                                </div>

                                <div className={`${pendingFinal !== null ? 'bg-gradient-to-br from-white via-amber-50 to-yellow-100' : 'bg-white'} flex-grow flex flex-col items-center justify-center p-4 sm:p-6 md:p-12 text-center overflow-hidden w-full relative z-0`}>
                                    <div ref={answerWrapRef} className="flex-1 overflow-hidden flex flex-col items-center justify-center w-full min-h-0">
                                        {mcResult && (
                                            <div className="mb-3 sm:mb-6">
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
                                        )}
                                        <div
                                            ref={answerTextRef}
                                            style={answerFontSize ? { fontSize: `${answerFontSize}px`, lineHeight: '1.15' } : undefined}
                                            className={`font-display font-bold text-slate-800 leading-tight whitespace-pre-wrap break-words ${getAnswerFontSizeClass(shownQuestion.answer)}`}
                                        >
                                            {shownQuestion.answer}
                                        </div>
                                        {pendingFinal !== null && <div className="mt-5 flex items-center gap-2 rounded-full bg-amber-200 px-5 py-3 text-lg sm:text-xl font-black text-amber-900 shadow-inner"><Crown size={22} /> Final question</div>}
                                    </div>
                                </div>

                                <div className="h-[clamp(88px,14vh,120px)] flex flex-shrink-0 relative z-50">
                                    {hasOptions ? (
                                        <button onClick={(event) => { event.stopPropagation(); finishAnswer(mcResult === 'correct', false); }} className={`flex-1 text-white font-black text-2xl sm:text-4xl transition-colors flex items-center justify-center border-t-4 active:border-t-0 cursor-pointer relative z-50 ${mcResult === 'correct' ? 'bg-green-500 hover:bg-green-600 border-green-700' : 'bg-red-500 hover:bg-red-600 border-red-700'}`}>
                                            Continue
                                        </button>
                                    ) : (
                                        <>
                                            <button onClick={(event) => { event.stopPropagation(); finishAnswer(false, false); }} className="flex-1 bg-red-500 text-white font-bold text-lg sm:text-2xl hover:bg-red-600 transition-colors flex items-center justify-center border-t-4 border-red-700 active:border-t-0 cursor-pointer relative z-50">
                                                <X size={24} className="mr-2 sm:w-8 sm:h-8 sm:mr-3" /> Oops
                                            </button>
                                            <button onClick={(event) => { event.stopPropagation(); finishAnswer(true, false); }} className="flex-1 bg-green-500 text-white font-bold text-lg sm:text-2xl hover:bg-green-600 transition-colors flex items-center justify-center border-t-4 border-green-700 active:border-t-0 cursor-pointer relative z-50">
                                                <Check size={24} className="mr-2 sm:w-8 sm:h-8 sm:mr-3" /> OK
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        )}
                    </div>
                </div>
            )}

            {showQuitConfirm && (
                <ConfirmDialog title="Quit current game?" message="Current progress will be lost." cancel="Continue" confirm="Quit" onCancel={() => setShowQuitConfirm(false)} onConfirm={onBack} />
            )}
            {showEndGameConfirm && (
                <ConfirmDialog title="End game now?" message="The winner will be decided by score, then correct answers." cancel="Cancel" confirm="End game" onCancel={() => setShowEndGameConfirm(false)} onConfirm={() => setIsGameOver(true)} />
            )}
            {reviewBonusKind && (
                <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/60 p-4">
                    <div className="relative flex aspect-[16/9] w-full max-w-3xl flex-col items-center justify-center overflow-hidden rounded-2xl border-4 border-yellow-300/80 bg-gradient-to-br from-purple-800 via-purple-600 to-indigo-800 p-6 text-center shadow-2xl">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.45),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.24),transparent_36%)]" />
                        <button
                            onClick={() => setReviewBonusKind(null)}
                            className="absolute right-4 top-4 z-20 rounded-full bg-white/15 p-2 text-white hover:bg-white/25"
                        >
                            <X size={20} />
                        </button>
                        <div className="relative z-10 text-sm sm:text-lg font-black uppercase tracking-[0.3em] text-yellow-100">Bonus awarded</div>
                        <div className="relative z-10 mt-4 font-display text-4xl sm:text-6xl md:text-7xl font-black text-yellow-200 drop-shadow-[0_8px_20px_rgba(250,204,21,0.45)]">
                            {bonusLabel(reviewBonusKind)}
                        </div>
                        <div className="relative z-10 mt-4 max-w-2xl text-base sm:text-2xl font-bold text-white/90">
                            {bonusDetail(reviewBonusKind)}
                        </div>
                    </div>
                </div>
            )}
            {editingTeamIndex !== null && (
                <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/60 p-4">
                    <form onSubmit={(event) => { event.preventDefault(); saveTeamEdit(); }} className="w-full max-w-sm rounded-2xl bg-white p-6 text-slate-900">
                        <h2 className="mb-4 text-xl font-black">Edit team</h2>
                        <label className="mb-3 block text-sm font-bold">Name
                            <input value={editName} onChange={(event) => setEditName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3 font-bold" />
                        </label>
                        <label className="block text-sm font-bold">Score
                            <input type="number" value={editScore} onChange={(event) => setEditScore(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-slate-300 p-3 font-bold" />
                        </label>
                        <div className="mt-5 grid grid-cols-2 gap-3">
                            <button type="button" onClick={() => setEditingTeamIndex(null)} className="rounded-lg bg-slate-100 py-3 font-bold">Cancel</button>
                            <button type="submit" className="rounded-lg bg-[#0f766e] py-3 font-bold text-white">Save</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

const ConfirmDialog: React.FC<{ title: string; message: string; cancel: string; confirm: string; onCancel: () => void; onConfirm: () => void }> = ({ title, message, cancel, confirm, onCancel, onConfirm }) => (
    <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center text-slate-900">
            <h2 className="mb-2 text-2xl font-black">{title}</h2>
            <p className="mb-6 text-sm font-semibold text-slate-500">{message}</p>
            <div className="grid grid-cols-2 gap-3">
                <button onClick={onCancel} className="rounded-lg bg-slate-100 py-3 font-bold text-slate-700">{cancel}</button>
                <button onClick={onConfirm} className="rounded-lg bg-rose-600 py-3 font-bold text-white">{confirm}</button>
            </div>
        </div>
    </div>
);
