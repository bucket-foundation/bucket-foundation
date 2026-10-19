import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { recordGlyph } from "../../src/lib/research-os/solvability-record-render";
import { neighbourPositions, recordFor, type PackedRecords } from "../../src/lib/research-os/solvability-records";

const root = resolve(import.meta.dir, "../..");
const problem = process.env.BKT_GEN_PROBLEM ?? "navier";
const out = process.env.BKT_GEN_OUT ?? process.cwd();
const data = JSON.parse(readFileSync(join(root, "src/lib/research-os/solvability-records-data.json"), "utf8")) as PackedRecords;
const rec = recordFor(data, problem);
if (!rec) {
  console.error(`no record for ${problem}`);
  process.exit(2);
}
writeFileSync(join(out, `${problem}-glyph.svg`), recordGlyph(rec, neighbourPositions(data, rec)));
