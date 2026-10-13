# Atom Alignment

One file joins Bucket's learning atoms to the progressions corpus: `tables/alignments.jsonl`. It proposes 2,971 links between 425 of the 487 science atoms and corpus rows. Every row reads `verified: false`. A person has reviewed none of them. Built on 2026-10-12 for bead bkt-khfw.9 from the decks in `learning/app/corpus/` and the tables in `learning/corpus/progressions/tables/`.

## Files

| File | Rows | Content |
|---|---|---|
| `tables/alignments.jsonl` | 3,033 | 2,971 atom to corpus row links and 62 unmatched atoms |
| `tables/atom_levels.jsonl` | 487 | A level per atom with its spread |
| `tables/edge_agreement.jsonl` | 820 | Each deck `requires` edge against the corpus's stated edges |
| `tables/atom_resources.jsonl` | 1,482 | Open-licensed resource links per atom |
| `tables/atom_careers.jsonl` | 420 | CIP families and SOC minor groups per atom |
| `tables/gaps.jsonl` | 331 | CIP families and levels with corpus rows and no atom |
| `tables/stats.json` | | Every count quoted here |
| `review/sample-60.jsonl`, `review/holdout-24.jsonl` | 84 | The judged rows behind the quality figures |

The tables hold ids, codes, levels, scores and links. No topic label, course title, strand heading or resource title is copied, so a restricted K-12 row appears as its id and its link. A reader joins `progression_id` to the corpus tables to see the wording.

## Method

1. Each deck gets a field: a list of CIP prefixes and field labels in `build/deck_fields.tsv`. A corpus row is a candidate for an atom only when its CIP code or field label sits in the atom's deck field. 18,243 progression and course rows fall inside a deck field.
2. The atom's title, summary and deck title are embedded as one text with `BAAI/bge-small-en-v1.5`, the model named in `scripts/research-os/embed-texts.py`. Corpus rows are embedded by topic label and subfield, by course title, or by strand heading for K-12 standards rows whose topic is a code.
3. The ten rows with the highest cosine score are kept per atom. K-12 rows that share one heading and one level collapse to one row, and `rows_collapsed` counts them.
4. A row is accepted at a score of 0.68 or above when its level is undergraduate or later, and at 0.72 or above when its level is a school level. The sample under Quality set both numbers.
5. Rules assign `match`. Each rule is named in `method`.

| `match` | Rule | Rows |
|---|---|---|
| `exact` | The row label and the atom title hold the same words | 17 |
| `broader` | The row is a course or a K-12 strand, or its label lists several topics, or its words sit inside the atom title | 2,488 |
| `narrower` | The atom title sits inside a longer row label that names one topic | 7 |
| `prerequisite-of` | The corpus states a prerequisite edge from this row to a higher-scoring row of the same atom | 75 |
| `related` | No rule fired; the embedding is the only evidence | 384 |
| `none` | No row cleared the threshold | 62 |

`match` is read from the corpus row toward the atom, as `MAPPING-SCHEMA.md` sets it. No model wrote a candidate from recall.

## Changes to the Proposed Schema

`MAPPING-SCHEMA.md` is adopted with these changes.

| Schema | Here | Reason |
|---|---|---|
| `learning/progressions/alignments.jsonl` | `learning/corpus/alignment/tables/alignments.jsonl` | The corpus build owns `learning/corpus/` |
| `topic` and `subfield` copied into the row | Left out | Some sources restrict reuse of their wording, open question 11 |
| One line per outside row, null atom when nothing matches | One line per atom and row pair, and one `align:none~<deck>/<slug>` line per unmatched atom | The corpus holds 93,661 rows and the decks hold 487 atoms |
| `match` of five values | `prerequisite-of` added | The task names it |
| `verification` alone | `score`, `method`, `rows_collapsed`, `table`, `course_code`, `cip` and a flat `verified` added | Course rows have no framework, and a reviewer needs the score |
| Level of an atom is the lowest level among `exact` and `narrower` rows | `level` is the score-weighted most common level among `exact`, `broader` and `narrower` rows; the schema's value is kept in `level_schema_rule` | Only 12 atoms have an `exact` or `narrower` row |
| Edge audit on `exact` rows at both ends | Run on `exact`, `broader` and `narrower` rows; `verdict_exact_rows_only` holds the schema's version | The strict version is silent on all 820 edges |

