pub mod agents;

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::{Manager, RunEvent, Url};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_updater::UpdaterExt;

pub fn serve_url(line: &str) -> Option<Url> {
    let url = Url::parse(line.trim()).ok()?;
    let local = url.scheme() == "http" && url.host_str() == Some("127.0.0.1") && url.port().is_some();
    local.then_some(url)
}

pub const LINK_PREFIX: &str = "bucket://quiz/";

fn valid_day(day: &str) -> bool {
    let b = day.as_bytes();
    if b.len() != 10 || b[4] != b'-' || b[7] != b'-' {
        return false;
    }
    if !b.iter().enumerate().all(|(i, c)| i == 4 || i == 7 || c.is_ascii_digit()) {
        return false;
    }
    let n = |from: usize, to: usize| day[from..to].parse::<u32>().unwrap_or(0);
    let (year, month, date) = (n(0, 4), n(5, 7), n(8, 10));
    let leap = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
    let days = match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if leap => 29,
        2 => 28,
        _ => 0,
    };
    (1..=days).contains(&date)
}

pub fn quiz_route(link: &str) -> Option<String> {
    let day = link.strip_prefix(LINK_PREFIX)?;
    valid_day(day).then(|| format!("/work/daily/{day}"))
}

pub const LEARN_LINK: &str = "bucket://learn";

pub fn link_route(link: &str) -> Option<String> {
    if link == LEARN_LINK || link == "bucket://learn/" {
        return Some("/learn".to_string());
    }
    quiz_route(link)
}

pub fn route_in(args: &[String]) -> Option<String> {
    args.iter().skip(1).find_map(|a| link_route(a))
}

pub fn with_route(base: &Url, route: &str) -> Url {
    let mut url = base.clone();
    url.set_fragment(Some(route));
    url
}

#[derive(Default)]
pub struct LinkState {
    base: Option<Url>,
    pending: Option<String>,
}

impl LinkState {
    pub fn request(&mut self, route: String) -> Option<Url> {
        match &self.base {
            Some(base) => Some(with_route(base, &route)),
            None => {
                self.pending = Some(route);
                None
            }
        }
    }

    pub fn first_target(&mut self, base: &Url) -> Url {
        match self.pending.take() {
            Some(route) => with_route(base, &route),
            None => base.clone(),
        }
    }

    pub fn loaded(&mut self, base: Url) {
        self.base = Some(base);
    }

    pub fn unloaded(&mut self) {
        self.base = None;
    }
}

pub trait Host {
    fn navigate(&self, url: Url) -> Result<(), String>;
    fn raise(&self);
    fn start_sidecar(&self) -> Result<(), String>;
    fn report(&self, message: &str);
}

pub fn open_route<H: Host>(host: &H, link: &Mutex<LinkState>, route: String) {
    let target = link.lock().unwrap().request(route.clone());
    if let Some(url) = target {
        match host.navigate(url) {
            Ok(()) => eprintln!("bucket opened {route}"),
            Err(e) => eprintln!("bucket could not open {route}: {e}"),
        }
    }
    host.raise();
}

pub fn second_launch<H: Host>(host: &H, link: &Mutex<LinkState>, args: &[String]) {
    match route_in(args) {
        Some(route) => open_route(host, link, route),
        None => host.raise(),
    }
}

pub fn first_launch<H: Host>(host: &H, link: &Mutex<LinkState>, args: &[String]) {
    if let Some(route) = route_in(args) {
        link.lock().unwrap().request(route);
    }
    if let Err(e) = host.start_sidecar() {
        host.report(&format!("bkt serve did not start: {e}"));
    }
}

pub fn sidecar_ready<H: Host>(host: &H, link: &Mutex<LinkState>, url: Url) -> bool {
    let mut state = link.lock().unwrap();
    let opened = host.navigate(state.first_target(&url)).is_ok();
    if opened {
        state.loaded(url);
    }
    opened
}

pub fn sidecar_stopped<H: Host>(host: &H, link: &Mutex<LinkState>, why: &str) {
    link.lock().unwrap().unloaded();
    host.report(&format!("bkt serve stopped: {why}"));
}

struct Shell(tauri::AppHandle);

impl Host for Shell {
    fn navigate(&self, url: Url) -> Result<(), String> {
        let w = self.0.get_webview_window("main").ok_or("the main window is closed")?;
        w.navigate(url).map_err(|e| e.to_string())
    }

    fn raise(&self) {
        if let Some(w) = self.0.get_webview_window("main") {
            let _ = w.unminimize();
            let _ = w.show();
            let _ = w.set_focus();
        }
    }

    fn start_sidecar(&self) -> Result<(), String> {
        start(&self.0)
    }

    fn report(&self, message: &str) {
        eprintln!("{message}");
        show_error(&self.0, message);
    }
}

struct Link(Mutex<LinkState>);

struct Sidecar(Mutex<Option<CommandChild>>);

pub const STDOUT_CAP: usize = 64 * 1024;
pub const CONSENT_PREFIX: &str = "bkt-consent ";
pub const CONSENT_TITLE_CHARS: usize = 200;
pub const CONSENT_BODY_CHARS: usize = 4000;
pub const CONSENT_DONE_PREFIX: &str = "bkt-consent-done ";
pub const CONSENT_SCHEME: &str = "bkt-consent";
pub const CONSENT_WINDOW: &str = "consent";
pub const CONSENT_ARM: Duration = Duration::from_secs(2);
pub const CONSENT_QUIET: Duration = Duration::from_secs(30);
pub const CONSENT_LIFE: Duration = Duration::from_secs(120);
pub const CONSENT_WRONG_LIMIT: u8 = 3;
pub const CODE_ALPHABET: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

#[derive(Default)]
pub struct LineBuffer(Vec<u8>);

impl LineBuffer {
    pub fn push(&mut self, bytes: &[u8]) -> Vec<String> {
        self.0.extend_from_slice(bytes);
        let mut lines = Vec::new();
        while let Some(at) = self.0.iter().position(|b| *b == b'\n') {
            let line: Vec<u8> = self.0.drain(..=at).collect();
            lines.push(String::from_utf8_lossy(&line[..line.len() - 1]).trim_end_matches('\r').to_string());
        }
        if self.0.len() > STDOUT_CAP {
            self.0.clear();
        }
        lines
    }

    pub fn held(&self) -> usize {
        self.0.len()
    }
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ConsentRequest {
    pub id: String,
    pub digest: String,
    pub slug: String,
    pub output: String,
    pub title: String,
    pub body: String,
    pub approvable: bool,
}

pub fn consent_request(line: &str) -> Option<ConsentRequest> {
    let value: serde_json::Value = serde_json::from_str(line.strip_prefix(CONSENT_PREFIX)?).ok()?;
    if !value.is_object() {
        return None;
    }
    let request: ConsentRequest = serde_json::from_value(value).ok()?;
    let id = request.id.len() == 22 && request.id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_');
    let digest = request.digest.len() == 64 && request.digest.bytes().all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b));
    let slug = !request.slug.is_empty()
        && request.slug.len() <= 64
        && !request.slug.starts_with('-')
        && request.slug.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-');
    let sized = request.title.chars().count() <= CONSENT_TITLE_CHARS && request.output.chars().count() <= CONSENT_TITLE_CHARS && request.body.chars().count() <= CONSENT_BODY_CHARS;
    (id && digest && slug && sized).then_some(request)
}

