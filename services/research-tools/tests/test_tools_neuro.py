"""No-network unit tests for the neuroscience research tools (tools_neuro).

Verifies the ACTUAL numerical computation on synthetic traces with KNOWN
ground truth:
 * the passive-membrane least-squares fit recovers R, C, tau from an RC trace
 generated with known parameters (to within a tight tolerance);
 * the MAD spike detector finds the right number of spikes in a synthetic
 train and extracts real waveform features.

Run: cd services/research-tools && python3 -m pytest tests/test_tools_neuro.py -q
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np  # noqa: E402
import pytest  # noqa: E402

import tools_neuro as n  # noqa: E402


# =========================================================================
# trace parsing
# =========================================================================
def test_parse_trace_list_and_string():
    arr, err = n.parse_trace({"trace": [1.0, 2.0, 3.0]})
    assert err is None and list(arr) == [1.0, 2.0, 3.0]
    arr2, err2 = n.parse_trace({"trace": "1, 2 3\n4"})
    assert err2 is None and list(arr2) == [1.0, 2.0, 3.0, 4.0]
    _, e3 = n.parse_trace({})
    assert e3 is not None


# =========================================================================
# HH-FitML, recover known RC parameters
# =========================================================================
def test_fit_recovers_known_rc_parameters():
    # generate a clean RC step with KNOWN params, then fit it back.
    true_R, true_C, true_V0 = 0.1, 300.0, -70.0  # GOhm, pF, mV -> tau = 30 ms
    I, dt, t_on = 120.0, 0.1, 40.0
    t = np.arange(0, 200.0, dt)
    v = n.passive_response(t, I, true_R, true_C, true_V0, t_on)
    fit = n.fit_passive_membrane(t, v, I, t_on)
    # clean (noise-free) data should fit perfectly
    assert fit["r_squared"] > 0.999
    assert abs(fit["tau_ms"] - 30.0) < 1.0
    assert abs(fit["R_gigaohm"] - true_R) < 0.02
    assert abs(fit["V0_mv"] - true_V0) < 0.5


def test_run_hh_fit_demo_recovers_ground_truth():
    out = n.run_hh_fit({"trace": "demo"})
    assert out["demo"] is True
    assert "ground_truth" in out
    # the noisy synthetic trace's recovered tau is close to the true tau
    assert out["fit"]["r_squared"] > 0.95
    assert abs(out["fit"]["tau_ms"] - out["ground_truth"]["tau_ms"]) < 4.0
    assert out["fit_quality"] in ("excellent", "good")


def test_run_hh_fit_user_trace():
    # a user-supplied clean RC trace
    true_R, true_C, true_V0 = 0.15, 200.0, -65.0  # tau = 30 ms
    I, dt, t_on = 80.0, 0.2, 30.0
    t = np.arange(0, 160.0, dt)
    v = n.passive_response(t, I, true_R, true_C, true_V0, t_on)
    out = n.run_hh_fit({"trace": list(v), "current_pa": I, "dt_ms": dt, "stim_onset_ms": t_on})
    assert out["demo"] is False
    assert out["fit"]["r_squared"] > 0.999
    assert abs(out["fit"]["tau_ms"] - 30.0) < 1.0


def test_run_hh_fit_validation():
    assert n.run_hh_fit({"trace": [1.0, 2.0], "dt_ms": 0.1}).get("error")
    assert n.run_hh_fit({"trace": "demo", "dt_ms": 0}).get("error")


# =========================================================================
# SpikeFeatures, detect a known spike train
# =========================================================================
def _make_train(fs=30000.0, n_spikes=15, dur_s=1.0, seed=1):
    rng = np.random.default_rng(seed)
    nsamp = int(fs * dur_s)
    trace = rng.normal(0, 1.0, size=nsamp)
    wlen = int(0.0016 * fs)
    tt = np.linspace(-3, 3, wlen)
    templ = -10.0 * np.exp(-(tt ** 2))  # sharp negative spike, well above noise
    step = (nsamp - 2 * wlen) // n_spikes
    times = [wlen + i * step for i in range(n_spikes)]
    for st in times:
        trace[st : st + wlen] += templ
    return trace, times


def test_detect_spikes_finds_known_count():
    fs = 30000.0
    trace, times = _make_train(fs=fs, n_spikes=15)
    det = n.detect_spikes_mad(trace, fs, thresh_mad=5.0)
    # the MAD detector should find all 15 well-separated, high-SNR spikes
    assert len(det["indices"]) == 15
    assert det["polarity"] == "negative"
    # each detected index is near a true spike (within the spike window)
    for idx in det["indices"]:
        assert min(abs(idx - tt) for tt in times) < int(0.0016 * fs)


def test_waveform_features_real():
    fs = 30000.0
    trace, _ = _make_train(fs=fs, n_spikes=15)
    det = n.detect_spikes_mad(trace, fs, thresh_mad=5.0)
    wf = n.waveform_features(trace, det["indices"], fs)
    assert wf["n_aligned"] >= 10
    assert wf["features"]["peak_to_trough_amplitude"] > 0
    assert len(wf["mean_waveform"]) > 0


def test_run_spike_features_demo_recovers_count():
    out = n.run_spike_features({"trace": "demo"})
    assert out["demo"] is True
    assert "ground_truth_n_spikes" in out
    # detected count matches the synthetic ground truth exactly (high SNR)
    assert out["n_spikes"] == out["ground_truth_n_spikes"]
    assert out["firing_rate_hz"] > 0
    assert out["waveform"]["features"]["peak_to_trough_amplitude"] > 0


def test_run_spike_features_user_trace():
    fs = 30000.0
    trace, times = _make_train(fs=fs, n_spikes=12, seed=3)
    out = n.run_spike_features({"trace": list(trace), "fs_hz": fs})
    assert out["demo"] is False
    assert out["n_spikes"] == 12


def test_run_spike_features_validation():
    assert n.run_spike_features({"trace": [1.0, 2.0], "fs_hz": 30000.0}).get("error")
    assert n.run_spike_features({"trace": "demo", "fs_hz": 0}).get("error")


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))
