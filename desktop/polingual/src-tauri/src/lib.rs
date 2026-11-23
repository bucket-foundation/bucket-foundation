use std::sync::Mutex;
use std::time::Duration;
use tauri::webview::NewWindowResponse;
use tauri::{Manager, Url, WebviewWindowBuilder};
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};

pub const DEFAULT_APP_URL: &str = "https://polingual.com";
pub const SCHEME: &str = "polingual";
pub const RETRY: Duration = Duration::from_secs(5);
pub const PROBE_TIMEOUT: Duration = Duration::from_secs(4);

pub fn app_url() -> Url {
    let raw = option_env!("POLINGUAL_APP_URL").unwrap_or(DEFAULT_APP_URL);
    Url::parse(raw).ok().filter(|u| u.scheme() == "https").unwrap_or_else(|| Url::parse(DEFAULT_APP_URL).unwrap())
}

fn safe_segment(s: &str) -> bool {
    !s.is_empty() && s.len() <= 64 && s.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
}

pub fn link_route(link: &str) -> Option<String> {
    let rest = link.strip_prefix(SCHEME)?.strip_prefix(':')?;
    let rest = rest.trim_start_matches('/');
    let rest = rest.split(['?', '#']).next().unwrap_or("").trim_end_matches('/');
    if rest.is_empty() {
        return Some("/".to_string());
    }
    let segments: Vec<&str> = rest.split('/').collect();
    (segments.len() <= 8 && segments.iter().all(|s| safe_segment(s))).then(|| format!("/{}", segments.join("/")))
}

pub fn route_in(args: &[String]) -> Option<String> {
    args.iter().skip(1).find_map(|a| link_route(a))
}

pub fn with_route(base: &Url, route: &str) -> Url {
    let mut url = base.clone();
    let path = format!("{}{}", base.path().trim_end_matches('/'), route);
    url.set_path(if path.is_empty() { "/" } else { &path });
    url
}

#[derive(Default)]
pub struct LinkState {
    online: bool,
    pending: Option<String>,
}

impl LinkState {
    pub fn request(&mut self, base: &Url, route: String) -> Option<Url> {
        if self.online {
            Some(with_route(base, &route))
        } else {
            self.pending = Some(route);
            None
        }
    }

    pub fn went_offline(&mut self, current: Option<&Url>) {
        self.online = false;
        if self.pending.is_none() {
            self.pending = current.filter(|u| stays_inside(u) && INSIDE_HOSTS.contains(&u.host_str().unwrap_or(""))).map(|u| u.path().to_string()).filter(|p| link_route(&format!("{SCHEME}:/{p}")).is_some());
        }
    }

    pub fn went_online(&mut self, base: &Url) -> Url {
        self.online = true;
        match self.pending.take() {
            Some(route) => with_route(base, &route),
            None => base.clone(),
        }
    }
}

pub const INSIDE_HOSTS: &[&str] = &["polingual.com", "www.polingual.com"];
pub const EMBED_HOSTS: &[&str] = &["www.youtube.com", "youtube.com", "www.youtube-nocookie.com", "youtube-nocookie.com"];

pub const MENU: &[(&str, &str, &str)] = &[("play", "Play", "/play"), ("watch", "Watch", "/play/video"), ("learn", "Learn", "/learn")];

fn youtube_embed(host: &str, path: &str) -> bool {
    EMBED_HOSTS.contains(&host) && (path.starts_with("/embed/") || path == "/iframe_api" || path.starts_with("/s/player/"))
}

pub fn stays_inside(url: &Url) -> bool {
    match url.scheme() {
        "tauri" => url.host_str() == Some("localhost"),
        "http" => url.host_str() == Some("tauri.localhost"),
        "about" => url.as_str() == "about:blank",
        "https" => url.port_or_known_default() == Some(443) && url.host_str().is_some_and(|h| INSIDE_HOSTS.contains(&h) || youtube_embed(h, url.path())),
        _ => false,
    }
}

pub fn opens_outside(url: &Url) -> bool {
    !stays_inside(url) && matches!(url.scheme(), "https" | "http" | "mailto")
}

