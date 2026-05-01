# Everychem & Chemistry Canon Sweep — 2026-05-01

Intake document. Not promoted. Two jobs in one memo: (a) inspect everychem.com, the site we were asked to evaluate, and (b) propose `03-chemistry/` as a full canon branch under the same promotion rule used to seed `09-art/cinema/`. The branch did not exist before this sweep; `03-chemistry/README.md` was created alongside this file.

Author: data pillar (research sweep).
Mirror: `~/agfarms/bucket-foundation/_intake/everychem/2026-05-01/` (8 page captures + 3 adjacent sites + `MANIFEST.md`).

---

## 1. Everychem inventory and thesis

### What it actually is

Everychem.com is a WooCommerce storefront selling research chemicals — primarily nootropics, peptides, and longevity-marketed compounds — to individual buyers. The tagline "The latest in real neuroscientific advances, made possible" frames the catalog. It is a vendor, not a knowledge resource.

### Operator and provenance

The "About" page is one paragraph: "We are an innovative company that focuses on providing high-quality reference materials for research labs across the globe. With the best chemists and manufacturers, you are guaranteed the safety and efficacy expected of a leader in the industry." No named principal, no institutional affiliation, no postal address, no phone number. Contact is a single Cloudflare-obfuscated email. The Terms and Conditions name an arbitration venue (Florida) but no legal entity. Domain registration is via NameCheap, three years old as of search-result reporting (registered ~2022/2023). Trustpilot and Scamadviser reviews are polarized; one review thread describes the operator as a one-person basement operation, which is consistent with the absence of any institutional fingerprint on the site.

### What is on the site

Eight WooCommerce categories — Nootropics, Anxiolytics, Antioxidants, Endogenous Compound, Ergogenics, Longevity, Peptides, Thymoleptics — plus Merchandise (branded apparel) and a Help Center with six KB articles (shipping, returns, COA lookup, lost packages, modifying orders, refund policy). Roughly fifty product SKUs visible across the homepage and `/page/2/`, including aniracetam, piracetam, oxiracetam, coluracetam, phenylpiracetam, citicoline, fasoracetam, MK-677, SKQ1, J-147, NSI-189, agmatine sulfate, semax, selank, epitalon, pinealon, palmitoylethanolamide, oleoylethanolamide, BPN14770, ATX-304, ABT-089, ACD856, KW-6356, GB-115, ITPP, JXL082, PP405, IDRA-21, LGD-4 (a SARM in solution and powder forms), galantamine, idebenone, paraxanthine, mirodenafil, mepb, neboglamine, lemairamin, indolepropionamide, magnesium acetate, carnosic acid, alpha-mannans, cordycepin, tabernanthalog, tropisetron, bromantane, PQQ, organotetraether, androstadienone spray, acipimox.

There is no blog. No article archive. No "About the science" page. No DOI references on product pages. No spectra. No mechanism diagrams. The "neuroscientific advances" framing is marketing copy, not content.

### Tech stack

WordPress 6.8.3 with the SEO Framework plugin (Sybre Waaijer), WooCommerce, hCaptcha, and a payment processor `verified-pay.com`. Cloudflare for DNS, CDN, and bot management. The standard WordPress sitemap (`/wp-sitemap.xml`) returns 404 — actively disabled — and `/sitemap.xml` is behind a Cloudflare interactive challenge. Robots policy explicitly Allow for `ClaudeBot`, `GPTBot`, `OAI-SearchBot`, `PerplexityBot`, `anthropic-ai`, and `Google-Extended`. The 403s our WebFetch tool received are a Cloudflare bot-management decision applied per-request, not a robots-policy decision; a normal browser User-Agent through curl bypasses it cleanly.

### License

No open license. No CC tag. Terms and Conditions place all content rights with Everychem and shift all regulatory and safety liability to the buyer (FDA, EPA, OSHA, TSCA explicitly named). Buyer-warranty language asserts the products are not for human consumption — a standard legal posture for the research-chemicals trade. Florida arbitration. Buyer must be 21 or older.

