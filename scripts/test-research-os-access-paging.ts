/**
 * Every live grant on a node reaches the decision, past the row cap
 * (src/lib/research-os/access-db.ts's loadGrants and loadViewerGroups).
 *
 * PostgREST answers at most a thousand rows and reports no error, so a
 * grant past that boundary was dropped and the caller read a complete
 * list of grants that happened to exclude the grantee. The grantee is
 * then refused a node they hold a live grant on, and nothing anywhere
 * says a read was truncated. Under-permission is the quiet direction of
 * this failure, which is why it needs a test rather than a report.
 *
 * `dbAccessStore.grants` in read-access.ts pages already. These two read
 * the same table for the same decision and did not, which is the shape
 * this repository keeps producing: one rule with two implementations.
 *
 * Needs the local stack. RESEARCH_OS_REQUIRE_DB=1 turns a skip into a
 * failure.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs";

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

const probe = sql("select 1");
const ready = probe.status === 0 && probe.out === "1" && Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
if (process.env.RESEARCH_OS_REQUIRE_DB === "1" && !ready) {
  throw new Error(`RESEARCH_OS_REQUIRE_DB=1 and the local stack is not reachable: ${probe.out}`);
}
const skip = ready ? false : "no local stack with a Supabase URL and service key";

/** One more row than a single response carries. */
const PAST_CAP = 1100;

test("every grant on a node reaches the decision, past the row cap", { skip }, async (t) => {
  /* eslint-disable-next-line @typescript-eslint/no-var-requires */
  const { loadGrants } = require("../src/lib/research-os/access-db") as {
    loadGrants: (nodeId: string) => Promise<{ ok: true; value: { granteeId?: string | null }[] } | { ok: false; reason: string }>;
  };

  const tag = `grantpage-${Date.now().toString(36)}`;
  const nodeId = randomUUID();

  t.after(() => {
    sql(`delete from graph.node_grants where node_id = '${nodeId}';
         delete from graph.nodes where id = '${nodeId}';`);
  });

  const seeded = sql(`
    insert into graph.nodes (id, slug, title, kind, tier, branch, summary, visibility)
      values ('${nodeId}', '${tag}', '${tag}', 'concept', 10, '01-mathematics', 'fixture', 'shared');
    insert into graph.node_grants (node_id, grantee_group, role)
      select '${nodeId}', 'class:${tag}-' || g, 'view' from generate_series(1, ${PAST_CAP}) g;
    select 'seeded';
  `);
  assert.equal(seeded.status, 0, seeded.out);

  const total = sql(`select count(*) from graph.node_grants where node_id = '${nodeId}'`);
  assert.equal(total.out, String(PAST_CAP), `the fixture holds ${PAST_CAP} grants: ${total.out}`);

  const read = await loadGrants(nodeId);
  assert.ok(read.ok, "a reachable store answers");
  if (!read.ok) return;
  assert.equal(read.value.length, PAST_CAP, `every grant came back, not the first page: ${read.value.length}`);

  // The last grant written is the one a single unpaged request drops,
  // and it is the grant that decides for its holder.
  const last = sql(`select grantee_group from graph.node_grants where node_id = '${nodeId}' order by id desc limit 1`);
  const groups = new Set(read.value.map((g) => (g as { granteeGroup?: string | null }).granteeGroup));
  assert.ok(groups.has(last.out), `the grant past the cap is in the answer: ${last.out}`);
});

