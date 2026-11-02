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

const COMBINING_MARKS = new RegExp("\\p{M}", "gu");
const REPEATED_LETTER = new RegExp("(.)\\1+", "gu");
const NON_LETTERS = new RegExp("[^\\p{L}]+", "gu");

function plainLetters(input: string): string {
  return input
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .replace(/ß/g, "ss")
    .toLowerCase()
    .replace(/[01345@7$!]/g, (c) => LEET[c]);
}

function withoutRepeats(word: string): string {
  return word.replace(REPEATED_LETTER, "$1");
}

export function nameAllowed(name: string): boolean {
  const plain = plainLetters(name);
  const words = plain.split(NON_LETTERS).filter(Boolean);
  if (words.some((w) => BLOCKED_WORDS.has(w) || BLOCKED_WORDS.has(withoutRepeats(w)))) return false;
  const squashed = plain.replace(NON_LETTERS, "");
  return !withoutRepeats(squashed).includes("fuck") && !SQUASHED_ROOTS.some((root) => squashed.includes(root));
}
