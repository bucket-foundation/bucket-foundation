"use client";

import { Button } from "@/ui";
import type { SpyDecor, SpyScene } from "@academy/ispy";
import { Art } from "@/ui/art";
import { ObjectArt } from "@/ui/art/objects";
import styles from "./ispy.module.css";

export type SpyMark = "right" | "wrong" | "answer";

function Decor({ d }: { d: SpyDecor }) {
  return (
    <span className={styles.decor} style={{ left: `${d.x}%`, top: `${d.y}%`, width: `${d.size}%`, transform: `rotate(${d.tilt}deg)` }} aria-hidden="true">
      <Art name={d.art} size={100} style={{ width: "100%", height: "auto" }} />
    </span>
  );
}

export default function Scene({ scene, marks, locked, onTap }: { scene: SpyScene; marks: Record<string, SpyMark>; locked: boolean; onTap: (id: string) => void }) {
  return (
    <div className={styles.scene} data-scene={scene.id} data-testid="spy-scene" aria-label={scene.name}>
      {scene.decor.map((d, i) => (
        <Decor key={i} d={d} />
      ))}
      {scene.objects.map((o) => (
        <Button bare
          key={o.id}
         
          className={`${styles.thing} ${styles[`art_${o.art}`]}`}
          style={{ left: `${o.x}%`, top: `${o.y}%`, "--tilt": `${o.tilt}deg` } as React.CSSProperties}
          data-mark={marks[o.id]}
          data-testid="spy-object"
          data-id={o.id}
          disabled={locked}
          aria-label="Picture"
          onClick={() => onTap(o.id)}
        >
          <ObjectArt id={o.id} className={styles.glyph} />
        </Button>
      ))}
    </div>
  );
}
