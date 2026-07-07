# Structure figures — captions, chapter mapping & evidence notes

Sixteen molecular-structure figures rendered for the Bucket Foundation manual by
`reports/viz/build_structures.py`. Each fetches its source structure by ID (PDB for
proteins/DNA, PubChem CID for small molecules), renders it in house style, and frames
it with labels written for a smart lay reader. Nothing here is wired into
`build_manual.py` yet.

**Reproduce any figure:** `python build_structures.py --only <slug>` · **all 16:** `python build_structures.py` · **list:** `python build_structures.py --list`

**Colour convention (all protein figures):** colours are *functional-module assignments*
chosen for the explanation, not crystallographic B-factors or chain IDs. Stated in every footer.

**Citation provenance:** every author/year/species in a caption was read directly from the
`JRNL`/`SOURCE` records of the cached PDB file (not recalled). Small-molecule formulae and
masses come from the cited PubChem CID.

---

## A. Electron-transport chain — complete set for §37.2.2

The four respiratory complexes plus ATP synthase now form a complete visual walkthrough of
oxidative phosphorylation. Recommended order in §37.2.2: **I → II → III → IV → ATP synthase.**

### 1. `complex-I-etc.png` — NADH:ubiquinone oxidoreductase
- **Home:** §37.2.2 (primary) · Foundations §2.1 (cross-ref)
- **Caption:** Complex I, the chain's entry point. It pulls electrons off NADH, passes them down a wire of seven iron–sulfur clusters, and uses the energy to pump protons across the membrane — the first of three proton pumps. Mammalian Complex I, cryo-EM · PDB 6ZKC (Kampjut & Sazanov 2020).
- **Evidence note:** Structural/mechanistic figure — no clinical claim. Proton-pumping stoichiometry is established biochemistry.

### 2. `complex-II-sdh.png` — succinate dehydrogenase
- **Home:** §37.2.2 (primary)
- **Caption:** Complex II, the chain's side entrance. Also called succinate dehydrogenase — the one enzyme that sits in both the Krebs cycle and the respiratory chain. It feeds electrons in from succinate, but unlike the others it pumps no protons. Porcine Complex II, X-ray · PDB 1ZOY (Sun et al. 2005).
- **Evidence note:** The "does not pump protons" callout is the honest exception that completes the set — Complex II adds electrons but no protons to the gradient. Established biochemistry.

### 3. `complex-III-bc1.png` — cytochrome bc₁
- **Home:** §37.2.2 (primary)
- **Caption:** Complex III, the proton-doubling loop. Cytochrome bc₁ takes electrons from ubiquinone and passes them to cytochrome c — and through the Q-cycle it pumps twice the protons you'd naively expect. Bovine Complex III dimer, X-ray · PDB 1BGY (Iwata et al. 1998).
- **Evidence note:** The Q-cycle proton-doubling is textbook mechanism. No clinical claim.

### 4. `complex-IV-cox.png` — cytochrome c oxidase
- **Home:** §37.2.2 (primary)
- **Caption:** Complex IV, where breathing meets oxygen. Cytochrome c oxidase collects electrons from cytochrome c and uses them to reduce oxygen to water — the reaction that gives your lungs their purpose — while pumping more protons. Bovine Complex IV, X-ray · PDB 1OCC (Tsukihara et al. 1996).
- **Evidence note:** The O₂ → water terminal reaction is established. No clinical claim.

### 5. `atp-synthase-turbine.png` — F₁Fₒ ATP synthase
- **Home:** Foundations §2.3 (primary) · §37.2.2 (cross-ref)
- **Caption:** ATP synthase, the molecular turbine. Protons flowing back into the matrix through the Fₒ motor (blue c-ring) spin the central rotor (red); rotation cycles the three catalytic sites in the F₁ head (gold) to press ADP and phosphate into ATP. The peripheral stator (green) holds the head still. Bovine mitochondrial enzyme, cryo-EM · PDB 5ARA (Zhou et al. 2015).
- **Evidence note:** Rotary catalysis is established (Boyer/Walker Nobel 1997). No clinical claim.

---

## B. Core biology

