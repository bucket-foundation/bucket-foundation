# Research OS for K-12 on Bucket Foundation

Architecture design document. Target: a system that takes a learner from the first fact they can hold to the research frontier, on one map, inside the nonprofit Bucket Foundation stack.

## 0. Grounding and scope

Bucket Foundation is not a blank slate. Three pieces already in production or in-repo change what this design has to do:

1. **Bucket Academy** (`learning/`, `src/lib/academy/`, `src/app/academy`, `src/app/ladder`) is a shipped adaptive learning engine for adult autodidacts: FSRS spaced repetition (`fsrs.js`), an IRT/Elo proficiency model fused with FSRS retention as `M = P^alpha * R^beta` (`adaptive.js`, ported server-side in `mastery.ts`), a Recall to Apply to Derive to Teach depth ladder surfaced as `/ladder` (L0 to L5), cross-device progress synced to a private `bucket` Postgres schema not exposed over PostgREST, and Open Badges 3.0 / W3C Verifiable Credential issuance (`src/lib/academy/credential/`). `learning/EPIC.md` and `learning/research/landscape/MASTERY-PROFILE.md` already specify a two-layer graph (`requires` + `encompassing`, with FIRe fractional credit propagation), an ALEKS-style diagnostic, a practice/credential firewall with sealed held-out transfer items, and a hard validation guardrail before any mastery score ships publicly.
2. **The canon** (`bucket-canon/`) has grown past the seven branches named in org docs: it now holds ten, including `08-deep-history`, `09-sacred-texts`, and `09-art` alongside mathematics, physics, chemistry, information, biophysics, cosmology, and mind. The canon filter stays strict (foundations, axioms, laws, primary derivations only), so it will never hold "2 + 2 = 4" or "capital of France."
3. Academy's compliance posture is written for **13-plus** users (GDPR 13+ line in EPIC.md, email-OTP auth, no wallet in the student-facing UI). A K-12 Research OS has to serve a six-year-old, which the current stack has never had to do.

This design extends Academy and the canon rather than replacing them. The delta this document adds: an **atom layer** beneath the canon for the facts and skills a K-12 curriculum needs that don't clear the foundations bar, a **five-stage state machine** (Access, Awareness, Understanding, Internalization, Production) generalizing Academy's four-stage depth ladder with an added access gate, a **school and teacher layer** (roster sync, LTI, class views) Academy has never needed for an individual-learner product, **under-13 identity and custody** (COPPA, FERPA, no learner-facing wallet, custodial payout), and **frontier-backward routing**, which Academy's diagnostic does in reverse (place an expert mid-graph) but a K-12 product needs run forward from a child's curiosity question back to what they already hold.

Everything below assumes this delta ships as a layer inside the existing repo, with `src/app/academy` becoming one surface among several and the graph, state, and credential primitives shared across all of them.

---

## 1. Component architecture

```
                                    ┌───────────────────────────────────────────────┐
                                    │                    CLIENTS                       │
                                    │  student-web (canvas)   teacher-web (class view) │
                                    │  parent-web (consent, view-only)                 │
                                    │  mobile (React Native, offline-first sync)       │
                                    │  agent API (feed402 envelope, zero-key, capped)  │
                                    └────────────────────┬──────────────────────────────┘
                                                          │ HTTPS, OIDC session, LTI 1.3 launch (signed JWT), feed402 request
                                                          ▼
                                    ┌───────────────────────────────────────────────┐
                                    │              GATEWAY (Vercel edge + Next.js)      │
                                    │  middleware.ts: session check, LTI/OIDC verify,   │
                                    │  rate limit, age-tier routing, feed402 wrapper    │
                                    └────────────────────┬──────────────────────────────┘
        ┌──────────────────────┬──────────────────────────┼──────────────────────────┬──────────────────────┐
        ▼                      ▼                          ▼                          ▼                      ▼
┌───────────────┐    ┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐
│ GRAPH SERVICE   │    │ LEARNER STATE svc   │    │ WORKSPACE / AI svc  │    │ PRODUCTION svc      │    │ SCHOOL svc          │
│ node/edge CRUD, │    │ 5-stage state,      │    │ locate/quote/check/ │    │ envelope intake,    │    │ roster sync (Clever/│
│ frontier-       │    │ Elo+FSRS fusion,    │    │ organize tool       │    │ AI pre-check,       │    │ ClassLink/OneRoster)│
│ backward route, │    │ evidence ledger,    │    │ surface, canvas     │    │ review queue,       │    │ LTI 1.3 launch+AGS, │
│ diagnostic probe│    │ decay scheduler     │    │ state                │    │ citation tracking   │    │ class graph, reports │
└───────┬─────────┘    └──────────┬──────────┘    └──────────┬──────────┘    └──────────┬──────────┘    └──────────┬──────────┘
        │                         │                          │                          │                          │
        └─────────────┬───────────┴──────────────┬───────────┴──────────────┬───────────┴──────────────┬───────────┘
                       ▼                          ▼                          ▼                          ▼
        ┌───────────────────────────┐  ┌───────────────────────────┐  ┌───────────────────────────┐
        │   ASYNC WORKERS             │  │        AI LAYER              │  │  PAYMENTS / CUSTODY svc     │
        │  ingestion pipeline,         │  │  router: Haiku-tier for      │  │  custodial ledger per        │
        │  dedupe + edge inference,    │  │  organize/grading-lite,      │  │  learner (school- or         │
        │  closure table refresh,      │  │  Sonnet-tier for check/     │  │  parent-held), x402          │
        │  CDC to Neo4j, payout batch, │  │  tutor dialogue, cached,    │  │  settlement (operator wallet │
        │  credential issuance         │  │  budgeted, S1/S7 filtered   │  │  only, never learner-facing) │
        └──────────────┬──────────────┘  └──────────────┬──────────────┘  └──────────────┬──────────────┘
                       └──────────────────────────────────┼──────────────────────────────────┘
                                                            ▼
        ┌────────────────────────────────────────────────────────────────────────────────────────────┐
        │                                        DATA STORES                                            │
        │  Supabase Postgres, system of record: graph.node/edge, learner.node_state,                    │
        │    learner.evidence, production.envelope, school.roster, payout.ledger + pgvector              │
        │  Neo4j on Hetzner K3s, read-optimized graph index: routing queries, canon browser,             │
        │    Graph Data Science (shortest path, community detection, orphan/bridge detection)            │
        │  Object storage (Supabase Storage / S3-compatible): source PDFs, media, offline bundles         │
        │  Dolt: org bead and audit trail only, no learner PII ever lands here                            │
        └────────────────────────────────────────────────────────────────────────────────────────────┘
                                                            │
                                                            ▼
        ┌────────────────────────────────────────────────────────────────────────────────────────────┐
        │                                       INTEGRATIONS                                             │
        │  OneRoster 1.2 via Clever / ClassLink brokers, direct Google Classroom import                  │
        │  LTI 1.3 Advantage: Deep Linking (assignment = target node), Names/Roles, Assignment/Grade Svc │
        │  Supabase Auth (email-OTP, students and independent learners) + district SSO (SAML/OIDC)       │
        │  Dynamic (13-plus, operator- and adult-researcher-side wallet only, never a minor's UI)         │
        │  x402 on Base (operator wallet pays and receives; PROTOCOL.md agent-trust rule applies)         │
        │  Open Badges 3.0 / W3C VC issuance and verify · Viatika (AI metering/policy) · feed402 discovery│
        └────────────────────────────────────────────────────────────────────────────────────────────┘
```

