# Biophysics rebalance — pass 1 — 2026-05-01

The 05-biophysics branch was seeded 2026-04-23 from beads `bkt-research-04`,
`bkt-research-05`, `bkt-research-08`, `bkt-research-17`, `bkt-research-18`.
The seed pass produced six sub-folders (`becker/`, `bioelectric-lineage/`,
`melanin/`, `mitochondria/`, `peptides/`, `radiosynthesis/`) and no
branch-level README. The result is a Kruse-shaped silhouette: every
sub-folder lines up with a recurring topic in the Kruse blog corpus, and
the spine of biophysics — membrane biophysics, enzyme kinetics, allosteric
regulation, structural biology — is absent.

The MANIFESTO is explicit: Kruse is *one partial source*, not the centre of
the biophysics branch. The branch as it stands implies the opposite. Pass-1
realigns the branch to the MANIFESTO. Pass-1 does **not** rename or delete
any existing sub-folder; it inventories what is on disk, names the
foundations spine that is missing, proposes a corrected mechanism-named
folder tree, and writes the binding rule for Kruse positioning.

## 1. What is in 05-biophysics today

Inventory of the existing sub-folders, with honest tier assessment.

### `becker/` — created 2026-04-23, bead `bkt-research-17`

Contents: `biography.md` (2.9 KB), `books.md` (1.8 KB, three Becker books
including the 1985 *Body Electric*), `lineage.md` (4.4 KB, influence
network), `papers.bib` (22 KB, 56 PubMed-indexed Becker-coauthored papers),
`site-mirror/2026-04-23/` (262 files / 419 MB mirror of robertobecker.net),
`CANON_INDEX.md`.

Tier: **biographical dossier on a single 20th-century researcher**, not
mechanism-canon. The 56 papers are mostly orthopedics-journal coauthorships;
the originator-tier bioelectricity work Becker is a *popularizer* of —
Galvani, Bernstein, Hodgkin-Huxley — is not in this folder. The 419 MB
site-mirror is provenance, not foundation. The folder name (a person, not a
mechanism) violates the chemistry-branch convention (`bonding/`,
`kinetics/`, `thermodynamics/`).

Honest read: this is "Kruse's notes on Robert Becker's *The Body Electric*"
elevated to a sub-folder by virtue of Becker being a recurring Kruse
reference. Becker 1985 is a landscape-tier popular book, not canon.

### `bioelectric-lineage/` — created 2026-04-23, bead `bkt-research-18`

Contents: `ARC.md` (10.5 KB, 15-node bioelectric lineage), `cross-refs.md`
(2.3 KB), `primary-papers.md` (6.8 KB), `primary-papers.bib` (8.3 KB),
`primary-papers.yaml` (25.7 KB), `queries.txt` (2 KB), `CANON_INDEX.md`.

Tier: **best of the existing sub-folders**. ARC.md is a real lineage
treatment from Galvani forward; the primary-papers files cite originator
papers (Galvani, Bernstein) in addition to Becker and Nordenström. This is
the closest existing sub-folder to mechanism-named canon. The folder name
is theme-named (`bioelectric-lineage`) rather than mechanism-named
(`bioelectricity/`); the rename is cosmetic but worth doing.

Honest read: rename to `bioelectricity/`, fold `becker/`'s primary-papers
cross-ref here, keep the ARC.

### `melanin/` — created 2026-04-23, bead `bkt-research-04`

Contents: `SEED.md` (4.8 KB), `lineage.md` (4.2 KB), `primary-papers.md`
(9.5 KB, seven sub-themes including a Solís-Herrera *contested* entry),
`primary-papers.bib` (8 KB), `primary-papers.yaml` (26.7 KB), `queries.txt`
(1 KB), `CANON_INDEX.md`. 21 entries.

Tier: **mixed**. The "historical foundations" sub-theme (Raper 1928, Mason
1959, Prota) is mechanism-canon. The semiconductor sub-theme
(McGinness-Corry-Proctor 1974) is mechanism-canon. The Solís-Herrera
"human photosynthesis" entry is contested-and-flagged; the radiosynthesis
sub-theme overlaps `radiosynthesis/`. The neuromelanin sub-theme is
mechanism-canon.

