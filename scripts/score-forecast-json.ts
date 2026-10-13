import fs from "fs";
import { scoreForecast, statusMap } from "../src/lib/research-os/solvability-backtest";
import type { NeighborData } from "../src/lib/research-os/solvability-frontier";

const [forecastPath, dataPath] = process.argv.slice(2);
const forecast = JSON.parse(fs.readFileSync(forecastPath, "utf8"));
const data = JSON.parse(fs.readFileSync(dataPath, "utf8")) as NeighborData;
const scored = scoreForecast(forecast, statusMap(data));
const settled = scored.codings.find((c) => c.coding === "settled")!;
process.stdout.write(
  JSON.stringify({
    cutoff: scored.cutoff,
    tested: scored.tested,
    unsampled: scored.unsampled,
    undecided: scored.undecided,
    threshold: scored.threshold,
    all: settled.all,
    auc: settled.auc,
    aucRows: settled.aucRows,
    undatedRemoved: { auc: settled.undatedRemoved.auc, aucRows: settled.undatedRemoved.aucRows, all: settled.undatedRemoved.all },
  }) + "\n",
);
