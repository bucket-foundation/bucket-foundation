use std::collections::HashMap;
use std::ffi::{OsStr, OsString};
use std::path::{Path, PathBuf};

pub const AGENT_CLIS: [&str; 5] = ["claude", "codex", "gemini", "opencode", "aider"];
pub const FOLDERS_FILE: &str = "agent-folders.json";
pub const APPROVE_MENU_ID: &str = "approve-agent-folder";
pub const MAX_FOLDERS: usize = 64;
pub const TERMINALS: [&str; 9] = ["ptyxis", "gnome-terminal", "konsole", "kitty", "alacritty", "foot", "wezterm", "xterm", "x-terminal-emulator"];

fn executable(p: &Path) -> bool {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::metadata(p).map(|m| m.is_file() && m.permissions().mode() & 0o111 != 0).unwrap_or(false)
    }
    #[cfg(not(unix))]
    {
        p.is_file()
    }
}

pub fn which_in(path: Option<&OsStr>, name: &str) -> Option<PathBuf> {
    std::env::split_paths(path?).filter(|d| d.is_absolute()).map(|d| d.join(name)).find(|p| executable(p))
}

pub fn find_tools(path: Option<&OsStr>) -> HashMap<String, PathBuf> {
    AGENT_CLIS.iter().filter_map(|t| which_in(path, t).map(|p| (t.to_string(), p))).collect()
}

pub fn find_terminal(path: Option<&OsStr>) -> Option<(&'static str, PathBuf)> {
    TERMINALS.iter().find_map(|t| which_in(path, t).map(|p| (*t, p)))
}

pub fn state_dir(xdg_state: Option<OsString>, home: Option<OsString>) -> Option<PathBuf> {
    let base = match xdg_state.filter(|s| !s.is_empty()) {
        Some(s) => PathBuf::from(s),
        None => PathBuf::from(home.filter(|h| !h.is_empty())?).join(".local").join("state"),
    };
    base.is_absolute().then(|| base.join("bkt"))
}

pub fn read_folders(dir: &Path) -> Result<Vec<PathBuf>, String> {
    let text = match std::fs::read_to_string(dir.join(FOLDERS_FILE)) {
        Ok(t) => t,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(vec![]),
        Err(e) => return Err(format!("could not read the approved folders: {e}")),
    };
    let v: serde_json::Value = serde_json::from_str(&text).map_err(|e| format!("the approved folder list is not JSON: {e}"))?;
    if v["v"] != 1 {
        return Err("the approved folder list is not a v1 list".into());
    }
    let list = v["folders"].as_array().ok_or("the approved folder list has no folders")?;
    Ok(list.iter().filter_map(|f| f.as_str()).map(PathBuf::from).filter(|p| p.is_absolute()).collect())
}

pub fn add_folder(dir: &Path, picked: &Path) -> Result<PathBuf, String> {
    let real = std::fs::canonicalize(picked).map_err(|e| format!("could not open that folder: {e}"))?;
    if !real.is_dir() {
        return Err("pick a folder".into());
    }
    let mut folders = read_folders(dir)?;
    if !folders.contains(&real) {
        if folders.len() >= MAX_FOLDERS {
            return Err(format!("Bucket keeps at most {MAX_FOLDERS} approved folders"));
        }
        folders.push(real.clone());
    }
    let list: Vec<String> = folders.iter().map(|p| p.to_string_lossy().into_owned()).collect();
    let body = serde_json::json!({ "v": 1, "folders": list }).to_string();
    std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let tmp = dir.join(format!("{FOLDERS_FILE}.{}", std::process::id()));
    write_private(&tmp, body.as_bytes()).map_err(|e| e.to_string())?;
    std::fs::rename(&tmp, dir.join(FOLDERS_FILE)).map_err(|e| e.to_string())?;
    Ok(real)
}

fn write_private(path: &Path, bytes: &[u8]) -> std::io::Result<()> {
    use std::io::Write;
    let mut opts = std::fs::OpenOptions::new();
    opts.write(true).create(true).truncate(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        opts.mode(0o600);
    }
    opts.open(path)?.write_all(bytes)
}

pub fn check_launch(tools: &HashMap<String, PathBuf>, approved: &[PathBuf], tool: &str, folder: &str) -> Result<(PathBuf, PathBuf), String> {
    if !AGENT_CLIS.contains(&tool) {
        return Err(format!("{tool} is not an agent Bucket can open"));
    }
    let bin = tools.get(tool).ok_or_else(|| format!("{tool} is not installed"))?;
    let asked = Path::new(folder);
    if !asked.is_absolute() {
        return Err("the folder must be a full path".into());
    }
    let real = std::fs::canonicalize(asked).map_err(|_| "that folder does not exist".to_string())?;
    if !real.is_dir() {
        return Err("that path is not a folder".into());
    }
    let inside = approved.iter().filter_map(|a| std::fs::canonicalize(a).ok()).any(|root| real.starts_with(&root));
    if !inside {
        return Err("that folder is not on the approved list".into());
    }
    Ok((bin.clone(), real))
}

