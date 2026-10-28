# Advisor Recommendation Engine

Bead bkt-l28u. Architecture plan, no code. Revision 3, written 2026-10-12. Round 2 passed at 8.23, and this revision folds in its seven medium findings. Code read at `origin/dev` `539c4d00`. Store counts measured on 2026-10-12 with the queries printed below. Every count is an aggregate. No person, address or id from the store appears here. This plan is an engineering document. It is no substitute for legal advice, and every legal item is marked for the founder or for counsel.

Status on 2026-10-22: slices 0 and 1 merged to `dev` in #789. Governance drafts sit in `docs/advisors/`, the founder-only tool in `tools/advisor-engine/`. Slice 2, the retrieval test, waits on an OpenAlex key. PR #366 stays open as the base for slice 7.

## Outcome

A student describes what they want to study and gets a ranked list of possible advisors, each with the reasons for the rank, a statement of what the engine does not know, and a statement of how well the list covers the student's own country and field. The student writes to the advisor themselves. Bucket sends no mail.

## Changes Since Round 1

Round 1 findings carry H, M and Q. Round 2 findings carry N.

| Finding | Change |
|---|---|
| H1 pool overstated | Recounted with the SQL under Rankable Pool: 71,683 advisor records, 69,829 distinct people, 62,823 after the recency gate. Broken down by link source, country and field. The cost of leaving out medium matches is stated: 40,098 people, 38,562 of them in France. |
| H2 removal closure | Removal now acts on the whole identity cluster across `person_match`, `person_merge`, `person_xid` and shared ids, returns one of four outcomes, and has a correction path and an audit log. |
| H3 validation target | The query comes from the student's work dated before the pairing. 6,395 pairs have such work under a measured proxy. Every feature is evaluated as of the pairing year. Six baselines, four strata, a human check, and a plain statement of what recall shows. |
| H4 counsel gate late | New slice 0 before any build: purpose, lawful-basis assessment, impact assessment outline, notice, retention, counsel checklist. Founder and counsel items are marked. |
| H5 slice 6 infeasible | Checked against `job-specs.ts`, `pysrc.ts`, `contract.ts` and `Advisors.tsx`. The view change moves to slice 1. Slice 6 splits into an export slice and a desktop job slice with its own job spec, a size budget and one dependency. Tier 1 stays off the student's machine. |
| H6 coverage undisclosed | An on-screen coverage statement, driven by `coverage.json`, with thresholds and three worked examples from measured counts. |
| M1 no error estimate for direct and high | Identity audit of 500 records across three strata in slice 1. |
| M2 reveal purpose | The reveal serves one applicant writing one message. It needs identity at own or high. Whether students get it is the founder's open decision. |
| M3 CSrankings in features | The feature build reads no CSrankings-derived row. Measured: 0 pool people have CSrankings as first source. |
| M4 fetch arithmetic | Measured: the pool has 13,506,514 works, 106,489 page requests one author at a time. The full fetch is dropped for a grouped request per advisor. |
| M5 slice 7 parity | Slice 7 names the PR's own ranker and its stack on #359 and #357. |
| M6 terms unsourced | ORCID policy and the Academic Family Tree record were fetched on 2026-10-12. The ORCID wording is weaker than the plan said and is restated. |
| Q3 addresses for students | Reopened as the founder's decision with three options laid out. |
| N1 false test claim in slice 1 | Three display modes. Before a stratum's test passes, the list is labelled an untested order and shows no rank number, score or percentile and no claim of testing. |
| N2 warning keyed on pool size alone | The statement also keys on the share of identifiable advisors left out and prints the denominator. Under 50 candidates the tool shows the count and the reason with no order. |
| N3 global ship rule | The rule is applied per country by field. A stratum shows a ranking only when its own test passed. Free-text queries are named on screen as untested. |
| N4 inflated candidate set | The primary figure uses every rankable advisor in the field as of the cutoff. The sampled figure is reported beside it and decides nothing. |
| N5 human check | Five authors write four queries each. At least two raters who did not build the ranker rate every row, and agreement is reported. |
| N6 reversal without proof | A restore must come through the channel that made the removal, or with proof of control of the identifier, and is logged. |
| N7 founder's own use of addresses | Added to the counsel list as its own item, and slice 5 waits for it. |
| Pool improvement | New section on the PubMed and OpenAlex same-paper join, the recount procedure and the French re-measurement. |

## Current State