The seven atom slugs that repeat across decks stay separate, since each id carries its deck.

## Matched and Unmatched

| Deck | Atoms | Matched | Unmatched | Links |
|---|---|---|---|---|
| 00-learning-to-learn | 10 | 9 | 1 | 65 |
| 01-mathematics | 55 | 52 | 3 | 385 |
| 02-physics | 55 | 52 | 3 | 376 |
| 03-chemistry | 55 | 43 | 12 | 263 |
| 04-information | 60 | 58 | 2 | 449 |
| 05-biophysics | 133 | 117 | 16 | 746 |
| 06-cosmology | 59 | 47 | 12 | 327 |
| 07-mind | 60 | 47 | 13 | 360 |
| All | 487 | 425 | 62 | 2,971 |

1,745 links point at catalogue courses and 1,226 at progression rows, 139 of those K-12 standards. The 244 word atoms of `lang-core` are left out: they order by tier, and the corpus holds no word-level rows to match them.

## Levels

| Level | Atoms |
|---|---|
| early | 2 |
| primary | 5 |
| lower-secondary | 9 |
| upper-secondary | 12 |
| undergraduate-lower | 39 |
| undergraduate-upper | 149 |
| graduate | 204 |
| none | 67 |

Spread is the distance between the lowest and highest matched level: 0 steps for 68 atoms, 1 for 163, 2 for 135, and 3 to 6 for 54. The 67 atoms with no level are the 62 unmatched and 5 whose links are all `related` or `prerequisite-of`. The level is the level of the courses that teach the topic in three US catalogues, so graduate courses pull it upward. An atom whose links are all school rows, `newton-laws` for one, reads lower than the deck around it.

## Prerequisite Edges

An edge agrees when the corpus states a prerequisite path from a row of the prerequisite atom to a row of the dependent atom. It disagrees when the only stated paths run the other way.

| Deck | Agree | Disagree | Mixed | Silent |
|---|---|---|---|---|
| 00-learning-to-learn | 0 | 0 | 0 | 16 |
| 01-mathematics | 23 | 2 | 2 | 71 |
| 02-physics | 6 | 4 | 9 | 81 |
| 03-chemistry | 7 | 3 | 3 | 72 |
| 04-information | 14 | 4 | 0 | 63 |
| 05-biophysics | 9 | 10 | 3 | 198 |
| 06-cosmology | 8 | 8 | 3 | 93 |
| 07-mind | 11 | 7 | 6 | 84 |
| All | 78 | 38 | 26 | 678 |

The corpus is silent on 83% of the edges. Its stated edges join courses, and most atom pairs land inside one course or in courses no catalogue chains. A verdict inherits the errors of the links at both ends: several disagreements traced by hand rest on a wrong link. Each row lists up to three example paths so a reviewer can check them. A weaker signal sits in `level_order`: the prerequisite atom's level is at or below the dependent's on 518 edges, above it on 127, and unknown on 175.

## Resources and Careers

`atom_resources.jsonl` gives up to five links for 357 atoms. A resource qualifies when its CIP family equals the family of one of the atom's matched rows, its licence string is Creative Commons, public domain, MIT, GNU or free to read, and its title scores 0.68 or above against the atom. Proprietary, unstated and mixed licences are excluded, which is stricter than the law on linking requires. 65 links carry a licence string the corpus marks unverified.

`atom_careers.jsonl` gives 420 atoms their CIP families, 36 in all, and through `cip_soc_crosswalk.jsonl` 26 SOC minor groups. The most frequent groups are postsecondary teachers 25-1000, other management 11-9000, physical scientists 19-2000 and life scientists 19-1000. The crosswalk links a field of study to occupations, so the list is as coarse as a CIP family.

## Gaps

304 CIP families hold corpus rows and no aligned atom. Ranked by rows that a stated prerequisite edge touches:

| Rank | CIP | Family | Rows | Sequenced rows |
|---|---|---|---|---|
| 1 | 51.38 | Registered Nursing, Nursing Administration, Nursing Research and Clinical Nursing | 483 | 334 |
| 2 | 50.09 | Music | 1,062 | 245 |
| 3 | 14.08 | Civil Engineering | 347 | 245 |
| 4 | 45.06 | Economics | 358 | 241 |
| 5 | 16.09 | Romance Languages, Literatures, and Linguistics | 518 | 190 |
| 6 | 50.04 | Design and Applied Arts | 482 | 179 |
| 7 | 50.07 | Fine and Studio Arts | 715 | 177 |
| 8 | 14.19 | Mechanical Engineering | 244 | 166 |
| 9 | 52.08 | Finance and Financial Management Services | 291 | 156 |
| 10 | 01.09 | Animal Sciences | 260 | 143 |

`gaps.jsonl` holds all 304 with their rows per level, and 27 `level` rows for families that have an atom and lack one at a level the corpus covers. 25,368 corpus rows carry no CIP code and sit outside the count; 24,127 of them are K-12 career and technical standards.

## Quality

60 candidate links were drawn by a seeded sampler, ten per score band and spread across the eight decks, and judged by the agent that built the file. Right means the row teaches the atom's topic at a plausible level. Partly means the row sits in the atom's subfield and may or may not teach it. Wrong means the topic is absent from the row.

| Score band | Right | Partly | Wrong |
|---|---|---|---|
| 0.50 to 0.65 | 2 | 3 | 5 |
| 0.65 to 0.68 | 1 | 2 | 7 |
| 0.68 to 0.70 | 5 | 4 | 1 |
| 0.70 to 0.72 | 3 | 5 | 2 |
| 0.72 to 0.75 | 4 | 5 | 1 |
| 0.75 and above | 5 | 4 | 1 |

Below 0.68, 12 of 20 were wrong. At or above 0.68, 5 of 40 were wrong, so 0.68 is the threshold. Rows at school levels were worse: below 0.72, 11 of 15 were wrong and 1 was right; at or above 0.72, 1 of 9 was wrong. School rows need 0.72.

Under both thresholds 37 of the 60 pass: 17 right, 17 partly, 3 wrong. Those rates flatter the file, because the thresholds were fitted to the same rows. A second draw of 24 accepted links, three per deck, gave 13 right, 7 partly and 4 wrong: 54% right and 17% wrong. Read that as the estimate.

Limits of the figures:

- One judge, the builder, with no second reader. A band of ten rows has a margin near 30 points.
- Scores bunch between 0.65 and 0.75, so the model separates a good link from a poor one weakly. The band at 0.75 and above is no cleaner than the band at 0.68.
- 84% of links are `broader`, most of them a course that plausibly covers the atom. A course title cannot show that a topic is taught in it.
- The 62 unmatched atoms include topics the corpus does hold under another deck's field, the membrane atoms of 07-mind among them, since biology courses sit outside that deck's field list.

## Reviewer Work

1. Review links in `alignments.jsonl`: set `match`, fix or delete wrong rows, and set `verification` to `verified` with a name and a date. The `related` rows and the school rows come first, as the weakest classes.
2. Check the 38 `disagree` and 26 `mixed` edges against their example paths before changing any `requires`.
3. Confirm the deck field lists in `build/deck_fields.tsv`, and widen 07-mind and 03-chemistry if their unmatched atoms should reach biology and general chemistry rows.
4. Read the licence page behind each resource host before the app shows a link; the licence strings come from the corpus as stated.
5. Judge a fresh sample with a second reader, then move the thresholds if the rates differ.

After a review, `build/derive.py` rebuilds the derived tables from the committed alignments with no model.

## Build and Test

```bash
python3 learning/corpus/alignment/build/align.py
python3 learning/corpus/alignment/build/derive.py
python3 -m unittest learning/corpus/alignment/tests/test_alignment.py
```

`align.py` needs `sentence-transformers` and the cached model, runs offline, and takes about a minute on a CPU; it rewrites `alignments.jsonl` and `atom_resources.jsonl`, and stops when the file holds a verified row unless `--discard-review` is passed. `derive.py` and the tests need `zstd` alone. The embedding cache stays in `build/.cache/`, outside git.

## Licence

The alignment, meaning the pairs, scores, relations and derived tables, is released under `CC-BY-4.0`. The code is under the repository's MIT licence. CIP and SOC codes are US federal works. Each linked source keeps its own terms.
