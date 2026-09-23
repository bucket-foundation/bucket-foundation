"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  EffectComposer,
  HorizontalBlurShader,
  RenderPass,
  ShaderPass,
  VerticalBlurShader,
} from "three-stdlib";
import { Earth, EARTH_RADIUS } from "./Earth";
import { Halo } from "./Halo";
import { CanonMarkers, type CanonMarker } from "./CanonMarkers";
import { useReducedMotion } from "./useReducedMotion";
import { useMemo } from "react";
import * as THREE from "three";

function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

export type ScrollState = { y: number; velocity: number };
export type DecorativeVariant = {
  noshell?: boolean;
  fulldpr?: boolean;
  nospin?: boolean;
  notilt?: boolean;
  opaque?: boolean;
  dots?: number;
  dotr?: number;
  dotcolor?: number;
  limb?: number;
  blur?: number;
  passes?: number;
  dpr?: number;
};
const DECORATIVE_TILT = ((35 - 90) * Math.PI) / 180;
const DECORATIVE_RAD_PER_PX = 0.0022;
const DECORATIVE_SPIN_EASE = 4;
const DECORATIVE_SHELL_EASE = 5;
const DECORATIVE_VELOCITY_DECAY = 3;
const DECORATIVE_MAX_EXPANSION = 0.4;
const DECORATIVE_EXPANSION_PER_VELOCITY = 0.25;
const SHELL_COUNT = 3200;
const DECORATIVE_ALPHA = 0.55;
const DECORATIVE_DOT_COLOR = 0x4a4436;
const DECORATIVE_LIMB_SCALE = 0.3;
const DECORATIVE_DOT_COUNT = 36000;
const DECORATIVE_DOT_RADIUS = 0.0075;
const DECORATIVE_DOT_DETAIL = 6;
const DECORATIVE_FRAME_MS = 50;
const INTRO_MS = 3600;
const INTRO_SPIN_RAD = 1.1;
const INTRO_SHELL_SCALE = 0.65;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const DECORATIVE_DPR = 0.5;
const DECORATIVE_BLUR_PX = 0.55;
const DECORATIVE_BLUR_PASSES = 1;

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
  const introStart = useRef(performance.now());
  const frame = useRef({ last: 0, timer: 0 as ReturnType<typeof setTimeout> | 0 });

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
    requestFrame();
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
    const introT = Math.min(1, (performance.now() - introStart.current) / INTRO_MS);
    const introK = 1 - easeOutCubic(introT);
    spin.rotation.y = c.rot - introK * INTRO_SPIN_RAD;
    const shell = shellRef.current;
    if (shell) {
      shell.scale.setScalar(c.scale * (INTRO_SHELL_SCALE + (1 - INTRO_SHELL_SCALE) * (1 - introK)));
      shell.rotation.y = (c.rot - introK * INTRO_SPIN_RAD) * 0.55;
    }
    scroll.velocity *= Math.exp(-DECORATIVE_VELOCITY_DECAY * delta);
    if (introT < 1 || Math.abs(targetRot - c.rot) > 1e-4 || Math.abs(targetScale - c.scale) > 1e-4) {
      requestFrame();
    }
  });
  return null;
}

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
    geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
    return geo;
  }, []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: sprite },
          uOpacity: { value: 0.32 * DECORATIVE_ALPHA },
          uSize: { value: 0.11 },
          uScale: { value: 100 },
          uFade: { value: new THREE.Vector2(0.45, 0.9) },
        },
        vertexShader:  `
          uniform float uSize;
          uniform float uScale;
          attribute vec3 aColor;
          varying vec3 vColor;
          varying vec2 vNdc;
          void main() {
            vColor = aColor;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = uSize * uScale / -mv.z;
            vNdc = gl_Position.xy / gl_Position.w;
          }
        `,
        fragmentShader:  `
          uniform sampler2D uMap;
          uniform float uOpacity;
          uniform vec2 uFade;
          varying vec3 vColor;
          varying vec2 vNdc;
          void main() {
            float a = texture2D(uMap, gl_PointCoord).a * uOpacity;
            a *= 1.0 - smoothstep(uFade.x, uFade.y, length(vNdc));
            if (a < 0.02) discard;
            gl_FragColor = vec4(vColor, a);
          }
        `,
        transparent: true,
        depthWrite: false,
      }),
    [sprite]
  );
  useFrame((state) => {
    material.uniforms.uScale.value = (state.size.height * state.viewport.dpr) / 2;
  });
  return (
    <group ref={shellRef}>
      <points geometry={geometry} material={material} />
    </group>
  );
}

