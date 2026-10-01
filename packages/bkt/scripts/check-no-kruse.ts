import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { claimMeta, readInputs } from "../src/pack/canon";
import { buildDenylist, DENIED_NAME, DENIED_PREFIXES, denyRow, marker, withDeniedFiles } from "../src/pack/rights";

const REPO = resolve(import.meta.dir, "../../..");
function files(p: string): string[] {
  const s = statSync(p);
  if (s.isFile()) return [p];
  return readdirSync(p).flatMap((n) => files(join(p, n)));
}

export function kruseMarkers(repo: string = REPO): string[] {
  const inputs = readInputs(repo);
  const paths = [...inputs.evidence.values()].flatMap((ps) => ps.map((p) => p.source_path));
  const deny = withDeniedFiles(repo, buildDenylist(repo), paths);
  const out = new Set<string>([...deny.videoIds, ...DENIED_PREFIXES]);
  const note = (text: string) => {
    const m = marker(text);
    if (m) out.add(m);
  };
  for (const c of inputs.claims) {
    if (denyRow(deny, [c.path, ...claimMeta(c.raw).refs], c.text)) note(c.text.slice(c.title.length + 2));
    for (const p of inputs.evidence.get(`${c.concept}::${c.slug}`) ?? []) {
      const why = denyRow(deny, [p.source_path], p.text);
      if (why && why !== "file") note(p.text);
    }
  }
  return [...out];
}

export function findKruse(targets: string[], markers: string[]): { file: string; marker: string }[] {
  const hits: { file: string; marker: string }[] = [];
  for (const file of targets.flatMap(files)) {
    const body = readFileSync(file).toString("latin1");
    if (DENIED_NAME.test(body)) hits.push({ file, marker: "the denied name" });
    for (const m of markers) {
      const needle = Buffer.from(m, "utf8").toString("latin1");
      const escaped = Buffer.from(JSON.stringify(m).slice(1, -1), "utf8").toString("latin1");
      if (body.includes(needle) || body.includes(escaped)) hits.push({ file, marker: m.slice(0, 60) });
    }
  }
  return hits;
}

if (import.meta.main) {
  const targets = process.argv.slice(2);
  if (!targets.length) {
    console.error("usage: bun packages/bkt/scripts/check-no-kruse.ts <file or dir>...");
    process.exit(2);
  }
  const markers = kruseMarkers();
  const hits = findKruse(targets, markers);
  if (hits.length) {
    for (const h of hits.slice(0, 10)) console.error(`denied material in ${h.file}: ${h.marker}`);
    process.exit(1);
  }
  console.log(`no denied material in ${targets.join(", ")} (${markers.length} markers)`);
}