pub fn consent_done(line: &str) -> Option<String> {
    let id = line.strip_prefix(CONSENT_DONE_PREFIX)?;
    (id.len() == 22 && id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')).then(|| id.to_string())
}

#[derive(Debug, PartialEq, Eq)]
pub enum Read {
    Url(Url),
    Consent(ConsentRequest),
    Settled(String),
}

pub fn read_stdout(buffer: &mut LineBuffer, opened: bool, bytes: &[u8]) -> Vec<Read> {
    let mut open = opened;
    let mut out = Vec::new();
    for line in buffer.push(bytes) {
        if !open {
            if let Some(url) = serve_url(&line) {
                out.push(Read::Url(url));
                open = true;
            }
        } else if let Some(request) = consent_request(&line) {
            out.push(Read::Consent(request));
        } else if let Some(id) = consent_done(&line) {
            out.push(Read::Settled(id));
        }
    }
    out
}

pub fn consent_answer(id: &str, digest: &str, allow: bool) -> String {
    format!("consent {id} {digest} {}\n", if allow { "allow" } else { "deny" })
}

pub fn visible(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    for c in text.chars() {
        let n = c as u32;
        let unseen = (c.is_control() && c != '\n' && c != '\t') || n == 0x061C || (0x200B..=0x200F).contains(&n) || (0x202A..=0x202E).contains(&n) || (0x2060..=0x2069).contains(&n) || n == 0xFEFF;
        if unseen {
            out.push_str(&format!("<U+{n:04X}>"));
        } else {
            out.push(c);
        }
    }
    out
}

pub fn html(text: &str) -> String {
    visible(text).replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;").replace('\'', "&#39;")
}

pub fn consent_code(random: [u8; 4]) -> String {
    random.iter().map(|b| CODE_ALPHABET[(*b as usize) % CODE_ALPHABET.len()] as char).collect()
}

pub fn consent_title(output: &str) -> String {
    format!("Bucket: {}", visible(output))
}

pub struct OpenConsent {
    pub request: ConsentRequest,
    pub code: String,
    pub opened: Instant,
    pub wrong: u8,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Act {
    Deny,
    Closed,
    Allow(String),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Note {
    TooSoon,
    WrongCode,
    TerminalAlone,
}

impl Note {
    pub fn text(self) -> &'static str {
        match self {
            Note::TooSoon => "Wait two seconds after this window opens, then approve.",
            Note::WrongCode => "That code does not match. Type the four characters shown above.",
            Note::TerminalAlone => "This window cannot approve this build. Use the terminal command shown above.",
        }
    }
}

#[derive(Debug, PartialEq, Eq)]
pub enum Outcome {
    Nothing,
    Stay(Note),
    Done(String),
}

#[derive(Debug, PartialEq, Eq)]
pub enum Decision {
    Ask,
    Deny(String),
}

fn same(a: &str, b: &str) -> bool {
    a.len() == b.len() && a.bytes().zip(b.bytes()).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
}

#[derive(Default)]
pub struct ConsentDesk {
    open: Option<OpenConsent>,
    quiet: HashMap<String, Instant>,
}

impl ConsentDesk {
    pub fn begin(&mut self, request: ConsentRequest, code: String, now: Instant) -> Decision {
        let resting = self.quiet.get(&request.slug).is_some_and(|at| now.duration_since(*at) < CONSENT_QUIET);
        if self.open.is_some() || resting {
            return Decision::Deny(consent_answer(&request.id, &request.digest, false));
        }
        self.quiet.retain(|_, at| now.duration_since(*at) < CONSENT_QUIET);
        self.open = Some(OpenConsent { request, code, opened: now, wrong: 0 });
        Decision::Ask
    }

    pub fn open(&self) -> Option<&OpenConsent> {
        self.open.as_ref()
    }

    fn finish(&mut self, allow: bool, now: Instant) -> Outcome {
        match self.open.take() {
            None => Outcome::Nothing,
            Some(open) => {
                if !allow {
                    self.quiet.insert(open.request.slug.clone(), now);
                }
                Outcome::Done(consent_answer(&open.request.id, &open.request.digest, allow))
            }
        }
    }

    pub fn answer(&mut self, act: Act, now: Instant) -> Outcome {
        let Some(open) = self.open.as_mut() else {
            return Outcome::Nothing;
        };
        let typed = match act {
            Act::Deny | Act::Closed => return self.finish(false, now),
            Act::Allow(typed) => typed,
        };
        if !open.request.approvable {
            return Outcome::Stay(Note::TerminalAlone);
        }
        if now.duration_since(open.opened) < CONSENT_ARM {
            return Outcome::Stay(Note::TooSoon);
        }
        if same(&typed.trim().to_ascii_uppercase(), &open.code) {
            return self.finish(true, now);
        }
        open.wrong += 1;
        if open.wrong >= CONSENT_WRONG_LIMIT {
            return self.finish(false, now);
        }
        Outcome::Stay(Note::WrongCode)
    }

    pub fn forget(&mut self, id: &str) -> bool {
        let open = self.open.as_ref().is_some_and(|o| o.request.id == id);
        if open {
            self.open = None;
        }
        open
    }

    pub fn expire(&mut self, id: &str, now: Instant) -> Outcome {
        if self.open.as_ref().is_some_and(|o| o.request.id == id) {
            self.finish(false, now)
        } else {
            Outcome::Nothing
        }
    }
}

const CONSENT_STYLE: &str = "body{font:15px/1.5 system-ui,sans-serif;margin:0;padding:20px 24px;background:#f5f2ec;color:#1d1b17}h1{font-size:19px;margin:0 0 4px}h2{font-size:15px;margin:0 0 12px;font-weight:600}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#fffdf8;border:1px solid #d9d2c3;border-radius:8px;padding:12px;max-height:300px;overflow:auto;font:13px/1.45 ui-monospace,monospace}.fine{color:#6b6252;font-size:13px;overflow-wrap:anywhere}.code{font:700 22px ui-monospace,monospace;letter-spacing:4px}.note{color:#8a2b1d;font-weight:600}.row{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:14px}input[type=text]{font:18px ui-monospace,monospace;width:7em;padding:6px 8px;text-transform:uppercase;border:1px solid #6b6252;border-radius:6px}button{font:inherit;padding:8px 18px;border-radius:8px;border:1px solid #2f5d50;background:#fffdf8;color:#1d1b17}button.deny{background:#2f5d50;color:#fff;font-weight:700}button.deny:focus{outline:3px solid #d9a43a;outline-offset:2px}button.allow{pointer-events:none;opacity:.35;animation:arm 0s linear 2s forwards}@keyframes arm{to{pointer-events:auto;opacity:1}}form:invalid button.allow{pointer-events:none!important;opacity:.35!important}";

pub fn consent_page(open: &OpenConsent, note: Option<Note>) -> String {
    let r = &open.request;
    let said = note.map(|n| format!("<p class=\"note\" role=\"alert\">{}</p>", html(n.text()))).unwrap_or_default();
    let approve = if r.approvable {
        format!(
            "<p>To approve, type this code: <span class=\"code\">{code}</span></p><form action=\"/answer\" method=\"get\" autocomplete=\"off\"><input type=\"hidden\" name=\"act\" value=\"allow\"><div class=\"row\"><input type=\"text\" name=\"code\" aria-label=\"The code shown above\" required minlength=\"4\" maxlength=\"4\" pattern=\"{code}|{lower}\" autocomplete=\"off\" spellcheck=\"false\"><button class=\"allow\" type=\"submit\">Approve</button></div></form>",
            code = html(&open.code),
            lower = html(&open.code.to_ascii_lowercase())
        )
    } else {
        "<p class=\"note\">This window cannot approve this build, because it does not show every change. Use the terminal command above. You can still deny it here.</p>".to_string()
    };
    format!(
        "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><title>{title}</title><style>{CONSENT_STYLE}</style></head><body><h1>{title}</h1><h2>{ask}</h2><pre>{body}</pre><p class=\"fine\">Request {id}<br>Full digest {digest}</p>{said}{approve}<form action=\"/answer\" method=\"get\"><input type=\"hidden\" name=\"act\" value=\"deny\"><div class=\"row\"><button class=\"deny\" type=\"submit\" autofocus>Deny</button></div></form></body></html>",
        title = html(&consent_title(&r.output)),
        ask = html(&r.title),
        body = html(&r.body),
        id = html(&r.id),
        digest = html(&r.digest),
    )
}

pub const CONSENT_DONE: &str = "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><title>Bucket</title></head><body><p>Done. This window closes itself.</p></body></html>";
pub const CONSENT_REFUSED: &str = "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><title>Bucket</title></head><body><p>Refused.</p></body></html>";

#[derive(Debug, PartialEq, Eq)]
pub struct Reply {
    pub status: u16,
    pub page: String,
    pub line: Option<String>,
    pub close: bool,
}

pub fn consent_act(uri: &str) -> Option<Act> {
    let url = Url::parse(uri).ok()?;
    if url.path() != "/answer" {
        return None;
    }
    let mut act = None;
    let mut code = String::new();
    for (k, v) in url.query_pairs() {
        match k.as_ref() {
            "act" if act.is_none() => act = Some(v.to_string()),
            "code" if code.is_empty() && v.len() <= 16 => code = v.to_string(),
            _ => return None,
        }
    }
    match act.as_deref() {
        Some("deny") => Some(Act::Deny),
        Some("allow") => Some(Act::Allow(code)),
        _ => None,
    }
}

pub fn consent_reply(desk: &mut ConsentDesk, label: &str, uri: &str, now: Instant) -> Reply {
    let refused = || Reply { status: 403, page: CONSENT_REFUSED.to_string(), line: None, close: false };
    if label != CONSENT_WINDOW {
        return refused();
    }
    let path = Url::parse(uri).map(|u| u.path().to_string()).unwrap_or_default();
    if path == "/ask" {
        return match desk.open() {
            Some(open) => Reply { status: 200, page: consent_page(open, None), line: None, close: false },
            None => Reply { status: 200, page: CONSENT_DONE.to_string(), line: None, close: true },
        };
    }
    let Some(act) = consent_act(uri) else {
        return refused();
    };
    match desk.answer(act, now) {
        Outcome::Done(line) => Reply { status: 200, page: CONSENT_DONE.to_string(), line: Some(line), close: true },
        Outcome::Nothing => Reply { status: 200, page: CONSENT_DONE.to_string(), line: None, close: true },
        Outcome::Stay(note) => Reply { status: 200, page: desk.open().map(|o| consent_page(o, Some(note))).unwrap_or_else(|| CONSENT_DONE.to_string()), line: None, close: false },
    }
}

struct Consent(Mutex<ConsentDesk>);

fn tell_sidecar(app: &tauri::AppHandle, line: &str) {
    eprintln!("bucket answered a build request: {}", line.trim_end().rsplit(' ').next().unwrap_or(""));
    if let Some(child) = app.state::<Sidecar>().0.lock().unwrap().as_mut() {
        if let Err(e) = child.write(line.as_bytes()) {
            eprintln!("bucket could not answer the build request: {e}");
        }
    }
}

fn close_consent(app: &tauri::AppHandle) {
    let handle = app.clone();
    let _ = app.run_on_main_thread(move || {
        if let Some(w) = handle.get_webview_window(CONSENT_WINDOW) {
            let _ = w.destroy();
        }
    });
}

fn settle(app: &tauri::AppHandle, outcome: Outcome) {
    if let Outcome::Done(line) = outcome {
        tell_sidecar(app, &line);
        close_consent(app);
    }
}

fn consent_response(app: &tauri::AppHandle, label: &str, uri: &str) -> tauri::http::Response<Vec<u8>> {
    let reply = consent_reply(&mut app.state::<Consent>().0.lock().unwrap(), label, uri, Instant::now());
    if let Some(line) = &reply.line {
        tell_sidecar(app, line);
    }
    if reply.close {
        close_consent(app);
    }
    tauri::http::Response::builder()
        .status(reply.status)
        .header("content-type", "text/html; charset=utf-8")
        .header("cache-control", "no-store")
        .header("content-security-policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'")
        .body(reply.page.into_bytes())
        .unwrap()
}

fn ask_consent(app: &tauri::AppHandle, request: ConsentRequest) {
    let mut random = [0u8; 4];
    if getrandom::getrandom(&mut random).is_err() {
        tell_sidecar(app, &consent_answer(&request.id, &request.digest, false));
        return;
    }
    let (id, title) = (request.id.clone(), consent_title(&request.output));
    let denied = consent_answer(&request.id, &request.digest, false);
    let decision = app.state::<Consent>().0.lock().unwrap().begin(request, consent_code(random), Instant::now());
    if let Decision::Deny(line) = decision {
        tell_sidecar(app, &line);
        return;
    }
    let handle = app.clone();
    let made = app.run_on_main_thread(move || {
        let page = Url::parse(&format!("{CONSENT_SCHEME}://localhost/ask")).unwrap();
        let events = handle.clone();
        let built = tauri::WebviewWindowBuilder::new(&handle, CONSENT_WINDOW, tauri::WebviewUrl::CustomProtocol(page))
            .title(title)
            .inner_size(700.0, 680.0)
            .resizable(false)
            .always_on_top(true)
            .focused(true)
            .center()
            .on_navigation(|url| url.scheme() == CONSENT_SCHEME || (url.scheme() == "http" && url.host_str() == Some("bkt-consent.localhost")))
            .build();
        match built {
            Ok(window) => window.on_window_event(move |event| {
                if matches!(event, tauri::WindowEvent::Destroyed | tauri::WindowEvent::CloseRequested { .. }) {
                    let outcome = events.state::<Consent>().0.lock().unwrap().answer(Act::Closed, Instant::now());
                    settle(&events, outcome);
                }
            }),
            Err(e) => {
                eprintln!("bucket could not open the approval window: {e}");
                let outcome = handle.state::<Consent>().0.lock().unwrap().answer(Act::Closed, Instant::now());
                settle(&handle, outcome);
            }
        }
    });
    if made.is_err() {
        app.state::<Consent>().0.lock().unwrap().expire(&id, Instant::now());
        tell_sidecar(app, &denied);
        return;
    }
    let timer = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(CONSENT_LIFE);
        let outcome = timer.state::<Consent>().0.lock().unwrap().expire(&id, Instant::now());
        settle(&timer, outcome);
    });
}

