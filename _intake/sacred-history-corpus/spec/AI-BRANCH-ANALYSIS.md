# Sacred-History Corpus — AI Branch-Analysis Engine

> The AI comparative-analysis layer. **The founder explicitly asked
> for this.**
>
> It produces cross-tradition correlations — motif parallels, figure
> mappings, textual-borrowing hypotheses, chronological correlations.
> **Hard guardrail:** every AI-produced correlation is emitted as a
> citeable, contestable `claim` with evidence pointers and a
> confidence — *never as fact*. The engine is a claim-*generator*, not
> a truth-*oracle*.

Status: **DRAFT — founder-requested feature, spec only, no
implementation.** Date: 2026-05-19. Pillar: Product. Reads
`ENTITY-MODEL.md` (claim/correlation schema), `RIGHTS-POLICY.md`
(quotability gate), `TIMELINE-MODEL.md` (chronological joins).

---

## 1. Why this exists (the bucket lineage)

bucket 1.0 (`HISTORY.md`) was a network for *building and debating
theories of history with evidence*. The branch-analysis engine is the
2026 expression of the same idea, with one inversion: in 2022 *humans*
proposed theories and attached evidence; here *AI* proposes
candidate correlations across traditions and is **required** to attach
evidence and provenance, after which *humans contest them*. The AI
takes the seat the 2022 "build evidence → build theory" pipeline gave
the user — and is held to the same "no evidence ⇒ not a claim" rule
(`ENTITY-MODEL §5`). This honors **build the past / build history**:
the engine reconstructs candidate cross-tradition history and submits
it for contest, never adjudicates it.

## 2. Inputs

The engine consumes only the corpus and its graph — never the open web
at analysis time:

| Input | From | Use |
|---|---|---|
| Tradition / text / witness / translation nodes | `traditions/**` | corpus surface to compare |
| Figure & entity graph | `figures/`, `entities/` | candidate figure mappings |
| Lineage trees | `traditions/<id>/branches/` | structural / schism comparison |
| Existing claims & correlations | `**/claims/`, `correlations/` | avoid duplicates; attach counter-claims |
| Timeline events + relations | `timeline/` | chronological correlation + borrowing-direction priors |
| Rights tier per node | `rights` block | gates whether evidence may quote or only locate |

Tier-B (copyrighted) translations are usable as **locators and as the
fact-that-a-rendering-exists**, never as quoted text
(`RIGHTS-POLICY.md`).

## 3. What it produces

Five correlation kinds, each emitted as a `correlation` claim per
`ENTITY-MODEL §6`:

1. **Motif parallels** — flood, creation, dying-and-rising, cosmic
   tree, divine council, apocalypse, golden-rule ethics.
   (`correlation_kind: motif-parallel`)
2. **Figure mappings / archetypes** — messiah / avatar / saoshyant /
   bodhisattva / mahdi; trickster; lawgiver; flood-hero; mother-
   goddess. (`correlation_kind: figure-mapping`)
3. **Textual-borrowing hypotheses** — directional dependence claims
   (e.g. wisdom-literature parallels, shared Near-Eastern law forms)
   with `direction: a→b | common-source`.
   (`correlation_kind: textual-borrowing`)
4. **Chronological correlations** — synchronisms and "X precedes and
   could have influenced Y" claims, anchored to `TIMELINE-MODEL`
   P155/P156/P585 edges. (`correlation_kind: chronological`)
5. **Structural / etymological** — shared ritual structures, divine-
   name etymologies, parallel canon-formation processes.
   (`correlation_kind: structural | etymological`)

Each output is a complete `correlation` object: `side_a`, `side_b`,
embedded `claim` with **evidence on both sides**, `confidence`,
`stance`, `provenance.asserted_by = "ai-branch-analysis"`,
`provenance.derived_by = {model, run_id, prompt_hash}`,
`counter_claims[]` (the engine must search for and link existing
opposing claims), and `story_protocol_ip_id: null` (mint decision is
`OPEN-DECISIONS.md` D4 — never auto-minted).

