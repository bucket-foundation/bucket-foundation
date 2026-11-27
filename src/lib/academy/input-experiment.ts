import { A2_TOP_TIER, CARD_SECONDS, planInputMix, type InputMix } from "./input-mix";

export const EXPERIMENT_ID = "ci14-share-v1";
export const ARM_SHARES = { s50: 0.5, s70: 0.7, s90: 0.9 } as const;
export type ArmId = keyof typeof ARM_SHARES;
export const ARM_IDS: readonly ArmId[] = ["s50", "s70", "s90"];
export const NOT_FILLED_SUFFIX = "-x";
export const FILL_SHARE = 0.9;

export function experimentOn(flag: string | undefined = process.env.NEXT_PUBLIC_POLINGUAL_INPUT_EXPERIMENT): boolean {
  return flag === "1";
}

export type Stratum = "to-a2" | "past-a2";

export function stratum(tier: number): Stratum {
  return tier <= A2_TOP_TIER ? "to-a2" : "past-a2";
}

export function fnv1a32(s: string): number {
  let h = 0x811c9dc5;
  for (const b of Array.from(new TextEncoder().encode(s))) {
    h ^= b;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function enrolmentKey(accountId: string | null | undefined, device: string): string {
  return accountId ? `acct:${accountId}` : `dev:${device}`;
}

export function assignArm(key: string): ArmId {
  return ARM_IDS[fnv1a32(`${EXPERIMENT_ID}:${key}`) % ARM_IDS.length];
}

export function canFill(cards: number, eligibleUnitSeconds: readonly number[]): boolean {
  const eligible = eligibleUnitSeconds.filter((s) => s > 0).reduce((a, b) => a + b, 0);
  const cardTime = Math.max(0, cards) * CARD_SECONDS;
  return eligible > 0 && (cardTime === 0 || eligible / (eligible + cardTime) >= FILL_SHARE);
}

export interface Consent {
  flag: boolean;
  uploadOpen: boolean;
  disclosed: boolean;
  optedOut: boolean;
}

export function mayTakePart(c: Consent): boolean {
  return c.flag && c.uploadOpen && c.disclosed && !c.optedOut;
}

export interface Enrolment {
  experiment: string;
  key: string;
  arm: ArmId;
  stratum: Stratum;
  at: number;
}

export function parseEnrolment(raw: unknown): Enrolment | null {
  const o = raw as Partial<Enrolment> | null;
  if (!o || o.experiment !== EXPERIMENT_ID || typeof o.key !== "string" || !o.key || typeof o.at !== "number") return null;
  if (!ARM_IDS.includes(o.arm as ArmId) || (o.stratum !== "to-a2" && o.stratum !== "past-a2")) return null;
  return { experiment: EXPERIMENT_ID, key: o.key, arm: o.arm as ArmId, stratum: o.stratum, at: o.at };
}

export interface ExperimentMix {
  mix: InputMix;
  arm: string | null;
  enrolment: Enrolment | null;
}

export function experimentMix(consent: Consent, enrolment: Enrolment | null, key: string | null, tier: number, cards: number, eligibleUnitSeconds: readonly number[], now: number): ExperimentMix {
  const plain = planInputMix(tier, cards, eligibleUnitSeconds);
  if (!mayTakePart(consent)) return { mix: plain, arm: null, enrolment };
  const filled = canFill(cards, eligibleUnitSeconds);
  let e = enrolment;
  if (!e) {
    if (!filled || !key) return { mix: plain, arm: null, enrolment: null };
    const s = stratum(tier);
    e = { experiment: EXPERIMENT_ID, key, arm: assignArm(key), stratum: s, at: now };
  }
  if (!filled) return { mix: plain, arm: `${e.arm}${NOT_FILLED_SUFFIX}`, enrolment: e };
  return { mix: planInputMix(tier, cards, eligibleUnitSeconds, ARM_SHARES[e.arm]), arm: e.arm, enrolment: e };
}

export function withoutHeldOut<T extends { items: { kind: string; forms: Record<string, string> }[] }>(corpus: T, heldOut: Readonly<Record<string, ReadonlySet<string>>>): T {
  const langs = Object.keys(heldOut);
  if (!langs.length) return corpus;
  const hit = (i: { kind: string; forms: Record<string, string> }) => i.kind === "word" && langs.some((l) => i.forms[l] !== undefined && heldOut[l].has(i.forms[l].normalize("NFC").toLowerCase().trim()));
  return { ...corpus, items: corpus.items.filter((i) => !hit(i)) };
}

export function heldOutWords(forms: { A: readonly { word: string; real: boolean }[]; B: readonly { word: string; real: boolean }[] } | null): Set<string> {
  if (!forms) return new Set();
  return new Set([...forms.A, ...forms.B].filter((i) => i.real).map((i) => i.word));
}
