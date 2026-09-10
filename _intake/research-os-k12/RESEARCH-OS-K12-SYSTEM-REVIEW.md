# Research OS for K-12 System Review

Bucket Foundation, bucket.foundation. Nonprofit, 501(c)(3) filing pending, held in the founder's
personal capacity. Synthesis of four inputs in this folder: `01-inventory.md` (codebase today),
`02-architecture.md` (ideal production architecture), `03-data-services-system-review.md` (vendors
and data sources, filed under this name because `03-data-services.md` already existed in this
folder with the same content), `04-compliance-distribution.md` (legal, school operations, pilot
research design). Product definition under evaluation, verbatim:

> Bucket becomes the operating system a student runs inside from the first year of school to the
> research frontier. Everything humans know sits on one map, in layers, from the first fact a
> child can hold to the deepest laws we have, across every subject from physics to history. A
> twelve-year-old who asks why the sky is blue gets walked backward to what they already know and
> forward, one source at a time, to the physics that answers it. Every idea on the map has five
> stages: Access, Awareness, Understanding, Internalization, Production. The student's work is a
> claim, the evidence, the sources, and proof they can use the idea somewhere new. The map is the
> game. The AI finds, quotes, checks, and organizes; the student asks, sketches, works through the
> hard part, writes the answer. Teachers see their class on the same map. Productions the map
> accepts get paid like any researcher on Bucket. Nonprofit, free to any learner anywhere. Same
> graph serves college and PhD.

Two contradictions between the input reports are resolved up front, since both recur throughout this
review.

**Canon branch count.** The inventory's header claims "11 top-level branches," counting `_bridges`
(45 cross-reference files) as a branch alongside `01-mathematics` through `09-art`. The architecture
report counts ten: mathematics, physics, chemistry, information, biophysics, cosmology, mind,
deep-history, sacred-texts, art. Ten is correct. `_bridges` is a cross-branch reference directory
that sits outside the ten content branches, and the inventory's own per-branch table lists it
separately from the ten subject branches it also names. This review uses ten branches throughout.

**Learner-state model.** The inventory found a real, shipped 4-rung depth ladder in
`src/lib/academy/mastery.ts` (Recall, Apply, Derive, Teach-back), plus an unrelated 6-rung
site-journey ladder in `src/lib/depth-ladder.ts` (L0 through L5, basic literacy to producing new
knowledge). Neither matches the product definition's five per-node states (Access, Awareness,
Understanding, Internalization, Production). The architecture report resolves this by treating the
five-state model as the four-rung ladder plus one new gate: Access has no Academy equivalent and
must be built from nothing; Awareness maps to Recall; Understanding maps to Apply; Internalization
maps to Derive; Production maps to Teach. The site-journey ladder (L0 to L5) stays a separate, valid
concept: a learner's journey across site sections, distinct from the per-node state model the
product needs. This review adopts the four-plus-one mapping and treats the two ladders as different
axes throughout.

Two smaller inconsistencies surface once the two headline contradictions are settled. Both carry
forward into the gap analysis and risk register below as open items, unresolved here.

**Auth surface.** The inventory documents three overlapping systems: Dynamic wallet-connect sits
alongside Supabase email-OTP, plus a third, NextAuth with a Supabase adapter, with the relationship
between the second and third explicitly untraced ("possible duplicate/legacy path" in the
inventory's own words). The
architecture report's identity section (9.1) is silent on NextAuth entirely; its account-types table
assumes Supabase Auth is the sole learner-facing system and never mentions the third. This is not a
contradiction the architecture report resolves, it is a gap the architecture report does not know
exists, because it was not asked to audit the current auth code the way the inventory was. This
review treats the auth reconciliation as unfinished business, tracked as a Phase 0 gap-analysis row
and an open question in Section 11; the architecture's silence on NextAuth reads as a question the
architecture report never asked, still waiting on an answer.

**Compliance posture versus shipped code.** The compliance report establishes that GDPR's age of
consent is not a flat number, it runs 13 to 16 depending on EU member state, with Germany at 16 and
Austria at 14. The inventory reports Academy's actual shipped line as a flat 13-plus threshold
(`EPIC.md`). The architecture report's grounding section repeats the flat 13-plus framing without
flagging the mismatch. This review treats Academy's current posture as already non-compliant for a
meaningful share of the EU, a fact none of the three reports states outright when read on its own,
and carries that forward into the gap analysis and the compliance summary's jurisdiction-aware
age-gate requirement.

---

## 1. Verdict in Ten Lines

1. **Knowledge graph**: two disconnected graphs exist today, a citation graph over ten canon
   branches and a 487-atom prerequisite DAG over seven STEM branches; the product needs one tiered
   graph spanning every subject, which requires a new schema built to join both populations.
2. **Learner state**: the hardest part is already shipped. `mastery.ts` fuses IRT/Elo proficiency
   with FSRS retention into a four-rung ladder that maps cleanly onto four of the five product
   states; only the bottom Access gate is unbuilt.
3. **Frontier-backward routing**: does not exist in any form. Academy's diagnostic runs a binary
   search forward from an assumed-zero prior, the reverse of the direction a curiosity-driven K-12
   product needs.
4. **Workspace and AI tool surface**: the constrained, grounded, citation-validated tutor at
   `/api/academy/tutor` is production-grade and reusable as a pattern; there is no spatial canvas
and
   no persistent workspace UI anywhere in the repo, and neither Locate nor Quote exists as a
   retrieval tool.
5. **Production pipeline and payout**: no claim-evidence-sources-transfer-proof artifact type
   exists, no review queue exists, no custodial ledger exists, and Story Protocol minting stays
   testnet-only while author payout over x402 remains metadata-only, with no code path that
   executes a payment to an author.
6. **Teacher and school layer**: zero database rows, zero routes, zero roster or LTI integration.
   This is a from-scratch build with no existing scaffolding to extend.
7. **Identity and minors**: three overlapping auth systems (Dynamic wallet, Supabase email-OTP,
   NextAuth) with no reconciliation, no role column anywhere in the schema, and no age gate;
   under-13 support is new engineering built on top of a legal framework that does not exist yet
   either.
8. **Ingestion**: the canon's foundations-only ingestion pipeline is real and reusable as a pattern;
   no atom-tier pipeline exists for standards-aligned K-12 content, and no dedupe or edge-inference
   worker runs today.
9. **Infrastructure**: the Vercel plus Supabase plus Hetzner K3s split the architecture calls for is
   already the org's default pattern; the only new provisioning is Neo4j as a CDC-fed read replica,
   which the org's Hetzner box already has room for.
10. **Compliance**: the largest gap and the least forgiving one. COPPA, FERPA, the EU AI Act, and
    the minors-and-money question each require legal work and consent infrastructure that has no
    code and no signed paperwork today.

---

## 2. Today's System

### What exists and is reusable

| Component | File path | Why it carries forward |
|---|---|---|
| FSRS plus IRT/Elo fusion | `src/lib/academy/mastery.ts` (server TS port), `learning/app/js/{fsrs,engine,adaptive}.js` (9,201 lines, client) | The exact knowledge-tracing spine the architecture calls for (`M = P^alpha * R^beta`); do not rebuild it |
| Constrained AI tutor pattern | `src/app/api/academy/tutor/route.ts` (422 lines) | Grounds every answer in client-supplied atom content only, abstains outside grounding, validates every citation against a closed source allow-list, never trusts model-parsed links. This is the working reference implementation for the product's find/quote/check/organize constraint |
| Credential issuance | `src/lib/academy/credential/{build,consistency,issuer,sign,store,types}.ts` | Open Badges 3.0 and W3C Verifiable Credential issuance, EdDSA-signed, already decided against an NFT-mint model for credentials, matching what the K-12 production pipeline needs |
| Private schema plus RLS pattern | `supabase/migrations/20260612000000_academy_progress.sql`, `20260626000000_academy_credentials.sql` | A private `bucket` schema deliberately not exposed over shared PostgREST, full row-level security, a touch-updated-at trigger. The right pattern for `learner.node_state` and `payout.ledger` |
| Prerequisite DAG with derived centrality | `learning/app/corpus/*.json`, `src/lib/academy/corpus.ts` | 487 atoms across seven STEM branches plus a meta deck, real `requires` edges, a derived reach score computed by walking edges backward at load time. The closest existing thing to `graph.prereq_ancestor` |
| Agent-trust settlement pattern | `src/app/api/research/route.ts`, `PROTOCOL.md §3.1` | Server-side-only x402 settlement, no payment challenge ever reaches the caller, a documented fix to a real safety-agent refusal. The pattern every learner-facing and agent-facing endpoint should copy |
| Canon ingestion pattern | `bucket-canon/*/_intake/`, `CANON_INDEX.md`, `primary-papers.yaml` | The review-before-publish workflow is worth extending for atom-tier ingestion; the schema underneath it still needs to be built new |
| feed402 envelope and `/llms.txt` | `PROTOCOL.md §4.1`, `public/llms.txt` | The citation sidecar shape (`cite`, `receipt`, `provenance`) the production envelope extends |

### What exists and must be replaced or reconciled

- **Auth**: three systems, Dynamic wallet-connect for authors alongside Supabase email-OTP for
  Academy learners, plus NextAuth with a Supabase adapter for a third, untraced surface, with no
  documented relationship between the second and third. Building new account types on top of this
  (teacher, parent, district admin) without reconciling it first compounds the ambiguity.
- **Story Protocol minting**: hardcoded to `https://testnet.storyrpc.io` and Base Sepolia EAS. The
  architecture correctly routes around this for K-12 credentials (Open Badges and W3C VC only, no
  NFT mint), so this gap does not block the K-12 build, but it remains unresolved for the adult
  product and should not be assumed production-ready anywhere.
- **The L0 to L5 site-journey ladder** (`src/lib/depth-ladder.ts`): valid as a site-navigation
  concept on its own terms. Keep it for that purpose; the five-state per-node requirement needs its
  own model, built as described in Section 3.
- **Academy's flat 13-plus GDPR line** (`EPIC.md`): the compliance report's own research shows
  GDPR's age of consent is not a flat 13, it runs 13 to 16 depending on member state (Germany and
  Austria sit at 16 and 14). Academy's current posture is already out of step with GDPR for a
  meaningful share of the EU, before any K-12-specific work begins.

### What is missing entirely

