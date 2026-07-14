import React, { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

type Vector3Tuple = [number, number, number];

interface CozyChessRoomModelProps {
    position?: Vector3Tuple;
    rotation?: Vector3Tuple;
    scale?: number | Vector3Tuple;
    onReady?: () => void;
}

const COZY_CHESS_ROOM_URL = '/models/cozy_room_with_chess_table_xyz_school_homework.glb';
const CHESS_MATERIAL_PATTERN = /^(?:blackchess|whitechess|kletki)/i;
const CHESS_SQUARE_PATTERN = /^kletki/i;

export const CozyChessRoomModel: React.FC<CozyChessRoomModelProps> = ({
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = 1,
    onReady,
}) => {
    const { scene } = useGLTF(COZY_CHESS_ROOM_URL);
    const hasReportedReady = useRef(false);

    const model = useMemo(() => {
        const clonedScene = scene.clone(true);
        clonedScene.updateMatrixWorld(true);

        const chessBoardBounds = new THREE.Box3();
        let hasChessBoardBounds = false;

        clonedScene.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return;

            object.castShadow = true;
            object.receiveShadow = true;

            const materials = Array.isArray(object.material) ? object.material : [object.material];
            const materialNames = materials.map((material) => material?.name ?? '');

            if (materialNames.some((name) => CHESS_SQUARE_PATTERN.test(name))) {
                chessBoardBounds.expandByObject(object);
                hasChessBoardBounds = true;
            }

            // Remove the chess squares and every chess piece while retaining the
            // imported wooden table, drawers, room and decorative furniture.
            if (materialNames.some((name) => CHESS_MATERIAL_PATTERN.test(name))) {
                object.visible = false;
            }
        });

        if (hasChessBoardBounds) {
            const tableCenter = chessBoardBounds.getCenter(new THREE.Vector3());
            clonedScene.position.set(
                -tableCenter.x,
                -chessBoardBounds.max.y,
                -tableCenter.z
            );
        }

        return clonedScene;
    }, [scene]);

    useEffect(() => {
        if (hasReportedReady.current) return;
        hasReportedReady.current = true;
        onReady?.();
    }, [onReady]);

    return (
        <group position={position} rotation={rotation} scale={scale}>
            <primitive object={model} dispose={null} />
        </group>
    );
};

useGLTF.preload(COZY_CHESS_ROOM_URL);
