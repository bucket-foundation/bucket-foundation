from __future__ import annotations

import argparse
import csv
import datetime as dt
import functools
import itertools
import json
import math
import os
import re
import signal
import subprocess
import sys
from pathlib import Path

try:
    import numpy as np
except ImportError:
    print("bkt analyze needs numpy: python3 -m pip install --user numpy", file=sys.stderr)
    sys.exit(3)

from marketing import run as marketing_run
from marketing.adapters import header_row
from marketing.readers import ReadError, magic_ok, read_pdf, read_xlsx
from marketing.report import markdown as marketing_markdown

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
MAX_ROWS = 1_000_000
MAX_JSON_BYTES = 256 << 20
LISTWISE_WARN = 0.2
PREAMBLE_SCAN = 15
MAX_FILES = 8
REGULAR_TOL = 0.1


class FormError(Exception):
    pass


def text_encoding(head: bytes) -> str:
    return "utf-16" if head.startswith((b"\xff\xfe", b"\xfe\xff")) else "utf-8-sig"


def sniff_format(path: Path, head: bytes) -> str:
    ext = path.suffix.lower()
    if head.startswith(b"PAR1") or ext == ".parquet":
        return "parquet"
    if ext == ".xlsx" or (head.startswith(b"PK\x03\x04") and ext not in (".csv", ".tsv", ".json", ".jsonl")):
        return "xlsx"
    if ext == ".pdf" or head.startswith(b"%PDF-"):
        return "pdf"
    if text_encoding(head) == "utf-16":
        head = head.decode("utf-16", errors="replace").encode("utf-8")
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


def pick_header(rows: list[list[str]]) -> int:
    hit = header_row(rows, PREAMBLE_SCAN)
    if hit:
        return hit
    counts: dict[int, int] = {}
    for r in rows:
        counts[len(r)] = counts.get(len(r), 0) + 1
    modal = max(counts, key=lambda k: (counts[k], k))
    if modal < 2:
        return 0
    return next(i for i, r in enumerate(rows) if len(r) == modal)


def read_delimited(path: Path, delim: str, errors: list, max_rows: int, encoding: str = "utf-8-sig", warnings: list | None = None) -> tuple[list[str], list[list], bool]:
    header: list[str] | None = None
    body: list[list] = []
    truncated = False
    pending: list[tuple[int, list[str]]] = []
    try:
        with path.open(encoding=encoding, newline="") as fh:
            reader = enumerate(csv.reader(fh, delimiter=delim), start=1)
            for i, r in reader:
                if not any(c.strip() for c in r) or (not pending and r[0].lstrip().startswith("#")):
                    continue
                pending.append((i, r))
                if len(pending) >= PREAMBLE_SCAN:
                    break
            if pending:
                k = pick_header([r for _, r in pending])
                if k and warnings is not None:
                    warnings.append({"code": "W_PREAMBLE", "where": "header", "message": f"skipped {k} rows above the header"})
                header = [h.strip().lstrip("\ufeff") for h in pending[k][1]]
            rest = ((i, r) for i, r in pending[k + 1 :]) if pending else iter(())
            for i, r in itertools.chain(rest, reader):
                if not any(c.strip() for c in r):
                    continue
                if len(body) >= max_rows:
                    truncated = True
                    break
                if len(r) != len(header):
                    errors.append({"code": "E_RAGGED", "where": f"record {i}", "message": f"{len(r)} fields, header has {len(header)}"})
                    r = (r + [""] * len(header))[: len(header)]
                body.append(r)
    except UnicodeDecodeError as exc:
        raise FormError(f"not UTF-8: {exc}") from exc
    except csv.Error as exc:
        raise FormError(f"CSV parse failed: {exc}") from exc
    if header is None:
        raise FormError("empty file")
    return header, body, truncated


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