fn open_in_browser(app: &tauri::AppHandle, url: &Url) {
    if let Err(e) = app.opener().open_url(url.as_str(), None::<&str>) {
        eprintln!("polingual could not open {url} in the browser: {e}");
    }
}

fn send_out(app: &tauri::AppHandle, url: &Url) {
    if opens_outside(url) {
        open_in_browser(app, url);
    } else {
        eprintln!("polingual refused {url}");
    }
}

fn ask_send_out(app: &tauri::AppHandle, url: &Url) {
    if !opens_outside(url) {
        eprintln!("polingual refused {url}");
        return;
    }
    let app = app.clone();
    let url = url.clone();
    std::thread::spawn(move || {
        let host = url.host_str().unwrap_or(url.scheme()).to_string();
        let open = app
            .dialog()
            .message(format!("Open {host} in your browser?"))
            .title("Polingual")
            .buttons(MessageDialogButtons::OkCancelCustom("Open".into(), "Stay".into()))
            .blocking_show();
        if open {
            open_in_browser(&app, &url);
        }
    });
}

fn main_window(app: &tauri::App) -> tauri::Result<()> {
    let config = app.config().app.windows.iter().find(|w| w.label == "main").cloned().ok_or(tauri::Error::WindowNotFound)?;
    let nav = app.handle().clone();
    let popup = app.handle().clone();
    WebviewWindowBuilder::from_config(app.handle(), &config)?
        .on_navigation(move |url| {
            let inside = stays_inside(url);
            if !inside {
                ask_send_out(&nav, url);
            }
            inside
        })
        .on_new_window(move |url, _| {
            if stays_inside(&url) {
                navigate(&popup, url);
            } else {
                send_out(&popup, &url);
            }
            NewWindowResponse::Deny
        })
        .build()?;
    Ok(())
}

pub fn landed_home(end: &str) -> bool {
    Url::parse(end).is_ok_and(|u| u.scheme() == "https" && u.host_str().is_some_and(|h| INSIDE_HOSTS.contains(&h)))
}

