import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { createZstdDecompress } from "node:zlib";
import { BUNDLED_DATASETS } from "../../../../../src/lib/explore/datasets";
import { allowedSets } from "../../../../../src/lib/explore/space-api";
import { hasEmail } from "../../../../../src/lib/research-os/advisor-review";
import { assertClean, buildDenylist, type Denylist } from "../rights";
import { audienceOf, MODE_IDS, packedBytes, pageCount, pageRows, REPLY_BYTES, REPLY_HITS, rowSetText, SET_BYTES, type AssembleContext, type PackedRows } from "./contract";
import { entryById, REGISTRY, type LicenceEntry, type Row } from "./licences";
import { majorToCareer } from "./major-to-career";
import { mathematicsChain } from "./mathematics-chain";
import { occupationsTime } from "./occupations-time";
import { technologyWaves } from "./technology-waves";

export const ROW_SET_PACK_SCHEMA = "bucket.explore-rows-pack/1";
export const ROW_SET_PACK_BUDGET_BYTES = 1_310_720;
export const ROW_SET_PACK_FILE = "explore-rows.json";
export const TABLES_DIR = "learning/corpus/progressions/tables";
export const COUNTRY_FILE = "src/data/world-indicators.json";
export const SPACE_REGISTRY_FILE = "tools/prime-directions/corpora.json";
export const STAFF_SET_IDS = ["progression", "edtech-market"] as const;

export interface TableReader {
  has(table: string): boolean;
  rows(table: string): AsyncIterable<Row>;
}

export type RowSetAdapter = (tables: TableReader, ctx: AssembleContext) => Promise<PackedRows[]>;

export const ADAPTERS: Record<string, RowSetAdapter> = {
  "occupations-time": occupationsTime,
  "major-to-career": majorToCareer,
  "mathematics-chain": mathematicsChain,
  "technology-waves": technologyWaves,
};

const TABLE_NAME = /^[a-z][a-z0-9_]{0,63}$/;

export function fileTables(dir: string): TableReader {
  const fileOf = (table: string): string | null => {
    if (!TABLE_NAME.test(table)) throw new Error(`row sets: ${table} is no table name`);
    return [join(dir, `${table}.jsonl`), join(dir, `${table}.jsonl.zst`)].find((f) => existsSync(f)) ?? null;
  };
  return {
    has: (table) => fileOf(table) !== null,
    async *rows(table) {
      const file = fileOf(table);
      if (!file) throw new Error(`row sets: table ${table} is missing from ${dir}`);
      const raw = createReadStream(file);
      const lines = createInterface({ input: file.endsWith(".zst") ? raw.pipe(createZstdDecompress()) : raw, crlfDelay: Infinity });
      for await (const line of lines) if (line.trim()) yield JSON.parse(line) as Row;
    },
  };
}

export function memoryTables(data: Record<string, Row[]>): TableReader {
  return {
    has: (table) => table in data,
    async *rows(table) {
      if (!(table in data)) throw new Error(`row sets: table ${table} is missing`);
      yield* data[table];
    },
  };
}

export function reservedIds(repo: string): Set<string> {
  return new Set([...BUNDLED_DATASETS.map((d) => d.id), ...allowedSets(join(repo, SPACE_REGISTRY_FILE)).map((s) => s.id)]);
}

export function countryCodes(repo: string): Set<string> {
  const file = JSON.parse(readFileSync(join(repo, COUNTRY_FILE), "utf8")) as { countries?: { iso2?: unknown }[] };
  return new Set((file.countries ?? []).map((c) => c.iso2).filter((c): c is string => typeof c === "string"));
}

export function tablesStamp(repo: string): string {
  return `tables-${createHash("sha256").update(readFileSync(join(repo, TABLES_DIR, "stats.json"))).digest("hex").slice(0, 12)}`;
}

export function repoContext(repo: string): AssembleContext {
  return { registry: REGISTRY, modes: MODE_IDS, reserved: reservedIds(repo), places: countryCodes(repo), atoms: null, built: tablesStamp(repo) };
}

export interface RowSetEntry {
  id: string;
  label: string;
  licence: string;
  audience: "public";
  bytes: number;
  hits: number;
  pages: PackedRows[];
}

export interface RowSetPack {
  schema: typeof ROW_SET_PACK_SCHEMA;
  version: string;
  sha256: string;
  built: string;
  sets: RowSetEntry[];
}

export function setBytes(pages: PackedRows[]): number {
  return pages.reduce((sum, p) => sum + packedBytes(p), 0);
}

export function replies(pages: PackedRows[]): PackedRows[] {
  return pages.flatMap((p) => Array.from({ length: pageCount(p) }, (_, i) => pageRows(p, i)));
}

export function checkCaps(id: string, pages: PackedRows[]): void {
  const bytes = setBytes(pages);
  if (bytes > SET_BYTES) throw new Error(`row set ${id}: ${bytes} bytes is over the ${SET_BYTES} byte set cap`);
  for (const reply of replies(pages)) {
    const size = packedBytes(reply);
    if (reply.n > REPLY_HITS || size > REPLY_BYTES) throw new Error(`row set ${id}: a reply of ${reply.n} hits and ${size} bytes is over the cap of ${REPLY_HITS} hits and ${REPLY_BYTES} bytes`);
  }
}

export const WARN_SHARE = 0.9;

