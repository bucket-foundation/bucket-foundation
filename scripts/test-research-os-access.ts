/**
 * Unit tests: the Access level rules (ros-21), src/lib/research-os/access.ts.
 * Pure, no I/O, no live Supabase; node:test + node:assert, plain fixtures.
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-research-os-access.ts
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  can,
  canView,
  decideRequest,
  grantAllowed,
  nextVisibility,
  requestAllowed,
  visibleNodeIds,
  type AccessRequest,
  type NodeAccess,
  type NodeGrant,
} from "../src/lib/research-os/access";

const owner = { id: "owner" };
const alice = { id: "alice" };
const bob = { id: "bob", groups: ["class:c1"] };
const anon = { id: null };

const pub: NodeAccess = { id: "n-pub", visibility: "public", ownerId: "owner" };
const priv: NodeAccess = { id: "n-priv", visibility: "private", ownerId: "owner" };
const shared: NodeAccess = { id: "n-shared", visibility: "shared", ownerId: "owner" };

const grants: NodeGrant[] = [
  { nodeId: "n-shared", granteeId: "alice", role: "extend" },
  { nodeId: "n-shared", granteeGroup: "class:c1", role: "view" },
  { nodeId: "n-shared", granteeId: "carol", role: "cite", expiresAt: "2000-01-01T00:00:00Z" },
  { nodeId: "n-pub", granteeId: "alice", role: "review" },
];

test("public nodes: anyone views, continues, extends, cites, replicates; review needs a grant", () => {
  assert.equal(canView(pub, anon), true);
  for (const a of ["continue", "extend", "cite", "replicate"] as const) assert.equal(can(pub, anon, a), true);
  assert.equal(can(pub, bob, "review", grants), false);
  assert.equal(can(pub, alice, "review", grants), true);
});

test("private nodes: owner only", () => {
  assert.equal(canView(priv, owner), true);
  assert.equal(canView(priv, alice, grants), false);
  assert.equal(can(priv, alice, "cite", grants), false);
  assert.equal(can(priv, owner, "review"), true);
});

test("shared nodes: a grant to the person or to a group they belong to", () => {
  assert.equal(canView(shared, alice, grants), true);
  assert.equal(can(shared, alice, "extend", grants), true);
  assert.equal(can(shared, alice, "cite", grants), false, "extend does not imply cite");
  assert.equal(canView(shared, bob, grants), true, "group grant views");
  assert.equal(can(shared, bob, "extend", grants), false);
  assert.equal(canView(shared, { id: "dave" }, grants), false);
});

test("an expired grant does not count", () => {
  assert.equal(canView(shared, { id: "carol" }, grants, new Date("2001-01-01T00:00:00Z")), false);
  assert.equal(canView(shared, { id: "carol" }, grants, new Date("1999-01-01T00:00:00Z")), true);
});

test("visibleNodeIds keeps input order and filters", () => {
  assert.deepEqual(visibleNodeIds([priv, pub, shared], alice, grants), ["n-pub", "n-shared"]);
  assert.deepEqual(visibleNodeIds([priv, pub, shared], anon, grants), ["n-pub"]);
});

test("only the owner changes visibility or grants; public grants only for review", () => {
  assert.equal(nextVisibility(priv, alice, "public"), null);
  assert.equal(nextVisibility(priv, owner, "shared"), "shared");
  assert.equal(grantAllowed(shared, alice, "cite"), false);
  assert.equal(grantAllowed(shared, owner, "cite"), true);
  assert.equal(grantAllowed(pub, owner, "cite"), false);
  assert.equal(grantAllowed(pub, owner, "review"), true);
});

test("requests: only when the requester lacks the verb and there is an owner to ask", () => {
  assert.equal(requestAllowed(pub, alice, "cite", grants), false, "already open");
  assert.equal(requestAllowed(shared, alice, "extend", grants), false, "already granted");
  assert.equal(requestAllowed(shared, alice, "cite", grants), true);
  assert.equal(requestAllowed(priv, alice, "continue", grants), true);
  assert.equal(requestAllowed(priv, owner, "continue", grants), false);
  assert.equal(requestAllowed(anonNode(), alice, "cite", grants), false, "no owner to ask");
  assert.equal(requestAllowed(priv, anon, "cite", grants), false);
});

test("decideRequest: owner grants and a grant row follows; denial writes none; twice is refused", () => {
  const req: AccessRequest = { nodeId: "n-shared", requesterId: "dave", purpose: "cite", status: "pending" };
  assert.equal(decideRequest(shared, req, alice, "granted"), null);
  const granted = decideRequest(shared, req, owner, "granted", new Date("2026-09-15T00:00:00Z"));
  assert.ok(granted);
  assert.equal(granted.request.status, "granted");
  assert.equal(granted.request.decidedBy, "owner");
  assert.deepEqual(granted.grant, { nodeId: "n-shared", granteeId: "dave", role: "cite" });
  const denied = decideRequest(shared, req, owner, "denied");
  assert.ok(denied);
  assert.equal(denied.grant, null);
  assert.equal(decideRequest(shared, granted.request, owner, "denied"), null, "already decided");
});

function anonNode(): NodeAccess {
  return { id: "n-orphan", visibility: "private", ownerId: null };
}
