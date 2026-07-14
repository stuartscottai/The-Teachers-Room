import React, { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

type Vector3Tuple = [number, number, number];

interface StarOrbModelProps {
    position?: Vector3Tuple;
    rotation?: Vector3Tuple;
    scale?: number | Vector3Tuple;
    reducedMotion?: boolean;
    animationOffset?: number;
}

const STAR_ORB_URL = '/models/star_orb.glb';

interface StarOrbTemplate {
    scene: THREE.Object3D;
    normalizationScale: number;
}

const styledTemplateCache = new WeakMap<THREE.Object3D, StarOrbTemplate>();

const getStyledTemplate = (sourceScene: THREE.Object3D): StarOrbTemplate => {
    const cachedTemplate = styledTemplateCache.get(sourceScene);
    if (cachedTemplate) return cachedTemplate;

    const styledScene = sourceScene.clone(true);

    styledScene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;

        // The board supplies a much cheaper painted shadow beneath each orb.
        // Keeping these moving meshes out of the real-time shadow map avoids
        // redrawing the complete room for every small bobbing movement.
        object.castShadow = false;
        object.receiveShadow = false;

        const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
        const styledMaterials = sourceMaterials.map((sourceMaterial) => {
            const material = sourceMaterial.clone();
            if (!(material instanceof THREE.MeshStandardMaterial)) return material;

            material.envMapIntensity = 1.15;
            if (material.name.toLowerCase() === 'outer') {
                material.color.set('#5d365f');
                material.metalness = 0.08;
                material.roughness = 0.09;
                material.emissive.set('#190b1c');
                material.emissiveIntensity = 0.14;
                material.transparent = true;
                material.opacity = 0.72;
                material.depthWrite = false;
                material.side = THREE.FrontSide;

                if (material instanceof THREE.MeshPhysicalMaterial) {
                    // Transparency, clearcoat and iridescence retain the bubble
                    // appearance without the costly live scene refraction pass.
                    material.transmission = 0;
                    material.thickness = 0;
                    material.clearcoat = 1;
                    material.clearcoatRoughness = 0.06;
                    material.iridescence = 0.34;
                    material.iridescenceIOR = 1.34;
                    material.specularIntensity = 1;
                }
            } else {
                material.color.set('#d4a6c9');
                material.metalness = 0.38;
                material.roughness = 0.16;
                material.emissive.set('#713269');
                material.emissiveIntensity = 0.46;

                if (material instanceof THREE.MeshPhysicalMaterial) {
                    material.clearcoat = 0.7;
                    material.clearcoatRoughness = 0.12;
                    material.specularIntensity = 0.95;
                }
            }
            material.needsUpdate = true;
            return material;
        });
        object.material = Array.isArray(object.material) ? styledMaterials : styledMaterials[0];
    });

    styledScene.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(styledScene);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const largestDimension = Math.max(size.x, size.y, size.z, 0.0001);
    styledScene.position.sub(center);

    const template = {
        scene: styledScene,
        normalizationScale: 1 / largestDimension,
    };
    styledTemplateCache.set(sourceScene, template);
    return template;
};

export const StarOrbModel: React.FC<StarOrbModelProps> = ({
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = 1,
    reducedMotion = false,
    animationOffset = 0,
}) => {
    const { scene } = useGLTF(STAR_ORB_URL);

    const {
        model,
        normalizationScale,
        innerStar,
        outerShell,
        innerBaseRotation,
        outerBaseRotation,
        outerBaseScale,
    } = useMemo(() => {
        const template = getStyledTemplate(scene);
        const clonedScene = template.scene.clone(true);

        const inner = clonedScene.getObjectByName('inner_0') ?? null;
        const outer = clonedScene.getObjectByName('outer_1') ?? null;

        return {
            model: clonedScene,
            normalizationScale: template.normalizationScale,
            innerStar: inner,
            outerShell: outer,
            innerBaseRotation: inner?.rotation.clone() ?? new THREE.Euler(),
            outerBaseRotation: outer?.rotation.clone() ?? new THREE.Euler(),
            outerBaseScale: outer?.scale.clone() ?? new THREE.Vector3(1, 1, 1),
        };
    }, [scene]);

    useFrame(({ clock }) => {
        if (!outerShell || !innerStar) return;

        if (reducedMotion) {
            outerShell.scale.copy(outerBaseScale);
            outerShell.rotation.copy(outerBaseRotation);
            innerStar.rotation.copy(innerBaseRotation);
            return;
        }

        const time = clock.getElapsedTime() + animationOffset;
        const widthPulse = Math.sin(time * 1.17) * 0.045;
        const heightPulse = Math.sin(time * 0.91 + 1.4) * 0.038;
        const depthPulse = Math.sin(time * 1.31 + 2.2) * 0.05;

        // The transparent skin moves independently, creating the soft,
        // asymmetrical wobble visible in the asset's original preview.
        outerShell.scale.set(
            outerBaseScale.x * (1 + widthPulse),
            outerBaseScale.y * (1 + heightPulse),
            outerBaseScale.z * (1 + depthPulse)
        );
        outerShell.rotation.set(
            outerBaseRotation.x + Math.sin(time * 0.48) * 0.035,
            outerBaseRotation.y + time * 0.11,
            outerBaseRotation.z + Math.sin(time * 0.57 + 0.8) * 0.04
        );
        innerStar.rotation.set(
            innerBaseRotation.x + Math.sin(time * 0.36) * 0.025,
            innerBaseRotation.y - time * 0.075,
            innerBaseRotation.z + Math.sin(time * 0.42 + 1.1) * 0.022
        );
    });

    return (
        <group position={position} rotation={rotation} scale={scale}>
            <group scale={normalizationScale}>
                <primitive object={model} dispose={null} />
            </group>
        </group>
    );
};

useGLTF.preload(STAR_ORB_URL);
