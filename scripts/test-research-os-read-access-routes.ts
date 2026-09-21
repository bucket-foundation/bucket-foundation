/**
 * The read-authorization gates at the routes themselves, against the local
 * stack (ros-ai-access, learning/research-os/ai/IMPLEMENTATION.md,
 * "Verification and release": a pure test cannot prove route
 * authorization).
 *
 * Each case signs a real learner in through the local auth server and
 * calls the route handler with that session, so the decision comes from
 * the same verifyLearner path production uses.
 *
 * Needs the local stack. With no database the tests skip and say so;
 * RESEARCH_OS_REQUIRE_DB=1 turns that skip into a failure.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";

const DB = process.env.RESEARCH_OS_TEST_DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

/**
 * Cases here revoke a privilege to simulate an access-store outage, and
 * restore it in a `finally`. A SIGKILL or a CI timeout skips that
 * restore, so this refuses to run against anything but loopback (Bucket
 * critic C43).
 */
function requireLoopback(): void {
  let host: string;
  try {
    host = new URL(DB).hostname;
  } catch {
    throw new Error("RESEARCH_OS_TEST_DATABASE_URL is not a URL this test can check the host of");
  }
  const loopback = host === "127.0.0.1" || host === "localhost" || host === "::1" || host === "[::1]";
  if (!loopback) {
    throw new Error(`this suite revokes a database privilege and will only do that on loopback; refusing host ${host}`);
  }
}

function sql(statement: string): { status: number; out: string } {
  const run = spawnSync("psql", [DB, "-At", "-v", "ON_ERROR_STOP=1", "-c", statement], { encoding: "utf8" });
  return { status: run.status ?? 1, out: (run.stdout || "").trim() + (run.stderr || "") };
}

function loadLocalEnv(): void {
  const file = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadLocalEnv();

const REQUIRED = process.env.RESEARCH_OS_REQUIRE_DB === "1";
const probe = sql("select 1");
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ready = probe.status === 0 && probe.out === "1" && Boolean(url) && Boolean(serviceKey);
if (REQUIRED && !ready) {
  throw new Error(`RESEARCH_OS_REQUIRE_DB=1 and the local stack is not reachable: db=${probe.out} url=${Boolean(url)}`);
}
const skip = ready ? false : "no local stack with a Supabase URL and service key";

/** A signed-in learner, made through the local auth server. */
async function makeLearner(label: string): Promise<{ id: string; email: string; token: string }> {
  const email = `read-access-${label}-${randomUUID()}@bucket.test`;
  const password = `pw-${randomUUID()}`;
  const created = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, "content-type": "application/json" },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const user = (await created.json()) as { id?: string; msg?: string };
  assert.ok(user.id, `could not create ${label}: ${JSON.stringify(user)}`);
  const signedIn = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: serviceKey, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const session = (await signedIn.json()) as { access_token?: string };
  assert.ok(session.access_token, `could not sign ${label} in`);
  // Consent, so the workspace's own gate is not what refuses these cases.
  sql(`insert into graph.learner_profiles (learner_id, consent_status, birth_year_bucket)
       values ('${user.id}', 'self', '18plus')
       on conflict (learner_id) do update set consent_status = 'self', birth_year_bucket = '18plus';`);
  return { id: user.id as string, email, token: session.access_token as string };
}

async function removeLearner(id: string): Promise<void> {
  await fetch(`${url}/auth/v1/admin/users/${id}`, {
    method: "DELETE",
    headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
  });
}

/** POST to a route handler with a learner's session, as the browser would. */
async function post(handler: (req: NextRequest) => Promise<Response>, body: unknown, token?: string): Promise<{ status: number; json: Record<string, unknown> }> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await handler(new NextRequest("http://127.0.0.1/api/research-os/workspace", { method: "POST", headers, body: JSON.stringify(body) }));
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, json };
}

async function get(handler: (req: NextRequest) => Promise<Response>, query: string, token?: string): Promise<{ status: number; json: Record<string, unknown> }> {
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await handler(new NextRequest(`http://127.0.0.1/api/research-os/search?${query}`, { headers }));
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, json };
}

