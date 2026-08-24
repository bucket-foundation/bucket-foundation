"use client";
import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Earth, EARTH_RADIUS } from "./Earth";
import { Halo } from "./Halo";
import { CanonMarkers, type CanonMarker } from "./CanonMarkers";
import { useReducedMotion } from "./useReducedMotion";
import { useMemo } from "react";
import * as THREE from "three";

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

// (unused, kept only because referenced internally)
function _FallbackGlobe({ className }: { className?: string }) {
  // Self-contained SVG, slowly rotating armillary. Doesn't depend on any
  // external component or canvas. Guaranteed to render in every browser
  // that can paint SVG (every browser since 2010).
  return (
    <div
      className={className}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        viewBox="-110 -110 220 220"
        style={{ width: "min(80%, 520px)", height: "min(80%, 520px)" }}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="canon armillary globe"
      >
        <defs>
          <radialGradient id="fg-sphere" cx="0.32" cy="0.3" r="0.9">
            <stop offset="0" stopColor="var(--bone)" />
            <stop offset="0.55" stopColor="var(--bone-2)" />
            <stop offset="1" stopColor="var(--bone-3)" />
          </radialGradient>
          <radialGradient id="fg-rim" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0.92" stopColor="var(--gold)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--gold)" stopOpacity="0.6" />
          </radialGradient>
        </defs>

        {/* outer gold limb */}
        <circle cx="0" cy="0" r="105" fill="url(#fg-rim)" />
        {/* main sphere */}
        <circle cx="0" cy="0" r="100" fill="url(#fg-sphere)" stroke="var(--gold)" strokeOpacity="0.5" strokeWidth="0.8" />

        {/* slow-spinning meridians + parallels */}
        <g
          style={{
            transformOrigin: "0px 0px",
            animation: "fg-spin 90s linear infinite",
          }}
        >
          {/* meridians (vertical ellipses) */}
          {[8, 30, 55, 78, 95].map((rx, i) => (
            <ellipse
              key={`m-${i}`}
              cx="0" cy="0" rx={rx} ry="100"
              fill="none" stroke="var(--gold)" strokeOpacity="0.35" strokeWidth="0.5"
            />
          ))}
          {/* parallels (horizontal ellipses) */}
          {[-70, -45, -22, 0, 22, 45, 70].map((y, i) => {
            const ry = Math.sqrt(Math.max(0, 100 * 100 - y * y)) * 0.18;
            const rx = Math.sqrt(Math.max(0, 100 * 100 - y * y));
            return (
              <ellipse
                key={`p-${i}`}
                cx="0" cy={y} rx={rx} ry={ry}
                fill="none" stroke="var(--gold)" strokeOpacity={y === 0 ? 0.55 : 0.25} strokeWidth={y === 0 ? 0.7 : 0.4}
              />
            );
          })}
          {/* equatorial ring */}
          <circle cx="0" cy="0" r="100" fill="none" stroke="var(--gold)" strokeOpacity="0.45" strokeWidth="0.6" />
        </g>

        {/* eight branch ports, gold dots evenly spaced around the equator */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          return (
            <circle
              key={deg}
              cx={Math.cos(rad) * 100}
              cy={Math.sin(rad) * 100}
              r="3"
              fill="var(--gold)"
            />
          );
        })}

        <style>{`@keyframes fg-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </svg>
    </div>
  );
}

interface CanonGlobeProps {
  markers?: CanonMarker[];
  activeIndex?: number;
  className?: string;
  onHoverChange?: (m: CanonMarker | null) => void;
  onSelectChange?: (m: CanonMarker | null) => void;
}

const LANDMASK_URL = "/textures/earth/2k_earth_daymap.jpg";

export default function CanonGlobe({
  markers = [],
  activeIndex,
  className,
  onHoverChange,
  onSelectChange,
}: CanonGlobeProps) {
  const reducedMotion = useReducedMotion();
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
          enableZoom
          enablePan={false}
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
          autoRotate={false}
        />
        <CameraTracker
          controlsRef={controlsRef}
          onDistance={setCameraDistance}
          onPosition={setCameraPosition}
        />
      </Canvas>
    </div>
  );
}
