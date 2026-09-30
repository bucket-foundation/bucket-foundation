from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
from pathlib import Path

import numpy as np

from . import fitme, reference, advisors, canon, ror, charts, clean, corpora, export, gaps, graph, model, neighbors, render, space

class PrivacyError(RuntimeError):
    pass

def _inside(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False

def check_private_out(path: Path | None, protected: list[Path]) -> Path:
    if path is None:
        raise PrivacyError("a private corpus needs --private-out, a directory outside every git checkout")
    for root in protected:
        if _inside(path, root):
            raise PrivacyError(f"--private-out {path} is inside {root}; private outputs stay outside the repo")
    return path

def _time(timings: dict, key: str, fn, *args, **kwargs):
    start = time.perf_counter()
    value = fn(*args, **kwargs)
    timings[key] = round(time.perf_counter() - start, 3)
    return value

def run_corpus(spec: corpora.CorpusSpec, args, out_dir: Path) -> tuple[model.PrimeResult, dict]:
    timings: dict = {}
    docs = _time(timings, "load_s", corpora.load, spec)
    clean_opts = {**spec.clean}
    if args.min_chars is not None:
        clean_opts["min_chars"] = args.min_chars
    kept, clean_stats = _time(timings, "clean_s", clean.strip_boilerplate, docs, **clean_opts)
    result = _time(
        timings, "fit_s", model.fit, spec.name, kept,
        k=args.k, min_df=args.min_df, max_df=args.max_df, max_features=args.max_features, seed=args.seed,
    )
    data = export.to_dict(result, include_docs=not args.no_docs)
    data["clean"] = clean_stats
    data["private"] = spec.private
    if args.png:
        picks = render.find_picks(result, args.pick) if args.pick else None
        _time(timings, "png_s", render.render_png, result, out_dir / "prime.png", picks=picks, cloud=args.cloud, seed=args.seed)
    if args.mp4:
        video = _time(
            timings, "mp4_s", render.render_mp4, result, out_dir / "prime.mp4",
            frames_per_doc=args.frames_per_doc, fps=args.fps, size_px=args.size, cloud=args.cloud, seed=args.seed,
        )
        data["video"] = video
    data["timings"] = timings
    return result, data

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="prime_directions")
    p.add_argument("--registry", type=Path, default=corpora.REGISTRY_PATH)
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("list")
    r = sub.add_parser("run")
    r.add_argument("names", nargs="*")
    r.add_argument("--all", action="store_true")
    r.add_argument("--out", type=Path, required=True)
    r.add_argument("--private-out", type=Path)
    r.add_argument("--k", type=int, default=12)
    r.add_argument("--min-df", type=int)
    r.add_argument("--max-df", type=float, default=0.15)
    r.add_argument("--max-features", type=int, default=30000)
    r.add_argument("--min-chars", type=int)
    r.add_argument("--seed", type=int, default=0)
    r.add_argument("--no-png", dest="png", action="store_false")
    r.add_argument("--mp4", action="store_true")
    r.add_argument("--no-docs", action="store_true")
    r.add_argument("--gaps", action="store_true")
    r.add_argument("--gap-alpha", type=float, default=0.5)
    r.add_argument("--pick", action="append", default=[])
    r.add_argument("--cloud", type=int, default=1500)
    r.add_argument("--frames-per-doc", type=int, default=36)
    r.add_argument("--fps", type=int, default=30)
    r.add_argument("--size", type=int, default=1080)
    c = sub.add_parser("canon")
    c.add_argument("--out", type=Path, required=True)
    c.add_argument("--dsn")
    c.add_argument("--include-private", action="store_true")
    c.add_argument("--k", type=int, default=12)
    c.add_argument("--seed", type=int, default=0)
    c.add_argument("--min-df", type=int, default=3)
    c.add_argument("--max-df", type=float, default=0.15)
    c.add_argument("--edge-weight", type=float, default=1.0)
    c.add_argument("--weighting", choices=graph.WEIGHTINGS, default="idf-rownorm")
    c.add_argument("--charts", default="projection,boxplot,residuals")
    c.add_argument("--axes", default="2,3")
    c.add_argument("--smooth", action="store_true")
    c.add_argument("--no-globe", dest="globe", action="store_false")
    n = sub.add_parser("neighbors")
    n.add_argument("--node", help="graph node slug")
    n.add_argument("--corpus", help="registry corpus instead of the graph")
    n.add_argument("--doc", help="document id within --corpus")
    n.add_argument("--csv", type=Path, help="table of entities with numeric columns, for advisor matching")
    n.add_argument("--id-col", default="id")
    n.add_argument("--name-col", default="name")
    n.add_argument("--profile", help="JSON object of column values to match against --csv")
    n.add_argument("--scope", choices=neighbors.SCOPES, default="global")
    n.add_argument("--k", type=int, default=10)
    n.add_argument("--components", type=int, default=12)
    n.add_argument("--space", choices=("raw", "z"), default="raw")
    n.add_argument("--dsn")
    b = sub.add_parser("neighbors-bench")
    b.add_argument("--out", type=Path, required=True)
    b.add_argument("--dsn")
    b.add_argument("--corpus", default="80k")
    b.add_argument("--dims", default="12,64")
    b.add_argument("--synthetic", type=int, default=1_000_000)
    b.add_argument("--backends", default=",".join(neighbors.BACKENDS))
    b.add_argument("--queries", type=int, default=500)
    b.add_argument("--threads", type=int, default=1)
    a = sub.add_parser("advisor-review")
    a.add_argument("--people", type=Path, required=True)
    a.add_argument("--query", type=Path, required=True)
    a.add_argument("--out", type=Path, required=True)
    review_args(a)
    rb = sub.add_parser("reference-basis")
    rb.add_argument("--out", type=Path, required=True)
    rb.add_argument("--basis", type=Path, help="JSON list of {name, text} documents; default is the cached OpenAlex topic taxonomy")
    rb.add_argument("--k", type=int, default=12)
    rb.add_argument("--max-features", type=int, default=6000)
    rb.add_argument("--seed", type=int, default=0)
    es = sub.add_parser("explore-space")
    es.add_argument("kind", choices=["advisors"])
    es.add_argument("--bundle", type=Path, required=True)
    es.add_argument("--basis-file", type=Path, required=True)
    es.add_argument("--out", type=Path, required=True)
    f = sub.add_parser("fit-me")
    f.add_argument("--statement", type=Path)
    f.add_argument("--cv", type=Path)
    f.add_argument("--people", type=Path)
    f.add_argument("--out", type=Path, required=True)
    f.add_argument("--forget", action="store_true")
    review_args(f)
    return p

