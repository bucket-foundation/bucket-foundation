const BLOCKED_WORDS = new Set([
  "anal", "arsehole", "ass", "asshole", "bastard", "bitch", "bollocks", "bullshit", "chink", "cock", "cocksucker", "cunt", "dickhead", "dildo",
  "fag", "faggot", "fuck", "fucker", "fucking", "gook", "hitler", "jizz", "kike", "motherfucker", "nazi", "nigga", "nigger", "paki", "piss", "porn", "porno",
  "pussy", "rape", "rapist", "retard", "shit", "shithead", "slut", "spic", "tits", "tranny", "twat", "wanker", "wetback", "whore",
  "cabron", "cabrona", "chinga", "chingada", "cojones", "culero", "gilipollas", "hijoputa", "joder", "maricon", "marica", "mierda", "pendejo", "pendeja", "perra", "puta", "puto",
  "connard", "connasse", "encule", "enculer", "merde", "pute", "salaud", "salope",
  "arsch", "arschloch", "ficken", "fotze", "hure", "hurensohn", "scheisse", "schlampe", "wichser",
  "bastardo", "cazzo", "coglione", "fanculo", "merda", "minchia", "puttana", "stronzo", "vaffanculo",
  "caralho", "foda", "viado",
]);

const SQUASHED_ROOTS = ["faggot", "nigger", "nigga"];

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s", "!": "i" };

const CONFUSABLE: Record<string, string> = {
  а: "a", в: "b", с: "c", е: "e", ё: "e", һ: "h", н: "h", і: "i", ї: "i", ј: "j", к: "k", м: "m", о: "o", р: "p", ѕ: "s", т: "t", у: "y", х: "x", ԁ: "d", ԛ: "q", ԝ: "w",
  α: "a", β: "b", ε: "e", η: "n", ι: "i", κ: "k", ν: "v", ο: "o", ρ: "p", τ: "t", υ: "u", χ: "x", γ: "y", μ: "u",
};
const CONFUSABLE_CHARS = new RegExp(`[${Object.keys(CONFUSABLE).join("")}]`, "gu");
const FORMAT_CHARS = new RegExp("[\\p{Cf}\\u034f\\u115f\\u1160\\u3164]", "gu");
const MAX_JOIN = 6;

const COMBINING_MARKS = new RegExp("\\p{M}", "gu");
const REPEATED_LETTER = new RegExp("(.)\\1+", "gu");
const NON_LETTERS = new RegExp("[^\\p{L}]+", "gu");

function plainLetters(input: string): string {
  return input
    .normalize("NFKC")
    .replace(FORMAT_CHARS, "")
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .replace(/ß/g, "ss")
    .toLowerCase()
    .replace(CONFUSABLE_CHARS, (c) => CONFUSABLE[c])
    .replace(/[01345@7$!]/g, (c) => LEET[c]);
}

function blocked(word: string): boolean {
  return BLOCKED_WORDS.has(word) || BLOCKED_WORDS.has(withoutRepeats(word));
}

function withoutRepeats(word: string): string {
  return word.replace(REPEATED_LETTER, "$1");
}

export function nameAllowed(name: string): boolean {
  const plain = plainLetters(name);
  const words = plain.split(NON_LETTERS).filter(Boolean);
  if (words.some(blocked)) return false;
  for (let i = 0; i < words.length; i++) {
    if (words[i].length > 3) continue;
    let joined = words[i];
    let singles = words[i].length === 1;
    for (let j = i + 1; j < Math.min(words.length, i + MAX_JOIN) && words[j].length <= 3; j++) {
      joined += words[j];
      singles = singles && words[j].length === 1;
      if ((singles || joined.length >= 5) && blocked(joined)) return false;
    }
  }
  const squashed = plain.replace(NON_LETTERS, "");
  return !withoutRepeats(squashed).includes("fuck") && !SQUASHED_ROOTS.some((root) => squashed.includes(root));
}
