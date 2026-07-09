# Glossary

Plain-language definitions of the technical terms a reader meets in *The Quantum Atlas*. Chapter cross-references point to where a term is explained most fully. Where a term carries a graded-evidence nuance (an "advantage" that may not survive classical counterattack, a vendor metric, a forecast), the entry says so.

---

**Adiabatic theorem** — If you start a system in the lowest-energy state of an easy problem and change the problem slowly enough, it stays in the lowest-energy state of the hard problem you end on. This is the physical principle behind quantum annealing; "slowly enough" is set by the smallest energy gap along the way, which can shrink and erase any speedup (see Ch. 1, Ch. 2).

**Algorithmic qubits** — A vendor benchmark (IonQ, QED-C) that reports how many qubits a machine can use in a real algorithm rather than raw count. Like all single-number benchmarks it flatters the architecture that defined it; treat it as a T4 claim (see Ch. 3, Ch. 8).

**Amplitude (probability amplitude)** — The complex number attached to each possible outcome of a quantum state. Squaring its magnitude gives the probability of that outcome (see Born rule). Amplitudes can add and cancel, which is what makes interference possible (see Ch. 1).

**Amplitude amplification** — The engine inside Grover's algorithm: repeatedly nudging probability toward the answer you want so it becomes likely to be measured (see Ch. 3).

**Amplitude encoding** — Packing a list of classical numbers into the amplitudes of a quantum state, so a 1,024-number vector fits in 10 qubits. Cheap to store, expensive to load — the loading cost is where many "speedups" quietly die (see Ch. 3, qRAM).

**Amplitude estimation (QAE)** — A quantum routine that estimates an average or probability quadratically faster than classical Monte Carlo sampling. The most likely survivor of the quadratic-speedup family, and the basis of quantum finance pitches, though it needs fault-tolerant hardware and an efficient way to load the data (see Ch. 3).

**Ancilla** — A helper qubit added to a circuit to assist a measurement, gate, or error-correction step, then discarded or reset. Real detectors and error-correction cycles are full of them (see Ch. 1, Ch. 3).

**Annealing (quantum annealing)** — A non-gate model of computation that solves optimization problems by slowly settling into a low-energy state (see adiabatic theorem). D-Wave shipped the only commercial annealers; their advantage over tuned classical solvers is contested and unproven at scale (see Ch. 2, Ch. 5).

**Anyon** — An exotic particle possible only in two dimensions, whose quantum state changes when you move one around another. "Non-abelian" anyons are the basis of topological quantum computing (see Majorana zero mode; Ch. 1, Ch. 2).

**Area law** — A rule of thumb that entanglement in many natural systems grows with the boundary of a region rather than its volume. When it holds, classical tensor-network methods can simulate the system efficiently — a recurring reason some "quantum advantage" claims fall to classical computers (see Ch. 1, Ch. 3).

**Assured PNT (positioning, navigation, timing)** — Knowing where and when you are without GPS, which can be jammed or spoofed. The quantum answer fuses a drift-free clock, a cold-atom accelerometer, and a magnetic map. Defense-funded, nearing first deployments; the flashiest vendor accuracy numbers are unverified T4 field trials (see Ch. 4, Ch. 5).

**Atom interferometry** — Splitting and recombining a cloud of laser-cooled atoms so their wave nature reveals gravity, acceleration, or rotation. The instrument under cold-atom gravimeters and quantum inertial navigation (see Ch. 4).

**Barren plateau** — A training failure in variational quantum algorithms: for expressive circuits the optimization landscape flattens exponentially as qubits are added, so gradients vanish and learning stalls. One of three theoretical results that turned the field against near-term variational methods (see Ch. 3).

**BB84** — The first quantum key distribution protocol (Bennett–Brassard, 1984). It encodes key bits in photon polarizations that an eavesdropper cannot copy or measure without leaving a detectable trace (see no-cloning; Ch. 4, Ch. 7).

**Bell inequality / CHSH** — A bound that any "local realist" theory (definite properties, no faster-than-light influence) must obey. Quantum mechanics violates it, and experiments confirm the violation. CHSH is the four-setting version whose value tops out at 2 classically and reaches 2√2 quantumly (see Tsirelson bound). Violation is the operational certificate that a device holds real entanglement (see Ch. 1, Ch. 7).

**Bell state** — A maximally entangled pair of qubits, perfectly correlated no matter how far apart. The basic resource for teleportation and entanglement-based cryptography (see Ch. 1).

**Below-threshold** — The regime where making an error-correcting code larger makes the logical error rate smaller. Google's Willow (2024) was the first clear demonstration; it means scaling error correction is now an engineering problem rather than a physics gamble (see threshold theorem; Ch. 2, Ch. 3).

**Berry phase (geometric phase)** — A phase a quantum state picks up when its parameters are cycled around a loop, depending only on the path's shape and not on speed. Its speed-independence grounds error-resistant "holonomic" gates (see Ch. 1).

**Block encoding** — Embedding a matrix inside a larger unitary so a quantum computer can operate on it. The input format that QSVT and modern algorithms assume; where only weak "sampling access" is available, classical methods can often match the quantum routine (see Ch. 3).

**Bloch sphere** — The globe used to picture a single qubit: every pure state is a point on the surface, and a single-qubit gate is a rotation of the sphere (see Ch. 1).

**Born rule** — The recipe for turning a quantum state into predictions: the probability of an outcome is the squared magnitude of its amplitude. Every prediction quantum mechanics makes is, in the end, a Born-rule probability (see Ch. 1).

**Bosonic qubit** — A qubit stored in the many energy levels of a single oscillator (a superconducting cavity) rather than a two-level system, so one physical mode carries built-in redundancy (see cat qubit, GKP state; Ch. 2).

**Break-even (error correction)** — The milestone where an error-corrected logical qubit outlives or outperforms the best physical qubit doing the same job. The meaningful 2025 threshold; deep computation across many logical qubits at once is the next bar and has not been shown (see Ch. 2, Ch. 3).

