from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .datasets import openalex_slice, science4cast

RUNS = Path(__file__).resolve().parents[1] / "runs"

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="bucket-eval")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("science4cast-pull")
    pilot = sub.add_parser("openalex-pilot")
    pilot.add_argument("--stride", type=int, default=100)
    pilot.add_argument("--out", type=Path, default=RUNS / "d2-pilot.json")
    args = parser.parse_args(argv)
    if args.command == "science4cast-pull":
        doc = science4cast.pull()
        print(json.dumps({k: doc[k] for k in ("file", "size", "md5", "sha256", "extracted_bytes")}, indent=2))
        return 0
    result = openalex_slice.pilot(stride=args.stride)
    args.out.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n")
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0 if result["within_limits"] else 3

if __name__ == "__main__":
    sys.exit(main())
