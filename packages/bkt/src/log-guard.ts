import { hasEmail } from "../../../src/lib/research-os/advisor-review";

export const GRAM = 20;
export const KEEP_ONE_IN = 2;
export const MAX_GRAMS = 8_000_000;
export const HIDDEN = "[line hidden: it repeated text from an input]";

const SAFE = /^\s*(Traceback \(most recent call last\):|File "[^"]*", line \d+|[A-Za-z_.]*(Error|Exception|Warning)\s*$|exited with code \d+|\d+ of \d+ )/;

function norm(s: string): string {
  return s.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ");
}

function grams(s: string, each: (h: number) => boolean | void): void {
  for (let i = 0; i + GRAM <= s.length; i++) {
    let h = 2166136261;
    for (let k = i; k < i + GRAM; k++) h = Math.imul(h ^ s.charCodeAt(k), 16777619);
    h >>>= 0;
    if (h % KEEP_ONE_IN === 0 && each(h) === true) return;
  }
}

export class LogGuard {
  private seen = new Set<number>();
  readonly strict: boolean;

  constructor(inputs: string[], maxGrams = MAX_GRAMS) {
    let over = false;
    for (const text of inputs) {
      if (over) break;
      grams(norm(text), (h) => {
        this.seen.add(h);
        if (this.seen.size > maxGrams) over = true;
        return over;
      });
    }
    if (over) this.seen.clear();
    this.strict = over;
  }

  line(l: string): string {
    if (hasEmail(l)) return HIDDEN;
    if (this.strict) return SAFE.test(l) ? l.slice(0, 200) : HIDDEN;
    let hit = false;
    grams(norm(l), (h) => (hit = this.seen.has(h)));
    return hit ? HIDDEN : l;
  }
}
