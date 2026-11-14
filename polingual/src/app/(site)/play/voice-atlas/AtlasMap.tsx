"use client";

import { useEffect, useMemo, useState } from "react";
import type { LatLon } from "@academy/voice-atlas";
import { mapPoint } from "@/lib/lobby/atlas-play";
import { landPath, MAP_H, MAP_W, project, unproject, type Topology } from "@/lib/lobby/world";
import { WorldStage } from "../GameWorld";
import styles from "../play.module.css";

let landCache: string | null = null;

const LAND_HOLD = "M60,70 C90,40 170,40 200,80 C220,110 180,150 140,150 C110,170 70,140 60,110 Z M240,60 C300,30 420,40 470,70 C520,100 500,150 450,160 C420,190 380,230 340,210 C300,190 280,150 250,130 C230,110 220,80 240,60 Z M150,190 C170,180 190,200 185,240 C180,280 160,300 150,280 C140,250 135,210 150,190 Z M470,220 C500,210 530,230 520,250 C505,270 470,265 465,245 Z";

function LandHold() {
  return <path d={LAND_HOLD} transform="scale(1.3 1.1)" className={styles.vaLand} opacity={0.5} data-testid="land-loading" />;
}

function useLand(): string {
  const [d, setD] = useState(landCache ?? "");
  useEffect(() => {
    if (landCache) return;
    let live = true;
    void import("world-atlas/land-110m.json").then((m) => {
      landCache = landPath((m.default ?? m) as unknown as Topology);
      if (live) setD(landCache);
    });
    return () => {
      live = false;
    };
  }, []);
  return d;
}

export default function AtlasMap({ pin, home, onPin }: { pin: LatLon | null; home: LatLon | null; onPin: ((p: LatLon) => void) | null }) {
  const land = useLand();
  const map = useMemo(() => (land ? <path d={land} className={styles.vaLand} /> : <LandHold />), [land]);
  const [hx, hy] = home ? project(home[1], home[0]) : [0, 0];
  const [px, py] = pin ? project(pin[1], pin[0]) : [0, 0];
  const onMap = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!onPin) return;
    const [x, y] = mapPoint(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect(), MAP_W, MAP_H);
    onPin(unproject(x, y));
  };
  return (
    <WorldStage id="voice-atlas">
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className={styles.vaMap} onPointerDown={onMap} role="img" aria-label="World map" data-testid="va-map">
        {map}
        {home ? <line x1={px} y1={py} x2={hx} y2={hy} className={styles.vaLine} /> : null}
        {pin ? (
          <g transform={`translate(${px} ${py}) rotate(-8)`} className={styles.vaStamp}>
            <rect x={-9} y={-9} width={18} height={18} rx={3} />
            <rect x={-6} y={-6} width={12} height={12} rx={2} className={styles.vaStampInner} />
          </g>
        ) : null}
        {home ? (
          <g transform={`translate(${hx} ${hy})`} className={styles.vaHome}>
            <path d="M0 -11l3.2 7.8 7.8 3.2-7.8 3.2-3.2 7.8-3.2-7.8-7.8-3.2 7.8-3.2z" />
          </g>
        ) : null}
      </svg>
    </WorldStage>
  );
}
