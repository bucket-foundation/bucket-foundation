/**
 * Evidence search end to end on this machine (ros-ai-worker): the real
 * Python worker serving the pinned model over the local corpus's vectors,
 * the server's keyword ranking and fusion, eligibility enforced on both
 * sides, and keyword search still answering once the worker is killed.
 *
 * Needs a built corpus under local/evidence/ and its vectors under
 * local/evidence/vectors/, with the pinned model cached. Without them the
 * tests skip and say so; EVIDENCE_REQUIRE_LIVE=1 makes that a failure.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { LexicalIndex } from "../src/lib/research-os/evidence-search/lexical";
import { evidenceSearch, REQUEST_DEADLINE_MS } from "../src/lib/research-os/evidence-search/search";

const ROOT = path.join(__dirname, "..");
const TOOL = path.join(ROOT, "tools", "evidence-search");
const EVIDENCE = path.join(ROOT, "local", "evidence");

function artifacts(): { corpus: string; vectors: string } | null {
  if (!existsSync(EVIDENCE)) return null;
  for (const rev of readdirSync(EVIDENCE)) {
    const corpus = path.join(EVIDENCE, rev);
    const vectors = path.join(EVIDENCE, "vectors", rev, "minilm-l6-v2");
    if (existsSync(path.join(corpus, "manifest.json")) && existsSync(path.join(vectors, "manifest.json"))) return { corpus, vectors };
  }
  return null;
}

const found = artifacts();
const verified = spawnSync("python3", ["-m", "evidence_search", "verify"], { cwd: TOOL, encoding: "utf8" }).status === 0;
const skip = !found ? "no built corpus with vectors under local/evidence" : !verified ? "the pinned model or runtime does not verify here" : false;
if (process.env.EVIDENCE_REQUIRE_LIVE === "1" && skip) throw new Error(`EVIDENCE_REQUIRE_LIVE=1 and ${skip}`);

interface Rec {
  sourceId: string;
  sourceRevision: string;
  slug: string;
  text: string;
}

test("the real worker, the server's ranking, and a fallback when the worker dies", { skip, timeout: 120_000 }, async () => {
  const records = readFileSync(path.join(found!.corpus, "sources.jsonl"), "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Rec);
  const corpusRevision = (JSON.parse(readFileSync(path.join(found!.corpus, "manifest.json"), "utf8")) as { corpusRevision: string }).corpusRevision;
  const slugOf = new Map(records.map((r) => [r.sourceId, r.slug]));
  const lexical = LexicalIndex.build(records);
  const eligible = records.map((r) => ({ sourceId: r.sourceId, sourceRevision: r.sourceRevision }));
  const secret = randomBytes(24).toString("hex");

  const child: ChildProcess = spawn("python3", ["-m", "evidence_search", "serve", "--vectors", found!.vectors, "--port", "0"], {
    cwd: TOOL,
    env: { ...process.env, EVIDENCE_WORKER_SECRET: secret },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    const port = await new Promise<number>((resolve, reject) => {
      let out = "";
      const timer = setTimeout(() => reject(new Error(`the worker did not start: ${out}`)), 60_000);
      child.stdout!.on("data", (d) => {
        out += d;
        const m = /on 127\.0\.0\.1:(\d+)/.exec(out);
        if (m) {
          clearTimeout(timer);
          resolve(Number(m[1]));
        }
      });
      child.on("exit", (code) => reject(new Error(`the worker exited with ${code}: ${out}`)));
    });
    const worker = { url: `http://127.0.0.1:${port}`, secret };
    const relevant = new Set(["why-the-sky-is-blue", "sky-is-blue-not-violet"]);
    const query = "what makes the heavens look azure during daytime";

    const started = Date.now();
    const hybrid = await evidenceSearch({ requestId: "live-1", query, corpusRevision, eligible, limit: 5, lexical, worker });
    const ms = Date.now() - started;
    assert.equal(hybrid.mode, "hybrid", hybrid.worker.failure ?? "");
    assert.equal(hybrid.status, "ok");
    assert.ok(ms < REQUEST_DEADLINE_MS, `${ms} ms`);
    const top = hybrid.results.map((r) => slugOf.get(r.sourceId));
    assert.ok(top.some((s) => relevant.has(s!)), `top five: ${top.join(", ")}`);
    const keywordOnly = lexical.search(query, new Set(eligible.map((e) => `${e.sourceId}\u0000${e.sourceRevision}`)), 5).results.map((r) => slugOf.get(r.sourceId));
    assert.ok(!keywordOnly.some((s) => relevant.has(s!)), `keyword search alone found a relevant source: ${keywordOnly.join(", ")}`);

    const without = eligible.filter((e) => !relevant.has(slugOf.get(e.sourceId)!));
    const masked = await evidenceSearch({ requestId: "live-2", query, corpusRevision, eligible: without, limit: 5, lexical, worker });
    assert.equal(masked.mode, "hybrid");
    assert.ok(!masked.results.some((r) => relevant.has(slugOf.get(r.sourceId)!)), "an ineligible source came back");

    child.kill("SIGTERM");
    await new Promise((r) => child.once("exit", r));
    const after = await evidenceSearch({ requestId: "live-3", query: "blue sky scattering", corpusRevision, eligible, limit: 5, lexical, worker });
    assert.deepEqual([after.mode, after.status], ["lexical", "degraded"]);
    assert.match(after.worker.failure ?? "", /^unreachable/);
    assert.ok(after.results.length > 0, "keyword search answers without the worker");
  } finally {
    if (child.exitCode === null) child.kill("SIGKILL");
  }
});
