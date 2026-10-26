import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const APP_NAMES = { bucket: "Bucket Foundation", polingual: "Polingual" };

export function loadState(file) {
  try {
    const s = JSON.parse(fs.readFileSync(file, "utf8"));
    return { seen: s.seen ?? {} };
  } catch {
    return { seen: {} };
  }
}

export function saveState(file, state) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, file);
}

export function parseRecords(stdout) {
  return stdout
    .split("\n")
    .filter((l) => l.trim().startsWith("{"))
    .map((l) => normalize(JSON.parse(l)));
}

export function normalize(rec) {
  const a = rec.attributes ?? {};
  return {
    id: rec.id,
    app: APP_NAMES[rec.app] ?? rec.app,
    kind: rec.kind,
    createdDate: a.createdDate ?? "",
    comment: (a.comment ?? "").trim(),
    email: a.email ?? "",
    device: [a.deviceModel, a.osVersion].filter(Boolean).join(" iOS "),
    build: a.buildBundleId ?? "",
    screenshots: (a.screenshots ?? []).map((s) => s.url).filter(Boolean),
  };
}

export function filedIds(beads) {
  const out = new Set();
  for (const b of beads ?? []) {
    const m = /^asc-(.+)$/.exec(b.external_ref ?? "");
    if (m) out.add(m[1]);
  }
  return out;
}

export function newItems(items, state, filed = new Set()) {
  const fresh = [];
  const ids = new Set();
  for (const it of items) {
    if (state.seen[it.id] || filed.has(it.id) || ids.has(it.id)) continue;
    ids.add(it.id);
    fresh.push(it);
  }
  return fresh.sort((x, y) => x.createdDate.localeCompare(y.createdDate));
}

function oneLine(s, n) {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

export function beadTitle(it) {
  const label = it.kind === "crash" ? "crash" : "feedback";
  const text = oneLine(scrub(it.comment), 70) || "no comment";
  return `TestFlight ${label}, ${it.app}: ${text}`;
}

export function testerHash(email) {
  if (!email) return "unknown";
  return `t-${crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 8)}`;
}

const EMAIL = /[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}/gi;
const URLS = /https?:\/\/\S+/gi;

export function scrub(text) {
  return text.replace(EMAIL, "[email]").replace(URLS, "[link]");
}

export function beadDescription(it) {
  const lines = [
    `App: ${it.app}`,
    `Kind: ${it.kind}`,
    `ASC feedback id: ${it.id}`,
    `Submitted: ${it.createdDate}`,
    `Device: ${it.device || "unknown"}`,
    `Tester: ${testerHash(it.email)}`,
    "",
    scrub(it.comment) || "(no comment)",
  ];
  if (it.screenshots.length) lines.push("", `${it.screenshots.length} screenshot(s) in App Store Connect, feedback id ${it.id}.`);
  if (it.kind === "crash") lines.push("", `Crash log: GET /v1/betaFeedbackCrashSubmissions/${it.id}/crashLog`);
  return lines.join("\n");
}

export function beadArgs(it) {
  return [
    "--allow-stale",
    "create",
    `--title=${beadTitle(it)}`,
    `--description=${beadDescription(it)}`,
    `--type=${it.kind === "crash" ? "bug" : "task"}`,
    `--priority=${it.kind === "crash" ? 1 : 2}`,
    "--labels=source-tester",
    `--external-ref=asc-${it.id}`,
    "--silent",
  ];
}

export function digestLine(it, beadId) {
  const tag = it.kind === "crash" ? "crash" : "feedback";
  const shots = it.screenshots.length ? `, ${it.screenshots.length} screenshot(s)` : "";
  return `${beadId ?? "dry-run"} ${it.app} ${tag}${shots}: ${oneLine(scrub(it.comment), 100) || "no comment"}`;
}

export function logItem(it, beadId) {
  return { beadId, id: it.id, app: it.app, kind: it.kind, comment: oneLine(scrub(it.comment), 100), screenshots: it.screenshots.length };
}

export function readLog(file) {
  try {
    return fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

export function dailyDigest(log, now = Date.now()) {
  const since = now - 24 * 3600 * 1000;
  const lastSent = Math.max(0, ...log.filter((e) => e.status === "digest").map((e) => Date.parse(e.at)));
  const from = Math.max(since, lastSent);
  const runs = log.filter((e) => Date.parse(e.at) > from && e.status !== "digest");
  const items = runs.flatMap((e) => e.items ?? []);
  const errors = runs.filter((e) => e.status === "error" || e.status === "partial").length;
  const head = `TestFlight daily: ${items.length} new item(s), ${runs.length - errors} run(s) ok, ${errors} failed`;
  const lines = items.map((i) => `${i.beadId} ${i.app} ${i.kind === "crash" ? "crash" : "feedback"}${i.screenshots ? `, ${i.screenshots} screenshot(s)` : ""}: ${i.comment || "no comment"}`);
  return { text: [head, ...lines].join("\n"), items: items.length, runs: runs.length, errors };
}

export function digest(entries) {
  if (!entries.length) return "";
  return [`TestFlight: ${entries.length} new item(s)`, ...entries.map((e) => digestLine(e.item, e.beadId))].join("\n");
}
