import { createReadStream, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { createZstdDecompress } from "node:zlib";
import { OPEN_K12_SYSTEMS, resolveEntry } from "./row-sets/licences";

export const REVIEW_SCHEMA = "bucket.alignment-review/1";
export const REVIEW_FLAG = "BKT_INCLUDE_STAFF_DATA";
export const ALIGNMENT_DIR = "learning/corpus/alignment";
export const CORPUS_TABLES = "learning/corpus/progressions/tables";
export const POOL_CAP = 30000;

export interface ReviewRow {
  id: string;
  table: "courses" | "progression";
  code: string | null;
  label: string | null;
  level: string | null;
  where: string | null;
  url: string | null;
  cip: string | null;
  decks: string[];
}

export interface AlignmentReviewPack {
  schema: typeof REVIEW_SCHEMA;
  staff: boolean;
  rows: ReviewRow[];
}

export const EMPTY_REVIEW: AlignmentReviewPack = { schema: REVIEW_SCHEMA, staff: false, rows: [] };

type Raw = Record<string, unknown>;
const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const CODE = /^([A-Za-z0-9][A-Za-z0-9.:_-]{0,39}):\s+(.+)$/;

export function splitTopic(topic: string): { code: string | null; label: string } {
  const m = CODE.exec(topic);
  return m && /\d/.test(m[1]) ? { code: m[1], label: m[2] } : { code: null, label: topic };
}

export function labelAllowed(table: "courses" | "progression", row: Raw): boolean {
  if (table === "progression" && row.slice === "k12-full" && !(OPEN_K12_SYSTEMS as readonly string[]).includes(String(row.system ?? ""))) return false;
  const entry = resolveEntry(table, row);
  if (entry === null || entry.public === "rows") return true;
  if (entry.public === "codes") return false;
  return table === "courses";
}

export function reviewRow(table: "courses" | "progression", row: Raw, decks: string[]): ReviewRow {
  const cip = text((row.cip as Raw | null)?.code);
  const base = { id: String(row.id), table, level: text(row.level), url: text(row.source_url), cip, decks };
  const shown = labelAllowed(table, row);
  if (table === "courses") return { ...base, code: text(row.code), label: shown ? text(row.title) : null, where: text(row.institution) };
  const topic = row.slice === "k12-full" ? { code: splitTopic(text(row.topic) ?? "").code, label: text(row.subfield) ?? "" } : splitTopic(text(row.topic) ?? "");
  return { ...base, code: topic.code, label: shown && topic.label ? topic.label : null, where: text(row.framework_id) ?? text(row.system) };
}

export interface DeckRule {
  cip: string[];
  field: string[];
}

export function deckRules(tsv: string): Record<string, DeckRule> {
  const rules: Record<string, DeckRule> = {};
  for (const line of tsv.split("\n").slice(1)) {
    const [deck, kind, value] = line.split("\t");
    if (!deck || !value || (kind !== "cip" && kind !== "field")) continue;
    (rules[deck] ??= { cip: [], field: [] })[kind].push(value.trim());
  }
  return rules;
}

export function decksOf(rules: Record<string, DeckRule>, cip: string | null, field: string | null): string[] {
  return Object.entries(rules)
    .filter(([, rule]) => (field !== null && rule.field.includes(field)) || (cip !== null && rule.cip.some((prefix) => cip.startsWith(prefix))))
    .map(([deck]) => deck);
}

async function* jsonl(file: string): AsyncGenerator<Raw> {
  const raw = createReadStream(file);
  const lines = createInterface({ input: file.endsWith(".zst") ? raw.pipe(createZstdDecompress()) : raw, crlfDelay: Infinity });
  for await (const line of lines) if (line.trim()) yield JSON.parse(line) as Raw;
}

export async function alignmentReview(repo: string, env: Record<string, string | undefined> = process.env): Promise<AlignmentReviewPack> {
  const links = join(repo, ALIGNMENT_DIR, "tables/alignments.jsonl");
  if (env[REVIEW_FLAG] !== "1" || !existsSync(links)) return EMPTY_REVIEW;
  const linked = new Set<string>();
  for (const line of readFileSync(links, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const id = (JSON.parse(line) as Raw).progression_id;
    if (typeof id === "string") linked.add(id);
  }
  const rules = deckRules(readFileSync(join(repo, ALIGNMENT_DIR, "build/deck_fields.tsv"), "utf8"));
  const rows: ReviewRow[] = [];
  for (const table of ["progression", "courses"] as const) {
    for await (const row of jsonl(join(repo, CORPUS_TABLES, `${table}.jsonl.zst`))) {
      const decks = decksOf(rules, text((row.cip as Raw | null)?.code), text(row.field));
      if (!linked.has(String(row.id)) && (decks.length === 0 || rows.length >= POOL_CAP)) continue;
      rows.push(reviewRow(table, row, decks));
    }
  }
  return { schema: REVIEW_SCHEMA, staff: true, rows };
}