| Thing | Where | Fact |
|---|---|---|
| Contact store | `~/.local/share/researcher-contacts/contacts.sqlite`, mode 0700, outside git | 21.8M people, 19.4M with an OpenAlex id, 1,844,996 advisor links, 460,552 distinct advisors |
| Identity | `person`, `person_match` with columns `method`, `confidence`, `name_count`, `field_agree` | Of 460,552 advisors: 34,348 carry their own OpenAlex id, 37,335 have a high match, 45,810 medium, 3,391 low, 339,668 none |
| Identity aliases | `person_merge`, `person_xid` | 417,379 merges by shared ORCID. Sixteen id schemes in `person_xid`. |
| Topics | wide parquet, column `topics` | A list of at most five topics per author, each with id, name and field. It carries no counts. 68,391 pool people have five. `person.topics` in the store keeps three. |
| Activity years | wide parquet, column `affiliations` | Each affiliation lists its years. 68,858 pool people have at least one year. |
| Link dates | `advisor_link.year` | Academic Family Tree stores the end of training. theses.fr stores the defence date. Wikidata stores none. Values run from 1502 to 2032. |
| Link kinds | `advisor_link.degree` | Academic Family Tree links include graduate students, postdocs, research scientists and undergraduate assistants. |
| Removal | `do_not_contact` and four triggers | 0 rows. The triggers delete and block `contact` and `page_contact` rows. They leave `person`, `person_match` and `advisor_link` rows in place. |
| Desktop import | `packages/bkt/src/advisor.ts`, `people.ts` | Routes `GET /local/advisor`, `POST /local/advisor/import`, `POST /local/advisor/forget`. `importReview` replaces the single stored review. `parseAdvisorReview` drops keys matching `email`, `tracker`, `image`, `id`, `statement` or `note`, scrubs addresses, and keeps the link keys `profile_url` and `program_url`. |
| People workspace | `packages/bkt-ui/src/views/Workspace.tsx` | Embeds `AdvisorsView` under the line "The people file you opened on this computer. It stays here, and Bucket ships no list of people." |
| Advisors view | `packages/bkt-ui/src/views/Advisors.tsx` | Renders a fixed fact list: institution, department, field, country, h_index, works_count, funding, taking_students, research_areas, shared_terms. It ignores every other key in `fields` and never renders the review `summary`. |
| Desktop job | `packages/bkt/src/job-specs.ts` | `fit-me` caps the people file at 64 MB, needs numpy, scipy, sklearn and matplotlib, and runs `prime_directions fit-me`, a TF-IDF and SVD fit. Jobs run under an 8 GB address cap. |
| Python bundling | `packages/bkt/src/pack/pysrc.ts` | Bundles `tools/helix` and `tools/prime-directions` into `content/pysrc.json`. |
| Row sets | `packages/bkt/src/pack/row-sets/contract.ts` | A set is capped at 768 KB. Too small for an advisor index, so the index does not use it. |
| PR #366 | branch `feat/ros-advisor-match`, open against `dev`, stacked on #359 and #357 | A whitened cosine over 64 components of a 1,230-term space on 3,934 profiles, a public remove-advisor page, an opt-out table with 0 rows. Absent from `origin/dev`. GitHub was unreachable during this revision, so the state of #359 and #357 is unverified. |
| Machine | founder workstation | 16 cores, no GPU, 32 GB free on `/home`, every job under `~/bin/memrun` with a 4 GB cap |

## Rankable Pool

The rule: an advisor is rankable when the advisor's own row has an OpenAlex id, or when `person_match.confidence` is `high` and the matched row has one.

```sql
create temp table pool as
with a as (select advisor_id id from advisor_link group by 1)
select a.id aid,
  case when p.openalex_id is not null then 'own' else coalesce(m.confidence,'none') end tier,
  case when p.openalex_id is not null then p.id when q.openalex_id is not null then q.id end rid
from a join person p on p.id=a.id
left join person_match m on m.person_id=a.id
left join person q on q.id=m.match_id;
select count(*), count(distinct rid) from pool where tier in ('own','high') and rid is not null;
```

Result: 71,683 advisor records, 15.6% of 460,552, resolving to 69,829 distinct people. The round 1 figure of 120,884 counted medium and low matches and was wrong.

A second gate uses the parquet years: the person has an affiliation year of 2018 or later. 62,823 pass. 6,035 fail and 971 have no year. The 62,823 are the pool a student is ranked against, 13.6% of recorded advisors.

### By Link Source

| Source | Advisors | In pool | Share | Medium, left out |
|---|---|---|---|---|
| Academic Family Tree | 220,968 | 38,203 | 17.3% | 510 |
| theses.fr | 120,632 | 536 | 0.4% | 44,119 |
| Wikidata | 111,804 | 31,650 | 28.3% | 0 |
| OAI, three universities | 7,378 | 1,514 | 20.5% | 1,181 |

theses.fr is 30% of all links and gives the pool 536 advisors. French directors reach the pool through the other sources.

### By Country

Gated pool, 62,823 people across 145 country codes. 71 countries have under 10 people and 107 have under 100.

| Country | In pool | Country | In pool |
|---|---|---|---|
| US | 29,014 | BR | 630 |
| FR | 7,387 | IN | 517 |
| GB | 3,707 | JP | 341 |
| CA | 2,906 | MX | 141 |
| NZ | 2,841 | ZA | 127 |
| PL | 2,611 | IR | 108 |
| DE | 1,935 | TR | 108 |
| AU | 1,177 | ID | 31 |
| ES | 1,152 | NG | 20 |
| CN | 652 | EG | 17 |

The United States and France hold 57.9% of the pool. China, India, Indonesia and Nigeria together hold 1.9% of it and 19.9% of the people in the store.

### By Field

| Field | In pool | Field | In pool |
|---|---|---|---|
| Medicine | 6,541 | Psychology | 2,561 |
| Biochemistry, Genetics and Molecular Biology | 6,193 | Agricultural and Biological Sciences | 2,293 |
| Engineering | 5,965 | Earth and Planetary Sciences | 2,200 |
| Computer Science | 5,306 | Arts and Humanities | 1,797 |
| Social Sciences | 5,188 | Economics, Econometrics and Finance | 1,689 |
| Physics and Astronomy | 4,580 | Chemistry | 1,669 |
| Neuroscience | 3,819 | Business, Management and Accounting | 959 |
| Environmental Science | 3,203 | Nursing | 182 |
| Mathematics | 3,025 | Dentistry | 74 |
| Materials Science | 2,857 | Veterinary | 71 |

