import { dayKey } from "./engine";
import { memoryState, normalizeMemory } from "./lang-memory";
import { normalizeSystemsDoc, parseCardId } from "./lang-systems";
import { masteryFromStability, MASTERED_THRESHOLD, retrievability, rollupBranch, type Corpus, type CorpusAtom, type StoredCard, type StoredEngineState } from "./mastery";

export type GroupKind = "family" | "friends";
export type GroupRole = "owner" | "member";

export type CheerKind = "cheer" | "nudge";

export interface MemberLanguage {
  lang: string;
  learned: number;
  mastered: number;
  strength: number;
}

export interface MemberSubject {
  branch: string;
  title: string;
  started: number;
  mastered: number;
  strength: number;
}

export interface RecentWord {
  lang: string;
  form: string;
  gloss: string;
  learnedAt: string;
}

export interface LangSet {
  id: string;
  name: string;
  root: string;
  targets: string[];
}

export interface MemberSummary {
  streak: number;
  todayReviews: number;
  weekReviews: number;
  lastActivity: string | null;
  languages: MemberLanguage[];
  subjects: MemberSubject[];
  recentWords: RecentWord[];
  sets: LangSet[];
}

export interface GroupGoal {
  weekly: number;
  done: number;
  weekStart: string;
}

export interface Cheer {
  id: string;
  from: string;
  fromName: string;
  to: string;
  kind: CheerKind;
  at: string;
  seen: boolean;
}

export interface CheerRow {
  id: string;
  group_id: string;
  from_id: string;
  to_id: string;
  kind: CheerKind;
  created_at: string;
  seen_at: string | null;
}

export interface GraphNode {
  id: string;
  title: string;
  strength: number;
}

export interface GraphPayload {
  nodes: GraphNode[];
  edges: { from: string; to: string }[];
}

export interface Member extends MemberSummary {
  userId: string;
  name: string;
  role: GroupRole;
  isMe: boolean;
}

export interface Group {
  id: string;
  name: string;
  kind: GroupKind;
  code: string;
  role: GroupRole;
  members: Member[];
  goal: GroupGoal | null;
  cheers: Cheer[];
}

export interface GroupRow {
  id: string;
  name: string;
  kind: GroupKind;
  owner_id: string;
  invite_code: string;
  created_at: string;
  weekly_goal?: number | null;
}

export interface MemberRow {
  group_id: string;
  user_id: string;
  role: GroupRole;
  display_name: string;
  joined_at: string;
}

export interface BranchRow {
  branch: string;
  data: unknown;
}

export type CorpusLookup = (branch: string) => { corpus: Corpus; title: string } | null;
export type WordLookup = (lang: string, itemId: string) => { form: string; gloss: string } | null;

export const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const CODE_LENGTH = 10;
export const GROUP_CAP: Record<GroupKind, number> = { family: 6, friends: 30 };
export const MAX_OWNED = 10;
export const MAX_JOINED = 20;
export const MAX_WEEKLY_GOAL = 10000;
export const RECENT_WORDS = 20;
export const GRAPH_WORDS = 60;

const DAY_MS = 86_400_000;

export function generateInviteCode(random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  const bytes = random(CODE_LENGTH);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) out += CROCKFORD[bytes[i] & 31];
  return out;
}

export function normalizeInviteCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const s = input
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
  if (s.length !== CODE_LENGTH) return null;
  for (const ch of s) if (!CROCKFORD.includes(ch)) return null;
  return s;
}

function cleanText(input: unknown, max: number): string | null {
  if (typeof input !== "string") return null;
  const s = input.replace(/\s+/g, " ").trim();
  return s.length >= 1 && s.length <= max ? s : null;
}

export function normalizeGroupName(input: unknown): string | null {
  return cleanText(input, 60);
}

export function normalizeDisplayName(input: unknown): string | null {
  return cleanText(input, 40);
}

