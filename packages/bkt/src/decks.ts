import { Database, constants } from "bun:sqlite";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { pathToFileURL } from "node:url";
import { createZstdDecompress } from "node:zlib";

export const DECK_FORMAT = "bkt-deck";
export const DECK_FORMAT_VERSION = 1;
export const DECKS_DIR = "decks";
export const DECK_DB = "deck.sqlite";
export const DECK_MANIFEST = "manifest.json";
export const DECK_KINDS = ["words", "cards"] as const;
export const DECK_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
export const DECK_LANGUAGE = /^[a-z]{2,3}$/;
export const SHA256 = /^[0-9a-f]{64}$/;
export const MANIFEST_BYTES = 64 * 1024;
export const MAX_DECK_FILE_BYTES = 256 * 1024 * 1024;
export const MAX_DECK_DB_BYTES = 1024 * 1024 * 1024;
export const MAX_DECK_CARDS = 5_000_000;
export const MAX_INSTALLED_BYTES = 8 * 1024 * 1024 * 1024;
export const SEARCH_ROW_CAP = 5000;
export const RESTART_NOTE = "Restart Bucket to see it in Learn.";

export type DeckKind = (typeof DECK_KINDS)[number];

export interface DeckManifest {
  format: string;
  format_version: number;
  id: string;
  title: string;
  kind: DeckKind;
  language: string | null;
  language_name: string | null;
  fields: string[];
  counts: { cards: number } & Record<string, number>;
  version: string;
  file: string;
  file_url: string | null;
  bytes: number;
  sha256: string;
  db_bytes: number;
  db_sha256: string;
  source: string;
  source_url: string | null;
  wiktionary_url: string | null;
  licence: string;
  licence_url: string | null;
  curator: string;
  adaptation: string | null;
  built: string;
}

export interface InstalledDeck {
  manifest: DeckManifest;
  dir: string;
  db: string;
}

export interface DeckRow {
  id: string;
  title: string;
  kind: DeckKind;
  language: string | null;
  languageName: string | null;
  cards: number;
  bytes: number;
  version: string;
  source: string;
  licence: string;
  licenceHref: string | null;
  curator: string;
  built: string;
  installed: boolean;
  path: string | null;
}

export class DeckError extends Error {}

const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const optional = (v: unknown): string | null => text(v) || null;
const whole = (v: unknown): number => (typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : -1);
const httpsOrNull = (v: unknown, name: string): string | null => {
  const s = optional(v);
  if (s !== null && !/^https:\/\/[^\s]+$/.test(s)) throw new DeckError(`the deck manifest gives a ${name} that is no https link`);
  return s;
};