Neuroscience has 3,819 pool people from 380,161 authors in the store, a rate of 1.0%. Medicine has 6,541 from 4,827,474, a rate of 0.14%. Nursing, Dentistry and Veterinary each have under 200.

### By Seniority

First affiliation year of the gated pool: 1990 or earlier 29,919, 1991 to 2000 18,059, 2001 to 2010 10,946, 2011 or later 3,899. Advisors who started in the last 15 years are 6.2% of the pool. Recorded lineage favours people with long careers, and the pool inherits that.

### Cost of Leaving Out Medium Matches

40,098 distinct people are reachable through a medium match alone. 38,562 are in France, 1,302 in the United States, 81 in China, 153 elsewhere. By field the largest losses are Engineering 6,061, Medicine 4,777, Social Sciences 3,828 and Biochemistry 3,785. Admitting them would raise the French pool from 7,387 to at most 45,949 before the recency gate and change no other country by more than 1,302. A medium match rests on a name that is unique within a country, so a wrong match attaches one person's papers to another person's name. The plan keeps them out and leaves the choice to the founder under Open Decisions.

### Identity Audit

Before slice 1 output is trusted, the founder checks 500 pool records against the person's public page: 200 with their own id, 200 with a high match, and 100 of the 6,348 pool people whose OpenAlex ids were merged through a shared ORCID. A stratum passes under 2% wrong identities. A failing stratum leaves the pool.

## Pool Improvement

The pool grows when a medium identity match becomes a high one. One process does that today. `collect/pubmed_openalex.py` runs as a background service on the founder's machine and joins PubMed records to OpenAlex works by PMID. Where the name and the author position agree on the same paper, it records the method `pubmed_openalex_same_paper_position` at high confidence. Its yield is unmeasured in this plan, and it reaches people with PubMed-indexed papers alone, so French advisors in the humanities and social sciences gain least.

Recount after the join finishes and before slice 1 starts:

1. Rerun the pool SQL above and the source, country, field and seniority tables. If the join stores its result outside `person_match.confidence`, the pool rule gains that source and the SQL in this plan is updated in the same edit.
2. Rerun the pair counts under Validation.
3. Re-measure the French exclusion: pool, left out, share left out. Today it is 7,387, 38,562 and 83.9%.
4. Audit 200 upgraded matches against public pages. The upgraded tier enters the pool under 2% wrong identities, the same bar as the identity audit.
5. Replace the tables in this plan and stamp the date. The slice 1 build prints the same tables on every run, so later recounts are a rebuild.

Slice 6a adds a second source of growth: faculty-haul people with an official profile and no advisor link.

## Student Input

One JSON file, schema `bucket.advisor-query/1`.

| Field | Form | Use |
|---|---|---|
| `field` | one of the 26 OpenAlex fields | hard filter, optional |
| `interests` | free text up to 200,000 characters | topical query |
| `admired_works` | up to 20 DOIs or OpenAlex work ids | topical query |
| `countries` | include and exclude lists of ISO codes | hard filter |
| `degree` | doctorate, master's, postdoc | wording of the unknowns |
| `language`, `funding` | free text | echoed as unverified constraints |

Country is the single constraint the store can enforce per person. Language is known at country level. Funding is known for 58,325 people through `grant_count`.

## Result

A `bucket.advisor-review/1` file with at most 300 rows. Each row carries rank, score, percentile, `order_status`, name, institution, country, field, `shared_terms`, `research_areas`, and five scalar lists inside `fields`: `reasons`, `recent_works`, `lineage`, `unknowns`, `coverage`. The context `summary` carries the coverage statement. The schema stays at version 1 because `fields` accepts scalar lists of up to 32 items and `summary` exists today. No key contains `note`, which the parser drops. The rows omit `h_index` and `works_count`. `order_status` is one of `tested`, `untested` or `withheld`, and `percentile` is null unless it is `tested`.

### Display Modes

The stratum is the student's country by field. With no country filter it is the field.

| Mode | Condition | What the screen shows |
|---|---|---|
| Withheld | Under 50 pool candidates after the student's filters | The count, the reason, and the candidates in alphabetical order with their reasons. No order, no rank number, no score, no percentile. |
| Untested order | 50 or more candidates, and the stratum's retrieval test has not run or has not passed | Rows sorted by topical overlap under the heading "Untested order". Reasons are shown. Rank number, score and percentile are hidden. |
| Tested ranking | The stratum passed the ship rule under Validation | Rank and percentile. |

Every result from slice 1 is in one of the first two modes, because no test has run. The file format needs a numeric rank and score on each row, so the writer keeps them as row positions and the view hides them unless `order_status` is `tested`.

### Coverage Statement

The feature build writes `coverage.json`: for each country, each field and each pair of the two, the gated pool count, the count left out as medium matches, the share left out, and the count of test pairs with the test result. The writer fills this template into `summary`, and the view prints it above the list on every result.

> Bucket holds 460,552 recorded advisors. 339,668 are known by name alone and cannot be matched to their papers. This list draws on {pool} who can. {pool_country} of them are in {country} and {pool_field} are in {field}. {medium_country} more people in {country} are held with an unreviewed identity match and are left out, which is {excluded_share}% of the advisors Bucket can identify there. Advisors with no OpenAlex record are absent.

One test sentence follows, chosen by mode:

