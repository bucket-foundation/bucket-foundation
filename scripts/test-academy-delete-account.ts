import test from "node:test";
import assert from "node:assert/strict";
import { deleteAccount, PERSONAL_TABLES, type DeleteAccountClients } from "../src/lib/academy/delete-account";

function world(over: Partial<DeleteAccountClients> = {}) {
  const log: string[] = [];
  const clients: DeleteAccountClients = {
    getUser: async (token) => (log.push(`user ${token}`), token === "good" ? { id: "u1", status: null } : { id: null, status: 401 }),
    deleteRows: async (table, id) => (log.push(`rows ${table} ${id}`), { failed: false }),
    deleteUser: async (id) => (log.push(`auth ${id}`), { status: null }),
    ...over,
  };
  return { clients, log };
}

test("rows go before the auth user, for the token's own id", async () => {
  const w = world();
  assert.deepEqual(await deleteAccount(w.clients, "good"), { status: null });
  assert.deepEqual(w.log, ["user good", ...PERSONAL_TABLES.map((t) => `rows ${t} u1`), "auth u1"]);
});

test("an unknown token deletes nothing", async () => {
  const w = world();
  assert.deepEqual(await deleteAccount(w.clients, "bad"), { status: 401 });
  assert.deepEqual(w.log, ["user bad"]);
});

test("a failed row delete stops before the auth user is removed", async () => {
  const w = world({ deleteRows: async () => ({ failed: true }) });
  assert.deepEqual(await deleteAccount(w.clients, "good"), { status: 500 });
  assert.equal(w.log.some((l) => l.startsWith("auth")), false);
});

test("an auth delete failure is reported", async () => {
  assert.deepEqual(await deleteAccount(world({ deleteUser: async () => ({ status: 500 }) }).clients, "good"), { status: 500 });
});

test("a lookup outage is not reported as a revoked token", async () => {
  assert.deepEqual(await deleteAccount(world({ getUser: async () => ({ id: null, status: 503 }) }).clients, "good"), { status: 503 });
});