export function checkManifest(raw: unknown): DeckManifest {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new DeckError("the deck manifest is not a JSON object");
  const m = raw as Record<string, unknown>;
  if (m.format !== DECK_FORMAT) throw new DeckError(`the manifest format is ${JSON.stringify(m.format ?? null)}; Bucket reads ${DECK_FORMAT}`);
  if (m.format_version !== DECK_FORMAT_VERSION) throw new DeckError(`the deck format version is ${JSON.stringify(m.format_version ?? null)}; this Bucket reads version ${DECK_FORMAT_VERSION}. Run bkt update.`);
  if (!text(m.licence)) throw new DeckError("the deck manifest names no licence; Bucket installs a deck only when its licence is stated");
  if (!text(m.source)) throw new DeckError("the deck manifest names no source");
  if (!text(m.curator)) throw new DeckError("the deck manifest names no curator");
  const id = text(m.id);
  if (!DECK_ID.test(id)) throw new DeckError("the deck id takes lower case letters, digits and hyphens");
  if (!text(m.title)) throw new DeckError("the deck manifest has no title");
  if (!DECK_KINDS.includes(m.kind as DeckKind)) throw new DeckError(`the deck kind is ${JSON.stringify(m.kind ?? null)}; Bucket reads ${DECK_KINDS.join(" and ")}`);
  const language = optional(m.language);
  if (language !== null && !DECK_LANGUAGE.test(language)) throw new DeckError("the deck language takes a two or three letter code");
  if (m.kind === "words" && language === null) throw new DeckError("a word deck names its language");
  const fields = Array.isArray(m.fields) ? m.fields.filter((f): f is string => typeof f === "string" && f.trim().length > 0) : [];
  if (fields.length === 0 || fields.length !== (m.fields as unknown[]).length) throw new DeckError("the deck manifest lists no card fields");
  const counts = m.counts && typeof m.counts === "object" && !Array.isArray(m.counts) ? (m.counts as Record<string, unknown>) : {};
  const cards = whole(counts.cards);
  if (cards < 0) throw new DeckError("the deck manifest gives no card count");
  const file = text(m.file);
  if (!file || basename(file) !== file || file.startsWith(".")) throw new DeckError("the deck manifest names no deck file beside it");
  if (!SHA256.test(text(m.sha256)) || !SHA256.test(text(m.db_sha256))) throw new DeckError("the deck manifest gives no sha256 checksums");
  if (whole(m.bytes) <= 0 || whole(m.db_bytes) <= 0) throw new DeckError("the deck manifest gives no file sizes");
  if ((m.bytes as number) > MAX_DECK_FILE_BYTES) throw new DeckError(`the deck file is declared at ${sizeText(m.bytes as number)}; Bucket takes deck files up to ${sizeText(MAX_DECK_FILE_BYTES)}`);
  if ((m.db_bytes as number) > MAX_DECK_DB_BYTES) throw new DeckError(`the deck unpacks to ${sizeText(m.db_bytes as number)}; Bucket takes decks up to ${sizeText(MAX_DECK_DB_BYTES)}`);
  if (cards > MAX_DECK_CARDS) throw new DeckError(`the deck declares ${cards} cards; Bucket takes decks up to ${MAX_DECK_CARDS}`);
  if (!text(m.version)) throw new DeckError("the deck manifest gives no version");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text(m.built))) throw new DeckError("the deck manifest gives no built date");
  const numbers: Record<string, number> = {};
  for (const [k, v] of Object.entries(counts)) if (whole(v) >= 0) numbers[k] = v as number;
  return {
    format: DECK_FORMAT,
    format_version: DECK_FORMAT_VERSION,
    id,
    title: text(m.title),
    kind: m.kind as DeckKind,
    language,
    language_name: optional(m.language_name),
    fields,
    counts: { ...numbers, cards },
    version: text(m.version),
    file,
    file_url: httpsOrNull(m.file_url, "download link"),
    bytes: m.bytes as number,
    sha256: text(m.sha256),
    db_bytes: m.db_bytes as number,
    db_sha256: text(m.db_sha256),
    source: text(m.source),
    source_url: httpsOrNull(m.source_url, "source link"),
    wiktionary_url: httpsOrNull(m.wiktionary_url, "Wiktionary link"),
    licence: text(m.licence),
    licence_url: httpsOrNull(m.licence_url, "licence link"),
    curator: text(m.curator),
    adaptation: optional(m.adaptation),
    built: text(m.built),
  };
}

export function isLink(path: string): boolean {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}

export function refuseLink(path: string): void {
  if (isLink(path)) throw new DeckError(`${path} is a link to another place; Bucket reads deck files and folders only where they are`);
}

