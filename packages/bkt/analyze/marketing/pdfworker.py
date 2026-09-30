from __future__ import annotations

import sys

MAX_PAGES = 40
MAX_CHARS = 2_000_000
STREAM_CAP = 50_000_000


def main(path: str) -> int:
    try:
        import pypdf.filters as filters
        from pypdf import PdfReader
    except ImportError:
        return 4
    filters.ZLIB_MAX_OUTPUT_LENGTH = STREAM_CAP
    filters.LZW_MAX_OUTPUT_LENGTH = STREAM_CAP
    filters.MAX_DECLARED_STREAM_LENGTH = STREAM_CAP
    try:
        reader = PdfReader(path)
        if len(reader.pages) > MAX_PAGES:
            sys.stderr.write(f"{len(reader.pages)} pages, limit {MAX_PAGES}\n")
            return 3
        total = 0
        for page in reader.pages:
            text = page.extract_text(extraction_mode="layout") or ""
            sys.stdout.write(text + "\n")
            total += len(text)
            if total > MAX_CHARS:
                break
    except Exception:
        return 5
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
