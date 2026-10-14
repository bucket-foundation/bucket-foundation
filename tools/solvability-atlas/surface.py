import argparse
import datetime as dt
import json
import subprocess
import warnings
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import pandas as pd
from joblib import Parallel, delayed
from sklearn.ensemble import GradientBoostingRegressor, HistGradientBoostingRegressor
from sklearn.exceptions import ConvergenceWarning
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import RBF, ConstantKernel, WhiteKernel
from sklearn.linear_model import LinearRegression, RidgeCV
from sklearn.neighbors import KNeighborsRegressor

import surface_table as st
import thresholds

HERE = Path(__file__).parent
REPO = HERE.parent.parent
OUT = HERE / "surface"
RESULTS = OUT / "results.json"
RENDERS = OUT / "renders"
SCHEMA = "bucket.solvability-atlas.surface/v1"
SEED = 20261013
TARGET = "log_years"
FOLDS = 5
REPEATS = 20
PERMUTATIONS = 200
BOOTSTRAPS = 2000
CUTOFFS = (1950, 1960, 1970, 1980, 1990, 2000, 2010)
MIN_TEST_ROWS = 20
SURFACE_DEFAULT = "graph"
RIDGE_ALPHAS = tuple(10.0 ** k for k in range(-2, 4))
KERNEL_RIDGES = (0.001, 0.01, 0.1, 1.0)
KERNEL_NOISE = (0.001, 0.01, 0.1, 1.0, 10.0, 100.0)
FEATURE_SETS = {
    "map": {"numeric": st.MAP_FEATURES, "categorical": st.CATEGORICAL, "coords": st.COORDS},
    "map_year": {"numeric": st.MAP_FEATURES + st.POSED_FEATURES + st.YEAR, "categorical": st.CATEGORICAL, "coords": st.COORDS + st.YEAR},
}
BASELINES = ("mean", "circle", "reach", "year")
MODELS = ("linear", "gp", "gbt", "graph")
SURFACE_MODELS = ("gp", "graph", "gbt", "linear")
SEQUENTIAL = ("#eef3fb", "#c9d9f2", "#9dbbe6", "#6e9bd8", "#447bc6", "#2a5ea6", "#1a437d", "#0f2c56")
INK = "#0b0b0b"
MUTED = "#6b6f76"
ACCENT = "#eb6834"


def feature_names(feature_set):
    spec = FEATURE_SETS[feature_set]
    return tuple(spec["numeric"]) + tuple(spec["categorical"])


def assert_leak_free(feature_set):
    banned = set(st.TARGETS) | set(st.POST_OUTCOME)
    used = set(feature_names(feature_set)) | set(FEATURE_SETS[feature_set]["coords"])
    hit = sorted(banned & used)
    if hit:
        raise ValueError(f"feature set {feature_set} holds target or post-outcome columns: {hit}")


def design(table, feature_set):
    assert_leak_free(feature_set)
    spec = FEATURE_SETS[feature_set]
    numeric = table[list(spec["numeric"])].astype(float)
    dummies = pd.get_dummies(table[list(spec["categorical"])], dtype=float)
    return pd.concat([numeric, dummies], axis=1).to_numpy(), table[list(spec["coords"])].astype(float).to_numpy()


@dataclass
class Context:
    table: pd.DataFrame
    labelled: np.ndarray
    y: np.ndarray
    groups: np.ndarray
    full: dict
    coords: dict
    kernels: dict = field(default_factory=dict)
    year: np.ndarray = None
    reach: np.ndarray = None
    inside: np.ndarray = None


