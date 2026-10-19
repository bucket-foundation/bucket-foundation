const SHVA = "ְ";
const HATAF = { "ֱ": "e", "ֲ": "a", "ֳ": "o" } as const;
const VOWELS: Record<string, string> = {
  "ִ": "i",
  "ֵ": "e",
  "ֶ": "e",
  "ַ": "a",
  "ָ": "a",
  "ֹ": "o",
  "ֺ": "o",
  "ֻ": "u",
  "ׇ": "o",
  ...HATAF,
};
const DAGESH = "ּ";
const SHIN_DOT = "ׁ";
const SIN_DOT = "ׂ";
const GERESH = /[׳']/;

interface Letter {
  ch: string;
  vowel: string | null;
  shva: boolean;
  dagesh: boolean;
  sin: boolean;
  geresh: boolean;
  hataf: boolean;
}

function letters(word: string): Letter[] {
  const out: Letter[] = [];
  for (const c of Array.from(word.normalize("NFD"))) {
    if (/[א-ת]/.test(c)) {
      out.push({ ch: c, vowel: null, shva: false, dagesh: false, sin: false, geresh: false, hataf: false });
      continue;
    }
    const cur = out[out.length - 1];
    if (!cur) continue;
    if (c === SHVA) cur.shva = true;
    else if (c === DAGESH) cur.dagesh = true;
    else if (c === SIN_DOT) cur.sin = true;
    else if (c === SHIN_DOT) cur.sin = false;
    else if (GERESH.test(c)) cur.geresh = true;
    else if (VOWELS[c]) {
      cur.vowel = VOWELS[c];
      cur.hataf = c in HATAF;
    }
  }
  return out;
}

const FINAL: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };

function consonant(l: Letter, last: boolean): string {
  const ch = FINAL[l.ch] ?? l.ch;
  if (l.geresh) return ({ ג: "dZ", ז: "Z", צ: "tS" } as Record<string, string>)[ch] ?? "";
  switch (ch) {
    case "א":
    case "ע":
      return "";
    case "ב":
      return l.dagesh ? "b" : "v";
    case "ג":
      return "g";
    case "ד":
      return "d";
    case "ה":
      return last && !l.dagesh ? "" : "h";
    case "ו":
      return "v";
    case "ז":
      return "z";
    case "ח":
      return "X";
    case "ט":
    case "ת":
      return "t";
    case "י":
      return "j";
    case "כ":
      return l.dagesh && l.ch !== "ך" ? "k" : "X";
    case "ל":
      return "l";
    case "מ":
      return "m";
    case "נ":
      return "n";
    case "ס":
      return "s";
    case "פ":
      return l.dagesh && l.ch !== "ף" ? "p" : "f";
    case "צ":
      return "ts";
    case "ק":
      return "k";
    case "ר":
      return 'Q"';
    case "ש":
      return l.sin ? "s" : "S";
    default:
      return "";
  }
}

export interface Syllabified {
  parts: string[];
  nuclei: number[];
  reduced: Set<number>;
}

function segments(word: string): Syllabified {
  const ls = letters(word);
  const parts: string[] = [];
  const nuclei: number[] = [];
  const reduced = new Set<number>();
  const vowel = (v: string, weak = false) => {
    if (weak) reduced.add(nuclei.length);
    nuclei.push(parts.length);
    parts.push(v);
  };
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i];
    const next = ls[i + 1];
    const last = i === ls.length - 1;
    const prevVowel = i > 0 && ls[i - 1].vowel;
    if (l.ch === "ו" && !l.vowel && !l.shva && l.dagesh && i > 0) {
      vowel("u");
      continue;
    }
    if (l.ch === "ו" && l.vowel === "o" && i > 0 && !ls[i - 1].vowel) {
      vowel("o");
      continue;
    }
    if (l.ch === "ו" && !l.vowel && !l.dagesh && !l.shva && i > 0 && ls[i - 1].vowel) {
      parts.push("v");
      continue;
    }
    if (l.ch === "י" && !l.vowel && !l.shva && !l.dagesh && i > 0) {
      const pv = ls[i - 1].vowel;
      if (pv === "i" || pv === "e") continue;
      if (pv) {
        parts.push("j");
        continue;
      }
    }
    if (l.ch === "א" && !l.vowel && !l.shva && i > 0) continue;
    if (last && l.vowel === "a" && (l.ch === "ח" || l.ch === "ע" || (l.ch === "ה" && l.dagesh)) && prevVowel !== "a") {
      vowel("a");
      parts.push(consonant(l, false));
      continue;
    }
    const c = consonant(l, last && !l.vowel);
    if (c) parts.push(c);
    if (l.vowel) vowel(l.vowel, l.hataf);
    else if (l.shva && i === 0 && next && (FINAL[next.ch] ?? next.ch) === l.ch) vowel("e", true);
    else if (l.shva && i === 0 && next && "אע".includes(next.ch)) vowel("e", true);
    else if (l.shva && i === 0 && "ילמנר".includes(l.ch) && next && next.ch !== "ה") vowel("e", true);
  }
  return { parts, nuclei, reduced };
}

