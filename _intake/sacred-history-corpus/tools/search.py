#!/usr/bin/env python3
"""RRF hybrid search CLI over the sacred-history corpus.

Cloned from ~/jackkruse/search.py — same interface, same RRF fusion.

Usage:
    python3 search.py "flood narrative"
    python3 search.py --mode=keyword "Moses"
    python3 search.py --mode=semantic "covenant"
    python3 search.py --limit=20 "messiah"
"""

from __future__ import annotations

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sh_search import load_searcher  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("query", nargs="+", help="search query")
    ap.add_argument("--mode", choices=("keyword", "semantic", "hybrid"),
                    default="hybrid")
    ap.add_argument("--limit", type=int, default=10)
    ap.add_argument("--json", action="store_true", help="emit json")
    args = ap.parse_args()
    q = " ".join(args.query)
    searcher = load_searcher(args.mode)
    hits = searcher.search(q, limit=args.limit)
    if args.json:
        print(json.dumps([h.to_dict() for h in hits], indent=2, ensure_ascii=False))
        return
    for i, h in enumerate(hits, 1):
        print(f"{i:2}. [{h.tradition}] {h.title}  ({h.source_id} / {h.locator})  score={h.score:.4f}")
        print(f"    {h.snippet}")


if __name__ == "__main__":
    main()
