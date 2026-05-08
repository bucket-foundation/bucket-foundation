# Kruse Canon Targets — Curated from 3 Transcripts (12hr+)

*Hand-curated from `references.json`, correcting auto-caption errors
("Ray Pete" → Ray Peat, "St Georgie" → Szent-Györgyi, "Jack Cruz" → Jack
Kruse). Each has an `_intake/<slug>/` stub queued.*

## Tier 1: Cited canonical scientists (Kruse references repeatedly)

| Slug | Person | Key works | Canon branch | Mentions |
|---|---|---|---|---|
| `becker-robert-o` | **Robert O. Becker** (1923–2008), Syracuse VA orthopedic surgeon | *The Body Electric* (1985), *Cross Currents* (1990), ~30 primary papers | 05-biophysics | 42 |
| `pollack-gerald` | **Gerald Pollack**, U Washington Seattle | *The Fourth Phase of Water* (2013), exclusion-zone water papers | 05-biophysics | 4+ via "fourth phase" |
| `szent-gyorgyi-albert` | **Albert Szent-Györgyi** (1893–1986), Nobel 1937 | *Bioenergetics* (1957), *Introduction to a Submolecular Biology* (1960), vitamin C work | 05-biophysics | 4 (mistranscribed) |
| `peat-ray` | **Ray Peat** (1936–2022), bioenergetics | *Generative Energy* (1994), thousands of newsletters at ray-peat.org | 05-biophysics (lens) | 5 |
| `ling-gilbert` | **Gilbert Ling**, Damadian's mentor | *A Physical Theory of the Living State* (1962), Association-Induction Hypothesis | 05-biophysics | 5 |
| `mitchell-peter` | **Peter Mitchell** (1920–1992), Nobel 1978 | Chemiosmotic theory papers, mitochondrial proton gradient | 05-biophysics | 4 |
| `nordenstrom-bjorn` | **Björn Nordenström** (1919–2006), Karolinska radiologist | *Biologically Closed Electric Circuits* (1983) | 05-biophysics | mentioned via Becker |
| `russell-walter` | **Walter Russell** (1871–1963) | *The Universal One* (1926), *A New Concept of the Universe* (1953), spiral periodic table | 03-chemistry / lens | 8 |
| `ferry-david` | **David Ferry**, ASU semiconductor physicist | *Quantum Mechanics for Electrical Engineers*, semiconductor textbooks | 02-physics / 04-information | 4 |
| `frohlich-herbert` | **Herbert Fröhlich** (1905–1991) | Coherent vibrations in biological systems papers (1968+) | 02-physics / 05-biophysics | inferred |
| `popp-fritz-albert` | **Fritz-Albert Popp** (1938–2018) | Biophoton emission papers (~1970s–2000s) | 05-biophysics | inferred via "biophoton" 8 |
| `mendeleev-dmitri` | **Dmitri Mendeleev** (1834–1907) | 1869 paper, 1871 English revision, full periodic table | 03-chemistry | implied throughout |

## Tier 2: Foundational physicists (Kruse builds on)

| Slug | Person | Key works | Branch | Mentions |
|---|---|---|---|---|
| `einstein-albert` | Einstein | 1905 papers (photoelectric, Brownian, SR, E=mc²) | 02-physics | 20 |
| `maxwell-james-clerk` | Maxwell | *Treatise on Electricity & Magnetism* (1873) | 02-physics | 14 |
| `newton-isaac` | Newton | *Principia* (1687) | 02-physics | 10 |
| `tesla-nikola` | Tesla | Patents, papers on resonance | 02-physics | 4 |
| `faraday-michael` | Faraday | *Experimental Researches in Electricity* | 02-physics | 2 |
| `wheeler-john-archibald` | Wheeler | "Information, Physics, Quantum" (1989), delayed-choice | 06-cosmology | 3 |
| `warburg-otto` | Otto Warburg, Nobel 1931 | Warburg effect papers | 05-biophysics | implied |

## Tier 3: Adjacent / lens material

| Slug | Person/Topic | Notes | Mentions |
|---|---|---|---|
| `kennedy-rfk-jr` | Bobby Kennedy Jr. | HHS / vaccine policy lens | 9 |
| `dawkins-richard` | Richard Dawkins | Selfish gene / evolutionary lens | 3 |
| `flexner-report-1910` | Abraham Flexner | The Flexner Report — Rockefeller-funded medicine standardization | implied via "Rockefeller 20" |
| `tucker-carlson-interviews` | Tucker Carlson | Distribution channel for Kruse | 3 |
| `mind-lab-pro-formulation` | Performance Lab supplement | Sponsor reads, but Kruse comments on mechanisms | 4 |

## Tier 4: Concepts to map (own canon entries)

| Slug | Concept | Branch | Mentions |
|---|---|---|---|
| `concept-deuterium-depleted-water` | Deuterium-depleted water (DDW) | 03-chemistry / 05-biophysics | 1 (chapter title) |
| `concept-ez-water-fourth-phase` | EZ water / fourth phase / exclusion zone | 05-biophysics | 4 |
| `concept-photoelectric-effect-biology` | Photoelectric effect applied to biology | 02-physics ↔ 05-biophysics | 7 |
| `concept-melanin-semiconductor` | Melanin as biological semiconductor | 05-biophysics | 42 + 37 |
| `concept-mitochondrial-membrane-potential` | ETC / Mitchell chemiosmosis | 05-biophysics | 54 mitochondria |
| `concept-quantum-biology` | Quantum biology framing | 02-physics ↔ 05-biophysics | 58 quantum + 6 explicit |
| `concept-circadian-light-environment` | Circadian / SCN / light-environment biology | 05-biophysics | 10 |
| `concept-CMEs-biology` | CMEs / Schumann / geomagnetic effects on biology | 06-cosmology ↔ 05-biophysics | 1+1+1 |

## Auto-caption errors caught (transcript clean-up backlog)

| As transcribed | Should be |
|---|---|
| Jack Cruz, Cruz | Jack Kruse, Kruse |
| Ray Pete | Ray Peat |
| St Georgie / St. Georgie / Albert St | Szent-Györgyi / Albert Szent-Györgyi |
| Robert Becker (sometimes) | Robert O. Becker |
| Pollock | Pollack (Gerald) |

These should be fixed at the **transcript-cleanup tool** layer (TODO:
`agf-yt-clean` that runs Kruse-domain entity canonicalization).

## URLs captured

- `jackkruse.com` — Kruse's own blog (already mirrored at `~/jackkruse/`)
- `x.com/DrJackKruse` — Twitter feed (queued for future scrape)
- a couple sponsor URLs (heart-and-soil, mind-lab-pro, onramp, coinbits)

## Process from here

1. Each Tier 1 + Tier 2 slug above gets `_intake/<slug>/README.md` with target list (auto-generated below).
2. Where the work is public-domain (Newton, Maxwell, Mendeleev pre-1929), pull from archive.org / project gutenberg.
3. Where copyrighted (Becker, Pollack, Russell post-1929), file citation + held excerpt only.
4. Tier 4 concepts get markdown summary cards; promote to canon once branch curator approves.
