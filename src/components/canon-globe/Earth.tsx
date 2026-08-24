"use client";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { loadLandmask } from "./landmaskFromImage";

// github-globe-style dot earth. The visible "skin" is ~15k tiny basalt
// spheres placed where the daymap says there is land; the underlying sphere
// is near-transparent so the dots ARE the planet.
//
// Inspired by janarosmonaliev/github-globe (MIT) but implemented directly on
// R3F + three.js, no external globe library.

interface EarthProps {
  targetRotationY: number;
  reducedMotion: boolean;
  landmaskUrl: string;
  children?: React.ReactNode;
  /** number of fibonacci candidate points; ~15000 is the sweet spot. */
  sampleCount?: number;
  /** dot radius in scene units (sphere radius is 1). */
  dotRadius?: number;
}

const RADIUS = 1;

function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

// Fibonacci sphere, even angular distribution.
function fibonacciPoints(n: number): Array<{ lat: number; lng: number }> {
  const out: Array<{ lat: number; lng: number }> = [];
  const phi = Math.PI * (Math.sqrt(5) - 1); // golden angle
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2; // y in [-1,1]
    const r = Math.sqrt(1 - y * y);
    const theta = phi * i;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    const lat = Math.asin(y) * (180 / Math.PI);
    const lng = Math.atan2(z, x) * (180 / Math.PI);
    out.push({ lat, lng });
  }
  return out;
}

export function Earth({
  targetRotationY,
  reducedMotion,
  landmaskUrl,
  children,
  sampleCount = 36000,
  dotRadius = 0.0038,
}: EarthProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const [count, setCount] = useState(0);

  // Build a stable buffer of dot transforms once the landmask is loaded.
  const transforms = useMemo(
    () => ({
      matrices: new Float32Array(sampleCount * 16),
      colors: new Float32Array(sampleCount * 3),
    }),
    [sampleCount]
  );

  useEffect(() => {
    let cancelled = false;
    const dummy = new THREE.Object3D();
    const baseColor = new THREE.Color("#1F1C16"); // --basalt
    const warm = new THREE.Color("#3A3529");      // --basalt-3 (subtle equator tint)

    loadLandmask(landmaskUrl).then((mask) => {
      if (cancelled) return;
      const candidates = fibonacciPoints(sampleCount);
      const surface = RADIUS;
      let kept = 0;
      const tmpColor = new THREE.Color();
      for (let i = 0; i < candidates.length; i++) {
        const { lat, lng } = candidates[i];
        if (!mask.isLand(lat, lng)) continue;

        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lng + 180) * (Math.PI / 180);
        const x = surface * Math.sin(phi) * Math.sin(theta);
        const y = surface * Math.cos(phi);
        const z = surface * Math.sin(phi) * Math.cos(theta);
        dummy.position.set(x, y, z);
        // Orient each dot so its disc faces outward.
        dummy.lookAt(x * 2, y * 2, z * 2);
        dummy.updateMatrix();
        dummy.matrix.toArray(transforms.matrices, kept * 16);

        // Warm equator tint: weight basalt → basalt-3 by |cos(lat)|.
        const w = Math.pow(Math.cos(lat * (Math.PI / 180)), 2);
        tmpColor.copy(baseColor).lerp(warm, w * 0.45);
        tmpColor.toArray(transforms.colors, kept * 3);

        kept++;
      }

      if (cancelled) return;
      const mesh = meshRef.current;
      if (!mesh) return;
      // Allocate per-instance colors lazily.
      if (!mesh.instanceColor) {
        mesh.instanceColor = new THREE.InstancedBufferAttribute(
          new Float32Array(sampleCount * 3),
          3
        );
      }
      const tmpMat = new THREE.Matrix4();
      const tmpCol = new THREE.Color();
      for (let i = 0; i < kept; i++) {
        tmpMat.fromArray(transforms.matrices, i * 16);
        mesh.setMatrixAt(i, tmpMat);
        tmpCol.fromArray(transforms.colors, i * 3);
        mesh.setColorAt(i, tmpCol);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
      mesh.count = kept;
      setCount(kept);
    }).catch((err) => {
      // Non-fatal: globe will render as the faint sphere alone.
      console.warn("[CanonGlobe] landmask load failed:", err);
    });

    return () => { cancelled = true; };
  }, [landmaskUrl, sampleCount, transforms]);

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

  // Shared geometry for instanced dots, small, low-poly disc-like sphere.
  const dotGeo = useMemo(() => new THREE.SphereGeometry(dotRadius, 8, 8), [dotRadius]);
  const dotMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0x1f1c16,
        toneMapped: false,
      }),
    []
  );

  return (
    <group ref={groupRef} rotation={[0.35, 0, 0]}>
      {/* Faint underlying sphere, ghost of the planet, lets dots feel like skin. */}
      <mesh>
        <sphereGeometry args={[RADIUS * 0.998, 64, 64]} />
        <meshBasicMaterial
          color={0xefe8d4}
          transparent
          opacity={0.04}
          depthWrite={false}
        />
      </mesh>

      <instancedMesh
        ref={meshRef}
        args={[dotGeo, dotMat, sampleCount]}
        frustumCulled={false}
      />

      {/* expose count for debug; React ignores 0 children */}
      {count === 0 ? null : null}
      {children}
    </group>
  );
}

export const EARTH_RADIUS = RADIUS;
