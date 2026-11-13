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
