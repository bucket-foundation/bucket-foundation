const SHAPES: readonly RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{6,}/,
  /\b(sk|rk|pk)_(live|test)_[A-Za-z0-9]{4,}/,
  /\bwhsec_[A-Za-z0-9+/=_-]{4,}/,
  /\bhf_[A-Za-z0-9]{8,}/,
  /\bSG\.[A-Za-z0-9_-]{8,}/,
  /hooks\.slack\.com\/services/i,
  /\bgh[pousr]_[A-Za-z0-9]{8,}/,
  /\bgithub_pat_[A-Za-z0-9_]{8,}/,
  /\b(AKIA|ASIA)[A-Z0-9]{12,}\b/,
  /\bxox[abeprs]-[A-Za-z0-9-]{4,}/,
  /\bfigd_[A-Za-z0-9_-]{4,}/,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}/,
  /-----(BEGIN|END) [A-Z0-9 ]*-----/,
  /^\s*(export\s+|set\s+)?[A-Za-z_][A-Za-z0-9_]*\s*=\s*\S/,
  /(key|token|secret|passw(or)?d|passphrase|credential|bearer|authorization)\w*["']?\s*[=:]\s*\S/i,
  /\b(password|passwd|passphrase|secret|token|key)\s+(is|was|to)\s+(?!(to|the|a|an|in|on|of|for|not|that)\b)\S{4,}/i,
  /\b(password|passwd|passphrase|secret|token|key)\s+(?=\S*[\d!@#$%^&*])\S{5,}/i,
  /\b(bearer|basic)\s+[A-Za-z0-9._~+/=-]{16,}/i,
  /[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:[^\s/@]+@/i,
  /[^\s@]+@[^\s@]+\.[A-Za-z]{2,}/,
];

const LONG = /[A-Za-z0-9+/=_-]{32,}/g;
const SHORT = /[A-Za-z0-9]{20,}/g;
const PEM_BEGIN = /-----BEGIN [A-Z0-9 ]*-----/;
const PEM_END = /-----END [A-Z0-9 ]*-----/;

export const ENTROPY_BITS = 3;

export function entropy(s: string): number {
  const n = new Map<string, number>();
  for (const c of s) n.set(c, (n.get(c) ?? 0) + 1);
  let h = 0;
  for (const k of n.values()) h -= (k / s.length) * Math.log2(k / s.length);
  return h;
}

const mixed = (run: string) => /\d/.test(run) && /[A-Za-z]/.test(run) && entropy(run) >= ENTROPY_BITS;

const fragment = (word: string) => word.length >= 8 && /\d/.test(word) && /[A-Za-z]/.test(word);

export function secretLine(line: string): boolean {
  if (SHAPES.some((re) => re.test(line))) return true;
  return [...(line.match(LONG) ?? []), ...(line.match(SHORT) ?? [])].some(mixed);
}

export interface Scan {
  kept: string[];
  dropped: number;
}

export function scanLines(text: string): Scan {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const bad = lines.map(() => false);
  let pem = false;
  for (const [i, line] of lines.entries()) {
    const begins = PEM_BEGIN.test(line);
    bad[i] = pem || begins || secretLine(line);
    if (begins) pem = true;
    if (PEM_END.test(line)) pem = false;
  }
  const alone = [...bad];
  for (let i = 0; i + 1 < lines.length; i++) {
    const a = lines[i].trimEnd();
    const b = lines[i + 1].trimStart();
    if (alone[i] && alone[i + 1]) continue;
    if (alone[i]) bad[i + 1] ||= fragment(b.split(/\s+/)[0]);
    else if (alone[i + 1]) bad[i] ||= fragment(a.split(/\s+/).at(-1) ?? "");
    else if (secretLine(a + b) || secretLine(`${a} ${b}`)) bad[i] = bad[i + 1] = true;
  }
  return { kept: lines.filter((_, i) => !bad[i]), dropped: bad.filter(Boolean).length };
}
