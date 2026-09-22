# Truth tiers

**Status:** research memo, bead `ros-truth 1`. No code. The migration is `ros-truth 2`.

Quotation convention: `[...]` inside a quoted passage marks text cut from the middle. Everything else inside quotation marks is byte-equal to the source at the locator given.

Research OS grades the learner against a node. `graph.learner_node_state.stage` runs `access`, `awareness`, `understanding`, `internalization`, `production` (`supabase/migrations/20260910000000_research_os_graph.sql:122`). Almost nothing on the node grades the node: `frontier_flag` marks a claim as an open question, and no field says how well established the content is. A seeded fact about why the sky is blue, an engine hypothesis with a posterior of 0.3, and an accepted student production all sit in `graph.nodes` with the same shape and no field that says how well established any of them is.

Bead `ros-truth epic` states the gap in the founder's words: "A claim's standing depends on how it is known: seen and touched first-hand, reported first-hand by someone else, second-hand, recorded on video, read, derived, or proven. Tiers also depend on falsifiability, theoretical versus experimental support, whether the claim asserts existence or non-existence, and the data behind it."<!-- voice-ignore-line: the founder's words, quoted from BEADS-PENDING.jsonl -->

## What `tier` means today

The `tier` column is declared at `supabase/migrations/20260910000000_research_os_graph.sql:53` as `tier smallint not null default 0`. The comment above it, lines 47 to 52, is the whole of the column's contract as written:

```
  -- Grade-level proxy; the review's full grade_band int4range is Phase 1 work.
  -- Path nodes carry an approximate US grade level (3-12). Canon-bridge nodes
  -- (rows whose provenance.type = 'mirror', see below) carry 90 as a sentinel
  -- meaning "adult, canon tier, outside any K-12 grade band" -- keeps `tier`
  -- orderable with a single smallint instead of a nullable plus a separate
  -- tier enum.
```

`tier` is a difficulty and ordering axis. It carries no claim about evidence. Nine conventions now share the name, eight of them inside the one column, and they disagree:

| Population | Value | Writer |
|---|---|---|
| Seed path nodes | 3, 4, 5, 7, 8, 9, 10, a US grade level | `supabase/seed/research-os-sky-blue.json`; the column comment's stated range is 3 to 12 |
| Canon-bridge mirrors and canon entries | 90 | seed, and `CANON_TOP_TIER` at `src/lib/research-os/ingest/canon.ts:61` |
| Engine hypotheses | 1 to 6, source reliability | `engineTierToGraphTier`, `src/lib/research-os/engine-bridge.ts:35` |
| Engine gap artifacts | fixed 6 | `buildGapNode`, `src/lib/research-os/engine-bridge.ts:262`, value at `:272` |
| Academy atoms | 13 plus DAG depth | `ACADEMY_TIER_BASE`, `src/lib/research-os/ingest/academy.ts:74` |
| Bulk imports, fixed by node class | `canon_concept` 12, `canon_figure` 13, `canon_site` 13, `canon_bridge` 16 | `scripts/research-os/ingest/canon-all.ts:97`, `:169`, `:191`, `:202` |
| Bulk imports, fixed by node class | `literature_paper` 14, `intake_digest` 12, `intake_paper` 14, `intake_target` 15 | `scripts/research-os/ingest/intake-all.ts:84`, `:108`, `:131`, `:150` |
| Canon claims, computed | `max(linked atom depth) + 1`, range 1 to 17, or the sentinel `CLAIM_TIER_UNLINKED = 15` | `scripts/research-os/ingest/canon-all.ts:103`, sentinel at `:36` |
| Imported private nodes | 0 | `createImport`, `src/lib/research-os/access-db.ts:253`, value at `:231` |
| Accepted productions | the target's tier plus 1 | `createNodeFromProduction`, `src/lib/research-os/production-node.ts:52`, value at `:67` |
| Decomposition depth, a separate field of the same name | 0 for a prime, one per layer of combination | `Decomposition` at `src/lib/research-os/primes.ts:44`, its `tier` field at `:55-56`, set at `:273` |

The collision is already documented in the code. `src/lib/research-os/engine-bridge.ts:24-34` says so in the adapter's own header:

```
 * `hte.evidence.Tier`'s six source-reliability rungs ("T1".."T6", T1 most
 * reliable) read straight onto `graph.nodes.tier`'s smallint: `"T3"` becomes
 * `3`. ... This deliberately diverges from the Phase 0 seed's other
 * two `tier` conventions (a K-12 grade level 3-12 for path nodes, the
 * sentinel `90` for a canon-bridge mirror node)
```

Canon claims are the sharpest case. `scripts/research-os/ingest/canon-all.ts:103` computes `const tier = hits.length ? Math.max(...hits.map((h) => (atomTier.get(h.id) ?? 0) + 1)) : CLAIM_TIER_UNLINKED;`, where `atomTier` is built at `:88` from the raw DAG depth `depthOf(a.id)` written at `:70`. The same atom therefore carries depth `d` in that map and tier `13 + d` in `graph.nodes` through `src/lib/research-os/ingest/academy.ts:74`, a disagreement of exactly 13. With the deepest chain at 16 hops (`learning/research-os/INGESTION.md:66`), a canon claim's tier runs 1 to 17, so it overlaps the engine's reliability rungs, the seed's grade levels, and every fixed import band at once. The engine's own population, meanwhile, is already an evidence-certainty scale, and its values 3 through 6 are numerically indistinguishable from grade levels 3 through 6. `learning/research-os/INGESTION.md`, "Tier heuristic", tabulates five of these populations and opens with the same admission: "`graph.nodes.tier` is a plain smallint with three populations sharing one column".<!-- voice-ignore-line: verbatim quotation from INGESTION.md -->

