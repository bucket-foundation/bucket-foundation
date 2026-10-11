# Completeness

The critic's frame of 441 cells in `completeness/frame.jsonl`, scored again from the committed tables: 154,399 rows, 132,892 with `verified` or `page_fetched` true. A cell counts as held when one such row lands in it.

Two counts sit side by side. Critic rule applies the detection rule the frame records for the cell. Facet field counts rows whose `life_stage`, `purpose`, `kind`, `mode`, `region`, `language` or era fields name the cell, which the first review could not do because the fields did not exist.

## Dimensions

| Dimension | Cells | Held, first review | Held, critic rule now | Held, facet field | Cells the rule can score | Within tolerance of the first review |
|---|---|---|---|---|---|---|
| life_stage | 8 | 8 of 8, 100% | 8 of 8, 100% | 8 of 8, 100% | 8 | 2 of 8, 25% |
| purpose | 9 | 9 of 9, 100% | 7 of 9, 78% | 8 of 9, 89% | 2 | 1 of 2, 50% |
| life_stage_x_purpose | 72 | 55 of 72, 76% | 38 of 72, 53% | no field | 16 | 9 of 16, 56% |
| kind_of_knowing | 7 | 7 of 7, 100% | 2 of 7, 29% | 7 of 7, 100% | 1 | 0 of 1, 0% |
| mode_of_transmission | 9 | 9 of 9, 100% | 3 of 9, 33% | 9 of 9, 100% | 2 | 1 of 2, 50% |
| geography | 30 | 10 of 30, 33% | 17 of 30, 57% | 12 of 30, 40% | 30 | 26 of 30, 87% |
| language | 30 | 23 of 30, 77% | 25 of 30, 83% | 3 of 30, 10% | 30 | 16 of 30, 53% |
| era | 7 | 7 of 7, 100% | 7 of 7, 100% | 6 of 7, 86% | 7 | 0 of 7, 0% |
| domain | 193 | 189 of 193, 98% | 193 of 193, 100% | no field | 193 | 23 of 193, 12% |
| named_absence_probe | 33 | 32 of 33, 97% | 33 of 33, 100% | no field | 33 | 5 of 33, 15% |
| occupation_isco08 | 43 | 29 of 43, 67% | 29 of 43, 67% | no field | 43 | 43 of 43, 100% |

## Differences from the First Review

Run on first corpus commit, 88,267 rows, the tables the first review read, the scorer lands within tolerance on 351 of the 365 cells it can score. The cells it misses there are the tertiary by work cross and a dozen keyword cells where the first review matched text this scorer cannot see.

- The first review read 88,267 rows. The tables now hold 154,399, after the merge of the k12-full, history-forecast and round3-empty slices and 215 unfetched program rows. Counts rise wherever those slices add rows.
- The `verified` flag was cleared on rows whose notes say inferred, recalled, from memory or not fetched, and courses and programs carry `page_fetched`. Verified counts fall in the cells those rows sat in.
- Titles of Common Core, NGSS and CEFR rows were replaced by short labels, and catalogue sentences were removed, so some title keywords no longer match.
- The frame records no keyword pattern for seven purpose cells, six kinds and seven modes. Their rule reads `title keywords` with no list. Cells marked `cip-part-only` are scored on the CIP half of the rule, and cells marked `no-pattern-in-frame` are left unscored by the critic rule.
- Geography matches the original region text of a framework, kept in `region_raw`.
- A tolerance of 5 rows or 10% of the first count, whichever is larger, decides the last column.


## Life Stage

| Cell | First review | Critic rule now | Curated | Catalogue | Resource | Rule status | Facet field rows | Facet field verified | Stated |
|---|---|---|---|---|---|---|---|---|---|
| infancy | 54 | 124 | 65 | 20 | 39 | full | 191 | 156 | 191 |
| early-childhood | 97 | 5,878 | 5,878 | 0 | 0 | full | 5,741 | 5,683 | 98 |
| primary | 516 | 11,684 | 11,558 | 0 | 126 | full | 11,639 | 11,430 | 42 |
| secondary | 1,087 | 45,209 | 44,529 | 0 | 680 | full | 44,718 | 44,271 | 32 |
| tertiary | 34,993 | 35,752 | 2,779 | 24,729 | 8,244 | full | 29,539 | 28,502 | 21 |
| working-adult | 2,802 | 2,661 | 1,264 | 1,179 | 218 | full | 2,301 | 983 | 54 |
| mid-career-change | 14 | 54 | 25 | 1 | 28 | full | 14 | 5 | 14 |
| old-age | 138 | 294 | 165 | 105 | 24 | full | 24 | 17 | 24 |