fn show_error(app: &tauri::AppHandle, message: &str) {
    if let Some(w) = app.get_webview_window("main") {
        let text = serde_json::Value::from(message).to_string();
        let _ = w.eval(&format!("document.getElementById('status').textContent={text}"));
    }
}

fn start(app: &tauri::AppHandle) -> Result<(), String> {
    let ui = app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?
        .join("ui");
    let (mut rx, child) = app
        .shell()
        .sidecar("bkt")
        .map_err(|e| e.to_string())?
        .args(["serve"])
        .env("BKT_UI_DIR", ui)
        .env("BKT_SIDECAR", "1")
        .spawn()
        .map_err(|e| e.to_string())?;
    app.state::<Sidecar>().0.lock().unwrap().replace(child);
    let handle = app.clone();
    tauri::async_runtime::spawn(async move {
        let mut opened = false;
        let mut tail = String::new();
        let mut buffer = LineBuffer::default();
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(bytes) => {
                    for read in read_stdout(&mut buffer, opened, &bytes) {
                        match read {
                            Read::Url(url) => opened = sidecar_ready(&Shell(handle.clone()), &handle.state::<Link>().0, url),
                            Read::Consent(request) => ask_consent(&handle, request),
                            Read::Settled(id) => {
                                if handle.state::<Consent>().0.lock().unwrap().forget(&id) {
                                    close_consent(&handle);
                                }
                            }
                        }
                    }
                }
                CommandEvent::Stderr(bytes) => {
                    tail = String::from_utf8_lossy(&bytes).trim().to_string();
                    eprintln!("{tail}");
                }
                CommandEvent::Error(e) => tail = e,
                CommandEvent::Terminated(p) => {
                    let why = if tail.is_empty() { format!("exit code {:?}", p.code) } else { tail.clone() };
                    sidecar_stopped(&Shell(handle.clone()), &handle.state::<Link>().0, &why);
                    break;
                }
                _ => {}
            }
        }
    });
    Ok(())
}