**CAGR (compound annual growth rate)** — The smoothed year-on-year rate at which a market or figure would grow to reach a projected value, assuming steady compounding. Market forecasts often headline a large CAGR; it is a modeling assumption, not measured revenue, and reads as T5 (see TAM; Ch. 6, Ch. 8).

**Cat qubit** — A bosonic qubit encoded in two opposite-phase states of light ("Schrödinger-cat" states). A two-photon drive suppresses bit-flip errors exponentially, leaving only phase-flips for a simple 1D code to catch — trading a hard 2D error-correction problem for an easier 1D one. The open question is whether the noise bias survives fast gates (see Ch. 2).

**Certified randomness** — Provably unpredictable random bits generated and verified using a quantum computer. The JPMorgan–Quantinuum result (2025) is arguably the first useful thing a beyond-classical machine has done, though the market for it is small (see Ch. 3, Ch. 4).

**Circuit (quantum circuit)** — A sequence of quantum gates applied to qubits, ending in measurement. The standard way to describe a quantum computation (see Ch. 3).

**Circuit cutting** — Splitting a circuit too wide for the hardware into smaller pieces, at the cost of exponentially more classical post-processing. Useful only when the cuts are few (see Ch. 3).

**Circuit QED** — The physics of coupling superconducting qubits to microwave resonators on a chip — applied field quantization, and the backbone of transmon processors (see Ch. 1, Ch. 2).

**Classical shadows** — A measurement technique that predicts many properties of a quantum state from surprisingly few random measurements, with a sample cost independent of system size. It buys measurement efficiency rather than a computational speedup (see Ch. 3).

**Clifford gates / Clifford+T** — Clifford gates (Hadamard, phase, CNOT) are the "free" gates a classical computer can simulate efficiently. Adding the single non-Clifford T gate makes the set universal — and the T gate is where quantum hardness and cost live (see Gottesman–Knill; Ch. 3).

**CLOPS (Circuit Layer Operations Per Second)** — An IBM speed benchmark measuring how fast a machine runs circuit layers. One of several incompatible vendor metrics; T4 by rule (see Ch. 3, Ch. 8).

**CNSA 2.0** — The US National Security Agency's requirement that new national-security systems adopt post-quantum cryptography, capable by 1 January 2027 and fully migrated by 2030–2035 (see Ch. 4, Ch. 6).

**Coherence time (T1 / T2)** — How long a qubit keeps its quantum information. **T1** is energy relaxation (the qubit decays toward its ground state); **T2** is dephasing (it loses the phase relationship that carries superposition). The headline spec of every hardware modality (note: T1/T2 here are coherence times, unrelated to the evidence tiers T1–T6) (see decoherence; Ch. 1, Ch. 2).

**Coherent state** — The most "classical" state of light, closest to a steady wave. The building block of cat qubits and a native state of photonic hardware (see Ch. 1).

**Complementarity** — The principle that some pairs of properties (position and momentum, or two measurement bases) cannot both be sharply defined at once; measuring one blurs the other (see uncertainty principle; Ch. 1).

**Contextuality (Kochen–Specker theorem)** — A no-go result proving quantum outcomes cannot be pre-assigned as if they existed independently of what you choose to measure. It is also a resource: contextuality is exactly what "magic states" supply to make quantum computing hard (see Ch. 1).

**Cooper pair** — Two electrons bound together that move without resistance in a superconductor. Cooper pairs tunneling across a Josephson junction are what make a transmon qubit work (see Ch. 1, Ch. 2).

**Cross-entropy benchmarking** — The statistical test behind random-circuit "supremacy" claims. It is not a proof of correctness and has been spoofed classically, which is part of why advantage claims are contested by default (see Ch. 8).

**CRQC (cryptographically relevant quantum computer)** — A future machine large enough to run Shor's algorithm against real RSA or elliptic-curve keys and break today's public-key encryption. Point estimates cluster around 2030 ± 3 years, with roughly 50% odds by 2035 (Global Risk Institute) and weight trailing toward 2040; a minority holds it will never arrive. The uncertainty is why migration must start now (see harvest now decrypt later; Ch. 4, Ch. 8).

**Cryo-CMOS** — Control electronics fabricated in standard silicon that run cold, inside the refrigerator next to the qubits, to reduce the crippling number of wires. The bet that lets superconducting and silicon machines scale past a few thousand qubits (see Ch. 2).

**Cryostat / dilution refrigerator** — The refrigerator that cools superconducting, silicon-spin, and bosonic qubits to near absolute zero by exploiting a mixture of helium-3 and helium-4. It sets hard ceilings on cooling power, volume, and wiring. Bluefors and Oxford Instruments dominate the market (see Ch. 2, Ch. 6).

**Crypto-agility** — Designing systems so their cryptographic algorithms can be swapped out quickly, without re-architecting. The practical requirement behind post-quantum migration: an agile system can adopt new standards as they land and retire broken ones fast (see post-quantum cryptography; Ch. 4, Ch. 6).

**Decoherence** — The loss of quantum behavior when a system leaks its phase information into its environment. It is why the everyday world looks classical, and it is the central enemy of every qubit — the reason error correction exists (see Ch. 1).

**Dequantization** — Writing a classical algorithm that matches a claimed quantum speedup, removing the advantage. Ewin Tang's 2018 work started a program that erased the exponential edge of several quantum machine-learning and linear-algebra methods (see Ch. 3, Ch. 8).

**Deemed export** — Under US export-control law, giving a foreign national access to controlled technology inside the country counts as an export to their home country. It means quantum hiring and lab access can trigger the same license rules as shipping hardware abroad (see export controls; Ch. 6).

**Density matrix** — A more general description of a quantum state that also covers "mixed" states — statistical blends arising from noise or ignorance. Its off-diagonal terms carry the coherence that decoherence destroys (see Ch. 1).

**Dephasing** — Loss of the phase relationship between the parts of a superposition, without energy loss. The T2 process (see coherence time; Ch. 1).

