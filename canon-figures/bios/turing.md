# Alan Turing

## 1. Header card

| | |
|---|---|
| **id** | turing |
| **name** | Alan Mathison Turing |
| **lifespan** | 23 June 1912 – 7 June 1954 |
| **era** | First half of the 20th century — the foundational decade of computation (1936–1948) and the formative postwar years of computer engineering and mathematical biology. |
| **region / tradition** | London → Sherborne → King's College, Cambridge → Princeton → Bletchley Park → National Physical Laboratory (Teddington) → Manchester. English mathematical logic in the line of Newman; American mathematical logic in the line of Church; the ad-hoc cryptanalytic tradition of Bletchley Park; the early-postwar British computing tradition at NPL and Manchester. |
| **branches** | `04-information` (primary, overwhelmingly) |
| **cross_branches** | `01-mathematics` (the decision problem, ordinal logics, oracle machines), `05-biophysics` (reaction–diffusion morphogenesis), `07-mind` (the imitation game and the operational behavioural criterion of intelligence) |
| **primary works** | "On Computable Numbers, with an Application to the Entscheidungsproblem," *Proc. Lond. Math. Soc.* (2) 42 (1937), 230–265, with corrections in (2) 43 (1937), 544–546; "Systems of Logic Based on Ordinals," *Proc. Lond. Math. Soc.* (2) 45 (1939), 161–228 (the Princeton PhD thesis); the Bletchley Park internal reports — most importantly "Mathematical Theory of ENIGMA Machine" (the so-called *Prof's Book*, c.1940, declassified 1996, published 2012); "Proposed Electronic Calculator" (NPL technical report, 1945); "Computing Machinery and Intelligence," *Mind* 59 (1950), 433–460; "The Chemical Basis of Morphogenesis," *Phil. Trans. R. Soc. Lond. B* 237, no. 641 (14 August 1952), 37–72. |
| **tags** | `turing-machine` `halting-problem` `computability` `church-turing-thesis` `entscheidungsproblem` `ordinal-logic` `oracle-machine` `imitation-game` `reaction-diffusion` `morphogenesis` `bletchley-park` `bombe` `banburismus` `ace` `manchester-mark-1` `polymath` `04-information` `01-mathematics` `05-biophysics` `07-mind` `1912-1954` `england` |

**One-line.** Turing wrote the founding text of computer science (1936), the
founding text of mathematical biology of pattern (1952), and the founding text
of operational AI (1950); each of the three would by itself be a canonical
contribution; together they make him one of the small set of figures whose
single working life produced foundation-tier output across more than two canon
branches.

---

## 2. Life

**London, 1912 — born into the colonial-administrative middle class.** Alan
Mathison Turing was born on 23 June 1912 at a nursing home in Maida Vale,
London, the second son of Julius Mathison Turing, an officer of the Indian Civil
Service stationed in Madras, and Ethel Sara Stoney, daughter of an Anglo-Irish
railway engineer. The Turings were a service-class family with no scientific
tradition; the Stoneys had one — Ethel's uncle was George Johnstone Stoney, the
physicist who in 1891 coined the word *electron*. Julius and Ethel returned to
India shortly after Alan's birth, leaving Alan and his older brother John in the
care of a retired Army colonel and his wife in St Leonards-on-Sea on the south
coast of England, a fostering arrangement common in the imperial civil service
and one Turing later spoke of with reserve rather than warmth.

**Sherborne, 1926–1931 — the Morcom episode.** Turing was sent to Sherborne, a
boys' boarding school in Dorset, in the autumn of 1926. He arrived on the first
day of term during the General Strike and is reported to have cycled the sixty
miles from Southampton when the trains stopped. At Sherborne he was an awkward
fit — a left-handed boy with poor handwriting and an interest in chemistry,
mathematics, and Einstein's relativity at a school whose curriculum centred on
the classics — and the early reports of his masters survive as a kind of
cautionary archive of what schoolmasters get wrong. The single decisive event of
his school years was his friendship with Christopher Morcom, a year ahead of him
and Sherborne's brilliant mathematician. Morcom died of bovine tuberculosis on
13 February 1930. Turing's letters to Morcom's mother, preserved in the King's
College archive, are the earliest sustained writing in his hand on the questions
of mind, body, and what survives the dissolution of the brain — questions that
recur in the 1950 paper twenty years later.

**King's College, Cambridge, 1931–1934 — undergraduate.** Turing entered King's
College, Cambridge, in October 1931 as a mathematics scholar. King's was the
right college for him: the most permissive of the Cambridge colleges in the
1930s, the home of Keynes and Forster, with a quiet acceptance of homosexuality
unusual for the period. He took the Mathematical Tripos, was a Wrangler, and in
his final undergraduate year produced a re-derivation of the central limit
theorem, unaware that the result was already in print (Lindeberg 1922). King's
elected him a Fellow in March 1935 at the age of twenty-two on the strength of
his dissertation extending that work; he was given rooms in the college and the
freedom to pursue research.

**1935–1936 — the Newman lectures and the *Computable Numbers* paper.** In the
spring of 1935 Turing attended Max Newman's Cambridge lecture course on the
foundations of mathematics. Newman set out Hilbert's three open questions about
formal systems — completeness, consistency, decidability (the
Entscheidungsproblem) — and noted that Gödel had settled the first two
negatively in 1931. The third, decidability, was still open: did there exist a
*mechanical procedure* that, given an arbitrary statement of first-order logic,
could decide in finite time whether it was provable? Turing took the question
home. Over the following twelve months, on long runs in the Cambridge fens and
in his King's rooms, he produced the construction now called the Turing machine
and the diagonal argument that uses it to prove the halting problem undecidable
and so the Entscheidungsproblem unsolvable. The paper was finished in April 1936
and submitted to the *Proceedings of the London Mathematical Society* in May.
While it was being refereed, news arrived from Princeton that Alonzo Church had
just published an independent proof of the same result by a different route (the
lambda calculus). Newman wrote to Church on Turing's behalf; Church accepted the
paper as an independent and inequivalent contribution; an appendix sketching the
equivalence of the two formal systems was added at proof stage. The paper
appeared in two parts of *Proc. Lond. Math. Soc.* (2) 42 dated 1937 (the
publication year given on the printed paper, with the volume itself spanning
1936–37) and a short correction in volume 43 the same year.

**Princeton, 1936–1938 — the Church PhD.** Turing sailed to Princeton in
September 1936 on a Procter Fellowship to work formally with Church on a PhD.
Princeton in 1936–38 was, with the founding of the Institute for Advanced Study
three years earlier, the densest concentration of mathematical logic and
mathematical physics in the world: Church, Kleene, and Rosser in logic; Gödel
visiting; von Neumann and Einstein at the IAS; Hardy as a frequent visitor. The
personal connection between Church and Turing established in these two years is
the human anchor of what is now called the Church–Turing thesis — not a theorem
but a meta-mathematical identification of the informal notion *effectively
calculable* with the formal notion *Turing-machine-computable* (equivalently
*lambda-definable*, *general recursive*). The thesis is named for the two of
them because it was their two formal systems, written down in the same year by
mathematicians who then spent two years in the same building, that turned out to
define the same class of functions. Turing's doctoral thesis, defended in spring
1938, generalized the Turing machine by allowing it to consult an external
*oracle* for unsolvable problems, and built a transfinite hierarchy of formal
systems indexed by the constructive ordinals; it was published in 1939 as
"Systems of Logic Based on Ordinals," *Proc. Lond. Math. Soc.* (2) 45, 161–228.
The oracle-machine construction is the historical origin of the relativized
notion of computation that underlies degrees of unsolvability and the
polynomial-hierarchy in modern complexity theory. Turing turned down an offer
from von Neumann to remain at Princeton as his assistant and returned to King's
in the summer of 1938.

**Cambridge, 1938–1939 — the brief return.** Turing resumed his King's
fellowship and gave a lecture course on the foundations of mathematics that
included a now-famous exchange with Wittgenstein on whether contradictions in a
formal system matter (Wittgenstein: not really; Turing: bridges fall down). In
parallel, he had begun in 1938 to do part-time work for the Government Code and
Cypher School (GC&CS) on the Enigma cipher.

**Bletchley Park, 1939–1945 — Hut 8 and the bombe.** On the day after Britain
declared war on Germany — 4 September 1939 — Turing reported full-time to GC&CS
at Bletchley Park, the Victorian country house in Buckinghamshire that was the
wartime headquarters of British signals intelligence. He was assigned to Hut 8,
the section attacking German naval Enigma, and within months had become its
head. Three contributions stand out from his Bletchley work, all of which are
foundational to operational cryptanalysis even where their specific machines are
obsolete:

- The **bombe**, the electromechanical device that searched the Enigma key
  space by automating the consequences of a guessed *crib* (a probable
  plaintext fragment). The first bombe, codenamed *Victory*, ran in March 1940;
  the design was Turing's, with critical refinement by Gordon Welchman, who
  added the *diagonal board* that reduced the number of stops by an order of
  magnitude. By 1945 over two hundred bombes were running across Britain and the
  United States.
- **Banburismus**, a sequential Bayesian procedure Turing developed in 1940–41
  for ranking candidate Enigma rotor settings using long messages punched onto
  long paper sheets cut at Banbury. Banburismus is one of the earliest
  industrial uses of Bayesian inference and of the *ban* and *deciban* — units
  of evidence Turing introduced that are mathematically the base-10 cousin of
  Shannon's bit, predating Shannon's 1948 paper by roughly seven years and
  developed independently in a classified environment.
- Contributions to the cryptanalysis of the **Lorenz cipher** (codename Tunny)
  used for the highest-level German strategic traffic. Turing was not the
  central figure here — Bill Tutte reverse-engineered the Lorenz machine
  without ever seeing it, and Newman and Tommy Flowers built the Colossus
  machines that automated the attack — but Turing's contribution to the
  statistical attack (the procedure called *Turingery* or *Turingismus*) was
  one of the manual methods Colossus then mechanized.

In 1942–43 Turing crossed the Atlantic on the *Queen Elizabeth* and spent
several months in Washington and at Bell Labs liaising on Anglo-American
cryptanalytic cooperation; while at Bell Labs he met Shannon, then working on
the X System (SIGSALY) speech encryption project, and the two had a series of
canteen conversations on machine intelligence and computability that both later
recalled as formative. The full content of those conversations is lost; both men
were under strict wartime compartmentalization rules and could not discuss what
they were actually working on, only the abstract questions adjacent to it. In
the closing years of the war Turing worked on Delilah, a portable
speech-encryption system; it was not deployed before VE day.

The Bletchley contribution is the part of Turing's life that was most
systematically erased from the public record. The first official acknowledgement
came only with F. W. Winterbotham's *The Ultra Secret* (1974); the technical
detail came in waves of declassification beginning in the 1990s; and Turing's
own internal Bletchley reports were not published until 2012 (see *Primary
works* below).

**National Physical Laboratory, 1945–1948 — the ACE design.** After the war
Turing joined the Mathematics Division of the NPL at Teddington with the brief
to design a stored-program electronic computer. His "Proposed Electronic
Calculator" report, submitted in late 1945 and circulated in early 1946, is the
first complete design specification for a stored-program digital computer in
Britain; it predates by some months the formal specifications of EDSAC at
Cambridge and the Manchester Baby. The design is independent of, and
substantially different from, the von Neumann *First Draft of a Report on the
EDVAC* (June 1945, on which Turing certainly drew but which he extended in
specifically British-engineering directions, including a much more aggressive
use of mercury-delay-line storage and a more parsimonious instruction set). NPL
moved slowly, the project was reorganized, and the cut-down Pilot ACE finally
ran in May 1950 — by which time Turing had left for Manchester in frustration at
the institutional pace.

**Manchester, 1948–1954 — the Mark 1, the 1950 paper, the 1952 paper.** Newman,
his Cambridge supervisor, had moved to Manchester after the war and was building
a computing laboratory around F. C. Williams's CRT-storage tube. Turing joined
in October 1948 as Reader in the Theory of Computing. He wrote the first
programming manual for the Manchester Mark 1, designed parts of its instruction
set, and used machine time at night for two distinct research programmes that
became the 1950 and 1952 papers.

The first programme was philosophical and behavioural. "Computing Machinery and
Intelligence," published in *Mind* 59 (1950), 433–460, opens with the question
*Can machines think?*, declares it too ill-defined to admit of a direct answer,
and replaces it with the **imitation game** — a structured behavioural test in
which a remote interrogator, communicating only by teleprinter, attempts to
distinguish a machine respondent from a human respondent. The proposal is not
that the test *defines* intelligence but that it operationalizes the question:
if a machine's text-only responses are indistinguishable from a human's, the
question of whether it *really* thinks is an empirically empty one. The paper
canvasses and answers nine objections (the theological, the heads-in-the-sand,
the mathematical from Gödel, the consciousness objection of Geoffrey Jefferson,
several others) and predicts that by the end of the twentieth century machines
will play the game well enough to fool an average interrogator for five minutes
30 % of the time. This last is the prediction the popular discussion of the
"Turing test" usually quotes; the paper's actual content is more careful than
the test that bears its name.

The second programme was biophysical. "The Chemical Basis of Morphogenesis,"
published in *Phil. Trans. R. Soc. Lond. B* 237, no. 641, 14 August 1952,
37–72, asks how a spatially uniform sphere of chemicals can spontaneously break
its symmetry and form spatial patterns — spots, stripes, segments — of the kind
seen in animal coats, in *Hydra* tentacle arrangement, and in early embryonic
patterning. Turing's answer is a system of two or more chemical species —
*morphogens*, his coinage — that react together and diffuse through tissue; he
shows by linear-stability analysis that under specific conditions involving a
short-range activator and a long-range inhibitor the spatially uniform state is
unstable and the system spontaneously develops a periodic pattern with a
characteristic wavelength set by the ratio of the diffusion constants. This is
the founding paper of the mathematical biology of pattern formation. It was
substantially ignored for a decade, picked up cautiously in the 1960s by
Gierer–Meinhardt, and is now the textbook account; it sits in the same
foundation-tier slot in `05-biophysics` that Mendel's 1866 paper sits in for
genetics. The 1952 paper is Turing's only published work in biology; he had
unfinished work on phyllotaxis (the spiral arrangement of plant leaves) and on
the morphogenesis of the *Anabaena* alga at the time of his death, and the
unpublished material is in the King's archive.

**1952 — the prosecution.** In January 1952 Turing's Manchester home was
burgled by an acquaintance of his then-partner Arnold Murray. When Turing
reported the burglary to the Manchester police he, in passing, acknowledged the
nature of his relationship with Murray. Homosexual acts between men were a
criminal offence under section 11 of the Criminal Law Amendment Act 1885; both
Turing and Murray were arrested and charged with gross indecency. Turing made no
attempt to deny the charge. He was convicted in March 1952 and sentenced to a
choice between imprisonment and a year of hormonal treatment; he chose the
treatment, which consisted of injections of synthetic oestrogen (stilboestrol)
intended to suppress libido. The treatment caused gynaecomastia and other
physical effects; the psychological effect, on the testimony of those who knew
him, was less than the popular biographies imply but real. His security
clearance was revoked, ending his consulting work for GCHQ.

**1954 — death.** Turing was found dead by his housekeeper on the morning of
8 June 1954 at his home in Wilmslow, Cheshire. The cause of death was cyanide
poisoning; a half-eaten apple lay beside the bed but was never analyzed for
cyanide. The coroner returned a verdict of suicide. The popular reading — that
Turing, broken by the prosecution and the hormone treatment, took his own life
in a deliberate echo of the poisoned apple from Disney's *Snow White* (a film he
is said to have particularly liked) — has been the standard one for half a
century.

