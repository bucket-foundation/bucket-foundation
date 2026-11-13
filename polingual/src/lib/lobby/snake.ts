export const WORLD_W = 1600;
export const WORLD_H = 1000;
export const SPEED = 140;
export const TURN = 3.2;
export const SEG = 9;
export const START_LEN = 8;
export const MIN_LEN = 4;
export const GROW = 3;
export const SHRINK = 3;
export const EAT_R = 26;
export const HIT_R = 10;
export const WORDS_ON_FIELD = 18;
export const GOOD_SHARE = 0.55;
export const BOT_MAX = 30;

export interface Pt {
  x: number;
  y: number;
}

export interface Snake {
  id: string;
  name: string;
  bot: boolean;
  skill: number;
  angle: number;
  body: Pt[];
  length: number;
  alive: boolean;
  color: string;
}

export interface FieldWord {
  id: number;
  x: number;
  y: number;
  form: string;
  lang: string;
  meaning: string;
  good: boolean;
}

export interface Arena {
  snakes: Snake[];
  words: FieldWord[];
  nextWord: number;
  eaten: FieldWord[];
  bad: FieldWord[];
}

export type Rand = () => number;

export function makeSnake(id: string, name: string, bot: boolean, skill: number, at: Pt, angle: number, color: string): Snake {
  const body = Array.from({ length: START_LEN }, (_, i) => ({ x: at.x - Math.cos(angle) * SEG * i, y: at.y - Math.sin(angle) * SEG * i }));
  return { id, name, bot, skill, angle, body, length: START_LEN, alive: true, color };
}

export function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function wrapAngle(a: number): number {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

export function steer(current: number, target: number, dt: number): number {
  const d = wrapAngle(target - current);
  const max = TURN * dt;
  return wrapAngle(current + Math.max(-max, Math.min(max, d)));
}

export function advance(s: Snake, target: number, dt: number): Snake {
  if (!s.alive) return s;
  const angle = steer(s.angle, target, dt);
  const head = s.body[0];
  let x = head.x + Math.cos(angle) * SPEED * dt;
  let y = head.y + Math.sin(angle) * SPEED * dt;
  let a = angle;
  if (x < 0 || x > WORLD_W) {
    x = Math.max(0, Math.min(WORLD_W, x));
    a = wrapAngle(Math.PI - a);
  }
  if (y < 0 || y > WORLD_H) {
    y = Math.max(0, Math.min(WORLD_H, y));
    a = wrapAngle(-a);
  }
  const body = [{ x, y }, ...s.body];
  const out: Pt[] = [body[0]];
  for (let i = 1; i < body.length && out.length < s.length; i++) {
    const prev = out[out.length - 1];
    if (dist(prev, body[i]) >= SEG || i === body.length - 1) out.push(body[i]);
  }
  return { ...s, angle: a, body: out };
}

export function spawnWord(arena: Pick<Arena, "nextWord">, good: boolean, pool: { good: readonly Omit<FieldWord, "id" | "x" | "y" | "good">[]; decoys: readonly Omit<FieldWord, "id" | "x" | "y" | "good">[] }, rand: Rand): FieldWord {
  const list = good ? pool.good : pool.decoys;
  const w = list[Math.floor(rand() * list.length)];
  return { ...w, id: arena.nextWord, x: 60 + rand() * (WORLD_W - 120), y: 60 + rand() * (WORLD_H - 120), good };
}

export function botTarget(s: Snake, words: readonly FieldWord[], rand: Rand): number {
  const head = s.body[0];
  const wants = words.filter((w) => w.good || rand() > s.skill);
  const best = wants.sort((a, b) => dist(head, a) - dist(head, b))[0];
  if (!best) return s.angle;
  return Math.atan2(best.y - head.y, best.x - head.x);
}

export interface StepResult {
  arena: Arena;
  died: string[];
}

export function eat(arena: Arena, pool: Parameters<typeof spawnWord>[2], rand: Rand): Arena {
  let words = arena.words.slice();
  let nextWord = arena.nextWord;
  const eaten = arena.eaten.slice();
  const bad = arena.bad.slice();
  const snakes = arena.snakes.map((s) => {
    if (!s.alive) return s;
    let length = s.length;
    words = words.filter((w) => {
      if (dist(s.body[0], w) > EAT_R) return true;
      length = w.good ? length + GROW : Math.max(MIN_LEN, length - SHRINK);
      if (!s.bot) (w.good ? eaten : bad).push(w);
      return false;
    });
    return { ...s, length: s.bot ? Math.min(BOT_MAX, length) : length };
  });
  while (words.length < WORDS_ON_FIELD) {
    words.push(spawnWord({ nextWord }, rand() < GOOD_SHARE, pool, rand));
    nextWord++;
  }
  return { snakes, words, nextWord, eaten, bad };
}

export function collide(arena: Arena): StepResult {
  const died: string[] = [];
  const snakes = arena.snakes.map((s) => {
    if (!s.alive) return s;
    for (const o of arena.snakes) {
      if (o.id === s.id || !o.alive) continue;
      const hit = o.body.slice(1).some((p) => dist(s.body[0], p) < HIT_R);
      if (hit && s.length <= o.length) {
        died.push(s.id);
        return { ...s, alive: false };
      }
    }
    return s;
  });
  return { arena: { ...arena, snakes }, died };
}
