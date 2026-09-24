from __future__ import annotations

import argparse
import json
import sys

from . import labor

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m bucket_eval.evolution")
    parser.add_argument("sources", nargs="+", choices=sorted(list(labor.PULLS) + list(labor.GATED)))
    args = parser.parse_args(argv)
    for name in args.sources:
        if name in labor.GATED:
            try:
                labor.pull_gated(name)
            except labor.GatedSourceError as err:
                print(str(err), file=sys.stderr)
            continue
        result = labor.PULLS[name]()
        print(json.dumps({"source": name, "tables": {k: t.rows for k, t in result.manifest.tables.items()}, "written": result.written}))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
