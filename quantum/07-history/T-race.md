# The engineering race (2011–2019) · T-race
**Layer:** L6 History · **Chapter:** §07 · **Status:** depth

## The arc
Quantum computing left the physics lab and became an industrial race. D-Wave sold the first commercial machine in 2011 — an annealer, not a gate-model computer — kicking off a decade-long argument about whether it delivered any quantum speedup at all. IBM put a real processor on the open cloud in 2016 and normalized the practice of publishing qubit counts as press events. Google hired John Martinis's UCSB group in 2014 and pointed it at a single target: beat a classical supercomputer at *something*. Governments answered with billion-dollar national programs (EU Flagship 2016, US NQI Act 2018 — see E-eu, E-us). The era peaked in October 2019 with Google's Sycamore "quantum supremacy" claim — a 53-qubit chip sampling random circuits in 200 seconds against an estimated 10,000 classical years. IBM contested the estimate within days (arguing a well-configured Summit supercomputer could do it in 2.5 days), and over the next three years classical algorithms shrank the gap to hours. That claim-and-counterattack cycle — a headline number, a rapid classical response, a milestone that survives while its superlative does not — became the template governing every advantage announcement since (see SCHEMA rule 2, O-advantage).

## Milestone timeline
- 2011 (May) — First commercial quantum computer sold: D-Wave One (128-qubit annealer) to Lockheed Martin — D-Wave — a market exists; the underlying Nature paper shows quantum annealing in the hardware, but generic speedup stays contested for years — [T4 sale → T2 physics] D-Wave; Johnson et al., Nature 473, 194 (2011)
- 2013 — Google, NASA, and USRA buy a D-Wave Two for the Quantum AI Lab at Ames — big tech enters, betting on annealing — [T4] press record
- 2014 — Martinis group (UCSB) joins Google; superconducting fidelity crosses the surface-code threshold in the lab — Google — the start of the supremacy program — [T2] Barends et al., Nature 508, 500 (2014)
- 2014 — No generic quantum speedup found in D-Wave benchmarks — Rønnow, Troyer et al. — the defining skeptical result on annealing — [T2] Rønnow et al., Science 345, 420 (2014)
- 2016 (May) — IBM Quantum Experience: a 5-qubit processor free on the public cloud — IBM — anyone can run a circuit; the cloud-QC business model is born (see S-cloud) — [T2] IBM + subsequent literature
- 2016 — EU announces the €1B Quantum Flagship — European Commission — governments commit at scale (see E-eu) — [T5] EC announcement
- 2017–2018 — 50-qubit IBM prototype; 72-qubit Bristlecone (Google); 49-qubit Tangle Lake (Intel) — the qubit-count arms race in full swing — [T4] vendor announcements
- 2018 (21 Dec) — US National Quantum Initiative Act signed into law ($1.2B over 5 years) — US Congress — quantum becomes a statutory national priority (see E-us) — [T2] Public Law 115-368
- 2019 (Jan) — IBM Q System One, the first integrated, rack-and-chandelier commercial quantum system — IBM — productization and industrial design begin — [T4] IBM announcement
- 2019 (23 Oct) — "Quantum supremacy" on the 53-qubit Sycamore chip: random circuit sampling in ~200 s vs. an estimated 10,000 classical years — Google (Martinis et al.) — first claimed beyond-classical computation — [T2 experiment] Arute et al., Nature 574, 505 (2019)

## The human context
The supremacy paper leaked early — a draft appeared on a NASA server in September 2019 before the embargo — and IBM published its rebuttal the same week the Nature paper ran, a public spat between the two biggest players that set the tone for the field's credibility wars. Martinis left Google in 2020 after a reorganization, a reminder that the era's central figures were people, not logos. D-Wave's long speedup argument never resolved cleanly; the honest summary is that annealing found niche uses without ever demonstrating the general exponential speedup its early marketing implied.

## Key graded claims
- claim: Sycamore performed a sampling task infeasible for any classical computer in 2019 · tier: T2 (experiment) · status: contested — IBM's 2.5-day Summit estimate (Oct 2019); tensor-network methods later reproduced the sampling in hours-to-days (Pan, Chen, Zhang, PRL 129, 090502, 2022). The demo stands; the "10,000 years" figure does not.
- claim: D-Wave annealers deliver a generic quantum speedup on practical problems · tier: T4 · status: contested — Rønnow et al., Science 345, 420 (2014) found no generic speedup; niche advantages remain debated
- claim: Publishing qubit counts as milestones tracks progress · tier: T4 · status: contested — the field itself later shifted the scoreboard to logical qubits and error rates (see T-ecera)

## Sources
- Johnson et al., Nature 473 (2011); Rønnow et al., Science 345 (2014); Barends et al., Nature 508 (2014); Arute et al., Nature 574 (2019); IBM "On quantum supremacy" blog (Oct 2019); Pan et al., PRL 129, 090502 (2022)
- **Go deeper:** S-bench (how "advantage" is measured); T-ecera (the pivot to logical qubits); E-us, E-eu (the national programs); O-advantage