A second field of the same name shadows the column. `Candidate` at `src/lib/research-os/decompose-further.ts:33` is `GraphNode & { tier: number | null; prime: boolean }`, filled with the decomposition depth at `scripts/research-os/decompose-further.ts:294` and sorted on at `src/lib/research-os/decompose-further.ts:233`. Both reach the same page: `src/app/research-os/(app)/n/MakeupSection.tsx:62` prints "N layers above its primes" while `src/app/research-os/(app)/n/NodeView.tsx:79` prints "tier {node.tier}". `learning/research-os/PRIMES.md:36` already states the distinction: "This is separate from a node's grade tier, the `tier` column that K-12 routing reads."<!-- voice-ignore-line: verbatim quotation from PRIMES.md -->

Four readers interpret the column, and each reads it as difficulty:

- `layoutGraph` at `src/lib/research-os/graph-layout.ts:35`, at `:36-39`, sorts distinct tiers and uses the rank as an x-axis column index. A T1 engine hypothesis and a grade-1 node land in the same column.
- `scoreNode` at `src/lib/research-os/search.ts:27` adds `Math.max(0, 6 - n.tier)` to a hit's score at `src/lib/research-os/search.ts:40`, so a low tier raises relevance.
- `checkTierMonotonicity` at `src/lib/research-os/ingest/validate.ts:28-39` enforces tier monotonicity on `prerequisite` edges, and its doc comment at `src/lib/research-os/ingest/validate.ts:22-27` states that the other five edge kinds "carry no such ordering claim", the quoted phrase sitting at `:26`.<!-- voice-ignore-line: verbatim quotation from validate.ts -->
- `inferEdges` at `src/lib/research-os/ingest/infer.ts:131` skips a candidate pair when the two tiers are equal, at `src/lib/research-os/ingest/infer.ts:146`, with the comment `no ordering signal`.

`learning/research-os/IDEAL-STATE.md` lists `tier` in the node header a reader sees, beside title, kind, branch and owner. Adding another meaning to the column would put an evidence grade in a field the map already paints as difficulty.

## What already grades content

Nine signals exist. One of them is a column on `graph.nodes`, and it is the only epistemic mark a node carries today.

| Signal | Values | Where |
|---|---|---|
| `graph.edges.confidence` | real in (0, 1], default 1.0 | `supabase/migrations/20260910030001_research_os_edge_confidence.sql:34` |
| `graph.edges.confidence_source` | `seed`, `academy_requires`, `canon_map`, `inferred`, `teacher` | same migration, `checkTierMonotonicity`'s sibling check at line 50 |
| `graph.edge_proposals.verification` | `confirmed`, `refuted`, `unchecked` | `supabase/migrations/20260918020000_research_os_prime_decompose_review.sql:8` for the column and `:12` for the check |
| `graph.irreducible_proposals.status` | `pending`, `confirmed`, `rejected` | `supabase/migrations/20260918030000_research_os_irreducible.sql:15` |
| `graph.nodes.frontier_flag` | `open_question`, `frontier`, null | `supabase/migrations/20260915040000_research_os_frontier_kinds.sql:27` |
| `provenance.canon_score` | number | written at `src/lib/research-os/ingest/canon.ts:110`. The floor of 70 is `bucket-canon`'s own upstream promotion rubric, described in prose at `learning/research-os/INGESTION.md:68` and enforced nowhere in `src/` or `scripts/` |
| `provenance_signoff` | free text, `approved: <name>` or `pending: <name>` | read by `lookupCanonSignoff`, `src/lib/research-os/canon-link.ts:93` |
| literature card `provenance.tier` | `canon`, `candidate`, `outcome` | copied at `scripts/research-os/ingest/intake-all.ts:88` |
| envelope `canon_tier` | `canon`, `candidate` | `src/app/api/research/route.ts:380` and `:433` |

Two of these grade an edge rather than a claim. `graph.edges.confidence` answers "is this a real prerequisite relationship". `edgeConfidence` at `src/lib/research-os/types.ts:176` clamps it, the comment at `src/lib/research-os/types.ts:172` names the use, and the routing cost is computed in `computeFrontier` at `src/lib/research-os/frontier.ts:215`, `const candidateCost = cost.get(cur!)! + -Math.log(edgeConfidence(e));`. One of them, the literature card's `provenance.tier` copied at `scripts/research-os/ingest/intake-all.ts:88`, is an unconstrained string inside a `jsonb` blob. `canon_score` is a number in the same blob, `provenance_signoff` is YAML on disk, and `canon_tier` is a response field built per request. One, `frontier_flag`, is the only epistemic mark on a node today, and `POST /api/research-os/frontier` writes it as a bare column update with no reason, no author and no timestamp (`src/app/api/research-os/frontier/route.ts:54`).

The one typed evidence verdict that already travels to an outside caller is `CitationVDS.verification.status`, `PASS | FAIL | INCONCLUSIVE` with a numeric `confidence`, at `src/lib/feed402-client.ts:40-55`. Nothing in the repo constructs one.

## What the literature gives

### GRADE

Guyatt et al., "GRADE: an emerging consensus on rating quality of evidence and strength of recommendations", BMJ 2008;336:924-926, doi:10.1136/bmj.39489.470347.AD. Box 2 defines four levels verbatim:

<!-- voice-ignore-next 4: verbatim quotation of Box 2, Guyatt 2008 -->
> High quality: Further research is very unlikely to change our confidence in the estimate of effect
> Moderate quality: Further research is likely to have an important impact on our confidence in the estimate of effect and may change the estimate
> Low quality: Further research is very likely to have an important impact on our confidence in the estimate of effect and is likely to change the estimate
> Very low quality: Any estimate of effect is very uncertain

Three structural moves in that paper carry over.

First, a study design sets the starting grade and then moves. The paper, section "How does the GRADE system classify quality of evidence?": "Evidence based on randomised controlled trials begins as high quality evidence, but our confidence in the evidence may be decreased for several reasons, including: Study limitations. Inconsistency of results. Indirectness of evidence. Imprecision. Reporting bias." The GRADE Handbook (Schünemann, Brożek, Guyatt, Oxman, eds., 2013, gdt.gradepro.org/app/handbook) names the same five as §5.2.1 through §5.2.5 and the rate-up factors as §5.3.1 large magnitude of an effect, §5.3.2 dose-response gradient, §5.3.3 effect of plausible residual confounding.<!-- voice-ignore-line: verbatim quotation from Guyatt 2008 -->