def context(table, weights=None, target=TARGET, rows=None):
    labelled = np.flatnonzero(table[target].notna().to_numpy()) if rows is None else np.asarray(rows)
    full, coords = {}, {}
    for name in FEATURE_SETS:
        x, c = design(table, name)
        full[name], coords[name] = x[labelled], c[labelled]
    kernels = {}
    if weights is not None:
        for ridge in KERNEL_RIDGES:
            kernels[ridge] = st.graph_kernel(weights, labelled, ridge)
    return Context(
        table=table,
        labelled=labelled,
        y=table[target].to_numpy(dtype=float)[labelled],
        groups=table["group"].to_numpy()[labelled],
        full=full,
        coords=coords,
        kernels=kernels,
        year=table["posed"].to_numpy(dtype=float)[labelled],
        reach=table["reach_2026"].to_numpy(dtype=float)[labelled],
        inside=table["inside"].to_numpy(dtype=float)[labelled],
    )


def standardise(train, test):
    mean, scale = train.mean(0), train.std(0)
    scale[scale == 0] = 1.0
    return (train - mean) / scale, (test - mean) / scale


def loo_kernel_ridge(kernel, y, noises=KERNEL_NOISE):
    values, vectors = np.linalg.eigh((kernel + kernel.T) / 2)
    best = None
    for noise in noises:
        inverse = (vectors / (values + noise)) @ vectors.T
        loo = (inverse @ y) / np.diag(inverse)
        error = float(np.mean(loo ** 2))
        if best is None or error < best[0]:
            best = (error, noise, inverse @ y)
    return best


def graph_predict(ctx, train, test, residual, test_rows=None):
    best = None
    for ridge, kernel in ctx.kernels.items():
        block = kernel[ctx.labelled[train]][:, train]
        error, noise, alpha = loo_kernel_ridge(block, residual)
        if best is None or error < best[0]:
            best = (error, ridge, noise, alpha)
    _, ridge, noise, alpha = best
    rows = ctx.labelled[test] if test_rows is None else test_rows
    return ctx.kernels[ridge][rows][:, train] @ alpha, {"ridge": ridge, "noise": noise}


def predict(name, feature_set, ctx, train, test, y, seed=SEED):
    ytr = y[train]
    centre = ytr.mean()
    if name == "mean":
        return np.full(len(test), centre)
    if name == "circle":
        out = np.full(len(test), centre)
        for side in (0.0, 1.0):
            m = ctx.inside[train] == side
            if m.any():
                out[ctx.inside[test] == side] = ytr[m].mean()
        return out
    if name == "reach":
        return LinearRegression().fit(ctx.reach[train, None], ytr).predict(ctx.reach[test, None])
    if name == "year":
        return LinearRegression().fit(ctx.year[train, None], ytr).predict(ctx.year[test, None])
    if name == "linear":
        xtr, xte = standardise(ctx.full[feature_set][train], ctx.full[feature_set][test])
        return RidgeCV(alphas=RIDGE_ALPHAS).fit(xtr, ytr).predict(xte)
    if name == "gbt":
        model = GradientBoostingRegressor(n_estimators=300, learning_rate=0.03, max_depth=2, subsample=0.8, min_samples_leaf=5, random_state=seed)
        return model.fit(ctx.full[feature_set][train], ytr).predict(ctx.full[feature_set][test])
    if name == "gp":
        xtr, xte = standardise(ctx.coords[feature_set][train], ctx.coords[feature_set][test])
        kernel = ConstantKernel(1.0, (1e-2, 1e2)) * RBF(np.full(xtr.shape[1], 3.0), (0.3, 300.0)) + WhiteKernel(0.5, (1e-2, 1e1))
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", ConvergenceWarning)
            model = GaussianProcessRegressor(kernel=kernel, normalize_y=True, random_state=seed).fit(xtr, ytr)
        return model.predict(xte)
    if name == "graph":
        if feature_set == "map_year":
            trend = LinearRegression().fit(ctx.year[train, None], ytr)
            smooth, _ = graph_predict(ctx, train, test, ytr - trend.predict(ctx.year[train, None]))
            return trend.predict(ctx.year[test, None]) + smooth
        smooth, _ = graph_predict(ctx, train, test, ytr - centre)
        return centre + smooth
    raise ValueError(f"unknown model {name}")


