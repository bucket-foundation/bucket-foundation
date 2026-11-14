import { ART_DATA } from "./data";
import { OBJECT_ART } from "./objects";

export type Piece = { id: string; kind: "hero" | "object"; label: string; origin: string; dark: boolean; svg: string };

function wrap(viewBox: string, body: string) {
  const [, , w, h] = viewBox.split(" ").map(Number);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${w}" height="${h}">${body}</svg>`;
}

const title = (id: string) => id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, " ");

export const HERO_PIECES: Piece[] = ART_DATA.map((d) => ({ id: d.name, kind: "hero", label: d.label, origin: d.origin, dark: d.dark, svg: wrap(d.viewBox, d.body) }));

export const OBJECT_PIECES: Piece[] = Object.entries(OBJECT_ART).map(([id, body]) => ({ id, kind: "object", label: title(id), origin: "Sticker object", dark: false, svg: wrap("0 0 100 100", body) }));

export const PIECES: Piece[] = [...HERO_PIECES, ...OBJECT_PIECES];

export const pieceFile = (p: Piece) => `polingual-${p.kind}-${p.id}`;

const WEIGHTS: Record<string, string> = { Fredoka: "400;600;700", Nunito: "400;700;800;900", "Space Mono": "400;700" };

function fontFamilies(svg: string) {
  const names = new Set<string>();
  for (const m of svg.matchAll(/font-family="([^"]+)"/g)) names.add(m[1].split(",")[0].trim().replace(/^['"]|['"]$/g, ""));
  return [...names];
}

function svgText(svg: string) {
  const out: string[] = [];
  for (const m of svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)) out.push(m[1]);
  return [...new Set(out.join("").replace(/\s/g, ""))].join("") + " ";
}

const toBase64 = (buf: ArrayBuffer) => {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};

export async function embedFonts(svg: string, get: typeof fetch = fetch) {
  const families = fontFamilies(svg);
  if (!families.length) return svg;
  const text = encodeURIComponent(svgText(svg));
  const sheets = await Promise.all(families.map(async (f) => {
    const res = await get(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(f)}:wght@${WEIGHTS[f] ?? "400;700;800"}&text=${text}`);
    if (!res.ok) throw new Error(`font css ${f} ${res.status}`);
    let css = await res.text();
    for (const url of new Set([...css.matchAll(/url\((https:[^)]+)\)/g)].map((m) => m[1]))) {
      const font = await get(url);
      if (!font.ok) throw new Error(`font file ${f} ${font.status}`);
      css = css.split(url).join(`data:font/woff2;base64,${toBase64(await font.arrayBuffer())}`);
    }
    return css;
  }));
  return svg.replace(/^(<svg[^>]*>)/, `$1<defs><style>${sheets.join("")}</style></defs>`);
}
