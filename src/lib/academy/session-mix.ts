import type { EngineState } from "./engine";
import { masteryFromStability } from "./mastery";
import type { TopWord } from "./placement-cefr";
import {
  buildQueue,
  cardId,
  CHECK_GAP,
  exerciseFor,
  isStarted,
  isSentenceCard,
  isVocab,
  learnerLevel,
  letterExerciseFor,
  matchExercise,
  parseCardId,
  sharedRootLangs,
  usable,
  type Exercise,
  type ExerciseKind,
  type ExerciseMix,
  type ItemKind,
  type LangCorpus,
  type LangItem,
  type LangSystem,
  type QueueEntry,
  type Rng,
} from "./lang-systems";

export type CurriculumStage = "word" | "phrase" | "sentence";

export const OPEN_MIX: Required<ExerciseMix> = { sound: true, compare: true, sentenceFirst: false };
export const MASTERY_BAR = 0.8;
export const FALSE_FRIEND_BAR = 0.5;
export const SOUND_KINDS: ReadonlySet<ExerciseKind> = new Set<ExerciseKind>(["listen", "type-heard", "speak", "spell-heard", "letter-sound", "minimal-pair"]);
export const COMPARE_KINDS: ReadonlySet<ExerciseKind> = new Set<ExerciseKind>(["match", "false-friend", "cognate"]);

export class SoundTally {
  asked = 0;
  sounds = 0;
  private counted = new Set<string>();

  record(kind: ExerciseKind, key: string): void {
    if (kind === "intro" || kind === "match" || this.counted.has(key)) return;
    this.counted.add(key);
    this.asked += 1;
    if (SOUND_KINDS.has(kind)) this.sounds += 1;
  }
}

export class StudyRound {
  tally = new SoundTally();
  constructor(public queue: QueueEntry[]) {}

  restart(queue: QueueEntry[]): void {
    this.queue = queue;
    this.tally = new SoundTally();
  }

  record(kind: ExerciseKind, key: string): void {
    this.tally.record(kind, key);
  }
}

export interface ItemMastery {
  id: string;
  stage: CurriculumStage;
  mastery: number;
}

export const UNRANKED = 5000;

export class FrequencyRank {
  readonly ranks: Record<string, Map<string, number>> = {};

  constructor(top: Record<string, TopWord[]>) {
    for (const [lang, words] of Object.entries(top)) {
      const m = new Map<string, number>();
      for (const w of words) if (!m.has(w.word.toLowerCase())) m.set(w.word.toLowerCase(), w.rank);
      this.ranks[lang] = m;
    }
  }

  fallback(item: LangItem): number {
    return 2000 + Math.trunc(item.tier * 100);
  }

  rank(item: LangItem, lang: string): number {
    const form = item.forms[lang]?.toLowerCase();
    const table = this.ranks[lang];
    if (!form || !table) return this.fallback(item);
    const direct = table.get(form);
    if (direct !== undefined) return direct;
    const words = form.split(new RegExp("[^\\p{L}\\p{M}']+", "u")).filter(Boolean);
    const hits = words.map((w) => table.get(w)).filter((r): r is number => r !== undefined);
    if (item.kind !== "phrase" || hits.length === 0) return this.fallback(item);
    const worst = Math.max(...hits);
    return hits.length === words.length ? worst : Math.max(worst, this.fallback(item));
  }

  rankAcross(item: LangItem, langs: string[]): number {
    const rs = langs.filter((l) => item.forms[l]).map((l) => this.rank(item, l));
    return rs.length === 0 ? this.fallback(item) : Math.trunc(rs.reduce((a, b) => a + b, 0) / rs.length);
  }
}

export function mastery(state: EngineState, lang: string, itemId: string): number {
  return masteryFromStability(state.cards[cardId(lang, itemId)]?.stability);
}

export function mastered(state: EngineState, lang: string, itemId: string, bar = MASTERY_BAR): boolean {
  return mastery(state, lang, itemId) >= bar;
}

export function sentenceItemId(sentenceId: string): string {
  return `sent:${sentenceId}`;
}

export function startedCount(state: EngineState, system: LangSystem): number {
  return Object.entries(state.cards).filter(([id, c]) => system.targets.includes(parseCardId(id).lang) && !isSentenceCard(id) && isStarted(c)).length;
}

export function soundShare(started: number): number {
  return started < 40 ? 0.1 : started < 150 ? 0.25 : 0.4;
}

export function soundAllowed(tally: SoundTally, started: number): boolean {
  return tally.sounds + 1 <= soundShare(started) * (tally.asked + 1);
}