def grouped_folds(groups, folds=FOLDS, seed=SEED):
    unique = np.unique(groups)
    order = np.random.default_rng(seed).permutation(unique)
    fold_of = {g: i % folds for i, g in enumerate(order)}
    return np.array([fold_of[g] for g in groups])


def out_of_fold(name, feature_set, ctx, y, fold, seed=SEED):
    out = np.zeros(len(y))
    for k in np.unique(fold):
        train, test = np.flatnonzero(fold != k), np.flatnonzero(fold == k)
        out[test] = predict(name, feature_set, ctx, train, test, y, seed)
    return out


def r_squared(y, predicted):
    total = float(((y - y.mean()) ** 2).sum())
    return float("nan") if total == 0 else 1.0 - float(((y - predicted) ** 2).sum()) / total


def scores(y, predicted):
    return {
        "r2": r_squared(y, predicted),
        "mae_log": float(np.abs(y - predicted).mean()),
        "mae_years": float(np.abs(np.expm1(y) - np.expm1(predicted)).mean()),
    }


def group_members(groups):
    order = np.argsort(groups, kind="stable")
    _, starts, counts = np.unique(groups[order], return_index=True, return_counts=True)
    return [order[s:s + c] for s, c in zip(starts, counts)]


def interval(draws):
    draws = np.asarray(draws, dtype=float)
    draws = draws[np.isfinite(draws)]
    return [float(np.quantile(draws, 0.025)), float(np.quantile(draws, 0.975))]


def bootstrap_draws(y, predictions, groups, n=BOOTSTRAPS, seed=SEED):
    members = group_members(groups)
    rng = np.random.default_rng(seed)
    out = {name: np.zeros(n) for name in predictions}
    repeats = next(iter(predictions.values())).shape[0]
    for b in range(n):
        pick = np.concatenate([members[i] for i in rng.integers(0, len(members), len(members))])
        r = int(rng.integers(0, repeats))
        for name, p in predictions.items():
            out[name][b] = r_squared(y[pick], p[r][pick])
    return out


def entries():
    out = [(b, "map") for b in BASELINES]
    for fs in FEATURE_SETS:
        out += [(m, fs) for m in MODELS]
    return out


def label(name, feature_set):
    return name if name in BASELINES else f"{name}:{feature_set}"


def repeat_predictions(ctx, y, repeat, seed=SEED):
    fold = grouped_folds(ctx.groups, FOLDS, seed + repeat)
    return {label(n, fs): out_of_fold(n, fs, ctx, y, fold, seed + repeat) for n, fs in entries()}


def permuted_scores(ctx, y, draw, seed=SEED):
    rng = np.random.default_rng(seed + 100000 + draw)
    shuffled = rng.permutation(y)
    fold = grouped_folds(ctx.groups, FOLDS, seed + 100000 + draw)
    return {label(n, fs): r_squared(shuffled, out_of_fold(n, fs, ctx, shuffled, fold, seed)) for n, fs in entries() if n in MODELS}


def summarise(y, stacked, draws, null, reference):
    out = {}
    for name, p in stacked.items():
        per_repeat = [scores(y, row) for row in p]
        entry = {k: float(np.mean([s[k] for s in per_repeat])) for k in ("r2", "mae_log", "mae_years")}
        entry["r2_interval"] = interval(draws[name])
        entry["r2_repeat_range"] = [float(min(s["r2"] for s in per_repeat)), float(max(s["r2"] for s in per_repeat))]
        for base in reference:
            if base != name:
                diff = draws[name] - draws[base]
                entry[f"r2_minus_{base}"] = {"value": entry["r2"] - float(np.mean([r_squared(y, row) for row in stacked[base]])), "interval": interval(diff)}
        if null and name in null:
            observed = entry["r2"]
            entry["permutation"] = {
                "mean": float(np.mean(null[name])),
                "interval": interval(null[name]),
                "p": float((1 + np.sum(np.asarray(null[name]) >= observed)) / (1 + len(null[name]))),
                "draws": len(null[name]),
            }
        out[name] = entry
    return out