- Tested ranking: "The order for {field} in {country} was tested on {pairs_stratum} recorded pairs, against every rankable advisor in the field. The test used the papers a student had written before. An order from a written description alone has never been tested."
- Untested order, before slice 3: "The order has not been tested."
- Untested order, after slice 3: "The order has not been tested for {field} in {country}. It was tested in {tested_strata}."
- Withheld: "Bucket holds {n} candidates for this search, too few to order."

Warning sentences are added by threshold:

- Share left out above 50% in the country: "Most advisors Bucket can identify in {country} are missing from this list."
- Under 100 pool people in the country or the field: "This list misses most advisors in {country}. Treat it as a few leads and search by other means."

With no country filter, the statement gives the country mix of the pool and of the first 100 rows.

Worked examples from today's counts. No stratum is tested today, so no row reaches the third mode.

| Student | Pool in country | Medium left out | Share left out | Mode today | Warnings |
|---|---|---|---|---|---|
| United States | 29,014 | 1,302 | 4.3% | untested order | none |
| France | 7,387 | 38,562 | 83.9% | untested order | most are missing |
| Nigeria | 20 | 0 | 0% | withheld | misses most |

The share is the count left out over the sum of both columns. It mixes a gated count with an ungated one, and the feature build computes it on gated counts for both. A field filter lowers every pool count, so a French or American student in a small field can fall to withheld as well.

## Ranking

The score is topical fit alone. Every other signal is a gate, a displayed fact or a diversifier.

| Signal | Role | Evidence | Unknown |
|---|---|---|---|
| Topical fit | score | Face validity. The retrieval test measures recovery of recorded pairs. | Whether topical closeness predicts a good advising outcome. No table records completion or placement. |
| Recency | gate | Affiliation year of 2018 or later. 6,035 pool people fail it. | The right window per field. |
| Lineage and placement | displayed fact | Published mentorship studies built on the Academic Family Tree, and the one historical sample the framework cites on faculty quality. Neither was re-read here. Slice 2 checks both citations. | Confounded by selection and prestige. Weight is zero. |
| Capacity | displayed fact, one gate | Recorded students per year, `grant_count`, faculty-haul title. An emeritus or retired title is a gate. | Whether the person has an opening. |
| Co-advising | diversifier | theses.fr records several directors per thesis. | Whether the link still holds. |

Citation counts and h-index stay out of the score and out of the row. A cap of three people per institution in the top 50 carries over from `advisor-review --cap`. No CSrankings-derived row feeds any feature. Measured: 0 pool people have CSrankings as first source.

### Topic Model

**Tier 0, OpenAlex topics.** Each advisor is a set of at most five topics, each mapped to its subfield and field. Fit is an idf-weighted overlap at three levels with fixed weights written into the protocol. The student text maps to topics through the cached taxonomy text that `--basis-openalex` in prime-directions fetches. An admired work maps through one OpenAlex lookup. Five topics per person is a coarse profile, and the plan states that as tier 0's known limit. Measured cost: one pass over the 3.8 GB parquet for a 116,302-id lookup took 6 minutes 26 seconds under the 4 GB cap. No model and no per-advisor network call.

**Tier 1, dense embeddings of work titles.** It needs dated works. Measured: pool people have 13,506,514 works, which is 106,489 page requests at 200 a page fetched one author at a time. At the anonymous cap of 1,000 requests a day that is 107 days, so a full-pool fetch needs an API key. Without a key, tier 1 is trialled on the validation sub-pool alone. Slice 3 times 1,000 titles on this machine before any larger run. Tier 1 runs on the founder's machine or a server. It never ships to a student's machine.

## Validation

### What the Number Means

A recall number shows that the ranker retrieves advisors of recorded pairs in the strata tested. It is silent on whether a list helps a student, on advising quality, and on any stratum outside the test.

### Pairs Available

Measured on 2026-10-12 with both ends resolved under the pool rule:

| Step | Pairs |
|---|---|
| Distinct pairs | 71,000 |
| Without a usable year: 42,383 from Wikidata, 7,397 from the Academic Family Tree | 49,780 |
| With a year from 1950 to 2026 | 21,220 |
| Student has a dated affiliation at least six years before the end year, and the advisor has years | 6,395 |

Of the 6,395: 6,280 come from the Academic Family Tree, 4,317 are graduate links and 1,936 postdoc links, 4,792 have an advisor in the United States, and the leading fields are Biochemistry 972, Neuroscience 867 and Engineering 644. By end year: before 2000 787, 2000 to 2014 3,385, 2015 to 2018 931, 2019 or later 1,292.

The six-year rule is a proxy, because the store kept the end date and dropped the start date. Slice 2 reloads the Academic Family Tree start date and recounts with "work dated before the start year". It also audits 100 students, because an early year can come from a wrong OpenAlex merge.

### Query Construction

The query is the set of the student's works dated before the pairing start, minus every work co-authored with the advisor. Their topics form the query. A thesis title is never used, since the advisor shapes it. This exercises the `admired_works` input path. It does not exercise free text, which the human check covers.

### As-Of Rule

Every feature is computed as of the year before the pairing start.

- Advisor topics come from works dated up to that year, through one grouped OpenAlex request per advisor and cutoff year.
- The recency gate reads affiliation years in the eight years up to that year.
- The candidate set holds pool people whose first year is at least three years before the cutoff.
- The emeritus gate uses today's titles and cannot be dated, so it is switched off in the test. The report counts the true advisors it would remove today.

### Test Set and Split

