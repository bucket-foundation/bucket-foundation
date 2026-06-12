# Syllabus — Biophysics General Exam (the nucleus)

**Bead:** bkt-xo0 · Branch 05 · 2026-06-11

The full span you must command for a biophysics general/qualifying exam: prerequisites →
nucleus → frontier. Each topic lists its **master equation(s)** (facts, not prose) and
**open references** to learn it from. Topics tagged `[N]` are nucleus core (highest
leverage); `[P]` prerequisite; `[F]` frontier.

Legend for mastery target: **R** recall · **A** apply · **D** derive · **T** teach.

---

## Shell 0 — Prerequisites `[P]`

### 0.1 Mathematical methods — target A/D
- Calculus (multivariable), linear algebra (eigenproblems — central to normal modes,
  PCA, Markov states), differential equations (ODE/PDE), Fourier analysis (→ diffraction,
  NMR, spectroscopy), probability & statistics (→ everything stochastic).
- Master objects: eigenvalue equation `A x = λ x`; Fourier transform
  `F(k) = ∫ f(x) e^{-2πikx} dx`; Gaussian `p(x) ∝ e^{-(x-μ)²/2σ²}`.
- Sources: MIT OCW 18.0x; LibreTexts Mathematics; Boas-level OER.

### 0.2 Classical & statistical mechanics — target D
- Lagrangian/Hamiltonian mechanics; least action `δ∫L dt = 0`.
- Partition function `Z = Σ e^{-E_i/kT}`; free energy `F = -kT ln Z`;
  Boltzmann `p_i = e^{-E_i/kT}/Z`; equipartition.
- Sources: MIT OCW 8.09, 8.044/8.333; LibreTexts.

### 0.3 Quantum mechanics & electrodynamics — target A/D
- Schrödinger equation `iħ ∂ψ/∂t = Ĥψ`; perturbation theory; selection rules
  (→ spectroscopy). Maxwell's equations; dipole radiation (→ light–matter interaction).
- Sources: MIT OCW 8.04/8.05, 8.07; Griffiths-level OER.

### 0.4 Physical chemistry & biochemistry — target A
- Thermodynamics laws; chemical potential `μ_i = μ_i° + kT ln a_i`; equilibrium
  `ΔG° = -RT ln K`; reaction kinetics; acid–base; the central biomolecules (proteins,
  nucleic acids, lipids, carbohydrates) and the central dogma.
- Sources: LibreTexts P-Chem (full, open); OpenStax Chemistry; NCBI Bookshelf.

---

## Shell 1 — The Biophysics Nucleus `[N]`

### 1.1 Energy, entropy & the thermodynamics of life — target D
- Gibbs free energy `ΔG = ΔH − TΔS`; the hydrophobic effect (entropy-driven);
  electrostatics in water — Poisson–Boltzmann `∇²φ = −ρ/εε₀`, Debye length
  `λ_D = (εε₀kT / Σ n_i q_i²)^{1/2}`; the Boltzmann distribution as the workhorse.
- Why nucleus: every binding, folding, and transport argument reduces to a free-energy
  balance. Master this and most of the field is bookkeeping.

### 1.2 Macromolecular structure — target A
- Protein structure hierarchy; Ramachandran plot; secondary structure (α-helix/β-sheet);
  DNA double helix; the polymer view: ideal chain `⟨R²⟩ = N b²`, worm-like chain
  (persistence length `l_p`), entropic elasticity.
- Sources: NCBI Bookshelf (MBoC sections); LibreTexts; PDB-101.

### 1.3 Protein folding & stability — target D
- Two-state model; `ΔG_fold`, `K = e^{−ΔG/kT}`; folding funnel / energy landscape theory;
  Levinthal paradox; cooperativity; Φ-value analysis; ΔΔG of mutations (ties to your
  StabilityDesigner). Anfinsen's thermodynamic hypothesis.
- Sources: Finkelstein lectures (where open); OA folding reviews on PMC; arXiv q-bio.

### 1.4 Binding, allostery & reaction kinetics — target D
- Mass-action; dissociation constant `K_d = [P][L]/[PL]`; fractional occupancy
  `θ = [L]/(K_d+[L])`; cooperativity — Hill equation `θ = Lⁿ/(K_d+Lⁿ)`; MWC & KNF
  allostery models; enzyme kinetics — Michaelis–Menten `v = V_max[S]/(K_m+[S])`;
  transition-state theory `k = (k_BT/h) e^{−ΔG‡/kT}`.

