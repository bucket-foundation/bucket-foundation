import type { AlignmentReviewPack, ReviewRow } from "./pack/alignment-review";
import type { Route } from "./serve";

export const ALIGNMENT_SLUG = "atom-alignment";
export const ALIGNMENT_IDS = 80;
export const ALIGNMENT_HITS = 30;
export const ALIGNMENT_QUERY = 120;
const ROW_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const DECK = /^[a-z0-9][a-z0-9-]{0,63}$/;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export type ShownRow = Omit<ReviewRow, "decks">;

const shown = ({ decks: _decks, ...row }: ReviewRow): ShownRow => row;
const words = (text: string) => text.toLowerCase().match(/[a-z0-9]+/g) ?? [];

export function searchRows(pack: AlignmentReviewPack, deck: string | null, q: string): ShownRow[] {
  const asked = words(q);
  if (asked.length === 0) return [];
  const hits: { row: ReviewRow; rank: number }[] = [];
  for (const row of pack.rows) {
    if (deck !== null && !row.decks.includes(deck)) continue;
    const label = (row.label ?? "").toLowerCase();
    const rest = `${row.code ?? ""} ${row.where ?? ""} ${row.id}`.toLowerCase();
    if (!asked.every((w) => label.includes(w) || rest.includes(w))) continue;
    hits.push({ row, rank: (asked.every((w) => label.includes(w)) ? 0 : 1000) + label.length });
  }
  return hits
    .sort((a, b) => a.rank - b.rank || (a.row.id < b.row.id ? -1 : 1))
    .slice(0, ALIGNMENT_HITS)
    .map((h) => shown(h.row));
}

export function alignmentRoutes(pack: AlignmentReviewPack): Record<string, Route> {
  const byId = new Map(pack.rows.map((row) => [row.id, row]));
  return {
    "GET /local/workspace/alignment/rows": (_req, url) => {
      const ids = (url.searchParams.get("ids") ?? "").split(",").filter(Boolean);
      if (ids.length > ALIGNMENT_IDS || ids.some((id) => !ROW_ID.test(id))) return json({ error: "the list of rows is refused" }, 400);
      return json({ staff: pack.staff, rows: ids.flatMap((id) => (byId.has(id) ? [shown(byId.get(id)!)] : [])) });
    },
    "GET /local/workspace/alignment/search": (_req, url) => {
      const deck = url.searchParams.get("deck");
      const q = url.searchParams.get("q") ?? "";
      if ((deck !== null && !DECK.test(deck)) || q.length > ALIGNMENT_QUERY) return json({ error: "the search is refused" }, 400);
      return json({ staff: pack.staff, rows: searchRows(pack, deck, q) });
    },
  };
}
