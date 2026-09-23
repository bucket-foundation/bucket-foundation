# AI architecture critique round 3

Decision: **pass for architecture readiness, 9.19/10**. The score exceeds 9.0, every dimension is at least 9.0, and no unresolved critical or high architecture blocker remains. This verdict applies to the reviewed planning artifacts. It does not certify implemented behavior, authorize pilot activation or establish a scientific result.

Reviewed base: `dev` at `884156aebb6bf3f61bf1e3ebdd19ff3c0f81e048`. Reviewed architecture: revision 3. The architecture rubric is `learning/research-os/ai/reviews/RUBRIC.md`. The earlier research-program review remains a separate assessment.

## Artifact hashes

| Artifact | SHA-256 |
|---|---|
| `learning/research-os/ai/IMPLEMENTATION.md` | `e3f0662cbd33b6f801e57482e5d2cd21e83516971fcf8e4eec4fe513897435fd` |
| `learning/research-os/ai/EVALUATION.md` | `49e15d016f17af050898328f0a3a53b5242c936d674ea4458f151964ccd195f5` |
| `BEADS-PENDING.jsonl` | `d22e29631e8553bce64fc14bd44e28c9816d06b3336f3a4ffe8d419b897e2c34` |
| `docs/RESEARCH-OS-APP.md` | `9016a9ada00ce915b1455ccb03b02d43cc8b81920a5eae3f834f3fc6d099dcd9` |
| `learning/research-os/INTEGRATION-PLAN.md` | `79aab5344204d0c191993b069f116d48e3f231dd9fc531e758a89907856e24a9` |
| `learning/research-os/ai/reviews/RUBRIC.md` | `0bc69ed7b76bc78f318ed5b1b3947c610afff9a4ff04683b40c5f0bec1b7be19` |
| `learning/research-os/ai/reviews/round-1.md` | `54e541e5e1d04f4a5997f9206b13a25cf7928a278bdd9d19512222e1bc535e86` |
| `learning/research-os/ai/reviews/round-2.md` | `56b17117701fd69caf9eed9ffc0a981bac57950c66a6ca2272764620fc2bc70d` |

## Scores

| Dimension | Weight | Score | Basis |
|---|---:|---:|---|
| Current-code grounding | 10% | 9.4 | The audited commit, existing APIs and current evidence-writer defects are distinguished from proposed additions. |
| UI workflow | 10% | 9.2 | The early node flow and full imported-passage flow have separate actions, retained target state and end-to-end gates. |
| Source and quote contracts | 15% | 9.2 | Versioned identities, normalized offsets, admission authority, receipts and consumer validation form a coherent contract. |
| Authorization and writes | 20% | 9.2 | Operation-specific permissions, current-source checks, shared transaction ownership and expiry after lock acquisition are specified. |
| Inference and operations | 15% | 9.1 | CPU execution and an independent server lexical path have bounded queues, resources and deadlines. |
| Tests and evaluation | 10% | 9.1 | The plan calls for route/database tests, worker-stopped recovery, mixed-writer concurrency, imported-source browser tests and sealed quality evaluation. |
| Rollout and rollback | 5% | 9.0 | Development inspection is separated from pilot release. Feature and artifact reversal preserve authorization and evidence semantics. |
| Beads and roadmap | 5% | 9.1 | Twelve scoped records have an acyclic internal dependency graph and named external prerequisites. Dispatch and roadmap reconciliation remain tracked gates. |
| Rights and privacy | 5% | 9.1 | Mutable rights reside in a transactional authority; source withdrawal, query locality and receipt export/delete are part of the design. |
| Scientific claims | 5% | 9.5 | Relevance, quotation identity, source independence, replication prediction and learning outcomes retain separate interpretations and evaluations. |

Weighted total: 9.19.

## Resolved blockers

Server `lexical.ts` now owns BM25 and fusion for the live API and evaluation. The Python worker owns dense scoring and optional reranking. A stopped or malformed worker cannot remove the server's checked lexical path. Both modes use frozen acceptance thresholds, and a missing lexical artifact or unavailable eligibility authority yields 503.

The access increment creates `graph.evidence_source_admissions`, with source/body revisions, allowed uses and withdrawal state. Admission and activation are controlled writes. The Quote transaction can lock this authority and the relevant node/grant rows. Curated quotation hashes participate in the source revision, so an unchanged summary cannot conceal a changed passage. Future import ownership requires a shared transaction fence or a reviewed authority migration.

The shared evidence append transaction covers all callers. Receipt insertion and the event append commit together; idempotency collisions have a defined response. Quote preserves the locked current stage and awards no XP. Grant expiry is checked against wall-clock time after locks, with bounded waits and a delayed-lock fixture.

