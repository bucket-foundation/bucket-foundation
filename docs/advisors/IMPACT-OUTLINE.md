# Data Protection Impact Assessment Outline

Draft outline for the founder and counsel. This document is not legal advice. Counsel says whether a full assessment is required. C.

## Why an Assessment May Be Required

| Trigger | Present |
|---|---|
| Large-scale processing of personal data | Yes, millions of records |
| Matching and combining datasets | Yes, lineage sources joined to publication records |
| Profiling or ordering of people | Yes, by research topic |
| Data collected without the person's knowledge | Yes, from public sources |

## Processing Described

1. Collection from public scholarly sources into a private store.
2. Identity matching across sources, with a confidence level on each match.
3. A feature build over advisors matched at direct or high confidence.
4. A query that filters, orders and lists advisors with reasons.
5. A reveal of one published address at a time, on explicit request, logged.

## Risks

| Risk | Who is affected | Control | Residual question |
|---|---|---|---|
| Wrong identity attaches another person's papers to a name | The listed person | Medium and low matches left out, an identity audit, a correction route | The error rate of direct and high matches is unmeasured until the audit runs |
| A person who asked to leave is listed again through a duplicate record | The listed person | Removal acts on the whole identity cluster and is read fresh on every query | Clusters split across records the store cannot link |
| A list is used for bulk mail | Listed people | No bulk export, addresses hidden by default, one reveal per call with a daily cap and a log | Options B and C for students, still open |
| Skew toward long careers, two countries and a few fields | Applicants and unlisted advisors | A coverage statement on every result, no order under the floor | The pool misses most advisors in most countries |
| An untested order is read as a tested ranking | Applicants | A plain label, no rank number, no percentile, no claim of testing | None until the retrieval test runs |
| Research topics hint at sensitive attributes | The listed person | Topics come from public work alone | C |
| Loss or theft of the store | Everyone in it | Local disk, mode 0700, outside every repository, no cloud copy | Disk encryption status. F. |

## Rights Route

Removal and correction follow `NOTICE-DRAFT.md`. Access requests go to the same contact route. Target times: same day on the founder's machine.

## Consultation

Whether to seek the views of listed people or their representatives, and whether prior consultation with a regulator applies. C.

## Open Items

- The address decision in `PURPOSE.md`.
- The audit result for direct and high identity matches.
- Whether a controller outside the EU and the UK needs a representative in each. C.
