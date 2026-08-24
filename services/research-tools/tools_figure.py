#!/usr/bin/env python3
"""
research-tools, FigureMiner (REAL logic, CPU, no GPU)
=====================================================

A FUNCTIONAL backend for FigureMiner (54-tool needs map: "extracts data
points/numbers/structures FROM figures in PDFs into a queryable DB"). This v1
mines a paper's *text layer*, figure/table captions, reported statistics, and
numeric data, with real parsing, no network and no GPU.

Honesty note (matches the project's pattern): the CSV flags FigureMiner as
gpu_needed=y because *pixel-level* plot-point extraction from raster figures
needs a vision model. That vision stage is a documented GPU/ML extension. What
ships here is the REAL, non-GPU, high-value half that is fully deterministic:

 * caption extraction, "Figure N." / "Table N." blocks with their text
 * reported-statistics miner, p-values, n=, CI, r/R²/ρ, ± SD/SE, %, fold-change
 * numeric-data miner, measurements with units (nm, kDa, µM, ms, °C, …)
 * per-figure stat linkage, which stats co-occur in which figure's caption

Input is a PDF (when PyMuPDF/pypdf is available) OR raw pasted text, so the v1
JSON contract holds and the same logic unit-tests on a known string with zero
dependencies on a PDF being present.

The gateway imports FIGURE_RUNNERS from here.
"""
from __future__ import annotations

import re
from collections import Counter
from typing import Any, Optional

# PDF text extraction is optional; raw-text input always works. PyMuPDF (fitz)
# preferred, pypdf fallback. Reported in the output.
try:
    import fitz  # type: ignore # PyMuPDF

    _FITZ_OK = True
except Exception:  # pragma: no cover - import guard
    _FITZ_OK = False
try:
    import pypdf  # type: ignore

    _PYPDF_OK = True
except Exception:  # pragma: no cover - import guard
    _PYPDF_OK = False


# --- regex library (real, tested patterns) ---------------------------------
_UNIT = r"(?:nm|µm|um|mm|cm|Å|kDa|Da|kbp|bp|µM|uM|nM|mM|pM|M|ms|µs|us|ns|s|min|h|Hz|kHz|°C|K|kcal/mol|kJ/mol|pN|nN|kPa|MPa|GPa|%)"
_NUM = r"[-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?"

RE_FIGURE = re.compile(r"(?:^|\n)\s*(Figure|Fig\.?|Table|Scheme)\s*([0-9]+|[IVX]+)[\.:\)]?\s*", re.I)
RE_PVALUE = re.compile(r"\bp\s*([<>=≤≥]+)\s*(" + _NUM + r")", re.I)
RE_N = re.compile(r"\bn\s*=\s*(\d+)", re.I)
RE_CI = re.compile(r"\b(\d{1,3})\s*%\s*CI\b", re.I)
RE_R2 = re.compile(r"\bR\s*\^?2\b\s*=?\s*(" + _NUM + r")", re.I)
RE_R = re.compile(r"\b(?:r|ρ|rho)\s*=\s*(" + _NUM + r")")
RE_PM = re.compile(r"(" + _NUM + r")\s*(?:±|\+/-|\+-)\s*(" + _NUM + r")")
RE_FOLD = re.compile(r"(" + _NUM + r")\s*[- ]?fold", re.I)
RE_MEASURE = re.compile(r"(" + _NUM + r")\s*(" + _UNIT + r")\b")


def extract_text_from_pdf(path: str) -> tuple[Optional[str], str]:
    """Extract the text layer of a PDF. Returns (text, backend)."""
    if _FITZ_OK:
        try:
            doc = fitz.open(path)
            txt = "\n".join(page.get_text() for page in doc)
            doc.close()
            return txt, "pymupdf"
        except Exception as e:  # pragma: no cover - file guard
            return None, f"pymupdf-failed:{str(e)[:60]}"
    if _PYPDF_OK:
        try:
            reader = pypdf.PdfReader(path)
            txt = "\n".join((pg.extract_text() or "") for pg in reader.pages)
            return txt, "pypdf"
        except Exception as e:  # pragma: no cover - file guard
            return None, f"pypdf-failed:{str(e)[:60]}"
    return None, "no-pdf-backend"


def mine_captions(text: str) -> list[dict]:
    """Extract Figure/Table/Scheme caption blocks. Pure.

 A caption runs from the label to the next blank-line-separated paragraph or
 the next figure label, whichever comes first.
    """
    out: list[dict] = []
    matches = list(RE_FIGURE.finditer(text))
    for i, m in enumerate(matches):
        kind = m.group(1).rstrip(".").title().replace("Fig", "Figure")
        if kind.startswith("Figure"):
            kind = "Figure"
        num = m.group(2)
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = text[start:end].strip()
        # cap caption length (a caption rarely runs >800 chars before the next para)
        para = re.split(r"\n\s*\n", body, maxsplit=1)[0].strip()
        caption = (para or body)[:800]
        out.append({"kind": kind, "number": num, "caption": caption})
    return out


