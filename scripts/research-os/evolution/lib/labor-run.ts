import type { SupabaseClient } from "@supabase/supabase-js";
import type { RightsPolicy } from "../../../../src/lib/research-os/evidence/rights";
import { planEvolution } from "../../../../src/lib/evolution/importer";
import { checkManifest, laborEdges, laborRecords, laborSeries, laborSources, socIndex, type LaborManifest } from "../../../../src/lib/evolution/labor";
import { applyEvolution, readGraph, type EvolutionReport } from "./apply";

export async function runLabor(
  svc: SupabaseClient,
  input: { manifest: LaborManifest; files: Map<string, Uint8Array>; policy: RightsPolicy; policyMeta: { sha256: string; status: string }; requirePlanCounts: boolean },
): Promise<EvolutionReport[]> {
  const check = checkManifest(input.manifest, input.files, input.requirePlanCounts);
  if (!check.ok) throw new Error(`labor manifest refused: ${check.problems.join("; ")}`);
  const reports: EvolutionReport[] = [];
  for (let pass = 0; pass < 2; pass++) {
    const graph = await readGraph(svc);
    const plan = planEvolution({
      sources: laborSources(input.manifest),
      files: input.files,
      policy: input.policy,
      nodes: graph.nodes,
      edges: graph.edges,
      records: laborRecords(input.manifest),
      edgeCandidates: laborEdges(input.manifest),
      series: laborSeries(input.manifest, socIndex(graph.nodes.filter((n) => n.kind === "occupation").map((n) => n.slug))),
    });
    reports.push(await applyEvolution(svc, plan, input.policyMeta));
  }
  return reports;
}