It is, on the available evidence, not certain. Jack Copeland's 2012
re-examination of the inquest record, the police photographs, and the
contemporary correspondence (*Turing: Pioneer of the Information Age*, OUP 2012,
ch. 14) argues that the evidence is consistent with accidental poisoning by
cyanide vapour from amateur electroplating experiments Turing was conducting in
the small back room of his house, that the apple may have been incidental, and
that Turing in the months before his death was making future plans (booking
holidays, writing letters, applying for grants) of a kind not characteristic of
suicidal ideation. A small number of writers (most loudly David Leavitt) have
floated a third hypothesis — security-service murder, on the theory that a
recently-prosecuted homosexual mathematician with full knowledge of GCHQ's
postwar cryptanalytic capability was a security risk too great to leave alive —
but no documentary evidence supports it and the most careful scholarship
considers it unlikely. The current honest summary is: the cyanide is certain;
the verdict of suicide is the inquest's; the accident hypothesis is the strongest
recent revision and is taken seriously by the field; murder is not supported.

**Posthumous.** Turing was posthumously granted a royal pardon by Queen
Elizabeth II on 24 December 2013. The "Alan Turing law," section 164 of the
Policing and Crime Act 2017, extended the pardon to all men convicted under the
historical anti-homosexuality statutes. He appears on the Bank of England £50
note from 2021. The mythologization of his life since the 1980s, particularly
since Hodges's biography (1983) and the 2014 film *The Imitation Game*, has been
selectively distorting; the present card resists the mythology and tries to keep
to the record.

