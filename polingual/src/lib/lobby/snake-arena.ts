import { BOTS } from "@academy/lobby-bots";
import { tokens } from "@/ui/tokens";
import { makeSnake, WORLD_H, WORLD_W, type Arena } from "./snake";

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
