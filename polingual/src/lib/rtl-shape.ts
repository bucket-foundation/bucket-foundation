type Joining = "D" | "R" | "U";

const DUAL: Record<number, number> = {
  0x0626: 0xfe89, 0x0628: 0xfe8f, 0x062a: 0xfe95, 0x062b: 0xfe99, 0x062c: 0xfe9d, 0x062d: 0xfea1, 0x062e: 0xfea5,
  0x0633: 0xfeb1, 0x0634: 0xfeb5, 0x0635: 0xfeb9, 0x0636: 0xfebd, 0x0637: 0xfec1, 0x0638: 0xfec5, 0x0639: 0xfec9,
  0x063a: 0xfecd, 0x0641: 0xfed1, 0x0642: 0xfed5, 0x0643: 0xfed9, 0x0644: 0xfedd, 0x0645: 0xfee1, 0x0646: 0xfee5,
  0x0647: 0xfee9, 0x064a: 0xfef1, 0x067e: 0xfb56, 0x0686: 0xfb7a, 0x06a9: 0xfb8e, 0x06af: 0xfb92, 0x06cc: 0xfbfc,
};

const RIGHT: Record<number, number> = {
  0x0622: 0xfe81, 0x0623: 0xfe83, 0x0624: 0xfe85, 0x0625: 0xfe87, 0x0627: 0xfe8d, 0x0629: 0xfe93, 0x062f: 0xfea9,
  0x0630: 0xfeab, 0x0631: 0xfead, 0x0632: 0xfeaf, 0x0648: 0xfeed, 0x0649: 0xfeef, 0x0698: 0xfb8a,
};

const TATWEEL = 0x0640;

function isMark(cp: number): boolean {
  return (cp >= 0x064b && cp <= 0x065f) || cp === 0x0670 || (cp >= 0x0591 && cp <= 0x05c7);
}

function joining(cp: number): Joining {
  if (cp in DUAL || cp === TATWEEL) return "D";
  if (cp in RIGHT) return "R";
  return "U";
}

export function shapeArabic(text: string): string {
  const cps = [...text].map((c) => c.codePointAt(0)!);
  const neighbor = (i: number, step: number) => {
    for (let j = i + step; j >= 0 && j < cps.length; j += step) if (!isMark(cps[j])) return joining(cps[j]);
    return "U";
  };
  return cps
    .map((cp, i) => {
      const type = joining(cp);
      if (type === "U" || cp === TATWEEL) return String.fromCodePoint(cp);
      const joinsPrev = neighbor(i, -1) === "D";
      const joinsNext = type === "D" && neighbor(i, 1) !== "U";
      if (type === "R") return String.fromCodePoint(RIGHT[cp] + (joinsPrev ? 1 : 0));
      const base = DUAL[cp];
      return String.fromCodePoint(base + (joinsPrev && joinsNext ? 3 : joinsNext ? 2 : joinsPrev ? 1 : 0));
    })
    .join("");
}

const RTL_CHARS = /[\u0590-\u05ff\u0600-\u06ff\u0750-\u077f\ufb1d-\ufdff\ufe70-\ufefc]/;

export function visualOrder(text: string): string {
  if (!RTL_CHARS.test(text)) return text;
  const clusters: string[] = [];
  for (const ch of shapeArabic(text)) {
    if (clusters.length > 0 && isMark(ch.codePointAt(0)!)) clusters[clusters.length - 1] += ch;
    else clusters.push(ch);
  }
  return clusters.reverse().join("");
}
