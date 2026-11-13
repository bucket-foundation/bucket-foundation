const MASK = (1n << 64n) - 1n;
const GOLDEN = 0x9e3779b97f4a7c15n;

export class SeededRandom {
  private state: bigint;

  constructor(seed: bigint) {
    this.state = (seed & MASK) === 0n ? GOLDEN : seed & MASK;
  }

  next(): bigint {
    let s = this.state;
    s ^= (s << 13n) & MASK;
    s ^= s >> 7n;
    s ^= (s << 17n) & MASK;
    this.state = s;
    return s;
  }

  below(upper: number): number {
    const bound = BigInt(upper);
    let m = this.next() * bound;
    let low = m & MASK;
    if (low < bound) {
      const t = ((1n << 64n) - bound) % bound;
      while (low < t) {
        m = this.next() * bound;
        low = m & MASK;
      }
    }
    return Number(m >> 64n);
  }

  element<T>(xs: readonly T[]): T | undefined {
    return xs.length ? xs[this.below(xs.length)] : undefined;
  }

  shuffled<T>(xs: readonly T[]): T[] {
    const a = [...xs];
    let amount = a.length;
    let current = 0;
    while (amount > 1) {
      const r = this.below(amount);
      amount -= 1;
      const j = current + r;
      [a[current], a[j]] = [a[j], a[current]];
      current += 1;
    }
    return a;
  }
}

export function mixed<T>(xs: readonly T[], rng: SeededRandom): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Number(rng.next() % BigInt(i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function fnv(text: string): bigint {
  let h = 0xcbf29ce484222325n;
  for (const b of new TextEncoder().encode(text)) {
    h ^= BigInt(b);
    h = (h * 0x100000001b3n) & MASK;
  }
  return h;
}

export function dailySeed(day: string, root: string, targets: readonly string[]): bigint {
  return fnv(`${day}|${root}|${[...targets].sort().join(",")}`);
}

export function dayKey(now: number = Date.now(), date: Date = new Date(now)): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}