def cross_validate(ctx, repeats=REPEATS, permutations=PERMUTATIONS, bootstraps=BOOTSTRAPS, seed=SEED, jobs=-1):
    y = ctx.y
    runs = Parallel(n_jobs=jobs)(delayed(repeat_predictions)(ctx, y, r, seed) for r in range(repeats))
    stacked = {name: np.vstack([run[name] for run in runs]) for name in runs[0]}
    draws = bootstrap_draws(y, stacked, ctx.groups, bootstraps, seed)
    null_runs = Parallel(n_jobs=jobs)(delayed(permuted_scores)(ctx, y, d, seed) for d in range(permutations))
    null = {name: [run[name] for run in null_runs] for name in (null_runs[0] if null_runs else {})}
    return {"rows": int(len(y)), "groups": int(len(np.unique(ctx.groups))), "folds": FOLDS, "repeats": repeats, "scores": summarise(y, stacked, draws, null, BASELINES)}


def temporal_split(ctx, cutoff):
    posed = ctx.table["posed"].to_numpy(dtype=float)[ctx.labelled]
    resolved = ctx.table["resolved"].to_numpy(dtype=float)[ctx.labelled]
    return np.flatnonzero((posed < cutoff) & (resolved < cutoff)), np.flatnonzero(posed >= cutoff)


def temporal(ctx, cutoff, bootstraps=BOOTSTRAPS, seed=SEED):
    train, test = temporal_split(ctx, cutoff)
    y = ctx.y
    predicted = {label(n, fs): predict(n, fs, ctx, train, test, y, seed) for n, fs in entries()}
    stacked = {name: p[None, :] for name, p in predicted.items()}
    draws = bootstrap_draws(y[test], stacked, ctx.groups[test], bootstraps, seed)
    return {
        "cutoff": cutoff,
        "train_rows": int(len(train)),
        "test_rows": int(len(test)),
        "train_mean_years": float(np.expm1(y[train]).mean()),
        "test_mean_years": float(np.expm1(y[test]).mean()),
        "scores": summarise(y[test], stacked, draws, None, BASELINES),
    }


def sweep(ctx, cutoffs=CUTOFFS, bootstraps=BOOTSTRAPS, seed=SEED, jobs=-1):
    usable = [c for c in cutoffs if len(temporal_split(ctx, c)[1]) >= MIN_TEST_ROWS and len(temporal_split(ctx, c)[0]) >= MIN_TEST_ROWS]
    blocks = Parallel(n_jobs=jobs)(delayed(temporal)(ctx, c, bootstraps, seed) for c in usable)
    return {str(b["cutoff"]): b for b in blocks}


def year_from_map(ctx, seed=SEED):
    fold = grouped_folds(ctx.groups, FOLDS, seed)
    predicted = np.zeros(len(ctx.y))
    for k in range(FOLDS):
        train, test = np.flatnonzero(fold != k), np.flatnonzero(fold == k)
        xtr, xte = standardise(ctx.full["map"][train], ctx.full["map"][test])
        predicted[test] = RidgeCV(alphas=RIDGE_ALPHAS).fit(xtr, ctx.year[train]).predict(xte)
    return {"r2": r_squared(ctx.year, predicted), "rows": int(len(ctx.y))}


def density_check(table, repeats=3, seed=SEED):
    y = table["solved_share"].to_numpy(dtype=float)
    x = table[list(st.COORDS)].to_numpy(dtype=float)
    groups = table["group"].to_numpy()
    models = {
        "linear": lambda: LinearRegression(),
        "knn": lambda: KNeighborsRegressor(n_neighbors=25, weights="distance"),
        "gbt": lambda: HistGradientBoostingRegressor(max_iter=200, learning_rate=0.1, random_state=seed),
    }
    out = {}
    for name, make in models.items():
        values = []
        for r in range(repeats):
            fold = grouped_folds(groups, FOLDS, seed + r)
            predicted = np.zeros(len(y))
            for k in range(FOLDS):
                predicted[fold == k] = make().fit(x[fold != k], y[fold != k]).predict(x[fold == k])
            values.append(r_squared(y, predicted))
        out[name] = {"r2": float(np.mean(values)), "r2_repeat_range": [float(min(values)), float(max(values))]}
    return {"rows": int(len(y)), "repeats": repeats, "features": list(st.COORDS), "scores": out}