Design rule carried over from PROTOCOL.md agent-trust: no client surface, including the student canvas and the agent API, ever receives a payment challenge or an instruction to sign anything. Settlement is server-side, operator wallet to operator wallet, always.

---

## 2. Knowledge graph data model

### 2.1 Two populations, one graph

The canon (`bucket-canon/`) stays a strict, human-curated filter: foundations, axioms, laws, primary derivations. A K-12 curriculum needs "7 x 8 = 56" and "a paragraph needs a topic sentence," neither of which is a foundation. Rather than dilute the canon filter, the graph carries two node populations under one schema, distinguished by `tier`:

| Population | Tier values | Who writes it | Example |
|---|---|---|---|
| **Atom** | `atom` | AI-drafted from curriculum standards + textbooks, teacher-reviewed | "A fraction represents a part of a whole," "the water cycle has four stages" |
| **Canon** | `draft`, `candidate`, `canon` | AI-assisted ingestion, human canon review (existing pipeline) | Newton's second law, the second law of thermodynamics, Godel's incompleteness theorems |

An atom connects upward into canon through `generalizes` or `example_of` edges once a K-12 topic reaches a real foundation (K-12 physics atoms terminate in `02-physics`; a fifth-grade "energy is conserved" atom is `example_of` the conservation law in canon). Subjects with no canon branch yet (civics, world language, most of English language arts) stay atom-only, each in its own `subject` namespace, until enough primitive structure accumulates that a branch is worth curating, the same organic growth that already produced `08-deep-history` and `09-art` from nothing.

### 2.2 Node types

| Kind | Description | Tier range | Has transfer tasks |
|---|---|---|---|
| `fact` | An atomic, verifiable statement with no internal derivation ("Paris is the capital of France") | atom only | rarely |
| `concept` | A named idea that organizes facts ("photosynthesis," "supply and demand") | atom, candidate, canon | yes |
| `law` | A general, tested regularity ("conservation of energy") | candidate, canon | yes |
| `derivation` | A step-by-step path from premises to a result | candidate, canon | yes (walking the steps) |
| `primary_source` | A citable artifact: paper, primary document, dataset, recording | any | no (it is cited, not mastered) |
| `artifact` | A learner- or researcher-produced work: a claim card, a proof, a lab writeup, a dataset | draft, candidate, canon | no (it is the evidence) |

### 2.3 Edge types

| Kind | Semantics | Direction | Weighted |
|---|---|---|---|
| `prerequisite` | You need the source node to reasonably attempt the target | source (easier) to target (harder) | yes, FIRe credit fraction |
| `derives_from` | The target is a logical consequence of the source | premise to conclusion | no |
| `cites` | The target artifact references the source as evidence | citing to cited | no, but timestamped for citation-fee accrual |
| `generalizes` | The source is a specific case the target abstracts over | instance to abstraction | no |
| `example_of` | Inverse of `generalizes`, kept as a separate edge for cheap forward lookup | abstraction to instance | no |
| `contradicts` | The two nodes cannot both be held as true in the same frame (superseded theory vs. current, or an unresolved dispute) | symmetric | no |

`prerequisite` is the routing backbone. `generalizes` / `example_of` is what lets the atom layer and the canon coexist as one traversable graph instead of two silos: a routing query can walk from a first-grade fact up through concepts into a canon law without a schema change.

### 2.4 DDL

```sql
create schema if not exists graph;

create type graph.node_kind as enum
  ('fact','concept','law','derivation','primary_source','artifact');

create type graph.node_tier as enum
  ('atom','draft','candidate','canon');

create table graph.node (
  id            uuid primary key default gen_random_uuid(),
  kind          graph.node_kind not null,
  tier          graph.node_tier not null default 'atom',
  subject       text not null,          -- 'math', 'ela', 'science', 'civics', or a canon branch slug
  branch_ref    text,                   -- fk-by-convention to bucket-canon branch slug, null for atom-only subjects
  grade_band    int4range,              -- e.g. '[0,2)' = K-1, '[9,13)' = high school, null = not grade-scoped
  standards     jsonb not null default '[]', -- [{"framework":"CCSS","code":"CCSS.MATH.5.NF.A.1"}, ...]
  version       int not null default 1,
  superseded_by uuid references graph.node(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table graph.node_label (
  node_id     uuid not null references graph.node(id) on delete cascade,
  locale      text not null,            -- BCP-47, e.g. 'en', 'es-MX', 'sw'
  title       text not null,
  body_md     text,                     -- the canonical explanation in this locale
  is_machine  boolean not null default false, -- true until a human or reviewed model pass confirms it
  primary key (node_id, locale)
);

create table graph.edge (
  id            uuid primary key default gen_random_uuid(),
  src_node_id   uuid not null references graph.node(id) on delete cascade,
  dst_node_id   uuid not null references graph.node(id) on delete cascade,
  kind          text not null check (kind in
                  ('prerequisite','derives_from','cites','generalizes','example_of','contradicts')),
  fire_credit   real,                   -- fraction of mastery this edge propagates down on FIRe (prerequisite only)
  provenance    jsonb not null default '{}', -- {source:'llm_infer'|'human'|'ingest', reviewer_id, model, confidence}
  created_at    timestamptz not null default now(),
  unique (src_node_id, dst_node_id, kind)
);

create index edge_src_kind_idx on graph.edge (src_node_id, kind);
create index edge_dst_kind_idx on graph.edge (dst_node_id, kind);

-- Precomputed ancestor closure for prerequisite edges only, refreshed incrementally
-- by the ingestion worker on every edge write. This is the routing algorithm's
-- main performance lever (section 4).
create table graph.prereq_ancestor (
  node_id     uuid not null references graph.node(id) on delete cascade,
  ancestor_id uuid not null references graph.node(id) on delete cascade,
  min_hops    smallint not null,
  primary key (node_id, ancestor_id)
);
create index prereq_ancestor_node_idx on graph.prereq_ancestor (node_id);
```

Multilingual labels live in `graph.node_label`, one row per (node, locale). `body_md` is what the workspace's "locate" and "quote" tools serve; it is authored once per node per locale at ingestion time and reused across every learner who reaches that node (section 5.3).

### 2.5 Storage choice: Postgres, Neo4j, or both

**Both, with Postgres as the only writable system of record.**

Scale assumptions for this decision: 10^6 to 10^7 nodes (comparable order of magnitude to SNOMED CT's ~350K clinical concepts or UMLS's ~4M, scaled up for "every subject, every grade band, every fact"), 10^8 edges (average out-degree ~10 across all six edge kinds combined, which is plausible once `cites` edges from a well-referenced law fan out to thousands of artifacts), 10^6 learners.

