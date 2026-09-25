# Bucket core integration evidence

## Graph and learning route

### Takeaway
Bucket has a graph-backed learning route with learner state and prerequisite traversal. A minimum-effort learning plan needs new semantics and validation around that route.

### Cited Findings
- Inspection baseline: Git HEAD `ce7f93952d353ed3127625470c4155fd17ed2ab3`. The service client uses the Supabase `graph` schema. Nodes carry provenance, visibility and frontier flags; prerequisite edges carry confidence and weight. [Database client](/home/gian/agfarms/bucket-foundation/src/lib/research-os/db.ts:21) [Graph types](/home/gian/agfarms/bucket-foundation/src/lib/research-os/types.ts:72)
- The workspace calls `/api/research-os/route`. The route loads a branch with external factors, filters by viewer access, loads learner stages and ancestor rows, then calls `computeFrontier`. These are connected source paths; deployment was not checked. [Workspace caller](/home/gian/agfarms/bucket-foundation/src/app/research-os/(app)/workspace/page.tsx:292) [Route](/home/gian/agfarms/bucket-foundation/src/app/api/research-os/route/route.ts:33)
- `computeFrontier` traverses incoming prerequisites, stops at roots or stage `understanding` and above, and uses accumulated negative log confidence with hop count as a tie-break. It returns all finalized nodes sorted by descending hops. The cost calculation has no learning-time input. [Algorithm](/home/gian/agfarms/bucket-foundation/src/lib/research-os/frontier.ts:76)
- `gap` excludes every frontier node, including unmastered roots. Access filtering removes unreadable nodes and their edges before traversal. The algorithm treats a node with no remaining prerequisites as a root. [Gap](/home/gian/agfarms/bucket-foundation/src/lib/research-os/frontier.ts:145) [Access filter](/home/gian/agfarms/bucket-foundation/src/lib/research-os/access-db.ts:59)
- Academy mastery combines proficiency and retention, with a 0.7 mastery threshold. The Academy progress route calls the graph synchronization function, which maps atom IDs through provenance and records graph stage advancement. [Mastery](/home/gian/agfarms/bucket-foundation/src/lib/academy/mastery.ts:16) [Progress caller](/home/gian/agfarms/bucket-foundation/src/app/api/academy/progress/route.ts:135) [Synchronization](/home/gian/agfarms/bucket-foundation/src/lib/research-os/learn-sync.ts:23)

### Inferences
- Define learning slope as estimated effort and prerequisite readiness per concept. Preserve all required branches, count shared prerequisites once, and compute a topological study order. A descending shortest-hop sort cannot guarantee that order when a prerequisite has a shorter alternate route to the target. This follows from the algorithm at `frontier.ts:103-143`.
- Track unavailable prerequisites and incomplete graph coverage. Otherwise a filtered prerequisite can produce an apparent foundation. Include unmastered roots in remaining work. Require assessment-backed mastery for prerequisite satisfaction; the route consumes stage labels without checking their evidence.
- Distinguish pedagogical foundations from historical discovery dates. Both can use the graph, with separate relation semantics.

### Gaps
- No runtime, database, production coverage or deployment checks were performed. Inspected source does not establish that all prerequisite branches exist or that stage labels prove current competence.

## Model and review seams

### Takeaway
The strongest first model integration is prerequisite proposal generation through the existing review queue, followed by grounded tutoring. The TypeScript client can call an OpenAI-compatible endpoint; model-specific behavior still requires an evaluation.

