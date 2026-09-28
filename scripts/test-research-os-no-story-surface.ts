import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(__dirname, "..");

function grep(pattern: string, paths: string[]): string[] {
  const run = spawnSync("git", ["grep", "-lE", pattern, "--", ...paths], { cwd: ROOT, encoding: "utf8" });
  assert.ok(run.status === 0 || run.status === 1, run.stderr);
  return run.stdout.split("\n").filter(Boolean);
}

test("no source file imports Story, Walrus or the retired wallet stack", () => {
  assert.deepEqual(grep("@story-protocol|lib/story|lib/walrus|@dynamic-labs|wagmi|@tanstack/react-query", ["src", "apps"]), []);
});

test("no source file reads a wallet private key through a public env name", () => {
  assert.deepEqual(grep("NEXT_PUBLIC_[A-Z_]*PRIVATE_KEY", ["src", "apps", "next.config.mjs"]), []);
});

test("no source file reads or writes the five legacy public tables", () => {
  assert.deepEqual(grep("\\.from\\(['\"](author|cite_tokens|ip_metadata|research|research_cite)['\"]\\)", ["src", "apps"]), []);
});

test("package.json carries no Story dependency or script", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  assert.deepEqual(deps.filter((d) => /^@story-protocol\/|^@dynamic-labs\/|^wagmi$|^@tanstack\/react-query$/.test(d)), []);
  const scripts = Object.entries(pkg.scripts as Record<string, string>);
  assert.deepEqual(scripts.filter(([k, v]) => /spg|deriv|mint-and-register/.test(k) || /simpleMint|Spg|registerDerivative/.test(v)), []);
});
