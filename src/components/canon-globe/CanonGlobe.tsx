"use client";
import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo } from "react";
import { Earth, EARTH_RADIUS } from "./Earth";
import { Halo } from "./Halo";
import { BranchPorts } from "./BranchPorts";
import { useReducedMotion, useIsDesktop } from "./useReducedMotion";
import type { GlobeBranch } from "../CanonGlobe";

interface CanonGlobeProps {
  branches: GlobeBranch[];
  activeIndex?: number;
  className?: string;
}

export default function CanonGlobe({
  branches,
  activeIndex,
  className,
}: CanonGlobeProps) {
  const reducedMotion = useReducedMotion();
  const isDesktop = useIsDesktop(1024);

  // Default activeIndex = the most-built branch (highest entryCount)
  const resolvedActive = useMemo(() => {
    if (typeof activeIndex === "number") return activeIndex;
    let best = 0, bestCount = -1;
    branches.forEach((b, i) => {
      if (b.entryCount > bestCount) { bestCount = b.entryCount; best = i; }
    });
    return best;
  }, [activeIndex, branches]);

  return (
    <div className={className} style={{ width: "100%", height: "100%" }}>
      <Canvas
        dpr={[1, 2]}
        performance={{ min: 0.6 }}
        camera={{ position: [0, 0, 2.8], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 2, 4]} intensity={1.1} />
        <directionalLight position={[-4, -1, -2]} intensity={0.25} />
        <Suspense fallback={null}>
          <Earth targetRotationY={0} reducedMotion={reducedMotion}>
            <BranchPorts
              branches={branches}
              activeIndex={resolvedActive}
              radius={EARTH_RADIUS * 1.005}
              reducedMotion={reducedMotion}
            />
          </Earth>
        </Suspense>
        <Halo enabled={isDesktop} />
      </Canvas>
    </div>
  );
}
