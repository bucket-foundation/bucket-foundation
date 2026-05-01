# Biophysics rebalance — pass 2 — migration plan and cross-branch coherence — 2026-05-01

Pass 1 (`_intake/biophysics-rebalance-pass-1-2026-05-01.md`, 2026-05-01)
inventoried what is on disk, named the foundations spine that is missing,
and proposed a corrected mechanism-named tree without renaming or deleting
anything. Pass 2 turns the proposal into an executable migration plan,
adjudicates the contestable items pass 1 named, draws the cross-branch
boundaries against chemistry / physics / mathematics / information /
mind, lists the entries other branches will cite back into biophysics,
and writes the Kruse-positioning rule as a checked rule a future
contributor must apply.

Pass 2 stays in `_intake/`. It writes a plan, it does not execute the
plan. The actual `git mv` operations and the on-disk rename are deferred
to a pass-3 execution sweep so that the migration is reviewable as a
single diff at promotion time.

The chemistry pass-3 synthesis memo
(`bucket-canon/03-chemistry/_intake/chemistry-canon-pass-3-synthesis-2026-05-01.md`)
is binding for the chemistry-side cross-link decisions in §3 below; the
physics pass-1
(`bucket-canon/02-physics/_intake/physics-canon-pass-1-2026-05-01.md`)
is binding for the physics side. Quoted lines from those memos are
verbatim and identified by file and line.

## 1. Concrete migration plan for the existing six sub-folders

The six existing sub-folders (`becker/`, `bioelectric-lineage/`,
`melanin/`, `mitochondria/`, `peptides/`, `radiosynthesis/`) were
created on 2026-04-23 as the seed pass. Pass 1 classified each at the
folder level. Pass 2 classifies at the file level: every file gets a
disposition of *keep*, *move-to-X*, *demote-to-_landscape*, or
*delete-and-cross-link*. The execution sweep will run these as
`git mv` operations from the branch root.

The Kruse-content disposition rule, applied uniformly across all six
folders, is: where Kruse-curated commentary maps to a real originator
paper, file the originator paper in canon and the Kruse-curated
material as a cross-cite from `_sources/kruse-index.md`. The Kruse
material is preserved (provenance matters), it is just not promoted to
canon by virtue of being Kruse-flagged. See §5 for the rule in
checked-rule form.

### 1.1 `becker/` — six files, ~430 MB on disk

| File | Disposition | Target |
|---|---|---|
| `biography.md` (2.9 KB) | demote-to-_landscape | `_landscape/biographies/becker.md` (new, brief stub citing the gdrive site-mirror) |
| `books.md` (1.8 KB) | demote-to-_landscape | merge into `_landscape/textbooks.md` under "Becker 1985, *The Body Electric*; Becker 1990, *Cross Currents*" |
| `lineage.md` (4.4 KB) | move-to-X | `bioelectricity/lineage.md`, narrowed to the originator-paper line (Galvani → Bernstein → Hodgkin-Huxley → Levin); Becker-personal-network material to `_landscape/biographies/becker.md` |
| `papers.bib` (22 KB, 56 PubMed-indexed Becker coauthorships) | move-to-X | `bioelectricity/becker-papers.bib`, retained as the Becker-specific bibliography sitting alongside but outside canon |
| `site-mirror/2026-04-23/` (262 files / 419 MB) | keep-in-place + cross-link | stays where it is; new pointer file `_sources/becker-archive.md` provides provenance and the resolution rule (the mirror is provenance, not canon, and is too large to git-track per `.gitignore` rules in `~/agfarms/bucket-foundation/.gitignore`) |
| `CANON_INDEX.md` | delete-and-cross-link | folder dies; the three originator entries it claimed move to `bioelectricity/CANON_INDEX.md` |

The `becker/` folder ceases to exist after the sweep. This is the
sharpest demotion in the migration. Justification: pass 1 identified
the folder as "biographical dossier on a single 20th-century
researcher, not mechanism-canon" (pass-1 §1, line 33), and the chemistry
pass 3 synthesis is unambiguous on the boundary — folders are
mechanism-named (`bonding/`, `kinetics/`, `thermodynamics/`), never
person-named. Becker the popularizer survives in `_landscape/`, the
originator papers he cited move to `bioelectricity/` where they belong.

### 1.2 `bioelectric-lineage/` — seven files, ~60 KB

