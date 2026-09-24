import type { BronzeRecord } from "../research-os/medallion/bronze";
import { parseEdtf } from "../history/span";
import type { EvolutionRecord, EvolutionSource, SeriesRecord } from "./importer";

export const ENDOFLIFE_RULE = "endoflife-mit";

export interface EndoflifeProduct {
  result: {
    name: string;
    releases: { name: string; releaseDate: string | null }[];
  };
}

export function readProduct(b: BronzeRecord): EndoflifeProduct["result"] {
  const parsed = JSON.parse(b.text) as EndoflifeProduct;
  const r = parsed?.result;
  if (!r || typeof r.name !== "string" || !/^[a-z0-9][a-z0-9._+-]{0,99}$/.test(r.name) || !Array.isArray(r.releases)) {
    throw new Error(`${b.repoPath}: not an endoflife.date v1 product`);
  }
  return r;
}

function dateSpan(b: BronzeRecord, cycle: string, date: string): { start: number; end: number } | null {
  const all = Buffer.from(b.text, "utf8");
  const name = all.indexOf(Buffer.from(`"name": ${JSON.stringify(cycle)}`, "utf8"));
  const nameTight = name >= 0 ? name : all.indexOf(Buffer.from(`"name":${JSON.stringify(cycle)}`, "utf8"));
  if (nameTight < 0) return null;
  for (const key of [`"releaseDate": ${JSON.stringify(date)}`, `"releaseDate":${JSON.stringify(date)}`]) {
    const at = all.indexOf(Buffer.from(key, "utf8"), nameTight);
    if (at >= 0) {
      const start = at + Buffer.byteLength(key, "utf8") - Buffer.byteLength(date, "utf8") - 1;
      return { start, end: start + Buffer.byteLength(date, "utf8") };
    }
  }
  return null;
}

export function endoflifeRecords(eolToSlug: Map<string, string>) {
  return (b: BronzeRecord, source: EvolutionSource): EvolutionRecord[] => {
    const p = readProduct(b);
    const slug = eolToSlug.get(p.name);
    if (!slug) return [];
    const dated = p.releases.filter((r) => typeof r.releaseDate === "string" && parseEdtf(r.releaseDate!, { calendar: "gregorian" }).ok);
    if (dated.length === 0) return [];
    const first = dated.reduce((a, c) => (c.releaseDate! < a.releaseDate! ? c : a));
    const span = dateSpan(b, first.name, first.releaseDate!);
    if (!span) throw new Error(`${b.repoPath}: no span for ${first.name}`);
    const parsed = parseEdtf(first.releaseDate!, { calendar: "gregorian" });
    if (!parsed.ok) return [];
    return [
      {
        repoPath: source.repoPath,
        record: `${p.name}@${first.name}`,
        field: "releaseDate",
        span,
        subject: { kind: "node", slug, nodeKind: "software" },
        roles: { released: parsed.span },
      },
    ];
  };
}

export function endoflifeSeries(eolToSlug: Map<string, string>) {
  return (b: BronzeRecord, source: EvolutionSource): SeriesRecord[] => {
    const p = readProduct(b);
    const slug = eolToSlug.get(p.name);
    if (!slug) return [];
    const perYear = new Map<number, number>();
    for (const r of p.releases) {
      if (typeof r.releaseDate !== "string") continue;
      const parsed = parseEdtf(r.releaseDate, { calendar: "gregorian" });
      if (!parsed.ok) continue;
      perYear.set(parsed.span.start_year, (perYear.get(parsed.span.start_year) ?? 0) + 1);
    }
    return Array.from(perYear.entries())
      .sort((a, c) => a[0] - c[0])
      .map(([year, n]) => ({ repoPath: source.repoPath, subjectSlug: slug, metric: "release_cycles", year, value: n, unit: "release cycles" }));
  };
}