### 1.5 Diffusion, transport & stochastic dynamics — target D
- Fick's laws `J = −D ∇c`; Einstein relation `D = kT/γ`; Stokes drag `γ = 6πηr`;
  random walk `⟨x²⟩ = 2Dt`; Langevin equation; Fokker–Planck; Smoluchowski diffusion-
  limited rate `k = 4πDR`; Kramers escape over a barrier.
- Why nucleus: the bridge from equilibrium thermodynamics to *dynamics* and single-molecule.

### 1.6 Membranes & bioenergetics — target A/D
- Lipid bilayer self-assembly; fluid-mosaic; Helfrich bending energy
  `E = ∫ (κ/2)(2H)² dA`; Nernst potential `E = (RT/zF) ln([out]/[in])`;
  Goldman–Hodgkin–Katz; chemiosmosis / proton-motive force (Mitchell); ATP synthase.
- Sources: PMC OA membrane reviews; LibreTexts.

### 1.7 Electrophysiology & excitable cells — target D
- Membrane as RC circuit; cable equation; **Hodgkin–Huxley** model of the action
  potential `C dV/dt = −Σ g_i (V−E_i) + I`; voltage-gated channels; patch clamp (ties to
  your PatchSeqML). Neuron doctrine.

### 1.8 Molecular interactions & spectroscopy methods — target A
- Forces: van der Waals, H-bonds, electrostatics, hydrophobic. Methods nucleus:
  X-ray diffraction (Bragg `nλ = 2d sinθ`), NMR (chemical shift, NOE → distances),
  cryo-EM (single-particle, CTF — ties to your CryoTriage), fluorescence & FRET
  (`E = 1/(1+(r/R₀)⁶)`), CD, mass spec, SAXS, single-molecule (optical/magnetic tweezers).

### 1.9 Computational & statistical biophysics — target D
- Molecular dynamics (force fields, integrators — Verlet); Monte Carlo; free-energy
  methods (FEP, umbrella sampling, WHAM); enhanced sampling; **Markov state models**
  (ties to your TrajMine); elastic network / **GNM** normal modes (ties to your Gap-2
  flexibility work); coarse-graining.
- Sources: LiveCoMS open reviews; OpenMM/GROMACS docs; arXiv.

---

## Shell 2 — Frontier `[F]` (refreshed continuously from arXiv/bioRxiv/PMC)

- **Protein structure & language models** — AlphaFold2/3, ESM, RoseTTAFold; pLDDT and its
  *flexibility* critiques (ICLR 2025; Structure 2025 — ties to your Gap-2 benchmark);
  homology/data-leakage rigor (your recurring theme).
- **Intrinsically disordered proteins & phase separation** — IDPs, LLPS, biomolecular
  condensates; sequence→ensemble; CAID disorder benchmarks (ties to the Vranken hook).
- **Amyloid & aggregation** — nucleation kinetics, Th-T, familial mutations (ties to your
  amyloid study / the Luo hook).
- **Single-molecule & dynamics at scale** — cryo-EM revolution, time-resolved methods,
  MD datasets (mdCATH — ties to your unfolding-order + flexibility studies).
- **ML for dynamics** — neural network potentials, generative ensembles (aSAMt, etc.),
  learned force fields.

---

## Self-test scope (what a general exam would actually ask)

1. **Derive** Michaelis–Menten from the quasi-steady-state assumption.
2. **Derive** the two-state folding occupancy from the partition function.
3. **Explain** why the hydrophobic effect is entropy-driven and temperature-dependent.
4. **Set up** the Hodgkin–Huxley equations and explain each current.
5. **Compute** a Debye length and explain electrostatic screening in physiological salt.
6. **Relate** diffusion coefficient, viscosity, and size (Einstein–Stokes); estimate a
   diffusion-limited rate.
7. **Explain** how cryo-EM/NMR/X-ray each yield structure, and their resolution regimes.
8. **Critique** using pLDDT as a flexibility predictor (frontier — your own result).

These map 1:1 to Concept Atoms under `learning/atoms/05-biophysics/`, each with cards at
the R/A/D/T mastery levels.

---

## Sourcing note

Everything above is learnable from the **open corpus** (LibreTexts, OpenStax, MIT OCW,
NCBI Bookshelf, PMC OA, arXiv). The copyrighted textbooks that would *polish* this
(Nelson, Dill, Phillips, …) are in `ACQUISITION-LEDGER.md` with legal acquisition routes;
they are not required to reach exam competency on the nucleus.