Second, the move-up path exists. Guyatt 2008: "Although observational studies (for example, cohort and case-control studies) start with a 'low quality' rating, grading upwards may be warranted if the magnitude of the treatment effect is very large".<!-- voice-ignore-line: verbatim quotation from Guyatt 2008 -->

Third, the grade attaches to a body of evidence for an outcome, and an expert's say-so does not get its own rung. Guyatt 2008: "Systems that classify 'expert opinion' as a category of evidence also create confusion. Judgment is necessary for interpretation of all evidence, whether that evidence is high or low quality. Expert reports of their clinical experience should be explicitly labelled as very low quality evidence".<!-- voice-ignore-line: verbatim quotation from Guyatt 2008 -->

GRADE also collapses rungs when a user cannot tell them apart: "Some of the organisations using the GRADE system have chosen to combine the low and very low categories."<!-- voice-ignore-line: verbatim quotation from Guyatt 2008 -->

The Handbook's Table 5.1 restates the same four grades in terms of confidence in the estimate rather than in terms of what further research would do. High becomes "We are very confident that the true effect lies close to that of the estimate of the effect", and Very Low becomes "We have very little confidence in the effect estimate".<!-- voice-ignore-line: verbatim quotations from GRADE Handbook Table 5.1 --> The two framings pick out the same four rungs. The decision rules proposed below follow the Handbook's framing, because a rule about what is already known can be checked against the graph and a rule about what further research would do cannot.

### Stevens and Michell

S. S. Stevens, "On the Theory of Scales of Measurement", Science 1946;103(2684):677-680. Stevens defines measurement at p.677: "measurement, in the broadest sense, is defined as the assignment of numerals to objects or events according to rules. The fact that numerals can be assigned under different rules leads to different kinds of scales and different kinds of measurement."<!-- voice-ignore-line: verbatim quotation from Stevens 1946 -->

Table 1, p.678, fixes the four scales by the transformations that leave them invariant and by the statistics that survive those transformations. For the ordinal scale: basic empirical operation "Determination of greater or less", mathematical group structure "Isotonic group, x' = f(x), f(x) means any monotonic increasing function", permissible statistics "Median, Percentiles". For interval: "Determination of equality of intervals or differences", "General linear group, x' = ax + b", "Mean, Standard deviation, Rank-order correlation, Product-moment correlation". Stevens states the criterion at p.678: "The criterion for the appropriateness of a statistic is invariance under the transformations in Column 3."<!-- voice-ignore-line: verbatim quotations from Stevens 1946 Table 1 and p.678 -->

His warning about the mean on an ordinal scale, p.679: "In the strictest propriety the ordinary statistics involving means and standard deviations ought not to be used with these scales, for these statistics imply a knowledge of something more than the relative rank-order of data." He then concedes the practice at the same place: "for this 'illegal' statisticizing there can be invoked a kind of pragmatic sanction: In numerous instances it leads to fruitful results."<!-- voice-ignore-line: verbatim quotations from Stevens 1946 p.679 -->

Joel Michell, "Quantitative science and the definition of measurement in psychology", British Journal of Psychology 1997;88:355-383, attacks the definition Stevens gave. Michell's two-task split, §1.4 p.359: "Establishing a quantitative science involves two tasks. First, there is the logically prior scientific one of experimentally investigating the hypothesis that the relevant attribute is quantitative. Second, there is the instrumental task of devising procedures to measure magnitudes of the attribute shown to be quantitative." And p.359: "Because the hypothesis that any attribute (be it physical or psychological) is quantitative is a contingent, empirical hypothesis that may, in principle, be false, the scientist proposing such an hypothesis is always logically committed to the task of testing this claim whether this commitment is recognized or not."<!-- voice-ignore-line: verbatim quotations from Michell 1997 p.359 -->

Michell's §5.1, p.374, names the failure mode: "methodological thought disorder is the sustained failure to cognize relatively obvious methodological facts."<!-- voice-ignore-line: verbatim quotation from Michell 1997 -->

What the pair settles for Bucket: a level is legitimate as an ordinal rank the moment a rule assigns it, and it becomes a quantity only after someone shows the attribute is quantitative. A truth level assigned by rule is an ordinal scale. Averaging two of them is the move Stevens calls out and Michell calls a pretence.

### Popper

Karl Popper, Logik der Forschung (Vienna: Julius Springer, 1935), English as The Logic of Scientific Discovery. Read in the Routledge Classics edition, 2002, ISBN 0-415-27844-9. Section 6, "Falsifiability as a Criterion of Demarcation", begins at p.17, and the criterion is stated at p.18:

<!-- voice-ignore-next 6: verbatim quotation of Popper, section 6 -->
> But I shall certainly admit a system as empirical or scientific only if it is capable of being tested by experience. These considerations suggest that not the verifiability but the falsifiability of a system is to be taken as a criterion of demarcation. In other words: I shall not require of a scientific system that it shall be capable of being singled out, once and for all, in a positive sense; but I shall require that its logical form shall be such that it can be singled out, by means of empirical tests, in a negative sense: it must be possible for an empirical scientific system to be refuted by experience.

The asymmetry that forces the criterion sits on the same page: "Thus inference to theories, from singular statements which are 'verified by experience' (whatever that may mean), is logically inadmissible. Theories are, therefore, never empirically verifiable."<!-- voice-ignore-line: verbatim quotation of Popper, section 6 -->

Popper's own name for what a surviving theory earns is the opening sentence of Chapter 10, "Corroboration, or How a Theory Stands up to Tests", p.248: "Theories are not verifiable, but they can be 'corroborated'."<!-- voice-ignore-line: verbatim quotation of Popper, chapter 10 opening sentence -->

What it settles: falsifiability is a gate on the scale. A claim that no observation could refute takes no rung on an empirical scale at all. It can still take one on a derivational scale, which is how mathematics and logic get their footing. The `corroborated` rung below takes its name from p.248, and it carries Popper's meaning: a claim that has stood up to a test that could have refuted it.

