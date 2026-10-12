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
| occupation_history | `occupation_history.jsonl` | 3,296 | | | | One occupation lifecycle per row: first, peak and last attested year under SOC, OEWS and O*NET series; title, code and list years alone for the 2002, 2010 and 2018 census lists |
| technologies | `technologies.jsonl` | 698 | `verified` | 48 | 6.9% | 14 technology waves, 97 curated technologies with a source page, and 587 Wikidata items whose class names a technology, invention, tool, machine, technique or process. The 587 carry `evidence: wikidata-id-only` and `verified` false. 6,293 Wikidata items with no such class were dropped |

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
| `purpose` | work, school, civic, personal, survival, play, spiritual, care | Catalogue: school. CIP series 33: civic. Series 36: play. Series 37: personal. A religious formation field, or CIP 38.02 or 39 in the two everyday slices: spiritual. A row with an occupation code, a professional level, a slice of career, trades, occupations or interview, or the field career and technical education: work. A school or university slice at a school level: school |
| `kind` | declarative, procedural, motor, perceptual, social-emotional, tacit-craft, judgement | Catalogue: none. CIP 36.0108, 36.0114 or 50.03: motor. CIP 50.02, 36.0102 or 48.07: tacit-craft. Series 35: social-emotional. The trades slice, or CIP 46, 47, 48.05 or 49: procedural |
| `mode` | school, apprenticeship, family, oral-tradition, self-teaching, play, religious-formation, military, online | Catalogue: school. A religious formation field: religious-formation. CIP 28 or 29, or a military field: military. A MOOC field: online. A title naming apprentice, journeyman, Ausbildung, Gesellen or Meister: apprenticeship. CIP 36.0103: play. A school or university slice at a school level: school |
| `region` | ISO 3166 two-letter code or `international` | Catalogue: US. A framework's own region text, read as stated: one country gives its code, several countries or a world body give `international`, anything else gives none, and the text stays in `region_raw`. A progression row takes its framework's region. A K-12 row takes the country of its standards system. An assessment takes the region of the frameworks that share its body when they agree |
| `language` | ISO 639 code | Catalogue: en. Region US, GB, AU, NZ or IE: en. DE: de. JP: ja. No slice states a language yet |
| `era_from`, `era_to` | Year, negative before the common era | Catalogue: 2026 for both, the catalogue edition. A framework's `year` is read as stated `era_from`. A progression row takes its framework's years |

Share of rows with a value:

| Table | life_stage | purpose | kind | mode | region | language | era_from | era_to |
|---|---|---|---|---|---|---|---|---|
| frameworks | 46.4% | 75.9% | 17.6% | 31.7% | 97.0% | 72.5% | 71.4% | 5.3% |
| progression | 97.9% | 98.9% | 2.5% | 94.8% | 99.5% | 96.9% | 7.4% | 0.0% |
| assessments | 79.0% | 95.7% | 17.3% | 29.7% | 49.5% | 34.0% | 0.9% | 0.0% |
| programs | 100% | 100% | 0% | 100% | 100% | 100% | 100% | 100% |
| courses | 100% | 100% | 0% | 100% | 100% | 100% | 100% | 100% |

Stated values come from the lifespan, beyond-school, history-forecast and history-technology slices: 727 progression rows state a purpose and 665 a kind. `kind` is the thinnest facet because no rule assigns declarative by default.

## Slices Merged

The loader takes a slice when its folder holds `SUMMARY.md`, the mark that its agent finished. `stats.json` lists the slices loaded and the slices pending.

| Slice | State | What the loader takes |
|---|---|---|
| k12-full | loaded | 60,914 standards rows from 34 systems with code, grade, subject, strand heading and URL. The slice label stays on 3,141 rows of three systems whose terms allow reuse: Head Start ELOF 418, Australian Curriculum 2,678, England 45. It is dropped on the 57,773 rows of the other 31 systems; 266 career and technical rows; 1,362 edges; 1,101 textbook rows. Licence strings the slice never fetched read `unknown` in `source_licence` |
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


## World and Technology Tables

`build/world.py` writes these tables beside the eight main ones. It streams each slice file and peaks at 38 MB. `world_stats.json` holds the counts.

