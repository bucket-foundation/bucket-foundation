use base64::Engine;
use sha2::{Digest, Sha256};
use std::env;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{exit, Command, Stdio};
use std::time::{Duration, Instant};

const BUILD_TAG: &str = match option_env!("SPIKE_BUILD_TAG") {
    Some(t) => t,
    None => "v1",
};

const EXIT_MISSING: i32 = 44;
const EXIT_LOCKED: i32 = 45;

pub enum Read {
    Found(Vec<u8>),
    Missing,
    Locked(String),
    Failed(String),
}

pub fn service() -> String {
    env::var("SPIKE_SERVICE").unwrap_or_else(|_| "bucket-bkt".to_string())
}

pub fn b64(bytes: &[u8]) -> String {
    base64::engine::general_purpose::STANDARD.encode(bytes)
}

pub fn unb64(text: &[u8]) -> Option<Vec<u8>> {
    let trimmed = String::from_utf8_lossy(text).trim().to_string();
    base64::engine::general_purpose::STANDARD.decode(trimmed).ok()
}

pub fn sha(bytes: &[u8]) -> String {
    hex(&Sha256::digest(bytes))
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

fn unhex(text: &str) -> Vec<u8> {
    let t = text.trim();
    (0..t.len() / 2).filter_map(|i| u8::from_str_radix(&t[2 * i..2 * i + 2], 16).ok()).collect()
}

pub struct ToolOutput {
    pub code: i32,
    pub stdout: Vec<u8>,
    pub stderr: String,
}

pub fn tool(argv: &[&str], stdin: Option<&[u8]>) -> ToolOutput {
    let mut cmd = Command::new(argv[0]);
    cmd.args(&argv[1..]).stdout(Stdio::piped()).stderr(Stdio::piped());
    cmd.stdin(if stdin.is_some() { Stdio::piped() } else { Stdio::null() });
    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => return ToolOutput { code: 127, stdout: Vec::new(), stderr: format!("spawn {}: {e}", argv[0]) },
    };
    if let (Some(bytes), Some(mut pipe)) = (stdin, child.stdin.take()) {
        let _ = pipe.write_all(bytes);
    }
    match child.wait_with_output() {
        Ok(o) => ToolOutput { code: o.status.code().unwrap_or(-1), stdout: o.stdout, stderr: String::from_utf8_lossy(&o.stderr).trim().to_string() },
        Err(e) => ToolOutput { code: -1, stdout: Vec::new(), stderr: format!("wait: {e}") },
    }
}

fn crate_default(account: &str) -> Read {
    match keyring::Entry::new(&service(), account).and_then(|e| e.get_secret()) {
        Ok(s) => Read::Found(s),
        Err(keyring::Error::NoEntry) => Read::Missing,
        Err(e) => Read::Failed(format!("{e:?}")),
    }
}

#[cfg(target_os = "linux")]
mod os {
    use super::*;
    use secret_service::blocking::SecretService;
    use secret_service::EncryptionType;
    use std::collections::HashMap;

    pub const METHODS: &[&str] = &["tool", "crate-default", "api", "api-unlock", "tool-after"];

    fn api(account: &str, unlock: bool) -> Read {
        let ss = match SecretService::connect(EncryptionType::Dh) {
            Ok(s) => s,
            Err(e) => return Read::Failed(format!("connect: {e:?}")),
        };
        let svc = service();
        let found = match ss.search_items(HashMap::from([("service", svc.as_str()), ("account", account)])) {
            Ok(f) => f,
            Err(e) => return Read::Failed(format!("search: {e:?}")),
        };
        if let Some(item) = found.unlocked.first() {
            return match item.get_secret() {
                Ok(s) => Read::Found(s),
                Err(e) => Read::Failed(format!("get_secret: {e:?}")),
            };
        }
        if let Some(item) = found.locked.first() {
            if !unlock {
                return Read::Locked("the item sits in a locked collection; no unlock requested".to_string());
            }
            if let Err(e) = item.unlock() {
                return Read::Locked(format!("unlock: {e:?}"));
            }
            return match item.get_secret() {
                Ok(s) => Read::Found(s),
                Err(e) => Read::Locked(format!("get_secret after unlock: {e:?}")),
            };
        }
        Read::Missing
    }

