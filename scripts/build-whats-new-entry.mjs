#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, basename } from "node:path";
import { pathToFileURL } from "node:url";
import { filterEntries, leakOptions } from "./whats-new-leak-filter.mjs";

export const DATA_PATH = "data/whats-new.json";
export const REPO_SLUG = "bucket-foundation/bucket-foundation";
const BATCH_HEADS = new Set(["dev", "hte/integration", "ops/integration"]);
const BOT_AUTHOR = /\[bot\]|bucket-bot|github-actions|dependabot/i;
const SKIP_SUBJECT = /\[skip ci\]|^(?:bd|feed|whats-new|backup)\b[:(]|^(?:ops|gate|measure)(?:\([^)]*\))?!?:|^\w+\((?:ops|beads?|bd|backup)\)!?:|beads? backup/i;
const TYPE_WORD = {
  feat: "New",
  fix: "Fix",
  perf: "Faster",
  refactor: "Refactor",
  docs: "Docs",
  test: "Tests",
  build: "Build",
  ci: "CI",
  chore: "Upkeep",
  style: "Style",
  revert: "Revert",
  release: "Release",
  batch: "Batch",
};

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

export function canonEntries(lines, sha, date) {
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
        id: `${sha}-${branchDir}-opened`,
        date: date,
        category: "branch-opened",
        branch: branchDir,
        title: `${branchDir.slice(3).replace(/-/g, " ")} branch opened`,
        summary: `Branch root README committed.`,
        commit: sha,
      });
    }

    if (status === "A" && parts[2] === "_intake" && parts.length >= 4) {
      const key = `${branchDir}-intake-${parts[3]}`;
      if (!seenBranchEntry.has(key)) {
        seenBranchEntry.add(key);
        newEntries.push({
          id: `${sha}-${key}`,
          date: date,
          category: "intake-research",
          branch: branchDir,
          title: `Intake memo: ${basename(parts[3], ".md")}`,
          summary: `New file under ${branchDir}/_intake/.`,
          commit: sha,
        });
      }
    }

    if (status === "A" && parts[2] === "_landscape" && parts.length >= 4) {
      const key = `${branchDir}-landscape-${parts[3]}`;
      if (!seenBranchEntry.has(key)) {
        seenBranchEntry.add(key);
        newEntries.push({
          id: `${sha}-${key}`,
          date: date,
          category: "landscape-added",
          branch: branchDir,
          title: `Landscape entry: ${basename(parts[3], ".md")}`,
          summary: `New file under ${branchDir}/_landscape/.`,
          commit: sha,
        });
      }
    }

    if ((status === "M" || status === "A") && file.endsWith("CANON_INDEX.md")) {
      const key = `${file}-promoted`;
      if (!seenBranchEntry.has(key)) {
        seenBranchEntry.add(key);
        newEntries.push({
          id: `${sha}-${branchDir}-${parts[2] || "root"}-promoted`,
          date: date,
          category: "entry-promoted",
          branch: branchDir,
          title: `${branchDir.slice(3).replace(/-/g, " ")} · ${parts[2] === "CANON_INDEX.md" ? "master" : parts[2]} index updated`,
          summary: `CANON_INDEX.md modified, see the commit for new rows.`,
          commit: sha,
        });
      }
    }

    if (status === "A" && parts[2] === "sub-claims" && parts.length >= 5 && file.endsWith(".md") && parts[parts.length-1] !== "INDEX.md") {
      const key = `${branchDir}-${parts[3]}-claims-batch`;
      if (!seenBranchEntry.has(key)) {
        seenBranchEntry.add(key);
        newEntries.push({
          id: `${sha}-${key}`,
          date: date,
          category: "claim-added",
          branch: branchDir,
          title: `${branchDir.slice(3).replace(/-/g, " ")} · new ${parts[3].replace(/-/g, " ")} claim card${lines.filter(l => l.includes(`sub-claims/${parts[3]}/`) && l.startsWith("A")).length > 1 ? "s" : ""}`,
          summary: `Claim card(s) committed under ${branchDir}/sub-claims/${parts[3]}/.`,
          commit: sha,
        });
      }
    }

    if (status === "A" && parts[2] === "_bridges" && parts[3] === "detected" && parts.length >= 5) {
      const bridgeSlug = parts[4];
      const key = `bridge-${bridgeSlug}`;
      if (!seenBranchEntry.has(key)) {
        seenBranchEntry.add(key);
        newEntries.push({
          id: `${sha}-${key}`,
          date: date,
          category: "bridge-discovered",
          branch: null,
          title: `Multi-branch primitive: ${bridgeSlug.replace(/^\d+-/, "").replace(/-/g, " ")}`,
          summary: `Algorithm-detected cross-branch isomorphism committed.`,
          commit: sha,
        });
      }
    }

    if (status === "A" && parts[2] === "_bridges" && parts[3] !== "detected" && parts.length === 4 && file.endsWith(".md")) {
      const bridgeSlug = basename(parts[3], ".md");
      if (bridgeSlug !== "INDEX" && bridgeSlug !== "DETECTED-INDEX") {
        newEntries.push({
          id: `${sha}-bridge-${bridgeSlug}`,
          date: date,
          category: "bridge-added",
          branch: null,
          title: `Bridge added: ${bridgeSlug.replace(/-/g, " ")}`,
          summary: `Curated cross-branch bridge committed.`,
          commit: sha,
        });
      }
    }
  }
  return newEntries;
}

