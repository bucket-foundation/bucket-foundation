Every chapter before this one has been about physics and machines: the postulate that a system holds two states at once, the qubit modalities that exploit it, the stack that turns a noisy qubit into an answer, and the sensing and cryptography technologies that ride alongside the computer. This chapter asks the question the money cares about. Twenty-seven industries have quantum programs. Where does the technology land, how hard is the ground under each landing, and how much of what you read about it is real?

The honest answer is a map with sharp relief. The industries do not sit on one smooth gradient from "early" to "mature." They cluster into three bands with visible walls between them, and the wall that matters most is the *kind* of quantum technology each industry is actually using. Read the twenty-seven cards back to back and one pattern surfaces before any other: **the industries that have something deployed today are running a quantum *sensor* or a *cryptographic defense*, and the industries running a quantum *computer* are running a pilot.** The near-term economy of quantum is sensing and crypto-migration. The near-term economy of quantum *computing* is controlled proof-of-concept and contested annealing.

To keep the vendor optimism and the peer-reviewed result from weighing the same, every claim below carries an evidence tier from `evidence/SCHEMA.md`. T1 is textbook physics, T2 a refereed result, T3 a preprint or conference demo, T4 a vendor announcement not independently reproduced, and T5 an analyst forecast. A JPMorgan result in *Nature* and a market-research firm's "trillion-dollar impact by 2035" are separated by four tiers, and the press treats them as one number.

The **industry-readiness matrix** — the figure this chapter narrates — plots the twenty-seven on two axes: *is the near-term value a sensor/defense or a computer*, and *is the computational advantage proven, contested, or promised*. Every industry falls into one of the three bands below. The matrix has a heavy diagonal: readiness rises as you move from "quantum computer chasing an optimization advantage" toward "quantum sensor doing a measurement job no classical instrument does as well." That diagonal is the honest shape of the market.

**Learning objectives.** After this chapter you can:

- Sort any quantum industry into the three-band map — proven, contested pilot, promise — and name the kind of quantum technology (sensor, cryptographic defense, or computer) that puts it there.
- Read a vendor or analyst claim against the T1–T5 evidence tiers and assign it the tier it earns.
- Explain why the near-term quantum economy is sensing and cryptographic migration while quantum *computing* is still pilots and contested annealing.
- Spot the two market-sizing traps — TAM double-counting and quantum-inspired conflation — inside a market report or a press release.
- Price a pure-play quantum company on its real current revenue rather than its trillion-dollar TAM deck, and read a DARPA-QBI stage as a government filter, not a scoreboard.

------------------------------------------------------------------------

### The industry map at a glance

Read the dashboard first, then the evidence behind each card. Eight industries are investable in 2026, and every one of them runs a quantum sensor that out-measures the classical instrument or a mandated post-quantum-cryptography migration. Ten more are 2030 watches whose advantage over a good classical method is still contested. Nine are ignores for now, dominated by inflated market math or by "quantum-inspired" classical work relabeled as quantum. The Invest-read column is the one-line version of each verdict below.

| # | Industry | Band | Near-term reality | Best evidence | Verdict | Invest read |
|----|----|----|----|----|----|----|
| 1 | Aerospace & defense | 1 | Quantum inertial nav fielded (air/sea/space) | T3 | Sensing arriving; compute a bet | Invest now (sensing) |
| 2 | Healthcare imaging | 1 | OPM-MEG shipped (research-only) | T2/T3 | Real sensor; awaits regulatory clearance | Invest now (sensing) |
| 3 | Mining | 1 | Diamond magnetometer + gravimeter exploration | T3/T4 | Sensing credible; compute 2030s | Watch 2030 (sensing) |
| 4 | Space & EO | 1 | ACES clocks, satellite QKD, inertial sensors flying | T2/T3 | Sensing/timing real; compute long-horizon | Invest now (sensing/timing) |
| 5 | Cybersecurity | 1 | PQC standards final, migration mandated | T2 | Threat certain; danger is under-reacting | Invest now (PQC) |
| 6 | Intelligence | 1 | HNDL doctrine + PQC mandates | T3 | Certain in kind, uncertain in timing | Invest now (PQC) |
| 7 | Telecom | 1 | PQC shipping; QKD deployed and niche | T2/T3 | Defensive crypto is the real value | Invest now (PQC) |
| 8 | Finance | 1/3 | Certified randomness delivered; optimization POC | T2 | One refereed app; rest is promise | Watch 2030 |
| 9 | Automotive | 2 | Ford Otosan annealing in production | T3/T4 | Real deployment, contested advantage | Watch 2030 |
| 10 | Manufacturing | 2 | Annealing scheduling + paid optimization | T3/T4 | Grounded; gate-model advantage end-of-decade | Watch 2030 |
| 11 | Logistics | 2 | Routing/scheduling pilots (VW, Airbus, DB) | T3 | Most demos, least proven advantage | Ignore (quantum-inspired trap) |
| 12 | Air-traffic mgmt | 2 | QUBO traffic/gate demos + Airbus challenges | T3/T4 | Small, classically matchable, cert-gated | Ignore |
| 13 | Energy & utilities | 2 | EDF/Pasqal EV-charging pilot (pre-commercial) | T3/T4 | Sensing likelier payoff than compute | Watch 2030 |
| 14 | Chemicals & materials | 2 | VQE/QPE on tiny molecules | T1 theory / T3 demo | Strongest theory, ~zero advantage today | Watch 2030 |
| 15 | Pharma | 2 | Q4Bio 100-qubit chemistry (competitively judged) | T2/T3 | Path shown; late 2020s–2030s | Watch 2030 |
| 16 | Nuclear & fusion | 2 | Light-nucleus simulation on hardware | T2/T3 | Best physics pedigree, widest value gap | Watch 2030 |
| 17 | Oil & gas | 2 | Annealing reservoir/seismic sub-problems | T3/T4 | Heavy TAM, light results — grade hard | Ignore (TAM trap) |
| 18 | AI & machine learning | 3 | QML classifies toy data; repeatedly dequantized | T3/T4 | Skepticism maximal; near-term product no | Ignore |
| 19 | Government services | 3 | QUBO fraud method papers; PQC is the real spend | T3 | Watch the AI-relabeled mislabel | Invest now (PQC) |
| 20 | Retail | 3 | QNN forecasting demos; TAM-report noise | T3 | Thinnest pitch; grade TAM hardest | Ignore (TAM trap) |
| 21 | Insurance & risk | 3 | Academic capital/copula demos | T3 | Finance's bet, one step behind | Ignore |
| 22 | Agriculture | 3 | <span class="math-span"> <svg class="math-inline" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="53.272458pt" height="11.184658pt" viewbox="-95.855049 -95.849674 53.272458 11.184658">
<defs>
<path id="g0-70" d="M6.826401-8.141469H.490162V-7.79477H.729265C1.590037-7.79477 1.625903-7.675218 1.625903-7.232877V-.908593C1.625903-.466252 1.590037-.3467 .729265-.3467H.490162V0C.777086-.02391 1.841096-.02391 2.199751-.02391C2.618182-.02391 3.670237-.02391 4.016936 0V-.3467H3.658281C2.618182-.3467 2.594271-.490162 2.594271-.920548V-3.897385H3.646326C4.770112-3.897385 4.889664-3.502864 4.889664-2.49863H5.152677V-5.642839H4.889664C4.889664-4.638605 4.770112-4.244085 3.646326-4.244085H2.594271V-7.316563C2.594271-7.711083 2.618182-7.79477 3.144209-7.79477H4.638605C6.360149-7.79477 6.706849-7.161146 6.874222-5.475467H7.137235L6.826401-8.141469Z" />
<path id="g0-77" d="M2.749689-7.938232C2.666002-8.16538 2.654047-8.16538 2.379078-8.16538H.526027V-7.81868H.765131C1.625903-7.81868 1.661768-7.699128 1.661768-7.256787V-1.231382C1.661768-.908593 1.661768-.3467 .526027-.3467V0C.836862-.02391 1.470486-.02391 1.80523-.02391S2.773599-.02391 3.084433 0V-.3467C1.948692-.3467 1.948692-.908593 1.948692-1.231382V-7.758904H1.960648L4.841843-.227148C4.889664-.095641 4.925529 0 5.045081 0C5.152677 0 5.176588-.059776 5.248319-.239103L8.153425-7.81868H8.16538V-.908593C8.16538-.466252 8.129514-.3467 7.268742-.3467H7.029639V0C7.304608-.02391 8.261021-.02391 8.607721-.02391S9.910834-.02391 10.185803 0V-.3467H9.9467C9.085928-.3467 9.050062-.466252 9.050062-.908593V-7.256787C9.050062-7.699128 9.085928-7.81868 9.9467-7.81868H10.185803V-8.16538H8.332752C8.069738-8.16538 8.057783-8.153425 7.962142-7.926276L5.355915-1.123786L2.749689-7.938232Z" />
<path id="g0-99" d="M4.327771-4.423412C4.184309-4.423412 3.741968-4.423412 3.741968-3.93325C3.741968-3.646326 3.945205-3.443088 4.23213-3.443088C4.507098-3.443088 4.734247-3.610461 4.734247-3.957161C4.734247-4.758157 3.897385-5.332005 2.929016-5.332005C1.530262-5.332005 .418431-4.088667 .418431-2.582316C.418431-1.052055 1.566127 .119552 2.917061 .119552C4.495143 .119552 4.853798-1.315068 4.853798-1.422665S4.770112-1.530262 4.734247-1.530262C4.62665-1.530262 4.614695-1.494396 4.578829-1.350934C4.315816-.502117 3.670237-.143462 3.024658-.143462C2.295392-.143462 1.327024-.777086 1.327024-2.594271C1.327024-4.578829 2.343213-5.068991 2.940971-5.068991C3.395268-5.068991 4.052802-4.889664 4.327771-4.423412Z" />
<path id="g0-101" d="M4.578829-2.773599C4.841843-2.773599 4.865753-2.773599 4.865753-3.000747C4.865753-4.208219 4.220174-5.332005 2.773599-5.332005C1.41071-5.332005 .358655-4.100623 .358655-2.618182C.358655-1.0401 1.578082 .119552 2.905106 .119552C4.327771 .119552 4.865753-1.171606 4.865753-1.422665C4.865753-1.494396 4.805978-1.542217 4.734247-1.542217C4.638605-1.542217 4.614695-1.482441 4.590785-1.422665C4.27995-.418431 3.478954-.143462 2.976837-.143462S1.267248-.478207 1.267248-2.546451V-2.773599H4.578829ZM1.279203-3.000747C1.374844-4.877709 2.426899-5.092902 2.761644-5.092902C4.040847-5.092902 4.112578-3.407223 4.124533-3.000747H1.279203Z" />
<path id="g0-111" d="M5.487422-2.558406C5.487422-4.100623 4.315816-5.332005 2.929016-5.332005C1.494396-5.332005 .358655-4.064757 .358655-2.558406C.358655-1.028144 1.554172 .119552 2.917061 .119552C4.327771 .119552 5.487422-1.052055 5.487422-2.558406ZM2.929016-.143462C2.486675-.143462 1.948692-.334745 1.601993-.920548C1.279203-1.458531 1.267248-2.163885 1.267248-2.666002C1.267248-3.120299 1.267248-3.849564 1.637858-4.387547C1.972603-4.901619 2.49863-5.092902 2.917061-5.092902C3.383313-5.092902 3.88543-4.877709 4.208219-4.411457C4.578829-3.861519 4.578829-3.108344 4.578829-2.666002C4.578829-2.247572 4.578829-1.506351 4.267995-.944458C3.93325-.37061 3.383313-.143462 2.929016-.143462Z" />
</defs>
<g id="page1" transform="matrix(1.35 0 0 1.35 0 0)">
<use x="-71.00374" y="-62.834378" xlink:href="#g0-70" />
<use x="-64.339898" y="-62.834378" xlink:href="#g0-101" />
<use x="-59.13724" y="-62.834378" xlink:href="#g0-77" />
<use x="-48.410897" y="-62.834378" xlink:href="#g0-111" />
<use x="-42.232741" y="-62.834378" xlink:href="#g0-99" />
<use x="-37.030083" y="-62.834378" xlink:href="#g0-111" />
</g>
</svg></span> estimate + hype-y precision-ag | T3 | Sensing near; chemistry 2030s+ | Watch 2030 (sensing) |
| 23 | Climate & sustainability | 3 | <span class="math-span"> <svg class="math-inline" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="53.272458pt" height="11.184658pt" viewbox="-95.855049 -95.849674 53.272458 11.184658">
<defs>
<path id="g0-70" d="M6.826401-8.141469H.490162V-7.79477H.729265C1.590037-7.79477 1.625903-7.675218 1.625903-7.232877V-.908593C1.625903-.466252 1.590037-.3467 .729265-.3467H.490162V0C.777086-.02391 1.841096-.02391 2.199751-.02391C2.618182-.02391 3.670237-.02391 4.016936 0V-.3467H3.658281C2.618182-.3467 2.594271-.490162 2.594271-.920548V-3.897385H3.646326C4.770112-3.897385 4.889664-3.502864 4.889664-2.49863H5.152677V-5.642839H4.889664C4.889664-4.638605 4.770112-4.244085 3.646326-4.244085H2.594271V-7.316563C2.594271-7.711083 2.618182-7.79477 3.144209-7.79477H4.638605C6.360149-7.79477 6.706849-7.161146 6.874222-5.475467H7.137235L6.826401-8.141469Z" />
<path id="g0-77" d="M2.749689-7.938232C2.666002-8.16538 2.654047-8.16538 2.379078-8.16538H.526027V-7.81868H.765131C1.625903-7.81868 1.661768-7.699128 1.661768-7.256787V-1.231382C1.661768-.908593 1.661768-.3467 .526027-.3467V0C.836862-.02391 1.470486-.02391 1.80523-.02391S2.773599-.02391 3.084433 0V-.3467C1.948692-.3467 1.948692-.908593 1.948692-1.231382V-7.758904H1.960648L4.841843-.227148C4.889664-.095641 4.925529 0 5.045081 0C5.152677 0 5.176588-.059776 5.248319-.239103L8.153425-7.81868H8.16538V-.908593C8.16538-.466252 8.129514-.3467 7.268742-.3467H7.029639V0C7.304608-.02391 8.261021-.02391 8.607721-.02391S9.910834-.02391 10.185803 0V-.3467H9.9467C9.085928-.3467 9.050062-.466252 9.050062-.908593V-7.256787C9.050062-7.699128 9.085928-7.81868 9.9467-7.81868H10.185803V-8.16538H8.332752C8.069738-8.16538 8.057783-8.153425 7.962142-7.926276L5.355915-1.123786L2.749689-7.938232Z" />
<path id="g0-99" d="M4.327771-4.423412C4.184309-4.423412 3.741968-4.423412 3.741968-3.93325C3.741968-3.646326 3.945205-3.443088 4.23213-3.443088C4.507098-3.443088 4.734247-3.610461 4.734247-3.957161C4.734247-4.758157 3.897385-5.332005 2.929016-5.332005C1.530262-5.332005 .418431-4.088667 .418431-2.582316C.418431-1.052055 1.566127 .119552 2.917061 .119552C4.495143 .119552 4.853798-1.315068 4.853798-1.422665S4.770112-1.530262 4.734247-1.530262C4.62665-1.530262 4.614695-1.494396 4.578829-1.350934C4.315816-.502117 3.670237-.143462 3.024658-.143462C2.295392-.143462 1.327024-.777086 1.327024-2.594271C1.327024-4.578829 2.343213-5.068991 2.940971-5.068991C3.395268-5.068991 4.052802-4.889664 4.327771-4.423412Z" />
<path id="g0-101" d="M4.578829-2.773599C4.841843-2.773599 4.865753-2.773599 4.865753-3.000747C4.865753-4.208219 4.220174-5.332005 2.773599-5.332005C1.41071-5.332005 .358655-4.100623 .358655-2.618182C.358655-1.0401 1.578082 .119552 2.905106 .119552C4.327771 .119552 4.865753-1.171606 4.865753-1.422665C4.865753-1.494396 4.805978-1.542217 4.734247-1.542217C4.638605-1.542217 4.614695-1.482441 4.590785-1.422665C4.27995-.418431 3.478954-.143462 2.976837-.143462S1.267248-.478207 1.267248-2.546451V-2.773599H4.578829ZM1.279203-3.000747C1.374844-4.877709 2.426899-5.092902 2.761644-5.092902C4.040847-5.092902 4.112578-3.407223 4.124533-3.000747H1.279203Z" />
<path id="g0-111" d="M5.487422-2.558406C5.487422-4.100623 4.315816-5.332005 2.929016-5.332005C1.494396-5.332005 .358655-4.064757 .358655-2.558406C.358655-1.028144 1.554172 .119552 2.917061 .119552C4.327771 .119552 5.487422-1.052055 5.487422-2.558406ZM2.929016-.143462C2.486675-.143462 1.948692-.334745 1.601993-.920548C1.279203-1.458531 1.267248-2.163885 1.267248-2.666002C1.267248-3.120299 1.267248-3.849564 1.637858-4.387547C1.972603-4.901619 2.49863-5.092902 2.917061-5.092902C3.383313-5.092902 3.88543-4.877709 4.208219-4.411457C4.578829-3.861519 4.578829-3.108344 4.578829-2.666002C4.578829-2.247572 4.578829-1.506351 4.267995-.944458C3.93325-.37061 3.383313-.143462 2.929016-.143462Z" />
</defs>
<g id="page1" transform="matrix(1.35 0 0 1.35 0 0)">
<use x="-71.00374" y="-62.834378" xlink:href="#g0-70" />
<use x="-64.339898" y="-62.834378" xlink:href="#g0-101" />
<use x="-59.13724" y="-62.834378" xlink:href="#g0-77" />
<use x="-48.410897" y="-62.834378" xlink:href="#g0-111" />
<use x="-42.232741" y="-62.834378" xlink:href="#g0-99" />
<use x="-37.030083" y="-62.834378" xlink:href="#g0-111" />
</g>
</svg></span> ~99k-qubit estimate | T3 | Textbook killer app, decade+ away | Watch 2030 |
| 24 | Construction | 3 | Small QUBO scheduling; mostly materials science | T3 | Early academic; FTQC-gated | Ignore |
| 25 | Weather modeling | 3 | HHL/QML surveys + OQI pilot | T3/T4 | I/O bottleneck kills the speedup | Ignore |
| 26 | Semiconductors & EDA | 3 | Quantum-for-design early; GPU-classical wins | T3/T4 | Fab base real; design app 2030s | Invest now (fab base) |
| 27 | Media & entertainment | 3 | QRNG-seeded PCG in toy form | T3 | Curiosity node; low weight | Ignore |

------------------------------------------------------------------------

### Band 1 — Deployed and real today

Eight industries have quantum technology doing paying or fielded work in 2026. Not one of them earns that place with a general-purpose quantum computer. They earn it two ways: with **quantum sensors** that measure fields, gravity, time, and magnetism better than any classical instrument, and with **cryptographic defense** — post-quantum cryptography (PQC) and, in narrow cases, quantum key distribution (QKD) and certified randomness. What unites the band is that none of this needs a fault-tolerant computer. The physics is mature, the products ship, and the bottlenecks are regulatory approval and unit cost.

#### Sensing: aerospace, health imaging, mining, space

**Aerospace & defense** holds the strongest "quantum is real now" case in the entire atlas, and the thing that is real is a sensor. Q-CTRL's April 2025 field trials put a quantum inertial navigation package (~180 W) on an aircraft and on the Royal Australian Navy's MV *Sycamore*, clearing military-adequate thresholds for GPS-free positioning (T3). In August 2025 DARPA awarded Q-CTRL two Robust Quantum Sensors (RoQS) contracts (~$24.4M, Lockheed Martin subcontracting) for navigation sensors on moving platforms without shielding (T4), and Boeing flew what it called the highest-performing quantum inertial sensor ever in space aboard the X-37B spaceplane (T3/T4). The strategic driver is GPS-denied environments. The payoff comes from gravimetry, magnetometry, and cold-atom interferometry. Shor's algorithm is nowhere in it. Quantum *computing* for defense — codebreaking, materials simulation — is the same fault-tolerance-gated future everyone else faces, plus a classified overhang: no one outside secure spaces knows what adversaries can do. The card's verdict is the band's motto. Sensing is arriving; compute is a bet.

**Healthcare imaging & diagnostics** tells the identical story in a hospital. The flagship is OPM-MEG: optically-pumped magnetometers, a quantum sensor, replacing cryogenic SQUIDs for magnetoencephalography and giving wearable, room-temperature brain imaging with SQUID-class sensitivity (T2/T3). Cerca Magnetics (a Nottingham spinout) ships a commercial wearable OPM-MEG helmet to research sites today (T4). The honest ceiling is written into the product: as of 2025 it sells as a research system with no medical-regulatory approval in any jurisdiction, and epilepsy pre-surgical mapping is the most advanced application. The NIHR's January 2025 survey notes only two healthcare quantum-sensing technologies are past TRL 6. This needs no fault-tolerant computer, which is exactly why it is nearer-term than the drug-discovery story in pharma. The blocker is regulatory clearance and the magnetically-shielded room. The physics is settled.

