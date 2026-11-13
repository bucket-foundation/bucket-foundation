"use client";

import type { SpyDecor, SpyScene } from "@academy/ispy";
import styles from "./ispy.module.css";

export type SpyMark = "right" | "wrong" | "answer";

function Decor({ d }: { d: SpyDecor }) {
  const style = { left: `${d.x}%`, top: `${d.y}%`, transform: `rotate(${d.tilt}deg)`, "--sz": `${d.size}cqw` } as React.CSSProperties;
  if (d.kind === "script") return <span className={styles.script} style={style} aria-hidden="true">{d.text}</span>;
  return <span className={styles[d.kind]} style={style} aria-hidden="true" />;
}

export default function Scene({ scene, marks, locked, onTap }: { scene: SpyScene; marks: Record<string, SpyMark>; locked: boolean; onTap: (id: string) => void }) {
  return (
    <div className={styles.scene} data-scene={scene.id} data-testid="spy-scene" aria-label={scene.name}>
      {scene.decor.map((d, i) => (
        <Decor key={i} d={d} />
      ))}
      {scene.objects.map((o) => (
        <button
          key={o.id}
          type="button"
          className={`${styles.thing} ${styles[`art_${o.art}`]}`}
          style={{ left: `${o.x}%`, top: `${o.y}%`, "--tilt": `${o.tilt}deg` } as React.CSSProperties}
          data-mark={marks[o.id]}
          data-testid="spy-object"
          data-id={o.id}
          disabled={locked}
          aria-label="object"
          onClick={() => onTap(o.id)}
        >
          <span className={styles.glyph}>{o.glyph}</span>
        </button>
      ))}
    </div>
  );
}
