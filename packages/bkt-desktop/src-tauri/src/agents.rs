use std::path::{Path, PathBuf};

pub const FOLDERS_FILE: &str = "agent-folders.json";
pub const APPROVE_MENU_ID: &str = "approve-agent-folder";
pub const MAX_FOLDERS: usize = 64;

pub fn state_dir(xdg_state: Option<std::ffi::OsString>, home: Option<std::ffi::OsString>) -> Option<PathBuf> {
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

pub struct Agents {
    pub state: Option<PathBuf>,
}

impl Agents {
    pub fn at_startup() -> Self {
        Agents { state: state_dir(std::env::var_os("XDG_STATE_HOME"), std::env::var_os("HOME")) }
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
    fn state_dir_follows_xdg_then_home() {
        assert_eq!(state_dir(Some("/s".into()), Some("/h".into())), Some(PathBuf::from("/s/bkt")));
        assert_eq!(state_dir(Some("".into()), Some("/h".into())), Some(PathBuf::from("/h/.local/state/bkt")));
        assert_eq!(state_dir(Some("rel".into()), None), None);
        assert_eq!(state_dir(None, None), None);
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
}
