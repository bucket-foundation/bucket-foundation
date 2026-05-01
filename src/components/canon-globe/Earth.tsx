"use client";
import { useFrame, useLoader } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { TextureLoader } from "three";

// Real-texture Earth sphere. Procedural shader removed (founder feedback).
// Two modes available via `textureUrl` prop, resolved by the parent
// CanonGlobe wrapper from a {2k, 8k} pair.

interface EarthProps {
  targetRotationY: number;
  reducedMotion: boolean;
  textureUrl: string;
  children?: React.ReactNode;
}

const RADIUS = 1;

function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

export function Earth({
  targetRotationY,
  reducedMotion,
  textureUrl,
  children,
}: EarthProps) {
  const groupRef = useRef<THREE.Group>(null);
  const colorMap = useLoader(TextureLoader, textureUrl);

  useMemo(() => {
    colorMap.colorSpace = THREE.SRGBColorSpace;
    colorMap.anisotropy = 8;
  }, [colorMap]);

  useFrame((_state, delta) => {
    if (!groupRef.current) return;
    if (reducedMotion) {
      groupRef.current.rotation.y = targetRotationY;
    } else {
      const auto = 0.03 * delta;
      const blendedTarget = targetRotationY + auto * 12;
      groupRef.current.rotation.y = damp(
        groupRef.current.rotation.y,
        blendedTarget,
        4,
        delta
      );
    }
  });

  return (
    <group ref={groupRef} rotation={[0.35, 0, 0]}>
      <mesh>
        <sphereGeometry args={[RADIUS, 96, 96]} />
        <meshStandardMaterial
          map={colorMap}
          roughness={0.95}
          metalness={0.0}
          color={new THREE.Color(0xfaf3ee)}
        />
      </mesh>
      {children}
    </group>
  );
}

export const EARTH_RADIUS = RADIUS;
