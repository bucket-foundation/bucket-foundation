import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TAG = "polingual-ux-v1";
const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "tests/fixtures/academy-replay-sessions.golden.json");
const FILES = ["engine", "fsrs", "mastery"];

const ATOMS = [
  { id: "a", title: "A", shell: "prereq", requires: [], quiz: [{ level: "recall", prompt: "?", answer: "!" }, { level: "apply", prompt: "?", answer: "!" }] },
  { id: "b", title: "B", shell: "nucleus", requires: ["a"], quiz: [{ level: "recall", prompt: "?", answer: "!" }, { level: "derive", prompt: "?", answer: "!" }] },
  { id: "c", title: "C", shell: "nucleus", requires: ["b"], quiz: [{ level: "recall", prompt: "?", answer: "!" }, { level: "teach", prompt: "?", answer: "!" }] },
  { id: "d", title: "D", shell: "frontier", requires: ["a"], quiz: [{ level: "recall", prompt: "?", answer: "!" }] },
  { id: "e", title: "E", shell: "frontier", requires: ["c", "d"], quiz: [{ level: "apply", prompt: "?", answer: "!" }] },
  { id: "f", title: "F", shell: "prereq", requires: [], quiz: [{ level: "recall", prompt: "?", answer: "!" }] },
];

interface Spec {
  name: string;
  tz: string;
  version: string;
  start: number;
  steps: number;
  seed: number;
  lang?: string[];
}

const SPECS: Spec[] = [
  { name: "atoms-new-york-dst", tz: "America/New_York", version: "atoms-v1", start: Date.UTC(2026, 9, 24, 3, 40), steps: 60, seed: 7 },
  { name: "polingual-auckland", tz: "Pacific/Auckland", version: "lang", start: Date.UTC(2026, 9, 17, 10, 50), steps: 70, seed: 11, lang: ["ru", "es"] },
];

function rng(seed: number) {
  let x = seed >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

function loadTagEngine() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "replay-tag-"));
  FILES.forEach((f) => fs.writeFileSync(path.join(dir, f + ".ts"), execFileSync("git", ["show", `${TAG}:src/lib/academy/${f}.ts`], { cwd: ROOT })));
  return require(path.join(dir, "engine.ts"));
}

function record(spec: Spec) {
  const E = loadTagEngine();
  const r = rng(spec.seed);
  const atoms = spec.lang ? [] : E.withLeverage(ATOMS);
  const enc = E.buildEncompassingMap(atoms);
  const devices = ["dev-laptop", "dev-phone"];
  let state = E.emptyState();
  let now = spec.start;
  const rows = [];
  for (let i = 0; i < spec.steps; i++) {
    now += Math.floor(r() < 0.25 ? (0.4 + r() * 2.2) * 86400000 : 20000 + r() * 3600000);
    let id: string;
    let level = "recall";
    if (spec.lang) {
      const due = Object.entries(state.cards as Record<string, { due: number }>)
        .filter(([, c]) => c.due <= now)
        .map(([k]) => k);
      id = due.length && r() < 0.7 ? due[Math.floor(r() * due.length)] : spec.lang[Math.floor(r() * spec.lang.length)] + ":w" + Math.floor(r() * 25);
    } else {
      const q = E.route(state, atoms, now);
      id = q.length ? q[Math.floor(r() * Math.min(q.length, 3))].id : atoms[Math.floor(r() * atoms.length)].id;
      level = E.pickLevel(state, atoms.find((a: { id: string }) => a.id === id));
    }
    const rating = (1 + Math.floor(r() * 4)) as 1 | 2 | 3 | 4;
    state = E.grade(state, atoms, enc, id, rating, level, now);
    rows.push({
      review_id: `${spec.name}-${String(i).padStart(4, "0")}`,
      card_id: id,
      rating,
      level,
      reviewed_at: now,
      atoms_version: spec.version,
      device_id: devices[Math.floor(r() * 2)],
      tz: spec.tz,
    });
  }
  return { name: spec.name, tz: spec.tz, rows, state };
}

if (process.env.REPLAY_RECORD) {
  const spec = SPECS.find((s) => s.name === process.env.REPLAY_RECORD)!;
  process.stdout.write(JSON.stringify(record(spec)));
} else {
  const sessions = SPECS.map((s) => {
    const out = spawnSync(process.execPath, [path.join(ROOT, "node_modules/ts-node/dist/bin.js"), "--compiler-options", JSON.stringify({ module: "commonjs" }), __filename], {
      cwd: ROOT,
      env: { ...process.env, TZ: s.tz, REPLAY_RECORD: s.name },
      maxBuffer: 1 << 26,
    });
    if (out.status !== 0) throw new Error(String(out.stderr));
    return JSON.parse(String(out.stdout));
  });
  const fixture = { tag: TAG, atomsByVersion: { "atoms-v1": ATOMS, lang: [] }, sessions };
  fs.writeFileSync(OUT, JSON.stringify(fixture, null, 1) + "\n");
  process.stdout.write(`wrote ${OUT}\n`);
}
