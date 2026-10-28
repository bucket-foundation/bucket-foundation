import { mergeState, normalizeState, type EngineState } from "./engine";
import type { Rating } from "./fsrs";
import { backupBranch, emptyMemory, foldByLang, langBranch, makeRow, memoryState, mergeMemory, migrateLang, normalizeMemory, planningSystem, withRows, type LangMemory, type LangRow } from "./lang-memory";
import { applyPlacement, cardId, progressBranch, type LangCorpus, type LangSystem } from "./lang-systems";
import { LS_BASE, pullServer, webProgressStore, type ServerBranches } from "./progress-store";

export interface MemoryIO {
  pull(): Promise<ServerBranches | null>;
  readRaw(branch: string): unknown;
  writeRaw(branch: string, data: unknown): void;
  push(branch: string, data: unknown): Promise<boolean>;
  readOutbox(): LangRow[];
  writeOutbox(rows: LangRow[]): void;
  uuid(): string;
  deviceId(): string;
  tz(): string;
  now(): number;
  appendReview?(branch: string, review: Pick<LangRow, "review_id" | "card_id" | "rating" | "level" | "reviewed_at" | "tz" | "atoms_version">): unknown;
}

export type LangLoadStatus = "ready" | "error";

export interface SharedSession {
  system: LangSystem;
  plan: LangSystem;
  systems: LangSystem[];
  memories: Record<string, LangMemory>;
  langStatus: Record<string, LangLoadStatus>;
  oldStates: Record<string, EngineState | null>;
  view: EngineState;
}

function stateOf(raw: unknown): EngineState | null {
  return raw && typeof raw === "object" ? normalizeState(raw) : null;
}

function peek(io: MemoryIO, server: ServerBranches | null, branch: string): EngineState | null {
  const local = stateOf(io.readRaw(branch));
  const remote = stateOf(server?.[branch]?.data);
  return local || remote ? mergeState(local, remote) : null;
}

async function loadLang(io: MemoryIO, lang: string, systems: LangSystem[], server: ServerBranches | null, oldStates: Record<string, EngineState | null>): Promise<LangMemory> {
  const branch = langBranch(lang);
  const remote = normalizeMemory(lang, server?.[branch]?.data);
  let m = mergeMemory(normalizeMemory(lang, io.readRaw(branch)), remote);
  if (!m.migrated) {
    for (const s of systems) {
      if (!s.targets.includes(lang)) continue;
      const old = oldStates[progressBranch(s)];
      const bak = backupBranch(progressBranch(s));
      if (!old || server?.[bak]) continue;
      const copy = io.readRaw(bak) ?? old;
      io.writeRaw(bak, copy);
      if (!(await io.push(bak, copy))) throw new Error(`backup ${bak} did not reach the server`);
    }
    m = migrateLang(lang, systems, oldStates, m);
  }
  m = withRows(m, io.readOutbox());
  await persist(io, m, JSON.stringify(remote) !== JSON.stringify(m));
  return m;
}

async function persist(io: MemoryIO, mine: LangMemory, push: boolean): Promise<boolean> {
  const branch = langBranch(mine.lang);
  io.writeRaw(branch, mine);
  if (!push) return true;
  const latest = await io.pull();
  if (!latest) return false;
  const m = latest[branch] ? mergeMemory(mine, normalizeMemory(mine.lang, latest[branch].data)) : mine;
  io.writeRaw(branch, m);
  const ok = await io.push(branch, m);
  if (ok) {
    const sent = new Set(m.log.map((r) => r.review_id));
    io.writeOutbox(io.readOutbox().filter((r) => !sent.has(r.review_id)));
  }
  return ok;
}

export async function openShared(io: MemoryIO, system: LangSystem, systems: LangSystem[], server?: ServerBranches | null): Promise<SharedSession> {
  const srv = server === undefined ? await io.pull() : server;
  const oldStates: Record<string, EngineState | null> = {};
  for (const s of systems) if (s.targets.some((l) => system.targets.includes(l))) oldStates[progressBranch(s)] = peek(io, srv, progressBranch(s));
  const settled = await Promise.allSettled(system.targets.map((l) => loadLang(io, l, systems, srv, oldStates)));
  const memories: Record<string, LangMemory> = {};
  const langStatus: Record<string, LangLoadStatus> = {};
  settled.forEach((r, i) => {
    const lang = system.targets[i];
    langStatus[lang] = r.status === "fulfilled" ? "ready" : "error";
    if (r.status === "fulfilled") memories[lang] = r.value;
  });
  return refold({ system, plan: planningSystem(system, systems), systems, memories, langStatus, oldStates, view: normalizeState(null) });
}

