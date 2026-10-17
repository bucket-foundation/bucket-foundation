import { DAY_MS, FSRS, type Card, type Rating } from "./fsrs";
import { dayKey, grade, makeFsrs, normalizeState, type EngineState } from "./engine";

export interface LangInfo {
  name: string;
  bcp47: string;
  latin: boolean;
}

export const LANGS: Record<string, LangInfo> = {
  en: { name: "English", bcp47: "en-US", latin: true },
  es: { name: "Spanish", bcp47: "es-ES", latin: true },
  fr: { name: "French", bcp47: "fr-FR", latin: true },
  it: { name: "Italian", bcp47: "it-IT", latin: true },
  pt: { name: "Portuguese", bcp47: "pt-PT", latin: true },
  de: { name: "German", bcp47: "de-DE", latin: true },
  nl: { name: "Dutch", bcp47: "nl-NL", latin: true },
  sv: { name: "Swedish", bcp47: "sv-SE", latin: true },
  pl: { name: "Polish", bcp47: "pl-PL", latin: true },
  fi: { name: "Finnish", bcp47: "fi-FI", latin: true },
  ru: { name: "Russian", bcp47: "ru-RU", latin: false },
  el: { name: "Greek", bcp47: "el-GR", latin: false },
  ar: { name: "Arabic", bcp47: "ar-SA", latin: false },
  hi: { name: "Hindi", bcp47: "hi-IN", latin: false },
  ja: { name: "Japanese", bcp47: "ja-JP", latin: false },
  zh: { name: "Mandarin", bcp47: "zh-CN", latin: false },
  ko: { name: "Korean", bcp47: "ko-KR", latin: false },
};

export const LANG_CODES = Object.keys(LANGS);
export const MAX_TARGETS = 6;
export const NEW_PER_LANG_PER_DAY = 5;
export const PLACEMENT_TIERS = [0, 2, 4, 6, 8, 10];

export const PRESETS: { name: string; targets: string[] }[] = [
  { name: "Romance", targets: ["fr", "es", "it"] },
  { name: "East Asian", targets: ["zh", "ja"] },
  { name: "Germanic", targets: ["de", "nl", "sv"] },
  { name: "Iberian", targets: ["es", "pt"] },
];

export interface LangSystem {
  id: string;
  name: string;
  root: string;
  targets: string[];
  createdAt: number;
  placement: Record<string, number>;
}

export interface LangItem {
  id: string;
  kind: "word" | "phrase";
  tier: number;
  category: string;
  gloss: string;
  forms: Record<string, string>;
  ipa: Record<string, string>;
  root: string | null;
  cognateLangs: string[];
  note?: string;
  example: Record<string, string>;
}

export interface LangCorpus {
  items: LangItem[];
  byId: Map<string, LangItem>;
  attribution: string;
}

export interface LangCard extends Card {
  introduced?: string;
  placed?: boolean;
}

interface RawCoreAtom {
  id: string;
  gloss?: string;
  category?: string;
  tier?: number;
  forms?: Record<string, { word?: string; ipa?: string }>;
  note?: string;
  example?: Record<string, string>;
}
interface RawConcept {
  root?: string | null;
  cognateLangs?: string[];
  forms?: Record<string, { word?: string; ipa?: string; cognate?: boolean }>;
}
interface RawPhrase {
  id: string;
  en?: string;
  category?: string;
  forms?: Record<string, string>;
}

const PHRASE_TIER: Record<string, number> = {
  greeting: 1,
  courtesy: 1,
  intro: 3,
  basics: 4,
  smalltalk: 5,
  survival: 6,
  dining: 7,
  shopping: 7,
  direction: 8,
  time: 8,
};