**Mining & mineral exploration** is sensing-led for a reason that matters to the energy transition. Cold-atom gravimeters and NV-diamond magnetometers detect ore bodies and density anomalies from the air, sharpening the hunt for lithium, copper, nickel, cobalt, and rare earths. The QUAMINEX program (SBQuantum + Silicon Microgravity, March 2024) fuses a diamond quantum vector magnetometer with a MEMS gravimeter on a drone for 3D deposit mapping, funded by Canada (CAD $500k) and the UK (£414k), with SBQuantum's magnetometer miniaturized to a handheld sub-pound device claiming ≥30% better resolution than the magnetic-mapping standard (T3/T4). The resolution number is vendor-stated and the systems are still commercializing (niche, expensive), so grade it accordingly. The compute side — QUBO haulage optimization, mineral-processing chemistry — sits at the same small-instance, no-advantage stage as logistics. Sensing has a credible near path; compute is a 2030s bet.

**Space & Earth observation** is real where it is sensing, timing, and communication. ESA's ACES atomic-clock ensemble reached the ISS in April 2025 — the most accurate clock package ever flown, targeting fractional stability ~1×10⁻¹⁶ (T2/T3) — and satellite QKD (China's Micius) plus quantum inertial sensors are flying and returning data now. The University of Vienna even launched a compact photonic quantum computer into orbit in 2025 (T3), but read that one carefully: it demonstrates that the hardware *survives* launch. It computes nothing useful. Orbit and constellation optimization by quantum computers is speculative and well-served by classical HPC. As with aerospace, the near-term space win is a sensor.

#### Cryptographic defense: cyber, telecom, intelligence, finance

The other half of Band 1 is the defensive scramble to survive the quantum computer that does not yet exist.

**Cybersecurity** is the one industry in this whole chapter where the honest caveat runs *backward*. Everywhere else the danger is over-claiming. Here the danger is under-reacting. A cryptographically relevant quantum computer (CRQC) running Shor breaks RSA and elliptic-curve cryptography — that is T1 established mathematics, and only the CRQC's arrival date is uncertain (T6). NIST finalized the first PQC standards (FIPS 203 ML-KEM, 204 ML-DSA, 205 SLH-DSA) in August 2024, triggering the largest mandated crypto migration in history (T2), with NIST IR 8547 setting 2030-deprecate / 2035-disallow timelines and NSA's CNSA 2.0 requiring quantum-safe algorithms for new national-security systems by January 2027. "Harvest now, decrypt later" (HNDL) makes the risk retroactive: adversaries can store today's encrypted traffic to break later, so migration must begin now regardless of when the CRQC lands. And the horizon is tightening — resource estimates published between May 2025 and March 2026 cut the qubits needed to break RSA-2048 from ~20M (Gidney/Ekerå 2019) toward <1M, possibly ~100k on newer architectures (T3). Yet a May 2025 survey of 1,000+ security managers found only ~5% had quantum-safe encryption deployed. The threat is certain, the standards are final, the deadlines are binding, and the market is barely moving. QKD is over-marketed for this; classical-software PQC is the answer NSA and the UK's NCSC actually recommend.

**Intelligence & cryptanalysis** is the offensive mirror of the same coin — quantum's impact most certain in *kind*, most uncertain in *timing*, and wrapped in classification. Shor's threat is established; HNDL bulk collection is warned-of doctrine from NSA, CISA, and NIST (T3); and CNSA 2.0's deadlines exist precisely because agencies must defend their own secrets against an adversary CRQC. No CRQC exists, and whether any adversary is close is classified — the honest overhang. Any "they already break encryption with quantum" claim is unverifiable and should be treated as such (T6). The rational response is identical to cybersecurity: migrate to PQC now.

**Telecom** is the substrate for both defensive tracks, and it runs at two speeds. PQC is software crypto shipping now — mandated, underway, and where carriers spend seriously. QKD is hardware: deployed, working, and niche. BT stood up the UK's first commercial quantum-secured metro network in London in 2022 (with Toshiba; customers included HSBC and EY) (T3/T4), and SK Telecom launched a hybrid QKD-PQC service in October 2024 with Nokia and ID Quantique in Seoul data centers (T3/T4). Both are real commercial footprints. Both are small, expensive, and distance-limited. The quantum internet is a research decade away. Telecom's honest near-term quantum value is defensive crypto, mostly the classical-software PQC kind.

**Finance** is the flagship "quantum use case" and the sharpest lesson in reading the tiers. Its one deployed, refereed, beyond-classical result is **certified randomness**. JPMorganChase, with Quantinuum, Argonne, ORNL, and UT Austin, delivered it on the 56-qubit Quantinuum H2-1 in *Nature* (26 March 2025) (T2), a cryptographic primitive with privacy and audit uses. That is the single delivered "advantage application" on the entire industry map, and it produces no alpha. Everything else finance chases is promise wearing a POC costume. HSBC and IBM claimed up to 34% improvement predicting corporate-bond-trade fills on real data using a Heron processor in a hybrid workflow (September 2025) — a bank-plus-vendor co-announcement that has not been independently reproduced (T4). A JPMorgan+AWS decomposition reported a modest ~12% runtime reduction on a constrained optimization (T4). The honest counter-signal lives inside the sector: Goldman Sachs scaled back its Monte Carlo pricing effort after concluding practical advantage remains far off. No bank runs a quantum computer in live operations. The "100x speed" figures are controlled tests, and the finance slice of McKinsey's ~$2.7T-by-2035 value estimate is a T5 forecast, double-counted across verticals and unadjusted for inflation. Certified randomness is Band 1. Portfolio optimization and derivative pricing are Band 3 promise, and the amplitude-estimation speedup finance has chased for years needs fault-tolerant depth that erases the near-term gain.

------------------------------------------------------------------------

### Band 2 — Pilots with contested advantage

Nine industries have real quantum programs on real hardware, producing dated results — and every one of those results is either a controlled proof-of-concept matched by classical methods, or a quantum-annealing deployment whose advantage over a good classical solver is contested. This is the band where the word "advantage" earns its scare quotes. The workflows run. Whether a quantum machine *beats* the classical alternative on the same problem is the open question in almost every case.

#### Annealing in production: automotive and manufacturing

**Automotive** and **manufacturing** share the field's most-cited "quantum in production" claim, and it is worth stating precisely because it is both real and narrower than the headline. In 2024 Ford Otosan deployed a hybrid-quantum application in production on the Ford Transit line, cutting vehicle sequencing time roughly 50% (about 30 minutes to under 5 per ~1,000-vehicle run) (T3/T4). That is a legitimate deployed workflow in a live plant. It is also *quantum annealing* (D-Wave), solving a scheduling problem where the annealer competes head-to-head with classical solvers and the advantage is contested. D-Wave reported its first meaningful optimization revenue at its March 2025 user conference — real dollars, contested advantage (T4). The rest of automotive's quantum work — battery and electrolyte simulation (Hyundai + IonQ, Ford + Quantinuum, VW + IQM), fuel-cell catalyst modeling (BMW + Airbus + Quantinuum, oxygen reduction on platinum) — is small-molecule exploratory study far from design-grade accuracy (T4), sharing the fault-tolerance wall of chemistry. Manufacturing under-claims relative to finance and pharma, which is precisely what makes it one of the more grounded verticals. The near-term story is quantum-flavored optimization services that sometimes help. Gate-model manufacturing advantage is an end-of-decade proposition.

#### Optimization pilots: logistics, air-traffic, energy

**Logistics** produces the most demos and the least proven advantage of any industry, because small routing and scheduling instances run on today's hardware and photograph well. Volkswagen ran a traffic-routing pilot in Lisbon (2019). Airbus and IonQ demonstrated aircraft cargo loading via the MAL-VQA algorithm on trapped-ion hardware (T3). Deutsche Bahn and Cambridge Quantum studied train rescheduling with F-VQE on realistic timetables (T3). Every result is a small instance where Gurobi, CPLEX, and OR-Tools still win at production scale. The real near-term wins here come from *quantum-inspired* algorithms — classical methods borrowing quantum structure — which is honest classical progress with no quantum computer in the loop. The press blurs the two constantly.

**Air-traffic management** is the same optimization template with a higher wall in front of it: safety certification. Airbus and QC Ware challenges report eye-catching numbers ("~400% faster analysis," "~70% higher airspace utilization") that are competition results on constrained problems, frequently quantum-inspired, and not independently reproduced (T4). Method papers demonstrate QUBO traffic-flow, trajectory, and gate-scheduling on mini instances (T3). No air navigation service provider runs a quantum computer operationally, and aviation's certification bar is high and slow even after a proven advantage appears.

**Energy & utilities** has credible, dated, openly pre-commercial pilots. EDF, Pasqal, and GENCI demonstrated EV smart-charging and demand forecasting on neutral atoms at 100+ scale in January 2025, stated plainly as not commercially viable (T3/T4). ExxonMobil (the first energy major in the IBM Quantum Network, 2019) explores LNG shipping-route optimization; E.ON works grid and pricing algorithms with IBM (T4). Grid dispatch is a real, hard, valuable problem — and classical plus quantum-inspired solvers and D-Wave annealing currently match or beat gate-model quantum on the instances tried. No utility runs quantum in dispatch. The nearer-term energy payoff more plausibly comes from quantum *sensing* (fault detection, magnetometry) than from compute.

#### Simulation POCs: chemistry, pharma, nuclear, oil & gas

The simulation industries carry the strongest *theoretical* case in the whole map and, today, essentially zero production advantage. This is the most important distinction in the chapter to hold cleanly.

**Chemicals & materials** is where simulating quantum systems is literally what the machine is *for* — VQE and quantum phase estimation map onto electronic structure directly (T1). BASF works homogeneous catalysis with SEEQC and optimization with Kipu; Mitsubishi Chemical simulates excited states of photochromic molecules with PsiQuantum (T3/T4). But every named pilot is a research collaboration probing algorithms. None is a deployed design tool. Today's devices simulate only tiny molecules (<span class="math-span"> <svg class="math-inline" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="16.979072pt" height="13.444168pt" viewbox="-95.855049 -95.849674 16.979072 13.444168">
<defs>
<path id="g0-50" d="M2.247572-1.625903C2.375093-1.745455 2.709838-2.008468 2.83736-2.12005C3.331507-2.574346 3.801743-3.012702 3.801743-3.737983C3.801743-4.686426 3.004732-5.300125 2.008468-5.300125C1.052055-5.300125 .422416-4.574844 .422416-3.865504C.422416-3.474969 .73325-3.419178 .844832-3.419178C1.012204-3.419178 1.259278-3.53873 1.259278-3.841594C1.259278-4.25604 .860772-4.25604 .765131-4.25604C.996264-4.837858 1.530262-5.037111 1.920797-5.037111C2.662017-5.037111 3.044583-4.407472 3.044583-3.737983C3.044583-2.909091 2.462765-2.303362 1.522291-1.338979L.518057-.302864C.422416-.215193 .422416-.199253 .422416 0H3.57061L3.801743-1.42665H3.55467C3.53076-1.267248 3.466999-.868742 3.371357-.71731C3.323537-.653549 2.717808-.653549 2.590286-.653549H1.171606L2.247572-1.625903Z" />
<path id="g1-72" d="M7.137235-7.256787C7.137235-7.699128 7.173101-7.81868 8.033873-7.81868H8.272976V-8.16538C7.986052-8.141469 7.005729-8.141469 6.659029-8.141469C6.300374-8.141469 5.32005-8.141469 5.033126-8.16538V-7.81868H5.272229C6.133001-7.81868 6.168867-7.699128 6.168867-7.256787V-4.423412H2.594271V-7.256787C2.594271-7.699128 2.630137-7.81868 3.490909-7.81868H3.730012V-8.16538C3.443088-8.141469 2.462765-8.141469 2.116065-8.141469C1.75741-8.141469 .777086-8.141469 .490162-8.16538V-7.81868H.729265C1.590037-7.81868 1.625903-7.699128 1.625903-7.256787V-.908593C1.625903-.466252 1.590037-.3467 .729265-.3467H.490162V0C.777086-.02391 1.75741-.02391 2.10411-.02391C2.462765-.02391 3.443088-.02391 3.730012 0V-.3467H3.490909C2.630137-.3467 2.594271-.466252 2.594271-.908593V-4.076712H6.168867V-.908593C6.168867-.466252 6.133001-.3467 5.272229-.3467H5.033126V0C5.32005-.02391 6.300374-.02391 6.647073-.02391C7.005729-.02391 7.986052-.02391 8.272976 0V-.3467H8.033873C7.173101-.3467 7.137235-.466252 7.137235-.908593V-7.256787Z" />
</defs>
<g id="page1" transform="matrix(1.35 0 0 1.35 0 0)">
<use x="-71.00374" y="-62.834378" xlink:href="#g1-72" />
<use x="-62.228394" y="-61.041115" xlink:href="#g0-50" />
</g>
</svg></span>, <span class="math-span"> <svg class="math-inline" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="25.432396pt" height="11.023263pt" viewbox="-95.855049 -95.849674 25.432396 11.023263">
<defs>
<path id="g0-72" d="M7.137235-7.256787C7.137235-7.699128 7.173101-7.81868 8.033873-7.81868H8.272976V-8.16538C7.986052-8.141469 7.005729-8.141469 6.659029-8.141469C6.300374-8.141469 5.32005-8.141469 5.033126-8.16538V-7.81868H5.272229C6.133001-7.81868 6.168867-7.699128 6.168867-7.256787V-4.423412H2.594271V-7.256787C2.594271-7.699128 2.630137-7.81868 3.490909-7.81868H3.730012V-8.16538C3.443088-8.141469 2.462765-8.141469 2.116065-8.141469C1.75741-8.141469 .777086-8.141469 .490162-8.16538V-7.81868H.729265C1.590037-7.81868 1.625903-7.699128 1.625903-7.256787V-.908593C1.625903-.466252 1.590037-.3467 .729265-.3467H.490162V0C.777086-.02391 1.75741-.02391 2.10411-.02391C2.462765-.02391 3.443088-.02391 3.730012 0V-.3467H3.490909C2.630137-.3467 2.594271-.466252 2.594271-.908593V-4.076712H6.168867V-.908593C6.168867-.466252 6.133001-.3467 5.272229-.3467H5.033126V0C5.32005-.02391 6.300374-.02391 6.647073-.02391C7.005729-.02391 7.986052-.02391 8.272976 0V-.3467H8.033873C7.173101-.3467 7.137235-.466252 7.137235-.908593V-7.256787Z" />
<path id="g0-76" d="M6.814446-3.060523H6.551432C6.43188-1.865006 6.276463-.3467 4.184309-.3467H3.144209C2.618182-.3467 2.594271-.430386 2.594271-.824907V-7.244832C2.594271-7.675218 2.618182-7.81868 3.658281-7.81868H4.016936V-8.16538C3.670237-8.141469 2.618182-8.141469 2.199751-8.141469C1.841096-8.141469 .777086-8.141469 .490162-8.16538V-7.81868H.729265C1.590037-7.81868 1.625903-7.699128 1.625903-7.256787V-.908593C1.625903-.466252 1.590037-.3467 .729265-.3467H.490162V0H6.503611L6.814446-3.060523Z" />
<path id="g0-105" d="M2.080199-7.364384C2.080199-7.675218 1.829141-7.950187 1.494396-7.950187C1.183562-7.950187 .920548-7.699128 .920548-7.376339C.920548-7.017684 1.207472-6.790535 1.494396-6.790535C1.865006-6.790535 2.080199-7.10137 2.080199-7.364384ZM.430386-5.140722V-4.794022C1.195517-4.794022 1.303113-4.722291 1.303113-4.136488V-.884682C1.303113-.3467 1.171606-.3467 .394521-.3467V0C.729265-.02391 1.303113-.02391 1.649813-.02391C1.78132-.02391 2.47472-.02391 2.881196 0V-.3467C2.10411-.3467 2.056289-.406476 2.056289-.872727V-5.272229L.430386-5.140722Z" />
</defs>
<g id="page1" transform="matrix(1.35 0 0 1.35 0 0)">
<use x="-71.00374" y="-62.834378" xlink:href="#g0-76" />
<use x="-63.689566" y="-62.834378" xlink:href="#g0-105" />
<use x="-60.437905" y="-62.834378" xlink:href="#g0-72" />
</g>
</svg></span>, small actives) that classical DFT and coupled-cluster already match or beat, and GPU-accelerated classical chemistry keeps raising the bar (NVIDIA's cuEST — a CUDA-X electronic-structure library launched for chip-materials work — reports up to ~50x faster calculations for adopters including TSMC (T4), a reminder that quantum chemistry's near-term competition is classical HPC). A <span class="math-span"> <svg class="math-inline" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="53.272458pt" height="11.184658pt" viewbox="-95.855049 -95.849674 53.272458 11.184658">
<defs>
<path id="g0-70" d="M6.826401-8.141469H.490162V-7.79477H.729265C1.590037-7.79477 1.625903-7.675218 1.625903-7.232877V-.908593C1.625903-.466252 1.590037-.3467 .729265-.3467H.490162V0C.777086-.02391 1.841096-.02391 2.199751-.02391C2.618182-.02391 3.670237-.02391 4.016936 0V-.3467H3.658281C2.618182-.3467 2.594271-.490162 2.594271-.920548V-3.897385H3.646326C4.770112-3.897385 4.889664-3.502864 4.889664-2.49863H5.152677V-5.642839H4.889664C4.889664-4.638605 4.770112-4.244085 3.646326-4.244085H2.594271V-7.316563C2.594271-7.711083 2.618182-7.79477 3.144209-7.79477H4.638605C6.360149-7.79477 6.706849-7.161146 6.874222-5.475467H7.137235L6.826401-8.141469Z" />
<path id="g0-77" d="M2.749689-7.938232C2.666002-8.16538 2.654047-8.16538 2.379078-8.16538H.526027V-7.81868H.765131C1.625903-7.81868 1.661768-7.699128 1.661768-7.256787V-1.231382C1.661768-.908593 1.661768-.3467 .526027-.3467V0C.836862-.02391 1.470486-.02391 1.80523-.02391S2.773599-.02391 3.084433 0V-.3467C1.948692-.3467 1.948692-.908593 1.948692-1.231382V-7.758904H1.960648L4.841843-.227148C4.889664-.095641 4.925529 0 5.045081 0C5.152677 0 5.176588-.059776 5.248319-.239103L8.153425-7.81868H8.16538V-.908593C8.16538-.466252 8.129514-.3467 7.268742-.3467H7.029639V0C7.304608-.02391 8.261021-.02391 8.607721-.02391S9.910834-.02391 10.185803 0V-.3467H9.9467C9.085928-.3467 9.050062-.466252 9.050062-.908593V-7.256787C9.050062-7.699128 9.085928-7.81868 9.9467-7.81868H10.185803V-8.16538H8.332752C8.069738-8.16538 8.057783-8.153425 7.962142-7.926276L5.355915-1.123786L2.749689-7.938232Z" />
<path id="g0-99" d="M4.327771-4.423412C4.184309-4.423412 3.741968-4.423412 3.741968-3.93325C3.741968-3.646326 3.945205-3.443088 4.23213-3.443088C4.507098-3.443088 4.734247-3.610461 4.734247-3.957161C4.734247-4.758157 3.897385-5.332005 2.929016-5.332005C1.530262-5.332005 .418431-4.088667 .418431-2.582316C.418431-1.052055 1.566127 .119552 2.917061 .119552C4.495143 .119552 4.853798-1.315068 4.853798-1.422665S4.770112-1.530262 4.734247-1.530262C4.62665-1.530262 4.614695-1.494396 4.578829-1.350934C4.315816-.502117 3.670237-.143462 3.024658-.143462C2.295392-.143462 1.327024-.777086 1.327024-2.594271C1.327024-4.578829 2.343213-5.068991 2.940971-5.068991C3.395268-5.068991 4.052802-4.889664 4.327771-4.423412Z" />
<path id="g0-101" d="M4.578829-2.773599C4.841843-2.773599 4.865753-2.773599 4.865753-3.000747C4.865753-4.208219 4.220174-5.332005 2.773599-5.332005C1.41071-5.332005 .358655-4.100623 .358655-2.618182C.358655-1.0401 1.578082 .119552 2.905106 .119552C4.327771 .119552 4.865753-1.171606 4.865753-1.422665C4.865753-1.494396 4.805978-1.542217 4.734247-1.542217C4.638605-1.542217 4.614695-1.482441 4.590785-1.422665C4.27995-.418431 3.478954-.143462 2.976837-.143462S1.267248-.478207 1.267248-2.546451V-2.773599H4.578829ZM1.279203-3.000747C1.374844-4.877709 2.426899-5.092902 2.761644-5.092902C4.040847-5.092902 4.112578-3.407223 4.124533-3.000747H1.279203Z" />
<path id="g0-111" d="M5.487422-2.558406C5.487422-4.100623 4.315816-5.332005 2.929016-5.332005C1.494396-5.332005 .358655-4.064757 .358655-2.558406C.358655-1.028144 1.554172 .119552 2.917061 .119552C4.327771 .119552 5.487422-1.052055 5.487422-2.558406ZM2.929016-.143462C2.486675-.143462 1.948692-.334745 1.601993-.920548C1.279203-1.458531 1.267248-2.163885 1.267248-2.666002C1.267248-3.120299 1.267248-3.849564 1.637858-4.387547C1.972603-4.901619 2.49863-5.092902 2.917061-5.092902C3.383313-5.092902 3.88543-4.877709 4.208219-4.411457C4.578829-3.861519 4.578829-3.108344 4.578829-2.666002C4.578829-2.247572 4.578829-1.506351 4.267995-.944458C3.93325-.37061 3.383313-.143462 2.929016-.143462Z" />
</defs>
<g id="page1" transform="matrix(1.35 0 0 1.35 0 0)">
<use x="-71.00374" y="-62.834378" xlink:href="#g0-70" />
<use x="-64.339898" y="-62.834378" xlink:href="#g0-101" />
<use x="-59.13724" y="-62.834378" xlink:href="#g0-77" />
<use x="-48.410897" y="-62.834378" xlink:href="#g0-111" />
<use x="-42.232741" y="-62.834378" xlink:href="#g0-99" />
<use x="-37.030083" y="-62.834378" xlink:href="#g0-111" />
</g>
</svg></span>-class catalyst needs error-corrected machines with thousands of logical qubits. Strong theory, near-zero present-day advantage.