- **Postgres wins on locality.** Every routing query touches a bounded neighborhood of the graph. A backward closure from a target node rarely exceeds a few thousand ancestor nodes even at 10^7 total nodes (a prerequisite chain to "general relativity" in a hand-built graph like Math Academy's runs on the order of 1,000 to 2,000 skills, a small slice of the graph's full size). With `graph.prereq_ancestor` precomputed and indexed on `node_id`, a frontier lookup is a single indexed scan returning a few thousand rows in single-digit milliseconds, whether the edge table holds 10^6 or 10^8 rows. Postgres also gives RLS, transactional writes alongside learner state and payments, and one backup story.
- **Postgres loses on whole-graph algorithms.** Weighted multi-criteria shortest path across mixed edge kinds with per-learner dynamic weights (FIRe credit x interest-vector rerank), PageRank-style "what's the frontier of the whole map right now," community detection to surface new candidate branches, and interactive multi-hop exploration for the canon browser are all native to a graph engine and require hand-rolled recursive CTEs in Postgres that get slow and hard to maintain past a few hops.
- Org infra already runs Neo4j on the Hetzner K3s box (provisioned, underused). Use it as a **read-only secondary index**: a CDC worker (logical replication publish/subscribe at scale; a scheduled batch sync is enough through the pilot phase) mirrors `graph.node` and `graph.edge` into Neo4j after every write. The app never writes to Neo4j directly, so it can be dropped and rebuilt from Postgres at any time, which removes the dual-write consistency problem entirely. Neo4j serves: the interactive canon/atom graph browser, the routing algorithm's forward shortest-path step once the backward frontier is known (section 4), Graph Data Science jobs for bridge and orphan detection during ingestion review, and any downstream ML feature extraction over graph structure.
- **pgvector**, already load-bearing for canon search (`src/app/api/canon/search`), extends to node dedup and entity linking during ingestion (section 10) and to cross-locale label matching.

---

## 3. Learner state model

### 3.1 The five stages, mapped onto what already ships

The product spec's five stages generalize Academy's existing Recall to Apply to Derive to Teach ladder by adding a gate beneath it that Academy never needed for an adult with a device and a fluent reading level:

| Stage | Definition | Assessment method | Academy ladder equivalent |
|---|---|---|---|
| **Access** | The learner can reach the node: prerequisites are unlocked, content exists in their language, their device tier can render it, age-gating passes | Binary eligibility check, no AI call | (implicit, not modeled) |
| **Awareness** | The learner has been introduced to the node and can recognize it | First-exposure event + a low-stakes recognition item | Recall (low confidence) |
| **Understanding** | The learner can explain the idea in their own words | Rubric-graded free response, deterministic grading where possible, LLM-judge with ensemble otherwise | Apply |
| **Internalization** | The learner can use the idea on a problem they have never seen | A generated transfer item, Bloom-targeted, drawn from the sealed held-out pool (Academy's credential firewall) | Derive |
| **Production** | The learner adds something new to the node or a neighboring node, and the graph accepts it | Passes the full production pipeline (section 6): AI pre-check, teacher or peer review, acceptance | Teach |

### 3.2 State ratchets forward, retention decays live

A learner's `stage` is a **high-water mark**: it only moves forward on new evidence, matching Academy's existing "mastered" semantics and its guardrail against a public score that can silently regress and mislead a parent or employer. Separately, a **live retention** signal, computed with the same FSRS retrievability function already shipping (`retrievability(tDays, S) = (1 + FACTOR * (tDays/S))^DECAY`), decays continuously and drives what the spaced-review scheduler surfaces. A credential check reads retention at verification time alongside peak stage, so "Internalization, verified 6 months ago, current retention 0.41" is a state the system can represent without overclaiming, which is what EPIC.md's "time-decaying, must be re-demonstrated" rule already requires for the adult credential.

### 3.3 Evidence and state DDL

```sql
create schema if not exists learner;

create type learner.stage as enum
  ('access','awareness','understanding','internalization','production');

-- Hot rollup, one row per (learner, node) the learner has touched.
-- Sparse: at ~3,000 nodes touched per learner over a K-12 career and 10^6
-- learners, this is ~3 x 10^9 rows at steady state. Partition by hash(learner_id).
create table learner.node_state (
  learner_id   uuid not null,
  node_id      uuid not null references graph.node(id),
  stage        learner.stage not null default 'access',
  theta        real,             -- IRT/Elo proficiency estimate
  n_responses  int not null default 0,
  stability    real,             -- FSRS stability (days)
  last_review  timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (learner_id, node_id)
) partition by hash (learner_id);

-- Append-only event log, the source of truth for theta/stability recomputation
-- and for teacher/parent review. Partitioned by month; rolled to cold object
-- storage (parquet) after 90 days and queried there for analytics, keeping the
-- hot partition small.
create table learner.evidence (
  id           uuid primary key default gen_random_uuid(),
  learner_id   uuid not null,
  node_id      uuid not null references graph.node(id),
  kind         text not null check (kind in
                 ('recognition','explanation','transfer','teacher_observation','self_report')),
  payload      jsonb not null,   -- the response, prompt version, timing
  grade        real,             -- 0..1, null until graded
  graded_by    text check (graded_by in ('deterministic','llm_judge','teacher')),
  created_at   timestamptz not null default now()
) partition by range (created_at);
```

### 3.4 Understanding vs. Internalization, in practice

- **Understanding**: a free-response explanation item. Graded first by deterministic checks where the domain allows it (symbolic equivalence via a CAS for math, keyword/structure matching for a defined rubric), falling back to an LLM-judge pass. Teacher override is always available and is itself an evidence record (`graded_by = 'teacher'`), which both corrects the model and accrues a labeled example for the next rubric-tuning pass.
- **Internalization**: a transfer task, generated by construction (template skeleton + scenario wrapper, multi-hop across the graph, Bloom-targeted, distractors from an error model), pulled from a held-out item pool the learner has never seen. This is Academy's existing practice/credential firewall, reused unchanged: practice attempts allow retries and self-report; the stage only advances on a checkpoint attempt from the sealed pool, exposure-controlled so the same item set doesn't leak into study guides.
- Teacher judgment is a first-class evidence kind (`teacher_observation`), built into the schema from the start. A teacher can advance or hold back a stage directly, with a required one-line reason stored on the evidence record, which is what makes the class review queue (section 8) load-bearing rather than decorative.

### 3.5 Knowledge tracing: IRT/Elo x FSRS, not BKT, not DKT

Academy already made and shipped this call (`adaptive.js`, `mastery.ts`); this design keeps it for K-12 and states why, because a from-scratch DKT or BKT pass is the wrong place to spend engineering effort here.

| Method | Why not the spine |
|---|---|
| **Bayesian Knowledge Tracing (BKT)** | Binary per-skill state with no natural retention decay term, and it fuses poorly with a spaced-repetition retention signal, which a K-12 product needs badly (children forget faster and more unevenly than adults). Partial credit and free-response grading don't fit a two-state HMM cleanly. |
| **Deep Knowledge Tracing (DKT)** | A sequence model needs a dense per-skill interaction history to generalize. At 10^6 to 10^7 nodes and a pilot cohort of thousands of students, most nodes will have far too few interactions for a neural model to learn anything useful, and the ones with enough data are exactly the popular nodes where a simpler model already works fine. It is also an opaque score, which is a hard sell to a parent or teacher asking why their child is marked as struggling, and raises unnecessary regulatory exposure for a system making claims about a minor. |
| **IRT/Elo online update (chosen)** | A single interpretable parameter per learner-node pair (`theta`), updates in O(1) per response with no batch retraining, cold-starts cleanly through the Elo update rule, and composes with FSRS multiplicatively as `M = P^alpha * R^beta`, exactly the formula already live in `adaptive.js`. It is explainable to a teacher in one sentence: "proficiency times how well it's holding up." |

The one change worth making for younger learners: shrink the Elo K-factor and widen the recognition-to-explanation gap for the K-2 band, since a six-year-old's response variance comes mostly from reading friction and attention rather than knowledge state, and an adult-tuned update rule will over-react to that noise.

---

## 4. Frontier-backward routing

### 4.1 The algorithm

Input: a target node `T` (a curiosity question resolved to a node, or a teacher-set assignment target), a learner `L`.

1. **Resolve the target.** If `T` came from free text ("why is the sky blue"), embed the query and match against `graph.node_label` via pgvector, ranked by cosine similarity within the learner's grade band plus one band above (so the system can reach slightly past grade level when the question calls for it).
2. **Load the learner's mastered set.** Query `learner.node_state` for all `(node_id, stage)` where `stage >= understanding` (a node the learner can explain counts as held, even if Internalization hasn't been demonstrated on it yet, since it is safe to route through).
3. **Backward closure.** Read `graph.prereq_ancestor` for `T`, returning every ancestor and its `min_hops`. This is a single indexed scan against the precomputed closure table built in section 2.4, so cost stays flat as the graph grows.
4. **Intersect.** `frontier = ancestors(T) ∩ mastered(L)`, kept as the set of mastered nodes closest to `T` (minimum `min_hops` among mastered ancestors on each path). Everything between the frontier and `T` is the gap.
5. **Handle unknown prior knowledge.** If `frontier` is empty or thin (fewer than 3 mastered ancestors within 5 hops of `T`), the learner has no on-record state for this region. Run a **diagnostic probe**: instead of Academy's adult binary search over the whole graph (~10 to 25 questions), probe only the top-5 candidate frontier boundary nodes by grade-band prior (the nodes a curriculum standard says this learner's grade should already hold), 2 items each. This is deliberately cheaper than a full binary search because a K-12 learner's grade band is strong prior information an anonymous adult signing up for Academy doesn't have.
6. **Forward shortest path.** From the frontier to `T`, compute the shortest path over `prerequisite` and `generalizes` edges, weighted by `1 - fire_credit` (an edge that already grants a lot of fractional credit is cheap to cross) and reranked by the learner's interest vector (section 7) to break ties toward a subject the learner has been engaging with. This step runs against the Neo4j replica (`shortestPath` / GDS Dijkstra), the one part of routing that benefits from a native graph engine.
7. **Emit the path** as an ordered list of nodes with each node's current stage, ready to render as the visible frontier on the canvas (section 7).

