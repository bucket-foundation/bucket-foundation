const SHAPES: readonly RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{8,}/,
  /\bgh[pousr]_[A-Za-z0-9]{16,}/,
  /\bgithub_pat_[A-Za-z0-9_]{16,}/,
  /\b(AKIA|ASIA)[A-Z0-9]{16}\b/,
  /\bxox[abeprs]-[A-Za-z0-9-]{8,}/,
  /\bfigd_[A-Za-z0-9_-]{8,}/,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]*/,
  /-----(BEGIN|END) [A-Z0-9 ]*-----/,
  /^\s*(export\s+|set\s+)?[A-Za-z_][A-Za-z0-9_]*\s*=\s*\S/,
  /(key|token|secret|passw(or)?d|credential|bearer|authorization)\w*["']?\s*[=:]\s*\S/i,
  /\b(bearer|basic)\s+[A-Za-z0-9._~+/=-]{16,}/i,
  /[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:[^\s/@]+@/i,
  /[^\s@]+@[^\s@]+\.[A-Za-z]{2,}/,
];

const LONG = /[A-Za-z0-9+/=_-]{32,}/g;
const PEM_BEGIN = /-----BEGIN [A-Z0-9 ]*-----/;
const PEM_END = /-----END [A-Z0-9 ]*-----/;

export const ENTROPY_BITS = 3.5;

export function entropy(s: string): number {
  const n = new Map<string, number>();
  for (const c of s) n.set(c, (n.get(c) ?? 0) + 1);
  let h = 0;
  for (const k of n.values()) h -= (k / s.length) * Math.log2(k / s.length);
  return h;
}

export function secretLine(line: string): boolean {
  if (SHAPES.some((re) => re.test(line))) return true;
  for (const run of line.match(LONG) ?? []) if (/\d/.test(run) && /[A-Za-z]/.test(run) && entropy(run) >= ENTROPY_BITS) return true;
  return false;
}

export interface Scan {
  kept: string[];
  dropped: number;
}

export function scanLines(text: string): Scan {
  const kept: string[] = [];
  let dropped = 0;
  let pem = false;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const begins = PEM_BEGIN.test(line);
    if (pem || begins || secretLine(line)) dropped++;
    else kept.push(line);
    if (begins) pem = true;
    if (PEM_END.test(line)) pem = false;
  }
  return { kept, dropped };
}
