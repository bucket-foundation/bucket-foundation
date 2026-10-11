# Completeness

**Independent critic verdict, 2026-10-11: 3.1 of 10, fail against the founder's standard.** That score weighs depth and survives a row-by-row reading. Nothing on this page replaces it.

This page recounts the critic's 441 cells in `completeness/frame.jsonl` from the committed tables: 154,399 rows, 106,141 with `verified` true. Rows that carry `page_fetched`, the courses and programs, count as unverified here.

Held means one or more verified rows land in the cell. It says nothing of depth or of whether the rows describe the learner's own learning: the first review read 54 verified infancy rows and kept none. Thin means one to nine verified rows. Keyword rules overstate.

Two counts sit side by side. Critic rule applies the detection rule the frame records for the cell. Facet field counts rows whose `life_stage`, `purpose`, `kind`, `mode`, `region`, `language` or era fields name the cell. Technologies, occupation history and activities sit outside both counts.

## Dimensions

| Dimension | Cells | Held, first review | Critic rule: held | of which thin | ten or more | empty | Facet field: held | of which thin | Cells the rule can score | Within tolerance of the first review |
|---|---|---|---|---|---|---|---|---|---|---|
| life_stage | 8 | 8 | 8 | 0 | 8 | 0 | 8 | 1 | 8 | 1 |
| purpose | 9 | 9 | 7 | 0 | 7 | 2 | 8 | 0 | 2 | 0 |
| life_stage_x_purpose | 72 | 55 | 33 | 15 | 18 | 39 | no field |  | 16 | 7 |
| kind_of_knowing | 7 | 7 | 2 | 0 | 2 | 5 | 7 | 0 | 1 | 0 |
| mode_of_transmission | 9 | 9 | 3 | 0 | 3 | 6 | 9 | 1 | 2 | 0 |
| geography | 30 | 10 | 17 | 10 | 7 | 13 | 12 | 8 | 30 | 25 |
| language | 30 | 23 | 25 | 11 | 14 | 5 | 3 | 2 | 30 | 16 |
| era | 7 | 7 | 7 | 0 | 7 | 0 | 6 | 3 | 7 | 0 |
| domain | 193 | 189 | 193 | 5 | 188 | 0 | no field |  | 193 | 22 |
| named_absence_probe | 33 | 32 | 33 | 0 | 33 | 0 | no field |  | 33 | 4 |
| occupation_isco08 | 43 | 29 | 29 | 27 | 2 | 14 | no field |  | 43 | 43 |

OCM and Propaedia cells show their code alone. Their category names belong to HRAF and Britannica and stay out of this repo.


## Differences from the First Review

Run on first corpus commit, 88,267 rows, the tables the first review read, the scorer lands within tolerance on 351 of the 365 cells it can score. The cells it misses there are the tertiary by work cross and a dozen keyword cells where the first review matched text this scorer cannot see.

- The first review read 88,267 rows. The tables now hold 154,399, after the merge of the k12-full, history-forecast and round3-empty slices and 215 unfetched program rows. Counts rise wherever those slices add rows.
- The `verified` flag was cleared on rows whose notes say inferred, recalled, from memory or not fetched, and courses and programs carry `page_fetched`, which this page counts as unverified. Verified counts fall in the cells those rows sat in, and the catalogue column reads zero.
- Titles of Common Core, NGSS and CEFR rows were replaced by short labels, and catalogue sentences were removed, so some title keywords no longer match.
- The frame records no keyword pattern for seven purpose cells, six kinds and seven modes. Their rule reads `title keywords` with no list. Cells marked `cip-part-only` are scored on the CIP half of the rule, and cells marked `no-pattern-in-frame` are left unscored by the critic rule.
- Geography matches the original region text of a framework, kept in `region_raw`.
- A tolerance of 5 rows or 10% of the first count, whichever is larger, decides the last column.


## Life Stage

| Cell | First review | Critic rule now | Curated | Catalogue | Resource | Rule status | Facet field rows | Facet field verified | Stated |
|---|---|---|---|---|---|---|---|---|---|
| infancy | 54 | 61 | 22 | 0 | 39 | full | 191 | 156 | 191 |
| early-childhood | 97 | 5,878 | 5,878 | 0 | 0 | full | 5,741 | 5,683 | 98 |
| primary | 516 | 11,684 | 11,558 | 0 | 126 | full | 11,639 | 11,430 | 42 |
| secondary | 1,087 | 45,209 | 44,529 | 0 | 680 | full | 44,718 | 44,271 | 32 |
| tertiary | 34,993 | 11,023 | 2,779 | 0 | 8,244 | full | 29,539 | 1,751 | 21 |
| working-adult | 2,802 | 1,482 | 1,264 | 0 | 218 | full | 2,301 | 983 | 54 |
| mid-career-change | 14 | 53 | 25 | 0 | 28 | full | 14 | 5 | 14 |
| old-age | 138 | 136 | 112 | 0 | 24 | full | 24 | 17 | 24 |

## Purpose

