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

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.get(1).map(String::as_str) == Some("--version") {
        println!("{} sqlite {}", env!("CARGO_PKG_VERSION"), rusqlite::version());
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
