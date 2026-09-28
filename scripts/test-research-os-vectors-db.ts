import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

const DB = process.env.RESEARCH_OS_TEST_DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const probe = spawnSync("psql", [DB, "-At", "-c", "select to_regprocedure('graph.nearest_nodes(uuid, text[], int)') is not null"], { encoding: "utf8" });
const ready = probe.status === 0 && probe.stdout.trim() === "t";

if (process.env.RESEARCH_OS_REQUIRE_DB === "1" && !ready) {
  console.error("RESEARCH_OS_REQUIRE_DB=1 and no database carries the vectors migration");
  process.exit(1);
}

test("pgvector 0.8.2, the HNSW plan and recall@20 hold in real Postgres", { skip: ready ? false : "no local database with the vectors migration" }, () => {
  const file = path.join(__dirname, "..", "supabase", "tests", "research_os_vectors.sql");
  const run = spawnSync("psql", [DB, "-v", "ON_ERROR_STOP=1", "-f", file], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  const recall = Number(/recall@20 ([0-9.]+)/.exec(run.stderr)?.[1]);
  assert.ok(recall >= 0.95, `recall@20 ${recall}`);
});
