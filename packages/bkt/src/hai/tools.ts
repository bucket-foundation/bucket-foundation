import Anthropic from "@anthropic-ai/sdk";
import type { Pack } from "../pack/export";
import { eligibleIds, freezeBank, reviewBank, type Bank, type FlagKind, type Review } from "./bank";
import { loadBank, loadReview, loadScores, loadSubmission, save } from "./files";
import { malformedCount } from "./probe";
import { collect, DEFAULT_BUDGET_FACTOR, estimateCost, MODEL, selectForScoring, submit } from "./score";

export interface ToolArgs {
  pilot: number | null;
  yes: boolean;
  collect: boolean;
  clear: string[];
  maxUsd: number | null;
  dir?: string;
}

export function parseToolArgs(argv: string[]): ToolArgs {
  const a: ToolArgs = { pilot: null, yes: false, collect: false, clear: [], maxUsd: null };
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

export async function score(a: ToolArgs, log = console.log, env = process.env, makeClient = () => new Anthropic()) {
  const bank = requireBank(a.dir);
  if (a.collect) {
    const sub = loadSubmission(a.dir);
    if (!sub) throw new Error("no submission; run bkt hai score --yes first");
    const out = await collect(makeClient(), bank, sub, loadScores(a.dir) ?? undefined);
    if ("pending" in out) return log(`batch ${sub.batchId}: ${out.pending}`);
    save("scores", out.scores, a.dir);
    save("submission", { ...sub, collectedAt: new Date().toISOString() }, a.dir);
    const n = Object.keys(out.scores.answers).length;
    const bad = malformedCount(out.scores);
    const right = Object.values(out.scores.answers).filter((x) => x.correct).length;
    log(`scores: ${n} items, ${right} correct, ${bad} malformed and left out of A, ${out.failed.length} failed`);
    return;
  }
  const pending = loadSubmission(a.dir);
  if (a.yes && pending && !pending.collectedAt) throw new Error(`batch ${pending.batchId} is not collected; run bkt hai score --collect first`);
  const eligible = eligibleIds(bank, requireReview(bank, a.dir));
  const done = new Set(Object.entries(loadScores(a.dir)?.answers ?? {}).filter(([, v]) => !v.malformed).map(([k]) => k));
  const items = selectForScoring(bank, eligible, a.pilot).filter((i) => !done.has(i.id));
  const est = estimateCost(items);
  log(`${MODEL}, effort low, one run: ${est.items} items, ~${est.inputTokens} input and ~${est.outputTokens} output tokens`);
  const cap = a.maxUsd ?? Math.ceil(est.usdBatch * DEFAULT_BUDGET_FACTOR * 100) / 100;
  log(`estimate $${est.usd.toFixed(2)} standard, $${est.usdBatch.toFixed(2)} batched, worst case $${est.worstUsdBatch.toFixed(2)}, cap $${cap.toFixed(2)}`);
  if (a.yes && est.worstUsdBatch > cap) throw new Error(`worst case $${est.worstUsdBatch.toFixed(2)} is above --max-usd $${cap.toFixed(2)}`);
  if (!a.yes) return log("dry run; add --yes to submit the batch");
  if (!items.length) return log("nothing to score");
  if (!env.ANTHROPIC_API_KEY && !env.ANTHROPIC_AUTH_TOKEN) throw new Error("set ANTHROPIC_API_KEY to submit");
  const sub = await submit(makeClient(), bank, items);
  save("submission", sub, a.dir);
  log(`submitted batch ${sub.batchId}; run bkt hai score --collect when it ends`);
}
