# Problem Sources

Where open and solved problems can be sourced, with count, status coverage, licence and access per source. Counts and licences were checked by fetching each page on 2026-10-05; "unverified" marks the ones the fetch could not confirm. Verdicts: ingest (rows go into `problems-sourced.tsv`), metadata only (name, url, count kept here, rows deferred), skip.

## Mathematics

| Source | URL | Count | Status recorded | Licence | Access | Verdict |
|---|---|---|---|---|---|---|
| formal-conjectures (DeepMind) | https://github.com/google-deepmind/formal-conjectures | 3,598 statements in `_intake/solver-gap-engine/problem_map.jsonl` (2,196 solved, 1,403 open; 2,062 Erdős, 496 Wikipedia, 319 OEIS, 230 Green, 147 papers) | yes, plus Lean proof flag | Apache-2.0 | git, Lean, local jsonl | ingest |
| Erdős Problems | https://www.erdosproblems.com | 1,221 problems | yes, FAQ says not fully current | none stated | HTML, no API found | metadata only; statements reach the atlas through formal-conjectures |
| Open Problem Garden | http://www.openproblemgarden.org | about 613 (algebra 297, graph theory 228, number theory 49, topology 40, combinatorics 35) | open only, solved ones marked | GFDL | HTML | metadata only; names could be ingested as facts with attribution |
| Wikipedia, unsolved problems in mathematics | https://en.wikipedia.org/wiki/List_of_unsolved_problems_in_mathematics | 644 bullets, 63 sections, "Problems solved since 2015" section | yes | CC BY-SA 4.0 | MediaWiki API | ingest facts, cite page |
| Hilbert's problems | https://en.wikipedia.org/wiki/Hilbert%27s_problems | 23 plus the 24th, table with status and year | yes | CC BY-SA 4.0 | MediaWiki API | ingest |
| Smale's problems | https://en.wikipedia.org/wiki/Smale%27s_problems | 18, table with status and year | yes | CC BY-SA 4.0 | MediaWiki API | ingest |
| Millennium Prize Problems | https://www.claymath.org/millennium-problems/ | 7 (1 solved) | yes | Clay copyright; facts via Wikipedia page | HTML | ingest via Wikipedia |
| Kourovka Notebook | https://arxiv.org/abs/1401.0300 | unverified (20th edition, over 1,000 group theory problems by reputation) | yes, solved ones annotated | arXiv non-exclusive distribution | PDF | metadata only |
| MathOverflow `open-problems` tag | https://mathoverflow.net/questions/tagged/open-problems | 610 questions (Stack Exchange API) | no | CC BY-SA 4.0 | Stack Exchange API | metadata only; questions are not a curated list |
| PolyMath wiki | https://michaelnielsen.org/polymath1/ | unverified (fetch returned an empty page; about 16 projects by reputation) | yes | unverified | HTML | metadata only |
| Wikipedia, statistics | https://en.wikipedia.org/wiki/List_of_unsolved_problems_in_statistics | 11 bullets | no | CC BY-SA 4.0 | MediaWiki API | ingest facts |

## Sciences

| Source | URL | Count | Status recorded | Licence | Access | Verdict |
|---|---|---|---|---|---|---|
| Wikipedia, physics | https://en.wikipedia.org/wiki/List_of_unsolved_problems_in_physics | 146 bullets, "Problems solved in the past 30 years" section | yes | CC BY-SA 4.0 | MediaWiki API | ingest facts |
| Wikipedia, astronomy | https://en.wikipedia.org/wiki/List_of_unsolved_problems_in_astronomy | 122 bullets | no | CC BY-SA 4.0 | MediaWiki API | ingest facts |
| Wikipedia, biology | https://en.wikipedia.org/wiki/List_of_unsolved_problems_in_biology | 105 bullets | no | CC BY-SA 4.0 | MediaWiki API | ingest facts |
| Wikipedia, neuroscience | https://en.wikipedia.org/wiki/List_of_unsolved_problems_in_neuroscience | 79 bullets | no | CC BY-SA 4.0 | MediaWiki API | ingest facts |
| Wikipedia, computer science | https://en.wikipedia.org/wiki/List_of_unsolved_problems_in_computer_science | 59 bullets | no | CC BY-SA 4.0 | MediaWiki API | ingest facts |
| Wikipedia, chemistry | https://en.wikipedia.org/wiki/List_of_unsolved_problems_in_chemistry | 46 bullets | no | CC BY-SA 4.0 | MediaWiki API | ingest facts |
| Wikipedia, economics | https://en.wikipedia.org/wiki/List_of_unsolved_problems_in_economics | 20 bullets | no | CC BY-SA 4.0 | MediaWiki API | ingest facts |
| Wikipedia, geoscience | https://en.wikipedia.org/wiki/List_of_unsolved_problems_in_geoscience | 17 bullets | no | CC BY-SA 4.0 | MediaWiki API | ingest facts |
| Wikipedia, information theory | https://en.wikipedia.org/wiki/List_of_unsolved_problems_in_information_theory | 12 bullets | no | CC BY-SA 4.0 | MediaWiki API | ingest facts |
| Wikipedia, medicine | https://en.wikipedia.org/wiki/Unsolved_problems_in_medicine | 3 bullets | no | CC BY-SA 4.0 | MediaWiki API | skip, too thin |
| Wikipedia, linguistics, materials, engineering | n/a | no such pages (API returns `missingtitle`) | n/a | n/a | n/a | skip |
| ClinicalTrials.gov | https://clinicaltrials.gov/api/v2 | 605,819 studies | trial status only | US public domain | REST API v2 | skip for rows; a later pass can mine unmet-need language from conditions |
| FDA unmet medical need designations | https://www.fda.gov | unverified (page moved, 404) | n/a | US public domain | HTML | skip until a stable list is found |
| NIH-wide strategic plan | https://www.nih.gov/about-nih/nih-wide-strategic-plan | priorities, no problem count | no | US public domain | HTML, PDF | skip; the page lists funding priorities |
| NSF focus areas | https://www.nsf.gov/focus-areas | priorities, no problem count | no | US public domain | HTML | skip; the page lists funding priorities |
| PhysioNet challenges | https://physionet.org/challenge/ | unverified (annual since 2000; page lists by year) | yes, scored bar per challenge | ODC-BY per dataset, varies | HTML, data downloads | metadata only |
| Papers with Code SOTA | https://paperswithcode.com/sota | unverified (page fetched, counts not parsed) | leaderboard, no solved bar | CC BY-SA | HTML, JSON API | skip; no defined solved bar |
| ImageNet style benchmarks | https://www.image-net.org | one benchmark, bar set by papers | leaderboard | custom terms | download with registration | metadata only |

