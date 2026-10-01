use rusqlite::{params, Connection, ErrorCode, TransactionBehavior};
use serde_json::json;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::Path;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

const WRITER: &str = "rust";

fn now_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}

fn open(path: &str) -> rusqlite::Result<Connection> {
    let db = Connection::open(path)?;
    db.pragma_update(None, "journal_mode", "wal")?;
    db.pragma_update(None, "foreign_keys", "on")?;
    db.pragma_update(None, "secure_delete", "on")?;
    db.pragma_update(None, "busy_timeout", 5000)?;
    Ok(db)
}

fn append(path: &str, line: &str) {
    let mut f = OpenOptions::new().create(true).append(true).open(path).expect("open log");
    f.write_all(line.as_bytes()).expect("write log");
}

fn describe(e: &rusqlite::Error) -> (String, i32) {
    match e {
        rusqlite::Error::SqliteFailure(f, _) => {
            let name = match f.code {
                ErrorCode::DatabaseBusy => "busy",
                ErrorCode::DatabaseLocked => "locked",
                _ => "other",
            };
            (name.to_string(), f.extended_code)
        }
        _ => ("other".to_string(), -1),
    }
}

struct Rng(u64);

impl Rng {
    fn next(&mut self) -> u64 {
        self.0 ^= self.0 << 13;
        self.0 ^= self.0 >> 7;
        self.0 ^= self.0 << 17;
        self.0
    }
}

fn insert(db: &mut Connection, seq: i64, pid: u32) -> rusqlite::Result<()> {
    let tx = db.transaction_with_behavior(TransactionBehavior::Immediate)?;
    tx.execute(
        "insert into rows (writer, seq, pid, payload, at) values (?, ?, ?, ?, ?)",
        params![WRITER, seq, pid, format!("{WRITER}-{seq}-{}", "x".repeat(48)), now_ms() as i64],
    )?;
    tx.execute(
        "insert into totals (writer, n) values (?, 1) on conflict(writer) do update set n = n + 1",
        params![WRITER],
    )?;
    tx.commit()
}

fn read_then_write(db: &mut Connection, pid: u32) -> rusqlite::Result<()> {
    let tx = db.transaction_with_behavior(TransactionBehavior::Deferred)?;
    let n: i64 = tx.query_row("select count(*) from scratch", [], |r| r.get(0))?;
    std::thread::sleep(Duration::from_millis(1));
    tx.execute("insert into scratch (writer, pid, seen, at) values (?, ?, ?, ?)", params![WRITER, pid, n, now_ms() as i64])?;
    tx.execute(
        "delete from scratch where rowid in (select rowid from scratch where writer = ? order by rowid limit max(0, (select count(*) from scratch where writer = ?) - 200))",
        params![WRITER, WRITER],
    )?;
    tx.commit()
}

fn write_loop(path: &str, dir: &str) -> rusqlite::Result<()> {
    let pid = std::process::id();
    let events = format!("{dir}/events-{WRITER}.jsonl");
    let acks = format!("{dir}/acks-{WRITER}.txt");
    let stop = format!("{dir}/stop");
    let started = Instant::now();
    let mut db = open(path)?;
    let sync: i64 = db.query_row("pragma synchronous", [], |r| r.get(0))?;
    let mut seq: i64 = db.query_row("select coalesce(max(seq), 0) from rows where writer = ?", params![WRITER], |r| r.get(0))?;
    append(&events, &format!("{}\n", json!({"e": "start", "pid": pid, "at": now_ms(), "resume_seq": seq, "open_ms": started.elapsed().as_millis() as u64, "synchronous": sync, "sqlite": rusqlite::version()})));
    let mut rng = Rng(now_ms() ^ ((pid as u64) << 20) | 1);
    let mut ops: u64 = 0;
    while !Path::new(&stop).exists() {
        ops += 1;
        let t = Instant::now();
        let deferred = ops % 10 == 0;
        let r = if deferred { read_then_write(&mut db, pid) } else { insert(&mut db, seq + 1, pid) };
        let ms = t.elapsed().as_millis() as u64;
        match r {
            Ok(()) => {
                if !deferred {
                    seq += 1;
                    append(&acks, &format!("{seq}\n"));
                }
                if ms >= 250 {
                    append(&events, &format!("{}\n", json!({"e": "slow", "pid": pid, "ms": ms, "deferred": deferred})));
                }
            }
            Err(e) => {
                let (kind, code) = describe(&e);
                append(&events, &format!("{}\n", json!({"e": "error", "pid": pid, "kind": kind, "code": code, "ms": ms, "deferred": deferred, "msg": e.to_string()})));
            }
        }
        std::thread::sleep(Duration::from_millis(rng.next() % 4));
    }
    append(&events, &format!("{}\n", json!({"e": "stop", "pid": pid, "at": now_ms()})));
    Ok(())
}