@dataclass
class Surface:
    name: str
    params: dict
    ids: list
    values: np.ndarray
    trained_on: list
    fit: dict

    def predict(self, ids):
        at = {i: k for k, i in enumerate(self.ids)}
        return np.array([self.values[at[i]] for i in ids])

    def years(self, ids):
        return np.expm1(self.predict(ids))


def frontier_surface(table=None, weights=None, model=SURFACE_DEFAULT, target=TARGET, cutoff=None, seed=SEED):
    if model not in SURFACE_MODELS:
        raise ValueError(f"model must be one of {SURFACE_MODELS}")
    if table is None or weights is None:
        built = st.build()
        weights = built["weights"]
        table = st.frame(built["rows"])
    has = table[target].notna().to_numpy()
    if cutoff is not None:
        has &= table["resolved"].to_numpy(dtype=float) < cutoff
    labelled = np.flatnonzero(has)
    ctx = context(table, weights, target, labelled)
    train = np.arange(len(labelled))
    everything = np.arange(len(table))
    y = ctx.y
    fit = {}
    if model == "graph":
        smooth, fit = graph_predict(ctx, train, None, y - y.mean(), test_rows=everything)
        values = y.mean() + smooth
    else:
        wide = context(table, None, target, everything)
        wide.y = np.zeros(len(table))
        wide.y[labelled] = y
        values = predict(model, "map", wide, labelled, everything, wide.y, seed)
    params = {"model": model, "target": target, "cutoff": cutoff, "seed": seed, "feature_set": "map", "dims": st.DIMS}
    return Surface(name="frontier-surface", params=params, ids=table["id"].tolist(), values=np.asarray(values, dtype=float), trained_on=table["id"].to_numpy()[labelled].tolist(), fit=fit)


def claims_check(table, surface, bootstraps=BOOTSTRAPS, seed=SEED):
    pool = table[(table["kind"] != "variant") & (table["solved"] == 0) & table["branch"].isin(["mathematics", "information"])]
    claimed = (pool["status"] == "claimed").to_numpy()
    predicted = surface.predict(pool["id"].tolist())
    reach = pool["reach_2026"].to_numpy(dtype=float)
    groups = pool["group"].to_numpy()
    members = group_members(groups)
    rng = np.random.default_rng(seed)
    draws = {"surface": [], "reach": []}
    for _ in range(bootstraps):
        pick = np.concatenate([members[i] for i in rng.integers(0, len(members), len(members))])
        if claimed[pick].all() or not claimed[pick].any():
            continue
        draws["surface"].append(thresholds.auc(-predicted[pick], claimed[pick]))
        draws["reach"].append(thresholds.auc(reach[pick], claimed[pick]))
    return {
        "rows": int(len(pool)),
        "claimed": int(claimed.sum()),
        "surface_auc": float(thresholds.auc(-predicted, claimed)),
        "surface_auc_interval": interval(draws["surface"]),
        "reach_auc": float(thresholds.auc(reach, claimed)),
        "reach_auc_interval": interval(draws["reach"]),
    }


def smooth_field(x, y, values, grid=160, bandwidth=0.18):
    gx = np.linspace(x.min(), x.max(), grid)
    gy = np.linspace(y.min(), y.max(), grid)
    mx, my = np.meshgrid(gx, gy)
    total = np.zeros_like(mx)
    weight = np.zeros_like(mx)
    for start in range(0, len(x), 512):
        sl = slice(start, start + 512)
        d = (mx[..., None] - x[sl]) ** 2 + (my[..., None] - y[sl]) ** 2
        k = np.exp(-d / (2 * bandwidth ** 2))
        total += (k * values[sl]).sum(-1)
        weight += k.sum(-1)
    return mx, my, np.where(weight > 0.5, total / np.maximum(weight, 1e-12), np.nan)