Test pairs are the clean pairs with an end year of 2015 or later: 2,223 today. Earlier pairs are development data for tier 1. An advisor who appears in a development pair is removed as a true answer from the test and stays a candidate. Tier 0 has no fitted parameter, so it needs no tuning split. If under 1,000 test pairs remain, the split falls back to time alone and the report says so.

### Candidate Set

A live query in a field faces every rankable advisor in that field. The test must face the same set, or recall is inflated.

- **Primary figure.** Candidates are all pool people in the pair's field who pass the as-of gates. This figure decides the ship rule. It needs as-of topics for the whole pool: at most 62,823 advisors at three cutoff years plus 2,223 students, 190,692 grouped requests. That is 191 days at the anonymous cap, so the primary figure needs an API key. Without one, no stratum can pass and every list stays an untested order.
- **Sampled figure.** Candidates are the true advisors plus 4,000 pool people sampled by field: 20,892 requests, 21 days at the anonymous cap. It runs first as a cheap check on the pipeline and on the direction of the comparison. Its recall is higher than a live query would see, and the report says so beside each number. It decides nothing.

The report prints both figures side by side with the candidate count next to every recall value.

### Metrics and Baselines

Recall at 10, 50 and 200 and mean reciprocal rank, with bootstrap intervals resampled by advisor. With 2,223 pairs the 95% interval near a recall of 0.3 is about 1.9 points either way. A stratum under 200 pairs is reported as too small for a conclusion.

Baselines: random within field, most students within field, most cited within field, highest h-index within field, same institution as the student's prior affiliation, and top-three topic overlap. The report adds the rank correlation between engine order and citation count in each top 200.

Strata: advisor seniority in the four bands above, citation quartile with pool cut points at 1,347, 3,801 and 9,270, link-count band, field, country, graduate against postdoc.

**Ship rule, fixed in `PROTOCOL.md` before the first run and applied per stratum.** A stratum is one country by one field. It shows a tested ranking when it has at least 200 test pairs and, on the primary figure within that stratum, recall at 50 beats both most-students and most-cited with a 95% interval above zero. Every other stratum stays an untested order. No pooled result, field-wide result or country-wide result promotes a stratum. Tier 1 replaces tier 0 in a stratum by the same test with a rise of five points.

With 2,223 test pairs, 75% of them in the United States and the leading fields near 15% each, the strata that can reach 200 pairs today are a few United States fields. Slice 2 prints the exact list. Students everywhere else see an untested order until more dated pairs exist.

### Remaining Traps

1. Institution predicts the answer because `person_match` used it. It is barred from features and kept as a baseline.
2. Today's citation counts favour the fame baselines. The report states this.
3. Postdoc links carry prior work by construction. They are reported apart.
4. The test set is 75% United States and almost wholly one source. The coverage statement carries this to the screen.
5. Duplicate pairs across sources: 248 found and merged.

### Human Check

Five authors in different fields and countries write four queries each, the way a student writes them: 20 queries. For each query the first 10 rows from the engine and the first 10 from most-cited-in-field are mixed and shown without their origin, 400 rows in all. At least two raters rate every row 0, 1 or 2 for topical relevance. No rater built the ranker, so the founder and any build agent are excluded, and a query's author may be one of its two raters. The report gives the mean of the raters and their agreement as a weighted kappa. Agreement under 0.4 voids the comparison, and the report says so. A second pass takes 50 rated rows and checks each person's public page for three facts: alive, still in research, same person as the papers. Acceptance: the engine's mean rating is at least the baseline's, and every dead, retired or misidentified row becomes a filed defect. Twenty queries support no statistical claim. The check exists to catch failures that recall cannot see.

### What the Engine Cannot Know

Whether a person takes students this year. Whether they have funding. Whether student and advisor suit each other in temperament. Whether a recorded link was a good experience. Whether a name was matched to the right author. The `unknowns` list prints these on every row.

## Fairness and Harm

| Risk | Measured fact | Control |
|---|---|---|
| Prestige | The pool's median citation count is 3,801 | Counts stay out of score and row. Institution cap. Fame baselines and rank correlation in every validation report. |
| Country and field skew | Tables above | Coverage statement on every result. Slice 6a adds faculty-haul people with no link. |
| Seniority skew | 6.2% of the pool started after 2010 | Seniority strata in validation. Coverage statement names it when the student asks for early-career advisors. |
| Wrong identity | 40,098 people sit behind medium matches. 6,348 pool people were merged by ORCID. | Medium left out. Identity audit. Correction path. |
| People who should be absent | Years from 1502. 6,035 pool people fail recency. | Recency and emeritus gates, removal, the page check in the human check. |
| Students | 1,515,980 in the links | Listed only as advisors in their own right. Exports carry counts and no student names. |

## Removal and Correction

### Identity Cluster

A request is resolved to seed rows, then widened to a cluster. A person can hold several rows in the store, and all of them leave together.

Seeds come from `person.orcid`, `person.openalex_id`, any `person_xid` value, `contact.value_norm` for an address, and `name_norm` with institution for a name. The cluster is the fixed point of four relations:

- `person_match` in both directions.
- `person_merge`: every `old_key` that points at a cluster row is an alias of it.
- Rows that share an ORCID or an OpenAlex id.
- `person_xid` rows that point at a cluster row.

The feature build writes these relations into `identity_edge` in the engine database so the closure runs in milliseconds. `person_match.match_id` has no index in the store.

### Outcomes

