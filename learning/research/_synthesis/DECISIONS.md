# Bucket Learning — Cross-Pillar Decision Log

**Bead:** bkt-xo0 · 2026-06-11 · Synthesized by Nucleus from all 7 pillar deliverables.

This reconciles the seven research docs into binding decisions. Where pillars converged,
that's noted (convergence = high confidence). Where they were in tension, the resolution
and its owner are stated.

---

## The three convergences that define the product

These each emerged from **multiple independent pillars** — the strongest signal we have.

### Convergence 1 — Art is a property of the ATOM, not the user, and it must be *functional*
Three pillars arrived here from different directions:
- **Product:** generated concept art is the viral wedge + dual-coding win; lead the atom screen with it.
- **People:** *decorative* art is a pedagogical **own-goal** — seductive details hurt novices most (effect ≈ −0.3 to −0.5σ). Art only helps if it's load-bearing (multimedia principle, ≈ +1.35σ). There's an 8-point "load-bearing art" contract.
- **Operations:** per-*user* art generation is the cost wildcard; per-*atom* art rendered **once** at build and CDN-cached is ~$6–200 total, then free forever.

**Decision:** Every nucleus atom gets ONE functional art anchor, generated at build time, obeying People's load-bearing contract, cached and served to all learners. Custom per-user art is a Pro feature, capped, and still must pass the functional-art rule. → This single decision satisfies pedagogy, cost, AND virality. Owners: Data (art_prompt authoring to spec), Engineering (build-time render + cache), People (contract enforcement in the design system).

### Convergence 2 — The default surface is a computed ROUTE; the graph is a deliberate second view
- **Product:** Duolingo's biggest win was *killing* the skill tree — the daily default must be a zero-decision linear route; the dependency graph is a "map," never the default "route."
- **Data:** the route is generated — a leverage-weighted greedy walk over the Knowledge-Space-Theory **outer fringe** (never teaches B before its prerequisite A; front-loads highest-leverage nucleus concepts).
- **Engineering:** therefore the FSRS API must return an **ordered route** (due reviews + next frontier atom), not just an unordered due-pile.

**Decision:** Build the "route" abstraction first. Graph visualization is P1+, and even then it's the map view, not the home screen. Owners: Data (route algorithm), Engineering (route API), Product (route UI + the deliberate map view).

### Convergence 3 — AI-tutor safety is a hard gate, grounded in a human-verified canon
- **People:** confident-and-wrong is the *default* failure mode (RLHF breaks calibration); a wrong physics explanation installs a durable misconception. Seven non-negotiable requirements S1–S7 (RAG grounding, abstain-on-weak-retrieval, closed-set validated citations, uncertainty signaling, CI eval harness with a biophysics-misconception set, human-in-loop for canon, per-turn multi-turn re-checks).
- **Engineering:** owns S1–S7 implementation (hybrid pgvector+BM25 RAG, citation post-check stripping uncited claims, logged replayable turns).
- **Data:** owns the human-verified canon corpus + index that grounding *depends on* — RAG can only be as faithful as what it retrieves.

**Decision:** No tutor ships without S1–S7. Nucleus atoms are human-reviewed before they're tutorable canon. Citation grounding is mandatory, free-generation of facts is banned. Owners: Engineering (impl), Data (canon + index), People (eval spec + biophysics misconception item set).

---

## Stack & engineering decisions (from Engineering, validated against the others)

