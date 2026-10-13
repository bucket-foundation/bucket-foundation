import { createHash } from "node:crypto";
import { buildQuestion, type Item } from "../grade";

export const BANK_SEED = "hai-bank-v1";
export const BANK_CHOICES = 4;

export interface FrozenItem {
  id: string;
  atomId: string;
  branch: string;
  tier: string;
  choiceAtoms: string[];
  prompt: string;
  choices: string[];
  answerIndex: number;
  limitSec: number;
}

export interface Bank {
  version: string;
  packVersion: string;
  seed: string;
  items: FrozenItem[];
}

export type FlagKind = "duplicate-choice" | "contains-answer" | "near-answer" | "length-cue" | "too-few-choices" | "same-atom";

export interface Flag {
  itemId: string;
  kind: FlagKind;
  choice: number;
  detail: string;
}

export function freezeBank(items: Item[], packVersion: string, seed = BANK_SEED): Bank {
  const atomOf = new Map<string, string>();
  for (const i of items) if (!atomOf.has(i.answer)) atomOf.set(i.answer, i.atomId);
  const frozen = items.map((item) => {
    const q = buildQuestion(item, items, seed, BANK_CHOICES);
    const choiceAtoms = q.choices.map((c, i) => (i === q.answerIndex ? item.atomId : (atomOf.get(c) ?? "")));
    return { id: item.id, atomId: item.atomId, branch: item.branch, tier: item.level, prompt: q.prompt, choices: q.choices, answerIndex: q.answerIndex, limitSec: q.limitSec, choiceAtoms };
  });
  const version = createHash("sha256").update(JSON.stringify({ seed, frozen })).digest("hex").slice(0, 12);
  return { version, packVersion, seed, items: frozen };
}

export function normalize(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function tokens(s: string): Set<string> {
  return new Set(normalize(s).split(" ").filter((t) => t.length > 2));
}

export function jaccard(a: string, b: string): number {
  const x = tokens(a);
  const y = tokens(b);
  if (!x.size || !y.size) return 0;
  let inter = 0;
  for (const t of x) if (y.has(t)) inter++;
  return inter / (x.size + y.size - inter);
}

export const NEAR_ANSWER = 0.5;
export const LENGTH_CUE = 2;

export function reviewItem(item: FrozenItem): Flag[] {
  const flags: Flag[] = [];
  const answer = item.choices[item.answerIndex];
  const na = normalize(answer);
  if (item.choices.length < 4) flags.push({ itemId: item.id, kind: "too-few-choices", choice: -1, detail: `${item.choices.length} choices` });
  const seen = new Map<string, number>();
  item.choices.forEach((c, i) => {
    const n = normalize(c);
    if (seen.has(n)) flags.push({ itemId: item.id, kind: "duplicate-choice", choice: i, detail: `same as choice ${seen.get(n)! + 1}` });
    else seen.set(n, i);
    if (i === item.answerIndex) return;
    if (item.choiceAtoms[i] === item.atomId) flags.push({ itemId: item.id, kind: "same-atom", choice: i, detail: "distractor answers another question on the same atom" });
    if (n && na && (n.includes(na) || na.includes(n))) flags.push({ itemId: item.id, kind: "contains-answer", choice: i, detail: "distractor and answer contain each other" });
    else {
      const j = jaccard(c, answer);
      if (j >= NEAR_ANSWER) flags.push({ itemId: item.id, kind: "near-answer", choice: i, detail: `token overlap ${j.toFixed(2)}` });
    }
  });
  const others = item.choices.filter((_, i) => i !== item.answerIndex).map((c) => c.length);
  const longest = Math.max(...others, 1);
  if (answer.length >= LENGTH_CUE * longest) flags.push({ itemId: item.id, kind: "length-cue", choice: item.answerIndex, detail: `answer ${answer.length} chars, longest distractor ${longest}` });
  return flags;
}

export interface Review {
  bankVersion: string;
  flags: Flag[];
  cleared: string[];
}

export function reviewBank(bank: Bank, cleared: string[] = []): Review {
  return { bankVersion: bank.version, flags: bank.items.flatMap(reviewItem), cleared };
}

export function eligibleIds(bank: Bank, review: Review): Set<string> {
  if (review.bankVersion !== bank.version) throw new Error(`review is for bank ${review.bankVersion}, bank is ${bank.version}`);
  const flagged = new Set(review.flags.map((f) => f.itemId));
  const cleared = new Set(review.cleared);
  return new Set(bank.items.filter((i) => !flagged.has(i.id) || cleared.has(i.id)).map((i) => i.id));
}
