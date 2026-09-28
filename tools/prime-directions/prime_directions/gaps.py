from __future__ import annotations

import numpy as np

from .model import PrimeResult, TermStats

def log_ratio(
    terms: np.ndarray,
    target: TermStats,
    others: list[TermStats],
    alpha: float = 0.5,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    rate_target = target.rates(terms, alpha)
    if not others:
        raise ValueError("gap analysis needs at least one other corpus")
    other_rates = np.vstack([o.rates(terms, alpha) for o in others])
    ceiling = other_rates.max(axis=0)
    return np.log(rate_target) - np.log(ceiling), rate_target, other_rates

def analyze(
    target: PrimeResult,
    others: dict[str, TermStats],
    alpha: float = 0.5,
    top_terms: int = 30,
    min_df: int = 5,
) -> dict:
    names = list(others)
    stats = [others[n] for n in names]
    lr, rate_target, other_rates = log_ratio(target.vocab, target.term_stats, stats, alpha)
    weights = target.term_weights()
    df_target = np.array([target.term_stats.df[target.term_stats.index[str(t)]] for t in target.vocab])
    term_score = np.where((lr > 0) & (df_target >= min_df), weights * lr, 0.0)
    order = [i for i in np.argsort(-term_score) if term_score[i] > 0][:top_terms]
    terms = [
        {
            "term": str(target.vocab[i]),
            "score": round(float(term_score[i]), 5),
            "log_ratio": round(float(lr[i]), 4),
            "weight": round(float(weights[i]), 4),
            "df": int(df_target[i]),
            "rate": round(float(rate_target[i]), 6),
            "other_rates": {n: round(float(other_rates[j, i]), 6) for j, n in enumerate(names)},
        }
        for i in order
    ]
    energy = target.components**2
    comp_gap = energy @ lr
    components = sorted(
        (
            {
                "component": k + 1,
                "gap": round(float(comp_gap[k]), 4),
                "variance_ratio": round(float(target.variance_ratio[k]), 5),
                "top_terms": [t for t, _ in target.top_terms(k, 8)],
                "gap_terms": [
                    str(target.vocab[i])
                    for i in np.argsort(-(target.components[k] * np.clip(lr, 0, None)))[:8]
                ],
            }
            for k in range(target.k)
        ),
        key=lambda c: -c["gap"],
    )
    return {
        "corpus": target.corpus,
        "compared_with": names,
        "alpha": alpha,
        "min_df": min_df,
        "method": "log((df_target+a)/(n_target+2a)) - log(max over others of (df_other+a)/(n_other+2a))",
        "terms": terms,
        "components": components,
    }
