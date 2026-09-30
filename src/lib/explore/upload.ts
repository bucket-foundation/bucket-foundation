import { summarize, detectFormat, type GenomeSummary } from "./genome/parse";
import { summarize as summarizeStructure, type StructureFormat, type StructureSummary } from "./protein";
import { similarity, tokens, type Hit } from "./search";

export type UploadKind = "genome" | "structure" | "smiles" | "bibliography" | "document" | "unknown";

export interface BibEntry {
  title: string;
  authors: string;
  year: number | null;
}

export type UploadResult =
  | { kind: "genome"; name: string; format: string; summary: GenomeSummary }
  | { kind: "structure"; name: string; format: StructureFormat; text: string; summary: StructureSummary }
  | { kind: "smiles"; name: string; smiles: string; reaction: boolean; count: number }
  | { kind: "bibliography"; name: string; format: string; entries: BibEntry[] }
  | { kind: "document"; name: string; format: string; text: string }
  | { kind: "unknown"; name: string; reason: string };

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
export const MAX_DOCUMENT_CHARS = 200_000;

const ATOM_TOKEN = /^(\[[^\]\s]+\]|Br|Cl|[BCNOPSFI]|[bcnops]|[=#$:/\\().+\-@%0-9*~>])+$/;
const ATOM_COUNT = /\[[^\]\s]+\]|Br|Cl|[BCNOPSFIbcnops]/g;

export function looksLikeSmiles(s: string): boolean {
  const t = s.trim();
  if (t.length < 2 || t.length > 400 || /\s/.test(t)) return false;
  if (!ATOM_TOKEN.test(t)) return false;
  if ((t.match(ATOM_COUNT) ?? []).length < 2) return false;
  let depth = 0;
  for (const c of t) {
    if (c === "(") depth++;
    if (c === ")" && --depth < 0) return false;
  }
  return depth === 0 && (t.match(/\[/g) ?? []).length === (t.match(/\]/g) ?? []).length;
}

function extOf(name: string): string {
  return name.toLowerCase().split(".").pop() ?? "";
}

export type Classified = { kind: UploadKind; format: string };

export function classify(name: string, head: string): Classified {
  const ext = extOf(name);
  const text = head.replace(/^﻿/, "");
  if (ext === "pdf" || text.startsWith("%PDF")) return { kind: "document", format: "pdf" };
  if (["pdb", "ent"].includes(ext) || /^ATOM  .{20}/m.test(text)) return { kind: "structure", format: "pdb" };
  if (["cif", "mmcif"].includes(ext) || (/^data_\S+/m.test(text.slice(0, 2000)) && /_atom_site\./.test(text))) return { kind: "structure", format: "cif" };
  const genome = detectFormat(text);
  if (genome !== "unknown") return { kind: "genome", format: genome };
  if (/^@\w+\s*\{/m.test(text)) return { kind: "bibliography", format: "bibtex" };
  if (/^TY {2}- /m.test(text)) return { kind: "bibliography", format: "ris" };
  if (ext === "json" || /^\s*[[{]/.test(text)) {
    try {
      if (bibFromJson(JSON.parse(text)).length) return { kind: "bibliography", format: "csl-json" };
    } catch {
      if (ext === "json") return { kind: "unknown", format: "json" };
    }
  }
  if (ext === "csv" || ext === "tsv") {
    const rows = parseCsv(text, ext === "tsv" ? "\t" : ",");
    const header = (rows[0] ?? []).map((h) => h.trim().toLowerCase());
    if (header.includes("smiles")) return { kind: "smiles", format: "csv" };
    if (header.includes("title")) return { kind: "bibliography", format: "csv" };
    return { kind: "unknown", format: "csv" };
  }
  if (["smi", "smiles"].includes(ext)) return { kind: "smiles", format: "smi" };
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length && lines.length <= 50 && lines.every((l) => looksLikeSmiles(l.split(/\s+/)[0]))) return { kind: "smiles", format: "smi" };
  if (["md", "markdown", "txt", "text", "rtf"].includes(ext) || /^[\x09\x0A\x0D\x20-\x7E -￿]*$/.test(text.slice(0, 2000))) {
    return { kind: "document", format: ext === "md" || ext === "markdown" ? "markdown" : "text" };
  }
  return { kind: "unknown", format: ext };
}

export function parseCsv(text: string, sep = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x !== "")) rows.push(row);
  return rows;
}

