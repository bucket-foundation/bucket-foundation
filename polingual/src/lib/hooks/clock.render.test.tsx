import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { act } from "react";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://polingual.com/" });
const g = globalThis as Record<string, unknown>;
for (const k of ["window", "document", "navigator", "HTMLElement", "Node"]) {
  Object.defineProperty(g, k, { value: (dom.window as unknown as Record<string, unknown>)[k], configurable: true, writable: true });
}
g.IS_REACT_ACT_ENVIRONMENT = true;

async function mount(el: ReturnType<typeof createElement>) {
  const { createRoot } = await import("react-dom/client");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(el));
  return { host, root };
}

test("useNow ticks every 250 ms and stops when inactive; useDeadline fires once", async (t) => {
  t.mock.timers.enable({ apis: ["setInterval", "Date"], now: 1_000 });
  const w = window as unknown as Record<string, unknown>;
  w.setInterval = globalThis.setInterval;
  w.clearInterval = globalThis.clearInterval;
  const { useDeadline, useNow } = await import("./clock");
  const seen: number[] = [];
  function Ticker({ active }: { active: boolean }) {
    seen.push(useNow(250, active));
    return null;
  }
  const a = await mount(createElement(Ticker, { active: true }));
  const start = seen.length;
  for (let i = 0; i < 4; i++) await act(async () => t.mock.timers.tick(250));
  assert.equal(seen.length - start, 4);
  assert.equal(seen[seen.length - 1] - seen[start - 1], 1000);
  await act(async () => a.root.render(createElement(Ticker, { active: false })));
  const paused = seen.length;
  for (let i = 0; i < 4; i++) await act(async () => t.mock.timers.tick(250));
  assert.equal(seen.length, paused);

  let fired = 0;
  function Clock({ ends }: { ends: number | null }) {
    useDeadline(ends, () => fired++);
    return null;
  }
  const b = await mount(createElement(Clock, { ends: Date.now() + 600 }));
  for (let i = 0; i < 2; i++) await act(async () => t.mock.timers.tick(250));
  assert.equal(fired, 0);
  await act(async () => t.mock.timers.tick(250));
  assert.equal(fired, 1);
  for (let i = 0; i < 2; i++) await act(async () => t.mock.timers.tick(250));
  assert.equal(fired, 1);
  await act(async () => b.root.render(createElement(Clock, { ends: null })));
  for (let i = 0; i < 4; i++) await act(async () => t.mock.timers.tick(250));
  assert.equal(fired, 1);
  await act(async () => {
    a.root.unmount();
    b.root.unmount();
  });
});
