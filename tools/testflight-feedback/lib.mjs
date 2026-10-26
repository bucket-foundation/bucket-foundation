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

export function newItems(items, state) {
  const fresh = [];
  const ids = new Set();
  for (const it of items) {
    if (state.seen[it.id] || ids.has(it.id)) continue;
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
  const text = oneLine(it.comment, 70) || "no comment";
  return `TestFlight ${label}, ${it.app}: ${text}`;
}

export function beadDescription(it) {
  const lines = [
    `App: ${it.app}`,
    `Kind: ${it.kind}`,
    `ASC feedback id: ${it.id}`,
    `Submitted: ${it.createdDate}`,
    `Device: ${it.device || "unknown"}`,
    `Tester: ${it.email || "unknown"}`,
    "",
    it.comment || "(no comment)",
  ];
  if (it.screenshots.length) {
    lines.push("", "Screenshots, signed URLs that expire:");
    for (const u of it.screenshots) lines.push(`- ${u}`);
  }
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
  return `${beadId ?? "dry-run"} ${it.app} ${tag}${shots}: ${oneLine(it.comment, 100) || "no comment"}`;
}

export function digest(entries) {
  if (!entries.length) return "";
  return [`TestFlight: ${entries.length} new item(s)`, ...entries.map((e) => digestLine(e.item, e.beadId))].join("\n");
}
