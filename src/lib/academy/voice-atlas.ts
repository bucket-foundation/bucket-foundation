import type { LangItem } from "./lang-systems";
import { BOTS, unit } from "./lobby-bots";
import { seededRandom } from "./lobbies";

export const ATLAS_ROUNDS = 5;
export const ATLAS_MAX = 5000;
export const ATLAS_SCALE_KM = 1800;

export type LatLon = [number, number];

export const ATLAS_HOMES: Record<string, LatLon[]> = {
  es: [[40.4, -3.7], [19.4, -99.1], [4.7, -74.1], [-34.6, -58.4], [-12.0, -77.0], [-33.4, -70.6]],
  fr: [[48.9, 2.4], [45.5, -73.6], [50.8, 4.4], [14.7, -17.4], [5.3, -4.0]],
  de: [[52.5, 13.4], [48.2, 16.4], [47.4, 8.5]],
  it: [[41.9, 12.5], [45.5, 9.2]],
  pt: [[38.7, -9.1], [-23.5, -46.6], [-15.8, -47.9], [-8.8, 13.2]],
  nl: [[52.4, 4.9], [51.2, 4.4]],
  sv: [[59.3, 18.1], [57.7, 12.0]],
  ja: [[35.7, 139.7], [34.7, 135.5]],
  zh: [[39.9, 116.4], [31.2, 121.5], [25.0, 121.5], [1.35, 103.8]],
  ko: [[37.6, 127.0], [35.2, 129.1]],
  ru: [[55.8, 37.6], [59.9, 30.3], [55.0, 82.9], [43.2, 76.9]],
  ar: [[30.0, 31.2], [24.7, 46.7], [33.9, 35.5], [33.6, -7.6], [33.3, 44.4]],
  hi: [[28.6, 77.2], [19.1, 72.9], [25.6, 85.1]],
  el: [[38.0, 23.7], [35.2, 33.4]],
  tr: [[41.0, 29.0], [39.9, 32.9]],
};

export interface AtlasRound {
  lang: string;
  form: string;
  meaning: string;
  itemId: string;
}

export interface AtlasGhost {
  name: string;
  flag: string;
  skill: string;
  score: number;
}

function seedOf(key: string): string {
  return String(Math.floor(unit(key) * 2 ** 52) + 1);
}

export function atlasRounds(items: readonly LangItem[], date: string, count = ATLAS_ROUNDS + 1, root = "en"): AtlasRound[] {
  const rand = seededRandom(seedOf(`voice-atlas:${date}`));
  const langs = Object.keys(ATLAS_HOMES).filter((l) => l !== root);
  const words = items.filter((i) => i.kind === "word" && i.forms[root]);
  const out: AtlasRound[] = [];
  const usedLangs = new Set<string>();
  for (let tries = 0; out.length < count && tries < 400; tries++) {
    const free = langs.filter((l) => !usedLangs.has(l));
    const lang = free[Math.floor(rand() * free.length)];
    const pool = words.filter((w) => w.forms[lang] && w.forms[lang] !== w.forms[root] && w.forms[lang].length <= 24);
    if (!pool.length) {
      usedLangs.add(lang);
      continue;
    }
    const item = pool[Math.floor(rand() * Math.min(pool.length, 800))];
    usedLangs.add(lang);
    out.push({ lang, form: item.forms[lang], meaning: item.forms[root], itemId: item.id });
  }
  return out;
}

export function distanceKm(a: LatLon, b: LatLon): number {
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad;
  const dLon = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function nearestHome(lang: string, pin: LatLon): { home: LatLon; km: number } | null {
  const homes = ATLAS_HOMES[lang];
  if (!homes?.length) return null;
  return homes.map((home) => ({ home, km: distanceKm(pin, home) })).sort((a, b) => a.km - b.km)[0];
}

export function atlasPoints(km: number): number {
  if (km <= 150) return ATLAS_MAX;
  return Math.round(ATLAS_MAX * Math.exp(-(km - 150) / ATLAS_SCALE_KM));
}

export function atlasGhosts(date: string, count = 5): AtlasGhost[] {
  const span: Record<string, [number, number]> = { easy: [4000, 11000], medium: [9000, 17000], hard: [15000, 23500] };
  return BOTS.map((b) => ({ b, k: unit(`atlas:${date}:${b.userId}`) }))
    .sort((x, y) => x.k - y.k)
    .slice(0, count)
    .map(({ b }) => {
      const [lo, hi] = span[b.skill];
      return { name: b.name, flag: b.flag, skill: b.skill, score: lo + Math.floor(unit(`atlas-score:${date}:${b.userId}`) * (hi - lo)) };
    })
    .sort((a, b) => b.score - a.score);
}
