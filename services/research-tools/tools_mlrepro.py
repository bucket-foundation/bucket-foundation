#!/usr/bin/env python3
"""
research-tools — MLReproCard (REAL repro rubric + model card, CPU, no network)
==============================================================================

Per-field tool for **cs-ml** (cs-ml, 44,999 profiled researchers). The atlas
USERS_NEEDS roadmap: industry MLOps doesn't fit research (no fixed pipeline,
frequent ad-hoc experiments); benchmarking + eval reproducibility is weak and
experiment provenance is often a spreadsheet. The single highest-leverage,
lowest-cost intervention is a structured reproducibility checklist + model card
— the thing the NeurIPS/ICML reproducibility checklists, Mitchell et al. 2019
"Model Cards", and Gundersen & Kjensmo's reproducibility taxonomy all push.

MLReproCard takes a described ML experiment and does REAL rubric scoring against
a concrete, weighted reproducibility checklist grouped into the recognized
dimensions (data, code/method, training, evaluation, compute, sharing). It flags
exactly which repro elements are MISSING, scores each dimension and an overall
0–100 reproducibility score, assigns a Gundersen-style reproducibility level
(R3 fully / R2 partially / R1 / R0), and emits a normalized model card.

This is a deterministic rubric over the supplied fields (no LLM, no network, no
GPU) — the same idea as the FAIRCheck rubric, specialized to ML reproducibility.

Input shape (`payload`): a dict of experiment fields, a JSON string, or "demo".
Recognized fields (all optional — missing = a flagged gap, not a crash):
    model / model_name / architecture   — the model/architecture
    task                                 — the ML task
    dataset / data                       — dataset name/source
    dataset_version / data_version       — a pinned dataset version/DOI/hash
    splits / train_test_split            — how data was split (sizes/strategy)
    seed / random_seed                   — RNG seed(s)
    hyperparameters / hparams / config   — hyperparameters (dict or text)
    training_procedure / training        — optimizer, epochs, schedule, early-stop
    framework / library                  — framework + version (e.g. "pytorch 2.5")
    hardware / compute / gpu             — compute used (GPU/TPU/CPU, count)
    train_time / compute_budget          — wall-clock / compute cost
    metrics / evaluation / eval          — eval metrics + protocol
    baselines                            — baselines compared against
    code / repository / code_url         — public code link
    weights / checkpoint / model_url     — released weights/checkpoint
    license                              — model/code license
    environment / requirements / env     — env spec (requirements/conda/Docker)
    n_runs / repeats / seeds_count       — how many runs were averaged
    variance / std / confidence_interval — reported variance across runs

The gateway imports MLREPRO_RUNNERS from here.
"""
from __future__ import annotations

import json
import re
from typing import Any, Optional


