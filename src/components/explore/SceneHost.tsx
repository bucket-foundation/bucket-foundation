"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Guide, SceneLayout, Vec3 } from "@/lib/explore/modes/types";
import { useReducedMotion } from "@/components/canon-globe/useReducedMotion";

interface Props {
  layout: SceneLayout;
  selected: string | null;
  onSelect(id: string): void;
  onScroll?(delta: number): void;
}

function GuideView({ g }: { g: Guide }) {
  const tube = useMemo(() => {
    if (g.kind !== "tube" || g.points.length < 2) return null;
    const curve = new THREE.CatmullRomCurve3(g.points.map((p) => new THREE.Vector3(...p)));
    return new THREE.TubeGeometry(curve, Math.min(1024, g.points.length * 6), g.radius, 8, false);
  }, [g]);
  useEffect(() => () => tube?.dispose(), [tube]);
  const points = useMemo(() => {
    if (g.kind !== "points") return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(g.points.flat(), 3));
    return geo;
  }, [g]);
  useEffect(() => () => points?.dispose(), [points]);
  switch (g.kind) {
    case "sphere":
      return (
        <mesh position={g.center ?? [0, 0, 0]}>
          <sphereGeometry args={[g.radius, 48, 32]} />
          <meshStandardMaterial color={g.color} transparent opacity={g.opacity} wireframe={g.wireframe} depthWrite={false} />
        </mesh>
      );
    case "ring":
      return (
        <mesh position={g.center ?? [0, 0, 0]} rotation={[g.tilt ?? Math.PI / 2, 0, 0]}>
          <torusGeometry args={[g.radius, 0.004, 8, 128]} />
          <meshBasicMaterial color={g.color} />
        </mesh>
      );
    case "line":
      return g.points.length > 1 ? <Line points={g.points} color={g.color} lineWidth={1} /> : null;
    case "tube":
      return tube ? (
        <mesh geometry={tube}>
          <meshStandardMaterial color={g.color} roughness={0.5} />
        </mesh>
      ) : null;
    case "points":
      return points ? (
        <points geometry={points}>
          <pointsMaterial color={g.color} size={g.size} sizeAttenuation />
        </points>
      ) : null;
    case "text":
      return (
        <Html position={g.position} center style={{ pointerEvents: "none" }}>
          <span style={{ color: g.color, fontSize: g.size ?? 11, fontFamily: "var(--font-jetbrains)", whiteSpace: "nowrap" }}>{g.text}</span>
        </Html>
      );
  }
}

function Scene({ layout, selected, onSelect }: Props) {
  const group = useRef<THREE.Group>(null);
  const reduced = useReducedMotion();
  const pos = useMemo(() => new Map(layout.nodes.map((n) => [n.id, n.position])), [layout]);
  useFrame((_, dt) => {
    if (group.current && layout.spin && !reduced) group.current.rotation.y += layout.spin * dt;
  });
  return (
    <group ref={group}>
      {layout.guides.map((g, i) => (
        <GuideView key={`${g.kind}-${i}`} g={g} />
      ))}
      {layout.links.map((l) => {
        const a = pos.get(l.from);
        const b = pos.get(l.to);
        if (!a || !b) return null;
        const hot = l.from === selected || l.to === selected;
        return <Line key={`${l.from}|${l.to}`} points={[a, b]} color={l.color ?? (hot ? layout.stage?.hot ?? "#D9A43A" : layout.stage?.link ?? "#6B6252")} lineWidth={hot ? 2 : 1} transparent opacity={hot ? 1 : 0.5} />;
      })}
      {layout.nodes.map((n) => (
        <mesh
          key={n.id}
          position={n.position as Vec3}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(n.id);
          }}
        >
          <sphereGeometry args={[n.id === selected ? n.size * 1.6 : n.size, 16, 12]} />
          <meshStandardMaterial color={n.color} emissive={n.id === selected ? n.color : "#000000"} emissiveIntensity={0.6} />
          {n.id === selected && n.label && (
            <Html center position={[0, n.size * 3, 0]} style={{ pointerEvents: "none" }}>
              <span style={{ background: "rgba(239,232,212,0.95)", color: "#1c1a17", padding: "2px 6px", fontSize: 11, whiteSpace: "nowrap" }}>{n.label.slice(0, 60)}</span>
            </Html>
          )}
        </mesh>
      ))}
    </group>
  );
}

export default function SceneHost(props: Props) {
  const { layout, onScroll } = props;
  const scrollMode = layout.wheel === "scroll";
  return (
    <div
      data-testid="explore-scene"
      className="w-full h-[420px] md:h-[520px] border hairline"
      style={{ background: layout.stage?.background ?? "#141311" }}
      onWheel={scrollMode && onScroll ? (e) => onScroll(e.deltaY) : undefined}
    >
      <Canvas camera={{ position: layout.camera, fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 4, 5]} intensity={1.1} />
        <Scene {...props} />
        <OrbitControls enablePan={false} enableZoom={!scrollMode} makeDefault />
      </Canvas>
    </div>
  );
}
