import { dayKey } from "./engine";
import { memoryState, normalizeMemory } from "./lang-memory";
import { parseCardId } from "./lang-systems";
import { masteryFromStability, MASTERED_THRESHOLD, rollupBranch, type Corpus, type StoredCard, type StoredEngineState } from "./mastery";

export type GroupKind = "family" | "friends";
export type GroupRole = "owner" | "member";

export interface MemberLanguage {
  lang: string;
  learned: number;
  mastered: number;
}

export interface MemberSubject {
  branch: string;
  title: string;
  started: number;
  mastered: number;
}

export interface MemberSummary {
  streak: number;
  todayReviews: number;
  lastActivity: string | null;
  languages: MemberLanguage[];
  subjects: MemberSubject[];
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
}

export interface GroupRow {
  id: string;
  name: string;
  kind: GroupKind;
  owner_id: string;
  invite_code: string;
  created_at: string;
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

export const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const CODE_LENGTH = 10;
export const GROUP_CAP: Record<GroupKind, number> = { family: 6, friends: 30 };
export const MAX_OWNED = 10;
export const MAX_JOINED = 20;

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

export type JoinDecision = "already" | "full" | "joined_limit" | "ok";

export function joinDecision(kind: GroupKind, members: readonly MemberRow[], uid: string, groupsJoined: number): JoinDecision {
  if (members.some((m) => m.user_id === uid)) return "already";
  if (members.length >= GROUP_CAP[kind]) return "full";
  if (groupsJoined >= MAX_JOINED) return "joined_limit";
  return "ok";
}

export type LeavePlan = { action: "delete" } | { action: "leave"; newOwner: string | null } | { action: "not_member" };

function byJoined(a: MemberRow, b: MemberRow): number {
  return a.joined_at < b.joined_at ? -1 : a.joined_at > b.joined_at ? 1 : a.user_id < b.user_id ? -1 : a.user_id > b.user_id ? 1 : 0;
}

export function leavePlan(members: readonly MemberRow[], ownerId: string, uid: string): LeavePlan {
  if (!members.some((m) => m.user_id === uid)) return { action: "not_member" };
  const rest = members.filter((m) => m.user_id !== uid).sort(byJoined);
  if (rest.length === 0) return { action: "delete" };
  return { action: "leave", newOwner: uid === ownerId ? rest[0].user_id : null };
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
  return last && (last === dayKey(now, tz) || last === dayKey(now - DAY_MS, tz)) ? stats?.streak || 0 : 0;
}

function todayCount(stats: StoredEngineState["stats"], now: number, tz?: string): number {
  const h = stats?.history?.[dayKey(now, tz)];
  return (h?.new || 0) + (h?.reviews || 0);
}

function langMemoryState(lang: string, data: unknown): StoredEngineState {
  const m = normalizeMemory(lang, data);
  try {
    return memoryState(m);
  } catch {
    return m.baseline;
  }
}

function newer(a: StoredCard | undefined, b: StoredCard): StoredCard {
  return !a || (b.lastReview || 0) > (a.lastReview || 0) ? b : a;
}

export function memberSummary(rows: readonly BranchRow[], lookup: CorpusLookup, now: number = Date.now(), tz?: string): MemberSummary {
  const states: StoredEngineState[] = [];
  const langCards = new Map<string, Map<string, StoredCard>>();
  const subjects: MemberSubject[] = [];
  let lastMs = 0;

  const addLangCards = (state: StoredEngineState, only?: string) => {
    for (const [id, card] of Object.entries(state.cards || {})) {
      const { lang, itemId } = parseCardId(id);
      if (!lang || (only && lang !== only)) continue;
      const m = langCards.get(lang) ?? new Map<string, StoredCard>();
      m.set(itemId, newer(m.get(itemId), card));
      langCards.set(lang, m);
    }
  };

  for (const row of rows) {
    const b = row.branch;
    if (b.endsWith(".bak-v1") || b === "lang-systems") continue;
    const memory = /^lang-([a-z]{2,3})$/.exec(b);
    if (memory) {
      const state = langMemoryState(memory[1], row.data);
      states.push(state);
      addLangCards(state, memory[1]);
      continue;
    }
    const state = asState(row.data);
    if (!state) continue;
    if (b.startsWith("lang-sys-")) {
      states.push(state);
      addLangCards(state);
      continue;
    }
    if (b.startsWith("lang-")) continue;
    const found = lookup(b);
    if (!found || found.corpus.meta?.kind === "language" || !found.corpus.atoms?.length) continue;
    states.push(state);
    const sum = rollupBranch(b, found.corpus, state, now);
    if (sum.started > 0) subjects.push({ branch: b, title: found.title || sum.title, started: sum.started, mastered: sum.mastered });
  }

  for (const s of states) for (const c of Object.values(s.cards || {})) if ((c.lastReview || 0) > lastMs) lastMs = c.lastReview || 0;

  const languages: MemberLanguage[] = [];
  langCards.forEach((cards, lang) => {
    let learned = 0;
    let mastered = 0;
    cards.forEach((c) => {
      if ((c.reps || 0) > 0) learned++;
      if (masteryFromStability(c.stability) >= MASTERED_THRESHOLD) mastered++;
    });
    if (learned > 0 || mastered > 0) languages.push({ lang, learned, mastered });
  });
  languages.sort((a, b) => b.learned - a.learned || a.lang.localeCompare(b.lang));
  subjects.sort((a, b) => b.started - a.started || a.branch.localeCompare(b.branch));

  return {
    streak: states.reduce((m, s) => Math.max(m, liveStreak(s.stats, now, tz)), 0),
    todayReviews: states.reduce((n, s) => n + todayCount(s.stats, now, tz), 0),
    lastActivity: lastMs > 0 ? new Date(lastMs).toISOString() : null,
    languages,
    subjects,
  };
}

const EMPTY_SUMMARY: MemberSummary = { streak: 0, todayReviews: 0, lastActivity: null, languages: [], subjects: [] };

export function assembleGroup(group: GroupRow, members: readonly MemberRow[], summaries: ReadonlyMap<string, MemberSummary>, me: string): Group {
  const sorted = members.filter((m) => m.group_id === group.id).sort((a, b) => Number(b.user_id === group.owner_id) - Number(a.user_id === group.owner_id) || byJoined(a, b));
  return {
    id: group.id,
    name: group.name,
    kind: group.kind,
    code: group.invite_code,
    role: group.owner_id === me ? "owner" : "member",
    members: sorted.map((m) => ({
      userId: m.user_id,
      name: m.display_name,
      role: m.user_id === group.owner_id ? "owner" : "member",
      isMe: m.user_id === me,
      ...(summaries.get(m.user_id) ?? EMPTY_SUMMARY),
    })),
  };
}

export function groupPreview(group: GroupRow, members: readonly MemberRow[]): { name: string; kind: GroupKind; members: number; owner: string } {
  const owner = members.find((m) => m.user_id === group.owner_id);
  return { name: group.name, kind: group.kind, members: members.length, owner: owner?.display_name ?? "" };
}
