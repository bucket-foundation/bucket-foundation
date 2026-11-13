import type { LangItem } from "./lang-systems";

export const TILE_LIVES = 3;
export const TILE_POINTS = 50;
export const TILE_MIN = 6;
export const TILE_MAX = 12;
export const TILE_ROUND_SECONDS = 6;
export const TILE_LANES = 4;
export const TILE_SUBMIT_AT = 0.9;
export const TILE_SPAWN_SPAN = 0.55;
export const TILE_FALL_FROM = 0.4;
export const TILE_FALL_TO = 0.25;

export interface Tile {
  lang: string;
  form: string;
}

export interface TileRow {
  lobby_id: string;
  round: number;
  lang: string;
  item_id: string;
  mode: "tiles";
  gloss: string;
  choices: string[];
  answer: string;
}

export function tileKey(t: Tile): string {
  return `${t.lang}:${t.form}`;
}

export function parseTile(key: string): Tile {
  const i = key.indexOf(":");
  return i < 0 ? { lang: "", form: key } : { lang: key.slice(0, i), form: key.slice(i + 1) };
}

export function tileCount(round: number, rounds: number): number {
  if (rounds <= 1) return TILE_MIN;
  return Math.min(TILE_MAX, TILE_MIN + Math.round(((TILE_MAX - TILE_MIN) * round) / (rounds - 1)));
}

export function parseTapped(choice: string, count: number): number[] | null {
  if (choice === "-") return [];
  if (!/^\d+(,\d+)*$/.test(choice)) return null;
  const out = Array.from(new Set(choice.split(",").map(Number))).sort((a, b) => a - b);
  return out.every((n) => n < count) ? out : null;
}

export function tappedChoice(indices: Iterable<number>): string {
  const xs = Array.from(new Set(indices)).sort((a, b) => a - b);
  return xs.length ? xs.join(",") : "-";
}

export interface TileOutcome {
  hits: number;
  wrong: number;
  missed: number;
  perfect: boolean;
}

export function tileOutcome(answer: string, tapped: readonly number[]): TileOutcome {
  const right = new Set(answer.split(",").filter(Boolean).map(Number));
  const hits = tapped.filter((i) => right.has(i)).length;
  const wrong = tapped.length - hits;
  const missed = right.size - hits;
  return { hits, wrong, missed, perfect: wrong === 0 && missed === 0 };
}

export function comboMultiplier(combo: number): number {
  return 1 + Math.min(combo, 4) * 0.5;
}

export interface TileHistory {
  combo: number;
  lives: number;
}

export function tileHistory(prior: readonly { round: number; correct: boolean }[], round: number): TileHistory {
  const rows = prior.filter((p) => p.round < round).sort((a, b) => a.round - b.round);
  if (rows.length === 0) return { combo: 0, lives: TILE_LIVES };
  const first = rows[0].round;
  const by = new Map(rows.map((r) => [r.round, r.correct]));
  let lives = TILE_LIVES;
  let combo = 0;
  for (let r = first; r < round; r++) {
    if (by.get(r) === true) combo++;
    else {
      combo = 0;
      lives--;
    }
  }
  return { combo, lives: Math.max(0, lives) };
}

export function tilePoints(outcome: TileOutcome, combo: number): number {
  const base = Math.max(0, outcome.hits - outcome.wrong) * TILE_POINTS;
  return Math.round(base * (outcome.perfect ? comboMultiplier(combo) : 1));
}

function shuffled<T>(xs: readonly T[], rand: () => number): T[] {
  const out = xs.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function buildTilePrompts(
  items: readonly LangItem[],
  lobby: { id: string; root: string; targets: string[]; rounds: number },
  langPool: readonly string[],
  rand: () => number,
): TileRow[] {
  const langs = Array.from(new Set([...lobby.targets, ...langPool])).filter((l) => l !== lobby.root);
  const words = items.filter((i) => i.kind === "word" && i.forms[lobby.root]);
  const candidates = shuffled(
    words.filter((i) => lobby.targets.some((l) => i.forms[l] && i.forms[l] !== i.forms[lobby.root])).slice(0, 600),
    rand,
  );
  const out: TileRow[] = [];
  const used = new Set<string>();
  for (const item of candidates) {
    if (out.length >= lobby.rounds) break;
    if (used.has(item.forms[lobby.root].toLowerCase())) continue;
    const round = out.length;
    const n = tileCount(round, lobby.rounds);
    const own = shuffled(
      langs.filter((l) => item.forms[l] && item.forms[l] !== item.forms[lobby.root]),
      rand,
    );
    const rightCount = Math.min(own.length, 2 + Math.floor((round * 3) / Math.max(1, lobby.rounds)));
    if (rightCount < 1) continue;
    const right: Tile[] = own.slice(0, rightCount).map((l) => ({ lang: l, form: item.forms[l] }));
    const taken = new Set(right.map(tileKey));
    const ownForms = new Set(Object.values(item.forms).map((f) => f.toLowerCase()));
    const foils: Tile[] = [];
    for (const other of shuffled(words.slice(0, 2000), rand)) {
      if (foils.length >= n - right.length) break;
      if (other.id === item.id || other.forms[lobby.root]?.toLowerCase() === item.forms[lobby.root].toLowerCase()) continue;
      const options = langs.filter((l) => other.forms[l] && !ownForms.has(other.forms[l].toLowerCase()));
      if (!options.length) continue;
      const lang = options[Math.floor(rand() * options.length)];
      const t = { lang, form: other.forms[lang] };
      if (taken.has(tileKey(t)) || tileKey(t).length > 60) continue;
      taken.add(tileKey(t));
      foils.push(t);
    }
    if (foils.length < 2) continue;
    const tiles = shuffled([...right, ...foils], rand);
    const answer = tiles.map((t, i) => (right.some((r) => tileKey(r) === tileKey(t)) ? i : -1)).filter((i) => i >= 0);
    used.add(item.forms[lobby.root].toLowerCase());
    out.push({ lobby_id: lobby.id, round, lang: right[0].lang, item_id: item.id, mode: "tiles", gloss: item.forms[lobby.root], choices: tiles.map(tileKey), answer: answer.join(",") });
  }
  return out;
}

export interface TileSchedule {
  index: number;
  lane: number;
  spawnMs: number;
  fallMs: number;
}

export function tileSchedule(count: number, round: number, rounds: number, roundSeconds: number): TileSchedule[] {
  const len = roundSeconds * 1000;
  const ramp = rounds <= 1 ? 0 : round / (rounds - 1);
  const fallMs = Math.round(len * (TILE_FALL_FROM - (TILE_FALL_FROM - TILE_FALL_TO) * ramp));
  const span = Math.min(len * TILE_SPAWN_SPAN, len * TILE_SUBMIT_AT - fallMs - 100);
  return Array.from({ length: count }, (_, i) => ({
    index: i,
    lane: (i * 3 + round) % TILE_LANES,
    spawnMs: count <= 1 ? 0 : Math.round((span * i) / (count - 1)),
    fallMs,
  }));
}

export function tileKnown(tiles: readonly Tile[], gloss: string, root: string, lookup: (lang: string, form: string) => readonly { forms: Record<string, string> }[]): number[] {
  return tiles.map((t, i) => (lookup(t.lang, t.form).some((it) => it.forms[root] === gloss) ? i : -1)).filter((i) => i >= 0);
}