Unified graph schema spanning atom and canon populations. Frontier-backward routing. The Access
state and any per-node five-state tracking. A production-envelope artifact type. A teacher or school
role anywhere in the data model. Roster sync and LTI launch. Any classroom-facing UI. A custodial
payout ledger and the guardian-as-payee flow. An age gate and any COPPA or FERPA consent flow. A
spatial canvas workspace. K-12 content calibrated to any grade band in any subject (a grep across
`learning/` and `src/content/education/` returns zero grade-level matches).

### Real versus aspirational, condensed

| Claim | What the code does today |
|---|---|
| One knowledge graph across all subjects | Two unjoined graphs: a bibliographic citation graph over ten canon branches, and a prerequisite DAG over seven STEM branches plus one meta deck. No subject has both a canon presence and Academy coverage in a linked way. |
| Frontier-backward routing from a curiosity question | Not implemented. The Academy graph supports forward topological walk only; no query starts at a target and backward-chains to a learner's held state. |
| Five learner states per node | Does not exist as named. A four-rung per-concept quiz-depth ladder and a six-rung per-learner site-journey ladder both exist, and neither is the five-state per-node model, per the resolution above. |
| Student workspace with constrained AI | Partially real. One grounded, citation-validated tutor scoped to a single atom exists; no persistent workspace, no notebook, no draft space, no canvas. |
| Teacher view | Does not exist. No role system, no classroom data model, no teacher route anywhere. |
| Production envelope as claim, evidence, sources, transfer proof | Does not exist. The closest analogue is a credential that certifies a mastery threshold was reached; a structured, citable claim-evidence-sources artifact is a separate thing and has no built equivalent. |
| Citation payments over x402 | Reader-side settlement is real and live in the zero-key sense. Author payout on downstream paid re-publication is metadata-only; no code path executes it. |
| Free to any learner | True today for Academy's nucleus paths; no paywall exists on `/academy` or `/api/academy/*`. |
| K-12 framing | Used only as a demographic label citing a world-access statistic. No content, quiz, or UI is calibrated to a grade band anywhere in the repo. |

---

## 3. Ideal-State Architecture

### System diagram

```
                    CLIENTS
  student-web (canvas)   teacher-web (class view)   parent-web (consent, view-only)
  mobile (offline-first)   agent API (feed402 envelope, zero-key, capped)
                              |
                     GATEWAY (Vercel edge + Next.js)
      session check, LTI/OIDC verify, rate limit, age-tier routing, feed402 wrapper
                              |
   +----------+----------+----------+----------+
   GRAPH        LEARNER      WORKSPACE    PRODUCTION   SCHOOL
   node/edge     STATE        / AI svc     svc          svc
   CRUD,         5-stage,     locate/      envelope     roster sync,
   frontier-     Elo+FSRS,    quote/       intake, AI   LTI 1.3,
   backward      evidence     check/       pre-check,   class graph,
   route         ledger       organize     review       reports
   +----------+----------+----------+----------+
                              |
        ASYNC WORKERS  |  AI LAYER  |  PAYMENTS / CUSTODY svc
   ingestion, dedupe,   router: Haiku    custodial ledger per learner
   closure refresh,     for organize,    (school or parent held), x402
   CDC to Neo4j,        Sonnet for       settlement, operator wallet
   payout batch,        check/tutor,     only, never learner-facing
   credential issuance  cached, capped
                              |
                       DATA STORES
   Supabase Postgres (system of record): graph.node/edge, learner.node_state,
     learner.evidence, production.envelope, school.roster, payout.ledger, pgvector
   Neo4j on Hetzner K3s (read-optimized index): routing queries, canon browser,
     graph data science jobs (shortest path, community detection, orphan/bridge)
   Object storage: source PDFs, media, offline bundles
   Dolt: org bead and audit trail only, no learner PII ever lands here
                              |
                       INTEGRATIONS
   OneRoster 1.2 via Clever/ClassLink, Google Classroom import
   LTI 1.3 Advantage: Deep Linking, Names/Roles, Assignment/Grade Services
   Supabase Auth (email-OTP) plus district SSO (SAML/OIDC)
   Dynamic (13-plus, operator- and adult-researcher-side only, never a minor's UI)
   x402 on Base (operator wallet pays and receives, agent-trust rule applies)
   Open Badges 3.0 / W3C VC issuance, Viatika metering, feed402 discovery
```

Design rule carried over from `PROTOCOL.md`'s agent-trust section: no client surface, including the
student canvas and the agent API, ever receives a payment challenge or an instruction to sign
anything. Settlement is always server-side, operator wallet to operator wallet.

### Knowledge graph model

The canon stays a strict, human-curated filter: foundations, axioms, laws, primary derivations only,
never "7 x 8 = 56." A K-12 curriculum needs exactly that kind of non-foundational fact, so the graph
carries two node populations under one schema, distinguished by a `tier` enum, which keeps the canon
bar intact.

| Population | Tier values | Who writes it | Example |
|---|---|---|---|
| Atom | `atom` | AI-drafted from curriculum standards and textbooks, teacher-reviewed | "A fraction represents a part of a whole" |
| Canon | `draft`, `candidate`, `canon` | AI-assisted ingestion, human canon review, the existing pipeline | Newton's second law |

An atom connects upward into canon through `generalizes` or `example_of` edges once a K-12 topic
reaches a real foundation. A fifth-grade "energy is conserved" atom is `example_of` the conservation
law in `02-physics`. Subjects with no canon branch yet (civics, world language, most of English
language arts) stay atom-only in their own subject namespace until enough structure accumulates to
justify curating a branch, the same organic path that already produced `08-deep-history` and
`09-art` from nothing.