---

## 3. Branch-by-branch contribution

### 3.1 — `04-information` (primary)

**"On Computable Numbers, with an Application to the Entscheidungsproblem,"**
*Proc. Lond. Math. Soc.* (2) 42 (1937), 230–265, with corrections in (2) 43
(1937), 544–546. The foundational text of computer science. The paper does four
things in succession:

1. It defines a precise mathematical model of *mechanical procedure* — the
   abstract device now called a Turing machine: a finite-state controller
   reading and writing symbols on an unbounded tape according to a finite
   transition table.
2. It defines the *universal machine* — a single Turing machine that, given a
   description of any other Turing machine on its tape, simulates that
   machine's behaviour. This is the abstract original of the stored-program
   computer: program and data live in the same medium.
3. It proves, by a diagonalization argument descended from Cantor and Gödel,
   that the *halting problem* — the question of whether a given machine on a
   given input eventually halts — is undecidable: no Turing machine can answer
   it in the general case.
4. It deduces from this that Hilbert's Entscheidungsproblem — the question of
   whether there exists a decision procedure for first-order logic — has no
   solution.

The 1936 paper is, by the standard of the canon, a single-paper foundation: it
created its discipline. The Church–Turing thesis (the meta-claim that
*effectively calculable* and *Turing-computable* are the same notion) cements
the paper's role as the substrate for everything downstream — recursion theory,
complexity theory, automata theory, programming-language semantics, quantum
computation (whose own foundational paper, Deutsch 1985, is explicitly framed
as a quantum-mechanical extension of the Church–Turing principle).