### 6. `dna-double-helix.png` — B-DNA
- **Home:** Foundations §4.1 (DNA & the genome)
- **Caption:** DNA, the double helix at actual shape. Two antiparallel sugar–phosphate strands wind around each other; the base-pair rungs between them (A–T, G–C) spell the genetic code. The wide major groove is where proteins read the sequence without unzipping it. Drew–Dickerson dodecamer, X-ray · PDB 1BNA (Drew et al. 1981).
- **Evidence note:** Canonical B-form structure. No clinical claim.

### 7. `hemoglobin.png` — human deoxyhemoglobin
- **Home:** §18 B.4.1 (oxygen transport) · Foundations §2 (cross-ref)
- **Caption:** Hemoglobin, the four-seat oxygen taxi. Four subunits (two α, two β), each cradling an iron-containing heme that binds one O₂. Cooperative binding — grabbing the first O₂ makes the next three easier — is what gives the oxygen-dissociation curve its S-shape and lets blood load O₂ in the lungs and release it in tissues. Human deoxyhemoglobin, X-ray · PDB 2HHB (Fermi et al. 1984).
- **Evidence note:** Cooperativity/allostery is established (Perutz). No clinical claim.

### 8. `insulin.png` — porcine insulin
- **Home:** §10.7 (Hormones — see also §13 endocrine)
- **Caption:** Insulin, the smallest hormone that runs your metabolism. Two short peptide chains (A, 21 aa; B, 30 aa) clasped by three disulfide bridges. It is a signal, not an enzyme — it docks on its receptor and tells cells to pull glucose from the blood. Porcine insulin, X-ray · PDB 4INS (Baker et al. 1988).
- **Evidence note:** "Hormone, not enzyme" callout is a conceptual clarification. No clinical dosing claim.

### 9. `igg-antibody.png` — intact IgG
- **Home:** §10.5 (Vaccines / immunity)
- **Caption:** Antibody (IgG), the immune system's Y-shaped grappler. Two Fab arms grip a specific target (their tips vary to fit any shape); the constant Fc stem is the handle immune cells grab to destroy whatever the arms caught. Every monoclonal-antibody drug is built on this shape. Intact murine IgG2a, X-ray · PDB 1IGT (Harris et al. 1997).
- **Evidence note:** Structure is murine IgG2a used as the canonical intact-IgG model — stated in caption. No clinical claim.

### 10. `na-k-atpase.png` — Na⁺/K⁺-ATPase
- **Home:** §14.1.2 (neuron & action potential) · Foundations §3.1 (cross-ref)
- **Caption:** The Na⁺/K⁺ pump, the cell's battery charger. It spends one ATP to push 3 Na⁺ out and pull 2 K⁺ in against their gradients, every cycle — building the ion gradient behind every nerve impulse and heartbeat. This one pump burns roughly a fifth of resting energy. Dogfish-shark Na⁺/K⁺-ATPase, X-ray · PDB 2ZXE (Shinoda et al. 2009).
- **Evidence note:** 3:2 stoichiometry and ~20–25% resting-energy figure are established physiology. Structure is dogfish shark (the classic high-resolution model), stated in caption.

---

## C. Pharmacology small molecules

Each small-molecule figure carries four calibrated callout cards; the fourth is always an
honest evidence caveat. Formula/mass from the cited PubChem CID; stereochemistry as deposited.

### 11. `atorvastatin-structure.png` — atorvastatin (statin)
- **Home:** §10.2 (Lipid-lowering) · §28 B.3 (cross-ref)
- **Caption:** Atorvastatin, the archetypal statin. The shaded dihydroxy-acid "warhead" mimics HMG-CoA and blocks the cholesterol-synthesis enzyme HMG-CoA reductase. PubChem CID 60823 (C33H35FN2O5, 558.6 g/mol).
- **Evidence note (calibrated):** LDL lowering ~35–55% and cardiovascular event reduction are RCT-grade; the caveat card states absolute benefit tracks baseline risk (large in secondary prevention, higher NNT in primary).