## Purpose

| Cell | First review | Critic rule now | Curated | Catalogue | Resource | Rule status | Facet field rows | Facet field verified | Stated |
|---|---|---|---|---|---|---|---|---|---|
| work | 3,138 | 2,717 | 1,320 | 1,179 | 218 | full | 2,843 | 1,242 | 144 |
| school | 27,043 | 25,911 | 1,182 | 24,729 | 0 | full | 90,934 | 89,390 | 123 |
| civic | 115 | 20 | 16 | 0 | 4 | cip-part-only | 81 | 41 | 58 |
| personal-household | 398 | 82 | 9 | 0 | 73 | cip-part-only | 390 | 274 | 376 |
| survival-safety | 130 |  |  |  |  | no-pattern-in-frame | 70 | 64 | 70 |
| play-sport | 1,202 | 233 | 196 | 0 | 37 | cip-part-only | 425 | 119 | 15 |
| spiritual | 3,044 | 2,837 | 102 | 512 | 2,223 | cip-part-only | 95 | 40 | 15 |
| care-of-others | 60 |  |  |  |  | no-pattern-in-frame | 113 | 63 | 113 |
| health-of-self | 769 | 2,202 | 2,193 | 0 | 9 | cip-part-only | 0 | 0 | 0 |

## Life Stage by Purpose

| Cell | First review | Critic rule now | Curated | Catalogue | Resource | Rule status |
|---|---|---|---|---|---|---|
| infancy|work | 6 | 6 | 4 | 2 | 0 | full |
| infancy|school | 21 | 19 | 1 | 18 | 0 | full |
| infancy|civic | 0 | 0 | 0 | 0 | 0 | cip-part-only |
| infancy|personal-household | 3 | 0 | 0 | 0 | 0 | cip-part-only |
| infancy|survival-safety | 0 |  |  |  |  | no-pattern-in-frame |
| infancy|play-sport | 0 | 0 | 0 | 0 | 0 | cip-part-only |
| infancy|spiritual | 0 | 0 | 0 | 0 | 0 | cip-part-only |
| infancy|care-of-others | 4 |  |  |  |  | no-pattern-in-frame |
| infancy|health-of-self | 3 | 6 | 6 | 0 | 0 | cip-part-only |
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
| tertiary|school | 26,056 | 25,320 | 591 | 24,729 | 0 | full |
| tertiary|civic | 61 | 0 | 0 | 0 | 0 | cip-part-only |
| tertiary|personal-household | 273 | 2 | 2 | 0 | 0 | cip-part-only |
| tertiary|survival-safety | 61 |  |  |  |  | no-pattern-in-frame |
| tertiary|play-sport | 802 | 39 | 39 | 0 | 0 | cip-part-only |
| tertiary|spiritual | 1,013 | 824 | 72 | 501 | 251 | cip-part-only |
| tertiary|care-of-others | 27 |  |  |  |  | no-pattern-in-frame |
| tertiary|health-of-self | 643 | 0 | 0 | 0 | 0 | cip-part-only |
| working-adult|work | 2,802 | 2,661 | 1,264 | 1,179 | 218 | full |
| working-adult|school | 0 | 0 | 0 | 0 | 0 | full |
| working-adult|civic | 17 | 2 | 2 | 0 | 0 | cip-part-only |
| working-adult|personal-household | 21 | 43 | 0 | 0 | 43 | cip-part-only |
| working-adult|survival-safety | 26 |  |  |  |  | no-pattern-in-frame |
| working-adult|play-sport | 37 | 23 | 23 | 0 | 0 | cip-part-only |
| working-adult|spiritual | 14 | 6 | 6 | 0 | 0 | cip-part-only |
| working-adult|care-of-others | 25 |  |  |  |  | no-pattern-in-frame |
| working-adult|health-of-self | 37 | 1 | 1 | 0 | 0 | cip-part-only |
| mid-career-change|work | 8 | 6 | 6 | 0 | 0 | full |
| mid-career-change|school | 1 | 1 | 0 | 1 | 0 | full |
| mid-career-change|civic | 0 | 0 | 0 | 0 | 0 | cip-part-only |
| mid-career-change|personal-household | 0 | 0 | 0 | 0 | 0 | cip-part-only |
| mid-career-change|survival-safety | 0 |  |  |  |  | no-pattern-in-frame |
| mid-career-change|play-sport | 1 | 0 | 0 | 0 | 0 | cip-part-only |
| mid-career-change|spiritual | 0 | 0 | 0 | 0 | 0 | cip-part-only |
| mid-career-change|care-of-others | 0 |  |  |  |  | no-pattern-in-frame |
| mid-career-change|health-of-self | 0 | 0 | 0 | 0 | 0 | cip-part-only |
| old-age|work | 4 | 10 | 8 | 2 | 0 | full |
| old-age|school | 126 | 103 | 0 | 103 | 0 | full |
| old-age|civic | 0 | 0 | 0 | 0 | 0 | cip-part-only |
| old-age|personal-household | 1 | 2 | 0 | 0 | 2 | cip-part-only |
| old-age|survival-safety | 0 |  |  |  |  | no-pattern-in-frame |
| old-age|play-sport | 5 | 0 | 0 | 0 | 0 | cip-part-only |
| old-age|spiritual | 2 | 1 | 0 | 1 | 0 | cip-part-only |
| old-age|care-of-others | 3 |  |  |  |  | no-pattern-in-frame |
| old-age|health-of-self | 3 | 2 | 2 | 0 | 0 | cip-part-only |

