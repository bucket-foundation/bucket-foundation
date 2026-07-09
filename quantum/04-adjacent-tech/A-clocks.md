# Atomic & Optical Clocks · A-clocks
**Layer:** L3 Adjacent tech · **Chapter:** §04 · **Status:** deepened (cycle 3)

## What it is
Clocks locked to atomic transition frequencies — the most precise instruments humans have built. Cesium fountains define the SI second today at $\sim10^{-16}$ fractional uncertainty; optical clocks (trapped ions, optical lattices) run their reference transition $\sim10^5$ times faster and reach systematic uncertainties near $\mathbf{10^{-18}}$–$\mathbf{10^{-19}}$, good to better than a second over the age of the universe. Two quality metrics matter: **accuracy** (systematic uncertainty — how close to the true transition frequency) and **stability** (Allan deviation — how well it averages down over time). Downstream: GPS itself, telecom/finance timestamping, geodesy (a $10^{-18}$ clock senses a $1\,\text{cm}$ change in height via gravitational redshift), and GPS-free PNT (`A-pnt`).

## Maturity & real deployments (2025–26)
Layered maturity — from mass-market chips to lab instruments defining the SI second.
- **Chip-scale atomic clocks (CSACs)** — e.g. Microchip's CSAC (rubidium, $\sim120\,\text{mW}$, $\sim10^{-10}$ stability) — are long-standing commercial products in defense, telecom, and undersea gear.
- **Lab optical clocks** are established metrology. **NIST's \ce{Al+} quantum-logic ion clock** set the accuracy record in July 2025 at **$\mathbf{\sim8.1\times10^{-19}}$ systematic uncertainty (~19 decimal places), 41% better than the prior best**. A **six-country coordinated optical-clock comparison** (June 2025) is the largest cross-border agreement test yet — direct groundwork for redefining the second.
- **Portable/deployed optical clocks** are commercializing: **QuantX Labs** (rubidium two-photon optical clock, operated at sea), Adelaide's warm-ytterbium-vapor clock, and **Infleqtion's Tiqker** — which was deployed on the **UK Royal Navy's XV Excalibur** uncrewed submarine in October 2025, a first-of-kind at-sea optical-clock deployment.

## The SI-second redefinition (the big institutional event)
BIPM/CCTF's roadmap conditions redefinition on optical standards beating cesium by $\mathbf{\geq100\times}$, **$\mathbf{\geq5}$ independent systems** running continuously in different labs, and **$\mathbf{>1}$ year** of traceable agreeing data. The CGPM (2026) is expected to endorse the roadmap, with the actual redefinition targeted around **2030**. This is why time-transfer (`A-timedist`) is load-bearing: the clocks are now better than the links that compare them.

## Key graded claims
- T2 \ce{Al+} optical clock at $\sim8.1\times10^{-19}$ systematic uncertainty, record accuracy — NIST, July 2025 (established)
- T2 Six-country coordinated optical-clock comparison as redefinition groundwork — Optica/NMI collaboration, June 2025 (demonstrated)
- T3 Infleqtion Tiqker optical clock deployed on Royal Navy XV Excalibur submarine — Oct 2025 (demonstrated, vendor+navy)
- T5/T6 SI second redefined on an optical transition ~2030 — CIPM/BIPM roadmap, arXiv:2307.14141 (roadmap)

## Conflicts / open questions
- Which transition wins the redefinition — \ce{Sr} lattice (most-run), \ce{Yb}, \ce{Yb+} E3, \ce{Al+} (most accurate), or a weighted ensemble of several — is unsettled; a single-transition definition versus an ensemble is an open governance choice.
- Portable optical clocks trade 2–4 orders of accuracy for size, weight and power. Whether field PNT actually needs optical performance or just a better vapor-cell/CSAC holdover clock is an open market question — for many jam-resistant timing use cases a nanosecond-per-day holdover is enough.

## The honest call
**Split maturity, all real.** CSACs are a decades-old commercial commodity; lab optical clocks are the most accurate machines ever built and are about to redefine the second; portable optical clocks are just now leaving the lab (Tiqker at sea). The near-term commercial pull is defense/PNT holdover timing and geodesy, not the 19-digit lab record.

## Sources
- https://www.nist.gov/news-events/news (Al⁺ clock record, July 2025)
- https://www.optica.org/about/newsroom/news_releases/2025/unprecedented_optical_clock_network_lays_groundwork_for_redefining_the_second/
- https://spaceinsider.tech/2026/04/10/quantum-sensing-for-pnt-nears-deployment/ (Tiqker on XV Excalibur)
- https://arxiv.org/pdf/2307.14141 (redefinition roadmap)