### 12. `rosuvastatin-structure.png` — rosuvastatin (statin)
- **Home:** §10.2 (Lipid-lowering)
- **Caption:** Rosuvastatin, the same trick tuned harder. Identical dihydroxy-acid warhead as atorvastatin; a more polar sulfonyl scaffold makes it one of the most potent statins per milligram and keeps it liver-selective. PubChem CID 446157 (C22H28FN3O6S, 481.5 g/mol).
- **Evidence note (calibrated):** JUPITER-grade event reduction is RCT-level; caveat card states "more potent ≠ always better — the right statin is the one that hits your LDL target and you tolerate."

### 13. `metformin-structure.png` — metformin (biguanide / geroprotector candidate)
- **Home:** §10.6 (Geroprotectors)
- **Caption:** Metformin, small molecule and big questions. A biguanide — two joined guanide groups, among the smallest drugs in wide use. First-line for type-2 diabetes for decades and a leading candidate longevity drug. PubChem CID 4091 (C4H11N5, 129.2 g/mol).
- **Evidence note (calibrated):** Glucose lowering is RCT-grade (diabetes); the AMPK/Complex-I longevity mechanism is labelled mechanistic/not settled, and the caveat card states the TAME trial is designed to test anti-aging effects — unproven in humans as of now.

### 14. `rapamycin-structure.png` — rapamycin / sirolimus (mTOR inhibitor)
- **Home:** §10.6 (Geroprotectors) · mTOR mechanism §12 (cross-ref)
- **Caption:** Rapamycin, the mTOR brake. A large macrolide from a Rapa Nui soil microbe; it binds FKBP12 and that pair blocks mTORC1, the cell's grow-vs-repair switch. PubChem CID 5284616 (C51H79NO13, 914.2 g/mol).
- **Evidence note (calibrated):** Lifespan extension in yeast/worms/flies/mice is the strongest animal geroprotector data — labelled as animal-grade. Caveat card states human lifespan data do not exist and the drug is immunosuppressive; intermittent dosing is under study, not proven.

### 15. `empagliflozin-structure.png` — empagliflozin (SGLT2 inhibitor)
- **Home:** §10 (Metabolic drugs) · §22 cardiometabolic-renal (cross-ref)
- **Caption:** Empagliflozin, make the kidney spill sugar. An SGLT2 inhibitor whose glucose-like ring lets it sit in the kidney's main glucose re-uptake transporter, dumping ~60–80 g of glucose a day into urine without insulin. PubChem CID 11949646 (C23H27ClO7, 450.9 g/mol).
- **Evidence note (calibrated):** Heart-failure and renal benefits are RCT-grade (EMPA-REG OUTCOME, EMPEROR). Caveat card flags genital infections and rare euglycemic ketoacidosis — "not for everyone."

### 16. `semaglutide-schematic.png` — semaglutide (GLP-1 receptor agonist)
- **Home:** §10.1 (GLP-1 receptor agonists)
- **Caption:** Semaglutide, a hormone re-engineered to last. The peptide is too large for a skeletal formula, so this schematic shows the GLP-1(7-37) backbone (31 residues) with the three deliberate changes that make one injection work for a week: (1) Aib at position 8 blocks the DPP-4 enzyme; (2) a C18 fatty-diacid tether on Lys26 (via a γGlu linker) clips it onto albumin for a ~1-week half-life; (3) Lys34→Arg allows single-site acylation. Engineering per Lau et al. 2015 (J Med Chem).
- **Evidence note (calibrated):** The three engineering changes and the half-life mechanism are established (Lau et al. 2015; PMID 26308095). Rendered as an annotated schematic, not a crystal structure — stated in caption.

---

## Source-ID reference table

| Slug | Source ID | Species / form |
|---|---|---|
| complex-I-etc | PDB 6ZKC | Mammalian (Kampjut & Sazanov 2020) |
| complex-II-sdh | PDB 1ZOY | Porcine (Sun et al. 2005) |
| complex-III-bc1 | PDB 1BGY | Bovine (Iwata et al. 1998) |
| complex-IV-cox | PDB 1OCC | Bovine (Tsukihara et al. 1996) |
| atp-synthase-turbine | PDB 5ARA | Bovine (Zhou et al. 2015) |
| dna-double-helix | PDB 1BNA | Drew–Dickerson dodecamer (Drew et al. 1981) |
| hemoglobin | PDB 2HHB | Human (Fermi et al. 1984) |
| insulin | PDB 4INS | Porcine (Baker et al. 1988) |
| igg-antibody | PDB 1IGT | Murine IgG2a (Harris et al. 1997) |
| na-k-atpase | PDB 2ZXE | Dogfish shark (Shinoda et al. 2009) |
| atorvastatin-structure | PubChem 60823 | C33H35FN2O5 |
| rosuvastatin-structure | PubChem 446157 | C22H28FN3O6S |
| metformin-structure | PubChem 4091 | C4H11N5 |
| rapamycin-structure | PubChem 5284616 | C51H79NO13 |
| empagliflozin-structure | PubChem 11949646 | C23H27ClO7 |
| semaglutide-schematic | GLP-1(7-37) analogue | 31-residue schematic (Lau et al. 2015) |


