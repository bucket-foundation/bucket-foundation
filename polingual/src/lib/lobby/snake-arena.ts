import { BOTS } from "@academy/lobby-bots";
import { tokens } from "@/ui/tokens";
import { advance, botTarget, collide, eat, makeSnake, WORLD_H, WORLD_W, type Arena, type FieldWord } from "./snake";

const COLORS = [tokens.color.lapis, tokens.color.ochre, tokens.color.maya, tokens.color.malachite, tokens.color.vermilion];
const SKILL: Record<string, number> = { easy: 0.55, medium: 0.8, hard: 0.95 };

export function seedRand(seed: number): () => number {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 2 ** 32;
  };
}

export function newArena(rand: () => number): Arena {
  const bots = BOTS.slice(0, 4).map((b, i) => makeSnake(b.userId, b.name, true, SKILL[b.skill] ?? 0.8, { x: 200 + rand() * 1200, y: 150 + rand() * 700 }, rand() * 6.28, COLORS[i + 1]));
  return { snakes: [makeSnake("me", "You", false, 1, { x: WORLD_W / 2, y: WORLD_H / 2 }, 0, tokens.color.card), ...bots], words: [], nextWord: 0, eaten: [], bad: [] };
}

type Pool = Parameters<typeof eat>[1];

export function tick(arena: Arena, pool: Pool, rand: () => number, aim: number | null, dt: number): { arena: Arena; sound: "miss" | "hit" | null } {
  let a: Arena = { ...arena, snakes: arena.snakes.map((s) => (s.alive ? advance(s, s.bot ? botTarget(s, arena.words, rand) : aim ?? s.angle, dt) : s)) };
  const goodBefore = a.eaten.length;
  const badBefore = a.bad.length;
  a = eat(a, pool, rand);
  const sound = a.bad.length > badBefore ? "miss" : a.eaten.length > goodBefore ? "hit" : null;
  const c = collide(a);
  a = { ...c.arena, snakes: c.arena.snakes.map((s) => (s.bot && !s.alive ? makeSnake(s.id, s.name, true, s.skill, { x: 100 + rand() * 1400, y: 100 + rand() * 800 }, rand() * 6.28, s.color) : s)) };
  return { arena: a, sound };
}

export function respawnMe(a: Arena): Arena {
  const me = a.snakes.find((s) => s.id === "me");
  return { ...a, snakes: a.snakes.map((s) => (s.id === "me" ? { ...makeSnake("me", "You", false, 1, { x: WORLD_W / 2, y: WORLD_H / 2 }, 0, s.color), length: me?.length ?? s.length } : s)) };
}

export function uniqueWords(words: readonly FieldWord[]): FieldWord[] {
  return Array.from(new Map(words.map((w) => [`${w.lang}:${w.form}`, w])).values());
}
