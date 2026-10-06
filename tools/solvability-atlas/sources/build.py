import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import formal_conjectures
import named_lists
import wikipedia_lists
from common import OUTPUT, dedupe, existing_titles, write


def main():
    rows = named_lists.rows() + wikipedia_lists.rows() + formal_conjectures.rows()
    rows = dedupe(rows, existing_titles())
    write(rows)
    by_source = Counter(r.source.split("/")[2] if "wikipedia" in r.source else "formal-conjectures" for r in rows)
    by_branch = Counter(r.branch for r in rows)
    print(f"wrote {len(rows)} rows to {OUTPUT}")
    print("by source:", dict(by_source))
    print("by branch:", dict(by_branch))
    print("by status:", dict(Counter(r.status for r in rows)))
    print("with statement:", sum(bool(r.statement) for r in rows), "posed:", sum(bool(r.posed) for r in rows), "resolved:", sum(bool(r.resolved) for r in rows))


if __name__ == "__main__":
    main()