**Pharma & healthcare** is chemistry with a bigger prize and the same wall. The strongest signal to date is the Wellcome Leap Q4Bio prize (~April 2026, $2M) won by Algorithmiq, Cleveland Clinic, and IBM for simulating photodynamic-therapy processes on up to 100 qubits (T2/T3) — real chemistry circuits at scale, competitively judged, demonstrating a *path* rather than advantage over classical methods. Cleveland Clinic's on-site IBM System One (live 2023) anchors 50+ joint projects. AstraZeneca and IonQ reported a ~20x speedup on a drug-discovery *subroutine* (T4) — narrow, vendor-framed. No approved drug has been discovered by a quantum computer, and 2026 pharma reviews state plainly that no quantum computer yet simulates a drug-relevant molecule better than classical chemistry on the same system. Design-grade accuracy on hard active sites (<span class="math-span"> <svg class="math-inline" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="53.272458pt" height="11.184658pt" viewbox="-95.855049 -95.849674 53.272458 11.184658">
<defs>
<path id="g0-70" d="M6.826401-8.141469H.490162V-7.79477H.729265C1.590037-7.79477 1.625903-7.675218 1.625903-7.232877V-.908593C1.625903-.466252 1.590037-.3467 .729265-.3467H.490162V0C.777086-.02391 1.841096-.02391 2.199751-.02391C2.618182-.02391 3.670237-.02391 4.016936 0V-.3467H3.658281C2.618182-.3467 2.594271-.490162 2.594271-.920548V-3.897385H3.646326C4.770112-3.897385 4.889664-3.502864 4.889664-2.49863H5.152677V-5.642839H4.889664C4.889664-4.638605 4.770112-4.244085 3.646326-4.244085H2.594271V-7.316563C2.594271-7.711083 2.618182-7.79477 3.144209-7.79477H4.638605C6.360149-7.79477 6.706849-7.161146 6.874222-5.475467H7.137235L6.826401-8.141469Z" />
<path id="g0-77" d="M2.749689-7.938232C2.666002-8.16538 2.654047-8.16538 2.379078-8.16538H.526027V-7.81868H.765131C1.625903-7.81868 1.661768-7.699128 1.661768-7.256787V-1.231382C1.661768-.908593 1.661768-.3467 .526027-.3467V0C.836862-.02391 1.470486-.02391 1.80523-.02391S2.773599-.02391 3.084433 0V-.3467C1.948692-.3467 1.948692-.908593 1.948692-1.231382V-7.758904H1.960648L4.841843-.227148C4.889664-.095641 4.925529 0 5.045081 0C5.152677 0 5.176588-.059776 5.248319-.239103L8.153425-7.81868H8.16538V-.908593C8.16538-.466252 8.129514-.3467 7.268742-.3467H7.029639V0C7.304608-.02391 8.261021-.02391 8.607721-.02391S9.910834-.02391 10.185803 0V-.3467H9.9467C9.085928-.3467 9.050062-.466252 9.050062-.908593V-7.256787C9.050062-7.699128 9.085928-7.81868 9.9467-7.81868H10.185803V-8.16538H8.332752C8.069738-8.16538 8.057783-8.153425 7.962142-7.926276L5.355915-1.123786L2.749689-7.938232Z" />
<path id="g0-99" d="M4.327771-4.423412C4.184309-4.423412 3.741968-4.423412 3.741968-3.93325C3.741968-3.646326 3.945205-3.443088 4.23213-3.443088C4.507098-3.443088 4.734247-3.610461 4.734247-3.957161C4.734247-4.758157 3.897385-5.332005 2.929016-5.332005C1.530262-5.332005 .418431-4.088667 .418431-2.582316C.418431-1.052055 1.566127 .119552 2.917061 .119552C4.495143 .119552 4.853798-1.315068 4.853798-1.422665S4.770112-1.530262 4.734247-1.530262C4.62665-1.530262 4.614695-1.494396 4.578829-1.350934C4.315816-.502117 3.670237-.143462 3.024658-.143462C2.295392-.143462 1.327024-.777086 1.327024-2.594271C1.327024-4.578829 2.343213-5.068991 2.940971-5.068991C3.395268-5.068991 4.052802-4.889664 4.327771-4.423412Z" />
<path id="g0-101" d="M4.578829-2.773599C4.841843-2.773599 4.865753-2.773599 4.865753-3.000747C4.865753-4.208219 4.220174-5.332005 2.773599-5.332005C1.41071-5.332005 .358655-4.100623 .358655-2.618182C.358655-1.0401 1.578082 .119552 2.905106 .119552C4.327771 .119552 4.865753-1.171606 4.865753-1.422665C4.865753-1.494396 4.805978-1.542217 4.734247-1.542217C4.638605-1.542217 4.614695-1.482441 4.590785-1.422665C4.27995-.418431 3.478954-.143462 2.976837-.143462S1.267248-.478207 1.267248-2.546451V-2.773599H4.578829ZM1.279203-3.000747C1.374844-4.877709 2.426899-5.092902 2.761644-5.092902C4.040847-5.092902 4.112578-3.407223 4.124533-3.000747H1.279203Z" />
<path id="g0-111" d="M5.487422-2.558406C5.487422-4.100623 4.315816-5.332005 2.929016-5.332005C1.494396-5.332005 .358655-4.064757 .358655-2.558406C.358655-1.028144 1.554172 .119552 2.917061 .119552C4.327771 .119552 5.487422-1.052055 5.487422-2.558406ZM2.929016-.143462C2.486675-.143462 1.948692-.334745 1.601993-.920548C1.279203-1.458531 1.267248-2.163885 1.267248-2.666002C1.267248-3.120299 1.267248-3.849564 1.637858-4.387547C1.972603-4.901619 2.49863-5.092902 2.917061-5.092902C3.383313-5.092902 3.88543-4.877709 4.208219-4.411457C4.578829-3.861519 4.578829-3.108344 4.578829-2.666002C4.578829-2.247572 4.578829-1.506351 4.267995-.944458C3.93325-.37061 3.383313-.143462 2.929016-.143462Z" />
</defs>
<g id="page1" transform="matrix(1.35 0 0 1.35 0 0)">
<use x="-71.00374" y="-62.834378" xlink:href="#g0-70" />
<use x="-64.339898" y="-62.834378" xlink:href="#g0-101" />
<use x="-59.13724" y="-62.834378" xlink:href="#g0-77" />
<use x="-48.410897" y="-62.834378" xlink:href="#g0-111" />
<use x="-42.232741" y="-62.834378" xlink:href="#g0-99" />
<use x="-37.030083" y="-62.834378" xlink:href="#g0-111" />
</g>
</svg></span>, cytochrome P450) needs fault tolerance and millions of gates. Late 2020s into the 2030s.

**Nuclear & fusion** has the best *physics* pedigree of any young node and the widest gap to engineering value. Quantum computers have simulated light nuclei (deuteron, <span class="math-span"> <svg class="math-inline" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="24.131632pt" height="14.193762pt" viewbox="-95.182571 -96.183806 24.131632 14.193762">
<defs>
<path id="g1-72" d="M7.137235-7.256787C7.137235-7.699128 7.173101-7.81868 8.033873-7.81868H8.272976V-8.16538C7.986052-8.141469 7.005729-8.141469 6.659029-8.141469C6.300374-8.141469 5.32005-8.141469 5.033126-8.16538V-7.81868H5.272229C6.133001-7.81868 6.168867-7.699128 6.168867-7.256787V-4.423412H2.594271V-7.256787C2.594271-7.699128 2.630137-7.81868 3.490909-7.81868H3.730012V-8.16538C3.443088-8.141469 2.462765-8.141469 2.116065-8.141469C1.75741-8.141469 .777086-8.141469 .490162-8.16538V-7.81868H.729265C1.590037-7.81868 1.625903-7.699128 1.625903-7.256787V-.908593C1.625903-.466252 1.590037-.3467 .729265-.3467H.490162V0C.777086-.02391 1.75741-.02391 2.10411-.02391C2.462765-.02391 3.443088-.02391 3.730012 0V-.3467H3.490909C2.630137-.3467 2.594271-.466252 2.594271-.908593V-4.076712H6.168867V-.908593C6.168867-.466252 6.133001-.3467 5.272229-.3467H5.033126V0C5.32005-.02391 6.300374-.02391 6.647073-.02391C7.005729-.02391 7.986052-.02391 8.272976 0V-.3467H8.033873C7.173101-.3467 7.137235-.466252 7.137235-.908593V-7.256787Z" />
<path id="g1-101" d="M4.578829-2.773599C4.841843-2.773599 4.865753-2.773599 4.865753-3.000747C4.865753-4.208219 4.220174-5.332005 2.773599-5.332005C1.41071-5.332005 .358655-4.100623 .358655-2.618182C.358655-1.0401 1.578082 .119552 2.905106 .119552C4.327771 .119552 4.865753-1.171606 4.865753-1.422665C4.865753-1.494396 4.805978-1.542217 4.734247-1.542217C4.638605-1.542217 4.614695-1.482441 4.590785-1.422665C4.27995-.418431 3.478954-.143462 2.976837-.143462S1.267248-.478207 1.267248-2.546451V-2.773599H4.578829ZM1.279203-3.000747C1.374844-4.877709 2.426899-5.092902 2.761644-5.092902C4.040847-5.092902 4.112578-3.407223 4.124533-3.000747H1.279203Z" />
<path id="g0-52" d="M3.140224-5.156663C3.140224-5.316065 3.140224-5.379826 2.972852-5.379826C2.86924-5.379826 2.86127-5.371856 2.781569-5.260274L.239103-1.570112V-1.307098H2.486675V-.645579C2.486675-.350685 2.462765-.263014 1.849066-.263014H1.665753V0C2.343213-.02391 2.359153-.02391 2.81345-.02391S3.283686-.02391 3.961146 0V-.263014H3.777833C3.164134-.263014 3.140224-.350685 3.140224-.645579V-1.307098H3.985056V-1.570112H3.140224V-5.156663ZM2.542466-4.511083V-1.570112H.518057L2.542466-4.511083Z" />
</defs>
<g id="page1" transform="matrix(1.35 0 0 1.35 0 0)">
<use x="-70.505608" y="-65.867438" xlink:href="#g0-52" />
<use x="-66.271425" y="-60.852917" xlink:href="#g1-72" />
<use x="-57.496079" y="-60.852917" xlink:href="#g1-101" />
</g>
</svg></span>-scale binding energies) on superconducting and trapped-ion hardware since ~2018 — solid nuclear-physics results (T2/T3). QAOA is framed for tokamak plasma-stability optimization (T3). But fusion's bottleneck is engineering and confinement, its modeling is elite classical HPC (M3D-C1, JOREK, NIMROD), and quantum methods sit at the review-and-small-demo stage. Real science, no engineering payoff yet.

**Oil & gas** is the band's cautionary tale on TAM. Shell and D-Wave applied annealing to North Sea reservoir mapping (framed weeks-to-hours) (T4); ExxonMobil and bp explore reservoir simulation with IBM (T4); seismic inversion appears as QUBO formulations on toy instances (T3). No operator runs quantum in its production geophysics pipeline. Against this sits "$2.6T oil-and-gas quantum impact by 2035, ~30% CAGR" (T5) — among the most inflated forecasts in the atlas. Grade it hardest. The nearer-term extractive thread is quantum *sensing* (cold-atom gravimeters, NV magnetometers), which is why mining was split out into its own Band 1 node.

------------------------------------------------------------------------

### Band 3 — Promise only

Ten industries have quantum programs that are, honestly, method papers, consortium memberships, vendor SDKs, and forecasts. The hardware runs toy problems. Classical methods match or beat every result. No deployment exists. These nodes belong on the map for completeness and for what they teach: this is where the optimization-and-simulation advantage is *entirely* promise, and where the TAM reports do the loudest talking.

#### Gate-model optimization, spread thin: government, retail, insurance, construction

Four industries run the same QUBO/QAOA optimization pitch — combinatorial matching, anomaly detection, scheduling — that finance runs, one or more adoption steps behind and with no deployment.

**Government services** has no quantum computer running in any tax, customs, or census agency. The substantive work is QUBO fraud detection via community detection in transaction graphs, on toy data (T3). The instructive trap is the mislabel: HMRC's £175M Quantexa contract to hunt tax fraud is classical AI despite the "Quant-" branding, and much "quantum government" press is exactly this pattern — AI relabeled, or PQC work that belongs in cybersecurity. The real government quantum program is defensive PQC migration.

**Retail** is one of the thinnest pitches on the map. Demand forecasting, dynamic pricing, and assortment reduce to problems where classical ML and modern MILP are strong and cheap, so the quantum bar is high and unmet. QNN forecasting demos run on benchmark data with no advantage (T3). The visible "activity" is dominated by market-sizing reports (a "quantum-enhanced demand forecasting" market projected ~$2B→~$2.64B, ~32% CAGR (T5)) and one vendor acquisition. No retailer runs quantum hardware. Grade the TAM hardest here.

**Insurance & risk** is finance's cousin, one adoption step behind with fewer named pilots. Monte Carlo catastrophe modeling and reinsurance capital optimization appear as peer-reviewed numerical demonstrations on small instances (T3), plus Allstate's Chicago Quantum Exchange membership (T4). The theoretical hook — quadratic amplitude-estimation speedup — is the same one finance never realized in production, because it needs fault-tolerant depth. No deployment.

**Construction & built environment** is an early academic node with no industrial pilot running quantum hardware in the loop. Its own literature admits ~42% of "quantum in construction" research is actually quantum *materials* science, and compute applications are "predominantly theoretical and confined to small-scale simulations." QUBO scheduling demos exist; classical MILP still beats them (T3).

#### Quantum machine learning: the hype-inflated corner

**AI & machine learning** is where skepticism should be maximal, and the map grades it hardest by design. Quantum ML circuits run and classify toy datasets — feasibility only, no advantage (T3/T4). The decisive history is *dequantization*: Tang's 2019 classical algorithm inspired by quantum recommendation systems matched the claimed speedup, and successors retroactively erased several QML "advantages." Loading classical data into quantum states (the qRAM I/O bottleneck) often erases any theoretical gain before it starts. The dominant tooling — NVIDIA CUDA-Q, cuQuantum — is *classical GPU simulation* of quantum circuits, which tells you where the compute actually runs. Business leaders who bet on "quantum AI" in 2025 largely walked it back. The science is worth following. The near-term product is not. Realistic advantage: unproven, possibly never for mainstream ML, plausibly a niche for quantum-native data.

#### Distant killer apps: climate, agriculture

Two industries are downstream of quantum chemistry, and they hold the textbook "killer app" — nitrogen fixation — at a distance that the honest number makes concrete.

