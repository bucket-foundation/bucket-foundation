import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { LABOR_RULES, LABOR_TABLES, UPSTREAM_TABLES, type LaborManifest } from "../../../../src/lib/evolution/labor";

const DIR = path.join(__dirname, "..", "fixtures", "labor");

export function laborFixture(tag: string): { manifest: LaborManifest; files: Map<string, Uint8Array> } {
  const files = new Map<string, Uint8Array>();
  const entries: LaborManifest["files"] = {};
  for (const table of LABOR_TABLES) {
    const bytes = fs.readFileSync(path.join(DIR, `${table}.jsonl`));
    const up = UPSTREAM_TABLES[table];
    const repoPath = `_intake/evolution/${up.source}/fixture-${tag}/jsonl/${table}.jsonl`;
    const rows = bytes.toString("utf8").split("\n").filter((l) => l.trim()).length;
    files.set(repoPath, bytes);
    entries[table] = {
      path: repoPath,
      rows,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      upstream: {
        source: up.source,
        revision: `fixture-${tag}`,
        license_rule: LABOR_RULES[table],
        url: "https://example.org/fixture",
        manifest_sha256: "0".repeat(64),
        table: up.table,
        table_sha256: "1".repeat(64),
        rows,
      },
    };
  }
  return { manifest: { contract: "evolution-labor/1", onet_release: `fixture-${tag}`, eloundou_year: 2023, files: entries }, files };
}
