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

## 2026-06-24 — run 3 (assessment-quality pass + diagnostic-cap blocker discovered)
State on entry was FAR ahead of this log: corpus is now 7 branches + Languages
(biophysics 74, math 49, physics 55, chem 49, info 48, cosmology 41, mind 42, lang-core
448) with a branch picker (corpus/index.json) — runs 1–2's "start a second branch" NEXT
is long done. Baseline validate.sh GREEN.

**Intended work (expand biophysics) hit a hard blocker — documented here so the next run
doesn't repeat the dead end.** I authored 6 new, correct biophysics atoms (verlet, rmsf,
replica-exchange, coarse-graining, flory-scaling, rouse-model — the exact §1.9/§1.2 gaps
runs 1–2 flagged: Verlet integrator, RMSF/B-factor, enhanced sampling, coarse-graining,
Flory solvent-quality scaling, Rouse chain dynamics). They validate as JSON and introduce
fine in the 60-day engine sim. BUT **every one of them fails `test-diagnostic.mjs`**. Root
cause: that test asserts `expert.placedCount > questionsAsked`, and at baseline the margin
was exactly **+1** (placed 19, asked 18 at the hard `MAX_Q_DEFAULT = 18` cap). The
diagnostic gets ~zero prereq-inference leverage on the grown 74-atom graph (one correct
answer propagates DOWN only ~1 prereq hop before attenuating below KNOWN_THRESHOLD), so
placed ≈ asked. ANY added biophysics atom becomes an uncertain-band probe target that
consumes the fixed budget at 1:1, tipping placed to = asked → FAIL. I measured the
placed−asked surplus vs. cap with the 4 depth-3 atoms added: cap 18→+0, 23→0, 26→−1,
30→−5, 40→−8, 60→−14 — i.e. **raising the cap makes it WORSE**, because the extra
questions land on atoms beyond the expert's frontier. Deepening requires-edges (done
honestly: rouse→langevin, flory→entropic-elasticity+free-energy, coarse-graining→free-
energy) pulls atoms out of the depth≤2 expert set but does NOT fix it. Conclusion: this is
a real pre-existing diagnostic-inference limitation, not a content defect — and it blocks
the build-loop's PRIMARY mission (biophysics growth). I reverted all 6 atoms + the cap
experiment to keep the app green (do NOT redesign the diagnostic blindly in an autonomous
run — it risks the no-false-placement and seed-sanity checks too).

**Shipped instead (provably can't touch the diagnostic — no atom/prereq change):** added
rigorous, original **`derive`-level quiz items to 8 equation-type nucleus atoms** that had
only recall+apply — debye (linearized Poisson–Boltzmann → exponential screening), ddg
(ΔΔG → ~10× fold-population shift per 1.4 kcal/mol), hill (Hill-plot slope = n), eyring
(~1.4 kcal/mol per rate-decade), fick (steady-state Laplace + linear profile/flux),
random-walk (⟨x²⟩=Nδ²=2Dt, D=δ²/2τ), nernst (electrochemical-potential equality → 61
mV/decade at 310 K), chemiosmosis (Δp=180 mV → −17.4 kJ/mol·H⁺ → why 3–4 H⁺/ATP). All
numerics verified. derive-quiz coverage 20→28 of 74 atoms. meta 0.5.0→0.5.1. validate.sh
PASSES (all stages incl. diagnostic, engine sim, explorer smoke).

NEXT: **the high-value unblock is fixing the diagnostic's prereq inference** so it places
many concepts from few questions (the real ALEKS property) — until then biophysics atom
additions are blocked. Concretely: in js/diagnostic.js the DOWN-propagation on a correct
answer dies after ~1 hop (W_CORRECT 1.55 × PROP_DECAY 0.62 from prior logit(0.4) clears
KNOWN_THRESHOLD 0.62 at hop 1 but not hop 2). Either (a) propagate full requires-CLOSURE
on a confident-correct (not just decaying hop-by-hop), or (b) change `done()` to early-stop
once every remaining uncertain atom has an unknown prerequisite (so the expert stops
probing beyond its frontier instead of burning budget). EITHER restores placed≫asked and
unblocks adding the 6 ready-written atoms above. Guard the change against the
`no-false-placement` (line ~131) and `seed-sanity` checks. If you'd rather not touch the
diagnostic, the 6 atoms could instead seed a polymer-physics cluster in 02-physics (NOT
engine-tested), but they're framed for biophysics. Cheaper safe wins also remain: more
`derive` quizzes (46 atoms still lack one), `note` fields, and art generation.
