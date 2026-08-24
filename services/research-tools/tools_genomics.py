#!/usr/bin/env python3
"""
research-tools, Genomics / sequence-analysis cluster (REAL logic, CPU, no GPU)
==============================================================================

FUNCTIONAL backends for three more tools from the 54-tool needs map
all real algorithms, CPU, no network, no GPU:

 ChromatinAccess, DNA accessibility / regulatory-potential scoring from
 sequence. REAL feature model: GC content, CpG-island
 detection (Gardiner-Garden criteria), windowed promoter-
 motif scan (TATA / GC-box / CAAT / Initiator), and a
 transparent accessibility score. (A deep DNA language
 model, Enformer/Evo, is the documented GPU extension;
 the feature model here is real + interpretable.)
 AggregatePredict, amyloid / aggregation-propensity from a protein sequence.
 REAL windowed model: Kyte-Doolittle hydropathy +
 β-sheet propensity (Chou-Fasman) + net charge, combined
 into an aggregation score per window; flags hot-spots.
 FULLY REAL.
 ChannelDwell, single-channel idealization. REAL half-amplitude
 threshold idealization of a single-channel current record
 into open/closed states + dwell-time histogram + maximum-
 likelihood single-exponential dwell-time constants.
 FULLY REAL (CPU; a full HMM/QuB fit is the heavier path).

Design rules (match tools_neuro.py / tools_imaging.py): pure functions, JSON
I/O, demo mode with KNOWN ground truth, {"error": ...} on bad input.

The gateway imports GENOMICS_RUNNERS from here.
"""
from __future__ import annotations

import re
from typing import Optional

import numpy as np

# --- amino-acid / nucleotide property tables (real, literature) ------------
# Kyte-Doolittle hydropathy
KD = {
    "A": 1.8, "R": -4.5, "N": -3.5, "D": -3.5, "C": 2.5, "Q": -3.5, "E": -3.5,
    "G": -0.4, "H": -3.2, "I": 4.5, "L": 3.8, "K": -3.9, "M": 1.9, "F": 2.8,
    "P": -1.6, "S": -0.8, "T": -0.7, "W": -0.9, "Y": -1.3, "V": 4.2,
}
# Chou-Fasman β-sheet propensity (Pβ)
PBETA = {
    "A": 0.83, "R": 0.93, "N": 0.89, "D": 0.54, "C": 1.19, "Q": 1.10, "E": 0.37,
    "G": 0.75, "H": 0.87, "I": 1.60, "L": 1.30, "K": 0.74, "M": 1.05, "F": 1.38,
    "P": 0.55, "S": 0.75, "T": 1.19, "W": 1.37, "Y": 1.47, "V": 1.70,
}
CHARGE = {"D": -1, "E": -1, "K": 1, "R": 1, "H": 0.1}
AA = set(KD)
NT = set("ACGU T".replace(" ", "") + "acgut")


def clean_protein(s: str) -> str:
    s = (s or "").strip()
    if s.startswith(">"):
        s = "".join(s.splitlines()[1:])
    return re.sub(r"[^A-Za-z]", "", s).upper()


def clean_dna(s: str) -> str:
    s = (s or "").strip()
    if s.startswith(">"):
        s = "".join(s.splitlines()[1:])
    return re.sub(r"[^ACGTUacgtu]", "", s).upper().replace("U", "T")


# ===========================================================================
# 1. ChromatinAccess, accessibility / regulatory potential from sequence
# ===========================================================================
def gc_content(seq: str) -> float:
    if not seq:
        return 0.0
    return (seq.count("G") + seq.count("C")) / len(seq)


def cpg_islands(seq: str, win: int = 200, step: int = 20) -> list[dict]:
    """Gardiner-Garden CpG islands: GC>=50% and observed/expected CpG>=0.6. Pure."""
    out: list[dict] = []
    n = len(seq)
    for i in range(0, max(1, n - win + 1), step):
        w = seq[i : i + win]
        if len(w) < win:
            break
        gc = gc_content(w)
        obs = w.count("CG")
        g, c = w.count("G"), w.count("C")
        exp = (g * c) / len(w) if len(w) else 1e-9
        oe = obs / exp if exp > 0 else 0.0
        if gc >= 0.5 and oe >= 0.6:
            out.append({"start": i, "end": i + win, "gc": round(gc, 3), "obs_exp_cpg": round(oe, 3)})
    return out


