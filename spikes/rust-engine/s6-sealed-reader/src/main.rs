use aes_gcm::aead::AeadInPlace;
use aes_gcm::{Aes256Gcm, KeyInit, Nonce, Tag};
use base64::Engine;
use rusqlite::types::ValueRef;
use rusqlite::{Connection, OpenFlags};
use serde_json::{json, Value};
use unicode_normalization::UnicodeNormalization;

const PREFIX: &str = "v1:";
const DATA_KEY_ACCOUNT: &str = "db-data-key";
const DEVICE_ACCOUNT: &str = "device-ed25519";

fn open_sealed(key: &[u8], sealed: &str, aad: &str) -> Result<String, String> {
    let body = sealed.strip_prefix(PREFIX).ok_or("unknown ciphertext version")?;
    let raw = base64::engine::general_purpose::STANDARD.decode(body).map_err(|e| e.to_string())?;
    if raw.len() < 28 {
        return Err("ciphertext too short".into());
    }
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| e.to_string())?;
    let mut text = raw[28..].to_vec();
    cipher
        .decrypt_in_place_detached(Nonce::from_slice(&raw[..12]), aad.as_bytes(), &mut text, Tag::from_slice(&raw[12..28]))
        .map_err(|_| "authentication failed".to_string())?;
    String::from_utf8(text).map_err(|e| e.to_string())
}

fn derive_key(passphrase: &str, salt: &[u8]) -> Result<[u8; 32], String> {
    let normal: String = passphrase.nfkc().collect();
    let params = scrypt::Params::new(17, 8, 1, 32).map_err(|e| e.to_string())?;
    let mut out = [0u8; 32];
    scrypt::scrypt(normal.as_bytes(), salt, &params, &mut out).map_err(|e| e.to_string())?;
    Ok(out)
}

fn unhex(s: &str) -> Result<Vec<u8>, String> {
    if s.len() % 2 != 0 {
        return Err("odd hex length".into());
    }
    (0..s.len()).step_by(2).map(|i| u8::from_str_radix(&s[i..i + 2], 16).map_err(|e| e.to_string())).collect()
}

fn aad_for(table: &str, column: &str, row: &serde_json::Map<String, Value>) -> Option<String> {
    let field = |k: &str| match row.get(k) {
        Some(Value::String(s)) => s.clone(),
        Some(Value::Number(n)) => n.to_string(),
        _ => String::new(),
    };
    match (table, column) {
        ("meta", "v") if field("k") == "key_check" => Some("key_check".into()),
        ("attempts", "response_enc") => Some(format!("attempt:{}", field("id"))),
        ("outbox", "payload_enc") => Some(format!("outbox:{}", field("ref_id"))),
        ("hai_answer", "response_enc") => Some(format!("hai:{}", field("id"))),
        ("notes", "doc") => Some(format!("note:{}", field("id"))),
        ("history_snapshot", "doc") => Some("history_snapshot".into()),
        ("daily_quiz", "body") => Some(format!("daily_quiz:{}", field("day"))),
        ("advisor_review", "meta") => Some("advisor_review".into()),
        ("advisor_rows", "data") => Some(format!("advisor_row:{}", field("rank"))),
        ("work_quiz_source", "beads") => Some("work_quiz_beads".into()),
        ("work_quiz_source", "repo") => Some("work_quiz_repo".into()),
        _ => None,
    }
}

