"use client";

import type { CSSProperties, ReactNode } from "react";
import { Art, type ArtName } from "@/ui/art";
import { FlagBand, Ground, Sticker, type StickerSpot } from "@/ui";
import type { GroundPattern, GroundTone } from "@/ui/world";
import { world as worldOf, type World, type WorldId } from "@/ui/art/play";
import styles from "./world.module.css";

type GroundProps = { tone: GroundTone; pattern: GroundPattern; tile?: ArtName };

function groundOf(w: World, dark = false): GroundProps {
  const tone: GroundTone = dark && (w.ground === "paper" || w.ground === "ochre") ? "tyrian" : w.ground;
  if (w.pattern === "azulejo-grid" || w.pattern === "girih") return { tone, pattern: "tile", tile: w.pattern };
  if (w.pattern === "dots" && dark) return { tone, pattern: "lattice" };
  return { tone, pattern: w.pattern };
}

const SLOTS: Omit<StickerSpot, "name">[] = [
  { x: "10px", y: "6px", size: 44, rotate: -10 },
  { x: "10px", y: "4px", size: 44, rotate: 9, side: "right" },
  { x: "12px", y: "6px", size: 44, rotate: 7, anchor: "bottom" },
  { x: "12px", y: "4px", size: 44, rotate: -12, side: "right", anchor: "bottom" },
  { x: "14px", y: "44%", size: 36, rotate: 12 },
  { x: "14px", y: "40%", size: 36, rotate: -8, side: "right" },
];

function StageStickerSet({ id, clearBottom = false }: { id: WorldId; clearBottom?: boolean }) {
  return (
    <div className={styles.stickerLayer} aria-hidden="true">
      {worldOf(id).stage.map((art, i) => {
        const spot = SLOTS[i % SLOTS.length];
        const placed = clearBottom && spot.anchor === "bottom" ? { ...spot, anchor: "top" as const, y: "28%" } : spot;
        return <Sticker key={i} name={art} {...placed} className={styles.slot} />;
      })}
    </div>
  );
}

export function WorldStickers({ id }: { id: WorldId }) {
  return <StageStickerSet id={id} clearBottom />;
}

export function WorldStage({ id, children, className, testId }: { id: WorldId; children: ReactNode; className?: string; testId?: string }) {
  return (
    <Ground {...groundOf(worldOf(id), true)} className={`${styles.stage} ${className ?? ""}`} testId={testId}>
      <StageStickerSet id={id} />
      <div className={styles.stageBody}>{children}</div>
    </Ground>
  );
}

function Decor({ world }: { world: World }) {
  return (
    <div className={styles.decorLayer} aria-hidden="true">
      {world.decor.map((d, i) => (
        <Sticker key={i} name={d.art} x={`${d.x}%`} y={`${d.y}%`} size={Math.round(d.size * 9)} rotate={d.tilt} />
      ))}
    </div>
  );
}

export function WorldPreview({ id }: { id: WorldId }) {
  const w = worldOf(id);
  return (
    <Ground {...groundOf(w)} className={styles.preview}>
      <Decor world={w} />
      <span className={styles.previewHero} aria-hidden="true"><Art name={w.hero} size={84} shadow /></span>
    </Ground>
  );
}

export default function GameWorld({ id, title, caption, active = false, aside, children }: { id: WorldId; title?: ReactNode; caption?: ReactNode; active?: boolean; aside?: ReactNode; children: ReactNode }) {
  const w = worldOf(id);
  return (
    <section className={styles.world} data-world={w.id} data-piece={w.piece} data-active={active} data-testid="game-world" style={{ "--world-accent": w.accent } as CSSProperties}>
      <Ground {...groundOf(w)} className={styles.banner}>
        <Decor world={w} />
        <span className={styles.hero} aria-hidden="true"><Art name={w.hero} size={160} shadow /></span>
        <div className={styles.title}>
          <p className={styles.caption}>{caption ?? w.caption}</p>
          <h1 className={styles.name}>{title ?? w.name}</h1>
        </div>
        {aside ? <div className={styles.aside}>{aside}</div> : null}
        <FlagBand flags className={styles.bannerBand} />
      </Ground>
      <Ground kind="paper" className={styles.sheet}>{children}</Ground>
    </section>
  );
}

const PIECES = { paper: styles.piecePaper, ticket: styles.pieceTicket, seal: styles.pieceSeal, "torn-label": styles.pieceLabel, kente: styles.pieceKente, azulejo: styles.pieceAzulejo, "flag-tile": "" } as const;

export function pieceClass(kind: keyof typeof PIECES): string {
  return PIECES[kind];
}
