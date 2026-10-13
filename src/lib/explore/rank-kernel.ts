export const MICRO = 1_000_000;
export const MILLI = 1_000;
export const FIELD_COUNT = 4;
export const FIELD_WEIGHTS = [3, 2, 2, 1] as const;
export const K1_MILLI = 1_200;
export const B_NUM = 3;
export const B_DEN = 4;
export const BONUS_DEN = 4;
export const ALL_TERMS_BONUS_NUM = 1;
export const PHRASE_BONUS_NUM = 1;
export const EXACT_TITLE_BONUS_NUM = 2;
export const FLOOR_NUM = 1;
export const FLOOR_DEN = 2;
export const FOUNDING_BONUS_CAP_MICRO = MICRO;

export interface KernelQuery {
  idfMicro: number[];
  avgMilli: number[];
  floorNum: number;
  floorDen: number;
}

export interface KernelDoc {
  id: string;
  tf: number[][];
  len: number[];
  phrase: boolean;
  exactTitle: boolean;
  bonusMicro: number;
}

export interface KernelScore {
  id: string;
  score: number;
  lexical: number;
  matchedMicro: number;
  totalMicro: number;
}

export function idiv(a: number, b: number): number {
  return (a - (a % b)) / b;
}

export function termWeightMilli(tf: number[], len: number[], avgMilli: number[]): number {
  let x = 0;
  for (let f = 0; f < FIELD_COUNT; f++) {
    if (tf[f] > 0) x += idiv(FIELD_WEIGHTS[f] * tf[f] * B_DEN * avgMilli[f] * MILLI, (B_DEN - B_NUM) * avgMilli[f] + B_NUM * len[f] * MILLI);
  }
  return x;
}

export function clampBonus(bonusMicro: number): number {
  return bonusMicro < 0 ? 0 : bonusMicro > FOUNDING_BONUS_CAP_MICRO ? FOUNDING_BONUS_CAP_MICRO : bonusMicro;
}

export function kernelScore(q: KernelQuery, d: KernelDoc): KernelScore {
  let base = 0;
  let matchedMicro = 0;
  let totalMicro = 0;
  let matched = 0;
  const n = q.idfMicro.length;
  for (let t = 0; t < n; t++) {
    totalMicro += q.idfMicro[t];
    const x = termWeightMilli(d.tf[t], d.len, q.avgMilli);
    if (x > 0) {
      base += idiv(q.idfMicro[t] * x, K1_MILLI + x);
      matchedMicro += q.idfMicro[t];
      matched++;
    }
  }
  let lexical = 0;
  if (matched > 0 && totalMicro > 0 && q.floorDen * matchedMicro >= q.floorNum * totalMicro) {
    let m = BONUS_DEN;
    if (n > 1 && matched === n) m += ALL_TERMS_BONUS_NUM;
    if (n > 1 && d.phrase) m += PHRASE_BONUS_NUM;
    if (d.exactTitle) m += EXACT_TITLE_BONUS_NUM;
    lexical = idiv(base * m, BONUS_DEN);
  }
  return { id: d.id, score: lexical + clampBonus(d.bonusMicro), lexical, matchedMicro, totalMicro };
}

export function kernelOrder<T extends { id: string; score: number }>(a: T, b: T): number {
  return b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

export function kernelRank(q: KernelQuery, docs: KernelDoc[]): KernelScore[] {
  const out: KernelScore[] = [];
  for (const d of docs) {
    const s = kernelScore(q, d);
    if (s.score > 0) out.push(s);
  }
  return out.sort(kernelOrder);
}
