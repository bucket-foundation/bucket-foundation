# Biophysics canon — deep dive (pass-2) — 2026-05-01

Pass-1 (`biophysics-rebalance-pass-1-2026-05-01.md`) did the rebalance: it
named the Kruse-shaped silhouette honestly, proposed a mechanism-named tree,
and wrote the Kruse positioning rule. Pass-1 deliberately stopped short of
making any moves, because eight contestable items were still open.

Pass-2 (this file) closes those eight items, audits every existing on-disk
entry against the originator-tier promotion rule, walks each proposed
sub-folder down to the journal-volume-and-page level, audits cross-branch
coherence with the chemistry pass-3 synthesis and the physics pass-1 sweep,
and converts the rebalance into a frozen folder tree plus a Phase A/B/C/D
work queue. Nothing is promoted; pass-3 promotes.

Author: data pillar (research sweep). Status: intake — not canon.

---

## 1. Per-existing-sub-folder audit

Pass-1 inventoried the six existing sub-folders and gave honest tier
assessments. Pass-2 reads every file in those sub-folders, classifies each
entry — canon / landscape / Kruse-curation / intake / promotional — and
issues a binding migration verdict.

### 1.1 `becker/`

Files: `biography.md`, `books.md`, `lineage.md`, `papers.bib` (56 PubMed
entries), `site-mirror/2026-04-23/` (262 files, 419 MB, robertobecker.net),
`CANON_INDEX.md`.

Per-file classification:

| File | Classification | Notes |
|---|---|---|
| `biography.md` | biographical-dossier | A sourced career summary of one 20th-century researcher. Not a primary statement of mechanism. |
| `books.md` | landscape | Three books (Becker 1982, 1985, 1990) listed with WorldCat links. Becker 1985 *The Body Electric* is the only one that achieved popular reach; it is a popular-science book, not an originator paper. |
| `lineage.md` | landscape / context | Useful map of who-influenced-whom. Names Lund, Burr, Szent-Györgyi, Fröhlich as precursors; Marino, Spadaro, Reichmanis as direct collaborators; Oschman, Ho, Liboff, Goodman, Blank, Blackman, Smith, Pollack, Levin as second-generation. The lineage map is a useful navigation aid; it is not canon. |
| `papers.bib` | biography-tier bibliography | 56 papers, mostly orthopedics-journal coauthorships. Useful as Becker's complete bibliography; not, individually, primary statements of foundation mechanism. |
| `site-mirror/2026-04-23/` | provenance / archival | A 419-MB `wget --mirror` of robertobecker.net. Provenance, not foundation. |
| `CANON_INDEX.md` | sub-folder manifest | Honestly admits this folder is a person-named dossier, not a mechanism dossier. |

Migration verdict (binding for pass-3): **demote wholesale.**

- `biography.md`, `books.md`, `lineage.md` → consolidated into a single file
  `_landscape/becker-program.md` (one file under three sections), citing
  Becker 1985 / 1990 / 1982 as landscape texts. Drop the standalone folder.
- `papers.bib` → `bioelectricity/_bibliography/becker-papers.bib`. The
  bibliography is retained as a Becker-specific reference list sitting
  alongside (not inside) the canon entries for Galvani, Bernstein, Hodgkin
  & Huxley.
- `site-mirror/2026-04-23/` → stays on disk where it is; a pointer file
  `_sources/becker-archive.md` records the path, the capture date, the
  capture command, and the robots.txt-compliance note. The 419 MB mirror is
  not deleted.
- `CANON_INDEX.md` → deleted on the merge (the dossier no longer exists as a
  sub-folder).

This reverses pass-1's "fold into bioelectricity" formulation slightly:
pass-1 said "demote `becker/`'s primary papers cross-ref into
`bioelectricity/`". Pass-2 ratifies the demotion and goes further — there
are no Becker primary papers to cross-ref. The 56-paper bibliography is a
biography artifact, not a canon-eligible primary set. Becker was a
popularizer of bioelectricity (a load-bearing curator at the curator tier,
in the language of pass-1 §4); the originator papers Becker built on
(Galvani 1791, du Bois-Reymond 1848, Bernstein 1902, Hodgkin & Huxley 1952)
go into `bioelectricity/` directly, not via Becker.

### 1.2 `bioelectric-lineage/`

Files: `ARC.md` (15-node lineage from Galvani forward), `cross-refs.md`,
`primary-papers.md`, `primary-papers.bib`, `primary-papers.yaml`,
`queries.txt`, `CANON_INDEX.md`.

Per-file classification:

| File | Classification | Notes |
|---|---|---|
| `ARC.md` | lineage map / context | Real lineage treatment from Galvani forward. Useful as a sub-folder README in the new tree; not canon itself. |
| `cross-refs.md` | cross-link table | Useful; folds into the branch-level `CROSS_LINKS.md` under preparation. |
| `primary-papers.md` | annotated bibliography | Cites Galvani 1791, Volta 1800, Matteucci 1840, du Bois-Reymond 1848, Bernstein 1902, Hodgkin & Huxley 1952, Burr 1935/1941/1972, Lund 1947, Szent-Györgyi 1941/1960/1968, Fröhlich 1968, Nordenström 1983/1989 (flagged contested), Cone 1971, Pai et al. 2012, Levin 2014, Pezzulo & Levin 2016, Mathews & Levin 2018, McCaig et al. 2005, Nuccitelli 2003. The originator papers (Galvani, Bernstein, Hodgkin & Huxley) are real canon. Burr/Szent-Györgyi/Fröhlich are precursor / borderline. Nordenström is contested. Levin's reviews are borderline. |
| `primary-papers.bib` | BibTeX | Same set in BibTeX form; ready to absorb. |
| `primary-papers.yaml` | structured metadata | 25.7 KB; ready to absorb. |
| `queries.txt` | retrieval recipe | Goes to `_sources/` if useful, otherwise deleted. |
| `CANON_INDEX.md` | sub-folder manifest | Honest. |

Migration verdict: **rename and keep.** This is the strongest of the six
existing sub-folders.

- `bioelectric-lineage/` → `bioelectricity/` (mechanism-named).
- `ARC.md` → `bioelectricity/README.md` (the lineage IS a useful README for
  the sub-folder).
- `primary-papers.md` / `.bib` / `.yaml` → split per-paper into
  `bioelectricity/<year>-<author>-<short>.md` files in pass-3, one per
  originator entry. Retain the consolidated YAML at
  `bioelectricity/_bibliography/primary-papers.yaml` for downstream tooling.
- Nordenström 1983 / 1989 → `_landscape/contested.md` (flagged). The
  oncology-application claims have not achieved independent replication in
  the mainstream-oncology peer-reviewed literature.
- Burr 1935 / 1941 / 1972, Lund 1947, Szent-Györgyi 1941 / 1960 / 1968,
  Fröhlich 1968 → `bioelectricity/precursors/` (borderline tier; pass-3
  adjudicates per paper). Honest read: Szent-Györgyi is an originator at
  the chemistry tier (Vitamin C Nobel 1937, his actual canon-tier work);
  his bioelectronics speculation in the 1960s is precursor-tier for the
  modern molecular-bioelectricity programme but is not itself originator
  canon. Same for Fröhlich's "long-range coherence" 1968 paper.
- Levin 2014, Pezzulo & Levin 2016, Mathews & Levin 2018 → all reviews;
  pass-1 flagged "borderline". Pass-2 ruling: **promote Levin 2014** as a
  field-defining review under condition 2 (recognized academic
  edition-of-record for the modern molecular-bioelectricity research
  programme), and treat Pezzulo & Levin 2016 and Mathews & Levin 2018 as
  landscape (one review per programme is enough). Cross-link to 07-mind.

### 1.3 `melanin/`

Files: `SEED.md`, `lineage.md`, `primary-papers.md` (seven sub-themes, 21
entries), `primary-papers.bib`, `primary-papers.yaml`, `queries.txt`,
`CANON_INDEX.md`.

Per-entry classification of `primary-papers.md`:

| Sub-theme | Entry | Classification |
|---|---|---|
| 1. Semiconductor/electronic | McGinness, Corry, Proctor 1974 *Science* 183 | **canon** (originator) |
| 1. Semiconductor/electronic | Meredith & Sarna 2006 *Pigment Cell Res.* 19 | landscape (review, edition-of-record) |
| 1. Semiconductor/electronic | Mostert et al. 2012 *PNAS* 109 | borderline canon (resolves ionic-vs-electronic question) |
| 1. Semiconductor/electronic | d'Ischia et al. 2013 *Pigment Cell Melanoma Res.* 26 | landscape (community standard) |
| 1. Semiconductor/electronic | Bothma et al. 2008 *Adv. Mater.* 20 | landscape (engineering proof) |
| 2. Radical/redox | Sarna & Swartz 1993 (book chapter) | landscape |
| 2. Radical/redox | Liu & Simon 2003 *Pigment Cell Res.* 16 | landscape |
| 2. Radical/redox | Ito & Wakamatsu 2003 *Pigment Cell Res.* 16 | landscape (community-standard analytical method) |
| 2. Radical/redox | Kaxiras et al. 2006 *PRL* 97 | borderline canon (DFT structural model — the first ab initio anchor) |
| 3. Neuromelanin | Zecca 2004, Fedorow 2005, Zucca 2017 | landscape (reviews, neuromelanin–iron–dopamine review series) |
| 4. Photoprotection | Kollias & Baqer 1987 *Photochem. Photobiol.* 46 | landscape |
| 4. Photoprotection | Meredith & Riesz 2004 *Photochem. Photobiol.* 79 | borderline canon (Φ ~10⁻⁴ — the mechanistic basis) |
| 5. Radiosynthesis | Dadachova 2007, Turick 2011, Cordero & Casadevall 2017 | borderline / landscape — moves to `radiation-biology/` |
| 6. Solís-Herrera | Solís-Herrera et al. 2010+ | **contested** — `_landscape/contested.md` |
| 7. Historical | Raper 1928 *Biochem. J.* 22 | **canon** (foundation) |
| 7. Historical | Mason 1948 *J. Biol. Chem.* 172 | **canon** (foundation; pass-1 cited "Mason 1959" speculatively — the actual primary is Mason 1948) |
| 7. Historical | Prota 1988/1992 (book) | landscape |

Migration verdict: **keep, narrow.** Pass-1 was right.

- `melanin/` retains. Canon: Raper 1928, Mason 1948, McGinness-Corry-Proctor
  1974 — three strong primaries. Promote borderline: Mostert 2012 (resolves
  the McGinness claim), Kaxiras 2006 (ab initio structural anchor), and
  Meredith & Riesz 2004 (Φ ~10⁻⁴ photoprotection mechanism), pending
  pass-3 review.
- Solís-Herrera entry → `_landscape/contested.md`.
- Radiosynthesis entries → fold into `radiation-biology/`.
- Reviews (Meredith-Sarna 2006, d'Ischia 2013, Zecca/Fedorow/Zucca,
  Kollias-Baqer 1987, Sarna-Swartz 1993, Ito-Wakamatsu 2003, Liu-Simon
  2003, Bothma 2008) → `_landscape/melanin-reviews.md` (one consolidated
  file).
