# Preregistration

Bead bkt-ziwld. Written and committed before any similarity value was computed.

## Data

- Photons: `_intake/photons/index.sqlite`, 209,000 photons in 27 languages, with `semantic-vectors.f32.bin` (LaBSE, 768-d) and `phonetic-vectors.f32.bin` (64-d), both read through `numpy.memmap`.
- Translation pairs: `_intake/photons/roots.sqlite` table `translation`, English headword to target word. A pair enters when both sides are single tokens and both are photons.
- Language pairs: English with each of the 26 other languages, plus six non-English pairs joined through a shared English headword and sense: es-pt, es-it, fr-it, de-nl, de-sv, ru-pl.
- Sampling: at most 2,000 pairs per language pair, uniform without replacement, seed 20261125.

## Axes

- Meaning M: cosine of the LaBSE vectors.
- Phonetic P: cosine of the 64-d phonetic vectors, defined when both photons carry IPA and a nonzero vector.
- Script S: one minus Levenshtein distance over the longer length, on the transliterated form t. t is the NFKD fold with marks removed for Latin script, and the Wiktionary romanization otherwise. S is missing when t is missing.
- Subword W, three levels on t:
  - letter: Dice overlap of the letter multisets;
  - affix: the longer of the shared prefix and shared suffix, over the longer length;
  - n-gram: Jaccard overlap of character trigrams with boundary marks.
  W is the mean of the three.

## Cognate label

Two words are cognates when their etymological ancestor sets intersect, or one word lies in the other's set. The set is the closure, depth 8, over `etym` relations inh, der, form, from, root, uder, bor, lbor, plus `word_root` proto and root rows. The label is defined only when both words have at least one `etym` row.

## H1: the four axes measure distinct things

For each of the six pairs among M, P, S, W: Spearman rho over pairs with both values.

- H0: |rho| >= 0.8. H1: |rho| < 0.8.
- Test: cluster bootstrap over language pairs, 2,000 resamples. One-sided p is the share of resamples with |rho| >= 0.8.
- Holm correction over the six tests at alpha 0.05. Report rho with a 95% percentile CI.

## H2: subword similarity predicts known cognates beyond script

Pairs with a defined label and S defined.

- Model A: logistic regression, cognate on S. Model B: cognate on S plus the three subword levels.
- Prediction: leave one language pair out. Pooled ROC AUC from the held-out scores.
- H0: AUC(B) - AUC(A) <= 0. H1: the difference is positive.
- Test: cluster bootstrap over language pairs, 2,000 resamples, one-sided p is the share with difference <= 0. 95% CI reported.
- Per language pair with at least 30 cognates and 30 non-cognates: within-pair bootstrap over pairs, 2,000 resamples, one-sided p, Benjamini-Hochberg at q 0.05.

## Exploratory

Marked as such in the paper: model C adds M and P to B; principal components of the four-axis correlation matrix; per-axis correlation by language pair.

## Stopping and exclusions

One run. Pairs with an empty transliterated form are dropped from S and W. No outlier removal. A change to this file after the first run gets a dated entry below with its reason.
