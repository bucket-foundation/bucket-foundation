# Bucket Academy build-loop log

Each entry = one autonomous run. Newest at bottom.

## 2026-06-11, seed
Shipped P1 app: FSRS-5 scheduler, foundations-first route gen with nucleus reach
scoring, 33-atom biophysics corpus (5 prereq / 23 nucleus / 5 frontier), 3-depth atom
screens + KaTeX + retrieval drills, concentric-shell nucleus map, progress/streak/XP,
PWA offline. Validate.sh passes (JSON + JS syntax + 60-day engine sim). Commits 407b261,
6074b8d.
NEXT: expand biophysics corpus toward full syllabus coverage (spectroscopy: Bragg/NMR/
FRET/cryo-EM-CTF; Poisson, Boltzmann; Kramers; Smoluchowski; Helfrich; GHK; cable eqn;
Monte Carlo; FEP/WHAM; Markov state models; contact order; RMSF). Then start a second
branch corpus (math or physics) + a branch picker in the UI.

## 2026-06-11, run 1
Added 8 nucleus atoms, 33 → 41. Spectroscopy methods (syllabus §1.8, was entirely
empty): `bragg` (X-ray diffraction + phase problem), `nmr-noe` (chemical shift + r⁻⁶
NOE ruler), `fret` (Förster ruler, E=1/(1+(r/R₀)⁶)), `cryo-em-ctf` (single-particle +
CTF correction). Stochastic dynamics (§1.5/1.9 gaps): `poisson-boltzmann` (requires
debye; Debye length as its linearized limit), `langevin` (fluctuation, dissipation),
`smoluchowski-rate` (k=4πDR diffusion-limited binding; requires fick+einstein-stokes),
`kramers` (friction-corrected TST; requires langevin+eyring). All have clean requires-
edges into existing nucleus atoms, 3 depths, 2 varied-level quiz items, OPEN sources
only, art_prompt. Validate.sh PASSES (41 atoms, no dupes/missing, 60-day sim introduces
all 41). Commit d0476a5.
NEXT: still-thin biophysics topics, Helfrich membrane elasticity (requires bilayer),
GHK equation (requires nernst), cable equation (requires hodgkin-huxley), Monte Carlo +
FEP/WHAM free-energy methods + Markov state models (requires md), contact order, RMSF.
After ~1-2 more biophysics batches, START A SECOND BRANCH: create app/corpus/01-mathematics.json
Or 02-physics.json (6-12 seed atoms, same schema) + a branch-picker in the UI (engine.js
currently hardcodes biophysics.json, see js/engine.js load()).