**Climate & sustainability** is largely applied chemistry: catalysts for <span class="math-span"> <svg class="math-inline" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="28.836964pt" height="13.783097pt" viewbox="-95.855049 -96.188603 28.836964 13.783097">
<defs>
<path id="g0-50" d="M2.247572-1.625903C2.375093-1.745455 2.709838-2.008468 2.83736-2.12005C3.331507-2.574346 3.801743-3.012702 3.801743-3.737983C3.801743-4.686426 3.004732-5.300125 2.008468-5.300125C1.052055-5.300125 .422416-4.574844 .422416-3.865504C.422416-3.474969 .73325-3.419178 .844832-3.419178C1.012204-3.419178 1.259278-3.53873 1.259278-3.841594C1.259278-4.25604 .860772-4.25604 .765131-4.25604C.996264-4.837858 1.530262-5.037111 1.920797-5.037111C2.662017-5.037111 3.044583-4.407472 3.044583-3.737983C3.044583-2.909091 2.462765-2.303362 1.522291-1.338979L.518057-.302864C.422416-.215193 .422416-.199253 .422416 0H3.57061L3.801743-1.42665H3.55467C3.53076-1.267248 3.466999-.868742 3.371357-.71731C3.323537-.653549 2.717808-.653549 2.590286-.653549H1.171606L2.247572-1.625903Z" />
<path id="g1-67" d="M7.79477-8.141469C7.79477-8.356663 7.79477-8.416438 7.675218-8.416438C7.603487-8.416438 7.591532-8.392528 7.519801-8.272976L6.933998-7.328518C6.396015-7.998007 5.583064-8.416438 4.722291-8.416438C2.534496-8.416438 .645579-6.527522 .645579-4.088667C.645579-1.613948 2.558406 .251059 4.722291 .251059C6.682939 .251059 7.79477-1.458531 7.79477-2.773599C7.79477-2.905106 7.79477-2.976837 7.663263-2.976837C7.543711-2.976837 7.531756-2.917061 7.531756-2.833375C7.424159-.932503 6.03736-.095641 4.877709-.095641C4.040847-.095641 1.75741-.597758 1.75741-4.088667C1.75741-7.543711 4.004981-8.069738 4.865753-8.069738C6.121046-8.069738 7.220922-7.005729 7.460025-5.212453C7.483935-5.068991 7.483935-5.033126 7.627397-5.033126C7.79477-5.033126 7.79477-5.068991 7.79477-5.308095V-8.141469Z" />
<path id="g1-79" d="M8.452304-4.052802C8.452304-6.527522 6.635118-8.416438 4.554919-8.416438C2.426899-8.416438 .645579-6.503611 .645579-4.052802C.645579-1.625903 2.450809 .251059 4.542964 .251059C6.682939 .251059 8.452304-1.649813 8.452304-4.052802ZM4.554919-.02391C3.335492-.02391 1.75741-1.171606 1.75741-4.23213C1.75741-7.161146 3.419178-8.153425 4.542964-8.153425C5.726526-8.153425 7.340473-7.12528 7.340473-4.23213C7.340473-1.123786 5.71457-.02391 4.554919-.02391Z" />
</defs>
<g id="page1" transform="matrix(1.35 0 0 1.35 0 0)">
<use x="-71.00374" y="-62.834378" xlink:href="#g1-67" />
<use x="-62.549421" y="-62.834378" xlink:href="#g1-79" />
<use x="-53.444769" y="-61.041115" xlink:href="#g0-50" />
</g>
</svg></span> capture, and cracking the <span class="math-span"> <svg class="math-inline" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="53.272458pt" height="11.184658pt" viewbox="-95.855049 -95.849674 53.272458 11.184658">
<defs>
<path id="g0-70" d="M6.826401-8.141469H.490162V-7.79477H.729265C1.590037-7.79477 1.625903-7.675218 1.625903-7.232877V-.908593C1.625903-.466252 1.590037-.3467 .729265-.3467H.490162V0C.777086-.02391 1.841096-.02391 2.199751-.02391C2.618182-.02391 3.670237-.02391 4.016936 0V-.3467H3.658281C2.618182-.3467 2.594271-.490162 2.594271-.920548V-3.897385H3.646326C4.770112-3.897385 4.889664-3.502864 4.889664-2.49863H5.152677V-5.642839H4.889664C4.889664-4.638605 4.770112-4.244085 3.646326-4.244085H2.594271V-7.316563C2.594271-7.711083 2.618182-7.79477 3.144209-7.79477H4.638605C6.360149-7.79477 6.706849-7.161146 6.874222-5.475467H7.137235L6.826401-8.141469Z" />
<path id="g0-77" d="M2.749689-7.938232C2.666002-8.16538 2.654047-8.16538 2.379078-8.16538H.526027V-7.81868H.765131C1.625903-7.81868 1.661768-7.699128 1.661768-7.256787V-1.231382C1.661768-.908593 1.661768-.3467 .526027-.3467V0C.836862-.02391 1.470486-.02391 1.80523-.02391S2.773599-.02391 3.084433 0V-.3467C1.948692-.3467 1.948692-.908593 1.948692-1.231382V-7.758904H1.960648L4.841843-.227148C4.889664-.095641 4.925529 0 5.045081 0C5.152677 0 5.176588-.059776 5.248319-.239103L8.153425-7.81868H8.16538V-.908593C8.16538-.466252 8.129514-.3467 7.268742-.3467H7.029639V0C7.304608-.02391 8.261021-.02391 8.607721-.02391S9.910834-.02391 10.185803 0V-.3467H9.9467C9.085928-.3467 9.050062-.466252 9.050062-.908593V-7.256787C9.050062-7.699128 9.085928-7.81868 9.9467-7.81868H10.185803V-8.16538H8.332752C8.069738-8.16538 8.057783-8.153425 7.962142-7.926276L5.355915-1.123786L2.749689-7.938232Z" />
<path id="g0-99" d="M4.327771-4.423412C4.184309-4.423412 3.741968-4.423412 3.741968-3.93325C3.741968-3.646326 3.945205-3.443088 4.23213-3.443088C4.507098-3.443088 4.734247-3.610461 4.734247-3.957161C4.734247-4.758157 3.897385-5.332005 2.929016-5.332005C1.530262-5.332005 .418431-4.088667 .418431-2.582316C.418431-1.052055 1.566127 .119552 2.917061 .119552C4.495143 .119552 4.853798-1.315068 4.853798-1.422665S4.770112-1.530262 4.734247-1.530262C4.62665-1.530262 4.614695-1.494396 4.578829-1.350934C4.315816-.502117 3.670237-.143462 3.024658-.143462C2.295392-.143462 1.327024-.777086 1.327024-2.594271C1.327024-4.578829 2.343213-5.068991 2.940971-5.068991C3.395268-5.068991 4.052802-4.889664 4.327771-4.423412Z" />
<path id="g0-101" d="M4.578829-2.773599C4.841843-2.773599 4.865753-2.773599 4.865753-3.000747C4.865753-4.208219 4.220174-5.332005 2.773599-5.332005C1.41071-5.332005 .358655-4.100623 .358655-2.618182C.358655-1.0401 1.578082 .119552 2.905106 .119552C4.327771 .119552 4.865753-1.171606 4.865753-1.422665C4.865753-1.494396 4.805978-1.542217 4.734247-1.542217C4.638605-1.542217 4.614695-1.482441 4.590785-1.422665C4.27995-.418431 3.478954-.143462 2.976837-.143462S1.267248-.478207 1.267248-2.546451V-2.773599H4.578829ZM1.279203-3.000747C1.374844-4.877709 2.426899-5.092902 2.761644-5.092902C4.040847-5.092902 4.112578-3.407223 4.124533-3.000747H1.279203Z" />
<path id="g0-111" d="M5.487422-2.558406C5.487422-4.100623 4.315816-5.332005 2.929016-5.332005C1.494396-5.332005 .358655-4.064757 .358655-2.558406C.358655-1.028144 1.554172 .119552 2.917061 .119552C4.327771 .119552 5.487422-1.052055 5.487422-2.558406ZM2.929016-.143462C2.486675-.143462 1.948692-.334745 1.601993-.920548C1.279203-1.458531 1.267248-2.163885 1.267248-2.666002C1.267248-3.120299 1.267248-3.849564 1.637858-4.387547C1.972603-4.901619 2.49863-5.092902 2.917061-5.092902C3.383313-5.092902 3.88543-4.877709 4.208219-4.411457C4.578829-3.861519 4.578829-3.108344 4.578829-2.666002C4.578829-2.247572 4.578829-1.506351 4.267995-.944458C3.93325-.37061 3.383313-.143462 2.929016-.143462Z" />
</defs>
<g id="page1" transform="matrix(1.35 0 0 1.35 0 0)">
<use x="-71.00374" y="-62.834378" xlink:href="#g0-70" />
<use x="-64.339898" y="-62.834378" xlink:href="#g0-101" />
<use x="-59.13724" y="-62.834378" xlink:href="#g0-77" />
<use x="-48.410897" y="-62.834378" xlink:href="#g0-111" />
<use x="-42.232741" y="-62.834378" xlink:href="#g0-99" />
<use x="-37.030083" y="-62.834378" xlink:href="#g0-111" />
</g>
</svg></span> nitrogenase problem to replace energy-hungry Haber-Bosch (<span class="math-span"> <svg class="math-inline" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="146.612757pt" height="13.670121pt" viewbox="-95.855049 -95.849674 146.612757 13.670121">
<defs>
<path id="g1-50" d="M2.247572-1.625903C2.375093-1.745455 2.709838-2.008468 2.83736-2.12005C3.331507-2.574346 3.801743-3.012702 3.801743-3.737983C3.801743-4.686426 3.004732-5.300125 2.008468-5.300125C1.052055-5.300125 .422416-4.574844 .422416-3.865504C.422416-3.474969 .73325-3.419178 .844832-3.419178C1.012204-3.419178 1.259278-3.53873 1.259278-3.841594C1.259278-4.25604 .860772-4.25604 .765131-4.25604C.996264-4.837858 1.530262-5.037111 1.920797-5.037111C2.662017-5.037111 3.044583-4.407472 3.044583-3.737983C3.044583-2.909091 2.462765-2.303362 1.522291-1.338979L.518057-.302864C.422416-.215193 .422416-.199253 .422416 0H3.57061L3.801743-1.42665H3.55467C3.53076-1.267248 3.466999-.868742 3.371357-.71731C3.323537-.653549 2.717808-.653549 2.590286-.653549H1.171606L2.247572-1.625903Z" />
<path id="g1-51" d="M2.016438-2.662017C2.646077-2.662017 3.044583-2.199751 3.044583-1.362889C3.044583-.366625 2.478705-.071731 2.056289-.071731C1.617933-.071731 1.020174-.231133 .74122-.653549C1.028144-.653549 1.227397-.836862 1.227397-1.099875C1.227397-1.354919 1.044085-1.538232 .789041-1.538232C.573848-1.538232 .350685-1.40274 .350685-1.083935C.350685-.326775 1.163636 .167372 2.072229 .167372C3.132254 .167372 3.873474-.565878 3.873474-1.362889C3.873474-2.024408 3.347447-2.630137 2.534496-2.805479C3.164134-3.028643 3.634371-3.57061 3.634371-4.208219S2.917061-5.300125 2.088169-5.300125C1.235367-5.300125 .589788-4.837858 .589788-4.23213C.589788-3.937235 .789041-3.809714 .996264-3.809714C1.243337-3.809714 1.40274-3.985056 1.40274-4.216189C1.40274-4.511083 1.147696-4.622665 .972354-4.630635C1.307098-5.068991 1.920797-5.092902 2.064259-5.092902C2.271482-5.092902 2.87721-5.029141 2.87721-4.208219C2.87721-3.650311 2.646077-3.315567 2.534496-3.188045C2.295392-2.940971 2.11208-2.925031 1.625903-2.893151C1.474471-2.885181 1.41071-2.87721 1.41071-2.773599C1.41071-2.662017 1.482441-2.662017 1.617933-2.662017H2.016438Z" />
<path id="g0-0" d="M7.878456-2.749689C8.081694-2.749689 8.296887-2.749689 8.296887-2.988792S8.081694-3.227895 7.878456-3.227895H1.41071C1.207472-3.227895 .992279-3.227895 .992279-2.988792S1.207472-2.749689 1.41071-2.749689H7.878456Z" />
<path id="g0-33" d="M9.97061-2.749689C9.313076-2.247572 8.990286-1.75741 8.894645-1.601993C8.356663-.777086 8.261021-.02391 8.261021-.011955C8.261021 .131507 8.404483 .131507 8.500125 .131507C8.703362 .131507 8.715318 .107597 8.763138-.107597C9.038107-1.279203 9.743462-2.283437 11.094396-2.833375C11.237858-2.881196 11.273724-2.905106 11.273724-2.988792S11.201993-3.108344 11.178082-3.120299C10.652055-3.323537 9.205479-3.921295 8.751183-5.929763C8.715318-6.073225 8.703362-6.109091 8.500125-6.109091C8.404483-6.109091 8.261021-6.109091 8.261021-5.965629C8.261021-5.941719 8.368618-5.188543 8.870735-4.387547C9.109838-4.028892 9.456538-3.610461 9.97061-3.227895H1.08792C.872727-3.227895 .657534-3.227895 .657534-2.988792S.872727-2.749689 1.08792-2.749689H9.97061Z" />
<path id="g2-43" d="M4.770112-2.761644H8.069738C8.237111-2.761644 8.452304-2.761644 8.452304-2.976837C8.452304-3.203985 8.249066-3.203985 8.069738-3.203985H4.770112V-6.503611C4.770112-6.670984 4.770112-6.886177 4.554919-6.886177C4.327771-6.886177 4.327771-6.682939 4.327771-6.503611V-3.203985H1.028144C.860772-3.203985 .645579-3.203985 .645579-2.988792C.645579-2.761644 .848817-2.761644 1.028144-2.761644H4.327771V.537983C4.327771 .705355 4.327771 .920548 4.542964 .920548C4.770112 .920548 4.770112 .71731 4.770112 .537983V-2.761644Z" />
<path id="g2-50" d="M5.260274-2.008468H4.99726C4.961395-1.80523 4.865753-1.147696 4.746202-.956413C4.662516-.848817 3.981071-.848817 3.622416-.848817H1.41071C1.733499-1.123786 2.462765-1.888917 2.773599-2.175841C4.590785-3.849564 5.260274-4.471233 5.260274-5.654795C5.260274-7.029639 4.172354-7.950187 2.785554-7.950187S.585803-6.766625 .585803-5.738481C.585803-5.128767 1.111831-5.128767 1.147696-5.128767C1.398755-5.128767 1.709589-5.308095 1.709589-5.69066C1.709589-6.025405 1.482441-6.252553 1.147696-6.252553C1.0401-6.252553 1.016189-6.252553 .980324-6.240598C1.207472-7.053549 1.853051-7.603487 2.630137-7.603487C3.646326-7.603487 4.267995-6.75467 4.267995-5.654795C4.267995-4.638605 3.682192-3.753923 3.000747-2.988792L.585803-.286924V0H4.94944L5.260274-2.008468Z" />
<path id="g2-51" d="M2.199751-4.291905C1.996513-4.27995 1.948692-4.267995 1.948692-4.160399C1.948692-4.040847 2.008468-4.040847 2.223661-4.040847H2.773599C3.789788-4.040847 4.244085-3.203985 4.244085-2.056289C4.244085-.490162 3.431133-.071731 2.84533-.071731C2.271482-.071731 1.291158-.3467 .944458-1.135741C1.327024-1.075965 1.673724-1.291158 1.673724-1.721544C1.673724-2.068244 1.422665-2.307347 1.08792-2.307347C.800996-2.307347 .490162-2.139975 .490162-1.685679C.490162-.621669 1.554172 .251059 2.881196 .251059C4.303861 .251059 5.355915-.836862 5.355915-2.044334C5.355915-3.144209 4.471233-4.004981 3.323537-4.208219C4.363636-4.507098 5.033126-5.379826 5.033126-6.312329C5.033126-7.256787 4.052802-7.950187 2.893151-7.950187C1.697634-7.950187 .812951-7.220922 .812951-6.348194C.812951-5.869988 1.183562-5.774346 1.362889-5.774346C1.613948-5.774346 1.900872-5.953674 1.900872-6.312329C1.900872-6.694894 1.613948-6.862267 1.350934-6.862267C1.279203-6.862267 1.255293-6.862267 1.219427-6.850311C1.673724-7.663263 2.797509-7.663263 2.857285-7.663263C3.251806-7.663263 4.028892-7.483935 4.028892-6.312329C4.028892-6.085181 3.993026-5.415691 3.646326-4.901619C3.287671-4.375592 2.881196-4.339726 2.558406-4.327771L2.199751-4.291905Z" />
<path id="g2-72" d="M7.137235-7.256787C7.137235-7.699128 7.173101-7.81868 8.033873-7.81868H8.272976V-8.16538C7.986052-8.141469 7.005729-8.141469 6.659029-8.141469C6.300374-8.141469 5.32005-8.141469 5.033126-8.16538V-7.81868H5.272229C6.133001-7.81868 6.168867-7.699128 6.168867-7.256787V-4.423412H2.594271V-7.256787C2.594271-7.699128 2.630137-7.81868 3.490909-7.81868H3.730012V-8.16538C3.443088-8.141469 2.462765-8.141469 2.116065-8.141469C1.75741-8.141469 .777086-8.141469 .490162-8.16538V-7.81868H.729265C1.590037-7.81868 1.625903-7.699128 1.625903-7.256787V-.908593C1.625903-.466252 1.590037-.3467 .729265-.3467H.490162V0C.777086-.02391 1.75741-.02391 2.10411-.02391C2.462765-.02391 3.443088-.02391 3.730012 0V-.3467H3.490909C2.630137-.3467 2.594271-.466252 2.594271-.908593V-4.076712H6.168867V-.908593C6.168867-.466252 6.133001-.3467 5.272229-.3467H5.033126V0C5.32005-.02391 6.300374-.02391 6.647073-.02391C7.005729-.02391 7.986052-.02391 8.272976 0V-.3467H8.033873C7.173101-.3467 7.137235-.466252 7.137235-.908593V-7.256787Z" />
<path id="g2-78" d="M2.701868-7.998007C2.594271-8.153425 2.582316-8.16538 2.319303-8.16538H.490162V-7.81868C1.004234-7.81868 1.303113-7.81868 1.625903-7.734994V-1.255293C1.625903-.908593 1.625903-.3467 .490162-.3467V0C.800996-.02391 1.43462-.02391 1.769365-.02391S2.737733-.02391 3.048568 0V-.3467C1.912827-.3467 1.912827-.908593 1.912827-1.255293V-7.543711C2.008468-7.44807 2.008468-7.424159 2.116065-7.280697L6.77858-.179328C6.898132-.011955 6.910087 0 6.993773 0C7.10137 0 7.12528-.047821 7.137235-.071731V-6.910087C7.137235-7.256787 7.137235-7.81868 8.272976-7.81868V-8.16538C7.962142-8.141469 7.328518-8.141469 6.993773-8.141469S6.025405-8.141469 5.71457-8.16538V-7.81868C6.850311-7.81868 6.850311-7.256787 6.850311-6.910087V-1.685679L2.701868-7.998007Z" />
</defs>
<g id="page1" transform="matrix(1.35 0 0 1.35 0 0)">
<use x="-71.00374" y="-62.834378" xlink:href="#g2-78" />
<use x="-62.228394" y="-61.041115" xlink:href="#g1-50" />
<use x="-54.839415" y="-62.834378" xlink:href="#g2-43" />
<use x="-43.0781" y="-62.834378" xlink:href="#g2-51" />
<use x="-35.232612" y="-62.834378" xlink:href="#g2-72" />
<use x="-26.457266" y="-61.041115" xlink:href="#g1-50" />
<use x="-18.404121" y="-62.834378" xlink:href="#g0-0" />
<use x="-12.675664" y="-62.834378" xlink:href="#g0-0" />
<use x="-6.947359" y="-62.834378" xlink:href="#g0-33" />
<use x="8.328669" y="-62.834378" xlink:href="#g2-50" />
<use x="16.174157" y="-62.834378" xlink:href="#g2-78" />
<use x="24.949503" y="-62.834378" xlink:href="#g2-72" />
<use x="33.724827" y="-61.041115" xlink:href="#g1-51" />
</g>
</svg></span>), a reaction that consumes ~1-2% of world energy. In October 2025 Alice & Bob published a resource *estimate* for simulating <span class="math-span"> <svg class="math-inline" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="53.272458pt" height="11.184658pt" viewbox="-95.855049 -95.849674 53.272458 11.184658">
<defs>
<path id="g0-70" d="M6.826401-8.141469H.490162V-7.79477H.729265C1.590037-7.79477 1.625903-7.675218 1.625903-7.232877V-.908593C1.625903-.466252 1.590037-.3467 .729265-.3467H.490162V0C.777086-.02391 1.841096-.02391 2.199751-.02391C2.618182-.02391 3.670237-.02391 4.016936 0V-.3467H3.658281C2.618182-.3467 2.594271-.490162 2.594271-.920548V-3.897385H3.646326C4.770112-3.897385 4.889664-3.502864 4.889664-2.49863H5.152677V-5.642839H4.889664C4.889664-4.638605 4.770112-4.244085 3.646326-4.244085H2.594271V-7.316563C2.594271-7.711083 2.618182-7.79477 3.144209-7.79477H4.638605C6.360149-7.79477 6.706849-7.161146 6.874222-5.475467H7.137235L6.826401-8.141469Z" />
<path id="g0-77" d="M2.749689-7.938232C2.666002-8.16538 2.654047-8.16538 2.379078-8.16538H.526027V-7.81868H.765131C1.625903-7.81868 1.661768-7.699128 1.661768-7.256787V-1.231382C1.661768-.908593 1.661768-.3467 .526027-.3467V0C.836862-.02391 1.470486-.02391 1.80523-.02391S2.773599-.02391 3.084433 0V-.3467C1.948692-.3467 1.948692-.908593 1.948692-1.231382V-7.758904H1.960648L4.841843-.227148C4.889664-.095641 4.925529 0 5.045081 0C5.152677 0 5.176588-.059776 5.248319-.239103L8.153425-7.81868H8.16538V-.908593C8.16538-.466252 8.129514-.3467 7.268742-.3467H7.029639V0C7.304608-.02391 8.261021-.02391 8.607721-.02391S9.910834-.02391 10.185803 0V-.3467H9.9467C9.085928-.3467 9.050062-.466252 9.050062-.908593V-7.256787C9.050062-7.699128 9.085928-7.81868 9.9467-7.81868H10.185803V-8.16538H8.332752C8.069738-8.16538 8.057783-8.153425 7.962142-7.926276L5.355915-1.123786L2.749689-7.938232Z" />
<path id="g0-99" d="M4.327771-4.423412C4.184309-4.423412 3.741968-4.423412 3.741968-3.93325C3.741968-3.646326 3.945205-3.443088 4.23213-3.443088C4.507098-3.443088 4.734247-3.610461 4.734247-3.957161C4.734247-4.758157 3.897385-5.332005 2.929016-5.332005C1.530262-5.332005 .418431-4.088667 .418431-2.582316C.418431-1.052055 1.566127 .119552 2.917061 .119552C4.495143 .119552 4.853798-1.315068 4.853798-1.422665S4.770112-1.530262 4.734247-1.530262C4.62665-1.530262 4.614695-1.494396 4.578829-1.350934C4.315816-.502117 3.670237-.143462 3.024658-.143462C2.295392-.143462 1.327024-.777086 1.327024-2.594271C1.327024-4.578829 2.343213-5.068991 2.940971-5.068991C3.395268-5.068991 4.052802-4.889664 4.327771-4.423412Z" />
<path id="g0-101" d="M4.578829-2.773599C4.841843-2.773599 4.865753-2.773599 4.865753-3.000747C4.865753-4.208219 4.220174-5.332005 2.773599-5.332005C1.41071-5.332005 .358655-4.100623 .358655-2.618182C.358655-1.0401 1.578082 .119552 2.905106 .119552C4.327771 .119552 4.865753-1.171606 4.865753-1.422665C4.865753-1.494396 4.805978-1.542217 4.734247-1.542217C4.638605-1.542217 4.614695-1.482441 4.590785-1.422665C4.27995-.418431 3.478954-.143462 2.976837-.143462S1.267248-.478207 1.267248-2.546451V-2.773599H4.578829ZM1.279203-3.000747C1.374844-4.877709 2.426899-5.092902 2.761644-5.092902C4.040847-5.092902 4.112578-3.407223 4.124533-3.000747H1.279203Z" />
<path id="g0-111" d="M5.487422-2.558406C5.487422-4.100623 4.315816-5.332005 2.929016-5.332005C1.494396-5.332005 .358655-4.064757 .358655-2.558406C.358655-1.028144 1.554172 .119552 2.917061 .119552C4.327771 .119552 5.487422-1.052055 5.487422-2.558406ZM2.929016-.143462C2.486675-.143462 1.948692-.334745 1.601993-.920548C1.279203-1.458531 1.267248-2.163885 1.267248-2.666002C1.267248-3.120299 1.267248-3.849564 1.637858-4.387547C1.972603-4.901619 2.49863-5.092902 2.917061-5.092902C3.383313-5.092902 3.88543-4.877709 4.208219-4.411457C4.578829-3.861519 4.578829-3.108344 4.578829-2.666002C4.578829-2.247572 4.578829-1.506351 4.267995-.944458C3.93325-.37061 3.383313-.143462 2.929016-.143462Z" />
</defs>
<g id="page1" transform="matrix(1.35 0 0 1.35 0 0)">
<use x="-71.00374" y="-62.834378" xlink:href="#g0-70" />
<use x="-64.339898" y="-62.834378" xlink:href="#g0-101" />
<use x="-59.13724" y="-62.834378" xlink:href="#g0-77" />
<use x="-48.410897" y="-62.834378" xlink:href="#g0-111" />
<use x="-42.232741" y="-62.834378" xlink:href="#g0-99" />
<use x="-37.030083" y="-62.834378" xlink:href="#g0-111" />
</g>
</svg></span> on cat qubits: ~99,000 physical qubits, a ~27x reduction against the 2.7-million-qubit configuration Alice & Bob benchmarked. That 2.7M baseline sits inside the few-million-physical-qubit range of the 2021 Google/Lee study, whose headline estimate is ~4 million physical qubits (~2,100 logical) — the same numbers Chapter 8 uses (T3). Read both halves of the result. The 27x reduction is worth reporting. The ~99,000 physical qubits, thousands of logical qubits under error correction, describe hardware that does not exist and is years to a decade-plus away. Present-day climate value from quantum computers is essentially zero.