fn run(db_path: &str, vault_path: &str, passphrase: &str) -> Result<Value, String> {
    let vault: Value = serde_json::from_str(&std::fs::read_to_string(vault_path).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    let text = |v: &Value, k: &str| v.get(k).and_then(Value::as_str).map(str::to_string).ok_or(format!("vault has no {k}"));
    let salt = base64::engine::general_purpose::STANDARD.decode(text(&vault, "salt")?).map_err(|e| e.to_string())?;
    let started = std::time::Instant::now();
    let vault_key = derive_key(passphrase, &salt)?;
    let scrypt_ms = started.elapsed().as_millis() as u64;
    let check = open_sealed(&vault_key, &text(&vault, "check")?, "check")?;
    let entries = vault.get("entries").ok_or("vault has no entries")?;
    let data_key = unhex(&open_sealed(&vault_key, &text(entries, DATA_KEY_ACCOUNT)?, DATA_KEY_ACCOUNT)?)?;
    let device_pem = open_sealed(&vault_key, &text(entries, DEVICE_ACCOUNT)?, DEVICE_ACCOUNT)?;
    let wrong_passphrase = derive_key(&format!("{passphrase}x"), &salt).and_then(|k| open_sealed(&k, &text(&vault, "check")?, "check")).is_err();

    let db = Connection::open_with_flags(db_path, OpenFlags::SQLITE_OPEN_READ_ONLY).map_err(|e| e.to_string())?;
    let user_version: i64 = db.query_row("pragma user_version", [], |r| r.get(0)).map_err(|e| e.to_string())?;
    let journal_mode: String = db.query_row("pragma journal_mode", [], |r| r.get(0)).map_err(|e| e.to_string())?;
    let tables: Vec<String> = db
        .prepare("select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name")
        .and_then(|mut s| s.query_map([], |r| r.get(0))?.collect())
        .map_err(|e| e.to_string())?;
    let mut cells: Vec<Value> = Vec::new();
    let mut failures: Vec<Value> = Vec::new();
    let mut counts = serde_json::Map::new();
    let mut wrong_key_rejected = 0u64;
    let mut wrong_aad_rejected = 0u64;
    let mut bad_key = data_key.clone();
    bad_key[0] ^= 1;
    for table in &tables {
        let mut stmt = db.prepare(&format!("select * from \"{table}\"")).map_err(|e| e.to_string())?;
        let names: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();
        let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
        while let Some(r) = rows.next().map_err(|e| e.to_string())? {
            let mut row = serde_json::Map::new();
            for (i, n) in names.iter().enumerate() {
                let v = match r.get_ref(i).map_err(|e| e.to_string())? {
                    ValueRef::Text(t) => Value::String(String::from_utf8_lossy(t).into_owned()),
                    ValueRef::Integer(n) => json!(n),
                    ValueRef::Real(f) => json!(f),
                    _ => Value::Null,
                };
                row.insert(n.clone(), v);
            }
            for n in &names {
                let Some(Value::String(sealed)) = row.get(n) else { continue };
                if !sealed.starts_with(PREFIX) {
                    continue;
                }
                let name = format!("{table}.{n}");
                *counts.entry(name.clone()).or_insert(json!(0)) = json!(counts.get(&name).and_then(Value::as_u64).unwrap_or(0) + 1);
                let Some(aad) = aad_for(table, n, &row) else {
                    failures.push(json!({"cell": name, "why": "no associated-data rule"}));
                    continue;
                };
                match open_sealed(&data_key, sealed, &aad) {
                    Ok(plain) => {
                        if open_sealed(&bad_key, sealed, &aad).is_err() {
                            wrong_key_rejected += 1;
                        }
                        if open_sealed(&data_key, sealed, &format!("{aad}x")).is_err() {
                            wrong_aad_rejected += 1;
                        }
                        cells.push(json!({"cell": name, "aad": aad, "sealed": sealed, "plaintext": plain}));
                    }
                    Err(why) => failures.push(json!({"cell": name, "aad": aad, "why": why})),
                }
            }
        }
    }
    Ok(json!({
        "target": format!("{}-{}", std::env::consts::OS, std::env::consts::ARCH),
        "sqlite": rusqlite::version(),
        "user_version": user_version,
        "journal_mode": journal_mode,
        "scrypt_ms": scrypt_ms,
        "vault": {"check": check, "data_key_bytes": data_key.len(), "device_key_is_pem": device_pem.starts_with("-----BEGIN PRIVATE KEY-----"), "wrong_passphrase_rejected": wrong_passphrase},
        "tables": tables.len(),
        "sealed_columns": counts,
        "opened": cells.len(),
        "failures": failures,
        "wrong_key_rejected": wrong_key_rejected,
        "wrong_aad_rejected": wrong_aad_rejected,
        "cells": cells,
    }))
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 4 {
        eprintln!("usage: s6-sealed-reader <bkt.db> <keyring.json> <passphrase>");
        std::process::exit(2);
    }
    match run(&args[1], &args[2], &args[3]) {
        Ok(v) => println!("{v}"),
        Err(e) => {
            eprintln!("s6-sealed-reader: {e}");
            std::process::exit(1);
        }
    }
}
