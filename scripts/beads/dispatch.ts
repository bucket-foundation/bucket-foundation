import { closeSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";

export interface PendingRow {
  source: string;
  title: string;
  description: string;
  issue_type: string;
  priority: number;
  line: number;
}

export interface Links {
  parent: string | null;
  dependsOn: string[];
  conditions: string[];
}

export interface RemoteIssue {
  id: string;
  title: string;
  status?: string;
}

export interface RemoteDep {
  depends_on_id: string;
  dep_type?: string;
}

export type CreateOutcome =
  | { kind: "created"; id: string; status: number }
  | { kind: "rejected"; status: number; error: string }
  | { kind: "uncertain"; status: number | null; error: string };

export interface IssuesApi {
  list(): Promise<RemoteIssue[]>;
  create(body: CreateBody): Promise<CreateOutcome>;
  deps(id: string): Promise<RemoteDep[]>;
  addDep(id: string, dependsOnId: string, type: EdgeType): Promise<{ ok: boolean; status: number | null; error?: string }>;
}

export interface CreateBody {
  title: string;
  description: string;
  issue_type: string;
  priority: number;
  labels: string[];
}

export type EdgeType = "parent-child" | "block";

export type LedgerState = "created" | "adopted" | "uncertain" | "failed" | "retired";

export interface LedgerEntry {
  source: string;
  key: string;
  title: string;
  id: string | null;
  state: LedgerState;
  at: string;
  http?: number | null;
  note?: string;
}

export function titleKey(title: string): string {
  const i = title.indexOf(": ");
  return (i === -1 ? title : title.slice(0, i)).trim();
}

const CONDITION = /^PR #\d+\b/i;

export function parseLinks(description: string): Links {
  const parentMatch = /(?:^|\s)Parent:\s*(.+?)\.(?:\s|$)/.exec(description);
  const dependsMatch = /(?:^|\s)Depends on:\s*(.+?)\.(?:\s|$)/.exec(description);
  const parent = parentMatch ? parentMatch[1].trim() : null;
  const dependsOn: string[] = [];
  const conditions: string[] = [];
  if (dependsMatch) {
    for (const raw of dependsMatch[1].split(",")) {
      const item = raw.trim();
      if (!item || item.toLowerCase() === "none") continue;
      if (CONDITION.test(item)) conditions.push(item);
      else dependsOn.push(item);
    }
  }
  return { parent: parent && parent.toLowerCase() !== "none" ? parent : null, dependsOn, conditions };
}

export function parsePending(text: string, sources: string[]): { rows: PendingRow[]; problems: string[] } {
  const rows: PendingRow[] = [];
  const problems: string[] = [];
  const seen = new Set<string>();
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    let o: Record<string, unknown>;
    try {
      o = JSON.parse(line);
    } catch {
      problems.push(`line ${i + 1}: not JSON`);
      continue;
    }
    const source = typeof o.source === "string" ? o.source : "";
    if (!sources.includes(source)) continue;
    const title = typeof o.title === "string" ? o.title.trim() : "";
    if (!title) {
      problems.push(`line ${i + 1}: no title`);
      continue;
    }
    const id = `${source}\u0000${title}`;
    if (seen.has(id)) {
      problems.push(`line ${i + 1}: repeats the title "${title}", first row kept`);
      continue;
    }
    seen.add(id);
    const priority = typeof o.priority === "number" && Number.isInteger(o.priority) ? o.priority : 2;
    rows.push({
      source,
      title,
      description: typeof o.description === "string" ? o.description : "",
      issue_type: typeof o.issue_type === "string" ? o.issue_type : "task",
      priority,
      line: i + 1,
    });
  }
  return { rows, problems };
}

export function latestEntries(text: string): Map<string, LedgerEntry> {
  const out = new Map<string, LedgerEntry>();
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line) as LedgerEntry;
      if (typeof e.source === "string" && typeof e.title === "string" && typeof e.state === "string") {
        out.set(`${e.source}\u0000${e.title}`, e);
      }
    } catch {
    }
  }
  return out;
}

export function findCycle(rows: PendingRow[]): string[] | null {
  const keys = new Set(rows.map((r) => titleKey(r.title)));
  const next = new Map<string, string[]>();
  for (const r of rows) {
    const l = parseLinks(r.description);
    next.set(titleKey(r.title), [...(l.parent ? [l.parent] : []), ...l.dependsOn].filter((k) => keys.has(k)));
  }
  const state = new Map<string, 1 | 2>();
  const stack: string[] = [];
  const visit = (k: string): string[] | null => {
    if (state.get(k) === 2) return null;
    if (state.get(k) === 1) return [...stack.slice(stack.indexOf(k)), k];
    state.set(k, 1);
    stack.push(k);
    for (const n of next.get(k) ?? []) {
      const c = visit(n);
      if (c) return c;
    }
    stack.pop();
    state.set(k, 2);
    return null;
  };
  for (const k of Array.from(keys)) {
    const c = visit(k);
    if (c) return c;
  }
  return null;
}

