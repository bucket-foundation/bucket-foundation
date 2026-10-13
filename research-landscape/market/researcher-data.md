<!-- voice-ignore-file -->
# Researcher Data

Profiled 2026-10-11. Queries: `researcher-queries.sql`. Detail: `researcher-datasets.jsonl`.

## Datasets

| Dataset | Rows | Ids | Licence | Last built | Used for |
|---|---|---|---|---|---|
| OpenAlex authors wide, `.wt-atlas-openalex-wide` | 21,806,840 rows, 19,650,457 authors | OpenAlex, ORCID on 7,292,319 | CC0 | 2026-09-30 | Nothing yet, branch unmerged |
| research-atlas `person` | 1,438,636 | ORCID 804,248, OpenAlex 1,100,975 | CC-BY-4.0 | 2026-06-21 | Papers 01 to 04, atlas-api |
| research-atlas `researchers_public` | 1,165,557 | 1,110,114 with an id | CC-BY-4.0 | 2026-06-22 | Paper 04 |
| `grant_pi_person` | 528,570 edges, 59,180 people | ORCID or OpenAlex on 58,526 | CC-BY-4.0 | 2026-06-24 | Paper 04 |
| Faculty haul | 65,214 profiles, 92 universities | Name, ROR, URL | Institution copyright, link only | 2026-10-01 | 652 Stevens rows in advisor review |
| PhD cockpit, `biophysics-phd-review` | 152,996 faculty rows, 14,894 advisors, 3,870 ranked | OpenAlex | None, private repo | 2026-06-16 | Founder PhD search |
| Advisor review, `<local-share>` | 4,657 | OpenAlex 4,315, ORCID 3,958 | None, private | 2026-10-01 | Advisor fit page, bkt app |
| `graph.advisor_public`, local Supabase | 3,934 | OpenAlex, ORCID 3,622 | None stated | 2026-09-28 | Advisor match, local branch |
| Canon author and work folders | 402 authors, 344 coauthor edges, 69,353 fanout authors | OpenAlex | CC0 | 2026-10-05 | Coauthor matrix, citation graph |
| Solvability atlas people | 851 rows, 777 authors, 71 problems | OpenAlex | CC0 | 2026-10-06 | Frontier pages |
| Canon figures | 99 | Slug only | Bucket text | 2026-04-23 | Canon figure pages |
| CSrankings and DBLP dumps | 34,655 CS faculty; DBLP unparsed | ORCID 17,113 | CC BY-NC-ND; CC0 | 2026-09-29 | Nothing yet |

Education-atlas and the 80k corpus hold no researcher table.

## Headline Counts

- Distinct researchers with an ORCID or OpenAlex id, deduplicated across ten tables: **19,407,444**. 7,349,752 have an ORCID.
- Without the unmerged wide pull the total is **1,252,228**.
- Field: Medicine 4,861,520, Engineering 2,709,140, Biochemistry and Genetics 1,468,444, Social Sciences 1,418,861, Computer Science 1,108,462.
- Country: US 3,725,055, China 2,731,569, India 909,029, Germany 816,564, Japan 811,325, Brazil 798,608, UK 771,624. 226 countries.
- Grant linked: **58,495**, 0.3% of the total. 50,525 are in the US.
- Advisor or advisee link: **0**. No dataset stores a pair.
- Career path with two or more dated institutions: **14,006,094**, all from the wide pull. A position is an institution plus publication years. No job titles exist.

## Thin Coverage

- Smallest fields: Veterinary 45,360, Chemical Engineering 72,082, Pharmacology 86,138, Nursing 105,041.
- Outside the wide pull: Arts and Humanities 5,548, Mathematics 6,469.
- 72 countries hold under 1,000 people each and 18 hold under 100.
- Grant links cover NIH, NSF, Wellcome, Sloan and DFG. UKRI, CORDIS, Gates and CZI grants carry no person rows.
- The faculty haul finished 55 of 321 US universities and reported the same 65,214 profiles on its last three runs.

## What the Data Supports Today

- **Who works on what problem.** Topics for 19.4M authors; 777 authors tied to 71 open problems.
- **Funding by field.** 1,670,434 grants; PI links for 58,495 people.
- **Advisor match.** 3,934 scored advisors, 59% in one field. The score is unvalidated against advising outcomes.
- **Career path examples.** Institution-by-year histories for 14.0M authors.

It cannot support advisor lineage, degree or job-title histories, careers outside academia, or funding links outside the US and UK.

## Rights and Privacy

**May ship in the app:** facts from CC0 sources (OpenAlex, ORCID public data) and public grant records, published in atlas tables under CC-BY-4.0 with attribution. Every person view needs the opt-out path; `graph.advisor_optouts` holds 0 rows.

**May show on the site:** aggregates, the four published papers, canon figures, and solvability people already on public pages. Faculty haul records may appear as links to official profile pages.

**Stays private:** every email (35,921 haul, 750 atlas, 745 advisor review, 37 cockpit), cockpit reply and fit scores, tracker notes, the 128-person network file, the personal profile. CSrankings rows stay local because the licence bars derivatives. Four cockpit emails are pattern guesses, which the atlas policy forbids.

Many of these people are in the EU. The atlas policy relies on legitimate interest and states that it carries no legal weight.

## Next Collection Steps

1. Merge the wide authors pull into the atlas database with one row per author. It carries 2,156,383 duplicate rows.
2. Load advisor and advisee pairs from Academic Tree and thesis records.
3. Add person edges for UKRI and CORDIS grants and re-run PI resolution against the wide pull. 59,180 of 275,692 funder-side investigators are resolved.
4. Load ORCID public employment and education records for dated titles and degrees.
5. Restart the faculty haul and resolve its rows to OpenAlex ids. Exact name plus ROR matching finds 10.3%.
