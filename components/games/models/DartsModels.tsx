import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const OLD_BAR_URL = '/models/old_bar.glb';
const DARTBOARD_URL = '/models/winmau_blade_5_dart_board.glb';
const DART_URL = '/models/dart.glb';

const expandOuterNumberRail = (source: THREE.Object3D) => {
    const railMeshes: THREE.Mesh[] = [];

    source.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        if (!materials.some((material) => material.name === 'White')) return;
        object.geometry = object.geometry.clone();
        railMeshes.push(object);
    });

    const offsets: number[] = [];
    const positions: THREE.BufferAttribute[] = [];
    let vertexCount = 0;

    railMeshes.forEach((mesh) => {
        offsets.push(vertexCount);
        const position = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
        positions.push(position);
        vertexCount += position.count;
    });

    if (vertexCount === 0) return;

    const parents = Array.from({ length: vertexCount }, (_, index) => index);
    const find = (index: number): number => {
        if (parents[index] !== index) parents[index] = find(parents[index]);
        return parents[index];
    };
    const union = (left: number, right: number) => {
        const leftRoot = find(left);
        const rightRoot = find(right);
        if (leftRoot !== rightRoot) parents[rightRoot] = leftRoot;
    };

    const weldedVertices = new Map<string, number>();
    positions.forEach((position, meshIndex) => {
        const offset = offsets[meshIndex];
        for (let index = 0; index < position.count; index += 1) {
            const key = `${Math.round(position.getX(index) * 10000)},${Math.round(position.getY(index) * 10000)},${Math.round(position.getZ(index) * 10000)}`;
            const globalIndex = offset + index;
            const existing = weldedVertices.get(key);
            if (existing === undefined) weldedVertices.set(key, globalIndex);
            else union(existing, globalIndex);
        }
    });

    railMeshes.forEach((mesh, meshIndex) => {
        const offset = offsets[meshIndex];
        const index = mesh.geometry.getIndex();
        const count = index ? index.count : positions[meshIndex].count;
        const vertexAt = (item: number) => offset + (index ? index.getX(item) : item);
        for (let item = 0; item + 2 < count; item += 3) {
            const first = vertexAt(item);
            union(first, vertexAt(item + 1));
            union(first, vertexAt(item + 2));
        }
    });

    const componentSizes = new Map<number, number>();
    for (let index = 0; index < vertexCount; index += 1) {
        const root = find(index);
        componentSizes.set(root, (componentSizes.get(root) || 0) + 1);
    }
    const railRoot = [...componentSizes.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
    if (railRoot === undefined) return;

    positions.forEach((position, meshIndex) => {
        const offset = offsets[meshIndex];
        for (let index = 0; index < position.count; index += 1) {
            if (find(offset + index) !== railRoot) continue;
            position.setXYZ(index, position.getX(index) * 1.055, position.getY(index), position.getZ(index) * 1.055);
        }
        position.needsUpdate = true;
        railMeshes[meshIndex].geometry.computeBoundingBox();
        railMeshes[meshIndex].geometry.computeBoundingSphere();
    });
};

const cloneForScene = (source: THREE.Object3D, shadows: boolean, doubleSided = false) => {
    const clone = source.clone(true);
    clone.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        // This is an intentionally invisible export shell. Leaving it in the
        // depth pass can obscure real room surfaces as the camera moves.
        if (object.name === 'BackSide_1') {
            object.visible = false;
            return;
        }
        object.castShadow = shadows;
        object.receiveShadow = shadows;
        if (doubleSided) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            const interiorMaterials = materials.map((sourceMaterial) => {
                const material = sourceMaterial.clone();
                material.side = THREE.DoubleSide;
                material.needsUpdate = true;
                return material;
            });
            object.material = Array.isArray(object.material) ? interiorMaterials : interiorMaterials[0];
        }
    });
    clone.updateMatrixWorld(true);
    return clone;
};