### Honest verdict on Everychem

This is a small research-chemicals e-commerce shop, run with a thin team (likely one person plus contracted manufacturing and fulfilment), built on off-the-shelf WordPress + WooCommerce. It is not a chemistry knowledge resource. It is not a publisher. It does not produce or curate primary literature. The "EveryChem" brand suggests a chemistry index; the actual site is a nootropics catalog. Calling it "Everychem" makes the same kind of category claim that "EverythingAi.com" would make for a single chatbot wrapper. Substantive corpus: no. Hobby site: not quite — it is a real shop with an order pipeline, a help center, COAs, and regulatory disclaimers. Marketing site for a small commercial operation: yes, exactly that.

It contributes nothing to the chemistry canon.

---

## 2. Canon candidates — primary theoretical texts in chemistry

Each entry: author, title, year, edition-of-record, justification, proposed sub-folder, strength.

### Atomic theory and the molecular hypothesis

**Antoine-Laurent Lavoisier — *Traité élémentaire de chimie*, Cuchet, Paris, 1789.**
Edition of record (modern English): Robert Kerr (tr.), *Elements of Chemistry, in a New Systematic Order, Containing All the Modern Discoveries*, William Creech, Edinburgh, 1790; standard reprint Dover, 1965 (ISBN 0-486-64624-6). Primary statement of conservation of mass in chemical reaction and of the modern (oxygen-based) chemical nomenclature replacing the phlogiston scheme. Originator-tier, mechanism-level, foundational. **Strong.** `atomic-theory/`.

**John Dalton — *A New System of Chemical Philosophy*, Vol. I (1808), Vol. II (1810), Vol. III (1827), R. Bickerstaff, Manchester / G. Wilson, London.**
Edition of record: facsimile reprint Peter Owen / Citadel Press, 1964 (ed. with intro by Sir Frank Greenaway). Primary statement of the chemical atomic theory: matter consists of atoms, atoms of a given element are identical and have a characteristic atomic weight, compounds are combinations in small whole-number ratios. **Strong.** `atomic-theory/`.

**Amedeo Avogadro — "Essai d'une manière de déterminer les masses relatives des molécules élémentaires des corps", *Journal de Physique* 73, 58–76, 1811.**
Edition of record: facsimile in Henry Marshall Leicester and Herbert S. Klickstein (eds.), *A Source Book in Chemistry, 1400–1900*, Harvard University Press, 1952; English tr. in Ostwald's *Klassiker* series and in the Alembic Club Reprints No. 4, *Foundations of the Molecular Theory* (Avogadro and Cannizzaro), Edinburgh, 1893 (PD). Primary statement of Avogadro's hypothesis: equal volumes of gases at the same temperature and pressure contain equal numbers of molecules. The molecular hypothesis was rejected for nearly fifty years; Cannizzaro's 1858 *Sunto di un corso di filosofia chimica* (Alembic Club Reprint No. 18) is the rehabilitating text and is canon-eligible alongside it. **Strong.** `atomic-theory/`.

### Periodicity

**Dmitri Ivanovich Mendeleev — "Sootnoshenie svoistv s atomnym vesom elementov" ("On the Relationship of the Properties of the Elements to their Atomic Weights"), *Zhurnal Russkago Khimicheskago Obshchestva* 1, 60–77, 1869; expanded German version "Die Periodische Gesetzmässigkeit der Chemischen Elemente", *Annalen der Chemie und Pharmacie*, Supplementband 8, 133–229, 1871.**
Edition of record: William B. Jensen (ed.), *Mendeleev on the Periodic Law: Selected Writings, 1869–1905*, Dover, 2002 (ISBN 0-486-44571-2). Jensen translates and contextualizes thirteen papers across the establishment, contestation, and acceptance of the law. Mendeleev's 1871 paper predicting eka-aluminium, eka-boron, and eka-silicon and assigning their properties is the load-bearing one. **Strong.** `periodicity/`.