## 4. The guardrail (normative — non-negotiable)

> **G-1. Output type is `claim`, always.** The engine has no API that
> returns a bare assertion, a "fact", or a settled conclusion. Its
> only output type is a `correlation` claim object. There is no
> "verdict" field. There is no "this is true" path.

> **G-2. No evidence ⇒ no emission.** A candidate correlation with
> fewer than one locator on *each* side is discarded, not emitted
> (mirrors `ENTITY-MODEL §6` rejection rule). The model may not
> manufacture evidence; every `evidence[].locator` must resolve to a
> real corpus node + locator, validated post-generation.

> **G-3. Provenance is the model, not a scholar.**
> `asserted_by: "ai-branch-analysis"` and `derived_by` records the
> model id, run id, and prompt hash. The engine may *cite* human
> scholarship in `provenance.citations[]` but must never impersonate
> a scholarly consensus it did not find a citation for.

> **G-4. Confidence is calibrated weight, not truth.** `confidence`
> reflects strength + independence of cited support, with the
> calibration method documented in the run record. It is always
> surfaced beside the evidence; a high confidence is never rendered
> as "established."

> **G-5. Contestability is mandatory.** Every emitted correlation
> must (a) link any existing opposing claims into `counter_claims[]`,
> and (b) be itself contestable — a human or another run can file a
> counter-claim that links back. The corpus stores the debate, never
> a resolution. This is the literal 2022 "discuss/contest" function,
> relocated from a deleted UX into the data layer.

> **G-6. Rights-gated evidence.** Evidence quoting obeys
> `RIGHTS-POLICY.md`: Tier A may quote; Tier B locator-only; the
> fair-use micro-quote carve-out applies only when the claim is
> *about that exact rendering*.

> **G-7. Descriptive, not evaluative.** Per
> `canon-figures/08-tradition.md`'s standing editorial note, the
> engine never asserts a tradition's truth claims true or false. A
> correlation says "these texts share a motif and here is the cited
> evidence", never "therefore tradition X borrowed/copied/is derivative
> and is thus false."

> **G-8. No canon promotion.** AI output lands in
> `sacred-history-corpus/correlations/` and `**/claims/` only. It can
> never write into `bucket-canon/`. The figure seam
> (`ENTITY-MODEL §7`) is human-curated only.

## 5. Pipeline (spec, not code)

```
corpus + graph
   └─ candidate generation        (LLM proposes side_a/side_b pairs by kind)
        └─ evidence binding       (each side → real node + locator; unbindable ⇒ drop  [G-2])
             └─ rights gate       (quote vs locator-only per node tier               [G-6])
                  └─ counter-claim search (link existing opposing claims              [G-5])
                       └─ confidence calibration (documented method                   [G-4])
                            └─ provenance stamp (model/run/prompt hash                [G-3])
                                 └─ emit correlation claim → correlations/  (NEVER fact [G-1])
```

Every stage is idempotent and re-runnable (canon-folder contract): a
re-run updates `confidence`/evidence in place and appends a run record;
it never duplicates a correlation (dedupe on `side_a+side_b+kind`) and
never deletes a human counter-claim.

## 6. Run record (audit trail)

Each engine run writes `correlations/_runs/<run_id>.json`: model id,
prompt hash, corpus snapshot hash, input node count, candidates
generated, candidates dropped at G-2, emitted count, calibration
method, operator. This makes every AI correlation reproducible and
auditable — the GOVERNANCE transparency default applied to inference.

## 7. Out of scope

- No web retrieval at analysis time (corpus-closed for reproducibility).
- No auto-minting to Story Protocol (`OPEN-DECISIONS.md` D4).
- No ranking/visualization — the downstream search tool consumes these
  claims and decides display, exactly as with `TIMELINE-MODEL`.
- No truth adjudication — by construction, there is no code path to it.
