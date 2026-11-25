# Root Graph Preregistration

Bead bkt-4h54u, program bkt-9f19q. Committed 2026-11-25 before any test statistic is computed. The graph build may run before this commit; no hypothesis test reads it until this file is in git.

## Data

Kaikki raw wiktextract extraction of English Wiktionary, `raw-wiktextract-data.jsonl.gz`, Last-Modified 2026-10-30, CC-BY-SA 4.0. Graph built by `papers/root-graph/scripts/build_graph.py` into `_intake/root-graph/graph.sqlite`.

Edge types: `inh` inherited, `bor` borrowed (bor, lbor, slbor, ubor and the `+` forms), `der` derived, `cog` cognate, `cal` calque. Every edge stores the source page and the template that produced it.

Inheritance forest: each lexeme keeps one inheritance parent, the first `inh` source in its etymology section; each later `inh` source in the same section becomes the parent of the one before. The first parent claim for a node wins; a claim that would close a cycle is dropped, counted and reported.

Root-graph distance between two lexemes: number of `inh` steps from each to their lowest common ancestor, summed. Pairs with no common ancestor enter T1 as the "unrelated" class and are left out of the rank correlation.

## T1: Root Distance Predicts Form and Meaning

Unit: a pair of translations of the same English sense in two different languages, from English Wiktionary translation tables, both lexemes present in the graph.

- H0a: Spearman rho between root distance and phonetic similarity is zero.
- H1a: rho is negative. Closer roots, more similar sound.
- Phonetic similarity: 1 minus normalized Levenshtein distance on IPA with stress, length and delimiters removed; pairs need IPA on both sides.
- H0b: Spearman rho between root distance and semantic similarity is zero.
- H1b: rho is negative.
- Semantic similarity: cosine of LaBSE vectors from the photon index for pairs where both sides have a vector.
- Secondary contrast: phonetic similarity of pairs with a common ancestor against pairs without, Mann-Whitney U, effect as rank-biserial r.

Sampling: at most 200,000 pairs, uniform with seed 4242, at most 20 pairs per English sense. CIs: 2,000 bootstrap resamples clustered by English sense.

## T2: Borrowed Share of Frequent Vocabulary

Frequent vocabulary of a language: its words that translate the 1,000 English senses with the most translation-table entries across all languages. Each word gets one class from its first etymology relation: inherited, borrowed, calque, derived, internal (affix or compound), unknown.

- Estimate per language: borrowed share = borrowed / (borrowed + inherited), Wilson 95% CI. Languages with fewer than 100 classified frequent words are listed and left out of the tests and family summaries.
- H0: the borrowed share of frequent vocabulary equals the borrowed share of the whole lexicon, per language.
- H1: frequent vocabulary has a lower borrowed share. Two-proportion z test, one-sided.
- Family summary: median and IQR of borrowed share per family, family taken from the proto-language at the top of the inheritance chains.

## T3: Borrowing and Cognate-Coverage Residuals

Uses the 23 languages in `papers/cognate-coverage/data/regression.json`, outcome `C`, cognate coverage with English.

- Step 1: regress C on genealogical closeness to English, g = share of the language's frequent words whose inheritance ancestors meet an ancestor of an English translation of the same sense.
- H0: the residuals of step 1 have zero Spearman correlation with the language's borrowed share of frequent vocabulary.
- H1: the correlation is nonzero. Two-sided.
- Secondary: residuals against the share of frequent words borrowed from Latin, French, English or Ancient Greek, the main donors of English vocabulary.
- CI: 2,000 bootstrap resamples over languages. With n = 23 power is low; a null with a CI reaching past |rho| 0.4 is reported as inconclusive.

## Multiple Comparisons

Primary family: T1a, T1b, T2 pooled over languages by Fisher's method, T3. Holm at alpha 0.05 across the four. Per-language T2 tests: Benjamini-Hochberg at q 0.05. Secondary tests are reported uncorrected and labelled exploratory.

## Deviations

Any change after this commit is logged in the paper with its date and reason.