export function stage(item: LangItem, state: EngineState, lang: string): CurriculumStage {
  if (item.kind === "word" && mastered(state, lang, item.id)) return "sentence";
  return item.kind === "phrase" ? "phrase" : "word";
}

export function masteryTable(system: LangSystem, corpus: LangCorpus, state: EngineState, lang: string): ItemMastery[] {
  const items = corpus.items
    .filter((i) => isVocab(i) && usable(i, system.root, lang) && isStarted(state.cards[cardId(lang, i.id)]))
    .map((i): ItemMastery => ({ id: i.id, stage: i.kind === "phrase" ? "phrase" : "word", mastery: mastery(state, lang, i.id) }));
  const sentences: ItemMastery[] = [];
  for (const [id, c] of Object.entries(state.cards)) {
    const p = parseCardId(id);
    if (p.lang === lang && p.itemId.startsWith("sent:") && isStarted(c)) sentences.push({ id: p.itemId, stage: "sentence", mastery: masteryFromStability(c.stability) });
  }
  return [...items, ...sentences];
}

const KIND_RANK: Partial<Record<ItemKind, number>> = { word: 0, phrase: 1 };

export function frequencyOrder(items: LangItem[], freq: FrequencyRank, langs: string[]): LangItem[] {
  return items
    .map((item) => ({ item, rank: freq.rankAcross(item, langs) }))
    .sort((x, y) => (x.rank !== y.rank ? x.rank - y.rank : (KIND_RANK[x.item.kind] ?? 2) - (KIND_RANK[y.item.kind] ?? 2)))
    .map((x) => x.item);
}

export function curriculum(corpus: LangCorpus, system: LangSystem, lang: string, freq: FrequencyRank): LangItem[] {
  return frequencyOrder(corpus.items.filter((i) => isVocab(i) && usable(i, system.root, lang)), freq, [lang]);
}

export function frequencyFirst(corpus: LangCorpus, freq: FrequencyRank, langs: string[]): LangCorpus {
  return { ...corpus, items: frequencyOrder(corpus.items, freq, langs) };
}

export function compareReady(item: LangItem, state: EngineState, langs: string[], bar = MASTERY_BAR): boolean {
  return langs.length > 0 && langs.every((l) => mastered(state, l, item.id, bar));
}

export function gateComparisons(queue: QueueEntry[], system: LangSystem, corpus: LangCorpus, state: EngineState): QueueEntry[] {
  return queue.filter((e) => {
    if (e.stage !== "match") return true;
    const item = corpus.byId.get(e.itemId);
    return !!item && compareReady(item, state, system.targets.filter((l) => item.forms[l]));
  });
}

const entryKey = (e: QueueEntry) => cardId(e.lang, e.itemId);

function spacingPass(queue: QueueEntry[], gap: number): { out: QueueEntry[]; unplaced: QueueEntry[] } {
  const introduced = new Set(queue.filter((e) => e.stage === "intro").map(entryKey));
  const paired = (e: QueueEntry) => e.stage === "check" && introduced.has(entryKey(e));
  const checks = new Map<string, QueueEntry>();
  for (const e of queue) if (paired(e) && !checks.has(entryKey(e))) checks.set(entryKey(e), e);
  const rest = queue.filter((e) => !paired(e));
  const out: QueueEntry[] = [];
  const pending: { at: number; e: QueueEntry }[] = [];
  const flush = (keep: number) => {
    while (pending.length > keep && out.length - pending[0].at - 1 >= gap) out.push(pending.shift()!.e);
  };
  let fillersLeft = rest.filter((e) => e.stage !== "intro").length;
  for (const e of rest) {
    out.push(e);
    const c = e.stage === "intro" ? checks.get(entryKey(e)) : undefined;
    if (c) {
      checks.delete(entryKey(e));
      pending.push({ at: out.length - 1, e: c });
    } else if (e.stage !== "intro") fillersLeft -= 1;
    flush(fillersLeft >= gap ? 0 : gap);
  }
  flush(0);
  return { out, unplaced: pending.map((p) => p.e) };
}

export function spacedChecks(queue: QueueEntry[], gap = CHECK_GAP): QueueEntry[] {
  const early = new Set<string>();
  for (;;) {
    const movesUp = (e: QueueEntry) => e.stage === "intro" && early.has(entryKey(e));
    const pass = spacingPass([...queue.filter(movesUp), ...queue.filter((e) => !movesUp(e))], gap);
    const late = pass.unplaced.map(entryKey);
    if (late.every((k) => early.has(k))) return [...pass.out, ...pass.unplaced];
    for (const k of late) early.add(k);
  }
}

