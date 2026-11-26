import fs from "node:fs";
import path from "node:path";
import { assignArm, canFill, experimentMix, fnv1a32 } from "../src/lib/academy/input-experiment";

const keys = ["", "a", "device-0001", "3f2a9c1e-7b44-4d0e-9a51-1c2d3e4f5a6b", "ñandú", "学生", "𝒜x"];
const hashes = keys.map((k) => ({ key: k, hash: fnv1a32(k) }));
const assign = [];
for (let i = 0; i < 40; i++) for (const tier of [0, 6, 7, 12]) assign.push({ key: `user-${i}`, tier, arm: assignArm(`user-${i}`, tier) });
const fill = [
  { cards: 0, seconds: [60], fill: canFill(0, [60]) },
  { cards: 10, seconds: [], fill: canFill(10, []) },
  { cards: 10, seconds: [540, 540], fill: canFill(10, [540, 540]) },
  { cards: 10, seconds: [1080], fill: canFill(10, [1080]) },
  { cards: 10, seconds: [1079, 0, -5], fill: canFill(10, [1079, 0, -5]) },
];
const mixes = [];
for (const [on, key] of [[false, "user-1"], [true, null], [true, "user-1"], [true, "user-2"], [true, "user-3"], [true, "user-4"], [true, "user-5"], [true, "user-6"], [true, "user-7"]] as const)
  for (const [cards, seconds] of [[10, [90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90]], [10, [60]]] as const) {
    const m = experimentMix(on, key, 2, cards, seconds);
    mixes.push({ on, key, tier: 2, cards, seconds, arm: m.arm, target: m.mix.target, share: Math.round(m.mix.share * 1e9) / 1e9, units: m.mix.units, positions: m.mix.positions });
  }
fs.writeFileSync(path.join(__dirname, "..", "src/lib/academy/input-experiment-vectors.json"), JSON.stringify({ version: 1, hashes, assign, fill, mixes }, null, 1) + "\n");
