import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { RoundedBox, Environment, ContactShadows, Float, Html } from '@react-three/drei';
import * as THREE from 'three';
import { GeneratedGame, GameRunOptions, GeneratedQuestion } from '../../types';
import { playSound } from '../../utils/gameUtils';
import { ArrowLeft, HelpCircle, AlertTriangle, Trophy, RefreshCw, CheckCircle, XCircle, Clock, Play, Eye, EyeOff, ArrowRight, Maximize2, Minimize2, Volume2, VolumeX, Shuffle, Star } from 'lucide-react';

// --- 3D DICE COMPONENT ---
const PIP_OFFSET = 0.505;
const PIP_SIZE = 0.10;

const Pips = () => {
    const Pip = ({ position }: { position: [number, number, number] }) => (
        <mesh position={position} rotation={[0, 0, 0]}>
            <circleGeometry args={[PIP_SIZE, 32]} />
            <meshBasicMaterial color="black" />
        </mesh>
    );

    return (
        <group>
            {/* Face 1 (Front / Z+) */}
            <group position={[0, 0, PIP_OFFSET]}>
                <Pip position={[0, 0, 0]} />
            </group>
            {/* Face 6 (Back / Z-) */}
            <group position={[0, 0, -PIP_OFFSET]} rotation={[0, Math.PI, 0]}>
                <Pip position={[-0.25, 0.25, 0]} /> <Pip position={[0.25, 0.25, 0]} />
                <Pip position={[-0.25, 0, 0]} />    <Pip position={[0.25, 0, 0]} />
                <Pip position={[-0.25, -0.25, 0]} /> <Pip position={[0.25, -0.25, 0]} />
            </group>
            {/* Face 2 (Top / Y+) */}
            <group position={[0, PIP_OFFSET, 0]} rotation={[-Math.PI/2, 0, 0]}>
                <Pip position={[-0.25, -0.25, 0]} /> <Pip position={[0.25, 0.25, 0]} />
            </group>
            {/* Face 5 (Bottom / Y-) */}
            <group position={[0, -PIP_OFFSET, 0]} rotation={[Math.PI/2, 0, 0]}>
                <Pip position={[-0.25, -0.25, 0]} /> <Pip position={[0.25, 0.25, 0]} />
                <Pip position={[-0.25, 0.25, 0]} />  <Pip position={[0.25, -0.25, 0]} />
                <Pip position={[0, 0, 0]} />
            </group>
            {/* Face 3 (Right / X+) */}
            <group position={[PIP_OFFSET, 0, 0]} rotation={[0, Math.PI/2, 0]}>
                <Pip position={[-0.25, -0.25, 0]} /> <Pip position={[0, 0, 0]} /> <Pip position={[0.25, 0.25, 0]} />
            </group>
            {/* Face 4 (Left / X-) */}
            <group position={[-PIP_OFFSET, 0, 0]} rotation={[0, -Math.PI/2, 0]}>
                <Pip position={[-0.25, -0.25, 0]} /> <Pip position={[0.25, 0.25, 0]} />
                <Pip position={[-0.25, 0.25, 0]} />  <Pip position={[0.25, -0.25, 0]} />
            </group>
        </group>
    );
};

const Dice3D = ({ rolling, result, onLand }: { rolling: boolean, result: number, onLand: () => void }) => {
    const mesh = useRef<THREE.Group>(null);
    const landedRef = useRef(true); 
    
    const getRotation = (num: number): [number, number, number] => {
        switch(num) {
            case 1: return [0, 0, 0]; 
            case 6: return [Math.PI, 0, 0];
            case 2: return [-Math.PI/2, 0, 0]; 
            case 5: return [Math.PI/2, 0, 0];
            case 3: return [0, -Math.PI/2, 0]; 
            case 4: return [0, Math.PI/2, 0]; 
            default: return [0, 0, 0];
        }
    };

    const targetRot = useMemo(() => getRotation(result), [result]);

    useEffect(() => {
        if (rolling) {
            landedRef.current = false;
        }
    }, [rolling]);

    useFrame((state, delta) => {
        if (!mesh.current) return;

        if (rolling) {
            mesh.current.rotation.x += 15 * delta;
            mesh.current.rotation.y += 12 * delta;
            mesh.current.rotation.z += 8 * delta;
        } else {
            const speed = 6 * delta;
            
            if (!landedRef.current) {
                mesh.current.rotation.x = THREE.MathUtils.lerp(mesh.current.rotation.x, targetRot[0], speed);
                mesh.current.rotation.y = THREE.MathUtils.lerp(mesh.current.rotation.y, targetRot[1], speed);
                mesh.current.rotation.z = THREE.MathUtils.lerp(mesh.current.rotation.z, targetRot[2], speed);

                const dist = Math.abs(mesh.current.rotation.x - targetRot[0]) + 
                             Math.abs(mesh.current.rotation.y - targetRot[1]) + 
                             Math.abs(mesh.current.rotation.z - targetRot[2]);
                
                if (dist < 0.05) {
                    mesh.current.rotation.set(targetRot[0], targetRot[1], targetRot[2]);
                    landedRef.current = true;
                    onLand();
                }
            }
        }
    });

    return (
        <Float speed={rolling ? 0 : 2} rotationIntensity={rolling ? 0 : 0.5} floatIntensity={0.5}>
            <group ref={mesh}>
                <RoundedBox args={[1, 1, 1]} radius={0.15} smoothness={8}>
                    <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.1} />
                </RoundedBox>
                <Pips />
            </group>
        </Float>
    );
};