### 4.2 Cost

Step 3 is O(ancestors(T)), bounded at a few thousand rows regardless of total graph size, per the storage-choice argument in 2.5. Step 6 runs on a subgraph (frontier to target, tens to low hundreds of nodes for a K-12 depth), so Neo4j's shortest-path call returns in single-digit milliseconds. The expensive part is step 5's diagnostic, which costs 5 to 10 graded LLM calls only on a cold start; a returning learner skips it entirely because `learner.node_state` already has data.

### 4.3 Caching and personalization

- Cache the **frontier set** per `(learner_id, target_node_id)` in a materialized `learner.frontier_cache` row, invalidated by an event-driven trigger: any new `learner.evidence` write touching a node on a cached path fires a queue message that recomputes just that learner's affected cached frontiers (not a full recompute), keeping the common case (a learner opening the same subject repeatedly in one sitting) a cache hit.
- Personalization enters at two points only: the interest-vector rerank in step 6 (which subject-adjacent path to prefer among equally short options), and the diagnostic's grade-band prior in step 5 (which nodes to probe first). The shortest-path computation itself stays learner-agnostic on the graph structure, which keeps the Neo4j query cacheable across learners hitting the same target from the same frontier shape.

---

## 5. Student workspace

### 5.1 Spatial canvas

The workspace is a pannable, zoomable canvas centered on the graph itself. A session opens centered on the current target node with the frontier path laid out behind it (mastered nodes lit, gap nodes dim) and the target node ahead, unresolved. The student's own work area is a fixed panel attached to the canvas: a claim they are building, evidence they have located, a scratch space for the hard part. This is a rendering surface over the same node/edge/state primitives already defined in sections 2 to 4.

### 5.2 The constrained AI tool surface

Four tools only, matching the product's line that "the AI finds, quotes, checks, and organizes."

| Tool | What it does | Model tier | LLM call? |
|---|---|---|---|
| **Locate** | Finds candidate nodes and sources relevant to what the student is working on, via pgvector + full-text search against `graph.node_label` and `primary_source` content | n/a | **No.** Retrieval only. |
| **Quote** | Pulls the exact text of a passage from a located source, verbatim, with a citation anchor | n/a | **No.** Exact retrieval, never paraphrase. |
| **Check** | Verifies a claim the student wrote against the cited evidence and, when grading an Understanding or Internalization attempt, scores it against the rubric | Sonnet-tier | Yes, always |
| **Organize** | Restructures the student's claim/evidence/notes into the envelope shape (claim, evidence, sources) on request | Haiku-tier | Yes, light |

Locate and Quote are retrieval operations against an index by design: they are the highest-volume tool uses in a session, and finding and copying exact text is a search problem with no reason to touch a language model. This is also the single biggest cost lever in section 5.4.

### 5.3 What the AI is forbidden from doing

- **Never writes the claim, the explanation, or the answer for the student.** Check returns a verdict and a pointer to what's missing, never a corrected version of the student's sentence.
- **Never solves the problem.** A math or science question routed to Check gets graded on the student's own work; if the student is stuck, the tutor dialogue (a separate, narrower surface, section 5.5) can ask a Socratic question, and stops short of the answer itself.
- **Never grades itself into the credential path silently.** Every Check result that would advance a stage past Understanding writes an `evidence` row a teacher can see and override (section 3.4).
- **Never initiates a payment, contacts a party outside the workspace, or leaves the sandboxed research/tutor scope.** No general-purpose chat model is exposed to a K-12 account; there is no "ask me anything" surface for a minor.
- **Never returns a payment challenge or asks the student to sign anything**, per PROTOCOL.md's agent-trust rule, which this design extends to every learner-facing surface, the adult research API included.

### 5.4 Guardrails for minors

- Every model call in the student-facing surface runs behind a content filter tuned for the account's age band, layered on top of standard safety classifiers as an added constraint.
- Tool access is enforced at the gateway, an allowlist on the API route that runs ahead of the system prompt: a request for a fifth tool, or a Check call with a target outside the student's current node, is rejected before it reaches the model.
- No open-ended free chat. The tutor dialogue tool is scoped to the current node and target, with a fixed turn budget per session, and logs every turn to `learner.evidence` for teacher visibility, the same standard Academy already flagged for its own AI tutor ("S1/S7 safety, SymPy/CAS split," EPIC.md Phase 4).
- Parent- and teacher-visible activity log by default for under-13 accounts; nothing a minor does in the workspace is private from the consenting adult on the account, which is also what keeps the COPPA "educational purpose only, no commercial use of the data" line clean (section 9.2).

### 5.5 Cost per active student per month

