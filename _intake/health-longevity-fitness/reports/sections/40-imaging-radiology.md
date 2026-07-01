# 40 — Diagnostic Imaging & Radiology: Seeing Inside, Honestly

**An image is a *measurement*, not a verdict — and not a checkup.** Imaging answers a *question*.
Pointed at a specific clinical question in the right patient, it is transformative (a stroke
thrombectomy, a staged cancer, a drained abscess). Pointed at a healthy body with no question — the
consumer "whole-body scan" — it predictably finds *something*, and that something is far more often an
**incidentaloma** (a benign finding that triggers a cascade of cost, anxiety, biopsy, and occasional
harm from the workup itself) than a life it saves. The entire honest difficulty of this field lives in
that gap.

Medical imaging is one of the highest-leverage diagnostic technologies ever built, and one of the
largest sources of low-value, harm-generating overuse in modern medicine. Both are true at once. This
chapter covers the **modalities themselves** — the physics each one runs on, what it can and cannot see,
what it costs in radiation and dollars — and the **honest grading** of when an image changes an outcome
versus when it manufactures a problem.

_Not medical advice. Screening with mortality endpoints (mammography, lung LDCT, the whole-body-MRI /
Galleri debunk) lives in §07; cancer staging and PET depth in §25._

---

## 40.0 — How the three honesty rules cut for imaging

The rules (defined in "Start Here") bite hard in imaging. **Predictor ≠ lever:** an image *finds* an abnormality
but does not by itself change a death — a 4 mm lung nodule, a 1 cm adrenal mass, a disc bulge on a back-pain MRI
are predictors (mostly of nothing), and the harm is almost entirely **downstream of the finding** (the workup,
not the photons). **Cohort ≠ RCT:** the radiation–cancer link at CT-scale doses is *modelled and observational*
(LNT extrapolation + childhood-CT cohorts), not RCT-proven, and that uncertainty must be stated in either
direction — whereas a few imaging-*guided* therapies (mechanical thrombectomy for stroke) and one screening AI
(MASAI) **are** RCT-backed and earn the stronger tier. **Something beats nothing, but more is not better:** the
same scanner that saves a symptomatic patient manufactures a problem in an asymptomatic one — imaging's value is
entirely conditional on the pre-test question, and "more imaging = better care" is the most expensive false
belief in the field.

A word on the grading shorthand used below: `cohort` = observational study (people followed over time),
`rct` = randomized controlled trial (the strongest evidence tier), `meta` = pooled analysis across trials,
and `mechanistic`/`theoretical` = based on how the biology *should* work rather than a measured outcome.

> **What this chapter leans on elsewhere.** Screening graded against mortality endpoints (mammography,
> lung LDCT, CAC scoring, the whole-body-MRI / Galleri / Prenuvo debunk) lives in `07-clinical-prevention.md`.
> Cancer staging, PET, and liquid biopsy/MCED depth: `25-oncology.md §25.5–25.7`. DEXA/bone density:
> `11-body-systems.md`. The broader AI-in-medicine and data-governance picture: `33-public-health-systems.md §6`.
> The ionising-radiation-as-carcinogen / hormesis debate: `09-exposures-environment.md`. The underlying physics
> (electromagnetic spectrum, nuclear decay, magnetic resonance): `bucket-canon/02-physics`.

---

## 40.1 — The physics first: imaging is applied electromagnetism and nuclear physics

You cannot grade imaging honestly without knowing what each machine actually *does to the body*, because
the **harm profile is dictated by the physics**, not by the marketing. Every modality is a way of probing
tissue with some part of the physical world and reconstructing a map from how the tissue responds. Four
distinct physical principles cover the entire field:

1. **Ionising electromagnetic radiation (X-rays, CT).** High-energy photons (~keV range) that carry
   *enough energy to knock electrons off atoms* — to **ionise** — which is exactly why they can damage
   DNA and, at a population level, cause cancer. Tissues absorb X-rays in proportion to their density and
   atomic number (bone ≫ soft tissue ≫ air), and the machine images that differential absorption. **The
   image and the hazard are the same photon.** (→ `bucket-canon/02-physics`: the electromagnetic
   spectrum, photon energy = *hf*.)
2. **Non-ionising mechanical waves (ultrasound).** High-frequency sound (~2–18 MHz), well above hearing,
   pulsed into tissue; the machine times and maps the **echoes** off tissue interfaces. Sound is a
   pressure wave, *not* ionising radiation — it carries no DNA-damaging energy — which is why ultrasound
   is the modality of choice in pregnancy and for repeat use. Its limit is also physical: sound is
   reflected by bone and scattered by air/gas, so it cannot see through the skull or into bowel gas.