**Agriculture & food science** shares the same <span class="math-span"> <svg class="math-inline" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="53.272458pt" height="11.184658pt" viewbox="-95.855049 -95.849674 53.272458 11.184658">
<defs>
<path id="g0-70" d="M6.826401-8.141469H.490162V-7.79477H.729265C1.590037-7.79477 1.625903-7.675218 1.625903-7.232877V-.908593C1.625903-.466252 1.590037-.3467 .729265-.3467H.490162V0C.777086-.02391 1.841096-.02391 2.199751-.02391C2.618182-.02391 3.670237-.02391 4.016936 0V-.3467H3.658281C2.618182-.3467 2.594271-.490162 2.594271-.920548V-3.897385H3.646326C4.770112-3.897385 4.889664-3.502864 4.889664-2.49863H5.152677V-5.642839H4.889664C4.889664-4.638605 4.770112-4.244085 3.646326-4.244085H2.594271V-7.316563C2.594271-7.711083 2.618182-7.79477 3.144209-7.79477H4.638605C6.360149-7.79477 6.706849-7.161146 6.874222-5.475467H7.137235L6.826401-8.141469Z" />
<path id="g0-77" d="M2.749689-7.938232C2.666002-8.16538 2.654047-8.16538 2.379078-8.16538H.526027V-7.81868H.765131C1.625903-7.81868 1.661768-7.699128 1.661768-7.256787V-1.231382C1.661768-.908593 1.661768-.3467 .526027-.3467V0C.836862-.02391 1.470486-.02391 1.80523-.02391S2.773599-.02391 3.084433 0V-.3467C1.948692-.3467 1.948692-.908593 1.948692-1.231382V-7.758904H1.960648L4.841843-.227148C4.889664-.095641 4.925529 0 5.045081 0C5.152677 0 5.176588-.059776 5.248319-.239103L8.153425-7.81868H8.16538V-.908593C8.16538-.466252 8.129514-.3467 7.268742-.3467H7.029639V0C7.304608-.02391 8.261021-.02391 8.607721-.02391S9.910834-.02391 10.185803 0V-.3467H9.9467C9.085928-.3467 9.050062-.466252 9.050062-.908593V-7.256787C9.050062-7.699128 9.085928-7.81868 9.9467-7.81868H10.185803V-8.16538H8.332752C8.069738-8.16538 8.057783-8.153425 7.962142-7.926276L5.355915-1.123786L2.749689-7.938232Z" />
<path id="g0-99" d="M4.327771-4.423412C4.184309-4.423412 3.741968-4.423412 3.741968-3.93325C3.741968-3.646326 3.945205-3.443088 4.23213-3.443088C4.507098-3.443088 4.734247-3.610461 4.734247-3.957161C4.734247-4.758157 3.897385-5.332005 2.929016-5.332005C1.530262-5.332005 .418431-4.088667 .418431-2.582316C.418431-1.052055 1.566127 .119552 2.917061 .119552C4.495143 .119552 4.853798-1.315068 4.853798-1.422665S4.770112-1.530262 4.734247-1.530262C4.62665-1.530262 4.614695-1.494396 4.578829-1.350934C4.315816-.502117 3.670237-.143462 3.024658-.143462C2.295392-.143462 1.327024-.777086 1.327024-2.594271C1.327024-4.578829 2.343213-5.068991 2.940971-5.068991C3.395268-5.068991 4.052802-4.889664 4.327771-4.423412Z" />
<path id="g0-101" d="M4.578829-2.773599C4.841843-2.773599 4.865753-2.773599 4.865753-3.000747C4.865753-4.208219 4.220174-5.332005 2.773599-5.332005C1.41071-5.332005 .358655-4.100623 .358655-2.618182C.358655-1.0401 1.578082 .119552 2.905106 .119552C4.327771 .119552 4.865753-1.171606 4.865753-1.422665C4.865753-1.494396 4.805978-1.542217 4.734247-1.542217C4.638605-1.542217 4.614695-1.482441 4.590785-1.422665C4.27995-.418431 3.478954-.143462 2.976837-.143462S1.267248-.478207 1.267248-2.546451V-2.773599H4.578829ZM1.279203-3.000747C1.374844-4.877709 2.426899-5.092902 2.761644-5.092902C4.040847-5.092902 4.112578-3.407223 4.124533-3.000747H1.279203Z" />
<path id="g0-111" d="M5.487422-2.558406C5.487422-4.100623 4.315816-5.332005 2.929016-5.332005C1.494396-5.332005 .358655-4.064757 .358655-2.558406C.358655-1.028144 1.554172 .119552 2.917061 .119552C4.327771 .119552 5.487422-1.052055 5.487422-2.558406ZM2.929016-.143462C2.486675-.143462 1.948692-.334745 1.601993-.920548C1.279203-1.458531 1.267248-2.163885 1.267248-2.666002C1.267248-3.120299 1.267248-3.849564 1.637858-4.387547C1.972603-4.901619 2.49863-5.092902 2.917061-5.092902C3.383313-5.092902 3.88543-4.877709 4.208219-4.411457C4.578829-3.861519 4.578829-3.108344 4.578829-2.666002C4.578829-2.247572 4.578829-1.506351 4.267995-.944458C3.93325-.37061 3.383313-.143462 2.929016-.143462Z" />
</defs>
<g id="page1" transform="matrix(1.35 0 0 1.35 0 0)">
<use x="-71.00374" y="-62.834378" xlink:href="#g0-70" />
<use x="-64.339898" y="-62.834378" xlink:href="#g0-101" />
<use x="-59.13724" y="-62.834378" xlink:href="#g0-77" />
<use x="-48.410897" y="-62.834378" xlink:href="#g0-111" />
<use x="-42.232741" y="-62.834378" xlink:href="#g0-99" />
<use x="-37.030083" y="-62.834378" xlink:href="#g0-111" />
</g>
</svg></span> verdict for fertilizer chemistry, and adds a hype-heavy precision-ag corner: VQC crop-yield papers claiming ~30% better prediction and ~25% less water on small, lightly refereed trials that classical ML matches (T3, treat skeptically). The one thread with a plausible short horizon is quantum *sensing* for soil, nutrient, and water measurement, which needs no fault-tolerant computer. Deployed agricultural value from quantum computing today is zero.

#### The classical-HPC walls: weather, semiconductors, media

**Weather & climate modeling** is one of the hardest places to get a quantum win. The HHL-style linear-solver speedup is real on paper and dies on the input/output problem — loading a petabyte-scale state and reading out a full field — which the field's own 2025 surveys flag plainly (T3). Numerical weather prediction is mature, world-class classical HPC (ECMWF, NOAA), so the bar is very high. The CERN Open Quantum Institute's fluid-dynamics forecasting pilot is the honest bright spot: organized, dated, explicitly pre-commercial (T4). QML nowcasting is small and classically matchable. 2030s+, gated on fault tolerance and a qRAM-class data-loading solution.

**Semiconductors & EDA** carries a useful reality check. Quantum computing *applied to* chip design — device-materials simulation, computational lithography, QUBO place-and-route — is early and fault-tolerance-gated (T3/T4). The concrete 2025-26 wins in "compute for semiconductors" are GPU-classical: NVIDIA's cuLitho (20-50% better cost/cycle-time on lithography) and cuEST (~50x faster materials chemistry) (T4). That is the bar quantum must clear, and those wins are classical GPU compute. The semiconductor industry's load-bearing role in quantum is as its *fab base* — real and central, covered in the hardware chapter, distinct from this application node.

