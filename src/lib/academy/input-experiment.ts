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

export function stratum(tier: number): "to-a2" | "past-a2" {
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

export function assignArm(userKey: string, tier: number): ArmId {
  return ARM_IDS[fnv1a32(`${EXPERIMENT_ID}:${stratum(tier)}:${userKey}`) % ARM_IDS.length];
}

export function canFill(cards: number, eligibleUnitSeconds: readonly number[]): boolean {
  const eligible = eligibleUnitSeconds.filter((s) => s > 0).reduce((a, b) => a + b, 0);
  const cardTime = Math.max(0, cards) * CARD_SECONDS;
  return eligible > 0 && (cardTime === 0 || eligible / (eligible + cardTime) >= FILL_SHARE);
}

export interface ExperimentMix {
  mix: InputMix;
  arm: string | null;
}

export function experimentMix(on: boolean, userKey: string | null, tier: number, cards: number, eligibleUnitSeconds: readonly number[]): ExperimentMix {
  if (!on || !userKey) return { mix: planInputMix(tier, cards, eligibleUnitSeconds), arm: null };
  const arm = assignArm(userKey, tier);
  if (!canFill(cards, eligibleUnitSeconds)) return { mix: planInputMix(tier, cards, eligibleUnitSeconds), arm: `${arm}${NOT_FILLED_SUFFIX}` };
  return { mix: planInputMix(tier, cards, eligibleUnitSeconds, ARM_SHARES[arm]), arm };
}