**"Computing Machinery and Intelligence,"** *Mind* 59 (1950), 433–460. The
imitation-game paper. Founds operational AI: the project of evaluating machine
behaviour by behavioural criteria rather than by introspective or
biological-substrate criteria. Cross-referenced from `07-mind`.

**"Proposed Electronic Calculator"** (NPL, 1945). The first complete design
specification for a stored-program electronic computer in Britain, and one of
the earliest worldwide; the substrate of the Pilot ACE (1950) and the full ACE
(1958).

**Manchester programming.** The first published programmer's manual for the
Manchester Mark 1 (Turing 1950, *Programmers' Handbook for the Manchester
Electronic Computer*) is the earliest detailed description of programming a
stored-program computer in actual operation; it contains, among other things,
the first published account of subroutine calling on a stored-program machine
and a famously idiosyncratic base-32 notation used because the Mark 1's
five-bit teleprinter character set offered no decimal display.

### 3.2 — `01-mathematics` (cross-link)

The 1936 paper is jointly canon-tier in mathematical logic. The Bucket
intake-decision recorded in
`bucket-canon/04-information/_intake/information-canon-pass-1-2026-05-01.md` § 3.2
files the paper primarily under `04-information/` (because its object is the
*machine*, not the formal system, and because the mechanical-procedure framing
is what makes the paper found computer science rather than refine
metamathematics) and cross-links it from `01-mathematics/foundations/`.

**"Systems of Logic Based on Ordinals,"** *Proc. Lond. Math. Soc.* (2) 45
(1939), 161–228. Turing's Princeton PhD. Two contributions of independent
foundational interest: (1) the **oracle machine** — a Turing machine equipped
with an external black-box subroutine that answers questions in some
predetermined unsolvable set in a single step, the device on which the modern
theory of relativized computation, Turing degrees, and the polynomial hierarchy
is built; (2) **ordinal logic** — the construction of a transfinite hierarchy
of formal systems, indexed by computable ordinals, each obtained from its
predecessors by adjoining as new axioms the consistency statements of those
predecessors, exploring how far Gödel-incompleteness can be evaded if the
mathematician is permitted intuition that recognizes ordinals. The 1939 paper
is less famous than 1936 and harder to read, but it is the founding text of two
distinct subfields and stands as a `01-mathematics`-primary in its own right.