const squash = (sql: string) => sql.replace(/\s+/g, " ").replace(/\s*([(),=])\s*/g, "$1").replace(/["'`]/g, "'").trim().toLowerCase();

export interface SchemaObject {
  type: string;
  sql: string;
}

export const WORD_DECK_SCHEMA: Readonly<Record<string, SchemaObject>> = {
  meta: { type: "table", sql: "create table meta(k text primary key, v text not null) without rowid" },
  words: {
    type: "table",
    sql: "create table words(id integer primary key, surface text not null, folded text not null, ipa text not null, pos text not null, meaning text not null, head text not null, tier text not null, kind text not null, shared integer not null, translations text not null, etymology text not null)",
  },
  words_head: { type: "index", sql: "create index words_head on words(head, id)" },
  words_folded: { type: "index", sql: "create index words_folded on words(folded, id)" },
  words_fts: { type: "table", sql: "create virtual table words_fts using fts5(surface, folded, meaning, content='words', content_rowid='id', tokenize='unicode61 remove_diacritics 2')" },
  words_fts_data: { type: "table", sql: "create table 'words_fts_data'(id integer primary key, block blob)" },
  words_fts_idx: { type: "table", sql: "create table 'words_fts_idx'(segid, term, pgno, primary key(segid, term)) without rowid" },
  words_fts_docsize: { type: "table", sql: "create table 'words_fts_docsize'(id integer primary key, sz blob)" },
  words_fts_config: { type: "table", sql: "create table 'words_fts_config'(k primary key, v) without rowid" },
};

export const DECK_SCHEMAS: Readonly<Record<DeckKind, Readonly<Record<string, SchemaObject>> | null>> = { words: WORD_DECK_SCHEMA, cards: null };

export function checkDeckSchema(db: Database, m: Pick<DeckManifest, "id" | "kind">): void {
  const want = DECK_SCHEMAS[m.kind];
  if (!want) throw new DeckError(`this Bucket does not read ${m.kind} decks yet; run bkt update`);
  const found = db.query<{ type: string; name: string; sql: string | null }, []>("select type, name, sql from sqlite_master").all();
  const seen = new Set<string>();
  for (const o of found) {
    const expected = want[o.name];
    if (!expected || seen.has(o.name)) throw new DeckError(`the deck file for ${m.id} holds a ${o.type} named ${JSON.stringify(o.name).slice(0, 60)}, which a ${m.kind} deck does not have`);
    if (o.type !== expected.type || squash(o.sql ?? "") !== squash(expected.sql)) throw new DeckError(`the deck file for ${m.id} defines ${o.name} in a way a ${m.kind} deck does not`);
    seen.add(o.name);
  }
  for (const name of Object.keys(want)) if (!seen.has(name)) throw new DeckError(`the deck file for ${m.id} lacks ${name}`);
}

export function readManifest(path: string): DeckManifest {
  let raw: unknown;
  refuseLink(path);
  try {
    if (statSync(path).size > MANIFEST_BYTES) throw new DeckError(`${path} is too large for a deck manifest`);
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    if (e instanceof DeckError) throw e;
    throw new DeckError(`${path} does not read as a deck manifest`);
  }
  return checkManifest(raw);
}

export function manifestPath(source: string): string {
  if (!existsSync(source)) throw new DeckError(`${source} does not exist`);
  if (statSync(source).isDirectory()) return join(source, DECK_MANIFEST);
  return basename(source) === DECK_MANIFEST ? source : join(dirname(source), DECK_MANIFEST);
}

export function decksDir(home: string): string {
  return join(home, DECKS_DIR);
}

export async function fileSha256(path: string): Promise<string> {
  const h = createHash("sha256");
  for await (const chunk of createReadStream(path)) h.update(chunk as Buffer);
  return h.digest("hex");
}

export function openDeckDb(path: string): Database {
  refuseLink(path);
  const db = new Database(`${pathToFileURL(path).href}?immutable=1`, constants.SQLITE_OPEN_READONLY | constants.SQLITE_OPEN_URI);
  db.exec("pragma trusted_schema = off");
  db.exec("pragma query_only = on");
  return db;
}

export function openCheckedDeck(path: string, m: Pick<DeckManifest, "id" | "kind">): Database {
  const db = openDeckDb(path);
  try {
    checkDeckSchema(db, m);
  } catch (e) {
    db.close();
    throw e;
  }
  return db;
}

export function deckMeta(db: Database): Record<string, string> {
  return Object.fromEntries(db.query<{ k: string; v: string }, []>("select k, v from meta").all().map((r) => [r.k, r.v]));
}

function checkInside(path: string, m: DeckManifest): void {
  let db: Database;
  try {
    db = openDeckDb(path);
  } catch {
    throw new DeckError(`the deck file for ${m.id} does not open as a database`);
  }
  try {
    checkDeckSchema(db, m);
    const meta = deckMeta(db);
    if (!text(meta.licence)) throw new DeckError(`the deck file for ${m.id} carries no licence inside`);
    if (meta.licence !== m.licence) throw new DeckError(`the deck file for ${m.id} carries the licence ${meta.licence}; its manifest says ${m.licence}`);
    if (!text(meta.source)) throw new DeckError(`the deck file for ${m.id} carries no source inside`);
    const n = db.query<{ n: number }, []>("select count(*) n from words").get()!.n;
    if (n !== m.counts.cards) throw new DeckError(`the deck file for ${m.id} holds ${n} cards; its manifest says ${m.counts.cards}`);
  } catch (e) {
    if (e instanceof DeckError) throw e;
    throw new DeckError(`the deck file for ${m.id} does not read as a ${m.kind} deck`);
  } finally {
    db.close();
  }
}

export function newerThan(next: Pick<DeckManifest, "built">, have: Pick<DeckManifest, "built">): boolean {
  return next.built > have.built;
}

export function checkUpdate(have: DeckManifest, next: DeckManifest): void {
  if (have.kind !== next.kind || have.language !== next.language) throw new DeckError(`${have.title} is installed under the name ${have.id}; another deck cannot take that name. Remove the installed deck first.`);
  if (have.db_sha256 === next.db_sha256) return;
  if (!newerThan(next, have)) throw new DeckError(`the installed ${have.title} was made on ${have.built} and this one on ${next.built}. Bucket replaces a deck only with a newer one. Remove the installed deck first to go back.`);
}

export async function installDeck(home: string, source: string): Promise<DeckManifest> {
  refuseLink(source);
  const from = manifestPath(source);
  refuseLink(dirname(from));
  if (!existsSync(from)) throw new DeckError(`no ${DECK_MANIFEST} beside ${source}; a deck is a folder with a manifest and one deck file`);
  const m = readManifest(from);
  const packed = join(dirname(from), m.file);
  if (!existsSync(packed)) throw new DeckError(`${m.file} is missing beside the manifest`);
  refuseLink(packed);
  if (!statSync(packed).isFile()) throw new DeckError(`${m.file} is not a file`);
  if (statSync(packed).size !== m.bytes) throw new DeckError(`${m.file} is ${statSync(packed).size} bytes; its manifest says ${m.bytes}. The file was changed or cut short.`);
  const sum = await fileSha256(packed);
  if (sum !== m.sha256) throw new DeckError(`${m.file} has checksum ${sum.slice(0, 12)}; its manifest says ${m.sha256.slice(0, 12)}. The file was changed, so Bucket left it alone.`);
  const root = decksDir(home);
  refuseLink(home);
  refuseLink(root);
  mkdirSync(root, { recursive: true, mode: 0o700 });
  refuseLink(join(root, m.id));
  const prior = listInstalled(home).find((d) => d.manifest.id === m.id);
  if (prior) checkUpdate(prior.manifest, m);
  const held = listInstalled(home).filter((d) => d.manifest.id !== m.id).reduce((n, d) => n + d.manifest.db_bytes, 0);
  if (held + m.db_bytes > MAX_INSTALLED_BYTES) throw new DeckError(`installed decks would take ${sizeText(held + m.db_bytes)}; Bucket keeps up to ${sizeText(MAX_INSTALLED_BYTES)}. Remove a deck first.`);
  const tmp = join(root, `.${m.id}.${process.pid}.tmp`);
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { mode: 0o700 });
  try {
    const h = createHash("sha256");
    let bytes = 0;
    const tally = new Transform({
      transform(chunk: Buffer, _enc, done) {
        bytes += chunk.length;
        if (bytes > m.db_bytes) return done(new DeckError(`${m.file} unpacks to more than the ${m.db_bytes} bytes its manifest gives`));
        h.update(chunk);
        done(null, chunk);
      },
    });
    try {
      await pipeline(createReadStream(packed), createZstdDecompress(), tally, createWriteStream(join(tmp, DECK_DB), { mode: 0o600 }));
    } catch (e) {
      if (e instanceof DeckError) throw e;
      throw new DeckError(`${m.file} does not unpack as a zstd file`);
    }
    if (h.digest("hex") !== m.db_sha256 || bytes !== m.db_bytes) throw new DeckError(`${m.file} unpacks to a file that differs from its manifest`);
    checkInside(join(tmp, DECK_DB), m);
    writeFileSync(join(tmp, DECK_MANIFEST), `${JSON.stringify(m, null, 2)}\n`, { mode: 0o600 });
    const dest = join(root, m.id);
    rmSync(dest, { recursive: true, force: true });
    renameSync(tmp, dest);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  return m;
}

export function listInstalled(home: string): InstalledDeck[] {
  const root = decksDir(home);
  let names: string[];
  try {
    names = readdirSync(root).filter((n) => DECK_ID.test(n)).sort();
  } catch {
    return [];
  }
  const out: InstalledDeck[] = [];
  for (const name of names) {
    const dir = join(root, name);
    try {
      if (isLink(dir) || isLink(join(dir, DECK_DB))) continue;
      const manifest = readManifest(join(dir, DECK_MANIFEST));
      if (manifest.id === name && existsSync(join(dir, DECK_DB))) out.push({ manifest, dir, db: join(dir, DECK_DB) });
    } catch {
      continue;
    }
  }
  return out;
}

export function brokenDecks(home: string): string[] {
  const root = decksDir(home);
  let names: string[];
  try {
    names = readdirSync(root).filter((n) => !n.startsWith("."));
  } catch {
    return [];
  }
  const good = new Set(listInstalled(home).map((d) => d.manifest.id));
  return names.filter((n) => !good.has(n)).sort();
}

export function listAvailable(source: string): { manifest: DeckManifest; path: string }[] {
  let names: string[];
  try {
    names = readdirSync(source).sort();
  } catch {
    throw new DeckError(`${source} is not a folder Bucket can read`);
  }
  const out: { manifest: DeckManifest; path: string }[] = [];
  for (const name of [".", ...names]) {
    const file = join(source, name, DECK_MANIFEST);
    if (!existsSync(file) || isLink(join(source, name)) || isLink(file)) continue;
    try {
      out.push({ manifest: readManifest(file), path: dirname(file) });
    } catch {
      continue;
    }
  }
  return out;
}

export function findInstalled(home: string, raw: string): InstalledDeck | null {
  const want = raw.trim().toLowerCase();
  const all = listInstalled(home);
  return all.find((d) => d.manifest.id === want) ?? all.find((d) => d.manifest.kind === "words" && (d.manifest.language === want || (d.manifest.language_name ?? "").toLowerCase() === want)) ?? null;
}

export function removeDeck(home: string, raw: string): DeckManifest | null {
  const found = findInstalled(home, raw);
  if (!found) return null;
  rmSync(found.dir, { recursive: true, force: true });
  return found.manifest;
}

export function deckRow(m: DeckManifest, installed: boolean, path: string | null): DeckRow {
  return {
    id: m.id,
    title: m.title,
    kind: m.kind,
    language: m.language,
    languageName: m.language_name,
    cards: m.counts.cards,
    bytes: installed ? m.db_bytes : m.bytes,
    version: m.version,
    source: m.source,
    licence: m.licence,
    licenceHref: m.licence_url,
    curator: m.curator,
    built: m.built,
    installed,
    path,
  };
}

export function deckRows(home: string, source: string | null): DeckRow[] {
  const installed = listInstalled(home);
  const have = new Map(installed.map((d) => [d.manifest.id, d.manifest.version]));
  const rows = installed.map((d) => deckRow(d.manifest, true, d.dir));
  if (source) for (const a of listAvailable(source)) if (have.get(a.manifest.id) !== a.manifest.version) rows.push(deckRow(a.manifest, false, a.path));
  return rows;
}

export function sizeText(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function deckLine(r: DeckRow): string {
  const state = r.installed ? "installed" : "available";
  return `${state.padEnd(9)}  ${r.id.padEnd(16)}  ${r.title}, ${r.cards.toLocaleString("en-US")} ${r.kind === "words" ? "words" : "cards"}, ${sizeText(r.bytes)}, ${r.source}, ${r.licence}, curated by ${r.curator}`;
}
