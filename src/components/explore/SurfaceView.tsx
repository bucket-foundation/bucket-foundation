"use client";

import { Canvas } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { AXIS, ERAS, SPHERE_RADIUS } from "@/lib/explore/geometry";
import { STACK_LENGTH, cylinderRadius, sliceCenter, sliceOutline, type Slice } from "@/lib/explore/slices";
import type { Dataset } from "@/lib/explore/space";
import { SPHERE_DISPLAY_SCALE, midYear, spherePlacement, surfaceMesh, visibleAt } from "@/lib/explore/surface";

export type SurfaceMode = "cylinder" | "sphere" | "sphere-time";

interface Props {
  mode: SurfaceMode;
  dataset: Dataset;
  slices: Slice[];
  year: number;
  selected: number;
  activeSlice: number;
  onSelect(i: number): void;
}

const GOLD = "#D9A43A";
const BONE = "#EFE8D4";
const DIM = "#8A8270";
const CAMERA: [number, number, number] = [1.5, 5, 15];
const SPHERE_CAMERA: [number, number, number] = [0, 2.2, 8];
const POINT_CAP = 400;

function surfaceGeometry(mesh: ReturnType<typeof surfaceMesh>): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(mesh.positions.flat(), 3));
  g.setIndex(mesh.index);
  return g;
}

function CylinderScene({ dataset, slices, activeSlice }: Pick<Props, "dataset" | "slices" | "activeSlice">) {
  const mesh = useMemo(() => surfaceMesh(slices, dataset.components, undefined, undefined, dataset.scale), [slices, dataset]);
  const geometry = useMemo(() => surfaceGeometry(mesh), [mesh]);
  const wire = useMemo(() => new THREE.WireframeGeometry(geometry), [geometry]);
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(AXIS[0], AXIS[1], AXIS[2])), []);
  const rings = useMemo(() => slices.map((s, i) => sliceOutline(s, dataset, i, slices.length)), [slices, dataset]);
  return (
    <>
      <mesh quaternion={quat}>
        <cylinderGeometry args={[cylinderRadius(), cylinderRadius(), STACK_LENGTH * 1.04, 48, 1, true]} />
        <meshBasicMaterial color={BONE} transparent opacity={0.05} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh geometry={geometry}>
        <meshBasicMaterial color={GOLD} transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <lineSegments geometry={wire}>
        <lineBasicMaterial color={GOLD} transparent opacity={0.25} />
      </lineSegments>
      {rings.map((r, i) => (
        <Line key={i} points={[...r, r[0]]} color={i === activeSlice ? GOLD : BONE} lineWidth={i === activeSlice ? 2.4 : 1} transparent opacity={i === activeSlice ? 1 : 0.5} />
      ))}
      <Html position={sliceCenter(0, slices.length)} center style={{ pointerEvents: "none" }}>
        <span style={{ color: DIM, fontSize: 11, fontFamily: "var(--font-jetbrains)", whiteSpace: "nowrap" }}>{slices[0]?.label}</span>
      </Html>
      <Html position={sliceCenter(slices.length - 1, slices.length)} center style={{ pointerEvents: "none" }}>
        <span style={{ color: DIM, fontSize: 11, fontFamily: "var(--font-jetbrains)", whiteSpace: "nowrap" }}>{slices[slices.length - 1]?.label}</span>
      </Html>
    </>
  );
}

function SphereScene({ mode, dataset, year, selected, onSelect }: Omit<Props, "slices">) {
  const fallback = useMemo(() => midYear(dataset.obs), [dataset]);
  const placed = useMemo(
    () =>
      dataset.obs
        .map((o, i) => ({ o, i, p: spherePlacement(o, dataset.components, fallback, dataset.scale) }))
        .filter(({ o }) => mode === "sphere" || visibleAt(o, year))
        .slice(0, POINT_CAP),
    [dataset, fallback, mode, year],
  );
  const ring = (lat: number) => Array.from({ length: 65 }, (_, k) => {
    const a = (k / 64) * Math.PI * 2;
    return [Math.cos(lat) * Math.cos(a) * SPHERE_RADIUS, Math.sin(lat) * SPHERE_RADIUS, -Math.cos(lat) * Math.sin(a) * SPHERE_RADIUS] as [number, number, number];
  });
  return (
    <group scale={SPHERE_DISPLAY_SCALE}>
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS * 0.985, 48, 32]} />
        <meshBasicMaterial color={BONE} transparent opacity={0.06} depthWrite={false} />
      </mesh>
      {ERAS.map((_, e) => (
        <Line key={e} points={ring(((e + 1) / ERAS.length - 0.5) * Math.PI * 0.9)} color={BONE} lineWidth={1} transparent opacity={0.18} />
      ))}
      {placed.map(({ o, i, p }) => (
        <mesh
          key={o.id}
          position={p}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(i);
          }}
        >
          <sphereGeometry args={[i === selected ? 0.22 : 0.13, 12, 10]} />
          <meshBasicMaterial color={i === selected ? GOLD : BONE} />
        </mesh>
      ))}
    </group>
  );
}

export default function SurfaceView(props: Props) {
  const sphere = props.mode !== "cylinder";
  return (
    <div data-testid="surface-view" data-mode={props.mode} className="absolute inset-0">
      <Canvas camera={{ position: sphere ? SPHERE_CAMERA : CAMERA, fov: 38 }} dpr={[1, 2]}>
        <ambientLight intensity={0.9} />
        {sphere ? <SphereScene {...props} /> : <CylinderScene dataset={props.dataset} slices={props.slices} activeSlice={props.activeSlice} />}
        {sphere && <OrbitControls enablePan={false} enableZoom={false} />}
      </Canvas>
    </div>
  );
}
