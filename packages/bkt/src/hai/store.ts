import { randomUUID } from "node:crypto";
import { open, seal } from "../crypto";
import type { Store } from "../store";
import type { Condition, ProbeSlot } from "./probe";
import { retestDue } from "./probe";
import type { PairOutcome } from "./stats";

export type Phase = "t0" | "retest";

export interface ProbeRow {
  id: string;
  bank_version: string;
  seed: string;
  started_at: number;
  completed_at: number | null;
  due_at: number | null;
  retest_completed_at: number | null;
}

export interface AnswerInput {
  probeId: string;
  pairId: string;
  itemId: string;
  condition: Condition;
  phase: Phase;
  choice: number | null;
  correct: boolean;
  acceptedAi: boolean | null;
  elapsedMs: number;
  at: number;
}

interface AnswerRow {
  id: string;
  probe_id: string;
  pair_id: string;
  item_id: string;
  condition: Condition;
  phase: Phase;
  response_enc: string | null;
  correct: number;
  accepted_ai: number | null;
  elapsed_ms: number;
  at: number;
}

const CONSENT = "hai_consent_at";

export class HaiStore {
  constructor(private store: Store, private key: Buffer) {}

  private get db() {
    return this.store.db;
  }

  consented(): boolean {
    return this.store.meta(CONSENT) !== null;
  }

  consent(now: number) {
    this.store.setMeta(CONSENT, String(now));
  }

  private requireConsent() {
    if (!this.consented()) throw new Error("hai: consent not given");
  }

  startProbe(bankVersion: string, seed: string, now: number): string {
    this.requireConsent();
    const id = randomUUID();
    this.db.query("insert into hai_probe (id, bank_version, seed, started_at) values (?, ?, ?, ?)").run(id, bankVersion, seed, now);
    return id;
  }

  record(a: AnswerInput): string {
    this.requireConsent();
    const id = randomUUID();
    const enc = a.choice === null ? null : seal(this.key, String(a.choice), `hai:${id}`);
    this.db
      .query(
        `insert into hai_answer (id, probe_id, pair_id, item_id, condition, phase, response_enc, correct, accepted_ai, elapsed_ms, at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, a.probeId, a.pairId, a.itemId, a.condition, a.phase, enc, a.correct ? 1 : 0, a.acceptedAi === null ? null : a.acceptedAi ? 1 : 0, Math.round(a.elapsedMs), a.at);
    return id;
  }

  completeProbe(probeId: string, now: number) {
    this.db.query("update hai_probe set completed_at = ?, due_at = ? where id = ?").run(now, retestDue(now), probeId);
  }

  completeRetest(probeId: string, now: number) {
    this.db.query("update hai_probe set retest_completed_at = ? where id = ?").run(now, probeId);
  }

  probes(): ProbeRow[] {
    return this.db.query<ProbeRow, []>("select * from hai_probe order by started_at").all();
  }

  dueRetests(now: number): ProbeRow[] {
    return this.db
      .query<ProbeRow, [number]>("select * from hai_probe where completed_at is not null and retest_completed_at is null and due_at <= ? order by due_at")
      .all(now);
  }

  nextDue(): number | null {
    return this.db.query<{ d: number | null }, []>("select min(due_at) d from hai_probe where retest_completed_at is null and due_at is not null").get()!.d;
  }

  usedItems(): Set<string> {
    return new Set(this.db.query<{ item_id: string }, []>("select distinct item_id from hai_answer").all().map((r) => r.item_id));
  }

  answers(probeId?: string): (AnswerInput & { id: string })[] {
    const rows = probeId
      ? this.db.query<AnswerRow, [string]>("select * from hai_answer where probe_id = ? order by at").all(probeId)
      : this.db.query<AnswerRow, []>("select * from hai_answer order by at").all();
    return rows.map((r) => ({
      id: r.id,
      probeId: r.probe_id,
      pairId: r.pair_id,
      itemId: r.item_id,
      condition: r.condition,
      phase: r.phase,
      choice: r.response_enc === null ? null : Number(open(this.key, r.response_enc, `hai:${r.id}`)),
      correct: r.correct === 1,
      acceptedAi: r.accepted_ai === null ? null : r.accepted_ai === 1,
      elapsedMs: r.elapsed_ms,
      at: r.at,
    }));
  }

  slots(probeId: string): ProbeSlot[] {
    return this.answers(probeId)
      .filter((a) => a.phase === "t0")
      .map((a) => ({ pairId: a.pairId, itemId: a.itemId, condition: a.condition }));
  }

  outcomes(aiCorrect: (itemId: string) => boolean): PairOutcome[] {
    const byPair = new Map<string, Partial<PairOutcome> & { complete: number }>();
    const done = new Set(this.probes().filter((p) => p.completed_at !== null).map((p) => p.id));
    for (const a of this.answers()) {
      if (!done.has(a.probeId)) continue;
      const key = `${a.probeId}/${a.pairId}`;
      const o = byPair.get(key) ?? { pairId: key, complete: 0 };
      const v = a.correct ? 1 : 0;
      if (a.phase === "t0" && a.condition === "solo") o.h = v;
      if (a.phase === "t0" && a.condition === "pair") {
        o.j = v;
        o.a = aiCorrect(a.itemId) ? 1 : 0;
      }
      if (a.phase === "retest" && a.condition === "solo") o.hRetest = v;
      if (a.phase === "retest" && a.condition === "pair") o.jRetest = v;
      byPair.set(key, o);
    }
    return [...byPair.values()]
      .filter((o) => o.h !== undefined && o.j !== undefined && o.a !== undefined)
      .map((o) => ({ pairId: o.pairId!, h: o.h!, j: o.j!, a: o.a!, hRetest: o.hRetest, jRetest: o.jRetest }));
  }

  wipe() {
    this.db.transaction(() => {
      this.db.run("delete from hai_answer");
      this.db.run("delete from hai_probe");
      this.db.query("delete from meta where k = ?").run(CONSENT);
    })();
  }

  export() {
    return { probes: this.probes(), answers: this.answers() };
  }
}
