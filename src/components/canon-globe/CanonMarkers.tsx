"use client";
import { Html } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";

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
  cameraPosition?: [number, number, number];
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

export function CanonMarkers({
  markers,
  activeIndex,
  radius,
  reducedMotion: _reducedMotion,
  cameraDistance,
  cameraPosition,
  onHoverChange,
  onSelectChange,
}: CanonMarkersProps) {
  const router = useRouter();
  const [hover, setHover] = useState<number | null>(null);

  const lodScale = useMemo(() => {
    if (cameraDistance === undefined) return 1;
    const FAR = 3.4;
    const NEAR = 1.04;
    const MIN_SCALE = 0.30;
    const t = (cameraDistance - NEAR) / (FAR - NEAR);
    return MIN_SCALE + Math.max(0, Math.min(1, t)) * (1 - MIN_SCALE);
  }, [cameraDistance]);

  const visible = useMemo<boolean[]>(() => {
    if (!cameraPosition) return markers.map(() => true);
    const [cx, cy, cz] = cameraPosition;
    return markers.map((m) => {
      const mp = latLngToVec3(m.lat, m.lng, 1);
      return mp.x * cx + mp.y * cy + mp.z * cz > 1.02;
    });
  }, [markers, cameraPosition]);

  useEffect(() => {
    if (hover !== null && visible[hover] === false) {
      setHover(null);
      onHoverChange?.(null);
    }
  }, [hover, visible, onHoverChange]);

  const reportHover = (idx: number | null) => {
    setHover(idx);
    if (onHoverChange) onHoverChange(idx === null ? null : markers[idx] || null);
  };
  const positions = useMemo(
    () => markers.map((m) => latLngToVec3(m.lat, m.lng, radius)),
    [markers, radius]
  );

  const activePos =
    typeof activeIndex === "number" && activeIndex >= 0 && activeIndex < positions.length
      ? positions[activeIndex]
      : null;

  const handleClick = (m: CanonMarker) => {
    if (onSelectChange) {
      onSelectChange(m);
      return;
    }
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
        const color = markerColor(m);
        const isActive = i === activeIndex;
        const isHover = i === hover;
        const isFront = visible[i];

        const lifted = isHover || isActive;
        const baseHead = lifted ? 0.034 : 0.024 * lodScale;
        const baseStem = lifted ? 0.10 : 0.06 * lodScale;
        const headScale = baseHead;
        const stemLen = baseStem;
        const haloOuter = lifted ? 3.2 : 2.2;
        const backOpacity = isFront ? 1 : 0.25;

        const normal = p.clone().normalize();
        const anchor = normal.clone().multiplyScalar(radius + 0.001);
        const stemMid = normal.clone().multiplyScalar(radius + stemLen / 2);
        const head = normal.clone().multiplyScalar(radius + stemLen + headScale * 0.6);

        return (
          <group key={m.id}>
            <mesh
              position={anchor}
              onUpdate={(self) => self.lookAt(anchor.clone().add(normal))}
            >
              <ringGeometry args={[headScale * 0.7, headScale * haloOuter, 32]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={(lifted ? 0.55 : 0.28) * backOpacity}
                side={THREE.DoubleSide}
                toneMapped={false}
                depthWrite={false}
              />
            </mesh>

            <mesh
              position={stemMid}
              onUpdate={(self) => self.lookAt(stemMid.clone().add(normal))}
            >
              <cylinderGeometry args={[headScale * 0.14, headScale * 0.20, stemLen, 8, 1, false]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.85 * backOpacity}
                toneMapped={false}
              />
            </mesh>

            {lifted && isFront && (
              <mesh
                position={head}
                onUpdate={(self) => self.lookAt(head.clone().add(normal))}
              >
                <ringGeometry args={[headScale * 1.05, headScale * 1.55, 24]} />
                <meshBasicMaterial
                  color={color}
                  transparent
                  opacity={0.45}
                  side={THREE.DoubleSide}
                  toneMapped={false}
                  depthWrite={false}
                />
              </mesh>
            )}

            <mesh position={head}>
              <sphereGeometry args={[headScale, 18, 18]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={backOpacity}
                toneMapped={false}
              />
            </mesh>

            <mesh position={head.clone().multiplyScalar(1.0008)}>
              <sphereGeometry args={[headScale * 0.45, 12, 12]} />
              <meshBasicMaterial
                color="#FFF8E6"
                transparent
                opacity={0.7 * backOpacity}
                toneMapped={false}
              />
            </mesh>

            {isFront && (
              <mesh
                position={head}
                onPointerOver={(e) => { e.stopPropagation(); reportHover(i); document.body.style.cursor = "pointer"; }}
                onPointerOut={() => { reportHover(null); document.body.style.cursor = "auto"; }}
                onClick={(e) => { e.stopPropagation(); handleClick(m); }}
              >
                <sphereGeometry args={[Math.max(headScale * 4, 0.04), 10, 10]} />
                <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} />
              </mesh>
            )}

            {isHover && (
              <Html
                position={head.clone().multiplyScalar(1.4)}
                center
                zIndexRange={[100, 0]}
              >
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
              </Html>
            )}
          </group>
        );
      })}

      {activePos && (
        <>
          <mesh
            position={activePos.clone().multiplyScalar(1.0005)}
            onUpdate={(self) => self.lookAt(activePos.clone().multiplyScalar(2))}
          >
            <ringGeometry args={[0.048, 0.078, 48]} />
            <meshBasicMaterial
              color={"#D9A43A"}
              transparent
              opacity={0.7}
              side={THREE.DoubleSide}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
          <mesh
            position={activePos.clone().multiplyScalar(1.0007)}
            onUpdate={(self) => self.lookAt(activePos.clone().multiplyScalar(2))}
          >
            <ringGeometry args={[0.08, 0.092, 48]} />
            <meshBasicMaterial
              color={"#D9A43A"}
              transparent
              opacity={0.45}
              side={THREE.DoubleSide}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
        </>
      )}
    </group>
  );
}