test("every class a learner belongs to reaches the decision, past the row cap", { skip }, async (t) => {
  /* eslint-disable-next-line @typescript-eslint/no-var-requires */
  const { loadViewerGroups } = require("../src/lib/research-os/access-db") as {
    loadViewerGroups: (learnerId: string) => Promise<{ ok: true; value: string[] } | { ok: false; reason: string }>;
  };

  const tag = `grouppage-${Date.now().toString(36)}`;
  const learnerId = randomUUID();

  t.after(() => {
    sql(`delete from graph.class_members where learner_id = '${learnerId}';
         delete from graph.classes where name like '${tag}%';
         delete from auth.users where id = '${learnerId}';`);
  });

  const seeded = sql(`
    insert into auth.users (id, instance_id, aud, role, email)
      values ('${learnerId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
              '${tag}@bucket.test');
    insert into graph.classes (id, name, reviewer_email)
      select gen_random_uuid(), '${tag}-' || g, 'fixture@bucket.test' from generate_series(1, ${PAST_CAP}) g;
    insert into graph.class_members (class_id, learner_id, role)
      select id, '${learnerId}', 'learner' from graph.classes where name like '${tag}-%';
    select 'seeded';
  `);
  assert.equal(seeded.status, 0, seeded.out);

  const read = await loadViewerGroups(learnerId);
  assert.ok(read.ok, "a reachable store answers");
  if (!read.ok) return;
  assert.equal(read.value.length, PAST_CAP, `every class came back, not the first page: ${read.value.length}`);
  assert.equal(new Set(read.value).size, PAST_CAP, "and none came back twice");
});

test("both access reads carry a total order", () => {
  // The row-count cases cannot prove this: Postgres returns a stable
  // order for these plans and an unordered read passed them. The rule
  // is the negative one, that LIMIT and OFFSET may repeat and skip
  // without a total sort key, so it is checked where it is written.
  const src = fs.readFileSync(path.join(__dirname, "..", "src/lib/research-os/access-db.ts"), "utf8");
  for (const table of ["node_grants", "class_members"]) {
    const start = src.indexOf(`.from("${table}")`);
    assert.ok(start > 0, `${table} is read in access-db.ts`);
    const chain = src.slice(start, src.indexOf(";", start));
    assert.match(chain, /\.range\(/, `the ${table} read pages`);
    assert.match(chain, /\.order\("(id|class_id)"\)/, `the ${table} read orders on a unique column`);
  }
});

test("the declared unique keys are the ones the database has", { skip }, () => {
  // scripts/research-os/graph-keys.ts is what the paging gate reads, and
  // it runs without a database. A migration that adds or drops a unique
  // key would leave it stale, and a stale map excuses a read it should
  // refuse. This is the only place the two meet.
  /* eslint-disable-next-line @typescript-eslint/no-var-requires */
  const { GRAPH_UNIQUE_KEYS } = require("./research-os/graph-keys") as {
    GRAPH_UNIQUE_KEYS: Record<string, readonly (readonly string[])[]>;
  };

  // Partial indexes are excluded on both sides: a key that holds only
  // under a predicate makes an order total only when the read pins that
  // predicate, which this gate does not model.
  const live = sql(`
    select c.relname || ':' || string_agg(a.attname, ',' order by k.ord)
    from pg_index x
    join pg_class c on c.oid = x.indrelid
    join pg_class i on i.oid = x.indexrelid
    join pg_namespace n on n.oid = c.relnamespace
    cross join lateral unnest(x.indkey) with ordinality as k(attnum, ord)
    join pg_attribute a on a.attrelid = c.oid and a.attnum = k.attnum
    where n.nspname = 'graph' and x.indisunique and x.indpred is null
    group by c.relname, i.relname
    order by 1
  `);
  assert.equal(live.status, 0, live.out);

  const fromDb = new Set(live.out.split("\n").filter(Boolean));
  const declared = new Set<string>();
  for (const table of Object.keys(GRAPH_UNIQUE_KEYS)) {
    for (const key of GRAPH_UNIQUE_KEYS[table]) declared.add(`${table}:${key.join(",")}`);
  }

  const missing = Array.from(fromDb).filter((k) => !declared.has(k)).sort();
  const extra = Array.from(declared).filter((k) => !fromDb.has(k)).sort();
  assert.deepEqual(missing, [], `the database has unique keys graph-keys.ts does not declare: ${missing.join("; ")}`);
  assert.deepEqual(extra, [], `graph-keys.ts declares unique keys the database does not have, which excuses reads it should refuse: ${extra.join("; ")}`);
});