def review_args(a) -> None:
    a.add_argument("--k", type=int, default=64)
    a.add_argument("--top", type=int, default=300)
    a.add_argument("--directions", type=Path, default=None)
    a.add_argument("--extra-people", type=Path, action="append", help="more people files; a person already present (ORCID, then OpenAlex, then ROR plus name) keeps the first record")
    a.add_argument("--suppress", type=Path, help="opt-out and tombstone list: one ORCID, OpenAlex id or sha256:<hex of 'name|institution' lowercased> per line; required with --extra-people")
    a.add_argument("--publishable", action="store_true")
    a.add_argument("--images", action="store_true", help="load portrait images from image_url hosts; off shows the knowledge chart")
    a.add_argument("--basis", type=Path, help="JSON list of {name, text} reference documents that define the prime directions")
    a.add_argument("--basis-openalex", action="store_true", help="fit the prime directions on the OpenAlex topic taxonomy, cached under the data root")
    a.add_argument("--cap", type=int, default=5)
    a.add_argument("--cap-window", type=int, default=50)
    a.add_argument("--label", type=int, default=25)
    a.add_argument("--min-df", type=int, default=3)
    a.add_argument("--max-df", type=float, default=0.2)
    a.add_argument("--min-chars", type=int, default=200)
    a.add_argument("--seed", type=int, default=0)
    a.add_argument("--min-rows", type=int, default=0)
    a.add_argument("--bench-k", type=int, default=25)
    a.add_argument("--stop-heading", default="## References")
    a.add_argument("--text-keys", help="comma-separated record paths to use as text, e.g. author_topics.name,works")
    a.add_argument("--scoring", choices=advisors.SCORINGS, default="whitened")
    a.add_argument("--ror-cache", type=Path, help="cache file for ROR lookups; enables country and profile checks")
    a.add_argument("--ror-offline", action="store_true")
    a.add_argument("--watch", type=float, default=0.0)
    a.add_argument("--max-runs", type=int, default=0)