Versioned production validation is selected and stored by the server. Removing references or changing client flags cannot select legacy validation. Legacy evidence loaders exclude imported/versioned events, and the imported-source release has its own browser gate. Healthy-load neural execution must reach 99%; forced worker failures are measured in a separate recovery run.

## Hard gates

| Gate | Verdict | Evidence in the plan |
|---|---|---|
| Authorization parity | Pass at plan level | Anonymous and signed-in policies, cite/continue/view verbs, prerequisite filtering and reveal-time checks precede inference exposure. |
| Identity and provenance | Pass at plan level | Node/source/revision/passage identities, an import adapter, normalized byte offsets and the admission registry are defined. |
| Quote persistence | Pass at plan level | Shared transactions, idempotency, source-rights locks, receipt ownership and legacy migration rules are required. |
| Complete product path | Pass at plan level | The full release exercises an unmapped imported passage through original-target selection, quotation, Check and production validation. |
| Local runtime | Pass at plan level | A pinned CPU model path and server-owned lexical fallback have bounded failure handling. |
| Executable queue | Pass at plan level | Internal dependencies are acyclic; import, truth, roadmap and HTE prerequisites are recorded. |
| Reviewable PR | Pass for the reviewed artifacts | The change contains architecture, evaluation, review history, pointers and pending work; it asserts no feature deployment. |

## Secrets review

| Severity | File | Line | Issue | Fix |
|---|---|---|---|---|
| None found | `learning/research-os/ai/IMPLEMENTATION.md` | 1 | No secret values, private home paths or private host addresses found in the reviewed architecture. Environment variable names and proposed storage names are documentation. | None required. |
| None found | `learning/research-os/ai/EVALUATION.md` and `reviews/` | 1 | The reviewed evaluation and history contain relative repository references and public primary-source links, with no credential assignments found. | None required. |
| None found | `BEADS-PENDING.jsonl` | 207 | The twelve added records contain scope and dependencies, with no credentials or private user data found. | None required. |

The secret-pattern scan supplements the artifact review. It does not certify unrelated repository history or unreviewed future files.

## QA review

| Severity | File | Line | Issue | Fix |
|---|---|---|---|---|
| None unresolved | `learning/research-os/ai/IMPLEMENTATION.md` | 122 | The lexical fallback has a runtime outside the worker it must survive. | Resolved through server ownership and the worker-stopped test requirement. |
| None unresolved | `learning/research-os/ai/IMPLEMENTATION.md` | 92 | Source rights and revisions now have an authority the receipt transaction can lock. | Resolved through the admission registry and import-authority fence. |
| None unresolved | `learning/research-os/ai/IMPLEMENTATION.md` | 136 | Receipt concurrency and time-based permission expiry have explicit semantics. | Resolved through shared transactions, fixed-order locks and wall-clock expiry checks. |
| None unresolved | `learning/research-os/ai/IMPLEMENTATION.md` | 159 | Client omission or protocol downgrade cannot turn imported receipt evidence into legacy proof. | Resolved through stored protocol selection and legacy-loader exclusions. |
| Informational | `learning/research-os/ai/IMPLEMENTATION.md` | 181 | Runtime, database and browser acceptance tests remain unrun because this change is a plan. | Execute them in the dependent implementation PRs before pilot activation. |
| Informational | `BEADS-PENDING.jsonl` | 207 | Pending title references become enforceable remote dependencies after dispatch reconciliation. | Keep the recorded dispatch gate and read back the remote graph before retiring pending rows. |

Reviewer checks performed: JSONL parse, twelve unique AI record keys, acyclic internal dependencies, artifact hashes, changed-scope inspection, whitespace diff check and an added-document secret/home-path scan. The external dependency keys are import steps 1/2/3, truth steps 1/2 and roadmap PR #190. Their completion is not inferred.

The parent reports passing voice checks, unchanged pre-existing queue rows and relative-link checks except for the pending review overview. Add `REVIEW.md` and this verdict to the review history, then rerun link and hash validation before publishing the completed PR. Those additions may summarize this verdict; semantic changes to the reviewed contracts require another review.

## Remaining limitations

The permitted 2,000-record corpus, import version store, founder annotation throughput and CPU service targets remain unmeasured prerequisites. The research audit may end before training because authentic genealogy or statistical power does not fit the budget. The adult allowlist uses stored self-reported age and supports the bounded founder pilot; broader learner access needs separate assurance and review.

The admission registry and transactional migration are proposed code. Their correctness depends on implementation tests, including races with withdrawal and account deletion. The daily watch can propose a replacement at a milestone; it cannot bypass a frozen holdout or expand the implementation queue without the plan's review rule.

The accepted architecture supplies a route to a real AI feature and an accountable research decision. Evidence from implementation and use must determine whether either succeeds.
