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
  learners.push(owner.id, grantee.id, stranger.id);

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

  await t.test("an access-store outage answers 503, never an empty result", async () => {
    // The grants read is what fails: revoking select on the table is the
    // outage a learner would see during one.
    sql(`revoke select on graph.node_grants from service_role;`);
    try {
      const search503 = await get(search.GET, `q=${token}`, grantee.token);
      assert.equal(search503.status, 503, `search says the store is down: ${JSON.stringify(search503.json)}`);

      const quote503 = await post(workspace.POST, { action: "quote", nodeId: sharedNode, sessionId: randomUUID() }, grantee.token);
      assert.equal(quote503.status, 503, `quote says the store is down: ${JSON.stringify(quote503.json)}`);
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

  await t.test("an unverified token reads as anonymous rather than as its claim", async () => {
    const res = await get(search.GET, `q=${token}`, "not-a-real-token");
    assert.equal(res.status, 200);
    assert.deepEqual(titles(res.json).sort(), [`${token} public idea`], "a bad token cannot see more than the public graph");
  });
});