def cmd_fit_me(args) -> int:
    repo = corpora.TOOL_REPO_ROOT
    try:
        if args.forget:
            fitme.forget(args.out, repo, corpora.data_root())
            print(f"deleted {args.out}")
            return 0
        if args.statement is None or args.people is None:
            print("fit-me needs --statement and --people (the public advisor export is not published yet)", file=sys.stderr)
            return 2
        out = check_private_out(args.out, [repo, corpora.data_root()])
        text = fitme.read_text(args.statement)
        if args.cv:
            text = text + "\n\n" + fitme.read_text(args.cv)
        fitme.prepare_out(out, corpora.data_root())
    except (fitme.FitError, PrivacyError) as exc:
        print(str(exc), file=sys.stderr)
        return 2
    ns = argparse.Namespace(**{**vars(args), "query": args.statement, "query_text": text[:fitme.MAX_CHARS], "publishable": True,
                                "directions_from_statement": args.directions is None})
    people = advisors.load_people(args.people, text_keys=tuple(k.strip() for k in args.text_keys.split(",")) if args.text_keys else advisors.TEXT_KEYS)
    advisor_run(ns, out, people)
    print("wrote " + ", ".join(sorted(p.name for p in out.iterdir() if p.name != fitme.MARKER)) + f" to {out}; delete with --forget")
    return 0

def cmd_advisor_review(args) -> int:
    out = check_private_out(args.out, [corpora.TOOL_REPO_ROOT, corpora.data_root()])
    last = None
    runs = 0
    while True:
        sig = None
        if args.people.exists():
            st = args.people.stat()
            sig = (st.st_size, st.st_mtime_ns)
        if sig is not None and sig != last:
            keys = tuple(k.strip() for k in args.text_keys.split(",")) if args.text_keys else advisors.TEXT_KEYS
            people = advisors.load_people(args.people, text_keys=keys)
            if len(people) >= args.min_rows:
                advisor_run(args, out, people)
                runs += 1
                last = sig
            else:
                print(f"{len(people)} people, waiting for {args.min_rows}", flush=True)
                last = sig
        if not args.watch or (args.max_runs and runs >= args.max_runs):
            break
        time.sleep(args.watch)
    if runs == 0:
        print("no run: input missing or below --min-rows", file=sys.stderr)
        return 3
    return 0

def merge_extra_people(args, people: list) -> list:
    paths = getattr(args, "extra_people", None) or []
    for p in paths:
        if not p.exists():
            print(f"WARNING: --extra-people {p} does not exist; building without it", file=sys.stderr, flush=True)
    extra = [p for p in paths if p.exists()]
    if not extra:
        return people
    if not getattr(args, "suppress", None):
        raise SystemExit("--extra-people needs --suppress FILE: opt-outs and tombstones must be applied to merged people (an empty file is allowed)")
    blocked = advisors.load_suppress(args.suppress)
    keys = tuple(k.strip() for k in args.text_keys.split(",")) if args.text_keys else advisors.TEXT_KEYS
    merged, seen = [], set()
    for person in people + [q for path in extra for q in advisors.load_people(path, text_keys=keys, allow_partial_tail=True)]:
        if advisors.suppressed(person, blocked):
            continue
        k = advisors.person_key(person)
        if k in seen:
            continue
        seen.add(k)
        merged.append(person)
    return merged

