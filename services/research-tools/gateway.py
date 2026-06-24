#!/usr/bin/env python3
"""
research-tools gateway — UNIFIED, all 7 tools
=============================================

Implements the v1 research-tools job contract (see
bucket-foundation/docs/research-tools/04-implementation-architecture.md §2) for
ALL seven biophysics tools, so the full submit -> poll -> result -> publish path
works uniformly across the whole suite from one process.

This is the full-gateway successor to the LabBrain first slice
(`labbrain_gateway.py`, kept for reference). It ports the EXACT validation +
subprocess logic from the existing all-tools wrapper
(`biophysics-phd-review/tools_api/app.py`) into the uniform job lifecycle every
tool shares:

    POST /v1/<tool>/submit          -> { job_id, status, mode, price, [result] }
    GET  /v1/jobs/<job_id>          -> status envelope
    GET  /v1/jobs/<job_id>/result   -> { render: "json"|"html", output, ... }
    GET  /health                    -> { ok, tools, version }

Run (matches the Polingual API pattern — systemd --user on the box, nginx + TLS
in front at research-tools.agfarms.dev):

    uvicorn gateway:app --host 127.0.0.1 --port 8732

Tool classes
------------
CPU tools run INLINE (the submit handler runs them in a worker thread and, if
they finish within the inline budget, attaches the result to the submit
response so the UI can skip polling):

    labbrain, proteinscout, stabilitydesigner, screenserver, patchseqml

GPU / long tools run in DEMO / SYNTHETIC mode (the Hetzner CPX42 has no GPU; the
async contract is built so flipping on a real GPU worker is a deploy, not a
redesign). They go through the same job table but are flagged mode="async" and
demo=True:

    trajmine   (CPU demo-md trajectory; real MD needs a GPU/long worker)
    cryotriage (synthetic micrographs; real cryo-EM triage needs a GPU worker)

TODO(deploy): everything below marked TODO(deploy) is a backend/infra seam that
lands when the gateway is stood up on Hetzner. None of it blocks the contract.
"""
from __future__ import annotations

import base64
import json
import mimetypes
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# --- paths / config (mirrors tools_api/app.py) -----------------------------
# This file lives at bucket-foundation/services/research-tools/; the tools live
# in the sibling biophysics-phd-review checkout. Override with TOOLS_REPO_DIR.
BASE = Path(
    os.environ.get(
        "TOOLS_REPO_DIR",
        str(Path.home() / "agfarms" / "biophysics-phd-review"),
    )
).resolve()
# ScreenServer ships outside the review repo (matches tools_api/app.py).
# TODO(deploy): vendor screenserver into the gateway image / a known path.
SCREENSERVER = Path(os.environ.get("SCREENSERVER_DIR", "/home/gian/screenserver"))
PY = sys.executable
AA = set("ACDEFGHIKLMNPQRSTVWY")
# ROCm hang guard: tools embed/run on CPU by default (see labbrain/README.md).
ENV = {**os.environ, "HSA_OVERRIDE_GFX_VERSION": "11.0.0"}

# Inline-vs-async threshold. A fast tool completes well under this; if a job is
# still running after the budget we report mode="async" and the client polls.
INLINE_BUDGET_S = float(os.environ.get("TOOLS_INLINE_BUDGET_S", "30"))

# Tool registry: the server-side allow-list. The Next proxy validates <tool>
# against this same set before forwarding.
CPU_TOOLS = ["labbrain", "proteinscout", "stabilitydesigner", "screenserver", "patchseqml"]
DEMO_TOOLS = ["trajmine", "cryotriage"]
# T1 RAG/agent/data tools — REAL logic over live OpenAlex + the research-atlas
# grant corpus (services/research-tools/tools_rag.py). CPU/inline, no GPU, no
# subprocess. They render "json" typed views.
RAG_TOOLS = ["paperradar", "grantdraft", "methodsmatcher", "reviewguard"]
# DNA/RNA cluster (services/research-tools/tools_dnarna.py) — REAL algorithms
# over ViennaRNA + numpy. CPU/inline, no subprocess, render "json".
DNARNA_TOOLS = ["rnastructure", "grnaoptimizer", "rnafmembeds"]
# Neuroscience cluster (services/research-tools/tools_neuro.py) — REAL scipy
# numerical fits + spike detection. CPU/inline, render "json".
NEURO_TOOLS = ["hhfit", "spikefeatures"]
# QuantumBioRAG lives in tools_rag.py (claim-strength RAG over live OpenAlex);
# it shares the RAG backend + registry, so it is added to RAG_TOOLS above.
RAG_TOOLS.append("quantumbiorag")
# ProtocolGPT (services/research-tools/tools_protocol.py) — REAL rule/template
# extraction over a methods knowledge base. CPU/inline, no network, render "json".
PROTOCOL_TOOLS = ["protocolgpt"]
# ToxinChannelFinder (services/research-tools/tools_toxin.py) — REAL curated
# venom-peptide pharmacology KB + live OpenAlex co-occurrence. CPU/inline.
TOXIN_TOOLS = ["toxinchannelfinder"]
# CitationGraph (services/research-tools/tools_citation.py) — REAL OpenAlex
# citation-neighborhood graph + degree centrality. CPU/inline.
CITATION_TOOLS = ["citationgraph"]
# Imaging / mechanobiology cluster (services/research-tools/tools_imaging.py) —
# REAL scipy + scikit-image signal/image processing. CPU/inline, no GPU.
#   calciumtraceml  — ΔF/F + transient detection (signal processing)
#   cellsegtrack    — cell segmentation (cellpose if installed, else watershed)
#   afmcurveml      — AFM force-curve Hertz/Sneddon modulus fit
#   tractionforceml — block-matching PIV displacement field (classical)
IMAGING_TOOLS = ["calciumtraceml", "cellsegtrack", "afmcurveml", "tractionforceml"]
# FigureMiner (services/research-tools/tools_figure.py) — REAL text-layer caption
# + statistics + measurement mining (PDF via PyMuPDF/pypdf, or raw text). The
# pixel-level plot-digitization stage is a documented GPU/vision extension.
FIGURE_TOOLS = ["figureminer"]
# Genomics / sequence cluster (services/research-tools/tools_genomics.py) — REAL
# interpretable sequence + signal algorithms. CPU/inline, no GPU.
#   chromatinaccess  — accessibility/regulatory potential from DNA (feature model)
#   aggregatepredict — amyloid/aggregation propensity from a protein sequence
#   channeldwell     — single-channel idealization + dwell-time analysis
GENOMICS_TOOLS = ["chromatinaccess", "aggregatepredict", "channeldwell"]
# All-field HORIZONTAL tools (services/research-tools/tools_fair.py +
# tools_repli.py) — serve EVERY discipline (the 1.17M researchers), not one
# field. FAIR data management + statistics reproducibility are funder-mandated
# across NIH/NSF/Horizon/Wellcome/Gates. REAL deterministic rubric + scipy math,
# CPU/inline, no network, no GPU, render "json".
#   faircheck   — FAIR (Findable/Accessible/Interoperable/Reusable) rubric
#   replicheck  — statcheck p-value recomputation + GRIM test + reporting flags
HORIZONTAL_TOOLS = ["faircheck", "replicheck"]
# Per-field NON-bio cluster (services/research-tools/tools_{causal,materials,power,
# geo,mlrepro}.py) — REAL algorithms for the biggest CPU-feasible non-bio fields
# named in research-atlas/docs/USERS_NEEDS.md. CPU/inline, no GPU, render "json".
#   causaldesigner     — econ-social: DAG + backdoor/adjustment set (networkx do-calc)
#   materialsfeaturizer— materials: Magpie-style composition descriptors (element KB)
#   powerplan          — universal/stats: power & sample-size (scipy noncentral dists)
#   geosummary         — earth-climate: trend (Mann-Kendall/Theil-Sen) + seasonality
#   mlreprocard        — cs-ml: ML reproducibility rubric + model card (deterministic)
FIELD_TOOLS = ["causaldesigner", "materialsfeaturizer", "powerplan", "geosummary", "mlreprocard"]
# Per-field CLASSICAL-algorithm cluster (services/research-tools/tools_{seqalign,
# stoich,units,survival,forecast}.py) — REAL exact algorithms for the biggest
# CPU-feasible fields/tasks in research-atlas/docs/USERS_NEEDS.md not yet covered.
# CPU/inline, no GPU, no subprocess, render "json".
#   seqalign          — bio/genomics: Needleman-Wunsch + Smith-Waterman (BLOSUM62)
#   stoichbalance     — chemistry: equation balancing (null-space) + limiting reagent
#   unitdimcheck      — physics/universal: SI dimensional analysis + unit conversion
#   survivalfit       — biomed/stats: Kaplan-Meier + median + log-rank test
#   timeseriesforecast— econ/earth/universal: Holt-Winters decompose + forecast + backtest
CLASSIC_TOOLS = ["seqalign", "stoichbalance", "unitdimcheck", "survivalfit", "timeseriesforecast"]
# REAL pure-logic backends that share one runner pattern (no subprocess, no GPU).
PURE_TOOLS = (
    RAG_TOOLS + DNARNA_TOOLS + NEURO_TOOLS + PROTOCOL_TOOLS + TOXIN_TOOLS
    + CITATION_TOOLS + IMAGING_TOOLS + FIGURE_TOOLS + GENOMICS_TOOLS
    + HORIZONTAL_TOOLS + FIELD_TOOLS + CLASSIC_TOOLS
)
ALL_TOOLS = CPU_TOOLS + PURE_TOOLS + DEMO_TOOLS

