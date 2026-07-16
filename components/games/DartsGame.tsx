
import React, { useState, useEffect, useRef, useMemo, Suspense, useLayoutEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GeneratedGame, GameRunOptions, GeneratedQuestion, PracticeReviewItem } from '../../types';
import { playSound } from '../../utils/gameUtils';
import { resolveGameQuestionImageUrl } from '../../utils/gameImage';
import { WinnerCeremonyHero, WinnerCeremonyStandingsTable } from './shared/WinnerCeremonyHero';
import { PracticeReviewSummary } from './shared/PracticeReviewSummary';
import { ImportedDartboardModel, ImportedDartModel, OldBarRoomModel } from './models/DartsModels';
import { ArrowLeft, Clock, Check, X as XIcon, Edit2, Maximize2, Minimize2, RotateCcw, Volume2, VolumeX, Target, FileQuestion, AlertTriangle, Flag } from 'lucide-react';

interface DartsGameProps {
    game: GeneratedGame;
    options: GameRunOptions;
    onBack: () => void;
    onFinish: () => void;
    onReplay: () => void;
}

type GamePhase = 'aim' | 'question' | 'throwing' | 'result' | 'gameover';

interface DartObject {
    id: string;
    targetPosition: THREE.Vector3;
    startPosition: THREE.Vector3;
    controlPoint: THREE.Vector3;
    landed: boolean;
    color: string;
    scoreResult: number;
    textResult: string;
    multiplier: number; 
    points: number;
}

const BOARD_RADIUS = 1.15;
const BOARD_Z = -47.1;
const BOARD_Y = -0.35;
const SECTORS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const SLICE_ANGLE = (Math.PI * 2) / 20;

// These are distances on the imported 3D model, expressed as a fraction of
// the complete board radius. The texture is cropped and stretched inside the
// model, so using image pixels alone shifts the scoring strips inward.
const R_BULL_INNER = 11 / 512;
const R_BULL_OUTER = 34 / 512;
const R_TRIPLE_INNER = 1.073736906 / 2.46887803;
const R_TRIPLE_OUTER = 1.180746913 / 2.46887803;
const R_DOUBLE_INNER = 1.760491967 / 2.46887803;
const R_DOUBLE_OUTER = 1.856203198 / 2.46887803;

const CHALK_FONT = '"Schoolbell", "Chalkboard SE", "Chalkboard", "Bradley Hand", "Marker Felt", "Comic Sans MS", "Comic Sans", cursive';

const LocalReflectionEnvironment: React.FC = () => {
    const { gl, scene } = useThree();

    useEffect(() => {
        const generator = new THREE.PMREMGenerator(gl);
        const room = new RoomEnvironment();
        const target = generator.fromScene(room, 0.04);
        const previousEnvironment = scene.environment;
        const previousIntensity = scene.environmentIntensity;

        scene.environment = target.texture;
        scene.environmentIntensity = 0.35;

        return () => {
            scene.environment = previousEnvironment;
            scene.environmentIntensity = previousIntensity;
            target.dispose();
            room.dispose();
            generator.dispose();
        };
    }, [gl, scene]);

    return null;
};

const getBoardPointData = (x: number, y: number) => {
    const r = Math.sqrt(x * x + y * y) / BOARD_RADIUS;
    
    let degrees = Math.atan2(x, y) * (180 / Math.PI);
    if (degrees < 0) degrees += 360;
    
    const index = Math.floor(((degrees + 9) % 360) / 18);
    const sector = SECTORS[index];

    let zone = 'Single';
    let multiplier = 1;
    
    if (r < R_BULL_INNER) { return { points: 50, label: 'BULLSEYE', multiplier: 1, sector: 50 }; }
    if (r < R_BULL_OUTER) { return { points: 25, label: 'OUTER BULL', multiplier: 1, sector: 25 }; }
    
    if (r > R_TRIPLE_INNER && r < R_TRIPLE_OUTER) { zone = 'Treble'; multiplier = 3; }
    else if (r > R_DOUBLE_INNER && r < R_DOUBLE_OUTER) { zone = 'Double'; multiplier = 2; }
    else if (r > R_DOUBLE_OUTER) { return { points: 0, label: 'MISS', multiplier: 0, sector: 0 }; }
    
    return {
        points: sector * multiplier,
        label: `${zone} ${sector}`,
        multiplier,
        sector
    };
};

const getHitData = (uv: THREE.Vector2 | { x: number, y: number }) => {
    const x = (uv.x - 0.5) * 2 * BOARD_RADIUS;
    const y = (uv.y - 0.5) * 2 * BOARD_RADIUS;
    return getBoardPointData(x, y);
};