| Table | Rows | Verified | Content |
|---|---|---|---|
| `countries.jsonl` | 237 | 100% | One row per ISO 3166 country: `iso2`, `iso3`, name, `lat` and `lng` of the Natural Earth label point |
| `world_systems.jsonl` | 1,974 | 100% | Education programmes of 66 countries from the UIS ISCED mappings: ISCED codes, entry age, duration, orientation, programme and qualification names of eight words or fewer |
| `world_stages.jsonl` | 561 | 100% | One row per country and ISCED level: entry age, duration, programme counts, compulsory ages, World Bank enrolment |
| `world_exams.jsonl` | 269 | 21.6% | National examinations with level and body. `verified` covers the exam name; what the exam gates is recall and says so in `gates_basis` |
| `world_nqf.jsonl` | 308 | 89.9% | Qualification framework levels with the EQF level where one exists |
| `world_occupations.jsonl` | 6,005 | 98.9% | National occupation classifications with ISCO-08 links. Titles stay for the United Kingdom, Australia, New Zealand, Canada and Japan, whose terms allow reuse with credit. France holds codes and ISCO links, since its source file carries no titles. Germany and Brazil hold codes alone, their terms unknown |
| `world_professions.jsonl` | 264 | 0% | Routes to doctor, lawyer, engineer and teacher in 66 countries. All recall: no regulator page was fetched, and every row reads `verified` false |
| `world_elements.jsonl` | 330 | 0% | University admission, vocational route, apprenticeship, degree structure and lifelong learning per country, recall with counts read from data |
| `world_languages.jsonl` | 66 | 0% | Languages of instruction per country, recall |
| `world_tvet_bodies.jsonl` | 123 | 100% | Vocational training bodies from the UNEVOC directory |
| `world_indicators.jsonl` | 1,598 | 100% | World Bank education indicators |
| `tech_occupation.jsonl` | 52 | 84.6% | A technology creating, changing or ending an occupation, with year and source link. 11 cases that rest on an IPUMS-hosted file are left out |
| `tech_training_response.jsonl` | 72 | 97.2% | The first school, apprenticeship or licence that answered a technology, with year and lag |
| `tech_lags.jsonl` | 23 | | 13 case rows, each with its measure, both years and `n` of 1, and 10 summary rows giving the median and `n` per measure. 5 cases measured on census counts are left out |
| `attributions.jsonl` | 29 | | The credit line each source asks for, keyed for the app |
| `source_licences.jsonl` | 86 | | Licence facts per source for the lifespan set and the data structures and algorithms graph |

Every world row carries `region` as an ISO 3166 two-letter code, `language` for the language of the row text, `national_language` for the system it describes, and `licence` as the source states it or `unknown`. Descriptions in the exam, profession and element tables are the research agent's own words. No sentence from a ministry page, a mapping file or a classification manual is committed.

### Countries for the Explore Map

The Explore place rule accepts a two-letter code that the country file lists. `src/data/world-indicators.json` holds `iso3` alone, so `countries.jsonl` supplies `iso2`, `iso3`, name, latitude and longitude for 237 countries. Points are the label points of Natural Earth 1:50m Admin 0 Countries, which is in the public domain; `terms_url` links its terms. The file itself is fetched to `build/ne/` at build time and stays off the repo.

### Source Licences

`source_licences.jsonl` is keyed the way `packages/bkt/src/pack/row-sets/licences.ts` matches a row: `match.host` holds the host of the row's URL, and `match.framework_id` covers rows with no URL. Each row gives `licence`, `share_alike`, `public` as rows, codes or none, the terms page, what it permits in our words, the date read and an attribution line. Of 86 sources, 57 terms pages were fetched on 2026-10-12. 13 sources clear for rows: 11 in the lifespan set and 2 in the algorithms graph. 3 of the 13 had their terms fetched; the other 10 are US federal pages cleared by the federal works rule with terms unread, marked `clearance: rule, terms unread`, and each carries the exception that third-party material on the page is not cleared. 4 clear for codes and links, Wikipedia among them. 69 are refused or unknown and their rows are marked unpublishable. The USACO Guide, the Competitive Programmer's Handbook and MIT OpenCourseWare are non-commercial share-alike, so the core of the algorithms graph stays out of public sets. 66 interview rows and 17 lifespan records cite no page and are unpublishable; their four entries carry an empty `match`, since the registry resolves a row with no URL to unknown.