### W3C PROV-O

PROV-O: The PROV Ontology, W3C Recommendation 30 April 2013, eds. Lebo, Sahoo and McGuinness, www.w3.org/TR/prov-o/. §3.1 gives the three starting-point classes: `prov:Entity` is "a physical, digital, conceptual, or other kind of thing with some fixed aspects; entities may be real or imaginary"; `prov:Activity` is "something that occurs over a period of time and acts upon or with entities; it may include consuming, processing, transforming, modifying, relocating, using, or generating entities"; `prov:Agent` is "something that bears some form of responsibility for an activity taking place, for the existence of an entity, or for another agent's activity."<!-- voice-ignore-line: verbatim quotations from PROV-O §3.1 -->

The starting-point properties that matter here are `prov:wasGeneratedBy`, `prov:wasDerivedFrom`, `prov:wasAttributedTo` and `prov:wasAssociatedWith`. §3.3 defines the qualification pattern: "The Qualification Pattern restates an unqualified influence relation by using an intermediate class that represents the influence between two resources. This new instance, in turn, can be annotated with additional descriptions of the influence that one resource had upon another."<!-- voice-ignore-line: verbatim quotation from PROV-O §3.3 -->

What it settles: a footing is generated by an activity, attributed to an agent, at a time, from a basis. The qualification pattern is the shape for recording why. Bucket's existing `graph.edge_proposals` already follows this pattern without naming it: `model`, `justification`, `prompt_hash`, `reviewer_id`, `decided_at`.

### Micropublications

Clark, Ciccarese and Goble, "Micropublications: a semantic model for claims, evidence, arguments and annotations in biomedical communications", Journal of Biomedical Semantics 2014;5:28, doi:10.1186/2041-1480-5-28. Abstract: "The minimal form of a micropublication is a statement with its attribution. The maximal form is a statement with its complete supporting argument, consisting of all relevant evidence, interpretations, discussion and challenges brought forward in support of or opposition to it."<!-- voice-ignore-line: verbatim quotation from Clark et al. 2014 abstract -->

Model elements, "Outline semantic representation of the model", items 3c, 2a and 2b: "A Claim is the single principal Statement arguedBy a Micropublication"; "The supports property is a transitive relation between Representations"; "The challenges property is inferred when a Representation either directlyChallenges another, or indirectlyChallenges it by undercutting (directlyChallenges) a Representation which supports it." The same subsection gives a second Claim definition at item 5c.i; item 3c is the one used here.<!-- voice-ignore-line: verbatim quotations from Clark et al. 2014 -->

The failure mode the paper is built against, Background: "Greenberg conducted a citation network analysis of over 300 publications on a single neuromuscular disorder, and found extensive progressive distortion of citations, to the extent that reviews in reputable journals presented statements as 'facts', which were ultimately based on no evidence at all". And the fix, Discussion: "Because it is far too laborious to check each and every cited document, searching for the relevant Claim, citable Claims are proposed here as a method to dramatically reduce the labor cost of checking a Claim's support."<!-- voice-ignore-line: verbatim quotations from Clark et al. 2014 -->

What it settles: a footing belongs to a claim with its support graph attached, and the support graph has to reach data rather than stopping at a citation. Bucket already enforces this for a student production. `hasUnverifiedSource` at `src/lib/research-os/production-guard.ts:64` blocks acceptance when any source line failed to match a recorded quote locator, and `src/app/api/research-os/review/route.ts:343-354` returns `409 unverified_sources_block_accept`. The proposal below extends that rule from productions to canon nodes.

## The proposed schema

Two axes, because how a claim is known and how well it is established are different questions. GRADE's own structure is the precedent: a design sets the start, factors move it.

### Why the axis is called `footing`

The first draft called it `standing`. That word fails this memo's own test. A grep over `src/`, `scripts/`, `supabase/`, `learning/research-os/` and `docs/` returns 81 hits carrying three separate meanings: a learner's stage on a node (`learning/research-os/IDEAL-STATE.md:14`, "a standing per node (stage and evidence)"), the client-visible response field built from `r.stage` at `src/app/api/research-os/graph/route.ts:46` and returned at `:83`, and `PairStanding` at `src/lib/research-os/makeup.ts:301`, the review standing of a factor-proposal pair. Naming a fourth thing `standing` would repeat what `tier` did.

Three other candidates were tested the same way. `warrant` collides twice: `learning/research-os/PLAN.md:40` already uses it for the organize tool's "claim, evidence, and warrant scaffolds", and Clark, Ciccarese and Goble use it fifteen times in Toulmin's sense, "In Toulmin's terminology, the warrant is a purported summary of the backing", which is an inference licence rather than a degree of establishment.<!-- voice-ignore-line: verbatim quotation from Clark et al. 2014 --> `establishment` would name the axis with the same word as its own top value `established`. `evidence_grade` would put "evidence" into a third sense beside `graph.learner_node_state.evidence` and `EvidenceKind` at `src/lib/research-os/stages.ts:68`, both of which grade the learner.

`footing` returns two hits across the same trees, both ordinary English inside prose, and none an identifier. It carries no competing sense in the literature this memo rests on, and it keeps the register of the founder's own phrasing in the `ros-truth` epic. A node's footing is what it stands on.

### Axis A: `knowing`

Nominal, closed set, from the founder's own list in the `ros-truth` epic. A Stevens nominal scale: permissible statistics are counts and mode.

| Value | Decision rule |
|---|---|
| `observed` | The node's author recorded a first-hand observation or measurement, with an instrument or a place named |
| `reported` | A named first-hand witness is on the record, and the node cites that witness |
| `recorded` | An instrument or a recording is the source, and the artifact is retrievable at a locator |
| `secondhand` | Every cited source itself reports someone else's report |
| `read` | The node paraphrases a text with a resolvable locator, and no independent basis is attached |
| `derived` | The node has at least one `derives_from` edge to a node in the graph, and the derivation is written out |
| `proved` | Every `derives_from` chain from the node terminates only in nodes with a `confirmed` row in `graph.irreducible_proposals`. The walk carries a `seen` set and returns 0 on a repeat, the guard `depthOf` already uses at `scripts/research-os/ingest/canon-all.ts:59-67`, and it stops at depth 32. It runs as a job rather than on write, and a node whose walk hits the bound or a cycle stays at the footing it already holds |
| `asserted` | Default. Nothing above holds |

