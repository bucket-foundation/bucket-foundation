import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { checkManifests, feedOf, planFeeds, stagedFiles } from "./research-os/evolution/computing-import";
import { loadPolicy } from "./research-os/medallion/lib/repo-io";

const WIKI = `${JSON.stringify({ id: "Q28865", label: "Python", class: "language", inception: "1991-02-20", versions: [{ v: "3.12.0", date: "2023-10-02" }], influenced_by: ["Q187560"] })}\n`;
const EOL = JSON.stringify({ result: { name: "python", releases: [{ name: "3.13", releaseDate: "2024-10-07" }, { name: "3.12", releaseDate: "2023-10-02" }] } }, null, 1) + "\n";

function fixture(manifest: Record<string, string> | null) {
  const data = mkdtempSync(path.join(tmpdir(), "evo-cli-"));
  mkdirSync(path.join(data, "wikidata", "software"), { recursive: true });
  mkdirSync(path.join(data, "endoflife", "products"), { recursive: true });
  writeFileSync(path.join(data, "wikidata", "software", "software.jsonl"), WIKI);
  writeFileSync(path.join(data, "endoflife", "products", "python.json"), EOL);
  if (manifest) {
    mkdirSync(path.join(data, "live", "runs"), { recursive: true });
    const changed = Object.entries(manifest).map(([p, sha256]) => ({ path: p, sha256, bytes: 1 }));
    writeFileSync(path.join(data, "live", "runs", "2026-09-24T041700Z.json"), JSON.stringify({ started: "2026-09-24T04:17:00+00:00", feeds: { all: { changed } }, imported: { status: "running" } }));
  }
  return data;
}

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const W = "_intake/evolution/wikidata/software/software.jsonl";
const P = "_intake/evolution/endoflife/products/python.json";

test("only staged computing feed paths are accepted", () => {
  assert.equal(feedOf(W), "wikidata");
  assert.equal(feedOf(P), "endoflife");
  for (const bad of ["_intake/evolution/onet/28.2/bronze/db.zip", "_intake/evolution/endoflife/products/../x.json", "wikidata/software/software.jsonl"]) assert.equal(feedOf(bad), null, bad);
  const data = fixture(null);
  try {
    assert.deepEqual(stagedFiles(data, []).map((f) => f.repoPath), [P, W]);
    assert.throws(() => stagedFiles(data, ["_intake/evolution/onet/x.json"]), /not a staged computing feed file/);
  } finally {
    rmSync(data, { recursive: true, force: true });
  }
});

test("a file must match the latest run manifest", () => {
  const good = fixture({ [W]: sha(WIKI), [P]: sha(EOL) });
  const stale = fixture({ [W]: sha("older"), [P]: sha(EOL) });
  const none = fixture(null);
  try {
    assert.deepEqual(checkManifests(good, stagedFiles(good, [])), []);
    assert.deepEqual(checkManifests(stale, stagedFiles(stale, [])), [{ repoPath: W, reason: "sha256" }]);
    assert.deepEqual(checkManifests(none, stagedFiles(none, [W])), [{ repoPath: W, reason: "no_manifest" }]);
    assert.deepEqual(checkManifests(good, stagedFiles(good, ["_intake/evolution/endoflife/products/debian.json"])), [{ repoPath: "_intake/evolution/endoflife/products/debian.json", reason: "missing_file" }]);
  } finally {
    for (const d of [good, stale, none]) rmSync(d, { recursive: true, force: true });
  }
});

test("both feeds plan to silver and promote nothing", () => {
  const data = fixture({ [W]: sha(WIKI), [P]: sha(EOL) });
  try {
    const { policy } = loadPolicy();
    const plans = planFeeds(stagedFiles(data, []), { nodes: [], edges: [], eolToSlug: new Map([["python", "software-wikidata-q28865"]]) }, policy);
    assert.ok(plans.wikidata && plans.endoflife);
    assert.equal(plans.wikidata.silver.length, 1);
    assert.equal(plans.wikidata.edgeCandidates.length, 1);
    assert.equal(plans.wikidata.counts.series_unresolved, 1);
    assert.equal(plans.endoflife.silver.length, 1);
    assert.equal(plans.endoflife.counts.series_unresolved, 2);
    assert.equal(plans.wikidata.promotions.length + plans.endoflife.promotions.length, 0);
  } finally {
    rmSync(data, { recursive: true, force: true });
  }
});

test("the command exits 2 on a manifest mismatch before it touches the database", () => {
  const data = fixture({ [W]: sha("older") });
  try {
    const run = spawnSync(process.execPath, [path.join(__dirname, "..", "node_modules/ts-node/dist/bin.js"), "--compiler-options", '{"module":"commonjs"}', path.join(__dirname, "research-os/evolution/computing-import.ts"), "--apply", W], {
      encoding: "utf8",
      env: { ...process.env, EVOLUTION_DATA: data, NEXT_PUBLIC_SUPABASE_URL: "", SUPABASE_SERVICE_ROLE_KEY: "" },
    });
    assert.equal(run.status, 2, run.stderr);
    assert.match(run.stderr, /manifest mismatch, nothing written: .*software\.jsonl \(sha256\)/);
  } finally {
    rmSync(data, { recursive: true, force: true });
  }
});
