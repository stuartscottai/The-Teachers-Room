
import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { RoundedBox, Environment, ContactShadows, Float, Html } from '@react-three/drei';
import * as THREE from 'three';
import { GeneratedGame, GameRunOptions, GeneratedQuestion } from '../../types';
import { playSound } from '../../utils/gameUtils';
import { ArrowLeft, HelpCircle, AlertTriangle, Trophy, RefreshCw, CheckCircle, XCircle, Clock, Play, Eye, EyeOff, ArrowRight, Maximize2, Minimize2, Volume2, VolumeX, Shuffle, Star, ChevronRight, ChevronLeft } from 'lucide-react';

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

    const face6: [number, number, number][] = [
        [-0.25, 0.25, 0], [0.25, 0.25, 0],
        [-0.25, 0, 0], [0.25, 0, 0],
        [-0.25, -0.25, 0], [0.25, -0.25, 0]
    ];
    const face2: [number, number, number][] = [
        [-0.25, -0.25, 0], [0.25, 0.25, 0]
    ];
    const face5: [number, number, number][] = [
        [-0.25, -0.25, 0], [0.25, 0.25, 0],
        [-0.25, 0.25, 0], [0.25, -0.25, 0],
        [0, 0, 0]
    ];
    const face3: [number, number, number][] = [
        [-0.25, -0.25, 0], [0, 0, 0], [0.25, 0.25, 0]
    ];
    const face4: [number, number, number][] = [
        [-0.25, -0.25, 0], [0.25, 0.25, 0],
        [-0.25, 0.25, 0], [0.25, -0.25, 0]
    ];

    return (
        <group>
            {/* Face 1 (Front / Z+) */}
            <group position={[0, 0, PIP_OFFSET]}>
                <Pip position={[0, 0, 0]} />
            </group>
            {/* Face 6 (Back / Z-) */}
            <group position={[0, 0, -PIP_OFFSET]} rotation={[0, Math.PI, 0]}>
                {face6.map((position, idx) => (
                    <Pip key={`f6-${idx}`} position={position} />
                ))}
            </group>
            {/* Face 2 (Top / Y+) */}
            <group position={[0, PIP_OFFSET, 0]} rotation={[-Math.PI/2, 0, 0]}>
                {face2.map((position, idx) => (
                    <Pip key={`f2-${idx}`} position={position} />
                ))}
            </group>
            {/* Face 5 (Bottom / Y-) */}
            <group position={[0, -PIP_OFFSET, 0]} rotation={[Math.PI/2, 0, 0]}>
                {face5.map((position, idx) => (
                    <Pip key={`f5-${idx}`} position={position} />
                ))}
            </group>
            {/* Face 3 (Right / X+) */}
            <group position={[PIP_OFFSET, 0, 0]} rotation={[0, Math.PI/2, 0]}>
                {face3.map((position, idx) => (
                    <Pip key={`f3-${idx}`} position={position} />
                ))}
            </group>
            {/* Face 4 (Left / X-) */}
            <group position={[-PIP_OFFSET, 0, 0]} rotation={[0, -Math.PI/2, 0]}>
                {face4.map((position, idx) => (
                    <Pip key={`f4-${idx}`} position={position} />
                ))}
            </group>
        </group>
    );
};