export function alternate(queue: QueueEntry[], gap = CHECK_GAP): QueueEntry[] {
  const order: string[] = [];
  const byLang = new Map<string, QueueEntry[]>();
  for (const e of queue) {
    if (!byLang.has(e.lang)) {
      order.push(e.lang);
      byLang.set(e.lang, []);
    }
    byLang.get(e.lang)!.push(e);
  }
  const out: QueueEntry[] = [];
  const introAt = new Map<string, number>();
  let last = "";
  const ready = (e: QueueEntry) => {
    const at = e.stage === "check" ? introAt.get(entryKey(e)) : undefined;
    return at === undefined || out.length - at - 1 >= gap;
  };
  while (out.length < queue.length) {
    const live = order.filter((l) => byLang.get(l)!.length > 0).sort((a, b) => byLang.get(b)!.length - byLang.get(a)!.length);
    const head = (l: string) => byLang.get(l)![0];
    const pick = live.find((l) => l !== last && ready(head(l))) ?? live.find((l) => ready(head(l))) ?? live.find((l) => l !== last) ?? live[0];
    const e = byLang.get(pick)!.shift()!;
    if (e.stage === "intro") introAt.set(entryKey(e), out.length);
    out.push(e);
    last = pick;
  }
  return out;
}

export function sessionQueue(
  system: LangSystem,
  corpus: LangCorpus,
  state: EngineState,
  now: number,
  freq: FrequencyRank,
  opts: { size?: number; heritage?: boolean } = {}
): QueueEntry[] {
  const built = buildQueue(system, frequencyFirst(corpus, freq, system.targets), state, now, opts.size ?? 14, { heritage: opts.heritage });
  return gateComparisons(built, system, corpus, state);
}

const sameEntry = (a: QueueEntry, b: QueueEntry) => a.itemId === b.itemId && a.lang === b.lang && a.stage === b.stage;

export function session(
  system: LangSystem,
  corpus: LangCorpus,
  state: EngineState,
  now: number,
  freq: FrequencyRank,
  opts: { lead?: QueueEntry[]; replay?: QueueEntry[]; heritage?: boolean } = {}
): QueueEntry[] {
  const replay = opts.replay ?? [];
  const main = sessionQueue(system, corpus, state, now, freq, { heritage: opts.heritage }).filter((e) => !replay.some((r) => sameEntry(r, e)));
  return alternate(spacedChecks([...(opts.lead ?? []), ...replay, ...main]));
}

export function letterSessionExercise(entry: QueueEntry, system: LangSystem, state: EngineState, tally: SoundTally, rng: Rng, drill = letterExerciseFor): Exercise | null {
  const made = drill(entry.lang, system.root, entry.itemId, rng);
  if (!made || !SOUND_KINDS.has(made.kind) || soundAllowed(tally, startedCount(state, system))) return made;
  return letterExerciseFor(entry.lang, system.root, entry.itemId, rng) ?? made;
}

export function exerciseMix(system: LangSystem, item: LangItem, lang: string, state: EngineState, tally: SoundTally): Required<ExerciseMix> {
  const family = sharedRootLangs(item, system).filter((l) => l !== lang);
  const compare = item.falseFriends[lang] ? mastered(state, lang, item.id, FALSE_FRIEND_BAR) : compareReady(item, state, family);
  return { sound: soundAllowed(tally, startedCount(state, system)), compare, sentenceFirst: stage(item, state, lang) === "sentence" };
}

export function sessionExercise(
  entry: QueueEntry,
  system: LangSystem,
  corpus: LangCorpus,
  state: EngineState,
  tally: SoundTally,
  rng: Rng,
  opts: { speech?: boolean; heritage?: boolean } = {}
): Exercise | null {
  if (entry.stage === "letter") return letterSessionExercise(entry, system, state, tally, rng);
  const item = corpus.byId.get(entry.itemId);
  if (!item) return null;
  if (entry.stage === "match") return matchExercise(corpus, system, item, rng);
  return exerciseFor(corpus, system, item, entry.lang, state.cards[cardId(entry.lang, entry.itemId)], rng, {
    speech: opts.speech,
    afterIntro: entry.stage === "check",
    level: learnerLevel(state, entry.lang),
    heritage: opts.heritage,
    mix: exerciseMix(system, item, entry.lang, state, tally),
  });
}

export function tallyKey(entry: QueueEntry, index: number): string {
  return `${index}|${cardId(entry.lang, entry.itemId)}|${entry.stage}`;
}

export function longestRun(queue: QueueEntry[]): number {
  let best = 0;
  let run = 0;
  let last = "";
  for (const e of queue) {
    run = e.lang === last ? run + 1 : 1;
    last = e.lang;
    best = Math.max(best, run);
  }
  return best;
}

export { inputShare, inputTarget, planInputMix } from "./input-mix";
