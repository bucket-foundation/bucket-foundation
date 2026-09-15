"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
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

// Decorative mount: the globe spins only when the page scrolls. Scroll
// position maps to a rotation target (radians per pixel) and the frame
// loop eases toward it; the particle shell around the globe expands with
// scroll speed and settles back when scrolling stops.
export type ScrollState = { y: number; velocity: number };
// Axis roll on screen: 35 degrees of tilt, then a quarter turn clockwise.
const DECORATIVE_TILT = ((35 - 90) * Math.PI) / 180;
const DECORATIVE_RAD_PER_PX = 0.0022;
const DECORATIVE_SPIN_EASE = 4;
const DECORATIVE_SHELL_EASE = 5;
const DECORATIVE_VELOCITY_DECAY = 3;
const DECORATIVE_MAX_EXPANSION = 0.4;
const DECORATIVE_EXPANSION_PER_VELOCITY = 0.25;
const SHELL_COUNT = 3200;
// Decorative transparency lives in the materials, never in CSS opacity:
// an opacity or mask on the wrapper makes the compositor render the
// whole 2100px layer offscreen, which hangs the founder's Phoenix iGPU.
const DECORATIVE_ALPHA = 0.55;
// Decorative dots stay opaque (transparent instancing plus scroll frames
// wedged the founder's iGPU); a lighter color carries the "less dark" ask.
const DECORATIVE_DOT_COLOR = 0x5a4f3d;
const DECORATIVE_DOT_COUNT = 18000;
const DECORATIVE_DOT_DETAIL = 4;
// Scroll-driven frames are capped at this interval (20 per second).
const DECORATIVE_FRAME_MS = 50;

/**
 * Eases the decorative globe's spin toward scrollY * DECORATIVE_RAD_PER_PX
 * and the particle shell's scale toward 1 + scroll speed. The canvas runs
 * frameloop="demand": a scroll event requests one frame, and this driver
 * keeps requesting frames until both eases settle.
 */
function ScrollSpinDriver({
  spinRef,
  shellRef,
  scrollRef,
}: {
  spinRef: MutableRefObject<THREE.Group | null>;
  shellRef: MutableRefObject<THREE.Group | null>;
  scrollRef?: MutableRefObject<ScrollState>;
}) {
  const invalidate = useThree((state) => state.invalidate);
  const current = useRef({ rot: 0, scale: 1 });
  const frame = useRef({ last: 0, timer: 0 as ReturnType<typeof setTimeout> | 0 });

  // Request at most one frame per DECORATIVE_FRAME_MS.
  const requestFrame = useCallback(() => {
    const f = frame.current;
    const now = performance.now();
    const wait = DECORATIVE_FRAME_MS - (now - f.last);
    if (wait <= 0) {
      f.last = now;
      invalidate();
      return;
    }
    if (f.timer) return;
    f.timer = setTimeout(() => {
      f.timer = 0;
      f.last = performance.now();
      invalidate();
    }, wait);
  }, [invalidate]);

  useEffect(() => {
    const onScroll = () => requestFrame();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame.current.timer) clearTimeout(frame.current.timer);
    };
  }, [requestFrame]);

  useFrame((_state, delta) => {
    const spin = spinRef.current;
    const scroll = scrollRef?.current;
    if (!spin || !scroll) return;
    const targetRot = scroll.y * DECORATIVE_RAD_PER_PX;
    const targetScale =
      1 + Math.min(DECORATIVE_MAX_EXPANSION, scroll.velocity * DECORATIVE_EXPANSION_PER_VELOCITY);
    const c = current.current;
    c.rot = damp(c.rot, targetRot, DECORATIVE_SPIN_EASE, delta);
    c.scale = damp(c.scale, targetScale, DECORATIVE_SHELL_EASE, delta);
    spin.rotation.y = c.rot;
    const shell = shellRef.current;
    if (shell) {
      shell.scale.setScalar(c.scale);
      shell.rotation.y = c.rot * 0.55;
    }
    scroll.velocity *= Math.exp(-DECORATIVE_VELOCITY_DECAY * delta);
    if (Math.abs(targetRot - c.rot) > 1e-4 || Math.abs(targetScale - c.scale) > 1e-4) {
      requestFrame();
    }
  });
  return null;
}

/**
 * Near-field particle shell around the decorative globe: gold and basalt
 * points between 1.25 and 2.6 radii, denser near the surface. Scaled and
 * counter-rotated by ScrollSpinDriver.
 */
