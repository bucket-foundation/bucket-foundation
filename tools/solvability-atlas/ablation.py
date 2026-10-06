import json
import sys
from pathlib import Path

from sentence_transformers import SentenceTransformer

import atlas
import records

HERE = Path(__file__).parent
HEADING = "## Embedding ablation"
WATCH = "uniquegames"


def run():
    problems = atlas.load_problems()
    ids = [n["id"] for n in problems]
    model = SentenceTransformer(atlas.MODEL, revision=atlas.MODEL_REVISION)
    base = None
    rows = []
    for variant in atlas.TEXT_VARIANTS:
        texts = [atlas.embed_text(n, variant)[0] for n in problems]
        emb = atlas.unit(model.encode(texts, normalize_embeddings=True))
        base = emb if base is None else base
        hits = atlas.pair_hits(ids, emb)
        shift = atlas.neighbour_shift(ids, base, emb)
        rows.append({"variant": variant, "rate": hits["rate"], "hits": hits["hits"], "pairs": hits["pairs"], "missed": hits["missed"], "changed_edges": shift["changed_edges"], "possible_edges": shift["possible_edges"], "watch": sorted(atlas.neighbours(ids, emb)[WATCH])})
    return rows


def section(rows):
    best = max(rows, key=lambda r: (r["rate"], r["variant"] == atlas.DEFAULT_TEXT))
    lines = [HEADING, "", f"k = {atlas.K} neighbours over the 71 problems, scored against {rows[0]['pairs']} expected pairs in `atlas.EXPECTED_PAIRS` (a pair hits when either problem sits among the other's neighbours). Default variant: `{atlas.DEFAULT_TEXT}`; best here: `{best['variant']}`. Set `ATLAS_TEXT=<variant>` to build with another. Rebuilt by `python3 ablation.py`.", "",
             "| variant | pair hits | hit rate | neighbour slots changed from keywords | missed pairs | uniquegames neighbours |", "|---|---|---|---|---|---|"]
    for r in rows:
        lines.append(f"| {r['variant']} | {r['hits']} / {r['pairs']} | {r['rate']} | {r['changed_edges']} / {r['possible_edges']} | {', '.join(a + '+' + b for a, b in r['missed'])} | {', '.join(r['watch'])} |")
    return "\n".join(lines) + "\n"


def main():
    rows = run()
    text = section(rows)
    records.replace_section(HERE / "records" / "INDEX.md", HEADING, text)
    print(json.dumps([{k: v for k, v in r.items() if k not in ("missed", "watch")} for r in rows]), file=sys.stderr)
    print(text)


if __name__ == "__main__":
    main()
