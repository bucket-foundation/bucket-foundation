# Atom Alignment

**Status: unreviewed proposal. Do not use these tables in the app, a pack, a deck or a paper.** Every file here is a review queue for a person. No row has been verified, and about two links in five are right.

| Sample | Build | Judge | Links | Right | Partly | Wrong |
|---|---|---|---|---|---|---|
| Independent, 5 per deck | First | Critic | 40 | 16, 40% | 13, 32% | 11, 28% |
| Blind to score, 5 per deck | Tightened, this one | Builder | 40 | 16, 40% | 18, 45% | 6, 15% |

The tightened build halved the wrong share and left the right share at 40%. That is under the 70% a usable queue needs. A reviewer should expect to confirm two links in five, rework two and delete one in seven. Levels, queued edges, resource links, occupation groups and gaps all inherit that error, and each row of each table carries `status: unreviewed-proposal`. `tables/QUALITY.json` holds the same note per file, and a test fails if code under `packages/`, `src/` or `scripts/` reads this folder.

`tables/alignments.jsonl` joins Bucket's learning atoms to the progressions corpus: 1,947 proposed links for 368 of the 487 science atoms. Built on 2026-10-12 for bead bkt-khfw.9 from the decks in `learning/app/corpus/` and the tables in `learning/corpus/progressions/tables/`.

## Files

| File | Rows | Content |
|---|---|---|
| `tables/alignments.jsonl` | 2,066 | 1,947 atom to corpus row links and 119 unmatched atoms |
| `tables/atom_levels.jsonl` | 487 | A proposed level per atom with its spread |
| `tables/edge_agreement.jsonl` | 820 | A review queue over the deck `requires` edges |
| `tables/atom_resources.jsonl` | 774 | Open-licensed resource links per atom |
| `tables/atom_careers.jsonl` | 368 | CIP families and SOC minor groups per atom |
| `tables/gaps.jsonl` | 333 | CIP families and levels with corpus rows and no atom |
| `tables/QUALITY.json`, `tables/stats.json` | | The quality note per file, and every count quoted here |
| `review/` | | The judged samples: `critic-40.json`, `blind-40.jsonl`, `sample-60.jsonl`, `holdout-24.jsonl` |

The tables hold ids, codes, levels, scores and links. No topic label, course title, strand heading or resource title is copied, so a restricted K-12 row appears as its id and its link. A reader joins `progression_id` to the corpus tables to see the wording.

## Method

1. Field. Each deck has a list of CIP prefixes and field labels in `build/deck_fields.tsv`. A corpus row is a candidate only when its CIP code or field label sits in the atom's deck list. 18,243 progression and course rows qualify.
2. Level band. The same file gives each deck a band: upper-secondary to graduate for mathematics, physics, chemistry and learning to learn, undergraduate-lower to graduate for the other four. A row outside the band, or with no level, is dropped.
3. Embedding. The atom's title, summary and deck title are embedded as one text with `BAAI/bge-small-en-v1.5`, the model named in `scripts/research-os/embed-texts.py`. Rows are embedded by topic label and subfield, by course title, or by strand heading. A row needs a cosine score of 0.68, and 0.72 at upper-secondary.
4. Relation. Rules assign `match`. A row that no rule places, the `related` class of the first build, is dropped: the critic found 2 of 6 right.
5. Lexical check. Words are cut to five-letter stems, and generic stems such as those of physics, theory and analysis are ignored. A topic row passes when a stem of the atom's title appears in its label. A course or strand passes when every remaining stem of its title appears in the atom's own title, summary, depths, note and lesson. A label left with no stem is dropped.
6. The ten highest-scoring survivors are kept per atom.

Of the candidate rows at 0.68 or above, the school threshold dropped 4,044, the level band 796, the `related` rule 2,115 and the lexical check 6,033.

