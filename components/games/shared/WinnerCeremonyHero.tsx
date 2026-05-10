import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { LiveQuizAvatarIcon } from '../liveQuizAvatars';

type AnimationStage =
    | 'idle'
    | 'bronze-light'
    | 'bronze-rise'
    | 'silver-light'
    | 'silver-rise'
    | 'gold-light'
    | 'gold-rise'
    | 'complete';

const WINNER_STAGE_ORDER: Record<AnimationStage, number> = {
    idle: 0,
    'bronze-light': 1,
    'bronze-rise': 2,
    'silver-light': 3,
    'silver-rise': 4,
    'gold-light': 5,
    'gold-rise': 6,
    complete: 7,
};

const WINNER_CEREMONY_MUSIC_OPTIONS = [
    {
        id: 'triumph-sequence',
        tracks: ['/assets/audio/live-quiz/triumph1.mp3', '/assets/audio/live-quiz/triumph2.mp3'],
    },
    {
        id: 'champion-of-the-class',
        tracks: ['/assets/audio/live-quiz/Champion of the class.mp3'],
    },
    {
        id: 'winners-on-the-board',
        tracks: ['/assets/audio/live-quiz/Winners on the board.mp3'],
    },
    {
        id: 'winner-of-the-game',
        tracks: ['/assets/audio/live-quiz/You are the winner of the game.mp3'],
    },
    {
        id: 'winner-of-the-game-1',
        tracks: ['/assets/audio/live-quiz/You are the winner of the game (1).mp3'],
    },
    {
        id: 'winner-of-the-game-2',
        tracks: ['/assets/audio/live-quiz/You are the winner of the game (2).mp3'],
    },
];

const CEREMONY_COLORS = {
    gold: { light: '#FFFBD0', mid: '#F5BD02', dark: '#8B6508' },
    silver: { light: '#F5F5F5', mid: '#A0A0A0', dark: '#4A4A4A' },
    bronze: { light: '#F5CBA7', mid: '#A0522D', dark: '#5D2E17' },
    accent: '#22d3ee',
};

const getCeremonyTone = (rank: 1 | 2 | 3) => {
    if (rank === 2) return CEREMONY_COLORS.silver;
    if (rank === 3) return CEREMONY_COLORS.bronze;
    return CEREMONY_COLORS.gold;
};

const WinnerCeremonyTrophy: React.FC<{ rank: 1 | 2 | 3; size?: number; className?: string }> = ({ rank, size = 120, className }) => {
    const gradId = `ceremony-trophy-grad-${rank}`;
    const rimId = `ceremony-trophy-rim-${rank}`;
    const tone = getCeremonyTone(rank);

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            aria-hidden="true"
        >
            <defs>
                <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={tone.dark} />
                    <stop offset="20%" stopColor={tone.mid} />
                    <stop offset="45%" stopColor={tone.light} />
                    <stop offset="55%" stopColor={tone.light} />
                    <stop offset="80%" stopColor={tone.mid} />
                    <stop offset="100%" stopColor={tone.dark} />
                </linearGradient>
                <linearGradient id={rimId} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={tone.light} />
                    <stop offset="100%" stopColor={tone.dark} />
                </linearGradient>
            </defs>

            <path d="M32 30C18 30 18 55 32 55" stroke={tone.dark} strokeWidth="6" strokeLinecap="round" />
            <path d="M32 30C18 30 18 55 32 55" stroke={`url(#${gradId})`} strokeWidth="4" strokeLinecap="round" />
            <path d="M68 30C82 30 82 55 68 55" stroke={tone.dark} strokeWidth="6" strokeLinecap="round" />
            <path d="M68 30C82 30 82 55 68 55" stroke={`url(#${gradId})`} strokeWidth="4" strokeLinecap="round" />
            <path d="M32 25C32 15 68 15 68 25V50C68 68 32 68 32 50V25Z" fill={`url(#${gradId})`} stroke="rgba(0,0,0,0.14)" strokeWidth="0.5" />
            <ellipse cx="50" cy="25" rx="18" ry="4" fill={tone.dark} />
            <ellipse cx="50" cy="24" rx="18" ry="4" fill={`url(#${rimId})`} />
            <ellipse cx="50" cy="24" rx="15" ry="3" fill="rgba(0,0,0,0.38)" />
            <rect x="46" y="26" width="3" height="30" fill="white" fillOpacity="0.3" filter="blur(1px)" />
            <path d="M45 65C45 65 47 75 42 80H58C53 75 55 65 55 65" fill={`url(#${gradId})`} />
            <rect x="35" y="80" width="30" height="10" rx="2" fill={`url(#${gradId})`} />
            <rect x="30" y="88" width="40" height="6" rx="1" fill={tone.dark} />
            <text x="50" y="52" fontSize="16" fontWeight="900" fill="rgba(0,0,0,0.5)" textAnchor="middle">
                {rank}
            </text>
        </svg>
    );
};

