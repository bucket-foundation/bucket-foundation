#!/usr/bin/env python3
"""
research-tools gateway — FIRST SLICE: LabBrain
==============================================

Implements the v1 research-tools job contract (see
bucket-foundation/docs/research-tools/04-implementation-architecture.md §2) for a
single tool, LabBrain, so the full submit→poll→result→publish path can be proven
end-to-end before the other six tools and the real queue/worker plane land.

It reuses the EXACT validation + subprocess logic from the existing all-tools
wrapper (`biophysics-phd-review/tools_api/app.py:/labbrain/ask`) — CPU device,
`build` then `ask` — but wraps it in a job table so the inline-vs-async lifecycle
is real and matches the contract every other tool will use.

Endpoints:
  GET  /health                       -> { ok, tools }
  POST /v1/labbrain/submit           -> { job_id, status, mode, ... }
  GET  /v1/jobs/{job_id}             -> status envelope
  GET  /v1/jobs/{job_id}/result      -> { render:"json", output:{author,question,answer}, ... }

Run (matches the Polingual API pattern — systemd --user on the box, nginx + TLS
in front at research-tools.agfarms.dev):
  uvicorn labbrain_gateway:app --host 127.0.0.1 --port 8732

TODO (full gateway, separate bead):
  * Swap the in-memory JOBS dict for Redis/RQ + a Supabase `bucket.research_jobs`
    mirror (durable job records).  The in-memory table here is intentionally
    low-ceremony and proves the contract only.
  * Fold the other six tools in (port the rest of tools_api/app.py into this
    contract: proteinscout, screenserver, stabilitydesigner, trajmine,
    patchseqml, cryotriage).  Heavy tools (trajmine/cryotriage) enqueue instead
    of running inline.
  * Object-store / Walrus artifact storage for large outputs.
"""
from __future__ import annotations

import os
import re
import subprocess
import sys
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, HTTPException
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
PY = sys.executable
# ROCm hang guard: LabBrain embeds on CPU by default (see labbrain/README.md).
ENV = {**os.environ, "HSA_OVERRIDE_GFX_VERSION": "11.0.0"}

# Inline-vs-async threshold. A cache HIT build + ask completes well under this;
# a cold build (fetch + embed a whole corpus) can exceed it, in which case the
# job is reported as async and the client polls. Kept simple for the slice: we
# run synchronously in a worker thread and flip mode based on observed time.
INLINE_BUDGET_S = float(os.environ.get("LABBRAIN_INLINE_BUDGET_S", "30"))

app = FastAPI(title="research-tools-gateway", version="v1-labbrain")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # the Next proxy is the only intended caller; keep open for health checks
    allow_methods=["*"],
    allow_headers=["*"],
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# --- job table (in-memory; TODO Redis/RQ + Supabase) ----------------------
class Job:
    __slots__ = (
        "id", "tool", "status", "submitted_at", "started_at", "finished_at",
        "log_tail", "error", "result", "mode",
    )

    def __init__(self, job_id: str, tool: str) -> None:
        self.id = job_id
        self.tool = tool
        self.status = "queued"           # queued | running | succeeded | failed
        self.submitted_at = _now()
        self.started_at: Optional[str] = None
        self.finished_at: Optional[str] = None
        self.log_tail: str = ""
        self.error: Optional[dict] = None
        self.result: Optional[dict] = None
        self.mode = "inline"             # inline | async


JOBS: dict[str, Job] = {}
_LOCK = threading.Lock()


def _new_job(tool: str) -> Job:
    job_id = "j_" + uuid.uuid4().hex[:20]
    job = Job(job_id, tool)
    with _LOCK:
        JOBS[job_id] = job
    return job


def _get_job(job_id: str) -> Job:
    with _LOCK:
        job = JOBS.get(job_id)
    if not job:
        raise HTTPException(404, "unknown job_id")
    return job


# --- LabBrain runner (ported verbatim from tools_api/app.py) ---------------
def _run_labbrain(job: Job, author: str, question: str) -> None:
    """Build the PI corpus (CPU) then ask. Mirrors app.py:/labbrain/ask."""
    job.status = "running"
    job.started_at = _now()
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
            job.status = "failed"
            job.error = {
                "code": "corpus_build_failed",
                "message": f"could not build corpus for '{author}' ({b.stdout[-160:]})",
            }
            job.finished_at = _now()
            return

        a = subprocess.run(
            [PY, "labbrain.py", "--device", "cpu", "ask", question],
            cwd=str(lb), capture_output=True, text=True, timeout=150, env=ENV,
        )
        job.log_tail = a.stdout[-500:]
        if not a.stdout.strip():
            job.status = "failed"
            job.error = {
                "code": "no_answer",
                "message": f"no answer ({a.stderr[-160:]})",
            }
            job.finished_at = _now()
            return

        job.result = {
            "job_id": job.id,
            "tool": "labbrain",
            "render": "json",
            "output": {
                "author": author,
                "question": question,
                "answer": a.stdout.strip(),
            },
            "artifacts": [],
            "provenance": [
                {"action": "run", "tool": "labbrain", "at": _now(), "by": "tools-gateway/v1"}
            ],
            # Tool output is a DERIVED analysis (downstream application), not a
            # canon axiom — publishable, but tagged derived. See doc §5.
            "canon_candidate": True,
            "canon_tier": "derived",
        }
        job.status = "succeeded"
        job.finished_at = _now()
    except subprocess.TimeoutExpired:
        job.status = "failed"
        job.error = {"code": "timeout", "message": "labbrain run exceeded its time budget"}
        job.finished_at = _now()
    except Exception as e:  # never leave a job stuck in running
        job.status = "failed"
        job.error = {"code": "internal", "message": str(e)[:200]}
        job.finished_at = _now()


# --- request models --------------------------------------------------------
class LabBrainSubmit(BaseModel):
    author: str
    question: str


# --- endpoints -------------------------------------------------------------
@app.get("/health")
def health() -> dict:
    return {"ok": True, "tools": ["labbrain"], "version": "v1-labbrain"}


@app.post("/v1/labbrain/submit")
def submit(r: LabBrainSubmit) -> dict:
    author = (r.author or "").strip()
    question = (r.question or "").strip()
    if len(author) < 2:
        raise HTTPException(400, "author required")
    if len(question) < 5:
        raise HTTPException(400, "question too short")

    job = _new_job("labbrain")

    # Run in a worker thread. If it finishes within the inline budget we return
    # the result immediately (mode=inline); otherwise the client polls
    # (mode=async). Either way a job_id exists and the result is fetchable.
    t = threading.Thread(target=_run_labbrain, args=(job, author, question), daemon=True)
    t.start()
    t.join(timeout=INLINE_BUDGET_S)

    resp: dict[str, Any] = {
        "job_id": job.id,
        "tool": "labbrain",
        "status": job.status,
        "mode": "inline" if not t.is_alive() else "async",
        "submitted_at": job.submitted_at,
        # price block travels from day one (zeroed); metering seam is in the
        # Next proxy, not here — the gateway stays payment-agnostic.
        "price": {"tier": "ask", "usd": 0.0, "metered": False},
    }
    job.mode = resp["mode"]
    if not t.is_alive() and job.status == "succeeded":
        resp["result"] = job.result  # let the UI skip the poll on the fast path
    return resp


def _status_envelope(job: Job) -> dict:
    return {
        "job_id": job.id,
        "tool": job.tool,
        "status": job.status,
        "progress": None,  # best-effort; labbrain has no fine-grained progress
        "queue_position": None,
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