test("the read gates hold at the routes", { skip }, async (t) => {
  // Registered before anything exists, so a throw while creating fixtures
  // still cleans up what was made (Bucket critic C8).
  const learners: string[] = [];
  const nodeIds: string[] = [];
  t.after(async () => {
    if (nodeIds.length) {
      const ids = nodeIds.map((id) => `'${id}'`).join(",");
      sql(`delete from graph.edges where from_id in (${ids}) or to_id in (${ids});
           delete from graph.node_grants where node_id in (${ids});
           delete from graph.learner_node_state where node_id in (${ids});
           delete from graph.check_attempts where node_id in (${ids});
           delete from graph.nodes where id in (${ids});`);
    }
    if (learners.length) {
      const ids = learners.map((id) => `'${id}'`).join(",");
      sql(`delete from graph.learner_node_state where learner_id in (${ids});
           delete from graph.learner_profiles where learner_id in (${ids});`);
      await Promise.all(learners.map(removeLearner));
    }
    sql(`grant select on graph.node_grants to service_role;`);
  });

  const owner = await makeLearner("owner");
  const grantee = await makeLearner("grantee");
  const stranger = await makeLearner("stranger");
  const viewOnly = await makeLearner("viewonly");
  learners.push(owner.id, grantee.id, stranger.id, viewOnly.id);

  const branch = "01-mathematics";
  const publicNode = randomUUID();
  const privateNode = randomUUID();
  const sharedNode = randomUUID();
  const expiredNode = randomUUID();
  const token = `readaccess${Date.now().toString(36)}`;
  nodeIds.push(publicNode, privateNode, sharedNode, expiredNode);

  const made = sql(`
    insert into graph.nodes (id, slug, title, kind, tier, branch, summary, visibility, owner_id) values
      ('${publicNode}', 'ra-public-${publicNode}', '${token} public idea', 'concept', 10, '${branch}', 'a public summary', 'public', '${owner.id}'),
      ('${privateNode}', 'ra-private-${privateNode}', '${token} private idea', 'concept', 10, '${branch}', 'a private summary', 'private', '${owner.id}'),
      ('${sharedNode}', 'ra-shared-${sharedNode}', '${token} shared idea', 'concept', 10, '${branch}', 'a shared summary', 'shared', '${owner.id}'),
      ('${expiredNode}', 'ra-expired-${expiredNode}', '${token} expired idea', 'concept', 10, '${branch}', 'an expired summary', 'shared', '${owner.id}');
    insert into graph.node_grants (node_id, grantee_id, role, expires_at) values
      ('${sharedNode}', '${viewOnly.id}', 'view', null),
      ('${sharedNode}', '${grantee.id}', 'view', null),
      ('${expiredNode}', '${grantee.id}', 'view', now() - interval '1 day');
    select 'made';
  `);
  assert.equal(made.status, 0, made.out);

  /* eslint-disable @typescript-eslint/no-var-requires */
  const search = require("../src/app/api/research-os/search/route") as { GET: (req: NextRequest) => Promise<Response> };
  const workspace = require("../src/app/api/research-os/workspace/route") as { POST: (req: NextRequest) => Promise<Response> };
  /* eslint-enable @typescript-eslint/no-var-requires */

  const titles = (json: Record<string, unknown>): string[] =>
    ((json.results as { title: string }[]) || []).map((r) => r.title);

  await t.test("search shows an anonymous reader the public node alone", async () => {
    const res = await get(search.GET, `q=${token}`);
    assert.equal(res.status, 200);
    assert.deepEqual(titles(res.json).sort(), [`${token} public idea`]);
  });

  await t.test("search shows a grantee the node shared with them", async () => {
    const res = await get(search.GET, `q=${token}`, grantee.token);
    assert.equal(res.status, 200);
    assert.deepEqual(titles(res.json).sort(), [`${token} public idea`, `${token} shared idea`]);
  });

  await t.test("an expired grant shows nothing", async () => {
    const res = await get(search.GET, `q=${token}`, grantee.token);
    assert.ok(!titles(res.json).includes(`${token} expired idea`), `expired grant leaked: ${titles(res.json).join(", ")}`);
  });

  await t.test("search shows the owner their own private node", async () => {
    const res = await get(search.GET, `q=${token}`, owner.token);
    assert.deepEqual(titles(res.json).sort(), [
      `${token} expired idea`,
      `${token} private idea`,
      `${token} public idea`,
      `${token} shared idea`,
    ]);
  });

  await t.test("search shows a stranger the public node alone", async () => {
    const res = await get(search.GET, `q=${token}`, stranger.token);
    assert.deepEqual(titles(res.json).sort(), [`${token} public idea`]);
  });

  await t.test("locate hides a node the learner may not read", async () => {
    const res = await post(workspace.POST, { action: "locate", query: token, branch, sessionId: randomUUID() }, stranger.token);
    assert.equal(res.status, 200, JSON.stringify(res.json));
    const found = ((res.json.results as { title: string }[]) || []).map((r) => r.title);
    assert.deepEqual(found.sort(), [`${token} public idea`], `locate leaked: ${found.join(", ")}`);
  });

  await t.test("quote refuses a node the learner may not cite", async () => {
    const allowed = await post(workspace.POST, { action: "quote", nodeId: publicNode, sessionId: randomUUID() }, stranger.token);
    assert.equal(allowed.status, 200, `a public node is quotable: ${JSON.stringify(allowed.json)}`);

    const denied = await post(workspace.POST, { action: "quote", nodeId: privateNode, sessionId: randomUUID() }, stranger.token);
    assert.equal(denied.status, 404, `a private node answers 404: ${JSON.stringify(denied.json)}`);
    assert.equal(JSON.stringify(denied.json).includes("private summary"), false, "no content in the refusal");

    // A view grant is not a cite grant.
    const viewOnly = await post(workspace.POST, { action: "quote", nodeId: sharedNode, sessionId: randomUUID() }, grantee.token);
    assert.equal(viewOnly.status, 404, `view alone cannot quote: ${JSON.stringify(viewOnly.json)}`);

    sql(`insert into graph.node_grants (node_id, grantee_id, role, expires_at) values ('${sharedNode}', '${grantee.id}', 'cite', null);`);
    const withCite = await post(workspace.POST, { action: "quote", nodeId: sharedNode, sessionId: randomUUID() }, grantee.token);
    assert.equal(withCite.status, 200, `a cite grant quotes: ${JSON.stringify(withCite.json)}`);
  });

  await t.test("check refuses a node the learner may not continue on", async () => {
    const denied = await post(
      workspace.POST,
      { action: "check", nodeId: privateNode, explanation: "an explanation long enough to be graded by the check tool", sessionId: randomUUID() },
      stranger.token,
    );
    assert.equal(denied.status, 404, `a private node answers 404: ${JSON.stringify(denied.json)}`);
    assert.equal(JSON.stringify(denied.json).includes("private summary"), false, "no content in the refusal");
  });

  await t.test("secondSource refuses a reference the learner may not read", async () => {
    const denied = await post(
      workspace.POST,
      { action: "locate", mode: "secondSource", query: token, quotedSourceNodeId: privateNode, sessionId: randomUUID() },
      stranger.token,
    );
    assert.equal(denied.status, 404, `a hidden reference answers 404: ${JSON.stringify(denied.json)}`);
    assert.equal(JSON.stringify(denied.json).includes("private summary"), false, "no content in the refusal");

    const allowed = await post(
      workspace.POST,
      { action: "locate", mode: "secondSource", query: token, quotedSourceNodeId: publicNode, sessionId: randomUUID() },
      stranger.token,
    );
    assert.equal(allowed.status, 200, `a public reference is accepted: ${JSON.stringify(allowed.json)}`);
    const found = ((allowed.json.results as { title: string }[]) || []).map((r) => r.title);
    assert.ok(!found.includes(`${token} private idea`), `secondSource leaked: ${found.join(", ")}`);
  });

  await t.test("probe refuses a node the learner may not continue on", async () => {
    /* eslint-disable-next-line @typescript-eslint/no-var-requires */
    const probe = require("../src/app/api/research-os/probe/route") as { POST: (req: NextRequest) => Promise<Response> };
    const res = await post(probe.POST, { nodeId: privateNode, answer: "an answer long enough to be graded", sessionId: randomUUID() }, stranger.token);
    assert.equal(res.status, 404, `a private node answers 404: ${JSON.stringify(res.json)}`);
    const state = sql(`select count(*) from graph.learner_node_state where learner_id = '${stranger.id}' and node_id = '${privateNode}'`);
    assert.equal(state.out, "0", "a refused probe writes no learner state");

    // A learner holding view and nothing else tells the two verbs apart: a
    // probe needs continue, so view alone is refused (Bucket critic C15).
    const res2 = await post(probe.POST, { nodeId: sharedNode, answer: "an answer long enough to be graded", sessionId: randomUUID() }, viewOnly.token);
    assert.equal(res2.status, 404, `view alone cannot probe: ${JSON.stringify(res2.json)}`);

    sql(`insert into graph.node_grants (node_id, grantee_id, role, expires_at) values ('${sharedNode}', '${viewOnly.id}', 'continue', null)
         on conflict do nothing;`);
    const res3 = await post(probe.POST, { nodeId: sharedNode, answer: "an answer long enough to be graded", sessionId: randomUUID() }, viewOnly.token);
    assert.notEqual(res3.status, 404, `a continue grant passes the gate: ${JSON.stringify(res3.json)}`);
  });

  await t.test("probe abstains when every prerequisite is withheld", async () => {
    /* eslint-disable-next-line @typescript-eslint/no-var-requires */
    const probe = require("../src/app/api/research-os/probe/route") as { POST: (req: NextRequest) => Promise<Response> };
    sql(`insert into graph.edges (from_id, to_id, kind) values ('${privateNode}', '${publicNode}', 'prerequisite')
         on conflict do nothing;`);
    try {
      const res = await post(probe.POST, { nodeId: publicNode, answer: "an answer long enough to be graded", sessionId: randomUUID() }, stranger.token);
      assert.equal(res.status, 409, `the probe abstains: ${JSON.stringify(res.json)}`);
      assert.equal(res.json.error, "probe_grounding_unavailable");
    } finally {
      sql(`delete from graph.edges where from_id = '${privateNode}' and to_id = '${publicNode}';`);
    }
  });

  await t.test("check abstains when every prerequisite is withheld", async () => {
    // The public node now rests on the private one, which this learner may
    // not read, so there is nothing left to ground a verdict on.
    sql(`insert into graph.edges (from_id, to_id, kind) values ('${privateNode}', '${publicNode}', 'prerequisite')
         on conflict do nothing;`);
    try {
      const res = await post(
        workspace.POST,
        { action: "check", nodeId: publicNode, explanation: "an explanation long enough for the check tool to grade", sessionId: randomUUID() },
        stranger.token,
      );
      assert.equal(res.status, 409, `the check abstains: ${JSON.stringify(res.json)}`);
      assert.equal(res.json.error, "check_grounding_unavailable");
      assert.equal(JSON.stringify(res.json).includes("private summary"), false, "no withheld content in the refusal");
    } finally {
      sql(`delete from graph.edges where from_id = '${privateNode}' and to_id = '${publicNode}';`);
    }
  });

  await t.test("the probe question list hides a node the learner may not read", async () => {
    /* eslint-disable-next-line @typescript-eslint/no-var-requires */
    const probe = require("../src/app/api/research-os/probe/route") as { GET: (req: NextRequest) => Promise<Response> };
    const res = await probe.GET(
      new NextRequest(`http://127.0.0.1/api/research-os/probe?branch=${branch}&target=ra-public-${publicNode}`, {
        headers: { authorization: `Bearer ${stranger.token}` },
      }),
    );
    assert.equal(res.status, 200, "the public target resolves");
    const body = (await res.json()) as { questions?: { nodeId?: string; title?: string }[] };
    const titles = (body.questions || []).map((q) => q.title || "");
    assert.ok(!titles.some((t2) => t2.includes("private idea")), `the question list leaked: ${titles.join(", ")}`);

    const hidden = await probe.GET(
      new NextRequest(`http://127.0.0.1/api/research-os/probe?branch=${branch}&target=ra-private-${privateNode}`, {
        headers: { authorization: `Bearer ${stranger.token}` },
      }),
    );
    assert.equal(hidden.status, 404, "a private target is not a target");
  });

  await t.test("a stage write refuses a node the learner may not continue on", async () => {
    /* eslint-disable-next-line @typescript-eslint/no-var-requires */
    const state = require("../src/app/api/research-os/state/route") as { POST: (req: NextRequest) => Promise<Response> };
    const res = await state.POST(
      new NextRequest("http://127.0.0.1/api/research-os/state", {
        method: "POST",
        headers: { authorization: `Bearer ${stranger.token}`, "content-type": "application/json" },
        body: JSON.stringify({ nodeId: privateNode, action: "open", sessionId: randomUUID() }),
      }),
    );
    assert.equal(res.status, 404, `a private node answers 404: ${res.status}`);
    const rows = sql(`select count(*) from graph.learner_node_state where learner_id = '${stranger.id}' and node_id = '${privateNode}'`);
    assert.equal(rows.out, "0", "a refused write leaves no state row");
  });

  await t.test("the branch counts answer before identity and count the public graph", async () => {
    /* eslint-disable-next-line @typescript-eslint/no-var-requires */
    const graph = require("../src/app/api/research-os/graph/route") as { GET: (req: NextRequest) => Promise<Response> };
    const before = sql(`select count(*) from graph.nodes where branch = '${branch}' and visibility = 'public'`);
    const res = await graph.GET(new NextRequest("http://127.0.0.1/api/research-os/graph?list=1"));
    assert.equal(res.status, 200);
    const body = (await res.json()) as { branches?: { id: string; nodes: number }[] };
    const row = (body.branches || []).find((b) => b.id === branch);
    assert.equal(row?.nodes, Number(before.out), `the count is the public graph, got ${row?.nodes} against ${before.out}`);
  });

  await t.test("an access-store outage answers 503, never an empty result", async () => {
    // The grants read is what fails: revoking select on the table is the
    // outage a learner would see during one.
    requireLoopback();
    sql(`revoke select on graph.node_grants from service_role;`);
    try {
      const search503 = await get(search.GET, `q=${token}`, grantee.token);
      assert.equal(search503.status, 503, `search says the store is down: ${JSON.stringify(search503.json)}`);

      const quote503 = await post(workspace.POST, { action: "quote", nodeId: sharedNode, sessionId: randomUUID() }, grantee.token);
      assert.equal(quote503.status, 503, `quote says the store is down: ${JSON.stringify(quote503.json)}`);

      // Every route that reads the graph through the adapter answers the
      // same way, including the node page, whose empty neighbourhood used
      // to read as a node that rests on nothing.
      /* eslint-disable @typescript-eslint/no-var-requires */
      const node = require("../src/app/api/research-os/node/route") as { GET: (req: NextRequest) => Promise<Response> };
      const graph = require("../src/app/api/research-os/graph/route") as { GET: (req: NextRequest) => Promise<Response> };
      /* eslint-enable @typescript-eslint/no-var-requires */
      const nodeRes = await node.GET(new NextRequest(`http://127.0.0.1/api/research-os/node?slug=ra-shared-${sharedNode}`, {
        headers: { authorization: `Bearer ${grantee.token}` },
      }));
      assert.equal(nodeRes.status, 503, "the node page says the store is down");
      const graphRes = await graph.GET(new NextRequest(`http://127.0.0.1/api/research-os/graph?branch=${branch}`, {
        headers: { authorization: `Bearer ${grantee.token}` },
      }));
      assert.equal(graphRes.status, 503, "the graph says the store is down");

      // The node page answers 503 from its own gate before the
      // neighbourhood is filtered, so the filter's contract is asserted
      // where it lives: an outage is a refusal, never an empty subgraph.
      /* eslint-disable-next-line @typescript-eslint/no-var-requires */
      const { filterSubgraphForViewer } = require("../src/lib/research-os/access-db") as typeof import("../src/lib/research-os/access-db");
      const filtered = await filterSubgraphForViewer(
        [{ id: sharedNode, visibility: "shared" as const, ownerId: owner.id }],
        [],
        grantee.id,
      );
      assert.equal(filtered.ok, false, "the subgraph filter refuses during an outage");
    } finally {
      sql(`grant select on graph.node_grants to service_role;`);
    }

    const recovered = await get(search.GET, `q=${token}`, grantee.token);
    assert.equal(recovered.status, 200, "the route recovers when the store does");
  });

  await t.test("a cookie session reads as itself, and a bad cookie as anonymous", async () => {
    const res = await new Promise<Response>((resolve) => {
      const req = new NextRequest(`http://127.0.0.1/api/research-os/search?q=${token}`, {
        headers: { cookie: `sb-127-auth-token=${JSON.stringify({ access_token: "not-a-real-token" })}` },
      });
      resolve(search.GET(req) as unknown as Response);
    }).then((r) => r);
    const json = (await res.json()) as Record<string, unknown>;
    assert.equal(res.status, 200);
    const seen = ((json.results as { title: string }[]) || []).map((r) => r.title);
    assert.deepEqual(seen.sort(), [`${token} public idea`], "a cookie carrying nothing valid sees the public graph alone");
  });

  await t.test("the review queue and its decisions are scoped to a reviewer's classes", async () => {
    /* eslint-disable-next-line @typescript-eslint/no-var-requires */
    const review = require("../src/app/api/research-os/review/route") as {
      GET: (req: NextRequest) => Promise<Response>;
      POST: (req: NextRequest) => Promise<Response>;
    };

    const outsider = await makeLearner("outsider");
    const teacher = await makeLearner("teacher");
    learners.push(outsider.id, teacher.id);
    const klass = randomUUID();
    const insideProduction = randomUUID();
    const outsideProduction = randomUUID();

    sql(`
      insert into graph.classes (id, name, reviewer_email, created_by)
        values ('${klass}', 'Scope fixture', '${teacher.email}', '${teacher.id}');
      insert into graph.class_members (class_id, learner_id, role) values
        ('${klass}', '${teacher.id}', 'teacher'),
        ('${klass}', '${grantee.id}', 'learner');
      insert into graph.productions (id, learner_id, target_node_id, kind, claim, status) values
        ('${insideProduction}', '${grantee.id}', '${publicNode}', 'production', 'a claim from inside the class', 'submitted'),
        ('${outsideProduction}', '${outsider.id}', '${publicNode}', 'production', 'a claim from outside it', 'submitted');
    `);

    const read = async (token: string) => {
      const res = await review.GET(new NextRequest("http://127.0.0.1/api/research-os/review", {
        headers: { authorization: `Bearer ${token}` },
      }));
      const json = (await res.json()) as { productions?: { id: string }[] };
      return { status: res.status, ids: (json.productions || []).map((p) => p.id) };
    };

    try {
      // The class teacher sees the learner in their class and nobody else.
      const scoped = await read(teacher.token);
      assert.equal(scoped.status, 200, `the teacher reads the queue: ${scoped.status}`);
      assert.ok(scoped.ids.includes(insideProduction), "their own class is in the queue");
      assert.ok(!scoped.ids.includes(outsideProduction), "another class's learner is not");

      // A decision on a production outside the class answers as missing.
      const denied = await review.POST(new NextRequest("http://127.0.0.1/api/research-os/review", {
        method: "POST",
        headers: { authorization: `Bearer ${teacher.token}`, "content-type": "application/json" },
        body: JSON.stringify({ kind: "production", productionId: outsideProduction, decision: "approved" }),
      }));
      assert.equal(denied.status, 404, `an out-of-scope decision is refused: ${denied.status}`);
      const untouched = sql(`select status from graph.productions where id = '${outsideProduction}'`);
      assert.equal(untouched.out, "submitted", "the refused production did not move");

      // The same teacher may decide inside their own class.
      const allowed = await review.POST(new NextRequest("http://127.0.0.1/api/research-os/review", {
        method: "POST",
        headers: { authorization: `Bearer ${teacher.token}`, "content-type": "application/json" },
        body: JSON.stringify({ kind: "production", productionId: insideProduction, decision: "returned", reason: "revise the second source" }),
      }));
      assert.equal(allowed.status, 200, `an in-scope decision lands: ${allowed.status} ${await allowed.text()}`);
      const moved = sql(`select status from graph.productions where id = '${insideProduction}'`);
      assert.equal(moved.out, "draft", "the returned production went back to draft");
    } finally {
      sql(`delete from graph.teacher_reviews where production_id in ('${insideProduction}', '${outsideProduction}');
           delete from graph.productions where id in ('${insideProduction}', '${outsideProduction}');
           delete from graph.class_members where class_id = '${klass}';
           delete from graph.classes where id = '${klass}';
           delete from graph.learner_node_state where learner_id in ('${outsider.id}', '${teacher.id}');`);
    }
  });

  await t.test("a transfer item decision is scoped, and an allowlisted reviewer is not", async () => {
    /* eslint-disable-next-line @typescript-eslint/no-var-requires */
    const review = require("../src/app/api/research-os/review/route") as { POST: (req: NextRequest) => Promise<Response> };

    const teacher = await makeLearner("ti-teacher");
    const outsider = await makeLearner("ti-outsider");
    const allowlisted = await makeLearner("ti-allowlisted");
    learners.push(teacher.id, outsider.id, allowlisted.id);
    const klass = randomUUID();
    const held = JSON.stringify([{ kind: "transfer_item", held: true, at: new Date().toISOString() }]).replace(/'/g, "''");

    const fixture = sql(`
      insert into graph.classes (id, name, reviewer_email, created_by)
        values ('${klass}', 'Transfer scope fixture', '${teacher.email}', '${teacher.id}');
      insert into graph.class_members (class_id, learner_id, role) values
        ('${klass}', '${teacher.id}', 'teacher'),
        ('${klass}', '${grantee.id}', 'learner');
      insert into graph.learner_node_state (learner_id, node_id, stage, evidence) values
        ('${grantee.id}', '${publicNode}', 'understanding', '${held}'::jsonb),
        ('${outsider.id}', '${publicNode}', 'understanding', '${held}'::jsonb)
        on conflict (learner_id, node_id) do update set stage = 'understanding', evidence = excluded.evidence;
      select 'made';
    `);
    assert.equal(fixture.status, 0, fixture.out);

    const decide = async (token: string, learnerId: string) =>
      review.POST(new NextRequest("http://127.0.0.1/api/research-os/review", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ kind: "transfer_item", learnerId, nodeId: publicNode, decision: "returned", reason: "try the second case" }),
      }));

    const allowlist = process.env.RESEARCH_OS_REVIEWER_EMAILS;
    try {
      // The row exists, so a 404 here is the scope gate rather than a
      // missing hold. Both answers carry the same code, so the reviewer
      // cannot tell the two apart (Bucket critic C32, C34).
      const outOfScope = await decide(teacher.token, outsider.id);
      assert.equal(outOfScope.status, 404, `a transfer item outside the class is refused: ${outOfScope.status}`);
      assert.equal(((await outOfScope.json()) as { error?: string }).error, "state_not_found", "and says nothing about which learner exists");
      const noReview = sql(`select count(*) from graph.teacher_reviews where learner_id = '${outsider.id}' and node_id = '${publicNode}'`);
      assert.equal(noReview.out, "0", "the refused decision wrote no review row");

      const inScope = await decide(teacher.token, grantee.id);
      assert.equal(inScope.status, 200, `a transfer item inside the class lands: ${inScope.status} ${await inScope.text()}`);
      const wrote = sql(`select count(*) from graph.teacher_reviews where learner_id = '${grantee.id}' and node_id = '${publicNode}'`);
      assert.equal(wrote.out, "1", "the in-scope decision wrote exactly one review row");

      // The graph's own reviewer is scoped to every learner, which is the
      // `learners === null` branch that class scoping short-circuits.
      process.env.RESEARCH_OS_REVIEWER_EMAILS = allowlisted.email;
      const graphWide = await decide(allowlisted.token, outsider.id);
      assert.equal(graphWide.status, 200, `an allowlisted reviewer decides outside any class: ${graphWide.status} ${await graphWide.text()}`);
      const wroteWide = sql(`select count(*) from graph.teacher_reviews where reviewer_id = '${allowlisted.id}'`);
      assert.equal(wroteWide.out, "1", "and that decision was recorded");
    } finally {
      if (allowlist === undefined) delete process.env.RESEARCH_OS_REVIEWER_EMAILS;
      else process.env.RESEARCH_OS_REVIEWER_EMAILS = allowlist;
      sql(`delete from graph.teacher_reviews where learner_id in ('${grantee.id}', '${outsider.id}');
           delete from graph.learner_node_state where learner_id in ('${grantee.id}', '${outsider.id}');
           delete from graph.class_members where class_id = '${klass}';
           delete from graph.classes where id = '${klass}';`);
    }
  });

  await t.test("an assignment names a node the learner cannot read without handing over its title", async () => {
    /* eslint-disable-next-line @typescript-eslint/no-var-requires */
    const assignments = require("../src/app/api/research-os/assignments/route") as { GET: (req: NextRequest) => Promise<Response> };

    const teacher = await makeLearner("asg-teacher");
    learners.push(teacher.id);
    const klass = randomUUID();
    const visibleAssignment = randomUUID();
    const hiddenAssignment = randomUUID();

    sql(`
      insert into graph.classes (id, name, reviewer_email, created_by)
        values ('${klass}', 'Assignment fixture', '${teacher.email}', '${teacher.id}');
      insert into graph.class_members (class_id, learner_id, role) values
        ('${klass}', '${teacher.id}', 'teacher'),
        ('${klass}', '${grantee.id}', 'learner');
      insert into graph.assignments (id, class_id, target_node_id, assigned_by, title) values
        ('${visibleAssignment}', '${klass}', '${sharedNode}', '${teacher.id}', 'read the shared one'),
        ('${hiddenAssignment}', '${klass}', '${privateNode}', '${teacher.id}', 'read the private one');
    `);

    const mine = async () => {
      const res = await assignments.GET(new NextRequest("http://127.0.0.1/api/research-os/assignments?mine=1", {
        headers: { authorization: `Bearer ${grantee.token}` },
      }));
      const json = (await res.json().catch(() => ({}))) as { assignments?: Record<string, unknown>[]; error?: string };
      return { status: res.status, rows: json.assignments || [], error: json.error };
    };

    try {
      const listed = await mine();
      assert.equal(listed.status, 200, `the learner reads their own assignments: ${listed.status}`);
      const byId = new Map(listed.rows.map((r) => [r.id as string, r]));
      const shown = byId.get(visibleAssignment);
      const withheld = byId.get(hiddenAssignment);
      assert.ok(shown, "the assignment on a node they were granted is listed");
      assert.ok(withheld, "the assignment on a node they were not granted is still theirs, so it is listed");
      assert.equal(shown!.targetHidden, false, "the granted target is not hidden");
      assert.equal(shown!.targetTitle, `${token} shared idea`, "and it carries its title");
      assert.equal(withheld!.targetHidden, true, "the ungranted target is marked hidden");
      assert.equal(withheld!.targetTitle, "", "and carries no title");
      assert.equal(withheld!.targetSlug, "", "and no slug to follow");

      // An access-store failure is an outage. Answering 200 with every
      // title blanked would read as "your assignments point nowhere"
      // (Bucket critic C33). Revoking the grant read is how the route
      // sees a store it cannot query.
    requireLoopback();
    sql(`revoke select on graph.node_grants from service_role;`);
      const outage = await mine();
      assert.equal(outage.status, 503, `a store the route cannot read is an outage: ${outage.status}`);
      assert.equal(outage.error, "access_unavailable");
    } finally {
      sql(`grant select on graph.node_grants to service_role;
           delete from graph.assignments where class_id = '${klass}';
           delete from graph.class_members where class_id = '${klass}';
           delete from graph.classes where id = '${klass}';`);
    }
  });

  await t.test("the review queue pages past the row cap rather than truncating", async () => {
    /* eslint-disable-next-line @typescript-eslint/no-var-requires */
    const review = require("../src/app/api/research-os/review/route") as { GET: (req: NextRequest) => Promise<Response> };

    const teacher = await makeLearner("page-teacher");
    const student = await makeLearner("page-student");
    learners.push(teacher.id, student.id);
    const klass = randomUUID();
    const tag = `page-${Date.now().toString(36)}`;
    // One more than PostgREST answers in a single request. Without a page
    // loop the queue stops at a thousand and reports no error.
    const ROWS = 1001;

    const seeded = sql(`
      insert into graph.classes (id, name, reviewer_email, created_by)
        values ('${klass}', 'Paging fixture', '${teacher.email}', '${teacher.id}');
      insert into graph.class_members (class_id, learner_id, role) values
        ('${klass}', '${teacher.id}', 'teacher'),
        ('${klass}', '${student.id}', 'learner');
      insert into graph.nodes (id, slug, title, kind, tier, branch, summary)
        select gen_random_uuid(), '${tag}-' || g, '${tag} node ' || g, 'concept', 10, '01-mathematics', 'fixture'
        from generate_series(1, ${ROWS}) g;
      insert into graph.learner_node_state (learner_id, node_id, stage, evidence)
        select '${student.id}', id, 'understanding', '[{"kind":"transfer_item","held":true}]'::jsonb
        from graph.nodes where slug like '${tag}-%';
      select 'seeded';
    `);
    assert.equal(seeded.status, 0, seeded.out);

    try {
      const rows = sql(`select count(*) from graph.learner_node_state where learner_id = '${student.id}'`);
      assert.equal(rows.out, String(ROWS), `the fixture really holds ${ROWS} rows: ${rows.out}`);

      const res = await review.GET(new NextRequest("http://127.0.0.1/api/research-os/review", {
        headers: { authorization: `Bearer ${teacher.token}` },
      }));
      assert.equal(res.status, 200, `the teacher reads the queue: ${res.status}`);
      const json = (await res.json()) as { transferHolds?: { learnerId: string; nodeId: string }[] };
      const held = (json.transferHolds || []).filter((h) => h.learnerId === student.id);
      assert.equal(held.length, ROWS, `every held item is in the queue, not the first thousand: ${held.length}`);
      assert.equal(new Set(held.map((h) => h.nodeId)).size, ROWS, "and no row is served twice across pages");
    } finally {
      sql(`delete from graph.learner_node_state where learner_id = '${student.id}';
           delete from graph.class_members where class_id = '${klass}';
           delete from graph.classes where id = '${klass}';
           delete from graph.edges where from_id in (select id from graph.nodes where slug like '${tag}-%')
              or to_id in (select id from graph.nodes where slug like '${tag}-%');
           delete from graph.nodes where slug like '${tag}-%';`);
    }
  });

  await t.test("staff assign what they may read, and nothing else", async () => {
    /* eslint-disable-next-line @typescript-eslint/no-var-requires */
    const classDb = require("../src/lib/research-os/class-db") as {
      createAssignment: (
        staff: { id: string; email: string | null; roles: string[] },
        classId: string,
        targetSlug: string,
        input: { title: string },
      ) => Promise<{ ok: true; value: { id: string } } | { ok: false; error: string }>;
    };

    const teacher = await makeLearner("create-teacher");
    learners.push(teacher.id);
    const klass = randomUUID();
    const made: string[] = [];

    const seeded = sql(`
      insert into graph.classes (id, name, reviewer_email, created_by)
        values ('${klass}', 'Create fixture', '${teacher.email}', '${teacher.id}');
      insert into graph.class_members (class_id, learner_id, role) values ('${klass}', '${teacher.id}', 'teacher');
      select 'seeded';
    `);
    assert.equal(seeded.status, 0, seeded.out);
    const staff = { id: teacher.id, email: teacher.email, roles: ["teacher"] };

    try {
      // A public node is assignable.
      const ok = await classDb.createAssignment(staff, klass, `ra-public-${publicNode}`, { title: "read the public one" });
      assert.equal(ok.ok, true, `a readable target is assignable: ${JSON.stringify(ok)}`);
      if (ok.ok) made.push(ok.value.id);

      // Another learner's private node is not, and the refusal says
      // nothing about whether the slug exists.
      const denied = await classDb.createAssignment(staff, klass, `ra-private-${privateNode}`, { title: "read the private one" });
      assert.equal(denied.ok, false, "a target the staff member cannot read is refused");
      assert.equal(denied.ok === false && denied.error, "target_not_found", "and reads the same as a slug that never existed");

      const missing = await classDb.createAssignment(staff, klass, `ra-nothing-${randomUUID()}`, { title: "read a ghost" });
      assert.equal(missing.ok === false && missing.error, "target_not_found", "which is what a real miss answers");

      // An access-store outage is an outage, never a denial.
    requireLoopback();
    sql(`revoke select on graph.node_grants from service_role;`);
      const outage = await classDb.createAssignment(staff, klass, `ra-shared-${sharedNode}`, { title: "read the shared one" });
      assert.equal(outage.ok, false, "an outage does not create an assignment");
      assert.equal(outage.ok === false && outage.error, "write_failed", "and does not read as a missing target");

      assert.equal(
        sql(`select count(*) from graph.assignments where class_id = '${klass}'`).out,
        "1",
        "exactly one assignment was created across all four calls",
      );
    } finally {
      sql(`grant select on graph.node_grants to service_role;
           delete from graph.assignments where class_id = '${klass}';
           delete from graph.class_members where class_id = '${klass}';
           delete from graph.classes where id = '${klass}';`);
    }
  });

  await t.test("a grant past the row cap still admits", async () => {
    /* eslint-disable-next-line @typescript-eslint/no-var-requires */
    const nodeRoute = require("../src/app/api/research-os/node/route") as { GET: (req: NextRequest) => Promise<Response> };

    const crowded = randomUUID();
    const slug = `ra-crowded-${crowded}`;
    nodeIds.push(crowded);
    // One real grant buried under a full page of others on the same node.
    // Its id sorts last, so a read that stops at the first thousand rows
    // never sees it and the learner is refused a node they hold a live
    // grant on (Bucket critic C41, C49).
    const real = "ffffffff-ffff-4fff-bfff-ffffffffffff";
    const seeded = sql(`
      insert into graph.nodes (id, slug, title, kind, tier, branch, summary, visibility, owner_id)
        values ('${crowded}', '${slug}', '${token} crowded idea', 'concept', 10, '01-mathematics', 'a crowded summary', 'shared', '${owner.id}');
      insert into graph.node_grants (id, node_id, grantee_group, role)
        select ('00000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid, '${crowded}', 'class:noise-' || g, 'view'
        from generate_series(1, 1000) g;
      insert into graph.node_grants (id, node_id, grantee_id, role)
        values ('${real}', '${crowded}', '${grantee.id}', 'view');
      select 'seeded';
    `);
    assert.equal(seeded.status, 0, seeded.out);

    try {
      const rows = sql(`select count(*) from graph.node_grants where node_id = '${crowded}'`);
      assert.equal(rows.out, "1001", `the fixture holds one more grant than a page: ${rows.out}`);
      const last = sql(`select id from graph.node_grants where node_id = '${crowded}' order by id desc limit 1`);
      assert.equal(last.out, real, "and the learner's own grant is the one that sorts last");

      const res = await nodeRoute.GET(new NextRequest(`http://127.0.0.1/api/research-os/node?slug=${slug}`, {
        headers: { authorization: `Bearer ${grantee.token}` },
      }));
      assert.equal(res.status, 200, `the grant on page two still admits: ${res.status}`);
      const json = (await res.json()) as { node?: { slug?: string } };
      assert.equal(json.node?.slug, slug, "and the node comes back");

      // A learner with no grant on it is still refused, so the case is
      // not passing because the node became readable to everyone.
      const stranger = await nodeRoute.GET(new NextRequest(`http://127.0.0.1/api/research-os/node?slug=${slug}`, {
        headers: { authorization: `Bearer ${viewOnly.token}` },
      }));
      assert.equal(stranger.status, 404, `a learner with no grant is refused: ${stranger.status}`);
    } finally {
      sql(`delete from graph.node_grants where node_id = '${crowded}';`);
    }
  });

  await t.test("a failed read on the loop answers 503 rather than zeros", async () => {
    /* eslint-disable-next-line @typescript-eslint/no-var-requires */
    const loop = require("../src/app/api/research-os/loop/route") as { GET: (req: NextRequest) => Promise<Response> };

    const healthy = await loop.GET(new NextRequest("http://127.0.0.1/api/research-os/loop", {
      headers: { authorization: `Bearer ${grantee.token}` },
    }));
    assert.equal(healthy.status, 200, `the loop answers when its reads work: ${healthy.status}`);

    try {
      // The paged reads throw on a failure. Before they paged, the data
      // came back null and every counter rendered zero, which told the
      // learner they had opened nothing (Bucket critic C47).
      requireLoopback();
      sql(`revoke select on graph.learner_node_state from service_role;`);
      const res = await loop.GET(new NextRequest("http://127.0.0.1/api/research-os/loop", {
        headers: { authorization: `Bearer ${grantee.token}` },
      }));
      assert.equal(res.status, 503, `a read it cannot make is an outage: ${res.status}`);
      const json = (await res.json().catch(() => ({}))) as { error?: string; awareness?: unknown };
      assert.equal(json.error, "loop_unavailable", "and it says so rather than answering with zeros");
      assert.equal(json.awareness, undefined, "no counter is served from a read that failed");
    } finally {
      sql(`grant select on graph.learner_node_state to service_role;`);
    }
  });

  await t.test("a branch read the graph route cannot make is an outage", async () => {
    /* eslint-disable-next-line @typescript-eslint/no-var-requires */
    const graph = require("../src/app/api/research-os/graph/route") as { GET: (req: NextRequest) => Promise<Response> };

    const healthy = await graph.GET(new NextRequest(`http://127.0.0.1/api/research-os/graph?branch=${branch}`, {
      headers: { authorization: `Bearer ${grantee.token}` },
    }));
    assert.equal(healthy.status, 200, `the map answers when its reads work: ${healthy.status}`);

    try {
      // The standing map used to come back empty behind a 200, so every
      // node showed no stage and the heatmap showed nobody at any level
      // (Bucket critic C53, C61).
      requireLoopback();
      sql(`revoke select on graph.learner_node_state from service_role;`);
      const res = await graph.GET(new NextRequest(`http://127.0.0.1/api/research-os/graph?branch=${branch}`, {
        headers: { authorization: `Bearer ${grantee.token}` },
      }));
      assert.equal(res.status, 503, `a read it cannot make is an outage: ${res.status}`);
      const json = (await res.json().catch(() => ({}))) as { error?: string; standing?: unknown; nodes?: unknown };
      assert.equal(json.error, "graph_read_failed");
      assert.equal(json.standing, undefined, "no standing map is served from a read that failed");
      assert.equal(json.nodes, undefined, "and no partial graph either");
    } finally {
      sql(`grant select on graph.learner_node_state to service_role;`);
    }
  });

  await t.test("an assignment list is refused whole when any of its reads fails", async () => {
    /* eslint-disable-next-line @typescript-eslint/no-var-requires */
    const classDb = require("../src/lib/research-os/class-db") as {
      listAssignmentsForLearner: (id: string) => Promise<{ ok: true; assignments: unknown[] } | { ok: false; reason: string }>;
    };

    const teacher = await makeLearner("bulk-teacher");
    learners.push(teacher.id);
    const klass = randomUUID();
    const tag = `bulk-${Date.now().toString(36)}`;
    // More targets than one request line holds, so the read has to chunk.
    // Unchunked it answers 414, every title comes back blank, and the row
    // still claims the target is visible (Bucket critic C50, C61).
    const TARGETS = 220;

    const seeded = sql(`
      insert into graph.classes (id, name, reviewer_email, created_by)
        values ('${klass}', 'Bulk fixture', '${teacher.email}', '${teacher.id}');
      insert into graph.class_members (class_id, learner_id, role) values
        ('${klass}', '${teacher.id}', 'teacher'),
        ('${klass}', '${grantee.id}', 'learner');
      insert into graph.nodes (id, slug, title, kind, tier, branch, summary, visibility)
        select gen_random_uuid(), '${tag}-' || g, '${tag} node ' || g, 'concept', 10, '${branch}', 'fixture', 'public'
        from generate_series(1, ${TARGETS}) g;
      insert into graph.assignments (class_id, target_node_id, assigned_by, title)
        select '${klass}', id, '${teacher.id}', 'read ' || slug from graph.nodes where slug like '${tag}-%';
      select 'seeded';
    `);
    assert.equal(seeded.status, 0, seeded.out);

    try {
      const listed = await classDb.listAssignmentsForLearner(grantee.id);
      assert.equal(listed.ok, true, `the list comes back: ${JSON.stringify(listed).slice(0, 120)}`);
      if (listed.ok) {
        const mine = (listed.assignments as { title: string; targetTitle: string; targetHidden: boolean }[]).filter((a) => a.title.startsWith(`read ${tag}-`));
        assert.equal(mine.length, TARGETS, `every assignment is listed: ${mine.length}`);
        const blank = mine.filter((a) => !a.targetTitle && !a.targetHidden);
        assert.deepEqual(blank, [], `no row claims a visible target with no title: ${blank.length} of ${mine.length}`);
      }

      // A read it cannot make refuses the whole list rather than serving
      // it with every title stripped.
      requireLoopback();
      sql(`revoke select on graph.nodes from service_role;`);
      const outage = await classDb.listAssignmentsForLearner(grantee.id);
      assert.equal(outage.ok, false, "an outage is not a list of blank rows");
      assert.equal(outage.ok === false && outage.reason, "unavailable");
    } finally {
      sql(`grant select on graph.nodes to service_role;
           delete from graph.assignments where class_id = '${klass}';
           delete from graph.class_members where class_id = '${klass}';
           delete from graph.classes where id = '${klass}';
           delete from graph.edges where from_id in (select id from graph.nodes where slug like '${tag}-%')
              or to_id in (select id from graph.nodes where slug like '${tag}-%');
           delete from graph.nodes where slug like '${tag}-%';`);
    }
  });

  await t.test("an unverified token reads as anonymous rather than as its claim", async () => {
    const res = await get(search.GET, `q=${token}`, "not-a-real-token");
    assert.equal(res.status, 200);
    assert.deepEqual(titles(res.json).sort(), [`${token} public idea`], "a bad token cannot see more than the public graph");
  });
});
