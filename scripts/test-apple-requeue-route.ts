import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import * as route from "../src/app/api/admin/apple-revoke/requeue/route";

const KEY = "k".repeat(32);
const post = (headers: Record<string, string>) => route.POST(new NextRequest("http://localhost/api/admin/apple-revoke/requeue", { method: "POST", headers }));

test("missing, wrong or too-short admin keys get 404", async () => {
  process.env.WAITLIST_ADMIN_KEY = KEY;
  assert.equal((await post({})).status, 404);
  assert.equal((await post({ authorization: "Bearer wrong-key-wrong-key-wrong" })).status, 404);
  assert.equal((await post({ authorization: `Basic ${KEY}` })).status, 404);
  process.env.WAITLIST_ADMIN_KEY = "short";
  assert.equal((await post({ authorization: "Bearer short" })).status, 404);
});

test("a right key without x-admin-id gets 400 before touching the store", async () => {
  process.env.WAITLIST_ADMIN_KEY = KEY;
  assert.equal((await post({ authorization: `Bearer ${KEY}` })).status, 400);
  assert.equal((await post({ authorization: `Bearer ${KEY}`, "x-admin-id": "has spaces" })).status, 400);
});

test("the route exports POST only, so Next answers 405 for other methods", () => {
  const methods = Object.keys(route).filter((k) => /^(GET|HEAD|PUT|PATCH|DELETE|OPTIONS)$/.test(k));
  assert.deepEqual(methods, []);
  assert.equal(typeof route.POST, "function");
});
