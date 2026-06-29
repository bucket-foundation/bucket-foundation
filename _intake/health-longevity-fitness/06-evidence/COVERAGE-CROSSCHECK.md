# External Coverage Cross-Check

> **What this is.** An adversarial verification of the manual's claim that it "mapped the entire
> health / medicine territory." The claim is checked against three recognized external taxonomies —
> **WHO ICD-11** (26 top-level chapters), the **recognized medical-specialty list** (~40), and a
> **MeSH** breadth sanity-check — and graded honestly. The job here is to find what is *missing or
> thin*, not to confirm the map. Where the manual is genuinely strong, it is credited; where it is
> shallow relative to a domain's importance, it is flagged.
>
> **Method.** Mapped every ICD-11 chapter and every specialty against the 36 manual chapters
> (`reports/sections/00-atlas.md` + the 35 topic chapters) and the 43 graded-claim domain files.
> Depth grades: **full** = dedicated chapter(s) with graded claims; **partial** = covered inside a
> broader chapter, real but not standalone; **thin** = named/touched, little depth; **missing** = not
> meaningfully present. Verified against my own structured knowledge of the ICD-11 and ACGME/board
> specialty taxonomies; these classifications are stable reference standards and did not require
> live lookup.

---

## Table 1 — ICD-11 (26 top-level chapters)

