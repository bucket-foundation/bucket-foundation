# Bucket Academy build-loop log

Each entry = one autonomous run. Newest at bottom.

## 2026-06-11 — seed (by Nucleus, in-session)
Shipped P1 app: FSRS-5 scheduler, foundations-first route gen with nucleus leverage
scoring, 33-atom biophysics corpus (5 prereq / 23 nucleus / 5 frontier), 3-depth atom
screens + KaTeX + retrieval drills, concentric-shell nucleus map, progress/streak/XP,
PWA offline. validate.sh passes (JSON + JS syntax + 60-day engine sim). Commits 407b261,
6074b8d.
NEXT: expand biophysics corpus toward full syllabus coverage (spectroscopy: Bragg/NMR/
FRET/cryo-EM-CTF; Poisson–Boltzmann; Kramers; Smoluchowski; Helfrich; GHK; cable eqn;
Monte Carlo; FEP/WHAM; Markov state models; contact order; RMSF). Then start a second
branch corpus (math or physics) + a branch picker in the UI.

## 2026-06-11 — run 1 (corpus expansion: spectroscopy + stochastic dynamics)
Added 8 nucleus atoms, 33 → 41. Spectroscopy methods (syllabus §1.8, was entirely
empty): `bragg` (X-ray diffraction + phase problem), `nmr-noe` (chemical shift + r⁻⁶
NOE ruler), `fret` (Förster ruler, E=1/(1+(r/R₀)⁶)), `cryo-em-ctf` (single-particle +
CTF correction). Stochastic dynamics (§1.5/1.9 gaps): `poisson-boltzmann` (requires
debye; Debye length as its linearized limit), `langevin` (fluctuation–dissipation),
`smoluchowski-rate` (k=4πDR diffusion-limited binding; requires fick+einstein-stokes),
`kramers` (friction-corrected TST; requires langevin+eyring). All have clean requires-
edges into existing nucleus atoms, 3 depths, 2 varied-level quiz items, OPEN sources
only, art_prompt. validate.sh PASSES (41 atoms, no dupes/missing, 60-day sim introduces
all 41). Commit d0476a5.
NEXT: still-thin biophysics topics — Helfrich membrane elasticity (requires bilayer),
GHK equation (requires nernst), cable equation (requires hodgkin-huxley), Monte Carlo +
FEP/WHAM free-energy methods + Markov state models (requires md), contact order, RMSF.
After ~1–2 more biophysics batches, START A SECOND BRANCH: create app/corpus/01-mathematics.json
or 02-physics.json (6–12 seed atoms, same schema) + a branch-picker in the UI (engine.js
currently hardcodes biophysics.json — see js/engine.js load()).

## 2026-06-11 — run 2 (corpus expansion: membranes + electrophysiology + computational)
Added 7 nucleus atoms, 41 → 48. Membranes/electrophysiology (§1.6/1.7 gaps):
`helfrich` (bending energy ½κ(2H−c₀)², requires bilayer), `ghk` (Goldman–Hodgkin–Katz
permeability-weighted V_m, requires nernst), `cable-equation` (λ/τ passive cable,
requires hodgkin-huxley). Computational/statistical biophysics (§1.9, was thin):
`monte-carlo` (Metropolis detailed-balance sampling, requires boltzmann), `fep-wham`
(FEP + umbrella + WHAM free-energy/PMF, requires free-energy+md), `markov-state-model`
(MSM slow-kinetics from many short trajectories, requires md+random-walk). Folding
(§1.3): `contact-order` (native topology sets folding rate, requires two-state-folding+
structure-hierarchy). All clean requires-edges, 3 depths, 2 varied-level quiz, OPEN
sources, art_prompt. validate.sh PASSES (48 atoms, no dupes/missing, 60-day sim
introduces all 48). Commit fefd9ed.
NEXT: biophysics §1.9/1.5 still has RMSF (requires md — atomic fluctuation B-factor link),
plus possible Verlet integrator, enhanced sampling (replica exchange), TICA/collective
variables. After that the biophysics nucleus is well-covered (~50 atoms) — STRONGLY
recommend STARTING A SECOND BRANCH next run: create app/corpus/01-mathematics.json or
02-physics.json (6–12 seed atoms, same schema/meta block) AND add a branch picker — note
engine.js load() and validate.sh both hardcode biophysics.json, so a multi-branch picker
needs engine.js to accept a corpus path + validate.sh's engine sim to loop or stay on
biophysics. Lowest-risk: add the second corpus file first (validate.sh's JSON-integrity
loop already covers corpus/*.json), then wire the picker.
