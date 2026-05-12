"use client";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";

// Canon markers — data points on the globe at lat/lng (+ optional time).
// Each marker is a small gold sphere. The active one gets a pulsing ring.
// Hover → tooltip; click → routes to entry detail or branch index.

export type CanonMarkerKind =
  | "canon-entry"
  | "figure-birth"
  | "figure-death"
  | "event";

export type CanonMarker = {
  id: string;
  lat: number;
  lng: number;
  year?: number;
  branch: string;
  title: string;
  kind: CanonMarkerKind;
  /** when kind === 'canon-entry', router pushes /canon/<branch>/<href|id>. */
  href?: string;
};

interface CanonMarkersProps {
  markers: CanonMarker[];
  activeIndex?: number;
  radius: number;
  reducedMotion: boolean;
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

const KIND_COLOR: Record<CanonMarkerKind, string> = {
  "canon-entry":  "#D9A43A", // gold-bright
  "figure-birth": "#B8861E", // gold
  "figure-death": "#8A641A", // gold-deep
  "event":        "#B8861E",
};

export function CanonMarkers({
  markers,
  activeIndex,
  radius,
  reducedMotion,
}: CanonMarkersProps) {
  const router = useRouter();
  const [hover, setHover] = useState<number | null>(null);
  const ringRef = useRef<THREE.Mesh | null>(null);

  const positions = useMemo(
    () => markers.map((m) => latLngToVec3(m.lat, m.lng, radius)),
    [markers, radius]
  );

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const ring = ringRef.current;
    if (!ring) return;
    const t = clock.getElapsedTime();
    const s = 1 + Math.sin(t * 2.4) * 0.25 + 0.25;
    ring.scale.setScalar(s * 0.05);
    const mat = ring.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.6 - (s - 1) * 0.55;
  });

  const activePos =
    typeof activeIndex === "number" && activeIndex >= 0 && activeIndex < positions.length
      ? positions[activeIndex]
      : null;
  const activeLookAt = activePos ? activePos.clone().multiplyScalar(2) : null;

  const handleClick = (m: CanonMarker) => {
    if (m.kind === "canon-entry" && m.href) {
      router.push(`/canon/${m.branch}/${m.href}`);
    } else {
      router.push(`/canon/${m.branch}`);
    }
  };

  return (
    <group>
      {markers.map((m, i) => {
        const p = positions[i];
        const color = KIND_COLOR[m.kind];
        const isActive = i === activeIndex;
        const dotScale = isActive ? 0.028 : 0.020;
        // Beam pointing outward from the dot — pulled-up obelisk.
        const beamLen = isActive ? 0.18 : 0.10;
        const beamMid = p.clone().normalize().multiplyScalar(radius + beamLen / 2);
        return (
          <group key={m.id}>
            {/* outward beam */}
            <mesh
              position={beamMid}
              onUpdate={(self) => self.lookAt(beamMid.clone().multiplyScalar(2))}
            >
              <cylinderGeometry args={[dotScale * 0.18, dotScale * 0.18, beamLen, 8, 1, true]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.55}
                toneMapped={false}
                depthWrite={false}
              />
            </mesh>
            {/* halo disc behind dot */}
            <mesh position={p.clone().multiplyScalar(1.001)} onUpdate={(self) => self.lookAt(p.clone().multiplyScalar(2))}>
              <ringGeometry args={[dotScale * 1.2, dotScale * 2.1, 24]} />
              <meshBasicMaterial color={color} transparent opacity={0.35} side={THREE.DoubleSide} toneMapped={false} depthWrite={false} />
            </mesh>
            {/* dot itself */}
            <mesh
              position={p}
              onPointerOver={(e) => { e.stopPropagation(); setHover(i); document.body.style.cursor = "pointer"; }}
              onPointerOut={() => { setHover((h) => (h === i ? null : h)); document.body.style.cursor = "auto"; }}
              onClick={(e) => { e.stopPropagation(); handleClick(m); }}
            >
              <sphereGeometry args={[dotScale, 16, 16]} />
              <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>

            {hover === i && (
              <Html
                position={p.clone().multiplyScalar(1.18)}
                center
                zIndexRange={[100, 0]}
                style={{ pointerEvents: "none" }}
              >
                <div
                  style={{
                    pointerEvents: "none",
                    maxWidth: "240px",
                    background: "var(--bone)",
                    color: "var(--basalt)",
                    border: "1px solid var(--hairline)",
                    padding: "6px 12px",
                    fontFamily: "Cinzel, serif",
                    fontSize: 11,
                    lineHeight: 1.4,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    boxShadow: "0 2px 8px rgba(31,28,22,0.18)",
                    transform: "translate(-50%, -100%) translateY(-8px)",
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                  }}
                >
                  {m.title}{m.year ? ` · ${m.year}` : ""}
                  <div style={{ fontSize: 9, opacity: 0.7, marginTop: 2 }}>
                    {m.branch}
                  </div>
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {activePos && activeLookAt && (
        <mesh
          ref={ringRef}
          position={activePos.clone().multiplyScalar(1.001)}
          onUpdate={(self) => self.lookAt(activeLookAt)}
          scale={0.05}
        >
          <ringGeometry args={[0.7, 1, 32]} />
          <meshBasicMaterial
            color={"#D9A43A"}
            transparent
            opacity={0.55}
            side={THREE.DoubleSide}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
