use bucket_rank_spike::token_rank;
use rusqlite::{Connection, OpenFlags};

fn search(path: &str, query: &str, top_k: usize) -> rusqlite::Result<String> {
    let db = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY)?;
    let version: String = db.query_row("select v from meta where k = 'canon_pack_version'", [], |r| r.get(0))?;
    let mut stmt = db.prepare("select id, text from canon_excerpts order by id")?;
    let rows: Vec<(i64, String)> = stmt.query_map([], |r| Ok((r.get(0)?, r.get(1)?)))?.collect::<rusqlite::Result<_>>()?;
    let texts: Vec<&str> = rows.iter().map(|r| r.1.as_str()).collect();
    let hits = token_rank(&texts, query, top_k);
    let body: Vec<String> = hits.iter().map(|(i, score)| format!("[{},{}]", rows[*i as usize].0, score)).collect();
    Ok(format!("{{\"v\":1,\"pack\":\"{version}\",\"excerpts\":{},\"results\":[{}]}}", rows.len(), body.join(",")))
}

fn selftest() -> rusqlite::Result<String> {
    let db = Connection::open_in_memory()?;
    db.execute_batch(
        "create table canon_excerpts (id integer primary key, text text not null);
         insert into canon_excerpts (id, text) values (7, 'Speed of light. Light moves at one speed.'), (9, 'Entropy counts microstates.'), (11, 'LIGHT ejects electrons.');",
    )?;
    let mut stmt = db.prepare("select id, text from canon_excerpts order by id")?;
    let rows: Vec<(i64, String)> = stmt.query_map([], |r| Ok((r.get(0)?, r.get(1)?)))?.collect::<rusqlite::Result<_>>()?;
    let texts: Vec<&str> = rows.iter().map(|r| r.1.as_str()).collect();
    let body: Vec<String> = token_rank(&texts, "light", 3).iter().map(|(i, score)| format!("[{},{}]", rows[*i as usize].0, score)).collect();
    Ok(format!("{{\"target\":\"{}-{}\",\"sqlite\":\"{}\",\"results\":[{}]}}", std::env::consts::OS, std::env::consts::ARCH, rusqlite::version(), body.join(",")))
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.get(1).map(String::as_str) == Some("--version") {
        println!("{} sqlite {}", env!("CARGO_PKG_VERSION"), rusqlite::version());
        return;
    }
    if args.get(1).map(String::as_str) == Some("--selftest") {
        match selftest() {
            Ok(out) if out.ends_with("\"results\":[[7,2],[11,1],[9,0]]}") => println!("{out}"),
            Ok(out) => {
                eprintln!("engine-min: selftest returned {out}");
                std::process::exit(1);
            }
            Err(e) => {
                eprintln!("engine-min: {e}");
                std::process::exit(1);
            }
        }
        return;
    }
    if args.len() < 3 {
        eprintln!("usage: engine-min <canon.db> <query> [top_k] | --version");
        std::process::exit(2);
    }
    let top_k = args.get(3).and_then(|s| s.parse().ok()).unwrap_or(10);
    match search(&args[1], &args[2], top_k) {
        Ok(out) => println!("{out}"),
        Err(e) => {
            eprintln!("engine-min: {e}");
            std::process::exit(1);
        }
    }
}
