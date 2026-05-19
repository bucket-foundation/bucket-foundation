# Sacred-History Corpus — Open Decisions for the Founder

> Spec is complete and internally consistent. These are the decisions
> only the founder (@gianyrox, maintainer of last resort per
> `GOVERNANCE.md §5`) can make. Each has a Product recommendation, the
> tradeoff, and what it blocks.

Status: **FOUNDER-LOCKED 2026-05-19.** Pillar: Product (spec) / Data
(execution). The founder greenlit "do what you can and must" on
2026-05-19. **D1, D1a, D2, D3 are now DECIDED** (see the canonical
`DECISIONS.md` at the corpus root). D4 remains as written (no auto-mint,
Phase-2). Bead infra `bkt-` is 404 (2026-05-19, re-confirmed) — these
decisions are tracked here + in `DECISIONS.md` and referenced by the
Data pillar `BEAD-MANIFEST.md`; convert to beads when the instance
returns (file-order in the manifest's "FILE WHEN API RETURNS" section).

> **LOCKED SUMMARY (2026-05-19):**
> - **D1 → SIBLING corpus** (placement is data-driven & revisitable, NOT
>   a hard contract — reclassifiable as the data shows).
> - **D1a → `-corpus`** (gdrive `…/research/sacred-history-corpus/`).
> - **D2 → RIGHTS-POLICY.md ADOPTED as the operating default.** It
>   satisfies the P1 rights interlock **for PD/open sources only.**
>   Copyrighted/NC/unclear stay metadata-only & gated.
> - **D3 → Phase 1 LIVE for PD/open sources only**, bounded + idempotent
>   (proof run, not a full backfill). Local compute is the default and
>   effectively uncapped; network AI / Viatika x402 metered = $0 / OFF.
> - **D4 → unchanged** (no auto-mint; human-curated, Phase 2).

---

## D1 — Placement: sibling corpus vs 8th canon branch

**Recommendation: SIBLING corpus** (`gdrive:.../research/sacred-history-corpus/`),
peer to `longevity-canon`, NOT an 8th `bucket-canon` branch.

- **For (recommended):** Fails every canon test — not axioms / not
  re-derivable / explicitly *descriptive not evaluative*
  (`canon-figures/08-tradition.md`) / intentionally exhaustive not
  small. Honors the 2022→2026 narrowing (`HISTORY.md`) instead of
  re-importing the category error it fixed. Has its own rights regime.
  Closest living descendant of the bucket-1.0 "build history" thesis,
  kept correctly *outside* the canon.
- **Against:** A separate corpus is one more top-level tree to
  maintain; some may want sacred-history "to count" as canon.
- **Blocks:** the entire folder layout, the seam rules, and the Data
  pillar's ingestion bead targets. **Highest-priority decision.**

## D2 — Rights policy confirmation

**Recommendation: CONFIRM the two-tier gate as written**
(`RIGHTS-POLICY.md`): Tier A full-text only for PD/openly-licensed;
Tier B (NIV/ESV/NASB/etc.) = citation + locator metadata only, never
full text; tight per-claim fair-use micro-quote carve-out only.

- **For (recommended):** Direct application of `MANIFESTO.md §6`
  ("not a publisher… routing around rent-seekers") and
  `GOVERNANCE.md §3/§7` (no copyright claimed; arms-length COI;
  takedown-ready). Same citation-only posture already proven by the
  Kruse Index and feed402. Minimizes legal surface for a Tier-3,
  founder-personal, pre-formalization nonprofit.
- **Against:** Tier B means the corpus cannot show modern translation
  text inline; users must follow locators out. This is a deliberate,
  manifesto-aligned cost.
- **Decision needed:** confirm as-is, OR widen/narrow the fair-use
  carve-out, OR add a named edition to a tier.
- **Blocks:** any ingestion runner (cannot legally start without this).

## D3 — Scale / cost envelope of "forever" for a Tier-3 venture

**Recommendation: PHASED, capped ingestion. Phase 1 = Tier-A PD
core only** (a fixed seed set: e.g. KJV/LXX/Vulgate/Masoretic,
Tanzil Quran, PD Sanskrit/Pali core, ~1 tradition-tree per major
tradition, ~200 timeline events, AI correlations off). Expansion is a
later, separately-budgeted phase.

- **The problem:** "all religions, all texts, all translations,
  all manuscripts, forever" is an unbounded ingestion + Walrus/storage
  + AI-inference cost. Bucket is Tier 3, self-funded, pre-revenue,
  founder-personal (`GOVERNANCE §4/§6`: formalize only past $10k
  revenue; reserves ≤12 months).
- **Recommendation detail:** treat the corpus like the canon —
  *small and disciplined first*. PD-core Phase 1 is cheap (text is
  tiny; no licensing; idempotent). Manuscripts (images/IIIF) and the
  AI engine are the cost drivers — defer both to Phase 2 behind an
  explicit budget line. "Forever" = durability guarantee, **not** an
  ingest-everything-now mandate.
- **Decision needed:** approve Phase-1 scope + a storage/inference $
  ceiling, OR set a different envelope.
- **Blocks:** Data pillar's runner sizing and Walrus budget; the
  AI-engine bead's go/no-go.

## D4 — Do AI correlations get Story Protocol minted as citeable IP?

**Recommendation: NOT in Phase 1. Mint human-curated correlations
only, manually, later.** Keep `story_protocol_ip_id: null` as the
default for all AI output.

- **For not-minting AI output (recommended):** Minting an AI-derived,
  contestable correlation as on-chain "IP" risks reifying a claim the
  whole model is built to keep contestable (`ENTITY-MODEL §5`,
  `AI-BRANCH-ANALYSIS` G-1/G-5). It also raises an authorship question
  (who is the "author" of an AI correlation for the ≥80% author
  payout in `GOVERNANCE §4`?). Minting is the *terminal "publish"*
  action that survived from bucket 1.0 (`HISTORY.md`) — it should
  remain deliberate and human, not automatic.
- **Against:** Minting select, well-evidenced, human-reviewed
  correlations could fund the corpus via citation fees (the bucket
  business model) — but that is a Phase-2 question, not a blocker.
- **Decision needed:** confirm "no auto-mint, human-curated mint
  deferred to Phase 2," OR define a curation gate for minting now.
- **Blocks:** nothing in Phase 1 (default is `null`); affects Phase-2
  monetization design only.

---

## D1a — Naming: `sacred-history-corpus` vs `sacred-history-canon` (coordination flag) — **DECIDED → `-corpus`**

**DECIDED 2026-05-19 (founder-locked): name the gdrive tree
`gdrive:.../research/sacred-history-corpus/`, NOT `...-canon/`.** All
path references across README/SOURCES/runner/manifest/spec renamed to
`-corpus`. Recommendation below retained for the record.

- **Why this is open:** the Data pillar `BEAD-MANIFEST.md`
  (`bkt-epic-sacred-history`, `bkt-sh-gdrive-canon-wiring`) currently
  targets `gdrive:AGFarms/Nucleus/research/sacred-history-**canon**/`.
  This spec deliberately uses `-corpus`. Both pillars agree on the
  *substance* (sibling, not an 8th branch, not foundations-tier — D1);
  the divergence is only the folder word.
- **Product rec:** use `-corpus`. The word "canon" in bucket means
  foundations-tier (`MANIFESTO.md §3-4`); this index is explicitly
  *not* that (D1). `longevity-canon` is a legacy exception, not a
  precedent to extend. `-corpus` prevents a future reader from
  mistaking sacred-history for canon.
- **Decision needed:** pick one word; whichever is chosen, the Data
  pillar bead descriptions and this spec's paths are updated to match
  before any gdrive write. Trivial to change now, expensive after
  ingestion starts.
- **Blocks:** `bkt-sh-gdrive-canon-wiring` final path; cosmetic but
  must be settled with D1.

---

## Coordination with the Data pillar

This spec set is the **strategy/spec layer**; the Data pillar
`BEAD-MANIFEST.md` (`_intake/sacred-history-corpus/BEAD-MANIFEST.md`)
is the **execution layer** (1 epic + 10 child beads, staged but NOT
filed — `bkt-` instance API is 404 as of 2026-05-19). Mapping:

| Spec doc | Governs bead |
|---|---|
| `TAXONOMY.md` | `bkt-sh-taxonomy` |
| `RIGHTS-POLICY.md` | `bkt-sh-rights-policy` (P1 — must close before any live fetch) |
| `ENTITY-MODEL.md` | `bkt-sh-entity-branch-graph`, `bkt-sh-manuscript-provenance` |
| `TIMELINE-MODEL.md` | `bkt-sh-timeline-graph` |
| `AI-BRANCH-ANALYSIS.md` | `bkt-sh-ai-branch-analysis` |
| `OPEN-DECISIONS.md` | gates `bkt-sh-gdrive-canon-wiring`, `bkt-sh-story-mint-hook` |

No beads filed by either pillar (hard constraint). When the `bkt-`
API returns, file per the Data pillar manifest's "File order" section;
the rights-policy bead (`bkt-sh-rights-policy`, P1) blocks every
ingestion runner exactly as `RIGHTS-POLICY.md §5` requires.

---

## Summary table

| # | Decision | Outcome (founder-locked 2026-05-19) | Status |
|---|---|---|---|
| D1 | Sibling corpus vs 8th branch | **Sibling corpus** (data-driven, revisitable — not a hard contract) | DECIDED |
| D1a | `-corpus` vs `-canon` folder word | **`-corpus`** (all paths renamed) | DECIDED |
| D2 | Rights policy | **RIGHTS-POLICY.md ADOPTED** as operating default; satisfies P1 rights interlock for PD/open only | DECIDED |
| D3 | "Forever" scale/cost for Tier-3 | **Phase 1 LIVE, PD/open only**, bounded+idempotent; local compute default (uncapped), network AI/Viatika x402 OFF ($0) | DECIDED |
| D4 | Story Protocol mint for AI correlations | **No auto-mint; human-curated, Phase 2** | UNCHANGED |
