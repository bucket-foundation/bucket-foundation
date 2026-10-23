import assert from "node:assert/strict";
import { test } from "node:test";
import { joinBeta, TESTFLIGHT_URL } from "./beta";

const env = { RESEND_API_KEY: "k", RESEND_BETA_AUDIENCE_ID: "aud" };
function fake(statuses: number[]) {
  const calls: string[] = [];
  const send = async (url: string) => {
    calls.push(url);
    return new Response("{}", { status: statuses[calls.length - 1] ?? 200 });
  };
  return { calls, send };
}

test("saves the contact, sends the welcome email and returns the link", async () => {
  const f = fake([200, 200]);
  const r = await joinBeta({ email: "Ana@Example.com" }, env, f.send);
  assert.equal(r.status, 200);
  assert.equal(r.body.testflight, TESTFLIGHT_URL);
  assert.deepEqual(f.calls, ["https://api.resend.com/audiences/aud/contacts", "https://api.resend.com/emails"]);
});

test("rejects a bad email without calling Resend", async () => {
  const f = fake([]);
  const r = await joinBeta({ email: "nope" }, env, f.send);
  assert.equal(r.status, 400);
  assert.equal(f.calls.length, 0);
});

test("reports a failed save", async () => {
  const f = fake([500]);
  const r = await joinBeta({ email: "a@b.co" }, env, f.send);
  assert.equal(r.status, 502);
  assert.equal(f.calls.length, 1);
});

test("treats an existing contact as saved", async () => {
  const f = fake([409, 200]);
  assert.equal((await joinBeta({ email: "a@b.co" }, env, f.send)).status, 200);
});

test("returns 503 when keys are missing", async () => {
  assert.equal((await joinBeta({ email: "a@b.co" }, {}, fake([]).send)).status, 503);
});

test("skips Resend for the honeypot", async () => {
  const f = fake([]);
  const r = await joinBeta({ email: "a@b.co", website: "x" }, env, f.send);
  assert.equal(r.status, 200);
  assert.equal(f.calls.length, 0);
});