def mine_stats(text: str) -> dict:
    """Mine reported statistics from text. Pure. Returns counts + samples."""
    pvals = [{"op": op, "value": val} for op, val in RE_PVALUE.findall(text)]
    ns = [int(x) for x in RE_N.findall(text)]
    cis = [int(x) for x in RE_CI.findall(text)]
    r2s = [float(x) for x in RE_R2.findall(text)]
    rs = [float(x) for x in RE_R.findall(text)]
    pms = [{"mean": float(a), "spread": float(b)} for a, b in RE_PM.findall(text)]
    folds = [float(x) for x in RE_FOLD.findall(text)]
    return {
        "p_values": pvals[:100],
        "sample_sizes": ns[:100],
        "confidence_intervals_pct": cis[:50],
        "r_squared": r2s[:50],
        "correlations_r": rs[:50],
        "mean_pm_spread": pms[:100],
        "fold_changes": folds[:50],
        "counts": {
            "p_values": len(pvals),
            "sample_sizes": len(ns),
            "confidence_intervals": len(cis),
            "r_squared": len(r2s),
            "correlations": len(rs),
            "mean_pm_spread": len(pms),
            "fold_changes": len(folds),
        },
    }


def mine_measurements(text: str) -> dict:
    """Mine numeric measurements with units. Pure. Groups by unit."""
    rows = [{"value": float(v), "unit": u} for v, u in RE_MEASURE.findall(text)]
    by_unit = Counter(r["unit"] for r in rows)
    return {
        "measurements": rows[:300],
        "n_measurements": len(rows),
        "by_unit": dict(by_unit.most_common()),
    }


def link_stats_to_figures(captions: list[dict]) -> list[dict]:
    """For each caption, mine the stats it contains (the queryable linkage). Pure."""
    out: list[dict] = []
    for c in captions:
        s = mine_stats(c["caption"])
        meas = mine_measurements(c["caption"])
        if any(s["counts"].values()) or meas["n_measurements"]:
            out.append(
                {
                    "figure": f"{c['kind']} {c['number']}",
                    "n_stats": sum(s["counts"].values()),
                    "n_measurements": meas["n_measurements"],
                    "p_values": s["p_values"][:10],
                    "sample_sizes": s["sample_sizes"][:10],
                    "measurements": meas["measurements"][:20],
                }
            )
    return out


def run_figure_miner(payload: dict) -> dict:
    """payload: { text: <paper text> OR file_path: <abs PDF path> OR "demo" }

 Extract figure/table captions, mined reported statistics, numeric
 measurements with units, and a per-figure stat linkage. Real deterministic
 parsing. demo = a known mini-paper text with a verifiable stat count.
    """
    backend = "raw-text"
    demo = isinstance(payload.get("text"), str) and payload["text"].strip().lower() == "demo"
    expected = None
    if demo:
        text = (
            "Figure 1. Knockdown reduced expression (n = 12, p < 0.001). "
            "Binding affinity was 4.2 µM and the protein ran at 55 kDa.\n\n"
            "Figure 2. Modulus increased 3-fold to 12.5 kPa (R^2 = 0.98, r = 0.91). "
            "Mean lifetime 8.3 ± 1.2 ms across n = 30 events.\n\n"
            "Table 1. Summary statistics (95% CI reported)."
        )
        # known: 2 p? -> only one explicit p<0.001; n= appears twice; folds=1; etc.
        expected = {"figures": 3, "p_values": 1, "sample_sizes": 2, "fold_changes": 1}
    elif payload.get("file_path"):
        text, backend = extract_text_from_pdf(payload["file_path"])
        if text is None:
            return {"error": f"could not read PDF ({backend})"}
    else:
        text = payload.get("text")
        if not isinstance(text, str) or len(text.strip()) < 20:
            return {"error": "paste paper text (>= 20 chars) or provide a PDF file_path"}

    if len(text) > 5_000_000:
        return {"error": "document too large (max 5M chars)"}

    captions = mine_captions(text)
    stats = mine_stats(text)
    meas = mine_measurements(text)
    linkage = link_stats_to_figures(captions)
    out = {
        "method": "text-layer caption extraction + reported-statistics & measurement mining + per-figure linkage",
        "backend": backend,
        "demo": demo,
        "n_chars": len(text),
        "n_figures": sum(1 for c in captions if c["kind"] in ("Figure", "Scheme")),
        "n_tables": sum(1 for c in captions if c["kind"] == "Table"),
        "captions": captions[:100],
        "stats": stats,
        "measurements": meas,
        "per_figure": linkage[:100],
        "note": (
            "Real, deterministic text-layer mining: captions, p-values, n=, CIs, "
            "R²/r, mean±spread, fold-changes, and unit-bearing measurements, plus "
            "which stats live in which figure's caption. Pixel-level plot-point "
            "digitization from raster figures needs a vision model, that is the "
            "documented GPU/ML extension; the text-mining half here is real and "
            "needs no GPU."
        ),
    }
    if expected is not None:
        out["ground_truth"] = expected
        out["note"] = "DEMO MODE: " + out["note"] + " Text is a known mini-paper (see ground_truth) for verification."
    return out


# Registry the gateway imports.
FIGURE_RUNNERS = {
    "figureminer": run_figure_miner,
}