const IPA_VOWEL = /[aeiouɛɔ]/;

const BIBLICAL = /[ʕħɒθˤqː]/;

export function stressFromIpa(ipa: string, vowels: string[]): number | null {
  const clean = ipa.split(/[/[]/)[0].replace(/\([^)]*\)/g, "").replace(/[ˌ.]/g, "");
  if (BIBLICAL.test(clean)) return null;
  const words = clean.split(/\s+/).filter(Boolean);
  const w = words[words.length - 1];
  if (!w || !w.includes("ˈ")) return null;
  const seen = Array.from(w.matchAll(/[aeiou]/g)).map((m) => m[0]);
  if (seen.join("") !== vowels.join("")) return null;
  const [before, after] = w.split("ˈ");
  const count = (s: string) => Array.from(s.matchAll(/[aeiouɛɔ]/g)).length;
  const total = count(before) + count(after);
  if (!IPA_VOWEL.test(after)) return null;
  return total - count(before) - 1;
}

function defaultStress(syl: Syllabified): number {
  const vs = syl.nuclei.map((n) => syl.parts[n]);
  const n = vs.length;
  if (n < 2) return 0;
  const lastTwo = vs.slice(-2).join("");
  if (syl.parts.join("").endsWith("ajim")) return 1;
  if (syl.reduced.has(n - 2) || syl.nuclei[n - 1] === syl.parts.length - 1) return 0;
  if (lastTwo === "ee" || lastTwo === "oe" || lastTwo === "ea") return 1;
  return 0;
}

const IPA_PHONEMES: [RegExp, string][] = [
  [/t͡s|ts/g, "ts"],
  [/t͡ʃ|tʃ/g, "tS"],
  [/d͡ʒ|dʒ/g, "dZ"],
  [/ʃ/g, "S"],
  [/ʒ/g, "Z"],
  [/[χx]/g, "X"],
  [/[ʁr]/g, 'Q"'],
  [/ɡ/g, "g"],
  [/[ʔ.ˌ]/g, ""],
];

export function ipaPhonemes(ipa: string): string | null {
  const clean = ipa.split(/[/[]/)[0].replace(/\([^)]*\)/g, "").trim();
  if (!clean || BIBLICAL.test(clean) || /[^a-zʃʒχxʁrɡʔ.ˌˈ\s͡j]/.test(clean)) return null;
  let out = clean;
  for (const [re, to] of IPA_PHONEMES) out = out.replace(re, to);
  return out.replace(/ˈ([^aeiou]*)/g, "$1'");
}

const POINTED = /[\u05B0-\u05C7]/;

export function hebrewPhonemes(text: string, ipa?: string, verb = false): string | null {
  if (!POINTED.test(text)) return ipa ? ipaPhonemes(ipa) : null;
  const words = text.trim().split(/\s+/);
  return words
    .map((w, wi) => {
      const syl = segments(w);
      if (!syl.nuclei.length) return syl.parts.join("");
      const vowels = syl.nuclei.map((n) => syl.parts[n]);
      const fromEnd = wi === words.length - 1 && ipa && !verb ? stressFromIpa(ipa, vowels) : null;
      const k = Math.min(fromEnd ?? defaultStress(syl), syl.nuclei.length - 1);
      const at = syl.nuclei[syl.nuclei.length - 1 - k];
      return syl.parts.map((p, i) => (i === at ? `'${p}` : p)).join("");
    })
    .join(" ");
}