| Cell | First review | Critic rule now | Curated | Catalogue | Resource | Rule status | Facet field rows | Facet field verified | Stated |
|---|---|---|---|---|---|---|---|---|---|
| work | 3,138 | 1,538 | 1,320 | 0 | 218 | full | 26,970 | 25,360 | 144 |
| school | 27,043 | 1,182 | 1,182 | 0 | 0 | full | 67,070 | 38,784 | 123 |
| civic | 115 | 20 | 16 | 0 | 4 | cip-part-only | 81 | 41 | 58 |
| personal-household | 398 | 82 | 9 | 0 | 73 | cip-part-only | 390 | 274 | 376 |
| survival-safety | 130 |  |  |  |  | no-pattern-in-frame | 70 | 64 | 70 |
| play-sport | 1,202 | 233 | 196 | 0 | 37 | cip-part-only | 425 | 119 | 15 |
| spiritual | 3,044 | 2,325 | 102 | 0 | 2,223 | cip-part-only | 95 | 40 | 15 |
| care-of-others | 60 |  |  |  |  | no-pattern-in-frame | 113 | 63 | 113 |
| health-of-self | 769 | 2,202 | 2,193 | 0 | 9 | cip-part-only | 0 | 0 | 0 |

## Life Stage by Purpose

| Cell | First review | Critic rule now | Curated | Catalogue | Resource | Rule status |
|---|---|---|---|---|---|---|
| infancy|work | 6 | 4 | 4 | 0 | 0 | full |
| infancy|school | 21 | 1 | 1 | 0 | 0 | full |
| infancy|civic | 0 | 0 | 0 | 0 | 0 | cip-part-only |
| infancy|personal-household | 3 | 0 | 0 | 0 | 0 | cip-part-only |
| infancy|survival-safety | 0 |  |  |  |  | no-pattern-in-frame |
| infancy|play-sport | 0 | 0 | 0 | 0 | 0 | cip-part-only |
| infancy|spiritual | 0 | 0 | 0 | 0 | 0 | cip-part-only |
| infancy|care-of-others | 4 |  |  |  |  | no-pattern-in-frame |
| infancy|health-of-self | 3 | 0 | 0 | 0 | 0 | cip-part-only |
| early-childhood|work | 1 | 1 | 1 | 0 | 0 | full |
| early-childhood|school | 83 | 55 | 55 | 0 | 0 | full |
| early-childhood|civic | 1 | 0 | 0 | 0 | 0 | cip-part-only |
| early-childhood|personal-household | 0 | 0 | 0 | 0 | 0 | cip-part-only |
| early-childhood|survival-safety | 4 |  |  |  |  | no-pattern-in-frame |
| early-childhood|play-sport | 7 | 7 | 7 | 0 | 0 | cip-part-only |
| early-childhood|spiritual | 0 | 0 | 0 | 0 | 0 | cip-part-only |
| early-childhood|care-of-others | 0 |  |  |  |  | no-pattern-in-frame |
| early-childhood|health-of-self | 1 | 227 | 227 | 0 | 0 | cip-part-only |
| primary|work | 2 | 2 | 2 | 0 | 0 | full |
| primary|school | 356 | 240 | 240 | 0 | 0 | full |
| primary|civic | 1 | 0 | 0 | 0 | 0 | cip-part-only |
| primary|personal-household | 12 | 5 | 5 | 0 | 0 | cip-part-only |
| primary|survival-safety | 11 |  |  |  |  | no-pattern-in-frame |
| primary|play-sport | 54 | 45 | 45 | 0 | 0 | cip-part-only |
| primary|spiritual | 10 | 4 | 4 | 0 | 0 | cip-part-only |
| primary|care-of-others | 0 |  |  |  |  | no-pattern-in-frame |
| primary|health-of-self | 1 | 764 | 764 | 0 | 0 | cip-part-only |
| secondary|work | 43 | 25 | 25 | 0 | 0 | full |
| secondary|school | 548 | 296 | 296 | 0 | 0 | full |
| secondary|civic | 18 | 10 | 10 | 0 | 0 | cip-part-only |
| secondary|personal-household | 39 | 2 | 2 | 0 | 0 | cip-part-only |
| secondary|survival-safety | 21 |  |  |  |  | no-pattern-in-frame |
| secondary|play-sport | 120 | 82 | 82 | 0 | 0 | cip-part-only |
| secondary|spiritual | 27 | 20 | 20 | 0 | 0 | cip-part-only |
| secondary|care-of-others | 3 |  |  |  |  | no-pattern-in-frame |
| secondary|health-of-self | 20 | 1,201 | 1,201 | 0 | 0 | cip-part-only |
| tertiary|work | 290 | 28 | 28 | 0 | 0 | full |
| tertiary|school | 26,056 | 591 | 591 | 0 | 0 | full |
| tertiary|civic | 61 | 0 | 0 | 0 | 0 | cip-part-only |
| tertiary|personal-household | 273 | 2 | 2 | 0 | 0 | cip-part-only |
| tertiary|survival-safety | 61 |  |  |  |  | no-pattern-in-frame |
| tertiary|play-sport | 802 | 39 | 39 | 0 | 0 | cip-part-only |
| tertiary|spiritual | 1,013 | 323 | 72 | 0 | 251 | cip-part-only |
| tertiary|care-of-others | 27 |  |  |  |  | no-pattern-in-frame |
| tertiary|health-of-self | 643 | 0 | 0 | 0 | 0 | cip-part-only |
| working-adult|work | 2,802 | 1,482 | 1,264 | 0 | 218 | full |
| working-adult|school | 0 | 0 | 0 | 0 | 0 | full |
| working-adult|civic | 17 | 2 | 2 | 0 | 0 | cip-part-only |
| working-adult|personal-household | 21 | 43 | 0 | 0 | 43 | cip-part-only |
| working-adult|survival-safety | 26 |  |  |  |  | no-pattern-in-frame |
| working-adult|play-sport | 37 | 23 | 23 | 0 | 0 | cip-part-only |
| working-adult|spiritual | 14 | 6 | 6 | 0 | 0 | cip-part-only |
| working-adult|care-of-others | 25 |  |  |  |  | no-pattern-in-frame |
| working-adult|health-of-self | 37 | 1 | 1 | 0 | 0 | cip-part-only |
| mid-career-change|work | 8 | 6 | 6 | 0 | 0 | full |
| mid-career-change|school | 1 | 0 | 0 | 0 | 0 | full |
| mid-career-change|civic | 0 | 0 | 0 | 0 | 0 | cip-part-only |
| mid-career-change|personal-household | 0 | 0 | 0 | 0 | 0 | cip-part-only |
| mid-career-change|survival-safety | 0 |  |  |  |  | no-pattern-in-frame |
| mid-career-change|play-sport | 1 | 0 | 0 | 0 | 0 | cip-part-only |
| mid-career-change|spiritual | 0 | 0 | 0 | 0 | 0 | cip-part-only |
| mid-career-change|care-of-others | 0 |  |  |  |  | no-pattern-in-frame |
| mid-career-change|health-of-self | 0 | 0 | 0 | 0 | 0 | cip-part-only |
| old-age|work | 4 | 8 | 8 | 0 | 0 | full |
| old-age|school | 126 | 0 | 0 | 0 | 0 | full |
| old-age|civic | 0 | 0 | 0 | 0 | 0 | cip-part-only |
| old-age|personal-household | 1 | 2 | 0 | 0 | 2 | cip-part-only |
| old-age|survival-safety | 0 |  |  |  |  | no-pattern-in-frame |
| old-age|play-sport | 5 | 0 | 0 | 0 | 0 | cip-part-only |
| old-age|spiritual | 2 | 0 | 0 | 0 | 0 | cip-part-only |
| old-age|care-of-others | 3 |  |  |  |  | no-pattern-in-frame |
| old-age|health-of-self | 3 | 0 | 0 | 0 | 0 | cip-part-only |

