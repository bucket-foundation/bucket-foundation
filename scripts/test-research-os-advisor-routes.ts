import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { inLaunchScope } from "../src/lib/research-os/launch-scope";

const BASE = "http://localhost/api/research-os/advisors";

function req(path: string, method: string, body?: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`${BASE}/${path}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}

test("match and swipes are staff-only at launch; the opt-out and its page are public", () => {
  assert.equal(inLaunchScope("/api/research-os/advisors/match"), false);
  assert.equal(inLaunchScope("/api/research-os/advisors/swipes"), false);
  assert.equal(inLaunchScope("/research-os/advisors"), false);
  assert.equal(inLaunchScope("/api/research-os/advisors/optout"), true);
  assert.equal(inLaunchScope("/research-os/remove-advisor"), true);
});

test("anonymous calls to match and swipes are refused before any data is read", async () => {
  const match = await import("../src/app/api/research-os/advisors/match/route");
  const swipes = await import("../src/app/api/research-os/advisors/swipes/route");
  for (const res of [
    await match.POST(req("match", "POST", { text: "mitochondria membranes" })),
    await swipes.GET(req("swipes", "GET")),
    await swipes.PUT(req("swipes", "PUT", { openalexId: "A1", decision: "yes" })),
    await swipes.DELETE(req("swipes", "DELETE")),
  ]) {
    assert.ok([401, 404].includes(res.status), `status ${res.status}`);
    assert.equal(res.headers.get("cache-control")?.includes("no-store") ?? true, true);
  }
});

test("the opt-out validates input before it touches the database", async () => {
  const { POST } = await import("../src/app/api/research-os/advisors/optout/route");
  const cases: [unknown, number][] = [
    ["not json", 400],
    [{ contact: "me@x.org" }, 400],
    [{ openalexId: "B123", contact: "me@x.org" }, 400],
    [{ orcid: "1234", contact: "me@x.org" }, 400],
    [{ openalexId: "A123", contact: "x" }, 400],
    [{ openalexId: "A123", contact: "me@x.org", website: "spam" }, 200],
    ["x".repeat(5000), 413],
  ];
  for (const [body, status] of cases) {
    const res = await POST(req("optout", "POST", body));
    assert.equal(res.status, status, JSON.stringify(body).slice(0, 60));
  }
});
