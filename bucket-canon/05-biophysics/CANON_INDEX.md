# 05-biophysics — Master Canon Index

Authoritative manifest for the biophysics branch. If a file or entry is not
listed here, it is not canon at the branch level. Sub-folder
`CANON_INDEX.md` files (where they exist) are authoritative for their own
sub-scope and roll up into this index.

**Branch opened**: 2026-04-23 (initial seed pass, Kruse-adjacent topics)
**Rebalance pass-1**: 2026-05-01 (this index, README, intake memo)
**Status**: absorption — sub-folders proposed, no promotions yet under the
mechanism-named tree.

## Sub-folder map (proposed; existing seeds preserved)

| Sub-folder (proposed) | Status | Notes |
|---|---|---|
| `membrane-biophysics/` | not yet created | spine; pass-2 |
| `bioenergetics/` | not yet created | absorbs `mitochondria/` content |
| `bioelectricity/` | not yet created | absorbs `bioelectric-lineage/` |
| `allosteric-regulation/` | not yet created | spine; pass-2 |
| `enzyme-kinetics/` | not yet created | spine; pass-2 |
| `structural-biology/` | not yet created | spine; pass-2 |
| `photobiology/` | not yet created | spine; pass-2 |
| `radiation-biology/` | not yet created | absorbs `radiosynthesis/` |
| `_sources/` | not yet created | Kruse, PubMed, PubChem pointers |
| `_landscape/` | not yet created | textbooks, including Becker 1985 |
| `sub-outcomes/longevity/` | not yet created | cross-mirror with gdrive |

## Sub-folder map (existing on disk, pass-1 preserves)

| Sub-folder | Created | Disposition under rebalance |
|---|---|---|
| `becker/` | 2026-04-23 | demote: Becker 1985 → `_landscape/`; primary papers cross-cite from `bioelectricity/` |
| `bioelectric-lineage/` | 2026-04-23 | fold into `bioelectricity/` |
| `melanin/` | 2026-04-23 | keep, narrow to originator papers (Raper 1928, Mason 1959, McGinness-Corry-Proctor 1974) |
| `mitochondria/` | 2026-04-23 | fold into `bioenergetics/`; Kruse-adjacent commentary → `_sources/kruse-index.md` |
| `peptides/` | 2026-04-23 | demote unless renarrowed to Sanger 1955 + Merrifield 1963 originator papers under `peptides-and-proteins/` |
| `radiosynthesis/` | 2026-04-23 | fold into `radiation-biology/` with Hevesy 1923 as canon and Dadachova 2007 as the modern primary |

## Canon entries (rebalanced spine — pass-1 inventory, none yet promoted)

The following entries are the proposed spine of the branch. They are listed
here for orientation; promotion to canon happens when the entry is filed in
the appropriate sub-folder with edition-of-record metadata. Entries marked
*strong* are uncontested originator papers; *borderline* are flagged for
pass-2 adjudication.

### Membrane biophysics

- *strong* — Hodgkin & Huxley 1952, *J. Physiol.* 116–117 (five-paper
  series on the squid-axon action potential; the founding equations of
  membrane biophysics)
- *strong* — Goldman 1943, *J. Gen. Physiol.* 27, 37–60 (the
  Goldman-Hodgkin-Katz voltage equation)
- *strong* — Singer & Nicolson 1972, *Science* 175, 720–731 (fluid mosaic
  model)
- *strong* — Mitchell 1961, *Nature* 191, 144–148 (chemiosmotic
  hypothesis; cross-link to bioenergetics)

### Bioenergetics

- *strong* — Mitchell 1961, *Nature* 191, 144–148 (chemiosmosis)
- *strong* — Lipmann 1941, *Adv. Enzymol.* 1, 99–162 (high-energy
  phosphate)
- *strong* — Krebs & Johnson 1937, *Enzymologia* 4, 148–156 (citric-acid
  cycle)
- *strong* — Lehninger & Kennedy 1948, *J. Biol. Chem.* 172, 847
  (oxidative phosphorylation localized to mitochondria)