| # | ICD-11 chapter | Covered? | Where (§) | Depth |
|---|---|---|---|---|
| 01 | Certain infectious or parasitic diseases | Yes | §26 (pathogens, AMR, major infections, pandemics) | **full** |
| 02 | Neoplasms | Yes | §25 (Hallmarks of Cancer, major cancers, treatment, MCED) | **full** |
| 03 | Diseases of the blood / blood-forming organs | Yes | §17.5 (anemia, iron, clotting); leukemia/lymphoma brief in §25 | **partial** |
| 04 | Diseases of the immune system | Yes | §15 (innate/adaptive, immunosenescence, autoimmunity, allergy) | **full** |
| 05 | Endocrine, nutritional or metabolic diseases | Yes | §13 (all axes), §22 (T2D, thyroid, PCOS), §03 (nutrition) | **full** |
| 06 | Mental, behavioural or neurodevelopmental disorders | Yes | §20 (depression→eating disorders), §35 (addiction), ADHD/PTSD | **full** |
| 07 | Sleep-wake disorders | Yes | §05 (sleep, circadian), §23 (OSA) | **partial** — insomnia/OSA/circadian solid; narcolepsy, RLS, parasomnias, central hypersomnias thin |
| 08 | Diseases of the nervous system | Yes | §14 (system), §24 (stroke, MS, Parkinson's, epilepsy, migraine, neuropathy), §08 (dementia) | **full** |
| 09 | Diseases of the visual system | Yes | §11.4 (vision, AMD/cataract/glaucoma), §27 Part D (ophthalmology) | **full** |
| 10 | Diseases of the ear or mastoid process | Yes | §11.5 (hearing), §27 Part C (ENT, vestibular) | **partial** |
| 11 | Diseases of the circulatory system | Yes | §07, §22.1 (CAD, HF, AFib), §24.3 (stroke) | **full** |
| 12 | Diseases of the respiratory system | Yes | §17.1, §23 Part A (asthma, COPD, OSA, ILD) | **full** |
| 13 | Diseases of the digestive system | Yes | §17.4, §23 Part B/C (IBS, IBD, celiac, MASLD, hepatitis, pancreatitis) | **full** |
| 14 | Diseases of the skin | Yes | §11.1 (photoaging), §27 Part A (named dermatoses) | **full** medical derm; cosmetic/procedural thin |
| 15 | Diseases of the musculoskeletal system / connective tissue | Yes | §02, §11.3 (bone), §21 (back/MSK), §24.11–16 (OA, RA, gout, lupus, spondylo) | **full** |
| 16 | Diseases of the genitourinary system | Yes | §17.2 (renal), §22.6–7 (CKD, BPH, UTI, incontinence), §11.6 (pelvic floor) | **partial** — male/renal strong; gynecologic pathology (endometriosis, fibroids, PCOS-as-gyn) thin |
| 17 | Conditions related to sexual health | Partial | §13.4 (sex hormones), §19.4 (fertility), STIs in §26 | **thin** — sexual dysfunction, gender/sexual-health conditions, paraphilic disorders barely touched |
| 18 | Pregnancy, childbirth or the puerperium | Yes | §19.3 (pregnancy & perinatal, evidence-based vs myth) | **partial** — obstetric pathology (pre-eclampsia, GDM, hemorrhage) named, not deep |
| 19 | Certain conditions originating in the perinatal period | Yes | §19.2–3 (DOHaD/Barker, perinatal) | **partial** — neonatology proper is thin |
| 20 | Developmental anomalies | Partial | §18 (genetics primer), §19 (life stages) | **thin** — congenital malformations, chromosomal/dysmorphic syndromes essentially absent |
| 21 | Symptoms, signs or clinical findings, NEC | Partial | distributed: §34 (acute recognition), §21 (pain), §17 (organ readouts) | **partial** — a residual ICD bucket; no dedicated symptom-to-differential layer (by design) |
| 22 | Injury, poisoning / consequences of external causes | Yes | §21 (injury/rehab), §34 (poisoning, environmental emergencies) | **partial** — first-aid/acute solid; trauma surgery/burns/toxicology depth thin |
| 23 | External causes of morbidity or mortality | Yes | §09 (alcohol, tobacco, pollution, toxins, UV), §34 | **partial** |
| 24 | Factors influencing health status / contact with services | Yes | §07 (screening/prevention), §33 (SDOH, systems, access), §29 (behavior) | **full** |
| 25 | Codes for special purposes (e.g. emergency-use, COVID) | Partial | §26.6 (pandemics/COVID) | **n/a-ish** — administrative ICD chapter, not a knowledge domain; spot-touched |
| 26 | Supplementary: Traditional Medicine conditions (Module 1) | Yes | §30 (TCM, Ayurveda, graded skeptically) | **partial** |

**ICD-11 tally.** At-least-partial: **25 / 26** (only #25 "special purposes" is an administrative
code-set rather than a content domain; excluding it, **25 / 25 of the real domains** are at least
partially covered). **Full-depth: 13 / 26 (~50%).** Genuinely thin even though "present": #17 sexual
health, #20 developmental anomalies, #07 sleep-wake (beyond insomnia/OSA), #22 injury/toxicology
depth.

---

## Table 2 — Recognized medical specialties (~40)

| Specialty | Covered? | Where (§) | Depth |
|---|---|---|---|
| Cardiology | Yes | §07, §22.1 | **full** |
| Pulmonology / respiratory | Yes | §17.1, §23A | **full** |
| Gastroenterology | Yes | §17.4, §23B/C | **full** |
| Nephrology | Yes | §17.2, §22.6 | **full** |
| Endocrinology | Yes | §13, §22.2–5 | **full** |
| Neurology | Yes | §14, §24, §08 | **full** |
| Psychiatry | Yes | §20, §35 | **full** |
| Oncology (medical) | Yes | §25 | **full** |
| Hematology | Yes | §17.5; malignant heme §25 | **partial** — benign heme partial; malignant heme brief |
| Infectious disease | Yes | §26 | **full** |
| Rheumatology | Yes | §24.11–16 | **full** |
| Dermatology | Yes | §11.1, §27A | **full** medical; **thin** procedural/aesthetic |
| Ophthalmology | Yes | §27D, §11.4 | **full** |
| Otolaryngology (ENT) | Yes | §27C | **partial-to-full** |
| Urology | Yes | §22.7 (BPH, UTI, incontinence) | **partial** — oncologic/surgical urology thin |
| Obstetrics & Gynecology | Partial | §19.3–4 | **thin** — obstetrics partial; gynecology + gyn-surgery + contraception/ART thin (atlas-flagged) |
| Pediatrics | Partial | §19.5 | **thin** — childhood/adolescence framed; pediatric subspecialties absent |
| Geriatrics | Yes | §19.7–8 (frailty, compression of morbidity) | **full** |
| Emergency medicine | Yes | §34 | **full** (bystander/first-responder framing) |
| Anesthesiology | **No** | — | **missing** (atlas-acknowledged) |
| General surgery + surgical subspecialties | **No** | named per-condition only | **missing** — operative technique, perioperative care absent (atlas-acknowledged) |
| Radiology / imaging | Partial | screening & dx scattered in §07, §22–25 | **thin** — no dedicated imaging-modality treatment; interventional radiology absent |
| Pathology / laboratory medicine | Partial | mechanism in disease atlases; biomarkers in domain L | **partial** — disease mechanism strong; lab-medicine/histopath as a discipline thin |
| Physical medicine & rehabilitation (PM&R) | Yes | §21 | **full** |
| Sports medicine | Yes | §02, §21 | **full** |
| Pain medicine | Yes | §21 (modern biopsychosocial pain model) | **full** |
| Allergy & immunology | Yes | §15.5 | **full** |
| Palliative / hospice medicine | Yes | §19.9 | **partial** |
| Occupational & environmental medicine | Partial | §09, §33 | **partial** |
| Preventive medicine / public health | Yes | §07, §33 | **full** |
| Sleep medicine | Partial | §05 | **partial** — lifestyle/circadian strong; clinical sleep-disorder workup thin |
| Addiction medicine | Yes | §35 | **full** |
| Medical genetics / genomics | Partial | §18 | **partial** — practical/consumer genetics strong; clinical dysmorphology/inborn errors thin |
| Critical care / intensive care | Partial | §34 | **thin** |
| Nuclear medicine | **No** | — | **missing** |
| Plastic & reconstructive surgery | **No** | cosmetic derm only, thin | **missing** |
| Maternal-fetal / reproductive medicine | Partial | §19 | **thin** (atlas-flagged) |
| Dental / oral medicine | Yes | §11.2, §27B | **full** (unusually strong for a non-physician field) |
| Family / primary care medicine | Yes | distributed across §07/§10/§29 | **partial** (as integrative practice, not as a named discipline) |
| Forensic / legal medicine | **No** | — | **missing** (low relevance to this manual's purpose) |

**Specialty tally.** At-least-partial: **~33 / 40**. **Missing or near-missing (~6–7):**
anesthesiology, general/sub-specialty surgery, nuclear medicine, plastic surgery, forensic medicine,
interventional radiology — plus reproductive medicine and critical care that sit at the thin edge.
**Full-depth: ~20 / 40 (~50%).**

---

## Table 3 — MeSH top-category breadth sanity-check

| MeSH category | Spot-check | Verdict |
|---|---|---|
| **[C] Diseases** | Cardiovascular, neoplasms, neuro, endocrine/metabolic, GI, respiratory, MSK, infectious, mental — all present | **Strong.** Gaps mirror ICD: congenital [C16], some genitourinary/gyn pathology, otorhinolaryngologic surgical disease |
| **[D] Chemicals & Drugs** | §28 (pharmacology/PK-PD/PGx), §10 (geroprotectors, GLP-1, statins), §03 (supplements) | **Strong** for therapeutics & nutrients; weak on industrial/agricultural chemistry beyond §09 toxins |
| **[F] Psychiatry & Psychology** | §20 (disorders), §29 (behavior change), §14.7 | **Strong** |
| **[G] Phenomena & Processes** | §01 (bioenergetics, metabolism), §12 (mechanism bridge), §15/§16 (immune/cellular aging) | **Strong** — this is the manual's home turf |
| **[N] Health Care** | §33 (systems, SDOH, access), §07 (screening policy), §29 (adherence) | **Good**; health-economics/QALY methodology thin (atlas-flagged) |

MeSH breadth confirms the ICD/specialty findings: the **physiology, disease, drug, and
mind/behavior** axes are well covered; the consistent shortfall is on the **procedural / surgical /
diagnostic-imaging** axis and a few **disease-class corners** (congenital, sexual-health,
gynecologic).

---

## Computed coverage

Combined external checklist = **26 ICD-11 chapters + 40 specialties = 66 items.**

| Metric | ICD-11 | Specialties | Combined |
|---|---|---|---|
| At-least-partially covered | 25 / 26 (96%) | 33 / 40 (83%) | **58 / 66 ≈ 88%** |
| Full-depth | 13 / 26 (50%) | 20 / 40 (50%) | **33 / 66 ≈ 50%** |

**Headline: ~88% of the recognized external territory is at least partially covered; ~50% is covered
at full depth.** The "we mapped the entire territory" claim is **substantially true at the breadth
level and overstated at the depth level** — which is exactly what the atlas itself concedes ("a
literate map, not a 10,000-disease textbook"). The breadth claim survives cross-check. The honest
correction is: it is a **broad map with a real, *systematic* hole on the procedural / surgical /
diagnostic-imaging axis**, not a uniformly deep one.

---

## Genuine gaps (specific and honest — not inflated)

These are the places where the cross-check found real absence or thinness. Ranked by how load-bearing
the gap is for a health/longevity manual.

1. **Surgery as a discipline — the single biggest systematic hole.** Operative technique,
   perioperative management, surgical decision-making, and the surgical subspecialties (general,
   ortho, neuro, cardiothoracic, vascular, transplant) are named per-condition but never treated.
   Atlas acknowledges this. For a longevity manual this is *partly* defensible (you don't "do"
   surgery to yourself), but procedures like CABG, joint replacement, bariatric surgery, and cancer
   resection are first-line longevity interventions and deserve a decision-grade chapter.
2. **Anesthesiology & critical care** — missing. Perioperative risk, ICU survivorship, and
   post-operative cognitive outcomes matter to the aging reader; absent.
3. **Diagnostic imaging & nuclear medicine** — thin/absent as disciplines. Imaging appears only as
   scattered screening mentions. No treatment of *when* / *which modality* / radiation-dose tradeoffs
   — directly relevant to the "should I get a full-body MRI / coronary CT / DEXA" questions the
   manual's audience actually asks.
4. **Pathology & laboratory medicine as a discipline** — disease *mechanism* is strong, but the
   discipline that produces the numbers (histopathology, lab-test performance characteristics,
   pre-/post-test probability) is thin. This undercuts the manual's own biomarker chapter.
5. **Sexual & reproductive health (ICD-11 ch.17 + OB/GYN)** — thin. Sexual dysfunction,
   contraception methods, ART/IVF, gynecologic pathology (endometriosis, fibroids), and
   menopause-as-clinical-management are under-built relative to how central they are to half the
   population's healthspan. Atlas flags reproductive-medicine depth; sexual health is the broader
   miss.
6. **Developmental anomalies / congenital & pediatric disease (ICD-11 ch.20, Pediatrics)** — thin.
   Childhood is framed as a "health bank account" but pediatric disease, congenital malformations,
   and dysmorphic/chromosomal syndromes are essentially absent. Defensible for an adult-longevity
   focus, but it is a genuine boundary of the map.
7. **Clinical sleep medicine beyond insomnia/OSA** — narcolepsy, RLS, parasomnias, central
   hypersomnias. Sleep is a Layer-3 lever yet the *disorders* side is thin.
8. **Benign + malignant hematology depth** — anemia/iron/clotting are partial; leukemia, lymphoma,
   myeloma, MDS, and coagulopathies are brief.
9. **Toxicology / poisoning depth** — first-aid level only; no real toxidrome or antidote layer.
10. **Health-economics methodology (QALY/cost-effectiveness)** — atlas-acknowledged; the systems
    layer covers essentials but not formal modeling.

---

## Where deeper is warranted (covered, high-value, currently shallow)

Of the areas that *are* covered, these are the highest-leverage targets for additional depth —
ranked by (importance to healthspan) × (current shallowness relative to that importance). These are
the "go deeper on what you already have" list, distinct from the gaps above.

1. **Mitochondria & bioenergetics.** The manual *names* this as the master variable (§01, §12) but
   the mechanistic depth (mitochondrial dynamics, mitophagy, ETC supercomplexes, mtDNA heteroplasmy,
   NAD⁺ metabolism specifics) is shallow relative to the weight the whole thesis places on it. This
   is the foundation everything else claims to rest on — it should be the deepest chapter, and isn't.
2. **The metabolic core (insulin/mTOR/AMPK/glucose-lipid handling).** Covered across §01/§12/§13/§22
   but spread thin. The nutrient-sensing switchboard is the convergence point of nearly every lever;
   it deserves a single deep, unified treatment rather than fragments.
3. **Autophagy & fasting protocols.** Named in §03 (fasting) and §01, but the protocol-grade
   detail (autophagy thresholds, fasting-mimicking, refeeding, who should *not* fast, mTOR–autophagy
   tradeoff with muscle) is light relative to how much the audience cares and how much hype surrounds
   it.
4. **Sleep architecture & circadian biology (mechanism, not just hygiene).** §05 is strong on
   "what to do" but light on the deep mechanism (glymphatic clearance, slow-wave/REM-specific
   functions, circadian gene machinery) that would let a reader reason rather than follow rules.
5. **Immunology / inflammaging.** §15 is good but immunometabolism, the inflammasome, T-cell
   exhaustion/senescence, and trained immunity are shallow relative to inflammaging's role as a
   claimed aging hub.
6. **Senescence & senolytics.** §16 covers it, but the depth (SASP heterogeneity, senolytic trial
   data quality, tissue-specific senescence) lags the field's pace and the audience's interest.
7. **The gut microbiome.** Touched in §17; given its commercial prominence and genuine emerging
   science, the current depth (and the skeptical grading it deserves) is under-built.
8. **GLP-1 / incretin biology.** §10 calls it "the biggest medical story of the decade" yet treats
   it at survey depth — mechanism, the cardio-renal-metabolic outcome data, muscle-loss caveats, and
   the longevity question warrant a deeper, fully-graded standalone treatment.
9. **Epigenetic clocks & biological-age measurement.** §18 is appropriately skeptical but thin on
   the mechanics (which clocks, what they actually predict, reversibility evidence quality) — the
   reader can't currently evaluate the products being sold to them.
10. **Cardiorespiratory fitness / VO₂max as the strongest longevity biomarker.** §02 covers
    training, but CRF — arguably the single best-evidenced modifiable longevity predictor — deserves
    deeper, dedicated mechanistic and dose-response treatment given its evidentiary strength.

---

## Bottom line

The breadth claim holds: **~88% of the ICD-11 + specialty checklist is at least partially covered**,
and the manual honestly flags most of its own edges in the atlas. But the cross-check sharpens the
honest correction the founder asked for:

- **Depth is ~50%, not ~88%** — the map is broad, not uniformly deep.
- The **one systematic, non-random hole is the procedural axis**: surgery, anesthesia, critical
  care, diagnostic imaging, and nuclear medicine. This isn't five unrelated gaps; it's the entire
  "things done *to* a patient in a hospital" half of medicine. Partly defensible for a
  self-directed-longevity manual, but it should be a *stated scope boundary*, not an implied "we
  covered everything."
- Secondary real gaps: **sexual/reproductive & gynecologic health**, **congenital/pediatric
  disease**, **clinical sleep disorders**, and **hematology depth**.
- The highest-value *deepening* targets are, fittingly, the ones the manual's own thesis leans on
  hardest and currently treats most shallowly: **mitochondria, the metabolic core, autophagy/fasting,
  sleep mechanism, and immunology/senescence.**

*Cross-check performed against WHO ICD-11 (2024 release, 26 chapters), the ACGME/board recognized
specialty list (~40), and MeSH top categories. Grades are reproducible from the chapter/atlas
structure; re-running converges.*