- Mason 1948 *J. Biol. Chem.* 172, 83–99 is the actual primary — pass-1
  speculated "Mason 1959 — verify exact 1959 reference"; the on-disk
  bibliography names Mason 1948. Pass-2 ratifies Mason 1948 as the
  citation of record. Close pass-1 §5(6).

### 1.4 `mitochondria/`

Files: `SEED.md`, `lineage.md`, `primary-papers.md` (10 sub-themes, 36
entries), `primary-papers.bib`, `primary-papers.yaml`, `queries.txt`,
`CANON_INDEX.md`.

Per-sub-theme classification of `primary-papers.md`:

| Sub-theme | Entries | Classification |
|---|---|---|
| 1. Endosymbiosis/evolution (5) | Margulis 1970, Gray-Burger-Lang 1999, Martin-Müller 1998, Lane-Martin 2010, Roger 2017 | canon: Margulis 1970 (originator monograph). Borderline: Martin-Müller 1998 (modern reframe), Lane-Martin 2010 (high-leverage). Landscape: Gray 1999 review, Roger 2017 review. |
| 2. Chemiosmosis/bioenergetics (5) | Mitchell 1961, Mitchell 1966, Boyer 1993, Abrahams-Leslie-Lutter-Walker 1994, Nicholls-Ferguson 2013 | canon: Mitchell 1961, Mitchell 1966, Boyer 1993, Abrahams-Walker 1994 — all originator-tier. Landscape: Nicholls-Ferguson textbook. |
| 3. mtDNA, disease, human origins (5+1) | Cann-Stoneking-Wilson 1987, Wallace 1999/2005/2010, Ingman 2000, MITOMAP 2013 | borderline: Cann 1987 (Mitochondrial Eve), Wallace 2005 (paradigm), Ingman 2000 (full sequence). The Wallace papers are field-defining reviews; one is plausibly canon (probably 2005). |
| 4. COX enzymology (4) | Wikström 1977, Tsukihara 1996, Yoshikawa 1998, Belevich 2006 | canon: Wikström 1977 (proton-pump originator). Borderline: the structural papers. |
| 5. Mito signaling/ROS (4) | Liu-Butow 2006, Murphy 2009, Sena-Chandel 2012, Chandel 2014 | landscape (all reviews). |
| 6. Biogenesis/PGC-1α (2) | Wu 1999, Scarpulla 2011 | borderline: Wu 1999 (PGC-1α discovery). Landscape: Scarpulla. |
| 7. Dynamics fission/fusion (2) | Chan 2006, Youle-van der Bliek 2012 | landscape (reviews). |
| 8. ELF/bioelectric coupling (2) | Blank-Goodman 2009, Pall 2013 | **contested** (already flagged). |
| 9. Deuterium/isotope (2) | Somlyai 1993, Pomytkin 2006 | **contested** (already flagged). |
| 10. Nick Lane synthesis (5) | Lane 2002, 2005, 2015 (books), Lane-Martin 2010, Lane 2011 | landscape (the books); canon-overlap (Lane-Martin 2010 = sub-theme 1); borderline (Lane 2011 *Biology Direct* / *BioEssays* energetics paper). |

Migration verdict: **fold into `bioenergetics/` and demote the contested
sub-themes.**

- `mitochondria/` is dissolved as a sub-folder. The endosymbiosis,
  chemiosmosis, COX, biogenesis, and dynamics entries fold into
  `bioenergetics/` (with the COX structural papers as a `bioenergetics/cox/`
  cluster if pass-3 wants the granularity).
- Pass-1 leaned "fold". Pass-2 ratifies. Reasoning: pass-1's split was
  motivated by the fact that "mitochondria" is an organelle, not a
  mechanism. The mechanism is bioenergetics. The organelle-named cluster
  retained value because the existing on-disk material is dense enough to
  function as a sub-folder; but the *contents* are bioenergetics canon, and
  the chemistry-branch convention is mechanism-named.
- ELF (sub-theme 8) and deuterium (sub-theme 9) → `_sources/kruse-index.md`
  with the binding rule: where Kruse flags an underdeveloped foundational
  claim, the originator paper is what enters canon. Bucket's pass-3 task
  is to find the actual deuterium-isotope-effect primary literature
  (Urey 1932 *PNAS* 18, 496 on deuterium discovery is the founding paper;
  Kresge & Allred 1963 / Klinman 1972 are originator-tier kinetic-isotope-
  effect papers in enzymology) and file *those* in canon, not the
  Somlyai / Pomytkin clinical-extrapolation papers. The Somlyai and
  Pomytkin entries themselves stay in `_landscape/contested.md`.
- Nick Lane (sub-theme 10) — pass-1 treated Lane 2005 *Power, Sex, Suicide*
  as landscape. Pass-2 ratifies and closes pass-1 §5(4). Lane is a
  popularizer of mitochondrial biology working at the originator tier in
  some of his peer-reviewed papers (Lane-Martin 2010 → canon as already
  noted; Lane 2011 → borderline). His books → `_landscape/textbooks.md`.

### 1.5 `peptides/`

Files: `SEED.md`, `lineage.md`, `primary-papers.md` (13 compound families /
sub-themes), `primary-papers.bib`, `primary-papers.yaml`, `queries.txt`,
`CANON_INDEX.md`.

Per-sub-theme classification of `primary-papers.md`:

| Sub-theme | Verdict |
|---|---|
| 1. Khavinson bioregulators (epitalon, cortexin) | landscape; Russian-institute provenance flagged. Not biophysics canon. |
| 2. BPC-157 | landscape; single-lab-dominance flagged. Not canon. |
| 3. MOTS-c | borderline. Lee et al. 2015 *Cell Metab.* 21 is the discovery paper for a mitochondrial-derived peptide encoded within 12S rRNA. Promotion eligibility under condition 1 — *if and only if* the framing is "bioenergetics: peptide products of mitochondrial DNA" rather than "longevity peptides". Pass-2 ruling: cross-link from `bioenergetics/` as a borderline entry, do not promote a `peptides/` folder around it. |
| 4. GHK-Cu | landscape. |
| 5. SS-31 / elamipretide | borderline. Zhao-Schiller-Szeto 2004 *J. Biol. Chem.* 279 introduces the SS-peptide family; Birk et al. 2013 *J. Am. Soc. Nephrol.* 24 establishes cardiolipin binding as the mechanism. The cardiolipin / cristae-architecture mechanism is biophysics — but the originator framing is pharmacology (the peptides were designed). Pass-2 ruling: cross-link from `bioenergetics/cardiolipin/` if a cluster opens; do not promote in canon. |
| 6. Thymosin-β4 / TB-500 | landscape. |
| 7. Semax / Selank | landscape; Russian-institute provenance flagged. |
| 8. GHRPs / ghrelin axis | borderline. Kojima et al. 1999 *Nature* 402, 656 (ghrelin discovery) is canon-eligible **endocrinology**. It is not biophysics canon. → cross-link to a future endocrinology branch, not promoted here. |
| 9. CJC-1295 / ipamorelin / tesamorelin | pharmacology, not canon. |
| 10. Cerebrolysin | not canon. |
| 11. Melanotan-II / α-MSH | not canon. |
| 12. Dihexa / tesofensine / pinealon | contested / single-group; not canon. |
| 13. Regulatory primaries (FDA, USP, EMA) | regulatory, not canon. |

Migration verdict: **demote wholesale to `_landscape/peptide-pharmacology.md`.**

Pass-1 leaned full demotion and recommended a clean new
`peptides-and-proteins/` folder containing only Sanger 1955, Merrifield
1963, and Du Vigneaud 1953. Pass-1 §5(8) asked pass-2 to consider whether
the existing compound-family material had biophysics-canon entries hidden
inside (specifically SS-31 / cardiolipin and MOTS-c).

Pass-2 ruling: **full demotion of the existing `peptides/` folder contents
to `_landscape/peptide-pharmacology.md`**, with two carve-outs:

- MOTS-c (Lee et al. 2015) → cross-listed from `bioenergetics/` as a
  borderline entry, conditional on framing as "bioenergetics: mitochondrial
  rRNA-encoded peptides", not as "longevity peptides".
- SS-31 / cardiolipin (Birk et al. 2013) → cross-listed from
  `bioenergetics/` as a borderline mechanism entry on cardiolipin and
  cristae stability, conditional on framing as "bioenergetics:
  cardiolipin-cristae mechanics", not as "anti-aging peptides".

The new `peptides-and-proteins/` folder opens **only** with the originator-
tier sequence-and-synthesis canon: Sanger 1955 (insulin sequence),
Merrifield 1963 (solid-phase peptide synthesis), Du Vigneaud et al. 1953
(oxytocin synthesis). See §2.9 for the binding citations.

### 1.6 `radiosynthesis/`

Files: `SEED.md` only.

`SEED.md` cites Holland 2006, Bekker 2004, Lyons 2014, Farquhar 2000, Crowe
2013 (Great Oxygenation Event); Hohmann-Marriott & Blankenship 2011,
Blankenship 2010, Buick 2008 (photosynthesis origin); Dadachova 2007 (core
radiosynthesis); Dadachova-Casadevall 2008, Zhdanova 2004, Turick 2011,
Cordero-Casadevall 2017; McGinness-Corry-Proctor 1974 (cross-ref);
Solís-Herrera (flagged for quality concerns); Bazilevskaya 2008, Shaviv
2002 (cosmic-ray cross-ref to cosmology).

Per-cluster classification:

| Cluster | Verdict |
|---|---|
| Great Oxygenation Event | borderline; this is **deep-history** and **cosmology** rather than pure biophysics. Holland 2006, Lyons 2014 are originator-tier reviews. → cross-link to `06-cosmology/` and to a `08-deep-history/` branch when it opens. |
| Photosynthesis origin | borderline; reviews. Move primary photosynthesis canon to `photobiology/` (Emerson-Arnold 1932, Calvin series, Wald 1933) — see §2.7. |
| Radiosynthesis core | Dadachova 2007 *PLoS ONE* 2, e457 → canon (modern primary, narrow but real). Zhdanova 2004 *Mycologia* 96 → borderline. |
| Cosmic-ray cross-ref | not biophysics canon; → `06-cosmology/`. |
| Solís-Herrera | contested; → `_landscape/contested.md`. |

Migration verdict: **fold into `radiation-biology/`.** Pass-1 was right.

- `radiosynthesis/SEED.md` → `radiation-biology/_seed/radiosynthesis.md`
  (preserved as one sub-thread, not as the whole sub-folder).
- `radiation-biology/` opens with Roentgen 1895 (cross-link to physics),
  Hevesy 1923 (radioactive-tracer method), Lea 1946 *Actions of Radiations
  on Living Cells* (the founding monograph of radiobiology — see §2.8),
  and Dadachova 2007 (modern primary for radiosynthesis).

### 1.7 Branch-level summary

The verdict count:

