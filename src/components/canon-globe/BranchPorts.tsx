"use client";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import type { GlobeBranch } from "../CanonGlobe";

interface BranchPortsProps {
  branches: GlobeBranch[];
  activeIndex: number;
  radius: number;
  reducedMotion: boolean;
}

const DEG2RAD = Math.PI / 180;

export function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * DEG2RAD;
  const theta = lng * DEG2RAD;
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.cos(theta)
  );
}

// Status colors mapped to bucket palette.
const STATUS_COLOR: Record<GlobeBranch["status"], THREE.Color> = {
  "complete":        new THREE.Color("#D9A43A"), // gold-bright
  "in progress":     new THREE.Color("#B8861E"), // gold
  "scaffolded":      new THREE.Color("#8A641A"), // gold-deep
  "intake":          new THREE.Color("#D3C9AB"), // bone-3
  "not yet opened":  new THREE.Color("#3A3529"), // basalt-3
};

const STATUS_PULSE: Record<GlobeBranch["status"], boolean> = {
  "complete": true,
  "in progress": false,
  "scaffolded": false,
  "intake": false,
  "not yet opened": false,
};

// Lay out branches: primary 7 around equator, extras (08, 09s) at +45°N
function portLatLng(idx: number, total: number, primaryCount: number): { lat: number; lng: number } {
  if (idx < primaryCount) {
    const lng = (idx / primaryCount) * 360 - 180;
    return { lat: 0, lng };
  }
  const extras = total - primaryCount;
  const ringIdx = idx - primaryCount;
  const lng = (ringIdx / Math.max(extras, 1)) * 360 - 180;
  return { lat: 45, lng };
}

export function BranchPorts({
  branches,
  activeIndex,
  radius,
  reducedMotion,
}: BranchPortsProps) {
  const router = useRouter();
  const [hover, setHover] = useState<number | null>(null);
  const ringRefs = useRef<Array<THREE.Mesh | null>>([]);

  const primaryCount = Math.min(7, branches.length);
  const positions = useMemo(
    () => branches.map((_, i) => {
      const { lat, lng } = portLatLng(i, branches.length, primaryCount);
      return latLngToVec3(lat, lng, radius);
    }),
    [branches, radius, primaryCount]
  );

  // Pulse complete-status rings
  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const t = clock.getElapsedTime();
    branches.forEach((b, i) => {
      const ring = ringRefs.current[i];
      if (!ring) return;
      if (STATUS_PULSE[b.status]) {
        const s = 1 + Math.sin(t * 2.4 + i * 0.7) * 0.25 + 0.25;
        ring.scale.setScalar(s);
        const mat = ring.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.65 - (s - 1) * 0.6;
      }
    });
  });

  return (
    <group>
      {branches.map((b, i) => {
        const p = positions[i];
        const isActive = i === activeIndex;
        const color = STATUS_COLOR[b.status];
        const pulse = STATUS_PULSE[b.status];
        const dotScale = isActive ? 0.028 : 0.018;

        // Orient ring tangent to sphere
        const lookAt = p.clone().multiplyScalar(2);

        return (
          <group key={b.slug}>
            {/* dot */}
            <mesh
              position={p}
              onPointerOver={(e) => { e.stopPropagation(); setHover(i); document.body.style.cursor = "pointer"; }}
              onPointerOut={() => { setHover((h) => (h === i ? null : h)); document.body.style.cursor = "auto"; }}
              onClick={(e) => { e.stopPropagation(); router.push(`/canon/${b.slug}`); }}
            >
              <sphereGeometry args={[dotScale, 16, 16]} />
              <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>

            {/* pulse ring (only renders for "complete" status) */}
            {pulse && (
              <mesh
                ref={(el) => { ringRefs.current[i] = el; }}
                position={p.clone().multiplyScalar(1.001)}
                onUpdate={(self) => self.lookAt(lookAt)}
                scale={0.04}
              >
                <ringGeometry args={[0.7, 1, 32]} />
                <meshBasicMaterial
                  color={color}
                  transparent
                  opacity={0.55}
                  side={THREE.DoubleSide}
                  toneMapped={false}
                  depthWrite={false}
                />
              </mesh>
            )}

            {/* hover tooltip */}
            {hover === i && (
              <Html position={p.clone().multiplyScalar(1.18)} center distanceFactor={6} zIndexRange={[100, 0]}>
                <div
                  style={{
                    pointerEvents: "none",
                    whiteSpace: "nowrap",
                    background: "var(--bone)",
                    color: "var(--basalt)",
                    border: "1px solid var(--hairline)",
                    padding: "4px 10px",
                    fontFamily: "Cinzel, serif",
                    fontSize: 11,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    boxShadow: "0 2px 8px rgba(31,28,22,0.18)",
                  }}
                >
                  {b.numeral} · {b.name} · {b.status} · {b.entryCount}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
