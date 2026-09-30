import test from "node:test";
import assert from "node:assert/strict";
import { AXIS, dot, norm, type Vec3 } from "../src/lib/explore/frame";
import { globeProjection } from "../src/components/canon-globe/projections";
import { ELEMENTS, shellRadius } from "../src/lib/explore/modes/atom";
import {
  FORM_IDS,
  FORM_OF_MODE,
  STAGE_MODES,
  ballStickForm,
  circleForm,
  cylinderForm,
  discForm,
  earthForm,
  flatCylinderForm,
  graphForm,
  helicoidForm,
  latLngOf,
  placeRecords,
  residuesForm,
  shellsForm,
  sphereForm,
  twoStructuresForm,
} from "../src/lib/stage/forms";
import { MAPPERS, STAGE_TYPES, hashTheta, mapperFor, toStageRecord, type StageSource } from "../src/lib/stage/mappers";
import { STAGE_RADIUS } from "../src/lib/stage/shape";
import type { StageRecord } from "../src/lib/stage/record";

const EPS = 1e-9;
const TAU = Math.PI * 2;
const THETAS = Array.from({ length: 24 }, (_, i) => (i / 24) * TAU);
const UNIT = [0, 0.13, 0.5, 0.77, 1];
const within = (p: Vec3) => norm(p) <= STAGE_RADIUS + EPS && p.every(Number.isFinite);
const close = (a: Vec3, b: Vec3) => a.every((v, i) => Math.abs(v - b[i]) < 1e-9);

const ATOMS = [
  { x: 0, y: 0 },
  { x: 30, y: 0 },
  { x: 45, y: 26 },
  { x: -80, y: 140 },
];

const SOURCES: StageSource[] = [
  { id: "excerpt:05-biophysics/light/a", type: "excerpt", title: "Light", subtitle: "biophysics", text: "t", score: 0.9, branch: "05-biophysics", year: 1970, url: "/e", links: [] },
  { id: "advisor:3", type: "advisor", title: "A", subtitle: "f", text: "t", score: 0.4, branch: "physics", year: null, url: null, links: ["excerpt:05-biophysics/light/a"] },
  { id: "work:05-biophysics/light", type: "work", title: "light", subtitle: "", text: "", score: 0.5, branch: "05-biophysics", year: 1950, url: null, links: ["excerpt:05-biophysics/light/a"] },
  { id: "paper:upload/x", type: "paper", title: "P", subtitle: "", text: "", score: 0.1, branch: "mind", year: 2021, url: null, links: [] },
  { id: "text:gen/1", type: "text", title: "T", subtitle: "", text: "", score: 0.1, branch: "sacred-texts", year: -500, url: null, links: [] },
  { id: "talk:yt/1", type: "talk", title: "K", subtitle: "", text: "", score: 0.1, branch: "biophysics", year: 2019, url: null, links: [] },
  { id: "canon-file:a.md", type: "canon-file", title: "C", subtitle: "", text: "", score: 0.1, branch: "cosmology", year: 1915, url: null, links: [] },
  { id: "you", type: "you", title: "You", subtitle: "", text: "", score: 1, branch: "mind", year: null, url: null, links: [] },
];

test("every mode has a form and every form is used", () => {
  for (const m of STAGE_MODES) assert.ok((FORM_IDS as readonly string[]).includes(FORM_OF_MODE[m]), m);
  for (const f of FORM_IDS) assert.ok(STAGE_MODES.some((m) => FORM_OF_MODE[m] === f), f);
});

test("every form stays inside the one bounding radius", () => {
  for (const th of THETAS)
    for (const r of UNIT)
      for (const t of [...UNIT, null]) {
        assert.ok(within(sphereForm(th, t)));
        assert.ok(within(cylinderForm(th, r, t)));
        assert.ok(within(circleForm(th, r)));
        assert.ok(within(shellsForm(th, r)));
        assert.ok(within(flatCylinderForm(th, t)));
      }
  for (const u of UNIT) for (const s of UNIT) assert.ok(within(helicoidForm(u, s)));
  for (let lat = -90; lat <= 90; lat += 15) for (let lng = -180; lng <= 180; lng += 30) assert.ok(within(earthForm(lat, lng)) && within(discForm(lat, lng)), `${lat},${lng}`);
  assert.ok(ballStickForm(ATOMS).every(within));
  const two = twoStructuresForm(ATOMS, ATOMS.slice(0, 2));
  assert.ok([...two.reactants, ...two.products].every(within));
  assert.ok(residuesForm([[0, 0, 0], [40, 10, -5], [-20, 30, 12]]).every(within));
  const ids = Array.from({ length: 40 }, (_, i) => `n${i}`);
  const g = graphForm(ids, ids.slice(1).map((id, i) => [ids[i], id]));
  assert.ok(Array.from(g.values()).every(within));
});

