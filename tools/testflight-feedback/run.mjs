#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { APPS, KINDS, makeJwt, loadState, saveState, normalize, newItems, beadArgs, digest } from "./lib.mjs";

const API = process.env.ASC_API_BASE ?? "https://api.appstoreconnect.apple.com";
const dryRun = process.argv.includes("--dry-run");
const stateDir = process.env.TESTFLIGHT_STATE_DIR ?? path.join(os.homedir(), ".local/state/bucket-testflight-feedback");
const stateFile = path.join(stateDir, "state.json");
const logFile = path.join(stateDir, "completions.jsonl");
const repo = process.env.BUCKET_REPO ?? path.join(os.homedir(), "agfarms/bucket-foundation");

function forbidden(url) {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(repo, ".nucleus/config.json"), "utf8"));
    const host = new URL(url).host;
    return (cfg.forbidden_urls ?? []).some((p) =>
      new RegExp(`^${p.replace(/^https?:\/\//, "").split("/")[0].replace(/[.]/g, "\\.").replace(/\*/g, ".*")}$`).test(host),
    );
  } catch {
    return false;
  }
}

function creds() {
  const keyId = process.env.EXPO_ASC_KEY_ID;
  const issuerId = process.env.EXPO_ASC_ISSUER_ID;
  const keyPath = process.env.EXPO_ASC_API_KEY_PATH;
  if (!keyId || !issuerId || !keyPath) throw new Error("ASC credentials missing; source ~/.derbyfish-secrets/asc-api-key.env");
  return { keyId, issuerId, privateKeyPem: fs.readFileSync(keyPath, "utf8") };
}

async function get(url, token) {
  if (forbidden(url)) throw new Error(`forbidden url ${new URL(url).host}`);
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`ASC ${r.status} on ${new URL(url).pathname}`);
  return r.json();
}

async function getAll(url, token) {
  const out = [];
  let next = url;
  while (next) {
    const page = await get(next, token);
    out.push(...(page.data ?? []));
    next = page.links?.next;
  }
  return out;
}

function appendLog(entry) {
  fs.mkdirSync(stateDir, { recursive: true });
  fs.appendFileSync(logFile, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
}

async function main() {
  const token = makeJwt(creds());
  const apps = await getAll(`${API}/v1/apps?limit=200&fields[apps]=name,bundleId`, token);
  const state = loadState(stateFile);
  const items = [];
  for (const name of APPS) {
    const app = apps.find((a) => a.attributes?.name === name);
    if (!app) {
      console.error(`app not found: ${name}`);
      continue;
    }
    for (const [kind, rel] of Object.entries(KINDS)) {
      const rows = await getAll(`${API}/v1/apps/${app.id}/${rel}?limit=50`, token);
      items.push(...rows.map((r) => normalize(name, kind, r)));
    }
  }
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
