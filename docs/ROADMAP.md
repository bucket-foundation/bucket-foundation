# Roadmap

Bucket reforms education. Research OS is the product, the canon holds the foundations, and citation fees route to authors ([docs/foundation/MANIFESTO.md](foundation/MANIFESTO.md)). This file lists the current release and the work queued behind it. The bead queue is the source of truth for status: `bd ready`.

## Current release

`bkt-v0.4.0`, 2026-09-30. Release notes: [CHANGELOG.md](../CHANGELOG.md).

| Surface | State |
|---|---|
| `bkt` terminal app | Signed binaries for Linux and macOS on x64 and arm64, Windows on x64. Installers verify the checksum and the release signature. |
| Research OS window | Learning path, grip sphere, canon circle, atlases, advisors, prime directions, notes and history, served over `bkt serve`. |
| Canon | 599 claim cards across the branches in `bucket-canon/`, 99 figure cards in `canon-figures/`, bridges, and a static full-text search. |
| Machine interface | `/llms.txt`, feed402 discovery, the MCP server in `mcp-server/`, and `/api/research` envelopes at a reader price of zero. |
| Engine | The hypothesis engine `hte` runs locally behind `hte-serve`. The design paper carries a Zenodo DOI. |
| Site | bucket.foundation ships from `main`, promoted from `dev`. |

## Launch

A bead is ready only when it names a screen or API a user touches at launch. Everything else carries `post-launch`.

| Item | Bead | Outcome |
|---|---|---|
| Desktop installers for macOS, Windows and Linux in the release | bkt-s6xi | `/download` serves a signed installer on all three systems. |
| Privacy notice before `/download` collects email | bkt-9ifg, bkt-zyfa | `/privacy` carries final copy approved by the founder. |
| Canon search as the one tool | bkt-0sj7 | Advisors, sources, helix, DNA and matter modes share one stage. |
| Workbench sync to the hosted schema | bkt-ya07.4 | A learner's runs persist across machines. |
| Replacement hosted database | bkt-x23u | The five open public tables are locked or dropped before the new host goes live. |
| Key hygiene | bkt-ft7n | Vercel env history checked and the wallet key rotated if it was ever set. |

## Next

| Item | Why it follows the mission |
|---|---|
| Author-side citation split | Reader-side settlement over x402 is live. The split that routes at least 80% of net receipts to the author completes the patronage rail. |
| Research OS stages | Bead bkt-oc8l stages every queued `ros-` slice as MVP, near-term or later for the founder to mark. The marks set the build order. |
| Student productions as graph nodes | An accepted production enters the map as a citable contribution. The engine fuses it as evidence and routes learners toward gap nodes. |
| Canon growth | Dossiers and concept nodes enter by the promotion checklist in [CONTRIBUTING.md](../CONTRIBUTING.md). The canon stays small and holds foundations only. |
| Second bucket | A separate operator runs the protocol from [docs/foundation/PROTOCOL.md](foundation/PROTOCOL.md) with its own canon. This is the measure of success in MANIFESTO section 9. |

## Later

Labelled `post-launch` in the queue: prime directions for any corpus, the research position space, the paid-to-cite market on stems, the encrypted data and compute marketplace, and ORCID ingest.

## Polingual

The photon index, 6,564,942 photons in 35 languages, runs locally. Its contract and plan are in [docs/specs/PHOTON-SPEC.md](specs/PHOTON-SPEC.md) and [docs/specs/POLINGUAL.md](specs/POLINGUAL.md). The former roadmap for that index sits in [docs/internal/archive/ROADMAP-POLINGUAL-2026-05-14.md](internal/archive/ROADMAP-POLINGUAL-2026-05-14.md).