Assumptions: an active student engages 4 sessions/week (~17 sessions/month), 20 minutes each. Locate and Quote run as retrieval calls, outside the model-token budget entirely. Organize runs once per session on Haiku 4.5. Check runs once per completed submission (assume 8 graded submissions/month) on Sonnet 5. A tutor-dialogue turn (on request, when a student is stuck) runs on Sonnet 5; assume half of sessions request help, averaging 3 turns. All model pricing below is current Anthropic first-party API pricing: Haiku 4.5 at $1.00 / $5.00 per Mtok (input/output), Sonnet 5 at $2.00 / $10.00 per Mtok, cached input read at a 90% discount off the base input rate.

| Call type | Volume/month | Input (cached / fresh) | Output | Cost/call | Monthly |
|---|---|---|---|---|---|
| Organize (Haiku 4.5) | 17 | 900 / 600 tok | 200 tok | ~$0.0017 | $0.029 |
| Check, graded submission (Sonnet 5) | 8 | 1,200 / 1,800 tok | 500 tok | ~$0.0088 | $0.070 |
| Tutor dialogue turn (Sonnet 5) | 25.5 (17 x 0.5 x 3) | 1,500 / 700 tok | 350 tok | ~$0.0052 | $0.133 |
| **Total, light user** | | | | | **~$0.23/month** |

A heavy user (double the session count, 80% of sessions requesting 5-turn help, more graded work) runs roughly **$0.90 to $1.00/month**. Blended across a real population, budget **$0.25 to $1.00 per active learner per month** for AI inference, before batch pre-generation and multi-hour caching mature further. This is 2 to 8% of Academy's existing adult Pro price ($12/mo), which is the headroom that makes a free-forever K-12 tier defensible for a grant-funded nonprofit: at 1M active learners, blended AI spend lands in the $3M to $12M/year range, the single largest variable line in the budget (section 11), and the reason locate/quote must stay non-LLM and lesson content must be authored once per node and reused across every student, as usage scales.

---

## 6. Production pipeline

### 6.1 The envelope

Extends `canon.json`'s sidecar pattern (PROTOCOL.md §4) with a pedagogical shape: a claim, its evidence, its sources, and proof the learner can use the idea somewhere new.

```sql
create schema if not exists production;

create type production.status as enum
  ('submitted','ai_precheck','teacher_review','accepted','rejected');

create table production.envelope (
  id                     uuid primary key default gen_random_uuid(),
  learner_id             uuid not null,
  target_node_id         uuid references graph.node(id), -- the node this contributes to, if existing
  claim                  text not null,
  evidence               jsonb not null,   -- [{quote, source_node_id, locate_call_id}]
  sources                jsonb not null,   -- [{primary_source_id, citation}]
  transfer_proof_id      uuid references learner.evidence(id) not null, -- the Internalization evidence gating this
  status                 production.status not null default 'submitted',
  ai_precheck_result     jsonb,            -- {originality_score, canon_conflict, citation_valid}
  reviewer_id            uuid,
  reviewer_note          text,
  resulting_artifact_id  uuid references graph.node(id),
  resulting_tier         graph.node_tier,
  created_at             timestamptz not null default now(),
  decided_at             timestamptz
);
```

### 6.2 Flow

