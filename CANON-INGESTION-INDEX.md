# Bucket Foundation — Canon Ingestion Index

*Updated 2026-05-10T17:53:19*

**Total source documents**: 23,366  ·  **FTS searchable**: 23,384

## Sources (12+ types)

| Source | Count |
|---|---:|
| YouTube transcripts | 678 |
| Archive.org books   | 156 |
| PubMed papers       | 7,796 |
| arXiv papers        | 166 |
| Project Gutenberg   | 108 |
| Wikisource          | 43 |
| OpenAlex authors    | 365 |
| OpenAlex fanout     | 1,500 |
| OpenAlex citers     | 10,429 |
| Blog scrapes        | 1,455 |
| Kruse blog corpus   | 460 |
| AARO archive        | 97 |
| PURSUE Release 01   | 113/146 |
| **Total source docs** | **23,366** |
| **FTS searchable**    | **23,384** |

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

## Canon network

- 365+ author publication graphs (covering math, physics, chemistry, biology,
  biophysics, neuroscience, AI, cybernetics, philosophy of mind, philosophy
  of science, sociology, anthropology, linguistics, music theory + cognition,
  Eastern philosophy, sacred contemplative traditions, postcolonial,
  women in science, modern AI canon)
- 1,500+ fanout works (top-cited from canon authors)
- 10,400+ exploded citing-paper records
- 494 direct collaboration pairs
- 1,987 direct citation pairs
- 53,000+ unique works indexed via citation graph

## Web routes (force-static SSG)

`/canon`, `/canon/[slug]`, `/canon/bridges`, `/canon/bridges/[slug]`,
`/canon/claims`, `/canon/claims/[concept]/[slug]`, `/canon/graph`

## Tooling (org-wide via ~/bin → ~/agfarms/tools/)

20+ canon-ingestion + synthesis tools.

## Autonomous (systemd --user, linger=yes)

| Timer | Cadence | Job |
|---|---|---|
| `pursue-mirror.timer`  | hourly | war.gov PURSUE mirror (113/146) |
| `archive-mirror.timer` | daily  | archive.org canon-target puller |
| `aaro-mirror.timer`    | every 6h | AARO.mil archive (97/143) |
| `fts-rebuild.timer`    | every 6h | FTS index rebuild |

## Session totals

Started: 1,159 FTS docs.
Now: **23,384 FTS docs (20.2x growth)**.
Total source docs: 23,366.

## Topic coverage (post final waves)

- Foundational physics + mathematics + chemistry
- Modern AI + cybernetics + cognitive science + philosophy of mind
- Eastern + Western philosophy + classical antiquity + medieval
- Sacred texts + perennialist + transpersonal + Sufi + Vedic + Buddhist + Christian + Jewish + Tao
- **MUSIC** (full bridge directory): theory + history + world traditions + cognition + philosophy + jazz + classical + electronic + cymatics + Pythagorean + sacred
- Deep history + archaeology + classical historians
- Art + aesthetics + literary criticism (Borges/Dostoevsky/Tolstoy/Shakespeare)
- Government UAP records (PURSUE + AARO + DNI)
- Cultural anthropology (Levi-Strauss, Bateson, Mead, Boas, Graeber)
- Postcolonial canon (Fanon, Said, Achebe, Vandana Shiva, Mishra)
- Women in canon (Hypatia, Hildegard, Noether, Curie, Lise Meitner, Vera Rubin)
- Behavioral economics + decision theory (Kahneman, Tversky, Thaler)
- Sociology (Weber, Durkheim, Bourdieu, Goffman, Mills)
- Linguistics + semiotics (Saussure, Chomsky, Eco, Peirce, Jakobson)
- Systems thinking (Wiener, McCulloch, Bateson, Bertalanffy, Laszlo)
- Critical theory (Adorno, Horkheimer, Habermas, Foucault, Arendt)
