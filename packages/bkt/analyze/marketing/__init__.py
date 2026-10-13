from __future__ import annotations

from typing import Callable

from .adapters import detect
from .metrics import compute
from .schema import SCHEMA, normalize

CITATIONS = {
    "ctr": "[bm:BucketMath.Marketing.ctr]", "cpc": "[bm:BucketMath.Marketing.cpc]", "cpa": "[bm:BucketMath.Marketing.cpa_mul]",
    "roas": "[bm:BucketMath.Marketing.roas_ge_one_iff]", "cac": "[bm:BucketMath.Marketing.cac]", "ltv_hist": "[bm:BucketMath.Marketing.ltvHist]",
    "retention": "[bm:BucketMath.Marketing.retention_le_one]", "share": "[bm:BucketMath.Marketing.mix_sum_one]",
    "last_touch": "[bm:BucketMath.Marketing.last_touch_conserves]", "linear": "[bm:BucketMath.Marketing.linear_conserves]",
    "trend": "[bm:BucketMath.Project.pythagoras_orthonormal]",
    "season": "[empirical: 2/sqrt(n) white-noise bound, Box and Jenkins 1976, chosen parameter]",
    "anomalies": "[empirical: median-MAD z cutoff 3.5, Iglewicz and Hoaglin 1993, chosen parameter]",
}


def run(tables: list[tuple[str, dict[str, list]]], trend: Callable) -> dict | None:
    sources = []
    ad: list[dict] = []
    txn: list[dict] = []
    warnings: list[dict] = []
    for name, values in tables:
        adapter, mapping, score = detect(list(values))
        if adapter is None:
            sources.append({"file": name, "platform": None, "grain": None})
            continue
        a, t, w = normalize(values, adapter, mapping)
        ad.extend(a)
        txn.extend(t)
        warnings.extend({**x, "where": f"{name}: {x['where']}"} for x in w)
        sources.append({"file": name, "platform": adapter.platform, "grain": adapter.grain, "score": score, "columns": mapping, "rows": len(a) + len(t)})
    if not ad and not txn:
        return None
    known = sorted({r["currency"] for r in ad + txn} - {"unknown"})
    if len(known) == 1 and any(r["currency"] == "unknown" for r in ad + txn):
        for r in ad + txn:
            if r["currency"] == "unknown":
                r["currency"] = known[0]
        warnings.append({"code": "W_CURRENCY_ASSUMED", "where": "files", "message": f"files with no currency column are read as {known[0]}, the one currency the other files name"})
    currencies = sorted({r["currency"] for r in ad + txn})
    if len(currencies) > 1:
        warnings.append({"code": "W_MIXED_CURRENCY", "where": "files", "message": f"money in {', '.join(currencies)}; metrics are reported per currency with no conversion"})
    by_currency = {c: compute([r for r in ad if r["currency"] == c], [t for t in txn if t["currency"] == c], trend) for c in currencies}
    primary = max(currencies, key=lambda c: sum(1 for r in ad + txn if r["currency"] == c))
    return {"schema": SCHEMA, "sources": sources, "primary_currency": primary, "by_currency": by_currency, "warnings": warnings,
            "citations": CITATIONS, "date_rule": "timestamps with an offset count on their UTC day; naive timestamps keep their written day"}