## Kind Of Knowing

| Cell | First review | Critic rule now | Curated | Catalogue | Resource | Rule status | Facet field rows | Facet field verified | Stated |
|---|---|---|---|---|---|---|---|---|---|
| declarative | 51,899 | 106,141 | 67,566 | 0 | 38,575 | full | 64 | 32 | 64 |
| procedural | 4,527 |  |  |  |  | no-pattern-in-frame | 863 | 288 | 261 |
| motor | 427 |  |  |  |  | no-pattern-in-frame | 291 | 136 | 78 |
| perceptual | 153 |  |  |  |  | no-pattern-in-frame | 55 | 45 | 55 |
| social-emotional | 763 | 373 | 373 | 0 | 0 | cip-part-only | 532 | 499 | 152 |
| tacit-craft | 510 |  |  |  |  | no-pattern-in-frame | 114 | 49 | 62 |
| judgement | 505 |  |  |  |  | no-pattern-in-frame | 74 | 48 | 74 |

## Mode Of Transmission

| Cell | First review | Critic rule now | Curated | Catalogue | Resource | Rule status | Facet field rows | Facet field verified | Stated |
|---|---|---|---|---|---|---|---|---|---|
| school | 29,344 | 1,250 | 1,250 | 0 | 0 | full | 91,017 | 62,708 | 209 |
| apprenticeship | 603 |  |  |  |  | no-pattern-in-frame | 115 | 57 | 49 |
| family | 122 |  |  |  |  | no-pattern-in-frame | 232 | 185 | 232 |
| oral-tradition | 80 |  |  |  |  | no-pattern-in-frame | 14 | 13 | 14 |
| self-teaching | 5,967 |  |  |  |  | no-pattern-in-frame | 43 | 24 | 43 |
| play | 484 |  |  |  |  | no-pattern-in-frame | 79 | 41 | 15 |
| religious-formation | 65 |  |  |  |  | no-pattern-in-frame | 83 | 31 | 3 |
| military | 153 | 73 | 73 | 0 | 0 | cip-part-only | 89 | 64 | 0 |
| online | 10,039 | 28,638 | 0 | 0 | 28,638 | full | 11 | 9 | 1 |

## Geography

| Cell | First review | Critic rule now | Curated | Catalogue | Resource | Rule status | Facet field rows | Facet field verified | Stated |
|---|---|---|---|---|---|---|---|---|---|
| IN | 16 | 16 | 16 | 0 | 0 | full | 166 | 150 | 8 |
| CN | 26 | 15 | 15 | 0 | 0 | full | 5 | 5 | 5 |
| US | 30,199 | 3,609 | 3,609 | 0 | 0 | full | 90,301 | 61,169 | 754 |
| ID | 0 | 0 | 0 | 0 | 0 | full | 0 | 0 | 0 |
| PK | 5 | 1 | 1 | 0 | 0 | full | 8 | 1 | 1 |
| NG | 0 | 2 | 2 | 0 | 0 | full | 0 | 0 | 0 |
| BR | 0 | 3 | 3 | 0 | 0 | full | 1 | 1 | 1 |
| BD | 0 | 0 | 0 | 0 | 0 | full | 0 | 0 | 0 |
| RU | 0 | 1 | 1 | 0 | 0 | full | 0 | 0 | 0 |
| ET | 0 | 0 | 0 | 0 | 0 | full | 0 | 0 | 0 |
| MX | 0 | 6 | 6 | 0 | 0 | full | 0 | 0 | 0 |
| JP | 18 | 10 | 10 | 0 | 0 | full | 51 | 1 | 3 |
| EG | 0 | 0 | 0 | 0 | 0 | full | 0 | 0 | 0 |
| PH | 0 | 0 | 0 | 0 | 0 | full | 0 | 0 | 0 |
| CD | 0 | 0 | 0 | 0 | 0 | full | 0 | 0 | 0 |
| VN | 0 | 0 | 0 | 0 | 0 | full | 0 | 0 | 0 |
| IR | 0 | 0 | 0 | 0 | 0 | full | 0 | 0 | 0 |
| TR | 0 | 0 | 0 | 0 | 0 | full | 0 | 0 | 0 |
| DE | 16 | 11 | 11 | 0 | 0 | full | 13 | 7 | 6 |
| TH | 0 | 0 | 0 | 0 | 0 | full | 0 | 0 | 0 |
| TZ | 0 | 0 | 0 | 0 | 0 | full | 0 | 0 | 0 |
| GB | 366 | 214 | 214 | 0 | 0 | full | 458 | 220 | 89 |
| FR | 7 | 6 | 6 | 0 | 0 | full | 7 | 5 | 7 |
| ZA | 0 | 0 | 0 | 0 | 0 | full | 0 | 0 | 0 |
| IT | 13 | 14 | 14 | 0 | 0 | full | 1 | 1 | 1 |
| KE | 0 | 2 | 2 | 0 | 0 | full | 50 | 10 | 5 |
| MM | 8 | 3 | 3 | 0 | 0 | full | 0 | 0 | 0 |
| CO | 0 | 2 | 2 | 0 | 0 | full | 0 | 0 | 0 |
| KR | 0 | 1 | 1 | 0 | 0 | full | 1 | 1 | 1 |
| SD | 0 | 0 | 0 | 0 | 0 | full | 0 | 0 | 0 |

