"use client";

import { Canvas } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { AXIS } from "@/lib/explore/geometry";
import { STACK_LENGTH, cylinderRadius, sliceCenter, sliceOutline, stepSlice, type Slice } from "@/lib/explore/slices";
import type { Dataset } from "@/lib/explore/space";

interface Props {
  dataset: Dataset;
  slices: Slice[];
  active: number;
  onActive(i: number): void;
  onOpen(i: number): void;
}

const GOLD = "#D9A43A";
const DIM = "#8A8270";
const CAMERA: [number, number, number] = [1.5, 5, 15];

function fan(points: [number, number, number][], center: [number, number, number]): THREE.BufferGeometry {
  const pos: number[] = [...center];
  for (const p of points) pos.push(...p);
  const idx: number[] = [];
  for (let j = 0; j < points.length; j++) idx.push(0, 1 + j, 1 + ((j + 1) % points.length));
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

export default function SliceStack({ dataset, slices, active, onActive, onOpen }: Props) {
  const count = slices.length;

  const geometry = useMemo(
    () =>
      slices.map((s, i) => {
        const outline = sliceOutline(s, dataset, i, count);
        return { outline, closed: [...outline, outline[0]], fill: fan(outline, sliceCenter(i, count)) };
      }),
    [slices, dataset, count],
  );

  const cylinderQuat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(AXIS[0], AXIS[1], AXIS[2])), []);

  return (
    <div
      data-testid="slice-stack"
      data-active={active}
      data-count={count}
      tabIndex={0}
      role="group"
      aria-label={`${count} slices, arrow keys step, Enter opens the circle chart`}
      className="absolute inset-0 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#D9A43A]"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") onActive(stepSlice(active, 1, count));
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") onActive(stepSlice(active, -1, count));
        else if (e.key === "Home") onActive(0);
        else if (e.key === "End") onActive(count - 1);
        else if (e.key === "Enter") onOpen(active);
        else return;
        e.preventDefault();
      }}
    >
      <Canvas camera={{ position: CAMERA, fov: 38 }} dpr={[1, 2]}>
        <ambientLight intensity={0.9} />
        <mesh quaternion={cylinderQuat}>
          <cylinderGeometry args={[cylinderRadius(), cylinderRadius(), STACK_LENGTH * 1.04, 48, 1, true]} />
          <meshBasicMaterial color="#EFE8D4" transparent opacity={0.05} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh quaternion={cylinderQuat}>
          <cylinderGeometry args={[cylinderRadius(), cylinderRadius(), STACK_LENGTH * 1.04, 48, 1, true]} />
          <meshBasicMaterial color="#EFE8D4" wireframe transparent opacity={0.08} depthWrite={false} />
        </mesh>
        {geometry.map((g, i) => {
          const on = i === active;
          return (
            <group key={slices[i].index}>
              <mesh
                geometry={g.fill}
                onClick={(e) => {
                  e.stopPropagation();
                  onActive(i);
                  onOpen(i);
                }}
              >
                <meshBasicMaterial color={on ? GOLD : DIM} transparent opacity={on ? 0.32 : 0.12} side={THREE.DoubleSide} depthWrite={false} />
              </mesh>
              <Line points={g.closed} color={on ? GOLD : DIM} lineWidth={on ? 2.4 : 1.2} />
              {on && (
                <Html position={sliceCenter(i, count).map((v, k) => (k === 1 ? v - 2.6 : v)) as [number, number, number]} center style={{ pointerEvents: "none" }}>
                  <span data-testid="slice-label" style={{ color: GOLD, fontSize: 12, fontFamily: "var(--font-jetbrains)", whiteSpace: "nowrap" }}>
                    {slices[i].label} · {slices[i].obsIds.length}
                  </span>
                </Html>
              )}
            </group>
          );
        })}
      </Canvas>
    </div>
  );
}
