import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { acquireLock, httpApi, latestEntries, parsePending, reconcile, type Report } from "./dispatch";

const ROOT = path.resolve(__dirname, "..", "..");
const INSTANCE_API = "https://bucket-foundation.nucleus.agfarms.dev";

interface Args {
  sources: string[];
  apply: boolean;
  api: string | null;
  pending: string;
  ledger: string;
  timeoutMs: number;
}

function parseArgs(argv: string[]): Args {
  const a: Args = {
    sources: [],
    apply: false,
    api: null,
    pending: path.join(ROOT, "BEADS-PENDING.jsonl"),
    ledger: path.join(ROOT, "BEADS-DISPATCHED.jsonl"),
    timeoutMs: 30_000,
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${flag} needs a value`);
      return v;
    };
    if (flag === "--source") a.sources.push(value());
    else if (flag === "--apply") a.apply = true;
    else if (flag === "--api") a.api = value();
    else if (flag === "--pending") a.pending = path.resolve(value());
    else if (flag === "--ledger") a.ledger = path.resolve(value());
    else if (flag === "--timeout-ms") a.timeoutMs = Number(value());
    else throw new Error(`unknown flag ${flag}`);
  }
  if (!a.sources.length) throw new Error("name a source: --source research-os-ai");
  if (!Number.isFinite(a.timeoutMs) || a.timeoutMs < 1000) throw new Error("--timeout-ms must be 1000 or more");
  return a;
}

function readJson(file: string): Record<string, unknown> | null {
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8"));
}

function forbidden(url: string): string | null {
  for (const file of [path.join(homedir(), "agfarms", ".nucleus", "config.json"), path.join(ROOT, ".nucleus", "config.json")]) {
    const list = readJson(file)?.forbidden_urls;
    if (!Array.isArray(list)) continue;
    for (const f of list) if (typeof f === "string" && f && url.startsWith(f)) return `${f} (${file})`;
  }
  return null;
}

function print(report: Report, apply: boolean): number {
  let attention = 0;
  for (const r of report.rows) {
    const bad = ["uncertain", "failed", "ambiguous", "missing"].includes(r.outcome) || r.edges === "waiting";
    if (bad) attention++;
    const edges = r.edges === "none" ? "" : `/${r.edges}`;
    console.log(`  [${r.outcome}${edges}] ${r.key}${r.id ? ` -> ${r.id}` : ""}${r.detail.length ? `  ${r.detail.join("; ")}` : ""}`);
  }
  for (const c of report.conditions) console.log(`  condition on ${c.title.split(": ")[0]}: ${c.condition} (a person checks it; the queue holds no edge for it)`);
  const count = (f: (r: Report["rows"][number]) => boolean) => report.rows.filter(f).length;
  console.log(
    `[dispatch] ${apply ? "applied" : "dry run"}: ${report.rows.length} rows, ${report.posts} create requests, ` +
      `${count((r) => r.edges === "retired")} retired, ${count((r) => r.outcome === "would_create")} to create, ${attention} need attention`,
  );
  return attention ? 1 : 0;
}

async function main(): Promise<number> {
  let args: Args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`[dispatch] ${e instanceof Error ? e.message : e}`);
    return 2;
  }
  const remote = readJson(path.join(ROOT, ".beads", "remote.json"));
  const api = args.api ?? (typeof remote?.api_url === "string" ? remote.api_url : INSTANCE_API);
  const blocked = forbidden(api);
  if (blocked) {
    console.error(`[dispatch] ${api} is forbidden by ${blocked}`);
    return 2;
  }
  const user = process.env.NUCLEUS_ADMIN_USER;
  const password = process.env.NUCLEUS_ADMIN_PASSWORD;
  if (!user || !password) {
    console.error("[dispatch] export NUCLEUS_ADMIN_USER and NUCLEUS_ADMIN_PASSWORD");
    return 2;
  }
  if (!existsSync(args.pending)) {
    console.error(`[dispatch] no pending file at ${args.pending}`);
    return 2;
  }
  let release = () => {};
  try {
    if (args.apply) release = acquireLock(path.join(tmpdir(), "bkt-beads-dispatch.lock"));
    const { rows, problems } = parsePending(readFileSync(args.pending, "utf8"), args.sources);
    for (const p of problems) console.log(`  [pending] ${p}`);
    const ledger = latestEntries(existsSync(args.ledger) ? readFileSync(args.ledger, "utf8") : "");
    console.log(`[dispatch] ${rows.length} rows from ${args.sources.join(", ")} against ${api}`);
    const report = await reconcile(rows, ledger, httpApi(api, { user, password }, args.timeoutMs), {
      apply: args.apply,
      record: (e) => appendFileSync(args.ledger, `${JSON.stringify(e)}\n`),
    });
    return print(report, args.apply);
  } catch (e) {
    console.error(`[dispatch] stopped: ${e instanceof Error ? e.message : e}`);
    return 2;
  } finally {
    release();
  }
}

main().then((code) => process.exit(code));
