from __future__ import annotations

import datetime as dt
import hashlib
import json
import os
import subprocess
import sys
import time
from pathlib import Path

import numpy as np

from . import __version__
from .interp import loo_error, sample
from .method import card, footer
from .project import MIN_SLICES, project
from .render import mpl
from .render import scene as scene_mod
from .schema import Series, SeriesError, to_doc

DEFAULT_ROOT = Path(os.environ.get("HELIX_RUNS", Path.home() / ".local/share/bucket-profiles/helix/runs"))
GDRIVE_ROOT = "gdrive:AGFarms/Nucleus/bucket-foundation/helix"
MIRROR_BYTES = 5 * 1024 * 1024
BACKOFF = (5, 20, 60)
EXIT_MIRROR = 3

def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def dump(obj, path: Path) -> None:
    path.write_text(json.dumps(obj, indent=1, sort_keys=True) + "\n")

def git_sha(repo: Path) -> str:
    r = subprocess.run(["git", "-C", str(repo), "rev-parse", "HEAD"], capture_output=True, text=True, check=False)
    return r.stdout.strip() if r.returncode == 0 else "unknown"

def tree_bytes(path: Path) -> int:
    return sum(p.stat().st_size for p in path.rglob("*") if p.is_file())

def mirror(src: Path, dest: str, runner=subprocess.run, sleep=time.sleep, tries: int = 3) -> dict:
    error = ""
    for attempt in range(1, tries + 1):
        r = runner(["rclone", "copy", str(src), dest], capture_output=True, text=True, check=False)
        if r.returncode == 0:
            return {"status": "ok", "path": dest, "attempts": attempt, "error": None}
        error = (r.stderr or r.stdout or f"rclone exit {r.returncode}").strip()
        if attempt < tries:
            sleep(BACKOFF[min(attempt - 1, len(BACKOFF) - 1)])
    return {"status": "failed", "path": dest, "attempts": tries, "error": error}

def compute(series: Series, method: str, horizon: int, step: float | None, seed: int, samples: int) -> dict:
    W = series.shares
    grid = np.linspace(series.t[0], series.t[-1], samples)
    Wg = sample(series.t, W, grid, method)
    loo = loo_error(series.t, W, method)
    proj, why = None, "not requested"
    if horizon > 0:
        try:
            proj = project(series.t, W, horizon, step, seed)
        except SeriesError as exc:
            if exc.code != "E_SHORT":
                raise
            why = f"refused: {len(series.t)} slices, needs {MIN_SLICES}"
    return {"grid": grid, "W": Wg, "loo": loo, "projection": proj, "why": why}

def run(
    series: Series,
    out_root: Path = DEFAULT_ROOT,
    method: str = "linear",
    horizon: int = 0,
    step: float | None = None,
    seed: int = 0,
    samples: int = 200,
    do_mirror: bool = False,
    raw: Path | None = None,
    stamp: str | None = None,
    repo: Path | None = None,
    runner=None,
    sleep=None,
) -> tuple[Path, int]:
    runner = runner or subprocess.run
    sleep = sleep or time.sleep
    stamp = stamp or dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_dir = Path(out_root) / f"{stamp}-{series.slug}"
    run_dir.mkdir(parents=True, exist_ok=False)
    dump(to_doc(series), run_dir / "input.json")
    input_sha = sha256(run_dir / "input.json")
    res = compute(series, method, horizon, step, seed, samples)
    omega = series.omega_or_default()
    dump(
        {"t": res["grid"].tolist(), "shares": np.round(res["W"], 9).tolist(), "loo": res["loo"]},
        run_dir / "interp.json",
    )
    if res["projection"]:
        dump(res["projection"], run_dir / "projection.json")
    c = card(series, method, res["loo"], res["projection"], input_sha, omega, res["why"])
    dump(c, run_dir / "method.json")
    sc = scene_mod.build(series.primes, res["grid"], res["W"], omega, float(series.t[0]), series.t, res["projection"])
    dump(sc, run_dir / "scene.json")
    mpl.render(sc, series.name, footer(c), run_dir)
    manifest = {
        "schema": "helix.run/v1",
        "slug": series.slug,
        "stamp": stamp,
        "generator": __version__,
        "git_sha": git_sha(repo or Path(__file__).resolve().parents[3]),
        "input_sha256": input_sha,
        "license": series.source["license"],
        "source": series.source,
        "outputs": {p.name: sha256(p) for p in sorted(run_dir.iterdir()) if p.is_file()},
        "mirror": {"status": "skipped", "path": None, "attempts": 0, "error": None},
    }
    code = 0
    if do_mirror or tree_bytes(run_dir) > MIRROR_BYTES or raw:
        dest = f"{GDRIVE_ROOT}/{series.slug}/{stamp}/"
        manifest["mirror"] = mirror(run_dir, dest, runner, sleep)
        if raw and manifest["mirror"]["status"] == "ok":
            raw_state = mirror(Path(raw), dest + "raw/", runner, sleep)
            manifest["mirror"]["raw"] = raw_state
            if raw_state["status"] != "ok":
                manifest["mirror"]["status"] = "failed"
                manifest["mirror"]["error"] = raw_state["error"]
        if manifest["mirror"]["status"] != "ok":
            print(
                f"mirror failed after {manifest['mirror']['attempts']} tries: {manifest['mirror']['error']}",
                file=sys.stderr,
            )
            code = EXIT_MIRROR
    dump(manifest, run_dir / "manifest.json")
    latest = Path(out_root) / f"{series.slug}-latest"
    if latest.is_symlink() or latest.exists():
        latest.unlink()
    latest.symlink_to(run_dir.name)
    return run_dir, code
