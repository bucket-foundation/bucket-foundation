import warnings

import numpy as np
import pandas as pd
from joblib import Parallel, delayed
from sksurv.exceptions import NoComparablePairException
from sksurv.ensemble import RandomSurvivalForest
from sksurv.linear_model import CoxPHSurvivalAnalysis
from sksurv.metrics import concordance_index_censored
from sksurv.nonparametric import kaplan_meier_estimator
from sksurv.util import Surv

import surface
import surface_table as st

SEED = surface.SEED
FOLDS = surface.FOLDS
REPEATS = 10
HORIZONS = (10, 25, 50)
SHIFT = 0.5
COX_RIDGE = 1.0
FOREST = {"n_estimators": 200, "min_samples_leaf": 10, "max_features": "sqrt", "n_jobs": 1}
FAMILIES = ("cox", "forest")
FEATURES = ("year", "map_year")
MIN_TEST_EVENTS = 15


def survival_frame(table, as_of=st.AS_OF):
    posed = table["posed"].to_numpy(dtype=float)
    resolved = table["resolved"].to_numpy(dtype=float)
    undated = (table["solved"].to_numpy() == 1) & np.isnan(resolved)
    keep = np.flatnonzero(~np.isnan(posed) & ~undated)
    event = ~np.isnan(resolved[keep]) & (resolved[keep] >= posed[keep])
    time = np.where(event, resolved[keep] - posed[keep], as_of - posed[keep])
    x_map, _ = surface.design(table, "map_year")
    return {
        "rows": keep,
        "ids": table["id"].to_numpy()[keep],
        "posed": posed[keep],
        "resolved": resolved[keep],
        "time": time.astype(float),
        "event": event,
        "follow_up": as_of - posed[keep],
        "groups": table["group"].to_numpy()[keep],
        "source": pd.factorize(table["source"].to_numpy()[keep])[0],
        "x": {"year": posed[keep][:, None], "map_year": x_map[keep]},
        "dropped_undated_solved": int((~np.isnan(posed) & undated).sum()),
    }


def known_at(frame, cutoff):
    rows = np.flatnonzero(frame["posed"] < cutoff)
    event = frame["event"][rows] & (frame["resolved"][rows] < cutoff)
    time = np.where(event, frame["resolved"][rows] - frame["posed"][rows], cutoff - frame["posed"][rows])
    return rows, time.astype(float), event


def fit(family, x, time, event, seed=SEED):
    y = Surv.from_arrays(event=event, time=time + SHIFT)
    if family == "cox":
        return CoxPHSurvivalAnalysis(alpha=COX_RIDGE).fit(x, y)
    params = dict(FOREST)
    if x.shape[1] == 1:
        params["max_features"] = 1
    return RandomSurvivalForest(random_state=seed, **params).fit(x, y)


def event_probability(model, x, horizons=HORIZONS):
    out = np.zeros((len(x), len(horizons)))
    for i, fn in enumerate(model.predict_survival_function(x)):
        lo, hi = fn.domain
        out[i] = [1.0 - float(fn(min(max(h + SHIFT, lo), hi))) for h in horizons]
    return out


def marginal_probability(time, event, horizons=HORIZONS):
    times, survival = kaplan_meier_estimator(event, time + SHIFT)
    return np.array([1.0 - (survival[times <= h + SHIFT][-1] if (times <= h + SHIFT).any() else 1.0) for h in horizons])


def predict(family, features, frame, train, test, time, event, seed=SEED):
    xtr, xte = surface.standardise(frame["x"][features][train], frame["x"][features][test])
    model = fit(family, xtr, time, event, seed)
    return model.predict(xte), event_probability(model, xte)


def concordance(time, event, risk):
    return float(concordance_index_censored(event, time, risk)[0])


