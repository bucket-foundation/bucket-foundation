# 25 — Oncology & Cancer: A Disease of the Genome

**Cancer is a *process* — the corruption of the cell's own software.** It is the
single most-feared diagnosis in the developed world, and the honest biology of what it *is* — and of how
well we can treat it — is rarely told straight. Mukherjee called it *The Emperor of All
Maladies*; the deeper truth is that it is the **emperor of all malfunctions** — a disease in which the
normal programs of growth, repair, and death are subverted from within, by mutation of the very genes
that govern them.

> **Bottom line:** cancer is a disease of the genome. The treatment claims that earned their tier are
> RCT-backed — immunotherapy, targeted therapy, and the curative chemo regimens; the early-detection blood
> tests (§25.6) and alternative "cures" (§25.7) are the traps. The distinction to hold throughout is **cure
> vs control vs palliation** (§25.5.5); what to actually do is §25.8.

This chapter owns the **machinery**: what cancer is at the level of the genome and the cell cycle, how it
develops, the major cancers, the treatment revolution, the early-detection frontier, and the honest
debunks. Screening and prevention live in `07-clinical-prevention.md`.

_Not medical advice. Screening and prevention (colorectal, lung-LDCT, breast, cervical, the prevention
levers) are owned by `07-clinical-prevention.md`._

---

## 25.0 — The three rules, applied up front

