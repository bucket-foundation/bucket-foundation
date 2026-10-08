import data from "../../../learning/app/short-fields.json" with { type: "json" };
import { checkLimits, countTokens, LIMITS, parityOk } from "../../../src/lib/research-os/work-quiz/limits";
import { seededRandom, type Item, type Question } from "./grade";

export interface ShortField {
  short_stem: string;
  short_answer: string;
  source: "rule" | "model";
}

export interface ShortFile {
  version: string;
  items: Record<string, ShortField>;
}

export const SHORT_FIELDS: ShortFile = data as ShortFile;

export const normShort = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

export function withShort(item: Item, file: ShortFile = SHORT_FIELDS): Item {
  const s = file.items[item.id];
  return s ? { ...item, shortPrompt: s.short_stem, shortAnswer: s.short_answer } : item;
}

export function hasShort(item: Item): item is Item & { shortPrompt: string; shortAnswer: string } {
  return !!item.shortPrompt && !!item.shortAnswer;
}

function shuffle<T>(xs: T[], rand: () => number): T[] {
  const out = xs.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function shortLimitSec(prompt: string, answer: string): number {
  return Math.min(45, Math.max(20, Math.round((countTokens(prompt) + countTokens(answer)) * 1.5)));
}

export function buildShortQuestion(item: Item, pool: Item[], seed: string, choiceCount: number = LIMITS.choices): Question | null {
  if (!hasShort(item)) return null;
  const rand = seededRandom(seed + ":short:" + item.id);
  const answer = item.shortAnswer;
  const key = normShort(answer);
  const stem = normShort(item.shortPrompt);
  const others = pool.filter((o): o is Item & { shortAnswer: string } => o.id !== item.id && o.atomId !== item.atomId && !!o.shortAnswer && !!o.shortPrompt && normShort(o.shortAnswer) !== key);
  const ordered = [...shuffle(others.filter((o) => o.branch === item.branch), rand), ...shuffle(others.filter((o) => o.branch !== item.branch), rand)];
  const picked: string[] = [];
  for (const o of ordered) {
    if (picked.length >= choiceCount - 1) break;
    const c = o.shortAnswer;
    if (picked.some((p) => normShort(p) === normShort(c)) || stem.includes(normShort(c))) continue;
    if (!parityOk([answer, ...picked, c])) continue;
    picked.push(c);
  }
  if (picked.length < choiceCount - 1) return null;
  const choices = shuffle([answer, ...picked], rand);
  if (checkLimits({ prompt: item.shortPrompt, choices }).length > 0) return null;
  return { itemId: item.id, prompt: item.shortPrompt, choices, answerIndex: choices.indexOf(answer), limitSec: shortLimitSec(item.shortPrompt, answer) };
}