fn read_loop(path: &str, dir: &str) -> rusqlite::Result<()> {
    let pid = std::process::id();
    let events = format!("{dir}/events-reader.jsonl");
    let stop = format!("{dir}/stop");
    let mut db = Connection::open_with_flags(path, rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY)?;
    db.pragma_update(None, "busy_timeout", 5000)?;
    append(&events, &format!("{}\n", json!({"e": "start", "pid": pid, "at": now_ms(), "resume_seq": 0, "open_ms": 0, "synchronous": 0, "sqlite": rusqlite::version()})));
    let mut rng = Rng(now_ms() | 1);
    let mut reads: u64 = 0;
    while !Path::new(&stop).exists() {
        let t = Instant::now();
        let r: rusqlite::Result<Vec<(String, i64, i64, i64, i64)>> = (|| {
            let tx = db.transaction_with_behavior(TransactionBehavior::Deferred)?;
            let rows = {
                let mut stmt = tx.prepare(
                    "select t.writer, t.n, (select count(*) from rows r where r.writer = t.writer), (select count(distinct seq) from rows r where r.writer = t.writer), (select coalesce(max(seq), 0) from rows r where r.writer = t.writer) from totals t",
                )?;
                let out = stmt.query_map([], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)))?.collect::<rusqlite::Result<Vec<_>>>()?;
                out
            };
            tx.commit()?;
            Ok(rows)
        })();
        let ms = t.elapsed().as_millis() as u64;
        match r {
            Ok(rows) => {
                reads += 1;
                for (writer, n, count, distinct, max) in rows {
                    if n != count || count != distinct || distinct != max {
                        append(&events, &format!("{}\n", json!({"e": "inconsistent", "pid": pid, "writer": writer, "totals": n, "rows": count, "distinct": distinct, "max": max})));
                    }
                }
                if reads % 200 == 0 {
                    append(&events, &format!("{}\n", json!({"e": "reads", "pid": pid, "n": 200})));
                }
                if ms >= 250 {
                    append(&events, &format!("{}\n", json!({"e": "slow", "pid": pid, "ms": ms, "deferred": true})));
                }
            }
            Err(e) => {
                let (kind, code) = describe(&e);
                append(&events, &format!("{}\n", json!({"e": "error", "pid": pid, "kind": kind, "code": code, "ms": ms, "deferred": true, "msg": e.to_string()})));
            }
        }
        std::thread::sleep(Duration::from_millis(rng.next() % 20));
    }
    Ok(())
}

fn verify(path: &str) -> rusqlite::Result<()> {
    let db = open(path)?;
    let integrity: String = db.query_row("pragma integrity_check", [], |r| r.get(0))?;
    let fk: i64 = db.prepare("pragma foreign_key_check")?.query_map([], |_| Ok(()))?.count() as i64;
    let mode: String = db.query_row("pragma journal_mode", [], |r| r.get(0))?;
    let mut out = serde_json::Map::new();
    let names: Vec<String> = db.prepare("select writer from totals order by writer")?.query_map([], |r| r.get(0))?.collect::<rusqlite::Result<_>>()?;
    for w in names.iter().map(String::as_str) {
        let (n, distinct, max): (i64, i64, i64) = db.query_row(
            "select count(*), count(distinct seq), coalesce(max(seq), 0) from rows where writer = ?",
            params![w],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )?;
        let total: i64 = db.query_row("select coalesce((select n from totals where writer = ?), 0)", params![w], |r| r.get(0))?;
        out.insert(w.to_string(), json!({"rows": n, "distinct": distinct, "max_seq": max, "totals_n": total}));
    }
    db.execute("insert into scratch (writer, pid, seen, at) values ('verify-rust', ?, 0, ?)", params![std::process::id(), now_ms() as i64])?;
    println!("{}", json!({"reader": "rusqlite", "sqlite": rusqlite::version(), "integrity_check": integrity, "foreign_key_violations": fk, "journal_mode": mode, "writers": out, "write_after": "ok"}));
    Ok(())
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let r = match args.get(1).map(String::as_str) {
        Some("write") => write_loop(&args[2], &args[3]),
        Some("read") => read_loop(&args[2], &args[3]),
        Some("verify") => verify(&args[2]),
        _ => {
            eprintln!("usage: s1-writer write <db> <dir> | read <db> <dir> | verify <db>");
            std::process::exit(2);
        }
    };
    if let Err(e) = r {
        eprintln!("s1-writer: {e}");
        std::process::exit(1);
    }
}
