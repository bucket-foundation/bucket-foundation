import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { readFileSync } from "node:fs";
import {
  checksTable,
  runtimeVerdict,
  summarize,
  summarizeCold,
  RUNTIME_THRESHOLDS,
  type ColdStart,
  type Sample,
} from "../../../src/lib/research-os/evidence-search/gates";
import { signIn } from "./session";

interface Query {
  query: string;
  branch: string;
}

const FIXTURES = path.join("learning", "research-os", "ai", "model-gate-fixtures.json");

function queries(): Query[] {
  const raw = JSON.parse(readFileSync(FIXTURES, "utf8")) as { cases?: Query[] };
  const rows = (raw.cases ?? []).map((c) => ({ query: c.query, branch: c.branch }));
  if (rows.length === 0) throw new Error(`no queries in ${FIXTURES}`);
  return rows;
}

function arg(name: string, fallback?: string): string {
  const at = process.argv.indexOf(`--${name}`);
  const value = at === -1 ? undefined : process.argv[at + 1];
  if (value === undefined && fallback === undefined) throw new Error(`--${name} is required`);
  return value ?? (fallback as string);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class Worker {
  private child: ChildProcess | null = null;
  constructor(
    private readonly url: string,
    private readonly secret: string,
    private readonly vectors: string,
  ) {}

  private get port(): number {
    return Number(new URL(this.url).port || 80);
  }

  async healthy(): Promise<boolean> {
    try {
      const res = await fetch(`${this.url}/health`, { headers: { "x-evidence-worker-key": this.secret } });
      return res.ok;
    } catch {
      return false;
    }
  }

  async scored(): Promise<number> {
    const res = await fetch(`${this.url}/health`, { headers: { "x-evidence-worker-key": this.secret } });
    if (!res.ok) throw new Error(`the worker answered ${res.status} on health`);
    const body = (await res.json()) as { counters?: { scored?: number } };
    return body.counters?.scored ?? 0;
  }

  async start(timeoutMs = 60_000): Promise<number> {
    if (this.child) throw new Error("the worker is already running");
    const started = performance.now();
    this.child = spawn("python3", ["-m", "evidence_search", "serve", "--vectors", path.resolve(this.vectors), "--port", String(this.port)], {
      cwd: path.join("tools", "evidence-search"),
      env: { ...process.env, EVIDENCE_WORKER_SECRET: this.secret },
      stdio: ["ignore", "ignore", "inherit"],
    });
    const exited = new Promise<never>((_, reject) => {
      this.child?.once("exit", (code) => reject(new Error(`the worker exited with code ${code} before it answered`)));
    });
    const ready = (async () => {
      while (performance.now() - started < timeoutMs) {
        if (await this.healthy()) return performance.now() - started;
        await sleep(50);
      }
      throw new Error(`the worker did not answer within ${timeoutMs} ms`);
    })();
    return Promise.race([ready, exited]);
  }

  async stop(): Promise<void> {
    const child = this.child;
    this.child = null;
    if (!child || child.exitCode !== null) return;
    const ended = new Promise<void>((resolve) => child.once("exit", () => resolve()));
    child.kill("SIGTERM");
    await Promise.race([ended, sleep(5000).then(() => child.kill("SIGKILL"))]);
    while (await this.healthy()) await sleep(50);
  }
}

async function searchOnce(base: string, token: string, q: Query): Promise<Sample> {
  const started = performance.now();
  try {
    const res = await fetch(`${base}/api/research-os/evidence-search`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ schemaVersion: 1, query: q.query, branch: q.branch, limit: 5 }),
    });
    const body = (await res.json().catch(() => ({}))) as { mode?: "hybrid" | "lexical"; status?: "ok" | "no_match" | "degraded" };
    return { ms: performance.now() - started, status: res.status, mode: body.mode, result: body.status };
  } catch {
    return { ms: performance.now() - started, status: 0 };
  }
}

async function phase(base: string, token: string, qs: Query[], count: number, lanes: number): Promise<Sample[]> {
  const out: Sample[] = new Array(count);
  let next = 0;
  const lane = async () => {
    for (;;) {
      const i = next++;
      if (i >= count) return;
      out[i] = await searchOnce(base, token, qs[i % qs.length]);
    }
  };
  await Promise.all(Array.from({ length: lanes }, lane));
  return out;
}

