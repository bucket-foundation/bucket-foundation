from __future__ import annotations

import argparse
import csv
import datetime as dt
import io
import json
import math
import os
import re
import subprocess
import sys
from pathlib import Path

import numpy as np

SCHEMA = "bucket.analysis/1"
REPO = Path(__file__).resolve().parents[3]
HELIX_DIR = Path(os.environ.get("BKT_HELIX_DIR", REPO / "tools/helix"))
PRIME_DIR = Path(os.environ.get("BKT_PRIME_DIR", REPO / "tools/prime-directions"))
MISSING = {"", "na", "n/a", "nan", "null", "none", "-", "?"}
TIME_NAMES = {"t", "time", "date", "datetime", "timestamp", "year", "month", "day", "period"}
UNIT_SUFFIX = {
    "usd": "USD", "eur": "EUR", "pct": "%", "percent": "%", "kg": "kg", "g": "g", "m": "m", "km": "km",
    "s": "s", "sec": "s", "ms": "ms", "min": "min", "hr": "h", "h": "h", "c": "degC", "f": "degF",
    "k": "K", "mm": "mm", "cm": "cm", "l": "L", "ml": "mL", "w": "W", "kw": "kW", "kwh": "kWh", "hz": "Hz",
}
UNIT_BRACKET = re.compile(r"^(.*?)\s*[\(\[]\s*([^\)\]]+?)\s*[\)\]]\s*$")
DATE_FORMATS = ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m", "%Y/%m/%d", "%m/%d/%Y", "%d.%m.%Y")
TYPE_SHARE = 0.95


class FormError(Exception):
    pass


def sniff_format(path: Path, head: bytes) -> str:
    ext = path.suffix.lower()
    if head.startswith(b"PAR1") or ext == ".parquet":
        return "parquet"
    if ext in (".json", ".jsonl", ".ndjson"):
        return "jsonl" if ext != ".json" else "json"
    text = head.decode("utf-8", errors="replace").lstrip("﻿ \r\n\t")
    if text[:1] in "[{":
        return "json"
    if ext == ".tsv":
        return "tsv"
    if ext == ".csv":
        return "csv"
    first = text.splitlines()[0] if text else ""
    return "tsv" if first.count("\t") > first.count(",") else "csv"


def read_delimited(text: str, delim: str, errors: list) -> tuple[list[str], list[list]]:
    rows = list(csv.reader(io.StringIO(text), delimiter=delim))
    rows = [r for r in rows if any(c.strip() for c in r)]
    if not rows:
        raise FormError("empty file")
    header = [h.strip() for h in rows[0]]
    body = []
    for i, r in enumerate(rows[1:], start=2):
        if len(r) != len(header):
            errors.append({"code": "E_RAGGED", "where": f"line {i}", "message": f"{len(r)} fields, header has {len(header)}"})
            r = (r + [""] * len(header))[: len(header)]
        body.append(r)
    return header, body


def records_to_table(recs: list, errors: list) -> tuple[list[str], list[list]]:
    if not recs:
        raise FormError("no records")
    header: list[str] = []
    for i, r in enumerate(recs):
        if not isinstance(r, dict):
            raise FormError(f"record {i} is {type(r).__name__}, expected an object")
        for k in r:
            if k not in header:
                header.append(k)
    for i, r in enumerate(recs):
        extra = set(header) - set(r)
        if extra and len(extra) < len(header):
            errors.append({"code": "E_KEYS", "where": f"record {i}", "message": f"missing keys {sorted(extra)[:5]}"})
    return header, [[r.get(h) for h in header] for r in recs]


