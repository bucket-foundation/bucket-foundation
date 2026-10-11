# Progressions Corpus

One corpus of how education and training progress today: standards, course sequences, prerequisite edges, exams, books, open resources, degree programs and three whole university catalogues. Built on 2026-10-11 from 14 research slices for bead bkt-q0l1. Every row carries a CIP 2020 code, and every occupation row carries an O*NET-SOC or SOC 2018 code, so coverage is measured against the full list of majors and careers in `COVERAGE.md`.

## Tables

Files sit in `tables/` as JSON Lines, one object per line. A file above 5 MB is compressed with zstd. The folder holds 6.9 MB.

| Table | File | Rows | Verified | Share | Content |
|---|---|---|---|---|---|
| frameworks | `frameworks.jsonl` | 581 | 337 | 58.0% | Standards, curriculum guidelines, syllabus bodies, competency frameworks |
| progression | `progression.jsonl.zst` | 5,350 | 3,830 | 71.6% | One topic, course, stage or occupation profile in a sequence |
| assessments | `assessments.jsonl` | 490 | 262 | 53.5% | Exams, certifications, licences and interview formats with content outlines |
| books | `books.jsonl` | 1,636 | 1,300 | 79.5% | Books deduplicated across slices and checked against Open Library, OpenStax and Crossref |
| resources | `resources.jsonl.zst` | 53,459 | 19,419 | 36.3% | Open and commercial courses, textbooks, practice sets and reading lists from 30 providers |
| programs | `programs.jsonl.zst` | 843 | 843 | 100% | Degree program pages with required courses and term plans |
| courses | `courses.jsonl.zst` | 25,908 | 25,908 | 100% | Every course of Iowa State, Illinois Urbana-Champaign and Iowa with parsed prerequisites |
| edges | `edges.jsonl.zst` | 22,130 | 19,207 stated | 86.8% | One row per prerequisite, concurrent or corequisite edge |

`verified` is true when the research agent fetched the row's URL in its session and the row matches the page. Support files: `cycles.jsonl`, `backbone_codes.jsonl`, `cip_soc_crosswalk.jsonl`, `stats.json`, `coverage.json`.

## Row Fields

- `id` is unique across all eight tables. `slice` names the research slice a row came from.
- `level`, `level_from` and `level_to` use nine values or null: early, primary, lower-secondary, upper-secondary, undergraduate-lower, undergraduate-upper, graduate, professional-entry, professional-advanced. A source value outside the scale is kept in `level_raw`.
- Progression and course rows share these names: `prerequisites`, `prerequisite_groups`, `prerequisite_text`, `external_prerequisites`, `edges_stated`, `term_order`, `notes`. `prerequisite_groups` is a list of groups. Every group is required and one atom inside a group satisfies it. An atom is a course with `id` and `code`, or a condition such as class standing.
- `cip` holds `code`, `grain` of 2, 4 or 6 digits, `method` and `mapping_verified`. `onet_soc` holds the same plus `minor_group`. `mapping_verified` is true only where the source prints the code: 228 O*NET profile rows. No source prints a CIP code, so every CIP mapping is an inference from a field label, a department title or a provider category.
- An edge has `src` as the prerequisite and `dst` as the dependent row, `type`, `stated`, `stated_basis`, `source_url`, `group_index` and `group_size`. An edge to a course with no row has `external` true and the code in `src_code`.

## Stated Edges

`stated` is true when a source states the edge. Catalogue edges come from the parsed prerequisite sentence. School rows keep the flag their slice set. For the other slices the flag is read from the wording of `notes` by rule: the words inferred, recalled or ordinal give false, a sentence saying the source states the edge gives true, and silence gives false. `stated_basis` names the rule that fired, so a consumer can drop the rule-based edges.

Stated prerequisite edges hold no cycle once or-alternatives are set aside. `cycles.jsonl` lists the three components that close through an or-alternative, such as Illinois CS 225, CS 374 and MATH 412.

## Repairs

- Six US high school course rows in the school slice claimed stated edges with no fetched source: Algebra I, Geometry, Algebra II, Precalculus, Calculus I, Calculus II. They read false.
- The round2-fields slice flattened and/or logic and mixed corequisites into prerequisites. Its 653 Kent State and Old Dominion sentences were parsed again with the catalogue parser, and corequisite clauses became their own edge type.
- 3,337 round2-fields rows and 686 land-health-service rows duplicated a catalogue course. The catalogue row stays and lists the old ids in `merged_ids`.
- 155 Illinois rows in the university-stem slice point at their catalogue course through `same_as`.
- Books replace the slices' textbook rows. 69 round-two textbook rows were absent from the checked book list: 53 were added with status `unchecked` and 16 joined a book with the same title.
- 845 resource guesses named a CIP group that CIP 2020 lacks and were moved to the two-digit series.

