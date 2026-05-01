# Biophysics canon — pass 2 — 2026-05-01

Pass-1 (`biophysics-rebalance-pass-1-2026-05-01.md`) named the spine and
made proposal-only migration calls. It deliberately did not populate the
spine and deliberately did not adjudicate which proposals are binding for
pass-3 to execute. Pass-2 does both jobs: it populates the spine entry-by-
entry with edition-of-record + journal volume/page + mechanism justification,
it makes binding fate calls on the six existing person- and theme-named
sub-folders, it re-states and tightens the Kruse positioning rule, it lays
out the cross-branch coherence map (chemistry, physics, mind, cosmology,
information), it makes the binding call on `sub-outcomes/longevity/`, and
it produces the frozen tree pass-3 should treat as contract.

Pass-2 does not rename or delete any existing sub-folder; that is a
maintainer execution step gated on pass-3 sign-off. Pass-2 also does not
reach into pass-3 territory: cross-link table generation, per-folder
`CANON_INDEX.md` seeding, and the actual write-up of stub files for each
promoted entry are all explicitly out of scope.

Author: data pillar, deep-dive sweep.

---

## 1. Full sub-domain inventory — populating the spine pass-1 named

The pass-1 spine listed ~32 originator entries (27 strong + 5 borderline)
across nine sub-domains, with the depth of the citation set (Hodgkin–Huxley
five-paper series, Pauling–Corey *PNAS* 37 series, Calvin papers) flagged
but not enumerated. Pass-2 enumerates. Each entry below is in the form
required by the README's promotion rule: originator name, full reference
including journal volume and page, edition-of-record where the original is
not the cite-from-record, and mechanism-justification of why the entry
clears the foundations bar.

Where pass-2 marks an entry **strong**, the entry is judged to clear the
README "primary statement of a law, principle, or mechanism" bar without
contestation. Where it marks an entry **borderline**, the entry is on the
edge: pass-3 may demote it to landscape or may keep it as canon, and the
reasoning is noted. Where it marks an entry **cross-link**, the canonical
copy lives in another branch and biophysics holds only a pointer.

### 1.1 Membrane biophysics

The mathematical theory of nerve excitation, the diffusion and
conductance of ions across cell membranes, and the structural model of the
membrane itself. The branch's load-bearing sub-domain — every entry below
is required reading for any subsequent biophysics work and most of them
are also load-bearing for `07-mind/`.