3. **Nuclear magnetic resonance (MRI).** No ionising radiation at all. A powerful static magnetic field
   (1.5–3 tesla, ~30,000–60,000× Earth's field) aligns the **hydrogen-proton spins** in the body's
   water and fat; radiofrequency pulses tip them; as they relax back they **emit a radio signal** whose
   timing (T1, T2) differs by tissue type. MRI images *the behaviour of protons in a magnetic field* —
   pure quantum-mechanical spin physics (→ `bucket-canon/02-physics`, nuclear spin / Zeeman splitting).
   Superb soft-tissue contrast, no radiation; the costs are money, time, claustrophobia, and a literal
   **magnetic-projectile hazard** (ferromagnetic objects become missiles; implants can heat or move).
4. **Radioactive tracer decay (nuclear medicine, PET).** A radioactive isotope attached to a biologically
   active molecule is injected; the body concentrates it where that molecule is *used*, and the camera
   detects the **gamma rays from radioactive decay** (in PET, the back-to-back 511 keV photons from
   positron–electron annihilation). This is the one modality that images **function and metabolism, not
   anatomy** — and it delivers a real internal radiation dose because the source is *inside you*.

That four-way split — *ionising EM / mechanical wave / magnetic resonance / nuclear decay* — is the
skeleton of everything below.

@@FIG:PS11-imaging-physics@@

---

## 40.2 — The modalities (the master table)

Effective doses are typical adult values in **millisieverts (mSv)**; the natural background dose is
~**3 mSv/year**, and a transatlantic flight is ~**0.04 mSv** — useful anchors for the numbers below.
Costs are order-of-magnitude US list-price ranges (hugely variable); the point is the *ratio*, not the
dollar.

@@FIG:49-imaging-matrix@@

| Modality | Physics | What it sees best | Radiation (typical effective dose) | Rel. cost | Best for | Key limit |
|---|---|---|---|---|---|---|
| **Radiography (plain X-ray)** | Differential X-ray absorption | Bone, lungs (air vs tissue), foreign bodies, free air/gas | **~0.01–0.1 mSv** (CXR ~0.02) | $ | Fractures, pneumonia, line/tube placement, fast triage | 2D projection — overlapping structures; poor soft-tissue detail |
| **Fluoroscopy** | Continuous real-time X-ray | Motion: swallowing, gut transit, catheter/guidewire navigation | **~1–20 mSv** (procedure-dependent; can be high) | $$ | Barium studies, image-guided procedures (see §40.6) | Continuous dose → skin-injury risk in long procedures |
| **CT (computed tomography)** | Rotating X-ray + computed cross-sections | **Everything anatomic, fast**: trauma, bleed, PE, stone, tumour, lung | **~1–10+ mSv** (chest ~5–7; abdo/pelvis ~8–10; CAC ~1) | $$$ | The workhorse of acute care — speed + whole-body anatomy | **Ionising dose** (the central honesty problem); contrast-related risk |
| **Ultrasound** | Reflected high-frequency sound | Soft tissue, fluid/cyst vs solid, blood flow (Doppler), the fetus, the heart (echo) | **None** | $–$$ | Pregnancy, gallbladder/kidney, thyroid, vascular, bedside (POCUS), guidance | **Operator-dependent**; blocked by bone & gas; limited depth |
| **MRI** | Proton magnetic resonance | **Soft tissue supreme**: brain, cord, joints, ligaments, liver, prostate, tumour characterisation | **None** | $$$$ | Neuro, musculoskeletal, oncologic characterisation, anything needing soft-tissue contrast | Slow, expensive, claustrophobic; magnet/implant safety; **incidentaloma magnet** |
| **Nuclear medicine (SPECT, bone scan, V/Q, thyroid)** | Gamma emission from injected tracer | **Function**: bone turnover, perfusion, organ uptake | **~1–10+ mSv** (internal) | $$$ | Functional questions anatomy can't answer (bone mets, perfusion) | Low spatial resolution; internal radiation dose |
| **PET (usually PET/CT or PET/MRI)** | Positron-annihilation gamma detection, often FDG (glucose analogue) | **Metabolic activity** — cancer staging, response, some neuro/cardiac | **~5–25 mSv** (FDG-PET/CT combined) | $$$$$ | Cancer staging & restaging, treatment response, occult disease | Highest dose; expensive; non-specific uptake (infection/inflammation mimics) |
| **DEXA (DXA)** | Dual-energy X-ray absorptiometry | **Bone mineral density**; body composition (fat/lean) | **~0.001–0.01 mSv** (trivial) | $ | Osteoporosis diagnosis (T-score), fracture-risk, body comp | Areal (not volumetric) density; cross-ref `11-body-systems.md` |
| **Mammography** | Low-energy X-ray of compressed breast | Microcalcifications, masses | **~0.4 mSv** per study | $$ | Breast-cancer screening (cross-ref `07 §3.3`) | Dense breasts reduce sensitivity; overdiagnosis (see §07) |
| **Angiography (catheter / CT / MR)** | Contrast + X-ray (or CT/MR) of vessels | Vessel anatomy, stenosis, aneurysm, bleeding source | Catheter: **~5–15+ mSv**; CTA similar to CT | $$$–$$$$ | Mapping/treating vascular disease; the gateway to interventional radiology | Invasive (catheter); contrast & dose; largely a *procedural* tool now |

**How to read this table.** The two columns that matter most for honest decision-making are **radiation**
and **best for**. Notice the structure: the *no-radiation* modalities (ultrasound, MRI, DEXA-effectively)
are the ones you can repeat freely; the *ionising* ones (CT, nuclear, PET, fluoroscopy) buy their
unmatched diagnostic power with a real, if individually small, carcinogenic cost that **compounds across
a population and a lifetime** (§40.3). And the *best-for* column is the whole game: each modality answers
a *different physical question*, which is why "just get a scan" is meaningless — the right answer is
"which scan, for which question, and is the question worth asking?"

### 40.2.1 — Three modality distinctions worth internalising

- **CT vs MRI is not "better vs worse" — it's "fast anatomy with radiation" vs "exquisite soft tissue
  without it."** CT wins for trauma, acute bleeding, the lung, kidney stones, and anything where seconds
  count (a CT chest is ~5 seconds; an MRI is 30–60 minutes). MRI wins for brain, spinal cord, joints,
  ligaments, and characterising soft-tissue masses. They are complements, not rivals.
- **Ultrasound's superpower and weakness are the same fact: it's operator-dependent.** The image is
  generated *and interpreted in real time by the hands holding the probe.* In skilled hands it is fast,
  free of radiation, cheap, and portable (point-of-care ultrasound, **POCUS**, now lives in emergency
  departments, ICUs, and field medicine). In unskilled hands the same machine misses findings — there is
  no permanent objective dataset to over-read later the way there is with CT or MRI.
- **PET images *what tissue is doing*, not *what it looks like*.** FDG-PET uses a radiolabelled glucose
  analogue; metabolically hungry cells (most cancers — the **Warburg effect**, see `25-oncology.md §25.7`)
  light up. This is why PET is a staging tool, not a screening tool: inflammation and infection light up
  too, so a bright spot is a *question*, not an answer.

---

## 40.3 — Radiation, told honestly

This is the part of imaging most often either **fear-mongered** or **dismissed**, and the truth is in
neither camp. Here is the honest version.

### 40.3.1 — The doses, in context

@@FIG:P06-radiation-dose@@

A single CT is **not** dangerous to an individual in any way they will feel — the per-scan excess
lifetime cancer risk is small (order 1-in-1,000 to 1-in-10,000 depending on dose, age, and organ). The
honest problem is not the single scan; it is **scale and repetition**.

### 40.3.2 — The LNT model and the cancer-risk debate (graded honestly)

**The bottom line first:** one CT scan will almost certainly not hurt you. But the ~93 million CT scans
Americans get each year *will* cause cancers at the population level — and the evidence for that is now
solid. The detail below is dense because the numbers are the substance; here is what they add up to.

Radiation protection runs on the **linear no-threshold (LNT) model**: the assumption that cancer risk
rises *linearly* with dose with *no safe threshold*, so even tiny doses carry a tiny proportional risk.
LNT is extrapolated downward from solid data at *high* doses (atomic-bomb survivors, the LSS cohort) into
the *low-dose* CT range where direct measurement is extraordinarily hard. **Its status, stated plainly:**

- **At high doses, ionising radiation is an unambiguous, established human carcinogen** (`outcome`-tier).
  No serious dispute.
- **At CT-scale low doses, LNT is a regulatory *assumption*, not a measured fact** (`theoretical` /
  `mechanistic`). Whether risk is truly linear, has a threshold, or is even mildly *protective*
  (radiation **hormesis**) at the very bottom is contested among radiobiologists, and the
  honest grade is **conflict-open** (cross-ref `09-exposures-environment.md`).[^conflict-lnt] The data
  simply cannot resolve a risk that small at the individual level.
- **But the population signal is now real and recent.** Two strands push the honest reading toward "LNT
  is the prudent operating assumption":
  - **Pediatric cohorts.** Children are more radiosensitive and have more years to express a cancer.
    **Pearce et al. (Lancet 2012)** — UK childhood-CT cohort — found that cumulative red-marrow/brain
    doses from CT were associated with a dose-dependent rise in **leukaemia and brain tumours**.
    **Mathews et al. (BMJ 2013)**, linking CT exposure to cancer in **680,000** young Australians,
    found a **~24% higher overall cancer incidence** in those scanned in childhood/adolescence, rising
    with dose and number of scans. **EPI-CT (Bosch de Basea et al., Nature Medicine 2023)** — **948,174**
    European individuals scanned before age 22 — found an **excess relative risk of ~1.96 per 100 mGy**
    for haematological malignancies, implying roughly **1–2 extra blood cancers per 10,000 children
    scanned** at current doses. These cohorts have an **indication-bias caveat** (sicker kids get scanned,
    and the underlying illness may raise cancer risk) — which the authors work hard to address but cannot
    fully eliminate. Graded `cohort`, direction `supports`, with the confound flagged.
  - **The population-scale projection.** **Smith-Bindman et al. (JAMA Internal Medicine 2025)** modelled
    the ~**93 million CT examinations** performed in the US in 2023 and projected **~103,000 future
    radiation-induced cancers** over the exposed patients' lifetimes — concluding that, *if current
    utilisation persists, CT could eventually account for ~5% of all new cancer diagnoses annually*,
    on par with established lifestyle risk factors. This is a **model** (BEIR-VII risk coefficients ×
    measured dose distributions), not a body count — but it is the clearest statement of the central
    point: **the danger of CT is a public-health problem of volume, not a personal-injury problem of the
    single scan.**

@@FIG:P13-ct-burden@@

### 40.3.3 — When imaging radiation is justified, and when it is not

The governing principles are **justification** (does the expected benefit exceed the expected harm for
*this* patient and question?) and **ALARA** (As Low As Reasonably Achievable — use the lowest dose that
answers the question). The honest decision rule:

- **Justified, no hesitation:** acute symptomatic presentations where the image changes management —
  suspected stroke, major trauma, acute abdomen, suspected PE, cancer staging, a real clinical question
  with a real downstream decision. Here the (small) radiation risk is trivial against the benefit, and
  *withholding* the scan is the actual harm.
- **Often unjustified:** CT for uncomplicated headache, low-risk back pain (→ MRI/none, and usually
  *neither* — see Choosing Wisely, §40.8), repeat CTs done because the prior images weren't retrieved,
  CT "just to be safe" with no decision hanging on the result, and **any ionising scan on an
  asymptomatic person as a "checkup."**
- **The pediatric and pregnancy multiplier:** in children and pregnancy the radiation cost is higher
  (radiosensitivity; longer life-years; fetal exposure), so the bar for justification rises and the
  pull toward **ultrasound or MRI** (no ionising radiation) is stronger whenever they can answer the
  question.

---

## 40.4 — The incidentaloma problem (the big honest point)

This is the conceptual heart of the chapter, and the reason the consumer-scan industry is contested.

**An incidentaloma is a finding the scan was not looking for** — a nodule, cyst, lesion, or "spot" seen
*incidentally* — and in a healthy body, **most of them mean nothing.** The trouble is that the human (and
the algorithm) cannot tell *which* nothing is which without further work, so a single image spawns a
**cascade**: a follow-up scan, then another to confirm stability, then a referral, sometimes a biopsy
(with its own bleeding/infection/pneumothorax risk), nearly always **anxiety**, and occasionally
**overdiagnosis and overtreatment** of a "cancer" that would never have harmed the person. The harm is
real even when the finding is benign — it is the *cascade*, not the lesion, that injures.

**The data are not subtle:**

- **O'Sullivan, Ioannidis et al. (BMJ 2018)** — an **umbrella review** (20 systematic reviews, 240
  primary studies) of incidental imaging findings — found incidentaloma prevalence **varies enormously by
  modality**: under 5% for chest CT (for incidental PE) and whole-body PET, but **over a third** of
  cardiac MRIs, chest CTs (for thoracic/abdominal/spinal/cardiac incidentalomas), and CT colonography
  (extra-colonic findings); ~22% for brain and spine MRI. And the **malignancy rate within an
  incidentaloma** also varies by organ — under 5% for brain/parotid/adrenal, but ~25% for renal,
  thyroid, and ovarian, and ~42% for breast. Translation: **the more you image, and the more
  comprehensively, the more "abnormalities" you find — and most are benign noise that still cost
  something to chase.**
