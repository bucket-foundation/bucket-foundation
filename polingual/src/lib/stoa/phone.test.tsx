import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { JSDOM } from "jsdom";
import { createRoomKeys, openSignKey, signEvent } from "./keys";
import { isNickname } from "./nicknames";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://polingual.com/join/QZ7K2M" });
const g = globalThis as Record<string, unknown>;
for (const k of ["window", "document", "navigator", "HTMLElement", "Node", "Event", "MouseEvent", "sessionStorage", "localStorage", "getComputedStyle"]) {
  Object.defineProperty(g, k, { value: (dom.window as unknown as Record<string, unknown>)[k], configurable: true, writable: true });
}
g.IS_REACT_ACT_ENVIRONMENT = true;
g.requestAnimationFrame = (cb: () => void) => setTimeout(cb, 0);

const env = { STOA_ROOM_SECRET: randomBytes(48).toString("base64") };
const RID = randomUUID();
const PID = randomUUID();
const KEYS = createRoomKeys(RID, env);
const SIGN = openSignKey(RID, KEYS.signKey, env)!;
const FORGER = openSignKey(RID, createRoomKeys(RID, env).signKey, env)!;
const RT = { url: "https://rt.test", key: "anon", topic: "stoa:t" };

class FakeSocket {
  static all: FakeSocket[] = [];
  readonly OPEN = 1;
  readyState = 0;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((m: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public url: string) {
    FakeSocket.all.push(this);
    setTimeout(() => {
      this.readyState = 1;
      this.onopen?.();
    }, 0);
  }
  send(frame: string) {
    this.sent.push(frame);
    const f = JSON.parse(frame) as { event: string; ref: string; topic: string };
    if (f.event === "phx_join") setTimeout(() => this.onmessage?.({ data: JSON.stringify({ event: "phx_reply", ref: f.ref, topic: f.topic, payload: { status: "ok", response: {} } }) }), 0);
  }
  close() {
    this.readyState = 3;
  }
  push(event: unknown) {
    this.onmessage?.({ data: JSON.stringify({ event: "broadcast", topic: "realtime:stoa:t", payload: { event: "stoa", payload: event } }) });
  }
}
g.WebSocket = FakeSocket;
const mounted = new Set<{ unmount(): void }>();
function track<R extends { unmount(): void }>(r: R): R {
  const unmount = r.unmount.bind(r);
  r.unmount = () => {
    mounted.delete(r);
    unmount();
  };
  mounted.add(r);
  return r;
}
after(async () => {
  const { act } = await import("react");
  for (const r of [...mounted]) await act(async () => r.unmount());
  dom.window.close();
});

type Call = { url: string; body: unknown };
const calls: Call[] = [];
const q0 = { idx: 0, round: 1, kind: "pick_word", prompt: { home: "water", home_lang: "en", lang: "es" }, options: ["agua", "fuego", "tierra", "aire"] };
let snapshot: Record<string, unknown> = {};

function snap(phase: string, extra: Record<string, unknown> = {}, room: Record<string, unknown> = {}, player: Record<string, unknown> = {}) {
  snapshot = {
    server_now: Date.now(),
    room: { id: RID, code: "QZ7K2M", phase, idx: phase === "lobby" ? -1 : 0, seq: 1, token_version: 1, verify_key: KEYS.verifyKey, opens_at: Date.now(), closes_at: Date.now() + 20_000, next_at: null, paused: false, locked: false, school_mode: false, expires_at: Date.now() + 3_600_000, total: 15, players: 2, ...room },
    standings: [{ player_id: PID, nickname: "brave-otter", points: 990 }],
    player: { id: PID, nickname: "brave-otter", removed: false, points: 0, streak: 0, choice: null, ...player },
    realtime: RT,
    ...extra,
  };
}

g.fetch = async (input: string, init: RequestInit = {}) => {
  const url = String(input);
  const body = init.body ? JSON.parse(String(init.body)) : null;
  calls.push({ url, body });
  if (url === "/api/live/join") return Response.json({ room_id: RID, player_id: PID, token: `e30.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.sig`, verify_key: KEYS.verifyKey, realtime: RT });
  if (url === `/api/live/rooms/${RID}/state`) return Response.json({ ...snapshot, server_now: Date.now() });
  if (url === "/api/live/answer") return Response.json({ received_at: Date.now() });
  if (url === "/api/live/probe") return Response.json({ rotated: false });
  return new Response("{}", { status: 404 });
};

async function until(check: () => boolean, label: string, ms = 15_000) {
  const { act } = await import("react");
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (check()) return;
    await act(async () => {
      await new Promise((r) => setTimeout(r, 25));
    });
  }
  assert.fail(`timed out waiting for ${label}`);
}