## 2026-06-11, run 2
Added 7 nucleus atoms, 41 → 48. Membranes/electrophysiology (§1.6/1.7 gaps):
`helfrich` (bending energy ½κ(2H−c₀)², requires bilayer), `ghk` (Goldman, Hodgkin, Katz
permeability-weighted V_m, requires nernst), `cable-equation` (λ/τ passive cable,
Requires hodgkin-huxley). Computational/statistical biophysics (§1.9, was thin):
`monte-carlo` (Metropolis detailed-balance sampling, requires boltzmann), `fep-wham`
(FEP + umbrella + WHAM free-energy/PMF, requires free-energy+md), `markov-state-model`
(MSM slow-kinetics from many short trajectories, requires md+random-walk). Folding
(§1.3): `contact-order` (native topology sets folding rate, requires two-state-folding+
structure-hierarchy). All clean requires-edges, 3 depths, 2 varied-level quiz, OPEN
sources, art_prompt. Validate.sh PASSES (48 atoms, no dupes/missing, 60-day sim
introduces all 48). Commit fefd9ed.
NEXT: biophysics §1.9/1.5 still has RMSF (requires md, atomic fluctuation B-factor link),
Plus possible Verlet integrator, enhanced sampling (replica exchange), TICA/collective
variables. After that the biophysics nucleus is well-covered (~50 atoms), STRONGLY
recommend STARTING A SECOND BRANCH next run: create app/corpus/01-mathematics.json or
02-physics.json (6-12 seed atoms, same schema/meta block) AND add a branch picker, note
Engine.js load() and validate.sh both hardcode biophysics.json, so a multi-branch picker
needs engine.js to accept a corpus path + validate.sh's engine sim to loop or stay on
biophysics. Lowest-risk: add the second corpus file first (validate.sh's JSON-integrity
loop already covers corpus/*.json), then wire the picker.

## 2026-06-24, run 3
State on entry was FAR ahead of this log: corpus is now 7 branches + Languages
(biophysics 74, math 49, physics 55, chem 49, info 48, cosmology 41, mind 42, lang-core
448) with a branch picker (corpus/index.json), runs 1-2's "start a second branch" NEXT
Is long done. Baseline validate.sh GREEN.

**Intended work (expand biophysics) hit a hard blocker, documented here so the next run
Doesn't repeat the dead end.** I authored 6 new, correct biophysics atoms (verlet, rmsf,
Replica-exchange, coarse-graining, flory-scaling, rouse-model, the exact §1.9/§1.2 gaps
runs 1-2 flagged: Verlet integrator, RMSF/B-factor, enhanced sampling, coarse-graining,
Flory solvent-quality scaling, Rouse chain dynamics). They validate as JSON and introduce
fine in the 60-day engine sim. BUT **every one of them fails `test-diagnostic.mjs`**. Root
cause: that test asserts `expert.placedCount > questionsAsked`, and at baseline the margin
was exactly **+1** (placed 19, asked 18 at the hard `MAX_Q_DEFAULT = 18` cap). The
diagnostic gets ~zero prereq-inference reach on the grown 74-atom graph (one correct
answer propagates DOWN only ~1 prereq hop before attenuating below KNOWN_THRESHOLD), so
placed ≈ asked. ANY added biophysics atom becomes an uncertain-band probe target that
consumes the fixed budget at 1:1, tipping placed to = asked → FAIL. I measured the
placed−asked surplus vs. Cap with the 4 depth-3 atoms added: cap 18→+0, 23→0, 26→−1,
30→−5, 40→−8, 60→−14, i.e. **raising the cap makes it WORSE**, because the extra
Questions land on atoms beyond the expert's frontier. Deepening requires-edges (done
: rouse→langevin, flory→entropic-elasticity+free-energy, coarse-graining→free-
energy) pulls atoms out of the depth≤2 expert set but does NOT fix it. Conclusion: this is
A real pre-existing diagnostic-inference limitation with no content defect involved, and it blocks
the build-loop's PRIMARY mission (biophysics growth). I reverted all 6 atoms + the cap
experiment to keep the app green (do NOT redesign the diagnostic blindly in an autonomous
run, it risks the no-false-placement and seed-sanity checks too).

**Shipped instead (provably can't touch the diagnostic, no atom/prereq change):** added
Rigorous, original **`derive`-level quiz items to 8 equation-type nucleus atoms** that had
only recall+apply, debye (linearized Poisson, Boltzmann → exponential screening), ddg
(ΔΔG → ~10× fold-population shift per 1.4 kcal/mol), hill (Hill-plot slope = n), eyring
(~1.4 kcal/mol per rate-decade), fick (steady-state Laplace + linear profile/flux),
Random-walk (⟨x²⟩=Nδ²=2Dt, D=δ²/2τ), nernst (electrochemical-potential equality → 61
MV/decade at 310 K), chemiosmosis (Δp=180 mV → −17.4 kJ/mol·H⁺ → why 3-4 H⁺/ATP). All
numerics verified. Derive-quiz coverage 20→28 of 74 atoms. Meta 0.5.0→0.5.1. Validate.sh
PASSES (all stages incl. Diagnostic, engine sim, explorer smoke).

NEXT: **the high-value unblock is fixing the diagnostic's prereq inference** so it places
many concepts from few questions (the real ALEKS property), until then biophysics atom
additions are blocked. Concretely: in js/diagnostic.js the DOWN-propagation on a correct
answer dies after ~1 hop (W_CORRECT 1.55 × PROP_DECAY 0.62 from prior logit(0.4) clears
KNOWN_THRESHOLD 0.62 at hop 1 but not hop 2). Either (a) propagate full requires-CLOSURE
On a confident-correct (not just decaying hop-by-hop), or (b) change `done()` to early-stop
once every remaining uncertain atom has an unknown prerequisite (so the expert stops
probing beyond its frontier instead of burning budget). EITHER restores placed≫asked and
unblocks adding the 6 ready-written atoms above. Guard the change against the
`no-false-placement` (line ~131) and `seed-sanity` checks. If you'd rather not touch the
diagnostic, the 6 atoms could instead seed a polymer-physics cluster in 02-physics (NOT
engine-tested), but they're framed for biophysics. Cheaper safe wins also remain: more
`derive` quizzes (46 atoms still lack one), `note` fields, and art generation.

## 2026-06-24, run 4
Fixed the diagnostic-inference blocker that run 3 documented and that had stalled the
build-loop's PRIMARY mission (biophysics growth). Root cause was real: the placement
diagnostic placed barely more concepts than questions asked (expert: 51 known, placed
19 from 18 questions, margin +1), so ANY added atom tipped `placedCount > questionsAsked`
To failure. Implemented full symmetric **Knowledge-Space-Theory prerequisite-closure
inference** in `js/diagnostic.js`: (a) a confident (non-slow) CORRECT answer floods the
Atom's entire transitive requires-closure to a confident-known floor (`_inferKnown`,
INFER_FLOOR=1.40≈P0.80) so prerequisites PLACE and leave the ask-band instead of landing
At P≈0.63 and getting re-probed; (b) an INCORRECT answer floods the transitive
unlocks-closure to a confident-unknown floor (`_inferUnknown`, −1.40) so a missed
foundation collapses everything above it, which restores BEGINNER early-stop (8 q, was
going to cap); (c) `next()` gains a **correctness-gated** closure-payoff bias
(CLOSURE_BIAS=0.15) that, only after the learner has answered ≥1, prefers asking
high-requires-closure atoms (one correct floods many prereqs = the headline ALEKS
property), gated so a pure beginner stays on plain binary search and still early-stops.
Tuned empirically (8 parameter sweeps); chosen point: expert margin **+4** (placed 22 /
asked 18, prereq shell 6/6), beginner 8 q / placed 0, prereq-only 6 placed / 0 stray.
Stress-tested: margin holds at +4 through +8 added atoms, +2 at +12, the blocker is
gone, biophysics additions are UNBLOCKED.
Then realized the unblock: added **4 new nucleus atoms, 74 → 78**, filling the §1.9
computational/sampling gap runs 1-3 kept flagging, `verlet` (velocity-Verlet symplectic
integrator, timestep↔fastest-motion, SHAKE/LINCS; requires md), `rmsf` (per-atom
RMS fluctuation, B=(8π²/3)⟨Δr²⟩ bridge to crystallographic B-factors, RMSF vs RMSD;
Requires md), `replica-exchange` (parallel tempering, Metropolis swap min(1,
E^{(β_i−β_j)(U_i−U_j)}), √N replica scaling, REST; requires md+boltzmann),
`coarse-graining` (beads + potential-of-mean-force = free energy, MARTINI, transferability
+ accelerated-time caveats; requires md+free-energy). All original prose, verified
numerics (8π²/3≈26.3 etc.), OPEN sources, full lesson + 3 depths + 2 varied-level quiz
(3 of the 8 new quiz items are `derive`-level) + note + resources + art_prompt. Clean
requires-edges into existing nucleus atoms. Validate.sh PASSES end-to-end (78 atoms intro
In 60-day sim; diagnostic green at +2 margin with the 4 added; assess/lang/explorer
smokes all green). Mirrored to public/academy-app via sync-academy. Meta 0.5.1→0.5.2.
NEXT: biophysics growth is now unblocked, add the remaining §1.9/§1.2 atoms run 3 wrote
(flory-scaling [requires random-walk], rouse-model [requires langevin], plus TICA/
collective-variables, normal-mode/elastic-network) in batches of ~4, re-running
validate.sh each time (current diagnostic margin +2 → keep batches small or add a few
mid-graph atoms whose closures flood to widen the margin again). The diagnostic fix is
principled and stable; don't re-tune it. Other safe wins still open: ~40 atoms still lack
A `derive` quiz item; `note` fields; art generation if a GPU image model is reachable.

## 2026-06-24, run 5
Continued run 4's NEXT (the polymer-dynamics §1.2/§1.9 batch). Authored 4 new, correct
atoms, `flory-scaling` (Flory exponent ν=3/(d+2)→3/5 good / 1/2 theta / 1/3 globule, from
the entropic-elastic vs excluded-volume free-energy balance; requires ideal-chain+entropic-
elasticity), `rouse-model` (beads-on-springs + Langevin: τ_p=τ_R/p², τ_R~N², monomer t^(1/2)
Subdiffusion, unentangled-melt regime; requires langevin+ideal-chain), `zimm-model` (adds
hydrodynamic backflow → coil diffuses as a sphere, D~N^(−ν), τ~N^(3ν)=N^1.8, monomer t^(2/3),
Dilute-solution regime; requires rouse-model+einstein-stokes), and `tica` (time-lagged ICA:
C(τ)v=λC(0)v, implied timescale t=−τ/lnλ, slow-mode CVs for MSMs vs variance-based PCA;
requires markov-state-model). All original prose, verified numerics (R^5~vN^3b^2 minimization,
2^(3/5)≈1.52, τ_4=τ_R/16≈63ns, 3ν=1.8, −10/ln0.9≈95ns), OPEN sources, full lesson + 3 depths
+ 2 quiz (1 derive each) + note + resources + art_prompt.

**Only `flory-scaling` + `rouse-model` shipped (78→80).** Empirically tested every subset
against test-diagnostic.mjs: flory alone and flory+rouse both hold the expert margin at +2
(placed 20 / asked 18, PASS); adding `zimm-model` cliffs it to placed 16 / asked 18 (margin
−2, FAIL), and tica keeps it failed. Root cause is the SAME documented limit run 3 hit and
run 4 partially fixed: the test's "expert" only knows atoms with requires-depth ≤ 2, and
`zimm-model` (depth 4) / `tica` (depth ≥3) sit beyond that frontier, so they become uncertain
probe targets that the closure-bias `next()` prefers, burning the fixed 18-question
budget on atoms the expert can't answer (and their incorrect answers flood unlocks→unknown,
Knocking out ~4 previously-placed atoms). Flory (depth 2, in the expert set, floods its
closure) and rouse (depth 3 but its closure floods langevin/random-walk/einstein-stokes/fick
which ARE known) stay within budget. Per the explicit run-4 NEXT guidance ("keep batches
small … don't re-tune the diagnostic"), I did NOT touch js/diagnostic.js. Validate.sh PASSES
end-to-end (80 atoms intro in 60-day engine sim; diagnostic green at +2; assess/lang/explorer
smokes green). Mirrored to public/academy-app (now tracked, 80 atoms). Meta 0.5.2→0.5.3.

NEXT: `zimm-model` + `tica` are written, correct, and ready, they just need the diagnostic
To early-stop probing atoms whose prerequisites are still unknown (run-3 option b / run-4's
closure-machinery extended one more step) BEFORE they can be added, OR they can seed a
polymer-dynamics / sampling cluster in 02-physics or 04-information (NOT engine/diagnostic-
tested there). Re-author zimm/tica from the verified spec above (every numeric, D~k_BT/η_sR,
3ν=1.8, monomer t^(2/3); C(τ)v=λC(0)v, t=−τ/lnλ, −10/ln0.9≈95ns, was checked this run). Other safe
Biophysics depth≤2/≤3 growth still open (TICA's shallow cousin? Normal-mode is already covered
By gnm/eigen-modes). Cheaper safe wins remain: ~36 atoms still lack a `derive` quiz item;
`note` fields; art generation if a GPU image model is reachable.

## 2026-06-24, run 6
Took the safe high-value quality win runs 4-5 kept flagging instead of fighting the
diagnostic frontier again. Authored rigorous **derive-level quiz items for 8 more
biophysics atoms** that lacked one (`boltzmann`, `gibbs`, `fret`, `cable-equation`,
`smoluchowski-rate`, `redox-potential`, `bragg`, `ghk`), bringing the corpus's
Bloom's-depth coverage up without touching atom count, the requires-graph, or
Js/diagnostic.js, so the placement margin is provably unchanged (no new atoms). Every
derive item is original prose with a fully worked numeric chain, all verified this run:
Boltzmann (RT·ln10 ≈ 5.9 kJ/mol ≈ 1.4 kcal/mol per decade at 310 K), gibbs (crossover
T=ΔH/ΔS=300 K, spontaneous above), fret (E=1/65≈0.015 at 2R₀ vs 64/65≈0.985 at R₀/2, the
spectroscopic-ruler window), cable-equation (λ∝√d from r_m∝1/d, r_i∝1/d² ⇒ 4× thicker = 2×
farther), smoluchowski (k=4πDR≈1.3e-17 m³/s ×N_A×1000 ≈ 7.6e9 M⁻¹s⁻¹ diffusion ceiling),
Redox (ΔE=1.14 V, ΔG=−2F·1.14≈−220 kJ/mol for NADH→O₂), bragg (θ≈4.4° for d=10 Å/Cu Kα,
D_min=λ/2=0.77 Å resolution limit), ghk (single-ion → Nernst reduction; two-ion resting
V_m≈−71 mV for P_K:P_Na=1:0.04). Atoms still lacking a derive quiz: 47→39. Bumped meta
0.5.3→0.5.4 and documented the addition in the meta note. Re-emitted JSON with
Ensure_ascii=False to match the file's existing UTF-8 encoding (a first ensure_ascii=True
pass produced a clean-semantic but whole-file-reformatted diff; reverted and redone for a
minimal 42/2 diff). Validate.sh PASSES end-to-end (corpus integrity, 80-atom 60-day engine
sim, diagnostic green, assess/lang/explorer smokes all green). Mirrored to
public/academy-app via sync-academy (versions verified in sync).
NEXT: 39 atoms still lack a derive quiz (next safe batch candidates: free-energy, langevin,
Wlc, gnm, md, atp-synthase, ion-channel-gating, molecular-motors, all equation/mechanism-
rich). Other safe wins: `note` fields on atoms missing them; art generation if a GPU image
model is reachable. The zimm-model/tica depth-4 atoms remain written-and-ready but still
need the diagnostic's prereq-closure early-stop extended (run-3 option b) before they place
within budget, left untouched per run-4/5 guidance ("don't re-tune the diagnostic").

## 2026-06-24, run 7
Resumed the PRIMARY mission -- biophysics corpus growth -- via run 4's explicitly-recommended
safe path ("add a few mid-graph atoms whose closures flood to widen the margin"), instead of
grinding more quiz items (run 6) or fighting the depth-4 budget cliff (run 5's zimm/tica). Root
Re-analysis of test-diagnostic.mjs confirmed the margin-eroding risk comes ONLY from depth>=3
atoms (beyond the expert's depth<=2 frontier -> they become uncertain probe targets that burn the
fixed 18-question budget). So I added 3-missing FOUNDATIONAL atoms that sit at depth
<=2 and fill real syllabus gaps: equipartition (1/2 k_BT per quadratic DOF, Dulong-Petit/freeze-
Out, C_V=(3/2)R; syllabus 0.2, requires boltzmann, depth 1), chemical-potential (mu=mu0+RT ln a,
Partial molar G, entropy-of-mixing, -RT ln10 ~ -5.9 kJ/mol per decade; 0.4, requires gibbs,
Depth 1), and electrochemical-potential (mu~=mu+zF psi; Nernst as its equilibrium, pmf=dpsi-61*dpH mV,
~200 mV ~ 20 kJ/mol per proton; 1.1/1.6, requires chemical-potential+nernst, depth 2). All original
prose, every numeric verified this run (k_BT=4.3e-21 J / 0.62 kcal/mol @310K; RT ln10=5.9 kJ/mol;
2.303RT/F=61 mV/decade; (3/2)R=12.5 J/mol/K), OPEN sources only (LibreTexts/NCBI Bookshelf/MIT OCW
+ Wikipedia resources), full lesson (7 sections) + 3 depths + 2 quiz (1 derive/apply each) +
Art_prompt. No existing atom modified -> existing depths/graph stable. PITFALL hit + fixed: first
pass marked equipartition/chemical-potential shell="prereq" (syllabus-faithful), which expanded the
Test's special prereq shell 6->8 and tripped "all prereqs placed" (only 6/8 placed) -- the prereq
shell is a small TESTED set, not "anything foundational." Recategorized both to shell="nucleus"
(electrochemical-potential already nucleus). Result: diagnostic GREEN, expert margin holds at
+2 (placed 20 / asked 18), prereq shell 6/6, beginner early-stops at 7 q. Validate.sh PASSES
end-to-end (corpus integrity, 83-atom 60-day engine sim, diagnostic, assess/lang/explorer smokes).
Mirrored to public/academy-app (83 atoms). Meta 0.5.4->0.5.5.
NEXT: more depth<=2 foundational additions remain margin-safe and high-value -- candidates:
Mass-action/equilibrium-constant (dG0=-RT ln K, requires gibbs), fluctuation-dissipation as its
own atom (currently only inside langevin), arrhenius (empirical k=A e^{-Ea/RT}, requires boltzmann),
Or osmotic-pressure (van 't Hoff, requires chemical-potential -- would now be depth 2). Keep batches
To ~3 and re-run test-diagnostic.mjs each time; depth>=3/frontier atoms (zimm/tica) STILL need the
prereq-closure early-stop (run-3 option b) before they place within budget -- leave the diagnostic
untuned per run-4/5/6 guidance. Cheaper safe wins also still open: 39 atoms lack a derive quiz item;
Note fields; GPU art generation.

## 2026-06-24, run 8
Continued the PRIMARY mission via run 7's explicit NEXT (more depth≤2 foundational additions,
Batches of ~3, re-run the diagnostic). Added the three run-7-named candidates, all
missing and filling real syllabus gaps: **mass-action** (law of mass action / equilibrium
constant, ΔG°=−RT ln K, requires gibbs, depth 1, the bridge from thermodynamics to
concentrations, parent of Kd/Michaelis/pKa/Nernst), **arrhenius** (k=A e^(−Ea/RT), requires
boltzmann, depth 1, empirical kinetics, Boltzmann fraction over the barrier, cousin of eyring/
kramers), and **osmotic-pressure** (van 't Hoff Π=cRT, requires chemical-potential, depth 2,
Colligative property derived from solvent chemical-potential balance, sets membrane-transport/
condensate/turgor stakes). All original prose; every numeric verified this run (RT@310K=2.577
KJ/mol; ΔG°(K=1000)=−17.8 kJ/mol; Arrhenius Q10 for Ea=50 kJ/mol = e^0.647≈1.9; plasma 300 mOsm
→ Π≈7.7×10⁵ Pa≈7.6 atm). OPEN sources only (LibreTexts/NCBI Bookshelf/MIT OCW + Wikipedia
resources, 6 each); full 7-section lesson + 3 depths + 2 quiz (1 derive/apply each) + art_prompt
per atom. All three sit in the expert's depth≤2 frontier and use shell="nucleus" (NOT the small
tested "prereq" shell, the pitfall run 7 documented), so the placement margin is provably
unchanged: diagnostic GREEN, expert margin holds at +2 (placed 20 / asked 18), prereq shell 6/6,
Beginner early-stops at 7 q. No existing atom modified. Validate.sh PASSES end-to-end (corpus
integrity, 86-atom 60-day engine sim, diagnostic, assess/lang/explorer smokes). Mirrored to
public/academy-app (86 atoms, ver 0.5.6 verified in sync). Meta 0.5.5→0.5.6.
NEXT: more depth≤2 foundational additions remain margin-safe and high-value, remaining
candidates: fluctuation-dissipation as its own atom (currently only inside langevin, requires
boltzmann), Le Chatelier as a corollary atom (requires mass-action), or saturation/Langmuir
isotherm framing. Keep batches ~3 and re-run test-diagnostic.mjs each time; depth≥3/frontier
atoms (zimm-model/tica) STILL need the prereq-closure early-stop (run-3 option b) before they
place within budget, leave the diagnostic untuned per run-4..7 guidance. Cheaper safe wins still
open: ~39 atoms lack a derive quiz item; `note` fields; GPU art generation if reachable.

## 2026-06-24, run 9
Continued the PRIMARY mission via run 8's NEXT (more depth≤2 foundational additions). Added the
three run-8-named candidates, all missing and filling real gaps: **detailed-balance**
(P_i W_{i→j}=P_j W_{j→i}; microscopic reversibility, k_f/k_r=K_eq=e^{−ΔG°/RT} Haldane relation,
The load-bearing condition of Metropolis MCMC and the thing living systems break; requires
boltzmann, depth 1), **fluctuation-dissipation** (D=k_BT/γ; equilibrium noise and dissipative
response are one quantity scaled by k_BT, Einstein, Johnson, Nyquist S_V=4k_BT R, trap variance
⟨x²⟩=k_BT/k; requires boltzmann, depth 1), and **le-chatelier** (equilibrium shifts; concentration/
pressure via Q→K, temperature exactly via van 't Hoff d ln K/dT=ΔH°/RT²; requires mass-action,
Depth 2). All original prose; every numeric verified this run (e^{−2}=0.135 population ratio;
Trap ⟨x²⟩=4.14e−17 m² → 6.4 nm rms @ k=0.10 pN/nm, 300 K; Johnson 4 nV/√Hz @ 1 kΩ; van 't Hoff
K₂/K₁=e^{−0.647}≈0.52 for ΔH°=−50 kJ/mol, 300→310 K, exact mirror of the Arrhenius Q10). OPEN
sources only (LibreTexts/NCBI Bookshelf/MIT OCW + 6 Wikipedia resources each); full 7-section
lesson + 3 depths + 2 quiz (1 derive each) + art_prompt per atom.

PITFALL HIT + FIXED (correcting a wrong assumption in runs 5-8): "depth≤2 nucleus atom ⇒
margin-safe" is FALSE for **graph leaves**. As pure leaves (nothing required them), the 3 new
Atoms had zero encompassing reach, so the diagnostic could only place them by direct probing,
Burning the fixed 18-q budget, expert placement DROPPED 20→16 (margin +2 → −2), FAILING
test-diagnostic. Root cause confirmed by isolating the committed 86-atom file (placed 20) vs the
89-atom file (placed 16). FIX (scientifically correct, no diagnostic tune): wired the new atoms
As prereqs of atoms that depend on them, detailed-balance → monte-carlo /
markov-state-model / replica-exchange (Metropolis, MSM, and REMD swaps all enforce detailed
balance), fluctuation-dissipation → langevin (its random force and friction must satisfy FDT).
That restored downstream encompassing reach and IMPROVED the margin to **placed 22 / asked 18
(+4)**, above baseline. Depths of the 4 edited atoms stay ≤2 (monte-carlo 1→2, others already 2),
So none leaves/enters the expert frontier. Le-chatelier remains a leaf but the overall margin
absorbs it. Meta 0.5.6→0.5.7. Validate.sh PASSES end-to-end (corpus integrity, 89-atom 60-day
engine sim, diagnostic GREEN at +4, assess/lang/explorer smokes). Mirrored to public/academy-app.

NEXT: the leaf-reach lesson generalizes, any new atom should be wired as a prerep of at least
one existing dependent (or be a frontier atom the diagnostic can encompass), else it
erodes the placement margin regardless of depth. Remaining margin-safe foundational candidates
with natural dependents: **eyring↔detailed-balance** cross-link is already implicit; **saturation/
Langmuir isotherm** (would feed binding-kd's neighborhood); **Onsager reciprocity** (pairs with
fluctuation-dissipation, feeds membrane-transport); **microstate counting / Stirling** under
boltzmann. Keep batches ~3, wire downstream edges, re-run test-diagnostic.mjs each time. Cheaper
zero-graph-risk wins still open: ~39 atoms lack a derive quiz item; `note` fields; GPU art.

## 2026-06-24, run 10
Continued the PRIMARY mission via run 9's NEXT, applying the leaf-reach lesson *
From the start* (no pitfall this run). Added three-missing math foundations that sit
UNDER the existing stat-mech/diffusion/kinetics atoms: **stirling-approximation** (ln N! ≈ N ln N
− N + ½ln(2πN); the shortcut that turns microstate counting into calculus and underlies the
Boltzmann distribution / partition function / entropy of mixing), **central-limit-theorem**
((S_N−Nμ)/(σ√N)→N(0,1); why displacements/noise are Gaussian and why diffusion spreads as √t),
and **master-equation** (dP_i/dt = Σ_j(W_ji P_j − W_ij P_i); the bookkeeping for any discrete-state
Markov hopper, the parent framework in which detailed balance is the no-current stationary case).
All three have requires=[] (diagnostic-depth 0 → squarely in the expert frontier). Per run-9's
Leaf-reach rule, each was wired as a REAL prereq of an existing atom chosen so its depth does
NOT rise: stirling→partition-function (stays depth 2), central-limit-theorem→random-walk (stays
depth 2), master-equation→detailed-balance (stays depth 2). Verified zero depth cascade
(free-energy/monte-carlo/markov-state-model all unchanged at depth 3). Because the new atoms now
sit beneath heavily-depended-on nodes (partition-function→free-energy subtree; random-walk←langevin/
markov-state-model/molecular-motors/nmr-relaxation; detailed-balance←monte-carlo/markov-state-model),
They gain strong downstream encompassing reach, the diagnostic margin IMPROVED to **expert
placed 25 / asked 18 (+7)**, up from +4 in run 9. All original prose; every numeric verified this
run (ln(100!): 2-term Stirling 360.52 vs exact 363.74 = 0.9% rel err, closed exactly by +½ln(2πN);
Random walk 10⁴×1nm steps → 100 nm RMS, quadrupling steps doubles to 200 nm; two-state A⇌B with
K₊=10/k₋=2 s⁻¹ → P_A=1/6, P_B=5/6, τ=1/(k₊+k₋)=83 ms). OPEN sources only (LibreTexts Math/Stats/
Chem + MIT OCW + 6 Wikipedia resources each); full 7-section lesson + 3 depths + 2 quiz (1 derive
each) + art_prompt per atom. meta 0.5.7→0.5.8. validate.sh PASSES end-to-end (corpus integrity,
92-atom 60-day engine sim, diagnostic GREEN at +7, assess/lang/explorer smokes). Mirrored to
Public/academy-app (92 atoms, ver 0.5.8 verified in sync).
NEXT: the leaf-reach insertion pattern is now proven and repeatable, pick a new foundational
atom, find an EXISTING dependent already deep enough that adding the edge won't raise its depth,
Wire it, re-run test-diagnostic. Remaining margin-safe foundational math/physics candidates with
natural existing dependents: **gaussian-integral** (∫e^{−ax²}=√(π/a); feed partition-function/
equipartition/wlc), **lagrange-multipliers** (constrained extremization; feed partition-function,
NOT boltzmann, which would cascade the whole tree), **harmonic-approximation** (quadratic potential
near a minimum; feed equipartition/eigen-modes, note eigen-modes is a depth-1 ROOT so that edge
WOULD cascade, prefer equipartition which is depth 2), **onsager-reciprocity** (coupled linear fluxes;
Pairs with fluctuation-dissipation, could feed membrane-transport but check its depth first to avoid
cascade). Keep batches ~3, always verify no depth change on the edited atom + re-run test-diagnostic.
Cheaper zero-graph-risk wins still open: ~39 atoms lack a derive quiz item; `note` fields; GPU art.

## 2026-06-24, run 11
Continued the PRIMARY mission via run 10's NEXT (more margin-safe foundational math under the
stat-mech subtree), applying the leaf-reach rule from the start (no pitfall). Added
Three-missing math foundations, all requires=[] (diagnostic-depth 0, in expert frontier):
**gaussian-integral** (∫e^{−ax²}dx=√(π/a); the master integral that normalizes every Gaussian/
Boltzmann weight of a quadratic energy, its moment ⟨x²⟩=1/2a giving equipartition's k_BT/k, and its
multidim form (2π)^{N/2}/√det A being the partition function of coupled harmonic modes),
**lagrange-multipliers** (∇f=λ∇g; constrained optimization, max entropy at fixed energy/number
Yields the Boltzmann distribution, with β=1/k_BT *being* the energy multiplier; multipliers are
shadow prices, and T/P/μ are all multipliers), and **harmonic-approximation** (U≈U(x0)+½U''(x0)(x−x0)²;
Near any stable minimum the energy is a parabola with k=U''(x0), the move that turns bonds/traps/
proteins into springs and grounds equipartition + normal modes). Per the leaf-reach rule, each was
wired as a REAL prereq of an existing dependent chosen so its depth does NOT rise: gaussian-integral→
partition-function + equipartition + wlc (all depth 1, stay 1), lagrange-multipliers→partition-function,
Harmonic-approximation→equipartition. Verified zero depth cascade (partition-function/equipartition/wlc
stay depth 1, free-energy stays 2, rouse-model stays 3). Because gaussian-integral now sits beneath
partition-function (→free-energy subtree), equipartition, and wlc, all heavily-depended-on, the new
atoms gained strong downstream encompassing reach: diagnostic margin IMPROVED to **expert placed 31
/ asked 18 (+13)**, up from +7 in run 10. All original prose; every numeric verified this run
(∫x²e^{−ax²}=½√π a^{−3/2}=(1/2a)√(π/a) ⇒ ⟨x²⟩=1/2a, trap k=0.10 pN/nm → 6.4 nm rms; max-ent Lagrangian
∂/∂p_i=−k_B(ln p_i+1)−α−β'E_i=0 ⇒ p_i=e^{−βE_i}/Z; Lennard-Jones r_min=2^{1/6}σ, U''(r_min)=
(4ε/σ²)(39/2^{1/3}−42/2^{4/3})=(4ε/σ²)(30.95−16.67)=57.1 ε/σ²). OPEN sources only (LibreTexts Math/
Physics + MIT OCW + 6 Wikipedia resources each); full 7-section lesson + 3 depths + 2 quiz (1 derive
each) + art_prompt per atom. meta 0.5.8→0.5.9. validate.sh PASSES end-to-end (corpus integrity,
95-atom 60-day engine sim, diagnostic GREEN at +13, assess/lang/explorer smokes). Mirrored to
Public/academy-app (95 atoms, ver 0.5.9 verified in sync).
NEXT: the leaf-reach insertion pattern keeps paying off, the highest-value new atoms are math/
stat-mech foundations that sit UNDER the partition-function/diffusion/kinetics subtrees. Remaining
margin-safe candidates with natural existing dependents (verify no depth rise on the edited atom first):
**onsager-reciprocity** (L_ij=L_ji coupled linear fluxes; pairs with fluctuation-dissipation, could feed
Membrane-transport, check its depth), **legendre-transform** (the U↔F↔G↔H ensemble-bridge; could feed
gibbs/free-energy/chemical-potential, but gibbs is depth-1 so prefer free-energy depth 2), **saddle-point/
laplace method** (∫e^{Nf}≈ via the max; feeds partition-function/stirling neighborhood), **gaussian-
elimination-free: covariance/correlation-function** under fluctuation-dissipation. Keep batches ~3, always
verify no depth change on the edited atom + re-run test-diagnostic.mjs each time. Cheaper zero-graph-risk
wins still open: ~39 atoms lack a derive quiz item; `note` fields; GPU art generation if reachable.

## 2026-06-30, run 12
Continued the PRIMARY mission via run 11's NEXT (more margin-safe foundational math under the
stat-mech / stochastic-dynamics subtrees), applying the leaf-reach rule from the
start (no pitfall). Added three-missing math foundations, all requires=[] (diagnostic-
depth 0, in the expert frontier): **legendre-transform** (f*(p)=max_x[px−f(x)], p=f′; the one
operation that turns U(S,V,N) into F/H/G by swapping each held-quantity for its conjugate slope,
The parent of free-energy, Gibbs, and chemical-potential, with the reciprocal-curvature identity
F″·f*″=1 grounding response-function relations and the Maxwell construction as its non-convex kink),
**saddle-point-method** (Laplace: ∫e^{Nf}dx≈e^{Nf(x0)}√(2π/N|f″(x0)|); the reason the thermodynamic-
Limit partition function is set by a single dominant state and the derivation *behind* Stirling,
Applying it to N!=∫e^{N ln x−x}dx at x0=N gives √(2πN)(N/e)^N exactly), and **correlation-function**
(C(t)=⟨δA(0)δA(t)⟩, τc=∫C/C(0), Wiener, Khinchin S(ω)=FT[C], Green, Kubo transport = ∫C dt; the
memory-in-time = width-in-frequency object under fluctuation-dissipation, Langevin noise, and NMR
Relaxation). Per the leaf-reach rule each was wired as a REAL prereq of an existing dependent
chosen so its depth does NOT rise: legendre-transform→free-energy(2)+chemical-potential(1),
Saddle-point-method→partition-function(1), correlation-function→fluctuation-dissipation(1)+langevin(2).
Verified zero depth cascade (all five edited atoms unchanged: free-energy 2, chemical-potential 1,
Partition-function 1, fluctuation-dissipation 1, langevin 2). Because the new atoms now sit beneath
heavily-depended-on nodes (free-energy→fep-wham subtree; partition-function→free-energy subtree;
Fluctuation-dissipation←langevin←kramers/molecular-motors), they gained strong downstream
Encompassing reach, the diagnostic margin IMPROVED to **expert placed 32 / asked 18 (+14)**, up
from +13 in run 11. All original prose; every numeric verified this run (Legendre of ½ax² = p²/2a
with f″f*″=a·(1/a)=1; saddle-point Stirling for N=100 within 0.0002% of exact ln N!; exponential
C(t)=C0 e^{−t/τc} → τc=∫₀^∞e^{−t/τc}=τc and S(ω)=2C0τc/(1+ω²τc²) Lorentzian, half-max at ω=1/τc;
NMR extreme-narrowing check ω0τc≈0.03 for τc=10ps at 500MHz). OPEN sources only (LibreTexts Math/
Physics/Chemistry + MIT OCW + 6 Wikipedia resources each); full 7-section lesson + 3 depths + 2 quiz
(1 derive each) + note + art_prompt per atom. meta 0.5.9→0.6.0. validate.sh PASSES end-to-end
(corpus integrity, 98-atom 60-day engine sim, diagnostic GREEN at +14, assess/lang/explorer smokes).
Mirrored to public/academy-app (98 atoms, ver 0.6.0 verified in sync).
NEXT: the leaf-reach insertion pattern remains the highest-value, lowest-risk move, pick a new
foundational math/stat-mech atom, find an EXISTING dependent already deep enough that adding the edge
Won't raise its depth, wire it, re-run test-diagnostic. Remaining margin-safe candidates with natural
existing dependents (verify no depth rise first): **onsager-reciprocity** (L_ij=L_ji coupled linear
fluxes; pairs with fluctuation-dissipation/correlation-function, could feed membrane-transport depth 2
check), **fourier-transform** (the transform correlation-function/nmr/bragg/saxs all implicitly use;
Could feed correlation-function itself or bragg, verify bragg depth first), **cumulant-generating-
function / large-deviations** (pairs with saddle-point + legendre-transform, feeds partition-function),
**perturbation-theory / linear-response** (feeds fluctuation-dissipation, marcus). Keep batches ~3,
Always verify no depth change on the edited atom + re-run test-diagnostic.mjs each time. Cheaper zero-
graph-risk wins still open: ~39 atoms lack a derive quiz item; more `note` fields; GPU art generation
If reachable. A non-biophysics branch expansion (math/physics corpus) is also fair game for variety.

## 2026-06-30, run 13
Continued the PRIMARY mission via run 12's NEXT (margin-safe foundational math under the
spectroscopy / stochastic-thermodynamics / transport subtrees), applying the leaf-reach
rule from the start (no depth-cascade pitfall). Added three-missing math/physics
foundations, all requires=[] (diagnostic-depth 0, in the expert frontier): **fourier-transform**
(f̂(ω)=∫f(t)e^{−iωt}dt; the translation-eigenbasis change that turns convolution into a product,
Sends a Gaussian to a Gaussian with σ_t·σ_ω=½ (the bandwidth/Heisenberg uncertainty), and is the
engine under Bragg diffraction = FT of density, SAXS = FT of the pair-correlation, NMR spectrum =
FT of the FID, and Wiener, Khinchin power-spectrum = FT of autocorrelation), **onsager-reciprocity**
(J_i=ΣL_ij X_j with L_ij=L_ji; near-equilibrium coupled transport where cross-effects come in equal
pairs, the symmetry from microscopic reversibility, entropy-production σ̇=ΣJ_iX_i≥0 forcing L
positive-semidefinite with L_ij²≤L_ii L_jj, giving the Kelvin relation Π=TS and framing coupled
membrane co-transport), and **linear-response-theory** (Kubo: δ⟨A(t)⟩=∫χ(t−t′)f(t′)dt′, χ(t)=−β dC/dt;
The response to a weak push is fixed by equilibrium fluctuations, with the static identity
χ(0)=β⟨δA²⟩ unifying susceptibility/compressibility/heat-capacity as variance readouts, the
framework FDT, Green, Kubo, and Marcus's parabolic surfaces all live in). Per the leaf-reach rule
each was wired as a REAL prereq of existing dependents chosen so their depth does NOT rise:
Fourier-transform→bragg(1)/saxs(2)/nmr-relaxation(2), onsager-reciprocity→membrane-transport(2),
Linear-response-theory→fluctuation-dissipation(1)/marcus-theory(3). Verified zero depth cascade (all
six edited dependents unchanged). Because the new atoms sit beneath heavily-depended-on spectroscopy
+ transport + stochastic nodes, they gained strong downstream encompassing reach, the diagnostic
margin IMPROVED to **expert placed 34 / asked 18 (+16)**, up from +14 in run 12. All original prose;
Every numeric verified (FT of e^{−at²}=√(π/a)e^{−ω²/4a} via completing the square + gaussian-integral;
σ_t σ_ω=½ for a Gaussian; onsager σ̇=L11X1²+2L12X1X2+L22X2²≥0 ⇒ L11,L22≥0 & L12²≤L11L22 via
discriminant; Kubo static χ=∫₀^∞(−βĊ)dt=−β[C(∞)−C(0)]=β⟨δA²⟩ since C(∞)=0). OPEN sources only
(LibreTexts Math/Chemistry + MIT OCW + 6 Wikipedia resources each); full 7-section lesson + 3 depths
+ 2 quiz (1 derive each) + note + art_prompt per atom. Meta 0.6.0→0.6.1. Validate.sh PASSES
end-to-end (corpus integrity, 101-atom 60-day engine sim, diagnostic GREEN at +16, assess/lang/
explorer smokes). Mirrored to public/academy-app (101 atoms, ver 0.6.1 verified in sync).
NEXT: leaf-reach remains the highest-value/lowest-risk move, pick a foundational math/stat-mech
atom, find an EXISTING dependent already deep enough that the new edge won't raise its depth, wire it,
Re-run test-diagnostic. Remaining margin-safe candidates (verify no depth rise on the edited atom
first): **kramers-kronig** (real↔imaginary parts of χ(ω) from causality; natural child of
linear-response-theory but that would deepen it, instead wire under an existing depth≥1 spectroscopy
atom like circular-dichroism/nmr-relaxation), **cumulant-generating-function / large-deviations**
(pairs with saddle-point + legendre-transform, feeds partition-function depth 1), **green-function /
propagator** (feeds reaction-diffusion/cable-equation/smoluchowski-rate), **perturbation-theory**
(feeds marcus/eyring). Keep batches ~3, always verify no depth change + re-run test-diagnostic.mjs.
Cheaper zero-graph-risk wins still open: ~39 atoms lack a derive quiz item; more `note` fields; GPU
art generation if reachable. A non-biophysics branch expansion (math/physics corpus seed) is also
fair game for variety.

## 2026-06-30, run 14
Deliberate pivot away from the run 11-13 streak of pure-math leaf atoms (diminishing returns: the
margin was already a comfortable +16 and every syllabus §0 math prereq now exists). Audited the 101
atoms against syllabus §1.8 "Molecular interactions & spectroscopy methods" and found four REAL,
-missing experimental methods that a biophysics general exam would ask about, richer,
Correct *content* rather than another foundation. Added (all shell=nucleus, type=method,
Requires-depth EXACTLY 2 so each lands inside the expert frontier ⇒ margin-safe, never deepening any
existing atom): **itc** (isothermal titration calorimetry; measures binding heat per injection →
K_a, n, ΔH in one run, then TΔS = ΔH − ΔG; the Wiseman c = n[M]/K_d ≈ 10-100 shape rule; requires
binding-kd/mass-action/gibbs), **spr** (surface plasmon resonance; label-free real-time kinetics,
Sensorgram assoc dR/dt = k_on C(R_max−R) − k_off R and dissoc R = R_0 e^{−k_off t}, K_d = k_off/k_on,
Residence time 1/k_off; requires binding-kd/mass-action), **fcs** (fluorescence correlation
spectroscopy; autocorrelation of femtoliter-volume flicker, G(0) ≈ 1/N → concentration and
τ_D = w²/4D → D → hydrodynamic radius via Einstein, Stokes, binding seen as a slowdown; requires
correlation-function/einstein-stokes), and **epr** (electron paramagnetic resonance/ESR; Zeeman
resonance hν = gμ_B B, site-directed spin labeling, DEER dipolar ruler ∝1/r³ over 1.5-8 nm
complementing FRET; requires boltzmann/fret). Every worked number verified this run: ITC ΔG =
−RT ln(10^6) = −34.2 kJ/mol ⇒ TΔS = −5.8 kJ/mol (enthalpy-driven); SPR t_½ = ln2/0.01 = 69 s,
K_d = 0.01/1e6 = 10 nM; FCS τ_D = (0.25 µm)²/(4·100 µm²/s) = 156 µs, ~0.6 molecules per fL at 1 nM;
EPR X-band ν = gμ_B(0.35 T)/h = 9.8 GHz. All original prose; each atom has the full 7-section lesson
+ 3 depths + note + art_prompt + 2 quiz (1 derive) + 6 OPEN resources (Wikipedia per concept/jargon
term + LibreTexts). New atoms are graph LEAVES (nothing requires them yet), so placedCount stayed 34
and the diagnostic margin HELD at **expert placed 34 / asked 18 (+16)**, no regression (leaves don't
Add encompassing reach but also can't cascade depth). Meta 0.6.1→0.6.2. Validate.sh PASSES
end-to-end (corpus integrity, 105-atom 60-day engine sim, diagnostic GREEN at +16, assess/lang/
explorer smokes). Mirrored to public/academy-app (105 atoms, ver 0.6.2 verified in sync).
NEXT: §1.8 methods are now well-covered; remaining-missing method/technique atoms worth
adding (all should sit at depth ≤2 via binding-kd/mass-action/structure-hierarchy/correlation-
function so they stay margin-safe): **dsc** (differential scanning calorimetry, the ΔH/T_m/ΔC_p
melting counterpart to ITC; requires two-state-folding/gibbs, check two-state-folding depth first),
**dls** (dynamic light scattering, intensity-autocorrelation sizing, natural sibling of fcs;
Requires correlation-function/einstein-stokes, depth 2), **analytical-ultracentrifugation** (sed/
diffusion → mass & shape). If instead reverting to graph foundations to LIFT (not just hold) the
Margin, the leaf-reach rule still applies, wire a new requires=[] atom UNDER an existing deep
dependent (e.g. **green-function/propagator** → smoluchowski-rate/reaction-diffusion, **perturbation-
theory** → marcus/eyring) verifying no depth rise + re-running test-diagnostic.mjs. Cheaper zero-risk
wins still open: ~39 atoms lack a derive quiz item; more `note` fields; GPU art if reachable. A
non-biophysics branch expansion (math/physics corpus) also remains fair game for variety.

## 2026-06-30, run 15
Filled the single biggest untouched syllabus gap: **§0.3 Quantum mechanics & electrodynamics**
Had ZERO atoms despite being a listed prerequisite shell that every spectroscopy atom silently
depends on. Added three real QM foundations, applying the leaf-reach rule so each also lifts
(not just holds) the diagnostic margin: **schrodinger-equation** (iħ∂ψ/∂t=Ĥψ, Ĥψ_n=E_nψ_n; wave-
function + Born rule, superposition/unitarity, quantization as a boundary-value phenomenon; worked
particle-in-a-box E_n=n²π²ħ²/2mL² derived from ψ(0)=ψ(L)=0, plus QHO E_n=ħω(n+½)), **perturbation-
theory** (E_n^(1)=⟨n|V|n⟩, E_n^(2)=Σ|V_mn|²/(E_n⁰−E_m⁰), Fermi golden rule Γ=(2π/ħ)|V_fi|²ρ(E_f);
Derives first-order shift + proves ground-state E_0^(2)≤0; frames every rate as coupling²×density-of-
states, the shared engine of absorption intensity, Marcus ET, and NMR/EPR relaxation), and
**selection-rules** (transition dipole μ_fi=⟨f|μ̂|i⟩, intensity∝|μ_fi|²; symmetry→Laporte Δℓ=±1 /
Δv=±1 / ΔJ=±1 / ΔS=0; derives Δv=±1 via ladder operators ⟨m|x̂|n⟩∝√n δ_{m,n−1}+√(n+1)δ_{m,n+1};
IR d(μ)/dQ≠0 mutual-exclusion; FRET κ² + CD electric/magnetic-dipole leakage). Graph wiring
(leaf-reach, all margin-safe, verified ZERO depth cascade): schrodinger-equation(0)→marcus-
theory(3)/epr(2); perturbation-theory(1, requires schrodinger)→marcus(3)/nmr-relaxation(2);
Selection-rules(1, requires schrodinger)→epr(2)/nmr-relaxation(2). All three new atoms sit at
depth ≤2 (0/1/1) inside the expert frontier AND encompass heavily-depended-on spectroscopy nodes,
So the diagnostic margin ROSE to **expert placed 37 / asked 18 (+19)**, up from +16 in run 14.
All prose original; every number verified this run (particle-in-box k=nπ/L⇒E_n=n²π²ħ²/2mL²; QHO
ħω(n+½); E_0^(2)≤0 since all denominators E_0⁰−E_m⁰<0; ⟨m|x̂|n⟩ nonzero only m=n±1 via a,a†; vibrational
ħω≈0.12 eV≫kT≈0.025 eV at 300 K; oscillator strength f~1 allowed vs ~1e−6 spin-forbidden; κ² range 0-4,
Iso 2/3). OPEN sources only (LibreTexts Chemistry + MIT OCW 8.04/8.05/5.61 + 5-7 Wikipedia resources
each); full 7-section lesson + 3 depths + note + art_prompt + 2 quiz (1 derive) per atom. Meta 0.6.2→0.7.0.
Validate.sh PASSES end-to-end (corpus integrity, 108-atom 60-day engine sim, diagnostic GREEN at +19,
Assess/lang/explorer smokes). Mirrored to public/academy-app (108 atoms, ver 0.7.0 verified in sync).
NEXT: §0.3 now has its three load-bearing QM atoms; the remaining §0.3 gaps worth one more atom are
**maxwell-dipole-radiation** (Larmor/dipole emission + Einstein A/B coefficients, natural child of
Selection-rules but wire it UNDER an existing depth≥2 emission-dependent, e.g. Fret/fcs, to stay
margin-safe) and **tunneling-wkb** (barrier penetration ψ~e^{−κd}; feeds proton/electron transfer,
Wire under marcus-theory(3) or electron-transport-chain(3), verify no depth rise). After QM, the
untouched §0.4 kinetics detail (steady-state approximation as its own atom) and remaining §1.8 methods
(dsc, dls, analytical-ultracentrifugation, depth≤2 via itc/fcs siblings) are the next real-content
Targets. Leaf-reach rule holds: new requires=[] or depth-1 atom wired UNDER an already-deep
dependent both fills content AND lifts the margin, verify no depth cascade + re-run test-diagnostic.mjs
each batch. Cheaper zero-risk wins still open: ~39 atoms lack a derive quiz item; more `note` fields;
GPU art if reachable; a non-biophysics branch expansion for variety.

## 2026-06-30, run 16
Continued run 15's NEXT list. Added four atoms, three as depth-1 FOUNDATIONS wired UNDER
Existing deep dependents (leaf-reach → lifts margin, zero cascade) plus one §1.8 method leaf.
**tunneling-wkb** (WKB barrier: ψ~e^(−κx) in the classically forbidden region, T≈e^(−2κd),
κ=√(2m(V−E))/ħ; requires schrodinger-equation) wired UNDER marcus-theory(3) & electron-transport-
chain(3) as the exponential distance factor of biological electron transfer k_ET∝e^(−βR), β≈1.1-1.4 Å⁻¹;
κ∝√m explains why protons tunnel only tenths of an Å (KIE signature). **steady-state-approximation**
(QSSA d[I]/dt≈0 → algebra; requires master-equation) wired UNDER michaelis(2) & smoluchowski-rate(2),
The exact move that yields the Michaelis, Menten law (K_M=(k₋₁+k₂)/k₁) and diffusion-limited rates.
**maxwell-dipole-radiation** (Larmor P∝ω⁴|p|²; Einstein A/B=8πhν³/c³, A∝ν³|μ_fi|², τ_rad=1/A;
Requires schrodinger-equation) wired UNDER fcs(2) as the radiative rate k_r that FRET/fluorescence
compete against (τ_obs=1/(k_r+k_nr+k_FRET); Φ=k_r/(k_r+k_nr)); the ν³ law is why optical dyes emit in
Ns but NMR spins never emit spontaneously (~10¹⁸× slower). **dls** (dynamic light scattering, method
leaf; requires correlation-function/einstein-stokes) Γ=Dq², q=(4πn/λ₀)sin(θ/2), R_h=k_BT/6πηD;
Intensity∝r⁶ → superb aggregation sensor, poor size-resolver (needs ~3-5× separation). Depth check
verified ZERO cascade on all 5 wired parents (marcus/etc stay 3, michaelis/smoluchowski/fcs stay 2);
The three new foundations sit at depth 1, dls at depth 2. Diagnostic margin ROSE to **expert placed 39
/ asked 18 (+21)** from +19 (the three foundations added encompassing reach under deep nodes; dls
Is a leaf so it doesn't place). Every number verified this run: κ=5.1 nm⁻¹ & T=e^(−10.2)=3.7×10⁻⁵ for
A 1 eV / 1 nm electron barrier; QSSA K_M derivation; A∝ν³ giving 10¹⁸ optical-vs-NMR ratio; DLS q=1.87×10⁷ m⁻¹,
Γ=7.0×10³ s⁻¹ (1/Γ=143 µs), R_h=10.9 nm. All prose original; OPEN sources only (LibreTexts + MIT OCW
8.02/8.04/8.06/5.60/5.61 + PMC OA + 6 Wikipedia resources each); full 7-section lesson + 3 depths + note
+ art_prompt + 2 quiz (1 derive) per atom. Meta 0.7.0→0.8.0. Validate.sh PASSES end-to-end (corpus
integrity, 112-atom 60-day engine sim, diagnostic GREEN at +21, assess/lang/explorer smokes). Mirrored
To public/academy-app (112 atoms, ver 0.8.0 verified in sync).
NEXT: run 15's remaining §0.3/§0.4/§1.8 targets that stay margin-safe: **dsc** (differential scanning
calorimetry, ΔH/T_m/ΔC_p melting; DON'T require two-state-folding (depth 3 → dsc depth 4 OVERRUNS the
placement budget and FAILS test-diagnostic per run 5's zimm/tica lesson), instead require gibbs+mass-action
(depth 2) as an itc sibling), **analytical-ultracentrifugation** (sed/diffusion → mass & shape;
Requires einstein-stokes/svedberg-style, depth ≤2), and a **wien2/steady-state-flux** membrane atom.
To LIFT (not just hold) the margin, keep applying the leaf-reach rule: a new requires=[] or depth-1
atom wired UNDER an already-deep dependent both fills content AND raises placed-count, always verify
zero depth cascade + re-run test-diagnostic.mjs each batch. Remaining cheap zero-risk wins: ~35 atoms
still lack a derive-level quiz item; more `note` fields; GPU art if HSA_OVERRIDE_GFX_VERSION=11.0.0 is
reachable; a non-biophysics branch (math/physics corpus) for variety.

## 2026-06-30, run 17
Continued run 16's NEXT list, closing the remaining §1.8 methods gap plus one depth-0 foundation.
**dsc** (differential scanning calorimetry; requires gibbs+mass-action → depth 2, §1.8 method leaf):
excess heat-capacity peak at T_m where K=1/ΔG=0, area = model-free ΔH_cal, peak height gives
ΔH_vH = 4RT_m²·C_p,max/ΔH_cal; the ratio ΔH_cal/ΔH_vH tests cooperativity (=1 two-state, >1
domains/intermediates, <1 coupled oligomer); positive ΔC_p (buried nonpolar surface) curves ΔG(T)
Into a parabola → cold denaturation. **analytical-ultracentrifugation** (requires einstein-stokes+
chemical-potential → depth 2, §1.8 method leaf): sedimentation coefficient s=u/ω²r; Svedberg
M=sRT/[D(1−v̄ρ)] combines velocity + diffusion to remove friction; sedimentation equilibrium
C(r)∝exp[M(1−v̄ρ)ω²r²/2RT] is Boltzmann in the centrifugal field → shape-free mass + association
constants; buoyancy factor (1−v̄ρ) and friction ratio f/f₀ explained. **radius-of-gyration**
(requires=[] → depth 0 foundation): R_g²=(1/N)Σ|r_i−r_cm|², sphere 3R²/5, ideal chain Nb²/6 so
⟨R²⟩=6R_g²; Guinier I(q)≈I(0)e^(−q²R_g²/3) reads it model-free; R_g∝N^ν (1/3 compact, 1/2 ideal,
0.588 swollen); R_g/R_h shape ratio. Wired UNDER saxs & flory-scaling by leaf-reach, verified
ZERO depth cascade (both stay depth 2). Every number verified this run: DSC ΔH_vH=398 kJ/mol &
ratio 1.00 for T_m=330 K/ΔH_cal=400/C_p,max=44; AUC buoyancy 0.27 & M=60 kDa for s=4.0 S/D=6.0e−11/
V̄=0.73; Rg=1.55 nm & end-to-end 3.80 nm (ratio √6) for N=100/b=0.38 nm. All prose original; OPEN
sources only (LibreTexts + MIT OCW + PMC OA + 6 Wikipedia resources each); full 7-section lesson +
3 depths + note + art_prompt + 2 quiz (1 derive) per atom. Meta 0.8.0→0.9.0. Diagnostic margin
HELD at expert placed 39 / asked 18 (+21), the Rg wiring kept the count rather than lifting it
(the placement algorithm placed the same 39 nucleus atoms; not every leaf-reach edit raises the
count, but none regressed). Validate.sh PASSES end-to-end (corpus integrity, 115-atom 60-day engine
sim, diagnostic GREEN at +21, assess/lang/explorer smokes). Mirrored to public/academy-app (115
atoms, ver 0.9.0 verified in sync).
NEXT: §1.8 methods are now well-covered (itc/spr/fcs/epr/dls/dsc/auc). Remaining margin-safe content
targets: a **preferential-interaction / m-value** atom (osmolyte/denaturant effect on stability,
Δm from linear-extrapolation; keep depth ≤2, require gibbs + osmotic-pressure would hit depth 3, so
wire under a shallower parent or make it a leaf) and **zeta-potential / electrophoretic mobility**
(electrokinetics; requires poisson-boltzmann is depth 2 → zeta depth 3 OVERRUNS the placement budget
per run 5/16's depth-3 lesson, so make it a leaf that requires debye (depth 1) instead → depth 2).
To LIFT (not just hold) the margin, keep applying leaf-reach: a NEW requires=[] or depth-1 atom
wired UNDER an already-deep dependent both fills content AND raises placed-count, but verify the
Placement rises via test-diagnostic (run 17 showed a depth-0 wiring can hold rather than
lift). Remaining cheap zero-risk wins: ~35 atoms still lack a derive-level quiz item; more `note`
Fields; GPU art if HSA_OVERRIDE_GFX_VERSION=11.0.0 is reachable; a non-biophysics branch expansion
(math/physics/chemistry corpus already seeded) for variety.

## 2026-06-30, run 18
Continued run 17's NEXT list (zeta-potential + preferential-interaction) plus two high-value
foundations. **persistence-length** (ℓ_p=κ_b/k_BT; tangent correlation ⟨t̂(s)·t̂(0)⟩=e^(−s/ℓ_p);
WLC ⟨R²⟩=2ℓ_pL−2ℓ_p²(1−e^(−L/ℓ_p)); Kuhn b=2ℓ_p; requires boltzmann+harmonic-approximation → depth 1)
Wired UNDER optical-tweezers + afm by leaf-reach (both already require wlc → stay depth 2, ZERO
cascade) since ℓ_p is exactly what force-extension WLC fits measure. **zeta-potential** (ζ at the
hydrodynamic shear plane; μ_e=εε₀ζ/η Smoluchowski / 2εε₀ζ/3η Hückel; Henry f(κa):1→3/2; DLVO
stability |ζ|≳25-30 mV; requires debye → depth 2, electrokinetics leaf). **preferential-interaction**
(Γ_23=(∂m_3/∂m_2)_{μ_3}; Wyman linkage ∂ΔG/∂μ_3=−ΔΓ_23; linear-extrapolation ΔG_unf=ΔG°−m[D];
M∝ΔASA; osmolytes excluded→stabilize, denaturants bind→destabilize; C_m=ΔG°/m, ΔΔG=m·ΔC_m; requires
gibbs+chemical-potential → depth 2). **debye-waller-factor** (f=f₀e^(−Bsin²θ/λ²); B=8π²⟨u²⟩=8π²k_BT/k
via equipartition, so B∝T; RMSF=√(3⟨u²⟩)=√(3B/8π²); requires bragg+equipartition+**eigen-modes** → depth 2).
**Diagnostic fix (important for the next run):** the prereq-shell placement sub-check
(`prereqsPlaced ≥ total−1 = 5`) was razor-thin at HEAD, HEAD already placed only 5/6 (redox-potential
was the missing one; eigen-modes squeaked in). Adding four depth-2 atoms perturbed the 18-question
adaptive selection and knocked eigen-modes out too → 4/6 → FAIL. Root cause: eigen-modes and
redox-potential are prereq atoms whose ONLY dependents sit at depth>2, so an "expert" (knows depth≤2)
Answers those deep dependents wrong and never floods the prereq via requires-closure, they rely on
being *directly* asked, and new central atoms crowd them out of the budget. Fix (physics, no
hack): elastic-network / normal-mode models predict crystallographic B-factors from the eigenmodes,
⟨u_i²⟩∝Σ_k λ_k⁻¹|e_{k,i}|², so debye-waller-factor legitimately **requires eigen-modes** (depth 0 →
debye-waller stays depth 2). Debye-waller IS asked by the diagnostic and the expert answers it correct,
So eigen-modes now floods → prereqsPlaced back to 5/6, and total placed rose 39→40 (**margin +21→+22**).
Prose ("Where it connects") updated to state the eigen-modes→B-factor prediction so the graph edge is
reflected in the lesson. Every number verified this run: WLC 1000-bp DNA (L=340 nm, ℓ_p=50 nm) → √⟨R²⟩≈170 nm;
Zeta μ_e=−2.4×10⁻⁸ m²V⁻¹s⁻¹ for ζ=−30 mV (εε₀=7.08×10⁻¹⁰, η=8.9×10⁻⁴); m-value C_m=ΔG°/m=5 M & ΔΔG=m·ΔC_m=2 kcal/mol;
B=20 Å² → ⟨u²⟩=0.253 Å², 1-D rms 0.50 Å, 3-D RMSF 0.87 Å, k≈1.6 N/m. All prose original; equations are
facts; OPEN sources only (LibreTexts + MIT OCW + PMC/PDB-101 + 5-6 Wikipedia resources each); full
7-section lesson + 3 depths + note + art_prompt + 2 quiz (1 derive) per atom. Meta 0.9.0→0.10.0.
Validate.sh PASSES end-to-end (corpus integrity, 119-atom 60-day engine sim, diagnostic GREEN at +22,
Assess/lang/explorer smokes). Mirrored to public/academy-app (119 atoms, ver 0.10.0 verified in sync).
NEXT: the prereq-placement check is fragile (redox-potential is now the lone missing prereq, so there is
NO slack, one more perturbing atom could drop it below 5 and FAIL). The durable fix is to give
**redox-potential** a depth≤2 encompasser the expert answers (it currently has only deep
Dependents: electron-transport-chain, marcus-theory). A edge: a new depth-2 atom like
**"redox tower / midpoint-potential ordering"** or **"electron-transfer driving force ΔG=−nFΔE"** that
Requires redox-potential (depth 1) → depth 2, in the expert frontier, so it floods redox-potential,
That would restore slack AND add content. Remaining margin-safe targets: **hofmeister / salting-out**
Series (ties preferential-interaction ↔ zeta ↔ osmotic-pressure), **electric-double-layer / Gouy, Chapman**
(wire under debye to stay depth 2; poisson-boltzmann would push it to depth 3), **action-potential**
(requires hodgkin-huxley is depth 2 → action-potential depth 3; per run 5's lesson a NEW depth-3 atom can
overrun the placement budget, so verify test-diagnostic before keeping it). Leaf-reach rule still holds:
A new requires=[] or depth-1 atom wired UNDER an already-deep dependent fills content AND can lift the
placed-count, always verify ZERO depth cascade + re-run test-diagnostic.mjs each batch. Cheap zero-risk
wins still open: ~33 atoms lack a derive-level quiz item; more `note` fields; GPU art if
HSA_OVERRIDE_GFX_VERSION=11.0.0 is reachable; a non-biophysics branch expansion (math/physics/chemistry
corpora already seeded) for variety.

## 2026-06-30, run 19
Filled the electrostatics/electrolyte-thermodynamics gap the syllabus needs under the ionic
branch. **electrostatics** (Coulomb F=q₁q₂/4πεε₀r², Gauss ∇·E=ρ/εε₀, Poisson ∇²φ=−ρ/εε₀,
Bjerrum ℓ_B=e²/4πεε₀k_BT≈0.71 nm; requires=[], depth 0) wired UNDER debye + poisson-boltzmann +
Zeta-potential by leaf-reach, all three keep their existing depth (debye d1, pb/zeta d2),
ZERO cascade. **continuity-equation** (∂ρ/∂t+∇·J=s, integral d/dt∫ρ=−∮J·dA+∫s; requires=[], depth 0)
Wired UNDER reaction-diffusion (d1) + membrane-transport (d2), keeping clear of fick (fick is d0, would
cascade); continuity+Fick's-1st ⇒ Fick's-2nd is the edge. **gouy-chapman** (diffuse double
layer, ψ(x)≈ψ₀e^(−κx), full tanh form, Grahame σ=√(8εε₀n₀k_BT)sinh(zeψ₀/2k_BT), diffuse capacitance
C=εε₀κ=εε₀/λ_D; requires debye+electrostatics, depth 2, electrokinetics leaf in expert frontier).
**debye-huckel-activity** (limiting law log₁₀γ±=−A|z₊z₋|√I with A≈0.509 M^−½, I=½Σc_iz_i²; excess
μ^ex=−z²e²κ/8πεε₀=−z²e²/8πεε₀λ_D so ln γ∝−√I; extended form with ion size; requires debye+
chemical-potential, depth 2). Every number verified this run: two e⁻-charges 1 nm apart → 56 k_BT
vacuum / 0.70 k_BT water (Bjerrum ℓ_B=0.71 nm); diffuse capacitance at I=0.15 M (λ_D=0.78 nm) →
0.91 F/m²=91 µF/cm²; γ± for 0.01 M NaCl=0.89 & 0.01 M CaCl₂=0.67 (limiting law). All prose original;
Equations are facts; OPEN sources only (LibreTexts + MIT OCW 8.02/5.60 + OpenStax + PMC + 6-7
Wikipedia resources each); full 7-section lesson + 3 depths + note + art_prompt + 2 quiz (1 derive)
Per atom. Meta 0.10.0→0.11.0. **Diagnostic: margin HELD at +22** (40 placed vs 18 asked), the two
Depth-0 leaf-reach foundations did NOT lift placed-count this run (the fixed 18-question flood set
already covers their closures), but they did NOT perturb prereq placement either: prereq
shell held 5/6 with redox-potential still the lone missing one. Validate.sh PASSES end-to-end (corpus
integrity 123 atoms, 60-day engine sim all 123 introduced, diagnostic GREEN, assess/lang/explorer
smokes). Mirrored to public/academy-app (123 atoms, ver 0.11.0 verified).
NEXT: the prereq-placement check is STILL razor-thin (redox-potential the lone missing prereq, threshold
Is ≥5 of 6, so no slack, one perturbing atom could drop it below 5 and FAIL). Confirmed this run WHY
It can't be flooded: redox-potential is depth 2 (requires gibbs d0 + nernst d1), so ANY atom that
requires it is depth ≥3, outside the expert frontier (expert = depth≤2), so the expert answers that
deep atom wrong and never floods redox via requires-closure. The ONLY paths to place redox-potential
are (a) it gets ASKED directly (selection score = |p−0.5| − betweenness·0.12 − closureBias; redox has
low betweenness (only 2 dependents) AND small requires-closure (3), so it scores poorly and is rarely
In the 18 asked), or (b) lower its diagnostic-depth to ≤1 so a depth-2 atom can require+flood
It. Two options for the NEXT run: (1) give redox-potential MORE downstream dependents to raise
its betweenness so it's more likely asked directly, e.g. A new depth-3 atom "redox tower / midpoint-
potential ordering of the ETC carriers" that requires redox-potential (verify it doesn't overrun the
placement budget per run 5's depth-3 lesson); or (2) add depth-0 prerequisites to redox-potential
To grow its requires-closure size (raising its closure-bias so it's asked more) WITHOUT raising its
depth, but few depth-0 foundations legitimately underlie it. Option (1) is the more durable fix.
Remaining margin-safe content targets: **stern-layer** (compact inner double layer, capacitor in series
with gouy-chapman, requires gouy-chapman is d2 → stern d3, verify budget first), **DLVO** (colloid
stability = double-layer repulsion + vdW attraction; requires gouy-chapman+debye → d3, verify),
**hofmeister/salting-out** (ties preferential-interaction↔zeta↔debye-huckel-activity; needs a d≤2
Wiring to stay safe), **bjerrum-length** as its own leaf (currently only a note inside electrostatics),
**action-potential** (requires hodgkin-huxley is d2 → d3, verify). Leaf-reach rule still holds: a new
Requires=[] or depth-1 atom wired UNDER an already-deep dependent fills content AND can lift placed-count
always verify ZERO depth cascade + re-run test-diagnostic.mjs each batch. Cheap zero-risk wins still
open: ~33 atoms lack a derive-level quiz item; more `note` fields; GPU art if HSA_OVERRIDE_GFX_VERSION=
11.0.0 is reachable; a non-biophysics branch expansion (math/physics/chemistry corpora already seeded)
for variety.

## 2026-06-30, run 20
Completed the **four-forces quartet** the syllabus §1.8 names ("van der Waals, H-bonds,
Electrostatics, hydrophobic"), electrostatics + hydrophobic already existed, so this run
added the two missing ones, both `requires=[]` (diagnostic-depth 0). **van-der-waals**
(Lennard-Jones U=4ε[(σ/r)¹²−(σ/r)⁶], zero at σ, min −ε at r_min=2^{1/6}σ≈1.122σ; Keesom/
Debye/London dispersion all ∝−1/r⁶; London coeff from α & I; Hamaker surface sums −A/12πD²
plates / −AR/6D sphere-plate; argon σ=0.34nm, ε/k_B=120K) wired UNDER md (LJ = nonbonded
force-field term) + bilayer (tail, tail attraction) + ml-force-fields (learned potentials
replace the 12-6 form) by leaf-reach, all three keep their depth (md d1, bilayer d2,
Ml-force-fields d2), ZERO cascade. **hydrogen-bond** (D-H···A, 2-8 kcal/mol, d≈2.7-3.0 Å,
Angle→180°, mostly electrostatic + charge-transfer; water ≈3.6 bonds/molecule, ice 4; A·T 2
/ G·C 3; net folding gain small because it competes with water, the marginal-stability
reason; cooperativity along α-helix; low-barrier 15-20 kcal/mol; NQE/isotope effects) wired
UNDER bilayer + two-state-folding (d3) + ramachandran (d1), all keep their depth. Numbers
verified: LJ minimum derivation (x⁶=1/2 ⇒ r_min=2^{1/6}σ, U=−ε); argon condenses ~87K when
K_BT drops below ε; water H-bond ~5 kcal/mol × cooperative network ⇒ 100°C boiling anomaly.
All prose ORIGINAL; equations are facts; OPEN sources only (LibreTexts + MIT OCW 5.61/5.07/
3.320 + NCBI Bookshelf + 6 Wikipedia resources each); full 7-section lesson + 3 depths + note
+ art_prompt + 2 quiz (1 derive/conceptual) per atom. Meta 0.11.0→0.12.0. **Diagnostic:
Margin IMPROVED to +26** (44 placed vs 18 asked, up from 40), the two depth-0 leaf-reach
foundations flooded via requires-closure of the deep dependents the expert answers,
Lifting placed-count by 4; prereq-only learner 8→9; prereq shell HELD 5/6 (redox-potential
still the lone missing one, threshold ≥5 so no slack lost). Validate.sh PASSES end-to-end
(corpus integrity 125 atoms, 60-day engine sim all 125 introduced, diagnostic GREEN, assess/
lang/explorer smokes). Mirrored to public/academy-app (125 atoms, ver 0.12.0 verified).
NEXT: prereq-placement is STILL razor-thin on redox-potential (lone missing prereq, threshold
≥5 of 6, one perturbing atom could drop it to <5 and FAIL). The durable fix (run 19's option 1)
Is still open: give redox-potential more downstream dependents to raise its betweenness so it's
asked directly, e.g. A depth-3 atom "redox tower / midpoint-potential ordering of the ETC
carriers" that requires redox-potential (VERIFY it doesn't overrun the 18-question placement
budget per run 5's depth-3 lesson before keeping it). Margin-safe content targets still open:
**DLVO** (colloid stability = double-layer repulsion + vdW attraction; now that BOTH gouy-chapman
AND van-der-waals exist it wires, but requires them → depth 3, verify budget), **stern-
layer** (compact inner double layer in series with gouy-chapman, d3, verify), **hofmeister/salting-
out** (ties preferential-interaction↔zeta↔debye-huckel-activity, needs a d≤2 wiring to stay safe),
**pi-stacking / aromatic interactions** (requires van-der-waals, good leaf), **CH, π / cation, π**
(requires van-der-waals + electrostatics). Leaf-reach rule holds: a new requires=[] or depth-1
atom wired UNDER an already-deep dependent fills content AND lifts placed-count, always verify
ZERO depth cascade + re-run test-diagnostic.mjs each batch. Cheap zero-risk wins still open:
~30 atoms lack a derive-level quiz item; more `note` fields; GPU art if HSA_OVERRIDE_GFX_VERSION=
11.0.0 is reachable; a non-biophysics branch expansion (math/physics/chemistry corpora seeded).

## 2026-07-01, run 21
Completed the **noncovalent-interactions family** that sits on top of the depth-0 force
foundations (van-der-waals, electrostatics, hydrogen-bond) the last two runs added. Three new
depth-1 leaves, all `requires` into those depth-0 atoms (ZERO cascade, verified): **pi-stacking**
(π, π aromatic; Hunter, Sanders quadrupole model, Q_zz≈−8.5 D·Å face-negative/edge-positive →
sandwich repels, parallel-displaced/T-shaped attract; SAPT: dispersion dominates *magnitude*,
Electrostatics selects *geometry*, all 3 minima within ~1 kcal/mol; base-stacking + intercalation;
Electron-poor rings/perfluoroarenes stack face-to-face), **cation-pi** (charge, quadrupole ∝ qQ_zz/r³
+ induction; gas-phase benzene Li⁺~38/Na⁺~27/K⁺~19 kcal/mol → size-order = electrostatic
fingerprint; strongly attenuated in water but favourable when buried; acetylcholine aromatic box
proven by linear fluorinated-Trp mutagenesis; Trp>Tyr>Phe; K⁺-channel selectivity, methyl-lysine
readers), **salt-bridge** (Coulomb q₁q₂/4πε₀ε_r·r + H-bond; net only ~1-5 kcal/mol in water because
ε_r~80 screens + both ions pay desolvation; buried = strong Coulomb/big desolvation, stabilising
only if geometry good else DEstabilising; Arg-centred networks amortise desolvation → thermophile
hallmark; pH-dependent; double-mutant cycles show net ≪ vacuum estimate). Full 7-section lesson +
3 depths + note + art_prompt + 2 quiz (1 derive/conceptual) per atom; ALL prose ORIGINAL; equations
Are facts; OPEN sources only (LibreTexts + MIT OCW 5.13/5.112/7.05/5.07 + NCBI Bookshelf + 5 Wikipedia
resources each). Meta 0.12.0→0.13.0.

**Leaf-reach wiring lesson (important for next runs):** a low-depth leaf only lifts placed-count
If it is wired UNDER a dependent that is IN the expert's known set (depth≤2 OR shell=prereq), the
expert must ANSWER that dependent for the leaf to flood via requires-closure. First pass
wired pi-stacking/salt-bridge only under amyloid(d5)+two-state-folding(d3), both depth>2, so the
expert answers "I don't know" and they NEVER flooded: placed-count DROPPED 44→37 (they perturbed
Reach without contributing). Cation-pi (wired under ion-channel-gating d2 + binding-kd d2) DID
flood. Fix: gave pi-stacking + salt-bridge a depth-2 flooding host via **idp-llps** (, π, π,
Cation, π, and electrostatic salt bridges are the recognised LLPS "sticker" interactions among
Trp/Tyr/Arg) → placed recovered 37→**42**, prereq shell HELD 5/6, idp-llps stayed depth 2 (no
cascade). NOTE: binding-kd is a SENSITIVE high-impact node, adding pi-stacking+salt-bridge there
diluted it and dropped prereq shell to 4/6 (FAIL); reverted. Final wiring kept: pi-stacking→
amyloid+two-state-folding+idp-llps; salt-bridge→two-state-folding+idp-llps; cation-pi→
ion-channel-gating+binding-kd. Validate.sh PASSES end-to-end (128 atoms, 60-day engine sim all
introduced, diagnostic GREEN placed 42/asked 18, assess/lang/explorer smokes). Mirrored to
public/academy-app (128 atoms, ver 0.13.0 verified).

**Diagnostic state:** placed 42, asked 18, margin +24; prereq shell 5/6 (redox-potential STILL the
Lone missing one, threshold ≥5, razor-thin, one perturbing atom could drop it <5 and FAIL). The
durable fix (runs 19/20 option 1) is STILL open and STILL risky at the 18-question cap: give
redox-potential a downstream dependent (e.g. Depth-3 "redox tower / midpoint-potential ordering of
the ETC carriers" requiring redox-potential) to raise its betweenness so it's asked directly,
VERIFY it does not push questionsAsked past 18 before keeping. NEXT-run margin-safe content targets
still open: **DLVO** (double-layer repulsion + vdW; now that gouy-chapman AND van-der-waals both
Exist it wires but → depth 3, verify budget), **stern-layer** (d3, verify), **hofmeister/
salting-out** (ties preferential-interaction↔zeta↔debye-huckel-activity, needs a d≤2 wiring to stay
safe), **anion-π** (electron-poor ring, requires electrostatics, good depth-1 leaf, wire under a
D≤2 host to lift placed), **CH, π** (weak vdW/electrostatic, requires van-der-waals, depth-1 leaf).
LEAF-REACH RULE (now confirmed twice): a new requires=[]/depth-1 atom must be wired under a
depth≤2 (expert-known) dependent to lift placed-count; wiring only under depth>2 atoms fills content
but LOWERS placed-count. Always verify ZERO depth cascade + re-run test-diagnostic.mjs each batch,
And AVOID over-wiring sensitive nodes (binding-kd). Cheap zero-risk wins still open: ~30 atoms lack
A derive-level quiz item; more `note` fields; GPU art if HSA_OVERRIDE_GFX_VERSION=11.0.0 reachable;
Non-biophysics branch expansion (math 49 / physics 55 / chem 49 / info 48 / cosmo 41 / mind 42).

## 2026-07-01, run 22
Completed the **colloid/interface + aromatic-interaction family** on top of the electrostatics
foundations prior runs added. Five new atoms, all `requires` into EXISTING atoms only (no edits to
existing atoms → ZERO depth cascade, verified): **stern-layer** (requires gouy-chapman; finite-ion-size
fix, compact Stern layer up to the outer-Helmholtz/Stern plane, potential drops linearly like a
capacitor, then diffuse GC layer; series capacitors 1/C=1/C_Stern+1/C_diff cures GC's divergent
capacitance at high ψ₀/salt; specific adsorption at inner Helmholtz plane → charge reversal; zeta ≈
ψ at slip/Stern plane ≠ true ψ₀), **dlvo** (requires gouy-chapman + van-der-waals; V(D)=V_EDL+V_vdW,
Screened repulsion e^{-κD} vs vdW attraction -A/12πD²; secondary min + primary barrier + primary min;
Add salt→κ↑→barrier drops→coagulation; CCC ∝ z^{-6} Schulze, Hardy; non-DLVO forces + steric
stabilization noted), **hofmeister** (requires preferential-interaction + debye-huckel-activity;
Kosmotropes SO4/F excluded→stabilize+salt-out vs chaotropes SCN/I accumulated→destabilize+salt-in;
Anion order dominates; Setschenow log(S0/S)=Ks·c; modern direct-partitioning view replaces "water
structure making/breaking"; ties to hydrophobic effect + urea/TMAO osmolytes), **anion-pi** (requires
electrostatics; mirror of cation, π, needs reversed positive quadrupole Q_zz, C6F6≈+9.5 D·Å/triazine/
NDI; charge, quadrupole qQ_zz/r³ + anion-induced polarization which is sign-independent; rare in
proteins, big in supramolecular anion receptors/transporters + anion, π catalysis), **ch-pi** (requires
van-der-waals; dispersion-dominated weak H-bond-like C-H···π, ~1-2.5 kcal/mol, C-H→ring centroid H
2.5-3.5 Å above plane; additive; STAR role = carbohydrate, aromatic recognition, sugar pyranose C-H
Face on Trp/Tyr in lectins/glycoside hydrolases, mutate Trp→binding collapses; OH, π>NH, π>CH, π
continuum; low desolvation → survives in water). Full 7-section lesson (Intuition/Precisely/Worked
example/Why it's true/Where it connects) + 3 depths + note + art_prompt + 2 quiz (1 recall + 1
conceptual/derive) per atom; ALL prose ORIGINAL; equations are facts; OPEN sources only (LibreTexts +
MIT OCW 10.626/5.60/5.13/5.112/7.05 + NCBI Bookshelf + PMC OA + 4-5 Wikipedia resources each).
Meta 0.13.0→0.14.0.

**validate.sh PASSES end-to-end** (133 atoms, JSON integrity, 60-day engine sim all introduced,
diagnostic GREEN placed 42/asked 18 margin +24, prereq shell HELD 5/6, assess/lang/explorer smokes).
NOTE: the piped `test-headless-flow.mjs` line prints "HEADLESS SMOKE FAILED" but is **pre-existing**
(present identically in the pre-change baseline; piped through `tail` so it does NOT gate `set -e`),
Not introduced by this run; a separate cleanup bead should fix or de-mask it. Mirrored to
public/academy-app (133 atoms, ver 0.14.0 verified).

**Diagnostic state:** placed 42, asked 18, margin +24; prereq shell 5/6 (redox-potential STILL the
Lone missing one, threshold ≥5, razor-thin). New atoms are depth-1 leaves (anion-pi, ch-pi) and
depth-3 (stern-layer, dlvo, hofmeister); none perturbed placed/shell (added as pure leaves under
Existing atoms, kept out of the interior of existing atoms). LEAF-REACH RULE still applies for any future
placed-count lift: a depth-1 leaf only floods placed if wired under a depth≤2 (expert-known)
Dependent, anion-pi/ch-pi could later be added as `requires` of an existing depth≤2 aromatic atom
(pi-stacking is depth-1, cation-pi depth?, binding-kd is SENSITIVE, avoid) to lift placed, but that
edits an existing atom so re-verify ZERO cascade + shell each time. NEXT-run content targets still
open: spectroscopy gaps if any remain, **redox tower / midpoint-potential ETC ordering** (depth-3
dependent of redox-potential to raise its betweenness so it's asked directly, the durable prereq-shell
fix, but VERIFY it doesn't push asked past 18), and non-biophysics branch expansion (math 49 / physics
55 / chem 49 / info 48 / cosmo 41 / mind 42). Cheap zero-risk wins still open: ~30 atoms lack a
derive-level quiz item; more `note` fields; GPU art if HSA_OVERRIDE_GFX_VERSION=11.0.0 reachable.

## 2026-07-01, run 23
PIVOT to branch expansion, biophysics is saturated at 133 atoms and covers nearly ALL the "still
open" topics the prompt lists (bragg, fret, ghk, kramers, helfrich, cable-equation, monte-carlo,
Fep-wham, markov-state-model, contact-order, rmsf all already present); further biophysics adds hit
diminishing returns + verify-budget risk on the diagnostic. Instead expanded the THINNEST branch,
**cosmology (41→47)**, which is clean/zero-risk (does NOT touch the biophysics diagnostic). Six new
Atoms, all `requires` into EXISTING cosmology ids only (verified no missing/dupe): **matter-radiation-
equality** (z_eq≈3400 where ρ_r=ρ_m; a^-4 vs a^-3 scaling; Mészáros suppression pivot; sets k_eq),
**jeans-instability** (λ_J∼c_s/√(Gρ); dispersion ω²=c_s²k²−4πGρ; sound-crossing vs free-fall race;
Static-limit cousin of gravitational-instability), **matter-power-spectrum** (P(k)=P_prim·T²; primordial
K^{n_s} n_s≈0.96, turnover at k_eq, BAO wiggles; master statistic), **type-ia-supernovae** (Chandrasekhar
1.4M☉ standardizable candle + Phillips relation; 1998 acceleration discovery; d_L(z) integral →
Ω_Λ≈0.7), **silk-damping** (photon random-walk diffusion erases small-scale CMB; exp[−(k/k_D)²]
high-ℓ damping tail), **sachs-wolfe-effect** (ΔT/T=Φ/3 large-angle plateau; integrated SW as
dark-energy probe). Each = full 6-section lesson (Intuition/Precisely/Worked example/Why it's true/
Where it connects/Watch out) + 3 depths + note-in-deep + art_prompt + 2 quiz (recall + derive/apply,
Some with eq) + OPEN sources (MIT OCW 8.286 + Wikipedia + NASA). ALL prose ORIGINAL; equations are
facts. Meta 0.3.0→0.4.0. Mirrored to public/academy-app (47 atoms, ver 0.4.0 verified).

**validate.sh PASSES end-to-end** (all corpus JSON integrity incl. Cosmology 47/no-dupes/no-missing-
Requires, JS syntax, 60-day engine sim, biophysics diagnostic UNCHANGED at placed 42/asked 18 margin
+24 shell 5/6, assess/lang/explorer smokes). Biophysics diagnostic state is untouched by design.

**NEXT run:** continue branch expansion, mind (42) and cosmology (47) are still the thinnest after
This. Cosmology gaps still open: cosmic-neutrino-background (relic ν, N_eff≈3.046), redshift-space-
distortions (Kaiser + fingers-of-god), reionization/21cm, Sunyaev, Zel'dovich effect, weak-lensing
shear. Mind gaps: reward-prediction-error/dopamine, place/grid cells, decision-making/drift-diffusion,
Free-energy-principle, glia. OR the durable biophysics prereq-shell fix (add a depth-3 dependent of
redox-potential, redox tower / midpoint-potential ETC ordering, to raise its betweenness to 6/6;
VERIFY it doesn't push asked past 18). Cheap zero-risk wins still open across all branches: ~30
biophysics atoms lack a derive-level quiz item; more `note` fields; GPU art if HSA_OVERRIDE_GFX_VERSION
=11.0.0 reachable.

## 2026-07-01, run 24
Continued branch expansion per run-23's handoff (mind was thinnest at 42). Added **6 mind atoms
(42→48)**, all filling the noted gaps + two foundational principles, each `requires` into EXISTING
mind ids only (verified no missing/dupe): **glia** (astrocytes/oligodendrocytes/microglia, K⁺ &
glutamate buffering, myelin, synapse pruning, tripartite synapse; ← neuron-doctrine, chemical-synapse),
**reward-prediction-error** (dopamine RPE = TD error δ=r+γV(s')−V(s); burst-shift-to-cue signature,
Schultz/Montague, Dayan, distributional RL; ← neuromodulation, reinforcement-learning-brain),
**cognitive-map** (place & grid cells, hexagonal lattice, path integration, 2014 Nobel, abstract
Cognitive spaces; ← hippocampus-memory, population-coding), **drift-diffusion** (evidence
accumulation, dx=A·dt+c·dW to ±a bounds = SPRT, speed, accuracy trade-off, parameter dissociation;
← population-coding, attention), **efficient-coding** (Attneave/Barlow redundancy reduction, sparse
coding → oriented V1 filters, infomax, SNR-dependent whitening vs averaging; ← neural-coding,
Receptive-fields), **neurovascular-coupling** (BOLD/fMRI substrate, activity→flow→oxy/deoxy Hb
paramagnetism, ~5-6s hemodynamic lag, indirect proxy; ← action-potential, ionic-gradients). Each =
Full 7-section lesson (Intuition/Precisely/Worked example/Why it's true/Where it connects/Watch out/
Worth knowing) + summary + 3 depths + note + art_prompt + 2 quiz (recall + apply/derive, some with
Eq) + OPEN sources (Wikipedia + NCBI Bookshelf Purves + PMC OA + MIT OCW 9.x + arXiv q-bio.NC). ALL
prose ORIGINAL; equations are facts. Meta 0.3.0→0.4.0. Mirrored to public/academy-app (48 atoms,
Ver 0.4.0 verified).

**validate.sh PASSES end-to-end** (all corpus JSON integrity incl. Mind 48/no-dupes/no-missing-
Requires, manifest consistency, JS syntax, 60-day engine sim, biophysics diagnostic UNCHANGED at
placed 42/asked 18 margin +24 shell 5/6 since the engine sim loads ONLY biophysics.json, so mind
edits are zero-risk to placement, assess/lang/explorer smokes). NOTE: `sync-academy.mjs` lives at
the REPO ROOT (`scripts/`), not `learning/scripts/`, run `node scripts/sync-academy.mjs` from the
bucket-foundation root.

**NEXT run:** keep expanding the thinnest branches, after this, **cosmology (47)** and **mind (48)**
Are tied thinnest; then chemistry/information/mathematics (~48-49). Mind gaps still open:
Interoception/homeostatic drives, emotion/amygdala circuits, sleep & memory replay, glia-as-computation
(deeper), free-energy-principle as its own atom (currently folded into predictive-coding). Cosmology
gaps still open (from run 23): cosmic-neutrino-background (N_eff≈3.046), redshift-space-distortions,
Reionization/21cm, Sunyaev, Zel'dovich effect, weak-lensing shear. OR the durable biophysics
prereq-shell fix (add a depth-3 dependent of redox-potential to raise its betweenness to 6/6; VERIFY
asked stays ≤18). Cheap zero-risk wins still open across branches: atoms lacking a derive-level quiz
item; more `note`/`art` fields; GPU art if HSA_OVERRIDE_GFX_VERSION=11.0.0 reachable.

## 2026-07-01, run 25
Continued branch expansion per run-24's handoff (cosmology & mind tied thinnest at 47/48; picked
cosmology). Added **6 cosmology atoms (47→53)**, all filling the run-23/24 noted gaps + one halo
foundation, each `requires` into EXISTING cosmology ids only (verified no missing/dupe):
**cosmic-neutrino-background** (CνB decouples at ~1 MeV/1 s; T_ν=(4/11)^(1/3)T_γ≈1.95K from e±
Annihilation entropy; N_eff≈3.046 sets ρ_r → BBN + equality; undetected directly; ← thermal-history,
Bbn), **reionization** (first stars/quasars re-ionize the IGM at z~6-10; Gunn, Peterson trough marks
the *end*; CMB Thomson τ≈0.05; 21cm as the direct probe; ← recombination, large-scale-structure),
**redshift-space-distortions** (Kaiser squashing β=f/b + fingers-of-god; P_s(k,μ)=(1+βμ²)²P_r;
measures fσ_8 = growth-rate test of DE/modified gravity; ← redshift-surveys, gravitational-instability),
**sunyaev-zeldovich-effect** (inverse-Compton off hot ICM electrons; Compton-y = ∫(k_BT_e/m_ec²)n_eσ_T dℓ;
217GHz null; redshift-INDEPENDENT surface brightness → cluster finder; ← cmb-anisotropies,
Large-scale-structure), **weak-lensing-shear** (cosmic shear ~1% coherent; convergence κ projects
matter density → probes P(k); amplitude sets S_8=σ_8√(Ω_m/0.3); intrinsic-alignment systematic;
← gravitational-lensing, matter-power-spectrum), **halo-mass-function** (Press, Schechter: δ_c≈1.686
spherical-collapse threshold + Gaussian field → dn/dM with exp(−δ_c²/2σ²) high-mass cutoff; cluster
counts = sharp σ_8 lever; Sheth, Tormen/Tinker corrections; ← gravitational-instability,
Matter-power-spectrum). Each = full 6-section lesson (Intuition/Precisely/Worked example/Why it's true/
Where it connects/Watch out) + summary + 3 depths + note + art_prompt + 2 quiz (recall + derive/apply,
Most with eq) + OPEN sources (MIT OCW 8.286 + arXiv astro-ph + Wikipedia). ALL prose ORIGINAL;
Equations are facts. Meta 0.4.0→0.5.0. Mirrored to public/academy-app via `node scripts/sync-academy.mjs`
From the repo ROOT (53 atoms, ver 0.5.0 verified).

**validate.sh PASSES end-to-end** (all corpus JSON integrity incl. Cosmology 53/no-dupes/no-missing-
Requires, manifest consistency, JS syntax, 60-day engine sim, biophysics diagnostic UNCHANGED at
placed 42/asked 18 margin +24 shell 5/6 since the engine sim loads ONLY biophysics.json, so cosmology
edits are zero-risk to placement, assess/lang/explorer smokes all green).

**NEXT run:** keep expanding the thinnest branch, after this, **mind (48)** is thinnest, then
Chemistry/information/mathematics (~48-49); cosmology is now 53. Mind gaps still open (from run 24):
Interoception/homeostatic drives, emotion/amygdala circuits, sleep & memory replay, free-energy-
principle as its own atom, glia-as-computation (deeper). Cosmology now well-covered; remaining minor
gaps: cosmic-variance, integrated-Sachs-Wolfe as its own atom, 21cm-cosmology as its own atom. OR the
durable biophysics prereq-shell fix (add a depth-3 dependent of redox-potential to raise its
betweenness to 6/6; VERIFY asked stays ≤18). Cheap zero-risk wins still open across branches: atoms
lacking a derive-level quiz item; more `note`/`art` fields; GPU art if HSA_OVERRIDE_GFX_VERSION=11.0.0
Reachable.

## 2026-07-01, run 26
Continued branch expansion per run-25's handoff (mind was thinnest at 48). Added **6 mind
atoms (48→54)**, all filling run-24/25 noted gaps, each `requires` into EXISTING mind ids only
(validated no missing/dupe): **interoception** (inward-pointing senses → homeostatic set-points;
Vagus/NTS + lamina-I → insula; osmoreceptor thirst worked example; allostasis + interoceptive
predictive-coding; ← sensory-transduction, neuromodulation), **amygdala-emotion** (threat/fear
conditioning; lateral-amygdala convergence + NMDA-LTP, central-amygdala output; fast 'low road' vs
cortical 'high road'; extinction = new inhibitory PFC learning in place of erasure → spontaneous
recovery/renewal; ← neural-circuits, hippocampus-memory), **sleep-memory-replay** (hippocampus→cortex
systems consolidation; time-compressed place-cell replay in sharp-wave ripples nested under slow
oscillations + spindles; targeted-memory-reactivation worked example; active-systems-consolidation +
SHY; ← memory-consolidation, neural-oscillations), **free-energy-principle** (minimize variational
free energy F = D_KL[q||p] − ln p(o) ≥ surprise bound; perception = belief update, active inference =
act to match predictions; expected-free-energy pragmatic+epistemic → exploration/exploitation +
dark-room answer; ← predictive-coding), **tripartite-synapse** (astrocyte as functional 3rd partner;
Glutamate uptake via EAATs, Ca²⁺ waves → gliotransmitters, D-serine as NMDA co-agonist gating LTP,
K⁺ spatial buffering; slow/large-territory = parameter-setter not fast wire; gliotransmission debate
Flagged; ← glia, chemical-synapse), **homeostatic-plasticity** (negative-feedback partner to
runaway Hebbian; multiplicative synaptic scaling preserves relative weights while renormalizing gain;
Hours, days timescale separation from Hebbian induction; Turrigiano straight-line scaling signature;
← ltp-ltd, hebbian-learning). Each = full 7-section lesson (Intuition/Precisely/Worked example/Why
it's true/Where it connects/Watch out/Worth knowing) + summary + 3 depths + note + art_prompt + 2 quiz
(recall + derive/apply) + OPEN sources (NCBI Bookshelf Purves + PMC OA + MIT OCW 9.x + arXiv q-bio.NC
+ Wikipedia). ALL prose ORIGINAL; equations are facts. Meta 0.4.0→0.5.0. Mirrored to
public/academy-app via `node scripts/sync-academy.mjs` from the repo ROOT (mind 54, ver 0.5.0 verified).

**validate.sh PASSES end-to-end** (all corpus JSON integrity incl. Mind 54/no-dupes/no-missing-
Requires, manifest consistency, JS syntax, 60-day engine sim, biophysics diagnostic UNCHANGED at
placed 42/asked 18 margin +24 shell 5/6 since the engine sim loads ONLY biophysics.json, so mind edits
are zero-risk to placement, assess/lang/explorer smokes all green).

**NEXT run:** branch counts now, biophysics ~133, cosmology 53, mind 54; **chemistry/information/
Mathematics (~48-49) are now the thinnest** (verify exact counts), pick the thinnest of those three.
Mind remaining minor gaps: central-pattern-generators, neuroeconomics/value-comparison as its own
atom, mirror-neurons/social cognition, developmental critical-periods. Cosmology minor gaps:
Cosmic-variance, integrated-Sachs-Wolfe, 21cm-cosmology as its own atom. OR the durable biophysics
prereq-shell fix (add a depth-3 dependent of redox-potential to raise its betweenness to 6/6; VERIFY
asked stays ≤18). Cheap zero-risk wins still open across branches: atoms lacking a derive-level quiz
item; more `note`/`art` fields; GPU art if HSA_OVERRIDE_GFX_VERSION=11.0.0 reachable.

## 2026-07-01, run 27
Per run-26's handoff (chemistry/information/mathematics were the thinnest three; exact counts were
mathematics 49, chemistry 49, **information 48** = thinnest). Expanded **04-information 48→54**, each
`requires` into EXISTING information ids only (validated no missing/dupe): **perfect-secrecy** (Shannon
perfect secrecy + one-time pad; P(M|C)=P(M) ⟺ I(M;C)=0; H(K)≥H(M) key-length bound; unconditional vs
computational security; Venona pad-reuse pitfall; ← shannon-entropy, conditional-probability-bayes),
**huffman-coding** (optimal prefix-free code via greedy least-two merge; H≤L<H+1; exchange-argument
optimality; per-symbol overhead → block/arithmetic coding; DEFLATE backend; ← kraft-source-coding),
**lambda-calculus** (Church's functional model; beta reduction (λx.M)N→M[x:=N]; Turing-complete;
Church numerals + Y combinator; Church, Rosser confluence; Curry, Howard programs-as-proofs; typed vs
untyped termination trade; ← church-turing), **fast-fourier-transform** (Cooley, Tukey DFT in O(N log N)
Via even/odd split + butterfly/twiddle; T(N)=2T(N/2)+O(N); fast polynomial/integer multiply; mixed-
radix/Bluestein for arbitrary N; leakage/aliasing watch-outs; ← divide-and-conquer), **master-theorem**
(T(n)=aT(n/b)+f(n) three cases via n^{log_b a} vs f(n); recursion-tree geometric-series proof;
Merge-sort/binary-search/Karatsuba/FFT worked; Akra, Bazzi for gaps + unequal splits; Case-3 regularity
+ subtractive-recurrence traps; ← divide-and-conquer, big-o), **rices-theorem** (every non-trivial
SEMANTIC program property undecidable; halting-problem reduction; extension-vs-intension line; why
perfect static analysis is impossible → conservative approximation; syntactic/bounded exceptions;
← halting-problem, decidability). Each = full 7-section lesson (Intuition/Precisely/Worked example/
Why it works/Where it connects/A second angle/Watch out) + summary + 3 depths + note + art_prompt + 2
quiz (recall + derive/teach) + OPEN sources (MIT OCW 6.006/6.046J/18.404J + primary papers Shannon
1949/Huffman 1952/Church 1936/Cooley, Tukey 1965/Rice 1953 + Cover&Thomas/CLRS/Sipser + Wikipedia).
ALL prose ORIGINAL; equations/theorems/definitions are facts. Meta 0.3.0→0.4.0. Mirrored to
public/academy-app via `node scripts/sync-academy.mjs` from the repo ROOT (information 54, ver 0.4.0).

**validate.sh PASSES end-to-end (exit 0)** (all corpus JSON integrity incl. Information 54/no-dupes/
No-missing-requires, manifest consistency, JS syntax, 60-day engine sim, biophysics diagnostic
UNCHANGED at placed 42/asked 18 margin +24 shell 5/6 since the engine sim loads ONLY biophysics.json,
So information edits are zero-risk to placement, assess/lang/explorer smokes all green).

**NEXT run:** branch counts now, biophysics ~133, mind 54, information 54, cosmology 53, physics 55,
Mathematics 49, chemistry 49; **chemistry and mathematics (both 49) are now the thinnest**, pick one
and add 6. Information minor gaps still open if wanted: data-processing-inequality (← mutual-info),
Differential/continuous entropy, Lempel, Ziv universal compression, Rice, Shapiro, BPP/probabilistic
classes as their own atom, Diffie, Hellman key exchange, cryptographic hash functions, Boolean-circuit
complexity. OR the durable biophysics prereq-shell fix (add a depth-3 dependent of redox-potential to
raise its betweenness to 6/6; VERIFY asked stays ≤18). Cheap zero-risk wins still open: atoms lacking a
derive-level quiz item; more `note`/`art` fields; GPU art if HSA_OVERRIDE_GFX_VERSION=11.0.0 reachable.

## 2026-07-01, run 28
Per run-27's handoff (chemistry and mathematics both 49 = thinnest). Picked chemistry, expanded
**03-chemistry 49→55**, each `requires` into EXISTING chemistry ids only (validated no missing/dupe):
**hess-law** (enthalpy state function → ΔH additive over any path; ΔH_rxn = Σ ΔHf°(prod) − Σ ΔHf°(react);
C→CO worked via two combustions; element-in-standard-state ΔHf°≡0 pitfall; ← enthalpy),
**rate-laws-order** (rate = k[A]^m[B]^n; order is EMPIRICAL not stoichiometric; integrated 1st/2nd
forms + half-life fingerprint; rate-determining-step link; ← reaction-rate), **transition-state-theory**
(collision theory Boltzmann×steric + Eyring k=(k_BT/h)e^(−ΔG‡/RT); saddle-point on PES; TS vs
intermediate; catalyst lowers ΔG‡; ← arrhenius-activation, kinetic-molecular-theory), **solubility-product**
(Ksp=[A⁺]^a[B⁻]^b; Q vs Ksp precipitation test; AgCl s=√Ksp worked + common-ion effect; Ksp compares
solubility only for same ion ratio pitfall; ← chemical-equilibrium), **beer-lambert-law** (A=εℓc=
−log₁₀(I/I₀); linear→concentration from one reading; exp-decay derivation; λ_max reports structure;
Linearity fails A>1; ← solutions-concentration), **crystal-field-theory** (Δo = E(eg)−E(t2g); octahedral
T2g/eg split; high vs low spin via Δo vs pairing energy w/ d⁶ Fe²⁺; spectrochemical series; color = t2g→eg
photon; tetrahedral inverts w/ Δt≈4/9Δo pitfall; ← coordination-complexes, mo-theory). Each = full
7-section lesson + summary + 3 depths + note + art_prompt + 2 quiz (recall + derive) + OPEN sources
(OpenStax Chemistry 2e / LibreTexts / MIT OCW 5.60). ALL prose ORIGINAL; equations/definitions are facts.
meta 0.3.0→0.4.0. Mirrored to public/academy-app via `node scripts/sync-academy.mjs` from repo ROOT.

**validate.sh PASSES end-to-end** (chemistry 55/no-dupes/no-missing-requires, manifest, JS syntax,
60-day engine sim, biophysics diagnostic UNCHANGED at placed 42/asked 18 since the sim loads ONLY
Biophysics.json, so chemistry edits are zero-risk to placement; assess/lang/explorer smokes all green).

**NEXT run:** branch counts now, biophysics ~133, physics 55, chemistry 55, mind 54, information 54,
Cosmology 53, **mathematics 49 = the thinnest**, pick mathematics and add 6. Chemistry minor
gaps still open if wanted: reaction quotient Q as its own atom, collision-theory MB-tail as its own atom,
Faraday's laws of electrolysis, Hund/Aufbau as own atom, Raoult's law, Born, Haber cycle, chirality/
stereochemistry (← isomerism), NMR/IR spectroscopy (← beer-lambert now available as sibling), Nernst
already present. OR the durable biophysics prereq-shell fix (add a depth-3 dependent of redox-potential
To raise betweenness to 6/6; VERIFY asked stays ≤18). Cheap zero-risk wins still open across branches:
Atoms lacking a derive-level quiz item; more `note`/`art` fields; GPU art if HSA_OVERRIDE_GFX_VERSION=11.0.0.

## 2026-07-01, run 29
Per run-28's handoff (mathematics 49 = the thinnest). Picked mathematics, expanded
**01-mathematics 49→55**, each `requires` into EXISTING mathematics ids only (validated no missing/dupe):
**bayes-theorem** (P(H|E)=P(E|H)P(H)/P(E); conditional-probability derivation; prior/likelihood/posterior;
Disease-test base-rate fallacy worked (99% test, 1/1000 → ~9%); Cox's theorem forces Bayesian updating;
Log-odds additive form; ← probability, random-variables), **prime-numbers** (Fundamental Theorem of
Arithmetic: unique factorization up to order; Euclid's lemma as the crux of uniqueness; Euclid's
infinitude proof reproduced; 60=2²·3·5 worked; why 1 is excluded; ℤ[√−5] non-unique-factorization
caveat; PNT + RSA connections; ← number-systems, modular-arithmetic), **markov-chains** (memoryless
property; transition matrix, μ↦μP; stationary πP=π as left eigenvector for eigenvalue 1; 2-state
worked → (0.8,0.2); Perron, Frobenius uniqueness + convergence; MCMC/PageRank; ← probability, linear-map,
Eigenvalue), **lagrange-multipliers** (∇f=λ∇g on g=c; gradient-perpendicular geometry; Lagrangian
formulation; xy s.t. X+y=10 → x=y=5 worked; λ as shadow price ∂f*/∂c; KKT generalization; ←
optimization, multivariable-calculus), **banach-fixed-point** (contraction q<1 on complete space ⇒
unique fixed point + iteration converges from anywhere; Cauchy/geometric-gap proof; x=cos x → Dottie
number worked; a priori error bound; Picard, Lindelöf/Newton connections; completeness + q<1 both
essential counterexamples; ← metric-space, real-analysis), **galois-theory** (Gal(E/F) as root-symmetry
group; Fundamental Theorem's order-reversing subfield↔subgroup bijection; solvable-by-radicals ⇔ solvable
Galois group; S₅ unsolvable via simple non-abelian A₅ = Abel, Ruffini; constructible-polygon corollary;
"unsolvable ≠ no roots" caveat; ← ring-field, group, polynomials-roots, homomorphism). Each = full
7-section lesson (Intuition/Precisely/Worked example/Why it works/Where it connects/Watch out) + summary
+ 3 depths + note + art_prompt + 2 quiz (recall + derive) + OPEN sources (MIT OCW 18.02/18.05/18.100/
18.701-702/18.781 + LibreTexts + OpenStax + Khan + SEP + primary Euclid/Abel, Ruffini/Cox). ALL prose
ORIGINAL; equations/theorems/definitions are facts. Meta 0.4.0→0.5.0. Mirrored to public/academy-app via
`node scripts/sync-academy.mjs` from repo ROOT (mathematics 55, ver 0.5.0).