## Kind Of Knowing

| Cell | First review | Critic rule now | Curated | Catalogue | Resource | Rule status | Facet field rows | Facet field verified | Stated |
|---|---|---|---|---|---|---|---|---|---|
| declarative | 51,899 | 132,892 | 67,566 | 26,751 | 38,575 | full | 64 | 32 | 64 |
| procedural | 4,527 |  |  |  |  | no-pattern-in-frame | 863 | 288 | 261 |
| motor | 427 |  |  |  |  | no-pattern-in-frame | 291 | 136 | 78 |
| perceptual | 153 |  |  |  |  | no-pattern-in-frame | 55 | 45 | 55 |
| social-emotional | 763 | 373 | 373 | 0 | 0 | cip-part-only | 532 | 499 | 152 |
| tacit-craft | 510 |  |  |  |  | no-pattern-in-frame | 114 | 49 | 62 |
| judgement | 505 |  |  |  |  | no-pattern-in-frame | 74 | 48 | 74 |

## Mode Of Transmission

| Cell | First review | Critic rule now | Curated | Catalogue | Resource | Rule status | Facet field rows | Facet field verified | Stated |
|---|---|---|---|---|---|---|---|---|---|
| school | 29,344 | 28,001 | 1,250 | 26,751 | 0 | full | 91,009 | 89,451 | 209 |
| apprenticeship | 603 |  |  |  |  | no-pattern-in-frame | 123 | 65 | 49 |
| family | 122 |  |  |  |  | no-pattern-in-frame | 232 | 185 | 232 |
| oral-tradition | 80 |  |  |  |  | no-pattern-in-frame | 14 | 13 | 14 |
| self-teaching | 5,967 |  |  |  |  | no-pattern-in-frame | 43 | 24 | 43 |
| play | 484 |  |  |  |  | no-pattern-in-frame | 79 | 41 | 15 |
| religious-formation | 65 |  |  |  |  | no-pattern-in-frame | 83 | 31 | 3 |
| military | 153 | 189 | 73 | 116 | 0 | cip-part-only | 89 | 64 | 0 |
| online | 10,039 | 28,638 | 0 | 0 | 28,638 | full | 11 | 9 | 1 |

## Geography

