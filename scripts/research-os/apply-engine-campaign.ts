/**
 * ros-12 item 3 (write side): applies one `tools/hypothesis-engine/
 * scripts/campaign_research_os.py` export (accepted hypotheses plus gap
 * nodes, ros-12 item 4) through the PR #14 adapter
 * (`src/lib/research-os/engine-bridge.ts`'s `buildEngineNode`/
 * `buildEngineEdges`/`buildGapNode`/`buildGapEdges`, `db.ts`'s
 * `upsertEngineHypothesisNode`/`writeEngineEdges`/`upsertGapNode`) into
 * `graph.nodes`/`graph.edges`. Needs live Supabase credentials
 * (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`): the mapping
 * functions this file wraps (`toEngineHypothesisInput`/`toGapNodeInput`)
 * are the pure, dependency-free, unit-tested part
 * (`scripts/test-research-os-apply-engine-campaign.ts`), matching
 * engine-bridge.ts's own "no Supabase types, pure builders, tested with
 * plain objects" convention; this file's own `applyEngineCampaign` (the
 * part that calls Supabase) is exercised end to end only by a
 * live run, the same boundary `production/route.ts`'s own write hook
 * draws.
 *
 * Full contract: learning/research-os/ENGINE-BRIDGE.md.
 *
 * Run, from the bucket-foundation repo root, after `python3 scripts/
 * campaign_research_os.py --out <path>` (tools/hypothesis-engine) has
 * written an export:
 *
 *   npx ts-node --compiler-options '{"module":"commonjs"}' \
 *     scripts/research-os/apply-engine-campaign.ts <path-to-export.json>
 */
import { readFileSync } from "node:fs";
import {
  buildEngineEdges,
  buildEngineNode,
  buildGapEdges,
  buildGapNode,
  type EngineHypothesisInput,
  type GapNodeInput,
} from "../../src/lib/research-os/engine-bridge";
import { upsertEngineHypothesisNode, upsertGapNode, writeEngineEdges } from "../../src/lib/research-os/db";

/** One entry of the export's own `"accepted"` list, camelCase, matching
 * `tools/hypothesis-engine/scripts/campaign_research_os.py`'s
 * `export_accepted_hypotheses`. */
export interface AcceptedExportEntry {
  engine: string;
  runId: string;
  campaign: string;
  hypothesisId: string;
  branch: string;
  title: string;
  posterior: number | null;
  elo: number | null;
  slots: Record<string, string | null>;
  evidenceRefs: string[];
  derivesFromSlugs: string[];
}

/** One entry of the export's own `"gaps"` list, matching `campaign_
 * research_os.py`'s `export_gap_nodes`. */
export interface GapExportEntry {
  engine: string;
  runId: string;
  campaign: string;
  branch: string;
  gapId: string;
  kind: string;
  description: string;
  valueOfInformation: number;
  concernsHypothesisIds: string[];
}

export interface CampaignExport {
  runId: string;
  engine: string;
  campaign: string;
  branch: string;
  accepted: AcceptedExportEntry[];
  gaps: GapExportEntry[];
}

/** `AcceptedExportEntry` -> `EngineHypothesisInput` (`engine-bridge.ts`'s
 * own `buildEngineNode`/`buildEngineEdges` input shape). `posterior`/`elo`
 * read `null` (the export's own JSON-safe absence marker, `campaign_
 * research_os.py`'s `opinion.project()`/`elos.get(...)` can both return
 * nothing) onto `undefined` (`EngineHypothesisInput`'s own optional-field
 * convention). Pure. */
export function toEngineHypothesisInput(entry: AcceptedExportEntry): EngineHypothesisInput {
  return {
    engine: entry.engine,
    runId: entry.runId,
    campaign: entry.campaign,
    hypothesisId: entry.hypothesisId,
    branch: entry.branch,
    title: entry.title,
    posterior: entry.posterior ?? undefined,
    elo: entry.elo ?? undefined,
    slots: entry.slots,
    evidenceRefs: entry.evidenceRefs,
    derivesFromSlugs: entry.derivesFromSlugs,
  };
}

/** `GapExportEntry` -> `GapNodeInput` (`engine-bridge.ts`'s own
 * `buildGapNode`/`buildGapEdges` input shape). Pure. */
export function toGapNodeInput(entry: GapExportEntry): GapNodeInput {
  return {
    engine: entry.engine,
    runId: entry.runId,
    campaign: entry.campaign,
    branch: entry.branch,
    gapId: entry.gapId,
    kind: entry.kind,
    description: entry.description,
    valueOfInformation: entry.valueOfInformation,
    concernsHypothesisIds: entry.concernsHypothesisIds,
  };
}

export interface ApplyResult {
  hypothesisNodesWritten: number;
  hypothesisEdgesWritten: number;
  gapNodesWritten: number;
  gapEdgesWritten: number;
}

/**
 * Applies every accepted hypothesis and every gap node in `payload`
 * through the PR #14 adapter, in order (hypothesis nodes first, so a
 * gap's own `cites` edge to a hypothesis node from the same run resolves
 * rather than getting dropped as unresolved by `writeEngineEdges`).
 * A gap concerning a hypothesis this same run did not accept (never
 * survived its own critic filter) still writes the gap node itself; only
 * that one edge is skipped, `writeEngineEdges`'s own documented behavior.
 */
export async function applyEngineCampaign(payload: CampaignExport): Promise<ApplyResult> {
  const result: ApplyResult = { hypothesisNodesWritten: 0, hypothesisEdgesWritten: 0, gapNodesWritten: 0, gapEdgesWritten: 0 };

  for (const entry of payload.accepted) {
    const input = toEngineHypothesisInput(entry);
    const node = await upsertEngineHypothesisNode(buildEngineNode(input));
    result.hypothesisNodesWritten += 1;
    const written = await writeEngineEdges(node.id, buildEngineEdges(input));
    result.hypothesisEdgesWritten += written.written;
  }

  for (const entry of payload.gaps) {
    const input = toGapNodeInput(entry);
    const node = await upsertGapNode(buildGapNode(input));
    result.gapNodesWritten += 1;
    const written = await writeEngineEdges(node.id, buildGapEdges(input));
    result.gapEdgesWritten += written.written;
  }

  return result;
}

async function main(): Promise<void> {
  const exportPath = process.argv[2];
  if (!exportPath) {
    console.error("usage: apply-engine-campaign.ts <path-to-export.json>");
    process.exit(2);
  }
  const payload = JSON.parse(readFileSync(exportPath, "utf8")) as CampaignExport;
  const result = await applyEngineCampaign(payload);
  console.log(JSON.stringify({ runId: payload.runId, ...result }, null, 2));
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
