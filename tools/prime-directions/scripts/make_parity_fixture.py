from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from prime_directions import advisors  # noqa: E402

FIXTURES = HERE.parent / "tests" / "fixtures"
OUT = HERE.parents[2] / "src" / "lib" / "research-os" / "advisors" / "parity-fixture.json"

TEXTS = [
    "I study mitochondria, circadian metabolism and membrane protein energy in the cell.",
    "Neural network inference on graphs, optimization algorithms and transformer data.",
    "Markets, inflation, labor policy and auction incentives in trade.",
    "Quantum field theory, photon spin, lattice superconductivity and laser optics.",
    "## Research Question\nHow do learners **master** knowledge? See https://example.org/x and $k_BT$ terms, Émile's café.",
    "",
    "1234 5678 ___ --- !!!",
    "Wheat barley harvest; nothing else in this vocabulary matches.",
]


def main() -> int:
    people = advisors.load_people(FIXTURES / "people-synthetic.jsonl")
    for i, p in enumerate(people):
        p.meta.update({"openalex_id": f"A{1000 + i}", "identity": "match", "sources": "cockpit", "ror": "05ect4e57",
                       "topic_labels": p.text.split(" \n")[0].split()[:3]})
    bundle = advisors.export_bundle(people, set(), TEXTS, k=6, min_chars=10, min_df=2, max_df=0.9)
    bundle["counts"]["synthetic"] = True
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(bundle, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(OUT, bundle["counts"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