---

## D. Pharmacology & foundational molecules — wave 2 (high-mention additions)

Seven high-mention molecules added to `build_structures.py` (same RDKit house-style composer, four evidence-graded callout cards each, fourth card always an honest caveat). Formula/mass/SMILES verified from the cited PubChem CID.

### 17. `cholesterol-structure.png` — cholesterol
- **Home:** Foundations §2 · Clinical Prevention §07 · Cardiometabolic §22
- **Caption:** Cholesterol, the molecule and not the villain. A rigid four-ring sterol the body makes and needs — for membranes, steroid hormones and vitamin D. Risk comes from the number of apoB particles carrying it, over a lifetime. PubChem CID 5997 (C27H46O, 386.7 g/mol).
- **Evidence note (calibrated):** The "apoB particle count, not the molecule" framing is meta/Mendelian-grade (cross-refs `102-cholesterol-particles`, `32-apob-cumulative`). No dosing claim.

### 18. `testosterone-structure.png` — testosterone
- **Home:** Endocrine & Hormones §13 · Medical & Pharmacology §10 · Life Stages §19
- **Caption:** Testosterone, the principal androgen. A cholesterol-derived steroid (both sexes, higher in men) that signals through the androgen receptor to build muscle and bone and drive libido. PubChem CID 6013 (C19H28O2, 288.4 g/mol).
- **Evidence note (calibrated):** Age-related decline (~1%/yr) is a real cohort trend; the caveat card grades replacement as helping measured, symptomatic deficiency — benefit for normal age-related decline is unproven and carries risk.

### 19. `nad-structure.png` — NAD⁺
- **Home:** Foundations §2 · Mitochondrial Health §37 · Geroprotectors
- **Caption:** NAD⁺, the electron ferry of metabolism. The central redox carrier that shuttles electrons into the respiratory chain and fuels sirtuins and PARPs. Tissue levels fall with age. PubChem CID 5893 (C21H28N7O14P2⁺, 664.4 g/mol, oxidised form).
- **Evidence note (calibrated):** The age-related decline is well documented (mechanistic/cohort); the caveat card states NMN/NR raise blood levels but human outcome benefits are surrogate-only, not lifespan data.

### 20. `cortisol-structure.png` — cortisol
- **Home:** Endocrine & Hormones §13 · Recovery, Sleep & Stress §05 · Foundations §6
- **Caption:** Cortisol, the stress and rhythm hormone. The main glucocorticoid, made from cholesterol under HPA-axis control; mobilises glucose, tunes immunity, and follows a daily rhythm. PubChem CID 5754 (C21H30O5, 362.5 g/mol).
- **Evidence note (calibrated):** The diurnal-rhythm emphasis is established physiology; the caveat card names "adrenal fatigue" as not a recognised diagnosis and flags the low value of spot cortisol tests in healthy people.

### 21. `aspirin-structure.png` — aspirin
- **Home:** Medical & Pharmacology §10 · Pharmacology (Full) §28 · Clinical Prevention §07
- **Caption:** Aspirin, the small molecule that reshaped medicine. Acetylsalicylic acid; its acetyl group irreversibly acetylates COX-1/COX-2, blocking prostaglandins and thromboxane. PubChem CID 2244 (C9H8O4, 180.2 g/mol).
- **Evidence note (calibrated):** COX mechanism is established; the caveat card grades secondary-prevention benefit as clear (RCT) and states routine primary-prevention use is no longer advised (bleeding risk offsets benefit).

