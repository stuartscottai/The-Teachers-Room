
import React, { useState, useEffect, useRef, useMemo, Suspense, useLayoutEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { RoundedBox, Environment, ContactShadows, Float, Html, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { GeneratedGame, GameRunOptions, GeneratedQuestion, PracticeReviewItem, SnakesLaddersBonusType } from '../../types';
import { playSound } from '../../utils/gameUtils';
import { resolveGameQuestionImageUrl } from '../../utils/gameImage';
import { WinnerCeremonyHero, WinnerCeremonyStandingsTable } from './shared/WinnerCeremonyHero';
import { PracticeReviewSummary } from './shared/PracticeReviewSummary';
import { CozyChessRoomModel } from './models/CozyChessRoomModel';
import { StarOrbModel } from './models/StarOrbModel';
import { ArrowLeft, HelpCircle, AlertTriangle, CheckCircle, XCircle, Clock, Play, Eye, EyeOff, ArrowRight, Maximize2, Minimize2, Volume2, VolumeX, Shuffle, X, Flag, Gift, Info } from 'lucide-react';

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

const BOARD_SURFACE_Y = 0.21;
const getSnakeRadius = (t: number, thicknessScale = 1) => (0.025 + 0.24 * Math.pow(1 - t, 0.56)) * thicknessScale;

const DEFAULT_SNAKES_LADDERS_BONUSES: SnakesLaddersBonusType[] = [
    'move-forward',
    'move-five',
    'swap-positions',
    'extra-turn',
    'skip-next',
    'move-rival-back',
    'send-rival-to-snake',
];
const OPPONENT_BONUS_TYPES = new Set<SnakesLaddersBonusType>([
    'swap-positions',
    'skip-next',
    'move-rival-back',
    'send-rival-to-snake',
]);
const FORWARD_BONUS_VALUES = [2, 5, 7, 10];

interface SnakesLaddersBonusEffect {
    type: SnakesLaddersBonusType;
    amount?: number;
}

interface PendingBonusChoice {
    effect: SnakesLaddersBonusEffect;
    origin: number;
    teamId: number;
}

type CollectedBonusCard = PendingBonusChoice;

interface BonusCardDetails {
    label: string;
    title: string;
    story: string;
    action: string;
}

interface NextTurnResolution {
    nextTurnIndex: number;
    remainingSkips: Record<number, number>;
    skippedTeamIds: number[];
}

const resolveNextPlayableTurn = (
    currentTurnIndex: number,
    turnOrder: number[],
    skipTurnCounts: Record<number, number>,
): NextTurnResolution => {
    const remainingSkips = { ...skipTurnCounts };
    const skippedTeamIds: number[] = [];
    let nextTurnIndex = currentTurnIndex;

    if (!turnOrder.length) return { nextTurnIndex, remainingSkips, skippedTeamIds };

    for (let attempt = 0; attempt < turnOrder.length; attempt++) {
        nextTurnIndex = (nextTurnIndex + 1) % turnOrder.length;
        const nextTeamId = turnOrder[nextTurnIndex];
        if ((remainingSkips[nextTeamId] || 0) > 0) {
            remainingSkips[nextTeamId] -= 1;
            skippedTeamIds.push(nextTeamId);
            continue;
        }
        break;
    }

    return { nextTurnIndex, remainingSkips, skippedTeamIds };
};

const getBonusCardDetails = (effect: SnakesLaddersBonusEffect): BonusCardDetails => {
    switch (effect.type) {
        case 'move-forward': {
            const amount = effect.amount || 2;
            return {
                label: 'Mystic discovery',
                title: 'Speed Boost',
                story: 'You find a sparkling magic potion hidden beside the path.',
                action: `Move forward ${amount} space${amount === 1 ? '' : 's'}.`,
            };
        }
        case 'move-five':
            return {
                label: 'Secret passage',
                title: 'Choose Your Path',
                story: 'A shimmering map reveals a shortcut that only you can see.',
                action: 'Choose any square up to 5 spaces ahead or back.',
            };
        case 'swap-positions':
            return {
                label: 'Mirror magic',
                title: 'Trade Places',
                story: 'A mischievous mirror makes two playing pieces change places.',
                action: 'Swap positions with another team.',
            };
        case 'extra-turn':
            return {
                label: 'Lucky charm',
                title: 'Another Adventure',
                story: 'You discover a lucky charm glowing beneath the board.',
                action: 'Roll again and answer another question.',
            };
        case 'skip-next':
            return {
                label: 'Sleepy spell',
                title: 'Miss A Turn',
                story: 'A cloud of sleepy purple dust drifts towards the next team.',
                action: 'The next team misses one turn.',
            };
        case 'move-rival-back':
            return {
                label: 'Potion mishap',
                title: 'Rival Rewind',
                story: 'Your potion fizzes over and sends a rival stumbling backwards.',
                action: 'Choose a rival to move back 5 spaces.',
            };
        case 'send-rival-to-snake':
            return {
                label: 'Snake charmer',
                title: 'Serpent Summons',
                story: 'A distant flute calls the nearest snake into action.',
                action: 'Choose a rival to send down the nearest snake behind them.',
            };
    }
};

const getBoardWorldPosition = (index: number): [number, number, number] => {
    const safeIndex = Math.max(0, Math.min(99, index));
    const row = Math.floor(safeIndex / 10);
    const col = row % 2 === 0 ? safeIndex % 10 : 9 - (safeIndex % 10);
    return [col - 4.5, BOARD_SURFACE_Y, 4.5 - row];
};

const PRINTED_BOARD_TEXTURE = '/assets/snakes-ladders-onyx-board.png';

const BonusCardOrbPreview = ({ reducedMotion }: { reducedMotion: boolean }) => (
    <div className="snl-bonus-card-orb" aria-hidden="true">
        <svg
            viewBox="0 0 160 144"
            className={reducedMotion ? '' : 'snl-bonus-card-orb-float'}
            focusable="false"
        >
            <defs>
                <radialGradient id="snl-card-orb-shell" cx="35%" cy="24%" r="75%">
                    <stop offset="0" stopColor="#f2c9ff" stopOpacity=".92" />
                    <stop offset=".38" stopColor="#9b4bbb" stopOpacity=".82" />
                    <stop offset="1" stopColor="#28102f" stopOpacity=".96" />
                </radialGradient>
                <linearGradient id="snl-card-orb-star" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#fff7df" />
                    <stop offset=".42" stopColor="#e8b8ec" />
                    <stop offset="1" stopColor="#8d4f9c" />
                </linearGradient>
                <filter id="snl-card-orb-shadow" x="-40%" y="-40%" width="180%" height="190%">
                    <feDropShadow dx="0" dy="9" stdDeviation="7" floodColor="#09010d" floodOpacity=".72" />
                </filter>
                <filter id="snl-card-orb-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3.5" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
            </defs>
            <ellipse cx="80" cy="127" rx="39" ry="8" fill="#09010c" opacity=".58" />
            <g filter="url(#snl-card-orb-shadow)">
                <path
                    d="M80 10 C104 8 129 22 137 45 C146 70 137 101 115 118 C95 133 62 132 40 116 C18 99 10 70 21 45 C31 21 55 12 80 10Z"
                    fill="url(#snl-card-orb-shell)"
                    stroke="#e6b8f1"
                    strokeOpacity=".56"
                    strokeWidth="2"
                />
                <path
                    d="M80 29 L91 58 L122 59 L97 78 L105 108 L80 91 L55 108 L63 78 L38 59 L69 58Z"
                    fill="url(#snl-card-orb-star)"
                    opacity=".88"
                    filter="url(#snl-card-orb-glow)"
                />
                <path d="M42 35 C55 19 79 16 96 21 C70 28 47 49 34 73 C31 57 34 44 42 35Z" fill="#ffffff" opacity=".34" />
                <path d="M123 41 C134 60 129 83 116 99" fill="none" stroke="#f5d8ff" strokeWidth="5" strokeLinecap="round" opacity=".24" />
            </g>
        </svg>
    </div>
);

const PrintedBoardSurface = () => {
    const texture = useTexture(PRINTED_BOARD_TEXTURE);

    useEffect(() => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 16;
        texture.needsUpdate = true;
    }, [texture]);

    return (
        <mesh position={[0, BOARD_SURFACE_Y + 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[10.9, 10.9]} />
            <meshPhysicalMaterial
                map={texture}
                color="#ffffff"
                metalness={0}
                roughness={0.78}
                clearcoat={0.045}
                clearcoatRoughness={0.94}
                envMapIntensity={0.16}
                polygonOffset
                polygonOffsetFactor={-1}
            />
        </mesh>
    );
};

useTexture.preload(PRINTED_BOARD_TEXTURE);

const CylinderBetween = ({ start, end, radius, color, roughness = 0.68, metalness = 0.02 }: { start: THREE.Vector3; end: THREE.Vector3; radius: number; color: string; roughness?: number; metalness?: number }) => {
    const { midpoint, length, quaternion } = useMemo(() => {
        const direction = end.clone().sub(start);
        const midpointValue = start.clone().add(end).multiplyScalar(0.5);
        const quaternionValue = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            direction.clone().normalize()
        );
        return { midpoint: midpointValue, length: direction.length(), quaternion: quaternionValue };
    }, [start.x, start.y, start.z, end.x, end.y, end.z]);

    return (
        <mesh position={midpoint} quaternion={quaternion} castShadow receiveShadow>
            <cylinderGeometry args={[radius, radius, length, 20]} />
            <meshPhysicalMaterial color={color} roughness={roughness} metalness={metalness} clearcoat={0.08} clearcoatRoughness={0.7} />
        </mesh>
    );
};

const Ladder3D = ({ startIndex, endIndex }: { startIndex: number; endIndex: number }) => {
    const parts = useMemo(() => {
        const start = new THREE.Vector3(...getBoardWorldPosition(startIndex));
        const end = new THREE.Vector3(...getBoardWorldPosition(endIndex));
        start.y = end.y = BOARD_SURFACE_Y + 0.065;
        const direction = end.clone().sub(start);
        const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize().multiplyScalar(0.2);
        const rail1 = { start: start.clone().add(perpendicular), end: end.clone().add(perpendicular) };
        const rail2 = { start: start.clone().sub(perpendicular), end: end.clone().sub(perpendicular) };
        const rungCount = Math.max(3, Math.floor(direction.length() / 0.58));
        const rungs = Array.from({ length: rungCount }, (_, i) => {
            const t = (i + 0.5) / rungCount;
            const center = start.clone().lerp(end, t);
            return {
                start: center.clone().add(perpendicular.clone().multiplyScalar(1.18)),
                end: center.clone().sub(perpendicular.clone().multiplyScalar(1.18)),
            };
        });
        return { rail1, rail2, rungs };
    }, [startIndex, endIndex]);

    return (
        <group>
            <CylinderBetween {...parts.rail1} radius={0.07} color="#4b2a1d" />
            <CylinderBetween {...parts.rail2} radius={0.07} color="#4b2a1d" />
            {[parts.rail1.start, parts.rail1.end, parts.rail2.start, parts.rail2.end].map((point, index) => (
                <mesh key={`cap-${index}`} position={point} castShadow>
                    <sphereGeometry args={[0.073, 18, 12]} />
                    <meshPhysicalMaterial color="#5b3322" metalness={0.02} roughness={0.72} clearcoat={0.06} />
                </mesh>
            ))}
            {parts.rungs.map((rung, index) => (
                <CylinderBetween key={index} {...rung} radius={0.046} color="#a36b3f" />
            ))}
        </group>
    );
};

const createTaperedSnakeGeometry = (curve: THREE.CatmullRomCurve3, thicknessScale: number) => {
    const tubularSegments = 48;
    const radialSegments = 12;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let segment = 0; segment <= tubularSegments; segment++) {
        const t = segment / tubularSegments;
        const center = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t).setY(0).normalize();
        const lateral = new THREE.Vector3(-tangent.z, 0, tangent.x);
        const radius = getSnakeRadius(t, thicknessScale);
        const verticalRadius = radius * 0.42;
        for (let side = 0; side <= radialSegments; side++) {
            const angle = (side / radialSegments) * Math.PI * 2;
            const vertex = center.clone()
                .add(lateral.clone().multiplyScalar(Math.cos(angle) * radius))
                .add(new THREE.Vector3(0, Math.sin(angle) * verticalRadius, 0));
            positions.push(vertex.x, vertex.y, vertex.z);
            uvs.push(t, side / radialSegments);
        }
    }

    for (let segment = 0; segment < tubularSegments; segment++) {
        for (let side = 0; side < radialSegments; side++) {
            const a = (radialSegments + 1) * segment + side;
            const b = (radialSegments + 1) * (segment + 1) + side;
            const c = b + 1;
            const d = a + 1;
            indices.push(a, b, d, b, c, d);
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
};

const SNAKE_HEAD_GEOMETRY = (() => {
    const geometry = new THREE.SphereGeometry(1, 32, 20);
    const position = geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let index = 0; index < position.count; index++) {
        const x = position.getX(index);
        const y = position.getY(index);
        const z = position.getZ(index);
        const frontAmount = THREE.MathUtils.clamp((z + 0.25) / 1.25, 0, 1);
        const widthTaper = 1 - frontAmount * 0.3;
        position.setXYZ(
            index,
            x * 0.32 * widthTaper,
            y * 0.19 * (y < 0 ? 0.62 : 1),
            z * 0.43
        );
    }
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
})();

