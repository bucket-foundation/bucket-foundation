# Research Tools Needs Analysis

What the Biophysics / Comp-Bio Community Needs.

**Author:** Data pillar (Nucleus-dispatched) · **Date:** 2026-06-18 · **Bead:** biophysics-phd-review-b74
**Companion data:** `biophysics-phd-review/data/processed/research_tools_needs.csv` (54 candidate tools)
**Grounding:** our 107-opportunity software map, 3,870 ranked advisors, 199-topic field map, $3.3B funding map, plus 2024-2026 web research.

---

## 0. The one-paragraph thesis

Bucket Foundation is becoming a platform where **researchers are the users**, they run AI tools, read outputs, and publish/cite results. The question is no longer "what's one good tool to build" but "what is the *full bench* of software this community needs day to day." Our own dataset answers it with unusual precision: we have 3,870 ranked biophysics PIs tagged by subfield, a $3.3B funding map broken down by area, and a 107-tool opportunity scan each with a real method, a real incumbent, and a real demand score. Cross-referenced with what researchers say is painful in 2024-2026, **the demand is heavily concentrated in a handful of subfields**, ion channels / electrophysiology, DNA/RNA biophysics, neuroscience, spectroscopy, protein folding, and the pattern is the same everywhere: **a powerful open model or method exists, but nobody serves it as a usable product over the lab's own data.** We already built and validated 7 tools sitting exactly on that wedge. This document maps the other ~47.

---

## 1. The demand picture, by subfield

Two independent signals in our data agree on who the users are.

### 1a. Advisor count by subfield

These are the curated interest tags on the actual PIs in our universe, i.e. the people who would *use* a tool:

| Subfield (advisor tag) | # advisors | Share |
|---|---:|---:|
| DNA/RNA biophysics & gene regulation | 1,105 | 29% |
| Ion channels & electrophysiology | 1,024 | 26% |
| Neuroscience / neural engineering | 938 | 24% |
| Cardiac electrophysiology | 631 | 16% |
| Spectroscopy & chemical physics | 522 | 13% |
| Photosynthesis & light harvesting | 483 | 12% |
| Photoreceptors & optogenetics | 424 | 11% |
| Mitochondria & bioenergetics | 318 | 8% |
| Self-assembly & soft matter | 235 | 6% |
| Quantum biology / magnetoreception | 168 | 4% |
| Antimicrobial peptides & membrane-active | 101 | 3% |

*(tags overlap, so shares sum > 100%.)*

### 1b. Research volume by subfield

The publication-volume ranking corroborates the advisor ranking almost exactly:

| Subfield topic | Total works |
|---|---:|
| Ion channel regulation and function | 70,777 |
| Lipid Membrane Structure and Behavior | 64,589 |
| Neuroscience and Neuropharmacology | 49,852 |
| Photoreceptor and optogenetics | 36,767 |
| Protein Structure and Dynamics | 35,136 |
| RNA and protein synthesis | 32,370 |
| Cellular Mechanics and Interactions | 30,593 |
| Advanced biosensing / bioanalysis | 29,831 |
| Photosynthetic Processes | 28,676 |
| DNA and Nucleic Acid Chemistry | 22,025 |
| Cardiac electrophysiology and arrhythmias | 16,156 |

### 1c. Funding by subfield

The money, which is what pays for tools, since funders pay a PI / a small business / an open-source project, not "a person who writes code", concentrates even harder:

| Area | Funding pool | Software-addressable |
|---|---:|---|
| **Membrane & ion channels** | **$1,032M** | the single largest pool |
| general biophysics | $862M | |
| Nucleic acid | $381M | |
| Mechanobiology | $311M | |
| Protein folding | $242M | |
| Neurobiophysics | $195M | |
| Quantum biology | $107M | |
| Bioenergetics / mito | $39M | |
| Single-molecule | $22M (small $, methodologically central) | |

Total ~$3.3B; ~$1.57B (≈48%) is software-addressable. **22% of all advisors (849 of 3,870) are already computational**, those are the fast adopters. The strategy scan also counts **179 institutions active in ion-channel modeling, 159 in MD/protein structure, 70 in cryo-EM image analysis**, concrete installed-base numbers for the three biggest tool clusters.

**Takeaway for the platform:** if Bucket prioritizes by *number of potential users × dollars behind them*, the order is roughly **ion channels / electrophysiology → DNA/RNA → neuro → protein folding/structure → spectroscopy → mechanobiology → cryo-EM → bioenergetics/single-molecule/quantum-bio.** Every tool below is tagged with which of these it serves.

