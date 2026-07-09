# Cycle 3 Fact-Check — The Quantum Atlas (data-heavy Cycle 2 additions)

**Scope:** the new matrices, scorecards, and standards/timeline boxes in
`05-industries`, `06-ecosystem-geopolitics`, `04-adjacent-tech`, `02-hardware`,
`03-stack-algorithms`. Verified against live sources, July 2026.

## Verdict

**The new content is sound — unusually so for data this dense.** Every hard,
hostile-checkable number in the flagged sections verified: tickers and IPO
status, the DARPA-QBI Stage-A/B assignments, the FeMoco resource estimates, the
$2B Commerce equity package, the June-2026 executive-order deadlines, the NIST
PQC standard dates, and the Qiskit-1.0/primitives-V2/OpenPulse SDK claims all
check out. No factual claim was found to be *wrong* in a way that would mislead
a reader. Four items are minor imprecisions worth a light edit (one is a
raise-vs-valuation conflation), and one QBI stage assignment (Pasqal) could not
be independently confirmed. Nothing rises to a correction that changes an
argument.

## Claim → Status → Source

| Claim (location) | Status | Source |
|---|---|---|
| Quantinuum — Public, NASDAQ: **QNT**, IPO Jun 2026 (05 table) | **Correct** | IPO priced $60/sh, began trading NASDAQ:QNT Jun 4 2026, ~$1.68B gross ([StockTitan](https://www.stocktitan.net/news/QNT/quantinuum-announces-pricing-of-upsized-initial-public-fo6m47kvxp2e.html); [Quantinuum PR](https://www.quantinuum.com/press-releases/quantinuum-announces-pricing-of-upsized-initial-public-offering)) |
| IonQ absorbed Oxford Ionics (~$1.08B) (05/06) | **Correct** | $1.075B, announced Jun 9 2025, closed Sep 2025 ([The Quantum Insider](https://thequantuminsider.com/2025/06/09/ionq-acquires-uk-based-oxford-ionics-for-1-075-billion/)) |
| Google (Alphabet) "absorbed Atlantic Quantum" (05 table) | **Correct** | Atlantic Quantum (MIT superconducting) joined Google Quantum AI, Oct 2 2025 ([blog.google](https://blog.google/innovation-and-ai/technology/research/scaling-quantum-computing-even-faster-with-atlantic-quantum/)) |
| DARPA QBI advanced **eleven** Stage-A performers to Stage B, **Nov 2025** (05) | **Correct** | 11 companies, Nov 6 2025 ([DARPA](https://www.darpa.mil/research/programs/quantum-benchmarking-initiative/stage-b-selection); [Nextgov](https://www.nextgov.com/emerging-tech/2025/11/11-companies-move-second-stage-darpas-quantum-benchmarking-initiative/409405/)) |
| QBI stage column: IonQ/Quantinuum/IBM/QuEra/Atom = **Stage B** | **Correct** | Stage B 11 = IBM, IonQ, Nord Quantique, Photonic, Quantinuum, Quantum Motion, QuEra, SQC, Xanadu, Atom Computing, Diraq ([DARPA](https://www.darpa.mil/research/programs/quantum-benchmarking-initiative/stage-b-selection)) |
| QBI: Rigetti/Alice&Bob = **Stage A (not advanced)**; D-Wave = **Not selected**; PsiQuantum/Microsoft = **ex-US2QC track** | **Correct** | Stage A cohort (18, Apr 2025) incl. Rigetti, Alice&Bob; MSFT+PsiQuantum entered US2QC validation/co-design separately ([Quantum Computing Report](https://quantumcomputingreport.com/darpa-selects-18-companies-to-participate-in-stage-a-of-its-quantum-benchmarking-initiative/)) |
| QBI: **Pasqal = Stage A** (05 table) | **Unverified** | Pasqal not found in the named Stage-A cohort; could be among the 3 unnamed "in negotiation" slots. Not disproven, not confirmed. |
| FeMoco: Alice&Bob Oct 2025 = **~99,000 physical qubits, ~27× reduction vs 2.7M** (05/03) | **Correct** | 2,700,000 → 99,000, 27×, Oct 9 2025 blog ([Alice&Bob](https://alice-bob.com/newsroom/alice-bob-quantum-computing-applications-health-agriculture/); [The Quantum Insider](https://thequantuminsider.com/2025/10/09/)) |
| FeMoco: 2021 Google/Lee = **~4M physical (~2,100 logical)** (05/03) | **Correct** | Matches Lee et al. 2021 tensor-hypercontraction estimate; 2.7M sits inside its few-million range |
| Certified randomness: JPMorgan/Quantinuum, **56-qubit H2-1, Nature 26 Mar 2025** (05/03/04) | **Correct** | Nature s41586-025-08737-1, 56-qubit H2-1, verified ~1.1 exaFLOPS ([Nature](https://www.nature.com/articles/s41586-025-08737-1); [UT Austin](https://cns.utexas.edu/news/research/researchers-achieve-quantum-computing-milestone-realizing-certified-randomness)) |
| US: two EOs **22 Jun 2026**; PQC key-establishment **31 Dec 2030**, signatures **31 Dec 2031** (06) | **Correct** | EO 14412; 2030 encryption / 2031 authentication ([White House](https://www.whitehouse.gov/presidential-actions/2026/06/securing-the-nation-against-advanced-cryptographic-attacks/); [Cybersecurity Dive](https://www.cybersecuritydive.com/news/quantum-cryptography-white-house-executive-order/823530/)) |
| US: **~$2B Commerce package, nine firms, ~half to IBM, equity stakes** (06) | **Correct** | $2.013B, 9 LOIs under CHIPS Act, IBM $1B, minority non-controlling equity ([NIST](https://www.nist.gov/news-events/news/2026/05/department-commerce-announces-letters-intent-9-companies-2-billion); [CNBC](https://www.cnbc.com/2026/05/21/quantum-stocks--us-taking-equity-stakes.html)) |
| NIST finalized **FIPS 203/204/205 Aug 2024**; selected **HQC Mar 2025** backup KEM (05/06/04) | **Correct** | HQC selected Mar 11 2025, code-based backup to ML-KEM ([NIST](https://www.nist.gov/news-events/news/2025/03/nist-selects-hqc-fifth-algorithm-post-quantum-encryption)) |
| SIKE isogeny scheme "collapsed in a single afternoon" **2022** (04) | **Correct** | Castryck–Decru key-recovery, 2022 (well-established) |
| Global Risk Institute: **~22.7% by 2030, ~50% by 2035** for RSA-2048 (06) | **Mostly correct** | GRI 2024 survey ~25% by 2030 and ~50% by 2035; the ~50%/2035 is on the mark, the precise 22.7% reads slightly low/over-specific vs. the ~25% usually cited ([evolutionQ](https://www.evolutionq.com/post/the-quantum-threat-timeline-why-organizations-must-act-now)) |
| Gidney 2025: RSA-2048 **<1M** noisy qubits, down from **~20M** 2019 (05/06/03/04) | **Correct** | Gidney May 2025 (<1M, <1 week) vs. Gidney/Ekerå 2019 (~20M, 8h) — widely reported |
| IonQ SkyWater purchase **~$1.8B** (06) | **Correct** | $1.8B ($35/sh), announced Jan 2026 ([Constellation](https://www.constellationr.com/insights/news/ionq-acquires-skywater-18-billion-bulks-quantum-chip-foundry)) |
| D-Wave bought Quantum Circuits (gate-model), **$550M** (06) | **Correct** | $550M ($300M stock + $250M cash), Jan 7 2026 ([Quantum Computing Report](https://quantumcomputingreport.com/d-wave-finalizes-550-million-acquisition-of-quantum-circuits-to-accelerate-dual-platform-roadmap/)) |
| Xanadu via SPAC, **~$3.1B enterprise value** (06) | **Correct** | Pro-forma EV $3.1B, XNDU on Nasdaq/TSX Mar 27 2026 ([Xanadu](https://www.xanadu.ai/press/xanadu-expected-to-become-the-first-and-only-publicly-traded-pure-play-photonic-quantum-computing-company-via-business-combination-with-crane-harbor-acquisition-corp)) |
| Qiskit 1.0 (Feb 2024) removed `execute()`; primitives V1→V2; **IBM Runtime dropped V1 Aug 2024**; `qiskit.pulse` deprecated v1.3, removed v2.0 (03 box) | **Correct** | V1 primitive support removed Aug 15 2024; pulse deprecated 1.3.0, removed 2.0.0, no replacement ([IBM v2-primitives](https://docs.quantum.ibm.com/migration-guides/v2-primitives); [pulse-migration](https://quantum.cloud.ibm.com/docs/en/guides/pulse-migration)) |
| Element distinctness: **N^(2/3) queries, speedup factor only N^(1/3)** (03) | **Correct** | Ambainis Θ(N^{2/3}) query complexity; N / N^{2/3} = N^{1/3} — arithmetic and "sub-quadratic" framing right |
| Quantinuum raised **~$839M at $10B pre-money** (06 money-cycle) | **Mostly correct** | $10B pre-money confirmed (Honeywell Sep 2025); round was $600M target upsized to ~$800M (Nov 2025). The precise **$839M** is slightly over-specific vs. the widely-reported ~$800M ([DCD](https://www.datacenterdynamics.com/en/news/quantinuum-receives-10bn-valuation-following-close-of-600m-funding-round/); [postquantum](https://postquantum.com/industry-news/quantinuum-raises-800m/)) |
| PsiQuantum valuation-flag "**~$6B+ raise**, pre-revenue" (05 table, line 178) | **Wrong → fix** | $6B is the *pre-money valuation* ($7B post), not the amount raised. PsiQuantum's $1B Series E (Sep 2025, BlackRock) brought total raised to **~$2B**. Column conflates valuation with raise ([The Quantum Insider](https://thequantuminsider.com/2025/09/10/); [Fast Company](https://www.fastcompany.com/91401021/psiquantum-hits-7-billion-valuation-investment-quantum-computing)) |

## Top corrections to make

1. **05-industries, company table (PsiQuantum row):** change the valuation-flag
   cell from "~$6B+ **raise**, pre-revenue" to reflect that ~$6-7B is the
   **valuation** (pre/post), not money raised (~$2B total, $1B Series E). This
   is the one cell that states a number in the wrong category. The geopolitics
   chapter already phrases it correctly ("$6B pre-money and $7B post"), so this
   is just aligning the table to that.

2. **06-ecosystem-geopolitics, money-cycle (Quantinuum raise):** "$839M" is
   over-precise; the reported figure is a ~$600M→~$800M upsized round at a $10B
   pre-money valuation. Round to "~$800M" or drop the trailing precision. (The
   $10B pre-money is correct.)

3. **06-ecosystem-geopolitics, Mosca/CRQC odds:** the "22.7% by 2030" reads a
   touch low against the ~25%-by-2030 usually quoted from GRI 2024; either cite
   the exact GRI report edition it came from or soften to "~25%." The "~50% by
   2035" is fine as-is.

4. **05-industries, QBI column (Pasqal = Stage A):** could not confirm Pasqal
   was ever a QBI Stage-A participant (not in the named 18-company cohort).
   Either verify against the DARPA Stage-A list or soften. All *other* stage
   assignments verified exactly.

## Minor note (not an error)

- Internal tension, not a factual defect: the geopolitics money-cycle calls
  Quantinuum "filing for a Nasdaq IPO" while the industries table shows the IPO
  **completed** (QNT, Jun 2026). Both were true at different points inside H1
  2026 (S-1 filing → Jun 4 pricing). Consider harmonizing the tense if the two
  sections are read together.