// --- HELPERS ---

const generateWigglyPath = (start: {x: number, y: number}, end: {x: number, y: number}) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = Math.atan2(dy, dx);
    const amplitude = 3; 
    const points = [];
    const steps = 40; 
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const lx = start.x + dx * t;
        const ly = start.y + dy * t;
        const perpAngle = angle + Math.PI / 2;
        const wave = Math.sin(t * Math.PI * 4) * amplitude; 
        const px = lx + Math.cos(perpAngle) * wave;
        const py = ly + Math.sin(perpAngle) * wave;
        points.push(`${px},${py}`);
    }
    let d = `M ${points[0]}`;
    for (let i = 1; i < points.length; i++) {
        d += ` L ${points[i]}`;
    }
    return d;
};

// Helper for snake tongue - UPDATED
const generateTongue = (start: {x: number, y: number}) => {
    const sX = start.x;
    const sY = start.y;
    // Start center (y+0.5), go down (y+1.8), fork left/right (y+2.5)
    return `M ${sX} ${sY+0.5} L ${sX} ${sY+1.8} L ${sX-0.6} ${sY+2.8} M ${sX} ${sY+1.8} L ${sX+0.6} ${sY+2.8}`;
};

const generateLadderVisuals = (start: {x: number, y: number}, end: {x: number, y: number}) => {
    const width = 3; 
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx*dx + dy*dy);
    const angle = Math.atan2(dy, dx);
    const perpAngle = angle + Math.PI / 2;

    const ox = Math.cos(perpAngle) * (width / 2);
    const oy = Math.sin(perpAngle) * (width / 2);

    const rail1 = {
        x1: start.x + ox, y1: start.y + oy,
        x2: end.x + ox, y2: end.y + oy
    };
    const rail2 = {
        x1: start.x - ox, y1: start.y - oy,
        x2: end.x - ox, y2: end.y - oy
    };

    const rungs = [];
    const rungCount = Math.floor(length / 4); 
    for (let i = 1; i < rungCount; i++) {
        const t = i / rungCount;
        const cx = start.x + dx * t;
        const cy = start.y + dy * t;
        rungs.push({
            x1: cx + ox * 0.8, y1: cy + oy * 0.8,
            x2: cx - ox * 0.8, y2: cy - oy * 0.8
        });
    }

    return { rail1, rail2, rungs };
};

const getBoardCoordinates = (index: number) => {
    if (index < 0) index = 0;
    if (index > 99) index = 99;
    const row = Math.floor(index / 10);
    const isEvenRow = row % 2 === 0;
    const col = isEvenRow ? (index % 10) : 9 - (index % 10);
    const visualRow = 9 - row; 
    return { x: (col * 10) + 5, y: (visualRow * 10) + 5 };
};

// --- MAIN COMPONENT ---

interface SnakesLaddersGameProps {
    game: GeneratedGame;
    options: GameRunOptions;
    onBack: () => void;
    onFinish: () => void;
    onReplay: () => void;
}