## Language

| Cell | First review | Critic rule now | Curated | Catalogue | Resource | Rule status | Facet field rows | Facet field verified | Stated |
|---|---|---|---|---|---|---|---|---|---|
| en | 18,407 | 33,155 | 0 | 0 | 33,155 | full | 93,448 | 64,068 | 0 |
| zh | 0 | 303 | 0 | 0 | 303 | full | 0 | 0 | 0 |
| hi | 9 | 26 | 0 | 0 | 26 | full | 0 | 0 | 0 |
| es | 56 | 1,435 | 0 | 0 | 1,435 | full | 0 | 0 | 0 |
| fr | 17 | 357 | 0 | 0 | 357 | full | 0 | 0 | 0 |
| ar | 10 | 101 | 0 | 0 | 101 | full | 0 | 0 | 0 |
| bn | 9 | 9 | 0 | 0 | 9 | full | 0 | 0 | 0 |
| pt | 10 | 21 | 0 | 0 | 21 | full | 0 | 0 | 0 |
| ru | 11 | 48 | 0 | 0 | 48 | full | 0 | 0 | 0 |
| ur | 1 | 1 | 0 | 0 | 1 | full | 0 | 0 | 0 |
| id | 9 | 45 | 0 | 0 | 45 | full | 0 | 0 | 0 |
| de | 19 | 88 | 0 | 0 | 88 | full | 13 | 7 | 0 |
| ja | 9 | 120 | 0 | 0 | 120 | full | 51 | 1 | 0 |
| pcm | 0 | 0 | 0 | 0 | 0 | full | 0 | 0 | 0 |
| mr | 1 | 1 | 0 | 0 | 1 | full | 0 | 0 | 0 |
| te | 9 | 9 | 0 | 0 | 9 | full | 0 | 0 | 0 |
| tr | 10 | 21 | 0 | 0 | 21 | full | 0 | 0 | 0 |
| ta | 9 | 9 | 0 | 0 | 9 | full | 0 | 0 | 0 |
| yue | 0 | 0 | 0 | 0 | 0 | full | 0 | 0 | 0 |
| vi | 9 | 9 | 0 | 0 | 9 | full | 0 | 0 | 0 |
| wuu | 0 | 0 | 0 | 0 | 0 | full | 0 | 0 | 0 |
| tl | 9 | 9 | 0 | 0 | 9 | full | 0 | 0 | 0 |
| ko | 9 | 144 | 0 | 0 | 144 | full | 0 | 0 | 0 |
| fa | 1 | 1 | 0 | 0 | 1 | full | 0 | 0 | 0 |
| ha | 0 | 0 | 0 | 0 | 0 | full | 0 | 0 | 0 |
| sw | 0 | 1 | 0 | 0 | 1 | full | 0 | 0 | 0 |
| jv | 0 | 0 | 0 | 0 | 0 | full | 0 | 0 | 0 |
| it | 10 | 87 | 0 | 0 | 87 | full | 0 | 0 | 0 |
| pa | 1 | 1 | 0 | 0 | 1 | full | 0 | 0 | 0 |
| gu | 1 | 1 | 0 | 0 | 1 | full | 0 | 0 | 0 |

## Era

| Cell | First review | Critic rule now | Curated | Catalogue | Resource | Rule status | Facet field rows | Facet field verified | Stated |
|---|---|---|---|---|---|---|---|---|---|
| prehistoric | 11 | 26 | 15 | 0 | 11 | full | 0 | 0 | 0 |
| ancient | 236 | 129 | 53 | 0 | 76 | full | 9 | 3 | 9 |
| medieval | 164 | 117 | 59 | 0 | 58 | full | 13 | 8 | 13 |
| early-modern | 106 | 90 | 49 | 0 | 41 | full | 15 | 10 | 15 |
| industrial | 25 | 44 | 29 | 0 | 15 | full | 121 | 93 | 114 |
| present | 51,899 | 106,141 | 67,566 | 0 | 38,575 | full | 32,525 | 3,407 | 692 |
| emerging | 407 | 2,584 | 93 | 0 | 2,491 | full | 5 | 3 | 1 |

## Domain

