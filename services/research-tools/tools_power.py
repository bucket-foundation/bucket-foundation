#!/usr/bin/env python3
"""
research-tools, PowerPlan (REAL statistical power / sample-size, CPU, no GPU)
==============================================================================

Per-field/universal tool, for **econ-social** and **biomed-bio**
(but every field that reports inferential statistics needs it). Underpowered
studies are a primary driver of the reproducibility crisis the atlas
USERS_NEEDS roadmap flags as "most acute" in econ-social, and a priori power /
sample-size planning is exactly the funder- and IRB-mandated step researchers
most skip or get wrong.

PowerPlan solves the power equation for any one missing quantity given the
others, for the common designs:

 test = "two_sample_t", two-sample (independent) t-test, Cohen's d
 test = "one_sample_t", one-sample / paired t-test, Cohen's d
 test = "anova", one-way ANOVA, Cohen's f over `k_groups` groups
 test = "two_proportion", difference of two proportions (p1 vs p2)
 test = "correlation", Pearson correlation, H0: rho = 0

solve_for ∈ {"n", "power", "effect_size", "alpha"}, give the other three (plus
the design knobs) and it returns the fourth. The math is REAL noncentral-
distribution power (scipy.stats noncentral t / F; normal-approximation for
proportions and the Fisher-z transform for correlation), the same closed forms
as G*Power / statsmodels.stats.power, recomputed here with scipy + a bisection
root-finder. Deterministic; never crashes on malformed input.

Input shape (`payload`):
 test : str (one of the five above; default "two_sample_t")
 solve_for : str ("n" | "power" | "effect_size" | "alpha"; default "n")
 effect_size : float (Cohen's d / f / r, or for proportions use p1+p2)
 alpha : float (default 0.05)
 power : float (default 0.80)
 n : float (per-group n for t/ANOVA/proportions; total for corr)
 tails : int (1 or 2; default 2; ignored for ANOVA)
 k_groups : int (ANOVA only; default 3)
 p1, p2 : float (two_proportion only, effect_size derived from these)
 ratio : float (two_sample_t / two_proportion allocation n2/n1; default 1)

The gateway imports POWER_RUNNERS from here.
"""
from __future__ import annotations

import math
from typing import Any, Callable, Optional

from scipy import stats as _stats


# ---------------------------------------------------------------------------
# power functions (REAL noncentral-distribution / closed-form), each returns
# achieved power in [0,1] for the given (effect_size, n, alpha, …).
# ---------------------------------------------------------------------------
def _power_two_sample_t(d: float, n: float, alpha: float, tails: int = 2, ratio: float = 1.0) -> float:
    """Independent two-sample t-test. n = per-group n of group 1; n2 = ratio*n."""
    n1 = n
    n2 = ratio * n
    if n1 < 2 or n2 < 2:
        return 0.0
    df = n1 + n2 - 2
    # noncentrality λ = d * sqrt( (n1*n2)/(n1+n2) )
    ncp = d * math.sqrt((n1 * n2) / (n1 + n2))
    return _t_power_from_ncp(abs(ncp), df, alpha, tails)


def _power_one_sample_t(d: float, n: float, alpha: float, tails: int = 2) -> float:
    if n < 2:
        return 0.0
    df = n - 1
    ncp = d * math.sqrt(n)
    return _t_power_from_ncp(abs(ncp), df, alpha, tails)


def _t_power_from_ncp(ncp: float, df: float, alpha: float, tails: int) -> float:
    if df <= 0:
        return 0.0
    if tails == 2:
        tcrit = _stats.t.ppf(1.0 - alpha / 2.0, df)
        # power = P(T' > tcrit) + P(T' < -tcrit) under noncentral t
        upper = _stats.nct.sf(tcrit, df, ncp)
        lower = _stats.nct.cdf(-tcrit, df, ncp)
        return float(min(1.0, max(0.0, upper + lower)))
    tcrit = _stats.t.ppf(1.0 - alpha, df)
    return float(min(1.0, max(0.0, _stats.nct.sf(tcrit, df, ncp))))


def _power_anova(f: float, n: float, alpha: float, k_groups: int = 3) -> float:
    """One-way ANOVA, Cohen's f, per-group n. Noncentral F."""
    if n < 2 or k_groups < 2:
        return 0.0
    N = n * k_groups
    df1 = k_groups - 1
    df2 = N - k_groups
    if df2 <= 0:
        return 0.0
    ncp = (f ** 2) * N
    fcrit = _stats.f.ppf(1.0 - alpha, df1, df2)
    return float(min(1.0, max(0.0, _stats.ncf.sf(fcrit, df1, df2, ncp))))