export function capWarnings(sets: { id: string; pages: PackedRows[] }[]): string[] {
  const out: string[] = [];
  for (const set of sets) {
    const bytes = setBytes(set.pages);
    if (bytes > SET_BYTES * WARN_SHARE) out.push(`${set.id}: ${bytes} bytes is past 90% of the ${SET_BYTES} byte set cap`);
    for (const reply of replies(set.pages)) {
      const size = packedBytes(reply);
      if (size > REPLY_BYTES * WARN_SHARE) out.push(`${set.id}: a reply of ${reply.n} hits and ${size} bytes is past 90% of the ${REPLY_BYTES} byte reply cap`);
    }
  }
  return out;
}

export function packWarnings(pack: RowSetPack): string[] {
  const bytes = packBytes(pack);
  return bytes > ROW_SET_PACK_BUDGET_BYTES * WARN_SHARE ? [`the pack is ${bytes} bytes, past 90% of the ${ROW_SET_PACK_BUDGET_BYTES} byte budget`] : [];
}

export function assembleRowSetPack(sets: PackedRows[][], deny: Denylist, built: string): RowSetPack {
  const ids = new Set<string>();
  const entries: RowSetEntry[] = [];
  for (const pages of sets) {
    const first = pages[0];
    if (!pages.every((p) => audienceOf(p) === "public")) continue;
    if (ids.has(first.id)) throw new Error(`row sets: ${first.id} is built twice`);
    if ((STAFF_SET_IDS as readonly string[]).includes(first.id)) throw new Error(`row sets: ${first.id} is a staff set and stays out of the public pack`);
    ids.add(first.id);
    checkCaps(first.id, pages);
    entries.push({ id: first.id, label: first.label, licence: first.licence, audience: "public", bytes: setBytes(pages), hits: pages.reduce((sum, p) => sum + p.n, 0), pages });
  }
  const body = { schema: ROW_SET_PACK_SCHEMA, built, sets: entries } as const;
  const sha256 = createHash("sha256").update(JSON.stringify(body)).digest("hex");
  const pack: RowSetPack = { version: sha256.slice(0, 12), sha256, ...body };
  assertClean(deny, pack, "the row set pack");
  assertClean(deny, rowSetText(entries.flatMap((e) => e.pages)), "the row set hit ids");
  return pack;
}

export async function buildRowSetPack(repo: string, deny: Denylist = buildDenylist(repo), adapters: Record<string, RowSetAdapter> = ADAPTERS): Promise<RowSetPack> {
  const ctx = repoContext(repo);
  const tables = fileTables(join(repo, TABLES_DIR));
  const sets: PackedRows[][] = [];
  for (const [id, adapter] of Object.entries(adapters)) {
    const pages = await adapter(tables, ctx);
    if (pages[0]?.id !== id) throw new Error(`row sets: the ${id} adapter built ${pages[0]?.id}`);
    sets.push(pages);
  }
  return assembleRowSetPack(sets, deny, ctx.built);
}

export function readRowSetPack(file: string): RowSetPack | null {
  if (!file.endsWith(".json")) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
  const pack = parsed as Partial<RowSetPack> | null;
  return pack && typeof pack === "object" && pack.schema === ROW_SET_PACK_SCHEMA && Array.isArray(pack.sets) ? (pack as RowSetPack) : null;
}

export function publicPackProblems(pack: RowSetPack, registry: LicenceEntry[] = REGISTRY): string[] {
  const out: string[] = [];
  for (const set of pack.sets) {
    if ((STAFF_SET_IDS as readonly string[]).includes(set.id)) out.push(`${set.id}: a staff set`);
    if (set.audience !== "public") out.push(`${set.id}: audience ${String(set.audience)}`);
    for (const page of set.pages ?? []) {
      if (audienceOf(page) !== "public") out.push(`${set.id}: a page with no public audience`);
      for (const source of page.sources ?? []) {
        const entry = entryById(source, registry);
        if (!entry) out.push(`${set.id}: source ${source} has no licence entry`);
        else if (entry.public === "none") out.push(`${set.id}: source ${source} is restricted`);
      }
    }
    const text = rowSetText(set.pages ?? []);
    if (hasEmail(text)) out.push(`${set.id}: an email address`);
    if (/ipums/i.test(text)) out.push(`${set.id}: a row that cites IPUMS`);
  }
  return [...new Set(out)];
}

export function packBytes(pack: RowSetPack): number {
  return Buffer.byteLength(JSON.stringify(pack));
}

export function describeRowSets(pack: RowSetPack): string[] {
  return pack.sets.map((s) => {
    const sizes = replies(s.pages).map(packedBytes);
    return `${s.id}: ${s.bytes} bytes in ${s.pages.length} pages, ${s.hits} hits, largest reply ${Math.max(...sizes)} bytes, ${s.licence}`;
  });
}

if (import.meta.main) {
  const repo = resolve(import.meta.dir, "../../../../..");
  const pack = await buildRowSetPack(repo);
  const bytes = packBytes(pack);
  if (bytes > ROW_SET_PACK_BUDGET_BYTES) throw new Error(`row set pack: ${bytes} bytes is over the ${ROW_SET_PACK_BUDGET_BYTES} byte budget`);
  const outDir = resolve(import.meta.dir, "../../../content");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, ROW_SET_PACK_FILE), JSON.stringify(pack));
  console.log(`row set pack ${pack.version}: ${bytes} bytes of ${ROW_SET_PACK_BUDGET_BYTES}`);
  for (const line of describeRowSets(pack)) console.log(`  ${line}`);
  for (const line of [...capWarnings(pack.sets), ...packWarnings(pack)]) console.warn(`  warning: ${line}`);
}