def advisor_run(args, out: Path, people: list) -> None:
    people = merge_extra_people(args, people)
    timings: dict = {"load_s": 0.0}
    checks = None
    if args.ror_cache:
        client = ror.RorClient(args.ror_cache, offline=args.ror_offline)
        checks = _time(timings, "ror_s", ror.validate, people, client)
    query_text = getattr(args, "query_text", None) or args.query.read_text(encoding="utf-8")
    query = advisors.statement_body(query_text, args.stop_heading)
    basis = None
    if getattr(args, "basis", None):
        basis = reference.load_basis(args.basis)
    elif getattr(args, "basis_openalex", False):
        basis = reference.fetch_topics(corpora.data_root() / "openalex-topics.json", os.environ.get("PRIME_CONTACT"))
    if basis is not None:
        model_ = _time(timings, "fit_s", advisors.fit_people_on_basis, people, basis, k=args.k, min_chars=args.min_chars, seed=args.seed)
    else:
        model_ = _time(timings, "fit_s", advisors.fit_people, people, k=args.k, min_df=args.min_df, max_df=args.max_df,
                       min_chars=args.min_chars, seed=args.seed)
    rows, qraw, scored = _time(timings, "rank_s", advisors.rank, model_, query, top=None, scoring=args.scoring)
    phd = [row for row in rows if not advisors.is_source(row, "stevens")]
    mixes = {
        "all_sources": advisors.institution_mix(rows),
        "phd_view": advisors.institution_mix(phd),
        "phd_view_capped": advisors.institution_mix(advisors.diversify(phd, args.cap, args.cap_window)),
    }
    space, qspace = advisors.score_space(model_.result.raw_scores, qraw, args.scoring)
    bench = advisors.index_benchmark(space, np.vstack([qspace[None, :], space[:199]]), k=args.bench_k)
    advisors.write_csv(rows[: args.top], out / "ranked.csv")
    _, axes = _time(timings, "plot_s", advisors.plot, model_, qraw, rows, out / "pca.png", label=args.label)
    r = model_.result
    sp_ = scored["score_spread"]
    context = {
        "key": hashlib.sha256(query.encode("utf-8")).hexdigest()[:12],
        "summary": (f"{r.shape[0]:,} of {len(people):,} professors ranked against the research statement. "
                    f"PhD advisors view by default; Stevens contacts in their own view."),
        "method": (f"Each professor's topics become a term vector, weighted by rarity and scaled to unit length. "
                   f"A truncated SVD keeps {r.k} orthogonal components, {r.variance_ratio.sum() * 100:.0f}% of the variance. "
                   f"The statement is projected into the same components. Scores are cosine similarity after "
                   f"{'centering on the mean professor and scaling each component to unit spread' if args.scoring == 'whitened' else args.scoring + ' scores'}, "
                   f"so each component counts equally. The percentile compares a score with all {r.shape[0]:,} professors."),
        "plot": (f"The plot uses components {axes['components'][0]} and {axes['components'][1]} because the statement "
                 f"sits farthest from the average professor on them ({axes['statement_sd'][0]:+.1f} and "
                 f"{axes['statement_sd'][1]:+.1f} sd), which together carry {axes['share_of_statement'] * 100:.0f}% of "
                 f"the statement's position. Numbers mark the top {args.label} ranks."),
        "spread": sp_,
        "cap": args.cap,
        "cap_window": args.cap_window,
    }
    directions = advisors.load_directions(args.directions) if args.directions else (
        fitme.statement_directions(model_, query_text) if getattr(args, "directions_from_statement", False) else [])
    context.update(advisors.direction_profiles(model_, rows, query, directions, args.scoring))
    advisors.write_page(rows, out / "pca.png", context, out / "index.html", publishable=args.publishable, images=getattr(args, "images", False))
    advisors.write_review_json(rows, context, out / "review.json")
    report = {
        "people": len(people), "fitted": r.shape[0], "terms": r.shape[1], "k": r.k,
        "orthogonality": r.orthogonality, "variance_explained": float(r.variance_ratio.sum()),
        "scoring": args.scoring, "score_spread": sp_, "plot": axes, "timings": timings,
        "index_benchmark": bench, "checks": checks, "institution_mix_top100": mixes,
        "statement_scores": [round(float(v), 5) for v in qraw],
        "components": [{"index": c + 1, "top_terms": [t for t, _ in r.top_terms(c, 8)]} for c in range(r.k)],
    }
    export.write_json(report, out / "report.json")
    print(json.dumps({k: report[k] for k in ("people", "fitted", "terms", "k", "score_spread", "checks", "institution_mix_top100", "timings")}), flush=True)
    print(f"open: xdg-open {out / 'index.html'}", flush=True)