def _power_two_proportion(p1: float, p2: float, n: float, alpha: float, tails: int = 2, ratio: float = 1.0) -> float:
    """Two-proportion z-test (normal approximation, unpooled). n = group-1 n."""
    n1 = n
    n2 = ratio * n
    if n1 < 1 or n2 < 1:
        return 0.0
    diff = abs(p1 - p2)
    if diff == 0:
        return alpha
    pbar = (n1 * p1 + n2 * p2) / (n1 + n2)
    se_null = math.sqrt(pbar * (1 - pbar) * (1.0 / n1 + 1.0 / n2))
    se_alt = math.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2)
    if se_alt == 0 or se_null == 0:
        return 0.0
    zalpha = _stats.norm.ppf(1.0 - alpha / (2.0 if tails == 2 else 1.0))
    z = (diff - zalpha * se_null) / se_alt
    return float(min(1.0, max(0.0, _stats.norm.cdf(z))))


def _power_correlation(r: float, n: float, alpha: float, tails: int = 2) -> float:
    """Pearson correlation, H0: rho=0, Fisher z-transform (normal approx)."""
    if n < 4 or abs(r) >= 1.0:
        return 0.0
    z_r = 0.5 * math.log((1 + r) / (1 - r))  # Fisher z
    se = 1.0 / math.sqrt(n - 3)
    zalpha = _stats.norm.ppf(1.0 - alpha / (2.0 if tails == 2 else 1.0))
    z = abs(z_r) / se - zalpha
    return float(min(1.0, max(0.0, _stats.norm.cdf(z))))


# ---------------------------------------------------------------------------
# generic bisection root-finder for the "solve for X" inversion
# ---------------------------------------------------------------------------
def _bisect(fn: Callable[[float], float], target: float, lo: float, hi: float,
            tol: float = 1e-6, max_iter: int = 300, integer: bool = False) -> Optional[float]:
    """Find the smallest x in [lo,hi] with fn(x) >= target, assuming fn is
 monotonic increasing in x over the bracket. Returns None if not bracketed.

 Brackets on x-WIDTH (not on |fn-target|): the power function saturates to 1.0
 at large x, so a |fn-target| stopping rule would halt in the flat region and
 return a hugely-inflated x. We narrow until b-a is below x_tol, then round."""
    flo, fhi = fn(lo) - target, fn(hi) - target
    if flo >= 0:
        return lo  # target already met at the smallest x
    if fhi < 0:
        return None  # cannot reach target even at hi
    a, b = lo, hi
    # x-width tolerance: for integers we just need < 1; for continuous, tol.
    x_tol = 0.5 if integer else tol
    for _ in range(max_iter):
        if (b - a) <= x_tol:
            break
        mid = 0.5 * (a + b)
        if fn(mid) - target < 0:
            a = mid
        else:
            b = mid
    x = b  # smallest bracket end that meets/exceeds the target
    if integer:
        x = math.ceil(x)
        while x > lo and fn(x - 1) >= target:
            x -= 1  # tighten down to the true minimum integer
        while fn(x) < target and x < hi:
            x += 1
    return x


def _smallest_n(power_fn: Callable[[float], float], target: float,
                n_min: int = 2, n_cap: int = 1_000_000) -> Optional[int]:
    """Smallest integer n with power_fn(n) >= target.

 Handles two real numerical hazards: (1) the power function SATURATES to 1.0
 for large n (a |power-target| stopping rule would halt in the flat region),
 and (2) scipy's noncentral t/F can break down (return ~0) at large
 noncentrality, making the raw function non-monotonic in the far field. We
 therefore exponentially bracket up to the FIRST n that meets the target
 (scanning low→high, where the distributions are well-conditioned), then do an
 integer bisection inside that bracket where monotonicity holds."""
    if power_fn(n_min) >= target:
        return n_min
    lo, hi = n_min, n_min
    step = 2
    # exponential search for an n that meets the target (stay in the
    # well-conditioned low-n region first; this finds the crossing before the
    # far-field breakdown can mislead us).
    while hi < n_cap:
        nxt = min(hi + step, n_cap)
        if power_fn(nxt) >= target:
            hi = nxt
            break
        lo = nxt
        step = min(step * 2, 50_000)
        hi = nxt
    else:
        return None
    if power_fn(hi) < target:
        return None
    # integer bisection in [lo, hi] (power is monotone increasing here).
    a, b = lo, hi
    while b - a > 1:
        mid = (a + b) // 2
        if power_fn(mid) >= target:
            b = mid
        else:
            a = mid
    return b


