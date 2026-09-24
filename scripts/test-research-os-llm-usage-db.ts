import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv, TEST_DB as DB } from "./lib/test-harness";
import { checkDailyLimits, dbLimiter } from "../src/lib/llm/daily-limit";

loadLocalEnv();

const probe = spawnSync("psql", [DB, "-At", "-c", "select to_regprocedure('graph.llm_usage_hit(text,text)') is not null"], { encoding: "utf8" });
const ready = probe.status === 0 && probe.stdout.trim() === "t";
const keyed = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

if (process.env.RESEARCH_OS_REQUIRE_DB === "1" && !(ready && keyed)) {
  console.error("RESEARCH_OS_REQUIRE_DB=1 and no local database with the llm_usage migration and service key");
  process.exit(1);
}

const skip = ready ? false : "no local database with the llm_usage migration";
const skipRpc = ready && keyed ? false : "no local Supabase URL and service key in .env.local";

function psql(statement: string) {
  return spawnSync("psql", [DB, "-At", "-v", "ON_ERROR_STOP=1", "-c", statement], { encoding: "utf8" });
}

function asRole(role: string, statement: string) {
  return psql(`begin; grant usage on schema graph to ${role}; set local role ${role}; ${statement}; rollback;`);
}

test("anon and authenticated are refused the table and the counter", { skip }, () => {
  for (const role of ["anon", "authenticated"]) {
    for (const statement of [
      "select count(*) from graph.llm_usage",
      "insert into graph.llm_usage (subject, route, day, count) values ('x', 'tutor', current_date, 0)",
      "update graph.llm_usage set count = 0",
      "select graph.llm_usage_hit('x', 'tutor')",
    ]) {
      const run = asRole(role, statement);
      assert.notEqual(run.status, 0, `${role} ran: ${statement}`);
      assert.match(run.stderr, /permission denied/, `${role}: ${statement}: ${run.stderr}`);
    }
  }
});

test("the table forces row level security and the counter pins its search path", { skip }, () => {
  const rls = psql("select relrowsecurity and relforcerowsecurity from pg_class where oid = 'graph.llm_usage'::regclass");
  assert.equal(rls.stdout.trim(), "t");
  const fn = psql("select prosecdef, proconfig::text from pg_proc where oid = 'graph.llm_usage_hit(text,text)'::regprocedure");
  assert.equal(fn.stdout.trim(), 'f|{"search_path=\\"\\""}');
});

test("the service role counts 1 then 2 and refuses a route outside the list", { skip }, () => {
  const subject = `t-${randomUUID()}`;
  const run = psql(
    `begin; set local role service_role; select graph.llm_usage_hit('${subject}', 'tutor'); select graph.llm_usage_hit('${subject}', 'tutor'); select graph.llm_usage_hit('${subject}', 'agent'); rollback;`,
  );
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(run.stdout.split("\n").filter((l) => /^\d+$/.test(l)), ["1", "2", "1"]);
  const badRoute = psql(`begin; set local role service_role; select graph.llm_usage_hit('${subject}', 'other'); rollback;`);
  assert.notEqual(badRoute.status, 0);
  assert.match(badRoute.stderr, /check constraint/);
});

test("twenty concurrent hits through PostgREST end at exactly twenty", { skip: skipRpc }, async () => {
  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    db: { schema: "graph" },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const limiter = dbLimiter(svc as never);
  const subject = `t-${randomUUID()}`;
  try {
    const counts = await Promise.all(Array.from({ length: 20 }, () => limiter.hit(subject, "tutor", new Date())));
    assert.deepEqual([...counts].sort((a, b) => a - b), Array.from({ length: 20 }, (_, i) => i + 1));
    const verdict = await checkDailyLimits(limiter, subject, "tutor", { user: 20, global: 1_000_000 }, new Date());
    assert.equal(verdict.allowed, false);
  } finally {
    psql(`delete from graph.llm_usage where subject = '${subject}'`);
  }
});

test("the anon key cannot reach the counter through PostgREST", { skip: skipRpc }, async () => {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) return;
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, anonKey, { db: { schema: "graph" }, auth: { persistSession: false } });
  const { data, error } = await anon.rpc("llm_usage_hit", { p_subject: "anon", p_route: "tutor" });
  assert.equal(data, null);
  assert.ok(error, "anon reached llm_usage_hit");
});
