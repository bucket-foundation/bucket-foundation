import { createHash } from "node:crypto";
import { validDatasetId } from "../../../../../src/lib/explore/datasets";
import type { RowFrame } from "../../../../../src/lib/explore/modes/types";
import { hasEmail } from "../../../../../src/lib/research-os/advisor-review";
import { entryById, licenceRank, strictest, type LicenceEntry } from "./licences";

export const ROWS_SCHEMA = "bucket.explore-rows/1";
export const REPLY_HITS = 600;
export const REPLY_BYTES = 128 * 1024;
export const SET_BYTES = 768 * 1024;
export const KEY_CHARS = 160;
export const TITLE_CHARS = 200;
export const SUB_CHARS = 120;
export const MODE_IDS = ["globe", "helix", "dna", "atom", "particle", "molecule", "reaction", "protein", "graph", "timeline", "earth", "map"] as const;

export type Audience = "public" | "staff";

export interface RowGroup {
  id: string;
  label: string;
  color: string;
}

export interface Attribution {
  source: string;
  url: string;
  licence: string;
  rows: number;
  notice: string;
  termsRead: boolean;
}

export interface PackedRows {
  schema: typeof ROWS_SCHEMA;
  id: string;
  label: string;
  licence: string;
  audience: Audience;
  modes: string[];
  n: number;
  total: number;
  page: number;
  cut: number;
  idp: string;
  key: string[];
  title: string[];
  sub: string[];
  groups: RowGroup[];
  gi: number[];
  sources: string[];
  si: number[];
  licences: string[];
  li: number[];
  year: (number | null)[];
  url: (string | null)[];
  links: number[][];
  frame: RowFrame;
  attributions: Attribution[];
  built: string;
  sha256: string;
}

export interface RowDraft {
  key: string;
  title: string;
  sub: string;
  group: string;
  source: string;
  year?: number | null;
  url?: string | null;
  links?: { to: string; weight?: number; stated?: boolean }[];
  from?: number | null;
  to?: number | null;
  place?: string | null;
  point?: [number, number] | null;
  weight?: number | null;
  atom?: string | null;
  verified?: boolean;
}

export interface RowSetDraft {
  id: string;
  label: string;
  audience?: Audience;
  modes: string[];
  groups: RowGroup[];
  rows: RowDraft[];
  axis?: RowFrame["axis"];
  layout?: RowFrame["layout"];
  cells?: RowFrame["cells"];
  drill?: RowFrame["drill"];
  also?: { source: string; rows: number }[];
}

export interface AssembleContext {
  registry: LicenceEntry[];
  modes: readonly string[];
  reserved: ReadonlySet<string>;
  places: ReadonlySet<string>;
  atoms: ReadonlySet<string> | null;
  built: string;
}

export function rowKey(raw: string): string {
  return raw.replace(/[^A-Za-z0-9._-]/g, "-").slice(0, KEY_CHARS);
}

export function audienceOf(rows: { audience?: unknown }): Audience {
  return rows.audience === "public" ? "public" : "staff";
}

