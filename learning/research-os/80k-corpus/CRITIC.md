# Corpus critic

## Verdict

The third round passed at **9.125/10** for the local archive and graph preview. The independent `bucket_critic` reviewed base `ce7f93952` through code commit `883a429e7`. No critical or high findings remain. The review grants no permission to publish raw full text, deploy, or merge.

## Review history

Round one scored 7.90 and identified an unsafe live import path: the existing writer could omit unresolved endpoints and lacked a transaction receipt. The plan changed to local storage and an import preview. Round two passed at 9.125. Round three found a response-budget defect, then verified its repair within the same round. There were no further rounds.

## Scores

| Dimension | Weight | Score |
|---|---:|---:|
| Current-code grounding | 10 | 9 |
| End-to-end workflow | 10 | 9 |
| Data and contracts | 15 | 9 |
| Authorization and writes | 20 | 9.5 |
| Runtime and operations | 15 | 9 |
| Tests and evaluation | 10 | 9 |
| Rollout and rollback | 5 | 9 |
| Work tracking and dependencies | 5 | 9 |
| Rights and privacy | 5 | 9 |
| Claim discipline | 5 | 9.5 |

Weighted arithmetic: `(90+90+135+190+135+90+45+45+45+47.5)/100 = 9.125`. Every dimension scores at least 9. No dimension was excluded.

## Findings

C1, unsafe live writer: resolved for this release by excluding live apply. The collector has no apply action. Authentication, transaction receipts, and learner outcomes remain outside this release. Bead `bkt-byya` tracks graph publication.

C2, response-budget bypass: resolved at `883a429e7`. The first reproduction downloaded 15 bytes against a four-byte budget while accounting for zero bytes. The repair counts every yielded chunk under a shared lock, signals exhaustion, blocks further requests and scheduling, and preserves pending URLs. The regression test establishes one request, five accounted bytes, and three pending records. Four workers can overshoot by up to 256 KiB of yielded chunks. Transport buffering and headers are outside this accounting.

The critic found no added credential and no remaining QA finding in the reviewed scope.

## Evidence

The critic executed all 16 unit tests at the revised head. Independent corpus verification checked 10,431 fetched URLs, 9,900 unique raw revisions, and 414 transcript URLs with zero hash or index errors. SQL found zero search rows belonging to missing or non-fetched sources.

The inspected enriched snapshot contained 20,078 nodes and 327,543 edges with zero missing endpoints. Confidence pairs were `null, 1.0` for observed HTML links and `inferred, 0.5` for phrase candidates. Raw source text and generated topic metadata were separate.

The graph snapshot was inspected at `2026-09-26T12:15:05Z`:

| Artifact | SHA-256 |
|---|---|
| Graph preview | `4fff42c74a6257c898d29c19ec17bfd586d783c8f695d0659dba188e90b83202` |
| Enriched archive | `7462b53f0615ac76ba61bc1d491a72a22156ffce9cee632bd16f760925fbde66` |
| Stored verification snapshot | `0eed6df00b8284f821114547b019da67567766ce369942cbe0f3d0cc4e3f86bd` |

The stored verification snapshot preceded the critic's independent check. Later acquisition snapshots have their own counts and hashes. This report retains the review's original evidence.

## Limits

Acquisition continued during review. Counts have distinct observation times. Scientific claim validation, inspection of every page for challenges, independent caption reconstruction, live ingestion, and concurrent byte-budget stress tests were unrun. The checks establish archive integrity and graph consistency within the inspected snapshots. Exhaustive coverage and truth of source claims remain unverified.

## Publication check

After the critic review, GitHub push protection found credential-like values in links copied from public sources. The parent removed all per-source export artifacts from the unpublished commit and retained them in the ignored local archive. Aggregate coverage and tools remain in the publication. The critic score applies to the reviewed local acquisition scope; its credential inspection did not detect these values in generated source exports.
