import { expect, test } from "bun:test";
import { isOffline, OfflineError, offlineFetch, page } from "../src/serve";

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

test("BKT_OFFLINE=1 alone turns offline on", () => {
  expect(isOffline({ BKT_OFFLINE: "1" })).toBe(true);
  expect(isOffline({ BKT_OFFLINE: "0" })).toBe(false);
  expect(isOffline({})).toBe(false);
});

test("the launch page tells the window it is offline", () => {
  expect(page("n", undefined, true).html).toContain('window.__BKT__={"nonce":"n","offline":true}');
  expect(page("n").html).toContain('window.__BKT__={"nonce":"n"}');
});
