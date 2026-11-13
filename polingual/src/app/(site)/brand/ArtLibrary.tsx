"use client";

import { useMemo, useState } from "react";
import { Button, Pill } from "@/ui";
import { PIECES, pieceFile, type Piece } from "@/ui/art/brand";
import styles from "./brand.module.css";

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export function pngBlob(svg: string, scale: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no canvas"));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("png failed"))), "image/png");
    };
    img.onerror = () => reject(new Error("svg failed to load"));
    img.src = svgUrl(svg);
  });
}

function PieceCard({ p }: { p: Piece }) {
  const [busy, setBusy] = useState(false);
  const png = async (scale: number) => {
    setBusy(true);
    try {
      save(await pngBlob(p.svg, scale), `${pieceFile(p)}@${scale}x.png`);
    } finally {
      setBusy(false);
    }
  };
  return (
    <li className={styles.piece} data-kind={p.kind}>
      <div className={styles.pieceStage} data-dark={p.dark || p.kind === "hero" || undefined}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={svgUrl(p.svg)} alt={p.label} loading="lazy" />
      </div>
      <strong>{p.label}</strong>
      <span>{p.origin}</span>
      <div className={styles.pieceDl}>
        <Button size="sm" variant="secondary" onClick={() => save(new Blob([p.svg], { type: "image/svg+xml" }), `${pieceFile(p)}.svg`)} aria-label={`Download ${p.label} SVG`}>SVG</Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => png(1)} aria-label={`Download ${p.label} PNG at 1x`}>PNG 1x</Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => png(4)} aria-label={`Download ${p.label} PNG at 4x`}>PNG 4x</Button>
      </div>
    </li>
  );
}

const FILTERS = [["all", "All"], ["hero", "Hero pieces"], ["object", "Sticker objects"]] as const;

export default function ArtLibrary() {
  const [kind, setKind] = useState<(typeof FILTERS)[number][0]>("all");
  const shown = useMemo(() => PIECES.filter((p) => kind === "all" || p.kind === kind), [kind]);
  return (
    <>
      <div className={styles.filters} role="group" aria-label="Filter artwork">
        {FILTERS.map(([k, label]) => (
          <Pill key={k} active={kind === k} aria-pressed={kind === k} onClick={() => setKind(k)}>
            {label} · {PIECES.filter((p) => k === "all" || p.kind === k).length}
          </Pill>
        ))}
      </div>
      <ul className={styles.library}>
        {shown.map((p) => <PieceCard key={`${p.kind}-${p.id}`} p={p} />)}
      </ul>
    </>
  );
}
