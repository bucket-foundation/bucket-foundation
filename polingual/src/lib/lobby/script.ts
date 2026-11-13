const SCRIPTS: [RegExp, string][] = [
  [/[Ѐ-ӿ]/, "Cyrillic"],
  [/[Ͱ-Ͽἀ-῿]/, "Greek"],
  [/[؀-ۿݐ-ݿ]/, "Arabic"],
  [/[֐-׿]/, "Hebrew"],
  [/[ऀ-ॿ]/, "Devanagari"],
  [/[ঀ-৿]/, "Bengali"],
  [/[਀-੿]/, "Gurmukhi"],
  [/[஀-௿]/, "Tamil"],
  [/[ఀ-౿]/, "Telugu"],
  [/[฀-๿]/, "Thai"],
  [/[Ⴀ-ჿ]/, "Georgian"],
  [/[԰-֏]/, "Armenian"],
  [/[ሀ-፿]/, "Ge'ez"],
  [/[가-힯ᄀ-ᇿ]/, "Hangul"],
  [/[぀-ゟ]/, "Hiragana"],
  [/[゠-ヿ]/, "Katakana"],
  [/[一-鿿㐀-䶿]/, "Han"],
  [/[A-Za-zÀ-ɏ]/, "Latin"],
];

export function scriptOf(word: string): string {
  if (/[\u4E00-\u9FFF]/.test(word) && /[\u3040-\u30FF]/.test(word)) return "Kanji and kana";
  for (const [re, name] of SCRIPTS) if (re.test(word)) return name;
  return "Other";
}
