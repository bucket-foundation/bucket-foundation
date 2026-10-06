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

## Solved problems outside mathematics

Second ingest, 2026-10-05. Curated rows in `sources/solved/<branch>.tsv`, loaded by `sources/solved_discoveries.py` with ids `sd-<slug>`. Each row is one question the field asked and later answered, with the year the source gives for the answer. `python3 sources/solved_discoveries.py --verify` fetched all 163 source pages and confirmed that the resolved year and one anchor term from the name or keywords appear on each page: 821 rows, 0 failures. `--append` adds the rows to `problems-sourced.tsv` after dedupe by normalised title; `sources/build.py` includes them on a full rebuild.

Selection rule: a row needs a statement that was an open question before the resolution year, a resolution the source page states with a year, one https source url, a licence from the allowed set in `solved_discoveries.LICENCES`, and a `status_source` naming the page and the entry or citation. `posed` is filled only when the page states the year the question was raised (26 rows). Discovery reports ("X was found in 1998") are rewritten as the question they closed ("Does the neutrino have mass?"). Prize citations are quoted in at most twelve words with the url; the prize year stands as `resolved`. Rows whose year the page did not carry were dropped (20 mind candidates). Within the ingest, a title that appears in two branch files keeps the science branch and the applied copy is removed.

| Branch | Solved before | Added | Solved after | Sources with rows |
|---|---|---|---|---|
| physics | 20 | 107 | 127 | Timeline of particle discoveries 29, thermodynamics 20, quantum mechanics 19, atomic and subatomic physics 17, electromagnetism and classical optics 14, gravitational physics and relativity 6, Solar System astronomy 1, cosmological theories 1 |
| chemistry | 0 | 110 | 110 | Timeline of chemistry 79, biology and organic chemistry 10, chemical element discoveries 9, materials technology 8, hydrogen technologies 4 |
| biophysics | 0 | 110 | 110 | Timeline of biology and organic chemistry 71, biotechnology 12, human vaccines 12, immunology 12, antibiotics 3 |
| cosmology | 0 | 110 | 110 | Timeline of Solar System astronomy 42, galaxies and large-scale structure 17, cosmological theories 17, black hole physics 16, white dwarfs, neutron stars and supernovae 11, Solar System planets and moons 6, gravitational physics 1 |
| mind | 0 | 116 | 116 | nobelprize.org medicine and economics summaries 23, kavliprize.org neuroscience 9, 84 Wikipedia topic pages one row each (Broca's area, Hodgkin-Huxley model, Place cell, Long-term potentiation, Prospect theory and so on) |
| information | 0 | 126 | 126 | Timeline of algorithms 33, Gödel Prize 27, information theory 21, artificial intelligence 20, cryptography 11, Solved game 2, 12 topic pages one row each (Halting problem, Entscheidungsproblem, Cook-Levin theorem, Graph isomorphism problem, Zero-knowledge proof and so on) |
| applied | 0 | 137 | 137 | Timeline of medicine and medical technology 47, Nobel economics laureate list 22, transportation technology 16, materials technology 13, human vaccines 10, low-temperature technology 8, antibiotics 7, XPRIZE 6, hydrogen technologies 5, Longitude rewards 2, nuclear fusion 1 |

Licences: 784 rows CC BY-SA 4.0 (Wikipedia), 23 rows Nobel Prize Outreach AB with the citation quoted briefly, 9 rows Kavli Foundation with the citation quoted briefly. Every row is `form=question`. Shortfalls: none, every branch holds at least 100 top-level solved rows. Sources named in the bead and not used for rows: Breakthrough Prize, Crafoord Prize, XPRIZE and Longitude Prize sites (the Wikipedia pages stood in), formal-conjectures proved rows outside number theory (none map outside mathematics). Weak spots a curator should read: the 6 cosmology rows from the planets and moons table name only the moon and discoverer; mind and information `status_source` text for Wikipedia pages is a paraphrase of the page entry.

## Ingest rules

- Rows live in `problems-sourced.tsv` with the `problems.tsv` columns plus `form`, `variant_of`, `status`, `source`, `licence`, `statement`, `statement_source` and `status_source`. `sources/build.py` rebuilds it from `sources/formal_conjectures.py`, `sources/wikipedia_lists.py` and `sources/named_lists.py`, merges Erdős aliases, dedupes by normalised title against `problems.tsv` and within the file, and `tests/test_sourced.py` checks the file.
- `statement` holds the full problem text: the `text` field of `problem_map.jsonl` for formal-conjectures (the Lean declaration from `_intake/solver-gap-engine/fc/` when `text` is empty, 10 rows), the full list item for Wikipedia pages, the explanation cell for Hilbert and Smale. `statement_source` names the file or page it came from.
- Names: a bold or linked head before a colon when the page gives one, else the item's first sentence up to 140 characters, cut only at a sentence end. Formal-conjectures names are the family and number plus the declaration's own suffix, so `green_14_lower_bound_hunter` becomes "Green open problem 14, lower bound hunter".
- Status is `open`, `partial` or `solved`, and `status=solved` must be read with `form`: a solved variant is a settled sub-case or lemma, so solved counts are reported for top-level rows and for variants as two numbers. formal-conjectures rows carry the status field of `problem_map.jsonl`. Wikipedia list rows carry the section heading they sit under. Hilbert and Smale rows read the table's status column: a `{{partial}}` cell, or any cell with "no consensus", "disputed", "weaker form" or "partially", is `partial`; a `{{yes}}` cell with a year is `solved`; everything else is `open`. Curator overrides, named in `status_source`: Hilbert 14 (resolved only as a counterexample in degree 3 and above), Hilbert 18 (three parts, settled at different times), Smale 14 (computer-assisted proof), Smale 17 (resolved in the average-case probabilistic form only) are `partial`; Smale 8 is `open`, since the cited 2013 extension does not settle the question.
- `form` is `conjecture` (name carries "conjecture" or "hypothesis"), `question` (name or statement is a question), `variant` (a formal-conjectures declaration with a suffix, such as `erdos_1047.variants.goodman` or `green_22_lower_nine`) or `problem`. `level` is empty for every sourced row; the earlier string-match guess is gone and level stays a curator call.
- `variant_of` holds the id of the top-level declaration in the same Lean file. When a file has only suffixed declarations, its first one stands as the top-level row. When the parent was deduped into one of the 71 atlas problems, `variant_of` carries that atlas id (`poincare` for the three Poincaré smooth cases).
- Keywords: up to eight phrases that occur in the statement: page links first, then noun pairs that occur at least twice in the statement, after dropping English, German and French stopwords, verbs and adverbs by suffix, LaTeX, URLs, citation keys and author name pairs. A single word survives only when it appears in the problem name or is a capitalised page-link anchor; multi-word noun phrases stay. A row with nothing left keeps an empty cell. On a fresh sample of 20 rows with keywords (seed 31), 1 row carried a generic phrase ("regular local"); 818 of 4,596 rows have keywords, most formal-conjectures rows have none.
- Years: `posed` and `resolved` come from the text only: "posed in 1900", "(1916 to 2016)" with a dash, "(Name, 2017)", "proved in 2004", or the Hilbert and Smale year column. Empty otherwise.
- Erdős aliases: ten Wikipedia entries name an Erdős problem that formal-conjectures also holds (Faber-Lovász 19, Gyárfás 136, Hajnal 61, arithmetic progressions 3, Turán additive bases 40, Moser, sumset 109, discrepancy 67, Burr-Erdős 163, unit distance 90), matched by the file header in `_intake/solver-gap-engine/fc/`. Each pair is one row with both urls in `source`, both licences in `licence` and both labels in `status_source`. Oler, Ulam, Straus and Mollin-Walsh have no formal-conjectures file and stay Wikipedia rows.
- Branch rule: physics, chemistry, mathematics and statistics map to their canon branch; biology to biophysics; computer science and information theory to information; neuroscience to mind; astronomy to cosmology; geoscience to physics; economics to applied. Open quantum problems in formal-conjectures map to physics.
- Industries (`market`) are set per Wikipedia list, blank for formal-conjectures.

## Licence

The 1,029 Wikipedia rows are CC BY-SA 4.0 and the 3,557 formal-conjectures rows are Apache-2.0; the 10 merged Erdős rows carry both. The `licence` column separates them, so `licence == "Apache-2.0"` yields a permissive subset. Any derived file that carries the CC BY-SA statements (embeddings are fine, copied statement text is not) inherits share-alike and must cite the page in `source`.

## First ingest, 2026-10-05

4,596 rows, every one with a statement; 104 with `posed`, 99 with `resolved`. Top-level rows 2,402: 1,672 open, 10 partial, 720 solved. Variants 2,194: 659 open, 1,535 solved. formal-conjectures keeps 3,567 of 3,598 (3,557 plus the 10 merged): 31 dropped because they share a normalised title with another row (five declaration pairs such as `erdos_897.parts.i` twice, Beck-Fiala and Green 24 duplicates, and statements whose name matches one of the 71 atlas problems or a Wikipedia entry). Wikipedia 1,039 before the merge: mathematics 534, physics 121, biology 96, astronomy 81, computer science 49, neuroscience 47, chemistry 27, Hilbert 23, geoscience 16, economics 15, Smale 13, statistics 9, information theory 7, Millennium 0 after dedupe against the 71.

Branch skew: mathematics holds 4,088 of 4,596 rows (89%), physics 186, biophysics 96, cosmology 81, information 56, mind 47, chemistry 27, applied 15. Outside mathematics the file has 508 rows; a balanced atlas needs the industry and science sources above to move from metadata only to ingest.

## Founder calls

- Open Problem Garden names under GFDL: ingest as facts with attribution, or keep metadata only.
- Erdős Problems has no stated licence; the 2,062 Apache rows in formal-conjectures cover most of it. Ask the maintainer before scraping the site itself.
- Industry roadmaps and prizes (IRDS, Earthshots, XPRIZE, NAE) need hand-curated rows; none has a machine-readable problem list.
