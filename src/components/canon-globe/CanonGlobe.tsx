"use client";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { OrbitControls } from "@react-three/drei";
import { Earth, EARTH_RADIUS } from "./Earth";
import { Halo } from "./Halo";
import { CanonMarkers, type CanonMarker } from "./CanonMarkers";
import { useReducedMotion } from "./useReducedMotion";
import { useMemo } from "react";
import * as THREE from "three";

interface CanonGlobeProps {
  markers?: CanonMarker[];
  activeIndex?: number;
  className?: string;
  onHoverChange?: (m: CanonMarker | null) => void;
}

const LANDMASK_URL = "/textures/earth/2k_earth_daymap.jpg";

export default function CanonGlobe({
  markers = [],
  activeIndex,
  className,
  onHoverChange,
}: CanonGlobeProps) {
  const reducedMotion = useReducedMotion();

  // Faint background star/dot field — cosmic context behind the globe.
  // Bone-tinted so it reads on light bg without going black.
  const stars = useMemo(() => {
    const N = 600;
    const pts = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      // sample on a far sphere, biased away from camera origin
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const r = 12 + Math.random() * 6;
      const s = Math.sqrt(1 - u * u);
      pts[i * 3]     = r * s * Math.cos(t);
      pts[i * 3 + 1] = r * u;
      pts[i * 3 + 2] = r * s * Math.sin(t);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    return geo;
  }, []);

  return (
    <div className={className} style={{ width: "100%", height: "100%" }}>
      <Canvas
        dpr={[1, 2]}
        performance={{ min: 0.6 }}
        camera={{ position: [0, 0, 3.4], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
      >
        {/* dot-globe is unlit (MeshBasicMaterial) — ambient is harmless. */}
        <ambientLight intensity={0.5} />

        {/* far-field starlike dots, gold-flecked */}
        <points geometry={stars}>
          <pointsMaterial
            size={0.04}
            color="#B8861E"
            transparent
            opacity={0.35}
            sizeAttenuation
            depthWrite={false}
          />
        </points>

        <Suspense fallback={null}>
          <Earth
            targetRotationY={0}
            reducedMotion={true /* OrbitControls handles rotation now */}
            landmaskUrl={LANDMASK_URL}
          >
            <CanonMarkers
              markers={markers}
              activeIndex={activeIndex}
              radius={EARTH_RADIUS * 1.008}
              reducedMotion={reducedMotion}
              onHoverChange={onHoverChange}
            />
          </Earth>
        </Suspense>
        <Halo enabled />

        {/* Google-Earth-style controls: drag to spin, scroll to zoom, no pan.
            Auto-rotates slowly when idle (like an attract loop). User
            interaction temporarily stops auto-rotation; resumes after 4s. */}
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          enableZoom
          enablePan={false}
          minDistance={1.8}      // can't get inside the globe
          maxDistance={8}        // can't fly away forever
          minPolarAngle={0.1}    // don't flip over the poles
          maxPolarAngle={Math.PI - 0.1}
          rotateSpeed={0.55}     // smooth, not twitchy
          zoomSpeed={0.7}
          autoRotate={!reducedMotion}
          autoRotateSpeed={0.4}  // 1 full revolution every ~15 minutes — gentle
        />
      </Canvas>
    </div>
  );
}