# price block travels from day one (zeroed). Metering seam lives in the Next
# proxy, not here — the gateway stays payment-agnostic. See doc §6.
PRICE: dict[str, dict[str, Any]] = {
    "labbrain": {"tier": "ask", "usd": 0.0, "metered": False},
    "proteinscout": {"tier": "analyze", "usd": 0.0, "metered": False},
    "stabilitydesigner": {"tier": "predict", "usd": 0.0, "metered": False},
    "screenserver": {"tier": "screen", "usd": 0.0, "metered": False},
    "patchseqml": {"tier": "analyze", "usd": 0.0, "metered": False},
    "trajmine": {"tier": "demo", "usd": 0.0, "metered": False},
    "cryotriage": {"tier": "demo", "usd": 0.0, "metered": False},
    "paperradar": {"tier": "feed", "usd": 0.0, "metered": False},
    "grantdraft": {"tier": "draft", "usd": 0.0, "metered": False},
    "methodsmatcher": {"tier": "match", "usd": 0.0, "metered": False},
    "reviewguard": {"tier": "review", "usd": 0.0, "metered": False},
    "rnastructure": {"tier": "fold", "usd": 0.0, "metered": False},
    "grnaoptimizer": {"tier": "design", "usd": 0.0, "metered": False},
    "rnafmembeds": {"tier": "embed", "usd": 0.0, "metered": False},
    "hhfit": {"tier": "fit", "usd": 0.0, "metered": False},
    "spikefeatures": {"tier": "analyze", "usd": 0.0, "metered": False},
    "quantumbiorag": {"tier": "triage", "usd": 0.0, "metered": False},
    "protocolgpt": {"tier": "structure", "usd": 0.0, "metered": False},
    "toxinchannelfinder": {"tier": "map", "usd": 0.0, "metered": False},
    "citationgraph": {"tier": "graph", "usd": 0.0, "metered": False},
    "calciumtraceml": {"tier": "analyze", "usd": 0.0, "metered": False},
    "cellsegtrack": {"tier": "segment", "usd": 0.0, "metered": False},
    "afmcurveml": {"tier": "fit", "usd": 0.0, "metered": False},
    "tractionforceml": {"tier": "analyze", "usd": 0.0, "metered": False},
    "figureminer": {"tier": "mine", "usd": 0.0, "metered": False},
    "chromatinaccess": {"tier": "predict", "usd": 0.0, "metered": False},
    "aggregatepredict": {"tier": "predict", "usd": 0.0, "metered": False},
    "channeldwell": {"tier": "analyze", "usd": 0.0, "metered": False},
    "faircheck": {"tier": "assess", "usd": 0.0, "metered": False},
    "replicheck": {"tier": "check", "usd": 0.0, "metered": False},
    "causaldesigner": {"tier": "design", "usd": 0.0, "metered": False},
    "materialsfeaturizer": {"tier": "featurize", "usd": 0.0, "metered": False},
    "powerplan": {"tier": "plan", "usd": 0.0, "metered": False},
    "geosummary": {"tier": "summarize", "usd": 0.0, "metered": False},
    "mlreprocard": {"tier": "assess", "usd": 0.0, "metered": False},
    "seqalign": {"tier": "align", "usd": 0.0, "metered": False},
    "stoichbalance": {"tier": "balance", "usd": 0.0, "metered": False},
    "unitdimcheck": {"tier": "check", "usd": 0.0, "metered": False},
    "survivalfit": {"tier": "fit", "usd": 0.0, "metered": False},
    "timeseriesforecast": {"tier": "forecast", "usd": 0.0, "metered": False},
}

# import the REAL T1 backend (live OpenAlex + research-atlas grant corpus).
try:
    import tools_rag  # type: ignore
    _RAG_OK = True
    _RAG_IMPORT_ERR = ""
except Exception as _e:  # pragma: no cover - import guard
    tools_rag = None  # type: ignore
    _RAG_OK = False
    _RAG_IMPORT_ERR = str(_e)

# import the REAL DNA/RNA backend (ViennaRNA + numpy).
try:
    import tools_dnarna  # type: ignore
    _DNARNA_OK = True
    _DNARNA_IMPORT_ERR = ""
except Exception as _e:  # pragma: no cover - import guard
    tools_dnarna = None  # type: ignore
    _DNARNA_OK = False
    _DNARNA_IMPORT_ERR = str(_e)

# import the REAL neuroscience backend (scipy fits + spike detection).
try:
    import tools_neuro  # type: ignore
    _NEURO_OK = True
    _NEURO_IMPORT_ERR = ""
except Exception as _e:  # pragma: no cover - import guard
    tools_neuro = None  # type: ignore
    _NEURO_OK = False
    _NEURO_IMPORT_ERR = str(_e)

# import the REAL ProtocolGPT backend (rule/template extraction, no network).
try:
    import tools_protocol  # type: ignore
    _PROTOCOL_OK = True
    _PROTOCOL_IMPORT_ERR = ""
except Exception as _e:  # pragma: no cover - import guard
    tools_protocol = None  # type: ignore
    _PROTOCOL_OK = False
    _PROTOCOL_IMPORT_ERR = str(_e)

# import the REAL ToxinChannelFinder backend (curated KB + live OpenAlex).
try:
    import tools_toxin  # type: ignore
    _TOXIN_OK = True
    _TOXIN_IMPORT_ERR = ""
except Exception as _e:  # pragma: no cover - import guard
    tools_toxin = None  # type: ignore
    _TOXIN_OK = False
    _TOXIN_IMPORT_ERR = str(_e)

# import the REAL CitationGraph backend (live OpenAlex citation graph).
try:
    import tools_citation  # type: ignore
    _CITATION_OK = True
    _CITATION_IMPORT_ERR = ""
except Exception as _e:  # pragma: no cover - import guard
    tools_citation = None  # type: ignore
    _CITATION_OK = False
    _CITATION_IMPORT_ERR = str(_e)

# import the REAL imaging/mechanobiology backend (scipy + scikit-image).
try:
    import tools_imaging  # type: ignore
    _IMAGING_OK = True
    _IMAGING_IMPORT_ERR = ""
except Exception as _e:  # pragma: no cover - import guard
    tools_imaging = None  # type: ignore
    _IMAGING_OK = False
    _IMAGING_IMPORT_ERR = str(_e)

# import the REAL FigureMiner backend (PDF/text caption + statistics mining).
try:
    import tools_figure  # type: ignore
    _FIGURE_OK = True
    _FIGURE_IMPORT_ERR = ""
except Exception as _e:  # pragma: no cover - import guard
    tools_figure = None  # type: ignore
    _FIGURE_OK = False
    _FIGURE_IMPORT_ERR = str(_e)

# import the REAL genomics/sequence backend (interpretable sequence algorithms).
try:
    import tools_genomics  # type: ignore
    _GENOMICS_OK = True
    _GENOMICS_IMPORT_ERR = ""
except Exception as _e:  # pragma: no cover - import guard
    tools_genomics = None  # type: ignore
    _GENOMICS_OK = False
    _GENOMICS_IMPORT_ERR = str(_e)

# import the REAL FAIRCheck backend (Wilkinson-2016 FAIR rubric, no network).
try:
    import tools_fair  # type: ignore
    _FAIR_OK = True
    _FAIR_IMPORT_ERR = ""
except Exception as _e:  # pragma: no cover - import guard
    tools_fair = None  # type: ignore
    _FAIR_OK = False
    _FAIR_IMPORT_ERR = str(_e)

# import the REAL RepliCheck backend (statcheck + GRIM via scipy.stats).
try:
    import tools_repli  # type: ignore
    _REPLI_OK = True
    _REPLI_IMPORT_ERR = ""
except Exception as _e:  # pragma: no cover - import guard
    tools_repli = None  # type: ignore
    _REPLI_OK = False
    _REPLI_IMPORT_ERR = str(_e)

# import the REAL per-field NON-bio backends (one module per field cluster).
try:
    import tools_causal  # type: ignore
    _CAUSAL_OK = True
    _CAUSAL_IMPORT_ERR = ""
except Exception as _e:  # pragma: no cover - import guard
    tools_causal = None  # type: ignore
    _CAUSAL_OK = False
    _CAUSAL_IMPORT_ERR = str(_e)

try:
    import tools_materials  # type: ignore
    _MATERIALS_OK = True
    _MATERIALS_IMPORT_ERR = ""
except Exception as _e:  # pragma: no cover - import guard
    tools_materials = None  # type: ignore
    _MATERIALS_OK = False
    _MATERIALS_IMPORT_ERR = str(_e)

try:
    import tools_power  # type: ignore
    _POWER_OK = True
    _POWER_IMPORT_ERR = ""
except Exception as _e:  # pragma: no cover - import guard
    tools_power = None  # type: ignore
    _POWER_OK = False
    _POWER_IMPORT_ERR = str(_e)

try:
    import tools_geo  # type: ignore
    _GEO_OK = True
    _GEO_IMPORT_ERR = ""