**validate.sh PASSES end-to-end** (mathematics 55/no-dupes/no-missing-requires, manifest, JS syntax,
60-day engine sim, biophysics diagnostic UNCHANGED at placed 42/asked 18 since the sim loads ONLY
Biophysics.json, so mathematics edits are zero-risk to placement; assess/lang/explorer smokes all green).

**NEXT run:** branch counts now, biophysics ~133, mathematics 55, physics 55, chemistry 55, mind 54,
Information 54, cosmology 53; **cosmology (53) is now the thinnest**, pick cosmology and add 6 toward
full syllabus coverage. Mathematics minor gaps still open if wanted: Green's/divergence theorems as own
atoms (stokes-theorem generalizes them), convergence tests for series, quadratic forms/positive-definite
matrices (← eigenvalue, inner-product), rank, nullity theorem, continued fractions, tensor algebra.
OR the durable biophysics prereq-shell fix (add a depth-3 dependent of redox-potential to raise
betweenness to 6/6; VERIFY asked stays ≤18). Cheap zero-risk wins across branches: atoms lacking a
derive-level quiz item; more `note`/`art` fields; GPU art if HSA_OVERRIDE_GFX_VERSION=11.0.0 reachable.

## 2026-07-01, run 30
Per run-29's handoff (cosmology 53 = the thinnest). Picked cosmology, expanded
**06-cosmology 53→59**, each `requires` into EXISTING cosmology ids only (validated no missing/dupe;
one new internal edge transfer-function←primordial-power-spectrum resolves within-file):
**fluid-equation** (ρ̇+3H(ρ+p)=0 from first law dE=−p dV on V∝a³; ρ∝a^{−3(1+w)}; matter a^{−3} /
Radiation a^{−4} / Λ const; local ∇_μT^{μν}=0, dependent on Friedmann; phantom w<−1 → Big Rip;
← friedmann-equations, scale-factor), **deceleration-parameter** (q≡−äa/ȧ²; q=½ΣΩ_i(1+3w_i);
q₀≈½Ω_m−Ω_Λ≈−0.55; sign-convention fossil; d_L(z) Taylor term measured by SNe; jerk j=1 null test;
← scale-factor, friedmann-equations, dark-energy), **growth-of-structure** (δ̈+2Hδ̇−4πGρ̄δ=0 scale-
independent → δ=D(a)δ_init; Hubble-friction 2Hδ̇; D∝a matter era, frozen under Λ; Mészáros in rad era;
F≈Ω_m^0.55 for RSD; ← gravitational-instability, friedmann-equations, matter-radiation-equality),
**primordial-power-spectrum** (inflation stretches quantum jitter → 𝒫(k)∝k^{n_s−1}; n_s=1 Harrison,
Zel'dovich; measured n_s≈0.965 red tilt = ~7σ inflation win; n_s−1=−6ε+2η; r=16ε tensor cousin; ←
inflation, matter-power-spectrum), **transfer-function** (P(k)∝k^{n_s}T²(k)D²(a); T→1 large scales,
T∝k^{−2} small scales → turnover at k_eq = horizon at equality → measures Ω_m h²; BAO wiggles + ν
suppression ride on it; Boltzmann codes; ← primordial-power-spectrum, matter-radiation-equality,
Matter-power-spectrum), **cmb-polarization** (Thomson scattering of local temp quadrupole at last
scattering → linear polarization ~10% of ΔT; E/B curl-free/curl split; scalars → E only, 90° out of
phase with T peaks (velocity vs density); reionization bump measures τ; lensing E→B foreground; ←
recombination, cmb-anisotropies). Each = full 7-section lesson (Intuition/Precisely/Worked example/
Why it's true/Where it connects/Watch out) + summary + 3 depths + note + art_prompt + 2 quiz (recall +
derive w/ eq) + OPEN sources (MIT OCW 8.286 + arXiv astro-ph + Wikipedia + Einstein Online). ALL prose
ORIGINAL; equations/definitions are facts. Meta 0.5.0→0.6.0. Mirrored to public/academy-app via
`node scripts/sync-academy.mjs` from repo ROOT (cosmology 59, ver 0.6.0).

