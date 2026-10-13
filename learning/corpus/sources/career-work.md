# Career and Workplace Learning Inventory

64 items in `career-work.jsonl`: 29 findings, 11 datasets, 6 models, 4 principles, 3 measures, 3 methods, 3 definitions, 3 open questions, 2 mechanisms.

## What Exists

Internal work covers research careers and little on ordinary workplaces. Four sources hold it: research-atlas funding papers, education-atlas briefs, fourteen K-12 research-apprenticeship notes, and advisor and role-prediction plans built on the 80,000 Hours corpus. The plan files in `_intake/ideas/` are untracked and absent from `origin/dev`.

## Strongest Items

1. `funded-gap-mostly-selection`: 2.11x naive gap falls to 1.23x after matching.
2. `matched-residual-by-stage`: residual is largest for rising stars, 1.375x.
3. `pi-resolution-bias`
4. `funded-career-stage-composition`
5. `institutional-funding-concentration`: Gini 0.929.
6. `phd-tenure-track-14pct`
7. `research-apprenticeship-review-sadler-2010`: 53 studies.
8. `apprenticeship-features-not-placement`
9. `summer-apprenticeship-md-phd-entry`: n 236,432.
10. `required-participation-misconduct`
11. `deliberate-practice-variance-explained`: Macnamara 2014 meta-analysis.
12. `expertise-reversal`
13. `tutor-copilot-scaling-expertise`: the one RCT on practitioner support.
14. `registered-apprenticeship-completion`
15. `modality-depth-reach-model`: Bucket's own frame, flagged as constructed.

## Datasets

| Dataset | Size | Licence |
|---|---|---|
| 80k and adjacent corpus | 10,628 fetched URLs, 225M characters, 302 podcast episodes | None. Rights unreviewed, text stays local |
| research-atlas `researchers_public` | 1,165,557 rows, 35 columns | CC-BY-4.0, holds real names |
| research-atlas `grant_pi_person` | 528,570 rows | CC-BY-4.0 |
| research-atlas graph | 1,670,434 grants, 1,438,636 people | CC-BY-4.0, sources keep own terms |
| education-atlas observations | 78,326 rows, one NEET indicator | CC-BY-4.0 |
| education-atlas solutions | 83 rows | CC-BY-4.0 |
| K-12 research-experience notes | 14 notes with DOIs | Bucket summaries |
| PhD cockpit advisors | 3,870 rows | None. Named people and a reply score; unusable as is |
| `bucket-profiles` | 1 private profile | Personal, excluded |

## Claims With No Source

15 items carry no citation and 2 contradict another internal file. The main ones:

- Apprenticeship transfers tacit knowledge. Central to the thesis, no work cited.
- Credentials are the mechanism that opens production.
- Advisor fit by cosine similarity, unvalidated against advising outcomes.
- The role expected-value model. Plan only.
- Bloom's 2 sigma is used as a ceiling in one file and called inflated in another.
- Four PhD-pipeline citations give a link with no author or year.

## Gaps on Workplace Learning

- Deliberate practice: one entry, applied to tutoring. Nothing on professional work.
- Apprenticeship: research apprenticeships only. No cognitive apprenticeship; one trade completion statistic.
- Situated learning: absent. No communities of practice or legitimate peripheral participation.
- Feedback at work: absent.
- Expertise: expertise reversal and Willingham only. Two relevant records sit unused under `pubmed/` (PMID 17775709, 19739881).
- Tacit knowledge: asserted, never sourced.
- Career choice: the 80k framework is held as one sentence and its corpus text is unextracted. No person-fit evidence, no data on careers outside academia.
- Advisor effects: no study linking advisor match to PhD outcomes.