### Bonding (Lewis structures, valence bond, MO theory)

**Gilbert Newton Lewis — "The Atom and the Molecule", *Journal of the American Chemical Society* 38(4), 762–785, 1916.**
The shared electron-pair bond and the cubical-atom diagram. Originator. Edition of record: the JACS paper itself (PD); reprint in *Journal of Chemical Education* 70(6), 478, 1993. **Strong.** `bonding/`.

**Gilbert Newton Lewis — *Valence and the Structure of Atoms and Molecules*, Chemical Catalog Co., New York, 1923; reprint Dover, 1966 (ISBN 0-486-61053-5).**
The book-length statement of the electron-pair theory of bonding, the octet rule, and the acid-base theory that bears Lewis's name (electron-pair donor / acceptor). **Strong.** `bonding/`.

**Walter Heitler and Fritz London — "Wechselwirkung neutraler Atome und homöopolare Bindung nach der Quantenmechanik", *Zeitschrift für Physik* 44, 455–472, 1927.**
The first quantum-mechanical treatment of the chemical bond (H₂). Founding paper of valence-bond theory. **Strong.** `quantum-chemistry/` with cross-ref to `bonding/`.

**Friedrich Hund — *Linienspektren und periodisches System der Elemente*, Springer, Berlin, 1927; series of papers in *Zeitschrift für Physik* 1925–1928.**
**Robert S. Mulliken — series of papers in *Physical Review* 1928–1932; Nobel lecture 1966.**
Together: the molecular-orbital theory. There is no single load-bearing monograph; the canon entry is the paper series. Practical edition-of-record summary: Charles A. Coulson, *Valence*, Oxford University Press, 1952 (2nd ed. 1961; 3rd ed. as *Coulson's Valence* by R. McWeeny, 1979). Borderline at the original-paper level (no single text), strong at the Coulson summary level. **Strong via Coulson.** `quantum-chemistry/`.

**Linus Pauling — *The Nature of the Chemical Bond and the Structure of Molecules and Crystals*, Cornell University Press, Ithaca, 1939; 3rd edition 1960 (ISBN 0-8014-0333-2).**
Edition of record: third edition, 1960. The pre-publication announcement produced the largest advance sale in Cornell University Press history. Canonical statement of resonance theory, hybridization, electronegativity (the Pauling scale), and the integration of quantum mechanics with structural chemistry. The reference text for chemical bonding for the second half of the twentieth century. **Strong.** `bonding/`.

**Robert B. Woodward and Roald Hoffmann — *The Conservation of Orbital Symmetry*, Verlag Chemie / Academic Press, Weinheim / New York, 1970 (ISBN 3-527-25380-4 in the 2nd printing). Underlying papers: *J. Am. Chem. Soc.* 87, 395 (1965), 87, 2046 (1965), 87, 2511 (1965), 87, 4388 (1965), 87, 4389 (1965).**
The orbital-symmetry rules for pericyclic reactions. Originator framework, mechanism-level, predictively powerful. **Strong.** `bonding/` with cross-ref to `kinetics/`.

### Thermodynamics

**Josiah Willard Gibbs — "On the Equilibrium of Heterogeneous Substances", *Transactions of the Connecticut Academy of Arts and Sciences* 3, 108–248 (1875–1876) and 343–524 (1877–1878).**
Edition of record: *The Scientific Papers of J. Willard Gibbs*, Vol. I: *Thermodynamics*, Longmans, Green, 1906; reprint Dover, 1961 (ISBN 0-486-60721-2 for the two-volume set). The chemical-potential formulation, the phase rule, the Gibbs free energy, the framework on which all of chemical thermodynamics rests. Originator. **Strong.** `thermodynamics/`.

### Kinetics and electron transfer

**Svante Arrhenius — "Über die Reaktionsgeschwindigkeit bei der Inversion von Rohrzucker durch Säuren", *Zeitschrift für physikalische Chemie* 4, 226–248, 1889.**
The Arrhenius equation: rate = A · exp(−E_a/RT). Originator statement of the activation-energy concept. **Strong.** `kinetics/`.

**Svante Arrhenius — "Über die Dissociation der in Wasser gelösten Stoffe", *Zeitschrift für physikalische Chemie* 1, 631–648, 1887.**
The theory of electrolytic dissociation. Originator. **Strong.** `kinetics/` or a small `electrochemistry/` sub-folder if other electrochem texts (Nernst, Debye-Hückel) are added later.

**Henry Eyring — "The Activated Complex in Chemical Reactions", *Journal of Chemical Physics* 3, 107–115, 1935.** Companion: Meredith Gwynne Evans and Michael Polanyi, "Some Applications of the Transition State Method to the Calculation of Reaction Velocities, Especially in Solution", *Transactions of the Faraday Society* 31, 875–894, 1935.
Founding statements of transition-state theory. Edition of record (textbook synthesis): Samuel Glasstone, Keith J. Laidler, and Henry Eyring, *The Theory of Rate Processes*, McGraw-Hill, 1941. **Strong.** `kinetics/`.

**Rudolph A. Marcus — "On the Theory of Oxidation-Reduction Reactions Involving Electron Transfer. I", *Journal of Chemical Physics* 24, 966–978, 1956.**
The Marcus theory of electron transfer; the inverted-region prediction, ultimately Nobel-recognized 1992. Originator. **Strong.** `kinetics/`.

### Stereochemistry

**Jacobus Henricus van 't Hoff — *Voorstel tot Uitbreiding der tegenwoordig in de Scheikunde gebruikte Structuurformules in de Ruimte*, J. Greven, Utrecht, 1874; expanded as *La Chimie dans l'Espace*, P. M. Bazendijk, Rotterdam, 1875.**
**Joseph Achille Le Bel — "Sur les relations qui existent entre les formules atomiques des corps organiques et le pouvoir rotatoire de leurs dissolutions", *Bulletin de la Société Chimique de France* 22, 337–347, 1874.**
Independent and near-simultaneous statements of the tetrahedral carbon and the connection between molecular asymmetry and optical activity. Founding texts of stereochemistry. **Strong.** `stereochemistry/`.

### Reference (normative)

**International Union of Pure and Applied Chemistry — *Compendium of Chemical Terminology* (the "Gold Book"), 2nd edition, Alan D. McNaught and Andrew Wilkinson (eds.), Blackwell Scientific, Oxford, 1997 (ISBN 0-86542-684-8); continuing online updates at goldbook.iupac.org.**
The discipline-standard normative reference for chemical terminology. Promotes under condition 3. **Strong.** `reference/`.

### Borderline

**Peter W. Atkins — *Physical Chemistry*, current edition Atkins, de Paula, Keeler, 12th ed. Oxford University Press, 2022 (ISBN 978-0-19-884781-6).**
The most widely adopted physical-chemistry textbook in the English-speaking world for forty years. Mechanism-level on every chapter but pedagogical in form. **Borderline — strong textbook, not promoted.** Log in landscape, cite as reference.

**F. Albert Cotton and Geoffrey Wilkinson — *Advanced Inorganic Chemistry*, 6th ed. Cotton, Wilkinson, Murillo, Bochmann, Wiley, 1999 (ISBN 0-471-19957-5).**
The discipline-standard advanced inorganic reference for thirty years. **Borderline.**

**Jerry March — *Advanced Organic Chemistry: Reactions, Mechanisms, and Structure*, current edition March's *Advanced Organic Chemistry* by Smith, 8th ed. Wiley, 2019 (ISBN 978-1-119-37180-9).**
The discipline-standard advanced organic reference. **Borderline.**

**Roald Hoffmann and Sason Shaik — *Chemistry, Quantum Mechanics, and Reductionism: Perspectives in Theoretical Chemistry*, 2nd ed. Springer, 2007.**
Borderline, philosophical. Log in landscape unless a specific chapter is excerpted as canon.

### Flagged — keep out of canon, log in landscape

- Robert Boyle, *The Sceptical Chymist*, 1661 — historically pivotal, but pre-mechanism by modern standards. Log in `08-deep-history/`.
- Justus von Liebig, agricultural and analytical-chemistry corpus — discipline-founding for analytical chemistry but the texts are method manuals, not laws. Landscape.
- Friedrich August Kekulé, the benzene-structure papers (1865, 1866) — important historically but the structural claim was superseded by MO and resonance treatments. Cite as reference.
- E. J. Corey, *The Logic of Chemical Synthesis*, Wiley, 1989 — foundational for retrosynthesis as a discipline; borderline, but synthesis logic is a methodology more than a law. Re-evaluate later.
- Walter Kohn / John Pople / DFT corpus — the underlying density-functional theorems (Hohenberg-Kohn 1964; Kohn-Sham 1965) belong in `02-physics/quantum-mechanics/` as primary papers. The chemistry-side practitioner synthesis (Parr and Yang, *Density-Functional Theory of Atoms and Molecules*, Oxford, 1989, ISBN 0-19-509276-7) is a candidate for `quantum-chemistry/` — re-evaluate on a follow-up sweep.

---

## 3. Sub-domain map

For each pillar of chemistry: the primary theoretical anchor, plus the modern discipline-standard text where one exists.

| Pillar | Primary anchor | Modern discipline-standard text |
|---|---|---|
| Atomic theory | Lavoisier 1789, Dalton 1808–27, Avogadro 1811 + Cannizzaro 1858 | (none beyond the primaries) |
| Periodicity | Mendeleev 1869/1871 | Eric R. Scerri, *The Periodic Table: Its Story and Its Significance*, 2nd ed. Oxford University Press, 2020 (history-tier reference; not canon) |
| Lewis structures and electronegativity | Lewis 1916, 1923; Pauling 1939/1960 | Pauling 1960 itself |
| Valence-bond theory | Heitler-London 1927 | Coulson, *Valence*, 2nd ed. 1961 / Coulson's Valence (McWeeny) 3rd ed. 1979 |
| Molecular-orbital theory | Hund and Mulliken paper series 1925–1932 | Coulson 1961; for advanced treatment, Albright, Burdett, Whangbo, *Orbital Interactions in Chemistry*, 2nd ed. Wiley, 2013 (ISBN 978-0-471-08039-8) |
| Resonance and hybridization | Pauling 1939/1960 | Pauling 1960 |
| Orbital-symmetry rules | Woodward-Hoffmann 1965/1970 | Ian Fleming, *Molecular Orbitals and Organic Chemical Reactions: Reference Edition*, Wiley, 2010 (ISBN 978-0-470-74660-8) |
| Chemical thermodynamics | Gibbs 1875–78 | Kenneth Denbigh, *The Principles of Chemical Equilibrium*, 4th ed. Cambridge University Press, 1981 (ISBN 0-521-28150-4) |
| Kinetics (activation energy) | Arrhenius 1889 | Keith J. Laidler, *Chemical Kinetics*, 3rd ed. Harper & Row, 1987 (ISBN 0-06-043862-2) |
| Transition-state theory | Eyring 1935 / Evans-Polanyi 1935 | Glasstone, Laidler, Eyring 1941 |
| Electron transfer | Marcus 1956 | Marcus and Sutin, "Electron transfers in chemistry and biology", *Biochim. Biophys. Acta* 811, 265 (1985) (review-level summary by the originator) |
| Stereochemistry | van 't Hoff 1874 / Le Bel 1874 | Ernest L. Eliel and Samuel H. Wilen, *Stereochemistry of Organic Compounds*, Wiley, 1994 (ISBN 0-471-01670-5) |
| Acid-base theory | Lewis 1923 (electron-pair); Brønsted 1923, Lowry 1923 (proton); Hammett 1937 (acidity functions) | (no single canonical synthesis; primary papers stand) |
| Redox / electrochemistry | Nernst, "Die elektromotorische Wirksamkeit der Ionen", *Zeitschrift für physikalische Chemie* 4, 129 (1889); Debye-Hückel 1923 | John O'M. Bockris and Amulya K. N. Reddy, *Modern Electrochemistry*, 2nd ed. Plenum, 2000 (ISBN 0-306-45554-5) |
| Spectroscopy | Group-theoretic foundations: F. A. Cotton, *Chemical Applications of Group Theory*, 3rd ed. Wiley, 1990 (ISBN 0-471-51094-7) | Cotton 1990 |
| Quantum chemistry | Heitler-London 1927; Born-Oppenheimer 1927 (lives in `02-physics/`) | Attila Szabo and Neil S. Ostlund, *Modern Quantum Chemistry: Introduction to Advanced Electronic Structure Theory*, McGraw-Hill, 1989 (ISBN 0-486-69186-1 Dover reprint) |
| Statistical mechanics of solutions | Debye-Hückel 1923 | Donald A. McQuarrie, *Statistical Mechanics*, University Science Books, 2000 (ISBN 1-891389-15-7); cross-ref `02-physics/statistical-mechanics/` |

Cross-link to `01-mathematics/`: group theory is the formal apparatus behind selection rules, point groups, and crystallographic space groups; Cotton 1990 is the load-bearing chemistry text but the group-theory primaries (Burnside, Weyl) live in mathematics.

Cross-link to `02-physics/`: the Schrödinger equation, the Pauli exclusion principle, Born-Oppenheimer, density-functional theorems, and statistical mechanics are physics canon. Chemistry inherits them and builds law-level chemical statements on top.

Cross-link to `05-biophysics/`: Marcus electron transfer, Eyring kinetics, and Pauling-style structural chemistry are the upstream texts for biomolecular electron transfer, enzyme catalysis, and protein structure. Cite from biophysics, do not duplicate.

---

## 4. Gap analysis and branch design

### Branch did not exist; created in this sweep

`bucket-canon/03-chemistry/` was missing. `README.md` was created in the same commit as this memo, modeled on `09-art/README.md`. The proposed sub-folder structure (mirrored in the README) is:

```
03-chemistry/
  README.md
  CANON_INDEX.md            (created on first promotion)
  _intake/                  (this memo lives here)
  atomic-theory/            Lavoisier, Dalton, Avogadro, Cannizzaro
  periodicity/              Mendeleev (Jensen ed.)
  bonding/                  Lewis 1916, Lewis 1923, Pauling 1960, Woodward-Hoffmann 1970
  thermodynamics/           Gibbs 1875-78
  kinetics/                 Arrhenius 1889, Eyring 1935, Marcus 1956
  stereochemistry/          van 't Hoff 1874, Le Bel 1874
  quantum-chemistry/        Heitler-London 1927, Hund/Mulliken papers, Coulson Valence
  reference/                IUPAC Gold Book 2nd ed. + online; pointers to PubChem, ChEMBL
```

`electrochemistry/` is held back as a possible future split from `kinetics/` once Nernst 1889 and Debye-Hückel 1923 are sourced; if only those two enter, they live in `kinetics/` with a sub-tag.

### What this sweep exposes that Bucket is missing

Three real gaps, ranked.

1. **No primary-paper coverage of the quantum-mechanical foundations of chemistry in `02-physics/`.** Heitler-London 1927, Born-Oppenheimer 1927, Hohenberg-Kohn 1964, and Kohn-Sham 1965 are physics primaries that chemistry depends on. Without them, the chemistry-side bonding canon (Pauling, Coulson) sits on an undocumented foundation. File a bead against `02-physics/` to seed quantum-chemistry primaries there.
2. **No clear home for the IUPAC nomenclature recommendations.** The Gold Book covers terminology; the Red Book (inorganic nomenclature, 2005), Blue Book (organic nomenclature, 2013), Green Book (quantities, units, and symbols in physical chemistry, 3rd ed. 2007), and Orange Book (analytical nomenclature, 1997) are sister normative references. Recommend filing all five under `03-chemistry/reference/iupac/` with the Gold Book as the lead.
3. **No agreed treatment of databases-as-citations.** PubChem, ChEMBL, the Cambridge Structural Database, the Protein Data Bank (PDB cross-links to `05-biophysics/`), Reaxys, SciFinder — these are operational infrastructure, not canon. They should appear in `reference/databases/` as pointer files (one paragraph per database: operator, license, access, citation pattern), not as mirrors. This same convention will be needed in `02-physics/` (e.g. NIST ASD), `01-mathematics/` (OEIS), and `05-biophysics/` (UniProt, PDB, AlphaFold DB). A single org-level memo on database-pointer convention would save duplicate decisions across branches.

### Holes filled

The chemistry branch closes the largest unfilled "obvious" branch in the canon spine: of the seven top-level branches declared in `MANIFESTO.md` and `bucket-canon/`, only `03-chemistry/`, `04-information/`, and `07-mind/` are absent from the existing tree. Opening this one removes one of those three.

---

## 5. Landscape memo — history of chemistry and how Everychem fits (deep-history tier, NOT canon)

**Target folder if accepted:** `08-deep-history/` or a sibling research-landscape area on the history of science. Not a candidate for `03-chemistry/` canon. Approximately 600 words.

Chemistry as a science begins where alchemy stops asserting and starts measuring. The pivot is conventionally placed at Robert Boyle's *The Sceptical Chymist* (London, 1661), which separated the practical operations of the assayer and the apothecary from the doctrine of the four elements and made the "element" a category to be discovered empirically rather than postulated. Boyle did not yet know what an element was; he knew that the question was answerable. For the next century chemistry advanced operationally — Stahl's phlogiston theory organized combustion, Black isolated carbon dioxide, Priestley and Scheele isolated oxygen — without a unifying account of mass change in reaction.

The unifying account arrived with Antoine-Laurent Lavoisier in 1789. *Traité élémentaire de chimie* did three things at once: it restated the conservation of mass as a law of chemical reaction, it identified oxygen as the agent of combustion (deposing phlogiston), and it imposed a systematic nomenclature that named compounds for their composition. Within a decade chemistry had a vocabulary, a balance, and a closed accounting of matter. Lavoisier's execution by the Revolutionary tribunal in 1794 did not stop the program; Berzelius systematized it and published the first reliable table of atomic weights.

John Dalton's *A New System of Chemical Philosophy* (1808–1827) supplied the mechanism. Matter consists of atoms; atoms of a given element are identical; compounds are small whole-number combinations of atoms. Dalton's atomic weights were imperfect because the molecular hypothesis — Avogadro's 1811 statement that equal volumes of gases contain equal numbers of molecules — was rejected for half a century. Cannizzaro's 1858 *Sunto* rehabilitated Avogadro and gave the field a consistent system of atomic and molecular weights at the Karlsruhe Congress in 1860. Within nine years Mendeleev published the periodic law (1869) and predicted three elements (eka-aluminium, eka-boron, eka-silicon) by their position in the table; gallium (1875), scandium (1879), and germanium (1886) confirmed all three predictions inside a generation. The periodic table is the first chemical theory that earned its keep by predicting the existence of particular things rather than by organizing things already known.

The closing decades of the nineteenth century established physical chemistry as a discipline distinct from analytic and synthetic chemistry. Gibbs published *On the Equilibrium of Heterogeneous Substances* (1875–78) in an obscure Connecticut journal and changed the foundations of chemical thermodynamics; Ostwald, van 't Hoff, and Arrhenius founded the *Zeitschrift für physikalische Chemie* in 1887 and built the field around solution thermodynamics, electrolytic dissociation, and reaction kinetics. Van 't Hoff and Le Bel, independently in 1874, founded stereochemistry by proposing the tetrahedral carbon and connecting molecular asymmetry to optical activity.

Quantum chemistry began in 1916 with G. N. Lewis's shared-electron-pair bond — a structural intuition, not yet a quantum-mechanical derivation. Heitler and London supplied the derivation in 1927 (the H₂ molecule from quantum mechanics); Hund and Mulliken built molecular-orbital theory in the late 1920s; Pauling synthesized everything into *The Nature of the Chemical Bond* (1939, definitive 1960). Eyring, Evans, and Polanyi added transition-state theory in 1935. Marcus added the theory of electron transfer in 1956. Woodward and Hoffmann added the orbital-symmetry rules for pericyclic reactions in 1965, retroactively explaining a century of organic-chemistry observations. Walter Kohn and John Pople, working from Hohenberg-Kohn (1964) and Kohn-Sham (1965), built the density-functional and computational machinery that turned the second half of the twentieth century into a computational era. By the 2010s, mid-tier DFT calculations on a laptop reproduced spectroscopic constants chemists once measured with a vacuum line and a chart recorder.

**What Everychem is contributing to this lineage.** Nothing. Everychem is a small American research-chemicals storefront selling nootropics and peptides under a "neuroscientific advances" banner. It does not produce primary literature, curate secondary literature, run a lab, run a trial, or aggregate data. The "EveryChem" name promises a chemistry index; the site is a shop. Bucket should (a) ignore it as a knowledge resource. There is no case to mirror it as a corpus, no case to treat it as a feed402 candidate (it has no data product to sell, and the legal framework around research-chemicals retail is incompatible with the citation-and-attribution posture of feed402), and no case to canonize anything from it. The right place in Bucket for everychem.com is exactly here: a one-paragraph note in this intake memo, retained for due-diligence trail, not promoted to canon and not mirrored further.

---

## Sources used in this sweep

- [Everychem — homepage (mirror)](../../_intake/everychem/2026-05-01/home.md)
- [Everychem — about (mirror)](../../_intake/everychem/2026-05-01/about.md)
- [Everychem — terms and conditions (mirror)](../../_intake/everychem/2026-05-01/terms-and-conditions.md)
- [Everychem — robots.txt](https://everychem.com/robots.txt)
- [Everychem mirror MANIFEST](../../_intake/everychem/2026-05-01/MANIFEST.md)
- [Cornell University Press — Pauling, *The Nature of the Chemical Bond*, 3rd ed.](https://www.cornellpress.cornell.edu/book/9780801403330/the-nature-of-the-chemical-bond/)
- [ACS / J. Chem. Educ. review of Jensen ed., *Mendeleev on the Periodic Law*](https://pubs.acs.org/doi/10.1021/ed084p1279)
- [Internet Archive — Pauling, *The Nature of the Chemical Bond*](https://archive.org/details/natureofthechemicalbondpauling)
- [Wikipedia — IUPAC books (Gold Book context)](https://en.wikipedia.org/wiki/IUPAC_books)
- [Wikipedia — PubChem](https://en.wikipedia.org/wiki/PubChem)
- [EMBL-EBI — ChEMBL](https://www.ebi.ac.uk/chembl/)
- [Scamadviser — everychem.com profile](https://www.scamadviser.com/check-website/everychem.com)
- [Trustpilot — everychem.com reviews](https://www.trustpilot.com/review/everychem.com)
