use std::sync::Mutex;
use tauri::{Manager, RunEvent, Url};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};
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

pub fn route_in(args: &[String]) -> Option<String> {
    args.iter().skip(1).find_map(|a| quiz_route(a))
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
    pub title: String,
    pub body: String,
}

pub fn consent_request(line: &str) -> Option<ConsentRequest> {
    let value: serde_json::Value = serde_json::from_str(line.strip_prefix(CONSENT_PREFIX)?).ok()?;
    if !value.is_object() {
        return None;
    }
    let request: ConsentRequest = serde_json::from_value(value).ok()?;
    let id = request.id.len() == 22 && request.id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_');
    let digest = request.digest.len() == 64 && request.digest.bytes().all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b));
    let sized = request.title.chars().count() <= CONSENT_TITLE_CHARS && request.body.chars().count() <= CONSENT_BODY_CHARS;
    (id && digest && sized).then_some(request)
}

#[derive(Debug, PartialEq, Eq)]
pub enum Read {
    Url(Url),
    Consent(ConsentRequest),
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
        }
    }
    out
}

pub fn consent_answer(id: &str, digest: &str, allow: bool) -> String {
    format!("consent {id} {digest} {}\n", if allow { "allow" } else { "deny" })
}

#[derive(Default)]
pub struct ConsentGate(Mutex<Option<String>>);

impl ConsentGate {
    pub fn begin(&self, id: &str) -> bool {
        let mut open = self.0.lock().unwrap();
        if open.is_some() {
            return false;
        }
        *open = Some(id.to_string());
        true
    }

    pub fn end(&self, id: &str) {
        let mut open = self.0.lock().unwrap();
        if open.as_deref() == Some(id) {
            *open = None;
        }
    }

    pub fn open(&self) -> Option<String> {
        self.0.lock().unwrap().clone()
    }
}

#[derive(Debug, PartialEq, Eq)]
pub enum Decision {
    Ask(ConsentRequest),
    Deny(String),
}

pub fn consent_decision(gate: &ConsentGate, request: ConsentRequest) -> Decision {
    if gate.begin(&request.id) {
        Decision::Ask(request)
    } else {
        Decision::Deny(consent_answer(&request.id, &request.digest, false))
    }
}

struct Consent(ConsentGate);

fn tell_sidecar(app: &tauri::AppHandle, line: &str) {
    if let Some(child) = app.state::<Sidecar>().0.lock().unwrap().as_mut() {
        if let Err(e) = child.write(line.as_bytes()) {
            eprintln!("bucket could not answer the build request: {e}");
        }
    }
}