Honest read: keep the folder, narrow to originator papers, drop the
Solís-Herrera entry from canon (move to `_landscape/contested.md`).

### `mitochondria/` — created 2026-04-23, bead `bkt-research-05`

Contents: `SEED.md` (7.2 KB), `lineage.md` (4.6 KB), `primary-papers.md`
(9.5 KB, ten sub-themes, 36 entries), `primary-papers.bib` (10 KB),
`primary-papers.yaml` (35.4 KB), `queries.txt`, `CANON_INDEX.md`.

Tier: **partly canon, partly Kruse-adjacent**. Endosymbiosis (Margulis),
chemiosmosis (Mitchell), cytochrome c oxidase enzymology, Boyer/Walker ATP
synthase — these are mechanism-canon. The "ELF / bioelectric coupling" and
"deuterium depletion / isotope effects" sub-themes are flagged contested
and read as Kruse-corpus topics filed under a mitochondria header. The
"Nick Lane synthesis" sub-theme is landscape-adjacent and the index says so
honestly.

Honest read: fold the canon material into `bioenergetics/`; move the ELF /
deuterium / Lane sub-themes to `_sources/kruse-index.md` and
`_landscape/textbooks.md` respectively.

### `peptides/` — created 2026-04-23

Contents: `SEED.md` (2.3 KB), `lineage.md` (2.9 KB), `primary-papers.md`
(7.9 KB, 13 compound families: Khavinson bioregulators, BPC-157, MOTS-c,
GHK-Cu, SS-31, TB-500, Semax/Selank, GHRPs, CJC-1295, Cerebrolysin,
Melanotan-II, contested, regulatory), `primary-papers.bib` (11.4 KB),
`primary-papers.yaml` (37 KB), `queries.txt` (3.2 KB), `CANON_INDEX.md`.

Tier: **almost entirely outside biophysics canon**. The compound list is
the standard "longevity peptides" bench; provenance is flagged honestly
(Russian-institute and single-lab dominance) but the framing is
nutraceutical/biohacker, not biophysics. Mechanism-of-action papers for
specific bioactive peptides are pharmacology-tier, not foundation-tier.

Honest read: this is the most Kruse-shaped folder in the branch and the
single most-mismatched-to-MANIFESTO. The honest move is to demote the
folder to `_landscape/peptide-pharmacology.md` (or to
`gdrive:longevity-canon/`) entirely and, separately, open
`peptides-and-proteins/` containing only the originator papers — Sanger
1955 (insulin sequence), Merrifield 1963 (solid-phase peptide synthesis),
Du Vigneaud 1953 (oxytocin synthesis). Those are biophysics canon. The
current folder's contents are not.

### `radiosynthesis/` — created 2026-04-23, bead `bkt-research-08`

Contents: `SEED.md` only (3.7 KB). Cites Holland 2006, Bekker 2004, Lyons
2014, Hohmann-Marriott & Blankenship 2011, Dadachova 2007, Zhdanova 2004,
Turick 2011, Cordero & Casadevall 2017, McGinness-Corry-Proctor 1974, plus
Solís-Herrera, Bazilevskaya 2008, Shaviv 2002.

Tier: **thin (one file) but well-targeted citations**. The primary papers
named are real and originator-tier. Folder name is mechanism-adjacent but
narrow; the actual mechanism is *radiation biology* of which radiosynthesis
is one phenomenon.

Honest read: fold into `radiation-biology/` with Hevesy 1923 (the actual
originator of biological radioactive-tracer methods, Nobel 1943) added as
the foundation entry, and Dadachova 2007 retained as the modern primary
for the radiosynthesis sub-claim.

### Branch-level summary

Five of six existing sub-folders are organized around topics that recur in
the Kruse corpus (`becker/`, `bioelectric-lineage/`, `melanin/`,
`mitochondria/`, `peptides/`, with `radiosynthesis/` as a sixth derived
from a Kruse-favored Dadachova paper). The spine of biophysics — membrane
biophysics, enzyme kinetics, allostery, structural biology, mainline
photobiology — is entirely absent. No file in any sub-folder cites
Hodgkin-Huxley 1952. No file cites Michaelis-Menten 1913. No file cites
Watson-Crick 1953. No file cites Monod-Wyman-Changeux 1965. No file cites
Anfinsen 1973.