| File | Disposition | Target |
|---|---|---|
| `ARC.md` (10.5 KB, 15-node lineage) | move-to-X | `bioelectricity/ARC.md`, **kept verbatim** — pass 1 called this "the closest existing sub-folder to mechanism-named canon" (line 51) |
| `cross-refs.md` (2.3 KB) | move-to-X | `bioelectricity/cross-refs.md` |
| `primary-papers.md` (6.8 KB) | move-to-X | `bioelectricity/primary-papers.md`, with Becker / Nordenström entries demoted in-place to a "downstream popularizers" subsection; Galvani 1791 and Bernstein 1902 promoted to the head of the file |
| `primary-papers.bib` (8.3 KB) | move-to-X | `bioelectricity/primary-papers.bib` |
| `primary-papers.yaml` (25.7 KB) | move-to-X | `bioelectricity/primary-papers.yaml` |
| `queries.txt` (2 KB) | move-to-X | `bioelectricity/queries.txt` |
| `CANON_INDEX.md` | move-to-X + rewrite | `bioelectricity/CANON_INDEX.md`; rewrite to absorb the Becker-papers cross-cite and to add the Hodgkin-Huxley 1952 cross-link entry pointing to `membrane-biophysics/` |

This is a wholesale rename. It is the cheapest migration in the sweep
and the highest-yield one: the existing folder is already
substantially canon-tier and the rename simply matches the
mechanism-named convention.

### 1.3 `melanin/` — seven files, ~55 KB

| File | Disposition | Target |
|---|---|---|
| `SEED.md` (4.8 KB) | keep | `melanin/SEED.md` |
| `lineage.md` (4.2 KB) | keep | `melanin/lineage.md`, narrowed: Solís-Herrera entry moved out (see below) |
| `primary-papers.md` (9.5 KB, 7 sub-themes) | keep + narrow | `melanin/primary-papers.md`, retain Raper 1928, Mason (verify ref pass-2 §6 below), McGinness-Corry-Proctor 1974, Prota; **demote Solís-Herrera "human photosynthesis" entry to `_landscape/contested.md`**; merge radiosynthesis sub-theme into `radiation-biology/` (cross-link only — keep one-line pointer in melanin) |
| `primary-papers.bib` (8 KB) | keep + narrow | drop Solís-Herrera entry from `.bib`, retain elsewhere |
| `primary-papers.yaml` (26.7 KB) | keep + narrow | same narrowing as `.bib` |
| `queries.txt` (1 KB) | keep | `melanin/queries.txt` |
| `CANON_INDEX.md` | keep + rewrite | reduce to the three-entry strong list (Raper 1928, Mason, McGinness-Corry-Proctor 1974) plus borderline neuromelanin sub-section flagged for pass-3 |

The `melanin/` folder survives the sweep — it is one of two existing
folders to do so (the other being `bioelectric-lineage/` under its new
name). Justification: pass 1 read the contents as "mixed" (line 65),
with three originator-tier entries that pass the promotion rule. The
narrowing removes the Kruse-shaped silhouette (radiosynthesis sub-theme
moves out, Solís-Herrera moves out) and leaves the foundation-tier
spine.

### 1.4 `mitochondria/` — seven files, ~70 KB

| File | Disposition | Target |
|---|---|---|
| `SEED.md` (7.2 KB) | move-to-X + split | sub-themes 1–7 (endosymbiosis, chemiosmosis, mtDNA, COX enzymology, signaling, biogenesis, dynamics) → `bioenergetics/SEED.md`; sub-themes 8 (ELF/bioelectric coupling) and 9 (deuterium isotope effects) → `_sources/kruse-index.md` as flagged-curated commentary; sub-theme 10 (Nick Lane synthesis) → `_landscape/textbooks.md` |
| `lineage.md` (4.6 KB) | move-to-X | `bioenergetics/lineage.md`, retaining the Mitchell → Boyer → Walker line and the Margulis → Gray → Martin endosymbiosis line |
| `primary-papers.md` (9.5 KB, 36 entries across 10 sub-themes) | move-to-X + split | entries from sub-themes 1–7 → `bioenergetics/primary-papers.md`; sub-themes 8, 9 → `_sources/kruse-index.md` (cited as "Kruse-flagged claims with originator-paper trace pending", see §5 worked example below); Lane 2005 from sub-theme 10 → `_landscape/textbooks.md` |
| `primary-papers.bib` (10 KB) | move-to-X + split | bioenergetics-side entries → `bioenergetics/primary-papers.bib`; rest → `_sources/kruse-index.bib` |
| `primary-papers.yaml` (35.4 KB) | move-to-X + split | same split as `.bib` |
| `queries.txt` | move-to-X | `bioenergetics/queries.txt` |
| `CANON_INDEX.md` | delete-and-cross-link | folder dies; rewrite as `bioenergetics/CANON_INDEX.md` with Mitchell 1961, Lipmann 1941, Krebs-Johnson 1937, Lehninger-Kennedy 1948, Boyer 1997 / Walker 1997 promoted; Lane 2005 listed as landscape; ELF / deuterium sub-themes listed as `_sources/kruse-index.md` cross-cite |