def render_surface_map(surface, table, path):
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.colors import LinearSegmentedColormap

    cmap = LinearSegmentedColormap.from_list("surface", SEQUENTIAL)
    values = surface.values
    lo, hi = np.quantile(values, [0.02, 0.98])
    dated = table["log_years"].notna().to_numpy()
    x, y = table["x1"].to_numpy(dtype=float), table["x2"].to_numpy(dtype=float)
    fig, axes = plt.subplots(1, 2, figsize=(16, 8.6), layout="constrained")
    ax = axes[0]
    mx, my, grid = smooth_field(x, y, values)
    mesh = ax.pcolormesh(mx, my, grid, cmap=cmap, vmin=lo, vmax=hi, shading="auto", rasterized=True)
    ax.contour(mx, my, grid, levels=6, colors=INK, linewidths=0.5, alpha=0.45)
    ax.scatter(x[~dated], y[~dated], s=1.5, c=MUTED, alpha=0.25, linewidths=0, rasterized=True)
    ax.scatter(x[dated], y[dated], s=30, c=table["log_years"].to_numpy(dtype=float)[dated], cmap=cmap, vmin=lo, vmax=hi, edgecolors="white", linewidths=1.2)
    ax.set_xlabel("map coordinate x1, first graph direction")
    ax.set_ylabel("map coordinate x2, second graph direction")
    ax.set_title(f"Predicted years to resolve over the map, {surface.params['model']} surface\nringed dots: the {int(dated.sum())} dated solved problems, coloured by observed years", loc="left", fontsize=11)
    ax = axes[1]
    theta = table["theta"].to_numpy(dtype=float)
    radius = table["disc_radius"].to_numpy(dtype=float)
    px, py = radius * np.cos(theta), -radius * np.sin(theta)
    ax.scatter(px, py, s=5, c=values, cmap=cmap, vmin=lo, vmax=hi, linewidths=0, rasterized=True)
    ring = np.linspace(0, 2 * np.pi, 400)
    edge = thresholds.SHIPPED["frontier_radius"]
    ax.plot(edge * np.cos(ring), edge * np.sin(ring), color=ACCENT, lw=2)
    ax.text(0, edge + 0.04, "frontier circle, reach threshold", color=INK, fontsize=10, ha="center", va="bottom")
    ax.set_xlim(-1.6, 1.6)
    ax.set_ylim(-1.6, 1.6)
    ax.set_aspect("equal")
    ax.set_xticks([])
    ax.set_yticks([])
    ax.set_title("The same predictions on the frontier disc\nangle and radius as shipped, colour from the surface", loc="left", fontsize=11)
    for side in ("top", "right"):
        axes[0].spines[side].set_visible(False)
    for side in ("top", "right", "left", "bottom"):
        axes[1].spines[side].set_visible(False)
    bar = fig.colorbar(mesh, ax=axes, orientation="horizontal", shrink=0.5, pad=0.03, aspect=40)
    ticks = [t for t in (0, 1, 2, 3, 5, 7, 10, 12, 15, 20, 25, 30, 40, 50, 70, 100, 150, 200) if lo <= np.log1p(t) <= hi]
    bar.set_ticks([np.log1p(t) for t in ticks])
    bar.set_ticklabels([str(t) for t in ticks])
    bar.set_label("predicted years from posed to resolved, log scale")
    fig.savefig(path, dpi=150)
    plt.close(fig)


RENDER_FUNCTIONS = {"frontier-surface-map": render_surface_map}


def commit():
    try:
        return subprocess.run(["git", "-C", str(REPO), "rev-parse", "--short", "HEAD"], capture_output=True, text=True, check=True).stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None


