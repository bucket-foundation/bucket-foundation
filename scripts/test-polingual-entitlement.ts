import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { handleEntitlement } from "../src/app/api/polingual/entitlement/handler";

const USER = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";

function req(auth: string | null): NextRequest {
  const headers: Record<string, string> = auth ? { authorization: `Bearer ${auth}` } : {};
  return new NextRequest("http://localhost/api/polingual/entitlement", { headers });
}

const verifyUser = async (r: NextRequest) => {
  const token = r.headers.get("authorization")?.replace(/^Bearer /, "");
  return token ? { id: token, email: null } : null;
};

const founders = new Set([USER]);
const store = () => ({ isFoundingTester: async (id: string) => founders.has(id) });

test("entitlement rejects a request without a user", async () => {
  const res = await handleEntitlement(req(null), { verifyUser, store });
  assert.equal(res.status, 401);
  assert.equal(res.headers.get("cache-control"), "no-store");
});

test("entitlement reports founding for the bearer user", async () => {
  assert.deepEqual(await (await handleEntitlement(req(USER), { verifyUser, store })).json(), { founding: true });
  assert.deepEqual(await (await handleEntitlement(req(OTHER), { verifyUser, store })).json(), { founding: false });
});

test("entitlement answers 503 without a store and 500 when the store fails", async () => {
  assert.equal((await handleEntitlement(req(USER), { verifyUser, store: () => null })).status, 503);
  const broken = () => ({ isFoundingTester: async () => { throw new Error("down"); } });
  const res = await handleEntitlement(req(USER), { verifyUser, store: broken });
  assert.equal(res.status, 500);
  assert.deepEqual(await res.json(), { error: "entitlement_failed" });
});