`mitochondria/` ceases to exist after the sweep. This is the second
sharpest demotion in the migration after `becker/`. Justification: pass
1 called the folder "partly canon, partly Kruse-adjacent" (line 84);
the canon material has a natural home in `bioenergetics/` (the
mechanism), and the Kruse-adjacent material has a natural home in
`_sources/kruse-index.md` (the curator tier).

### 1.5 `peptides/` — seven files, ~60 KB

This is the most aggressive disposition in the migration. Pass 1 rated
the folder 8/10 on Kruse-heaviness and called it "the most Kruse-shaped
folder in the branch and the single most-mismatched-to-MANIFESTO" (line
108). Pass 2 ratifies that and writes the executable disposition.

| File | Disposition | Target |
|---|---|---|
| `SEED.md` (2.3 KB) | demote-to-_landscape | `_landscape/peptide-pharmacology.md` (new file; SEED becomes the introductory section of the landscape memo) |
| `lineage.md` (2.9 KB) | demote-to-_landscape | merge into `_landscape/peptide-pharmacology.md` |
| `primary-papers.md` (7.9 KB, 13 compound families) | demote-to-_landscape + extract | the 13 compound-family sub-sections (Khavinson bioregulators, BPC-157, MOTS-c, GHK-Cu, SS-31, TB-500, Semax/Selank, GHRPs, CJC-1295, Cerebrolysin, Melanotan-II, contested, regulatory) move wholesale to `_landscape/peptide-pharmacology.md`; **the MOTS-c entry (Lee et al. 2015, *Cell Metab* 21:443) is also cross-cited from `bioenergetics/primary-papers.md` because mitochondrial-derived peptides are a bioenergetics-canon-adjacent claim** |
| `primary-papers.bib` (11.4 KB) | demote-to-_landscape | `_landscape/peptide-pharmacology.bib` |
| `primary-papers.yaml` (37 KB) | demote-to-_landscape | `_landscape/peptide-pharmacology.yaml` |
| `queries.txt` (3.2 KB) | demote-to-_landscape | `_landscape/peptide-pharmacology-queries.txt` |
| `CANON_INDEX.md` | delete-and-cross-link | folder dies; landscape file gets a one-line "not canon — see `_landscape/peptide-pharmacology.md`" header pointing back |

Separately, a new `peptides-and-proteins/` sub-folder is opened
containing only the originator papers for protein sequencing and
synthesis: Sanger 1955 (insulin sequence), Merrifield 1963 (solid-phase
peptide synthesis), Du Vigneaud 1953 (oxytocin synthesis). These are
biophysics-canon-tier; they are not in the existing `peptides/` folder
because the existing folder was organized around modern bioactive
peptides, not the canonical-method papers. The new `peptides-and-proteins/`
is created clean during pass 3 execution; pass 2 only writes the seed
list (see §4 below for the full table of cross-cites).

The MOTS-c cross-cite is the one extraction from the existing `peptides/`
that survives into canon. Pass 1 §5.8 (line 419) anticipated this
exact case: "the existing compound-family material has biophysics-canon
entries hidden inside (SS-31 / cardiolipin work, MOTS-c primary
discovery paper) that deserve promotion into `bioenergetics/` rather
than wholesale demotion." Pass 2 ratifies the MOTS-c promotion as a
bioenergetics cross-cite. Pass 2 declines to promote SS-31 in the same
sweep — the SS-31 / cardiolipin literature is field-defining for
mitochondrial-medicine but the originator paper (Szeto-Schiller, Zhao
et al. 2004, *J. Biol. Chem.* 279, 34682) is therapeutic-mechanism, not
foundation-mechanism, and pass 2 leaves it as a borderline flagged for
pass-3 adjudication.

### 1.6 `radiosynthesis/` — one file, 3.7 KB

| File | Disposition | Target |
|---|---|---|
| `SEED.md` (3.7 KB) | move-to-X + augment | `radiation-biology/SEED.md`; **prepend Hevesy 1923 as the foundation entry**; retain Dadachova 2007 as the modern primary; retain the Holland 2006 / Bekker 2004 / Lyons 2014 / Hohmann-Marriott-Blankenship 2011 deep-time-oxygen citations as cross-link to `06-cosmology/early-earth/` (target sub-folder pending cosmology branch sweep); demote Solís-Herrera and Bazilevskaya 2008 entries to `_landscape/contested.md` |

The `radiosynthesis/` folder ceases to exist; the `radiation-biology/`
folder is opened as a clean parent containing radioactive-tracer
methods (Hevesy 1923), radiation effects on biomolecules (Roentgen 1895
cross-link to physics), and radiosynthesis as a phenomenon (Dadachova
2007). The Roentgen 1895 cross-link is to `02-physics/`; pass 1 of the
physics canon already located Roentgen there (physics pass-1 line 142
treats X-ray discovery as physics-side primary, biology-side
applications cross-linked).

