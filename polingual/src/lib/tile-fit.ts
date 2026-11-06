const WIDE = /[ᄀ-ᇿ぀-ヿ㐀-鿿가-힯豈-﫿]/;

const SCRIPTS: [RegExp, number, number][] = [
  [WIDE, 1.05, 0],
  [/[஀-௿]/, 1.745, 0.85],
  [/[ऀ-෿]/, 1, 0.48],
  [/[฀-๿]/, 0.47, 0.99],
  [/[؀-ۿݐ-ݿ]/, 0.46, 1.67],
  [/[֐-׿]/, 0.45, 0.94],
  [/[Ͱ-ϿЀ-ӿἀ-῿]/, 0.645, 0.34],
];
const LATIN: [number, number] = [0.655, 0.27];

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

export function graphemes(s: string): number {
  let n = 0;
  for (const _ of segmenter.segment(s)) n++;
  return n;
}

export function tokens(word: string): string[] {
  return word.split(/\s+/).filter(Boolean);
}

export function longestToken(word: string): number {
  return Math.max(1, ...tokens(word).map(graphemes));
}

export function tokenEm(token: string): number {
  const hit = SCRIPTS.find(([re]) => re.test(token));
  const [per, base] = hit ? [hit[1], hit[2]] : LATIN;
  return per * graphemes(token) + base;
}

export function wordEm(word: string): number {
  return Math.max(0.5, ...tokens(word).map(tokenEm));
}

export const MAX_PX = 54;
export const MULTI_PX = 24;
export const TWO_LINE_READING_PX = 44;
export const MIN_PX = 12;
export const ROOM_CQI = 77;
export const ROOM_ICON_CQI = 74;

export function capPx(word: string, reading = ""): number {
  if (tokens(word).length > 1) return MULTI_PX;
  const width = [...reading].reduce((n, c) => n + (WIDE.test(c) ? 2 : 1), 0);
  return width > 18 ? TWO_LINE_READING_PX : MAX_PX;
}

export function fitCqi(word: string, room = ROOM_ICON_CQI): number {
  return Math.round((room / wordEm(word)) * 100) / 100;
}

export function fitPx(word: string, tileWidth: number, room = ROOM_ICON_CQI, reading = ""): number {
  return Math.max(MIN_PX, Math.min(capPx(word, reading), (fitCqi(word, room) * tileWidth) / 100));
}

export function fitVars(word: string, reading = ""): Record<string, string | number> {
  return { "--fit": fitCqi(word, ROOM_CQI), "--fit-icon": fitCqi(word, ROOM_ICON_CQI), "--cap": `${capPx(word, reading)}px` };
}