| `match` | Rule | Rows |
|---|---|---|
| `exact` | The row label and the atom title hold the same words | 18 |
| `broader` | The row is a course or a strand, or its label lists several topics, or its words sit inside the atom title | 1,817 |
| `narrower` | The atom title sits inside a longer row label that names one topic | 10 |
| `prerequisite-of` | The corpus states a prerequisite edge from this row to a higher-scoring row of the same atom | 102 |
| `none` | No row passed | 119 |

`match` is read from the corpus row toward the atom, as `MAPPING-SCHEMA.md` sets it. No model wrote or confirmed a link from recall.

## Changes to the Proposed Schema

`MAPPING-SCHEMA.md` is adopted with these changes.

| Schema | Here | Reason |
|---|---|---|
| `learning/progressions/alignments.jsonl` | `learning/corpus/alignment/tables/alignments.jsonl` | The corpus build owns `learning/corpus/` |
| `topic` and `subfield` copied into the row | Left out | Some sources restrict reuse of their wording, open question 11 |
| One line per outside row, null atom when nothing matches | One line per atom and row pair, and one `align:none~<deck>/<slug>` line per unmatched atom | The corpus holds 93,661 rows and the decks hold 487 atoms |
| `match` of five values | `prerequisite-of` added, `related` never accepted | The task names the first; the critic's sample ruled out the second |
| `verification` alone | `score`, `method`, `status`, `rows_collapsed`, `table`, `course_code`, `cip` and a flat `verified` added | Course rows have no framework, and a reviewer needs the score |
| Level of an atom is the lowest level among `exact` and `narrower` rows | `level` is the score-weighted most common level among `exact`, `broader` and `narrower` rows; the schema's value is kept in `level_schema_rule` | Only 13 atoms have an `exact` or `narrower` row |
| Edge audit on `exact` rows at both ends | Run on `exact`, `broader` and `narrower` rows; `queue_exact_rows_only` holds the schema's version | The strict version finds no path for any of the 820 edges |

The seven atom slugs that repeat across decks stay separate, since each id carries its deck.

## Matched and Unmatched

| Deck | Atoms | Matched | Unmatched | Links |
|---|---|---|---|---|
| 00-learning-to-learn | 10 | 8 | 2 | 31 |
| 01-mathematics | 55 | 51 | 4 | 313 |
| 02-physics | 55 | 48 | 7 | 260 |
| 03-chemistry | 55 | 37 | 18 | 197 |
| 04-information | 60 | 54 | 6 | 379 |
| 05-biophysics | 133 | 90 | 43 | 400 |
| 06-cosmology | 59 | 38 | 21 | 158 |
| 07-mind | 60 | 42 | 18 | 209 |
| All | 487 | 368 | 119 | 1,947 |

1,308 links point at catalogue courses and 639 at progression rows, 24 of those K-12 standards. The 244 word atoms of `lang-core` are left out: they order by tier, and the corpus holds no word-level rows to match them.

## Levels

A proposal per atom, unreviewed.

| Level | Atoms |
|---|---|
| upper-secondary | 10 |
| undergraduate-lower | 36 |
| undergraduate-upper | 146 |
| graduate | 176 |
| none | 119 |

Spread is the distance between the lowest and highest matched level: 0 steps for 103 atoms, 1 for 149, 2 for 103 and 3 for 13. The level is the level of the courses whose titles matched in three US catalogues, so graduate courses pull it upward, and the level band keeps every value inside the deck's stated range.

## Prerequisite Edges

**Do not add, remove or reverse a `requires` edge on the strength of `edge_agreement.jsonl`.** The file orders the 820 edges for a person to look at. Both ends of a row rest on links of which 15% to 28% were wrong in the samples, and the corpus paths join whole courses, which says little about two topics inside them. The field is named `queue` for that reason.

| `queue` | Meaning |
|---|---|
| `review-first` | The corpus states a path only from a row of the dependent atom to a row of the prerequisite atom |
| `review-second` | The corpus states paths in both directions |
| `review-later` | The corpus states a path only in the deck's direction |
| `no-corpus-path` | No stated path joins the rows of the two atoms |

