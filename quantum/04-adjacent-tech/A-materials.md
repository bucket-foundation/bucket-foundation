# Quantum Materials · A-materials
**Layer:** L3 Adjacent tech · **Chapter:** §04 · **Status:** deepened (cycle 3)

## What it is
Materials whose macroscopic behavior is set by quantum effects — **topological insulators** (insulating bulk, symmetry-protected conducting surface states), **high-Tc superconductors** (cuprates since 1986, iron-based since 2008), and **2D materials** (graphene, transition-metal dichalcogenides, and twisted bilayers where a "magic angle" $\sim1.1^\circ$ produces superconductivity). They sit in two roles at once: a physics frontier in their own right, and the **substrate layer under qubits** — Majorana platforms (`H-topo`), Josephson-junction materials, and the two-level-system (TLS) defects that cap coherence (`H-fab`, `O-materials`). This node treats quantum materials as an adjacent *technology*, so the grading question is: which of these ship in a product, and which are still lab physics?

## Maturity & real deployments (2025–26)
**Split — a spectrum from industrial commodity to contested lab claim.**
- **Low-Tc superconductors** (\ce{NbTi}, \ce{Nb3Sn}) are fully industrial: MRI magnets, SQUIDs (`A-magneto`), and the transmon circuits of `H-supercon` all run on them.
- **High-Tc REBCO tape** crossed from lab to product: it is load-bearing in **Commonwealth Fusion's SPARC** high-field magnets (the $\sim20\,\text{T}$ magnets that make compact tokamaks viable) — arguably the biggest commercial deployment of a high-Tc material to date.
- **Topological insulators and 2D-material devices remain research-stage** — no volume product ships *on topological protection* yet, which is precisely the risk in Microsoft's Majorana bet (`H-topo`). Recent motion: UChicago/WVU showed **topological superconductivity in \ce{FeTe_{1-x}Se_x} can be tuned in/out by composition** (Nature Communications, 2025/26); 2D magnetic/topological heterostructures are engineered for ultralow-power spintronics; topological phase transitions were used to raise thermoelectric performance in Cr-doped \ce{PbSe}.

## Key graded claims
- T1 Topological insulators and cuprate high-Tc superconductivity are established, Nobel-lineage physics — Kane–Mele / Bednorz–Müller (established)
- T2 Magic-angle twisted bilayer graphene superconducts at $\sim1.1^\circ$ — Cao et al., Nature 556 (2018) (established)
- T2 REBCO high-Tc tape deployed in fusion magnets (SPARC) — Commonwealth Fusion / MIT, 2021+ (demonstrated, commercial)
- T2/T3 Composition-tuned topological superconductivity in \ce{FeTeSe} — Nat. Commun. 2025/26 (demonstrated)
- T6 Room-temperature ambient-pressure superconductor — none verified; **LK-99 (2023)** and the **Ranga Dias retractions** are the cautionary tales (contested/refuted)

## Conflicts / open questions
- **C-hightc-mechanism**: after ~40 years there is still no accepted microscopic theory of cuprate superconductivity — the field's standing embarrassment and its biggest open prize. Without it, high-Tc discovery stays empirical.
- **Can topological protection be shown cleanly in a device?** The Majorana debate (`H-topo`) remains contested after multiple retracted/withdrawn zero-bias-peak claims; a decisive, reproducible topological-qubit demonstration would resolve it.
- **Room-temperature superconductivity** is the recurring hype magnet — every few years a claim (LK-99, Dias's hydrides) collapses under replication. Grade any new one T6-contested until independent labs confirm.

## The honest call
**Commercial at the boring end, research at the exciting end.** Low-Tc and now high-Tc REBCO are real industrial materials doing real work (magnets, qubits, fusion). Topological materials — the ones that would rewrite computing — remain lab physics with a credibility overhang from retractions. The valuable discipline this node enforces: separate "superconductor that ships" from "topological phase we hope powers a qubit," and treat every room-temperature-superconductor headline as guilty until replicated.

## Sources
- https://phys.org/news/2026-02-tuning-topological-superconductors-adjusting-ratio.html
- https://arxiv.org/pdf/2102.02644 (2021 Quantum Materials Roadmap)
- Cao et al., "Unconventional superconductivity in magic-angle graphene superlattices," Nature 556 (2018)
- Commonwealth Fusion Systems / MIT PSFC SPARC magnet reports (REBCO $20\,\text{T}$ magnet)
