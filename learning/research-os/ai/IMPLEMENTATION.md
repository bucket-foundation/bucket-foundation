# Research OS AI implementation

September 21, 2026. Proposed architecture, revision 3. Audited base: `dev` at `884156aebb6bf3f61bf1e3ebdd19ff3c0f81e048`. This planning PR adds architecture and queued work. Feature delivery requires the gates below. The critic's verdict and artifact hashes live in [REVIEW.md](REVIEW.md).

## Product decision

A researcher working on a node can search accepted public evidence by meaning, open a source node, and obtain an existing curated quotation with a citation and locator. A pinned local encoder performs query inference. The first slice uses the current node and Sources pages. Imported-paper quotation follows the versioned import work. Search relevance measures usefulness for a question; it carries no authority to decide truth or learner mastery.

The pilot runs on the founder's machine with a local Next application, local Supabase and a local inference worker. It uses a server allowlist of adult pilot accounts. Public activation is a separate release decision on measured results. Existing learner search remains the default. `RESEARCH_OS_AI_SEARCH` defaults off and is independent of `RESEARCH_OS_LLM_ENABLED`.

The team is the founder and AI agents. External compute and paid gateway calls have a zero-dollar allowance until a budget exists. The twelve-week envelope assumes up to 36 founder hours: 16 for retrieval judgments, 12 for research including a four-hour acquisition audit, and eight for product decisions and workflow review. Agents own implementation and repeatable checks. Work exceeding those caps yields a reduced scope or feasibility result.

## Repository connections

Paths in this table exist at the audited base. New paths in later sections are proposals.

| Existing path | Current behavior | Planned connection |
|---|---|---|
| `src/app/research-os/(app)/workspace/page.tsx` | `runLocate` omits branch and renders text hits; `runQuote` uses the path's selected node | Add an adult pilot mode, pass the active branch, and render an explicit Open source link. Keep active target and result source separate. |
| `src/app/research-os/(app)/n/SourcesSection.tsx` and `n/NodeView.tsx` | Sources calls workspace Quote; node owns Learn, Check, Transfer and Produce | Reuse the source node page for the first slice; add evidence search to Sources after the workspace flow passes. |
| `src/app/api/research-os/workspace/route.ts` | Locate, secondSource and Quote read service-role graph rows without the node access adapter | Establish access parity before inference. Quote persistence errors must reach the caller. Check reads require the same protection. |
| `src/app/api/research-os/search/route.ts` and `src/lib/research-os/search.ts` | First-token query, 400-row cap before access filtering; public/owner filtering omits grants | Preserve response shape while fixing access parity. Benchmark a full-corpus lexical implementation. |
| `src/app/research-os/(app)/SearchPalette.tsx` and `workspace/TargetPicker.tsx` | GET search opens a graph node | Regression consumers of access changes. Initial neural mode lives in workspace Find. |
| `src/lib/research-os/access.ts` and `access-db.ts` | `canView`, `loadNodeAccess`, `loadGrants`, `loadViewerGroups`, `filterSubgraphForViewer` | Shared server access adapter; current graph visibility remains authoritative. |
| `src/lib/research-os/passages.ts`, `stages.ts`, `db.ts`, `production-guard.ts` | Curated `getPassage(slug)`; quote evidence uses locators; production checks prior quote events | First slice uses curated passages; imported passages need a new durable receipt contract. |
| `src/lib/research-os/access-db.ts` and `import-fetch.ts` | `createImport` writes a private node and import row; URL text becomes summary/worked example | Import owners add version storage and extraction. Search consumes accepted revisions. |
| `src/components/ui/index.tsx` | Panel, loading, empty and error primitives | Reuse current components and keyboard conventions. |
| `src/lib/research-os/privacy.ts` | Fixed-table export/delete flow | Extend if the later receipt or evaluation data stores user-linked material. |
| `src/lib/research-os/llm.ts` | OpenAI-compatible generation adapter | Typed extraction remains a later experiment after retrieval; no generator dependency for the encoder. |
| `tools/hypothesis-engine/hte/belief.py`, `runner.py`, `canon_writeback.py` | Existing dependence discount; runner and reconstruction differ in passing source metadata | Offline parity fixture before research baselines. Engine work targets `hte/integration`. |

The authorization findings are code inspection results. Runtime impact has not been measured. They are prerequisite defects for this integration.

## Flow

```mermaid
flowchart LR
  F[Workspace Find] --> A[Session, consent, adult pilot gate]
  A --> E[Current public eligibility]
  E --> B[Server BM25]
  E --> W[Local encoder worker]
  B --> V[Server fusion and live validation]
  W --> V
  V --> C[Source cards]
  C --> N[Open source node]
  N --> Q[Curated Quote]
  Q --> R[Durable quote receipt]
  R --> P[Existing Check and Produce rules]
```