fn ask_consent(app: &tauri::AppHandle, request: ConsentRequest) {
    match consent_decision(&app.state::<Consent>().0, request) {
        Decision::Deny(line) => tell_sidecar(app, &line),
        Decision::Ask(request) => {
            let handle = app.clone();
            let (id, digest) = (request.id, request.digest);
            app.dialog()
                .message(request.body)
                .title(request.title)
                .buttons(MessageDialogButtons::OkCancelCustom("Allow".into(), "Deny".into()))
                .show(move |allowed| {
                    handle.state::<Consent>().0.end(&id);
                    tell_sidecar(&handle, &consent_answer(&id, &digest, allowed));
                });
        }
    }
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
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(Sidecar(Mutex::new(None)))
        .manage(Consent(ConsentGate::default()))
        .manage(Link(Mutex::new(LinkState::default())))
        .setup(|app| {
            let links = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                if let Some(route) = event.urls().iter().find_map(|u| quiz_route(u.as_str())) {
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

    fn line(id: &str, digest: &str, title: &str, body: &str) -> String {
        format!("{CONSENT_PREFIX}{}", serde_json::json!({ "id": id, "digest": digest, "title": title, "body": body }))
    }

    fn request() -> ConsentRequest {
        ConsentRequest { id: ID.to_string(), digest: digest(), title: "Allow this build?".to_string(), body: "A demo paper\nBuild: Paper PDF".to_string() }
    }

    #[test]
    fn consent_request_accepts_the_one_line_form() {
        assert_eq!(consent_request(&line(ID, &digest(), "Allow this build?", "A demo paper\nBuild: Paper PDF")), Some(request()));
        assert!(consent_request(&line(ID, &digest(), &"t".repeat(CONSENT_TITLE_CHARS), &"b".repeat(CONSENT_BODY_CHARS))).is_some());
        assert!(consent_request(&line(ID, &digest(), "", "")).is_some());
    }

    #[test]
    fn consent_request_rejects_a_wrong_prefix_an_unknown_field_a_short_id_and_an_over_long_body() {
        let good = line(ID, &digest(), "T", "B");
        let json = good.strip_prefix(CONSENT_PREFIX).unwrap();
        for bad in [
            format!(" {good}"),
            format!("bkt-consent{json}"),
            format!("BKT-CONSENT {json}"),
            format!("consent {json}"),
            json.to_string(),
            format!("{CONSENT_PREFIX}{}", serde_json::json!({ "id": ID, "digest": digest(), "title": "T", "body": "B", "remember": true })),
            format!("{CONSENT_PREFIX}{}", serde_json::json!({ "id": ID, "digest": digest(), "title": "T" })),
            format!("{CONSENT_PREFIX}{}", serde_json::json!([ID, digest(), "T", "B"])),
            format!("{CONSENT_PREFIX}{}", serde_json::json!({ "id": 7, "digest": digest(), "title": "T", "body": "B" })),
            format!("{CONSENT_PREFIX}not json"),
            line(&ID[1..], &digest(), "T", "B"),
            line(&format!("{ID}x"), &digest(), "T", "B"),
            line("AbCdEfGhIjKlMnOpQrSt+/", &digest(), "T", "B"),
            line(ID, &digest()[1..], "T", "B"),
            line(ID, &digest().to_uppercase(), "T", "B"),
            line(ID, &"g".repeat(64), "T", "B"),
            line(ID, &digest(), &"t".repeat(CONSENT_TITLE_CHARS + 1), "B"),
            line(ID, &digest(), "T", &"b".repeat(CONSENT_BODY_CHARS + 1)),
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
        let gate = ConsentGate::default();
        assert_eq!(consent_decision(&gate, request()), Decision::Ask(request()));
        assert_eq!(gate.open().as_deref(), Some(ID));
        let other = ConsentRequest { id: "Zz".repeat(11), ..request() };
        assert_eq!(consent_decision(&gate, other.clone()), Decision::Deny(format!("consent {} {} deny\n", other.id, other.digest)));
        assert_eq!(consent_decision(&gate, request()), Decision::Deny(format!("consent {ID} {} deny\n", digest())));
        gate.end(&other.id);
        assert_eq!(gate.open().as_deref(), Some(ID));
        gate.end(ID);
        assert_eq!(gate.open(), None);
        assert_eq!(consent_decision(&gate, other.clone()), Decision::Ask(other));
        assert_eq!(consent_answer(ID, &digest(), true), format!("consent {ID} {} allow\n", digest()));
        assert_eq!(consent_answer(ID, &digest(), false), format!("consent {ID} {} deny\n", digest()));
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
    fn the_dialog_is_native_with_two_buttons_and_the_page_gains_no_call() {
        let shipped = include_str!("lib.rs").split("#[cfg(test)]").next().unwrap();
        assert!(shipped.contains(".plugin(tauri_plugin_dialog::init())"));
        assert!(shipped.contains("MessageDialogButtons::OkCancelCustom(\"Allow\".into(), \"Deny\".into())"));
        assert!(shipped.contains(".show(move |allowed|"));
        assert!(!shipped.contains("invoke_handler"));
        assert!(!shipped.contains("blocking_show"));
        let caps: serde_json::Value = serde_json::from_str(include_str!("../capabilities/default.json")).unwrap();
        assert_eq!(caps["permissions"], serde_json::json!([]));
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
