import { test } from "node:test";
import assert from "node:assert/strict";
import { act, createElement } from "react";
import { JSDOM } from "jsdom";
import type { LobbyApi, WebLobbyState } from "./client";
import { LobbyError } from "./client";
import { BLOCK_CACHE_KEY } from "./moderation";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://polingual.com/" });
const g = globalThis as Record<string, unknown>;
for (const k of ["window", "document", "navigator", "HTMLElement", "Node", "localStorage"]) {
  Object.defineProperty(g, k, { value: (dom.window as unknown as Record<string, unknown>)[k], configurable: true, writable: true });
}
g.IS_REACT_ACT_ENVIRONMENT = true;

const lobby = {
  id: "L",
  players: [
    { userId: "me", isMe: true, bot: false },
    { userId: "u2", isMe: false, bot: false },
    { userId: "bot-1", isMe: false, bot: true },
  ],
  messages: [
    { id: 1, from: "u2", name: "Bo", body: "hi", at: "" },
    { id: 2, from: "bot-1", name: "Ama", body: "hola", at: "" },
    { id: 3, from: "u3", name: "Cy", body: "yo", at: "" },
  ],
} as unknown as WebLobbyState;

async function mount(api: Partial<LobbyApi>) {
  const { createRoot } = await import("react-dom/client");
  const { RoomChat } = await import("../../app/(site)/play/RoomParts");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(createElement(RoomChat, { lobby, api: api as LobbyApi, chat: "", setChat: () => undefined, onSend: () => undefined })));
  return { host, unmount: () => act(async () => root.unmount()) };
}

const click = (el: Element | null | undefined) => act(async () => { (el as HTMLElement).click(); });
const buttons = (host: Element, label: string) => [...host.querySelectorAll("button")].filter((b) => b.textContent === label);
const lines = (host: Element) => [...host.querySelectorAll("[data-testid=messages] li")].map((l) => l.querySelector("b")?.textContent);

test("report and block failures show errors and bots have no actions", async () => {
  localStorage.clear();
  const api = {
    blocks: async () => [{ userId: "u3", name: "Cy", at: "" }],
    report: async () => { throw new LobbyError("rate_limited", 429); },
    block: async () => { throw new LobbyError("offline", 0); },
  };
  const { host, unmount } = await mount(api);
  assert.deepEqual(lines(host), ["Bo", "Ama"]);
  assert.equal(host.querySelectorAll("[data-testid=chat-report]").length, 1);
  await click(host.querySelector("[data-testid=chat-report]"));
  await click(buttons(host, "Harassment")[0]);
  assert.equal(host.querySelector("[data-testid=chat-sheet-error]")?.textContent, "Report not sent: Slow down a moment and try again.");
  await click(buttons(host, "Cancel")[0]);
  await click(host.querySelector("[data-testid=chat-block]"));
  await click(host.querySelector("[data-testid=chat-block-confirm]"));
  assert.equal(host.querySelector("[data-testid=chat-sheet-error]")?.textContent, "Block failed: No connection. Check your network.");
  assert.deepEqual(JSON.parse(localStorage.getItem(BLOCK_CACHE_KEY) ?? "[]").map((b: { userId: string }) => b.userId), ["u3"]);
  await unmount();
});

test("a block hides messages and a failed block list falls back to the saved copy", async () => {
  localStorage.setItem(BLOCK_CACHE_KEY, JSON.stringify([{ userId: "u2", name: "Bo", at: "" }]));
  const failing = await mount({ blocks: async () => { throw new LobbyError("offline", 0); } });
  assert.deepEqual(lines(failing.host), ["Ama", "Cy"]);
  assert.ok(failing.host.querySelector("[data-testid=chat-blocks-notice]"));
  await failing.unmount();
  localStorage.clear();
  const ok = await mount({ blocks: async () => [], block: async () => [{ userId: "u2", name: "Bo", at: "" }] });
  assert.equal(ok.host.querySelector("[data-testid=chat-blocks-notice]"), null);
  await click(ok.host.querySelector("[data-testid=chat-block]"));
  await click(ok.host.querySelector("[data-testid=chat-block-confirm]"));
  assert.deepEqual(lines(ok.host), ["Ama", "Cy"]);
  await ok.unmount();
});
