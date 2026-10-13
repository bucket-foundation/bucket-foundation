import type { Item } from "../../src/grade";

const words = ["heat", "light", "mass", "charge", "force", "field", "wave", "time", "spin", "flow", "load", "salt"];

export const LEARN_ITEMS: Item[] = words.map((w, n) => ({
  id: `deck/${w}/0`,
  atomId: w,
  branch: "deck",
  title: `Topic ${w}`,
  level: "recall",
  prompt: `Which word names ${w}?`,
  answer: `the ${w}`,
}));
