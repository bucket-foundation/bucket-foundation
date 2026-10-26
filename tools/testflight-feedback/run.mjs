#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { loadState, saveState, parseRecords, newItems, beadArgs, digest } from "./lib.mjs";

const dryRun = process.argv.includes("--dry-run");
const stateDir = process.env.TESTFLIGHT_STATE_DIR ?? path.join(os.homedir(), ".local/state/bucket-testflight-feedback");
const stateFile = path.join(stateDir, "state.json");
const logFile = path.join(stateDir, "completions.jsonl");
const repo = process.env.BUCKET_REPO ?? path.join(os.homedir(), "agfarms/bucket-foundation");

function fetchItems() {
  const r = spawnSync("python3", [new URL("../../apple/AppStore/beta_feedback.py", import.meta.url).pathname, "--json"], { encoding: "utf8", maxBuffer: 64 << 20 });
  if (r.status !== 0) throw new Error(`beta_feedback.py exited ${r.status}: ${(r.stderr ?? "").slice(-300)}`);
  return parseRecords(r.stdout);
}

function appendLog(entry) {
  fs.mkdirSync(stateDir, { recursive: true });
  fs.appendFileSync(logFile, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
}

async function main() {
  const state = loadState(stateFile);
  const items = fetchItems();
  const fresh = newItems(items, state);
  const entries = [];
  for (const item of fresh) {
    if (dryRun) {
      entries.push({ item, beadId: null });
      continue;
    }
    const beadId = execFileSync("bd", beadArgs(item), { cwd: repo, encoding: "utf8" }).trim();
    state.seen[item.id] = { beadId, at: new Date().toISOString() };
    saveState(stateFile, state);
    entries.push({ item, beadId });
  }
  const text = digest(entries);
  if (dryRun) {
    console.log(`dry-run: ${items.length} item(s) fetched, ${fresh.length} new`);
    if (text) console.log(text);
    return;
  }
  if (text) {
    const tg = spawnSync("agf-tg", ["send", "-"], { input: text, encoding: "utf8" });
    if (tg.status !== 0) console.error("agf-tg send failed");
  }
  appendLog({ status: "ok", fetched: items.length, created: entries.map((e) => e.beadId) });
  console.log(`fetched ${items.length}, created ${entries.length}`);
}

main().catch((e) => {
  if (!dryRun) appendLog({ status: "error", error: String(e.message) });
  console.error(e.message);
  process.exit(1);
});
