# Bucket Foundation — Canon Ingestion Index

*Generated 2026-05-09*

**Total documents in canon corpus**: 872

**FTS index**: 1011 docs searchable via `agf-fts search bucket-foundation "<query>"`


## Sources

| Source | Count | Path |
|---|---|---|
| YouTube transcripts | 126 | `yt/<id>-<slug>/` |
| Archive.org books   | 26 | `archive/<id>/` |
| PubMed papers       | 195 | `pubmed/PMID-<id>-<slug>/` |
| arXiv papers        | 15 | `arxiv/<id>-<slug>/` |
| Blog scrapes        | 50 | `blog/<host>/` |
| Kruse blog corpus   | 460 | `_intake/kruse-blog-corpus/articles/` |

## Concept digests

See [`_intake/concept-digests/INDEX.md`](_intake/concept-digests/INDEX.md) for cross-source briefs on 25 canon-tier topics.


## Tools used (all in ~/bin, org-wide)

- `agf-yt`, `agf-yt-mine`, `agf-yt-clean` — YouTube ingestion + cleanup
- `agf-archive` — archive.org public-domain pulls
- `agf-pubmed` — NCBI E-utilities (PubMed + PMC)
- `agf-arxiv` — arXiv Atom API
- `agf-blog` — generic static-site scraper
- `agf-fts`, `agf-fts-digest` — SQLite FTS5 search + topic briefs
- `canon-status`, `pursue-status` — one-line snapshots

## Autonomous

systemd --user timers (linger=yes, persists across reboots):
- `pursue-mirror.timer` — hourly war.gov PURSUE mirror
- `archive-mirror.timer` — daily archive.org canon-target puller
- `fts-rebuild.timer` — every 6h FTS index rebuild

## Top YouTube ingestions (most-cited Kruse corpus)

*126 podcasts pulled. Sample:*

