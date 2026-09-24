import { planEvolution } from "../../../src/lib/evolution/importer";
import { checkManifest, laborEdges, laborRecords, laborSources, type LaborManifest } from "../../../src/lib/evolution/labor";
import { graphClient } from "../ingest/lib/medallion-shadow";
import { loadPolicy, repoIO } from "../medallion/lib/repo-io";
import { readGraph } from "./lib/apply";
import { runLabor } from "./lib/labor-run";

const LABEL = "evolution-labor";

async function main() {
  const manifestPath = process.argv.find((a) => a.endsWith("labor-manifest.json"));
  if (!manifestPath) throw new Error("pass the path of an _intake/evolution/onet/<release>/labor-manifest.json");
  const apply = process.argv.includes("--apply");
  const raw = repoIO.readFile(manifestPath);
  if (!raw) throw new Error(`${manifestPath} is missing`);
  const manifest = JSON.parse(Buffer.from(raw).toString("utf8")) as LaborManifest;
  const files = new Map<string, Uint8Array>();
  for (const f of Object.values(manifest.files)) {
    const bytes = f && repoIO.readFile(f.path);
    if (!f || !bytes) throw new Error(`${f?.path ?? "a manifest file"} is missing`);
    files.set(f.path, bytes);
  }
  const check = checkManifest(manifest, files, true);
  if (!check.ok) throw new Error(`labor manifest refused: ${check.problems.join("; ")}`);
  const { policy, sha256 } = loadPolicy();
  const svc = graphClient(LABEL);
  if (!apply) {
    const graph = await readGraph(svc);
    const plan = planEvolution({
      sources: laborSources(manifest),
      files,
      policy,
      nodes: graph.nodes,
      edges: graph.edges,
      records: laborRecords(manifest),
      edgeCandidates: laborEdges(manifest),
    });
    console.log(JSON.stringify(plan.counts, null, 2));
    console.log(`[${LABEL}] dry run, nothing written. Pass --apply to write.`);
    return;
  }
  const reports = await runLabor(svc, { manifest, files, policy, policyMeta: { sha256, status: policy.status }, requirePlanCounts: true });
  console.log(JSON.stringify(reports.map((r) => r.written), null, 2));
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`[${LABEL}] FAILED:`, err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
