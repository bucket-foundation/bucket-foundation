/**
 * The Model gate for evidence search (IMPLEMENTATION.md, "Verification
 * and release"): the pinned weights embed a query and change ranking on
 * paraphrase fixtures written before any result was seen.
 *
 *   set -a; . ./.env.local; set +a
 *   RESEARCH_OS_AI_SEARCH=1 EVIDENCE_WORKER_URL=http://127.0.0.1:8431 \
 *   EVIDENCE_WORKER_SECRET=... npm run dev        # in one shell
 *
 *   BENCH_EMAIL=you@example.test \
 *   npx ts-node --compiler-options '{"module":"commonjs"}' \
 *     scripts/research-os/evidence/model-gate.ts --vectors local/evidence/vectors
 *
 * Each case runs twice against the same server and the same admitted
 * corpus: once with the worker stopped, where the route falls back to
 * keyword search, and once with it running. The difference between those
 * two card lists is what the gate measures.
 *
 * Mock results fail: the worker's own scored counter has to rise by one
 * per case, and the model revision the route reports has to be the one
 * models.json pins.
 *
 * Exit 0: every check passes. Exit 1: a check fails. Exit 2: the run
 * could not start.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { checksTable, modelVerdict, rankOf, type CaseOutcome, type ParaphraseCase } from "../../../src/lib/research-os/evidence-search/gates";
import { signIn } from "./session";

const FIXTURES = path.join("learning", "research-os", "ai", "model-gate-fixtures.json");
const MODELS = path.join("tools", "evidence-search", "models.json");

interface Fixtures {
  cases: ParaphraseCase[];
  thresholds: { minReordered: number; minRecovered: number };
}

interface Card {
  slug?: string;
  sourceId?: string;
  title?: string;
}

interface SearchBody {
  mode?: "hybrid" | "lexical";
  status?: string;
  modelRevision?: string | null;
  corpusRevision?: string;
  cards?: Card[];
  message?: string;
}

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? fallback : (process.argv[at + 1] ?? fallback);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function pinnedRevision(): string {
  const raw = JSON.parse(readFileSync(MODELS, "utf8")) as { default: string; models: Record<string, { revision: string }> };
  const entry = raw.models[raw.default];
  if (!entry?.revision) throw new Error(`${MODELS} pins no revision for ${raw.default}`);
  return entry.revision;
}

class Worker {
  private child: ChildProcess | null = null;
  constructor(
    private readonly url: string,
    private readonly secret: string,
    private readonly vectors: string,
  ) {}

  async healthy(): Promise<boolean> {
    try {
      return (await fetch(`${this.url}/health`, { headers: { "x-evidence-worker-key": this.secret } })).ok;
    } catch {
      return false;
    }
  }

  async scored(): Promise<number> {
    const res = await fetch(`${this.url}/health`, { headers: { "x-evidence-worker-key": this.secret } });
    if (!res.ok) throw new Error(`the worker answered ${res.status} on health`);
    return ((await res.json()) as { counters?: { scored?: number } }).counters?.scored ?? 0;
  }

  async start(timeoutMs = 60_000): Promise<void> {
    if (this.child) return;
    const started = Date.now();
    this.child = spawn("python3", ["-m", "evidence_search", "serve", "--vectors", path.resolve(this.vectors), "--port", String(Number(new URL(this.url).port || 80))], {
      cwd: path.join("tools", "evidence-search"),
      env: { ...process.env, EVIDENCE_WORKER_SECRET: this.secret },
      stdio: ["ignore", "ignore", "inherit"],
    });
    const exited = new Promise<never>((_, reject) => {
      this.child?.once("exit", (code) => reject(new Error(`the worker exited with code ${code} before it answered`)));
    });
    const ready = (async () => {
      while (Date.now() - started < timeoutMs) {
        if (await this.healthy()) return;
        await sleep(50);
      }
      throw new Error(`the worker did not answer within ${timeoutMs} ms`);
    })();
    await Promise.race([ready, exited]);
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

async function search(base: string, token: string, c: ParaphraseCase): Promise<SearchBody & { httpStatus: number }> {
  const res = await fetch(`${base}/api/research-os/evidence-search`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ schemaVersion: 1, query: c.query, branch: c.branch, limit: 5 }),
  });
  const body = (await res.json().catch(() => ({}))) as SearchBody;
  return { ...body, httpStatus: res.status };
}

const order = (cards: Card[] = []) => cards.map((c) => c.slug ?? c.sourceId ?? "").join(">");

async function main(): Promise<number> {
  const base = (process.env.BENCH_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
  const email = process.env.BENCH_EMAIL ?? "";
  const url = process.env.EVIDENCE_WORKER_URL ?? "";
  const secret = process.env.EVIDENCE_WORKER_SECRET ?? "";
  const vectors = arg("vectors", path.join("local", "evidence", "vectors"));
  const out = arg("out", path.join("local", "evidence", "gates"));
  if (!email) throw new Error("set BENCH_EMAIL to a pilot account on this machine");
  if (!url || !secret) throw new Error("set EVIDENCE_WORKER_URL and EVIDENCE_WORKER_SECRET, the same values the server reads");

  const fixtures = JSON.parse(readFileSync(FIXTURES, "utf8")) as Fixtures;
  const pinned = pinnedRevision();
  const worker = new Worker(url, secret, vectors);
  if (await worker.healthy()) throw new Error(`a worker already answers on ${url}; stop it so this run owns the process and its counters`);
  const session = await signIn(email);
  console.log(`[model-gate] ${session.email}, ${fixtures.cases.length} cases, pinned ${pinned.slice(0, 12)}`);

  try {
    // Keyword only: the worker is down, so the route falls back and says so.
    const lexical = new Map<string, SearchBody>();
    for (const c of fixtures.cases) {
      const body = await search(base, session.accessToken, c);
      if (body.httpStatus !== 200) throw new Error(`case ${c.id} answered ${body.httpStatus}: ${body.message ?? "no message"}`);
      if (body.mode !== "lexical") throw new Error(`case ${c.id} used ${body.mode} with the worker stopped`);
      lexical.set(c.id, body);
    }

    await worker.start();
    const scoredBefore = await worker.scored();
    const hybrid = new Map<string, SearchBody>();
    const answered: SearchBody[] = [];
    for (const c of fixtures.cases) {
      const body = await search(base, session.accessToken, c);
      if (body.httpStatus !== 200) throw new Error(`case ${c.id} answered ${body.httpStatus}: ${body.message ?? "no message"}`);
      hybrid.set(c.id, body);
      answered.push(body);
    }
    const scoredAfter = await worker.scored();

    const outcomes: CaseOutcome[] = fixtures.cases.map((c) => {
      const lex = lexical.get(c.id) as SearchBody;
      const hyb = hybrid.get(c.id) as SearchBody;
      const lexicalRank = rankOf(lex.cards ?? [], c.expect);
      const hybridRank = rankOf(hyb.cards ?? [], c.expect);
      return {
        id: c.id,
        lexicalRank,
        hybridRank,
        reordered: order(lex.cards) !== order(hyb.cards),
        recovered: lexicalRank === null && hybridRank !== null,
        mode: hyb.mode,
      };
    });

    const reported = answered.map((b) => b.modelRevision).find((r) => typeof r === "string" && r) ?? "";
    const verdict = modelVerdict(
      { outcomes, reportedModelRevision: reported, pinnedModelRevision: pinned, workerScoredBefore: scoredBefore, workerScoredAfter: scoredAfter },
      fixtures.thresholds,
    );

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    mkdirSync(out, { recursive: true });
    const record = {
      schemaVersion: 1,
      ranAt: new Date().toISOString(),
      base,
      fixtures: FIXTURES,
      corpusRevision: answered[0]?.corpusRevision ?? null,
      pinnedModelRevision: pinned,
      reportedModelRevision: reported,
      workerScored: scoredAfter - scoredBefore,
      thresholds: fixtures.thresholds,
      outcomes,
      verdict,
      cards: fixtures.cases.map((c) => ({
        id: c.id,
        expect: c.expect,
        keyword: (lexical.get(c.id)?.cards ?? []).map((k) => k.slug ?? k.sourceId ?? ""),
        neural: (hybrid.get(c.id)?.cards ?? []).map((k) => k.slug ?? k.sourceId ?? ""),
      })),
    };
    writeFileSync(path.join(out, `model-${stamp}.json`), `${JSON.stringify(record, null, 2)}\n`);
    const rank = (v: number | null) => (v === null ? "absent" : String(v));
    const md = [
      `# Evidence search model gate, ${record.ranAt}`,
      "",
      `Corpus \`${String(record.corpusRevision).slice(0, 12)}\`, model \`${pinned.slice(0, 12)}\`, ${outcomes.length} cases from \`${FIXTURES}\`. The worker scored ${record.workerScored} requests.`,
      "",
      checksTable(verdict.checks),
      "",
      "Retrieval usefulness, measured here and owned by the Quality gate:",
      "",
      checksTable(verdict.signals),
      "",
      "| Case | keyword rank | neural rank | reordered |",
      "|---|---|---|---|",
      ...outcomes.map((o) => `| ${o.id} | ${rank(o.lexicalRank)} | ${rank(o.hybridRank)} | ${o.reordered ? "yes" : "no"} |`),
      "",
    ].join("\n");
    writeFileSync(path.join(out, `model-${stamp}.md`), md);
    console.log(`\n${md}`);
    console.log(`[model-gate] ${path.join(out, `model-${stamp}.md`)}`);
    return verdict.pass ? 0 : 1;
  } finally {
    await worker.stop();
  }
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(`[model-gate] ${e instanceof Error ? e.message : String(e)}`);
    process.exit(2);
  },
);