| Deck | review-first | review-second | review-later | no-corpus-path |
|---|---|---|---|---|
| 00-learning-to-learn | 0 | 0 | 0 | 16 |
| 01-mathematics | 4 | 9 | 16 | 69 |
| 02-physics | 6 | 13 | 12 | 69 |
| 03-chemistry | 3 | 7 | 10 | 65 |
| 04-information | 6 | 0 | 18 | 57 |
| 05-biophysics | 4 | 5 | 7 | 204 |
| 06-cosmology | 9 | 2 | 2 | 99 |
| 07-mind | 4 | 2 | 4 | 98 |
| All | 36 | 38 | 69 | 677 |

The corpus has no path for 83% of the edges, so those 677 remain unchecked. Each queued row lists up to three example paths. `level_order` compares the two atoms' proposed levels: the prerequisite sits at or below the dependent on 413 edges, above it on 98, and one level is missing on 309. It is a hint for the reviewer and carries the same error.

## Resources and Careers

`atom_resources.jsonl` proposes up to five links for 247 atoms. A resource qualifies when its CIP family equals the family of one of the atom's matched rows, its level sits in the deck's band, its licence string is Creative Commons, public domain, MIT, GNU or free to read, its title scores 0.68 or above against the atom, and its title passes the lexical check. Proprietary, unstated and mixed licences are excluded. No sample has measured these links.

`atom_careers.jsonl` gives 368 atoms their CIP families, 24 in all, and through `cip_soc_crosswalk.jsonl` 20 SOC minor groups. The crosswalk links a field of study to occupations, so the list is as coarse as a CIP family and repeats for every atom of a deck.

## Gaps

The corpus is three US university catalogues plus K-12 standards and the hand-researched slices. The atoms cover eight science decks. A family ranks high here because the corpus holds many rows for it. Neither ranking measures what learners need or ask for, and neither should choose the next deck alone.

312 CIP families hold corpus rows and no linked atom. `rank_rows` orders them by corpus rows:

| Rank | CIP | Family | Rows | Share of its field |
|---|---|---|---|---|
| 1 | 23.01 | English Language and Literature, General | 7,580 | 98% |
| 2 | 45.01 | Social Sciences, General | 6,086 | 80% |
| 3 | 50.01 | Visual and Performing Arts, General | 4,196 | 57% |
| 4 | 16 | Foreign Languages, Literatures, and Linguistics | 2,420 | 59% |
| 5 | 34.01 | Health-Related Knowledge and Skills | 2,201 | 100% |
| 6 | 19.07 | Human Development, Family Studies, and Related Services | 2,163 | 70% |
| 7 | 31.05 | Sports, Kinesiology, and Physical Education/Fitness | 2,002 | 91% |
| 8 | 13.14 | Teaching English or French as a Second or Foreign Language | 1,954 | 54% |
| 9 | 50.09 | Music | 1,062 | 14% |
| 10 | 19.04 | Family and Consumer Economics and Related Studies | 785 | 25% |

K-12 standards fill this list: thousands of codes per subject. `rank_share_of_field` divides out the size of the field, the two-digit CIP series, and orders families by the share of their field's corpus rows they hold:

| Rank | CIP | Family | Rows | Share of its field | Rank by rows |
|---|---|---|---|---|---|
| 1 | 34.01 | Health-Related Knowledge and Skills | 2,201 | 100% | 5 |
| 2 | 54.01 | History | 564 | 100% | 13 |
| 3 | 25.01 | Library Science and Administration | 398 | 100% | 21 |
| 4 | 35.01 | Interpersonal and Social Skills | 380 | 100% | 23 |
| 5 | 24.01 | Liberal Arts and Sciences, General Studies and Humanities | 161 | 100% | 64 |
| 6 | 33.01 | Citizenship Activities | 16 | 100% | 159 |
| 7 | 37.01 | Personal Awareness and Self-Improvement | 11 | 100% | 171 |
| 8 | 41.03 | Physical Science Technologies/Technicians | 2 | 100% | 292 |
| 9 | 22.01 | Law | 389 | 98% | 22 |
| 10 | 23.01 | English Language and Literature, General | 7,580 | 98% | 1 |