| Cell | First review | Critic rule now | Curated | Catalogue | Resource | Rule status |
|---|---|---|---|---|---|---|
| lcc:A | 1,717 | 5,317 | 3,515 | 0 | 1,802 | full |
| lcc:B | 3,607 | 2,515 | 187 | 0 | 2,328 | full |
| lcc:C | 3,121 | 8,095 | 6,485 | 0 | 1,610 | full |
| lcc:D | 1,877 | 411 | 72 | 0 | 339 | full |
| lcc:E | 1,877 | 411 | 72 | 0 | 339 | full |
| lcc:F | 1,877 | 411 | 72 | 0 | 339 | full |
| lcc:G | 3,063 | 9,919 | 8,522 | 0 | 1,397 | full |
| lcc:H | 5,263 | 10,178 | 6,635 | 0 | 3,543 | full |
| lcc:J | 2,637 | 7,819 | 6,467 | 0 | 1,352 | full |
| lcc:K | 569 | 250 | 63 | 0 | 187 | full |
| lcc:L | 1,979 | 2,532 | 2,221 | 0 | 311 | full |
| lcc:M | 3,838 | 5,356 | 4,618 | 0 | 738 | full |
| lcc:N | 4,876 | 5,872 | 4,694 | 0 | 1,178 | full |
| lcc:P | 5,527 | 11,073 | 9,438 | 0 | 1,635 | full |
| lcc:Q | 13,030 | 15,949 | 6,344 | 0 | 9,605 | full |
| lcc:R | 2,850 | 1,347 | 901 | 0 | 446 | full |
| lcc:S | 1,796 | 284 | 107 | 0 | 177 | full |
| lcc:T | 6,044 | 6,283 | 3,197 | 0 | 3,086 | full |
| lcc:U | 135 | 73 | 73 | 0 | 0 | full |
| lcc:V | 135 | 73 | 73 | 0 | 0 | full |
| lcc:Z | 171 | 367 | 350 | 0 | 17 | full |
| cip:01 | 1,440 | 169 | 76 | 0 | 93 | full |
| cip:03 | 356 | 115 | 31 | 0 | 84 | full |
| cip:04 | 1,038 | 516 | 76 | 0 | 440 | full |
| cip:05 | 1,045 | 77 | 12 | 0 | 65 | full |
| cip:09 | 974 | 389 | 45 | 0 | 344 | full |
| cip:10 | 81 | 29 | 27 | 0 | 2 | full |
| cip:11 | 4,268 | 5,951 | 1,612 | 0 | 4,339 | full |
| cip:12 | 69 | 57 | 33 | 0 | 24 | full |
| cip:13 | 1,979 | 2,532 | 2,221 | 0 | 311 | full |
| cip:14 | 4,773 | 2,944 | 82 | 0 | 2,862 | full |
| cip:15 | 209 | 242 | 188 | 0 | 54 | full |
| cip:16 | 2,954 | 3,247 | 2,453 | 0 | 794 | full |
| cip:19 | 464 | 2,852 | 2,727 | 0 | 125 | full |
| cip:22 | 569 | 250 | 63 | 0 | 187 | full |
| cip:23 | 1,599 | 7,437 | 6,940 | 0 | 497 | full |
| cip:24 | 442 | 785 | 22 | 0 | 763 | full |
| cip:25 | 171 | 367 | 350 | 0 | 17 | full |
| cip:26 | 2,129 | 856 | 69 | 0 | 787 | full |
| cip:27 | 3,813 | 7,252 | 4,437 | 0 | 2,815 | full |
| cip:28 | 135 | 47 | 47 | 0 | 0 | full |
| cip:29 | 0 | 26 | 26 | 0 | 0 | full |
| cip:30 | 1,275 | 4,532 | 3,493 | 0 | 1,039 | full |
| cip:31 | 478 | 1,925 | 1,901 | 0 | 24 | full |
| cip:32 | 178 | 255 | 67 | 0 | 188 | full |
| cip:33 | 15 | 20 | 16 | 0 | 4 | full |
| cip:34 | 24 | 2,202 | 2,193 | 0 | 9 | full |
| cip:35 | 10 | 373 | 373 | 0 | 0 | full |
| cip:36 | 296 | 233 | 196 | 0 | 37 | full |
| cip:37 | 73 | 82 | 9 | 0 | 73 | full |
| cip:38 | 2,669 | 2,275 | 55 | 0 | 2,220 | full |
| cip:39 | 35 | 50 | 47 | 0 | 3 | full |
| cip:40 | 2,820 | 1,890 | 226 | 0 | 1,664 | full |
| cip:41 | 0 | 3 | 3 | 0 | 0 | full |
| cip:42 | 903 | 190 | 85 | 0 | 105 | full |
| cip:43 | 84 | 67 | 38 | 0 | 29 | full |
| cip:44 | 348 | 58 | 42 | 0 | 16 | full |
| cip:45 | 2,289 | 7,761 | 6,425 | 0 | 1,336 | full |
| cip:46 | 200 | 59 | 53 | 0 | 6 | full |
| cip:47 | 189 | 81 | 69 | 0 | 12 | full |
| cip:48 | 59 | 19 | 18 | 0 | 1 | full |
| cip:49 | 81 | 42 | 42 | 0 | 0 | full |
| cip:50 | 3,838 | 5,356 | 4,618 | 0 | 738 | full |
| cip:51 | 2,850 | 1,184 | 738 | 0 | 446 | full |
| cip:52 | 2,626 | 2,359 | 168 | 0 | 2,191 | full |
| cip:53 | 3 | 6 | 6 | 0 | 0 | full |
| cip:54 | 832 | 334 | 60 | 0 | 274 | full |
| cip:60 | 0 | 27 | 27 | 0 | 0 | full |
| cip:61 | 0 | 136 | 136 | 0 | 0 | full |
| propaedia:1.1 | 1,988 | 1,656 | 227 | 0 | 1,429 | full |
| propaedia:1.2 | 1,195 | 1,492 | 838 | 0 | 654 | full |
| propaedia:1.3 | 273 | 205 | 97 | 0 | 108 | full |
| propaedia:10.1 | 112 | 115 | 23 | 0 | 92 | full |
| propaedia:10.2 | 4,414 | 8,293 | 5,100 | 0 | 3,193 | full |
| propaedia:10.3 | 24 | 10 | 0 | 0 | 10 | full |
| propaedia:10.4 | 849 | 605 | 65 | 0 | 540 | full |
| propaedia:10.5 | 2,495 | 2,402 | 160 | 0 | 2,242 | full |
| propaedia:10.6 | 544 | 536 | 379 | 0 | 157 | full |
| propaedia:2.1 | 303 | 124 | 13 | 0 | 111 | full |
| propaedia:2.2 | 545 | 536 | 85 | 0 | 451 | full |
| propaedia:2.3 | 122 | 133 | 88 | 0 | 45 | full |
| propaedia:2.4 | 21 | 15 | 0 | 0 | 15 | full |
| propaedia:3.1 | 464 | 421 | 176 | 0 | 245 | full |
| propaedia:3.2 | 731 | 358 | 47 | 0 | 311 | full |
| propaedia:3.3 | 617 | 262 | 139 | 0 | 123 | full |
| propaedia:3.4 | 23 | 5 | 0 | 0 | 5 | full |
| propaedia:3.5 | 495 | 691 | 233 | 0 | 458 | full |
| propaedia:4.1 | 408 | 974 | 714 | 0 | 260 | full |
| propaedia:4.2 | 3,422 | 5,283 | 4,164 | 0 | 1,119 | full |
| propaedia:4.3 | 2,019 | 5,824 | 3,064 | 0 | 2,760 | full |
| propaedia:5.1 | 2,630 | 2,106 | 1,393 | 0 | 713 | full |
| propaedia:5.2 | 979 | 753 | 399 | 0 | 354 | full |
| propaedia:5.3 | 4,727 | 10,741 | 5,496 | 0 | 5,245 | full |
| propaedia:5.4 | 858 | 1,225 | 858 | 0 | 367 | full |
| propaedia:5.5 | 852 | 983 | 607 | 0 | 376 | full |
| propaedia:5.6 | 2,770 | 27,435 | 26,852 | 0 | 583 | full |
| propaedia:6.1 | 80 | 84 | 45 | 0 | 39 | full |
| propaedia:6.2 | 4,865 | 2,970 | 1,334 | 0 | 1,636 | full |
| propaedia:7.1 | 21 | 75 | 64 | 0 | 11 | full |
| propaedia:7.2 | 1,247 | 3,516 | 637 | 0 | 2,879 | full |
| propaedia:7.3 | 7,128 | 11,360 | 3,915 | 0 | 7,445 | full |
| propaedia:8.1 | 612 | 280 | 141 | 0 | 139 | full |
| propaedia:8.2 | 260 | 172 | 74 | 0 | 98 | full |
| propaedia:9.1 | 90 | 57 | 32 | 0 | 25 | full |
| propaedia:9.2 | 165 | 121 | 57 | 0 | 64 | full |
| propaedia:9.3 | 165 | 36 | 1 | 0 | 35 | full |
| propaedia:9.4 | 18 | 11 | 5 | 0 | 6 | full |
| propaedia:9.5 | 12 | 25 | 13 | 0 | 12 | full |
| propaedia:9.6 | 190 | 248 | 169 | 0 | 79 | full |
| propaedia:9.7 | 87 | 202 | 159 | 0 | 43 | full |
| ocm:100 | 54 | 21 | 3 | 0 | 18 | full |
| ocm:110 | 204 | 495 | 352 | 0 | 143 | full |
| ocm:120 | 200 | 79 | 26 | 0 | 53 | full |
| ocm:130 | 286 | 947 | 722 | 0 | 225 | full |
| ocm:140 | 1,138 | 537 | 254 | 0 | 283 | full |
| ocm:150 | 1,352 | 1,032 | 545 | 0 | 487 | full |
| ocm:160 | 130 | 187 | 113 | 0 | 74 | full |
| ocm:170 | 1,976 | 1,897 | 1,143 | 0 | 754 | full |
| ocm:180 | 480 | 555 | 382 | 0 | 173 | full |
| ocm:190 | 2,558 | 13,111 | 11,635 | 0 | 1,476 | full |
| ocm:200 | 1,739 | 2,294 | 1,463 | 0 | 831 | full |
| ocm:210 | 165 | 591 | 490 | 0 | 101 | full |
| ocm:220 | 52 | 216 | 193 | 0 | 23 | full |
| ocm:230 | 730 | 351 | 324 | 0 | 27 | full |
| ocm:240 | 900 | 800 | 629 | 0 | 171 | full |
| ocm:250 | 240 | 125 | 107 | 0 | 18 | full |
| ocm:260 | 160 | 398 | 324 | 0 | 74 | full |
| ocm:270 | 99 | 234 | 178 | 0 | 56 | full |
| ocm:280 | 134 | 226 | 136 | 0 | 90 | full |
| ocm:290 | 189 | 361 | 346 | 0 | 15 | full |
| ocm:300 | 89 | 212 | 181 | 0 | 31 | full |
| ocm:310 | 121 | 158 | 75 | 0 | 83 | full |
| ocm:320 | 367 | 258 | 17 | 0 | 241 | full |
| ocm:330 | 275 | 1,087 | 980 | 0 | 107 | full |
| ocm:340 | 813 | 1,046 | 538 | 0 | 508 | full |
| ocm:350 | 195 | 485 | 447 | 0 | 38 | full |
| ocm:360 | 83 | 95 | 34 | 0 | 61 | full |
| ocm:370 | 482 | 919 | 570 | 0 | 349 | full |
| ocm:380 | 457 | 378 | 115 | 0 | 263 | full |
| ocm:390 | 221 | 889 | 746 | 0 | 143 | full |
| ocm:400 | 8,073 | 15,074 | 4,658 | 0 | 10,416 | full |
| ocm:410 | 267 | 495 | 235 | 0 | 260 | full |
| ocm:420 | 128 | 194 | 100 | 0 | 94 | full |
| ocm:430 | 101 | 225 | 87 | 0 | 138 | full |
| ocm:440 | 415 | 1,299 | 675 | 0 | 624 | full |
| ocm:450 | 907 | 3,236 | 2,110 | 0 | 1,126 | full |
| ocm:460 | 617 | 479 | 285 | 0 | 194 | full |
| ocm:470 | 2,486 | 4,852 | 1,903 | 0 | 2,949 | full |
| ocm:480 | 471 | 845 | 690 | 0 | 155 | full |
| ocm:490 | 105 | 316 | 234 | 0 | 82 | full |
| ocm:500 | 554 | 389 | 129 | 0 | 260 | full |
| ocm:510 | 280 | 369 | 252 | 0 | 117 | full |
| ocm:520 | 1,016 | 856 | 362 | 0 | 494 | full |
| ocm:530 | 4,042 | 1,908 | 655 | 0 | 1,253 | full |
| ocm:540 | 257 | 259 | 165 | 0 | 94 | full |
| ocm:550 | 7 | 13 | 4 | 0 | 9 | full |
| ocm:560 | 259 | 294 | 120 | 0 | 174 | full |
| ocm:570 | 156 | 1,096 | 959 | 0 | 137 | full |
| ocm:580 | 20 | 10 | 4 | 0 | 6 | full |
| ocm:590 | 417 | 284 | 219 | 0 | 65 | full |
| ocm:600 | 9 | 4 | 2 | 0 | 2 | full |
| ocm:610 | 4 | 13 | 8 | 0 | 5 | full |
| ocm:620 | 407 | 369 | 268 | 0 | 101 | full |
| ocm:630 | 41 | 130 | 93 | 0 | 37 | full |
| ocm:640 | 158 | 609 | 485 | 0 | 124 | full |
| ocm:650 | 326 | 365 | 192 | 0 | 173 | full |
| ocm:660 | 872 | 914 | 557 | 0 | 357 | full |
| ocm:670 | 859 | 968 | 597 | 0 | 371 | full |
| ocm:680 | 283 | 472 | 407 | 0 | 65 | full |
| ocm:690 | 78 | 330 | 282 | 0 | 48 | full |
| ocm:700 | 117 | 91 | 79 | 0 | 12 | full |
| ocm:710 | 9 | 7 | 3 | 0 | 4 | full |
| ocm:720 | 207 | 555 | 239 | 0 | 316 | full |
| ocm:730 | 375 | 116 | 41 | 0 | 75 | full |
| ocm:740 | 1,601 | 1,731 | 1,136 | 0 | 595 | full |
| ocm:750 | 1,612 | 870 | 553 | 0 | 317 | full |
| ocm:760 | 37 | 27 | 6 | 0 | 21 | full |
| ocm:770 | 673 | 348 | 184 | 0 | 164 | full |
| ocm:780 | 43 | 44 | 23 | 0 | 21 | full |
| ocm:790 | 32 | 56 | 48 | 0 | 8 | full |
| ocm:800 | 4,777 | 8,011 | 5,229 | 0 | 2,782 | full |
| ocm:810 | 8,887 | 13,007 | 6,589 | 0 | 6,418 | full |
| ocm:820 | 29 | 21 | 3 | 0 | 18 | full |
| ocm:830 | 177 | 149 | 124 | 0 | 25 | full |
| ocm:840 | 77 | 157 | 144 | 0 | 13 | full |
| ocm:850 | 243 | 440 | 372 | 0 | 68 | full |
| ocm:860 | 12 | 532 | 529 | 0 | 3 | full |
| ocm:870 | 2,887 | 27,703 | 27,037 | 0 | 666 | full |
| ocm:880 | 280 | 204 | 157 | 0 | 47 | full |
| ocm:890 | 616 | 244 | 48 | 0 | 196 | full |
| ocm:900 | 75 | 72 | 10 | 0 | 62 | full |
| ocm:910 | 198 | 349 | 221 | 0 | 128 | full |
| ocm:920 | 121 | 118 | 46 | 0 | 72 | full |

