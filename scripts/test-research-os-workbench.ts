import { strict as assert } from "node:assert";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { parseSigningKeys, parseWorkbenchRequest, signWorkbenchRequest, workbenchRole } from "../src/lib/research-os/workbench";

const staff = (email: string) => email.endsWith("@example.org");

test("workbenchRole: non-staff and missing email get no role", () => {
  assert.equal(workbenchRole(null, staff, "f@example.org"), null);
  assert.equal(workbenchRole("x@other.org", staff, "f@example.org"), null);
});

test("workbenchRole: founder only when the email matches BUCKET_FOUNDER_EMAIL", () => {
  assert.equal(workbenchRole("F@example.org", staff, "f@example.org"), "founder");
  assert.equal(workbenchRole("s@example.org", staff, "f@example.org"), "staff");
  assert.equal(workbenchRole("f@example.org", staff, ""), "staff");
});

test("parseWorkbenchRequest: accepts the four actions and rejects the rest", () => {
  assert.deepEqual(parseWorkbenchRequest({ action: "tools" }), { action: "tools" });
  assert.deepEqual(parseWorkbenchRequest({ action: "run", tool: "helix_run", args: { input: "x" } }), {
    action: "run",
    tool: "helix_run",
    args: { input: "x" },
  });
  assert.equal(parseWorkbenchRequest({ action: "delete" }), null);
  assert.equal(parseWorkbenchRequest({ action: "run", tool: "../x" }), null);
  assert.equal(parseWorkbenchRequest({ action: "run", tool: "a", args: [] }), null);
  assert.equal(parseWorkbenchRequest({ action: "cancel", run_id: "nope" }), null);
  assert.ok(parseWorkbenchRequest({ action: "cancel", run_id: "a".repeat(32) }));
  assert.equal(parseWorkbenchRequest(null), null);
});

test("parseSigningKeys: splits, trims and refuses short keys", () => {
  assert.deepEqual(parseSigningKeys(undefined), []);
  assert.deepEqual(parseSigningKeys(` ${"a".repeat(32)} , ${"b".repeat(40)}`), ["a".repeat(32), "b".repeat(40)]);
  assert.throws(() => parseSigningKeys("short"));
});

test("signWorkbenchRequest: HMAC over the exact body, with expiry and nonce", () => {
  const key = "k".repeat(32);
  const { body, signature } = signWorkbenchRequest("S@Example.org", "staff", { action: "run", tool: "t", args: {} }, key, 1000, "n".repeat(32));
  const msg = JSON.parse(body);
  assert.equal(msg.user, "s@example.org");
  assert.equal(msg.role, "staff");
  assert.equal(msg.exp, 1060);
  assert.equal(msg.nonce, "n".repeat(32));
  assert.equal(msg.action, undefined);
  assert.equal(signature, createHmac("sha256", key).update(body).digest("hex"));
});
