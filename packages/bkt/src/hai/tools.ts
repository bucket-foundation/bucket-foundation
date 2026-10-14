import Anthropic from "@anthropic-ai/sdk";
import type { Pack } from "../pack/export";
import { eligibleIds, freezeBank, reviewBank, type Bank, type FlagKind, type Review } from "./bank";
import { loadBank, loadPilot, loadReview, loadScores, loadSubmission, save } from "./files";
import { malformedCount } from "./probe";
import { collect, DEFAULT_BUDGET_FACTOR, estimateCost, MAX_TOKENS, MODEL, pilotGate, selectForScoring, submit, truncationRate } from "./score";

export interface ToolArgs {
  pilot: number | null;
  yes: boolean;
  collect: boolean;
  abandon: boolean;
  clear: string[];
  maxUsd: number | null;
  dir?: string;
}

export function parseToolArgs(argv: string[]): ToolArgs {
  const a: ToolArgs = { pilot: null, yes: false, collect: false, abandon: false, clear: [], maxUsd: null };
  for (let i = 0; i < argv.length; i++) {
    const [flag, inline] = argv[i].split("=", 2);
    const value = () => inline ?? argv[++i];
    if (flag === "--pilot") {
      const n = Number(value() ?? 200);
      if (!Number.isInteger(n) || n <= 0) throw new Error("--pilot needs a positive item count");
      a.pilot = n;
    } else if (flag === "--yes") a.yes = true;
    else if (flag === "--dry-run") a.yes = false;
    else if (flag === "--collect") a.collect = true;
    else if (flag === "--abandon") a.abandon = true;
    else if (flag === "--clear") a.clear.push(value());
    else if (flag === "--dir") a.dir = value();
    else if (flag === "--max-usd") {
      const n = Number(value());
      if (!Number.isFinite(n) || n <= 0) throw new Error("--max-usd needs a positive dollar amount");
      a.maxUsd = n;
    }
    else throw new Error(`unknown flag ${flag}`);
  }
  return a;
}

function requireBank(dir?: string): Bank {
  const bank = loadBank(dir);
  if (!bank) throw new Error("no frozen bank; run bkt hai freeze");
  return bank;
}

function requireReview(bank: Bank, dir?: string): Review {
  const review = loadReview(dir);
  if (!review || review.bankVersion !== bank.version) throw new Error("no review for this bank; run bkt hai review");
  return review;
}

export function freeze(pack: Pack, a: ToolArgs, log = console.log) {
  const existing = loadBank(a.dir);
  const bank = freezeBank(pack.items, pack.version);
  if (existing && existing.version !== bank.version && loadScores(a.dir)?.bankVersion === existing.version)
    throw new Error(`bank ${existing.version} already has AI scores; move hai/ aside before freezing ${bank.version}`);
  save("bank", bank, a.dir);
  log(`bank ${bank.version}: ${bank.items.length} items frozen from pack ${pack.version}`);
  review(a, log);
}

export function review(a: ToolArgs, log = console.log) {
  const bank = requireBank(a.dir);
  const prev = loadReview(a.dir);
  const known = new Set(bank.items.map((i) => i.id));
  for (const id of a.clear) if (!known.has(id)) throw new Error(`--clear ${id}: not in bank`);
  const cleared = [...new Set([...(prev?.bankVersion === bank.version ? prev.cleared : []), ...a.clear])].sort();
  const r = reviewBank(bank, cleared);
  save("review", r, a.dir);
  const counts = new Map<FlagKind, number>();
  for (const f of r.flags) counts.set(f.kind, (counts.get(f.kind) ?? 0) + 1);
  const eligible = eligibleIds(bank, r);
  log(`review ${bank.version}: ${r.flags.length} flags on ${new Set(r.flags.map((f) => f.itemId)).size} items, ${cleared.length} cleared, ${eligible.size} eligible`);
  for (const [k, n] of [...counts].sort()) log(`  ${k}: ${n}`);
}

async function batchStatus(client: Anthropic, batchId: string): Promise<{ status: string; succeeded: number }> {
  try {
    const b = await client.messages.batches.retrieve(batchId);
    return { status: b.processing_status, succeeded: b.request_counts.succeeded };
  } catch (e) {
    if (e instanceof Anthropic.NotFoundError) return { status: "not found", succeeded: 0 };
    throw e;
  }
}