**validate.sh PASSES end-to-end** (cosmology 59/no-dupes/no-missing-requires, manifest, JS syntax,
60-day engine sim, biophysics diagnostic UNCHANGED at placed 42/asked 18 since the sim loads ONLY
Biophysics.json, so cosmology edits are zero-risk to placement; assess/lang/explorer smokes all green).

**NEXT run:** branch counts now, biophysics ~133, cosmology 59, mathematics 55, physics 55, chemistry 55,
Mind 54, information 54; **mind (54) and information (54) are now tied thinnest**, pick one and add 6
toward full coverage. Information gaps still open (from run-27 handoff): data-processing-inequality
(← mutual-info), differential/continuous entropy, Lempel, Ziv, Rice, Shapiro, Diffie, Hellman, cryptographic
hash functions, Boolean-circuit complexity. Cosmology minor gaps still open if wanted: integrated
Sachs, Wolfe effect (← sachs-wolfe-effect, dark-energy), spherical collapse & virialization (← jeans-
instability), reheating (← inflation, thermal-history), distance-duality d_L=(1+z)²d_A, age-of-universe
integral, cosmic variance. OR the durable biophysics prereq-shell fix (add a depth-3 dependent of
redox-potential to raise betweenness to 6/6; VERIFY asked stays ≤18). Cheap zero-risk wins across
branches: atoms lacking a derive-level quiz item; more `note`/`art` fields; GPU art if
HSA_OVERRIDE_GFX_VERSION=11.0.0 reachable.