const Snake3D = ({ startIndex, endIndex, color }: { startIndex: number; endIndex: number; color: string }) => {
    const { bodyGeometry, head, tail, direction, markings, thicknessScale } = useMemo(() => {
        const start = new THREE.Vector3(...getBoardWorldPosition(startIndex));
        const end = new THREE.Vector3(...getBoardWorldPosition(endIndex));
        const delta = end.clone().sub(start);
        const snakeThickness = THREE.MathUtils.clamp(delta.length() / 6, 0.54, 1);
        const perpendicular = new THREE.Vector3(-delta.z, 0, delta.x).normalize();
        const points = Array.from({ length: 15 }, (_, i) => {
            const t = i / 14;
            const point = start.clone().lerp(end, t);
            const radius = getSnakeRadius(t, snakeThickness);
            const taper = Math.sin(t * Math.PI);
            point.add(perpendicular.clone().multiplyScalar(Math.sin(t * Math.PI * 4.5) * 0.48 * taper));
            point.y = BOARD_SURFACE_Y + radius * 0.42 + Math.sin(t * Math.PI) * 0.012;
            return point;
        });
        const snakeCurve = new THREE.CatmullRomCurve3(points);
        const markingData = Array.from({ length: 13 }, (_, index) => {
            const t = 0.09 + index * 0.064;
            const point = snakeCurve.getPointAt(t);
            const tangent = snakeCurve.getTangentAt(t);
            const radius = getSnakeRadius(t, snakeThickness);
            return {
                position: point.add(new THREE.Vector3(0, radius * 0.34, 0)),
                rotation: Math.atan2(tangent.x, tangent.z),
                scale: radius,
            };
        });
        const headPosition = start.clone().add(points[1].clone().sub(points[0]).normalize().multiplyScalar(-0.12));
        headPosition.y = BOARD_SURFACE_Y + 0.135;
        const generatedBodyGeometry = createTaperedSnakeGeometry(snakeCurve, snakeThickness);
        return {
            bodyGeometry: generatedBodyGeometry,
            head: headPosition,
            tail: snakeCurve.getPointAt(1),
            direction: points[1].clone().sub(points[0]).normalize(),
            markings: markingData,
            thicknessScale: snakeThickness,
        };
    }, [startIndex, endIndex]);

    useEffect(() => () => bodyGeometry.dispose(), [bodyGeometry]);
    const headRotation = Math.atan2(-direction.x, -direction.z);
    const bodyColor = useMemo(() => {
        const mutedColor = new THREE.Color(color);
        mutedColor.offsetHSL(0, -0.2, -0.07);
        return mutedColor.getStyle();
    }, [color]);
    const markingColor = useMemo(() => new THREE.Color(bodyColor).multiplyScalar(0.52).getStyle(), [bodyColor]);
    const headScale = THREE.MathUtils.lerp(0.78, 1, thicknessScale);

    return (
        <group>
            <mesh geometry={bodyGeometry} castShadow receiveShadow>
                <meshStandardMaterial color={bodyColor} roughness={0.94} metalness={0} envMapIntensity={0.08} />
            </mesh>
            {markings.map((marking, index) => (
                <mesh
                    key={index}
                    position={marking.position}
                    rotation={[0, marking.rotation, 0]}
                    scale={[marking.scale * 0.34, 0.012, marking.scale * 0.58]}
                >
                    <sphereGeometry args={[1, 14, 8]} />
                    <meshStandardMaterial color={markingColor} roughness={0.98} metalness={0} envMapIntensity={0.05} />
                </mesh>
            ))}
            <mesh position={tail} scale={[0.035 * thicknessScale, 0.014 * thicknessScale, 0.035 * thicknessScale]} castShadow>
                <sphereGeometry args={[1, 14, 8]} />
                <meshStandardMaterial color={bodyColor} roughness={0.96} metalness={0} envMapIntensity={0.06} />
            </mesh>
            <group position={head} rotation={[0, headRotation, 0]} scale={headScale}>
                <mesh geometry={SNAKE_HEAD_GEOMETRY} castShadow receiveShadow>
                    <meshStandardMaterial color={bodyColor} roughness={0.94} metalness={0} envMapIntensity={0.08} />
                </mesh>
                <mesh position={[0, 0.11, 0.04]} scale={[0.18, 0.014, 0.17]}>
                    <sphereGeometry args={[1, 16, 8]} />
                    <meshStandardMaterial color={markingColor} roughness={0.98} />
                </mesh>
                {[-0.09, 0.09].map((x) => (
                    <mesh key={x} position={[x, 0.085, 0.275]} scale={[0.034, 0.04, 0.026]} castShadow>
                        <sphereGeometry args={[1, 14, 10]} />
                        <meshStandardMaterial color="#261811" metalness={0.08} roughness={0.62} />
                    </mesh>
                ))}
                <mesh position={[-0.065, -0.025, 0.365]} scale={[0.018, 0.008, 0.012]}>
                    <sphereGeometry args={[1, 10, 6]} />
                    <meshStandardMaterial color="#172127" roughness={0.85} />
                </mesh>
                <mesh position={[0.065, -0.025, 0.365]} scale={[0.018, 0.008, 0.012]}>
                    <sphereGeometry args={[1, 10, 6]} />
                    <meshStandardMaterial color="#172127" roughness={0.85} />
                </mesh>
                <CylinderBetween start={new THREE.Vector3(0, -0.07, 0.38)} end={new THREE.Vector3(0, -0.07, 0.58)} radius={0.009} color="#7b2834" roughness={0.9} />
                <CylinderBetween start={new THREE.Vector3(0, -0.07, 0.57)} end={new THREE.Vector3(-0.052, -0.07, 0.67)} radius={0.007} color="#7b2834" roughness={0.9} />
                <CylinderBetween start={new THREE.Vector3(0, -0.07, 0.57)} end={new THREE.Vector3(0.052, -0.07, 0.67)} radius={0.007} color="#7b2834" roughness={0.9} />
            </group>
        </group>
    );
};

const PLAYER_PAWN_PROFILE = [
    new THREE.Vector2(0.025, 0),
    new THREE.Vector2(0.255, 0),
    new THREE.Vector2(0.292, 0.038),
    new THREE.Vector2(0.285, 0.085),
    new THREE.Vector2(0.235, 0.14),
    new THREE.Vector2(0.175, 0.19),
    new THREE.Vector2(0.125, 0.31),
    new THREE.Vector2(0.13, 0.43),
    new THREE.Vector2(0.185, 0.5),
    new THREE.Vector2(0.19, 0.555),
    new THREE.Vector2(0.13, 0.605),
    new THREE.Vector2(0.082, 0.625),
];

const PlayerPiece3D = ({ index, position, offset, pieceScale, color, active, tracked, travelMode, reducedMotion, activePositionRef }: {
    index: number;
    position: number;
    offset: [number, number];
    pieceScale: number;
    color: string;
    active: boolean;
    tracked: boolean;
    travelMode: 'normal' | 'ladder' | 'snake';
    reducedMotion: boolean;
    activePositionRef: React.MutableRefObject<THREE.Vector3>;
}) => {
    const group = useRef<THREE.Group>(null);
    const target = useMemo(() => {
        const next = new THREE.Vector3(...getBoardWorldPosition(position));
        next.x += offset[0];
        next.z += offset[1];
        return next;
    }, [position, offset[0], offset[1]]);
    const start = useRef(target.clone());
    const progress = useRef(1);
    const initialized = useRef(false);
    const previousSquare = useRef(position);
    const currentTravelMode = useRef<'normal' | 'ladder' | 'snake' | 'reflow'>('reflow');
    const tempPosition = useRef(new THREE.Vector3());
    const tempDirection = useRef(new THREE.Vector3());
    const tempPerpendicular = useRef(new THREE.Vector3());
    const enamelColor = useMemo(() => new THREE.Color(color).lerp(new THREE.Color('#ead8a4'), 0.05), [color]);
    const baseColor = useMemo(() => new THREE.Color(color).multiplyScalar(0.55), [color]);

    useLayoutEffect(() => {
        if (!group.current) return;
        if (!initialized.current) {
            group.current.position.copy(target);
            start.current.copy(target);
            progress.current = 1;
            initialized.current = true;
            return;
        }
        start.current.copy(group.current.position);
        const changedSquare = previousSquare.current !== position;
        previousSquare.current = position;
        currentTravelMode.current = changedSquare ? travelMode : 'reflow';
        progress.current = reducedMotion ? 1 : 0;
        if (reducedMotion) group.current.position.copy(target);
    }, [target.x, target.z, position, travelMode, reducedMotion]);

    useFrame((_, delta) => {
        if (!group.current) return;
        const mode = currentTravelMode.current;
        if (reducedMotion) {
            group.current.position.copy(target);
            if (tracked) activePositionRef.current.copy(group.current.position);
            return;
        }
        const speed = mode === 'reflow' ? 5 : mode === 'normal' ? 3.25 : 1.35;
        progress.current = Math.min(1, progress.current + delta * speed);
        const t = 1 - Math.pow(1 - progress.current, 3);
        tempPosition.current.lerpVectors(start.current, target, t);
        if (mode === 'snake') {
            const direction = tempDirection.current.subVectors(target, start.current).setY(0);
            const perpendicular = tempPerpendicular.current.set(-direction.z, 0, direction.x).normalize();
            const curveAmount = Math.sin(progress.current * Math.PI * 3) * Math.sin(progress.current * Math.PI) * 0.24;
            tempPosition.current.add(perpendicular.multiplyScalar(curveAmount));
        }
        const lift = mode === 'reflow' ? 0 : mode === 'ladder' ? 0.58 : mode === 'snake' ? 0.14 : 0.32;
        tempPosition.current.y = target.y + Math.sin(progress.current * Math.PI) * lift;
        group.current.position.copy(tempPosition.current);
        if (progress.current < 1 && mode !== 'reflow') group.current.rotation.y += delta * 4.5;
        if (tracked) activePositionRef.current.copy(group.current.position);
    });

    return (
        <group ref={group}>
            <group scale={pieceScale}>
            {active && (
                <group>
                    <pointLight color="#e4bd62" intensity={0.78} distance={1.65} position={[0, 0.68, 0]} />
                    <mesh position={[0, 0.026, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <torusGeometry args={[0.33, 0.026, 12, 42]} />
                        <meshStandardMaterial color="#d8b45d" emissive="#8a641f" emissiveIntensity={0.85} metalness={0.48} roughness={0.32} toneMapped={false} />
                    </mesh>
                </group>
            )}
            <mesh position={[0, 0.016, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.15, 0.72, 1]} renderOrder={2}>
                <circleGeometry args={[0.285, 36]} />
                <meshBasicMaterial color="#090705" transparent opacity={0.34} depthWrite={false} toneMapped={false} />
            </mesh>
            <mesh position={[0, 0.012, 0]}>
                <cylinderGeometry args={[0.255, 0.272, 0.045, 40]} />
                <meshStandardMaterial color={baseColor} metalness={0.12} roughness={0.44} />
            </mesh>
            <mesh position={[0, 0.022, 0]}>
                <latheGeometry args={[PLAYER_PAWN_PROFILE, 40]} />
                <meshPhysicalMaterial
                    color={enamelColor}
                    metalness={0.08}
                    roughness={0.36}
                    clearcoat={0.48}
                    clearcoatRoughness={0.3}
                    envMapIntensity={0.72}
                />
            </mesh>
            <mesh position={[0, 0.085, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.255, 0.022, 10, 40]} />
                <meshPhysicalMaterial color="#b98d3f" metalness={0.74} roughness={0.31} clearcoat={0.25} />
            </mesh>
            <mesh position={[0, 0.17, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.182, 0.013, 10, 36]} />
                <meshPhysicalMaterial color="#d0aa59" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.605, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.105, 0.014, 10, 32]} />
                <meshPhysicalMaterial color="#c79e4b" metalness={0.72} roughness={0.28} />
            </mesh>
            <mesh position={[0, 0.77, 0]} scale={[1, 0.95, 1]}>
                <sphereGeometry args={[0.172, 30, 22]} />
                <meshPhysicalMaterial
                    color={enamelColor}
                    metalness={0.07}
                    roughness={0.33}
                    clearcoat={0.5}
                    clearcoatRoughness={0.28}
                    envMapIntensity={0.74}
                />
            </mesh>
            </group>
            <Html position={[0, 1.03 * pieceScale, 0]} center distanceFactor={9} className="pointer-events-none">
                <span className={`snl-piece-number ${active ? 'is-active' : ''}`}>{index + 1}</span>
            </Html>
        </group>
    );
};