export const OldBarRoomModel: React.FC<{ lightweight?: boolean }> = ({ lightweight = false }) => {
    const { scene } = useGLTF(OLD_BAR_URL);

    const { model, scale, offset } = useMemo(() => {
        // Keep the pub's authored face directions and transparency settings.
        // Forcing every surface to draw from both sides changes transparent
        // surface ordering and makes ceiling pieces appear through the wall.
        const clonedScene = cloneForScene(scene, !lightweight);
        // Turn the room so the long walk beside the bar leads to the large
        // blank end wall used for the dartboard in the reference sequence.
        clonedScene.rotation.y = Math.PI / 2;
        clonedScene.updateMatrixWorld(true);

        const bounds = new THREE.Box3().setFromObject(clonedScene);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());

        // The loaded asset is already Y-up. Normalize it uniformly so its
        // proportions remain intact, then anchor the floor and far wall.
        const roomScale = 54 / Math.max(size.x, size.z, 0.0001);
        return {
            model: clonedScene,
            scale: roomScale,
            offset: new THREE.Vector3(-center.x, -bounds.min.y, -bounds.max.z),
        };
    }, [scene, lightweight]);

    return (
        <group position={[0, -5.5, 0.7]} scale={scale}>
            <primitive object={model} position={offset} dispose={null} />
        </group>
    );
};

export const ImportedDartboardModel: React.FC<{ radius?: number }> = ({ radius: targetRadius = 3.5 }) => {
    const { scene } = useGLTF(DARTBOARD_URL);

    const { model, scale, offset } = useMemo(() => {
        const clonedScene = cloneForScene(scene, true);
        const bounds = new THREE.Box3().setFromObject(clonedScene);
        const center = bounds.getCenter(new THREE.Vector3());
        const radius = Math.max(bounds.max.x - center.x, bounds.max.z - center.z, 0.0001);
        expandOuterNumberRail(clonedScene);

        return {
            model: clonedScene,
            scale: targetRadius / radius,
            offset: center.multiplyScalar(-1),
        };
    }, [scene]);

    // The exported scene already includes the rotations that make the board
    // face forward. Normalizing the loaded bounds is sufficient here.
    return (
        <group scale={scale}>
            <primitive object={model} position={offset} dispose={null} />
        </group>
    );
};

export const ImportedDartModel: React.FC<{ color?: string }> = ({ color = '#d71920' }) => {
    const { scene } = useGLTF(DART_URL);

    const { model, scale, offset } = useMemo(() => {
        const clonedScene = cloneForScene(scene, true);

        // The source file contains a red dart and a blue dart side by side.
        // A throw needs one dart, so retain the first model and remove the
        // duplicate variant before measuring and positioning it.
        const dartsRoot = clonedScene.getObjectByName('GLTF_SceneRootNode');
        if (dartsRoot) {
            // GLTFLoader sanitizes punctuation in node names, so remove the
            // second dart by its paired top-level groups instead of relying on
            // the original Blender names.
            dartsRoot.children.slice(2).forEach((duplicatePart) => {
                dartsRoot.remove(duplicatePart);
            });
        }

        clonedScene.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return;
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            const styledMaterials = materials.map((sourceMaterial) => {
                const material = sourceMaterial.clone();
                if (material.name === 'Material.003' && 'color' in material) {
                    (material as THREE.MeshStandardMaterial).color.set(color);
                }
                if (material.name === 'Material.002' && 'color' in material) {
                    const shaft = material as THREE.MeshStandardMaterial;
                    shaft.color.set('#59636e');
                    shaft.metalness = 0.32;
                    shaft.roughness = 0.48;
                }
                if (material.name === 'Material.001' && 'color' in material) {
                    const polishedSilver = material as THREE.MeshStandardMaterial;
                    polishedSilver.color.set('#ffffff');
                    polishedSilver.metalness = 0.72;
                    polishedSilver.roughness = 0.08;
                    polishedSilver.emissive.set('#34383d');
                    polishedSilver.emissiveIntensity = 0.32;
                    polishedSilver.envMapIntensity = 4;
                }
                return material;
            });
            object.material = Array.isArray(object.material) ? styledMaterials : styledMaterials[0];
        });

        const bounds = new THREE.Box3().setFromObject(clonedScene);
        const center = bounds.getCenter(new THREE.Vector3());
        const length = Math.max(bounds.max.y - bounds.min.y, 0.0001);

        // The source dart points toward its maximum Y end. Put that steel tip
        // at the group's origin so the shaft and flights trail toward the player.
        return {
            model: clonedScene,
            scale: 0.95 / length,
            offset: new THREE.Vector3(-center.x, -bounds.max.y, -center.z),
        };
    }, [scene, color]);

    return (
        <group rotation={[Math.PI / 2, 0, 0]} scale={scale}>
            <primitive object={model} position={offset} dispose={null} />
        </group>
    );
};

useGLTF.preload(OLD_BAR_URL);
useGLTF.preload(DARTBOARD_URL);
useGLTF.preload(DART_URL);