const WinnerCeremonySpotlight: React.FC<{
    active: boolean;
    delay?: number;
    color?: string;
    sourceX?: number;
    sourceWidth?: number;
    baseInset?: number;
}> = ({ active, delay = 0, color = 'rgba(255,255,255,0.4)', sourceX = 50, sourceWidth = 6, baseInset = 0.6 }) => {
    const left = Math.max(0, sourceX - sourceWidth / 2);
    const right = Math.min(100, sourceX + sourceWidth / 2);
    const baseLeft = Math.max(0, Math.min(22, baseInset));
    const baseRight = 100 - baseLeft;
    const coreLeft = Math.min(40, baseLeft + 0.8);
    const coreRight = 100 - coreLeft;
    const softLeft = Math.min(45, baseLeft + 1.8);
    const softRight = 100 - softLeft;

    return (
        <div
            className="absolute inset-0 pointer-events-none z-[5] overflow-visible transition-all duration-800 ease-out"
            style={{
                opacity: active ? 1 : 0,
                transform: `scale(${active ? 1 : 0.96})`,
                transitionDelay: `${delay}ms`,
                WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.78) 48%, rgba(0,0,0,0.32) 78%, rgba(0,0,0,0) 100%)',
                maskImage: 'linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.78) 48%, rgba(0,0,0,0.32) 78%, rgba(0,0,0,0) 100%)',
            }}
        >
            <div
                className="absolute left-0 right-0 top-0 h-[132%]"
                style={{
                    background: `radial-gradient(ellipse at ${sourceX}% 0%, ${color} 0%, rgba(255,255,255,0.38) 14%, rgba(255,255,255,0.2) 30%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.03) 72%, rgba(255,255,255,0) 92%)`,
                    clipPath: `polygon(${left}% 0%, ${right}% 0%, ${baseRight}% 100%, ${baseLeft}% 100%)`,
                    filter: 'blur(7px)',
                }}
            />
            <div
                className="absolute left-0 right-0 top-0 h-[132%] opacity-40"
                style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.46) 18%, rgba(255,255,255,0.24) 42%, rgba(255,255,255,0.11) 64%, rgba(255,255,255,0.04) 80%, rgba(255,255,255,0) 100%)',
                    clipPath: `polygon(${left}% 0%, ${right}% 0%, ${coreRight}% 100%, ${coreLeft}% 100%)`,
                    filter: 'blur(2px)',
                }}
            />
            <div
                className="absolute left-0 right-0 top-0 h-[132%] opacity-22"
                style={{
                    background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0) 100%)',
                    clipPath: `polygon(${left}% 0%, ${right}% 0%, ${softRight}% 100%, ${softLeft}% 100%)`,
                    filter: 'blur(4px)',
                }}
            />
        </div>
    );
};

