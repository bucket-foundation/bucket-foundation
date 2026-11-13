"use client";

import { useId, type CSSProperties } from "react";
import { ART_DATA } from "./data";

export type ArtName = (typeof ART_DATA)[number]["name"];

export type ArtProps = {
  size?: number;
  className?: string;
  title?: string;
  shadow?: boolean;
  style?: CSSProperties;
};

const SHADOW = "drop-shadow(6px 8px 0 rgba(0,0,0,.35))";

function find(name: ArtName) {
  const d = ART_DATA.find((a) => a.name === name);
  if (!d) throw new Error(`unknown art ${name}`);
  return d;
}

function scopeIds(body: string, prefix: string) {
  return body.replace(/id="([^"]+)"/g, `id="${prefix}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`);
}

export function artSvg(name: ArtName) {
  const d = find(name);
  const [, , w, h] = d.viewBox.split(" ").map(Number);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${d.viewBox}" width="${w}" height="${h}">${d.body}</svg>`;
}

export function artDataUrl(name: ArtName) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(artSvg(name))}`;
}

export function Art({ name, size = 96, className, title, shadow = false, style }: ArtProps & { name: ArtName }) {
  const d = find(name);
  const prefix = useId().replace(/[^a-zA-Z0-9]/g, "") + "-";
  const [, , w, h] = d.viewBox.split(" ").map(Number);
  const wide = w >= h;
  const body = (title ? `<title>${title}</title>` : "") + scopeIds(d.body, prefix);
  return (
    <svg
      viewBox={d.viewBox}
      width={wide ? size : (size * w) / h}
      height={wide ? (size * h) / w : size}
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      style={shadow ? { filter: SHADOW, overflow: "visible", ...style } : { overflow: "visible", ...style }}
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}

const make = (name: ArtName) => {
  const C = (p: ArtProps) => <Art name={name} {...p} />;
  C.displayName = `Art(${name})`;
  return C;
};

export const TicketArt = make("ticket");
export const TornLabelArt = make("torn-label");
export const SealArt = make("seal");
export const KenteArt = make("kente");
export const PebbleArt = make("pebble");
export const AzulejoArt = make("azulejo");
export const AzulejoGridArt = make("azulejo-grid");
export const GirihArt = make("girih");
export const FlagBandArt = make("flag-band");
export const StreakFlameArt = make("streak-flame");
export const StreakPotArt = make("streak-pot");
export const StarArt = make("star");
export const BlocksArt = make("blocks");
export const BrushArt = make("brush");
export const BuntingArt = make("bunting");
export const ScriptRuArt = make("script-ru");
export const ScriptKoArt = make("script-ko");
export const ScriptHeArt = make("script-he");
export const CalligraphyAinArt = make("calligraphy-ain");
export const CalligraphyYongArt = make("calligraphy-yong");
export const InkDotArt = make("ink-dot");
export const KenteSwatchArt = make("sk-kente");
export const AzulejoSwatchArt = make("sk-azulejo");
export const GirihSwatchArt = make("sk-girih");
export const SealSwatchArt = make("sk-seal");
export const PaisleySwatchArt = make("sk-paisley");
export const MudclothSwatchArt = make("sk-mudcloth");

export type ArtEntry = { name: ArtName; label: string; origin: string; dark: boolean; Component: (p: ArtProps) => React.JSX.Element };

export const ART: ArtEntry[] = ART_DATA.map((d) => ({ name: d.name, label: d.label, origin: d.origin, dark: d.dark, Component: make(d.name) }));
