import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { EXPORT_PARTS, exportCsv, hanChars, partsFor, shownParts, type HanComponentRow } from "../src/lib/research-os/han-components";

const DB = process.env.RESEARCH_OS_TEST_DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

function loadLocalEnv(): void {
  const file = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadLocalEnv();

const row = (char: string, ord: number, component: string, extra: Partial<HanComponentRow> = {}): HanComponentRow => ({
  char, ord, component, meaning: null, meaning_source: null, ids: "⿱宀于", source: "BabelStone IDS", confidence: 0.6,
  agrees_with_wiktionary: null, decomposition_license: "none claimed", meaning_license: null, ...extra,
});

test("every band at or above the threshold shows: agreement settled, disagreement and no check uncertain", () => {
  const map = shownParts([
    row("宇", 2, "于", { meaning: "at", meaning_source: "wiktionary-zh", meaning_license: "CC BY-SA 4.0" }),
    row("宇", 1, "宀", { meaning: "roof", meaning_source: "unihan", meaning_license: "Unicode-3.0" }),
    row("等", 1, "竹", { agrees_with_wiktionary: true, confidence: 0.9 }),
    row("証", 1, "訁", { agrees_with_wiktionary: false }),
    row("宙", 1, "宀", { confidence: 0.3 }),
  ]);
  assert.deepEqual(Array.from(map.keys()).sort(), ["宇", "等", "証"].sort());
  assert.deepEqual(map.get("等")!.parts.map((p) => [p.component, p.uncertain, p.agreesWithWiktionary]), [["竹", false, true]]);
  assert.deepEqual(map.get("証")!.parts.map((p) => [p.component, p.uncertain, p.agreesWithWiktionary]), [["訁", true, false]]);
  assert.deepEqual(map.get("宇")!.parts.map((p) => [p.component, p.uncertain, p.meaningSource, p.agreesWithWiktionary]), [["宀", true, "unihan", null], ["于", true, "wiktionary-zh", null]]);
  assert.equal(map.has("宙"), false);
  assert.deepEqual(partsFor({ lang: "zh", word: "宇宙" }, map).map((h) => h.char), ["宇"]);
  assert.deepEqual(partsFor({ lang: "fr", word: "宇" }, map), []);
  assert.deepEqual(hanChars([{ lang: "ja", word: "宇宙" }, { lang: "zh", word: "abc" }, { lang: "zh", word: "𠀋" }]), ["宇", "宙", "𠀋"].sort());
});

test("each export file carries one license in its header row and nothing from another", () => {
  const rows = [
    row("宇", 1, "宀", { meaning: "roof", meaning_source: "unihan", meaning_license: "Unicode-3.0" }),
    row("宇", 2, "于", { meaning: "at, \"in\"", meaning_source: "wiktionary-zh", meaning_license: "CC BY-SA 4.0" }),
    row("宙", 1, "宀", { meaning: "roof", meaning_source: "unihan", meaning_license: "Unicode-3.0" }),
  ];
  const dec = exportCsv("decompositions", rows).trim().split("\n");
  assert.ok(dec[0].includes("waives copyright"));
  assert.equal(dec[1], EXPORT_PARTS.decompositions.columns.join(","));
  assert.equal(dec.length, 5);
  const wik = exportCsv("meanings-wiktionary", rows).trim().split("\n");
  assert.ok(wik[0].includes("CC BY-SA 4.0"));
  assert.deepEqual(wik.slice(2), ['于,"at, ""in""",wiktionary-zh']);
  const uni = exportCsv("meanings-unihan", rows).trim().split("\n");
  assert.ok(uni[0].includes("Unicode License v3"));
  assert.deepEqual(uni.slice(2), ["宀,roof"]);
});

const probe = spawnSync("psql", [DB, "-At", "-c", "select count(*) from graph.han_components"], { encoding: "utf8" });
const ready = probe.status === 0 && Number((probe.stdout || "").trim()) > 0 && Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
if (process.env.RESEARCH_OS_REQUIRE_DB === "1" && !ready) throw new Error("RESEARCH_OS_REQUIRE_DB=1 and graph.han_components is empty or unreachable");
const skip = ready ? false : "no local stack with graph.han_components loaded";

const STAFF = { id: "00000000-0000-0000-0000-0000000000a1", email: "staff@bucket.test" };

async function get(query: string): Promise<Response> {
  const db = (await import("../src/lib/research-os/db")) as unknown as Record<string, unknown>;
  const { GET } = await import("../src/app/api/research-os/han-components/export/route");
  const { NextRequest } = await import("next/server");
  const saved = { verify: db.verifyLearnerIdentity, list: process.env.RESEARCH_OS_REVIEWER_EMAILS };
  db.verifyLearnerIdentity = async () => STAFF;
  process.env.RESEARCH_OS_REVIEWER_EMAILS = STAFF.email;
  try {
    return await GET(new NextRequest(`http://localhost/api/research-os/han-components/export${query}`), undefined);
  } finally {
    db.verifyLearnerIdentity = saved.verify;
    if (saved.list === undefined) delete process.env.RESEARCH_OS_REVIEWER_EMAILS;
    else process.env.RESEARCH_OS_REVIEWER_EMAILS = saved.list;
  }
}

test("the export route answers 404 to a caller outside launch staff", { skip }, async () => {
  const { GET } = await import("../src/app/api/research-os/han-components/export/route");
  const { NextRequest } = await import("next/server");
  assert.equal((await GET(new NextRequest("http://localhost/api/research-os/han-components/export"), undefined)).status, 404);
});

test("the export route lists three files and serves each as CSV", { skip }, async () => {
  const index = await get("");
  assert.equal(index.status, 200);
  const files = ((await index.json()) as { files: { part: string; file: string }[] }).files;
  assert.deepEqual(files.map((f) => f.part), ["decompositions", "meanings-wiktionary", "meanings-unihan"]);
  for (const f of files) {
    const res = await get(`?part=${f.part}`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") || "", /text\/csv/);
    assert.match(res.headers.get("content-disposition") || "", new RegExp(f.file));
    assert.equal(res.headers.get("cache-control"), "no-store");
    const lines = (await res.text()).trim().split("\n");
    assert.ok(lines.length > 2);
  }
  assert.equal((await get("?part=everything")).status, 400);
});

test("anon may read the table and may not write it", { skip }, () => {
  for (const role of ["anon", "authenticated"]) {
    const read = spawnSync("psql", [DB, "-At", "-v", "ON_ERROR_STOP=1", "-c", `begin; grant usage on schema graph to ${role}; set local role ${role}; select count(*) > 0 from graph.han_components; rollback;`], { encoding: "utf8" });
    assert.equal(read.status, 0, read.stderr);
    assert.match(read.stdout, /^t$/m);
    const write = spawnSync("psql", [DB, "-At", "-v", "ON_ERROR_STOP=1", "-c", `begin; grant usage on schema graph to ${role}; set local role ${role}; delete from graph.han_components; rollback;`], { encoding: "utf8" });
    assert.notEqual(write.status, 0);
    assert.match(write.stderr, /permission denied|row-level security/);
  }
});
