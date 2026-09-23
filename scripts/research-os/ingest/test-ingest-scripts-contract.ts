import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.join(__dirname, "..", "..", "..");
const OUT = path.join(__dirname, "out");
const GOLDEN = path.join(__dirname, "fixtures", "ingest-scripts-contract.golden.json");
const STUB = path.join(__dirname, "fixtures", "ingest-stubs.ts");
const GENERATED = ["academy-preview.json", "canon-preview.json", "infer-preview.json", "infer-llm-preview.json", "review-list.json"];
const CLEAN_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_URL",
  "LLM_BASE_URL",
  "LLM_MODEL",
  "LLM_API_KEY",
  "LLM_TIMEOUT_S",
  "ANTHROPIC_API_KEY",
];

type Scenario = { name: string; script: string; args?: string[]; env?: Record<string, string>; preserveReviewList?: boolean };

const DB_ENV = { NEXT_PUBLIC_SUPABASE_URL: "http://supabase.test", SUPABASE_SERVICE_ROLE_KEY: "service-key" };

const SCENARIOS: Scenario[] = [
  { name: "academy dry run", script: "academy-import.ts" },
  { name: "academy apply", script: "academy-import.ts", args: ["--apply"], env: DB_ENV },
  { name: "academy apply without medallion", script: "academy-import.ts", args: ["--apply", "--no-medallion"], env: DB_ENV },
  { name: "academy apply without env", script: "academy-import.ts", args: ["--apply"] },
  { name: "academy apply node failure", script: "academy-import.ts", args: ["--apply"], env: { ...DB_ENV, STUB_FAIL: "nodes" } },
  { name: "academy apply edge failure", script: "academy-import.ts", args: ["--apply"], env: { ...DB_ENV, STUB_FAIL: "edges" } },
  { name: "academy apply tier failure", script: "academy-import.ts", args: ["--apply"], env: { ...DB_ENV, STUB_FAIL: "rpc" } },
  { name: "canon dry run", script: "canon-import.ts" },
  { name: "canon apply", script: "canon-import.ts", args: ["--apply"], env: DB_ENV },
  { name: "canon apply without medallion", script: "canon-import.ts", args: ["--apply", "--no-medallion"], env: DB_ENV },
  { name: "canon apply without env", script: "canon-import.ts", args: ["--apply"] },
  { name: "canon apply node failure", script: "canon-import.ts", args: ["--apply"], env: { ...DB_ENV, STUB_FAIL: "nodes" } },
  { name: "infer-edges dry run", script: "infer-edges.ts" },
  { name: "infer-edges merges an existing review list", script: "infer-edges.ts", preserveReviewList: true },
  { name: "infer-edges-llm without provider", script: "infer-edges-llm.ts" },
  { name: "infer-edges-llm with a stubbed local model", script: "infer-edges-llm.ts", env: { LLM_BASE_URL: "http://llm.test", STUB_LLM: "1" } },
];

function normalizedFile(file: string): unknown {
  const p = path.join(OUT, file);
  if (!fs.existsSync(p)) return null;
  const parsed = JSON.parse(fs.readFileSync(p, "utf8")) as Record<string, unknown>;
  delete parsed.generated_at;
  const text = JSON.stringify(parsed);
  return { bytes: text.length, sha: createHash("sha256").update(text).digest("hex").slice(0, 16) };
}

function clean(keepReviewList: boolean): void {
  for (const f of GENERATED) {
    if (keepReviewList && f === "review-list.json") continue;
    fs.rmSync(path.join(OUT, f), { force: true });
  }
}

function run(s: Scenario): unknown {
  clean(false);
  if (s.preserveReviewList) {
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(
      path.join(OUT, "review-list.json"),
      JSON.stringify({ generated_at: "x", items: [{ kind: "note", slug: "kept-item", reason: "pre-existing" }] }) + "\n",
    );
  }
  const log = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ingest-contract-")), "calls.json");
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const k of CLEAN_ENV_KEYS) delete env[k];
  Object.assign(env, s.env ?? {}, { STUB_LOG: log, TS_NODE_BASEURL: "./" });
  const r = spawnSync(
    process.execPath,
    [
      path.join(ROOT, "node_modules/ts-node/dist/bin.js"),
      "-r",
      "tsconfig-paths/register",
      "--compiler-options",
      JSON.stringify({ module: "commonjs", baseUrl: "." }),
      "-r",
      STUB,
      path.join(__dirname, s.script),
      ...(s.args ?? []),
    ],
    { cwd: ROOT, env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  const calls = fs.existsSync(log) ? JSON.parse(fs.readFileSync(log, "utf8")) : null;
  const files = Object.fromEntries(GENERATED.map((f) => [f, normalizedFile(f)]));
  clean(false);
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, calls, files };
}

const RECORDING = process.env.RECORD_GOLDEN === "1";
const recorded: Record<string, unknown> = {};
const golden: Record<string, unknown> = RECORDING ? {} : (JSON.parse(fs.readFileSync(GOLDEN, "utf8")) as Record<string, unknown>);

test("the golden covers every scenario", () => {
  if (RECORDING) return;
  assert.deepEqual(Object.keys(golden).sort(), SCENARIOS.map((s) => s.name).sort());
});

for (const s of SCENARIOS) {
  test(s.name, () => {
    const got = JSON.parse(JSON.stringify(run(s)));
    if (RECORDING) {
      recorded[s.name] = got;
      return;
    }
    assert.deepEqual(got, golden[s.name]);
  });
}

test.after(() => {
  if (!RECORDING) return;
  const lines = Object.keys(recorded).map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(recorded[k])}`);
  fs.writeFileSync(GOLDEN, `{\n${lines.join(",\n")}\n}\n`);
});
