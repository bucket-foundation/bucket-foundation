import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { cpus, loadavg } from "node:os";
import { join, resolve } from "node:path";

const here = import.meta.dir;
const seconds = Number(process.argv[2] ?? 600);
const dir = resolve(process.argv[3] ?? join(here, "..", ".data", "s1"));
const rustBin = resolve(process.argv[4] ?? join(here, "..", "target", "release", "s1-writer"));
const layout = process.argv[5] ?? "mixed";
const db = join(dir, "two-writers.db");

rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

const pragmas = (d: Database) => {
  d.run("pragma journal_mode = wal");
  d.run("pragma foreign_keys = on");
  d.run("pragma secure_delete = on");
  d.run("pragma busy_timeout = 5000");
};

const setup = new Database(db, { create: true, strict: true });
pragmas(setup);
setup.run(`create table rows (writer text not null, seq integer not null, pid integer not null, payload text not null, at integer not null);
  create index rows_writer_seq on rows(writer, seq);
  create table totals (writer text primary key, n integer not null);
  create table scratch (writer text not null, pid integer not null, seen integer not null, at integer not null);`);
setup.close();

const commands: Record<string, string[]> =
  layout === "bun-writers-rust-reader"
    ? { bun: [process.execPath, join(here, "writer.mts"), db, dir, "bun"], bun2: [process.execPath, join(here, "writer.mts"), db, dir, "bun2"], reader: [rustBin, "read", db, dir] }
    : { bun: [process.execPath, join(here, "writer.mts"), db, dir, "bun"], rust: [rustBin, "write", db, dir] };
const names = Object.keys(commands);
const writerNames = names.filter((n) => n !== "reader");
const procs: Record<string, ReturnType<typeof Bun.spawn>> = {};
const kills: Record<string, number> = Object.fromEntries(names.map((n) => [n, 0]));
const exits: { writer: string; code: number | null; signal: string | null }[] = [];
const start = (w: string) => {
  const p = Bun.spawn(commands[w], { stdout: "inherit", stderr: "inherit" });
  procs[w] = p;
  p.exited.then((code) => {
    if (p.signalCode !== "SIGKILL") exits.push({ writer: w, code, signal: p.signalCode ?? null });
  });
};

const loadBefore = loadavg();
for (const n of names) start(n);
const deadline = Date.now() + seconds * 1000;
let turn = 0;
while (Date.now() < deadline) {
  await Bun.sleep(1500 + Math.random() * 6500);
  if (Date.now() >= deadline) break;
  const w = Math.random() < 0.25 ? names[Math.floor(Math.random() * names.length)] : names[turn++ % names.length];
  procs[w].kill("SIGKILL");
  await procs[w].exited;
  kills[w]++;
  await Bun.sleep(Math.random() * 1500);
  start(w);
}
for (const n of names) procs[n].kill("SIGKILL");
await Promise.all(names.map((n) => procs[n].exited));
const walAfterKill = existsSync(`${db}-wal`) ? statSync(`${db}-wal`).size : 0;

const lines = (f: string) => (existsSync(f) ? readFileSync(f, "utf8").split("\n").filter(Boolean) : []);
const check = new Database(db, { strict: true });
pragmas(check);
const integrity = check.query<{ integrity_check: string }, []>("pragma integrity_check").all().map((r) => r.integrity_check).join("; ");
const fk = check.query("pragma foreign_key_check").all().length;
const writers: Record<string, unknown> = {};
for (const w of writerNames) {
  const r = check.query<{ n: number; d: number; m: number }, [string]>("select count(*) n, count(distinct seq) d, coalesce(max(seq), 0) m from rows where writer = ?").get(w)!;
  const totals = check.query<{ n: number }, [string]>("select n from totals where writer = ?").get(w)?.n ?? 0;
  const present = new Set(check.query<{ seq: number }, [string]>("select seq from rows where writer = ?").all(w).map((x) => x.seq));
  const acked = lines(join(dir, `acks-${w}.txt`)).map(Number);
  const events = lines(join(dir, `events-${w}.jsonl`)).map((l) => JSON.parse(l));
  const errors = events.filter((e) => e.e === "error");
  const tally = (list: { kind: string; code: number; deferred: boolean }[]) => {
    const out: Record<string, number> = {};
    for (const e of list) {
      const k = `${e.kind}:${e.code}:${e.deferred ? "deferred" : "immediate"}`;
      out[k] = (out[k] ?? 0) + 1;
    }
    return out;
  };
  const starts = events.filter((e) => e.e === "start");
  writers[w] = {
    rows: r.n,
    distinct_seq: r.d,
    duplicated_rows: r.n - r.d,
    max_seq: r.m,
    gaps: r.m - r.d,
    acked: acked.length,
    acked_missing: acked.filter((s) => !present.has(s)).length,
    committed_unacked: r.d - new Set(acked).size,
    totals_n: totals,
    totals_match: totals === r.n,
    kills: kills[w],
    starts: starts.length,
    max_open_ms: Math.max(...starts.map((s) => s.open_ms)),
    synchronous: starts[0]?.synchronous,
    sqlite: starts[0]?.sqlite,
    errors: errors.length,
    errors_by_kind: tally(errors),
    deferred_transactions: Math.floor((r.m + errors.filter((e) => !e.deferred).length) / 9),
    busy_under_100ms: errors.filter((e) => e.kind === "busy" && e.ms < 100).length,
    busy_timeouts_5s: errors.filter((e) => e.kind === "busy" && e.ms >= 4900).length,
    slow_over_250ms: events.filter((e) => e.e === "slow").length,
    max_slow_ms: Math.max(0, ...events.filter((e) => e.e === "slow" || e.e === "error").map((e) => e.ms)),
  };
}
const readerEvents = lines(join(dir, "events-reader.jsonl")).map((l) => JSON.parse(l));
const reader =
  layout === "bun-writers-rust-reader"
    ? {
        kills: kills.reader,
        read_transactions_logged: readerEvents.filter((e) => e.e === "reads").reduce((n, e) => n + e.n, 0),
        inconsistent_snapshots: readerEvents.filter((e) => e.e === "inconsistent").length,
        errors: readerEvents.filter((e) => e.e === "error").length,
        error_messages: [...new Set(readerEvents.filter((e) => e.e === "error").map((e) => `${e.kind}:${e.code}`))],
        slow_over_250ms: readerEvents.filter((e) => e.e === "slow").length,
      }
    : undefined;
check.run(`insert into scratch (writer, pid, seen, at) values ('verify-bun', ${process.pid}, 0, ${Date.now()})`);
check.close();

const rust = Bun.spawnSync([rustBin, "verify", db]);
const result = {
  layout,
  seconds,
  cpus: cpus().length,
  load_before: loadBefore,
  load_after: loadavg(),
  wal_bytes_after_final_kill: walAfterKill,
  db_bytes: statSync(db).size,
  unexpected_exits: exits,
  bun_reader: { integrity_check: integrity, foreign_key_violations: fk, write_after: "ok" },
  rust_reader: rust.exitCode === 0 ? JSON.parse(rust.stdout.toString()) : { failed: rust.stderr.toString() },
  writers,
  reader,
};
writeFileSync(join(dir, "result.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