except Exception as _e:  # pragma: no cover - import guard
    tools_geo = None  # type: ignore
    _GEO_OK = False
    _GEO_IMPORT_ERR = str(_e)

try:
    import tools_mlrepro  # type: ignore
    _MLREPRO_OK = True
    _MLREPRO_IMPORT_ERR = ""
except Exception as _e:  # pragma: no cover - import guard
    tools_mlrepro = None  # type: ignore
    _MLREPRO_OK = False
    _MLREPRO_IMPORT_ERR = str(_e)

# import the REAL per-field CLASSICAL-algorithm backends (one module each).
try:
    import tools_seqalign  # type: ignore
    _SEQALIGN_OK = True
    _SEQALIGN_IMPORT_ERR = ""
except Exception as _e:  # pragma: no cover - import guard
    tools_seqalign = None  # type: ignore
    _SEQALIGN_OK = False
    _SEQALIGN_IMPORT_ERR = str(_e)

try:
    import tools_stoich  # type: ignore
    _STOICH_OK = True
    _STOICH_IMPORT_ERR = ""
except Exception as _e:  # pragma: no cover - import guard
    tools_stoich = None  # type: ignore
    _STOICH_OK = False
    _STOICH_IMPORT_ERR = str(_e)

try:
    import tools_units  # type: ignore
    _UNITS_OK = True
    _UNITS_IMPORT_ERR = ""
except Exception as _e:  # pragma: no cover - import guard
    tools_units = None  # type: ignore
    _UNITS_OK = False
    _UNITS_IMPORT_ERR = str(_e)

try:
    import tools_survival  # type: ignore
    _SURVIVAL_OK = True
    _SURVIVAL_IMPORT_ERR = ""
except Exception as _e:  # pragma: no cover - import guard
    tools_survival = None  # type: ignore
    _SURVIVAL_OK = False
    _SURVIVAL_IMPORT_ERR = str(_e)

try:
    import tools_forecast  # type: ignore
    _FORECAST_OK = True
    _FORECAST_IMPORT_ERR = ""
except Exception as _e:  # pragma: no cover - import guard
    tools_forecast = None  # type: ignore
    _FORECAST_OK = False
    _FORECAST_IMPORT_ERR = str(_e)

