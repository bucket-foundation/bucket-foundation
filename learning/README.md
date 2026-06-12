# Bucket Learning

A learning + quizzing system built on Bucket Foundation's canon corpus. Teaches the
**optimal nucleus** of each field (foundations first), drills it with **spaced repetition**
(FSRS) wrapped in a **fun, shareable** product, and grows continuously from **legal**
open-access sources. Pilot domain: **biophysics** (Gian's general-exam prep). Generalizes
to all 10 canon branches.

**Bead:** bkt-xo0

## Read in this order
1. [`KNOWLEDGE-ARCHITECTURE.md`](KNOWLEDGE-ARCHITECTURE.md) — how knowledge is organized:
   the polymathy *nucleus*, the Concept Atom unit, Nucleus+Bucket data layout, the 10 branches.
2. [`PRODUCT.md`](PRODUCT.md) — Anki + Duolingo case studies, AI/art leverage, the learning
   loop, **free vs paid tiers**, social/viral, build phases.
3. [`syllabus/05-biophysics.md`](syllabus/05-biophysics.md) — the full general-exam span
   (prerequisites → nucleus → frontier) with master equations + open references.
4. [`ACQUISITION-LEDGER.md`](ACQUISITION-LEDGER.md) — paid books/papers I could **not**
   legally pull, with legal acquisition routes + open alternatives.
5. [`branches/branches.json`](branches/branches.json) — per-branch background-ingest config
   (legal sources only).

## Directory map
```
learning/
├── KNOWLEDGE-ARCHITECTURE.md   atoms, dependency graph, data org
├── PRODUCT.md                  the product (tiers, gamification, AI/art)
├── ACQUISITION-LEDGER.md       paid sources to buy/borrow (no piracy)
├── syllabus/NN-branch.md       general-exam scope per branch
├── atoms/NN-branch/*.md        Concept Atoms (unit of knowledge) — to populate
├── decks/                      FSRS spaced-repetition state — generated
├── branches/branches.json      background ingest config
└── engine/                     scheduler, quiz gen, FSRS, AI tutor, art gen — to build
```

## Hard rule
No vk.com / PDF Drive / shadow libraries. Corpus = open access (arXiv, PMC, LibreTexts,
OpenStax, MIT OCW, NCBI Bookshelf, Gutenberg, Wikisource) + Bucket's own x402 gateway +
any PDF the user **legally owns** (Pro import). Consistent with GOVERNANCE.md.

## Deep research (7-pillar, 2026-06-11)
Cross-pillar research replicating Apple / Duolingo / Whop UX case studies. Read order:
- [`research/RESEARCH-PLAN.md`](research/RESEARCH-PLAN.md) — the brief given to each pillar.
- [`research/_synthesis/DECISIONS.md`](research/_synthesis/DECISIONS.md) — **start here**: the binding cross-pillar decisions + the 3 convergences.
- [`research/_synthesis/UX-SPEC.md`](research/_synthesis/UX-SPEC.md) — the unified Apple-grade UX spec.
- [`research/_synthesis/RISKS.md`](research/_synthesis/RISKS.md) — risk register (every top risk already has a specced fix).
- Per-pillar deep dives: `research/product/UX-CASE-STUDIES.md`, `research/engineering/ARCHITECTURE.md`, `research/data/KNOWLEDGE-ENGINEERING.md`, `research/revenue/MONETIZATION-GTM.md`, `research/customer-success/ONBOARDING-RETENTION-COMMUNITY.md`, `research/operations/COST-COMPLIANCE-RISK.md`, `research/people/LEARNING-SCIENCE-AND-AI-SAFETY.md`.

## Next
- P0: populate ~40 biophysics nucleus atoms + a terminal FSRS quiz loop (proves engine).
- Then generalize the engine and turn on background ingest for the other branches.
