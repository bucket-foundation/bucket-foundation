import re
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import dated_lists
import formal_conjectures
import named_lists
import solved_discoveries
import wikipedia_lists
from common import OUTPUT, ascii_fold, dedupe, existing_titles, write

ERDOS_ALIASES = {
    "Erdős-Faber-Lovász conjecture": "ErdosProblems/19.lean",
    "Erdős-Gyárfás conjecture": "ErdosProblems/136.lean",
    "Erdős-Hajnal conjecture": "ErdosProblems/61.lean",
    "Erdős conjecture on arithmetic progressions": "ErdosProblems/3.lean",
    "Erdős-Turán conjecture on additive bases": "ErdosProblems/40.lean",
    "Erdős-Moser problem": "Wikipedia/ErdosMoser.lean",
    "Erdős sumset conjecture": "ErdosProblems/109.lean",
    "Erdős discrepancy problem": "ErdosProblems/67.lean",
    "Burr-Erdős conjecture": "ErdosProblems/163.lean",
    "Erdős unit distance conjecture": "ErdosProblems/90.lean",
}


def alias_key(text):
    return re.sub(r"[^a-z]", "", ascii_fold(re.sub(r"^the\s+", "", text, flags=re.I)))


def merge_erdos(rows):
    by_path = {}
    for row in rows:
        if row.id.startswith("fc-") and not row.variant_of:
            by_path.setdefault(row.source.split("FormalConjectures/")[1], row)
    merged = 0
    drop = set()
    for alias, path in ERDOS_ALIASES.items():
        parent = by_path.get(path)
        wiki = next((r for r in rows if r.id.startswith("wp-") and alias_key(r.name).startswith(alias_key(alias))), None)
        if not parent or not wiki:
            continue
        parent.name = wiki.name
        parent.source = f"{parent.source};{wiki.source}"
        parent.licence = f"{parent.licence};{wiki.licence}"
        parent.statement_source = f"{parent.statement_source};{wiki.statement_source}"
        parent.status_source = f"{parent.status_source};{wiki.status_source} ({wiki.status})"
        parent.posed = parent.posed or wiki.posed
        parent.resolved = parent.resolved or wiki.resolved
        parent.market = wiki.market
        for keyword in wiki.keywords:
            if keyword.lower() not in {k.lower() for k in parent.keywords} and len(parent.keywords) < 8:
                parent.keywords.append(keyword)
        drop.add(wiki.id)
        merged += 1
    return [r for r in rows if r.id not in drop], merged


def main():
    rows = named_lists.rows() + wikipedia_lists.rows() + formal_conjectures.rows() + solved_discoveries.rows()
    rows, merged = merge_erdos(rows)
    rows = dedupe(rows, existing_titles())
    write(rows)
    kept, dropped, filled, _ = dated_lists.apply()
    rows += kept
    top = [r for r in rows if not r.variant_of]
    variants = [r for r in rows if r.variant_of]
    print(f"wrote {len(rows)} rows to {OUTPUT}; {merged} Erdős rows merged; {len(kept)} dated-list rows appended, {len(dropped)} matched existing rows, posed filled {dict(filled)}")
    print("by source:", dict(Counter("both" if ";" in r.source else "solved-discoveries" if r.id.startswith("sd-") else "dated-lists" if r.id.startswith("dl-") else "wikipedia" if "wikipedia" in r.source else "formal-conjectures" for r in rows)))
    print("by branch:", dict(Counter(r.branch for r in rows)))
    print("by form:", dict(Counter(r.form for r in rows)))
    print("top-level status:", dict(Counter(r.status for r in top)), "variants:", dict(Counter(r.status for r in variants)))
    print("with statement:", sum(bool(r.statement) for r in rows), "posed:", sum(bool(r.posed) for r in rows), "resolved:", sum(bool(r.resolved) for r in rows))


if __name__ == "__main__":
    main()
