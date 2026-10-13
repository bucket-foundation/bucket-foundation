import { readFileSync, writeFileSync } from "node:fs";

const dir = "public/papers/solvability-frontier/data";
const makeup = JSON.parse(readFileSync(`${dir}/makeup.json`, "utf8"));
const backtest = JSON.parse(readFileSync(`${dir}/backtest.json`, "utf8"));

type Rates = { rateInside: number; rateOutside: number; ratio: number; pValue: number; inside: number; outside: number };
type Coding = { coding: string; auc: number; all: Rates; undatedRemoved: { all: Rates } };

const cutoffs = backtest.cutoffs.map((c: { cutoff: number; codings: Coding[]; solvedAtCutoff: number; tested: number; undecided: number }) => {
  const s = c.codings.find((k) => k.coding === "settled")!;
  const a = c.codings.find((k) => k.coding === "advanced")!;
  return {
    cutoff: c.cutoff,
    solvedAtCutoff: c.solvedAtCutoff,
    tested: c.tested,
    undecided: c.undecided,
    settled: { ...s.all, auc: s.auc, undated: { rateInside: s.undatedRemoved.all.rateInside, rateOutside: s.undatedRemoved.all.rateOutside, pValue: s.undatedRemoved.all.pValue } },
    advanced: { rateInside: a.all.rateInside, rateOutside: a.all.rateOutside, ratio: a.all.ratio, pValue: a.all.pValue, auc: a.auc },
  };
});

const classes = makeup.labels.prediction_class.counts;
const out = {
  builtFrom: `${dir}, built ${makeup.built}`,
  problems: makeup.rows,
  threshold: makeup.threshold,
  counts: makeup.labels.zone.counts,
  classes: { "close to known results": classes["close to known results"], borderline: classes.borderline, "needs a new idea": classes["needs a new idea"] },
  branches: Object.keys(makeup.status_by_branch).length,
  branchRows: makeup.status_by_branch,
  cutoffs,
};
writeFileSync("src/data/research-statement-numbers.json", JSON.stringify(out, null, 2) + "\n");