def _print_neighbors(found: list) -> None:
    for nb in found:
        print(json.dumps({"id": nb.id, "title": nb.title, "distance": round(nb.distance, 5), "canon": nb.label + 1}))

def cmd_neighbors(args) -> int:
    if args.csv:
        if not args.profile:
            raise ValueError("--csv needs --profile")
        ns, pca = neighbors.advisor_space(args.csv, args.id_col, args.name_col)
        _print_neighbors(neighbors.match_advisors(ns, pca, json.loads(args.profile), k=args.k))
        return 0
    if args.corpus:
        ns, _ = space.corpus_space(args.corpus, k=args.components, space=args.space)
        key = args.doc
    else:
        ns, _ = space.graph_space(args.dsn, k=args.components, space=args.space)
        key = args.node
    if not key:
        raise ValueError("name a --node, or a --doc with --corpus")
    _print_neighbors(neighbors.neighbors(ns, key, k=args.k, scope=args.scope))
    return 0

def synthetic_vectors(n: int, dim: int, seed: int = 0, clusters: int = 24) -> np.ndarray:
    rng = np.random.default_rng(seed)
    centers = rng.normal(scale=3.0, size=(clusters, dim))
    return centers[rng.integers(0, clusters, size=n)] + rng.normal(size=(n, dim))

def cmd_neighbors_bench(args) -> int:
    import os

    backends = [b.strip() for b in args.backends.split(",") if b.strip()]
    unknown = [b for b in backends if b not in neighbors.BACKENDS]
    if unknown:
        raise ValueError(f"unknown backends {unknown}")
    dsn = args.dsn or os.environ.get("PRIME_GRAPH_DSN", graph.LOCAL_DSN)
    dims = [int(d) for d in args.dims.split(",")]
    datasets: dict[str, np.ndarray] = {}
    gs, _ = space.graph_space(dsn, k=dims[0])
    datasets[f"graph-k{dims[0]}"] = gs.vectors
    for d in dims:
        cs, _ = space.corpus_space(args.corpus, k=d)
        datasets[f"{args.corpus}-k{d}"] = cs.vectors
    if args.synthetic:
        for d in dims:
            datasets[f"synthetic{args.synthetic}-d{d}"] = synthetic_vectors(args.synthetic, d)
    rows = []
    for name, vectors in datasets.items():
        for row in neighbors.benchmark(vectors, backends, n_queries=args.queries, dsn=dsn, threads=args.threads):
            rows.append({"dataset": name, **row})
            print(json.dumps(rows[-1]), flush=True)
    load = os.getloadavg()
    export.write_json({"rows": rows, "load_average": [round(x, 2) for x in load], "cpus": os.cpu_count()},
                      args.out / "neighbors-bench.json")
    return 0

def parse_charts(value: str) -> list[str]:
    chosen = [c.strip() for c in value.split(",") if c.strip()]
    unknown = [c for c in chosen if c not in charts.CHARTS]
    if unknown:
        raise ValueError(f"unknown charts {unknown}; choose from {', '.join(charts.CHARTS)}")
    return chosen

