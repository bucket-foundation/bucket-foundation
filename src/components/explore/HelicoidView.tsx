"use client";

import { Canvas } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { cylinderRadius } from "@/lib/explore/slices";
import { AXIS } from "@/lib/explore/geometry";
import { STACK_LENGTH } from "@/lib/explore/slices";
import { lociOf, ribbonMesh, rungsOf } from "@/lib/explore/helicoid";
import type { Dataset } from "@/lib/explore/space";

interface Props {
  dataset: Dataset;
  selected: number;
  onSelect(i: number): void;
}

const GOLD = "#D9A43A";
const BONE = "#EFE8D4";
const BASE_COLOR: Record<string, string> = { A: "#6FA8DC", C: "#D9A43A", G: "#8FBF5A", T: "#D96C4A" };
const NEUTRAL = "#8A8270";
const CAMERA: [number, number, number] = [-6, 6, 12];
const LOCUS_WINDOW = 0.06;

function ribbonGeometry(mesh: ReturnType<typeof ribbonMesh>): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(mesh.positions.flat(), 3));
  g.setIndex(mesh.index);
  return g;
}

export default function HelicoidView({ dataset, selected, onSelect }: Props) {
  const geometry = useMemo(() => ribbonGeometry(ribbonMesh()), []);
  const wire = useMemo(() => new THREE.WireframeGeometry(geometry), [geometry]);
  const rungs = useMemo(() => rungsOf(dataset), [dataset]);
  const loci = useMemo(() => lociOf(dataset), [dataset]);
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(AXIS[0], AXIS[1], AXIS[2])), []);
  const current = rungs[selected];
  const near = current ? loci.filter((l) => Math.abs(l.u - current.u) <= LOCUS_WINDOW) : [];
  return (
    <div data-testid="helicoid-view" data-rungs={rungs.length} data-loci={loci.length} className="absolute inset-0">
      <Canvas camera={{ position: CAMERA, fov: 38 }} dpr={[1, 2]}>
        <ambientLight intensity={0.9} />
        <mesh quaternion={quat}>
          <cylinderGeometry args={[cylinderRadius(), cylinderRadius(), STACK_LENGTH * 1.04, 48, 1, true]} />
          <meshBasicMaterial color={BONE} transparent opacity={0.04} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh geometry={geometry}>
          <meshBasicMaterial color={GOLD} transparent opacity={0.14} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <lineSegments geometry={wire}>
          <lineBasicMaterial color={GOLD} transparent opacity={0.1} />
        </lineSegments>
        {rungs.map((r, i) => {
          const on = i === selected;
          const mid: [number, number, number] = [(r.a[0] + r.b[0]) / 2, (r.a[1] + r.b[1]) / 2, (r.a[2] + r.b[2]) / 2];
          return (
            <group key={r.id}>
              <Line points={[r.a, mid]} color={BASE_COLOR[r.base] ?? NEUTRAL} lineWidth={on ? 3.2 : 1.4} />
              <Line points={[mid, r.b]} color={BASE_COLOR[r.complement] ?? NEUTRAL} lineWidth={on ? 3.2 : 1.4} />
              <mesh
                position={mid}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(i);
                }}
              >
                <sphereGeometry args={[on ? 0.14 : 0.07, 10, 8]} />
                <meshBasicMaterial color={on ? GOLD : BONE} transparent opacity={on ? 1 : 0.5} />
              </mesh>
            </group>
          );
        })}
        {loci.map((l, i) => (
          <mesh key={`${l.label}-${i}`} position={l.position}>
            <sphereGeometry args={[0.1, 10, 8]} />
            <meshBasicMaterial color={GOLD} />
          </mesh>
        ))}
        {near.map((l, i) => (
          <Html key={`${l.label}-${i}`} position={l.position} center style={{ pointerEvents: "none", transform: "translateY(-14px)" }}>
            <span data-testid="locus-label" style={{ color: GOLD, fontSize: 11, fontFamily: "var(--font-jetbrains)", whiteSpace: "nowrap" }}>{l.label}</span>
          </Html>
        ))}
        <OrbitControls enablePan={false} enableZoom={false} />
      </Canvas>
    </div>
  );
}