1. **Bucket Academy = a route group inside the existing Next.js 14 app** (Vercel + Supabase + Dynamic auth + Story Protocol). No new platform.
2. **Git markdown = source of truth for content; Postgres = synced projection + sole home of per-user state.** AI proposes atoms via PR, never silently mutates canon. DB always rebuildable from git.
3. **Scheduler: FSRS-6** — `ts-fsrs` at runtime (CLI→browser, unchanged), `py-fsrs` optimizer on the GPU box. **Target retention 0.90** (0.95 in exam-sprint). One FSRS deck per **(atom, mastery-signal)** where signal ∈ {recall, apply, derive, teach} — harder signals auto-get shorter intervals.
4. **Two-tier AI routing:** quality/low-volume (tutor, grading, card validation) → Anthropic API **metered through Viatika** (no duplicate ledger); bulk/cheap (embeddings, draft cards, art, ingestion) → local ROCm box (~$0). 
5. **Graph rendering: `react-force-graph`** (reuses Bucket's existing three.js/r3f) for the nucleus map; `react-flow` for the admin atom/edge authoring; `sigma.js` as the >5–10k-node escape hatch. **Curated concentric-shell layout, never raw force-directed** (the Obsidian-hairball fix).
6. **This computer as backend via `cloudflared` named tunnel** (bearer auth; never expose ollama/the model server directly). Lifts to rented GPU at scale with zero app changes. Ingestion = idempotent systemd timers (the repo's existing mirror-job pattern).
7. **Art model: SDXL-Turbo / Flux-Schnell on ROCm, batch-only, off the hot path** (8 GB VRAM-safe). Pre-baked per nucleus atom.
8. **Offline: PWA + Dexie/IndexedDB** through P2; Expo native only at P3 if retention data justifies push-driven habit.

## Knowledge-layer decisions (from Data)

9. **Nucleus = Leverage Score** = personalized PageRank (0.45) + transitive reach (0.30) + betweenness (0.15) + k-core (0.10), on the `requires`-direction graph. *Weights are a prior — validate against real exam-question frequency before claiming the ranking is optimal.*
10. **Ordering = Knowledge Space Theory** (Doignon–Falmagne): `requires` = surmise relation; the outer fringe = the study frontier; the path = greedy leverage-weighted walk over the fringe. Cross-branch cycles condensed via Tarjan into co-requisite clusters.
11. **Mastery = BKT per (atom, signal)**, fused with FSRS stability so "mastered" means "retained" (P≥0.95). IRT calibrates question difficulty. DKT only as an optional A/B re-ranker, never the displayed number (interpretability is a product requirement).
12. **Extraction = anchor-constrained, provenance-tracked LLM → sympy/schema validation → extract-then-verify entailment → human-in-loop on canon-tier.** Every field traces to a source span.

## Monetization decisions (from Revenue + Operations)

13. **Tiers:** Free $0 forever (full nucleus paths, FSRS, streaks/XP/leagues, cached art, ~5–10 tutor msgs/day cap) · **Pro $12/mo or $96/yr** (unlimited tutor, PDF-import of owned books, custom art, Exam-Simulator, analytics, Anki export) · **Scholar/Studio $24/mo or rev-share** (author + sell decks, Story Protocol citation royalties, cohort mode) · Family/Cohort $96–144/yr for 6. Lead with annual; student Pro ~$6.
14. **Pro viability requires three cost controls (mandatory, not toggles):** prompt caching, cheap diffusion art (not premium image APIs), and a fair-use throttle on the heavy-tutor tail. With those + atom-level art caching → blended Pro COGS ~$0.50–$10/user/mo, gross margin ~50–80%. *Revenue is more conservative (heavy-tutor tail can go negative at $12 uncontrolled); Operations is more optimistic with caching. Binding rule: keep blended Pro COGS ≤ $10/user/mo; if the board wants cushion, $15/mo is still in-band.*
15. **Positioning: "AI tutor + spaced repetition," NOT "test prep."** Test-prep volume is shrinking; AI-tutor + the monetization-starved SRS niche is the wedge. Efficacy claims cite the **replicated ~0.5–0.8σ** (ITS/guardrailed LLM), **never** Bloom's unreplicated 2σ (credibility + compliance).
16. **Marketplace fee ~2% cost-recovery, 0% on citation royalties** (vs Whop's ~6%) — nonprofit-consistent. Grants fund the free tier (the Khan model = the substitute for an ad budget).

## Compliance & quality gates (from Operations + People)

17. **Copyright:** open-access corpus only; atoms written in our own words (facts/equations aren't copyrightable — never copy textbook prose/figures/problem sets); PDF-import strictly personal-scope (never hosted/shared/redistributed); register a DMCA agent + notice-and-takedown + repeat-infringer policy.
18. **Privacy:** 13+ age gate (under-13 only via school/parent path); FERPA "school official" DPA for classroom mode; GDPR legal basis + data minimization (email + display name suffices); never train shared models on individual learning data.
19. **Accessibility = release gate:** WCAG 2.2 AA (4.5:1 contrast, full keyboard + visible focus, 24px targets, prefers-reduced-motion, semantic SR support, dyslexia mode), axe-in-CI. The graph needs a screen-reader **list-mode** (route as ordered list). This is part of the Apple-grade mandate, not an add-on.
20. **Motivation guardrail (People + Product):** gamify the SDT needs (autonomy/competence/relatedness), not the metric. Expected contingent rewards crowd out intrinsic motivation (≈ −0.3 to −0.4σ) — so streaks are soft + freezable, progress is *informational not controlling*, XP is mastery-weighted (derive ≫ recall), and every fun mechanic must be causally downstream of real understanding (the "can't be farmed without learning" test).

---

## Build sequence (reconciled)

- **P0 (days, = Gian's exam prep):** TypeScript + `ts-fsrs` + local SQLite **terminal quiz loop** over ~40 hand-verified biophysics nucleus atoms. Schema-compatible with the P1 Supabase migration. Proves the engine + pedagogy with zero UI. *This is the immediate, earns-its-keep deliverable.*
- **P1 (the real product):** Next.js route group — onboarding (first atom before signup), the daily route loop, atom screen (functional art + 3-depth + grounded tutor), the nucleus map (shell layout), streaks/XP. Free tier only. Local GPU backend via cloudflared.
- **P2 (Pro):** PDF-import, Exam-Simulator, custom art, analytics, Stripe billing via Viatika; prompt-caching + cheap-art + throttle live.
- **P3 (social + Scholar):** co-op leagues, friend streaks, cohorts/reading groups, Story Protocol minting, mobile (Expo) if retention justifies.

## Status: ACCEPTED by founder 2026-06-11

Founder signed off on the synthesis. The four open questions are resolved with the
recommended defaults below (all reversible once we have telemetry):

1. **Nucleus weights** → ship as a **human-reviewed heuristic**; revalidate against
   exam-question-frequency data once we have a question bank. (Decision 9 stands.)
2. **FSRS granularity** → **start coarse** (one deck per atom), split into per-mastery-level
   decks only if review data shows it helps. (Refines Decision 3.)
3. **Pro price** → **$12/mo (or $96/yr)** is the launch anchor; revisit to $15 only if
   cost telemetry shows the heavy-tutor tail breaching the ≤$10 COGS rule. (Decision 13 stands.)
4. **Efficacy claims** → committed to citing only the **replicated ~0.5–0.8σ** band;
   Bloom's 2σ is banned from all external copy. (Decision 15 stands.)

Next action: **P0** — terminal FSRS quiz loop over ~40 hand-verified biophysics nucleus
atoms (doubles as Gian's general-exam prep). Awaiting founder "go" to build.

---

## Open questions flagged for the founder (resolved above — kept for the record)
1. **Leverage-Score weights** need an exam-question-frequency signal to validate the nucleus ranking; until then it's a strong human-reviewed heuristic (Data).
2. **FSRS at derive/teach granularity is novel** — start coarse, split only if data supports (Data + Engineering).
3. **Pro price $12 vs $15** — $12 is the aggressive in-band anchor; $15 buys ~$3/mo margin cushion (Revenue).
4. Three numeric learning-science figures are flagged `[verify]` before any external publication (People).