- *strong* — Boyer 1997 / Walker 1997 Nobel Lectures (ATP-synthase
  rotational mechanism)

### Bioelectricity

- *strong* — Galvani 1791, *De Viribus Electricitatis in Motu Musculari
  Commentarius* (founding text)
- *strong* — Bernstein 1902, *Pflüger's Arch.* 92, 521–562 (membrane
  theory of bioelectricity)
- *strong* — Hodgkin & Huxley 1952 (cross-link from membrane biophysics)
- *borderline* — Levin recent reviews on developmental bioelectricity
  (canon-vs-landscape adjudication pending; cross-link to 07-mind)

### Allosteric regulation

- *strong* — Monod, Wyman & Changeux 1965, *J. Mol. Biol.* 12, 88–118
  (concerted MWC model)
- *strong* — Koshland, Némethy & Filmer 1966, *Biochemistry* 5, 365–385
  (sequential KNF model)

### Enzyme kinetics

- *strong* — Michaelis & Menten 1913, *Biochem. Z.* 49, 333–369
- *strong* — Briggs & Haldane 1925, *Biochem. J.* 19, 338–339
  (steady-state derivation)

### Structural biology

- *strong* — Watson & Crick 1953, *Nature* 171, 737–738 (DNA double helix)
- *strong* — Pauling, Corey & Branson 1951, *PNAS* 37, 205–211
  (alpha-helix); Pauling & Corey 1951 series, *PNAS* 37 (alpha-helix and
  beta-sheet)
- *strong* — Kendrew et al. 1958, *Nature* 181, 662–666 (myoglobin
  structure)
- *strong* — Anfinsen 1973, *Science* 181, 223–230 (thermodynamic
  hypothesis of protein folding)

### Photobiology

- *strong* — Emerson & Arnold 1932, *J. Gen. Physiol.* 16, 191–205
  (photosynthetic unit)
- *strong* — Calvin and collaborators 1950s primary papers on the
  carbon-fixation cycle (edition-of-record TBD pass-2)
- *strong* — Wald 1933, *Nature* 132, 316–317 (vitamin A in retina;
  rhodopsin lineage origin)
- *borderline* — Stark-Einstein photoequivalence (cross-link to
  03-chemistry/photochemistry/, where it lives as primary)

### Radiation biology

- *strong* — Roentgen 1895 (cross-link to `02-physics/`)
- *strong* — Hevesy 1923 *Biochem. J.* 17 (radioactive-tracer method;
  Nobel 1943)
- *borderline* — Dadachova et al. 2007, *PLoS ONE* 2, e457 (radiosynthesis
  in melanized fungi; modern primary, retain from existing
  `radiosynthesis/`)

### Melanin (narrowed)

- *strong* — Raper 1928, *Physiol. Rev.* 8, 245–282 (melanin biosynthesis)
- *strong* — Mason 1959 (tyrosinase mechanism, primary biochemistry)
- *strong* — McGinness, Corry & Proctor 1974, *Science* 183, 853–855
  (amorphous semiconductor switching in melanins)

## Landscape (not canon, indexed for transparency)

- Becker 1985 *The Body Electric*; Becker 1990 *Cross Currents* — popular
  exposition; primary papers cited in `bioelectricity/`
- Lane 2005 *Power, Sex, Suicide* — popular synthesis on mitochondrial
  evolution
- Lehninger / Alberts / Berg-Tymoczko-Stryer / Stryer textbooks —
  edition-of-record only when cited as discipline-standard pedagogy

## Sources (curated corpora, not canon)

- `_sources/kruse-index.md` — Jack Kruse blog corpus (460 articles,
  `~/jackkruse/`); curator tier, never originator
- `_sources/pubmed.md` — PubMed retrieval pointer
- `_sources/pubchem.md` — PubChem retrieval pointer (cross-link to
  `03-chemistry/reference/`)

_last updated: 2026-05-01 by biophysics rebalance pass-1_
