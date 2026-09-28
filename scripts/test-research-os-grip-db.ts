import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { loadLocalEnv, TEST_DB as DB } from "./lib/test-harness";
import { demonstratedKeys, gripFor } from "../src/lib/research-os/grip";
import { loadAssessVerdicts, loadGripCatalog } from "../src/lib/research-os/grip-db";

loadLocalEnv();

function psql(sql: string) {
  return spawnSync("psql", [DB, "-At", "-v", "ON_ERROR_STOP=1", "-c", sql], { encoding: "utf8" });
}

const probe = psql("select count(*) from graph.nodes where provenance->>'type' = 'academy_atom'");
const atoms = probe.status === 0 ? Number(probe.stdout.trim()) : 0;
const keyed = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
if (process.env.RESEARCH_OS_REQUIRE_DB === "1" && !(probe.status === 0 && keyed)) {
  console.error("RESEARCH_OS_REQUIRE_DB=1 and no local database with a Supabase URL and service key");
  process.exit(1);
}
const skip = probe.status === 0 && keyed ? (atoms > 0 ? false : "no Academy atoms imported") : "no local stack with a Supabase URL and service key";

test("assessed answers on the local stack become grounded reach on their branch", { skip }, async () => {
  const roots = psql("select n.provenance->>'atom_id' from graph.nodes n where n.branch = '02-physics' and n.provenance->>'type' = 'academy_atom' and not exists (select 1 from graph.edges e where e.to_id = n.id and e.kind = 'prerequisite') order by 1 limit 1").stdout.trim();
  assert.ok(roots, "a physics root atom exists");
  const user = randomUUID();
  assert.equal(psql(`insert into auth.users (id, instance_id, aud, role, email) values ('${user}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'grip-${user}@bucket.test')`).status, 0);
  try {
    const bioRoot = psql("select n.provenance->>'atom_id' from graph.nodes n where n.branch = '05-biophysics' and n.provenance->>'type' = 'academy_atom' and not exists (select 1 from graph.edges e where e.to_id = n.id and e.kind = 'prerequisite') order by 1 limit 1").stdout.trim();
    assert.ok(bioRoot, "a biophysics root atom exists");
    for (const props of [
      { branch: "02-physics", items: [{ atomId: roots, level: "recall", correct: true, autoGraded: true }, { atomId: "not-an-atom", level: "recall", correct: true, autoGraded: true }] },
      { branch: "05-biophysics", items: [{ atomId: bioRoot, level: "recall", correct: true, autoGraded: true }] },
    ]) {
      const ins = psql(`insert into bucket.learn_events (user_id, event_id, name, props) values ('${user}', '${randomUUID()}', 'assess_done', '${JSON.stringify(props)}'::jsonb)`);
      assert.equal(ins.status, 0, ins.stderr);
    }
    const [catalog, verdicts] = await Promise.all([loadGripCatalog(user), loadAssessVerdicts(user)]);
    assert.equal(catalog.nodes.length, atoms - 10);
    const g = gripFor(catalog.nodes, catalog.edges, demonstratedKeys(verdicts));
    const physics = g.axes.find((a) => a.branch === "02-physics")!;
    assert.equal(physics.demonstrated, 1);
    assert.equal(physics.groundedDepth, 0);
    assert.equal(physics.radius, 1 / (1 + physics.maxDepth));
    const bio = g.axes.find((a) => a.branch === "05-biophysics")!;
    assert.equal(bio.demonstrated, 1);
    assert.ok(bio.radius > 0);
    assert.equal(g.demonstratedTotal, 2);
    assert.ok(g.grip > 0 && g.grip < 0.01);
    const other = await loadAssessVerdicts(randomUUID());
    assert.equal(other.length, 0);
  } finally {
    psql(`delete from bucket.learn_events where user_id = '${user}'; delete from auth.users where id = '${user}'`);
  }
});
