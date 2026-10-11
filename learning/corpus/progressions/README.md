# Progressions Corpus

One corpus of how education and training progress today: standards, course sequences, prerequisite edges, exams, books, open resources, degree programs and the course listings of three universities. Built on 2026-10-11 from 14 research slices for bead bkt-q0l1. Every row carries a CIP 2020 code where one could be assigned, and every occupation row carries an O*NET-SOC or SOC 2018 code, so `COVERAGE.md` measures the corpus against the full list of majors and careers.

## Tables

Files sit in `tables/` as JSON Lines, one object per line. A file above 5 MB is compressed with zstd. The folder holds 6.5 MB.

| Table | File | Rows | Flag | Flag true | Share | Content |
|---|---|---|---|---|---|---|
| frameworks | `frameworks.jsonl` | 581 | `verified` | 290 | 49.9% | Standards, curriculum guidelines, syllabus bodies, competency frameworks |
| progression | `progression.jsonl.zst` | 5,350 | `verified` | 2,742 | 51.3% | One topic, course, stage or occupation profile in a sequence |
| assessments | `assessments.jsonl` | 490 | `verified` | 262 | 53.5% | Exams, certifications, licences and interview formats with content outlines |
| books | `books.jsonl` | 1,636 | `verified` | 1,300 | 79.5% | Books deduplicated across slices and checked against Open Library, OpenStax and Crossref |
| resources | `resources.jsonl.zst` | 53,459 | `verified` | 19,419 | 36.3% | Open and commercial courses, textbooks, practice sets and reading lists from 30 providers |
| programs | `programs.jsonl.zst` | 1,058 | `page_fetched` | 843 | 79.7% | Degree program pages with required courses and term plans, plus 215 known pages left unfetched |
| courses | `courses.jsonl.zst` | 25,908 | `page_fetched` | 25,908 | 100% | The course listings of Iowa State, Illinois Urbana-Champaign and Iowa with parsed prerequisites |
| edges | `edges.jsonl.zst` | 22,130 | `stated` | 19,207 | 86.8% | One row per prerequisite, concurrent or corequisite edge |

Support files: `cycles.jsonl`, `backbone_codes.jsonl`, `cip_soc_crosswalk.jsonl`, `stats.json`, `coverage.json`.

## Two Flags

- `verified` is true when a research agent fetched the row's URL in its session, the row matches the page, and the row's notes claim no inference or recall. The build cleared the flag on 1,088 progression rows and 47 framework rows whose notes say inferred, recalled or from memory.
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
| Resource providers | Title, link, level and the licence string each provider states | Varies per row, see `licence` | The row is a pointer. The linked work keeps its own terms |

Attribution lines:

- O*NET: this corpus includes information from the [O*NET 31.0 Database](https://www.onetcenter.org/database.html) by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA), used under the [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) licence. O*NET is a trademark of USDOL/ETA. Bucket Foundation has modified all or some of this information. USDOL/ETA has not approved, endorsed or tested these modifications.
- Common Core: Copyright 2010 National Governors Association Center for Best Practices and Council of Chief State School Officers. All rights reserved. Used under the [public licence](https://www.thecorestandards.org/public-license/). The labels in this corpus are Bucket's own wording and are no part of the standards.
- Wikimedia: titles and links for Wikibooks, Wikiversity and the English Wikipedia pages Harvard Classics and Category:Education-related YouTube channels come from the [Wikimedia projects](https://www.wikimedia.org/) and their contributors, under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Bucket selected and reformatted them, and those rows stay under CC BY-SA 4.0.
- OpenStax: book records come from [OpenStax](https://openstax.org/), Rice University, under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Bucket reformatted them. Each book's own licence is in its row.
- England: contains public sector information licensed under the [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/).

Raw pages, the backbone raw folder and the sqlite files stay on the build machine.

## Coverage

248 of 457 four-digit CIP families in use hold a row, a program, a book or a resource. One further code, 19.00, holds 39 resources and sits outside the 457 because CIP 2020 moved it to 19.10. 75 of 98 SOC minor groups hold an occupation row, and 93 are reached once the crosswalk carries programs, books and resources across. `COVERAGE.md` lists every family and the 209 with nothing. Residency and fellowship programs and legal research degrees lead the empty list.

## Build and Test

```bash
python3 -I build/consolidate.py <slices-folder> <full-output> <public-output>
python3 -I build/coverage.py
python3 -m unittest learning/corpus/progressions/tests/test_progressions_corpus.py
```

`consolidate.py` needs the slice folders, the backbone sqlite file and the catalogue parser, which stay off the repo. It writes a full copy for local use and the public copy committed here. `coverage.py` and the tests run on the committed tables and need the `zstd` command. The 34 tests check unique ids, edge endpoints, cycles, URLs on flagged rows, the nine-level scale, CIP and SOC codes against the backbone, the two flags, and the absence of catalogue sentences, standards text, email addresses, home paths, Dewey text and SFIA wording.

## Open Items

- The stated flag outside the catalogues and the school slice rests on a wording rule. Nobody checked the edges one by one.
- The parser scored 81% full match on its held-out Iowa State, Illinois and Iowa sentences and was never scored on Kent State or Old Dominion. 79 of those sentences mix and with or without parentheses.
- 5,471 resources, 504 courses in service units and 246 program rows have no CIP code.
- Paraphrased topic summaries of exam outlines and accreditor standards remain in progression rows. They are agent wording, and a rights review of them is still open.
