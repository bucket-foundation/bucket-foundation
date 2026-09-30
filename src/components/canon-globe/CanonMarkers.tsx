"use client";
import { Billboard, Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { globeProjection, markerScales, type Projection } from "./projections";

export type CanonMarkerKind =
  | "canon-entry"
  | "figure-birth"
  | "figure-death"
  | "event"
  | "archaeological-site"
  | "world-indicator"
  | "blue-zone";

export type CanonMarker = {
  id: string;
  lat: number;
  lng: number;
  year?: number;
  branch: string;
  title: string;
  kind: CanonMarkerKind;
  href?: string;
  civilization?: string;
  lidar?: string;
  unesco?: string;
  wikipedia?: string;
  color?: string;
  value?: number;
};

interface CanonMarkersProps {
  markers: CanonMarker[];
  activeIndex?: number;
  radius: number;
  reducedMotion: boolean;
  cameraDistance?: number;
  projection?: Projection;
  theta?: (id: string) => number;
  unranked?: (id: string) => boolean;
  onHoverChange?: (m: CanonMarker | null) => void;
  onSelectChange?: (m: CanonMarker | null) => void;
}

const DEG2RAD = Math.PI / 180;

export function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * DEG2RAD;
  const theta = (lng + 180) * DEG2RAD;
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.cos(theta)
  );
}

const BRANCH_COLOR: Record<string, string> = {
  mathematics:  "#D9A43A",
  physics:      "#3E6FA8",
  chemistry:    "#9B5A2C",
  information:  "#557B66",
  biophysics:   "#8E3E3E",
  cosmology:    "#5B4882",
  mind:         "#C2873E",
  "deep-history": "#7A5D3E",
  "sacred-texts": "#A0863F",
  earth:        "#4A6E5E",
  art:          "#A45A4C",
};

const KIND_COLOR: Record<CanonMarkerKind, string> = {
  "canon-entry":  "#D9A43A",
  "figure-birth": "#B8861E",
  "figure-death": "#8A641A",
  "event":        "#B8861E",
  "archaeological-site": "#6E5840",
  "world-indicator": "#4A6E5E",
  "blue-zone":       "#8E3E3E",
};

function markerColor(m: CanonMarker): string {
  if (m.color) return m.color;
  if (m.kind === "archaeological-site") return "#6E5840";
  const b = (m.branch || "").replace(/^\d+-/, "");
  return BRANCH_COLOR[b] || KIND_COLOR[m.kind] || "#D9A43A";
}

function MarkerTooltip({ m, color }: { m: CanonMarker; color: string }) {
  return (
    <div
      style={{
        pointerEvents: "none",
        minWidth: "140px",
        maxWidth: "280px",
        background: "rgba(239, 232, 212, 0.96)",
        color: "var(--basalt)",
        border: `1px solid ${color}`,
        borderRadius: "4px",
        padding: "8px 14px",
        fontFamily: "Cinzel, serif",
        fontSize: 11,
        lineHeight: 1.35,
        letterSpacing: "0.12em",
        boxShadow: "0 4px 18px rgba(31,28,22,0.32)",
        whiteSpace: "normal",
        wordBreak: "break-word",
        textAlign: "center",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
    >
      <div style={{ fontWeight: 500 }}>{m.title}</div>
      {typeof m.value === "number" && (
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            marginTop: 5,
            letterSpacing: "0.06em",
            color,
          }}
        >
          {Number.isFinite(m.value)
            ? m.value.toLocaleString(undefined, { maximumFractionDigits: 2 })
            : "—"}
        </div>
      )}
      <div
        style={{
          fontSize: 9,
          opacity: 0.7,
          marginTop: 4,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color,
        }}
      >
        {m.kind === "blue-zone"
          ? "blue zone · longevity"
          : m.kind === "world-indicator"
          ? "world indicator"
          : `${m.year ? `${m.year < 0 ? Math.abs(m.year) + " BCE" : m.year + " CE"} · ` : ""}${m.branch}`}
      </div>
      {m.kind === "blue-zone" && m.civilization && (
        <div
          style={{
            fontSize: 9,
            opacity: 0.78,
            marginTop: 5,
            letterSpacing: "0.04em",
            textTransform: "none",
            fontFamily: "Fraunces, Georgia, serif",
            lineHeight: 1.4,
          }}
        >
          {m.civilization}
        </div>
      )}
      <div
        style={{
          fontSize: 8,
          opacity: 0.5,
          marginTop: 5,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
        }}
      >
        {m.kind === "world-indicator" ? "click to rank →" : m.kind === "blue-zone" ? "longevity ground-truth" : "click for details →"}
      </div>
    </div>
  );
}