let stableOrbShadowTexture: THREE.DataTexture | null = null;

const getStableOrbShadowTexture = () => {
    if (stableOrbShadowTexture) return stableOrbShadowTexture;

    const size = 128;
    const pixels = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const normalizedX = (x + 0.5 - size / 2) / (size / 2);
            const normalizedY = (y + 0.5 - size / 2) / (size / 2);
            const distance = Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY);
            const strength = Math.pow(Math.max(0, 1 - distance), 1.8);
            const value = Math.round(strength * 255);
            const offset = (y * size + x) * 4;
            pixels[offset] = value;
            pixels[offset + 1] = value;
            pixels[offset + 2] = value;
            pixels[offset + 3] = 255;
        }
    }

    stableOrbShadowTexture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
    stableOrbShadowTexture.minFilter = THREE.LinearFilter;
    stableOrbShadowTexture.magFilter = THREE.LinearFilter;
    stableOrbShadowTexture.generateMipmaps = false;
    stableOrbShadowTexture.needsUpdate = true;
    return stableOrbShadowTexture;
};

const FloatingBonusOrb = ({ index, reducedMotion }: { index: number; reducedMotion: boolean }) => {
    const orb = useRef<THREE.Group>(null);
    const [x, , z] = useMemo(() => getBoardWorldPosition(index), [index]);
    const phaseOffset = useMemo(() => (index * 1.37) % (Math.PI * 2), [index]);
    const shadowTexture = useMemo(() => getStableOrbShadowTexture(), []);

    useFrame(({ clock }) => {
        if (!orb.current) return;

        const elapsed = clock.getElapsedTime();
        const bob = reducedMotion
            ? 0
            : Math.sin(elapsed * 1.45 + phaseOffset) * 0.07;

        orb.current.position.y = BOARD_SURFACE_Y + 0.62 + bob;
        if (reducedMotion) {
            orb.current.rotation.set(0, 0, 0);
        } else {
            orb.current.rotation.set(
                Math.sin(elapsed * 0.38 + phaseOffset) * 0.065,
                elapsed * 0.24 + phaseOffset * 0.18,
                Math.sin(elapsed * 0.31 + phaseOffset * 0.7) * 0.05
            );
        }

    });

    return (
        <group position={[x, 0, z]}>
            <mesh
                position={[0, BOARD_SURFACE_Y + 0.02, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                renderOrder={3}
            >
                <planeGeometry args={[0.82, 0.58]} />
                <meshBasicMaterial
                    alphaMap={shadowTexture}
                    color="#09030b"
                    transparent
                    opacity={0.56}
                    depthWrite={false}
                    polygonOffset
                    polygonOffsetFactor={-2}
                    toneMapped={false}
                />
            </mesh>
            <group ref={orb} position={[0, BOARD_SURFACE_Y + 0.62, 0]}>
                <StarOrbModel
                    scale={0.54}
                    reducedMotion={reducedMotion}
                    animationOffset={phaseOffset}
                />
            </group>
        </group>
    );
};

const SelectableBonusSquare = ({ index, origin, onSelect }: {
    index: number;
    origin: number;
    onSelect: (index: number) => void;
}) => {
    const [hovered, setHovered] = useState(false);
    const [x, , z] = useMemo(() => getBoardWorldPosition(index), [index]);
    const distance = index - origin;
    const distanceLabel = distance > 0 ? `+${distance}` : `${distance}`;
    useEffect(() => () => {
        document.body.style.cursor = '';
    }, []);
    const selectSquare = (event?: { stopPropagation?: () => void }) => {
        event?.stopPropagation?.();
        onSelect(index);
    };

    return (
        <group position={[x, BOARD_SURFACE_Y + 0.055, z]}>
            <RoundedBox
                args={[0.88, 0.045, 0.88]}
                radius={0.075}
                smoothness={4}
                onPointerEnter={(event) => {
                    event.stopPropagation();
                    setHovered(true);
                    document.body.style.cursor = 'pointer';
                }}
                onPointerLeave={(event) => {
                    event.stopPropagation();
                    setHovered(false);
                    document.body.style.cursor = '';
                }}
                onClick={selectSquare}
                renderOrder={8}
            >
                <meshStandardMaterial
                    color={hovered ? '#e9b8ff' : '#a855f7'}
                    emissive={hovered ? '#b522f0' : '#6b21a8'}
                    emissiveIntensity={hovered ? 1.05 : 0.58}
                    transparent
                    opacity={hovered ? 0.72 : 0.38}
                    depthWrite={false}
                    toneMapped={false}
                />
            </RoundedBox>
            <Html position={[0, 0.12, 0]} center distanceFactor={9.5} className="snl-bonus-target-html">
                <button
                    type="button"
                    aria-label={`Move to square ${index + 1}`}
                    className="snl-bonus-square-hit"
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                    onFocus={() => setHovered(true)}
                    onBlur={() => setHovered(false)}
                    onClick={selectSquare}
                >
                    {distanceLabel}
                </button>
            </Html>
        </group>
    );
};

const BoardCamera = ({ animatedPositionRef, following, reducedMotion, introReady }: { animatedPositionRef: React.MutableRefObject<THREE.Vector3>; following: boolean; reducedMotion: boolean; introReady: boolean }) => {
    const lookTarget = useRef(new THREE.Vector3());
    const restingLook = useRef(new THREE.Vector3());
    const restingPosition = useRef(new THREE.Vector3());
    const roomPosition = useRef(new THREE.Vector3());
    const roomLook = useRef(new THREE.Vector3());
    const arcControl = useRef(new THREE.Vector3());
    const desiredPosition = useRef(new THREE.Vector3());
    const returnStartPosition = useRef(new THREE.Vector3());
    const returnStartLook = useRef(new THREE.Vector3());
    const returnControlOne = useRef(new THREE.Vector3());
    const returnControlTwo = useRef(new THREE.Vector3());
    const returnStartedAt = useRef<number | null>(null);
    const returnStartFov = useRef(38);
    const wasFollowing = useRef(false);
    const initialized = useRef(false);
    const introStartedAt = useRef<number | null>(null);
    const introComplete = useRef(reducedMotion);

    useFrame(({ camera, size, clock }, delta) => {
        const shouldFollow = following && !reducedMotion;
        const activePosition = animatedPositionRef.current;
        const canvasAspect = size.height > 0 ? size.width / size.height : 1;
        const narrowFrame = THREE.MathUtils.clamp((1.28 - canvasAspect) / 0.28, 0, 1);
        // Keep the whole board in view, but frame it as the hero of the room.
        // Compact canvases retain a little more height so their square edges
        // remain visible, while wide screens use the spare space around it.
        restingLook.current.set(0, -0.65, 0.05);
        restingPosition.current.set(
            0,
            THREE.MathUtils.lerp(15.2, 15.8, narrowFrame),
            THREE.MathUtils.lerp(7.4, 8.5, narrowFrame)
        );
        const restingFov = THREE.MathUtils.lerp(42.5, 43, narrowFrame);

        if (introReady && introStartedAt.current === null) {
            introStartedAt.current = clock.getElapsedTime();
        }

        const introElapsed = introStartedAt.current === null ? 0 : clock.getElapsedTime() - introStartedAt.current;
        const introProgress = reducedMotion ? 1 : THREE.MathUtils.clamp(introElapsed / 4.8, 0, 1);
        const showIntroFrame = !reducedMotion && !following && !introComplete.current;

        if (showIntroFrame) {
            const easedProgress = THREE.MathUtils.smootherstep(introProgress, 0, 1);
            roomPosition.current.set(
                THREE.MathUtils.lerp(-25, -28, narrowFrame),
                THREE.MathUtils.lerp(14.5, 16.5, narrowFrame),
                THREE.MathUtils.lerp(12, 11, narrowFrame)
            );
            roomLook.current.set(-3, -1.1, -6.5);
            arcControl.current.set(
                THREE.MathUtils.lerp(-10, -12, narrowFrame),
                THREE.MathUtils.lerp(16.5, 18.5, narrowFrame),
                THREE.MathUtils.lerp(18, 20, narrowFrame)
            );
            const inverseProgress = 1 - easedProgress;
            camera.position
                .copy(roomPosition.current)
                .multiplyScalar(inverseProgress * inverseProgress)
                .addScaledVector(arcControl.current, 2 * inverseProgress * easedProgress)
                .addScaledVector(restingPosition.current, easedProgress * easedProgress);
            lookTarget.current.lerpVectors(roomLook.current, restingLook.current, easedProgress);
            camera.lookAt(lookTarget.current);

            const perspectiveCamera = camera as THREE.PerspectiveCamera;
            perspectiveCamera.fov = THREE.MathUtils.lerp(
                THREE.MathUtils.lerp(58, 61, narrowFrame),
                restingFov,
                easedProgress
            );
            perspectiveCamera.updateProjectionMatrix();
            initialized.current = true;

            if (introReady && introProgress >= 1) {
                introComplete.current = true;
            }
            return;
        }

        if (following) introComplete.current = true;

        const perspectiveCamera = camera as THREE.PerspectiveCamera;

        if (!shouldFollow && wasFollowing.current) {
            returnStartPosition.current.copy(camera.position);
            returnStartLook.current.copy(lookTarget.current);
            returnControlOne.current.set(
                camera.position.x,
                Math.max(camera.position.y, restingPosition.current.y) + 4.5,
                camera.position.z
            );
            returnControlTwo.current.set(
                restingPosition.current.x,
                restingPosition.current.y + 2.4,
                restingPosition.current.z + 1.6
            );
            returnStartFov.current = perspectiveCamera.fov;
            returnStartedAt.current = reducedMotion ? null : clock.getElapsedTime();
            if (reducedMotion) {
                camera.position.copy(restingPosition.current);
                lookTarget.current.copy(restingLook.current);
                camera.lookAt(lookTarget.current);
                perspectiveCamera.fov = restingFov;
                perspectiveCamera.updateProjectionMatrix();
                camera.updateMatrixWorld(true);
            }
        }
        wasFollowing.current = shouldFollow;

        if (shouldFollow) returnStartedAt.current = null;

        if (!shouldFollow && returnStartedAt.current !== null) {
            const returnProgress = THREE.MathUtils.clamp(
                (clock.getElapsedTime() - returnStartedAt.current) / 1.35,
                0,
                1
            );
            const easedReturn = THREE.MathUtils.smootherstep(returnProgress, 0, 1);
            const inverseReturn = 1 - easedReturn;
            const inverseSquared = inverseReturn * inverseReturn;
            const progressSquared = easedReturn * easedReturn;

            camera.position
                .copy(returnStartPosition.current)
                .multiplyScalar(inverseSquared * inverseReturn)
                .addScaledVector(returnControlOne.current, 3 * inverseSquared * easedReturn)
                .addScaledVector(returnControlTwo.current, 3 * inverseReturn * progressSquared)
                .addScaledVector(restingPosition.current, progressSquared * easedReturn);
            lookTarget.current.lerpVectors(returnStartLook.current, restingLook.current, easedReturn);
            camera.lookAt(lookTarget.current);
            perspectiveCamera.fov = THREE.MathUtils.lerp(returnStartFov.current, restingFov, easedReturn);
            perspectiveCamera.updateProjectionMatrix();

            if (returnProgress >= 1) {
                returnStartedAt.current = null;
                camera.position.copy(restingPosition.current);
                lookTarget.current.copy(restingLook.current);
                camera.lookAt(lookTarget.current);
                camera.updateMatrixWorld(true);
            }
            return;
        }

        const desiredLook = shouldFollow ? activePosition : restingLook.current;
        if (shouldFollow) {
            desiredPosition.current.set(activePosition.x * 0.8, 6.1, activePosition.z + 4.6);
        } else {
            desiredPosition.current.copy(restingPosition.current);
        }
        const smoothing = 1 - Math.exp(-delta * (shouldFollow ? 3.2 : 2.4));
        if (!initialized.current) {
            camera.position.copy(desiredPosition.current);
            lookTarget.current.copy(desiredLook);
            initialized.current = true;
        } else {
            camera.position.lerp(desiredPosition.current, smoothing);
            lookTarget.current.lerp(desiredLook, smoothing);
        }
        camera.lookAt(lookTarget.current);
        const desiredFov = shouldFollow ? 38 : restingFov;
        if (Math.abs(perspectiveCamera.fov - desiredFov) > 0.01) {
            perspectiveCamera.fov = THREE.MathUtils.lerp(perspectiveCamera.fov, desiredFov, smoothing);
            perspectiveCamera.updateProjectionMatrix();
        }
    });
    return null;
};

const BoardShadowController = ({ ready }: { ready: boolean }) => {
    const { gl } = useThree();

    useEffect(() => {
        gl.shadowMap.autoUpdate = false;
        gl.shadowMap.needsUpdate = true;

        return () => {
            gl.shadowMap.autoUpdate = true;
        };
    }, [gl]);

    useEffect(() => {
        if (!ready) return;
        gl.shadowMap.needsUpdate = true;
    }, [gl, ready]);

    return null;
};

const SnakesLaddersBoard3D = ({ positions, currentTeamId, trackedTeamId, phase, statusMessage, snakes, ladders, bonusTiles, consumedBonusTiles, selectableBonusTargets, bonusChoiceOrigin, onSelectBonusTarget, teamColors, reducedMotion, compact }: {
    positions: number[];
    currentTeamId: number;
    trackedTeamId: number;
    phase: string;
    statusMessage: string;
    snakes: { start: number; end: number; color: string }[];
    ladders: { start: number; end: number }[];
    bonusTiles: number[];
    consumedBonusTiles: number[];
    selectableBonusTargets: number[];
    bonusChoiceOrigin: number | null;
    onSelectBonusTarget: (index: number) => void;
    teamColors: { solid: string }[];
    reducedMotion: boolean;
    compact: boolean;
}) => {
    const [roomReady, setRoomReady] = useState(false);
    const following = phase === 'moving' || phase === 'ladder-snake';
    const travelMode: 'normal' | 'ladder' | 'snake' = phase === 'ladder-snake'
        ? (statusMessage.includes('Climbing') ? 'ladder' : statusMessage.includes('Sliding') ? 'snake' : 'normal')
        : 'normal';
    const activePiecePositionRef = useRef(new THREE.Vector3(...getBoardWorldPosition(positions[trackedTeamId] ?? 0)));
    const pieceLayout = useMemo(() => positions.map((position, teamIndex) => {
        const teamsOnSquare = positions
            .map((teamPosition, index) => ({ teamPosition, index }))
            .filter((team) => team.teamPosition === position)
            .map((team) => team.index);
        if (teamsOnSquare.length === 1) return { offset: [0, 0] as [number, number], scale: 1 };
        const slot = teamsOnSquare.indexOf(teamIndex);
        if (teamsOnSquare.length === 2) {
            return { offset: [(slot === 0 ? -1 : 1) * 0.24, 0] as [number, number], scale: 0.82 };
        }
        const radius = teamsOnSquare.length <= 4 ? 0.28 : 0.31;
        const angle = -Math.PI / 2 + (slot / teamsOnSquare.length) * Math.PI * 2;
        return {
            offset: [Math.cos(angle) * radius, Math.sin(angle) * radius] as [number, number],
            scale: teamsOnSquare.length <= 4 ? 0.76 : 0.68,
        };
    }), [positions]);
    return (
        <Canvas
            shadows
            dpr={compact ? [2, 3] : [1, 1.5]}
            camera={{ position: [-25, 14.5, 12], fov: 58 }}
            gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
            onCreated={({ gl }) => {
                gl.setClearColor('#4d554a', 1);
                gl.shadowMap.type = THREE.PCFSoftShadowMap;
            }}
        >
            <ambientLight intensity={0.52} />
            <hemisphereLight args={["#dff9f5", "#071b24", 0.92]} />
            <directionalLight position={[-5, 12, 7]} intensity={2.05} color="#fff7e5" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0002} shadow-normalBias={0.035} shadow-camera-left={-18} shadow-camera-right={18} shadow-camera-top={18} shadow-camera-bottom={-18} />
            <spotLight position={[7, 9, -5]} intensity={0.68} angle={0.55} penumbra={0.85} color="#8de6db" />
            <BoardCamera animatedPositionRef={activePiecePositionRef} following={following} reducedMotion={reducedMotion} introReady={roomReady} />
            <BoardShadowController ready={roomReady} />

            <Suspense fallback={null}>
                <CozyChessRoomModel position={[0, -0.225, 0]} rotation={[0, -Math.PI / 2, 0]} scale={0.9} onReady={() => setRoomReady(true)} />
            </Suspense>

            {/* The imported artwork supplies the grid, numbers, snakes and ladders.
                These shallow layers retain the physical thickness and shadow of a
                real board without altering the established square coordinates. */}
            <RoundedBox args={[11.18, 0.28, 11.18]} radius={0.105} smoothness={6} position={[0, -0.1, 0]} castShadow receiveShadow>
                <meshPhysicalMaterial color="#24130f" roughness={0.76} metalness={0.01} clearcoat={0.12} clearcoatRoughness={0.68} />
            </RoundedBox>
            <RoundedBox args={[11.08, 0.2, 11.08]} radius={0.075} smoothness={5} position={[0, 0.015, 0]} castShadow receiveShadow>
                <meshPhysicalMaterial color="#5a3423" roughness={0.67} metalness={0.01} clearcoat={0.18} clearcoatRoughness={0.58} />
            </RoundedBox>
            <RoundedBox args={[10.98, 0.1, 10.98]} radius={0.035} smoothness={4} position={[0, 0.09, 0]} castShadow receiveShadow>
                <meshStandardMaterial color="#a88445" metalness={0.46} roughness={0.43} />
            </RoundedBox>
            <RoundedBox args={[10.92, 0.14, 10.92]} radius={0.035} smoothness={4} position={[0, 0.14, 0]} castShadow receiveShadow>
                <meshStandardMaterial color="#18130e" roughness={0.9} metalness={0} />
            </RoundedBox>

            <Suspense fallback={null}>
                <PrintedBoardSurface />
            </Suspense>

            <Suspense fallback={null}>
                {bonusChoiceOrigin !== null && selectableBonusTargets.map((index) => (
                    <SelectableBonusSquare
                        key={`bonus-target-${index}`}
                        index={index}
                        origin={bonusChoiceOrigin}
                        onSelect={onSelectBonusTarget}
                    />
                ))}
                {bonusTiles.filter((index) => !consumedBonusTiles.includes(index)).map((index) => (
                    <FloatingBonusOrb
                        key={`bonus-${index}`}
                        index={index}
                        reducedMotion={reducedMotion}
                    />
                ))}
            </Suspense>
            {positions.map((position, index) => (
                <PlayerPiece3D
                    key={index}
                    index={index}
                    position={position}
                    offset={pieceLayout[index].offset}
                    pieceScale={pieceLayout[index].scale}
                    color={teamColors[index % teamColors.length].solid}
                    active={index === currentTeamId}
                    tracked={index === trackedTeamId}
                    travelMode={travelMode}
                    reducedMotion={reducedMotion}
                    activePositionRef={activePiecePositionRef}
                />
            ))}
            <Environment preset="warehouse" />
        </Canvas>
    );
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
    const [phase, setPhase] = useState<'setup' | 'roll' | 'question' | 'moving' | 'ladder-snake' | 'bonus-card' | 'bonus-choice' | 'turn-complete' | 'gameover'>('setup');
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
    const [selectedMcAnswer, setSelectedMcAnswer] = useState('');
    const [missedItems, setMissedItems] = useState<PracticeReviewItem[]>([]);
    const [correctCount, setCorrectCount] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isTimesUp, setIsTimesUp] = useState(false);
    
    // Processing lock
    const [isProcessing, setIsProcessing] = useState(false);

    const [snakes, setSnakes] = useState<{start: number, end: number, path: string, tongue: string, color: string}[]>([]);
    const [ladders, setLadders] = useState<{start: number, end: number, visuals: any}[]>([]);
    const [bonusTiles, setBonusTiles] = useState<number[]>([]);
    const [consumedBonusTiles, setConsumedBonusTiles] = useState<number[]>([]);
    const [bonusMap, setBonusMap] = useState<Record<number, SnakesLaddersBonusEffect>>({});
    const [collectedBonusCard, setCollectedBonusCard] = useState<CollectedBonusCard | null>(null);
    const [isBonusCardExpanded, setIsBonusCardExpanded] = useState(false);
    const [pendingBonusChoice, setPendingBonusChoice] = useState<PendingBonusChoice | null>(null);
    const [extraTurnTeamId, setExtraTurnTeamId] = useState<number | null>(null);
    const [skipTurnCounts, setSkipTurnCounts] = useState<Record<number, number>>({});
    const skipTurnCountsRef = useRef<Record<number, number>>({});
    const [motionTeamId, setMotionTeamId] = useState(0);

    const [showQuitConfirm, setShowQuitConfirm] = useState(false);
    const [showEndGameConfirm, setShowEndGameConfirm] = useState(false);
    const [showCredits, setShowCredits] = useState(false);
    const [isMuted, setIsMuted] = useState(options.muted);
    const [isImageZoomOpen, setIsImageZoomOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
    const [boardSize, setBoardSize] = useState<number | null>(null);
    const [diceSize, setDiceSize] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const boardWrapRef = useRef<HTMLDivElement>(null);
    const diceRowRef = useRef<HTMLDivElement>(null);
    const questionWrapRef = useRef<HTMLDivElement>(null);
    const questionTextRef = useRef<HTMLDivElement>(null);
    const [questionFontSize, setQuestionFontSize] = useState<number | null>(null);
    const optionGridRef = useRef<HTMLDivElement>(null);
    const optionMeasureRef = useRef<HTMLDivElement>(null);
    const [optionFontSize, setOptionFontSize] = useState<number | null>(null);
    const [resizeTick, setResizeTick] = useState(0);
    const hasOptions = !!currentQuestion?.options && currentQuestion.options.length > 0;
    const optionKey = currentQuestion?.options?.join('|') || '';
    const questionImageUrl = resolveGameQuestionImageUrl(currentQuestion?.image);
    const questionImageAlt = currentQuestion?.image?.alt || '';

    const teamNames = options.teamNames || Array.from({length: options.players}, (_, i) => `Team ${i+1}`);
    const currentTeamId = turnOrder[currentTurnIndex];
    const canRollDice = phase === 'roll' && !isDiceRolling;

    useEffect(() => {
        setMotionTeamId(currentTeamId);
    }, [currentTeamId]);

    useEffect(() => {
        skipTurnCountsRef.current = skipTurnCounts;
    }, [skipTurnCounts]);

    // SCROLL LOCK EFFECT
    useEffect(() => {
        const shouldLock = (phase === 'question' && isQuestionVisible) || showCredits;
        document.body.style.overflow = shouldLock ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [phase, isQuestionVisible, showCredits]);

    useEffect(() => {
        if (!showCredits) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setShowCredits(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [showCredits]);

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
        if (!boardWrapRef.current) return;
        const element = boardWrapRef.current;
        const updateSize = () => {
            const rect = element.getBoundingClientRect();
            const padding = isMobileViewport ? 12 : 4;
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

    useLayoutEffect(() => {
        if (phase !== 'question' || !currentQuestion || isFlipped || !isQuestionVisible) {
            setQuestionFontSize(null);
            return;
        }
        const wrap = questionWrapRef.current;
        const textEl = questionTextRef.current;
        if (!wrap || !textEl) return;
        const maxSize = hasOptions
            ? Math.min(64, Math.max(28, Math.floor(window.innerWidth / 8)))
            : Math.min(80, Math.max(30, Math.floor(window.innerWidth / 7)));
        const minSize = 12;
        let low = minSize;
        let high = maxSize;
        let best = minSize;
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            textEl.style.fontSize = `${mid}px`;
            textEl.style.lineHeight = '1.15';
            if (textEl.scrollHeight <= wrap.clientHeight && textEl.scrollWidth <= textEl.clientWidth) {
                best = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        setQuestionFontSize(best);
    }, [isMobileViewport, hasOptions, phase, currentQuestion?.question, currentQuestion?.options?.length, isFlipped, isQuestionVisible, resizeTick]);

    useLayoutEffect(() => {
        if (!hasOptions || !currentQuestion?.options || phase !== 'question' || !isQuestionVisible || isFlipped) {
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
    }, [hasOptions, optionKey, phase, isQuestionVisible, isFlipped, isMobileViewport, resizeTick]);

    // --- BOARD INITIALIZATION ---
    useEffect(() => {
        const ladderDefs = [
            { s: 1, e: 22 }, { s: 4, e: 24 }, { s: 13, e: 29 },
            { s: 34, e: 54 }, { s: 38, e: 57 }, { s: 66, e: 87 },
            { s: 69, e: 90 }, { s: 77, e: 86 }, { s: 80, e: 100 }
        ];

        const snakeDefs = [
            { s: 98, e: 63, c: '#b98917' },
            { s: 94, e: 53, c: '#1d6349' },
            { s: 91, e: 30, c: '#848687' },
            { s: 64, e: 25, c: '#4a4a4a' },
            { s: 79, e: 21, c: '#8b4b1f' },
            { s: 52, e: 14, c: '#b98917' }
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
        newLadders.forEach(l => prohibitedIndices.add(l.start));
        newSnakes.forEach(s => prohibitedIndices.add(s.start));

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
            const configuredBonusTypes = options.snakesLaddersBonusOptions?.length
                ? options.snakesLaddersBonusOptions
                : DEFAULT_SNAKES_LADDERS_BONUSES;
            const availableBonusTypes = configuredBonusTypes.filter((bonusType) =>
                options.players > 1 || !OPPONENT_BONUS_TYPES.has(bonusType)
            );
            const enabledBonusTypes = availableBonusTypes.length ? [...availableBonusTypes] : ['move-forward' as const];

            for (let i = enabledBonusTypes.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [enabledBonusTypes[i], enabledBonusTypes[j]] = [enabledBonusTypes[j], enabledBonusTypes[i]];
            }

            const map: Record<number, SnakesLaddersBonusEffect> = {};
            selectedIndices.forEach((tileIndex, index) => {
                const type = enabledBonusTypes[index % enabledBonusTypes.length];
                map[tileIndex] = {
                    type,
                    amount: type === 'move-forward'
                        ? FORWARD_BONUS_VALUES[Math.floor(Math.random() * FORWARD_BONUS_VALUES.length)]
                        : type === 'move-five' || type === 'move-rival-back'
                            ? 5
                            : undefined,
                };
            });
            
            setBonusTiles(selectedIndices);
            setConsumedBonusTiles([]);
            setBonusMap(map);
        } else {
            setBonusTiles([]);
            setConsumedBonusTiles([]);
            setBonusMap({});
        }

        pickNewQuestion();
    }, [options.enableBonuses, options.players, options.snakesLaddersBonusOptions]);

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
            if (options.studentPractice) {
                setPhase('gameover');
                return;
            }
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
        const nextUsedQuestionIds = usedQuestionIds.includes(currentQuestion.id)
            ? usedQuestionIds
            : [...usedQuestionIds, currentQuestion.id];
        const isStudentPracticeComplete = options.studentPractice && nextUsedQuestionIds.length >= questions.length;
        playSound(correct ? 'correct' : 'incorrect', isMuted);
        
        if (correct) {
            setCorrectCount((prev) => prev + 1);
            setTimeout(() => {
                if (isStudentPracticeComplete) {
                    setPhase('gameover');
                    setIsProcessing(false);
                    return;
                }
                setPhase('moving');
                movePlayer(diceValue); // Dice value is state, preserved
                setIsProcessing(false); // Can release early as phase changes
            }, 1000);
        } else {
            setMissedItems((prev) => [
                ...prev,
                {
                    id: String(currentQuestion.id),
                    question: currentQuestion.question,
                    correctAnswer: currentQuestion.answer,
                    studentAnswer: selectedMcAnswer || undefined,
                    context: `Square ${positions[currentTeamId] + 1}`,
                },
            ]);
            setTimeout(() => {
                if (isStudentPracticeComplete) {
                    setPhase('gameover');
                    setIsProcessing(false);
                    return;
                }
                setPhase('turn-complete');
                setIsProcessing(false);
            }, 1500);
        }
    };

    const handleMcSelect = (opt: string) => {
        if (!currentQuestion) return;
        const clean = (s: string) => s.replace(/^[A-Z]\)\s*/i, '').trim().toLowerCase();
        const isCorrect = clean(opt) === clean(currentQuestion.answer);
        setSelectedMcAnswer(opt);
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
            // Progress should not depend on WebGL delivering a final animation
            // frame when a classroom device is under load.
            setTimeout(() => {
                setPhase(currentPhase => currentPhase === 'roll' ? 'question' : currentPhase);
            }, 1000);
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
        setMotionTeamId(currentTeamId);
        
        let stepCount = 0;
        
        // Keep each hop distinct without making a normal dice roll feel sluggish.
        const stepInterval = setInterval(() => {
            if (currentPos >= targetPos || currentPos >= 99) {
                 clearInterval(stepInterval);
                 setTimeout(() => checkTileEvents(currentPos, currentTeamId), 320);
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
                    if (options.studentPractice && usedQuestionIds.length < questions.length) {
                        setPhase('turn-complete');
                        return;
                    }
                    setPhase('gameover');
                }, 500);
                return;
            }
            
            // Redundant check just in case logic drifts
            if (stepCount >= steps) {
                clearInterval(stepInterval);
                setTimeout(() => checkTileEvents(currentPos, currentTeamId), 320);
            }
        }, 420);
    };

    const showBonusResult = (message: string, delay = 1100) => {
        setStatusMessage(message);
        setPhase('ladder-snake');
        setTimeout(() => {
            setStatusMessage('');
            setPhase('turn-complete');
        }, delay);
    };

    const collectBonusCard = (pos: number, effect: SnakesLaddersBonusEffect, teamId: number) => {
        playSound('bonus', isMuted);
        setConsumedBonusTiles((previous) => previous.includes(pos) ? previous : [...previous, pos]);
        setPendingBonusChoice(null);
        setCollectedBonusCard({ effect, origin: pos, teamId });
        setIsBonusCardExpanded(true);
        setStatusMessage(`${teamNames[teamId]} found a bonus card!`);
        setPhase('bonus-card');
    };

    const activateBonusEffect = (pos: number, effect: SnakesLaddersBonusEffect, teamId: number) => {

        if (effect.type === 'move-forward') {
            const amount = effect.amount || 2;
            const target = Math.min(99, pos + amount);
            setStatusMessage(`Bonus! Move forward ${amount}`);
            setPhase('ladder-snake');
            setTimeout(() => movePieceTo(teamId, pos, target, true), 450);
            return;
        }

        if (effect.type === 'move-five' || effect.type === 'swap-positions' || effect.type === 'move-rival-back' || effect.type === 'send-rival-to-snake') {
            setPendingBonusChoice({ effect, origin: pos, teamId });
            setStatusMessage('Bonus! Make your choice');
            setPhase('bonus-choice');
            return;
        }

        if (effect.type === 'extra-turn') {
            setExtraTurnTeamId(teamId);
            showBonusResult('Bonus! Take another turn');
            return;
        }

        if (effect.type === 'skip-next') {
            const ownerTurnIndex = turnOrder.indexOf(teamId);
            const nextTeamId = turnOrder[((ownerTurnIndex >= 0 ? ownerTurnIndex : currentTurnIndex) + 1) % turnOrder.length];
            setSkipTurnCounts((previous) => {
                const next = {
                    ...previous,
                    [nextTeamId]: (previous[nextTeamId] || 0) + 1,
                };
                skipTurnCountsRef.current = next;
                return next;
            });
            showBonusResult(`Bonus! ${teamNames[nextTeamId]} misses a turn`);
        }
    };

    const useCollectedBonusCard = () => {
        if (!collectedBonusCard) return;
        const activeCard = collectedBonusCard;
        setCollectedBonusCard(null);
        setIsBonusCardExpanded(false);
        playSound('select', isMuted, 'Magic');
        activateBonusEffect(activeCard.origin, activeCard.effect, activeCard.teamId);
    };

    const resolveMoveFiveBonus = (target: number) => {
        if (!pendingBonusChoice || pendingBonusChoice.effect.type !== 'move-five') return;
        const { origin, teamId } = pendingBonusChoice;
        const distance = target - origin;
        if (target < 0 || target > 99 || distance === 0 || Math.abs(distance) > 5) return;
        setPendingBonusChoice(null);
        setStatusMessage(`Bonus! Move ${distance > 0 ? 'forward' : 'back'} ${Math.abs(distance)}`);
        setPhase('ladder-snake');
        setTimeout(() => movePieceTo(teamId, origin, target, true), 250);
    };

    const getNearestSnakeBehind = (position: number) => snakes
        .filter((snake) => snake.start < position)
        .sort((first, second) => second.start - first.start)[0];

    const resolveOpponentBonus = (targetTeamId: number) => {
        if (!pendingBonusChoice || targetTeamId === pendingBonusChoice.teamId) return;
        const { effect, teamId: ownerTeamId } = pendingBonusChoice;
        const targetName = teamNames[targetTeamId];
        setPendingBonusChoice(null);
        playSound('bonus', isMuted);

        if (effect.type === 'swap-positions') {
            const ownerDestination = positions[targetTeamId];
            setMotionTeamId(ownerTeamId);
            setPositions((previous) => {
                const next = [...previous];
                [next[ownerTeamId], next[targetTeamId]] = [next[targetTeamId], next[ownerTeamId]];
                return next;
            });
            setStatusMessage(`Bonus! Swap places with ${targetName}`);
            setPhase('ladder-snake');
            setTimeout(() => checkTileEvents(ownerDestination, ownerTeamId), 900);
            return;
        }

        if (effect.type === 'move-rival-back') {
            const amount = effect.amount || 5;
            const start = positions[targetTeamId];
            const destination = Math.max(0, start - amount);
            setStatusMessage(`Bonus! ${targetName} moves back ${amount}`);
            setPhase('ladder-snake');
            movePieceTo(targetTeamId, start, destination, true);
            return;
        }

        if (effect.type === 'send-rival-to-snake') {
            const targetPosition = positions[targetTeamId];
            const nearestSnake = getNearestSnakeBehind(targetPosition);
            if (nearestSnake) {
                setMotionTeamId(targetTeamId);
                setStatusMessage(`${targetName} is heading to the snake on square ${nearestSnake.start + 1}`);
                setPhase('moving');
                setPositions((previous) => {
                    const next = [...previous];
                    next[targetTeamId] = nearestSnake.start;
                    return next;
                });
                setTimeout(() => {
                    setStatusMessage(`${targetName}: Sliding down...`);
                    setPhase('ladder-snake');
                    playSound('incorrect', isMuted, 'WompWomp');
                    movePieceTo(targetTeamId, nearestSnake.start, nearestSnake.end, true);
                }, 1050);
                return;
            }

            const destination = Math.max(0, targetPosition - 5);
            setStatusMessage(`${targetName} moves back 5`);
            setPhase('ladder-snake');
            movePieceTo(targetTeamId, targetPosition, destination, true);
        }
    };

    function checkTileEvents(pos: number, teamId: number) {
        const snake = snakes.find(s => s.start === pos);
        const ladder = ladders.find(l => l.start === pos);
        const isBonus = bonusTiles.includes(pos) && !consumedBonusTiles.includes(pos);

        if (snake) {
            setStatusMessage(`${teamNames[teamId]}: Sliding down...`);
            setPhase('ladder-snake');
            setTimeout(() => {
                playSound('incorrect', isMuted, 'WompWomp'); 
                movePieceTo(teamId, pos, snake.end, true);
            }, 500);
        } else if (ladder) {
            setStatusMessage(`${teamNames[teamId]}: Climbing!`);
            setPhase('ladder-snake');
            setTimeout(() => {
                playSound('correct', isMuted, 'Magic'); 
                movePieceTo(teamId, pos, ladder.end, true);
            }, 500);
        } else if (isBonus) {
            collectBonusCard(pos, bonusMap[pos] || { type: 'move-forward', amount: 2 }, teamId);
        } else {
            setTimeout(() => {
                setStatusMessage('');
                setPhase('turn-complete');
            }, 500);
        }
    }

    function movePieceTo(teamId: number, start: number, end: number, resolveDestination: boolean) {
        setMotionTeamId(teamId);
        setPositions(prev => {
            const newPos = [...prev];
            newPos[teamId] = end;
            return newPos;
        });
        
        // If a bonus pushes the player to the win, trigger game over immediately
        if (end === 99) {
            setTimeout(() => {
                setStatusMessage('');
                if (options.studentPractice && usedQuestionIds.length < questions.length) {
                    setPhase('turn-complete');
                    return;
                }
                setPhase('gameover');
            }, 1000);
        } else {
            setTimeout(() => {
                if (resolveDestination) {
                    checkTileEvents(end, teamId);
                } else {
                    setPhase('turn-complete');
                }
            }, 1000);
        }
    }

    const nextTurn = () => {
        pickNewQuestion();
        setStatusMessage('');
        setCollectedBonusCard(null);
        setIsBonusCardExpanded(false);
        setPendingBonusChoice(null);
        if (extraTurnTeamId !== null) {
            const bonusTurnIndex = turnOrder.indexOf(extraTurnTeamId);
            setExtraTurnTeamId(null);
            if (bonusTurnIndex >= 0) setCurrentTurnIndex(bonusTurnIndex);
            setPhase('roll');
            return;
        }

        const resolution = resolveNextPlayableTurn(currentTurnIndex, turnOrder, skipTurnCountsRef.current);
        skipTurnCountsRef.current = resolution.remainingSkips;
        setSkipTurnCounts(resolution.remainingSkips);
        setCurrentTurnIndex(resolution.nextTurnIndex);
        setPhase('roll');
    };

    const teamColors = [
        { grad: 'radial-gradient(circle at 30% 26%, #d76b6a, #8f2932)', solid: '#a7373f' },
        { grad: 'radial-gradient(circle at 30% 26%, #7596c8, #294c82)', solid: '#365f9b' },
        { grad: 'radial-gradient(circle at 30% 26%, #6ba67d, #285f45)', solid: '#347654' },
        { grad: 'radial-gradient(circle at 30% 26%, #e1ba60, #9d681d)', solid: '#bd8429' },
        { grad: 'radial-gradient(circle at 30% 26%, #a482b1, #624570)', solid: '#765487' },
        { grad: 'radial-gradient(circle at 30% 26%, #d48455, #8d4325)', solid: '#aa542c' },
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

    const stripOptionPrefix = (value: string) => value.replace(/^[A-D]\)\s*/i, '').trim();

    const getTargetStatus = () => {
        const currentPos = positions[currentTeamId];
        const target = Math.min(99, currentPos + diceValue);
        
        if (target === 99) return { text: "Winning Move!", color: "text-brand-yellow drop-shadow-lg", size: "text-2xl md:text-3xl" };
        if (snakes.some(s => s.start === target)) return { text: "Target: Snake Hazard!", color: "text-red-500 animate-pulse drop-shadow-md", size: "text-xl md:text-2xl" };
        if (ladders.some(l => l.start === target)) return { text: "Target: Ladder Boost!", color: "text-green-500 animate-bounce drop-shadow-md", size: "text-xl md:text-2xl" };
        if (bonusTiles.includes(target) && !consumedBonusTiles.includes(target)) return { text: "BONUS TILE!", color: "text-purple-200 drop-shadow-[0_8px_15px_rgba(109,40,217,0.6)] animate-pulse uppercase tracking-[0.35em]", size: "text-3xl md:text-5xl" };
        return { text: `Target: Square ${target + 1}`, color: "text-slate-200", size: "text-lg md:text-xl" };
    };

    const targetStatus = getTargetStatus();
    const isBonusStatus = (statusMessage || '').toLowerCase().includes('bonus');
    const selectableBonusTargets = useMemo(() => {
        if (phase !== 'bonus-choice' || pendingBonusChoice?.effect.type !== 'move-five') return [];
        const targets: number[] = [];
        for (let offset = -5; offset <= 5; offset++) {
            if (offset === 0) continue;
            const target = pendingBonusChoice.origin + offset;
            if (target >= 0 && target <= 99) targets.push(target);
        }
        return targets;
    }, [phase, pendingBonusChoice]);
    const bonusCardDetails = collectedBonusCard
        ? getBonusCardDetails(collectedBonusCard.effect)
        : null;
    const showExpandedBonusCard = !!collectedBonusCard && isBonusCardExpanded;
    const nextTurnPreview = resolveNextPlayableTurn(currentTurnIndex, turnOrder, skipTurnCounts);
    const nextPlayableTeamId = turnOrder[nextTurnPreview.nextTurnIndex] ?? currentTeamId;
    const skippedTeamLabel = nextTurnPreview.skippedTeamIds.map((teamId) => teamNames[teamId]).join(', ');
    const turnCompleteCopy = extraTurnTeamId !== null
        ? 'The table is yours again.'
        : nextTurnPreview.skippedTeamIds.length
            ? `${skippedTeamLabel} ${nextTurnPreview.skippedTeamIds.length === 1 ? 'misses' : 'miss'} this turn. ${teamNames[nextPlayableTeamId]} plays next.`
            : 'Pass play to the next player.';
    const turnCompleteAction = extraTurnTeamId !== null
        ? 'Roll Again'
        : nextTurnPreview.skippedTeamIds.length
            ? `Continue with ${teamNames[nextPlayableTeamId]}`
            : 'Next Player';
    const boardVisualStyle = isMobileViewport
        ? {
            width: boardSize ? `${boardSize}px` : 'min(100%, calc(100vh - 100px))',
            height: boardSize ? `${boardSize}px` : 'min(100%, calc(100vh - 100px))',
            aspectRatio: '1/1',
        } as React.CSSProperties
        : {
            width: '100%',
            height: '100%',
        } as React.CSSProperties;
    const timerProgress = options.timerSeconds > 0
        ? Math.max(0, Math.min(1, timeLeft / options.timerSeconds))
        : 0;

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

        const ranking = positions
            .map((position, index) => ({
                index,
                score: position + 1,
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
                className={`${isFullscreen ? 'fixed inset-0 overflow-y-auto overflow-x-hidden' : 'relative min-h-[calc(100vh-4rem)]'} z-[300] bg-gradient-to-br from-teal-900 via-cyan-900 to-slate-950 text-white`}
            >
                <WinnerCeremonyHero
                    winnerHeadline={winnerHeadline}
                    subtitle="Final board positions"
                    ranking={ranking}
                    isMobileViewport={isMobileViewport}
                    musicEnabled={!isMuted}
                    onPlayAgain={onReplay}
                    onExit={onFinish}
                >
                    <WinnerCeremonyStandingsTable
                        ranking={ranking}
                        formatScore={(score) => `Square ${score}`}
                    />
                </WinnerCeremonyHero>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={`snl-game flex flex-col ${isFullscreen ? 'h-[calc(var(--app-vh,1vh)*100)]' : 'h-[calc(var(--app-vh,1vh)*100-4rem)]'} overflow-hidden relative`}>
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
            <div className={`snl-topbar shrink-0 z-[50] flex items-center ${isMobileViewport ? 'h-[58px] px-2 py-2' : 'h-[72px] px-5'}`}>
                <div className="flex items-center justify-between w-full gap-3">
                    <div className={`flex ${isMobileViewport ? 'flex-row items-center gap-1.5' : 'items-center gap-2'}`}>
                        <button
                            onClick={() => setShowQuitConfirm(true)}
                            className={isMobileViewport
                                ? 'w-9 h-9 rounded-lg bg-slate-100 text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 flex items-center justify-center transition-colors'
                                : 'w-[140px] h-10 justify-center text-slate-600 hover:text-red-600 flex items-center text-sm bg-white hover:bg-red-50 px-4 rounded-xl transition-colors font-bold border border-slate-200 shadow-sm'
                            }
                        >
                            <ArrowLeft size={isMobileViewport ? 17 : 16} className={isMobileViewport ? '' : 'mr-2'} />
                            {!isMobileViewport && 'Quit'}
                        </button>
                        <button
                            onClick={() => setShowEndGameConfirm(true)}
                            className={isMobileViewport
                                ? 'w-9 h-9 rounded-lg bg-rose-700 text-white hover:bg-rose-600 border border-rose-800 flex items-center justify-center transition-colors'
                                : 'w-[140px] h-10 justify-center text-white flex items-center text-sm bg-rose-700 hover:bg-rose-600 px-4 rounded-xl transition-colors font-bold border border-rose-800 shadow-sm'
                            }
                            title="End game now"
                        >
                            <Flag size={isMobileViewport ? 14 : 16} className={isMobileViewport ? '' : 'mr-2'} />
                            {!isMobileViewport && 'End Game'}
                        </button>
                        {isMobileViewport && (
                            <>
                                <button
                                    onClick={() => setIsMuted(!isMuted)}
                                    className="w-9 h-9 rounded-lg bg-slate-100 text-slate-400 hover:text-brand-blue hover:bg-sky-50 border border-slate-200 flex items-center justify-center transition-colors"
                                    aria-label={isMuted ? 'Turn sound on' : 'Mute sound'}
                                    title={isMuted ? 'Turn sound on' : 'Mute sound'}
                                >
                                    {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCredits(true)}
                                    className="snl-credits-trigger w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                                    aria-label="View asset credits"
                                    title="Asset credits"
                                >
                                    <Info size={17} />
                                </button>
                            </>
                        )}
                    </div>
                    
                    <div className="flex-1 flex items-center justify-end md:justify-center">
                        <div className={`snl-turn-banner flex items-center gap-3 ${isMobileViewport ? 'px-2 py-1' : 'min-h-11 px-6 py-2'}`} style={{'--team-color': teamColors[currentTeamId % 6].grad} as React.CSSProperties}>
                            <span className={`font-bold uppercase tracking-wider ${isMobileViewport ? 'text-[9px]' : 'text-xs'}`}>Active team</span>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: teamColors[currentTeamId % 6].solid }}></div>
                                <span className={`font-black text-amber-50 ${isMobileViewport ? 'text-[11px]' : ''}`}>{teamNames[currentTeamId]}</span>
                            </div>
                        </div>
                    </div>

                    {!isMobileViewport && (
                        <div className="flex flex-row items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowCredits(true)}
                                className="snl-credits-trigger w-10 h-10 flex items-center justify-center rounded-xl transition-colors"
                                aria-label="View asset credits"
                                title="Asset credits"
                            >
                                <Info size={20} />
                            </button>
                            <button onClick={() => setIsMuted(!isMuted)} className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-brand-blue bg-white hover:bg-sky-50 rounded-xl transition-colors border border-slate-200 shadow-sm" aria-label={isMuted ? 'Turn sound on' : 'Mute sound'} title={isMuted ? 'Turn sound on' : 'Mute sound'}>{isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>
                            <button onClick={toggleFullscreen} className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-brand-blue bg-white hover:bg-sky-50 rounded-xl transition-colors border border-slate-200 shadow-sm" aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'} title={isFullscreen ? 'Exit full screen' : 'Enter full screen'}>{isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}</button>
                        </div>
                    )}
                </div>
            </div>

            <div className="snl-table flex-1 p-2 sm:p-3 relative overflow-hidden">
                <div className="snl-layout w-full h-full min-h-0">
                <div ref={boardWrapRef} className="snl-board-stage min-h-0 w-full flex items-center justify-center">
                    <div
                        className="snl-board snl-board-webgl relative overflow-hidden shrink-0 max-w-full max-h-full"
                        style={boardVisualStyle}
                        data-bonus-orb-count={bonusTiles.length - consumedBonusTiles.length}
                        data-team-positions={positions.map(position => position + 1).join(',')}
                        data-game-phase={phase}
                        data-current-team-id={currentTeamId}
                        data-skip-turn-counts={turnOrder.map((teamId) => skipTurnCounts[teamId] || 0).join(',')}
                    >
                        <SnakesLaddersBoard3D
                            positions={positions}
                            currentTeamId={currentTeamId}
                            trackedTeamId={motionTeamId}
                            phase={phase}
                            statusMessage={statusMessage}
                            snakes={snakes}
                            ladders={ladders}
                            bonusTiles={bonusTiles}
                            consumedBonusTiles={consumedBonusTiles}
                            selectableBonusTargets={selectableBonusTargets}
                            bonusChoiceOrigin={pendingBonusChoice?.effect.type === 'move-five' ? pendingBonusChoice.origin : null}
                            onSelectBonusTarget={resolveMoveFiveBonus}
                            teamColors={teamColors}
                            reducedMotion={prefersReducedMotion}
                            compact={isMobileViewport}
                        />
                    </div>
                </div>

                {/* RIGHT SIDE (Controls) */}
                <aside className="snl-controls w-full flex flex-col items-stretch justify-start">
                    <div className={`snl-control-panel w-full p-2 sm:p-4 text-center flex flex-col items-center overflow-hidden ${isMobileViewport ? `snl-control-panel-mobile snl-control-panel-mobile--${phase}` : 'flex-1 min-h-0'} ${!isMobileViewport && teamNames.length >= 5 ? 'snl-control-panel--many-players' : ''}`}>
                        {!isMobileViewport && phase !== 'setup' && !showExpandedBonusCard && (
                            <div className="snl-scoreboard w-full" aria-label="Team positions">
                                <div className="snl-panel-label">Players</div>
                                {teamNames.map((name, teamIdx) => (
                                    <div key={teamIdx} className={`snl-score-row ${teamIdx === currentTeamId ? 'is-active' : ''}`}>
                                        <span className="snl-score-token" style={{ background: teamColors[teamIdx % teamColors.length].grad }}>{teamIdx + 1}</span>
                                        <span className="snl-score-name">{name}</span>
                                        <strong>Square {positions[teamIdx] + 1}</strong>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!showExpandedBonusCard && phase === 'setup' && (
                            <div className="animate-fade-in w-full">
                                <h3 className="snl-setup-title font-display font-bold text-sm sm:text-xl mb-2 sm:mb-4">Turn Order</h3>
                                <div className={`mb-2 sm:mb-6 ${isMobileViewport ? 'grid grid-cols-3 gap-1' : 'space-y-2'}`}>
                                    {turnOrder.map((teamIdx, i) => (
                                        <div key={i} className={`snl-turn-order-row flex items-center rounded-lg ${isMobileViewport ? 'px-1 py-1 text-[10px]' : 'p-2'}`}>
                                            <span className={`snl-turn-order-index font-bold ${isMobileViewport ? 'mr-1' : 'mr-3'}`}>{i+1}.</span>
                                            <div className="w-2.5 h-2.5 rounded-full mr-1" style={{ backgroundColor: teamColors[teamIdx % 6].solid }}></div>
                                            <span className={`snl-turn-order-name font-bold ${isMobileViewport ? 'text-[10px] truncate' : ''}`}>{teamNames[teamIdx]}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className={`${isMobileViewport ? 'grid grid-cols-2 gap-2' : 'space-y-3'}`}>
                                    <button onClick={shuffleTeams} className={`snl-panel-secondary w-full rounded-xl font-bold transition-all flex items-center justify-center ${isMobileViewport ? 'py-1.5 text-[10px]' : 'py-3'}`}>
                                        <Shuffle size={isMobileViewport ? 12 : 18} className="mr-2" /> Randomize
                                    </button>
                                    <button onClick={() => setPhase('roll')} className={`snl-panel-primary w-full rounded-xl font-bold transition-all flex items-center justify-center ${isMobileViewport ? 'py-1.5 text-[10px]' : 'py-3 text-base sm:text-lg'}`}>
                                        <Play size={isMobileViewport ? 12 : 18} className="mr-2" /> Start Game
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* PERSISTENT DICE CONTAINER - Fix for WebGL Context Thrashing */}
                        <div className="snl-dice-region" style={{ display: !showExpandedBonusCard && (phase === 'roll' || phase === 'moving') ? 'flex' : 'none' }}>
                            <div ref={diceRowRef} className={`snl-dice-zone w-full animate-fade-in ${isMobileViewport ? 'flex items-center justify-between gap-2 h-full' : 'flex flex-col items-center flex-1 justify-center'}`}>
                                <div
                                    className={`snl-dice-player-card ${isMobileViewport ? 'is-mobile flex-1' : ''}`}
                                    style={isMobileViewport && diceSize ? { minHeight: `${diceSize}px` } : undefined}
                                >
                                    <span className="snl-dice-player-label">Now playing</span>
                                    <div className="snl-dice-player-name">
                                        <span className="snl-dice-player-dot" style={{ backgroundColor: teamColors[currentTeamId % teamColors.length].solid }} aria-hidden="true" />
                                        <h3 className="snl-dice-team-name">{teamNames[currentTeamId]}</h3>
                                    </div>
                                    <div className="snl-dice-turn-copy">Your turn to roll</div>
                                </div>
                                <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => { if (canRollDice) rollDice(); }}
                                    onKeyDown={(e) => { if (canRollDice && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); rollDice(); } }}
                                    className={`snl-dice ${isDiceRolling ? 'is-rolling' : 'is-landed'} ${isMobileViewport ? 'relative flex items-center justify-center' : 'w-full h-[clamp(150px,25vh,230px)]'} ${canRollDice ? 'cursor-pointer' : 'cursor-default'}`}
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
                                        className="snl-roll-button w-full py-4 font-black flex items-center justify-center text-xl"
                                    >
                                        <Play size={20} className="mr-2" /> Roll Dice
                                    </button>
                                )}
                                {!isMobileViewport && isDiceRolling && (
                                    <div className="snl-roll-result font-bold animate-pulse mt-2">Rolling...</div>
                                )}
                            </div>
                        </div>
                        
                        {!showExpandedBonusCard && phase === 'question' && (
                            <div className="snl-question-panel animate-fade-in">
                                <HelpCircle size={48} className="snl-question-panel-icon mx-auto mb-4 animate-bounce" />
                                <h3 className="text-xl font-bold mb-2">Question Time!</h3>
                                <div className="snl-question-roll px-4 py-2 rounded-lg font-black text-2xl mb-2">
                                    You rolled a {diceValue}
                                </div>
                                <p className="text-sm">Answer correctly to move.</p>
                            </div>
                        )}

                        {!showExpandedBonusCard && phase === 'bonus-choice' && pendingBonusChoice && (
                            <div className="snl-bonus-choice-state w-full animate-fade-in text-center">
                                <Gift size={isMobileViewport ? 34 : 54} className="snl-bonus-choice-icon mx-auto mb-2 text-amber-500" />
                                <h3 className={`snl-bonus-choice-title font-black ${isMobileViewport ? 'mb-2 text-sm' : 'mb-4 text-xl'}`}>
                                    {pendingBonusChoice.effect.type === 'move-five' ? 'Choose your move' : 'Choose another player'}
                                </h3>

                                {pendingBonusChoice.effect.type === 'move-five' ? (
                                    <div className="snl-bonus-board-instruction">
                                        <strong>Select a glowing square on the board</strong>
                                        <span>Choose anywhere from 1 to 5 spaces ahead or back.</span>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        {teamNames.map((name, teamIndex) => {
                                            if (teamIndex === pendingBonusChoice.teamId) return null;
                                            const actionLabel = pendingBonusChoice.effect.type === 'swap-positions'
                                                ? `Swap with ${name}`
                                                : pendingBonusChoice.effect.type === 'move-rival-back'
                                                    ? `${name} back 5`
                                                    : `Send ${name} down`;
                                            return (
                                                <button
                                                    key={teamIndex}
                                                    type="button"
                                                    onClick={() => resolveOpponentBonus(teamIndex)}
                                                    className={`snl-bonus-opponent-button rounded-xl font-black ${isMobileViewport ? 'px-1.5 py-1.5 text-[10px]' : 'px-3 py-3 text-sm'}`}
                                                >
                                                    <span className="block">{actionLabel}</span>
                                                    <span className="snl-bonus-opponent-position mt-0.5 block text-[10px] font-bold">Square {positions[teamIndex] + 1}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {!showExpandedBonusCard && phase === 'ladder-snake' && (
                            <div className="text-center animate-fade-in">
                                <AlertTriangle size={64} className="text-orange-500 mx-auto mb-4 animate-pulse" />
                                <h3 className={`snl-status-title font-bold ${isBonusStatus ? 'text-5xl md:text-6xl text-brand-yellow drop-shadow-xl uppercase tracking-[0.3em]' : 'text-xl'}`}>
                                    {statusMessage}
                                </h3>
                            </div>
                        )}

                        {!showExpandedBonusCard && phase === 'turn-complete' && (
                            <div className="snl-turn-complete-state animate-fade-in">
                                <div className="snl-turn-complete-seal" aria-hidden="true">
                                    <CheckCircle size={isMobileViewport ? 28 : 46} />
                                </div>
                                <span className="snl-turn-complete-label">Move resolved</span>
                                <h3 className="snl-turn-complete-title">
                                    {extraTurnTeamId !== null ? 'Bonus Turn!' : 'Turn Complete'}
                                </h3>
                                <p className="snl-turn-complete-copy">
                                    {turnCompleteCopy}
                                </p>
                                <button 
                                    onClick={nextTurn}
                                    className="snl-panel-primary snl-turn-complete-action"
                                >
                                    <span>{turnCompleteAction}</span>
                                    <ArrowRight size={isMobileViewport ? 17 : 20} />
                                </button>
                            </div>
                        )}
                    </div>
                </aside>
                </div>

                {showExpandedBonusCard && bonusCardDetails && collectedBonusCard && (
                    <div
                        className="snl-bonus-card-overlay animate-fade-in"
                        role="dialog"
                        aria-modal="true"
                        aria-label={`${bonusCardDetails.title} bonus card`}
                    >
                        <article className="snl-bonus-card" aria-label={`Bonus card: ${bonusCardDetails.title}`}>
                            <div className="snl-bonus-card-corners" aria-hidden="true" />
                            <div className="snl-bonus-card-label">{bonusCardDetails.label}</div>
                            <BonusCardOrbPreview reducedMotion={prefersReducedMotion} />
                            <h3>{bonusCardDetails.title}</h3>
                            <p className="snl-bonus-card-story">{bonusCardDetails.story}</p>
                            <p className="snl-bonus-card-action">{bonusCardDetails.action}</p>
                            <button
                                type="button"
                                onClick={useCollectedBonusCard}
                                className="snl-bonus-card-use"
                            >
                                Use card
                            </button>
                        </article>
                    </div>
                )}
            </div>

            {/* QUESTION MODAL */}
            {phase === 'question' && currentQuestion && isQuestionVisible && (
                <div
                    className={`snl-question-overlay ${isMobileViewport
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
                            className="snl-question-peek absolute -top-12 right-0 px-4 py-2 rounded-lg font-bold flex items-center z-[210] transition-colors"
                        >
                            <Eye size={18} className="mr-2" /> Peek at Board
                        </button>

                        <div className={`relative w-full h-full transition-all duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                            {/* FRONT */}
                            <div className={`snl-question-card absolute inset-0 [backface-visibility:hidden] [transform:translateZ(0)] rounded-2xl overflow-hidden flex flex-col h-full ${isFlipped ? 'pointer-events-none' : ''}`}>
                                <div className="snl-question-card-header p-3 sm:p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 h-[clamp(72px,12vh,96px)] sm:h-20 md:h-24 flex-shrink-0">
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                                        <div className="font-bold text-sm sm:text-xl opacity-90">Question for {teamNames[currentTeamId]}</div>
                                        <div className="snl-question-roll px-3 py-1 rounded-full text-xs sm:text-sm font-bold">You rolled a {diceValue}</div>
                                    </div>
                                    <div className={`font-bold ${targetStatus.size} ${targetStatus.color}`}>
                                        {targetStatus.text}
                                    </div>
                                </div>
                                <div className={`snl-question-card-body flex-grow w-full flex flex-col px-0 ${hasOptions ? 'pt-3 sm:pt-4 md:pt-6 pb-0' : 'py-3 sm:py-4 md:py-6'} relative overflow-hidden z-0`}>
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
                                                        className={`snl-question-image h-full w-full rounded-xl object-contain ${isMobileViewport ? '' : 'cursor-zoom-in'}`}
                                                    />
                                                </div>
                                                <div
                                                    ref={questionWrapRef}
                                                    className={`flex-1 min-h-0 flex items-center justify-center ${isMobileViewport ? 'text-center' : 'text-left'}`}
                                                >
                                                    <div
                                                        ref={questionTextRef}
                                                        style={questionFontSize ? { fontSize: `${questionFontSize}px`, lineHeight: '1.15' } : undefined}
                                                        className={`snl-question-text font-display font-bold leading-tight w-full whitespace-pre-wrap break-normal hyphens-none ${isMobileViewport ? 'text-center' : 'text-left'} ${getFontSizeClass(currentQuestion.question)}`}
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
                                                                        onClick={() => handleMcSelect(opt)}
                                                                        style={optionFontSize ? { fontSize: `${optionFontSize}px`, lineHeight: '1.2' } : undefined}
                                                                    className={`snl-question-option relative p-3 sm:p-4 md:p-5 border-2 rounded-none font-bold transition-all text-center flex items-center justify-center w-full h-full whitespace-normal break-normal hyphens-none focus:outline-none ${uniformSize}`}
                                                                >
                                                                    <span
                                                                        aria-hidden="true"
                                                                        data-option-label="true"
                                                                        className="snl-question-option-label hidden sm:inline-flex absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 items-center justify-center w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full text-base sm:text-lg md:text-xl font-black"
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
                                                className={`snl-question-image h-40 sm:h-48 md:h-56 w-full rounded-xl object-contain ${isMobileViewport ? '' : 'cursor-zoom-in'}`}
                                            />
                                            <div ref={questionWrapRef} className="w-full flex-1 min-h-0 flex items-center justify-center">
                                                <div
                                                    ref={questionTextRef}
                                                    style={questionFontSize ? { fontSize: `${questionFontSize}px`, lineHeight: '1.15' } : undefined}
                                                    className={`snl-question-text font-display font-bold leading-tight text-center w-full whitespace-pre-wrap break-normal hyphens-none ${getFontSizeClass(currentQuestion.question)}`}
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
                                                    className={`snl-question-text font-display font-bold leading-tight text-center w-full whitespace-pre-wrap break-normal hyphens-none ${getFontSizeClass(currentQuestion.question)}`}
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
                                                                        onClick={() => handleMcSelect(opt)}
                                                                        style={optionFontSize ? { fontSize: `${optionFontSize}px`, lineHeight: '1.2' } : undefined}
                                                                    className={`snl-question-option relative p-3 sm:p-4 md:p-5 border-2 rounded-none font-bold transition-all text-center flex items-center justify-center w-full h-full whitespace-normal break-normal hyphens-none focus:outline-none ${uniformSize}`}
                                                                >
                                                                    <span
                                                                        aria-hidden="true"
                                                                        data-option-label="true"
                                                                        className="snl-question-option-label hidden sm:inline-flex absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 items-center justify-center w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full text-base sm:text-lg md:text-xl font-black"
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
                                <div className={`snl-question-footer flex flex-col relative flex-shrink-0 z-50 ${hasOptions ? 'h-[clamp(38px,6.5vh,46px)] sm:h-[clamp(32px,5.5vh,40px)] px-0 py-0' : 'h-[clamp(76px,12vh,104px)] sm:h-[clamp(88px,14vh,120px)] px-3 sm:px-4 md:px-8 py-1 sm:py-2 md:py-0'}`}>
                                    {options.timerSeconds > 0 && (
                                        <div className={`snl-question-timer relative ${hasOptions ? 'h-full' : 'h-[clamp(38px,6.5vh,46px)] sm:h-[clamp(32px,5.5vh,40px)] -mx-3 sm:-mx-4 md:-mx-8'} overflow-hidden flex items-center justify-start pointer-events-none`}>
                                            {!isTimesUp && (
                                                <div 
                                                    className="snl-question-timer-fill absolute inset-y-0 left-0 transition-all duration-1000"
                                                    style={{ width: `${timerProgress * 100}%` }}
                                                />
                                            )}
                                            <div className="absolute inset-0 flex items-center justify-center text-sm sm:text-lg md:text-xl font-black tracking-wider">
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
                                                className="snl-question-primary px-10 py-3 rounded-full font-bold text-2xl hover:scale-105 transition-transform flex items-center relative z-50"
                                            >
                                                Reveal Answer
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* BACK */}
                            <div className={`snl-question-card snl-question-card-back absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl overflow-hidden flex flex-col h-full ${!isFlipped ? 'pointer-events-none' : ''}`}>
                                <div className="snl-question-card-header p-4 flex justify-between items-center h-20 flex-shrink-0">
                                    <div className="font-bold text-xl opacity-80">Answer</div>
                                </div>
                                <div className="snl-question-card-body flex-1 flex flex-col items-center justify-center p-8 text-center">
                                    {currentQuestion.options && mcResult && (
                                        <div className="mb-6 animate-bounce">
                                            {mcResult === 'correct' ? (
                                                <div className="flex flex-col items-center text-green-500"><CheckCircle size={64} className="mb-2" /><h2 className="text-4xl font-black">CORRECT!</h2></div>
                                            ) : (
                                                <div className="flex flex-col items-center text-red-500"><XCircle size={64} className="mb-2" /><h2 className="text-4xl font-black">INCORRECT</h2></div>
                                            )}
                                        </div>
                                    )}
                                    <div className={`snl-question-text font-display font-bold leading-tight whitespace-pre-wrap ${getFontSizeClass(currentQuestion.answer)}`}>
                                        {currentQuestion.answer}
                                    </div>
                                </div>
                                <div className="h-24 flex gap-0 flex-shrink-0">
                                    {currentQuestion.options && currentQuestion.options.length > 0 ? (
                                        <button 
                                            disabled={flipLock || isProcessing}
                                            onClick={() => handleAnswer(mcResult === 'correct')} 
                                            className={`snl-question-continue ${mcResult === 'correct' ? 'is-correct' : 'is-incorrect'} flex-1 font-black text-3xl sm:text-4xl transition-colors ${flipLock ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            Continue
                                        </button>
                                    ) : (
                                        <>
                                            <button 
                                                disabled={flipLock || isProcessing}
                                                onClick={() => handleAnswer(false)} 
                                                className={`snl-question-judge is-wrong flex-1 font-bold text-2xl transition-colors ${flipLock ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                Wrong
                                            </button>
                                            <button 
                                                disabled={flipLock || isProcessing}
                                                onClick={() => handleAnswer(true)} 
                                                className={`snl-question-judge is-correct flex-1 font-bold text-2xl transition-colors ${flipLock ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                            <X size={18} />
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

            {/* RESTORE MODAL BUTTON */}
            {phase === 'question' && !isQuestionVisible && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[250] animate-bounce">
                    <button 
                        onClick={() => setIsQuestionVisible(true)}
                        className="snl-question-primary px-8 py-4 rounded-full font-bold shadow-2xl flex items-center text-xl"
                    >
                        <EyeOff size={24} className="mr-3" /> Show Question
                    </button>
                </div>
            )}

            {showCredits && (
                <div
                    className="snl-credits-overlay animate-fade-in"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) setShowCredits(false);
                    }}
                >
                    <section
                        className="snl-credits-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="snl-credits-title"
                    >
                        <div className="snl-credits-heading">
                            <div className="snl-credits-emblem" aria-hidden="true">
                                <Info size={22} />
                            </div>
                            <div>
                                <p>Behind the game</p>
                                <h2 id="snl-credits-title">Asset Credits</h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCredits(false)}
                                className="snl-credits-close"
                                aria-label="Close asset credits"
                            >
                                <X size={21} />
                            </button>
                        </div>

                        <p className="snl-credits-intro">
                            This game uses the following Creative Commons 3D artwork.
                        </p>

                        <div className="snl-credits-list">
                            <article className="snl-credit-entry">
                                <span>3D room</span>
                                <h3>Cozy room with chess table (XYZ school homework)</h3>
                                <p>Created by <strong>dejarte</strong> | Modified for this game</p>
                                <div className="snl-credit-links">
                                    <a href="https://sketchfab.com/3d-models/cozy-room-with-chess-table-xyz-school-homework-2c53b9fb178f4b938d21b2bdfdc65268" target="_blank" rel="noopener noreferrer">
                                        View original asset
                                    </a>
                                    <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">
                                        CC BY 4.0 licence
                                    </a>
                                </div>
                            </article>

                            {options.enableBonuses && (
                                <article className="snl-credit-entry">
                                    <span>Bonus model</span>
                                    <h3>Star orb</h3>
                                    <p>Created by <strong>tamminen</strong> | Modified for this game</p>
                                    <div className="snl-credit-links">
                                        <a href="https://sketchfab.com/3d-models/star-orb-6328e644bd8f46eabc3d7332febab31d" target="_blank" rel="noopener noreferrer">
                                            View original asset
                                        </a>
                                        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">
                                            CC BY 4.0 licence
                                        </a>
                                    </div>
                                </article>
                            )}
                        </div>

                        <button type="button" onClick={() => setShowCredits(false)} className="snl-credits-done">
                            Back to game
                        </button>
                    </section>
                </div>
            )}

            {showQuitConfirm && (
                <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
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

            {showEndGameConfirm && (
                <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white text-slate-900 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl border border-slate-100">
                        <h2 className="text-2xl font-bold mb-2">End game now?</h2>
                        <p className="text-slate-500 mb-6">The game will stop and move to the winners screen.</p>
                        <div className="flex space-x-4">
                            <button
                                onClick={() => setShowEndGameConfirm(false)}
                                className="flex-1 py-3 bg-slate-100 font-bold rounded-lg hover:bg-slate-200 text-slate-700"
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