pub fn reachable(url: &Url) -> bool {
    let agent = ureq::AgentBuilder::new().timeout(PROBE_TIMEOUT).redirects(5).build();
    match agent.head(url.as_str()).call() {
        Ok(resp) => landed_home(resp.get_url()),
        Err(ureq::Error::Status(code, resp)) => code < 500 && landed_home(resp.get_url()),
        Err(_) => false,
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

fn navigate(app: &tauri::AppHandle, url: Url) {
    match app.get_webview_window("main") {
        Some(w) => {
            if let Err(e) = w.navigate(url.clone()) {
                eprintln!("polingual could not open {url}: {e}");
            }
        }
        None => eprintln!("polingual has no main window for {url}"),
    }
}

fn open_route(app: &tauri::AppHandle, route: String) {
    eprintln!("polingual opened {route}");
    let target = app.state::<Link>().0.lock().unwrap().request(&app_url(), route.clone());
    if let Some(url) = target {
        navigate(app, url);
    }
    raise(app);
}

fn set_status(app: &tauri::AppHandle, text: &str) {
    if let Some(w) = app.get_webview_window("main") {
        let js = format!("var s=document.getElementById('status');if(s)s.textContent={};", serde_json::Value::from(text));
        let _ = w.eval(&js);
    }
}

pub const WATCH: Duration = Duration::from_secs(15);

struct Splash(Url);

fn wait_online(app: &tauri::AppHandle, base: &Url) {
    let mut tries = 0u32;
    while !reachable(base) {
        tries += 1;
        if tries == 1 {
            eprintln!("polingual is offline, retrying every {}s", RETRY.as_secs());
        }
        set_status(app, "You are offline. Retrying.");
        std::thread::sleep(RETRY);
    }
}

fn connect(app: tauri::AppHandle) {
    let base = app_url();
    std::thread::spawn(move || loop {
        wait_online(&app, &base);
        let target = app.state::<Link>().0.lock().unwrap().went_online(&base);
        eprintln!("polingual loading {target}");
        navigate(&app, target);
        let mut misses = 0u32;
        while misses < 2 {
            std::thread::sleep(WATCH);
            misses = if reachable(&base) { 0 } else { misses + 1 };
        }
        eprintln!("polingual lost its connection");
        let current = app.get_webview_window("main").and_then(|w| w.url().ok());
        app.state::<Link>().0.lock().unwrap().went_offline(current.as_ref());
        navigate(&app, app.state::<Splash>().0.clone());
        std::thread::sleep(Duration::from_secs(1));
    });
}

fn menu(app: &tauri::App) -> tauri::Result<()> {
    use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
    let mut go = SubmenuBuilder::new(app, "Polingual");
    for (id, label, _) in MENU {
        go = go.item(&MenuItemBuilder::with_id(*id, *label).build(app)?);
    }
    let reload = MenuItemBuilder::with_id("reload", "Reload").accelerator("CmdOrCtrl+R").build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Quit").accelerator("CmdOrCtrl+Q").build(app)?;
    let go = go.separator().item(&reload).item(&PredefinedMenuItem::separator(app)?).item(&quit).build()?;
    let edit = SubmenuBuilder::new(app, "Edit").undo().redo().separator().cut().copy().paste().select_all().build()?;
    app.set_menu(MenuBuilder::new(app).item(&go).item(&edit).build()?)?;
    app.on_menu_event(|app, event| match event.id().as_ref() {
        "quit" => app.exit(0),
        "reload" => {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.eval("location.reload()");
            }
        }
        id => {
            if let Some((_, _, route)) = MENU.iter().find(|(m, _, _)| *m == id) {
                open_route(app, route.to_string());
            }
        }
    });
    Ok(())
}

pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| match route_in(&args) {
            Some(route) => open_route(app, route),
            None => raise(app),
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(Link(Mutex::new(LinkState::default())))
        .setup(|app| {
            main_window(app)?;
            let splash = app.get_webview_window("main").ok_or(tauri::Error::WindowNotFound)?.url()?;
            app.manage(Splash(splash));
            menu(app)?;
            #[cfg(target_os = "linux")]
            if let Ok(data) = app.path().data_dir() {
                let _ = std::fs::create_dir_all(data.join("applications"));
            }
            #[cfg(any(target_os = "linux", windows))]
            if let Err(e) = app.deep_link().register_all() {
                eprintln!("polingual could not register {SCHEME}:// links: {e}");
            }
            let links = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                if let Some(route) = event.urls().iter().find_map(|u| link_route(u.as_str())) {
                    open_route(&links, route);
                }
            });
            let signals = app.handle().clone();
            if let Err(e) = ctrlc::set_handler(move || signals.exit(0)) {
                eprintln!("polingual could not watch for termination signals: {e}");
            }
            let handle = app.handle().clone();
            let first = route_in(&std::env::args().collect::<Vec<_>>());
            if let Some(route) = &first {
                handle.state::<Link>().0.lock().unwrap().request(&app_url(), route.clone());
            }
            connect(handle);
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("tauri app failed to build");
    app.run(|_, _| {});
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base() -> Url {
        Url::parse("https://polingual.com/app").unwrap()
    }

    #[test]
    fn default_url_is_polingual_over_https() {
        assert_eq!(app_url().scheme(), "https");
        assert_eq!(app_url().host_str(), Some("polingual.com"));
    }

    #[test]
    fn bare_scheme_routes_home() {
        assert_eq!(link_route("polingual://").as_deref(), Some("/"));
        assert_eq!(link_route("polingual:").as_deref(), Some("/"));
    }

    #[test]
    fn paths_map_to_routes() {
        assert_eq!(link_route("polingual://learn").as_deref(), Some("/learn"));
        assert_eq!(link_route("polingual://lesson/la/12/").as_deref(), Some("/lesson/la/12"));
        assert_eq!(link_route("polingual://deck/grc?x=1").as_deref(), Some("/deck/grc"));
    }

    #[test]
    fn hostile_links_are_refused() {
        assert_eq!(link_route("polingual://../etc"), None);
        assert_eq!(link_route("polingual://a//b"), None);
        assert_eq!(link_route("polingual://x%2F"), None);
        assert_eq!(link_route("polingual://@evil.com"), None);
        assert_eq!(link_route("bucket://learn"), None);
        assert_eq!(link_route("https://polingual.com/learn"), None);
        assert_eq!(link_route("polingualx://learn"), None);
    }

    #[test]
    fn routes_stay_under_the_app_path() {
        assert_eq!(with_route(&base(), "/learn").as_str(), "https://polingual.com/app/learn");
        assert_eq!(with_route(&base(), "/").as_str(), "https://polingual.com/app/");
        let root = Url::parse("https://polingual.com").unwrap();
        assert_eq!(with_route(&root, "/learn").as_str(), "https://polingual.com/learn");
        assert_eq!(with_route(&root, "/").as_str(), "https://polingual.com/");
    }

    #[test]
    fn route_in_skips_the_binary() {
        let args = vec!["polingual://learn".to_string(), "--x".to_string(), "polingual://deck/la".to_string()];
        assert_eq!(route_in(&args).as_deref(), Some("/deck/la"));
    }

    #[test]
    fn offline_links_wait_for_the_connection() {
        let mut s = LinkState::default();
        assert_eq!(s.request(&base(), "/learn".into()), None);
        assert_eq!(s.went_online(&base()).as_str(), "https://polingual.com/app/learn");
        assert_eq!(s.request(&base(), "/deck".into()).unwrap().as_str(), "https://polingual.com/app/deck");
    }

    #[test]
    fn online_without_links_opens_the_base() {
        let mut s = LinkState::default();
        assert_eq!(s.went_online(&base()), base());
    }

    fn u(s: &str) -> Url {
        Url::parse(s).unwrap()
    }

    #[test]
    fn app_hosts_stay_in_the_window() {
        for s in ["https://polingual.com/app/learn", "https://www.polingual.com/", "https://www.youtube-nocookie.com/embed/abc", "https://www.youtube.com/embed/abc?rel=0", "tauri://localhost/index.html", "http://tauri.localhost/index.html", "about:blank"] {
            assert!(stays_inside(&u(s)), "{s}");
        }
    }

    #[test]
    fn other_hosts_leave_for_the_browser() {
        for s in ["https://en.wiktionary.org/wiki/x", "https://www.youtube.com/watch?v=abc", "https://bucket.foundation/", "https://polingual.com.evil.com/", "https://evilpolingual.com/", "https://abcd.supabase.co/auth/v1/verify", "http://polingual.com/", "mailto:hi@polingual.com"] {
            assert!(!stays_inside(&u(s)), "{s}");
            assert!(opens_outside(&u(s)), "{s}");
        }
    }

    #[test]
    fn unsafe_schemes_go_nowhere() {
        for s in ["file:///etc/passwd", "javascript:alert(1)", "data:text/html,x", "ftp://x.org/"] {
            assert!(!stays_inside(&u(s)), "{s}");
            assert!(!opens_outside(&u(s)), "{s}");
        }
    }

    #[test]
    fn dropped_connection_returns_to_the_same_page() {
        let mut s = LinkState::default();
        s.went_online(&base());
        s.went_offline(Some(&u("https://polingual.com/learn/la")));
        assert_eq!(s.request(&base(), "/x".into()), None);
        let mut t = LinkState::default();
        t.went_offline(Some(&u("https://polingual.com/learn/la")));
        assert_eq!(t.went_online(&u("https://polingual.com")).as_str(), "https://polingual.com/learn/la");
        let mut v = LinkState::default();
        v.went_offline(Some(&u("https://www.youtube.com/embed/x")));
        assert_eq!(v.went_online(&base()), base());
    }

    #[test]
    fn captive_portals_are_offline() {
        assert!(landed_home("https://www.polingual.com/"));
        assert!(!landed_home("https://portal.hotel.example/login"));
        assert!(!landed_home("http://polingual.com/"));
    }

    #[test]
    fn non_standard_ports_leave() {
        assert!(!stays_inside(&u("https://polingual.com:8443/")));
        assert!(stays_inside(&u("https://polingual.com:443/")));
    }

    #[test]
    fn menu_routes_are_valid_links() {
        for (id, _, route) in MENU {
            assert_eq!(link_route(&format!("polingual:/{route}")).as_deref(), Some(*route), "{id}");
        }
    }

    #[test]
    fn unreachable_hosts_are_offline() {
        assert!(!reachable(&Url::parse("https://polingual.invalid").unwrap()));
    }
}