### 1.7 Single-file deletion candidate

The single existing file across the whole branch that pass 2 would
most aggressively delete is `peptides/CANON_INDEX.md`. It promotes
13 compound families to "primary papers" tier inside a folder whose
contents are nutraceutical-pharmacology, contradicts the MANIFESTO's
"foundations only" rule, and is not load-bearing for any downstream
work — the 13 compound families exist in `primary-papers.md` already.
Deleting the index removes the canon-promotion claim while preserving
the underlying material as `_landscape/peptide-pharmacology.md`. No
other file in the branch is as cleanly removable: `becker/CANON_INDEX.md`
is similarly mismatched but is the smallest-impact removal because
the underlying Becker material has a clear `_landscape/biographies/`
home; the peptides index is mismatched *and* claims canon promotion
for the largest count of mismatched entries.

## 2. Adjudicating the contestable calls pass 1 named

Pass 1 §5 listed eight contestable items. Pass 2 takes positions on
the three pass-1 explicitly flagged for §2 here, and defers the rest
to pass 3 (per-paper Levin reviews, Mason 1959 reference verification,
Calvin cycle edition-of-record, partial vs full peptides demotion —
the last is partly resolved above by the MOTS-c cross-cite).

### 2.1 Lane 2005 *Power, Sex, Suicide* — landscape (confirmed)

Pass 1 (line 401) marked Lane 2005 as landscape with the existing
`mitochondria/CANON_INDEX.md` already classifying it as
"landscape-adjacent edition-of-record." Pass 2 confirms landscape and
declines the borderline flag.

Reasoning: the promotion rule (`README.md` lines 56–67) requires either
(1) a primary text by the originator of the framework, (2) a
recognized academic edition-of-record of a primary text, or (3) a
discipline-standard normative reference. Lane 2005 is none of these.
It is a popular synthesis written *about* the foundations (Mitchell,
Margulis, Lane-and-Martin 2010) by a researcher who has separately
published primary papers (Lane and Martin 2010, *Nature* 467, 929 —
already canon under bioenergetics). The synthesis itself is
landscape-tier. The same logic that puts Hawking's *A Brief History
of Time* in `02-physics/_landscape/` puts Lane 2005 in
`_landscape/textbooks.md`. Pass 3 should not reopen this.

### 2.2 `_sources/` as a top-level pattern across every branch — yes, escalate

Pass 1 (line 391) suspected the answer is "every branch needs one"
and was unwilling to make the call without a cross-branch sweep.
Pass 2 makes the call: yes, `_sources/` is a top-level pattern
parallel for every branch. The escalation goes via a Bucket-level
intake memo (proposed: `bucket-canon/_intake/sources-pattern-2026-05-01.md`),
not in this branch's `_intake/`, but pass 2 writes the position here
because biophysics is the branch where the pattern is most obviously
needed and the absence of which has produced the Kruse-shaped seed
silhouette that pass 1 had to rebalance.

The pattern: every branch holds a `_sources/` sub-folder containing
pointer files (not mirrors) to the curated retrieval surfaces that
the branch routinely consumes. Each pointer file states the corpus
identity, the retrieval recipe, and the epistemic-tier rule (corpus
is curator-tier, never originator-tier). Pass 2's evidence for the
pattern being branch-universal:

- `01-mathematics/` — arXiv math pre-print server, MathSciNet
- `02-physics/` — INSPIRE-HEP, arXiv physics, Physical Review archive
- `03-chemistry/` — PubChem, ChemRxiv, CAS Registry
- `04-information/` — DBLP, ACM Digital Library, arXiv cs
- `05-biophysics/` — Kruse Index, PubMed, PubChem (cross-link)
- `06-cosmology/` — NASA ADS, arXiv astro-ph
- `07-mind/` — Stanford Encyclopedia of Philosophy, PhilPapers, PubMed neuroscience subset

In every branch the `_sources/` folder is the right place to acknowledge
that retrieval surfaces exist and to bind the rule that retrieval
surfaces are not canon. The biophysics-specific instance of the rule
is that the Kruse Index is one such retrieval surface and not a
producer of foundations.

### 2.3 `sub-outcomes/longevity/` — adjudication deferred to §6

Pass 1 (line 396) treated `sub-outcomes/longevity/` as cross-mirror
with `gdrive:longevity-canon/`, neither promoted nor demoted. Pass 2
takes a position (see §6 below for full reasoning) and writes the
"outcome canon vs foundation canon" rule that other branches inherit.
Short version: cross-mirror sub-folder in canon, not landscape, not
external-only.

## 3. Cross-branch boundaries — the four contested seams

