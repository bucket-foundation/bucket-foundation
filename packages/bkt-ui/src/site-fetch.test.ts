import { describe, expect, test } from "bun:test";
import { OFFLINE_MESSAGE, siteFetch, windowHref } from "./site-fetch";

const origin = "http://127.0.0.1:4100";
const token = "t".repeat(43);

function recorder() {
  const calls: { input: RequestInfo | URL; init?: RequestInit }[] = [];
  const base = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    return new Response("{}");
  }) as typeof fetch;
  return { base, calls };
}

describe("Research OS fetch bridge", () => {
  test("routes a Request with its POST body, token and cancellation signal", async () => {
    const { base, calls } = recorder();
    const request = new Request(`${origin}/api/research-os/profile`, { method: "POST", body: '{"role":"student"}' });
    await siteFetch(base, origin, token, true)(request);
    expect(calls[0].input).toBe("/local/ros/profile");
    expect(calls[0].init?.body).toBe('{"role":"student"}');
    expect(calls[0].init?.signal).toBe(request.signal);
    expect(new Headers(calls[0].init?.headers).get("authorization")).toBe(`Bucket ${token}`);
    expect(request.bodyUsed).toBe(false);
  });

  test("RequestInit overrides a Request body and keeps GET query parameters", async () => {
    const { base, calls } = recorder();
    const request = new Request(`${origin}/api/research-os/state`, { method: "POST", body: "old" });
    const fetcher = siteFetch(base, origin, token);
    await fetcher(request, { body: "new" });
    await fetcher(`${origin}/api/research-os/graph?branch=02-physics`);
    expect(calls[0].init?.body).toBe("new");
    expect(calls[1].input).toBe("/local/ros/graph?branch=02-physics");
    expect(calls[1].init?.body).toBeUndefined();
  });

  test("foreign origins receive no Bucket token and offline requests are refused", async () => {
    const { base, calls } = recorder();
    const foreign = "https://example.com/api/research-os/profile";
    await siteFetch(base, origin, token)(foreign);
    expect(calls[0]).toEqual({ input: foreign, init: undefined });
    await expect(siteFetch(base, origin, token, true)(foreign)).rejects.toThrow(OFFLINE_MESSAGE);
    expect(calls).toHaveLength(1);
  });

  test("links preserve Explore, map, profile and learn destinations", () => {
    expect(windowHref("/explore?mode=circle")).toBe("#/explore");
    expect(windowHref("/research-os/map?branch=02-physics")).toBe("#/graph/02-physics");
    expect(windowHref("/research-os/map?view=globe")).toBe("#/canon");
    expect(windowHref("/research-os/profile")).toBe("#/profile");
    expect(windowHref("/research-os/learn/path")).toBe("#/learn");
    expect(windowHref("/research-os/learn/02-physics/heat")).toBe("#/learn/02-physics/heat");
    expect(windowHref("/research-os/n/02-physics%3Aheat")).toBe("#/node/02-physics%3Aheat");
  });

  test("malformed and foreign links stay outside the local router", () => {
    expect(windowHref("/research-os/n/%")).toBeNull();
    expect(windowHref("/research-os/learn/%")).toBeNull();
    expect(windowHref("https://example.com/research-os/profile")).toBeNull();
    expect(windowHref("//example.com/research-os/profile")).toBeNull();
  });
});
