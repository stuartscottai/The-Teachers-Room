
import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { GeneratedGame, GameRunOptions, GeneratedQuestion } from '../../types';
import { playSound } from '../../utils/gameUtils';
import { ArrowLeft, Clock, Check, X as XIcon, Edit2, Maximize2, Minimize2, RotateCcw, Volume2, VolumeX, Trophy, Target, FileQuestion, RefreshCw } from 'lucide-react';

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

const BOARD_RADIUS = 10;
const TEXTURE_SCALE = 0.84375; 

const SECTORS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const SLICE_ANGLE = (Math.PI * 2) / 20;

const R_BULL_INNER = 0.03;
const R_BULL_OUTER = 0.08;
const R_TRIPLE_INNER = 0.55;
const R_TRIPLE_OUTER = 0.60;
const R_DOUBLE_INNER = 0.95;
const R_DOUBLE_OUTER = 1.0;

const COLORS = {
    black: '#1a1a1a',
    white: '#f3f4f6',
    red: '#e11d48',
    green: '#10b981',
    wire: '#94a3b8'
};

const createDartboardTexture = () => {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 80; 

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, size, size);

    ctx.beginPath();
    ctx.arc(cx, cy, size/2 - 5, 0, Math.PI*2);
    ctx.fillStyle = '#000';
    ctx.fill();

    for (let i = 0; i < 20; i++) {
        const angle = (i * SLICE_ANGLE) - (Math.PI / 2) - (SLICE_ANGLE / 2);
        const isEven = i % 2 === 0;
        
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, angle, angle + SLICE_ANGLE);
        ctx.closePath();
        ctx.fillStyle = isEven ? COLORS.black : COLORS.white;
        ctx.fill();
        ctx.strokeStyle = COLORS.wire;
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    const drawRing = (inner: number, outer: number) => {
        for (let i = 0; i < 20; i++) {
            const angle = (i * SLICE_ANGLE) - (Math.PI / 2) - (SLICE_ANGLE / 2);
            const isEven = i % 2 === 0;
            
            ctx.beginPath();
            ctx.arc(cx, cy, radius * outer, angle, angle + SLICE_ANGLE);
            ctx.arc(cx, cy, radius * inner, angle + SLICE_ANGLE, angle, true);
            ctx.closePath();
            ctx.fillStyle = isEven ? COLORS.red : COLORS.green;
            ctx.fill();
            ctx.stroke();
        }
    };

    drawRing(R_DOUBLE_INNER, R_DOUBLE_OUTER);
    drawRing(R_TRIPLE_INNER, R_TRIPLE_OUTER);

    ctx.beginPath();
    ctx.arc(cx, cy, radius * R_BULL_OUTER, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.green;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius * R_BULL_INNER, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.red;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius * R_DOUBLE_OUTER, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.wire;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 60px Quicksand, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i < 20; i++) {
        const angle = (i * SLICE_ANGLE) - (Math.PI / 2);
        const numRadius = radius + 45; 
        const x = cx + Math.cos(angle) * numRadius;
        const y = cy + Math.sin(angle) * numRadius;
        ctx.fillText(SECTORS[i].toString(), x, y);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
};

// Generate a textured cream wall
const createWallTexture = () => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Base Cream Color
    ctx.fillStyle = '#fdf6e3'; 
    ctx.fillRect(0, 0, size, size);
    
    // Add subtle noise/texture
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#5c5c5c';
    
    for(let i=0; i<8000; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = Math.random() * 2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI*2);
        ctx.fill();
    }
    
    // Add faint scratches
    ctx.globalAlpha = 0.03;
    for(let i=0; i<200; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * size, Math.random() * size);
        ctx.lineTo(Math.random() * size, Math.random() * size);
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4); // Repeat for detail
    return texture;
};