def cmd_canon(args) -> int:
    out: Path = args.out
    if args.include_private:
        check_private_out(out, [corpora.TOOL_REPO_ROOT, corpora.data_root()])
    chosen = parse_charts(args.charts)
    axes = tuple(int(a) for a in args.axes.split(","))
    timings: dict = {}
    g = _time(timings, "load_s", graph.load_graph, args.dsn, exclude_patterns=() if args.include_private else graph.PRIVATE_PATTERNS)
    result = _time(timings, "fit_s", graph.fit_graph, g, k=args.k, seed=args.seed,
                   edge_weight=args.edge_weight, weighting=args.weighting, min_df=args.min_df, max_df=args.max_df)
    adj = g.adjacency(symmetric=True)
    rank, iterations = _time(timings, "pagerank_s", graph.pagerank, g.adjacency(symmetric=False))
    clusters = _time(timings, "cluster_s", canon.canon_clusters, result, adj, rank, [n.branch for n in g.nodes], seed=args.seed)
    names = [c["name"] for c in clusters.clusters]
    data = export.to_dict(result, include_docs=False)
    data.update({
        "kind": "canon-clusters",
        "graph": g.meta,
        "pagerank": {"damping": 0.85, "iterations": iterations},
        "canon_clusters": clusters.clusters,
        "cluster_metrics": clusters.metrics,
        "component_summaries": canon.summaries(result),
        "nodes": [
            {"slug": n.slug, "title": n.title, "kind": n.kind, "branch": n.branch, "canon": int(clusters.labels[i]) + 1,
             "pagerank": round(float(rank[i]), 7), "residual": round(float(r), 4),
             "scores": [round(float(v), 3) for v in result.scores[i]]}
            for i, (n, r) in enumerate(zip(g.nodes, result.residuals()))
        ],
    })
    started = time.perf_counter()
    if "projection" in chosen:
        charts.projection(result, out / "projection.png", axes=axes, labels=clusters.labels, names=names, size=rank)
        if args.smooth:
            charts.projection(result, out / "projection-smooth.png", axes=axes, labels=clusters.labels, names=names,
                              size=rank, smooth=True)
    if "boxplot" in chosen:
        charts.boxplot(result, out / "boxplot.png")
    if "residuals" in chosen:
        _, data["residual_summary"] = charts.residuals(result, out / "residuals.png", against=rank)
    if args.globe:
        picks = [int(np.flatnonzero(clusters.labels == c)[np.argmax(rank[clusters.labels == c])])
                 for c in range(min(6, len(clusters.clusters)))]
        render.render_png(result, out / "globe.png", picks=picks, title="Canon clusters of the Bucket graph")
    timings["charts_s"] = round(time.perf_counter() - started, 3)
    data["timings"] = timings
    export.write_json(data, out / "canon.json")
    print(json.dumps({"shape": data["shape"], "metrics": clusters.metrics, "timings": timings,
                      "canons": [c["name"] for c in clusters.clusters]}, indent=1))
    return 0

def cmd_list(registry: dict[str, corpora.CorpusSpec]) -> int:
    for spec in registry.values():
        path = corpora.resolve_path(spec.path)
        flag = "private" if spec.private else "public"
        print(f"{spec.name:18} {spec.kind:11} {flag:8} {'ok' if path.exists() else 'missing':8} {spec.description}")
    return 0