`proved` is the only value whose rule is a graph traversal that the code can settle alone. The rest need a human or a pipeline to assert them, so each carries a basis string.

### Axis B: `footing`

Ordinal, four graded values plus null. Stevens Table 1 applies: order, median and percentiles are permissible; means are not.

| Value | Decision rule |
|---|---|
| null | Ungraded. The column default. Every row starts here |
| `conjectured` | The node states something the graph could refute, and no supporting source with a resolving locator is attached. Engine hypothesis nodes land here by construction |
| `supported` | At least one `cites` edge reaches a node whose `provenance` carries a `doi` or `url` that resolves, and a verbatim passage with a locator is recorded for it |
| `corroborated` | Two supporting sources that pass the independence test, or one `replicates` edge from an accepted replication node. Every `contradicts` edge on the node has a recorded response |
| `established` | For a derivational branch, `knowing = proved`. For an empirical branch, `corroborated` plus a named human sign-off and no unanswered `contradicts` edge |

The independence test already has a shipped home: `checkSecondSourceGate` at `src/lib/research-os/lateral-reading.ts:132`, with the learner-facing copy `SECOND_SOURCE_QUESTION_COPY` at line 81. The corroboration evidence kind `"corroboration"` is already in `EvidenceKind` at `src/lib/research-os/stages.ts:78`, inside the union opening at `:68`, carrying `firstSourceId`, `secondSourceId`, `independenceReason` and `passagesAgree` per `src/lib/research-os/EVIDENCE-SCHEMA.md`.

### Move-down reasons

GRADE §5.2 lists five factors that rate evidence down. Four reasons below are what this graph can check, and only one descends from a GRADE factor one-to-one:

| Reason | Trigger | GRADE origin |
|---|---|---|
| `contradicted` | A live `contradicts` edge with no recorded response | Bucket's own |
| `unverified_source` | A `cites` target whose locator does not resolve. Same rule as `hasUnverifiedSource`, `src/lib/research-os/production-guard.ts:64` | Bucket's own |
| `source_distance` | Every supporting source has `knowing = secondhand` or `read` | Bucket's own, nearest to §5.2.3 indirectness |
| `imprecise` | A quantitative claim with no interval and no sample size recorded | §5.2.4 imprecision |

### Move-up reasons

GRADE §5.3 lists three factors that rate evidence up. Four reasons below, one of them a GRADE factor:

| Reason | Trigger | GRADE origin |
|---|---|---|
| `replicated` | An accepted `replication` node with a `replicates` edge to this node | Bucket's own |
| `derived_from_established` | A `derives_from` edge to a node at `established`, with the derivation written out | Bucket's own |
| `prediction_met` | A prediction recorded on the node was later recorded as met, with its own source | Bucket's own |
| `magnitude` | The recorded effect is large enough that the listed move-down reasons could not account for it | §5.3.1 large magnitude of an effect |

### Falsifiability

A boolean plus a basis. Falsifiability is a gate on the scale, after Popper §6, and it occupies no rung of its own.

- `falsifiable = true`: an observation that would refute the claim is written out on the node. Required to reach `supported` in an empirical branch.
- `falsifiable = false`: the node is derivational or definitional. Its path to `established` runs through `knowing = proved`.
- `falsifiable = null`: nobody has decided. The node cannot pass `conjectured`.

An existence claim and a non-existence claim differ here, which the founder's epic already flags. "X exists" is refuted by exhausting the search space and is confirmed by one instance. "X does not exist" is refuted by one instance and is never confirmed by search. Record which of the two a node asserts in `claim_form`, with values `existence`, `universal`, `particular` and `definitional`, so the evidence rules can differ without a second footing scale.

### Measurement

Three fields, after Stevens and Michell.

- `data_kind`: `qualitative` or `quantitative`.
- `scale`: `nominal`, `ordinal`, `interval` or `ratio`, exactly Stevens 1946 Table 1.
- `scale_basis`: free text. Michell's scientific task, written down. A `scale` of `interval` or `ratio` is a claim that the attribute is quantitative, and this field is where that claim is argued.

The enforcement rule that follows: `learning/research-os/PRIMES.md` §"Next slices" item 1 proposes that "A node's truth level combines its primes' standing and its factor edges' confidence. Independent factors combine as a product".<!-- voice-ignore-line: verbatim quotation from PRIMES.md --> A product over `footing` values requires interval or ratio semantics that nobody has argued for. Until `scale_basis` for `footing` says otherwise, the combination uses order statistics: the minimum over a support set, and percentiles across a branch. That is Stevens Table 1's permissible-statistics column applied to Bucket's own planned computation.

### Provenance of the grade

After PROV-O §3.1 and §3.3, every footing assignment records the agent, the activity and the basis. This mirrors `graph.edge_proposals`, which already stores `model`, `justification`, `prompt_hash`, `reviewer_id` and `decided_at`.

## Who assigns a footing

`learning/research-os/INTEGRATION-PLAN.md` §3 already decided the governance for tiers: "**Who sets a tier**: the engine score proposes, a named human signs off, as the canon writeback works today."<!-- voice-ignore-line: verbatim quotation from INTEGRATION-PLAN.md --> Footing reuses it.

The proposal queue mirrors `graph.edge_proposals`. The gate is `verifyGraphReviewer` at `src/lib/research-os/reviewer.ts:76`, the environment allowlist alone, because that function's own header says it is "The gate for changing the graph itself".<!-- voice-ignore-line: verbatim quotation from reviewer.ts --> A class teacher can set footing on a node inside their own class region, which matches the same memo's "Teachers can add class-tier nodes below canon for their own classes."<!-- voice-ignore-line: verbatim quotation from INTEGRATION-PLAN.md -->