    fn secret_tool(account: &str) -> Read {
        let svc = service();
        let r = tool(&["secret-tool", "lookup", "service", &svc, "account", account], None);
        if r.code == 0 && !r.stdout.is_empty() {
            return Read::Found(r.stdout);
        }
        if r.code != 1 || !r.stderr.is_empty() {
            return Read::Failed(format!("secret-tool lookup exit {}: {}", r.code, r.stderr));
        }
        let s = tool(&["secret-tool", "search", "--all", "service", &svc, "account", account], None);
        let text = format!("{}\n{}", String::from_utf8_lossy(&s.stdout), s.stderr);
        if text.lines().any(|l| l.starts_with("[/") || l.starts_with("attribute.")) {
            return Read::Locked("secret-tool lookup exit 1 with no output; search lists the item".to_string());
        }
        Read::Missing
    }

    pub fn probe(method: &str, account: &str) -> Read {
        match method {
            "tool" | "tool-after" => secret_tool(account),
            "crate-default" => crate_default(account),
            "api" => api(account, false),
            "api-unlock" => api(account, true),
            _ => Read::Failed(format!("unknown method {method}")),
        }
    }

    pub fn snapshot(account: &str) -> String {
        let ss = match SecretService::connect(EncryptionType::Dh) {
            Ok(s) => s,
            Err(e) => return format!("connect: {e:?}"),
        };
        let svc = service();
        let found = match ss.search_items(HashMap::from([("service", svc.as_str()), ("account", account)])) {
            Ok(f) => f,
            Err(e) => return format!("search: {e:?}"),
        };
        let mut lines = Vec::new();
        for (state, items) in [("unlocked", &found.unlocked), ("locked", &found.locked)] {
            for item in items {
                let mut attrs: Vec<String> = item.get_attributes().unwrap_or_default().into_iter().map(|(k, v)| format!("{k}={v}")).collect();
                attrs.sort();
                lines.push(format!(
                    "{} {} label={:?} attrs=[{}] created={:?} modified={:?}",
                    state,
                    item.item_path.as_str(),
                    item.get_label().ok(),
                    attrs.join(","),
                    item.get_created().ok(),
                    item.get_modified().ok()
                ));
            }
        }
        lines.sort();
        lines.join("\n")
    }

    pub fn store(_account: &str, _value: &[u8]) -> Result<(), String> {
        Err("store is exercised on macOS alone".to_string())
    }

    pub fn on_timeout(_shot: &Path) -> String {
        let p = tool(&["pgrep", "-a", "gcr-prompter"], None);
        format!("gcr-prompter: {}", String::from_utf8_lossy(&p.stdout).trim())
    }
}

#[cfg(target_os = "macos")]
mod os {
    use super::*;
    use security_framework::os::macos::keychain::SecKeychain;
    use security_framework::passwords::{get_generic_password, set_generic_password};

    pub const METHODS: &[&str] = &["tool", "api-noui", "crate-default", "api", "tool-after"];
    const SECURITY: &str = "/usr/bin/security";
    const ITEM_NOT_FOUND: i32 = -25300;

    fn api(account: &str, ui: bool) -> Read {
        let _lock = if ui {
            None
        } else {
            match SecKeychain::disable_user_interaction() {
                Ok(l) => Some(l),
                Err(e) => return Read::Failed(format!("disable_user_interaction: {e:?}")),
            }
        };
        match get_generic_password(&service(), account) {
            Ok(s) => Read::Found(s),
            Err(e) if e.code() == ITEM_NOT_FOUND => Read::Missing,
            Err(e) => Read::Failed(format!("OSStatus {} {:?}", e.code(), e.message())),
        }
    }

    fn security(account: &str) -> Read {
        let svc = service();
        let r = tool(&[SECURITY, "find-generic-password", "-s", &svc, "-a", account, "-w"], None);
        match r.code {
            0 => Read::Found(String::from_utf8_lossy(&r.stdout).trim().as_bytes().to_vec()),
            44 => Read::Missing,
            c => Read::Failed(format!("security exit {c}: {}", r.stderr)),
        }
    }