# ---------------------------------------------------------------------------
# the rubric: (key, dimension, weight, human-readable requirement, fix advice).
# Each check looks for the presence (+ minimal substance) of a field. Weights
# sum to 100 across the whole rubric. Dimensions group them for subscores.
# ---------------------------------------------------------------------------
# A check is (id, dimension, weight, fields_any, substance_re_or_None, fix).
_CHECKS: list[tuple[str, str, float, list[str], Optional[str], str]] = [
    # --- data (25) ---
    ("dataset_named", "data", 6, ["dataset", "data"], None,
     "Name the dataset and its source so it can be obtained."),
    ("dataset_versioned", "data", 7, ["dataset_version", "data_version"], None,
     "Pin the exact dataset version (a version tag, DOI, or content hash) — 'ImageNet' is not reproducible, 'ImageNet-1k ILSVRC2012' is."),
    ("splits_specified", "data", 7, ["splits", "train_test_split", "split"], None,
     "Specify the train/val/test split (sizes + strategy, e.g. fixed indices, k-fold, temporal) so others reproduce the same partition."),
    ("preprocessing", "data", 5, ["preprocessing", "transforms", "augmentation", "tokenization"], None,
     "Document preprocessing / augmentation / tokenization (these silently change results)."),
    # --- code / method (18) ---
    ("code_released", "code", 10, ["code", "repository", "code_url", "repo"], r"https?://|github|gitlab|zenodo|/",
     "Release the code at a public, versioned URL (GitHub/GitLab + a tagged release or Zenodo DOI)."),
    ("model_specified", "code", 8, ["model", "model_name", "architecture", "method"], None,
     "Specify the model/architecture precisely (layers, sizes, or a named variant)."),
    # --- training (22) ---
    ("seed_set", "training", 8, ["seed", "random_seed", "seeds"], None,
     "Set and report the RNG seed(s) — without a seed, results are not bit-reproducible."),
    ("hyperparameters", "training", 8, ["hyperparameters", "hparams", "config", "learning_rate", "lr", "batch_size"], None,
     "Report ALL hyperparameters (lr, batch size, optimizer, epochs, weight decay, schedule) — a config file or table."),
    ("training_procedure", "training", 6, ["training_procedure", "training", "optimizer", "epochs", "schedule"], None,
     "Describe the training procedure: optimizer, epochs/steps, LR schedule, early-stopping, checkpointing."),
    # --- evaluation (17) ---
    ("metrics", "evaluation", 7, ["metrics", "evaluation", "eval", "results"], None,
     "Report the evaluation metric(s) and the exact protocol (which split, how aggregated)."),
    ("baselines", "evaluation", 4, ["baselines", "baseline", "comparison"], None,
     "Compare against baselines so the result is contextualized."),
    ("multiple_runs", "evaluation", 3, ["n_runs", "repeats", "seeds_count", "runs"], None,
     "Run multiple seeds and report how many — single-run numbers are not robust."),
    ("variance_reported", "evaluation", 3, ["variance", "std", "confidence_interval", "ci", "stddev", "error_bars"], None,
     "Report variance across runs (std / CI / error bars), not just a point estimate."),
    # --- compute (8) ---
    ("hardware", "compute", 4, ["hardware", "compute", "gpu", "tpu", "device"], None,
     "State the compute used (GPU/TPU/CPU model + count) — needed to judge cost and to reproduce timing."),
    ("compute_budget", "compute", 4, ["train_time", "compute_budget", "flops", "gpu_hours", "wall_clock"], None,
     "Report the compute budget (wall-clock / GPU-hours / FLOPs) for transparency and carbon accounting."),
    # --- sharing / environment (10) ---
    ("environment", "sharing", 5, ["environment", "requirements", "env", "dependencies", "docker", "conda"], None,
     "Pin the software environment (requirements.txt / conda env / Dockerfile + framework version)."),
    ("weights_released", "sharing", 3, ["weights", "checkpoint", "model_url", "model_weights"], None,
     "Release trained weights / a checkpoint so results can be reproduced without retraining."),
    ("license", "sharing", 2, ["license"], None,
     "State a license for the model/code so others can legally reuse it."),
]

_DIMENSIONS = ["data", "code", "training", "evaluation", "compute", "sharing"]
_DIM_LABEL = {
    "data": "Data", "code": "Code & Method", "training": "Training",
    "evaluation": "Evaluation", "compute": "Compute", "sharing": "Sharing & Environment",
}


def _present(record: dict, fields: list[str], substance: Optional[str]) -> tuple[bool, str]:
    """Is at least one of `fields` present + (optionally) substantive? Returns
    (present, the_value_text)."""
    keys = {str(k).strip().lower(): k for k in record.keys()}
    for f in fields:
        if f in keys:
            v = record[keys[f]]
            text = _as_text(v).strip()
            if not text:
                continue
            if substance is not None and not re.search(substance, text, re.I):
                # present but doesn't look substantive (e.g. code field w/o a URL)
                return (False, text)
            return (True, text)
    return (False, "")


