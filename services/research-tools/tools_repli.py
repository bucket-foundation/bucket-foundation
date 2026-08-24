#!/usr/bin/env python3
"""
research-tools, RepliCheck (REAL statistics reproducibility, CPU, no GPU)
==========================================================================

The second of the two ALL-FIELD horizontal research tools (with FAIRCheck).
Statistics reproducibility is funder-mandated and journal-mandated across every
discipline that reports inferential statistics, so RepliCheck serves the whole
1.17M-researcher corpus across every field.

Given reported statistics (pasted Results text, or explicit fields), RepliCheck
runs REAL reproducibility checks:

 1. statcheck-style p-value recomputation
 ----------------------------------------------------------------------
 Parse t / F / χ² / r + degrees-of-freedom + reported p from text, recompute
 the p-value from the test statistic and df using scipy.stats, and flag
 INCONSISTENCIES (reported p does not match the statistic) and GROSS errors
 (the inconsistency even flips the significance decision at α). This is the
 algorithm of Nuijten et al. 2016, "The prevalence of statistical reporting
 errors in psychology (1985-2013)", Behav. Res. Methods 48:1205, the
 `statcheck` R package, reimplemented in scipy.

 2. GRIM test (Granularity-Related Inconsistency of Means)
 ----------------------------------------------------------------------
 For a reported mean of integer-valued items over N observations, the mean
 MUST be one of the N+1 achievable values k/N (k = 0..N·range). If the
 reported mean (at its decimal granularity) is not achievable for that N, it
 is mathematically impossible. Brown & Heathers 2017, "The GRIM test", Soc.
 Psychol. Personal. Sci. 8:363. Reimplemented exactly.

 3. Reporting-completeness flags
 ----------------------------------------------------------------------
 Missing multiple-comparison correction (many p-values, no Bonferroni/FDR/
 Holm mentioned), missing confidence intervals / effect sizes, and an
 underpowered-design hint (small N with a "non-significant" framing).

Parsing is regex over the pasted Results text (t/F/χ²/r + df + p). Recomputation
is real scipy.stats. Everything is deterministic and NEVER crashes on malformed
input, it returns a structured {"error":...} or reports "no statistics
found", and skips any single token it cannot parse without aborting the run.

The gateway imports REPLI_RUNNERS from here.
"""
from __future__ import annotations

import re
from typing import Any, Optional

from scipy import stats as _stats


# ---------------------------------------------------------------------------
# 1. statcheck-style parsing + recomputation
# ---------------------------------------------------------------------------
_NUM = r"[-+]?\d*\.?\d+"

# t(df) = stat, p (rel|=|<|>) value e.g. t(24) = 2.13, p = .04
RE_T = re.compile(
    r"\bt\s*\(\s*(?P<df>" + _NUM + r")\s*\)\s*=\s*(?P<stat>" + _NUM + r")"
    r"\s*,?\s*p\s*(?P<rel>[<>=≤≥]+)\s*(?P<p>" + _NUM + r")",
    re.I,
)
# F(df1, df2) = stat, p ... e.g. F(2, 36) = 5.40, p = .009
RE_F = re.compile(
    r"\bF\s*\(\s*(?P<df1>" + _NUM + r")\s*,\s*(?P<df2>" + _NUM + r")\s*\)\s*=\s*(?P<stat>" + _NUM + r")"
    r"\s*,?\s*p\s*(?P<rel>[<>=≤≥]+)\s*(?P<p>" + _NUM + r")",
    re.I,
)
# χ²(df[, N=...]) = stat, p ... accepts chi2 / χ2 / X2 ; optional, N = ...
RE_CHI = re.compile(
    r"(?:χ2|χ²|chi2|chi-?square|x2|X2)\s*\(\s*(?P<df>" + _NUM + r")\s*(?:,\s*N\s*=\s*" + _NUM + r")?\s*\)\s*=\s*(?P<stat>" + _NUM + r")"
    r"\s*,?\s*p\s*(?P<rel>[<>=≤≥]+)\s*(?P<p>" + _NUM + r")",
    re.I,
)
# r(df) = stat, p ... e.g. r(48) = .34, p = .017
RE_R = re.compile(
    r"\br\s*\(\s*(?P<df>" + _NUM + r")\s*\)\s*=\s*(?P<stat>" + _NUM + r")"
    r"\s*,?\s*p\s*(?P<rel>[<>=≤≥]+)\s*(?P<p>" + _NUM + r")",
    re.I,
)

