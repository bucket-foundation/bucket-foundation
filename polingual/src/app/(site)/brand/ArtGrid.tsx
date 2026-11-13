"use client";

import { ButtonLink, Card } from "@/ui";
import { ART, artDataUrl, artSvg } from "@/ui/art";
import s from "./kit.module.css";

function allUrl() {
  const cols = 6;
  const cell = 220;
  const rows = Math.ceil(ART.length / cols);
  const parts = ART.map((a, i) => {
    const inner = artSvg(a.name).replace(/ width="[\d.]+" height="[\d.]+"/, ` x="${(i % cols) * cell + 20}" y="${Math.floor(i / cols) * cell + 20}" width="${cell - 40}" height="${cell - 40}"`).replace(/id="([^"]+)"/g, `id="${a.name}-$1"`).replace(/url\(#([^)]+)\)/g, `url(#${a.name}-$1)`);
    const bg = a.dark ? `<rect x="${(i % cols) * cell}" y="${Math.floor(i / cols) * cell}" width="${cell}" height="${cell}" fill="#5B1A4A"/>` : "";
    return bg + inner;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols * cell} ${rows * cell}" width="${cols * cell}" height="${rows * cell}"><rect width="100%" height="100%" fill="#F6EEDC"/>${parts.join("")}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function ArtGrid() {
  return (
    <>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20 }}>
        <ButtonLink href={allUrl()} download="polingual-artwork.svg" variant="primary" size="md">
          Download all {ART.length} pieces
        </ButtonLink>
      </div>
      <div className={s.art}>
        {ART.map(({ name, label, origin, dark, Component }) => (
          <Card key={name} pad="sm" className={s.artCell}>
            <div className={dark ? `${s.artStage} ${s.artDark}` : s.artStage}>
              <Component size={104} title={label} />
            </div>
            <strong>{label}</strong>
            <span>{origin}</span>
            <ButtonLink href={artDataUrl(name)} download={`polingual-${name}.svg`} variant="ghost" size="sm" aria-label={`Download ${label} SVG`}>
              SVG
            </ButtonLink>
          </Card>
        ))}
      </div>
    </>
  );
}
