# Quantum — the whole field, all industries, on one substrate

A Bucket Foundation initiative. Goal: index **all of quantum** — the physics
foundations, every compute modality (qubits, QPUs, error correction), every
adjacent technology (communication, sensing, cryptography), every industry it
touches, the full history, the geopolitics, and the honest frontier — then
compile it into a single **Quantum Operating Manual** the same way the
Longevity & Fitness Operating Manual was built.

Direction: this is the physics-branch sibling of the health manual. Where health
is outcome-tier, quantum sits closer to canon: quantum mechanics is foundation
(branch `02-physics` in the Bucket canon). The manual reaches up from the
postulates through the machines and out into every industry that will be
rewritten by them.

## Read order
1. `00-map/00-IDEAL-STATE-MAP.md` — the entire territory on one page (start here)
2. `00-map/NETWORK-CAPACITY.md` — the coverage meter; % of the map that is filled
3. `00-map/FRONTIER.md` — the live worklist + random-walk expansion log
4. `evidence/SCHEMA.md` — how every claim is graded (the neutrality mechanism)
5. `sources/SOURCE-REGISTRY.md` — the outlets, journals, and feeds the walks draw from

## Folders
| Dir | Holds |
|-----|-------|
| `00-map/` | ideal-state map, network-capacity meter, frontier worklist |
| `01-foundations/` | QM postulates, entanglement, decoherence, quantum information theory |
| `02-hardware/` | qubit modalities, QPUs, cryogenics, control, fabrication supply chain |
| `03-stack-algorithms/` | error correction, compilers, algorithms, benchmarks, cloud access |
| `04-adjacent-tech/` | quantum comms/QKD/internet, PQC, sensing, metrology, imaging |
| `05-industries/` | per-industry landing cards (finance, pharma, chem, energy, defense…) |
| `06-ecosystem-geopolitics/` | national programs, funding, standards, talent, market forecasts |
| `07-history/` | full timeline 1900 → today, milestone cards |
| `08-frontier-open/` | open problems, hype-vs-reality, contested claims |
| `09-people-orgs/` | figure + company + lab cards (canon-figures schema) |
| `evidence/` | claim schema, conflict objects, evidence index |
| `sources/` | source registry, crawl manifests |
| `reports/` | build_manual.py → manual.html / manual.pdf / manual.epub |
| `media/` | figures, diagrams, downloaded transcripts |
| `_intake-raw/` | raw pulls before structuring (idempotent manifests) |
| `_science-jobs/` | briefs dispatched to the Claude Science project (renders, sims, figures) |

## Principles (inherited from the health manual)
Index all, exclude nothing, grade everything. **Foundation ≠ machine ≠ industry
application.** Provenance on every claim. Conflicts are first-class objects.
Hype gets graded like everything else — a vendor press release and a
peer-reviewed threshold demonstration do not carry the same weight, and the
manual says which is which. Random-walk expansion is expected and logged.

## The two-phase plan (per the initiative brief)
1. **Breadth first.** Fill the map to **90%+ network capacity** — every node in
   `00-IDEAL-STATE-MAP.md` gets at least a stub card with one graded source.
   This is the `/loop` phase: every cycle expands coverage and runs gap analysis.
2. **Depth second.** Once breadth ≥ 90%, the loop switches to deepening every
   node — primary sources, derivations, conflict maps, numbers.

## Idempotency
Re-runs converge, not duplicate. Every source hit logged in
`_intake-raw/<source>/MANIFEST.jsonl`. Superseded material → `_archive/<YYYY-MM>/`.
