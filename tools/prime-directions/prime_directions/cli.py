from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

from . import clean, corpora, export, gaps, model, render


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
    return p


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
        except (corpora.CorpusError, ValueError, RuntimeError) as exc:
            failures[spec.name] = str(exc)
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


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    registry = corpora.load_registry(args.registry)
    if args.cmd == "list":
        return cmd_list(registry)
    try:
        return cmd_run(args, registry)
    except PrivacyError as exc:
        print(str(exc), file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
