# Bucket Foundation — Canon Ingestion Index

*Updated 2026-05-10T15:50:21*

**Total source documents**: 20,560  ·  **FTS searchable**: 20,614

## Sources (12+ types)

| Source | Count |
|---|---:|
| YouTube transcripts | 508 |
| Archive.org books   | 156 |
| PubMed papers       | 5,633 |
| arXiv papers        | 151 |
| Project Gutenberg   | 108 |
| Wikisource          | 43 |
| OpenAlex authors    | 291 |
| OpenAlex fanout     | 1,285 |
| OpenAlex citers     | 10,260 |
| Blog scrapes        | 1,455 |
| Kruse blog corpus   | 460 |
| AARO archive        | 97 |
| PURSUE Release 01   | 113/146 |
| **Total source docs** | **20,560** |
| **FTS searchable**    | **20,614** |

## Canon structure

**10 branches**: 01-mathematics, 02-physics, 03-chemistry, 04-information,
05-biophysics, 06-cosmology, 07-mind, 08-deep-history, 09-art, 09-sacred-texts

**6 primary-axis bridges** (mass ≥ 800):
- time (1,224)
- music (1,215) — directory bridge with 15 substructure folders
- light (1,033) — paired with sound
- information (1,019)
- sound (938) — paired with light
- energy (833)

**6 secondary bridges**: water, quantum, field, consciousness, coherence, symmetry

See:
- [`CANON-MASTER.md`](CANON-MASTER.md) — read-this-first overview
- [`bucket-canon/_bridges/INDEX.md`](../bucket-canon/_bridges/INDEX.md) — bridge structure
- [`_intake/MUSIC-BRANCH-VS-BRIDGE-ANALYSIS.md`](_intake/MUSIC-BRANCH-VS-BRIDGE-ANALYSIS.md) — why music is a bridge

## Web routes (force-static SSG)

`/canon`, `/canon/[slug]`, `/canon/bridges`, `/canon/bridges/[slug]`,
`/canon/claims`, `/canon/claims/[concept]/[slug]`, `/canon/graph`

## Tooling (org-wide via ~/bin → ~/agfarms/tools/)

20+ canon-ingestion tools.

## Autonomous (systemd --user, linger=yes)

| Timer | Cadence | Job |
|---|---|---|
| `pursue-mirror.timer`  | hourly | war.gov PURSUE mirror (113/146) |
| `archive-mirror.timer` | daily  | archive.org canon-target puller |
| `aaro-mirror.timer`    | every 6h | AARO.mil archive (97/143) |
| `fts-rebuild.timer`    | every 6h | FTS index rebuild |

## Session totals

Started: 1,159 FTS docs.
Now: **20,614 FTS docs (17.8x growth)**.
Total source docs: 20,560.

## What's in the corpus by topic area

- **Foundational physics** (Newton, Maxwell, Einstein, Bohr, Schrödinger, Feynman + ~50 modern physicists)
- **Mathematics** (Euclid, Gauss, Riemann, Cantor, Gödel, Russell-Whitehead Principia, Hilbert, Witten)
- **Biophysics** (Becker, Pollack, Marino, Mitchell chemiosmotic, Szent-Györgyi Bioenergetics, Ling)
- **Modern AI** (Hinton, LeCun, Bengio, Sutskever + cybernetics: Wiener, McCulloch-Pitts, von Foerster)
- **Cognitive science / philosophy of mind** (Penrose-Hameroff, Friston, Seth, Dennett, Chalmers, Tononi, William James)
- **Eastern + Western philosophy** (Plato, Aristotle, Augustine, Aquinas, Hume, Kant, Bergson, Heidegger, Wittgenstein, Foucault, Husserl, Merleau-Ponty)
- **Sacred texts** (KJV Bible, Quran, Vedas, Upanishads, Tao Te Ching, Bhagavad Gita, Confucius, Marcus Aurelius, Dhammapada, Sufi)
- **Music canon** (Schoenberg, Schenker, Riemann theory; Plato/Augustine/Schopenhauer philosophy; Helmholtz acoustics; Patel/Krumhansl/Levitin cognition; world traditions: Indian/Persian/Arabic/African/Tibetan/Vedic/Sufi; jazz/classical/electronic/cymatics/Pythagoras)
- **Deep history** (Herodotus, Thucydides, Plutarch, Tacitus, Gibbon, Burckhardt, Frazer)
- **Art** (Vasari, Ruskin, Pater, Reynolds, Leonardo Treatise on Painting)
- **Government UAP** (PURSUE Release 01, AARO archive, DNI 2022/23/24 reports)
