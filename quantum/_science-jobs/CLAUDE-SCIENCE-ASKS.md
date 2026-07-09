# What I want the Claude Science "Quantum Project" to do

Claude Science runs Claude on data locally with a sandboxed compute+render
environment (Python, plotting, LaTeX, R). The existing project (the frame in the
brief — `proj_21cf0cae2b00`) already carries the `reference-impl/` quantum-kernel
work as attached knowledge (see `../reference-impl/CLAUDE-SCIENCE-SETUP.md`). Here
is the job list I want it to own for the Quantum Operating Manual. Science handles
**anything that needs real compute, simulation, or rendered figures**; the research
agents handle text/coverage.

## A. Figure & diagram generation (the manual's visuals)
1. **Map poster** — render `00-IDEAL-STATE-MAP.md` as a one-page layered atlas
   (like the health manual's `figures-gallery`). SVG/PDF.
2. **Modality comparison chart** — qubit modalities × (coherence time, gate
   fidelity, qubit count 2025, connectivity, temperature) as a heatmap/table figure.
3. **The scaling gap** — physical-vs-logical qubit overhead curves; "millions of
   physical qubits for RSA-2048" visualized honestly with error bars.
4. **Timeline figure** — 1900→2026 milestone ribbon for chapter §07.
5. **Advantage scorecard** — every claimed "quantum advantage" vs whether it
   survived a classical counterattack, as a graded strip.
6. **Industry readiness matrix** — 15 industries × (proven / pilot / promise /
   hype) with source counts.

## B. Simulation & verification (real compute)
7. **Reproduce the reference-impl numbers** — run `src/studies.py` +
   `tests/test_estimators.py` in the sandbox; confirm swap/Hadamard estimators
   reproduce classical cosine similarity and 1/√S shot scaling. Regenerate
   `results/shot_scaling.png`, `results/noise_scaling.png`.
8. **Small quantum-circuit demos** — Qiskit/PennyLane in-sandbox: Bell state +
   violation numbers, Grover on 3 qubits, a surface-code distance-3 diagram — as
   worked, reproducible figures for §01/§03.
9. **QEC overhead calculator** — given target logical error rate + physical error
   rate, compute surface-code distance and physical-qubit count; produce the curve
   for §08 `O-overhead`.
10. **Benchmark normalizer** — take vendor-reported quantum-volume / algorithmic-
    qubit / CLOPS numbers and put them on one comparable axis (with caveats).

## C. Data & corpus jobs
11. **arXiv quant-ph sweep** — pull recent quant-ph listings, cluster by node ID,
    surface papers that should upgrade a T4 claim to T2/T3.
12. **Citation/OpenAlex enrichment** — the biophysics project already pulled
    OpenAlex field data (`quantum_computing__*`, `quantum_information__*`); reuse it
    for the `E-patents` / `E-market` / institution-leaderboard cards.
13. **Reference mining** — run `agf-yt-mine` output from the quantum `yt/`
    interviews into the people/org cards (`09-people-orgs/`).

## D. The build itself
14. **Adapt `build_manual.py`** — the health manual's builder → a quantum
    `build_manual.py` that compiles all filled node cards into `reports/manual.html`
    / `manual.pdf` / `manual.epub`. This is the single output deliverable.

## Rules for Science jobs
- No real QPU-time spend without an explicit go-ahead (inherited from the
  reference-impl principles). Simulators are free; hardware is gated.
- Honesty over hype — every figure that shows a vendor number labels it T4.
- Everything reproducible: each figure regenerable by a command.
- Renders land in `reports/` and `media/`; job briefs logged here in `_science-jobs/`.

## What I need from you (founder)
- Confirm this is the same Claude Science project as the frame in the brief (or
  point me at the right `proj_` id), and whether I should drive it via the running
  daemon on `localhost:8000`.
- Green-light for the IBM Open-plan + IonQ hardware run on the reference-impl
  (single job, small) — or keep it simulator-only for now.