export type Outcome =
  | "created"
  | "adopted"
  | "existing"
  | "would_create"
  | "uncertain"
  | "failed"
  | "ambiguous"
  | "missing";

export type EdgeState = "retired" | "waiting" | "unchecked" | "none";

export interface RowReport {
  title: string;
  key: string;
  id: string | null;
  outcome: Outcome;
  edges: EdgeState;
  detail: string[];
}

export interface Report {
  rows: RowReport[];
  conditions: { title: string; condition: string }[];
  posts: number;
}

export interface ReconcileOptions {
  apply: boolean;
  now?: () => string;
  record: (e: LedgerEntry) => void | Promise<void>;
}

function group<T>(items: T[], by: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const t of items) {
    const k = by(t);
    const list = m.get(k);
    if (list) list.push(t);
    else m.set(k, [t]);
  }
  return m;
}

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

export async function reconcile(
  rows: PendingRow[],
  ledger: Map<string, LedgerEntry>,
  api: IssuesApi,
  opts: ReconcileOptions,
): Promise<Report> {
  const now = opts.now ?? (() => new Date().toISOString());
  const report: Report = { rows: [], conditions: [], posts: 0 };
  const cycle = findCycle(rows);
  if (cycle) throw new Error(`dependency cycle among pending rows: ${cycle.join(" -> ")}`);

  let remote = await api.list();
  let byId = new Map(remote.map((r) => [r.id, r]));
  let byTitle = group(remote, (r) => r.title.trim());
  const refresh = async () => {
    remote = await api.list();
    byId = new Map(remote.map((r) => [r.id, r]));
    byTitle = group(remote, (r) => r.title.trim());
  };

  const note = async (row: PendingRow, state: LedgerState, id: string | null, http?: number | null, detail?: string) => {
    await opts.record({
      source: row.source,
      key: titleKey(row.title),
      title: row.title,
      id,
      state,
      at: now(),
      http: http ?? null,
      ...(detail ? { note: detail.slice(0, 300) } : {}),
    });
  };

  const byRow = new Map<PendingRow, RowReport>();
  const ids = new Map<string, string>();
  for (const row of rows) {
    const key = titleKey(row.title);
    const r: RowReport = { title: row.title, key, id: null, outcome: "would_create", edges: "none", detail: [] };
    report.rows.push(r);
    byRow.set(row, r);
    for (const c of parseLinks(row.description).conditions) report.conditions.push({ title: row.title, condition: c });
    const known = ledger.get(`${row.source}\u0000${row.title}`);

    if (known?.id && byId.has(known.id)) {
      r.id = known.id;
      r.outcome = "existing";
      if (known.state === "retired") r.edges = "retired";
      ids.set(key, known.id);
      continue;
    }
    if (known?.id) {
      r.outcome = "missing";
      r.id = known.id;
      r.detail.push(`the ledger holds ${known.id} but the server lists no such issue; nothing sent`);
      continue;
    }
    const matches = byTitle.get(row.title) ?? [];
    if (matches.length > 1) {
      r.outcome = "ambiguous";
      r.detail.push(`${matches.length} remote issues carry this exact title: ${matches.map((m) => m.id).join(", ")}`);
      continue;
    }
    if (matches.length === 1) {
      r.outcome = "adopted";
      r.id = matches[0].id;
      ids.set(key, r.id);
      if (opts.apply) await note(row, "adopted", r.id);
      continue;
    }
    if (!opts.apply) continue;

    report.posts++;
    const out = await api.create({
      title: row.title,
      description: row.description,
      issue_type: row.issue_type,
      priority: row.priority,
      labels: [`source:${row.source}`],
    });
    if (out.kind === "created") {
      r.outcome = "created";
      r.id = out.id;
      ids.set(key, out.id);
      byId.set(out.id, { id: out.id, title: row.title });
      byTitle.set(row.title, [{ id: out.id, title: row.title }]);
      await note(row, "created", out.id, out.status);
      continue;
    }
    if (out.kind === "rejected") {
      r.outcome = "failed";
      r.detail.push(`HTTP ${out.status}: ${out.error}`);
      await note(row, "failed", null, out.status, out.error);
      continue;
    }
    let found: RemoteIssue[] = [];
    try {
      await refresh();
      found = byTitle.get(row.title) ?? [];
    } catch (e) {
      r.detail.push(`the lookup after it failed too: ${errorText(e)}`);
    }
    if (found.length === 1) {
      r.outcome = "adopted";
      r.id = found[0].id;
      ids.set(key, r.id);
      r.detail.push(`create outcome unknown (${out.error}); the lookup found it`);
      await note(row, "adopted", r.id, out.status, `found after: ${out.error}`);
    } else {
      r.outcome = "uncertain";
      r.detail.push(`create outcome unknown (${out.error}); the next run looks it up before sending`);
      await note(row, "uncertain", null, out.status, out.error);
    }
  }

  const byKey = group(remote, (x) => titleKey(x.title));
  const batchKeys = new Set(rows.map((x) => titleKey(x.title)));
  const resolveKey = (k: string): string | null => {
    if (batchKeys.has(k)) return ids.get(k) ?? null;
    const m = byKey.get(k) ?? [];
    return m.length === 1 ? m[0].id : null;
  };
  const has = (deps: RemoteDep[], e: { id: string; type: EdgeType }) =>
    deps.some((d) => d.depends_on_id === e.id && (d.dep_type ?? "block") === e.type);

  for (const row of rows) {
    const r = byRow.get(row)!;
    if (!r.id || r.outcome === "missing" || r.edges === "retired") continue;
    const links = parseLinks(row.description);
    const wanted: { key: string; type: EdgeType }[] = [
      ...(links.parent ? [{ key: links.parent, type: "parent-child" as const }] : []),
      ...links.dependsOn.map((k) => ({ key: k, type: "block" as const })),
    ];
    const resolved: { id: string; type: EdgeType }[] = [];
    const unresolved: string[] = [];
    for (const w of wanted) {
      const target = resolveKey(w.key);
      if (target) resolved.push({ id: target, type: w.type });
      else unresolved.push(w.key);
    }
    if (unresolved.length) r.detail.push(`no single remote issue for: ${unresolved.join(", ")}`);
    if (!opts.apply) {
      r.edges = "unchecked";
      continue;
    }
    try {
      const existing = await api.deps(r.id);
      for (const e of resolved) {
        if (has(existing, e)) continue;
        const added = await api.addDep(r.id, e.id, e.type);
        if (!added.ok) r.detail.push(`adding ${e.type} ${e.id}: ${added.error ?? `HTTP ${added.status}`}`);
      }
      const back = await api.deps(r.id);
      const absent = resolved.filter((e) => !has(back, e));
      if (absent.length) r.detail.push(`the read-back lacks: ${absent.map((e) => `${e.type} ${e.id}`).join(", ")}`);
      if (unresolved.length || absent.length) {
        r.edges = "waiting";
        continue;
      }
      r.edges = "retired";
      await note(row, "retired", r.id);
    } catch (e) {
      r.edges = "waiting";
      r.detail.push(`edges: ${errorText(e)}`);
    }
  }
  return report;
}

