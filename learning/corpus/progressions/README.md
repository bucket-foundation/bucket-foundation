# Progressions Corpus

One corpus of how education and training progress today: standards, course sequences, prerequisite edges, exams, books, open resources, degree programs and the course listings of three universities. Built on 2026-10-11 from 14 research slices for bead bkt-q0l1. Every row carries a CIP 2020 code where one could be assigned, and every occupation row carries an O*NET-SOC or SOC 2018 code, so `COVERAGE.md` measures the corpus against the full list of majors and careers.

## Tables

Files sit in `tables/` as JSON Lines, one object per line. A file above 5 MB is compressed with zstd. The folder holds 15 MB.

| Table | File | Rows | Flag | Flag true | Share | Content |
|---|---|---|---|---|---|---|
| frameworks | `frameworks.jsonl` | 970 | `verified` | 581 | 59.9% | Standards, curriculum guidelines, syllabus bodies, competency frameworks, 94 historical curricula, 72 training responses to a technology |
| progression | `progression.jsonl.zst` | 67,753 | `verified` | 64,619 | 95.4% | One topic, course, stage, standard or occupation profile in a sequence |
| assessments | `assessments.jsonl` | 556 | `verified` | 285 | 51.3% | Exams, certifications, licences and interview formats with content outlines |
| books | `books.jsonl` | 2,462 | `verified` | 2,081 | 84.5% | Books deduplicated across slices; the first 1,583 were checked against Open Library, OpenStax and Crossref |
| resources | `resources.jsonl.zst` | 55,692 | `verified` | 38,575 | 69.3% | Open and commercial courses, textbooks, practice sets and reading lists, from the second resources build with a CIP code by provider subject or title match |
| programs | `programs.jsonl.zst` | 1,058 | `page_fetched` | 843 | 79.7% | Degree program pages with required courses and term plans, plus 215 known pages left unfetched |
| courses | `courses.jsonl.zst` | 25,908 | `page_fetched` | 25,908 | 100% | The course listings of Iowa State, Illinois Urbana-Champaign and Iowa with parsed prerequisites |
| edges | `edges.jsonl.zst` | 24,088 | `stated` | 20,571 | 85.4% | One row per edge: prerequisite, concurrent, corequisite, recommended prerequisite, related, alternate standard, grade-band progression |
| activities | `activities.jsonl` | 1,522 | | | | Activity codes of ATUS, ICATUS 2016 and the Outline of Cultural Materials |
| occupation_history | `occupation_history.jsonl` | 3,994 | | | | One occupation lifecycle per row: first, peak and last attested year under census, SOC and OEWS series |
| technologies | `technologies.jsonl` | 6,991 | | | | Technologies and 14 technology waves with a first year |

The progression share rose because 60,914 K-12 standards rows arrived with `verified` true from their slice. That flag says a script read the standard from a published file, which is weaker than a person comparing the row with a page.

Support files: `cycles.jsonl`, `backbone_codes.jsonl`, `cip_soc_crosswalk.jsonl`, `soc_isco_crosswalk.jsonl`, `stats.json`, `coverage.json`, `completeness.json`, `forecast_backtest.json`.

## Two Flags

- `verified` is true when a research agent fetched the row's URL in its session, the row matches the page, and the row's notes claim no inference or recall. The build cleared the flag on 1,119 progression rows, 56 framework rows and 58 assessment rows whose notes say inferred, recalled, from memory or not fetched. The same rule runs on books and resources.
- `page_fetched` applies to courses and programs alone. It is true when a script downloaded the catalogue page and parsed the row from it. No person or agent compared the parsed row with the page, so the flag says less than `verified`. The 215 program rows with `page_fetched` false hold a URL and nothing else.

## Catalogue Scope

The course table holds every department course page the three catalogues list, 593 pages. Program coverage is partial: 843 program rows from fetched pages, 520 of them bachelor's degrees and 323 graduate or professional, and 215 known pages left unfetched. Graduate programs are covered in part, and the Illinois graduate catalogue lists several hundred more pages that the build never opened.

## Row Fields

