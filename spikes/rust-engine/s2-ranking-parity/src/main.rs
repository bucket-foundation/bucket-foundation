use base64::Engine;
use bucket_rank_spike::{cosine_rank, cosine_rank_f32, lower, query_words, token_rank, Hit};
use regex::Regex;
use serde::Deserialize;
use serde_json::json;
use std::collections::BTreeMap;
use std::io::{BufRead, BufReader};

#[derive(Deserialize)]
struct Case {
    kind: String,
    class: String,
    #[serde(default)]
    texts: Vec<String>,
    #[serde(default)]
    query: String,
    #[serde(default)]
    vecs: Vec<String>,
    #[serde(default)]
    q: String,
    #[serde(default)]
    top_k: usize,
    #[serde(default)]
    expect: Vec<(u32, String)>,
    #[serde(default)]
    s: String,
    #[serde(default)]
    lowered: String,
    #[serde(default)]
    index: Option<String>,
    #[serde(default)]
    table: BTreeMap<String, String>,
}

#[derive(Deserialize)]
struct Index {
    texts: Vec<String>,
    vecs: Vec<String>,
}

#[derive(Default)]
struct Tally {
    cases: u64,
    ids: u64,
    scores: u64,
    panics: u64,
    first: Option<serde_json::Value>,
}

fn floats(b64: &str) -> Vec<f32> {
    let bytes = base64::engine::general_purpose::STANDARD.decode(b64).expect("base64");
    bytes.chunks_exact(4).map(|c| f32::from_le_bytes([c[0], c[1], c[2], c[3]])).collect()
}

fn bits(hits: &[Hit]) -> Vec<(u32, String)> {
    hits.iter().map(|h| (h.0, format!("{:016x}", h.1.to_bits()))).collect()
}

fn regex_rank(texts: &[String], query: &str, top_k: usize, boundary: &str) -> Vec<Hit> {
    let words = query_words(query);
    if words.is_empty() {
        return Vec::new();
    }
    let res: Vec<Regex> = words.iter().map(|w| Regex::new(&format!("{boundary}{}{boundary}", regex::escape(w))).expect("regex")).collect();
    let mut hits: Vec<Hit> = texts
        .iter()
        .enumerate()
        .map(|(i, t)| {
            let l = lower(t);
            (i as u32, res.iter().map(|r| r.find_iter(&l).count()).sum::<usize>() as f64)
        })
        .collect();
    hits.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    hits.truncate(top_k);
    hits
}

fn record(t: &mut Tally, got: Option<Vec<Hit>>, expect: &[(u32, String)], case: &Case, line: usize) {
    t.cases += 1;
    let Some(got) = got else {
        t.panics += 1;
        return;
    };
    let got = bits(&got);
    let ids_equal = got.len() == expect.len() && got.iter().zip(expect).all(|(a, b)| a.0 == b.0);
    let scores_equal = got.len() == expect.len() && got.iter().zip(expect).all(|(a, b)| a.1 == b.1);
    if !ids_equal {
        t.ids += 1;
    }
    if !scores_equal {
        t.scores += 1;
    }
    if (!ids_equal || !scores_equal) && t.first.is_none() {
        let n = got.iter().zip(expect).position(|(a, b)| a != b).unwrap_or(0);
        t.first = Some(json!({"line": line, "query": case.query, "text": case.texts.get(got.get(n).map(|g| g.0 as usize).unwrap_or(0)), "got": got.get(n), "expect": expect.get(n)}));
    }
}

static QUIET: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);

fn guarded<F: FnOnce() -> Vec<Hit> + std::panic::UnwindSafe>(f: F) -> Option<Vec<Hit>> {
    QUIET.store(true, std::sync::atomic::Ordering::SeqCst);
    let r = std::panic::catch_unwind(f).ok();
    QUIET.store(false, std::sync::atomic::Ordering::SeqCst);
    r
}

