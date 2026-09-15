"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Earth, EARTH_RADIUS } from "./Earth";
import { Halo } from "./Halo";
import { CanonMarkers, type CanonMarker } from "./CanonMarkers";
import { useReducedMotion } from "./useReducedMotion";
import { useMemo } from "react";
import * as THREE from "three";

function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

// Base auto-rotate rate for decorative mounts (three.js units, roughly one
// full turn every ~5 minutes at this speed). Kept slow, so this globe
// reads as ambient background motion the eye can ignore while scrolling.
const DECORATIVE_BASE_AUTOROTATE_SPEED = 0.35;
// Decay rate (per second) applied to the scroll-speed ref, and the lerp
// rate the actual OrbitControls speed eases toward its target at.
const SCROLL_EXTRA_DECAY = 2.2;
const AUTOROTATE_EASE = 3;

/**
 * Reads an external scroll-velocity speed ref every frame, decays it back
 * toward zero, and eases the mounted OrbitControls' autoRotateSpeed toward
 * base rate plus that extra. Only mounted for a decorative globe with
 * autoRotate on, keeps the interactive globe's frame loop untouched.
 */
function AutoRotateDriver({
  controlsRef,
  scrollSpeedRef,
  base,
}: {
  controlsRef: MutableRefObject<OrbitControlsImpl | null>;
  scrollSpeedRef?: MutableRefObject<number>;
  base: number;
}) {
  useFrame((_state, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const extra = scrollSpeedRef?.current ?? 0;
    if (scrollSpeedRef) {
      scrollSpeedRef.current = extra * Math.exp(-SCROLL_EXTRA_DECAY * delta);
    }
    const target = base + extra;
    controls.autoRotateSpeed = damp(controls.autoRotateSpeed, target, AUTOROTATE_EASE, delta);
  });
  return null;
}

/**
 * Drives camera distance + position into React state via OrbitControls'
 * change event. We're on frameloop="demand" so we can't sample
 * camera.position every frame, but every user zoom/rotate fires
 * `change` on the controls, and we propagate that to setters so marker
 * LOD (size) and front-face filtering (which side of the globe a pin
 * is on) can both react.
 */
function CameraTracker({
  controlsRef,
  onDistance,
  onPosition,
}: {
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
  onDistance: (d: number) => void;
  onPosition: (xyz: [number, number, number]) => void;
}) {
  const { camera, invalidate } = useThree();
  useEffect(() => {
    const c = controlsRef.current;
    if (!c) return;
    const handler = () => {
      onDistance(camera.position.length());
      onPosition([camera.position.x, camera.position.y, camera.position.z]);
      invalidate();
    };
    handler(); // seed initial values
    c.addEventListener("change", handler);
    return () => c.removeEventListener("change", handler);
  }, [controlsRef, camera, onDistance, onPosition, invalidate]);
  return null;
}

interface CanonGlobeProps {
  markers?: CanonMarker[];
  activeIndex?: number;
  className?: string;
  onHoverChange?: (m: CanonMarker | null) => void;
  onSelectChange?: (m: CanonMarker | null) => void;
  /** Chromeless background mode: user drag/zoom disabled, a slow base
   * auto-rotate is enabled instead (skipped under prefers-reduced-motion,
   * which renders a static globe). */
  decorative?: boolean;
  /** Read every frame when `decorative` is on: an external scroll-velocity
   * value that eases the auto-rotate speed up and back down to base rate. */
  scrollSpeedRef?: MutableRefObject<number>;
}

const LANDMASK_URL = "/textures/earth/landmask-2k.bin";

export default function CanonGlobe({
  markers = [],
  activeIndex,
  className,
  onHoverChange,
  onSelectChange,
  decorative = false,
  scrollSpeedRef,
}: CanonGlobeProps) {
  const reducedMotion = useReducedMotion();
  const autoRotate = decorative && !reducedMotion;
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  // Camera distance from origin, in scene units (Earth radius = 1).
  // Seeded to match the camera's starting position (z=3.4 below).
  const [cameraDistance, setCameraDistance] = useState(3.4);
  // Camera position tuple. Used by CanonMarkers to compute which pins
  // face the camera (front hemisphere) vs which are occluded by the
  // globe itself. Hover should only fire on the front side; the back
  // side stays visible but is non-interactive so the cursor doesn't
  // catch on a marker that's geometrically behind 6 000 km of rock.
  const [cameraPosition, setCameraPosition] =
    useState<[number, number, number]>([0, 0, 3.4]);

  // Faint background star/dot field, cosmic context behind the globe.
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
        // Lower GPU pressure: cap DPR to 1, drop antialias. Helps on
        // browsers with shaky GPU drivers (Brave/Wayland/AMD on Linux
        // tends to crash with frequent context switches).
        dpr={1}
        frameloop="demand"  // only render on prop change / camera moves
        performance={{ min: 0.5 }}
        camera={{ position: [0, 0, 3.4], fov: 42 }}
        gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
      >
        {/* dot-globe is unlit (MeshBasicMaterial), ambient is harmless. */}
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
            reducedMotion={true /* let OrbitControls drive rotation */}
            landmaskUrl={LANDMASK_URL}
          >
            <CanonMarkers
              markers={markers}
              activeIndex={activeIndex}
              radius={EARTH_RADIUS * 1.008}
              reducedMotion={reducedMotion}
              cameraDistance={cameraDistance}
              cameraPosition={cameraPosition}
              onHoverChange={onHoverChange}
              onSelectChange={onSelectChange}
            />
          </Earth>
        </Suspense>
        <Halo enabled />

        {/* Drag to rotate + scroll to zoom. `minDistance` is set tight
 against the Earth surface (radius=1 in scene units) so users
 can drill into dense regions like Europe. The pins scale down
 with cameraDistance via CanonMarkers' LOD so dense clusters
 visually separate at close zoom. `rotateSpeed` is also scaled
 down adaptively, gentle nudges at high zoom let you fly
 along the coastline without overshooting. */}
        <OrbitControls
          ref={controlsRef}
          enableDamping={false}
          enableZoom={!decorative}
          enablePan={false}
          enableRotate={!decorative}
          // 1.0 is the Earth surface. 1.04 keeps us a hair above it so the
          // camera never clips through the dot pattern.
          minDistance={1.04}
          maxDistance={6}
          minPolarAngle={0.15}
          maxPolarAngle={Math.PI - 0.15}
          // Rotate slower the closer you get, at distance 3.4 the speed
          // is 0.5, at distance 1.05 it's ~0.16. This trick makes drilling
          // into Europe feel like a real fly-over rather than a snap-spin.
          rotateSpeed={Math.max(0.12, 0.5 * Math.min(1, (cameraDistance - 1) / 2.4))}
          // Zoom logarithmically, wider steps at far view, finer at
          // close zoom so the last "click" doesn't overshoot the surface.
          zoomSpeed={Math.max(0.25, 0.7 * Math.min(1, (cameraDistance - 1) / 2.4))}
          autoRotate={autoRotate}
          autoRotateSpeed={DECORATIVE_BASE_AUTOROTATE_SPEED}
        />
        <CameraTracker
          controlsRef={controlsRef}
          onDistance={setCameraDistance}
          onPosition={setCameraPosition}
        />
        {autoRotate && (
          <AutoRotateDriver
            controlsRef={controlsRef}
            scrollSpeedRef={scrollSpeedRef}
            base={DECORATIVE_BASE_AUTOROTATE_SPEED}
          />
        )}
      </Canvas>
    </div>
  );
}