| Source of the world tables | Terms |
|---|---|
| UIS ISCED mappings | Unknown; files are offered for open download. Programme names are kept as names, at eight words or fewer |
| Cedefop NQF tool | EU reuse policy, source credited |
| World Bank indicators | CC BY 4.0 |
| ONS SOC 2020 | Open Government Licence v3.0 |
| ABS OSCA 2024, Stats NZ NOL | CC BY 4.0 |
| Statistics Canada NOC 2021 | Statistics Canada Open Licence |
| INSEE PCS 2020 | Licence Ouverte 2.0 |
| Japan JSCO | Government of Japan Standard Terms of Use 2.0 |
| KldB 2010, CBO 2002 | Unknown; codes alone |
| UNEVOC directory | Unknown; names of bodies and links |
| Natural Earth | Public domain |

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
| Outline of Cultural Materials, HRAF, and the Propaedia outline, Britannica | Category numbers and a link, in `activities.jsonl` and in the completeness frame | Copyright Human Relations Area Files | Numbers as facts. No HRAF label text is committed |
| Census, SOC and OEWS occupation series | Titles, codes and years in `occupation_history`, from bls.gov, onetcenter.org and the census.gov code lists | US federal work, public domain; O*NET rows under CC BY 4.0 | Copying and redistribution |
| IPUMS USA occupation crosswalks | Nothing. See Withheld Occupation Rows | Terms of IPUMS USA, which restrict redistribution | No row and no derived value is committed |
| Wikidata | Technology names and dates | CC0 | Any use |
| K-12 standards systems | Codes, grades, subjects and strand headings from 34 systems; labels from three | Head Start ELOF is a US federal work; the Australian Curriculum is CC BY 4.0, copyright ACARA, terms at https://www.australiancurriculum.edu.au/copyright-and-terms-of-use; England is OGL v3.0; the rest are unknown or restricted | Codes as facts. Labels only where the terms allow reuse with attribution |
| Resource providers | Title, link, level and the licence string each provider states | Varies per row, see `licence` | The row is a pointer. The linked work keeps its own terms |

### Withheld Occupation Rows

698 lifecycle rows for the 1950 to 1990 census lists were read from crosswalk files at usa.ipums.org. They await a rights ruling, are absent from `occupation_history.jsonl` since 2026-10-12, and remain in the research folder on disk. The 665 rows for the 2002, 2010 and 2018 lists come from census.gov files and stay, with every value that ran through those crosswalks removed: lineage codes before 2000, the first attested year before 2000, peak year, peak and last employment, status and the near-extinct flag. On these rows `era_from` is the earliest census list from 2000 on that carries the code and `era_to` is the year of the row's own list, both read from the census.gov files; the last attested year the research slice gave had no stated source and is gone. `occupation_row_cleared` in `build/facets.py` applies the rule at build time and the corpus tests hold the table to it.

Attribution lines. `tables/attributions.jsonl` holds the same lines keyed by table, licence, scheme, system, framework or host, so the app can show the line where a set is drawn. A test fails when a world row carries a licence that asks for credit and no line matches it.