pub fn terminal_args(terminal: &str, tool: &Path, folder: &Path) -> Vec<OsString> {
    let t = tool.as_os_str().to_owned();
    let f = folder.as_os_str().to_owned();
    let mut wd = OsString::from("--working-directory=");
    wd.push(&f);
    match terminal {
        "ptyxis" => vec!["--new-window".into(), "--working-directory".into(), f, "--".into(), t],
        "gnome-terminal" => vec![wd, "--".into(), t],
        "konsole" => vec!["--workdir".into(), f, "-e".into(), t],
        "kitty" => vec!["--directory".into(), f, t],
        "alacritty" => vec!["--working-directory".into(), f, "-e".into(), t],
        "foot" => vec![wd, t],
        "wezterm" => vec!["start".into(), "--cwd".into(), f, "--".into(), t],
        _ => vec!["-e".into(), t],
    }
}

pub struct Agents {
    pub tools: HashMap<String, PathBuf>,
    pub terminal: Option<(&'static str, PathBuf)>,
    pub state: Option<PathBuf>,
}

impl Agents {
    pub fn at_startup() -> Self {
        let path = std::env::var_os("PATH");
        Agents {
            tools: find_tools(path.as_deref()),
            terminal: find_terminal(path.as_deref()),
            state: state_dir(std::env::var_os("XDG_STATE_HOME"), std::env::var_os("HOME")),
        }
    }