def read_table(path: Path, max_rows: int = MAX_ROWS, warnings: list | None = None, sheet: int = 0) -> tuple[str, list[str], list[list], list, bool]:
    errors: list = []
    if not path.is_file():
        raise FormError(f"{path} is not a file")
    with path.open("rb") as fh:
        head = fh.read(4096)
    if not head.strip():
        raise FormError("empty file")
    fmt = sniff_format(path, head)
    if not magic_ok(fmt, head):
        raise FormError(f"E_MAGIC: contents do not match {fmt}")
    if fmt in ("xlsx", "pdf"):
        try:
            header, body, warns, truncated = read_xlsx(path, max_rows, sheet) if fmt == "xlsx" else read_pdf(path, max_rows)
        except ReadError as exc:
            raise FormError(f"{exc.code}: {exc}") from exc
        if warnings is not None:
            warnings.extend(warns)
        return fmt, header, body, errors, truncated
    if fmt == "parquet":
        try:
            import pyarrow.parquet as pq
        except ImportError as exc:
            raise FormError("parquet needs pyarrow: python3 -m pip install --user pyarrow") from exc
        try:
            pf = pq.ParquetFile(path)
            cols = pf.schema_arrow.names
            body: list[list] = []
            for batch in pf.iter_batches(batch_size=65536):
                data = batch.to_pydict()
                body.extend([data[c][i] for c in cols] for i in range(batch.num_rows))
                if len(body) > max_rows:
                    break
        except Exception as exc:
            raise FormError(f"parquet read failed: {exc}") from exc
        return fmt, cols, body[:max_rows], errors, len(body) > max_rows
    if fmt in ("csv", "tsv"):
        header, body, truncated = read_delimited(path, "\t" if fmt == "tsv" else ",", errors, max_rows, text_encoding(head), warnings)
        return fmt, header, body, errors, truncated
    if path.stat().st_size > MAX_JSON_BYTES:
        raise FormError(f"JSON over {MAX_JSON_BYTES >> 20} MB; convert to CSV or Parquet")
    try:
        text = path.read_text(encoding=text_encoding(head))
    except UnicodeDecodeError as exc:
        raise FormError(f"not UTF-8: {exc}") from exc
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
    truncated = len(doc) > max_rows
    header, body = records_to_table(doc[:max_rows], errors)
    return fmt, header, body, errors, truncated


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
        if "_" in v:
            return None
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
    return parse_date_text(v.strip())


DATE_START = re.compile(r"^\d")


