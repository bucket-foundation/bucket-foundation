import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { buildEncompassingMap, dayKey, emptyState, grade, withLeverage, type Atom, type EngineState } from "../src/lib/academy/engine";
import { gradeCard, parseCardId } from "../src/lib/academy/lang-systems";
import { LANG_ATOMS_VERSION, orderLog, replay, type ReviewRow } from "../src/lib/academy/replay";

interface Session {
  name: string;
  tz: string;
  rows: ReviewRow[];
  state: EngineState;
}

const ROOT = path.resolve(__dirname, "..");
const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, "tests/fixtures/academy-replay-sessions.golden.json"), "utf8")) as {
  tag: string;
  atomsByVersion: Record<string, Atom[]>;
  sessions: Session[];
};
const atomsByVersion: Record<string, Atom[]> = Object.fromEntries(Object.entries(fixture.atomsByVersion).map(([v, a]) => [v, withLeverage(a)]));

function liveFold(rows: ReviewRow[], zoned = false): EngineState {
  return rows.reduce((s, r) => {
    const tz = zoned ? r.tz : undefined;
    if (r.atoms_version === LANG_ATOMS_VERSION) return gradeCard(s, parseCardId(r.card_id).lang, parseCardId(r.card_id).itemId, r.rating, r.reviewed_at, tz);
    const atoms = atomsByVersion[r.atoms_version];
    return grade(s, atoms, buildEncompassingMap(atoms), r.card_id, r.rating, r.level, r.reviewed_at, tz);
  }, emptyState());
}

function sig(v: unknown): unknown {
  if (typeof v === "number") return Number.isInteger(v) ? v : Number(v.toPrecision(12));
  if (Array.isArray(v)) return v.map(sig);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, sig(x)]));
  return v;
}

function assertGolden(actual: unknown, golden: unknown) {
  assert.deepEqual(sig(actual), sig(golden));
}