    pub fn launch(&self, tool: &str, folder: &str) -> Result<(), String> {
        if !cfg!(target_os = "linux") {
            return Err("launching agents works on Linux for now".into());
        }
        let state = self.state.as_ref().ok_or("Bucket could not find its state folder")?;
        let (bin, real) = check_launch(&self.tools, &read_folders(state)?, tool, folder)?;
        let (name, term) = self.terminal.as_ref().ok_or("Bucket found no terminal app to open")?;
        let mut child = std::process::Command::new(term)
            .args(terminal_args(name, &bin, &real))
            .current_dir(&real)
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
            .map_err(|e| format!("could not open {name}: {e}"))?;
        std::thread::spawn(move || child.wait());
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    static N: AtomicUsize = AtomicUsize::new(0);

    fn scratch() -> PathBuf {
        let d = std::env::temp_dir().join(format!("bkt-agents-{}-{}", std::process::id(), N.fetch_add(1, Ordering::SeqCst)));
        let _ = std::fs::remove_dir_all(&d);
        std::fs::create_dir_all(&d).unwrap();
        std::fs::canonicalize(d).unwrap()
    }

    fn exe(dir: &Path, name: &str) -> PathBuf {
        use std::os::unix::fs::PermissionsExt;
        let p = dir.join(name);
        std::fs::write(&p, "#!/bin/sh\n").unwrap();
        std::fs::set_permissions(&p, std::fs::Permissions::from_mode(0o755)).unwrap();
        p
    }

    fn tools(dir: &Path) -> HashMap<String, PathBuf> {
        HashMap::from([("claude".to_string(), exe(dir, "claude"))])
    }

    #[test]
    fn finds_only_allowlisted_executables_on_path() {
        let a = scratch();
        let b = scratch();
        exe(&a, "claude");
        exe(&b, "gemini");
        exe(&b, "rm");
        std::fs::write(b.join("codex"), "not executable").unwrap();
        let path = std::env::join_paths([a.clone(), PathBuf::from("relative"), b.clone()]).unwrap();
        let found = find_tools(Some(&path));
        let mut names: Vec<_> = found.keys().cloned().collect();
        names.sort();
        assert_eq!(names, vec!["claude", "gemini"]);
        assert_eq!(found["claude"], a.join("claude"));
        assert!(find_tools(None).is_empty());
    }

    #[test]
    fn state_dir_follows_xdg_then_home() {
        assert_eq!(state_dir(Some("/s".into()), Some("/h".into())), Some(PathBuf::from("/s/bkt")));
        assert_eq!(state_dir(Some("".into()), Some("/h".into())), Some(PathBuf::from("/h/.local/state/bkt")));
        assert_eq!(state_dir(Some("rel".into()), None), None);
        assert_eq!(state_dir(None, None), None);
    }

    #[test]
    fn a_folder_inside_an_approved_root_launches_with_its_real_path() {
        let d = scratch();
        let root = d.join("approved");
        std::fs::create_dir_all(root.join("inner")).unwrap();
        let (bin, real) = check_launch(&tools(&d), &[root.clone()], "claude", root.join("inner").to_str().unwrap()).unwrap();
        assert_eq!(bin, d.join("claude"));
        assert_eq!(real, root.join("inner"));
        assert!(check_launch(&tools(&d), &[root.clone()], "claude", root.to_str().unwrap()).is_ok());
    }

    #[test]
    fn rejects_unknown_and_missing_tools() {
        let d = scratch();
        let r = [d.clone()];
        let f = d.to_str().unwrap();
        assert_eq!(check_launch(&tools(&d), &r, "bash", f).unwrap_err(), "bash is not an agent Bucket can open");
        assert_eq!(check_launch(&tools(&d), &r, "claude; rm -rf /", f).unwrap_err(), "claude; rm -rf / is not an agent Bucket can open");
        assert_eq!(check_launch(&tools(&d), &r, "codex", f).unwrap_err(), "codex is not installed");
        assert_eq!(check_launch(&tools(&d), &r, "", f).unwrap_err(), " is not an agent Bucket can open");
    }

    #[test]
    fn rejects_folders_outside_the_approved_list() {
        let d = scratch();
        let root = d.join("approved");
        let outside = d.join("outside");
        std::fs::create_dir_all(&root).unwrap();
        std::fs::create_dir_all(&outside).unwrap();
        std::fs::create_dir_all(d.join("approved-sibling")).unwrap();
        std::fs::write(root.join("file"), "x").unwrap();
        let t = tools(&d);
        let r = [root.clone()];
        let no = |f: &Path| check_launch(&t, &r, "claude", f.to_str().unwrap()).unwrap_err();
        assert_eq!(no(&outside), "that folder is not on the approved list");
        assert_eq!(no(&root.join("..").join("outside")), "that folder is not on the approved list");
        assert_eq!(no(&d.join("approved-sibling")), "that folder is not on the approved list");
        assert_eq!(no(&root.join("missing")), "that folder does not exist");
        assert_eq!(no(&root.join("file")), "that path is not a folder");
        assert_eq!(check_launch(&t, &r, "claude", "approved").unwrap_err(), "the folder must be a full path");
        assert_eq!(check_launch(&t, &[], "claude", root.to_str().unwrap()).unwrap_err(), "that folder is not on the approved list");
    }

    #[test]
    fn rejects_a_symlink_inside_an_approved_folder_that_points_outside() {
        let d = scratch();
        let root = d.join("approved");
        let outside = d.join("outside");
        std::fs::create_dir_all(&root).unwrap();
        std::fs::create_dir_all(&outside).unwrap();
        std::os::unix::fs::symlink(&outside, root.join("escape")).unwrap();
        std::os::unix::fs::symlink("/", root.join("rootfs")).unwrap();
        let t = tools(&d);
        assert_eq!(check_launch(&t, &[root.clone()], "claude", root.join("escape").to_str().unwrap()).unwrap_err(), "that folder is not on the approved list");
        assert_eq!(check_launch(&t, &[root.clone()], "claude", root.join("rootfs").to_str().unwrap()).unwrap_err(), "that folder is not on the approved list");
        std::os::unix::fs::symlink(&root, d.join("alias")).unwrap();
        assert!(check_launch(&t, &[d.join("alias")], "claude", root.to_str().unwrap()).is_ok());
    }

    #[test]
    fn add_folder_stores_the_real_path_once_with_owner_only_permissions() {
        use std::os::unix::fs::PermissionsExt;
        let d = scratch();
        let state = d.join("state");
        let proj = d.join("proj");
        std::fs::create_dir_all(&proj).unwrap();
        std::os::unix::fs::symlink(&proj, d.join("link")).unwrap();
        assert_eq!(add_folder(&state, &d.join("link")).unwrap(), proj);
        assert_eq!(add_folder(&state, &proj).unwrap(), proj);
        assert_eq!(read_folders(&state).unwrap(), vec![proj.clone()]);
        let mode = std::fs::metadata(state.join(FOLDERS_FILE)).unwrap().permissions().mode() & 0o777;
        assert_eq!(mode, 0o600);
        assert!(add_folder(&state, &d.join("missing")).is_err());
        std::fs::write(d.join("file"), "x").unwrap();
        assert_eq!(add_folder(&state, &d.join("file")).unwrap_err(), "pick a folder");
    }

    #[test]
    fn read_folders_is_empty_when_missing_and_reports_a_corrupt_list() {
        let d = scratch();
        assert_eq!(read_folders(&d).unwrap(), Vec::<PathBuf>::new());
        std::fs::write(d.join(FOLDERS_FILE), "{\"v\":2,\"folders\":[]}").unwrap();
        assert_eq!(read_folders(&d).unwrap_err(), "the approved folder list is not a v1 list");
        std::fs::write(d.join(FOLDERS_FILE), "{\"v\":1,\"folders\":[\"/a\",\"rel\",3]}").unwrap();
        assert_eq!(read_folders(&d).unwrap(), vec![PathBuf::from("/a")]);
    }

    #[test]
    fn terminal_arguments_pass_the_tool_path_as_one_argument() {
        let tool = Path::new("/opt/bin/claude");
        let folder = Path::new("/w/a b");
        assert_eq!(terminal_args("gnome-terminal", tool, folder), vec![OsString::from("--working-directory=/w/a b"), "--".into(), "/opt/bin/claude".into()]);
        assert_eq!(terminal_args("ptyxis", tool, folder), vec![OsString::from("--new-window"), "--working-directory".into(), "/w/a b".into(), "--".into(), "/opt/bin/claude".into()]);
        assert_eq!(terminal_args("xterm", tool, folder), vec![OsString::from("-e"), "/opt/bin/claude".into()]);
    }
}
