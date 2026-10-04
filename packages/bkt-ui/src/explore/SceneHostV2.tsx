"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useSceneTheme } from "./useSceneTheme";
import type { DesktopLayout } from "./modesV2";
import type { Guide, Vec3 } from "@/lib/explore/modes/types";
import { useReducedMotion } from "@/components/canon-globe/useReducedMotion";

interface Props {
  layout: DesktopLayout;
  selected: string | null;
  onSelect(id: string): void;
  onScroll?(delta: number): void;
}

function HorizontalCamera({ length }: { length: number }) {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    camera.position.set(0, 0, Math.max(5.5, length / 2 / (size.width / size.height) / Math.tan(camera.fov * Math.PI / 360)));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, length, size.width, size.height]);
  return null;
}

function Helicoid({ ribbon, color }: { ribbon: NonNullable<DesktopLayout["helicoid"]>; color: string }) {
  const geometry = useMemo(() => {
    const surface = new THREE.BufferGeometry();
    surface.setAttribute("position", new THREE.Float32BufferAttribute(ribbon.positions.flat(), 3));
    surface.setIndex(ribbon.index);
    surface.computeVertexNormals();
    const rungs = new THREE.BufferGeometry();
    rungs.setAttribute("position", new THREE.Float32BufferAttribute(ribbon.rungs.flat(), 3));
    return { surface, rungs };
  }, [ribbon]);
  useEffect(() => () => {
    geometry.surface.dispose();
    geometry.rungs.dispose();
  }, [geometry]);
  return (
    <group>
      <mesh geometry={geometry.surface}>
        <meshStandardMaterial color={color} transparent opacity={0.36} side={THREE.DoubleSide} depthWrite={false} roughness={0.7} />
      </mesh>
      <lineSegments geometry={geometry.rungs}>
        <lineBasicMaterial color={color} transparent opacity={0.65} />
      </lineSegments>
    </group>
  );
}

function GuideView({ g, theme }: { g: Guide; theme: ReturnType<typeof useSceneTheme> }) {
  const color = g.kind === "text" ? theme.muted : g.kind === "sphere" && g.wireframe ? theme.accent : ["#6B6252", "#3A362E", "#8A8170", "#B8AE94"].includes(g.color) ? theme.muted : g.color;
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
          <meshStandardMaterial color={color} transparent opacity={g.opacity} wireframe={g.wireframe} depthWrite={false} />
        </mesh>
      );
    case "ring":
      return (
        <mesh position={g.center ?? [0, 0, 0]} rotation={[g.tilt ?? Math.PI / 2, 0, 0]}>
          <torusGeometry args={[g.radius, 0.004, 8, 128]} />
          <meshBasicMaterial color={color} />
        </mesh>
      );
    case "line":
      return g.points.length > 1 ? <Line points={g.points} color={color} lineWidth={1} /> : null;
    case "tube":
      return tube ? (
        <mesh geometry={tube}>
          <meshStandardMaterial color={color} roughness={0.5} />
        </mesh>
      ) : null;
    case "points":
      return points ? (
        <points geometry={points}>
          <pointsMaterial color={color} size={g.size} sizeAttenuation />
        </points>
      ) : null;
    case "text":
      return (
        <Html position={g.position} center style={{ pointerEvents: "none" }}>
          <span style={{ color, fontSize: g.size ?? 11, fontFamily: "var(--font-jetbrains)", whiteSpace: "nowrap" }}>{g.text}</span>
        </Html>
      );
  }
}

function Scene({ layout, selected, onSelect, theme }: Props & { theme: ReturnType<typeof useSceneTheme> }) {
  const group = useRef<THREE.Group>(null);
  const reduced = useReducedMotion();
  const pos = useMemo(() => new Map(layout.nodes.map((n) => [n.id, n.position])), [layout]);
  useFrame((_, dt) => {
    if (group.current && layout.spin && !reduced) group.current.rotation.y += layout.spin * dt;
  });
  return (
    <group ref={group}>
      {layout.helicoid && <Helicoid ribbon={layout.helicoid} color={theme.accent} />}
      {layout.guides.map((g, i) => (
        <GuideView key={`${g.kind}-${i}`} g={g} theme={theme} />
      ))}
      {layout.links.map((l) => {
        const a = pos.get(l.from);
        const b = pos.get(l.to);
        if (!a || !b) return null;
        const hot = l.from === selected || l.to === selected;
        return <Line key={`${l.from}|${l.to}`} points={[a, b]} color={hot ? theme.accent : l.color ?? theme.muted} lineWidth={hot ? 2 : 1} transparent opacity={hot ? 1 : 0.5} />;
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
              <span style={{ background: "var(--panel)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 6, padding: "4px 8px", fontSize: 11, whiteSpace: "nowrap" }}>{n.label.slice(0, 60)}</span>
            </Html>
          )}
        </mesh>
      ))}
    </group>
  );
}

export default function SceneHost(props: Props) {
  const { layout, onScroll } = props;
  const theme = useSceneTheme();
  const scrollMode = layout.wheel === "scroll";
  return (
    <div
      data-testid="explore-scene"
      data-surface={layout.helicoid ? "helicoid" : undefined}
      data-axis={layout.axisLength ? "horizontal" : undefined}
      className="w-full h-[420px] md:h-[520px] border hairline"
      style={{ background: "var(--paper)" }}
      onWheel={scrollMode && onScroll ? (e) => onScroll(e.deltaY) : undefined}
    >
      <Canvas camera={{ position: layout.camera, fov: 45 }} dpr={[1, 2]}>
        {layout.axisLength && <HorizontalCamera length={layout.axisLength} />}
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 4, 5]} intensity={1.1} />
        <Scene {...props} theme={theme} />
        <OrbitControls enablePan={false} enableZoom={!scrollMode} makeDefault />
      </Canvas>
    </div>
  );
}