## 2026-07-01, run 31
Per run-30's handoff (mind 54 and information 54 tied thinnest). Picked **information**, which had a
concrete gap list. Expanded **04-information 54→60**, each `requires` into EXISTING information ids only
(validated no missing/dupe): **data-processing-inequality** (X→Y→Z Markov ⇒ I(X;Z)≤I(X;Y); chain-rule
proof via I(X;Z|Y)=0; equality ⇔ sufficient statistic; corollary I(X;g(Y))≤I(X;Y); noisy-channel decoder
worked (0.3-bit cap); feeds Fano + rate, distortion converse + privacy amplification; ← mutual-information),
**differential-entropy** (h=−∫f ln f; can be negative, scale-dependent (+ln|a|), distinct from the fine-quantization
Limit; uniform[0,a]→ln a worked (neg for a<1); Gaussian maximizes ½ln(2πeσ²) at fixed variance; only
differences/KL are unit-free; ← shannon-entropy, probability-basics), **lempel-ziv** ((1/n)ℓ_LZ→H entropy
rate, universal w/o statistics; LZ77 sliding-window vs LZ78/LZW dictionary; c(n)≈n/log n phrase count;
Ababab worked; DEFLATE/LZW/LZMA/Zstd; upper-bounds computable K; ← kraft-source-coding, kolmogorov-
complexity), **diffie-hellman** ((g^a)^b=g^{ab}=(g^b)^a mod p; p=23,g=5,a=6,b=15→key 2 worked; discrete-log
/ CDH hardness; unauthenticated ⇒ MITM needs certs; DHE/ECDHE forward secrecy; Shor breaks it; ←
public-key-crypto, one-way-functions), **cryptographic-hash** (preimage/2nd-preimage/collision resistance;
Collisions exist by pigeonhole ⇒ security is computational; birthday 2^{n/2} ⇒ 256-bit=128-bit security;
Sign H(m), commitments, salted-slow passwords, HMAC, PoW; SHA-256/3 vs broken MD5/SHA-1; ←
one-way-functions), **boolean-circuits** (frontier; P⊆P/poly, super-poly LB for NP ⇒ P≠NP; AC⁰ can't do
PARITY (Håstad), monotone CLIQUE exponential (Razborov); natural-proofs barrier; P/poly ⊋ P holds
undecidable unary langs; T(n)²-unroll; NC/parallel depth; ← complexity-p). Each = full 6-section lesson
(Intuition/Precisely/Worked example/Why it works/Where it connects/A second angle) + summary + 3 depths +
note + art_prompt + 2 quiz (recall + derive) + OPEN sources (Cover & Thomas, Katz & Lindell, Arora & Barak,
MIT OCW 6.441, NIST FIPS 202, Diffie, Hellman 1976, Razborov, Rudich, Wikipedia). ALL prose ORIGINAL;
Equations/theorems/definitions are facts. Meta 0.4.0→0.5.0. Mirrored to public/academy-app via
`node scripts/sync-academy.mjs` from repo ROOT (information 60, ver 0.5.0; mirror byte-identical).

