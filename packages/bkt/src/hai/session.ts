import { seededRandom } from "../grade";
import { eligibleIds, type Bank, type FrozenItem, type Review } from "./bank";
import { aiVisible, displayOrder, pickPairs, type AiAnswer, type AiScores, type ProbeSlot } from "./probe";
import { summarize, type Summary } from "./stats";
import type { HaiStore, Phase } from "./store";

export const MIN_RETESTED_PROBES_FOR_TREND = 5;

export interface Shown {
  slot: ProbeSlot;
  item: FrozenItem;
  order: number[];
  ai: AiAnswer | null;
}

export class ProbeRun {
  private idx = 0;
  private constructor(
    private hai: HaiStore,
    private bank: Bank,
    private scores: AiScores,
    readonly probeId: string,
    readonly phase: Phase,
    private slots: ProbeSlot[],
    private seed: string,
  ) {}

  static start(hai: HaiStore, bank: Bank, review: Review, scores: AiScores, now: number, seed = String(now)): ProbeRun {
    const slots = pickPairs(bank, scores, eligibleIds(bank, review), hai.usedItems(), seed);
    const probeId = hai.startProbe(bank.version, seed, now);
    return new ProbeRun(hai, bank, scores, probeId, "t0", slots, seed);
  }

  static retest(hai: HaiStore, bank: Bank, scores: AiScores, probeId: string, seed: string): ProbeRun {
    const probe = hai.probes().find((p) => p.id === probeId);
    if (!probe) throw new Error(`no probe ${probeId}`);
    if (probe.bank_version !== bank.version) throw new Error(`probe ${probeId} used bank ${probe.bank_version}`);
    const slots = hai.slots(probeId);
    const rand = seededRandom(`${seed}:retest`);
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }
    return new ProbeRun(hai, bank, scores, probeId, "retest", slots, `${seed}:retest`);
  }

  get total() {
    return this.slots.length;
  }
  get position() {
    return this.idx;
  }
  get done() {
    return this.idx >= this.slots.length;
  }

  current(): Shown | null {
    const slot = this.slots[this.idx];
    if (!slot) return null;
    const item = this.bank.items.find((i) => i.id === slot.itemId);
    if (!item) throw new Error(`item ${slot.itemId} missing from bank ${this.bank.version}`);
    const ai = this.phase === "t0" && slot.condition === "pair" ? (this.scores.answers[item.id] ?? null) : null;
    return { slot, item, order: displayOrder(item, this.seed), ai };
  }

  aiShown(elapsedMs: number): boolean {
    const c = this.current();
    return !!c && this.phase === "t0" && aiVisible(c.slot.condition, elapsedMs) && !!c.ai;
  }

  answer(choice: number | null, elapsedMs: number, now: number) {
    const c = this.current();
    if (!c) throw new Error("probe is finished");
    const shown = this.aiShown(elapsedMs);
    this.hai.record({
      probeId: this.probeId,
      pairId: c.slot.pairId,
      itemId: c.item.id,
      condition: c.slot.condition,
      phase: this.phase,
      choice,
      correct: choice !== null && choice === c.item.answerIndex,
      acceptedAi: shown && c.ai?.choice != null ? choice === c.ai.choice : null,
      elapsedMs,
      at: now,
    });
    this.idx++;
    if (this.done) this.phase === "t0" ? this.hai.completeProbe(this.probeId, now) : this.hai.completeRetest(this.probeId, now);
  }
}

export interface Report {
  summary: Summary | null;
  retestedProbes: number;
  trend: boolean;
  nextRetest: number | null;
}

export function report(hai: HaiStore, scores: AiScores | null): Report {
  const retested = new Set(hai.probes().filter((p) => p.retest_completed_at !== null).map((p) => p.id));
  const aiCorrect = (id: string) => scores?.answers[id]?.correct ?? false;
  const pairs = hai.outcomes(aiCorrect).filter((o) => retested.has(o.pairId.split("/")[0]));
  return {
    summary: pairs.length ? summarize(pairs) : null,
    retestedProbes: retested.size,
    trend: retested.size >= MIN_RETESTED_PROBES_FOR_TREND,
    nextRetest: hai.nextDue(),
  };
}
