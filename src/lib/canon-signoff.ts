import fs from "fs";
import path from "path";
import { parseYamlRecords, type PrimaryPaper } from "./canon-primary";

export type SignoffStatus = "pending" | "approved" | "rejected" | "ungated" | "unknown";

export interface PendingRecord {
  id: string;
  title: string;
  doi: string | null;
  canonScore: number;
  tier: "canon" | "outcome";
  path: string;
  provenanceSignoff: string | null;
  status: SignoffStatus;
}

export interface SignoffResult {
  action: "approved" | "rejected" | "noop";
  status: SignoffStatus;
  id: string;
  path: string;
  value: string;
}

export class SignoffError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, SignoffError.prototype);
    this.name = "SignoffError";
  }
}

const REPO_ROOT = path.resolve(process.cwd());
const CANON_ROOT = path.join(REPO_ROOT, "bucket-canon");
const INGESTION_INDEX = path.join(REPO_ROOT, "CANON-INGESTION-INDEX.md");

export function statusOf(value: string | null | undefined): SignoffStatus {
  if (typeof value !== "string") return "ungated";
  if (/^\s*pending\b/i.test(value)) return "pending";
  if (/^\s*rejected\b/i.test(value)) return "rejected";
  if (/^\s*approved\b/i.test(value)) return "approved";
  return "unknown";
}

function unquote(v: string): string {
  const t = v.trim();
  if (t.length >= 2 && (t[0] === "'" || t[0] === '"') && t[t.length - 1] === t[0]) {
    return t.slice(1, -1);
  }
  return t;
}

function findAllYamlFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name === "_archive") continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(full);
      } else if (e.isFile() && e.name === "primary-papers.yaml") {
        out.push(full);
      }
    }
  };
  if (fs.existsSync(root)) walk(root);
  return out.sort();
}

function tierOf(file: string, root: string): "canon" | "outcome" {
  const rel = path.relative(root, file);
  return rel.split(path.sep).includes("sub-outcomes") ? "outcome" : "canon";
}

function displayPath(file: string, root: string): string {
  const rel1 = path.relative(REPO_ROOT, file);
  if (!rel1.startsWith("..") && !path.isAbsolute(rel1)) return rel1;
  const rel2 = path.relative(path.dirname(root), file);
  if (!rel2.startsWith("..") && !path.isAbsolute(rel2)) return rel2;
  return file;
}

function matchesFileHint(file: string, hint: string, root: string): boolean {
  const h = hint.trim().replace(/\/+$/, "");
  if (!h) return false;
  const candidates = new Set<string>([file]);
  for (const base of [REPO_ROOT, root]) {
    const rel = path.relative(base, file);
    if (rel.startsWith("..") || path.isAbsolute(rel)) continue;
    candidates.add(rel);
    if (rel.endsWith("/primary-papers.yaml")) {
      candidates.add(rel.slice(0, -"/primary-papers.yaml".length));
    }
  }
  return candidates.has(h);
}

interface RecordBlock {
  start: number;
  end: number;
  id: string;
}

function recordBlocks(raw: string): RecordBlock[] {
  const lines = raw.split("\n");
  const starts: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^- id:\s*\S/.test(lines[i])) starts.push(i);
  }
  return starts.map((start, idx) => {
    const end = idx + 1 < starts.length ? starts[idx + 1] : lines.length;
    const m = lines[start].match(/^- id:\s*(.+)$/);
    return { start, end, id: m ? unquote(m[1]) : "" };
  });
}

function signoffOfBlock(raw: string, block: RecordBlock): string | null {
  const lines = raw.split("\n");
  for (let li = block.start; li < block.end; li++) {
    const m = lines[li].match(/^(\s*)provenance_signoff:\s*(.*)$/);
    if (m) return unquote(m[2]) || null;
  }
  return null;
}

export function listRecords(opts?: { root?: string; statuses?: Set<SignoffStatus> }): PendingRecord[] {
  const root = opts?.root ?? CANON_ROOT;
  const want = opts?.statuses ?? new Set<SignoffStatus>(["pending"]);
  const out: PendingRecord[] = [];
  for (const file of findAllYamlFiles(root)) {
    let raw: string;
    try {
      raw = fs.readFileSync(file, "utf-8");
    } catch {
      continue;
    }
    const records: PrimaryPaper[] = parseYamlRecords(raw, "", "");
    for (const r of records) {
      const status = statusOf(r.provenanceSignoff);
      if (!want.has(status)) continue;
      out.push({
        id: r.id,
        title: r.title,
        doi: r.doi || null,
        canonScore: r.canonScore,
        tier: tierOf(file, root),
        path: displayPath(file, root),
        provenanceSignoff: r.provenanceSignoff,
        status,
      });
    }
  }
  out.sort((a, b) => b.canonScore - a.canonScore || a.title.localeCompare(b.title));
  return out;
}

