export type NumberParse =
  | { status: "ok"; value: number }
  | { status: "ambiguous"; grouped: number; decimal: number; hint: string }
  | { status: "invalid" };

const INVALID: NumberParse = { status: "invalid" };

export function isEnglish(locale?: string): boolean {
  return !locale || /^en\b/i.test(locale);
}

function grouped(head: string, groups: string[]): boolean {
  return /^\d{1,3}$/.test(head) && groups.every((g) => /^\d{3}$/.test(g));
}

function mantissa(body: string, scientific: boolean): NumberParse {
  const dot = body.lastIndexOf(".");
  const comma = body.lastIndexOf(",");
  if (dot >= 0 && comma >= 0) {
    const [mark, sep] = dot > comma ? [".", ","] : [",", "."];
    const cut = body.lastIndexOf(mark);
    const int = body.slice(0, cut);
    const frac = body.slice(cut + 1);
    const parts = int.split(sep);
    if (!/^\d*$/.test(frac) || !grouped(parts[0], parts.slice(1))) return INVALID;
    return { status: "ok", value: Number(`${parts.join("")}.${frac}`) };
  }
  const mark = dot >= 0 ? "." : comma >= 0 ? "," : "";
  if (!mark) return /^\d+$/.test(body) ? { status: "ok", value: Number(body) } : INVALID;
  const parts = body.split(mark);
  if (parts.length > 2) return grouped(parts[0], parts.slice(1)) ? { status: "ok", value: Number(parts.join("")) } : INVALID;
  const [int, frac] = parts;
  if (!/^\d*$/.test(int) || !/^\d*$/.test(frac) || !(int + frac)) return INVALID;
  const decimal = Number(`${int || "0"}.${frac || "0"}`);
  if (mark === "," && !scientific && frac.length === 3 && /^[1-9]\d{0,2}$/.test(int)) {
    const whole = Number(int + frac);
    return { status: "ambiguous", grouped: whole, decimal, hint: `Use ${whole} or ${int}.${frac} to make the decimal mark clear.` };
  }
  return { status: "ok", value: decimal };
}

function single(s: string): NumberParse {
  const m = s.match(/^([+-]?)([\d.,]+)(e[+-]?\d+)?$/i);
  if (!m) return INVALID;
  const sign = m[1] === "-" ? -1 : 1;
  const r = mantissa(m[2], Boolean(m[3]));
  const scale = (v: number) => (m[3] ? Number(`${sign * v}e${m[3].slice(1)}`) : sign * v);
  if (r.status === "ok") return { status: "ok", value: scale(r.value) };
  if (r.status === "ambiguous") return { ...r, grouped: scale(r.grouped), decimal: scale(r.decimal) };
  return r;
}

export function parseLocaleNumber(input: number | string): NumberParse {
  if (typeof input === "number") return Number.isFinite(input) ? { status: "ok", value: input } : INVALID;
  const s = String(input)
    .trim()
    .replace(/[−–—]/g, "-")
    .replace(/[\s\u00a0\u202f']+/g, "")
    .replace(/[×x·]10\^?/i, "e")
    .replace(/%$/, "");
  if (!s) return INVALID;
  const slash = s.split("/");
  if (slash.length === 2) {
    const a = single(slash[0]);
    const b = single(slash[1]);
    if (a.status === "invalid" || b.status === "invalid") return INVALID;
    const pick = (r: NumberParse, k: "grouped" | "decimal") => (r.status === "ok" ? r.value : r.status === "ambiguous" ? r[k] : NaN);
    if (pick(b, "grouped") === 0 || pick(b, "decimal") === 0) return INVALID;
    if (a.status === "ambiguous" || b.status === "ambiguous") {
      const hint = (a.status === "ambiguous" ? a : (b as Extract<NumberParse, { status: "ambiguous" }>)).hint;
      return { status: "ambiguous", grouped: pick(a, "grouped") / pick(b, "grouped"), decimal: pick(a, "decimal") / pick(b, "decimal"), hint };
    }
    return { status: "ok", value: pick(a, "grouped") / pick(b, "grouped") };
  }
  return slash.length === 1 ? single(s) : INVALID;
}

export function resolveNumber(parse: NumberParse, locale?: string): number | null {
  if (parse.status === "ok") return parse.value;
  if (parse.status === "ambiguous" && isEnglish(locale) && Number.isFinite(parse.grouped)) return parse.grouped;
  return null;
}

export function formatNumber(value: number, locale = "en"): string {
  return new Intl.NumberFormat(locale, { maximumSignificantDigits: 15, useGrouping: false }).format(value);
}