export function acquireLock(file: string): () => void {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = openSync(file, "wx");
      writeFileSync(fd, String(process.pid));
      closeSync(fd);
      return () => {
        try {
          unlinkSync(file);
        } catch {
        }
      };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      const pid = Number(readFileSync(file, "utf8").trim());
      if (Number.isInteger(pid) && pid > 0 && pidAlive(pid)) throw new Error(`another dispatch holds ${file} (pid ${pid})`);
      unlinkSync(file);
    }
  }
  throw new Error(`could not take ${file}`);
}

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

export function httpApi(baseUrl: string, auth: { user: string; password: string }, timeoutMs = 30_000, fetchImpl: typeof fetch = fetch): IssuesApi {
  const base = baseUrl.replace(/\/+$/, "");
  const headers = {
    authorization: `Basic ${Buffer.from(`${auth.user}:${auth.password}`).toString("base64")}`,
    "content-type": "application/json",
  };
  const call = async (method: string, path: string, body?: unknown) => {
    const res = await fetchImpl(`${base}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { status: res.status, text, json };
  };
  const listOf = <T>(r: { status: number; text: string; json: unknown }, what: string): T[] => {
    if (r.status < 200 || r.status >= 300 || !Array.isArray(r.json)) {
      throw new Error(`${what}: HTTP ${r.status} ${r.text.slice(0, 200)}`);
    }
    return r.json as T[];
  };
  return {
    async list() {
      return listOf<RemoteIssue>(await call("GET", "/issues"), "list issues");
    },
    async create(body) {
      let r: { status: number; text: string; json: unknown };
      try {
        r = await call("POST", "/issues", body);
      } catch (e) {
        return { kind: "uncertain", status: null, error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) };
      }
      const j = (r.json ?? {}) as { id?: unknown; error?: unknown };
      if (r.status >= 200 && r.status < 300 && typeof j.id === "string" && j.id) return { kind: "created", id: j.id, status: r.status };
      const error = typeof j.error === "string" ? j.error : r.text.slice(0, 200) || "no id in the response";
      if (r.status >= 500) return { kind: "uncertain", status: r.status, error };
      return { kind: "rejected", status: r.status, error };
    },
    async deps(id) {
      return listOf<RemoteDep>(await call("GET", `/issues/${encodeURIComponent(id)}/deps`), `deps of ${id}`);
    },
    async addDep(id, dependsOnId, type) {
      try {
        const r = await call("POST", `/issues/${encodeURIComponent(id)}/deps`, { depends_on_id: dependsOnId, type });
        return { ok: r.status >= 200 && r.status < 300, status: r.status, ...(r.status >= 300 ? { error: r.text.slice(0, 200) } : {}) };
      } catch (e) {
        return { ok: false, status: null, error: e instanceof Error ? e.message : String(e) };
      }
    },
  };
}