| Cell | First review | Critic rule now | Curated | Catalogue | Resource | Rule status | Facet field rows | Facet field verified | Stated |
|---|---|---|---|---|---|---|---|---|---|
| IN | 16 | 16 | 16 | 0 | 0 | full | 166 | 150 | 8 |
| CN | 26 | 15 | 15 | 0 | 0 | full | 5 | 5 | 5 |
| US | 30,199 | 30,360 | 3,609 | 26,751 | 0 | full | 90,301 | 87,920 | 754 |
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
| en | 18,407 | 33,155 | 0 | 0 | 33,155 | full | 93,448 | 90,819 | 0 |
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
| prehistoric | 11 | 40 | 23 | 6 | 11 | full | 0 | 0 | 0 |
| ancient | 236 | 345 | 81 | 188 | 76 | full | 9 | 3 | 9 |
| medieval | 164 | 245 | 68 | 119 | 58 | full | 13 | 8 | 13 |
| early-modern | 106 | 187 | 77 | 69 | 41 | full | 15 | 10 | 15 |
| industrial | 25 | 83 | 52 | 16 | 15 | full | 121 | 93 | 114 |
| present | 51,899 | 132,892 | 67,566 | 26,751 | 38,575 | full | 32,525 | 30,158 | 692 |
| emerging | 407 | 2,801 | 122 | 188 | 2,491 | full | 5 | 3 | 1 |

## Domain

