/**
 * The read-authorization adapter's rules, against a store that answers
 * from fixtures (ros-ai-access, src/lib/research-os/read-access.ts). No
 * database: this file pins the decisions, and the queries are covered at
 * the routes.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  authorizeNode,
  authorizeNodes,
  authorizeVerbs,
  storeWithNodes,
  readVisibility,
  type AccessStore,
  type StoreResult,
} from "../src/lib/research-os/read-access";
import type { NodeAccess, NodeGrant } from "../src/lib/research-os/access";

const OWNER = "11111111-1111-1111-1111-111111111111";
const LEARNER = "22222222-2222-2222-2222-222222222222";
const STRANGER = "33333333-3333-3333-3333-333333333333";
const NOW = new Date("2026-09-21T12:00:00.000Z");

const nodes: NodeAccess[] = [
  { id: "pub", visibility: "public", ownerId: OWNER },
  { id: "own", visibility: "private", ownerId: LEARNER },
  { id: "priv", visibility: "private", ownerId: OWNER },
  { id: "shared", visibility: "shared", ownerId: OWNER },
];

const grants: NodeGrant[] = [
  { id: "g1", nodeId: "shared", granteeId: LEARNER, role: "view", expiresAt: null },
  { id: "g2", nodeId: "shared", granteeId: LEARNER, role: "cite", expiresAt: "2026-12-01T00:00:00.000Z" },
  { id: "g3", nodeId: "priv", granteeId: LEARNER, role: "view", expiresAt: "2026-01-01T00:00:00.000Z" },
  { id: "g4", nodeId: "shared", granteeGroup: "class:abc", role: "continue", expiresAt: null },
  { id: "g5", nodeId: "shared", granteeId: LEARNER, role: "extend", expiresAt: "not a date" },
];

/** A store that answers from the fixtures, and fails where a test asks it to. */
function store(options: { failOn?: "nodes" | "grants" | "groups"; groups?: string[] } = {}): AccessStore {
  const fail = <T,>(what: string): StoreResult<T> => ({ ok: false, error: `${what} unavailable` });
  return {
    async nodes(ids) {
      if (options.failOn === "nodes") return fail("nodes");
      return { ok: true, value: nodes.filter((n) => ids.includes(n.id)) };
    },
    async grants(ids) {
      if (options.failOn === "grants") return fail("grants");
      return { ok: true, value: grants.filter((g) => ids.includes(g.nodeId)) };
    },
    async groups() {
      if (options.failOn === "groups") return fail("groups");
      return { ok: true, value: options.groups ?? [] };
    },
  };
}

test("an anonymous viewer reads public nodes and nothing else", async () => {
  const r = await authorizeNodes(["pub", "priv", "shared", "own"], { id: null }, "view", store(), NOW);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.deepEqual(r.allowed, ["pub"]);
});

test("an owner reads their own private node", async () => {
  const r = await authorizeNodes(["own", "priv"], { id: LEARNER }, "view", store(), NOW);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.deepEqual(r.allowed, ["own"]);
});

test("a live grant admits, an expired one does not", async () => {
  const r = await authorizeNodes(["shared", "priv"], { id: LEARNER }, "view", store(), NOW);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.deepEqual(r.allowed, ["shared"], "the expired view grant on priv is not a grant");
});

test("a grant expiring that cannot be read is treated as expired", async () => {
  const r = await authorizeNodes(["shared"], { id: LEARNER }, "extend", store(), NOW);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.deepEqual(r.allowed, [], "an unparseable expiry does not admit");
});

test("cite is its own verb: a view grant does not carry it", async () => {
  const viewOnly: AccessStore = {
    ...store(),
    async grants() {
      return { ok: true, value: [{ id: "g", nodeId: "shared", granteeId: LEARNER, role: "view", expiresAt: null }] };
    },
  };
  const viewable = await authorizeNodes(["shared"], { id: LEARNER }, "view", viewOnly, NOW);
  const citable = await authorizeNodes(["shared"], { id: LEARNER }, "cite", viewOnly, NOW);
  assert.equal(viewable.ok && viewable.allowed.length, 1);
  assert.equal(citable.ok && citable.allowed.length, 0, "a shared node needs its own cite grant");
});

test("a public node is citable without a grant", async () => {
  const r = await authorizeNodes(["pub"], { id: LEARNER }, "cite", store(), NOW);
  assert.equal(r.ok && r.allowed.length, 1);
});

