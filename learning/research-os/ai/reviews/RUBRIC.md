# Bucket AI architecture review rubric

The implementation architecture is a separate review from the research-program plan. The earlier 9.11 score does not transfer. A pass requires a weighted score **greater than 9.0**, every dimension at least 8.0, and no unresolved critical or high blocker.

## Scoring

| Dimension | Weight | Evidence required for a score of 9 |
|---|---:|---|
| Current-code grounding | 10% | The reviewed base commit, implemented routes and types, gaps, and proposed additions are distinguished. References resolve in the current branch. |
| UI workflow | 10% | A researcher can find, select, inspect and quote a source for the intended target, including loading, empty, error, permission and revocation states. |
| Source and quote contracts | 15% | Graph nodes, source records, immutable versions and passages have separate identities; locators, normalization, hashes, evidence receipts and quote persistence are defined. |
| Authorization and writes | 20% | Identity, consent, adult pilot access, node/source grants, service-role reads, write authority and revocation follow a shared policy, with failure behavior before disclosure. |
| Inference and operations | 15% | An executable CPU path has pinned models, worker contracts, request/resource limits, queue behavior, fallback and index replacement without assumed GPU access. |
| Tests and evaluation | 10% | The plan names meaningful contract, permission, persistence, UI and resource checks and preserves the frozen empirical adoption gates. |
| Rollout and rollback | 5% | A staged local release and reversible flag/index changes preserve access rules, provenance and prior evidence across failure. |
| Beads and roadmap | 5% | Scoped queued work has identifiers, dependencies, acceptance artifacts and current roadmap relationships, using the repository's tracking conventions. |
| Rights and privacy | 5% | Corpus eligibility, copying rights, raw-query locality, retention, deletion and source withdrawal have enforceable contracts. |
| Scientific claims | 5% | Retrieval scores, source identity, evidential support, replication predictions and learner outcomes remain distinct, with calibrated claims and separate research gates. |

Weighted score is the sum of each dimension's score multiplied by its weight. An unimplemented check can support a plan score when it has an owner, executable acceptance rule and failure consequence. It cannot count as a passed implementation test.

## Hard gates

| Gate | Required condition |
|---|---|
| Authorization parity | Existing search, Locate, second-source and Quote access gaps have a defined repair before neural results are exposed. Consent and adult access remain enforced on the server. |
| Identity and provenance | A graph node ID cannot stand in for a source, version or passage ID. Search and Quote agree on exact source content and rights. |
| Quote persistence | The server verifies source text and authority, and the response states whether durable evidence was recorded. A silent write failure cannot produce a verified receipt. |
| Complete product path | Find results connect to selection and quotation for the intended workspace target. The plan does not assume the current plain-text list already supplies that behavior. |
| Local runtime | A CPU-runnable path, bounded worker and defined fallback exist without requiring the unresolved Ollama/GPU path. |
| Executable queue | Source/corpus prerequisites and authorization repairs precede inference exposure; work connects to existing import and roadmap items without duplicate ownership. |
| Reviewable PR | The branch contains the requested architecture and queue artifacts, targets the right base, and makes no claim that planned code or unrun tests have shipped. |

## Review protocol

Record the exact artifact paths, base commit and SHA-256 for reviewed plan files. Keep each scored round, its findings and the next version's disposition of each blocker. Use the same rubric across rounds. Code-seam findings must cite a path and observed behavior. Proposed type names are labeled as proposed until present in code.

Apply the repository's Secrets and QA tables to the final diff. Documentation can expose private machine paths or stale infrastructure assumptions even when it contains no application code. Score architecture readiness apart from live deployment state and empirical performance.
