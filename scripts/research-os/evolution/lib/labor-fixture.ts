import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { LABOR_TABLES, type LaborManifest, type LaborTable } from "../../../../src/lib/evolution/labor";

const DIR = path.join(__dirname, "..", "fixtures", "labor");
const SOURCE: Record<LaborTable, string> = { occupations: "onet", tasks: "onet", tech_skills: "onet", eloundou: "eloundou", oews: "bls-oews" };

export function laborFixture(tag: string): { manifest: LaborManifest; files: Map<string, Uint8Array> } {
  const files = new Map<string, Uint8Array>();
  const entries: LaborManifest["files"] = {};
  for (const table of LABOR_TABLES) {
    const body = fs.readFileSync(path.join(DIR, `${table}.jsonl`), "utf8");
    const bytes = Buffer.from(body, "utf8");
    const repoPath = `_intake/evolution/${SOURCE[table]}/fixture-${tag}/${table}.jsonl`;
    files.set(repoPath, bytes);
    entries[table] = { path: repoPath, rows: body.split("\n").filter((l) => l.trim()).length, sha256: createHash("sha256").update(bytes).digest("hex") };
  }
  return { manifest: { contract: "evolution-labor/1", onet_release: `fixture-${tag}`, eloundou_year: 2023, files: entries }, files };
}
