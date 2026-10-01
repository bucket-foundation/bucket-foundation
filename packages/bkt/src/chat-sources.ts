import { createHash } from "node:crypto";
import { closeSync, constants, fstatSync, lstatSync, openSync, readdirSync, readSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, relative } from "node:path";
import { scanLines } from "./secret-scan";

export const CHAT_ROOTS = { claude: ".claude/projects", codex: ".codex/sessions" } as const;
export type ChatRoot = keyof typeof CHAT_ROOTS;
export const CHAT_ROOT_NAMES = Object.keys(CHAT_ROOTS) as ChatRoot[];
export type ChatToggles = Record<ChatRoot, boolean>;
export const CHAT_OFF: ChatToggles = { claude: false, codex: false };

export const MAX_LABEL = 80;
export const MIN_LABEL = 8;
export const MAX_DEPTH = 6;

export interface ChatCaps {
  days: number;
  files: number;
  bytes: number;
  fileBytes: number;
  ms: number;
}

export const CHAT_CAPS: ChatCaps = { days: 2, files: 200, bytes: 64 * 1024 * 1024, fileBytes: 8 * 1024 * 1024, ms: 3000 };

export interface FactStub {
  id: string;
  root: ChatRoot;
  label: string;
  date: string;
  turns: number;
}

export interface ChatCounts {
  files: number;
  bytes: number;
  dropped: number;
  skipped: number;
  timedOut: boolean;
}

export interface ChatScan {
  stubs: FactStub[];
  counts: ChatCounts;
}

export interface ChatReadOptions {
  home?: string;
  now?: number;
  caps?: Partial<ChatCaps>;
  clock?: () => number;
}

export function localDay(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function chatRoot(root: ChatRoot, home = homedir()): string | null {
  try {
    const realHome = realpathSync(home);
    const path = join(home, CHAT_ROOTS[root]);
    if (lstatSync(path).isSymbolicLink()) return null;
    const real = realpathSync(path);
    const rel = relative(realHome, real);
    if (!rel || rel.startsWith("..") || isAbsolute(rel)) return null;
    return lstatSync(real).isDirectory() ? real : null;
  } catch {
    return null;
  }
}

interface Candidate {
  path: string;
  root: ChatRoot;
  mtime: number;
  size: number;
}

function walk(dir: string, root: ChatRoot, depth: number, since: number, fileBytes: number, expired: () => boolean, out: Candidate[], counts: ChatCounts) {
  if (depth > MAX_DEPTH || expired()) return;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    counts.skipped++;
    return;
  }
  for (const e of entries) {
    if (expired()) return;
    const path = join(dir, e.name);
    if (e.isSymbolicLink()) counts.skipped++;
    else if (e.isDirectory()) walk(path, root, depth + 1, since, fileBytes, expired, out, counts);
    else if (e.isFile() && e.name.endsWith(".jsonl")) {
      try {
        const st = lstatSync(path);
        if (!st.isFile() || st.mtimeMs < since) continue;
        if (st.size > fileBytes) counts.skipped++;
        else out.push({ path, root, mtime: st.mtimeMs, size: st.size });
      } catch {
        counts.skipped++;
      }
    }
  }
}

function readRegular(path: string, fileBytes: number): string | null {
  let fd: number;
  try {
    fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch {
    return null;
  }
  try {
    const st = fstatSync(fd);
    if (!st.isFile() || st.size > fileBytes) return null;
    const buf = Buffer.alloc(st.size);
    let got = 0;
    while (got < st.size) {
      const n = readSync(fd, buf, got, st.size - got, got);
      if (n === 0) break;
      got += n;
    }
    return buf.subarray(0, got).toString("utf8");
  } catch {
    return null;
  } finally {
    closeSync(fd);
  }
}

function parts(content: unknown): string | null {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return null;
  const texts = content.flatMap((p) => {
    const r = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
    return (r.type === "text" || r.type === "input_text") && typeof r.text === "string" ? [r.text] : [];
  });
  return texts.length ? texts.join("\n") : null;
}

export function userText(entry: unknown): string | null {
  const e = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
  if (e.isMeta === true || e.isSidechain === true) return null;
  const inner = ((e.message ?? e.payload) && typeof (e.message ?? e.payload) === "object" ? (e.message ?? e.payload) : e) as Record<string, unknown>;
  if (inner.type === "user_message" && typeof inner.message === "string") return inner.message;
  return inner.role === "user" ? parts(inner.content) : null;
}

function stubOf(c: Candidate, text: string, counts: ChatCounts): FactStub | null {
  let label: string | null = null;
  let at: number | null = null;
  let turns = 0;
  for (const raw of text.split("\n")) {
    if (!raw.trim()) continue;
    let entry: unknown;
    try {
      entry = JSON.parse(raw);
    } catch {
      continue;
    }
    const said = userText(entry);
    if (said === null) continue;
    const scan = scanLines(said);
    counts.dropped += scan.dropped;
    const line = scan.kept.map((l) => l.replace(/\s+/g, " ").trim()).find((l) => l.length >= MIN_LABEL && !/^[<[{]/.test(l) && !l.startsWith("Caveat:"));
    if (!line) continue;
    turns++;
    if (label === null) {
      label = line.length > MAX_LABEL ? `${line.slice(0, MAX_LABEL - 1).trimEnd()}…` : line;
      const ts = Date.parse(String((entry as Record<string, unknown>).timestamp ?? ""));
      at = Number.isFinite(ts) ? ts : null;
    }
  }
  if (label === null) return null;
  return { id: createHash("sha256").update(c.path).digest("hex").slice(0, 16), root: c.root, label, date: localDay(at ?? c.mtime), turns };
}

export function readChatSources(on: ChatToggles, o: ChatReadOptions = {}): ChatScan {
  const caps = { ...CHAT_CAPS, ...o.caps };
  const clock = o.clock ?? Date.now;
  const started = clock();
  const counts: ChatCounts = { files: 0, bytes: 0, dropped: 0, skipped: 0, timedOut: false };
  const expired = () => {
    if (clock() - started >= caps.ms) counts.timedOut = true;
    return counts.timedOut;
  };
  const since = (o.now ?? Date.now()) - caps.days * 86_400_000;
  const found: Candidate[] = [];
  for (const root of CHAT_ROOT_NAMES) {
    if (!on[root]) continue;
    const dir = chatRoot(root, o.home);
    if (dir) walk(dir, root, 0, since, caps.fileBytes, expired, found, counts);
  }
  found.sort((a, b) => b.mtime - a.mtime || a.path.localeCompare(b.path));
  const stubs: FactStub[] = [];
  for (const c of found) {
    if (expired()) break;
    if (counts.files >= caps.files || counts.bytes + c.size > caps.bytes) {
      counts.skipped++;
      continue;
    }
    const text = readRegular(c.path, caps.fileBytes);
    if (text === null) {
      counts.skipped++;
      continue;
    }
    counts.files++;
    counts.bytes += Buffer.byteLength(text);
    const stub = stubOf(c, text, counts);
    if (stub) stubs.push(stub);
  }
  return { stubs, counts };
}
