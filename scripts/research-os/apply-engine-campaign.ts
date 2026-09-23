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