def concordance_within(time, event, risk, source):
    concordant = discordant = tied = 0
    for s in np.unique(source):
        m = source == s
        if m.sum() < 2 or not event[m].any():
            continue
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", RuntimeWarning)
                _, c, d, t, _ = concordance_index_censored(event[m], time[m], risk[m])
        except NoComparablePairException:
            continue
        concordant, discordant, tied = concordant + c, discordant + d, tied + t
    pairs = concordant + discordant + tied
    return float("nan") if pairs == 0 else float((concordant + 0.5 * tied) / pairs)


def brier(frame, rows, probability, horizons=HORIZONS):
    out = []
    for k, h in enumerate(horizons):
        seen = frame["follow_up"][rows] >= h
        if seen.sum() < 2:
            out.append(float("nan"))
            continue
        happened = (frame["event"][rows] & (frame["time"][rows] <= h))[seen]
        out.append(float(np.mean((probability[seen, k] - happened) ** 2)))
    return out


def names():
    return [f"{family}:{features}" for family in FAMILIES for features in FEATURES]


def fold_predictions(frame, repeat, seed=SEED):
    n = len(frame["time"])
    fold = surface.grouped_folds(frame["groups"], FOLDS, seed + repeat)
    risk = {name: np.zeros(n) for name in names()}
    prob = {name: np.zeros((n, len(HORIZONS))) for name in names() + ["marginal"]}
    for k in range(FOLDS):
        train, test = np.flatnonzero(fold != k), np.flatnonzero(fold == k)
        prob["marginal"][test] = marginal_probability(frame["time"][train], frame["event"][train])
        for family in FAMILIES:
            for features in FEATURES:
                name = f"{family}:{features}"
                risk[name][test], prob[name][test] = predict(family, features, frame, train, test, frame["time"][train], frame["event"][train], seed + repeat)
    return risk, prob


def nan_mean(values, axis=None):
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", RuntimeWarning)
        return np.nanmean(values, axis=axis)


def summarise(frame, rows, risks, probs, bootstraps, seed):
    time, event, groups, source = frame["time"][rows], frame["event"][rows], frame["groups"][rows], frame["source"][rows]
    w_draws = {name: [] for name in names()}
    members = surface.group_members(groups)
    rng = np.random.default_rng(seed)
    repeats = len(risks)
    risks = [{name: values[rows] for name, values in risk.items()} for risk in risks]
    probs = [{name: values[rows] for name, values in prob.items()} for prob in probs]
    c_draws = {name: [] for name in names()}
    b_draws = {name: [] for name in list(probs[0])}
    for _ in range(bootstraps):
        pick = np.concatenate([members[i] for i in rng.integers(0, len(members), len(members))])
        r = int(rng.integers(0, repeats))
        if not event[pick].any():
            continue
        for name in names():
            c_draws[name].append(concordance(time[pick], event[pick], risks[r][name][pick]))
            w_draws[name].append(concordance_within(time[pick], event[pick], risks[r][name][pick], source[pick]))
        for name in probs[r]:
            b_draws[name].append(nan_mean(brier(frame, rows[pick], probs[r][name][pick])))
    out = {}
    for name in names():
        c = float(np.mean([concordance(time, event, risk[name]) for risk in risks]))
        per_horizon = nan_mean([brier(frame, rows, prob[name]) for prob in probs], axis=0)
        out[name] = {
            "concordance": c,
            "concordance_interval": surface.interval(c_draws[name]),
            "concordance_within_source": float(np.mean([concordance_within(time, event, risk[name], source) for risk in risks])),
            "concordance_within_source_interval": surface.interval(w_draws[name]),
            "brier": {str(h): float(v) for h, v in zip(HORIZONS, per_horizon)},
            "brier_mean": float(nan_mean(per_horizon)),
            "brier_mean_interval": surface.interval(b_draws[name]),
        }
    marginal = nan_mean([brier(frame, rows, prob["marginal"]) for prob in probs], axis=0)
    out["marginal"] = {"brier": {str(h): float(v) for h, v in zip(HORIZONS, marginal)}, "brier_mean": float(nan_mean(marginal)), "brier_mean_interval": surface.interval(b_draws["marginal"])}
    gains = {}
    for family in FAMILIES:
        full, base = f"{family}:map_year", f"{family}:year"
        gains[family] = {
            "concordance_gain": out[full]["concordance"] - out[base]["concordance"],
            "concordance_gain_interval": surface.interval(np.array(c_draws[full]) - np.array(c_draws[base])),
            "within_source_gain": out[full]["concordance_within_source"] - out[base]["concordance_within_source"],
            "within_source_gain_interval": surface.interval(np.array(w_draws[full]) - np.array(w_draws[base])),
            "brier_gain": out[full]["brier_mean"] - out[base]["brier_mean"],
            "brier_gain_interval": surface.interval(np.array(b_draws[full]) - np.array(b_draws[base])),
        }
    return {"scores": out, "gain_over_posed_year": gains}