Opening a result goes to `/research-os/n/<slug>`. It does not change the research target or insert the result's ID into the learning path. A proposed `EvidenceSearchContext.tsx` provider in the existing app layout holds the latest target slug, query, request revision and pending selection across the workspace/source routes. Keep one bounded entry per tab with a 15-minute expiry; clear on account change or logout. A full reload or direct source link has no retained query or target: show Open workspace and require an explicit target choice before target-bound Quote. Raw queries stay out of URLs and persistent browser storage. The source page shows its own Sources action. This makes the initial Find to Quote path concrete without implying that a found node has become evidence for another node.

The next passage slice adds Select source for this target with separate `targetNodeId` and `sourceNodeId`. A selected source never substitutes for the target. Check, secondSource and Produce adopt that receipt only after their consumer contract tests pass. Search alone writes no standing, graph edge, production or quote event. An explicit Quote action appends evidence. `onQuoteReturned` keeps fromStage and toStage equal and awards no stage or XP increase; concurrency tests preserve that rule.

## Authorization boundary

Introduce proposed `src/lib/research-os/read-access.ts` around existing access helpers. For authenticated workspace operations use `verifyLearner` or `verifyLearnerIdentity`, apply `requireConsent`, and load current viewer groups/grants on the server. Anonymous GET search retains public-only reading, with no standing attached. An invalid supplied credential returns 401; it cannot grant a personalized response. Signed-in GET search applies consent before loading personal standing. Apply the adapter to GET search, Locate, secondSource Locate, Quote, Check grounding and both Check phases. Authorize every prerequisite summary before Check phase 1 grounding, including both ends of traversed edges. Omit inaccessible prerequisite content and abstain if the remaining grounding is insufficient. Recheck the held attempt's node, all grounding sources and selected corroborating source on reveal. A revoked input denies the held verdict and requires a new attempt. Preserve session binding, forcing and class policy.

Authorize before candidate ranking, text hydration, model calls and evidence writes. The service-role client receives no exemption. The existing paths continue to permit public, owned and valid-granted material under `canView`; expired or revoked grants fail. Batch access reads to avoid per-result queries. Deny on access-store errors, without treating an error as public permission.

The adapter returns typed allowed/denied/unavailable results. Existing helpers that collapse a database failure into empty grants need error-preserving wrappers. Null or unknown visibility and malformed grant expiry fail closed in the touched paths; data repair can assign an explicit value later.

| Operation | Identity and policy | Required access and expected denial |
|---|---|---|
| GET graph search | Anonymous public read; authenticated users require consent for personalized search | `canView` for every result, current groups/grants for signed-in users. Anonymous sees public only; hidden rows produce no hit. |
| Workspace Locate and secondSource | Verified session and consent | `canView` on every candidate and the quoted reference source. A hidden reference fails without content; hidden candidates are removed. |
| Curated or imported Quote | Verified session and consent; imported pilot also needs adult allowlist | `can(source, viewer, "cite")` plus source copying/quotation rights. A shared view-only grant permits reading but fails Quote. A target-bound receipt also requires `can(target, viewer, "continue")`. |
| Check and held reveal | Same learner owns the attempt; session/consent and forcing gates pass | `can(target, viewer, "continue")`; current view for every prerequisite; valid current cite authority for every supplied receipt. Revocation returns no held verdict or excerpt. |
| New evidence search and source resolver | Flag plus adult pilot gate | Current public corpus eligibility and read rights for every source; current view of an optional target. Private/shared imports stay outside this pilot. |
| Produce and review | Existing production ownership/reviewer rules remain | Current source receipt validation plus the existing action verb on the target. A receipt grants no review role or target access. |

The new route also requires flag on, a verified user ID in server-side `RESEARCH_OS_AI_SEARCH_PILOT_IDS`, and a stored `18plus` profile. A reviewer/staff role alone grants no pilot access. A consented minor or unknown age fails this gate. Account age data is self-reported and supplies an operational pilot filter. A child-facing launch needs separate age assurance. Direct API callers face the same gates as the UI. Existing burst/daily limiters apply; a worker failure cannot bypass them.

The new index contains an explicit allowlist of accepted public nodes with copied-text permission. At request start the API resolves the currently eligible IDs and revisions, covering the whole pilot corpus. That set constrains lexical and vector scoring before inference. The worker may hold a stale revision on disk, but cannot score or return it outside the request's eligible set. Before response hydration the API loads current access and revision state again. A graph failure returns 503; fallback cannot use an unchecked snapshot.