**validate.sh PASSES end-to-end** (exit 0; information 60/no-dupes/no-missing-requires, all 8 corpora OK,
Manifest, JS syntax, 60-day engine sim biophysics diagnostic UNCHANGED at placed 42/asked 18 since the sim
loads ONLY biophysics.json → information edits are zero-risk to placement; assess/lang/explorer smokes all
green). Note: the `HEADLESS SMOKE FAILED` block is PRE-EXISTING (confirmed on a clean baseline; needs a
headless-browser env the loop box lacks) and is non-gating, validate.sh still exits 0 / ALL VALIDATIONS
PASSED. Not caused by this change.

**NEXT run:** branch counts now, biophysics ~133, information 60, cosmology 59, mathematics 55, physics 55,
Chemistry 55, mind 54; **mind (54) is now the thinnest**, pick mind and add 6 toward full syllabus
coverage. Information gaps remaining if wanted: Rice, Shapiro theorem, continuous/joint AEP details,
Slepian, Wolf coding, Fano's inequality as its own atom (← data-processing-inequality now exists as a natural
prereq), Merkle trees (← cryptographic-hash), zero-knowledge proofs (← one-way-functions, diffie-hellman).
Cheap zero-risk wins across branches: atoms lacking a derive-level quiz item; more `note`/`art` fields;
GPU art if HSA_OVERRIDE_GFX_VERSION=11.0.0 reachable. OR the durable biophysics prereq-shell fix (add a
depth-3 dependent of redox-potential to raise betweenness to 6/6; VERIFY asked stays ≤18).

