# AI architecture critique round 2

Decision: **revise, 8.73/10**. Two high blockers remain: the fallback depends on an unspecified lexical runtime after worker failure, and the transactional receipt guarantee lacks an authoritative source-rights record it can lock. The previous authorization matrix, passage workflow and shared evidence-writer objections have been addressed in structure.

Reviewed base: `dev` at `884156aebb6bf3f61bf1e3ebdd19ff3c0f81e048`. Reviewed architecture: revision 2. This remains a planning review; application, database, browser and model tests have not run as evidence for this verdict.

## Artifact hashes

| Artifact | SHA-256 |
|---|---|
| `learning/research-os/ai/IMPLEMENTATION.md` | `b4ebdc846c8035de0114fcad539f2be4b5d3efff8dccf2eee00e3926c9161008` |
| `learning/research-os/ai/EVALUATION.md` | `7122742ac9d5894ab85bbb504c8238de35e66d78ab666ff4580f85ec5c01ea6c` |
| `BEADS-PENDING.jsonl` | `aa73da331186fb2d29836330d12742484413e4b82451e1a91f6e78fab970369a` |
| `docs/RESEARCH-OS-APP.md` | `9016a9ada00ce915b1455ccb03b02d43cc8b81920a5eae3f834f3fc6d099dcd9` |
| `learning/research-os/INTEGRATION-PLAN.md` | `79aab5344204d0c191993b069f116d48e3f231dd9fc531e758a89907856e24a9` |
| `learning/research-os/ai/reviews/RUBRIC.md` | `0bc69ed7b76bc78f318ed5b1b3947c610afff9a4ff04683b40c5f0bec1b7be19` |
| `learning/research-os/ai/reviews/round-1.md` | `54e541e5e1d04f4a5997f9206b13a25cf7928a278bdd9d19512222e1bc535e86` |

## Scores

| Dimension | Weight | Score | Assessment |
|---|---:|---:|---|
| Current-code grounding | 10% | 9.2 | The evidence append defect is confirmed and planned as a prerequisite. |
| UI workflow | 10% | 9.2 | A route-persistent target context and separate curated/imported paths now connect Find to quotation. |
| Source and quote contracts | 15% | 8.5 | Versioned unions, named routes, receipt fields and consumer rules exist. Transactional source authority needs a storage contract. |
| Authorization and writes | 20% | 8.5 | Anonymous public search, permission verbs, prerequisite filtering and transaction ownership are specified. Source-rights locking remains unresolved. |
| Inference and operations | 15% | 8.0 | CPU and queue limits are sound, but worker failure has no assigned surviving lexical implementation. |
| Tests and evaluation | 10% | 9.0 | An unmapped imported-source browser gate and mixed-writer transaction tests now cover the intended release. |
| Rollout and rollback | 5% | 9.0 | Development and release boundaries remain explicit and reversible. |
| Beads and roadmap | 5% | 9.2 | Twelve scoped records include a separate HTE parity prerequisite; import ownership and roadmap reconciliation remain intact. |
| Rights and privacy | 5% | 8.5 | Receipt export/delete is part of the first migration. The authority for a current rights decision needs definition. |
| Scientific claims | 5% | 9.5 | Evaluation and research limits are preserved. |

Weighted total: 8.725, rounded to 8.73. The pass rule remains greater than 9.0 with no unresolved high blocker.

## High blockers

### H1: The fallback must survive worker failure

References: IMPLEMENTATION, API and worker contracts and Operating envelope; `ros-ai-worker` record.

The queue assigns BM25 to the Python worker. The API promises checked lexical results after worker timeout, malformed output, queue overflow or unavailability. No surviving lexical execution path is assigned. A lexical artifact on disk cannot compute a result without a reader and scorer, and restarting the same failed worker does not meet the fallback contract.

Required correction: choose one owner for lexical ranking and fusion. Server-owned BM25 and fusion, with the worker providing dense results and optional reranking, is a bounded design. Specify its path, artifact contract, eligibility filtering, candidate bounds and behavior when either the worker or lexical artifact is unavailable. Use the same lexical implementation for the baseline and fallback. Update the queue and flow to match, and require a worker-stopped test that still returns a permission-checked lexical result within the end-to-end deadline.

### H2: Name the authority used by the receipt transaction

References: IMPLEMENTATION, Source identities and Quote contract, lines 77 to 95 and 123 to 131 in this revision.

The first slice defines source revisions and copying rights in a file-backed read model and creates no source table. The new RPC then promises to recheck source revision and rights under database locks. A SQL transaction cannot lock a rights decision that exists only in a local manifest or code catalog. Graph access rows can govern visibility, but the architecture has not assigned them the source revision and allowed-use decision needed by the receipt guarantee.

Required correction: define the database-authoritative admission and rights revision that the RPC can lock, or a concrete fencing protocol with equivalent semantics. It must bind the source revision, text/span hashes, allowed uses and withdrawal state. Identify who admits/withdraws records and how curated sources enter this authority before the first receipt. Keep the index rebuildable and its writer outside permission decisions. The imported adapter must join the same authority without creating a competing import store. Test source withdrawal or rights-epoch change during receipt creation and a mismatch between the local artifact and authoritative revision.

## Material corrections

### M1: Prevent a legacy validation downgrade

Reference: IMPLEMENTATION, Passage release contract, Produce and review row.

The plan intends to block imported references from locator matching. Make the negative case executable: removing `sourceRefs`, changing a versioned request to a legacy shape, or reclassifying a new receipt event as a legacy quote must not satisfy imported-source evidence requirements. Restrict the legacy path to identified curated legacy evidence and test the downgrade attempts.

### M2: Separate neural availability from fallback service success

References: IMPLEMENTATION and EVALUATION, Runtime gates.

A 200 degraded response should not count as a neural success. State how worker timeout and unavailable-model responses contribute to the error/degradation release threshold, and calculate neural latency on identified neural calls. Include fault-injection runs apart from the normal operating sample. This prevents a fast lexical fallback from certifying the neural operating envelope.

## Prior objections

The operation matrix resolves the anonymous-search conflict and names cite/continue permissions. Check prerequisites and reveal-time revocation have a defined policy. The imported result union, source resolver, source reader, quote endpoint and consumer table resolve the missing product path. The target context has an expiry and account-change handling. The shared RPC, idempotency fingerprint and mixed Quote/Check tests address the lost-update design. H2 above concerns the authority those transactions need, rather than reopening the append decision.

HTE parity is a separate pending record and dependency. The architecture still distinguishes a local prototype from the full 2,000-record passage release. No passing score or implementation result is inferred from the presence of these documents.

## Hard-gate status

Authorization parity and quote persistence remain conditional on H2. Local runtime fails H1's required fallback condition. Identity, the complete product path and the scoped queue are now specified at plan level. Final Secrets and QA tables follow after the remaining architecture blockers are resolved and the final artifact hashes are fixed.