export function listPending(root?: string): PendingRecord[] {
  return listRecords({ root });
}

interface RecordLocation {
  file: string;
  raw: string;
  root: string;
  startLine: number;
  endLine: number;
  record: PrimaryPaper;
}

function loadLocation(file: string, id: string, root: string): RecordLocation {
  const raw = fs.readFileSync(file, "utf-8");
  const block = recordBlocks(raw).find((b) => b.id === id);
  if (!block) throw new SignoffError(`record "${id}" not found in ${file}`);
  const record = parseYamlRecords(raw, "", "").find((r) => r.id === id);
  if (!record) throw new SignoffError(`record "${id}" found in text but not parsed in ${file}`);
  return { file, raw, root, startLine: block.start, endLine: block.end, record };
}

export function findRecord(ref: string, root: string = CANON_ROOT): RecordLocation {
  const trimmed = (ref || "").trim();
  if (!trimmed) throw new SignoffError("a record id is required");

  let fileHint: string | null = null;
  let idHint = trimmed;
  const m = trimmed.match(/^(.+?)[#:]([A-Za-z0-9_.-]+)$/);
  if (m && (m[1].includes("/") || m[1].endsWith(".yaml"))) {
    fileHint = m[1];
    idHint = m[2];
  }

  let files = findAllYamlFiles(root);
  if (fileHint) {
    const hint = fileHint;
    files = files.filter((f) => matchesFileHint(f, hint, root));
    if (files.length === 0) throw new SignoffError(`no primary-papers.yaml matches path "${fileHint}"`);
  }

  const idCandidates: { file: string; id: string }[] = [];
  for (const file of files) {
    const raw = fs.readFileSync(file, "utf-8");
    for (const b of recordBlocks(raw)) {
      if (b.id === idHint) idCandidates.push({ file, id: b.id });
    }
  }
  if (idCandidates.length === 1) return loadLocation(idCandidates[0].file, idCandidates[0].id, root);
  if (idCandidates.length > 1) {
    const where = idCandidates.map((c) => `${displayPath(c.file, root)}#${c.id}`).join(", ");
    throw new SignoffError(`ambiguous record id "${idHint}", matches: ${where}`);
  }
  if (fileHint) throw new SignoffError(`no record with id "${idHint}" under "${fileHint}"`);

  const pathFiles = findAllYamlFiles(root).filter((f) => matchesFileHint(f, trimmed, root));
  if (pathFiles.length === 0) throw new SignoffError(`no record found for "${trimmed}"`);
  if (pathFiles.length > 1) {
    const where = pathFiles.map((f) => displayPath(f, root)).join(", ");
    throw new SignoffError(`"${trimmed}" matches more than one file: ${where}`);
  }
  const file = pathFiles[0];
  const raw = fs.readFileSync(file, "utf-8");
  const pendingIds = recordBlocks(raw)
    .filter((b) => statusOf(signoffOfBlock(raw, b)) === "pending")
    .map((b) => b.id);
  if (pendingIds.length === 1) return loadLocation(file, pendingIds[0], root);
  if (pendingIds.length > 1) {
    throw new SignoffError(`"${trimmed}" has ${pendingIds.length} pending records, specify an id: ${pendingIds.join(", ")}`);
  }
  throw new SignoffError(`"${trimmed}" has no pending record; specify an id explicitly (e.g. ${trimmed}#<id>)`);
}

function writeSignoffLine(loc: RecordLocation, newValue: string): void {
  const lines = loc.raw.split("\n");
  let written = false;
  for (let li = loc.startLine; li < loc.endLine; li++) {
    const m = lines[li].match(/^(\s*)provenance_signoff:\s*(.*)$/);
    if (m) {
      lines[li] = `${m[1]}provenance_signoff: '${newValue}'`;
      written = true;
      break;
    }
  }
  if (!written) {
    lines.splice(loc.startLine + 1, 0, `  provenance_signoff: '${newValue}'`);
  }
  fs.writeFileSync(loc.file, lines.join("\n"));
}

function appendIndexEvent(
  indexPath: string,
  opts: {
    action: "approved" | "rejected";
    loc: RecordLocation;
    root: string;
    by: string;
    date: string;
    doiVerified?: boolean;
    reason?: string;
  },
): void {
  const title = (opts.loc.record.title || "").replace(/"/g, "'");
  let suffix = "";
  if (opts.action === "approved" && opts.doiVerified) suffix = " (DOI verified)";
  if (opts.action === "rejected" && opts.reason) suffix = ` -- reason: ${opts.reason}`;
  const line = `- **${opts.action}**: \`${displayPath(opts.loc.file, opts.root)}#${opts.loc.record.id}\` "${title}" by ${opts.by} on ${opts.date}${suffix}`;
  const block = `\n## Canon sign-off, ${opts.date}\n\n${line}\n`;
  const existing = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, "utf-8") : "";
  const separator = existing.endsWith("\n") ? "" : "\n";
  fs.writeFileSync(indexPath, existing + separator + block);
}

async function doiResolves(doi: string, timeoutMs = 10000): Promise<boolean> {
  const url = doi.startsWith("http") ? doi : `https://doi.org/${doi}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let res = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal });
    if (res.status === 405 || res.status === 403) {
      res = await fetch(url, { method: "GET", redirect: "follow", signal: controller.signal });
    }
    return res.status < 400;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function approve(
  ref: string,
  by: string,
  opts?: { offline?: boolean; root?: string; indexPath?: string },
): Promise<SignoffResult> {
  const trimmedBy = (by || "").trim();
  if (!trimmedBy) throw new SignoffError("approve: an approver name is required");
  const root = opts?.root ?? CANON_ROOT;
  const indexPath = opts?.indexPath ?? INGESTION_INDEX;
  const loc = findRecord(ref, root);
  const current = loc.record.provenanceSignoff;
  const status = statusOf(current);
  if (status === "approved") {
    return { action: "noop", status: "approved", id: loc.record.id, path: displayPath(loc.file, root), value: current || "" };
  }

  let doiVerified = false;
  if (!opts?.offline) {
    const doi = (loc.record.doi || "").trim();
    if (!doi) {
      throw new SignoffError(`approve refused: ${loc.record.id} has no DOI to verify (pass offline to bypass)`);
    }
    const ok = await doiResolves(doi);
    if (!ok) {
      throw new SignoffError(`approve refused: DOI ${doi} did not resolve via a HEAD request (pass offline to bypass)`);
    }
    doiVerified = true;
  }

  const today = new Date().toISOString().slice(0, 10);
  const newValue = `approved: ${trimmedBy} ${today}`;
  writeSignoffLine(loc, newValue);
  appendIndexEvent(indexPath, { action: "approved", loc, root, by: trimmedBy, date: today, doiVerified });
  return { action: "approved", status: "approved", id: loc.record.id, path: displayPath(loc.file, root), value: newValue };
}

export async function reject(
  ref: string,
  by: string,
  reason: string,
  opts?: { root?: string; indexPath?: string },
): Promise<SignoffResult> {
  const trimmedBy = (by || "").trim();
  const trimmedReason = (reason || "").trim();
  if (!trimmedBy) throw new SignoffError("reject: an approver name is required");
  if (!trimmedReason) throw new SignoffError("reject: a reason is required");
  const root = opts?.root ?? CANON_ROOT;
  const indexPath = opts?.indexPath ?? INGESTION_INDEX;
  const loc = findRecord(ref, root);
  const current = loc.record.provenanceSignoff;
  const status = statusOf(current);
  if (status === "rejected") {
    return { action: "noop", status: "rejected", id: loc.record.id, path: displayPath(loc.file, root), value: current || "" };
  }
  const today = new Date().toISOString().slice(0, 10);
  const newValue = `rejected: ${trimmedBy} ${today}: ${trimmedReason}`;
  writeSignoffLine(loc, newValue);
  appendIndexEvent(indexPath, { action: "rejected", loc, root, by: trimmedBy, date: today, reason: trimmedReason });
  return { action: "rejected", status: "rejected", id: loc.record.id, path: displayPath(loc.file, root), value: newValue };
}