- `id` is unique across all eight tables. `slice` names the research slice a row came from.
- `level`, `level_from` and `level_to` use nine values or null: early, primary, lower-secondary, upper-secondary, undergraduate-lower, undergraduate-upper, graduate, professional-entry, professional-advanced. A source value outside the scale is kept in `level_raw`.
- Progression and course rows share these names: `prerequisites`, `prerequisite_groups`, `external_prerequisites`, `edges_stated`, `term_order`, `notes`. `prerequisite_groups` is a list of groups. Every group is required and one atom inside a group satisfies it. An atom is a course with `id` and `code`, or a condition with a `kind` such as standing or consent.
- `cip` holds `code`, `grain` of 2, 4 or 6 digits, `method` and `mapping_verified`. `onet_soc` holds the same plus `minor_group`. `mapping_verified` is true only where the source prints the code: 228 O*NET profile rows. No source prints a CIP code, so every CIP mapping is an inference from a field label, a department title or a provider category.
- An edge has `src` as the prerequisite and `dst` as the dependent row, `type`, `stated`, `stated_basis`, `source_url`, `group_index`, `group_size` and `ambiguous_grouping`. An edge to a course with no row has `external` true and the code in `src_code`.
- A Common Core or NGSS row has `standard_url`, the link to the publisher's page.

## Facet Fields

Frameworks, progression, assessments, programs and courses carry eight facets: `life_stage`, `purpose`, `kind`, `mode`, `region`, `language`, `era_from`, `era_to`. Each has a `<field>_method` of `stated`, `rule` or `none`. `stated` means the slice wrote the value and it passed the vocabulary check. `rule` means one of the rules here fired. `none` means no rule applies and the value is null. The rules live in `build/facets.py`, and the tests pin each one.

| Field | Values | Rules, first match wins |
|---|---|---|
| `life_stage` | infancy, early-childhood, primary, secondary, tertiary, working-adult, mid-career-change, old-age | Catalogue course or program: tertiary. Slices `everyday` and `round2-arts-everyday`, and language fields: none, because their levels mark position on a ladder. Otherwise by level: early gives early-childhood, primary gives primary, both secondary levels give secondary, the two undergraduate levels and graduate give tertiary, the two professional levels give working-adult. A framework needs both ends in one stage |
| `purpose` | work, school, civic, personal, survival, play, spiritual, care | Catalogue: school. CIP series 33: civic. Series 36: play. Series 37: personal. A religious formation field, or CIP 38.02 or 39 in the two everyday slices: spiritual. A row with an occupation code, a professional level, or a slice of career, trades, occupations or interview: work. A school or university slice at a school level: school |
| `kind` | declarative, procedural, motor, perceptual, social-emotional, tacit-craft, judgement | Catalogue: none. CIP 36.0108, 36.0114 or 50.03: motor. CIP 50.02, 36.0102 or 48.07: tacit-craft. Series 35: social-emotional. The trades slice, or CIP 46, 47, 48.05 or 49: procedural |
| `mode` | school, apprenticeship, family, oral-tradition, self-teaching, play, religious-formation, military, online | Catalogue: school. A religious formation field: religious-formation. CIP 28 or 29, or a military field: military. A MOOC field: online. A title naming apprentice, journeyman, Ausbildung, Gesellen or Meister: apprenticeship. CIP 36.0103: play. A school or university slice at a school level: school |
| `region` | ISO 3166 two-letter code or `international` | Catalogue: US. A framework's own region text, read as stated: one country gives its code, several countries or a world body give `international`, anything else gives none, and the text stays in `region_raw`. A progression row takes its framework's region. A K-12 row takes the country of its standards system. An assessment takes the region of the frameworks that share its body when they agree |
| `language` | ISO 639 code | Catalogue: en. Region US, GB, AU, NZ or IE: en. DE: de. JP: ja. No slice states a language yet |
| `era_from`, `era_to` | Year, negative before the common era | Catalogue: 2026 for both, the catalogue edition. A framework's `year` is read as stated `era_from`. A progression row takes its framework's years |

Share of rows with a value:

| Table | life_stage | purpose | kind | mode | region | language | era_from | era_to |
|---|---|---|---|---|---|---|---|---|
| frameworks | 46.4% | 75.9% | 17.6% | 31.7% | 97.0% | 72.5% | 71.4% | 5.3% |
| progression | 97.9% | 98.5% | 2.6% | 94.8% | 99.5% | 96.9% | 7.4% | 0.0% |
| assessments | 79.0% | 95.7% | 17.3% | 29.7% | 49.5% | 34.0% | 0.9% | 0.0% |
| programs | 100% | 100% | 0% | 100% | 100% | 100% | 100% | 100% |
| courses | 100% | 100% | 0% | 100% | 100% | 100% | 100% | 100% |

