# AI architecture critique round 1

Decision: **revise, 8.08/10**. This is a new architecture review. The research-program score does not transfer. The required architecture threshold is greater than 9.0, every dimension at least 8.0, and no unresolved critical or high blocker.

Reviewed base: `dev` at `884156aebb6bf3f61bf1e3ebdd19ff3c0f81e048`. Reviewed architecture: revision 1. Application behavior remains unimplemented by this planning PR. The source inspection and artifact review do not establish runtime test results.

## Artifact hashes

| Artifact | SHA-256 |
|---|---|
| `learning/research-os/ai/IMPLEMENTATION.md` | `f7d62de110655a8291208fb5987ce86486c2de47ecee67da189cbf1a782526d4` |
| `learning/research-os/ai/EVALUATION.md` | `b3c4de339817e30c52dab9dae3f96eb403d4c738c6aac8ff6a77f01c28876d85` |
| `BEADS-PENDING.jsonl` | `46cdf46cc9bf253dd39bb9e3dc0003995b1e4508576a244891023e06dacdbd38` |
| `docs/RESEARCH-OS-APP.md` | `9016a9ada00ce915b1455ccb03b02d43cc8b81920a5eae3f834f3fc6d099dcd9` |
| `learning/research-os/INTEGRATION-PLAN.md` | `79aab5344204d0c191993b069f116d48e3f231dd9fc531e758a89907856e24a9` |

## Scores

| Dimension | Weight | Score | Assessment |
|---|---:|---:|---|
| Current-code grounding | 10% | 9.0 | Current Find, Quote, access and import gaps are distinguished from proposed code. |
| UI workflow | 10% | 8.0 | The curated-node prototype has a usable path. The imported release lacks a complete target-selection and quotation contract. |
| Source and quote contracts | 15% | 7.0 | IDs and offsets are separated. Durable receipts and imported-source consumers need concrete contracts. |
| Authorization and writes | 20% | 7.0 | Authorization precedes inference, but anonymous behavior, citation permission and shared evidence-writer races remain unresolved. |
| Inference and operations | 15% | 8.7 | CPU execution, eligibility masks, worker authentication, resource caps and fallback are bounded. |
| Tests and evaluation | 10% | 8.3 | Evaluation is preserved. The browser gate only certifies the curated-node prototype while release depends on imported passages. |
| Rollout and rollback | 5% | 8.8 | Feature and index rollback preserve the baseline; prototype and evaluated release are distinguished. |
| Beads and roadmap | 5% | 8.7 | Eleven scoped records connect to existing imports and the pending roadmap. Dependency execution remains pending reconciliation. |
| Rights and privacy | 5% | 8.8 | Rights, query locality and deletion are included. New receipt retention must become part of the concrete schema contract. |
| Scientific claims | 5% | 9.5 | Search utility, replication prediction, source independence and learning outcomes have separate claims and gates. |

Weighted total: 8.075, rounded to 8.08.

## High blockers

### H1: Authorization needs operation-specific outcomes

References: IMPLEMENTATION, Authorization boundary; `src/lib/research-os/access.ts`; `src/app/api/research-os/search/route.ts`; `src/app/api/research-os/workspace/route.ts`.

The adapter applies authentication and consent to GET search while the current GET route permits anonymous public search. The same draft promises to retain existing consumer contracts. The draft also uses `canView` across operations, although `access.can` distinguishes a shared view grant from a cite grant. A view-only user could receive a durable citation unless the write policy is stated.

Required correction: add an operation/audience matrix covering anonymous GET, signed-in GET, workspace reads, curated Quote, imported Quote and held Check reveal. State which operations need consent, pilot eligibility, view permission and cite permission. Apply current authorization to Check prerequisite summaries and every corroborating source, including after revocation. Define denied/not-found responses without disclosure and corresponding route fixtures. A shared read helper alone cannot decide write permission.

### H2: Imported passages have no complete release contract

References: IMPLEMENTATION, Flow, Source identities, API and worker contracts, Quote contract, Verification and release; `ros-ai-import-quotes` and `ros-ai-eval` records.

The release waits for imported passages, but the described response requires `nodeId` and `slug` while imported sources can have neither. The accepted-source opening path and Select source for this target are unnamed. The imported Quote payload lacks a route/action union. Check, secondSource and Produce are told to adopt structured receipts without definitions of what each must validate. The browser gate still proves curated source-node Quote.

Required correction: define a proposed versioned result union for mapped graph sources and unmapped imported sources; name the resolver and quotation endpoint/action; define source selection state with the original target retained; and specify the structured receipt and each consumer's checks. Coordinate storage with the import owner through a defined adapter interface. Add an end-to-end release gate that finds an unmapped imported passage, selects it for the original target, quotes the exact stored version, persists the receipt and passes the intended production validator. A summary or forged receipt must fail that path. Keep the curated path as the earlier development gate.

### H3: Receipt atomicity must cover every writer

References: IMPLEMENTATION, Quote contract; `src/lib/research-os/db.ts:671`; `src/lib/research-os/stages.ts:284`; `ros-ai-access` record.

Source inspection confirms that `recordEvidence` reads an evidence array, appends in memory and upserts the row. An atomic new Quote writer can still lose evidence when an old Check writer upserts a stale array. The present conditional wording postpones a known prerequisite. A Quote can also carry a stale stage into a later write, since the current function accepts the supplied `nextStage`.

Required correction: require a shared transactional append path for all writers touching the same evidence/state row. State the transaction's row lock or equivalent serialization rule, the receipt uniqueness key, immutable request fingerprint, collision response, and commit behavior. Receipt creation and evidence append must commit together. Quote must preserve the stage read within the transaction and award no XP; it cannot overwrite a concurrent Check transition. Cover lost-response retry, same-key/different-payload conflict, simultaneous distinct quotes, and Quote concurrent with Check. Define which fields legacy consumers retain during migration.

## Material corrections

### M1: Define return state across route changes

Reference: IMPLEMENTATION, Flow and UI behavior.

Client memory in an unmounted workspace component will not preserve the query on the source page. Name the shared layout context or bounded session store that holds target, query and request revision. Clear it on account change and state its direct-link/reload fallback. Keep raw queries out of URLs as planned.

### M2: Separate permission tests from pilot tests

Reference: IMPLEMENTATION, Verification and release.

The Access row lists every identity against every route but provides no expected outcomes. The existing public search, consented learner tools and adult pilot have different policies. The matrix requested in H1 should drive route tests; it must not restrict the entire legacy application to the pilot allowlist.

### M3: Make the HTE parity dependency executable

Reference: IMPLEMENTATION, Execution order; `ros-ai-research` record.

The execution table names an HTE parity fixture as a prerequisite while the pending record creates it inside the research task. Use a separate tracked prerequisite or an explicit first acceptance stage that blocks baseline measurement and requires the HTE PR result. Preserve the `hte/integration` target. This is a queue ambiguity, without a need to delay source acquisition or prior-work reading.

## Hard-gate status

| Gate | Status |
|---|---|
| Authorization parity | Fail pending H1 and H3 |
| Identity and provenance | Fail for the full passage release pending H2 |
| Quote persistence | Fail pending H3 |
| Complete product path | Pass for the prototype; fail for the release pending H2 |
| Local runtime | Pass at plan level |
| Executable queue | Conditional on the revised contracts and dependency reconciliation |
| Reviewable PR | Pass at plan level; final diff review remains required |

The draft has a credible CPU-based product path and a scoped queue. Repair the authorization, receipt transaction and imported-source release contracts before assigning the required architecture score.