app = FastAPI(title="research-tools-gateway", version="v1")
# CORS allow-list. The intended caller is the same-origin Bucket Next proxy
# (server->server, no browser CORS at all), so this is defense-in-depth for any
# direct browser hit. Defaults to bucket.foundation + localhost dev; override
# with TOOLS_CORS_ORIGINS (comma-separated) without a code change.
_DEFAULT_CORS = [
    "https://bucket.foundation",
    "https://www.bucket.foundation",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
CORS_ORIGINS = [
    o.strip()
    for o in os.environ.get("TOOLS_CORS_ORIGINS", ",".join(_DEFAULT_CORS)).split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# --- shared subprocess helpers (ported verbatim from tools_api/app.py) -----
def _run(cwd: Any, args: list[str], timeout: int = 300) -> subprocess.CompletedProcess:
    cwd = Path(cwd)
    if not cwd.is_absolute():
        cwd = BASE / cwd
    return subprocess.run(
        [PY, *args], cwd=str(cwd), capture_output=True, text=True, timeout=timeout, env=ENV
    )


def _jtail(s: str) -> Optional[dict]:
    m = re.search(r"\{.*\}", s, re.S)
    return json.loads(m.group()) if m else None


def _seq(s: Optional[str]) -> str:
    s = (s or "").strip()
    if s.startswith(">"):
        s = "".join(s.splitlines()[1:])
    return re.sub(r"[^A-Za-z]", "", s).upper()


def _inline_assets(html: str, base_dir: Path) -> str:
    """Make a report self-contained: base64-embed local images, inline local css."""

    def datauri(p: Path) -> str:
        mt = mimetypes.guess_type(str(p))[0] or "application/octet-stream"
        return f"data:{mt};base64," + base64.b64encode(p.read_bytes()).decode()

    def img(m: re.Match) -> str:
        src = m.group(1)
        if src.startswith(("http", "data:")):
            return m.group(0)
        p = base_dir / src
        return f'src="{datauri(p)}"' if p.exists() else m.group(0)

    html = re.sub(
        r'src="([^"]+)"',
        lambda m: img(m)
        if re.search(r"\.(png|jpe?g|gif|svg|webp)(\?|$)", m.group(1), re.I)
        else m.group(0),
        html,
    )

    def css(m: re.Match) -> str:
        href = m.group(1)
        if href.startswith("http"):
            return m.group(0)
        p = base_dir / href
        return f"<style>{p.read_text(errors='ignore')}</style>" if p.exists() else m.group(0)

    html = re.sub(r'<link[^>]*href="([^"]+\.css)"[^>]*>', css, html)
    return html


def _find_report(out: Path) -> Optional[Path]:
    for name in ("report.html", "index.html"):
        if (out / name).exists():
            return out / name
    hs = list(out.glob("*.html"))
    return hs[0] if hs else None


# --- job table (in-memory; TODO(deploy) Redis/RQ + Supabase mirror) --------
class Job:
    __slots__ = (
        "id", "tool", "status", "submitted_at", "started_at", "finished_at",
        "log_tail", "error", "result", "mode", "demo",
    )

    def __init__(self, job_id: str, tool: str, demo: bool = False) -> None:
        self.id = job_id
        self.tool = tool
        self.status = "queued"  # queued | running | succeeded | failed
        self.submitted_at = _now()
        self.started_at: Optional[str] = None
        self.finished_at: Optional[str] = None
        self.log_tail: str = ""
        self.error: Optional[dict] = None
        self.result: Optional[dict] = None
        self.mode = "inline"  # inline | async
        self.demo = demo


JOBS: dict[str, Job] = {}
_LOCK = threading.Lock()


def _new_job(tool: str, demo: bool = False) -> Job:
    job_id = "j_" + uuid.uuid4().hex[:20]
    job = Job(job_id, tool, demo=demo)
    with _LOCK:
        JOBS[job_id] = job
    return job


def _get_job(job_id: str) -> Job:
    with _LOCK:
        job = JOBS.get(job_id)
    if not job:
        raise HTTPException(404, "unknown job_id")
    return job


def _ok(job: Job, render: str, output: Any, artifacts: Optional[list] = None) -> None:
    """Mark a job succeeded with a contract-shaped result envelope."""
    job.result = {
        "job_id": job.id,
        "tool": job.tool,
        "render": render,
        "output": output,
        "artifacts": artifacts or [],
        "provenance": [
            {"action": "run", "tool": job.tool, "at": _now(), "by": "tools-gateway/v1"}
        ],
        # Tool output is a DERIVED analysis (downstream application), not a canon
        # axiom — publishable, but tagged derived. See doc §5.
        "canon_candidate": True,
        "canon_tier": "derived",
        "demo": job.demo,
    }
    job.status = "succeeded"
    job.finished_at = _now()


def _fail(job: Job, code: str, message: str) -> None:
    job.status = "failed"
    job.error = {"code": code, "message": message}
    job.finished_at = _now()


# --- per-tool runners (each ports the matching tools_api/app.py handler) ----
def _run_labbrain(job: Job, payload: dict) -> None:
    job.status, job.started_at = "running", _now()
    author = (payload.get("author") or "").strip()
    question = (payload.get("question") or "").strip()
    lb = BASE / "labbrain"
    try:
        b = subprocess.run(
            [PY, "labbrain.py", "--device", "cpu", "build", author],
            cwd=str(lb), capture_output=True, text=True, timeout=240, env=ENV,
        )
        job.log_tail = b.stdout[-500:]
        ok_build = b.returncode == 0 and any(
            k in b.stdout.lower() for k in ("indexed", "cache hit", "loading")
        )
        if not ok_build:
            return _fail(job, "corpus_build_failed",
                         f"could not build corpus for '{author}' ({b.stdout[-160:]})")
        a = subprocess.run(
            [PY, "labbrain.py", "--device", "cpu", "ask", question],
            cwd=str(lb), capture_output=True, text=True, timeout=150, env=ENV,
        )
        job.log_tail = a.stdout[-500:]
        if not a.stdout.strip():
            return _fail(job, "no_answer", f"no answer ({a.stderr[-160:]})")
        _ok(job, "json", {"author": author, "question": question, "answer": a.stdout.strip()})
    except subprocess.TimeoutExpired:
        _fail(job, "timeout", "labbrain run exceeded its time budget")
    except Exception as e:  # never leave a job stuck running
        _fail(job, "internal", str(e)[:200])


def _run_proteinscout(job: Job, payload: dict) -> None:
    job.status, job.started_at = "running", _now()
    inp = (payload.get("input") or "").strip()
    try:
        if re.fullmatch(r"[A-Za-z]\d[A-Za-z0-9]+", inp) and len(inp) <= 12:
            arg = f"uniprot:{inp}"  # looks like an accession
        else:
            arg = _seq(inp)
            if len(arg) < 5:
                return _fail(job, "bad_request", "enter a sequence (>=5 aa) or a UniProt accession")
        rep = _tool_report(job, "proteinscout", ["proteinscout.py", "analyze", arg, "--no-llm"], 180)
        if rep is not None:
            _ok(job, "html", rep)
    except subprocess.TimeoutExpired:
        _fail(job, "timeout", "proteinscout run exceeded its time budget")
    except Exception as e:
        _fail(job, "internal", str(e)[:200])


def _run_stabilitydesigner(job: Job, payload: dict) -> None:
    job.status, job.started_at = "running", _now()
    try:
        mode = (payload.get("mode") or "predict").strip()
        seq = _seq(payload.get("sequence"))
        if len(seq) < 5:
            return _fail(job, "bad_request", "sequence too short")
        if mode == "scan":
            pos = int(payload.get("position") or 0)
            if pos < 1 or pos > len(seq):
                return _fail(job, "bad_request", f"position {pos} outside length {len(seq)}")
            wt = seq[pos - 1]
            rows = []
            for new in sorted(AA):
                if new == wt:
                    continue
                out = subprocess.run(
                    [PY, "stabilitydesigner.py", "predict", seq, f"{wt}{pos}{new}"],
                    cwd=str(BASE / "stabilitydesigner"), capture_output=True, text=True,
                    timeout=90, env=ENV,
                )
                j = _jtail(out.stdout)
                if j:
                    rows.append({"mutation": f"{wt}{pos}{new}",
                                 "ddG": j["predicted_ddG_kcal_mol"], "call": j["call"]})
            rows.sort(key=lambda x: x["ddG"])
            _ok(job, "json", {"mode": "scan", "wt": wt, "position": pos, "results": rows})
            return
        # default: single-mutation predict
        mut = (payload.get("mutation") or "").strip().upper()
        if not re.fullmatch(r"[A-Z]\d+[A-Z]", mut):
            return _fail(job, "bad_request", "mutation must look like A23V")
        wt, pos, new = mut[0], int(mut[1:-1]), mut[-1]
        if pos < 1 or pos > len(seq):
            return _fail(job, "bad_request", f"position {pos} outside length {len(seq)}")
        if seq[pos - 1] != wt:
            return _fail(job, "bad_request", f"WT mismatch: seq has {seq[pos-1]} at {pos}, not {wt}")
        if new not in AA:
            return _fail(job, "bad_request", f"mutant {new} not standard")
        out = _run(BASE / "stabilitydesigner", ["stabilitydesigner.py", "predict", seq, mut], 90)
        job.log_tail = out.stdout[-500:]
        j = _jtail(out.stdout)
        if not j:
            return _fail(job, "no_result", f"no result ({out.stderr[-200:]})")
        j["mode"] = "predict"
        _ok(job, "json", j)
    except subprocess.TimeoutExpired:
        _fail(job, "timeout", "stabilitydesigner run exceeded its time budget")
    except Exception as e:
        _fail(job, "internal", str(e)[:200])


def _run_screenserver(job: Job, payload: dict) -> None:
    job.status, job.started_at = "running", _now()
    smis = [s.strip() for s in re.split(r"[\n,]", payload.get("smiles") or "") if s.strip()]
    if not smis:
        return _fail(job, "bad_request", "enter at least one SMILES")
    if len(smis) > 200:
        return _fail(job, "bad_request", "max 200 molecules per request")
    out = Path(tempfile.mkdtemp(prefix="ss_"))
    try:
        csv = out / "lib.csv"
        csv.write_text("smiles\n" + "\n".join(smis))
        rep = out / "report.html"
        r2 = _run(SCREENSERVER, ["screenserver.py", "screen", str(csv), "--out", str(rep), "--no-llm"], 240)
        job.log_tail = r2.stdout[-500:]
        if not rep.exists():
            return _fail(job, "no_report", f"no report. {r2.stdout[-200:]} {r2.stderr[-200:]}")
        html = _inline_assets(rep.read_text(errors="ignore"), rep.parent)
        _ok(job, "html", html)
    except subprocess.TimeoutExpired:
        _fail(job, "timeout", "screenserver run exceeded its time budget")
    except Exception as e:
        _fail(job, "internal", str(e)[:200])
    finally:
        shutil.rmtree(out, ignore_errors=True)


def _run_patchseqml(job: Job, payload: dict) -> None:
    """payload: { mode: "sim" | "file", file_path?: <abs path to staged upload> }."""
    job.status, job.started_at = "running", _now()
    out = Path(tempfile.mkdtemp(prefix="pc_"))
    try:
        target = payload.get("file_path") or "sim"
        r = _run("patchseqml", ["patchseqml.py", "analyze", target, "--out", str(out)], 240)
        job.log_tail = r.stdout[-500:]
        rep = _find_report(out)
        if not rep:
            return _fail(job, "no_report", f"no report ({r.stdout[-200:]} {r.stderr[-160:]})")
        _ok(job, "html", _inline_assets(rep.read_text(errors="ignore"), rep.parent))
    except subprocess.TimeoutExpired:
        _fail(job, "timeout", "patchseqml run exceeded its time budget")
    except Exception as e:
        _fail(job, "internal", str(e)[:200])
    finally:
        shutil.rmtree(out, ignore_errors=True)


# --- demo-mode runners for GPU / long tools --------------------------------
# TODO(deploy): real GPU worker plane. trajmine real MD and cryotriage real
# cryo-EM triage require a GPU node + a Redis/RQ queue (doc §4). Until a GPU
# plan lands these run the synthetic/demo path tools_api/app.py already ships,
# flagged demo=True so the UI labels them clearly.
def _run_trajmine(job: Job, payload: dict) -> None:
    job.status, job.started_at = "running", _now()
    out = Path(tempfile.mkdtemp(prefix="tm_"))
    try:
        cmd = "demo-md" if (payload.get("demo") or "md") == "md" else "demo"
        r = _run("trajmine", ["trajmine.py", cmd], 420)
        job.log_tail = r.stdout[-500:]
        base = BASE / "trajmine" / "out"
        reps = sorted(base.rglob("report.html"), key=lambda p: p.stat().st_mtime, reverse=True)
        if not reps:
            return _fail(job, "no_report", f"no report ({r.stdout[-200:]})")
        _ok(job, "html", _inline_assets(reps[0].read_text(errors="ignore"), reps[0].parent))
    except subprocess.TimeoutExpired:
        _fail(job, "timeout", "trajmine demo exceeded its time budget")
    except Exception as e:
        _fail(job, "internal", str(e)[:200])
    finally:
        shutil.rmtree(out, ignore_errors=True)


def _run_cryotriage(job: Job, payload: dict) -> None:
    """payload: { file_path?: <abs path to staged micrograph> } else synthetic."""
    job.status, job.started_at = "running", _now()
    work = Path(tempfile.mkdtemp(prefix="cy_"))
    mics = work / "mics"
    mics.mkdir()
    out = work / "rep"
    try:
        fp = payload.get("file_path")
        if fp:
            shutil.copy(fp, mics / Path(fp).name)
        else:
            _run("cryotriage", ["cryotriage.py", "synth", "--out", str(mics)], 180)
        r = _run("cryotriage", ["cryotriage.py", "triage", str(mics), "--out", str(out), "--no-llm"], 300)
        job.log_tail = r.stdout[-500:]
        rep = _find_report(out)
        if not rep:
            return _fail(job, "no_report", f"no report ({r.stdout[-200:]} {r.stderr[-160:]})")
        _ok(job, "html", _inline_assets(rep.read_text(errors="ignore"), rep.parent))
    except subprocess.TimeoutExpired:
        _fail(job, "timeout", "cryotriage demo exceeded its time budget")
    except Exception as e:
        _fail(job, "internal", str(e)[:200])
    finally:
        shutil.rmtree(work, ignore_errors=True)


def _tool_report(job: Job, cwd: Any, args: list[str], timeout: int) -> Optional[str]:
    """Run a tool that writes an HTML report into a temp --out dir; return inlined HTML.

    Mirrors tools_api/app.py:tool_report but fails the job (returns None) instead
    of raising, so the job lifecycle stays clean.
    """
    out = Path(tempfile.mkdtemp(prefix="rt_"))
    try:
        r = _run(cwd, args + ["--out", str(out)], timeout=timeout)
        job.log_tail = r.stdout[-500:]
        rep = _find_report(out)
        if not rep and "--outdir" not in args:
            _run(cwd, args + ["--outdir", str(out)], timeout=timeout)
            rep = _find_report(out)
        if not rep:
            _fail(job, "no_report",
                  f"no report produced. stdout:{r.stdout[-200:]} stderr:{r.stderr[-200:]}")
            return None
        return _inline_assets(rep.read_text(errors="ignore"), rep.parent)
    finally:
        shutil.rmtree(out, ignore_errors=True)


# --- T1 RAG/agent/data runners (REAL logic; no subprocess, no GPU) ----------
# Each wraps a pure-ish function from tools_rag.py (live OpenAlex + the
# research-atlas grant corpus, disk-cached) in the uniform job lifecycle. They
# emit render="json" typed views, exactly like labbrain/stabilitydesigner.
# Each pure-logic tool shares ONE runner shape: look up run_<tool>(payload) in
# its module's registry, call it, wrap the returned dict in the v1 envelope.
# `ok`/`err`/`registry_fn` are bound per backend so DNA/RNA + neuro reuse the
# exact RAG pattern without copy-paste.
def _make_pure_runner(
    tool: str,
    backend_ok: bool,
    backend_err: str,
    registry: Optional[dict],
    backend_name: str,
) -> Callable[[Job, dict], None]:
    def runner(job: Job, payload: dict) -> None:
        job.status, job.started_at = "running", _now()
        if not backend_ok or registry is None:
            return _fail(job, "backend_unavailable",
                         f"{backend_name} import failed: {backend_err}")
        fn = registry.get(tool)
        if fn is None:  # pragma: no cover - guarded by registry
            return _fail(job, "unknown_tool", tool)
        try:
            out = fn(payload)
            if isinstance(out, dict) and out.get("error"):
                return _fail(job, "bad_request", out["error"])
            # `degraded` (e.g. ViennaRNA missing, network down) is a successful
            # but partial result — the UI shows a banner, never crashes.
            _ok(job, "json", out)
        except Exception as e:  # never leave a job stuck running
            _fail(job, "internal", str(e)[:200])

    return runner


def _make_rag_runner(tool: str) -> Callable[[Job, dict], None]:
    return _make_pure_runner(
        tool, _RAG_OK, _RAG_IMPORT_ERR,
        tools_rag.RAG_RUNNERS if tools_rag is not None else None, "tools_rag",
    )


RUNNERS: dict[str, Callable[[Job, dict], None]] = {
    "labbrain": _run_labbrain,
    "proteinscout": _run_proteinscout,
    "stabilitydesigner": _run_stabilitydesigner,
    "screenserver": _run_screenserver,
    "patchseqml": _run_patchseqml,
    "trajmine": _run_trajmine,
    "cryotriage": _run_cryotriage,
    **{t: _make_rag_runner(t) for t in RAG_TOOLS},
    **{
        t: _make_pure_runner(
            t, _DNARNA_OK, _DNARNA_IMPORT_ERR,
            tools_dnarna.DNARNA_RUNNERS if tools_dnarna is not None else None,
            "tools_dnarna",
        )
        for t in DNARNA_TOOLS
    },
    **{
        t: _make_pure_runner(
            t, _NEURO_OK, _NEURO_IMPORT_ERR,
            tools_neuro.NEURO_RUNNERS if tools_neuro is not None else None,
            "tools_neuro",
        )
        for t in NEURO_TOOLS
    },
    **{
        t: _make_pure_runner(
            t, _PROTOCOL_OK, _PROTOCOL_IMPORT_ERR,
            tools_protocol.PROTOCOL_RUNNERS if tools_protocol is not None else None,
            "tools_protocol",
        )
        for t in PROTOCOL_TOOLS
    },
    **{
        t: _make_pure_runner(
            t, _TOXIN_OK, _TOXIN_IMPORT_ERR,
            tools_toxin.TOXIN_RUNNERS if tools_toxin is not None else None,
            "tools_toxin",
        )
        for t in TOXIN_TOOLS
    },
    **{
        t: _make_pure_runner(
            t, _CITATION_OK, _CITATION_IMPORT_ERR,
            tools_citation.CITATION_RUNNERS if tools_citation is not None else None,
            "tools_citation",
        )
        for t in CITATION_TOOLS
    },
    **{
        t: _make_pure_runner(
            t, _IMAGING_OK, _IMAGING_IMPORT_ERR,
            tools_imaging.IMAGING_RUNNERS if tools_imaging is not None else None,
            "tools_imaging",
        )
        for t in IMAGING_TOOLS
    },
    **{
        t: _make_pure_runner(
            t, _FIGURE_OK, _FIGURE_IMPORT_ERR,
            tools_figure.FIGURE_RUNNERS if tools_figure is not None else None,
            "tools_figure",
        )
        for t in FIGURE_TOOLS
    },
    **{
        t: _make_pure_runner(
            t, _GENOMICS_OK, _GENOMICS_IMPORT_ERR,
            tools_genomics.GENOMICS_RUNNERS if tools_genomics is not None else None,
            "tools_genomics",
        )
        for t in GENOMICS_TOOLS
    },
    "faircheck": _make_pure_runner(
        "faircheck", _FAIR_OK, _FAIR_IMPORT_ERR,
        tools_fair.FAIR_RUNNERS if tools_fair is not None else None, "tools_fair",
    ),
    "replicheck": _make_pure_runner(
        "replicheck", _REPLI_OK, _REPLI_IMPORT_ERR,
        tools_repli.REPLI_RUNNERS if tools_repli is not None else None, "tools_repli",
    ),
    "causaldesigner": _make_pure_runner(
        "causaldesigner", _CAUSAL_OK, _CAUSAL_IMPORT_ERR,
        tools_causal.CAUSAL_RUNNERS if tools_causal is not None else None, "tools_causal",
    ),
    "materialsfeaturizer": _make_pure_runner(
        "materialsfeaturizer", _MATERIALS_OK, _MATERIALS_IMPORT_ERR,
        tools_materials.MATERIALS_RUNNERS if tools_materials is not None else None, "tools_materials",
    ),
    "powerplan": _make_pure_runner(
        "powerplan", _POWER_OK, _POWER_IMPORT_ERR,
        tools_power.POWER_RUNNERS if tools_power is not None else None, "tools_power",
    ),
    "geosummary": _make_pure_runner(
        "geosummary", _GEO_OK, _GEO_IMPORT_ERR,
        tools_geo.GEO_RUNNERS if tools_geo is not None else None, "tools_geo",
    ),
    "mlreprocard": _make_pure_runner(
        "mlreprocard", _MLREPRO_OK, _MLREPRO_IMPORT_ERR,
        tools_mlrepro.MLREPRO_RUNNERS if tools_mlrepro is not None else None, "tools_mlrepro",
    ),
    "seqalign": _make_pure_runner(
        "seqalign", _SEQALIGN_OK, _SEQALIGN_IMPORT_ERR,
        tools_seqalign.SEQALIGN_RUNNERS if tools_seqalign is not None else None, "tools_seqalign",
    ),
    "stoichbalance": _make_pure_runner(
        "stoichbalance", _STOICH_OK, _STOICH_IMPORT_ERR,
        tools_stoich.STOICH_RUNNERS if tools_stoich is not None else None, "tools_stoich",
    ),
    "unitdimcheck": _make_pure_runner(
        "unitdimcheck", _UNITS_OK, _UNITS_IMPORT_ERR,
        tools_units.UNITS_RUNNERS if tools_units is not None else None, "tools_units",
    ),
    "survivalfit": _make_pure_runner(
        "survivalfit", _SURVIVAL_OK, _SURVIVAL_IMPORT_ERR,
        tools_survival.SURVIVAL_RUNNERS if tools_survival is not None else None, "tools_survival",
    ),
    "timeseriesforecast": _make_pure_runner(
        "timeseriesforecast", _FORECAST_OK, _FORECAST_IMPORT_ERR,
        tools_forecast.FORECAST_RUNNERS if tools_forecast is not None else None, "tools_forecast",
    ),
}


# --- the generic submit / status / result lifecycle ------------------------
def _dispatch(tool: str, payload: dict) -> dict:
    """Shared submit logic: spawn the runner, return the contract submit envelope."""
    if tool not in RUNNERS:
        raise HTTPException(404, f"unknown tool: {tool}")
    demo = tool in DEMO_TOOLS
    job = _new_job(tool, demo=demo)

    t = threading.Thread(target=RUNNERS[tool], args=(job, payload), daemon=True)
    t.start()
    t.join(timeout=INLINE_BUDGET_S)

    resp: dict[str, Any] = {
        "job_id": job.id,
        "tool": tool,
        "status": job.status,
        "mode": "inline" if not t.is_alive() else "async",
        "demo": demo,
        "submitted_at": job.submitted_at,
        "price": PRICE.get(tool, {"tier": "run", "usd": 0.0, "metered": False}),
    }
    job.mode = resp["mode"]
    if not t.is_alive() and job.status == "succeeded":
        resp["result"] = job.result  # fast path: UI can skip polling
    return resp


def _stage_upload(file: UploadFile) -> Optional[str]:
    """Persist an uploaded file to a temp path the runner can read; return path."""
    if file is None:
        return None
    d = Path(tempfile.mkdtemp(prefix="up_"))
    p = d / (file.filename or "upload.bin")
    p.write_bytes(file.file.read())
    # NOTE: the per-job tempdir cleanup leaves this staging dir; in v1 it is
    # small and short-lived. TODO(deploy): tie staging-dir lifetime to job TTL.
    return str(p)


# --- request models (JSON submit bodies) -----------------------------------
class LabBrainSubmit(BaseModel):
    author: str
    question: str


class ProteinScoutSubmit(BaseModel):
    input: str


class StabilitySubmit(BaseModel):
    sequence: str
    mode: str = "predict"          # "predict" | "scan"
    mutation: Optional[str] = None  # required for predict
    position: Optional[int] = None  # required for scan


class ScreenServerSubmit(BaseModel):
    smiles: str


class TrajMineSubmit(BaseModel):
    demo: str = "md"  # "md" | "static"


class PaperRadarSubmit(BaseModel):
    interests: str
    since_days: int = 540
    limit: int = 12


class GrantDraftSubmit(BaseModel):
    topic: str
    limit: int = 8


class MethodsMatcherSubmit(BaseModel):
    question: str


class ReviewGuardSubmit(BaseModel):
    claim: str
    papers: Optional[list[str]] = None
    limit: int = 12


# --- DNA/RNA cluster submit bodies ---
class RNAStructureSubmit(BaseModel):
    sequence: str


class GRNAOptimizerSubmit(BaseModel):
    sequence: str
    pam: str = "NGG"
    guide_len: int = 20
    limit: int = 20


class RNAFMEmbedsSubmit(BaseModel):
    sequence: str
    k: int = 3


# --- Neuroscience cluster submit bodies ---
class HHFitSubmit(BaseModel):
    # trace: JSON list of mV samples, or the string "demo" for a synthetic trace.
    trace: Any = "demo"
    current_pa: float = 100.0
    dt_ms: float = 0.1
    stim_onset_ms: Optional[float] = None


class SpikeFeaturesSubmit(BaseModel):
    # trace: JSON list of samples, or the string "demo" for a synthetic train.
    trace: Any = "demo"
    fs_hz: float = 30000.0
    thresh_mad: float = 5.0


# --- gap-research cluster submit bodies (ProtocolGPT / QuantumBioRAG /
#     ToxinChannelFinder / CitationGraph) ---
class ProtocolGPTSubmit(BaseModel):
    methods: str
    title: Optional[str] = None


class QuantumBioRAGSubmit(BaseModel):
    claim: str
    limit: int = 15


class ToxinChannelSubmit(BaseModel):
    toxin: str
    limit: int = 10


class CitationGraphSubmit(BaseModel):
    paper: str
    limit: int = 15


# --- imaging / mechanobiology cluster submit bodies ---
class CalciumTraceSubmit(BaseModel):
    # trace: JSON list of fluorescence samples, or "demo".
    trace: Any = "demo"
    fs_hz: float = 30.0
    baseline_window_s: float = 3.0
    thresh_mad: float = 3.0


class CellSegSubmit(BaseModel):
    # image: 2-D list-of-rows, or "demo".
    image: Any = "demo"
    min_distance: int = 5
    sigma: float = 1.0


class AFMCurveSubmit(BaseModel):
    # z + force: JSON lists (same length); or z="demo".
    z: Any = "demo"
    force: Optional[list[float]] = None
    radius_nm: float = 1000.0
    geometry: str = "sphere"  # "sphere" | "cone"


class TractionForceSubmit(BaseModel):
    # reference + deformed: 2-D lists (same shape); or reference="demo".
    reference: Any = "demo"
    deformed: Optional[list[list[float]]] = None
    window: int = 16
    step: int = 8
    search: int = 8


# --- FigureMiner submit body ---
class FigureMinerSubmit(BaseModel):
    # text: paper text, or "demo".
    text: str = "demo"


# --- genomics / sequence cluster submit bodies ---
class ChromatinAccessSubmit(BaseModel):
    sequence: str


class AggregatePredictSubmit(BaseModel):
    sequence: str


class ChannelDwellSubmit(BaseModel):
    # trace: JSON list of pA samples, or "demo".
    trace: Any = "demo"
    fs_hz: float = 10000.0


# --- all-field horizontal cluster submit bodies (FAIRCheck / RepliCheck) ---
class FAIRCheckSubmit(BaseModel):
    # record: a dict of metadata fields, a JSON string of the same, or "demo".
    record: Any = "demo"


class RepliCheckSubmit(BaseModel):
    # text: a Results section (string), or "demo".
    text: str = "demo"
    alpha: float = 0.05
    items: int = 1  # integer items averaged per mean (GRIM scale granularity)


# --- per-field NON-bio cluster submit bodies ---
class CausalDesignerSubmit(BaseModel):
    treatment: str = "demo"
    outcome: Optional[str] = None
    confounders: Any = None           # list[str] or comma string
    edges: Any = None                 # list[[from,to]] or "A->B, C->D" string
    design: Optional[str] = None
    instrument: Optional[str] = None
    demo: bool = False


class MaterialsFeaturizerSubmit(BaseModel):
    formula: str = "demo"             # e.g. "Fe2O3", or "demo"
    demo: bool = False


class PowerPlanSubmit(BaseModel):
    test: str = "two_sample_t"        # two_sample_t|one_sample_t|anova|two_proportion|correlation
    solve_for: str = "n"              # n|power|effect_size|alpha
    effect_size: Optional[float] = None
    alpha: float = 0.05
    power: float = 0.80
    n: Optional[float] = None
    tails: int = 2
    k_groups: int = 3
    p1: Optional[float] = None
    p2: Optional[float] = None
    ratio: float = 1.0
    demo: bool = False


class GeoSummarySubmit(BaseModel):
    values: Any = "demo"              # list[float] (NaN/None allowed) or "demo"
    times: Optional[list] = None
    period: Optional[int] = None
    lat: Optional[list[float]] = None
    lon: Optional[list[float]] = None
    demo: bool = False


class MLReproCardSubmit(BaseModel):
    # record: a dict of experiment fields, a JSON string, or "demo".
    record: Any = "demo"
    demo: bool = False


# --- per-field CLASSICAL-algorithm cluster submit bodies -------------------
class SeqAlignSubmit(BaseModel):
    seq_a: str = "demo"
    seq_b: Optional[str] = None
    mode: str = "global"            # "global" | "local"
    matrix: str = "auto"            # "blosum62" | "identity" | "auto"
    gap: Optional[int] = None
    match: int = 1
    mismatch: int = -1


class StoichBalanceSubmit(BaseModel):
    equation: str = "demo"          # e.g. "H2 + O2 -> H2O", or "demo"
    amounts: Optional[dict] = None  # {species: moles}
    amounts_g: Optional[dict] = None  # {species: grams}
    demo: bool = False


class UnitDimCheckSubmit(BaseModel):
    # `from` is a Python keyword; accept it from JSON via a field alias.
    model_config = {"populate_by_name": True}
    op: str = "demo"                # "convert" | "check" | "parse" | "demo"
    value: Optional[float] = None
    from_unit: Optional[str] = Field(default=None, alias="from")
    to: Optional[str] = None
    equation: Optional[str] = None
    unit: Optional[str] = None
    demo: bool = False


class SurvivalFitSubmit(BaseModel):
    durations: Any = "demo"         # list[float], or "demo"
    events: Optional[list] = None   # 0/1 list (default all events)
    groups: Optional[list] = None   # optional group labels (2 → log-rank)
    demo: bool = False


class TimeSeriesForecastSubmit(BaseModel):
    values: Any = "demo"            # list[float], or "demo"
    period: int = 0                 # seasonal period (0 = none)
    horizon: int = 6
    test: Optional[int] = None      # backtest holdout size
    demo: bool = False


# --- endpoints -------------------------------------------------------------
@app.get("/health")
def health() -> dict:
    return {
        "ok": True,
        "tools": ALL_TOOLS,
        "cpu": CPU_TOOLS,
        "rag": RAG_TOOLS,
        "dnarna": DNARNA_TOOLS,
        "neuro": NEURO_TOOLS,
        "protocol": PROTOCOL_TOOLS,
        "toxin": TOXIN_TOOLS,
        "citation": CITATION_TOOLS,
        "imaging": IMAGING_TOOLS,
        "figure": FIGURE_TOOLS,
        "genomics": GENOMICS_TOOLS,
        "horizontal": HORIZONTAL_TOOLS,
        "field": FIELD_TOOLS,
        "classic": CLASSIC_TOOLS,
        "demo": DEMO_TOOLS,
        "rag_backend": _RAG_OK,
        "dnarna_backend": _DNARNA_OK,
        "neuro_backend": _NEURO_OK,
        "protocol_backend": _PROTOCOL_OK,
        "toxin_backend": _TOXIN_OK,
        "citation_backend": _CITATION_OK,
        "imaging_backend": _IMAGING_OK,
        "figure_backend": _FIGURE_OK,
        "genomics_backend": _GENOMICS_OK,
        "fair_backend": _FAIR_OK,
        "repli_backend": _REPLI_OK,
        "causal_backend": _CAUSAL_OK,
        "materials_backend": _MATERIALS_OK,
        "power_backend": _POWER_OK,
        "geo_backend": _GEO_OK,
        "mlrepro_backend": _MLREPRO_OK,
        "seqalign_backend": _SEQALIGN_OK,
        "stoich_backend": _STOICH_OK,
        "units_backend": _UNITS_OK,
        "survival_backend": _SURVIVAL_OK,
        "forecast_backend": _FORECAST_OK,
        "version": "v1",
    }


@app.post("/v1/labbrain/submit")
def submit_labbrain(r: LabBrainSubmit) -> dict:
    if len((r.author or "").strip()) < 2:
        raise HTTPException(400, "author required")
    if len((r.question or "").strip()) < 5:
        raise HTTPException(400, "question too short")
    return _dispatch("labbrain", {"author": r.author.strip(), "question": r.question.strip()})


@app.post("/v1/proteinscout/submit")
def submit_proteinscout(r: ProteinScoutSubmit) -> dict:
    if not (r.input or "").strip():
        raise HTTPException(400, "input required (sequence or UniProt accession)")
    return _dispatch("proteinscout", {"input": r.input.strip()})


@app.post("/v1/stabilitydesigner/submit")
def submit_stabilitydesigner(r: StabilitySubmit) -> dict:
    if len(_seq(r.sequence)) < 5:
        raise HTTPException(400, "sequence too short")
    if r.mode == "predict" and not (r.mutation or "").strip():
        raise HTTPException(400, "mutation required for predict mode (e.g. A23V)")
    if r.mode == "scan" and not r.position:
        raise HTTPException(400, "position required for scan mode")
    return _dispatch("stabilitydesigner", {
        "sequence": r.sequence, "mode": r.mode,
        "mutation": r.mutation, "position": r.position,
    })


@app.post("/v1/screenserver/submit")
def submit_screenserver(r: ScreenServerSubmit) -> dict:
    if not (r.smiles or "").strip():
        raise HTTPException(400, "enter at least one SMILES")
    return _dispatch("screenserver", {"smiles": r.smiles})


@app.post("/v1/patchseqml/submit")
async def submit_patchseqml(file: UploadFile = File(None), mode: str = Form("sim")) -> dict:
    # multipart: optional ABF/NWB upload; default Hodgkin-Huxley simulation.
    file_path = _stage_upload(file) if file is not None else None
    return _dispatch("patchseqml", {"mode": mode, "file_path": file_path})


@app.post("/v1/trajmine/submit")
def submit_trajmine(r: TrajMineSubmit) -> dict:
    # DEMO ONLY (no GPU). TODO(deploy): real MD via GPU worker + uploaded traj.
    return _dispatch("trajmine", {"demo": r.demo})


@app.post("/v1/cryotriage/submit")
async def submit_cryotriage(file: UploadFile = File(None)) -> dict:
    # DEMO/synthetic by default (no GPU). An uploaded micrograph still runs the
    # CPU triage path. TODO(deploy): real GPU cryo-EM triage worker.
    file_path = _stage_upload(file) if file is not None else None
    return _dispatch("cryotriage", {"file_path": file_path})


# --- T1 RAG/agent/data submit endpoints ------------------------------------
@app.post("/v1/paperradar/submit")
def submit_paperradar(r: PaperRadarSubmit) -> dict:
    if len((r.interests or "").strip()) < 3:
        raise HTTPException(400, "interests required (a few topics/keywords)")
    return _dispatch("paperradar", {
        "interests": r.interests.strip(), "since_days": r.since_days, "limit": r.limit,
    })


@app.post("/v1/grantdraft/submit")
def submit_grantdraft(r: GrantDraftSubmit) -> dict:
    if len((r.topic or "").strip()) < 4:
        raise HTTPException(400, "topic required")
    return _dispatch("grantdraft", {"topic": r.topic.strip(), "limit": r.limit})


@app.post("/v1/methodsmatcher/submit")
def submit_methodsmatcher(r: MethodsMatcherSubmit) -> dict:
    if len((r.question or "").strip()) < 8:
        raise HTTPException(400, "ask a research question (>= 8 chars)")
    return _dispatch("methodsmatcher", {"question": r.question.strip()})


@app.post("/v1/reviewguard/submit")
def submit_reviewguard(r: ReviewGuardSubmit) -> dict:
    if len((r.claim or "").strip()) < 8:
        raise HTTPException(400, "claim required (>= 8 chars)")
    return _dispatch("reviewguard", {
        "claim": r.claim.strip(), "papers": r.papers or [], "limit": r.limit,
    })


# --- DNA/RNA cluster submit endpoints --------------------------------------
@app.post("/v1/rnastructure/submit")
def submit_rnastructure(r: RNAStructureSubmit) -> dict:
    if len((r.sequence or "").strip()) < 4:
        raise HTTPException(400, "sequence required (>= 4 nt)")
    return _dispatch("rnastructure", {"sequence": r.sequence})


@app.post("/v1/grnaoptimizer/submit")
def submit_grnaoptimizer(r: GRNAOptimizerSubmit) -> dict:
    if len((r.sequence or "").strip()) < 23:
        raise HTTPException(400, "target DNA too short (need ~23 nt)")
    return _dispatch("grnaoptimizer", {
        "sequence": r.sequence, "pam": r.pam, "guide_len": r.guide_len, "limit": r.limit,
    })


@app.post("/v1/rnafmembeds/submit")
def submit_rnafmembeds(r: RNAFMEmbedsSubmit) -> dict:
    if len((r.sequence or "").strip()) < 4:
        raise HTTPException(400, "sequence required (>= 4 nt)")
    return _dispatch("rnafmembeds", {"sequence": r.sequence, "k": r.k})


# --- Neuroscience cluster submit endpoints ---------------------------------
@app.post("/v1/hhfit/submit")
def submit_hhfit(r: HHFitSubmit) -> dict:
    return _dispatch("hhfit", {
        "trace": r.trace, "current_pa": r.current_pa,
        "dt_ms": r.dt_ms, "stim_onset_ms": r.stim_onset_ms,
    })


@app.post("/v1/spikefeatures/submit")
def submit_spikefeatures(r: SpikeFeaturesSubmit) -> dict:
    return _dispatch("spikefeatures", {
        "trace": r.trace, "fs_hz": r.fs_hz, "thresh_mad": r.thresh_mad,
    })


# --- gap-research cluster submit endpoints ---------------------------------
@app.post("/v1/protocolgpt/submit")
def submit_protocolgpt(r: ProtocolGPTSubmit) -> dict:
    if len((r.methods or "").strip()) < 15:
        raise HTTPException(400, "paste a methods/SOP description (>= 15 chars)")
    return _dispatch("protocolgpt", {"methods": r.methods.strip(), "title": (r.title or "").strip()})


@app.post("/v1/quantumbiorag/submit")
def submit_quantumbiorag(r: QuantumBioRAGSubmit) -> dict:
    if len((r.claim or "").strip()) < 8:
        raise HTTPException(400, "state a quantum-biology claim (>= 8 chars)")
    return _dispatch("quantumbiorag", {"claim": r.claim.strip(), "limit": r.limit})


@app.post("/v1/toxinchannelfinder/submit")
def submit_toxinchannelfinder(r: ToxinChannelSubmit) -> dict:
    if len((r.toxin or "").strip()) < 3:
        raise HTTPException(400, "enter a toxin/peptide name or sequence (>= 3 chars)")
    return _dispatch("toxinchannelfinder", {"toxin": r.toxin.strip(), "limit": r.limit})


@app.post("/v1/citationgraph/submit")
def submit_citationgraph(r: CitationGraphSubmit) -> dict:
    if len((r.paper or "").strip()) < 4:
        raise HTTPException(400, "enter a DOI, OpenAlex ID, or paper title")
    return _dispatch("citationgraph", {"paper": r.paper.strip(), "limit": r.limit})


# --- imaging / mechanobiology cluster submit endpoints ---------------------
def _is_demo(v: Any) -> bool:
    return isinstance(v, str) and v.strip().lower() == "demo"


@app.post("/v1/calciumtraceml/submit")
def submit_calciumtraceml(r: CalciumTraceSubmit) -> dict:
    if not _is_demo(r.trace) and not (isinstance(r.trace, (list, tuple)) and len(r.trace) > 0):
        raise HTTPException(400, 'trace must be a numeric array or the string "demo"')
    return _dispatch("calciumtraceml", {
        "trace": r.trace, "fs_hz": r.fs_hz,
        "baseline_window_s": r.baseline_window_s, "thresh_mad": r.thresh_mad,
    })


@app.post("/v1/cellsegtrack/submit")
def submit_cellsegtrack(r: CellSegSubmit) -> dict:
    if not _is_demo(r.image) and not (isinstance(r.image, (list, tuple)) and len(r.image) > 0):
        raise HTTPException(400, 'image must be a 2-D array or the string "demo"')
    return _dispatch("cellsegtrack", {
        "image": r.image, "min_distance": r.min_distance, "sigma": r.sigma,
    })


@app.post("/v1/afmcurveml/submit")
def submit_afmcurveml(r: AFMCurveSubmit) -> dict:
    if not _is_demo(r.z):
        if not (isinstance(r.z, (list, tuple)) and r.force):
            raise HTTPException(400, 'provide z + force arrays, or z="demo"')
    if r.geometry not in ("sphere", "cone"):
        raise HTTPException(400, "geometry must be 'sphere' or 'cone'")
    return _dispatch("afmcurveml", {
        "z": r.z, "force": r.force, "radius_nm": r.radius_nm, "geometry": r.geometry,
    })


@app.post("/v1/tractionforceml/submit")
def submit_tractionforceml(r: TractionForceSubmit) -> dict:
    if not _is_demo(r.reference):
        if not (isinstance(r.reference, (list, tuple)) and r.deformed):
            raise HTTPException(400, 'provide reference + deformed images, or reference="demo"')
    return _dispatch("tractionforceml", {
        "reference": r.reference, "deformed": r.deformed,
        "window": r.window, "step": r.step, "search": r.search,
    })


# --- FigureMiner submit endpoint -------------------------------------------
@app.post("/v1/figureminer/submit")
def submit_figureminer(r: FigureMinerSubmit) -> dict:
    if not _is_demo(r.text) and len((r.text or "").strip()) < 20:
        raise HTTPException(400, 'paste paper text (>= 20 chars) or use "demo"')
    return _dispatch("figureminer", {"text": r.text})


# --- genomics / sequence cluster submit endpoints --------------------------
@app.post("/v1/chromatinaccess/submit")
def submit_chromatinaccess(r: ChromatinAccessSubmit) -> dict:
    if not _is_demo(r.sequence) and len(_seq(r.sequence)) < 20:
        raise HTTPException(400, 'enter a DNA sequence (>= 20 nt) or "demo"')
    return _dispatch("chromatinaccess", {"sequence": r.sequence})


@app.post("/v1/aggregatepredict/submit")
def submit_aggregatepredict(r: AggregatePredictSubmit) -> dict:
    if not _is_demo(r.sequence) and len(_seq(r.sequence)) < 7:
        raise HTTPException(400, 'enter a protein sequence (>= 7 aa) or "demo"')
    return _dispatch("aggregatepredict", {"sequence": r.sequence})


@app.post("/v1/channeldwell/submit")
def submit_channeldwell(r: ChannelDwellSubmit) -> dict:
    if not _is_demo(r.trace) and not (isinstance(r.trace, (list, tuple)) and len(r.trace) > 0):
        raise HTTPException(400, 'trace must be a numeric array or the string "demo"')
    return _dispatch("channeldwell", {"trace": r.trace, "fs_hz": r.fs_hz})


# --- all-field horizontal cluster submit endpoints (FAIRCheck / RepliCheck) -
@app.post("/v1/faircheck/submit")
def submit_faircheck(r: FAIRCheckSubmit) -> dict:
    rec = r.record
    if _is_demo(rec):
        return _dispatch("faircheck", {"record": "demo"})
    if isinstance(rec, dict):
        if not rec:
            raise HTTPException(400, "record is empty — supply at least one metadata field")
        return _dispatch("faircheck", {"record": rec})
    if isinstance(rec, str):
        if len(rec.strip()) < 2:
            raise HTTPException(400, 'provide a metadata record (JSON object or fields), or "demo"')
        return _dispatch("faircheck", {"record": rec})
    raise HTTPException(400, 'record must be a metadata object, a JSON string, or "demo"')


@app.post("/v1/replicheck/submit")
def submit_replicheck(r: RepliCheckSubmit) -> dict:
    if not _is_demo(r.text) and len((r.text or "").strip()) < 8:
        raise HTTPException(400, 'paste a Results section with reported statistics, or use "demo"')
    return _dispatch("replicheck", {"text": r.text, "alpha": r.alpha, "items": r.items})


# --- per-field NON-bio cluster submit endpoints ----------------------------
@app.post("/v1/causaldesigner/submit")
def submit_causaldesigner(r: CausalDesignerSubmit) -> dict:
    demo = r.demo or _is_demo(r.treatment)
    if not demo:
        if len((r.treatment or "").strip()) < 1 or not (r.outcome or "").strip():
            raise HTTPException(400, "treatment and outcome are required (or use demo)")
    return _dispatch("causaldesigner", {
        "treatment": r.treatment, "outcome": r.outcome, "confounders": r.confounders,
        "edges": r.edges, "design": r.design, "instrument": r.instrument, "demo": demo,
    })


@app.post("/v1/materialsfeaturizer/submit")
def submit_materialsfeaturizer(r: MaterialsFeaturizerSubmit) -> dict:
    demo = r.demo or _is_demo(r.formula)
    if not demo and len((r.formula or "").strip()) < 1:
        raise HTTPException(400, 'enter a chemical formula (e.g. "Fe2O3"), or use demo')
    return _dispatch("materialsfeaturizer", {"formula": r.formula, "demo": demo})


@app.post("/v1/powerplan/submit")
def submit_powerplan(r: PowerPlanSubmit) -> dict:
    demo = r.demo or _is_demo(r.test)
    return _dispatch("powerplan", {
        "test": r.test, "solve_for": r.solve_for, "effect_size": r.effect_size,
        "alpha": r.alpha, "power": r.power, "n": r.n, "tails": r.tails,
        "k_groups": r.k_groups, "p1": r.p1, "p2": r.p2, "ratio": r.ratio, "demo": demo,
    })


@app.post("/v1/geosummary/submit")
def submit_geosummary(r: GeoSummarySubmit) -> dict:
    demo = r.demo or _is_demo(r.values)
    if not demo and not (isinstance(r.values, (list, tuple)) and len(r.values) > 0):
        raise HTTPException(400, 'values must be a non-empty numeric array, or use demo')
    return _dispatch("geosummary", {
        "values": r.values, "times": r.times, "period": r.period,
        "lat": r.lat, "lon": r.lon, "demo": demo,
    })


@app.post("/v1/mlreprocard/submit")
def submit_mlreprocard(r: MLReproCardSubmit) -> dict:
    rec = r.record
    demo = r.demo or _is_demo(rec)
    if not demo:
        if isinstance(rec, dict):
            if not rec:
                raise HTTPException(400, "record is empty — supply at least one experiment field")
        elif isinstance(rec, str):
            if len(rec.strip()) < 2:
                raise HTTPException(400, 'provide an experiment record (JSON object or fields), or "demo"')
        else:
            raise HTTPException(400, 'record must be an experiment object, a JSON string, or "demo"')
    return _dispatch("mlreprocard", {"record": rec, "demo": demo})


# --- per-field CLASSICAL-algorithm cluster submit endpoints ----------------
@app.post("/v1/seqalign/submit")
def submit_seqalign(r: SeqAlignSubmit) -> dict:
    demo = _is_demo(r.seq_a)
    if not demo:
        if len((r.seq_a or "").strip()) < 1 or len((r.seq_b or "").strip()) < 1:
            raise HTTPException(400, "provide two sequences (seq_a, seq_b), or use demo")
    return _dispatch("seqalign", {
        "seq_a": r.seq_a, "seq_b": r.seq_b, "mode": r.mode, "matrix": r.matrix,
        "gap": r.gap, "match": r.match, "mismatch": r.mismatch,
    })


@app.post("/v1/stoichbalance/submit")
def submit_stoichbalance(r: StoichBalanceSubmit) -> dict:
    demo = r.demo or _is_demo(r.equation)
    if not demo and len((r.equation or "").strip()) < 3:
        raise HTTPException(400, 'enter a chemical equation (e.g. "H2 + O2 -> H2O"), or use demo')
    return _dispatch("stoichbalance", {
        "equation": r.equation, "amounts": r.amounts, "amounts_g": r.amounts_g, "demo": demo,
    })


@app.post("/v1/unitdimcheck/submit")
def submit_unitdimcheck(r: UnitDimCheckSubmit) -> dict:
    demo = r.demo or (r.op or "").strip().lower() == "demo"
    op = (r.op or "").strip().lower()
    if not demo:
        if op not in ("convert", "check", "parse"):
            raise HTTPException(400, 'op must be "convert", "check", "parse", or use demo')
        if op == "convert" and (r.value is None or not (r.from_unit or "").strip() or not (r.to or "").strip()):
            raise HTTPException(400, "convert needs value, from, and to")
        if op == "check" and not (r.equation or "").strip():
            raise HTTPException(400, "check needs an equation (e.g. 'N = kg*m/s^2')")
        if op == "parse" and not (r.unit or "").strip():
            raise HTTPException(400, "parse needs a unit string")
    return _dispatch("unitdimcheck", {
        "op": r.op, "value": r.value, "from": r.from_unit, "to": r.to,
        "equation": r.equation, "unit": r.unit, "demo": demo,
    })


@app.post("/v1/survivalfit/submit")
def submit_survivalfit(r: SurvivalFitSubmit) -> dict:
    demo = r.demo or _is_demo(r.durations)
    if not demo and not (isinstance(r.durations, (list, tuple)) and len(r.durations) >= 2):
        raise HTTPException(400, "durations must be a numeric array (length >= 2), or use demo")
    return _dispatch("survivalfit", {
        "durations": r.durations, "events": r.events, "groups": r.groups, "demo": demo,
    })


@app.post("/v1/timeseriesforecast/submit")
def submit_timeseriesforecast(r: TimeSeriesForecastSubmit) -> dict:
    demo = r.demo or _is_demo(r.values)
    if not demo and not (isinstance(r.values, (list, tuple)) and len(r.values) >= 4):
        raise HTTPException(400, "values must be a numeric array (length >= 4), or use demo")
    return _dispatch("timeseriesforecast", {
        "values": r.values, "period": r.period, "horizon": r.horizon, "test": r.test, "demo": demo,
    })


def _status_envelope(job: Job) -> dict:
    return {
        "job_id": job.id,
        "tool": job.tool,
        "status": job.status,
        "progress": None,  # best-effort; tools have no fine-grained progress
        "queue_position": None,
        "demo": job.demo,
        "submitted_at": job.submitted_at,
        "started_at": job.started_at,
        "finished_at": job.finished_at,
        "log_tail": job.log_tail,
        "error": job.error,
    }


@app.get("/v1/jobs/{job_id}")
def job_status(job_id: str) -> dict:
    return _status_envelope(_get_job(job_id))


@app.get("/v1/jobs/{job_id}/result")
def job_result(job_id: str) -> dict:
    job = _get_job(job_id)
    if job.status == "failed":
        raise HTTPException(500, job.error.get("message", "job failed") if job.error else "job failed")
    if job.status != "succeeded" or job.result is None:
        raise HTTPException(409, f"not ready (status={job.status})")
    return job.result