Stated values come from the lifespan, beyond-school, history-forecast and history-technology slices: 727 progression rows state a purpose and 665 a kind. `kind` is the thinnest facet because no rule assigns declarative by default.

## Slices Merged

The loader takes a slice when its folder holds `SUMMARY.md`, the mark that its agent finished. `stats.json` lists the slices loaded and the slices pending.

| Slice | State | What the loader takes |
|---|---|---|
| k12-full | loaded | 60,914 standards rows from 34 systems with code, grade, strand heading and a keyword label of at most ten words; 266 career and technical rows; 1,362 edges; 1,101 textbook rows. Licence strings the slice never fetched read `unknown` in `source_licence` |
| lifespan | loaded | Frameworks, progression with `age_from` and `age_to`, assessments, textbooks |
| beyond-school | loaded | The four standard files, plus `activities.jsonl` |
| history-forecast | loaded | 94 historical curricula as framework rows with stated eras. Its disciplines, works and claims files wait for a table of their own |
| history-technology | loaded | Technologies, waves, and 72 training responses as framework rows. Its patent, adoption and lag series wait |
| history-occupations | loaded | Occupation lifecycles. Its 90,166 titles, employment series, crosswalks and projections wait |
| round3-empty | loaded | The four standard files; its `cip4` column becomes the row's CIP code |
| world | pending | The four standard files of the brief |
| resources-v2 | loaded | `resources/resources-v2.jsonl` replaces the first resources file; `cip4` and `cip_method` become the row's CIP mapping |
| forecast-backtest | loaded | `results.json` alone, as `forecast_backtest.json` |

Every string in the committed tables is cut at a limit per field: 240 characters for a topic, 200 for a name, 700 for notes, 300 elsewhere. 60 values were cut. A test enforces the limits.


## Stated Edges

`stated` is true when a source states the edge. Catalogue edges come from the parsed prerequisite sentence. School rows keep the flag their slice set. For the other slices the flag is read from the wording of `notes` by rule: the words inferred, recalled or ordinal give false, a sentence saying the source states the edge gives true, and silence gives false. `stated_basis` names the rule that fired, so a consumer can drop the rule-based edges.

Stated prerequisite edges hold no cycle once or-alternatives are set aside. `cycles.jsonl` lists the three components that close through an or-alternative, such as Illinois CS 225, CS 374 and MATH 412.

## Text Left Out

The repo is public, so a committed sentence is a republished sentence. The committed tables hold codes, titles, numbers and parsed structure.

- Catalogue prerequisite, corequisite, requirement and recommendation sentences, course descriptions and the wording of conditions are absent from every table. The parsed groups, the edges and `source_url` remain. The full sentences stay in the local build folder outside git.
- 371 Common Core mathematics rows hold the standard or cluster code, a label of at most eight words written for this corpus, and a link to the standard. 70 Common Core English rows hold the strand and grade. 44 NGSS rows hold the idea codes with a short label. CEFR rows hold the level code.
- England national curriculum rows keep their wording under the Open Government Licence v3.0.
- SFIA rows hold level numbers and a link. Dewey text is absent.

## Repairs

- Six US high school course rows in the school slice claimed stated edges with no fetched source: Algebra I, Geometry, Algebra II, Precalculus, Calculus I, Calculus II. They read false.
- The round2-fields slice flattened and/or logic and mixed corequisites into prerequisites. Its 653 Kent State and Old Dominion sentences were parsed again with the catalogue parser, and corequisite clauses became their own edge type.
- 3,337 round2-fields rows and 686 land-health-service rows duplicated a catalogue course. The catalogue row stays and lists the old ids in `merged_ids`.
- 155 Illinois rows in the university-stem slice point at their catalogue course through `same_as`.
- Books replace the slices' textbook rows. 69 round-two textbook rows were absent from the checked book list: 53 were added with status `unchecked` and 16 joined a book with the same title.
- 845 resource guesses named a CIP group that CIP 2020 lacks and were moved to the two-digit series.

## Licence

The compilation, meaning the selection, the ids, the parsed structure, the edges and the CIP and SOC mappings, is released under `CC-BY-4.0`, the SPDX identifier that `docs/DATA-STANDARD.md` uses for Bucket's data records. The code under `build/` and `tests/` is under the repository's MIT licence. Each third-party source keeps its own terms, listed here, and those terms govern wherever they are stricter.