const $ = (id: string) => dom.window.document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
const $$ = (id: string) => [...dom.window.document.querySelectorAll(`[data-testid="${id}"]`)] as HTMLElement[];
let seq = 1;
const ev = (type: string, payload: unknown, key = SIGN) => signEvent(RID, ++seq, type, Date.now(), payload, key);

test("a phone joins, verifies signed events, answers and sees school mode stay free of links", async () => {
  const { act, createElement } = await import("react");
  const { createRoot: makeRoot } = await import("react-dom/client");
  const createRoot = (el: Element) => track(makeRoot(el));
  const { default: Phone } = await import("../../app/(site)/join/Phone");
  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  const root = createRoot(host);
  snap("lobby");
  await act(async () => root.render(createElement(Phone, { initialCode: "qz7k2m" })));

  await until(() => $$("nickname").length === 3, "three nickname choices");
  const names = $$("nickname").map((b) => b.textContent ?? "");
  assert.ok(names.every((n) => isNickname(n.toLowerCase().replace(" ", "-"))), names.join(","));
  await act(async () => $$("nickname")[0].click());
  await until(() => Boolean($("phone-lobby")), "the lobby");
  const joined = calls.find((c) => c.url === "/api/live/join")!;
  assert.equal((joined.body as { code: string }).code, "QZ7K2M");
  assert.ok(calls.some((c) => c.url === `/api/live/rooms/${RID}/state`), "the phone fetches state on load");
  await until(() => $("phone-status")?.dataset.socket === "open", "the socket");
  const sock = FakeSocket.all[0];
  assert.match(sock.url, /^wss:\/\/rt\.test\/realtime\/v1\/websocket\?apikey=anon/);

  for (let i = 0; i < 3; i++) await act(async () => sock.push(ev("probe", {})));
  await until(() => calls.some((c) => c.url === "/api/live/probe" && Array.isArray((c.body as { samples?: unknown[] }).samples)), "the latency report");

  const forged = signEvent(RID, seq + 1, "open", Date.now(), { ...q0, prompt: { home: "forged", home_lang: "en", lang: "es" }, opens_at: Date.now(), closes_at: Date.now() + 20_000 }, FORGER);
  await act(async () => sock.push(forged));
  await until(() => calls.some((c) => c.url === "/api/live/probe" && (c.body as { failed?: boolean }).failed === true), "the forged event report");
  assert.equal($("prompt"), null, "a forged open never renders");

  await act(async () => sock.push(ev("open", { ...q0, total: 15, opens_at: Date.now(), closes_at: Date.now() + 20_000 })));
  await until(() => Boolean($("prompt")), "the question");
  assert.match($("prompt")!.textContent ?? "", /water.*Spanish/);
  assert.ok(!$$("tiles")[0].innerHTML.includes('data-state="right"'), "no answer key before reveal");
  const tiles = ["A", "B", "C", "D"].map((l) => $(`tile-${l}`)!);
  assert.deepEqual(tiles.map((t) => t.getAttribute("aria-label")), ["A, wave, agua", "B, spark, fuego", "C, leaf, tierra", "D, crescent, aire"]);
  assert.equal($("timer-announce")?.getAttribute("aria-live"), "polite");

  await act(async () => tiles[1].click());
  await until(() => Boolean($("locked")), "the lock");
  assert.deepEqual(calls.find((c) => c.url === "/api/live/answer")?.body, { idx: 0, choice: 1 });
  assert.match($("tile-B")!.getAttribute("aria-label") ?? "", /your answer/);

  snap("reveal", { question: { ...q0, answer: 1, counts: [0, 2, 0, 0] } }, { seq: seq + 1 }, { choice: 1, points: 990 });
  await act(async () => sock.push(ev("reveal", { idx: 0, answer: 1, counts: [0, 2, 0, 0], right: 2 })));
  await until(() => /Right/.test($("result")?.textContent ?? ""), "the reveal");
  assert.match($("tile-B")!.getAttribute("aria-label") ?? "", /correct/);

  snap("finale", {}, { seq: seq + 1, school_mode: true }, { points: 990 });
  await act(async () => sock.push(ev("finale", { top: [] })));
  await until(() => Boolean($("phone-finale")), "the school-mode finale");
  const links = [...dom.window.document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href"));
  assert.deepEqual(links, [], "school mode shows no links at all");
  assert.ok($("brand-plain"), "the brand is plain text on phones");

  snap("closed", {}, { seq: seq + 1, school_mode: false }, { points: 990 });
  await act(async () => sock.push(ev("closed", { top: [] })));
  await until(() => Boolean($("app-link")), "the promo outside school mode");

  await act(async () => root.unmount());
});

test("a phone that reloads or loses its tab finds its seat again, and a removed seat is dropped", async () => {
  const { act, createElement } = await import("react");
  const { createRoot: makeRoot } = await import("react-dom/client");
  const createRoot = (el: Element) => track(makeRoot(el));
  const { default: Phone } = await import("../../app/(site)/join/Phone");
  assert.equal(dom.window.localStorage.getItem("stoa/seats/v1"), null, "the closed room from the last test dropped its seat");
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const tok = `e30.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.sig`;
  dom.window.localStorage.setItem("stoa/seats/v1", JSON.stringify([{ room_id: RID, player_id: PID, token: tok, code: "QZ7K2M", exp: exp * 1000 }]));
  dom.window.sessionStorage.clear();
  calls.length = 0;
  snap("question", { question: { ...q0, answer: null, counts: null } }, { seq: seq + 1 }, { choice: 2, points: 990 });

  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(createElement(Phone, { initialCode: "QZ7K2M" })));
  await until(() => Boolean($("continue")), "the continue choice after a reload");
  await act(async () => $("continue")!.click());
  await until(() => Boolean($("locked")), "the locked answer after a reload");
  assert.equal(calls.some((c) => c.url === "/api/live/join"), false, "no second join, so the score stays");
  assert.ok(calls.some((c) => c.url === `/api/live/rooms/${RID}/state`));
  await act(async () => root.unmount());
  host.remove();

  const other = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(other);
  const fresh = createRoot(other);
  await act(async () => fresh.render(createElement(Phone, { initialCode: "AB12CD" })));
  await until(() => $$("nickname").length === 3, "a different code starts a new join");
  await act(async () => fresh.unmount());
  other.remove();

  const real = g.fetch as (input: string, init?: RequestInit) => Promise<Response>;
  g.fetch = async (input: string, init: RequestInit = {}) => (String(input).endsWith("/state") ? new Response("{}", { status: 403 }) : real(input, init));
  const gone = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(gone);
  const removed = createRoot(gone);
  await act(async () => removed.render(createElement(Phone, { initialCode: "QZ7K2M" })));
  await until(() => Boolean($("continue")), "the continue choice");
  await act(async () => $("continue")!.click());
  await until(() => /removed you/.test($("phone-error")?.textContent ?? ""), "the removal message");
  assert.equal(dom.window.localStorage.getItem("stoa/seats/v1"), null, "a removed seat leaves storage");
  await act(async () => removed.unmount());
  gone.remove();
  g.fetch = real;
});

