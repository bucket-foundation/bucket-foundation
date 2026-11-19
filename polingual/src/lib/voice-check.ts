const BANNED_WORDS = ["really", "very", "actually", "simply", "easily", "quickly", "usually", "typically", "generally", "especially", "seamless", "robust", "unlock", "crucial", "leverage", "boost"];

export const BANNED_MARKS = /[–—]/;
export const ANTITHESIS = /, not |\bnot just\b|\bnot only\b|\bisn't about\b| vs\.? /i;
export const BANNED_WORD = new RegExp(`\\b(${BANNED_WORDS.join("|")})\\b`, "i");
export const HEADING_FAULT = /[(),;]/;

export function voiceFaults(text: string): string[] {
  return [BANNED_MARKS, ANTITHESIS, BANNED_WORD].filter((r) => r.test(text)).map((r) => `${r} in: ${text}`);
}
