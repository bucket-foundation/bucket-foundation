"""Command line for the evidence-search worker.

    python3 -m evidence_search verify
    python3 -m evidence_search probe [--out probe.json]
    python3 -m evidence_search build-vectors <corpus dir> [--out <dir>] [--batch N]
    python3 -m evidence_search serve --vectors <dir> [--host 127.0.0.1] [--port 8431]

Run from tools/evidence-search. `serve` reads EVIDENCE_WORKER_SECRET from
the environment and refuses a non-loopback host.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from pathlib import Path

from .registry import model_entry, verify_model, verify_runtime

REPO = Path(__file__).resolve().parents[3]
DEFAULT_VECTORS = REPO / "local" / "evidence" / "vectors"
DISK_RESERVE = 50 * 1024**3


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="evidence_search")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("verify")
    p = sub.add_parser("probe")
    p.add_argument("--out")
    b = sub.add_parser("build-vectors")
    b.add_argument("corpus")
    b.add_argument("--out", default=str(DEFAULT_VECTORS))
    b.add_argument("--batch", type=int, default=16)
    s = sub.add_parser("serve")
    s.add_argument("--vectors", required=True)
    s.add_argument("--host", default="127.0.0.1")
    s.add_argument("--port", type=int, default=8431)
    args = ap.parse_args(argv)

    if args.cmd == "verify":
        _, entry = model_entry()
        problems = verify_model(entry) + verify_runtime()
        for line in problems:
            print(f"  [problem] {line}")
        print(f"[evidence] {'verified' if not problems else f'{len(problems)} problems'}: {entry['repo']}@{entry['revision'][:12]}")
        return 1 if problems else 0

    if args.cmd == "probe":
        from .probe import probe

        report = probe(disk_path=str(REPO))
        text = json.dumps(report, indent=2)
        if args.out:
            Path(args.out).write_text(text + "\n", encoding="utf-8")
        print(text)
        return 0 if report["ok"] else 1

    if args.cmd == "build-vectors":
        from .encoder import Encoder
        from .vectors import build_vectors

        out = Path(args.out)
        out.mkdir(parents=True, exist_ok=True)
        if shutil.disk_usage(out).free < DISK_RESERVE:
            print("[evidence] less than 50 GiB free on the output disk; nothing built", file=sys.stderr)
            return 2
        path = build_vectors(Path(args.corpus), out, Encoder(), batch_size=args.batch)
        print(f"[evidence] {path}")
        print((path / "manifest.json").read_text(encoding="utf-8"))
        return 0

    if args.cmd == "serve":
        from .encoder import Encoder
        from .vectors import VectorIndex
        from .worker import Worker, make_server

        index = VectorIndex.load(Path(args.vectors))
        enc = Encoder()
        if enc.revision != index.model_revision:
            print(f"[evidence] the vectors were built with {index.model_revision[:12]}, the pinned model is {enc.revision[:12]}", file=sys.stderr)
            return 2
        worker = Worker(index, enc.encode_query, enc.revision)
        server = make_server(worker, os.environ.get("EVIDENCE_WORKER_SECRET", ""), args.host, args.port)
        print(f"[evidence] serving corpus {index.corpus_revision[:12]} on {args.host}:{server.server_address[1]}", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            server.server_close()
        return 0
    return 2


if __name__ == "__main__":
    sys.exit(main())
