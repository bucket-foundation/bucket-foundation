# Sources And Licences

Every outside source the solver gap engine reads, with the licence read from the source's own files at the commit used. The licence column was checked against each `LICENSE` file on 2026-10-13.

| Source | URL | Commit | Licence | Read by |
|---|---|---|---|---|
| formal-conjectures | https://github.com/google-deepmind/formal-conjectures | `137aec5c`, dated 2026-09-30; history back to 2025-09-01; build pin `7d450ef` | Software Apache-2.0 (`LICENSE`). All other materials CC BY 4.0 (`README.md`, Licensing). The README lists third-party content under other terms: Wikipedia, MathOverflow and OEIS material under CC BY-SA 4.0, bbchallenge.org under CC BY 4.0, arXiv material under each paper's licence | `build_map.py`, `match.py`, `backtest.py`, `predict.py`, `momentum.py`, `rates.py`, `retags.py`, `lean_features.py`, `finite_sweep.py`, `stale_tags.py`, `watch.py` |
| Erdős problems database | https://github.com/teorth/erdosproblems | `b916d95`, dated 2026-09-28 | Apache-2.0 (`LICENSE`). `CITATIONS.cff` asks for attribution to "Erdős problems database contributors"; the database is maintained by Thomas Bloom and Terence Tao | `stale_tags.py` |
| all-MiniLM-L6-v2 | https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2 | local snapshot `1110a243`; the scripts pin no revision | Apache-2.0 (model card) | `match.py`, `backtest.py`, `predict.py` |
| Mathlib and the Lean packages in the formal-conjectures build | https://github.com/leanprover-community/mathlib4 | the versions in `lake-manifest.json` at `7d450ef` | Apache-2.0 (`LICENSE`) | `finite_sweep.py`, `harness/Empirical.lean` |

## Use Made Here

| Committed file | Taken from the source | Basis |
|---|---|---|
| `problem_map.jsonl`, `candidates.json`, `CANDIDATES.md`, `backtest/finite-cases.json` | Theorem names, file paths, tags, docstrings and Lean statements from formal-conjectures | Apache-2.0 permits reproduction and derivative works with the licence and attribution kept. CC BY 4.0 permits copying and adaptation with credit, a licence link and a note of changes |
| `backtest/retags-raw.jsonl`, `backtest/retags.jsonl` | Upstream commit hash, date, author name, subject, body, and the docstring and tag diff of each retag | Same two licences. Author names come from the public commit history of the repository |
| `backtest/stale-tags.json`, `STALE-TAGS.md` | Problem number, status state, last-update date and the names of linked proof repositories from the database | Apache-2.0, with the attribution the database asks for |
| `backtest/attempts.jsonl` | Lean error messages from compiling upstream statements | Apache-2.0 |
| `backtest/backtest.json`, `predict.json`, `momentum.json`, `resolution-rate.json`, `lean-rank.json`, `retags-summary.json`, the plots | Counts and scores computed here | Bucket's own output, under the repository licence |

Attribution: formal-conjectures, Copyright 2025 The Formal Conjectures Authors. Erdős problems database, by the Erdős problems database contributors. Changes made here: docstrings are whitespace-collapsed and cut at 1,200 characters, statements are extracted by regular expression, and each row adds fields computed by the scripts above.

## Limits On Reuse

- Docstrings in the `Wikipedia`, `Mathoverflow` and `OEIS` collections carry CC BY-SA 4.0 from their origin. Those excerpts keep that licence inside the committed files, and the repository's MIT licence does not extend to them.
- Docstrings in the `Arxiv` collection may quote a paper under that paper's own licence. The source URL sits in each upstream file.
- The proof repositories named in `STALE-TAGS.md` and `retags.jsonl` are linked by name. No file from them is read, copied or compiled here, and no licence of theirs was checked.
- No personal data is collected. The names in `retags-raw.jsonl` are the commit authors as upstream publishes them.
- This page records the licences as read. It is no legal review.
