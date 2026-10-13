from __future__ import annotations

import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
REPORT = os.path.join(ROOT, "output", "solvability-frontier", "report")
PAGE_DATA = os.path.join(ROOT, "src", "lib", "research-os", "solvability-frontier-report-data.json")

BRANCH_COLOR = {
    "mathematics": "#1f6f78",
    "physics": "#8a5fb0",
    "chemistry": "#c9833f",
    "information": "#2f5fa8",
    "biophysics": "#4d9a6a",
    "cosmology": "#b0486b",
    "mind": "#a3923a",
    "bucketmath": "#8b8b84",
    "applied": "#6b6b6b",
}


def load(name: str) -> dict:
    with open(os.path.join(REPORT, name)) as f:
        return json.load(f)


def page_data() -> dict:
    with open(PAGE_DATA) as f:
        return json.load(f)


def deterministic_pdf(fig, out: str) -> None:
    fig.savefig(out, metadata={"CreationDate": None, "Producer": None, "Creator": None})