def promoter_motifs(seq: str) -> dict:
    """Scan for canonical core-promoter motifs. Pure (real consensus patterns)."""
    motifs = {
        "TATA_box": r"TATA[AT]A[AT]",
        "GC_box": r"GGGCGG|GGGGCGGGG",
        "CAAT_box": r"GG[CT]CAATCT",
        "Initiator": r"[CT][CT]A[ACGT][AT][CT][CT]",
    }
    hits: dict[str, list[int]] = {}
    for name, pat in motifs.items():
        hits[name] = [m.start() for m in re.finditer(pat, seq)]
    return hits


def run_chromatin_access(payload: dict) -> dict:
    """payload: { sequence: <DNA> OR "demo" }

 Accessibility / regulatory-potential scoring from a DNA sequence: GC content,
 CpG islands, core-promoter motif scan, and a transparent accessibility score
 (open chromatin correlates with GC-rich, CpG-island, motif-dense regions).
 demo = a GC-rich CpG-island/TATA promoter sequence with a known signature.
    """
    demo = isinstance(payload.get("sequence"), str) and payload["sequence"].strip().lower() == "demo"
    if demo:
        # a synthetic GC-rich promoter: CpG island + TATA + GC-box
        seq = ("GC" * 120) + "TATAAAA" + ("CG" * 60) + "GGGCGG" + ("GC" * 80)
    else:
        seq = clean_dna(payload.get("sequence", ""))
        if len(seq) < 20:
            return {"error": "sequence too short (need >= 20 nt of DNA)"}
        if len(seq) > 2_000_000:
            return {"error": "sequence too long (max 2M nt)"}

    gc = gc_content(seq)
    islands = cpg_islands(seq)
    motifs = promoter_motifs(seq)
    n_motifs = sum(len(v) for v in motifs.values())
    # transparent accessibility score in [0,1]: GC + CpG-island density + motifs
    island_cov = sum(i["end"] - i["start"] for i in islands) / max(len(seq), 1)
    motif_density = min(n_motifs / max(len(seq) / 200.0, 1.0), 1.0)
    score = float(np.clip(0.45 * min(gc / 0.6, 1.0) + 0.35 * min(island_cov * 2, 1.0) + 0.20 * motif_density, 0, 1))
    call = "open/accessible (regulatory-rich)" if score >= 0.6 else "intermediate" if score >= 0.35 else "closed/low-signal"
    out = {
        "method": "interpretable sequence-feature accessibility model (GC + CpG islands + core-promoter motifs)",
        "demo": demo,
        "length_nt": len(seq),
        "gc_content": round(gc, 4),
        "cpg_islands": islands[:50],
        "n_cpg_islands": len(islands),
        "promoter_motifs": {k: v[:20] for k, v in motifs.items()},
        "n_promoter_motifs": n_motifs,
        "accessibility_score": round(score, 4),
        "call": call,
        "note": (
            "Real, interpretable accessibility model: GC content, Gardiner-Garden "
            "CpG islands, and core-promoter motif scan combined into a 0-1 "
            "accessibility score. A deep DNA language model (Enformer/Evo) that "
            "predicts actual ATAC/DNase signal is the documented GPU extension; "
            "this feature model is real, deterministic, and explainable."
        ),
    }
    if demo:
        out["ground_truth"] = {"has_cpg_island": True, "has_tata": True, "expected_call": "open/accessible (regulatory-rich)"}
    return out


# ===========================================================================
# 2. AggregatePredict, amyloid / aggregation propensity from sequence
# ===========================================================================
def windowed_aggregation(seq: str, win: int = 7) -> dict:
    """Per-window aggregation score = β-propensity + hydrophobicity − |charge|. Pure.

 A transparent TANGO/CamSol-style heuristic: aggregation favours hydrophobic,
 β-sheet-prone, low-net-charge stretches. Returns a per-residue score and
 flagged hot-spots (contiguous high-score windows).
    """
    valid = [c for c in seq if c in AA]
    n = len(valid)
    if n < win:
        return {"scores": [], "hotspots": []}
    half = win // 2
    scores = np.zeros(n, dtype=np.float64)
    for i in range(n):
        a, b = max(0, i - half), min(n, i + half + 1)
        w = valid[a:b]
        hydro = np.mean([KD[c] for c in w])
        beta = np.mean([PBETA[c] for c in w])
        charge = abs(sum(CHARGE.get(c, 0) for c in w))
        # normalize-ish: hydro ~[-4.5,4.5], beta ~[0.4,1.7]
        scores[i] = 0.5 * (hydro / 4.5) + 0.5 * (beta - 1.0) - 0.15 * charge
    # hot-spots: runs where score > 0.3 (empirical aggregation threshold)
    thr = 0.3
    hot = scores > thr
    hotspots: list[dict] = []
    i = 0
    while i < n:
        if hot[i]:
            j = i
            while j < n and hot[j]:
                j += 1
            if j - i >= 5:  # >=5-residue stretch
                hotspots.append(
                    {
                        "start": i + 1,
                        "end": j,
                        "length": j - i,
                        "peak_score": round(float(scores[i:j].max()), 4),
                        "segment": "".join(valid[i:j]),
                    }
                )
            i = j
        else:
            i += 1
    return {"scores": [round(float(x), 4) for x in scores], "hotspots": hotspots}