def cmd_run(args, registry: dict[str, corpora.CorpusSpec]) -> int:
    names = list(registry) if args.all else args.names
    if not names:
        print("name at least one corpus, or pass --all", file=sys.stderr)
        return 2
    unknown = [n for n in names if n not in registry]
    if unknown:
        print(f"unknown corpora: {', '.join(unknown)}", file=sys.stderr)
        return 2
    specs = [registry[n] for n in names]
    private_out = None
    if any(s.private for s in specs):
        private_out = check_private_out(args.private_out, [corpora.TOOL_REPO_ROOT, corpora.data_root()])
    results: dict[str, model.PrimeResult] = {}
    payloads: dict[str, dict] = {}
    failures: dict[str, str] = {}
    for spec in specs:
        out_dir = (private_out if spec.private else args.out) / spec.name
        started = time.perf_counter()
        try:
            result, data = run_corpus(spec, args, out_dir)
        except Exception as exc:
            failures[spec.name] = f"{type(exc).__name__}: {exc}"
            print(f"[{spec.name}] failed: {exc}", file=sys.stderr)
            continue
        data["timings"]["total_s"] = round(time.perf_counter() - started, 3)
        export.write_json(data, out_dir / "prime.json")
        results[spec.name], payloads[spec.name] = result, data
        print(f"[{spec.name}] {result.shape[0]} docs x {result.shape[1]} terms, ortho {result.orthogonality:.1e}, {data['timings']}")
    gap_reports: dict[str, dict] = {}
    gap_all: dict[str, dict] = {}
    if args.gaps and len(results) > 1:
        public = [n for n in results if not registry[n].private]
        for name, result in results.items():
            spec = registry[name]
            pool = [n for n in results if n != name] if spec.private else [n for n in public if n != name]
            if pool:
                start = time.perf_counter()
                report = gaps.analyze(result, {n: results[n].term_stats for n in pool}, alpha=args.gap_alpha)
                report["seconds"] = round(time.perf_counter() - start, 3)
                base = private_out if spec.private else args.out
                export.write_json(report, base / name / "gaps.json")
                gap_reports[name] = report
            if not spec.private and private_out is not None:
                full = gaps.analyze(result, {n: results[n].term_stats for n in results if n != name}, alpha=args.gap_alpha)
                export.write_json(full, private_out / name / "gaps-all.json")
                gap_all[name] = full
    def summarize(name: str, reports: dict[str, dict]) -> dict:
        return {
            "shape": payloads[name]["shape"],
            "clean": payloads[name]["clean"],
            "timings": payloads[name]["timings"],
            "orthogonality": payloads[name]["orthogonality_max_abs_error"],
            "top_components": [
                {"index": c["index"], "variance_ratio": c["variance_ratio"], "terms": [t["term"] for t in c["top_terms"][:6]]}
                for c in payloads[name]["components"][:4]
            ],
            "gap_terms": [t["term"] for t in reports.get(name, {}).get("terms", [])[:12]],
            "gap_components": [
                {"component": c["component"], "gap": c["gap"], "terms": c["gap_terms"][:6]}
                for c in reports.get(name, {}).get("components", [])[:3]
            ],
        }

    public_summary = {n: summarize(n, gap_reports) for n in payloads if not registry[n].private}
    summary = {n: summarize(n, {**gap_reports, **gap_all}) for n in payloads}
    export.write_json({"corpora": public_summary, "failures": {n: e for n, e in failures.items() if not registry[n].private}}, args.out / "summary.json")
    if private_out is not None:
        export.write_json({"corpora": summary, "failures": failures}, private_out / "summary.json")
    return 1 if failures else 0

def cmd_reference_basis(args) -> int:
    if args.basis:
        rows = reference.load_basis(args.basis)
    else:
        rows = reference.fetch_topics(corpora.data_root() / "openalex-topics.json", os.environ.get("PRIME_CONTACT"))
    data = reference.build_reference_basis(rows, k=args.k, max_features=args.max_features, seed=args.seed)
    export.write_json(data, args.out)
    print(f"wrote {args.out}: {len(data['vocab'])} terms, {args.k} components")
    return 0

def cmd_explore_space(args) -> int:
    from . import explore_space

    basis_file = json.loads(args.basis_file.read_text(encoding="utf-8"))
    bundle = json.loads(args.bundle.read_text(encoding="utf-8"))
    data = explore_space.advisors_space(basis_file, bundle)
    explore_space.write_space(data, args.out)
    print(f"wrote {args.out}: {len(data['obs'])} advisors, {len(data['components'])} components")
    return 0

def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.cmd == "reference-basis":
        return cmd_reference_basis(args)
    if args.cmd == "explore-space":
        return cmd_explore_space(args)
    registry = corpora.load_registry(args.registry)
    if args.cmd == "list":
        return cmd_list(registry)
    try:
        if args.cmd == "canon":
            return cmd_canon(args)
        if args.cmd == "fit-me":
            return cmd_fit_me(args)
        if args.cmd == "advisor-review":
            return cmd_advisor_review(args)
        if args.cmd == "neighbors":
            return cmd_neighbors(args)
        if args.cmd == "neighbors-bench":
            return cmd_neighbors_bench(args)
        return cmd_run(args, registry)
    except (PrivacyError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        return 2

if __name__ == "__main__":
    sys.exit(main())