| Outcome | Condition | Action |
|---|---|---|
| Removed | One cluster of at most 50 rows | One `do_not_contact` row per cluster row and per alias id, inside one `BEGIN IMMEDIATE`. The store triggers purge the contact rows. A repeat is a no-op. |
| Blocked | No row matches | One `do_not_contact` row holding the identifier given, so later collection skips the person. The reply says no record was held and a block is stored. A name-only request stores a hash of name and institution. |
| Ambiguous | A name matches several clusters, or a cluster exceeds 50 rows | Nothing is written at once. The founder asks for an ORCID, a profile URL or an institution. If the person cannot narrow it, every candidate cluster is hidden from listing and reviewed within 30 days. Hiding too many is the cheaper error. |
| Restored | A request to be listed again arrives through the channel that made the removal, checked against a keyed hash of the requesting address in the log. Failing that, the requester shows control of the identifier: a reply from the address on the ORCID record or from an institutional address on the official profile. | The rows written for that request are deleted, and the restore is logged with its proof type. A restore that meets neither test is refused and logged. |

Removal is accepted without proof of identity, since hiding a person does little harm. Restoring needs proof, since listing a person who asked to leave does. The engine reads `do_not_contact` fresh at feature build, every query, every reveal and every export, and widens it through `identity_edge`. If the table or the edges cannot be read, the command exits non-zero and prints no list. Target times: same day on the founder's machine, 72 hours to a republished index.

A published index carries no list of removed people. The desktop job deletes rows that came from an older index and are absent from the newer one. A file a student saved earlier is out of reach, and the notice says so.

### Correction

| Request | Action |
|---|---|
| These papers are someone else's | Delete the `person_match` row, write a rejection into a new store table `identity_override`, rebuild `advisor_stat` for the row. `collect/match_names.py` gains a check of that table so a rerun cannot recreate the match. |
| Two people were merged | An `identity_override` split. The affected rows leave the pool until the next pull. |
| A lineage link is wrong | A link rejection keyed by advisor, student and source. The fact disappears from the row, and the reply names the upstream source for a permanent fix. |
| Field, topic or institution is wrong | The values come from OpenAlex. The engine hides the value and points to OpenAlex's correction route. |

`identity_override` and the collector check are changes to the private store, which sits outside git. Slice 4 lists them as store changes made on the founder's machine.

### Audit Log

`removal_log` in the engine directory, append-only, mode 0600. Columns: request id, date received, channel, a keyed hash of the requesting address, outcome, identifier type, a keyed hash of the identifier, proof type for a restore, cluster size, contact rows purged, date completed. It holds no name, no address and no free text. The keyed hash lets a repeat or a restore be recognised. The request email is deleted after 12 months.

## Privacy and Law

Nothing here is legal advice. F marks the founder's decision. C marks what counsel must confirm.

### Sources Read

| Source | Date read | What it says |
|---|---|---|
| ORCID Public Data File Use Policy, `info.orcid.org/public-data-file-use-policy` | 2026-10-12 | The file is CC0 and ORCID imposes no conditions. It asks users to follow community norms: attribute ORCID, respect privacy and publicity rights, send no unsolicited bulk mail, offer an opt-out in any mail, and keep data from becoming misleading. Round 1 called these terms that bar bulk mail. They are norms. This plan adopts them as binding on itself. |
| Academic Family Tree Data Export, Zenodo record 19739198 | 2026-10-12 | Published 2026-04-23 under CC BY 4.0 |
| theses.fr, CSrankings, NLM, OpenAlex | 2026-10-11, in the store's `SOURCES.md` | Licence Ouverte 2.0 with attribution, CC BY-NC-ND, NLM reuse terms, CC0 |

Slice 0 saves a dated copy of each terms page beside the assessment.

### Duties From Slice 1

The store and the engine database are processing of personal data today, before anything is published. The ungated pool holds 17,587 people in EU and EEA states and 3,946 in the United Kingdom, and 10,939 of those have an address on file. Slice 0 exists for that reason.

| Topic | Design consequence | Owner |
|---|---|---|
| Purpose | One written purpose: helping an applicant find advisors to write to, one message at a time. The derived engine database is a new use of collected data and gets a compatibility assessment. | F |
| Lawful basis | A written legitimate-interest balancing test covering storage, ranking and listing as separate steps | F writes, C confirms |
| Impact assessment | An outline covering large-scale profiling, dataset matching, wrong-identity harm and the removal path | F writes, C says whether a full one is required |
| Notice to people listed | A public page naming every source, the purpose, the retention and the removal and correction route. Whether individual notice is required or disproportionate is a question for counsel. | C |
| Representative | Whether a controller outside the EU and the UK needs a representative in each | C |
| Controller | bucket.foundation is held in the founder's personal capacity, so the founder is the controller today | F |
| Unsolicited mail rules | Bucket sends no mail under options A and B below | C on option C |
| The founder's own use of stored addresses | A separate question from what students see. It covers any message the founder or Bucket sends to a stored address: his own applications through `reveal`, research invitations, announcements. The store holds an address for 1,163,506 people and for 26,409 pool people. Each kind of outreach needs its own basis, and slice 5 does not run before this item is confirmed. | F states the uses, C confirms each |
| CSrankings | No derived value in any feature or export | fixed |
| Attribution | Index manifest and result page name the Academic Family Tree, theses.fr, ORCID and OpenAlex | fixed |

### Retention

| Data | Kept |
|---|---|
| Contact rows | 24 months from `date_seen`, then re-verified or deleted. F sets the period. |
| Engine builds | The last two |
| Works cache | 12 months |
| Query files and reviews | On the asker's own disk, under their control |
| Reveal log | 24 months |
| `do_not_contact` and `removal_log` | As long as suppression is needed |
| Removal correspondence | 12 months |

