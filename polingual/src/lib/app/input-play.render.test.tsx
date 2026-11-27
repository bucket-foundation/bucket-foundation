import { test } from "node:test";
import assert from "node:assert/strict";
import { act, createElement } from "react";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://polingual.com/" });
const g = globalThis as Record<string, unknown>;
for (const k of ["window", "document", "navigator", "HTMLElement", "Node", "localStorage", "MessageEvent"]) {
  Object.defineProperty(g, k, { value: (dom.window as unknown as Record<string, unknown>)[k], configurable: true, writable: true });
}
g.IS_REACT_ACT_ENVIRONMENT = true;
g.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const CHOICE = {
  unit: { id: "ep:1", kind: "episode", itemIds: ["c1"], targetLemmas: [], tokenCount: 40, credit: "", credits: [] },
  items: [{ id: "c1", lang: "es", kind: "video_segment", text: "Hola amigo", tokens: [{ surface: "Hola", lemma: "hola" }, { surface: "amigo", lemma: "amigo" }], lemmas: ["amigo", "hola"], media: { videoId: "abc123", start: 4, end: 9 }, source: { name: "youtube", url: "https://youtu.be/abc123" }, license: "CC BY" }],
  plan: { unit: "ep:1", tokens: 40, media: true, coverage: 0.95, newWords: [], glossed: [], eligible: true, score: 0 },
  fallback: false,
};

async function mount() {
  const { createRoot } = await import("react-dom/client");
  const { default: InputPlay } = await import("@/app/(site)/app/[system]/study/InputPlay");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(createElement(InputPlay, { lang: "es", choice: CHOICE as never, gloss: () => null, onFinish: () => {}, onExit: () => {} })));
  return { host, root };
}

const q = (host: HTMLElement, id: string) => host.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
const click = (el: HTMLElement | null) => act(async () => el?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })));

test("the poster asks for consent and loads no YouTube frame until the learner allows it", async () => {
  window.localStorage.clear();
  const { host, root } = await mount();
  assert.ok(q(host, "input-video-poster"));
  assert.equal(host.querySelector("iframe"), null);
  await click(q(host, "input-video-poster"));
  assert.ok(q(host, "youtube-consent"));
  assert.equal(host.querySelector("iframe"), null);
  await click(q(host, "youtube-decline"));
  assert.equal(q(host, "youtube-consent"), null);
  assert.equal(host.querySelector("iframe"), null);
  assert.ok(q(host, "input-video-fallback"));
  await act(async () => root.unmount());
});

test("allowing loads the nocookie frame, remembers the choice, and the learner can withdraw it", async () => {
  window.localStorage.clear();
  const first = await mount();
  await click(q(first.host, "input-video-poster"));
  await click(q(first.host, "youtube-allow"));
  const frame = first.host.querySelector("iframe");
  assert.ok(frame?.getAttribute("src")?.startsWith("https://www.youtube-nocookie.com/embed/abc123"));
  assert.equal(window.localStorage.getItem("polingual-web/youtube-consent/v1"), "allow");
  await act(async () => first.root.unmount());

  const second = await mount();
  await click(q(second.host, "input-video-poster"));
  assert.ok(second.host.querySelector("iframe"));
  assert.equal(q(second.host, "youtube-consent"), null);
  await click(q(second.host, "youtube-withdraw"));
  assert.equal(second.host.querySelector("iframe"), null);
  assert.equal(window.localStorage.getItem("polingual-web/youtube-consent/v1"), null);
  await click(q(second.host, "input-video-poster"));
  assert.ok(q(second.host, "youtube-consent"));
  await act(async () => second.root.unmount());
});
