#!/usr/bin/env node
import fs from "node:fs";

const [out = "pairs.bin", pairsArg = "2000", dimArg = "384"] = process.argv.slice(2);
const pairs = Number(pairsArg);
const dim = Number(dimArg);

let state = 0x9e3779b9;
function uniform() {
  state ^= state << 13; state >>>= 0;
  state ^= state >>> 17;
  state ^= state << 5; state >>>= 0;
  return state / 4294967296;
}

const vectors = new Float32Array(pairs * dim * 2);
for (let i = 0; i < vectors.length; i++) vectors[i] = uniform() * 2 - 1;

const dots = new Float64Array(pairs);
for (let p = 0; p < pairs; p++) {
  const q = vectors.subarray(p * 2 * dim, p * 2 * dim + dim);
  const v = vectors.subarray(p * 2 * dim + dim, (p + 1) * 2 * dim);
  let s = 0;
  for (let j = 0; j < q.length; j++) s += q[j] * v[j];
  dots[p] = s;
}

const header = new Uint32Array([pairs, dim]);
fs.writeFileSync(out, Buffer.concat([Buffer.from(header.buffer), Buffer.from(vectors.buffer), Buffer.from(dots.buffer)]));