    pub fn probe(method: &str, account: &str) -> Read {
        match method {
            "tool" | "tool-after" => security(account),
            "crate-default" => crate_default(account),
            "api" => api(account, true),
            "api-noui" => api(account, false),
            _ => Read::Failed(format!("unknown method {method}")),
        }
    }

    pub fn snapshot(account: &str) -> String {
        let svc = service();
        let r = tool(&[SECURITY, "find-generic-password", "-s", &svc, "-a", account], None);
        format!("exit {}\n{}", r.code, String::from_utf8_lossy(&r.stdout))
    }

    pub fn store(account: &str, value: &[u8]) -> Result<(), String> {
        set_generic_password(&service(), account, b64(value).as_bytes()).map_err(|e| format!("OSStatus {} {:?}", e.code(), e.message()))
    }

    pub fn on_timeout(shot: &Path) -> String {
        let p = tool(&["/usr/bin/pgrep", "-lf", "SecurityAgent"], None);
        let s = tool(&["/usr/sbin/screencapture", "-x", &shot.to_string_lossy()], None);
        let k = tool(&["/usr/bin/killall", "SecurityAgent"], None);
        format!(
            "SecurityAgent processes: [{}]; screencapture exit {}; killall SecurityAgent exit {}",
            String::from_utf8_lossy(&p.stdout).trim().replace('\n', " | "),
            s.code,
            k.code
        )
    }
}

#[cfg(windows)]
mod os {
    use super::*;
    use windows_sys::Win32::Security::Cryptography::{CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB};

    pub const METHODS: &[&str] = &["tool", "crate-default", "api", "tool-after"];
    const PS_UNPROTECT: &str = "Add-Type -AssemblyName System.Security; $i=[Console]::In.ReadToEnd().Trim(); [Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($i),$null,'CurrentUser'))";

    fn file(account: &str) -> PathBuf {
        PathBuf::from(env::var("LOCALAPPDATA").unwrap_or_default()).join("bkt").join("keys").join(format!("{}.{}.dpapi", service(), account))
    }

    fn api(account: &str) -> Read {
        let f = file(account);
        if !f.exists() {
            return Read::Missing;
        }
        let text = match fs::read(&f) {
            Ok(t) => t,
            Err(e) => return Read::Failed(format!("read {}: {e}", f.display())),
        };
        let blob = match unb64(&text) {
            Some(b) => b,
            None => return Read::Failed("the file is not base64".to_string()),
        };
        let input = CRYPT_INTEGER_BLOB { cbData: blob.len() as u32, pbData: blob.as_ptr() as *mut u8 };
        let mut out = CRYPT_INTEGER_BLOB { cbData: 0, pbData: std::ptr::null_mut() };
        let ok = unsafe { CryptUnprotectData(&input, std::ptr::null_mut(), std::ptr::null(), std::ptr::null(), std::ptr::null(), CRYPTPROTECT_UI_FORBIDDEN, &mut out) };
        if ok == 0 {
            return Read::Failed(format!("CryptUnprotectData: {}", std::io::Error::last_os_error()));
        }
        Read::Found(unsafe { std::slice::from_raw_parts(out.pbData, out.cbData as usize) }.to_vec())
    }

    fn powershell(account: &str) -> Read {
        let f = file(account);
        if !f.exists() {
            return Read::Missing;
        }
        let text = match fs::read(&f) {
            Ok(t) => t,
            Err(e) => return Read::Failed(format!("read {}: {e}", f.display())),
        };
        let root = env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".to_string());
        let bin = format!("{root}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe");
        let r = tool(&[&bin, "-NoProfile", "-NonInteractive", "-Command", PS_UNPROTECT], Some(&text));
        if r.code != 0 {
            return Read::Failed(format!("powershell exit {}: {}", r.code, r.stderr));
        }
        match unb64(&r.stdout) {
            Some(b) => Read::Found(b),
            None => Read::Failed("powershell output is not base64".to_string()),
        }
    }