_REL_NORMAL = {"≤": "<=", "≥": ">=", "<=": "<=", ">=": ">=", "<": "<", ">": ">", "=": "="}


def _to_float(s: str) -> Optional[float]:
    try:
        return float(s)
    except Exception:
        return None


def recompute_p(test: str, stat: float, df1: float, df2: Optional[float] = None) -> Optional[float]:
    """Recompute a two-tailed p-value from a test statistic + df. Real scipy.

 t : two-tailed Student-t survival, 2 * sf(|t|, df)
 F : upper-tail F survival, sf(F, df1, df2)
 chi: upper-tail chi-square survival, sf(chi2, df)
 r : convert to t = r*sqrt(df/(1-r^2)) then two-tailed t
    """
    try:
        if test == "t":
            return float(2.0 * _stats.t.sf(abs(stat), df1))
        if test == "F":
            if df2 is None:
                return None
            return float(_stats.f.sf(stat, df1, df2))
        if test == "chi":
            return float(_stats.chi2.sf(stat, df1))
        if test == "r":
            if abs(stat) >= 1.0 or df1 <= 0:
                return None
            t = stat * ((df1 / (1.0 - stat * stat)) ** 0.5)
            return float(2.0 * _stats.t.sf(abs(t), df1))
    except Exception:
        return None
    return None


def _decide(rel: str, reported_p: float, computed_p: float, alpha: float = 0.05) -> tuple[bool, bool]:
    """statcheck consistency rules. Returns (consistent, gross_error).

 A result is CONSISTENT if the reported relation holds for the computed p
 (within rounding to the reported precision). GROSS = the (in)consistency
 flips the significance decision at alpha.
    """
    rel = _REL_NORMAL.get(rel, rel)
    # round computed to the reported decimals for "=" comparisons
    if rel == "=":
        # match at the granularity the author reported (e.g. .04 -> 2 dp)
        consistent = round(computed_p, 3) == round(reported_p, 3) or abs(computed_p - reported_p) <= 0.5 * 10 ** (-_decimals(reported_p))
    elif rel == "<":
        consistent = computed_p < reported_p or abs(computed_p - reported_p) <= 1e-4
    elif rel == "<=":
        consistent = computed_p <= reported_p + 1e-4
    elif rel == ">":
        consistent = computed_p > reported_p or abs(computed_p - reported_p) <= 1e-4
    elif rel == ">=":
        consistent = computed_p >= reported_p - 1e-4
    else:
        consistent = abs(computed_p - reported_p) <= 0.01
    # gross: significance decision differs
    reported_sig = (reported_p < alpha) if rel in ("=", "<", "<=") else (reported_p <= alpha)
    computed_sig = computed_p < alpha
    gross = (not consistent) and (reported_sig != computed_sig)
    return bool(consistent), bool(gross)


def _decimals(x: float) -> int:
    s = repr(x)
    return len(s.split(".")[1]) if "." in s else 0


def parse_statistics(text: str) -> list[dict]:
    """Parse t/F/χ²/r + df + reported p from Results text. Pure, never raises."""
    found: list[dict] = []
    plan = [
        ("t", RE_T, lambda m: (m.group("stat"), m.group("df"), None)),
        ("F", RE_F, lambda m: (m.group("stat"), m.group("df1"), m.group("df2"))),
        ("chi", RE_CHI, lambda m: (m.group("stat"), m.group("df"), None)),
        ("r", RE_R, lambda m: (m.group("stat"), m.group("df"), None)),
    ]
    for test, pat, getter in plan:
        for m in pat.finditer(text):
            stat_s, df1_s, df2_s = getter(m)
            stat = _to_float(stat_s)
            df1 = _to_float(df1_s)
            df2 = _to_float(df2_s) if df2_s is not None else None
            rep_p = _to_float(m.group("p"))
            if stat is None or df1 is None or rep_p is None:
                continue
            found.append({
                "test": test,
                "raw": m.group(0).strip(),
                "statistic": stat,
                "df1": df1,
                "df2": df2,
                "rel": _REL_NORMAL.get(m.group("rel"), m.group("rel")),
                "reported_p": rep_p,
            })
    return found


