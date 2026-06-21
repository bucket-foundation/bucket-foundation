"""No-network unit tests for the imaging/mechanobiology tools (tools_imaging).

Verifies the ACTUAL computation on synthetic inputs with KNOWN ground truth:
  * CalciumTraceML recovers the planted transient count and a sane decay-τ;
  * CellSegTrack segments a known number of synthetic blobs (watershed path);
  * AFM-CurveML recovers a known Young's modulus from a synthetic Hertz curve;
  * TractionForceML recovers a known imposed displacement via block-matching PIV.

Run:  cd services/research-tools && python3 -m pytest tests/test_tools_imaging.py -q
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np  # noqa: E402
import pytest  # noqa: E402

import tools_imaging as im  # noqa: E402


# =========================================================================
# parsing
# =========================================================================
def test_parse_1d_and_2d():
    a, e = im.parse_1d({"trace": [1, 2, 3]})
    assert e is None and list(a) == [1, 2, 3]
    g, e2 = im.parse_2d({"image": [[1, 2], [3, 4]]})
    assert e2 is None and g.shape == (2, 2)
    _, e3 = im.parse_2d({"image": [1, 2, 3]})
    assert e3 is not None


# =========================================================================
# CalciumTraceML
# =========================================================================
def test_calcium_demo_recovers_event_count():
    out = im.run_calcium_trace({"trace": "demo"})
    assert out["demo"] is True
    assert "ground_truth_n_events" in out
    # 5 planted transients, high SNR → detect all 5
    assert out["n_events"] == out["ground_truth_n_events"] == 5
    # decay tau should be near the planted 0.8 s
    taus = [e["decay_tau_s"] for e in out["events"] if e["decay_tau_s"]]
    assert taus and 0.3 < np.median(taus) < 2.0


def test_calcium_user_trace():
    fs = 30.0
    n = int(fs * 20)
    t = np.arange(n) / fs
    f = 100.0 + np.zeros(n)
    for on in (2.0, 10.0, 15.0):
        k = int(on * fs)
        tt = np.arange(n - k) / fs
        f[k:] += 50.0 * np.exp(-tt / 0.7)
    out = im.run_calcium_trace({"trace": list(f), "fs_hz": fs})
    assert out["demo"] is False
    assert out["n_events"] == 3


def test_calcium_validation():
    assert im.run_calcium_trace({"trace": [1, 2], "fs_hz": 30}).get("error")
    assert im.run_calcium_trace({"trace": "demo", "fs_hz": 0}).get("error")


# =========================================================================
# CellSegTrack
# =========================================================================
def test_cellseg_demo_counts_cells():
    out = im.run_cell_seg({"image": "demo"})
    assert out["demo"] is True
    assert "ground_truth_n_cells" in out
    # 6 well-separated synthetic blobs → watershed should find all 6
    assert out["n_cells"] == out["ground_truth_n_cells"] == 6
    assert out["area_px"]["mean"] > 0


def test_cellseg_user_image():
    H = W = 64
    img = np.zeros((H, W))
    yy, xx = np.mgrid[0:H, 0:W]
    for (cy, cx) in [(16, 16), (16, 48), (48, 32)]:
        img += 100.0 * np.exp(-((yy - cy) ** 2 + (xx - cx) ** 2) / (2 * 4.0 ** 2))
    out = im.run_cell_seg({"image": img.tolist()})
    assert out["demo"] is False
    assert out["n_cells"] == 3


def test_cellseg_validation():
    assert im.run_cell_seg({"image": [[1, 2], [3, 4]]}).get("error")


# =========================================================================
# AFM-CurveML
# =========================================================================
def test_afm_fit_recovers_known_modulus():
    # build a clean Hertz curve with a known E, fit it back
    radius_nm = 1000.0
    z = np.linspace(0, 1500.0, 300)
    z_contact = 500.0
    d = np.clip(z - z_contact, 0, None)
    e_true = 8000.0  # 8 kPa
    nu, R_m = 0.5, radius_nm * 1e-9
    d_m = d * 1e-9
    f_n = (4.0 / 3.0) * (e_true / (1 - nu ** 2)) * np.sqrt(R_m) * d_m ** 1.5
    force = f_n / 1e-9
    out = im.run_afm_curve({"z": list(z), "force": list(force), "radius_nm": radius_nm})
    assert out["demo"] is False
    assert out["fit"]["r_squared"] > 0.999
    assert abs(out["fit"]["youngs_modulus_kpa"] - 8.0) < 0.2


def test_afm_demo_recovers_ground_truth():
    out = im.run_afm_curve({"z": "demo"})
    assert out["demo"] is True
    assert "ground_truth_modulus_kpa" in out
    # noisy synthetic → within ~25% of the 10 kPa truth
    assert abs(out["fit"]["youngs_modulus_kpa"] - out["ground_truth_modulus_kpa"]) < 2.5
    assert out["fit_quality"] in ("excellent", "good")


def test_afm_validation():
    assert im.run_afm_curve({"z": [1, 2], "force": [1, 2]}).get("error")
    assert im.run_afm_curve({"z": [1, 2, 3], "force": [1, 2], "geometry": "sphere"}).get("error")
    assert im.run_afm_curve({"z": "demo", "geometry": "blob"}).get("error")


# =========================================================================
# TractionForceML
# =========================================================================
def test_traction_demo_recovers_shift():
    out = im.run_traction_force({"reference": "demo"})
    assert out["demo"] is True
    assert "ground_truth_shift_px" in out
    gt = out["ground_truth_shift_px"]
    dom = out["dominant_shift_px"]
    # block-matching should recover the imposed (3,2) shift exactly (high SNR beads)
    assert dom["u"] == gt["u"]
    assert dom["v"] == gt["v"]
    assert out["max_displacement_px"] > 0


def test_traction_user_images():
    rng = np.random.default_rng(2)
    H = W = 64
    ref = rng.normal(5, 1.0, size=(H, W))
    yy, xx = np.mgrid[0:H, 0:W]
    for _ in range(30):
        by, bx = rng.integers(6, H - 6), rng.integers(6, W - 6)
        ref += 50.0 * np.exp(-((yy - by) ** 2 + (xx - bx) ** 2) / (2 * 1.5 ** 2))
    defm = np.roll(np.roll(ref, 2, axis=0), 1, axis=1)  # v=2, u=1
    out = im.run_traction_force({"reference": ref.tolist(), "deformed": defm.tolist()})
    assert out["demo"] is False
    assert out["dominant_shift_px"]["u"] == 1
    assert out["dominant_shift_px"]["v"] == 2


def test_traction_validation():
    small = [[1, 2], [3, 4]]
    assert im.run_traction_force({"reference": small, "deformed": small}).get("error")


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))
