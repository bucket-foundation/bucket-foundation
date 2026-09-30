import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sql, loadLocalEnv, openLaunchScope } from "./lib/test-harness";

loadLocalEnv();
let closeLaunchScope = openLaunchScope();

const reachable = sql("select 1").out === "1";
const keyed = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
if (process.env.RESEARCH_OS_REQUIRE_DB === "1" && !(reachable && keyed)) throw new Error("RESEARCH_OS_REQUIRE_DB=1 and no local database with Supabase keys");
const skip = reachable && keyed ? false : "no local database with Supabase URL and keys in .env.local";

const RUN = randomUUID().slice(0, 8);
const BRANCH = `staff-roles-${RUN}`;

interface Account {
  id: string;
  email: string;
  token: string;
}

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "graph" },
  });
}

async function account(made: string[], name: string): Promise<Account> {
  const svc = admin();
  const email = `staff-roles-${RUN}-${name}@bucket.test`;
  const user = await svc.auth.admin.createUser({ email, email_confirm: true });
  if (user.error || !user.data.user) throw new Error(`creating ${name}: ${user.error?.message}`);
  made.push(user.data.user.id);
  const link = await svc.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error || !link.data?.properties?.hashed_token) throw new Error(`link for ${name}: ${link.error?.message}`);
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string, { auth: { persistSession: false, autoRefreshToken: false } });
  const session = await anon.auth.verifyOtp({ type: "magiclink", token_hash: link.data.properties.hashed_token });
  const token = session.data?.session?.access_token;
  if (!token) throw new Error(`session for ${name}: ${session.error?.message}`);
  return { id: user.data.user.id, email, token };
}

function request(url: string, who: Account, init: { method?: string; body?: unknown } = {}): NextRequest {
  const headers: Record<string, string> = { authorization: `Bearer ${who.token}` };
  if (init.body !== undefined) headers["content-type"] = "application/json";
  return new NextRequest(`http://127.0.0.1${url}`, { method: init.method ?? "GET", headers, body: init.body === undefined ? undefined : JSON.stringify(init.body) });
}

async function status(res: Response): Promise<{ status: number; body: Record<string, unknown> }> {
  return { status: res.status, body: (await res.json().catch(() => ({}))) as Record<string, unknown> };
}