const MOVE_LAMBDA = 6;
const EPS = 1e-4;

export function CanonMarkers({
  markers,
  activeIndex,
  radius,
  reducedMotion,
  cameraDistance,
  projection = globeProjection,
  theta,
  unranked,
  onHoverChange,
  onSelectChange,
}: CanonMarkersProps) {
  const boundsDirty = useRef(true);
  const router = useRouter();
  const invalidate = useThree((s) => s.invalidate);
  const [hover, setHover] = useState<number | null>(null);
  const meshRef = useRef<THREE.InstancedMesh | null>(null);
  const hitRef = useRef<THREE.InstancedMesh | null>(null);
  const tipRef = useRef<THREE.Group | null>(null);
  const activeRef = useRef<THREE.Group | null>(null);
  const current = useRef(new Map<string, THREE.Vector3>());
  const globeWeight = useRef(projection.earthOpacity);

  const lodScale = useMemo(() => {
    if (cameraDistance === undefined) return 1;
    const FAR = 3.4;
    const NEAR = 1.04;
    const MIN_SCALE = 0.3;
    const t = (cameraDistance - NEAR) / (FAR - NEAR);
    return MIN_SCALE + Math.max(0, Math.min(1, t)) * (1 - MIN_SCALE);
  }, [cameraDistance]);

  const targets = useMemo(() => {
    const ctx = { radius, theta: theta ?? (() => 0), unranked };
    boundsDirty.current = true;
    return markers.map((m) => new THREE.Vector3(...projection.position(m, ctx)));
  }, [markers, projection, radius, theta, unranked]);

  const count = Math.max(1, markers.length);
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 14, 14), []);
  const hitGeometry = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  const hitMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
    []
  );
  useEffect(
    () => () => { geometry.dispose(); hitGeometry.dispose(); material.dispose(); hitMaterial.dispose(); },
    [geometry, hitGeometry, material, hitMaterial]
  );

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const c = new THREE.Color();
    markers.forEach((m, i) => mesh.setColorAt(i, c.set(markerColor(m))));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    const seen = new Set(markers.map((m) => m.id));
    for (const id of Array.from(current.current.keys())) if (!seen.has(id)) current.current.delete(id);
    invalidate();
  }, [markers, count, invalidate]);

  useEffect(() => { invalidate(); }, [targets, projection, hover, activeIndex, lodScale, invalidate]);

  useEffect(() => {
    if (hover !== null && hover >= markers.length) setHover(null);
  }, [hover, markers.length]);

  const tmp = useMemo(
    () => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), w: new THREE.Vector3(), cam: new THREE.Vector3() }),
    []
  );

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    const hit = hitRef.current;
    if (!mesh || !hit) return;
    const k = reducedMotion ? 1 : 1 - Math.exp(-MOVE_LAMBDA * Math.min(delta, 0.1));
    let moving = false;
    const gw = globeWeight.current;
    const nextGw = reducedMotion ? projection.earthOpacity : gw + (projection.earthOpacity - gw) * k;
    globeWeight.current = Math.abs(nextGw - projection.earthOpacity) < EPS ? projection.earthOpacity : nextGw;
    if (globeWeight.current !== projection.earthOpacity) moving = true;
    state.camera.getWorldPosition(tmp.cam);
    tmp.cam.normalize();
    for (let i = 0; i < markers.length; i++) {
      const id = markers[i].id;
      const target = targets[i];
      let cur = current.current.get(id);
      if (!cur) {
        cur = target.clone();
        current.current.set(id, cur);
        boundsDirty.current = true;
      } else if (cur.distanceToSquared(target) > EPS * EPS) {
        cur.lerp(target, k);
        boundsDirty.current = true;
        if (cur.distanceToSquared(target) > EPS * EPS) moving = true;
        else cur.copy(target);
      }
      const lifted = i === hover || i === activeIndex;
      let facing = 1;
      if (globeWeight.current > 0.01) {
        mesh.localToWorld(tmp.w.copy(cur));
        facing = tmp.w.normalize().dot(tmp.cam);
      }
      const { size, hit: hitSize } = markerScales({ lifted, lodScale, facing, globeWeight: globeWeight.current });
      tmp.m.compose(cur, tmp.q, tmp.s.setScalar(size));
      mesh.setMatrixAt(i, tmp.m);
      tmp.m.compose(cur, tmp.q, tmp.s.setScalar(hitSize));
      hit.setMatrixAt(i, tmp.m);
    }
    mesh.count = markers.length;
    hit.count = markers.length;
    mesh.instanceMatrix.needsUpdate = true;
    hit.instanceMatrix.needsUpdate = true;
    if (boundsDirty.current) {
      hit.computeBoundingSphere();
      boundsDirty.current = false;
    }
    const place = (g: THREE.Group | null, idx: number | null | undefined, lift: number) => {
      if (!g) return;
      const m = typeof idx === "number" ? markers[idx] : undefined;
      const p = m ? current.current.get(m.id) : undefined;
      g.visible = !!p;
      if (p) g.position.copy(p).multiplyScalar(lift);
    };
    place(tipRef.current, hover, 1.12);
    place(activeRef.current, activeIndex, 1);
    if (moving) invalidate();
  });

  const reportHover = (idx: number | null) => {
    setHover(idx);
    onHoverChange?.(idx === null ? null : markers[idx] || null);
  };

  const handleClick = (m: CanonMarker) => {
    if (onSelectChange) {
      onSelectChange(m);
      return;
    }
    if (m.kind === "canon-entry" && m.href) router.push(`/canon/${m.branch}/${m.href}`);
    else router.push(`/canon/${m.branch}`);
  };

  const hovered = hover !== null ? markers[hover] : undefined;

  return (
    <group>
      <instancedMesh key={`v-${count}`} ref={meshRef} args={[geometry, material, count]} frustumCulled={false} />
      <instancedMesh
        key={`h-${count}`}
        ref={hitRef}
        args={[hitGeometry, hitMaterial, count]}
        frustumCulled={false}
        onPointerMove={(e) => {
          e.stopPropagation();
          if (e.instanceId === undefined || e.instanceId === hover) return;
          reportHover(e.instanceId);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => { reportHover(null); document.body.style.cursor = "auto"; }}
        onClick={(e) => {
          e.stopPropagation();
          if (e.instanceId !== undefined && markers[e.instanceId]) handleClick(markers[e.instanceId]);
        }}
      />
      <group ref={activeRef} visible={false}>
        <Billboard>
          <mesh>
            <ringGeometry args={[0.048, 0.078, 48]} />
            <meshBasicMaterial color="#D9A43A" transparent opacity={0.7} side={THREE.DoubleSide} toneMapped={false} depthWrite={false} />
          </mesh>
          <mesh>
            <ringGeometry args={[0.08, 0.092, 48]} />
            <meshBasicMaterial color="#D9A43A" transparent opacity={0.45} side={THREE.DoubleSide} toneMapped={false} depthWrite={false} />
          </mesh>
        </Billboard>
      </group>
      <group ref={tipRef} visible={false}>
        {hovered && (
          <Html center zIndexRange={[100, 0]}>
            <MarkerTooltip m={hovered} color={markerColor(hovered)} />
          </Html>
        )}
      </group>
    </group>
  );
}
