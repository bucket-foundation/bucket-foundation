import { mergeState, normalizeState, type EngineState } from "./engine";
import type { Card } from "./fsrs";
import { parseCardId, progressBranch, type LangCard, type LangSystem } from "./lang-systems";
import { LANG_ATOMS_VERSION, orderLog, replay, type ReviewRow } from "./replay";

export function sharedMemoryOn(value: string | undefined = process.env.NEXT_PUBLIC_POLINGUAL_SHARED_MEMORY): boolean {
  return value === "1" || value === "true";
}

export const MIGRATION = "v1";
export const BACKUP_SUFFIX = ".bak-v1";

export interface LangRow extends ReviewRow {
  system_id: string;
}

export interface LangMemory {
  lang: string;
  baseline: EngineState;
  log: LangRow[];
  migrated: typeof MIGRATION | null;
}

export function langBranch(lang: string): string {
  return `lang-${lang}`;
}

export function isLangBranch(branch: string): boolean {
  return /^lang-[a-z]{2,3}$/.test(branch);
}

export function backupBranch(branch: string): string {
  return `${branch.slice(0, 64 - BACKUP_SUFFIX.length)}${BACKUP_SUFFIX}`;
}

export function emptyMemory(lang: string): LangMemory {
  return { lang, baseline: normalizeState(null), log: [], migrated: null };
}

function isRow(r: unknown): r is LangRow {
  const x = r as Partial<LangRow> | null;
  return !!x && typeof x.review_id === "string" && typeof x.card_id === "string" && typeof x.rating === "number" && typeof x.reviewed_at === "number" && typeof x.tz === "string" && typeof x.system_id === "string";
}

export function onlyLang(state: EngineState, lang: string): EngineState {
  const out = normalizeState(state);
  out.cards = Object.fromEntries(Object.entries(out.cards).filter(([id]) => parseCardId(id).lang === lang));
  out.prof = Object.fromEntries(Object.entries(out.prof).filter(([id]) => parseCardId(id).lang === lang));
  return out;
}

export function normalizeMemory(lang: string, raw: unknown): LangMemory {
  const x = (raw && typeof raw === "object" ? raw : {}) as Partial<LangMemory>;
  return {
    lang,
    baseline: onlyLang(normalizeState(x.baseline), lang),
    log: orderLog((Array.isArray(x.log) ? x.log : []).filter(isRow).filter((r) => parseCardId(r.card_id).lang === lang)) as LangRow[],
    migrated: x.migrated === MIGRATION ? MIGRATION : null,
  };
}

export function mergeMemory(a: LangMemory, b: LangMemory): LangMemory {
  return {
    lang: a.lang,
    baseline: unionCards(a.baseline, b.baseline),
    log: orderLog([...a.log, ...b.log]) as LangRow[],
    migrated: a.migrated ?? b.migrated,
  };
}

export function withRows(m: LangMemory, rows: readonly LangRow[]): LangMemory {
  const mine = rows.filter((r) => parseCardId(r.card_id).lang === m.lang);
  return mine.length ? { ...m, log: orderLog([...m.log, ...mine]) as LangRow[] } : m;
}

function pickCard(a: Card | undefined, b: Card | undefined): Card | undefined {
  if (!a) return b;
  if (!b) return a;
  const newer = (b.lastReview || 0) > (a.lastReview || 0) ? b : a;
  const ia = (a as LangCard).introduced;
  const ib = (b as LangCard).introduced;
  const introduced = ia && ib ? (earlierDay(ia, ib) ? ia : ib) : ia ?? ib;
  const placed = !!(a as LangCard).placed && !!(b as LangCard).placed;
  const out: LangCard = { ...newer };
  if (introduced) out.introduced = introduced;
  if (placed) out.placed = true;
  else delete out.placed;
  return out;
}

function earlierDay(a: string, b: string): boolean {
  const n = (d: string) => d.split("-").map(Number);
  const [x, y] = [n(a), n(b)];
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) < (y[i] ?? 0);
  return false;
}

export function unionCards(a: EngineState, b: EngineState): EngineState {
  const out = mergeState(a, b);
  const ids = new Set([...Object.keys(a.cards), ...Object.keys(b.cards)]);
  ids.forEach((id) => {
    const c = pickCard(a.cards[id], b.cards[id]);
    if (c) out.cards[id] = c;
  });
  return out;
}

export function memoryState(m: LangMemory): EngineState {
  return onlyLang(replay(m.baseline, m.log, {}), m.lang);
}

export function migrateLang(lang: string, systems: readonly LangSystem[], oldStates: Readonly<Record<string, EngineState | null>>, existing: LangMemory | null): LangMemory {
  let baseline = existing?.baseline ?? normalizeState(null);
  for (const s of systems) {
    if (!s.targets.includes(lang)) continue;
    const old = oldStates[progressBranch(s)];
    if (old) baseline = unionCards(baseline, onlyLang(old, lang));
  }
  return { lang, baseline, log: existing?.log ?? [], migrated: MIGRATION };
}

export function maxPlacement(systems: readonly LangSystem[], lang: string): number {
  return systems.reduce((m, s) => (s.targets.includes(lang) ? Math.max(m, s.placement[lang] ?? 0) : m), 0);
}

export function planningSystem(system: LangSystem, systems: readonly LangSystem[]): LangSystem {
  const all = systems.some((s) => s.id === system.id) ? systems : [...systems, system];
  return { ...system, placement: Object.fromEntries(system.targets.map((l) => [l, maxPlacement(all, l)])) };
}

export function foldByLang(system: LangSystem, memories: Readonly<Record<string, LangMemory>>, systems: readonly LangSystem[], oldStates: Readonly<Record<string, EngineState | null>>): EngineState {
  let view = normalizeState(null);
  for (const lang of system.targets) {
    const m = memories[lang];
    let s = m ? memoryState(m) : normalizeState(null);
    for (const other of systems) {
      if (!other.targets.includes(lang)) continue;
      const old = oldStates[progressBranch(other)];
      if (old) s = unionCards(s, onlyLang(old, lang));
    }
    view = unionCards(view, s);
  }
  return view;
}

export function rollback(systems: readonly LangSystem[], memories: Readonly<Record<string, LangMemory>>, backups: Readonly<Record<string, EngineState | null>>): { branches: Record<string, EngineState>; dropped: number } {
  const rows = Object.values(memories).flatMap((m) => m.log);
  const known = new Set(systems.map((s) => s.id));
  const branches: Record<string, EngineState> = {};
  for (const s of systems) {
    const branch = progressBranch(s);
    branches[branch] = replay(backups[backupBranch(branch)] ?? null, rows.filter((r) => r.system_id === s.id), {});
  }
  return { branches, dropped: orderLog(rows).filter((r) => !known.has((r as LangRow).system_id)).length };
}

export function makeRow(systemId: string, cardId: string, rating: LangRow["rating"], reviewId: string, deviceId: string, now: number, tz: string): LangRow {
  return { review_id: reviewId, card_id: cardId, rating, level: "recall", reviewed_at: now, atoms_version: LANG_ATOMS_VERSION, device_id: deviceId, tz, system_id: systemId };
}