const flat = (s: string) => s.replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
const yearIn = (s: unknown): number | null => {
  const m = String(s ?? "").match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  return m ? Number(m[1]) : null;
};

export function parseBibtex(text: string): BibEntry[] {
  const out: BibEntry[] = [];
  for (const chunk of text.split(/^@/m).slice(1)) {
    const fields: Record<string, string> = {};
    const re = /(\w+)\s*=\s*(\{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}|"([^"]*)"|([\w.]+))/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(chunk))) fields[m[1].toLowerCase()] = m[3] ?? m[4] ?? m[5] ?? "";
    if (fields.title) out.push({ title: flat(fields.title), authors: flat(fields.author ?? "").replace(/\s+and\s+/g, "; "), year: yearIn(fields.year ?? fields.date) });
  }
  return out;
}

export function parseRis(text: string): BibEntry[] {
  const out: BibEntry[] = [];
  let cur: { title: string; authors: string[]; year: number | null } | null = null;
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z][A-Z0-9]) {2}- ?(.*)$/);
    if (!m) continue;
    const [, tag, val] = m;
    if (tag === "TY") cur = { title: "", authors: [], year: null };
    else if (!cur) continue;
    else if (tag === "TI" || tag === "T1") cur.title = val.trim();
    else if (tag === "AU" || tag === "A1") cur.authors.push(val.trim());
    else if (tag === "PY" || tag === "Y1" || tag === "DA") cur.year = cur.year ?? yearIn(val);
    else if (tag === "ER") {
      if (cur.title) out.push({ title: cur.title, authors: cur.authors.join("; "), year: cur.year });
      cur = null;
    }
  }
  return out;
}

export function bibFromJson(v: unknown): BibEntry[] {
  const list = Array.isArray(v) ? v : v && typeof v === "object" && Array.isArray((v as { items?: unknown }).items) ? (v as { items: unknown[] }).items : [];
  const out: BibEntry[] = [];
  for (const it of list) {
    if (!it || typeof it !== "object") continue;
    const o = it as Record<string, unknown>;
    if (typeof o.title !== "string" || !o.title.trim()) continue;
    const authors = Array.isArray(o.author)
      ? o.author.map((a: { family?: string; given?: string; name?: string }) => a?.name ?? [a?.given, a?.family].filter(Boolean).join(" ")).filter(Boolean).join("; ")
      : typeof o.authors === "string"
        ? o.authors
        : "";
    const issued = (o.issued as { "date-parts"?: unknown[][] } | undefined)?.["date-parts"]?.[0]?.[0];
    out.push({ title: flat(o.title), authors, year: yearIn(issued ?? o.year ?? o.publication_year ?? o.date) });
  }
  return out;
}

export function parseBibCsv(text: string, sep = ","): BibEntry[] {
  const [head, ...rows] = parseCsv(text, sep);
  if (!head) return [];
  const idx = (names: string[]) => head.findIndex((h) => names.includes(h.trim().toLowerCase()));
  const t = idx(["title"]);
  const a = idx(["author", "authors"]);
  const y = idx(["year", "date", "publication_year"]);
  if (t < 0) return [];
  return rows.filter((r) => r[t]?.trim()).map((r) => ({ title: flat(r[t]), authors: a >= 0 ? flat(r[a] ?? "") : "", year: y >= 0 ? yearIn(r[y]) : null }));
}