**Node kinds**: `fact` (atomic, no internal derivation, atom-tier only), `concept` (a named
organizing idea, any tier), `law` (a general tested regularity, candidate or canon), `derivation` (a
step-by-step path from premises to a result), `primary_source` (a citable artifact, cited not
mastered), `artifact` (a learner- or researcher-produced work, the production pipeline's output).

**Edge kinds**: `prerequisite` (the routing backbone, source easier than target, carries a FIRe
credit fraction), `derives_from` (logical consequence), `cites` (evidence, timestamped for
citation-fee accrual), `generalizes` and `example_of` (the pair that lets atom and canon coexist as
one traversable graph), `contradicts` (the two nodes cannot both be held true in the same frame).

**Core schema** (Postgres, `graph` schema):

```sql
create type graph.node_kind as enum
  ('fact','concept','law','derivation','primary_source','artifact');
create type graph.node_tier as enum ('atom','draft','candidate','canon');

create table graph.node (
  id uuid primary key default gen_random_uuid(),
  kind graph.node_kind not null,
  tier graph.node_tier not null default 'atom',
  subject text not null,            -- 'math','ela','science', or a canon branch slug
  branch_ref text,                  -- fk-by-convention to a bucket-canon branch, null for atom-only subjects
  grade_band int4range,             -- e.g. '[0,2)' = K-1, null = not grade-scoped
  standards jsonb not null default '[]',  -- [{"framework":"CCSS","code":"..."}]
  superseded_by uuid references graph.node(id)
);

create table graph.node_label (
  node_id uuid references graph.node(id) on delete cascade,
  locale text not null,             -- BCP-47
  title text not null,
  body_md text,
  is_machine boolean not null default false,
  primary key (node_id, locale)
);

create table graph.edge (
  id uuid primary key default gen_random_uuid(),
  src_node_id uuid references graph.node(id) on delete cascade,
  dst_node_id uuid references graph.node(id) on delete cascade,
  kind text check (kind in ('prerequisite','derives_from','cites','generalizes','example_of','contradicts')),
  fire_credit real,                 -- fraction of mastery propagated, prerequisite only
  provenance jsonb not null default '{}'
);

-- precomputed ancestor closure for prerequisite edges, the routing algorithm's main
-- performance lever, refreshed incrementally by the ingestion worker on every write
create table graph.prereq_ancestor (
  node_id uuid references graph.node(id) on delete cascade,
  ancestor_id uuid references graph.node(id) on delete cascade,
  min_hops smallint not null,
  primary key (node_id, ancestor_id)
);
```

**Storage choice**: both Postgres and Neo4j, with Postgres as the only writable system of record. At
the scale assumed (10^6 to 10^7 nodes, 10^8 edges, 10^6 learners), Postgres wins on locality: a
backward closure from any target node rarely exceeds a few thousand ancestors even at full graph
size, and `graph.prereq_ancestor` turns that into a single indexed scan in single-digit milliseconds
regardless of total graph size. Postgres loses on whole-graph algorithms: weighted multi-criteria
shortest path, community detection, and interactive multi-hop exploration are native to a graph
engine and become slow, hand-rolled recursive CTEs otherwise. Neo4j, already provisioned on the
org's Hetzner K3s box and underused, serves as a read-only secondary index fed by a CDC worker after
every Postgres write. The app never writes to Neo4j directly, so it can be dropped and rebuilt from
Postgres at any time.

### Learner state model

The five states generalize Academy's shipped ladder by adding one gate beneath it that an adult
autodidact with a device never needed.

| Stage | Definition | Assessment method | Academy ladder equivalent |
|---|---|---|---|
| Access | Prerequisites unlocked, content exists in the learner's language, device tier can render it, age-gating passes | Binary eligibility check, no AI call | Absent from Academy today |
| Awareness | Introduced to the node, can recognize it | First-exposure event plus a low-stakes recognition item | Recall, low confidence |
| Understanding | Can explain the idea in their own words | Rubric-graded free response, deterministic where possible, LLM-judge otherwise | Apply |
| Internalization | Can use the idea on a problem never seen before | A generated transfer item from a sealed held-out pool | Derive |
| Production | Adds something new to the graph, and the graph accepts it | The full production pipeline: AI pre-check, human review, acceptance | Teach |

A learner's `stage` is a high-water mark, matching Academy's existing mastered semantics: it only
moves forward on new evidence. A separate live retention signal, computed with the FSRS
retrievability function already shipping, decays continuously and drives what the spaced-review
scheduler surfaces. This lets the system represent "Internalization, verified six months ago,
current retention 0.41" without overclaiming, which is what a credential check needs.

Knowledge tracing stays IRT/Elo composed multiplicatively with FSRS, `M = P^alpha * R^beta`, exactly
the formula already live in `adaptive.js`. This is not a from-scratch modeling decision: Bayesian
Knowledge Tracing fuses poorly with a spaced-repetition decay term and does not fit partial-credit
grading, and Deep Knowledge Tracing needs a dense per-skill interaction history that most of a
10^6-to-10^7-node graph will never have, while also producing an opaque score that raises regulatory
exposure when the subject is a minor. The one tuning change worth making for younger learners:
shrink the Elo K-factor and widen the recognition-to-explanation gap for the K-2 band, since a
six-year-old's response variance comes from reading friction and attention more than from knowledge
state, and an adult-tuned update rule over-reacts to that noise.

**Understanding versus Internalization, in practice.** Understanding is a free-response explanation
item, graded first by deterministic checks where the domain allows (symbolic equivalence through a
computer algebra system for math, keyword or structure matching against a defined rubric elsewhere),
falling back to an LLM-judge pass when no deterministic check applies. A teacher override is always
available and is itself an evidence record, which both corrects the model in that instance and
accrues a labeled example for the next rubric-tuning pass. Internalization is a transfer task
generated by construction, a template skeleton plus a scenario wrapper, multi-hop across the graph,
Bloom-targeted, with distractors drawn from an error model, pulled from a held-out item pool the
learner has never seen. This reuses Academy's existing practice-and-credential firewall unchanged:
practice attempts allow retries and self-report, while the stage advances only on a checkpoint
attempt from the sealed pool, exposure-controlled so the item set never leaks into a study guide.
Teacher judgment is a first-class evidence kind from the start: a teacher can advance or hold back a
stage directly, with a required one-line reason stored on the evidence record, which is what gives
the class review queue real teeth instead of a decorative status.

### Frontier-backward routing, in steps

1. **Resolve the target.** Free text ("why is the sky blue") embeds and matches `graph.node_label`
   via pgvector, ranked within the learner's grade band plus one band above.
2. **Load the learner's mastered set.** Query `learner.node_state` for every node at `stage >=
   understanding`, since a node the learner can explain is safe to route through.
3. **Backward closure.** Read `graph.prereq_ancestor` for the target, a single indexed scan that
   stays flat as the graph grows.
4. **Intersect.** `frontier = ancestors(target) ∩ mastered(learner)`, kept as the mastered nodes
   closest to the target by minimum hop count. Everything between the frontier and the target is the
   gap.
5. **Handle unknown prior knowledge.** If the frontier is empty or thin, run a diagnostic probe
   against only the top-five candidate frontier boundary nodes by grade-band prior, two items each,
   cheaper than Academy's adult binary search because a K-12 learner's grade band is a strong prior
   an anonymous adult signup lacks.
6. **Forward shortest path.** From the frontier to the target over `prerequisite` and `generalizes`
   edges, weighted by one minus FIRe credit and reranked by the learner's interest vector, computed
   against the Neo4j replica.
7. **Emit the path** as an ordered list of nodes with each node's current stage, ready to render as
   the visible frontier on the canvas.

Cost: the backward closure is bounded at a few thousand rows regardless of graph size; the forward
shortest path runs on a small subgraph and returns in single-digit milliseconds; the only real
expense is the cold-start diagnostic, five to ten graded calls, and a returning learner skips it
entirely.

**Caching and personalization.** The frontier set for a given learner and target caches in a
materialized `learner.frontier_cache` row, invalidated by an event-driven trigger: any new evidence
write touching a node on a cached path fires a queue message that recomputes only that learner's
affected cached frontiers, a targeted update instead of a full recompute, so a learner opening the
same subject repeatedly in one sitting hits cache every time after the first. Personalization enters
at exactly two points: the
interest-vector rerank in step 6, which subject-adjacent path to prefer among equally short options,
and the diagnostic's grade-band prior in step 5, which nodes to probe first. The shortest-path
computation itself stays learner-agnostic on the graph structure, which keeps the Neo4j query
cacheable across every learner hitting the same target from the same frontier shape.

### Workspace and the constrained AI tool surface

A pannable, zoomable canvas centered on the graph itself: mastered nodes lit, gap nodes dim, the
target node ahead and unresolved, a fixed work panel for the student's own claim, evidence, and
scratch space.

Four tools, matching the product line that the AI finds, quotes, checks, and organizes.

| Tool | What it does | Model tier | LLM call |
|---|---|---|---|
| Locate | Finds candidate nodes and sources via pgvector plus full-text search | n/a | No, retrieval only |
| Quote | Pulls exact source text with a citation anchor, never paraphrases | n/a | No, exact retrieval |
| Check | Verifies a claim against cited evidence, scores against a rubric | Sonnet-tier | Yes, always |
| Organize | Restructures notes into the claim-evidence-sources envelope shape | Haiku-tier | Yes, light |

Locate and Quote are retrieval operations by design, the highest-volume tool uses in a session, with
no reason to touch a language model.

**What the AI is forbidden from doing.**

- Write the claim, the explanation, or the answer for the student. Check returns a verdict and a
  pointer to what is missing, never a corrected version of the student's own sentence.
- Solve the problem itself. A math or science question routed to Check is graded on the student's
  own work; a stuck student reaches a separate, narrower tutor dialogue surface that can ask a
  Socratic question and stops short of the answer.
- Grade itself into the credential path silently. Every Check result that would advance a stage past
  Understanding writes a teacher-visible evidence row a human can override.
- Initiate a payment, contact a party outside the workspace, or leave the sandboxed research or
  tutor scope. No general-purpose chat model sits behind a K-12 account; there is no open-ended "ask
  me anything" surface for a minor.
- Return a payment challenge or ask a student to sign anything, per the agent-trust rule
  `PROTOCOL.md` already establishes and this design extends to every learner-facing surface.

**Guardrails for minors.** Every model call on the student-facing surface runs behind a content
filter tuned to the account's age band, layered on top of standard safety classifiers as an added
constraint. Tool access is enforced at the gateway, an allowlist ahead of the system prompt: a
request for a fifth tool, or a Check call targeting a node outside the student's current path, is
rejected before it reaches the model. The tutor dialogue tool carries a fixed turn budget per
session and logs every turn to `learner.evidence` for teacher visibility. Parent- and
teacher-visible activity logging is the default for every under-13 account; nothing a minor does in
the workspace is private from the consenting adult on the account, which is also what keeps the
COPPA educational-purpose-only line clean.

At the assumed usage profile (about 17 sessions a month, one Organize call per session, eight graded
Check calls a month, half of sessions requesting a three-turn tutor dialogue), blended AI inference
lands near $0.23 a month for a light user and $0.90 to $1.00 for a heavy one, using current
Anthropic first-party pricing (Haiku 4.5 at $1.00 and $5.00 per million input and output tokens,
Sonnet 5 at $2.00 and $10.00, cached input at a 90 percent discount). This is the single largest
variable cost line at scale, covered in the cost model below.

### Production pipeline and custodial payout

The production envelope extends the canon's existing citation sidecar with a pedagogical shape: a
claim, its evidence, its sources, and the Internalization-stage transfer proof gating submission.

Flow: a learner submits only after their transfer-proof evidence shows Internalization on the
relevant node. An AI pre-check runs an originality check against existing artifacts, a
canon-conflict check against any `contradicts` edge, and a citation-validity check against the Quote
tool's own log. The submission lands in the class review queue, where a teacher accepts, rejects
with a reason, or requests revision; for older learners, a small panel of higher-stage peers can
co-review with the teacher as tiebreaker, reusing Academy's existing candidate-tier review pattern.
An accepted envelope becomes an `artifact` node at `draft` or `candidate` tier, never straight to
`canon`, linked by `derives_from` or `cites` into the graph. Every subsequent citation into it is
timestamped and counted, the same mechanism the adult canon already uses.

Custody reuses the decision already made for the adult credential: no Story Protocol NFT mint, a
signed verifiable record plus a ledger entry instead. No wallet is ever exposed to a student under
18. A payout accrual posts to `payout.ledger`, held by the school district under its FERPA data
agreement or by a parent or guardian in a UTMA-style structure: the minor is the beneficial owner, a
named adult controls disbursement until majority, and the Foundation's operating wallet is the only
party that ever touches x402 directly. Anti-fraud measures reuse Academy's Phase 2 anti-gaming plan:
submission-volume rate limits, an effort filter on the gating transfer-proof, a sybil gate before a
new account's first submission counts toward payout, and mandatory teacher attestation for any
under-13 account before its first payout-eligible acceptance.

### Teacher and school layer

A class graph view renders the same graph a student sees, aggregated: every student in a class shows
as a marker on the frontier-to-target path at their current stage, answering who is stuck or ready
for something harder, and whose production needs review, without a separate reporting layer.
Roster sync targets OneRoster 1.2, which covers both Clever (free to the district, larger app
library) and ClassLink (district-paid, deeper IT control) for close to the cost of one integration;
Google Classroom import serves classrooms too informal for a full SIS-to-broker pipeline. LTI 1.3
Advantage gives Deep Linking (a teacher picks a target node as an assignment from inside their LMS),
Names and Role Provisioning, and Assignment and Grade Services for gradebook passback. An assignment
is a target node plus a due date plus a roster; the system runs frontier-backward routing per
student, so twenty students on one assignment get twenty personalized paths converging on the same
target. The review queue reuses the production pipeline's UI, filtered to a teacher's roster, with
batch actions so a teacher of thirty does not read thirty full submissions unaided. Reporting rolls
up class coverage of any standards framework directly from `graph.node.standards`, since every node
already carries its framework codes.

### Identity

| Account | Auth path | Notes |
|---|---|---|
| Student, roster-synced | District SSO or LTI launch | No password ever set by the child |
| Student, independent, 13-plus | Supabase email-OTP | Same as current Academy auth |
| Student, independent, under 13 | Parent-initiated on the parent's email, child gets an on-device short code or QR login | New; Academy has never had this path |
| Teacher | District SSO or district-domain-verified email-OTP | Scoped to rostered sections only |
| Parent | Email-OTP, view-only plus consent management | No editing of a child's work, ever |
| District admin | District SSO with an admin role claim | Roster management, reporting |

Age comes from the roster or from parent-provided birthdate, never self-declared by the child. Under
13 in the US, two lawful COPPA paths: the school-consent exception (the district signs a
data-processing agreement covering every rostered student) or direct verifiable parental consent for
independent accounts. FERPA governs any data flowing through a school relationship regardless of
age. Dynamic, the current wallet vendor, stays entirely out of every K-12 learner-facing flow, under
13 or 13 to 17; it remains an operator- and adult-researcher-side integration only, with the narrow
exception of a 13-plus independent learner opting into a real custodial crypto account under
explicit added parental consent.

### Ingestion

Curriculum standards, open textbooks, and primary sources are parsed into candidate statements with
their stated grade level or standard code attached. Each becomes a draft `graph.node` at `atom`
tier, or `draft` for canon-track material. A pgvector similarity pass against existing nodes in the
same subject and adjacent grade bands flags a proposed merge whenever similarity crosses a
threshold, reviewed by a human before merge, so a near-duplicate never enters the graph silently. An
LLM proposes `prerequisite` and `generalizes` candidate edges from standards sequencing and node
text, every edge carrying its provenance and queued for human review before it can affect routing,
since a wrong prerequisite edge silently breaks routing for every learner who touches it. On
acceptance, the node and its edges go live, `graph.prereq_ancestor` refreshes incrementally for the
affected subgraph, and the Neo4j CDC worker picks up the change on its next cycle. Quality gates: no
node ships without at least one edge, no prerequisite edge ships without human review, no
atom-to-canon `generalizes` edge ships without a higher-bar canon-track reviewer.

### Gamification

The five-stage model is the game loop by design; no separate points system is needed to make
progress feel real, since each stage transition marks a capability change a learner did not have
before. The visible frontier on the canvas is the map screen: mastered territory lit, the gap dim,
the target always in view. A learner's interest vector, a running weighted average over the subjects
and node kinds they engage with unprompted, updates every session and acts only as a tiebreaker in
routing and in "what's next" suggestions, never as a hard filter, which keeps a required
prerequisite from ever being skipped because a student prefers a different subject that day. Four
mechanics are deliberately absent: leaderboards ranking children against each other, streak-loss
shaming of any kind, variable-ratio reward mechanics (loot-box-style unpredictable payouts,
randomized bonus multipliers), and public comparison for young children in any form, distinct from
the adult product's public-resume framing. Every stage transition and every citation payout is
deterministic and explainable instead, both because the credential's trust requirement demands it
and because unpredictable extrinsic rewards layered on an activity that is inherently interesting
can undermine a child's own interest in it. The verifiable Mastery Profile stays an opt-in feature
starting at 13, consistent with Academy's existing line, and comparative ranking of any kind stays
an adult-tier feature until then.

### Offline mode and internationalization

A grade-band-and-subject content pack, node labels, body text, and pre-generated transfer items for
a bounded subgraph, downloads as a single versioned bundle to the mobile client, so a student can
read, review (FSRS scheduling runs client-side against the bundle), and attempt Understanding-level
work with zero network. Evidence records generated offline queue locally and sync to
`learner.evidence` on reconnect using client-generated identifiers, so sync stays idempotent and
safe to retry. Frontier-backward routing itself needs connectivity, since it depends on the live
graph and other learners' state for Production-stage citation checks, so routing recomputation waits
for the next online session while offline mode operates on the path already downloaded. Check and
Organize require a network round-trip to the model by construction and stay unavailable offline; an
offline session defaults to self-check against a bundled answer key for Understanding-level
practice, with full Check-graded credentialing deferred to the next sync. A low-bandwidth web mode
renders text-first, deferring images and the 3D canon visualizations behind a tap.

`graph.node_label` is locale-keyed from the schema's first migration, so multilingual content is a
first-class dimension built in from the start, with no later retrofit needed. The pilot-to-global
sequence:
machine-translate every node label at ingestion time into a baseline set of high-reach languages
(Spanish, French, Portuguese, Swahili, Arabic, Hindi, Mandarin), flag every machine-translated
label, and route the highest-traffic locale-and-subject pairs to human review first, the same
reviewed-versus-generated distinction Academy already draws for its own polyglot mode. UI chrome
(buttons, navigation) is a standard i18n string table, decoupled entirely from node content.

### Infrastructure

Vercel plus Supabase for the application tier, matching the org's existing pattern of fast iteration
and zero ops burden for a pre-revenue nonprofit. Hetzner K3s for stateful, self-hostable infra that
benefits from being owned: Neo4j, already provisioned; heavier async workers; anything with pricing
that scales badly on a managed platform at real volume. Supabase's built-in pgmq handles ingestion,
closure-table refresh, and CDC-to-Neo4j jobs through the pilot and district phases, with a dedicated
queue only if throughput crosses six-figure daily job volume. pgvector on the existing Postgres box
handles semantic search at 10^7-node scale with no second vector database needed. Backups: Supabase
point-in-time recovery for the system of record; Neo4j needs no independent backup since it is fully
rebuildable from Postgres.

---

## 4. Gap Analysis

| Subsystem | Today | Ideal | Gap | Effort | Phase | Build or Buy |
|---|---|---|---|---|---|---|
| Graph node and edge schema | No `graph` schema exists; canon and Academy content live as flat files | Postgres schema with `node`, `node_label`, `edge`, `prereq_ancestor` | Full new schema and migration | M | 0 | Build |
| Atom-tier content authoring | Zero K-12-calibrated content in any subject | AI-drafted atoms from standards, teacher-reviewed | New content pipeline plus a first seeded path | M | 0 | Build |
| Canon-atom join edges (`generalizes`, `example_of`) | No link between canon and Academy vocabularies | Bidirectional edges joining atom topics into canon foundations | New edge kind and a review pass over existing canon entry points | S | 0 | Build |
| Prerequisite ancestor closure table | `unlocks` plus a reach score computed at load time in `corpus.ts` and never persisted to a table | `graph.prereq_ancestor`, incrementally refreshed | New table plus incremental-refresh worker | M | 0 | Build |
| Neo4j read replica and CDC | Neo4j provisioned on Hetzner, unused for this purpose | CDC worker mirroring node/edge after every write | New worker, batch sync acceptable through pilot | M | 1 | Build |
| Access-stage gate | Not modeled | Binary eligibility check, no AI call | New stage logic, cheapest state to add | S | 0 | Build |
| Awareness/Understanding/Internalization/Production mapping | Four-rung ladder in `mastery.ts` already covers these conceptually | Same math, renamed and re-gated with Access beneath | Rename and extend existing code | S | 0 | Build |
| Evidence ledger | No append-only evidence table exists | `learner.evidence`, partitioned by month | New table plus write path from every grading event | M | 0 | Build |
| K-2 knowledge-tracing tuning | Elo K-factor and depth items tuned for adult autodidacts | Shrunk K-factor, wider recognition-to-explanation gap for young learners | Parameter tuning plus age-band-specific item design | S | 1 | Build |
| Frontier-backward routing algorithm | No backward-chaining query exists | Target resolve, backward closure, intersect, diagnostic, forward shortest path | New algorithm end to end | L | 0 | Build |
| Diagnostic probe, grade-band prior | Academy's adult binary search over the whole graph | Five candidate boundary nodes, two items each, prior from grade band | New probe logic | M | 1 | Build |
| Frontier cache | None | Materialized `learner.frontier_cache`, event-invalidated | New table plus invalidation trigger | S | 1 | Build |
| Spatial canvas UI | Academy ships a study and quiz loop with no canvas surface | Pannable, zoomable graph-centered workspace | New frontend surface, the largest UI build in the plan | XL | 0 | Build |
| Locate tool | No retrieval endpoint scoped to workspace context | pgvector plus full-text search over labels and sources | New endpoint over existing pgvector index | S | 0 | Build |
| Quote tool | No exact-text retrieval endpoint | Verbatim passage retrieval with citation anchor | New endpoint, no model call | S | 0 | Build |
| Check tool | Tutor route grades within one atom already | Generalize grading to any node, rubric plus LLM-judge fallback | Extend existing tutor pattern | M | 0 | Build |
| Organize tool | Not built | Haiku-tier restructuring into the envelope shape | New light endpoint | S | 0 | Build |
| Tutor dialogue turn budget and scoping | Tutor exists but is not turn-budgeted for the canvas context | Fixed turn budget, logs every turn to `learner.evidence` | Extend existing route | S | 0 | Build |
| Production envelope schema | No artifact type exists | `production.envelope` with claim, evidence, sources, transfer-proof link | New schema | M | 1 | Build |
| AI pre-check, originality and canon-conflict | Not built | Embedding-similarity originality check, `contradicts`-edge conflict check, citation validity against Quote's log | New pipeline | M | 1 | Build |
| Teacher review queue | Not built | Confidence-sorted, batch-approve queue over `production.envelope` | New UI plus API | M | 1 | Build |
| Custodial payout ledger | No `payout` schema exists | `payout.custody` and `payout.ledger`, guardian or district held | New schema plus settlement worker | L | 2 | Build |
| x402 author payout execution | Spec-only, `reader_owes` always zero, no code path pays an author | Operator-wallet-to-operator-wallet settlement crediting the ledger | New settlement path | M | 2 | Build |
| Anti-fraud and sybil gating | Academy's Phase 2 anti-gaming plan exists as a design that has not been applied here yet | Rate limits, effort filter, sybil gate, teacher attestation for under-13 | Extend existing design into the payout path | M | 2 | Build |
| Teacher class graph view | Does not exist | Aggregated per-student stage markers on the frontier-to-target path | New UI | M | 1 | Build |
| Roster sync, Clever and ClassLink | No integration exists | OneRoster 1.2 client covering both brokers | New integration | M | 1 | Buy the broker relationship, build the client |
| LTI 1.3 launch | No integration exists | Deep Linking, Names/Roles, Assignment and Grade Services | New integration against an open spec | M | 2 | Build against an open spec |
| Standards crosswalk reporting | `standards` field does not exist on any node | Per-class, per-standard coverage rollup from `graph.node.standards` | New reporting view, depends on schema | S | 2 | Build |
| Role system | No `role` column anywhere in the schema | Student, teacher, parent, district-admin roles with scoped access | New auth-layer work | M | 0 | Build |
| Under-13 consent flow | Not handled anywhere in code | School-consent exception plus direct verifiable parental consent | New consent UI and data flow, legal-gated | L | 1 | Build UI, buy VPC verification mechanism |
| Auth system reconciliation | Three overlapping systems, relationship untraced | One documented, minimal auth surface per account type | Audit plus consolidation before new account types are added | M | 0 | Build |
| Standards and textbook ingestion parser | Canon's PDF/HTML parse-to-sidecar pipeline exists for foundations only | Extraction of candidate statements plus grade/standard code from curriculum sources | New parser, reuse existing sidecar pattern | M | 0 | Build |
| Dedupe and entity-link worker | pgvector used for canon search only | Similarity search against existing nodes, human-reviewed merge proposals | New worker | M | 0 | Build |
| Prerequisite edge inference | Not built | LLM-proposed edges from standards sequencing, queued for human review | New pipeline | M | 1 | Build |
| Offline and low-bandwidth mode | Not built | Versioned content bundles, idempotent evidence sync on reconnect | New mobile and sync work | L | 2 | Build |
| Multilingual node labels | No i18n on content, UI chrome only | `graph.node_label` locale-keyed from the start, machine-translate then human-review by traffic | Schema already supports this if built correctly at Phase 0 | M | 1 | Buy machine translation, build the review workflow |
| SDPC NDPA and Common Sense rating | Neither signed nor run yet | Signed NDPA on the Resource Registry, completed self-assessment | Paperwork, near-zero engineering | S | 0 | Buy the process (free), build nothing |
| EU AI Act conformity review | Not started | Risk management system, technical documentation, conformity assessment before EU market placement | Dedicated legal and engineering review, gated behind a later phase | XL | 3 | Outsource legal, build the documentation trail |
| Accessibility pass on the canvas | Not started; a pan/zoom graph is the highest-risk accessibility surface in the product | WCAG 2.2 AA linear navigation path, keyboard equivalents for pan/zoom, no color-only state encoding | Dedicated engineering pass before any district pilot | L | 1 | Build in-house, buy the third-party audit and VPAT |
| AI cost tracer and per-learner budget alerting | Standard Vercel/Supabase observability only | Per-model-call logging with token counts, cost, latency, rolled up per learner per month | New thin instrumentation layer | S | 1 | Build |

The five biggest gaps by system risk, in order, are the knowledge graph schema, frontier-backward
routing, the spatial canvas workspace, the compliance and consent layer, and the teacher and school
layer. The graph schema is the precondition for everything else in this table: routing, the
five-state model, the production pipeline, and reporting all read and write against `graph.node` and
`graph.edge`, so no other row in this table can ship correctly until this one lands. That single
dependency is why Phase 0 spends its entire budget here plus one hardcoded path, and touches no
other subsystem. Frontier-backward routing is the product's namesake mechanic and does not exist in
any form; Academy's diagnostic runs the opposite direction, so this is new algorithm work that
depends on the closure table shipping first. The spatial canvas is the largest single UI build in
the plan (XL effort, the only one at that size outside the EU AI Act review) and carries the highest
accessibility risk in the product, since pan-and-zoom navigation and spatial node relationships map
poorly to a screen reader or keyboard-only navigation by default; treating this as a Phase 0 concern
avoids a costly accessibility rebuild once a district pilot is close. The compliance and consent
layer spans
nine or ten rows in this table (auth reconciliation, role system, under-13 consent, the custodial
ledger, the accessibility pass, the EU AI Act review), and none of it can be deferred past Phase 1
without blocking every distribution path in Section 9 of the compliance report. The teacher and
school layer is a complete zero-to-one build with no existing scaffolding anywhere in the repo, and
it gates every procurement path past teacher-led free adoption, which is the reason Phase 0
explicitly ships with no teacher layer at all.

---

## 5. Services and Data

### Data sources

| Source | What | Free or Paid | License, minors, caching | Provide, Outsource, or Ingest | Phase |
|---|---|---|---|---|---|
| OpenAlex | Works, citations, topics, abstracts | Free key, metered since Feb 2026; Partner tier $20,000-plus/yr | CC0, cacheable, redistributable, minors-safe | Provide, mirror the snapshot locally | 0 |
| Crossref | DOI metadata for most scholarly output | Free, no signup; Metadata Plus $550/yr under $500K revenue | Metadata unrestricted; abstracts may carry publisher copyright | Provide/Ingest | 0 |
| Wikidata | Structured facts, subclass-of and part-of chains across 100M-plus items | Free, no key | CC0, no attribution required | Provide, the cross-subject skeleton | 0 |
| Wikipedia | Full-text encyclopedia, about 340 languages | Free, no key | CC BY-SA 4.0 plus GFDL, share-alike on derivatives | Ingest | 0 |
| PubMed and PMC | Biomedical index, abstracts, license-tagged OA full text | Free, 3 to 10 req/sec | Abstracts carry publisher copyright; PMC OA subset splits commercial-OK from NC-only | Provide/Ingest, per-record license check | 0 |
| Europe PMC | 33M-plus life-science records, 10.2M full text | Free REST, no hard cap found | Per-article, CC0 through CC-BY-NC | Provide/Ingest CC0 and CC-BY slice | 0 |
| arXiv | Preprint metadata across physics, math, CS, stats | Free, 1 req per 3 sec | Metadata CC0, PDFs not mirrorable by default | Ingest metadata, link out for text | 0 |
| Smithsonian Open Access | 5.1M-plus items, 11M-plus metadata records | Free, bulk JSON on AWS | CC0 for the Open Access set | Ingest | 0 |
| NASA, NOAA, USGS | Imagery, forecasts, earthquakes, geomagnetism | Free, key optional | US federal works, public domain | Ingest | 0 |
| Our World in Data | Global development, health, environment data | Free, CSV and JSON | CC BY on OWID's layer, upstream data varies | Ingest | 0 |
| Project Gutenberg | About 75,000 public-domain ebooks | Free bulk download | US public domain for most titles | Ingest, strip PG branding on commercial surfaces | 0 |
| Internet Archive | Books, texts, audio, video | Free | Mixed, public domain and CC uploads safe, CDL items borrow-only | Ingest public-domain and CC subset only | 1 |
| Library of Congress | Photos, maps, manuscripts, newspapers | Free, no key | Rights per item, much US-government public domain | Ingest with per-item rights filter | 1 |
| NGSS | K-12 science performance expectations | Free for nonprofit education use | Nonprofits may copy and adapt without fee; commercial use needs WestEd review | Ingest | 0 |
| Common Core | K-12 ELA and math standards | Free | Public license, must carry copyright notice | Ingest | 0 |
| 1EdTech CASE | Standards exchange spec with stable GUIDs | Free to implement | Open spec, certification requires paid membership | Provide the client, pull from live endpoints | 1 |
| PhySH | Physics subject headings, about 2,500 concepts | Free | CC0 since 2018 | Ingest for the physics branch | 0 |
| MeSH | Hierarchical biomedical vocabulary | Free | US government work, attribution required | Ingest for the biology branch | 1 |
| MSC 2020 | Three-level mathematics classification | Free download | CC BY-NC-SA per secondary sources, primary license unverified | Ingest as branch IDs only | 1 |
| Khan Academy | K-12 videos and exercises | Free to browse, no bulk API | CC BY-NC-SA, no framing, no paid walls | Ingest as links and embeds only | 1 |
| OpenStax | College and AP-aligned textbooks | Free | CC BY-NC-SA 4.0, confirmed twice against common assumption of plain CC BY | Ingest only while strictly noncommercial | 1 |

### Services

| Service | Vendor options | Free tier | Paid cost | Provide or Outsource | Phase |
|---|---|---|---|---|---|
| Hosting | Vercel | Hobby, noncommercial only | Pro $20/seat/mo plus usage | Outsource | 0 |
| Database, auth, storage, vectors | Supabase | 500MB free | Pro $25/mo then $0.125/GB; Team $599/mo | Outsource | 0 |
| Graph query engine | Neo4j Community self-host, or AuraDB | Community free | AuraDB Professional $65/GB/mo, 1GB minimum | Provide, self-host on existing Hetzner box | 1 |
| Compute | Existing AGFarms Hetzner CPX42 | Shared, marginal | Isolated box roughly $30/mo | Provide | 0 |
| CDN, DNS, WAF | Cloudflare | Free tier; Project Galileo grant for qualifying nonprofits | Pro $25/mo if Galileo does not apply | Outsource | 0 |
| Errors and tracing | Sentry | OSS plan free for MIT/Apache projects | Team $26/mo, Business $80/mo | Outsource, MIT license qualifies for OSS plan | 0 |
| Product analytics | PostHog | 1,000,000 events/mo free | Pay as you go beyond | Outsource | 0 |
| Transactional email | Resend | 3,000/mo free | Pro $20 to $35/mo | Outsource | 0 |
| Student login | Supabase Auth | 50,000 MAU free | $0.00325/MAU beyond Pro tier | Provide | 0 |
| Wallets and x402 signing | Dynamic | Under 1,000 MAU free | $249/mo for 1,000-5,000 MAU, then $0.05/MAU | Outsource, contributor-side only | 0 |
| x402 settlement | Coinbase CDP facilitator | First 1,000 transactions/mo free | $0.001 per transaction beyond 1,000/mo | Provide, own the protocol layer | 0 |
| Under-13 consent verification | PRIVO, k-ID | k-ID AgeKit classification free | PRIVO and k-ID paid consent, both quote-only | Outsource the verification mechanic, build the UI | 1 |
| Model inference | Anthropic Claude, OpenAI GPT | No free production tier | Haiku 4.5 $1/$5 per Mtok; Sonnet 5 $2/$10; GPT-4o mini $0.15/$0.60 | Outsource | 0 |
| Embeddings | Voyage AI | 200M tokens free on standard models | $0.02 to $0.12 per Mtok | Outsource | 0 |
| Roster sync | Clever, ClassLink | Clever Library free | Secure Sync and ClassLink Roster Server quote-only | Outsource the broker, build the OneRoster client once | 1 |
| Compliance evidence automation | Vanta, Drata | None | Quote-only, median about $20,000/yr | Defer until a district requires SOC 2 | 2 |
| FERPA certification | iKeepSafe | None | $6,400 confirmed for the FERPA certification | Outsource | 1 |
| Student data privacy agreement | SDPC National Data Privacy Agreement | Free to sign | Legal review time only | Provide, adapt the public template | 0 |
| Nonprofit AI credits | Anthropic for Nonprofits | N/A | Team plan $8/user/mo for 2-19 seats once verified | Outsource, apply after 501(c)(3) determination or via Goodstack pre-verification | 1 |

### Licensing landmines

1. Elsevier ScienceDirect full text cannot be shared with third parties under current terms;
   200-character snippets only.
2. Springer Nature's Meta and Full Text APIs sit under a TDM Reservation Policy; only the Open
   Access API is safe to cache.
3. JSTOR's free-reading cap drops to 10 articles per 30 days from September 2026; Constellate output
   cannot be redistributed.
4. Semantic Scholar's CC-BY-NC datasets cannot enter a paid x402 citation flow; keep them outside
   the monetized graph entirely.
5. Khan Academy is CC BY-NC-SA with an explicit ban on framing and paid-login walls; links and
   embeds only.
6. OpenStax is CC BY-NC-SA 4.0, confirmed on the license page and a book colophon, contradicting the
   common assumption of plain CC BY.
7. MIT OpenCourseWare and PhET are both noncommercial licenses; PhET's definition of commercial use
   covers a nonprofit running any paid service anywhere in its portfolio.
8. CK-12 left Creative Commons for a proprietary license that automated fetch could not read; do not
   ingest until a human reads the actual terms.
9. Encyclopaedia Britannica's terms ban scraping and AI use outright; a syndication license or
   nothing.
10. Stanford Encyclopedia of Philosophy holds exclusive publication rights and asks instructors to
    distribute links only.
11. HathiTrust is about two-thirds in-copyright and geographically gated; only the public-domain
    third is safe through the formal Data API.
12. Jack Kruse corpus in the in-house x402 gateway is citation-only, snippet plus canonical link, no
    redistribution.
13. Google's Gemini API terms prohibit building anything "directed towards or likely to be accessed
    by individuals under the age of 18," which rules out Gemini for the student-facing surface
    entirely; this sits in the AI-layer landmine category, distinct from the content-licensing
    landmines above it.
14. Google Classroom API terms forbid reselling roster data and trigger Limited Use disclosure plus
    an OAuth security assessment.
15. Any content under a noncommercial license must stay outside the x402 citation-fee flow by
    definition, since a paid citation is a commercial use.

---

## 6. Cost Model

All figures monthly. Every line states its basis; ranges reflect real divergence between the source
reports' own assumptions, called out explicitly where it matters instead of collapsed into a single
false-precision number.

### Phase 0, prototype, 50 learners

| Category | Cost | Assumption |
|---|---|---|
| Infra | $20-50 | Vercel Pro one seat ($20), Supabase free tier, Hetzner marginal ($0 on the shared box), Cloudflare free, Sentry OSS free |
| AI inference | $10-25 | $0.20-0.50/learner/month blended, Haiku-tier default with prompt caching, one prototype subject path only |
| Data | $0 | OpenAlex, Wikidata, Crossref, NGSS, all free tiers, no district-scale call volume |
| Compliance | $0 | Common Sense self-assessment and SDPC NDPA are both free to run/sign; no under-13 volume without a guardian present |
| People | $0 cash | Founder only, sweat equity, per the architecture report's own claim that Phase 0 is buildable by one founder in weeks |
| **Total** | **$30-75/mo** | |

### Phase 1, pilot, 500 learners, one to two schools

| Category | Cost | Assumption |
|---|---|---|
| Infra | $25-80 | Same stack as Phase 0 plus Supabase Pro triggered by real student data ($25/mo), domain and misc ($5) |
| AI inference | $125-500 | $0.25-1.00/learner/month blended across light and heavy users, per the architecture report's own per-student model |
| Data | $0-50 | Still mostly free tier; Crossref Metadata Plus becomes worth the $550/yr ($46/mo) insurance at this volume |
| Compliance | $500-2,000 | iKeepSafe FERPA certification ($6,400 one-time, amortized over 12 months at about $533/mo) plus counsel review hours for the district DPA and the NDPA exhibit |
| People | $0-10,000 | Founder plus, optionally, one part-time engineering or teacher-success contractor; wide range reflects whether Phase 1 hiring has started |
| **Total** | **$650-12,600/mo** | Wide range driven entirely by the people line; a founder-only Phase 1 lands near $650-2,600/mo |

### Phase 2, district, 10,000 learners, three to ten districts

| Category | Cost | Assumption |
|---|---|---|
| Infra | $700-1,300 | Vercel Pro two seats ($150), Supabase Pro or Team ($150-599), Neo4j Community self-hosted on a Hetzner CCX box ($100-200), two additional Hetzner servers ($200), Cloudflare Pro ($25), Sentry/PostHog ($26-80), email ($20-35) |
| AI inference | $2,500-8,000 | Divergent source estimates: the data-services report's model-selection-optimized figure (cheap models plus caching) lands at $500-1,500/mo; the architecture report's blended-population figure ($0.50/learner average across light and heavy tutor-dialogue users) lands at $5,000/mo. Treat the true figure as unresolved without live telemetry; budget the midpoint and instrument per-learner cost from day one of this phase |
| Data | $50-500 | OpenAlex Member tier only if live calls exceed the free daily budget; Crossref Metadata Plus at the $1M-5M revenue band ($3,300/yr, about $275/mo) if Bucket's own finances cross that threshold, unlikely for a grant-funded nonprofit at this stage |
| Compliance | $2,000-5,000 | Consent vendor (PRIVO or k-ID, placeholder $500/mo pending quote), SOC 2 tooling only if a contract requires it ($1,000-2,300/mo), legal counsel for the custodial payout design and per-district DPA review ($500-2,000/mo) |
| People | $40,000-70,000 | Two to three engineers, one operations or compliance lead, one teacher-success role, loaded cost assumed at $10,000-15,000/mo per person, standard nonprofit edtech staffing ratio for a multi-district product |
| **Total** | **$45,000-85,000/mo** | The people line dominates the budget for the first time in the plan, a different balance than Phase 0 and Phase 1 |

### Phase 3, global free, 1,000,000 learners

| Category | Cost | Assumption |
|---|---|---|
| Infra | $12,000-35,000 | Enterprise-tier Postgres with multiple read replicas ($10,000-30,000/mo per the architecture report's own cost-at-scale table), a small dedicated Hetzner cluster for Neo4j and workers ($2,000-5,000/mo) |
| AI inference | $500,000 | Directly from the architecture report's cost-at-scale table: 1M active learners at a blended $0.50/learner/month. This line makes up 85-95 percent of total marginal cost at every scale in the architecture report's own analysis, which is why Locate and Quote staying non-LLM and batch content pre-generation are treated as cost decisions ahead of any database or hosting choice |
| Data | $5,000-15,000 | OpenAlex Partner tier ($20,000-plus/yr, about $1,700/mo), Crossref Metadata Plus top band ($44,000/yr, about $3,700/mo), translation API spend for machine-translated baseline coverage across seven-plus high-reach languages |
| Compliance | $10,000-30,000 | SOC 2 maintenance ($10,000-20,000/yr, about $1,000-1,700/mo), ongoing multi-jurisdiction counsel (US federal, six-plus US states, EU, UK, Switzerland, Chile, India), EU AI Act conformity assessment and its maintenance amortized across the year |
| People | $200,000-400,000 | Fifteen to twenty-five people across engineering, content review, teacher success, and compliance, loaded cost assumption consistent with the Phase 2 per-person figure scaled to a global operation |
| **Total** | **$727,000-980,000/mo** | AI inference alone exceeds every other category combined, the single fact that should drive every Phase 3 engineering priority |

### Funding sources by phase

| Phase | Primary sources | Basis |
|---|---|---|
| 0 | Founder self-funded; Tools Competition Catalyst award ($50,000, no 501(c)(3) requirement); in-kind credits (Cloudflare Project Galileo, Sentry OSS, Anthropic for Nonprofits once verified) | Tools Competition explicitly welcomes teams at all phases with no nonprofit-determination gate, the only funder in the source list with that posture |
| 1 | Tools Competition Growth award ($150,000); early donations under disclosed pending-501(c)(3) status; a fiscal sponsor bridge (Tides Center, 9 percent of annual revenue) only once a funded pilot exists to meet Tides' 12-months-operations-plus-3-months-reserve bar | Donations are legal before determination arrives, provided pending status is disclosed plainly on every donor-facing surface instead of a claim of current tax-exempt status |
| 2 | AWS Imagine Grant Pathfinder Award (up to $200,000 cash plus $100,000 credit, requires established 501(c)(3) status); NSF STEM Education or IES research grants for the pilot's research arm; district-tier service revenue if any fee model emerges beyond the free learner tier | AWS explicitly excludes educational institutions from eligibility but not education-focused nonprofits like Bucket; confirm this reading with AWS directly before counting on it |
| 3 | Multi-year commitments from Chan Zuckerberg Initiative, Gates Foundation, or Schmidt Sciences; Walton Family Foundation funding routed through Renaissance Philanthropy's AI for Education fund; continued grant renewal cycles | CZI is thematically closest but is itself building a competing knowledge-graph and AI-developer-tools program for education. Confirm alignment directly before assuming the fit holds |

---

## 7. Compliance Summary

### Ten requirements that shape the product design

1. **COPPA verifiable parental consent.** Any under-13 US user needs either the school-consent
   exception (a signed district data-processing agreement covering the whole roster) or direct
   verifiable parental consent for independent accounts, with a named data retention and deletion
   schedule and no behavioral advertising, full stop.
2. **FERPA school-official exception.** Operating on school data requires the district to retain
   direct control over use and maintenance of the data under a legitimate educational interest, with
   a contractual bar on redisclosure without consent; this needs a signed data privacy agreement per
   district. A unilateral privacy policy does not satisfy the exception on its own.
3. **PPRA scope avoidance.** Any federally funded research instrument that touches political
   affiliation, psychological state, sex behavior, or five other protected categories needs prior
   written parental consent; the design keeps onboarding and workspace telemetry limited to academic
   content and skill state, by construction, to stay outside this law's scope.
4. **CIPA filter compatibility.** The product must function correctly behind district content
   filters and cannot rely on any workaround, since districts cannot disable filtering for anyone
   under 17.
5. **The SDPC National Data Privacy Agreement as a force multiplier.** A single signed NDPA,
   published in the Resource Registry, lets any of the 12,000-plus participating districts adopt
   Bucket's terms through a lightweight addendum instead of a one-off negotiation; this is the
   single most valuable compliance investment available before the first district pilot.
6. **Jurisdiction-aware age gating.** GDPR's age of consent runs 13 to 16 depending on EU member
   state, Chile requires parental consent under 14, India treats anyone under 18 as a child, and the
   UK's Children's Code applies to any service "likely to be accessed" by a minor, a lower bar than
   "designed for children." One flat 13-plus line, which is what Academy runs today, does not clear
   any of these.
7. **EU AI Act Annex III high-risk classification.** The five-state learner model and
   frontier-backward routing decide what a learner sees next based on an AI judgment of what they
   know, which is "steering the learning process" under the plain text of Annex III point 3(b). This
   is covered in detail below.
8. **Accessibility on the canvas.** WCAG 2.2 AA clears every downstream mandate (ADA Title II,
   Section 508) in one pass; the spatial canvas is the highest-risk surface in the product and needs
   a dedicated engineering pass. A bolt-on accessibility library will not cover pan-and-zoom
   navigation or spatial node relationships on its own.
9. **Human-in-the-loop has become a procurement checkbox.** Oklahoma bars AI from being the primary
   basis for a grade; New York City's guidance uses a red/yellow/green human-oversight framework
   across roughly one million students. The teacher review queue for productions entering the graph
   should be framed explicitly in district materials as the human-in-the-loop control point, since
   that exact language is becoming a specific thing districts ask vendors to demonstrate.
10. **Minors and money has no settled precedent.** No federal law directly addresses paying a minor
    a one-time citation fee for an unsolicited academic submission; this needs a written legal
    opinion before the first live payment. The closest analogous cases (contest prizes, royalties,
    the creative-work FLSA exemption for employed performers) are each an imperfect match, and none
    settles the question on its own.

### Minors-and-money design

No minor ever holds a wallet key. A citation event writes an attribution and payment-owed record to
Bucket's own ledger; settlement happens on Bucket's KYC'd, adult-controlled treasury wallet, which
then disburses into a UTMA-style custodial account the parent controls or, for roster-synced
accounts, holds in escrow under the district's data agreement until a custodial account is
confirmed. Verifiable parental consent at signup is extended to cover a specific added authorization
for citation payments; no custodian on file means the citation still credits the student's public
attribution and portfolio, while the payment sits in escrow until a custodian is confirmed. A
minimum payout threshold and quarterly batching keeps per-transaction gas and administrative cost
sane and gives Bucket time to confirm 1099 obligations per family per year. Coinbase's own terms
require an account holder to be 18 and US-resident, so x402 settlement cannot terminate at a minor's
own wallet under any circumstance, which makes the custodial design a legal requirement on its own
terms. Get a written employment-law opinion on the payment mechanic before the first live payout
regardless of how the design resolves, since a growing wave of state kid-influencer trust-account
laws (Illinois, with active bills in California, Minnesota, and Utah) were written for platforms
that pay minors for content and could plausibly, though unconfirmed, sweep in a citation-payment
model.

### EU AI Act exposure

The core learner-state and routing mechanic is a direct hit under Annex III point 3(b): AI systems
used to evaluate learning outcomes, including systems used to steer the learning process, are
classified high-risk. High-risk status requires a risk management system, representative and
bias-tested training and validation data, technical documentation, automatic logging, transparency
to the learner that an AI system is making the assessment, human oversight, and a conformity
assessment before the system can be placed on the EU market. Full applicability lands August 2,
2026, a date already in effect by the time any EU rollout is realistic. Designing the
citation-accepted-into-the-graph event to require explicit human sign-off helps satisfy the
human-oversight obligation but does not by itself exempt the system from high-risk status. The clean
recommendation, already reflected in the phased plan below: treat any EU rollout as a distinct,
later phase gated on a dedicated AI Act compliance review, run as its own explicit line item
separate from the general international launch checklist and from Phase 3's "full multilingual
coverage" scope.

### Certification sequence with costs

| Step | Cost | Timing | Why this order |
|---|---|---|---|
| 1. Common Sense Privacy Program self-assessment | Free | Pre-pilot | Cheapest, most district-recognized trust signal available; districts search it directly |
| 2. SDPC National Data Privacy Agreement, signed and published | Free to sign, legal review time only | Pre-pilot | Gates every subsequent district conversation; not optional at any stage once a named school is involved |
| 3. iKeepSafe FERPA certification | $6,400 confirmed | Weeks to a couple of months, after the first two to three districts are engaged | A real but modest spend relative to the trust it buys once districts are already in conversation |
| 4. 1EdTech TrustEd Apps Data Privacy Certification | Bundled with supplier membership; standalone fee unverified | At scale, once 1EdTech-standardized districts are a meaningful share of the pipeline | Most valuable for districts that already run on 1EdTech's interoperability standards |
| 5. Third-party WCAG 2.2 AA audit and VPAT | Third-party engagement, cost not captured in the source reports | Before the first formal RFP | Districts trust a named third-party auditor over a self-attestation, and will ask for a VPAT as a routine RFP attachment before their own ADA Title II deadline (April 2027 for large entities) arrives |
| 6. SOC 2 Type II | $35,000-70,000 all-in initial, $10,000-20,000/yr to maintain | Deferred until a grant or district contract requires or funds it | The single most expensive item on this list and disproportionate to a free pilot-stage product; do not front-load it |

---

## 8. Phased Delivery Plan

### Phase 0, prototype slice

**Scope.** One canon branch (`02-physics`, already the deepest canon buildout with a clean K-12
on-ramp), one grade band (grades 3-5), one prerequisite path from "light travels in straight lines"
through to "Rayleigh scattering explains a blue sky," roughly 15 to 25 atom and concept nodes. Ships
the graph schema, the five-stage state model on this one path, frontier-backward routing against
this single closed subgraph with a hardcoded frontier and no diagnostic-probe generalization yet,
the spatial canvas with Locate, Quote, Check, and Organize working against real content. No teacher
layer, no roster sync, no payout, single locale.

**Exit criteria.** A ten-year-old can ask "why is the sky blue," get routed backward to what they
already hold, walk forward through the path, and reach Understanding on the target node in one
sitting.

**What it proves.** That the graph schema, the state model, and the constrained tool surface work
end to end on real content, before any subsystem that depends on scale (routing generalization,
teacher tooling, payout) gets built on top of an unproven foundation.

**Cost.** $30-75/month, per Section 6.

**Duration.** Weeks, buildable by one founder on the existing stack, since the FSRS/IRT engine, the
credential pattern, and the constrained-tutor pattern are all already shipped and only need to be
pointed at a new schema.

### Phase 1, pilot school

**Scope.** Three to five subjects across grades K-8 within one or two willing schools. Ships the
teacher layer (class graph view, review queue), roster sync via Clever, the production pipeline end
to end for a peer-review-only version of Production with no payout yet, under-13 consent through the
school-consent exception, diagnostic probes for cold-start learners, and basic i18n (Spanish
alongside English, machine-translated with flagged status). Pre-pilot compliance deliverables land
here: the Common Sense self-assessment and the signed SDPC NDPA.

**Exit criteria.** A teacher can assign a target node and see the whole class's frontier state, then
clear a review queue without opening a spreadsheet.

**What it proves.** That the product survives contact with a real classroom and a real teacher's
planning-period time budget, and that the school-consent path for under-13 users works with a real
district signature attached, beyond the paper design.

**Cost.** $650-12,600/month, per Section 6, with the wide range driven by whether a first hire has
happened.

**Duration.** Two to four months to build, then a school semester to run the pilot.

### Phase 2, district-ready

**Scope.** Multi-school, multi-broker (add ClassLink), LTI 1.3 launch for LMS-standardized
districts, full payout accrual and the custodial ledger, Open Badges credential issuance for the
K-12 tier, standards crosswalk reporting against CCSS and at least one state framework, offline mode
for the mobile client, and the Neo4j CDC pipeline moving from batch to streaming as query volume
grows past what a nightly sync can keep fresh. The iKeepSafe FERPA certification and the third-party
accessibility audit land here, ahead of any formal RFP.

**Exit criteria.** A district can onboard through its existing SIS with no custom integration work,
and a parent can see a real, explainable payout ledger entry the first time their child's work gets
cited.

**What it proves.** That the product can absorb district-scale procurement requirements (rostering,
LTI, accessibility, FERPA certification) without a custom integration per district, and that the
custodial payout design holds up against a real family's first payout event.

**Cost.** $45,000-85,000/month, per Section 6, with the people line dominating the budget for the
first time in the plan.

**Duration.** Six to twelve months.

### Phase 3, global free

**Scope.** Full multilingual coverage with human-reviewed translations for the highest-traffic
locale and subject pairs, a low-bandwidth and fully offline-capable mobile client tested against
real intermittent connectivity, an independent-learner path fully self-service with no school
intermediary, atom-layer coverage for every subject across K-12, canon coverage continuing to grow
organically as it already has, and the cost-control program (batch content pre-generation,
aggressive caching, a validated cheap-default routing policy) matured enough that per-learner AI
cost has come down from the Phase 0-2 baseline. The EU AI Act conformity review runs as its own
gated track here, kept separate from the general international rollout.

**Exit criteria.** Any learner, anywhere, with any connectivity, in a supported language, can run
the same "why is the sky blue" flow the Phase 0 prototype proved, at whatever their local
infrastructure allows.

**What it proves.** That the economics hold at a scale where AI inference is 85 to 95 percent of
marginal cost, which is the phase where the nonprofit's free-forever promise either survives contact
with real usage or does not.

**Cost.** $727,000-980,000/month, per Section 6, with AI inference alone exceeding every other
category combined.

**Duration.** Eighteen to thirty-six months, ongoing beyond that as a steady state the organization
operates in indefinitely.

---

## 9. Research Testbed

The pilot phase doubles as the direct evidentiary base for a PhD application question: which
cognitive offloading to AI harms learning. This is not an add-on to Phase 1, it is Phase 1's
research design, and it needs its own legal basis separate from the operational school relationship.

**Three-arm design**, run inside the product itself, using the product's own workspace as the
research instrument:

| Arm | Description | Purpose |
|---|---|---|
| Constrained AI, the product itself | Find, quote, check, organize only, no generative answer synthesis | Tests whether scoped-tool AI support changes outcomes relative to no AI at all |
| Full chatbot | Open-ended generative AI assistance on the same material | Tests the hypothesized failure mode: short-term ease at the cost of worse independent performance |
| No AI, control | Same material and the same knowledge-graph navigation UI, human-only research tools | Baseline |

**Primary outcomes.** Near-transfer performance on a task structurally similar to but not identical
to the practiced task. Retention at eight weeks post-instruction on the same construct. Independent
problem-solving, scored from workspace process logs already native to the product
(time-to-first-hint, unprompted backtracking, unaided completion rate), a direct advantage of
running the study inside the product, with no separate instrument to build or validate.

**Sample size.** A three-arm between-subjects design targeting a medium effect size (Cohen's d
roughly 0.4 to 0.5) at standard power and alpha needs on the order of 60 to 70 students per arm,
roughly 180 to 210 total before attrition. A smaller expected effect (d roughly 0.3) roughly doubles
that. This is a back-of-envelope heuristic; commission a formal power analysis once the expected
effect size and the clustering structure (students nested in classrooms nested in schools, which
inflates the needed sample under a proper multilevel design) are set.

**IRB path.** The founder is not currently affiliated with a research institution, and most
university IRBs require a faculty member of record as principal investigator for human-subjects
research involving minors. The viable route is a university partner as IRB of record: a School of
Education faculty member, ideally connected to the ETH AI Center's AI for Education and Human-AI
Collaboration track given the founder's stated PhD target, or a domestic education-school faculty
member if the pilot runs in a US school, serving as PI or co-PI. Internal program evaluation without
IRB oversight is explicitly not the right path here, since the goal is a publishable causal claim
for a PhD application, which needs the rigor, disclosure, and generalizability an IRB-approved
design provides that a self-run evaluation does not.

**Conflict of interest.** The founder is simultaneously the product's builder, the study's designer,
and the person whose PhD application benefits from the result, a known category of research
conflict. State it plainly in the IRB application and in the consent materials; a partner faculty PI
who did not build the product strengthens the design considerably, and an independent data-access
reviewer, ideally that same partner PI, should hold a technical or procedural check on what the
founder can access from live student accounts outside the consented research cohort.

**Consent and assent.** Passive opt-out consent is not acceptable for minors in research; active
parental permission plus the child's own assent is required, with assent formats scaled to age
(simplified oral or pictorial for younger children, written for middle and high school). Build three
separate consent tracks: using the product at all, the research use of interaction data as its own
category, and the custodial payment mechanism. FERPA's narrow studies exception (34 CFR 99.31(a)(6))
is a school-initiated pathway that does not cleanly cover a vendor's own dissertation research and
should not be the sole legal basis for the research consent track.

**ETH AI Center fit.** The founder's stated target, the AI for Education and Human-AI Collaboration
track, aligns directly with the three-arm cognitive-offloading question, and Switzerland's data
protection regime (the revised Federal Act on Data Protection, broadly GDPR-aligned) makes a Swiss
pilot geography coherent with both the research affiliation and the compliance posture the product
already needs to build for EU-adjacent users. Treat Switzerland's exact age-of-consent rule for
minors as unverified pending direct confirmation, and apply the EU's stricter practical floor until
that is resolved.

---

## 10. Top 12 Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | The EU AI Act's Annex III high-risk classification applies to the core learner-state and routing mechanic | High | High | Gate any EU rollout behind a dedicated conformity-assessment track, run separately from the general international launch, as Section 8's Phase 3 already reflects |
| 2 | Citation payments to minors trigger an unanticipated child-labor or kid-influencer-trust-account law in some state | Medium | High | Get a written employment-law opinion before the first live payout; build the custodial design so no payment reaches a minor directly regardless of the opinion's outcome |
| 3 | A wrong or silently un-reviewed prerequisite edge breaks routing for every learner who touches it, since routing has no other integrity check | Medium | High | The quality gate already specified in the architecture, no prerequisite edge ships without human review, has to be enforced at the database and API layer as a hard constraint, beyond a process convention a team can forget to follow |
| 4 | Auth-system fragmentation (Dynamic, Supabase OTP, NextAuth) compounds as new account types (parent, teacher, district admin) are added on top of an unreconciled base | Medium | High | Audit and consolidate the auth surface before any new account type ships, as the gap analysis flags at Phase 0 |
| 5 | AI inference cost at Phase 3 scale ($500,000-plus/month on the architecture report's own model) either holds or breaks the nonprofit's free-forever economics | Medium | High | Treat Locate and Quote staying non-LLM, batch content pre-generation, and aggressive caching as Phase 0 architecture decisions, made well before cost pressure forces a retrofit at Phase 3 |
| 6 | The founder's personal-capacity holding of Bucket Foundation triggers a private-inurement finding that delays or derails 501(c)(3) determination | Medium | High | Formalize incorporation, IP assignment, and a conflict-of-interest policy before the first grant application or district contract |
| 7 | FERPA's school-official exception is found not to cover the founder's own PhD research use of student data | Medium | High | Treat research data use as a separate, explicitly consented legal basis from day one, never rely on the operational school-official exception for the research track |
| 8 | The AI toolset is jailbroken past the find/quote/check/organize scope into free-form generation, and a district discovers it | Medium | High | External red-team pass before any minor-facing launch; log and monitor for scope-escape patterns in production, reusing the gateway-level allowlist pattern already specified in the architecture |
| 9 | The spatial canvas UI fails a district accessibility review, blocking procurement at the RFP stage | Medium | Medium | Dedicated accessibility engineering pass and a third-party VPAT before the first RFP, treated as Phase 0-1 work, ahead of the deadline pressure a late start would create |
| 10 | COPPA's age-screen or verifiable-parental-consent flow is implemented incorrectly, a live exposure since the FTC's 2025 amendments' compliance deadline has already passed | Low-Medium | High | Buy a compliance-vendor VPC mechanism; building novel age verification in-house raises direct FTC exposure. Legal review of the exact flow before launch |
| 11 | Gifted-program-first adoption (the fastest procurement path in Section 9 of the compliance report) skews both the product and the PhD research sample away from the equity mission's target population | Medium | Medium | Pair every gifted-program pilot with a Title I pilot in the same outreach cohort, as a standing rule for outreach planning |
| 12 | Canon-atom quality-bar dilution: pressure to hit K-12 subject-coverage targets quietly loosens the atom-review bar until atom-tier content starts crossing into the canon's foundations-only territory without a real foundation behind it | Low-Medium | Medium | Keep atom and canon review pools structurally separate, as the architecture already specifies, with the canon-track reviewer pool held to a strictly higher bar than atom review, and audit the boundary on a fixed schedule |

---

## 11. Open Questions Only the Founder Can Answer

- Is `02-physics` grades 3-5, the "why is the sky blue" path, the right Phase 0 slice, or does a
  different branch or a different question better demonstrate the product to the audience that
  matters most for the next funding conversation?
- Which university faculty member is the realistic IRB-of-record target, an ETH AI Center-connected
  PI in Switzerland, or a domestic education-school faculty member tied to wherever Phase 1's pilot
  school ends up?
- Does the auth-system reconciliation (Dynamic, Supabase OTP, NextAuth) resolve toward Supabase Auth
  as the sole learner-facing system, as the architecture's identity section implicitly assumes, or
  is there a reason NextAuth exists that this review has not surfaced?
- What is the actual runway and hiring plan behind Phase 1's $650 to $12,600 per month range: is a
  first paid hire realistic before or after the pilot's first semester closes?
- Does Story Protocol stay testnet-only indefinitely for the adult product, or is a mainnet decision
  coming that the K-12 credential design (which deliberately bypasses Story Protocol entirely)
  should account for either way?
- Which fiscal sponsor, if any, is worth pursuing as a bridge before the 501(c)(3) determination
  lands, given Tides' 9 percent fee and its 12-months-plus-3-months funding bar, versus waiting for
  the determination letter to arrive on its own?
- Is a first pilot geography commitment (US Title I district, Swiss/ETH-adjacent school, or a
  homeschool/microschool network per Section 9's fastest-adoption path) worth locking in now to
  align the IRB, the compliance posture, and the funding pitch around one story instead of three
  parallel possibilities?
- How much of the canon's organic ten-branch growth pattern (deep-history, sacred-texts, and art all
  emerged from nothing) should inform which non-STEM K-12 subjects get an atom-only namespace first,
  versus waiting for demand signal from the pilot school's actual curriculum?
- Does the founder want the citation-payment mechanic live in Phase 1 at all, even in the
  deliberately payout-free peer-review-only form the phased plan specifies, or is there appetite to
  push payout out to Phase 2 more firmly given the unresolved child-labor legal question?
- What is the founder's actual tolerance for the Phase 3 AI-inference cost exposure, given that it
  is the single line item most likely to force either a paid tier (which the nonprofit's
  free-forever framing currently forecloses) or a hard usage cap at global scale?

---

## 12. Immediate Next Actions

| # | Action | Owner | Artifact |
|---|---|---|---|
| 1 | Confirm the Phase 0 scope: `02-physics`, grades 3-5, the "why is the sky blue" path, 15 to 25 nodes | Founder | A one-paragraph scope confirmation, this review's Section 8 Phase 0 entry serves as the draft |
| 2 | Build the `graph` schema (`node`, `node_label`, `edge`, `prereq_ancestor`) in Supabase | Engineering agent | A migration file under `supabase/migrations/` |
| 3 | Seed the Phase 0 path: the 15 to 25 atom and canon nodes plus their `prerequisite`, `generalizes`, and `example_of` edges | Engineering agent | Seed SQL or a JSON fixture loaded through the ingestion pattern already used by canon `_intake/` |
| 4 | Implement frontier-backward routing v0: hardcoded single subgraph, no diagnostic-probe generalization yet | Engineering agent | A working `/api/route/frontier` endpoint |
| 5 | Build Locate and Quote as retrieval-only endpoints over the existing pgvector index and full-text search | Engineering agent | `/api/workspace/locate` and `/api/workspace/quote` routes |
| 6 | Extend the existing tutor pattern (`/api/academy/tutor/route.ts`) into Check and Organize, scoped to the Phase 0 path | Engineering agent | `/api/workspace/check` and `/api/workspace/organize` routes reusing the tutor's grounding and citation-validation pattern |
| 7 | Audit and reconcile the three overlapping auth systems before any parent, teacher, or district-admin account type is built on top | Founder, with engineering agent support | A short auth-decision document, or a bead tracking the decision and its implementation |
| 8 | Commission a written legal opinion on whether a citation payment to a minor is employment, a royalty, or a prize under child-labor and kid-influencer-trust-account law | Legal | A legal memo, before any live payout ships in any phase |
| 9 | Choose the IRB path: approach an ETH AI Center-connected faculty member, or a domestic education-school faculty member tied to the Phase 1 pilot site | Founder, with partner faculty once identified | An IRB pre-submission outline naming the PI and the three-arm design from Section 9 |
| 10 | Sign the SDPC National Data Privacy Agreement and complete the free Common Sense Privacy self-assessment before any district or school outreach begins | Founder | The signed NDPA published on the SDPC Resource Registry, plus the completed Common Sense rating page |