### Cited Findings
- Provider selection prefers `LLM_BASE_URL`, then Anthropic. Local configuration accepts model, key and timeout settings. The client sends non-streaming `/chat/completions` requests and reads content plus usage. It exposes no role-based provider router or structured-output parameter. [Selection](/home/gian/agfarms/bucket-foundation/src/lib/llm/provider.ts:1) [Client](/home/gian/agfarms/bucket-foundation/src/lib/llm/client.ts:30)
- The edge inference CLI calls this shared client, records model and prompt hashes, writes preview files and queues proposals in `edge_proposals`. It has no apply mode. Reviewer-authenticated API decisions accept prerequisite or derivation edges; review actions check cycles. [CLI](/home/gian/agfarms/bucket-foundation/scripts/research-os/ingest/infer-edges-llm.ts:58) [Reviewer API](/home/gian/agfarms/bucket-foundation/src/app/api/research-os/edges/route.ts:24) [Cycle check](/home/gian/agfarms/bucket-foundation/src/lib/research-os/inference/review-actions.ts:245)
- Candidate selection starts from lexical proposals plus a tier-adjacent sample. The candidate carries titles and summaries. This constrains what a model can infer and requires source-backed evidence additions for auditable prerequisite proposals. [Candidates](/home/gian/agfarms/bucket-foundation/src/lib/research-os/inference/propose.ts:7) [Selection](/home/gian/agfarms/bucket-foundation/src/lib/research-os/inference/propose.ts:61)
- The Academy tutor client calls its API, which injects the shared completion client. The handler builds atom-scoped grounding and citation allowlists, checks daily limits, checks answer leakage and retries before withholding a reply. [Browser caller](/home/gian/agfarms/bucket-foundation/learning/app/js/tutor.js:4) [Route](/home/gian/agfarms/bucket-foundation/src/app/api/academy/tutor/route.ts:16) [Handler](/home/gian/agfarms/bucket-foundation/src/app/api/academy/tutor/handler.ts:200)
- Cost accounting falls back to Sonnet prices for unknown models. A DeepSeek or Laya rollout needs model-aware pricing and model IDs in usage records. [Pricing](/home/gian/agfarms/bucket-foundation/src/lib/research-os/llm.ts:36)

### Inferences
- Evaluate each proposed model on the same reviewed prerequisite pairs and grounded tutoring fixtures. Keep route computation deterministic. Model agreement supplies a review signal; learner assessments supply mastery evidence.
- Add per-role model configuration before using two models in the same TypeScript deployment. Preserve the proposal acceptance boundary and record source spans alongside prompt/model identity.

### Gaps
- Model capabilities, licenses and hosting feasibility belong to the model-card investigation. No model calls or runtime tests were executed. Relevant existing suites include `scripts/test-llm-contract.ts`, `scripts/test-academy-tutor-route.ts`, `scripts/test-research-os-closure.ts`, `scripts/test-research-os-learn-sync.ts` and `scripts/research-os/ingest/test-ingest-infer-llm.ts`; file presence does not establish passing status.

## Evidence and Python systems

### Takeaway
Bucket has distinct evidence, history and hypothesis paths. Python services use two different model integrations, so changing the TypeScript environment does not replace every model.

### Cited Findings
- Canon claims feed production duplicate checks; canonical source signoff feeds review. History has its own reviewer-gated promotion and preference operations. [Production](/home/gian/agfarms/bucket-foundation/src/app/api/research-os/production/route.ts:129) [Signoff](/home/gian/agfarms/bucket-foundation/src/app/api/research-os/review/route.ts:357) [History](/home/gian/agfarms/bucket-foundation/src/lib/history/review.ts:321)
- The hypothesis API checks production ownership and node access before forwarding to `HTE_SERVE_URL/hypothesize`. The HTE server calls its Python API. Its model wrapper invokes `claude -p` with role-based model policy and JSON schema. [Proxy](/home/gian/agfarms/bucket-foundation/src/app/api/research-os/hypothesize/route.ts:35) [Server](/home/gian/agfarms/bucket-foundation/tools/hypothesis-engine/hte/serve.py:89) [Model wrapper](/home/gian/agfarms/bucket-foundation/tools/hypothesis-engine/hte/llm.py:312)
- Research-tools Python has a separate OpenAI-compatible client using `LLM_BASE_URL`, `LLM_MODEL` and `LLM_API_KEY`. RAG synthesis and protocol polishing call it. [Client](/home/gian/agfarms/bucket-foundation/services/research-tools/llm_client.py:28) [RAG](/home/gian/agfarms/bucket-foundation/services/research-tools/tools_rag.py:775) [Protocol](/home/gian/agfarms/bucket-foundation/services/research-tools/tools_protocol.py:274)

### Inferences
- Start with graph proposal and tutor evaluation. HTE needs a provider adapter to introduce another model family, including its refusal, truncation and schema contracts. Preserve source provenance and accepted knowledge boundaries across model changes.

### Gaps
- Graph engine node-upsert helpers exist in `db.ts:723` and `db.ts:757`; inspection found no caller within `src`. This does not prove the absence of script or external callers. The hypothesis proxy returns results and contains no graph write. Deployment and external ingestion wiring remain unverified.