For revoked or deleted sources: block them at the next authorization read, tombstone them, cancel queued jobs using them, and rebuild affected artifacts within 24 hours. Delete superseded worker/index copies and caches within that window; backups inherit the retention record. An in-flight response uses the last server eligibility read; bytes already delivered cannot be recalled. Quote performs a fresh check and can refuse an earlier result. Responses use `Cache-Control: private, no-store`; the pilot has no result cache. Flag-off blocks requests, then drains and stops the worker.

## Source identities

The first slice uses file-backed text/index artifacts and a small database admission registry. Indexing does not ingest or promote graph nodes. Acquisition/import jobs remain the owners of graph writes. The registry supplies the mutable rights/revocation authority that a file manifest cannot provide inside the Quote transaction.

| Field | First slice | Imported-passage slice |
|---|---|---|
| `nodeId` | Existing graph UUID | Optional graph link; never fabricated |
| `sourceId` | Stable `graph:<uuid>` key | Stable import/provider identity, with DOI/arXiv normalization and alias map |
| `sourceRevision` | SHA-256 of a canonical manifest containing indexed-text hash, citation fields, extraction version and curated span/locator hashes when present | SHA-256 of immutable source bytes plus extraction version |
| `passageId` | Omitted for summary cards; curated catalog key for Quote | Revision plus offsets and text hash |
| `locator` | Existing catalog locator; null for summaries | Page/section plus offsets into the retained extracted text |
| `rights` | Decision, allowed uses, source of permission and review date | Same, plus upstream withdrawal/terms status |
| `graphRevision` | Snapshot metadata plus body hash, rechecked against live node | Current mapped node revision checked beside source revision |

The access increment creates proposed `graph.evidence_source_admissions`: sourceId, sourceRevision, bodyHash, extractionRevision, optional nodeId, rightsRevision, allowIndex, allowQuote, status, permissionEvidence and reviewedAt, with primary key `(sourceId, sourceRevision)`. Status is staging, active or withdrawn. Server-owned admission jobs populate curated catalog revisions first; no browser or inference worker can write these rows. A curated Quote hash must match the active registry revision. Source withdrawal updates this row before rebuilding files; the Quote RPC locks and checks this row, the target and mapped source node, and relevant grants/memberships in the same transaction. It reads rightsRevision and status under those locks. An older manifest cannot override a withdrawn row.

Admission is a control-plane action: verify permission evidence, build and validate immutable artifacts, insert staging metadata, then activate the admitted revision for the manifest being promoted. The server requires agreement among active registry revision, artifact hash and loaded index. Mismatch denies that source or disables the revision. Existing graph visibility remains an additional constraint. A corpus build can prepare staging files; activation requires the admission job's transaction. The import owner later exposes its authoritative source/rights rows through the same adapter and either retains this registry as a checked projection with a shared transactional revision fence, or migrates its authority in a dedicated reviewed migration. Independent unsynchronized rights stores are prohibited.

Proposed `scripts/research-os/evidence/` builds `manifest.json`, `sources.jsonl`, `passages.jsonl` when available, lexical data and a float32 vector matrix under an ignored local data directory. The manifest pins corpus hash, accepted source IDs, model and tokenizer revisions, preprocessing code commit, dimension, metric and rights review. Fail the build on missing rights or duplicate/conflicting canonical IDs. Debug with up to 500 permitted records; a smaller accepted subset is enough for the first UI walk. The evaluated release corpus needs at least 2,000 records under the acquisition and judgment gates in [EVALUATION.md](EVALUATION.md).

For MiniLM, start with its native tokenizer and 192-word-piece chunks with 32-piece overlap. Use half-open UTF-8 byte offsets into immutable NFC-normalized text with LF line endings, pinning the normalization algorithm. Reject offsets inside a multibyte character. Python and TypeScript fixtures must agree on emoji, combining marks and CRLF input. Store both original-byte hash and normalized-text hash so normalization never masquerades as an exact original span. Candidate models share source boundaries and use their own pinned tokenizer. Deduplicate by source identity before the top five cards. A node summary is labelled Summary; a locator-backed source excerpt is labelled Passage.

Versioned imported passages depend on `ros-import 1`, `ros-import 2` and `ros-import 3`. `SourceItem` is design terminology in import discussions; this audit found no implemented TypeScript `SourceItem` or versioned passage table. The import owner chooses the shared storage schema. This feature adapts it through proposed `resolveAcceptedSource({sourceId, revision, passageId, viewer, verb})`, returning a typed allowed record with immutable text, offsets, hashes, provenance, rights, current eligibility and optional graph mapping, or denied/stale/unavailable. The import owner accepts this interface before the passage integration starts. Version-2 corpus building and per-request eligibility resolve both source records and any graph mappings through it; a mapped node can narrow access. Storage migration names remain owned by ros-import 1/3. This avoids a second import system. Sources lacking a graph mapping can open their accepted source record later; they cannot be passed as graph UUIDs to the current Quote route.

