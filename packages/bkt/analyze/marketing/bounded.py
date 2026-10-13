from __future__ import annotations

import os
import resource
import sys
from pathlib import Path

MEMORY = 2 << 30
CPU_SECONDS = 90
FILE_BYTES = 64 << 20
OPEN_FILES = 64


def limit() -> None:
    os.environ["OPENBLAS_NUM_THREADS"] = "1"
    os.environ["OMP_NUM_THREADS"] = "1"
    for res, value in ((resource.RLIMIT_AS, MEMORY), (resource.RLIMIT_CPU, CPU_SECONDS), (resource.RLIMIT_FSIZE, FILE_BYTES), (resource.RLIMIT_NOFILE, OPEN_FILES)):
        soft, hard = resource.getrlimit(res)
        cap = value if hard == resource.RLIM_INFINITY else min(value, hard)
        resource.setrlimit(res, (cap, cap))


def main(argv: list[str]) -> int:
    limit()
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    import bkt_analyze

    return bkt_analyze.main([*argv, "--quiet-errors"])


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
