# Bucket Metascience Platform — Master Roadmap

> Durable mirror of the beads epic (bd has dropped issues before). Master epic:
> *"Bucket metascience platform — complete the research graph, tools, and live flywheel."*
> Turn the foundation (887k grants / $532B, 11 tools, research-atlas schema) into a
> **complete, connected, LIVE** platform. **Milestone for "real": make it a graph + make it live + turn the flywheel once.**

## Status snapshot (2026-06-18)
- research-atlas: 887,016 grants · 99,650 orgs · 170,408 people · 69 funders · $532.0B · 4.17M rows (NIH/NSF/CORDIS/UKRI, recent years). **0 orgs ROR-resolved. No output side. Not yet a graph.**
- Tools: 11/54 built (7 biophysics + PaperRadar/GrantDraft/MethodsMatcher/ReviewGuard). **None deployed live.**
- Publish surface built; **flywheel not turning** (GitHub-raw downloads, no DOI/mint).

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

## C · [tools] Full 54-tool suite
16. DNA/RNA cluster — RNAFold3D, RNA-FM-Embeds, gRNA-Optimizer, ChromatinAccess **(P1, 1105 PIs)**
17. Neuroscience cluster — SpikeSortCloud, CalciumTraceML, HH-FitML **(P1, 938 PIs)**
18. Ion-channel structure — ChannelStructPredict, GPCR-LigandDock, ChannelDwell
19. Conformational ensembles — ConformerEnsemble, HeteroMap, IDP-Ensemble
20. Imaging/mechanobiology — CellSegTrack, AFM-CurveML, TractionForceML
21. Remaining RAG — ProtocolGPT, QuantumBioRAG, ToxinChannelFinder
22. Flagship CoFoldComplex (#1) · 23. Flagship ADMET-Predict (#3)

## D · [platform] Live infra & deployment (off gianyrox)
24. Deploy tools-gateway → Hetzner research-tools.agfarms.dev **(P1)**
25. Async job queue (Redis/RQ) + workers · 26. GPU worker plane · 27. Supabase job store
28. Viatika/x402 metering per run **(P1)** · 29. Auth + tiers · 30. TOOLS_GATEWAY_URL + K3s secrets **(P1)**

## E · [flywheel] Publish → cite → paid
31. Hosted content-addressed DOI'd dataset releases **(P1)** · 32. Story Protocol mint (founder-gated wallet)
33. Walrus pinning · 34. cite-forever x402 payout · 35. Mint the funding-landscape dataset (turn it once) **(P1)**

## F · [science] Metascience research (the PhD spine)
37. Funding-flow analyses · 38. Field-dynamics / science-of-science
39. **First preprint: StabilityDesigner vs FoldX (Zenodo/bioRxiv)** **(P1 — PhD review fix #1)**
40. Publish analyses as canon

## G · [ops] Data quality & orchestration
FX refresh · idempotent full-rerun cron · schema versioning/migrations · scale tests + monitoring

---
### Execution order (the "real" milestone first)
**Wave now:** A1–A4 (graph linkage) + C16–C17 (DNA/RNA + neuro tools).
**Next:** D24/D30 (deploy gateway live) + E31/E35 (DOI release + mint once).
**Then:** B (funder breadth) + remaining C tools + F (science/preprint) continuously.
