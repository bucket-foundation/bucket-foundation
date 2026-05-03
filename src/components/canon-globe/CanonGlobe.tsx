"use client";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Earth, EARTH_RADIUS } from "./Earth";
import { Halo } from "./Halo";
import { CanonMarkers, type CanonMarker } from "./CanonMarkers";
import { useReducedMotion, useIsDesktop } from "./useReducedMotion";

interface CanonGlobeProps {
  markers?: CanonMarker[];
  activeIndex?: number;
  className?: string;
}

const LANDMASK_URL = "/textures/earth/2k_earth_daymap.jpg";

export default function CanonGlobe({
  markers = [],
  activeIndex,
  className,
}: CanonGlobeProps) {
  const reducedMotion = useReducedMotion();
  const isDesktop = useIsDesktop(1024);

  return (
    <div className={className} style={{ width: "100%", height: "100%" }}>
      <Canvas
        dpr={[1, 2]}
        performance={{ min: 0.6 }}
        camera={{ position: [0, 0, 2.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        {/* dot-globe is unlit (MeshBasicMaterial) — ambient is harmless. */}
        <ambientLight intensity={0.5} />
        <Suspense fallback={null}>
          <Earth
            targetRotationY={0}
            reducedMotion={reducedMotion}
            landmaskUrl={LANDMASK_URL}
          >
            <CanonMarkers
              markers={markers}
              activeIndex={activeIndex}
              radius={EARTH_RADIUS * 1.008}
              reducedMotion={reducedMotion}
            />
          </Earth>
        </Suspense>
        <Halo enabled={isDesktop} />
      </Canvas>
    </div>
  );
}