**Discord (quantum discord)** — A measure of quantum correlations that can persist even in states with no entanglement. Proposed as the resource behind certain mixed-state speedups; whether it is a usable resource is contested (see Ch. 1).

**DiVincenzo criteria** — David DiVincenzo's 2000 checklist of five requirements any physical system must meet to be a quantum computer (scalable qubits, initialization, long coherence, a universal gate set, and readout), plus two more for communication. Still the field's scorecard (see Ch. 2).

**DRAG** — A standard pulse-shaping technique that suppresses leakage into unwanted energy levels during a gate. Well-calibrated DRAG already runs near the physical noise floor for single-qubit gates (see optimal control; Ch. 3).

**Dual-rail** — A way of encoding a photonic qubit across two paths or modes, with the photon in one or the other. One of several photonic encodings (see Ch. 2).

**E91** — Ekert's 1991 quantum key distribution protocol, which draws the key from entangled pairs and certifies security through a Bell-inequality violation (see Ch. 4, Ch. 7).

**Ebit** — One unit of entanglement: the amount contained in one maximally entangled pair of qubits (see Ch. 1).

**Eigenvalue / eigenstate** — For a given operation, an eigenstate is a state the operation leaves pointing the same way, and its eigenvalue is the number it gets scaled by. Measuring an observable can only return one of its eigenvalues, and the state collapses to the matching eigenstate (see observable, Born rule; Ch. 1).

**Evidence tiers (T1–T6)** — The atlas's grading scale for how much a claim can be trusted: T1 established physics (textbook, reproduced for decades); T2 peer-reviewed result; T3 preprint or conference report, not yet refereed; T4 vendor claim, not independently reproduced; T5 analyst or market forecast; T6 speculative. A vendor press release (T4) and a peer-reviewed threshold demonstration (T2) never weigh the same. "Quantum advantage" claims are treated as contested by default. See the Preface and Appendix A.

**EIT (electromagnetically induced transparency)** — An optical effect used to read out Rydberg atoms in RF sensing; the atoms become transparent to a probe laser in a way that shifts measurably with an applied field (see Rydberg; Ch. 4).

**Entanglement** — A shared quantum state of two or more systems that no description of the parts alone can reproduce. Measuring one instantly correlates with the other however far apart, yet it carries no message on its own. The workhorse resource of quantum computing, communication, and error correction (see Ch. 1).

**Entanglement swapping** — Entangling two particles that never interacted, by using a joint measurement on intermediaries. The primitive a quantum repeater uses to stitch short links into long ones (see Ch. 1, Ch. 4).

**EPR (Einstein–Podolsky–Rosen)** — The 1935 argument that quantum mechanics is either incomplete or nonlocal, built on an entangled pair. Intended as a critique, it became the seed of entanglement, teleportation, and quantum cryptography (see Ch. 1, Ch. 7).

**Error correction (QEC)** — Encoding one protected "logical" qubit across many physical qubits so errors are detected and fixed faster than they accumulate. The path from noisy hardware to trustworthy computation (see threshold theorem, surface code; Ch. 3).

**Error mitigation** — Cheaper near-term techniques (ZNE, PEC, and others) that reduce the bias in a measured value by running extra circuits, without protecting the quantum state. Its cost grows exponentially with circuit depth, so it extends reach but is never an asymptotic fix (see Ch. 3).

**EuroQCI** — A planned continent-wide quantum-secure communication network across all 27 EU member states (see Quantum Flagship; Ch. 4, Ch. 6).

**Export controls** — Government restrictions on selling quantum computers and enabling equipment abroad. The 2024 US controls are "plurilateral," rewarding allies who adopt matching rules; effectiveness and cohesion are unproven (see Ch. 6).

**Fault tolerance** — Building a computer so that a single physical fault — even one during the correction step itself — cannot cascade into a logical error. The regime useful algorithms need, and the goal the whole error-correction stack serves (see Ch. 3, Ch. 8).

**FeMoco** — The iron-molybdenum cofactor that lets bacteria fix nitrogen at room temperature. The textbook "killer app" target for quantum chemistry; recent estimates put it beyond a thousand logical qubits and billions of gates, far past today's hardware (see Ch. 5, Ch. 8).

**Fidelity** — A score from 0 to 1 for how close a produced quantum operation or state is to the ideal. Two-qubit gate fidelity is the binding constraint on whether error correction works; "three nines" (99.9%) is the rough entry point (see Ch. 2, Ch. 3).

**Fock state** — A state of light with a definite number of photons. The native language of photonic and bosonic hardware (see Ch. 1).

**Foundry** — A semiconductor fabrication plant. The open question for silicon and photonic qubits is whether a foundry can make thousands of qubits uniformly enough — yield at wafer scale, which vendors publish least (see Ch. 2).

**Gate (quantum gate)** — A basic reversible operation on one or more qubits — the quantum analog of a logic gate. Sequences of gates form circuits (see Ch. 3).

**Gaussian states** — A well-behaved class of light states (including coherent and squeezed states) that are, on their own, classically simulable. Reaching universality in photonic hardware requires a non-Gaussian element (see Wigner negativity; Ch. 1).

**GHZ state** — A maximally entangled state of three or more qubits. Used in tests of quantum mechanics and as a resource in networked and clock protocols (see Ch. 1, Ch. 4).

**GKP state** — A "grid" bosonic code state that protects a qubit against small shifts in an oscillator. A sibling of the cat code and one route to fault-tolerant photonic and cavity hardware (see Ch. 2).

**Gottesman–Knill theorem** — The result that circuits built only from Clifford gates and measurements can be simulated efficiently on a classical computer. It pins down why the non-Clifford T gate is the expensive, load-bearing resource (see Ch. 1, Ch. 3).

**GRAPE / Krotov / CRAB** — Numerical methods for shaping the control pulses that realize each gate ("quantum optimal control"). They pay off most for two-qubit and leakage-heavy gates and for robustness against drift (see Ch. 3).