## Industry and prizes

| Source | URL | Count | Status recorded | Licence | Access | Verdict |
|---|---|---|---|---|---|---|
| DARPA challenges | https://www.darpa.mil/research/challenges | 4 listed (Triage, Lift, Surgical, D2 Sprint); historic grand-challenge page 404 | no | US public domain | HTML | metadata only |
| XPRIZE | https://www.xprize.org/prizes | 6 (4 active, 2 awarded) | yes | all rights reserved | HTML | metadata only |
| NAE grand challenges | https://www.engineeringchallenges.org | unverified (14 by reputation; host refused connection) | no | unverified | HTML | metadata only |
| Longitude Prize | https://longitudeprize.org | 3 (AMR, Dementia, ALS) | yes | unverified | HTML | metadata only |
| Kaggle competitions | https://www.kaggle.com/competitions | unverified (API needs a key, 401) | yes, scored | per-competition rules | REST API with key | skip |
| DrivenData competitions | https://www.drivendata.org/competitions/ | 53 competition links on the index | yes, scored | per-competition terms | HTML | metadata only |
| DOE Energy Earthshots | https://www.energy.gov/energy-earthshots | unverified (8 by reputation; page fetched, names not parsed) | targets with year | US public domain | HTML | metadata only |
| IEA Net Zero Roadmap | https://www.iea.org/reports/net-zero-roadmap-a-global-pathway-to-keep-the-15-0c-goal-in-reach | unverified (403) | milestones | IEA terms, CC BY 4.0 for some data | HTML, PDF | skip |
| IRDS semiconductor roadmap | https://irds.ieee.org/editions | editions 2016 to 2026, each with chapters of "difficult challenges" | no | IEEE copyright | PDF | metadata only |
| Battery and aviation roadmaps | Battery 2030+, ICAO, ATI | unverified | no | varies | PDF | metadata only |

## Ingest rules

- Rows live in `problems-sourced.tsv` with the `problems.tsv` columns plus `status`, `source` and `licence`. `sources/build.py` rebuilds it from `sources/formal_conjectures.py`, `sources/wikipedia_lists.py` and `sources/named_lists.py`, dedupes by normalised title against `problems.tsv`, and `tests/test_sourced.py` checks the file.
- CC BY-SA pages: the row carries the problem name, status, year and five to eight keywords taken from the page's links, and cites the page in `source`. Statement text is not copied.
- Level rule: 5 for Hilbert, Smale and Millennium rows; 4 for a Wikipedia list entry whose name carries "conjecture", "hypothesis" or "problem"; 3 for other Wikipedia entries and top-level formal-conjectures statements; 2 for formal-conjectures variants.
- Branch rule: physics, chemistry, mathematics and statistics map to their canon branch; biology to biophysics; computer science and information theory to information; neuroscience to mind; astronomy to cosmology; geoscience to physics; economics to applied. Open quantum problems in formal-conjectures map to physics.
- Industries (`market`) are set per Wikipedia list, blank for formal-conjectures.

## First ingest, 2026-10-05

3,851 rows: formal-conjectures 2,843, Wikipedia field lists 1,008 (mathematics 524, physics 120, biology 93, astronomy 84, neuroscience 43, computer science 46, chemistry 21, economics 15, geoscience 10, statistics 9, information theory 7, Hilbert 23, Smale 13, Millennium 0 after dedupe against the 71). Branches: mathematics 3,409, physics 133, biophysics 93, cosmology 84, information 53, mind 43, chemistry 21, applied 15. Status: 1,868 solved, 1,983 open.

## Founder calls

- Open Problem Garden names under GFDL: ingest as facts with attribution, or keep metadata only.
- Erdős Problems has no stated licence; the 2,062 Apache rows in formal-conjectures cover most of it. Ask the maintainer before scraping the site itself.
- Industry roadmaps and prizes (IRDS, Earthshots, XPRIZE, NAE) need hand-curated rows; none has a machine-readable problem list.