def check_statistics(text: str, alpha: float = 0.05) -> list[dict]:
    """Recompute every parsed statistic and decide consistency. Pure."""
    out: list[dict] = []
    for s in parse_statistics(text):
        computed = recompute_p(s["test"], s["statistic"], s["df1"], s["df2"])
        if computed is None:
            out.append({**s, "computed_p": None, "verdict": "unparseable", "consistent": None})
            continue
        consistent, gross = _decide(s["rel"], s["reported_p"], computed, alpha)
        verdict = "consistent" if consistent else ("DECISION ERROR" if gross else "inconsistent")
        out.append({
            **s,
            "computed_p": round(computed, 5),
            "consistent": consistent,
            "gross_error": gross,
            "verdict": verdict,
        })
    return out


# ---------------------------------------------------------------------------
# 2. GRIM test
# ---------------------------------------------------------------------------
# mean(SD)? of an integer-item scale, N = ... e.g. M = 3.45, SD = 1.2, N = 28
RE_MEAN_N = re.compile(
    r"\b(?:M|mean)\s*=\s*(?P<mean>" + _NUM + r")"
    r"(?:[^.\n]*?(?:SD|sd)\s*=\s*" + _NUM + r")?"
    r"[^.\n]*?\b[nN]\s*=\s*(?P<n>\d+)",
    re.I,
)


def grim_consistent(mean: float, n: int, items: int = 1, decimals: Optional[int] = None) -> bool:
    """GRIM test: is `mean` achievable as (integer sum)/(n*items)?

 For integer-valued measurements, the achievable means at granularity 10^-d
 are k/(n*items) rounded to d decimals. The reported mean is GRIM-consistent
 iff some integer numerator reproduces it. Pure, exact (Brown & Heathers 2017).
    """
    if n <= 0 or items <= 0:
        return True  # cannot test
    d = decimals if decimals is not None else _decimals(mean)
    if d == 0:
        return True  # no granularity to exploit
    denom = n * items
    # round-half-to-even matches how journals round; test both the
    # floor and ceil candidate numerators around mean*denom.
    target = round(mean, d)
    base = mean * denom
    for k in (int(base) - 1, int(base), int(base) + 1, round(base)):
        if k < 0:
            continue
        if round(k / denom, d) == target:
            return True
    return False


def parse_means(text: str) -> list[dict]:
    """Parse 'M = x... N = n' patterns for GRIM. Pure, never raises."""
    out: list[dict] = []
    for m in RE_MEAN_N.finditer(text):
        mean = _to_float(m.group("mean"))
        n = _to_float(m.group("n"))
        if mean is None or n is None:
            continue
        out.append({"raw": m.group(0).strip(), "mean": mean, "n": int(n)})
    return out


def check_grim(text: str, items: int = 1) -> list[dict]:
    """Run GRIM over every parsed mean/N pair. Pure.

 Only means with at least one decimal of granularity are testable (GRIM has
 no power on whole-number means). `items` = number of integer items averaged
 (1 for a single integer measure)."""
    out: list[dict] = []
    for mp in parse_means(text):
        d = _decimals(mp["mean"])
        if d == 0:
            out.append({**mp, "grim_testable": False, "verdict": "not testable (no decimals)"})
            continue
        ok = grim_consistent(mp["mean"], mp["n"], items=items, decimals=d)
        out.append({
            **mp,
            "decimals": d,
            "items": items,
            "grim_testable": True,
            "grim_consistent": ok,
            "verdict": "consistent" if ok else "GRIM-IMPOSSIBLE",
        })
    return out


