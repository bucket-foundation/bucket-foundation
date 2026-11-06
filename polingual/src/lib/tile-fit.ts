const WIDE = /[ᄀ-ᇿ぀-ヿ㐀-鿿가-힯豈-﫿]/;
const TAMIL = /[஀-௿]/;
const INDIC = /[ऀ-෿]/;
const ARABIC = /[؀-ۿݐ-ݿ]/;
const THAI = /[฀-๿]/;
const HEBREW = /[֐-׿]/;
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
  if (INDIC.test(word)) return 1.05;
  if (ARABIC.test(word)) return 0.95;
  if (THAI.test(word) || HEBREW.test(word)) return 0.72;
  if (CYRILLIC_GREEK.test(word)) return 0.68;
  return 0.66;
}

export const MAX_PX = 54;
export const MULTI_PX = 24;
export const MIN_PX = 12;
export const ICON_RESERVE_PX = 44;

export const TWO_LINE_READING_PX = 44;

export function capPx(word: string, reading = ""): number {
  if (word.trim().split(/\s+/).length > 1) return MULTI_PX;
  const width = [...reading].reduce((n, c) => n + (WIDE.test(c) ? 2 : 1), 0);
  return width > 18 ? TWO_LINE_READING_PX : MAX_PX;
}

export function fitPx(word: string, innerWidth: number, max = capPx(word)): number {
  return Math.max(MIN_PX, Math.min(max, innerWidth / (longestToken(word) * glyphWidth(word))));
}

export function shrinkPx(currentPx: number, contentWidth: number, boxWidth: number): number {
  if (contentWidth <= boxWidth) return currentPx;
  return Math.max(MIN_PX, Math.floor(currentPx * (boxWidth / contentWidth) * 10) / 10);
}