    pub fn probe(method: &str, account: &str) -> Read {
        match method {
            "tool" | "tool-after" => powershell(account),
            "crate-default" => crate_default(account),
            "api" => api(account),
            _ => Read::Failed(format!("unknown method {method}")),
        }
    }

    pub fn snapshot(account: &str) -> String {
        let f = file(account);
        match (fs::read(&f), fs::metadata(&f)) {
            (Ok(bytes), Ok(meta)) => format!("{} len={} modified={:?} sha256={}", f.display(), bytes.len(), meta.modified().ok(), sha(&bytes)),
            _ => format!("{} absent", f.display()),
        }
    }

    pub fn store(_account: &str, _value: &[u8]) -> Result<(), String> {
        Err("store is exercised on macOS alone".to_string())
    }

    pub fn on_timeout(_shot: &Path) -> String {
        String::new()
    }
}

struct Timed {
    code: Option<i32>,
    timed_out: bool,
    stdout: Vec<u8>,
    stderr: String,
    ms: u128,
    note: String,
}

fn timed(argv: &[String], io: &Path, name: &str, secs: u64) -> Timed {
    fs::create_dir_all(io).expect("io dir");
    let out_path = io.join(format!("{name}.out"));
    let err_path = io.join(format!("{name}.err"));
    let start = Instant::now();
    let mut child = match Command::new(&argv[0])
        .args(&argv[1..])
        .stdin(Stdio::null())
        .stdout(fs::File::create(&out_path).expect("out file"))
        .stderr(fs::File::create(&err_path).expect("err file"))
        .spawn()
    {
        Ok(c) => c,
        Err(e) => return Timed { code: Some(127), timed_out: false, stdout: Vec::new(), stderr: format!("spawn: {e}"), ms: 0, note: String::new() },
    };
    let deadline = start + Duration::from_secs(secs);
    let mut timed_out = false;
    let mut note = String::new();
    let code = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status.code(),
            Ok(None) if Instant::now() >= deadline => {
                timed_out = true;
                note = os::on_timeout(&io.join(format!("{name}.png")));
                let _ = child.kill();
                let _ = child.wait();
                break None;
            }
            Ok(None) => std::thread::sleep(Duration::from_millis(40)),
            Err(_) => break None,
        }
    };
    Timed {
        code,
        timed_out,
        stdout: fs::read(&out_path).unwrap_or_default(),
        stderr: fs::read_to_string(&err_path).unwrap_or_default().trim().to_string(),
        ms: start.elapsed().as_millis(),
        note,
    }
}

fn timeout_secs() -> u64 {
    env::var("SPIKE_TIMEOUT").ok().and_then(|s| s.parse().ok()).unwrap_or(20)
}

fn own(args: &[&str]) -> Vec<String> {
    let mut argv = vec![env::current_exe().expect("own path").to_string_lossy().to_string()];
    argv.extend(args.iter().map(|s| s.to_string()));
    argv
}

fn json(s: &str) -> String {
    let mut out = String::from("\"");
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            c if (c as u32) < 0x20 => out.push(' '),
            c => out.push(c),
        }
    }
    out.push('"');
    out
}