| Sub-folder | Verdict |
|---|---|
| `becker/` | demote wholesale; consolidate to `_landscape/becker-program.md` + `_sources/becker-archive.md` + `bioelectricity/_bibliography/becker-papers.bib` |
| `bioelectric-lineage/` | rename to `bioelectricity/`; keep ARC.md as README; promote per-paper canon |
| `melanin/` | keep; narrow to Raper 1928, Mason 1948, McGinness 1974 + borderline (Mostert 2012, Kaxiras 2006, Meredith-Riesz 2004) |
| `mitochondria/` | dissolve; fold into `bioenergetics/`; ELF and deuterium → `_sources/kruse-index.md` and `_landscape/contested.md` |
| `peptides/` | demote wholesale to `_landscape/peptide-pharmacology.md`; new `peptides-and-proteins/` opens only with Sanger 1955, Merrifield 1963, Du Vigneaud 1953; MOTS-c and SS-31 cross-listed from `bioenergetics/` |
| `radiosynthesis/` | dissolve; fold into `radiation-biology/`; Hevesy 1923 + Lea 1946 added as foundation |

This is a six-folder dissolution-or-rename pass. Two of the six survive in
recognizable form (`bioelectricity/` is `bioelectric-lineage/` renamed;
`melanin/` survives narrowed). Four of the six are dissolved or renamed.
The replacement tree (§7) has nine mechanism-named sub-folders.

---

## 2. Sub-domain deep dive — full foundations spine

For each proposed sub-folder, the originator-tier entries with edition-of-
record at the journal-volume-and-page level. Pass-1 listed roughly 32
strong-or-borderline entries; pass-2 expands the list, fixes several
citations pass-1 left as TBD, and adds entries pass-1 missed (§5 below).

### 2.1 `membrane-biophysics/`

The squid-axon programme is the founding mathematical statement of nerve
excitation. The pass-1 list cited "five papers, *J. Physiol.* 116–117".
The actual five-paper sequence is:

- **Hodgkin & Huxley 1952a** — *J. Physiol.* 116(4), 449–472, "Currents
  carried by sodium and potassium ions through the membrane of the giant
  axon of *Loligo*". (Pass-1 listed page-range 424–448 for paper 1; the
  correct first paper begins at 449 in volume 116.)
- **Hodgkin & Huxley 1952b** — *J. Physiol.* 116(4), 473–496, "The
  components of membrane conductance in the giant axon of *Loligo*".
- **Hodgkin & Huxley 1952c** — *J. Physiol.* 116(4), 497–506, "The dual
  effect of membrane potential on sodium conductance in the giant axon of
  *Loligo*".
- **Hodgkin, Huxley & Katz 1952** — *J. Physiol.* 116(4), 424–448,
  "Measurement of current-voltage relations in the membrane of the giant
  axon of *Loligo*". (This is the methodological paper that pass-1 confused
  with the first conductance paper. The series is *four* HH papers plus
  *one* HHK paper — not five HH papers.)
- **Hodgkin & Huxley 1952d** — *J. Physiol.* 117(4), 500–544, "A
  quantitative description of membrane current and its application to
  conduction and excitation in nerve". The capstone, with the integrated
  HH equations.

Joint Nobel 1963 with Eccles. Strong, all five.

Other entries:

- **Goldman 1943** — *J. Gen. Physiol.* 27(1), 37–60, "Potential, impedance,
  and rectification in membranes". The Goldman half of the
  Goldman-Hodgkin-Katz equation. Strong.
- **Hodgkin & Katz 1949** — *J. Physiol.* 108(1), 37–77, "The effect of
  sodium ions on the electrical activity of the giant axon of the squid".
  The other half of GHK. Strong (paired with Goldman).
- **Singer & Nicolson 1972** — *Science* 175(4023), 720–731, "The fluid
  mosaic model of the structure of cell membranes". Strong. The standard
  membrane-architecture model.
- **Mitchell 1961** — *Nature* 191(4784), 144–148. Cross-link from
  `bioenergetics/`; do not duplicate.
- **Neher & Sakmann 1976** — *Nature* 260(5554), 799–802, "Single-channel
  currents recorded from membrane of denervated frog muscle fibres". The
  patch-clamp originator paper. Joint Nobel 1991. Strong. Pass-1 listed
  this as a candidate; pass-2 confirms — patch-clamp is the experimental
  method that turned the HH equations into single-channel kinetics, and
  the 1976 paper is the originator. Add to canon.

Total `membrane-biophysics/`: 5 HH + 2 GHK + 1 Singer-Nicolson + 1 Neher-
Sakmann = 9 strong, plus 1 cross-link to `bioenergetics/`.

### 2.2 `bioenergetics/`

This is where pass-1's "fold `mitochondria/` into here" lands. The
originator spine:

- **Lipmann 1941** — *Adv. Enzymol.* 1, 99–162, "Metabolic generation and
  utilization of phosphate bond energy". The high-energy-phosphate concept.
  Joint Nobel 1953 with Krebs.
- **Krebs & Johnson 1937** — *Enzymologia* 4, 148–156, "The role of citric
  acid in intermediate metabolism in animal tissues". The TCA cycle. Joint
  Nobel 1953 with Lipmann.
- **Lehninger & Kennedy 1948** — *J. Biol. Chem.* 172(2), 847–871,
  "Oxidative phosphorylation in mitochondria; a study of the requirements
  for fatty acid oxidation". Localizes oxidative phosphorylation to
  mitochondria.
- **Mitchell 1961** — *Nature* 191(4784), 144–148, "Coupling of
  phosphorylation to electron and hydrogen transfer by a chemi-osmotic type
  of mechanism". Sole Nobel 1978.
- **Mitchell 1966** — *Biol. Rev.* 41(3), 445–502, "Chemiosmotic coupling in
  oxidative and photosynthetic phosphorylation". The book-length 1966
  Glynn Research booklet (*Chemiosmotic Coupling in Oxidative and
  Photosynthetic Phosphorylation*, Glynn Research, Bodmin, 1966) is the
  parallel originator-monograph of record; pass-3 picks one (the *Biol.
  Rev.* paper is the more accessible canonical citation).
- **Boyer 1993** — *Biochim. Biophys. Acta* 1140(3), 215–250, "The binding
  change mechanism for ATP synthase — some probabilities and possibilities"
  (originator framework before the structural confirmation). Joint Nobel
  1997 with Walker. The Boyer 1997 Nobel Lecture (*Annu. Rev. Biochem.* 66,
  717–749, "The ATP synthase — a splendid molecular machine") is the
  edition-of-record canonical exposition.
- **Abrahams, Leslie, Lutter & Walker 1994** — *Nature* 370(6491), 621–628,
  "Structure at 2.8 Å resolution of F₁-ATPase from bovine heart
  mitochondria". The crystallographic confirmation of rotational catalysis.
  Walker Nobel 1997. The Walker 1997 Nobel Lecture (*Angew. Chem. Int. Ed.*
  37(17), 2308–2319, "ATP synthesis by rotary catalysis", published 1998)
  is the edition-of-record canonical exposition.
- **Margulis 1970** *Origin of Eukaryotic Cells* (Yale UP) — endosymbiosis
  originator monograph. Borderline (book, not paper), but the chemistry-
  branch precedent (Pauling 1960 *Nature of the Chemical Bond*, Lewis 1923
  *Valence*) supports promotion of an originator monograph. **Pass-2
  ruling: promote.** Cross-link to a future deep-history / evolution branch.
- **Martin & Müller 1998** — *Nature* 392(6671), 37–41, "The hydrogen
  hypothesis for the first eukaryote". Borderline (modern reframe), but a
  strong candidate for canon as the metabolic-symbiosis-origin alternative.
- **Lane & Martin 2010** — *Nature* 467(7318), 929–934, "The energetics of
  genome complexity". Borderline; pass-2 ruling: promote, on the strength
  of its thermodynamic argument linking distributed bioenergetic membranes
  to eukaryotic complexity.
- **Wikström 1977** — *Nature* 266(5599), 271–273, "Proton pump coupled to
  cytochrome c oxidase in mitochondria". COX as proton pump. Strong.
- **Cann, Stoneking & Wilson 1987** — *Nature* 325(6099), 31–36,
  "Mitochondrial DNA and human evolution". Mitochondrial Eve. Strong, but
  pass-2 ruling: this is **anthropology / population genetics**, not
  biophysics canon. → cross-link to a future branch; remove from
  `bioenergetics/` priority list.
- **Wallace 2005** — *Annu. Rev. Genet.* 39, 359–407, "A mitochondrial
  paradigm of metabolic and degenerative diseases, aging, and cancer".
  Borderline (review, but field-defining). Pass-2 ruling: cross-link to
  `sub-outcomes/longevity/`, not promote in `bioenergetics/`.

Total `bioenergetics/`: 2 (Lipmann, Krebs) + 1 (Lehninger-Kennedy) +
2 (Mitchell 1961, 1966) + 2 (Boyer, Walker) + 3 (Margulis, Martin-Müller,
Lane-Martin) + 1 (Wikström) = ~11 canon entries.

Optional `bioenergetics/cox/` cluster for the structural-COX papers
(Tsukihara 1996 *Science* 272, 1136; Yoshikawa 1998 *Science* 280, 1723;
Belevich 2006 *Nature* 440, 829) — pass-3 decides on the cluster; pass-2
leans no, treat as borderline-tier within `bioenergetics/`.

### 2.3 `bioelectricity/`

Post-rename of `bioelectric-lineage/`. The originator chain:

- **Galvani 1791** — *De Viribus Electricitatis in Motu Musculari
  Commentarius*, *De Bononiensi Scientiarum et Artium Instituto atque
  Academia Commentarii* 7, 363–418. Bologna, Ex Typographia Instituti
  Scientiarum. Public domain. Robert M. Green's 1953 English translation
  (Cambridge MA: Licht) is the standard reference. Strong.
- **Volta 1800** — *Phil. Trans. R. Soc.* 90, 403–431, "On the electricity
  excited by the mere contact of conducting substances of different
  kinds". Borderline biophysics — Volta's reading is *against* animal
  electricity; the paper is canon for `02-physics/electromagnetism/` (the
  battery), not for biophysics. Pass-2 ruling: cross-link from physics, do
  not duplicate in biophysics.
- **Matteucci 1840** — *Essai sur les phénomènes électriques des animaux*,
  Carilian-Gœury et V. Dalmont, Paris. Strong (frog-current originator,
  bridge between Galvani and du Bois-Reymond).
- **du Bois-Reymond 1848–1884** — *Untersuchungen über thierische
  Elektricität*, 2 vols, Georg Reimer, Berlin. The originator monograph of
  experimental electrophysiology. Strong.
- **Bernstein 1902** — *Pflügers Arch.* 92(10–12), 521–562, "Untersuchungen
  zur Thermodynamik der bioelektrischen Ströme. Erster Teil". Membrane
  theory of bioelectricity. Strong.
- **Hodgkin & Huxley 1952** — cross-link from `membrane-biophysics/`.
- **Levin 2014** — *Mol. Biol. Cell* 25(24), 3835–3850, "Molecular
  bioelectricity: how endogenous voltage potentials control cell behavior
  and instruct pattern regulation in vivo". Borderline → pass-2 ruling:
  promote as the modern molecular-bioelectricity edition-of-record.