def new_render_folder(root, name, now=None):
    now = now or dt.datetime.now(dt.timezone.utc)
    base = Path(root) / now.strftime("%Y-%m-%d")
    stamp = now.strftime("%H%M%S")
    k = 0
    while True:
        folder = base / (f"{name}-{stamp}" if k == 0 else f"{name}-{stamp}-{k}")
        try:
            folder.mkdir(parents=True, exist_ok=False)
            return folder
        except FileExistsError:
            k += 1


def render(name, surface, table, root=RENDERS, now=None):
    if name not in RENDER_FUNCTIONS:
        raise KeyError(f"no render named {name}; known: {sorted(RENDER_FUNCTIONS)}")
    folder = new_render_folder(root, name, now)
    RENDER_FUNCTIONS[name](surface, table, folder / f"{name}.png")
    manifest = {
        "schema": SCHEMA,
        "render": name,
        "function": f"surface.{RENDER_FUNCTIONS[name].__name__}",
        "surface": {"function": "surface.frontier_surface", "params": surface.params, "fit": surface.fit, "trained_rows": len(surface.trained_on)},
        "inputs": [str(st.NEIGHBORS.relative_to(REPO)), "tools/solvability-atlas/problems.tsv", "tools/solvability-atlas/problems-sourced.tsv"],
        "commit": commit(),
        "command": f"python3 surface.py --render {name} --model {surface.params['model']}",
    }
    (folder / "manifest.json").write_text(json.dumps(manifest, indent=1) + "\n")
    return folder


def run(repeats=REPEATS, permutations=PERMUTATIONS, bootstraps=BOOTSTRAPS, seed=SEED, jobs=-1, surface_model=None):
    import surface_survival

    built = st.build()
    st.write(built["rows"])
    table = st.load()
    ctx = context(table, built["weights"])
    cv = cross_validate(ctx, repeats, permutations, bootstraps, seed, jobs)
    surface = frontier_surface(table, built["weights"], model=surface_model or SURFACE_DEFAULT, seed=seed)
    result = {
        "schema": SCHEMA,
        "built": dt.date.today().isoformat(),
        "seed": seed,
        "target": {"name": TARGET, "definition": "log(1 + resolved year - posed year)", "rows": int(len(ctx.y))},
        "carry": st.carry_counts(built["rows"]),
        "feature_sets": {k: {"features": list(feature_names(k)), "gp_inputs": list(v["coords"])} for k, v in FEATURE_SETS.items()},
        "excluded_as_post_outcome": list(st.POST_OUTCOME),
        "circle_threshold": built["threshold"],
        "cross_validation": cv,
        "temporal_rule": "train on rows posed and resolved before the cutoff, test on rows posed in the cutoff year or later",
        "temporal": sweep(ctx, CUTOFFS, bootstraps, seed, jobs),
        "posed_year_from_map": year_from_map(ctx, seed),
        "survival": surface_survival.run(table, bootstraps=bootstraps, seed=seed, jobs=jobs),
        "density_check": density_check(table, seed=seed),
        "surface": {"params": surface.params, "fit": surface.fit, "trained_rows": len(surface.trained_on), "model_fixed_before_scoring": SURFACE_DEFAULT},
        "claims_check": claims_check(table, surface, bootstraps, seed),
    }
    return result, surface, table


def fmt(x, digits=3):
    return f"{x:.{digits}f}"


def span(pair, digits=3):
    return f"{pair[0]:.{digits}f} to {pair[1]:.{digits}f}"


NAMES = {"mean": "none", "circle": "inside or outside", "reach": "reach", "year": "posed year"}