**Media & entertainment** is a curiosity node kept for completeness. The one thing quantum offers that classical cannot fake is certified true randomness as a generative seed for procedural content — real, shipped in toy form (James Wootton's quantum wave-function-collapse PCG (T3)), and a novelty resource with no performance advantage, since classical PRNGs are indistinguishable for entertainment. Rendering, recommendation, and ad optimization are the usual pitches with no media-specific hook and no deployed pilots. Honest weight: low.

------------------------------------------------------------------------

> **Key takeaways**
>
> - The industries with something deployed today run a quantum sensor or a cryptographic defense; the industries running a quantum computer are running a pilot.
> - The map has three bands — proven (Band 1), contested pilot (Band 2), promise (Band 3) — and readiness rises along the sensing-over-computing diagonal.
> - Every claim carries an evidence tier: a refereed *Nature* result (T2) and an analyst forecast (T5) are four tiers apart and should never read as one number.
> - Certified randomness (JPMorganChase × Quantinuum) is the single delivered beyond-classical application on the whole industry map, and it produces no alpha.
> - TAM decks inflate by double-counting one chemistry advantage across five verticals and by relabeling quantum-inspired classical work as quantum.
> - The only T4-or-better revenue today is sensing and software; treat pure-play quantum computing as a 2029–2030 option priced on the ~$1B of real revenue that exists now.

### Where the industry stands


The throughline is one sentence, and every card above is evidence for it. **The near-term money in quantum is sensing and cryptographic defense. Every "optimization advantage" and "simulation advantage" is today a controlled proof-of-concept or a contested annealing result, and cybersecurity is the inverse case where the honest risk is under-reaction.** The industries in Band 1 got there by running a quantum sensor that measures better than any classical instrument, or by scrambling to migrate their cryptography before a computer that does not yet exist arrives to break it. The industries in Band 2 run real hardware and real pilots, and they are honest about it — Ford Otosan's annealing app is an actual production workflow whose advantage over a good classical solver is an open question. The industries in Band 3 are, for now, promise.

Two economic distortions follow from this shape — TAM figures inflated by double-counting one chemistry advantage across five verticals, and the quantum-inspired conflation that relabels classical work as quantum. Both are unpacked in the buyer-and-investor section below.

The distance to Band-1 status for the compute industries is a physics distance: logical qubits and gate fidelities, the fault-tolerance wall of Chapter 3. Until that wall comes down, the map will keep its shape: a quantum computer is a research instrument that runs paying pilots, a quantum *sensor* is a product, and a quantum-*safe* migration is a deadline. That is where the industry stands in 2026. The sensing is real, the crypto-defense is mandatory, and the computer is still the most important machine the economy is waiting on.


### What this means for buyers and investors

Buy the revenue that already exists. Today's quantum income is a sensor that out-measures the classical instrument — inertial navigation, OPM-MEG brain imaging, atomic clocks, ore-body magnetometers — and the mandated migration to post-quantum cryptography. Both ship now, both have contracts or deprecation deadlines behind them, and neither waits on a fault-tolerant computer.

For lower variance, buy the picks and shovels. Every architecture in this atlas, sensing or compute, funnels through a short list of physical chokepoints: dilution refrigerators, helium-3, synthetic diamond and NV material, and single-photon detectors. A firm that owns one of those chokepoints earns whether the winning qubit is superconducting, trapped-ion, or photonic, and whether the killer app lands in 2030 or 2035.

Treat pure-play quantum computing as a 2029–2030 option. Price it on the roughly $1B of real sector revenue that exists today — hardware access, cloud time, contested annealing deployments — rather than on the trillion-dollar TAM decks. The compute advantage is still a controlled proof-of-concept or a contested annealing result, and closing the gap is a physics problem measured in logical qubits, covered in Chapter 3 and Chapter 8.

Discount two traps on sight. The first is TAM double-counting: one fault-tolerant chemistry advantage is booked separately in the pharma, chemicals, climate, agriculture, and energy forecasts, so the summed market numbers count the same machine five times. The second is quantum-inspired conflation: classical algorithms that borrow quantum structure and run on classical hardware get sold as "quantum optimizes X today." When a vendor cannot name the qubits, assume there are none.

#### The names, graded

The table below is the decision-grade companion to the map — the notable builders across this atlas, with where they trade, what actually books revenue this year, an honest valuation flag, and DARPA's Quantum Benchmarking Initiative (QBI) filter, which advanced eleven of its Stage-A performers to Stage B in November 2025. The four public pure-plays all trade at price-to-sales multiples in the hundreds; that is the definition of a T5 valuation. The diversified incumbents (IBM, Alphabet, Microsoft) carry no meaningful quantum multiple — quantum is a rounding error against their market cap, so the flag is not applicable. Private venture-stage names are pre-revenue unless a sensing or software line is already shipping.

| Company | Public / Private | Modality or segment | Near-term revenue source | Valuation flag | DARPA-QBI stage |
|---|---|---|---|---|---|
| **IonQ** | Public — NYSE: IONQ | Trapped-ion (absorbed Oxford Ionics) | Cloud access, government contracts, networking | Price/sales ~100×; T5 | Stage B |
| **D-Wave** | Public — NYSE: QBTS | Quantum annealing | Annealing cloud + on-prem, optimization pilots | Price/sales ~700×+; T5 | Not selected |
| **Rigetti** | Public — NASDAQ: RGTI | Superconducting | Cloud access, foundry, government R&D | Price/sales ~800×+; T5 | Stage A (not advanced) |
| **Quantinuum** | Public — NASDAQ: QNT (IPO Jun 2026) | Trapped-ion | H-series cloud, Honeywell channel, Quantum Origin PQC | New listing at a high multiple; T5 | Stage B |
| **IBM** | Public — NYSE: IBM (diversified) | Superconducting, heavy-hex → qLDPC pivot | Quantum Network subscriptions, cloud | Quantum immaterial to cap; **n/a** | Stage B |
| **Alphabet (Google)** | Public — NASDAQ: GOOGL (diversified) | Superconducting (Willow) | No direct quantum revenue — R&D program | Quantum immaterial to cap; **n/a** | Self-funded (absorbed Atlantic Quantum) |
| **Microsoft** | Public — NASDAQ: MSFT (diversified) | Topological (Majorana) + Azure Quantum | Azure Quantum cloud brokerage | Quantum immaterial to cap; **n/a** | US2QC lineage (QBI precursor) |
| **PsiQuantum** | Private | Photonic, fault-tolerance bet | Pre-revenue; government/utility partnerships | ~$6B pre-/$7B post-money; ~$2B raised (incl. $1B Series E, Sep 2025); pre-revenue; T5 | Evaluation track (ex-US2QC) |
| **QuEra** | Private | Neutral-atom | Cloud access, government R&D | Venture-stage, pre-revenue; T4 | Stage B |
| **Pasqal** | Private | Neutral-atom | On-prem installs, HPC integration | Venture-stage; T4 | Not in named QBI cohort |
| **Alice & Bob** | Private | Superconducting cat qubits | Pre-revenue; resource-estimate R&D | Venture-stage; T4 | Stage A |
| **Atom Computing** | Private | Neutral-atom | Pre-revenue; government R&D | Venture-stage; T4 | Stage B |
| **Infleqtion** | Private | Neutral-atom + atomic clocks/sensing | Sensing and clock hardware (shipping) | Revenue-backed; T4 | Stage A |
| **SandboxAQ** | Private | PQC + quantum sensing (software) | PQC migration software, magnetometry | Large private raise; T4 | — |
| **Q-CTRL** | Private | Control software + quantum sensing | Inertial-nav sensors, error-suppression SW | Venture-stage; T4 | — |

Read the QBI column as a vendor-neutral government filter, not a scoreboard: advancing to Stage B means a credible utility-scale plan survived review, and being absent (D-Wave's annealer, the diversified incumbents' self-funded programs) means the company opted out or sits outside the fault-tolerant race the program is scoring. The valuation flags are the sharper signal. A public pure-play priced at hundreds of times sales is a T5 lottery ticket on a machine that does not yet exist; a private neutral-atom builder with no revenue is the same bet without a daily quote. The only T4-or-better income in the table is sensing and software — Infleqtion's clocks, SandboxAQ's migration tooling, Q-CTRL's inertial-nav units — which is the same conclusion the map reaches from the other direction.

### Exercises and discussion

1. **Classify and defend (all readers).** Pick three industries from the map, one from each band. For each, write a short paragraph defending its placement: name the specific quantum technology it depends on, cite the best evidence and its tier, and state the single thing that would have to change to move it up one band.
2. **Grade a vendor case study (engineers, analysts).** Take one vendor claim from the chapter — HSBC–IBM's "up to 34% improvement" on bond-trade fills (Heron, Sep 2025), or Airbus–QC Ware's "~400% faster" air-traffic result. Read the announcement as if you were the buyer, assign it a T1–T5 tier, and list what would have to be published for it to move up a tier and whether a quantum computer is provably in the loop.
3. **TAM versus revenue estimation (CS, quant).** The chapter sets ~$1B of real 2026 sector revenue against a ~$2.7T-by-2035 TAM. Treating the TAM as a target and assuming smooth compounding, compute the implied CAGR. Then identify which of the two traps most inflates that TAM and re-estimate a defensible 2035 figure with the double-count removed.
4. **Resource estimation (physics, CS).** A FeMoco-class catalyst simulation needs error-corrected machines with thousands of *logical* qubits. Using the surface-code overhead from Chapter 3, estimate the *physical*-qubit count at a plausible physical error rate, and explain why "today's devices simulate only tiny molecules" is a fault-tolerance statement rather than a software one.
5. **Seminar — where the money actually is.** The chapter argues the near-term economy is sensing and crypto-migration and that quantum computing is a 2029–2030 option. Build the opposite case: what would have to be true for compute revenue to overtake sensing revenue before 2030? Treat D-Wave's contested annealing as the test case — is it the exception that breaks the thesis, or evidence for it?
6. **Seminar — reading DARPA-QBI.** The QBI advanced eleven Stage-A performers to Stage B in November 2025, and several notable builders are absent from the cohort (D-Wave, the diversified incumbents, Pasqal). Debate what an investor should and should not infer from absence: is it a signal about a company's prospects, or an artifact of what the program is scoring?

### Further reading

- **M. Liu, R. Shaydulin, P. Niroula, et al., "Certified randomness using a trapped-ion quantum processor," *Nature* 640, 343–348 (2025)** (arXiv:2503.20498). The one refereed beyond-classical *application* on the whole industry map — read it to see what a T2 result, and its narrow scope, actually looks like.
- **McKinsey & Company, *Quantum Technology Monitor* (annual).** Source of the ~$2T-by-2035 value figures the press repeats; read it against the chapter's caveat that these forecasts are unadjusted for inflation and double-counted across chemistry- and optimization-driven verticals.
- **Alice & Bob, "Quantum Resource Estimation for Ground State Energy of FeMoco and P450 on Cat Qubits" (2025).** Estimates ~99,000 physical cat qubits for FeMoco, a ~27× cut from Google's 2021 figure of ~2.7M — a concrete look at why quantum chemistry advantage is fault-tolerance-gated, and how fast the estimates move.
- **A. D. King, et al., "Beyond-classical computation in quantum simulation," *Science* (2025)**, alongside **J. Tindall, et al., "Dynamics of disordered quantum systems with two- and three-dimensional tensor networks," *Science* (2025)** (arXiv:2503.05693). The D-Wave Advantage2 spin-glass claim and the Flatiron Institute tensor-network rebuttal — the live "is annealing beyond classical?" exchange behind Band 2.
- **NIST, FIPS 203 / 204 / 205 (August 2024).** The finalized post-quantum cryptography standards (ML-KEM, ML-DSA, SLH-DSA) that make the Band-1 crypto-migration a dated deadline rather than a forecast.


<figure class="figblock">
<span class="fig-light"><svg xmlns:xlink="http://www.w3.org/1999/xlink" width="812.158156pt" height="755.755826pt" viewbox="0 0 812.158156 755.755826" xmlns="http://www.w3.org/2000/svg" version="1.1">
 <metadata>
  <rdf xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
   <work>
    <type rdf:resource="http://purl.org/dc/dcmitype/StillImage"></type>
    <date>2026-07-09T09:57:41.811661</date>
    <format>image/svg+xml</format>
    <creator>
     <agent>
      <title>Matplotlib v3.11.0, https://matplotlib.org/</title>
     </agent>
    </creator>
   </work>
  </rdf>
 </metadata>
 <defs>
  <style type="text/css">*{stroke-linejoin: round; stroke-linecap: butt}</style>
 </defs>
 <g id="figure_1">
  <g id="patch_1">
   <path d="M 0 755.755826 
L 812.158156 755.755826 
L 812.158156 0 
L 0 0 
z
" style="fill: #faf9f6" />
  </g>
  <g id="axes_1">
   <g id="patch_2">
    <path d="M 15.771929 318.613 
L 735.81398 318.613 
L 735.81398 89.031879 
L 15.771929 89.031879 
z
" clip-path="url(#p49c15e55df)" style="fill: #0e8ea0; fill-opacity: 0.06" />
   </g>
   <g id="patch_3">
    <path d="M 15.771929 560.716727 
L 735.81398 560.716727 
L 735.81398 352.006617 
L 15.771929 352.006617 
z
" clip-path="url(#p49c15e55df)" style="fill: #5c6069; fill-opacity: 0.06" />
   </g>
   <g id="patch_4">
    <path d="M 15.771929 719.33641 
L 735.81398 719.33641 
L 735.81398 594.110345 
L 15.771929 594.110345 
z
" clip-path="url(#p49c15e55df)" style="fill: #b5741a; fill-opacity: 0.06" />
   </g>
   <g id="PathCollection_1">
    <defs>
     <path id="m2a0f4386da" d="M 0 2 
C 0.530406 2 1.03916 1.789267 1.414214 1.414214 
C 1.789267 1.03916 2 0.530406 2 0 
C 2 -0.530406 1.789267 -1.03916 1.414214 -1.414214 
C 1.03916 -1.789267 0.530406 -2 0 -2 
C -0.530406 -2 -1.03916 -1.789267 -1.414214 -1.414214 
C -1.789267 -1.03916 -2 -0.530406 -2 0 
C -2 0.530406 -1.789267 1.03916 -1.414214 1.414214 
C -1.03916 1.789267 -0.530406 2 0 2 
z
" style="stroke: #5c6069; stroke-opacity: 0.22" />
    </defs>
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="35.773097" y="99.467385" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_2">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="101.491221" y="99.467385" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_3">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="167.209345" y="99.467385" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_4">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="35.773097" y="120.338396" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_5">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="101.491221" y="120.338396" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_6">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="167.209345" y="120.338396" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_7">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="35.773097" y="141.209407" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_8">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="101.491221" y="141.209407" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_9">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="167.209345" y="141.209407" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_10">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="35.773097" y="162.080418" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_11">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="101.491221" y="162.080418" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_12">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="167.209345" y="162.080418" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_13">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="35.773097" y="182.951429" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_14">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="101.491221" y="182.951429" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_15">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="167.209345" y="182.951429" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_16">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="35.773097" y="203.82244" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_17">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="101.491221" y="203.82244" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_18">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="167.209345" y="203.82244" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_19">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="35.773097" y="224.693451" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_20">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="101.491221" y="224.693451" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_21">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="167.209345" y="224.693451" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_22">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="35.773097" y="245.564462" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_23">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="101.491221" y="245.564462" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_24">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="167.209345" y="245.564462" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_25">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="35.773097" y="266.435472" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_26">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="101.491221" y="266.435472" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_27">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="167.209345" y="266.435472" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_28">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="35.773097" y="287.306483" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_29">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="101.491221" y="287.306483" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_30">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="167.209345" y="287.306483" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_31">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="35.773097" y="308.177494" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_32">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="101.491221" y="308.177494" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_33">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="167.209345" y="308.177494" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_34">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="35.773097" y="362.442123" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_35">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="101.491221" y="362.442123" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_36">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="167.209345" y="362.442123" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_37">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="35.773097" y="383.313134" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_38">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="101.491221" y="383.313134" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_39">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="167.209345" y="383.313134" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_40">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="35.773097" y="404.184145" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_41">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="101.491221" y="404.184145" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_42">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="167.209345" y="404.184145" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_43">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="35.773097" y="425.055156" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_44">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="101.491221" y="425.055156" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_45">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="167.209345" y="425.055156" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_46">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="35.773097" y="445.926167" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_47">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="101.491221" y="445.926167" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_48">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="167.209345" y="445.926167" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_49">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="35.773097" y="466.797178" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_50">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="101.491221" y="466.797178" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_51">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="167.209345" y="466.797178" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_52">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="35.773097" y="487.668189" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_53">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="101.491221" y="487.668189" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_54">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="167.209345" y="487.668189" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_55">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="35.773097" y="508.5392" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_56">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="101.491221" y="508.5392" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_57">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="167.209345" y="508.5392" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_58">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="35.773097" y="529.410211" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_59">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="101.491221" y="529.410211" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_60">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="167.209345" y="529.410211" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_61">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="35.773097" y="550.281221" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_62">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="101.491221" y="550.281221" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_63">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="167.209345" y="550.281221" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_64">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="35.773097" y="604.54585" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_65">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="101.491221" y="604.54585" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_66">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="167.209345" y="604.54585" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_67">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="35.773097" y="625.416861" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_68">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="101.491221" y="625.416861" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_69">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="167.209345" y="625.416861" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_70">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="35.773097" y="646.287872" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_71">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="101.491221" y="646.287872" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_72">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="167.209345" y="646.287872" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_73">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="35.773097" y="667.158883" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_74">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="101.491221" y="667.158883" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_75">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="167.209345" y="667.158883" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_76">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="35.773097" y="688.029894" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_77">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="101.491221" y="688.029894" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_78">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="167.209345" y="688.029894" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_79">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="35.773097" y="708.900905" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_80">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="101.491221" y="708.900905" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_81">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m2a0f4386da" x="167.209345" y="708.900905" style="fill: #5c6069; fill-opacity: 0.22; stroke: #5c6069; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="text_1">
    <text style="font-weight: 700; font-size: 8.8px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="15.771929" y="84.013307" transform="rotate(-0 15.771929 84.013307)">DEPLOYED — real quantum tech delivering value today</text>
   </g>
   <g id="text_2">
    <text style="font-weight: 700; font-size: 8.8px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="15.771929" y="346.988045" transform="rotate(-0 15.771929 346.988045)">PILOT — runs on hardware, no advantage over classical yet</text>
   </g>
   <g id="text_3">
    <text style="font-weight: 700; font-size: 8.8px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="15.771929" y="589.091772" transform="rotate(-0 15.771929 589.091772)">PROMISE — theory or toy demos, matched classically</text>
   </g>
   <g id="text_4">
    <text style="font-style: italic; font-size: 8px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #5c6069" x="35.773097" y="40.15023" transform="rotate(-0 35.773097 40.15023)">Promise</text>
   </g>
   <g id="text_5">
    <text style="font-style: italic; font-size: 8px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #5c6069" x="101.491221" y="40.15023" transform="rotate(-0 101.491221 40.15023)">Pilot</text>
   </g>
   <g id="text_6">
    <text style="font-style: italic; font-size: 8px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #5c6069" x="167.209345" y="40.15023" transform="rotate(-0 167.209345 40.15023)">Deployed</text>
   </g>
   <g id="patch_5">
    <path d="M 29.200797 44.785336 
Q 101.491257 44.785336 172.775487 44.785336 
" style="fill: none; stroke: #5c6069; stroke-width: 0.9; stroke-linecap: round" />
    <path d="M 169.175487 42.985336 
L 172.775487 44.785336 
L 169.175487 46.585336 
" style="fill: none; stroke: #5c6069; stroke-width: 0.9; stroke-linecap: round" />
   </g>
   <g id="text_7">
    <text style="font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #5c6069" x="101.491221" y="34.659197" transform="rotate(-0 101.491221 34.659197)">readiness →</text>
   </g>
   <g id="text_8">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="215.78361" y="101.857588" transform="rotate(-0 215.78361 101.857588)">Aerospace &amp; Defense</text>
   </g>
   <g id="text_9">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #5c6069" x="412.937981" y="101.519842" transform="rotate(-0 412.937981 101.519842)">inertial navigation — airborne/maritime/space field trials</text>
   </g>
   <g id="text_10">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="215.78361" y="122.728599" transform="rotate(-0 215.78361 122.728599)">Healthcare Imaging</text>
   </g>
   <g id="text_11">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #5c6069" x="412.937981" y="122.390853" transform="rotate(-0 412.937981 122.390853)">OPM-MEG wearable brain magnetometry in research labs</text>
   </g>
   <g id="text_12">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="215.78361" y="143.59961" transform="rotate(-0 215.78361 143.59961)">Mining &amp; Exploration</text>
   </g>
   <g id="text_13">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #5c6069" x="412.937981" y="143.261864" transform="rotate(-0 412.937981 143.261864)">diamond magnetometers, cold-atom gravimeters — field instruments</text>
   </g>
   <g id="text_14">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="215.78361" y="164.470621" transform="rotate(-0 215.78361 164.470621)">Space &amp; Earth Obs.</text>
   </g>
   <g id="text_15">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #5c6069" x="412.937981" y="164.132875" transform="rotate(-0 412.937981 164.132875)">ACES clocks, inertial sensors, satellite QKD flying now</text>
   </g>
   <g id="text_16">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="215.78361" y="185.341632" transform="rotate(-0 215.78361 185.341632)">Agriculture &amp; Food</text>
   </g>
   <g id="text_17">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #5c6069" x="412.937981" y="185.003886" transform="rotate(-0 412.937981 185.003886)">lab-grade quantum soil / nutrient / water sensors</text>
   </g>
   <g id="text_18">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="215.78361" y="206.212643" transform="rotate(-0 215.78361 206.212643)">Telecom &amp; Networking</text>
   </g>
   <g id="text_19">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #5c6069" x="412.937981" y="205.874897" transform="rotate(-0 412.937981 205.874897)">PQC migration real, mandated, underway across carriers</text>
   </g>
   <g id="text_20">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="215.78361" y="227.083654" transform="rotate(-0 215.78361 227.083654)">Cybersecurity</text>
   </g>
   <g id="text_21">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #5c6069" x="412.937981" y="226.745908" transform="rotate(-0 412.937981 226.745908)">Shor threat + FIPS 203/204/205 final; deadlines binding</text>
   </g>
   <g id="text_22">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="215.78361" y="247.954665" transform="rotate(-0 215.78361 247.954665)">Government Services</text>
   </g>
   <g id="text_23">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #5c6069" x="412.937981" y="247.616919" transform="rotate(-0 412.937981 247.616919)">defensive PQC migration is the genuine program</text>
   </g>
   <g id="text_24">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="215.78361" y="268.825676" transform="rotate(-0 215.78361 268.825676)">Intelligence &amp; Crypto</text>
   </g>
   <g id="text_25">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #5c6069" x="412.937981" y="268.48793" transform="rotate(-0 412.937981 268.48793)">HNDL doctrine real; Shor threat certain given a CRQC</text>
   </g>
   <g id="text_26">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="215.78361" y="289.696687" transform="rotate(-0 215.78361 289.696687)">Automotive</text>
   </g>
   <g id="text_27">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #5c6069" x="412.937981" y="289.35894" transform="rotate(-0 412.937981 289.35894)">Ford Otosan annealing scheduling live in a plant</text>
   </g>
   <g id="text_28">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="215.78361" y="310.567698" transform="rotate(-0 215.78361 310.567698)">Manufacturing</text>
   </g>
   <g id="text_29">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #5c6069" x="412.937981" y="310.229951" transform="rotate(-0 412.937981 310.229951)">annealing scheduling in a live plant; paid services</text>
   </g>
   <g id="text_30">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="215.78361" y="364.832326" transform="rotate(-0 215.78361 364.832326)">Finance</text>
   </g>
   <g id="text_31">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #5c6069" x="412.937981" y="364.49458" transform="rotate(-0 412.937981 364.49458)">certified randomness proven; portfolio/MC POCs, tiny instances</text>
   </g>
   <g id="text_32">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="215.78361" y="385.703337" transform="rotate(-0 215.78361 385.703337)">Energy &amp; Utilities</text>
   </g>
   <g id="text_33">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #5c6069" x="412.937981" y="385.365591" transform="rotate(-0 412.937981 385.365591)">EDF/Pasqal EV-charging feasibility pilots run</text>
   </g>
   <g id="text_34">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="215.78361" y="406.574348" transform="rotate(-0 215.78361 406.574348)">Logistics &amp; Supply</text>
   </g>
   <g id="text_35">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #5c6069" x="412.937981" y="406.236602" transform="rotate(-0 412.937981 406.236602)">routing workflow runs on hardware at small instances</text>
   </g>
   <g id="text_36">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="215.78361" y="427.445359" transform="rotate(-0 215.78361 427.445359)">Air-Traffic Mgmt</text>
   </g>
   <g id="text_37">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #5c6069" x="412.937981" y="427.107613" transform="rotate(-0 412.937981 427.107613)">small QUBO deconfliction / scheduling demos</text>
   </g>
   <g id="text_38">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="215.78361" y="448.31637" transform="rotate(-0 215.78361 448.31637)">Construction</text>
   </g>
   <g id="text_39">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #5c6069" x="412.937981" y="447.978624" transform="rotate(-0 412.937981 447.978624)">small QUBO scheduling / structural demos in the literature</text>
   </g>
   <g id="text_40">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="215.78361" y="469.187381" transform="rotate(-0 215.78361 469.187381)">Oil &amp; Gas</text>
   </g>
   <g id="text_41">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #5c6069" x="412.937981" y="468.849635" transform="rotate(-0 412.937981 468.849635)">operator feasibility studies + sub-problem demos</text>
   </g>
   <g id="text_42">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="215.78361" y="490.058392" transform="rotate(-0 215.78361 490.058392)">Pharma &amp; Healthcare</text>
   </g>
   <g id="text_43">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #5c6069" x="412.937981" y="489.720646" transform="rotate(-0 412.937981 489.720646)">~20-orbital molecules simulated accurately on hardware</text>
   </g>
   <g id="text_44">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="215.78361" y="510.929403" transform="rotate(-0 215.78361 510.929403)">Chemicals &amp; Materials</text>
   </g>
   <g id="text_45">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #5c6069" x="412.937981" y="510.591657" transform="rotate(-0 412.937981 510.591657)">VQE/QPE on tiny molecules (H2, LiH) on real hardware</text>
   </g>
   <g id="text_46">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="215.78361" y="531.800414" transform="rotate(-0 215.78361 531.800414)">Nuclear &amp; Fusion</text>
   </g>
   <g id="text_47">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #5c6069" x="412.937981" y="531.462668" transform="rotate(-0 412.937981 531.462668)">small nuclei (deuteron-scale) simulated on hardware</text>
   </g>
   <g id="text_48">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="215.78361" y="552.671425" transform="rotate(-0 215.78361 552.671425)">Insurance &amp; Risk</text>
   </g>
   <g id="text_49">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #5c6069" x="412.937981" y="552.333679" transform="rotate(-0 412.937981 552.333679)">small numerical demos of capital / copula methods</text>
   </g>
   <g id="text_50">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="215.78361" y="606.936053" transform="rotate(-0 215.78361 606.936053)">Retail</text>
   </g>
   <g id="text_51">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #5c6069" x="412.937981" y="606.598307" transform="rotate(-0 412.937981 606.598307)">QNN forecasting demos, matched by classical ML</text>
   </g>
   <g id="text_52">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="215.78361" y="627.807064" transform="rotate(-0 215.78361 627.807064)">Media &amp; Entertainment</text>
   </g>
   <g id="text_53">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #5c6069" x="412.937981" y="627.469318" transform="rotate(-0 412.937981 627.469318)">QRNG-seeded generative art in toy form; no advantage</text>
   </g>
   <g id="text_54">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="215.78361" y="648.678075" transform="rotate(-0 215.78361 648.678075)">Semiconductors &amp; EDA</text>
   </g>
   <g id="text_55">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #5c6069" x="412.937981" y="648.340329" transform="rotate(-0 412.937981 648.340329)">exploratory device-materials sim; classical GPU HPC leads</text>
   </g>
   <g id="text_56">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="215.78361" y="669.549086" transform="rotate(-0 215.78361 669.549086)">AI &amp; Machine Learning</text>
   </g>
   <g id="text_57">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #5c6069" x="412.937981" y="669.21134" transform="rotate(-0 412.937981 669.21134)">QML classifies toy datasets — feasibility, not advantage</text>
   </g>
   <g id="text_58">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="215.78361" y="690.420097" transform="rotate(-0 215.78361 690.420097)">Climate &amp; Sustainability</text>
   </g>
   <g id="text_59">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #5c6069" x="412.937981" y="690.082351" transform="rotate(-0 412.937981 690.082351)">resource estimates improved — not yet a computation</text>
   </g>
   <g id="text_60">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="215.78361" y="711.291108" transform="rotate(-0 215.78361 711.291108)">Weather Modeling</text>
   </g>
   <g id="text_61">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #5c6069" x="412.937981" y="710.953362" transform="rotate(-0 412.937981 710.953362)">toy-scale QNN nowcasting, matched by classical ML</text>
   </g>
   <g id="text_62">
    <text style="font-weight: 700; font-size: 14px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="7.2" y="17.837813" transform="rotate(-0 7.2 17.837813)">Where each industry actually stands</text>
   </g>
   <g id="text_63">
    <text style="font-size: 8px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="23.200934" y="731.850353" transform="rotate(-0 23.200934 731.850353)">quantum sensing</text>
   </g>
   <g id="text_64">
    <text style="font-size: 8px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="200.354137" y="731.850041" transform="rotate(-0 200.354137 731.850041)">crypto / PQC</text>
   </g>
   <g id="text_65">
    <text style="font-size: 8px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="377.50734" y="731.850353" transform="rotate(-0 377.50734 731.850353)">optimization (annealing/QUBO)</text>
   </g>
   <g id="text_66">
    <text style="font-size: 8px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="554.660543" y="731.850353" transform="rotate(-0 554.660543 731.850353)">chemistry / simulation</text>
   </g>
   <g id="text_67">
    <text style="font-style: italic; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #5c6069" x="7.2" y="746.304178" transform="rotate(-0 7.2 746.304178)">Near-term wins are sensing and defensive PQC; every gate-model &#39;compute&#39; use is pilot-or-promise, gated on fault tolerance. &#39;Hype&#39; (in every card) = near-term compute advantage / trillion-$ TAM lines. Source: §05.</text>
   </g>
   <g id="PathCollection_82">
    <defs>
     <path id="mfded11f863" d="M 0 5.361903 
C 1.421993 5.361903 2.785937 4.796939 3.791438 3.791438 
C 4.796939 2.785937 5.361903 1.421993 5.361903 0 
C 5.361903 -1.421993 4.796939 -2.785937 3.791438 -3.791438 
C 2.785937 -4.796939 1.421993 -5.361903 0 -5.361903 
C -1.421993 -5.361903 -2.785937 -4.796939 -3.791438 -3.791438 
C -4.796939 -2.785937 -5.361903 -1.421993 -5.361903 0 
C -5.361903 1.421993 -4.796939 2.785937 -3.791438 3.791438 
C -2.785937 4.796939 -1.421993 5.361903 0 5.361903 
z
" style="stroke: #faf9f6" />
    </defs>
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#mfded11f863" x="167.209345" y="99.467385" style="fill: #2f7d4f; stroke: #faf9f6" />
    </g>
   </g>
   <g id="PathCollection_83">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#mfded11f863" x="167.209345" y="120.338396" style="fill: #2f7d4f; stroke: #faf9f6" />
    </g>
   </g>
   <g id="PathCollection_84">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#mfded11f863" x="167.209345" y="141.209407" style="fill: #2f7d4f; stroke: #faf9f6" />
    </g>
   </g>
   <g id="PathCollection_85">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#mfded11f863" x="167.209345" y="162.080418" style="fill: #2f7d4f; stroke: #faf9f6" />
    </g>
   </g>
   <g id="PathCollection_86">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#mfded11f863" x="167.209345" y="182.951429" style="fill: #2f7d4f; stroke: #faf9f6" />
    </g>
   </g>
   <g id="PathCollection_87">
    <defs>
     <path id="m442cf5e469" d="M 0 5.361903 
C 1.421993 5.361903 2.785937 4.796939 3.791438 3.791438 
C 4.796939 2.785937 5.361903 1.421993 5.361903 0 
C 5.361903 -1.421993 4.796939 -2.785937 3.791438 -3.791438 
C 2.785937 -4.796939 1.421993 -5.361903 0 -5.361903 
C -1.421993 -5.361903 -2.785937 -4.796939 -3.791438 -3.791438 
C -4.796939 -2.785937 -5.361903 -1.421993 -5.361903 0 
C -5.361903 1.421993 -4.796939 2.785937 -3.791438 3.791438 
C -2.785937 4.796939 -1.421993 5.361903 0 5.361903 
z
" style="stroke: #faf9f6" />
    </defs>
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m442cf5e469" x="167.209345" y="203.82244" style="fill: #0b6d7a; stroke: #faf9f6" />
    </g>
   </g>
   <g id="PathCollection_88">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m442cf5e469" x="167.209345" y="224.693451" style="fill: #0b6d7a; stroke: #faf9f6" />
    </g>
   </g>
   <g id="PathCollection_89">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m442cf5e469" x="167.209345" y="245.564462" style="fill: #0b6d7a; stroke: #faf9f6" />
    </g>
   </g>
   <g id="PathCollection_90">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m442cf5e469" x="167.209345" y="266.435472" style="fill: #0b6d7a; stroke: #faf9f6" />
    </g>
   </g>
   <g id="PathCollection_91">
    <defs>
     <path id="mc48b800413" d="M 0 5.361903 
C 1.421993 5.361903 2.785937 4.796939 3.791438 3.791438 
C 4.796939 2.785937 5.361903 1.421993 5.361903 0 
C 5.361903 -1.421993 4.796939 -2.785937 3.791438 -3.791438 
C 2.785937 -4.796939 1.421993 -5.361903 0 -5.361903 
C -1.421993 -5.361903 -2.785937 -4.796939 -3.791438 -3.791438 
C -4.796939 -2.785937 -5.361903 -1.421993 -5.361903 0 
C -5.361903 1.421993 -4.796939 2.785937 -3.791438 3.791438 
C -2.785937 4.796939 -1.421993 5.361903 0 5.361903 
z
" style="stroke: #faf9f6" />
    </defs>
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#mc48b800413" x="167.209345" y="287.306483" style="fill: #0e8ea0; stroke: #faf9f6" />
    </g>
   </g>
   <g id="PathCollection_92">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#mc48b800413" x="167.209345" y="308.177494" style="fill: #0e8ea0; stroke: #faf9f6" />
    </g>
   </g>
   <g id="PathCollection_93">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#mc48b800413" x="101.491221" y="362.442123" style="fill: #0e8ea0; stroke: #faf9f6" />
    </g>
   </g>
   <g id="PathCollection_94">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#mc48b800413" x="101.491221" y="383.313134" style="fill: #0e8ea0; stroke: #faf9f6" />
    </g>
   </g>
   <g id="PathCollection_95">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#mc48b800413" x="101.491221" y="404.184145" style="fill: #0e8ea0; stroke: #faf9f6" />
    </g>
   </g>
   <g id="PathCollection_96">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#mc48b800413" x="101.491221" y="425.055156" style="fill: #0e8ea0; stroke: #faf9f6" />
    </g>
   </g>
   <g id="PathCollection_97">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#mc48b800413" x="101.491221" y="445.926167" style="fill: #0e8ea0; stroke: #faf9f6" />
    </g>
   </g>
   <g id="PathCollection_98">
    <defs>
     <path id="m5280c81107" d="M 0 5.361903 
C 1.421993 5.361903 2.785937 4.796939 3.791438 3.791438 
C 4.796939 2.785937 5.361903 1.421993 5.361903 0 
C 5.361903 -1.421993 4.796939 -2.785937 3.791438 -3.791438 
C 2.785937 -4.796939 1.421993 -5.361903 0 -5.361903 
C -1.421993 -5.361903 -2.785937 -4.796939 -3.791438 -3.791438 
C -4.796939 -2.785937 -5.361903 -1.421993 -5.361903 0 
C -5.361903 1.421993 -4.796939 2.785937 -3.791438 3.791438 
C -2.785937 4.796939 -1.421993 5.361903 0 5.361903 
z
" style="stroke: #faf9f6" />
    </defs>
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m5280c81107" x="101.491221" y="466.797178" style="fill: #b5741a; stroke: #faf9f6" />
    </g>
   </g>
   <g id="PathCollection_99">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m5280c81107" x="101.491221" y="487.668189" style="fill: #b5741a; stroke: #faf9f6" />
    </g>
   </g>
   <g id="PathCollection_100">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m5280c81107" x="101.491221" y="508.5392" style="fill: #b5741a; stroke: #faf9f6" />
    </g>
   </g>
   <g id="PathCollection_101">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m5280c81107" x="101.491221" y="529.410211" style="fill: #b5741a; stroke: #faf9f6" />
    </g>
   </g>
   <g id="PathCollection_102">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m5280c81107" x="101.491221" y="550.281221" style="fill: #b5741a; stroke: #faf9f6" />
    </g>
   </g>
   <g id="PathCollection_103">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#mc48b800413" x="35.773097" y="604.54585" style="fill: #0e8ea0; stroke: #faf9f6" />
    </g>
   </g>
   <g id="PathCollection_104">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#mc48b800413" x="35.773097" y="625.416861" style="fill: #0e8ea0; stroke: #faf9f6" />
    </g>
   </g>
   <g id="PathCollection_105">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m5280c81107" x="35.773097" y="646.287872" style="fill: #b5741a; stroke: #faf9f6" />
    </g>
   </g>
   <g id="PathCollection_106">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m5280c81107" x="35.773097" y="667.158883" style="fill: #b5741a; stroke: #faf9f6" />
    </g>
   </g>
   <g id="PathCollection_107">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m5280c81107" x="35.773097" y="688.029894" style="fill: #b5741a; stroke: #faf9f6" />
    </g>
   </g>
   <g id="PathCollection_108">
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m5280c81107" x="35.773097" y="708.900905" style="fill: #b5741a; stroke: #faf9f6" />
    </g>
   </g>
   <g id="PathCollection_109">
    <defs>
     <path id="m89ec2ecae1" d="M 0 4.873397 
C 1.29244 4.873397 2.532119 4.359905 3.446012 3.446012 
C 4.359905 2.532119 4.873397 1.29244 4.873397 0 
C 4.873397 -1.29244 4.359905 -2.532119 3.446012 -3.446012 
C 2.532119 -4.359905 1.29244 -4.873397 0 -4.873397 
C -1.29244 -4.873397 -2.532119 -4.359905 -3.446012 -3.446012 
C -4.359905 -2.532119 -4.873397 -1.29244 -4.873397 0 
C -4.873397 1.29244 -4.359905 2.532119 -3.446012 3.446012 
C -2.532119 4.359905 -1.29244 4.873397 0 4.873397 
z
" style="stroke: #faf9f6" />
    </defs>
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m89ec2ecae1" x="12.914619" y="729.771916" style="fill: #2f7d4f; stroke: #faf9f6" />
    </g>
   </g>
   <g id="PathCollection_110">
    <defs>
     <path id="m7e0ce7d717" d="M 0 4.873397 
C 1.29244 4.873397 2.532119 4.359905 3.446012 3.446012 
C 4.359905 2.532119 4.873397 1.29244 4.873397 0 
C 4.873397 -1.29244 4.359905 -2.532119 3.446012 -3.446012 
C 2.532119 -4.359905 1.29244 -4.873397 0 -4.873397 
C -1.29244 -4.873397 -2.532119 -4.359905 -3.446012 -3.446012 
C -4.359905 -2.532119 -4.873397 -1.29244 -4.873397 0 
C -4.873397 1.29244 -4.359905 2.532119 -3.446012 3.446012 
C -2.532119 4.359905 -1.29244 4.873397 0 4.873397 
z
" style="stroke: #faf9f6" />
    </defs>
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m7e0ce7d717" x="190.067822" y="729.771916" style="fill: #0b6d7a; stroke: #faf9f6" />
    </g>
   </g>
   <g id="PathCollection_111">
    <defs>
     <path id="me7800fd5a3" d="M 0 4.873397 
C 1.29244 4.873397 2.532119 4.359905 3.446012 3.446012 
C 4.359905 2.532119 4.873397 1.29244 4.873397 0 
C 4.873397 -1.29244 4.359905 -2.532119 3.446012 -3.446012 
C 2.532119 -4.359905 1.29244 -4.873397 0 -4.873397 
C -1.29244 -4.873397 -2.532119 -4.359905 -3.446012 -3.446012 
C -4.359905 -2.532119 -4.873397 -1.29244 -4.873397 0 
C -4.873397 1.29244 -4.359905 2.532119 -3.446012 3.446012 
C -2.532119 4.359905 -1.29244 4.873397 0 4.873397 
z
" style="stroke: #faf9f6" />
    </defs>
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#me7800fd5a3" x="367.221025" y="729.771916" style="fill: #0e8ea0; stroke: #faf9f6" />
    </g>
   </g>
   <g id="PathCollection_112">
    <defs>
     <path id="m351d107d58" d="M 0 4.873397 
C 1.29244 4.873397 2.532119 4.359905 3.446012 3.446012 
C 4.359905 2.532119 4.873397 1.29244 4.873397 0 
C 4.873397 -1.29244 4.359905 -2.532119 3.446012 -3.446012 
C 2.532119 -4.359905 1.29244 -4.873397 0 -4.873397 
C -1.29244 -4.873397 -2.532119 -4.359905 -3.446012 -3.446012 
C -4.359905 -2.532119 -4.873397 -1.29244 -4.873397 0 
C -4.873397 1.29244 -4.359905 2.532119 -3.446012 3.446012 
C -2.532119 4.359905 -1.29244 4.873397 0 4.873397 
z
" style="stroke: #faf9f6" />
    </defs>
    <g clip-path="url(#p49c15e55df)">
     <use xlink:href="#m351d107d58" x="544.374228" y="729.771916" style="fill: #b5741a; stroke: #faf9f6" />
    </g>
   </g>
  </g>
 </g>
 <defs>
  <clippath id="p49c15e55df">
   <rect x="7.2" y="11.809139" width="737.185909" height="736.746687" />
  </clippath>
 </defs>
</svg></span><span class="fig-dark"><svg xmlns:xlink="http://www.w3.org/1999/xlink" width="812.158156pt" height="755.755826pt" viewbox="0 0 812.158156 755.755826" xmlns="http://www.w3.org/2000/svg" version="1.1">
 <metadata>
  <rdf xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
   <work>
    <type rdf:resource="http://purl.org/dc/dcmitype/StillImage"></type>
    <date>2026-07-09T09:57:14.962478</date>
    <format>image/svg+xml</format>
    <creator>
     <agent>
      <title>Matplotlib v3.11.0, https://matplotlib.org/</title>
     </agent>
    </creator>
   </work>
  </rdf>
 </metadata>
 <defs>
  <style type="text/css">*{stroke-linejoin: round; stroke-linecap: butt}</style>
 </defs>
 <g id="figure_1">
  <g id="patch_1">
   <path d="M 0 755.755826 
L 812.158156 755.755826 
L 812.158156 0 
L 0 0 
z
" style="fill: #16181d" />
  </g>
  <g id="axes_1">
   <g id="patch_2">
    <path d="M 15.771929 318.613 
L 735.81398 318.613 
L 735.81398 89.031879 
L 15.771929 89.031879 
z
" clip-path="url(#pc9932f729e)" style="fill: #0e8ea0; fill-opacity: 0.1" />
   </g>
   <g id="patch_3">
    <path d="M 15.771929 560.716727 
L 735.81398 560.716727 
L 735.81398 352.006617 
L 15.771929 352.006617 
z
" clip-path="url(#pc9932f729e)" style="fill: #9a9ea8; fill-opacity: 0.1" />
   </g>
   <g id="patch_4">
    <path d="M 15.771929 719.33641 
L 735.81398 719.33641 
L 735.81398 594.110345 
L 15.771929 594.110345 
z
" clip-path="url(#pc9932f729e)" style="fill: #b5741a; fill-opacity: 0.1" />
   </g>
   <g id="PathCollection_1">
    <defs>
     <path id="m9613e6ad1e" d="M 0 2 
C 0.530406 2 1.03916 1.789267 1.414214 1.414214 
C 1.789267 1.03916 2 0.530406 2 0 
C 2 -0.530406 1.789267 -1.03916 1.414214 -1.414214 
C 1.03916 -1.789267 0.530406 -2 0 -2 
C -0.530406 -2 -1.03916 -1.789267 -1.414214 -1.414214 
C -1.789267 -1.03916 -2 -0.530406 -2 0 
C -2 0.530406 -1.789267 1.03916 -1.414214 1.414214 
C -1.03916 1.789267 -0.530406 2 0 2 
z
" style="stroke: #9a9ea8; stroke-opacity: 0.22" />
    </defs>
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="35.773097" y="99.467385" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_2">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="101.491221" y="99.467385" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_3">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="167.209345" y="99.467385" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_4">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="35.773097" y="120.338396" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_5">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="101.491221" y="120.338396" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_6">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="167.209345" y="120.338396" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_7">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="35.773097" y="141.209407" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_8">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="101.491221" y="141.209407" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_9">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="167.209345" y="141.209407" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_10">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="35.773097" y="162.080418" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_11">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="101.491221" y="162.080418" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_12">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="167.209345" y="162.080418" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_13">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="35.773097" y="182.951429" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_14">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="101.491221" y="182.951429" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_15">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="167.209345" y="182.951429" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_16">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="35.773097" y="203.82244" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_17">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="101.491221" y="203.82244" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_18">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="167.209345" y="203.82244" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_19">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="35.773097" y="224.693451" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_20">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="101.491221" y="224.693451" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_21">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="167.209345" y="224.693451" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_22">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="35.773097" y="245.564462" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_23">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="101.491221" y="245.564462" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_24">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="167.209345" y="245.564462" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_25">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="35.773097" y="266.435472" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_26">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="101.491221" y="266.435472" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_27">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="167.209345" y="266.435472" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_28">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="35.773097" y="287.306483" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_29">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="101.491221" y="287.306483" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_30">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="167.209345" y="287.306483" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_31">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="35.773097" y="308.177494" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_32">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="101.491221" y="308.177494" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_33">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="167.209345" y="308.177494" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_34">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="35.773097" y="362.442123" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_35">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="101.491221" y="362.442123" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_36">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="167.209345" y="362.442123" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_37">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="35.773097" y="383.313134" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_38">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="101.491221" y="383.313134" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_39">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="167.209345" y="383.313134" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_40">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="35.773097" y="404.184145" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_41">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="101.491221" y="404.184145" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_42">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="167.209345" y="404.184145" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_43">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="35.773097" y="425.055156" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_44">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="101.491221" y="425.055156" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_45">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="167.209345" y="425.055156" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_46">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="35.773097" y="445.926167" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_47">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="101.491221" y="445.926167" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_48">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="167.209345" y="445.926167" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_49">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="35.773097" y="466.797178" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_50">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="101.491221" y="466.797178" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_51">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="167.209345" y="466.797178" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_52">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="35.773097" y="487.668189" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_53">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="101.491221" y="487.668189" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_54">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="167.209345" y="487.668189" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_55">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="35.773097" y="508.5392" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_56">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="101.491221" y="508.5392" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_57">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="167.209345" y="508.5392" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_58">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="35.773097" y="529.410211" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_59">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="101.491221" y="529.410211" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_60">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="167.209345" y="529.410211" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_61">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="35.773097" y="550.281221" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_62">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="101.491221" y="550.281221" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_63">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="167.209345" y="550.281221" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_64">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="35.773097" y="604.54585" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_65">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="101.491221" y="604.54585" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_66">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="167.209345" y="604.54585" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_67">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="35.773097" y="625.416861" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_68">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="101.491221" y="625.416861" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_69">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="167.209345" y="625.416861" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_70">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="35.773097" y="646.287872" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_71">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="101.491221" y="646.287872" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_72">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="167.209345" y="646.287872" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_73">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="35.773097" y="667.158883" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_74">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="101.491221" y="667.158883" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_75">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="167.209345" y="667.158883" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_76">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="35.773097" y="688.029894" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_77">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="101.491221" y="688.029894" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_78">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="167.209345" y="688.029894" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_79">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="35.773097" y="708.900905" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_80">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="101.491221" y="708.900905" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="PathCollection_81">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9613e6ad1e" x="167.209345" y="708.900905" style="fill: #9a9ea8; fill-opacity: 0.22; stroke: #9a9ea8; stroke-opacity: 0.22" />
    </g>
   </g>
   <g id="text_1">
    <text style="font-weight: 700; font-size: 8.8px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="15.771929" y="84.013307" transform="rotate(-0 15.771929 84.013307)">DEPLOYED — real quantum tech delivering value today</text>
   </g>
   <g id="text_2">
    <text style="font-weight: 700; font-size: 8.8px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="15.771929" y="346.988045" transform="rotate(-0 15.771929 346.988045)">PILOT — runs on hardware, no advantage over classical yet</text>
   </g>
   <g id="text_3">
    <text style="font-weight: 700; font-size: 8.8px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="15.771929" y="589.091772" transform="rotate(-0 15.771929 589.091772)">PROMISE — theory or toy demos, matched classically</text>
   </g>
   <g id="text_4">
    <text style="font-style: italic; font-size: 8px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #9a9ea8" x="35.773097" y="40.15023" transform="rotate(-0 35.773097 40.15023)">Promise</text>
   </g>
   <g id="text_5">
    <text style="font-style: italic; font-size: 8px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #9a9ea8" x="101.491221" y="40.15023" transform="rotate(-0 101.491221 40.15023)">Pilot</text>
   </g>
   <g id="text_6">
    <text style="font-style: italic; font-size: 8px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #9a9ea8" x="167.209345" y="40.15023" transform="rotate(-0 167.209345 40.15023)">Deployed</text>
   </g>
   <g id="patch_5">
    <path d="M 29.200797 44.785336 
Q 101.491257 44.785336 172.775487 44.785336 
" style="fill: none; stroke: #9a9ea8; stroke-width: 0.9; stroke-linecap: round" />
    <path d="M 169.175487 42.985336 
L 172.775487 44.785336 
L 169.175487 46.585336 
" style="fill: none; stroke: #9a9ea8; stroke-width: 0.9; stroke-linecap: round" />
   </g>
   <g id="text_7">
    <text style="font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #9a9ea8" x="101.491221" y="34.659197" transform="rotate(-0 101.491221 34.659197)">readiness →</text>
   </g>
   <g id="text_8">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="215.78361" y="101.857588" transform="rotate(-0 215.78361 101.857588)">Aerospace &amp; Defense</text>
   </g>
   <g id="text_9">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #9a9ea8" x="412.937981" y="101.519842" transform="rotate(-0 412.937981 101.519842)">inertial navigation — airborne/maritime/space field trials</text>
   </g>
   <g id="text_10">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="215.78361" y="122.728599" transform="rotate(-0 215.78361 122.728599)">Healthcare Imaging</text>
   </g>
   <g id="text_11">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #9a9ea8" x="412.937981" y="122.390853" transform="rotate(-0 412.937981 122.390853)">OPM-MEG wearable brain magnetometry in research labs</text>
   </g>
   <g id="text_12">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="215.78361" y="143.59961" transform="rotate(-0 215.78361 143.59961)">Mining &amp; Exploration</text>
   </g>
   <g id="text_13">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #9a9ea8" x="412.937981" y="143.261864" transform="rotate(-0 412.937981 143.261864)">diamond magnetometers, cold-atom gravimeters — field instruments</text>
   </g>
   <g id="text_14">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="215.78361" y="164.470621" transform="rotate(-0 215.78361 164.470621)">Space &amp; Earth Obs.</text>
   </g>
   <g id="text_15">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #9a9ea8" x="412.937981" y="164.132875" transform="rotate(-0 412.937981 164.132875)">ACES clocks, inertial sensors, satellite QKD flying now</text>
   </g>
   <g id="text_16">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="215.78361" y="185.341632" transform="rotate(-0 215.78361 185.341632)">Agriculture &amp; Food</text>
   </g>
   <g id="text_17">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #9a9ea8" x="412.937981" y="185.003886" transform="rotate(-0 412.937981 185.003886)">lab-grade quantum soil / nutrient / water sensors</text>
   </g>
   <g id="text_18">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="215.78361" y="206.212643" transform="rotate(-0 215.78361 206.212643)">Telecom &amp; Networking</text>
   </g>
   <g id="text_19">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #9a9ea8" x="412.937981" y="205.874897" transform="rotate(-0 412.937981 205.874897)">PQC migration real, mandated, underway across carriers</text>
   </g>
   <g id="text_20">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="215.78361" y="227.083654" transform="rotate(-0 215.78361 227.083654)">Cybersecurity</text>
   </g>
   <g id="text_21">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #9a9ea8" x="412.937981" y="226.745908" transform="rotate(-0 412.937981 226.745908)">Shor threat + FIPS 203/204/205 final; deadlines binding</text>
   </g>
   <g id="text_22">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="215.78361" y="247.954665" transform="rotate(-0 215.78361 247.954665)">Government Services</text>
   </g>
   <g id="text_23">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #9a9ea8" x="412.937981" y="247.616919" transform="rotate(-0 412.937981 247.616919)">defensive PQC migration is the genuine program</text>
   </g>
   <g id="text_24">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="215.78361" y="268.825676" transform="rotate(-0 215.78361 268.825676)">Intelligence &amp; Crypto</text>
   </g>
   <g id="text_25">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #9a9ea8" x="412.937981" y="268.48793" transform="rotate(-0 412.937981 268.48793)">HNDL doctrine real; Shor threat certain given a CRQC</text>
   </g>
   <g id="text_26">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="215.78361" y="289.696687" transform="rotate(-0 215.78361 289.696687)">Automotive</text>
   </g>
   <g id="text_27">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #9a9ea8" x="412.937981" y="289.35894" transform="rotate(-0 412.937981 289.35894)">Ford Otosan annealing scheduling live in a plant</text>
   </g>
   <g id="text_28">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="215.78361" y="310.567698" transform="rotate(-0 215.78361 310.567698)">Manufacturing</text>
   </g>
   <g id="text_29">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #9a9ea8" x="412.937981" y="310.229951" transform="rotate(-0 412.937981 310.229951)">annealing scheduling in a live plant; paid services</text>
   </g>
   <g id="text_30">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="215.78361" y="364.832326" transform="rotate(-0 215.78361 364.832326)">Finance</text>
   </g>
   <g id="text_31">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #9a9ea8" x="412.937981" y="364.49458" transform="rotate(-0 412.937981 364.49458)">certified randomness proven; portfolio/MC POCs, tiny instances</text>
   </g>
   <g id="text_32">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="215.78361" y="385.703337" transform="rotate(-0 215.78361 385.703337)">Energy &amp; Utilities</text>
   </g>
   <g id="text_33">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #9a9ea8" x="412.937981" y="385.365591" transform="rotate(-0 412.937981 385.365591)">EDF/Pasqal EV-charging feasibility pilots run</text>
   </g>
   <g id="text_34">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="215.78361" y="406.574348" transform="rotate(-0 215.78361 406.574348)">Logistics &amp; Supply</text>
   </g>
   <g id="text_35">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #9a9ea8" x="412.937981" y="406.236602" transform="rotate(-0 412.937981 406.236602)">routing workflow runs on hardware at small instances</text>
   </g>
   <g id="text_36">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="215.78361" y="427.445359" transform="rotate(-0 215.78361 427.445359)">Air-Traffic Mgmt</text>
   </g>
   <g id="text_37">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #9a9ea8" x="412.937981" y="427.107613" transform="rotate(-0 412.937981 427.107613)">small QUBO deconfliction / scheduling demos</text>
   </g>
   <g id="text_38">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="215.78361" y="448.31637" transform="rotate(-0 215.78361 448.31637)">Construction</text>
   </g>
   <g id="text_39">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #9a9ea8" x="412.937981" y="447.978624" transform="rotate(-0 412.937981 447.978624)">small QUBO scheduling / structural demos in the literature</text>
   </g>
   <g id="text_40">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="215.78361" y="469.187381" transform="rotate(-0 215.78361 469.187381)">Oil &amp; Gas</text>
   </g>
   <g id="text_41">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #9a9ea8" x="412.937981" y="468.849635" transform="rotate(-0 412.937981 468.849635)">operator feasibility studies + sub-problem demos</text>
   </g>
   <g id="text_42">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="215.78361" y="490.058392" transform="rotate(-0 215.78361 490.058392)">Pharma &amp; Healthcare</text>
   </g>
   <g id="text_43">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #9a9ea8" x="412.937981" y="489.720646" transform="rotate(-0 412.937981 489.720646)">~20-orbital molecules simulated accurately on hardware</text>
   </g>
   <g id="text_44">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="215.78361" y="510.929403" transform="rotate(-0 215.78361 510.929403)">Chemicals &amp; Materials</text>
   </g>
   <g id="text_45">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #9a9ea8" x="412.937981" y="510.591657" transform="rotate(-0 412.937981 510.591657)">VQE/QPE on tiny molecules (H2, LiH) on real hardware</text>
   </g>
   <g id="text_46">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="215.78361" y="531.800414" transform="rotate(-0 215.78361 531.800414)">Nuclear &amp; Fusion</text>
   </g>
   <g id="text_47">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #9a9ea8" x="412.937981" y="531.462668" transform="rotate(-0 412.937981 531.462668)">small nuclei (deuteron-scale) simulated on hardware</text>
   </g>
   <g id="text_48">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="215.78361" y="552.671425" transform="rotate(-0 215.78361 552.671425)">Insurance &amp; Risk</text>
   </g>
   <g id="text_49">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #9a9ea8" x="412.937981" y="552.333679" transform="rotate(-0 412.937981 552.333679)">small numerical demos of capital / copula methods</text>
   </g>
   <g id="text_50">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="215.78361" y="606.936053" transform="rotate(-0 215.78361 606.936053)">Retail</text>
   </g>
   <g id="text_51">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #9a9ea8" x="412.937981" y="606.598307" transform="rotate(-0 412.937981 606.598307)">QNN forecasting demos, matched by classical ML</text>
   </g>
   <g id="text_52">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="215.78361" y="627.807064" transform="rotate(-0 215.78361 627.807064)">Media &amp; Entertainment</text>
   </g>
   <g id="text_53">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #9a9ea8" x="412.937981" y="627.469318" transform="rotate(-0 412.937981 627.469318)">QRNG-seeded generative art in toy form; no advantage</text>
   </g>
   <g id="text_54">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="215.78361" y="648.678075" transform="rotate(-0 215.78361 648.678075)">Semiconductors &amp; EDA</text>
   </g>
   <g id="text_55">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #9a9ea8" x="412.937981" y="648.340329" transform="rotate(-0 412.937981 648.340329)">exploratory device-materials sim; classical GPU HPC leads</text>
   </g>
   <g id="text_56">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="215.78361" y="669.549086" transform="rotate(-0 215.78361 669.549086)">AI &amp; Machine Learning</text>
   </g>
   <g id="text_57">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #9a9ea8" x="412.937981" y="669.21134" transform="rotate(-0 412.937981 669.21134)">QML classifies toy datasets — feasibility, not advantage</text>
   </g>
   <g id="text_58">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="215.78361" y="690.420097" transform="rotate(-0 215.78361 690.420097)">Climate &amp; Sustainability</text>
   </g>
   <g id="text_59">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #9a9ea8" x="412.937981" y="690.082351" transform="rotate(-0 412.937981 690.082351)">resource estimates improved — not yet a computation</text>
   </g>
   <g id="text_60">
    <text style="font-weight: 700; font-size: 9.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="215.78361" y="711.291108" transform="rotate(-0 215.78361 711.291108)">Weather Modeling</text>
   </g>
   <g id="text_61">
    <text style="font-size: 7.9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #9a9ea8" x="412.937981" y="710.953362" transform="rotate(-0 412.937981 710.953362)">toy-scale QNN nowcasting, matched by classical ML</text>
   </g>
   <g id="text_62">
    <text style="font-weight: 700; font-size: 14px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="7.2" y="17.837813" transform="rotate(-0 7.2 17.837813)">Where each industry actually stands</text>
   </g>
   <g id="text_63">
    <text style="font-size: 8px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="23.200934" y="731.850353" transform="rotate(-0 23.200934 731.850353)">quantum sensing</text>
   </g>
   <g id="text_64">
    <text style="font-size: 8px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="200.354137" y="731.850041" transform="rotate(-0 200.354137 731.850041)">crypto / PQC</text>
   </g>
   <g id="text_65">
    <text style="font-size: 8px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="377.50734" y="731.850353" transform="rotate(-0 377.50734 731.850353)">optimization (annealing/QUBO)</text>
   </g>
   <g id="text_66">
    <text style="font-size: 8px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="554.660543" y="731.850353" transform="rotate(-0 554.660543 731.850353)">chemistry / simulation</text>
   </g>
   <g id="text_67">
    <text style="font-style: italic; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #9a9ea8" x="7.2" y="746.304178" transform="rotate(-0 7.2 746.304178)">Near-term wins are sensing and defensive PQC; every gate-model &#39;compute&#39; use is pilot-or-promise, gated on fault tolerance. &#39;Hype&#39; (in every card) = near-term compute advantage / trillion-$ TAM lines. Source: §05.</text>
   </g>
   <g id="PathCollection_82">
    <defs>
     <path id="mab5485b3e4" d="M 0 5.361903 
C 1.421993 5.361903 2.785937 4.796939 3.791438 3.791438 
C 4.796939 2.785937 5.361903 1.421993 5.361903 0 
C 5.361903 -1.421993 4.796939 -2.785937 3.791438 -3.791438 
C 2.785937 -4.796939 1.421993 -5.361903 0 -5.361903 
C -1.421993 -5.361903 -2.785937 -4.796939 -3.791438 -3.791438 
C -4.796939 -2.785937 -5.361903 -1.421993 -5.361903 0 
C -5.361903 1.421993 -4.796939 2.785937 -3.791438 3.791438 
C -2.785937 4.796939 -1.421993 5.361903 0 5.361903 
z
" style="stroke: #16181d" />
    </defs>
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#mab5485b3e4" x="167.209345" y="99.467385" style="fill: #2f7d4f; stroke: #16181d" />
    </g>
   </g>
   <g id="PathCollection_83">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#mab5485b3e4" x="167.209345" y="120.338396" style="fill: #2f7d4f; stroke: #16181d" />
    </g>
   </g>
   <g id="PathCollection_84">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#mab5485b3e4" x="167.209345" y="141.209407" style="fill: #2f7d4f; stroke: #16181d" />
    </g>
   </g>
   <g id="PathCollection_85">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#mab5485b3e4" x="167.209345" y="162.080418" style="fill: #2f7d4f; stroke: #16181d" />
    </g>
   </g>
   <g id="PathCollection_86">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#mab5485b3e4" x="167.209345" y="182.951429" style="fill: #2f7d4f; stroke: #16181d" />
    </g>
   </g>
   <g id="PathCollection_87">
    <defs>
     <path id="m1116f8817e" d="M 0 5.361903 
C 1.421993 5.361903 2.785937 4.796939 3.791438 3.791438 
C 4.796939 2.785937 5.361903 1.421993 5.361903 0 
C 5.361903 -1.421993 4.796939 -2.785937 3.791438 -3.791438 
C 2.785937 -4.796939 1.421993 -5.361903 0 -5.361903 
C -1.421993 -5.361903 -2.785937 -4.796939 -3.791438 -3.791438 
C -4.796939 -2.785937 -5.361903 -1.421993 -5.361903 0 
C -5.361903 1.421993 -4.796939 2.785937 -3.791438 3.791438 
C -2.785937 4.796939 -1.421993 5.361903 0 5.361903 
z
" style="stroke: #16181d" />
    </defs>
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m1116f8817e" x="167.209345" y="203.82244" style="fill: #0b6d7a; stroke: #16181d" />
    </g>
   </g>
   <g id="PathCollection_88">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m1116f8817e" x="167.209345" y="224.693451" style="fill: #0b6d7a; stroke: #16181d" />
    </g>
   </g>
   <g id="PathCollection_89">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m1116f8817e" x="167.209345" y="245.564462" style="fill: #0b6d7a; stroke: #16181d" />
    </g>
   </g>
   <g id="PathCollection_90">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m1116f8817e" x="167.209345" y="266.435472" style="fill: #0b6d7a; stroke: #16181d" />
    </g>
   </g>
   <g id="PathCollection_91">
    <defs>
     <path id="m54c47a55ce" d="M 0 5.361903 
C 1.421993 5.361903 2.785937 4.796939 3.791438 3.791438 
C 4.796939 2.785937 5.361903 1.421993 5.361903 0 
C 5.361903 -1.421993 4.796939 -2.785937 3.791438 -3.791438 
C 2.785937 -4.796939 1.421993 -5.361903 0 -5.361903 
C -1.421993 -5.361903 -2.785937 -4.796939 -3.791438 -3.791438 
C -4.796939 -2.785937 -5.361903 -1.421993 -5.361903 0 
C -5.361903 1.421993 -4.796939 2.785937 -3.791438 3.791438 
C -2.785937 4.796939 -1.421993 5.361903 0 5.361903 
z
" style="stroke: #16181d" />
    </defs>
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m54c47a55ce" x="167.209345" y="287.306483" style="fill: #0e8ea0; stroke: #16181d" />
    </g>
   </g>
   <g id="PathCollection_92">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m54c47a55ce" x="167.209345" y="308.177494" style="fill: #0e8ea0; stroke: #16181d" />
    </g>
   </g>
   <g id="PathCollection_93">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m54c47a55ce" x="101.491221" y="362.442123" style="fill: #0e8ea0; stroke: #16181d" />
    </g>
   </g>
   <g id="PathCollection_94">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m54c47a55ce" x="101.491221" y="383.313134" style="fill: #0e8ea0; stroke: #16181d" />
    </g>
   </g>
   <g id="PathCollection_95">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m54c47a55ce" x="101.491221" y="404.184145" style="fill: #0e8ea0; stroke: #16181d" />
    </g>
   </g>
   <g id="PathCollection_96">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m54c47a55ce" x="101.491221" y="425.055156" style="fill: #0e8ea0; stroke: #16181d" />
    </g>
   </g>
   <g id="PathCollection_97">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m54c47a55ce" x="101.491221" y="445.926167" style="fill: #0e8ea0; stroke: #16181d" />
    </g>
   </g>
   <g id="PathCollection_98">
    <defs>
     <path id="m8e1081fb97" d="M 0 5.361903 
C 1.421993 5.361903 2.785937 4.796939 3.791438 3.791438 
C 4.796939 2.785937 5.361903 1.421993 5.361903 0 
C 5.361903 -1.421993 4.796939 -2.785937 3.791438 -3.791438 
C 2.785937 -4.796939 1.421993 -5.361903 0 -5.361903 
C -1.421993 -5.361903 -2.785937 -4.796939 -3.791438 -3.791438 
C -4.796939 -2.785937 -5.361903 -1.421993 -5.361903 0 
C -5.361903 1.421993 -4.796939 2.785937 -3.791438 3.791438 
C -2.785937 4.796939 -1.421993 5.361903 0 5.361903 
z
" style="stroke: #16181d" />
    </defs>
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m8e1081fb97" x="101.491221" y="466.797178" style="fill: #b5741a; stroke: #16181d" />
    </g>
   </g>
   <g id="PathCollection_99">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m8e1081fb97" x="101.491221" y="487.668189" style="fill: #b5741a; stroke: #16181d" />
    </g>
   </g>
   <g id="PathCollection_100">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m8e1081fb97" x="101.491221" y="508.5392" style="fill: #b5741a; stroke: #16181d" />
    </g>
   </g>
   <g id="PathCollection_101">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m8e1081fb97" x="101.491221" y="529.410211" style="fill: #b5741a; stroke: #16181d" />
    </g>
   </g>
   <g id="PathCollection_102">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m8e1081fb97" x="101.491221" y="550.281221" style="fill: #b5741a; stroke: #16181d" />
    </g>
   </g>
   <g id="PathCollection_103">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m54c47a55ce" x="35.773097" y="604.54585" style="fill: #0e8ea0; stroke: #16181d" />
    </g>
   </g>
   <g id="PathCollection_104">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m54c47a55ce" x="35.773097" y="625.416861" style="fill: #0e8ea0; stroke: #16181d" />
    </g>
   </g>
   <g id="PathCollection_105">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m8e1081fb97" x="35.773097" y="646.287872" style="fill: #b5741a; stroke: #16181d" />
    </g>
   </g>
   <g id="PathCollection_106">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m8e1081fb97" x="35.773097" y="667.158883" style="fill: #b5741a; stroke: #16181d" />
    </g>
   </g>
   <g id="PathCollection_107">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m8e1081fb97" x="35.773097" y="688.029894" style="fill: #b5741a; stroke: #16181d" />
    </g>
   </g>
   <g id="PathCollection_108">
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m8e1081fb97" x="35.773097" y="708.900905" style="fill: #b5741a; stroke: #16181d" />
    </g>
   </g>
   <g id="PathCollection_109">
    <defs>
     <path id="mb3d4e7b170" d="M 0 4.873397 
C 1.29244 4.873397 2.532119 4.359905 3.446012 3.446012 
C 4.359905 2.532119 4.873397 1.29244 4.873397 0 
C 4.873397 -1.29244 4.359905 -2.532119 3.446012 -3.446012 
C 2.532119 -4.359905 1.29244 -4.873397 0 -4.873397 
C -1.29244 -4.873397 -2.532119 -4.359905 -3.446012 -3.446012 
C -4.359905 -2.532119 -4.873397 -1.29244 -4.873397 0 
C -4.873397 1.29244 -4.359905 2.532119 -3.446012 3.446012 
C -2.532119 4.359905 -1.29244 4.873397 0 4.873397 
z
" style="stroke: #16181d" />
    </defs>
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#mb3d4e7b170" x="12.914619" y="729.771916" style="fill: #2f7d4f; stroke: #16181d" />
    </g>
   </g>
   <g id="PathCollection_110">
    <defs>
     <path id="m9cc0957985" d="M 0 4.873397 
C 1.29244 4.873397 2.532119 4.359905 3.446012 3.446012 
C 4.359905 2.532119 4.873397 1.29244 4.873397 0 
C 4.873397 -1.29244 4.359905 -2.532119 3.446012 -3.446012 
C 2.532119 -4.359905 1.29244 -4.873397 0 -4.873397 
C -1.29244 -4.873397 -2.532119 -4.359905 -3.446012 -3.446012 
C -4.359905 -2.532119 -4.873397 -1.29244 -4.873397 0 
C -4.873397 1.29244 -4.359905 2.532119 -3.446012 3.446012 
C -2.532119 4.359905 -1.29244 4.873397 0 4.873397 
z
" style="stroke: #16181d" />
    </defs>
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m9cc0957985" x="190.067822" y="729.771916" style="fill: #0b6d7a; stroke: #16181d" />
    </g>
   </g>
   <g id="PathCollection_111">
    <defs>
     <path id="mca9e74fb0f" d="M 0 4.873397 
C 1.29244 4.873397 2.532119 4.359905 3.446012 3.446012 
C 4.359905 2.532119 4.873397 1.29244 4.873397 0 
C 4.873397 -1.29244 4.359905 -2.532119 3.446012 -3.446012 
C 2.532119 -4.359905 1.29244 -4.873397 0 -4.873397 
C -1.29244 -4.873397 -2.532119 -4.359905 -3.446012 -3.446012 
C -4.359905 -2.532119 -4.873397 -1.29244 -4.873397 0 
C -4.873397 1.29244 -4.359905 2.532119 -3.446012 3.446012 
C -2.532119 4.359905 -1.29244 4.873397 0 4.873397 
z
" style="stroke: #16181d" />
    </defs>
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#mca9e74fb0f" x="367.221025" y="729.771916" style="fill: #0e8ea0; stroke: #16181d" />
    </g>
   </g>
   <g id="PathCollection_112">
    <defs>
     <path id="m78cc1a3385" d="M 0 4.873397 
C 1.29244 4.873397 2.532119 4.359905 3.446012 3.446012 
C 4.359905 2.532119 4.873397 1.29244 4.873397 0 
C 4.873397 -1.29244 4.359905 -2.532119 3.446012 -3.446012 
C 2.532119 -4.359905 1.29244 -4.873397 0 -4.873397 
C -1.29244 -4.873397 -2.532119 -4.359905 -3.446012 -3.446012 
C -4.359905 -2.532119 -4.873397 -1.29244 -4.873397 0 
C -4.873397 1.29244 -4.359905 2.532119 -3.446012 3.446012 
C -2.532119 4.359905 -1.29244 4.873397 0 4.873397 
z
" style="stroke: #16181d" />
    </defs>
    <g clip-path="url(#pc9932f729e)">
     <use xlink:href="#m78cc1a3385" x="544.374228" y="729.771916" style="fill: #b5741a; stroke: #16181d" />
    </g>
   </g>
  </g>
 </g>
 <defs>
  <clippath id="pc9932f729e">
   <rect x="7.2" y="11.809139" width="737.185909" height="736.746687" />
  </clippath>
 </defs>
</svg></span>
<figcaption>The industry map — 27 industries on the proven / pilot / promise axis, coloured by the kind of quantum tech furthest along. Readiness rises along the diagonal toward sensing: the eight industries with something deployed today all run a quantum sensor or a cryptographic migration, and none runs a profitable quantum computer.</figcaption>
</figure>