def _as_text(v: Any) -> str:
    if v is None:
        return ""
    if isinstance(v, bool):
        return "yes" if v else ""
    if isinstance(v, (list, tuple, set)):
        return ", ".join(str(x) for x in v)
    if isinstance(v, dict):
        return "; ".join(f"{k}={x}" for k, x in v.items())
    return str(v)


def assess_repro(record: dict) -> dict:
    dim_score: dict[str, float] = {d: 0.0 for d in _DIMENSIONS}
    dim_max: dict[str, float] = {d: 0.0 for d in _DIMENSIONS}
    checks: list[dict] = []
    gaps: list[dict] = []
    earned = 0.0

    for cid, dim, weight, fields, substance, fix in _CHECKS:
        present, value = _present(record, fields, substance)
        dim_max[dim] += weight
        if present:
            dim_score[dim] += weight
            earned += weight
        else:
            gaps.append({"check": cid, "dimension": dim, "weight": weight, "fix": fix})
        checks.append({
            "check": cid, "dimension": dim, "weight": weight,
            "present": present,
            "value": (value[:160] if value else ""),
        })

    overall = round(earned, 1)  # weights already sum to 100
    subscores = {
        _DIM_LABEL[d]: round(100.0 * dim_score[d] / dim_max[d], 1) if dim_max[d] else 0.0
        for d in _DIMENSIONS
    }
    gaps.sort(key=lambda g: g["weight"], reverse=True)

    # Gundersen-style reproducibility level.
    has_code = any(c["check"] == "code_released" and c["present"] for c in checks)
    has_data = any(c["check"] == "dataset_named" and c["present"] for c in checks)
    has_env = any(c["check"] == "environment" and c["present"] for c in checks)
    if overall >= 85 and has_code and has_data and has_env:
        level, level_name = "R3", "Reproducible — code + data + environment + experiment fully specified"
    elif overall >= 60 and has_code:
        level, level_name = "R2", "Partially reproducible — code shared, but some experiment details are missing"
    elif overall >= 35:
        level, level_name = "R1", "Replicable-in-principle — described, but neither code nor full detail is provided"
    else:
        level, level_name = "R0", "Not reproducible — critical elements (data/code/seed/hyperparameters) are missing"

    return {
        "reproducibility_score": overall,
        "reproducibility_level": level,
        "level_name": level_name,
        "dimension_subscores": subscores,
        "checks": checks,
        "prioritized_gaps": gaps,
        "n_gaps": len(gaps),
    }


def _model_card(record: dict) -> dict:
    """Normalize the supplied fields into a model-card skeleton (Mitchell 2019)."""
    def g(*names: str) -> str:
        for n in names:
            for k in record:
                if str(k).strip().lower() == n:
                    t = _as_text(record[k]).strip()
                    if t:
                        return t
        return ""
    return {
        "model_details": {
            "model": g("model", "model_name", "architecture", "method"),
            "task": g("task"),
            "framework": g("framework", "library"),
            "license": g("license"),
        },
        "training_data": {
            "dataset": g("dataset", "data"),
            "version": g("dataset_version", "data_version"),
            "splits": g("splits", "train_test_split", "split"),
        },
        "training": {
            "hyperparameters": g("hyperparameters", "hparams", "config"),
            "procedure": g("training_procedure", "training", "optimizer"),
            "seed": g("seed", "random_seed", "seeds"),
            "hardware": g("hardware", "compute", "gpu"),
            "compute_budget": g("train_time", "compute_budget", "gpu_hours"),
        },
        "evaluation": {
            "metrics": g("metrics", "evaluation", "eval", "results"),
            "baselines": g("baselines", "baseline"),
            "runs": g("n_runs", "repeats", "runs"),
            "variance": g("variance", "std", "confidence_interval"),
        },
        "availability": {
            "code": g("code", "repository", "code_url"),
            "weights": g("weights", "checkpoint", "model_url"),
            "environment": g("environment", "requirements", "env", "docker"),
        },
    }


