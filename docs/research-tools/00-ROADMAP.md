# Bucket Metascience Platform — Master Roadmap

> Durable mirror of the beads epic (bd has dropped issues before). Master epic:
> *"Bucket metascience platform — complete the research graph, tools, and live flywheel."*
> Turn the foundation (887k grants / $532B, 11 tools, research-atlas schema) into a
> **complete, connected, LIVE** platform. **Milestone for "real": make it a graph + make it live + turn the flywheel once.**

## Status snapshot (2026-06-24)
- research-atlas: 887,016 grants · 99,650 orgs · 170,408 people · 69 funders · $532.0B · 4.17M rows (NIH/NSF/CORDIS/UKRI, recent years). **0 orgs ROR-resolved. No output side. Not yet a graph.**
- Tools: **40 built** (was 20 → +8 real CPU tools on 2026-06-21 → +2 all-field horizontal tools on 2026-06-22 → +5 per-field non-bio tools on 2026-06-22 → +5 per-field classical-algorithm tools on 2026-06-24). **None deployed live.**
  - 7 biophysics subprocess (LabBrain, ProteinScout, StabilityDesigner, ScreenServer, PatchSeqML) + 2 GPU-demo (TrajMine, CryoTriage)
  - RAG x5 (PaperRadar, GrantDraft, MethodsMatcher, ReviewGuard, QuantumBioRAG)
  - DNA/RNA x3 (RNAStructure, gRNA-Optimizer, RNA-FM-Embeds)
  - neuro x2 (HH-FitML, SpikeFeatures)
  - gap x3 (ProtocolGPT, ToxinChannelFinder, CitationGraph)
  - imaging/mechanobiology x4 (CalciumTraceML, CellSegTrack, AFM-CurveML, TractionForceML)
  - gap x3 (FigureMiner, AggregatePredict, ChannelDwell)
  - DNA x1 (ChromatinAccess)
  - all-field horizontal x2 (FAIRCheck, RepliCheck) — serve EVERY discipline (the 1.17M researchers), not one field: FAIR data management + statistics reproducibility, funder-mandated across NIH/NSF/Horizon/Wellcome/Gates.
  - per-field NON-bio x5 (CausalDesigner, MaterialsFeaturizer, PowerPlan, GeoSummary, MLReproCard) — the biggest CPU-feasible non-bio fields in the USERS_NEEDS roadmap: econ-social causal inference, materials featurization, universal power analysis, earth-climate series summary, cs-ml reproducibility.
  - **NEW per-field CLASSICAL-algorithm x5** (SeqAlign, StoichBalance, UnitDimCheck, SurvivalFit, TimeSeriesForecast) — the biggest CPU-feasible fields/TASKS in USERS_NEEDS not yet covered: bio sequence alignment (seq-pipelines), chemistry reaction arithmetic (reaction-informatics), universal SI dimensional analysis, biomed/stats time-to-event, econ/earth forecasting.
- All 20 new tools: REAL scipy/scikit-image/numpy/networkx algorithms (FAIRCheck/MaterialsFeaturizer/MLReproCard = pure-stdlib deterministic rubrics; RepliCheck/PowerPlan = exact scipy.stats; CausalDesigner = real do-calculus via networkx d-separation; GeoSummary = numpy/scipy Mann-Kendall/Theil-Sen; SeqAlign = exact Needleman-Wunsch/Smith-Waterman DP; StoichBalance = exact rational null-space; UnitDimCheck = exact SI dimension arithmetic; SurvivalFit = Kaplan-Meier + Mantel-Cox log-rank; TimeSeriesForecast = Holt-Winters + honest backtest), JSON contract, no-network correctness tests (suite 89 → 120 → 148 → 199 → 245 passing).
- Publish surface built; **flywheel not turning** (GitHub-raw downloads, no real DOI yet).