export function normalizeKind(input: unknown): GroupKind | null {
  return input === "family" || input === "friends" ? input : null;
}

export function validTimeZone(tz: unknown): string | undefined {
  if (typeof tz !== "string" || !tz || tz.length > 64) return undefined;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return undefined;
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function uuidOrNull(input: unknown): string | null {
  return typeof input === "string" && UUID_RE.test(input) ? input.toLowerCase() : null;
}

export function normalizeWeeklyGoal(input: unknown): number | null {
  return typeof input === "number" && Number.isInteger(input) && input >= 0 && input <= MAX_WEEKLY_GOAL ? input : null;
}

export function normalizeCheerKind(input: unknown): CheerKind | null {
  return input === "cheer" || input === "nudge" ? input : null;
}

export type JoinDecision = "already" | "full" | "joined_limit" | "ok";

export function joinDecision(kind: GroupKind, members: readonly MemberRow[], uid: string, groupsJoined: number): JoinDecision {
  if (members.some((m) => m.user_id === uid)) return "already";
  if (members.length >= GROUP_CAP[kind]) return "full";
  if (groupsJoined >= MAX_JOINED) return "joined_limit";
  return "ok";
}

function byJoined(a: MemberRow, b: MemberRow): number {
  return a.joined_at < b.joined_at ? -1 : a.joined_at > b.joined_at ? 1 : a.user_id < b.user_id ? -1 : a.user_id > b.user_id ? 1 : 0;
}

export type RemoveDecision = "ok" | "forbidden" | "self" | "not_member";

export function removeDecision(members: readonly MemberRow[], ownerId: string, actor: string, target: string): RemoveDecision {
  if (actor !== ownerId) return "forbidden";
  if (target === actor) return "self";
  return members.some((m) => m.user_id === target) ? "ok" : "not_member";
}

function asState(data: unknown): StoredEngineState | null {
  return data && typeof data === "object" ? (data as StoredEngineState) : null;
}

export function liveStreak(stats: StoredEngineState["stats"], now: number, tz?: string): number {
  const last = stats?.lastStudyDay;
  const today = dayKey(now, tz);
  return last && (last === today || last === shiftDay(today, -1)) ? stats?.streak || 0 : 0;
}

function dayCount(stats: StoredEngineState["stats"], key: string): number {
  const h = stats?.history?.[key];
  return (h?.new || 0) + (h?.reviews || 0);
}

function isoDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function shiftDay(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.getUTCFullYear() + "-" + (t.getUTCMonth() + 1) + "-" + t.getUTCDate();
}

export function currentWeek(now: number, tz?: string): { weekStart: string; keys: string[] } {
  const today = dayKey(now, tz);
  const [y, m, d] = today.split("-").map(Number);
  const sinceMonday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  const keys: string[] = [];
  for (let i = 0; i <= sinceMonday; i++) keys.push(shiftDay(today, -i));
  return { weekStart: isoDay(keys[keys.length - 1]), keys };
}

export function cardStrength(card: StoredCard | undefined, now: number): number {
  if (!card || card.lastReview == null || !card.stability) return 0;
  return retrievability(Math.max(0, (now - card.lastReview) / DAY_MS), card.stability);
}

function mean(xs: number[]): number {
  return xs.length ? +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(3) : 0;
}

function langMemoryState(lang: string, data: unknown): StoredEngineState {
  const m = normalizeMemory(lang, data);
  try {
    return memoryState(m);
  } catch {
    return m.baseline;
  }
}

type LangCardRef = StoredCard & { introduced?: string };

function newer(a: LangCardRef | undefined, b: LangCardRef): LangCardRef {
  return !a || (b.lastReview || 0) > (a.lastReview || 0) ? b : a;
}

interface ParsedRows {
  states: StoredEngineState[];
  langCards: Map<string, Map<string, LangCardRef>>;
  subjects: { branch: string; state: StoredEngineState; corpus: Corpus; title: string }[];
  sets: LangSet[];
}

function parseRows(rows: readonly BranchRow[], lookup: CorpusLookup): ParsedRows {
  const out: ParsedRows = { states: [], langCards: new Map(), subjects: [], sets: [] };
  const addLangCards = (state: StoredEngineState, only?: string) => {
    for (const [id, card] of Object.entries(state.cards || {})) {
      const { lang, itemId } = parseCardId(id);
      if (!lang || (only && lang !== only)) continue;
      const m = out.langCards.get(lang) ?? new Map<string, LangCardRef>();
      m.set(itemId, newer(m.get(itemId), card as LangCardRef));
      out.langCards.set(lang, m);
    }
  };
  for (const row of rows) {
    const b = row.branch;
    if (b.endsWith(".bak-v1")) continue;
    if (b === "lang-systems") {
      const doc = normalizeSystemsDoc(row.data);
      out.sets = doc.systems
        .filter((s) => (doc.removed[s.id] ?? -1) < (s.updatedAt ?? s.createdAt ?? 0))
        .map((s) => ({ id: s.id, name: s.name, root: s.root, targets: Array.isArray(s.targets) ? s.targets : [] }));
      continue;
    }
    const memory = /^lang-([a-z]{2,3})$/.exec(b);
    if (memory) {
      const state = langMemoryState(memory[1], row.data);
      out.states.push(state);
      addLangCards(state, memory[1]);
      continue;
    }
    const state = asState(row.data);
    if (!state) continue;
    if (b.startsWith("lang-sys-")) {
      out.states.push(state);
      addLangCards(state);
      continue;
    }
    if (b.startsWith("lang-")) continue;
    const found = lookup(b);
    if (!found || found.corpus.meta?.kind === "language" || !found.corpus.atoms?.length) continue;
    out.states.push(state);
    out.subjects.push({ branch: b, state, corpus: found.corpus, title: found.title });
  }
  return out;
}

function learned(card: StoredCard): boolean {
  return (card.reps || 0) > 0;
}

export function recentWords(langCards: ReadonlyMap<string, ReadonlyMap<string, LangCardRef>>, words: WordLookup, limit = RECENT_WORDS): RecentWord[] {
  const all: (RecentWord & { order: string; last: number })[] = [];
  langCards.forEach((cards, lang) =>
    cards.forEach((c, itemId) => {
      if (!learned(c)) return;
      const w = words(lang, itemId);
      if (!w) return;
      const learnedAt = c.introduced ? isoDay(c.introduced) : c.lastReview ? new Date(c.lastReview).toISOString().slice(0, 10) : "";
      all.push({ lang, form: w.form, gloss: w.gloss, learnedAt, order: learnedAt, last: c.lastReview || 0 });
    })
  );
  all.sort((a, b) => (a.order < b.order ? 1 : a.order > b.order ? -1 : b.last - a.last));
  return all.slice(0, limit).map(({ lang, form, gloss, learnedAt }) => ({ lang, form, gloss, learnedAt }));
}

export function memberSummary(rows: readonly BranchRow[], lookup: CorpusLookup, now: number = Date.now(), tz?: string, words: WordLookup = () => null): MemberSummary {
  const parsed = parseRows(rows, lookup);
  const week = currentWeek(now, tz);
  let lastMs = 0;
  for (const s of parsed.states) for (const c of Object.values(s.cards || {})) if ((c.lastReview || 0) > lastMs) lastMs = c.lastReview || 0;

  const languages: MemberLanguage[] = [];
  parsed.langCards.forEach((cards, lang) => {
    let mastered = 0;
    const strengths: number[] = [];
    cards.forEach((c) => {
      if (learned(c)) strengths.push(cardStrength(c, now));
      if (masteryFromStability(c.stability) >= MASTERED_THRESHOLD) mastered++;
    });
    if (strengths.length > 0 || mastered > 0) languages.push({ lang, learned: strengths.length, mastered, strength: mean(strengths) });
  });
  languages.sort((a, b) => b.learned - a.learned || a.lang.localeCompare(b.lang));

  const subjects: MemberSubject[] = [];
  for (const sub of parsed.subjects) {
    const sum = rollupBranch(sub.branch, sub.corpus, sub.state, now);
    if (sum.started === 0) continue;
    const cards = sub.state.cards || {};
    const strength = mean((sub.corpus.atoms || []).filter((a) => cards[a.id]).map((a) => cardStrength(cards[a.id], now)));
    subjects.push({ branch: sub.branch, title: sub.title || sum.title, started: sum.started, mastered: sum.mastered, strength });
  }
  subjects.sort((a, b) => b.started - a.started || a.branch.localeCompare(b.branch));

  const today = dayKey(now, tz);
  return {
    streak: parsed.states.reduce((m, s) => Math.max(m, liveStreak(s.stats, now, tz)), 0),
    todayReviews: parsed.states.reduce((n, s) => n + dayCount(s.stats, today), 0),
    weekReviews: parsed.states.reduce((n, s) => n + week.keys.reduce((k, key) => k + dayCount(s.stats, key), 0), 0),
    lastActivity: lastMs > 0 ? new Date(lastMs).toISOString() : null,
    languages,
    subjects,
    recentWords: recentWords(parsed.langCards, words),
    sets: parsed.sets,
  };
}

export function branchGraph(corpus: Corpus, state: StoredEngineState | null, now: number): GraphPayload {
  const atoms = (corpus.atoms || []) as (CorpusAtom & { requires?: string[] })[];
  const cards = state?.cards || {};
  const ids = new Set(atoms.map((a) => a.id));
  const nodes = atoms.map((a) => ({ id: a.id, title: a.title || a.gloss || a.id, strength: +cardStrength(cards[a.id], now).toFixed(3) }));
  const edges: GraphPayload["edges"] = [];
  for (const a of atoms) for (const r of a.requires ?? []) if (ids.has(r) && r !== a.id) edges.push({ from: r, to: a.id });
  return { nodes, edges };
}

export function languageGraph(cards: ReadonlyMap<string, LangCardRef>, lang: string, words: WordLookup, now: number, limit = GRAPH_WORDS): GraphPayload {
  const nodes: (GraphNode & { reps: number })[] = [];
  cards.forEach((c, itemId) => {
    if (!learned(c)) return;
    nodes.push({ id: itemId, title: words(lang, itemId)?.form ?? itemId, strength: +cardStrength(c, now).toFixed(3), reps: c.reps || 0 });
  });
  nodes.sort((a, b) => b.strength - a.strength || b.reps - a.reps || a.id.localeCompare(b.id));
  return { nodes: nodes.slice(0, limit).map(({ id, title, strength }) => ({ id, title, strength })), edges: [] };
}

export function memberGraph(rows: readonly BranchRow[], branch: string, lookup: CorpusLookup, words: WordLookup, now: number = Date.now()): GraphPayload | null {
  const lang = /^lang-([a-z]{2,3})$/.exec(branch)?.[1];
  if (lang) return languageGraph(parseRows(rows, lookup).langCards.get(lang) ?? new Map(), lang, words, now);
  const found = lookup(branch);
  if (!found || found.corpus.meta?.kind === "language" || !found.corpus.atoms?.length) return null;
  return branchGraph(found.corpus, asState(rows.find((r) => r.branch === branch)?.data), now);
}

export type CheerDecision = "ok" | "self" | "not_member" | "nudge_not_needed";

export function cheerDecision(
  members: readonly MemberRow[],
  from: string,
  to: string,
  kind: CheerKind,
  recipientTodayReviews: number
): CheerDecision {
  if (from === to) return "self";
  if (!members.some((m) => m.user_id === from) || !members.some((m) => m.user_id === to)) return "not_member";
  if (kind === "nudge" && recipientTodayReviews > 0) return "nudge_not_needed";
  return "ok";
}

export function toCheer(row: CheerRow, members: readonly MemberRow[]): Cheer {
  const sender = members.find((m) => m.group_id === row.group_id && m.user_id === row.from_id);
  return { id: row.id, from: row.from_id, fromName: sender?.display_name ?? "", to: row.to_id, kind: row.kind, at: row.created_at, seen: row.seen_at != null };
}

export function cheersFor(groupId: string, rows: readonly CheerRow[], members: readonly MemberRow[], me: string, limit = 50): Cheer[] {
  return rows
    .filter((r) => r.group_id === groupId && (r.to_id === me || r.from_id === me))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0))
    .slice(0, limit)
    .map((r) => toCheer(r, members));
}