test("the sphere is the outer bound and the cylinder fits inside it", () => {
  for (const th of THETAS) assert.ok(Math.abs(norm(sphereForm(th, 0.4)) - STAGE_RADIUS) < EPS);
  assert.ok(norm(cylinderForm(0.3, 1, 1)) <= STAGE_RADIUS + EPS);
});

test("the circle equals the cylinder slice", () => {
  for (const th of THETAS)
    for (const r of UNIT) {
      const c = circleForm(th, r);
      assert.ok(close(c, cylinderForm(th, r, 0.5)));
      assert.ok(Math.abs(dot(c, AXIS)) < EPS);
    }
});

test("a shell sits on the circle at a fixed radius", () => {
  for (let i = 0; i < ELEMENTS[7].shells.length; i++) {
    const r = i / 6;
    const radii = THETAS.map((th) => norm(shellsForm(th, r)));
    assert.ok(radii.every((x) => Math.abs(x - radii[0]) < EPS));
  }
  assert.ok(shellRadius(1) > shellRadius(0));
});

test("earth matches the globe projection", () => {
  for (let lat = -80; lat <= 80; lat += 20)
    for (let lng = -170; lng <= 170; lng += 40) {
      const want = globeProjection.position({ id: "x", lat, lng, branch: "earth" }, { radius: STAGE_RADIUS, theta: () => 0 });
      assert.ok(close(earthForm(lat, lng), want), `${lat},${lng}`);
    }
});

test("the map disc puts the pole at the centre and stays in the circle plane", () => {
  assert.ok(norm(discForm(90, 10)) < EPS);
  assert.ok(Math.abs(dot(discForm(10, 40), AXIS)) < EPS);
});

test("the timeline unrolls the cylinder without changing its time axis", () => {
  const a = flatCylinderForm(1, 0.2);
  const b = flatCylinderForm(1, 0.8);
  assert.ok(dot(b, AXIS) > dot(a, AXIS));
  assert.ok(Math.abs(a[1] - b[1]) < EPS);
});

test("the helicoid sweeps one ribbon along the axis", () => {
  assert.ok(dot(helicoidForm(0.9, 1), AXIS) > dot(helicoidForm(0.1, 1), AXIS));
  assert.ok(norm(helicoidForm(0.5, 0)) - Math.abs(dot(helicoidForm(0.5, 0), AXIS)) < EPS);
});

test("every stage type has its own mapper and a finite placement", () => {
  for (const type of STAGE_TYPES) assert.ok(type in MAPPERS && mapperFor(type) === MAPPERS[type], type);
  for (const src of SOURCES) {
    const rec = toStageRecord(src);
    assert.ok(rec.theta >= 0 && rec.theta < TAU, src.id);
    assert.ok(rec.r >= 0 && rec.r <= 1, src.id);
    assert.ok(rec.t === null || (rec.t >= 0 && rec.t <= 1), src.id);
    assert.equal(rec.type, src.type);
  }
  assert.deepEqual(SOURCES.map((s) => s.type), [...STAGE_TYPES]);
});

test("mappers are deterministic, undated items get t null and you sits at the centre", () => {
  assert.equal(hashTheta("a"), hashTheta("a"));
  assert.notEqual(hashTheta("a"), hashTheta("b"));
  const adv = toStageRecord(SOURCES[1]);
  assert.equal(adv.t, null);
  assert.deepEqual(toStageRecord(SOURCES[1]), adv);
  assert.equal(toStageRecord(SOURCES[7]).r, 0);
  const work = toStageRecord(SOURCES[2], { thetaOf: (id) => (id === SOURCES[0].id ? 1 : undefined) });
  assert.ok(Math.abs(work.theta - 1) < 1e-9);
});

test("every mode places every record at a finite point inside the radius", () => {
  const records: StageRecord[] = SOURCES.map((s) => toStageRecord(s));
  const ctx = { structure: ATOMS, products: ATOMS.slice(1), residues: [[0, 0, 0], [9, 2, 1], [-4, 7, 3]] as Vec3[] };
  for (const m of STAGE_MODES) {
    const placed = placeRecords(m, records, ctx);
    assert.equal(placed.size, records.length, m);
    for (const p of Array.from(placed.values())) assert.ok(within(p), m);
  }
  assert.ok(close(placeRecords("circle", records).get("you") as Vec3, [0, 0, 0]));
});

test("latLngOf inverts the earth placement for a record", () => {
  const { lat, lng } = latLngOf({ theta: Math.PI, r: 0.5 });
  assert.ok(Math.abs(lat) < EPS && Math.abs(lng) < 1e-9);
});