fn run(work: &Path, label: &str) {
    let io = work.join("io").join(label);
    let secs = timeout_secs();
    let accounts = fs::read_to_string(work.join("accounts.txt")).expect("accounts.txt");
    let mut rows = Vec::new();
    let mut table = vec![
        format!("| entry | method | outcome | bytes equal to TypeScript | stored encoding | ms | item changed | note |"),
        "|---|---|---|---|---|---|---|---|".to_string(),
    ];
    for line in accounts.lines().filter(|l| !l.trim().is_empty()) {
        let mut parts = line.split_whitespace();
        let (kind, account) = (parts.next().unwrap(), parts.next().unwrap());
        let expected = fs::read(work.join("expected").join(account)).unwrap_or_default();
        for method in os::METHODS {
            let name = format!("{kind}-{method}");
            let before = timed(&own(&["snapshot", account]), &io, &format!("{name}-before"), secs);
            let r = timed(&own(&["probe", method, account]), &io, &name, secs);
            let after = timed(&own(&["snapshot", account]), &io, &format!("{name}-after"), secs);
            let got = unhex(&String::from_utf8_lossy(&r.stdout));
            let outcome = if r.timed_out {
                "timeout"
            } else {
                match r.code {
                    Some(0) => "found",
                    Some(EXIT_MISSING) => "not found",
                    Some(EXIT_LOCKED) => "locked",
                    Some(_) => "error",
                    None => "killed",
                }
            };
            let (equal, encoding) = if outcome != "found" {
                ("n/a", "n/a")
            } else if got == expected {
                ("yes", "identity")
            } else if unb64(&got).as_deref() == Some(&expected[..]) {
                ("yes", "base64")
            } else {
                ("no", "unknown")
            };
            let changed = if before.timed_out || after.timed_out {
                "unknown"
            } else if before.stdout == after.stdout {
                "no"
            } else {
                "yes"
            };
            let note = [r.stderr.lines().next().unwrap_or("").to_string(), r.note.clone()].iter().filter(|s| !s.is_empty()).cloned().collect::<Vec<_>>().join("; ");
            table.push(format!("| {kind} | {method} | {outcome} | {equal} | {encoding} | {} | {changed} | {} |", r.ms, note.replace('|', "/")));
            rows.push(format!(
                "{{\"os\":{},\"arch\":{},\"build\":{},\"label\":{},\"entry\":{},\"method\":{},\"outcome\":{},\"exit\":{},\"equal\":{},\"encoding\":{},\"ms\":{},\"changed\":{},\"note\":{},\"snapshot_before_sha\":{},\"snapshot_after_sha\":{}}}",
                json(env::consts::OS),
                json(env::consts::ARCH),
                json(BUILD_TAG),
                json(label),
                json(kind),
                json(method),
                json(outcome),
                r.code.map(|c| c.to_string()).unwrap_or_else(|| "null".to_string()),
                json(equal),
                json(encoding),
                r.ms,
                json(changed),
                json(&note),
                json(&sha(&before.stdout)[..12]),
                json(&sha(&after.stdout)[..12])
            ));
        }
    }
    fs::write(work.join(format!("results-{label}.jsonl")), rows.join("\n") + "\n").expect("results");
    println!("\n### {} {} build {} run `{label}`, service `{}`, timeout {secs}s\n", env::consts::OS, env::consts::ARCH, BUILD_TAG, service());
    println!("{}", table.join("\n"));
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let arg = |i: usize| args.get(i).map(String::as_str).unwrap_or("");
    match arg(1) {
        "probe" => match os::probe(arg(2), arg(3)) {
            Read::Found(bytes) => println!("{}", hex(&bytes)),
            Read::Missing => exit(EXIT_MISSING),
            Read::Locked(why) => {
                eprintln!("{why}");
                exit(EXIT_LOCKED)
            }
            Read::Failed(why) => {
                eprintln!("{why}");
                exit(1)
            }
        },
        "snapshot" => println!("{}", os::snapshot(arg(2))),
        "store" => {
            let value = fs::read(arg(3)).expect("value file");
            if let Err(e) = os::store(arg(2), &value) {
                eprintln!("{e}");
                exit(1)
            }
        }
        "run" => run(Path::new(arg(2)), arg(3)),
        "timed" => {
            let secs: u64 = arg(2).parse().expect("seconds");
            let out = PathBuf::from(arg(3));
            let r = timed(&args[4..], out.parent().unwrap_or(Path::new(".")), &out.file_name().unwrap().to_string_lossy(), secs);
            println!("exit={:?} timed_out={} ms={} {}", r.code, r.timed_out, r.ms, r.note);
            if r.timed_out || r.code != Some(0) {
                exit(1)
            }
        }
        _ => {
            eprintln!("usage: keyring-read probe METHOD ACCOUNT | snapshot ACCOUNT | store ACCOUNT FILE | run WORKDIR LABEL | timed SECONDS OUTFILE COMMAND...");
            exit(2)
        }
    }
}
