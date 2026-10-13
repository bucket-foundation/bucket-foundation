import fs from "node:fs";
import path from "node:path";
import { computeGeometryBaseline } from "./geometry-baseline-compute";

const out = path.resolve(__dirname, "../tests/baselines/solvability-geometry.json");
fs.writeFileSync(out, `${JSON.stringify(computeGeometryBaseline(), null, 1)}\n`);
process.stdout.write(`wrote ${out}\n`);
