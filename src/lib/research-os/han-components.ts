import { HIDE_BELOW, UNCERTAIN_BELOW } from "./node-words";

export interface HanComponentRow {
  char: string;
  ord: number;
  component: string;
  meaning: string | null;
  meaning_source: string | null;
  ids: string;
  source: string;
  confidence: number | string;
  agrees_with_wiktionary: boolean | null;
  decomposition_license: string;
  meaning_license: string | null;
}

export interface HanPart {
  component: string;
  meaning: string | null;
  meaningSource: string | null;
  meaningLicense: string | null;
  confidence: number;
  uncertain: boolean;
  agreesWithWiktionary: boolean | null;
  source: string;
}

export interface HanChar {
  char: string;
  ids: string;
  parts: HanPart[];
}

export const BABELSTONE_NOTE = {
  text: "Han character components from BabelStone IDS by Andrew West, who waives copyright in the data and asks for no attribution; the credit is given as thanks.",
  href: "https://www.babelstone.co.uk/CJK/IDS.HTML",
};

export const UNIHAN_NOTE = {
  text: "Some component meanings from the Unicode Han Database (Unihan), Copyright Unicode, Inc., under the Unicode License v3.",
  license: "https://www.unicode.org/license.txt",
};

export const EXPORT_PARTS = {
  decompositions: {
    file: "han-components-decompositions.csv",
    header: `${BABELSTONE_NOTE.text} Source: ${BABELSTONE_NOTE.href}`,
    columns: ["char", "ord", "component", "ids", "source", "confidence"],
  },
  "meanings-wiktionary": {
    file: "han-components-meanings-wiktionary.csv",
    header: "Component meanings from Wiktionary via Kaikki.org, under CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/",
    columns: ["component", "meaning", "meaning_source"],
  },
  "meanings-unihan": {
    file: "han-components-meanings-unihan.csv",
    header: `${UNIHAN_NOTE.text} License: ${UNIHAN_NOTE.license}`,
    columns: ["component", "meaning"],
  },
} as const;

export type ExportPart = keyof typeof EXPORT_PARTS;

const CJK = /^(?:[\u3400-\u9fff\uf900-\ufaff]|[\ud840-\ud8bf][\udc00-\udfff])+$/;

export function hanChars(words: { lang: string; word: string }[]): string[] {
  const out = new Set<string>();
  for (const w of words) {
    if ((w.lang === "zh" || w.lang === "ja") && CJK.test(w.word)) for (const ch of Array.from(w.word)) out.add(ch);
  }
  return Array.from(out).sort();
}

function readConfidence(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}

export function shownParts(rows: HanComponentRow[]): Map<string, HanChar> {
  const out = new Map<string, HanChar>();
  for (const r of rows.slice().sort((a, b) => a.char.localeCompare(b.char) || a.ord - b.ord)) {
    const confidence = readConfidence(r.confidence);
    if (confidence < HIDE_BELOW) continue;
    const entry = out.get(r.char) ?? { char: r.char, ids: r.ids, parts: [] };
    entry.parts.push({
      component: r.component,
      meaning: r.meaning || null,
      meaningSource: r.meaning_source || null,
      meaningLicense: r.meaning_license || null,
      confidence,
      uncertain: confidence < UNCERTAIN_BELOW,
      agreesWithWiktionary: r.agrees_with_wiktionary,
      source: r.source,
    });
    out.set(r.char, entry);
  }
  return out;
}

export function partsFor(word: { lang: string; word: string }, map: Map<string, HanChar>): HanChar[] {
  return hanChars([word]).length ? Array.from(word.word).map((ch) => map.get(ch)).filter((x): x is HanChar => Boolean(x)) : [];
}

function cell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportCsv(part: ExportPart, rows: HanComponentRow[]): string {
  const spec = EXPORT_PARTS[part];
  let body: Record<string, unknown>[];
  if (part === "decompositions") {
    body = rows.map((r) => ({ char: r.char, ord: r.ord, component: r.component, ids: r.ids, source: r.source, confidence: readConfidence(r.confidence) }));
  } else {
    const wanted = part === "meanings-unihan" ? ["unihan"] : ["wiktionary-zh", "wiktionary-ja"];
    const seen = new Map<string, Record<string, unknown>>();
    for (const r of rows) {
      if (!r.meaning || !r.meaning_source || !wanted.includes(r.meaning_source) || seen.has(r.component)) continue;
      seen.set(r.component, { component: r.component, meaning: r.meaning, meaning_source: r.meaning_source });
    }
    body = Array.from(seen.values()).sort((a, b) => String(a.component).localeCompare(String(b.component)));
  }
  const lines = [cell(spec.header), spec.columns.join(","), ...body.map((r) => spec.columns.map((c) => cell(r[c])).join(","))];
  return lines.join("\n") + "\n";
}