function refold(s: SharedSession): SharedSession {
  return { ...s, view: foldByLang(s.system, s.memories, s.systems, s.oldStates) };
}

export function gradeShared(io: MemoryIO, s: SharedSession, lang: string, itemId: string, rating: Rating): { session: SharedSession; saved: Promise<boolean> } {
  const row = makeRow(s.system.id, cardId(lang, itemId), rating, io.uuid(), io.deviceId(), io.now(), io.tz());
  io.writeOutbox([...io.readOutbox(), row]);
  io.appendReview?.(langBranch(lang), { review_id: row.review_id, card_id: row.card_id, rating: row.rating, level: row.level, reviewed_at: row.reviewed_at, tz: row.tz, atoms_version: row.atoms_version });
  if (s.langStatus[lang] !== "ready") return { session: s, saved: Promise.resolve(false) };
  const m = withRows(s.memories[lang] ?? emptyMemory(lang), [row]);
  const session = refold({ ...s, memories: { ...s.memories, [lang]: m } });
  return { session, saved: persist(io, m, true) };
}

export function placeShared(io: MemoryIO, s: SharedSession, corpus: LangCorpus, lang: string, tier: number, only?: string[], level?: string): { session: SharedSession; system: LangSystem; saved: Promise<boolean> } {
  const kept = Math.max(tier, s.plan.placement[lang] ?? 0);
  const system = { ...s.system, placement: { ...s.system.placement, [lang]: kept }, ...(level ? { levels: { ...s.system.levels, [lang]: level } } : {}) };
  const systems = s.systems.map((x) => (x.id === system.id ? system : x));
  if (s.langStatus[lang] !== "ready") return { session: { ...s, system, systems, plan: planningSystem(system, systems) }, system, saved: Promise.resolve(false) };
  const m0 = s.memories[lang] ?? emptyMemory(lang);
  const full = memoryState(m0);
  const placed = applyPlacement(full, system, corpus, lang, kept, io.now(), only ? new Set(only) : undefined);
  const baseline = normalizeState(m0.baseline);
  for (const [id, c] of Object.entries(placed.cards)) if (!full.cards[id]) baseline.cards[id] = c;
  const m = { ...m0, baseline };
  const session = refold({ ...s, system, systems, plan: planningSystem(system, systems), memories: { ...s.memories, [lang]: m } });
  return { session, system, saved: persist(io, m, true) };
}

const OUTBOX = `${LS_BASE}/outbox/lang-reviews`;
const DEVICE = `${LS_BASE}/device-id`;

function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  const h = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16));
  h[12] = "4";
  h[16] = "89ab"[Math.floor(Math.random() * 4)];
  const x = h.join("");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

export const browserMemoryIO: MemoryIO = {
  pull: pullServer,
  readRaw(branch) {
    const raw = lsGet(`${LS_BASE}/${branch}`);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  writeRaw(branch, data) {
    lsSet(`${LS_BASE}/${branch}`, JSON.stringify(data));
  },
  async push(branch, data) {
    try {
      const res = await fetch("/api/academy/progress", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ branch, data }) });
      return res.ok;
    } catch {
      return false;
    }
  },
  readOutbox() {
    try {
      const rows = JSON.parse(lsGet(OUTBOX) ?? "[]");
      return Array.isArray(rows) ? rows : [];
    } catch {
      return [];
    }
  },
  writeOutbox(rows) {
    lsSet(OUTBOX, JSON.stringify(rows));
  },
  uuid: newId,
  deviceId() {
    let id = lsGet(DEVICE);
    if (!id) {
      id = newId();
      lsSet(DEVICE, id);
    }
    return id;
  },
  tz() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  },
  now: () => Date.now(),
  appendReview(branch, review) {
    return webProgressStore.appendReview?.(branch, review);
  },
};
