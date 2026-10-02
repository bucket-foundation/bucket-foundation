import fs from "node:fs";
import path from "node:path";
import { computeAtlasBaseline } from "./atlas-baseline-compute";

const out = path.resolve(__dirname, "../tests/baselines/solvability-space.json");
fs.writeFileSync(out, `${JSON.stringify(computeAtlasBaseline(), null, 1)}\n`);
process.stdout.write(`wrote ${out}\n`);
