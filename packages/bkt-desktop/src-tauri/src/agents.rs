use std::path::{Path, PathBuf};

pub const FOLDERS_FILE: &str = "agent-folders.json";
pub const APPROVE_MENU_ID: &str = "approve-agent-folder";
pub const MAX_FOLDERS: usize = 64;

pub struct StateEnv {
    pub xdg_state: Option<std::ffi::OsString>,
    pub local_app_data: Option<std::ffi::OsString>,
    pub home: Option<std::ffi::OsString>,
    pub windows: bool,
}

impl StateEnv {
    pub fn from_process() -> Self {
        StateEnv {
            xdg_state: std::env::var_os("XDG_STATE_HOME"),
            local_app_data: std::env::var_os("LOCALAPPDATA"),
            home: std::env::var_os("HOME").or_else(|| std::env::var_os("USERPROFILE")),
            windows: cfg!(windows),
        }
    }
}

fn set(v: Option<std::ffi::OsString>) -> Option<PathBuf> {
    v.filter(|s| !s.is_empty()).map(PathBuf::from)
}

pub fn state_dir(env: StateEnv) -> Option<PathBuf> {
    let base = if let Some(x) = set(env.xdg_state) {
        x
    } else if let (true, Some(l)) = (env.windows, set(env.local_app_data.clone())) {
        l
    } else {
        set(env.home)?.join(".local").join("state")
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

pub struct Agents {
    pub state: Option<PathBuf>,
}

impl Agents {
    pub fn at_startup() -> Self {
        Agents { state: state_dir(StateEnv::from_process()) }
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

    #[test]
    fn state_dir_follows_xdg_then_local_app_data_then_home() {
        let root = std::env::temp_dir();
        let s = root.join("s");
        let h = root.join("h");
        let l = root.join("l");
        let env = |xdg: Option<&PathBuf>, lad: Option<&PathBuf>, home: Option<&PathBuf>, windows: bool| StateEnv {
            xdg_state: xdg.map(|p| p.clone().into_os_string()),
            local_app_data: lad.map(|p| p.clone().into_os_string()),
            home: home.map(|p| p.clone().into_os_string()),
            windows,
        };
        assert_eq!(state_dir(env(Some(&s), Some(&l), Some(&h), true)), Some(s.join("bkt")));
        assert_eq!(state_dir(env(None, Some(&l), Some(&h), true)), Some(l.join("bkt")));
        assert_eq!(state_dir(env(None, Some(&l), Some(&h), false)), Some(h.join(".local").join("state").join("bkt")));
        assert_eq!(state_dir(env(None, None, Some(&h), true)), Some(h.join(".local").join("state").join("bkt")));
        assert_eq!(state_dir(StateEnv { xdg_state: Some("".into()), local_app_data: None, home: Some(h.clone().into_os_string()), windows: false }), Some(h.join(".local").join("state").join("bkt")));
        assert_eq!(state_dir(StateEnv { xdg_state: Some("rel".into()), local_app_data: None, home: None, windows: false }), None);
        assert_eq!(state_dir(env(None, None, None, true)), None);
    }

    #[test]
    fn add_folder_stores_the_real_path_once() {
        let d = scratch();
        let state = d.join("state");
        let proj = d.join("proj");
        std::fs::create_dir_all(&proj).unwrap();
        assert_eq!(add_folder(&state, &proj).unwrap(), proj);
        assert_eq!(add_folder(&state, &proj.join(".")).unwrap(), proj);
        assert_eq!(read_folders(&state).unwrap(), vec![proj.clone()]);
        assert!(add_folder(&state, &d.join("missing")).is_err());
        std::fs::write(d.join("file"), "x").unwrap();
        assert_eq!(add_folder(&state, &d.join("file")).unwrap_err(), "pick a folder");
    }

    #[cfg(unix)]
    #[test]
    fn add_folder_resolves_symlinks_and_keeps_the_file_owner_only() {
        use std::os::unix::fs::PermissionsExt;
        let d = scratch();
        let state = d.join("state");
        let proj = d.join("proj");
        std::fs::create_dir_all(&proj).unwrap();
        std::os::unix::fs::symlink(&proj, d.join("link")).unwrap();
        assert_eq!(add_folder(&state, &d.join("link")).unwrap(), proj);
        let mode = std::fs::metadata(state.join(FOLDERS_FILE)).unwrap().permissions().mode() & 0o777;
        assert_eq!(mode, 0o600);
    }

    #[test]
    fn read_folders_is_empty_when_missing_and_reports_a_corrupt_list() {
        let d = scratch();
        assert_eq!(read_folders(&d).unwrap(), Vec::<PathBuf>::new());
        std::fs::write(d.join(FOLDERS_FILE), "{\"v\":2,\"folders\":[]}").unwrap();
        assert_eq!(read_folders(&d).unwrap_err(), "the approved folder list is not a v1 list");
        let abs = d.join("a");
        let body = serde_json::json!({ "v": 1, "folders": [abs.to_string_lossy(), "rel", 3] }).to_string();
        std::fs::write(d.join(FOLDERS_FILE), body).unwrap();
        assert_eq!(read_folders(&d).unwrap(), vec![abs]);
    }
}
