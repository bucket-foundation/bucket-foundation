# Polymath Register

> **A derived view over `figures.json`, not a replacement for the branch files.** This file lists figures whose canonical contribution is **load-bearing in ≥3 canon branches** (`branches` + `cross_branches`, combined, distinct, length ≥ 3).
>
> **Editorial rule.** Inclusion here is *not* biographical breadth. "Wrote about many things" does not qualify. The figure must have a *foundation-tier contribution the field still cites* in each branch counted. A figure who was a working natural philosopher but produced canon only in one branch is not a polymath for our purposes; a figure whose single integrated practice produced canon in three or more branches is.
>
> **How to audit.** For each figure below, the test is: if you remove their contribution from any one of the listed branches, does that branch's canonical record have a real hole? If yes, the branch counts. If no, demote the figure out of this register.
>
> Generated 2026-04-23 (pass 2). Re-generate by querying `figures.json` for figures with `len(set(branches + cross_branches)) >= 3`.

---

## Register

| Figure | Primary branch | Cross-branches | Polymath qualifier (one line) |
|---|---|---|---|
| Aristotle | 07-mind | 02-physics, 05-biophysics, 08-tradition, 10-earth | Single unified corpus grounds logic, physics of motion, zoology, theology, and natural history; each downstream field treats the relevant treatise as foundational. |
| Leonardo da Vinci | 09-art | 02-physics, 05-biophysics, 10-earth | Notebooks are canon-tier contributions to fluid mechanics, anatomy, and geological observation, inseparable from the painterly practice. |
| Gauss | 01-mathematics | 02-physics, 06-cosmology | *Disquisitiones* (math), intrinsic differential geometry (foundation of GR), least-squares + Ceres orbit recovery (observational astronomy). |
| Riemann | 01-mathematics | 02-physics, 06-cosmology | Riemannian geometry (math); the manifold framework Einstein uses for GR (physics/cosmology). |
| Ibn al-Haytham (Alhazen) | 02-physics | 01-mathematics, 07-mind | Optics as experimental science, the theory of vision (physics + cognition), and original work in number theory / analysis. |
| Descartes | 07-mind | 01-mathematics, 02-physics | Analytic geometry, mechanistic physics, and the *Meditationes* are each foundation-tier in their branch. |
| Newton | 02-physics | 01-mathematics, 06-cosmology | Calculus, mechanics, and universal gravitation — three canon-tier contributions from one working programme. |
| Einstein | 02-physics | 06-cosmology, 01-mathematics | Special and general relativity (physics), the 1917 cosmological model with Λ (cosmology — founding paper of relativistic cosmology), and the propagation of Ricci–Levi-Civita tensor calculus into physics through Einstein–Grossmann 1913 and the 1916 *Grundlage* (math, cross-link only — adoption and propagation, not invention). |
| Gödel | 01-mathematics | 04-information, 07-mind | Incompleteness theorems (logic/math), computability foundations (information), and the philosophical consequences for mind. |
| Frege | 04-information | 01-mathematics, 07-mind | *Begriffsschrift* founds predicate logic (information), arithmetic logicism (math), and the theory of sense and reference (philosophy of mind / language). |
| von Neumann | 04-information | 01-mathematics, 02-physics, 07-mind | Stored-program architecture and cellular automata (information); Murray–von Neumann factor classification, NBG set theory, mean ergodic theorem (mathematics); Hilbert-space axiomatization of quantum mechanics and the entropy formula (physics); game theory and expected-utility decision theory (mind). Single integrated practice; foundation-tier output in four branches; highest cross-branch density in the index. Long bio at `bios/von-neumann.md`. |
| Marr | 07-mind | 04-information, 05-biophysics | Three-level framework spans computational theory (information), algorithm, and neural implementation (biophysics + mind). |
| Wiener | 04-information | 01-mathematics, 05-biophysics, 07-mind | Cybernetics wires probability, control theory, neural feedback, and communication into one substrate used by all four branches. |
| Hildegard of Bingen | 08-tradition | 05-biophysics, 09-art | Theological visionary corpus (*Scivias*), medieval natural-history / medical compendium (*Physica*, *Causae et Curae*), and surviving body of monophonic composition + the earliest morality play. |
| Mendeleev | 03-chemistry | 02-physics, 08-deep-history | Periodic law (1869/1871) with eka-element predictions confirmed 1875–1886 (chemistry); Mendeleev–Clapeyron form of the ideal-gas law with universal *R* (1874) (physics); Bureau of Weights and Measures directorship (1893–1907), founding the modern Russian metrological infrastructure that survives as VNIIM/Rosstandart (deep-history). Three-branch borderline qualifier admitted on the expanded definition of foundation that includes institutional infrastructure; sits below the Helmholtz/Gauss/Riemann tier. Long bio at `bios/mendeleev.md`. |
| Leibniz (NOT YET IN INDEX — pass-3 candidate) | — | — | Flagged: calculus, binary arithmetic, monadology, theodicy — clearly qualifies; add in a future pass. |

---

## What this register is not

- Not a "great minds" list. A merely encyclopedic figure whose contributions are compilational does not qualify.
- Not a popularity index. Living-figure polymath claims require **documented foundation-tier contribution in each claimed branch**, not a career summary.
- Not fixed. When a figure is added, removed, or re-scoped in `figures.json`, regenerate this file from the data.

## Polymaths flagged for pass 3

Names we chose *not* to promote to polymath status in pass 2, but which should be re-evaluated:

- **Kant** (07-mind, 02-physics via the nebular hypothesis, 06-cosmology) — currently in `07-mind` with no cross-branches in `figures.json`; nebular hypothesis is likely canon-tier in cosmology and should be cross-referenced in pass 3.
- **Maxwell** (02-physics, 06-cosmology via Saturn's rings, 03-chemistry via molecular theory) — cross-branches not yet reflected in data; re-audit in pass 3.
- **Leibniz** — not yet in the index at all; priority addition for pass 3.
- **Avicenna (Ibn Sīnā)** — not yet indexed; clear polymath candidate.