This is the rebalance problem in one sentence: the branch has six of the
ten Kruse-corpus topics and zero of the six foundations of biophysics.

## 2. The biophysics foundations spine that is missing

Originator inventory, edition-of-record where known, mechanism
justification. Aim ~25–35 strong entries.

### Membrane biophysics

- **Hodgkin & Huxley 1952** — five-paper series in *J. Physiol.* 116–117:
  - 116, 424–448: "Currents carried by sodium and potassium ions through
    the membrane of the giant axon of *Loligo*"
  - 116, 449–472: "The components of membrane conductance in the giant
    axon of *Loligo*"
  - 116, 473–496: "The dual effect of membrane potential on sodium
    conductance in the giant axon of *Loligo*"
  - 116, 497–506: "The effect of sodium ions on the electrical activity of
    the giant axon of the squid"
  - 117, 500–544: "A quantitative description of membrane current and its
    application to conduction and excitation in nerve"
  - The HH equations are the founding mathematical statement of nerve
    excitation. Nobel 1963. ***strong***
- **Goldman 1943**, *J. Gen. Physiol.* 27, 37–60, "Potential, impedance,
  and rectification in membranes." With Hodgkin & Katz 1949 (*J. Physiol.*
  108, 37–77), gives the Goldman-Hodgkin-Katz voltage equation. ***strong***
- **Singer & Nicolson 1972**, *Science* 175, 720–731, "The fluid mosaic
  model of the structure of cell membranes." ***strong***
- **Mitchell 1961**, *Nature* 191, 144–148 (cross-listed under
  bioenergetics). ***strong***

### Bioenergetics

- **Mitchell 1961**, *Nature* 191, 144–148, "Coupling of phosphorylation to
  electron and hydrogen transfer by a chemi-osmotic type of mechanism."
  Nobel 1978. ***strong***
- **Lipmann 1941**, *Adv. Enzymol.* 1, 99–162, "Metabolic generation and
  utilization of phosphate bond energy." High-energy phosphate. Nobel 1953
  (with Krebs). ***strong***
- **Krebs & Johnson 1937**, *Enzymologia* 4, 148–156, "The role of citric
  acid in intermediate metabolism in animal tissues." TCA cycle. Nobel
  1953. ***strong***
- **Lehninger & Kennedy 1948**, *J. Biol. Chem.* 172, 847–871,
  "Oxidative phosphorylation … in mitochondria." Localizes ox-phos to
  mitochondria. ***strong***
- **Boyer 1997** Nobel Lecture, "Energy, life, and ATP," *Bioscience
  Reports* 18, 97–117 (lecture pub. 1998). Rotational catalysis hypothesis.
  ***strong***
- **Walker 1997** Nobel Lecture, "ATP synthesis by rotary catalysis,"
  *Angew. Chem. Int. Ed.* 37, 2308–2319 (1998). Crystallographic
  confirmation. ***strong***

### Bioelectricity (the canon Becker is one downstream popularizer of)

- **Galvani 1791**, *De Viribus Electricitatis in Motu Musculari
  Commentarius*, Bologna, *De Bononiensi Scientiarum et Artium Instituto
  atque Academia Commentarii* 7, 363–418. Animal electricity; founding
  text. ***strong***
- **Bernstein 1902**, *Pflüger's Arch.* 92, 521–562, "Untersuchungen zur
  Thermodynamik der bioelektrischen Ströme. Erster Theil." Membrane theory
  of bioelectricity. ***strong***
- **Hodgkin & Huxley 1952** (cross-link from membrane biophysics).
  ***strong***