### 3.1 Membrane biophysics ↔ chemistry (chemiosmotic coupling)

Mitchell 1961 (*Nature* 191, 144–148) is biophysics canon; it cites
chemical thermodynamics (the proton-motive-force argument is a free-energy
argument indistinguishable in form from a Nernst-equation derivation
in `03-chemistry/thermodynamics/`). The chemistry pass-3 synthesis
(line 308) is explicit on the boundary:

> Mitchell 1961, chemiosmosis | biophysics | Mitchell framed the
> result as a biological coupling mechanism.

Pass 2 ratifies: Mitchell 1961 sits in `bioenergetics/`, with a
cross-cite from `03-chemistry/thermodynamics/` that points back here.
The cross-cite, not duplication. The chemistry-canon entry that the
cross-cite hangs off is Gibbs 1876–78 (already canon under chemistry
thermodynamics); the biophysics-side cross-cite reads "Mitchell 1961
applies a Gibbs free-energy partition to a biological membrane to
derive ATP-synthesis coupling."

### 3.2 Photobiology ↔ chemistry (Stark-Einstein and Förster)

Stark-Einstein photoequivalence law is primary in
`03-chemistry/photochemistry/` (chemistry pass-3 §3.1, line 148:
"Förster 1948 — promote under c1. The originator derivation of
resonance energy transfer between an excited donor and a ground-state
acceptor as a function of r⁻⁶. Foundational for biophysical
fluorescence assays and photosynthesis modeling. Folder:
`photochemistry/` (with cross-link to `05-biophysics/`)").

Pass 2 ratifies: Stark-Einstein and Förster 1948 (FRET) live in
`03-chemistry/photochemistry/`. Biophysics gets a cross-link from
`photobiology/` to chemistry, not a duplicate entry. The biophysics
entries that depend on Stark-Einstein (Emerson-Arnold 1932 on the
photosynthetic unit; Wald 1933 on rhodopsin) cite the chemistry-side
primary explicitly, not a biophysics-rephrased version of it.

### 3.3 Radiation biology ↔ physics (Roentgen and Hevesy)

Roentgen 1895 is physics canon (X-ray discovery; physics pass-1
identifies it as physics-side primary). Hevesy 1923 (*Biochem. J.*
17, 439–445) is biophysics canon (founding paper of the radioactive
tracer method in biology, Nobel 1943). Pass 1 (line 119) listed both
correctly and pass 2 ratifies: Roentgen lives in physics with a
biophysics cross-link from `radiation-biology/`; Hevesy lives in
biophysics with a physics cross-link from `02-physics/` to acknowledge
the radiochemistry method dependency. The cross-link asymmetry is
intentional — Roentgen's discovery has biological applications,
Hevesy's method has a physics dependency, but neither paper is
substitutable for the other.

### 3.4 Population genetics / evolutionary dynamics — flag the boundary

Population genetics (Fisher 1930, Wright 1931, Haldane 1932) and
evolutionary dynamics (Kimura 1968 neutral theory, Maynard Smith
1973 ESS) are not biophysics canon. They are mathematical biology
applied at the population scale; the originator framing is statistical
genetics, not biophysics. The boundary rule pass 2 writes:

> Population-scale evolutionary dynamics belongs in `01-mathematics/`
> under a `mathematical-biology/` sub-folder (proposed; not yet open),
> with cross-cites into `05-biophysics/` only where the
> population-genetics result depends on a biophysics primary
> (e.g. Hodgkin-Huxley as the substrate of any neural-circuit
> evolutionary argument).

Pass 2 does not open the math-side folder; it flags the boundary so
that the biophysics branch is not ambushed by evolutionary-dynamics
papers landing in `_intake/` and being claimed for biophysics canon.
The flag goes in `README.md` under "It does NOT hold:" in pass 3.

### 3.5 Mathematical biology ↔ math — Hodgkin-Huxley as ODE

Hodgkin-Huxley 1952 is biophysics canon; the equations themselves
are nonlinear ODEs of a form that 01-mathematics holds primary
(Lotka 1925, Volterra 1926 as the founding analogue). The cross-link
direction: Hodgkin-Huxley is biophysics-primary, with a cross-cite
into `01-mathematics/dynamical-systems/` (or wherever the ODE
machinery lives once mathematics pass 1 finishes; mathematics
pass-1 intake mentions ODEs but does not yet specify the sub-folder).
The reverse cross-cite from math to biophysics goes under whatever
"applications of nonlinear ODEs" entry math eventually opens.

Pass 2 does not collapse Hodgkin-Huxley into 01-math. The Hodgkin-Huxley
equations are inseparable from the squid-axon experimental program;
the equations are an application of math machinery to a biological
substrate, not a contribution to math. The same logic that keeps
Schrödinger 1926 in physics rather than math (the equation is an
application of variational calculus to atomic spectra) keeps
Hodgkin-Huxley in biophysics.

## 4. Cross-branch entry list — biophysics entries other branches will cite

Table form. Each row is a biophysics canon entry, the branches that
will cite it back, and the cross-cite framing. This list is
authoritative for pass-3 execution: every cross-cite below must exist
as a one-line pointer in the citing branch's appropriate sub-folder.

| Biophysics entry | Cited by | Cross-cite framing |
|---|---|---|
| Hodgkin & Huxley 1952, *J. Physiol.* 116–117 (five-paper series) | `07-mind/computational-neuroscience/` | "The HH equations are the substrate of every spiking-neuron model from Wilson-Cowan forward; cite as biophysics-primary, do not rederive." |
| Hodgkin & Huxley 1952 | `01-mathematics/dynamical-systems/` (sub-folder pending) | "Reference application of nonlinear ODE systems to a biological substrate; FitzHugh 1961 reduction is the math-side simplification." |
| Watson & Crick 1953, *Nature* 171, 737–738 | `03-chemistry/structural-biology-cross-link/` (sub-folder pending; chemistry may name it `biomolecular-structure/`) | "DNA double helix; the chemistry-side cross-cite is to the hydrogen-bonding rules (Pauling 1939 *Nature of the Chemical Bond*) and to the X-ray crystallography method (Bragg 1913, *Proc. Roy. Soc. A* 89, 248)." |
| Anfinsen 1973, *Science* 181, 223–230 | `03-chemistry/thermodynamics/` | "Protein folding as a thermodynamic-equilibrium problem; the chemistry cross-cite hangs off Gibbs 1876–78." |
| Anfinsen 1973 | `04-information/learning-theory/` (sub-folder pending) | "Protein folding as an information / search problem; the cross-cite reads 'thermodynamic hypothesis specifies the search target'; the modern AlphaFold-class learned-folding result is downstream landscape." |
| Mitchell 1961, *Nature* 191, 144–148 | `03-chemistry/thermodynamics/` | "Chemiosmotic coupling as an application of free-energy partition to a membrane substrate; cross-cite Gibbs 1876–78." |
| Monod, Wyman & Changeux 1965, *J. Mol. Biol.* 12, 88–118 | `03-chemistry/kinetics/` | "MWC concerted allostery; cross-cite to chemical-equilibrium machinery (van't Hoff 1884) and to the Hill 1910 cooperativity primary." |
| Monod, Wyman & Changeux 1965 | `04-information/` | "Allosteric regulation as biological information processing; the cross-cite frames cooperativity as a discrete-input → discrete-output threshold function. The MWC paper itself is biophysics; the information-theoretic reading is downstream." |
| Michaelis & Menten 1913, *Biochem. Z.* 49, 333–369 | `03-chemistry/kinetics/` | "Enzyme kinetics; the chemistry-side cross-cite hangs off Bodenstein 1913 (steady-state hypothesis); Briggs-Haldane 1925 is the steady-state derivation that bridges the two." |
| Galvani 1791, *De Viribus Electricitatis...* | `02-physics/electromagnetism-history/` (cross-link only) | "Galvani's animal-electricity claim is the biophysics-side founding text; the physics-side response is Volta 1800 on the chemical battery — the dispute is in the physics canon as a methodological footnote." |
| Boyer 1997 / Walker 1997 Nobel Lectures | `03-chemistry/kinetics/` (rotational catalysis) | "ATP synthase as a rotary enzyme; the chemistry cross-cite is to the rotational-catalysis literature broadly and to the structural-biology cross-cite (Walker's crystallography)." |
| McGinness, Corry & Proctor 1974, *Science* 183, 853–855 | `03-chemistry/electrochemistry/` (sub-folder pending) | "Melanin as amorphous semiconductor; the chemistry-side cross-cite hangs off the broader semiconductor-chemistry literature." |
| Hevesy 1923, *Biochem. J.* 17, 439–445 | `02-physics/radiation/` and `03-chemistry/radiochemistry/` (sub-folders pending) | "Radioactive-tracer method in biology; cross-cite to Rutherford 1899 (alpha and beta rays) on the physics side and to Curie 1898 (radium isolation) on the chemistry side." |
| Sanger 1955 (insulin sequence) | `03-chemistry/` analytical-methods sub-folder | "First complete protein sequence; cross-cite to Edman 1950 degradation method and to broader chromatography primaries." |
| Merrifield 1963, *J. Am. Chem. Soc.* 85, 2149–2154 | `03-chemistry/synthesis/` | "Solid-phase peptide synthesis; chemistry-side claim is methodological; biophysics-side is foundational for all modern peptide-mediated experimentation." |

The list is intentionally finite. Pass 3 should add cross-cites only
when an entry is filed in canon under its native branch and the
citing branch already has a parent sub-folder open for it. Cross-cites
to non-existent sub-folders are deferred until the target branch's
sweep opens the receiving folder.

## 5. Kruse positioning — the binding rule, written for execution

Pass 1 (§4) stated the rule prosaically. Pass 2 writes it as a
checked rule a future contributor MUST apply before any addition to
05-biophysics canon.

### The rule

> If a proposed canon entry's only justification is a Kruse-corpus
> citation — i.e. the entry was found via a Kruse search, or the
> entry is a Kruse blog post itself, or the entry is a paper cited
> only because Kruse cited it without independent verification of
> the originator's framing — **reject the entry as canon and instead
> trace the originator paper Kruse is citing. That originator paper
> is the candidate. The Kruse commentary is recorded in
> `_sources/kruse-index.md` as a cross-cite.**

### The check

Before promoting any entry to a mechanism-named sub-folder, the
contributor must answer four questions in writing in the entry's
`primary-papers.md` annotation:

1. **Originator identity.** Who is the originator of the framework /
   law / mechanism this entry states? Name the person. If the answer
   is "Jack Kruse," the entry is not canon — see (3).
2. **Edition-of-record.** What is the primary publication of the
   framework? Cite journal volume, page, year. If the answer is a
   Kruse blog URL, the entry is not canon — see (3).
3. **Kruse trace, if applicable.** If Kruse's corpus is what surfaced
   this entry to the contributor, name the Kruse article and the
   originator paper Kruse cites in it. The Kruse article goes to
   `_sources/kruse-index.md`. The originator paper goes to canon.
4. **Promotion rule satisfaction.** Which of the three promotion-rule
   conditions (`README.md` lines 56–67) does the originator paper
   satisfy: primary theoretical/experimental text, edition-of-record,
   or discipline-standard normative reference?

Entries that fail any of the four questions stay in `_intake/`
pending revision. There is no exception for "Kruse cited this and
the field hasn't independently verified" — that is precisely the
case the rule is designed to catch.

### Worked example — `mitochondria/primary-papers.md` sub-theme 9 (deuterium)

The existing `mitochondria/primary-papers.md` includes a "deuterium
depletion / isotope effects" sub-theme flagged as Kruse-adjacent.
Applied to the rule:

1. **Originator identity.** The originator of the kinetic-isotope-effect
   framework in enzyme catalysis is not Jack Kruse. The originator is
   J. Bigeleisen (Bigeleisen 1949, *J. Chem. Phys.* 17, 675; with
   Mayer 1947, *J. Chem. Phys.* 15, 261, on equilibrium isotope
   effects). For applications to enzyme catalysis specifically, the
   foundation papers are Westheimer 1961 (*Chem. Rev.* 61, 265) on
   primary kinetic isotope effects in hydride transfer, and Northrop
   1975 (*Biochemistry* 14, 2644) on the steady-state interpretation.
2. **Edition-of-record.** Bigeleisen 1949, *J. Chem. Phys.* 17, 675,
   "The relative reaction velocities of isotopic molecules" — primary.
   Westheimer 1961, *Chem. Rev.* 61, 265, "The magnitude of the primary
   kinetic isotope effect for compounds of hydrogen and deuterium" —
   primary review.
3. **Kruse trace.** Kruse's repeated discussion of "deuterium depletion"
   in metabolic context surfaces the topic to a Bucket contributor;
   the Kruse posts go to `_sources/kruse-index.md` with annotation
   "deuterium-depletion claims, Kruse-corpus topic, originator papers
   are Bigeleisen 1949 and Westheimer 1961 in chemistry-side, Northrop
   1975 in biochemistry-side."
4. **Promotion rule satisfaction.** Bigeleisen 1949 satisfies (1) as
   originator paper. The biochemistry-applied primary (Northrop 1975)
   satisfies (1) for the enzyme-kinetics application. The deuterium-
   depletion claim *as Kruse states it* (that mitochondrial water
   handling is selectively sensitive to D₂O / H₂O ratio in
   metabolically meaningful ways) is a downstream-application claim
   that the originator papers do not directly support; it stays
   landscape pending an originator paper that does support it.

The disposition: Bigeleisen 1949 is chemistry canon (move to
`03-chemistry/kinetics/` cross-cite), not biophysics canon. Northrop
1975 is biophysics canon under `enzyme-kinetics/`. Kruse's commentary
is `_sources/kruse-index.md`. The "deuterium depletion is metabolically
load-bearing" claim is neither — it is a flagged conjecture that has
no originator paper Bucket has located. This is exactly the kind of
case where Bucket's job is to find the originator paper if one
exists, and to refuse to promote the conjecture if one does not.

## 6. `sub-outcomes/longevity/` adjudication

Pass 1 left this folder uncreated and unadjudicated. Pass 2 makes the
call: **`sub-outcomes/longevity/` exists as a cross-mirror sub-folder
in canon**, not as landscape, not as external-only-on-gdrive.

### The decision

`bucket-canon/05-biophysics/sub-outcomes/longevity/` is opened during
pass-3 execution. It contains pointer files (not duplicates) for
every biophysics canon entry that ALSO supports a longevity outcome
claim. The pointer file names the canon entry by its biophysics-side
location (e.g. `bioenergetics/CANON_INDEX.md#mitchell-1961`) and
states the longevity-side claim it supports. The same entry exists
once in canon (under its mechanism-named sub-folder) and is *cross-mirrored*
to `gdrive:longevity-canon/` per the `CLAUDE.md` (org level) rule
that longevity research lives on the gdrive longevity-canon side and
is cross-referenced from biophysics.

The `sub-outcomes/longevity/` folder is therefore **canon-adjacent**:
it contains no original canon entries (those live under mechanism-named
parents), but it is the navigational entry-point that other
biophysics consumers (Longevity Hub, Kruse-corpus consumers) use to
find biophysics-canon entries relevant to longevity outcomes.

### The rule for "outcome canon vs foundation canon" — branch-universal

Pass 2 writes this rule in branch-universal form so that 03-chemistry
(drug-discovery outcomes), 02-physics (engineering outcomes), 04-information
(applied-AI outcomes), and 07-mind (cognitive-performance outcomes)
inherit it when they hit the same question.

> **Foundation canon** holds laws, principles, and mechanisms — the
> primary statements downstream work must contend with. Foundation
> canon lives under mechanism-named sub-folders.
>
> **Outcome canon** is the cross-mirror navigation surface that
> connects foundation entries to a downstream application domain
> (longevity, drug discovery, engineering, applied AI, cognition).
> Outcome canon lives under `sub-outcomes/<outcome-name>/`. It
> contains pointer files only — every entry it points to lives once
> in foundation canon under a mechanism-named parent.
>
> **Outcome canon is not landscape.** Landscape holds material that
> does not meet the promotion rule. Outcome canon holds material that
> does meet the promotion rule but is being navigated from an
> outcome-domain perspective.
>
> **Outcome canon is not external-only.** When an outcome domain has
> a gdrive-side canon (per `CLAUDE.md` for longevity), the
> `sub-outcomes/<outcome-name>/` folder cross-mirrors with that
> external canon. The cross-mirror is bidirectional: every entry in
> the gdrive outcome-canon points back to a biophysics foundation
> entry, and every biophysics foundation entry that supports an
> outcome claim is registered in `sub-outcomes/<outcome-name>/`.
>
> **Outcome canon promotions cite foundation canon promotions, never
> the reverse.** Foundation canon does not list outcome claims among
> its promotion-rule conditions. An entry is canon because it states
> a foundation, not because it supports an outcome. The outcome is
> downstream.

This rule is portable. 03-chemistry should open `sub-outcomes/drug-discovery/`
when its synthesis sweep finishes. 02-physics should open
`sub-outcomes/engineering/` if and when an engineering outcome canon
is requested. 07-mind should open `sub-outcomes/cognition/` once its
own foundation spine is in place. In every case the same rule applies:
foundation canon under mechanism-named parents, outcome canon as
pointer-file cross-mirror under `sub-outcomes/<outcome-name>/`, no
duplication, no promotion shortcut from outcome to foundation.

### What goes in `sub-outcomes/longevity/` on day one

Pass-3 execution will seed the folder with pointer files for the
following biophysics canon entries (this is the pass-2 inventory; the
pointer files themselves are written during execution):

- `bioenergetics/mitchell-1961.md` (chemiosmosis — load-bearing for
  every mitochondrial-medicine longevity claim)
- `bioenergetics/lane-martin-2010.md` (energetics of genome complexity
  — load-bearing for the bioenergetic-membranes-as-aging-substrate
  argument)
- `bioenergetics/mots-c-2015.md` (mitochondrial-derived peptide,
  cross-cited in from `_landscape/peptide-pharmacology.md` per §1.5
  above)
- `melanin/mcginness-corry-proctor-1974.md` (melanin as semiconductor —
  load-bearing for any neuromelanin-aging claim)
- `radiation-biology/dadachova-2007.md` (radiosynthesis — load-bearing
  for radioadaptive-response longevity claims, flagged borderline)
- `bioelectricity/levin-2014.md` (developmental bioelectricity —
  load-bearing for regeneration / aging claims, flagged borderline)

Six pointer files at folder open. The list grows as the foundation
canon grows; it never grows independently of the foundation canon.

— pass-2 sweep, 2026-05-01

— end intake memo —