| Cell | First review | Critic rule now | Curated | Catalogue | Resource | Rule status |
|---|---|---|---|---|---|---|
| lcc:A | 1,717 | 6,411 | 3,515 | 1,094 | 1,802 | full |
| lcc:B | 3,607 | 3,685 | 187 | 1,170 | 2,328 | full |
| lcc:C | 3,121 | 10,071 | 6,485 | 1,976 | 1,610 | full |
| lcc:D | 1,877 | 1,878 | 72 | 1,467 | 339 | full |
| lcc:E | 1,877 | 1,878 | 72 | 1,467 | 339 | full |
| lcc:F | 1,877 | 1,878 | 72 | 1,467 | 339 | full |
| lcc:G | 3,063 | 11,735 | 8,522 | 1,816 | 1,397 | full |
| lcc:H | 5,263 | 13,637 | 6,635 | 3,459 | 3,543 | full |
| lcc:J | 2,637 | 9,550 | 6,467 | 1,731 | 1,352 | full |
| lcc:K | 569 | 609 | 63 | 359 | 187 | full |
| lcc:L | 1,979 | 3,994 | 2,221 | 1,462 | 311 | full |
| lcc:M | 3,838 | 8,194 | 4,618 | 2,838 | 738 | full |
| lcc:N | 4,876 | 9,342 | 4,694 | 3,470 | 1,178 | full |
| lcc:P | 5,527 | 14,281 | 9,438 | 3,208 | 1,635 | full |
| lcc:Q | 13,030 | 19,601 | 6,344 | 3,652 | 9,605 | full |
| lcc:R | 2,850 | 3,216 | 901 | 1,869 | 446 | full |
| lcc:S | 1,796 | 1,816 | 107 | 1,532 | 177 | full |
| lcc:T | 6,044 | 9,188 | 3,197 | 2,905 | 3,086 | full |
| lcc:U | 135 | 189 | 73 | 116 | 0 | full |
| lcc:V | 135 | 189 | 73 | 116 | 0 | full |
| lcc:Z | 171 | 417 | 350 | 50 | 17 | full |
| cip:01 | 1,440 | 1,441 | 76 | 1,272 | 93 | full |
| cip:03 | 356 | 375 | 31 | 260 | 84 | full |
| cip:04 | 1,038 | 1,148 | 76 | 632 | 440 | full |
| cip:05 | 1,045 | 1,008 | 12 | 931 | 65 | full |
| cip:09 | 974 | 1,111 | 45 | 722 | 344 | full |
| cip:10 | 81 | 29 | 27 | 0 | 2 | full |
| cip:11 | 4,268 | 6,643 | 1,612 | 692 | 4,339 | full |
| cip:12 | 69 | 57 | 33 | 0 | 24 | full |
| cip:13 | 1,979 | 3,994 | 2,221 | 1,462 | 311 | full |
| cip:14 | 4,773 | 5,428 | 82 | 2,484 | 2,862 | full |
| cip:15 | 209 | 284 | 188 | 42 | 54 | full |
| cip:16 | 2,954 | 4,945 | 2,453 | 1,698 | 794 | full |
| cip:19 | 464 | 3,231 | 2,727 | 379 | 125 | full |
| cip:22 | 569 | 609 | 63 | 359 | 187 | full |
| cip:23 | 1,599 | 8,225 | 6,940 | 788 | 497 | full |
| cip:24 | 442 | 938 | 22 | 153 | 763 | full |
| cip:25 | 171 | 417 | 350 | 50 | 17 | full |
| cip:26 | 2,129 | 2,296 | 69 | 1,440 | 787 | full |
| cip:27 | 3,813 | 7,831 | 4,437 | 579 | 2,815 | full |
| cip:28 | 135 | 163 | 47 | 116 | 0 | full |
| cip:29 | 0 | 26 | 26 | 0 | 0 | full |
| cip:30 | 1,275 | 5,473 | 3,493 | 941 | 1,039 | full |
| cip:31 | 478 | 2,301 | 1,901 | 376 | 24 | full |
| cip:32 | 178 | 255 | 67 | 0 | 188 | full |
| cip:33 | 15 | 20 | 16 | 0 | 4 | full |
| cip:34 | 24 | 2,202 | 2,193 | 0 | 9 | full |
| cip:35 | 10 | 373 | 373 | 0 | 0 | full |
| cip:36 | 296 | 233 | 196 | 0 | 37 | full |
| cip:37 | 73 | 82 | 9 | 0 | 73 | full |
| cip:38 | 2,669 | 2,787 | 55 | 512 | 2,220 | full |
| cip:39 | 35 | 50 | 47 | 0 | 3 | full |
| cip:40 | 2,820 | 2,831 | 226 | 941 | 1,664 | full |
| cip:41 | 0 | 3 | 3 | 0 | 0 | full |
| cip:42 | 903 | 848 | 85 | 658 | 105 | full |
| cip:43 | 84 | 94 | 38 | 27 | 29 | full |
| cip:44 | 348 | 349 | 42 | 291 | 16 | full |
| cip:45 | 2,289 | 9,201 | 6,425 | 1,440 | 1,336 | full |
| cip:46 | 200 | 59 | 53 | 0 | 6 | full |
| cip:47 | 189 | 81 | 69 | 0 | 12 | full |
| cip:48 | 59 | 19 | 18 | 0 | 1 | full |
| cip:49 | 81 | 42 | 42 | 0 | 0 | full |
| cip:50 | 3,838 | 8,194 | 4,618 | 2,838 | 738 | full |
| cip:51 | 2,850 | 3,053 | 738 | 1,869 | 446 | full |
| cip:52 | 2,626 | 4,087 | 168 | 1,728 | 2,191 | full |
| cip:53 | 3 | 6 | 6 | 0 | 0 | full |
| cip:54 | 832 | 870 | 60 | 536 | 274 | full |
| cip:60 | 0 | 27 | 27 | 0 | 0 | full |
| cip:61 | 0 | 136 | 136 | 0 | 0 | full |
| propaedia:1.1 | 1,988 | 2,446 | 428 | 589 | 1,429 | full |
| propaedia:1.2 | 1,195 | 2,557 | 1,339 | 564 | 654 | full |
| propaedia:1.3 | 273 | 449 | 179 | 162 | 108 | full |
| propaedia:10.1 | 112 | 198 | 80 | 26 | 92 | full |
| propaedia:10.2 | 4,414 | 9,673 | 5,590 | 890 | 3,193 | full |
| propaedia:10.3 | 24 | 35 | 10 | 15 | 10 | full |
| propaedia:10.4 | 849 | 957 | 79 | 338 | 540 | full |
| propaedia:10.5 | 2,495 | 2,918 | 322 | 354 | 2,242 | full |
| propaedia:10.6 | 544 | 1,026 | 476 | 393 | 157 | full |
| propaedia:2.1 | 303 | 344 | 38 | 195 | 111 | full |
| propaedia:2.2 | 545 | 964 | 301 | 212 | 451 | full |
| propaedia:2.3 | 122 | 318 | 175 | 98 | 45 | full |
| propaedia:2.4 | 21 | 58 | 33 | 10 | 15 | full |
| propaedia:3.1 | 464 | 886 | 378 | 263 | 245 | full |
| propaedia:3.2 | 731 | 861 | 112 | 438 | 311 | full |
| propaedia:3.3 | 617 | 861 | 264 | 474 | 123 | full |
| propaedia:3.4 | 23 | 25 | 1 | 19 | 5 | full |
| propaedia:3.5 | 495 | 1,163 | 394 | 311 | 458 | full |
| propaedia:4.1 | 408 | 1,566 | 991 | 315 | 260 | full |
| propaedia:4.2 | 3,422 | 8,702 | 4,964 | 2,619 | 1,119 | full |
| propaedia:4.3 | 2,019 | 7,840 | 3,737 | 1,343 | 2,760 | full |
| propaedia:5.1 | 2,630 | 5,676 | 2,576 | 2,387 | 713 | full |
| propaedia:5.2 | 979 | 1,756 | 700 | 702 | 354 | full |
| propaedia:5.3 | 4,727 | 16,408 | 8,030 | 3,133 | 5,245 | full |
| propaedia:5.4 | 858 | 2,421 | 1,498 | 556 | 367 | full |
| propaedia:5.5 | 852 | 2,075 | 1,148 | 551 | 376 | full |
| propaedia:5.6 | 2,770 | 29,646 | 26,981 | 2,082 | 583 | full |
| propaedia:6.1 | 80 | 171 | 94 | 38 | 39 | full |
| propaedia:6.2 | 4,865 | 8,599 | 3,674 | 3,289 | 1,636 | full |
| propaedia:7.1 | 21 | 98 | 76 | 11 | 11 | full |
| propaedia:7.2 | 1,247 | 5,871 | 2,500 | 492 | 2,879 | full |
| propaedia:7.3 | 7,128 | 15,908 | 5,277 | 3,186 | 7,445 | full |
| propaedia:8.1 | 612 | 883 | 248 | 496 | 139 | full |
| propaedia:8.2 | 260 | 372 | 120 | 154 | 98 | full |
| propaedia:9.1 | 90 | 158 | 53 | 80 | 25 | full |
| propaedia:9.2 | 165 | 253 | 70 | 119 | 64 | full |
| propaedia:9.3 | 165 | 194 | 10 | 149 | 35 | full |
| propaedia:9.4 | 18 | 28 | 8 | 14 | 6 | full |
| propaedia:9.5 | 12 | 55 | 38 | 5 | 12 | full |
| propaedia:9.6 | 190 | 463 | 258 | 126 | 79 | full |
| propaedia:9.7 | 87 | 308 | 207 | 58 | 43 | full |
| ocm:100 | 54 | 58 | 5 | 35 | 18 | full |
| ocm:110 | 204 | 588 | 376 | 69 | 143 | full |
| ocm:120 | 200 | 359 | 158 | 148 | 53 | full |
| ocm:130 | 286 | 1,400 | 1,007 | 168 | 225 | full |
| ocm:140 | 1,138 | 1,665 | 516 | 866 | 283 | full |
| ocm:150 | 1,352 | 2,542 | 1,145 | 910 | 487 | full |
| ocm:160 | 130 | 530 | 366 | 90 | 74 | full |
| ocm:170 | 1,976 | 4,387 | 2,238 | 1,395 | 754 | full |
| ocm:180 | 480 | 1,150 | 611 | 366 | 173 | full |
| ocm:190 | 2,558 | 14,775 | 12,113 | 1,186 | 1,476 | full |
| ocm:200 | 1,739 | 4,984 | 2,941 | 1,212 | 831 | full |
| ocm:210 | 165 | 885 | 700 | 84 | 101 | full |
| ocm:220 | 52 | 274 | 224 | 27 | 23 | full |
| ocm:230 | 730 | 1,108 | 379 | 702 | 27 | full |
| ocm:240 | 900 | 1,981 | 984 | 826 | 171 | full |
| ocm:250 | 240 | 404 | 157 | 229 | 18 | full |
| ocm:260 | 160 | 589 | 395 | 120 | 74 | full |
| ocm:270 | 99 | 526 | 406 | 64 | 56 | full |
| ocm:280 | 134 | 381 | 227 | 64 | 90 | full |
| ocm:290 | 189 | 630 | 448 | 167 | 15 | full |
| ocm:300 | 89 | 368 | 280 | 57 | 31 | full |
| ocm:310 | 121 | 402 | 259 | 60 | 83 | full |
| ocm:320 | 367 | 441 | 62 | 138 | 241 | full |
| ocm:330 | 275 | 1,465 | 1,280 | 78 | 107 | full |
| ocm:340 | 813 | 1,678 | 717 | 453 | 508 | full |
| ocm:350 | 195 | 862 | 720 | 104 | 38 | full |
| ocm:360 | 83 | 288 | 176 | 51 | 61 | full |
| ocm:370 | 482 | 1,715 | 1,148 | 218 | 349 | full |
| ocm:380 | 457 | 620 | 182 | 175 | 263 | full |
| ocm:390 | 221 | 1,155 | 954 | 58 | 143 | full |
| ocm:400 | 8,073 | 19,340 | 5,696 | 3,228 | 10,416 | full |
| ocm:410 | 267 | 1,714 | 1,331 | 123 | 260 | full |
| ocm:420 | 128 | 446 | 304 | 48 | 94 | full |
| ocm:430 | 101 | 490 | 280 | 72 | 138 | full |
| ocm:440 | 415 | 1,837 | 935 | 278 | 624 | full |
| ocm:450 | 907 | 4,967 | 3,238 | 603 | 1,126 | full |
| ocm:460 | 617 | 1,499 | 870 | 435 | 194 | full |
| ocm:470 | 2,486 | 7,685 | 3,046 | 1,690 | 2,949 | full |
| ocm:480 | 471 | 1,437 | 917 | 365 | 155 | full |
| ocm:490 | 105 | 463 | 359 | 22 | 82 | full |
| ocm:500 | 554 | 699 | 190 | 249 | 260 | full |
| ocm:510 | 280 | 861 | 510 | 234 | 117 | full |
| ocm:520 | 1,016 | 2,041 | 858 | 689 | 494 | full |
| ocm:530 | 4,042 | 7,064 | 3,080 | 2,731 | 1,253 | full |
| ocm:540 | 257 | 540 | 281 | 165 | 94 | full |
| ocm:550 | 7 | 166 | 154 | 3 | 9 | full |
| ocm:560 | 259 | 768 | 277 | 317 | 174 | full |
| ocm:570 | 156 | 2,551 | 2,359 | 55 | 137 | full |
| ocm:580 | 20 | 45 | 27 | 12 | 6 | full |
| ocm:590 | 417 | 882 | 457 | 360 | 65 | full |
| ocm:600 | 9 | 12 | 3 | 7 | 2 | full |
| ocm:610 | 4 | 18 | 12 | 1 | 5 | full |
| ocm:620 | 407 | 1,226 | 788 | 337 | 101 | full |
| ocm:630 | 41 | 190 | 143 | 10 | 37 | full |
| ocm:640 | 158 | 1,168 | 962 | 82 | 124 | full |
| ocm:650 | 326 | 1,065 | 638 | 254 | 173 | full |
| ocm:660 | 872 | 2,081 | 1,149 | 575 | 357 | full |
| ocm:670 | 859 | 2,014 | 1,091 | 552 | 371 | full |
| ocm:680 | 283 | 829 | 536 | 228 | 65 | full |
| ocm:690 | 78 | 532 | 436 | 48 | 48 | full |
| ocm:700 | 117 | 240 | 137 | 91 | 12 | full |
| ocm:710 | 9 | 52 | 44 | 4 | 4 | full |
| ocm:720 | 207 | 926 | 488 | 122 | 316 | full |
| ocm:730 | 375 | 535 | 155 | 305 | 75 | full |
| ocm:740 | 1,601 | 3,149 | 1,413 | 1,141 | 595 | full |
| ocm:750 | 1,612 | 2,468 | 824 | 1,327 | 317 | full |
| ocm:760 | 37 | 112 | 66 | 25 | 21 | full |
| ocm:770 | 673 | 972 | 303 | 505 | 164 | full |
| ocm:780 | 43 | 59 | 29 | 9 | 21 | full |
| ocm:790 | 32 | 88 | 76 | 4 | 8 | full |
| ocm:800 | 4,777 | 9,460 | 6,028 | 650 | 2,782 | full |
| ocm:810 | 8,887 | 17,610 | 7,054 | 4,138 | 6,418 | full |
| ocm:820 | 29 | 71 | 42 | 11 | 18 | full |
| ocm:830 | 177 | 393 | 209 | 159 | 25 | full |
| ocm:840 | 77 | 325 | 244 | 68 | 13 | full |
| ocm:850 | 243 | 611 | 419 | 124 | 68 | full |
| ocm:860 | 12 | 557 | 546 | 8 | 3 | full |
| ocm:870 | 2,887 | 30,114 | 27,303 | 2,145 | 666 | full |
| ocm:880 | 280 | 539 | 305 | 187 | 47 | full |
| ocm:890 | 616 | 888 | 135 | 557 | 196 | full |
| ocm:900 | 75 | 171 | 52 | 57 | 62 | full |
| ocm:910 | 198 | 495 | 264 | 103 | 128 | full |
| ocm:920 | 121 | 232 | 95 | 65 | 72 | full |