def _demo_record() -> dict:
    """A deliberately MIXED experiment: strong on code/eval, missing seed, dataset
    version, environment, and compute reporting — so the rubric surfaces concrete,
    well-known repro gaps."""
    return {
        "model": "ResNet-50 (torchvision variant)",
        "task": "image classification",
        "dataset": "ImageNet",                # named but NOT versioned → gap
        "splits": "standard train/val (1.28M / 50k)",
        "hyperparameters": {"lr": 0.1, "batch_size": 256, "optimizer": "SGD", "epochs": 90, "weight_decay": 1e-4},
        "training_procedure": "SGD with step LR decay at epochs 30/60/80, momentum 0.9",
        "framework": "pytorch 2.5",
        "metrics": "top-1 accuracy 76.1%, top-5 92.9% on val",
        "baselines": "AlexNet, VGG-16",
        "code": "https://github.com/example/resnet-repro",
        "license": "MIT",
        # MISSING on purpose: seed, dataset_version, environment, hardware,
        # compute_budget, weights, n_runs, variance.
    }


def run_mlrepro_card(payload: dict) -> dict:
    """payload: { record: <experiment fields | JSON string> }  OR  "demo".

    Score a described ML experiment against a real reproducibility rubric
    (data/code/training/evaluation/compute/sharing), flag missing repro elements,
    assign a Gundersen-style level, and emit a normalized model card.
    Deterministic; never raises on malformed input.
    """
    raw = payload.get("record")
    demo = bool(payload.get("demo")) or (isinstance(raw, str) and raw.strip().lower() == "demo")
    if demo:
        record = _demo_record()
    elif isinstance(raw, dict):
        record = raw
    elif isinstance(raw, str):
        s = raw.strip()
        if len(s) < 2:
            return {"error": 'provide an experiment record (JSON object or fields), or "demo"'}
        try:
            record = json.loads(s)
        except Exception:
            return {"error": "record string must be valid JSON describing the experiment fields"}
        if not isinstance(record, dict):
            return {"error": "record JSON must be an object of experiment fields"}
    else:
        return {"error": 'provide an experiment record (JSON object or fields), or "demo"'}

    if not record:
        return {"error": "record is empty — supply at least one experiment field"}
    if len(record) > 500:
        return {"error": "record has too many fields (max 500)"}

    result = assess_repro(record)
    result["model_card"] = _model_card(record)
    result["demo"] = demo
    result["method"] = (
        "Deterministic reproducibility rubric (18 weighted checks across data, "
        "code/method, training, evaluation, compute, and sharing) grounded in the "
        "ML reproducibility-checklist literature (NeurIPS/ICML checklists, Mitchell "
        "et al. 2019 Model Cards, Gundersen & Kjensmo reproducibility taxonomy). "
        "Flags missing repro elements, scores each dimension + an overall 0–100 "
        "score, assigns an R0–R3 level, and emits a normalized model card. No LLM, "
        "no network, no GPU."
    )
    result["note"] = (
        "Field tool for cs-ml: research MLOps is weak — provenance is often a "
        "spreadsheet. This is a transparent self-assessment + a fill-in model card, "
        "not a certifying audit. The fastest score gains are usually: pin the "
        "dataset version, set + report a seed, and release code with a pinned "
        "environment."
    )
    if demo:
        result["ground_truth"] = {
            "missing_must_include": ["seed_set", "dataset_versioned", "environment", "hardware"],
            "code_released_present": True,
            "expected_level_in": ["R1", "R2"],
        }
        result["note"] = (
            "DEMO: a ResNet-50/ImageNet experiment that is strong on code+eval but "
            "MISSING a seed, a pinned dataset version, an environment spec, and "
            "compute reporting — the rubric surfaces exactly those gaps. " + result["note"]
        )
    return result


# Registry the gateway imports.
MLREPRO_RUNNERS = {
    "mlreprocard": run_mlrepro_card,
}
