import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO = resolve(import.meta.dir, "../../..");
const STAFF = ["solvability-atlas-data.json", "software-atlas-data.json", "patents-design-data.json"].map((f) => join(REPO, "src/lib/research-os", f));
const CODE = [join(REPO, "src/components/research-os/views"), join(REPO, "src/components/ui"), join(REPO, "packages/bkt-ui/src")];

function strings(v: unknown, out: string[]) {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => strings(x, out));
}

function files(p: string): string[] {
  const s = statSync(p);
  if (s.isFile()) return [p];
  return readdirSync(p).flatMap((n) => files(join(p, n)));
}

export function staffMarkers(perFile = 12): string[] {
  const code = CODE.flatMap(files)
    .map((f) => readFileSync(f, "utf8"))
    .join("\n");
  const out: string[] = [];
  for (const f of STAFF) {
    const all: string[] = [];
    strings(JSON.parse(readFileSync(f, "utf8")), all);
    const picked = [...new Set(all)].filter((s) => s.length >= 25 && s.length <= 160 && s.includes(" ") && !code.includes(s)).slice(0, perFile);
    if (picked.length < 3) throw new Error(`too few markers in ${f}`);
    out.push(...picked);
  }
  return out;
}

export function findStaff(targets: string[], markers = staffMarkers()): { file: string; marker: string }[] {
  const hits: { file: string; marker: string }[] = [];
  for (const file of targets.flatMap(files)) {
    const body = readFileSync(file).toString("latin1");
    for (const m of markers) {
      const needle = Buffer.from(m, "utf8").toString("latin1");
      if (body.includes(needle) || body.includes(JSON.stringify(m).slice(1, -1))) hits.push({ file, marker: m.slice(0, 60) });
    }
  }
  return hits;
}

if (import.meta.main) {
  const targets = process.argv.slice(2);
  if (!targets.length) {
    console.error("usage: bun packages/bkt/scripts/check-no-staff.ts <file or dir>...");
    process.exit(2);
  }
  const hits = findStaff(targets);
  if (hits.length) {
    for (const h of hits.slice(0, 10)) console.error(`staff data in ${h.file}: ${h.marker}`);
    process.exit(1);
  }
  console.log(`no staff atlas data in ${targets.join(", ")}`);
}
