import { Database } from "bun:sqlite";
import { appendFileSync, existsSync } from "node:fs";

const [path, dir, name] = process.argv.slice(2);
const WRITER = name ?? "bun";
const events = `${dir}/events-${WRITER}.jsonl`;
const acks = `${dir}/acks-${WRITER}.txt`;
const stop = `${dir}/stop`;
const pid = process.pid;
const log = (o: Record<string, unknown>) => appendFileSync(events, JSON.stringify(o) + "\n");

const started = performance.now();
const db = new Database(path, { create: true, strict: true });
db.run("pragma journal_mode = wal");
db.run("pragma foreign_keys = on");
db.run("pragma secure_delete = on");
db.run("pragma busy_timeout = 5000");

const sync = db.query<{ synchronous: number }, []>("pragma synchronous").get()!.synchronous;
const version = db.query<{ v: string }, []>("select sqlite_version() v").get()!.v;
let seq = db.query<{ m: number }, [string]>("select coalesce(max(seq), 0) m from rows where writer = ?").get(WRITER)!.m;
log({ e: "start", pid, at: Date.now(), resume_seq: seq, open_ms: Math.round(performance.now() - started), synchronous: sync, sqlite: version, bun: Bun.version });

const insRow = db.query("insert into rows (writer, seq, pid, payload, at) values (?, ?, ?, ?, ?)");
const bump = db.query("insert into totals (writer, n) values (?, 1) on conflict(writer) do update set n = n + 1");
const insert = db.transaction((n: number) => {
  insRow.run(WRITER, n, pid, `${WRITER}-${n}-${"x".repeat(48)}`, Date.now());
  bump.run(WRITER);
});
const count = db.query<{ n: number }, []>("select count(*) n from scratch");
const insScratch = db.query("insert into scratch (writer, pid, seen, at) values (?, ?, ?, ?)");
const trim = db.query(
  "delete from scratch where rowid in (select rowid from scratch where writer = ? order by rowid limit max(0, (select count(*) from scratch where writer = ?) - 200))",
);
const readThenWrite = db.transaction(() => {
  const n = count.get()!.n;
  Bun.sleepSync(1);
  insScratch.run(WRITER, pid, n, Date.now());
  trim.run(WRITER, WRITER);
});

let ops = 0;
while (!existsSync(stop)) {
  ops++;
  const t = performance.now();
  const deferred = ops % 10 === 0;
  try {
    if (deferred) readThenWrite();
    else insert.immediate(seq + 1);
    const ms = Math.round(performance.now() - t);
    if (!deferred) {
      seq++;
      appendFileSync(acks, `${seq}\n`);
    }
    if (ms >= 250) log({ e: "slow", pid, ms, deferred });
  } catch (err) {
    const e = err as { code?: string; errno?: number; message?: string };
    const kind = String(e.code ?? "").startsWith("SQLITE_BUSY") ? "busy" : String(e.code ?? "").startsWith("SQLITE_LOCKED") ? "locked" : "other";
    log({ e: "error", pid, kind, code: e.errno ?? -1, name: e.code ?? null, ms: Math.round(performance.now() - t), deferred, msg: e.message ?? String(err) });
  }
  Bun.sleepSync(Math.floor(Math.random() * 4));
}
log({ e: "stop", pid, at: Date.now() });
db.close();
