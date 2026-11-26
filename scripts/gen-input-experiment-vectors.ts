import fs from "node:fs";
import path from "node:path";
import { assignArm, canFill, enrolmentKey, experimentMix, fnv1a32, type Consent, type Enrolment } from "../src/lib/academy/input-experiment";

const keys = ["", "a", "device-0001", "3f2a9c1e-7b44-4d0e-9a51-1c2d3e4f5a6b", "ñandú", "学生", "𝒜x"];
const hashes = keys.map((k) => ({ key: k, hash: fnv1a32(k) }));
const keysFor = [
  { account: null, device: "d1", key: enrolmentKey(null, "d1") },
  { account: "u-9", device: "d1", key: enrolmentKey("u-9", "d1") },
  { account: "", device: "d2", key: enrolmentKey("", "d2") },
];
const assign = [];
for (let i = 0; i < 120; i++) assign.push({ key: `acct:user-${i}`, arm: assignArm(`acct:user-${i}`) });
const fill = [
  { cards: 0, seconds: [60], fill: canFill(0, [60]) },
  { cards: 10, seconds: [], fill: canFill(10, []) },
  { cards: 10, seconds: [540, 540], fill: canFill(10, [540, 540]) },
  { cards: 10, seconds: [1080], fill: canFill(10, [1080]) },
  { cards: 10, seconds: [1079, 0, -5], fill: canFill(10, [1079, 0, -5]) },
];
const yes: Consent = { flag: true, uploadOpen: true, disclosed: true, optedOut: false };
const consents: Consent[] = [yes, { ...yes, flag: false }, { ...yes, uploadOpen: false }, { ...yes, disclosed: false }, { ...yes, optedOut: true }];
const frozen: Enrolment = { experiment: "ci14-share-v1", key: "acct:user-1", arm: "s50", stratum: "past-a2", at: 5 };
const full = [90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90];
const mixes = [];
for (const consent of consents)
  for (const enrolment of [null, frozen])
    for (const key of [null, "acct:user-1", "acct:user-2", "acct:user-4", "dev:user-6"])
      for (const seconds of [full, [60]]) {
        const m = experimentMix(consent, enrolment, key, 2, 10, seconds, 1000);
        mixes.push({ consent, enrolment, key, tier: 2, cards: 10, seconds, now: 1000, arm: m.arm, enrolment_out: m.enrolment, target: m.mix.target, share: Math.round(m.mix.share * 1e9) / 1e9, units: m.mix.units, positions: m.mix.positions });
      }
fs.writeFileSync(path.join(__dirname, "..", "src/lib/academy/input-experiment-vectors.json"), JSON.stringify({ version: 2, hashes, keysFor, assign, fill, mixes }, null, 1) + "\n");
