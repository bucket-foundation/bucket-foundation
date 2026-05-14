"use client";
import { Html } from "@react-three/drei";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";

// Canon markers — data points on the globe at lat/lng (+ optional time).
// Each marker is a small gold sphere. The active one gets a pulsing ring.
// Hover → tooltip; click → routes to entry detail or branch index.

export type CanonMarkerKind =
  | "canon-entry"
  | "figure-birth"
  | "figure-death"
  | "event"
  | "archaeological-site";  // material-evidence layer

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
  /** archaeological-site extras */
  civilization?: string;
  lidar?: string;
  unesco?: string;
  wikipedia?: string;
};

interface CanonMarkersProps {
  markers: CanonMarker[];
  activeIndex?: number;
  radius: number;
  reducedMotion: boolean;
  onHoverChange?: (m: CanonMarker | null) => void;
  /** If provided, clicking a marker fires this instead of routing. */
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

// Branch → marker color. Each canon branch gets its own hue so the globe
// reads as a coloured-coded atlas at a glance. Gradient anchored to the
// bone+gold palette so it stays legible on the dot-pattern earth.
const BRANCH_COLOR: Record<string, string> = {
  mathematics:  "#D9A43A", // gold-bright
  physics:      "#3E6FA8", // aegean
  chemistry:    "#9B5A2C", // ochre
  information:  "#557B66", // laurel
  biophysics:   "#8E3E3E", // terra red
  cosmology:    "#5B4882", // indigo
  mind:         "#C2873E", // amber
  "deep-history": "#7A5D3E", // umber
  "sacred-texts": "#A0863F", // tarnished gold
  earth:        "#4A6E5E",
  art:          "#A45A4C",
};

const KIND_COLOR: Record<CanonMarkerKind, string> = {
  "canon-entry":  "#D9A43A",
  "figure-birth": "#B8861E",
  "figure-death": "#8A641A",
  "event":        "#B8861E",
  "archaeological-site": "#6E5840",
};

function markerColor(m: CanonMarker): string {
  // Archaeological sites get a stone-grey / aged-bronze tone so they're
  // visually distinct from the figure/event markers.
  if (m.kind === "archaeological-site") return "#6E5840";
  const b = (m.branch || "").replace(/^\d+-/, "");
  return BRANCH_COLOR[b] || KIND_COLOR[m.kind] || "#D9A43A";
}

export function CanonMarkers({
  markers,
  activeIndex,
  radius,
  reducedMotion: _reducedMotion,
  onHoverChange,
  onSelectChange,
}: CanonMarkersProps) {
  const router = useRouter();
  const [hover, setHover] = useState<number | null>(null);

  // Bubble hovered marker up so the parent (outside the Canvas) can render a
  // guaranteed-visible panel — the in-3D Html tooltip alone gets clipped on
  // some viewports / canvas configurations.
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
    // If parent provided a select handler, open the side drawer instead of
    // routing. Routing remains the fallback for legacy embeds.
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

        // Mapbox-style pin: head + stem + surface halo.
        // Scale animates with hover/active — discrete steps (not useFrame)
        // so we stay frameloop="demand" friendly.
        const lifted = isHover || isActive;
        const headScale = lifted ? 0.034 : 0.024;
        const stemLen = lifted ? 0.10 : 0.06;
        const haloOuter = lifted ? 3.2 : 2.2;

        const normal = p.clone().normalize();
        // Anchor: where the pin meets the globe surface (just above).
        const anchor = normal.clone().multiplyScalar(radius + 0.001);
        // Stem center: midpoint between anchor and head.
        const stemMid = normal.clone().multiplyScalar(radius + stemLen / 2);
        // Head: the dot at the top of the pin.
        const head = normal.clone().multiplyScalar(radius + stemLen + headScale * 0.6);

        return (
          <group key={m.id}>
            {/* Surface halo — a flat disc on the globe, like a drop-shadow.
                Bigger and brighter when hovered/active. Visually attaches
                the pin to the surface. */}
            <mesh
              position={anchor}
              onUpdate={(self) => self.lookAt(anchor.clone().add(normal))}
            >
              <ringGeometry args={[headScale * 0.7, headScale * haloOuter, 32]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={lifted ? 0.55 : 0.28}
                side={THREE.DoubleSide}
                toneMapped={false}
                depthWrite={false}
              />
            </mesh>

            {/* Pin stem — slim cylinder anchoring the head to the surface */}
            <mesh
              position={stemMid}
              onUpdate={(self) => self.lookAt(stemMid.clone().add(normal))}
            >
              <cylinderGeometry args={[headScale * 0.14, headScale * 0.20, stemLen, 8, 1, false]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.85}
                toneMapped={false}
              />
            </mesh>

            {/* Pin head (outer glow ring on hover) */}
            {lifted && (
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

            {/* Pin head — the visible dot */}
            <mesh position={head}>
              <sphereGeometry args={[headScale, 18, 18]} />
              <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>

            {/* Crisp white inner highlight on the head — makes it pop on
                the dot-pattern earth */}
            <mesh position={head.clone().multiplyScalar(1.0008)}>
              <sphereGeometry args={[headScale * 0.45, 12, 12]} />
              <meshBasicMaterial color="#FFF8E6" transparent opacity={0.7} toneMapped={false} />
            </mesh>

            {/* Invisible large hit-target — 4x head size. Forgiving on
                tight clusters (Europe has 5 markers within ~500km). */}
            <mesh
              position={head}
              onPointerOver={(e) => { e.stopPropagation(); reportHover(i); document.body.style.cursor = "pointer"; }}
              onPointerOut={() => { reportHover(null); document.body.style.cursor = "auto"; }}
              onClick={(e) => { e.stopPropagation(); handleClick(m); }}
            >
              <sphereGeometry args={[headScale * 4, 10, 10]} />
              <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} />
            </mesh>

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
                    background: "rgba(239, 232, 212, 0.96)",  // bone @ 96%
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
                    {m.year ? `${m.year < 0 ? Math.abs(m.year) + " BCE" : m.year + " CE"} · ` : ""}{m.branch}
                  </div>
                  <div
                    style={{
                      fontSize: 8,
                      opacity: 0.5,
                      marginTop: 5,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                    }}
                  >
                    click for details →
                  </div>
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {/* Selected-marker indicator: a wide bright ring on the surface
          + a tiny dot at the centre, marking the chosen anchor. Static
          (no useFrame pulse) to stay friendly with frameloop=demand. */}
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