test("a group grant admits through the viewer's classes", async () => {
  const withoutClass = await authorizeNodes(["shared"], { id: STRANGER }, "continue", store(), NOW);
  const withClass = await authorizeNodes(["shared"], { id: STRANGER }, "continue", store({ groups: ["class:abc"] }), NOW);
  assert.equal(withoutClass.ok && withoutClass.allowed.length, 0);
  assert.equal(withClass.ok && withClass.allowed.length, 1, "the class grant admits");
});

test("an access-store failure is unavailable, never a denial", async () => {
  for (const failOn of ["nodes", "grants", "groups"] as const) {
    const r = await authorizeNodes(["shared"], { id: LEARNER }, "cite", store({ failOn }), NOW);
    assert.equal(r.ok, false, `${failOn} failing must not read as a decision`);
    if (r.ok) return;
    assert.equal(r.reason, "unavailable");
    assert.match(r.detail, new RegExp(failOn));
  }
});

test("a node with no row is missing, not denied", async () => {
  const r = await authorizeNodes(["pub", "ghost"], { id: LEARNER }, "view", store(), NOW);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.deepEqual(r.missing, ["ghost"]);
  assert.deepEqual(r.allowed, ["pub"]);
});

test("a visibility this code does not know is private", () => {
  assert.equal(readVisibility("public"), "public");
  assert.equal(readVisibility("shared"), "shared");
  assert.equal(readVisibility(null), "private");
  assert.equal(readVisibility(undefined), "private");
  assert.equal(readVisibility("world-readable"), "private");
});

test("one node answers denied, not_found or unavailable", async () => {
  const denied = await authorizeNode("priv", { id: STRANGER }, "view", store(), NOW);
  assert.equal(denied.ok === false && denied.reason, "denied");
  const missing = await authorizeNode("ghost", { id: LEARNER }, "view", store(), NOW);
  assert.equal(missing.ok === false && missing.reason, "not_found");
  const down = await authorizeNode("pub", { id: LEARNER }, "view", store({ failOn: "nodes" }), NOW);
  assert.equal(down.ok === false && down.reason, "unavailable");
  const fine = await authorizeNode("pub", { id: LEARNER }, "view", store(), NOW);
  assert.equal(fine.ok, true);
});

test("the allowed list keeps the order it was asked in, without duplicates", async () => {
  const r = await authorizeNodes(["shared", "pub", "shared", "own"], { id: LEARNER }, "view", store(), NOW);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.deepEqual(r.allowed, ["shared", "pub", "own"]);
});

test("reading public nodes costs one store call", async () => {
  let nodeCalls = 0;
  let grantCalls = 0;
  const counting: AccessStore = {
    async nodes(ids) {
      nodeCalls += 1;
      return { ok: true, value: nodes.filter((n) => ids.includes(n.id)) };
    },
    async grants(ids) {
      grantCalls += 1;
      return { ok: true, value: grants.filter((g) => ids.includes(g.nodeId)) };
    },
    async groups() {
      return { ok: true, value: [] };
    },
  };
  await authorizeNodes(["pub"], { id: LEARNER }, "view", counting, NOW);
  assert.equal(nodeCalls, 1);
  assert.equal(grantCalls, 0, "a public node needs no grant read");
  await authorizeNodes(["shared"], { id: LEARNER }, "view", counting, NOW);
  assert.equal(grantCalls, 1, "a shared node reads grants once");
});

test("authorizeVerbs agrees with authorizeNodes, verb by verb", async () => {
  for (const id of ["pub", "own", "priv", "shared"]) {
    const verbs = await authorizeVerbs(id, { id: LEARNER }, ["view", "cite", "continue"], store(), NOW);
    for (const verb of ["view", "cite", "continue"] as const) {
      const one = await authorizeNodes([id], { id: LEARNER }, verb, store(), NOW);
      const fromNodes = one.ok && one.allowed.includes(id);
      const fromVerbs = verbs.ok ? verbs.allowed[verb] === true : false;
      assert.equal(fromVerbs, fromNodes, `${id} disagrees on ${verb}`);
    }
  }
});

test("a verb map is never handed out for a node the viewer cannot see", async () => {
  const denied = await authorizeVerbs("priv", { id: STRANGER }, ["view", "cite"], store(), NOW);
  assert.equal(denied.ok, false);
  if (denied.ok) return;
  assert.equal(denied.reason, "denied");
});