@functools.lru_cache(maxsize=65536)
def parse_date_text(s: str):
    if not DATE_START.match(s) or len(s) > 40:
        return None
    try:
        return dt.datetime.fromisoformat(s.replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        pass
    for fmt in DATE_FORMATS:
        try:
            return dt.datetime.strptime(s, fmt)
        except ValueError:
            continue
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


def verify(path: Path, max_rows: int = MAX_ROWS, sheet: int = 0) -> tuple[dict, dict]:
    report = {"file": str(path), "format": None, "rows": 0, "columns": [], "errors": [], "warnings": []}
    try:
        fmt, header, body, errors, truncated = read_table(path, max_rows, report["warnings"], sheet)
    except FormError as exc:
        report["errors"].append({"code": "E_READ", "where": str(path), "message": str(exc)})
        report["ok"] = False
        return report, {}
    report["format"] = fmt
    report["rows"] = len(body)
    report["errors"].extend(errors)
    report["truncated"] = truncated
    if truncated:
        report["warnings"].append({"code": "W_TRUNCATED", "where": "body", "message": f"read the first {max_rows} rows; raise --max-rows to read more"})
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
    _, inv, counts = np.unique(x, return_inverse=True, return_counts=True)
    ends = np.cumsum(counts)
    return (ends - (counts + 1) / 2)[inv]


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
    size = 1 << (2 * len(x) - 1).bit_length()
    f = np.fft.rfft(x, size)
    full = np.fft.irfft(f * np.conj(f), size)[: max_lag + 1]
    return [float(full[k] / denom) for k in range(1, max_lag + 1)]


def regular_spacing(t: np.ndarray) -> bool:
    d = np.diff(t)
    if len(d) == 0:
        return False
    med = float(np.median(d))
    return med > 0 and bool((np.abs(d - med) <= REGULAR_TOL * med).all())


def find_season(res: np.ndarray, regular: bool) -> tuple[dict | None, list[float], float]:
    n = len(res)
    bound = 2 / math.sqrt(n) if n else float("inf")
    max_lag = n // 2
    ac = acf(res, max_lag) if n > 3 and max_lag >= 1 else []
    if not regular or max_lag < 2:
        return None, ac, bound
    peaks = [lag for lag in range(2, max_lag + 1) if ac[lag - 1] >= ac[lag - 2] and (lag == max_lag or ac[lag - 1] >= ac[lag])]
    if not peaks:
        return None, ac, bound
    lag = max(peaks, key=lambda k: ac[k - 1])
    if ac[lag - 1] <= bound or 2 * lag > n:
        return None, ac, bound
    return {"lag": lag, "acf": ac[lag - 1], "cycles": n / lag}, ac, bound


def trend_season(t: np.ndarray, y: np.ndarray) -> dict:
    a = np.vstack([t, np.ones_like(t)]).T
    coef, *_ = np.linalg.lstsq(a, y, rcond=None)
    fit = a @ coef
    res = y - fit
    ss_tot = float(((y - y.mean()) ** 2).sum())
    r2 = 1 - float((res**2).sum()) / ss_tot if ss_tot > 0 else 0.0
    dw = float((np.diff(res) ** 2).sum() / (res**2).sum()) if (res**2).sum() > 0 else float("nan")
    regular = regular_spacing(t)
    season, ac, bound = find_season(res, regular)
    rsd = float(res.std(ddof=1)) if len(res) > 1 else 0.0
    worst = np.argsort(-np.abs(res))[:5]
    return {"slope": float(coef[0]), "intercept": float(coef[1]), "r2": r2, "direction": "up" if coef[0] > 0 else "down" if coef[0] < 0 else "flat",
            "regular": regular, "acf_bound": bound, "season": season, "acf": [round(v, 4) for v in ac[:24]],
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
    out: dict = {"summary": {}, "distributions": {}, "outliers": {}, "warnings": []}
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
        most = max(out["summary"][n]["n"] for n in usable)
        if most and 1 - len(complete) / most > LISTWISE_WARN:
            out["warnings"].append({"code": "W_LISTWISE", "where": "correlations", "message": f"complete rows {len(complete)} of {most}; listwise deletion dropped {1 - len(complete) / most:.0%}"})
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


CHILD: subprocess.Popen | None = None
HELIX_TIMEOUT = 300


def has_module(name: str) -> bool:
    import importlib.util

    return importlib.util.find_spec(name) is not None


def on_term(signum, frame):
    if CHILD is not None and CHILD.poll() is None:
        CHILD.kill()
    sys.exit(130)


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
    if not has_module("matplotlib"):
        return {"status": "skipped", "reason": "helix needs matplotlib: python3 -m pip install --user matplotlib"}
    cmd = [sys.executable, "-m", "helix", "run", str(inp), "--adapter", "table", "--horizon", str(horizon), "--out", str(hdir / "runs")]
    global CHILD
    CHILD = subprocess.Popen(cmd, cwd=HELIX_DIR, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    try:
        stdout, stderr = CHILD.communicate(timeout=HELIX_TIMEOUT)
    except subprocess.TimeoutExpired:
        CHILD.kill()
        CHILD.communicate()
        return {"status": "failed", "reason": f"helix timed out after {HELIX_TIMEOUT}s", "command": cmd}
    p = subprocess.CompletedProcess(cmd, CHILD.returncode, stdout, stderr)
    CHILD = None
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
        if rep.get("marketing") and rep["marketing"].get("by_currency"):
            L += marketing_markdown(rep["marketing"])
        return "\n".join(L) + "\n"
    L += ["", "## Summary", "", "| column | n | mean | sd | min | median | max | skew |", "|---|---|---|---|---|---|---|---|"]
    L += [f"| {n} | {s['n']} | {fmt(s['mean'])} | {fmt(s['sd'])} | {fmt(s['min'])} | {fmt(s['median'])} | {fmt(s['max'])} | {fmt(s['skew'])} |" for n, s in a["summary"].items()]
    L += ["", "## Distributions", ""] + [f"- `{n}` {d['spark']} [{fmt(d['edges'][0])}, {fmt(d['edges'][-1])}]" for n, d in a["distributions"].items()]
    c = a["correlations"]
    L += ["", "## Correlations", ""] + [f"- `{w['code']}` {w['message']}" for w in a.get("warnings", [])]
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
        L += [f"- `{n}`: slope {fmt(v['slope'])} per time unit, r2 {fmt(v['r2'])}, season {('lag ' + str(v['season']['lag']) + ', acf ' + fmt(v['season']['acf'])) if v['season'] else 'none'}{'' if v['regular'] else ', index irregular'}" for n, v in t.items()]
    L += ["", "## Outliers", ""] + [f"- `{n}`: {o['iqr_count']} outside IQR fences, {o['z3_count']} beyond 3 sd" for n, o in a["outliers"].items()]
    L += ["", "## Residuals", ""]
    if "skipped" not in t:
        L += [f"- `{n}` trend residual sd {fmt(v['residuals']['sd'])}, Durbin-Watson {fmt(v['residuals']['durbin_watson'])}" for n, v in t.items()]
    if "skipped" not in p:
        r = p["reconstruction_residual"]
        L.append(f"- PCA rank-{p['k90']} reconstruction error mean {fmt(r['mean'])}, max {fmt(r['max'])}, worst rows {r['worst_rows']}")
    h = rep.get("helix", {})
    if rep.get("marketing") and rep["marketing"].get("by_currency"):
        L += marketing_markdown(rep["marketing"])
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


def marketing_section(args, first: tuple[dict, dict], rest: list[Path]) -> dict | None:
    if args.marketing == "off":
        return None
    tables = [(Path(first[0]["file"]).name, first[1])] if first[1] else []
    forms = []
    for f in rest:
        form, values = verify(f, max(1, args.max_rows), args.sheet)
        forms.append(form)
        if values:
            tables.append((f.name, values))
    section = marketing_run(tables, trend_season) if tables else None
    if section is None and args.marketing == "on":
        section = {"schema": "marketing.v1", "sources": [], "by_currency": {}, "warnings": [{"code": "E_NO_MARKETING", "where": "files", "message": "no file matched a marketing export or held a date and two marketing measures"}]}
    if section is not None:
        section["files"] = [{k: f[k] for k in ("file", "format", "rows", "ok", "errors", "warnings")} for f in forms]
    return section


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="bkt analyze")
    ap.add_argument("files", type=Path, nargs="+")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--verify-only", action="store_true")
    ap.add_argument("--no-helix", action="store_true")
    ap.add_argument("--horizon", type=int, default=3)
    ap.add_argument("--name")
    ap.add_argument("--max-rows", type=int, default=MAX_ROWS)
    ap.add_argument("--sheet", type=int, default=0)
    ap.add_argument("--marketing", choices=("auto", "on", "off"), default="auto")
    ap.add_argument("--quiet-errors", action="store_true")
    ap.add_argument("--out", type=Path, default=None)
    ap.add_argument("--date", default=dt.date.today().isoformat())
    args = ap.parse_args(argv)
    if len(args.files) > MAX_FILES:
        ap.error(f"at most {MAX_FILES} files")
    if args.quiet_errors:
        try:
            return run_main(args)
        except Exception as exc:
            print(json.dumps({"error": "E_INTERNAL", "type": type(exc).__name__}))
            return 4
    return run_main(args)


def run_main(args) -> int:
    path = args.files[0]
    name = args.name or path.stem
    form, values = verify(path, max(1, args.max_rows), args.sheet)
    rep = {"schema": SCHEMA, "name": name, "created": dt.datetime.now().isoformat(timespec="seconds"), "forced": args.force, "form": form}
    if args.verify_only:
        print(json.dumps(rep, default=str))
        return 0 if form["ok"] else 2
    hard_stop = not form["ok"] and (not args.force or not values or not form["numeric"])
    signal.signal(signal.SIGTERM, on_term)
    root = args.out or default_root()
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(root, 0o700)
    out = unique_dir(root, name, args.date)
    out.mkdir(mode=0o700)
    os.chmod(out, 0o700)
    if not hard_stop:
        rep["analysis"] = analyze(form, values)
        rep["helix"] = {"status": "skipped", "reason": "--no-helix"} if args.no_helix else run_helix(form, values, name, out, args.date, args.horizon)
    section = marketing_section(args, (form, values), args.files[1:])
    marketing_ok = bool(section and section.get("by_currency"))
    if section is not None:
        rep["marketing"] = section
    rep["dir"] = str(out)
    rep = clean(rep)
    (out / "report.json").write_text(json.dumps(rep, indent=2, allow_nan=False, default=str))
    (out / "report.md").write_text(markdown(rep))
    print(json.dumps(rep, allow_nan=False, default=str))
    return 0 if marketing_ok or not hard_stop else 2


if __name__ == "__main__":
    sys.exit(main())
