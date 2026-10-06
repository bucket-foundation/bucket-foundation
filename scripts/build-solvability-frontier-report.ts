import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import neighbors from "../src/lib/research-os/solvability-neighbors-data.json";
import { buildFrontier, frontierRows, type NeighborData } from "../src/lib/research-os/solvability-frontier";
import { frontierSvg } from "../src/lib/research-os/solvability-frontier-render";
import { backtest } from "../src/lib/research-os/solvability-backtest";
import { buildPredictions, predictionsCsv, topPerClass, type StartingWork, type WorksIndex } from "../src/lib/research-os/solvability-predictions";

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "output", "solvability-frontier", "report");
const LIB = path.join(ROOT, "src", "lib", "research-os");
const RECORDS = path.join(ROOT, "tools", "solvability-atlas", "records");

interface RecordWork {
  title: string;
  year: number | null;
  role: string;
  doi: string | null;
  relevance: number;
  cited_by_count: number;
}

function worksIndex(): WorksIndex {
  const out: WorksIndex = {};
  if (!existsSync(RECORDS)) return out;
  for (const file of readdirSync(RECORDS).filter((f) => f.endsWith(".json"))) {
    const rec = JSON.parse(readFileSync(path.join(RECORDS, file), "utf8")) as { id: string; key_works?: RecordWork[] };
    const works: StartingWork[] = (rec.key_works ?? [])
      .filter((w) => w.role === "posed" || w.role === "partial" || w.role === "survey")
      .sort((a, b) => b.relevance - a.relevance || b.cited_by_count - a.cited_by_count)
      .slice(0, 3)
      .map((w) => ({ title: w.title, year: w.year, role: w.role, doi: w.doi }));
    if (works.length) out[rec.id] = works;
  }
  return out;
}

function main(): void {
  const data = neighbors as unknown as NeighborData;
  const frontier = buildFrontier(frontierRows(data), data);
  const bt = backtest(data);
  const predictions = buildPredictions(frontier, data, worksIndex());
  mkdirSync(OUT, { recursive: true });
  writeFileSync(path.join(OUT, "frontier.svg"), `${frontierSvg(frontier)}\n`);
  writeFileSync(path.join(OUT, "frontier.json"), JSON.stringify(frontier));
  writeFileSync(path.join(OUT, "backtest.json"), JSON.stringify(bt, null, 1));
  writeFileSync(path.join(OUT, "predictions.json"), JSON.stringify(predictions, null, 1));
  writeFileSync(path.join(OUT, "predictions.csv"), predictionsCsv(predictions));
  const { rows, ...predictionSummary } = predictions;
  const page = {
    schema: "bucket.solvability-frontier-report/v1",
    built: new Date().toISOString().slice(0, 10),
    nodes: data.nodes.filter((n) => n.kind !== "lean").length,
    model: data.model,
    revision: data.revision,
    k: data.k,
    frontier: { threshold: frontier.threshold, rule: frontier.rule, counts: frontier.counts, inside: frontier.inside, outside: frontier.outside, branches: frontier.branches, gaps: frontier.gaps },
    backtest: { ...bt, cutoffs: bt.cutoffs.map(({ rows: _rows, ...c }) => c) },
    predictions: { ...predictionSummary, top: topPerClass(predictions), atlas: rows.filter((r) => r.atlas) },
  };
  writeFileSync(path.join(LIB, "solvability-frontier-report-data.json"), JSON.stringify(page, null, 1));
  console.log(JSON.stringify({ threshold: frontier.threshold, counts: frontier.counts, classes: predictions.counts, cutoffs: bt.cutoffs.map((c) => ({ cutoff: c.cutoff, solved: c.solvedAtCutoff, threshold: c.threshold, tested: c.tested, unsampled: c.unsampled, bounded: c.reachBounded, all: c.all, auc: c.auc })) }, null, 1));
}

main();