const Dice3D = ({ rolling, result, onLand, isMoving }: { rolling: boolean, result: number, onLand: () => void, isMoving?: boolean }) => {
    const mesh = useRef<THREE.Group>(null);
    // If we mount while not rolling, we assume we are already landed (displaying result)
    const landedRef = useRef(!rolling); 
    
    const getRotation = (num: number): [number, number, number] => {
        switch(num) {
            case 1: return [0, 0, 0]; 
            case 6: return [Math.PI, 0, 0];
            case 2: return [Math.PI/2, 0, 0]; 
            case 5: return [-Math.PI/2, 0, 0];
            case 3: return [0, -Math.PI/2, 0]; 
            case 4: return [0, Math.PI/2, 0]; 
            default: return [0, 0, 0];
        }
    };

    const targetRot = useMemo(() => getRotation(result), [result]);

    useEffect(() => {
        if (rolling) {
            landedRef.current = false;
        } else {
            // Normalize rotation when rolling stops to prevent "unwinding" spins
            if (mesh.current) {
                mesh.current.rotation.x = mesh.current.rotation.x % (Math.PI * 2);
                mesh.current.rotation.y = mesh.current.rotation.y % (Math.PI * 2);
                mesh.current.rotation.z = mesh.current.rotation.z % (Math.PI * 2);
            }
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
            } else if (isMoving) {
                // Ensure rotation stays precise while jumping
                mesh.current.rotation.set(targetRot[0], targetRot[1], targetRot[2]);
            }
        }
    });

    return (
        <Float 
            speed={rolling ? 0 : (isMoving ? 12 : 2)} 
            rotationIntensity={rolling ? 0 : (isMoving ? 0.2 : 0.5)} 
            floatIntensity={rolling ? 0 : (isMoving ? 1.5 : 0.5)}
            floatingRange={isMoving ? [-0.1, 0.5] : undefined}
        >
            <group ref={mesh} rotation={rolling ? [0,0,0] : targetRot}>
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

// Helper for snake tongue
const generateTongue = (start: {x: number, y: number}) => {
    const sX = start.x;
    const sY = start.y;
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
    const [currentTurnIndex, setCurrentTurnIndex] = useState(0); 
    const [phase, setPhase] = useState<'setup' | 'roll' | 'question' | 'moving' | 'ladder-snake' | 'turn-complete' | 'gameover'>('setup');
    const [statusMessage, setStatusMessage] = useState("");
    const [diceValue, setDiceValue] = useState(1);
    const [isDiceRolling, setIsDiceRolling] = useState(false);
    
    const [questions, setQuestions] = useState<GeneratedQuestion[]>(game.questions || []);
    const [currentQuestion, setCurrentQuestion] = useState<GeneratedQuestion | null>(null);
    const [usedQuestionIds, setUsedQuestionIds] = useState<number[]>([]);
    
    const [isFlipped, setIsFlipped] = useState(false);
    const [flipLock, setFlipLock] = useState(false); 
    const [isQuestionVisible, setIsQuestionVisible] = useState(true); 
    const [mcResult, setMcResult] = useState<'correct' | 'incorrect' | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isTimesUp, setIsTimesUp] = useState(false);
    
    // Processing lock
    const [isProcessing, setIsProcessing] = useState(false);

    const [snakes, setSnakes] = useState<{start: number, end: number, path: string, tongue: string, color: string}[]>([]);
    const [ladders, setLadders] = useState<{start: number, end: number, visuals: any}[]>([]);
    const [bonusTiles, setBonusTiles] = useState<number[]>([]);
    const [bonusMap, setBonusMap] = useState<Record<number, number>>({});

    const [showQuitConfirm, setShowQuitConfirm] = useState(false);
    const [isMuted, setIsMuted] = useState(options.muted);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const [boardSize, setBoardSize] = useState<number | null>(null);
    const [diceSize, setDiceSize] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const boardWrapRef = useRef<HTMLDivElement>(null);
    const diceRowRef = useRef<HTMLDivElement>(null);
    const questionWrapRef = useRef<HTMLDivElement>(null);
    const questionTextRef = useRef<HTMLDivElement>(null);
    const [questionFontSize, setQuestionFontSize] = useState<number | null>(null);

    const teamNames = options.teamNames || Array.from({length: options.players}, (_, i) => `Team ${i+1}`);
    const currentTeamId = turnOrder[currentTurnIndex];
    const canRollDice = phase === 'roll' && !isDiceRolling;

    // SCROLL LOCK EFFECT
    useEffect(() => {
        const shouldLock = (phase === 'question' && isQuestionVisible) || phase === 'gameover';
        document.body.style.overflow = shouldLock ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [phase, isQuestionVisible]);

    useEffect(() => {
        const media = window.matchMedia('(max-width: 639px)');
        const handleChange = () => setIsMobileViewport(media.matches);
        handleChange();
        media.addEventListener('change', handleChange);
        return () => media.removeEventListener('change', handleChange);
    }, []);

    useEffect(() => {
        if (!isMobileViewport || !boardWrapRef.current) return;
        const element = boardWrapRef.current;
        const updateSize = () => {
            const rect = element.getBoundingClientRect();
            const padding = 24;
            const next = Math.floor(Math.min(rect.width, rect.height) - padding);
            const safeNext = Math.max(0, next);
            setBoardSize(prev => (prev === safeNext ? prev : safeNext));
        };
        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(element);
        window.addEventListener('resize', updateSize);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateSize);
        };
    }, [isMobileViewport]);

    useEffect(() => {
        if (!isMobileViewport || !diceRowRef.current) return;
        const element = diceRowRef.current;
        const updateSize = () => {
            const rect = element.getBoundingClientRect();
            if (rect.height <= 0 || rect.width <= 0) return;
            const sizeFromHeight = Math.floor(rect.height * 1.0);
            const sizeFromWidth = Math.floor(rect.width * 1.0);
            const next = Math.max(0, Math.min(sizeFromHeight, sizeFromWidth));
            setDiceSize(prev => (prev === next ? prev : next));
        };
        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(element);
        window.addEventListener('resize', updateSize);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateSize);
        };
    }, [isMobileViewport, phase]);

    useEffect(() => {
        if (!isMobileViewport || phase !== 'question' || !currentQuestion || !questionWrapRef.current || !questionTextRef.current) {
            return;
        }
        const wrap = questionWrapRef.current;
        const textEl = questionTextRef.current;
        const maxSize = 40;
        const minSize = 12;
        let low = minSize;
        let high = maxSize;
        let best = minSize;
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            textEl.style.fontSize = `${mid}px`;
            textEl.style.lineHeight = '1.15';
            if (textEl.scrollHeight <= wrap.clientHeight) {
                best = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        setQuestionFontSize(best);
    }, [isMobileViewport, phase, currentQuestion?.question, currentQuestion?.options?.length, isFlipped, isQuestionVisible]);

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
            const sCoords = getBoardCoordinates(l.s - 1); 
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

        // --- DYNAMIC EXCLUSION LIST ---
        const prohibitedIndices = new Set<number>();
        newLadders.forEach(l => { prohibitedIndices.add(l.start); prohibitedIndices.add(l.end); });
        newSnakes.forEach(s => { prohibitedIndices.add(s.start); prohibitedIndices.add(s.end); });
        prohibitedIndices.add(0);
        prohibitedIndices.add(99);

        if (options.enableBonuses) {
            const pool: number[] = [];
            for (let i=0; i<100; i++) {
                if (!prohibitedIndices.has(i)) pool.push(i);
            }
            // Shuffle Pool
            for (let i = pool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pool[i], pool[j]] = [pool[j], pool[i]];
            }
            
            const selectedIndices = pool.slice(0, 15);
            const map: Record<number, number> = {};
            
            // 1 Super Bonus (+20)
            if (selectedIndices.length > 0) {
                map[selectedIndices[0]] = 20;
            }
            
            // Randomly assign standard bonuses (+2, +5, +7, +10) to the rest
            const values = [2, 5, 7, 10];
            for (let i = 1; i < selectedIndices.length; i++) {
                map[selectedIndices[i]] = values[Math.floor(Math.random() * values.length)];
            }
            
            setBonusTiles(selectedIndices);
            setBonusMap(map);
        } else {
            setBonusTiles([]);
            setBonusMap({});
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
        // Crash Prevention: Handle empty question list gracefully
        if (!questions || questions.length === 0) {
            const dummyQuestion: GeneratedQuestion = {
                id: -1,
                question: "No questions loaded! Roll to continue.",
                answer: "Free Pass",
                options: [],
                points: 0,
                isBonus: false
            };
            setCurrentQuestion(dummyQuestion);
            setIsFlipped(false);
            setFlipLock(false);
            setIsQuestionVisible(true);
            setMcResult(null);
            setIsTimesUp(false);
            setIsProcessing(false);
            setTimeLeft(options.timerSeconds);
            return;
        }

        const available = questions.filter(q => !usedQuestionIds.includes(q.id));
        let q: GeneratedQuestion;
        if (available.length === 0) {
            if (!options.randomizeQuestions) {
                setUsedQuestionIds([]);
                q = questions[0];
            } else {
                q = questions[Math.floor(Math.random() * questions.length)];
            }
        } else if (!options.randomizeQuestions) {
            q = available[0];
        } else {
            q = available[Math.floor(Math.random() * available.length)];
        }
        setCurrentQuestion(q);
        setIsFlipped(false);
        setFlipLock(false);
        setIsQuestionVisible(true);
        setMcResult(null);
        setIsTimesUp(false);
        setIsProcessing(false); // Reset lock
        setTimeLeft(options.timerSeconds);
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

    const handleFlip = () => {
        setIsFlipped(true);
        setFlipLock(true);
        setTimeout(() => setFlipLock(false), 500);
    };

    const handleAnswer = (correct: boolean) => {
        if (flipLock || isProcessing) return;
        if (!currentQuestion) return;
        setIsProcessing(true);

        if (!usedQuestionIds.includes(currentQuestion.id)) {
             setUsedQuestionIds(prev => [...prev, currentQuestion.id]);
        }
        playSound(correct ? 'correct' : 'incorrect', isMuted);
        
        if (correct) {
            setTimeout(() => {
                setPhase('moving');
                movePlayer(diceValue); // Dice value is state, preserved
                setIsProcessing(false); // Can release early as phase changes
            }, 1000);
        } else {
            setTimeout(() => {
                setPhase('turn-complete');
                setIsProcessing(false);
            }, 1500);
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
        
        setTimeout(() => {
            const finalValue = Math.ceil(Math.random() * 6);
            setDiceValue(finalValue);
            setIsDiceRolling(false); 
        }, 1200); 
    };

    const handleDiceLand = () => {
        if (phase === 'roll') {
            // Delay showing the question so player can see the dice result
            setTimeout(() => {
                setPhase('question');
            }, 1000);
        }
    };

    const movePlayer = (steps: number) => {
        let currentPos = positions[currentTeamId];
        const targetPos = Math.min(99, currentPos + steps);
        
        let stepCount = 0;
        
        // Increased interval to 600ms to allow CSS transition (500ms) to complete visually
        const stepInterval = setInterval(() => {
            if (currentPos >= targetPos || currentPos >= 99) {
                 clearInterval(stepInterval);
                 setTimeout(() => checkTileEvents(currentPos), 500);
                 return;
            }

            stepCount++;
            currentPos++; // Increment logical index
            
            // Safety
            if (currentPos > 99) currentPos = 99;

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
            
            // Redundant check just in case logic drifts
            if (stepCount >= steps) {
                clearInterval(stepInterval);
                setTimeout(() => checkTileEvents(currentPos), 500);
            }
        }, 600); 
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
            const bonusVal = bonusMap[pos] || 2;
            setStatusMessage(`Bonus! +${bonusVal} Spaces`);
            setPhase('ladder-snake');
            setTimeout(() => {
                playSound('bonus', isMuted);
                const target = Math.min(99, pos + bonusVal);
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
        
        // If a bonus pushes the player to the win, trigger game over immediately
        if (end === 99) {
            setTimeout(() => {
                playSound('win', isMuted);
                setPhase('gameover');
            }, 1000);
        } else {
            setTimeout(() => setPhase('turn-complete'), 1000);
        }
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

    const getFontSizeClass = (text: string) => {
        const len = text ? text.length : 0;
        if (len < 30) return 'text-6xl md:text-8xl'; 
        if (len < 60) return 'text-5xl md:text-7xl';
        if (len < 100) return 'text-4xl md:text-6xl';
        if (len < 150) return 'text-3xl md:text-5xl';
        return 'text-2xl md:text-4xl'; 
    };

    const getOptionFontSizeClass = (text: string) => {
        const len = text ? text.length : 0;
        if (len < 20) return 'text-2xl md:text-3xl';
        if (len < 35) return 'text-xl md:text-2xl';
        if (len < 60) return 'text-lg md:text-xl';
        return 'text-base md:text-lg';
    };

    const getMobileOptionFontSize = (text: string) => {
        const len = text ? text.length : 0;
        if (len < 12) return 18;
        if (len < 20) return 16;
        if (len < 30) return 14;
        if (len < 40) return 13;
        return 12;
    };

    const getTargetStatus = () => {
        const currentPos = positions[currentTeamId];
        const target = Math.min(99, currentPos + diceValue);
        
        if (target === 99) return { text: "Winning Move!", color: "text-brand-yellow drop-shadow-lg", size: "text-2xl md:text-3xl" };
        if (snakes.some(s => s.start === target)) return { text: "Target: Snake Hazard!", color: "text-red-500 animate-pulse drop-shadow-md", size: "text-xl md:text-2xl" };
        if (ladders.some(l => l.start === target)) return { text: "Target: Ladder Boost!", color: "text-green-500 animate-bounce drop-shadow-md", size: "text-xl md:text-2xl" };
        if (bonusTiles.includes(target)) return { text: "BONUS TILE!", color: "text-purple-200 drop-shadow-[0_8px_15px_rgba(109,40,217,0.6)] animate-pulse uppercase tracking-[0.35em]", size: "text-3xl md:text-5xl" };
        return { text: `Target: Square ${target + 1}`, color: "text-slate-200", size: "text-lg md:text-xl" };
    };

    const targetStatus = getTargetStatus();
    const isBonusStatus = (statusMessage || '').toLowerCase().includes('bonus');
    const hasOptions = !!currentQuestion?.options && currentQuestion.options.length > 0;
    const timerProgress = options.timerSeconds > 0
        ? Math.max(0, Math.min(1, timeLeft / options.timerSeconds))
        : 0;

    if (phase === 'gameover') {
        return (
            <div className="fixed inset-0 bg-slate-900 z-[300] flex flex-col items-center justify-center animate-fade-in overflow-hidden px-6 text-center">
                <Trophy size={100} className="text-brand-yellow mb-6 animate-bounce" />
                <h1 className="text-white text-6xl font-black mb-4">WINNER!</h1>
                <h2 className="text-brand-blue text-4xl font-display font-bold bg-white px-8 py-4 rounded-full mb-8 shadow-xl">
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
        <div ref={containerRef} className={`bg-stone-100 flex flex-col ${isFullscreen ? 'h-[calc(var(--app-vh,1vh)*100)]' : 'h-[calc(var(--app-vh,1vh)*100-4rem)]'} overflow-hidden relative`}>
            <style>
                {`
                @keyframes bonus-pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(0.97); }
                }
                @keyframes bonus-shimmer {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 200% 50%; }
                }
                .bonus-pulse {
                    animation: bonus-pulse 2.2s ease-in-out infinite;
                    will-change: transform;
                }
                .bonus-glow {
                    box-shadow: 0 0 24px rgba(109, 40, 217, 0.45), inset 0 0 12px rgba(255, 255, 255, 0.2);
                }
                .bonus-sparkle {
                    background-image:
                        radial-gradient(circle at 20% 20%, rgba(255,255,255,0.25) 0%, transparent 55%),
                        radial-gradient(circle at 80% 30%, rgba(255,255,255,0.18) 0%, transparent 60%),
                        radial-gradient(circle at 50% 80%, rgba(255,255,255,0.12) 0%, transparent 55%);
                }
                .bonus-shine {
                    background-image:
                        linear-gradient(120deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 35%, transparent 60%),
                        linear-gradient(330deg, rgba(255,255,255,0.18) 0%, transparent 55%);
                }
                .bonus-shimmer {
                    background-size: 200% 100%;
                    animation: bonus-shimmer 2.6s linear infinite;
                }
                `}
            </style>
            {/* HEADER */}
            <div className={`bg-white shrink-0 z-[50] shadow-sm flex items-center border-b border-slate-200 ${isMobileViewport ? 'h-[70px] px-2 py-2' : 'h-[140px] p-4'}`}>
                <div className="flex items-center justify-between w-full gap-3">
                    <div className={`flex ${isMobileViewport ? 'flex-row items-center gap-2' : 'items-center gap-2'}`}>
                        <button
                            onClick={() => setShowQuitConfirm(true)}
                            className={isMobileViewport
                                ? 'w-9 h-9 rounded-xl bg-slate-100 text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 flex items-center justify-center transition-colors'
                                : 'text-slate-500 hover:text-red-600 flex items-center text-sm bg-slate-100 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors font-bold border border-slate-200'
                            }
                        >
                            <ArrowLeft size={isMobileViewport ? 18 : 16} className={isMobileViewport ? '' : 'mr-2'} />
                            {!isMobileViewport && 'Quit'}
                        </button>
                        {isMobileViewport && (
                            <button
                                onClick={() => setIsMuted(!isMuted)}
                                className="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 hover:text-brand-blue hover:bg-sky-50 border border-slate-200 flex items-center justify-center transition-colors"
                            >
                                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                            </button>
                        )}
                        {!isMobileViewport && (
                            <h1 className="text-slate-800 font-display font-bold text-lg truncate max-w-[200px] opacity-80">{game.title}</h1>
                        )}
                    </div>
                    
                    <div className="flex-1 flex items-center justify-end md:justify-center">
                        <div className={`flex items-center gap-2 bg-slate-100 ${isMobileViewport ? 'px-2 py-1 rounded-lg' : 'px-6 py-2 rounded-xl'}`}>
                            <span className={`font-bold text-slate-400 uppercase tracking-wider ${isMobileViewport ? 'text-[10px]' : 'text-xs'}`}>Current Turn</span>
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${teamColors[currentTeamId % 6].bg}`}></div>
                                <span className={`font-bold text-slate-800 ${isMobileViewport ? 'text-[11px]' : ''}`}>{teamNames[currentTeamId]}</span>
                            </div>
                        </div>
                    </div>

                    {!isMobileViewport && (
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsMuted(!isMuted)} className="text-slate-400 hover:text-brand-blue p-2 bg-slate-100 hover:bg-sky-50 rounded-lg transition-colors border border-slate-200">{isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>
                            <button onClick={toggleFullscreen} className="text-slate-400 hover:text-brand-blue p-2 bg-slate-100 hover:bg-sky-50 rounded-lg transition-colors border border-slate-200">{isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}</button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 p-2 sm:p-4 flex flex-col md:flex-row items-stretch justify-center bg-stone-200 relative overflow-hidden gap-2 sm:gap-8">
                <div className="w-full h-full flex flex-col md:flex-row gap-2 sm:gap-8 min-h-0">
                <div ref={boardWrapRef} className="flex-1 min-h-0 w-full flex items-center justify-center">
                {/* SQUARE BOARD CONTAINER */}
                <div 
                    className="relative shadow-[0_20px_50px_rgba(0,0,0,0.4)] rounded-lg sm:rounded-xl border-[10px] sm:border-[16px] border-[#3e2723] bg-[#d7ccc8] overflow-hidden shrink-0 max-w-full max-h-full"
                    style={isMobileViewport
                        ? { width: boardSize ? `${boardSize}px` : '100%', height: boardSize ? `${boardSize}px` : '100%' }
                        : { width: 'min(100% - 2rem, 80vh)', height: 'min(100% - 2rem, 80vh)', aspectRatio: '1/1' }
                    }
                >
                    <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_40px_rgba(0,0,0,0.2)] z-20 rounded-lg"></div>

                    {/* Grid */}
                    <div className="grid grid-cols-10 grid-rows-10 h-full w-full relative z-10">
                        {Array.from({length: 100}).map((_, i) => {
                            const visualRow = Math.floor(i / 10);
                            const visualCol = i % 10;
                            const mathRow = 9 - visualRow; 
                            
                            let boardNumber;
                            if (mathRow % 2 === 0) {
                                boardNumber = (mathRow * 10) + visualCol + 1;
                            } else {
                                boardNumber = (mathRow * 10) + (9 - visualCol) + 1;
                            }

                            const logicalIndex = boardNumber - 1;
                            const isEvenTile = boardNumber % 2 === 0;
                            const bgClass = isEvenTile ? 'bg-[#fff8e1]' : 'bg-[#ffe0b2]';
                            
                            // STRICT check to ensure bonus does not overlay snake/ladder start
                            const isSnakeHead = snakes.some(s => s.start === logicalIndex);
                            const isLadderBase = ladders.some(l => l.start === logicalIndex);
                            const isBonus = bonusTiles.includes(logicalIndex) && !isSnakeHead && !isLadderBase;

                            // Path Direction Indicator
                            const isRowRight = mathRow % 2 === 0;
                            const showArrow = visualCol === 0 || visualCol === 9; // Only show on edges

                            return (
                                <div key={i} className={`relative flex items-center justify-center border-[0.5px] border-black/5 ${bgClass}`}>
                                    <span className="absolute top-0.5 left-1 text-[10px] md:text-sm font-bold text-stone-500/60 font-mono z-10">{boardNumber}</span>
                                    
                                    {/* Directional Arrows for User Clarity */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                                        {isRowRight ? <ChevronRight size={32} /> : <ChevronLeft size={32} />}
                                    </div>

                                    {boardNumber === 100 && <Trophy className="text-brand-yellow w-8 h-8 drop-shadow-md z-10" />}
                                    {isBonus && (
                                        <div className="absolute inset-0 flex items-center justify-center z-0">
                                            <div className="absolute inset-0 bg-gradient-to-br from-purple-700 via-purple-600 to-indigo-700 border border-yellow-300/80 bonus-glow bonus-pulse bonus-sparkle bonus-shine rounded-[2px]" />
                                            <Star size="75%" className="text-yellow-200 drop-shadow-[0_4px_10px_rgba(250,204,21,0.6)] fill-current relative z-10" />
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

                        {snakes.map((s, i) => {
                            const start = getBoardCoordinates(s.start); 
                            return (
                                <g key={`snake-${i}`} filter="url(#shadow)">
                                    <path d={s.path} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" />
                                    <path d={s.path} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" strokeDasharray="1,1" />
                                    <circle cx={start.x} cy={start.y} r="2.5" fill={s.color} />
                                    <path d={s.tongue} fill="none" stroke="#ef4444" strokeWidth="0.3" strokeLinecap="round" />
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
                </div>

                {/* RIGHT SIDE (Controls) */}
                <div className="w-full md:flex-1 flex flex-col items-center justify-center gap-4 sm:gap-6">
                    <div className={`w-full md:max-w-[340px] bg-white rounded-2xl p-2 sm:p-6 shadow-xl border border-slate-100 text-center flex flex-col items-center justify-center overflow-hidden ${isMobileViewport ? 'h-[clamp(160px,22vh,240px)]' : 'min-h-[300px]'}`}>
                        
                        {phase === 'setup' && (
                            <div className="animate-fade-in w-full">
                                <h3 className="font-display font-bold text-sm sm:text-xl text-slate-800 mb-2 sm:mb-4">Turn Order</h3>
                                <div className={`mb-2 sm:mb-6 ${isMobileViewport ? 'grid grid-cols-3 gap-1' : 'space-y-2'}`}>
                                    {turnOrder.map((teamIdx, i) => (
                                        <div key={i} className={`flex items-center bg-slate-50 rounded-lg border border-slate-200 ${isMobileViewport ? 'px-1 py-1 text-[10px]' : 'p-2'}`}>
                                            <span className={`font-bold text-slate-400 ${isMobileViewport ? 'mr-1' : 'mr-3'}`}>{i+1}.</span>
                                            <div className={`w-2.5 h-2.5 rounded-full mr-1 ${teamColors[teamIdx % 6].bg}`}></div>
                                            <span className={`font-bold text-slate-700 ${isMobileViewport ? 'text-[10px] truncate' : ''}`}>{teamNames[teamIdx]}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className={`${isMobileViewport ? 'grid grid-cols-2 gap-2' : 'space-y-3'}`}>
                                    <button onClick={shuffleTeams} className={`w-full border-2 border-slate-200 rounded-xl font-bold text-slate-600 hover:border-brand-blue hover:text-brand-blue transition-colors flex items-center justify-center ${isMobileViewport ? 'py-1.5 text-[10px]' : 'py-3'}`}>
                                        <Shuffle size={isMobileViewport ? 12 : 18} className="mr-2" /> Randomize
                                    </button>
                                    <button onClick={() => setPhase('roll')} className={`w-full bg-brand-blue text-white rounded-xl font-bold shadow-lg hover:bg-sky-600 transition-all flex items-center justify-center ${isMobileViewport ? 'py-1.5 text-[10px]' : 'py-3 text-base sm:text-lg'}`}>
                                        <Play size={isMobileViewport ? 12 : 18} className="mr-2" /> Start Game
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* PERSISTENT DICE CONTAINER - Fix for WebGL Context Thrashing */}
                        <div className="h-full" style={{ width: '100%', display: (phase === 'roll' || phase === 'moving') ? 'block' : 'none' }}>
                            <div ref={diceRowRef} className={`w-full animate-fade-in ${isMobileViewport ? 'flex items-center justify-between gap-2 h-full' : 'flex flex-col items-center'}`}>
                                <div
                                    className={`${isMobileViewport ? 'flex-1 text-left flex flex-col justify-center' : 'text-center'}`}
                                    style={isMobileViewport && diceSize ? { minHeight: `${diceSize}px` } : undefined}
                                >
                                    <h3
                                        className={`font-bold text-slate-700 ${isMobileViewport ? '' : 'text-base sm:text-xl'} ${isMobileViewport ? 'mb-0.5' : 'mb-2'}`}
                                        style={isMobileViewport && diceSize ? { fontSize: `${Math.max(10, Math.floor(diceSize * 0.2))}px`, lineHeight: '1.1' } : undefined}
                                    >
                                        {teamNames[currentTeamId]}
                                    </h3>
                                    <div
                                        className={`text-slate-500 ${isMobileViewport ? '' : 'text-sm'}`}
                                        style={isMobileViewport && diceSize ? { fontSize: `${Math.max(9, Math.floor(diceSize * 0.14))}px`, lineHeight: '1.15' } : undefined}
                                    >
                                        {isMobileViewport ? "It's your turn" : "It's your turn"}
                                    </div>
                                </div>
                                <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => { if (canRollDice) rollDice(); }}
                                    onKeyDown={(e) => { if (canRollDice && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); rollDice(); } }}
                                    className={`${isMobileViewport ? 'relative flex items-center justify-center' : 'w-full h-32 sm:h-40'} ${canRollDice ? 'cursor-pointer' : 'cursor-default'}`}
                                    style={isMobileViewport ? { width: `${diceSize ?? 96}px`, height: `${diceSize ?? 96}px` } : undefined}
                                    aria-label={canRollDice ? 'Roll Dice' : 'Dice rolling'}
                                >
                                    <Canvas
                                        shadows
                                        camera={{ position: [0, 0, 4], fov: 45 }}
                                        children={[
                                            <ambientLight key="ambient" intensity={0.8} />,
                                            <spotLight key="spot" position={[5, 10, 5]} angle={0.5} penumbra={1} intensity={1} castShadow />,
                                            <Environment key="env" preset="studio" />,
                                            <Suspense key="suspense" fallback={null}>
                                                <Dice3D 
                                                    rolling={isDiceRolling} 
                                                    result={diceValue} 
                                                    onLand={handleDiceLand} 
                                                    isMoving={phase === 'moving'} 
                                                />
                                                <ContactShadows position={[0, -1.2, 0]} opacity={0.4} scale={5} blur={2} far={2} />
                                            </Suspense>
                                        ]}
                                    />
                                </div>
                                {!isMobileViewport && !isDiceRolling && phase === 'roll' && (
                                    <button 
                                        onClick={rollDice}
                                        className="w-full py-3 sm:py-4 bg-brand-yellow text-slate-900 rounded-xl font-bold shadow-lg hover:scale-105 transition-transform animate-bounce flex items-center justify-center text-base sm:text-xl"
                                    >
                                        <Play size={20} className="mr-2" /> Roll Dice
                                    </button>
                                )}
                                {!isMobileViewport && isDiceRolling && (
                                    <div className="text-slate-400 font-bold animate-pulse mt-2">Rolling...</div>
                                )}
                            </div>
                        </div>
                        
                        {phase === 'question' && (
                            <div className="animate-fade-in">
                                <HelpCircle size={48} className="text-brand-blue mx-auto mb-4 animate-bounce" />
                                <h3 className="text-xl font-bold text-slate-700 mb-2">Question Time!</h3>
                                <div className="bg-sky-50 text-sky-800 px-4 py-2 rounded-lg font-black text-2xl mb-2 shadow-sm border border-sky-100">
                                    You rolled a {diceValue}
                                </div>
                                <p className="text-slate-500 text-sm">Answer correctly to move.</p>
                            </div>
                        )}

                        {phase === 'ladder-snake' && (
                            <div className="text-center animate-fade-in">
                                <AlertTriangle size={64} className="text-orange-500 mx-auto mb-4 animate-pulse" />
                                <h3 className={`font-bold ${isBonusStatus ? 'text-5xl md:text-6xl text-brand-yellow drop-shadow-xl uppercase tracking-[0.3em]' : 'text-xl text-slate-800'}`}>
                                    {statusMessage}
                                </h3>
                            </div>
                        )}

                        {phase === 'turn-complete' && (
                            <div className="text-center animate-fade-in">
                                <CheckCircle size={isMobileViewport ? 45 : 80} className="text-green-500 mx-auto mb-3 sm:mb-4" />
                                <h3 className={`font-bold text-slate-700 ${isMobileViewport ? 'text-[14px] mb-3' : 'text-2xl mb-7'}`}>Turn Complete</h3>
                                <button 
                                    onClick={nextTurn}
                                    className={`w-full bg-brand-blue text-white rounded-xl font-bold shadow-lg hover:bg-sky-600 transition-all flex items-center justify-center ${isMobileViewport ? 'py-2 text-[12px]' : 'px-10 py-5 text-lg'}`}
                                >
                                    Next Player <ArrowRight size={isMobileViewport ? 18 : 24} className="ml-2" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                </div>
            </div>

            {/* QUESTION MODAL */}
            {phase === 'question' && currentQuestion && isQuestionVisible && (
                <div
                    className={`${isMobileViewport
                        ? 'fixed inset-x-0 bottom-0 top-[calc(4rem+env(safe-area-inset-top))] z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-3 animate-fade-in overflow-hidden'
                        : 'fixed inset-0 z-[200] flex flex-col items-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in'
                    }`}
                    style={isMobileViewport ? undefined : { paddingTop: '160px' }}
                >
                    <div className={`${isMobileViewport
                        ? 'w-full max-w-[420px] h-full max-h-full sm:max-w-[560px] sm:h-full sm:max-h-[90vh] md:max-w-6xl md:h-auto md:max-h-full md:aspect-[16/9] [perspective:1000px] relative'
                        : 'w-[75vw] aspect-[16/9] max-h-[70vh] [perspective:1000px] relative'
                    }`}>
                        <button 
                            onClick={() => setIsQuestionVisible(false)}
                            className="absolute -top-12 right-0 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-bold backdrop-blur-md flex items-center z-[210] transition-colors"
                        >
                            <Eye size={18} className="mr-2" /> Peek at Board
                        </button>

                        <div className={`relative w-full h-full transition-all duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                            {/* FRONT */}
                            <div className={`absolute inset-0 [backface-visibility:hidden] rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full bg-white ${isFlipped ? 'pointer-events-none' : ''}`}>
                                <div className="bg-brand-blue text-white p-3 sm:p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 h-[clamp(72px,12vh,96px)] sm:h-20 md:h-24 flex-shrink-0">
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                                        <div className="font-bold text-sm sm:text-xl opacity-90">Question for {teamNames[currentTeamId]}</div>
                                        <div className="bg-white/20 text-white px-3 py-1 rounded-full text-xs sm:text-sm font-bold border border-white/30">You rolled a {diceValue}</div>
                                    </div>
                                    <div className={`font-bold ${targetStatus.size} ${targetStatus.color}`}>
                                        {targetStatus.text}
                                    </div>
                                </div>
                                <div className={`bg-white flex-grow w-full flex flex-col px-0 ${hasOptions ? 'pt-3 sm:pt-4 md:pt-6 pb-0' : 'py-3 sm:py-4 md:py-6'} relative overflow-hidden z-0`}>
                                    <div className="flex flex-col flex-1 min-h-0">
                                        <div ref={questionWrapRef} className={`w-full flex-1 min-h-0 flex flex-col items-center overflow-hidden ${hasOptions ? 'justify-start mb-1 sm:mb-3' : 'justify-center'}`}>
                                        <div
                                            ref={questionTextRef}
                                            style={questionFontSize && isMobileViewport ? { fontSize: `${questionFontSize}px`, lineHeight: '1.15' } : undefined}
                                            className={`font-display font-bold text-slate-800 leading-tight text-center w-full whitespace-pre-wrap break-words ${getFontSizeClass(currentQuestion.question)}`}
                                        >
                                            {currentQuestion.question}
                                        </div>
                                    </div>
                                        {hasOptions && !isFlipped && (
                                            <div className="w-full flex-1 min-h-0 mt-2 sm:mt-4 relative z-10 overflow-hidden">
                                                <div className="grid grid-cols-2 md:grid-cols-2 gap-0 w-full h-full auto-rows-fr">
                                                    {(() => {
                                                        const longestText = currentQuestion.options!.reduce((a, b) => a.length > b.length ? a : b, '');
                                                        const uniformSize = getOptionFontSizeClass(longestText);
                                                        const mobileFontSize = isMobileViewport ? getMobileOptionFontSize(longestText) : null;
                                                        return currentQuestion.options!.map((opt, i) => (
                                                            <button
                                                                key={i}
                                                                onClick={() => handleMcSelect(opt)}
                                                                style={mobileFontSize ? { fontSize: `${mobileFontSize}px`, lineHeight: '1.2' } : undefined}
                                                                className={`p-3 sm:p-4 md:p-5 bg-slate-50 border-2 border-slate-200 rounded-none font-bold text-slate-700 sm:hover:bg-brand-yellow sm:hover:border-yellow-400 sm:hover:text-slate-900 transition-all text-center flex items-center justify-center w-full h-full whitespace-normal break-words focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ${uniformSize}`}
                                                            >
                                                                {opt}
                                                            </button>
                                                        ));
                                                    })()}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className={`flex flex-col relative flex-shrink-0 z-50 bg-white ${hasOptions ? 'h-[clamp(38px,6.5vh,46px)] sm:h-[clamp(32px,5.5vh,40px)] px-0 py-0' : 'h-[clamp(76px,12vh,104px)] sm:h-[clamp(88px,14vh,120px)] px-3 sm:px-4 md:px-8 py-1 sm:py-2 md:py-0'}`}>
                                    {options.timerSeconds > 0 && (
                                        <div className={`relative ${hasOptions ? 'h-full' : 'h-[clamp(38px,6.5vh,46px)] sm:h-[clamp(32px,5.5vh,40px)] -mx-3 sm:-mx-4 md:-mx-8'} bg-white overflow-hidden flex items-center justify-start pointer-events-none`}>
                                            {!isTimesUp && (
                                                <div 
                                                    className="absolute inset-y-0 left-0 bg-brand-blue transition-all duration-1000"
                                                    style={{ width: `${timerProgress * 100}%` }}
                                                />
                                            )}
                                            <div className="absolute inset-0 flex items-center justify-center text-sm sm:text-lg md:text-xl font-black text-slate-900 tracking-wider">
                                                {isTimesUp ? "TIME'S UP!" : (
                                                    <><Clock size={18} className="mr-2" /> {timeLeft}</>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {!hasOptions && (
                                        <div className="w-full flex-1 flex items-center justify-center py-2 sm:py-3">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleFlip(); }}
                                                className="bg-brand-blue text-white px-10 py-3 rounded-full font-bold text-2xl shadow-lg hover:scale-105 transition-transform flex items-center relative z-50"
                                            >
                                                Reveal Answer
                                            </button>
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
                                    {currentQuestion.options && currentQuestion.options.length > 0 ? (
                                        <button 
                                            disabled={flipLock || isProcessing}
                                            onClick={() => handleAnswer(mcResult === 'correct')} 
                                            className={`flex-1 text-white font-bold text-2xl transition-colors ${mcResult === 'correct' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} ${flipLock ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            Continue
                                        </button>
                                    ) : (
                                        <>
                                            <button 
                                                disabled={flipLock || isProcessing}
                                                onClick={() => handleAnswer(false)} 
                                                className={`flex-1 bg-red-500 text-white font-bold text-2xl hover:bg-red-600 transition-colors border-t-4 border-red-700 active:border-t-0 ${flipLock ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                Wrong
                                            </button>
                                            <button 
                                                disabled={flipLock || isProcessing}
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