test("on a shared phone /join starts clean, Leave game clears the seat, and 401 or 404 drops it", async () => {
  const { act, createElement } = await import("react");
  const { createRoot: makeRoot } = await import("react-dom/client");
  const createRoot = (el: Element) => track(makeRoot(el));
  const { default: Phone } = await import("../../app/(site)/join/Phone");
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const tok = `${Buffer.from("{}").toString("base64url")}.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.sig`;
  const store = () => dom.window.localStorage.setItem("stoa/seats/v1", JSON.stringify([{ room_id: RID, player_id: PID, token: tok, code: "QZ7K2M", exp: exp * 1000, nickname: "brave-otter" }]));
  const cont = async () => {
    await until(() => Boolean($("continue")), "the continue choice");
    assert.equal($("continue")!.textContent, "Continue as Brave Otter");
    await act(async () => $("continue")!.click());
  };
  const mount = async (props: Record<string, unknown>) => {
    const el = dom.window.document.createElement("div");
    dom.window.document.body.appendChild(el);
    const root = createRoot(el);
    await act(async () => root.render(createElement(Phone, props)));
    return async () => {
      await act(async () => root.unmount());
      el.remove();
    };
  };
  snap("lobby", {}, { seq: seq + 1 });

  store();
  calls.length = 0;
  let done = await mount({});
  await until(() => Boolean($("join-code")), "the code entry");
  await act(async () => new Promise((r) => setTimeout(r, 100)));
  assert.equal(calls.length, 0, "the next student sees the code screen and nobody's seat");
  await done();

  done = await mount({});
  await act(async () => {
    const input = $("code-input") as HTMLInputElement;
    const set = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!;
    set.call(input, "qz7k2m");
    input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
  await act(async () => ($("join-code") as HTMLFormElement).requestSubmit());
  await until(() => Boolean($("someone-new")), "the choice when a typed code has a stored seat");
  await act(async () => $("someone-new")!.click());
  await until(() => $$("nickname").length === 3, "fresh names for the next student");
  assert.equal(dom.window.localStorage.getItem("stoa/seats/v1"), null, "joining as someone new drops the earlier seat");
  assert.equal(calls.length, 0, "nobody's seat was opened");
  await done();

  store();
  done = await mount({ initialCode: "QZ7K2M" });
  await cont();
  await until(() => Boolean($("phone-lobby")), "the previous seat on the QR link");
  await act(async () => $("leave")!.click());
  await until(() => Boolean($("join-code")), "the code screen after leaving");
  assert.equal(dom.window.localStorage.getItem("stoa/seats/v1"), null, "Leave game clears the stored seat");
  await done();

  const real = g.fetch as (input: string, init?: RequestInit) => Promise<Response>;
  for (const status of [401, 404]) {
    store();
    g.fetch = async (input: string, init: RequestInit = {}) => (String(input).endsWith("/state") ? new Response("{}", { status }) : real(input, init));
    done = await mount({ initialCode: "QZ7K2M" });
    await cont();
    await until(() => /ended/.test($("phone-error")?.textContent ?? ""), `the ended message on ${status}`);
    assert.equal(dom.window.localStorage.getItem("stoa/seats/v1"), null, `${status} drops the seat`);
    await done();
  }
  g.fetch = real;

  store();
  snap("closed", {}, { seq: seq + 1 });
  done = await mount({ initialCode: "QZ7K2M" });
  await cont();
  await until(() => Boolean($("phone-finale")), "the closed room");
  assert.equal(dom.window.localStorage.getItem("stoa/seats/v1"), null, "a closed room drops the seat");
  await done();
});

test("the screens keep D8 tokens, self-hosted fonts, RTL-safe tiles and the QR on the host only", () => {
  const app = join(__dirname, "../../app/(site)");
  const css = readFileSync(join(app, "live/stoa.module.css"), "utf8");
  for (const token of ["--lapis:var(--pl-lapis)", "--malachite:var(--pl-malachite)", "--malachite-lip:var(--pl-malachite-deep)", "--vermilion:var(--pl-vermilion)", "--parchment:var(--pl-paper)", "--ink:var(--pl-ink)", "--hair:var(--pl-paper-3)"]) assert.ok(css.includes(token), token);
  assert.ok(!/\.tiles\{[^}]*direction/.test(css), "phone tiles follow the page direction");
  assert.ok(/\.tiles\.grid\{direction:ltr/.test(css), "the board grid keeps A to D in place");
  assert.match(readFileSync(join(app, "live/host/Board.tsx"), "utf8"), /variant="quiet" size="md" iconOnly/);
  for (const f of ["live/layout.tsx", "join/layout.tsx", "join/Phone.tsx", "live/parts.tsx"]) assert.ok(!readFileSync(join(app, f), "utf8").includes("googleapis"), f);
  for (const f of ["join/Phone.tsx", "live/parts.tsx"]) assert.ok(!readFileSync(join(app, f), "utf8").includes("qrcode-generator"), f);
  assert.match(readFileSync(join(app, "live/host/Board.tsx"), "utf8"), /dynamic\(\(\) => import\("\.\.\/Qr"\)/);
});
