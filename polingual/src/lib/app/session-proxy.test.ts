import { test } from "node:test";
import assert from "node:assert/strict";
import { verifiedProxyIp } from "@academy/proxy-ip";
import { proxySession } from "./session-proxy";

const NOW = Date.parse("2027-01-01T00:00:00Z");

function capture() {
  const seen: { url: string; headers: Headers; body: string }[] = [];
  const f = (async (url: RequestInfo | URL, init?: RequestInit) => {
    seen.push({ url: String(url), headers: new Headers(init?.headers), body: String(init?.body) });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as typeof fetch;
  return { seen, f };
}

const req = () => new Request("https://www.polingual.com/api/academy/session", { method: "POST", headers: { "x-vercel-forwarded-for": "203.0.113.9", "x-forwarded-for": "6.6.6.6" }, body: JSON.stringify({ action: "otp", email: "a@b.co", app: "polingual" }) });

test("signed proxy forwards the edge client IP that bucket.foundation verifies", async () => {
  const { seen, f } = capture();
  const r = await proxySession(req(), { base: "https://www.bucket.foundation", secret: "s3cret", fetch: f, now: NOW });
  assert.equal(r.status, 200);
  assert.equal(seen[0].url, "https://www.bucket.foundation/api/academy/session");
  assert.equal(JSON.parse(seen[0].body).app, "polingual");
  assert.equal(verifiedProxyIp(seen[0].headers, "s3cret", NOW), "203.0.113.9");
  assert.equal(verifiedProxyIp(seen[0].headers, "wrong", NOW), null);
});

test("without a secret the proxy sends no IP headers", async () => {
  const { seen, f } = capture();
  await proxySession(req(), { base: "https://b", secret: undefined, fetch: f, now: NOW });
  assert.equal(seen[0].headers.get("x-polingual-client-ip"), null);
});

test("an unreachable upstream answers 502 offline", async () => {
  const f = (async () => {
    throw new Error("down");
  }) as typeof fetch;
  const r = await proxySession(req(), { base: "https://b", secret: "s", fetch: f, now: NOW });
  assert.equal(r.status, 502);
  assert.deepEqual(await r.json(), { error: "offline" });
});