async function main(): Promise<number> {
  const base = (process.env.BENCH_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
  const email = process.env.BENCH_EMAIL ?? "";
  const workerUrl = process.env.EVIDENCE_WORKER_URL ?? "";
  const secret = process.env.EVIDENCE_WORKER_SECRET ?? "";
  const vectors = arg("vectors", path.join("local", "evidence", "vectors"));
  const warmCount = Number(arg("warm", String(RUNTIME_THRESHOLDS.warmRequests)));
  const coldCount = Number(arg("cold", String(RUNTIME_THRESHOLDS.coldStarts)));
  const out = arg("out", path.join("local", "evidence", "gates"));

  if (!email) throw new Error("set BENCH_EMAIL to a pilot account on this machine");
  if (!workerUrl || !secret) throw new Error("set EVIDENCE_WORKER_URL and EVIDENCE_WORKER_SECRET, the same values the server reads");

  const worker = new Worker(workerUrl, secret, vectors);
  if (await worker.healthy()) {
    throw new Error(`a worker already answers on ${workerUrl}; stop it so this run owns the process and its counters`);
  }

  const session = await signIn(email);
  const qs = queries();
  console.log(`[bench] ${session.email} ${session.learnerId}`);
  const loadMs = await worker.start();
  console.log(`[bench] worker up in ${Math.round(loadMs)} ms`);

  try {
    const probe = await fetch(`${base}/api/research-os/evidence-search`, { headers: { authorization: `Bearer ${session.accessToken}` } });
    const probeBody = (await probe.json().catch(() => ({}))) as { worker?: boolean; sources?: number; corpusRevision?: string; message?: string };
    if (!probe.ok) throw new Error(`the server refused the pilot probe with ${probe.status}: ${probeBody.message ?? "no message"}`);
    if (!probeBody.worker) throw new Error("the server reports no worker; give it the same EVIDENCE_WORKER_URL and EVIDENCE_WORKER_SECRET");
    console.log(`[bench] corpus ${String(probeBody.corpusRevision).slice(0, 12)}, ${probeBody.sources} sources`);

    await phase(base, session.accessToken, qs, Math.min(10, qs.length), 1);
    const scoredBefore = await worker.scored();

    console.log(`[bench] ${warmCount} warm requests at concurrency one`);
    const warmOne = summarize(await phase(base, session.accessToken, qs, warmCount, 1));
    console.log(`[bench] ${warmCount} warm requests at concurrency two`);
    const warmTwo = summarize(await phase(base, session.accessToken, qs, warmCount, 2));
    const warmScored = (await worker.scored()) - scoredBefore;

    console.log(`[bench] ${coldCount} cold starts`);
    const cold: ColdStart[] = [];
    for (let i = 0; i < coldCount; i++) {
      await worker.stop();
      const down = await searchOnce(base, session.accessToken, qs[i % qs.length]);
      const loadMs = await worker.start();
      const first = await searchOnce(base, session.accessToken, qs[i % qs.length]);
      cold.push({ down, loadMs, first });
    }

    const report = { warmOne, warmTwo, cold: summarizeCold(cold) };
    const verdict = runtimeVerdict(report, { ...RUNTIME_THRESHOLDS, warmRequests: warmCount, coldStarts: coldCount });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    mkdirSync(out, { recursive: true });
    const record = {
      schemaVersion: 1,
      ranAt: new Date().toISOString(),
      base,
      corpusRevision: probeBody.corpusRevision ?? null,
      sources: probeBody.sources ?? null,
      warmCount,
      coldCount,
      warmRequestsScored: warmScored,
      thresholds: RUNTIME_THRESHOLDS,
      report,
      verdict,
      coldStarts: cold,
    };
    writeFileSync(path.join(out, `runtime-${stamp}.json`), `${JSON.stringify(record, null, 2)}\n`);
    const md = [
      `# Evidence search runtime gate, ${record.ranAt}`,
      "",
      `Corpus \`${String(record.corpusRevision).slice(0, 12)}\`, ${record.sources} sources. ${warmCount} warm requests per concurrency, ${coldCount} cold starts. The worker scored ${record.warmRequestsScored} of the ${warmCount * 2} warm requests.`,
      "",
      checksTable(verdict.checks),
      "",
      "| Phase | requests | p50 ms | p95 ms | max ms | errors | degraded | neural |",
      "|---|---|---|---|---|---|---|---|",
      `| warm, concurrency one | ${warmOne.count} | ${Math.round(warmOne.p50)} | ${Math.round(warmOne.p95)} | ${Math.round(warmOne.max)} | ${warmOne.errors} | ${warmOne.degraded} | ${warmOne.neural} |`,
      `| warm, concurrency two | ${warmTwo.count} | ${Math.round(warmTwo.p50)} | ${Math.round(warmTwo.p95)} | ${Math.round(warmTwo.max)} | ${warmTwo.errors} | ${warmTwo.degraded} | ${warmTwo.neural} |`,
      `| cold, first answer after start | ${report.cold.count} | ${Math.round(report.cold.first.p50)} | ${Math.round(report.cold.first.p95)} | ${Math.round(report.cold.first.max)} | ${report.cold.first.errors} | ${report.cold.first.degraded} | ${report.cold.first.neural} |`,
      `| cold, worker stopped | ${report.cold.down.count} | ${Math.round(report.cold.down.p50)} | ${Math.round(report.cold.down.p95)} | ${Math.round(report.cold.down.max)} | ${report.cold.down.errors} | ${report.cold.down.degraded} | ${report.cold.down.neural} |`,
      "",
      `The worker's own start takes p95 ${Math.round(report.cold.loadP95)} ms, ${Math.round(report.cold.loadMax)} ms at worst. No request waits inside it: a request arriving with the worker stopped is answered from checked keyword ranking at p95 ${Math.round(report.cold.down.p95)} ms and says it degraded. Worker start through the first neural answer is p95 ${Math.round(report.cold.restartP95)} ms.`,
      "",
    ].join("\n");
    writeFileSync(path.join(out, `runtime-${stamp}.md`), md);
    console.log(`\n${md}`);
    console.log(`[bench] ${path.join(out, `runtime-${stamp}.md`)}`);
    return verdict.pass ? 0 : 1;
  } finally {
    await worker.stop();
  }
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(`[bench] ${e instanceof Error ? e.message : String(e)}`);
    process.exit(2);
  },
);