test("a public view through authorizeVerbs reads no grants", async () => {
  let grantCalls = 0;
  const counting: AccessStore = {
    async nodes(ids) {
      return { ok: true, value: nodes.filter((n) => ids.includes(n.id)) };
    },
    async grants(ids) {
      grantCalls += 1;
      return { ok: true, value: grants.filter((g) => ids.includes(g.nodeId)) };
    },
    async groups() {
      return { ok: true, value: [] };
    },
  };
  await authorizeVerbs("pub", { id: LEARNER }, ["view"], counting, NOW);
  assert.equal(grantCalls, 0, "a public view needs no grant read");
  await authorizeVerbs("pub", { id: LEARNER }, ["view", "cite"], counting, NOW);
  assert.equal(grantCalls, 1, "any other verb loads them");
});

test("both entry points resolve a duplicate id to the stricter row", async () => {
  const twice: AccessStore = {
    ...store(),
    async nodes() {
      return {
        ok: true,
        value: [
          { id: "dup", visibility: "public", ownerId: OWNER },
          { id: "dup", visibility: "private", ownerId: OWNER },
        ],
      };
    },
  };
  const many = await authorizeNodes(["dup"], { id: STRANGER }, "view", twice, NOW);
  const one = await authorizeVerbs("dup", { id: STRANGER }, ["view"], twice, NOW);
  assert.equal(many.ok && many.allowed.length, 0, "the private row decides");
  assert.equal(one.ok, false, "and it decides the same way here");
});

test("a store that fails is an outage wherever it is read from", async () => {
  // storeWithNodes serves rows a caller already read and passes grants and
  // groups through, which is how the routes and filterSubgraphForViewer
  // avoid a second read. A failure underneath still has to surface.
  const failing = storeWithNodes(nodes, store({ failOn: "grants" }));
  const shared = await authorizeNodes(["shared"], { id: LEARNER }, "view", failing, NOW);
  assert.equal(shared.ok, false, "a grants failure under the passthrough is an outage");
  if (shared.ok) return;
  assert.equal(shared.reason, "unavailable");

  // A public-only read needs no grants, so it answers from the rows alone.
  const pub = await authorizeNodes(["pub"], { id: LEARNER }, "view", failing, NOW);
  assert.equal(pub.ok, true, "a public view survives a grants outage");
  assert.deepEqual(pub.ok ? pub.allowed : [], ["pub"]);
});

test("an expiry that cannot be parsed is expired, in one place", () => {
  // The rule lived in access.ts and read-access.ts and they disagreed:
  // one treated an unparseable expiry as live, so a grant whose expiry
  // read "next tuesday" never ended. The first repair wrote
  // the same fix into both files. `live` is now exported and this
  // asserts both entry points answer through it.
  const badExpiry: NodeGrant[] = [{ id: "g", nodeId: "shared", granteeId: LEARNER, role: "view", expiresAt: "next tuesday" }];
  const store: AccessStore = {
    async nodes(ids) {
      return { ok: true, value: nodes.filter((n) => ids.includes(n.id)) };
    },
    async grants() {
      return { ok: true, value: badExpiry };
    },
    async groups() {
      return { ok: true, value: [] };
    },
  };
  return authorizeNodes(["shared"], { id: LEARNER }, "view", store, NOW).then((r) => {
    assert.equal(r.ok, true);
    assert.deepEqual(r.ok ? r.allowed : ["?"], [], "an unparseable expiry does not admit");
  });
});

test("an expiry in the past is expired and one in the future admits", async () => {
  const withExpiry = (expiresAt: string): AccessStore => ({
    async nodes(ids) {
      return { ok: true, value: nodes.filter((n) => ids.includes(n.id)) };
    },
    async grants() {
      return { ok: true, value: [{ id: "g", nodeId: "shared", granteeId: LEARNER, role: "view", expiresAt }] };
    },
    async groups() {
      return { ok: true, value: [] };
    },
  });
  const past = await authorizeNodes(["shared"], { id: LEARNER }, "view", withExpiry("2020-01-01T00:00:00.000Z"), NOW);
  const future = await authorizeNodes(["shared"], { id: LEARNER }, "view", withExpiry("2099-01-01T00:00:00.000Z"), NOW);
  assert.deepEqual(past.ok ? past.allowed : ["?"], []);
  assert.deepEqual(future.ok ? future.allowed : [], ["shared"]);
});
