import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ACTIVE_DPR, MAX_SPIN_STEP_S, REST_DPR, SPIN_FPS, SPIN_REST_MS, isResting, onVisible, releaseWebgl, sceneDpr, spinStep, startSpinTicker } from "./explore/frame-policy";

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

test("a resting scene drops to the low pixel ratio", () => {
  expect(isResting(SPIN_REST_MS - 1)).toBe(false);
  expect(isResting(SPIN_REST_MS)).toBe(true);
  expect(sceneDpr(false)).toEqual(ACTIVE_DPR);
  expect(sceneDpr(true)).toBe(REST_DPR);
  expect(REST_DPR).toBeLessThan(ACTIVE_DPR[1]);
});

test("onVisible runs when the window returns and stops after cleanup", () => {
  const listeners = new Set<() => void>();
  const doc = { hidden: true, addEventListener: (_: string, run: () => void) => void listeners.add(run), removeEventListener: (_: string, run: () => void) => void listeners.delete(run) };
  let runs = 0;
  const stop = onVisible(doc, () => runs++);
  listeners.forEach((l) => l());
  expect(runs).toBe(0);
  doc.hidden = false;
  listeners.forEach((l) => l());
  expect(runs).toBe(1);
  stop();
  expect(listeners.size).toBe(0);
});

test("releaseWebgl loses each canvas context and removes the canvas", () => {
  let lost = 0;
  let removed = 0;
  const canvas = (kinds: string[]) => ({
    getContext: (kind: string) => (kinds.includes(kind) ? { getExtension: (name: string) => (name === "WEBGL_lose_context" ? { loseContext: () => lost++ } : null) } : null),
    remove: () => removed++,
  });
  const host = { querySelectorAll: () => [canvas(["webgl2"]), canvas(["webgl"]), canvas([])] } as unknown as Element;
  expect(releaseWebgl(host)).toBe(2);
  expect(lost).toBe(2);
  expect(removed).toBe(3);
  expect(releaseWebgl(null)).toBe(0);
});

const source = (name: string) => readFileSync(join(import.meta.dir, "explore", name), "utf8");

test("the scene host keeps the demand frame loop, the ticker and the rest policy", () => {
  const host = source("SceneHostV2.tsx");
  expect(host).toContain('frameloop="demand"');
  expect(host).not.toContain('frameloop="always"');
  expect(host).toContain("dpr={sceneDpr(resting)}");
  expect(host).toContain("startSpinTicker({");
  expect(host).toContain("onVisible(document,");
  expect(host).toContain("spinStep(layout.spin, dt)");
  expect(host).toMatch(/\[layout, selected, theme, reduced, invalidate, active\]/);
});

test("the protein view releases its WebGL context on unmount", () => {
  expect(source("ProteinViewV2.tsx")).toContain("releaseWebgl(drawn.current)");
});