### What a Student Sees

Name, institution, country, field, topics, recent work titles, lineage counts with source, one public profile URL from OpenAlex, ORCID or an official faculty page, the unknowns and the coverage statement. Measured on the resolved row of each of the 69,829 pool people: every one has an OpenAlex profile, 18,539 have a homepage, lab page or official profile on file, 26,409 have an address on file, and 37,026 have neither a page nor an address.

### What Stays on the Founder's Machine

The `contact`, `page_contact`, `do_not_contact`, `person_match`, `person_merge` and `advisor_link` tables. Student names. People known by name alone. Medium and low identity matches. CSrankings-derived values. The reveal log and the removal log. Query files and statements. Addresses stay too unless the founder chooses option B or C.

### Address Reveal on the Founder's Machine

`advisor-engine reveal` serves one applicant writing one message. The founder is such an applicant, and his use of it is the counsel item above. It takes one person per call and prints the address, `source`, `source_url`, `date_seen` and the confidence. It requires identity at own or high. A high-confidence contact prints. A medium one prints with the line "matched by name and institution, unverified". Low refuses. The 91 rows with no public source refuse. Twenty reveals a day at most. The log holds the time and a keyed hash and no address.

## Open Decision: Addresses for Students

The founder collected addresses with this engine in mind. Whether a student ever sees one is his decision. The plan builds slices 0 to 4 the same way under every option.

| | A. Never | B. One at a time | C. Relay |
|---|---|---|---|
| What the student gets | A link to the public page where the advisor prints an address | One address per request, high confidence alone, with source, date and confidence | A form. Bucket forwards the message and the advisor's address stays hidden until the advisor replies. |
| For it | The lightest duty. Bucket discloses no address. Works in a downloadable index. | Uses what was collected. Saves the student a search. The address comes with its provenance. | The advisor's address is never disclosed. Bucket can put the source notice and an opt-out in every message and can stop abuse at the source. |
| Against it | 14,264 pool people have an address on file and no page on file, so the student gets an OpenAlex profile and has to search for a way to write. | An address cannot sit in a downloadable index, or the index is a bulk list. It needs accounts, a per-person daily cap and a log, so it needs a server. One student can still collect a list slowly. | Bucket becomes the sender of every message. Volume across students is bulk in effect. It needs sending infrastructure, moderation, and caps per student and per advisor. |
| Law and terms to settle | Listing basis alone | Disclosure to a third party enters the balancing test and the notice. ORCID's norms on bulk mail and opt-out bear on how students use it. C confirms. | Bucket carries the unsolicited-mail rules of each country, the ORCID opt-out norm on every message, and US commercial mail rules if any message is commercial. C confirms before any build. |
| Where it runs | Desktop and server | Founder's machine now, server later | Server |

Recommendation, for the founder to accept or reject: A in the public index and the desktop app, B on the founder's machine for his own applications, and B for students reconsidered at slice 7 once counsel has confirmed the basis and the removal route has run for three months. C is the heaviest and is not recommended.

## Where It Runs

Recommended order: a local tool for the founder, then a public-safe index ranked inside the desktop app, then a server. A server-first path puts the lawful-basis question and an abuse surface ahead of any evidence that the ranking works.

### Reaching the People Workspace

The People workspace reads `PeopleStore` alone, and `PeopleStore` holds what the person imported. That stays.

- The founder's tool writes `review.json`, and the founder opens it through `POST /local/advisor/import`.
- For students, a new job `advisor-match` reads a downloaded index and the query file, runs the bundled tier 0 ranker, and calls `importReview`. The view never reads the index.

`parseAdvisorReview` stays the single gate. The engine's writer runs an address scan over its own output and aborts on a hit.

The workspace copy says "Bucket ships no list of people". A published index ends that promise. Slice 6b changes the line, and the founder decides whether to end it.

## Runtime

- Code in `tools/advisor-engine/`, Python with numpy, pyarrow for the build, and `sqlite3`. Store path from `BKT_CONTACT_STORE`, with no default in the repo.
- The store opens with `mode=ro`. `PRAGMA query_only` is left off for reads because it blocks temp tables, as this revision's measurement found. Reads are keyset batches in short transactions.
- Two commands write to the store: `remove` and `correct`. Each uses one `BEGIN IMMEDIATE` with a 30 second busy timeout and retries three times while collectors hold the write lock.
- Derived data in `~/.local/share/advisor-engine/`, mode 0700. Budget 2 GB plus 6 GB for the works cache. Every command refuses to start under 20 GB free.
- Every command runs under `memrun` at 4 GB, one at a time.
- Each build records a build id, the store report time, source counts, code version and the `coverage.json` hash. `context.key` carries the build id.
- Rollback for slices 1 to 5 is deleting the derived directory. Rollback for a published index is publishing the previous version.

## Slices

PRs target `dev`. One bead per slice under bkt-l28u, filed before work starts. Tests run on a synthetic SQLite and parquet fixture with invented people. The build agent of each slice owns its tests, and the critic reviews each slice.