Three assignment paths:

1. **Ingest.** An importer computes a starting footing from what it can check. A canon entry with `canon_score >= 70` and an approved `provenance_signoff` starts at `supported`. A literature card at `provenance.tier = "candidate"` starts at `conjectured`. An engine hypothesis starts at `conjectured` whatever its posterior.
2. **Review.** A reviewer approves or rejects a proposed move, with a reason, exactly as `POST /api/research-os/edges` works today.
3. **Automatic move-down.** A newly created `contradicts` edge, or a source whose locator stops resolving, drops a node to the highest footing whose rule still holds and writes the reason. This is the only path that changes a footing without a human, and it moves in one direction.

## What the UI shows

Four surfaces, each keyed to what footing changes for the reader.

**Node header.** A footing chip beside kind and branch, and the `knowing` value under it. `learning/research-os/IDEAL-STATE.md` already specifies the header as "title, kind, branch, tier, your standing with what raised it, owner and visibility", so the chip is an addition to a list the page already renders.<!-- voice-ignore-line: verbatim quotation from IDEAL-STATE.md -->

**Map.** `src/lib/research-os/graph-layout.ts` keeps tier as the x-axis. Footing becomes a fill: ungraded hollow, `conjectured` outlined, `supported` and `corroborated` filled at two weights, `established` solid. `frontier_flag` keeps its gold ring, which stays orthogonal because an open question can sit at any footing.

**Check.** A node at `conjectured` or below cannot serve as the grounding that advances a learner from awareness to understanding. That rule lands in `isGroundedCheck` at `src/lib/research-os/stages.ts:268`, which today reads only the model's verdict:

```ts
export function isGroundedCheck(check: { result: "support" | "contradiction" | "unknown"; confidence: "high" | "medium" | "low"; abstained: boolean }): boolean {
  return !check.abstained && check.result === "support" && check.confidence !== "low";
}
```

The node's own footing is a second input this function does not have. Adding it is a real behavior change and belongs in `ros-truth 2` with its own tests.

**Production.** A production citing a node below `supported` says so in the review queue, beside the existing `duplicate_flag` and `lateral_reading_flag` that `checkSourceProvenance` at `src/app/api/research-os/production/route.ts:197`, `computeDuplicateFlag` at `:202` and `lateralReadingFlag` at `:208` already compute at submit. Following `learning/research-os/PRODUCTION-GUARD.md` §2, "Duplicate detection", which states at `:17` that "Duplicate detection never blocks submission", this flag is informational.<!-- voice-ignore-line: verbatim quotation from PRODUCTION-GUARD.md -->

## What a citation carries

The envelope at `src/lib/feed402-client.ts:22-38` defines `CitationSource` with `type`, `source_id`, `provider`, `retrieved_at`, `license`, `canonical_url`, `chunk_id` and `retrieval`. SPEC §2.3 tells consumers to ignore unknown fields, and the client's own comment at line 32 names that rule, so three additive fields are safe:

```ts
footing?: "conjectured" | "supported" | "corroborated" | "established";
knowing?: "observed" | "reported" | "recorded" | "secondhand" | "read" | "derived" | "proved" | "asserted";
footing_assigned_at?: string;   // ISO 8601
```

`canon_tier` stays as the coarse public label with its two existing values, written at `src/app/api/research/route.ts:380` and `:433`. `footing` is the fine one. The precedent for a verdict traveling inside a citation is already typed: `CitationVDS.verification` carries `status: "PASS" | "FAIL" | "INCONCLUSIVE"` plus a numeric `confidence` and a `findings` array at `src/lib/feed402-client.ts:47-51`.

A citing agent gains one thing it cannot get today: the ability to refuse a claim on the grounds that Bucket itself has not established it. That is the load test `docs/AGENT-TRUST.md` describes for the discovery half of the protocol, applied to the content half.

## How a footing changes over time

Append-only. A footing is never edited in place. Each assignment writes a new row, and the node reads its current footing from the newest row. `graph.nodes.superseded_by` already exists at `supabase/migrations/20260910000000_research_os_graph.sql:68` for the node itself, so the node and its grade share one supersession idea. That column has readers and no writer: `src/lib/research-os/makeup.ts:151`, `scripts/research-os/primes-report.ts:50` and `scripts/research-os/decompose-further.ts:278` all filter on `is("superseded_by", null)`, and nothing in `src/` or `scripts/` sets it.

Two properties follow. A reader can ask what Bucket believed on a given date and get an answer. A citation minted in March that says `supported` keeps its meaning after a June move-down, because `footing_assigned_at` dates the claim the citation made.

The precedent for never overwriting a human decision is `supabase/migrations/20260918030000_research_os_irreducible.sql:68`, which keeps a confirmed or refuted verdict when a rerun comes back `unchecked`, with `:59-60` doing the same for `confidence` and `agreement`.

## Migration sketch