# ---------------------------------------------------------------------------
# dispatch: build the power(·) closure for a test, then solve for the missing
# quantity by direct evaluation (power) or bisection (n / effect_size / alpha).
# ---------------------------------------------------------------------------
def _f(x: Any, default: float = 0.0) -> float:
    try:
        return float(x)
    except Exception:
        return default


def plan_power(payload: dict) -> dict:
    test = (payload.get("test") or "two_sample_t").strip().lower()
    solve_for = (payload.get("solve_for") or "n").strip().lower()
    alpha = _f(payload.get("alpha"), 0.05)
    power = _f(payload.get("power"), 0.80)
    n = _f(payload.get("n"), 0.0)
    es = _f(payload.get("effect_size"), 0.0)
    tails = int(_f(payload.get("tails"), 2)) or 2
    ratio = _f(payload.get("ratio"), 1.0) or 1.0
    k_groups = int(_f(payload.get("k_groups"), 3)) or 3
    p1 = _f(payload.get("p1"), 0.0)
    p2 = _f(payload.get("p2"), 0.0)

    valid_tests = {"two_sample_t", "one_sample_t", "anova", "two_proportion", "correlation"}
    if test not in valid_tests:
        return {"error": f"test must be one of {sorted(valid_tests)}"}
    if solve_for not in ("n", "power", "effect_size", "alpha"):
        return {"error": 'solve_for must be one of "n", "power", "effect_size", "alpha"'}
    if tails not in (1, 2):
        tails = 2
    if not (0.0 < alpha < 1.0) and solve_for != "alpha":
        return {"error": "alpha must be in (0, 1)"}
    if not (0.0 < power < 1.0) and solve_for != "power":
        return {"error": "power must be in (0, 1)"}

    # build the power closure power_of(n, es, alpha) for this test.
    if test == "two_sample_t":
        def power_of(n_, es_, a_):
            return _power_two_sample_t(es_, n_, a_, tails, ratio)
        es_name, n_meaning = "Cohen's d", "per-group sample size (group 1)"
    elif test == "one_sample_t":
        def power_of(n_, es_, a_):
            return _power_one_sample_t(es_, n_, a_, tails)
        es_name, n_meaning = "Cohen's d", "sample size (or number of pairs)"
    elif test == "anova":
        def power_of(n_, es_, a_):
            return _power_anova(es_, n_, a_, k_groups)
        es_name, n_meaning = "Cohen's f", f"per-group sample size ({k_groups} groups)"
    elif test == "two_proportion":
        if solve_for == "effect_size":
            return {"error": "for two_proportion, give p1 and p2 (effect size is derived); solve for n, power, or alpha"}
        if not (0.0 <= p1 <= 1.0 and 0.0 <= p2 <= 1.0):
            return {"error": "p1 and p2 must be in [0, 1]"}

        def power_of(n_, es_, a_):
            return _power_two_proportion(p1, p2, n_, a_, tails, ratio)
        es = abs(p1 - p2)
        es_name, n_meaning = "|p1 − p2| (Cohen's h not used; raw risk difference)", "per-group sample size (group 1)"
    else:  # correlation
        def power_of(n_, es_, a_):
            return _power_correlation(es_, n_, a_, tails)
        es_name, n_meaning = "Pearson r", "total sample size"

    out: dict[str, Any] = {
        "test": test,
        "solve_for": solve_for,
        "alpha": round(alpha, 6),
        "power": round(power, 6),
        "effect_size": round(es, 6),
        "effect_size_name": es_name,
        "tails": tails,
        "n_meaning": n_meaning,
    }
    if test == "two_sample_t" or test == "two_proportion":
        out["allocation_ratio_n2_over_n1"] = round(ratio, 4)
    if test == "anova":
        out["k_groups"] = k_groups
    if test == "two_proportion":
        out["p1"], out["p2"] = round(p1, 6), round(p2, 6)

    # ----- solve -----
    if solve_for == "power":
        if n < 2 or es == 0:
            return {"error": "to solve for power, supply effect_size and n (>1)"}
        out["power"] = round(power_of(n, es, alpha), 6)
        out["n"] = n
        out["result"] = {"power": out["power"]}
    elif solve_for == "n":
        if es == 0:
            return {"error": "to solve for n, supply a non-zero effect_size (or p1≠p2)"}
        n_sol = _smallest_n(lambda nn: power_of(nn, es, alpha), power)
        if n_sol is None:
            return {"error": "required n exceeds 1,000,000 — effect size may be ~0 or power target unreachable"}
        out["n"] = int(n_sol)
        out["achieved_power"] = round(power_of(n_sol, es, alpha), 6)
        # total N where meaningful
        if test in ("two_sample_t", "two_proportion"):
            out["total_N"] = int(math.ceil(n_sol + ratio * n_sol))
        elif test == "anova":
            out["total_N"] = int(n_sol * k_groups)
        out["result"] = {"n": out["n"], "achieved_power": out["achieved_power"]}
    elif solve_for == "effect_size":
        if n < 2:
            return {"error": "to solve for the minimum detectable effect size, supply n (>1)"}
        es_sol = _bisect(lambda e: power_of(n, e, alpha), power, 1e-4, 50.0, tol=1e-7)
        if es_sol is None:
            return {"error": "no detectable effect size found in range for that n/power"}
        out["effect_size"] = round(es_sol, 6)
        out["n"] = n
        out["minimum_detectable_effect"] = round(es_sol, 6)
        out["result"] = {"minimum_detectable_effect_size": out["minimum_detectable_effect"]}
    else:  # alpha
        if n < 2 or es == 0:
            return {"error": "to solve for alpha, supply effect_size and n (>1)"}
        a_sol = _bisect(lambda a: power_of(n, es, a), power, 1e-6, 0.5, tol=1e-7)
        if a_sol is None:
            return {"error": "no alpha in (0, 0.5) reaches that power for the given n/effect"}
        out["alpha"] = round(a_sol, 6)
        out["n"] = n
        out["result"] = {"alpha": out["alpha"]}

    out["method"] = (
        "Closed-form power via scipy: noncentral-t for t-tests, noncentral-F for "
        "one-way ANOVA (Cohen's f), normal-approximation z-test for two proportions, "
        "and the Fisher z-transform for Pearson correlation. The missing quantity is "
        "found by monotone bisection on the power function, the same equations as "
        "G*Power / statsmodels. Deterministic, no simulation."
    )
    out["note"] = (
        "Universal tool (esp. econ-social + biomed): underpowered designs drive the "
        "reproducibility crisis. A priori power analysis is funder/IRB-expected. "
        "Effect sizes are Cohen conventions where relevant (d: 0.2/0.5/0.8 small/medium/large; "
        "f: 0.10/0.25/0.40; r: 0.10/0.30/0.50), justify yours from prior work rather than the convention."
    )
    return out