export function buildLangCorpus(
  core: { atoms?: RawCoreAtom[]; meta?: { license?: string } } | null,
  cognates: { concepts?: Record<string, RawConcept>; meta?: { attribution?: string } } | null,
  phrases: { phrases?: RawPhrase[] } | null
): LangCorpus {
  const concepts = cognates?.concepts ?? {};
  const items: LangItem[] = [];
  for (const a of core?.atoms ?? []) {
    const c = concepts[a.id];
    const forms: Record<string, string> = {};
    const ipa: Record<string, string> = {};
    for (const [l, f] of Object.entries(a.forms ?? {})) {
      if (f?.word) forms[l] = f.word;
      const i = f?.ipa || c?.forms?.[l]?.ipa;
      if (i && l === "en") ipa[l] = i;
    }
    const cognateLangs = (c?.cognateLangs ?? []).filter((l) => forms[l]);
    items.push({
      id: a.id,
      kind: "word",
      tier: a.tier ?? 0,
      category: a.category ?? "word",
      gloss: a.gloss ?? a.id,
      forms,
      ipa,
      root: c?.root && cognateLangs.length >= 2 ? c.root : null,
      cognateLangs: cognateLangs.length >= 2 ? cognateLangs : [],
      note: a.note,
      example: { ...(a.example ?? {}) },
    });
  }
  for (const p of phrases?.phrases ?? []) {
    items.push({
      id: `ph-${p.id}`,
      kind: "phrase",
      tier: PHRASE_TIER[p.category ?? ""] ?? 5,
      category: p.category ?? "phrase",
      gloss: p.en ?? p.forms?.en ?? p.id,
      forms: { ...(p.forms ?? {}) },
      ipa: {},
      root: null,
      cognateLangs: [],
      example: {},
    });
  }
  items.sort((x, y) => x.tier - y.tier || (x.kind === y.kind ? 0 : x.kind === "word" ? -1 : 1));
  return {
    items,
    byId: new Map(items.map((i) => [i.id, i])),
    attribution: cognates?.meta?.attribution ?? "Language data from Wiktionary contributors via Kaikki (kaikki.org), CC-BY-SA 3.0.",
  };
}

export function langName(code: string): string {
  return LANGS[code]?.name ?? code;
}

export function systemName(root: string, targets: string[]): string {
  const preset = PRESETS.find((p) => p.targets.length === targets.length && p.targets.every((t) => targets.includes(t)));
  if (preset) return `${preset.name} from ${langName(root)}`;
  return `${targets.map(langName).join(" + ")} from ${langName(root)}`;
}

export type SystemError = "no-targets" | "too-many" | "unknown-language" | "root-in-targets" | "duplicate";

export function validateSystem(root: string, targets: string[], existing: LangSystem[] = []): SystemError | null {
  const t = Array.from(new Set(targets));
  if (t.length === 0) return "no-targets";
  if (t.length > MAX_TARGETS) return "too-many";
  if (!LANGS[root] || t.some((x) => !LANGS[x])) return "unknown-language";
  if (t.includes(root)) return "root-in-targets";
  const key = [...t].sort().join(",");
  if (existing.some((s) => s.root === root && [...s.targets].sort().join(",") === key)) return "duplicate";
  return null;
}

export function createSystem(root: string, targets: string[], existing: LangSystem[] = [], now: number = Date.now()): LangSystem {
  const err = validateSystem(root, targets, existing);
  if (err) throw new Error(err);
  const t = Array.from(new Set(targets));
  let id = `${root}-${t.join("-")}`;
  let n = 2;
  while (existing.some((s) => s.id === id)) id = `${root}-${t.join("-")}-${n++}`;
  return { id, name: systemName(root, t), root, targets: t, createdAt: now, placement: {} };
}

export function progressBranch(system: LangSystem): string {
  return `lang-sys-${system.id}`.slice(0, 64);
}

export function cardId(lang: string, itemId: string): string {
  return `${lang}:${itemId}`;
}

export function parseCardId(id: string): { lang: string; itemId: string } {
  const i = id.indexOf(":");
  return i < 0 ? { lang: "", itemId: id } : { lang: id.slice(0, i), itemId: id.slice(i + 1) };
}

export function usable(item: LangItem, root: string, lang: string): boolean {
  return !!item.forms[root] && !!item.forms[lang];
}

export function sharedRootLangs(item: LangItem, system: LangSystem): string[] {
  if (!item.root) return [];
  const pool = new Set([system.root, ...system.targets]);
  return item.cognateLangs.filter((l) => pool.has(l));
}

