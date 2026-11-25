from __future__ import annotations

import math
import re
from dataclasses import dataclass
from statistics import NormalDist
from typing import Sequence

_N = NormalDist()
DEFAULT_IMPUTED_SE = 0.15
MAX_IMPUTED_SHARE = 0.5
ALPHA = 0.05
POWER = 0.8

_NUM = r"(-?\d*\.?\d+)"
_SMD_RE = re.compile(r"\b(?:hedges'?s? ?g|cohen'?s? ?d|smd|es|g|d)\s*[≈=~:]\s*" + _NUM, re.IGNORECASE)
_SIGMA_RE = re.compile(_NUM + r"\s?(?:σ|sigma|sd\b)", re.IGNORECASE)
_R_RE = re.compile(r"\br\s*[≈=~]\s*" + _NUM, re.IGNORECASE)
_OR_RE = re.compile(r"\bOR\s*[≈=~]\s*" + _NUM)
_CI_RE = re.compile(r"(?:CI[^\d-]*|\[)" + _NUM + r"\s*(?:,|to|–|-)\s*" + _NUM)
_SE_RE = re.compile(r"\bSE\s*=\s*" + _NUM)
_N_RE = re.compile(r"\b[nN]\s*=\s*([\d,]+)")

@dataclass(frozen=True)
class Effect:
    d: float
    se: float
    imputed_se: bool
    source_id: str

def parse_effect(text: str, source_id: str = "") -> Effect | None:
    d: float | None = None
    m = _SMD_RE.search(text)
    if m:
        d = float(m.group(1))
    elif (m := _R_RE.search(text)):
        r = float(m.group(1))
        if abs(r) < 1:
            d = 2 * r / math.sqrt(1 - r * r)
    elif (m := _OR_RE.search(text)):
        o = float(m.group(1))
        if o > 0:
            d = math.log(o) * math.sqrt(3) / math.pi
    elif (m := _SIGMA_RE.search(text)):
        d = float(m.group(1))
    if d is None or not math.isfinite(d):
        return None
    se = _SE_RE.search(text)
    if se and float(se.group(1)) > 0:
        return Effect(d, float(se.group(1)), False, source_id)
    ci = _CI_RE.search(text)
    if ci and m is not None and _SMD_RE.search(text):
        lo, hi = float(ci.group(1)), float(ci.group(2))
        if hi > lo:
            return Effect(d, (hi - lo) / (2 * 1.959964), False, source_id)
    n = _N_RE.search(text)
    if n:
        total = int(n.group(1).replace(",", ""))
        if total > 4:
            return Effect(d, math.sqrt(4 / total + d * d / (2 * total)), False, source_id)
    return Effect(d, DEFAULT_IMPUTED_SE, True, source_id)

def _betacf(a: float, b: float, x: float) -> float:
    qab, qap, qam = a + b, a + 1, a - 1
    c, dd = 1.0, 1 - qab * x / qap
    dd = 1 / (dd if abs(dd) > 1e-30 else 1e-30)
    h = dd
    for m in range(1, 200):
        m2 = 2 * m
        for aa in (m * (b - m) * x / ((qam + m2) * (a + m2)), -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))):
            dd = 1 + aa * dd
            dd = 1 / (dd if abs(dd) > 1e-30 else 1e-30)
            c = 1 + aa / c
            c = c if abs(c) > 1e-30 else 1e-30
            h *= dd * c
        if abs(dd * c - 1) < 1e-12:
            break
    return h

def _betai(a: float, b: float, x: float) -> float:
    if x <= 0:
        return 0.0
    if x >= 1:
        return 1.0
    bt = math.exp(math.lgamma(a + b) - math.lgamma(a) - math.lgamma(b) + a * math.log(x) + b * math.log(1 - x))
    if x < (a + 1) / (a + b + 2):
        return bt * _betacf(a, b, x) / a
    return 1 - bt * _betacf(b, a, 1 - x) / b

def t_two_sided_p(t: float, df: float) -> float:
    return _betai(df / 2, 0.5, df / (df + t * t))

