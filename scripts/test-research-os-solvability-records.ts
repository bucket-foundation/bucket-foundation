import test from "node:test";
import assert from "node:assert/strict";
import records from "../src/lib/research-os/solvability-records-data.json";
import neighbors from "../src/lib/research-os/solvability-neighbors-data.json";
import { buildFrontier, frontierRows, type NeighborData } from "../src/lib/research-os/solvability-frontier";
import { NEIGHBOUR_STRIDE, neighbourPositions, recordAt, recordFor, recordIndex, type PackedRecords } from "../src/lib/research-os/solvability-records";
import { recordGlyph } from "../src/lib/research-os/solvability-record-render";

const data = records as unknown as PackedRecords;
const index = recordIndex(data);
const nb = neighbors as unknown as NeighborData;
const frontier = buildFrontier(frontierRows(nb), nb);

test("every row of the neighbour data has a record and the ids are unique", () => {
  const ids = nb.nodes.filter((n) => n.kind !== "lean").map((n) => n.id);
  assert.equal(data.rows.length, ids.length);
  assert.equal(index.size, ids.length);
  for (const id of ids) assert.ok(index.has(id), id);
});

test("the loader returns null for an unknown id and a full record for a known one", () => {
  assert.equal(recordFor(data, "no-such-problem", index), null);
  const pnp = recordFor(data, "pnp", index)!;
  assert.equal(pnp.title, "P vs NP");
  assert.equal(pnp.branch, "information");
  assert.ok(pnp.hand && pnp.hand.key_works.length > 0);
  assert.equal(pnp.pc.length, 3);
  assert.equal(pnp.nearestSolved.length, data.neighbours);
});

test("zone, reach, radius and threshold agree with the frontier built from the neighbour data", () => {
  assert.equal(data.threshold, frontier.threshold);
  const point = new Map(frontier.points.map((p) => [p.id, p]));
  for (let i = 0; i < data.rows.length; i++) {
    const rec = recordAt(data, i);
    const p = point.get(rec.id)!;
    assert.equal(rec.zone, p.zone, rec.id);
    assert.ok(Math.abs(rec.theta - p.theta) <= 0.0001, `${rec.id} angle ${rec.theta} against ${p.theta}`);
    assert.ok(Math.abs(rec.reach - p.reach) <= 0.0015, `${rec.id} reach ${rec.reach} against ${p.reach}`);
    assert.ok(Math.abs(rec.radius - p.radius) <= 0.01, `${rec.id} radius ${rec.radius} against ${p.radius}`);
  }
});

test("neighbour lists are sorted, link to existing records and respect their zone", () => {
  for (let i = 0; i < data.rows.length; i += 7) {
    const rec = recordAt(data, i);
    for (const list of [rec.nearestSolved, rec.nearestOpen]) {
      const sims = list.map((n) => n.similarity);
      assert.deepEqual(sims, [...sims].sort((a, b) => b - a));
      for (const n of list) {
        assert.ok(index.has(n.id));
        assert.notEqual(n.id, rec.id);
      }
    }
    assert.ok(rec.nearestSolved.every((n) => n.zone === "solved"));
    assert.ok(rec.nearestOpen.every((n) => n.zone !== "solved"));
  }
});

test("a variant names its parent and the coding follows the status", () => {
  const variant = data.rows.findIndex((r) => r.v >= 0);
  const rec = recordAt(data, variant);
  assert.ok(rec.variantOf && index.has(rec.variantOf.id));
  for (const status of ["solved", "partial", "open"]) {
    const i = data.rows.findIndex((r) => data.tables.status[r.s] === status);
    assert.equal(recordAt(data, i).coding, { solved: "settled", partial: "advanced", open: "open" }[status]);
  }
});

test("neighbour codes fit the stride", () => {
  assert.ok(data.rows.length * NEIGHBOUR_STRIDE < 2 ** 31);
  for (const r of data.rows) for (const x of [...r.ns, ...r.no]) assert.ok(x % NEIGHBOUR_STRIDE <= 1000);
});

test("the glyph draws the three rings, the point and every neighbour, and escapes the title", () => {
  const rec = recordFor(data, "pnp", index)!;
  const svg = recordGlyph(rec, neighbourPositions(data, rec));
  assert.equal((svg.match(/<circle/g) ?? []).length, 3 + 1 + rec.nearestSolved.length + rec.nearestOpen.length);
  assert.equal((svg.match(/<line/g) ?? []).length, rec.nearestSolved.length + rec.nearestOpen.length);
  const odd = recordGlyph({ title: "A <b> & c", zone: "beyond", theta: 1, radius: 1.2 }, []);
  assert.ok(odd.includes("A &lt;b&gt; &amp; c") && !odd.includes("<b>"));
});
