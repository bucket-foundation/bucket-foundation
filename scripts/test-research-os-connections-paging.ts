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

test("every touching edge comes back once, past the row cap", { skip }, async (t) => {
  /* eslint-disable-next-line @typescript-eslint/no-var-requires */
  const { loadTouchingEdges } = require("../src/lib/research-os/connections-db") as {
    loadTouchingEdges: (ids: string[]) => Promise<{ fromId: string; toId: string; kind: string }[]>;
  };

  const tag = `conn-${Date.now().toString(36)}`;
  const held = [randomUUID(), randomUUID()];
  const FAR = 1100;

  t.after(() => {
    sql(`delete from graph.edges where from_id in (select id from graph.nodes where slug like '${tag}-%')
            or to_id in (select id from graph.nodes where slug like '${tag}-%');
         delete from graph.nodes where slug like '${tag}-%';`);
  });

  const seeded = sql(`
    insert into graph.nodes (id, slug, title, kind, tier, branch, summary) values
      ('${held[0]}', '${tag}-a', '${tag} A', 'concept', 10, '01-mathematics', 'fixture'),
      ('${held[1]}', '${tag}-b', '${tag} B', 'concept', 10, '01-mathematics', 'fixture');
    insert into graph.nodes (id, slug, title, kind, tier, branch, summary)
      select gen_random_uuid(), '${tag}-far-' || g, '${tag} far ' || g, 'concept', 10, '02-physics', 'fixture'
      from generate_series(1, ${FAR}) g;
    insert into graph.edges (from_id, to_id, kind)
      select '${held[0]}', id, 'derives_from' from graph.nodes where slug like '${tag}-far-%';
    insert into graph.edges (from_id, to_id, kind)
      values ('${held[0]}', '${held[1]}', 'derives_from');
    select 'seeded';
  `);
  assert.equal(seeded.status, 0, seeded.out);

  const total = sql(`select count(*) from graph.edges where from_id = '${held[0]}' and kind <> 'prerequisite'`);
  assert.equal(total.out, String(FAR + 1), `the fixture holds ${FAR + 1} edges: ${total.out}`);

  const edges = await loadTouchingEdges(held);
  assert.equal(edges.length, FAR + 1, `every edge came back, not the first page: ${edges.length}`);

  const seen = new Set(edges.map((e) => `${e.fromId}->${e.toId}:${e.kind}`));
  assert.equal(seen.size, edges.length, "and none came back twice");

  const both = edges.filter((e) => e.fromId === held[0] && e.toId === held[1]);
  assert.equal(both.length, 1, `the edge readable from both directions appears once: ${both.length}`);
});

test("both edge reads end on the primary key", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "src/lib/research-os/connections-db.ts"), "utf8");
  const reads = src.split("\n").filter((l) => l.includes('.from("edges")'));
  assert.equal(reads.length, 2, `two edge reads, found ${reads.length}`);
  for (const read of reads) {
    const orders = Array.from(read.matchAll(/\.order\("([a-z_]+)"/g)).map((m) => m[1]);
    assert.equal(
      orders[orders.length - 1],
      "id",
      `a paged read of graph.edges ends on its primary key, found ${orders.join(" then ") || "no order at all"}`,
    );
  }
});