@dataclass(frozen=True)
class MetaResult:
    k: int
    k_imputed_se: int
    pooled: float
    se: float
    ci_low: float | None
    ci_high: float | None
    p: float | None
    tau2: float
    i2: float
    egger_intercept: float | None
    egger_p: float | None
    descriptive: bool = False

    @property
    def imputed_share(self) -> float:
        return self.k_imputed_se / self.k if self.k else 1.0

    def to_dict(self) -> dict:
        return {**self.__dict__, "imputed_share": self.imputed_share}

def egger(effects: Sequence[Effect]) -> tuple[float | None, float | None]:
    if len(effects) < 3:
        return None, None
    x = [1 / e.se for e in effects]
    y = [e.d / e.se for e in effects]
    k = len(x)
    mx, my = sum(x) / k, sum(y) / k
    sxx = sum((xi - mx) ** 2 for xi in x)
    if sxx <= 1e-12:
        return None, None
    slope = sum((xi - mx) * (yi - my) for xi, yi in zip(x, y)) / sxx
    intercept = my - slope * mx
    rss = sum((yi - intercept - slope * xi) ** 2 for xi, yi in zip(x, y))
    df = k - 2
    s2 = rss / df
    se_int = math.sqrt(s2 * (1 / k + mx * mx / sxx))
    if se_int <= 0:
        return intercept, None
    return intercept, t_two_sided_p(intercept / se_int, df)

def random_effects(effects: Sequence[Effect]) -> MetaResult | None:
    if not effects:
        return None
    w = [1 / (e.se ** 2) for e in effects]
    sw = sum(w)
    fixed = sum(wi * e.d for wi, e in zip(w, effects)) / sw
    q = sum(wi * (e.d - fixed) ** 2 for wi, e in zip(w, effects))
    df = len(effects) - 1
    c = sw - sum(wi * wi for wi in w) / sw
    tau2 = max(0.0, (q - df) / c) if df > 0 and c > 0 else 0.0
    i2 = max(0.0, (q - df) / q) if q > 0 and df > 0 else 0.0
    ws = [1 / (e.se ** 2 + tau2) for e in effects]
    pooled = sum(wi * e.d for wi, e in zip(ws, effects)) / sum(ws)
    se = math.sqrt(1 / sum(ws))
    z = pooled / se
    p = 2 * (1 - _N.cdf(abs(z)))
    k_imp = sum(e.imputed_se for e in effects)
    descriptive = len(effects) < 2 or k_imp / len(effects) > MAX_IMPUTED_SHARE
    ei, ep = egger([e for e in effects if not e.imputed_se])
    if descriptive:
        return MetaResult(
            k=len(effects), k_imputed_se=k_imp, pooled=pooled, se=se, ci_low=None, ci_high=None, p=None,
            tau2=tau2, i2=i2, egger_intercept=ei, egger_p=ep, descriptive=True,
        )
    return MetaResult(
        k=len(effects), k_imputed_se=k_imp, pooled=pooled, se=se,
        ci_low=pooled - 1.959964 * se, ci_high=pooled + 1.959964 * se, p=p, tau2=tau2, i2=i2,
        egger_intercept=ei, egger_p=ep,
    )

def benjamini_hochberg(pvalues: Sequence[float | None]) -> list[float | None]:
    idx = sorted((i for i, p in enumerate(pvalues) if p is not None), key=lambda i: pvalues[i])
    m = len(idx)
    out: list[float | None] = [None] * len(pvalues)
    running = 1.0
    for rank in range(m, 0, -1):
        i = idx[rank - 1]
        running = min(running, pvalues[i] * m / rank)
        out[i] = min(1.0, running)
    return out

def n_regression(d: float, alpha: float = ALPHA, power: float = POWER, predictors: int = 1) -> int:
    d = abs(d)
    if d <= 0:
        raise ValueError("effect size must be nonzero")
    r2 = d * d / (d * d + 4)
    f2 = r2 / (1 - r2)
    za, zb = _N.inv_cdf(1 - alpha / 2), _N.inv_cdf(power)
    return math.ceil((za + zb) ** 2 / f2 + predictors + 1)

def n_per_group(d: float, alpha: float = ALPHA, power: float = POWER) -> int:
    d = abs(d)
    if d <= 0:
        raise ValueError("effect size must be nonzero")
    za, zb = _N.inv_cdf(1 - alpha / 2), _N.inv_cdf(power)
    return math.ceil(2 * ((za + zb) / d) ** 2 + 1)