- **Whole-body MRI in healthy volunteers** is the cleanest demonstration. A prospective study of 148
  *healthy* research volunteers (Eur J Radiol 2009) found **29% had an abnormal scan** and ~**13% had a
  finding of clinical significance** — in people with no symptoms — with the rate climbing with age and
  BMI. Scale that to a marketed consumer product and you have an **engine for manufacturing patients.**

@@FIG:Z02-incidentaloma@@

**Why this makes whole-body consumer MRI screening contested (cross-ref `07 §6`, `25 §6`):**
products like **Prenuvo** (whole-body MRI) and **Galleri** (the MCED — multi-cancer early detection —
blood test, graded in §07/§25) are
sold to the asymptomatic worried-well on the intuition that *finding things early must be good.* But the
intuition fails because of the base-rate math above: in a low-prevalence (healthy) population, the
**positive predictive value of an incidental finding is low**, so the test produces mostly false alarms
and cascades. **No randomised trial shows whole-body MRI screening reduces mortality** in average-risk
people; what it reliably produces is incidentalomas, downstream procedures, cost, and anxiety. The honest
verdict (matching §07): reasonable only in **specific high-risk genetic syndromes** (e.g., Li-Fraumeni
*TP53* carriers, where guideline whole-body MRI surveillance *is* indicated), and **not** a checkup for
the general worried-well.[^conflict-wbmri]

