# Topological / Majorana qubits · H-topo
**Layer:** L1 Hardware · **Chapter:** §02 · **Status:** depth

## What it is
Qubits encoded in **Majorana zero modes** — quasiparticles predicted at the ends of a topological superconductor (a semiconductor nanowire proximitized by a superconductor, tuned into a topological phase by magnetic field and gate voltage). A single logical qubit is stored non-locally across a pair (or four) of these modes, so local noise cannot read or corrupt it: the error protection is built into the physics rather than bolted on by a code. Gates would be done by measurement (Microsoft's "measurement-based" scheme) or by braiding modes around each other. The prize is a qubit with a hardware error floor so low that QEC overhead collapses. The problem: after two decades, nobody has an independently verified working topological qubit.

## Key players & state of the art (2025–26)
- **Microsoft**: Majorana 1 (Feb 2025) — an 8-qubit "topoconductor" chip (InAs/Al), claiming measurement-based topological qubits with ~2 ms state lifetimes and an architecture that scales to 1M qubits on a palm-sized chip. The accompanying Nature paper's editors appended a note that the results "do not represent evidence for the presence of Majorana zero modes." Majorana 2 (Build milestone, Jun 2026): aluminum replaced with lead, claimed ~20-second state lifetimes (~1,000× improvement) and an FTQC timeline pulled from 2033 to 2029.
- Microsoft is effectively alone in productizing. **Nokia Bell Labs**, Delft/QuTech, Copenhagen, and other academic groups continue the underlying topological-matter physics; several have published careful null or ambiguous results on the same nanowire signatures.

## Key graded claims
- T4 Majorana 1 hosts measurable topological qubits — Microsoft (Feb 2025) (contested — Nature editorial note; APS-meeting skepticism; no independent reproduction)
- T4 Majorana 2: ~20 s lifetimes, 1,000× stability gain — Microsoft (Jun 2026) (contested — critics note the protocol-dependence and the still-missing independent demonstration of the topological phase). As of mid-2026 there is still **no independent replication**; the sharpest critique remains Henry Legg's formal Nature comment (24 Jun 2026, d41586-026-01788-y) flagging flawed tune-up routines, software errors in the analysis code, and omitted transport measurements — Microsoft filed a formal Nature reply (Nayak: "we stand by our results and our roadmap"). Reproduction is throttled by a de-facto verification vacuum: only a handful of labs can fabricate the InAs/Al (now Pb/Al) devices.
- T6 Scalable topological FTQC by 2029 — Microsoft roadmap (roadmap)

## Trade-offs (vs other modalities)
If real: intrinsic hardware error protection, digital voltage-based control (reusing the semiconductor toolset), a tiny footprint, and a dramatic cut in QEC overhead that would reshape every scaling roadmap in this chapter. Today: zero independently verified qubits, extreme sensitivity to disorder, and a research lineage that already produced one retracted Nature paper (the 2018 Delft/Microsoft-funded ballistic-Majorana quantized-conductance claim, retracted 2021). The modality is graded hardest in the atlas for exactly this reason.

## Conflicts / open questions
**C-majorana-exists**: Microsoft (T4) vs. much of the condensed-matter community, which holds that disorder-induced Andreev bound states can mimic every reported signature. What would resolve it: an independent lab reproducing topological-qubit *operation*, or a braiding/fusion demonstration with published raw data that unambiguously passes the topological-gap protocol.

## Sources
Nature d41586-026-01788-y (2026 skeptics piece) + Majorana 1 paper editorial note; Science/AAAS coverage (2025, 2026); Physics World expert roundup; postquantum.com Majorana 2 analysis; 2021 Nature retraction of the 2018 quantized-conductance paper.
