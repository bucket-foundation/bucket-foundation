type Joining = "D" | "R" | "U";

const DUAL: Record<number, number> = {
  0x0626: 0xfe89, 0x0628: 0xfe8f, 0x062a: 0xfe95, 0x062b: 0xfe99, 0x062c: 0xfe9d, 0x062d: 0xfea1, 0x062e: 0xfea5,
  0x0633: 0xfeb1, 0x0634: 0xfeb5, 0x0635: 0xfeb9, 0x0636: 0xfebd, 0x0637: 0xfec1, 0x0638: 0xfec5, 0x0639: 0xfec9,
  0x063a: 0xfecd, 0x0641: 0xfed1, 0x0642: 0xfed5, 0x0643: 0xfed9, 0x0644: 0xfedd, 0x0645: 0xfee1, 0x0646: 0xfee5,
  0x0647: 0xfee9, 0x064a: 0xfef1, 0x0679: 0xfb66, 0x067e: 0xfb56, 0x0686: 0xfb7a, 0x06a9: 0xfb8e, 0x06af: 0xfb92,
  0x06be: 0xfbaa, 0x06c1: 0xfba6, 0x06cc: 0xfbfc,
};

const RIGHT: Record<number, number> = {
  0x0622: 0xfe81, 0x0623: 0xfe83, 0x0624: 0xfe85, 0x0625: 0xfe87, 0x0627: 0xfe8d, 0x0629: 0xfe93, 0x062f: 0xfea9,
  0x0630: 0xfeab, 0x0631: 0xfead, 0x0632: 0xfeaf, 0x0648: 0xfeed, 0x0649: 0xfeef, 0x0688: 0xfb88, 0x0691: 0xfb8c,
  0x0698: 0xfb8a, 0x06ba: 0xfb9e, 0x06d2: 0xfbae, 0x06d3: 0xfbb0,
};

const LAM = 0x0644;
const LAM_ALEF: Record<number, number> = { 0x0622: 0xfef5, 0x0623: 0xfef7, 0x0625: 0xfef9, 0x0627: 0xfefb };
const TATWEEL = 0x0640;

function isMark(cp: number): boolean {
  return (cp >= 0x0610 && cp <= 0x061a) || (cp >= 0x064b && cp <= 0x065f) || cp === 0x0670 || (cp >= 0x06d6 && cp <= 0x06ed) || (cp >= 0x0591 && cp <= 0x05c7);
}

function joining(cp: number): Joining {
  if (cp in DUAL || cp === TATWEEL) return "D";
  if (cp in RIGHT) return "R";
  return "U";
}

export function shapeArabic(text: string): string {
  const cps = [...text].map((c) => c.codePointAt(0)!);
  const neighbor = (i: number, step: number): Joining => {
    for (let j = i + step; j >= 0 && j < cps.length; j += step) if (!isMark(cps[j])) return joining(cps[j]);
    return "U";
  };
  let out = "";
  for (let i = 0; i < cps.length; i++) {
    const cp = cps[i];
    const type = joining(cp);
    if (type === "U" || cp === TATWEEL) {
      out += String.fromCodePoint(cp);
      continue;
    }
    const joinsPrev = neighbor(i, -1) === "D";
    if (cp === LAM && cps[i + 1] in LAM_ALEF) {
      out += String.fromCodePoint(LAM_ALEF[cps[i + 1]] + (joinsPrev ? 1 : 0));
      i++;
      continue;
    }
    const joinsNext = type === "D" && neighbor(i, 1) !== "U";
    if (type === "R") out += String.fromCodePoint(RIGHT[cp] + (joinsPrev ? 1 : 0));
    else out += String.fromCodePoint(DUAL[cp] + (joinsPrev && joinsNext ? 3 : joinsNext ? 2 : joinsPrev ? 1 : 0));
  }
  return out;
}

const RTL_CHAR = /[\u0590-\u05ff\u0600-\u06ff\u0750-\u077f\ufb1d-\ufdff\ufe70-\ufefc]/;
const LTR_CHAR = /[\p{L}\p{N}]/u;

function clusters(text: string): string[] {
  const out: string[] = [];
  for (const ch of text) {
    if (out.length > 0 && isMark(ch.codePointAt(0)!)) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
}

function strong(cluster: string): "R" | "L" | "N" {
  if (RTL_CHAR.test(cluster)) return "R";
  return LTR_CHAR.test(cluster) ? "L" : "N";
}

export function visualOrder(text: string): string {
  if (!RTL_CHAR.test(text)) return text;
  const cs = clusters(shapeArabic(text));
  const types = cs.map(strong);
  const runs: { ltr: boolean; items: string[] }[] = [];
  for (let i = 0; i < cs.length; i++) {
    let ltr = types[i] === "L";
    if (types[i] === "N") {
      const prev = types.slice(0, i).reverse().find((t) => t !== "N");
      const next = types.slice(i + 1).find((t) => t !== "N");
      ltr = prev === "L" && next === "L";
    }
    const last = runs[runs.length - 1];
    if (last && last.ltr === ltr) last.items.push(cs[i]);
    else runs.push({ ltr, items: [cs[i]] });
  }
  return runs
    .reverse()
    .map((r) => (r.ltr ? r.items : [...r.items].reverse()).join(""))
    .join("");
}