def run_aggregate_predict(payload: dict) -> dict:
    """payload: { sequence: <protein> OR "demo" }

 Predict aggregation-prone (amyloid) regions from a protein sequence via a
 transparent windowed model (β-propensity + hydrophobicity − net charge).
 demo = a sequence with a known hydrophobic β-prone hot-spot.
    """
    demo = isinstance(payload.get("sequence"), str) and payload["sequence"].strip().lower() == "demo"
    if demo:
        # flanks + a strongly aggregation-prone VIILVF-type stretch (β + hydrophobic)
        seq = "MDEKQRSTKE" + "VIILVFLVIF" + "GSGSDEKRQE" + "LLVIVFLLIV" + "QESTKDREKM"
    else:
        seq = clean_protein(payload.get("sequence", ""))
        if len(seq) < 7:
            return {"error": "sequence too short (need >= 7 aa)"}
        if len(seq) > 100_000:
            return {"error": "sequence too long (max 100k aa)"}
        bad = set(seq) - AA
        if bad:
            return {"error": f"non-standard residues: {''.join(sorted(bad))}"}

    res = windowed_aggregation(seq)
    scores = res["scores"]
    out = {
        "method": "windowed aggregation propensity (Chou-Fasman β-propensity + Kyte-Doolittle hydropathy − net charge)",
        "demo": demo,
        "length_aa": len(seq),
        "mean_score": round(float(np.mean(scores)), 4) if scores else 0.0,
        "max_score": round(float(np.max(scores)), 4) if scores else 0.0,
        "n_hotspots": len(res["hotspots"]),
        "hotspots": res["hotspots"][:50],
        "scores_preview": scores[:300],
        "aggregation_prone": bool(res["hotspots"]),
        "note": (
            "Real, interpretable aggregation model: β-sheet propensity + "
            "hydrophobicity penalized by net charge over a sliding window, flagging "
            "contiguous high-score stretches (the amyloid hot-spots TANGO/CamSol "
            "target). Deterministic and explainable; a learned predictor is the "
            "documented heavier path."
        ),
    }
    if demo:
        out["ground_truth"] = {"expect_hotspot": True}
    return out


# ===========================================================================
# 3. ChannelDwell, single-channel idealization + dwell-time analysis
# ===========================================================================
def idealize_half_amplitude(current: np.ndarray) -> dict:
    """Half-amplitude threshold idealization into open/closed. Pure.

 The standard single-channel idealization: find the closed and open current
 levels (bimodal), threshold at their midpoint, and segment into dwell events.
    """
    # reliable level estimate: closed = low mode, open = high mode (or vice versa)
    lo = float(np.percentile(current, 10))
    hi = float(np.percentile(current, 90))
    thr = (lo + hi) / 2.0
    # "open" = the level further from the most common (baseline) value
    baseline = float(np.median(current))
    open_is_high = abs(hi - baseline) >= abs(lo - baseline)
    state = (current >= thr) if open_is_high else (current <= thr)  # True == open
    # segment into runs
    events: list[dict] = []
    n = state.size
    i = 0
    while i < n:
        s = bool(state[i])
        j = i
        while j < n and bool(state[j]) == s:
            j += 1
        events.append({"state": "open" if s else "closed", "samples": j - i, "start": i})
        i = j
    return {
        "threshold": round(thr, 6),
        "closed_level": round(lo if open_is_high else hi, 6),
        "open_level": round(hi if open_is_high else lo, 6),
        "events": events,
        "state": state,
    }


def fit_dwell_tau(durations_ms: np.ndarray) -> Optional[float]:
    """ML single-exponential dwell-time constant = mean dwell. Pure.

 For an exponential distribution the maximum-likelihood rate is 1/mean, so the
 time constant τ = mean(dwell). (A multi-exponential mixture is the heavier
 fit.) Returns τ in ms, or None if too few events.
    """
    if durations_ms.size < 3:
        return None
    return round(float(np.mean(durations_ms)), 5)


