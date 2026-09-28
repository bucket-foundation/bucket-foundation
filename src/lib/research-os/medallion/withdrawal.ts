import { parseSourceId } from "../evidence/identity";
import { checkRepoPath } from "./paths";

export type WithdrawArgs =
  | { mode: "withdraw"; target: { source: string } | { path: string }; reason: string; apply: boolean }
  | { mode: "queue" }
  | { mode: "restore"; slug: string; reviewer: string; apply: boolean }
  | { mode: "restore-history"; source: string; reviewer: string; apply: boolean };

export type ArgError = "no_target" | "two_targets" | "bad_source" | "bad_path" | "no_reason" | "no_reviewer";

function value(argv: string[], name: string): string | null {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

export function parseWithdrawArgs(argv: string[]): { ok: true; args: WithdrawArgs } | { ok: false; error: ArgError } {
  const apply = argv.includes("--apply");
  if (argv.includes("--queue")) return { ok: true, args: { mode: "queue" } };
  const restoreHistory = value(argv, "restore-history");
  if (restoreHistory) {
    const reviewer = value(argv, "reviewer");
    if (!reviewer) return { ok: false, error: "no_reviewer" };
    if (parseSourceId(restoreHistory)?.kind !== "file") return { ok: false, error: "bad_source" };
    return { ok: true, args: { mode: "restore-history", source: restoreHistory, reviewer, apply } };
  }
  const restore = value(argv, "restore");
  if (restore) {
    const reviewer = value(argv, "reviewer");
    if (!reviewer) return { ok: false, error: "no_reviewer" };
    return { ok: true, args: { mode: "restore", slug: restore, reviewer, apply } };
  }
  const source = value(argv, "source");
  const path = value(argv, "path");
  if (source && path) return { ok: false, error: "two_targets" };
  if (!source && !path) return { ok: false, error: "no_target" };
  if (source && parseSourceId(source)?.kind !== "file") return { ok: false, error: "bad_source" };
  if (path && !checkRepoPath(path).ok) return { ok: false, error: "bad_path" };
  const reason = value(argv, "reason")?.trim();
  if (!reason) return { ok: false, error: "no_reason" };
  return { ok: true, args: { mode: "withdraw", target: source ? { source } : { path: path! }, reason, apply } };
}

export interface ImpactInput {
  sourceIds: Set<string>;
  silver: { id: string; source_id: string; status: string }[];
  lineage: { node_id: string; silver_item_id: string }[];
  otherSilverStatus: Map<string, { source_id: string; status: string }>;
}

export interface WithdrawalImpact {
  silverToWithdraw: string[];
  orphaned: string[];
  kept: string[];
}

export function withdrawalImpact(input: ImpactInput): WithdrawalImpact {
  const hit = new Set(input.silver.filter((s) => input.sourceIds.has(s.source_id)).map((s) => s.id));
  const silverToWithdraw = input.silver.filter((s) => hit.has(s.id) && s.status !== "withdrawn").map((s) => s.id);
  const byNode = new Map<string, string[]>();
  for (const l of input.lineage) byNode.set(l.node_id, [...(byNode.get(l.node_id) ?? []), l.silver_item_id]);
  const orphaned: string[] = [];
  const kept: string[] = [];
  for (const [node, items] of Array.from(byNode.entries())) {
    if (!items.some((id) => hit.has(id))) continue;
    const survives = items.some((id) => {
      if (hit.has(id)) return false;
      const other = input.otherSilverStatus.get(id);
      return !!other && other.status !== "withdrawn" && !input.sourceIds.has(other.source_id);
    });
    (survives ? kept : orphaned).push(node);
  }
  return { silverToWithdraw, orphaned: orphaned.sort(), kept: kept.sort() };
}
