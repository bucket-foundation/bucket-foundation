from __future__ import annotations

import hashlib
import importlib.metadata
import json
import os
import sys
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parent.parent
MODELS_FILE = PACKAGE_ROOT / "models.json"
RUNTIME_LOCK = PACKAGE_ROOT / "runtime.lock.json"

def load_models() -> dict:
    return json.loads(MODELS_FILE.read_text(encoding="utf-8"))

def model_entry(model_id: str | None = None) -> tuple[str, dict]:
    reg = load_models()
    mid = model_id or reg["default"]
    if mid not in reg["models"]:
        raise KeyError(f"model {mid} is not in {MODELS_FILE.name}")
    return mid, reg["models"][mid]

def hub_cache() -> Path:
    if os.environ.get("HF_HUB_CACHE"):
        return Path(os.environ["HF_HUB_CACHE"])
    if os.environ.get("HF_HOME"):
        return Path(os.environ["HF_HOME"]) / "hub"
    return Path.home() / ".cache" / "huggingface" / "hub"

def snapshot_dir(entry: dict) -> Path:
    return hub_cache() / ("models--" + entry["repo"].replace("/", "--")) / "snapshots" / entry["revision"]

def _declared_license(readme: Path) -> str | None:
    text = readme.read_text(encoding="utf-8", errors="replace")
    if not text.startswith("---"):
        return None
    front = text.split("---", 2)[1]
    for line in front.splitlines():
        if line.strip().startswith("license:"):
            return line.split(":", 1)[1].strip()
    return None

def verify_model(entry: dict) -> list[str]:
    snap = snapshot_dir(entry)
    if not snap.is_dir():
        return [f"{entry['repo']}@{entry['revision']} is not in the local cache at {snap}"]
    problems = []
    for rel, want in sorted(entry["files"].items()):
        path = snap / rel
        if not path.is_file():
            problems.append(f"{rel} is missing from the snapshot")
            continue
        got = hashlib.sha256(path.read_bytes()).hexdigest()
        if got != want:
            problems.append(f"{rel} has sha256 {got[:12]}, the registry pins {want[:12]}")
    readme = snap / "README.md"
    if readme.is_file() and _declared_license(readme) != entry["license"]:
        problems.append(f"the README declares license {_declared_license(readme)}, the registry says {entry['license']}")
    return problems

def runtime_versions(names: list[str]) -> dict[str, str | None]:
    out: dict[str, str | None] = {}
    for name in names:
        try:
            out[name] = importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError:
            out[name] = None
    return out

def verify_runtime() -> list[str]:
    lock = json.loads(RUNTIME_LOCK.read_text(encoding="utf-8"))
    problems = []
    py = f"{sys.version_info.major}.{sys.version_info.minor}"
    if py != lock["python"]:
        problems.append(f"python {py}, the lock pins {lock['python']}")
    for name, got in runtime_versions(sorted(lock["packages"])).items():
        if got != lock["packages"][name]:
            problems.append(f"{name} {got}, the lock pins {lock['packages'][name]}")
    return problems