This second list rewards a field the corpus files under one family, however few rows it has. `gaps.jsonl` holds all 312 with both ranks, rows per level and `sequenced_rows`, the rows a stated prerequisite edge touches; by that count nursing 51.38 leads with 334 because three catalogues chain their nursing courses. 21 further rows list levels the corpus covers inside a family that has an atom. 25,368 corpus rows carry no CIP code and sit outside every count.

## Quality

Four samples exist. The two in the table at the top are the ones to read.

| Sample | Drawn from | Right | Partly | Wrong |
|---|---|---|---|---|
| Critic, 40 links | First build, accepted links | 16 | 13 | 11 |
| Builder blind, 40 links | Tightened build, accepted links, score hidden while judging | 16 | 18 | 6 |
| Builder holdout, 24 links | First build, accepted links | 13 | 7 | 4 |
| Builder, 60 candidates | First build, ten per score band, used to set 0.68 and 0.72 | 20 | 23 | 17 |

Right means the row teaches the atom's topic at a plausible level. Partly means the row sits in the atom's subfield and may or may not teach it. Wrong means the topic is absent from the row.

The builder's holdout on the first build read 54% right and 17% wrong. The critic read the same build at 40% and 28%. The builder's figures ran generous by about 14 points, so read the blind sample of this build with that in mind.

In the critic's sample, rows at 0.72 or above had 5 wrong of 16 and progression rows 7 wrong of 17: the score does not separate a good link from a poor one. The tightened build therefore leans on the level band and the lexical check.

Limits:

- Precision is 40% right on 40 links, with a margin near 15 points. The wrong share fell from 28% to 15%.
- 93% of links are `broader`, a course whose title shares words with the atom's lesson. A title cannot show that a topic is taught in the course. The 18 partly rows are mostly this case.
- The lexical check dropped right links along with wrong ones. 119 atoms have no link, 43 of them in biophysics.
- The stem rule passes shared common words: the blind sample's wrong rows include a programming languages course for sets and functions and a field theory course for the Einstein field equations.
- The thresholds 0.68 and 0.72 were set on the first build's 60 rows by one judge.

## Reviewer Work

1. Review links in `alignments.jsonl`: confirm, fix `match` or delete, and set `verification` to `verified` with a name and a date. Until a link is verified at both ends, nothing derived from it is usable.
2. Open the `review-first` and `review-second` rows of `edge_agreement.jsonl`, read the example paths, and judge the edge from the subject itself.
3. Confirm the field lists and level bands in `build/deck_fields.tsv`.
4. Read the licence page behind each resource host before the app shows a link.
5. Have a second person judge a fresh sample, and keep the file a queue until it reads 70% right.

After a review, `build/derive.py` rebuilds the derived tables from the committed alignments with no model.

## Build and Test

```bash
python3 learning/corpus/alignment/build/align.py
python3 learning/corpus/alignment/build/derive.py
python3 -m unittest learning/corpus/alignment/tests/test_alignment.py
```

`align.py` needs `sentence-transformers` and the cached model, runs offline, and takes about a minute on a CPU; it rewrites `alignments.jsonl` and `atom_resources.jsonl`, and stops when the file holds a verified row unless `--discard-review` is passed. `derive.py` and the tests need `zstd` alone. The embedding cache stays in `build/.cache/`, outside git. The 60 and 24 row samples were drawn from the first build at commit `0a8a3aa81`.

## Licence

The alignment, meaning the pairs, scores, relations and derived tables, is released under `CC-BY-4.0`. The code is under the repository's MIT licence. CIP and SOC codes are US federal works. Each linked source keeps its own terms.
