// canon-signoff.ts, the web-route side of the canon human sign-off tool
// (GOVERNANCE.md's "Canon sign-off" section). Shared between GET and POST
// in src/app/api/canon/signoff/route.ts so the route file itself stays a
// thin auth-then-dispatch shell, the same separation
// src/lib/research-os/reviewer.ts + review/route.ts already use.
//
// TWO SIGNOFF VOCABULARIES. This module writes and reads the SAME
// `provenance_signoff` field and "pending: <name>" / "approved: <name>
// <date>" / "rejected: <name> <date>: <reason>" vocabulary as
// tools/canon-pipeline/signoff.py (the CLI). That CLI's own
// signoff_core.py is the reference implementation; canon-signoff.ts
// re-implements it in TypeScript against the identical on-disk record
// shape. A Vercel Node function has no Python runtime to shell out to, so
// it cannot call the Python module directly. `hte.canon_writeback.write_back` (the
// hypothesis-engine's write path) uses a DIFFERENT field entirely
// (`signed_off_by: <name>`, no verb, on markdown cards under
// bucket-canon/<branch>/hypotheses/, never canon_tier: canon) and is out of
// scope for this module; see tools/canon-pipeline/SIGNOFF.md.
//
// NO YAML DEPENDENCY, matching canon-primary.ts's own stated convention:
// reading reuses that file's tolerant scanner (parseYamlRecords); writing
// is a surgical single-line replace of the target record's
// `provenance_signoff:` line, leaving every other byte untouched, exactly
// mirroring signoff_core.py's own write strategy.
//
// OPERATIONAL NOTE: this app deploys to Vercel (package.json's
// @vercel/analytics, learning/research-os/CHANGE-LEDGER.md's Vercel
// deployment-check entries). A Vercel Node function's filesystem is
// read-only at runtime, so a write here will throw (surfaced by the route
// as a 500) unless the process is running against a writable checkout
// (local `npm run dev`, or a self-hosted `next start` against a git
// working tree an operator commits from). tools/canon-pipeline/SIGNOFF.md
// documents this; the CLI is the durable path until a DB- or
// GitHub-API-backed write path replaces direct filesystem writes.

import fs from "fs";
import path from "path";
import { parseYamlRecords, type PrimaryPaper } from "./canon-primary";

// canon-primary.ts's own findPrimaryFiles is intentionally NOT reused for
// discovery here: it only walks one level below each branch (branch/
// concept/primary-papers.yaml), which misses bucket-canon/07-mind/
// sub-outcomes/education/primary-papers.yaml (two levels down, 11 of the
// 20 currently-pending records live there). This module needs every
// pending record regardless of nesting depth, so it walks the tree itself
// (findAllYamlFiles below). findPrimaryFiles' one-level behavior is left
// unchanged for loadPrimaryPapers()'s live-serving path; fixing that
// depth limit would change what /api/research serves and is out of scope
// here (see SIGNOFF.md).

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
    // Restores the prototype chain: a class extending the built-in Error
    // loses `instanceof` under a downlevel compile target (TS's well-known
    // ES5-and-earlier gotcha) without this. next.config.mjs's own build
    // target is modern enough not to need it, but scripts/test-canon-
    // signoff.ts runs through ts-node with no target override (defaults
    // to ES3), where `instanceof SignoffError` would silently fail without
    // this line.
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

// Repo-relative ("bucket-canon/...") in real usage; falls back to
// relative-to-root's-parent so a test fixture rooted outside the repo still
// renders the same shape instead of a raw absolute path. Mirrors
// signoff_core.py's _display_path exactly.
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

/**
 * Every record under root whose status is in `statuses` (default: just
 * "pending"), sorted by canon_score desc then title, matching signoff_core.
 * py's list_records/list_pending.
 */
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
    // branch/concept args are unused by this module (tier is derived from
    // the file path instead); parseYamlRecords still needs them to tag
    // each PrimaryPaper, so pass empty strings.
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

/**
 * Resolve a `record` argument to one on-disk record. Accepted forms: a bare
 * id ("bkt-2f40cfaacd63", matched globally; ids are unique by
 * construction), "<path>#<id>" or "<path>:<id>", or a bare path to a
 * primary-papers.yaml file / its concept directory IF it carries exactly
 * one pending record. Mirrors signoff_core.py's find_record exactly.
 */
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
    // Record predates the field (pre-ros-11); not expected to be hit by
    // approve/reject since listPending only surfaces records that already
    // carry it. Kept as a safe fallback, mirroring signoff_core.py.
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