- Australian Bureau of Statistics, OSCA, Occupation Standard Classification for Australia, 2024: Source: Australian Bureau of Statistics, OSCA - Occupation Standard Classification for Australia, 2024, licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Bucket Foundation selected and reformatted the data.
- Stats NZ, National Occupation List v1.0: This work includes Stats NZ's data, National Occupation List v1.0, which are licensed by Stats NZ for reuse under the Creative Commons Attribution 4.0 International licence (https://creativecommons.org/licenses/by/4.0/). Bucket Foundation selected and reformatted the data.
- Office for National Statistics, Standard Occupational Classification 2020 and its coding index: Source: Office for National Statistics, Standard Occupational Classification 2020. Contains public sector information licensed under the Open Government Licence v3.0 (https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/).
- Statistics Canada, National Occupational Classification (NOC) 2021 Version 1.0: Adapted from Statistics Canada, National Occupational Classification (NOC) 2021 Version 1.0, retrieved 2026-10-11. This does not constitute an endorsement by Statistics Canada of this product. Reproduced under the Statistics Canada Open Licence (https://www.statcan.gc.ca/en/reference/licence).
- Ministry of Internal Affairs and Communications, Japan, Japan Standard Occupational Classification, revision 5 of 2009: Source: Ministry of Internal Affairs and Communications, Japan Standard Occupational Classification (Rev. 5, 2009), https://www.soumu.go.jp/main_content/000587432.csv (accessed 2026-10-11), Government Standard Terms of Use 2.0. Bucket Foundation edited the content.
- INSEE, Professions et catégories socioprofessionnelles, PCS 2020, correspondence with ISCO-08: Source: INSEE, Professions et catégories socioprofessionnelles (PCS 2020), correspondence with ISCO-08, retrieved 2026-10-11, reused under the Licence Ouverte 2.0 (https://www.etalab.gouv.fr/licence-ouverte-open-licence/).
- World Bank, World Development Indicators, education series: Source: World Bank, World Development Indicators, licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Bucket Foundation selected and reformatted the data. Data source: UNESCO Institute for Statistics
- Cedefop, European Centre for the Development of Vocational Training, NQFs online tool and the European inventory of national qualifications frameworks: Source: Cedefop, NQFs online tool and European inventory of NQFs. Copyright Cedefop; reuse is authorised provided the source is acknowledged (https://www.cedefop.europa.eu/en/copyright). Bucket Foundation selected and reformatted the data.
- European Union: Cedefop and Eurydice, Cedefop country reports and Eurydice national education system pages: Source: Cedefop and Eurydice, European Union. Reuse is authorised under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/) provided the source is acknowledged. Bucket Foundation selected and reformatted the data.
- UK Government, GOV.UK guidance on qualification levels: Source: GOV.UK. Contains public sector information licensed under the Open Government Licence v3.0 (https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/).
- USDOL/ETA, O*NET 31.0 Database: This corpus includes information from the O*NET 31.0 Database (https://www.onetcenter.org/database.html) by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA), used under the CC BY 4.0 licence (https://creativecommons.org/licenses/by/4.0/). O*NET is a trademark of USDOL/ETA. Bucket Foundation has modified all or some of this information. USDOL/ETA has not approved, endorsed or tested these modifications.
- NGA Center and CCSSO, Common Core State Standards: Copyright 2010 National Governors Association Center for Best Practices and Council of Chief State School Officers. All rights reserved. Used under the public licence (https://www.thecorestandards.org/public-license/). The labels are Bucket's own wording and are no part of the standards.
- Wikimedia projects and their contributors, English Wikipedia, Wikibooks, Wikiversity: Names, dates and links come from pages of the Wikimedia projects and their contributors, under CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). Bucket selected and reformatted them, and these rows stay under CC BY-SA 4.0.
- OpenStax, Rice University, OpenStax book catalogue: Book records come from OpenStax (https://openstax.org/), Rice University, under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Bucket reformatted them. Each book's own licence is in its row.
- Department for Education, National curriculum in England: Contains public sector information licensed under the Open Government Licence v3.0 (https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/).
- ACARA, Australian Curriculum version 9: Copyright Australian Curriculum, Assessment and Reporting Authority (ACARA) 2010 to present, licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). ACARA does not endorse this product. Bucket selected and shortened the material.
- Wordbank, Frank et al., Wordbank: An open repository for developmental vocabulary data: Source: Wordbank, Frank et al., Wordbank: An open repository for developmental vocabulary data, https://langcog.github.io/wordbank-datapage/, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Bucket Foundation selected and reformatted the data.
- Yangshun Tay, Tech Interview Handbook: Copyright (c) 2017-Present Yangshun Tay. MIT License, https://github.com/yangshun/tech-interview-handbook/blob/main/LICENSE.
- Centers for Disease Control and Prevention, Learn the Signs. Act Early. milestone material: Source: Centers for Disease Control and Prevention. Bucket Foundation selected and shortened the content. CDC has not endorsed this product.
- US Office of Personnel Management, structured interviews guidance, US Office of Personnel Management, structured interviews guidance: Source: US Office of Personnel Management, structured interviews guidance, a work of the US federal government. Bucket Foundation selected and shortened the content. The agency has not endorsed this product.
- Consumer Financial Protection Bureau, youth financial education, Consumer Financial Protection Bureau, youth financial education: Source: Consumer Financial Protection Bureau, youth financial education, a work of the US federal government. Bucket Foundation selected and shortened the content. The agency has not endorsed this product.
- National Institute on Deafness and Other Communication Disorders, National Institute on Deafness and Other Communication Disorders: Source: National Institute on Deafness and Other Communication Disorders, a work of the US federal government. Bucket Foundation selected and shortened the content. The agency has not endorsed this product.
- National Early Literacy Panel summary, National Institute for Literacy, National Early Literacy Panel summary, National Institute for Literacy: Source: National Early Literacy Panel summary, National Institute for Literacy, a work of the US federal government. Bucket Foundation selected and shortened the content. The agency has not endorsed this product.
- Head Start Early Learning Outcomes Framework, Office of Head Start, Head Start Early Learning Outcomes Framework, Office of Head Start: Source: Head Start Early Learning Outcomes Framework, Office of Head Start, a work of the US federal government. Bucket Foundation selected and shortened the content. The agency has not endorsed this product.
- consumer.gov, Federal Trade Commission, consumer.gov, Federal Trade Commission: Source: consumer.gov, Federal Trade Commission, a work of the US federal government. Bucket Foundation selected and shortened the content. The agency has not endorsed this product.
- US Citizenship and Immigration Services, naturalization study materials, US Citizenship and Immigration Services, naturalization study materials: Source: US Citizenship and Immigration Services, naturalization study materials, a work of the US federal government. Bucket Foundation selected and shortened the content. The agency has not endorsed this product.
- US Department of Labor, Employee Benefits Security Administration, US Department of Labor, Employee Benefits Security Administration: Source: US Department of Labor, Employee Benefits Security Administration, a work of the US federal government. Bucket Foundation selected and shortened the content. The agency has not endorsed this product.
- National Institute on Aging, National Institute on Aging: Source: National Institute on Aging, a work of the US federal government. Bucket Foundation selected and shortened the content. The agency has not endorsed this product.
- US Social Security Administration, US Social Security Administration: Source: US Social Security Administration, a work of the US federal government. Bucket Foundation selected and shortened the content. The agency has not endorsed this product.

The wording of nine lines was checked against the licence page: ONS, GOV.UK, the national curriculum in England, Statistics Canada, Japan, the World Bank, Wordbank, the Tech Interview Handbook and CDC. `terms_read` is true on those. The wording of the rest is unverified and `terms_read` is false: Stats NZ, ABS, INSEE, Cedefop and Eurydice, O*NET, OpenStax, ACARA, Common Core, Wikimedia, and the ten federal sources cleared by rule.

The compilation is CC BY 4.0. Rows drawn from Wikimedia pages are share-alike: they keep CC BY-SA 4.0 and any set that includes them carries that licence for those rows. In `source_licences.jsonl` a share-alike source is held as codes and links.

Rows whose source terms are unknown, the UIS mappings and the UNEVOC directory among them, are kept and labelled `licence: unknown`. The Explore licence registry resolves such rows to unknown and shows none of them publicly.

Raw pages, the backbone raw folder and the sqlite files stay on the build machine.

## Coverage

373 of 457 four-digit CIP families in use hold a row, a program, a book or a resource, and 84 hold nothing. Four further codes hold items and sit outside the 457 because CIP 2020 moved or deleted them: 45.14, 51.24, 51.25 and 60.06. 75 of 98 SOC minor groups hold an occupation row, and 96 are reached once the crosswalk carries programs, books and resources across. `COVERAGE.md` lists every family.

## Completeness

`completeness/frame.jsonl` is the frame an independent critic wrote on 2026-10-11: 441 cells. `build/completeness.py` recounts the cells from the tables and writes `COMPLETENESS.md`. OCM and Propaedia cells carry their code and a link, with the category name withheld.

| Dimension | Cells | Held | Thin | Ten or more | Empty | Held by facet field |
|---|---|---|---|---|---|---|
| Independent critic verdict | 441 | 3.1 of 10, fail | | | | |
| Life stage | 8 | 8 | 0 | 8 | 0 | 8, 1 thin |
| Purpose | 9 | 7 | 0 | 7 | 2 | 8 |
| Life stage by purpose | 72 | 33 | 15 | 18 | 39 | no field |
| Kind of knowing | 7 | 2 | 0 | 2 | 5 | 7 |
| Mode of transmission | 9 | 3 | 0 | 3 | 6 | 9, 1 thin |
| Geography | 30 | 29 | 1 | 28 | 1 | 30, 1 thin |
| Language | 30 | 25 | 11 | 14 | 5 | 3, 2 thin |
| Era | 7 | 7 | 0 | 7 | 0 | 6, 3 thin |
| Domain | 193 | 193 | 5 | 188 | 0 | no field |
| Feared absences | 33 | 33 | 0 | 33 | 0 | no field |
| ISCO-08 sub-major groups | 43 | 29 | 27 | 2 | 14 | no field |

The world slice moved Geography from 17 held cells, 10 of them thin, to 29 held, 1 thin; by facet field from 12 to 30. One of the 30 largest countries still matches no verified row under the critic rule. Language is unchanged at 25 held and 11 thin, 3 by field: world rows describe other systems in English. `COMPLETENESS.md` lists each cell before and after.

Held means one or more rows with `verified` true match the cell's keyword or code rule. Thin means one to nine. `page_fetched` rows count as unverified. Held says nothing of depth: the critic read 54 verified infancy rows and kept none, and scored Domain 5.0 at 98% held. The verdict in the first row stands until a critic reads the rows again.

The frame records no keyword list for 20 purpose, kind and mode cells, so their critic rule runs on its CIP half or stays unscored, and the facet fields score them instead. On the tables the first review read, the scorer lands within tolerance on 351 of the 365 cells it can score. Technologies, occupation history and activities sit outside every count, so no dropped or unverified technology row holds an era cell.

## Build and Test

```bash
python3 -I build/consolidate.py <slices-folder> <full-output> <public-output>
python3 -I build/world.py <slices-folder> learning/corpus/progressions/tables
python3 -I build/coverage.py
python3 -I build/completeness.py
python3 -m unittest learning/corpus/progressions/tests/test_progressions_corpus.py
```

`consolidate.py` needs the slice folders, the backbone sqlite file and the catalogue parser, which stay off the repo. It writes a full copy for local use and the public copy committed here. `coverage.py`, `completeness.py` and the tests run on the committed tables and need the `zstd` command. The build streams the resources and K-12 standards files row by row and peaked at 297 MB; the scorer peaked at 16 MB, the coverage report at 43 MB and the tests at 1.3 GB. The 55 tests check unique ids, the absence of IPUMS-sourced occupation rows and values, edge endpoints, cycles, URLs on flagged rows, the nine-level scale, CIP and SOC codes against the backbone, the two flags, the facet rules, the text limit per field, and the absence of catalogue sentences, standards text, email addresses, home paths, Dewey text and SFIA wording.

## Open Items

- The stated flag outside the catalogues and the school slice rests on a wording rule. Nobody checked the edges one by one.
- The parser scored 81% full match on its held-out Iowa State, Illinois and Iowa sentences and was never scored on Kent State or Old Dominion. 79 of those sentences mix and with or without parentheses.
- 27,553 resources, 24,864 progression rows, 504 courses in service units and 246 program rows have no CIP code. 24,127 of those progression rows are K-12 career and technical standards, which span every field.
- Paraphrased topic summaries of exam outlines and accreditor standards remain in progression rows. They are agent wording, and a rights review of them is still open.
- The K-12 slice repeats Common Core rows that the school slice already holds. The two sets are unlinked.
- `verified` on K-12 rows comes from the slice's script. The 1,359 progression rows cleared by the notes rule are all from hand-researched slices.
- The Texas standards are state rules and may be free to quote; their labels stay dropped until someone reads the terms. Strand headings of the 31 restricted systems remain and want the same review.
- Facet rules cover what a label, a level or a code can decide. 97% of progression rows have no `kind`, and no row has a stated language.