// --- 3D DART ---
const AnimatedDart: React.FC<{ 
    dart: DartObject, 
    onLand: (dart: DartObject) => void 
}> = ({ 
    dart, 
    onLand 
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const hasLanded = useRef(false);
    const startTimeRef = useRef<number | null>(null);

    // Random roll gives each imported dart a slightly different landing angle.
    const randomRoll = useMemo(() => Math.random() * Math.PI * 2, []);
    
    // Random "sag": gravity effect on the dart's tail
    const sagAngle = useMemo(() => (Math.random() * 0.12) + 0.24, []);

    useFrame(({ clock }) => {
        if (!groupRef.current || hasLanded.current) return;

        if (startTimeRef.current === null) {
            startTimeRef.current = clock.getElapsedTime();
        }

        const now = clock.getElapsedTime();
        const elapsed = now - startTimeRef.current;
        const speed = 2.5; 
        const t = Math.min(1, elapsed * speed);

        const p0 = dart.startPosition;
        const p1 = dart.controlPoint;
        const p2 = dart.targetPosition;

        const pos = new THREE.Vector3()
            .copy(p0).multiplyScalar((1 - t) * (1 - t))
            .add(p1.clone().multiplyScalar(2 * (1 - t) * t))
            .add(p2.clone().multiplyScalar(t * t));

        groupRef.current.position.copy(pos);

        if (t < 1) {
            const nextT = t + 0.01;
            const nextPos = new THREE.Vector3()
                .copy(p0).multiplyScalar((1 - nextT) * (1 - nextT))
                .add(p1.clone().multiplyScalar(2 * (1 - nextT) * nextT))
                .add(p2.clone().multiplyScalar(nextT * nextT));
            groupRef.current.lookAt(nextPos);
        } else {
            hasLanded.current = true;
            // Embed only the steel point. The imported dart is small enough
            // that the previous offset buried its bronze barrel in the board.
            groupRef.current.translateZ(0.025);
            // Apply slight sag to mimic weight
            groupRef.current.rotation.x += sagAngle;
            onLand(dart);
        }
    });

    return (
        <group ref={groupRef} position={dart.startPosition}>
            <group rotation={[0, 0, randomRoll]}>
                <ImportedDartModel color={dart.color} />
            </group>
        </group>
    );
};

const DartsCameraRig: React.FC<{
    introActive: boolean;
    duration: number;
    lightweight: boolean;
    onIntroComplete: () => void;
}> = ({ introActive, duration, lightweight, onIntroComplete }) => {
    const startTimeRef = useRef<number | null>(null);
    const hasCompletedRef = useRef(false);
    const finalPosition = useMemo(() => new THREE.Vector3(0, BOARD_Y, BOARD_Z + 3), []);
    const finalTarget = useMemo(() => new THREE.Vector3(0, BOARD_Y, BOARD_Z), []);
    const cameraPath = useMemo(() => new THREE.CatmullRomCurve3([
        // Begin inside the room, close to the bar. The previous x=7.5 start
        // sat beyond the side wall, allowing ceiling geometry to show through.
        new THREE.Vector3(4.65, -3.35, -4),
        new THREE.Vector3(4.1, -3.15, -18),
        new THREE.Vector3(2, -2, -33),
        finalPosition.clone(),
    ]), [finalPosition]);
    const targetPath = useMemo(() => new THREE.CatmullRomCurve3([
        new THREE.Vector3(-4, -2.8, -28),
        new THREE.Vector3(-2, -2.2, -40),
        new THREE.Vector3(0, -0.7, -46),
        finalTarget.clone(),
    ]), [finalTarget]);

    useFrame(({ camera, clock }) => {
        if (camera instanceof THREE.PerspectiveCamera) {
            const verticalHalfAngle = THREE.MathUtils.degToRad(camera.fov * 0.5);
            const limitingAxis = Math.min(1, camera.aspect);
            const screenFill = lightweight ? 0.86 : 0.9;
            const fittedDistance = BOARD_RADIUS / (Math.tan(verticalHalfAngle) * limitingAxis * screenFill);
            finalPosition.set(0, BOARD_Y, BOARD_Z + fittedDistance);
            cameraPath.points[cameraPath.points.length - 1].copy(finalPosition);
        }

        if (!introActive) {
            camera.position.copy(finalPosition);
            camera.lookAt(finalTarget);
            return;
        }

        if (startTimeRef.current === null) startTimeRef.current = clock.getElapsedTime();
        const elapsed = clock.getElapsedTime() - startTimeRef.current;
        const progress = THREE.MathUtils.clamp(elapsed / Math.max(duration, 0.01), 0, 1);
        const eased = THREE.MathUtils.smootherstep(progress, 0, 1);

        camera.position.copy(cameraPath.getPoint(eased));
        camera.lookAt(targetPath.getPoint(eased));

        if (progress >= 1 && !hasCompletedRef.current) {
            hasCompletedRef.current = true;
            onIntroComplete();
        }
    });

    return null;
};

const DartboardScene = ({ 
    onHover, 
    onClick, 
    darts, 
    isAiming,
    hoverData,
    onDartLand,
    introActive,
    introDuration,
    lightweight,
    onIntroComplete,
}: { 
    onHover: (data: any, pos: THREE.Vector3) => void, 
    onClick: (data: any) => void,
    darts: DartObject[],
    isAiming: boolean,
    hoverData: any,
    onDartLand: (dart: DartObject) => void,
    introActive: boolean,
    introDuration: number,
    lightweight: boolean,
    onIntroComplete: () => void,
}) => {
    const highlightRef = useRef<THREE.Mesh>(null);
    const lastHoverLabel = useRef<string>("");
    const lastHoverYPositive = useRef<boolean>(true);

    // Determines if bubble should be above or below cursor
    const isTopSector = useMemo(() => {
        if (!hoverData) return true;
        const s = hoverData.sector;
        // Bullseye
        if (s === 50 || s === 25) return true; 
        // Fallback for Miss using cursor Y position
        if (s === 0) return (hoverData.y || 0) >= 0;
        // Explicit "Top" sectors including 11 & 6
        const topSectors = [11, 14, 9, 12, 5, 20, 1, 18, 4, 13, 6];
        return topSectors.includes(s);
    }, [hoverData]);

    const bubbleY = isTopSector ? -0.5 : 0.5;

    const handlePointerMove = (e: any) => {
        if (!isAiming) return;
        const uv = e.uv;
        if (!uv) return;
        
        const data = getHitData(uv);
        const isYPositive = e.point.y >= 0;
        
        // Update if label changes OR if we cross Y equator (important for MISS zones)
        if (data.label !== lastHoverLabel.current || isYPositive !== lastHoverYPositive.current) {
            lastHoverLabel.current = data.label;
            lastHoverYPositive.current = isYPositive;
            onHover(data, e.point);
        }

        if (highlightRef.current) {
            highlightRef.current.position.copy(e.point);
            highlightRef.current.position.z = BOARD_Z + 0.2;
        }
    };

    return (
        <group>
            <DartsCameraRig introActive={introActive} duration={introDuration} lightweight={lightweight} onIntroComplete={onIntroComplete} />
            <LocalReflectionEnvironment />
            <ambientLight intensity={lightweight ? 1.35 : 1.05} />
            <hemisphereLight args={['#f6d6a5', '#20140f', lightweight ? 1.2 : 0.9]} />
            <spotLight position={[7, 12, -36]} angle={0.42} penumbra={0.8} intensity={2.8} castShadow={!lightweight} />
            <pointLight position={[-14, 3, -24]} color="#d98b4d" intensity={1.3} />
            <pointLight position={[15, -4, -40]} color="#f2c879" intensity={0.8} />

            <OldBarRoomModel lightweight={lightweight} />

            <mesh position={[0, BOARD_Y, BOARD_Z - 0.12]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
                <cylinderGeometry args={[BOARD_RADIUS + 0.12, BOARD_RADIUS + 0.12, 0.16, 64]} />
                <meshStandardMaterial color="#29160f" roughness={0.82} metalness={0.04} />
            </mesh>

            <group position={[0, BOARD_Y, BOARD_Z]}>
                <ImportedDartboardModel radius={BOARD_RADIUS} />
            </group>

            <mesh 
                position={[0, BOARD_Y, BOARD_Z + 0.16]}
                onPointerMove={handlePointerMove}
                onClick={(e) => isAiming && e.uv && onClick(getHitData(e.uv))}
            >
                <circleGeometry args={[BOARD_RADIUS, 64]} />
                <meshBasicMaterial side={THREE.DoubleSide} transparent opacity={0} depthWrite={false} />
            </mesh>

            {isAiming && (
                <mesh ref={highlightRef} position={[0, 0, 100]} raycast={() => null}>
                    <ringGeometry args={[0.045, 0.09, 32]} />
                    <meshBasicMaterial color="#fbbf24" toneMapped={false} transparent opacity={0.8} />
                    {hoverData && hoverData.points > 0 && (
                        /* Smart positioning based on sector + Transparency */
                        <Html position={[0, bubbleY, 0]} center pointerEvents="none" zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
                            <div className="bg-slate-900/90 text-white px-4 py-3 rounded-2xl whitespace-nowrap text-center backdrop-blur-md border-2 border-brand-yellow shadow-xl pointer-events-none select-none">
                                <div className="text-3xl font-black font-mono leading-none text-brand-yellow mb-1 drop-shadow-md">{hoverData.points}</div>
                                <div className="text-sm font-bold font-display uppercase tracking-widest text-white/90">{hoverData.label}</div>
                            </div>
                        </Html>
                    )}
                </mesh>
            )}

            {darts.map(dart => (
                <AnimatedDart key={dart.id} dart={dart} onLand={onDartLand} />
            ))}
        </group>
    );
};

const AnimatedScore: React.FC<{ score: number, is301: boolean }> = ({ score, is301 }) => {
    const [displayScore, setDisplayScore] = useState(score);
    const [diff, setDiff] = useState(0);

    useEffect(() => {
        if (score === displayScore) return;
        const difference = score - displayScore;
        setDiff(difference);
        
        const step = difference > 0 ? Math.ceil(difference / 10) : Math.floor(difference / 10);
        
        const timer = setInterval(() => {
            setDisplayScore(prev => {
                const next = prev + step;
                if ((difference > 0 && next >= score) || (difference < 0 && next <= score)) {
                    clearInterval(timer);
                    setTimeout(() => setDiff(0), 1500);
                    return score;
                }
                return next;
            });
        }, 30);
        return () => clearInterval(timer);
    }, [score]);

    return (
        <div className="relative">
            <div className="text-xl sm:text-5xl font-black leading-none tracking-tight transition-all text-slate-100" style={{ fontFamily: CHALK_FONT, textShadow: '0 1px 6px rgba(255,255,255,0.35)' }}>
                {displayScore}
            </div>
            {diff !== 0 && (
                <div className={`absolute -top-5 sm:-top-8 left-1/2 -translate-x-1/2 font-bold text-xs sm:text-xl animate-bounce
                    ${(is301 && diff < 0) || (!is301 && diff > 0) ? 'text-green-500' : 'text-red-500'}`}>
                    {diff > 0 ? '+' : ''}{diff}
                </div>
            )}
        </div>
    );
};

export const DartsGame: React.FC<DartsGameProps> = ({ game, options, onBack, onFinish, onReplay }) => {
    const is301 = options.dartsMode === '301';
    
    const [scores, setScores] = useState<number[]>(is301 ? Array(options.players).fill(301) : Array(options.players).fill(0));
    const [currentTeam, setCurrentTeam] = useState(0);
    const [teamNames, setTeamNames] = useState<string[]>(options.teamNames || Array.from({length: options.players}, (_, i) => `Team ${i+1}`));
    const [phase, setPhase] = useState<GamePhase>('aim');
    const [darts, setDarts] = useState<DartObject[]>([]);
    const [hoverData, setHoverData] = useState<any>(null);
    const [lockedTarget, setLockedTarget] = useState<any>(null);
    const [currentQuestion, setCurrentQuestion] = useState<GeneratedQuestion | null>(null);
    const [isFlipped, setIsFlipped] = useState(false);
    const [mcResult, setMcResult] = useState<'correct' | 'incorrect' | null>(null);
    const [selectedMcAnswer, setSelectedMcAnswer] = useState('');
    const [missedItems, setMissedItems] = useState<PracticeReviewItem[]>([]);
    const [correctCount, setCorrectCount] = useState(0);
    const [turnResult, setTurnResult] = useState<{ score: number, text: string } | null>(null);
    const [isMuted, setIsMuted] = useState(options.muted);
    const [isImageZoomOpen, setIsImageZoomOpen] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isTimesUp, setIsTimesUp] = useState(false);
    const [editingTeamIndex, setEditingTeamIndex] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editScore, setEditScore] = useState(0);
    const [showQuitConfirm, setShowQuitConfirm] = useState(false);
    const [showEndGameConfirm, setShowEndGameConfirm] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const boardAreaRef = useRef<HTMLDivElement>(null);
    const [usedQuestionIds, setUsedQuestionIds] = useState<number[]>([]);
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
    const [introActive, setIntroActive] = useState(true);
    const [showAimOverlay, setShowAimOverlay] = useState(true);
    const [boardSize, setBoardSize] = useState<number | null>(null);
    const [boardOffsetY, setBoardOffsetY] = useState(0);
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
    
    // NEW: Track total turns played to prevent infinite loop in High Score mode
    const [turnsPlayed, setTurnsPlayed] = useState(0);

    const questions = useMemo<GeneratedQuestion[]>(() => {
        return game.questions && game.questions.length > 0 
            ? game.questions 
            : [{ 
                question: "Sample Question", 
                answer: "Sample Answer", 
                points: 100, 
                isBonus: false, 
                id: 0, 
                difficulty: 'easy' 
            } as GeneratedQuestion];
    }, [game.questions]);

    const chalkboardStyle = {
        backgroundColor: '#0f1b14',
        backgroundImage: "url('/assets/background/chalkboard.jpg')",
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
    };

    // Target Limit Logic:
    // If High Score Mode + Turns Limit Set: limit = players * turns
    // Else use the config limit or length of array
    const turnsPerPlayer = options.dartsLegs || 0;
    const totalTurnsHighscore = (!is301 && turnsPerPlayer > 0) ? turnsPerPlayer * options.players : 0;
    
    const targetQuestionCount = options.studentPractice
        ? questions.length
        : totalTurnsHighscore > 0
        ? totalTurnsHighscore 
        : (game.config.questionCount || (questions.length - 10 > 0 ? questions.length - 10 : questions.length));

    // SCROLL LOCK EFFECT
    useEffect(() => {
        const shouldLock = phase === 'question' || editingTeamIndex !== null;
        document.body.style.overflow = shouldLock ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [phase, editingTeamIndex]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const handleBoardHover = (data: any, pos: THREE.Vector3) => {
        if (phase === 'aim') setHoverData({ ...data, y: pos.y }); // Capture Y for smart tooltip positioning
    };

    const handleBoardClick = (data: any) => {
        if (phase !== 'aim' || data.points === 0) return;
        
        playSound('select', isMuted, options.soundConfig?.select);
        setLockedTarget(data);
        
        // Count the turn regardless of question reuse
        setTurnsPlayed(prev => prev + 1);
        
        let difficulty = 'easy';
        if (data.points === 50 || data.multiplier === 3) difficulty = 'hard';
        else if (data.points === 25 || data.multiplier === 2) difficulty = 'medium';
        
        // Filter out used questions
        const available = questions.filter(q => !usedQuestionIds.includes(q.id));
        
        let selectedQ: GeneratedQuestion;

        if (!options.randomizeQuestions) {
            if (available.length === 0) {
                selectedQ = questions[0];
                setUsedQuestionIds([selectedQ.id]);
            } else {
                selectedQ = available[0];
                setUsedQuestionIds(prev => [...prev, selectedQ.id]);
            }
        } else if (available.length === 0) {
            // RECYCLE LOGIC: If we absolutely ran out (reserve depleted), reuse a random question to finish the round.
            // This prevents a crash if the game goes extremely long.
            selectedQ = questions[Math.floor(Math.random() * questions.length)];
        } else {
            // Difficulty filtering
            let pool = available.filter(q => (q.difficulty || 'easy').toLowerCase() === difficulty);
            
            if (pool.length === 0) {
                // Fallback logic
                if (difficulty === 'hard') {
                    pool = available.filter(q => (q.difficulty || 'easy').toLowerCase() === 'medium');
                    if (pool.length === 0) pool = available.filter(q => (q.difficulty || 'easy').toLowerCase() === 'easy');
                }
                else if (difficulty === 'medium') {
                    pool = available.filter(q => (q.difficulty || 'easy').toLowerCase() === 'easy');
                }
                if (pool.length === 0) {
                    pool = available; // Take anything left
                }
            }
            // Pick random from pool
            selectedQ = pool[Math.floor(Math.random() * pool.length)];
            setUsedQuestionIds(prev => [...prev, selectedQ.id]);
        }
        
        setCurrentQuestion(selectedQ);
        setPhase('question');
        setIsFlipped(false);
        setMcResult(null);
        setSelectedMcAnswer('');
        setTimeLeft(options.timerSeconds);
        setIsTimesUp(false);
    };

    const spawnDart = (hit: boolean) => {
        const sectorIndex = SECTORS.indexOf(lockedTarget.sector);
        const baseAngle = (Math.PI / 2) - (Math.max(sectorIndex, 0) * SLICE_ANGLE);
        const BOARD_VISUAL_R = BOARD_RADIUS;

        if (hit) {
            let radialMin = R_TRIPLE_OUTER + 0.06;
            let radialMax = R_DOUBLE_INNER - 0.06;

            if (lockedTarget.multiplier === 3) {
                radialMin = R_TRIPLE_INNER + 0.012;
                radialMax = R_TRIPLE_OUTER - 0.012;
            } else if (lockedTarget.multiplier === 2) {
                radialMin = R_DOUBLE_INNER + 0.01;
                radialMax = R_DOUBLE_OUTER - 0.01;
            } else if (lockedTarget.points === 50) {
                radialMin = 0;
                radialMax = R_BULL_INNER * 0.65;
            } else if (lockedTarget.points === 25) {
                radialMin = R_BULL_INNER + 0.008;
                radialMax = R_BULL_OUTER - 0.008;
            }

            const normalizedR = THREE.MathUtils.lerp(radialMin, radialMax, 0.3 + Math.random() * 0.4);
            const randAngle = baseAngle + (Math.random() - 0.5) * 0.04;
            const randR = normalizedR * BOARD_VISUAL_R;
            
            const finalX = Math.cos(randAngle) * randR;
            const finalY = Math.sin(randAngle) * randR;
            const actualResult = getBoardPointData(finalX, finalY);

            launchDart(new THREE.Vector3(finalX, finalY, 0), actualResult.points, actualResult.label, actualResult.multiplier);

        } else {
            const missAngleOffset = (Math.random() - 0.5) * Math.PI; 
            const missRadius = (Math.random() * BOARD_VISUAL_R * 0.8) + (Math.random() > 0.8 ? BOARD_VISUAL_R * 0.4 : 0);
            
            const finalX = Math.cos(baseAngle + missAngleOffset) * missRadius;
            const finalY = Math.sin(baseAngle + missAngleOffset) * missRadius;
            const actualResult = getBoardPointData(finalX, finalY);
            const resultLabel = actualResult.points > 0 ? `LUCKY ${actualResult.label}` : 'MISS';

            launchDart(new THREE.Vector3(finalX, finalY, 0), actualResult.points, resultLabel, actualResult.multiplier);
        }
    };

    const launchDart = (targetPos: THREE.Vector3, score: number, label: string, multiplier: number) => {
        targetPos.y += BOARD_Y;
        targetPos.z = BOARD_Z + 0.18;

        const startPos = new THREE.Vector3(0, BOARD_Y - 0.7, BOARD_Z + 2.6);
        const controlPos = new THREE.Vector3(
            targetPos.x * 0.5, 
            BOARD_Y + ((targetPos.y - BOARD_Y) * 0.5) + 1.1,
            BOARD_Z + 1.5
        );

        const newDart: DartObject = {
            id: Date.now().toString(),
            startPosition: startPos,
            targetPosition: targetPos,
            controlPoint: controlPos,
            landed: false,
            color: ['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7', '#f97316'][currentTeam % 6],
            scoreResult: score,
            textResult: label,
            multiplier: multiplier,
            points: score
        };

        setDarts(prev => [...prev, newDart]);
    };

    const handleDartLand = (dart: DartObject) => {
        playSound('dart-hit', isMuted);
        
        let isBust = false;
        let scoreChange = dart.scoreResult;
        let resultText = dart.textResult;

        if (is301) {
            const currentScore = scores[currentTeam];
            const remaining = currentScore - dart.scoreResult;

            if (remaining < 0 || remaining === 1) {
                isBust = true;
                resultText = "BUST!";
                scoreChange = 0;
            } else if (remaining === 0) {
                if (dart.multiplier === 2 || dart.points === 50) {
                    // Win
                } else {
                    isBust = true;
                    resultText = "BUST! (No Double)";
                    scoreChange = 0;
                }
            }
        }

        setTurnResult({ score: isBust ? 0 : dart.scoreResult, text: resultText });
        setPhase('result');

        setTimeout(() => {
            if (!isBust && dart.scoreResult > 0) playSound('correct', isMuted, options.soundConfig?.correct);
            else playSound('incorrect', isMuted, options.soundConfig?.incorrect);

            setScores(prev => {
                const newScores = [...prev];
                if (is301) {
                    if (!isBust) {
                        newScores[currentTeam] -= dart.scoreResult;
                    }
                } else {
                    newScores[currentTeam] += dart.scoreResult;
                }
                return newScores;
            });

            if (is301 && !isBust && scores[currentTeam] - dart.scoreResult === 0) {
                setPhase('gameover');
            } else {
                setTimeout(() => {
                    const isRoundComplete = currentTeam === options.players - 1;
                    // FIX: Use turnsPlayed counter instead of usedQuestionIds.length
                    const questionsLimitReached = turnsPlayed >= targetQuestionCount;

                    // End Game Check
                    if (!is301 && questionsLimitReached && isRoundComplete) {
                         setPhase('gameover');
                    } else {
                        // Continue Game
                        setCurrentTeam(prev => (prev + 1) % options.players);
                        setPhase('aim');
                        setLockedTarget(null);
                        setHoverData(null);
                        setTurnResult(null);
                        setDarts([]); 
                    }
                }, 2500);
            }
        }, 500);
    };

    const handleThrow = (hit: boolean) => {
        if (currentQuestion) {
            if (hit) {
                setCorrectCount((prev) => prev + 1);
            } else {
                setMissedItems((prev) => [
                    ...prev,
                    {
                        id: String(currentQuestion.id),
                        question: currentQuestion.question,
                        correctAnswer: currentQuestion.answer,
                        studentAnswer: selectedMcAnswer || undefined,
                        context: lockedTarget ? `${lockedTarget.sector} x${lockedTarget.multiplier}` : undefined,
                    },
                ]);
            }
        }
        setPhase('throwing'); 
        spawnDart(hit);
    };

    useEffect(() => {
        if (phase === 'question' && options.timerSeconds > 0 && !isFlipped && !isTimesUp) {
            const timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        setIsTimesUp(true);
                        playSound('times-up', isMuted);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [phase, options.timerSeconds, isFlipped, isMuted, isTimesUp]);

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

    const stripOptionPrefix = (value: string) => value.replace(/^[A-D]\)\s*/i, '').trim();

    const hasOptions = currentQuestion?.options && currentQuestion.options.length > 0;
    const optionKey = currentQuestion?.options?.join('|') || '';
    const questionImageUrl = resolveGameQuestionImageUrl(currentQuestion?.image);
    const questionImageAlt = currentQuestion?.image?.alt || '';

    useEffect(() => {
        const media = window.matchMedia('(max-width: 639px)');
        const handleChange = () => setIsMobileViewport(media.matches);
        handleChange();
        media.addEventListener('change', handleChange);
        return () => media.removeEventListener('change', handleChange);
    }, []);

    useEffect(() => {
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        const handleChange = () => setPrefersReducedMotion(media.matches);
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

    useEffect(() => {
        if (phase === 'aim') {
            setShowAimOverlay(true);
        }
    }, [phase, currentTeam]);

    useLayoutEffect(() => {
        if (phase !== 'question' || !currentQuestion || isFlipped) {
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
    }, [isMobileViewport, hasOptions, phase, isFlipped, currentQuestion?.question, currentQuestion?.options?.length, resizeTick]);

    useLayoutEffect(() => {
        if (!isMobileViewport || phase !== 'question' || !isFlipped) {
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
        if (!hasOptions || !currentQuestion?.options || phase !== 'question' || isFlipped) {
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

    useLayoutEffect(() => {
        if (!isMobileViewport) {
            setBoardSize(null);
            return;
        }
        const el = boardAreaRef.current;
        if (!el) return;
        const updateSize = () => {
            const rect = el.getBoundingClientRect();
            const padding = 0;
            const size = Math.max(0, Math.min(rect.width, rect.height) - padding);
            setBoardSize(prev => (prev && Math.abs(prev - size) < 1 ? prev : size));
            setBoardOffsetY(0);
        };
        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(el);
        return () => observer.disconnect();
    }, [isMobileViewport, resizeTick]);

    if (phase === 'gameover') {
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

        const ranking = scores
            .map((score, index) => ({
                index,
                score: is301 ? Math.max(0, 301 - score) : score,
                name: teamNames[index] || `Team ${index + 1}`,
                remaining: is301 ? score : null,
            }))
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
                    subtitle={is301 ? 'Final checkout standings' : 'Final score standings'}
                    ranking={ranking}
                    isMobileViewport={isMobileViewport}
                    musicEnabled={!isMuted}
                    onPlayAgain={onReplay}
                    onExit={onFinish}
                >
                    <WinnerCeremonyStandingsTable
                        ranking={ranking}
                        formatScore={(score, entry) => is301 ? `Remaining ${Math.max(0, entry.remaining ?? 0)}` : `${new Intl.NumberFormat('en-US').format(score)} pts`}
                    />
                </WinnerCeremonyHero>
            </div>
        );
    }

    const mobileUsesTwoRowHeader = isMobileViewport && scores.length >= 4;
    const lightweightScene = isMobileViewport;
    const introDuration = prefersReducedMotion ? 0.01 : (isMobileViewport ? 3.25 : 6);
    const mobileHeaderColumns = scores.length >= 5 ? 3 : scores.length === 4 ? 2 : Math.max(scores.length, 1);
    const questionOverlayTopClass = isFullscreen
        ? `${mobileUsesTwoRowHeader ? 'top-[calc(7rem+env(safe-area-inset-top))]' : 'top-[calc(4.5rem+env(safe-area-inset-top))]'} sm:top-[calc(8.75rem+env(safe-area-inset-top))]`
        : `${mobileUsesTwoRowHeader ? 'top-[calc(11rem+env(safe-area-inset-top))]' : 'top-[calc(8.5rem+env(safe-area-inset-top))]'} sm:top-[calc(12.75rem+env(safe-area-inset-top))]`;

    return (
        <div ref={containerRef} className={`bg-sky-50 flex flex-col ${isFullscreen ? 'h-[calc(var(--app-vh,1vh)*100)]' : 'h-[calc(var(--app-vh,1vh)*100-4rem)]'} overflow-hidden relative`}>
            
            <div className={`${mobileUsesTwoRowHeader ? 'px-2 py-1.5 h-[110px]' : 'p-2 min-h-[70px]'} sm:p-4 shrink-0 z-[50] shadow-sm border-b border-slate-900 relative sm:min-h-[140px]`} style={chalkboardStyle}>
                <div className={`flex w-full ${mobileUsesTwoRowHeader ? 'gap-2 items-start' : 'gap-3 sm:gap-4 items-center'}`}>
                    <div className={`flex min-w-fit shrink-0 ${mobileUsesTwoRowHeader ? 'gap-1' : 'gap-1.5'} sm:flex-col sm:items-start sm:gap-2 sm:min-w-[64px] ${mobileUsesTwoRowHeader ? 'flex-col items-start' : 'flex-row items-center'}`}>
                        <button onClick={() => setShowQuitConfirm(true)} className="hidden sm:flex w-[140px] justify-center text-slate-100 hover:text-red-200 items-center text-sm bg-black/40 hover:bg-red-900/40 px-4 py-2 rounded-lg transition-colors font-bold border border-slate-700">
                            <ArrowLeft size={16} className="mr-2" /> Quit
                        </button>
                        <button
                            onClick={() => setShowEndGameConfirm(true)}
                            className="hidden sm:flex w-[140px] justify-center text-white items-center text-sm bg-rose-700/90 hover:bg-rose-600 px-4 py-2 rounded-lg transition-colors font-bold border border-rose-800"
                            title="End game now"
                        >
                            <Flag size={16} className="mr-2" /> End Game
                        </button>
                        <button
                            onClick={() => setShowQuitConfirm(true)}
                            className={`sm:hidden ${mobileUsesTwoRowHeader ? 'w-[30px] h-[30px] rounded-md' : 'w-9 h-9 rounded-lg'} flex items-center justify-center border border-slate-700 bg-black/40 text-slate-100 hover:text-red-200 hover:bg-red-900/40 transition-colors`}
                            title="Quit"
                        >
                            <XIcon size={mobileUsesTwoRowHeader ? 14 : 17} />
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
                            className={`sm:hidden ${mobileUsesTwoRowHeader ? 'w-[30px] h-[30px] rounded-md' : 'w-9 h-9 rounded-lg'} flex items-center justify-center border border-slate-700 bg-black/40 text-slate-100 hover:text-sky-200 hover:bg-black/60 transition-colors`}
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted ? <VolumeX size={mobileUsesTwoRowHeader ? 14 : 17} /> : <Volume2 size={mobileUsesTwoRowHeader ? 14 : 17} />}
                        </button>
                        <div className="hidden sm:flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-1 rounded">
                                {is301 ? '301 Mode' : 'High Score'}
                            </span>
                            {!is301 && (
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-600 px-2 py-1 rounded flex items-center">
                                    <FileQuestion size={10} className="mr-1" />
                                    Q: {turnsPlayed}/{targetQuestionCount}
                                </span>
                            )}
                            {currentQuestion && (
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded flex items-center
                                    ${currentQuestion.difficulty === 'hard' ? 'bg-red-100 text-red-600' : 
                                      currentQuestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' : 
                                      'bg-green-100 text-green-600'}`}>
                                    {currentQuestion.difficulty || 'Easy'}
                                </span>
                            )}
                        </div>
                    </div>
                    <div
                        className={isMobileViewport
                            ? `flex-1 grid ${mobileUsesTwoRowHeader ? 'gap-1 content-start' : 'gap-1.5'} items-stretch`
                            : 'flex-1 flex justify-end sm:justify-center gap-3 sm:gap-6 flex-wrap sm:flex-nowrap overflow-x-auto no-scrollbar px-1 sm:px-4 h-full items-center'}
                        style={isMobileViewport ? { gridTemplateColumns: `repeat(${mobileHeaderColumns}, minmax(0, 1fr))` } : undefined}
                    >
                        {scores.map((score, idx) => (
                            <button
                                key={idx}
                                onClick={() => openEditTeam(idx)}
                                className={`${isMobileViewport ? `${mobileUsesTwoRowHeader ? 'h-[46px]' : 'h-12'} w-full min-w-0 px-2 py-1` : 'px-1 sm:px-2 py-1 sm:py-2 min-w-[70px] sm:min-w-[120px]'} text-center transition-transform relative group flex flex-col justify-center items-center`}
                            >
                                <div className="text-[10px] sm:text-lg uppercase font-bold tracking-wider truncate max-w-full sm:max-w-[130px] mb-0.5 sm:mb-1 flex items-center gap-1 text-slate-100" style={{ fontFamily: CHALK_FONT, textShadow: '0 1px 8px rgba(255,255,255,0.55)' }}>
                                    {teamNames[idx]}
                                    {currentTeam === idx && <div className="w-2 h-2 rounded-full bg-brand-yellow animate-pulse ml-1" />}
                                </div>
                                <AnimatedScore score={score} is301={is301} />
                                <div className="absolute -top-1 -right-1 text-slate-100/70 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={12} /></div>
                            </button>
                        ))}
                    </div>
                    <div className="hidden sm:flex flex-col items-end justify-center min-w-[72px] gap-2">
                        <button onClick={() => setIsMuted(!isMuted)} className="text-slate-100 hover:text-sky-200 p-3 bg-black/40 hover:bg-black/60 rounded-xl transition-colors border border-slate-700">{isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}</button>
                        <button onClick={toggleFullscreen} className="text-slate-100 hover:text-sky-200 p-3 bg-black/40 hover:bg-black/60 rounded-xl transition-colors border border-slate-700">{isFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}</button>
                    </div>
                </div>
            </div>

            <div
                ref={boardAreaRef}
                className={`flex-grow relative overflow-hidden min-h-0 bg-[#160d09] ${introActive ? 'cursor-default' : 'cursor-crosshair'}`}
            >
                <div className="absolute inset-0 flex items-center justify-center">
                    {isMobileViewport ? (
                        <div
                            style={boardSize ? {
                                width: `${boardSize}px`,
                                height: `${boardSize}px`,
                                transform: `translateY(-${boardOffsetY}px)`
                            } : undefined}
                        >
                                <Canvas camera={{ position: [4.65, -3.35, -4], fov: 54 }} dpr={[1, 1.35]} shadows={!lightweightScene} style={{ width: '100%', height: '100%' }}>
                                    <color attach="background" args={['#160d09']} />
                                    <Suspense fallback={null}>
                                        <DartboardScene 
                                            onHover={handleBoardHover} 
                                            onClick={handleBoardClick}
                                            darts={darts}
                                            isAiming={phase === 'aim' && !introActive}
                                            hoverData={hoverData}
                                            onDartLand={handleDartLand}
                                            introActive={introActive}
                                            introDuration={introDuration}
                                            lightweight={lightweightScene}
                                            onIntroComplete={() => setIntroActive(false)}
                                        />
                                    </Suspense>
                                </Canvas>
                        </div>
                    ) : (
                        <div className="w-full h-full">
                            <Canvas camera={{ position: [4.65, -3.35, -4], fov: 45 }} dpr={[1, 1.75]} shadows style={{ width: '100%', height: '100%' }}>
                                <color attach="background" args={['#160d09']} />
                                <Suspense fallback={null}>
                                    <DartboardScene 
                                        onHover={handleBoardHover} 
                                        onClick={handleBoardClick}
                                        darts={darts}
                                        isAiming={phase === 'aim' && !introActive}
                                        hoverData={hoverData}
                                        onDartLand={handleDartLand}
                                        introActive={introActive}
                                        introDuration={introDuration}
                                        lightweight={lightweightScene}
                                        onIntroComplete={() => setIntroActive(false)}
                                    />
                                </Suspense>
                            </Canvas>
                        </div>
                    )}
                </div>

                {introActive && (
                    <div className="absolute inset-0 z-20 pointer-events-none flex items-end justify-center p-5 sm:p-7 bg-gradient-to-t from-black/55 via-transparent to-black/15">
                        <div className="w-full max-w-xl flex items-center justify-between gap-4 rounded-2xl border border-amber-200/25 bg-black/55 px-4 py-3 text-white shadow-2xl backdrop-blur-md pointer-events-auto">
                            <div>
                                <div className="font-display text-lg sm:text-2xl font-black tracking-wide text-amber-100">Welcome to the old bar</div>
                                <div className="text-xs sm:text-sm text-amber-50/70">Taking you to the dartboard…</div>
                            </div>
                            <button
                                onClick={() => setIntroActive(false)}
                                className="shrink-0 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20 transition-colors"
                            >
                                Skip
                            </button>
                        </div>
                    </div>
                )}

                {phase === 'aim' && !hoverData && !introActive && (
                    isMobileViewport ? (
                        showAimOverlay && (
                            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 w-[92%] max-w-[520px] pointer-events-none animate-fade-in">
                                <div className="pointer-events-auto bg-black/60 text-white px-4 py-3 rounded-2xl shadow-lg backdrop-blur-md border border-white/20 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="font-display font-black text-[clamp(16px,4.2vw,22px)] leading-tight whitespace-normal break-words" style={{ fontFamily: CHALK_FONT }}>
                                            {teamNames[currentTeam]}'s Turn
                                        </div>
                                        <div className="text-[clamp(12px,3.2vw,16px)] text-white/80 leading-tight whitespace-normal break-words" style={{ fontFamily: CHALK_FONT }}>
                                            {is301 ? `You require ${Math.max(scores[currentTeam], 0)}` : 'Click board to aim'}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowAimOverlay(false)}
                                        className="w-8 h-8 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25 transition-colors flex-shrink-0"
                                        title="Dismiss"
                                    >
                                        <XIcon size={16} />
                                    </button>
                                </div>
                            </div>
                        )
                    ) : (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 bg-black/40 backdrop-blur-[2px] animate-fade-in">
                            <div className="bg-white/10 backdrop-blur-md p-6 sm:p-10 rounded-3xl border-4 border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center animate-bounce-slow">
                                <Target size={56} className="text-brand-yellow mb-4 drop-shadow-lg sm:w-20 sm:h-20" />
                                <div className="text-white text-3xl sm:text-6xl font-display font-black mb-2 drop-shadow-xl uppercase tracking-wider text-center" style={{ textShadow: '0 4px 0 #000' }}>
                                    {teamNames[currentTeam]}
                                </div>
                                <div className="text-sky-300 font-mono font-bold text-sm sm:text-2xl tracking-[0.3em] uppercase bg-black/50 px-4 sm:px-6 py-2 rounded-full border border-sky-500/50 shadow-inner">
                                    Your Turn
                                </div>
                                <div className="mt-4 sm:mt-6 text-white/80 font-bold text-sm sm:text-lg animate-pulse">
                                    CLICK BOARD TO AIM
                                </div>
                            </div>
                        </div>
                    )
                )}

                {phase === 'result' && turnResult && (
                    <div className={`absolute z-40 pointer-events-none animate-[slide-up_0.3s_ease-out] ${isMobileViewport ? 'bottom-6 left-1/2 -translate-x-1/2' : 'top-1/4 right-10'}`}>
                        <div className={`bg-black/80 backdrop-blur-md ${isMobileViewport ? 'p-5 max-w-[90vw]' : 'p-6'} rounded-2xl text-center shadow-2xl border-2 border-white/20 transform rotate-2`}>
                            <div className={`${isMobileViewport ? 'text-[clamp(22px,7vw,40px)] leading-tight' : 'text-6xl'} font-black italic whitespace-normal break-words ${turnResult.score > 0 ? 'text-brand-yellow' : 'text-red-500'}`}>
                                {turnResult.text}
                            </div>
                            <div className={`${isMobileViewport ? 'text-[clamp(14px,4vw,22px)]' : 'text-3xl'} text-white font-bold mt-2`}>
                                {is301 
                                    ? (turnResult.score === 0 ? 'Invalid / Bust' : `-${turnResult.score}`)
                                    : (turnResult.score > 0 ? `+${turnResult.score}` : '0')
                                } Points
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {phase === 'question' && currentQuestion && (
                <div className={`fixed inset-x-0 bottom-0 ${questionOverlayTopClass} z-[500] flex items-center justify-center bg-[#120a07]/75 backdrop-blur-md p-3 sm:p-4 animate-fade-in overflow-hidden`}>
                    <div className="w-full max-w-[420px] h-full max-h-full sm:max-w-[560px] sm:h-full sm:max-h-[90vh] md:max-w-6xl md:h-auto md:max-h-full md:aspect-[16/9] [perspective:1000px]">
                        <div className={`relative w-full h-full transition-all duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                            
                            <div className={`absolute inset-0 [backface-visibility:hidden] [transform:translateZ(0)] rounded-2xl shadow-[0_24px_70px_rgba(0,0,0,0.75)] overflow-hidden flex flex-col h-full bg-[#101a14] border border-amber-200/30 ring-1 ring-black/60 ${isFlipped ? 'pointer-events-none' : ''}`}>
                                <div className="bg-gradient-to-r from-[#32170f] via-[#6b351f] to-[#32170f] text-amber-50 p-3 md:p-4 flex justify-between items-center h-[clamp(72px,12vh,96px)] sm:h-20 md:h-24 flex-shrink-0 relative z-10 border-b-2 border-amber-500/45 shadow-[inset_0_-8px_18px_rgba(0,0,0,0.3)]">
                                    <div className="font-bold text-sm sm:text-xl text-amber-100/90 truncate max-w-[40%]">{teamNames[currentTeam]}'s Turn</div>
                                    <div className="bg-black/35 border border-amber-300/45 px-3 py-1 rounded-full font-black text-sm sm:text-xl text-amber-200 shadow-inner">Target: {lockedTarget?.label}</div>
                                    <div className="font-bold text-sm sm:text-xl text-amber-100/80 text-right">{lockedTarget?.points} Points</div>
                                </div>

                                <div className={`bg-[#0f1b14] flex-grow w-full flex flex-col px-0 ${hasOptions ? 'pt-3 sm:pt-4 md:pt-6 pb-0' : 'py-3 sm:py-4 md:py-6'} relative overflow-hidden z-0`} style={chalkboardStyle}>
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
                                                        className={`h-full w-full rounded-xl object-contain border border-amber-200/30 bg-black/35 shadow-[0_10px_24px_rgba(0,0,0,0.35)] ${isMobileViewport ? '' : 'cursor-zoom-in'}`}
                                                    />
                                                </div>
                                                <div
                                                    ref={questionWrapRef}
                                                    className={`flex-1 min-h-0 flex items-center justify-center ${isMobileViewport ? 'text-center' : 'text-left'}`}
                                                >
                                                    <div
                                                        ref={questionTextRef}
                                                        style={questionFontSize ? { fontSize: `${questionFontSize}px`, lineHeight: '1.15' } : undefined}
                                                        className={`font-display font-bold text-amber-50 leading-tight w-full whitespace-pre-wrap break-normal hyphens-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] ${isMobileViewport ? 'text-center' : 'text-left'} ${getQuestionFontSizeClass(currentQuestion.question)}`}
                                                    >
                                                        {currentQuestion.question}
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
                                                            const longestText = currentQuestion.options!.reduce(
                                                                (a, b) => (stripOptionPrefix(a).length > stripOptionPrefix(b).length ? a : b),
                                                                ''
                                                            );
                                                            const uniformSize = optionFontSize ? '' : getOptionFontSizeClass(stripOptionPrefix(longestText));
                                                            return currentQuestion.options!.map((opt, i) => {
                                                                const optionLabel = String.fromCharCode(65 + i);
                                                                const displayOpt = stripOptionPrefix(opt);
                                                                return (
                                                                    <button 
                                                                        key={i}
                                                                        onClick={() => {
                                                                            const clean = (s: string) => s.replace(/^[A-Z]\)\s*/i, '').trim().toLowerCase();
                                                                            const isCorrect = clean(opt) === clean(currentQuestion.answer);
                                                                            setSelectedMcAnswer(opt);
                                                                            setMcResult(isCorrect ? 'correct' : 'incorrect');
                                                                            setIsFlipped(true);
                                                                        }}
                                                                        style={optionFontSize ? { fontSize: `${optionFontSize}px`, lineHeight: '1.2' } : undefined}
                                                                        className={`relative p-4 sm:p-6 bg-[#19251d]/95 border border-amber-200/20 rounded-none font-bold text-amber-50 sm:hover:bg-[#6b351f] sm:hover:border-amber-300/70 sm:hover:text-amber-50 transition-all text-center flex items-center justify-center w-full h-full ${uniformSize} cursor-pointer z-50 whitespace-normal break-normal hyphens-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 shadow-[inset_0_0_24px_rgba(0,0,0,0.18)]`}
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
                                                className={`h-40 sm:h-48 md:h-56 w-full rounded-xl object-contain border border-amber-200/30 bg-black/35 shadow-[0_10px_24px_rgba(0,0,0,0.35)] ${isMobileViewport ? '' : 'cursor-zoom-in'}`}
                                            />
                                            <div ref={questionWrapRef} className="w-full flex-1 min-h-0 flex items-center justify-center">
                                                <div
                                                    ref={questionTextRef}
                                                    style={questionFontSize ? { fontSize: `${questionFontSize}px`, lineHeight: '1.15' } : undefined}
                                                    className={`font-display font-bold text-amber-50 leading-tight text-center w-full whitespace-pre-wrap break-normal hyphens-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] ${getQuestionFontSizeClass(currentQuestion.question)}`}
                                                >
                                                    {currentQuestion.question}
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
                                                    className={`font-display font-bold text-amber-50 leading-tight text-center w-full whitespace-pre-wrap break-normal hyphens-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] ${getQuestionFontSizeClass(currentQuestion.question)}`}
                                                >
                                                    {currentQuestion.question}
                                                </div>
                                            </div>
                                            {hasOptions && !isFlipped && (
                                                <div className="w-full flex-1 min-h-0 mt-2 sm:mt-4 relative z-10 overflow-hidden">
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
                                                                return (
                                                                    <button 
                                                                        key={i}
                                                                        onClick={() => {
                                                                            const clean = (s: string) => s.replace(/^[A-Z]\)\s*/i, '').trim().toLowerCase();
                                                                            const isCorrect = clean(opt) === clean(currentQuestion.answer);
                                                                            setSelectedMcAnswer(opt);
                                                                            setMcResult(isCorrect ? 'correct' : 'incorrect');
                                                                            setIsFlipped(true);
                                                                        }}
                                                                        style={optionFontSize ? { fontSize: `${optionFontSize}px`, lineHeight: '1.2' } : undefined}
                                                                        className={`relative p-4 sm:p-6 bg-[#19251d]/95 border border-amber-200/20 rounded-none font-bold text-amber-50 sm:hover:bg-[#6b351f] sm:hover:border-amber-300/70 sm:hover:text-amber-50 transition-all text-center flex items-center justify-center w-full h-full ${uniformSize} cursor-pointer z-50 whitespace-normal break-normal hyphens-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 shadow-[inset_0_0_24px_rgba(0,0,0,0.18)]`}
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

                                <div className={`flex flex-col relative flex-shrink-0 z-50 bg-[#26150f] border-t border-amber-500/35 ${hasOptions ? 'h-[clamp(38px,6.5vh,46px)] sm:h-[clamp(32px,5.5vh,40px)] px-0 py-0' : 'h-[clamp(76px,12vh,104px)] sm:h-[clamp(88px,14vh,120px)] px-3 sm:px-4 md:px-8 py-1 sm:py-2 md:py-0'}`}>
                                    {options.timerSeconds > 0 && (
                                        <div className={`relative ${hasOptions ? 'h-full' : 'h-[clamp(38px,6.5vh,46px)] sm:h-[clamp(32px,5.5vh,40px)] -mx-3 sm:-mx-4 md:-mx-8'} bg-black/35 overflow-hidden flex items-center justify-start pointer-events-none`}>
                                            {!isTimesUp && (
                                                <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-400 transition-all duration-1000" style={{ width: `${(timeLeft / options.timerSeconds) * 100}%` }} />
                                            )}
                                            <div className="absolute inset-0 flex items-center justify-center text-sm sm:text-lg md:text-xl font-black text-amber-50 tracking-wider drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)]">
                                                {isTimesUp ? "TIME'S UP!" : (
                                                    <><Clock size={18} className="mr-2" /> {timeLeft}s</>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {!hasOptions && (
                                        <div className="w-full flex-1 flex items-center justify-center py-2 sm:py-3">
                                            <button
                                                onClick={() => setIsFlipped(true)}
                                                className="bg-gradient-to-b from-amber-300 to-amber-500 text-[#24120b] border border-amber-100/70 px-6 sm:px-12 py-2 rounded-full font-black text-base sm:text-xl shadow-[0_8px_20px_rgba(0,0,0,0.4)] hover:from-amber-200 hover:to-amber-400 hover:scale-105 transition-transform relative z-50 flex items-center"
                                            >
                                                Check Answer
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={`absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl shadow-[0_24px_70px_rgba(0,0,0,0.75)] overflow-hidden flex flex-col h-full bg-[#101a14] border border-amber-200/30 ring-1 ring-black/60 ${!isFlipped ? 'pointer-events-none' : ''}`}>
                                <div className="bg-gradient-to-r from-[#32170f] via-[#6b351f] to-[#32170f] text-amber-100 p-3 md:p-4 flex justify-between items-center h-[clamp(72px,12vh,96px)] sm:h-20 md:h-24 flex-shrink-0 relative z-10 border-b-2 border-amber-500/45 shadow-[inset_0_-8px_18px_rgba(0,0,0,0.3)]">
                                    <div className="font-black text-sm sm:text-xl tracking-wide">Answer</div>
                                    <button onClick={() => setIsFlipped(false)} className="p-2 bg-black/30 border border-amber-200/30 rounded-full hover:bg-amber-300/20 text-amber-100" title="Flip Back"><RotateCcw size={18} className="sm:w-6 sm:h-6" /></button>
                                </div>

                                <div className="flex-grow flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-[#0f1b14] text-center overflow-hidden w-full relative z-0" style={chalkboardStyle}>
                                    <div ref={answerWrapRef} className="flex-1 overflow-hidden flex flex-col items-center justify-center w-full min-h-0 px-2 py-2">
                                        {hasOptions && mcResult && (
                                            <div className="animate-bounce mb-4 sm:mb-8">
                                                {mcResult === 'correct' ? <div className="text-3xl sm:text-6xl font-black text-green-500 uppercase">Correct!</div> : <div className="text-3xl sm:text-6xl font-black text-red-500 uppercase">Incorrect</div>}
                                            </div>
                                        )}
                                        <div
                                            ref={answerTextRef}
                                            style={answerFontSize ? { fontSize: `${answerFontSize}px`, lineHeight: '1.15' } : undefined}
                                            className={`font-display font-bold text-amber-50 leading-tight whitespace-pre-wrap break-words hyphens-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] ${getAnswerFontSizeClass(currentQuestion.answer)}`}
                                        >
                                            {currentQuestion.answer}
                                        </div>
                                    </div>
                                </div>

                                <div className="h-[clamp(72px,12vh,96px)] sm:h-20 md:h-24 flex gap-0 flex-shrink-0 relative z-50">
                                    {hasOptions ? (
                                        <button onClick={() => handleThrow(mcResult === 'correct')} className={`flex-1 text-white font-bold text-base sm:text-2xl transition-colors flex items-center justify-center ${mcResult === 'correct' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}>Throw Dart</button>
                                    ) : (
                                        <>
                                            <button onClick={() => handleThrow(false)} className="flex-1 bg-red-500 text-white font-bold text-base sm:text-2xl hover:bg-red-600 transition-colors flex items-center justify-center border-t-4 border-red-700 active:border-t-0"><XIcon size={20} className="mr-2 sm:w-8 sm:h-8 sm:mr-3" /> Miss</button>
                                            <button onClick={() => handleThrow(true)} className="flex-1 bg-green-500 text-white font-bold text-base sm:text-2xl hover:bg-green-600 transition-colors flex items-center justify-center border-t-4 border-green-700 active:border-t-0"><Check size={20} className="mr-2 sm:w-8 sm:h-8 sm:mr-3" /> Hit!</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isImageZoomOpen && questionImageUrl && (
                <div
                    className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={() => setIsImageZoomOpen(false)}
                >
                    <div
                        className="relative w-full max-w-[90vw] max-h-[90vh] flex items-center justify-center overflow-visible"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            onClick={() => setIsImageZoomOpen(false)}
                            className="absolute -top-4 -right-4 bg-white text-slate-900 rounded-full w-9 h-9 flex items-center justify-center shadow-lg"
                            title="Close"
                        >
                            <XIcon size={18} />
                        </button>
                        <img
                            src={questionImageUrl}
                            alt={questionImageAlt}
                            onClick={() => setIsImageZoomOpen(false)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
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
                                maxHeight: 'calc((100vh - 4rem - env(safe-area-inset-top)) * 0.25)'
                            }}
                            className="rounded-2xl object-contain border border-white/10 shadow-2xl cursor-zoom-out"
                        />
                    </div>
                </div>
            )}

            {editingTeamIndex !== null && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-fade-in border border-slate-100">
                        <h3 className="text-xl font-bold text-slate-800 mb-4">Edit Team</h3>
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Name</label>
                            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none font-bold text-lg" />
                        </div>
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Score</label>
                            <input type="number" value={editScore} onChange={(e) => setEditScore(parseInt(e.target.value) || 0)} className="w-full p-3 border border-slate-200 rounded-lg text-center font-mono font-bold text-xl" />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setEditingTeamIndex(null)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Cancel</button>
                            <button onClick={saveTeamEdit} className="flex-1 py-3 bg-brand-blue text-white font-bold rounded-lg hover:bg-sky-600">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {showQuitConfirm && (
                <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white text-slate-900 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl border border-slate-100">
                        <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Quit current game?</h2>
                        <p className="text-slate-500 mb-6">Your progress will be lost if you haven't saved.</p>
                        <div className="flex space-x-4">
                            <button 
                                onClick={() => setShowQuitConfirm(false)}
                                className="flex-1 py-3 bg-slate-100 font-bold rounded-lg hover:bg-slate-200 transition-colors text-slate-700"
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
                                className="flex-1 py-3 bg-slate-100 font-bold rounded-lg hover:bg-slate-200 transition-colors text-slate-700"
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