## Sources and Licences

The build session opened one licence page, the O*NET one. The other rows state the publisher's known terms and need a check against the live page before Bucket republishes the data under its own name.

| Source | What these tables hold | Terms | Permits |
|---|---|---|---|
| CIP 2020, NCES | Codes and titles, CIP to SOC crosswalk | US federal work, public domain in the United States | Copying and redistribution |
| SOC 2018, BLS | Codes and titles | US federal work, public domain | Copying and redistribution. BLS asks for a citation |
| O*NET 31.0 | Occupation codes and titles, job zones, education shares, top knowledge and skill ratings on 228 profile rows | CC BY 4.0 | Copying and change with the attribution line under this table |
| ESCO v1.2 | Nothing. Framework rows name ESCO and link to it | European Commission Decision 2011/833/EU | Reuse with acknowledgement of ESCO, its version and a statement of changes, once an import happens |
| OpenAlex | Nothing. The topic taxonomy stays in the local backbone | CC0 | Any use |
| Wikipedia and sister projects | Titles and links for Wikibooks, Wikiversity and two list pages | CC BY-SA 4.0 | Copying and change with attribution, under the same licence |
| Dewey Decimal Classification | Nothing | Copyright OCLC | No redistribution. A test fails the build if Dewey text appears |
| SFIA 9 | Level numbers and a link. Eight rows had their wording removed | Proprietary, SFIA Foundation | Internal use. No SFIA text may be committed |
| Common Core State Standards | Standard codes and text in school rows | Public licence of NGA Center and CCSSO | Copying with the copyright notice |
| Achieve the Core Coherence Map | Edges between K-8 standards | CC0 | Any use |
| University catalogues | Course codes, titles, credits and prerequisite sentences from Iowa State, Illinois, Iowa, Kent State, Old Dominion, MIT, UC San Diego and Cambridge | Copyright of each university, no reuse licence | Facts and short quoted requirements. Course descriptions are left out |
| Exam boards and accreditors | Names, topic lists and published weights | Copyright of each body | Facts. No handbook text is copied |
| Open Library, OpenStax, Crossref | Bibliographic records for books | CC0 for Open Library data, CC BY for the OpenStax catalogue | Copying, with attribution for OpenStax |
| Resource providers | Title, link, level and the licence string each provider states | Varies per row, see `licence` | The row is a pointer. The linked work keeps its own terms |

O*NET attribution: this corpus includes information from the O*NET 31.0 Database by the U.S. Department of Labor, Employment and Training Administration, used under the CC BY 4.0 licence. O*NET is a trademark of USDOL/ETA. Bucket Foundation has modified all or some of this information. USDOL/ETA has not approved, endorsed or tested these modifications.

Common Core notice: Copyright 2010 National Governors Association Center for Best Practices and Council of Chief State School Officers. All rights reserved.

Raw pages, the backbone raw folder and the sqlite files stay on the build machine.

## Coverage

247 of 457 four-digit CIP families in use hold a row, a program, a book or a resource. 75 of 98 SOC minor groups hold an occupation row, and 93 are reached once the crosswalk carries programs, books and resources across. `COVERAGE.md` lists every family and the 210 with nothing. Residency programs, legal research degrees and health preparatory programs lead the empty list.

## Build and Test

```bash
python3 -I build/consolidate.py <slices-folder> <output-folder>
python3 -I build/coverage.py
python3 -m unittest learning/corpus/progressions/tests/test_progressions_corpus.py
```

`consolidate.py` needs the slice folders, the backbone sqlite file and the catalogue parser, which stay off the repo. `coverage.py` and the tests run on the committed tables and need the `zstd` command. The tests check unique ids, edge endpoints, cycles, URLs on verified rows, the nine-level scale, CIP and SOC codes against the backbone, and the absence of email addresses, home paths, Dewey text and SFIA wording.

## Open Items

- The stated flag outside the catalogues and the school slice rests on a wording rule. Nobody checked the edges one by one.
- The parser scored 81% full match on its held-out Iowa State, Illinois and Iowa sentences and was never scored on Kent State or Old Dominion. 79 of those sentences mix and with or without parentheses.
- 5,471 resources and 504 courses in service units have no CIP code.
- Prerequisite sentences are quoted from university catalogues. Counsel has yet to review that quotation, and the review comes before any republication beyond this repo.