test("a self-made teacher gets owner powers on their class and no staff powers anywhere", { skip }, async (t) => {
  const made: string[] = [];
  const classIds: string[] = [];
  const nodeIds: string[] = [];
  const prior = process.env.RESEARCH_OS_REVIEWER_EMAILS;
  try {
    const staff = await account(made, "staff");
    const teacher = await account(made, "teacher");
    const learner = await account(made, "learner");
    const outsider = await account(made, "outsider");
    process.env.RESEARCH_OS_REVIEWER_EMAILS = staff.email;

    const { createClass, joinClass } = await import("../src/lib/research-os/classes");
    const mine = await createClass(teacher.id, teacher.email, `Physics ${RUN}`);
    assert.ok(mine.ok);
    classIds.push(mine.value.id);
    const joined = await joinClass(learner.id, mine.value.joinCode ?? "");
    assert.ok(joined.ok);
    const theirs = await createClass(outsider.id, outsider.email, `Other ${RUN}`);
    assert.ok(theirs.ok);
    classIds.push(theirs.value.id);

    const target = randomUUID();
    const secret = randomUUID();
    const own = randomUUID();
    nodeIds.push(target, secret, own);
    const seeded = sql(`
      insert into graph.nodes (id, slug, title, kind, tier, branch, summary, visibility, owner_id) values
        ('${target}', 'target-${RUN}', 'Public target ${RUN}', 'concept', 1, '${BRANCH}', 'fixture', 'public', null),
        ('${secret}', 'secret-${RUN}', 'Outsider secret ${RUN}', 'concept', 2, '${BRANCH}', 'fixture', 'private', '${outsider.id}'),
        ('${own}', 'own-${RUN}', 'Teacher draft ${RUN}', 'concept', 2, '${BRANCH}', 'fixture', 'private', '${teacher.id}');
      insert into graph.productions (learner_id, target_node_id, claim, status) values
        ('${learner.id}', '${secret}', 'claim on a hidden node', 'submitted'),
        ('${learner.id}', '${own}', 'claim on the teacher node', 'submitted');
      select 'seeded';`);
    assert.match(seeded.out, /seeded/, seeded.out);

    await t.test("staff is the allowlist alone", async () => {
      const { isStaff } = await import("../src/lib/research-os/staff");
      assert.equal(await isStaff({ id: teacher.id, email: teacher.email }), false);
      assert.equal(await isStaff({ id: staff.id, email: staff.email }), true);
    });

    await t.test("every staff route refuses the teacher", async () => {
      const frontier = await import("../src/app/api/research-os/frontier/route");
      const f = await status(await frontier.POST(request("/api/research-os/frontier", teacher, { method: "POST", body: { nodeId: target, flag: "frontier", classId: mine.value.id } }), undefined));
      assert.equal(f.status, 403);
      assert.equal(sql(`select coalesce(frontier_flag, 'none') from graph.nodes where id = '${target}'`).out, "none");

      const roster = await import("../src/app/api/research-os/roster/route");
      assert.equal((await roster.POST(request("/api/research-os/roster", teacher, { method: "POST", body: {} }), undefined)).status, 403);

      const signoff = await import("../src/app/api/canon/signoff/route");
      assert.equal((await signoff.GET(request("/api/canon/signoff", teacher))).status, 403);

      const privacy = await import("../src/app/api/research-os/privacy/route");
      const exp = await status(await privacy.POST(request("/api/research-os/privacy", teacher, { method: "POST", body: { action: "export", learnerId: learner.id } })));
      assert.equal(exp.status, 401, "a teacher cannot export a learner's data, even from their own class");
    });

    await t.test("the teacher keeps owner powers over their own class and nothing past it", async () => {
      const { verifyClassStaff } = await import("../src/lib/research-os/class-db");
      const own = await verifyClassStaff(request("/", teacher), mine.value.id);
      assert.ok(own.ok && own.staff?.roles.includes("teacher"));
      const other = await verifyClassStaff(request("/", teacher), theirs.value.id);
      assert.ok(other.ok && other.staff === null);

      const review = await import("../src/app/api/research-os/review/route");
      const queue = await status(await review.GET(request("/api/research-os/review", teacher), undefined));
      assert.equal(queue.status, 200);
      const learners = new Set(((queue.body.productions as { learnerId: string }[]) ?? []).map((p) => p.learnerId));
      assert.deepEqual(Array.from(learners), [learner.id]);

      const outsiderReview = await status(await review.GET(request("/api/research-os/review", outsider), undefined));
      assert.equal(outsiderReview.status, 200);
      assert.equal(((outsiderReview.body.productions as unknown[]) ?? []).length, 0, "the outsider's own class holds nobody");
    });

    await t.test("with launch scope closed, the teacher gets 404 on /class", async () => {
      closeLaunchScope();
      try {
        const cls = await import("../src/app/api/research-os/class/route");
        const res = await cls.GET(request(`/api/research-os/class?branch=${BRANCH}&target=target-${RUN}`, teacher), undefined);
        assert.equal(res.status, 404);
      } finally {
        closeLaunchScope = openLaunchScope();
      }
    });

    await t.test("/class shows the teacher their class and hides titles the teacher cannot read", async () => {
      const cls = await import("../src/app/api/research-os/class/route");
      const res = await status(await cls.GET(request(`/api/research-os/class?branch=${BRANCH}&target=target-${RUN}`, teacher), undefined));
      assert.equal(res.status, 200, JSON.stringify(res.body));
      const classes = res.body.classes as { id: string; learnerIds: string[] }[];
      assert.deepEqual(classes.map((c) => c.id), [mine.value.id]);
      assert.ok(classes[0].learnerIds.includes(learner.id));
      const text = JSON.stringify(res.body);
      assert.equal(text.includes(`Outsider secret ${RUN}`), false, "a private title owned by someone else leaked");
      const productions = (res.body.queue as { productions: { targetNodeId: string; targetTitle: string }[] }).productions;
      assert.equal(productions.find((p) => p.targetNodeId === secret)?.targetTitle, secret);
      assert.equal(productions.find((p) => p.targetNodeId === own)?.targetTitle, `Teacher draft ${RUN}`);

      const learnerView = await cls.GET(request(`/api/research-os/class?branch=${BRANCH}&target=target-${RUN}`, learner), undefined);
      assert.equal(learnerView.status, 403, "a learner in the class is no teacher");
    });
  } finally {
    if (prior === undefined) delete process.env.RESEARCH_OS_REVIEWER_EMAILS;
    else process.env.RESEARCH_OS_REVIEWER_EMAILS = prior;
    const ids = (xs: string[]) => xs.map((x) => `'${x}'`).join(",") || "null";
    sql(`delete from graph.productions where target_node_id in (${ids(nodeIds)});
         delete from graph.nodes where id in (${ids(nodeIds)});
         delete from graph.class_members where class_id in (${ids(classIds)});
         delete from graph.classes where id in (${ids(classIds)});`);
    const svc = admin();
    for (const id of made) await svc.auth.admin.deleteUser(id);
  }
});