| Rule | How it bites here |
|---|---|
| **predictor ≠ lever** *(spotting a risk isn't the same as having a fix for it)* | A tumour marker (PSA, CA-125, CEA — blood proteins that can rise with cancer), a mutation, a liquid-biopsy signal *predicts* — it is not automatically a thing you "treat." The MCED frontier (§25.6) is full of predictors mis-sold as interventions. Finding a cancer is not the same as **changing a death**. |
| **cohort ≠ RCT** *(watching what happens to a group can't prove cause the way a randomized trial can)* | Most of what you read about diet/lifestyle "causing" or "curing" cancer is observational and confounded. The treatment claims that earned their place (immunotherapy, targeted therapy, the curative chemo regimens) are backed by **RCTs** (randomized controlled trials, the strongest evidence tier) with **hard endpoints** (overall survival), and graded as such here. |
| **something-beats-nothing — but more is not always better** | Early detection saves lives in the *right* setting (§07); past that, it adds **overdiagnosis** (detecting cancers that would never have killed you, then treating them). The treatment chapter is equally honest: immunotherapy is a real revolution **for the minority it helps**, and "miracle" framing hides the majority for whom it does nothing. |

---

## 25.1 — What cancer is, fundamentally

### 25.1.1 — A disease of somatic mutation and broken cell-cycle control

Strip away the organ names and cancer is one thing: **a cell, and its descendants, that have lost the
rules governing when to divide and when to die.** A healthy multicellular body is a negotiated truce —
each of ~37 trillion cells divides only when signalled, repairs its DNA, and commits **apoptosis**
(programmed suicide) when it is too damaged to be trusted. Cancer is the **collapse of that truce**: a
lineage of cells that proliferates when it shouldn't, ignores the stop signals, refuses to die, and —
in the lethal endgame — leaves its tissue of origin to colonise others (**metastasis**, the cause of
~90% of cancer deaths).

The cause of that collapse is **damage to the genome** — mutations (and epigenetic changes) in the
specific genes that run the cell cycle, the DNA-repair machinery, and the death programs: the load-bearing
first principle, tying to `01-foundations.md` as a corruption of the information layer
(`bucket-canon/04-information`) instantiated in DNA chemistry (`05-biophysics`). It is **your own cells
running a corrupted copy of their own code** — not a foreign invader, not an energy imbalance, not a
fungus. Every honest claim in oncology, and every dishonest one debunked in §25.7, is judged against that
fact.

The cell cycle itself — G1 → S (DNA synthesis) → G2 → M (mitosis), policed by **checkpoints** that halt
the cycle if DNA is damaged or incompletely copied — is the machine cancer breaks. The checkpoints are
run by cyclins, cyclin-dependent kinases (CDKs), and the tumour-suppressor brakes (RB, p53) that §25.2
covers. **Cancer is, mechanistically, checkpoint failure plus apoptosis failure plus repair failure,
compounding over time.**

### 25.1.2 — The Hallmarks of Cancer (Hanahan & Weinberg)

The single most important organising idea in modern oncology is the **Hallmarks of Cancer** framework,
introduced by **Douglas Hanahan and Robert Weinberg** in *Cell* (2000), expanded in "The Next
Generation" (*Cell* 2011), and further extended by Hanahan in "New Dimensions" (*Cancer Discovery* 2022).
Its power is conceptual unification: the ~hundreds of cancers, with thousands of different mutations,
nonetheless converge on a **small set of acquired capabilities** that any cell must obtain to become
malignant. It is the closest thing oncology has to a periodic table — and, like the *Hallmarks of
Aging* (which was explicitly modelled on it, see `B-aging-mechanisms.md`), it is a **`[mechanism:
established]`** scaffold, not an outcome claim.

@@FIG:10-hallmarks-cancer@@

**Skim guide: read the middle two columns** — the *capability* and *what it means* are the point. The
right-hand column names the genes and molecules that most often cause each capability; skip them unless you
want the specifics.

| # | Hallmark capability | What it means | Canonical example / driver |
|---|---|---|---|
| 1 | **Sustaining proliferative signalling** | The cell tells itself to divide — autonomously generating or hijacking growth signals | activating *RAS*, *HER2/ERBB2* amplification, *EGFR* mutation |
| 2 | **Evading growth suppressors** | Disabling the brakes that say "stop dividing" | loss of *RB*, loss of *TP53* (p53), loss of *PTEN* |
| 3 | **Resisting cell death** | Defeating apoptosis — the suicide program that culls damaged cells | *BCL2* overexpression, *TP53* loss, *PI3K/AKT* survival signalling |
| 4 | **Enabling replicative immortality** | Escaping the Hayflick limit by maintaining telomeres indefinitely | **telomerase (TERT) reactivation in ~85–90% of cancers** (→ `16-telomeres §16.3`) |
| 5 | **Inducing angiogenesis** | Growing a new blood supply to feed the tumour past ~1–2 mm | *VEGF* secretion (the target of bevacizumab) |
| 6 | **Activating invasion & metastasis** | Leaving the primary site, entering blood/lymph, colonising distant organs | EMT (epithelial–mesenchymal transition), E-cadherin loss |
| — | *2011 — two **emerging** hallmarks:* | | |
| 7 | **Deregulating cellular energetics** | Reprogrammed metabolism (the "Warburg effect" — aerobic glycolysis) to fuel biosynthesis | *MYC*, *HIF1α* (the *real*, nuanced version of "sugar feeds cancer" — see §25.7) |
| 8 | **Avoiding immune destruction** | Hiding from / disabling the immune system that should kill nascent tumours | **PD-L1 expression, immune checkpoint exploitation** — the target of the immunotherapy revolution (§25.5) |
| — | *2011 — two **enabling characteristics**:* | | |
| E1 | **Genome instability & mutation** | An elevated mutation rate that *generates* all the other hallmarks faster | DNA-repair loss (*BRCA1/2*; MSI — microsatellite instability, the signature of broken mismatch repair; *TP53*) |
| E2 | **Tumour-promoting inflammation** | Chronic inflammation supplying growth factors, survival signals, mutagens | H. pylori → gastric, hepatitis → liver, IBD → colorectal |
| — | *2022 — "New Dimensions" additions (proposed, less settled):* | | |
| 9 | **Unlocking phenotypic plasticity** | Cells dedifferentiate / trans-differentiate to escape terminal fates | lineage plasticity in treatment resistance |
| 10 | **Non-mutational epigenetic reprogramming** | Heritable changes in gene expression *without* DNA-sequence change | aberrant DNA methylation, chromatin remodelling |
| 11 | **Polymorphic microbiomes** | Resident microbes that modulate cancer risk and therapy response | gut microbiome → immunotherapy efficacy; *F. nucleatum* in CRC |
| 12 | **Senescent cells** | Senescent cells in the tumour microenvironment that paradoxically *promote* cancer via the SASP | cross-ref `16-telomeres §16.5`, `B-aging §2` |

**How to read the table honestly.** The **2000 six** are bedrock — universally accepted, taught
everywhere, mechanistically secure. The **2011 four** (two hallmarks + two enabling characteristics) are
also well-established. The **2022 "New Dimensions"** are Hanahan's own framing as *candidate* additions —
important biology, but more provisional and still debated as to whether they are distinct
"hallmarks" or downstream of the original set. Grade them accordingly: the framework's *value* is that
it makes therapy rational — **a drug usually works by knocking out one hallmark** (anti-angiogenics hit
#5, checkpoint inhibitors hit #8, etc.).

### 25.1.3 — Why this ties to the aging fundamentals

**Cancer and aging are two readouts of the same accumulating genomic and cellular damage** — which is
why cancer incidence rises roughly with the **fourth-to-sixth power of age** (Armitage–Doll multistage
model — see §25.2.2). The links are mechanistic, not coincidental. The enabling characteristic **genome
instability** (E1) is the same **genomic-instability hallmark of aging** (`B-aging-mechanisms.md`): a
lifetime of replication errors, oxidative damage, and declining repair fidelity accumulates mutations.
**Replicative immortality** (#4) is the inverse face of the **telomere-attrition** hallmark of aging — a
normal cell's telomere clock *is* a tumour suppressor that forces senescence before a lineage can accrue
enough mutations to turn malignant, so a cancer must reactivate telomerase to escape it
(`16-telomeres §16.3`; the Haycock 2017 result — using inherited gene variants as a natural experiment,
a method called Mendelian randomization — that genetically *longer* telomeres raise cancer risk is the
causal proof). And **senescent cells** (2022 hallmark #12) are the bridge: senescence protects against
cancer in youth but, via the SASP (senescence-associated secretory phenotype — the inflammatory
signals aging cells emit), **promotes** it in age.

---

## 25.2 — How cancer develops

### 25.2.1 — Oncogenes and tumour suppressors: the gas pedals and the brakes

Two gene classes drive the process, and the metaphor is exact:

- **Oncogenes** are mutant, hyperactive versions of normal **proto-oncogenes** (genes that *normally*
  drive growth). A single activating mutation is enough — they are **dominant** (one bad copy floors the
  accelerator). The archetype is **RAS** (KRAS/NRAS/HRAS), mutated in ~25–30% of all human cancers
  (~90% of pancreatic, ~40% of colorectal, ~30% of lung). Others: **MYC**, **HER2/ERBB2** (breast),
  **EGFR** (lung), **BCR-ABL** (the fusion kinase of chronic myeloid leukemia — the first targeted-drug
  triumph, §25.5.1), **BRAF V600E** (melanoma).
- **Tumour suppressors** are the **brakes** — genes that restrain growth, repair DNA, or trigger
  apoptosis. They are **recessive at the cell level**: you generally must lose **both** copies before the
  brake fails (**Knudson's "two-hit" hypothesis**, 1971, derived from retinoblastoma — *RB* was the first
  identified). The three giants:
  - **TP53 (p53)** — the **"guardian of the genome"** (Lane, 1992). On DNA damage, p53 halts the cell
    cycle, triggers repair, and — if damage is too severe — orders apoptosis. It is **the single
    most-mutated gene in human cancer (~50% of all tumours)**. Lose p53 and damaged cells stop being
    culled.
  - **RB (retinoblastoma)** — the master brake on the G1→S transition. Knudson's original two-hit gene.
  - **PTEN, APC, BRCA1/2, VHL, NF1** — other major suppressors; *APC* loss is the **initiating event** of
    most colorectal cancers; *BRCA1/2* loss cripples DNA double-strand-break repair (§25.2.4).

**The asymmetry matters for therapy:** you can **drug an oncogene** (block the floored accelerator — see
targeted therapy, §25.5) far more easily than you can **restore a lost brake**. Re-installing functional
p53 in a tumour remains one of oncology's great unsolved problems.

@@FIG:D23-oncogene-frequency@@

### 25.2.2 — The multi-hit model and clonal evolution

No single mutation makes a cancer. The **multi-hit (multistage) model** — first inferred from the
age-incidence curve by **Armitage and Doll (1954)** and made molecular by **Fearon and Vogelstein's
genetic model of colorectal tumorigenesis** (*Cell*, 1990) — holds that a cell must accumulate a
**sequence of driver mutations** (typically a handful — Vogelstein's later "Cancer Genome Landscapes,"
*Science* 2013, estimated **2–8 driver mutations** among many passengers) before it becomes fully
malignant. The colorectal paradigm is the textbook sequence: **normal epithelium → (APC loss) → adenoma
→ (KRAS activation) → (loss of 18q/SMAD4) → (TP53 loss) → carcinoma.** Each hit confers a selective
growth advantage; the tissue evolves toward malignancy one Darwinian step at a time.

@@FIG:DS3-crc-sequence@@

That Darwinian framing is **clonal evolution** (Peter Nowell, 1976): a tumour is not a uniform clone but
a **branching, heterogeneous population** of subclones under selection. This is why cancers **recur and
resist** — therapy kills the dominant clone but a resistant subclone, already present or newly mutated,
regrows. Tumour heterogeneity is the central reason "cure" is so hard for advanced disease (§25.5.7).

### 25.2.3 — Why cancer is largely a disease of aging

Because each hit is rare and several are needed, the probability of assembling a full set rises steeply
with the number of cell divisions and the years of exposure — hence the **steep age-incidence curve**
(roughly a power law in age). **Tomasetti and Vogelstein (*Science*, 2015)** added a provocative,
widely-misreported dimension: across tissues, the **lifetime cancer risk correlates strongly with the
number of stem-cell divisions** that tissue undergoes — i.e., much inter-tissue variation in cancer risk
is attributable to the **random ("bad luck") replication errors** that accumulate with cell division,
on top of heredity and environment.

@@FIG:84-cancer-incidence@@

> **Honest framing of the "bad luck" paper.** It was widely misread as "two-thirds of cancers are pure
> chance, so prevention is futile" — **wrong**: it explains variation *between tissues*, not the
> *preventable* fraction, much of which (smoking, obesity, infection, UV, alcohol — `07-clinical-prevention.md §4`)
> remains preventable. Stochastic replication error is one of **three** contributors (heredity,
> environment, chance) — real, explaining why even perfect living can't abolish cancer, **not** a licence
> to stop preventing.[^bad-luck]

[^bad-luck]: claim: conflict-bad-luck-cancer-interpretation

### 25.2.4 — Carcinogens and heritable cancer

- **Carcinogens** are agents that raise mutation rate or drive proliferation: **tobacco smoke** (the
  dominant single cause — ~1/3 of cancer deaths), **UV radiation** (skin), **ionising radiation**,
  **certain chemicals** (asbestos, benzene, aflatoxin), and **oncogenic infections** (HPV → cervical,
  HBV/HCV → liver, H. pylori → gastric, EBV). Exposures and their grading (including the IARC Group-1/2A
  framework and the "strong evidence ≠ large effect" caveat) live in `07-clinical-prevention.md §4` and
  `09-exposures-environment.md` — **cross-ref, not duplicated.**
- **Heritable cancer (~5–10% of cancers).** A germline mutation in a tumour suppressor means you are
  **born with one hit already present** in every cell, so far fewer additional hits are needed — earlier,
  more frequent cancers. The canonical examples: **BRCA1/2** (hereditary breast & ovarian cancer; BRCA1
  carriers ~55–72% lifetime breast-cancer risk, ~39–44% ovarian; BRCA2 ~45–69% breast, ~11–17% ovarian —
  Kuchenbaecker 2017), **Lynch syndrome** (mismatch-repair genes → colorectal/endometrial), **Li-Fraumeni**
  (germline *TP53* — multi-cancer), **FAP** (*APC* → colorectal), **retinoblastoma** (*RB1*). BRCA biology
  also matters for **therapy**: BRCA-deficient tumours can't repair double-strand breaks, making them
  exquisitely sensitive to **PARP inhibitors** (synthetic lethality — §25.5.3). Genetics depth: `18-genetics-anatomy.md`.

@@FIG:D22-brca-risk@@

---

## 25.3 — The major cancers (brief each, with prognosis honesty)

Incidence/mortality figures below are US-centric (ACS *Cancer Statistics 2024*, Siegel et al.; SEER
5-year relative survival, all stages combined unless noted). Survival is **stage-dominated** — the same
cancer caught early vs late can differ 5–10× in 5-year survival — which is the entire rationale for the
screening section (`§07`).

@@FIG:D03-cancer-survival@@

| Cancer | US burden (approx.) | Key risk factors | 5-yr survival (all-stage) | Honest note |
|---|---|---|---|---|
| **Lung** | ~235k cases, **~125k deaths/yr — #1 cancer killer** | **Smoking** (dominant), radon, asbestos, air pollution | **~25%** (but ~65% if localized; ~9% if distant) | Most lethal cancer by death count; LDCT screening + immuno/targeted therapy have begun to bend the curve. Rising in never-smokers (esp. *EGFR*-mutant adenocarcinoma in Asian women). |
| **Breast** | ~310k cases (women), ~42k deaths | Age, family history/**BRCA**, estrogen exposure, density, obesity | **~91%** | Generally good prognosis when caught early; highly subtype-driven (ER/PR/HER2 status dictates therapy). Triple-negative is the aggressive minority. |
| **Prostate** | ~300k cases, ~35k deaths | Age, family history, African ancestry | **~97%** (often indolent) | The overdiagnosis poster child (`§07 PSA`). Many are slow and never lethal → **active surveillance**; the danger is overtreating indolent disease *and* under-detecting the aggressive minority. |
| **Colorectal** | ~153k cases, ~53k deaths | Age, IBD, **Lynch/FAP**, processed meat, obesity, alcohol | **~65%** (~91% localized) | Has a **removable precursor** (the adenomatous polyp) → screening works exceptionally (`§07`). Rising alarmingly in **under-50s** (cause unknown — an open question). |
| **Melanoma (skin)** | ~100k cases, ~8k deaths | **UV/sunburn**, fair skin, nevi, family history | **~94%** | Highly curable if caught thin/early; deadly once thick/metastatic — *but* metastatic melanoma is the **flagship immunotherapy success** (§25.5), turning a near-uniformly-fatal disease into one with durable long-term survival for a real fraction. |
| **Pancreatic** | ~66k cases, ~52k deaths | Smoking, obesity, diabetes, chronic pancreatitis, family/**BRCA** | **~13%** | **The honest worst case.** Usually silent until advanced; *KRAS*-driven (long "undruggable"); minimal screening; survival has improved only modestly. The cancer where humility is mandatory. |

**Prognosis honesty as a principle.** These averages describe **populations, not your tumour** (which
depends on stage, grade, molecular subtype, age, and biology) — offered to **calibrate expectation**, not
predict an individual. And they are improving: most have risen over recent decades, driven by screening,
smoking decline, and (for melanoma, lung, some others) the therapies in §25.5.

---

## 25.4 — Treatment modalities: the classical three

For most of the 20th century, oncology had **three weapons** — "cut, burn, poison." They remain the
backbone for the majority of patients and are responsible for the **majority of cures**, a fact the
immunotherapy excitement (§25.5) can obscure.

@@FIG:76-cancer-treatment@@

### 25.4.1 — Surgery (`outcome`-tier, the oldest cure)

Surgical removal of a **localized** tumour is the **single most curative modality in oncology** and the
mainstay for solid cancers caught early (breast, colorectal, lung, prostate, melanoma, many others). The
principle is simple: if the cancer hasn't left, taking it out cures it. The limit is equally simple:
**surgery cannot cure disease that has already spread** (micro-metastases invisible at operation), which
is why surgery is so often paired with systemic therapy (chemo/immuno) to mop up what the scalpel can't
see (**adjuvant** therapy after surgery; **neoadjuvant** before, to shrink the tumour first).

### 25.4.2 — Radiation therapy (`outcome`-tier)

Ionising radiation kills cells by shattering their DNA beyond repair; rapidly dividing cancer cells are
preferentially vulnerable. It is a **local** modality (like surgery) used to cure localized cancers
(e.g., prostate, head & neck, cervix, early breast as part of breast-conserving therapy), to shrink
tumours pre-surgery, and to **palliate** (relieve pain from bone metastases, control bleeding). Modern
delivery (IMRT, stereotactic radiosurgery/SBRT, proton therapy) spares healthy tissue far better than
historical radiation. Limits: damages nearby normal tissue, and (rarely, decades later) can *cause*
second cancers — a real but small long-term cost weighed against a present cure.

### 25.4.3 — Chemotherapy (`outcome`-tier, blunt but curative for some)

Cytotoxic chemotherapy attacks **rapidly dividing cells** (via DNA crosslinking, antimetabolites,
microtubule poisons, topoisomerase inhibitors). Its great virtue is that it is **systemic** — it reaches
cancer everywhere, including micro-metastases — which is why it is the workhorse for blood cancers and
for adjuvant treatment of solid tumours. Its great vice is **non-selectivity**: it also hammers the
body's other fast-dividing tissues (bone marrow → immunosuppression/anemia; gut lining → nausea; hair
follicles → alopecia), the source of the classic toxicity.

> **The honest, under-told fact:** chemotherapy **cures** several cancers outright — **testicular cancer,
> many childhood leukemias (ALL), Hodgkin lymphoma, some other lymphomas, choriocarcinoma.** Childhood
> ALL went from ~uniformly fatal in the 1960s to **~90% cured** today, largely on combination
> chemotherapy. This is one of medicine's real triumphs and the counterweight to the alternative-
> oncology trope that "chemo doesn't work" (§25.7). For **advanced solid tumours**, chemo more often
> *extends life and controls disease* than cures — and that distinction (cure vs control vs palliation)
> must be stated plainly, never blurred.

---

## 25.5 — The targeted-therapy & immunotherapy revolution

The story since ~2000 is the move from indiscriminate "poison" toward therapies aimed at a cancer's
**specific molecular vulnerability** or its **relationship with the immune system**. This is
transformative — and the honest version names **who it helps and who it doesn't**.

### 25.5.1 — Targeted therapy: drugging the oncogene

If a cancer is *driven* by one hyperactive oncogene, a drug that blocks that exact molecule can produce
dramatic, low-toxicity responses. The founding triumph is **imatinib (Gleevec)** for **chronic myeloid
leukemia** — it inhibits the **BCR-ABL** fusion kinase that *defines* CML and converted a fatal leukemia
into a **chronically-managed condition with near-normal life expectancy** for most patients (`rct`-tier —
the strongest evidence grade — landmark). Others that changed practice:

- **EGFR inhibitors** (gefitinib, osimertinib) for *EGFR*-mutant **lung adenocarcinoma**;
- **ALK inhibitors** for *ALK*-rearranged lung cancer;
- **HER2-targeted** therapy (trastuzumab) for HER2-amplified **breast** cancer — a subtype-specific cure-rate improvement;
- **BRAF + MEK inhibitors** for *BRAF V600E* **melanoma**;
- **PARP inhibitors** for **BRCA-mutant** breast/ovarian/prostate/pancreatic cancer (**synthetic lethality**: block the backup repair pathway in a cell already missing its main one → selective tumour death).

> **The honest limits of targeted therapy:** (1) it **only works if the target is present** — you must
> profile the tumour's genome first, and most patients won't carry the matching driver; (2) **resistance
> is near-universal in advanced disease** — the tumour evolves a workaround (a new mutation, a bypass
> pathway) and progresses, usually within months to a few years (clonal evolution, §25.2.2); (3)
> responses are often *deep but not durable*. Targeted therapy turned several cancers from "fatal in
> months" to "controlled for years" — a profound gain — but "controlled" is usually not "cured."

### 25.5.2 — Immunotherapy: checkpoint inhibitors (the real breakthrough)

The deepest conceptual shift is **immunotherapy** — not attacking the cancer directly, but **releasing
the patient's own immune system to do it.** The mechanism rests on hallmark #8 (avoiding immune
destruction): tumours survive partly by exploiting the immune system's own "off switches"
(**checkpoints**) — molecules like **CTLA-4** and **PD-1/PD-L1** that normally prevent the immune system
from attacking healthy tissue. Cancers express checkpoint ligands to **switch off** the T-cells that
would otherwise kill them.

**Checkpoint inhibitors** are antibodies that block those off-switches, **taking the brakes off the
T-cells**. The two foundational discoveries — **James Allison** (CTLA-4 blockade) and **Tasuku Honjo**
(PD-1) — won the **2018 Nobel Prize in Physiology or Medicine**. The clinical landmarks:

- **Ipilimumab** (anti-CTLA-4) in metastatic melanoma (**Hodi et al., *NEJM* 2010**) — the first therapy
  ever to improve **overall survival** in metastatic melanoma (`rct`).
- **Anti-PD-1/PD-L1** (pembrolizumab, nivolumab) — broader, better-tolerated, now used across melanoma,
  lung, kidney, bladder, head & neck, Hodgkin lymphoma, MSI-high tumours of any site, and more.
- **CheckMate 067** (**Larkin et al., 5-year follow-up *NEJM* 2019**): combination nivolumab + ipilimumab
  in advanced melanoma produced **~52% overall survival at 5 years** — in a disease that was, a decade
  earlier, almost uniformly fatal within months. Some of those patients appear **functionally cured** —
  durable, off-treatment remissions, the holy grail (`rct`, hard endpoint).

@@FIG:D24-checkmate-melanoma@@

> **The honesty that immunotherapy demands — who it helps.** This is a true revolution **and** most
> patients are not (yet) among the winners. The brutal facts: (1) across cancers, **only a *minority* of
> patients respond durably** — often ~15–40% depending on cancer type and biomarkers; for many common
> cancers (prostate, most colorectal, pancreatic) checkpoint inhibitors **barely work at all**; (2)
> response correlates with **tumour mutational burden** and **MSI/mismatch-repair status** (high-mutation
> tumours present more neoantigens for the immune system to see) — which is *why* melanoma and lung
> (mutation-heavy, often carcinogen-driven) respond and "cold," low-mutation tumours don't; (3)
> immunotherapy has its **own serious toxicity** — by removing immune brakes it can cause autoimmune
> attack on healthy organs (colitis, hepatitis, pneumonitis, endocrine failure), occasionally fatal.
> **The marketing says "cancer cured by the immune system"; the data say "a real, sometimes durable cure
> for a substantial minority, nothing for the majority, and a new class of harms."** Both halves are true,
> and stating only the first is the most common dishonesty in cancer-therapy hype.[^immuno-cure]

[^immuno-cure]: claim: conflict-immunotherapy-cure-framing

### 25.5.3 — CAR-T cell therapy (`rct`/`outcome`-tier, narrow but stunning)

**CAR-T** (chimeric antigen receptor T-cell) therapy goes further: a patient's own T-cells are
**genetically engineered** to recognise a cancer antigen (e.g., CD19 on B-cells), expanded, and infused
back. In **relapsed/refractory B-cell leukemias and lymphomas** — patients out of all other options —
CAR-T produces **remission rates that look like science fiction** (e.g., tisagenlecleucel in pediatric
relapsed ALL, ELIANA trial, ~80% remission). It is a *living drug*.

> **CAR-T's honest boundaries:** it works (so far) almost exclusively in **blood cancers**, not solid
> tumours (which lack clean single antigens and hide behind a hostile microenvironment); it is
> **extraordinarily expensive** (~$400k+ per treatment) and available only at specialist centres; and it
> carries **life-threatening acute toxicity** — **cytokine release syndrome** and **neurotoxicity (ICANS)**
> that require ICU-level management. A breakthrough with a **very narrow current footprint.**

### 25.5.4 — Tissue-agnostic / precision oncology

A conceptual milestone: the first **tissue-agnostic** approvals — drugs licensed by **molecular feature,
not organ of origin.** Pembrolizumab for **any MSI-high / mismatch-repair-deficient** solid tumour
(Le et al., 2015/2017), and **NTRK-fusion** inhibitors (larotrectinib) for any *NTRK*-fusion tumour. This
is the logical endpoint of "cancer is a disease of the genome" — **treat the mutation, not the address.**

### 25.5.5 — The honest take on "cure"

| Setting | Honest status |
|---|---|
| **Localized solid cancer** | Often **curable** by surgery ± radiation ± adjuvant therapy. The clearest wins; the rationale for screening. |
| **Specific blood cancers / germ-cell** | Childhood ALL, Hodgkin, testicular, some lymphomas — **curable with chemo** (one of medicine's triumphs). |
| **Driver-addicted advanced cancer** | Targeted therapy → often **deep response, usually not durable** (resistance evolves). "Controlled for years," not "cured." |
| **Immunotherapy-responsive advanced cancer** | A **substantial minority achieve durable, possibly curative remission** (melanoma, some lung); the majority do not respond. |
| **Most advanced solid tumours** | Treatment **extends life and controls disease**; honest framing is *control and time*, not *cure*. |
| **Pancreatic, glioblastoma, advanced lung historically** | Where humility is mandatory — gains are real but modest; overselling here is cruel. |

> **The throughline:** "cure" is earned in specific, namable settings and **withheld** in others — denied
> by the alternative-medicine world (§25.7), overclaimed by industry and media where there is only real
> *time*. Hold both lines.

---

## 25.6 — The early-detection frontier: liquid biopsy & MCED

**The bottom line first: the multi-cancer blood tests being marketed today (Galleri) are promising and
unproven — do not pay out-of-pocket for one expecting it to save your life until the mortality trials
read out.** Here is why.

The newest hope is **catching cancer earlier, from blood.** A growing tumour sheds **circulating tumour
DNA (ctDNA)** and other markers into the bloodstream; a **liquid biopsy** detects them. Two distinct
uses, with very different evidence levels:

1. **Liquid biopsy in *known* cancer** (`outcome`-tier, established use): profiling ctDNA to identify
   actionable mutations when tissue is hard to biopsy, and **monitoring** for minimal residual disease /
   recurrence. This is real and increasingly standard.
2. **Multi-cancer early detection (MCED) in *healthy* people** (`mechanistic`→`cohort`, **promising but
   unproven**): a single blood test claiming to screen for **many cancers at once** in asymptomatic
   people. The flagship is **Galleri (GRAIL)**, which reads **methylation patterns** in cell-free DNA to
   flag a cancer signal *and* predict the tissue of origin.

> **The honest status of MCED / Galleri.** The promise is enormous — a single blood test that catches
> many cancers (including ones with **no screening test at all**: pancreatic, ovarian) before symptoms.
> But the evidence does **not yet** support routine use, and this is the predictor-vs-lever trap at scale:
> - It is currently **good at specificity** (low false-positive rate) but has **modest sensitivity for
>   *early-stage* cancer** — and early-stage is precisely where catching it would change outcomes. It is
>   far better at detecting later-stage cancers (which it would help less).
> - The **PATHFINDER** study (Schrag et al., *Lancet* 2023) showed it *can* find cancers in a screening
>   population, but with **false positives that triggered invasive work-ups**, and — critically —
>   **no demonstration yet that it reduces cancer mortality.** That is the only endpoint that matters for
>   a screening test (the same brutal standard `07-clinical-prevention.md §3` applies to every screen).
> - The definitive trials are **ongoing** (e.g., the NHS-Galleri RCT, ~140k people, mortality endpoint).
>   Until one shows a mortality benefit, MCED is **investigational, not a recommended screen** — exactly
>   the verdict `07-clinical-prevention.md §6` gives it. Promising. Plausible. **Unproven.** Do not pay
>   out-of-pocket for it expecting it to save your life until the trials read out.[^mced]

[^mced]: claim: conflict-mced-galleri-unproven. cross-ref: `07-clinical-prevention.md §6`.

---

## 25.7 — Honest debunks (with compassion, with clarity)

Cancer's fear makes it the **most exploited diagnosis in pseudo-medicine.** People reaching for these are
frightened, often failed by tone-deaf mainstream care, and deserve **clarity, not contempt.** But clarity
matters most precisely *because* the stakes are life and death — choosing an unproven "natural cure" over
an effective therapy is, for curable cancers, fatal.

| Claim | The honest status |
|---|---|
| **"Sugar feeds cancer" / cut all carbs to starve it** | **Oversimplified to the point of false.** The kernel of truth is the **Warburg effect** (hallmark #7): cancer cells preferentially use **aerobic glycolysis**, consuming lots of glucose — which is why PET scans use radiolabelled glucose to *find* tumours. But (1) **all** your cells use glucose; you cannot selectively starve a tumour by avoiding sugar — your body tightly maintains blood glucose, and the tumour will take what it needs. (2) The Warburg effect is about **biosynthesis** (building blocks for division), not simple energetics, and is far subtler than "sugar = fuel." (3) No human trial shows a low-sugar or ketogenic diet **treats** cancer; it is studied as an *adjunct* in specific settings, not a cure. Real version: avoid **obesity and insulin resistance**, which *do* raise risk of ≥13 cancers (`07 §4.2`) — that is a population-prevention lever, not a "starve my tumour" mechanism.^[claim: conflict-sugar-feeds-cancer] |
| **Alkaline diet / "cancer can't live in an alkaline body"** | **Biochemically false.** You cannot meaningfully change blood pH with diet — it is held at ~7.4 by powerful buffers; food changes *urine* pH, not blood. Tumours create their *own* acidic microenvironment regardless of what you eat. No evidence an "alkaline diet" prevents or treats cancer. Harmless as "eat more vegetables"; dangerous as a substitute for treatment. |
| **Laetrile / amygdalin / "vitamin B17" / apricot seeds** | **Disproven and dangerous.** Promoted for decades as a natural cure; the definitive **NCI-sponsored clinical trial (Moertel et al., *NEJM* 1982)** found **no benefit** and documented **cyanide toxicity** (amygdalin metabolises to cyanide). It is not a vitamin. People have died of cyanide poisoning from apricot-seed regimens. Unambiguous: ineffective *and* toxic. |
| **"Most natural cancer cures are suppressed by Big Pharma"** | **The conspiracy frame is false and lethal.** Cancer researchers get cancer; oncologists' families get cancer; an effective, cheap, natural cure would make its discoverer immortal in the literature and a Nobel laureate. The reason vitamin C megadose, coffee enemas (Gerson), Rife machines, black salve, baking soda, etc. aren't used is that **when tested, they don't work** — not suppression. Meanwhile the *real* breakthroughs of the last 20 years (immunotherapy, CAR-T) came from exactly the research enterprise the conspiracy says hides cures. |
| **High-dose IV vitamin C, Gerson therapy, etc. as primary treatment** | **No RCT support as a cancer treatment.** Some are harmless-to-the-wallet, some (coffee enemas, extreme detox) are directly harmful, and **all share one fatal cost: time.** Using them *instead of* effective therapy for a curable cancer converts a curable disease into a fatal one. Several cohort analyses link **use of alternative medicine in lieu of standard treatment to substantially higher mortality.** As a *complement* for wellbeing (acupuncture for nausea, mindfulness for distress) some are reasonable; **as a replacement, they kill.** |
| **"Chemo never works / kills more than it cures"** | **False, and a specific cruelty.** Chemo *cures* testicular cancer, childhood ALL (~90%), Hodgkin lymphoma, and others outright, and extends life in many more (§25.4.3). It is toxic and overused in some end-stage settings (a real critique worth honest debate), but "it never works" is contradicted by millions of survivors. The honest critique is about **appropriate use**, not abolition. |
| **The cherry-picked "stage-4 patient cured by [juice/diet/herb]" testimonial** | **Survivorship bias + spontaneous-remission noise.** Rare spontaneous regressions occur (especially melanoma, kidney cancer, some lymphomas); a few people also get standard treatment *and* a supplement and credit the supplement. A testimonial is `anecdotal`-tier (the bottom of the ladder) — **provenance, not evidence** (`06-evidence/SCHEMA.md`). One vivid story cannot outweigh a randomized trial, however moving it is. |

> **The compassionate close.** The right response to someone drawn to these is **not** ridicule — it is to
> meet the real needs underneath (fear, a desire for control, a wish to "do something," distrust born of
> bad experiences) **and** to be unflinching that *for a curable cancer, the choice of an unproven cure
> over an effective one is the choice that kills.* Hold the person gently and the claim firmly.

---

## 25.8 — What to actually do (the honest residue)

- **Prevent what's preventable** (the highest-leverage move, and not in this section): don't smoke,
  vaccinate (HPV/HBV), avoid obesity/insulin resistance, limit alcohol, protect from UV, eat fibre /
  limit processed meat. All graded in `07-clinical-prevention.md §4`.
- **Do the screens that have RCT mortality evidence** — colorectal, lung-LDCT (if a heavy smoker), breast,
  cervical — at the right ages (`07 §3`). The best screen is the one you actually do.
- **Know your family history.** A pattern of early or clustered cancers warrants **genetic counselling**
  (BRCA, Lynch, etc.) — it changes screening intensity and, increasingly, treatment (`18-genetics-anatomy.md`).
- **If diagnosed: get the tumour molecularly profiled, and get a second opinion at a comprehensive cancer
  centre.** Precision and immunotherapy options depend entirely on knowing the tumour's genome and
  biomarkers (MSI, PD-L1, driver mutations). The right drug exists only if you find the right target.
- **Demand honest framing of intent** — is this treatment aimed at **cure**, at **control/time**, or at
  **palliation/comfort**? The distinction (§25.5.5) should be explicit, not blurred.
- **Treat MCED blood tests (Galleri) as investigational** — interesting, not yet a substitute for proven
  screening; revisit when the mortality RCTs read out (§25.6, `07 §6`).
- **Be skeptical of anything sold on fear** — both the alternative "natural cure" (§25.7) and the
  "executive whole-body scan / pay-for-MCED" end of the spectrum (`07 §6`). Fear is the marketing; outcomes
  are the test.

---

## 25.9 — Claims indexed in this section

Graded set in `02-domains/oncology-claims.json`. Headline gradient: the **mechanism** claims (cancer as
somatic mutation, the hallmarks, oncogene/suppressor biology, the multi-hit model) are
`mechanistic`-but-settled; the **therapy** claims earn the strongest tiers in the file
(checkpoint-inhibitor and targeted-therapy survival = `rct`, hard overall-survival endpoints); the
**MCED/Galleri** claim is `cohort`-tier and explicitly **unproven for mortality**; and every
**alternative-cure** claim is `refutes`-direction, ranging from `rct`-disproven (laetrile, Moertel 1982)
to `anecdotal` (testimonials) — never an `outcome`. Conflicts logged: `conflict-bad-luck-cancer-interpretation`,
`conflict-immunotherapy-cure-framing`, `conflict-sugar-feeds-cancer`, `conflict-mced-galleri-unproven`.

---

## Go deeper

| Source | Best for | Note |
|---|---|---|
| **Siddhartha Mukherjee — *The Emperor of All Maladies: A Biography of Cancer* (2010)** | The definitive popular history — what cancer is, how we came to understand and fight it, told as biography of the disease | Pulitzer Prize. The single best humane entry point; read it first. Pairs the science with the human and historical stakes this chapter can only gesture at. |
| **Hanahan, D. & Weinberg, R.A. — "The Hallmarks of Cancer," *Cell* 2000 (`10.1016/S0092-8674(00)81683-9`); "Next Generation," *Cell* 2011 (`10.1016/j.cell.2011.02.013`); Hanahan, "New Dimensions," *Cancer Discov* 2022 (`10.1158/2159-8290.CD-21-1059`)** | The canonical organising framework of all modern oncology (§25.1.2) | The 2000 + 2011 papers are bedrock; the 2022 additions are provisional. The most-cited papers in cancer biology — read the original, not summaries. |
| **Fearon, E.R. & Vogelstein, B. — "A genetic model for colorectal tumorigenesis," *Cell* 1990 (`10.1016/0092-8674(90)90186-i`)** + **Vogelstein et al., "Cancer Genome Landscapes," *Science* 2013 (`10.1126/science.1235122`)** | The multi-hit / clonal-evolution model made molecular (§25.2.2) | The colorectal sequence is *the* textbook paradigm; the 2013 review is the genome-era synthesis (2–8 drivers per tumour). |
| **Tomasetti, C. & Vogelstein, B. — "Variation in cancer risk among tissues…," *Science* 2015 (`10.1126/science.1260825`)** | The "bad luck" / stem-cell-division paper (§25.2.3) | Read it *with* §25.2.3's honesty caveat — it explains variation *between tissues*, not the preventable fraction. The most-misreported cancer paper of the decade. |
| **Hodi, F.S. et al. — ipilimumab in metastatic melanoma, *NEJM* 2010 (`10.1056/NEJMoa1003466`)** + **Larkin, J. et al. — 5-yr nivolumab+ipilimumab, *NEJM* 2019 (`10.1056/NEJMoa1910836`)** | The checkpoint-inhibitor revolution, hard survival endpoints (§25.5.2) | The trials behind the Allison/Honjo **2018 Nobel**. The honest data on *who* immunotherapy helps — durable survival for a substantial minority. |
| **Moertel, C.G. et al. — clinical trial of amygdalin (laetrile), *NEJM* 1982 (`10.1056/NEJM198201283060403`)** | The definitive disproof of a "natural cure" (§25.7) | The model of how a popular alternative cancer cure is tested and falsified — no benefit, real cyanide toxicity. |
| **Schrag, D. et al. — PATHFINDER MCED study, *Lancet* 2023** | The honest state of multi-cancer early-detection blood tests (§25.6) | It can find cancers; it has **not** shown a mortality benefit. The mortality RCTs are pending. Read before paying for Galleri. |
| **Robert A. Weinberg — *The Biology of Cancer* (textbook, 2nd ed.)** | The authoritative deep-dive on the molecular machinery, if you want the full mechanism beneath this chapter | The canonical cancer-biology textbook by a co-author of the hallmarks. For those who want to go from this summary to mastery. |

---

*Cancer is a disease of the genome. Honesty about cure versus control is a duty every line of this
chapter tries to keep.*
