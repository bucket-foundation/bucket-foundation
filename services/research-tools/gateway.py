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
from pydantic import BaseModel

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
ALL_TOOLS = CPU_TOOLS + DEMO_TOOLS

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
}

app = FastAPI(title="research-tools-gateway", version="v1")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # the Next proxy is the only intended caller
    allow_methods=["*"],
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


RUNNERS: dict[str, Callable[[Job, dict], None]] = {
    "labbrain": _run_labbrain,
    "proteinscout": _run_proteinscout,
    "stabilitydesigner": _run_stabilitydesigner,
    "screenserver": _run_screenserver,
    "patchseqml": _run_patchseqml,
    "trajmine": _run_trajmine,
    "cryotriage": _run_cryotriage,
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


# --- endpoints -------------------------------------------------------------
@app.get("/health")
def health() -> dict:
    return {"ok": True, "tools": ALL_TOOLS, "cpu": CPU_TOOLS, "demo": DEMO_TOOLS, "version": "v1"}


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