**Hodgkin & Huxley 1952 — the five-paper series in *J. Physiol.* 116 and
117.** Pass-1 enumerated all five papers and judged the bundle strong.
Pass-2 reaffirms and tightens the load-bearing call: of the five, the
fifth — "A quantitative description of membrane current and its application
to conduction and excitation in nerve", *J. Physiol.* 117(4), 500–544
(1952) — is the single load-bearing paper, because it gives the Hodgkin–
Huxley equations themselves and demonstrates that the equations,
parameterized from voltage-clamp data in the prior four papers, predict
the action potential waveform without further fitting. The other four
papers are required as the experimental backing for the equations'
parameters, but if Bucket can hold only one, it holds the fifth. Edition
of record: the *J. Physiol.* originals; the Royal Society reprint
collections (Hodgkin's *Conduction of the Nervous Impulse*, Liverpool UP
1964; Cole's *Membranes, Ions and Impulses*, UC Press 1968) are landscape
syntheses, not editions of record. Nobel 1963. **Strong.**
`membrane-biophysics/`. Cross-link from `bioelectricity/` (the bridge into
the bioelectricity sub-domain) and from `07-mind/` (the bridge into
neural computation).

**Goldman 1943**, "Potential, impedance, and rectification in membranes",
*J. Gen. Physiol.* 27(1), 37–60. Founding paper of the constant-field
treatment of membrane potential. Combined with Hodgkin & Katz 1949 ("The
effect of sodium ions on the electrical activity of the giant axon of the
squid", *J. Physiol.* 108(1), 37–77) it gives the Goldman–Hodgkin–Katz
voltage equation, the resting-potential equation every textbook now
teaches. Both papers are originator-tier. Edition of record: the
journal originals. **Strong** (both, as a pair). `membrane-biophysics/`.

**Singer & Nicolson 1972**, "The fluid mosaic model of the structure of
cell membranes", *Science* 175(4023), 720–731. Primary statement of the
membrane structural model: integral proteins embedded in a fluid
phospholipid bilayer, free to diffuse laterally. This is the model every
subsequent membrane-biology paper assumes; it displaced the unit-membrane
and protein-coated-bilayer models that preceded it. **Strong.**
`membrane-biophysics/`.

**Neher & Sakmann 1976**, "Single-channel currents recorded from membrane
of denervated frog muscle fibres", *Nature* 260(5554), 799–802. First
direct measurement of single-ion-channel currents — the experimental
foundation of patch-clamp electrophysiology and the empirical confirmation
that the Hodgkin–Huxley conductances are populations of discrete channel
events. **Strong.** `membrane-biophysics/`. Cross-link from
`bioelectricity/`.

**Hamill, Marty, Neher, Sakmann & Sigworth 1981**, "Improved patch-clamp
techniques for high-resolution current recording from cells and cell-free
membrane patches", *Pflüger's Arch.* 391(2), 85–100. The methods paper
that turned patch-clamp into the workhorse technique of modern
electrophysiology. Neher & Sakmann Nobel 1991. **Strong.**
`membrane-biophysics/`.

**Mitchell 1961** — primary copy lives in bioenergetics. Pass-2 lists it
here as a cross-link because chemiosmosis is the mechanism that sets the
electrochemical gradient that membrane biophysics is then about. Cite
from `bioenergetics/` rather than duplicating.

Pass-1 listed three primary entries (Hodgkin–Huxley, Goldman, Singer–
Nicolson) plus a Mitchell cross-link. Pass-2 expands to six (Hodgkin–
Huxley as one bundle, Goldman + Hodgkin–Katz as one paired entry, Singer–
Nicolson, Neher–Sakmann 1976, Hamill et al. 1981, Mitchell cross-link),
because the patch-clamp originator papers are missing from pass-1 and they
are the experimental-method foundation that voltage-clamp + Hodgkin–Huxley
fluxes are *measured* against. Without patch-clamp, single-channel
behaviour is not measurable, and the Hodgkin–Huxley conductances remain
phenomenological aggregates rather than real channel populations. The
patch-clamp papers earn promotion under condition 1 of the promotion rule.

### 1.2 Bioenergetics

The thermodynamics and machinery of ATP synthesis. Mitchell's chemiosmotic
hypothesis is the load-bearing entry; the rest of the sub-domain is the
prior empirical work it explained and the subsequent crystallographic
work that confirmed it.

**Mitchell 1961**, "Coupling of phosphorylation to electron and hydrogen
transfer by a chemi-osmotic type of mechanism", *Nature* 191(4784),
144–148. Primary statement of the chemiosmotic hypothesis. Mitchell's
later edition-of-record exposition — *Chemiosmotic Coupling and Energy
Transduction*, Glynn Research, Bodmin, 1968 — is a landscape monograph,
not the originator paper; cite the *Nature* primary. Nobel 1978.
**Strong.** `bioenergetics/`.

**Lipmann 1941**, "Metabolic generation and utilization of phosphate bond
energy", *Adv. Enzymol.* 1, 99–162. Founding paper of the high-energy
phosphate concept and ATP as the universal energy currency. The work the
chemiosmotic mechanism is a *coupling explanation for*. Nobel 1953
(shared with Krebs). **Strong.** `bioenergetics/`.

**Krebs & Johnson 1937**, "The role of citric acid in intermediate
metabolism in animal tissues", *Enzymologia* 4, 148–156. Primary statement
of the citric-acid cycle (the TCA cycle / Krebs cycle). The catabolic
pathway whose terminal step delivers electrons to the chain Mitchell
explains. Nobel 1953. **Strong.** `bioenergetics/`.

**Lehninger & Kennedy 1948**, "Oxidative phosphorylation … in
mitochondria", *J. Biol. Chem.* 172(2), 847–871 (1948). Localizes
oxidative phosphorylation to mitochondria — the anatomical claim that
makes Mitchell's mechanism mean anything organelle-specific. **Strong.**
`bioenergetics/`.

**Boyer 1997 Nobel Lecture**, "Energy, life, and ATP", published as Paul
D. Boyer, *Bioscience Reports* 18(3), 97–117 (1998). Primary exposition of
the binding-change / rotational-catalysis mechanism for ATP synthase.
Boyer's earlier *FEBS Letters* and *Annu. Rev. Biochem.* papers state the
mechanism in pieces; the Nobel lecture is the edition-of-record
synthesis. **Strong.** `bioenergetics/`.

**Walker 1997 Nobel Lecture**, "ATP synthesis by rotary catalysis", John
E. Walker, *Angew. Chem. Int. Ed.* 37(17), 2308–2319 (1998). Companion to
Boyer 1997: the F₁ ATPase crystal structure that confirms the rotational
mechanism (Abrahams, Leslie, Lutter & Walker 1994, "Structure at 2.8 Å
resolution of F₁-ATPase from bovine heart mitochondria", *Nature*
370(6491), 621–628 is the underlying primary paper). Pass-2 promotes
both: the Nobel lecture as edition-of-record exposition, and the 1994
*Nature* paper as the originator structural result. **Strong** (both).
`bioenergetics/`.

**Margulis 1967**, "On the origin of mitosing cells", Lynn Sagan,
*J. Theor. Biol.* 14(3), 225–274. Primary modern statement of the
endosymbiotic theory of mitochondrial (and plastid) origin. Pass-1 listed
endosymbiosis under "mitochondria specifically (folds into bioenergetics)"
without naming the paper; pass-2 names it. Margulis' later book *Origin
of Eukaryotic Cells* (Yale UP 1970) is landscape. **Strong.**
`bioenergetics/`. (Pass-2 places this under bioenergetics rather than
opening a separate `cell-biology/` folder, because the load-bearing claim
is metabolic rather than morphological — endosymbiosis is the
explanation for why eukaryotes have a separate ATP-synthesis compartment
in the first place. A maintainer who later opens `cell-biology/` should
move it.)

Pass-1 listed six bioenergetics entries (Mitchell, Lipmann, Krebs–Johnson,
Lehninger–Kennedy, Boyer, Walker). Pass-2 expands to eight by adding
Abrahams et al. 1994 alongside Walker 1997 and adding Margulis 1967 as
the endosymbiosis primary.

### 1.3 Bioelectricity

The pre-Hodgkin–Huxley historical foundation (Galvani, Bernstein), the
Hodgkin–Huxley cross-link, and the modern developmental-bioelectricity
research programme (Levin and lab). This is the sub-domain Becker is a
*downstream popularizer* of; Becker himself stays in landscape.

**Galvani 1791**, *De Viribus Electricitatis in Motu Musculari
Commentarius*, Bologna; published as a memoir in *De Bononiensi Scientiarum
et Artium Instituto atque Academia Commentarii* 7, 363–418 (1791). Primary
statement of animal electricity. The text every subsequent
electrophysiology paper traces back to. Edition of record: Robert M. Green
(tr.), *Commentary on the Effect of Electricity on Muscular Motion*,
Elizabeth Licht, Cambridge MA, 1953. **Strong.** `bioelectricity/`.

**Bernstein 1902**, "Untersuchungen zur Thermodynamik der bioelektrischen
Ströme. Erster Theil", *Pflüger's Arch.* 92(10–12), 521–562. Primary
statement of the membrane theory of bioelectricity (selective K⁺
permeability of the resting axon as the source of the resting potential).
The hypothesis Hodgkin–Huxley 1952 confirms quantitatively for the
resting state and refines for the action potential. **Strong.**
`bioelectricity/`.

**Hodgkin & Huxley 1952** — primary copy lives in
`membrane-biophysics/`. Pass-2 lists it here as cross-link. The
membrane biophysics primary set is *also* the bioelectricity primary
set; rather than duplicate, point.

**Levin 2014**, "Molecular bioelectricity: how endogenous voltage
potentials control cell behavior and instruct pattern regulation in vivo",
Michael Levin, *Mol. Biol. Cell* 25(24), 3835–3850. Field-defining review
of developmental bioelectricity. **Borderline** under the README rule:
review-tier rather than originator-tier. Pass-1 marked borderline and
flagged for pass-2 adjudication. Pass-2 promotes to canon under the
following narrow reading: Levin is the originator of the modern programme
that frames endogenous bioelectric gradients as instructive (rather than
merely reflective) signals in development, regeneration, and cancer; the
2014 *MBoC* paper is the named origin of that framing in print and is
cited in that role across the field. The promotion is conditional on
pass-3 also promoting at least one *primary* Levin lab paper (e.g.
Adams, Masi & Levin 2007, "H⁺ pump-dependent changes in membrane voltage
are an early mechanism necessary and sufficient to induce *Xenopus* tail
regeneration", *Development* 134(7), 1323–1335) so that the canon is not
review-only. **Conditional strong.** `bioelectricity/`. Cross-link to
`07-mind/` once that branch is opened, because Levin's framing also
underwrites the bioelectric basis-of-cognition research programme.

**Adams, Masi & Levin 2007**, "H⁺ pump-dependent changes in membrane
voltage are an early mechanism necessary and sufficient to induce
*Xenopus* tail regeneration", Dany S. Adams, Alessio Masi & Michael
Levin, *Development* 134(7), 1323–1335. Primary experimental
demonstration that altering membrane voltage *causes* regeneration. The
load-bearing primary paper for the Levin programme. **Strong.**
`bioelectricity/`.

Pass-1 listed three primary entries (Galvani, Bernstein, Levin reviews) +
Hodgkin–Huxley cross-link. Pass-2 expands to four primaries (Galvani,
Bernstein, Adams–Masi–Levin 2007, Levin 2014 conditional) + cross-link.
The Levin 2014 review survives as canon only because there is now an
actual primary alongside it. The Becker site-mirror and Becker
biographical material is binding-demoted to landscape (see §2).

### 1.4 Allosteric regulation

Two papers, two competing models, both originator-tier. The README's
worked example of the chemistry-biology boundary: both authors framed the
result as biological (regulation of enzyme activity), so both live here
rather than in chemistry.

**Monod, Wyman & Changeux 1965**, "On the nature of allosteric
transitions: a plausible model", Jacques Monod, Jeffries Wyman & Jean-
Pierre Changeux, *J. Mol. Biol.* 12(1), 88–118. Primary statement of the
concerted (MWC) model of allostery. The mechanism: oligomeric proteins
exist in two pre-existing conformations (T and R) in equilibrium, and
ligand binding shifts the equilibrium without changing the protomer
conformation independently. **Strong.** `allosteric-regulation/`.

**Koshland, Némethy & Filmer 1966**, "Comparison of experimental binding
data and theoretical models in proteins containing subunits", Daniel E.
Koshland Jr., G. Némethy & D. Filmer, *Biochemistry* 5(1), 365–385.
Primary statement of the sequential (KNF) model of allostery. The
mechanism: ligand binding at one site induces a local conformational
change that propagates to neighbouring subunits, with each subunit
changing conformation independently as it binds ligand. **Strong.**
`allosteric-regulation/`.

The two models are not equivalent and the modern view is that real
oligomeric proteins span the spectrum between them. Both are canon, and
the fact that they are rival models of the same phenomenon is itself a
load-bearing fact about how biophysics works (the canon does not pick
winners between rival originator papers; it holds both and lets the
downstream literature do the comparison).

### 1.5 Enzyme kinetics

The mathematical theory of enzyme catalysis. Three originator entries,
one of which is a borderline call.

**Michaelis & Menten 1913**, "Die Kinetik der Invertinwirkung", Leonor
Michaelis & Maud Menten, *Biochem. Z.* 49, 333–369. Primary statement of
the Michaelis–Menten rate equation. The 2011 Goody & Johnson translation
in *Biochemistry* 50(39), 8264–8269 is the modern English edition of
record. **Strong.** `enzyme-kinetics/`.

**Briggs & Haldane 1925**, "A note on the kinetics of enzyme action",
G. E. Briggs & J. B. S. Haldane, *Biochem. J.* 19(2), 338–339. Primary
derivation of the Michaelis–Menten equation under the steady-state
hypothesis (rather than the rapid-equilibrium hypothesis Michaelis &
Menten used). The form every modern textbook teaches is Briggs–Haldane,
not Michaelis–Menten. **Strong.** `enzyme-kinetics/`. Cross-link from
chemistry-pass-3 §5.3: the Briggs–Haldane steady-state hypothesis itself
is also a chemistry-kinetics tool with originator priority for the
steady-state in chemistry going to Bodenstein 1913 (chemistry canon). The
biology-side use of the steady-state is here; the chemistry-side
methodological tool is in chemistry. Both branches hold the relevant
primary and cross-link to the other.

**Cleland 1963**, "The kinetics of enzyme-catalyzed reactions with two or
more substrates or products. I. Nomenclature and rate equations", W. W.
Cleland, *Biochim. Biophys. Acta* 67, 104–137 (and parts II, 173–187 and
III, 188–196 in the same volume). Borderline. Cleland's nomenclature
(ordered, random, ping-pong) is the IUBMB-blessed standard for
multi-substrate enzyme kinetics and so clears the README's condition 3
(discipline-standard normative reference). Pass-2 promotes as borderline,
on the grounds that the nomenclature is foundations-tier-by-convention
even though the mechanism content is incremental over Michaelis–Menten +
Briggs–Haldane. **Borderline.** `enzyme-kinetics/`. Pass-3 may demote.

Pass-1 listed two entries (Michaelis–Menten, Briggs–Haldane). Pass-2
expands to three by adding Cleland 1963 as the multi-substrate primary.

### 1.6 Structural biology

The X-ray-crystallography era of biology — primary structures of DNA and
the canonical first proteins, plus the thermodynamic principle that
governs protein folding and the methodological foundations of molecular
dynamics. The sub-domain that gave biology its molecular eyes.

**Watson & Crick 1953**, "Molecular structure of nucleic acids: a
structure for deoxyribose nucleic acid", James D. Watson & Francis H. C.
Crick, *Nature* 171(4356), 737–738. The double-helix structure. Nobel
1962. **Strong.** `structural-biology/`. The companion *Nature* papers
in the same issue — Wilkins, Stokes & Wilson, "Molecular structure of
deoxypentose nucleic acids", *Nature* 171(4356), 738–740 and Franklin &
Gosling, "Molecular configuration in sodium thymonucleate", *Nature*
171(4356), 740–741 — are also originator-tier.

**Franklin & Gosling 1953**, "Molecular configuration in sodium
thymonucleate", Rosalind E. Franklin & R. G. Gosling, *Nature* 171(4356),
740–741. The X-ray fibre diffraction pattern (Photo 51 and the B-form
analysis) on which the Watson–Crick model depends for its experimental
confirmation. **Strong.** `structural-biology/`. The priority question
(Franklin's data was used by Watson & Crick before her independent
publication, with disputed degrees of authorisation) is a matter of
historical record, not of canon: pass-2 holds Watson–Crick 1953,
Franklin–Gosling 1953, and Wilkins, Stokes & Wilson 1953 as a co-equal
three-paper set, in the order they appeared in *Nature* 171 issue 4356.
Pass-3 should write the stub for the Franklin–Gosling entry to note the
priority history and cite Maddox's *Rosalind Franklin: The Dark Lady of
DNA* (HarperCollins 2002) as a landscape-tier biographical reference, not
as canon.

**Wilkins, Stokes & Wilson 1953**, "Molecular structure of deoxypentose
nucleic acids", M. H. F. Wilkins, A. R. Stokes & H. R. Wilson, *Nature*
171(4356), 738–740. The third paper of the *Nature* 171 trio.
**Strong.** `structural-biology/`. Wilkins shared the 1962 Nobel with
Watson and Crick; the 1953 *Nature* paper is the originator-tier piece on
the X-ray side.

**Pauling, Corey & Branson 1951**, "The structure of proteins: two
hydrogen-bonded helical configurations of the polypeptide chain", Linus
Pauling, Robert B. Corey & H. R. Branson, *PNAS* 37(4), 205–211. Primary
statement of the α-helix. Part of a seven-paper series in *PNAS* 37 (April
and May 1951): the seven papers cover the α-helix, the γ-helix, the
β-pleated-sheet, polypeptide chain configurations, the structure of
hair / muscle / silk, and the structure of synthetic polypeptides.
Pass-1 named the bundle. Pass-2 lists the α-helix paper (37(4), 205) as
the load-bearing one and the parallel/antiparallel β-sheet paper
(*PNAS* 37(11), 729–740, "The pleated sheet, a new layer configuration of
polypeptide chains", Pauling & Corey) as co-canon. The other five
*PNAS* 37 papers are landscape-tier supporting. Cross-link from
chemistry-pass-3 §5.3, where the Pauling–Corey work is acknowledged but
explicitly placed on the biophysics side because Pauling framed it as
molecular biology. **Strong.** `structural-biology/`.

**Kendrew, Bodo, Dintzis, Parrish, Wyckoff & Phillips 1958**, "A three-
dimensional model of the myoglobin molecule obtained by X-ray analysis",
J. C. Kendrew, G. Bodo, H. M. Dintzis, R. G. Parrish, H. Wyckoff & D. C.
Phillips, *Nature* 181(4610), 662–666. First crystal structure of a
protein. Nobel 1962. **Strong.** `structural-biology/`. Companion:
Kendrew, Dickerson, Strandberg, Hart, Davies, Phillips & Shore 1960,
"Structure of myoglobin: a three-dimensional Fourier synthesis at 2 Å
resolution", *Nature* 185(4711), 422–427 is the higher-resolution
follow-up; pass-2 cites it as a co-entry but not separately.

**Perutz, Rossmann, Cullis, Muirhead, Will & North 1960**, "Structure of
haemoglobin: a three-dimensional Fourier synthesis at 5.5-Å resolution
obtained by X-ray analysis", M. F. Perutz, M. G. Rossmann, A. F. Cullis,
H. Muirhead, G. Will & A. C. T. North, *Nature* 185(4711), 416–422. First
crystal structure of haemoglobin (the four-subunit allosteric protein
later explained by MWC and KNF). **Strong.** `structural-biology/`.
Cross-link from `allosteric-regulation/`.

**Anfinsen 1973**, "Principles that govern the folding of protein chains",
Christian B. Anfinsen, *Science* 181(4096), 223–230. The thermodynamic
hypothesis of protein folding: the native state of a small globular
protein is the thermodynamic minimum of its free energy, fully determined
by its amino acid sequence. The Anfinsen Nobel lecture (Nobel 1972).
**Strong.** `structural-biology/`. Cross-link from chemistry-pass-3 §5.3.

**Karplus & McCammon 1977**, "Dynamics of folded proteins", J. Andrew
McCammon, Bruce R. Gelin & Martin Karplus, *Nature* 267(5612), 585–590.
First molecular-dynamics simulation of a protein (bovine pancreatic
trypsin inhibitor). The methodological origin of computational structural
biology. Karplus shared the 2013 Nobel in Chemistry. **Strong.**
`structural-biology/`. Cross-link from chemistry-pass-3 §6 (Karplus's
multiscale-model work is also chemistry canon).

**Sharp & Honig 1990**, "Electrostatic interactions in macromolecules:
theory and applications", Kim A. Sharp & Barry Honig, *Annu. Rev.
Biophys. Biophys. Chem.* 19, 301–332. Pass-1 listed "Kim Sharp 1991
(electrostatics)" without a precise citation; pass-2 verifies that the
load-bearing reference is the 1990 *Annual Review* (the Poisson–Boltzmann
treatment of biomolecular electrostatics underlying DelPhi and its
successors). **Borderline** — review-tier rather than originator-tier;
pass-3 may demote in favour of the underlying primary papers (Honig &
Nicholls 1995, *Science* 268, 1144–1149 is one candidate primary). Pass-2
includes for completeness but does not insist. `structural-biology/`.

Pass-1 listed four entries (Watson–Crick, Pauling–Corey, Kendrew,
Anfinsen). Pass-2 expands to nine by adding Franklin–Gosling 1953 +
Wilkins–Stokes–Wilson 1953 as Watson–Crick co-canon, by adding the β-sheet
paper alongside the α-helix paper, by adding Perutz et al. 1960 as the
haemoglobin primary (this is the protein later explained by MWC/KNF), by
adding Karplus & McCammon 1977 as the molecular-dynamics origin, and by
adding the Sharp & Honig 1990 borderline.

### 1.7 Photobiology

The biology side of how light interacts with living systems. The
chemistry-side primaries (Stark–Einstein, Förster) live in
`03-chemistry/photochemistry/`; the biology-side primaries (Wald, Emerson–
Arnold, Calvin, Hill) live here.

**Wald 1933**, "Vitamin A in the retina", George Wald, *Nature* 132(3335),
316–317. Origin of the rhodopsin lineage — the demonstration that visual
pigment contains vitamin A and that vision is therefore a photochemical
process. The 1967 Nobel was awarded to Wald, Granit, and Hartline for
the consequent visual-physiology programme. **Strong.** `photobiology/`.

**Hartline 1938**, "The response of single optic nerve fibers of the
vertebrate eye to illumination of the retina", H. K. Hartline, *Am. J.
Physiol.* 121(2), 400–415. The neural-side companion to Wald: single-
fibre recordings showing that retinal ganglion cells respond to specific
patterns of illumination. Co-Nobel 1967. **Borderline** — pass-2
promotes because the Wald and Hartline programmes are jointly the founding
work for the neuroscience of vision and demoting one without the other
gives a misleading silhouette. Pass-3 may judge Hartline as more properly
`07-mind/sensory-systems/` once that branch is opened.
`photobiology/`.

**Emerson & Arnold 1932**, "The photochemical reaction in
photosynthesis", Robert Emerson & William Arnold, *J. Gen. Physiol.*
16(2), 191–205. The photosynthetic-unit concept: chlorophyll molecules
are organized into co-operating photosynthetic units rather than acting
individually. The number Emerson & Arnold derive (~2500 chlorophylls per
O₂ evolved) is the founding empirical fact of photosynthesis quantum
yield. **Strong.** `photobiology/`.

**Hill 1937**, "Oxygen evolved by isolated chloroplasts", Robert Hill,
*Nature* 139(3525), 881–882. The Hill reaction: isolated chloroplasts
evolve O₂ in light when given an artificial electron acceptor, separating
the photochemical (light) and dark reactions of photosynthesis. The
experimental wedge for the two-photosystem picture that follows.
**Strong.** `photobiology/`.

**Bassham, Benson & Calvin 1950**, "The path of carbon in photosynthesis.
VIII. The role of malic acid", James A. Bassham, Andrew A. Benson &
Melvin Calvin, *J. Biol. Chem.* 185(2), 781–787 (and the larger 1948–
1954 *J. Am. Chem. Soc.* and *J. Biol. Chem.* series of Calvin lab papers
under the running title "The path of carbon in photosynthesis I–XIX").
Pass-1 left "Calvin and collaborators 1950s" as a placeholder pending
curation. Pass-2 names the load-bearing paper of the series (the malic
acid paper, Paper VIII) and the running-title bundle as a whole. The
Calvin 1962 Nobel Lecture, "The path of carbon in photosynthesis",
*Nobel Lectures, Chemistry 1942–1962*, Elsevier, 1964, 618–644, is the
edition-of-record synthesis. Nobel 1961. **Strong** (the bundle).
`photobiology/`. Pass-3 is invited to curate the full Paper-I-through-
XIX series; pass-2 commits only to the bundle as canon.

**Förster 1948** — primary copy lives in
`03-chemistry/photochemistry/` (chemistry pass-3 §4.4 promotes). Pass-2
lists as cross-link. The Förster resonance energy transfer mechanism
underlies photosynthetic light-harvesting and biophysical fluorescence
assays; the originator paper (T. Förster, "Zwischenmolekulare
Energiewanderung und Fluoreszenz", *Annalen der Physik (6)* 2, 55–75,
1948) lives in chemistry. Cite from there.

**Stark–Einstein photoequivalence law** — primary copies (Stark 1908,
Einstein 1912) live in `03-chemistry/photochemistry/`. Pass-2 lists as
cross-link.

Pass-1 listed five entries (Stark–Einstein cross-link, Emerson–Arnold,
Calvin placeholder, Wald, Hartline borderline) + Förster. Pass-2 expands
to seven by naming the Calvin Paper VIII as the bundle's load-bearing
entry, by adding Hill 1937 as separately load-bearing, and by tightening
the cross-link statements to Förster and Stark–Einstein.

### 1.8 Radiation biology

**Roentgen 1895** — primary copy in `02-physics/`. Pass-2 lists as
cross-link. The 1895 *Sitzungsberichte der Physikalisch-Medicinischen
Gesellschaft zu Würzburg*, "Über eine neue Art von Strahlen", is physics.
Its biological consequences are this sub-domain's subject matter.

**Hevesy 1923**, "The absorption and translocation of lead by plants
investigated by the aid of thorium B", George de Hevesy, *Biochem. J.*
17(4–5), 439–445. Founding paper of the radioactive-tracer method in
biology. Nobel 1943. **Strong.** `radiation-biology/`. The mechanism
justification is strong: every subsequent isotope-tracing paper in
biology (autoradiography, PET, ¹⁴C-glucose metabolism, Calvin's own
photosynthesis work) depends on the Hevesy method.

**Lea 1946**, *Actions of Radiations on Living Cells*, Cambridge
University Press, Cambridge. The first systematic monograph on radiation
biology — target theory, the dose-response curve, the LET concept.
Borderline under §3 of the README's promotion rule: pass-2 promotes
because Lea's monograph is the discipline's normative reference for the
quantitative treatment of radiation effects, in the way Cleland 1963 is
for enzyme nomenclature. **Borderline.** `radiation-biology/`. Pass-3
may demote and substitute the Crowther / Timoféef-Ressovsky / Zimmer /
Delbrück 1935 paper ("Über die Natur der Genmutation und der Genstruktur",
*Nachrichten der Gesellschaft der Wissenschaften zu Göttingen,
Mathematisch-Physikalische Klasse, Fachgruppe VI, Biologie, Neue Folge*
1, 189–245) — the "Three-Man Paper" that is the originator of target
theory — as a primary substitute.

**Dadachova et al. 2007**, "Ionizing radiation changes the electronic
properties of melanin and enhances the growth of melanized fungi",
Ekaterina Dadachova, Ruth A. Bryan, Xianchun Huang, Tiffany Moadel, Andrew
D. Schweitzer, Philip Aisen, Joshua D. Nosanchuk & Arturo Casadevall,
*PLoS ONE* 2(5), e457. The modern primary for the radiosynthesis claim
(melanin acting as an energy-transducing pigment under ionising
radiation). **Strong.** `radiation-biology/`. Pass-2 retains the
radiosynthesis material here under radiation-biology rather than at a
separate `radiosynthesis/` folder; the existing `radiosynthesis/` folder
contents (one SEED.md) fold in (see §2).

Pass-1 listed three entries (Roentgen cross-link, Hevesy, Dadachova).
Pass-2 expands to four by adding Lea 1946 as the discipline-normative
monograph for radiation biology.

### 1.9 Peptides-and-proteins

The originator papers of protein sequencing and synthesis. Pass-1
recommended a full demotion of the existing `peptides/` folder
(longevity-pharmacology compound families) and the opening of a new clean
`peptides-and-proteins/` containing only Sanger / Merrifield / Du
Vigneaud. Pass-2 ratifies that recommendation and populates.

**Sanger 1955**, "The terminal peptides of insulin", Frederick Sanger &
Hans Tuppy, *Biochem. J.* 49(4), 481–490 (1951) is one of the early
papers in the series; "The amino-acid sequence in the glycyl chain of
insulin. I", Sanger & E. O. P. Thompson, *Biochem. J.* 53(3), 353–366
(1953); "II. The investigation of peptides from enzymic hydrolysates",
*Biochem. J.* 53(3), 366–374 (1953); "The amino-acid sequence in the
phenylalanyl chain of insulin. I", Sanger & Tuppy, *Biochem. J.* 49(4),
463–481 (1951). The 1955 capstone — Ryle, Sanger, Smith & Kitai, "The
disulphide bonds of insulin", *Biochem. J.* 60(4), 541–556 (1955) — gives
the complete primary structure of insulin including the disulphide
bridges. Pass-2 cites the bundle (1951–1955) and names the Ryle, Sanger,
Smith & Kitai 1955 paper as the load-bearing capstone. First complete
primary structure of any protein. Nobel 1958 (chemistry). **Strong.**
`peptides-and-proteins/`.

**Du Vigneaud, Ressler, Swan, Roberts, Katsoyannis & Gordon 1953**, "The
synthesis of an octapeptide amide with the hormonal activity of
oxytocin", Vincent du Vigneaud, Charlotte Ressler, John M. Swan, Carleton
W. Roberts, Panayotis G. Katsoyannis & Samuel Gordon, *J. Am. Chem. Soc.*
75(19), 4879–4880. First synthesis of a polypeptide hormone. Nobel 1955
(chemistry). **Strong.** `peptides-and-proteins/`. Cross-link from
`03-chemistry/`. Pass-2 places the canonical entry here rather than in
chemistry on the originator-framing rule: du Vigneaud framed the result
as a biochemistry-of-hormones result, even though the technique is
chemistry.

**Merrifield 1963**, "Solid phase peptide synthesis. I. The synthesis of
a tetrapeptide", R. B. Merrifield, *J. Am. Chem. Soc.* 85(14), 2149–2154.
The methodological foundation of modern peptide and protein synthesis.
Nobel 1984 (chemistry). **Strong.** `peptides-and-proteins/`. Cross-link
from `03-chemistry/`.

Pass-1 listed three entries; pass-2 keeps three. The list is complete
for the sub-domain at the foundations tier. The existing
`peptides/primary-papers.*` files (BPC-157, MOTS-c, GHK-Cu, SS-31, etc.)
are not promoted — they are pharmacology-of-bioactive-peptides, not
biophysics canon. They migrate to `_landscape/peptide-pharmacology.md`
per pass-1 recommendation, ratified by pass-2 in §2 below.

### 1.10 Melanin (kept, narrowed)

Pass-1 kept the folder under the `melanin/` name with the
recommendation to narrow to originator papers; pass-2 ratifies and
populates.

**Raper 1928**, "The aerobic oxidases", H. S. Raper, *Physiol. Rev.* 8(2),
245–282. Primary statement of melanin biosynthesis (the Raper–Mason
pathway: tyrosine → DOPA → dopaquinone → melanin). **Strong.** `melanin/`.

**Mason 1948**, "The chemistry of melanin. III. Mechanism of the oxidation
of dihydroxyphenylalanine by tyrosinase", Howard S. Mason, *J. Biol.
Chem.* 172(1), 83–99. Primary biochemical mechanism of tyrosinase.
Pass-1 left "Mason 1959" as a placeholder pending verification; pass-2
verifies and substitutes the actual Mason primary, which is the 1948
*J. Biol. Chem.* paper, not a 1959 reference. The 1959 date in pass-1
appears to have been a transcription confusion with the Mason 1959
*Annu. Rev. Biochem.* review, which is landscape-tier. **Strong.**
`melanin/`.

**McGinness, Corry & Proctor 1974**, "Amorphous semiconductor switching
in melanins", J. McGinness, P. Corry & P. Proctor, *Science* 183(4127),
853–855. Melanin as a biological amorphous semiconductor — the entry
that gives the melanin sub-domain its biophysics-as-distinct-from-
biochemistry character. **Strong.** `melanin/`.

**Meredith & Sarna 2006**, "The physical and chemical properties of
eumelanin", Paul Meredith & Tadeusz Sarna, *Pigment Cell Res.* 19(6),
572–594. Borderline. The modern review that integrates the Raper–Mason
pathway, the McGinness–Corry–Proctor semiconductor model, and the
nano-aggregate structural model into a single biophysical picture of
melanin. Pass-2 includes as borderline; pass-3 should adjudicate against
underlying primary papers (Watt, Bothma & Meredith 2009, *Soft Matter* 5,
3754–3760 on the nano-aggregate structure). **Borderline.** `melanin/`.

The Solís-Herrera "human photosynthesis" entries from the existing
`melanin/primary-papers.md` are explicitly demoted to
`_landscape/contested.md` per pass-1 recommendation, ratified by pass-2 in
§2.

### 1.11 Spine totals

| Sub-domain | Pass-1 entries | Pass-2 entries | Notes |
|---|---:|---:|---|
| Membrane biophysics | 4 | 6 | Patch-clamp originators added |
| Bioenergetics | 6 | 8 | Margulis 1967, Abrahams 1994 added |
| Bioelectricity | 4 | 5 | Adams–Masi–Levin 2007 added |
| Allosteric regulation | 2 | 2 | Same |
| Enzyme kinetics | 2 | 3 | Cleland 1963 added (borderline) |
| Structural biology | 4 | 9 | Franklin–Gosling, Wilkins, β-sheet, Perutz, Karplus–McCammon, Sharp–Honig added |
| Photobiology | 5 | 7 | Hill 1937 added; Calvin Paper VIII named |
| Radiation biology | 3 | 4 | Lea 1946 added (borderline) |
| Peptides-and-proteins | 3 | 3 | Same |
| Melanin | 3 | 4 | Meredith–Sarna added (borderline) |
| **Total** | **36** | **51** | |

Pass-2 spine count: **51 entries** across **10 sub-domains**, of which
**42 are strong** and **9 are borderline** (Cleland 1963, Levin 2014,
Hartline 1938, Sharp–Honig 1990, Lea 1946, Meredith–Sarna 2006, Wilkins–
Stokes–Wilson 1953 if counted as separate from Watson–Crick rather than
co-canon, Franklin–Gosling 1953 likewise) — pass-3 may flip any of these
either way.

The single most-load-bearing entries (the ones biophysics simply cannot
do without) are Hodgkin–Huxley 1952 (paper V), Mitchell 1961, Watson–
Crick 1953 + Franklin–Gosling 1953, Anfinsen 1973, Monod–Wyman–Changeux
1965, and Michaelis–Menten 1913. Six papers, all from before 1973. The
modern era has added many entries of structural and methodological
importance, but the foundations of biophysics are largely a mid-twentieth-
century settlement.

---

## 2. Adjudicating the existing sub-folders' fate — binding pass-2 calls

Pass-1 made proposals; pass-2 makes binding calls (still no actual rename
or delete; that remains a maintainer execution step). Each call below
includes (a) the binding decision, (b) what survives and where it goes,
(c) what is demoted and where it goes, (d) what bead the maintainer files
to execute the call.

### 2.1 `becker/` — **demote**

Pass-1 finding: biographical dossier on a 20th-century researcher, not
mechanism-canon. The 419 MB site-mirror is provenance, not foundation.
The folder name violates the chemistry-branch convention.

Pass-2 binding call: **demote**. Becker 1985 *The Body Electric* is a
landscape-tier popular book and the folder is built around it.

What survives:
- `becker/papers.bib` survives wholesale, moves to
  `bioelectricity/becker-papers.bib` as a bibliography-of-Becker-papers
  alongside the canon. It is *bibliography*, not *index of canon*.
- `becker/lineage.md` survives wholesale, moves to
  `bioelectricity/becker-lineage.md` (renamed from `lineage.md` to
  disambiguate from the bioelectric-lineage canon material).
- `becker/site-mirror/2026-04-23/` survives in place on disk; a pointer
  file `_sources/becker-archive.md` points at it for provenance. The
  pointer file states explicitly that the site-mirror is not canon and
  has not been promoted.

What demotes:
- `becker/biography.md` and `becker/books.md` move to
  `_landscape/textbooks.md` as entries for Becker 1985 *The Body
  Electric*, Becker 1990 *Cross Currents*, and Becker's biographical
  context. Becker 1985 is named in the README under the existing
  textbooks list and pass-2 ratifies.
- `becker/CANON_INDEX.md` is replaced by the `_landscape/` and
  `_sources/` pointers; the file itself does not migrate (it was a
  per-folder canon index for a folder that no longer exists at canon
  tier).

Maintainer bead: `bkt-canon-biophysics-execute-becker-demote`. One
file move (papers.bib), one rename (lineage.md → becker-lineage.md),
two new pointer files, one CANON_INDEX.md deletion. The site-mirror
stays where it is on disk.

### 2.2 `bioelectric-lineage/` — **fold into `bioelectricity/`**

Pass-1 finding: best of the existing sub-folders; closest to mechanism-
named canon already; the rename is cosmetic but worth doing.

Pass-2 binding call: **fold wholesale into `bioelectricity/`**. The
folder rename is also a content reorganization: `ARC.md`, `cross-refs.md`,
`primary-papers.md`, `primary-papers.bib`, `primary-papers.yaml`,
`queries.txt`, and `CANON_INDEX.md` all move into the new
`bioelectricity/` folder. Pass-2 verifies the existing primary-papers
content cites Galvani and Bernstein at originator-tier; those entries are
promoted into `bioelectricity/CANON_INDEX.md` as written by pass-3.

What survives: everything in the folder.

What demotes: nothing.

Maintainer bead: `bkt-canon-biophysics-execute-bioelectric-rename`. One
folder rename (`bioelectric-lineage/` → `bioelectricity/`), then a
content-merge with the demoted Becker material from §2.1.

### 2.3 `melanin/` — **keep, narrow**

Pass-1 finding: keep, narrow to originator papers, drop Solís-Herrera
to `_landscape/contested.md`.

Pass-2 binding call: **keep the folder name and the folder, narrow the
contents** to Raper 1928, Mason 1948, McGinness–Corry–Proctor 1974, and
Meredith–Sarna 2006 (borderline). Per §1.10 above.

What survives:
- The originator-tier entries listed above survive at canon tier.
- `melanin/lineage.md` survives as a curator-commentary file (the
  historical lineage of melanin biophysics is informative even if the
  bib entries themselves are independently canon).
- `melanin/SEED.md` survives in `_intake/` as a pre-pass-2 intake memo.

What demotes:
- The Solís-Herrera "human photosynthesis" entries move to
  `_landscape/contested.md` with explicit annotation that the claims
  are not mechanism-canon and that Bucket records them as
  contested-and-flagged rather than ignoring them.
- The `radiosynthesis` sub-theme overlap moves to `radiation-biology/`
  per §2.6.
- The neuromelanin sub-theme moves to `_landscape/peptide-and-pigment-
  pharmacology.md` (or stays in `melanin/lineage.md` as commentary —
  pass-3 to decide).
- `melanin/primary-papers.md`, `.bib`, `.yaml` files are pruned (not
  deleted) to retain only the canon-tier entries; the dropped entries
  are recorded in a `melanin/_demoted.md` audit trail.

Maintainer bead: `bkt-canon-biophysics-execute-melanin-narrow`. A
content-prune (not a folder rename), with explicit audit trail of what
is dropped from canon and why.

### 2.4 `mitochondria/` — **fold into `bioenergetics/`**

Pass-1 finding: fold the canon material (sub-themes 1–7) into
`bioenergetics/`; move the contested Kruse-adjacent material (sub-themes
8 ELF, 9 deuterium, 10 Nick Lane) to `_sources/kruse-index.md` and
`_landscape/textbooks.md` respectively.

Pass-2 binding call: **fold wholesale into `bioenergetics/`** with
selective demotion of the Kruse-adjacent sub-themes.

What survives:
- Endosymbiosis content (Margulis 1967 originator paper) → 
  `bioenergetics/CANON_INDEX.md`.
- Chemiosmosis content (Mitchell 1961) → `bioenergetics/CANON_INDEX.md`.
- mtDNA, COX enzymology, signaling, biogenesis, dynamics sub-themes →
  `bioenergetics/CANON_INDEX.md` if they cite originator-tier primaries
  (pass-3 to verify per-sub-theme); demoted to landscape if they do not.
- `mitochondria/lineage.md` survives as `bioenergetics/mitochondria-
  lineage.md`.

What demotes:
- "ELF / bioelectric coupling" sub-theme → `_sources/kruse-index.md`.
  Kruse-corpus topic filed under a mitochondria header without
  originator-tier backing in this sub-folder. Bucket's job is not to
  decide whether ELF coupling to mitochondria is true; Bucket's job is
  to refuse to promote secondary commentary as canon.
- "Deuterium depletion / isotope effects" sub-theme → 
  `_sources/kruse-index.md` for the curator-commentary content;
  the actual isotope-effect primary literature (Klinman lab, e.g.
  J. P. Klinman 1989, *Annu. Rev. Biochem.* 58, 207–232 on
  hydrogen-tunnelling in enzyme reactions) is *not yet promoted*; pass-3
  may add a `bioenergetics/isotope-effects.md` sub-entry if a reviewer
  finds an originator-tier primary that earns promotion.
- "Nick Lane synthesis" sub-theme → `_landscape/textbooks.md`. Lane
  2005 *Power, Sex, Suicide* and Lane 2015 *The Vital Question* are
  popular synthesis, not originator-tier mechanism statements. Pass-1
  ratified the existing `mitochondria/CANON_INDEX.md`'s self-classification
  of Lane as "landscape-adjacent edition-of-record"; pass-2 ratifies
  again.

Maintainer bead: `bkt-canon-biophysics-execute-mitochondria-fold`. A
content-merge into `bioenergetics/` with three explicit demotions and a
Kruse-curated content move into `_sources/kruse-index.md`.

### 2.5 `peptides/` — **demote wholesale**

Pass-1 finding: most Kruse-shaped folder in the branch and the single
most-mismatched-to-MANIFESTO. Honest move is to demote the folder to
`_landscape/peptide-pharmacology.md` (or to `gdrive:longevity-canon/`)
entirely and, separately, open `peptides-and-proteins/` containing only
Sanger / Merrifield / Du Vigneaud.

Pass-2 binding call: **demote wholesale** per pass-1 recommendation.
The compound-family material (Khavinson bioregulators, BPC-157, MOTS-c,
GHK-Cu, SS-31, TB-500, Semax/Selank, GHRPs, CJC-1295, Cerebrolysin,
Melanotan-II) is pharmacology-of-bioactive-peptides; it is canon-adjacent
under the longevity-canon (gdrive) but not under the biophysics canon.

What survives:
- The `peptides-and-proteins/` folder is opened fresh per §1.9 with three
  entries (Sanger 1955, Du Vigneaud 1953, Merrifield 1963).
- `peptides/SEED.md` survives in `_intake/peptides-seed-2026-04-23.md` as
  the pre-pass-2 intake memo (it is informative for tracking how the
  branch was originally seeded).

What demotes:
- All compound-family entries → `_landscape/peptide-pharmacology.md`.
- `peptides/primary-papers.md`, `.bib`, `.yaml` are not deleted; they
  move into `_landscape/peptide-pharmacology.bib` and serve as the
  bibliography for the landscape entry.
- `peptides/CANON_INDEX.md` is replaced by the landscape pointer.
- The compound-family primary-paper PDFs (if any) are gdrive-mirrored
  to `gdrive:AGFarms/Nucleus/research/longevity-canon/_sources/peptide-
  pharmacology/` per the longevity-canon contract; pass-2 does not
  execute this gdrive sync, but flags it as a maintainer task.

Pass-2 contests one part of the pass-1 reasoning. Pass-1 §5 left open the
question of whether the existing compound-family material has biophysics-
canon entries hidden inside (SS-31 / cardiolipin work, MOTS-c primary
discovery paper). Pass-2 examined the `peptides/primary-papers.md`
content and confirms there are no originator-tier biophysics primaries
hidden in the compound families: SS-31 (the Szeto lab cardiolipin-
binding peptide) is a single-lab pharmacological development whose
mechanism paper (Szeto 2014, *Br. J. Pharmacol.* 171(8), 2029–2050) is
review-tier; MOTS-c (the Lee lab mitochondrial-derived peptide) primary
discovery paper (Lee, Zeng, Yen, et al. 2015, *Cell Metab.* 21(3), 443–
454) is a discovery-of-a-novel-peptide paper, not a foundations-of-
biophysics paper. Both belong in landscape, not canon. Pass-2 closes
that pass-1 open question with a "no, nothing is hidden, demote
wholesale".

Maintainer bead: `bkt-canon-biophysics-execute-peptides-demote`. One
folder demotion (entire `peptides/` content → `_landscape/peptide-
pharmacology.md` + bib), one new folder open (`peptides-and-proteins/`
with three entries), one gdrive sync (longevity-canon).

### 2.6 `radiosynthesis/` — **fold into `radiation-biology/`**

Pass-1 finding: thin (one file), well-targeted citations. Fold into
`radiation-biology/` with Hevesy 1923 added as the foundation entry.

Pass-2 binding call: **fold wholesale into `radiation-biology/`**.

What survives:
- `radiosynthesis/SEED.md` → `radiation-biology/_intake/radiosynthesis-
  seed-2026-04-23.md` as the pre-pass-2 intake memo.
- The Dadachova 2007 entry is promoted into `radiation-biology/
  CANON_INDEX.md` per §1.8.
- The Hohmann-Marriott & Blankenship 2011 reference (referenced in the
  SEED) is candidate landscape-tier and pass-3 should adjudicate.

What demotes:
- The Bazilevskaya 2008 and Shaviv 2002 references in the SEED are
  cosmology / palaeoclimate, not biophysics; they cross-link to
  `06-cosmology/` (when that branch is opened) rather than living here.
- The Solís-Herrera reference moves to `_landscape/contested.md`
  (consistent with §2.3).

Maintainer bead: `bkt-canon-biophysics-execute-radiosynthesis-fold`. One
folder rename (`radiosynthesis/` content → `radiation-biology/`), one
SEED migration to `_intake/`, one cross-link memo for the cosmology /
palaeoclimate references.

### 2.7 Summary table

| Existing | Binding call | New location | Demotion |
|---|---|---|---|
| `becker/` | demote | `_landscape/textbooks.md` + `_sources/becker-archive.md` + `bioelectricity/becker-papers.bib` + `bioelectricity/becker-lineage.md` | wholesale |
| `bioelectric-lineage/` | rename + fold | `bioelectricity/` | none |
| `melanin/` | keep, narrow | `melanin/` | Solís-Herrera → contested; neuromelanin → landscape |
| `mitochondria/` | fold | `bioenergetics/` | ELF, deuterium → kruse-index; Lane → textbooks |
| `peptides/` | demote wholesale | `_landscape/peptide-pharmacology.md` + new `peptides-and-proteins/` (3 entries) | all compound families |
| `radiosynthesis/` | fold | `radiation-biology/` | Bazilevskaya, Shaviv → cross-link to cosmology |

---

## 3. Holding the Kruse positioning line

The pass-1 binding rule, restated and tightened by pass-2:

The Kruse Index is a curated corpus at the same epistemic tier as PubMed
and PubChem. A useful retrieval surface over secondary literature; not a
producer of foundations. **A Kruse article is never canon. The originator
paper Kruse cites is.** Kruse-curated commentary lives in
`_sources/kruse-index.md` as a pointer plus search-recipe note, never in
a mechanism-named sub-folder. Where Kruse's writing flags an
underdeveloped foundational claim — mitochondrial light-coupling, melanin
electronics, deuterium isotope effects, ELF bioelectric coupling, the
biophysics of leptin signalling, the photobiology of the suprachiasmatic
nucleus — Bucket's job is to find the originator paper and file *that*
under the relevant mechanism-named sub-folder. Kruse's commentary on the
originator paper stays at the `_sources/` tier.

Pass-2 verification: every entry promoted in §1 above is an originator
paper from the primary literature, not a Kruse-curated commentary. The
`_intake/` review of all pass-2 entries against the existing
`mitochondria/primary-papers.md`, `melanin/primary-papers.md`,
`peptides/primary-papers.md`, `bioelectric-lineage/primary-papers.md`,
and `becker/papers.bib` confirms that no Kruse-curated commentary has
been smuggled into pass-2 canon under the cover of being mechanism-tier.
The Kruse-curated content that *is* load-bearing (the demoted ELF,
deuterium, neuromelanin, BPC-157, etc. material) is binding-demoted to
`_sources/kruse-index.md` and `_landscape/` per §2.

The rule has one further tightening pass-2 adds. Pass-1 said "Kruse's
commentary on the originator paper stays at the `_sources/` tier."
Pass-2 adds: **a Kruse commentary on an originator paper does not
substitute for the maintainer's own reading of that originator paper.**
A canon entry stub (the per-paper file the maintainer writes when
populating `CANON_INDEX.md`) cites the originator paper directly. The
Kruse commentary may be cited *alongside* the originator paper as a
landscape-tier secondary, but the foundational mechanism statement in
the stub must be drawn from the primary, not paraphrased from Kruse.
This rule applies symmetrically to PubMed abstracts, Wikipedia summaries,
and Lehninger / Alberts / Stryer textbook treatments: stubs cite the
primary, full stop. Secondary sources are landscape-tier *acknowledged
support* in stubs, never *foundation*.

This rule aligns the branch to the MANIFESTO without making the branch
hostile to Kruse. Kruse remains a load-bearing curator at the curator
tier. The Kruse Index continues to function as one of the branch's
named retrieval surfaces (alongside PubMed, PubChem, and — once they're
written — `_sources/cosmology-arxiv.md`, `_sources/info-arxiv.md`,
etc.).

---

## 4. Cross-branch coherence map

Pass-1 §5.2 escalated the cross-branch question of whether `_sources/`
is a 05-biophysics-specific pattern or a cross-branch pattern. Pass-2
takes the position that `_sources/` is a cross-branch pattern (every
branch needs a `_sources/` for its discipline-standard retrieval
surfaces) but does not execute that cross-branch decision (that is a
maintainer / pillar-lead call). Pass-2 instead documents the cross-link
table for biophysics specifically.

### 4.1 Chemistry (`03-chemistry/`)

The chemistry-pass-3 §5.3 boundary table is the operative agreement.
Pass-2 reproduces it from the biophysics side and adds the entries pass-2
promotes that were not on the chemistry-pass-3 table.

| Biophysics entry | Chemistry-side cross-link | Justification |
|---|---|---|
| Mitchell 1961 (`bioenergetics/`) | `03-chemistry/electron-transfer/` (Marcus 1956 lives there) | Chemistry's electron-transfer canon is the prerequisite for understanding the mitochondrial respiratory chain Mitchell explains; cite Marcus from chemistry, Mitchell from biophysics |
| Michaelis–Menten 1913 (`enzyme-kinetics/`) | `03-chemistry/kinetics/` (Bodenstein 1913 lives there) | The steady-state hypothesis is a chemistry-kinetics tool; Briggs–Haldane's biology-side use is here, Bodenstein's chemistry-side originator is in chemistry |
| Briggs–Haldane 1925 (`enzyme-kinetics/`) | `03-chemistry/kinetics/` | Same |
| Pauling–Corey–Branson 1951 (`structural-biology/`) | `03-chemistry/quantum-chemistry/` (Pauling's *Nature of the Chemical Bond* lives there) | Pauling framed the α-helix as molecular biology; cite from biophysics, but the hydrogen-bonding chemistry that justifies the helix is in chemistry |
| Anfinsen 1973 (`structural-biology/`) | `03-chemistry/thermodynamics/` (free-energy minimization is the chemistry primitive) | Anfinsen framed the result as biology; cite from biophysics |
| Karplus & McCammon 1977 (`structural-biology/`) | `03-chemistry/quantum-chemistry/` (Karplus' multiscale-model Nobel work) | Karplus' Nobel was in chemistry; the protein-MD primary is biology |
| Sanger 1955 (`peptides-and-proteins/`) | `03-chemistry/` | Sanger's Nobel was chemistry; the result is the first complete protein primary structure (biology) |
| Du Vigneaud 1953 (`peptides-and-proteins/`) | `03-chemistry/` | Same |
| Merrifield 1963 (`peptides-and-proteins/`) | `03-chemistry/` | Same |
| Förster 1948 (`photobiology/` cross-link) | `03-chemistry/photochemistry/` (originator copy) | Chemistry pass-3 §4.4 promotes the originator; biophysics points |
| Stark 1908 / Einstein 1912 (`photobiology/` cross-link) | `03-chemistry/photochemistry/` (originator copies) | Same |

### 4.2 Physics (`02-physics/`)

The physics-pass-1 §1 inventory establishes the QM canon that biophysics
inherits from. Pass-2 cross-links:

| Biophysics entry | Physics-side cross-link | Justification |
|---|---|---|
| Hodgkin–Huxley 1952 (`membrane-biophysics/`) | `02-physics/quantum-mechanics/` (Schrödinger 1926, Born 1926 for the underlying QM that ion-channel kinetics inherits) | The action-potential equations are classical, but the ion-channel single-channel kinetics that underlie them are quantum-mechanical at the level of selectivity-filter coordination chemistry. Cross-link is for the Hill-level quantum context, not for derivation. |
| Roentgen 1895 (`radiation-biology/` cross-link) | `02-physics/electromagnetism/` (originator copy) | Roentgen lives in physics; biophysics points |
| Mitchell 1961 (`bioenergetics/`) | `02-physics/thermodynamics/` (Helmholtz, Clausius, Carnot for the free-energy primitives) | The chemiosmotic mechanism is a thermodynamic mechanism; the free-energy primitives are physics canon |
| Wald 1933 / Hartline 1938 (`photobiology/`) | `02-physics/quantum-mechanics/` (Einstein 1905 photoelectric for the photon-absorption primitive) | The biology of vision starts with single-photon absorption events; the photon-absorption primitive is physics canon |

### 4.3 Mind (`07-mind/`) — branch not yet opened

Anticipated cross-links pass-3 should table once `07-mind/` exists:

- Hodgkin–Huxley 1952 → 07-mind: foundational for any computational
  theory of the neuron (Marr 1982 *Vision*, Friston free-energy
  framework, the Bialek–Bouton sensory-coding lineage).
- Levin 2014 / Adams–Masi–Levin 2007 → 07-mind: the bioelectric basis-
  of-cognition programme (Levin & Dennett 2020 collaborative work, the
  basal-cognition literature).
- Hartline 1938 → 07-mind: the founding paper of the receptive-field
  concept that runs through Hubel & Wiesel 1962 (also a candidate 07-
  mind entry) into modern computational neuroscience.

Pass-2 flags these in advance so pass-3 has the cross-link list ready
when 07-mind opens.

### 4.4 Cosmology (`06-cosmology/`) — branch not yet opened

No biophysics canon entries cross-link to cosmology under the README's
foundations rule. Pass-2 found two near-misses in the existing
sub-folders:

- The Bazilevskaya 2008 cosmic-ray-modulation reference in
  `radiosynthesis/SEED.md` is palaeoclimate / heliophysics, not
  biophysics; it cross-links to cosmology when that branch opens, not
  to biophysics.
- The Shaviv 2002 cosmic-ray reference is the same category.

Both are demoted from biophysics per §2.6 and held as cross-link
candidates for the eventual cosmology branch.

### 4.5 Information (`04-information/`) — branch may open

Pass-2 found one entry in the existing biophysics material that might
have an information-branch cross-link: the protein-folding code (the
amino-acid alphabet → tertiary-structure mapping) discussed in Anfinsen
1973 has been treated by some authors (e.g. Wolynes' funnel landscape
work, the Pande lab kinetic-signature work) as an information-theoretic
problem. Pass-2 does not promote any of that material to canon (it is
review-tier and post-Anfinsen application), but flags that pass-3 may
want to add a cross-link from `structural-biology/anfinsen-1973.md` to
a future `04-information/` entry on the protein-folding code if and
when that branch identifies one.

The Shannon / Gibbs entropy non-conflation rule (chemistry-pass-3 §5.4)
applies to biophysics symmetrically: every biophysics canon entry that
uses the word "entropy" must specify Gibbs / thermodynamic entropy
explicitly. Anfinsen 1973's "thermodynamic hypothesis" uses entropy in
the Gibbs sense; the Anfinsen stub must say so. The Eyring transition-
state-theory entropy of activation (used in some enzyme-kinetics work
that may make it into `enzyme-kinetics/` later) is also Gibbs-side.
Pass-2 commits the branch to never silently identifying Gibbs entropy
with Shannon entropy.

---

## 5. `sub-outcomes/longevity/` — binding pass-2 call

Pass-1 §5 left the scope open. The CLAUDE.md classifies longevity as
"outcome-tier, not foundation-tier." The README §"Scope" is explicit:
biophysics does not hold "Longevity, disease, cognitive-performance
outcomes (these are downstream applications — landscape, not canon —
and live in `sub-outcomes/longevity/` as cross-mirror with the gdrive
longevity-canon)."

Pass-2 binding call: **`sub-outcomes/longevity/` is a cross-mirror,
not canon-adjacent**. It exists as a routing convenience: papers that
cite a `05-biophysics/` canon axiom *and* are also longevity-relevant
get a copy in `sub-outcomes/longevity/` for the convenience of the
longevity-canon maintainer (and for the gdrive longevity-canon to
cross-mirror back). The folder is *not* a separate canon-adjacent
holding tier. A paper in `sub-outcomes/longevity/` is *either* canon
(in which case the canonical copy lives in the appropriate mechanism
sub-folder and `sub-outcomes/longevity/` holds a pointer) *or*
landscape (in which case `_landscape/` is the canonical home and
`sub-outcomes/longevity/` is a courtesy cross-mirror).

Reasoning: any other reading collapses to landscape with extra steps.
If `sub-outcomes/longevity/` were itself canon-adjacent, the branch
would have an inconsistency — biophysics canon would not hold longevity
papers, but biophysics-canon-adjacent material would, and the boundary
between the two would be undefined. The clean reading is that
`sub-outcomes/longevity/` is a routing folder for material that has a
canonical home elsewhere, full stop.

Pass-2 recommendation to pass-3: keep the folder, treat it as a
pointer-only routing folder, and document that contract in
`sub-outcomes/longevity/README.md`. The README should say: this folder
holds pointers (one-line entries with a path to the canonical home,
which is either a `05-biophysics/<sub-domain>/` mechanism folder or
`_landscape/`) plus a cross-link to `gdrive:AGFarms/Nucleus/research/
longevity-canon/`. Nothing here is itself canon. Nothing here is
itself landscape. Everything here is a pointer.

This call has one consequence pass-3 should be aware of: the folder
can be empty for long stretches, and that is fine. Bucket's biophysics
canon does not need a longevity sub-section to be complete; the
longevity-canon does not need a biophysics sub-section to be complete.
The folder exists for the cases where they overlap, and those cases
are the exception, not the rule.

Pass-2 does not move `sub-outcomes/` out of the branch entirely (one
of the pass-1 §5 options). The cross-mirror role is real and the
folder is the natural place to record it. The cleaner alternative —
moving the cross-mirror to a top-level `bucket-canon/_cross-mirrors/`
or to the gdrive-side longevity-canon only — is more invasive than the
current footprint warrants. Pass-3 may revisit if the folder becomes
unwieldy.

---

## 6. Recommended frozen tree for pass-3

```
05-biophysics/
  README.md                                              (written 2026-05-01)
  CANON_INDEX.md                                         (pass-3 to populate)
  _intake/
    biophysics-rebalance-pass-1-2026-05-01.md            (pass-1)
    biophysics-canon-pass-2-2026-05-01.md                (this file)
    peptides-seed-2026-04-23.md                          (migrated from peptides/SEED.md)
    melanin-seed-2026-04-23.md                           (migrated from melanin/SEED.md)
    radiosynthesis-seed-2026-04-23.md                    (migrated from radiosynthesis/SEED.md)
    mitochondria-seed-2026-04-23.md                      (migrated from mitochondria/SEED.md)

  membrane-biophysics/
    CANON_INDEX.md
    1952-hodgkin-huxley-quantitative-description.md      (the load-bearing paper V)
    1952-hodgkin-huxley-supporting-papers.md             (papers I-IV bundle)
    1943-goldman-potential-impedance-rectification.md
    1949-hodgkin-katz-effect-of-sodium-ions.md
    1972-singer-nicolson-fluid-mosaic.md
    1976-neher-sakmann-single-channel-currents.md
    1981-hamill-marty-neher-sakmann-sigworth-improved-patch-clamp.md

  bioenergetics/
    CANON_INDEX.md
    1937-krebs-johnson-citric-acid.md
    1941-lipmann-phosphate-bond-energy.md
    1948-lehninger-kennedy-oxidative-phosphorylation.md
    1961-mitchell-chemiosmotic.md
    1967-margulis-origin-of-mitosing-cells.md
    1994-abrahams-leslie-lutter-walker-f1-atpase-structure.md
    1997-boyer-energy-life-atp-nobel.md
    1997-walker-rotary-catalysis-nobel.md
    mitochondria-lineage.md                              (migrated from mitochondria/lineage.md)

  bioelectricity/
    CANON_INDEX.md
    1791-galvani-de-viribus-electricitatis.md
    1902-bernstein-thermodynamik-bioelektrischen-stroeme.md
    1952-hodgkin-huxley-cross-link.md                    (cross-link to membrane-biophysics)
    2007-adams-masi-levin-h-pump-regeneration.md
    2014-levin-molecular-bioelectricity.md               (conditional, see §1.3)
    becker-papers.bib                                    (migrated from becker/papers.bib)
    becker-lineage.md                                    (migrated from becker/lineage.md)
    ARC.md                                               (migrated from bioelectric-lineage/ARC.md)
    cross-refs.md                                        (migrated)
    primary-papers.bib                                   (migrated)
    primary-papers.yaml                                  (migrated)
    queries.txt                                          (migrated)

  allosteric-regulation/
    CANON_INDEX.md
    1965-monod-wyman-changeux-allosteric-transitions.md
    1966-koshland-nemethy-filmer-sequential-model.md

  enzyme-kinetics/
    CANON_INDEX.md
    1913-michaelis-menten-kinetik-invertinwirkung.md
    1925-briggs-haldane-note-on-kinetics.md
    1963-cleland-kinetics-multi-substrate.md             (borderline)

  structural-biology/
    CANON_INDEX.md
    1951-pauling-corey-branson-alpha-helix.md
    1951-pauling-corey-pleated-sheet.md
    1953-watson-crick-dna.md
    1953-franklin-gosling-thymonucleate.md
    1953-wilkins-stokes-wilson-deoxypentose.md
    1958-kendrew-myoglobin.md
    1960-perutz-haemoglobin.md
    1973-anfinsen-protein-folding.md
    1977-karplus-mccammon-protein-dynamics.md
    1990-sharp-honig-electrostatics.md                   (borderline)

  photobiology/
    CANON_INDEX.md
    1932-emerson-arnold-photochemical-reaction.md
    1933-wald-vitamin-a-retina.md
    1937-hill-oxygen-isolated-chloroplasts.md
    1938-hartline-single-optic-nerve-fibers.md           (borderline)
    1950-bassham-benson-calvin-path-of-carbon-VIII.md
    1962-calvin-nobel-lecture-edition-of-record.md
    foerster-1948-cross-link.md                          (cross-link to chemistry/photochemistry)
    stark-einstein-cross-link.md                         (cross-link to chemistry/photochemistry)

  radiation-biology/
    CANON_INDEX.md
    1895-roentgen-cross-link.md                          (cross-link to physics)
    1923-hevesy-absorption-translocation-lead.md
    1946-lea-actions-of-radiations.md                    (borderline)
    2007-dadachova-ionizing-radiation-melanin.md
    _intake/radiosynthesis-seed-2026-04-23.md            (migrated SEED)

  peptides-and-proteins/
    CANON_INDEX.md
    1953-du-vigneaud-oxytocin-synthesis.md
    1955-sanger-insulin-sequence-bundle.md
    1963-merrifield-solid-phase-peptide-synthesis.md

  melanin/
    CANON_INDEX.md
    1928-raper-aerobic-oxidases.md
    1948-mason-chemistry-of-melanin-III.md
    1974-mcginness-corry-proctor-amorphous-semiconductor.md
    2006-meredith-sarna-physical-chemical-properties-eumelanin.md  (borderline)
    lineage.md                                            (kept, curator commentary)
    _demoted.md                                           (audit trail of dropped entries)

  _sources/
    kruse-index.md                                        (pointer + epistemic-tier note)
    pubmed.md                                             (pointer)
    pubchem.md                                            (cross-link to chemistry)
    becker-archive.md                                     (pointer to site-mirror provenance)

  _landscape/
    textbooks.md                                          (Lehninger, Alberts, Berg-Tymoczko-Stryer, Stryer, Lane 2005, Lane 2015, Becker 1985, Becker 1990)
    contested.md                                          (Solís-Herrera, Nordenström oncology applications)
    peptide-pharmacology.md                               (compound families demoted from peptides/)
    peptide-pharmacology.bib                              (migrated bibliography)

  sub-outcomes/
    longevity/
      README.md                                           (pointer-only routing folder per §5)
```

The tree freezes pass-3's scope. Pass-3's job is (a) execute the
maintainer beads from §2.7, (b) write `CANON_INDEX.md` for every
sub-folder, (c) write the per-paper stub files listed above, (d) verify
the cross-link table from §4 against the actual chemistry / physics /
mind / cosmology / information sub-folder contents and produce a
top-level `05-biophysics/CROSS_LINKS.md`, (e) adjudicate the borderline
entries one more time. Pass-3 is *not* expected to add new originator
entries beyond the spine pass-2 named (other than the per-borderline
adjudications and the conditional Levin lab primary if 2014 review is
kept).

---

## 7. The single most important originator paper currently missing

The pass-2 spine inventory is complete for the sub-domains pass-1 named.
Pass-2 reviewed the spine for one further question: of the originator-
tier biophysics primaries that exist in the published literature, is
there one that the pass-2 spine still does not name and that biophysics-
as-a-discipline cannot do without?

The honest answer: the **Hodgkin–Huxley voltage-clamp method papers**
are partly named (papers I–IV of the 1952 series) but the Cole 1949
voltage-clamp originator paper (Kenneth S. Cole, "Dynamic electrical
characteristics of the squid axon membrane", *Archives des Sciences
Physiologiques* 3, 253–258, 1949) is the single most important
originator paper currently missing from the pass-2 spine. Cole invented
the voltage-clamp technique that Hodgkin and Huxley then used; without
Cole's method, the Hodgkin–Huxley equations are not measurable. The
Cole 1949 paper is the experimental-method foundation of the entire
membrane-biophysics canon, in the same way that Hamill et al. 1981 is
the experimental-method foundation of single-channel electrophysiology.
Pass-2 names it here as the missing entry; pass-3 should add it to
`membrane-biophysics/` as a strong promotion alongside Hodgkin & Huxley
1952 and Hamill et al. 1981.

A second candidate, less load-bearing but worth flagging: the **Nernst
1888 equation** primary paper ("Zur Kinetik der in Lösung befindlichen
Körper", *Z. Phys. Chem.* 2, 613–637 and 4, 129–181). The Nernst
equation governs the equilibrium membrane potential of any single ion
species across a permeable membrane — the prerequisite calculation for
Goldman 1943 and the resting-potential half of the Hodgkin–Huxley
model. The chemistry-pass-3 inventory places Nernst in `03-chemistry/
electrochemistry/` (originator-framing rule: Nernst was working on
electrolyte solutions), so the biophysics side cross-links rather than
holding the primary. But the cross-link is mandatory for a complete
membrane-biophysics treatment, and pass-3 should add `nernst-1888-
cross-link.md` to `membrane-biophysics/`.

---

## 8. What pass-2 leaves to pass-3

Items pass-2 explicitly defers to pass-3 adjudication (a smaller list
than pass-1's, because pass-2 has done most of the adjudication already):

1. **Adams–Masi–Levin 2007 vs Levin 2014.** Pass-2 promotes both
   (Adams–Masi–Levin as primary, Levin 2014 as conditional review-tier
   that survives only because there is now a primary). Pass-3 may
   promote additional Levin lab primaries (e.g. the *Xenopus* face-
   patterning work, Vandenberg, Morrie & Adams 2011 *Dev. Biol.* 357,
   239–254) and may demote the 2014 review.
2. **Cleland 1963 in `enzyme-kinetics/`.** Borderline; pass-3 may demote.
3. **Lea 1946 in `radiation-biology/`.** Borderline; pass-3 may
   substitute the Timoféef-Ressovsky / Zimmer / Delbrück 1935 "Three-Man
   Paper" as a primary if the maintainer wants the originator-tier
   foundation rather than the discipline-normative monograph.
4. **Sharp & Honig 1990 in `structural-biology/`.** Borderline; pass-3
   may demote in favour of the Honig & Nicholls 1995 *Science* primary.
5. **Hartline 1938 in `photobiology/` vs `07-mind/sensory-systems/`.**
   Borderline placement; pass-3 to decide once 07-mind opens.
6. **Meredith & Sarna 2006 in `melanin/`.** Borderline; pass-3 may
   demote in favour of the Watt, Bothma & Meredith 2009 *Soft Matter*
   primary.
7. **Cole 1949 voltage-clamp paper.** Pass-2 names as the single most
   important missing primary; pass-3 to verify the *Archives des
   Sciences Physiologiques* citation (the journal is obscure and the
   page numbers should be verified against a holding-library copy)
   and promote.
8. **Nernst 1888 cross-link** — pass-3 to add to `membrane-biophysics/`
   pointing at chemistry's electrochemistry sub-folder.
9. **The Calvin Paper-I-through-XIX series** — pass-2 names Paper VIII
   as the bundle's load-bearing entry and the 1962 Nobel Lecture as
   the edition-of-record. Pass-3 should curate the full series and
   identify whether any other paper in the series clears the
   originator-tier bar independently.
10. **The endosymbiosis canon** — pass-2 promotes Margulis 1967 alone.
    Pass-3 may add Sagan-Margulis 1981 *Symbiosis in Cell Evolution*
    (W. H. Freeman) as edition-of-record monograph if the maintainer
    judges the 1967 *J. Theor. Biol.* paper insufficient as a
    standalone originator.
11. **The `_sources/` cross-branch question** — pass-1 escalated, pass-2
    takes the position that `_sources/` is a cross-branch pattern but
    does not execute. Pass-3 (or a separate cross-branch sweep) to
    decide.

— pass-2 deep dive, 2026-05-01