# ---------------------------------------------------------------------------
# 3. Reporting-completeness flags
# ---------------------------------------------------------------------------
_CORRECTION = re.compile(
    r"\b(bonferroni|holm|hochberg|benjamini|hochberg|fdr|false discovery|"
    r"sidak|šidák|tukey|scheff[eé]|family[\s-]?wise|corrected for multiple|"
    r"multiple comparison|adjusted p)\b",
    re.I,
)
_CI = re.compile(r"\b\d{1,3}\s*%?\s*CI\b|\bconfidence interval", re.I)
_EFFECT = re.compile(
    r"\bcohen'?s?\s*d\b|\bhedges'?\s*g\b|\bη2|\beta[\s-]?squared\b|\bpartial\s*η|"
    r"\bomega[\s-]?squared\b|\bcramer'?s?\s*v\b|\bodds ratio\b|\bOR\s*=|\br2\b|"
    r"\beffect size\b|\bd\s*=\s*" + _NUM,
    re.I,
)
_NONSIG = re.compile(r"\b(non[\s-]?significant|not significant|no (?:significant )?(?:difference|effect)|n\.?s\.?)\b", re.I)


def completeness_flags(text: str, stats_rows: list[dict], means_rows: list[dict]) -> list[dict]:
    """Reporting-completeness checks. Pure."""
    flags: list[dict] = []
    n_p = len(stats_rows)
    has_corr = bool(_CORRECTION.search(text))
    if n_p >= 3 and not has_corr:
        flags.append({
            "flag": "missing_multiple_comparison_correction",
            "severity": "high" if n_p >= 6 else "medium",
            "detail": f"{n_p} inferential p-values reported with no multiple-comparison correction (Bonferroni/Holm/FDR) mentioned.",
        })
    if stats_rows and not _CI.search(text):
        flags.append({
            "flag": "missing_confidence_intervals",
            "severity": "medium",
            "detail": "Test statistics reported without confidence intervals (most journals/funders now require interval estimates).",
        })
    if stats_rows and not _EFFECT.search(text):
        flags.append({
            "flag": "missing_effect_sizes",
            "severity": "medium",
            "detail": "No standardized effect size (Cohen's d, η², r², odds ratio…) reported alongside the significance tests.",
        })
    # underpowered hint: a small-N design + a 'non-significant' framing
    small_ns = [m["n"] for m in means_rows if m["n"] < 20] + [
        int(r["df1"]) + 2 for r in stats_rows if r["test"] == "t" and r["df1"] < 18
    ]
    if small_ns and _NONSIG.search(text):
        flags.append({
            "flag": "possible_underpowered_design",
            "severity": "high",
            "detail": f"A non-significant result is reported with a small sample (n≈{min(small_ns)}); absence of evidence here is likely low power, not evidence of absence.",
        })
    return flags


# ---------------------------------------------------------------------------
# orchestration
# ---------------------------------------------------------------------------
def _demo_text() -> str:
    """Known mini Results section with planted reproducibility errors, all
 verifiable by hand (see ground_truth):
 * t(24) = 2.13, p = .002 -> recomputes to p≈.044 : INCONSISTENT (both
 significant, so not a decision error, a reported/recomputed mismatch).
 * χ²(1) = 3.84, p = .049 -> recomputes to p≈.0500 : DECISION ERROR
 (reported significant at α=.05, but non-significant).
 * F(2,36) = 5.40, p = .009 and r(48) = .34, p = .016 -> both CONSISTENT.
 * M = 2.19, n = 10 on an integer 1-5 scale -> 2.19·10 = 21.9 (non-integer):
 GRIM-IMPOSSIBLE.
    """
    return (
        "Reaction times differed between groups, t(24) = 2.13, p = .002. "
        "A one-way ANOVA showed a main effect, F(2, 36) = 5.40, p = .009. "
        "Accuracy correlated with age, r(48) = .34, p = .016. "
        "The category effect, χ2(1) = 3.84, p = .049, was reported as reliable. "
        "Group A rated the item M = 2.19, SD = 0.8, n = 10 on a 1-5 integer scale, "
        "whereas the control showed no significant difference (M = 3.00, SD = 1.1, n = 12)."
    )


