const WIDE = /[ᄀ-ᇿ぀-ヿ㐀-鿿가-힯豈-﫿]/;
const TAMIL = /[஀-௿]/;
const ARABIC = /[\u0600-\u06ff\u0750-\u077f]/;
const INDIC = /[ऀ-෿]/;
const CYRILLIC_GREEK = /[Ͱ-ϿЀ-ӿἀ-῿]/;

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

export function graphemes(s: string): number {
  let n = 0;
  for (const _ of segmenter.segment(s)) n++;
  return n;
}

export function longestToken(word: string): number {
  return Math.max(1, ...word.split(/\s+/).filter(Boolean).map(graphemes));
}

export function glyphWidth(word: string): number {
  if (WIDE.test(word)) return 1.05;
  if (TAMIL.test(word)) return 2;
  if (INDIC.test(word)) return 0.9;
  if (ARABIC.test(word)) return 0.95;
  if (CYRILLIC_GREEK.test(word)) return 0.68;
  return 0.64;
}

export const MAX_PX = 40;
export const MULTI_PX = 24;
export const MIN_PX = 10;

export function capPx(word: string): number {
  return word.trim().split(/\s+/).length > 1 ? MULTI_PX : MAX_PX;
}

export function fitPx(word: string, innerWidth: number, max = capPx(word)): number {
  return Math.max(MIN_PX, Math.min(max, innerWidth / (longestToken(word) * glyphWidth(word))));
}