function shuffle<T>(xs: T[], seed: number): T[] {
  const out = xs.slice();
  let x = seed >>> 0;
  for (let i = out.length - 1; i > 0; i--) {
    x = (x * 1664525 + 1013904223) >>> 0;
    const j = x % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const merged = fixture.sessions.flatMap((s) => s.rows.map((r) => ({ ...r, tz: "Pacific/Auckland" })));

function zoneReport() {
  return {
    sessions: fixture.sessions.map((s) => replay(null, s.rows, atomsByVersion)),
    merged: replay(null, merged, atomsByVersion),
    liveLocal: Object.fromEntries(fixture.sessions.filter((s) => s.tz === process.env.TZ).map((s) => [s.name, liveFold(s.rows)])),
  };
}

function runUnder(tz: string) {
  const out = spawnSync(process.execPath, [path.join(ROOT, "node_modules/ts-node/dist/bin.js"), "--compiler-options", JSON.stringify({ module: "commonjs" }), __filename], {
    cwd: ROOT,
    env: { ...process.env, TZ: tz, REPLAY_ZONE_REPORT: "1" },
    maxBuffer: 1 << 26,
  });
  assert.equal(out.status, 0, String(out.stderr));
  return JSON.parse(String(out.stdout)) as ReturnType<typeof zoneReport>;
}

if (process.env.REPLAY_ZONE_REPORT) {
  process.stdout.write(JSON.stringify(zoneReport()));
} else {
  test("fixture comes from the frozen tag and covers fired credits and broken streaks", () => {
    assert.equal(fixture.tag, "polingual-ux-v1");
    const credits = fixture.sessions.flatMap((s) => Object.values(s.state.cards).filter((c) => c.firedCredit));
    assert.ok(credits.length > 0);
    assert.ok(fixture.sessions.every((s) => Object.keys(s.state.stats.history).length > s.state.stats.streak));
  });

  for (const s of fixture.sessions) {
    test(`replay of ${s.name} deep-equals the live state recorded at polingual-ux-v1`, () => {
      const got = replay(null, s.rows, atomsByVersion);
      assert.deepEqual(got.stats, s.state.stats);
      assertGolden(got, s.state);
      assert.deepEqual(got, liveFold(s.rows, true));
    });

    test(`replay of ${s.name} is independent of log order and duplicate delivery`, () => {
      const want = replay(null, s.rows, atomsByVersion);
      for (const seed of [1, 2, 3, 99]) {
        const log = shuffle([...s.rows, ...s.rows.slice(0, 9)], seed);
        assert.deepEqual(replay(null, log, atomsByVersion), want);
      }
    });
  }

  test("replayed Polingual cards carry the introduced day gradeCard sets live", () => {
    const s = fixture.sessions.find((x) => x.tz === "Pacific/Auckland")!;
    const cards = Object.values(s.state.cards) as { introduced?: string }[];
    assert.ok(cards.length > 0 && cards.every((c) => typeof c.introduced === "string"));
    assertGolden(replay(null, s.rows, atomsByVersion).cards, s.state.cards);
  });

  test("rows at the same instant order by device then review id", () => {
    const base: ReviewRow = { review_id: "r", card_id: "a", rating: 3, level: "recall", reviewed_at: 1000, atoms_version: "atoms-v1", device_id: "d", tz: "UTC" };
    const rows = [
      { ...base, review_id: "z", device_id: "b" },
      { ...base, review_id: "y", device_id: "a" },
      { ...base, review_id: "x", device_id: "b" },
      { ...base, review_id: "w", reviewed_at: 999, device_id: "c" },
    ];
    assert.deepEqual(orderLog(rows).map((r) => r.review_id), ["w", "y", "x", "z"]);
    assert.deepEqual(orderLog(shuffle(rows, 5)).map((r) => r.review_id), ["w", "y", "x", "z"]);
  });

  test("a duplicate review id keeps the earliest row whatever the arrival order", () => {
    const base: ReviewRow = { review_id: "r", card_id: "a", rating: 3, level: "recall", reviewed_at: 1000, atoms_version: "atoms-v1", device_id: "d", tz: "UTC" };
    const late = { ...base, reviewed_at: 2000, rating: 1 as const };
    assert.deepEqual(orderLog([late, base]), [base]);
    assert.deepEqual(orderLog([base, late]), [base]);
  });

  test("replay continues from a baseline", () => {
    const rows = fixture.sessions[0].rows;
    const head = replay(null, rows.slice(0, 25), atomsByVersion);
    assert.deepEqual(replay(head, rows.slice(25), atomsByVersion), replay(null, rows, atomsByVersion));
    assertGolden(replay(head, rows.slice(25), atomsByVersion), fixture.sessions[0].state);
  });

  test("replay throws on an unknown atoms version", () => {
    const row = { ...fixture.sessions[0].rows[0], atoms_version: "atoms-v9" };
    assert.throws(() => replay(null, [row], atomsByVersion), /no atoms for version atoms-v9/);
  });

  test("replay throws on a row without a zone", () => {
    const row = { ...fixture.sessions[0].rows[0], tz: "" };
    assert.throws(() => replay(null, [row], atomsByVersion), /has no tz/);
  });

  test("dayKey with a zone reads that zone's calendar day and keeps the unpadded format", () => {
    const t = Date.UTC(2026, 0, 5, 11, 30);
    assert.equal(dayKey(t, "UTC"), "2026-1-5");
    assert.equal(dayKey(t, "Pacific/Auckland"), "2026-1-6");
    assert.equal(dayKey(t, "America/Los_Angeles"), "2026-1-5");
    const d = new Date(t);
    assert.equal(dayKey(t), d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate());
  });

  test("the same log replays to equal state under TZ=UTC and TZ=Pacific/Auckland", () => {
    const utc = runUnder("UTC");
    const akl = runUnder("Pacific/Auckland");
    assert.deepEqual(utc.sessions, akl.sessions);
    assert.deepEqual(utc.merged, akl.merged);
    assertGolden(utc.sessions, fixture.sessions.map((s) => s.state));
  });

  test("live grade() without a zone keeps the process-local day under the recording zone", () => {
    for (const s of fixture.sessions) {
      const r = runUnder(s.tz);
      assertGolden(r.liveLocal[s.name], s.state);
    }
  });
}
