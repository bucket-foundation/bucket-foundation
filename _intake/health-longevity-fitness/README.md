# Health · Longevity · Fitness — research corpus (staging)

Outcome-layer research track for Bucket Foundation, tied to the biophysics canon.
**Staging area** — location in Bucket is a deliverable (`LANDING-PROPOSAL.md`), discovered after the map fills.

## Read order
1. `00-map/00-IDEAL-STATE-MAP.md` — the unbiased target ontology (start here)
2. `06-evidence/SCHEMA.md` — how every claim is graded (the neutrality mechanism)
3. `07-sources/SOURCE-REGISTRY.md` — where the random walks go
4. `00-map/FRONTIER.md` — the live worklist + expansion log
5. `01-people/PEOPLE-SEED.md` — the field's people, mainstream + fringe, evidence-tagged

## Folders
| Dir | Holds |
|-----|-------|
| `00-map/` | ideal-state map, frontier, taxonomy notes |
| `01-people/` | figure cards (canon-figures schema) |
| `02-domains/` | per-domain graded claim sets (A–L) |
| `03-movement-library/` | mobility / flexibility / strength / yoga / breath / cold / heat / locomotion |
| `04-protocols/` | extracted N=1 + clinical protocols (separated from evidence) |
| `05-labs/` | labs ↔ people ↔ trials graph |
| `06-evidence/` | claim schema, conflict objects, evidence index |
| `07-sources/` | source registry, crawl manifests |
| `media/` | downloaded video / images / transcripts |
| `_intake-raw/` | raw pulls before structuring (idempotent manifests) |

## Principles
Index all, exclude nothing, grade everything. Mechanism ≠ outcome ≠ protocol.
Provenance on every claim. Conflicts are first-class objects. Random-walk expansion is expected.

## Idempotency
Re-runs converge, not duplicate. Every source hit logged in `_intake-raw/<source>/MANIFEST.jsonl`.
Superseded material → `_archive/<YYYY-MM>/`.