> **The asymmetry that the marketing hides:** the *benefit* of a consumer scan (the rare early cancer it
> does catch) is vivid, namable, and used in the ad. The *harm* (thousands of cascades, biopsies,
> and anxieties spread across everyone who scanned and found benign noise) is diffuse, statistical, and
> invisible — but in expectation, for an average-risk person, **the diffuse harm is larger.** Imaging is
> the textbook case where "I found something and caught it early" is a survivorship-biased story, not
> evidence.

---

## 40.5 — Functional & molecular imaging (seeing physiology, not just anatomy)

The frontier of imaging is the move from **structure to function** — picturing not what tissue *looks
like* but what it is *doing*. PET (§40.2) is the established example; the growing edge includes:

- **Functional MRI (fMRI)** — maps brain activity via the BOLD signal (blood-oxygen-level-dependent
  contrast), the workhorse of cognitive neuroscience research. Honest caveat: fMRI is a **research and
  localisation tool** with real reproducibility and statistical-inference problems when overinterpreted
  ("blobology"); it does not read minds and is not a clinical diagnostic for psychiatric disease
  (cross-ref `14-nervous-system.md`, `20-mental-health-psychiatry.md`).
- **Diffusion / perfusion imaging** — DWI on MRI detects acute stroke within minutes (cytotoxic oedema
  restricts water diffusion) and is central to the thrombectomy decision (§40.6).