```sql
-- ros-truth 2. Node-level footing, split from graph.nodes.tier, which stays
-- a difficulty and ordering axis (see this file, "What `tier` means today").

alter table graph.nodes add column if not exists knowing text;
alter table graph.nodes drop constraint if exists nodes_knowing_check;
alter table graph.nodes add constraint nodes_knowing_check
  check (knowing is null or knowing in
    ('observed','reported','recorded','secondhand','read','derived','proved','asserted'));

alter table graph.nodes add column if not exists footing text;
alter table graph.nodes drop constraint if exists nodes_footing_check;
alter table graph.nodes add constraint nodes_footing_check
  check (footing is null or footing in
    ('conjectured','supported','corroborated','established'));

alter table graph.nodes add column if not exists falsifiable boolean;
alter table graph.nodes add column if not exists claim_form text;
alter table graph.nodes drop constraint if exists nodes_claim_form_check;
alter table graph.nodes add constraint nodes_claim_form_check
  check (claim_form is null or claim_form in
    ('existence','universal','particular','definitional'));

alter table graph.nodes add column if not exists data_kind text;
alter table graph.nodes drop constraint if exists nodes_data_kind_check;
alter table graph.nodes add constraint nodes_data_kind_check
  check (data_kind is null or data_kind in ('qualitative','quantitative'));

alter table graph.nodes add column if not exists scale text;
alter table graph.nodes drop constraint if exists nodes_scale_check;
alter table graph.nodes add constraint nodes_scale_check
  check (scale is null or scale in ('nominal','ordinal','interval','ratio'));

create index if not exists nodes_footing_idx
  on graph.nodes (branch, footing) where footing is not null;

-- The append-only history. One row per assignment, newest wins.
-- Shape follows PROV-O's qualification pattern (W3C Rec 2013, section 3.3):
-- an activity, an agent, a time and a basis, rather than a bare value.
create table if not exists graph.node_footing (
  id             uuid        primary key default gen_random_uuid(),
  node_id        uuid        not null references graph.nodes (id) on delete cascade,
  footing        text        not null check (footing in
                               ('conjectured','supported','corroborated','established')),
  knowing        text,
  -- 'ingest' | 'review' | 'auto_down'
  method         text        not null check (method in ('ingest','review','auto_down')),
  -- Move-down reasons after GRADE Handbook section 5.2, move-up after 5.3.
  reasons        jsonb       not null default '[]'::jsonb,
  basis          text        not null,
  scale_basis    text,
  -- on delete set null keeps the row when a learner is erased. Whether the
  -- privacy_delete_learner RPC that deleteLearnerData calls at
  -- src/lib/research-os/privacy.ts:228 needs a clause for these two tables is
  -- open; PRIVACY_TABLES at src/lib/research-os/privacy.ts:106 lists the ten
  -- it covers today and neither of these is among them.
  assigned_by    uuid        references auth.users (id) on delete set null,
  model          text,
  created_at     timestamptz not null default now()
);

create index if not exists node_footing_node_idx
  on graph.node_footing (node_id, created_at desc);

-- One read path. graph.nodes.footing is what every reader sees; this trigger
-- is its only writer, so the column and the history can never disagree. The
-- history stays append-only and carries no superseded_by: the newest row by
-- (node_id, created_at desc) is the current one, and the index above serves
-- that ordering for an audit read.
create or replace function graph.apply_node_footing() returns trigger as $$
begin
  update graph.nodes
     set footing = new.footing,
         knowing = coalesce(new.knowing, knowing)
   where id = new.node_id;
  return new;
end $$ language plpgsql;

drop trigger if exists node_footing_apply on graph.node_footing;
create trigger node_footing_apply
  after insert on graph.node_footing
  for each row execute function graph.apply_node_footing();

alter table graph.node_footing enable row level security;
grant all on graph.node_footing to service_role;

-- The review queue, mirroring graph.edge_proposals.
create table if not exists graph.footing_proposals (
  id               uuid        primary key default gen_random_uuid(),
  node_id          uuid        not null references graph.nodes (id) on delete cascade,
  proposed         text        not null check (proposed in
                                 ('conjectured','supported','corroborated','established')),
  knowing          text,
  justification    text        not null,
  model            text        not null,
  prompt_hash      text        not null,
  status           text        not null default 'pending'
                               check (status in ('pending','approved','rejected')),
  reviewer_id      uuid        references auth.users (id) on delete set null,
  decision_reason  text,
  decided_at       timestamptz,
  created_at       timestamptz not null default now()
);

-- Partial, so a rejected proposal can be followed by a new one for the same
-- node while at most one stays open. A table constraint cannot carry a WHERE
-- clause, so this is an index.
create unique index if not exists footing_proposals_open_uidx
  on graph.footing_proposals (node_id) where status = 'pending';

alter table graph.footing_proposals enable row level security;
grant all on graph.footing_proposals to service_role;
```

Two code edits fall out of the migration before any of it reaches a client. `NODE_COLUMNS` at `src/lib/research-os/db.ts:216` is an explicit column list, `"id,slug,title,kind,tier,branch,summary,labels,provenance,worked_example,visibility,owner_id,frontier_flag"`, and the new fields have to join it. `GraphNode` at `src/lib/research-os/types.ts:121` and `NodeRow` at `src/lib/research-os/db.ts:95` have to carry them. Without both, the columns exist and no reader sees them.

The backfill is two passes, and only one of them is SQL. `provenance_signoff` is never a field on `graph.nodes`: it lives in `bucket-canon` `primary-papers.yaml` files on disk, read by `lookupCanonSignoff` at `src/lib/research-os/canon-link.ts:93` with `fs.readFileSync` and parsed at `src/lib/canon-primary.ts:189`. Rows 1 and 2 below therefore need a repo-side pass that joins those files to nodes on `provenance->>'paper_id'`. `canon_score` is a number inside the `provenance` jsonb written only for `canon_entry` and `primary_source` by `canonProvenance` at `src/lib/research-os/ingest/canon.ts:99-111`, so the cast needs a null guard. Everything else is a single idempotent `update`.

Every provenance type any writer produces gets a row. Null is an answer, and the rows that take it say why.