- **Pai et al. 2012** — *Development* 139(2), 313–323, "Transmembrane
  voltage potential controls embryonic eye patterning in *Xenopus
  laevis*". Borderline → pass-2 ruling: promote as the originator-tier
  experimental result that anchors the Levin programme.

Precursor cluster (`bioelectricity/precursors/`): Burr 1935 (*Quart. Rev.
Biol.* 10), Lund 1947 (*Bioelectric Fields and Growth*), Szent-Györgyi 1941
(*Science* 93, 609 — "Towards a New Biochemistry?"), Fröhlich 1968 (*Int.
J. Quantum Chem.* 2, 641 — "Long-Range Coherence and Energy Storage in
Biological Systems"). Pass-3 adjudicates per paper.

Total `bioelectricity/`: ~5 strong canon + 2 borderline-promote + 4
precursors.

### 2.4 `allosteric-regulation/`

- **Monod, Wyman & Changeux 1965** — *J. Mol. Biol.* 12(1), 88–118, "On the
  nature of allosteric transitions: a plausible model". The MWC concerted
  model. Strong.
- **Koshland, Némethy & Filmer 1966** — *Biochemistry* 5(1), 365–385,
  "Comparison of experimental binding data and theoretical models in
  proteins containing subunits". The KNF sequential model. Strong.

Cross-link to `03-chemistry/thermodynamics/` (allosteric transitions are
also a thermodynamic-cooperativity result; chemistry pass-3 §5.3 placed
them on the biophysics side per the originator-framing rule). Confirmed
by pass-2.

Total: 2 strong canon.

### 2.5 `enzyme-kinetics/`

- **Michaelis & Menten 1913** — *Biochem. Z.* 49, 333–369, "Die Kinetik der
  Invertinwirkung". The founding equation. Strong. (Note: an earlier
  Henri 1903 thesis derivation exists; the discipline-standard citation is
  Michaelis-Menten 1913, which is what the chemistry pass-3 §5.3 ratifies.)
- **Briggs & Haldane 1925** — *Biochem. J.* 19(2), 338–339, "A note on the
  kinetics of enzyme action". Steady-state derivation. Strong; cross-link
  to `03-chemistry/kinetics/` per chemistry pass-3 §5.3.