### 3.3 — `05-biophysics` (cross-link, foundation-tier)

**"The Chemical Basis of Morphogenesis,"** *Phil. Trans. R. Soc. Lond. B* 237,
no. 641, 14 August 1952, 37–72. The founding paper of the mathematical biology
of pattern formation. The substantive claim is that a system of two or more
chemicals (morphogens) reacting together and diffusing through tissue can
spontaneously produce stable spatial patterns from a homogeneous initial state
when the diffusion constants of the species differ sufficiently — specifically
when there is a short-range *activator* and a long-range *inhibitor*. The
paper's mathematical content is a linear stability analysis of the
reaction–diffusion equations around the homogeneous steady state, deriving the
dispersion relation, identifying the unstable wavenumber band, and computing
the characteristic wavelength of the resulting pattern.

The downstream literature is extensive: Gierer & Meinhardt 1972 (the canonical
activator–inhibitor model); Murray's *Mathematical Biology* (3rd ed. 2003,
2 vols); Kondo & Asai 1995 on the *Pomacanthus* angelfish stripe pattern (the
first clear demonstration of a Turing pattern dynamically rearranging on a
living animal); Sheth et al. 2012 on digit-spacing in mouse limb development as
a Turing-type Sox9 patterning mechanism; the entire modern field of
developmental pattern formation. Turing morphogenesis is now textbook canon in
mathematical and developmental biology and is the founding paper for that
canon.

**Maintainer note (verdict on biophysics pass-1).** See Appendix A below — the
biophysics pass-1 figure cards (`canon-figures/05-biophysics.md`) do *not*
list Turing as a primary or cross-branch figure. Turing 1952 is the
single most important omission in the biophysics seed pass. This bio is the
occasion to flag the omission and propose the cross-branch entry.

### 3.4 — `07-mind` (cross-link)

The 1950 *Mind* paper is the founding text of operational AI in particular and
the founding text of the **computational theory of mind** in its
behavioural-test formulation — the claim that mental states and processes can
in principle be realized in any sufficiently rich computational substrate, and
that the question of whether a system has a mind reduces, at least for
empirical purposes, to the question of whether it behaves as if it does.
Turing's framing has been challenged from at least two distinct directions:
Searle's *Chinese Room* argument (1980) attacks the inference from
behavioural-indistinguishability to genuine understanding; Block's
*Blockhead* thought-experiment (1981) constructs a behaviourally adequate
machine that passes the test by lookup-table without anything mind-like inside.
Both objections are now standard in `07-mind`. Their importance does not
demote Turing's 1950 paper; it confirms its founding role, in the sense that
the discipline still organizes itself around the question Turing posed.

---

## 4. Primary works (exhaustive)

The canonical edited collection is the *Collected Works of A. M. Turing*, four
volumes, North-Holland / Elsevier, 1992–2001, under the general editorship of
the late John L. Britton:

- *Pure Mathematics*, ed. J. L. Britton (1992).
- *Mathematical Logic*, eds. R. O. Gandy and C. E. M. Yates (2001).
- *Morphogenesis*, ed. P. T. Saunders (1992).
- *Mechanical Intelligence*, ed. D. C. Ince (1992).

The single most useful one-volume entry to Turing for a working scholar is
B. Jack Copeland (ed.), *The Essential Turing*, Oxford University Press, 2004,
which collects "On Computable Numbers" (with the corrections), "Systems of
Logic Based on Ordinals," "Computing Machinery and Intelligence," "The Chemical
Basis of Morphogenesis," several Bletchley papers (declassified by then), the
*Computers and Intelligence* BBC discussion, and Copeland's commentary.

The Bletchley Park internal reports were declassified in waves between 1996
and 2012. The most important — Turing's *Mathematical Theory of ENIGMA Machine*,
known to wartime Hut 8 staff as the *Prof's Book* — was declassified by GCHQ
and the National Archives and published in facsimile in 2012; the *Treatise on
the Enigma* and a number of shorter Bletchley reports are now in The National
Archives, Kew, in the HW series (HW 25 and HW 50 in particular).

For the 1936 paper specifically, the indispensable companion is Charles
Petzold, *The Annotated Turing*, Wiley, 2008 — a line-by-line walk-through of
"On Computable Numbers" with the diagonal argument and the universal-machine
construction unpacked at student-readable speed.

---

## 5. Intellectual lineage

**Teachers.**

- **Max Newman** (Cambridge): set the Entscheidungsproblem in his 1935 lecture
  course; later supervised Turing's Cambridge fellowship work; ran the Newmanry
  at Bletchley (the section that broke Tunny with Colossus); brought Turing to
  Manchester after the war. Newman is the single most important scientific
  influence on Turing.
- **Alonzo Church** (Princeton): formal PhD supervisor, 1936–38. The personal
  connection between the two of them is the human anchor of the Church–Turing
  thesis.

**Contemporaries and collaborators.**