export function smilesFromText(text: string, csv: boolean, sep = ","): string[] {
  if (csv) {
    const [head, ...rows] = parseCsv(text, sep);
    const i = (head ?? []).findIndex((h) => h.trim().toLowerCase() === "smiles");
    return i < 0 ? [] : rows.map((r) => (r[i] ?? "").trim()).filter(Boolean);
  }
  return text.split(/\r?\n/).map((l) => l.trim().split(/\s+/)[0]).filter((l) => l && !l.startsWith("#"));
}

export const MAX_INFLATED_BYTES = 8 * 1024 * 1024;

async function inflate(bytes: Uint8Array, cap = MAX_INFLATED_BYTES): Promise<Uint8Array | null> {
  if (typeof DecompressionStream === "undefined") return null;
  const reader = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate")).getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > cap) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

function unescapePdf(s: string): string {
  return s
    .replace(/\\([nrtbf])/g, (_, c: string) => ({ n: "\n", r: "\n", t: " ", b: "", f: "" })[c] ?? "")
    .replace(/\\([0-7]{1,3})/g, (_, o: string) => String.fromCharCode(parseInt(o, 8)))
    .replace(/\\([()\\])/g, "$1");
}

export function textOps(content: string): string {
  const out: string[] = [];
  for (const block of content.match(/BT[\s\S]*?ET/g) ?? []) {
    for (const m of Array.from(block.matchAll(/\[((?:[^\]\\]|\\.)*)\]\s*TJ|\(((?:[^()\\]|\\.)*)\)\s*(?:Tj|'|")/g))) {
      if (m[2] !== undefined) out.push(unescapePdf(m[2]));
      else out.push(Array.from(m[1].matchAll(/\(((?:[^()\\]|\\.)*)\)|(-?\d+(?:\.\d+)?)/g)).map((p) => (p[1] !== undefined ? unescapePdf(p[1]) : Number(p[2]) < -200 ? " " : "")).join(""));
    }
    out.push("\n");
  }
  return out.join(" ").replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n").trim();
}

export async function pdfText(bytes: Uint8Array, inflateCap = MAX_INFLATED_BYTES): Promise<string> {
  const raw = new TextDecoder("latin1").decode(bytes);
  const parts: string[] = [];
  const re = /stream\r?\n/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const start = m.index + m[0].length;
    const end = raw.indexOf("endstream", start);
    if (end < 0) break;
    const dict = raw.slice(Math.max(0, m.index - 300), m.index);
    let stop = end;
    while (stop > start && (bytes[stop - 1] === 10 || bytes[stop - 1] === 13)) stop--;
    const body = bytes.subarray(start, stop);
    const data = /FlateDecode/.test(dict.slice(dict.lastIndexOf("<<"))) ? await inflate(body, inflateCap) : body;
    if (data) {
      const t = textOps(new TextDecoder("latin1").decode(data));
      if (t) parts.push(t);
    }
    re.lastIndex = end;
    if (parts.join(" ").length > MAX_DOCUMENT_CHARS) break;
  }
  return parts.join("\n").slice(0, MAX_DOCUMENT_CHARS);
}

export async function processUpload(name: string, bytes: Uint8Array): Promise<UploadResult> {
  if (bytes.length > MAX_UPLOAD_BYTES) return { kind: "unknown", name, reason: `File is over ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.` };
  const head = new TextDecoder().decode(bytes.subarray(0, 64 * 1024));
  const c = classify(name, head);
  if (c.kind === "document" && c.format === "pdf") {
    const text = await pdfText(bytes);
    return text.length > 20 ? { kind: "document", name, format: "pdf", text } : { kind: "unknown", name, reason: "No extractable text in this PDF. Export it as text or Markdown." };
  }
  const text = new TextDecoder().decode(bytes);
  switch (c.kind) {
    case "genome": {
      const summary = summarize(text);
      return { kind: "genome", name, format: c.format, summary };
    }
    case "structure": {
      const format: StructureFormat = c.format === "cif" ? "cif" : "pdb";
      const summary = summarizeStructure(text, format);
      return summary.residues ? { kind: "structure", name, format, text, summary } : { kind: "unknown", name, reason: "No protein residues found in this structure." };
    }
    case "smiles": {
      const csv = c.format === "csv";
      const list = smilesFromText(text, csv, extOf(name) === "tsv" ? "\t" : ",").filter(looksLikeSmiles);
      return list.length ? { kind: "smiles", name, smiles: list[0], reaction: list[0].includes(">>"), count: list.length } : { kind: "unknown", name, reason: "No valid SMILES found." };
    }
    case "bibliography": {
      const entries = c.format === "bibtex" ? parseBibtex(text) : c.format === "ris" ? parseRis(text) : c.format === "csv" ? parseBibCsv(text, extOf(name) === "tsv" ? "\t" : ",") : bibFromJson(JSON.parse(text));
      return entries.length ? { kind: "bibliography", name, format: c.format, entries } : { kind: "unknown", name, reason: "No entries with a title found." };
    }
    case "document":
      return text.trim() ? { kind: "document", name, format: c.format, text: text.slice(0, MAX_DOCUMENT_CHARS) } : { kind: "unknown", name, reason: "The file is empty." };
    default:
      return { kind: "unknown", name, reason: `Format not recognized${c.format ? ` (${c.format})` : ""}. Use VCF, 23andMe, FASTA, PDB, mmCIF, SMILES, CSV, JSON, BibTeX, RIS, PDF or Markdown.` };
  }
}

export const MODE_FOR: Record<Exclude<UploadKind, "unknown">, string> = {
  genome: "dna",
  structure: "protein",
  smiles: "molecule",
  bibliography: "papers",
  document: "self",
};

export function routeFor(r: UploadResult): { mode: string | null; label: string } {
  if (r.kind === "unknown") return { mode: null, label: r.reason };
  if (r.kind === "smiles") return { mode: r.reaction ? "reaction" : "molecule", label: `SMILES: ${r.count} structure${r.count === 1 ? "" : "s"}, showing the first.` };
  if (r.kind === "genome") return { mode: "dna", label: `${r.format}: ${r.summary.variantCount.toLocaleString()} variants, ${r.summary.annotated.length} annotated.` };
  if (r.kind === "structure") return { mode: "protein", label: `${r.format}: ${r.summary.chains.join(",")} · ${r.summary.residues} residues.` };
  if (r.kind === "bibliography") return { mode: null, label: `${r.format}: ${r.entries.length} papers added to the results.` };
  return { mode: null, label: `${r.format}: added as your node.` };
}

const YOU_ID = "you:self";

export function youHit(name: string, text: string): Hit {
  return { id: YOU_ID, type: "you", title: "You", subtitle: name, text: text.replace(/\s+/g, " ").trim().slice(0, 400), score: 1, branch: "you", year: null, url: null, links: [] };
}

export function bibHits(entries: BibEntry[], cap = 200): Hit[] {
  return entries.slice(0, cap).map((e, i) => ({
    id: `paper:upload/${i}`,
    type: "paper",
    title: e.title,
    subtitle: [e.authors, "Uploaded"].filter(Boolean).join(" · "),
    text: "",
    score: 1,
    branch: "Uploaded",
    year: e.year,
    url: null,
    links: [],
  }));
}

export function linkNearest(uploaded: Hit[], pool: Hit[], k = 3): Hit[] {
  const bags = pool.filter((h) => h.type === "excerpt" || h.type === "advisor").map((h) => ({ id: h.id, bag: tokens(`${h.title} ${h.text}`) }));
  return uploaded.map((u) => {
    const bag = tokens(`${u.title} ${u.text}`);
    const links = bags
      .map((b) => ({ id: b.id, s: similarity(bag, b.bag) }))
      .filter((b) => b.s > 0)
      .sort((x, y) => y.s - x.s || (x.id < y.id ? -1 : 1))
      .slice(0, k)
      .map((b) => b.id);
    return { ...u, links };
  });
}