## API and worker contracts

New paths below are proposed, to be created in implementation Beads.

| Path | Responsibility |
|---|---|
| `src/lib/research-os/evidence-search/types.ts` | Versioned request/result unions and runtime validators |
| `src/lib/research-os/evidence-search/server.ts` | Adult gate, eligibility, worker transport, live result hydration |
| `src/lib/research-os/evidence-search/lexical.ts` | In-process BM25 and rank fusion over the pinned permitted artifact; remains available when the worker stops |
| `src/app/api/research-os/evidence-search/route.ts` | POST boundary; no user identity in the body |
| `src/app/research-os/(app)/workspace/EvidenceResults.tsx` | Cards and source opening with current primitives |
| `tools/evidence-search/` | Isolated Python package, locked runtime, model registry, vector builder, encoder and optional reranker worker |
| `services/` | Opt-in user service and operator runbook after resource measurement |

POST accepts `{schemaVersion:1, query, branch, targetNodeId?, limit:5}`. `branch` must match the active target when a target is supplied; authorize that target before use. Branch-only requests accept a known graph branch. Trim without ASCII stripping; bound query to 512 Unicode code points and request body to 8 KiB. Reject unsupported fields that could change worker options. Never accept model paths, URLs, executable names or source bodies from the client.

Success returns `{schemaVersion:1, requestId, mode, corpusRevision, modelRevision, cards, status}`. `mode` is `hybrid` or `lexical`; `status` is `ok`, `no_match` or `degraded`. Each card contains `nodeId`, `slug`, `sourceId`, `sourceRevision`, `title`, `citation`, `kind`, `excerpt`, `locator`, `quoteAvailable`. `kind` is `summary` or `passage`; only a passage can have a locator. Use a discriminated union and reject invalid combinations. Score/distance is internal ranking data. `quoteAvailable` is true only for a currently authorized curated passage in the first slice. Empty allowed corpus yields `no_match` with an explanation.

HTTP outcomes: 400 invalid request, 401 no session, 403 consent/adult/pilot denied, 404 feature off, 429 limit reached with retry information, 503 authorization or corpus unavailable. A healthy lexical fallback returns 200 `degraded` with user text saying keyword search is in use. No eligible source is an ordinary empty state. Malformed worker output is discarded and counted as a worker failure.

Next owns BM25 and fusion through `lexical.ts` for both healthy and fallback requests. Python supplies dense scores and optional reranking only. The same Node lexical implementation is called by evaluation and live API code. BM25 fixtures pin tokenization, term frequencies, document lengths and tie breaking. Eligibility masking precedes lexical scoring as well as vector scoring. The server retains the same revision's lexical data in a bounded read-only mapping; a dead worker cannot disable it. If the lexical artifact or live eligibility store is unavailable, return 503. Fuse server BM25 and worker dense candidates, then request an optional rerank on at most 20 eligible IDs within the shared deadline. Worker timeout, crash or restart skips neural/reranker results and uses the server's checked lexical ranking with visible degraded mode. Both modes apply development-frozen acceptance thresholds and the no-answer gate.

Bind the worker to loopback; authenticate its server-to-worker requests with a local secret loaded from the environment. Do not expose browser credentials or Supabase service keys to it. Validate host/path configuration at process start. The worker has no shell or browsing tools and loads approved local weights with remote custom code disabled. It accepts a request ID, bounded query, pinned corpus revision and eligible source/revision set. It returns only ranked IDs and finite scores; Next hydrates text from trusted artifacts after live checks. Reject unknown, duplicate, stale or ineligible IDs and mismatched revisions.

One worker handles a bounded queue of four requests, one active model computation, at most eight CPU threads. The server fuses at most 100 unique candidates per search. Optional reranking sees at most 20 candidates, 512 combined query/passage tokens each. Return five source cards. The end-to-end deadline is eight seconds, with a total worker-call budget of six seconds across dense and optional rerank calls and the remaining budget for checked lexical fallback and response. Queue overflow returns a checked lexical result or 503 if the remaining deadline cannot support it. Cancellation removes queued work; active computation stops at its bounded stage boundary. A hung computation causes a worker restart, without an unbounded replacement queue.

