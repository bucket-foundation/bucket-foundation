const SUP: Record<string, string> = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-", "⁺": "+" };

function asciiMath(input: unknown): string {
  let s = String(input == null ? "" : input);
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g, (run) => "^" + Array.from(run).map((ch) => SUP[ch] ?? "").join(""));
  return s
    .replace(/[×·∙*]/g, "x")
    .replace(/[−–—]/g, "-")
    .replace(/[≈~≃≅]/g, "")
    .replace(/\xa0/g, " ")
    .replace(/[,](?=\d{3}\b)/g, "");
}


export function legacyAssessParse(tok: unknown): number | null {
  if (tok == null) return null;
  let s = asciiMath(String(tok)).trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/\s*x\s*10\s*\^\s*([+-]?\d+)/g, "e$1");
  s = s.replace(/(^|[^0-9.])10\s*\^\s*([+-]?\d+)/g, "$11e$2");
  s = s.replace(/\s+/g, "");
  const fr = s.match(/^([+-]?\d+(?:\.\d+)?)\s*\/\s*([+-]?\d+(?:\.\d+)?)$/);
  if (fr) {
    const d = parseFloat(fr[2]);
    if (d === 0) return null;
    return parseFloat(fr[1]) / d;
  }
  if (/^[+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/.test(s)) return parseFloat(s);
  return null;
}

export function legacyQuestionParse(v: number | string): number {
  if (typeof v === "number") return v;
  const t = v.trim().replace(/,/g, "").replace(/\s+/g, "").replace(/[×x]10\^?/i, "e").replace(/%$/, "");
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) return NaN;
  return Number(t);
}
