# 05-biophysics — Canon Branch

## Scope

The biophysics canon holds **primary statements of laws, principles, and
mechanisms governing the physical behavior of living systems**: membrane
biophysics, bioenergetics, neural and developmental bioelectricity,
biomolecular thermodynamics, enzyme kinetics, allosteric regulation,
structural biology of biomolecules, photobiology, and radiation biology.

It does **NOT** hold:

- Clinical medicine, public-health policy, treatment guidelines
- Longevity, disease, cognitive-performance outcomes (these are downstream
  applications — landscape, not canon — and live in
  `sub-outcomes/longevity/` as cross-mirror with the gdrive longevity-canon)
- Biographical or case-narrative material on individual researchers
- Supplements, peptide stacks, dosing protocols, vendor mappings
- Popular-science books, blog corpora, interview transcripts (landscape)
- History-of-biology narrative (that belongs in `08-deep-history/`)

The test for inclusion is the same applied to Euclid in 01-mathematics and
Mendeleev in 03-chemistry: is this text a primary statement of a law,
principle, or mechanism that downstream biology must contend with? If yes,
it is candidate canon. If the text is curation, commentary, or a synthesis
written *about* the foundations rather than *being* one, it belongs in the
landscape, not the canon.

## Boundary with 03-chemistry

Where chemistry becomes biology — enzyme kinetics, allostery, biomolecular
electron transfer, protein folding thermodynamics — the primary mechanism
statement may sit in either branch. Default rule (inherited from
`03-chemistry/README.md`): if the originator framed the result as a chemical
mechanism (Marcus 1956 on electron transfer), it lives in chemistry; if the
originator framed it as a biological mechanism (Mitchell 1961 on
chemiosmosis), it lives here. Cross-link rather than duplicate.

## Boundary with 02-physics

The Schrödinger equation, statistical mechanics, and the photoelectric law
are canon in `02-physics/`. Their *biological* applications — the
Hodgkin-Huxley equations of nerve excitation, the Goldman-Hodgkin-Katz
voltage equation, the Stark-Einstein photoequivalence law applied to vision
and photosynthesis — are canon here. Cross-link, do not duplicate.

## Boundary with 07-mind

Neural bioelectricity at the membrane and circuit level is biophysics
(here). Cognitive architecture, computation, and the philosophy of mind are
07-mind. Hodgkin-Huxley belongs here; theories of consciousness do not.

## Promotion rule

Material enters `05-biophysics/` only when one of the following holds:

1. It is a **primary theoretical or experimental text** by the originator of
   the framework (e.g. Hodgkin and Huxley 1952 on the action potential,
   Mitchell 1961 on chemiosmosis, Monod-Wyman-Changeux 1965 on allostery,
   Watson and Crick 1953 on DNA structure, Anfinsen 1973 on protein folding,
   Michaelis and Menten 1913 on enzyme kinetics).
2. It is a **recognized academic edition-of-record** of a primary text
   (e.g. Hodgkin's collected papers; the Boyer and Walker 1997 Nobel
   Lectures as the canonical exposition of ATP-synthase rotational
   mechanism).
3. It is a **discipline-standard normative reference** (e.g. the IUBMB
   Enzyme Commission classification, the PDB format specification).

Practitioner monographs, textbooks, popularizations, and blog corpora do
not promote unless they meet condition 3 by virtue of being the discipline's
normative reference, not by virtue of their author's reputation or
following.

## Kruse Index — explicit positioning

The MANIFESTO names Jack Kruse as **one partial source** for the biophysics
branch, not its centre. This README binds that statement to a folder rule.

The **Kruse Index** (`~/jackkruse/`, 460 scraped articles, FTS5 + MiniLM
hybrid search) is a **curated corpus**. It sits at the same epistemic tier
as PubMed and PubChem: a useful retrieval surface over secondary literature,
not a producer of foundations. It is recorded in this branch as a
`_sources/` pointer, never as canon.

The rule is:

- A Kruse article is not canon. The originator paper Kruse cites is.
- Where Kruse-curated commentary flags an underdeveloped foundational claim
  in mitochondrial biology, photobiology, or bioelectricity, Bucket's job
  is to find the originator paper and file *that* in the appropriate
  mechanism-named sub-folder. Kruse's commentary itself stays in
  `_sources/kruse-index.md` or `_landscape/`.
- The branch is intentionally rebalanced away from a Kruse-shaped silhouette
  (mitochondria + melanin + bioelectricity + peptides + radiosynthesis,
  with no membrane-biophysics, no enzyme kinetics, no structural biology,
  no allostery) toward a foundations-shaped silhouette covering the actual
  spine of biophysics.

This is alignment with the MANIFESTO, not argument against Kruse. Kruse
remains a load-bearing curator — at the curator tier, not the originator
tier.

## Subfolders (proposed — see `_intake/biophysics-rebalance-pass-1-2026-05-01.md`)

The current sub-folders (`becker/`, `bioelectric-lineage/`, `melanin/`,
`mitochondria/`, `peptides/`, `radiosynthesis/`) were seeded 2026-04-23 from
a Kruse-adjacent intake pass and are person- or theme-named rather than
mechanism-named. Pass-1 of the rebalance proposes the following
mechanism-named tree; migration is documented in the intake memo and is
**proposal-only** — no existing sub-folders are renamed or deleted by
pass-1.

- `membrane-biophysics/` — Hodgkin-Huxley, Goldman, Singer-Nicolson
- `bioenergetics/` — Mitchell, Lipmann, Krebs, Boyer, Walker, Lehninger
- `bioelectricity/` — Galvani, Bernstein, Hodgkin-Huxley (cross-link), Levin
- `allosteric-regulation/` — Monod-Wyman-Changeux, Koshland-Némethy-Filmer
- `enzyme-kinetics/` — Michaelis-Menten, Briggs-Haldane
- `structural-biology/` — Watson-Crick, Pauling-Corey, Kendrew, Anfinsen
- `photobiology/` — Emerson-Arnold, Calvin, Wald, rhodopsin lineage
- `radiation-biology/` — Roentgen (cross-link), Hevesy, Dadachova
- `_sources/` — Kruse Index, PubMed, PubChem (pointers, not mirrors)
- `_landscape/` — textbooks (Lehninger, Alberts, Berg-Tymoczko-Stryer, Lane,
  Becker 1985)
- `sub-outcomes/longevity/` — cross-mirror with gdrive longevity-canon

## Status

Absorption stage. README written 2026-05-01 by the biophysics rebalance
sweep. Existing sub-folders preserved pending pass-2 review.
`CANON_INDEX.md` is authoritative — a file not listed there is not canon.
The current sub-folder seeds remain in place and remain readable; their
promotion-tier reclassification is the work of pass-2.