export function isSkipped({ subject, author, headRef }) {
  if (author && BOT_AUTHOR.test(author)) return true;
  if (subject && SKIP_SUBJECT.test(subject)) return true;
  if (headRef && /^(?:ops|gate|measure)\//.test(headRef)) return true;
  return false;
}

export function parsePrCommit({ sha, subject, body = "", date, author }) {
  const merge = /^Merge pull request #(\d+) from [^/\s]+\/(\S+)/.exec(subject);
  if (merge) {
    const headRef = merge[2];
    if (BATCH_HEADS.has(headRef)) return null;
    const title = body.split("\n").map((l) => l.trim()).find(Boolean) ?? headRef;
    return { number: Number(merge[1]), title, sha, date, author, headRef };
  }
  const squash = /^(.*\S)\s*\(#(\d+)\)\s*$/.exec(subject);
  if (squash) return { number: Number(squash[2]), title: squash[1], sha, date, author, headRef: null };
  return null;
}

export function summarizeTitle(title) {
  const m = /^(\w+)(?:\(([^)]+)\))?!?:\s*(.+)$/.exec(title.trim());
  if (!m) {
    const t = title.trim();
    return { headline: t, summary: t.endsWith(".") ? t : `${t}.` };
  }
  const [, type, scope, desc] = m;
  const word = TYPE_WORD[type.toLowerCase()] ?? "Change";
  const headline = desc.charAt(0).toUpperCase() + desc.slice(1);
  const summary = `${word}${scope ? ` in ${scope}` : ""}: ${desc}${desc.endsWith(".") ? "" : "."}`;
  return { headline, summary };
}

export function prEntry(pr) {
  const { headline, summary } = summarizeTitle(pr.title);
  return {
    id: `pr-${pr.number}`,
    date: pr.date.slice(0, 10),
    category: "pr-merged",
    branch: null,
    title: headline.slice(0, 140),
    summary: summary.slice(0, 280),
    commit: pr.sha.slice(0, 7),
    pr: pr.number,
    url: `https://github.com/${REPO_SLUG}/pull/${pr.number}`,
  };
}

export function prsFromCommits(commits) {
  const seen = new Set();
  const prs = [];
  for (const c of commits) {
    if (isSkipped(c)) continue;
    const pr = parsePrCommit(c);
    if (!pr || seen.has(pr.number)) continue;
    seen.add(pr.number);
    prs.push(pr);
  }
  return prs;
}

function commitsInRange(from, to) {
  const out = git(["log", "--format=%H%x1f%s%x1f%b%x1f%aI%x1f%an%x1e", `${from}..${to}`]);
  return out
    .split("\x1e")
    .map((r) => r.replace(/^\n/, ""))
    .filter(Boolean)
    .map((r) => {
      const [sha, subject, body, date, author] = r.split("\x1f");
      return { sha, subject, body, date, author };
    });
}

function enrichFromGh(pr) {
  if (!process.env.GH_TOKEN && !process.env.GITHUB_TOKEN) return pr;
  try {
    const raw = execFileSync(
      "gh",
      ["pr", "view", String(pr.number), "--repo", REPO_SLUG, "--json", "title,mergedAt,author,headRefName,state"],
      { encoding: "utf8", env: { ...process.env, GH_TOKEN: process.env.GH_TOKEN || process.env.GITHUB_TOKEN } },
    );
    const info = JSON.parse(raw);
    if (info.state !== "MERGED") return null;
    return {
      ...pr,
      title: info.title || pr.title,
      date: info.mergedAt || pr.date,
      author: info.author?.login ?? pr.author,
      headRef: info.headRefName ?? pr.headRef,
    };
  } catch (e) {
    console.warn(`gh pr view ${pr.number} failed, using the commit subject: ${e instanceof Error ? e.message.split("\n")[0] : e}`);
    return pr;
  }
}

export function mergeEntries(data, newEntries, options = leakOptions()) {
  const { kept, dropped } = filterEntries(newEntries, options);
  const existing = new Set(data.entries.map((e) => e.id));
  let added = 0;
  for (const e of kept) {
    if (!existing.has(e.id)) {
      data.entries.push(e);
      existing.add(e.id);
      added++;
    }
  }
  data.entries.sort((a, b) => b.date.localeCompare(a.date));
  return { data, added, dropped };
}

function main() {
  const from = process.env.FROM_SHA || git(["rev-parse", "HEAD^"]);
  const to = process.env.TO_SHA || git(["rev-parse", "HEAD"]);
  const toSubject = git(["show", "-s", "--format=%s", to]);
  if (/\[skip ci\]/.test(toSubject) || /^(?:feed|whats-new):/.test(toSubject)) {
    console.log("Skipping bot commit");
    return;
  }

  let diffLines = [];
  try {
    diffLines = git(["diff", "--name-status", from, to]).split("\n").filter(Boolean);
  } catch {
    console.log("No diff range; nothing to do.");
    return;
  }
  const sha = to.slice(0, 7);
  const date = git(["show", "-s", "--format=%aI", to]).slice(0, 10);
  const entries = canonEntries(diffLines, sha, date);

  const prs = prsFromCommits(commitsInRange(from, to))
    .map(enrichFromGh)
    .filter((pr) => pr && !isSkipped({ subject: pr.title, author: pr.author, headRef: pr.headRef }));
  entries.push(...prs.map(prEntry));

  if (entries.length === 0) {
    console.log("No merged PRs or canon changes; nothing to append.");
    return;
  }

  if (!existsSync(dirname(DATA_PATH))) mkdirSync(dirname(DATA_PATH), { recursive: true });
  let data = { version: "0.1", entries: [] };
  if (existsSync(DATA_PATH)) data = JSON.parse(readFileSync(DATA_PATH, "utf8"));
  const { added, dropped } = mergeEntries(data, entries);
  for (const d of dropped) {
    console.log(`Leak filter dropped ${d.entry.id}: ${d.hits.map((h) => `${h.kind} in ${h.field}`).join(", ")}`);
  }
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + "\n");
  console.log(`Appended ${added} entries to ${DATA_PATH}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