- **Levin** — selected reviews on developmental bioelectricity (e.g.
  Levin 2014, *Mol. Biol. Cell* 25, 3835–3850, "Molecular bioelectricity";
  Levin 2021, *Cell* 184, 1971–1989, "Bioelectric signaling: reprogrammable
  circuits underlying embryogenesis, regeneration, and cancer"). ***borderline***
  — review-tier but field-defining for the modern bioelectricity research
  programme. Cross-link to 07-mind.

### Allosteric regulation

- **Monod, Wyman & Changeux 1965**, *J. Mol. Biol.* 12, 88–118, "On the
  nature of allosteric transitions: a plausible model." MWC concerted
  model. ***strong***
- **Koshland, Némethy & Filmer 1966**, *Biochemistry* 5, 365–385,
  "Comparison of experimental binding data and theoretical models in
  proteins containing subunits." KNF sequential model. ***strong***

### Enzyme kinetics

- **Michaelis & Menten 1913**, *Biochem. Z.* 49, 333–369, "Die Kinetik der
  Invertinwirkung." ***strong***
- **Briggs & Haldane 1925**, *Biochem. J.* 19, 338–339, "A note on the
  kinetics of enzyme action." Steady-state derivation that displaced the
  rapid-equilibrium assumption. ***strong***

### Structural biology

- **Watson & Crick 1953**, *Nature* 171, 737–738, "Molecular structure of
  nucleic acids: a structure for deoxyribose nucleic acid." ***strong***
- **Pauling, Corey & Branson 1951**, *PNAS* 37, 205–211, "The structure of
  proteins: two hydrogen-bonded helical configurations of the polypeptide
  chain." Alpha-helix; the *PNAS* 37 series also gives the beta-sheet.
  ***strong***
- **Kendrew et al. 1958**, *Nature* 181, 662–666, "A three-dimensional
  model of the myoglobin molecule obtained by X-ray analysis." First
  protein crystal structure. Nobel 1962. ***strong***
- **Anfinsen 1973**, *Science* 181, 223–230, "Principles that govern the
  folding of protein chains." Thermodynamic hypothesis of protein folding.
  Nobel 1972. ***strong***

### Photobiology

- **Stark-Einstein photoequivalence law** — primary Stark 1908, Einstein
  1912 (cross-link to `03-chemistry/photochemistry/` where it lives as
  primary). ***borderline*** here (cross-link, do not duplicate).
- **Emerson & Arnold 1932**, *J. Gen. Physiol.* 16, 191–205, "The
  photochemical reaction in photosynthesis." Photosynthetic-unit concept.
  ***strong***
- **Calvin and collaborators 1950s** — primary papers on the carbon-fixation
  cycle (Calvin 1962 Nobel Lecture as edition-of-record reference until
  primary set is curated). Nobel 1961. ***strong***
- **Wald 1933**, *Nature* 132, 316–317, "Vitamin A in the retina." Origin
  of the rhodopsin lineage; Nobel 1967. ***strong***
- **Hartline 1938**, *Am. J. Physiol.* 121, 400–415, "The response of
  single optic nerve fibers." Nobel 1967 (with Wald and Granit).
  ***borderline*** — neural-side photobiology.

### Mitochondria specifically (folds into bioenergetics)

- **Mitchell 1961** (already cited). ***strong***
- **Lehninger & Kennedy 1948** (already cited). ***strong***
- **Boyer 1997 / Walker 1997** (already cited). ***strong***
- **Lane 2005**, *Power, Sex, Suicide: Mitochondria and the Meaning of
  Life*, OUP — landscape, **not canon** (popular synthesis). Listed here
  because the existing `mitochondria/` index already classifies it as
  landscape-adjacent and pass-1 ratifies that.

### Melanin (narrowed)

- **Raper 1928**, *Physiol. Rev.* 8, 245–282, "The aerobic oxidases."
  Melanin biosynthesis foundation. ***strong***
- **Mason 1959** — tyrosinase mechanism (primary biochemistry; e.g. Mason
  1948, *J. Biol. Chem.* 172, 83 — verify exact 1959 reference in pass-2).
  ***strong***
- **McGinness, Corry & Proctor 1974**, *Science* 183, 853–855, "Amorphous
  semiconductor switching in melanins." Melanin as biological semiconductor.
  ***strong***

### Radiation biology / radiosynthesis

- **Roentgen 1895** (cross-link to `02-physics/`). ***strong***
- **Hevesy 1923**, *Biochem. J.* 17, 439–445, "The absorption and
  translocation of lead by plants." Founding paper of the radioactive
  tracer method in biology. Nobel 1943. ***strong***
- **Dadachova et al. 2007**, *PLoS ONE* 2, e457, "Ionizing radiation
  changes the electronic properties of melanin and enhances the growth of
  melanized fungi." Modern primary for the radiosynthesis sub-claim.
  ***strong***

### Sequence and synthesis (proposed `peptides-and-proteins/`)

- **Sanger 1955** — insulin sequence, *Biochem. J.* 59, 21 (1955) and prior
  series. Nobel 1958. ***strong***
- **Merrifield 1963**, *J. Am. Chem. Soc.* 85, 2149–2154, "Solid phase
  peptide synthesis." Nobel 1984. ***strong***
- **Du Vigneaud et al. 1953**, *J. Am. Chem. Soc.* 75, 4879–4880,
  "The synthesis of an octapeptide amide with the hormonal activity of
  oxytocin." Nobel 1955. ***borderline*** — chemistry-canon overlap;
  cross-link to `03-chemistry/`.

**Total**: 27 *strong* + 5 *borderline* = ~32 entries proposed for the
spine.

## 3. Proposed corrected folder tree

```
05-biophysics/
  README.md                            (written 2026-05-01)
  CANON_INDEX.md                       (written 2026-05-01)
  _intake/
    biophysics-rebalance-pass-1-2026-05-01.md   (this file)
  membrane-biophysics/
  bioenergetics/
  bioelectricity/
  allosteric-regulation/
  enzyme-kinetics/
  structural-biology/
  photobiology/
  radiation-biology/
  peptides-and-proteins/               (only if Sanger/Merrifield-tier)
  melanin/                             (kept, narrowed)
  _sources/
    kruse-index.md                     (pointer + epistemic-tier note)
    pubmed.md                          (pointer)
    pubchem.md                         (pointer; cross-link to 03-chemistry)
  _landscape/
    textbooks.md                       (Lehninger, Alberts, Berg-Tymoczko-
                                       Stryer, Stryer, Lane 2005,
                                       Becker 1985, Becker 1990)
    contested.md                       (Solís-Herrera, Nordenström
                                       oncology applications)
  sub-outcomes/
    longevity/                         (cross-mirror with
                                       gdrive:longevity-canon)
```

### Migration plan for existing sub-folders

| Existing | Move to | Notes |
|---|---|---|
| `becker/biography.md`, `books.md`, `lineage.md`, `site-mirror/` | `_landscape/textbooks.md` (Becker 1985, 1990 entries) + `_sources/becker-archive.md` (provenance pointer to site-mirror) | site-mirror stays where it is on disk; pointer file is added |
| `becker/papers.bib` | `bioelectricity/becker-papers.bib` | retained as a Becker-specific bibliography sitting alongside the canon |
| `bioelectric-lineage/*` | `bioelectricity/` | wholesale rename |
| `melanin/*` | `melanin/` (kept), narrow to Raper / Mason / McGinness / Meredith-Sarna; Solís-Herrera entry → `_landscape/contested.md` |
| `mitochondria/*` (canon sub-themes 1, 2, 3, 4, 5, 6, 7) | `bioenergetics/` | endosymbiosis, chemiosmosis, mtDNA, COX enzymology, signaling, biogenesis, dynamics |
| `mitochondria/` (sub-themes 8 ELF, 9 deuterium, 10 Nick Lane) | `_sources/kruse-index.md` (8, 9) and `_landscape/textbooks.md` (10) | the contested-flagged Kruse-adjacent material |
| `peptides/*` | `_landscape/peptide-pharmacology.md` (compound families) **OR** demote entirely to `gdrive:longevity-canon/` | only Sanger 1955, Merrifield 1963, Du Vigneaud 1953 promoted to a new `peptides-and-proteins/` |
| `radiosynthesis/SEED.md` | `radiation-biology/SEED.md`, plus add Hevesy 1923 as the foundation entry | Dadachova 2007 retained as modern primary |

## 4. Kruse positioning — the binding rule

The Kruse Index is a curated corpus at the same epistemic tier as PubMed
and PubChem. It is a useful retrieval surface over secondary literature; it
is not a producer of foundations. A Kruse article never substitutes for an
originator paper.

Kruse-curated commentary lives in `_sources/kruse-index.md` (as a pointer +
search-recipe note) or in `_landscape/` (when the commentary itself is the
landscape artifact). It does not enter any mechanism-named sub-folder.
Where Kruse's writing flags an underdeveloped foundational claim — for
example, his recurring emphasis on mitochondrial light-coupling, melanin
electronics, or deuterium isotope effects — Bucket's job is to find the
originator paper (Mitchell 1961, McGinness-Corry-Proctor 1974, the actual
isotope-effect primary literature) and file *that* under the relevant
mechanism-named sub-folder. Kruse's commentary on the originator paper
stays at the `_sources/` tier.

This rule aligns the branch to the MANIFESTO. It is not an argument
against Kruse. Kruse remains a load-bearing curator at the curator tier.

## 5. What pass-1 expects pass-2 to test

Contestable items pass-1 leaves open for pass-2 adjudication:

1. **Which existing sub-folders survive renaming vs. deletion?** Pass-1
   recommends: keep and narrow `melanin/`; rename
   `bioelectric-lineage/` → `bioelectricity/`; fold `becker/`,
   `mitochondria/`, `radiosynthesis/`, `peptides/` into mechanism-named
   parents or demote to `_landscape/`. Pass-2 can argue for keeping any of
   these as standalone sub-folders if the originator-tier reseeding is
   substantial enough to justify the dedicated folder.
2. **Should `_sources/` be a top-level pattern across every branch (math,
   physics, chemistry, info, biophysics, cosmology, mind, deep-history,
   art) or is it 05-biophysics-specific?** Pass-1 suspects the answer is
   "every branch needs one" — chemistry has PubChem, math has arXiv,
   physics has INSPIRE-HEP, mind has SEP — but is unwilling to make that
   call without a cross-branch sweep. Pass-2 should escalate.
3. **Is `sub-outcomes/longevity/` canon-adjacent or landscape?** Pass-1
   treats it as cross-mirror with `gdrive:longevity-canon/`, neither
   promoted nor demoted. The CLAUDE.md (org level) classifies longevity as
   "outcome-tier, not foundation-tier"; the branch README echoes this.
   Pass-2 may want to move `sub-outcomes/` out of the branch entirely and
   leave only the cross-link.
4. **Is Lane 2005 *Power, Sex, Suicide* landscape or borderline canon?**
   Pass-1 says landscape (popular synthesis, not originator-tier mechanism
   statement). The existing `mitochondria/CANON_INDEX.md` already calls
   Lane "landscape-adjacent edition-of-record"; pass-1 ratifies that
   classification. Pass-2 is welcome to reopen.
5. **Levin developmental-bioelectricity reviews — borderline canon or
   landscape?** Pass-1 marks borderline. The reviews are field-defining but
   are reviews, not originator papers. The originator papers (his own and
   his lab's) may belong in canon; the field-summarizing reviews may not.
   Pass-2 should adjudicate per-paper.
6. **Mason 1959 melanin reference** — pass-1 cites the year Raper-Mason
   convention names; pass-2 should verify exact journal volume and page,
   or substitute the actual Mason primary (Mason 1948, *J. Biol. Chem.*
   172, 83 is the likeliest candidate).
7. **Calvin cycle edition-of-record** — pass-1 lists the 1962 Nobel
   Lecture as the proxy until the primary-paper set (Bassham, Benson, and
   Calvin, 1950s *J. Am. Chem. Soc.* and *J. Biol. Chem.* series) is
   curated. Pass-2 should curate the primary set.
8. **`peptides/` — demote entirely or partially keep?** Pass-1 leans
   toward full demotion of the existing contents (longevity-pharmacology
   compound families) and a new clean `peptides-and-proteins/` containing
   only Sanger / Merrifield / Du Vigneaud. Pass-2 can argue the existing
   compound-family material has biophysics-canon entries hidden inside
   (SS-31 / cardiolipin work, MOTS-c primary discovery paper) that deserve
   promotion into `bioenergetics/` rather than wholesale demotion.

— pass-1 sweep, 2026-05-01