- **PET tracers beyond FDG** — amyloid- and tau-PET for Alzheimer's pathology (a *biomarker*, graded
  carefully against clinical dementia — predictor, not destiny; cross-ref `24-disease-neuro-rheum.md`),
  PSMA-PET for prostate cancer (a genuine staging advance).
- **Theranostics** — the same molecule that *images* a tumour (a labelled ligand) delivers *therapy*
  when swapped to a therapeutic isotope (e.g., Lu-177 PSMA for prostate cancer). Imaging and treatment
  become one act — a real, RCT-supported advance (`rct`-tier in specific settings).

The honesty rule for functional imaging is the same as for everything else: a **biomarker image is a
predictor**, and the gap between "the scan lit up" and "the patient is better off knowing" must be
defended, not assumed.

---

## 40.6 — Interventional radiology (the under-appreciated revolution)

If diagnostic imaging is "seeing inside," **interventional radiology (IR)** is *reaching* inside —
using imaging (fluoroscopy, ultrasound, CT) to guide needles, catheters, and wires to perform, through a
pinhole, what once required open surgery. It is one of the most consequential and least-publicly-known
fields in medicine, and it inverts the usual imaging story: here imaging is not the predictor, it is the
**lever.**

The field's origin is a 1964 act of nerve: **Charles Dotter** threaded a catheter through a narrowed leg
artery to dilate it without surgery — inventing angioplasty and, with it, the whole discipline of
image-guided therapy. What grew from it:

- **Mechanical thrombectomy for acute ischaemic stroke** — the flagship, and **RCT-proven**. A catheter
  is navigated into the brain to physically pull out the clot occluding a large vessel. The **HERMES
  collaboration** (pooled analysis of 5 RCTs, *Lancet* 2016) showed thrombectomy roughly **halves
  disability** versus medical therapy alone, with a **number-needed-to-treat of ~2.6** to reduce
  disability by one level — among the most powerful effect sizes in all of acute medicine. Image-guided
  intervention here is not adjunct; it is the definitive treatment. (`rct`/`meta`-tier.)
- **Angioplasty & stenting** (coronary and peripheral), **aneurysm coiling/flow-diversion**,
  **TIPS** (portal hypertension), **uterine-artery embolisation** (fibroids — an organ-sparing
  alternative to hysterectomy), **trans-arterial chemoembolisation / radioembolisation** (liver tumours),
  **percutaneous biopsy, drainage of abscesses, nephrostomy, biliary drainage**, **vertebroplasty**,
  **tumour ablation** (radiofrequency/microwave/cryoablation of liver, kidney, lung, bone lesions), and
  **embolisation to stop haemorrhage** (trauma, GI bleed, postpartum).

**Why it matters for this manual:** IR delivers definitive therapy with **dramatically less trauma,
shorter recovery, and lower complication rates** than the open operations it often replaces — frequently
under local anaesthesia, often same-day. It is the clearest case in the corpus where imaging buys a
**genuine outcome**, not a worry. The honest caveats are ordinary procedural ones (contrast, radiation
dose to patient and operator, access-site bleeding) — small against what it replaces.

---

## 40.7 — AI in imaging (the honest state)

Medical imaging is where artificial intelligence in medicine is **furthest along** — and also where the
**benchmark-vs-outcome gap** is most instructive. (For the broader AI-in-medicine picture and data
governance, see `33-public-health-systems.md §6` — do not duplicate.)

**What is true:**

- Imaging is the ideal substrate for deep learning: large labelled pixel datasets, narrow well-defined
  detection tasks, a clear ground truth. On those narrow tasks — detecting diabetic retinopathy on
  fundus photos, flagging large-vessel occlusions, triaging chest X-rays, segmenting tumours — modern
  convolutional and transformer models reach **radiologist-level accuracy on benchmark datasets**, and a
  few are FDA-cleared. **IDx-DR / LumineticsCore** (autonomous diabetic-retinopathy screening) was the
  first FDA-authorised *autonomous* AI diagnostic (2018) — cross-ref `33 §6`.
- **MASAI (Lång et al., *Lancet Oncology* 2023, with full analysis 2025)** is the strongest evidence to
  date and the right kind: a **prospective randomised trial** of AI-supported vs standard double-reading
  in population breast screening (>100,000 women). AI support **increased cancer detection ~29%**
  (6.4 vs 5.0 per 1,000) **without a significant rise in false positives**, and **cut radiologist
  reading workload ~44%.** This is real, `rct`-tier evidence that AI can *augment* a screening programme.

**What honesty demands alongside it:**

- **Benchmark accuracy ≠ deployment benefit.** The field has *thousands* of "AI matches radiologists"
  papers and a *handful* of prospective trials with patient outcomes. Models that excel on the dataset
  they were trained and tested on frequently **degrade on external data** from a different scanner,
  hospital, or population (distribution shift) — the well-documented external-validation gap.
- **Even MASAI's win carries the chapter's own warning.** Detecting **29% more cancer** sounds
  unambiguously good — but part of the extra yield was **small and in-situ (DCIS — ductal carcinoma in situ, the earliest, non-invasive stage) disease**, which raises
  the same **overdiagnosis** question as mammography itself (`07 §3.3`). The trial's *primary* endpoint —
  whether catching more *reduces interval cancers and ultimately deaths* — is still in follow-up. More
  detection is not yet proven to be more benefit. The rule holds even for the best AI study in imaging.
- **Automation bias and deskilling** are live risks: clinicians who trust an algorithm may stop looking
  as hard, and an AI model that is wrong in a systematic way fails *correlated* across many patients in a
  way a fatigued human does not.
