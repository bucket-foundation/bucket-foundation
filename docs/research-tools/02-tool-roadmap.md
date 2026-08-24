# Bucket Research Tools: Product Roadmap & Catalog

**Owner:** Product pillar · **Bead:** `biophysics-phd-review-8uv`
**Last updated:** 2026-06-18
**Status:** v1, prioritized, buildable catalog for the Bucket research-tools platform

**Sources:** `biophysics-phd-review/data/processed/software_opportunities.csv` (107-opportunity map),
`research_gaps.csv`, `subfields_long.csv`, `funnel_targets.csv`, `field_universe.csv`,
`reports/Biophysics_Software_Opportunity_Strategy.pdf`; the live Bucket app routes in
`bucket-foundation/src/app/{research,canon,library,chat,academy,api/research}`.

> Note: the sibling Data agent's `research_tools_needs.csv` was not present at authoring time.
> This roadmap is built directly from the 107-opportunity source map and the strategy synthesis,
> and should be reconciled with that file when it lands (the persona/JTBD columns here are the
> ones it is expected to fill).

---

## 1. Vision, one screen

**Bucket is where researchers RUN the tools, READ the results, PUBLISH the findings into the
Canon, get CITED, and get PAID.** Today Bucket is a publish-cite surface plus a canon/RAG
read surface. The next layer makes Bucket a *place you do work*, not just a place you deposit it.
Publishing is **free-to-read, paid-to-cite over feed402/x402** with a real DOI for permanence,
**NO blockchain, NO Story Protocol, NO IP-NFT** (org-wide rule).

The flywheel:

```
        RUN                READ              PUBLISH             CITE              PAID
   ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
   │ run an   │ ───► │ readable │ ───► │ one-click│ ───► │ feed402  │ ───► │ x402 USDC│
   │ AI tool  │      │ output + │      │ publish  │      │ citation │      │ to author│
   │ on Bucket│      │ provenance│     │ to canon │      │ on Base  │      │ payout   │
   └──────────┘      └──────────┘      └──────────┘      └────┬─────┘      └────┬─────┘
        ▲                                                     │                 │
        └─────────────── more citeable results ◄──────────────┴── more researchers ◄┘
```

Why this is *Bucket's* flywheel and not a generic SaaS tool farm:

1. **The output is born citeable.** Every tool run emits a feed402/0.2 envelope with provenance,
 inputs, model versions, and a `cite` block, the same envelope shape `/api/research` already
 returns. A run is a publishable artifact from the first second.
2. **Publish-to-canon is one hop.** The tool's structured output is already in the
 shape the `/research` publish-cite flow wants. Run → Publish is a button.
3. **Citation routes money to the author.** The cite-forever v0.1 license + x402 payout wallet
 already exist (`src/app/api/research/route.ts`). A tool result that gets cited downstream pays
 the researcher who ran it, the thing no Colab notebook, no Tamarind job, no HuggingFace Space
 can do.
4. **The canon makes every tool smarter.** Tools read from the same primary-research canon the RAG
 proxy reads from. A literature tool grounded in Bucket's curated canon beats a generic web-RAG.

**The unfair advantage (from the strategy synthesis):** nearly every biophysics subfield now has a
Powerful open model (Boltz-2, AF3, RFdiffusion, MACE, Cellpose, Kilosort4, RhoFold+, scGPT). What
almost no lab has is *a production serving layer + agent orchestration + RAG over its own data*,
`model → usable lab product` is pure full-stack + LLM-agent + data-pipeline engineering. That is
exactly what Bucket is good at, and exactly what a biophysics PI cannot hire for. Bucket does not
invent the next AlphaFold; it makes the existing frontier **usable, fundable, and citeable.**

---

## 2. The 7 existing tools

These exist today (validated, ~120 tests, benchmarked vs eFEL / CTFFIND / FoldX) and are migrating
**off `gianyrox.com/research` onto `bucket.foundation`**. "Productizing in Bucket" = give each a
tool page under `/research/tools/<slug>`, a structured run, a readable output surface, and a
**publish-to-canon hook** that turns the run into a citeable artifact.