// Soft round sprite for the shell points; the default point sprite is a
// hard square, which reads as pixels at the decorative mount's 0.4 dpr.
function makeDotSprite(): THREE.Texture | null {
  if (typeof document === "undefined") return null;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.45, "rgba(255,255,255,0.85)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function ParticleShell({ shellRef }: { shellRef: MutableRefObject<THREE.Group | null> }) {
  const sprite = useMemo(() => makeDotSprite(), []);
  const geometry = useMemo(() => {
    const pos = new Float32Array(SHELL_COUNT * 3);
    const col = new Float32Array(SHELL_COUNT * 3);
    const gold = new THREE.Color("#B8861E");
    const basalt = new THREE.Color("#4A4436");
    const tmp = new THREE.Color();
    for (let i = 0; i < SHELL_COUNT; i++) {
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const r = 1.25 + 1.35 * Math.pow(Math.random(), 1.8);
      const sn = Math.sqrt(1 - u * u);
      pos[i * 3] = r * sn * Math.cos(t);
      pos[i * 3 + 1] = r * u;
      pos[i * 3 + 2] = r * sn * Math.sin(t);
      tmp.copy(basalt).lerp(gold, Math.random() < 0.35 ? 1 : Math.random() * 0.3);
      col[i * 3] = tmp.r;
      col[i * 3 + 1] = tmp.g;
      col[i * 3 + 2] = tmp.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return geo;
  }, []);
  return (
    <group ref={shellRef}>
      <points geometry={geometry}>
        <pointsMaterial
          size={0.05}
          map={sprite ?? undefined}
          alphaTest={0.05}
          vertexColors
          transparent
          opacity={0.7 * DECORATIVE_ALPHA}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </group>
  );
}

/**
 * After the browser restores a lost WebGL context (a GPU reset), three.js
 * rebuilds its state but nothing requests a frame under frameloop="demand",
 * so the canvas would stay blank. Request one.
 */
function ContextRecovery() {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    const el = gl.domElement;
    const onRestored = () => invalidate();
    el.addEventListener("webglcontextrestored", onRestored);
    return () => el.removeEventListener("webglcontextrestored", onRestored);
  }, [gl, invalidate]);
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
  /** Read every frame when `decorative` is on: page scroll position and
   * speed. Position drives the spin, speed drives the particle shell. */
  scrollRef?: MutableRefObject<ScrollState>;
  /** Diagnostic variants for the decorative mount. */
  variant?: { noshell?: boolean; fulldpr?: boolean; nospin?: boolean; notilt?: boolean; opaque?: boolean };
}

const LANDMASK_URL = "/textures/earth/landmask-2k.bin";

export default function CanonGlobe({
  markers = [],
  activeIndex,
  className,
  onHoverChange,
  onSelectChange,
  decorative = false,
  scrollRef,
  variant,
}: CanonGlobeProps) {
  const reducedMotion = useReducedMotion();
  const scrollSpin = decorative && !reducedMotion && !variant?.nospin;
  const alpha = decorative && !variant?.opaque ? DECORATIVE_ALPHA : 1;
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const spinRef = useRef<THREE.Group | null>(null);
  const shellRef = useRef<THREE.Group | null>(null);
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
        dpr={decorative && !variant?.fulldpr ? 0.22 : 1}
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

        <group rotation={decorative && !variant?.notilt ? [0, 0, DECORATIVE_TILT] : [0, 0, 0]}>
        <group ref={spinRef}>
        <Suspense fallback={null}>
          <Earth
            targetRotationY={0}
            reducedMotion={true /* let OrbitControls drive rotation */}
            landmaskUrl={LANDMASK_URL}
            dotOpacity={1}
            dotDetail={decorative ? DECORATIVE_DOT_DETAIL : 8}
            dotColor={decorative ? DECORATIVE_DOT_COLOR : 0x1f1c16}
            sampleCount={decorative ? DECORATIVE_DOT_COUNT : undefined}
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
        <Halo enabled alpha={alpha} />
        {decorative && !variant?.noshell && <ParticleShell shellRef={shellRef} />}
        </group>
        </group>

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
        />
        <CameraTracker
          controlsRef={controlsRef}
          onDistance={setCameraDistance}
          onPosition={setCameraPosition}
        />
        {scrollSpin && (
          <ScrollSpinDriver spinRef={spinRef} shellRef={shellRef} scrollRef={scrollRef} />
        )}
        <ContextRecovery />
      </Canvas>
    </div>
  );
}