**Gravimetry** — Measuring gravity precisely, often to find what is underground. Cold-atom gravimeters are absolute and drift-free because the atom is the test mass; survey instruments (Exail's AQG) already ship (see Ch. 4, Ch. 5).

**Grover's algorithm** — A quantum search that finds a marked item among N possibilities in about √N tries instead of N. Provably optimal for unstructured search, but careful accounting shows its quadratic speedup likely delivers no practical advantage once error-correction overhead and a slow logical clock are charged (see Ch. 3).

**Hadamard test** — A short circuit that estimates the overlap between two quantum states, including its sign. Used in the atlas's reference implementation to measure cosine similarity (see swap test; Ch. 3).

**Hamiltonian** — The mathematical object describing a system's energy and how its state evolves in time. Encoding a problem in a Hamiltonian is the starting point for annealing and simulation (see Ch. 1, Ch. 3).

**Hamiltonian simulation** — Using a quantum computer to model how a quantum system evolves. The best-founded quantum advantage, strongest for long-time, high-entanglement dynamics. Method families include Trotter–Suzuki, qDRIFT, LCU, and qubitization (see Ch. 3).

**Harvest now, decrypt later (HNDL)** — The threat that an adversary records encrypted traffic today and stores it to decrypt once a capable quantum computer exists. Any secret with a long shelf life is already exposed, which is the whole argument for migrating to post-quantum cryptography now (see Mosca's inequality; Ch. 4).

**HEMT (high-electron-mobility transistor)** — A low-noise amplifier stage that boosts a qubit's faint readout signal after the first cryogenic amplifier. Low Noise Factory supplies most of them (see paramp/TWPA; Ch. 2).

**Heisenberg limit** — The ultimate precision floor for a measurement, where sensitivity improves with the number of resources N (rather than √N). Reaching it needs entanglement; most sensors sit at the easier standard quantum limit (see Ch. 4).

**HHL algorithm** — The Harrow–Hassidim–Lloyd routine for solving linear systems, exponentially faster in principle — but only if four fine-print assumptions hold together (sparse well-conditioned matrix, efficient data loading, efficient simulation, and reading out just a summary). The canonical "read the fine print" algorithm; no practical problem has been shown to live in its sweet spot (see Ch. 3).

**Hilbert space** — The mathematical space of all possible states of a quantum system. An n-qubit register lives in a space of 2ⁿ dimensions, which is where the "exponential" of quantum computing comes from (see Ch. 1).

**Holevo bound** — The limit that n qubits can deliver at most n classical bits of readable information, however much they seem to hold internally (see Ch. 1).

**Hyperpolarization** — Boosting a nuclear magnetic-resonance signal enormously (parahydrogen or DNP methods) to make real-time metabolic MRI feasible. The near-clinic strand of quantum-enhanced MRI (see Ch. 4).

**Interconnect** — The link that carries quantum information between separate chips or modules. Gates across a link are slower and far noisier than on-chip gates (IBM reported ~3.5% error across one), and whether any interconnect stays below the error-correction threshold is a quiet, decisive open question (see transduction; Ch. 2, Ch. 8).

**Interference** — The adding and canceling of quantum amplitudes, the effect with no classical analog that underlies every quantum speedup (see Ch. 1).

**Jordan–Wigner / Bravyi–Kitaev** — Two standard recipes for mapping electrons (fermions) onto qubits so a quantum computer can simulate chemistry, enforcing the antisymmetry that fermions require. A real driver of circuit depth in chemistry problems (see Ch. 1, Ch. 3).

**Josephson junction** — Two superconductors separated by a thin barrier, across which Cooper pairs tunnel. Its nonlinearity is what turns a superconducting circuit into a usable qubit (the transmon) (see Ch. 1, Ch. 2).

**Kraus operators** — The mathematical pieces that describe how noise or any physical process transforms a quantum state. The machinery used to simulate error channels and prove correction theorems (see purification; Ch. 1).

**Lieb–Robinson bound** — A speed limit on how fast information and entanglement can spread through a lattice of interacting particles, even without relativity. It underpins why tensor-network simulation works and why local error correction is stable (see Ch. 1).

**Lindblad master equation** — The standard equation for how an open quantum system evolves while leaking into its environment — unitary evolution plus irreversible noise terms. The formal frame for decoherence (see Ch. 1).

**Logical qubit** — A single protected qubit built from many physical qubits through error correction, and the unit real algorithms actually consume. Honest counts come with a code distance, a measured error rate, and whether a universal gate set was used or the device merely detected errors (see Ch. 3).

**Loophole-free Bell test** — A Bell experiment that closes the escape routes (locality and detection) local-realist theories could hide in. The 2015 trio of experiments shut the last serious doubt about entanglement being real (see Ch. 1, Ch. 7).

**Magic state / magic-state distillation** — A special resource state needed to run the non-Clifford T gate fault-tolerantly, manufactured by "distilling" many noisy copies into a few clean ones. Historically the dominant cost of a fault-tolerant computer; newer "cultivation" methods cut it (see Ch. 1, Ch. 3).

**Magnetometry / OPM** — Measuring tiny magnetic fields. Optically pumped magnetometers (OPMs) run near room temperature and approach the sensitivity of cryogenic SQUIDs, enabling wearable brain scanners (OPM-MEG). The clinical bottleneck is reimbursement, not physics (see Ch. 4, Ch. 5).

**Majorana zero mode** — An exotic quasiparticle predicted to appear at the ends of a topological superconductor, able to store a qubit non-locally so local noise cannot corrupt it. The basis of Microsoft's topological program; after two decades no independently verified topological qubit exists (see Ch. 2, Ch. 8).

**Many-worlds** — An interpretation of quantum mechanics that keeps only the smooth Schrödinger evolution and denies any collapse, with every outcome realized on its own branch. Empirically identical to the alternatives (see measurement problem; Ch. 1).

**Measurement problem** — The unresolved question of what physically happens, and why, when a smoothly evolving quantum state "jumps" to a definite outcome on measurement. The field's oldest open problem, unsolved since 1925 and untouched by any experiment so far (see Ch. 1, Ch. 8).

**ML-KEM / ML-DSA / SLH-DSA** — The core post-quantum cryptography standards NIST finalized in August 2024: ML-KEM (FIPS 203, formerly Kyber) for key exchange, and ML-DSA (FIPS 204, Dilithium) and SLH-DSA (FIPS 205, SPHINCS+) for digital signatures. Already deployed at internet scale (see Ch. 4, Ch. 6).

**Mølmer–Sørensen gate** — The standard entangling two-qubit gate for trapped ions, driven through the ions' shared vibrational motion (see Ch. 2, Ch. 3).

**Monogamy of entanglement** — The rule that entanglement cannot be freely shared: if two systems are maximally entangled, neither has any left for a third. The mathematical reason quantum key distribution is secure (see strong subadditivity; Ch. 1).

**Mosca's inequality** — A rule of thumb for cryptographic urgency: if the time your secrets must stay secret plus the time to migrate exceeds the time until a capable quantum computer arrives, you are already exposed. The formal case for acting on the quantum threat today (see harvest now decrypt later; Ch. 4, Ch. 6).

**Naimark dilation** — The theorem showing that any realistic (noisy, lossy) measurement is just a clean projective measurement on the system plus an extra ancilla. It makes real detector modeling and soft-information decoding possible (see POVM; Ch. 1).

**National Quantum Initiative** — The 2018 US law that organized federal quantum research through a coordination office and NIST, NSF, and DOE centers, authorizing about $1.2B over five years. It lapsed in 2023 and ran on annual appropriations; a 2026 executive-order turn shifted US policy toward industrial policy and equity stakes (see Ch. 6).

**Native gate set** — The small set of gates a given hardware platform physically performs (CZ or iSWAP on superconducting chips, Mølmer–Sørensen on ions, Rydberg CZ on atoms). Compilers rewrite everything into it (see Ch. 3).

**Neutral atom** — A qubit modality using neutral atoms held in movable laser "tweezers," with two-qubit gates driven by exciting atoms to large Rydberg states. The fastest-moving modality of 2024–26 and holder of the logical-qubit record; gate fidelities still trail ions (see Ch. 2).

**NISQ (Noisy Intermediate-Scale Quantum)** — Preskill's 2017 name for today's machines: tens to a few thousand physical qubits, noisy gates, no full error correction — powerful enough to be hard to simulate, too noisy to run deep useful circuits. No NISQ algorithm has produced a durable practical advantage (see Ch. 3, Ch. 7).

**No-cloning theorem** — The impossibility of copying an unknown quantum state. It is the root of quantum cryptography, the reason error correction cannot simply back up data, and why long-haul quantum links need repeaters rather than amplifiers (see Ch. 1).

**No-communication theorem** — The result that entanglement alone cannot send a message faster than light, which is how quantum mechanics coexists with relativity (see Ch. 1).

**Normalized (state)** — A quantum state scaled so its outcome probabilities add up to exactly one. Every physical state must be normalized, since some outcome has to happen; the Born rule only gives valid probabilities for a normalized state (see Born rule, state vector; Ch. 1).

**NV center** — A nitrogen-vacancy defect in diamond that acts as a qubit and sensor at room temperature and ambient pressure, with nanoscale resolution. Best near-term value is sensing; qubit counts are the lowest of any modality (see Ch. 2, Ch. 4).

**Objective collapse (GRW / CSL / Diósi–Penrose)** — A family of theories that add a tiny physical mechanism causing large superpositions to collapse on their own. Unlike other interpretations, they make testable predictions, and experiments are steadily narrowing their allowed range (see measurement problem; Ch. 1, Ch. 8).

**Observable** — Any physical quantity you can measure — position, energy, spin along an axis. In the formalism each observable is an operator whose eigenvalues are the possible readings; measuring one yields an eigenvalue with a Born-rule probability and leaves the state in the matching eigenstate (see eigenvalue, Born rule; Ch. 1).

**Optical clock** — The most precise instruments ever built, keeping time on an atomic transition at optical frequencies (uncertainties near 19 decimal places). Heading toward a redefinition of the SI second around 2030 (see Ch. 4, Ch. 6).

**Optical tweezers** — Tightly focused laser beams that trap and move single neutral atoms, forming the reconfigurable arrays of the neutral-atom modality (see Ch. 2).

**OTOC (out-of-time-order correlator)** — A quantity measuring how quantum information scrambles through a system. The basis of Google's 2025 "Quantum Echoes" claim of a verifiable quantum advantage — a live test of whether the result survives classical attack (see Ch. 3, Ch. 8).

**Overhead (error-correction)** — The many physical qubits and extra operations needed per logical qubit. Estimates span two orders of magnitude depending on code and target error rate — from roughly 2:1 in recent demos to hundreds-to-1,000:1 once T-gate factories and full error rates are counted. The whole game (see Ch. 3, Ch. 8).

**Paramp / TWPA (parametric / traveling-wave amplifier)** — The first, near-noiseless amplifier stage that boosts a superconducting qubit's readout signal while adding the minimum noise physics allows. Without it, fast single-shot readout is impossible; TWPA yield at scale is an open problem (see HEMT; Ch. 2).

**Paul trap** — The oscillating-electric-field trap that holds ions in place. Modern machines use microfabricated "surface traps" rather than bulk versions (see Ch. 2).

**PBR theorem** — The Pusey–Barrett–Rudolph result (2012) arguing that the quantum wavefunction is physically real rather than mere ignorance about a deeper variable, given a preparation-independence assumption (see Ch. 1).

**Photonic qubit** — A qubit encoded in light. Photons barely decohere and travel fiber natively, so networking is easy and much of the machine runs warm — but photons do not interact, so two-qubit gates are probabilistic and photon loss is the dominant error (see Ch. 2).

**Post-quantum cryptography (PQC)** — Classical encryption software built on math problems believed hard even for quantum computers, running on the machines we already own. The most deployed, most economically important item in the whole adjacent-tech chapter, on a legally mandated timeline (see ML-KEM; Ch. 4, Ch. 6).

**POVM** — The honest, general description of a real measurement — a set of positive operators that account for loss, noise, and ancillas — rather than an idealized sharp measurement. What dispersive readout and ion fluorescence actually are (see Naimark dilation; Ch. 1).

**Probabilistic gate (fusion)** — A photonic two-qubit gate that only succeeds part of the time (the leading "fusion" gate about half). The structural challenge of photonic computing, worked around with many attempts and heralding (see Ch. 2).

**Pure state vs mixed state** — A pure state is a single definite quantum state, described by one state vector. A mixed state is a statistical blend of pure states, arising from noise or ignorance, and needs a density matrix to describe it. Decoherence turns pure states into mixed ones (see density matrix, purification; Ch. 1).

**Purification / Stinespring dilation** — The principle that every noisy, mixed state is the shadow of a pure state on a larger space, and every physical process is a clean operation on a bigger system followed by discarding part. "Noise is entanglement with something you stopped tracking" (see Ch. 1).

**Q-day** — The informal name for the day a quantum computer can break today's public-key encryption (see CRQC). Used as a planning horizon; point estimates cluster around 2030 ± 3 years, roughly 50% by 2035, which is why migration starts now (see harvest now decrypt later; Ch. 4, Ch. 6).

**QAOA (Quantum Approximate Optimization Algorithm)** — A near-term variational algorithm for combinatorial optimization. Provably beaten by classical algorithms on broad instance classes, with no demonstrated win on real problems (see variational algorithms; Ch. 3, Ch. 5).

**qLDPC codes** — Quantum low-density parity-check codes that protect many more logical qubits per physical qubit than the surface code, at the price of long-range connectivity the hardware must supply. IBM's bet; whether their connectivity stays below threshold and decodes fast enough is unproven (see Ch. 3, Ch. 8).

**QKD (quantum key distribution)** — Sharing a secret key whose security rests on physics (an eavesdropper unavoidably disturbs the photons) rather than on math. A real two-decade-old product, but structurally niche: limited by distance, by "trusted relay" nodes that know the key, and by four signals agencies advising post-quantum cryptography instead (see Ch. 4).

**QRNG (quantum random number generation)** — Hardware that produces true randomness from quantum measurements. The oldest commercial quantum product line, shipping for twenty years (see Ch. 4).

**qRAM (quantum RAM)** — An assumed device that loads N classical numbers into superposition in about log-N time. The single biggest asterisk on data-heavy quantum advantage: if loading costs O(N), the speedup evaporates. Only tiny 4- and 8-bit demos exist (see Ch. 3).

**QSVT (quantum singular value transformation)** — A unifying framework that recovers most known quantum algorithms (search, matrix inversion, simulation, phase estimation) as special cases by applying a chosen polynomial to a block-encoded matrix. It sharpens what is provably fast rather than adding new speedups, and inherits the same caveats (see Ch. 3).

**Quantum advantage / supremacy** — A quantum computer doing a task no classical computer feasibly can. Graded as **contested by default**: it is defined against the best *known* classical method, which keeps improving, and the historical scoreboard favors the classical attackers (Sycamore and IBM's 2023 utility experiment were both matched classically). "Supremacy" usually means an artificial benchmark; "advantage" a useful task (see Ch. 3, Ch. 8).

**Quantum Flagship** — The EU's €1B, ten-year quantum research program launched in 2018, later joined by EuroQCI, EuroHPC procurements, and a 2025 Quantum Europe Strategy (see Ch. 6).

**Quantum internet** — A network that distributes entanglement itself, removing the trusted-relay weakness of QKD. It needs quantum repeaters and has not yet reached the watershed where a repeater beats direct transmission — a decade-plus infrastructure bet with no paying application yet (see Ch. 4).

**Quantum kernel** — A method that encodes data into quantum states and uses their overlaps as a similarity measure for a classical classifier. The clearest quantum machine-learning object; on classical data the record is negative, matched or beaten by ordinary classical methods (see Ch. 3).

**Quantum machine learning (QML)** — Using quantum circuits for learning tasks. The most hype-inflated corner of the stack: on classical data there is no evidence of practical advantage (repeatedly dequantized); on genuinely quantum data a real but niche advantage exists, awaiting hardware (see Ch. 3, Ch. 5).

**Quantum phase estimation (QPE)** — The core subroutine that reads an eigenvalue (a "phase") to high precision, powering Shor's algorithm and quantum chemistry. Its deep circuits put it firmly in the fault-tolerant era, and it hides a state-preparation cost (see QFT; Ch. 3).

**Quantum Fourier transform (QFT)** — The quantum version of the Fourier transform, using far fewer gates than the classical FFT. On its own it is not a speedup (you cannot read the result out); it becomes powerful as the engine inside phase estimation and Shor (see Ch. 3).

**Quantum simulation** — See Hamiltonian simulation. Feynman's original 1981 pitch and the best-founded advantage in the field (see Ch. 3, Ch. 5).

**Quantum supremacy** — See quantum advantage. The older term for a quantum computer doing a task no classical computer feasibly can, now largely deprecated in favor of "quantum advantage"; where it survives it usually flags an artificial benchmark rather than a useful task. Contested by default (see Ch. 3, Ch. 8).

**Quantum Volume** — An IBM whole-machine benchmark combining qubit count, connectivity, and fidelity into one number. Like all vendor metrics, it flatters its own architecture; T4 (see Ch. 3, Ch. 8).

**Quantum walk** — The quantum analog of a random walk, giving speedups for problems like element distinctness and serving as a full model of computation. Its speedups are query-model and polynomial, so overhead accounting applies (see Ch. 3).

**Qubit** — The basic unit of quantum information: any two-level quantum system that can hold a superposition of 0 and 1. Every hardware modality implements the same abstract qubit, so algorithms are written once (see Bloch sphere; Ch. 1).

**QUBO (quadratic unconstrained binary optimization)** — A standard way of writing an optimization problem as binary variables with a quadratic cost function. It is the native input format for quantum annealers and many optimization pitches, since a QUBO maps directly onto a physical energy landscape (see annealing, Hamiltonian; Ch. 2, Ch. 5).

**QuOp (quantum operation)** — A proposed unit of quantum computing throughput used in UK procurement targets (MQuOp, GQuOp, TQuOp). It is not standardized, so buyers are writing contracts against an undefined quantity (see Ch. 6).

**Random circuit sampling (RCS)** — Running a random circuit and sampling its output, the artificial task behind "supremacy" claims. Chosen because it is hard classically, not because it is useful (see cross-entropy benchmarking; Ch. 7, Ch. 8).

**Readout** — Measuring a qubit's state, fast and accurately, at the end of a computation. A finite-fidelity POVM in practice, and one of the DiVincenzo criteria (see Ch. 1, Ch. 2).

**Repeater (quantum repeater)** — A device that extends entanglement over long distances by storing it in short segments and fusing them, since amplification is forbidden by no-cloning. The missing piece of the quantum internet; none yet beats direct transmission (see Ch. 4).

**Rydberg state / Rydberg blockade** — A highly excited atomic state with a huge dipole, so one excited atom prevents its neighbors from being excited too — the "blockade" that drives neutral-atom two-qubit gates. The same big dipole makes Rydberg atoms sensitive RF sensors (see Ch. 2, Ch. 4).

**Satellite QKD** — Distributing quantum keys through space, where loss beats fiber over continental distances. Demonstrated and near-commercial, led decisively by China (Micius, Jinan-1). A single satellite acting as relay still knows the key (see Ch. 4).

**Shor's algorithm** — Peter Shor's 1994 algorithm that factors large numbers and computes discrete logarithms in polynomial time, breaking RSA and elliptic-curve cryptography. No cryptographically relevant number has been factored yet; the live action is falling resource estimates (now under ~1M noisy qubits for RSA-2048), which make post-quantum migration urgent today (see Ch. 3, Ch. 7).

**Silicon spin qubit** — A qubit stored in the spin of a single electron in silicon, roughly a million times smaller than a transmon. The manufacturing bet — the semiconductor industry as quantum fab. Crossed into error-correction-grade fidelity in 2025 but has very few qubits so far (see Ch. 2).

**SNSPD** — Superconducting nanowire single-photon detectors, now exceeding 98% efficiency with picosecond timing. Essential to photonic computing and QKD (see Ch. 2, Ch. 4).

**Solovay–Kitaev theorem** — The guarantee that any single-qubit operation can be approximated efficiently from a finite universal gate set, with only modest (polylogarithmic) overhead. It makes universality practical (see Ch. 3).

**Squeezing / squeezed light** — Light engineered to have less noise in one property at the cost of more in the conjugate one, pushing a measurement below the standard quantum limit. LIGO injects squeezed vacuum on every observing run — a quantum resource doing paid work today (see uncertainty principle; Ch. 1, Ch. 4).

**Stabilizer formalism / stabilizer code** — A compact way to describe an important class of states and every mainstream error-correcting code by the operators that leave them unchanged, rather than by all their amplitudes. It draws the sharpest line between classically simulable (Clifford) circuits and the "magic" that makes quantum computing hard (see Gottesman–Knill; Ch. 1, Ch. 3).

**Standard quantum limit (SQL)** — The noise floor a conventional measurement hits, set by the uncertainty principle, with precision improving as √N. Squeezing and entanglement push below it toward the Heisenberg limit (see Ch. 1, Ch. 4).

**State vector** — The mathematical description of a pure quantum state, living in Hilbert space. The starting axiom of the whole formalism (see superposition; Ch. 1).

**Strong subadditivity** — The deepest structural law of quantum information (Lieb–Ruskai, 1973), from which the data-processing inequality and the monogamy of entanglement follow (see Ch. 1).

**Superconducting qubit** — A qubit made from a superconducting circuit built around a Josephson junction, operated at millikelvin. The most industrially mature gate-based modality (IBM, Google), fast but wiring-limited (see transmon; Ch. 2).

**Superposition** — A quantum system being in a combination of states at once, with complex weights that can interfere. The one axiom the whole field rests on; an n-qubit register in superposition holds 2ⁿ amplitudes at once (see Ch. 1).

**Surface code** — The default error-correcting code: a 2D nearest-neighbor grid of qubits that has been the workhorse of fault-tolerance demos. Its weakness is a poor encoding rate — one logical qubit costs many physical qubits (see qLDPC; Ch. 3).

**Swap test** — A circuit that estimates how similar two quantum states are by measuring one ancilla qubit. Used with the Hadamard test in the atlas's reference implementation (see Ch. 3).

**Syndrome (measurement)** — The error-detection readout in error correction: measuring certain operators reveals *that* an error happened and where, without disturbing the protected information. A large machine produces a torrent of syndrome data a decoder must keep up with (see decoder; Ch. 3).

**T gate / T-count** — The single non-Clifford gate that makes a gate set universal, and the true currency of fault-tolerant cost. A circuit's T-count and T-depth — not its raw gate count — decide whether it is affordable, because T gates need expensive magic states (see Clifford+T; Ch. 3).

**TAM (total addressable market)** — The full revenue a product could earn if it captured its entire market. Quantum market reports headline large TAM figures years out; a TAM is a forecast of potential demand, not booked revenue, and reads as T5 (see CAGR; Ch. 6, Ch. 8).

**Teleportation** — Moving an unknown quantum state from one place to another using a shared entangled pair and two classical bits, destroying the original. It never beats light and never clones. The same trick ("gate teleportation") is how magic states are consumed in fault-tolerant circuits (see Ch. 1).

**Tensor network** — A classical method that represents a quantum state or circuit as a graph of small tensors, efficient when entanglement is low. The moving classical baseline every advantage claim is judged against — it erased Sycamore's "10,000 years" and matched IBM's 2023 utility experiment (see Ch. 3, Ch. 8).

**Threshold theorem** — The foundational result that if the physical error rate sits below a code-dependent threshold, arbitrarily long computation is possible with manageable overhead. Below threshold, adding qubits helps; above it, adding qubits hurts. The license under which all error correction operates (see below-threshold; Ch. 3, Ch. 7).

**Time-bin** — A photonic encoding that stores a qubit in whether a photon arrives in an early or late time slot (see Ch. 2).

**TLS (two-level system)** — Atomic-scale defects in the oxides and interfaces of a chip that absorb qubit energy and drift over hours, capping and destabilizing coherence. The materials floor under superconducting qubits, and whether it can be suppressed enough at scale is an open question (see Ch. 2, Ch. 8).

**Topological qubit** — A qubit that builds error protection into its physics by storing information non-locally (see Majorana zero mode). The highest-risk, highest-reward modality; no independently verified topological qubit exists after two decades (see Ch. 2, Ch. 8).

**Transduction (microwave-to-optical)** — Converting a single microwave photon (superconducting qubits' language) into an optical one and back, to link fridges over fiber. The best 2025 devices reach only modest efficiency; until it improves, superconducting machines stay confined to a single fridge (see interconnect; Ch. 2).

**Transmon** — The dominant superconducting qubit design: a Josephson junction shunted by a large capacitor to reduce charge-noise sensitivity. The workhorse of IBM, Google, Rigetti, and IQM (see Ch. 2).

**Trapped ion** — A qubit modality using single atomic ions held in electromagnetic traps, addressed by lasers. Every qubit is identical by physics, giving the best gate fidelities and coherence, at the cost of slower gates and a scaling limit per trap (see Ch. 2).

**Trotter–Suzuki / qDRIFT / LCU / qubitization** — The four method families for digital Hamiltonian simulation. Trotter is simple and ancilla-free; qDRIFT's cost is independent of the number of terms; LCU and qubitization reach optimal precision scaling. Which wins is instance-dependent (see Ch. 3).

**Trusted relay / trusted node** — An intermediate node in a QKD network that decrypts the key on one link and re-encrypts it on the next, because no quantum repeater yet exists to pass entanglement through untouched. The relay holds the key in the clear, so anyone who controls the node — or compromises it — sees the secret. Real QKD networks are chains of these nodes, and a satellite acting as relay is one too. It is the structural hole that collapses QKD's "unhackable" marketing into security only as strong as every node along the path, and part of why security agencies point to post-quantum cryptography instead (see quantum internet, repeater; Ch. 4).

**Tsirelson bound** — The maximum Bell-inequality value quantum mechanics itself allows (2√2 for CHSH), sitting above the classical limit of 2. The gap between them is the experimental target that six decades of tests have closed (see Ch. 1).

**Tunneling (quantum tunneling)** — A particle passing through a barrier it could not classically climb, because its wavefunction extends past the barrier. The mechanism inside the Josephson junction, the scanning tunneling microscope, and any advantage annealing gets over thermal hopping (see Ch. 1).

**Twin-field QKD** — A QKD protocol that extends secure key distribution over unusually long fiber (hundreds of kilometers) by interfering fields from both parties at a midpoint (see Ch. 4).

**Uncertainty principle** — The rule that certain pairs of quantities (position and momentum) cannot both be sharp in any state — a fact about how states can be prepared, not about clumsy measurement. It sets the standard quantum limit and defines what squeezing can buy (see Ch. 1).

**Unitary (operation)** — The kind of transformation that describes every closed-system quantum evolution and every quantum gate: reversible, and preserving total probability so a normalized state stays normalized. Measurement is the one non-unitary step. Block encoding exists precisely because a quantum computer can only apply unitaries directly (see normalized, gate; Ch. 1, Ch. 3).

**Universal gate set** — A finite set of gates that can approximate any quantum operation. Universality guarantees *reachability*, not cheapness — a circuit can be expressible yet astronomically expensive in T-count (see Clifford+T, Solovay–Kitaev; Ch. 3).

**Utility (quantum utility)** — IBM's 2023 term for a noisy processor producing reliable results beyond brute-force classical simulation, explicitly set below the "advantage" bar. Contested, since the 2023 utility problem was reproduced classically within days (see Ch. 8).

**Variational algorithms / VQE** — Near-term algorithms (VQE for chemistry, QAOA for optimization) that pair a shallow tunable circuit with a classical optimizer, designed for NISQ hardware. Undermined by barren plateaus, soft dequantization, and strong classical competition; no win has survived a classical response. Their surviving role is as a state-preparation subroutine (see Ch. 3).

**Von Neumann entropy** — The quantum version of Shannon entropy, measuring the uncertainty or mixedness of a quantum state and the amount of entanglement in a pure bipartite state. The foundation of quantum information theory (see Ch. 1).

**Weak measurement** — A gentle measurement that extracts a little information while barely disturbing the state, letting the moment-by-moment path of a monitored qubit be reconstructed (see Ch. 1).

**Wavefunction** — The full quantum description of a system. Whether it is physically real or a bookkeeping tool is part of the unresolved interpretation debate (see PBR theorem, measurement problem; Ch. 1).

**Wigner function / negativity** — A way to picture a quantum state of light as a phase-space distribution. Its ability to go *negative* is the tell of nonclassicality; a Wigner-negative element is what lifts photonic hardware to universality (see Gaussian states; Ch. 1).

**Zero-noise extrapolation (ZNE) / probabilistic error cancellation (PEC)** — The two workhorse error-mitigation methods. ZNE deliberately amplifies noise, measures the result at several noise levels, and extrapolates back to zero; PEC learns a noise model and inverts it by sampling. Both extend reach without protecting the state, and both cost grows exponentially with depth (see error mitigation; Ch. 3).