- The famous **Geoffrey Hinton 2016 prediction** — "we should stop training radiologists now... it's just
  completely obvious that within five years deep learning is going to do better than radiologists" — is
  the field's honest cautionary tale: a decade later, radiologist demand has *risen*, and AI is shaping
  up as a **tool that augments** the radiologist (triage, workload, second-read), not one that replaces
  the clinical judgement around the image. The detection task was the easy part; the *decision* the image
  feeds is the hard part.[^conflict-ai]

---

## 40.8 — What imaging is good for vs. the consumer-scan marketing

The single most useful sentence in this chapter: **a scan is not a checkup.**

A **checkup** is a structured assessment of risk and a search for the *specific*, *common*, *treatable*
things that actually kill people — blood pressure, lipids/apoB (the protein riding the particles that
carry cholesterol into artery walls), glucose, the RCT-backed cancer screens at
the right ages (`07-clinical-prevention.md`). A **whole-body scan** is an indiscriminate sweep of an
asymptomatic body that, by the base-rate math of §40.4, predictably returns incidentalomas rather than
saved lives. They feel similar to a frightened consumer; they are opposites in expected value.

**The Choosing Wisely lens.** The Choosing Wisely campaign (ABIM Foundation, with the American College of
Radiology and dozens of specialty societies) exists precisely to name the **low-value imaging** that
medicine does too much of. The canonical examples are worth memorising because they cover the most common
real-world imaging mistakes:

- **No imaging for acute low-back pain** without red flags (neurologic deficit, trauma, cancer history,
  infection signs) in the first ~6 weeks — early MRI finds disc bulges that are present in *most*
  pain-free adults, leads to more surgery, and does **not** improve outcomes.
- **No CT for uncomplicated headache** or for minor head injury that meets a validated low-risk rule.
- **No imaging for uncomplicated, low-risk conditions** where the result won't change management
  (e.g., routine pre-op chest X-rays, sinus CT for acute rhinosinusitis).
- **No "annual whole-body CT/MRI" for the asymptomatic.**

> **The honest framing to give a worried person.** The instinct behind paying for a whole-body scan —
> "I want to *do something*, I want certainty" — is human and decent. But the scan does not deliver
> certainty; it delivers a *distribution of findings*, most of them benign, each of which now demands a
> decision. The high-value version of that same instinct is unglamorous and proven: know your blood
> pressure and apoB, do the four screens that have mortality RCTs at the right ages, don't smoke, and
> bring **symptoms** (not a healthy body) to imaging. Image the **question**, not the **anxiety.**

---

## 40.9 — What to actually do (the honest residue)

@@FIG:Z10-imaging-flow@@

- **Image a question, not a body.** The value of any scan is conditional on a specific pre-test question
  whose answer changes a decision. No question → no scan.
- **Match the modality to the physics of the question.** Bone/lung/trauma/stone → X-ray/CT (fast, but
  ionising). Soft tissue/brain/joints → MRI (no radiation, slow, expensive). Fluid/fetus/bedside/repeat →
  ultrasound (no radiation, operator-dependent). Function/metabolism/cancer staging → PET/nuclear
  (highest dose). Bone density → DEXA (trivial dose).
- **Respect cumulative radiation without fearing the single scan.** A justified CT is worth it; ask only
  whether *this* one is justified and at the lowest reasonable dose, and lean to ultrasound/MRI in
  children and pregnancy. The risk is a population/lifetime-dose problem, not a one-scan injury.
- **Expect incidentalomas and pre-decide.** If you (or a high-risk surveillance protocol) do get a broad
  scan, understand in advance that a benign-looking "spot" is the *likeliest* result, and that the
  evidence-based move for most low-risk incidentalomas is **defined surveillance or nothing**, not a
  reflex biopsy. The cascade is the harm.
- **Treat consumer whole-body MRI / MCED as marketing, not medicine** for the average-risk person
  (`07 §6`, `25 §6`) — reasonable only in specific high-risk genetic syndromes.
- **Know that IR exists.** If facing a procedure, ask whether an **image-guided, minimally invasive**
  option (IR) can replace the open operation — it often can, with far less trauma.
- **Use AI imaging as a second reader, not an oracle.** Strong at narrow detection; unproven on the
  downstream outcome; prone to external-validation drift. Augmentation, not replacement.

---

## 40.10 — Claims indexed in this section

