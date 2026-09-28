from __future__ import annotations

import json
import os
from pathlib import Path

import matplotlib
import numpy as np
import pytest

from helix import runs
from helix.schema import load

from .conftest import FIXTURES

GOLDEN = Path(__file__).parent / "golden"
REGEN = os.environ.get("HELIX_REGEN_GOLDEN") == "1"

@pytest.fixture(scope="module")
def run_dir(tmp_path_factory):
    series = load(FIXTURES / "series.json")
    d, code = runs.run(
        series, tmp_path_factory.mktemp("g"), method="linear", horizon=2, seed=1, samples=21, stamp="20260101T000000Z"
    )
    assert code == 0
    if REGEN:
        GOLDEN.mkdir(exist_ok=True)
        for name in ("scene.json", "method.json", "chart.svg"):
            (GOLDEN / name).write_bytes((d / name).read_bytes())
        (GOLDEN / "matplotlib.txt").write_text(matplotlib.__version__ + "\n")
    return d

@pytest.mark.parametrize("name", ["scene.json", "method.json"])
def test_json_golden(run_dir, name):
    assert json.loads((run_dir / name).read_text()) == json.loads((GOLDEN / name).read_text())

def test_svg_golden(run_dir):
    if (GOLDEN / "matplotlib.txt").read_text().strip() != matplotlib.__version__:
        pytest.skip("SVG golden recorded with another matplotlib version")
    assert (run_dir / "chart.svg").read_bytes() == (GOLDEN / "chart.svg").read_bytes()

def test_scene_matches_old_helix_angles(run_dir):
    scene = json.loads((run_dir / "scene.json").read_text())
    P = np.asarray(scene["points"])
    K, omega, t0 = len(scene["primes"]), scene["omega"], scene["t0"]
    t = np.asarray(scene["t"])
    ang = np.arctan2(P[..., 1], P[..., 0])
    want = 2 * np.pi * (np.arange(K)[None, :] / K + omega * (t - t0)[:, None])
    r = np.hypot(P[..., 0], P[..., 1])
    ok = r > 1e-9
    assert np.allclose(np.angle(np.exp(1j * (ang - want)))[ok], 0, atol=1e-5)

def test_outputs_hashed_in_manifest(run_dir):
    m = json.loads((run_dir / "manifest.json").read_text())
    assert set(m["outputs"]) == {
        "chart.png",
        "chart.svg",
        "input.json",
        "interp.json",
        "method.json",
        "projection.json",
        "scene.json",
    }
    assert m["outputs"]["chart.svg"] == runs.sha256(run_dir / "chart.svg")
    assert m["license"] == "CC0"
