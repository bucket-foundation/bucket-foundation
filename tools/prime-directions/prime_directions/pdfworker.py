from __future__ import annotations

import sys

import pypdf.filters as filters

MAX_PAGES = 40
MAX_CHARS = 200_000


def main(path: str) -> int:
    filters.ZLIB_MAX_OUTPUT_LENGTH = 50_000_000
    filters.LZW_MAX_OUTPUT_LENGTH = 50_000_000
    filters.MAX_DECLARED_STREAM_LENGTH = 50_000_000
    from pypdf import PdfReader

    reader = PdfReader(path)
    if len(reader.pages) > MAX_PAGES:
        sys.stderr.write(f"pages:{len(reader.pages)}\n")
        return 3
    total = 0
    for page in reader.pages[:MAX_PAGES]:
        text = page.extract_text() or ""
        sys.stdout.write(text + "\n")
        total += len(text)
        if total > MAX_CHARS:
            break
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
