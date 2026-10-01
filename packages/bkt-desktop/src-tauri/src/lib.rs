use std::sync::Mutex;
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
}

struct Link(Mutex<LinkState>);

fn raise(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

fn open_route(app: &tauri::AppHandle, route: String) {
    let target = app.state::<Link>().0.lock().unwrap().request(route.clone());
    if let (Some(url), Some(w)) = (target, app.get_webview_window("main")) {
        match w.navigate(url) {
            Ok(()) => eprintln!("bucket opened {route}"),
            Err(e) => eprintln!("bucket could not open {route}: {e}"),
        }
    }
    raise(app);
}

fn second_launch(app: &tauri::AppHandle, args: &[String]) {
    match route_in(args) {
        Some(route) => open_route(app, route),
        None => raise(app),
    }
}

struct Sidecar(Mutex<Option<CommandChild>>);

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
        .spawn()
        .map_err(|e| e.to_string())?;
    app.state::<Sidecar>().0.lock().unwrap().replace(child);
    let handle = app.clone();
    tauri::async_runtime::spawn(async move {
        let mut opened = false;
        let mut tail = String::new();
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(bytes) if !opened => {
                    let text = String::from_utf8_lossy(&bytes).to_string();
                    if let Some(url) = text.lines().find_map(serve_url) {
                        if let Some(w) = handle.get_webview_window("main") {
                            let link = handle.state::<Link>();
                            let mut state = link.0.lock().unwrap();
                            let target = state.first_target(&url);
                            opened = w.navigate(target).is_ok();
                            if opened {
                                state.loaded(url);
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
                    eprintln!("bkt serve stopped: {why}");
                    show_error(&handle, &format!("bkt serve stopped: {why}"));
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
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| second_launch(app, &args)))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(Sidecar(Mutex::new(None)))
        .manage(Link(Mutex::new(LinkState::default())))
        .setup(|app| {
            if let Some(route) = route_in(&std::env::args().collect::<Vec<_>>()) {
                app.state::<Link>().0.lock().unwrap().request(route);
            }
            let links = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                if let Some(route) = event.urls().iter().find_map(|u| quiz_route(u.as_str())) {
                    open_route(&links, route);
                }
            });
            if let Err(e) = start(app.handle()) {
                eprintln!("bkt serve did not start: {e}");
                show_error(app.handle(), &format!("bkt serve did not start: {e}"));
            }
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
        let args = |v: &[&str]| v.iter().map(|s| s.to_string()).collect::<Vec<_>>();
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

    fn body_of(name: &str) -> &'static str {
        let src = include_str!("lib.rs");
        let from = src.find(&format!("fn {name}(")).unwrap();
        let rest = &src[from..];
        &rest[..rest.find("\n}\n").unwrap()]
    }

    #[test]
    fn the_second_launch_path_never_reaches_the_sidecar_a_shell_or_eval() {
        for name in ["second_launch", "open_route", "raise", "quiz_route", "route_in", "with_route"] {
            let body = body_of(name);
            for banned in ["start(", "sidecar", "shell()", "Command", "eval(", "spawn", "env("] {
                assert!(!body.contains(banned), "{name} holds {banned}");
            }
        }
        assert!(body_of("second_launch").contains("route_in(args)"));
    }

    #[test]
    fn single_instance_registers_before_every_other_plugin_and_the_sidecar_starts_in_setup_alone() {
        let run = body_of("run");
        let first = run.find(".plugin(").unwrap();
        assert!(run[first..].starts_with(".plugin(tauri_plugin_single_instance::init("));
        let shipped = include_str!("lib.rs").split("#[cfg(test)]").next().unwrap();
        assert_eq!(shipped.matches("start(").count(), 2);
        assert_eq!(shipped.matches("start(app.handle())").count(), 1);
        assert!(run.find(".setup(").unwrap() < run.find("start(app.handle())").unwrap());
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