def read_table(path: Path) -> tuple[str, list[str], list[list], list]:
    errors: list = []
    if not path.is_file():
        raise FormError(f"{path} is not a file")
    raw = path.read_bytes()
    if not raw.strip():
        raise FormError("empty file")
    fmt = sniff_format(path, raw[:4096])
    if fmt == "parquet":
        try:
            import pyarrow.parquet as pq
        except ImportError as exc:
            raise FormError("parquet needs pyarrow") from exc
        try:
            tbl = pq.read_table(path)
        except Exception as exc:
            raise FormError(f"parquet read failed: {exc}") from exc
        cols = tbl.column_names
        data = tbl.to_pydict()
        return fmt, cols, [[data[c][i] for c in cols] for i in range(tbl.num_rows)], errors
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise FormError(f"not UTF-8: {exc}") from exc
    if fmt in ("csv", "tsv"):
        header, body = read_delimited(text, "\t" if fmt == "tsv" else ",", errors)
        return fmt, header, body, errors
    try:
        if fmt == "jsonl":
            doc = [json.loads(line) for line in text.splitlines() if line.strip()]
        else:
            doc = json.loads(text)
    except json.JSONDecodeError as exc:
        raise FormError(f"invalid JSON: {exc}") from exc
    if isinstance(doc, dict):
        lists = [v for v in doc.values() if isinstance(v, list)]
        if "rows" in doc and isinstance(doc["rows"], list):
            doc = doc["rows"]
        elif "data" in doc and isinstance(doc["data"], list):
            doc = doc["data"]
        elif lists and all(isinstance(v, list) for v in doc.values()) and len({len(v) for v in lists}) == 1:
            keys = list(doc)
            doc = [{k: doc[k][i] for k in keys} for i in range(len(lists[0]))]
        else:
            raise FormError("JSON object needs a rows or data list, or equal-length column lists")
    if not isinstance(doc, list):
        raise FormError("JSON must be a list of records")
    header, body = records_to_table(doc, errors)
    return fmt, header, body, errors


def is_missing(v) -> bool:
    if v is None:
        return True
    if isinstance(v, float) and math.isnan(v):
        return True
    return isinstance(v, str) and v.strip().lower() in MISSING


def parse_number(v):
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        s = v.strip().replace(",", "") if re.fullmatch(r"-?\d{1,3}(,\d{3})+(\.\d+)?", v.strip()) else v.strip()
        s = s.rstrip("%")
        try:
            f = float(s)
        except ValueError:
            return None
        return f if math.isfinite(f) else None
    return None


