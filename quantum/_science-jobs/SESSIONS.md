# Claude Science — session plan for the Quantum Project

**One project, five sessions.** The project already holds the reference-impl code as
attached knowledge. Run each job cluster as its own session so contexts stay clean
and a QPU spend can never leak into a render/scrape thread.

| # | Session | Needs attached | QPU? |
|---|---------|----------------|------|
| S1 | Verify & reproduce reference-impl | (already in project) | no |
| S2 | Manual figures | `figures-data.json` + named cards | no |
| S3 | Manual simulations | none (writes its own circuits) | no |
| S4 | Corpus / arXiv sweep | none (web) | no |
| S5 | Reference-impl extensions + hardware | (in project) | **gated** |

Attach from `~/agfarms/bucket-foundation/quantum/`: `_science-jobs/figures-data.json`,
and for S2 the specific cards named in the prompt.

---

## S1 — Verify & reproduce the reference-impl  (paste as first message)
Activate the venv and run the correctness proof and studies, then confirm the
results match the math. Commands: `. .venv/bin/activate`; `python tests/test_estimators.py`;
`python src/studies.py`. Regenerate `results/shot_scaling.png` and
`results/noise_scaling.png`. Confirm: (a) the swap-test and Hadamard-test estimators
reproduce classical cosine similarity to within shot noise; (b) the error falls as
1/sqrt(S); (c) the quantum-kernel SVM matches the exact-kernel SVM. Report any
discrepancy between code, `MATH.md`, and numpy ground truth. Do not touch real
hardware. Deliverable: a short pass/fail table + the refreshed plots.

## S2 — Manual figures  (attach figures-data.json + the cards named below)
Produce publication-quality SVG figures for the Quantum Operating Manual (spectral
cyan #0e8ea0 on ink/paper, both light and dark variants). Save as SVG.
1. **Coverage atlas** — from `figures-data.json` coverage_by_layer, a clean layered
   map poster of the 8 layers and 184 nodes.
2. **Modality comparison heatmap** — qubit modalities × (coherence T2, 2Q fidelity,
   qubit count 2025-26, connectivity, temperature). Pull the numbers from these
   cards: `02-hardware/H-supercon.md, H-ion.md, H-photonic.md, H-neutral.md,
   H-silicon.md, H-topo.md, H-bosonic.md, H-anneal.md`.
3. **The scaling gap** — physical-vs-logical qubit overhead curves toward RSA-2048;
   use `08-frontier-open/O-overhead.md, O-scaling.md, 03-stack-algorithms/S-shor.md`.
4. **Timeline ribbon** — 1900→2026 milestones from the `07-history/` cards.
5. **Advantage scorecard** — every claimed "quantum advantage" vs whether it survived
   a classical counterattack; use `08-frontier-open/O-advantage.md, 03-stack-algorithms/S-bench.md`.
6. **Industry readiness matrix** — 27 industries × {proven / pilot / promise / hype};
   use the `05-industries/` cards' "Proven today vs promise vs hype" verdicts.
Every figure that shows a vendor number labels it T4. Save into a folder I can pull back.

## S3 — Manual simulations  (no attachment needed)
Write and run small, reproducible quantum circuits (Qiskit or PennyLane) and export
each as a labelled figure for the manual:
- Bell state + CHSH value (report S and the 2√2 bound).
- Grover on 3 qubits (amplitude bar chart across iterations).
- Surface-code distance-3 stabilizer layout diagram.
- A **QEC-overhead calculator**: input target logical error rate + physical error
  rate → surface-code distance + physical-qubit count; plot the curve.
- A **benchmark normalizer**: take vendor quantum-volume / algorithmic-qubit / CLOPS
  numbers and put them on one comparable axis (caveats noted).
Each figure regenerable by a command; keep the code.

## S4 — Corpus / arXiv sweep  (web)
Pull recent arXiv quant-ph + cond-mat.mes-hall listings (last ~90 days). Cluster by
the manual's node IDs (foundations / hardware / algorithms / adjacent / industry).
Surface any paper that would upgrade a T4 vendor claim to a T2/T3 peer-reviewed or
preprint result. Output a table: node ID · paper · arXiv ID · what it changes. No
figures — this feeds the manual's grading.

## S5 — Reference-impl extensions + hardware  (GATED — do not run QPU without go-ahead)
Simulator-only first: implement readout-error calibration and zero-noise
extrapolation on the swap/Hadamard estimators; try a lower-depth encoding; show the
cleaned error budget vs the raw one. THEN, and only after Gian says go: run the single
IBM Open-plan job (small kernel, few qubits) and the IonQ run; use the `--check`
preflight first. No account creation, no credential entry, no ToS acceptance.