---

## 2. The universal layer

Independent of subfield, three needs recur in our opportunity scan **and** in the 2024-2026 literature:

1. **Literature / knowledge**, researchers drown in preprints and re-read 200 PDFs to onboard. `PaperQA2` is now reported as *superhuman* on literature QA tasks ([FutureHouse / MIT News 2025](https://news.mit.edu/2025/futurehouse-accelerates-scientific-discovery-with-ai-0630)), and FutureHouse's 2025 launch of Crow/Owl/Falcon/Phoenix plus Kosmos ("6 months of research in a day") shows the category is real and adopted. But these are generic; **nobody runs a private RAG over a *single lab's* papers + protocols + notebook**, that gap is exactly our **LabBrain** (opp #18, 12 advisor matches).
2. **Data management / reproducibility**, the **NIH 2025 Data Management & Sharing Policy** is forcing the issue. 81% of labs now use an ELN (up from 66% the prior year), yet ELNs "lack features to rigorously document data critical for reproducibility, such as sample traceability and SOPs" ([LabLynx 2025](https://www.lablynx.com/resources/articles/nih-data-compliance-eln/), [PMC7054672](https://pmc.ncbi.nlm.nih.gov/articles/PMC7054672/)). FAIR-by-default lab data lakes (**LabDataHub**) and protocol generation (**ProtocolGPT**) sit here.
3. **Method / hypothesis support**, "which technique answers this question?" and "what should we try next?" are PI-whiteboard activities with no clean incumbent (**MethodsMatcher**, **HypothesisEngine**, validated as a 2025 category by Google's AI Co-Scientist).

These universal tools have the *largest* addressable user base (all 3,870 PIs) but a weaker moat than the specialized ones.

---

## 3. The 7 we already have vs. the field

| Our tool | Category | Subfield it serves | # advisors in that subfield | Status |
|---|---|---|---|---|
| **LabBrain** | literature | universal | 3,870 (all) | validated, P5 |
| **ProteinScout** | structure | protein folding / DNA-RNA-adjacent | 1,105 + 35k works | validated, P5 |
| **StabilityDesigner** | structure | protein engineering / enzymes | protein-folding $242M | validated, P5 |
| **TrajMine** | MD | MD / spectroscopy | 522 spectroscopy + MD cohort; top funnel bet, demand-score 10 | validated, P5 |
| **CryoTriage** | cryo-EM | structural bio / cryo-EM | 70 institutions | validated, P5 |
| **PatchSeqML** | electrophysiology | **ion channels (1,024) + cardiac-EP (631)** | the **$1,032M** subfield | validated, P5 |
| **ScreenServer** | drug-discovery | comp drug-discovery | $300M, 12 advisor matches | validated, P5 |

**What the 7 cover well:** protein structure/stability/MD (3 tools), the cryo-EM picking bottleneck, the single biggest funded subfield (ion-channel electrophysiology via PatchSeqML), drug-screening, and the universal literature layer. That's a strong spine, it hits 5 of the top-7 subfields.

**What the 7 leave wide open (the biggest gaps):**

- **DNA/RNA biophysics, our LARGEST advisor group (1,105 PIs, 29%), has zero dedicated tool.** RNA structure (`RNAFold3D-Serve`), RNA embeddings (`RNA-FM-Embeds`), CRISPR guide design (`gRNA-Optimizer`), chromatin/regulatory prediction (`ChromatinAccess`) are all gaps. This is the single most under-served large cohort.
- **Neuroscience (938 PIs) beyond patch-clamp**, spike sorting (`SpikeSortCloud`), calcium imaging (`CalciumTraceML`), neuron-model fitting (`HH-FitML`) are gaps. Kilosort4 is SOTA but "MATLAB legacy versions rot within a few years" and curation is a marathon ([Nat Methods 2024](https://www.nature.com/articles/s41592-024-02232-7)), a serving + curation product is wanted.
- **Conformational heterogeneity**, repeatedly called "one of the foremost challenges in structural biology" in 2025 ([CryoPhold bioRxiv 2025](https://www.biorxiv.org/content/10.1101/2025.09.12.675912v1.full); [FEBS Open Bio 2025](https://febs.onlinelibrary.wiley.com/doi/10.1002/2211-5463.13902)). We have single-structure tools but no ensemble tool: `ConformerEnsemble`, `HeteroMap`, `IDP-Ensemble` are gaps. AF3 leaves ~1/3 of residues without atomistic precision and is weakest exactly on IDRs and cofactors.
- **Protein-protein complexes**, `CoFoldComplex` is the **#1 opportunity in our whole scan (score 83.2)** and we don't have it.
- **MD acceleration**, cost is *the* MD bottleneck; ML force fields (MACE-OFF) are climbing but hard to deploy ([JACS 2024](https://pubs.acs.org/doi/10.1021/jacs.4c07099)). `MDAccel-Serve` is a gap.
- **Spectroscopy**, 522 PIs and our *most responsive* cohort (highest reply odds in `funnel_targets`), served only partially by a SpectraNet-adjacent tool. Worth hardening to first-class.
- **Mechanobiology ($311M, 7,716 "Force Microscopy" works)**, `CellSegTrack`, `AFM-CurveML`, `TractionForceML` all gaps.

---

## 4. The full needs list

54 tools, 10 categories.

The companion CSV has one row per tool with method, incumbents, build complexity, GPU need, and which subfield (+ advisor count) needs it. Distribution:

| Category | # tools |
|---|---:|
| structure | 10 |
| literature | 8 |
| imaging | 8 |
| electrophysiology | 6 |
| drug-discovery | 5 |
| sequence (DNA/RNA) | 5 |
| MD | 4 |
| cryo-EM | 4 |
| data-mgmt | 3 |
| spectroscopy | 1 |

**We have 7-8; the other ~46 are gaps.** The read: our 7 are an excellent *vertical slice* (structure + one big electrophysiology tool + literature), but the *breadth* a researcher platform needs spans 10 categories, and the two largest user cohorts by headcount (DNA/RNA: 1,105; neuro: 938) are barely touched.

### Priority logic
`priority_0_5` weighs: (a) # advisors / funding behind the subfield, (b) our opportunity-scan score, (c) web-confirmed pain, (d) whether we already have it (validated tools = ship-ready = high priority to *productize on Bucket*), (e) build complexity as a tiebreaker. It is a guess where data is thin (e.g. quantum-bio, single-molecule) and confident where data is thick (ion channels, DNA/RNA, structure).

---

## 5. Top 15 tools by priority

| # | Tool | Category | Who needs it | We have it? |
|---|---|---|---|---|
| 1 | **CoFoldComplex** | structure | protein-folding + drug-discovery; #1 opp (83.2) | gap |
| 2 | **CryoTriage** | cryo-EM | cryo-EM (70 institutions) | ✅ have |
| 3 | **LabBrain** | literature | universal (3,870 PIs) | ✅ have |
| 4 | **PatchSeqML** | electrophysiology | **ion channels 1,024 + cardiac 631; $1,032M** | ✅ have |
| 5 | **ProteinStructAgent** (ProteinScout) | structure | protein folding (35k works) | ✅ have |
| 6 | **ScreenServer** | drug-discovery | comp drug-discovery ($300M) | ✅ have |
| 7 | **StabilityDesigner** | structure | protein engineering / enzymes | ✅ have |
| 8 | **TrajMine** | MD | MD + spectroscopy; top funnel bet | ✅ have |
| 9 | **ADMET-Predict** | drug-discovery | drug-discovery + chem-bio | gap |
| 10 | **ChannelStructPredict** | structure | **ion channels (1,024, largest funded)** | gap |
| 11 | **ConformerEnsemble** | structure | MD + structural bio (159 institutions) | gap |
| 12 | **HeteroMap** | cryo-EM | cryo-EM dynamic/multi-state proteins | gap |
| 13 | **MDAccel-Serve** | MD | MD-heavy labs (protein/membrane/nucleic) | gap |
| 14 | **PaperRadar** | literature | universal; fast-moving fields | gap |
| 15 | **SpectraNet** | spectroscopy | spectroscopy (522 PIs, most responsive) | partial |

Of the top 15, **7 we already have** (the validated spine), and the **8 highest-value gaps** are: CoFoldComplex, ADMET-Predict, ChannelStructPredict, ConformerEnsemble, HeteroMap, MDAccel-Serve, PaperRadar, and hardening SpectraNet.

---

## 6. The biggest gap clusters

1. **DNA/RNA biophysics tooling**, our single largest cohort (1,105 PIs, $381M), uncovered. Cluster: `RNAFold3D-Serve`, `RNA-FM-Embeds`, `gRNA-Optimizer`, `ChromatinAccess`, `CellAtlasQuery`. **Highest impact by headcount.**
2. **Conformational ensembles / dynamics**, the loudest 2025 unmet need in structural biology. Cluster: `ConformerEnsemble`, `HeteroMap`, `IDP-Ensemble`, `MDAccel-Serve`. We have single-structure + trajectory tools but no ensemble layer.
3. **Neuroscience beyond patch-clamp**, 938 PIs, only PatchSeqML touches the edge. Cluster: `SpikeSortCloud`, `CalciumTraceML`, `HH-FitML`, `EphysCopilot`. Kilosort4 deployment + curation is a confirmed live pain.
4. **Ion-channel structure/pharmacology**, the **$1,032M** subfield; PatchSeqML handles *recordings* but not *structure/states/ligands*. Cluster: `ChannelStructPredict`, `GPCR-LigandDock`, `ChannelDwell`.
5. **Imaging / mechanobiology**, $311M, big Cellpose/AFM installed base, no productized serving. Cluster: `CellSegTrack`, `AFM-CurveML`, `TractionForceML`, `MitoSegML`, `SMLM-Reconstruct`.
6. **Data management / reproducibility**, universal, regulatory-driven (NIH 2025), weak-moat but high-stickiness. Cluster: `LabDataHub`, `ProtocolGPT`, `FigureMiner`.

---

## 7. Honesty / caveats

- **Advisor tags overlap and are coarse.** "DNA/RNA biophysics & gene regulation" (1,105) is a broad bucket; not every PI in it needs RNA structure prediction. Treat the counts as *order-of-magnitude* demand, well short of precise TAM.
- **Funding ≠ tool spend.** The $1.57B "software-addressable" figure is a strategy-scan estimate of pools *touchable* by software, well above committed tool budgets. Academic tool spend is small ($5-50K/yr core facilities, $10-100K/yr site licenses); the real money is core-facility and pharma-seat monetization, per the strategy doc.
- **Several "white space" tools may be white space because demand is thin.** Coverage is beside the point. Quantum-bio (168 PIs) and 2D-IR assignment are flagged low-priority for this reason.
- **Build complexity is a rough estimate.** "low" = days, weeks on existing models; "high" = real research engineering (ensembles, ML force fields, agentic orchestration). GPU-needed flags serving cost.
- **The 8 "we have it" rows are the *validated* tools**; productizing them on Bucket (multi-tenant, citeable outputs, x402/credit metering) is itself non-trivial and is the near-term work, ahead of net-new builds.

---

### Sources
- FutureHouse / PaperQA2 / Kosmos: https://news.mit.edu/2025/futurehouse-accelerates-scientific-discovery-with-ai-0630 · https://www.futurehouse.org/research-announcements/launching-futurehouse-platform-ai-agents · https://techcrunch.com/2025/05/01/futurehouse-releases-ai-tools-it-claims-can-accelerate-science/
- AlphaFold limits / IDRs / cofactors: https://febs.onlinelibrary.wiley.com/doi/10.1002/2211-5463.13902 · https://link.springer.com/article/10.1007/s10930-025-10310-8
- Conformational heterogeneity / CryoPhold: https://www.biorxiv.org/content/10.1101/2025.09.12.675912v1.full
- Cryo-EM picking bottleneck / foundation model: https://www.nature.com/articles/s41592-025-02916-8 · https://pmc.ncbi.nlm.nih.gov/articles/PMC10592924/
- Patch-clamp analysis pain / Biophysical Essentials / Auto ANT: https://www.sciencedirect.com/science/article/pii/S0169260724003213 · https://pmc.ncbi.nlm.nih.gov/articles/PMC11920353/
- Spike sorting / Kilosort4 / MATLAB rot: https://www.nature.com/articles/s41592-024-02232-7 · https://elifesciences.org/reviewed-preprints/110170
- MD cost / ML force fields / MACE-OFF: https://pubs.acs.org/doi/10.1021/jacs.4c07099 · https://arxiv.org/pdf/2206.07697
- ELN/LIMS / FAIR / NIH 2025 policy: https://www.lablynx.com/resources/articles/nih-data-compliance-eln/ · https://pmc.ncbi.nlm.nih.gov/articles/PMC7054672/
- Internal: `data/processed/software_opportunities.csv`, `advisors_ranked.csv`, `subfields_long.csv`, `opportunity_advisor_xref.csv`, `funnel_targets.csv`, `reports/Biophysics_Software_Opportunity_Strategy.pdf`
