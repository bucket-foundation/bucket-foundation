# Retags

Bead `bkt-ct7v`. September 2026 moved 159 open problems in google-deepmind/formal-conjectures to solved (Resolution Rate in `BACKTEST.md`). Each move is classified here by the commit that made it.

## Method

`retags.py` lists every theorem open at `7d1a8c99` (the last commit before 2026-09-01) and solved at head `137aec5c`, then walks the file history to the first commit where the tag flips. `backtest/retags-raw.jsonl` holds that commit's date, author, subject, body and the docstring and attribute diff. All 159 resolve: 104 commits by 21 authors on 18 days.

`backtest/retags.jsonl` holds the classes, assigned by hand from the diff with the deciding quote in `reason`.

| Class | Rule |
|---|---|
| new_proof | Cited result dated 2025 or later, or a `formal_proof` link added in the same commit |
| counterexample | Same evidence, and the text refutes the statement |
| corrected_tag | The docstring cites a result from before 2025 |
| partial_or_variant | The retag follows from a sibling declaration, or the statement was narrowed |
| unclear | None of the above is visible in the diff |

A cited pre-2025 result outranks an added link, so Erdős 10 and the Green 14 bounds have links and class corrected_tag. The cited year comes from the docstring, a citation key such as `[Ha74b]`, an arXiv identifier, or the commit body when the docstring is silent.

## Counts

| Class | Problems | Share |
|---|---|---|
| new_proof | 75 | 47% |
| corrected_tag | 44 | 28% |
| counterexample | 23 | 14% |
| unclear | 9 | 6% |
| partial_or_variant | 8 | 5% |

[empirical: formal-conjectures 137aec5c, 2026-10-01, python3 retags.py --repo fc-history.git --head 137aec5c, then python3 retags.py --summarize]

An independent audit of 20 sampled rows found 2 in the wrong class, both corrected here, so read each count as carrying about 10% error.

98 problems (62%) carry new evidence: 39 cite a 2025 or later result and 82 add a proof link, with 23 in both groups. The 44 corrected tags are old results recorded late; 20 of them are the Green 14 bounds from a 2014 paper, in one commit (`e5f42818`). The next largest commit, `61fa5df8`, retags 12 Monochromatic Quantum Graph cases.

| Collection | New proof | Counterexample | Corrected tag | Variant | Unclear |
|---|---|---|---|---|---|
| ErdosProblems | 15 | 9 | 14 | 4 | 3 |
| OEIS | 18 | 9 | 4 | 2 | 2 |
| GreensOpenProblems | 4 | 2 | 21 | 2 | 2 |
| Paper | 20 | 0 | 0 | 0 | 0 |
| Six smaller collections | 18 | 3 | 5 | 0 | 2 |

[empirical: formal-conjectures 137aec5c, 2026-10-01, python3 retags.py --summarize]

## Proof Hosts

85 problems gain a `formal_proof` link in the retag commit: 62 new_proof, 20 counterexample, 2 corrected_tag, 1 variant. The count at head is 88, so 3 links arrived later. 78 links use `lean4` and 9 use `formal_conjectures`, a fork of the repository itself.

| Host | Links |
|---|---|
| github.com/KitaKen1 | 41 |
| github.com/epoch-research | 14 |
| github.com/mo271 | 6 |
| github.com/niketp03, github.com/plby | 4 each |
| github.com/tadamcz | 3 |
| github.com/SamuelSchlesinger | 2 |
| 12 other accounts | 1 each |

Erdős 486 lists two links. 9 problems have a proof in the repository with no link, the `sorry` gone in the tagging commit; 8 of them cite a result, and `WrittenOnTheWallII/GraphConjecture141` cites none, so it stays unclear.

## AI Attribution

15 problems mention AI assistance or a named AI system in the docstring, diff, subject or link: 8 new_proof, 6 counterexample, 1 variant. The names are GPT-5.6 and GPT-6 variants, ChatGPT, Codex, Claude and Atlas (`facebookresearch/atlas-lean`). 78 commit bodies name one, mostly in an AI usage disclosure. 82 problems have either.

14 links point into `epoch-research/LeanOpenProblems-results`, a results repository for model runs. 3 sit in run directories with a model name (`gpt6astra`, `fable51`) and are counted. The other 11 use abbreviations (`ant`, `oai`, `sol`) and are not.

[empirical: formal-conjectures 137aec5c, 2026-10-01, python3 retags.py --summarize]

## Limits

- The class reads the diff. Nine problems stay unclear because the diff gives no cited year, no link and no source. 72 problems have no cited year.
- A commit body covers the whole pull request and can name an AI system that worked on a neighbouring declaration.
- No proof was run or checked. Authorship is read from the text.
- The 104 commits and 21 authors differ from the 117 and 24 in `BACKTEST.md`, which counted changed tag lines.

## Reproduce

`python3 retags.py --repo fc-history.git --head 137aec5c` rewrites `backtest/retags-raw.jsonl`. `python3 retags.py --summarize` reads `backtest/retags.jsonl`, the hand classifications, and writes `backtest/retags-summary.json`.