| # | Tool | Maps to opp | Build tier | Persona / subfield |
|---|------|-------------|-----------|--------------------|
| 1 | **LabBrain** | #18 LabBrain (A) | T-A (moat) | Any lab; grad students + PIs (Literature/RAG) |
| 2 | **ProteinScout** | per-residue biophysics (≈ AllosteryMapper/ProteinMPNN-features family) | T-A/B | Structural & protein-dynamics researchers |
| 3 | **StabilityDesigner** | #2 StabilityDesigner (A) | T-B (applied ML) | Protein engineers / folding & dynamics |
| 4 | **TrajMine** | #37 FoldKineticsAgent / MD-MSM family | T-A/C | MD simulators (folding & dynamics) |
| 5 | **CryoTriage** | #6 CryoQC-Agent (A) | T-A (moat) | Cryo-EM facility staff + PIs |
| 6 | **PatchSeqML** | #32 PatchSeqML (B) | T-B (applied ML) | Electrophysiologists / membrane & ion channels |
| 7 | **ScreenServer** | #4 ScreenServer (A) | T-A (moat) | Comp-chemists / drug discovery |

### 2.1 LabBrain: *literature RAG over a lab's own corpus*
- **Value prop:** Ask your lab's papers, protocols, notebooks and Slack a question and get a
 citation-grounded answer instead of re-reading 200 PDFs.
- **Persona:** every biophysics lab; the new grad student onboarding, the PI re-deriving "what
 buffer did we use." Highest-frequency, lowest-friction tool, the wedge.
- **Current state:** built + validated; PaperQA2-style agentic hybrid RAG (dense + BM25), multi-hop
 retrieval with citation grounding.
- **Productize in Bucket:** `/research/tools/labbrain`. **Inputs:** a corpus (upload PDFs / connect
 a Zotero or folder / point at a canon branch). **Readable output:** answer + inline citations +
 retrieved-passage cards with provenance. **Publish hook:** "Publish this synthesis" → registers the
 Q→A→evidence bundle as a citeable note with its feed402 cite-forever block (canon_tier:`candidate`
 until promoted). This is the
 **reference implementation** (see §5), it already shares the `/api/research` envelope shape.

### 2.2 ProteinScout, *per-residue biophysics*
- **Value prop:** Upload a structure/sequence, get per-residue annotations (conservation,
 flexibility, contact-network centrality, putative functional/allosteric residues) you'd otherwise
 hand-derive from MD + PyMOL.
- **Persona:** structural biologists & protein-dynamics researchers; the "which residue matters"
 question.