## Named Absence Probe

| Cell | First review | Critic rule now | Curated | Catalogue | Resource | Rule status |
|---|---|---|---|---|---|---|
| developmental-milestones | 2 | 10 | 10 | 0 | 0 | full |
| first-language-acquisition | 32 | 90 | 85 | 0 | 5 | full |
| self-care-adl | 6 | 31 | 19 | 0 | 12 | full |
| braille | 0 | 12 | 12 | 0 | 0 | full |
| sign-languages | 41 | 26 | 16 | 0 | 10 | full |
| orientation-mobility | 3 | 23 | 23 | 0 | 0 | full |
| aac | 11 | 17 | 16 | 0 | 1 | full |
| special-education-learner | 143 | 36 | 20 | 0 | 16 | full |
| rehabilitation-relearning | 151 | 19 | 13 | 0 | 6 | full |
| indigenous-knowledge | 111 | 131 | 106 | 0 | 25 | full |
| subsistence | 22 | 52 | 38 | 0 | 14 | full |
| oral-tradition | 70 | 85 | 26 | 0 | 59 | full |
| family-transmission | 2 | 41 | 39 | 0 | 2 | full |
| care-work | 15 | 58 | 44 | 0 | 14 | full |
| paid-care-work | 20 | 23 | 21 | 0 | 2 | full |
| informal-illicit | 12 | 14 | 8 | 0 | 6 | full |
| military | 136 | 95 | 79 | 0 | 16 | full |
| religion-formation | 55 | 62 | 54 | 0 | 8 | full |
| play | 27 | 133 | 122 | 0 | 11 | full |
| games-sport-ladders | 208 | 146 | 89 | 0 | 57 | full |
| metalearning | 51 | 107 | 56 | 0 | 51 | full |
| historical-occupations | 10 | 18 | 12 | 0 | 6 | full |
| historical-curricula | 7 | 12 | 12 | 0 | 0 | full |
| emerging-occupations | 517 | 1,012 | 173 | 0 | 839 | full |
| adult-basic-literacy | 204 | 271 | 58 | 0 | 213 | full |
| prison-refugee | 18 | 15 | 3 | 0 | 12 | full |
| death-grief | 44 | 31 | 7 | 0 | 24 | full |
| sex-reproduction | 12 | 133 | 129 | 0 | 4 | full |
| household-production | 82 | 151 | 87 | 0 | 64 | full |
| emotional-regulation | 15 | 551 | 532 | 0 | 19 | full |
| digital-everyday | 22 | 242 | 227 | 0 | 15 | full |
| driving-transport | 30 | 41 | 10 | 0 | 31 | full |
| elite-performance | 51 | 20 | 12 | 0 | 8 | full |

