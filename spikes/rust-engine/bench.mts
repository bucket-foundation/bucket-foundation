import { loadavg, cpus } from "node:os";

const split = process.argv.indexOf("--");
const [runs, repeats] = process.argv.slice(2, split).map(Number);
const cmd = process.argv.slice(split + 1);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const round = (x: number) => Math.round(x * 100) / 100;
const out: { median_ms: number; min_ms: number; max_ms: number }[] = [];
for (let r = 0; r < repeats; r++) {
  const ms: number[] = [];
  for (let i = 0; i < runs; i++) {
    const t = Bun.nanoseconds();
    const p = Bun.spawnSync(cmd, { stdout: "pipe", stderr: "pipe", env: { ...process.env, ...(process.env.BENCH_HOME ? { HOME: process.env.BENCH_HOME, XDG_DATA_HOME: `${process.env.BENCH_HOME}/data`, XDG_CONFIG_HOME: `${process.env.BENCH_HOME}/config`, XDG_STATE_HOME: `${process.env.BENCH_HOME}/state`, XDG_CACHE_HOME: `${process.env.BENCH_HOME}/cache` } : {}) } });
    ms.push((Bun.nanoseconds() - t) / 1e6);
    if (p.exitCode !== 0) throw new Error(`${cmd.join(" ")} exited ${p.exitCode}: ${p.stderr.toString()}`);
  }
  out.push({ median_ms: round(median(ms)), min_ms: round(Math.min(...ms)), max_ms: round(Math.max(...ms)) });
}
console.log(JSON.stringify({ cmd: cmd.map((c) => c.split(/[\\/]/).pop()).join(" "), runs, repeats: out, load: loadavg().map(round), cpus: cpus().length }));
