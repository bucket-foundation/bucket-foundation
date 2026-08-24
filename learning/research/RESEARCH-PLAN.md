# Bucket Learning

Cross-Pillar Deep Research Plan.

**Bead:** bkt-xo0 · 2026-06-11 · Orchestrated by Nucleus across all 7 pillars.

**Mandate from founder:** *Not* fast, correct, and amazing UX. Replicate the UX case
Studies of **Apple**, **Duolingo**, and **Whop** rigorously. Deep, cross-pillar research
before any build. The product: a learning + quizzing system on Bucket's canon corpus that
teaches the optimal *nucleus* of each field for polymathy, fun and shareable, free + paid
Tiers, AI (art) used fully. Pilot domain = biophysics.

**Required reading for every pillar** (the design so far):
`learning/README.md`, `learning/KNOWLEDGE-ARCHITECTURE.md`, `learning/PRODUCT.md`,
`learning/syllabus/05-biophysics.md`, `learning/ACQUISITION-LEDGER.md`.

**Rule for all:** open/legal sources only (no vk.com / PDF Drive / shadow libraries).
Cite everything. Write a deep deliverable; depth over speed.

---

## Pillar mandates

| Pillar | Deep-research mandate | Case studies to dissect |
|--------|------------------------|--------------------------|
| **Product** | Information architecture, onboarding, the daily learning loop screen-by-screen, the nucleus/skill-tree visualization, micro-interactions, empty/error/success states. **The UX bible.** | **Apple HIG** (deference/clarity/depth, progressive disclosure, motion, "it just works"); **Duolingo** (path redesign, lesson structure, feedback, mascot, variable reward); **Whop** (marketplace/creator UX, checkout, access passes) |
| **Engineering** | Technical architecture: stack, data model for atoms+graph, FSRS impl, AI pipeline (card/quiz/tutor/art), graph rendering, offline/sync, PWA-vs-native, corpus ingestion, "this computer as backend," scale + build-vs-buy | Duolingo eng (server-driven UI, A/B infra); Notion/Obsidian (markdown-native graph apps) |
| **Data** | Knowledge engineering: dependency-graph extraction from corpus, the **nucleus centrality** computation (PageRank/betweenness over concept graph), FSRS math + parameter optimization, paper→atom extraction, mastery model, "what to study next" recommendation, analytics/eval | SuperMemo/Anki/FSRS algorithm lineage; knowledge-graph pedagogy research |
| **Revenue** | Freemium economics, tier pricing, market sizing (edtech/study-tools), unit economics (AI cost vs price), viral GTM, the creator/Scholar rev-share + Story Protocol citation fees | **Duolingo** monetization (Super funnel, conversion); **Whop** creator-economy model; comps: Quizlet, Brilliant, RemNote, MagicSchool |
| **Customer Success** | Onboarding (commitment-before-signup), retention (streaks, Hook model, notifications), community/social (leagues, friends, cohorts, reading groups), the "fun" engine, churn prevention, first-session→habit | **Duolingo** onboarding + habit loop; Whop communities; Strava/BeReal social mechanics |
| **Operations** | AI inference + **art-generation cost model** (the big variable cost), copyright compliance + the PDF-import legal boundary, privacy (COPPA/FERPA/GDPR), Viatika AI-credit metering, UGC moderation, **accessibility (WCAG, part of Apple-grade UX)**, security | Viatika metering; edtech compliance regimes |
| **People** | Learning-science evidence base: spaced repetition, retrieval practice, interleaving, desirable difficulties, **dual coding (the art justification)**, AI-tutor efficacy (Bloom 2-sigma, ITS), motivation (self-determination theory ↔ gamification), **AI-tutor safety (hallucination in educational content)**, metacognition | Duolingo's pedagogy (what works / where it's shallow); ITS literature |

## Synthesis
Merge into `learning/research/_synthesis/`:
- `UX-SPEC.md`, the unified, Apple-grade UX specification (IA + flows + components).
- `DECISIONS.md`, cross-pillar decisions (stack, pricing, what to build P0).
- `RISKS.md`, copyright, AI-safety, cost, compliance, with mitigations.
- Update `PRODUCT.md` to reference the validated research.
