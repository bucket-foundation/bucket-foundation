import type { Atom } from "./engine";
import { asciiMath, normSymbolic, numbersClose, parseNumber } from "./assess";

export interface GuardVerdict {
  leak: boolean;
  item?: string;
  reasons: string[];
}

const SHORT_WORDS = new Set([
  "to", "is", "of", "in", "on", "at", "as", "an", "or", "if", "by", "so", "be", "it", "we", "no", "do",
  "the", "and", "for", "are", "has", "was", "its", "not", "but", "can", "one", "two", "you",
]);

const STOP = new Set([
  "that", "this", "with", "from", "have", "when", "then", "than", "they", "their", "there", "which", "because", "into", "only",
  "each", "also", "does", "just", "your", "what", "will", "would", "been", "were", "more", "most", "some", "such", "these",
  "those", "over", "under", "between", "about", "where", "while", "both", "same", "other", "every", "it's", "its",
]);

function words(s: string): string[] {
  return Array.from(new Set((s.toLowerCase().match(/[a-z][a-z'-]{3,}/g) || []).filter((w) => !STOP.has(w))));
}

function isMath(token: string): boolean {
  if (!token || SHORT_WORDS.has(token.toLowerCase()) || /^[([{]*[a-z]{4,}[)\]},.;:]*$/i.test(token)) return false;
  return /[^a-z']/i.test(token) || token.length <= 3;
}

function trimBrackets(key: string): string {
  let k = key;
  for (const [open, close] of [["(", ")"], ["[", "]"], ["{", "}"]]) {
    const n = (c: string) => k.split(c).length - 1;
    while (n(open) > n(close) && k.startsWith(open)) k = k.slice(1);
    while (n(close) > n(open) && k.endsWith(close)) k = k.slice(0, -1);
    if (k.startsWith(open) && k.endsWith(close)) {
      let depth = 0;
      let wraps = false;
      for (let i = 0; i < k.length; i++) {
        if (k[i] === open) depth++;
        else if (k[i] === close && --depth === 0) {
          wraps = i === k.length - 1;
          break;
        }
      }
      if (wraps) k = k.slice(1, -1);
    }
  }
  return k;
}

export function answerEquations(answer: string): string[] {
  const out = new Set<string>();
  for (const clause of asciiMath(answer).split(/;|,\s/)) {
    const sides = clause.split("=");
    for (let i = 0; i + 1 < sides.length; i++) {
      const left = sides[i].trim().split(/\s+/);
      const lhs: string[] = [];
      for (let j = left.length - 1; j >= 0 && isMath(left[j]); j--) lhs.unshift(left[j]);
      const rhs: string[] = [];
      for (const t of sides[i + 1].trim().split(/\s+/)) {
        if (!isMath(t)) break;
        rhs.push(t);
      }
      if (!lhs.length || !rhs.length) continue;
      const key = trimBrackets(normSymbolic(`${lhs.join(" ")}=${rhs.join(" ")}`));
      if (key.length >= 3) out.add(key);
    }
  }
  return Array.from(out);
}

export function answerNumbers(text: string): number[] {
  const out: number[] = [];
  for (const hit of asciiMath(text).match(/[+-]?\d+(?:\.\d+)?(?:\s*x\s*10\s*\^\s*[+-]?\d+|e[+-]?\d+)?/gi) || []) {
    const value = parseNumber(hit);
    if (value == null) continue;
    if (hit.replace(/[^0-9]/g, "").length < 2 && Math.abs(value) < 10) continue;
    out.push(value);
  }
  return out;
}

export function leaksAnswerText(reply: string, answer: string, given = ""): string[] {
  const reasons: string[] = [];
  const r = normSymbolic(reply);
  const g = normSymbolic(given);
  for (const key of answerEquations(answer)) if (r.includes(key) && !g.includes(key)) reasons.push(`equation:${key}`);
  const inReply = answerNumbers(reply);
  const inGiven = answerNumbers(given);
  for (const v of answerNumbers(answer)) {
    if (inGiven.some((x) => numbersClose(x, v))) continue;
    if (inReply.some((x) => numbersClose(x, v))) reasons.push(`number:${v}`);
  }
  const want = words(answer.split(/[;:.](?:\s|$)/)[0] || answer);
  if (want.length >= 2) {
    const needed = want.length >= 4 ? 0.7 : 1;
    const sentences = reply.split(/(?<=[.!?])\s+/);
    for (let i = 0; i < sentences.length; i++) {
      const have = new Set(words(sentences.slice(i, i + 2).join(" ")));
      if (want.filter((w) => have.has(w)).length / want.length >= needed) {
        reasons.push("overlap");
        break;
      }
    }
  }
  return reasons;
}

export function leaksAnswer(reply: string, atom: Pick<Atom, "quiz">, learnerText = ""): GuardVerdict {
  for (const item of atom.quiz || []) {
    if (!item?.answer) continue;
    const reasons = leaksAnswerText(reply, item.answer, `${item.prompt} ${learnerText}`);
    if (reasons.length) return { leak: true, item: item.prompt, reasons };
  }
  return { leak: false, reasons: [] };
}