Graded set in `02-domains/imaging-claims.json`. Headline gradient: the **physics/modality** claims are
`mechanistic`-but-settled (what each machine images and its radiation profile); the **high-dose
radiation = carcinogen** claim is `outcome`-tier and uncontested, while **low-dose LNT at CT scale** is
`theoretical`/`conflict-open`; the **childhood-CT cohorts** (Pearce, Mathews, EPI-CT) and the
**Smith-Bindman population projection** are `cohort`/modelled and direction-`supports` with the
indication-bias confound flagged; the **incidentaloma** prevalence data (O'Sullivan/Ioannidis,
whole-body-MRI volunteers) are `meta`/`cohort`; **mechanical thrombectomy** (HERMES) earns `meta`/`rct`
(hard disability endpoint); **MASAI AI mammography** is `rct` but with its overdiagnosis caveat and
pending primary endpoint; **whole-body consumer MRI screening** and **AI-replaces-radiologists** are
`refutes`/`conflict-open`. Conflicts logged: `conflict-lnt-low-dose-imaging`,
`conflict-whole-body-mri-screening`, `conflict-ai-imaging-replacement`.

---

## Go deeper

| Source | Best for | Note |
|---|---|---|
| **Smith-Bindman, R. et al. — "Projected Lifetime Cancer Risks From Current CT Imaging," *JAMA Intern Med* 2025 (`10.1001/jamainternmed.2025.0505`)** | The current best statement of CT's population-scale radiation-cancer burden (§40.3) | ~103,000 projected lifetime cancers from one year of US CT; "~5% of cancers" if practice persists. A *model*, not a body count — read the assumptions, but take the magnitude seriously. |
| **Bosch de Basea, M. et al. (EPI-CT) — "Risk of hematological malignancies from CT radiation exposure in children…," *Nat Med* 2023 (`10.1038/s41591-023-02620-0`)** + **Pearce, *Lancet* 2012 (`10.1016/S0140-6736(12)60815-0`)** + **Mathews, *BMJ* 2013 (`10.1136/bmj.f2360`)** | The pediatric-CT cohort evidence behind ALARA in children (§40.3.2) | The three load-bearing cohorts. Read *with* the indication-bias caveat — sicker children get scanned — which the authors address but cannot fully erase. |
| **O'Sullivan, J.W., Ioannidis, J.P.A. et al. — "Prevalence and outcomes of incidental imaging findings: umbrella review," *BMJ* 2018 (`10.1136/bmj.k2387`)** | The quantitative backbone of the incidentaloma problem (§40.4) | Incidentaloma prevalence and malignancy rates *by modality and organ* — the data that makes "more imaging = more problems" concrete rather than rhetorical. |
| **Goyal, M. et al. (HERMES collaboration) — "Endovascular thrombectomy after large-vessel ischaemic stroke," *Lancet* 2016 (`10.1016/S0140-6736(16)00163-X`)** | The RCT proof that image-guided intervention is definitive therapy (§40.6) | NNT ~2.6 to reduce disability — interventional radiology at its most consequential. The counterweight to "imaging is just looking." |
| **Lång, K. et al. (MASAI) — AI-supported mammography screening, *Lancet Oncol* 2023 (full analysis 2025)** | The strongest randomised evidence on AI in imaging (§40.7) | +29% detection, −44% workload, no FP rise — *and* the honest caveats: extra in-situ disease (overdiagnosis question) and a *primary* (interval-cancer/mortality) endpoint still pending. |
| **Choosing Wisely (ABIM Foundation + American College of Radiology)** — choosingwisely.org | The practical list of low-value imaging to avoid (§40.8) | The free, specialty-endorsed reference for "should this scan be ordered?" — back pain, headache, pre-op films, whole-body screening. |
| **USPSTF Recommendations** (uspreventiveservicestaskforce.org) | Where imaging *as a screen* is graded against mortality endpoints | Cross-ref `07-clinical-prevention.md`; the authoritative "is this screening image worth it?" reference. |

---

*An image is a measurement, not a verdict; the honesty is in the grade, and in resisting the intuition
that more seeing is always more knowing.*

[^conflict-lnt]: Conflict logged: `conflict-lnt-low-dose-imaging` — whether low-dose (CT-scale) radiation risk is truly linear, has a threshold, or is mildly protective is open. Cross-ref `09-exposures-environment.md`.

[^conflict-wbmri]: Conflict logged: `conflict-whole-body-mri-screening` — no mortality-endpoint RCT supports whole-body MRI screening in average-risk people.

[^conflict-ai]: Conflict logged: `conflict-ai-imaging-replacement` — the claim that AI replaces radiologists is refuted by a decade of deployment; augmentation is the supported reading.