function BlurPipeline({ blurPx, passCount }: { blurPx: number; passCount: number }) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  const pipeline = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(1, 1, {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
      stencilBuffer: false,
    });
    const composer = new EffectComposer(gl, target);
    composer.addPass(new RenderPass(scene, camera));
    const passes: ShaderPass[] = [];
    for (let i = 0; i < passCount; i++) {
      const h = new ShaderPass(HorizontalBlurShader);
      const v = new ShaderPass(VerticalBlurShader);
      composer.addPass(h);
      composer.addPass(v);
      passes.push(h, v);
    }
    passes[passes.length - 1].renderToScreen = true;
    return { composer, passes };
  }, [gl, scene, camera, passCount]);

  useEffect(() => {
    const dpr = gl.getPixelRatio();
    pipeline.composer.setPixelRatio(dpr);
    pipeline.composer.setSize(size.width, size.height);
    const w = Math.max(1, size.width * dpr);
    const h = Math.max(1, size.height * dpr);
    pipeline.passes.forEach((pass, i) => {
      if (i % 2 === 0) pass.uniforms.h.value = blurPx / w;
      else pass.uniforms.v.value = blurPx / h;
    });
  }, [pipeline, size, gl, blurPx]);

  useEffect(() => {
    const { composer } = pipeline;
    return () => {
      composer.renderTarget1.dispose();
      composer.renderTarget2.dispose();
    };
  }, [pipeline]);

  useFrame(() => {
    pipeline.composer.render();
  }, 1);
  return null;
}

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
    handler();
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
  decorative?: boolean;
  scrollRef?: MutableRefObject<ScrollState>;
  variant?: DecorativeVariant;
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
  const [cameraDistance, setCameraDistance] = useState(3.4);
  const [cameraPosition, setCameraPosition] =
    useState<[number, number, number]>([0, 0, 3.4]);

  const stars = useMemo(() => {
    const N = 600;
    const pts = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
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
        dpr={decorative && !variant?.fulldpr ? variant?.dpr ?? DECORATIVE_DPR : 1}
        frameloop="demand"
        performance={{ min: 0.5 }}
        camera={{ position: [0, 0, 3.4], fov: decorative ? 42 : 44 }}
        gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
      >
        <ambientLight intensity={0.5} />

        {!decorative && <points geometry={stars}>
          <pointsMaterial
            size={0.04}
            color="#B8861E"
            transparent
            opacity={0.35}
            sizeAttenuation
            depthWrite={false}
          />
        </points>}

        <group rotation={decorative && !variant?.notilt ? [0, 0, DECORATIVE_TILT] : [0, 0, 0]}>
        <group ref={spinRef}>
        <Suspense fallback={null}>
          <Earth
            targetRotationY={0}
            reducedMotion={true }
            landmaskUrl={LANDMASK_URL}
            dotOpacity={1}
            dotDetail={decorative ? DECORATIVE_DOT_DETAIL : 8}
            dotColor={decorative ? variant?.dotcolor ?? DECORATIVE_DOT_COLOR : 0x1f1c16}
            sampleCount={decorative ? variant?.dots ?? DECORATIVE_DOT_COUNT : undefined}
            dotRadius={decorative ? variant?.dotr ?? DECORATIVE_DOT_RADIUS : undefined}
            limbScale={decorative ? variant?.limb ?? DECORATIVE_LIMB_SCALE : 1}
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
        <Halo enabled alpha={alpha} fade={decorative ? [0.45, 0.9] : undefined} />
        {decorative && !variant?.noshell && <ParticleShell shellRef={shellRef} />}
        </group>
        </group>

        <OrbitControls
          ref={controlsRef}
          enableDamping={false}
          enableZoom={!decorative}
          enablePan={false}
          enableRotate={!decorative}
          minDistance={1.04}
          maxDistance={6}
          minPolarAngle={0.15}
          maxPolarAngle={Math.PI - 0.15}
          rotateSpeed={Math.max(0.12, 0.5 * Math.min(1, (cameraDistance - 1) / 2.4))}
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
        {decorative && (
          <BlurPipeline
            blurPx={variant?.blur ?? DECORATIVE_BLUR_PX}
            passCount={variant?.passes ?? DECORATIVE_BLUR_PASSES}
          />
        )}
      </Canvas>
    </div>
  );
}