def run_channel_dwell(payload: dict) -> dict:
    """payload: { trace: [pA] or "demo", fs_hz?: float }

 Idealize a single-channel current record into open/closed states (half-
 amplitude threshold), then compute open/closed probabilities, mean dwell
 times, and ML single-exponential dwell-time constants. demo = a synthetic
 two-state record with known open probability.
    """
    fs = float(payload.get("fs_hz") if payload.get("fs_hz") is not None else 10000.0)
    if fs <= 0:
        return {"error": "fs_hz must be > 0"}

    demo = isinstance(payload.get("trace"), str) and payload["trace"].strip().lower() == "demo"
    p_open_true = None
    if demo:
        rng = np.random.default_rng(13)
        n = int(fs * 2.0)  # 2 s
        # two-state Markov with known transition rates
        p_co, p_oc = 0.002, 0.004  # closed→open, open→closed per sample
        st = np.zeros(n, dtype=bool)
        cur_open = False
        for k in range(n):
            if cur_open:
                if rng.random() < p_oc:
                    cur_open = False
            else:
                if rng.random() < p_co:
                    cur_open = True
            st[k] = cur_open
        p_open_true = float(st.mean())
        current = np.where(st, 2.0, 0.0) + rng.normal(0, 0.15, size=n)  # pA
    else:
        raw = payload.get("trace")
        if isinstance(raw, str):
            toks = [t for t in re.split(r"[\s,]+", raw.strip()) if t]
            try:
                current = np.array([float(t) for t in toks], dtype=np.float64)
            except ValueError:
                return {"error": "trace must be numeric"}
        elif isinstance(raw, (list, tuple)):
            try:
                current = np.array([float(x) for x in raw], dtype=np.float64)
            except (ValueError, TypeError):
                return {"error": "trace must be a list of numbers"}
        else:
            return {"error": "trace must be a list/string of current samples or 'demo'"}
        if current.size < 50:
            return {"error": "trace too short (need >= 50 samples)"}
        if current.size > 20_000_000:
            return {"error": "trace too long (max 20M samples)"}
        if not np.all(np.isfinite(current)):
            return {"error": "trace contains non-finite values"}

    ideal = idealize_half_amplitude(current)
    state = ideal.pop("state")
    p_open = float(np.mean(state))
    open_durs = np.array([e["samples"] / fs * 1000.0 for e in ideal["events"] if e["state"] == "open"])
    closed_durs = np.array([e["samples"] / fs * 1000.0 for e in ideal["events"] if e["state"] == "closed"])
    out = {
        "method": "half-amplitude threshold idealization + dwell-time analysis (ML single-exponential τ)",
        "demo": demo,
        "fs_hz": fs,
        "n_samples": int(current.size),
        "duration_s": round(current.size / fs, 4),
        "levels": {"closed": ideal["closed_level"], "open": ideal["open_level"], "threshold": ideal["threshold"]},
        "n_events": len(ideal["events"]),
        "n_openings": int(open_durs.size),
        "n_closings": int(closed_durs.size),
        "p_open": round(p_open, 5),
        "mean_open_ms": round(float(open_durs.mean()), 5) if open_durs.size else None,
        "mean_closed_ms": round(float(closed_durs.mean()), 5) if closed_durs.size else None,
        "tau_open_ms": fit_dwell_tau(open_durs),
        "tau_closed_ms": fit_dwell_tau(closed_durs),
        "events_preview": ideal["events"][:300],
        "note": (
            "Real single-channel idealization: half-amplitude threshold between "
            "the closed/open current levels, segmented into dwell events, with "
            "open probability and maximum-likelihood single-exponential dwell "
            "constants (τ = mean dwell). A full HMM/QuB multi-state fit is the "
            "documented heavier path; this idealization is real and deterministic."
        ),
    }
    if p_open_true is not None:
        out["ground_truth_p_open"] = round(p_open_true, 5)
        out["note"] = "DEMO MODE: " + out["note"] + " Trace is a synthetic two-state Markov record with a known open probability (ground_truth_p_open)."
    return out


# Registry the gateway imports.
GENOMICS_RUNNERS = {
    "chromatinaccess": run_chromatin_access,
    "aggregatepredict": run_aggregate_predict,
    "channeldwell": run_channel_dwell,
}