fn main() {
    let default_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        if !QUIET.load(std::sync::atomic::Ordering::SeqCst) {
            default_hook(info);
        }
    }));
    let path = std::env::args().nth(1).expect("usage: s2-parity <cases.jsonl>");
    let dir = std::path::Path::new(&path).parent().map(|p| p.to_path_buf()).unwrap_or_default();
    let mut tallies: BTreeMap<String, Tally> = BTreeMap::new();
    let mut indexes: BTreeMap<String, (Vec<String>, Vec<Vec<f32>>)> = BTreeMap::new();
    let mut lower_cases = 0u64;
    let mut lower_diff: Vec<serde_json::Value> = Vec::new();
    let file = BufReader::new(std::fs::File::open(&path).expect("open cases"));
    for (n, line) in file.lines().enumerate() {
        let line = line.expect("read");
        if line.is_empty() {
            continue;
        }
        let c: Case = serde_json::from_str(&line).unwrap_or_else(|e| panic!("line {}: {e}", n + 1));
        let (texts, vecs): (Vec<String>, Vec<Vec<f32>>) = match &c.index {
            Some(name) => indexes
                .entry(name.clone())
                .or_insert_with(|| {
                    let raw = std::fs::read_to_string(dir.join(name)).expect("index file");
                    let ix: Index = serde_json::from_str(&raw).expect("index json");
                    (ix.texts, ix.vecs.iter().map(|v| floats(v)).collect())
                })
                .clone(),
            None => (c.texts.clone(), c.vecs.iter().map(|v| floats(v)).collect()),
        };
        match c.kind.as_str() {
            "token" => {
                let key = |v: &str| format!("token/{}/{v}", c.class);
                record(tallies.entry(key("ascii-boundary scan")).or_default(), Some(token_rank(&texts, &c.query, c.top_k)), &c.expect, &c, n + 1);
                record(tallies.entry(key("regex unicode \\b")).or_default(), Some(regex_rank(&texts, &c.query, c.top_k, r"\b")), &c.expect, &c, n + 1);
                record(tallies.entry(key("regex (?-u:\\b)")).or_default(), Some(regex_rank(&texts, &c.query, c.top_k, r"(?-u:\b)")), &c.expect, &c, n + 1);
            }
            "cosine" => {
                let q = floats(&c.q);
                let key = |v: &str| format!("cosine/{}/{v}", c.class);
                let (v1, q1, k) = (vecs.clone(), q.clone(), c.top_k);
                record(tallies.entry(key("f64 accumulator")).or_default(), guarded(move || cosine_rank(&v1, &q1, k)), &c.expect, &c, n + 1);
                let (v2, q2) = (vecs.clone(), q.clone());
                record(tallies.entry(key("f32 accumulator")).or_default(), guarded(move || cosine_rank_f32(&v2, &q2, k)), &c.expect, &c, n + 1);
            }
            "lower" => {
                lower_cases += 1;
                let got = lower(&c.s);
                if got != c.lowered {
                    lower_diff.push(json!({"class": c.class, "s": c.s.escape_unicode().to_string(), "rust": got.escape_unicode().to_string(), "js": c.lowered.escape_unicode().to_string()}));
                }
            }
            "lowertable" => {
                for cp in 0..=0x10ffffu32 {
                    let Some(ch) = char::from_u32(cp) else { continue };
                    lower_cases += 1;
                    let got: String = ch.to_lowercase().collect();
                    let want = c.table.get(&format!("{cp:x}")).cloned().unwrap_or_else(|| ch.to_string());
                    if got != want {
                        lower_diff.push(json!({"class": c.class, "s": format!("U+{cp:04X}"), "rust": got.escape_unicode().to_string(), "js": want.escape_unicode().to_string()}));
                    }
                }
            }
            other => panic!("unknown kind {other}"),
        }
    }
    let rows: Vec<serde_json::Value> = tallies
        .iter()
        .map(|(k, t)| json!({"variant": k, "cases": t.cases, "id_or_order_mismatches": t.ids, "score_bit_mismatches": t.scores, "panics": t.panics, "first": t.first}))
        .collect();
    println!(
        "{}",
        serde_json::to_string_pretty(&json!({
            "target": format!("{}-{}", std::env::consts::OS, std::env::consts::ARCH),
            "rows": rows,
            "lowercase": {"cases": lower_cases, "mismatches": lower_diff.len(), "mismatches_touching_ascii": lower_diff.iter().filter(|v| ["rust", "js"].iter().any(|k| v.get(*k).and_then(|x| x.as_str()).map(|x| x.split("\\u{").skip(1).any(|h| u32::from_str_radix(h.trim_end_matches('}'), 16).map(|n| n < 128).unwrap_or(false)) || !x.contains("\\u{")).unwrap_or(false))).count(), "mismatches_in_context_strings": lower_diff.iter().filter(|v| v.get("class").and_then(|c| c.as_str()) == Some("context strings") || v.is_null()).count(), "examples": lower_diff},
        }))
        .expect("json")
    );
}