### 22. `vitamin-d3-structure.png` — vitamin D3 (cholecalciferol)
- **Home:** Nutrition & Supplements §03 · Clinical Prevention §07 · Endocrine §13
- **Caption:** Vitamin D3, the sunlight-made hormone. A secosteroid (split sterol B-ring) the skin makes from a cholesterol relative under UVB, then the liver and kidney activate. PubChem CID 5280795 (C27H44O, 384.6 g/mol).
- **Evidence note (calibrated):** Correcting genuine deficiency (bone, falls in elderly) is supported; the caveat card cites VITAL (RCT) — no cancer/CV benefit in the already-replete. "More is not better."

### 23. `creatine-structure.png` — creatine
- **Home:** Nutrition & Supplements §03 · Mechanism Bridge §12 · Mitochondrial Health §37
- **Caption:** Creatine, the ATP re-buffer. A small guanidinium compound stored in muscle as phosphocreatine, regenerating ATP in seconds during hard effort. PubChem CID 586 (C4H9N3O2, 131.1 g/mol).
- **Evidence note (calibrated):** Strength/lean-mass benefit at ~3–5 g/day monohydrate is among the strongest supplement evidence (RCT/meta); the caveat card grades cognitive/longevity claims as promising but not settled.

### Source-ID reference (wave 2)

| Slug | Source ID | Formula |
|---|---|---|
| cholesterol-structure | PubChem 5997 | C27H46O |
| testosterone-structure | PubChem 6013 | C19H28O2 |
| nad-structure | PubChem 5893 | C21H28N7O14P2⁺ |
| cortisol-structure | PubChem 5754 | C21H30O5 |
| aspirin-structure | PubChem 2244 | C9H8O4 |
| vitamin-d3-structure | PubChem 5280795 | C27H44O |
| creatine-structure | PubChem 586 | C4H9N3O2 |


---

## E. Anatomy originals — class-B redraws (wave 3)

Twelve figures previously composited from open-license Wikimedia images
(`build_realmedia.py`) are now **drawn from scratch in house style** by a new
reproducible generator, `reports/viz/build_anatomy_originals.py`. No borrowed
pixels remain in any of them. Each carries the footer:

> *Original house-style schematic (design-system draw, no borrowed image) · anatomical/mechanistic — no clinical-effect claim*

These are anatomical/mechanistic teaching diagrams, so they make no graded
clinical-effect claim; the footer states that plainly. Real captured-data
micrographs (RA11 epithelial, RA12 connective, RA13 skeletal-muscle histology)
are **not** redrawn — they stay as `build_realmedia.py` output (class-C, must
remain real).

| slug | figure | chapter home | what it shows |
|---|---|---|---|
| RA01-neuron | The neuron | Nervous System §14 | dendrites → soma → axon+myelin → terminals |
| RA02-synapse | The synapse | Nervous System §14 | vesicles, cleft, receptors; NT crossing |
| RA03-mitochondrion | The mitochondrion | Foundations §01 | outer membrane, cristae (ETC), matrix + mtDNA |
| RA15-the-cell | The animal cell | Foundations §01 | nucleus, mitochondria, ER, membrane |
| RA04-nephron | The nephron | Organ Systems §17 | glomerulus → tubule; reabsorption arrows |
| RA09-brain-lobes | The lobes of the brain | Brain §08 | 4 colour-keyed lobes + cerebellum + brainstem |
| RA06-action-potential | The action potential | Nervous System §14 | mV curve: rest → depolarise → repolarise → refractory |
| RA07-dna-replication | DNA replication | Foundations §01 | fork; leading (continuous) vs lagging (Okazaki) |
| RA08-telomere | Chromosome & telomeres | Telomeres §16 | caps + shortening series (young → senescent) |
| RA10-atherosclerosis | Atherosclerosis | Cardiovascular §22 | 4-stage cross-sections: healthy → rupture |
| RA14-heart | The heart | Cardiovascular §22 | 4 chambers, one-way valves, R/L (blue/red) |
| RA05-endocrine-glands | The endocrine glands | Endocrine §13 | 6 gland groups on a body silhouette |

Reproduce: `python build_anatomy_originals.py` (all 12) · `--only <key>` · `--list`.