export async function score(a: ToolArgs, log = console.log, env = process.env, makeClient = () => new Anthropic()) {
  const bank = requireBank(a.dir);
  if (a.abandon) {
    const sub = loadSubmission(a.dir);
    if (!sub || sub.collectedAt || sub.abandonedAt) throw new Error("no open batch to abandon");
    const { status, succeeded } = await batchStatus(makeClient(), sub.batchId);
    if (status === "in_progress" || status === "canceling") throw new Error(`batch ${sub.batchId} is ${status.replace("_", " ")}; run bkt hai score --collect when it ends`);
    if (succeeded > 0) throw new Error(`batch ${sub.batchId} holds ${succeeded} paid answers; run bkt hai score --collect`);
    save("submission", { ...sub, abandonedAt: new Date().toISOString() }, a.dir);
    log(`batch ${sub.batchId} abandoned (${status}); its items stay unscored and a new batch may be submitted`);
    return;
  }
  if (a.collect) {
    const sub = loadSubmission(a.dir);
    if (!sub) throw new Error("no submission; run bkt hai score --yes first");
    if (sub.abandonedAt) throw new Error(`batch ${sub.batchId} was abandoned; run bkt hai score --yes to submit a new one`);
    const out = await collect(makeClient(), bank, sub, loadScores(a.dir) ?? undefined);
    if ("pending" in out) return log(`batch ${sub.batchId}: ${out.pending}`);
    const collectedAt = new Date().toISOString();
    save("scores", out.scores, a.dir);
    save("submission", { ...sub, collectedAt }, a.dir);
    const n = Object.keys(out.scores.answers).length;
    const bad = malformedCount(out.scores);
    const right = Object.values(out.scores.answers).filter((x) => x.correct).length;
    log(`scores: ${n} items, ${right} correct, ${bad} malformed and left out of A, ${out.failed.length} failed, ${out.truncated.length} truncated`);
    if (sub.pilot) {
      const pilot = { bankVersion: bank.version, model: sub.model, maxTokens: MAX_TOKENS, batchId: sub.batchId, answered: out.answered, truncated: out.truncated.length, failed: out.failed.length, collectedAt };
      save("pilot", pilot, a.dir);
      const rate = truncationRate(pilot);
      const blocked = pilotGate(bank, pilot);
      log(`pilot: ${rate === null ? "no answers" : `${(rate * 100).toFixed(1)}% truncated`}; ${blocked ? `full run blocked, ${blocked}` : "full run allowed"}`);
    }
    return;
  }
  const pending = loadSubmission(a.dir);
  if (a.yes && pending && !pending.collectedAt && !pending.abandonedAt)
    throw new Error(`batch ${pending.batchId} is not collected; run bkt hai score --collect first, or --abandon if it expired or failed`);
  const eligible = eligibleIds(bank, requireReview(bank, a.dir));
  const done = new Set(Object.entries(loadScores(a.dir)?.answers ?? {}).filter(([, v]) => !v.malformed).map(([k]) => k));
  const sample = selectForScoring(bank, eligible, a.pilot);
  const full = a.pilot === null || sample.length >= eligible.size;
  const items = full ? sample.filter((i) => !done.has(i.id)) : sample;
  const est = estimateCost(items);
  log(`${MODEL}, effort low, one run: ${est.items} items, ~${est.inputTokens} input and ~${est.outputTokens} output tokens`);
  const cap = a.maxUsd ?? Math.ceil(est.usdBatch * DEFAULT_BUDGET_FACTOR * 100) / 100;
  log(`estimate $${est.usd.toFixed(2)} standard, $${est.usdBatch.toFixed(2)} batched, worst case $${est.worstUsdBatch.toFixed(2)}, cap $${cap.toFixed(2)}`);
  if (a.yes && est.worstUsdBatch > cap) throw new Error(`worst case $${est.worstUsdBatch.toFixed(2)} is above --max-usd $${cap.toFixed(2)}`);
  const blocked = full && items.length ? pilotGate(bank, loadPilot(a.dir)) : null;
  if (blocked) log(`full run blocked: ${blocked}`);
  if (!a.yes) return log("dry run; add --yes to submit the batch");
  if (blocked) throw new Error(`full run blocked: ${blocked}`);
  if (!items.length) return log("nothing to score");
  if (!env.ANTHROPIC_API_KEY && !env.ANTHROPIC_AUTH_TOKEN) throw new Error("set ANTHROPIC_API_KEY to submit");
  const sub = await submit(makeClient(), bank, items, !full);
  save("submission", sub, a.dir);
  log(`submitted batch ${sub.batchId}; run bkt hai score --collect when it ends`);
}
