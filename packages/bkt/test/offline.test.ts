import { expect, test } from "bun:test";
import { isOffline, OfflineError, offlineFetch, page, startServe } from "../src/serve";

test("offlineFetch refuses every host outside loopback and records it", async () => {
  const seen: string[] = [];
  const refused: string[] = [];
  const base = (async (input: RequestInfo | URL) => (seen.push(String(input)), new Response("ok"))) as typeof fetch;
  const f = offlineFetch(base, (u) => refused.push(u));
  expect(await (await f("http://127.0.0.1:9/x")).text()).toBe("ok");
  expect(await (await f("http://localhost:9/x")).text()).toBe("ok");
  await expect(f("https://api.github.com/repos")).rejects.toBeInstanceOf(OfflineError);
  await expect(f(new URL("https://example.org/"))).rejects.toBeInstanceOf(OfflineError);
  await expect(f("not a url")).rejects.toBeInstanceOf(OfflineError);
  expect(seen).toEqual(["http://127.0.0.1:9/x", "http://localhost:9/x"]);
  expect(refused).toEqual(["https://api.github.com/repos", "https://example.org/", "not a url"]);
});

test("an offline serve guards fetch while it runs, reports an outside call and restores fetch when it stops", async () => {
  const original = globalThis.fetch;
  const refused: string[] = [];
  const srv = startServe({ offline: true, uid: 1, resolvePeerUid: () => 1, routes: {}, onError: (e) => refused.push(e.message) });
  try {
    expect((globalThis.fetch as { bktOffline?: boolean }).bktOffline).toBe(true);
    await expect(globalThis.fetch("https://offline-check.invalid/leak")).rejects.toBeInstanceOf(OfflineError);
    expect(refused.join(" ")).toContain("offline-check.invalid");
  } finally {
    srv.stop();
  }
  expect(globalThis.fetch).toBe(original);
});

test("a serve that did not install the guard leaves fetch alone when it stops", () => {
  const original = globalThis.fetch;
  const srv = startServe({ offline: false, uid: 1, resolvePeerUid: () => 1, routes: {} });
  srv.stop();
  expect(globalThis.fetch).toBe(original);
});

test("BKT_OFFLINE=1 alone turns offline on", () => {
  expect(isOffline({ BKT_OFFLINE: "1" })).toBe(true);
  expect(isOffline({ BKT_OFFLINE: "0" })).toBe(false);
  expect(isOffline({})).toBe(false);
});

test("the launch page tells the window it is offline", () => {
  expect(page("n", undefined, true).html).toContain('window.__BKT__={"nonce":"n","offline":true}');
  expect(page("n").html).toContain('window.__BKT__={"nonce":"n"}');
});