| # | Ships | Files | Tests | Acceptance |
|---|---|---|---|---|
| 0 | Governance documents | `docs/advisors/{PURPOSE,BALANCING-TEST,IMPACT-OUTLINE,NOTICE-DRAFT,RETENTION,COUNSEL-CHECKLIST,SOURCES-TERMS}.md` | voice lint | The founder has signed the purpose, the balancing test and the retention table. The counsel checklist lists every C item. No later slice starts before this. Nothing leaves the founder's machine before the C items are confirmed. |
| 1 | Feature build, tier 0 overlap, display modes, coverage statement, view fields | `tools/advisor-engine/{build,rank,query,coverage,write_review}.py`, `tests/`, `packages/bkt-ui/src/views/Advisors.tsx`, its test | pool rule matches the SQL above on the fixture, both gates, suppression with cluster closure at build and query, fail-closed read, address scan abort, review parses, the view renders `summary` and the five lists, rank, score and percentile are hidden unless `order_status` is `tested`, under 50 candidates gives the withheld mode, the share-left-out and pool-size warnings fire, no output contains a testing claim | The founder runs one query on the real store and sees an untested order with reasons, unknowns and the coverage statement in the People workspace, with no rank or percentile. The build prints the pool tables of this plan. The identity audit of 500 is recorded. Peak memory under 4 GB. |
| 2 | Retrieval test on dated affiliations, protocol, baselines | `eval/{pairs,asof,split,metrics,baselines}.py`, `eval/PROTOCOL.md` | no test advisor in development pairs, duplicates merged, as-of gate ignores later years, metrics against hand-computed fixtures | `PROTOCOL.md` is committed before the first run. The start-date recount and the 100-student audit are reported. Pair counts per country and field feed `coverage.json`. Both literature citations are checked. |
| 3 | Dated topics, full clean test, human check, tier 1 trial | `works_fetch.py`, `embed.py`, `eval/clean.py`, `eval/HUMAN-CHECK.md` | resume after interrupt, daily request cap, co-authored works excluded, cutoff respected | Request counts logged against the 20,892 and 190,692 budgets. The report gives the primary and sampled figures side by side for every metric, baseline and stratum. The human check is recorded with two raters and their agreement. Each stratum moves to a tested ranking or stays an untested order by the fixed rule. |
| 4 | Removal, correction, audit log, published notice | `remove.py`, `correct.py`, `identity.py`, store table `identity_override`, `docs/advisors/NOTICE.md` | closure over match, merge, shared id and xid, four outcomes, idempotent repeat, restore refused without proof and logged, write retry under a held lock, log holds no name or address | Removing one id on the fixture hides its matched twin and its merged alias from query, reveal and export. Gate: counsel has confirmed the notice. |
| 5 | Address reveal on the founder's machine | `reveal.py` | identity below high refuses, low contact refuses, unsourced refuses, medium prints its label, daily cap, suppressed person refuses | One call prints one address with source and date. Gate: counsel has confirmed the founder's own use of stored addresses. |
| 6a | Public-safe index export | `export_index.py`, manifest schema | field allow-list, zero addresses, zero CSrankings values, suppressed clusters absent, signature, size budget | The exporter fails above 48 MB or above 700 bytes a row on average. The file stays on the founder's machine until every C item is confirmed. |
| 6b | Desktop `advisor-match` job | `packages/bkt/src/job-specs.ts`, `packages/bkt/src/pack/pysrc.ts`, `tools/advisor-engine/rank.py` bundled, `Workspace.tsx` copy | job needs numpy alone, index cap 64 MB, rows from an older index deleted, import goes through `parseAdvisorReview` | A student on a clean machine downloads the index, runs the job and sees ranked rows with the coverage statement. Same order as the founder's tool on the fixture. |
| 7 | Server match | PR #366 after #359 and #357 land: its ranker replaced by a TypeScript port of tier 0, its remove page wired to slice 4 | parity of the port with the Python ranker on fixtures, the PR's route and Postgres tests | Staff-only flag first. If the founder chose option B for students, the reveal route ships here with accounts, a daily cap and a log. |

Slice 5 note, recorded 2026-10-12 after the critic review of PR #789. A reveal command was built in slice 1 and removed before merge. That code failed open: its contact classifier returned high confidence for every `how_obtained` value it did not recognise, which covered values such as `europepmc`, `same_paper_openalex_author` and the obfuscated-page values. Slice 5 rebuilds the classifier on an explicit whitelist of high values, refuses every value outside it, and tests each value present in the store at build time against the list. Slice 5 stays behind counsel items C5 and F8.

Slice 1 note, same date. Every command refuses to run without `founder-acknowledgement.txt` in the engine directory, a file the founder writes by hand. The gate stands in for the slice 0 signature. Rows of an untested or withheld review carry no rank, score or percentile, and the view treats a missing `order_status` as untested.

Slice 1 is useful to the founder alone. Slices 2 and 3 decide whether the order ships at all.

## Open Decisions for the Founder

1. **Addresses for students.** Options A, B and C above. Recommended: A now, B on his own machine, B for students reconsidered at slice 7.
2. **Medium identity matches.** Leaving them out costs 38,562 French advisors. Admitting them risks wrong papers on real names. Recommended: leave them out, recount after the PubMed and OpenAlex join, then audit 200 of the French matches still at medium and admit the tier if under 2% are wrong.
3. **OpenAlex API key.** Without one the sampled test takes 21 days, the primary test is out of reach, and no stratum can show a tested ranking. Recommended: a key under a bucket.foundation role address.
4. **Counsel.** Recommended: one review of the slice 0 documents before slice 4 publishes the notice, and no index off the machine without it.
5. **Shipping a list of people.** The desktop app promises today that Bucket ships none. Recommended: keep the promise through slice 5 and decide at slice 6a with the validation report in hand.
