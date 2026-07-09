# Quantum in Weather & Climate Modeling · I-weather
**Layer:** L4 Industries · **Chapter:** §05 · **Status:** depth
**Added:** 2026-07-08 (cycle 3 random-walk — split from `I-climate`, which is chemistry/carbon-capture)

## The pitch
Distinct from `I-climate` (quantum *chemistry* for carbon capture/fertilizer), this node is about **numerical weather prediction (NWP) and climate dynamics** — the fluid-dynamics side. Weather/climate models solve Navier-Stokes and radiative-transfer PDEs on enormous grids; the pitch is quantum linear-solvers (HHL, `S-hhl`) for the linear-algebra core, quantum algorithms for turbulent/CFD flow, and QML for pattern-finding in satellite/sensor data (extreme-event and precipitation nowcasting).

## Real activity (named, dated)
- **Open Quantum Institute (OQI, at CERN, pilot phase 2024–2026)** — runs a **"Weather and Climate Forecasting" project** whose core is a *quantum fluid-dynamics* solver to improve forecast reliability. Multi-institution, pre-commercial, the most concrete organized effort.
- **arXiv 2502.10488** (Feb 2025) — *Opportunities and challenges of quantum computing for climate modelling* — a serious survey mapping HHL/QLSA and Hamiltonian-simulation methods onto dynamical cores, with honest caveats on data loading (`S-qram`) and readout.
- **arXiv 2509.01422** (2025) — *Exploring Quantum Machine Learning for Weather Forecasting* — QNNs for wind-speed prediction on benchmark data; potential-outperformance framing, small scale.
- **BAMS 2023** — *Quantum Computers for Weather and Climate Prediction: The Good, the Bad, and the Noisy* — the reference sober review from the meteorology community.

## Key graded claims
- T3 Quantum linear-solver / Hamiltonian-simulation methods mapped onto NWP dynamical cores — arXiv 2502.10488 (survey; no end-to-end advantage)
- T3 QNN wind-speed/precipitation nowcasting on benchmark data — arXiv 2509.01422 (toy-scale demonstration)
- T4 OQI quantum fluid-dynamics forecasting pilot — CERN/OQI (exploratory, pre-commercial)
- T5 Quantum-weather market projections — analyst (speculative)

## Proven today vs promise vs hype
- **Proven:** nothing operational — surveys and toy-scale QNN nowcasting demos, matched by classical ML.
- **Promise:** quantum linear-solvers for the PDE core and quantum CFD — real theoretical hooks, blocked by data-loading and readout bottlenecks.
- **Hype:** "quantum will fix weather forecasting" — today's NWP is world-class classical HPC that quantum cannot yet touch.

## Honest assessment
Weather/climate modeling is one of the harder places to get a quantum win: the HHL-style speedup for linear systems is real on paper but dies on the input/output problem (loading a petabyte-scale state and reading out a full field), which the field's own 2025 surveys flag plainly. NWP is a mature, heavily-optimized classical-HPC discipline (ECMWF, NOAA), so the bar is very high. The credible near-term thread is QML *nowcasting* on sensor/satellite data, which is small and classically matchable. The OQI pilot is the honest bright spot: organized, dated, and explicitly pre-commercial. Realistic value: **2030s+**, gated on fault tolerance and a qRAM-class data-loading solution.

## Sources
- OQI Weather and Climate Forecasting: https://open-quantum-institute.cern/project/weather-and-climate-forecasting/
- Opportunities and challenges of quantum computing for climate modelling: https://arxiv.org/pdf/2502.10488
- Exploring Quantum ML for Weather Forecasting: https://arxiv.org/html/2509.01422v1
- BAMS "Quantum Computers for Weather and Climate Prediction: The Good, the Bad, and the Noisy" (2023)