export function normalizeAnswer(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[¿¡!?.,;:"'«»()。、！？]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[m][n];
}

export type Verdict = "exact" | "close" | "wrong";

export function judgeTyped(given: string, expected: string): Verdict {
  const raw = given.trim().toLowerCase();
  const exp = expected.trim().toLowerCase();
  if (!raw) return "wrong";
  if (raw.replace(/[.!?]+$/, "") === exp.replace(/[.!?]+$/, "")) return "exact";
  const g = normalizeAnswer(given);
  const e = normalizeAnswer(expected);
  if (g === e) return "close";
  if (e.length >= 5 && editDistance(g, e) <= 1) return "close";
  return "wrong";
}

export function verdictRating(v: Verdict, hesitated = false): Rating {
  if (v === "wrong") return 1;
  if (v === "close") return 2;
  return hesitated ? 2 : 3;
}

export type ExerciseKind = "intro" | "choose" | "reverse" | "listen" | "translate" | "type-heard" | "speak" | "cloze" | "cognate" | "match";

export interface Exercise {
  kind: ExerciseKind;
  itemId: string;
  lang: string;
  root: string;
  prompt: string;
  promptLang: string;
  answer: string;
  answerLang: string;
  options?: string[];
  pairs?: { lang: string; word: string }[];
  cloze?: { before: string; after: string };
  family?: { lang: string; word: string }[];
  note?: string;
}

export type Rng = () => number;

export function seededRng(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(xs: T[], rng: Rng): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function distractors(corpus: LangCorpus, item: LangItem, lang: string, rng: Rng, n = 3): string[] {
  const right = item.forms[lang];
  const same = corpus.items.filter((x) => x.id !== item.id && x.kind === item.kind && x.forms[lang] && x.forms[lang] !== right);
  const close = same.filter((x) => x.category === item.category);
  const pool = shuffle(close.length >= n ? close : same, rng);
  const out: string[] = [];
  for (const x of pool) {
    const w = x.forms[lang];
    if (!out.includes(w)) out.push(w);
    if (out.length >= n) break;
  }
  return out;
}

function clozeFor(item: LangItem, lang: string): { before: string; after: string } | null {
  const word = item.forms[lang];
  const sentence = item.example[lang];
  if (item.kind === "word" && sentence) {
    const idx = sentence.toLowerCase().indexOf(word.toLowerCase());
    if (idx >= 0) return { before: sentence.slice(0, idx), after: sentence.slice(idx + word.length) };
  }
  return null;
}

export function exerciseFor(
  corpus: LangCorpus,
  system: LangSystem,
  item: LangItem,
  lang: string,
  card: LangCard | undefined,
  rng: Rng,
  opts: { speech?: boolean; afterIntro?: boolean } = {}
): Exercise {
  const root = system.root;
  const base = { itemId: item.id, lang, root, note: item.note };
  const target = item.forms[lang];
  const rootWord = item.forms[root];
  const reps = card?.reps ?? 0;
  const latin = LANGS[lang]?.latin ?? true;
  const family = sharedRootLangs(item, system).filter((l) => l !== lang).map((l) => ({ lang: l, word: item.forms[l] }));

  if (!card && !opts.afterIntro) {
    return { ...base, kind: "intro", prompt: rootWord, promptLang: root, answer: target, answerLang: lang, family };
  }
  const choices = (right: string, l: string) => shuffle([right, ...distractors(corpus, item, l, rng)], rng);
  const cloze = clozeFor(item, lang);
  const lapsed = !!card && (card.lapses ?? 0) > 0 && card.state === "relearning";
  const roll = rng();

  if (reps <= 1 || lapsed) {
    if (family.length > 0 && item.forms[lang] && sharedRootLangs(item, system).includes(lang)) {
      return { ...base, kind: "cognate", prompt: rootWord, promptLang: root, answer: target, answerLang: lang, options: choices(target, lang), family };
    }
    return { ...base, kind: "choose", prompt: rootWord, promptLang: root, answer: target, answerLang: lang, options: choices(target, lang) };
  }
  if (reps === 2) {
    if (roll < 0.5) return { ...base, kind: "listen", prompt: target, promptLang: lang, answer: rootWord, answerLang: root, options: choices(rootWord, root) };
    return { ...base, kind: "reverse", prompt: target, promptLang: lang, answer: rootWord, answerLang: root, options: choices(rootWord, root) };
  }
  if (cloze && roll < 0.3) {
    return { ...base, kind: "cloze", prompt: rootWord, promptLang: root, answer: target, answerLang: lang, options: choices(target, lang), cloze };
  }
  if (!latin) {
    if (roll < 0.6) return { ...base, kind: "listen", prompt: target, promptLang: lang, answer: rootWord, answerLang: root, options: choices(rootWord, root) };
    return { ...base, kind: "choose", prompt: rootWord, promptLang: root, answer: target, answerLang: lang, options: choices(target, lang) };
  }
  if (opts.speech && roll < 0.5) return { ...base, kind: "speak", prompt: rootWord, promptLang: root, answer: target, answerLang: lang };
  if (roll < 0.7) return { ...base, kind: "translate", prompt: rootWord, promptLang: root, answer: target, answerLang: lang };
  return { ...base, kind: "type-heard", prompt: target, promptLang: lang, answer: target, answerLang: lang };
}

export function matchExercise(corpus: LangCorpus, system: LangSystem, item: LangItem, rng: Rng): Exercise | null {
  const langs = system.targets.filter((l) => item.forms[l]);
  if (langs.length < 2 || !item.forms[system.root]) return null;
  return {
    kind: "match",
    itemId: item.id,
    lang: langs[0],
    root: system.root,
    prompt: item.forms[system.root],
    promptLang: system.root,
    answer: "",
    answerLang: langs[0],
    pairs: shuffle(langs.map((l) => ({ lang: l, word: item.forms[l] })), rng),
    family: sharedRootLangs(item, system).map((l) => ({ lang: l, word: item.forms[l] })),
    note: item.note,
  };
}

function cardsOf(state: EngineState): Record<string, LangCard> {
  return state.cards as Record<string, LangCard>;
}

export function newToday(state: EngineState, lang: string, now: number = Date.now()): number {
  const dk = dayKey(now);
  return Object.entries(cardsOf(state)).filter(([id, c]) => parseCardId(id).lang === lang && c.introduced === dk && !c.placed).length;
}

export interface SessionCard {
  itemId: string;
  lang: string;
}

export function interleave(cards: SessionCard[]): SessionCard[] {
  const byLang = new Map<string, SessionCard[]>();
  for (const c of cards) {
    if (!byLang.has(c.lang)) byLang.set(c.lang, []);
    byLang.get(c.lang)!.push(c);
  }
  const out: SessionCard[] = [];
  let last = "";
  while (out.length < cards.length) {
    const queues = Array.from(byLang.entries()).filter(([, q]) => q.length > 0).sort((a, b) => b[1].length - a[1].length);
    const pick = queues.find(([l]) => l !== last) ?? queues[0];
    out.push(pick[1].shift()!);
    last = pick[0];
  }
  return out;
}

export function planSession(system: LangSystem, corpus: LangCorpus, state: EngineState, now: number = Date.now(), size = 14): SessionCard[] {
  const cards = cardsOf(state);
  const due = Object.entries(cards)
    .map(([id, c]) => ({ ...parseCardId(id), c }))
    .filter((x) => system.targets.includes(x.lang) && corpus.byId.has(x.itemId) && x.c.due != null && x.c.due <= now)
    .sort((a, b) => (a.c.due ?? 0) - (b.c.due ?? 0))
    .slice(0, size)
    .map((x) => ({ itemId: x.itemId, lang: x.lang }));

  const room = Math.max(0, size - due.length);
  const fresh: SessionCard[] = [];
  const budget = new Map(system.targets.map((l) => [l, Math.max(0, NEW_PER_LANG_PER_DAY - newToday(state, l, now))]));
  for (const item of corpus.items) {
    if (fresh.length >= room) break;
    for (const l of system.targets) {
      if (fresh.length >= room) break;
      if ((budget.get(l) ?? 0) <= 0) continue;
      if (!usable(item, system.root, l)) continue;
      if (item.tier < (system.placement[l] ?? 0)) continue;
      if (cards[cardId(l, item.id)]) continue;
      fresh.push({ itemId: item.id, lang: l });
      budget.set(l, (budget.get(l) ?? 0) - 1);
    }
  }
  return [...interleave(due), ...fresh];
}

export function gradeCard(state: EngineState, lang: string, itemId: string, rating: Rating, now: number = Date.now()): EngineState {
  const id = cardId(lang, itemId);
  const wasNew = !state.cards[id];
  const next = grade(state, [], {}, id, rating, "recall", now);
  if (wasNew) (next.cards[id] as LangCard).introduced = dayKey(now);
  else if ((state.cards[id] as LangCard).introduced) (next.cards[id] as LangCard).introduced = (state.cards[id] as LangCard).introduced;
  return next;
}

export function placementItems(system: LangSystem, corpus: LangCorpus, lang: string, rng: Rng, perTier = 2): LangItem[] {
  const out: LangItem[] = [];
  for (const t of PLACEMENT_TIERS) {
    const pool = corpus.items.filter((i) => i.kind === "word" && i.tier === t && usable(i, system.root, lang));
    out.push(...shuffle(pool, rng).slice(0, perTier));
  }
  return out;
}

export function placementTier(answers: { tier: number; correct: boolean }[]): number {
  let placed = 0;
  for (const t of PLACEMENT_TIERS) {
    const at = answers.filter((a) => a.tier === t);
    if (at.length === 0) break;
    const right = at.filter((a) => a.correct).length;
    if (right * 2 < at.length || right === 0) break;
    const next = PLACEMENT_TIERS[PLACEMENT_TIERS.indexOf(t) + 1];
    placed = next ?? t + 1;
  }
  return placed;
}

export function applyPlacement(state: EngineState, system: LangSystem, corpus: LangCorpus, lang: string, tier: number, now: number = Date.now()): EngineState {
  const next = normalizeState(state);
  const fsrs: FSRS = makeFsrs(next);
  for (const item of corpus.items) {
    if (item.tier >= tier || !usable(item, system.root, lang)) continue;
    const id = cardId(lang, item.id);
    if (next.cards[id]) continue;
    const c = fsrs.review({ state: "new" }, 3, now) as LangCard;
    c.placed = true;
    c.introduced = dayKey(now);
    next.cards[id] = c;
  }
  return next;
}

export interface QueueEntry {
  itemId: string;
  lang: string;
  stage: "intro" | "check" | "review" | "match";
}

export const CHECK_GAP = 3;
export const MAX_TRIES = 2;

export function buildQueue(system: LangSystem, corpus: LangCorpus, state: EngineState, now: number = Date.now(), size = 14): QueueEntry[] {
  const plan = planSession(system, corpus, state, now, size);
  const out: QueueEntry[] = [];
  const pendingChecks: { at: number; e: QueueEntry }[] = [];
  for (const c of plan) {
    const isNew = !state.cards[cardId(c.lang, c.itemId)];
    out.push({ ...c, stage: isNew ? "intro" : "review" });
    if (isNew) pendingChecks.push({ at: out.length + CHECK_GAP, e: { ...c, stage: "check" } });
    while (pendingChecks.length && pendingChecks[0].at <= out.length) out.push(pendingChecks.shift()!.e);
  }
  for (const p of pendingChecks) out.push(p.e);

  if (system.targets.length >= 2) {
    const seen = new Map<string, Set<string>>();
    const note = (itemId: string, lang: string) => {
      if (!seen.has(itemId)) seen.set(itemId, new Set());
      seen.get(itemId)!.add(lang);
    };
    for (const e of out) note(e.itemId, e.lang);
    for (const id of Object.keys(state.cards)) {
      const { lang, itemId } = parseCardId(id);
      if (system.targets.includes(lang)) note(itemId, lang);
    }
    const candidates = Array.from(seen.entries()).filter(([itemId, langs]) => {
      const item = corpus.byId.get(itemId);
      if (!item || !item.forms[system.root]) return false;
      const covered = system.targets.filter((l) => item.forms[l]);
      return covered.length >= 2 && covered.every((l) => langs.has(l));
    });
    const roots = (id: string) => sharedRootLangs(corpus.byId.get(id)!, system).length;
    candidates.sort((a, b) => roots(b[0]) - roots(a[0]));
    if (candidates.length) out.push({ itemId: candidates[0][0], lang: system.targets[0], stage: "match" });
  }
  return out;
}

export function requeueAfterMiss(queue: QueueEntry[], index: number, entry: QueueEntry): QueueEntry[] {
  const same = (e: QueueEntry) => e.itemId === entry.itemId && e.lang === entry.lang;
  if (queue.slice(index + 1).some((e) => same(e) && e.stage !== "match")) return queue;
  if (queue.filter((e) => same(e) && (e.stage === "check" || e.stage === "review")).length >= MAX_TRIES) return queue;
  const at = Math.min(queue.length, index + 1 + CHECK_GAP);
  return [...queue.slice(0, at), entry, ...queue.slice(at)];
}

export interface SystemsDoc {
  systems: LangSystem[];
  removed: Record<string, number>;
}

export function normalizeSystemsDoc(raw: unknown): SystemsDoc {
  const d = (raw && typeof raw === "object" ? raw : {}) as Partial<SystemsDoc>;
  return {
    systems: Array.isArray(d.systems) ? d.systems.filter((s) => s && typeof s.id === "string") : [],
    removed: d.removed && typeof d.removed === "object" ? { ...d.removed } : {},
  };
}

export function mergeSystems(a: SystemsDoc, b: SystemsDoc): SystemsDoc {
  const removed: Record<string, number> = { ...a.removed };
  for (const [id, t] of Object.entries(b.removed)) removed[id] = Math.max(removed[id] ?? 0, t);
  const byId = new Map<string, LangSystem>();
  for (const s of [...a.systems, ...b.systems]) {
    const cur = byId.get(s.id);
    if (!cur) {
      byId.set(s.id, { ...s, placement: Object.fromEntries(Object.entries(s.placement).sort()) });
      continue;
    }
    const placement = { ...cur.placement };
    for (const [l, t] of Object.entries(s.placement)) placement[l] = Math.max(placement[l] ?? 0, t);
    byId.set(s.id, { ...cur, createdAt: Math.min(cur.createdAt, s.createdAt), placement: Object.fromEntries(Object.entries(placement).sort()) });
  }
  const systems = Array.from(byId.values())
    .filter((s) => (removed[s.id] ?? -1) < s.createdAt)
    .sort((x, y) => x.createdAt - y.createdAt);
  return { systems, removed };
}

export interface LangProgress {
  lang: string;
  total: number;
  started: number;
  mastered: number;
  due: number;
  retention: number;
  placedAt: number | null;
}

export function langProgress(system: LangSystem, corpus: LangCorpus, state: EngineState, now: number = Date.now()): LangProgress[] {
  const fsrs = new FSRS();
  const cards = cardsOf(state);
  return system.targets.map((lang) => {
    const items = corpus.items.filter((i) => usable(i, system.root, lang));
    let started = 0;
    let mastered = 0;
    let due = 0;
    let rSum = 0;
    for (const i of items) {
      const c = cards[cardId(lang, i.id)];
      if (!c) continue;
      started++;
      if (fsrs.mastery(c) >= 0.8) mastered++;
      if (c.due != null && c.due <= now) due++;
      const elapsed = Math.max(0, (now - (c.lastReview ?? now)) / DAY_MS);
      rSum += fsrs.retrievability(elapsed, c.stability ?? 0);
    }
    return { lang, total: items.length, started, mastered, due, retention: started ? rSum / started : 0, placedAt: system.placement[lang] ?? null };
  });
}

export interface SystemSummary {
  started: number;
  total: number;
  due: number;
  xp: number;
  streak: number;
  sharedRootItems: number;
}

export function systemSummary(system: LangSystem, corpus: LangCorpus, state: EngineState, now: number = Date.now()): SystemSummary {
  const per = langProgress(system, corpus, state, now);
  return {
    started: per.reduce((s, p) => s + p.started, 0),
    total: per.reduce((s, p) => s + p.total, 0),
    due: per.reduce((s, p) => s + p.due, 0),
    xp: state.stats.xp,
    streak: state.stats.streak,
    sharedRootItems: corpus.items.filter((i) => sharedRootLangs(i, system).length >= 2).length,
  };
}