export function groupGoal(weekly: number | null | undefined, weekReviews: readonly number[], weekStart: string): GroupGoal | null {
  if (!weekly || weekly <= 0) return null;
  return { weekly, done: weekReviews.reduce((a, b) => a + b, 0), weekStart };
}

const EMPTY_SUMMARY: MemberSummary = { streak: 0, todayReviews: 0, weekReviews: 0, lastActivity: null, languages: [], subjects: [], recentWords: [], sets: [] };

export function assembleGroup(
  group: GroupRow,
  members: readonly MemberRow[],
  summaries: ReadonlyMap<string, MemberSummary>,
  me: string,
  cheers: readonly CheerRow[] = [],
  weekStart = ""
): Group {
  const sorted = members.filter((m) => m.group_id === group.id).sort((a, b) => Number(b.user_id === group.owner_id) - Number(a.user_id === group.owner_id) || byJoined(a, b));
  const list: Member[] = sorted.map((m) => ({
    userId: m.user_id,
    name: m.display_name,
    role: m.user_id === group.owner_id ? "owner" : "member",
    isMe: m.user_id === me,
    ...(summaries.get(m.user_id) ?? EMPTY_SUMMARY),
  }));
  return {
    id: group.id,
    name: group.name,
    kind: group.kind,
    code: group.invite_code,
    role: group.owner_id === me ? "owner" : "member",
    members: list,
    goal: groupGoal(group.weekly_goal, list.map((m) => m.weekReviews), weekStart),
    cheers: cheersFor(group.id, cheers, members, me),
  };
}

