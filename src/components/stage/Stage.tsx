"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import * as THREE from "three";
import { useReducedMotion } from "@/components/canon-globe/useReducedMotion";
import { cameraDistance, homeCamera, type Vec3 } from "@/lib/explore/frame";
import { INITIAL_LOCK, lockReducer } from "@/lib/stage/camera";
import { bufferSize, planMorph, sampleMorph, settled, type MorphItem } from "@/lib/stage/morph";

export interface StageItem {
  id: string;
  position: Vec3;
  color: string;
  size: number;
}

interface Props {
  items: StageItem[];
  selected: string | null;
  onSelect(id: string): void;
  morphMs?: number;
}

const DRAW_CAP = 5000;
const SELECTED_SCALE = 1.6;

function Instances({ items, selected, onSelect, morphMs = 600 }: Props) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const reduced = useReducedMotion();
  const meta = useRef(new Map<string, StageItem>());
  const targets = useRef(new Map<string, Vec3>());
  const plan = useRef<MorphItem[]>([]);
  const startedAt = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const [capacity, setCapacity] = useState(64);

  useEffect(() => {
    const capped = items.slice(0, DRAW_CAP);
    for (const it of capped) meta.current.set(it.id, it);
    const next = new Map(capped.map((it) => [it.id, it.position] as [string, Vec3]));
    plan.current = planMorph(targets.current, next);
    targets.current = next;
    startedAt.current = performance.now();
    const need = bufferSize(plan.current);
    setCapacity((c) => (need > c ? Math.ceil(need / 64) * 64 : c));
  }, [items]);

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const k = reduced ? 1 : (performance.now() - startedAt.current) / morphMs;
    const list = plan.current;
    list.forEach((item, i) => {
      const s = sampleMorph(item, k, reduced);
      const info = meta.current.get(item.id);
      dummy.position.set(...s.position);
      dummy.scale.setScalar(Math.max(1e-4, (info?.size ?? 0.03) * s.scale * (item.id === selected ? SELECTED_SCALE : 1)));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, color.set(info?.color ?? "#D9A43A"));
    });
    m.count = list.length;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    if (k >= 1 && list.some((p) => p.kind !== "shared" || p.from !== p.to)) plan.current = settled(list).map((p) => ({ ...p, from: p.to, fromScale: 1, toScale: 1, kind: "shared" as const }));
  });

  const pick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId === undefined) return;
    const item = plan.current[e.instanceId];
    if (item && item.toScale > 0) onSelect(item.id);
  };

  return (
    <instancedMesh key={capacity} ref={mesh} args={[undefined, undefined, capacity]} onClick={pick} frustumCulled={false}>
      <sphereGeometry args={[1, 16, 12]} />
      <meshStandardMaterial />
    </instancedMesh>
  );
}

interface RigProps {
  locked: boolean;
  onOrbit(): void;
  readout: React.RefObject<HTMLDivElement>;
}

function Rig({ locked, onOrbit, readout }: RigProps) {
  const controls = useRef<{ target: THREE.Vector3; update(): void } | null>(null);
  const { camera } = useThree();
  useFrame(() => {
    const c = controls.current;
    if (!c) return;
    if (locked) {
      const h = homeCamera();
      camera.position.set(...h.position);
      c.target.set(...h.target);
      c.update();
    }
    if (readout.current) {
      const pose = { position: camera.position.toArray() as Vec3, target: c.target.toArray() as Vec3, fov: 45 };
      readout.current.dataset.distance = cameraDistance(pose).toFixed(3);
    }
  });
  return <OrbitControls ref={controls as never} makeDefault enablePan={false} onStart={onOrbit} />;
}

export default function Stage(props: Props) {
  const [lock, dispatch] = useReducer(lockReducer, INITIAL_LOCK);
  const readout = useRef<HTMLDivElement>(null);
  const home = homeCamera();
  return (
    <div ref={readout} data-testid="stage" data-locked={lock.locked ? "true" : "false"} className="relative w-full h-[420px] md:h-[520px] border hairline" style={{ background: "#141311" }}>
      <Canvas camera={{ position: home.position, fov: home.fov }} dpr={[1, 2]}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 4, 5]} intensity={1.1} />
        <Instances {...props} />
        <Rig locked={lock.locked} onOrbit={() => dispatch("orbit")} readout={readout} />
      </Canvas>
      <button
        type="button"
        data-testid="stage-home"
        aria-pressed={lock.locked}
        onClick={() => dispatch("home")}
        className="absolute top-2 right-2 border hairline px-2 py-1 text-xs"
        style={{ fontFamily: "var(--font-jetbrains)", background: "rgba(20,19,17,0.8)", color: "#EFE8D4" }}
      >
        Home
      </button>
    </div>
  );
}