def cross_validate(frame, repeats=REPEATS, bootstraps=surface.BOOTSTRAPS, seed=SEED, jobs=-1):
    runs = Parallel(n_jobs=jobs)(delayed(fold_predictions)(frame, r, seed) for r in range(repeats))
    rows = np.arange(len(frame["time"]))
    block = summarise(frame, rows, [r[0] for r in runs], [r[1] for r in runs], bootstraps, seed)
    mixed = mixed_rows(frame)
    inside = summarise(frame, mixed, [r[0] for r in runs], [r[1] for r in runs], bootstraps, seed)
    block["mixed_sources"] = {"rows": int(len(mixed)), "events": int(frame["event"][mixed].sum()), "sources": int(len(np.unique(frame["source"][mixed]))), **inside}
    return {"rows": int(len(rows)), "events": int(frame["event"].sum()), "censored": int((~frame["event"]).sum()), "folds": FOLDS, "repeats": repeats, **block}


def cutoff_block(frame, cutoff, bootstraps, seed):
    train, time, event = known_at(frame, cutoff)
    test = np.flatnonzero(frame["posed"] >= cutoff)
    risk, prob = {}, {"marginal": np.tile(marginal_probability(time, event), (len(test), 1))}
    for family in FAMILIES:
        for features in FEATURES:
            risk[f"{family}:{features}"], prob[f"{family}:{features}"] = predict(family, features, frame, train, test, time, event, seed)
    full = {name: np.zeros(len(frame["time"])) for name in risk}
    full_prob = {name: np.zeros((len(frame["time"]), len(HORIZONS))) for name in prob}
    for name in risk:
        full[name][test] = risk[name]
    for name in prob:
        full_prob[name][test] = prob[name]
    block = summarise(frame, test, [full], [full_prob], bootstraps, seed)
    return {"cutoff": cutoff, "train_rows": int(len(train)), "train_events": int(event.sum()), "test_rows": int(len(test)), "test_events": int(frame["event"][test].sum()), **block}


def sweep(frame, cutoffs=surface.CUTOFFS, bootstraps=surface.BOOTSTRAPS, seed=SEED, jobs=-1):
    usable = [c for c in cutoffs if known_at(frame, c)[2].sum() >= MIN_TEST_EVENTS and frame["event"][frame["posed"] >= c].sum() >= MIN_TEST_EVENTS]
    blocks = Parallel(n_jobs=jobs)(delayed(cutoff_block)(frame, c, bootstraps, seed) for c in usable)
    return {str(b["cutoff"]): b for b in blocks}


def mixed_rows(frame):
    sources = np.unique(frame["source"])
    share = np.array([frame["event"][frame["source"] == s].mean() for s in sources])
    return np.flatnonzero(np.isin(frame["source"], sources[(share > 0) & (share < 1)]))


def source_mix(frame):
    sources = np.unique(frame["source"])
    share = np.array([frame["event"][frame["source"] == s].mean() for s in sources])
    mixed = sources[(share > 0) & (share < 1)]
    inside = np.isin(frame["source"], mixed)
    return {"sources": int(len(sources)), "single_outcome_sources": int(len(sources) - len(mixed)), "mixed_sources": int(len(mixed)), "rows_in_mixed_sources": int(inside.sum()), "events_in_mixed_sources": int(frame["event"][inside].sum())}


