
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { GameRunOptions, GeneratedGame, StopTheFireDifficulty } from '../../types';
import { STOP_THE_FIRE_CATEGORIES } from '../../data/stopTheFireCategories';
import { playSound } from '../../utils/gameUtils';
import { WinnerCeremonyHero } from './shared/WinnerCeremonyHero';
import { ArrowLeft, Maximize2, Minimize2, RefreshCw, Volume2, VolumeX } from 'lucide-react';

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
const FIRE_EMITTER_X_RATIO = 0.72;
const FIRE_EMITTER_Y_RATIO = 0.92;
const FIRE_LAYER_NUDGE_Y_PX = 18;
const FIRE_FILL_ACTIVITY_MULTIPLIER = 3;
const TIMER_STEP_MS = 50;
const CHARCOAL_HEADER_BACKGROUND_STYLE: React.CSSProperties = {
    backgroundImage: 'url("/assets/background/charcoalbackground.jpg")',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
};
const CHARRED_REVIEW_HEADER_BACKGROUND_STYLE: React.CSSProperties = {
    backgroundImage: 'url("/assets/background/charredbackground.jpg")',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
};

type FlameParticle = {
    cx: number;
    cy: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    life: number;
    alive: boolean;
    c: { h: number; s: number; l: number; a: number; ta: number };
};

type SparkParticle = {
    cx: number;
    cy: number;
    x: number;
    y: number;
    lx: number;
    ly: number;
    vx: number;
    vy: number;
    r: number;
    life: number;
    alive: boolean;
    c: { h: number; s: number; l: number; a: number };
};

type FireCanvasMode = 'tip' | 'fill';

const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const createFlame = (cx: number, cy: number, urgency: number): FlameParticle => ({
    cx,
    cy,
    x: rand(cx - (12 + urgency * 14), cx + (12 + urgency * 14)),
    y: rand(cy - 2, cy + 4),
    vy: rand(1.2, 2.8 + urgency * 1.4),
    vx: rand(-1.6, 1.6),
    r: rand(5, 10 + urgency * 5),
    life: rand(2.8, 5.2),
    alive: true,
    c: {
        h: Math.floor(rand(6, 42)),
        s: 100,
        l: rand(62, 100),
        a: 0,
        ta: rand(0.72, 0.96)
    }
});

const updateFlame = (flame: FlameParticle) => {
    flame.y -= flame.vy;
    flame.vy += 0.045;
    flame.x += flame.vx;
    if (flame.x < flame.cx) flame.vx += 0.095;
    else flame.vx -= 0.095;
    if (flame.r > 0) flame.r -= 0.08;
    if (flame.r <= 0) flame.r = 0;
    flame.life -= 0.15;
    if (flame.life <= 0) {
        flame.c.a -= 0.06;
        if (flame.c.a <= 0) flame.alive = false;
    } else if (flame.c.a < flame.c.ta) {
        flame.c.a += 0.09;
    }
};

