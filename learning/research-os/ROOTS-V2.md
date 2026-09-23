# Roots v2

The shared root resolver in `scripts/research-os/node_words.py` serves `graph.node_words` and `graph.nsm_exponents`. Roots v2 gives every root its own `root_confidence`, catches homographs, and checks Hebrew roots against the Open Scriptures Hebrew Bible (OSHB). Row `confidence` and the 0.5 and 0.75 thresholds are unchanged; a root below `HIDE_BELOW` is withheld while its word stays.

## Rules

- **Chain cut.** The descent is walked in order, and once a step's gloss has matched the word's sense, the English term or the word's own entry, the first later glossed step that matches none of them ends the chain. Old English *ne* now stops at Proto-Germanic *\*ne* "not" and no longer reaches *\*neh₂w-* "the deceased, corpse".
- **Part of speech.** A root whose gloss comes from a dictionary entry on the other side of the function and content split from the word (a pronoun rooted in a noun) is capped at 0.4. French *le mien* no longer shows Latin *meum* "an umbelliferous plant".
- **Gloss overlap.** For a function word in node_words, a root whose gloss and whose descent share no stem with the word's sense is capped at 0.4. The first run applied this to content words too and hid 28 of the 120 sample roots, 19 of them labeled correct and none labeled wrong (German *Kerze* from Latin *cēra* "wax" among them), so it is limited to function words. NSM exponents are exempt, below.
- **OSHB.** A Hebrew word whose consonant skeleton, or the skeleton without inner vav and yod, matches exactly one headword in the OSHB LexicalIndex takes that entry's root through its `etym` link. When OSHB agrees with Wiktionary, `root_source` is `both`. When it differs, OSHB replaces the root at `min(root_confidence, 0.7)`, shown as uncertain, with the Wiktionary root kept in the descent. When only OSHB has one, it is used at 0.7. The bronze is `_intake/oshb/` (untracked), and `scripts/research-os/oshb.py` writes `_intake/oshb/oshb.sqlite`.

## NSM Asymmetry

NSM primes are mostly function words (pronouns, determiners, prepositions, conjunctions), and the NSM loader passed each prime's English part of speech to the resolver, so the function-word gloss cap reached most NSM rows. Shown NSM roots fell from 1,758 to 1,641 while node_words held level: 141 rows went from shown to hidden. Two models labeled 40 of them, drawn with seed `roots-v2-nsm-lost`: 22 correct, 2 wrong gloss, 1 cannot tell, and 15 where the models disagreed (kappa 0.29). The cap removed mostly correct roots, so NSM exponents are exempt from it; the part-of-speech check and the chain cut still apply. After the rerun, 1,751 NSM rows show a root: 31 of the 1,758 went hidden, most by the part-of-speech check, and 24 gained an OSHB root. Of the 40 labeled rows, 33 show again (18 correct, 2 wrong gloss) and 7 stay hidden (4 correct, 3 disagreements).

## Sample

`learning/research-os/roots-v2-sample.csv` holds 120 shown roots, 80 from node_words and 40 from nsm_exponents, drawn before the change by `scripts/research-os/roots_sample.py` (seed `roots-v2`, stratified by language family, one row per word and root). `scripts/research-os/roots_label.py` had two models label each row from the row and its Wiktionary entry lines: claude-sonnet-5 and claude-haiku-4-5-20251001. The labels are in `roots-v2-labels-models.csv`, and the rows relabeled after the change are in `roots-v2-labels-after.csv`. No human has checked them. `roots-v2-labels-founder.csv` is the same 120 rows, and the 75 band rows below, with an empty label column for the founder.

Model agreement: Cohen's kappa 0.30, the two agreeing on 87 of 120 rows. Precision counts rows where both models agree and leaves out cannot tell. **The figures are provisional.**

| | Correct | Counted | Precision | 95% |
|---|---|---|---|---|
| Before | 80 | 83 | 0.96 | 0.90 to 0.99 |
| After | 85 | 89 | 0.96 | 0.89 to 0.98 |

After the change, no sample root is hidden, so the sample shows no recall lost and no precision gained. Before the NSM exemption, 1 was hidden, labeled correct. 15 roots changed; relabeled, 12 are correct, 1 wrong homograph and 2 disagreements. The intervals overlap, and the sample claims no improvement. Its 120 rows hold 3 roots labeled wrong, too few to measure a homograph fix. The named errors change directly: *ne* now shows *\*ne* "not", *le mien* is withheld, and Polish *to* in BE (SOMEONE/SOMETHING) stays at 0.6, marked uncertain.

## Bands

The per-band check from `POLINGUAL-ROOTS.md` was rerun on the same seed, 25 rows per band of row `confidence`, with the two models in place of the hand check. **These counts are provisional**: they are model labels, and the two models agree at kappa 0.30 on the root sample. The 75 band rows are in the founder's labeling sheet. Row confidence changed for 3 of 10,239 rows.

| Band | Before, right / wrong / disagree | After, right / wrong / disagree |
|---|---|---|
| below 0.5 | 19 / 2 / 4 | 21 / 3 / 1 |
| 0.5 to 0.75 | 20 / 0 / 5 | 20 / 0 / 5 |
| 0.75 and above | 22 / 1 / 2 | 21 / 2 / 2 |

## Counts

Run of 2026-09-23 on the local stack. node_words: 6,872 rows store a root, 6,139 show one; before, 6,135 showed one. nsm_exponents: 1,751 show a root, before 1,758. OSHB on node_words: 24 agree, 4 differ and were replaced, 90 are OSHB only; on nsm_exponents: 13 agree, 1 replaced, 35 OSHB only. The pages credit OSHB under CC BY 4.0.

OSHB coverage under the final matching, which also drops inner vav and yod: 142 of 356 shown Hebrew rows get exactly one OSHB root, 39.9% (node_words 95 of 275, nsm_exponents 47 of 81), against the 20% go line. Exact skeletons alone give 94 rows, 26.4%. The vav and yod fallback accounts for 48 rows, and it is looser: two words that differ only in those letters share a lookup.

## Rerun

```bash
python3 scripts/research-os/oshb.py
python3 scripts/research-os/node_words.py
python3 scripts/research-os/nsm_exponents.py --apply
python3 scripts/research-os/clics_extract.py --apply
python3 scripts/research-os/roots_eval.py --bands-before <node_words snapshot json>
```

The exponent load rewrites rows, so the CLICS step runs after it.