def run(table, repeats=REPEATS, bootstraps=surface.BOOTSTRAPS, seed=SEED, jobs=-1):
    frame = survival_frame(table)
    return {
        "target": "years open from the posed year, an unsolved row censored at 2026",
        "dropped_undated_solved": frame["dropped_undated_solved"],
        "horizons": list(HORIZONS),
        "source_mix": source_mix(frame),
        "brier_rule": "at each horizon, rows posed at least that many years before 2026, so every outcome is observed",
        "temporal_rule": "train on rows posed before the cutoff with status as known at the cutoff, test on rows posed in the cutoff year or later",
        "cross_validation": cross_validate(frame, repeats, bootstraps, seed, jobs),
        "temporal": sweep(frame, surface.CUTOFFS, bootstraps, seed, jobs),
    }


def fmt(x):
    return "" if x is None or np.isnan(x) else f"{x:.3f}"


def span(pair):
    return f"{pair[0]:.3f} to {pair[1]:.3f}"


def tables_markdown(result):
    cv = result["cross_validation"]
    kind = {"year": "posed year", "map_year": "map and year"}
    out = ["## Survival In Repeated Grouped Folds", "", f"{cv['rows']} rows, {cv['events']} resolved and {cv['censored']} censored.", "", "| Model | Features | Concordance | 95% interval | Within-source concordance | 95% interval | Brier, mean over horizons | 95% interval |", "|---|---|---|---|---|---|---|---|"]
    for name in names():
        s = cv["scores"][name]
        family, features = name.split(":")
        out.append(f"| {family} | {kind[features]} | {fmt(s['concordance'])} | {span(s['concordance_interval'])} | {fmt(s['concordance_within_source'])} | {span(s['concordance_within_source_interval'])} | {fmt(s['brier_mean'])} | {span(s['brier_mean_interval'])} |")
    m = cv["scores"]["marginal"]
    out += [f"| Kaplan-Meier | none | | | | | {fmt(m['brier_mean'])} | {span(m['brier_mean_interval'])} |", "", "## Survival Gain Over Posed Year", "", "Map and year minus posed year alone. A negative Brier gain is an improvement.", "", "| Model | Split | Concordance gain | 95% interval | Within-source gain | 95% interval | Brier gain | 95% interval |", "|---|---|---|---|---|---|---|---|"]
    mixed = cv["mixed_sources"]
    blocks = [("folds", cv), (f"folds, the {mixed['sources']} mixed lists, {mixed['rows']} rows", mixed)] + [(f"posed {c} or later", b) for c, b in result["temporal"].items()]
    for split, block in blocks:
        for family in FAMILIES:
            g = block["gain_over_posed_year"][family]
            out.append(f"| {family} | {split} | {fmt(g['concordance_gain'])} | {span(g['concordance_gain_interval'])} | {fmt(g['within_source_gain'])} | {span(g['within_source_gain_interval'])} | {fmt(g['brier_gain'])} | {span(g['brier_gain_interval'])} |")
    cutoffs = list(result["temporal"])
    for title, key in (("Survival Posed-Year Sweep", "concordance"), ("Survival Posed-Year Sweep Within Source", "concordance_within_source")):
        out += ["", f"## {title}", "", "| Model | Features | " + " | ".join(cutoffs) + " |", "|---|---|" + "---|" * len(cutoffs)]
        out.append("| train rows, events | | " + " | ".join(f"{result['temporal'][c]['train_rows']}, {result['temporal'][c]['train_events']}" for c in cutoffs) + " |")
        out.append("| test rows, events | | " + " | ".join(f"{result['temporal'][c]['test_rows']}, {result['temporal'][c]['test_events']}" for c in cutoffs) + " |")
        for name in names():
            family, features = name.split(":")
            out.append(f"| {family} | {kind[features]} | " + " | ".join(fmt(result["temporal"][c]["scores"][name][key]) for c in cutoffs) + " |")
    return "\n".join(out) + "\n"
