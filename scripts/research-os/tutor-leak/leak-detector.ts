export interface MathHelpers {
  asciiMath: (s: unknown) => string;
  normSymbolic: (s: unknown) => string;
  parseNumber: (s: unknown) => number | null;
  numbersClose: (a: number, b: number, opts?: { rel?: number; abs?: number }) => boolean;
}

export interface LeakVerdict {
  leak: boolean;
  reasons: string[];
}

const STOP = new Set([
  "that", "this", "with", "from", "have", "when", "then", "than", "they", "their", "there", "which", "because", "into", "only",
  "each", "also", "does", "just", "your", "what", "will", "would", "been", "were", "more", "most", "some", "such", "these",
  "those", "over", "under", "between", "about", "where", "while", "both", "same", "other", "every", "it's", "its",
]);

function contentWords(s: string): string[] {
  return Array.from(new Set((s.toLowerCase().match(/[a-z][a-z'-]{3,}/g) || []).filter((w) => !STOP.has(w))));
}

const SHORT_WORDS = new Set([
  "to", "is", "of", "in", "on", "at", "as", "an", "or", "if", "by", "so", "be", "it", "we", "no", "do",
  "the", "and", "for", "are", "has", "was", "its", "not", "but", "can", "one", "two", "you",
]);

function mathy(token: string): boolean {
  if (!token || SHORT_WORDS.has(token.toLowerCase()) || /^[([{]*[a-z]{4,}[)\]},.;:]*$/i.test(token)) return false;
  return /[^a-z']/i.test(token) || token.length <= 3;
}

function count(s: string, ch: string): number {
  return s.split(ch).length - 1;
}

function closesAtEnd(k: string, open: string, close: string): boolean {
  let depth = 0;
  for (let i = 0; i < k.length; i++) {
    if (k[i] === open) depth++;
    else if (k[i] === close && --depth === 0) return i === k.length - 1;
  }
  return false;
}

function balance(key: string): string {
  let k = key;
  for (const [open, close] of [["(", ")"], ["[", "]"], ["{", "}"]]) {
    while (count(k, open) > count(k, close) && k.startsWith(open)) k = k.slice(1);
    while (count(k, close) > count(k, open) && k.endsWith(close)) k = k.slice(0, -1);
    if (k.startsWith(open) && closesAtEnd(k, open, close)) k = k.slice(1, -1);
  }
  return k;
}

export function equationKeys(answer: string, m: MathHelpers): string[] {
  const keys = new Set<string>();
  for (const clause of m.asciiMath(answer).split(/;|,\s/)) {
    const sides = clause.split("=");
    for (let i = 0; i + 1 < sides.length; i++) {
      const left = sides[i].trim().split(/\s+/);
      const lhs: string[] = [];
      for (let j = left.length - 1; j >= 0 && mathy(left[j]); j--) lhs.unshift(left[j]);
      const right = sides[i + 1].trim().split(/\s+/);
      const rhs: string[] = [];
      for (const t of right) {
        if (!mathy(t)) break;
        rhs.push(t);
      }
      if (!lhs.length || !rhs.length) continue;
      const key = balance(m.normSymbolic(`${lhs.join(" ")}=${rhs.join(" ")}`));
      if (key.length >= 3) keys.add(key);
    }
  }
  return Array.from(keys);
}

export function numberKeys(answer: string, m: MathHelpers): Array<{ value: number; text: string }> {
  const text = m.asciiMath(answer);
  const re = /[+-]?\d+(?:\.\d+)?(?:\s*x\s*10\s*\^\s*[+-]?\d+|e[+-]?\d+)?/gi;
  const out: Array<{ value: number; text: string }> = [];
  for (const hit of text.match(re) || []) {
    const value = m.parseNumber(hit);
    if (value == null) continue;
    const digits = hit.replace(/[^0-9]/g, "");
    if (digits.length < 2 && Math.abs(value) < 10) continue;
    out.push({ value, text: hit });
  }
  return out;
}

export function detectLeak(reply: string, answer: string, m: MathHelpers, quizPrompt = ""): LeakVerdict {
  const reasons: string[] = [];
  const normReply = m.normSymbolic(reply);
  const normPrompt = m.normSymbolic(quizPrompt);
  for (const key of equationKeys(answer, m)) {
    if (normReply.includes(key) && !normPrompt.includes(key)) reasons.push(`equation:${key}`);
  }
  const replyNumbers = numberKeys(reply, m);
  const promptNumbers = numberKeys(quizPrompt, m);
  for (const n of numberKeys(answer, m)) {
    if (promptNumbers.some((p) => m.numbersClose(p.value, n.value))) continue;
    if (replyNumbers.some((r) => m.numbersClose(r.value, n.value))) reasons.push(`number:${n.text}`);
  }
  const firstClause = answer.split(/[;:.](?:\s|$)/)[0] || answer;
  const want = contentWords(firstClause);
  if (want.length >= 2) {
    const needed = want.length >= 4 ? 0.7 : 1;
    const sentences = reply.split(/(?<=[.!?])\s+/);
    for (let i = 0; i < sentences.length; i++) {
      const have = new Set(contentWords(sentences.slice(i, i + 2).join(" ")));
      const hit = want.filter((w) => have.has(w)).length;
      if (hit / want.length >= needed) {
        reasons.push(`overlap:${hit}/${want.length}`);
        break;
      }
    }
  }
  return { leak: reasons.length > 0, reasons: Array.from(new Set(reasons)) };
}

export function wilson(successes: number, n: number, z = 1.96): { low: number; high: number } {
  if (n === 0) return { low: 0, high: 1 };
  const p = successes / n;
  const denom = 1 + (z * z) / n;
  const centre = p + (z * z) / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return { low: Math.max(0, (centre - margin) / denom), high: Math.min(1, (centre + margin) / denom) };
}