const getHitData = (uv: THREE.Vector2 | { x: number, y: number }) => {
    const dx = uv.x - 0.5;
    const dy = uv.y - 0.5;
    const scaleFactor = 1 / TEXTURE_SCALE; 
    const r = Math.sqrt(dx*dx + dy*dy) * 2 * scaleFactor; 
    
    let degrees = Math.atan2(dx, dy) * (180 / Math.PI);
    if (degrees < 0) degrees += 360;
    
    const index = Math.floor(((degrees + 9) % 360) / 18);
    const sector = SECTORS[index];

    let zone = 'Single';
    let multiplier = 1;
    
    if (r < R_BULL_INNER) { return { points: 50, label: 'BULLSEYE', multiplier: 1, sector: 50 }; }
    if (r < R_BULL_OUTER) { return { points: 25, label: 'OUTER BULL', multiplier: 1, sector: 25 }; }
    
    if (r > R_TRIPLE_INNER && r < R_TRIPLE_OUTER) { zone = 'Treble'; multiplier = 3; }
    else if (r > R_DOUBLE_INNER && r < R_DOUBLE_OUTER) { zone = 'Double'; multiplier = 2; }
    else if (r > 1.0) { return { points: 0, label: 'MISS', multiplier: 0, sector: 0 }; }
    
    return {
        points: sector * multiplier,
        label: `${zone} ${sector}`,
        multiplier,
        sector
    };
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

    // Random roll: determines the angle of the "X" flight cross when landing
    const randomRoll = useMemo(() => Math.random() * Math.PI * 2, []);
    
    // Random "sag": gravity effect on the dart's tail
    const sagAngle = useMemo(() => (Math.random() * 0.15) + 0.05, []);

    // Realistic 2D Flight Geometry (Standard Shape) - SCALED UP Another 25% (Total ~56% increase from base)
    const flightGeometry = useMemo(() => {
        const s = new THREE.Shape();
        // Shape drawn in XY plane. 
        // Scaled up by 1.25x from previous
        
        s.moveTo(0, 0);         
        s.lineTo(0.04, 0.09);   
        s.lineTo(0.47, 0.30);   
        s.lineTo(0.47, 0.78);   
        s.lineTo(0.09, 0.98);   
        s.lineTo(0, 0.98);      
        s.lineTo(0, 0);         
        
        return new THREE.ShapeGeometry(s);
    }, []);

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
            // Embed tip
            groupRef.current.translateZ(0.15);
            // Apply slight sag to mimic weight
            groupRef.current.rotation.x += sagAngle;
            onLand(dart);
        }
    });

    return (
        <group ref={groupRef} position={dart.startPosition}>
            {/* Z-Rotation Group: Rotates the entire dart around its axis for random landing angle */}
            <group rotation={[0, 0, randomRoll]}>
                <group rotation={[0, 0, 0]}>
                    {/* 1. Steel Tip - Longer (0.5) */}
                    <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
                        <meshStandardMaterial color="#999" metalness={1} roughness={0.3} />
                    </mesh>
                    
                    {/* 2. Barrel - Longer (1.75), shifted back to connect to tip */}
                    <mesh position={[0, 0, -1.125]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.08, 0.08, 1.75, 16]} />
                        <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
                    </mesh>
                    <mesh position={[0, 0, -1.125]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.085, 0.085, 1.2, 16]} />
                        <meshStandardMaterial color="#334155" transparent opacity={0.3} /> 
                    </mesh>
                    
                    {/* 3. Shaft (Stem) - Longer (1.0), shifted back */}
                    <mesh position={[0, 0, -2.5]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.05, 0.08, 1.0, 12]} />
                        <meshStandardMaterial color="#111" roughness={0.6} />
                    </mesh>

                    {/* 4. Flights (2D Cross) - Scaled Up and Shifted */}
                    <group position={[0, 0, -3.0]}>
                        {[0, 1, 2, 3].map((i) => (
                            <group key={i} rotation={[0, 0, (Math.PI / 2) * i]}>
                                <mesh geometry={flightGeometry} rotation={[-Math.PI / 2, 0, 0]}>
                                    <meshStandardMaterial 
                                        color={dart.color} 
                                        side={THREE.DoubleSide}
                                        transparent={false}
                                        opacity={1}
                                    />
                                </mesh>
                            </group>
                        ))}
                    </group>
                </group>
            </group>
        </group>
    );
};