- **Wyman 1948** — *Adv. Protein Chem.* 4, 407–531, "Heme proteins". The
  cooperativity and Hill-coefficient framework. Pass-1 flagged "verify";
  the Wyman 1948 review is the discipline citation, but the actual
  Hill-equation originator is Hill 1910 (*J. Physiol.* 40 (Suppl.), iv–vii,
  "The possible effects of the aggregation of the molecules of haemoglobin
  on its dissociation curves"). Pass-2 ruling: **promote Hill 1910** as
  the Hill-coefficient originator; promote Wyman 1948 as the borderline
  framework synthesis.

Total: 2 strong + 1 strong + 1 borderline = 4 entries.

### 2.6 `structural-biology/`

The `02-physics/` pass-1 sweep does not claim any of these — they are
solidly biophysics canon under originator framing.

- **Pauling, Corey & Branson 1951** — *PNAS* 37(4), 205–211, "The structure
  of proteins: two hydrogen-bonded helical configurations of the
  polypeptide chain". The α-helix paper. Strong.
- **Pauling & Corey 1951a** — *PNAS* 37(5), 251–256, "Configurations of
  polypeptide chains with favored orientations around single bonds: two
  new pleated sheets". The β-sheet paper. Strong.
- **Pauling & Corey 1951b** — *PNAS* 37(5), 235–240, "The pleated sheet, a
  new layer configuration of polypeptide chains". The third *PNAS* 37
  paper of the bundle. Strong.
- **Watson & Crick 1953** — *Nature* 171(4356), 737–738, "Molecular
  structure of nucleic acids: a structure for deoxyribose nucleic acid".
  Strong. Joint Nobel 1962 with Wilkins.
- **Franklin & Gosling 1953** — *Nature* 171(4356), 740–741, "Molecular
  configuration in sodium thymonucleate". Borderline canon — the X-ray
  evidence Watson and Crick built on. The historical record now ratifies
  Franklin's contribution; pass-2 ruling: promote, paired with Watson-
  Crick.
- **Wilkins, Stokes & Wilson 1953** — *Nature* 171(4356), 738–740,
  "Molecular structure of deoxypentose nucleic acids". Borderline; same
  *Nature* 171 issue. Pass-2 ruling: promote (paired with Watson-Crick
  and Franklin-Gosling — three papers in one issue).
- **Kendrew et al. 1958** — *Nature* 181(4610), 662–666, "A three-
  dimensional model of the myoglobin molecule obtained by X-ray analysis".
  First protein crystal structure. Joint Nobel 1962 with Perutz. Strong.
- **Perutz et al. 1960** — *Nature* 185(4711), 416–422, "Structure of
  haemoglobin: a three-dimensional Fourier synthesis at 5.5-Å resolution,
  obtained by X-ray analysis". The companion structural triumph. Strong.
- **Anfinsen 1973** — *Science* 181(4096), 223–230, "Principles that govern
  the folding of protein chains". The thermodynamic hypothesis of protein
  folding. Sole Nobel 1972. Strong.
- **Karplus, Levitt & Warshel** — joint Nobel 2013. Pass-1 raised "c1?".
  Pass-2 ruling: borderline. The originator papers are Lifson & Warshel
  1968 (*J. Chem. Phys.* 49, 5116, "Consistent force field for
  calculations of conformations, vibrational spectra, and enthalpies of
  cycloalkane and n-alkane molecules"); McCammon, Gelin & Karplus 1977
  (*Nature* 267(5612), 585–590, "Dynamics of folded proteins"); Levitt &
  Warshel 1975 (*Nature* 253(5494), 694–698, "Computer simulation of
  protein folding"). Pass-2 promotes these three as the originator triad
  of computational structural biology; the 2013 joint Nobel Lectures
  serve as the canonical edition-of-record exposition. This is a real
  founding moment for computational biophysics; pass-1 was right to flag
  it. Cross-link to `04-information/`.

Total `structural-biology/`: ~6 strong (Pauling triad + Watson-Crick +
Kendrew + Anfinsen) + 3 borderline-promote (Franklin-Gosling, Wilkins,
Perutz 1960) + 3 strong-borderline (Lifson-Warshel 1968, Levitt-Warshel
1975, McCammon-Gelin-Karplus 1977) = ~12 entries.

### 2.7 `photobiology/`

- **Stark-Einstein photoequivalence law** — Stark 1908 (*Phys. Z.* 9, 894);
  Einstein 1912 (*Ann. Phys.* 37, 832 and 38, 881, "Thermodynamische
  Begründung des photochemischen Äquivalentgesetzes"). Cross-link only;
  primary lives in `02-physics/quantum-mechanics/` and chemistry pass-3
  §3.1 puts it as a chemistry cross-link. Do not duplicate.
- **Emerson & Arnold 1932** — *J. Gen. Physiol.* 16(2), 191–205, "The
  photochemical reaction in photosynthesis". The photosynthetic-unit
  concept. Strong.
- **Calvin and collaborators 1950s** — primary papers on the carbon-
  fixation cycle. Pass-1 flagged "edition-of-record TBD pass-2". Pass-2
  ruling: the originator series is Bassham, Benson & Calvin 1950 (*J. Am.
  Chem. Soc.* 72, 1710), Bassham et al. 1954 (*J. Am. Chem. Soc.* 76,
  1760, "The path of carbon in photosynthesis. XXI. The cyclic regeneration
  of carbon dioxide acceptor"), and Calvin 1962 Nobel Lecture as the
  edition-of-record canonical exposition. Promote the 1954 *JACS* paper as
  the canonical originator; cross-link the 1950 paper. Sole Nobel 1961
  (Calvin).
- **Wald 1933** — *Nature* 132(3334), 316–317, "Vitamin A in the retina".
  Origin of the rhodopsin lineage. Wald subsequently characterized the
  visual cycle in a series of *J. Gen. Physiol.* and *Nature* papers
  through the 1950s. Joint Nobel 1967 with Granit and Hartline. Strong.
- **Engel et al. 2007** — *Nature* 446(7137), 782–786, "Evidence for
  wavelike energy transfer through quantum coherence in photosynthetic
  systems". Pass-1 raised "c1?" (cross-branch from physics → biophysics).
  Pass-2 ruling: borderline. The quantum-coherence-in-photosynthesis claim
  has subsequently been contested in the literature (Duan et al. 2017
  *PNAS* 114, 8493 reinterprets the spectroscopic signature as
  vibronic, not electronic, coherence). The phenomenon is real; the
  *originator-tier* claim that it is canon-eligible is disputed within the
  field. Pass-2 lean: not yet canon. Move to `_landscape/quantum-biology-
  contested.md` pending field consensus.
- **Förster 1948** — *Ann. Phys.* (6th ser.) 2, 55–75, "Zwischenmolekulare
  Energiewanderung und Fluoreszenz". Cross-link from `03-chemistry/
  photochemistry/` per chemistry pass-3 §3.2 (the canonical entry lives
  in chemistry; biophysics cross-links). Confirmed.

Total `photobiology/`: 3 strong (Emerson-Arnold, Calvin/Bassham 1954,
Wald 1933) + 2 cross-links (Stark-Einstein, Förster).

### 2.8 `radiation-biology/`

- **Roentgen 1895** — *Sitzungsberichte der Würzburger Physikal.-Medic.
  Gesellschaft*, "Über eine neue Art von Strahlen (vorläufige
  Mittheilung)". Cross-link to `02-physics/`; the discovery itself is
  physics, not biology.
- **Hevesy 1923** — *Biochem. J.* 17(4), 439–445, "The absorption and
  translocation of lead by plants". Founding paper of the radioactive-
  tracer method in biology. Sole Nobel 1943 (Chemistry). Strong.
- **Lea 1946** — *Actions of Radiations on Living Cells*, Cambridge
  University Press. The founding monograph of radiobiology — quantitative
  dose-response, target theory. Pass-1 missed this; pass-2 promotes it as
  a Margulis-class originator monograph (book, not paper, but
  edition-of-record under condition 2). Strong.
- **Dadachova et al. 2007** — *PLoS ONE* 2(5), e457, "Ionizing radiation
  changes the electronic properties of melanin and enhances the growth of
  melanized fungi". Modern primary for radiosynthesis. Strong (narrow).

Total: 3 canon + 1 cross-link.

### 2.9 `peptides-and-proteins/`

The clean rebuild of the demoted `peptides/` folder, originator-tier only:

- **Sanger 1955** — Sanger F., "The free amino groups of insulin", *Biochem.
  J.* 39 (1945), 507–515 was the first paper of the series; the
  edition-of-record citation is the 1958 Nobel Lecture, "The chemistry of
  insulin", reprinted in *Science* 129, 1340–1344 (1959). The full series
  spans 1945–1955 across *Biochem. J.* and *Nature*. Pass-1 cited "Sanger
  1955 — insulin sequence, *Biochem. J.* 59, 21". The actual capstone is
  Ryle, Sanger, Smith & Kitai 1955, "The disulphide bonds of insulin",
  *Biochem. J.* 60(4), 541–556. Pass-2 promotes the 1955 capstone as the
  citation of record; cross-references the earlier Sanger papers. Sole
  Nobel 1958 (and joint 1980 for sequencing technology — which is canon
  for the next entry).
- **Sanger, Nicklen & Coulson 1977** — *PNAS* 74(12), 5463–5467, "DNA
  sequencing with chain-terminating inhibitors". The Sanger sequencing
  method. Joint Nobel 1980 with Gilbert. Strong. Pass-1 listed as a
  candidate in §5; pass-2 promotes.
- **Du Vigneaud et al. 1953** — *J. Am. Chem. Soc.* 75(19), 4879–4880, "The
  synthesis of an octapeptide amide with the hormonal activity of
  oxytocin". Sole Nobel 1955. Borderline (chemistry overlap; cross-link to
  `03-chemistry/`). Pass-2 ratifies promotion; cross-link.
- **Merrifield 1963** — *J. Am. Chem. Soc.* 85(14), 2149–2154, "Solid phase
  peptide synthesis. I. The synthesis of a tetrapeptide". Sole Nobel 1984.
  Strong.
- **Anfinsen 1973** — already in `structural-biology/`. Cross-link.

Total `peptides-and-proteins/`: 4 strong + 1 cross-link.

The cross-listed pharmacology entries (MOTS-c → Lee et al. 2015 *Cell
Metab.* 21, 443; SS-31 → Birk et al. 2013 *J. Am. Soc. Nephrol.* 24,
1250) live in `bioenergetics/` as borderline entries, not here.

### 2.10 `melanin/` (post-narrowing)

Already covered in §1.3. Three strong (Raper 1928, Mason 1948, McGinness-
Corry-Proctor 1974) + three borderline-promote (Mostert 2012, Kaxiras
2006, Meredith-Riesz 2004).

### 2.11 Spine totals

- `membrane-biophysics/`: 9 strong (HH 4 + HHK 1 + Goldman + Hodgkin-Katz +
  Singer-Nicolson + Neher-Sakmann)
- `bioenergetics/`: ~11 canon (Lipmann, Krebs, Lehninger-Kennedy, Mitchell
  1961, Mitchell 1966, Boyer 1993, Walker 1994, Margulis 1970, Martin-
  Müller 1998, Lane-Martin 2010, Wikström 1977)
- `bioelectricity/`: 5 strong (Galvani 1791, Matteucci 1840, du Bois-
  Reymond 1848, Bernstein 1902, HH cross-link) + 2 borderline (Levin 2014,
  Pai 2012) + 4 precursors
- `allosteric-regulation/`: 2 strong (MWC 1965, KNF 1966)
- `enzyme-kinetics/`: 4 (Michaelis-Menten 1913, Briggs-Haldane 1925, Hill
  1910, Wyman 1948)
- `structural-biology/`: ~12 (Pauling triad + Watson-Crick + Franklin-
  Gosling + Wilkins + Kendrew + Perutz 1960 + Anfinsen + Lifson-Warshel +
  Levitt-Warshel + McCammon-Gelin-Karplus)
- `photobiology/`: 3 strong (Emerson-Arnold, Bassham-Benson-Calvin 1954,
  Wald 1933) + 2 cross-links
- `radiation-biology/`: 3 (Hevesy 1923, Lea 1946, Dadachova 2007) + 1
  cross-link
- `peptides-and-proteins/`: 4 (Sanger 1955 capstone, Sanger 1977, Du
  Vigneaud 1953, Merrifield 1963) + 1 cross-link
- `melanin/`: 3 strong + 3 borderline-promote

Pass-2 spine total: **~50 originator-tier canon entries** (vs pass-1's
~32). The expansion is driven by:

- correcting the HH four-paper-plus-HHK series (rather than treating it as
  five HH papers)
- adding Neher-Sakmann 1976 patch-clamp
- adding the Pauling-Corey 1951 *PNAS* 37 triad (rather than just one
  paper)
- adding Franklin-Gosling 1953 + Wilkins 1953 to the DNA-structure cluster
- adding Hill 1910 to enzyme kinetics
- adding the Lifson-Warshel + Levitt-Warshel + McCammon triad to
  computational structural biology
- adding Lea 1946 to radiation biology
- adding Sanger 1977 sequencing
- promoting Margulis 1970 as endosymbiosis originator monograph

---

## 3. Cross-branch coherence audit

The brief asked specifically for an audit against `03-chemistry/` (pass-3
synthesis) and `02-physics/` (pass-1 sweep). The other branches are
addressed where they have load-bearing claims on biophysics canon.

### 3.1 `05-biophysics/` ↔ `03-chemistry/`

Chemistry pass-3 §5.3 explicitly addresses the biophysics boundary. The
binding rule: where the originator framed the result as a biological
mechanism, it lives in biophysics; where the originator framed it as a
chemical mechanism, it lives in chemistry. Cross-link, do not duplicate.

Pass-3 boundary calls (all confirmed by pass-2):

- Mitchell 1961 (chemiosmosis) → biophysics. Confirmed.
- Michaelis-Menten 1913 → biophysics (enzyme work); cross-link to
  `03-chemistry/kinetics/`. Confirmed.
- Briggs-Haldane 1925 → cross-link from chemistry-kinetics; the steady-
  state hypothesis itself is a chemistry-kinetics tool with originator
  Bodenstein 1913 in chemistry. Pass-3 was right; pass-2 ratifies.
- Pauling 1951 α-helix → biophysics. Confirmed.
- Anfinsen 1973 → biophysics. Confirmed.
- Förster 1948 (FRET) → chemistry (`03-chemistry/photochemistry/`);
  cross-link from biophysics. Confirmed by pass-2 (chemistry pass-3 §3.2).
- Stark-Einstein photoequivalence → physics (canonical), with cross-links
  from chemistry and biophysics. Confirmed.

New pass-2 boundary calls:

- **Allosteric models (MWC 1965, KNF 1966)** → biophysics. Originator
  framing is biology (haemoglobin, regulatory enzymes). Cross-link to
  `03-chemistry/thermodynamics/` for the cooperativity-thermodynamic
  reading. Pass-2 ratifies pass-1.
- **Hill 1910 (Hill coefficient)** → biophysics (haemoglobin
  cooperativity). Cross-link to chemistry-thermodynamics.
- **Du Vigneaud 1953 (oxytocin synthesis)** → biophysics
  `peptides-and-proteins/` (biological-molecule framing). Cross-link to
  `03-chemistry/peptide-chemistry/` if such a sub-folder opens.
- **Merrifield 1963 (SPPS)** → biophysics. Originator framing was
  *peptide* synthesis as biology-tool. Chemistry pass-3 §1 places it on
  the chemistry side as a synthesis-method primary; pass-2 disagrees.
  Pass-3 of biophysics needs to coordinate with chemistry pass-4 to
  resolve this. **Open question for pass-3 (see §8).**
- **Sanger 1977 (DNA sequencing)** → biophysics? or `04-information/` as
  a foundational measurement protocol? Pass-2 lean: biophysics
  (`peptides-and-proteins/sequencing/`), with cross-link to information.
  **Open question for pass-3 (see §8).**

### 3.2 `05-biophysics/` ↔ `02-physics/`

Physics pass-1 §3 binding rules:

- Pure quantum-mechanical postulates and derivations → physics. Confirmed
  for biophysics: Schrödinger 1926 / Dirac 1928 / Pauli 1925 / Born-
  Oppenheimer 1927 are not biophysics canon. Cross-link from
  `bioenergetics/` (electron-transfer mechanisms) and from `photobiology/`
  (rhodopsin photochemistry) to the physics QM section as needed.
- Statistical mechanics of N indistinguishable particles → physics.
  Boltzmann, Gibbs 1902 are not biophysics canon. Cross-link from
  `bioenergetics/` (free-energy reasoning).
- Pure mathematics of QM → math. Hilbert spaces and operator theory are
  not biophysics canon.

Specific pass-2 pickups:

- **Helmholtz 1847** (*Über die Erhaltung der Kraft*, G. Reimer, Berlin) →
  `02-physics/thermodynamics/` per physics pass-1. Helmholtz also wrote
  founding papers in sensory physiology (*Handbuch der physiologischen
  Optik*, 1856–1867; *Die Lehre von den Tonempfindungen*, 1863). Pass-2
  ruling: the *Erhaltung* paper is physics; the *Optik* / *Tonempfindungen*
  monographs are biophysics-of-perception, but they are at the historical
  edge of mechanism canon vs landscape. Pass-2 lean: keep in `02-physics/`
  with a cross-link, do not duplicate. **Open question for pass-3 (see
  §8).**
- **Single-molecule biophysics (Bustamante laser tweezers; Block kinesin)
  — originator papers.** Pass-2 inventory: Bustamante's foundational paper
  is Smith, Cui & Bustamante 1996 (*Science* 271(5250), 795–799,
  "Overstretching B-DNA: the elastic response of individual double-
  stranded and single-stranded DNA molecules"); Block's foundational
  paper is Svoboda, Schnitzer, Schmiel & Block 1993 (*Nature* 365(6448),
  721–727, "Direct observation of kinesin stepping by optical trapping
  interferometry"). Pass-2 lean: borderline. These are field-defining
  experimental originator papers. Promotion eligibility is high. Folder:
  `single-molecule-biophysics/` as a candidate new sub-folder; defer to
  pass-3.
- **Quantum biology (photosynthesis coherence — Engel 2007)** — already
  treated in §2.7 (pass-2 lean: not yet canon, contested).

### 3.3 `05-biophysics/` ↔ `07-mind/`

The neuron-biophysics question. Hodgkin-Huxley 1952 → `membrane-
biophysics/` and `bioelectricity/`; cross-link only to `07-mind/`. The
07-mind branch (which doesn't yet exist in the bucket-canon tree) holds
*cognitive architecture, computation, philosophy of mind*; the membrane-
level mechanics belong here.

McCulloch-Pitts 1943 (*Bull. Math. Biophys.* 5, 115, "A logical calculus
of the ideas immanent in nervous activity") is borderline between
`04-information/` (foundational neural-computation formalism) and
`07-mind/` (computational-mind precursor). Pass-2 lean: `04-information/`
as the canonical entry, with cross-link from `07-mind/` and from
`bioelectricity/`. The biophysics claim on the paper is weak — it is a
mathematical model, not an experimental result. Confirmed.

Levin 2014 cross-links from `bioelectricity/` to `07-mind/` per the
"electric blueprint of regenerative biology informs theories of
bioelectric cognition" thread.

### 3.4 `05-biophysics/` ↔ `04-information/`

- McCulloch-Pitts 1943 → information primary; biophysics cross-link.
- Sanger 1977 sequencing → biophysics (pass-2 lean) vs information.
  Open. See §3.1 above.
- Computational structural biology (Lifson-Warshel 1968, Levitt-Warshel
  1975, McCammon-Gelin-Karplus 1977) → biophysics
  (`structural-biology/computational/`); cross-link from information.

### 3.5 `05-biophysics/` ↔ `06-cosmology/`

- Great Oxygenation Event (Holland 2006, Lyons 2014, Bekker 2004) →
  cosmology / deep-history; cross-link from biophysics.
- Cosmic-ray flux (Bazilevskaya 2008, Shaviv 2002) → cosmology only; not
  biophysics canon at any tier.

### 3.6 `05-biophysics/` ↔ `sub-outcomes/longevity/` cross-mirror

Per CLAUDE.md (org level): longevity is outcome-tier, not foundation-tier.
The `gdrive:longevity-canon/` is the master longevity index; biophysics
holds `sub-outcomes/longevity/` as a *cross-mirror* — a pointer file plus
a per-paper cross-link table.

The cross-mirror convention pass-2 specifies:

- A paper enters `sub-outcomes/longevity/` *only* if it also cites or
  derives from a foundation entry in `bioenergetics/`, `bioelectricity/`,
  `melanin/`, etc. the cross-link goes both ways: the foundation entry
  notes "downstream-application: <longevity paper>", and the longevity
  cross-mirror notes "foundation: <foundation entry>".
- The canonical longevity index lives at
  `gdrive:AGFarms/Nucleus/research/longevity-canon/`. The biophysics
  `sub-outcomes/longevity/` folder holds *only* the cross-link table, not
  the longevity papers themselves.
- Pass-1 §5(3) asked whether `sub-outcomes/longevity/` should exist at all
  inside the biophysics branch. Pass-2 ruling: keep, as a cross-link
  table only; the actual longevity content lives on gdrive.

Pass-1 §5(2) asked whether `_sources/` should be a top-level pattern
across every branch. Pass-2 lean: yes — chemistry has PubChem, math has
arXiv, physics has INSPIRE-HEP, mind has SEP, biophysics has PubMed +
Kruse Index. The pattern is universal. **Recommend escalating to a
top-level `bucket-canon/_sources/` discussion bead in pass-3 work queue;**
deferred from pass-2 because the cross-branch sweep is out of scope for a
biophysics-only deep dive.

---

## 4. Kruse positioning enforcement — the audit

Pass-1 §4 wrote the binding rule. Pass-2's job is to execute the audit:
for every Kruse-curated claim across the existing sub-folders, find the
actual originator paper. Build the mapping table.

This is the work queue's heart. The mapping is below. The "currently in
canon" column is empty for many rows because the branch's spine of
biophysics is missing. Pass-3 fills the originator-paper column into
canon.

### 4.1 Mapping table

| Existing Kruse-curated entry | Topic claim | Actual originator paper | Currently in canon? |
|---|---|---|---|
| `becker/biography.md` + `books.md` (Becker 1985 *The Body Electric*) | bioelectric control of regeneration; tissue semiconductor electronics | Galvani 1791; Bernstein 1902; Hodgkin-Huxley 1952 | **No** — none of the originator papers are in any sub-folder's promoted canon. The `bioelectric-lineage/primary-papers.bib` cites them, but they have not been promoted. |
| `becker/lineage.md` (Szent-Györgyi 1941 *Science* 93, 609 — "Towards a New Biochemistry?") | molecular bioelectronics | Szent-Györgyi 1941 itself is the closest originator-tier candidate; cross-link to his 1937 Vitamin C Nobel work | No |
| `becker/lineage.md` (Fröhlich 1968) | long-range coherence in biological systems | Fröhlich 1968 *Int. J. Quantum Chem.* 2, 641 IS the originator-tier reference; the question is whether it survives as canon or precursor | No |
| `mitochondria/` sub-theme 8 (Pall 2013, Blank-Goodman 2009 — ELF / VGCC) | electromagnetic-field bioeffects on mitochondria | None — the *originator* literature on electromagnetic-field-cell-biology (Adey 1981 *Physiol. Rev.* 61, 435; Liburdy 1992 *FEBS Lett.* 301, 53) is borderline-tier and has not survived independent replication at the claimed field strengths. The contested-flag is ratified. | No (correctly) |
| `mitochondria/` sub-theme 9 (Somlyai 1993, Pomytkin 2006 — deuterium depletion) | deuterium-isotope effects on mitochondrial respiration | **Urey 1932** *PNAS* 18(7), 496–499, "A hydrogen isotope of mass 2" (deuterium discovery; Nobel 1934). **Kresge & Allred 1963** *J. Am. Chem. Soc.* 85, 1541 / Klinman 1972 *Biochemistry* 11, 2018 (kinetic-isotope-effect originator-tier in enzymology). | No |
| `melanin/` sub-theme 1 (McGinness-Corry-Proctor 1974 — already a real originator paper) | melanin as biological semiconductor | McGinness-Corry-Proctor 1974 itself | **Already canon-eligible**, just not promoted yet |
| `melanin/` sub-theme 6 (Solís-Herrera "human photosynthesis") | melanin photolysis of water | None — the underlying biophysical question is legitimate; the Solís-Herrera extrapolation has not achieved independent replication. Contested-flag ratified. | No (correctly) |
| `melanin/` sub-theme 7 (Raper 1928, Mason 1948) | melanin biosynthesis | Raper 1928 + Mason 1948 themselves | **Already canon-eligible**, just not promoted yet |
| `radiosynthesis/SEED.md` (Dadachova 2007) | melanized fungi capture ionizing radiation | Dadachova 2007 itself + the upstream Hevesy 1923 + Lea 1946 chain | **Partial** — Dadachova 2007 is canon-eligible; Hevesy and Lea are not yet in the branch at all |
| `mitochondria/` sub-theme 1 (Margulis 1970, Lane-Martin 2010) | endosymbiotic origin of mitochondria | Margulis 1970 itself | **Canon-eligible**, just not promoted yet |
| `mitochondria/` sub-theme 2 (Mitchell 1961, Boyer 1993, Walker 1994) | chemiosmosis and ATP synthase mechanism | Mitchell 1961 + Boyer 1993 + Walker 1994 themselves | **Canon-eligible**, just not promoted yet |

### 4.2 The biggest single missing originator

**Hodgkin & Huxley 1952** (the four-paper plus HHK paper series, *J.
Physiol.* 116–117). The single most-load-bearing biophysics-canon series
of the 20th century. Currently cited only in the
`bioelectric-lineage/primary-papers.bib` BibTeX file as a single entry
(`hodgkin_1952_quantitative`) and not present in any sub-folder's
promoted canon. The Hodgkin-Huxley equations are *the* founding
mathematical statement of nerve excitation; they are also the bridge to
modern molecular bioelectricity (Levin's programme), to membrane
biophysics broadly, to patch-clamp single-channel kinetics (Neher-Sakmann
1976), and to neural information theory (cross-link to `04-information/`).
The branch cannot cohere without them. Pass-3 priority A.

### 4.3 The most dramatic Kruse-cite-vs-originator gap

**Mitchell 1961 chemiosmosis is well-cited in the existing
`mitochondria/primary-papers.md`, so it is not the dramatic gap.** The
real dramatic gap is:

> Kruse cites *Becker 1985 The Body Electric* as the foundational
> reference for "biology is electric"; the actual originator paper is
> **Hodgkin & Huxley 1952** (and beneath it, **Galvani 1791**), and these
> are currently nowhere in promoted canon.

Becker 1985 is a popular-science book. The originator papers it builds
on (Galvani, Volta, Matteucci, du Bois-Reymond, Bernstein, Hodgkin-
Huxley) span 1791 to 1952 and are 100% public domain or Creative
Commons-eligible. The branch has Becker's *bibliography* but not the
*originators*' papers. This is the cleanest illustration of the rebalance
problem and the cleanest illustration of why pass-3 fixes it: the
originator papers exist, they are accessible, they are downloadable, and
nothing prevents promoting them except the pass-3 work itself.

A close second:

> Kruse cites *deuterium depletion* and *isotope effects* as a recurring
> mitochondrial-biology theme; Bucket cites Somlyai 1993 and Pomytkin
> 2006 (contested clinical-extrapolation papers); the actual originator
> is **Urey 1932** (deuterium discovery, Nobel 1934, *PNAS* 18, 496),
> and the actual originator-tier kinetic-isotope-effect literature in
> enzymology is **Klinman 1972** (*Biochemistry* 11, 2018) plus the
> Kresge-Allred-Bigeleisen tradition. None of these are anywhere in
> the branch.

The Urey 1932 entry is bigger as a foundation gap than the Klinman entry,
but both are real. Pass-3 promotes Urey to `02-physics/` (cross-link) or
to `03-chemistry/` (cross-link), and to a new biophysics
`bioenergetics/isotope-effects/` cluster. The decision goes to pass-3.

### 4.4 The Kruse Index as `_sources/` entry

Per pass-1 §4 and per the README §"Kruse Index — explicit positioning":
the Kruse Index lives at `_sources/kruse-index.md` as a pointer +
search-recipe note. It does not hold canon. It is at the same epistemic
tier as `_sources/pubmed.md` and `_sources/pubchem.md` — a curated
retrieval surface over secondary literature. Pass-2 confirms.

The pointer file should record:
- corpus location (`~/jackkruse/`)
- corpus size (460 articles, FTS5 + MiniLM-L6-v2 + RRF hybrid search)
- curator-tier classification (one partial source for the 05-biophysics
  branch per MANIFESTO)
- the binding rule from pass-1 §4 quoted in full
- a list of Kruse-cited foundational claims for which Bucket has *not yet*
  located the originator paper (this is the work queue's input)

---

## 5. What pass-1 missed

Pass-1 was a rebalance, not a completeness sweep. Pass-2 tests several
candidates pass-1 left out.

### 5.1 Tang-Prigogine 1955 / Prigogine 1967 Nobel Lecture (dissipative structures)

Prigogine I. & Mazur P. 1953 *Physica* 19, 241; the *Nobel Lecture*
"Time, Structure and Fluctuations", *Science* 201(4358), 777–785 (1978),
is the canonical edition-of-record. Far-from-equilibrium thermodynamics
of biological systems.

**Pass-2 ruling**: cross-link to `02-physics/statistical-mechanics/` (the
canonical entry lives in physics, paired with Onsager 1931); cross-link
from `bioenergetics/` and `_landscape/textbooks.md` (for the broader
"thermodynamics of life" reading). Not promoted as biophysics canon
itself. The originator framing is non-equilibrium statistical mechanics
(physics), not biology. Cross-link only.

### 5.2 Schrödinger 1944 *What Is Life?*

The Cambridge UP lectures, *What Is Life? The Physical Aspect of the
Living Cell*. The book that named "aperiodic crystal" as the
information-bearing structure of the gene; load-bearing for the
1953-DNA-structure programme.

**Pass-2 ruling**: landscape, not canon. Schrödinger is the originator of
the QM formalism (canon in `02-physics/`); his 1944 lectures are
popularization-of-an-original-idea. The originator content (the
"aperiodic crystal" as gene-substrate hypothesis) was confirmed by
Watson-Crick 1953, which IS canon. Pass-2 lean: `_landscape/textbooks.md`
with a strong-precursor flag.

This is the same call the chemistry pass-3 §3.1 made for *Pauling 1960
Nature of the Chemical Bond* (promoted as canon under condition 2 because
Pauling was the originator of the formalism the book systematizes).
Schrödinger 1944 differs because Schrödinger was *not* the originator of
the gene-as-aperiodic-crystal claim in any technical sense — the
hypothesis is borrowed from Delbrück's 1935 paper. Pass-2 declines
promotion. **Open for pass-3 reversal.**

### 5.3 Cohen-Boyer 1973 (recombinant DNA)

Cohen, Chang, Boyer & Helling 1973 *PNAS* 70(11), 3240–3244,
"Construction of biologically functional bacterial plasmids in vitro".
The founding paper of recombinant DNA / biotechnology.

**Pass-2 ruling**: borderline. The originator framing is molecular
biology / biochemistry. Pass-2 lean: cross-link from a future molecular-
biology branch or from `03-chemistry/peptide-chemistry/` if such a
sub-folder opens. Not biophysics canon at originator-tier (the paper is
about cloning, not about a physical mechanism of life). **Open for
pass-3.**

### 5.4 Mullis 1985/1987 PCR

Saiki, Scharf, Faloona, Mullis, Horn, Erlich & Arnheim 1985 *Science*
230(4732), 1350–1354, "Enzymatic amplification of beta-globin genomic
sequences and restriction site analysis for diagnosis of sickle cell
anemia". Mullis & Faloona 1987 *Methods Enzymol.* 155, 335. Sole Mullis
Nobel 1993.

**Pass-2 ruling**: not biophysics canon. PCR is a method, not a
mechanism. Cross-link to `03-chemistry/kinetics/` (it is fundamentally an
enzyme-kinetics tool), or to a future molecular-biology / methods branch.

### 5.5 CRISPR origin papers (Mojica 2005, Jinek-Charpentier-Doudna 2012, Cong-Zhang 2013)

Mojica, Diez-Villasenor, Garcia-Martinez & Soria 2005 *J. Mol. Evol.*
60(2), 174–182. Jinek, Chylinski, Fonfara, Hauer, Doudna & Charpentier
2012 *Science* 337(6096), 816–821. Cong, Ran, Cox, Lin, Barretto, Habib,
Hsu, Wu, Jiang, Marraffini & Zhang 2013 *Science* 339(6121), 819–823.
Joint Doudna-Charpentier Nobel 2020.

**Pass-2 ruling**: not biophysics canon. Same reasoning as PCR — CRISPR
is a method (with an originating-mechanism reading: the bacterial
adaptive-immunity reading from Mojica 2005 IS originator-tier mechanism).
Mojica 2005 is the closest candidate for biophysics canon, but the
mechanism it describes is bacterial adaptive immunity, which is a
biology-tier mechanism rather than a biophysics-tier one. Cross-link to
a future molecular-biology branch.

### 5.6 Sanger sequencing 1977

Already promoted in §2.9. **Pass-2: canon.**

### 5.7 Levin bioelectric morphogenesis recent reviews

Already addressed in §1.2 and §2.3. **Pass-2 ruling: promote Levin 2014
(*Mol. Biol. Cell* 25, 3835), treat 2016 and 2018 as landscape.**

### 5.8 Allen-Sims 2008+ on solar exposure / circadian

Allen, Sims, Smith and Foster (multiple papers, 2007–2014, on circadian-
disrupted solar exposure). The originator-tier circadian-biology canon
is **Konopka & Benzer 1971** (*PNAS* 68, 2112, "Clock mutants of
*Drosophila melanogaster*") and the Hall-Rosbash-Young Nobel 2017
discoveries (Bargiello, Jackson & Young 1984 *Nature* 312, 752; Reddy et
al. 1984 *Cell* 38, 701; Zehring et al. 1984 *Cell* 39, 369). The
Allen-Sims solar-exposure literature is downstream application.

**Pass-2 ruling**: Konopka-Benzer 1971 + the 1984 *period* papers are
originator-tier; promote in a `chronobiology/` candidate sub-folder
(pass-3 decides whether the sub-folder opens). Allen-Sims goes to
`sub-outcomes/longevity/` cross-mirror.

### 5.9 Other items pass-1 missed

- **Levitt-Warshel 1975 + Lifson-Warshel 1968 + McCammon-Gelin-Karplus
  1977** — already promoted in §2.6 (computational structural biology).
- **Konopka-Benzer 1971** — pass-2 promotes (chronobiology, see 5.8).
- **Lea 1946** — pass-2 promotes in §2.8 (radiation biology).
- **Hill 1910** — pass-2 promotes in §2.5 (enzyme kinetics).
- **Pauling-Corey 1951 *PNAS* 37 triad (alpha-helix + beta-sheet + pleated
  sheet)** — pass-1 had only one Pauling paper; pass-2 has all three.
- **Franklin-Gosling 1953 + Wilkins-Stokes-Wilson 1953** — pass-1 did not
  list these. Pass-2 promotes both as borderline-paired with
  Watson-Crick.
- **Neher-Sakmann 1976** — pass-1 mentioned as a candidate; pass-2
  promotes.
- **Urey 1932 (deuterium)** — pass-2 cross-link (originator is physics or
  chemistry, depending on framing).

---

## 6. Cataclysms, peptides, melanin — the contested decisions, forced calls

The brief asked pass-2 to force the call on three items.

### 6.1 Cataclysms

The "cataclysms" reading appears at the boundary with cosmology and deep-
history. The relevant claims:

- Miyake events (Miyake et al. 2012 *Nature* 486(7402), 240–242, "A
  signature of cosmic-ray increase in AD 774–775 from tree rings in
  Japan") — solar-proton events in tree-ring radiocarbon record.
- Cosmic-ray flux variation (Bazilevskaya 2008 *Space Sci. Rev.*; Shaviv
  2002 *New Astron.* 8, 39).
- Great Oxygenation Event (Holland 2006, Lyons 2014).

**Pass-2 forced ruling**: none of these is biophysics canon. The
biophysical *response* to ionizing radiation IS biophysics canon
(Hevesy 1923 + Lea 1946 + Dadachova 2007 in `radiation-biology/`). The
*event* itself — solar protons hitting Earth in 774 AD, Earth oxygenation
2.4 Gya, cosmic-ray flux modulation — is cosmology / deep-history.
Cross-link from `radiation-biology/` to `06-cosmology/` for the
upstream-event side; do not duplicate. The pass-1 `radiosynthesis/SEED.md`
cited Bazilevskaya, Shaviv, Holland, Bekker — these are cosmology
references, not biophysics references. Pass-2 demotes them out of
biophysics entirely.

### 6.2 Peptides

Already forced in §1.5 and §2.9. **Pass-2 forced ruling**: existing
`peptides/` folder is demoted wholesale to `_landscape/peptide-
pharmacology.md`. New `peptides-and-proteins/` folder opens with Sanger
1955, Sanger 1977, Du Vigneaud 1953, Merrifield 1963 only. MOTS-c and
SS-31 cross-listed from `bioenergetics/` as borderline. Khavinson, BPC-
157, GHK-Cu, Semax, Selank, GHRPs, CJC-1295, Cerebrolysin, Melanotan-II,
Dihexa, Tesofensine, Pinealon, FDA/USP/EMA regulatory all → landscape.

### 6.3 Melanin

Already forced in §1.3. **Pass-2 forced ruling**: `melanin/` retained,
narrowed to Raper 1928, Mason 1948, McGinness-Corry-Proctor 1974 (canon)
plus Mostert 2012, Kaxiras 2006, Meredith-Riesz 2004 (borderline-promote
pending pass-3). Solís-Herrera → contested. Reviews →
`_landscape/melanin-reviews.md`. Radiosynthesis-related entries → fold
into `radiation-biology/`.

---

## 7. Final folder tree (frozen)

```
05-biophysics/
  README.md                              (already exists, written 2026-05-01)
  CANON_INDEX.md                         (already exists; pass-3 updates)
  CROSS_LINKS.md                         (NEW — pass-3 generates from §3)
  _intake/
    biophysics-rebalance-pass-1-2026-05-01.md
    biophysics-canon-deep-dive-2026-05-01.md       (this file)
  _sources/
    kruse-index.md                       (NEW — pointer + binding rule + work-queue input)
    pubmed.md                            (NEW)
    pubchem.md                           (NEW; cross-link to 03-chemistry/reference/)
    becker-archive.md                    (NEW; pointer to becker/site-mirror/2026-04-23/)
  _landscape/
    becker-program.md                    (NEW; replaces becker/biography.md + books.md + lineage.md)
    textbooks.md                         (NEW; Lehninger, Alberts, Berg-Tymoczko-Stryer, Stryer, Lane 2002/2005/2015, Becker 1985/1990, Schrödinger 1944, Nicholls-Ferguson 2013)
    contested.md                         (NEW; Solís-Herrera, Nordenström 1983/1989, Pall 2013, Blank-Goodman 2009, Somlyai 1993, Pomytkin 2006)
    peptide-pharmacology.md              (NEW; Khavinson, BPC-157, GHK-Cu, Semax, Selank, GHRPs, CJC-1295, Cerebrolysin, Melanotan-II, Dihexa, Tesofensine, Pinealon, regulatory)
    melanin-reviews.md                   (NEW; Meredith-Sarna 2006, d'Ischia 2013, Zecca/Fedorow/Zucca, Kollias-Baqer 1987, Sarna-Swartz 1993, Ito-Wakamatsu 2003, Liu-Simon 2003, Bothma 2008)
    quantum-biology-contested.md         (NEW; Engel 2007 + Duan 2017 critique)
  membrane-biophysics/
    1952-hodgkin-huxley-katz-current-voltage.md   (HHK methodological paper)
    1952-hodgkin-huxley-currents-na-k.md           (HH paper 1)
    1952-hodgkin-huxley-components-conductance.md  (HH paper 2)
    1952-hodgkin-huxley-dual-effect.md             (HH paper 3)
    1952-hodgkin-huxley-quantitative-description.md (HH capstone)
    1943-goldman-potential-impedance.md
    1949-hodgkin-katz-sodium-effect.md
    1972-singer-nicolson-fluid-mosaic.md
    1976-neher-sakmann-single-channel.md
  bioenergetics/
    1937-krebs-johnson-citric-acid.md
    1941-lipmann-phosphate-bond-energy.md
    1948-lehninger-kennedy-oxidative-phosphorylation.md
    1961-mitchell-chemi-osmotic.md
    1966-mitchell-chemiosmotic-coupling.md
    1970-margulis-origin-eukaryotic-cells.md
    1977-wikstrom-proton-pump-cytochrome-c.md
    1993-boyer-binding-change.md
    1994-abrahams-walker-f1-atpase-structure.md
    1998-martin-muller-hydrogen-hypothesis.md
    2010-lane-martin-energetics-genome-complexity.md
    cox/                                 (optional; pass-3 decides)
      1996-tsukihara-cox-structure.md
      1998-yoshikawa-cox-redox.md
      2006-belevich-proton-coupled.md
    isotope-effects/                     (NEW per §4.3 / §5)
      1972-klinman-isotope-enzymology.md  (cross-link to chemistry-kinetics)
    cardiolipin/                         (optional cluster; pass-3 decides)
      2013-birk-cardiolipin-cristae.md   (SS-31 borderline cross-list)
    mitochondrial-derived-peptides/      (optional cluster; pass-3 decides)
      2015-lee-mots-c.md                 (MOTS-c borderline cross-list)
  bioelectricity/
    README.md                            (= bioelectric-lineage/ARC.md, renamed)
    _bibliography/
      becker-papers.bib                  (= becker/papers.bib, moved)
      primary-papers.yaml                (= bioelectric-lineage/primary-papers.yaml, moved)
    1791-galvani-de-viribus-electricitatis.md
    1840-matteucci-phenomenes-electriques.md
    1848-du-bois-reymond-thierische-elektricitat.md
    1902-bernstein-thermodynamik.md
    2012-pai-levin-xenopus-eye.md
    2014-levin-molecular-bioelectricity.md
    precursors/
      1935-burr-northrop-electrodynamic.md
      1941-szent-gyorgyi-new-biochemistry.md
      1947-lund-bioelectric-fields.md
      1968-frohlich-long-range-coherence.md
  allosteric-regulation/
    1965-monod-wyman-changeux.md
    1966-koshland-nemethy-filmer.md
  enzyme-kinetics/
    1910-hill-aggregation-haemoglobin.md
    1913-michaelis-menten-invertinwirkung.md
    1925-briggs-haldane-steady-state.md         (cross-link to 03-chemistry/kinetics/)
    1948-wyman-heme-proteins.md
  structural-biology/
    1951-pauling-corey-branson-alpha-helix.md
    1951-pauling-corey-pleated-sheet.md
    1951-pauling-corey-pleated-sheet-favored.md
    1953-watson-crick-dna.md
    1953-franklin-gosling-thymonucleate.md
    1953-wilkins-stokes-wilson-deoxypentose.md
    1958-kendrew-myoglobin.md
    1960-perutz-haemoglobin.md
    1973-anfinsen-protein-folding.md
    computational/                       (NEW; the Karplus-Levitt-Warshel triad)
      1968-lifson-warshel-consistent-force-field.md
      1975-levitt-warshel-protein-folding.md
      1977-mccammon-gelin-karplus-dynamics.md
  photobiology/
    1932-emerson-arnold-photochemical.md
    1933-wald-vitamin-a-retina.md
    1954-bassham-benson-calvin-carbon-path.md
    (cross-link: 1908-stark-1912-einstein-photoequivalence → 02-physics/)
    (cross-link: 1948-foerster-energy-migration → 03-chemistry/photochemistry/)
  radiation-biology/
    1923-hevesy-lead-translocation.md
    1946-lea-actions-of-radiations.md
    2007-dadachova-melanin-ionizing-radiation.md
    _seed/
      radiosynthesis.md                  (= radiosynthesis/SEED.md, moved)
    (cross-link: 1895-roentgen-x-rays → 02-physics/)
  peptides-and-proteins/
    1953-du-vigneaud-oxytocin-synthesis.md     (cross-link to 03-chemistry/)
    1955-sanger-insulin-disulphide-bonds.md
    1963-merrifield-solid-phase-peptide.md
    1977-sanger-nicklen-coulson-dna-sequencing.md
  melanin/
    1928-raper-aerobic-oxidases.md
    1948-mason-tyrosinase-mechanism.md
    1974-mcginness-corry-proctor-amorphous-semiconductor.md
    borderline/
      2004-meredith-riesz-radiative-relaxation.md
      2006-kaxiras-structural-model.md
      2012-mostert-semiconductivity-ion-transport.md
  chronobiology/                                (NEW; pass-3 decides whether to open)
    1971-konopka-benzer-clock-mutants.md
    1984-bargiello-jackson-young-period.md
    (etc — pass-3)
  single-molecule-biophysics/                   (NEW; pass-3 decides whether to open)
    1993-svoboda-block-kinesin.md
    1996-smith-cui-bustamante-overstretching-dna.md
  sub-outcomes/
    longevity/
      README.md                          (cross-mirror pointer to gdrive:longevity-canon/)
      cross-links.md                     (per-paper foundation↔outcome table)
```

### 7.1 `CANON_INDEX.md` blocks for new sub-folders

Pass-3 generates the per-sub-folder `CANON_INDEX.md` files using the
chemistry-branch convention. Each block has a header (sub-folder name,
created date, status), a `## Manifest` table listing files with one-line
purposes, a `## Sources used` section, and a `## Known gaps` section. The
detailed format is left to pass-3 since it depends on the per-paper
metadata pulled from the existing `primary-papers.yaml` files plus
journal-volume-and-page resolution.

The branch-level `CANON_INDEX.md` (already exists, written 2026-05-01)
needs an update to reflect: (a) the dissolution of `becker/`,
`mitochondria/`, `peptides/`, `radiosynthesis/`; (b) the rename of
`bioelectric-lineage/` to `bioelectricity/`; (c) the opening of nine
mechanism-named sub-folders; (d) the per-paper canon list under each.
This is a pass-3 task.

---

## 8. Work queue + open questions

### 8.1 Phase A — close pass-1 §5 items + execute migration moves

Tasks pass-3 must do:

- **A1.** Apply `becker/` migration: consolidate `biography.md` + `books.md`
  + `lineage.md` → `_landscape/becker-program.md`; move `papers.bib` →
  `bioelectricity/_bibliography/becker-papers.bib`; create
  `_sources/becker-archive.md` pointer; delete `becker/CANON_INDEX.md`.
  Site-mirror stays where it is on disk.
- **A2.** Rename `bioelectric-lineage/` → `bioelectricity/`. Convert
  `ARC.md` → `bioelectricity/README.md`.
- **A3.** Apply `mitochondria/` dissolution: split `primary-papers.md` per
  sub-theme; route canon entries (sub-themes 1, 2, 4, 6, 7) to
  `bioenergetics/<year>-<author>-<short>.md` files; route ELF (sub-theme
  8) to `_sources/kruse-index.md`; route deuterium (sub-theme 9) to
  `_landscape/contested.md` plus open `bioenergetics/isotope-effects/`
  with the actual originator papers; route Lane books (sub-theme 10) to
  `_landscape/textbooks.md`.
- **A4.** Apply `peptides/` demotion: full contents → `_landscape/peptide-
  pharmacology.md`; cross-list MOTS-c (Lee 2015) and SS-31 (Birk 2013) to
  `bioenergetics/`; open `peptides-and-proteins/` with Sanger 1955 + 1977,
  Du Vigneaud 1953, Merrifield 1963.
- **A5.** Apply `radiosynthesis/` dissolution: `SEED.md` → `radiation-
  biology/_seed/radiosynthesis.md`; open `radiation-biology/` with
  Hevesy 1923, Lea 1946, Dadachova 2007; cross-links to physics + cosmology.
- **A6.** Apply `melanin/` narrowing: promote Raper 1928 + Mason 1948 +
  McGinness-Corry-Proctor 1974 to canon; move borderline (Mostert 2012,
  Kaxiras 2006, Meredith-Riesz 2004) to `melanin/borderline/`; reviews →
  `_landscape/melanin-reviews.md`; Solís-Herrera → `_landscape/contested.md`.
- **A7.** Update branch-level `CANON_INDEX.md` to reflect §7 tree.

### 8.2 Phase B — promote spine canon

- **B1.** Open `membrane-biophysics/` with the 9 entries from §2.1.
- **B2.** Open `bioenergetics/` with the 11 entries from §2.2.
- **B3.** Promote `bioelectricity/` per §2.3 (5 strong + 2 borderline + 4
  precursors).
- **B4.** Open `allosteric-regulation/` with MWC 1965 + KNF 1966.
- **B5.** Open `enzyme-kinetics/` with Hill 1910, Michaelis-Menten 1913,
  Briggs-Haldane 1925, Wyman 1948.
- **B6.** Open `structural-biology/` with the 12 entries from §2.6
  (including the computational triad in `structural-biology/computational/`).
- **B7.** Open `photobiology/` with Emerson-Arnold 1932, Bassham-Benson-
  Calvin 1954, Wald 1933 + 2 cross-links.
- **B8.** Open `peptides-and-proteins/` with the 4 entries from §2.9.

### 8.3 Phase C — generate `CROSS_LINKS.md` and `_sources/`

- **C1.** Generate top-level `05-biophysics/CROSS_LINKS.md` from §3.
- **C2.** Write `_sources/kruse-index.md` per §4.4 (binding rule, work-
  queue input from §4.1 mapping table).
- **C3.** Write `_sources/pubmed.md` and `_sources/pubchem.md` (pointer
  files, cross-link to `03-chemistry/reference/` for PubChem).
- **C4.** Write `_sources/becker-archive.md` per A1.

### 8.4 Phase D — open questions (pass-3 must resolve before promoting)

The five §8 unresolved questions pass-2 deliberately leaves open:

**Q1. Merrifield 1963 chemistry-or-biophysics priority.** Chemistry pass-3
§1 places SPPS on the chemistry side as a synthesis-method primary;
pass-2 §3.1 disagrees and places it on the biophysics side. The branches
need to agree. Pass-3 task: **coordinate with chemistry pass-4 and
choose one canonical home + cross-link the other.** The honest tilt:
biophysics, because the pre-1963 peptide-synthesis literature was
chemistry-tier (Du Vigneaud 1953 was chemistry's claim) but Merrifield's
solid-phase innovation was specifically *protein* synthesis at biological
scale. Both readings are defensible.

**Q2. Sanger 1977 sequencing — biophysics or `04-information/` or
chemistry?** Pass-2 lean: biophysics. But sequencing IS a foundational
information-acquisition protocol, and the physics-pass-1 sweep didn't
address it. Pass-3 task: **coordinate with the not-yet-existent
`04-information/` branch lead, pick a home.**

**Q3. Should `chronobiology/` open as a 10th biophysics sub-folder?**
Pass-2 surfaces Konopka-Benzer 1971 + the 1984 *period* papers as
originator-tier. They could equally live in a `genetics/` or
`molecular-biology/` branch (which doesn't yet exist) or in a
`07-mind/sleep-and-circadian/` cluster. Pass-3 task: **decide whether
chronobiology gets its own sub-folder in biophysics, or waits for a
genetics branch.** Pass-2 lean: open it here; the originator-framing is
biophysical-rhythms.

**Q4. Should `single-molecule-biophysics/` open as an 11th biophysics
sub-folder?** Pass-2 surfaces Svoboda-Block 1993 (kinesin) +
Smith-Cui-Bustamante 1996 (DNA stretching). Pass-3 task: **decide.**
Pass-2 lean: open it. The originator-framing is unambiguously biophysics
(physical mechanics of single biomolecules); the cluster is large enough
and has its own experimental-method tradition.

**Q5. Should `_sources/` become a top-level pattern across every branch?**
Pass-1 §5(2) raised this; pass-2 §3.6 lean: yes — chemistry has PubChem,
math has arXiv, physics has INSPIRE-HEP, mind has SEP, biophysics has
PubMed + Kruse Index. Pass-3 task: **escalate to a top-level
`bucket-canon/` discussion bead**; do not block the biophysics rebalance
on the answer.

---

— pass-2 deep dive, 2026-05-01