def run_repli_check(payload: dict) -> dict:
    """payload: { text: <Results text> OR "demo", alpha?: float, items?: int }

 Run statcheck-style p-value recomputation, the GRIM test, and reporting-
 completeness flags over reported statistics. Real scipy math; deterministic;
 never crashes on malformed input.
    """
    raw = payload.get("text")
    demo = isinstance(raw, str) and raw.strip().lower() == "demo"
    if demo:
        text = _demo_text()
    elif isinstance(raw, str):
        text = raw
        if len(text.strip()) < 8:
            return {"error": 'paste a Results section with reported statistics, or use "demo"'}
    else:
        return {"error": 'provide Results text (string), or "demo"'}
    if len(text) > 2_000_000:
        return {"error": "text too large (max 2M chars)"}

    try:
        alpha = float(payload.get("alpha") or 0.05)
    except Exception:
        alpha = 0.05
    if not (0.0 < alpha < 0.5):
        alpha = 0.05
    try:
        items = max(1, int(payload.get("items") or 1))
    except Exception:
        items = 1

    statcheck = check_statistics(text, alpha=alpha)
    grim = check_grim(text, items=items)
    flags = completeness_flags(text, statcheck, grim)

    n_stats = len(statcheck)
    n_incons = sum(1 for s in statcheck if s.get("consistent") is False)
    n_gross = sum(1 for s in statcheck if s.get("gross_error"))
    n_grim_test = sum(1 for g in grim if g.get("grim_testable"))
    n_grim_fail = sum(1 for g in grim if g.get("grim_consistent") is False)

    # overall reproducibility flag
    if n_gross or n_grim_fail:
        repro = "FAIL — at least one statistic is internally impossible or flips its significance decision"
        level = "fail"
    elif n_incons:
        repro = "WARN — reported and recomputed p-values disagree (likely rounding/typo; verify)"
        level = "warn"
    elif n_stats == 0 and n_grim_test == 0:
        repro = "no recomputable statistics found (need t/F/χ²/r with df + p, or M/SD/N)"
        level = "none"
    elif flags:
        repro = "PASS with reporting flags — numbers reproduce, but reporting is incomplete"
        level = "pass-flags"
    else:
        repro = "PASS — all reported statistics reproduce and reporting looks complete"
        level = "pass"

    out = {
        "method": (
            "statcheck-style p-value recomputation (Nuijten 2016, via scipy.stats) "
            "+ GRIM test (Brown & Heathers 2017) + reporting-completeness flags"
        ),
        "demo": demo,
        "alpha": alpha,
        "scale_items": items,
        "summary": {
            "statistics_checked": n_stats,
            "inconsistent": n_incons,
            "decision_errors": n_gross,
            "means_grim_tested": n_grim_test,
            "grim_impossible": n_grim_fail,
            "reporting_flags": len(flags),
        },
        "reproducibility": repro,
        "reproducibility_level": level,
        "statcheck": statcheck,
        "grim": grim,
        "reporting_flags": flags,
        "note": (
            "Horizontal, all-field tool: reproducible statistics are mandated by "
            "funders and journals across every discipline. p-value recomputation "
            "is exact two-tailed scipy.stats; GRIM is exact integer arithmetic. "
            "An inconsistency flags a likely typo/rounding or error to verify, it "
            "is a triage signal and never an accusation. Reads the reported numbers only "
            "(no raw data), so it cannot catch errors that are internally consistent."
        ),
    }
    if demo:
        # Ground truth for verification (hand-checked):
        # t(24)=2.13 recomputes to p≈.044 ≠ reported .002 → INCONSISTENT
        # (both <.05, so not a decision error).
        # χ²(1)=3.84 recomputes to p≈.0500 > .05 but reported .049 (sig) →
        # DECISION ERROR (the only one here).
        # M=2.19 on an integer 1-5 scale, n=10 → 21.9 non-integer → GRIM-IMPOSSIBLE.
        out["ground_truth"] = {
            "t_24_2p13_is_inconsistent": True,
            "chi2_1_3p84_p049_is_decision_error": True,
            "mean_2p19_n10_is_grim_impossible": True,
            "expected_decision_errors": 1,
            "expected_grim_impossible": 1,
        }
        out["note"] = "DEMO: a known Results snippet with a planted statcheck inconsistency, a planted decision error, AND a planted GRIM-impossible mean (see ground_truth). " + out["note"]
    return out


# Registry the gateway imports.
REPLI_RUNNERS = {
    "replicheck": run_repli_check,
}