const DartboardScene = ({ 
    onHover, 
    onClick, 
    darts, 
    isAiming,
    hoverData,
    onDartLand
}: { 
    onHover: (data: any, pos: THREE.Vector3) => void, 
    onClick: (data: any) => void,
    darts: DartObject[],
    isAiming: boolean,
    hoverData: any,
    onDartLand: (dart: DartObject) => void
}) => {
    const texture = useMemo(() => createDartboardTexture(), []);
    const wallTexture = useMemo(() => createWallTexture(), []);
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

    const bubbleY = isTopSector ? -5 : 5;

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
            highlightRef.current.position.z = 0.1;
        }
    };

    return (
        <group>
            <ambientLight intensity={1.5} />
            <spotLight position={[10, 10, 30]} angle={0.3} penumbra={1} intensity={2} castShadow />
            <pointLight position={[-10, -10, 10]} intensity={0.5} />

            <mesh position={[0, 0, -2]}>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial map={wallTexture} roughness={1} />
            </mesh>

            <mesh 
                position={[0, 0, 0]} 
                onPointerMove={handlePointerMove}
                onClick={(e) => isAiming && e.uv && onClick(getHitData(e.uv))}
            >
                <circleGeometry args={[BOARD_RADIUS, 64]} />
                <meshBasicMaterial map={texture} />
            </mesh>

            {isAiming && (
                <mesh ref={highlightRef} position={[0, 0, 100]} raycast={() => null}>
                    <ringGeometry args={[0.2, 0.4, 32]} />
                    <meshBasicMaterial color="#fbbf24" toneMapped={false} transparent opacity={0.8} />
                    {hoverData && hoverData.points > 0 && (
                        /* Smart positioning based on sector + Transparency */
                        <Html position={[0, bubbleY, 0]} center pointerEvents="none" zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
                            <div className="bg-slate-900/80 text-white px-8 py-6 rounded-3xl whitespace-nowrap text-center backdrop-blur-md border-4 border-brand-yellow shadow-2xl scale-125 origin-center pointer-events-none select-none">
                                <div className="text-6xl font-black font-mono leading-none text-brand-yellow mb-2 drop-shadow-md">{hoverData.points}</div>
                                <div className="text-xl font-bold font-display uppercase tracking-widest text-white/90">{hoverData.label}</div>
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
            <div className="text-5xl font-black font-mono leading-none tracking-tight transition-all">
                {displayScore}
            </div>
            {diff !== 0 && (
                <div className={`absolute -top-8 left-1/2 -translate-x-1/2 font-bold text-xl animate-bounce
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
    const [turnResult, setTurnResult] = useState<{ score: number, text: string } | null>(null);
    const [isMuted, setIsMuted] = useState(options.muted);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isTimesUp, setIsTimesUp] = useState(false);
    const [editingTeamIndex, setEditingTeamIndex] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editScore, setEditScore] = useState(0);
    const [showQuitConfirm, setShowQuitConfirm] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [usedQuestionIds, setUsedQuestionIds] = useState<number[]>([]);

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

    // Target Limit Logic:
    // If High Score Mode + Turns Limit Set: limit = players * turns
    // Else use the config limit or length of array
    const turnsPerPlayer = options.dartsLegs || 0;
    const totalTurnsHighscore = (!is301 && turnsPerPlayer > 0) ? turnsPerPlayer * options.players : 0;
    
    const targetQuestionCount = totalTurnsHighscore > 0 
        ? totalTurnsHighscore 
        : (game.config.questionCount || (questions.length - 10 > 0 ? questions.length - 10 : questions.length));

    // SCROLL LOCK EFFECT
    useEffect(() => {
        const shouldLock = phase === 'question';
        document.body.style.overflow = shouldLock ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [phase]);

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
        
        let difficulty = 'easy';
        if (data.points === 50 || data.multiplier === 3) difficulty = 'hard';
        else if (data.points === 25 || data.multiplier === 2) difficulty = 'medium';
        
        // Filter out used questions
        const available = questions.filter(q => !usedQuestionIds.includes(q.id));
        
        let selectedQ: GeneratedQuestion;

        if (available.length === 0) {
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
        setTimeLeft(options.timerSeconds);
        setIsTimesUp(false);
    };

    const spawnDart = (hit: boolean) => {
        const sectorIndex = SECTORS.indexOf(lockedTarget.sector);
        let baseAngle = (Math.PI / 2) - (sectorIndex * SLICE_ANGLE);
        const BOARD_VISUAL_R = BOARD_RADIUS * TEXTURE_SCALE;

        let targetR = 0;
        let angleVariance = 0.05; 
        let rVariance = 0.15; 

        if (hit) {
            if (lockedTarget.multiplier === 3) {
                targetR = ((R_TRIPLE_INNER + R_TRIPLE_OUTER) / 2) * BOARD_VISUAL_R;
                rVariance = 0.1; 
            } else if (lockedTarget.multiplier === 2) {
                targetR = ((R_DOUBLE_INNER + R_DOUBLE_OUTER) / 2) * BOARD_VISUAL_R;
                rVariance = 0.1;
            } else if (lockedTarget.points === 50) {
                targetR = 0;
                rVariance = 0.1;
            } else if (lockedTarget.points === 25) {
                targetR = ((R_BULL_INNER + R_BULL_OUTER) / 2) * BOARD_VISUAL_R;
                rVariance = 0.1;
            } else {
                targetR = ((R_TRIPLE_OUTER + R_DOUBLE_INNER) / 2) * BOARD_VISUAL_R; 
                rVariance = 0.8; 
            }

            const randAngle = baseAngle + (Math.random() - 0.5) * angleVariance;
            const randR = targetR + (Math.random() - 0.5) * rVariance;
            
            const finalX = Math.cos(randAngle) * randR;
            const finalY = Math.sin(randAngle) * randR;
            
            launchDart(new THREE.Vector3(finalX, finalY, 0), lockedTarget.points, lockedTarget.label, lockedTarget.multiplier);

        } else {
            const missAngleOffset = (Math.random() - 0.5) * Math.PI; 
            const missRadius = (Math.random() * BOARD_VISUAL_R * 0.8) + (Math.random() > 0.8 ? BOARD_VISUAL_R * 0.4 : 0);
            
            const finalX = Math.cos(baseAngle + missAngleOffset) * missRadius;
            const finalY = Math.sin(baseAngle + missAngleOffset) * missRadius;

            const dist = Math.sqrt(finalX*finalX + finalY*finalY);
            const normalizedDist = dist / BOARD_VISUAL_R; 
            
            let score = 0;
            let label = "";
            let mult = 0;

            if (normalizedDist > 1.0) {
                score = 0;
                label = "MISS";
            } else {
                const hitAngle = Math.atan2(finalY, finalX);
                let indexRaw = (Math.PI / 2 - hitAngle) / SLICE_ANGLE;
                indexRaw = Math.round(indexRaw);
                const hitIndex = ((indexRaw % 20) + 20) % 20; 
                const hitSector = SECTORS[hitIndex];
                
                if (normalizedDist < 0.03) { score = 50; label = "LUCKY BULL!"; mult = 2; }
                else if (normalizedDist < 0.08) { score = 25; label = "LUCKY BULL!"; mult = 1; }
                else if (normalizedDist > 0.55 && normalizedDist < 0.60) { score = hitSector * 3; label = `LUCKY TREBLE ${hitSector}`; mult = 3; }
                else if (normalizedDist > 0.95 && normalizedDist < 1.0) { score = hitSector * 2; label = `LUCKY DOUBLE ${hitSector}`; mult = 2; }
                else { score = hitSector; label = `LUCKY ${hitSector}`; mult = 1; }
            }
            launchDart(new THREE.Vector3(finalX, finalY, 0), score, label, mult);
        }
    };

    const launchDart = (targetPos: THREE.Vector3, score: number, label: string, multiplier: number) => {
        const startPos = new THREE.Vector3(0, -5, 25);
        const controlPos = new THREE.Vector3(
            targetPos.x * 0.5, 
            targetPos.y * 0.5 + 8, 
            12
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
                playSound('win', isMuted);
            } else {
                setTimeout(() => {
                    const isRoundComplete = currentTeam === options.players - 1;
                    const questionsLimitReached = usedQuestionIds.length >= targetQuestionCount;

                    // End Game Check
                    if (!is301 && questionsLimitReached && isRoundComplete) {
                         setPhase('gameover');
                         playSound('win', isMuted);
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

    const getFontSizeClass = (text: string) => {
        const len = text ? text.length : 0;
        // Adjusted sizes to be more conservative and prevent scrolling
        if (len < 20) return 'text-6xl md:text-8xl'; 
        if (len < 60) return 'text-5xl md:text-7xl';
        if (len < 120) return 'text-4xl md:text-6xl';
        if (len < 200) return 'text-3xl md:text-5xl';
        return 'text-2xl md:text-4xl';
    };

    const getOptionFontSizeClass = (text: string) => {
        const len = text ? text.length : 0;
        if (len < 20) return 'text-3xl md:text-5xl';
        if (len < 35) return 'text-2xl md:text-4xl';
        return 'text-lg md:text-2xl';
    };

    const hasOptions = currentQuestion?.options && currentQuestion.options.length > 0;

    // Helper to determine winner name
    const getWinnerName = () => {
        if (is301) return teamNames[currentTeam]; // The person who just hit 0
        if (options.players === 1) return "Game Complete!";
        
        const maxScore = Math.max(...scores);
        const winners = scores
            .map((s, i) => s === maxScore ? teamNames[i] : null)
            .filter(Boolean);
            
        if (winners.length === 1) return winners[0];
        return "It's a Tie!";
    };

    return (
        <div ref={containerRef} className={`bg-sky-50 flex flex-col ${isFullscreen ? 'h-screen' : 'h-[calc(100vh-4rem)]'} overflow-hidden relative`}>
            
            <div className="bg-white p-4 shrink-0 z-[50] shadow-sm flex justify-between items-center gap-4 min-h-[140px] border-b border-slate-200 relative">
                <div className="flex flex-col items-start gap-2 min-w-[140px]">
                    <button onClick={() => setShowQuitConfirm(true)} className="text-slate-500 hover:text-red-600 flex items-center text-sm bg-slate-100 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors font-bold border border-slate-200"><ArrowLeft size={16} className="mr-2" /> Quit</button>
                    <h1 className="text-slate-800 font-display font-bold text-lg truncate max-w-[200px] hidden md:block opacity-80">{game.title}</h1>
                    
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-1 rounded">
                            {is301 ? '301 Mode' : 'High Score'}
                        </span>
                        {!is301 && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-600 px-2 py-1 rounded flex items-center">
                                <FileQuestion size={10} className="mr-1" />
                                Q: {usedQuestionIds.length}/{targetQuestionCount}
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
                <div className="flex-1 flex justify-center gap-4 overflow-x-auto no-scrollbar px-4 h-full items-center">
                    {scores.map((score, idx) => (
                        <button key={idx} onClick={() => openEditTeam(idx)} className={`px-6 py-3 rounded-xl text-center transition-all border-b-4 min-w-[150px] relative group h-28 flex flex-col justify-center items-center shadow-sm ${currentTeam === idx ? 'bg-brand-blue border-sky-600 text-white shadow-lg scale-110 ring-4 ring-sky-100 z-10' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'}`}>
                            <div className="text-lg uppercase font-bold tracking-wider truncate max-w-[130px] mb-1 flex items-center gap-1">
                                {teamNames[idx]}
                                {currentTeam === idx && <div className="w-2 h-2 rounded-full bg-brand-yellow animate-pulse ml-1"></div>}
                            </div>
                            <AnimatedScore score={score} is301={is301} />
                            <div className="absolute top-2 right-2 bg-slate-100 text-slate-900 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={12} /></div>
                        </button>
                    ))}
                </div>
                <div className="flex items-center justify-end min-w-[140px] gap-2">
                    <button onClick={() => setIsMuted(!isMuted)} className="text-slate-400 hover:text-brand-blue p-3 bg-slate-100 hover:bg-sky-50 rounded-xl transition-colors border border-slate-200">{isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}</button>
                    <button onClick={toggleFullscreen} className="text-slate-400 hover:text-brand-blue p-3 bg-slate-100 hover:bg-sky-50 rounded-xl transition-colors border border-slate-200">{isFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}</button>
                </div>
            </div>

            <div className="flex-grow relative cursor-crosshair bg-[#fdf6e3] overflow-hidden min-h-0">
                <div className="absolute inset-0">
                    <Canvas camera={{ position: [0, 0, 28], fov: 45 }} shadows style={{ width: '100%', height: '100%' }}>
                        <color attach="background" args={['#fdf6e3']} />
                        <Suspense fallback={null}>
                            <DartboardScene 
                                onHover={handleBoardHover} 
                                onClick={handleBoardClick}
                                darts={darts}
                                isAiming={phase === 'aim'}
                                hoverData={hoverData}
                                onDartLand={handleDartLand}
                            />
                        </Suspense>
                    </Canvas>
                </div>

                {phase === 'aim' && !hoverData && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 bg-black/40 backdrop-blur-[2px] animate-fade-in">
                        <div className="bg-white/10 backdrop-blur-md p-10 rounded-3xl border-4 border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center animate-bounce-slow">
                            <Target size={80} className="text-brand-yellow mb-4 drop-shadow-lg" />
                            <div className="text-white text-6xl font-display font-black mb-2 drop-shadow-xl uppercase tracking-wider text-center" style={{ textShadow: '0 4px 0 #000' }}>
                                {teamNames[currentTeam]}
                            </div>
                            <div className="text-sky-300 font-mono font-bold text-2xl tracking-[0.3em] uppercase bg-black/50 px-6 py-2 rounded-full border border-sky-500/50 shadow-inner">
                                Your Turn
                            </div>
                            <div className="mt-6 text-white/80 font-bold text-lg animate-pulse">
                                CLICK BOARD TO AIM
                            </div>
                        </div>
                    </div>
                )}

                {phase === 'result' && turnResult && (
                    <div className="absolute top-1/4 right-10 z-40 pointer-events-none animate-[slide-up_0.3s_ease-out]">
                        <div className="bg-black/80 backdrop-blur-md p-6 rounded-2xl text-center shadow-2xl border-2 border-white/20 transform rotate-2">
                            <div className={`text-6xl font-black italic ${turnResult.score > 0 ? 'text-brand-yellow' : 'text-red-500'}`}>{turnResult.text}</div>
                            <div className="text-white text-3xl font-bold mt-2">
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
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 backdrop-blur-md p-4 animate-fade-in pt-[150px]">
                    <div className="w-full max-w-6xl aspect-[16/9] max-h-[calc(100vh-180px)] [perspective:1000px]">
                        <div className={`relative w-full h-full transition-all duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                            
                            <div className={`absolute inset-0 [backface-visibility:hidden] rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full bg-white ${isFlipped ? 'pointer-events-none' : ''}`}>
                                <div className="bg-brand-blue text-white p-4 flex justify-between items-center h-24 flex-shrink-0 relative z-10">
                                    <div className="font-bold text-2xl opacity-90">{teamNames[currentTeam]}'s Turn</div>
                                    <div className="bg-white/20 px-4 py-1 rounded-full font-black text-2xl">Target: {lockedTarget?.label}</div>
                                    <div className="font-bold text-xl opacity-80">{lockedTarget?.points} Points</div>
                                </div>

                                <div className="bg-white flex-grow w-full flex flex-col p-8 relative overflow-hidden z-0">
                                    <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center w-full min-h-0">
                                        <div className={`font-display font-bold text-slate-800 leading-tight text-center w-full ${getFontSizeClass(currentQuestion.question)}`}>{currentQuestion.question}</div>
                                    </div>
                                    {hasOptions && !isFlipped && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-5xl mt-6 flex-shrink-0 relative z-10">
                                            {(() => {
                                                const longestText = currentQuestion.options!.reduce((a, b) => a.length > b.length ? a : b, '');
                                                const uniformSize = getOptionFontSizeClass(longestText);
                                                return currentQuestion.options!.map((opt, i) => (
                                                    <button key={i} onClick={() => {
                                                            const clean = (s: string) => s.replace(/^[A-Z]\)\s*/i, '').trim().toLowerCase();
                                                            const isCorrect = clean(opt) === clean(currentQuestion.answer);
                                                            setMcResult(isCorrect ? 'correct' : 'incorrect');
                                                            setIsFlipped(true);
                                                        }} className={`p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-brand-yellow hover:border-yellow-400 hover:text-slate-900 transition-all text-center shadow-sm flex items-center justify-center min-h-[80px] ${uniformSize}`}>{opt}</button>
                                                ));
                                            })()}
                                        </div>
                                    )}
                                </div>

                                <div className={`h-24 flex items-center justify-between px-8 relative flex-shrink-0 z-50 transition-colors duration-300 ${isTimesUp ? 'bg-red-600' : 'bg-gradient-to-r from-brand-blue to-sky-500'}`}>
                                    {options.timerSeconds > 0 && timeLeft > 0 && !isTimesUp && (
                                        <div className="absolute inset-0 bg-black/10 flex items-center justify-start pointer-events-none">
                                            <div className="h-full bg-white/20 transition-all duration-1000" style={{ width: `${(timeLeft / options.timerSeconds) * 100}%` }} />
                                        </div>
                                    )}
                                    {!hasOptions && (
                                        <button onClick={() => setIsFlipped(true)} className="bg-white text-brand-blue px-10 py-3 rounded-full font-bold text-2xl shadow-lg hover:scale-105 transition-transform flex items-center relative z-50 border-2 border-white">Check Answer</button>
                                    )}
                                    {options.timerSeconds > 0 && (
                                        <div className="text-white font-mono font-bold text-4xl opacity-90 flex items-center pointer-events-none absolute left-1/2 -translate-x-1/2">
                                            {isTimesUp ? <span className="animate-pulse font-black drop-shadow-md">TIME'S UP!</span> : <><Clock size={32} className="mr-3" /> {timeLeft}</>}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={`absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full bg-white ${!isFlipped ? 'pointer-events-none' : ''}`}>
                                <div className="bg-slate-200 text-slate-600 p-4 flex justify-between items-center h-24 flex-shrink-0 relative z-10">
                                    <div className="font-bold text-2xl opacity-80">Answer</div>
                                    <button onClick={() => setIsFlipped(false)} className="p-2 bg-white rounded-full hover:bg-slate-100 text-slate-500" title="Flip Back"><RotateCcw size={24} /></button>
                                </div>

                                <div className="flex-grow flex flex-col items-center justify-center p-8 bg-white text-center overflow-hidden w-full relative z-0">
                                    {hasOptions && mcResult && (
                                        <div className="animate-bounce mb-8">
                                            {mcResult === 'correct' ? <div className="text-6xl font-black text-green-500 uppercase">Correct!</div> : <div className="text-6xl font-black text-red-500 uppercase">Incorrect</div>}
                                        </div>
                                    )}
                                    <div className={`font-display font-bold text-slate-800 leading-tight whitespace-pre-wrap ${getFontSizeClass(currentQuestion.answer)}`}>{currentQuestion.answer}</div>
                                </div>

                                <div className="h-24 flex gap-0 flex-shrink-0 relative z-50">
                                    {hasOptions ? (
                                        <button onClick={() => handleThrow(mcResult === 'correct')} className={`flex-1 text-white font-bold text-2xl transition-colors flex items-center justify-center ${mcResult === 'correct' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}>Throw Dart</button>
                                    ) : (
                                        <>
                                            <button onClick={() => handleThrow(false)} className="flex-1 bg-red-500 text-white font-bold text-2xl hover:bg-red-600 transition-colors flex items-center justify-center border-t-4 border-red-700 active:border-t-0"><XIcon size={32} className="mr-3" /> Miss</button>
                                            <button onClick={() => handleThrow(true)} className="flex-1 bg-green-500 text-white font-bold text-2xl hover:bg-green-600 transition-colors flex items-center justify-center border-t-4 border-green-700 active:border-t-0"><Check size={32} className="mr-3" /> Hit!</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
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

            {phase === 'gameover' && (
                <div className="absolute inset-0 z-50 bg-slate-900/95 flex items-center justify-center backdrop-blur-sm">
                    <div className="text-center animate-slide-up">
                        <Trophy size={120} className="text-brand-yellow mx-auto mb-8 animate-bounce drop-shadow-2xl" />
                        <h1 className="text-7xl font-black text-white mb-6 tracking-tight">WINNER!</h1>
                        <h2 className="text-5xl font-display font-bold text-brand-blue mb-12 bg-white px-12 py-4 rounded-full shadow-xl inline-block">{getWinnerName()}</h2>
                        <div className="flex gap-6 justify-center">
                            <button onClick={onReplay} className="px-10 py-5 bg-white text-slate-900 rounded-full font-bold text-2xl hover:scale-105 transition-transform flex items-center justify-center">
                                <RefreshCw size={24} className="mr-2" /> Play Again
                            </button>
                            <button onClick={onFinish} className="px-10 py-5 bg-slate-800 text-white rounded-full font-bold text-2xl hover:bg-slate-700 transition-colors border-2 border-slate-600">Exit</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
