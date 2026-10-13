import { fastForceLayout } from "../src/explore/rows-layout";

function best(n: number): number {
  const ids = Array.from({ length: n }, (_, i) => `row:timing:k${i}`);
  const edges = ids.slice(1).map((id, i): [string, string] => [id, ids[Math.floor(i / 2)]]);
  fastForceLayout(ids.slice(0, 32), edges.slice(0, 31));
  let least = Number.POSITIVE_INFINITY;
  for (let run = 0; run < 3; run++) {
    const started = performance.now();
    fastForceLayout(ids, edges);
    least = Math.min(least, performance.now() - started);
  }
  return least;
}

console.log(JSON.stringify(Object.fromEntries(process.argv.slice(2).map((n) => [n, Math.round(best(Number(n)))]))));