export function groupPreview(group: GroupRow, members: readonly MemberRow[]): { name: string; kind: GroupKind; members: number; owner: string } {
  const owner = members.find((m) => m.user_id === group.owner_id);
  return { name: group.name, kind: group.kind, members: members.length, owner: owner?.display_name ?? "" };
}

export function visibleGroupIds(memberships: readonly MemberRow[], requested?: readonly string[]): string[] {
  const mine = Array.from(new Set(memberships.map((m) => m.group_id)));
  return requested ? mine.filter((id) => requested.includes(id)) : mine;
}

export async function fetchAllPages<T>(page: (from: number, to: number) => Promise<T[]>, size = 1000, maxPages = 200): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < maxPages; i++) {
    const rows = await page(i * size, (i + 1) * size - 1);
    out.push(...rows);
    if (rows.length < size) return out;
  }
  throw new Error("fetchAllPages: too many pages");
}

export const PREVIEW_PER_MINUTE = 30;
export const JOIN_PER_MINUTE = 10;

export function windowLimiter(max: number, windowMs: number, clock: () => number = Date.now, maxKeys = 10_000): (key: string) => boolean {
  const hits = new Map<string, number[]>();
  return (key) => {
    const now = clock();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    const limited = recent.length >= max;
    if (!limited) recent.push(now);
    hits.delete(key);
    hits.set(key, recent);
    if (hits.size > maxKeys) hits.delete(hits.keys().next().value as string);
    return limited;
  };
}
