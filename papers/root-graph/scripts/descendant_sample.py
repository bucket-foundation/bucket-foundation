from __future__ import annotations

import csv
import gzip
import os
import random
import sys

import orjson

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
SEED = 4242
PER_FAMILY = 30
SOURCES = {"la": ("romance", {"es", "it", "pt", "fr"}),
           "gem-pro": ("germanic", {"en", "de", "nl", "sv"}),
           "sla-pro": ("slavic", {"ru", "pl", "cs", "uk"})}
SKIP_TAGS = {"borrowed", "learned", "semi-learned", "calque", "reshaped by analogy or addition of morphemes"}


def flatten(items, targets, out):
    for d in items or ():
        tags = set(d.get("tags") or ()) | set(d.get("raw_tags") or ())
        if tags & SKIP_TAGS or d.get("lang") == "Borrowings":
            continue
        code, word = d.get("lang_code"), d.get("word")
        if code in targets and word and " " not in word:
            out.setdefault(code, word)
        flatten(d.get("descendants"), targets, out)


def main(src: str) -> None:
    pools = {fam: [] for fam, _ in SOURCES.values()}
    with gzip.open(src, "rb") as fh:
        for line in fh:
            if b'"descendants"' not in line:
                continue
            d = orjson.loads(line)
            spec = SOURCES.get(d.get("lang_code"))
            if not spec:
                continue
            fam, targets = spec
            found: dict[str, str] = {}
            flatten(d.get("descendants"), targets, found)
            if len(found) >= 2:
                pools[fam].append((d["lang_code"], d["word"], sorted(found.items())))
    rng = random.Random(SEED)
    rows = []
    for fam, pool in pools.items():
        pool.sort()
        seen = set()
        for src_lang, src_word, found in rng.sample(pool, len(pool)):
            if src_word in seen:
                continue
            seen.add(src_word)
            (la, fa), (lb, fb) = rng.sample(found, 2)
            rows.append({"family": fam, "concept": f"{src_lang}:{src_word}", "lang_a": la, "form_a": fa,
                         "lang_b": lb, "form_b": fb})
            if len(seen) == PER_FAMILY:
                break
        print(fam, len(pool), file=sys.stderr)
    with open(os.path.join(DATA, "cognates_descendants.tsv"), "w", newline="") as fh:
        w = csv.DictWriter(fh, list(rows[0]), delimiter="\t")
        w.writeheader()
        w.writerows(rows)


if __name__ == "__main__":
    main(sys.argv[1])
