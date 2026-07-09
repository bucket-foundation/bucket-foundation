# Source Registry — where the random walks draw from

Index all, exclude nothing, grade everything. Sources are tiered by default
reliability but every individual claim is still graded per `evidence/SCHEMA.md`.

## Primary literature (T1–T3)
- **arXiv** quant-ph, cond-mat.mes-hall, cs.ET — the field's real-time record
- **Nature / Nature Physics / Nature Photonics / npj Quantum Information**
- **Science / Science Advances**
- **Physical Review X / PRX Quantum / PRL / PRA / PRApplied** (APS)
- **Quantum (the open-access journal, quantum-journal.org)**
- **IEEE Transactions on Quantum Engineering**
- **NIST publications** (PQC standards, metrology)

## Standards & government (T2–T5)
- NIST PQC project pages; ISO/IEC JTC1 WG14; ETSI QKD; ITU-T
- US National Quantum Initiative (quantum.gov), DOE, NSF, DARPA
- EU Quantum Flagship, EuroQCI; UK NQCC / National Quantum Strategy
- China USTC / CAS releases (translated); India NQM; national strategy PDFs

## Industry / vendor (T4 — grade hard)
- IBM Quantum, Google Quantum AI, Microsoft Azure Quantum, AWS Braket blogs
- IonQ, Quantinuum, PsiQuantum, QuEra, Pasqal, Rigetti, D-Wave, Atom Computing,
  Alice & Bob, Oxford Ionics, Infleqtion, IQM investor/press pages
- Company roadmaps (always flagged T4/roadmap)

## News & trade press (T3–T5, cross-check before promoting)
- Quantum Insider, Quantum Computing Report, Physics World, IEEE Spectrum
- Ars Technica, Reuters/Bloomberg tech, MIT Technology Review, Nature News
- The Register, Tom's Hardware (hardware supply chain), SemiAnalysis

## Analyst & market (T5)
- BCG, McKinsey, IDC, Gartner, Hyperion, McKinsey Quantum Monitor
- Pitchbook / Crunchbase (funding rounds)

## Podcasts / long-form (context, mine for references)
- Already in bucket: `yt/` quantum interviews (Rovelli, Penrose, Carroll,
  Strominger, Faggin, historical figures). Use `agf-yt-mine` for reference extraction.

## Crawl manifests
Every source hit → `_intake-raw/<source>/MANIFEST.jsonl` (idempotent).
WebSearch + WebFetch are the primary tools; arXiv listing API for quant-ph sweeps.

## Forbidden-URL check
Before any external fetch, honor `.nucleus/config.json` `forbidden_urls`. No
production endpoints. Research reads only.
