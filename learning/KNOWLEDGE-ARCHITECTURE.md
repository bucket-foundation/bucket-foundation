# Bucket Learning — Knowledge Architecture

**Bead:** bkt-xo0 · **Status:** design · **Author:** Gian + Nucleus · 2026-06-11

This document defines *how knowledge is organized* so that a learner can absorb the
**optimal nucleus** of each field — the smallest set of load-bearing ideas that unlock
the most adjacent understanding — and chain those nuclei into **polymathy**.

---

## 1. The thesis: learn the *nucleus*, not the textbook

Bucket's canon principle is "**foundations only** — axioms, real math, laws, principles,
primary derivations." The learning system inherits it. We do **not** try to teach every
fact in a field. We identify, per branch, the **high-centrality nodes**: the concepts and
equations that the largest number of downstream ideas *depend on*. Master those and the
rest becomes derivable, searchable, or quick to acquire.

Formally: model each branch's knowledge as a **directed dependency graph** (concept →
concepts it requires). The "nucleus" = the high-betweenness / high-out-degree core. A
**learning path** is a topological walk from prerequisites to frontier through that core.

> Anki teaches *cards*. Duolingo teaches a *skill tree*. Bucket teaches a **dependency
> graph of foundations**, ranked by leverage. That is the differentiator.

### Three concentric shells per branch
1. **Prerequisite shell** — the math/physics/chemistry you must already have.
2. **Nucleus shell** — the 30–60 foundational concepts + master equations that *define*
   the field (the general-exam core).
3. **Frontier shell** — current open problems and methods (the cutting edge, refreshed
   continuously from arXiv/bioRxiv/PMC).

A learner moves shell→shell; a polymath collects *nuclei across branches* and discovers
the **bridges** (e.g. statistical mechanics ↔ information theory ↔ machine learning;
electrodynamics ↔ NMR ↔ structural biology).

---

## 2. Unit of knowledge: the **Concept Atom**

Everything is built from one reusable object — the *Concept Atom* — stored as markdown +
front-matter so it is human-readable, git-versioned, citeable, and Story-Protocol-mintable
(Bucket IP layer).

```yaml
---
id: bp.thermo.boltzmann-distribution
branch: 05-biophysics            # maps to canon-figures/ + bucket-canon/
shell: nucleus                   # prereq | nucleus | frontier
title: Boltzmann distribution
type: equation                   # concept | equation | method | result | figure
requires: [stat-mech.microstates, math.exponential, thermo.temperature]
unlocks: [bp.folding.two-state, bp.binding.partition-function]
equation: "p_i = e^{-E_i/kT} / Z"
mastery_signal: derive           # recall | apply | derive | teach
sources: [openstax-physics, libretexts-pchem, arxiv:cond-mat/...]
canon_ref: bucket-canon/02-physics/statistical-mechanics
art_prompt: "a ladder of energy levels with population fading exponentially upward"
---
Plain-English explanation (Feynman level), then the formal statement, then a worked
example, then 2–4 quiz prompts (recall, apply, derive, teach-back).
```

**Why this shape.** One atom feeds *all* surfaces: a study card, a quiz question, a node
in the dependency graph, a corpus citation, an AI-tutor context chunk, and an art anchor.
Write once, reuse everywhere.

---

## 3. Data organization (Nucleus + Bucket, how it all files)

```
bucket-foundation/
├── canon-figures/NN-branch.md        ← WHO (the figures who built each foundation)
├── bucket-canon/NN-branch/           ← WHAT (the canonical artifacts: papers, derivations)
├── arxiv|pubmed|openalex|gutenberg|wikisource/   ← legal corpus ingest (already live)
└── learning/                          ← NEW: the learnable layer over the corpus
    ├── KNOWLEDGE-ARCHITECTURE.md      ← this file
    ├── PRODUCT.md                     ← product spec (tiers, gamification, AI/art)
    ├── ACQUISITION-LEDGER.md          ← paid books/papers we must buy (can't legally pull)
    ├── syllabus/NN-branch.md          ← the nucleus map + general-exam scope per branch
    ├── atoms/NN-branch/*.md           ← Concept Atoms (the unit above)
    ├── decks/                         ← generated spaced-repetition decks (FSRS state)
    ├── branches/branches.json         ← per-branch background-ingest config
    └── engine/                        ← scheduler, quiz gen, FSRS, AI tutor, art gen
```

**Three-layer separation of concern (Bucket's existing pattern, extended):**
- `canon-figures/` = **people** (already exists, 10 branch files).
- `bucket-canon/` = **artifacts** (already exists, the gdrive-mirrored canon).
- `learning/` = **pedagogy** (new) — turns artifacts into a path you can walk and a quiz
  you can fail and retry.

**Nucleus role.** The orchestrator (this platform) runs the background processes: nightly
corpus pulls per branch, atom extraction from new papers, deck regeneration, and brain-feed
of "what Gian is weak on" so future study sessions target gaps. Each branch is a
parallelizable job — dispatched like any other venture bead.

---

## 4. The ten branches (the polymathy span)

Mapped 1:1 to the existing `canon-figures/` files so nothing forks:

| # | Branch | Nucleus examples (high-leverage core) |
|---|--------|----------------------------------------|
| 01 | Mathematics | proof, limit, linear algebra, calculus, probability, group, metric |
| 02 | Physics | least action, Newton/Lagrange/Hamilton, Maxwell, stat-mech, QM, relativity |
| 03 | Chemistry | bonding, thermodynamics, kinetics, equilibrium, quantum chemistry |
| 04 | Information & computation | entropy, Turing/computability, complexity, coding, learning theory |
| 05 | **Biophysics** *(pilot)* | energy/entropy of macromolecules, folding, binding, membranes, dynamics |
| 06 | Cosmology | GR, FRW, thermodynamic history, structure formation |
| 07 | Mind | neuron doctrine, action potential, learning rules, computation in brains |
| 08 | Tradition | foundational texts and the lineage of ideas |
| 09 | Art | composition, color, form, the grammar of making |
| 10 | Earth | deep time, plate tectonics, climate system, biogeochemical cycles |

**Bridges (where polymathy lives)** — explicitly modeled as cross-branch edges:
stat-mech↔information↔ML; electrodynamics↔spectroscopy↔structural biology;
dynamical-systems↔neuroscience↔ecology; thermodynamics↔chemistry↔bioenergetics.

---

## 5. Build order

1. **Biophysics is the pilot** (you need it for the general exam now). Full syllabus +
   first ~40 nucleus atoms + a working quiz loop.
2. **Generalize the engine** so a new branch = a config row + a syllabus file; the
   background ingester + atom extractor + deck generator are branch-agnostic.
3. **Turn on the other branches** as background jobs, lowest-friction first
   (mathematics + physics, since they're prerequisites for everything else).

Honest note: the *engine* (FSRS scheduler, quiz generation, AI tutor, art generation) is
real software to build — scaffolded under `engine/` and specced in `PRODUCT.md`. The
*content* (atoms) grows continuously and is where the corpus-ingest background jobs feed in.
