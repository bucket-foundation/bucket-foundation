# 06-cosmology — Canon Branch

## Scope

The cosmology canon holds **foundations of physical cosmology**: primary
statements of the laws governing the universe at large scale, the mechanisms
that drive its expansion and structure, and the observational anchors that
fix the model to the sky. This is one of the seven branches named in
`MANIFESTO.md` §3.

It includes:

- Founding theoretical papers of relativistic cosmology (Friedmann, Lemaître,
  Robertson, Walker)
- Originator papers on the expansion of the universe and the distance ladder
  (Slipher, Hubble, Leavitt's period-luminosity relation)
- Big-Bang nucleosynthesis foundations (Gamow, Alpher–Bethe–Gamow, Wagoner–
  Fowler–Hoyle)
- Cosmic microwave background discovery and characterization (Penzias–Wilson;
  the Dicke–Peebles–Roll–Wilkinson companion; COBE; the canonical Planck
  cosmological-parameters paper)
- Inflation (Guth, Linde, Albrecht–Steinhardt) as a complete priority bundle
- Dark-matter founding observations (Zwicky 1933, Rubin–Ford 1970,
  Rubin–Thonnard–Ford 1978)
- Dark-energy founding observations (Riess 1998, Perlmutter 1999)
- Structure-formation foundations (Press–Schechter; Peebles 1980 *pending
  pass-2 ratification* — see Contestable §4 in pass-1)
- Black-hole geometry and thermodynamics where the conversation is global
  about gravity, cosmology, and information (Schwarzschild, Kerr,
  Bekenstein, Hawking)
- Normative reference resources (NASA LAMBDA, ESA Planck Legacy Archive, IAU
  resolutions on cosmology)

It does **NOT** include:

- Pre-modern cosmologies (Aristarchus, Ptolemy, Aryabhata, Copernicus,
  Kepler — these are landscape-level intellectual history and live in
  `08-deep-history/`; Kepler's three laws as *celestial mechanics* live in
  `02-physics/classical-mechanics/`, not here)
- Popularization (Sagan, Hawking *A Brief History of Time*, Greene)
- Philosophy of cosmology absent technical content (Smolin's *Time Reborn*
  is landscape; Carter 1974 anthropic principle is a contestable case
  argued in pass-1 §4)
- Modified-gravity programs that have not produced a canonical primary text
  on the same footing as their Einsteinian competitor (MOND, TeVeS — listed
  in landscape, not promoted)
- Single-experiment release papers absent foundation-level content (specific
  LIGO event papers, individual JWST early-universe observation papers —
  contestable, see pass-1 §4)

The promotion test is the same applied to Newton in `02-physics/`: is this
text a primary statement of a law, mechanism, or model that downstream
cosmology must contend with? If yes, it is canon. If it is a refinement of a
parameter, a popular synthesis, or a single observational release, it is
landscape.

## Promotion rule

Material enters `06-cosmology/` only when one of the following holds:

1. It is a **primary theoretical paper or monograph** by the originator of
   the framework (Friedmann 1922 on the curvature equations; Guth 1981 on
   inflation; Bekenstein 1973 on black-hole entropy).
2. It is a **founding observational paper** that fixes a previously
   undetermined cosmological structure or parameter at the level of model
   identification (Hubble 1929 on the distance–velocity relation; Penzias–
   Wilson 1965 on the CMB; Riess 1998 / Perlmutter 1999 on cosmic
   acceleration).
3. It is a **discipline-standard normative reference** in active use
   (CODATA cosmological constants where they exist as a separate adjustment;
   the canonical Planck cosmological-parameters paper as the live edition-
   of-record for the parameter set; IAU resolution texts).

Pedagogical syntheses (Weinberg's *Cosmology* monograph, Dodelson's *Modern
Cosmology*, Mukhanov's *Physical Foundations of Cosmology*) do not promote
to canon without one of the three conditions above being satisfied by the
text itself, not by its author's reputation. They live in
`_landscape/textbooks.md` once that file is written.

## Boundary calls — the three live ones

Three boundaries take real adjudication. The pass-1 sweep argues each in
detail; the operative rules are:

**vs `02-physics/relativity/general/`.** General relativity itself — the
Einstein field equations, Hilbert's variational derivation, Schwarzschild's
exterior solution, the equivalence principle — lives in physics. Cosmology
inherits the field equations as its substrate but holds the *cosmological*
specializations: FLRW metric (Friedmann 1922 + 1924, Lemaître 1927,
Robertson 1935, Walker 1936), the cosmological-constant 1917 paper (cross-
listed: physics primary, cosmology cross-link, on the same originator-
framing rule used for Noether 1918 in physics), and the inflationary,
nucleosynthetic, and dark-sector models built on top of FLRW. The
Schwarzschild metric stays in physics; **black-hole thermodynamics**
(Bekenstein 1973, Hawking 1974/1975) sits in cosmology because the
conversation is about gravity-information-entropy at the universe scale.
Pass-1 §3 argues this; pass-2 ratifies.

**vs `01-mathematics/differential-geometry/`.** The mathematics of pseudo-
Riemannian manifolds, Ricci curvature, and Lie groups acting on metrics
lives in mathematics. Cosmology cites it. The originator papers that
*invent* mathematical structure inside a cosmological model (the FLRW
metric is one) are cosmology canon with a math cross-link, on the same rule
applied to Noether 1918 in physics.

**vs `08-deep-history/`.** Pre-modern world-models (Aristarchus, Ptolemy,
Copernicus, Kepler-as-natural-philosopher, Galileo, Newton-as-cosmologist
in *Principia* Book III) are intellectual history. They belong in
`08-deep-history/` for narrative coverage and `canon-figures/06-cosmology.md`
for the contributor index. The cosmology branch begins, as canon, with the
1917 GR cosmology papers. The line is the move from world-pictures to
field-equation-grounded models.

## Subfolders (proposed; ratified in pass-2)

- `pre-relativistic/` — Olbers's paradox; Bessel 1838 (61 Cygni parallax);
  Leavitt 1908/1912 (Cepheid period-luminosity)
- `relativistic-foundations/` — Einstein 1917, de Sitter 1917, Friedmann
  1922 + 1924, Lemaître 1927, Robertson 1935, Walker 1936
- `expansion-and-hubble/` — Slipher 1917, Hubble 1929, Lemaître 1931
  (English translation, *MNRAS*)
- `nucleosynthesis/` — Gamow 1946, Alpher–Bethe–Gamow 1948, Hayashi 1950,
  Wagoner–Fowler–Hoyle 1967
- `cmb/` — Penzias–Wilson 1965, Dicke–Peebles–Roll–Wilkinson 1965, COBE
  (Smoot et al. 1992; Mather et al. 1990 black-body spectrum), WMAP
  (Spergel et al. 2003 + final Hinshaw et al. 2013), Planck 2018 (Aghanim
  et al. *A&A* 641, A6, 2020)
- `inflation/` — Guth 1981, Linde 1982 (new inflation), Albrecht–Steinhardt
  1982
- `dark-matter/` — Zwicky 1933, Rubin–Ford 1970, Rubin–Thonnard–Ford 1978;
  Tully–Fisher 1977 as a related foundation
- `dark-energy/` — Riess 1998, Perlmutter 1999
- `structure-formation/` — Press–Schechter 1974; Peebles 1980 monograph
  (contestable, pass-1 §4)
- `black-holes/` — Schwarzschild 1916 cross-link; Kerr 1963; Bekenstein
  1973; Hawking 1974 + 1975
- `reference/` — NASA LAMBDA pointer; ESA Planck Legacy Archive pointer;
  IAU resolutions on cosmology (B1 of XXX General Assembly 2018, the
  Hubble–Lemaître renaming)
- `_landscape/` — textbooks (Weinberg, Dodelson, Mukhanov, Peebles 1993
  *Principles of Physical Cosmology*, Kolb–Turner *Early Universe*)

## Status

Absorption stage. Branch opened 2026-05-01 by pass-1 sweep. `CANON_INDEX.md`
is authoritative — a file not listed there is not canon. Per-folder index
files and per-entry stubs follow in pass-2.
