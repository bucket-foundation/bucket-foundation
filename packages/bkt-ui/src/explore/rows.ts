import type { PackedRows } from "../../../bkt/src/pack/row-sets/contract";
import type { RowFrame } from "../../../../src/lib/explore/modes/types";
import type { Hit } from "../../../../src/lib/explore/search";

export type { PackedRows };

export interface RowScene extends RowFrame {
  at: Record<string, number>;
  groups: PackedRows["groups"];
}

export interface ExpandedRows {
  hits: Hit[];
  frame: RowScene;
}

const COLUMNS = ["key", "title", "sub", "gi", "si", "li", "year", "url", "links"] as const;
const FRAME_COLUMNS = ["from", "to", "place", "points", "weight", "edgeWeight", "edgeStated", "atom", "verified"] as const;

export function expandRows(packed: PackedRows): ExpandedRows {
  const n = packed.n;
  for (const name of COLUMNS) {
    const column = packed[name];
    if (!Array.isArray(column) || column.length !== n) throw new Error(`row set ${packed.id}: column ${name} does not hold ${n} rows`);
  }
  for (const name of FRAME_COLUMNS) {
    const column = packed.frame[name];
    if (column !== null && column !== undefined && (!Array.isArray(column) || column.length !== n)) throw new Error(`row set ${packed.id}: frame column ${name} does not hold ${n} rows`);
  }
  const ids = packed.key.map((key) => packed.idp + key);
  const at: Record<string, number> = {};
  const hits = ids.map((id, i): Hit => {
    const group = packed.groups[packed.gi[i]];
    const source = packed.sources[packed.si[i]];
    const license = packed.licences[packed.li[i]];
    if (!group || source === undefined || license === undefined) throw new Error(`row set ${packed.id}: row ${i} points outside a table`);
    at[id] = i;
    return {
      id, type: "row", title: packed.title[i], subtitle: packed.sub[i], text: "", score: 1, branch: group.id, year: packed.year[i], url: packed.url[i],
      links: packed.links[i].map((to) => {
        if (!Number.isInteger(to) || to < 0 || to >= n) throw new Error(`row set ${packed.id}: row ${i} links outside the page`);
        return ids[to];
      }),
      source, license,
    };
  });
  return { hits, frame: { ...packed.frame, at, groups: packed.groups } };
}

export function isRowScene(frame: RowFrame | undefined): frame is RowScene {
  return !!frame && typeof (frame as RowScene).at === "object" && Array.isArray((frame as RowScene).groups);
}

export function drawableModes(packed: Pick<PackedRows, "modes">, drawn: readonly string[]): string[] {
  return packed.modes.filter((mode) => drawn.includes(mode));
}

export const TERMS_UNREAD = "Bucket has yet to read this source's terms page.";

export function cutLine(cut: number): string | null {
  if (cut <= 0) return null;
  return cut === 1 ? "1 link leads to a row on another page, so this page leaves it out." : `${cut.toLocaleString("en-US")} links lead to rows on other pages, so this page leaves them out.`;
}

export function verifiedLine(frame: Pick<RowFrame, "verified">): string | null {
  if (!frame.verified || !frame.verified.length) return null;
  const checked = frame.verified.filter(Boolean).length;
  return `${checked.toLocaleString("en-US")} of ${frame.verified.length.toLocaleString("en-US")} rows are checked against their source. The rest are drawn hollow.`;
}