## Named Absence Probe

| Cell | First review | Critic rule now | Curated | Catalogue | Resource | Rule status |
|---|---|---|---|---|---|---|
| developmental-milestones | 2 | 26 | 26 | 0 | 0 | full |
| first-language-acquisition | 32 | 138 | 108 | 25 | 5 | full |
| self-care-adl | 6 | 96 | 80 | 4 | 12 | full |
| braille | 0 | 12 | 12 | 0 | 0 | full |
| sign-languages | 41 | 156 | 109 | 37 | 10 | full |
| orientation-mobility | 3 | 24 | 24 | 0 | 0 | full |
| aac | 11 | 31 | 22 | 8 | 1 | full |
| special-education-learner | 143 | 166 | 23 | 127 | 16 | full |
| rehabilitation-relearning | 151 | 158 | 17 | 135 | 6 | full |
| indigenous-knowledge | 111 | 289 | 163 | 101 | 25 | full |
| subsistence | 22 | 71 | 54 | 3 | 14 | full |
| oral-tradition | 70 | 175 | 63 | 53 | 59 | full |
| family-transmission | 2 | 92 | 90 | 0 | 2 | full |
| care-work | 15 | 92 | 71 | 7 | 14 | full |
| paid-care-work | 20 | 24 | 22 | 0 | 2 | full |
| informal-illicit | 12 | 18 | 9 | 3 | 6 | full |
| military | 136 | 263 | 138 | 109 | 16 | full |
| religion-formation | 55 | 88 | 77 | 3 | 8 | full |
| play | 27 | 391 | 368 | 12 | 11 | full |
| games-sport-ladders | 208 | 201 | 119 | 25 | 57 | full |
| metalearning | 51 | 157 | 104 | 2 | 51 | full |
| historical-occupations | 10 | 29 | 19 | 4 | 6 | full |
| historical-curricula | 7 | 12 | 12 | 0 | 0 | full |
| emerging-occupations | 517 | 1,369 | 238 | 292 | 839 | full |
| adult-basic-literacy | 204 | 337 | 69 | 55 | 213 | full |
| prison-refugee | 18 | 26 | 4 | 10 | 12 | full |
| death-grief | 44 | 120 | 67 | 29 | 24 | full |
| sex-reproduction | 12 | 203 | 189 | 10 | 4 | full |
| household-production | 82 | 222 | 139 | 19 | 64 | full |
| emotional-regulation | 15 | 637 | 609 | 9 | 19 | full |
| digital-everyday | 22 | 312 | 294 | 3 | 15 | full |
| driving-transport | 30 | 79 | 42 | 6 | 31 | full |
| elite-performance | 51 | 51 | 23 | 20 | 8 | full |

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