The build session opened one licence page, the O*NET one. The other rows state the publisher's known terms and need a check against the live page.

| Source | What these tables hold | Terms | Permits |
|---|---|---|---|
| CIP 2020, NCES | Codes and titles, CIP to SOC crosswalk | US federal work, public domain in the United States | Copying and redistribution |
| SOC 2018, BLS | Codes and titles | US federal work, public domain | Copying and redistribution. BLS asks for a citation |
| O*NET 31.0 | Occupation codes and titles, job zones, education shares, top knowledge and skill ratings on 228 profile rows | CC BY 4.0 | Copying and change with the attribution line under this table |
| ESCO v1.2 | Nothing. Framework rows name ESCO and link to it | European Commission Decision 2011/833/EU | Reuse with acknowledgement of ESCO, its version and a statement of changes, once an import happens |
| OpenAlex | Nothing. The topic taxonomy stays in the local backbone | CC0 | Any use |
| Wikipedia, Wikibooks, Wikiversity | Titles and links | CC BY-SA 4.0 | Copying and change with attribution, under the same licence |
| Dewey Decimal Classification | Nothing | Copyright OCLC | No redistribution. A test fails the build if Dewey text appears |
| SFIA 9 | Level numbers and a link | Proprietary, SFIA Foundation | Internal use. No SFIA text may be committed |
| Common Core State Standards | Codes, short labels written here, links | Public licence of NGA Center and CCSSO | Use in support of the standards with the notice under this table |
| Achieve the Core Coherence Map | Edges between K-8 standards | CC0 | Any use |
| NGSS | Idea codes and links | Copyright Achieve and the National Academy of Sciences | Codes as facts. No standard text is copied |
| National curriculum in England | Subject content headings | Open Government Licence v3.0 | Copying and change with the attribution line under this table |
| University catalogues | Course codes, titles, credits and parsed prerequisite structure from Iowa State, Illinois, Iowa, Kent State, Old Dominion, MIT, UC San Diego and Cambridge | Copyright of each university, no reuse licence | Facts. No sentence from a catalogue is committed |
| Exam boards and accreditors | Names, topic lists and published weights | Copyright of each body | Facts. No handbook text is copied |
| Open Library, Crossref | Bibliographic records for books | CC0 for Open Library data | Any use |
| OpenStax | Book titles, links and licence strings | CC BY 4.0 for the catalogue, CC BY or CC BY-NC-SA per book | Copying with the attribution line under this table |
| ATUS activity lexicon, BLS | Codes and labels | US federal work, public domain | Copying and redistribution |
| ICATUS 2016, UN Statistics Division | Codes, with Bucket labels on the nine major divisions | United Nations copyright; terms unread in the build | Codes as facts. No UN label text is committed |
| Outline of Cultural Materials, HRAF | Category numbers and a link | Copyright Human Relations Area Files | Numbers as facts. No HRAF label text is committed |
| Census, SOC and OEWS occupation series | Titles, codes and years in `occupation_history` | US federal work, public domain | Copying and redistribution |
| Wikidata | Technology names and dates | CC0 | Any use |
| K-12 standards systems | Codes, grades, strand headings and keyword labels from 34 systems | Texas rules are public, Australia is CC BY 4.0, England is OGL v3.0; the rest are unknown | Codes as facts. The keyword labels of the unknown systems need a rights review |
| Resource providers | Title, link, level and the licence string each provider states | Varies per row, see `licence` | The row is a pointer. The linked work keeps its own terms |

Attribution lines:

- O*NET: this corpus includes information from the [O*NET 31.0 Database](https://www.onetcenter.org/database.html) by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA), used under the [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) licence. O*NET is a trademark of USDOL/ETA. Bucket Foundation has modified all or some of this information. USDOL/ETA has not approved, endorsed or tested these modifications.
- Common Core: Copyright 2010 National Governors Association Center for Best Practices and Council of Chief State School Officers. All rights reserved. Used under the [public licence](https://www.thecorestandards.org/public-license/). The labels in this corpus are Bucket's own wording and are no part of the standards.
- Wikimedia: titles and links for Wikibooks, Wikiversity and the English Wikipedia pages Harvard Classics and Category:Education-related YouTube channels come from the [Wikimedia projects](https://www.wikimedia.org/) and their contributors, under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Bucket selected and reformatted them, and those rows stay under CC BY-SA 4.0.
- OpenStax: book records come from [OpenStax](https://openstax.org/), Rice University, under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Bucket reformatted them. Each book's own licence is in its row.
- England: contains public sector information licensed under the [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/).

Raw pages, the backbone raw folder and the sqlite files stay on the build machine.

## Coverage

373 of 457 four-digit CIP families in use hold a row, a program, a book or a resource, and 84 hold nothing. Four further codes hold items and sit outside the 457 because CIP 2020 moved or deleted them: 45.14, 51.24, 51.25 and 60.06. 75 of 98 SOC minor groups hold an occupation row, and 96 are reached once the crosswalk carries programs, books and resources across. `COVERAGE.md` lists every family.

## Completeness

`completeness/frame.jsonl` is the frame an independent critic wrote on 2026-10-11: 441 cells across life stage, purpose, kind of knowing, mode of transmission, geography, language, era, domain, feared absences and ISCO-08 occupations. That review scored the corpus 3.1 of 10. `build/completeness.py` scores the same cells from the tables and writes `COMPLETENESS.md`.

| Dimension | Cells | Held at the first review | Held by the critic's rule now | Held by a facet field |
|---|---|---|---|---|
| Life stage | 8 | 8 | 8 | 8 |
| Purpose | 9 | 9 | 7, five of them on the CIP half of the rule | 8 |
| Kind of knowing | 7 | 7 | 2 | 7 |
| Mode of transmission | 9 | 9 | 3 | 9 |
| Geography | 30 | 10 | 17 | 12 |
| Language | 30 | 23 | 25 | 3 |
| Era | 7 | 7 | 7 | 6 |
| Domain | 193 | 189 | 193 | no field |
| Feared absences | 33 | 32 | 33 | no field |
| ISCO-08 sub-major groups | 43 | 29 | 29 | no field |

A cell is held when one row with `verified` or `page_fetched` true lands in it. The first review warned that keyword counts overstate, and the same holds here. On the tables the first review read, the scorer lands within tolerance on 351 of the 365 cells it can score. The frame records no keyword list for 20 purpose, kind and mode cells, so the critic's rule cannot be rerun for them; the facet fields score those cells instead. Health of self has no value in the purpose vocabulary of the brief and stays unheld by field.


## Build and Test

```bash
python3 -I build/consolidate.py <slices-folder> <full-output> <public-output>
python3 -I build/coverage.py
python3 -I build/completeness.py
python3 -m unittest learning/corpus/progressions/tests/test_progressions_corpus.py
```

`consolidate.py` needs the slice folders, the backbone sqlite file and the catalogue parser, which stay off the repo. It writes a full copy for local use and the public copy committed here. `coverage.py`, `completeness.py` and the tests run on the committed tables and need the `zstd` command. The build streams the resources and K-12 standards files row by row and peaked at 297 MB; the scorer peaked at 16 MB, the coverage report at 43 MB and the tests at 1.3 GB. The 48 tests check unique ids, edge endpoints, cycles, URLs on flagged rows, the nine-level scale, CIP and SOC codes against the backbone, the two flags, the facet rules, the text limit per field, and the absence of catalogue sentences, standards text, email addresses, home paths, Dewey text and SFIA wording.

## Open Items

- The stated flag outside the catalogues and the school slice rests on a wording rule. Nobody checked the edges one by one.
- The parser scored 81% full match on its held-out Iowa State, Illinois and Iowa sentences and was never scored on Kent State or Old Dominion. 79 of those sentences mix and with or without parentheses.
- 27,553 resources, 24,864 progression rows, 504 courses in service units and 246 program rows have no CIP code. 24,127 of those progression rows are K-12 career and technical standards, which span every field.
- Paraphrased topic summaries of exam outlines and accreditor standards remain in progression rows. They are agent wording, and a rights review of them is still open.
- The K-12 slice repeats Common Core rows that the school slice already holds. The two sets are unlinked.
- `verified` on K-12 rows comes from the slice's script. The 1,359 progression rows cleared by the notes rule are all from hand-researched slices.
- Australia's attribution line and the K-12 licence strings are unread, and the keyword labels of systems with unknown terms may need to go.
- Facet rules cover what a label, a level or a code can decide. 97% of progression rows have no `kind`, and no row has a stated language.