#[tauri::command]
fn launch_agent(window: tauri::Window, agents: tauri::State<'_, agents::Agents>, tool: String, folder: String) -> Result<(), String> {
    if window.label() != "main" {
        return Err("only the main window can open agents".into());
    }
    agents.launch(&tool, &folder)
}

fn approve_folder(app: &tauri::AppHandle) {
    let Some(state) = app.state::<agents::Agents>().state.clone() else {
        show_error(app, "Bucket could not find its state folder");
        return;
    };
    let handle = app.clone();
    tauri::async_runtime::spawn(async move {
        let picked = rfd::AsyncFileDialog::new().set_title("Approve a folder for agents").pick_folder().await;
        if let Some(folder) = picked {
            if let Err(e) = agents::add_folder(&state, folder.path()) {
                show_error(&handle, &e);
            }
        }
    });
}

fn agents_menu(app: &tauri::App) -> tauri::Result<()> {
    let item = MenuItemBuilder::with_id(agents::APPROVE_MENU_ID, "Approve a folder for agents").build(app)?;
    let sub = SubmenuBuilder::new(app, "Agents").item(&item).build()?;
    let menu = MenuBuilder::new(app).item(&sub).build()?;
    app.set_menu(menu)?;
    app.on_menu_event(|app, event| {
        if event.id() == agents::APPROVE_MENU_ID {
            approve_folder(app);
        }
    });
    Ok(())
}

pub fn updates_enabled() -> bool {
    !cfg!(debug_assertions)
}

async fn update(app: tauri::AppHandle) -> Result<(), tauri_plugin_updater::Error> {
    if let Some(next) = app.updater()?.check().await? {
        next.download_and_install(|_, _| {}, || {}).await?;
    }
    Ok(())
}

pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| second_launch(&Shell(app.clone()), &app.state::<Link>().0, &args)))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_shell::init())
        .register_uri_scheme_protocol(CONSENT_SCHEME, |ctx, request| consent_response(ctx.app_handle(), ctx.webview_label(), &request.uri().to_string()))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(Sidecar(Mutex::new(None)))
        .manage(Consent(Mutex::new(ConsentDesk::default())))
        .manage(Link(Mutex::new(LinkState::default())))
        .manage(agents::Agents::at_startup())
        .invoke_handler(tauri::generate_handler![launch_agent])
        .setup(|app| {
            if let Err(e) = agents_menu(app) {
                eprintln!("bucket could not add the Agents menu: {e}");
            }
            let links = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                if let Some(route) = event.urls().iter().find_map(|u| link_route(u.as_str())) {
                    open_route(&Shell(links.clone()), &links.state::<Link>().0, route);
                }
            });
            let signals = app.handle().clone();
            if let Err(e) = ctrlc::set_handler(move || signals.exit(0)) {
                eprintln!("bucket could not watch for termination signals: {e}");
            }
            first_launch(&Shell(app.handle().clone()), &app.state::<Link>().0, &std::env::args().collect::<Vec<_>>());
            if updates_enabled() {
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    if let Err(e) = update(handle).await {
                        eprintln!("bucket update check failed: {e}");
                    }
                });
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("tauri app failed to build");
    app.run(|handle, event| {
        if let RunEvent::Exit = event {
            if let Some(child) = handle.state::<Sidecar>().0.lock().unwrap().take() {
                let _ = child.kill();
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    const DAY: &str = "bucket://quiz/2026-09-30";

    fn base() -> Url {
        serve_url("http://127.0.0.1:41234/").unwrap()
    }

    #[test]
    fn learn_link_routes_to_learn() {
        assert_eq!(link_route(LEARN_LINK).as_deref(), Some("/learn"));
        assert_eq!(link_route("bucket://learn/").as_deref(), Some("/learn"));
        assert_eq!(link_route(DAY).as_deref(), Some("/work/daily/2026-09-30"));
        let args = vec!["bucket".to_string(), LEARN_LINK.to_string()];
        assert_eq!(route_in(&args).as_deref(), Some("/learn"));
        for link in ["bucket://learn/x", "bucket://learn?x=1", "bucket://learn#/import", "bucket://Learn", "bucket://learnx", "http://learn", " bucket://learn", "bucket://learn/../quiz"] {
            assert_eq!(link_route(link), None, "{link}");
        }
    }

    #[test]
    fn accepts_the_one_quiz_link_form() {
        assert_eq!(quiz_route(DAY).as_deref(), Some("/work/daily/2026-09-30"));
        assert_eq!(quiz_route("bucket://quiz/2028-02-29").as_deref(), Some("/work/daily/2028-02-29"));
        assert_eq!(quiz_route("bucket://quiz/2000-02-29").as_deref(), Some("/work/daily/2000-02-29"));
    }

    #[test]
    fn rejects_wrong_schemes_and_hosts() {
        for link in [
            "http://quiz/2026-09-30",
            "https://quiz/2026-09-30",
            "file:///quiz/2026-09-30",
            "javascript:alert(1)",
            "javascript://quiz/2026-09-30",
            "bucket:quiz/2026-09-30",
            "bucket:/quiz/2026-09-30",
            "bucket:///quiz/2026-09-30",
            "Bucket://quiz/2026-09-30",
            "BUCKET://QUIZ/2026-09-30",
            "bucket://Quiz/2026-09-30",
            "bucket://quizz/2026-09-30",
            "bucket://work/2026-09-30",
            "bucket://user@quiz/2026-09-30",
            "bucket://user:pw@quiz/2026-09-30",
            "bucket://quiz:80/2026-09-30",
            "bucket://quiz.evil.example/2026-09-30",
            "buckets://quiz/2026-09-30",
            " bucket://quiz/2026-09-30",
            "",
        ] {
            assert_eq!(quiz_route(link), None, "{link}");
        }
    }

    #[test]
    fn rejects_extra_segments_queries_fragments_and_traversal() {
        for tail in [
            "2026-09-30/",
            "2026-09-30/extra",
            "2026-09-30/../../etc",
            "../2026-09-30",
            "..",
            "../../etc/passwd",
            "2026-09-30?x=1",
            "2026-09-30?",
            "2026-09-30#/import",
            "2026-09-30#",
            "2026-09-30;rm -rf ~",
            "2026-09-30 --flag",
            "2026-09-30\n",
            "2026-09-30\r\n",
            "2026-09-30\0",
            "2026-09-30'",
            "2026-09-30\"",
            "2026-09-30`id`",
            "$(id)",
            "",
        ] {
            assert_eq!(quiz_route(&format!("{LINK_PREFIX}{tail}")), None, "{tail:?}");
        }
    }

    #[test]
    fn rejects_encoded_and_non_ascii_days() {
        for tail in [
            "2026%2D09%2D30",
            "2026-09-3%30",
            "%32%30%32%36-09-30",
            "2026-09-30%00",
            "2026-09-30%2F..",
            "%2e%2e%2f",
            "２０２６-09-30",
            "2026‑09‑30",
            "2026-09-3０",
            "٢٠٢٦-٠٩-٣٠",
            "2026-09-é",
        ] {
            assert_eq!(quiz_route(&format!("{LINK_PREFIX}{tail}")), None, "{tail:?}");
        }
    }

    #[test]
    fn rejects_days_that_are_no_calendar_date() {
        for tail in [
            "2026-13-40", "2026-00-10", "2026-01-00", "2026-02-29", "1900-02-29", "2026-04-31", "2026-9-30", "26-09-30", "2026-09-3", "20260930", "2026/09/30", "2026-09-30T00", "today",
            "latest", "+026-09-30", "-026-09-30", "2026-0x-30", "2026-09-1e", "    -  -  ",
        ] {
            assert_eq!(quiz_route(&format!("{LINK_PREFIX}{tail}")), None, "{tail:?}");
        }
    }

    #[test]
    fn rejects_over_long_input() {
        assert_eq!(quiz_route(&format!("{DAY}{}", "0".repeat(1 << 20))), None);
        assert_eq!(quiz_route(&format!("{LINK_PREFIX}{}", "9".repeat(4096))), None);
        assert_eq!(quiz_route(&"bucket://quiz/".repeat(100_000)), None);
    }

    #[test]
    fn launch_arguments_yield_the_first_valid_link_and_skip_the_program_name() {
        assert_eq!(route_in(&args(&["bucket-desktop"])), None);
        assert_eq!(route_in(&args(&[DAY])), None);
        assert_eq!(route_in(&args(&["bucket-desktop", DAY])).as_deref(), Some("/work/daily/2026-09-30"));
        assert_eq!(route_in(&args(&["bucket-desktop", "--flag", "bucket://quiz/../x", DAY, "bucket://quiz/2026-10-01"])).as_deref(), Some("/work/daily/2026-09-30"));
        assert_eq!(route_in(&args(&["bucket-desktop", "serve", "--port", "1", "http://evil.example/"])), None);
    }

    #[test]
    fn the_route_lands_in_the_fragment_and_leaves_the_loopback_origin_alone() {
        let url = with_route(&base(), &quiz_route(DAY).unwrap());
        assert_eq!(url.as_str(), "http://127.0.0.1:41234/#/work/daily/2026-09-30");
        assert_eq!((url.scheme(), url.host_str(), url.port(), url.path(), url.query()), ("http", Some("127.0.0.1"), Some(41234), "/", None));
        assert!(serve_url(url.as_str()).is_some());
    }

    #[test]
    fn a_link_before_the_sidecar_waits_and_rides_the_first_navigation() {
        let mut s = LinkState::default();
        assert_eq!(s.request("/work/daily/2026-09-29".into()), None);
        assert_eq!(s.request("/work/daily/2026-09-30".into()), None);
        assert_eq!(s.first_target(&base()).as_str(), "http://127.0.0.1:41234/#/work/daily/2026-09-30");
        assert_eq!(s.first_target(&base()).as_str(), "http://127.0.0.1:41234/");
    }

    #[test]
    fn a_link_after_the_sidecar_navigates_at_once_and_only_by_fragment() {
        let mut s = LinkState::default();
        assert_eq!(s.first_target(&base()), base());
        s.loaded(base());
        let url = s.request("/work/daily/2026-09-30".into()).unwrap();
        assert_eq!(url.as_str(), "http://127.0.0.1:41234/#/work/daily/2026-09-30");
        let mut same = url.clone();
        same.set_fragment(None);
        assert_eq!(same, base());
    }

    #[derive(Default)]
    struct Spy {
        calls: std::cell::RefCell<Vec<String>>,
        navigation_fails: bool,
        sidecar_fails: bool,
    }

    impl Spy {
        fn calls(&self) -> Vec<String> {
            self.calls.borrow().clone()
        }
    }

    impl Host for Spy {
        fn navigate(&self, url: Url) -> Result<(), String> {
            self.calls.borrow_mut().push(format!("navigate {url}"));
            if self.navigation_fails { Err("closed".into()) } else { Ok(()) }
        }

        fn raise(&self) {
            self.calls.borrow_mut().push("raise".into());
        }

        fn start_sidecar(&self) -> Result<(), String> {
            self.calls.borrow_mut().push("start_sidecar".into());
            if self.sidecar_fails { Err("missing".into()) } else { Ok(()) }
        }

        fn report(&self, message: &str) {
            self.calls.borrow_mut().push(format!("report {message}"));
        }
    }

    fn args(v: &[&str]) -> Vec<String> {
        v.iter().map(|s| s.to_string()).collect()
    }

    fn running() -> Mutex<LinkState> {
        let link = Mutex::new(LinkState::default());
        assert!(sidecar_ready(&Spy::default(), &link, base()));
        link
    }

    #[test]
    fn a_second_launch_with_a_link_navigates_by_fragment_raises_and_starts_no_sidecar() {
        let (spy, link) = (Spy::default(), running());
        second_launch(&spy, &link, &args(&["bucket-desktop", DAY]));
        assert_eq!(spy.calls(), ["navigate http://127.0.0.1:41234/#/work/daily/2026-09-30", "raise"]);
    }

    #[test]
    fn a_second_launch_without_a_valid_link_only_raises_the_window() {
        for argv in [
            args(&["bucket-desktop"]),
            args(&["bucket-desktop", "bucket://quiz/../../etc"]),
            args(&["bucket-desktop", "serve", "--port", "1"]),
            args(&["bucket-desktop", "https://evil.example/"]),
            args(&[]),
        ] {
            let (spy, link) = (Spy::default(), running());
            second_launch(&spy, &link, &argv);
            assert_eq!(spy.calls(), ["raise"], "{argv:?}");
        }
    }

    #[test]
    fn a_second_launch_before_the_sidecar_is_ready_queues_the_route_and_starts_nothing() {
        let (spy, link) = (Spy::default(), Mutex::new(LinkState::default()));
        second_launch(&spy, &link, &args(&["bucket-desktop", DAY]));
        assert_eq!(spy.calls(), ["raise"]);
        assert!(sidecar_ready(&spy, &link, base()));
        assert_eq!(spy.calls(), ["raise", "navigate http://127.0.0.1:41234/#/work/daily/2026-09-30"]);
    }

    #[test]
    fn the_first_launch_starts_one_sidecar_and_holds_its_link_for_the_first_navigation() {
        let (spy, link) = (Spy::default(), Mutex::new(LinkState::default()));
        first_launch(&spy, &link, &args(&["bucket-desktop", DAY]));
        assert_eq!(spy.calls(), ["start_sidecar"]);
        assert!(sidecar_ready(&spy, &link, base()));
        assert_eq!(spy.calls(), ["start_sidecar", "navigate http://127.0.0.1:41234/#/work/daily/2026-09-30"]);
        let plain = Spy::default();
        let fresh = Mutex::new(LinkState::default());
        first_launch(&plain, &fresh, &args(&["bucket-desktop"]));
        assert!(sidecar_ready(&plain, &fresh, base()));
        assert_eq!(plain.calls(), ["start_sidecar", "navigate http://127.0.0.1:41234/"]);
    }

    #[test]
    fn a_sidecar_that_fails_to_start_is_reported() {
        let spy = Spy { sidecar_fails: true, ..Spy::default() };
        first_launch(&spy, &Mutex::new(LinkState::default()), &args(&["bucket-desktop"]));
        assert_eq!(spy.calls(), ["start_sidecar", "report bkt serve did not start: missing"]);
    }

    #[test]
    fn a_failed_first_navigation_leaves_no_base_for_later_links() {
        let spy = Spy { navigation_fails: true, ..Spy::default() };
        let link = Mutex::new(LinkState::default());
        assert!(!sidecar_ready(&spy, &link, base()));
        assert_eq!(link.lock().unwrap().request("/work/daily/2026-09-30".into()), None);
    }

    #[test]
    fn a_stopped_sidecar_clears_the_base_so_a_later_link_navigates_nowhere() {
        let (spy, link) = (Spy::default(), running());
        sidecar_stopped(&spy, &link, "exit code Some(1)");
        second_launch(&spy, &link, &args(&["bucket-desktop", DAY]));
        assert_eq!(spy.calls(), ["report bkt serve stopped: exit code Some(1)", "raise"]);
    }

    #[test]
    fn single_instance_registers_before_every_other_plugin() {
        let shipped = include_str!("lib.rs").split("#[cfg(test)]").next().unwrap();
        let first = shipped.find(".plugin(").unwrap();
        assert!(shipped[first..].starts_with(".plugin(tauri_plugin_single_instance::init("));
    }

    const ID: &str = "AbCdEfGhIjKlMnOpQrSt-_";

    fn digest() -> String {
        "a1".repeat(32)
    }

    fn fields(id: &str, digest: &str, title: &str, body: &str) -> serde_json::Value {
        serde_json::json!({ "id": id, "digest": digest, "slug": "demo", "output": "A demo paper", "title": title, "body": body, "approvable": true })
    }

    fn line(id: &str, digest: &str, title: &str, body: &str) -> String {
        format!("{CONSENT_PREFIX}{}", fields(id, digest, title, body))
    }

    fn request() -> ConsentRequest {
        ConsentRequest { id: ID.to_string(), digest: digest(), slug: "demo".to_string(), output: "A demo paper".to_string(), title: "Allow this build?".to_string(), body: "A demo paper\nBuild: Paper PDF".to_string(), approvable: true }
    }

    fn with(key: &str, value: serde_json::Value) -> String {
        let mut v = fields(ID, &digest(), "T", "B");
        v[key] = value;
        format!("{CONSENT_PREFIX}{v}")
    }

    fn asked(request: ConsentRequest) -> (ConsentDesk, Instant) {
        let mut desk = ConsentDesk::default();
        let t0 = Instant::now();
        assert_eq!(desk.begin(request, "K7QM".to_string(), t0), Decision::Ask);
        (desk, t0)
    }

    const ASK: &str = "bkt-consent://localhost/ask";

    fn allow(code: &str) -> String {
        format!("bkt-consent://localhost/answer?act=allow&code={code}")
    }

    #[test]
    fn consent_request_accepts_the_one_line_form() {
        assert_eq!(consent_request(&line(ID, &digest(), "Allow this build?", "A demo paper\nBuild: Paper PDF")), Some(request()));
        assert!(consent_request(&line(ID, &digest(), &"t".repeat(CONSENT_TITLE_CHARS), &"b".repeat(CONSENT_BODY_CHARS))).is_some());
        assert!(consent_request(&line(ID, &digest(), "", "")).is_some());
        assert_eq!(consent_request(&with("approvable", serde_json::json!(false))).map(|r| r.approvable), Some(false));
    }

    #[test]
    fn consent_request_rejects_a_wrong_prefix_an_unknown_field_a_short_id_and_an_over_long_body() {
        let good = line(ID, &digest(), "T", "B");
        let json = good.strip_prefix(CONSENT_PREFIX).unwrap();
        let mut missing = fields(ID, &digest(), "T", "B");
        missing.as_object_mut().unwrap().remove("approvable");
        for bad in [
            format!(" {good}"),
            format!("bkt-consent{json}"),
            format!("BKT-CONSENT {json}"),
            format!("consent {json}"),
            json.to_string(),
            with("remember", serde_json::json!(true)),
            format!("{CONSENT_PREFIX}{missing}"),
            format!("{CONSENT_PREFIX}{}", serde_json::json!([ID, digest(), "demo", "A demo paper", "T", "B", true])),
            with("id", serde_json::json!(7)),
            with("approvable", serde_json::json!("true")),
            format!("{CONSENT_PREFIX}not json"),
            line(&ID[1..], &digest(), "T", "B"),
            line(&format!("{ID}x"), &digest(), "T", "B"),
            line("AbCdEfGhIjKlMnOpQrSt+/", &digest(), "T", "B"),
            line(ID, &digest()[1..], "T", "B"),
            line(ID, &digest().to_uppercase(), "T", "B"),
            line(ID, &"g".repeat(64), "T", "B"),
            line(ID, &digest(), &"t".repeat(CONSENT_TITLE_CHARS + 1), "B"),
            line(ID, &digest(), "T", &"b".repeat(CONSENT_BODY_CHARS + 1)),
            with("output", serde_json::json!("o".repeat(CONSENT_TITLE_CHARS + 1))),
            with("slug", serde_json::json!("")),
            with("slug", serde_json::json!("Bad_Slug")),
            with("slug", serde_json::json!("../demo")),
            with("slug", serde_json::json!("-demo")),
            with("slug", serde_json::json!("s".repeat(65))),
            String::new(),
            "http://127.0.0.1:41234/".to_string(),
        ] {
            assert_eq!(consent_request(&bad), None, "{bad:?}");
        }
    }

    #[test]
    fn a_line_split_across_two_chunks_is_read_once() {
        let whole = format!("{}\n", line(ID, &digest(), "Allow this build?", "A demo paper\nBuild: Paper PDF"));
        let (first, second) = whole.as_bytes().split_at(40);
        let mut buffer = LineBuffer::default();
        assert_eq!(read_stdout(&mut buffer, true, first), vec![]);
        assert_eq!(buffer.held(), 40);
        assert_eq!(read_stdout(&mut buffer, true, second), vec![Read::Consent(request())]);
        assert_eq!(buffer.held(), 0);
        assert_eq!(read_stdout(&mut buffer, true, b""), vec![]);
        let mut bytewise = LineBuffer::default();
        let read: Vec<Read> = whole.as_bytes().iter().flat_map(|b| read_stdout(&mut bytewise, true, &[*b])).collect();
        assert_eq!(read, vec![Read::Consent(request())]);
        let mut two = LineBuffer::default();
        assert_eq!(two.push(b"one\r\ntwo\nthr"), vec!["one".to_string(), "two".to_string()]);
        assert_eq!(two.push(b"ee\n"), vec!["three".to_string()]);
    }

    #[test]
    fn a_64_kb_chunk_with_no_line_feed_clears_the_buffer() {
        let mut buffer = LineBuffer::default();
        assert_eq!(buffer.push(&vec![b'x'; STDOUT_CAP]), Vec::<String>::new());
        assert_eq!(buffer.held(), STDOUT_CAP);
        assert_eq!(buffer.push(b"y"), Vec::<String>::new());
        assert_eq!(buffer.held(), 0);
        let good = format!("{}\n", line(ID, &digest(), "T", "B"));
        assert_eq!(read_stdout(&mut buffer, true, good.as_bytes()).len(), 1);
        let mut flood = LineBuffer::default();
        let mut forged = vec![b'x'; STDOUT_CAP + 1];
        forged.extend_from_slice(good.as_bytes());
        assert_eq!(read_stdout(&mut flood, true, &forged), vec![]);
    }

    #[test]
    fn a_second_request_while_a_dialog_is_open_is_denied() {
        let (mut desk, t0) = asked(request());
        assert_eq!(desk.open().map(|o| o.request.id.as_str()), Some(ID));
        let other = ConsentRequest { id: "Zz".repeat(11), slug: "other".to_string(), ..request() };
        assert_eq!(desk.begin(other.clone(), "AAAA".to_string(), t0), Decision::Deny(format!("consent {} {} deny\n", other.id, other.digest)));
        assert_eq!(desk.begin(request(), "AAAA".to_string(), t0), Decision::Deny(format!("consent {ID} {} deny\n", digest())));
        assert_eq!(desk.open().map(|o| o.code.as_str()), Some("K7QM"));
        assert_eq!(desk.expire(&other.id, t0), Outcome::Nothing);
        assert_eq!(desk.expire(ID, t0), Outcome::Done(format!("consent {ID} {} deny\n", digest())));
        assert_eq!(desk.begin(other, "AAAA".to_string(), t0), Decision::Ask);
        assert_eq!(consent_answer(ID, &digest(), true), format!("consent {ID} {} allow\n", digest()));
    }

    #[test]
    fn after_a_denial_or_a_dismissal_no_window_opens_for_that_output_for_thirty_seconds() {
        for act in [Act::Deny, Act::Closed] {
            let (mut desk, t0) = asked(request());
            assert_eq!(desk.answer(act, t0 + Duration::from_secs(5)), Outcome::Done(format!("consent {ID} {} deny\n", digest())));
            let denied_at = t0 + Duration::from_secs(5);
            let again = ConsentRequest { id: "Bb".repeat(11), ..request() };
            assert!(matches!(desk.begin(again.clone(), "AAAA".to_string(), denied_at + Duration::from_secs(29)), Decision::Deny(_)));
            assert!(desk.open().is_none());
            let other = ConsentRequest { id: "Cc".repeat(11), slug: "other".to_string(), ..request() };
            assert_eq!(desk.begin(other, "AAAA".to_string(), denied_at + Duration::from_secs(1)), Decision::Ask);
            assert_eq!(desk.answer(Act::Allow("AAAA".to_string()), denied_at + Duration::from_secs(10)), Outcome::Done(format!("consent {} {} allow\n", "Cc".repeat(11), digest())));
            assert_eq!(desk.begin(again, "AAAA".to_string(), denied_at + CONSENT_QUIET), Decision::Ask);
        }
        let (mut desk, t0) = asked(request());
        assert!(matches!(desk.answer(Act::Allow("K7QM".to_string()), t0 + CONSENT_ARM), Outcome::Done(_)));
        assert_eq!(desk.begin(ConsentRequest { id: "Dd".repeat(11), ..request() }, "AAAA".to_string(), t0 + Duration::from_secs(3)), Decision::Ask);
        assert_eq!(CONSENT_QUIET, Duration::from_secs(30));
    }

    #[test]
    fn approval_needs_the_code_typed_after_two_seconds_and_works_once() {
        let (mut desk, t0) = asked(request());
        let late = t0 + CONSENT_ARM;
        assert_eq!(desk.answer(Act::Allow("K7QM".to_string()), t0 + Duration::from_millis(1999)), Outcome::Stay(Note::TooSoon));
        assert_eq!(desk.answer(Act::Allow(String::new()), late), Outcome::Stay(Note::WrongCode));
        assert_eq!(desk.answer(Act::Allow("K7QN".to_string()), late), Outcome::Stay(Note::WrongCode));
        assert_eq!(desk.open().map(|o| o.wrong), Some(2));
        assert_eq!(desk.answer(Act::Allow(" k7qm ".to_string()), late), Outcome::Done(format!("consent {ID} {} allow\n", digest())));
        assert_eq!(desk.answer(Act::Allow("K7QM".to_string()), late), Outcome::Nothing);
        assert_eq!(desk.answer(Act::Deny, late), Outcome::Nothing);
        let (mut wrong, t1) = asked(request());
        let late = t1 + CONSENT_ARM;
        assert_eq!(wrong.answer(Act::Allow("AAAA".to_string()), late), Outcome::Stay(Note::WrongCode));
        assert_eq!(wrong.answer(Act::Allow("K7Q".to_string()), late), Outcome::Stay(Note::WrongCode));
        assert_eq!(wrong.answer(Act::Allow("K7QMM".to_string()), late), Outcome::Done(format!("consent {ID} {} deny\n", digest())));
        assert_eq!(wrong.answer(Act::Allow("K7QM".to_string()), late), Outcome::Nothing);
        assert_eq!((CONSENT_ARM, CONSENT_WRONG_LIMIT), (Duration::from_secs(2), 3));
    }

    #[test]
    fn a_request_the_window_cannot_show_in_full_is_never_approved_there() {
        let cut = ConsentRequest { approvable: false, body: "A demo paper\n\n1 file is not shown in full here".to_string(), ..request() };
        let (mut desk, t0) = asked(cut);
        let late = t0 + Duration::from_secs(60);
        let page = consent_reply(&mut desk, CONSENT_WINDOW, ASK, late).page;
        assert!(!page.contains("K7QM"));
        assert!(!page.contains("class=\"allow\""));
        assert!(!page.contains("name=\"code\""));
        assert!(page.contains("This window cannot approve this build"));
        assert!(page.contains("class=\"deny\" type=\"submit\" autofocus"));
        assert_eq!(desk.answer(Act::Allow("K7QM".to_string()), late), Outcome::Stay(Note::TerminalAlone));
        let reply = consent_reply(&mut desk, CONSENT_WINDOW, &allow("K7QM"), late);
        assert_eq!((reply.line, reply.close), (None, false));
        assert_eq!(desk.open().map(|o| o.wrong), Some(0));
        assert_eq!(desk.answer(Act::Deny, late), Outcome::Done(format!("consent {ID} {} deny\n", digest())));
    }

    #[test]
    fn the_page_puts_deny_in_focus_and_approve_behind_the_code_with_no_script() {
        let (mut desk, t0) = asked(request());
        let page = consent_reply(&mut desk, CONSENT_WINDOW, ASK, t0).page;
        assert!(page.contains("<title>Bucket: A demo paper</title>"));
        assert!(page.contains("<h1>Bucket: A demo paper</h1>"));
        assert!(page.contains("<h2>Allow this build?</h2>"));
        assert!(page.contains("<span class=\"code\">K7QM</span>"));
        assert!(page.contains("required minlength=\"4\" maxlength=\"4\" pattern=\"K7QM|k7qm\""));
        assert!(page.contains(&format!("Request {ID}<br>Full digest {}", digest())));
        assert_eq!(page.matches("autofocus").count(), 1);
        assert!(page.contains("<button class=\"deny\" type=\"submit\" autofocus>Deny</button>"));
        assert!(page.contains("<button class=\"allow\" type=\"submit\">Approve</button>"));
        assert!(page.contains("button.allow{pointer-events:none;opacity:.35;animation:arm 0s linear 2s forwards}"));
        assert!(page.contains("form:invalid button.allow{pointer-events:none!important"));
        let lower = page.to_lowercase();
        for banned in ["<script", "javascript:", "onclick", "onload", "http://", "https://", "<img", "<iframe", "<link", "@import", "url("] {
            assert!(!lower.contains(banned), "{banned}");
        }
        assert_eq!(consent_title("A demo paper"), "Bucket: A demo paper");
    }

    #[test]
    fn markup_direction_marks_and_control_characters_show_as_text() {
        assert_eq!(visible("evil\u{202E}txt.exe"), "evil<U+202E>txt.exe");
        for c in ['\u{0}', '\u{7}', '\u{1B}', '\u{7F}', '\u{85}', '\u{61C}', '\u{200B}', '\u{200E}', '\u{200F}', '\u{202A}', '\u{202D}', '\u{2066}', '\u{2069}', '\u{FEFF}', '\r'] {
            let shown = visible(&format!("a{c}b"));
            assert!(shown.starts_with("a<U+") && shown.ends_with(">b") && !shown.contains(c), "{:04X}", c as u32);
        }
        assert_eq!(visible("tab\tand line\nfeed, é, 数"), "tab\tand line\nfeed, é, 数");
        assert_eq!(html("<b onclick=\"x\">&'</b>"), "&lt;b onclick=&quot;x&quot;&gt;&amp;&#39;&lt;/b&gt;");
        let hostile = ConsentRequest {
            output: "Paper\u{202E}</title><script>alert(1)</script>".to_string(),
            title: "<img src=x onerror=alert(1)>".to_string(),
            body: "papers/demo/\u{202E}gpj.py\u{7}\n</pre><form action=\"/answer\"><input name=\"act\" value=\"allow\">".to_string(),
            ..request()
        };
        let (mut desk, t0) = asked(hostile);
        let page = consent_reply(&mut desk, CONSENT_WINDOW, ASK, t0).page;
        assert!(!page.contains('\u{202E}') && !page.contains('\u{7}'));
        assert!(!page.contains("<script>") && !page.contains("<img") && !page.contains("</pre><form"));
        assert!(page.contains("Paper&lt;U+202E&gt;&lt;/title&gt;&lt;script&gt;"));
        assert!(page.contains("papers/demo/&lt;U+202E&gt;gpj.py&lt;U+0007&gt;"));
        assert_eq!(page.matches("<form").count(), 2);
        assert_eq!(page.matches("</pre>").count(), 1);
    }

    #[test]
    fn only_the_approval_window_is_answered_and_only_at_its_two_addresses() {
        let (mut desk, t0) = asked(request());
        let late = t0 + CONSENT_ARM;
        for label in ["main", "", "consent2", "Consent"] {
            for uri in [ASK, &allow("K7QM"), "bkt-consent://localhost/answer?act=deny"] {
                let reply = consent_reply(&mut desk, label, uri, late);
                assert_eq!((reply.status, reply.line, reply.close), (403, None, false), "{label} {uri}");
                assert!(!reply.page.contains("K7QM"));
            }
        }
        assert_eq!(desk.open().map(|o| o.wrong), Some(0));
        for uri in ["bkt-consent://localhost/", "bkt-consent://localhost/other", "bkt-consent://localhost/answer", "bkt-consent://localhost/answer?act=maybe", "bkt-consent://localhost/answer?act=allow&code=K7QM&extra=1", "bkt-consent://localhost/answer?act=deny&act=allow&code=K7QM", "not a url"] {
            let reply = consent_reply(&mut desk, CONSENT_WINDOW, uri, late);
            assert_eq!((reply.status, reply.line, reply.close), (403, None, false), "{uri}");
        }
        assert_eq!(consent_act("bkt-consent://localhost/answer?act=deny"), Some(Act::Deny));
        assert_eq!(consent_act("http://bkt-consent.localhost/answer?act=allow&code=k7qm"), Some(Act::Allow("k7qm".to_string())));
        assert_eq!(consent_act("bkt-consent://localhost/answer?act=allow"), Some(Act::Allow(String::new())));
        let wrong = consent_reply(&mut desk, CONSENT_WINDOW, &allow("ZZZZ"), late);
        assert_eq!((wrong.status, wrong.line.clone(), wrong.close), (200, None, false));
        assert!(wrong.page.contains("That code does not match"));
        let right = consent_reply(&mut desk, CONSENT_WINDOW, &allow("K7QM"), late);
        assert_eq!((right.status, right.line, right.close), (200, Some(format!("consent {ID} {} allow\n", digest())), true));
        let again = consent_reply(&mut desk, CONSENT_WINDOW, &allow("K7QM"), late);
        assert_eq!((again.line, again.close), (None, true));
    }

    #[test]
    fn a_request_settled_elsewhere_closes_its_window_and_sends_no_answer() {
        let (mut desk, t0) = asked(request());
        assert_eq!(consent_done(&format!("{CONSENT_DONE_PREFIX}{ID}")), Some(ID.to_string()));
        for bad in [format!("{CONSENT_DONE_PREFIX}{}", &ID[1..]), format!("{CONSENT_DONE_PREFIX}{ID} "), format!(" {CONSENT_DONE_PREFIX}{ID}"), format!("bkt-consent-done{ID}"), CONSENT_DONE_PREFIX.to_string()] {
            assert_eq!(consent_done(&bad), None, "{bad:?}");
        }
        let mut buffer = LineBuffer::default();
        assert_eq!(read_stdout(&mut buffer, true, format!("{CONSENT_DONE_PREFIX}{ID}\n").as_bytes()), vec![Read::Settled(ID.to_string())]);
        assert!(!desk.forget(&"Zz".repeat(11)));
        assert!(desk.open().is_some());
        assert!(desk.forget(ID));
        assert!(desk.open().is_none());
        assert!(!desk.forget(ID));
        assert_eq!(desk.answer(Act::Closed, t0), Outcome::Nothing);
        assert_eq!(desk.begin(ConsentRequest { id: "Ee".repeat(11), ..request() }, "AAAA".to_string(), t0), Decision::Ask);
    }

    #[test]
    fn the_code_is_four_characters_from_an_alphabet_with_no_look_alikes() {
        assert_eq!(consent_code([0, 1, 31, 32]), "AB9A");
        assert_eq!(consent_code([255, 254, 253, 252]), "9876");
        for c in consent_code([7, 77, 177, 207]).chars() {
            assert!(CODE_ALPHABET.contains(&(c as u8)));
        }
        assert_eq!(CODE_ALPHABET.len(), 32);
        for banned in [b'0', b'O', b'1', b'I'] {
            assert!(!CODE_ALPHABET.contains(&banned));
        }
    }

    #[test]
    fn stdout_after_open_still_reaches_the_reader() {
        let mut buffer = LineBuffer::default();
        let ask = format!("{}\n", line(ID, &digest(), "Allow this build?", "A demo paper\nBuild: Paper PDF"));
        assert_eq!(read_stdout(&mut buffer, false, ask.as_bytes()), vec![]);
        assert_eq!(read_stdout(&mut buffer, false, b"bkt serve: pack v3\nhttp://127.0.0.1:41234/\n"), vec![Read::Url(base())]);
        assert_eq!(read_stdout(&mut buffer, true, b"http://127.0.0.1:41234/\na log line\n"), vec![]);
        assert_eq!(read_stdout(&mut buffer, true, ask.as_bytes()), vec![Read::Consent(request())]);
        let together = format!("http://127.0.0.1:41234/\n{ask}");
        assert_eq!(read_stdout(&mut LineBuffer::default(), false, together.as_bytes()), vec![Read::Url(base()), Read::Consent(request())]);
        let shipped = include_str!("lib.rs").split("#[cfg(test)]").next().unwrap();
        assert!(shipped.contains("CommandEvent::Stdout(bytes) => {"));
        assert!(!shipped.contains("if !opened =>"));
    }

    #[test]
    fn the_approval_window_belongs_to_the_shell_and_the_page_gains_no_call() {
        let shipped = include_str!("lib.rs").split("#[cfg(test)]").next().unwrap();
        assert!(shipped.contains(".register_uri_scheme_protocol(CONSENT_SCHEME,"));
        assert!(shipped.contains("tauri::WebviewUrl::CustomProtocol(page)"));
        assert!(shipped.contains("default-src 'none'"));
        assert_eq!(shipped.matches("invoke_handler").count(), 1);
        assert!(shipped.contains(".invoke_handler(tauri::generate_handler![launch_agent])"));
        assert_eq!(shipped.matches("#[tauri::command]").count(), 1);
        assert!(!shipped.contains("tauri_plugin_dialog"));
        assert!(!shipped.contains(".eval(&format!(\"document.getElementById('consent"));
        let caps: serde_json::Value = serde_json::from_str(include_str!("../capabilities/default.json")).unwrap();
        assert_eq!(caps["permissions"], serde_json::json!([]));
        assert_eq!(caps["windows"], serde_json::json!(["main"]));
    }

    #[test]
    fn the_page_gains_exactly_launch_agent_and_nothing_writes_the_folder_list() {
        let shipped = include_str!("lib.rs").split("#[cfg(test)]").next().unwrap();
        let caps: serde_json::Value = serde_json::from_str(include_str!("../capabilities/agents.json")).unwrap();
        assert_eq!(caps["permissions"], serde_json::json!(["allow-launch-agent"]));
        assert_eq!(caps["windows"], serde_json::json!(["main"]));
        assert_eq!(caps["remote"]["urls"], serde_json::json!(["http://127.0.0.1:*"]));
        assert!(include_str!("../build.rs").contains(".commands(&[\"launch_agent\"])"));
        let conf: serde_json::Value = serde_json::from_str(include_str!("../tauri.conf.json")).unwrap();
        assert_eq!(conf["app"]["security"]["capabilities"], serde_json::json!(["default", "agents"]));
        assert_eq!(conf["app"]["withGlobalTauri"], serde_json::json!(false));
        let command = shipped.split("fn launch_agent(").nth(1).unwrap().split("\n}\n").next().unwrap();
        assert!(command.contains("window.label() != \"main\""));
        assert!(!command.contains("add_folder") && !command.contains("write"));
        assert_eq!(shipped.matches("agents::add_folder(").count(), 1);
        let approve = shipped.split("fn approve_folder(").nth(1).unwrap().split("\n}\n").next().unwrap();
        assert!(approve.contains("agents::add_folder(") && approve.contains("rfd::AsyncFileDialog::new()"));
        assert_eq!(shipped.matches("approve_folder(app)").count(), 1);
        assert!(shipped.contains("if event.id() == agents::APPROVE_MENU_ID {"));
    }

    #[test]
    fn accepts_the_loopback_url_bkt_serve_prints() {
        assert_eq!(serve_url("http://127.0.0.1:41234/\n").unwrap().as_str(), "http://127.0.0.1:41234/");
    }

    #[test]
    fn rejects_other_hosts_and_log_lines() {
        assert!(serve_url("http://example.com:80/").is_none());
        assert!(serve_url("https://127.0.0.1:41234/").is_none());
        assert!(serve_url("bkt serve: pack v3").is_none());
        assert!(serve_url("http://127.0.0.1/").is_none());
    }
}
