"use client";

import type { CSSProperties, ReactNode } from "react";
import { Art, artDataUrl } from "@/ui/art";
import { world as worldOf, type World, type WorldId } from "@/ui/art/play";
import styles from "./world.module.css";

function groundStyle(w: World): CSSProperties {
  const tile = w.pattern === "azulejo-grid" || w.pattern === "girih" ? `url("${artDataUrl(w.pattern)}")` : undefined;
  return { "--world-accent": w.accent, ...(tile ? { "--world-tile": tile } : {}) } as CSSProperties;
}

export function WorldGround({ world, children, className }: { world: World; children?: ReactNode; className?: string }) {
  return (
    <div className={`${styles.ground} ${className ?? ""}`} data-ground={world.ground} data-pattern={world.pattern} style={groundStyle(world)}>
      {world.decor.map((d, i) => (
        <span key={i} className={styles.decor} style={{ left: `${d.x}%`, top: `${d.y}%`, width: `${d.size}%`, rotate: `${d.tilt}deg` }} aria-hidden="true">
          <Art name={d.art} size={100} shadow style={{ width: "100%", height: "auto" }} />
        </span>
      ))}
      {children}
    </div>
  );
}

export function WorldPreview({ id }: { id: WorldId }) {
  const w = worldOf(id);
  return (
    <WorldGround world={w} className={styles.preview}>
      <span className={styles.previewHero} aria-hidden="true"><Art name={w.hero} size={84} shadow /></span>
    </WorldGround>
  );
}

export default function GameWorld({ id, title, caption, active = false, children }: { id: WorldId; title?: ReactNode; caption?: ReactNode; active?: boolean; children: ReactNode }) {
  const w = worldOf(id);
  return (
    <section className={styles.world} data-world={w.id} data-piece={w.piece} data-active={active} data-testid="game-world" style={{ "--world-accent": w.accent } as CSSProperties}>
      <WorldGround world={w} className={styles.banner}>
        <span className={styles.hero} aria-hidden="true"><Art name={w.hero} size={160} shadow /></span>
        <div className={styles.title}>
          <p className={styles.caption}>{caption ?? w.caption}</p>
          <h1 className={styles.name}>{title ?? w.name}</h1>
        </div>
      </WorldGround>
      <div className={styles.sheet}>{children}</div>
    </section>
  );
}

const PIECES = { ticket: styles.pieceTicket, seal: styles.pieceSeal, "torn-label": styles.pieceLabel, kente: styles.pieceKente, azulejo: styles.pieceAzulejo, "flag-tile": "" } as const;

export function pieceClass(kind: keyof typeof PIECES): string {
  return PIECES[kind];
}