def parse_date(v):
    if isinstance(v, dt.datetime):
        return v
    if isinstance(v, dt.date):
        return dt.datetime(v.year, v.month, v.day)
    if not isinstance(v, str):
        return None
    s = v.strip()
    for fmt in DATE_FORMATS:
        try:
            return dt.datetime.strptime(s, fmt)
        except ValueError:
            continue
    try:
        return dt.datetime.fromisoformat(s.replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        return None


def parse_bool(v):
    if isinstance(v, bool):
        return v
    if isinstance(v, str) and v.strip().lower() in ("true", "false", "yes", "no"):
        return v.strip().lower() in ("true", "yes")
    return None


def decimal_year(d: dt.datetime) -> float:
    start = dt.datetime(d.year, 1, 1)
    end = dt.datetime(d.year + 1, 1, 1)
    return d.year + (d - start).total_seconds() / (end - start).total_seconds()


def infer_type(values: list) -> tuple[str, float]:
    present = [v for v in values if not is_missing(v)]
    if not present:
        return "empty", 1.0
    n = len(present)
    shares = {
        "bool": sum(parse_bool(v) is not None for v in present) / n,
        "number": sum(parse_number(v) is not None for v in present) / n,
        "datetime": sum(parse_date(v) is not None for v in present) / n,
    }
    if shares["bool"] >= TYPE_SHARE:
        return "bool", shares["bool"]
    if shares["number"] >= TYPE_SHARE:
        nums = [parse_number(v) for v in present if parse_number(v) is not None]
        return ("integer" if all(x == int(x) for x in nums) else "float"), shares["number"]
    if shares["datetime"] >= TYPE_SHARE:
        return "datetime", shares["datetime"]
    best = max(shares.values())
    if best >= 0.5:
        return "mixed", best
    return "string", 1.0


def unit_of(name: str) -> tuple[str, str | None]:
    m = UNIT_BRACKET.match(name)
    if m:
        return m.group(1).strip(), m.group(2)
    parts = re.split(r"[_\s]+", name.strip())
    if len(parts) > 1 and parts[-1].lower() in UNIT_SUFFIX:
        return " ".join(parts[:-1]), UNIT_SUFFIX[parts[-1].lower()]
    if name.strip().endswith("%"):
        return name.strip()[:-1].strip(), "%"
    return name, None


def pick_time(columns: list[dict], values: dict) -> dict | None:
    for c in columns:
        if c["type"] == "datetime":
            return {"column": c["name"], "kind": "datetime"}
    for c in columns:
        if c["type"] in ("integer", "float") and c["base"].strip().lower() in TIME_NAMES:
            return {"column": c["name"], "kind": "numeric"}
    return None


def time_values(col: list, kind: str) -> list:
    if kind == "datetime":
        return [decimal_year(d) if (d := parse_date(v)) else None for v in col]
    return [parse_number(v) for v in col]


def verify(path: Path) -> tuple[dict, dict]:
    report = {"file": str(path), "format": None, "rows": 0, "columns": [], "errors": [], "warnings": []}
    try:
        fmt, header, body, errors = read_table(path)
    except FormError as exc:
        report["errors"].append({"code": "E_READ", "where": str(path), "message": str(exc)})
        report["ok"] = False
        return report, {}
    report["format"] = fmt
    report["rows"] = len(body)
    report["errors"].extend(errors)
    header = [str(h) for h in header]
    blank = [i for i, h in enumerate(header) if not h.strip()]
    if blank:
        report["errors"].append({"code": "E_HEADER", "where": "header", "message": f"blank column names at {blank}"})
    dupes = sorted({h for h in header if header.count(h) > 1})
    if dupes:
        report["errors"].append({"code": "E_DUP_COLUMN", "where": "header", "message": f"duplicate columns {dupes}"})
    if not body:
        report["errors"].append({"code": "E_EMPTY", "where": "body", "message": "header but no rows"})
    values: dict[str, list] = {}
    for j, h in enumerate(header):
        key = h if h not in values else f"{h}.{j}"
        values[key] = [r[j] if j < len(r) else None for r in body]
    for name, col in values.items():
        kind, share = infer_type(col)
        base, unit = unit_of(name)
        missing = sum(is_missing(v) for v in col)
        info = {"name": name, "base": base, "unit": unit, "type": kind, "type_share": round(share, 4), "missing": missing,
                "missing_pct": round(100 * missing / len(col), 2) if col else 0.0, "distinct": len({str(v) for v in col if not is_missing(v)})}
        report["columns"].append(info)
        if kind == "mixed":
            report["warnings"].append({"code": "W_MIXED", "where": name, "message": f"only {share:.0%} of values parse as one type"})
        if kind == "empty":
            report["warnings"].append({"code": "W_EMPTY_COLUMN", "where": name, "message": "every value is missing"})
        elif missing:
            report["warnings"].append({"code": "W_MISSING", "where": name, "message": f"{missing} missing ({info['missing_pct']}%)"})
        if kind in ("integer", "float") and info["distinct"] == 1:
            report["warnings"].append({"code": "W_CONSTANT", "where": name, "message": "constant column"})
    numeric = [c["name"] for c in report["columns"] if c["type"] in ("integer", "float")]
    time = pick_time(report["columns"], values)
    report["time_index"] = time
    if time:
        numeric = [n for n in numeric if n != time["column"]]
        tv = [x for x in time_values(values[time["column"]], time["kind"]) if x is not None]
        if any(b < a for a, b in zip(tv, tv[1:])):
            report["warnings"].append({"code": "W_TIME_ORDER", "where": time["column"], "message": "time index is not sorted; analysis sorts it"})
        if len(set(tv)) < len(tv):
            report["warnings"].append({"code": "W_TIME_DUP", "where": time["column"], "message": f"{len(tv) - len(set(tv))} repeated time values"})
    else:
        report["warnings"].append({"code": "W_NO_TIME", "where": "header", "message": "no time index found; trend, seasonality and helix skipped"})
    if body and not numeric:
        report["errors"].append({"code": "E_NO_NUMERIC", "where": "columns", "message": "no numeric columns to analyze"})
    seen: dict[tuple, int] = {}
    for r in body:
        k = tuple(str(x) for x in r)
        seen[k] = seen.get(k, 0) + 1
    dup_rows = sum(v - 1 for v in seen.values())
    report["duplicates"] = dup_rows
    if dup_rows:
        report["warnings"].append({"code": "W_DUP_ROWS", "where": "body", "message": f"{dup_rows} duplicate rows"})
    report["numeric"] = numeric
    report["ok"] = not report["errors"]
    return report, values


def _q(x: np.ndarray, p: float) -> float:
    return float(np.quantile(x, p))


def summary(x: np.ndarray) -> dict:
    n = len(x)
    mean = float(x.mean())
    sd = float(x.std(ddof=1)) if n > 1 else 0.0
    z = (x - mean) / sd if sd > 0 else np.zeros_like(x)
    return {
        "n": n, "mean": mean, "sd": sd, "min": float(x.min()), "q1": _q(x, 0.25), "median": _q(x, 0.5),
        "q3": _q(x, 0.75), "max": float(x.max()), "skew": float((z**3).mean()), "kurtosis": float((z**4).mean() - 3),
    }


def histogram(x: np.ndarray, bins: int = 10) -> dict:
    counts, edges = np.histogram(x, bins=min(bins, max(1, len(np.unique(x)))))
    return {"counts": counts.tolist(), "edges": [float(e) for e in edges], "spark": spark(counts)}


def spark(counts) -> str:
    bars = " ▁▂▃▄▅▆▇█"
    top = max(counts) if len(counts) and max(counts) else 1
    return "".join(bars[int(round(8 * c / top))] for c in counts)


def rank(x: np.ndarray) -> np.ndarray:
    order = x.argsort(kind="stable")
    r = np.empty(len(x))
    r[order] = np.arange(len(x))
    for v in np.unique(x):
        m = x == v
        r[m] = r[m].mean()
    return r


def corr(m: np.ndarray) -> np.ndarray:
    sd = m.std(axis=0)
    c = np.full((m.shape[1], m.shape[1]), np.nan)
    ok = sd > 0
    if ok.sum() > 1:
        c[np.ix_(ok, ok)] = np.corrcoef(m[:, ok], rowvar=False)
    return c


def flip_signs(u: np.ndarray, vt: np.ndarray) -> tuple[np.ndarray, np.ndarray, str]:
    try:
        sys.path.insert(0, str(PRIME_DIR))
        from prime_directions.model import _flip_signs

        return (*_flip_signs(u, vt), "tools/prime-directions")
    except Exception:
        idx = np.argmax(np.abs(vt), axis=1)
        signs = np.sign(vt[np.arange(vt.shape[0]), idx])
        signs[signs == 0] = 1
        return u * signs, vt * signs[:, None], "local"
    finally:
        if sys.path and sys.path[0] == str(PRIME_DIR):
            sys.path.pop(0)


def pca(m: np.ndarray, names: list[str]) -> dict:
    sd = m.std(axis=0, ddof=1)
    keep = sd > 0
    if keep.sum() < 2 or m.shape[0] < 3:
        return {"skipped": "needs 2 non-constant columns and 3 complete rows"}
    z = (m[:, keep] - m[:, keep].mean(axis=0)) / sd[keep]
    kept = [n for n, k in zip(names, keep) if k]
    u, s, vt = np.linalg.svd(z, full_matrices=False)
    u, vt, sign_source = flip_signs(u, vt)
    var = s**2 / (s**2).sum()
    k90 = int(np.searchsorted(np.cumsum(var), 0.9) + 1)
    recon = (u[:, :k90] * s[:k90]) @ vt[:k90]
    row_err = np.sqrt(((z - recon) ** 2).sum(axis=1))
    comps = []
    for i in range(len(s)):
        order = np.argsort(-np.abs(vt[i]))
        comps.append({"component": i + 1, "singular_value": float(s[i]), "variance_ratio": float(var[i]),
                      "loadings": {kept[j]: float(vt[i, j]) for j in order}})
    return {"columns": kept, "rows": int(m.shape[0]), "components": comps, "k90": k90,
            "orthogonality_error": float(np.abs(vt @ vt.T - np.eye(len(s))).max()), "sign_convention": sign_source,
            "reconstruction_residual": {"mean": float(row_err.mean()), "max": float(row_err.max()), "worst_rows": np.argsort(-row_err)[:5].tolist()}}


def acf(x: np.ndarray, max_lag: int) -> list[float]:
    x = x - x.mean()
    denom = float((x**2).sum())
    if denom == 0:
        return [0.0] * max_lag
    return [float((x[:-k] * x[k:]).sum() / denom) for k in range(1, max_lag + 1)]


def trend_season(t: np.ndarray, y: np.ndarray) -> dict:
    a = np.vstack([t, np.ones_like(t)]).T
    coef, *_ = np.linalg.lstsq(a, y, rcond=None)
    fit = a @ coef
    res = y - fit
    ss_tot = float(((y - y.mean()) ** 2).sum())
    r2 = 1 - float((res**2).sum()) / ss_tot if ss_tot > 0 else 0.0
    dw = float((np.diff(res) ** 2).sum() / (res**2).sum()) if (res**2).sum() > 0 else float("nan")
    max_lag = max(1, len(y) // 2)
    ac = acf(res, max_lag) if len(y) > 3 else []
    season = None
    for lag in range(2, len(ac) + 1):
        v = ac[lag - 1]
        if v > 0.3 and (lag == len(ac) or v >= ac[lag]) and v >= ac[lag - 2]:
            season = {"lag": lag, "acf": v}
            break
    rsd = float(res.std(ddof=1)) if len(res) > 1 else 0.0
    worst = np.argsort(-np.abs(res))[:5]
    return {"slope": float(coef[0]), "intercept": float(coef[1]), "r2": r2, "direction": "up" if coef[0] > 0 else "down" if coef[0] < 0 else "flat",
            "season": season, "acf": [round(v, 4) for v in ac[:24]],
            "residuals": {"sd": rsd, "durbin_watson": dw, "largest": [{"row": int(i), "t": float(t[i]), "residual": float(res[i])} for i in worst]}}


def outliers(x: np.ndarray) -> dict:
    q1, q3 = _q(x, 0.25), _q(x, 0.75)
    iqr = q3 - q1
    lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    sd = x.std(ddof=1) if len(x) > 1 else 0.0
    z = np.abs(x - x.mean()) / sd if sd > 0 else np.zeros_like(x)
    iqr_rows = np.where((x < lo) | (x > hi))[0]
    z_rows = np.where(z > 3)[0]
    return {"iqr_fences": [float(lo), float(hi)], "iqr_count": int(len(iqr_rows)), "iqr_rows": iqr_rows[:10].tolist(),
            "z3_count": int(len(z_rows)), "z3_rows": z_rows[:10].tolist()}


def numeric_array(col: list) -> np.ndarray:
    return np.array([np.nan if (v := parse_number(x)) is None else v for x in col], dtype=float)


def analyze(form: dict, values: dict) -> dict:
    names = form["numeric"]
    cols = {n: numeric_array(values[n]) for n in names}
    out: dict = {"summary": {}, "distributions": {}, "outliers": {}}
    for n, x in cols.items():
        v = x[~np.isnan(x)]
        if len(v) == 0:
            continue
        out["summary"][n] = summary(v)
        out["distributions"][n] = histogram(v)
        out["outliers"][n] = outliers(v)
    usable = [n for n in names if n in out["summary"]]
    if len(usable) >= 2:
        m = np.column_stack([cols[n] for n in usable])
        complete = m[~np.isnan(m).any(axis=1)]
        pear = corr(complete)
        spear = corr(np.column_stack([rank(complete[:, j]) for j in range(complete.shape[1])])) if len(complete) else pear
        pairs = []
        for i in range(len(usable)):
            for j in range(i + 1, len(usable)):
                if not math.isnan(pear[i, j]):
                    pairs.append({"a": usable[i], "b": usable[j], "pearson": float(pear[i, j]), "spearman": float(spear[i, j])})
        pairs.sort(key=lambda p: -abs(p["pearson"]))
        out["correlations"] = {"columns": usable, "rows": int(len(complete)),
                               "pearson": [[None if math.isnan(v) else round(float(v), 4) for v in r] for r in pear],
                               "spearman": [[None if math.isnan(v) else round(float(v), 4) for v in r] for r in spear],
                               "top_pairs": pairs[:10]}
        out["pca"] = pca(complete, usable)
    else:
        out["correlations"] = {"skipped": "needs 2 numeric columns"}
        out["pca"] = {"skipped": "needs 2 numeric columns"}
    time = form.get("time_index")
    if time:
        t = np.array([np.nan if v is None else v for v in time_values(values[time["column"]], time["kind"])], dtype=float)
        order = np.argsort(t, kind="stable")
        out["trends"] = {}
        for n in usable:
            y = cols[n][order]
            tt = t[order]
            ok = ~np.isnan(y) & ~np.isnan(tt)
            if ok.sum() >= 3:
                out["trends"][n] = trend_season(tt[ok], y[ok])
    else:
        out["trends"] = {"skipped": "no time index"}
    return out


def slugify(s: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return (s or "data")[:48]


def helix_doc(form: dict, values: dict, name: str, retrieved: str) -> tuple[dict | None, str]:
    time = form.get("time_index")
    if not time:
        return None, "no time index"
    tv = time_values(values[time["column"]], time["kind"])
    primes = []
    for n in form["numeric"]:
        x = numeric_array(values[n])
        v = x[~np.isnan(x)]
        if len(v) and (v >= 0).all() and v.sum() > 0:
            primes.append(n)
    if len(primes) < 2:
        return None, "helix needs 2 nonnegative numeric columns"
    primes = primes[:64]
    by_t: dict[float, dict] = {}
    for i, t in enumerate(tv):
        if t is None:
            continue
        row = {p: parse_number(values[p][i]) for p in primes}
        if any(v is None for v in row.values()) or sum(row.values()) <= 0:
            continue
        by_t[t] = row
    if len(by_t) < 2:
        return None, "helix needs 2 complete time slices"
    units = {c["unit"] for c in form["columns"] if c["name"] in primes}
    unit = units.pop() if len(units) == 1 and None not in units else "value"
    time_unit = "year" if time["kind"] == "datetime" or all(1000 <= t <= 3000 for t in by_t) else "day"
    rows = [{"t": t, "prime": p, "value": v} for t in sorted(by_t) for p, v in by_t[t].items()]
    return {"name": name, "slug": slugify(name), "kind": "topics", "unit": unit, "time_unit": time_unit, "primes": primes,
            "source": {"title": Path(form["file"]).name, "url": f"local:{Path(form['file']).name}", "retrieved": retrieved, "license": "private"},
            "rows": rows}, ""


def run_helix(form: dict, values: dict, name: str, out: Path, retrieved: str, horizon: int) -> dict:
    doc, why = helix_doc(form, values, name, retrieved)
    if doc is None:
        return {"status": "skipped", "reason": why}
    if not (HELIX_DIR / "helix/__main__.py").is_file():
        return {"status": "skipped", "reason": f"helix not found at {HELIX_DIR}"}
    hdir = out / "helix"
    hdir.mkdir(parents=True, exist_ok=True)
    inp = hdir / "input.table.json"
    inp.write_text(json.dumps(doc, indent=2))
    cmd = [sys.executable, "-m", "helix", "run", str(inp), "--adapter", "table", "--horizon", str(horizon), "--out", str(hdir / "runs")]
    try:
        p = subprocess.run(cmd, cwd=HELIX_DIR, capture_output=True, text=True, timeout=300)
    except subprocess.TimeoutExpired:
        return {"status": "failed", "reason": "helix timed out after 300s", "command": cmd}
    (hdir / "stdout.txt").write_text(p.stdout)
    (hdir / "stderr.txt").write_text(p.stderr)
    res = {"status": "ok" if p.returncode == 0 else "failed", "exit": p.returncode, "command": cmd, "primes": doc["primes"],
           "slices": len({r["t"] for r in doc["rows"]}), "stderr": p.stderr.strip()[-2000:]}
    if p.returncode == 0:
        run_dir = Path(p.stdout.strip().splitlines()[-1])
        res["run_dir"] = str(run_dir)
        res["files"] = sorted(f.name for f in run_dir.iterdir()) if run_dir.is_dir() else []
        manifest = run_dir / "manifest.json"
        if manifest.is_file():
            m = json.loads(manifest.read_text())
            res["manifest"] = {k: m[k] for k in ("slug", "method", "horizon", "interp_error", "metrics") if k in m}
    return res


def fmt(v) -> str:
    if v is None:
        return "-"
    if isinstance(v, float):
        return f"{v:.4g}"
    return str(v)


def markdown(rep: dict) -> str:
    f = rep["form"]
    a = rep.get("analysis") or {}
    L = [f"# Analysis: {rep['name']}", "", f"File `{f['file']}`, {f['format']}, {f['rows']} rows, {len(f['columns'])} columns. Created {rep['created']}.", ""]
    L += ["## Form", "", f"Result: **{'PASS' if f['ok'] else 'FAIL'}**{' (forced)' if rep.get('forced') and not f['ok'] else ''}.",
          f"Time index: {f['time_index']['column'] + ' (' + f['time_index']['kind'] + ')' if f.get('time_index') else 'none'}. Duplicate rows: {f.get('duplicates', 0)}.", "",
          "| column | type | unit | missing | distinct |", "|---|---|---|---|---|"]
    L += [f"| {c['name']} | {c['type']} | {c['unit'] or '-'} | {c['missing']} | {c['distinct']} |" for c in f["columns"]]
    for kind in ("errors", "warnings"):
        if f[kind]:
            L += ["", f"{kind.capitalize()}:", ""] + [f"- `{e['code']}` {e['where']}: {e['message']}" for e in f[kind]]
    if not a:
        return "\n".join(L) + "\n"
    L += ["", "## Summary", "", "| column | n | mean | sd | min | median | max | skew |", "|---|---|---|---|---|---|---|---|"]
    L += [f"| {n} | {s['n']} | {fmt(s['mean'])} | {fmt(s['sd'])} | {fmt(s['min'])} | {fmt(s['median'])} | {fmt(s['max'])} | {fmt(s['skew'])} |" for n, s in a["summary"].items()]
    L += ["", "## Distributions", ""] + [f"- `{n}` {d['spark']} [{fmt(d['edges'][0])}, {fmt(d['edges'][-1])}]" for n, d in a["distributions"].items()]
    c = a["correlations"]
    L += ["", "## Correlations", ""]
    L += [c["skipped"]] if "skipped" in c else [f"- {p['a']} x {p['b']}: pearson {fmt(p['pearson'])}, spearman {fmt(p['spearman'])}" for p in c["top_pairs"]]
    p = a["pca"]
    L += ["", "## Prime Directions", ""]
    if "skipped" in p:
        L.append(p["skipped"])
    else:
        L.append(f"PCA on {p['rows']} complete rows, standardized. {p['k90']} components reach 90% of variance. Sign convention: {p['sign_convention']}.")
        L += [""] + [f"- PC{k['component']}: {k['variance_ratio']:.1%}, " + ", ".join(f"{n} {v:+.2f}" for n, v in list(k["loadings"].items())[:4]) for k in p["components"]]
    t = a["trends"]
    L += ["", "## Trend and Seasonality", ""]
    if "skipped" in t:
        L.append(t["skipped"])
    else:
        L += [f"- `{n}`: slope {fmt(v['slope'])} per time unit, r2 {fmt(v['r2'])}, season {('lag ' + str(v['season']['lag'])) if v['season'] else 'none'}" for n, v in t.items()]
    L += ["", "## Outliers", ""] + [f"- `{n}`: {o['iqr_count']} outside IQR fences, {o['z3_count']} beyond 3 sd" for n, o in a["outliers"].items()]
    L += ["", "## Residuals", ""]
    if "skipped" not in t:
        L += [f"- `{n}` trend residual sd {fmt(v['residuals']['sd'])}, Durbin-Watson {fmt(v['residuals']['durbin_watson'])}" for n, v in t.items()]
    if "skipped" not in p:
        r = p["reconstruction_residual"]
        L.append(f"- PCA rank-{p['k90']} reconstruction error mean {fmt(r['mean'])}, max {fmt(r['max'])}, worst rows {r['worst_rows']}")
    h = rep.get("helix", {})
    L += ["", "## Helix", "", f"Status: {h.get('status')}. " + (h.get("reason") or "")]
    if h.get("run_dir"):
        L += [f"Run: `{h['run_dir']}`", f"Files: {', '.join(h.get('files', []))}"]
    if h.get("status") == "failed":
        L += ["", "```", h.get("stderr", ""), "```"]
    return "\n".join(L) + "\n"


def clean(o):
    if isinstance(o, float):
        return o if math.isfinite(o) else None
    if isinstance(o, dict):
        return {k: clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [clean(v) for v in o]
    return o


def default_root() -> Path:
    base = os.environ.get("XDG_DATA_HOME") or str(Path.home() / ".local/share")
    return Path(os.environ.get("BKT_ANALYSES", Path(base) / "bucket/analyses"))


def unique_dir(root: Path, name: str, date: str) -> Path:
    base = root / f"{slugify(name)}-{date}"
    d, i = base, 2
    while d.exists():
        d = Path(f"{base}-{i}")
        i += 1
    return d


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="bkt analyze")
    ap.add_argument("file", type=Path)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--verify-only", action="store_true")
    ap.add_argument("--no-helix", action="store_true")
    ap.add_argument("--horizon", type=int, default=3)
    ap.add_argument("--name")
    ap.add_argument("--out", type=Path, default=None)
    ap.add_argument("--date", default=dt.date.today().isoformat())
    args = ap.parse_args(argv)
    name = args.name or args.file.stem
    form, values = verify(args.file)
    rep = {"schema": SCHEMA, "name": name, "created": dt.datetime.now().isoformat(timespec="seconds"), "forced": args.force, "form": form}
    if args.verify_only:
        print(json.dumps(rep))
        return 0 if form["ok"] else 2
    hard_stop = not form["ok"] and (not args.force or not values or not form["numeric"])
    out = unique_dir(args.out or default_root(), name, args.date)
    out.mkdir(parents=True)
    if not hard_stop:
        rep["analysis"] = analyze(form, values)
        rep["helix"] = {"status": "skipped", "reason": "--no-helix"} if args.no_helix else run_helix(form, values, name, out, args.date, args.horizon)
    rep["dir"] = str(out)
    rep = clean(rep)
    (out / "report.json").write_text(json.dumps(rep, indent=2, allow_nan=False, default=str))
    (out / "report.md").write_text(markdown(rep))
    print(json.dumps(rep, allow_nan=False, default=str))
    return 2 if hard_stop else 0


if __name__ == "__main__":
    sys.exit(main())