def run_power_plan(payload: dict) -> dict:
    """payload: power/sample-size spec, or { demo: true }.

 Solve the power equation for n / power / effect_size / alpha for t-tests,
 ANOVA, two proportions, and correlation. Real scipy noncentral-distribution
 math; deterministic; never raises on malformed input.
    """
    if bool(payload.get("demo")) or (isinstance(payload.get("test"), str) and payload.get("test", "").strip().lower() == "demo"):
        # Textbook: two-sample t-test, d=0.5, alpha=.05 (two-tailed), power=.80 →
        # n ≈ 64 PER GROUP (Cohen 1988 / G*Power). Solve for n.
        result = plan_power({
            "test": "two_sample_t", "solve_for": "n",
            "effect_size": 0.5, "alpha": 0.05, "power": 0.80, "tails": 2,
        })
        if "error" in result:
            return result
        result["demo"] = True
        result["ground_truth"] = {
            "design": "two-sample t-test, Cohen's d = 0.5, α = .05 (two-tailed), power = .80",
            "expected_n_per_group": 64,
            "source": "Cohen 1988 / G*Power textbook value",
        }
        result["note"] = (
            "DEMO: the canonical medium-effect two-sample t-test, d=0.5, α=.05 "
            "two-tailed, 80% power → 64 per group (the textbook G*Power value). "
            + result["note"]
        )
        return result

    result = plan_power(payload)
    result.setdefault("demo", False)
    return result


# Registry the gateway imports.
POWER_RUNNERS = {
    "powerplan": run_power_plan,
}