const drawFlame = (ctx: CanvasRenderingContext2D, flame: FlameParticle) => {
    ctx.beginPath();
    ctx.arc(flame.x, flame.y, flame.r * 2.8, 0, 2 * Math.PI);
    ctx.fillStyle = `hsla(${flame.c.h}, ${flame.c.s}%, ${flame.c.l}%, ${flame.c.a / 22})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(flame.x, flame.y, flame.r, 0, 2 * Math.PI);
    ctx.fillStyle = `hsla(${flame.c.h}, ${flame.c.s}%, ${flame.c.l}%, ${flame.c.a})`;
    ctx.fill();
};

const createSpark = (cx: number, cy: number, urgency: number): SparkParticle => {
    const x = rand(cx - (18 + urgency * 20), cx + (18 + urgency * 20));
    const y = rand(cy - 1, cy + 4);
    return {
        cx,
        cy,
        x,
        y,
        lx: x,
        ly: y,
        vy: rand(1.2, 2.8 + urgency * 1.2),
        vx: rand(-4.2, 4.2),
        r: rand(0.4, 1.4),
        life: rand(3.2, 5.2),
        alive: true,
        c: {
            h: Math.floor(rand(8, 46)),
            s: 100,
            l: rand(48, 100),
            a: rand(0.7, 0.95)
        }
    };
};

const updateSpark = (spark: SparkParticle) => {
    spark.lx = spark.x;
    spark.ly = spark.y;
    spark.y -= spark.vy;
    spark.x += spark.vx;
    if (spark.x < spark.cx) spark.vx += 0.2;
    else spark.vx -= 0.2;
    spark.vy += 0.08;
    spark.life -= 0.1;
    if (spark.life <= 0) {
        spark.c.a -= 0.05;
        if (spark.c.a <= 0) spark.alive = false;
    }
};

const drawSpark = (ctx: CanvasRenderingContext2D, spark: SparkParticle) => {
    ctx.beginPath();
    ctx.moveTo(spark.lx, spark.ly);
    ctx.lineTo(spark.x, spark.y);
    ctx.strokeStyle = `hsla(${spark.c.h}, ${spark.c.s}%, ${spark.c.l}%, ${spark.c.a / 2})`;
    ctx.lineWidth = spark.r * 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.closePath();

    ctx.beginPath();
    ctx.moveTo(spark.lx, spark.ly);
    ctx.lineTo(spark.x, spark.y);
    ctx.strokeStyle = `hsla(${spark.c.h}, ${spark.c.s}%, ${spark.c.l}%, ${spark.c.a})`;
    ctx.lineWidth = spark.r;
    ctx.stroke();
    ctx.closePath();
};

const applyRedFlamePalette = (flame: FlameParticle, x: number, width: number, frontBoost = 0) => {
    const frontHeat = clamp01((x / Math.max(1, width) - 0.62) / 0.38 + frontBoost);
    flame.c.h = Math.floor(rand(0, 14 + frontHeat * 34));
    flame.c.l = rand(34 + frontHeat * 18, 70 + frontHeat * 24);
    flame.c.ta = rand(0.5 + frontHeat * 0.08, 0.82 + frontHeat * 0.1);
    flame.r *= rand(1.15, 1.55 + frontHeat * 0.25);
    if (frontHeat > 0.58 && Math.random() < frontHeat * 0.55) {
        flame.c.h = Math.floor(rand(14, 42));
        flame.c.l = rand(84, 100);
    }
};

const applyRedSparkPalette = (spark: SparkParticle, x: number, width: number, frontBoost = 0) => {
    const frontHeat = clamp01((x / Math.max(1, width) - 0.62) / 0.38 + frontBoost);
    spark.c.h = Math.floor(rand(0, 16 + frontHeat * 36));
    spark.c.l = rand(34 + frontHeat * 20, 76 + frontHeat * 20);
    spark.c.a *= 0.88 + frontHeat * 0.1;
    spark.r *= rand(1.1, 1.5 + frontHeat * 0.2);
    if (frontHeat > 0.62 && Math.random() < frontHeat * 0.6) {
        spark.c.h = Math.floor(rand(16, 46));
        spark.c.l = rand(86, 100);
    }
};

const FireTimerCanvas: React.FC<{ urgency: number; mode?: FireCanvasMode }> = ({ urgency, mode = 'tip' }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const flamesRef = useRef<FlameParticle[]>([]);
    const sparksRef = useRef<SparkParticle[]>([]);
    const sparks2Ref = useRef<SparkParticle[]>([]);
    const rafRef = useRef<number | null>(null);
    const urgencyRef = useRef(urgency);
    const modeRef = useRef<FireCanvasMode>(mode);

    useEffect(() => {
        urgencyRef.current = urgency;
    }, [urgency]);

    useEffect(() => {
        modeRef.current = mode;
    }, [mode]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let cssWidth = 0;
        let cssHeight = 0;
        let dpr = window.devicePixelRatio || 1;

        const resizeCanvas = () => {
            const nextWidth = Math.max(1, Math.floor(canvas.clientWidth));
            const nextHeight = Math.max(1, Math.floor(canvas.clientHeight));
            dpr = window.devicePixelRatio || 1;
            if (nextWidth === cssWidth && nextHeight === cssHeight && canvas.width > 0) return;
            cssWidth = nextWidth;
            cssHeight = nextHeight;
            canvas.width = Math.max(1, Math.floor(cssWidth * dpr));
            canvas.height = Math.max(1, Math.floor(cssHeight * dpr));
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        const tick = () => {
            resizeCanvas();
            const width = cssWidth;
            const height = cssHeight;
            if (width < 2 || height < 2) {
                rafRef.current = window.requestAnimationFrame(tick);
                return;
            }

            const urgencyLevel = urgencyRef.current;
            const isFillMode = modeRef.current === 'fill';
            const emitterY = isFillMode ? rand(height * 0.34, height * 0.96) : height * FIRE_EMITTER_Y_RATIO;
            const fillMinX = 6;
            const fillMaxX = Math.max(fillMinX + 1, width - 6);
            const emitterX = isFillMode
                ? rand(fillMinX, fillMaxX)
                : Math.max(8, Math.min(width - 8, width * FIRE_EMITTER_X_RATIO));
            const localUrgency = isFillMode ? Math.max(0.45, urgencyLevel * 0.74 + 0.32) : urgencyLevel;
            const fillIntensity = isFillMode ? FIRE_FILL_ACTIVITY_MULTIPLIER : 1;

            const spawnFlame = (x: number, y: number, intensity: number, frontBoost = 0) => {
                const flame = createFlame(x, y, intensity);
                if (isFillMode) applyRedFlamePalette(flame, x, width, frontBoost);
                flamesRef.current.push(flame);
            };
            const spawnSpark = (x: number, y: number, intensity: number, frontBoost = 0) => {
                const spark = createSpark(x, y, intensity);
                if (isFillMode) applyRedSparkPalette(spark, x, width, frontBoost);
                sparksRef.current.push(spark);
            };
            const spawnSpark2 = (x: number, y: number, intensity: number, frontBoost = 0) => {
                const spark = createSpark(x, y, intensity);
                if (isFillMode) applyRedSparkPalette(spark, x, width, frontBoost);
                sparks2Ref.current.push(spark);
            };

            const flameCount = isFillMode
                ? Math.max(4, Math.floor((3 + localUrgency * 8 + width / 90) * fillIntensity))
                : Math.max(1, Math.floor(2 + localUrgency * 5));
            const sparkCount = isFillMode
                ? Math.max(4, Math.floor((2 + localUrgency * 5 + width / 140) * fillIntensity))
                : Math.max(1, Math.floor(1 + localUrgency * 4));
            for (let i = 0; i < flameCount; i += 1) spawnFlame(emitterX, emitterY, localUrgency);
            for (let i = 0; i < sparkCount; i += 1) spawnSpark(emitterX, emitterY, localUrgency);
            for (let i = 0; i < sparkCount; i += 1) spawnSpark2(emitterX, emitterY, localUrgency);

            if (isFillMode) {
                const ambientBursts = Math.max(3, Math.floor(width / 170));
                for (let i = 0; i < ambientBursts; i += 1) {
                    const burstX = rand(fillMinX, fillMaxX);
                    const burstY = rand(height * 0.3, height * 0.96);
                    spawnFlame(burstX, burstY, Math.min(1, localUrgency + 0.08));
                    if (Math.random() < 0.85) spawnSpark(burstX, burstY, Math.min(1, localUrgency + 0.06));
                    if (Math.random() < 0.7) spawnSpark2(burstX, burstY, Math.min(1, localUrgency + 0.05));
                }
            }

            if (isFillMode && width > 20) {
                const frontX = Math.max(8, width - 8);
                const frontY = rand(height * 0.42, height * 0.98);
                spawnFlame(frontX, frontY, Math.min(1, localUrgency + 0.2), 0.45);
                if (Math.random() < 0.8) spawnSpark(frontX, frontY, Math.min(1, localUrgency + 0.14), 0.45);
                if (Math.random() < 0.65) spawnSpark2(frontX, frontY, Math.min(1, localUrgency + 0.1), 0.38);
            }

            for (let i = flamesRef.current.length - 1; i >= 0; i -= 1) {
                const flame = flamesRef.current[i];
                if (flame.alive) updateFlame(flame);
                else flamesRef.current.splice(i, 1);
            }
            for (let i = sparksRef.current.length - 1; i >= 0; i -= 1) {
                const spark = sparksRef.current[i];
                if (spark.alive) updateSpark(spark);
                else sparksRef.current.splice(i, 1);
            }
            for (let i = sparks2Ref.current.length - 1; i >= 0; i -= 1) {
                const spark = sparks2Ref.current[i];
                if (spark.alive) updateSpark(spark);
                else sparks2Ref.current.splice(i, 1);
            }

            // Cull particles outside the local fill canvas.
            for (let i = flamesRef.current.length - 1; i >= 0; i -= 1) {
                if (flamesRef.current[i].x > width + 24 || flamesRef.current[i].x < -24) {
                    flamesRef.current.splice(i, 1);
                }
            }
            for (let i = sparksRef.current.length - 1; i >= 0; i -= 1) {
                if (sparksRef.current[i].x > width + 24 || sparksRef.current[i].x < -24) {
                    sparksRef.current.splice(i, 1);
                }
            }
            for (let i = sparks2Ref.current.length - 1; i >= 0; i -= 1) {
                if (sparks2Ref.current[i].x > width + 24 || sparks2Ref.current[i].x < -24) {
                    sparks2Ref.current.splice(i, 1);
                }
            }

            ctx.clearRect(0, 0, width, height);

            ctx.globalCompositeOperation = isFillMode ? 'source-over' : 'lighter';
            ctx.globalAlpha = isFillMode ? 0.9 : 1;
            for (let i = 0; i < flamesRef.current.length; i += 1) {
                drawFlame(ctx, flamesRef.current[i]);
            }

            for (let i = 0; i < sparksRef.current.length; i += 1) {
                if (i % 2 === 0) drawSpark(ctx, sparksRef.current[i]);
            }

            for (let i = 0; i < sparks2Ref.current.length; i += 1) {
                drawSpark(ctx, sparks2Ref.current[i]);
            }

            if (!isFillMode) {
                // Soften the top/sides of the tip-fire field so particles fade out naturally instead of hitting a hard canvas edge.
                ctx.globalCompositeOperation = 'destination-in';
                const verticalFade = ctx.createLinearGradient(0, 0, 0, height);
                verticalFade.addColorStop(0, 'rgba(0,0,0,0)');
                verticalFade.addColorStop(0.24, 'rgba(0,0,0,0.92)');
                verticalFade.addColorStop(1, 'rgba(0,0,0,1)');
                ctx.fillStyle = verticalFade;
                ctx.fillRect(0, 0, width, height);

                const horizontalFade = ctx.createLinearGradient(0, 0, width, 0);
                horizontalFade.addColorStop(0, 'rgba(0,0,0,0)');
                horizontalFade.addColorStop(0.18, 'rgba(0,0,0,1)');
                horizontalFade.addColorStop(0.88, 'rgba(0,0,0,1)');
                horizontalFade.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = horizontalFade;
                ctx.fillRect(0, 0, width, height);
            }

            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
            rafRef.current = window.requestAnimationFrame(tick);
        };

        rafRef.current = window.requestAnimationFrame(tick);
        return () => {
            if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
            flamesRef.current = [];
            sparksRef.current = [];
            sparks2Ref.current = [];
        };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

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

export const StopTheFireGame: React.FC<StopTheFireGameProps> = ({ game, options, onBack, onFinish, onReplay }) => {
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
    const [timeLeftMs, setTimeLeftMs] = useState<number>(timerSeconds * 1000);
    const [isTimesUp, setIsTimesUp] = useState(false);
    const [roundIndex, setRoundIndex] = useState(1);
    const [currentLetter, setCurrentLetter] = useState('');
    const [currentCategories, setCurrentCategories] = useState<string[]>([]);

    const [showReview, setShowReview] = useState(false);
    const [showRoundSummary, setShowRoundSummary] = useState(false);
    const [showWinner, setShowWinner] = useState(false);

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
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [categorySearch, setCategorySearch] = useState('');
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
    const containerRef = useRef<HTMLDivElement>(null);

    const manualCategoryPool = useMemo(() => {
        if (!game.stopTheFireCategories || game.stopTheFireCategories.length === 0) return null;
        const cleaned = game.stopTheFireCategories.map((text) => text.trim()).filter(Boolean);
        if (cleaned.length === 0) return null;
        return cleaned.map((text) => ({ text }));
    }, [game.stopTheFireCategories]);

    const manualCategoryList = useMemo(() => {
        if (!manualCategoryPool) return [];
        return manualCategoryPool.map((cat) => cat.text);
    }, [manualCategoryPool]);

    const categoryPool = useMemo(() => {
        if (manualCategoryPool) {
            return manualCategoryPool;
        }
        return STOP_THE_FIRE_CATEGORIES.filter((c) => c.difficulty === difficulty);
    }, [difficulty, manualCategoryPool]);

    const letterPool = useMemo(() => buildLetterPool(), []);

    useEffect(() => {
        const shouldLock = isFlipped || showReview || showRoundSummary || showTieBreakerResolve;
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
        setTimeLeftMs(timerSeconds * 1000);
        setRoundDuration(timerSeconds);
    }, [timerSeconds]);

    useEffect(() => {
        if (!manualCategoryPool) return;
        const maxAllowed = Math.min(
            CATEGORY_MAX,
            selectedCategories.length > 0 ? selectedCategories.length : manualCategoryPool.length
        );
        if (categoryCount > maxAllowed) {
            setCategoryCount(Math.max(1, maxAllowed));
        }
    }, [manualCategoryPool, categoryCount, selectedCategories]);

    useEffect(() => {
        if (!manualCategoryPool) return;
        setSelectedCategories([]);
        setCategorySearch('');
        setShowCategoryPicker(false);
    }, [manualCategoryPool?.length]);

    useEffect(() => {
        if (manualCategoryPool) {
            usedCategories.current.clear();
        }
    }, [selectedCategories, manualCategoryPool]);

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
        const handleFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
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
        const overridePool =
            manualCategoryPool && selectedCategories.length > 0
                ? selectedCategories.map((text) => ({ text }))
                : categoryPool;
        const freshPool = overridePool.filter((c) => !usedCategories.current.has(c.text));
        const pool = freshPool.length >= count ? freshPool : overridePool;
        const chosen = shuffle(pool).slice(0, count).map((c) => c.text);
        chosen.forEach((text) => usedCategories.current.add(text));
        return chosen;
    };

    const toggleFullscreen = async () => {
        if (!document.fullscreenElement) {
            await containerRef.current?.requestFullscreen();
            return;
        }
        await document.exitFullscreen();
    };

    const startTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeftMs((prev) => {
                if (prev <= TIMER_STEP_MS) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    timerRef.current = null;
                    setIsTimesUp(true);
                    playSound('times-up', isMuted, options.soundConfig?.timesUp);
                    setTimeout(() => openStopPrompt('timeout'), 150);
                    return 0;
                }
                return prev - TIMER_STEP_MS;
            });
        }, TIMER_STEP_MS);
    };

    const beginRound = () => {
        const count = isTieBreaker ? 1 : categoryCount;
        const categories = pickCategories(count);
        setCurrentCategories(categories);
        setRoundScores(Array.from({ length: players }, () => Array(categories.length).fill(0)));
        setIsTimesUp(false);
        setTimeLeftMs(timerSeconds * 1000);
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

        setShowWinner(true);
    };

    const resolveTieBreaker = (winner: number) => {
        setScores((prev) => prev.map((score, idx) => (idx === winner ? score + 1 : score)));
        setShowTieBreakerResolve(false);
        setShowWinner(true);
    };

    const canEditTeams = scores.every((score) => score === 0) && roundIndex === 1 && !isTieBreaker;

    const timeLeft = Math.max(0, Math.ceil(timeLeftMs / 1000));
    const timerProgress = roundDuration > 0 ? Math.max(0, Math.min(1, timeLeftMs / (roundDuration * 1000))) : 0;
    const timerFillWidth = `${Math.max(0, timerProgress * 100)}%`;
    const timerUrgency = 1 - timerProgress;
    const fireBarGradient = timerProgress <= 0.2
        ? 'linear-gradient(90deg, #ffe3a3 0%, #ffc464 16%, #ff9933 38%, #ff6a1f 62%, #df4310 82%, #5a220f 100%)'
        : timerProgress <= 0.5
            ? 'linear-gradient(90deg, #ffd88f 0%, #ffb751 22%, #ff8e2c 45%, #f25b16 70%, #7a2b10 100%)'
            : 'linear-gradient(90deg, #ffe7af 0%, #ffc96a 26%, #ffab46 50%, #ff7e28 74%, #a43d14 100%)';
    const fireHeadGlow = timerProgress <= 0.2
        ? '0 0 20px rgba(248,113,113,0.9), 0 0 38px rgba(249,115,22,0.72)'
        : timerProgress <= 0.5
            ? '0 0 16px rgba(251,146,60,0.78), 0 0 28px rgba(239,68,68,0.52)'
            : '0 0 14px rgba(251,191,36,0.66), 0 0 24px rgba(249,115,22,0.46)';
    const scoreboardScores = showReview ? scores.map((score, idx) => score + (roundTotals[idx] || 0)) : scores;
    const leaderboardTopScore = scoreboardScores.length ? Math.max(...scoreboardScores) : 0;
    const mobileScoreColumns = Math.min(3, Math.max(1, teamNames.length));
    const filteredManualCategories = useMemo(() => {
        if (!manualCategoryList.length) return [];
        const term = categorySearch.trim().toLowerCase();
        if (!term) return manualCategoryList;
        return manualCategoryList.filter((cat) => cat.toLowerCase().includes(term));
    }, [manualCategoryList, categorySearch]);
    const categoryCountMax = manualCategoryPool
        ? Math.min(CATEGORY_MAX, selectedCategories.length > 0 ? selectedCategories.length : manualCategoryPool.length)
        : CATEGORY_MAX;
    const toggleCategorySelection = (text: string) => {
        setSelectedCategories((prev) => (prev.includes(text) ? prev.filter((item) => item !== text) : [...prev, text]));
    };
    const totalCategories = currentCategories.length;
    const currentReviewCategory = currentCategories[reviewIndex] || '';
    const displayedCategories = useMemo(() => {
        const base = currentCategories.map((category, originalIndex) => ({ category, originalIndex }));
        if (isMobileViewport || !isTwoColumn || currentCategories.length <= 1) return base;

        const rows = Math.ceil(currentCategories.length / 2);
        const ordered: { category: string; originalIndex: number }[] = [];
        for (let row = 0; row < rows; row += 1) {
            const left = row;
            if (left < currentCategories.length) {
                ordered.push({ category: currentCategories[left], originalIndex: left });
            }
            const right = row + rows;
            if (right < currentCategories.length) {
                ordered.push({ category: currentCategories[right], originalIndex: right });
            }
        }
        return ordered;
    }, [currentCategories, isMobileViewport, isTwoColumn]);

    if (showWinner) {
        const ranking = scores
            .map((score, index) => ({
                index,
                score,
                name: teamNames[index] || `Team ${index + 1}`,
            }))
            .sort((a, b) => b.score - a.score);
        const winnerScore = ranking.length ? ranking[0].score : 0;
        const winners = ranking.filter((team) => team.score === winnerScore);
        const winnerHeadline = winners.length > 1
            ? `WINNERS: ${winners.map((team) => team.name).join(' & ')}`
            : `WINNER: ${winners[0]?.name || 'No winner'}`;

        return (
            <div
                className={`${isFullscreen ? 'fixed inset-0 overflow-y-auto overflow-x-hidden' : 'relative min-h-[calc(100vh-4rem)]'} z-[300] bg-gradient-to-br from-[#1d0d08] via-[#2a1108] to-[#0f0a08] text-white`}
            >
                <WinnerCeremonyHero
                    winnerHeadline={winnerHeadline}
                    subtitle="Final score standings"
                    ranking={ranking}
                    isMobileViewport={isMobileViewport}
                    musicEnabled={!isMuted}
                    onPlayAgain={onReplay}
                    onExit={onFinish}
                >
                    <div className="w-full max-w-4xl bg-white/10 border border-white/20 rounded-2xl p-4 md:p-6">
                        <div className="space-y-3">
                            {ranking.map((team, idx) => (
                                <div key={team.index} className="bg-white/10 rounded-xl px-4 py-3 flex items-center justify-between">
                                    <div className="font-bold">#{idx + 1} {team.name}</div>
                                    <div className="font-mono font-black text-xl">{team.score}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </WinnerCeremonyHero>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="min-h-screen bg-slate-100 flex flex-col relative overflow-hidden">
            <div
                className="relative z-[650] w-full overflow-hidden border-b border-[#3f3129]/75 backdrop-blur-md px-3 py-2 sm:px-6 sm:py-3"
                style={CHARCOAL_HEADER_BACKGROUND_STYLE}
            >
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute inset-0 bg-black/46" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#120f0d]/74 via-[#1a1411]/56 to-[#100d0b]/74" />
                    <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-[#a35631]/78 to-transparent" />
                </div>
                <div className="relative max-w-6xl mx-auto flex items-center gap-2 sm:gap-4">
                    <button
                        onClick={onBack}
                        className="shrink-0 flex items-center justify-center gap-1.5 sm:gap-2 h-9 sm:h-11 px-3 sm:px-4 rounded-lg border border-[#645047]/70 bg-[#1a1512]/90 text-[#f1dbcf] hover:bg-[#241b17] hover:border-[#c98062]/78 transition-colors font-bold"
                    >
                        <ArrowLeft size={16} />
                        <span className="hidden sm:inline">Back</span>
                    </button>
                    <div className="flex-1 min-w-0">
                        <div
                            className="grid gap-1.5 sm:gap-2 items-stretch"
                            style={{ gridTemplateColumns: `repeat(${isMobileViewport ? mobileScoreColumns : Math.max(1, teamNames.length)}, minmax(0, 1fr))` }}
                        >
                            {scoreboardScores.map((score, idx) => {
                                const isLeader = leaderboardTopScore > 0 && score === leaderboardTopScore;
                                const isTieBreakerTeam = isTieBreaker && tieBreakerTeams.includes(idx);
                                return (
                                    <div
                                        key={`score-${idx}`}
                                        className={`min-w-0 rounded-xl border-2 px-2 py-1 sm:px-3 sm:py-2 text-center transition-all ${
                                            isTieBreakerTeam
                                                ? 'border-rose-300/85 bg-rose-500/20 shadow-[0_0_14px_rgba(244,63,94,0.4)]'
                                                : isLeader
                                                    ? 'border-[#b98666]/76 bg-gradient-to-b from-[#3a2d27]/90 to-[#181312]/92 shadow-[0_0_16px_rgba(122,47,18,0.34)]'
                                                    : 'border-[#5a453a]/72 bg-gradient-to-b from-[#251d1a]/90 to-[#13100f]/92'
                                        }`}
                                    >
                                        <div className="text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.13em] text-[#f2ddd1] truncate">
                                            {teamNames[idx]}
                                        </div>
                                        <div className="font-mono text-lg sm:text-3xl leading-none font-black text-white [text-shadow:0_1px_0_rgba(122,47,18,0.45)]">
                                            {score}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
                        <button
                            onClick={() => setIsMuted((prev) => !prev)}
                            className="h-9 w-9 sm:h-11 sm:w-11 rounded-lg border border-[#645047]/70 bg-[#1a1512]/90 text-[#f1dbcf] hover:bg-[#241b17] hover:border-[#c98062]/78 transition-colors flex items-center justify-center"
                            title={isMuted ? 'Unmute' : 'Mute'}
                        >
                            {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
                        </button>
                        <button
                            onClick={toggleFullscreen}
                            className="h-9 w-9 sm:h-11 sm:w-11 rounded-lg border border-[#645047]/70 bg-[#1a1512]/90 text-[#f1dbcf] hover:bg-[#241b17] hover:border-[#c98062]/78 transition-colors flex items-center justify-center"
                            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                        >
                            {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                        </button>
                    </div>
                </div>
            </div>

            <div
                className={`relative z-10 flex-1 flex flex-col items-center px-4 pt-6 pb-12 ${
                    isMobileViewport ? 'justify-start overflow-y-auto' : 'justify-center'
                }`}
                style={{ paddingBottom: 'max(3rem, env(safe-area-inset-bottom))' }}
            >
                <div className="pointer-events-none absolute inset-0">
                    <img
                        src="/assets/games/stopthefirebackground.png"
                        alt=""
                        aria-hidden="true"
                        className="h-full w-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-slate-950/18" />
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-900/28 via-slate-900/8 to-slate-900/35" />
                </div>

                <div className="relative z-10 w-full max-w-6xl mb-4 sm:mb-6 px-2 sm:px-6 py-3 sm:py-6">
                    <div className="flex justify-center">
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
                            } [backface-visibility:hidden] [transform:translateZ(0)] rounded-2xl border border-[#4f4540]/80 shadow-[0_24px_60px_rgba(15,23,42,0.18)] overflow-hidden flex flex-col bg-[#14110f] ${
                                isFlipped ? 'pointer-events-none' : ''
                            }`}
                        >
                            <div
                                className="relative text-[#f8efe9] p-4 sm:p-6 flex items-center justify-between overflow-hidden border-b border-[#4f4540]/70"
                                style={CHARCOAL_HEADER_BACKGROUND_STYLE}
                            >
                                <div className="pointer-events-none absolute inset-0">
                                    <div className="absolute inset-0 bg-black/34" />
                                    <div className="absolute inset-0 bg-gradient-to-r from-[#0f0d0c]/62 via-[#171513]/42 to-[#0e0c0b]/62" />
                                </div>
                                <div className="relative">
                                    <div className="text-xs uppercase tracking-widest text-[#e7c9b8]">Setup</div>
                                    <div className="text-lg sm:text-2xl font-bold">
                                        {isTieBreaker ? 'Tie-breaker Round' : `Round ${roundIndex}`}
                                    </div>
                                </div>
                                <div className="relative text-right">
                                    <div className="text-3xl sm:text-4xl font-black">{currentLetter}</div>
                                </div>
                            </div>

                            <div className="flex-1 bg-[#fff8f1]/95 overflow-visible sm:overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                                            ? 'bg-[#7a2f12] text-white shadow-md'
                                                            : 'bg-slate-100 text-slate-600'
                                                    } ${!canEditTeams ? 'opacity-50 cursor-not-allowed' : 'hover:bg-amber-50'}`}
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
                                                    className="w-full p-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-amber-200 outline-none"
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
                                                        difficulty === level ? 'bg-[#7a2f12] text-white' : 'bg-slate-100 text-slate-600 hover:bg-amber-50'
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
                                                max={categoryCountMax}
                                                value={categoryCount}
                                                onChange={(e) => !isTieBreaker && setCategoryCount(Number(e.target.value))}
                                                disabled={isTieBreaker}
                                                className="w-full accent-[#7a2f12]"
                                            />
                                            <div className="min-w-[44px] text-center text-sm font-bold text-[#7a2f12] bg-amber-50 border border-amber-200 rounded-lg py-1">
                                                {categoryCount}
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                                            <span>{CATEGORY_MIN}</span>
                                            <span>{categoryCountMax}</span>
                                        </div>
                                        {manualCategoryPool && selectedCategories.length > 0 && (
                                            <p className="text-[11px] text-slate-500 mt-2">
                                                Using {selectedCategories.length} selected category{selectedCategories.length === 1 ? '' : 'ies'}.
                                            </p>
                                        )}
                                        {isTieBreaker && <p className="text-[11px] text-slate-400 mt-2">Tie-breaker uses 1 category.</p>}
                                    </div>

                                    {manualCategoryPool && (
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="block text-xs font-bold text-slate-500 uppercase">Choose Categories (Optional)</label>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCategoryPicker((prev) => !prev)}
                                                    className="text-xs font-bold text-[#7a2f12] hover:text-[#5b1f0a]"
                                                >
                                                    {showCategoryPicker ? 'Hide' : 'Select'}
                                                </button>
                                            </div>
                                            <p className="text-[11px] text-slate-400 mb-2">
                                                Leave none selected to play with a random set from your word bank.
                                            </p>
                                            {showCategoryPicker && (
                                                <div className="space-y-2">
                                                    <input
                                                        type="text"
                                                        value={categorySearch}
                                                        onChange={(e) => setCategorySearch(e.target.value)}
                                                        placeholder="Search categories..."
                                                        className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-200 outline-none"
                                                    />
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedCategories(manualCategoryList)}
                                                            className="text-xs font-bold px-3 py-1 rounded-full border border-slate-200 text-slate-600 hover:border-amber-300 hover:text-[#7a2f12]"
                                                        >
                                                            Select all
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedCategories([])}
                                                            className="text-xs font-bold px-3 py-1 rounded-full border border-slate-200 text-slate-600 hover:border-amber-300 hover:text-[#7a2f12]"
                                                        >
                                                            Clear
                                                        </button>
                                                        <span className="text-[11px] text-slate-400 flex items-center">
                                                            {selectedCategories.length} selected
                                                        </span>
                                                    </div>
                                                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
                                                        {filteredManualCategories.length === 0 ? (
                                                            <div className="text-xs text-slate-400">No categories found.</div>
                                                        ) : (
                                                            filteredManualCategories.map((cat) => (
                                                                <label key={cat} className="flex items-center gap-2 text-sm text-slate-700">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedCategories.includes(cat)}
                                                                        onChange={() => toggleCategorySelection(cat)}
                                                                        className="accent-[#7a2f12]"
                                                                    />
                                                                    <span className="flex-1">{cat}</span>
                                                                </label>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Timer</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {TIMER_OPTIONS.map((value) => (
                                                <button
                                                    key={value}
                                                    onClick={() => setTimerSeconds(value)}
                                                    className={`py-2 rounded-lg text-xs font-bold transition-all ${
                                                        timerSeconds === value ? 'bg-[#7a2f12] text-white' : 'bg-slate-100 text-slate-600 hover:bg-amber-50'
                                                    }`}
                                                >
                                                    {value}s
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
                                        <div>
                                            <div className="text-xs uppercase tracking-widest text-[#9a3412]">Preview</div>
                                            <div className="text-3xl font-black text-[#7a2f12]">{currentLetter}</div>
                                        </div>
                                        <button
                                            onClick={rerollLetter}
                                            className="p-2 rounded-full bg-white text-[#9a3412] border border-amber-200 hover:bg-amber-100"
                                            title="Reroll letter"
                                        >
                                            <RefreshCw size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div
                                className={`relative p-4 sm:p-6 border-t border-[#4f4540]/70 flex flex-col sm:flex-row gap-3 sm:items-center ${
                                    isTieBreaker ? 'sm:justify-between' : 'sm:justify-end'
                                } bg-[#161311] overflow-hidden ${
                                    isMobileViewport ? '' : 'sticky bottom-0 z-10'
                                }`}
                                style={CHARCOAL_HEADER_BACKGROUND_STYLE}
                            >
                                <div className="pointer-events-none absolute inset-0">
                                    <div className="absolute inset-0 bg-black/36" />
                                    <div className="absolute inset-0 bg-gradient-to-r from-[#0f0d0c]/64 via-[#171513]/46 to-[#0e0c0b]/64" />
                                </div>
                                {isTieBreaker && <div className="relative text-xs text-[#d5c4b9]">Tie-breaker round: 1 category, first to answer.</div>}
                                <button
                                    onClick={beginRound}
                                    className="relative bg-[#2a2220] border border-[#6a5950]/70 text-[#f7ddd1] font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-[#342925] transition-colors"
                                >
                                    Start Round
                                </button>
                            </div>
                        </div>

                        {/* BACK - PLAY */}
                            {!(isMobileViewport && !isFlipped) && (
                                <div
                                    className={`absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl shadow-2xl overflow-visible flex flex-col h-full bg-[#14110f] ${
                                        !isFlipped ? 'pointer-events-none' : ''
                                    }`}
                                >
                            <div
                                className="relative px-4 py-5 sm:px-6 sm:py-7 min-h-[122px] sm:min-h-[138px] flex items-center justify-between text-[#f8efe9] border-b border-[#4f4540]/70 overflow-hidden rounded-t-2xl"
                                style={CHARCOAL_HEADER_BACKGROUND_STYLE}
                            >
                                <div className="pointer-events-none absolute inset-0">
                                    <div className="absolute inset-0 bg-black/34" />
                                    <div className="absolute inset-0 bg-gradient-to-r from-[#0f0d0c]/62 via-[#171513]/42 to-[#0e0c0b]/62" />
                                </div>
                                <div className="relative z-10">
                                    <div className="text-xs uppercase tracking-widest text-[#e7c9b8]">
                                        {isTieBreaker ? 'Tie-breaker' : `Round ${roundIndex}`}
                                    </div>
                                </div>
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                    <div className="translate-y-[2px] text-[clamp(54px,7.8vw,112px)] font-black leading-none text-[#f7ddd1] [text-shadow:0_3px_8px_rgba(0,0,0,0.55)]">
                                        {currentLetter}
                                    </div>
                                </div>
                                <div className="relative z-10 flex items-center gap-3 shrink-0">
                                    <button
                                        onClick={handleStop}
                                        className="bg-[#27211e] border border-[#6a5950]/70 text-[#f7ddd1] font-bold px-4 py-2 rounded-full shadow-md hover:bg-[#322925]"
                                    >
                                        Stop
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 bg-[#fff8f1]/95 p-3 sm:p-6 flex flex-col min-h-0 rounded-b-2xl">
                                <div className="mb-3 sm:mb-4">
                                    <div className="relative h-8 sm:h-10 overflow-visible">
                                        <div className="absolute inset-0 rounded-full overflow-hidden bg-[#20130e]/85 shadow-[inset_0_3px_8px_rgba(0,0,0,0.5)]">
                                            <div className="absolute inset-[2px] rounded-full bg-[#352016]/70" />
                                            <div className="absolute inset-[2px] rounded-full overflow-hidden">
                                                <div
                                                    className="relative h-full rounded-full overflow-visible"
                                                    style={{ width: timerFillWidth, background: fireBarGradient, transition: 'width 70ms linear' }}
                                                >
                                                    {timerProgress > 0.01 && <FireTimerCanvas urgency={timerUrgency} mode="fill" />}
                                                </div>
                                            </div>
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <span className="text-white font-black text-sm sm:text-lg drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]">
                                                    {timeLeft}s
                                                </span>
                                            </div>
                                        </div>
                                        <div
                                            className="absolute top-1/2 w-3 h-3 rounded-full pointer-events-none z-10"
                                            style={{
                                                left: timerFillWidth,
                                                transform: 'translate(-50%, -50%)',
                                                background: 'radial-gradient(circle, rgba(255,248,210,1) 0%, rgba(251,146,60,0.92) 55%, rgba(239,68,68,0.45) 100%)',
                                                boxShadow: fireHeadGlow
                                            }}
                                        />
                                        <div
                                            className="absolute top-1/2 pointer-events-none overflow-visible z-20"
                                            style={{
                                                left: timerFillWidth,
                                                width: isMobileViewport ? 280 : 360,
                                                height: isMobileViewport ? 180 : 240,
                                                transform: `translate(-${FIRE_EMITTER_X_RATIO * 100}%, calc(-${FIRE_EMITTER_Y_RATIO * 100}% + ${FIRE_LAYER_NUDGE_Y_PX}px))`
                                            }}
                                        >
                                            <FireTimerCanvas urgency={timerUrgency} />
                                        </div>
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
                                    {displayedCategories.map(({ category, originalIndex }) => {
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
                                                key={`${originalIndex}-${category}`}
                                                className={`flex items-center gap-3 rounded-xl bg-[#fffdf9] border border-[#ead7c4] shadow-sm min-h-0 overflow-hidden ${
                                                    isMobileViewport ? '' : 'h-full'
                                                }`}
                                                style={{ padding: `${categoryLayout.padding}px` }}
                                            >
                                            <div
                                                className="rounded-full bg-[#7a2f12] text-white font-bold flex items-center justify-center leading-none"
                                                style={{
                                                    width: `${categoryLayout.circle}px`,
                                                    height: `${categoryLayout.circle}px`,
                                                    fontSize: Math.max(12, Math.floor(categoryLayout.circle * 0.55)),
                                                    lineHeight: 1
                                                }}
                                            >
                                                <span className="leading-none" style={{ transform: 'translateY(1px)' }}>
                                                    {originalIndex + 1}
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
                    </div>
                </div>

                {showReview && (
                    <div className="absolute inset-0 z-[500] bg-black/40 backdrop-blur-sm">
                        <div
                            className={`relative h-full flex flex-col items-center px-4 pt-6 pb-12 ${
                                isMobileViewport || isCompactHeight ? 'justify-start overflow-y-auto' : 'justify-center'
                            }`}
                            style={{ paddingBottom: 'max(3rem, env(safe-area-inset-bottom))' }}
                        >
                            <div className="relative z-10 w-full max-w-6xl mb-4 sm:mb-6 px-2 sm:px-6 py-3 sm:py-6">
                                <div className="flex justify-center">
                                    <div
                                        className={`w-full max-w-[420px] h-[68vh] max-h-[720px] min-h-[380px] sm:max-w-[560px] sm:h-full sm:max-h-[90vh] md:max-w-6xl md:h-auto md:max-h-full md:aspect-[16/9] ${
                                            isCompactHeight ? 'h-auto max-h-none min-h-[380px]' : ''
                                        }`}
                                    >
                                        <div className="h-full rounded-2xl border border-[#4f4540]/80 shadow-[0_24px_60px_rgba(15,23,42,0.22)] overflow-hidden flex flex-col bg-[#14110f]">
                                            <div
                                                className="relative p-4 sm:p-6 border-b border-[#4f4540]/70 flex items-center justify-between overflow-hidden"
                                                style={CHARRED_REVIEW_HEADER_BACKGROUND_STYLE}
                                            >
                                                <div className="pointer-events-none absolute inset-0">
                                                    <div className="absolute inset-0 bg-black/48" />
                                                    <div className="absolute inset-0 bg-gradient-to-r from-[#0f0d0c]/76 via-[#171513]/54 to-[#0e0c0b]/76" />
                                                </div>
                                                <div className="relative rounded-lg border border-white/15 bg-black/45 px-3 py-2 backdrop-blur-[1px]">
                                                    <h2 className="text-xl font-bold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.75)]">Score Round</h2>
                                                    <p className="text-sm text-[#f2e4da] [text-shadow:0_1px_2px_rgba(0,0,0,0.65)]">
                                                        Category {reviewIndex + 1} of {totalCategories}. Use 2 (unique), 1 (shared), 0 (invalid).
                                                    </p>
                                                </div>
                                            </div>

                                            <div className={`flex-1 basis-0 min-h-0 p-6 bg-[#fff8f1] ${isCompactHeight ? 'overflow-visible' : 'overflow-auto'}`}>
                                                <div className="bg-[#fffdf9] border border-[#d8c5b5] rounded-2xl p-4 sm:p-6 mb-6">
                                                    <div className="text-xs uppercase tracking-widest text-[#9a3412] mb-2">Category</div>
                                                    <div className="text-lg sm:text-2xl font-bold text-slate-800">{currentReviewCategory}</div>
                                                </div>
                                                <div className="space-y-3">
                                                    {teamNames.map((name, tIdx) => (
                                                        <div key={name} className="flex items-center justify-between gap-4 bg-[#fffdf9] border border-[#dfcfc2] rounded-xl px-4 py-3">
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
                                                                                    ? 'bg-[#2a2220] text-[#f7ddd1] border-[#6f564a]'
                                                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
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

                                            <div
                                                className="relative p-4 sm:p-6 border-t border-[#4f4540]/70 overflow-hidden"
                                                style={CHARRED_REVIEW_HEADER_BACKGROUND_STYLE}
                                            >
                                                <div className="pointer-events-none absolute inset-0">
                                                    <div className="absolute inset-0 bg-black/36" />
                                                    <div className="absolute inset-0 bg-gradient-to-r from-[#0f0d0c]/64 via-[#171513]/46 to-[#0e0c0b]/64" />
                                                </div>
                                                <div className="relative ml-auto flex flex-row items-center justify-end gap-3 w-full">
                                                    <button
                                                        onClick={() => setReviewIndex((prev) => Math.max(0, prev - 1))}
                                                        disabled={reviewIndex === 0}
                                                        className="flex-none bg-[#2a2220] text-[#f7ddd1] border border-[#6a5950]/70 font-bold px-5 py-3 rounded-xl hover:bg-[#342925] disabled:opacity-50"
                                                    >
                                                        Previous
                                                    </button>
                                                    {reviewIndex < totalCategories - 1 ? (
                                                        <button
                                                            onClick={() => setReviewIndex((prev) => Math.min(totalCategories - 1, prev + 1))}
                                                            className="flex-none bg-[#2a2220] border border-[#6a5950]/70 text-[#f7ddd1] font-bold px-6 py-3 rounded-xl hover:bg-[#342925]"
                                                        >
                                                            Next Category
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={applyScores}
                                                            className="flex-none bg-[#2a2220] border border-[#6a5950]/70 text-[#f7ddd1] font-bold px-6 py-3 rounded-xl hover:bg-[#342925]"
                                                        >
                                                            Apply Scores
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
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
                                            setTimeLeftMs((prev) => prev + extraTime * 1000);
                                            startTimer();
                                        }}
                                        className="bg-[#2a2220] border border-[#6a5950]/70 text-[#f7ddd1] font-bold px-6 py-3 rounded-xl hover:bg-[#342925]"
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
                                        className="flex-1 bg-[#2a2220] border border-[#6a5950]/70 text-[#f7ddd1] font-bold py-3 rounded-xl hover:bg-[#342925]"
                                    >
                                        Yes, Score
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowStopPrompt(false);
                                            if (!isTimesUp && timeLeftMs > 0) startTimer();
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
                                <div key={idx} className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-full font-bold text-slate-700">
                                    {teamNames[idx]}: {score}
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={handleNextRound}
                                className="flex-1 bg-[#7a2f12] text-white font-bold py-3 rounded-xl hover:bg-[#5b1f0a]"
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
                                    className="w-full bg-[#7a2f12] text-white font-bold py-3 rounded-xl hover:bg-[#5b1f0a]"
                                >
                                    {teamNames[idx]} Wins
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};