| Provenance type | Starting `footing` | Starting `knowing` | Why |
|---|---|---|---|
| `canon_entry`, `primary_source` with `canon_score >= 70` and an approved sign-off | `supported` | `read` | A named human approved the record upstream |
| `canon_entry`, `primary_source` without an approved sign-off | `conjectured` | `read` | The record exists and nobody has signed it |
| `literature_paper` at `provenance.tier = "candidate"` | `conjectured` | `read` | The card's own tier says candidate |
| `literature_paper` at `provenance.tier = "canon"` | `supported` | `read` | The card's own tier says canon |
| `academy_atom` | null | null | 487 atoms carry no source of their own |
| `engine_hypothesis`, `gap` | `conjectured` | `asserted` | Generated, unreviewed, whatever the posterior says |
| `production` | `supported` | inherit from the production's own sources | An accepted production passed the unverified-source gate |
| `import` | null | null | A private import is the importer's own, ungraded |
| `node_proposal` | null | null | A reviewer created the node and graded nothing |
| `canon_concept`, `canon_bridge` | null | null | A tag or a cluster, carrying no claim of its own |
| `canon_claim` | `conjectured` | `read` | Auto-segmented, the same posture `/api/research` already takes at `canon_tier: "candidate"` |
| `canon_figure`, `canon_site` | null | null | A person or a place; it asserts nothing to grade |
| `intake_digest`, `intake_target` | null | null | A search result count and a queued topic |
| `intake_paper` | `conjectured` | `read` | A PubMed record with no reading recorded |
| `mirror` (the seed's canon-bridge nodes) | null | null | A pointer at an Academy atom, graded where the atom is |

Leaving the null rows null is deliberate. 487 Academy atoms carry no source of their own, and guessing a footing for them would write the exact fiction GRADE's expert-opinion rule warns against.

## Open questions for the founder

These need a decision from you. I have not answered them.

1. **Does `footing` gate learning, or only label it?** The Check rule above would stop a learner advancing on a `conjectured` node. That protects the graph and it also blocks a learner from studying the frontier, which is where `learning/research-os/FRONTIER.md` wants them. Pick one: gate, or label and let the teacher decide.

2. **Is `footing` ordinal or interval?** Michell 1997 §1.4 says treating it as a quantity is a claim you owe evidence for. PRIMES.md §"Next slices" item 1 proposes multiplying what it calls a node's standing, which needs interval or ratio semantics. Either commit to the scientific task of showing the scale is quantitative, or restrict the combination to order statistics. This memo assumes order statistics until you say otherwise.

3. **Who can move a node to `established`?** The gate is `RESEARCH_OS_REVIEWER_EMAILS`, read by `isReviewerEmail` at `src/lib/research-os/reviewer.ts:48`. No value is committed and the variable is absent from `.env.example`, so this memo does not know how many people hold it. An `established` claim in the canon is the strongest thing Bucket says, and the x402 rail prices citations to it. How many hold that gate today, and does it need a second signer, a waiting period, or a public comment window?

4. **What is `established` in a branch that has no axioms?** `knowing = proved` works for mathematics and for the parts of physics with a derivation chain. Branch `07-mind` has neither axioms nor replicable experiments in most of its material. Either that branch tops out at `corroborated`, or `established` means something different there, which would break the ordering across branches.

5. **Does a move-down invalidate a citation already sold?** A citation minted at `supported` and later moved to `conjectured` was paid for. The fee routed to the author. `bucket.foundation/cite-forever/v0.1` exists as a license string at `PROTOCOL.md:114` and `docs/AGENT-TRUST.md:209`; the license text itself is unwritten, so there is no clause to read either way. Options: the citation stands as dated, the buyer gets a notice, or the license says what happens.

6. **Does `knowing = observed` open a path for a learner?** Bead `ros-truth 3` proposes that a learner who measures something first-hand records it on their own standing, the learner-side sense of the word this memo leaves alone. That is a learner-side field and a node-side field at once. Decide whether a learner's own observation can move a node's standing, or only their own.

7. **Is `footing` the name you want in a public citation?** The rename is decided above on repo evidence, and it is the author's call for a column. The public envelope is yours: `citation.footing` becomes a field outside consumers read, beside the `canon_tier` already shipping at `src/app/api/research/route.ts:380`. If a different word should face the network, say it before `ros-truth 2` writes the migration.

8. **Should the nine `tier` conventions be reconciled in this bead or a separate one?** `ros-tier-fix` at `BEADS-PENDING.jsonl:205` already exists for the grade-tier inversions: "61 of the 98 factor pairs the decompose-further verifier confirmed (v5 run) have the factor at a higher grade tier than its target".<!-- voice-ignore-line: verbatim quotation from the ros-tier-fix bead --> Splitting footing out of `tier` makes that reconciliation smaller and does not do it.

## Sources

- Guyatt, G.H., Oxman, A.D., Vist, G.E., Kunz, R., Falck-Ytter, Y., Alonso-Coello, P., Schünemann, H.J. GRADE: an emerging consensus on rating quality of evidence and strength of recommendations. BMJ 2008;336(7650):924-926. doi:10.1136/bmj.39489.470347.AD. PMID 18436948.
- Schünemann, H., Brożek, J., Guyatt, G., Oxman, A. (eds.) GRADE Handbook, 2013. Sections 5.1 through 5.4. gdt.gradepro.org/app/handbook/handbook.html. The live Handbook carries a banner on Section 5 and on every §5.2 subsection directing readers to the GRADE Book successor, which says "certainty of evidence" where the Handbook says "quality of evidence". This memo follows the 2013 text, whose section numbers and titles it cites; the successor renames the concept without changing the five rate-down and three rate-up factors.
- Stevens, S.S. On the Theory of Scales of Measurement. Science 1946;103(2684):677-680. doi:10.1126/science.103.2684.677. Table 1 at p.678.
- Michell, J. Quantitative science and the definition of measurement in psychology. British Journal of Psychology 1997;88(3):355-383. doi:10.1111/j.2044-8295.1997.tb02641.x. Sections 1.4 and 5.1, with §3.1 at p.360.
- Popper, K. Logik der Forschung. Vienna: Julius Springer, 1935. English: The Logic of Scientific Discovery. Read in the Routledge Classics edition, 2002, ISBN 0-415-27844-9. Section 6 at pp.17-20, quoted block on p.18, and the opening sentence of Chapter 10 at p.248.
- Lebo, T., Sahoo, S., McGuinness, D. (eds.) PROV-O: The PROV Ontology. W3C Recommendation, 30 April 2013. Sections 3.1 and 3.3. www.w3.org/TR/prov-o/
- Clark, T., Ciccarese, P.N., Goble, C.A. Micropublications: a semantic model for claims, evidence, arguments and annotations in biomedical communications. Journal of Biomedical Semantics 2014;5:28. doi:10.1186/2041-1480-5-28.
- Greenberg, S.A. How citation distortions create unfounded authority: analysis of a citation network. BMJ 2009;339:b2680. Cited here through Clark et al. 2014's account of it; the original was not read.