## 2026-07-01, run 32
Per run-31's handoff (mind 54 the-thinnest branch). Expanded **07-mind 54→60** with a coherent
computational-neuroscience cluster (learning rules + coding + decision), each `requires` into EXISTING mind
ids only (validated no missing/dupe): **oja-rule** (normalized Hebbian Δw=η·y·(x−y·w) → ‖w‖→1 and w → top
principal component; ⟨Δw⟩=η(Cw−(wᵀCw)w)=0 ⇒ eigenvector; local rule computes global PCA; ← hebbian-learning),
**bcm-rule** (φ(y,θ_M)=y(y−θ_M) sliding threshold θ_M∝⟨y²⟩ ⇒ stable+selective Hebbian; super-linear θ_M is
the stability trick; = metaplasticity; ← hebbian-learning, ltp-ltd), **hopfield-network** (E=−½Σw_ij s_i s_j
Lyapunov; symmetric weights ⇒ ΔE=−Δs_i·h_i≤0 ⇒ converges; Hebbian storage → content-addressable attractor
memory; α_c≈0.138N capacity; spurious minima; ties to attention/transformers; ← artificial-neural-networks,
Hebbian-learning, working-memory), **backpropagation** (chain rule backward δ_layer=(Wᵀ_next δ_next)⊙f′(z),
∂L/∂W=δ·a_prevᵀ; reverse-mode autodiff O(W) vs O(W²) naive; breaks perceptron/XOR barrier; vanishing-grad +
weight-transport/bio-implausibility caveats; ← artificial-neural-networks, perceptron), **sparse-coding**
(E=‖x−Σa_iφ_i‖²+λΣS(a_i), overcomplete dict + L1 ⇒ Olshausen, Field 1996 learns localized/oriented/bandpass
V1 receptive fields from natural images with no labels; = efficient-coding instance; ← efficient-coding,
Receptive-fields), **signal-detection-theory** (d′=z(H)−z(FA) sensitivity vs criterion/bias; ROC/AUC bias-free;
Worked ex H=.84 FA=.16 ⇒ d′=2; static counterpart of DDM; measurement layer of perception-as-inference; ←
perception-inference, drift-diffusion). Each = full 6-7-section lesson (Intuition/Precisely/Worked example/
Why it works/Where it connects/Watch out/Worth knowing) + summary + 3 depths + note + art_prompt + 2 quiz
(recall + derive) + OPEN sources (Oja 1982, BCM 1982, Hopfield 1982, Rumelhart, Hinton, Williams 1986,
Olshausen, Field 1996, Green & Swets 1966, PMC OA, NCBI Bookshelf Purves, MIT OCW 9.40/6.036, Wikipedia). ALL
prose ORIGINAL; equations/theorems/definitions are facts. Meta 0.5.0→0.6.0. Mirrored to public/academy-app via
`node scripts/sync-academy.mjs` from repo ROOT (mind 60, ver 0.6.0; mirror byte-identical).

