use std::sync::Mutex;
use tauri::{Manager, RunEvent, Url};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_updater::UpdaterExt;

pub fn serve_url(line: &str) -> Option<Url> {
    let url = Url::parse(line.trim()).ok()?;
    let local = url.scheme() == "http" && url.host_str() == Some("127.0.0.1") && url.port().is_some();
    local.then_some(url)
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
                            opened = w.navigate(url).is_ok();
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
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(Sidecar(Mutex::new(None)))
        .setup(|app| {
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
