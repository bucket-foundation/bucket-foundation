import json
import sys
from pathlib import Path

from sentence_transformers import SentenceTransformer

import atlas
import records

HERE = Path(__file__).parent
RICH = "statement_titles_aliases"


def run():
    problems = atlas.load_problems()
    model = SentenceTransformer(atlas.MODEL, revision=atlas.MODEL_REVISION)
    texts_a = [atlas.keyword_text(n) for n in problems]
    pairs = [atlas.embed_text(n, RICH) for n in problems]
    texts_b = [t for t, _ in pairs]
    used = sum(kind == RICH for _, kind in pairs)
    emb_a = atlas.unit(model.encode(texts_a, normalize_embeddings=True))
    emb_b = atlas.unit(model.encode(texts_b, normalize_embeddings=True))
    shift = atlas.neighbour_shift([n["id"] for n in problems], emb_a, emb_b)
    shift["record_texts"] = used
    return shift


def section(shift):
    lines = [records.NEIGHBOUR_HEADING, "", f"k = {shift['k']} nearest neighbours by cosine over the {shift['problems']} problems, keyword text against the `{RICH}` record text ({shift['record_texts']} problems had one). {shift['changed_edges']} of {shift['possible_edges']} neighbour slots changed; {shift['problems_with_change']} problems lost at least one neighbour. Rebuilt by `python3 neighbour_shift.py`.", "", "| id | neighbours changed | cosine between the two texts | left | entered |", "|---|---|---|---|---|"]
    for r in shift["rows"][:5]:
        lines.append(f"| {r['id']} | {r['changed']} | {r['cosine']} | {', '.join(r['left'])} | {', '.join(r['entered'])} |")
    return "\n".join(lines) + "\n"


def main():
    shift = run()
    text = section(shift)
    records.replace_section(HERE / "records" / "INDEX.md", records.NEIGHBOUR_HEADING, text)
    print(json.dumps({k: v for k, v in shift.items() if k != "rows"}), file=sys.stderr)
    print(text)


if __name__ == "__main__":
    main()
