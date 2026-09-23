#!/usr/bin/env python3
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

BASE = Path(
    os.environ.get(
        "TOOLS_REPO_DIR",
        str(Path.home() / "agfarms" / "biophysics-phd-review"),
    )
).resolve()
PY = sys.executable
ENV = {**os.environ, "HSA_OVERRIDE_GFX_VERSION": "11.0.0"}

INLINE_BUDGET_S = float(os.environ.get("LABBRAIN_INLINE_BUDGET_S", "30"))

app = FastAPI(title="research-tools-gateway", version="v1-labbrain")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()

class Job:
    __slots__ = (
        "id", "tool", "status", "submitted_at", "started_at", "finished_at",
        "log_tail", "error", "result", "mode",
    )

    def __init__(self, job_id: str, tool: str) -> None:
        self.id = job_id
        self.tool = tool
        self.status = "queued"
        self.submitted_at = _now()
        self.started_at: Optional[str] = None
        self.finished_at: Optional[str] = None
        self.log_tail: str = ""
        self.error: Optional[dict] = None
        self.result: Optional[dict] = None
        self.mode = "inline"

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

def _run_labbrain(job: Job, author: str, question: str) -> None:
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
            "canon_candidate": True,
            "canon_tier": "derived",
        }
        job.status = "succeeded"
        job.finished_at = _now()
    except subprocess.TimeoutExpired:
        job.status = "failed"
        job.error = {"code": "timeout", "message": "labbrain run exceeded its time budget"}
        job.finished_at = _now()
    except Exception as e:
        job.status = "failed"
        job.error = {"code": "internal", "message": str(e)[:200]}
        job.finished_at = _now()

class LabBrainSubmit(BaseModel):
    author: str
    question: str

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

    t = threading.Thread(target=_run_labbrain, args=(job, author, question), daemon=True)
    t.start()
    t.join(timeout=INLINE_BUDGET_S)

    resp: dict[str, Any] = {
        "job_id": job.id,
        "tool": "labbrain",
        "status": job.status,
        "mode": "inline" if not t.is_alive() else "async",
        "submitted_at": job.submitted_at,
        "price": {"tier": "ask", "usd": 0.0, "metered": False},
    }
    job.mode = resp["mode"]
    if not t.is_alive() and job.status == "succeeded":
        resp["result"] = job.result
    return resp

def _status_envelope(job: Job) -> dict:
    return {
        "job_id": job.id,
        "tool": job.tool,
        "status": job.status,
        "progress": None,
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
