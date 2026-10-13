import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { loadLocalEnv, TEST_DB as DB } from "./lib/test-harness";
import { atomLearningItems, itemsToAtomFields } from "../src/lib/research-os/ingest/academy-items";
import { academyNodeSlug } from "../src/lib/research-os/ingest/academy";

loadLocalEnv();

const probe = spawnSync("psql", [DB, "-At", "-c", "select to_regprocedure('graph.replace_learning_items(uuid,jsonb)') is not null"], { encoding: "utf8" });
const ready = probe.status === 0 && probe.stdout.trim() === "t";
if (process.env.RESEARCH_OS_REQUIRE_DB === "1" && !ready) {
  console.error("RESEARCH_OS_REQUIRE_DB=1 and no local database with the learning_items migration");
  process.exit(1);
}
const skip = ready ? false : "no local database with the learning_items migration";

function psql(sql: string) {
  const r = spawnSync("psql", [DB, "-At", "-v", "ON_ERROR_STOP=1", "-c", sql], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  return { status: r.status, out: r.stdout.trim(), err: r.stderr };
}

function asService(call: string): { status: number | null; result: { written: number; deleted: number } | null; err: string } {
  const r = psql(`begin; set local role service_role; ${call}; commit;`);
  const line = r.out.split("\n").find((l) => l.startsWith("{"));
  return { status: r.status, result: line ? JSON.parse(line) : null, err: r.err };
}

function items(entries: [string, number, string][]) {
  return JSON.stringify(entries.map(([kind, ordinal, text]) => ({ kind, ordinal, body: { text }, content_hash: text, provenance: {} }))).replace(/'/g, "''");
}

test("replace_learning_items upserts on change, deletes what is gone, and converges", { skip }, () => {
  const slug = `test-learning-items-${randomUUID()}`;
  const made = psql(`insert into graph.nodes (slug, title, kind, tier, branch) values ('${slug}', 'Fixture', 'concept', 13, '02-physics') returning id`);
  assert.equal(made.status, 0, made.err);
  const id = made.out.split("\n")[0];
  try {
    const first = asService(`select graph.replace_learning_items('${id}', '${items([["note", 0, "a"], ["source", 0, "b"], ["source", 1, "c"]])}'::jsonb)`);
    assert.equal(first.status, 0, first.err);
    assert.deepEqual(first.result, { written: 3, deleted: 0 });
    const same = asService(`select graph.replace_learning_items('${id}', '${items([["note", 0, "a"], ["source", 0, "b"], ["source", 1, "c"]])}'::jsonb)`);
    assert.deepEqual(same.result, { written: 0, deleted: 0 });
    const changed = asService(`select graph.replace_learning_items('${id}', '${items([["note", 0, "a2"], ["source", 0, "b"]])}'::jsonb)`);
    assert.deepEqual(changed.result, { written: 1, deleted: 1 });
    assert.equal(psql(`select string_agg(kind || ordinal || (body->>'text'), ',' order by kind, ordinal) from graph.learning_items where node_id = '${id}'`).out, "note0a2,source0b");
    const anon = psql(`begin; set local role anon; select graph.replace_learning_items('${id}', '[]'::jsonb); commit;`);
    assert.notEqual(anon.status, 0);
    const read = psql(`begin; set local role authenticated; select count(*) from graph.learning_items; commit;`);
    assert.notEqual(read.status, 0);
  } finally {
    psql(`delete from graph.nodes where id = '${id}'`);
  }
  assert.equal(psql(`select count(*) from graph.learning_items li left join graph.nodes n on n.id = li.node_id where n.id is null`).out, "0");
});

test("the graph holds every science atom's content once the importer has applied", { skip }, (t) => {
  const count = Number(psql(`select count(*) from graph.learning_items li join graph.nodes n on n.id = li.node_id where n.provenance->>'type' = 'academy_atom'`).out);
  if (count === 0) return t.skip("run npm run ingest:research-os:academy -- --apply first");
  const corpus = path.join(__dirname, "..", "learning", "app", "corpus");
  const rows = psql(`select n.slug, coalesce(json_agg(json_build_object('kind', li.kind, 'ordinal', li.ordinal, 'body', li.body)) filter (where li.id is not null), '[]') from graph.nodes n left join graph.learning_items li on li.node_id = n.id where n.provenance->>'type' = 'academy_atom' group by n.slug`);
  assert.equal(rows.status, 0, rows.err);
  const bySlug = new Map(rows.out.split("\n").map((l) => {
    const i = l.indexOf("|");
    return [l.slice(0, i), JSON.parse(l.slice(i + 1))] as const;
  }));
  let checked = 0;
  for (const f of fs.readdirSync(corpus).filter((x) => x.endsWith(".json")).sort()) {
    const json = JSON.parse(fs.readFileSync(path.join(corpus, f), "utf8")) as { meta?: { branch?: string }; atoms?: { id: string; title?: string }[] };
    if (!json.meta?.branch || !json.atoms?.length || !json.atoms.every((a) => typeof a.title === "string")) continue;
    const file = `learning/app/corpus/${f}`;
    for (const atom of json.atoms) {
      const stored = bySlug.get(academyNodeSlug(file, atom.id));
      assert.ok(stored, `${file} ${atom.id} missing from the graph`);
      assert.deepEqual(itemsToAtomFields(stored), itemsToAtomFields(atomLearningItems(file, atom)), `${file} ${atom.id}`);
      checked++;
    }
  }
  assert.equal(checked, 487);
});
