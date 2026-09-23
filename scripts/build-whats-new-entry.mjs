#!/usr/bin/env node

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, basename } from "node:path";

const DATA_PATH = "data/whats-new.json";
const FROM = process.env.FROM_SHA || execSync("git rev-parse HEAD^").toString().trim();
const TO   = process.env.TO_SHA   || execSync("git rev-parse HEAD").toString().trim();
const COMMIT_SHA = TO.slice(0, 7);
const COMMIT_DATE = execSync(`git show -s --format=%aI ${TO}`).toString().trim().slice(0, 10);
const COMMIT_MSG  = execSync(`git show -s --format=%s ${TO}`).toString().trim();

if (COMMIT_MSG.includes("[skip ci]") || COMMIT_MSG.startsWith("feed:") || COMMIT_MSG.startsWith("whats-new:")) {
  console.log("Skipping bot commit");
  process.exit(0);
}

let diff = "";
try {
  diff = execSync(`git diff --name-status ${FROM} ${TO}`).toString();
} catch {
  console.log("No diff range; nothing to do.");
  process.exit(0);
}

const lines = diff.split("\n").filter(Boolean);
const newEntries = [];
const branchOpened = new Set();
const seenBranchEntry = new Set();

for (const ln of lines) {
  const [status, ...rest] = ln.split("\t");
  const file = rest[rest.length - 1];
  if (!file?.startsWith("bucket-canon/")) continue;
  const parts = file.split("/");
  if (parts.length < 2) continue;
  const branchDir = parts[1];
  if (!/^\d{2}-/.test(branchDir)) continue;

  if (status === "A" && parts[2] === "README.md" && parts.length === 3 && !branchOpened.has(branchDir)) {
    branchOpened.add(branchDir);
    newEntries.push({
      id: `${COMMIT_SHA}-${branchDir}-opened`,
      date: COMMIT_DATE,
      category: "branch-opened",
      branch: branchDir,
      title: `${branchDir.slice(3).replace(/-/g, " ")} branch opened`,
      summary: `Branch root README committed.`,
      commit: COMMIT_SHA,
    });
  }

  if (status === "A" && parts[2] === "_intake" && parts.length >= 4) {
    const key = `${branchDir}-intake-${parts[3]}`;
    if (!seenBranchEntry.has(key)) {
      seenBranchEntry.add(key);
      newEntries.push({
        id: `${COMMIT_SHA}-${key}`,
        date: COMMIT_DATE,
        category: "intake-research",
        branch: branchDir,
        title: `Intake memo: ${basename(parts[3], ".md")}`,
        summary: `New file under ${branchDir}/_intake/.`,
        commit: COMMIT_SHA,
      });
    }
  }

  if (status === "A" && parts[2] === "_landscape" && parts.length >= 4) {
    const key = `${branchDir}-landscape-${parts[3]}`;
    if (!seenBranchEntry.has(key)) {
      seenBranchEntry.add(key);
      newEntries.push({
        id: `${COMMIT_SHA}-${key}`,
        date: COMMIT_DATE,
        category: "landscape-added",
        branch: branchDir,
        title: `Landscape entry: ${basename(parts[3], ".md")}`,
        summary: `New file under ${branchDir}/_landscape/.`,
        commit: COMMIT_SHA,
      });
    }
  }

  if ((status === "M" || status === "A") && file.endsWith("CANON_INDEX.md")) {
    const key = `${file}-promoted`;
    if (!seenBranchEntry.has(key)) {
      seenBranchEntry.add(key);
      newEntries.push({
        id: `${COMMIT_SHA}-${branchDir}-${parts[2] || "root"}-promoted`,
        date: COMMIT_DATE,
        category: "entry-promoted",
        branch: branchDir,
        title: `${branchDir.slice(3).replace(/-/g, " ")} · ${parts[2] === "CANON_INDEX.md" ? "master" : parts[2]} index updated`,
        summary: `CANON_INDEX.md modified — see commit for new rows.`,
        commit: COMMIT_SHA,
      });
    }
  }

  if (status === "A" && parts[2] === "sub-claims" && parts.length >= 5 && file.endsWith(".md") && parts[parts.length-1] !== "INDEX.md") {
    const key = `${branchDir}-${parts[3]}-claims-batch`;
    if (!seenBranchEntry.has(key)) {
      seenBranchEntry.add(key);
      newEntries.push({
        id: `${COMMIT_SHA}-${key}`,
        date: COMMIT_DATE,
        category: "claim-added",
        branch: branchDir,
        title: `${branchDir.slice(3).replace(/-/g, " ")} · new ${parts[3].replace(/-/g, " ")} claim card${lines.filter(l => l.includes(`sub-claims/${parts[3]}/`) && l.startsWith("A")).length > 1 ? "s" : ""}`,
        summary: `Claim card(s) committed under ${branchDir}/sub-claims/${parts[3]}/.`,
        commit: COMMIT_SHA,
      });
    }
  }

  if (status === "A" && parts[2] === "_bridges" && parts[3] === "detected" && parts.length >= 5) {
    const bridgeSlug = parts[4];
    const key = `bridge-${bridgeSlug}`;
    if (!seenBranchEntry.has(key)) {
      seenBranchEntry.add(key);
      newEntries.push({
        id: `${COMMIT_SHA}-${key}`,
        date: COMMIT_DATE,
        category: "bridge-discovered",
        branch: null,
        title: `Multi-branch primitive: ${bridgeSlug.replace(/^\d+-/, "").replace(/-/g, " ")}`,
        summary: `Algorithm-detected cross-branch isomorphism committed.`,
        commit: COMMIT_SHA,
      });
    }
  }

  if (status === "A" && parts[2] === "_bridges" && parts[3] !== "detected" && parts.length === 4 && file.endsWith(".md")) {
    const bridgeSlug = basename(parts[3], ".md");
    if (bridgeSlug !== "INDEX" && bridgeSlug !== "DETECTED-INDEX") {
      newEntries.push({
        id: `${COMMIT_SHA}-bridge-${bridgeSlug}`,
        date: COMMIT_DATE,
        category: "bridge-added",
        branch: null,
        title: `Bridge added: ${bridgeSlug.replace(/-/g, " ")}`,
        summary: `Curated cross-branch bridge committed.`,
        commit: COMMIT_SHA,
      });
    }
  }
}

if (newEntries.length === 0) {
  const m = COMMIT_MSG.match(/^(web|ux|globe|mcp|canon|nav|fix|site refactor)(?:\([^)]+\))?:\s*(.+)$/i);
  if (m) {
    newEntries.push({
      id: `${COMMIT_SHA}-site`,
      date: COMMIT_DATE,
      category: "site-feature",
      branch: null,
      title: m[2].slice(0, 100),
      summary: COMMIT_MSG.slice(0, 240),
      commit: COMMIT_SHA,
    });
  }
}

if (newEntries.length === 0) {
  console.log("No canon-relevant changes; nothing to append.");
  process.exit(0);
}

if (!existsSync(dirname(DATA_PATH))) mkdirSync(dirname(DATA_PATH), { recursive: true });
let data = { version: "0.1", entries: [] };
if (existsSync(DATA_PATH)) {
  try { data = JSON.parse(readFileSync(DATA_PATH, "utf8")); } catch {}
}
const existing = new Set(data.entries.map((e) => e.id));
let added = 0;
for (const e of newEntries) {
  if (!existing.has(e.id)) { data.entries.push(e); added++; }
}
data.entries.sort((a, b) => b.date.localeCompare(a.date));
writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + "\n");
console.log(`Appended ${added} entries to ${DATA_PATH}`);