export const SnakesLaddersGame: React.FC<SnakesLaddersGameProps> = ({ game, options, onBack, onFinish, onReplay }) => {
    const [positions, setPositions] = useState<number[]>(Array(options.players).fill(0));
    const [turnOrder, setTurnOrder] = useState<number[]>(Array.from({length: options.players}, (_, i) => i));
    const [currentTurnIndex, setCurrentTurnIndex] = useState(0); // Index in turnOrder
    const [phase, setPhase] = useState<'setup' | 'roll' | 'question' | 'moving' | 'ladder-snake' | 'turn-complete' | 'gameover'>('setup');
    const [statusMessage, setStatusMessage] = useState("");
    const [diceValue, setDiceValue] = useState(1);
    const [isDiceRolling, setIsDiceRolling] = useState(false);
    
    const [questions, setQuestions] = useState<GeneratedQuestion[]>(game.questions || []);
    const [currentQuestion, setCurrentQuestion] = useState<GeneratedQuestion | null>(null);
    const [usedQuestionIds, setUsedQuestionIds] = useState<number[]>([]);
    
    const [isFlipped, setIsFlipped] = useState(false);
    const [flipLock, setFlipLock] = useState(false); // Prevents accidental clicks on back
    const [isQuestionVisible, setIsQuestionVisible] = useState(true); 
    const [mcResult, setMcResult] = useState<'correct' | 'incorrect' | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isTimesUp, setIsTimesUp] = useState(false);
    
    const [snakes, setSnakes] = useState<{start: number, end: number, path: string, tongue: string, color: string}[]>([]);
    const [ladders, setLadders] = useState<{start: number, end: number, visuals: any}[]>([]);
    const [bonusTiles, setBonusTiles] = useState<number[]>([]);
    const [showQuitConfirm, setShowQuitConfirm] = useState(false);
    const [isMuted, setIsMuted] = useState(options.muted);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const teamNames = options.teamNames || Array.from({length: options.players}, (_, i) => `Team ${i+1}`);
    const currentTeamId = turnOrder[currentTurnIndex];

    // --- BOARD INITIALIZATION ---
    useEffect(() => {
        const ladderDefs = [
            { s: 1, e: 38 }, { s: 4, e: 14 }, { s: 9, e: 31 },
            { s: 21, e: 42 }, { s: 28, e: 84 }, { s: 36, e: 44 },
            { s: 51, e: 67 }, { s: 71, e: 91 }, { s: 80, e: 100 }
        ];

        const snakeDefs = [
            { s: 98, e: 78, c: '#eab308' }, 
            { s: 93, e: 73, c: '#22c55e' }, 
            { s: 87, e: 24, c: '#3b82f6' }, 
            { s: 64, e: 60, c: '#a855f7' }, 
            { s: 62, e: 19, c: '#22c55e' }, 
            { s: 49, e: 11, c: '#eab308' }, 
            { s: 47, e: 26, c: '#ef4444' }, 
            { s: 16, e: 6, c: '#eab308' }   
        ];

        const newLadders = ladderDefs.map(l => {
            const sCoords = getBoardCoordinates(l.s - 1); // 0-based
            const eCoords = getBoardCoordinates(l.e - 1);
            return { start: l.s - 1, end: l.e - 1, visuals: generateLadderVisuals(sCoords, eCoords) };
        });

        const newSnakes = snakeDefs.map(s => {
            const sCoords = getBoardCoordinates(s.s - 1);
            const eCoords = getBoardCoordinates(s.e - 1);
            return { 
                start: s.s - 1, 
                end: s.e - 1, 
                path: generateWigglyPath(sCoords, eCoords), 
                tongue: generateTongue(sCoords),
                color: s.c 
            };
        });
        
        setSnakes(newSnakes);
        setLadders(newLadders);

        // STRICT EXCLUSION LIST (User defined + 0-index conversion)
        // 1, 4, 6, 9, 11, 14, 16, 19, 21, 24, 26, 29, 31, 36, 38, 42, 44, 47, 49, 51, 60, 62, 64, 67, 71, 73, 78, 80, 91, 93, 98, 100
        const PROHIBITED_SQUARES = new Set([0, 3, 5, 8, 10, 13, 15, 18, 20, 23, 25, 28, 30, 35, 37, 41, 43, 46, 48, 50, 59, 61, 63, 66, 70, 72, 77, 79, 90, 92, 97, 99]);

        // Generate Bonuses
        if (options.enableBonuses) {
            const pool: number[] = [];
            for (let i=0; i<100; i++) {
                if (!PROHIBITED_SQUARES.has(i)) {
                    pool.push(i);
                }
            }

            // Shuffle pool
            for (let i = pool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pool[i], pool[j]] = [pool[j], pool[i]];
            }
            
            // Take first 15
            setBonusTiles(pool.slice(0, 15));
        } else {
            setBonusTiles([]);
        }

        pickNewQuestion();
    }, [options.enableBonuses]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const shuffleTeams = () => {
        const shuffled = [...turnOrder];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        setTurnOrder(shuffled);
    };

    const pickNewQuestion = () => {
        const available = questions.filter(q => !usedQuestionIds.includes(q.id));
        let q: GeneratedQuestion;
        if (available.length === 0) {
            q = questions[Math.floor(Math.random() * questions.length)];
        } else {
            q = available[Math.floor(Math.random() * available.length)];
        }
        setCurrentQuestion(q);
        setIsFlipped(false);
        setFlipLock(false);
        setIsQuestionVisible(true);
        setMcResult(null);
        setIsTimesUp(false);
        setTimeLeft(options.timerSeconds);
    };

    // Timer Effect
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

    const handleFlip = () => {
        setIsFlipped(true);
        setFlipLock(true);
        // Lock buttons for 500ms to prevent double clicks going through to "Wrong"
        setTimeout(() => setFlipLock(false), 500);
    };

    const handleAnswer = (correct: boolean) => {
        if (flipLock) return; // Ignore clicks during transition
        if (!currentQuestion) return;
        if (!usedQuestionIds.includes(currentQuestion.id)) {
             setUsedQuestionIds(prev => [...prev, currentQuestion.id]);
        }
        playSound(correct ? 'correct' : 'incorrect', isMuted);
        
        if (correct) {
            setTimeout(() => {
                setPhase('moving');
                movePlayer(diceValue); // Move pre-rolled amount
            }, 1000);
        } else {
            // Incorrect answer means turn forfeit
            setTimeout(() => setPhase('turn-complete'), 1500);
        }
    };

    const handleMcSelect = (opt: string) => {
        if (!currentQuestion) return;
        const clean = (s: string) => s.replace(/^[A-Z]\)\s*/i, '').trim().toLowerCase();
        const isCorrect = clean(opt) === clean(currentQuestion.answer);
        setMcResult(isCorrect ? 'correct' : 'incorrect');
        handleFlip();
    };

    const rollDice = () => {
        if (phase !== 'roll' || isDiceRolling) return;
        setIsDiceRolling(true);
        playSound('select', isMuted, 'Glitch'); 
        
        // Wait for visual, then set result and go to QUESTION phase
        setTimeout(() => {
            const finalValue = Math.ceil(Math.random() * 6);
            setDiceValue(finalValue);
            setIsDiceRolling(false); 
        }, 1200); 
    };

    const handleDiceLand = () => {
        if (phase === 'roll') {
            // Show Question after rolling
            setPhase('question');
        }
    };

    const movePlayer = (steps: number) => {
        let currentPos = positions[currentTeamId];
        
        let stepCount = 0;
        const stepInterval = setInterval(() => {
            stepCount++;
            currentPos++;
            
            if (currentPos > 99) {
                currentPos = 99;
                clearInterval(stepInterval);
                checkTileEvents(currentPos);
                return;
            }

            setPositions(prev => {
                const newPos = [...prev];
                newPos[currentTeamId] = currentPos;
                return newPos;
            });
            playSound('select', isMuted, 'Tap'); 

            if (currentPos === 99) {
                clearInterval(stepInterval);
                setTimeout(() => {
                    playSound('win', isMuted);
                    setPhase('gameover');
                }, 500);
                return;
            }

            if (stepCount >= steps) {
                clearInterval(stepInterval);
                setTimeout(() => checkTileEvents(currentPos), 500);
            }
        }, 400); 
    };

    const checkTileEvents = (pos: number) => {
        const snake = snakes.find(s => s.start === pos);
        const ladder = ladders.find(l => l.start === pos);
        const isBonus = bonusTiles.includes(pos);

        if (snake) {
            setStatusMessage("Sliding down...");
            setPhase('ladder-snake');
            setTimeout(() => {
                playSound('incorrect', isMuted, 'WompWomp'); 
                animateSlide(pos, snake.end);
            }, 500);
        } else if (ladder) {
            setStatusMessage("Climbing!");
            setPhase('ladder-snake');
            setTimeout(() => {
                playSound('correct', isMuted, 'Magic'); 
                animateSlide(pos, ladder.end);
            }, 500);
        } else if (isBonus) {
            // Bonus Effect: Slide forward 2 spaces
            setStatusMessage("Bonus Boost!");
            setPhase('ladder-snake');
            setTimeout(() => {
                playSound('bonus', isMuted);
                const target = Math.min(99, pos + 2);
                animateSlide(pos, target);
            }, 500);
        } else {
            setTimeout(() => setPhase('turn-complete'), 500);
        }
    };

    const animateSlide = (start: number, end: number) => {
        setPositions(prev => {
            const newPos = [...prev];
            newPos[currentTeamId] = end;
            return newPos;
        });
        setTimeout(() => setPhase('turn-complete'), 1000);
    };

    const nextTurn = () => {
        setCurrentTurnIndex(prev => (prev + 1) % options.players);
        pickNewQuestion();
        setPhase('roll');
    };

    const teamColors = [
        { bg: 'bg-red-500', grad: 'radial-gradient(circle at 30% 30%, #fca5a5, #ef4444)', text: 'text-white' },
        { bg: 'bg-blue-500', grad: 'radial-gradient(circle at 30% 30%, #93c5fd, #3b82f6)', text: 'text-white' },
        { bg: 'bg-green-500', grad: 'radial-gradient(circle at 30% 30%, #86efac, #22c55e)', text: 'text-white' },
        { bg: 'bg-yellow-400', grad: 'radial-gradient(circle at 30% 30%, #fde047, #eab308)', text: 'text-slate-900' },
        { bg: 'bg-purple-500', grad: 'radial-gradient(circle at 30% 30%, #d8b4fe, #a855f7)', text: 'text-white' },
        { bg: 'bg-orange-500', grad: 'radial-gradient(circle at 30% 30%, #fdba74, #f97316)', text: 'text-white' },
    ];

    // Responsive Text Scaler - Adjusted to be very large by default
    const getFontSizeClass = (text: string) => {
        const len = text ? text.length : 0;
        if (len < 30) return 'text-6xl md:text-8xl'; // Huge for short text
        if (len < 60) return 'text-5xl md:text-7xl';
        if (len < 100) return 'text-4xl md:text-6xl';
        if (len < 150) return 'text-3xl md:text-5xl';
        return 'text-2xl md:text-4xl'; // Smallest fallback
    };

    // Calculate future position status
    const getTargetStatus = () => {
        const currentPos = positions[currentTeamId];
        const target = Math.min(99, currentPos + diceValue);
        
        if (target === 99) return { text: "Winning Move!", color: "text-brand-yellow" };
        if (snakes.some(s => s.start === target)) return { text: "Target: Snake Hazard!", color: "text-red-500 animate-pulse" };
        if (ladders.some(l => l.start === target)) return { text: "Target: Ladder Boost!", color: "text-green-500 animate-bounce" };
        if (bonusTiles.includes(target)) return { text: "Target: BONUS TILE!", color: "text-purple-500 animate-pulse" };
        return { text: `Target: Square ${target + 1}`, color: "text-slate-200" };
    };

    if (phase === 'gameover') {
        return (
            <div className="fixed inset-0 bg-slate-900 z-[300] flex flex-col items-center justify-center animate-fade-in">
                <Trophy size={100} className="text-brand-yellow mb-6 animate-bounce" />
                <h1 className="text-white text-6xl font-black mb-4">WINNER!</h1>
                <h2 className="text-brand-blue text-4xl font-bold bg-white px-8 py-4 rounded-full mb-8 shadow-xl">
                    {teamNames[currentTeamId]}
                </h2>
                <div className="flex gap-4">
                    <button onClick={onReplay} className="px-8 py-3 bg-brand-yellow text-slate-900 rounded-xl font-bold hover:scale-105 transition-transform flex items-center">
                        <RefreshCw className="mr-2" /> Play Again
                    </button>
                    <button onClick={onFinish} className="px-8 py-3 bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-600 transition-transform">
                        Exit
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={`bg-stone-100 flex flex-col ${isFullscreen ? 'h-screen' : 'h-[calc(100vh-4rem)]'} overflow-hidden relative`}>
            {/* HEADER */}
            <div className="bg-white p-4 shrink-0 z-[50] shadow-sm flex justify-between items-center gap-4 border-b border-slate-200 h-[140px]">
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowQuitConfirm(true)} className="text-slate-500 hover:text-red-600 flex items-center text-sm bg-slate-100 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors font-bold border border-slate-200"><ArrowLeft size={16} className="mr-2" /> Quit</button>
                    <h1 className="text-slate-800 font-display font-bold text-lg truncate max-w-[200px] hidden md:block opacity-80">{game.title}</h1>
                </div>
                
                {/* Current Turn Indicator */}
                <div className="flex items-center gap-4 bg-slate-100 px-6 py-2 rounded-xl">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Turn</span>
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${teamColors[currentTeamId % 6].bg}`}></div>
                        <span className="font-bold text-slate-800">{teamNames[currentTeamId]}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={() => setIsMuted(!isMuted)} className="text-slate-400 hover:text-brand-blue p-2 bg-slate-100 hover:bg-sky-50 rounded-lg transition-colors border border-slate-200">{isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>
                    <button onClick={toggleFullscreen} className="text-slate-400 hover:text-brand-blue p-2 bg-slate-100 hover:bg-sky-50 rounded-lg transition-colors border border-slate-200">{isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}</button>
                </div>
            </div>

            <div className="flex-1 p-4 flex flex-col md:flex-row items-center justify-center bg-stone-200 relative overflow-hidden gap-8">
                
                {/* SQUARE BOARD CONTAINER */}
                <div 
                    className="relative shadow-[0_20px_50px_rgba(0,0,0,0.4)] rounded-xl border-[16px] border-[#3e2723] bg-[#d7ccc8] overflow-hidden shrink-0"
                    style={{
                        width: 'min(100% - 2rem, 80vh)',
                        height: 'min(100% - 2rem, 80vh)',
                        aspectRatio: '1/1'
                    }}
                >
                    <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_40px_rgba(0,0,0,0.2)] z-20 rounded-lg"></div>

                    {/* Grid */}
                    <div className="grid grid-cols-10 grid-rows-10 h-full w-full relative z-10">
                        {Array.from({length: 100}).map((_, i) => {
                            const visualRow = Math.floor(i / 10);
                            const mathRow = 9 - visualRow; 
                            const isEvenMathRow = mathRow % 2 === 0;
                            const visualCol = i % 10;
                            
                            let boardNumber;
                            if (isEvenMathRow) {
                                boardNumber = (mathRow * 10) + visualCol + 1;
                            } else {
                                boardNumber = (mathRow * 10) + (9 - visualCol) + 1;
                            }

                            const isEvenTile = boardNumber % 2 === 0;
                            const bgClass = isEvenTile ? 'bg-[#fff8e1]' : 'bg-[#ffe0b2]';
                            const isBonus = bonusTiles.includes(i);

                            return (
                                <div key={i} className={`relative flex items-center justify-center border-[0.5px] border-black/5 ${bgClass}`}>
                                    <span className="absolute top-0.5 left-1 text-[10px] md:text-sm font-bold text-stone-500/60 font-mono z-10">{boardNumber}</span>
                                    {boardNumber === 100 && <Trophy className="text-brand-yellow w-8 h-8 drop-shadow-md z-10" />}
                                    {isBonus && (
                                        <div className="absolute inset-0 flex items-center justify-center z-0 opacity-80">
                                            <Star size="75%" className="text-yellow-400 drop-shadow-md fill-current animate-pulse" />
                                        </div>
                                    )}
                                    {boardNumber === 1 && <div className="text-stone-400 text-[10px] uppercase font-bold absolute bottom-1 z-10">Start</div>}
                                </div>
                            );
                        })}
                    </div>

                    {/* SVG Layer: Snakes & Ladders */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                        <defs>
                            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                                <feDropShadow dx="1" dy="2" stdDeviation="1" floodColor="#000" floodOpacity="0.3" />
                            </filter>
                        </defs>

                        {/* Ladders */}
                        {ladders.map((l, i) => {
                            const v = l.visuals;
                            return (
                                <g key={`ladder-${i}`} filter="url(#shadow)">
                                    <line x1={v.rail1.x1} y1={v.rail1.y1} x2={v.rail1.x2} y2={v.rail1.y2} stroke="#5d4037" strokeWidth="0.8" strokeLinecap="round" />
                                    <line x1={v.rail2.x1} y1={v.rail2.y1} x2={v.rail2.x2} y2={v.rail2.y2} stroke="#5d4037" strokeWidth="0.8" strokeLinecap="round" />
                                    {v.rungs.map((r: any, ri: number) => (
                                        <line key={ri} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke="#795548" strokeWidth="0.6" strokeLinecap="round" />
                                    ))}
                                </g>
                            );
                        })}

                        {/* Snakes */}
                        {snakes.map((s, i) => {
                            const start = getBoardCoordinates(s.start); 
                            return (
                                <g key={`snake-${i}`} filter="url(#shadow)">
                                    <path 
                                        d={s.path} 
                                        fill="none" 
                                        stroke={s.color} 
                                        strokeWidth="2.5" 
                                        strokeLinecap="round"
                                    />
                                    {/* Tongue */}
                                    <path d={s.tongue} fill="none" stroke="#ef4444" strokeWidth="0.3" strokeLinecap="round" />
                                    
                                    <path 
                                        d={s.path} 
                                        fill="none" 
                                        stroke="rgba(0,0,0,0.1)" 
                                        strokeWidth="0.5" 
                                        strokeDasharray="1,1"
                                    />
                                    <circle cx={start.x} cy={start.y} r="2.5" fill={s.color} />
                                    <circle cx={start.x - 0.8} cy={start.y - 0.8} r="0.6" fill="white" />
                                    <circle cx={start.x + 0.8} cy={start.y - 0.8} r="0.6" fill="white" />
                                    <circle cx={start.x - 0.8} cy={start.y - 0.8} r="0.2" fill="black" />
                                    <circle cx={start.x + 0.8} cy={start.y - 0.8} r="0.2" fill="black" />
                                </g>
                            );
                        })}
                    </svg>

                    {/* 2D TOKENS */}
                    {positions.map((pos, i) => {
                        const coords = getBoardCoordinates(pos);
                        const jitterX = (i % 2) * 3 - 1.5; 
                        const jitterY = (Math.floor(i / 2)) * 3 - 1.5;
                        
                        return (
                            <div 
                                key={`player-${i}`}
                                className={`absolute w-8 h-8 rounded-full z-30 transition-all duration-500 ease-in-out flex items-center justify-center font-bold text-sm
                                    border-2 border-white`}
                                style={{ 
                                    left: `calc(${coords.x}% + ${jitterX}px)`, 
                                    top: `calc(${coords.y}% + ${jitterY}px)`,
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: i === currentTeamId ? 40 : 30,
                                    background: teamColors[i % teamColors.length].grad,
                                    color: 'white',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.4), inset 0 2px 3px rgba(255,255,255,0.6), inset 0 -2px 3px rgba(0,0,0,0.2)'
                                }}
                            >
                                <span className="drop-shadow-sm">{i + 1}</span>
                            </div>
                        );
                    })}
                </div>

                {/* RIGHT SIDE (Controls) */}
                <div className="w-full md:w-80 flex flex-col justify-center gap-6">
                    <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-100 text-center min-h-[300px] flex flex-col items-center justify-center">
                        
                        {phase === 'setup' && (
                            <div className="animate-fade-in w-full">
                                <h3 className="font-display font-bold text-xl text-slate-800 mb-4">Turn Order</h3>
                                <div className="space-y-2 mb-6">
                                    {turnOrder.map((teamIdx, i) => (
                                        <div key={i} className="flex items-center p-2 bg-slate-50 rounded-lg border border-slate-200">
                                            <span className="font-bold text-slate-400 mr-3">{i+1}.</span>
                                            <div className={`w-3 h-3 rounded-full mr-2 ${teamColors[teamIdx % 6].bg}`}></div>
                                            <span className="font-bold text-slate-700">{teamNames[teamIdx]}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-3">
                                    <button onClick={shuffleTeams} className="w-full py-3 border-2 border-slate-200 rounded-xl font-bold text-slate-600 hover:border-brand-blue hover:text-brand-blue transition-colors flex items-center justify-center">
                                        <Shuffle size={18} className="mr-2" /> Randomize
                                    </button>
                                    <button onClick={() => setPhase('roll')} className="w-full py-3 bg-brand-blue text-white rounded-xl font-bold shadow-lg hover:bg-sky-600 transition-all flex items-center justify-center">
                                        <Play size={18} className="mr-2" /> Start Game
                                    </button>
                                </div>
                            </div>
                        )}

                        {(phase === 'roll' || phase === 'moving') && (
                            <div className="flex flex-col items-center w-full animate-fade-in">
                                <h3 className="text-xl font-bold text-slate-700 mb-2">{teamNames[currentTeamId]}'s Turn</h3>
                                <div className="w-full h-40 relative mb-4">
                                    <Canvas shadows camera={{ position: [0, 0, 4], fov: 45 }}>
                                        <ambientLight intensity={0.8} />
                                        <spotLight position={[5, 10, 5]} angle={0.5} penumbra={1} intensity={1} castShadow />
                                        <Environment preset="studio" />
                                        <Suspense fallback={null}>
                                            <Dice3D rolling={isDiceRolling} result={diceValue} onLand={handleDiceLand} />
                                            <ContactShadows position={[0, -1.2, 0]} opacity={0.4} scale={5} blur={2} far={2} />
                                        </Suspense>
                                    </Canvas>
                                </div>
                                
                                {!isDiceRolling && phase === 'roll' && (
                                    <button 
                                        onClick={rollDice}
                                        className="w-full py-4 bg-brand-yellow text-slate-900 rounded-xl font-bold shadow-lg hover:scale-105 transition-transform animate-bounce flex items-center justify-center text-xl"
                                    >
                                        <Play size={24} className="mr-2" /> Roll Dice
                                    </button>
                                )}
                                
                                {isDiceRolling && (
                                    <div className="text-slate-400 font-bold animate-pulse mt-2">Rolling...</div>
                                )}
                            </div>
                        )}
                        
                        {phase === 'question' && (
                            <div className="animate-fade-in">
                                <HelpCircle size={48} className="text-brand-blue mx-auto mb-4 animate-bounce" />
                                <h3 className="text-xl font-bold text-slate-700 mb-2">Question Time!</h3>
                                <p className="text-slate-500 text-sm">Answer correctly to move {diceValue} spaces.</p>
                            </div>
                        )}

                        {phase === 'ladder-snake' && (
                            <div className="text-center animate-fade-in">
                                <AlertTriangle size={64} className="text-orange-500 mx-auto mb-4 animate-pulse" />
                                <h3 className="text-xl font-bold text-slate-800">{statusMessage}</h3>
                            </div>
                        )}

                        {phase === 'turn-complete' && (
                            <div className="text-center animate-fade-in">
                                <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-700 mb-6">Turn Complete</h3>
                                <button 
                                    onClick={nextTurn}
                                    className="w-full px-8 py-4 bg-brand-blue text-white rounded-xl font-bold shadow-lg hover:bg-sky-600 transition-all flex items-center justify-center text-lg"
                                >
                                    Next Player <ArrowRight size={20} className="ml-2" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* QUESTION MODAL */}
            {phase === 'question' && currentQuestion && isQuestionVisible && (
                <div className="fixed inset-0 z-[200] flex flex-col items-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in" style={{ paddingTop: '160px' }}>
                    <div className="w-[75vw] aspect-[16/9] max-h-[70vh] [perspective:1000px] relative">
                        <button 
                            onClick={() => setIsQuestionVisible(false)}
                            className="absolute -top-12 right-0 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-bold backdrop-blur-md flex items-center z-[210] transition-colors"
                        >
                            <Eye size={18} className="mr-2" /> Peek at Board
                        </button>

                        <div className={`relative w-full h-full transition-all duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                            {/* FRONT */}
                            <div className={`absolute inset-0 [backface-visibility:hidden] rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full bg-white ${isFlipped ? 'pointer-events-none' : ''}`}>
                                <div className="bg-brand-blue text-white p-4 flex justify-between items-center h-20 flex-shrink-0">
                                    <div className="font-bold text-xl opacity-90">Question for {teamNames[currentTeamId]}</div>
                                    <div className={`font-bold text-xl ${getTargetStatus().color}`}>{getTargetStatus().text}</div>
                                </div>
                                <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-8 bg-white">
                                    <div className={`font-display font-bold text-slate-800 leading-tight text-center ${getFontSizeClass(currentQuestion.question)}`}>
                                        {currentQuestion.question}
                                    </div>
                                    {currentQuestion.options && currentQuestion.options.length > 0 && !isFlipped && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-8 max-w-2xl">
                                            {currentQuestion.options.map((opt, i) => (
                                                <button key={i} onClick={() => handleMcSelect(opt)} className="p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-brand-yellow hover:border-yellow-400 hover:text-slate-900 transition-all text-center shadow-sm text-xl md:text-2xl h-full min-h-[80px] flex items-center justify-center">
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className={`h-24 flex items-center justify-between px-8 relative flex-shrink-0 transition-colors duration-300 ${isTimesUp ? 'bg-red-600' : 'bg-gradient-to-r from-brand-blue to-sky-500'}`}>
                                    {options.timerSeconds > 0 && timeLeft > 0 && !isTimesUp && (
                                        <div className="absolute inset-0 bg-black/10 flex items-center justify-start pointer-events-none">
                                            <div className="h-full bg-white/20 transition-all duration-1000" style={{ width: `${(timeLeft / options.timerSeconds) * 100}%` }} />
                                        </div>
                                    )}
                                    {(!currentQuestion.options || currentQuestion.options.length === 0) && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleFlip(); }}
                                            className="bg-white text-brand-blue px-10 py-3 rounded-full font-bold text-2xl shadow-lg hover:scale-105 transition-transform flex items-center relative z-50"
                                        >
                                            Reveal Answer
                                        </button>
                                    )}
                                    {options.timerSeconds > 0 && (
                                        <div className="text-white font-mono font-bold text-3xl opacity-90 flex items-center pointer-events-none absolute left-1/2 -translate-x-1/2">
                                            {isTimesUp ? <span className="animate-pulse font-black drop-shadow-md">TIME'S UP!</span> : <><Clock size={28} className="mr-3" /> {timeLeft}</>}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* BACK */}
                            <div className={`absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full bg-slate-50 ${!isFlipped ? 'pointer-events-none' : ''}`}>
                                <div className="bg-slate-200 text-slate-600 p-4 flex justify-between items-center h-20 flex-shrink-0">
                                    <div className="font-bold text-xl opacity-80">Answer</div>
                                </div>
                                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white text-center">
                                    {currentQuestion.options && mcResult && (
                                        <div className="mb-6 animate-bounce">
                                            {mcResult === 'correct' ? (
                                                <div className="flex flex-col items-center text-green-500"><CheckCircle size={64} className="mb-2" /><h2 className="text-4xl font-black">CORRECT!</h2></div>
                                            ) : (
                                                <div className="flex flex-col items-center text-red-500"><XCircle size={64} className="mb-2" /><h2 className="text-4xl font-black">INCORRECT</h2></div>
                                            )}
                                        </div>
                                    )}
                                    <div className={`font-display font-bold text-slate-800 leading-tight whitespace-pre-wrap ${getFontSizeClass(currentQuestion.answer)}`}>
                                        {currentQuestion.answer}
                                    </div>
                                </div>
                                <div className="h-24 flex gap-0 flex-shrink-0">
                                    {currentQuestion.options ? (
                                        <button 
                                            disabled={flipLock}
                                            onClick={() => handleAnswer(mcResult === 'correct')} 
                                            className={`flex-1 text-white font-bold text-2xl transition-colors ${mcResult === 'correct' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} ${flipLock ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            Continue
                                        </button>
                                    ) : (
                                        <>
                                            <button 
                                                disabled={flipLock}
                                                onClick={() => handleAnswer(false)} 
                                                className={`flex-1 bg-red-500 text-white font-bold text-2xl hover:bg-red-600 transition-colors border-t-4 border-red-700 active:border-t-0 ${flipLock ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                Wrong
                                            </button>
                                            <button 
                                                disabled={flipLock}
                                                onClick={() => handleAnswer(true)} 
                                                className={`flex-1 bg-green-500 text-white font-bold text-2xl hover:bg-green-600 transition-colors border-t-4 border-green-700 active:border-t-0 ${flipLock ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                Correct
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* RESTORE MODAL BUTTON */}
            {phase === 'question' && !isQuestionVisible && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[250] animate-bounce">
                    <button 
                        onClick={() => setIsQuestionVisible(true)}
                        className="bg-brand-blue text-white px-8 py-4 rounded-full font-bold shadow-2xl flex items-center text-xl border-4 border-white"
                    >
                        <EyeOff size={24} className="mr-3" /> Show Question
                    </button>
                </div>
            )}

            {showQuitConfirm && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white text-slate-900 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl border border-slate-100">
                        <h2 className="text-2xl font-bold mb-2">Quit Game?</h2>
                        <p className="text-slate-500 mb-6">Progress will be lost.</p>
                        <div className="flex space-x-4">
                            <button onClick={() => setShowQuitConfirm(false)} className="flex-1 py-3 bg-slate-100 font-bold rounded-lg hover:bg-slate-200">Cancel</button>
                            <button onClick={() => { setShowQuitConfirm(false); onBack(); }} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600">Quit</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};