- **Kurt Gödel.** Turing 1936 builds explicitly on Gödel 1931 — the Gödel
  numbering technique is the model for the encoding by which a Turing machine
  represents another Turing machine on its tape, and the diagonal argument is
  the same diagonal argument in a different notation. Gödel later said
  (Wang 1974, Gödel's *Collected Works* III, 1995, p. 168) that Turing's 1936
  formalization was the first wholly satisfactory account of *mechanical
  procedure* and that with it the notion of computability was finally on
  precise footing. The acknowledgement is unusually warm for Gödel.
- **Emil Post.** Independently of both Turing and Church, Post in 1936
  formulated a third equivalent model of computation (the Post machine,
  formally close to Turing's). Post's 1936 paper is shorter and was published
  near-simultaneously; he himself acknowledged Turing's prior submission. Post
  later (1944) used Turing's work to formulate the theory of degrees of
  recursive unsolvability.
- **Alonzo Church.** See above; the lambda calculus and the Turing machine are
  the two formal apparatus that, taken together, define modern computability
  theory.
- **Gordon Welchman.** Bletchley colleague; designed the diagonal board that
  made the bombe industrially practical.
- **John von Neumann.** Princeton, 1936–38; offered Turing a postdoctoral
  position; influenced and was influenced by him; the *First Draft of a Report
  on the EDVAC* (1945) draws on Turing 1936's universal-machine concept,
  although the full extent of the influence is contested in the historical
  literature (von Neumann himself acknowledged Turing 1936 as the source of the
  *idea* of a universal machine; the engineering decisions in the *First Draft*
  are von Neumann's).
- **Claude Shannon.** Bell Labs, winter 1942–43; canteen conversations on
  machine intelligence and computation. Independent contributors to information
  theory; the Banburismus *ban* and the Shannon *bit* are the same kind of
  unit, developed independently in different decimal bases on opposite sides of
  the Atlantic under wartime classification.
- **Robin Gandy.** Cambridge PhD student, then friend and intellectual
  executor; ran the King's archive of Turing's papers; co-edited the *Collected
  Works* volume on mathematical logic; Gandy's 1980 paper "Church's Thesis and
  Principles for Mechanisms" is the canonical statement of how the Turing
  framework extends to physical-machine theses.
- **Christopher Strachey.** Manchester collaborator, 1951–54; wrote the famous
  Manchester Mark 1 love-letter program (1952) and the first Mark 1 draughts
  program; later co-founder of denotational semantics with Dana Scott.

**Downstream.**

Effectively all of theoretical computer science. To pick out only the
foundation-tier inheritances: Kleene (recursion theorem, 1938; Kleene–Rosser
paradox; metamathematics of recursive functions); Stephen Cook (NP-completeness,
1971, descended from Turing's halting problem via Church–Turing); Yuri
Matiyasevich (Hilbert's tenth, 1970, descended from Turing's Entscheidungsproblem
via the Davis–Putnam–Robinson program); David Deutsch (the
quantum Church–Turing principle, 1985); the entire programme of computational
theory.

In `05-biophysics`, the downstream of Turing 1952 includes Gierer & Meinhardt
1972, Hans Meinhardt's *Models of Biological Pattern Formation* (1982), James
Murray's *Mathematical Biology* (3rd ed. 2003), Kondo & Asai 1995 on
angelfish stripes, Sheth et al. 2012 on digit specification, and the broader
modern revival of pattern-formation theory in developmental biology and
synthetic biology.

In `07-mind`, the downstream includes the entire imitation-game literature,
the Searle/Block critique tradition, the contemporary discussion of large
language models against the test, and the broader question of behavioural
versus substrate-based criteria of mind that organizes much of contemporary
philosophy of mind.

The biographical downstream is substantial and is a separate matter: Andrew
Hodges, whose 1983 biography (see *Bibliography*) is itself a contribution to
the field of mathematical biography; Jack Copeland, whose archival reopening
of the Bletchley material and of the inquest record has reshaped the
historical record since 2000; the Turing Digital Archive at King's, which has
made roughly three thousand documents publicly accessible online.

---

## 6. What Turing got wrong, and what is contested

**The 1952 model is qualitative, not quantitative.** Turing's reaction–diffusion
equations show that pattern formation is *possible* from purely local
interactions and diffusion; what they do not do, in the 1952 paper, is identify
the actual molecular morphogens in any actual biological system. The first
clear in-vivo identification of morphogens producing a Turing pattern came
only with Sheth et al. 2012 (mouse digit specification) and Müller et al. 2012
(zebrafish lateral-line). The framework holds; the question of how many real
biological patterns are *Turing patterns* in the strict sense rather than (say)
patterns produced by positional-information mechanisms (Wolpert 1969) is still
an open empirical question. Modern systems biology has refined the framework
substantially, including non-linear analyses, finite-domain effects, and
hybrid Turing–Wolpert mechanisms; the founding role of the 1952 paper is not
in dispute.

**The Turing test as adequate criterion of intelligence.** The 1950 paper is
careful — it proposes the imitation game as an *operational replacement* for
an ill-formed question, not as a metaphysical definition of mind. The
discipline has not always been careful in turn. The strongest objections to
the test as commonly understood are Searle's *Chinese Room* (1980, *Behavioral
and Brain Sciences* 3, 417–457) — the argument that syntactic symbol
manipulation, no matter how behaviourally rich, does not constitute
understanding — and Block's *Blockhead* (1981, *Philosophical Review* 90,
5–43) — the construction of a behaviourally adequate but uncontroversially
mindless lookup-table system. Whether either objection succeeds against
Turing's actual 1950 proposal (rather than against the popular simplification
of it) is a continuing debate in `07-mind`.

**The death.** The standard reading — suicide by cyanide in deliberate echo of
the *Snow White* poisoned apple — has been the consensus since 1954. Copeland
2012's accident hypothesis, summarized in §2 above, has shifted the consensus
toward "we do not know"; he argues the inquest was perfunctory, that the apple
was never tested, that cyanide vapour from his electroplating apparatus is a
plausible accidental cause, and that Turing in the months before his death was
not behaviourally consistent with active suicidal ideation. The honest summary
is: cyanide poisoning is certain; the verdict was suicide; the accident
hypothesis is now taken seriously; murder is not supported.

**Bletchley contribution.** The popular picture (driven by Hodges 1983 and the
2014 film) overweights Turing's individual contribution to Enigma at the
expense of Welchman, Tutte, Newman, Flowers, and the Wrens who actually ran the
machines. Turing's contribution is genuine and foundational; it is one of
several genuine and foundational contributions, not the whole of the wartime
achievement.

---

## 7. Archives

- **King's College Cambridge Archive Centre — the AMT Papers.** The primary
  archive, acquired by the college from Turing's mother and from Robin Gandy.
  Catalogued under reference *AMT*. Approximately three thousand items —
  manuscripts, typescripts of unpublished work, letters (including the
  Christopher Morcom correspondence), photographs, the famous gold cipher
  brick, and the school reports. The catalogue is online at the **Turing
  Digital Archive** (https://turingarchive.kings.cam.ac.uk and
  http://www.turingarchive.org), which has made a large fraction of the AMT
  papers freely available as digitized images.
- **The National Archives, Kew — HW series.** The British signals-intelligence
  records, declassified in waves since 1996. HW 25 (mathematical theory of
  ENIGMA, including the *Prof's Book*), HW 14 (operational signals from
  Bletchley), HW 50 (postwar GCHQ research papers). The single most important
  Turing-authored document in this series is *Mathematical Theory of ENIGMA
  Machine*, published in facsimile in 2012.
- **Bodleian Library, Oxford — Newman papers.** Max Newman's papers; relevant
  for the 1935 lecture course and the postwar Manchester correspondence.
- **Manchester John Rylands Library — Newman and Computing collection.**
  Manchester Mark 1 internal documentation; Turing's Manchester programmer's
  handbook; Strachey correspondence.
- **NPL Archive (Science Museum, London).** The ACE design files; the 1945
  "Proposed Electronic Calculator" report.

---

## 8. Bibliography

The canonical sources, in roughly increasing speciality.

- **Andrew Hodges, *Alan Turing: The Enigma*** (Burnett Books 1983; definitive
  centenary edition, Princeton University Press 2014). The standard biography.
  Hodges, himself a mathematician, brings a working understanding of the
  technical content; the book is the source for almost every popular treatment
  of Turing since. The 2014 edition adds a centenary preface that reflects on
  the changes in the historical record since 1983.
- **B. Jack Copeland, *Turing: Pioneer of the Information Age*** (Oxford
  University Press 2012). Shorter, more recent, more revisionist than Hodges.
  This is the book that argues for the accident hypothesis on Turing's death
  and that has done the most to reopen the Bletchley record; Copeland directs
  the Turing Archive in Canterbury.
- **B. Jack Copeland (ed.), *The Essential Turing*** (Oxford University Press
  2004). The canonical edited collection of Turing's primary works in one
  volume, with commentary; the most efficient way to read Turing himself.
- **Charles Petzold, *The Annotated Turing*** (Wiley 2008). A line-by-line
  walk-through of the 1936 paper. Indispensable for anyone who wants to
  understand the construction of the Turing machine and the diagonal argument
  at full speed without having to reconstruct the 1930s notation.
- **Sara Turing, *Alan M. Turing*** (Heffer 1959; centenary edition, Cambridge
  University Press 2012, with a chapter by John Turing). The mother's memoir.
  Defensive in places, indispensable for the family material.
- **B. Jack Copeland (ed.), *Colossus: The Secrets of Bletchley Park's
  Codebreaking Computers*** (Oxford University Press 2006). The collected
  declassified material on Colossus; the indispensable source for what Tunny
  and Colossus actually did and for situating Turing's contribution within
  the larger Bletchley achievement.
- **John L. Britton et al. (eds.), *Collected Works of A. M. Turing*** (4 vols,
  North-Holland / Elsevier, 1992–2001). The definitive collected works; the
  primary source for the technical papers across all four areas.
- **Stuart S. Shapiro, "Computer Software as Technology: An Examination of
  Some Fundamental Questions,"** PhD thesis Carnegie Mellon 1990 — cited here
  because Chapter 3 contains the most rigorous account of Turing's actual
  contribution to the ACE design as distinct from the EDVAC tradition.
- **Robert Soare, "Turing oracle machines, online computing, and three
  displacements in computability theory,"** *Annals of Pure and Applied Logic*
  160 (2009), 368–399 — the canonical modern survey of the 1939 thesis and
  its descendants in recursion theory and complexity.
- **James D. Murray, *Mathematical Biology*** (3rd ed., Springer 2003, 2 vols)
  — the standard textbook locating Turing 1952 in the modern field.
- **Hans Meinhardt, *Models of Biological Pattern Formation*** (Academic Press
  1982) — the canonical extension of Turing 1952 into developmental biology.

---

## 9. Bucket cross-branch placement table

| Work | Year | Primary branch | Cross-branch | Status in Bucket canon |
|---|---|---|---|---|
| "On Computable Numbers, …" | 1936/37 | `04-information` | `01-mathematics` | Canon-tier; placement decided in `04-information/_intake/information-canon-pass-1-2026-05-01.md` § 3.2 — primary in `04`, cross-link from `01`. |
| "Systems of Logic Based on Ordinals" | 1939 | `01-mathematics` | `04-information` | Canon-tier in mathematical logic (ordinal logic, oracle machines); cross-link from `04`. Underweighted in pass-1 figure cards. |
| "Computing Machinery and Intelligence" | 1950 | `04-information` | `07-mind` | Canon-tier in operational AI / philosophy of mind; cross-link from `07-mind`. |
| "Proposed Electronic Calculator" (ACE) | 1945 | `04-information` | — | Engineering-foundation; substrate of British computing. |
| "The Chemical Basis of Morphogenesis" | 1952 | `05-biophysics` | `01-mathematics` (linear stability of PDE systems) | **Canon-tier and missing from `05-biophysics` figure pass-1.** Flagged for pass-2 addition. |
| Bletchley reports (Prof's Book etc.) | 1939–45 | `04-information` (cryptanalysis, sequential Bayesian inference, *ban*) | — | Historical-foundation; partially classified through 2012; not yet bucketed into the canon proper. |

---

## 10. Polymath qualifier

| Branch | Contribution | Foundation-tier? | Test (would the branch's canon have a real hole if removed?) |
|---|---|---|---|
| `04-information` | Turing machine, universal machine, halting problem, Entscheidungsproblem solution; ACE design; programming the Manchester Mark 1; the imitation-game paper | Yes — and the 1936 paper *is* the founding text of the branch | Yes. Without Turing 1936, `04-information` has no foundation paper and the discipline has no precise definition of computability. |
| `01-mathematics` | The Entscheidungsproblem solution (1936) as a math-logic primary; oracle machines and ordinal logics (1939) | Yes for both | Yes. The decision problem and its solution are foundation-tier in mathematical logic; ordinal logic and oracle machines are the substrate of relativized recursion theory. |
| `05-biophysics` | Reaction–diffusion morphogenesis (1952) | Yes | Yes. Without Turing 1952 the mathematical biology of pattern has no founding paper; Gierer–Meinhardt and Murray are downstream extensions of it. |
| `07-mind` | The imitation game (1950) as the founding operational criterion of machine intelligence | Yes | Yes. The contemporary discussion of mind in information-processing terms still organizes itself around the question Turing posed; Searle, Block, and the LLM-evaluation literature are all downstream. |

**Verdict.** Four branches, all foundation-tier, all surviving the
removal-test. Turing is a four-branch polymath, in the same density bracket as
von Neumann (four branches with `07-mind` as cross-link) and Wiener (four
branches with `01-mathematics`, `05-biophysics`, `07-mind` as cross-links).
He should appear in `_polymaths.md` between Wiener and Hildegard of Bingen
when the file is regenerated from `figures.json`.

---

## Appendix A — Verdict on biophysics pass-1

The seed-pass figure cards in `canon-figures/05-biophysics.md` (read 2026-05-01)
do **not** include Turing as a primary or cross-branch figure. The branch
opens with Mendel and proceeds through Pasteur, Franklin, Watson–Crick,
Hodgkin–Huxley, Mitchell, Margulis, Szent-Györgyi, Burr, Becker, Marino, Ling,
Pollack, Popp, Levin, Wallace, Lane, Solís-Herrera, and Khavinson. None of
these cards cross-references Turing 1952; the branch's *What counts as
canon-tier* preamble does not name reaction–diffusion or pattern formation as
a category at all.

This is a real omission, not a placement question. Turing 1952 is the founding
paper of the mathematical biology of pattern formation; the field's textbooks
(Murray, Meinhardt) treat it as such; modern in-vivo identifications of Turing
patterns (Kondo–Asai 1995 on angelfish, Sheth et al. 2012 on mouse digits)
make it an empirically vindicated foundation rather than a speculative one. A
biophysics branch that lists Hodgkin–Huxley as canon-tier (the founding paper
of computational neuroscience by an analogous standard) and *not* Turing 1952
is internally inconsistent.

**Recommended remediation for pass-2 of `05-biophysics`:**

1. Add a cross-reference card for Turing in `05-biophysics.md`, primary-link
   pointing to this bio file at `canon-figures/bios/turing.md`, with the 1952
   paper as the contribution.
2. Add a *pattern formation* category to the branch preamble's *What counts as
   canon-tier* paragraph, alongside the existing categories of foundational
   identification, structural determination, and substrate-level theory.
3. Update `figures.json` to add `05-biophysics` to Turing's `cross_branches`
   array.
4. Update `_polymaths.md` to add Turing as a four-branch polymath
   (`04-information` primary; `01-mathematics`, `05-biophysics`, `07-mind`
   cross-branches).

The omission is the kind of systematic gap that a single-figure bio is well
placed to surface; it is exactly the case the editorial principle "if a branch
you care about looks thin, that means it gets the next pass" was written for.
