import test from "node:test";
import assert from "node:assert/strict";
import { HOME_CAMERA, cameraDistance, homeCamera, type CameraPose, type Vec3 } from "../src/lib/explore/frame";
import { INITIAL_LOCK, lockReducer, poseFor } from "../src/lib/stage/camera";
import { bufferSize, planMorph, sampleMorph, settled } from "../src/lib/stage/morph";

const m = (o: Record<string, Vec3>) => new Map(Object.entries(o));
const prev = m({ a: [0, 0, 0], b: [1, 0, 0], c: [0, 1, 0] });
const next = m({ b: [0, 0, 1], c: [0, 1, 0], d: [1, 1, 1], e: [2, 0, 0] });

test("records are keyed by id into shared, leaving and entering", () => {
  const plan = planMorph(prev, next);
  const kind = (id: string) => plan.find((p) => p.id === id)?.kind;
  assert.equal(kind("b"), "shared");
  assert.equal(kind("c"), "shared");
  assert.equal(kind("a"), "leaving");
  assert.equal(kind("d"), "entering");
  assert.equal(kind("e"), "entering");
  assert.equal(plan.length, 5);
});

test("shared records lerp, leaving shrink to 0 and entering grow from 0", () => {
  const plan = planMorph(prev, next);
  const get = (id: string) => plan.find((p) => p.id === id)!;
  assert.deepEqual(sampleMorph(get("b"), 0).position, [1, 0, 0]);
  assert.deepEqual(sampleMorph(get("b"), 1).position, [0, 0, 1]);
  const mid = sampleMorph(get("b"), 0.5);
  assert.ok(Math.abs(mid.position[0] - 0.5) < 1e-9 && Math.abs(mid.position[2] - 0.5) < 1e-9);
  assert.equal(sampleMorph(get("b"), 0.5).scale, 1);
  assert.equal(sampleMorph(get("a"), 0).scale, 1);
  assert.equal(sampleMorph(get("a"), 1).scale, 0);
  assert.equal(sampleMorph(get("d"), 0).scale, 0);
  assert.equal(sampleMorph(get("d"), 1).scale, 1);
  assert.ok(sampleMorph(get("a"), 0.5).scale < 1 && sampleMorph(get("d"), 0.5).scale > 0);
});

test("the buffer holds at least the larger set and settles to the next set", () => {
  const plan = planMorph(prev, next);
  assert.ok(bufferSize(plan) >= Math.max(prev.size, next.size));
  assert.deepEqual(settled(plan).map((p) => p.id).sort(), Array.from(next.keys()).sort());
});

test("reduced motion snaps to the final form", () => {
  const plan = planMorph(prev, next);
  for (const item of plan) {
    const s = sampleMorph(item, 0, true);
    assert.deepEqual(s.position, item.to);
    assert.equal(s.scale, item.toScale);
  }
});

test("an empty start enters everything and an empty end leaves everything", () => {
  assert.ok(planMorph(new Map(), next).every((p) => p.kind === "entering"));
  assert.ok(planMorph(prev, new Map()).every((p) => p.kind === "leaving"));
});

test("the home camera is a locked bird's-eye view above the stage", () => {
  const home = homeCamera();
  assert.deepEqual(home, HOME_CAMERA);
  assert.ok(home.position[1] > Math.abs(home.position[2]));
  assert.notEqual(home.position, HOME_CAMERA.position);
});

test("orbiting unlocks, Home locks again and a mode switch keeps the camera", () => {
  let s = INITIAL_LOCK;
  assert.equal(s.locked, true);
  s = lockReducer(s, "mode");
  assert.equal(s.locked, true);
  s = lockReducer(s, "orbit");
  assert.equal(s.locked, false);
  const orbited: CameraPose = { position: [3, 1, 2], target: [0, 0, 0], fov: 45 };
  assert.equal(poseFor(s, orbited), orbited);
  const before = cameraDistance(orbited);
  s = lockReducer(s, "mode");
  assert.equal(s.locked, false);
  assert.equal(cameraDistance(poseFor(s, orbited)), before);
  s = lockReducer(s, "home");
  assert.equal(s.locked, true);
  assert.deepEqual(poseFor(s, orbited), homeCamera());
});