## Occupation ISCO-08

| Cell | First review | Critic rule now | Curated | Catalogue | Resource | Rule status |
|---|---|---|---|---|---|---|
| isco08:01 | 0 | 0 | 0 | 0 | 0 | full |
| isco08:02 | 0 | 0 | 0 | 0 | 0 | full |
| isco08:03 | 0 | 0 | 0 | 0 | 0 | full |
| isco08:11 | 3 | 3 | 0 | 0 | 0 | full |
| isco08:12 | 1 | 1 | 0 | 0 | 0 | full |
| isco08:13 | 4 | 4 | 0 | 0 | 0 | full |
| isco08:14 | 1 | 1 | 0 | 0 | 0 | full |
| isco08:21 | 3 | 3 | 0 | 0 | 0 | full |
| isco08:22 | 10 | 10 | 0 | 0 | 0 | full |
| isco08:23 | 0 | 0 | 0 | 0 | 0 | full |
| isco08:24 | 5 | 5 | 0 | 0 | 0 | full |
| isco08:25 | 3 | 2 | 0 | 0 | 0 | full |
| isco08:26 | 6 | 6 | 0 | 0 | 0 | full |
| isco08:31 | 2 | 2 | 0 | 0 | 0 | full |
| isco08:32 | 7 | 6 | 0 | 0 | 0 | full |
| isco08:33 | 10 | 10 | 0 | 0 | 0 | full |
| isco08:34 | 4 | 4 | 0 | 0 | 0 | full |
| isco08:35 | 2 | 2 | 0 | 0 | 0 | full |
| isco08:41 | 0 | 0 | 0 | 0 | 0 | full |
| isco08:42 | 0 | 0 | 0 | 0 | 0 | full |
| isco08:43 | 2 | 2 | 0 | 0 | 0 | full |
| isco08:44 | 0 | 0 | 0 | 0 | 0 | full |
| isco08:51 | 1 | 1 | 0 | 0 | 0 | full |
| isco08:52 | 2 | 2 | 0 | 0 | 0 | full |
| isco08:53 | 3 | 3 | 0 | 0 | 0 | full |
| isco08:54 | 1 | 1 | 0 | 0 | 0 | full |
| isco08:61 | 1 | 1 | 0 | 0 | 0 | full |
| isco08:62 | 4 | 4 | 0 | 0 | 0 | full |
| isco08:63 | 1 | 1 | 0 | 0 | 0 | full |
| isco08:71 | 4 | 4 | 0 | 0 | 0 | full |
| isco08:72 | 4 | 4 | 0 | 0 | 0 | full |
| isco08:73 | 0 | 0 | 0 | 0 | 0 | full |
| isco08:74 | 2 | 1 | 0 | 0 | 0 | full |
| isco08:75 | 2 | 2 | 0 | 0 | 0 | full |
| isco08:81 | 0 | 0 | 0 | 0 | 0 | full |
| isco08:82 | 0 | 0 | 0 | 0 | 0 | full |
| isco08:83 | 3 | 3 | 0 | 0 | 0 | full |
| isco08:91 | 2 | 2 | 0 | 0 | 0 | full |
| isco08:92 | 1 | 1 | 0 | 0 | 0 | full |
| isco08:93 | 0 | 0 | 0 | 0 | 0 | full |
| isco08:94 | 0 | 0 | 0 | 0 | 0 | full |
| isco08:95 | 0 | 0 | 0 | 0 | 0 | full |
| isco08:96 | 0 | 0 | 0 | 0 | 0 | full |
