import { readFileSync, writeFileSync } from "node:fs";
import { buildEncompassingMap, grade, masteryFor, normalizeState, pickLevel, route, summary, withLeverage, type Atom } from "../../../src/lib/academy/engine";
import type { Rating } from "../../../src/lib/academy/fsrs";

const deck = JSON.parse(readFileSync(process.argv[2], "utf8")) as { atoms: Atom[] };
const atoms = withLeverage(deck.atoms);
const enc = buildEncompassingMap(atoms);
const byId = new Map(atoms.map((a) => [a.id, a]));

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 9, 20, 0, 0, 0);
const ratings: Rating[] = [3, 4, 1, 3, 2, 3, 3, 4, 1, 2, 3, 3, 3];
const days = [0, 1, 2, 3, 5, 6, 9, 10, 14, 20, 21, 30, 31, 45];
const hours = [8, 19];

let state = normalizeState(null);
let r = 0;
const sessions: unknown[] = [];
for (const day of days) {
  const tz = day >= 20 && day < 31 ? "Asia/Tokyo" : "UTC";
  for (const h of hours) {
    let now = T0 + day * DAY + h * 3_600_000;
    const queue = route(state, atoms, now);
    const rows: unknown[] = [];
    for (const item of queue) {
      const atom = byId.get(item.id)!;
      const level = pickLevel(state, atom);
      const rating = ratings[r++ % ratings.length];
      state = grade(state, atoms, enc, item.id, rating, level, now, tz);
      rows.push([item.id, item.kind, item.due ?? null, level, rating]);
      now += 30_000;
    }
    const s = summary(state, atoms, now);
    sessions.push({ day, h, rows, summary: [s.total, s.introduced, s.mastered, s.dueCount, s.xp, s.streak] });
  }
}

const END = T0 + 60 * DAY;
const fixed: [number, number][] = [
  [0.125, 2],
  [1.005, 2],
  [0.0005, 3],
  [2.5, 0],
  [1.45, 1],
  [0.075, 4],
  [0.66666666, 3],
  [-0.125, 2],
  [12345.67895, 4],
];

const out = {
  leverage: atoms.map((a) => [a.id, a.leverage ?? null, (a.unlocks ?? []).join(",")]),
  enc: atoms.map((a) => [a.id, enc[a.id].map((e) => `${e.id}:${e.weight}:${e.dist}`)]),
  sessions,
  mastery: atoms.map((a) => [a.id, masteryFor(state, a.id)]),
  levels: atoms.map((a) => pickLevel(state, a)),
  route: route(state, atoms, END).map((x) => `${x.kind}:${x.id}`),
  summary: (({ total, introduced, mastered, dueCount, xp, streak }) => [total, introduced, mastered, dueCount, xp, streak])(summary(state, atoms, END)),
  fixed: fixed.map(([x, f]) => +x.toFixed(f)),
  state,
};

writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
