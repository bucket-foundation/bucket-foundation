import { expect, test } from "bun:test";
import { MAX_SPIN_STEP_S, SPIN_FPS, SPIN_REST_MS, spinStep, startSpinTicker } from "./explore/frame-policy";

function ticker(hidden: () => boolean, idleMs: () => number = () => 0) {
  const runs: (() => void)[] = [];
  const cancelled: unknown[] = [];
  let frames = 0;
  let ms = 0;
  const stop = startSpinTicker({
    invalidate: () => frames++,
    hidden,
    idleMs,
    every: (run, every) => {
      ms = every;
      runs.push(run);
      return runs.length;
    },
    cancel: (h) => cancelled.push(h),
  });
  return { tick: () => runs.forEach((r) => r()), frames: () => frames, ms: () => ms, stop, cancelled };
}

test("the spin ticker asks for at most SPIN_FPS frames a second", () => {
  const t = ticker(() => false);
  expect(t.ms()).toBe(Math.round(1000 / SPIN_FPS));
  expect(SPIN_FPS).toBeLessThanOrEqual(30);
  t.tick();
  t.tick();
  expect(t.frames()).toBe(2);
});

test("a hidden window gets no spin frames", () => {
  let hidden = true;
  const t = ticker(() => hidden);
  t.tick();
  t.tick();
  expect(t.frames()).toBe(0);
  hidden = false;
  t.tick();
  expect(t.frames()).toBe(1);
});

test("stopping the ticker cancels its timer", () => {
  const t = ticker(() => false);
  t.stop();
  expect(t.cancelled).toEqual([1]);
});

test("a spin step is bounded after an idle gap", () => {
  expect(spinStep(0.05, 0.016)).toBeCloseTo(0.0008, 6);
  expect(spinStep(0.05, 600)).toBeCloseTo(0.05 * MAX_SPIN_STEP_S, 9);
  expect(spinStep(0.05, -1)).toBe(0);
});

test("the spin rests once the scene has been idle for SPIN_REST_MS", () => {
  let idle = SPIN_REST_MS - 1;
  const t = ticker(() => false, () => idle);
  t.tick();
  expect(t.frames()).toBe(1);
  idle = SPIN_REST_MS;
  t.tick();
  t.tick();
  expect(t.frames()).toBe(1);
  idle = 0;
  t.tick();
  expect(t.frames()).toBe(2);
});