- **Current state:** built + validated.
- **Productize in Bucket:** `/research/tools/proteinscout`. **Inputs:** PDB/CIF or sequence.
 **Readable output:** an interactive residue table + a 3D viewer (NGL/Mol*) colored by score +
 a downloadable per-residue CSV. **Publish hook:** publish the annotated structure as a citeable
 dataset artifact (CSV + viewer state, free-to-read / paid-to-cite over feed402/x402, DOI'd via Zenodo).

### 2.3 StabilityDesigner: *ΔΔG of mutations*
- **Value prop:** Predict + rank stabilizing/destabilizing mutations (ΔΔG) without a costly
 mutational scan.
- **Persona:** protein engineers, enzyme & therapeutic-protein designers (folding & dynamics,
 $242M funded sub-area, 8 open positions).
- **Current state:** built + validated; ESM/inverse-folding zero-shot + supervised ΔΔG head
 (ThermoMPNN pattern). Benchmarked vs FoldX.
- **Productize in Bucket:** `/research/tools/stabilitydesigner`. **Inputs:** structure + (optional)
 mutation list, or "scan all positions." **Readable output:** ranked ΔΔG table, heatmap over the
 sequence, top-N suggested mutations. **Publish hook:** publish the ΔΔG map for a target as a
 citeable result (a real "we predicted these N stabilizing mutations" artifact).

### 2.4 TrajMine: *MD trajectory → mechanism report*
- **Value prop:** Drop in an MD trajectory, get an ML-analyzed mechanism report, metastable states,
 transition rates, an MSM, instead of hand-building one in PyEMMA.
- **Persona:** MD simulators in folding & dynamics. **This is the strategy's named "lead product
 bet"** (demand-score 10, maps to 6 open positions), it runs on an A+ MD advisor's *own*
 trajectory and attaches the 1-page report as the cold-email flash.
- **Current state:** built + validated; MSM automation + analysis.
- **Productize in Bucket:** `/research/tools/trajmine`. **Inputs:** trajectory file(s) (DCD/XTC) +
 topology, or a link to a hosted trajectory. **Readable output:** the 1-page mechanism report,
 state diagram, implied-timescale plot, transition matrix, plain-language summary. **Publish
 hook:** publish the mechanism report as a citeable analysis (the highest-return publish in the
 set, because the report *is* the deliverable researchers want).

### 2.5 CryoTriage: *cryo-EM session QC + triage*
- **Value prop:** Ingest a cryo-EM session's metrics and get a triage report + suggested fixes,
 instead of PI/staff manual session triage.
- **Persona:** cryo-EM facility staff and PIs (structural biology / cryo-EM, $250M sub-area, dense
 open-position pool: 6 reqs; cleanest PhD→company precedent, CryoSPARC).
- **Current state:** built + validated; benchmarked vs CTFFIND.
- **Productize in Bucket:** `/research/tools/cryotriage`. **Inputs:** session metrics
 (CTF/motion/defocus/ice tables) or a metrics export. **Readable output:** RAG-grounded triage
 report, flagged issues, ranked fixes, links to troubleshooting canon. **Publish hook:** publish a
 redacted session-QC report as a citeable methods artifact / facility benchmark.

### 2.6 PatchSeqML: *patch-clamp trace auto-analysis*
- **Value prop:** Auto-detect events, fit kinetics, build IV curves and leak-subtract patch-clamp
 sweeps, replacing sweep-by-sweep curation in Clampfit/pCLAMP.
- **Persona:** electrophysiologists in membrane & ion channels, the **largest funded sub-area in
 the dataset ($1,032M)**.
- **Current state:** built + validated; 1D-CNN event detection + classical fitting + a seal-quality
 QC classifier. Benchmarked vs eFEL.
- **Productize in Bucket:** `/research/tools/patchseqml`. **Inputs:** ABF/NWB recordings.
 **Readable output:** annotated sweeps, event table, kinetics fits, IV plot, QC verdict. **Publish
 hook:** publish the analyzed-recording bundle as a citeable dataset.

### 2.7 ScreenServer: *turnkey docking + affinity screen*
- **Value prop:** CSV of ligands in → ranked hits out. Runs DiffDock + Boltz-2 affinity on a library
 behind a clean UI + job queue, no in-house docking plumbing.
- **Persona:** comp-chemists / computational drug discovery ($300M sub-area; comparables Tamarind.bio,
 Neurosnap, OmniFold).
- **Current state:** built + validated.
- **Productize in Bucket:** `/research/tools/screenserver`. **Inputs:** a target structure + a ligand
 CSV/SMILES library. **Readable output:** ranked hit table with poses, affinity scores, a
 downloadable results CSV + per-pose viewer. **Publish hook:** publish the ranked screen as a
 citeable result (a "we screened library X against target Y" artifact). **Infra note:** GPU-bound;
 needs a real job queue + GPU pool (the heaviest of the 7 to host).

---

## 3. New-tool roadmap

Grouped by tier. **T1 = ship-now** (build-tier A "full-stack serving / agent / RAG over open
models", the moat, fastest to ship, low infra). **T2 = next** (build-tier B "applied ML on assay
data", needs labeled data or modest GPU). **T3 = later** (build-tier C "frontier", ML force
fields, generative design, heavy GPU/QM).

Build complexity scale: **★** low (RAG/agent over existing models, mostly engineering) →
**★★★★** high (train/serve frontier ML, heavy GPU/QM, scarce data).

### Tier 1, ship now

| Tool | Opp # / score | Persona | Jobs-to-be-done | MVP scope (smallest useful) | Existing alternatives & our edge | Complexity | Infra |
|------|---------------|---------|-----------------|------------------------------|----------------------------------|-----------|-------|
| **PaperRadar** | #10 (65.4) | Every researcher | "Tell me which of today's preprints matter to *my* project" | bioRxiv/arXiv ingest + embedding similarity to a user corpus + LLM "why it matters to you" blurb; daily digest page | Scholar Inbox, Semantic Scholar feeds, ours is grounded in the user's Bucket corpus/canon and emits citeable digests | ★ | No GPU; embeddings API + a daily cron |
| **GrantDraft** | #17 (62.7) | PIs / postdocs | "Draft my NIH/NSF specific-aims + related-work from my corpus" | RAG over user corpus + retrieval over RePORTER/NSF awards + long-context generation; export to docx | Scholarcy, generic LLM tools, ours is biophysics-specific, corpus-grounded, and runs through the Longtail chisel review queue already wired into Bucket | ★ | None (LLM API) |
| **ProtocolGPT** | #19 (62.7) | Bench scientists | "Turn our SOPs into a runnable step-by-step protocol + reagent list" | RAG over protocols.io + uploaded SOPs → structured JSON protocol schema + reagent table | protocols.io AI, Benchling AI, ours emits a structured, publishable protocol artifact | ★ | None |
| **MethodsMatcher** | #21 (62.7) | Anyone scoping a study | "Which assay/instrument/computational method answers this question?" | RAG over a methods ontology + LLM reranking → ranked method recommendations w/ citations | White space, no clean incumbent | ★ | None |
| **ReviewGuard** | #20 (62.7) | Reviewers / lit-synthesizers | "Find contradictions across this set of papers" | PaperQA2-style multi-doc retrieval + NLI contradiction detection over an uploaded set | PaperQA2 contradiction detection, ours is canon-grounded + publishes a citeable consistency report | ★★ | None |
| **ToxinChannelFinder** | #8 (73.8) | Ion-channel pharmacologists | "Map this toxin → its channel target(s)" | RAG over channel pharmacology DBs + sequence-similarity search → ranked target table | White space; sits in the $1,032M membrane/ion-channel sub-area | ★★ | Bioassay DB access |
| **RNA-FM-Embeds** | #9 (67.0) | RNA biophysicists | "Give me RNA-seq → ML features for my downstream model" | Serve RNA-FM/RhoFold LM embeddings via API + a small UI | RNA-FM, Evo, ours is a hosted, no-setup embedding service with citeable provenance | ★★ | Modest GPU (inference only) |
| **QuantumBioRAG** | #74 (42.9) | Quantum-bio researchers | "Triage this noisy literature; separate evidence from hype" | RAG + claim-strength scoring over the quantum-bio corpus | White space, high value given the field's signal-to-noise; aligns with canon's "candidate vs canon" tiering already in the proxy | ★ | None |

**Why these are T1:** all are build-tier A (the strategy's "build first, your moat"), they need
Little or no GPU, they reuse the RAG/agent + canon infrastructure Bucket already has, and several
sit in the densest funded sub-areas (ion channels, drug discovery). They are the cheapest way to
multiply the number of citeable run→publish artifacts on Bucket.

### Tier 2, next

| Tool | Opp # / score | Persona | Jobs-to-be-done | MVP scope | Alternatives & edge | Complexity | Infra |
|------|---------------|---------|-----------------|-----------|---------------------|-----------|-------|
| **CoFoldComplex** | #1 (83.2, top score) | Structural biologists | "Predict this protein-protein/peptide complex + score the interface" | Serve AF3/Boltz-2 multimer co-folding + interface-confidence reranking; structure in → ranked complex + confidence | Boltz-2, AF3, AF-Multimer, ours adds interface reranking + a clean UI + citeable output | ★★★ | GPU pool |
| **ADMET-Predict** | #3 (82.8) | Drug-discovery chemists | "Predict solubility/hERG/CYP/permeability for my library" | Multitask D-MPNN (Chemprop) + uncertainty; SMILES CSV in → property table | Chemprop, ADMET-AI, DeepChem, ours is hosted, multitask, with calibrated uncertainty + publish hook | ★★ | Modest GPU |
| **PickServer** | #7 (75.6) | Cryo-EM users | "Pick particles few-shot on my new sample" | SAM2/CryoSegNet adapter, ~5-shot; micrographs in → picks out | CryoSegNet, Topaz, crYOLO, ours is few-shot (no per-project training) + integrates with CryoTriage | ★★★ | GPU |
| **gRNA-Optimizer / GuideDesignPro** | #12 (64.2) / #29 | CRISPR engineers | "Design guides w/ on/off-target + efficiency + indel-outcome prediction" | CNN/transformer on guide+context + off-target GNN; target in → ranked guides | DeepHF, CRISPOR, Benchling, ours bundles efficiency + off-target + indel outcome in one citeable report | ★★ | Modest GPU |
| **MigrationTrack / CellSegTrack** | #11 (64.9) / #49 | Cancer / mechanobiology imagers | "Segment + track migrating cells in 3D, score motility" | Cellpose/micro-SAM + deep tracking + motility-state classifier; image stack in → tracks + metrics | Cellpose, TrackMate, ours adds the motility-state classifier + publishable result | ★★★ | GPU |
| **SpikeSortCloud** | #27 (61.1) | Systems neuroscientists | "Sort my Neuropixels data + curate it" | Serve Kilosort4 + auto-curation classifier + a web QC UI | Kilosort4, SpikeInterface, Phy, ours is turnkey cloud + auto-curation (replaces Phy marathons) | ★★★ | GPU + large I/O |
| **AggregatePredict** | #22 (62.4) | Neurodegeneration researchers | "Predict aggregation-prone regions / amyloid propensity" | ESM-feature sequence transformer; sequence in → hotspot map | CamSol, AggreProt, TANGO, ours is a hosted ML successor with a citeable artifact | ★★ | Modest GPU |
| **smFRET-AutoPipe** | #26 (61.2) | Single-molecule biophysicists | "Sort smFRET traces + idealize states end-to-end" | CNN sorter + LSTM idealization; traces in → idealized states | DeepFRET, Deep-LASI, Kin-SiM, ours is end-to-end + publishable | ★★★ | Modest GPU |

### Tier 3, later

Representative high-value frontier opportunities (full list in `software_opportunities.csv`,
Build-tier C). Ship 1-2 only as *signals of competence* to a target advisor rather than as broad products:

| Tool | Opp # | Why later |
|------|-------|-----------|
| **VirtualScreenAgent** | #5 (77.0) | LLM agent orchestrating the whole docking→triage→report campaign, depends on ScreenServer + ADMET-Predict + CoFoldComplex existing first |
| **BinderForge** | #15 (63.5) | RFdiffusion → ProteinMPNN → AF2/Boltz pipeline; heavy GPU, 3-stage glue |
| **ConformerEnsemble / AlphaFlow** | #14 (63.9) | Generative ensembles; frontier, GPU-heavy |
| **MDAccel-Serve** | #36 (58.7) | ML force field (MACE-OFF/AIMNet2) drop-in for MD, frontier infra |
| **HeteroMap (cryoDRGN)** | #43 (57.0) | Conformational heterogeneity from particles; GPU + viz |
| **MolGen-Opt** | #39 (58.3) | Diffusion molecule generation + Bayesian opt; frontier |

---

## 4. Information architecture

Goal: a researcher (and the founder) can **discover a tool → run it → READ the output → publish it**,
All within Bucket, reusing the existing `/research` publish-cite surface and the `/api/research`
Envelope shape.

```
/research                         existing — publish · cite · be cited (KEEP as the publish hub)
/research/tools                   NEW — Tool Directory (the catalog landing)
   ├─ card per tool: name, one-line value prop, persona tag, subfield, "run" CTA
   ├─ grouped by subfield (Protein · Cryo-EM · Ion channels · Drug discovery · Literature · …)
   └─ status badge: live | beta | coming-soon
/research/tools/<slug>            NEW — per-tool RUN page
   ├─ inputs form (file upload / sequence / library CSV / corpus picker)
   ├─ "Run" → creates a Run record (id, status, inputs hash)
   ├─ live status (queued → running → done) for GPU tools
   ├─ READABLE OUTPUT surface (table / 3D viewer / plots / report) — the core read experience
   └─ "Publish to canon" button → prefills the existing /research publish-cite flow with the run artifact
/research/runs                    NEW — "My Runs / Outputs" surface
   ├─ list of every run (tool, inputs, status, date), newest first
   ├─ open any run → its readable output (so founder + researchers can READ outputs)
   └─ per-run actions: re-run, download artifact, publish, share link
/research/runs/<runId>            NEW — single run permalink (citeable, shareable, embeddable)

/api/research                     existing — feed402/0.2 RAG proxy (the envelope shape tools reuse)
/api/research/tools               NEW — list tools (catalog metadata, drives /research/tools)
/api/research/tools/<slug>/run    NEW — POST inputs → create a run (enqueue if GPU)
/api/research/runs/<runId>        NEW — GET run status + output envelope
```

Design principles:
- **Every run is an envelope.** A run's output uses the same `{ data, citation, receipt, cite,
 provenance, canon_tier }` shape `/api/research` already emits. This makes Run→Publish trivial and
 every output natively citeable.
- **Read-first.** `/research/runs` is the founder's and the researcher's window into outputs, the
 literal "READ the result" step of the flywheel. It is not an afterthought; it is the surface the
 whole platform is judged on.
- **Reuse, don't rebuild.** Tool pages reuse the canon viewer components, the Mol*/NGL viewer, the
 PublishForm, and the cite-forever license. New surface area is the directory, the run pages, and
 the runs list. No new design system.
- **Persona-tagged.** Each tool card carries a persona + subfield tag (from the opportunity map) so
 a visiting PI immediately sees "this is for me."

---

## 5. Sequencing

What to wire first, then rollout order.

### Wire FIRST: **LabBrain**

LabBrain is the first tool to wire into the new IA, for five reasons:

1. **It already speaks the envelope.** LabBrain's RAG output is the same shape `/api/research`
 returns, citation-grounded answer + evidence + provenance. The least adaptation work to prove
 the run→result→publish→cite loop end-to-end.
2. **Lowest infra.** No GPU, no job queue, it can ship on the existing serverless surface. We
 validate the *product pattern* (directory → run page → readable output → publish-to-canon → runs
 list) before we take on GPU hosting.
3. **Highest frequency, lowest friction.** Every lab needs it; the strategy names it the wedge and
 the "chat-kruse" cold-email weapon. It maximizes the number of run→publish artifacts soonest.
4. **It closes the flywheel visibly.** Ask → grounded answer with canon citations → "Publish this
 synthesis" → citeable artifact → cite-forever payout. One tool demonstrates the entire thesis.
5. **It hardens the shared rails.** Building LabBrain's run page, runs list, and publish hook builds
 the exact components every other tool reuses. LabBrain is the template; tools 2..N are
 copy-the-pattern.

### Rollout order

**Phase 0, IA + reference pattern (now):**
- Ship `/research/tools` directory, `/research/tools/labbrain` run page, `/research/runs` list, and
 the run→publish hook. **LabBrain live.** This is the reference implementation.

**Phase 1, finish migrating the 7 (off gianyrox.com):** order by infra weight, lightest first, so
The GPU/job-queue work is staged:
1. LabBrain *(done in Phase 0)*
2. CryoTriage *(RAG/agent, light)*, also a strategy "best bet", cleanest PhD→company precedent
3. TrajMine *(report generator; the named lead-product bet, its 1-page report is the demo)*
4. ProteinScout *(structure viewer + per-residue table; reuses canon viewer components)*
5. StabilityDesigner *(modest GPU)*
6. PatchSeqML *(file-heavy, largest funded sub-area, ion channels $1,032M)*
7. ScreenServer *(GPU pool + job queue, the heaviest; build the GPU+queue infra here, reuse for T2)*

**Phase 2, T1 new tools (RAG/agent moat, no/low GPU):** PaperRadar → MethodsMatcher → ProtocolGPT
→ GrantDraft → QuantumBioRAG → ReviewGuard → ToxinChannelFinder → RNA-FM-Embeds. (GrantDraft also
plugs into the Longtail chisel review queue already wired into Bucket.)

**Phase 3, T2 (applied ML on assay data):** lead with the two highest-scoring opportunities in the
Whole map, **CoFoldComplex (#1, 83.2)** and **ADMET-Predict (#3, 82.8)**, once the GPU+queue infra
from ScreenServer is reusable. Then PickServer, gRNA-Optimizer, the imaging/ephys tools.

**Phase 4, T3 (frontier):** ship 1-2 as competence signals only (VirtualScreenAgent on top of the
Existing drug-discovery stack is the natural first, because its dependencies will already exist).

---

## REQUESTED OUTPUT

### T1 tool list

1. **PaperRadar**, personalized daily preprint feed (#10, 65.4)
2. **GrantDraft**, corpus-grounded NIH/NSF aims drafting (#17, 62.7)
3. **ProtocolGPT**, SOPs → runnable protocol + reagents (#19, 62.7)
4. **MethodsMatcher**, "which method answers this?" (#21, 62.7)
5. **ReviewGuard**, cross-paper contradiction checker (#20, 62.7)
6. **ToxinChannelFinder**, toxin → ion-channel target map (#8, 73.8)
7. **RNA-FM-Embeds**, hosted RNA embedding service (#9, 67.0)
8. **QuantumBioRAG**, claim-strength RAG over quantum-bio lit (#74, 42.9)

(All build-tier A: full-stack serving / agent / RAG over open models, no/low GPU, reuse Bucket's
existing RAG + canon + envelope rails.)

### Recommended FIRST tool to wire: **LabBrain**

**Rationale:** LabBrain is one of the 7 already-built tools and is the lowest-risk way to stand up
The entire new IA. Its output already matches the `/api/research` feed402 envelope, so the
run→result→publish→cite loop wires with minimal adaptation; it needs **no GPU**, so we prove the
*product pattern* (tool directory → run page → readable output → publish-to-canon → runs list)
Before taking on GPU/job-queue infra; it is the highest-frequency, lowest-friction tool every lab
wants (the strategy's wedge); and building it produces the exact reusable components (run page, runs
list, publish hook) that every subsequent tool copies. One tool, end-to-end, demonstrates the whole
Bucket thesis.

### Proposed IA

```
/research                      publish · cite · be cited      (existing publish hub — keep)
/research/tools                Tool Directory                 (NEW — catalog, persona/subfield tags)
/research/tools/<slug>         per-tool RUN page              (NEW — inputs → run → readable output → "Publish to canon")
/research/runs                 My Runs / Outputs              (NEW — read every output; founder + researcher window)
/research/runs/<runId>         single run permalink           (NEW — citeable, shareable)

/api/research                  feed402/0.2 RAG proxy          (existing — the envelope shape tools reuse)
/api/research/tools            list tools                     (NEW)
/api/research/tools/<slug>/run create a run (enqueue if GPU)  (NEW)
/api/research/runs/<runId>     run status + output envelope   (NEW)
```

Core invariant: **every tool run emits the same `{data, citation, receipt, cite, provenance,
canon_tier}` envelope `/api/research` already returns**, making every output born-citeable and
Run→Publish a one-button hop.
```
