#!/usr/bin/env python3
"""
research-tools, GeoSummary (REAL geospatial/time-series stats, CPU, no GPU)
============================================================================

Per-field tool for **earth-climate** (earth-climate, 116,840 profiled
researchers, the second-largest field in the corpus). The atlas USERS_NEEDS
roadmap flags reproducible geospatial/time-series workflows as a structural pain:
EO/climate data is huge and heterogeneous, and a non-specialist has no quick way
to get a defensible summary (trend, seasonality, missing-data, spatial extent)
out of a series without writing custom code.

GeoSummary takes a time series (a list of values, optionally with timestamps and
lat/lon coordinates) and computes REAL statistics:

 1. Descriptives + missing-data accounting (count, mean, std, quantiles, % NaN).
 2. TREND, ordinary-least-squares slope over the time index AND the resilient,
 distribution-free Mann-Kendall trend test + Theil-Sen slope estimator
 (the standard climatological trend test; Mann 1945, Kendall 1975, Sen 1968).
 3. SEASONALITY, if a `period` is given (e.g. 12 for monthly data), the
 per-phase climatology (group means by phase), the seasonal amplitude, and
 the fraction of variance explained by the seasonal cycle.
 4. AUTOCORRELATION, lag-1 autocorrelation (a serial-dependence / red-noise
 check that matters for trend significance).
 5. SPATIAL EXTENT, if lat/lon are supplied: bounding box, centroid, and the
 great-circle (haversine) span of the points.

All math is numpy + scipy (linregress, kendalltau, theilslopes), no GPU, no
network. Deterministic; never crashes on malformed input (returns a structured
{"error": ...}).

Input shape (`payload`):
 values : list[float], the series (required; NaN/None allowed → missing)
 times : list, optional timestamps/labels (parallel to values)
 period : int, optional seasonal period (e.g. 12 monthly, 4 quarterly)
 lat, lon : list[float], optional coordinates (parallel to values)

The gateway imports GEO_RUNNERS from here.
"""
from __future__ import annotations

import math
from typing import Any, Optional

import numpy as np
from scipy import stats as _stats


def _to_float_array(v: Any) -> Optional[np.ndarray]:
    if not isinstance(v, (list, tuple)):
        return None
    out = []
    for x in v:
        if x is None:
            out.append(np.nan)
            continue
        try:
            out.append(float(x))
        except Exception:
            out.append(np.nan)
    return np.asarray(out, dtype=float)