Start with cached `sentence-transformers/all-MiniLM-L6-v2`. Resolve an immutable weight/tokenizer revision and verify files/license before inference; a cache folder is insufficient. Pin exact runtime versions in the worker lockfile. Exact vector search is the initial implementation. Compare at most two encoders and one optional reranker; SPECTER2 and Qwen3-Reranker-0.6B are candidates, subject to rights and runtime probes. No model download occurs during an HTTP request. The [MiniLM model card](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) and [Qwen reranker card](https://huggingface.co/Qwen/Qwen3-Reranker-0.6B) are acquisition references. Runtime certification requires the local probe.

## Quote contract

First repair the current curated Quote action. Rehydrate text with server `getPassage(slug)`, authorize the node and persist `onQuoteReturned` evidence before reporting durable success. Add a server-verifiable receipt identifier and an idempotency key scoped to user, session, source revision and action. A retry returns the prior receipt. Evidence-write failure returns a retryable error, with no durable-success indicator. Summary fallback carries `kind:summary`, no locator and no quote receipt. The UI must distinguish a readable preview from a recorded quotation.

`db.ts:recordEvidence` reads an evidence array and then upserts it. Replace that shared writer with a transactional append RPC before enabling receipts. All writers to the same learner/node evidence row must use the RPC or an equivalent locked transaction, including existing Check and corroboration paths; an old read-modify-write caller could erase a new receipt event. Lock or create the learner/node row, append once, and preserve monotone stage rules. Quote uses the locked current stage without promotion or XP. Test mixed Quote/Check concurrency and duplicate retries, with no lost event or stage regression.

Create proposed `graph.source_quote_receipts` in the access increment, with UUID receipt ID, learner ID, target node ID, source ID/revision, optional source node ID, passage ID, locator, text hash, session ID, idempotency key, payload hash and created time. Curated Quote uses its source node as the receipt target; the later explicit target flow uses the active research target. A unique `(learner_id, idempotency_key)` constraint returns the existing receipt for an identical payload and 409 for key reuse with different content. Receipt insertion and its legacy-compatible quote event append occur in one transaction. Add the receipt ID to the event. A failed transaction yields no durable receipt. The RPC rechecks source and target authority and rights inside the transaction, locking the permission rows it uses against concurrent changes; Check grant expiry with wall-clock time after all locks are acquired, at the authorization decision point. Acquire locks in a fixed ID order, bound lock wait to one second and statement time to three seconds, and return a retryable error on timeout/deadlock. A lock-wait fixture must expire the grant before that decision and reject the write. Browser roles cannot invoke the service-only writer. Receipt reads enforce ownership and current source visibility.

The admission registry stores public source metadata and permission references without learner identifiers. The receipt table joins privacy export/delete and the deletion RPC in this first migration. Store references and span hashes, with text rehydrated from retained permitted revisions. sourceRevision identifies the complete admitted revision; bodyHash and each textHash identify their own normalized body/span. The curated registry includes the pinned catalog span and locator hashes, so an unchanged graph summary cannot conceal a changed quote. Deletion removes the identity-linked receipt and associated event under existing deletion policy. Legacy events remain readable under the existing locator contract and are labelled legacy; they do not masquerade as revision-pinned receipts. Both node Sources and workspace Quote clients adopt the durable response. A compatibility test proves old curated production validation still works, while new receipt-backed validation uses the stronger identity contract.

The imported-passage action later accepts `{targetNodeId, sourceId, sourceRevision, passageId, sessionId, idempotencyKey}`. It rehydrates an exact span from the server's immutable source revision, verifies offsets/hash and current rights/access, then writes a structured receipt. It never accepts quote text or a locator from the client as evidence. Stale revisions return 409 with a request to search again. A withdrawn source returns 404 without source details. The receipt stores target, source, revision, passage, locator and requesting identity; storage and privacy migration are reviewed together.

`production-guard.ts` currently checks locator strings against prior events. Imported receipts need structured matching through Check, secondSource and Produce before they can satisfy evidence requirements. Source independence still uses its existing reviewed rules. A search rank or shared wording proves neither dependence nor independence. There is no automatic canon or mastery update from a returned model score.

## Passage release contract

The node prototype uses API schema version 1. The passage release introduces schema version 2 behind the same disabled-by-default flag and a versioned client adapter. Unsupported versions return 400. Version 2 retains request query/branch/target bounds and response mode/status fields. Each card has a discriminant: `graph_node` requires nodeId and slug; `source_passage` requires sourceId, sourceRevision and passageId and permits an optional graph mapping. A missing mapping cannot block accepted public source inspection. Shared fields include title, citation, rights status and a preview kind. The server supplies both preview text and action availability after authorization.

Proposed GET `/api/research-os/evidence-source?sourceId=...&revision=...&passageId=...` resolves one accepted source version. Proposed `/research-os/sources/[sourceId]` renders its reader, using revision/passage in the URL and the active target in client state. Authenticate with the adult pilot gate, recheck current public eligibility before hydration and return a stored source URL plus the exact excerpt and locator. Unknown, withdrawn or inaccessible records yield the same 404 without details; stale versions yield 409 after current access has passed. The resolver accepts bounded opaque IDs and never fetches a client-supplied URL.

The reader's Select for target action records source selection in client state only, showing the original target title. The user then chooses Quote to target, calling proposed POST `/api/research-os/evidence-quote` with the imported-passage payload defined above. Validate target continue authority and source cite authority/rights. Return `{receiptId, durable:true, targetNodeId, sourceId, sourceRevision, passageId, locator, textHash, sourceNodeId?, createdAt}` only after the transaction commits. This is the receipt contract for both browser and Bearer clients. A changed target clears an uncommitted selection; a receipt can only be used with its recorded target.

| Consumer | Proposed receipt rule |
|---|---|
| Workspace and node Check phase 1 | Add `sourceReceiptIds`; load each owned receipt for the active target, recheck source cite/rights, rehydrate by revision/hash and construct grounding from validated spans. Store receipt IDs/revisions with the held attempt. A bad receipt fails the request before grading. |
| Check phase 2 reveal | Revalidate the stored target and source receipts; retain forcing/session controls. If a source was revoked or its retained revision is unavailable, refuse reveal and require a new attempt. No held grade or hidden prerequisite text appears in the error. |
| secondSource | Add a receipt-aware path beside legacy node IDs. Compare canonical source identities and reviewed source provenance; two versions of the same source fail independence. Unknown provenance cannot satisfy the second-source gate. An imported source without a node uses its source record's provenance through an adapter to the same pure independence rules. |
| Produce and review | Add `sourceRefs` linked to the user-visible source lines, carrying receiptId and line index. Validate receipt ownership, target, revision, locator and current rights server-side on submit and on approval. Imported references never pass via locator substring matching. Missing, mismatched or revoked references remain unverified and block acceptance. Existing curated legacy lines keep the existing path during migration. |

The server selects the receipt protocol for pilot production creation; omitting `sourceRefs` or a client version flag cannot select legacy validation. Every source line in a version-2 production requires one matching owned receipt reference, including curated sources. Persist the protocol version with the production and forbid updates that downgrade it or remove references while retaining their source lines. Reviewer approval reads this server-stored version. All imported quote events carry a server-set source origin and receipt schema version. Legacy quote-evidence loaders exclude imported/versioned events, so locator-only requests cannot use their locators as legacy proof. Existing non-pilot curated submissions keep their current contract. Tests cover dropping refs on create/update, changing protocol fields, and submitting imported locator text to the legacy path.

The passage E2E gate starts at an existing research target, finds a permitted imported source with no graph node, opens its reader, selects it for the original target, creates a durable receipt, and exercises Check plus production source validation. It also covers second-source rejection for two versions of one source and source revocation between Check phases. The node prototype E2E cannot satisfy this gate. `ros-ai-import-quotes` owns the version-2 card/resolver/client changes and these consumer adapters together; evaluation waits for this complete path.

## UI behavior

Find shows a Public evidence mode only after server eligibility succeeds. Existing mode and pilot mode use separate response adapters. The branch is visible from the active target, avoiding the present silent physics default. A card displays source title, summary or passage label, citation/locator when available, and Open source. Source URLs are stored, reviewed HTTP(S) URLs; user or model HTML is rendered as text.

Reuse `LoadingState`, `EmptyState` and `ErrorState`. Announce loading and results through an aria-live region, preserve input focus, support keyboard links, and ignore late responses after a newer query or target change using request IDs and AbortController. Keyword fallback is visible. No model error may leave stale cards looking like the current answer. The node's Quote action reports recording, recorded or retry state. A summary never displays a recorded-quote badge.

SearchPalette and TargetPicker retain their existing keyboard and result contracts. The map, Learn/FSRS, class assignments and production approval flow keep their current controls. A source-finding gain supplies no evidence of a learning gain.

## Operating envelope

The inspected host has a Ryzen 7 7840HS, 60 GiB RAM and an AMD Navi 33 GPU with about 8 GiB VRAM. The task's ROCm-enabled runtime detected zero GPUs. CPU is the committed initial execution path. Prove access from the worker's intended environment before GPU scheduling. No dependency on repairing the existing Ollama tier is required for the encoder worker.

Cap additional RAM at 8 GiB, dedicated VRAM at 6 GiB and new disk use at 20 GiB. Reserve 10 GiB available system RAM and 50 GiB free disk. Check capacity before builds and runs. Full swap was observed during the audit, so stop on pressure or interference with existing services. The runtime probe chooses batch sizes and records CPU, peak memory, model files and hardware visibility. One GPU job at a time; CPU fallback must pass the same release thresholds.

Build new immutable artifact directories and validate hashes, schema, source eligibility and a canary query set before atomic manifest promotion. Retain the previous permitted revision for rollback; withdrawn material is excluded from retained copies. Readiness reports exact loaded revisions, model availability and last eligibility synchronization. A model/index mismatch refuses neural traffic. Next may use the checked lexical artifact at the same corpus revision. Neither Vercel nor a remote deployment can use the founder's loopback worker. Hosted service, tunnel and remote telemetry require a later operating decision.

Retain aggregate latency/error counters and random request IDs for seven days. Default logs omit query text, learner identity, source selections and payloads. Opt-in evaluation exports stay local, get a retention date and documented deletion method, and use pseudonymous task IDs. No ordinary usage data enters training. New user-linked tables must join privacy export/delete tests and the relevant deletion RPC before use.

## Verification and release

Existing pure tests cannot prove route authorization. Add route tests against local Supabase plus a Playwright path. Register new test commands in `package.json`; proposed scripts are `test-research-os-evidence-search.ts`, `test-research-os-quote-receipt.ts` and `tests/e2e/evidence-search.spec.ts`. Python worker tests run without network; a separate real-checkpoint smoke test proves model integration.

| Gate | Evidence required |
|---|---|
| Access | GET search, Locate, secondSource, Quote, Check phases and new search exercised for anonymous, allowed adult, denied adult, minor, unknown age, owner, grantee and expired/revoked grant. Spy worker proves unauthorized bytes never arrive. |
| Revocation | Public to private during request, stale revision, source withdrawal, grant expiry during Quote, access-store failure, index rollback and queued work cancellation. Assert no stale excerpt or receipt. |
| Quote | Exact span/hash match, summary rejection, malicious client span ignored, persistence failure, duplicate retry and concurrent requests. Receipt resolves through production evidence validation; source cite permission and target continue permission are checked. Mixed Quote/Check transactions preserve every event and Quote keeps stage and XP unchanged. |
| UI | Cookie login, Find paraphrase, open source, curated Quote, durable citation, return to target; keyboard use, no-match, timeout, fallback and late-response suppression. The passage release adds the unmapped-source target-bound receipt walk defined above. Bearer tests cover direct API bypass attempts. |
| Model | Pinned weights perform a query embedding and change ranking on prespecified paraphrase fixtures. Capture model/index revisions and observed calls. Mock results alone fail this gate. |
| Quality | Full-corpus BM25 comparison, sealed judgments, nDCG and no-answer gates in EVALUATION. Adequate power within founder time must be established. |
| Runtime | 200 warm requests at concurrency one, 200 at concurrency two and 20 cold starts. Warm p95 <=2 s at concurrency one and <=5 s at concurrency two; cold p95 <=5 s, errors <=1%, eight-second hard deadline and stated memory/disk caps. Count degraded responses apart from neural successes. At least 99% of eligible requests in the healthy load run must execute the selected neural path; injected worker-down cases are a separate recovery test. The load sample cannot pass by returning lexical fallback for all requests. |
| Rollback | Disable flag, reject new pilot requests, drain worker, restore allowed prior index, confirm existing default search and Quote contracts. No graph undo is required. |

Implementation PRs run `npm run test:auth`, `npm run test:research-os`, `npm run typecheck`, `npm run lint` and applicable build checks, plus the new route/browser/worker tests. The planning PR validates documentation links, JSONL records, reviewed hashes and the diff. It does not assert a runtime test pass.

A local integration walk may precede the powered evaluation and remains a development prototype. Adult pilot activation requires all applicable gates, founder release review and a critic score above 9/10 with every dimension at least 8 and no unresolved high/critical blocker. Any unauthorized disclosure disables the feature. A quality result below threshold or an underpowered sample leaves neural mode disabled outside development.

## Execution order

`BEADS-PENDING.jsonl` holds the execution records under source `research-os-ai`. The keys below are stable title prefixes until real Beads IDs are assigned. Dependencies are in each description. These records initiate the queue; no item is marked implemented by this PR.

| Key | Depends on | Result and scope |
|---|---|---|
| `ros-ai-access` | None | Authorization parity and curated Quote persistence/retry contract. First implementation PR to dev. |
| `ros-ai-corpus` | Access | Accepted public-node manifest, rights, canonical identities and local artifact validator. |
| `ros-ai-worker` | Corpus | CPU encoder worker plus server-owned BM25/fusion, authenticated bounded transport, real smoke test and resource probe. |
| `ros-ai-find` | Access, worker | New API and workspace Find to source-node Quote browser path. |
| `ros-ai-eval` | Find, imported quotes | Sealed comparison, runtime/revocation tests and release decision. |
| `ros-ai-import-quotes` | Find, ros-import 1/2/3 | Shared versioned source contract and structured receipt consumers, as subwork of ros-import 4 to 5. |
| `ros-ai-hte-parity` | Eval | HTE runner/reconstruction source-metadata parity fixture and result on hte/integration. |
| `ros-ai-research` | Eval, ros-truth 1/2, HTE parity | Four-hour acquisition audit, prior-art comparison and power decision; offline research only. |
| `ros-ai-watch` | Corpus | Record primary-source developments and propose bounded candidate replacements at milestones. |
| `ros-ai-roadmap` | PR #190 lands | Add these title keys to its single roadmap with dependency checks and founder stage decision. |
| `ros-ai-dispatch` | None | Reconcile only these pending records with Beads, with duplicate-safe dispatch and dependency IDs. |

The unmerged [roadmap PR #190](https://github.com/bucket-foundation/bucket-foundation/pull/190) was inspected at `8bc259867`. Its canonical list is proposed `src/lib/research-os/roadmap.ts`, rendered at `/research-os/roadmap`. This PR creates no competing array. `ros-ai-roadmap` waits for that merge and preserves its MVP/near/later test. The adult local pilot can be scheduled after access work; a proposed stage requires founder agreement. Existing `local model tier` is an Ollama task, and `ros-31` owns broader workspace tools. This plan adds no automatic promotion of either.

The current pending dispatcher sends two POSTs per attempted creation to obtain body and status. Do not use it to drain this batch until a one-request implementation and duplicate/retry tests land. Reconcile by exact source/title, retain a pending-key to returned-ID map, create each missing item once, add real dependency edges with `bd dep add`, and read back the graph before retiring pending rows. An ambiguous timeout requires lookup before retry. Pending title references are not enforceable Beads edges until that reconciliation succeeds. The supplied preflight failed from this client; it does not establish an API outage. Queue fallback follows repository instructions while connectivity is unresolved.

Days 1-2 cover access tests, source admission and a runtime probe. Week 1 aims for the accepted-node development walk if those pass. Weeks 2-5 aim for source version integration, corpus scale and powered evaluation. The full passage workflow and its 2,000-record evaluation wait for ros-import 1/2/3 and the quote adapter; the early node prototype cannot satisfy that release gate. If import dependencies miss this window, the pilot remains a development prototype and the schedule moves. Week 6 is the adult pilot release decision. Weeks 7-12 cover the contingent research audit and study under [EVALUATION.md](EVALUATION.md). Import readiness and label acquisition can delay those windows; gates determine progress. If research power or data acquisition fails, publish the feasibility result and retain the validated retrieval product.

Site implementation PRs target `dev`; HTE implementation PRs target `hte/integration` before the batch to dev. Keep the primary checkout on dev, use separate worktrees, claim work through Beads and open one PR per bounded change. Each PR includes Secrets and QA review tables. Founder owns priorities, human judgments and release decisions; implementation agent owns code and tests; evaluation agent holds the sealed set; critic rejects unsupported claims.

## Research and industry connection

[EVALUATION.md](EVALUATION.md) preserves the source-aware replication forecast as a contingent research direction, with dated evidence, independent outcome labels, leakage controls and stronger baselines. A source-copying algorithm already exists in the literature. Novelty needs a closest-work comparison and external review. The output may be a replication, a negative result or a feasibility dataset.

The daily AI industry watch already runs through the operator's scheduled task at 09:00 America/New_York. Watch open and commercial methods when the mechanism transfers: retrieval, scientific reasoning, typed decisions, learning evidence, model/runtime changes and license changes. Primary-source claims become experiment proposals after rights and compute review. Jev's typed probabilities and DeepSeek's architecture are comparison leads. Neither vendor agreement scores nor schema-valid output establishes Bucket task accuracy. Preserve the frozen holdout; a changed arm after test access needs a new holdout. No daily news item can activate models, change learning rules or expand spending.

Teacher source preparation follows educator review. K-12 use requires its own institutional/data/consent review and a study of delayed transfer on unseen items. Retrieval performance cannot substitute for education outcomes. Academy scheduling, truth-level design and production approval remain separate decision systems.
