#!/usr/bin/env python3
"""Runs every fig_<name>.py in this directory and reports the PDF/PNG pairs
written, with file sizes. Makefile-friendly: a `figures` target can call
`python3 build_all.py` directly, or depend on the individual fig_*.pdf files
built by their own `python3 fig_<name>.py` rule.

Run: python3 build_all.py
"""
import glob
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    scripts = sorted(
        p for p in glob.glob(os.path.join(HERE, "fig_*.py"))
    )
    if not scripts:
        print("no fig_*.py scripts found in", HERE)
        return 1

    for script in scripts:
        name = os.path.basename(script)
        print(f"-- running {name}")
        subprocess.run([sys.executable, script], check=True, cwd=HERE)

    outputs = sorted(
        glob.glob(os.path.join(HERE, "fig_*.pdf")) + glob.glob(os.path.join(HERE, "fig_*.png"))
    )
    print(f"\nwrote {len(outputs)} files:")
    total_bytes = 0
    for f in outputs:
        size = os.path.getsize(f)
        total_bytes += size
        print(f"  {os.path.basename(f):32s} {size:>10,d} bytes")
    print(f"total: {total_bytes:,d} bytes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
