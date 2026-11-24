"use client";

import { useId, type CSSProperties } from "react";
import { ART_DATA } from "./data";

export type ArtName = (typeof ART_DATA)[number]["name"];

type ArtProps = {
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

type ArtEntry = { name: ArtName; label: string; origin: string; dark: boolean; Component: (p: ArtProps) => React.JSX.Element };

export const ART: ArtEntry[] = ART_DATA.map((d) => ({ name: d.name, label: d.label, origin: d.origin, dark: d.dark, Component: make(d.name) }));