### Built vs the 54-tool needs map (2026-06-22)
**Built (CPU, real, no GPU) — the 5 PER-FIELD non-bio tools added 2026-06-22 (later):**
These target the biggest CPU-feasible NON-bio fields in `research-atlas/docs/USERS_NEEDS.md`.
- CausalDesigner *(econ-social, 42,276 PIs)* — DAG construction (networkx) → backdoor-path enumeration (Pearl's back-door criterion) → valid minimal adjustment set via d-separation in the proper back-door graph (`nx.is_d_separator`, so the set is *checked*, and never includes a collider/mediator/post-treatment node) → estimator recommendation (DiD/RDD/IV/matching/regression) with identifying assumptions + threats. Verified: on the classic smoking→cancer DAG with a genetic confounder, a mediator (tar), and a collider (hospitalized), the recovered adjustment set is exactly {gene}.
- MaterialsFeaturizer *(materials, 44,536 PIs)* — formula parser (subscripts/fractions/nested parens) → Magpie-style composition descriptors (Ward 2016) from a built-in element table: composition-weighted mean/range/avg-deviation/mode of atomic weight, Pauling EN, atomic radius, melting point, period/group, valence electrons + a flat ML feature vector. Verified: NaCl mean Pauling EN = 2.045, molar mass ≈ 58.44 g/mol.
- PowerPlan *(universal; esp. social/biomed)* — closed-form statistical power & sample size via scipy noncentral-t (t-tests), noncentral-F (one-way ANOVA / Cohen's f), normal-approx z (two proportions), and the Fisher-z transform (correlation); solve for n / power / minimum-detectable-effect / alpha by monotone bracketing. Verified: d=0.5, α=.05 two-tailed, power=.80 → n=64 per group (the G*Power textbook value); ANOVA f=0.25/4 groups → 45; r=0.3 → 85.
- GeoSummary *(earth-climate, 116,840 PIs)* — descriptives + missing-data accounting; trend via OLS AND the distribution-free Mann-Kendall test + Theil-Sen slope (the standard climatological trend test); per-phase seasonal climatology + variance explained; lag-1 autocorrelation; haversine spatial extent. Verified: recovers a planted +0.10/step slope (Theil-Sen exact) and a significant increasing Mann-Kendall trend on a synthetic monthly series.
- MLReproCard *(cs-ml, 44,999 PIs)* — deterministic reproducibility rubric (18 weighted checks across data/code/training/evaluation/compute/sharing; NeurIPS/ICML checklists + Mitchell 2019 Model Cards + Gundersen taxonomy) → flags missing repro elements, per-dimension subscores + overall 0–100 score, an R0–R3 level, and a normalized model card. Verified: a ResNet-50/ImageNet experiment missing seed/dataset-version/environment/hardware flags exactly those gaps and scores below a fully-specified version (which reaches R3).

**Built (CPU, real, no GPU) — the 5 PER-FIELD CLASSICAL-algorithm tools added 2026-06-24:**
These fill the biggest CPU-feasible fields/TASKS in `research-atlas/docs/USERS_NEEDS.md` not yet covered. Textbook-exact algorithms, no heuristics, no GPU.
- SeqAlign *(biomed-bio, 689,684 PIs — `seq-pipelines`)* — exact pairwise alignment: Needleman-Wunsch (global) + Smith-Waterman (local) dynamic programming with the real baked BLOSUM62 matrix (protein) or identity matrix (nucleotide) and a linear gap penalty → aligned strings, optimal score, %identity. Verified: NW of ACGT/ACGT (identity) = score 4 / 100% id; GATTACA/GATACA = score 5 with one gap (6 matches); SW finds a shared CGTACG core embedded in noise (local score 6); BLOSUM62 self-scores W=11/C=9/A=4 match the published table.
- StoichBalance *(chemistry, 20,531 PIs — `reaction-informatics`)* — balance a chemical equation as the null space of the element matrix via exact rational Gaussian elimination → smallest positive integers, re-verified element-by-element; + limiting-reagent/yield stoichiometry. Verified: H2 + O2 → H2O gives 2, 1, 2; C3H8 + O2 → CO2 + H2O gives 1, 5, 3, 4; Fe + O2 → Fe2O3 gives 4, 3, 2; supplying 2 mol H2 + 2 mol O2 makes H2 limiting, yields 2 mol H2O, 1 mol O2 left.
- UnitDimCheck *(physics-astro 108,466 + engineering 93,027 + universal)* — SI dimensional analysis over the 7 base dimensions with exact rational exponents: unit conversion, unit→dimension parsing, and equation dimensional-consistency. Verified: N = kg·m/s² is CONSISTENT but N = kg·m/s (F = m·v) is flagged INCONSISTENT (the load-bearing catch); 1 km = 1000 m, 1 h = 3600 s, 1 atm = 101325 Pa, 100 °C = 212 °F; J/(mol·K) parses to M·L²·T⁻²·N⁻¹·Θ⁻¹.
- SurvivalFit *(biomed-bio + econ-social — survival/event-history)* — exact Kaplan-Meier product-limit estimator + Greenwood SE + median survival, per group, + Mantel-Cox log-rank test (hypergeometric O/E/V, χ² on 1 df via scipy.stats). Handles right-censoring. Verified: 4 ordered events give S = 0.75/0.5/0.25/0 and median = 2; a censored subject stays at risk then leaves without an event; two separated groups → log-rank p < 0.05, two identical groups → χ² ≈ 0.
- TimeSeriesForecast *(econ-social 42,276 + earth-climate 116,840 + universal)* — Holt-Winters triple exponential smoothing (level/trend/seasonal, α/β/γ fit by minimizing in-sample SSE) + classical additive decomposition + an honest holdout backtest (MAE/RMSE/MAPE vs a naive last-value baseline). Dependency-light numpy (scipy refine if present). Verified: a perfect linear trend y=2t is forecast on the line (40, 42, 44…); on the trend+12-season demo the seasonal HW beats naive on the 12-month holdout; additive decomposition recovers a planted period-4 seasonal spike.

**Built (CPU, real, no GPU) — the 2 ALL-FIELD horizontal tools added 2026-06-22:**
- FAIRCheck — FAIR (Findable/Accessible/Interoperable/Reusable) rubric over Wilkinson 2016's 15 sub-principles (F1–F4, A1/A1.1/A2, I1–I3, R1/R1.1–R1.3): concrete deterministic checks (persistent identifier, open license, machine-readable/standard formats, community vocabularies, provenance) → per-principle subscores + overall 0–100 FAIR score + a priority-ranked fix list. Pure stdlib. Funder-mandated (NIH/NSF/Horizon/Wellcome/Gates DMSP).
- RepliCheck — statistics reproducibility: statcheck-style p-value recomputation (t/F/χ²/r + df → exact two-tailed scipy.stats; Nuijten 2016) + GRIM test (Brown & Heathers 2017, exact integer arithmetic) + reporting flags (missing multiple-comparison correction / CIs / effect sizes / underpowered hints). Parses pasted Results text with regex; never crashes on malformed input.
- *These two are the horizontal tools that serve every discipline (the 1.17M-researcher corpus), per the atlas USERS_NEEDS roadmap — FAIR data management + statistics reproducibility are the cross-cutting, funder-mandated needs.*

**Built (CPU, real, no GPU) — the 8 added 2026-06-21:**
- CalciumTraceML — ΔF/F (rolling-percentile F0) + MAD transient detection + decay-τ fit.
- CellSegTrack — Cellpose-if-installed, else Otsu + distance-transform seeded watershed + per-object metrics.
- AFM-CurveML — contact-point detection + Hertz/Sneddon Young's-modulus least-squares fit + adhesion.
- TractionForceML — block-matching PIV (normalized cross-correlation) displacement field + strain-energy proxy (classical, labelled).
- FigureMiner — text-layer caption + reported-statistics + unit-measurement mining + per-figure linkage (PDF/text). Pixel-level plot digitization = deferred vision/GPU extension.
- ChromatinAccess — interpretable accessibility model (GC + Gardiner-Garden CpG islands + core-promoter motifs). Deep DNA-LM (Enformer/Evo) = deferred GPU path.
- AggregatePredict — windowed amyloid propensity (β-propensity + hydrophobicity − net charge).
- ChannelDwell — half-amplitude single-channel idealization + dwell-time τ. Full HMM/QuB = heavier path.

**Deferred — needs GPU / heavy ML (NOT faked; documented here):**
| Tool | Why deferred |
|---|---|
| CoFoldComplex (#1) | ESMFold/AF-Multimer complex prediction — GPU folding model, multi-GB weights. |
| ChannelStructPredict | sequence→channel multi-conformer structure — GPU folding (Boltz-2/AF-Cluster). |
| ConformerEnsemble / IDP-Ensemble | AlphaFlow / diffusion ensembles — GPU generative model. |
| HeteroMap | cryoDRGN/3DFlex heterogeneity recovery — GPU + raw particle stacks. |
| MapEnhance / AutoBuildChain | deepEMhancer / ModelAngelo — GPU + density maps. |
| MDAccel-Serve / FEP-Lite / FoldKineticsAgent | ML force fields + free-energy — GPU MD worker plane. |
| ADMET-Predict (#3, heavy) | Chemprop/ADMET-AI multitask GNN with uncertainty — GPU training/serving (ScreenServer ships the lighter sklearn ADMET today). |
| BinderForge / MolGen-Opt / GPCR-LigandDock / VirtualScreenAgent | RFdiffusion / DiffDock / generative chem — GPU. |
| RNAFold3D-Serve | RhoFold+/DRfold2/AF3 RNA tertiary — GPU folding. |
| SpikeSortCloud | Kilosort4 GPU sorter on Neuropixels stacks. |
| SMLM-Reconstruct / smFRET-AutoPipe / MitoSegML | DECODE / Deep-LASI / learned seg — GPU + large image stacks. |
| HypothesisEngine | LLM co-scientist over a lab KG — large-model + agent infra. |

**Deferred — non-GPU but out of scope this pass (infra/agent, not a single algorithm):**
LabDataHub (FAIR data lake), EphysCopilot (NWB agent), CellAtlasQuery (scRNA RAG),
NeuroDegenRAG / MetaboCopilot / SpectraNet-full (agentic pipelines), AllosteryMapper /
PocketScout (structure-network analysis — feasible CPU follow-ups, queued next).

## A · [graph] Entity resolution → the real graph  *(highest leverage)*
1. ROR-resolve all 99,650 orgs + cross-funder dedup/merge **(P1, #1 task)**
2. ORCID person reconciliation + dedup (170k)
3. Ingest OpenAlex works at scale (the output side)
4. Link grant→work (funding acknowledgements)
5. Link work→field + person→org affiliations
6. Unified graph DuckDB + graph-query API + Bucket graph explorer

## B · [funders] Complete the global funding landscape
7. DFG full (GEPRIS) · 8. ANR (FR) · 9. JSPS/MEXT (JP) · 10. NSFC (CN) · 11. NSERC+CIHR (CA) · 12. ARC+NHMRC (AU)
13. Philanthropies: HHMI, CZI, Wellcome, Simons, Gates, Sloan, Moore, Kavli **(P1)**
14. Historical depth: NIH→1985, NSF pre-2015, CORDIS FP7 (→ likely 3–5M grants)
15. Abstracts + publication/patent link tables

## C · [tools] Full 54-tool suite  (28/54 built as of 2026-06-21)
16. DNA/RNA cluster — RNA-FM-Embeds ✅, gRNA-Optimizer ✅, ChromatinAccess ✅; RNAFold3D ⏳GPU **(1105 PIs)**
17. Neuroscience cluster — HH-FitML ✅, CalciumTraceML ✅, ChannelDwell ✅; SpikeSortCloud ⏳GPU **(938 PIs)**
18. Ion-channel structure — ChannelStructPredict ⏳GPU, GPCR-LigandDock ⏳GPU (ChannelDwell ✅ done above)
19. Conformational ensembles — ConformerEnsemble ⏳GPU, HeteroMap ⏳GPU, IDP-Ensemble ⏳GPU
20. Imaging/mechanobiology — CellSegTrack ✅, AFM-CurveML ✅, TractionForceML ✅
21. Remaining RAG/gap — ProtocolGPT ✅, QuantumBioRAG ✅, ToxinChannelFinder ✅, FigureMiner ✅, AggregatePredict ✅, CitationGraph ✅
22. Flagship CoFoldComplex (#1) ⏳GPU · 23. Flagship ADMET-Predict (#3) ⏳GPU (lighter sklearn ADMET ships in ScreenServer ✅)

## D · [platform] Live infra & deployment (off gianyrox)
24. Deploy tools-gateway → Hetzner research-tools.agfarms.dev **(P1)**
25. Async job queue (Redis/RQ) + workers · 26. GPU worker plane · 27. Supabase job store
28. Viatika/x402 metering per run **(P1)** · 29. Auth + tiers · 30. TOOLS_GATEWAY_URL + K3s secrets **(P1)**

## E · [flywheel] Publish → cite → paid  *(NO blockchain — free-to-read, paid-to-cite over feed402/x402; real DOI via Zenodo)*
31. Hosted content-addressed dataset releases + **real DOI via Zenodo** **(P1)** · 32. Open Badges 3.0 / W3C VC credentials (issuer-signed, no chain)
34. cite-forever x402 payout · 35. Register + DOI the funding-landscape dataset (turn the flywheel once) **(P1)**

## F · [science] Metascience research (the PhD spine)
37. Funding-flow analyses · 38. Field-dynamics / science-of-science
39. **First preprint: StabilityDesigner vs FoldX (Zenodo/bioRxiv)** **(P1 — PhD review fix #1)**
40. Publish analyses as canon

## G · [ops] Data quality & orchestration
FX refresh · idempotent full-rerun cron · schema versioning/migrations · scale tests + monitoring

---
### Execution order (the "real" milestone first)
**Wave now:** A1–A4 (graph linkage) + C16–C17 (DNA/RNA + neuro tools).
**Next:** D24/D30 (deploy gateway live) + E31/E35 (DOI release + turn the flywheel once).
**Then:** B (funder breadth) + remaining C tools + F (science/preprint) continuously.
