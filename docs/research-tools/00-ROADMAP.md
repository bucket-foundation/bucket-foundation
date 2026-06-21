# Bucket Metascience Platform — Master Roadmap

> Durable mirror of the beads epic (bd has dropped issues before). Master epic:
> *"Bucket metascience platform — complete the research graph, tools, and live flywheel."*
> Turn the foundation (887k grants / $532B, 11 tools, research-atlas schema) into a
> **complete, connected, LIVE** platform. **Milestone for "real": make it a graph + make it live + turn the flywheel once.**

## Status snapshot (2026-06-21)
- research-atlas: 887,016 grants · 99,650 orgs · 170,408 people · 69 funders · $532.0B · 4.17M rows (NIH/NSF/CORDIS/UKRI, recent years). **0 orgs ROR-resolved. No output side. Not yet a graph.**
- Tools: **28 built** (was 20 → +8 real CPU tools on 2026-06-21). **None deployed live.**
  - 7 biophysics subprocess (LabBrain, ProteinScout, StabilityDesigner, ScreenServer, PatchSeqML) + 2 GPU-demo (TrajMine, CryoTriage)
  - RAG x5 (PaperRadar, GrantDraft, MethodsMatcher, ReviewGuard, QuantumBioRAG)
  - DNA/RNA x3 (RNAStructure, gRNA-Optimizer, RNA-FM-Embeds)
  - neuro x2 (HH-FitML, SpikeFeatures)
  - gap x3 (ProtocolGPT, ToxinChannelFinder, CitationGraph)
  - **NEW imaging/mechanobiology x4** (CalciumTraceML, CellSegTrack, AFM-CurveML, TractionForceML)
  - **NEW gap x3** (FigureMiner, AggregatePredict, ChannelDwell)
  - **NEW DNA x1** (ChromatinAccess)
- All 8 new tools: REAL scipy/scikit-image/numpy algorithms, JSON contract, no-network correctness tests (suite 89 → 120 passing).
- Publish surface built; **flywheel not turning** (GitHub-raw downloads, no real DOI yet).

### Built vs the 54-tool needs map (2026-06-21)
**Built (CPU, real, no GPU) — the 8 added this pass:**
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
