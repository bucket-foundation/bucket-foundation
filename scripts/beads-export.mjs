import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const DROP = new Set(["owner", "created_by", "creator", "actor"]);

export function scrub(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (DROP.has(k)) continue;
    out[k] = typeof v === "string" ? v.replace(EMAIL, "[email]") : v;
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = mkdtempSync(path.join(tmpdir(), "beads-"));
  const raw = path.join(dir, "raw.jsonl");
  execFileSync("bd", ["export", "-o", raw], { stdio: "inherit" });
  const rows = readFileSync(raw, "utf8").split("\n").filter(Boolean).map((l) => JSON.stringify(scrub(JSON.parse(l))));
  writeFileSync(".beads/issues.jsonl", rows.join("\n") + "\n");
  rmSync(dir, { recursive: true, force: true });
  console.log(`exported ${rows.length} beads to .beads/issues.jsonl`);
}