export function bodySha(rows: Omit<PackedRows, "sha256"> & { sha256?: string }): string {
  const { sha256: _dropped, ...body } = rows;
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

export function packedBytes(rows: PackedRows): number {
  return Buffer.byteLength(JSON.stringify(rows));
}

function fail(id: string, rule: number, why: string): never {
  throw new Error(`row set ${id}: rule ${rule}: ${why}`);
}

function column<T>(rows: RowDraft[], pick: (r: RowDraft) => T | null | undefined): (T | null)[] | null {
  return rows.some((r) => pick(r) !== undefined && pick(r) !== null) ? rows.map((r) => pick(r) ?? null) : null;
}

function sharedPrefix(keys: string[]): string {
  if (keys.length < 2) return "";
  let end = keys[0].length;
  for (const k of keys) {
    let i = 0;
    while (i < end && i < k.length && k[i] === keys[0][i]) i++;
    end = i;
  }
  return keys[0].slice(0, end);
}

export function rowKeys(rows: Pick<PackedRows, "id" | "idp" | "key">): string[] {
  const lead = rows.idp.slice(`row:${rows.id}:`.length);
  return rows.key.map((k) => lead + k);
}

function dictionary(values: string[]): { table: string[]; index: number[] } {
  const at = new Map<string, number>();
  const index = values.map((v) => {
    if (!at.has(v)) at.set(v, at.size);
    return at.get(v) as number;
  });
  return { table: [...at.keys()], index };
}

function credit(e: LicenceEntry, rows: number): Attribution {
  return { source: e.attribution.source, url: e.attribution.url, licence: e.licence, rows, notice: e.attribution.notice, termsRead: e.attribution.terms_read === true };
}

export function packRows(draft: RowSetDraft, ctx: AssembleContext): PackedRows {
  const keys = draft.rows.map((r) => rowKey(r.key));
  const at = new Map<string, number>();
  keys.forEach((k, i) => {
    if (at.has(k)) fail(draft.id, 2, `rows ${draft.rows[at.get(k) as number].key} and ${draft.rows[i].key} reach the key ${k}`);
    at.set(k, i);
  });
  const lead = sharedPrefix(keys);
  const known = new Map(draft.groups.map((g) => [g.id, g]));
  const groups = dictionary(draft.rows.map((r) => r.group));
  const sources = dictionary(draft.rows.map((r) => r.source));
  const entries = sources.table.map((id) => entryById(id, ctx.registry) ?? fail(draft.id, 4, `source ${id} is not in the licence registry`));
  const licences = dictionary(draft.rows.map((r) => entries[sources.table.indexOf(r.source)].licence));
  const weighted = draft.rows.some((r) => r.links?.some((l) => l.weight !== undefined));
  const marked = draft.rows.some((r) => r.links?.some((l) => l.stated !== undefined));
  const target = (row: RowDraft, to: string): number => at.get(rowKey(to)) ?? fail(draft.id, 3, `row ${row.key} links to ${to}, which the set lacks`);
  const body: Omit<PackedRows, "sha256"> = {
    schema: ROWS_SCHEMA,
    id: draft.id,
    label: draft.label,
    licence: entries.length ? strictest(entries) : "",
    audience: audienceOf(draft),
    modes: draft.modes,
    n: draft.rows.length,
    total: draft.rows.length,
    page: 0,
    cut: 0,
    idp: `row:${draft.id}:${lead}`,
    key: keys.map((k) => k.slice(lead.length)),
    title: draft.rows.map((r) => r.title),
    sub: draft.rows.map((r) => r.sub),
    groups: groups.table.map((id) => known.get(id) ?? fail(draft.id, 3, `group ${id} has no label`)),
    gi: groups.index,
    sources: sources.table,
    si: sources.index,
    licences: licences.table,
    li: licences.index,
    year: draft.rows.map((r) => r.year ?? null),
    url: draft.rows.map((r) => r.url ?? null),
    links: draft.rows.map((r) => (r.links ?? []).map((l) => target(r, l.to))),
    frame: {
      axis: draft.axis ?? null,
      from: column(draft.rows, (r) => r.from),
      to: column(draft.rows, (r) => r.to),
      place: column(draft.rows, (r) => r.place),
      points: column(draft.rows, (r) => r.point),
      weight: column(draft.rows, (r) => r.weight),
      edgeWeight: weighted ? draft.rows.map((r) => (r.links ?? []).map((l) => l.weight ?? 1)) : null,
      edgeStated: marked ? draft.rows.map((r) => (r.links ?? []).map((l) => l.stated === true)) : null,
      cells: draft.cells ?? null,
      layout: draft.layout ?? null,
      atom: column(draft.rows, (r) => r.atom),
      verified: draft.rows.some((r) => r.verified !== undefined) ? draft.rows.map((r) => r.verified === true) : null,
      drill: draft.drill ?? null,
    },
    attributions: [
      ...entries.map((e, i) => credit(e, sources.index.filter((s) => s === i).length)),
      ...(draft.also ?? []).filter((a) => !sources.table.includes(a.source)).map((a) => credit(entryById(a.source, ctx.registry) ?? fail(draft.id, 4, `source ${a.source} is not in the licence registry`), a.rows)),
    ],
    built: ctx.built,
  };
  return { ...body, sha256: bodySha(body) };
}

const SENTENCE = /\p{Ll}{3,}[.!?]["')]?\s+\p{Lu}/u;
const IMAGE_URL = /\.(?:png|jpe?g|gif|svg|webp|avif|ico|bmp)(?:[?#]|$)|^data:image\//i;
const WITHHELD_LABEL = /\bHRAF\b|Human Relations Area Files|Outline of Cultural Materials|Prop(?:a|ae|æ)dia/i;
const CODE_ONLY = /^[A-Za-z0-9 ._:/-]{1,40}$/;
const ATOM = /^atom:[a-z0-9][a-z0-9-]{0,63}\/[a-z0-9][a-z0-9-]{0,127}$/;
const PLACE = /^[A-Z]{2}$/;
const COLOR = /^#[0-9a-f]{6}$/i;
const HIT_KEY = /^[A-Za-z0-9._-]{1,160}$/;

function label(id: string, text: string, max: number, what: string): void {
  if (text.length > max || /[\r\n\t]/.test(text) || SENTENCE.test(text) || (/[.!?]$/.test(text) && text.split(/\s+/).length >= 12)) fail(id, 8, `${what} reads as a sentence from a source page: ${text.slice(0, 60)}`);
}

function everyString(value: unknown, visit: (s: string) => void): void {
  if (typeof value === "string") visit(value);
  else if (Array.isArray(value)) value.forEach((v) => everyString(v, visit));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => everyString(v, visit));
}

export function checkRows(rows: PackedRows, ctx: AssembleContext): void {
  const id = String(rows.id);
  if (rows.schema !== ROWS_SCHEMA) fail(id, 1, `schema is ${rows.schema}`);
  if (!validDatasetId(rows.id)) fail(id, 1, "the id fails the data set id rule");
  if (ctx.reserved.has(rows.id)) fail(id, 1, "the id belongs to a bundled set or a space");

  const n = rows.n;
  if (!Number.isInteger(n) || n < 0 || !Number.isInteger(rows.total) || rows.total < n || !Number.isInteger(rows.page) || rows.page < 0 || !Number.isInteger(rows.cut) || rows.cut < 0) fail(id, 3, "n, total, page and cut must be whole numbers with total at least n");
  if (typeof rows.idp !== "string" || !rows.idp.startsWith(`row:${rows.id}:`) || rows.idp.includes("/")) fail(id, 2, `the id prefix is ${rows.idp}`);
  const columns: Record<string, unknown[] | null> = {
    key: rows.key, title: rows.title, sub: rows.sub, gi: rows.gi, si: rows.si, li: rows.li, year: rows.year, url: rows.url, links: rows.links,
    "frame.from": rows.frame.from, "frame.to": rows.frame.to, "frame.place": rows.frame.place, "frame.points": rows.frame.points ?? null, "frame.weight": rows.frame.weight,
    "frame.edgeWeight": rows.frame.edgeWeight, "frame.edgeStated": rows.frame.edgeStated ?? null, "frame.atom": rows.frame.atom, "frame.verified": rows.frame.verified,
  };
  for (const [name, col] of Object.entries(columns)) {
    if (col === null && name.startsWith("frame.")) continue;
    if (!Array.isArray(col) || col.length !== n) fail(id, 3, `column ${name} has length ${Array.isArray(col) ? col.length : "none"}, and the set has ${n} rows`);
  }
  const inRange = (i: unknown, size: number) => Number.isInteger(i) && (i as number) >= 0 && (i as number) < size;
  rows.gi.forEach((g, i) => inRange(g, rows.groups.length) || fail(id, 3, `gi[${i}] is outside groups`));
  rows.si.forEach((s, i) => inRange(s, rows.sources.length) || fail(id, 3, `si[${i}] is outside sources`));
  rows.li.forEach((l, i) => inRange(l, rows.licences.length) || fail(id, 3, `li[${i}] is outside licences`));
  rows.links.forEach((list, i) => {
    if (!Array.isArray(list)) fail(id, 3, `links[${i}] is no list`);
    list.forEach((to) => (inRange(to, n) && to !== i) || fail(id, 3, `links[${i}] names row ${to}`));
    const weights = rows.frame.edgeWeight?.[i];
    if (rows.frame.edgeWeight && (!Array.isArray(weights) || weights.length !== list.length || !weights.every((w) => Number.isFinite(w) && w > 0))) fail(id, 3, `edgeWeight[${i}] does not pair with links[${i}]`);
    const stated = rows.frame.edgeStated?.[i];
    if (rows.frame.edgeStated && (!Array.isArray(stated) || stated.length !== list.length || !stated.every((s) => typeof s === "boolean"))) fail(id, 3, `edgeStated[${i}] does not pair with links[${i}]`);
  });

  const seen = new Set<string>();
  const full = rowKeys(rows);
  full.forEach((k) => {
    if (!HIT_KEY.test(k)) fail(id, 2, `key ${k} holds a character outside the key rule`);
    if (seen.has(k)) fail(id, 2, `two rows reach the key ${k}`);
    seen.add(k);
  });

  const entries = rows.sources.map((s) => entryById(s, ctx.registry) ?? fail(id, 4, `source ${s} is not in the licence registry`));
  rows.si.forEach((s, i) => rows.licences[rows.li[i]] === entries[s].licence || fail(id, 4, `row ${full[i]} carries ${rows.licences[rows.li[i]]}, and its source ${rows.sources[s]} is under ${entries[s].licence}`));
  const sources = new Set(entries.map((e) => e.attribution.source));
  const credited = new Set(rows.attributions.map((a) => a.source));
  const creditable = new Map(ctx.registry.map((e) => [e.attribution.source, e]));
  if (credited.size !== rows.attributions.length || ![...sources].every((s) => credited.has(s))) fail(id, 4, "the attribution rows do not match the sources");
  rows.attributions.forEach((a) => {
    const entry = creditable.get(a.source) ?? fail(id, 4, `the credit ${a.source} names no registry source`);
    if (a.licence !== entry.licence || typeof a.termsRead !== "boolean" || (audienceOf(rows) === "public" && entry.public === "none" && !sources.has(a.source))) fail(id, 4, `the credit ${a.source} does not match its registry source`);
  });

  if (rows.frame.place) rows.frame.place.forEach((p) => p === null || (PLACE.test(p) && ctx.places.has(p)) || fail(id, 5, `place ${p} is no ISO 3166 two-letter code in the country file`));
  if (rows.frame.points) {
    rows.frame.points.forEach((point, i) => {
      if (point === null) return;
      const [lat, lng] = Array.isArray(point) ? point : [Number.NaN, Number.NaN];
      if (point.length !== 2 || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) fail(id, 5, `row ${i} carries a point that is no latitude and longitude`);
      if (!rows.frame.place?.[i]) fail(id, 5, `row ${i} carries a point and no place code`);
    });
  }
  if (rows.frame.atom) rows.frame.atom.forEach((a) => a === null || (ATOM.test(a) && ctx.atoms?.has(a)) || fail(id, 6, `atom ${a} is not in the alignment file`));

  const audience = audienceOf(rows);
  if (rows.audience !== audience) fail(id, 7, "a set with no audience reads as staff");
  if (audience === "public") entries.forEach((e) => e.public !== "none" || fail(id, 7, `source ${e.id} may not ship in a public set`));
  const labelled = ctx.registry.find((e) => e.licence === rows.licence);
  if (n > 0 && (!labelled || licenceRank(labelled) < Math.max(...entries.map(licenceRank)))) fail(id, 7, `the set is labelled ${rows.licence}, and a row carries a stricter licence`);

  rows.title.forEach((t, i) => {
    if (typeof t !== "string" || t.trim() === "") fail(id, 8, `row ${full[i]} has no title`);
    label(id, t, TITLE_CHARS, "a title");
    if (entries[rows.si[i]].public === "codes" && audience === "public" && (!CODE_ONLY.test(t) || rows.sub[i] !== "")) fail(id, 8, `source ${rows.sources[rows.si[i]]} ships codes alone, and row ${full[i]} carries a label`);
  });
  rows.sub.forEach((s) => (typeof s === "string" ? label(id, s, SUB_CHARS, "a subtitle") : fail(id, 8, "a subtitle is no string")));
  rows.groups.forEach((g) => {
    if (!COLOR.test(g.color)) fail(id, 8, `group ${g.id} has the colour ${g.color}`);
    label(id, g.label, SUB_CHARS, "a group label");
  });
  rows.url.forEach((u) => u === null || /^https:\/\/[^\s]+$/.test(u) || /^http:\/\/[^\s]+$/.test(u) || fail(id, 8, `url ${u} is no web link`));
  everyString(rows, (s) => {
    if (hasEmail(s)) fail(id, 8, "a string holds an email address");
    if (IMAGE_URL.test(s)) fail(id, 8, `a string holds an image link: ${s.slice(0, 60)}`);
  });
  everyString({ ...rows, attributions: audience === "public" ? rows.attributions : [] }, (s) => {
    if (WITHHELD_LABEL.test(s)) fail(id, 8, `a string holds withheld label text: ${s.slice(0, 60)}`);
    if (audience === "public" && /ipums/i.test(s)) fail(id, 8, `a public string cites IPUMS: ${s.slice(0, 60)}`);
  });

  if (!rows.modes.length || !rows.modes.every((m) => ctx.modes.includes(m))) fail(id, 9, `modes ${rows.modes.join(", ")} are not all Explore modes`);
  if (rows.frame.drill && (rows.frame.drill.param !== "group" || new Set(rows.frame.drill.values).size !== rows.frame.drill.values.length || !rows.frame.drill.values.every((v) => HIT_KEY.test(v)))) fail(id, 9, "the drill values are not distinct keys");
  if (rows.sha256 !== bodySha(rows)) fail(id, 9, "sha256 does not cover the body");
}

export function assembleRowSet(pages: RowSetDraft[], ctx: AssembleContext): PackedRows[] {
  if (!pages.length) throw new Error("row sets: a set needs one page at least");
  const packed = pages.map((p) => packRows(p, ctx));
  const first = packed[0];
  const used = [...new Set(packed.flatMap((p) => p.sources))].map((s) => entryById(s, ctx.registry) as LicenceEntry);
  const licence = used.length ? strictest(used) : first.licence;
  const drill = first.frame.drill;
  if (packed.length !== 1 + (drill?.values.length ?? 0)) fail(first.id, 9, `${packed.length} pages for ${drill?.values.length ?? 0} drill values`);
  const keys = new Set<string>();
  const out = packed.map((p) => {
    if (p.id !== first.id || p.label !== first.label || p.audience !== first.audience) fail(first.id, 1, "the pages of one set disagree on id, label or audience");
    for (const k of rowKeys(p)) {
      if (keys.has(k)) fail(first.id, 2, `two rows of the set reach the key ${k}`);
      keys.add(k);
    }
    const body = { ...p, licence };
    return { ...body, sha256: bodySha(body) };
  });
  const opening = new Set(rowKeys(first));
  if (drill) drill.values.forEach((v) => opening.has(v) || fail(first.id, 9, `drill value ${v} is no row of the opening page`));
  out.forEach((p) => checkRows(p, ctx));
  return out;
}

export function pageCount(rows: PackedRows, size = REPLY_HITS): number {
  return Math.max(1, Math.ceil(rows.total / size));
}

function pickRows(rows: PackedRows, picked: number[], counts: { total: number; page: number; countCut: boolean }): PackedRows {
  const at = new Map(picked.map((from, to) => [from, to]));
  const cut = <T>(col: T[]): T[] => picked.map((i) => col[i]);
  const maybe = <T>(col: T[] | null | undefined): T[] | null => (col ? cut(col) : null);
  let dropped = 0;
  const links: number[][] = [];
  const edgeWeight: number[][] = [];
  const edgeStated: boolean[][] = [];
  for (const i of picked) {
    const kept: number[] = [];
    const weights: number[] = [];
    const stated: boolean[] = [];
    rows.links[i].forEach((to, j) => {
      const local = at.get(to);
      if (local === undefined) return void dropped++;
      kept.push(local);
      if (rows.frame.edgeWeight) weights.push(rows.frame.edgeWeight[i][j]);
      if (rows.frame.edgeStated) stated.push(rows.frame.edgeStated[i][j]);
    });
    links.push(kept);
    edgeWeight.push(weights);
    edgeStated.push(stated);
  }
  const body = {
    ...rows,
    n: picked.length,
    total: counts.total,
    page: counts.page,
    cut: counts.countCut ? dropped : 0,
    key: cut(rows.key), title: cut(rows.title), sub: cut(rows.sub), gi: cut(rows.gi), si: cut(rows.si), li: cut(rows.li), year: cut(rows.year), url: cut(rows.url),
    links,
    frame: {
      ...rows.frame,
      from: maybe(rows.frame.from), to: maybe(rows.frame.to), place: maybe(rows.frame.place), points: maybe(rows.frame.points), weight: maybe(rows.frame.weight),
      edgeWeight: rows.frame.edgeWeight ? edgeWeight : null,
      edgeStated: rows.frame.edgeStated ? edgeStated : null,
      atom: maybe(rows.frame.atom), verified: maybe(rows.frame.verified),
    },
  };
  return { ...body, sha256: bodySha(body) };
}

export function pageRows(rows: PackedRows, page: number, size = REPLY_HITS): PackedRows {
  if (rows.page !== 0 || rows.n !== rows.total) throw new RangeError(`row set ${rows.id}: a page cannot be paged again`);
  if (!Number.isInteger(page) || page < 0 || page >= pageCount(rows, size)) throw new RangeError(`row set ${rows.id}: page ${page} is past the end`);
  if (rows.total <= size) return rows;
  const start = page * size;
  const end = Math.min(rows.total, start + size);
  return pickRows(rows, Array.from({ length: end - start }, (_, i) => start + i), { total: rows.total, page, countCut: true });
}

export function narrowRows(rows: PackedRows, keep: (title: string, sub: string, index: number) => boolean): PackedRows {
  if (rows.page !== 0 || rows.n !== rows.total) throw new RangeError(`row set ${rows.id}: a page cannot be narrowed`);
  const picked = rows.title.flatMap((title, i) => (keep(title, rows.sub[i], i) ? [i] : []));
  return picked.length === rows.n ? rows : pickRows(rows, picked, { total: picked.length, page: 0, countCut: false });
}

export function hitIds(rows: PackedRows): string[] {
  return rows.key.map((k) => rows.idp + k);
}

export function rowSetText(pages: PackedRows[]): string {
  const out: string[] = [];
  for (const p of pages) {
    out.push(...hitIds(p));
    everyString(p, (s) => out.push(s));
  }
  return out.join("\n");
}