- #58: Dr Jack Kruse - High Latitude Living, Cold Exposure, Sunlight & Longevity  · `-VFTXZrbyNA-58-dr-jack-kruse-high-latitude-living-cold-expos`
- Dr. Jack Kruse - Magnetism and Health  · `0MmyVoqjkwQ-dr-jack-kruse-magnetism-and-health`
- Dr. Jack Kruse and Andrew Huberman, Ph.D (Part 2)  · `0lBAcUMGIeI-dr-jack-kruse-and-andrew-huberman-ph-d-part-2`
- #39 - Dr. Andrew Marino  · `18lVJi_ioFk-39-dr-andrew-marino`
- Sunlight is King! w/ Dr. Jack Kruse  · `2-AKskkKZzA-sunlight-is-king-w-dr-jack-kruse`
- Robert O. Becker - Electromedicine (Hieronimus - September 16, 1990)  · `2M-Oap97_Tc-robert-o-becker-electromedicine-hieronimus-septe`
- Red Light, Blue Light, Brain Damage: Dr. Jack Kruse Explains WTF Is Actually Hap  · `2njvFN-W4zc-red-light-blue-light-brain-damage-dr-jack-kruse-`
- Epstein, Samurai Take Down & Bitcoin: No One’s Connecting the Dots | Dr  Jack Kr  · `3ILmWtMX_ys-epstein-samurai-take-down-bitcoin-no-one-s-conne`
- Uncovering the Secrets of Life - The 4th Phase of Water with Gerald Pollack  · `3SEmyFm8ZAc-uncovering-the-secrets-of-life-the-4th-phase-of-`
- Gerald Pollack| EZ Water, What is it, Why Do I Need It & How Do I Make It  · `47FzeZNCYL0-gerald-pollack-ez-water-what-is-it-why-do-i-need`
- Cracking the Health Code w/ Dr. Jack Kruse  · `4RlbKZrkgEg-cracking-the-health-code-w-dr-jack-kruse`
- Medisun Podcast #19 Dr. Jack Kruse: Epstein cabal, circus maximus and the 49er's  · `52BwgibSVWU-medisun-podcast-19-dr-jack-kruse-epstein-cabal-c`
- The Most Epic Jack Kruse Interview EVER! EP #75 & #76, The Life Stylist Podcast  · `5W6x7EsE8C4-the-most-epic-jack-kruse-interview-ever-ep-75-76`
- #11 The Fourth Phase of Water: Why the Water in Your Body is Central to Health w  · `5p2H9aTJTfg-11-the-fourth-phase-of-water-why-the-water-in-yo`
- Regenerative Energy & the Light Inside You | Jack Kruse | 221  · `67sLlXeMg2I-regenerative-energy-the-light-inside-you-jack-kr`
- Sunlight Is the Source of Life | Dr. Jack Kruse | EP 04  · `6ClqKnD10p4-sunlight-is-the-source-of-life-dr-jack-kruse-ep-`
- Dr. Jack Kruse Reveals Insights _Banned TED Talk 2012  · `7IjfRQSRLt8-dr-jack-kruse-reveals-insights-banned-ted-talk-2`
- Disconnecting one side of Dr. Becker's regenerative circuit.  · `7LHwUIv5zOo-disconnecting-one-side-of-dr-becker-s-regenerati`
- Why Mitochondria, Water, Light, Magnetism, & MitoHacking with Dr. Jack Kruse  · `7SYSPlQa5eY-why-mitochondria-water-light-magnetism-mitohacki`
- Dr Jack Kruse | Counting Calories Doesn't Work!  · `8V6D0GZbrAs-dr-jack-kruse-counting-calories-doesn-t-work`
- The Fourth Phase of Water - Beyond the Three You Already Know (RTF Lecture with   · `8qqyCA9vz_s-the-fourth-phase-of-water-beyond-the-three-you-a`
- Dr. Jack Kruse: The CIA DON’T Want You To Know This | EP 502  · `BrwjP3zpm64-dr-jack-kruse-the-cia-don-t-want-you-to-know-thi`
- Sunshine is reduction & electron theft vs electron donor oxidation via hydrogen   · `CVwpAzpOVuU-sunshine-is-reduction-electron-theft-vs-electron`
- Nature’s Hidden Healing Powers w/ Dr. Jack Kruse  · `CVz-5qK4zBE-nature-s-hidden-healing-powers-w-dr-jack-kruse`
- The Body Electric - Robert O. Becker  · `CZBLhELkF3U-the-body-electric-robert-o-becker`
- Medisun Podcast #13 Dr. Jack Kruse: The modern medical system is broken and the   · `CgKCJY182r4-medisun-podcast-13-dr-jack-kruse-the-modern-medi`
- Dr Jack Kruse on Neonatal Jaundice .. #healthtopic #usa #healthpodcasts  · `CpJoAUltmgs-dr-jack-kruse-on-neonatal-jaundice-healthtopic-u`
- Revisiting Robert Becker's "The Body Electric" with Margaret Dwyer  · `DHbfLM1VMIk-revisiting-robert-becker-s-the-body-electric-wit`
- How Nicotine Affects Focus & ADHD | Dr. John Kruse & Dr. Andrew Huberman  · `Dj5CqT9QvR0-how-nicotine-affects-focus-adhd-dr-john-kruse-dr`
- Dr. Jack Kruse and Bill Gifford  · `EHe78j9UrMI-dr-jack-kruse-and-bill-gifford`

## Archive.org canonical works

*26 items.*

- **Albert Einstein  E=Mc²** · `AlbertEinsteinEMc`
- **Blue Planet Project UFO TECHNOLOGY** · `BluePlanetProjectUFOTECHNOLOGY`
- **Euclid's Elements Books I II Volume 1 Heath** · `EuclidsElementsBooksIIIVolume1Heath`
- **Notes on the Paranormal** · `ExtrasensoryPerceptionResearchFinding`
- **You Don't Need A Weatherman To Know Which Way The Wind Blows** · `YouDontNeedAWeathermanToKnowWhichWayTheWindBlows_925`
- **[Coursera] Exploring Quantum Physics** · `academictorrents_f24122f15283757aa8a9bf9cb638db266273442d`
- **Bioenergetics** · `bioenergetics00szen`
- **Biokinetic Impacts on Structure and Imaging of the Lung the Concept of Biologica** · `biokinetic-impacts-on-structure-and-imaging-of-the-lung-the-`
- **Communications Primer, A** · `communications_primer`
- **(Blogger) Die or D.I.Y.? Full Archive** · `die-or-d.i.y.-full-archive`
- **Disquisitiones arithmeticae** · `disquisitionesa00gaus`
- **A treatise on electricity and magnetism** · `electricandmagne01maxwrich`
- **Ibogaine Literature** · `ibogaine_literature`
- **LogicalCross** · `logicalcross`
- **MAJESTIC 12 Files** · `majestic-12-files`
- **Newton's Principia : the mathematical principles of natural philosophy** · `newtonspmathema00newtrich`
- **Opticks** · `opticks_1203_librivox`
- **PBS Nova Documentaries** · `pbsnovadocs`
- **Sir Isaac Newtons Principia** · `principia00newtuoft`
- **The principles of chemistry** · `principlesofchem00menduoft`
- **The principles of chemistry** · `principlesofchem01menduoft`
- **Relativity: The Special and General Theory** · `relativity_librivox`
- **The scientific papers of James Clerk Maxwell** · `scientificpapers01maxw`
- **chestnut-multimedia** · `sharware`
- **The Universal One 1926 Walter Russell** · `the-universal-one-1926-walter-russell`
- **Turing's vision : the birth of computer science** · `turingsvisionbir0000bern`

## PubMed top papers (sample)

*195 papers ingested. Sample:*

- Fluorescence measurements detect changes in scallop myosin regulatory domain. · `PMID-10215856-fluorescence-measurements-detect-cha`
- Resting potential of excitable neuroblastoma cells in weak magnetic fields. · `PMID-10823251-resting-potential-of-excitable-neuro`
- Nonlinear response of the immune system to power-frequency magnetic fields. · `PMID-10956232-nonlinear-response-of-the-immune-sys`
- Coincident nonlinear changes in the endocrine and immune systems due to low-frequency magn · `PMID-11549888-coincident-nonlinear-changes-in-the-`
- Nonlinear dynamical law governs magnetic field induced changes in lymphoid phenotype. · `PMID-11748671-nonlinear-dynamical-law-governs-magn`
- Interactions of the two heads of scallop (Argopecten irradians) heavy meromyosin with acti · `PMID-12441001-interactions-of-the-two-heads-of-sca`
- Comment on "proposed test for detection of nonlinear responses in biological preparations  · `PMID-12483668-comment-on-proposed-test-for-detecti`
- Impact of biologically closed electric circuits (BCEC) on structure and function. · `PMID-1286033-impact-of-biologically-closed-electri`
- Vectorial chemistry and the molecular mechanics of chemiosmotic coupling: power transmissi · `PMID-137147-vectorial-chemistry-and-the-molecular-`
- [EXPERIMENTS ON ANAEROBIOSIS OF CANCER CELLS]. · `PMID-14284888-experiments-on-anaerobiosis-of-cance`
- Can we see living structure in a cell? · `PMID-1462129-can-we-see-living-structure-in-a-cell`
- Cytotoxic interaction between gorgonian explants: mode of action. · `PMID-147-cytotoxic-interaction-between-gorgonian-e`
- Electrical pulses appear in the inferior vena cava and abdominal aorta at contraction of l · `PMID-1508989-electrical-pulses-appear-in-the-infer`
- Properties of biophotons and their theoretical implications. · `PMID-15244259-properties-of-biophotons-and-their-t`
- Biophoton emission of human body. · `PMID-15244265-biophoton-emission-of-human-body`
- The function of melanin or six blind people examine an elephant. · `PMID-1546980-the-function-of-melanin-or-six-blind-`
- Foundations of vectorial metabolism and osmochemistry. · `PMID-16134020-foundations-of-vectorial-metabolism-`
- Nonlinear EEG activation evoked by low-strength low-frequency magnetic fields. · `PMID-17350168-nonlinear-eeg-activation-evoked-by-l`
- Foundations of vectorial metabolism and osmochemistry. · `PMID-1823594-foundations-of-vectorial-metabolism-a`
- Spontaneous and light-induced photon emission from intact brains of chick embryos. · `PMID-18726298-spontaneous-and-light-induced-photon`
- Vectorial chemiosmotic processes. · `PMID-20043-vectorial-chemiosmotic-processes`
- A historically significant study that at once disproves the membrane (pump) theory and con · `PMID-20070042-a-historically-significant-study-tha`
- Electric modification of kidney function. The excretion of radiographic contrast media and · `PMID-2055716-electric-modification-of-kidney-funct`
- The physical state of potassium ion in the living cell. · `PMID-2080436-the-physical-state-of-potassium-ion-i`
- Myosin cleft closure determines the energetics of the actomyosin interaction. · `PMID-20837775-myosin-cleft-closure-determines-the-`
- Truth in basic biomedical science will set future mankind free. · `PMID-21970156-truth-in-basic-biomedical-science-wi`
- Origin of microbial life hypothesis: a gel cytoplasm lacking a bilayer membrane, with infr · `PMID-22030900-origin-of-microbial-life-hypothesis-`
- Chemiosmotic coupling in oxidative and photosynthetic phosphorylation. 1966. · `PMID-22082452-chemiosmotic-coupling-in-oxidative-a`
- Consciousness, biology and quantum hypotheses. · `PMID-22925839-consciousness-biology-and-quantum-hy`
- Effect of etafenone on total and regional myocardial blood flow. · `PMID-23-effect-of-etafenone-on-total-and-regional-`

## arXiv papers

*15 papers ingested.*

- Physical Properties of Biological Membranes · `0902.2454-physical-properties-of-biological-membra`
- The physical language of molecular codes: A rate-distortion approach to the evolution and  · `1007.4471-the-physical-language-of-molecular-codes`
- From Physics to Biology by Extending Criticality and Symmetry Breakings · `1103.1833-from-physics-to-biology-by-extending-cri`
- On the evolution of phenomenal consciousness · `1108.4296-on-the-evolution-of-phenomenal-conscious`
- Functional quantum biology in photosynthesis and magnetoreception · `1205.0883-functional-quantum-biology-in-photosynth`
- Bayesian uncertainty analysis for complex systems biology models: emulation, global parame · `1607.06358-bayesian-uncertainty-analysis-for-compl`
- Water Bridging Dynamics of Polymerase Chain Reaction in the Gauge Theory Paradigm of Quant · `1804.02436-water-bridging-dynamics-of-polymerase-c`
- Null geodesic incompleteness of spacetimes with no CMC Cauchy surfaces · `1902.07411-null-geodesic-incompleteness-of-spaceti`
- Basic Ideas and Tools for Projection-Based Model Reduction of Parametric Partial Different · `1911.08954-basic-ideas-and-tools-for-projection-ba`
- Quantum Nonlocality and Biological Coherence · `2212.13117-quantum-nonlocality-and-biological-cohe`
- A complex analogue of the Goodman-Pollack-Wenger theorem · `2303.16467-a-complex-analogue-of-the-goodman-polla`
- A guide to Penrose tilings · `2310.18950-a-guide-to-penrose-tilings`
- Penrose's eight-conic theorem · `2409.17150-penrose-s-eight-conic-theorem`
- Complex-Dynamic Origin of Consciousness and the Critical Choice of Sustainability Transiti · `physics_0409140-complex-dynamic-origin-of-consciou`
- Quantum Computation in Brain Microtubules? Decoherence and Biological Feasibility · `quant-ph_0005025-quantum-computation-in-brain-micr`