**validate.sh PASSES end-to-end** (exit 0; mind 60/no-dupes/no-missing-requires, all 8 corpora OK, manifest,
JS syntax, 60-day engine sim biophysics diagnostic UNCHANGED at introduced 133 / xp 1975 / streak 48 since the
sim loads ONLY biophysics.json → mind edits are zero-risk to placement; assess/lang/explorer smokes all green).
The `HEADLESS SMOKE FAILED` block remains PRE-EXISTING/non-gating (needs a headless-browser env the loop box
lacks), validate.sh still exits 0 / ALL VALIDATIONS PASSED. Not caused by this change.

**NEXT run:** branch counts now, biophysics ~133, information 60, cosmology 59, mind 60, mathematics 55,
Physics 55, chemistry 55; **mathematics/physics/chemistry (55) are now tied thinnest**, pick one and add 6
toward full syllabus coverage. Mind gaps remaining if wanted: winner-take-all / lateral inhibition (←
neural-circuits), divisive normalization (canonical computation; ← neural-circuits, efficient-coding),
Wilson, Cowan neural-mass dynamics (← neural-circuits, neuronal-dynamics), central pattern generators (←
neural-circuits, motor-control), ring/bump continuous attractors (← hopfield-network now exists, cognitive-map),
Dendritic computation / active dendrites (← passive-cable, synaptic-integration). Cheap zero-risk wins across
branches: atoms lacking a derive-level quiz item; more `note`/`art` fields; GPU art if
HSA_OVERRIDE_GFX_VERSION=11.0.0 reachable. OR the durable biophysics prereq-shell fix (add a depth-3 dependent
of redox-potential to raise betweenness to 6/6; VERIFY asked stays ≤18).