1. **Submission.** A learner submits an envelope only after their `transfer_proof_id` evidence shows Internalization on the relevant node, enforced at the API layer as well as the UI, matching Academy's practice/credential firewall.
2. **AI pre-check.** Originality check (embedding similarity against existing artifacts and known sources, catching both copy-paste and near-duplicate submissions), canon-conflict check (does the claim contradict an existing `canon` or `candidate` node via a `contradicts` edge, in which case it routes to a specialist reviewer rather than the general queue), citation validity (every `evidence` quote is checked against the Quote tool's log to confirm it resolves to real source text).
3. **Teacher or peer review.** Lands in the class review queue (section 8.4). A teacher can accept, reject with a reason, or request revision. For older learners in the "peer canon" track (Academy's existing candidate-tier review pattern, reused), a small panel of higher-stage peers can co-review, with the teacher as tiebreaker.
4. **Acceptance into the graph.** An accepted envelope becomes an `artifact` node at `tier = draft` or `candidate` (never straight to `canon`, matching the existing strict tier ladder), linked by a `derives_from` or `cites` edge to the node(s) it built on. This is the moment "the same thing a scientist makes" stops being a figure of speech: the artifact is now a graph node other learners can cite.
5. **Citation tracking.** Every subsequent `cites` edge into this artifact is timestamped and counted (`graph.edge.created_at`), the same mechanism the adult canon already uses for `cite.reader_owes` bookkeeping, just extended to K-12 artifacts.

### 6.3 Payout accrual and custody

Reuses the "no Story Protocol, Open Badges / W3C VC only" decision already made for the adult credential (EPIC.md, 2026-06-14): a K-12 production credit is **not** an NFT mint. It is a signed, verifiable record plus a ledger entry.

- **Custodial for minors.** No wallet is ever exposed to a student under 18. A payout accrual (triggered when another learner's or researcher's artifact cites theirs) posts to `payout.ledger`, held custodially by the school district (for roster-synced accounts, under the district's existing FERPA-covered data agreement) or by the parent/guardian (for independent-learner accounts, structured like a UTMA custodial account: the minor is the beneficial owner, a named adult controls disbursement until majority, and the Foundation's operating wallet is the only party that ever touches x402 directly).
- **x402 flow.** Settlement is operator-wallet-to-operator-wallet on Base, exactly as PROTOCOL.md §3.1 requires: the citing party's fee (when a downstream paid re-publication happens) flows to the Foundation's reference wallet, and the Foundation's ledger credits the custodial account. The minor's UI shows a running total and, at 13+ with parental consent, an optional path to a real custodial crypto account; under 13, it is a ledger number only, cashable through the school or parent, never a wallet the child holds.
- **Anti-fraud.** Rate limits on submission volume per learner per day, an effort filter on the gating transfer-proof evidence (a guessed-through checkpoint attempt does not count), a sybil gate on new accounts before their first submission counts toward payout (reused from Academy's Phase 2 anti-gaming plan: gaming/wheel-spinning/copy detectors), and mandatory teacher attestation for any account under 13 before its first payout-eligible acceptance.

```sql
create schema if not exists payout;

create type payout.custody_type as enum ('school_district','parent_guardian','self_13plus');

create table payout.custody (
  learner_id     uuid primary key,
  custody_type   payout.custody_type not null,
  custodian_id   uuid not null,        -- district admin, parent account, or the learner themself if 13+
  wallet_address text,                 -- null unless self_13plus and the learner opted into Dynamic
  created_at     timestamptz not null default now()
);

create table payout.ledger (
  id              uuid primary key default gen_random_uuid(),
  learner_id      uuid not null references payout.custody(learner_id),
  citing_edge_id  uuid references graph.edge(id),
  amount_usd      numeric(10,4) not null,
  x402_receipt    text,                -- null until settled
  status          text not null check (status in ('accrued','settled','disputed')),
  created_at      timestamptz not null default now()
);
```

---

## 7. Gamification engine

### 7.1 State progression as the game

The five-stage model (section 3) is the game loop by design; no separate points system is required to make progress feel real, because each stage transition marks a real capability change: you could not do this before, and now you can. The visible frontier on the canvas (section 5.1) is the map screen: mastered territory lit, the gap dim, the target always in view.

### 7.2 Interest vectors pulling the map outward

A learner's interest vector is a running weighted average over the subjects and node kinds they engage with unprompted (what they ask about, what they linger on, what they choose when a target is optional), updated on every session, and used only as a **tiebreaker** in routing (section 4.1 step 6) and as the ranking signal for "what's next" suggestions, never as a hard filter. This keeps the basics-fill-in-underneath property from the product definition: interest steers which optional path the student is offered next, but Access-gated prerequisites for a required target are never skipped because a student prefers a different subject.

### 7.3 What to avoid

- **No leaderboards ranking children against each other.** Comparative ranking is Academy's adult-tier feature (the public Mastery Profile is opt-in at 13+); under 13, all progress is private by default, visible only to the learner, their teacher, and their parent.
- **No streak-loss shaming.** No "you broke your streak," no guilt notification, no red X for a missed day. A missed day widens the review gap, handled by FSRS on its own terms.
- **No variable-ratio reward mechanics** (loot-box-style unpredictable payouts, randomized bonus multipliers). Every stage transition and every citation payout is deterministic and explainable, which is both the credential's trust requirement (section 6, reused from Academy) and the right posture for intrinsic motivation research: unpredictable extrinsic rewards on top of an activity that is inherently interesting undermine the child's own interest in it (the overjustification effect). Bucket's bet is that finding out why the sky is blue carries enough of its own interest that the system's job is only to remove friction.
- **No public comparison for young children**, full stop, distinct from the adult product's public-resume framing. The public, verifiable Mastery Profile becomes available as an opt-in at 13+, consistent with Academy's existing COPPA-adjacent line.

---

## 8. Teacher and school layer

### 8.1 Class graph view

A teacher's dashboard renders the same graph the student sees, aggregated: for a chosen unit (a target node or a small target set), every student in the class appears as a marker on the frontier-to-target path at their current stage. This answers "who is stuck and where" (markers clustered at a gap node), "who is ready for something harder" (students who cleared the target with room on their frontier), and "whose work needs a look" (a badge on any student with a pending `production.envelope` in `teacher_review`), directly, without a separate reporting layer.

### 8.2 Roster sync

OneRoster 1.2 is the data shape; Clever and ClassLink are the two dominant North American brokers, and OneRoster is how both speak to a new vendor, so supporting OneRoster gets both for close to the cost of one integration. Clever is free to the district (the app vendor pays) and has the larger existing app library; ClassLink is paid by the district and leans toward deeper IT/identity control. Support both from day one of the pilot phase: a district RFP commonly asks for OneRoster 1.2 rostering with gradebook passback, Clever sync, and (for larger districts) Ed-Fi reporting to the state longitudinal data system, so this is table stakes for a school-facing product from day one. Google Classroom import is a lighter-weight direct integration for classrooms too small or too informal to run a full SIS-to-broker pipeline.

### 8.3 LTI 1.3 launch

Standard LTI 1.3 Advantage: **Deep Linking** lets a teacher pick a Bucket target node as an assignment from inside their existing LMS (Canvas, Schoology, whatever the district runs), **Names and Role Provisioning** pulls the roster for that specific class section without a separate OneRoster sync, and **Assignment and Grade Services (AGS)** passes a stage-reached or rubric score back to the LMS gradebook on completion. This is the path for districts that already standardized on an LMS and don't want a second place to check grades.

### 8.4 Assignment as target node

A teacher assignment is a `target_node_id` plus a due date and a class roster; the system runs frontier-backward routing (section 4) per student against that target, so twenty students on the same assignment get twenty different personalized paths converging on the same target, and the teacher's class graph view (8.1) shows all twenty against the same backdrop.

### 8.5 Review queue

The same `production.envelope` review UI from section 6.2, filtered to the teacher's roster, with batch actions (accept all citation-complete submissions above a confidence threshold, flag the rest) so a teacher of 30 does not read 30 full submissions with no triage support.

### 8.6 Reporting

Standards crosswalk: every `graph.node.standards` field carries framework codes (CCSS, NGSS, state-specific), so a report rolls up "class coverage of CCSS.MATH.5.NF" directly from node state, without a second mapping table to maintain. Reports are per-student, per-class, and per-standard, exportable, and (for district-tier accounts) pushable to the district's own data warehouse via the same OneRoster/Ed-Fi pipe used for roster ingestion.

### Sources for this section
[FAQ, Clever vs. ClassLink for K-12 Rostering, Alma](https://www.getalma.com/clever-vs-classlink-for-k-12-rostering/) · [OneRoster 1.2 vs Ed-Fi vs LTI Advantage, Notix](https://notixit.com/blog/edtech-oneroster-edfi-lti-interoperability)

---

## 9. Identity

### 9.1 Account types

| Account | Auth path | Data owner | Notes |
|---|---|---|---|
| Student, roster-synced | District SSO (SAML/OIDC) via Clever/ClassLink, or LTI launch | District, under its data processing agreement | No password ever set by the child |
| Student, independent (13+) | Supabase Auth email-OTP | The learner, with account-level consent on signup | Same as current Academy auth |
| Student, independent (under 13) | Parent-initiated, email-OTP on the **parent's** email, child gets a school-style short code or QR login on-device | Parent, verifiable consent required before any data collection | New for K-12; Academy has never had this path |
| Teacher | District SSO or direct email-OTP with district-domain verification | District | Grants class-graph and review-queue access, scoped to rostered sections only |
| Parent | Email-OTP, view-only plus consent management | Self | No editing of a child's work, ever |
| School / district admin | District SSO with an admin role claim from the roster sync | District | Roster management, reporting, billing (district tier, if any) |

### 9.2 Age gating and consent

- Age comes from the roster (SIS-verified, authoritative) for synced accounts, and from parent-provided birthdate for independent accounts, never self-declared by the child.
- **Under 13, US**: COPPA applies. Two lawful paths, both supported: (a) **school consent exception**, the district signs a data-processing agreement authorizing collection for educational purposes only, which covers every student in that district's roster without per-parent signup friction, the same exception FERPA-covered SIS vendors already rely on; (b) **direct verifiable parental consent** for independent accounts, an email-plus-confirmation flow at minimum, with the FTC's 2025 COPPA Rule amendments (full compliance required by April 22, 2026) tightening what counts as personal information (biometric identifiers now included, though nothing in this design collects those) and requiring named disclosure of every third party that touches the data, which the Viatika/AI-vendor chain (section 1) has to satisfy explicitly in the consent notice.
- **13 and over**: standard GDPR/COPPA-adjacent age threshold Academy already uses; a student can self-consent, and the public Mastery Profile becomes available as an opt-in.
- **FERPA** governs any data flowing through a school relationship regardless of age; the practical requirement is the same one already designed into the `bucket` private schema pattern (section 0): student data never crosses to a third party (including an AI model vendor) for anything beyond the educational purpose, and a district can audit exactly what left its boundary.
- AI vendor data handling: the design commits to not retaining student inputs in any model's training weights, and to sufficient de-identification of anything that is retained for product improvement, which is the emerging bar FERPA-focused counsel is applying to AI vendors serving schools.

### 9.3 How Dynamic fits

Dynamic (currently used for wallet auth on the adult/researcher side) is **not** part of any K-12 learner-facing flow, under 13 or 13-17. It stays exactly where it already sits: an operator- and adult-researcher-side integration for x402 wallet connection. A 13+ independent learner who opts into a real custodial crypto account for their citation payouts (section 6.3) is the one path where Dynamic could appear in a learner's own flow, gated behind explicit parental consent even at 13+, since a financial account carries a higher consent bar than data collection alone. Every account under 18 that hasn't opted in stays on the ledger-only custody model with no wallet UI at all.

### Sources for this section
[COPPA Guidance for Ed Tech Companies and Schools, FTC](https://www.ftc.gov/business-guidance/blog/2020/04/coppa-guidance-ed-tech-companies-schools-during-coronavirus) · [FERPA & COPPA compliance guide for school AI infrastructure, SchoolAI](https://schoolai.com/blog/ensuring-ferpa-coppa-compliance-school-ai-infrastructure) · [UGMA & UTMA Accounts, Thrivent](https://www.thrivent.com/insights/college-planning/what-are-ugma-and-utma-accounts) · [Can Minors Own or Trade Crypto? Legal Guidelines Explained, FinanceFeeds](https://financefeeds.com/can-minors-own-or-trade-crypto/)

---

## 10. Ingestion pipeline

Extends the ingestion pattern already implicit in `bucket-canon/*/​_intake/`, split across the two node populations (section 2.1).

1. **Source.** Curriculum standards documents (CCSS, NGSS, state frameworks), open textbooks, primary sources for the canon side, teacher-submitted material for a specific class.
2. **Parse.** Extract candidate statements and their stated grade level / standard code; for canon-side sources, the existing PDF/HTML parse-to-sidecar pipeline.
3. **Node candidate.** Each extracted statement becomes a draft `graph.node` at `tier = atom` (or `draft` for canon-track material), with the source's standard code(s) attached to `standards`.
4. **Dedupe / entity link.** pgvector similarity search against existing nodes in the same subject and adjacent grade bands; a candidate above a similarity threshold is proposed as a merge (same underlying idea, different phrasing) rather than a new node, reviewed by a human before merge, never auto-merged silently, so provenance never gets silently lost.
5. **Tier assignment.** Atom by default; a candidate meeting the canon bar for a foundation gets flagged for the canon review track and moves to `draft` there.
6. **Prerequisite edge inference.** An LLM proposes `prerequisite` and `generalizes` candidate edges based on the node's standards metadata (grade-sequenced standards are strong prior signal) and its text, every proposed edge carries `provenance = {source: 'llm_infer', model, confidence}` and is queued for human review before it affects routing; edges never go live un-reviewed, since a wrong prerequisite edge silently breaks the routing algorithm for every learner who touches it.
7. **Publish.** On review acceptance, the node and its edges go live, `graph.prereq_ancestor` is refreshed incrementally for the affected subgraph (not a full recompute), and the Neo4j CDC worker picks up the change on its next sync cycle.

**Quality gates**: no node ships without at least one edge (an orphan node is unreachable by routing and gets auto-flagged); no `prerequisite` edge ships without human review; no atom-to-canon `generalizes` edge ships without a canon-track reviewer, a different, higher-bar reviewer pool than atom review. **Idempotency**: every ingestion run is keyed by `(source_url, source_hash)`; re-running an unchanged source is a no-op, matching the `agf-figma pull` and canon-ingestion resume pattern already standard across the org's other pipelines.

---

## 11. Infra and ops

### 11.1 Vercel/Supabase vs. self-host on Hetzner K3s

Keep the split the org already runs elsewhere: **Vercel + Supabase for the application tier** (fast iteration, managed Postgres with RLS, zero ops burden for a pre-revenue nonprofit), **Hetzner K3s for stateful, self-hostable infra that benefits from being owned** (Neo4j, as already provisioned; heavier async workers; anything with a cost profile that scales badly on managed-platform pricing at real volume). This mirrors the org's existing tenancy model (pooled by default, dedicated once earned) rather than inventing a new pattern for this one venture.

### 11.2 Queues, search, CDN

- **Queues**: Supabase's built-in pgmq (Postgres-native, no new operational dependency) for ingestion, closure-table refresh, and CDC-to-Neo4j jobs through the pilot and district phases; graduate to a dedicated queue (e.g., a managed Redis-backed queue) only if pgmq's throughput becomes the bottleneck, which is unlikely before six-figure daily job volume.
- **Search**: pgvector for semantic search (node dedup, "locate," entity linking) alongside Postgres full-text search for exact/keyword lookup, since "quote" needs the exact matching text a full-text search returns. A dedicated vector database (Pinecone, Weaviate) is not worth the operational surface at this scale; pgvector on Supabase's existing Postgres handles 10^7-node embeddings without a second system.
- **CDN**: Vercel's edge network for the app and static content; object storage (Supabase Storage, S3-compatible) fronted by Cloudflare for source PDFs, media, and offline bundles, consistent with the org's existing Cloudflare DNS/CDN posture.

### 11.3 Observability, backups

- Standard Vercel/Supabase observability (request logs, query performance insights) plus application-level tracing built for the AI layer: every model call logged with token counts, cost, and latency, rolled up per learner per month against the section 5.5 budget, with an alert when the blended per-learner cost trend crosses a threshold.
- Backups: Supabase's point-in-time recovery for Postgres (the system of record); Neo4j is fully rebuildable from Postgres, so it needs no independent backup, only a documented rebuild runbook; object storage versioned at the bucket level.

### 11.4 Cost at scale

Assumptions carried from section 5.5 ($0.25 to $1.00 per active learner per month for AI inference), plus infra overhead estimated from current Supabase/Vercel tiered pricing and a modest Hetzner footprint.

| Scale | Active learners | AI inference (blended $0.50/mo) | Supabase/Vercel tier | Hetzner (Neo4j + workers) | Rough monthly total |
|---|---|---|---|---|---|
| 1,000 | 1K | $500 | Pro tier, low hundreds/mo | Shared, already-provisioned box, marginal cost near $0 | ~$1K/mo |
| 100,000 | 100K | $50,000 | Team/scale tier, low thousands/mo, read replicas | A dedicated Hetzner node or two for Neo4j + workers, ~$200-500/mo | ~$55K-60K/mo |
| 1,000,000 | 1M | $500,000 | Enterprise-tier Postgres, multiple read replicas, likely $10K-30K/mo | A small dedicated cluster, ~$2K-5K/mo | ~$550K-580K/mo, dominated by AI inference |

AI inference makes up 85-95% of the marginal cost at every scale, which is why sections 5.3 (retrieval for locate/quote) and 5.5 (batch pre-generation of node content, caching) carry the real cost decisions in this design, ahead of the database or hosting choice.

---

## 12. Offline and low-bandwidth mode

A meaningful share of "any learner anywhere," per the nonprofit's stated mission, has intermittent or no connectivity. Design commitments:

1. **Content bundles.** A grade-band-and-subject content pack (node labels, body text, and pre-generated transfer items for a bounded subgraph, a semester's worth of a subject) downloads as a single versioned bundle to the mobile client, so a student can read, review (FSRS scheduling runs client-side against the bundle), and attempt Understanding-level work with zero network.
2. **Sync on reconnect.** Evidence records generated offline queue locally and sync to `learner.evidence` on reconnect, using client-generated UUIDs so sync is idempotent and safe to retry. Frontier-backward routing itself needs connectivity (it depends on the live graph and other learners' state for Production-stage citation checks), so routing recomputation is deferred to the next online session; offline mode operates on the path already downloaded.
3. **No AI tool calls offline**, by construction: Check and Organize require a network round-trip to the model. Offline sessions default to self-check against a bundled answer key for Understanding-level practice, with full Check-graded credentialing deferred to the next sync, an explicit tradeoff (offline students get slightly slower credential turnaround, never worse content).
4. **Low-bandwidth mode** on the web client: text-first rendering with images and the 3D canon-globe-style visualizations (already present in the adult site) deferred behind a tap, detected via the Network Information API where available and a manual toggle everywhere else.

### 12.1 i18n

`graph.node_label` is already locale-keyed (section 2.4), so multilingual content sits as a first-class dimension of the schema from the start. Priority order for the pilot-to-global phases: machine-translate every node label at ingestion time into a baseline set of high-reach languages (Spanish, French, Portuguese, Swahili, Arabic, Hindi, Mandarin), flag every machine-translated label (`is_machine = true`), and route the highest-traffic locale/subject pairs to human review first, the same reviewed-vs-generated distinction Academy already draws for its polyglot mode. UI chrome (buttons, navigation) is a standard i18n string table, decoupled from node content.

---

## 13. Build vs. buy

| Component | Decision | Reason |
|---|---|---|
| Graph store (Postgres schema) | Build | It is the product's core data model; no vendor sells "K-12 knowledge graph with FIRe credit." |
| Graph query engine (Neo4j) | Open-source, self-host | Already provisioned on org infra; avoids a managed-graph-DB bill for a read replica that can be rebuilt from Postgres. |
| Knowledge tracing (IRT/Elo x FSRS fusion) | Build | Already built and shipped in Academy; this is the venture's actual differentiator, never outsource it. |
| Spaced repetition scheduler | Build (FSRS, open algorithm) | FSRS is a published open algorithm; the implementation is already in `fsrs.js`. |
| LLM inference | Buy (Anthropic API) | Buying frontier model quality is cheaper and faster than training one; this is the entire premise of "the AI finds, quotes, checks, organizes." |
| Vector search (pgvector) | Open-source, self-host | Already on the Postgres box in use; a dedicated vector DB adds an operational surface with no scale justification yet. |
| Roster sync (OneRoster/Clever/ClassLink) | Buy/integrate (broker APIs) | These are the standard the entire K-12 market already speaks; building a competing rostering system is pure waste. |
| LTI 1.3 launch | Build against an open spec | It's an open protocol; a small, well-scoped integration layer covers it. |
| Auth (student/teacher/parent) | Buy (Supabase Auth) | Already in use; email-OTP and SSO are commodity. |
| District SSO (SAML/OIDC) | Buy (Supabase Auth + broker-provided SSO) | Same reasoning; no reason to hand-roll SAML. |
| Credentialing (Open Badges 3.0 / W3C VC) | Build against an open spec | Already decided and built for the adult tier; this is a spec implementation the team owns directly. |
| Payments settlement (x402) | Open-source protocol, self-operate | The org authored feed402/x402-research-gateway; this is core competency worth keeping in-house. |
| Custodial ledger | Build | No off-the-shelf vendor handles "minor's citation-fee ledger held by a school district," and it must interoperate tightly with the production pipeline. |
| AI safety/content filtering for minors | Buy (Anthropic's built-in safety classifiers) + build (a narrow, node-scoped tool allowlist enforced at the gateway) | The base safety layer is a vendor's job; the K-12-specific scoping is this product's responsibility and cannot be outsourced. |
| Object storage / CDN | Buy (Supabase Storage + Cloudflare) | Commodity infrastructure, already in org-wide use. |
| Observability | Buy (Vercel/Supabase built-ins) + a thin custom AI-cost tracer | Standard observability is commodity; per-learner AI cost tracking is specific enough to this product to write in-house, and small enough to be cheap. |
| Translation (baseline MT pass) | Buy (a translation API) + build the review/promotion workflow | Machine translation quality is a commodity; deciding which translations are trustworthy enough to leave `is_machine = true` is this product's judgment call. |
| Queue (pgmq) | Open-source, already in Postgres | No new operational dependency until proven necessary. |

---

## 14. Phased delivery

### Phase 0: Prototype slice

One branch (`02-physics`, since it already has the deepest canon buildout and a clean K-12 on-ramp through "why is the sky blue"), one grade band (grades 3-5), one prerequisite path (from "light travels in straight lines" through to "Rayleigh scattering explains a blue sky," roughly 15-25 atom and concept nodes). Ships: the graph schema (section 2), the five-stage state model on this one path (section 3), frontier-backward routing against this single closed subgraph with no diagnostic-probe generalization yet (section 4, hardcoded frontier for the prototype), the spatial canvas with Locate/Quote/Check/Organize working against real content (section 5), no teacher layer, no roster sync, no payout, single-locale (English). Success criterion: a ten-year-old can ask "why is the sky blue," get routed backward to what they hold, walk forward through the path, and reach Understanding on the target node in one sitting.

### Phase 1: Pilot school

Expand to 3 to 5 subjects across grades K-8 within one or two willing schools. Ships: teacher layer (class graph view, review queue, section 8.1/8.5), roster sync via one broker (Clever, given its lower district-side adoption friction), the production pipeline end to end for a peer-review-only version of Production (no payout yet, since payout requires the custody and anti-fraud machinery of section 6.3, deliberately deferred), under-13 consent flow via the school-consent exception (section 9.2, the lower-friction path for a pilot), diagnostic probes for cold-start learners (section 4.1 step 5), and basic i18n (Spanish alongside English, machine-translated with flagged status). Success criterion: a teacher can assign a target node, see the whole class's frontier state, and clear a review queue without opening a spreadsheet.

### Phase 2: District-ready

Multi-school, multi-broker (add ClassLink), LTI 1.3 launch for LMS-standardized districts (section 8.3), full payout accrual and custodial ledger (section 6.3), Open Badges credential issuance for the K-12 tier (gated behind the same validation-against-real-outcomes guardrail Academy's adult credential already enforces, EPIC.md §5), standards crosswalk reporting (section 8.6) against at least CCSS and one state framework, offline mode for the mobile client (section 12), and the Neo4j CDC pipeline moving from batch to streaming as query volume grows past what a nightly sync can keep fresh. Success criterion: a district can onboard through its existing SIS with no custom integration work, and a parent can see a real, explainable payout ledger entry the first time their child's work gets cited.

### Phase 3: Global free

Full multilingual coverage (human-reviewed translations for the highest-traffic locale/subject pairs, section 12.1), low-bandwidth and fully offline-capable mobile client shipped and tested against real intermittent-connectivity conditions rather than simulated ones, independent-learner path fully self-service (parent-consent flow with no school intermediary, section 9.2 path b), all subjects with at least atom-layer coverage K-12, canon coverage continuing to grow organically as it already has (new branches added the way `08-deep-history` and `09-art` were), and the cost-control program from section 11.4 matured enough (batch pre-generation, aggressive caching, a validated cheap-default routing policy) that the marginal cost per active learner has come down from the Phase 0-2 baseline, since global-scale free access is the phase where the AI-inference cost line either holds or breaks the nonprofit's economics. Success criterion: any learner, anywhere, with any connectivity, in a supported language, can run the same "why is the sky blue" flow the Phase 0 prototype proved, at whatever their local infrastructure allows.
