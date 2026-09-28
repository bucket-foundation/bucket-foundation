# Prime directions

Bead `bkt-ilgt`. Turns a corpus into its orthogonal prime directions and draws them as spokes on a circle in the canon globe palette. Outputs a JSON file for a web renderer, a PNG and an MP4 sweep, plus a gap report against the other corpora in the same run.

## Commands

Run from this directory. Needs numpy, scipy, scikit-learn and matplotlib; `pdftotext` for PDF corpora and `ffmpeg` for video.

```bash
python3 -m prime_directions list
python3 -m prime_directions run 80k academy --out out --gaps --mp4
python3 -m prime_directions run --all --out out --private-out ~/.local/share/bucket-prime-directions --gaps --mp4
python3 -m pytest -q tests
```

Corpus paths in `corpora.json` resolve against the main checkout, found through `git --git-common-dir`, so a worktree reads the untracked `_intake/` data. `PRIME_DATA_ROOT` overrides it.

## Pipeline

1. Load: `sqlite` for the 80k FTS5 table, `folder` for markdown, text and PDF trees, `json_items` for Academy atoms.
2. Clean: drop URLs, markup and LaTeX; drop every line that appears in more than 0.2% of documents, floor 5; drop documents under the corpus `min_chars`.
3. Vectorize: binary sparse document-term matrix, English stop words, tokens start with a letter, pruned by document frequency.
4. Factor: randomized truncated SVD, k = 12 by default, signs fixed so the largest loading is positive. The run records the max of |VVᵀ - I|.
5. Scores: each document's component scores, standardized. The PNG maps -2.5 sd to the center and +2.5 sd to the rim.

The SVD is uncentered, so component 1 tracks overall term density and carries a small variance ratio.

## Gaps

For each term in a corpus's model vocabulary, the gap is `log(rate in target) - log(highest rate across the other corpora)`, where a rate is `(df + 0.5) / (n + 1)`. A term scores `log_ratio x weight`, the weight being its norm in the rank-k reconstruction. A component's gap is the loading-energy average of the log-ratios. Positive means the corpus covers the direction and every other corpus is thin on it.

## Private corpora

A corpus with `"private": true` writes only under `--private-out`, which must sit outside the repo and the main checkout. Public gap reports compare public corpora only; a run that includes a private corpus also writes `gaps-all.json` and a full `summary.json` under `--private-out`.

## JSON

`prime.json` carries schema `bucket.prime-directions/1`: shape, density, orthogonality error, params, cleaning stats, timings, and per component the spoke angle, singular value, variance ratio, top and bottom terms. `docs` holds id, title and standardized scores, omitted with `--no-docs`.