def _mann_kendall(x: np.ndarray) -> dict:
    """Mann-Kendall trend test (no-tie normal approximation with tie correction).
 Returns S, the variance-corrected z, two-sided p, and the trend direction.
 Operates on the finite values in index order."""
    n = len(x)
    if n < 4:
        return {"applicable": False, "reason": "need >= 4 finite points"}
    s = 0
    for k in range(n - 1):
        s += np.sum(np.sign(x[k + 1:] - x[k]))
    s = float(s)
    # variance with tie correction
    unique, counts = np.unique(x, return_counts=True)
    tie_term = np.sum(counts * (counts - 1) * (2 * counts + 5))
    var_s = (n * (n - 1) * (2 * n + 5) - tie_term) / 18.0
    if var_s <= 0:
        return {"applicable": False, "reason": "degenerate variance"}
    if s > 0:
        z = (s - 1) / math.sqrt(var_s)
    elif s < 0:
        z = (s + 1) / math.sqrt(var_s)
    else:
        z = 0.0
    p = 2.0 * (1.0 - _stats.norm.cdf(abs(z)))
    direction = "increasing" if s > 0 else ("decreasing" if s < 0 else "no trend")
    return {
        "applicable": True,
        "S": s,
        "z": round(float(z), 5),
        "p_value": round(float(p), 6),
        "trend": direction,
        "significant_at_0.05": bool(p < 0.05),
    }


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in km between two lat/lon points."""
    R = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * R * math.asin(min(1.0, math.sqrt(a)))


def summarize(values: list, times: Any = None, period: Optional[int] = None,
              lat: Any = None, lon: Any = None) -> dict:
    arr = _to_float_array(values)
    if arr is None or arr.size == 0:
        return {"error": "values must be a non-empty numeric array"}
    n_total = arr.size
    finite_mask = np.isfinite(arr)
    finite = arr[finite_mask]
    n_finite = int(finite.size)
    n_missing = int(n_total - n_finite)
    if n_finite == 0:
        return {"error": "no finite values in the series"}

    desc = {
        "n": n_total,
        "n_finite": n_finite,
        "n_missing": n_missing,
        "missing_fraction": round(n_missing / n_total, 6),
        "mean": round(float(np.mean(finite)), 6),
        "std": round(float(np.std(finite, ddof=1)) if n_finite > 1 else 0.0, 6),
        "min": round(float(np.min(finite)), 6),
        "q25": round(float(np.percentile(finite, 25)), 6),
        "median": round(float(np.median(finite)), 6),
        "q75": round(float(np.percentile(finite, 75)), 6),
        "max": round(float(np.max(finite)), 6),
    }

    # ----- trend (OLS over the integer time index of finite points) -----
    idx = np.arange(n_total, dtype=float)[finite_mask]
    trend: dict[str, Any] = {}
    if n_finite >= 3:
        lr = _stats.linregress(idx, finite)
        ts = _stats.theilslopes(finite, idx)
        trend = {
            "ols_slope_per_step": round(float(lr.slope), 8),
            "ols_intercept": round(float(lr.intercept), 6),
            "ols_r_squared": round(float(lr.rvalue ** 2), 6),
            "ols_p_value": round(float(lr.pvalue), 6),
            "theil_sen_slope_per_step": round(float(ts[0]), 8),
            "mann_kendall": _mann_kendall(finite),
        }
    else:
        trend = {"applicable": False, "reason": "need >= 3 finite points for a trend"}

    # ----- autocorrelation (lag-1, on the finite series in order) -----
    autocorr = None
    if n_finite >= 3:
        a0 = finite[:-1] - np.mean(finite)
        a1 = finite[1:] - np.mean(finite)
        denom = np.sum((finite - np.mean(finite)) ** 2)
        autocorr = round(float(np.sum(a0 * a1) / denom), 6) if denom > 0 else 0.0

    # ----- seasonality (only if a period is given) -----
    seasonality: Optional[dict] = None
    if period and isinstance(period, int) and 1 < period <= n_total // 2:
        phase = np.arange(n_total) % period
        phase_means = []
        for ph in range(period):
            sel = finite_mask & (phase == ph)
            vals = arr[sel]
            vals = vals[np.isfinite(vals)]
            phase_means.append(float(np.mean(vals)) if vals.size else float("nan"))
        pm = np.array(phase_means, dtype=float)
        valid_pm = pm[np.isfinite(pm)]
        amplitude = float(np.nanmax(pm) - np.nanmin(pm)) if valid_pm.size else 0.0
        # variance explained by the seasonal climatology
        clim = np.array([phase_means[p] for p in phase], dtype=float)
        resid = arr - clim
        total_var = float(np.nanvar(arr[finite_mask]))
        resid_var = float(np.nanvar(resid[np.isfinite(resid)])) if np.any(np.isfinite(resid)) else 0.0
        var_explained = round(1.0 - resid_var / total_var, 6) if total_var > 0 else 0.0
        seasonality = {
            "period": period,
            "phase_means": [round(x, 6) if math.isfinite(x) else None for x in phase_means],
            "amplitude": round(amplitude, 6),
            "variance_explained_by_season": var_explained,
            "peak_phase": int(np.nanargmax(pm)) if valid_pm.size else None,
            "trough_phase": int(np.nanargmin(pm)) if valid_pm.size else None,
        }

    # ----- spatial extent (only if lat/lon supplied) -----
    spatial: Optional[dict] = None
    la = _to_float_array(lat) if lat is not None else None
    lo = _to_float_array(lon) if lon is not None else None
    if la is not None and lo is not None and la.size and lo.size:
        m = np.isfinite(la) & np.isfinite(lo)
        la_f, lo_f = la[m], lo[m]
        if la_f.size:
            lat_min, lat_max = float(np.min(la_f)), float(np.max(la_f))
            lon_min, lon_max = float(np.min(lo_f)), float(np.max(lo_f))
            cen_lat, cen_lon = float(np.mean(la_f)), float(np.mean(lo_f))
            diag = _haversine(lat_min, lon_min, lat_max, lon_max)
            spatial = {
                "n_points": int(la_f.size),
                "bbox": {"lat_min": lat_min, "lat_max": lat_max, "lon_min": lon_min, "lon_max": lon_max},
                "centroid": {"lat": round(cen_lat, 6), "lon": round(cen_lon, 6)},
                "bbox_diagonal_km": round(diag, 3),
            }

    return {
        "descriptives": desc,
        "trend": trend,
        "lag1_autocorrelation": autocorr,
        "seasonality": seasonality,
        "spatial_extent": spatial,
    }


def _demo_series() -> dict:
    """A known synthetic monthly series (period=12): a clear positive linear
 trend of +0.10/step on top of a sinusoidal seasonal cycle, plus a couple of
 missing values. The trend is strong and increasing (Mann-Kendall significant);
 the seasonal cycle explains a large share of the variance."""
    n = 120  # 10 years monthly
    rng = np.arange(n)
    trend = 0.10 * rng
    season = 5.0 * np.sin(2 * math.pi * rng / 12.0)
    series = (10.0 + trend + season).tolist()
    # plant two missing values
    series[17] = None
    series[58] = None
    lat = [(-54.8 + (i % 3) * 0.5) for i in range(n)]  # ~Punta Arenas region
    lon = [(-68.3 + (i % 4) * 0.5) for i in range(n)]
    return {"values": series, "period": 12, "lat": lat, "lon": lon}


def run_geo_summary(payload: dict) -> dict:
    """payload: { values: [...], times?, period?, lat?, lon? } OR { demo: true }.

 Summarize a geospatial/time-series dataset: descriptives + missing data,
 OLS + Mann-Kendall/Theil-Sen trend, seasonal climatology, lag-1
 autocorrelation, and spatial extent. Real numpy/scipy; never raises.
    """
    demo = bool(payload.get("demo")) or (
        isinstance(payload.get("values"), str) and payload.get("values", "").strip().lower() == "demo"
    )
    if demo:
        d = _demo_series()
        result = summarize(d["values"], period=d["period"], lat=d["lat"], lon=d["lon"])
        if "error" in result:
            return result
        result["demo"] = True
        result["ground_truth"] = {
            "true_trend_slope_per_step": 0.10,
            "trend_is_increasing_and_significant": True,
            "seasonal_period": 12,
            "n_missing_planted": 2,
        }
        result["note"] = (
            "DEMO: 120-month synthetic series = linear +0.10/step trend + a "
            "12-month seasonal cycle + 2 planted missing values. The OLS/Theil-Sen "
            "slope should recover ≈0.10; Mann-Kendall should be "
            "increasing; the seasonal cycle explains a large variance share. "
        )
    else:
        values = payload.get("values")
        if not isinstance(values, (list, tuple)) or len(values) == 0:
            return {"error": 'values must be a non-empty numeric array, or use { "demo": true }'}
        if len(values) > 5_000_000:
            return {"error": "series too large (max 5,000,000 points)"}
        period = payload.get("period")
        try:
            period = int(period) if period is not None else None
        except Exception:
            period = None
        result = summarize(
            values, times=payload.get("times"), period=period,
            lat=payload.get("lat"), lon=payload.get("lon"),
        )
        if "error" in result:
            return result
        result["demo"] = False

    result["method"] = (
        "numpy descriptives + missing-data accounting; trend via OLS "
        "(scipy.linregress) AND the distribution-free Mann-Kendall test + "
        "Theil-Sen slope (the standard climatological trend test); lag-1 "
        "autocorrelation; per-phase seasonal climatology + variance explained "
        "(when a period is given); haversine spatial extent (when lat/lon given). "
        "No GPU, no network."
    )
    result.setdefault("note", "")
    result["note"] += (
        "Field tool for earth-climate: a quick, defensible, reproducible summary "
        "of a time/space series for non-specialists. Mann-Kendall is robust to "
        "non-normality; check the lag-1 autocorrelation before trusting trend "
        "p-values (serial dependence inflates significance)."
    )
    return result


# Registry the gateway imports.
GEO_RUNNERS = {
    "geosummary": run_geo_summary,
}
