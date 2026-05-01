"use client";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Earth, EARTH_RADIUS } from "./Earth";
import { Halo } from "./Halo";
import { BranchPorts } from "./BranchPorts";
import { useReducedMotion, useIsDesktop } from "./useReducedMotion";
import type { GlobeBranch } from "../CanonGlobe";

export type CanonGlobeMode = "earth" | "stone";

interface CanonGlobeProps {
  branches: GlobeBranch[];
  activeIndex?: number;
  className?: string;
  mode?: CanonGlobeMode;
}

const TEXTURES: Record<CanonGlobeMode, { sd: string; hd: string }> = {
  earth: {
    sd: "/textures/earth/2k_earth_daymap.jpg",
    hd: "/textures/earth/8k_earth_daymap.jpg",
  },
  // Only one stone resolution shipped; reuse for both tiers.
  stone: {
    sd: "/textures/stone/moon_2k.jpg",
    hd: "/textures/stone/moon_2k.jpg",
  },
};

// Match kala's resolution gate: 8k only on real desktops with a real pointer.
function useTextureUrl(mode: CanonGlobeMode): string {
  const { sd, hd } = TEXTURES[mode];
  const [url, setUrl] = useState<string>(sd);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px) and (hover: hover)");
    const apply = () => setUrl(mq.matches ? hd : sd);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, [sd, hd]);
  return url;
}

export default function CanonGlobe({
  branches,
  activeIndex,
  className,
  mode = "earth",
}: CanonGlobeProps) {
  const reducedMotion = useReducedMotion();
  const isDesktop = useIsDesktop(1024);
  const textureUrl = useTextureUrl(mode);

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
          <Earth
            targetRotationY={0}
            reducedMotion={reducedMotion}
            textureUrl={textureUrl}
          >
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