def score_table(block, against):
    lines = ["| Model | Features | R squared | 95% interval | MAE, log years | MAE, years | R squared minus " + against + " | Shuffled-target R squared, 95% |", "|---|---|---|---|---|---|---|---|"]
    for n, fs in entries():
        s = block["scores"][label(n, fs)]
        diff = s.get(f"r2_minus_{against}")
        perm = s.get("permutation")
        lines.append(
            f"| {n} | {NAMES.get(n, fs)} | {fmt(s['r2'])} | {span(s['r2_interval'])} | {fmt(s['mae_log'])} | {fmt(s['mae_years'], 1)} | "
            f"{(fmt(diff['value']) + ', ' + span(diff['interval'])) if diff else ''} | {span(perm['interval']) if perm else ''} |"
        )
    return "\n".join(lines)


def sweep_table(blocks):
    cutoffs = list(blocks)
    lines = ["| Model | Features | " + " | ".join(cutoffs) + " |", "|---|---|" + "---|" * len(cutoffs)]
    lines.append("| train rows | | " + " | ".join(str(blocks[c]["train_rows"]) for c in cutoffs) + " |")
    lines.append("| test rows | | " + " | ".join(str(blocks[c]["test_rows"]) for c in cutoffs) + " |")
    for n, fs in entries():
        lines.append(f"| {n} | {NAMES.get(n, fs)} | " + " | ".join(fmt(blocks[c]["scores"][label(n, fs)]["r2"]) for c in cutoffs) + " |")
    return "\n".join(lines)


def gain_table(blocks):
    cutoffs = list(blocks)
    lines = ["| Model, map and year | " + " | ".join(cutoffs) + " |", "|---|" + "---|" * len(cutoffs)]
    for n in MODELS:
        cells = []
        for c in cutoffs:
            d = blocks[c]["scores"][label(n, "map_year")]["r2_minus_year"]
            cells.append(f"{fmt(d['value'])}, {span(d['interval'])}")
        lines.append(f"| {n} | " + " | ".join(cells) + " |")
    return "\n".join(lines)


def tables_markdown(result):
    import surface_survival

    out = ["## Repeated Grouped Folds", "", score_table(result["cross_validation"], "year"), ""]
    out += ["## Posed-Year Sweep", "", result["temporal_rule"].capitalize() + ". R squared on the test rows.", "", sweep_table(result["temporal"]), ""]
    out += ["## Gain Over Posed Year In The Sweep", "", "R squared minus the posed-year baseline, with a 95% bootstrap interval over test families.", "", gain_table(result["temporal"]), ""]
    out += [surface_survival.tables_markdown(result["survival"])]
    d = result["density_check"]
    out += ["## Neighbour-Solved Density", "", "| Model | R squared | Range over repeats |", "|---|---|---|"]
    out += [f"| {k} | {fmt(v['r2'])} | {span(v['r2_repeat_range'])} |" for k, v in d["scores"].items()]
    return "\n".join(out) + "\n"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repeats", type=int, default=REPEATS)
    parser.add_argument("--permutations", type=int, default=PERMUTATIONS)
    parser.add_argument("--bootstraps", type=int, default=BOOTSTRAPS)
    parser.add_argument("--jobs", type=int, default=-1)
    parser.add_argument("--model", choices=SURFACE_MODELS)
    parser.add_argument("--render", choices=sorted(RENDER_FUNCTIONS))
    parser.add_argument("--render-only", action="store_true")
    args = parser.parse_args()
    if args.render_only:
        built = st.build()
        table = st.frame(built["rows"])
        surface = frontier_surface(table, built["weights"], model=args.model or SURFACE_DEFAULT)
        print(render(args.render or "frontier-surface-map", surface, table))
        return
    result, surface, table = run(args.repeats, args.permutations, args.bootstraps, jobs=args.jobs, surface_model=args.model)
    OUT.mkdir(exist_ok=True)
    RESULTS.write_text(json.dumps(result, indent=1) + "\n")
    (OUT / "tables.md").write_text(tables_markdown(result))
    if args.render:
        print(render(args.render, surface, table))
    print(json.dumps({k: round(v["r2"], 3) for k, v in result["cross_validation"]["scores"].items()}, indent=1))


if __name__ == "__main__":
    main()
