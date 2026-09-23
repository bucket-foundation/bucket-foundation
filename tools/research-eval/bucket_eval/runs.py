from __future__ import annotations

import hashlib
import json
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

from .graph import AGGREGATIONS

REQUIRED = ("name", "dataset", "vertices", "cutoffs", "horizons", "m", "min_works", "seed", "bootstrap_reps", "aggregations")

class LockError(RuntimeError):
    pass

@dataclass(frozen=True)
class Run:
    config: dict[str, Any]
    sha256: str
    lock: Path
    results: Path

def load_config(path: Path) -> tuple[dict[str, Any], str]:
    raw = path.read_bytes()
    config = yaml.safe_load(raw)
    missing = [k for k in REQUIRED if k not in config]
    if missing:
        raise ValueError(f"{path}: missing {', '.join(missing)}")
    if list(config["aggregations"]) != list(AGGREGATIONS):
        raise ValueError(f"{path}: aggregations must be {list(AGGREGATIONS)}, every one reported side by side")
    if config["vertices"] not in ("topics", "keywords"):
        raise ValueError(f"{path}: vertices is topics or keywords")
    check = config.get("full_bootstrap_check")
    if check is not None and check.get("cutoff") != min(config["cutoffs"]):
        raise ValueError(f"{path}: the full bootstrap check runs on the smallest cutoff, {min(config['cutoffs'])}")
    return config, hashlib.sha256(raw).hexdigest()

def start_run(config_path: Path, runs_dir: Path) -> Run:
    config, digest = load_config(config_path)
    lock = runs_dir / f"{config['name']}.lock"
    results = runs_dir / f"{config['name']}.results.json"
    if lock.exists():
        held = json.loads(lock.read_text())["config_sha256"]
        if held != digest:
            raise LockError(f"{config_path} changed after its run was locked ({held[:12]} held, {digest[:12]} now)")
    elif results.exists():
        raise LockError(f"{results} exists with no lock; a run's config cannot be locked after its results")
    else:
        lock.write_text(json.dumps({"name": config["name"], "config": str(config_path.name), "config_sha256": digest}, indent=2) + "\n")
    return Run(config, digest, lock, results)

def commit() -> str:
    run = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True)
    return run.stdout.strip() if run.returncode == 0 else "unknown"

def write_results(run: Run, dataset_manifests: dict[str, str], body: dict[str, Any]) -> None:
    doc = {"name": run.config["name"], "config_sha256": run.sha256, "dataset_manifests": dataset_manifests, "commit": commit(), **body}
    run.results.write_text(json.dumps(doc, indent=2, sort_keys=True) + "\n")
