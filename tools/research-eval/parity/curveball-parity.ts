import path from "node:path";

type Algebra = {
  seededRandom: (seed: string) => () => number;
  curveballTrade: (rows: number[][], rand: () => number) => void;
};

const source = path.resolve(process.argv[2] ?? path.join(__dirname, "..", "..", "..", "src", "lib", "research-os", "prime-algebra.ts"));
/* eslint-disable-next-line @typescript-eslint/no-require-imports */
const { seededRandom, curveballTrade } = require(source) as Algebra;

const SEED = "s1-parity";
const ROWS_IN = [[0, 1, 2], [2, 3], [0, 4, 5, 6], [1, 5], [3, 6, 7], [0, 7], [2, 4, 6], [1, 3, 5, 7]];
const TRADES = 50;

const probe = seededRandom(SEED);
const draws = Array.from({ length: 8 }, () => probe());
const rows = ROWS_IN.map((r) => r.slice());
const rand = seededRandom(SEED);
for (let t = 0; t < TRADES; t++) curveballTrade(rows, rand);
process.stdout.write(JSON.stringify({ seed: SEED, trades: TRADES, draws, rows_in: ROWS_IN, rows_out: rows }, null, 2) + "\n");