const WinnerCeremonyConfetti: React.FC<{ active: boolean }> = ({ active }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!active) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let viewWidth = 0;
        let viewHeight = 0;
        let disposed = false;
        const colors = ['#FFD700', '#FF4500', '#00BFFF', '#7CFC00', '#FF1493', '#22D3EE'];
        const particleCount = 150;
        const particles = Array.from({ length: particleCount }, () => ({
            x: 0,
            y: 0,
            r: Math.random() * 6 + 2,
            d: Math.random() * 150,
            color: colors[Math.floor(Math.random() * colors.length)],
            tilt: Math.random() * 10 - 10,
            tiltAngleIncremental: Math.random() * 0.07 + 0.05,
            tiltAngle: Math.random() * Math.PI * 2,
        }));

        const resetParticle = (particle: (typeof particles)[number], randomY = true) => {
            particle.x = Math.random() * viewWidth;
            particle.y = randomY ? Math.random() * viewHeight - viewHeight : -20;
        };

        const resize = () => {
            if (disposed) return;
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            const rect = canvas.getBoundingClientRect();
            viewWidth = Math.max(1, Math.floor((rect.width || window.innerWidth || 1)));
            viewHeight = Math.max(1, Math.floor((rect.height || window.innerHeight || 1)));
            canvas.width = Math.max(1, Math.floor(viewWidth * dpr));
            canvas.height = Math.max(1, Math.floor(viewHeight * dpr));
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);
            particles.forEach((particle) => {
                if (!particle.x && !particle.y) {
                    resetParticle(particle, true);
                } else if (particle.x > viewWidth + 40 || particle.y > viewHeight + 40) {
                    resetParticle(particle, false);
                }
            });
        };

        resize();
        window.addEventListener('resize', resize);

        let animationId = 0;
        const draw = () => {
            if (disposed) return;
            ctx.clearRect(0, 0, viewWidth, viewHeight);
            particles.forEach((particle) => {
                particle.tiltAngle += particle.tiltAngleIncremental;
                particle.y += (Math.cos(particle.d) + 3 + particle.r / 2) / 2;
                particle.x += Math.sin(particle.d) * 0.6;
                particle.tilt = Math.sin(particle.tiltAngle) * 15;

                ctx.beginPath();
                ctx.lineWidth = particle.r;
                ctx.strokeStyle = particle.color;
                ctx.moveTo(particle.x + particle.tilt + particle.r / 2, particle.y);
                ctx.lineTo(particle.x + particle.tilt, particle.y + particle.tilt + particle.r / 2);
                ctx.stroke();

                if (particle.y > viewHeight + 20 || particle.x < -40 || particle.x > viewWidth + 40) {
                    resetParticle(particle, false);
                }
            });

            animationId = window.requestAnimationFrame(draw);
        };

        animationId = window.requestAnimationFrame(draw);
        return () => {
            disposed = true;
            window.cancelAnimationFrame(animationId);
            window.removeEventListener('resize', resize);
        };
    }, [active]);

    return (
        <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full pointer-events-none z-20 ${active ? 'opacity-100' : 'opacity-0'}`}
            aria-hidden="true"
        />
    );
};

export interface WinnerCeremonyRankingEntry {
    index: number;
    score: number;
    name: string;
    id?: string;
    avatarId?: string;
}

interface WinnerCeremonyHeroProps {
    winnerHeadline: string;
    subtitle?: string;
    ranking: WinnerCeremonyRankingEntry[];
    isMobileViewport: boolean;
    onPlayAgain: () => void;
    onExit: () => void;
    musicEnabled?: boolean;
    children?: React.ReactNode;
}

export const WinnerCeremonyHero: React.FC<WinnerCeremonyHeroProps> = ({
    winnerHeadline,
    subtitle = 'Final standings',
    ranking,
    isMobileViewport,
    onPlayAgain,
    onExit,
    musicEnabled = true,
    children,
}) => {
    const [winnerAnimationStage, setWinnerAnimationStage] = useState<AnimationStage>('idle');
    const winnerStageTimeoutsRef = useRef<number[]>([]);
    const winnerMusicRef = useRef<HTMLAudioElement | null>(null);
    const lastWinnerMusicChoiceRef = useRef<string>('');

    const stopWinnerMusic = useCallback(() => {
        if (!winnerMusicRef.current) return;
        winnerMusicRef.current.pause();
        winnerMusicRef.current.src = '';
        winnerMusicRef.current = null;
    }, []);

    const playWinnerMusic = useCallback(() => {
        stopWinnerMusic();
        if (!musicEnabled) return;

        const availableOptions = WINNER_CEREMONY_MUSIC_OPTIONS.filter((option) => option.id !== lastWinnerMusicChoiceRef.current);
        const options = availableOptions.length ? availableOptions : WINNER_CEREMONY_MUSIC_OPTIONS;
        const selectedOption = options[Math.floor(Math.random() * options.length)];
        lastWinnerMusicChoiceRef.current = selectedOption.id;

        const playTrackAtIndex = (trackIndex: number) => {
            const trackSrc = selectedOption.tracks[trackIndex];
            if (!trackSrc) return;

            const track = new Audio(trackSrc);
            track.volume = 0.5;
            winnerMusicRef.current = track;
            track.addEventListener('ended', () => {
                if (winnerMusicRef.current !== track) return;
                playTrackAtIndex(trackIndex + 1);
            }, { once: true });
            void track.play().catch(() => {});
        };

        playTrackAtIndex(0);
        if (!winnerMusicRef.current) {
            // Browsers can block autoplay until the teacher clicks a control.
        }
    }, [musicEnabled, stopWinnerMusic]);

    const clearWinnerCeremonyTimers = useCallback(() => {
        winnerStageTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
        winnerStageTimeoutsRef.current = [];
    }, []);

    const restartWinnerCeremony = useCallback(() => {
        clearWinnerCeremonyTimers();
        playWinnerMusic();
        setWinnerAnimationStage('bronze-light');

        const scheduleStage = (delayMs: number, stage: AnimationStage) => {
            const timeoutId = window.setTimeout(() => {
                setWinnerAnimationStage(stage);
            }, delayMs);
            winnerStageTimeoutsRef.current.push(timeoutId);
        };

        scheduleStage(600, 'bronze-rise');
        scheduleStage(1200, 'silver-light');
        scheduleStage(1800, 'silver-rise');
        scheduleStage(2400, 'gold-light');
        scheduleStage(3000, 'gold-rise');
        scheduleStage(3800, 'complete');
    }, [clearWinnerCeremonyTimers, playWinnerMusic]);

    useEffect(() => {
        restartWinnerCeremony();
        return () => {
            clearWinnerCeremonyTimers();
            stopWinnerMusic();
        };
    }, [restartWinnerCeremony, clearWinnerCeremonyTimers, stopWinnerMusic]);

    const stageIndex = WINNER_STAGE_ORDER[winnerAnimationStage];
    const isStageAtLeast = (stage: AnimationStage) => stageIndex >= WINNER_STAGE_ORDER[stage];

    const topThree = useMemo(() => ranking.slice(0, 3), [ranking]);
    const podiumByRank = new Map<1 | 2 | 3, WinnerCeremonyRankingEntry>();
    const rankOne = topThree[0];
    const rankTwo = topThree[1];
    const rankThree = topThree[2];
    if (rankOne) podiumByRank.set(1, rankOne);
    if (rankTwo) podiumByRank.set(2, rankTwo);
    if (rankThree) podiumByRank.set(3, rankThree);

    const ceremonySlots = ([2, 1, 3] as const).map((rank) => {
        const team = podiumByRank.get(rank);
        if (!team) return null;
        return {
            key: `ceremony-${rank}-${team.index}`,
            rank,
            team,
        };
    }).filter((slot): slot is { key: string; rank: 1 | 2 | 3; team: WinnerCeremonyRankingEntry } => Boolean(slot));

    const isRankSpotlightVisible = (rank: 1 | 2 | 3) => {
        if (rank === 1) return isStageAtLeast('gold-light');
        if (rank === 2) return isStageAtLeast('silver-light');
        return isStageAtLeast('bronze-light');
    };
    const isRankPodiumActive = (rank: 1 | 2 | 3) => {
        if (rank === 1) return isStageAtLeast('gold-rise');
        if (rank === 2) return isStageAtLeast('silver-rise');
        return isStageAtLeast('bronze-rise');
    };
    const winnerHeroTopClearance = 'clamp(12px, 2.5vh, 20px)';
    const getPodiumHeight = (rank: 1 | 2 | 3) => {
        if (rank === 1) return 'clamp(150px, 26vw, 270px)';
        if (rank === 2) return 'clamp(120px, 20vw, 190px)';
        return 'clamp(96px, 16vw, 136px)';
    };
    const getPodiumPalette = (rank: 1 | 2 | 3) => {
        if (rank === 1) {
            return {
                front: 'linear-gradient(180deg, #fde68a 0%, #facc15 62%, #f59e0b 100%)',
                top: 'linear-gradient(180deg, #fef9c3 0%, #facc15 100%)',
            };
        }
        if (rank === 2) {
            return {
                front: 'linear-gradient(180deg, #e2e8f0 0%, #cbd5e1 62%, #94a3b8 100%)',
                top: 'linear-gradient(180deg, #f8fafc 0%, #dbe4ef 100%)',
            };
        }
        return {
            front: 'linear-gradient(180deg, #fdba74 0%, #fb923c 62%, #c2410c 100%)',
            top: 'linear-gradient(180deg, #fed7aa 0%, #fb923c 100%)',
        };
    };
    const formatCeremonyScore = (score: number) => `${new Intl.NumberFormat('en-US').format(score)} PTS`;

    return (
        <div
            className="relative min-h-[calc(100vh-4rem)] bg-slate-950 text-white [background:radial-gradient(circle_at_18%_14%,rgba(14,165,233,0.24),transparent_34%),radial-gradient(circle_at_82%_20%,rgba(34,197,94,0.16),transparent_32%),radial-gradient(circle_at_50%_82%,rgba(250,204,21,0.16),transparent_38%),#020617]"
            style={{ overflowX: 'clip', overflowY: 'visible' }}
        >
            <style>{`
                @keyframes wordwheel-winner-aurora {
                    0%, 100% { transform: scale(1); opacity: 0.58; }
                    50% { transform: scale(1.02); opacity: 0.72; }
                }
                @keyframes wordwheel-winner-float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .wordwheel-winner-aurora {
                    background:
                        radial-gradient(circle at 18% 16%, rgba(56,189,248,0.28), transparent 46%),
                        radial-gradient(circle at 82% 20%, rgba(34,197,94,0.16), transparent 48%),
                        radial-gradient(circle at 50% 72%, rgba(250,204,21,0.14), transparent 58%);
                    animation: wordwheel-winner-aurora 10s ease-in-out infinite;
                    will-change: transform, opacity;
                }
                .wordwheel-winner-float {
                    animation: wordwheel-winner-float 2.8s ease-in-out infinite;
                }
                @media (prefers-reduced-motion: reduce) {
                    .wordwheel-winner-aurora,
                    .wordwheel-winner-float {
                        animation: none !important;
                    }
                }
            `}</style>

            <div className="wordwheel-winner-aurora absolute inset-0 pointer-events-none" />
            <WinnerCeremonyConfetti active={winnerAnimationStage === 'complete'} />

            <div
                className="relative z-10 w-full min-h-[calc(100vh-4rem)]"
                style={{ paddingTop: winnerHeroTopClearance, scrollPaddingTop: winnerHeroTopClearance }}
            >
                <div className="max-w-6xl mx-auto px-4 pt-10 sm:pt-14 pb-10 flex flex-col items-center text-center">
                    <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-black mb-2 text-white drop-shadow-[0_3px_8px_rgba(0,0,0,0.55)]">{winnerHeadline}</h1>
                    <p className="text-cyan-100 text-base sm:text-xl mb-6 font-bold drop-shadow-[0_2px_5px_rgba(0,0,0,0.45)]">{subtitle}</p>

                    <div className="relative w-full max-w-6xl mb-8 px-2 sm:px-4">
                        <div className="relative z-20 mx-auto w-fit max-w-full flex items-end justify-center gap-0 sm:gap-1 md:gap-1 pt-14 sm:pt-20 md:pt-24 pb-6 min-h-[300px] sm:min-h-[390px]">
                            <div className="absolute left-[-2%] right-[-2%] bottom-1 h-5 rounded-full bg-gradient-to-b from-slate-300/35 to-slate-900/65 border border-slate-200/35 shadow-[0_10px_24px_rgba(2,6,23,0.45)] pointer-events-none z-0" />
                            <div className="absolute left-[4%] right-[4%] bottom-1.5 h-3 rounded-full bg-cyan-300/20 blur-md pointer-events-none z-0" />
                            {ceremonySlots.map((slot, slotIndex) => {
                                const spotlightActive = isRankSpotlightVisible(slot.rank);
                                const active = isRankPodiumActive(slot.rank);
                                const palette = getPodiumPalette(slot.rank);
                                const trophySize = slot.rank === 1 ? (isMobileViewport ? 128 : 146) : (isMobileViewport ? 94 : 112);
                                const teamName = slot.team.name || `Team ${slot.team.index + 1}`;
                                const spotlightColor =
                                    slot.rank === 1 ? 'rgba(255,215,0,0.52)' : slot.rank === 2 ? 'rgba(192,192,192,0.44)' : 'rgba(205,127,50,0.45)';
                                const spotlightSourceX = slot.rank === 2 ? 92 : slot.rank === 3 ? 8 : 50;
                                const spotlightSourceWidth = slot.rank === 1 ? 7.4 : 6.8;
                                const spotlightBaseInset = slot.rank === 1 ? 0.15 : 0.35;
                                const spotlightHeight = 'clamp(330px, 40vw, 430px)';

                                return (
                                    <div key={slot.key} className="relative flex w-[124px] sm:w-[168px] md:w-[210px] flex-none flex-col items-center">
                                        <div className="absolute left-0 right-0 pointer-events-none z-0" style={{ height: spotlightHeight, bottom: getPodiumHeight(slot.rank) }}>
                                            <WinnerCeremonySpotlight
                                                active={spotlightActive}
                                                color={spotlightColor}
                                                sourceX={spotlightSourceX}
                                                sourceWidth={spotlightSourceWidth}
                                                baseInset={spotlightBaseInset}
                                            />
                                        </div>
                                        <div
                                            className={`relative z-30 w-full flex flex-col items-center transition-all duration-700 ${active ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                                            style={{
                                                transform: active ? 'translateY(0)' : 'translateY(140px)',
                                                opacity: active ? 1 : 0,
                                                transitionProperty: 'transform, opacity',
                                                transitionDuration: '960ms, 760ms',
                                                transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1), ease-out',
                                                transitionDelay: '60ms',
                                                transformStyle: 'preserve-3d',
                                            }}
                                        >
                                            <div
                                                className={`mb-3 sm:mb-4 flex flex-col items-center transition-all duration-700 ${active ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                                                style={{ transitionDelay: '180ms' }}
                                            >
                                                <div className={`relative wordwheel-winner-float ${slot.rank === 1 ? 'scale-[1.15]' : 'scale-100'}`} style={{ animationDelay: `${slotIndex * 180}ms` }}>
                                                    <WinnerCeremonyTrophy rank={slot.rank} size={trophySize} className="drop-shadow-[0_15px_25px_rgba(0,0,0,0.6)]" />
                                                </div>
                                                <div className="text-center mt-1">
                                                    {slot.team.avatarId && (
                                                        <div className="mb-1 flex justify-center">
                                                            <LiveQuizAvatarIcon avatarId={slot.team.avatarId} className={slot.rank === 1 ? 'h-14 w-14' : 'h-11 w-11'} iconSize={24} />
                                                        </div>
                                                    )}
                                                    <h3 className="text-white font-display font-black text-base sm:text-xl md:text-2xl tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] max-w-[210px] truncate">
                                                        {teamName}
                                                    </h3>
                                                    <div className="h-1 w-12 mx-auto my-1 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.75)]" style={{ backgroundColor: CEREMONY_COLORS.accent }} />
                                                    <p className="text-cyan-200 font-bold text-[9px] sm:text-xs tracking-[0.18em] uppercase">
                                                        {formatCeremonyScore(slot.team.score)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="relative w-full" style={{ height: getPodiumHeight(slot.rank), perspective: '1000px', transformStyle: 'preserve-3d' }}>
                                                <div
                                                    className="absolute inset-0 z-20 border-t border-white/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-12px_20px_rgba(2,6,23,0.22),0_12px_24px_rgba(2,6,23,0.32)] rounded-t-[16px] flex items-center justify-center overflow-hidden"
                                                    style={{
                                                        background: `linear-gradient(145deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 34%, rgba(2,6,23,0.2) 100%), ${palette.front}`,
                                                        transform: 'translateZ(10px)',
                                                    }}
                                                >
                                                    <span className="text-[3rem] sm:text-[4rem] md:text-[4.5rem] font-black text-black/25 select-none italic leading-none">{slot.rank}</span>
                                                    <div className="absolute top-0 left-0 w-full h-[2px] shadow-[0_0_15px_rgba(34,211,238,0.65)]" style={{ backgroundColor: 'rgba(125, 211, 252, 0.65)' }} />
                                                    <div className="absolute inset-y-0 left-0 w-[14%] pointer-events-none" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 100%)' }} />
                                                    <div className="absolute inset-y-0 right-0 w-[14%] pointer-events-none" style={{ background: 'linear-gradient(270deg, rgba(2,6,23,0.16) 0%, rgba(2,6,23,0) 100%)' }} />
                                                </div>
                                                <div
                                                    className="absolute top-0 left-0 w-full h-6 md:h-7 z-30 rounded-t-xl pointer-events-none"
                                                    style={{ background: `linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.18) 64%, rgba(255,255,255,0) 100%)` }}
                                                />
                                                <div
                                                    className="absolute -top-1.5 left-[6%] right-[6%] h-3 md:h-3.5 z-30 rounded-full pointer-events-none"
                                                    style={{ background: palette.top, boxShadow: '0 4px 8px rgba(15,23,42,0.24), inset 0 1px 2px rgba(255,255,255,0.55)' }}
                                                />
                                                <div className="absolute inset-x-0 bottom-0 h-[22%] pointer-events-none z-30" style={{ background: 'linear-gradient(180deg, rgba(2,6,23,0) 0%, rgba(2,6,23,0.24) 100%)' }} />
                                                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[108%] h-12 bg-black/45 blur-2xl rounded-full -z-10" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {children && <div className="mb-8 flex w-full justify-center">{children}</div>}

                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                        <button onClick={restartWinnerCeremony} className="px-6 py-3 rounded-xl bg-slate-900/85 border border-white/25 text-white font-bold hover:bg-slate-800 transition-all shadow-lg">
                            <RefreshCw size={18} className="inline mr-2" /> Replay Ceremony
                        </button>
                        <button onClick={onPlayAgain} className="px-8 py-3 rounded-xl bg-brand-yellow text-slate-950 font-black flex items-center justify-center hover:brightness-105 transition-all shadow-lg shadow-yellow-950/25">
                            <RefreshCw size={18} className="mr-2" /> Play Again
                        </button>
                        <button onClick={onExit} className="px-8 py-3 rounded-xl bg-white text-slate-950 font-black hover:bg-slate-100 transition-all shadow-lg">
                            Exit to Game Hub
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
