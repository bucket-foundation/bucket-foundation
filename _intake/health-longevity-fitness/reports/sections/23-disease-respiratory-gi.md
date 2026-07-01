# 23 — Disease Atlas II: Respiratory, Digestive & Hepatic Disease

Two of the diseases in this chapter went from a life sentence to a *cure* inside one generation — peptic
ulcers turned out to be an infection you can wipe out with antibiotics, and hepatitis C now clears in 8–12
weeks of pills. That is the throughline: find the real cause, and honest management follows. This is a map of
the major diseases of the airways, the gut, and the liver/pancreas — what they are, how they work, how they're
managed, and how strong the evidence for that management actually is.

_Not medical advice — a map to reason with, not to diagnose or treat. Physiology and aging of these organs
live in §17; this chapter adds the named diseases on top._

**One-line verdict up front.** The highest-yield facts in this section are: **(1)** for the lungs, *nothing
matches not smoking* — every drug here is downstream of that; **(2)** obstructive sleep apnea is *massively
underdiagnosed* and worth actively ruling out, even though CPAP's benefit is symptomatic-plus-cardiometabolic,
not the hard-outcome miracle the cohorts implied; **(3)** two GI diseases went from life-sentence to *cure* in
one generation — peptic ulcer (it's an infection: antibiotics) and hepatitis C (8–12 weeks of pills, >95%
cured); **(4)** IBS is **real**, not "in your head," and has genuine (if modest) levers; and **(5)** the
"leaky gut" / IgG food-sensitivity / "gut detox" industry is selling tests and cleanses that the evidence does
not support.

---

## Disease-at-a-glance map (read this first)

Seventeen diseases, grouped Respiratory → Digestive → Hepatic. Use it as a lookup, not a read-through — each
row is unpacked in its own section below. The last column grades how strong the evidence for the management is,
using these tiers: `rct` = randomized controlled trial (the strongest tier) · `meta` = meta-analysis pooling
many trials · `cohort` = observational follow-up (shows association, not proof) · `guideline` = expert-consensus
recommendation · `mechanistic` = reasoned from how the biology works.

| Disease | What it is | Core mechanism (→ fundamental) | Best-evidenced management | Honest grade of the management |
|---|---|---|---|---|
| **Asthma** | Reversible airway obstruction + chronic inflammation | Type-2/eosinophilic airway inflammation → bronchial hyperreactivity | **Inhaled corticosteroid-containing inhaler** (not reliever-only); ICS-formoterol "anti-inflammatory reliever" | `meta`/guideline — strong; controls, does not cure |
| **COPD** | Progressive, largely irreversible airflow limitation | Cigarette/biomass smoke → small-airway destruction + emphysema → lost elastic recoil | **Smoking cessation** (only slope-changer) + pulmonary rehab + inhaled bronchodilators ± ICS | `cohort`/`meta` — cessation strong; drugs relieve, don't reverse |
| **Obstructive sleep apnea** | Repetitive airway collapse in sleep → hypoxia, fragmentation | Anatomy + ↓ pharyngeal tone → intermittent hypoxia → sympathetic/metabolic stress | **CPAP** (+ weight loss, positional, oral appliance, newer drug therapy) | `rct` strong for *symptoms/BP*; **null for hard CV outcomes** in RCTs |
| **Pneumonia / LRTI** | Acute lower-respiratory infection | Pathogen + impaired clearance/immunity | **Vaccination** (pneumococcal, flu, COVID, RSV) + prompt antibiotics when bacterial | `rct`/`meta` — vaccines strong prevention |
| **Pulmonary fibrosis (IPF)** | Progressive scarring of lung interstitium | Aberrant repair → fibroblast/collagen deposition | **Antifibrotics** (pirfenidone, nintedanib) slow decline; transplant for selected | `rct` — slows, does not reverse; poor prognosis |
| **GERD / reflux** | Acid/content reflux causing symptoms or mucosal damage | LES incompetence + hiatal mechanics + obesity → acid exposure | **Weight loss + mechanics first**, then PPI/PCAB at lowest effective dose | guideline/`rct` — effective; long-term PPI concerns mostly overstated but real edge cases |
| **Peptic ulcer disease** | Mucosal break in stomach/duodenum | *H. pylori* infection or NSAIDs break the mucosal defense | **Eradicate H. pylori** (antibiotics + acid suppression); stop NSAIDs | `rct`/`meta` — **curative**; one of medicine's cleanest wins |
| **IBS** | Recurrent abdominal pain + altered bowel habit, no structural lesion | Disorder of gut-brain interaction: visceral hypersensitivity, motility, microbiome, stress | **Low-FODMAP (structured), fiber (soluble), gut-brain therapies, specific drugs by subtype** | `rct` for FODMAP short-term; real but modest; it is a *real* disease |
| **IBD (Crohn's / UC)** | Chronic immune-mediated bowel inflammation | Dysregulated mucosal immunity × genetics × microbiome/environment | **Biologics/small molecules** (anti-TNF, anti-IL-23, anti-integrin, JAK) to induce/maintain remission | `rct`/`meta` — disease-modifying; not a cure, real risks |
| **Celiac disease** | Autoimmune reaction to gluten damaging small intestine | Gliadin + HLA-DQ2/8 → villous atrophy (true autoimmunity) | **Strict lifelong gluten-free diet** (the only treatment) | guideline — definitive; *requires biopsy-era diagnosis before going GF* |
| **Diverticular disease** | Colonic out-pouchings ± inflammation (diverticulitis) | Wall weakness + luminal pressure; fiber/microbiome modulate | Fiber for prevention; most acute diverticulitis now **managed without antibiotics**; surgery selectively | `rct`/guideline — antibiotic de-escalation is a real reversal of old dogma |
| **Colorectal cancer** | Malignancy of colon/rectum | Adenoma→carcinoma sequence over years (a *screenable* window) | **Screening** (colonoscopy/FIT) → resect precursors; treat by stage | `rct` — screening reduces incidence & mortality (cross-ref oncology) |
| **MASLD / MASH** | Metabolic fatty liver → steatohepatitis → fibrosis | Insulin resistance → hepatic fat → lipotoxic inflammation/fibrosis | **≥7–10% weight loss** (reverses histology); resmetirom, GLP-1s now add to it | `cohort`/`rct` — weight loss strong; first drugs now approved |
| **Viral hepatitis B / C** | Chronic viral liver infection → cirrhosis/HCC | HBV (suppressible) / HCV (curable) replication → fibrosis | **HCV: direct-acting antivirals cure >95%**; HBV: lifelong suppression + vaccine prevention | `rct`/`meta` — HCV cure is a landmark; HBV control strong |
| **Cirrhosis** | End-stage liver fibrosis with loss of function | Any chronic injury → bridging fibrosis → portal hypertension | **Remove the cause early**; manage complications; transplant | `cohort`/guideline — compensated is partly reversible if cause removed |
| **Gallstones** | Cholesterol/pigment stones in gallbladder | Bile supersaturation + stasis | **Cholecystectomy only if symptomatic**; leave silent stones alone | guideline — strong; don't operate on asymptomatic stones |
| **Pancreatitis** | Acute or chronic pancreatic inflammation | Gallstones + alcohol (acute); alcohol/genetic/obstructive (chronic) | Supportive + **early nutrition, fluids**; remove cause (gallbladder, alcohol) | `rct`/guideline — cause-removal prevents recurrence |

Everything below is the long version, with the debunks made explicit.

---

## Part A — Respiratory Disease

> Cross-ref `17-organ-systems-atlas.md §1` for lung physiology, the Fletcher–Peto decline curve, VO₂max, and
> the "you cannot grow your lungs" / IMT material. This part covers the *named diseases*.

### A1. Asthma — reversible obstruction, and the honest story about control

**What it is.** Asthma is chronic airway *inflammation* producing variable, reversible airflow obstruction:
wheeze, cough, chest tightness, breathlessness that come and go, often worse at night or with triggers
(allergens, exercise, cold air, viral infections). It is one of the most common chronic diseases on earth and
usually begins in childhood, though it can onset at any age.

**Mechanism (→ immune fundamentals).** The dominant phenotype is **type-2 / eosinophilic inflammation**: an
allergic-type immune cascade (Th2 cells, IL-4/IL-5/IL-13, eosinophils, mast cells, IgE) thickens the airway
wall, drives mucus, and makes bronchial smooth muscle **hyper-reactive** — it constricts to stimuli a normal
airway ignores. This is why the airway obstruction is *reversible* (bronchodilators relax the muscle) but the
underlying problem is *inflammatory* (only anti-inflammatory treatment changes the disease). A minority of
asthma is non-type-2 (neutrophilic, obesity-associated, paucigranulocytic) and responds less well to steroids
— an honest caveat against treating "asthma" as one thing. `mechanistic`/established.

@@FIG:DS7-asthma@@

**Management and the honest control story.** The single most important modern message, and the one most often
gotten wrong:

- **Reliever-only treatment is the wrong default.** For decades, mild asthma was treated with a short-acting
  β₂-agonist (SABA, e.g. albuterol/salbutamol) "as needed." This relieves the symptom but treats *none* of the
  inflammation, and SABA-only use is associated with worse outcomes and asthma deaths. The **GINA** strategy
  (GINA — the global asthma-guidelines body) now recommends that essentially **all** asthma — even mild — be managed with an **inhaled-corticosteroid (ICS)-
  containing inhaler**, because the ICS treats the actual disease. `meta`/guideline.
- **ICS-formoterol as anti-inflammatory reliever ("AIR"/MART).** A combined low-dose inhaled
  corticosteroid + fast-onset long-acting bronchodilator (budesonide-formoterol) used *as the reliever*
  (and, at higher steps, as maintenance-and-reliever therapy, "MART"/"SMART") reduces severe exacerbations
  versus SABA-reliever regimens. This is the central evidence-based shift of the last decade. `rct`/`meta`.
- **Inhaler types, briefly.** *Relievers* (bronchodilators: SABA like albuterol; or ICS-formoterol as
  AIR). *Controllers* (daily ICS ± long-acting β-agonist [LABA] ± long-acting muscarinic antagonist [LAMA]).
  *Add-ons* for severe disease: **biologics** targeting the type-2 pathway (anti-IgE omalizumab; anti-IL-5
  mepolizumab/benralizumab; anti-IL-4Rα dupilumab; anti-TSLP tezepelumab) — transformative for severe
  eosinophilic/allergic asthma, `rct`-grade, but expensive and phenotype-specific.
- **Honest grade.** Asthma treatment **controls; it does not cure.** Well-controlled asthma means few symptoms,
  rare exacerbations, near-normal life — a realistic and common outcome with correct inhaler use. The two biggest
  real-world failures are *under-use of ICS* (relying on the reliever) and *poor inhaler technique* (a large
  fraction of patients use devices wrong). Trigger avoidance, smoking cessation, and treating allergic rhinitis
  help. **Note the predictor-≠-lever discipline** (a number that tells you how you're doing isn't automatically
  the thing that fixes the disease): a good day on a bronchodilator does not mean the inflammation is controlled.

### A2. COPD — smoking, irreversibility, and what helps

**What it is.** Chronic obstructive pulmonary disease is **progressive, largely irreversible airflow
limitation** from chronic bronchitis (inflamed, mucus-producing airways) and/or emphysema (destruction of
alveolar walls, loss of elastic recoil). Defined spirometrically by a post-bronchodilator FEV₁/FVC < 0.70 (or
lower-limit-of-normal) — FEV₁ is how much air you can blast out in the first second of a hard breath, and a low
ratio means the airways are obstructed. It is among the top global causes of death.

**Mechanism (→ lung physiology, exposures).** In the developed world the overwhelming driver is **tobacco
smoke**; globally, **biomass-fuel smoke and air pollution** are major contributors. Chronic exposure drives
small-airway inflammation/fibrosis and proteolytic destruction of alveoli, steepening the lifelong FEV₁ decline
curve (cross-ref `17 §1.2`, the Fletcher–Peto framework, and the Lange *NEJM* 2015 trajectory model: COPD can
arise from accelerated decline *or* from never reaching a normal peak). The α₁-antitrypsin-deficiency subtype
is the genetic exception that proves the proteolysis rule.

**The irreversibility, stated honestly.** Lost lung tissue does not regenerate. **No drug reverses
established COPD or restores lost FEV₁.** The one intervention that changes the *slope* of decline is **smoking
cessation**, at any age — the earlier the steeper the benefit, but quitting helps even late. This is the single
most effective respiratory-longevity act in existence (cross-ref `09-exposures-environment.md`). `cohort`/`rct`
(cessation).

**What helps (graded):**

- **Smoking cessation** — the only slope-changer. Everything else is symptom/exacerbation management. `rct`.
- **Pulmonary rehabilitation** (supervised exercise + education) — improves exercise capacity and quality of
  life; Cochrane-grade. It does not regrow lung but it meaningfully changes how patients function. `meta`
  (McCarthy et al., Cochrane 2015).[^copd-rehab]
- **Inhaled bronchodilators** (LAMA and/or LABA) — first-line pharmacotherapy; reduce symptoms and
  exacerbations. **Inhaled corticosteroids** are added selectively (higher blood eosinophils, frequent
  exacerbations, asthma overlap) — *not* for everyone, and they carry pneumonia risk in COPD. `rct`/guideline
  (GOLD).
- **Vaccination** (influenza, pneumococcal, COVID-19, RSV) — reduces exacerbations and serious infection.
- **Long-term oxygen** (in chronic severe hypoxemia) and, in selected emphysema, **lung-volume-reduction**
  (surgical or endobronchial valves) — genuine survival/function benefits in the right patients. `rct`.
- **Honest grade.** COPD management is **damage control done well**: it reduces symptoms, exacerbations, and
  hospitalizations and improves function and (for some interventions) survival — but the disease remains
  progressive. The lever that matters most is the one that prevents it: not smoking.

### A3. Obstructive sleep apnea — hugely underdiagnosed, and the CPAP honesty problem

**What it is.** OSA is **repetitive collapse of the upper airway during sleep**, causing apneas/hypopneas with
oxygen desaturation, surges of sympathetic activity, and sleep fragmentation. Hallmarks: loud snoring, witnessed
pauses, gasping, un-refreshing sleep, daytime sleepiness, morning headache — but **many people have none of the
"classic" symptoms.** Severity is graded by the apnea-hypopnea index (AHI — how many breathing pauses you have
per hour of sleep). It is **one of the most
underdiagnosed conditions in medicine** — a large majority of moderate-to-severe cases are undiagnosed,
because the events happen during sleep and the daytime signal is nonspecific.

**Mechanism (→ anatomy + neuromuscular control).** Sleep relaxes pharyngeal dilator muscles; in a susceptible
airway (obesity-narrowed, crowded craniofacial anatomy, large tongue/tonsils, nasal obstruction) the airway
collapses. Each event ends in a micro-arousal. The downstream physiology is the dangerous part: **intermittent
hypoxia + sympathetic surges + sleep fragmentation** drive hypertension, insulin resistance, endothelial
dysfunction, atrial fibrillation, and excessive daytime sleepiness (cross-ref `12-sleep.md` for the sleep
fundamentals). `mechanistic`/`cohort`.

@@FIG:DS8-osa@@

**The cardiometabolic links — and the honest grading.** Observational **cohorts** strongly associate untreated
OSA with hypertension (especially resistant/nocturnal), atrial fibrillation, heart failure, stroke, type-2
diabetes, and mortality. **But here predictor-≠-lever bites hard.** Randomized trials of CPAP (continuous
positive airway pressure — a bedside machine that pumps gentle air pressure to splint the airway open) for
*preventing cardiovascular events* have been **largely null**: the **SAVE** trial (McEvoy et al., NEJM 2016;
n≈2,700, OSA + established CV disease) found CPAP did **not** reduce the composite of
CV death/MI/stroke versus usual care — though it did improve sleepiness, mood, and quality of life.[^save] The
**ISAACC** trial reached a similar null in acute-coronary-syndrome patients. The leading explanations: trial
participants used CPAP only ~3–4 h/night (under-adherence), trials enrolled *non-sleepy* patients (who may
benefit less), and the patients who plausibly benefit most (severe hypoxic burden, very sleepy) are
under-represented. Newer analyses suggest CPAP benefit may concentrate in **high-hypoxic-burden** subgroups
and in adherent users — `cohort`/secondary, not yet definitive.

**What this means, honestly.**
- **CPAP is strongly evidence-based for what it was designed to do:** abolish apneas, fix daytime sleepiness,
  improve quality of life, lower blood pressure modestly, and improve glucose/insulin measures. `rct`. If OSA
  is making you exhausted, CPAP is life-changing.
- **CPAP is *not* proven to prevent heart attacks/strokes in unselected, often non-sleepy, under-adherent
  trial populations.** `rct` (null). This does not mean OSA is harmless — the disease still predicts CV
  events — it means *adding CPAP on top of standard CV care didn't move the hard endpoint in those RCTs.*
- **The treatment menu beyond CPAP:** **weight loss** (often the root cause and a true disease-modifier;
  GLP-1 drugs are now showing OSA-severity reductions), **positional therapy** (for supine-predominant OSA),
  **mandibular advancement oral appliances** (for mild-moderate or CPAP-intolerant), **hypoglossal-nerve
  stimulation** (selected patients), and treating nasal obstruction. `rct`/guideline.
- **Practical takeaway:** OSA is worth *actively looking for* (snoring + sleepiness + hypertension/AFib/obesity
  → ask for testing; home sleep apnea tests have made this far easier). Treat it primarily to feel and function
  better and to help blood pressure/metabolism — and pursue weight loss as the durable lever — while being
  honest that the hard-CV-outcome case rests on cohorts, not trials.

### A4. Pneumonia and respiratory infections — where vaccines earn their keep

**What it is.** Pneumonia is infection of the lung parenchyma (alveoli fill with inflammatory exudate),
presenting with fever, cough, sputum, breathlessness, and on imaging a consolidation. Lower-respiratory-tract
infections are a top global cause of death, concentrated at the extremes of age and in the immunocompromised.

**Mechanism + management.** Pathogens (pneumococcus, other bacteria, influenza/COVID/RSV viruses, atypicals)
overcome mucociliary clearance and immunity. **Management:** prompt risk-stratified antibiotics for bacterial
pneumonia (severity tools like CURB-65 guide site-of-care), antivirals where indicated, oxygen/supportive care.
But the **highest-leverage move is prevention by vaccination** — pneumococcal, influenza, COVID-19, and (newly)
RSV vaccines reduce serious LRTI and death, especially in older adults and those with COPD/heart disease.
`rct`/`meta` for the vaccines. Smoking cessation again helps (smoking impairs clearance). This is a domain where
the boring public-health levers — vaccines, not supplements — carry the evidence.

### A5. Pulmonary fibrosis (brief) — the honest prognosis

**Idiopathic pulmonary fibrosis (IPF)** is progressive scarring of the lung interstitium: aberrant repair after
repeated micro-injury lays down collagen, stiffening the lung and destroying gas exchange. It presents with
progressive exertional dyspnea and dry cough, often with finger clubbing and "Velcro" crackles, typically in
older adults. Prognosis is poor (historically a median survival of only a few years). **Antifibrotic drugs
(pirfenidone, nintedanib) slow the rate of FEV₁/FVC decline** — `rct`-grade — but **do not reverse** fibrosis;
lung transplantation is the only definitive option for selected patients. Honest grade: this is a *slow-the-
decline*, not a *cure*, story, and the realism matters. (Other interstitial lung diseases — connective-tissue-
associated, hypersensitivity pneumonitis, sarcoidosis — are a large separate topic.)

### A6. Lung cancer (cross-ref oncology)

Lung cancer is the leading cause of cancer death; **~80–90% is attributable to smoking** (cross-ref
`09-exposures-environment.md` for tobacco magnitude and `22`-series oncology for the cancer biology and
treatment). The two facts to anchor here: **(1)** prevention is overwhelmingly *don't smoke / quit*, and
**(2)** **low-dose CT screening** of high-risk current/former heavy smokers reduces lung-cancer mortality
(NLST, NELSON) — `rct`-grade — making it one of the few effective cancer screens, handled in the oncology and
screening sections.

---

## Part B — Digestive Disease

### B1. Upper GI: GERD — lifestyle-first, and the honest PPI story

**What it is.** Gastroesophageal reflux disease is reflux of stomach contents causing troublesome symptoms
(heartburn, regurgitation) or mucosal damage (erosive esophagitis, and the precancerous **Barrett's
esophagus**). It is common and rising with obesity.

**Mechanism (→ mechanics + metabolism).** The anti-reflux barrier is the lower esophageal sphincter plus the
diaphragmatic crura; it fails through **transient LES relaxations, a hiatal hernia, raised intra-abdominal
pressure (central obesity), and delayed clearance.** Acid then injures the squamous esophageal lining. This is
why GERD is, mechanistically, often **a weight-and-mechanics problem with an acid symptom** (cross-ref `17
§4.2`). `mechanistic`/guideline.

**Management — lifestyle first (ACG 2022).** Guideline care front-loads **lifestyle levers**: **weight loss**
(best-evidenced), elevating the head of the bed, avoiding late/large meals, and identifying trigger foods —
before or alongside acid suppression. Acid suppression with **proton-pump inhibitors (PPIs)** (or newer
potassium-competitive acid blockers, PCABs) is effective and appropriate for symptomatic or erosive disease.
Anti-reflux surgery (fundoplication) or magnetic-sphincter augmentation is an option for selected refractory or
mechanically-driven (large hernia) cases. guideline/`rct`.

**The honest long-term-PPI story.** PPIs are among the most-prescribed drugs in the world, and the internet is
full of frightening claims (dementia, kidney disease, fractures, infections, early death). The evidence:
- These harms come almost entirely from **observational studies with real confounding** (people on chronic PPIs
  are sicker). The large **COMPASS** randomized trial (pantoprazole vs placebo, ~17,000 patients, ~3 years)
  found **no significant excess** of most feared outcomes except a small signal for enteric infections. So the
  scary associations are mostly *not* established as causal. `rct` (the strongest single piece of evidence here).
- **But that does not mean "PPIs forever, no thought."** Real considerations: modestly increased risk of
  enteric infections (e.g., *C. difficile*), possible small effects on magnesium/B12 absorption with long use,
  rebound acid hypersecretion on stopping, and the simple principle that you should be on the *lowest effective
  dose for the shortest necessary duration* — and many people on chronic PPIs were never re-evaluated and could
  step down. Erosive esophagitis and Barrett's are legitimate reasons for long-term therapy; "I never tried
  losing weight or changing meal timing" is not.
- **Honest grade:** PPIs are effective and **far safer than the viral fear suggests** (`rct`-anchored), and the
  longevity-literate framing is *use them when indicated, aim for the lowest effective dose, and fix the
  mechanics (weight, meal timing) so you need less drug* — not "PPIs are poison."

**Dysphagia (brief).** Difficulty swallowing is always a **red-flag symptom** warranting evaluation, never a
thing to wait out — it can signal esophageal stricture (often from chronic reflux), motility disorders (e.g.,
achalasia), eosinophilic esophagitis (an increasingly recognized allergic esophageal disease, treated with
diet/PPI/topical steroids), or esophageal cancer. The honesty rule: *new or progressive difficulty swallowing,
especially with weight loss, gets investigated promptly.*

### B2. Peptic ulcer disease — the H. pylori revolution

**What it is.** A peptic ulcer is a break in the mucosa of the stomach or duodenum penetrating the muscularis
mucosae — causing epigastric pain, and at worst bleeding or perforation.

**The revolution (→ infection biology, and a Nobel-grade overturn of dogma).** For most of the 20th century,
ulcers were "caused by stress and acid" and treated with antacids, bland diets, acid-reducers, and sometimes
surgery — recurring endlessly. Then **Barry Marshall and Robin Warren** showed that a spiral bacterium,
***Helicobacter pylori***, colonizes the stomach and causes the chronic gastritis underlying most ulcers.
Marshall famously **drank a culture of H. pylori himself** (1984), developed gastritis, and treated it — part
of the evidence that fulfilled a modern version of Koch's postulates (Marshall *et al.*, *Med J Aust* 1985).
They won the **2006 Nobel Prize in Physiology or Medicine.** The implication was radical: **most peptic ulcer
disease is an infection, and infections can be cured.** `rct`/`meta` (eradication trials).

**Mechanism.** *H. pylori* survives gastric acid (it makes urease, buffering its microenvironment), incites
chronic inflammation, and — depending on strain and host — causes gastritis, duodenal/gastric ulcers, and over
decades raises the risk of **gastric cancer and MALT lymphoma** (H. pylori is a WHO class-I carcinogen). The
*other* major ulcer cause is **NSAIDs** (ibuprofen-type anti-inflammatory painkillers), which strip
prostaglandin-mediated mucosal defense (cross-ref the
NSAID-kidney caution in `17 §2.6` — same drugs, different organ).

**Management.** **Test for and eradicate H. pylori** (combination antibiotics + acid suppression — regimens
have shifted toward bismuth-quadruple and vonoprazan-based therapy as clarithromycin resistance has risen) and
**stop/avoid NSAIDs** (or co-prescribe gastroprotection when they're unavoidable). Eradication **cures** the
ulcer diathesis and sharply cuts recurrence — one of the cleanest, most cost-effective wins in modern medicine.
`meta`/guideline. The honest footnote: not all dyspepsia is ulcer, antibiotic resistance now requires more
careful regimen choice and confirmation of cure, and most people carrying H. pylori never develop an ulcer.

### B3. Lower GI: IBS — a real disorder of gut-brain interaction

**What it is.** Irritable bowel syndrome is **recurrent abdominal pain associated with altered bowel habit**
(diarrhea-predominant, constipation-predominant, or mixed), in the **absence of structural or biochemical
abnormality** that explains it (diagnosed by the Rome IV criteria — the standardized symptom checklist doctors use — after
excluding alarm features).
It is extremely common (~5–10% of adults) and a leading reason for gastroenterology visits.

**The honest "it's real" framing.** Because there's no lesion to point to, IBS has historically been dismissed
as "in your head" or "just stress" — a stigma that harms patients. The modern, evidence-based framing is that
IBS is a genuine **disorder of gut-brain interaction (DGBI)**: the gut and brain miscommunicate, producing real
symptoms via real mechanisms — not imaginary, and not a diagnosis of exclusion to be ashamed of. `mechanistic`/guideline.

**Mechanism (→ gut-brain axis, microbiome, immune).** Contributing mechanisms include **visceral
hypersensitivity** (the gut's pain signaling is turned up — normal distension hurts), **altered motility**,
**post-infectious changes** (IBS commonly follows acute gastroenteritis), **microbiome alterations** and bile-
acid handling, low-grade immune activation, **altered gut-brain signaling** (the bidirectional vagal/enteric/
neuro-immune axis — cross-ref `17 §4.3` and `C2-microbiome-deepdive.md`), and a strong interaction with
**stress, anxiety, and depression** (the gut-brain axis runs both ways). `mechanistic`/`cohort`.

**Management and the FODMAP evidence.**
- **Diet — the low-FODMAP diet.** FODMAPs (Fermentable Oligo-, Di-, Mono-saccharides And Polyols) are
  short-chain carbohydrates that are poorly absorbed, osmotically active, and rapidly fermented — producing gas,
  distension, and (in hypersensitive guts) pain. A **structured low-FODMAP diet** reduces IBS symptoms in
  randomized trials (Halmos et al., Gastroenterology 2014, the landmark controlled feeding study).[^fodmap]
  Honest caveats: it is a **three-phase protocol**, **meant to be done with a dietitian and not stayed on long-
  term** (chronic restriction harms the microbiome and risks nutritional gaps), and roughly half to two-thirds
  of patients respond. `rct` (short-term symptom relief).

@@FIG:DS6-low-fodmap@@
- **Fiber.** **Soluble** fiber (e.g., psyllium) helps, especially constipation-predominant IBS; **insoluble**
  bran can worsen symptoms. A clean example of "fiber" not being one thing. `meta`.
- **Gut-brain therapies.** Because the axis is bidirectional, **brain-directed treatments work on the gut**:
  cognitive behavioral therapy, gut-directed hypnotherapy, and **neuromodulators** (low-dose tricyclics for
  IBS-D/pain; SSRIs in some) have `rct`/`meta` support. This is *not* "it's psychological" — it's using the
  gut-brain axis as a real therapeutic target.
- **Targeted drugs by subtype:** antispasmodics and peppermint oil for pain/spasm; for IBS-D, loperamide,
  the bile-acid-related options, rifaximin (a poorly-absorbed antibiotic with modest, transient benefit), or
  eluxadoline; for IBS-C, secretagogues (linaclotide, plecanatide, lubiprostone). Probiotics show *mixed,
  strain-specific, generally modest* effects — not a reliable single answer. `rct`/`meta`, effects modest.
- **Honest grade.** IBS is **real, common, and manageable but not usually "cured."** The best results come from
  a combination — dietary (structured FODMAP, soluble fiber), gut-brain (CBT/hypnotherapy/neuromodulator), and
  subtype-targeted drugs — and from a clinician who takes it seriously. Expect meaningful improvement, not
  necessarily disappearance.

### B4. Inflammatory bowel disease — autoimmune-spectrum, and the biologics era

**What it is.** IBD is **chronic immune-mediated inflammation of the gut**, comprising **Crohn's disease**
(can affect any part of the GI tract, transmural, "skip" lesions, complications like strictures/fistulae) and
**ulcerative colitis** (continuous mucosal inflammation limited to the colon, starting at the rectum). It is
*not* IBS — IBD has **objective inflammation, tissue damage, and real complications** (it can require surgery
and raises colorectal-cancer risk). Distinguishing the two is a core clinical task (IBD has alarm features:
bleeding, weight loss, anemia, raised inflammatory markers/fecal calprotectin, abnormal endoscopy).

**Mechanism (→ immune dysregulation × genetics × environment/microbiome).** IBD arises from a **dysregulated
mucosal immune response to gut microbes in a genetically susceptible host**, modulated by environment (smoking
— harmful for Crohn's, oddly *protective* for UC; diet; early-life and microbiome factors). Genome-wide studies
implicate >200 loci (e.g., NOD2 in Crohn's) in barrier function, autophagy, and immune signaling. It is an
**immune-mediated / autoimmune-spectrum** disease, not an infection and not caused by stress or diet alone.
`mechanistic`/`cohort`.

**Management — induce and maintain remission.** The therapeutic revolution here is **biologics and small
molecules** that target specific immune pathways:
- **Anti-TNF** (infliximab, adalimumab), **anti-integrin** (vedolizumab, gut-selective), **anti-IL-12/23 and
  anti-IL-23** (ustekinumab, risankizumab, mirikizumab), and oral **small molecules** (JAK inhibitors like
  tofacitinib/upadacitinib; S1P modulators like ozanimod) — all `rct`-proven to induce and maintain remission.
- Older agents still matter: **5-aminosalicylates** (mainstay for mild UC; little role in Crohn's),
  corticosteroids (for flares only — *not* maintenance), and immunomodulators (thiopurines, methotrexate).
- **"Treat-to-target"** (aim for objective mucosal healing, not just symptom relief) and **early effective
  therapy** improve long-term outcomes. Surgery is sometimes necessary (curative colectomy for UC; resection
  for Crohn's complications, though Crohn's recurs). `rct`/`meta`/guideline.
- **Honest grade.** Biologics are **disease-modifying** — they have transformed IBD from a
  progressively disabling disease to one where durable remission is realistic for many. But they are **not a
  cure** (except colectomy for UC), they don't work for everyone, response can be lost over time, and they carry
  **real risks** (infection, and for some agents specific malignancy/thrombosis signals) requiring monitoring.
  This is a high-stakes, specialist-managed disease — the opposite of a self-treatable "gut" complaint.

### B5. Celiac disease — true autoimmunity, vs the honesty about non-celiac gluten sensitivity

**What it is (celiac).** Celiac disease is a **genuine autoimmune disease** in which dietary **gluten** (wheat,
barley, rye) triggers immune-mediated damage to the small-intestinal lining (**villous atrophy**), causing
malabsorption (diarrhea, weight loss, anemia, osteoporosis) — but also frequently presenting *atypically* or
silently (fatigue, iron deficiency, raised liver enzymes, neurological symptoms, or found on screening).

**Mechanism (→ immune/HLA fundamentals).** In people carrying **HLA-DQ2 or DQ8** (necessary but not
sufficient), gluten peptides (deamidated by tissue transglutaminase) are presented to T cells, driving an
autoimmune attack on the intestinal mucosa and production of **anti-tissue-transglutaminase (tTG-IgA)**
antibodies. This is *real, measurable autoimmunity with tissue destruction* — categorically different from a
food preference. `mechanistic`/established.

**Diagnosis and treatment — and the critical honest point.** Diagnosis rests on **serology (tTG-IgA) plus, in
most adults, duodenal biopsy** — and here is the honesty rule that matters: **you must be diagnosed *before*
removing gluten**, because going gluten-free first normalizes the tests and makes celiac impossible to confirm
or exclude. Treatment is a **strict, lifelong gluten-free diet** — the only effective therapy, and a genuine
medical necessity for celiac patients (the disease causes real damage and cancer risk if untreated).
guideline/established.

**The honest "real vs non-celiac gluten sensitivity" framing.**
- **Celiac disease (~1% of people): real, autoimmune, diagnosable, with objective tissue damage.** Gluten-free
  diet is medically essential. No debate.
- **Wheat allergy:** a distinct, real IgE-mediated allergy (separate again).
- **Non-celiac gluten/wheat sensitivity (NCGS):** a contested, real-symptoms-but-uncertain-mechanism entity.
  Many people report GI and systemic symptoms on gluten without celiac or wheat allergy, and double-blind
  rechallenge studies suggest that for a substantial fraction, the trigger may not be gluten at all but
  **fructans** (a FODMAP in wheat) — i.e., it overlaps with IBS — or a nocebo effect. NCGS is a real
  symptom experience deserving respect, but it is *not* celiac disease, the "gluten" attribution is often
  wrong, and there is **no validated diagnostic test** for it. `rct`/contested.
- **Honest grade.** The cultural "gluten-free for everyone" wellness trend is **not evidence-based for people
  without celiac/allergy** — for them a gluten-free diet has no proven health benefit, can be lower in fiber and
  higher in cost, and may even worsen nutrition. *If you suspect celiac, get tested before quitting gluten.* If
  you feel better off wheat without celiac, the likely culprit is FODMAPs/IBS, and a structured approach beats
  lifelong blanket avoidance.

### B6. Diverticular disease — and a reversed dogma

**Diverticulosis** (out-pouchings of the colon wall, very common with age in Western populations — likely
related to wall structure, pressure, and historically low fiber) is usually **asymptomatic**. **Diverticulitis**
is inflammation/infection of a diverticulum (pain, fever, raised inflammatory markers; complications include
abscess, perforation, fistula). Mechanism ties to **colonic wall mechanics, fiber, and the microbiome.**

Two honest, evidence-updated points: **(1) Fiber** (cross-ref `17 §4.4`) is the main prevention lever, and the
old advice to *avoid* nuts/seeds/popcorn has been **debunked** — large cohorts show no increased diverticulitis
risk from these foods. **(2) Antibiotics-for-everyone has been rolled back:** randomized trials (e.g., AVOD,
DIABOLO) show **uncomplicated acute diverticulitis can often be managed *without* antibiotics** in selected
patients — a genuine reversal of decades of reflexive antibiotic use. `rct`/guideline. Surgery is reserved for
complications or recurrent severe disease.

### B7. Colorectal cancer (cross-ref oncology/screening)

Colorectal cancer is among the most common and lethal cancers — and one of the most **preventable**, because it
usually arises through a slow **adenoma→carcinoma sequence** over ~10–15 years, giving a long window to find and
remove precursors. **Screening works:** the randomized **NordICC** trial (Bretthauer et al., NEJM 2022)
confirmed colonoscopy screening reduces colorectal-cancer incidence (and, in
per-protocol analysis, mortality),[^nordicc] and stool-based tests (FIT) plus sigmoidoscopy have RCT mortality
evidence too. Fiber, physical activity, and not smoking lower risk; processed/red meat, obesity, and alcohol raise it
(cross-ref `17 §4.4` fiber and the oncology section for biology and staged treatment). The takeaway for this
section: **a normal-risk adult should be screened from age 45** — this is a place where the boring lever
(screening) is `rct`-grade and saves lives.

---

## Part C — Hepatic & Pancreatic Disease

> Cross-ref `17-organ-systems-atlas.md §3` for liver physiology, the MASLD epidemic framing, alcohol, the
> weight-loss-reverses-histology evidence, and the flat "liver detox" debunk. This part adds the clinical
> disease layer (the viral hepatitides, cirrhosis, gallstones, pancreatitis) and the *drug* developments.

### C1. MASLD / MASH — the epidemic, now with the first real drugs

**What it is.** MASLD (metabolic dysfunction-associated steatotic liver disease — the 2023 rename of NAFLD)
is **fat accumulation in the liver driven by metabolic dysfunction**, on a spectrum: steatosis → steatohepatitis
(MASH, with inflammation and hepatocyte injury) → fibrosis → cirrhosis → hepatocellular carcinoma. It now affects
**~30%+ of adults globally** and is the fastest-rising cause of liver disease and transplant.

@@FIG:BS6-masld-progression@@

**Mechanism (→ insulin resistance, the metabolic core).** MASLD is **the hepatic manifestation of insulin
resistance**: caloric excess and insulin resistance drive hepatic fat storage; in susceptible people the fat
becomes lipotoxic, triggering inflammation, hepatocyte injury, and progressive **fibrosis** — and *fibrosis
stage, not the fat itself, is the prognostic axis* (cross-ref `17 §3.2`). It travels with obesity, type-2
diabetes, and cardiovascular disease — in fact, **the leading cause of death in MASLD patients is
cardiovascular, not liver.** `mechanistic`/`cohort`.

**Management — weight loss is the foundation, and now there are drugs.**
- **Weight loss reverses histology** — the empirical core. ≥7% weight loss resolves MASH in most; ≥10%
  regresses fibrosis in a majority (Vilar-Gomez et al., Gastroenterology 2015; meta-confirmed by Monami et al.,
  Diabetes Obes Metab 2026).[^masld-wl] Diet, exercise, GLP-1 therapy, and bariatric
  surgery all work *through* weight/metabolic improvement. `cohort`/`meta`.
- **The first approved MASH drugs (new).** **Resmetirom** (a liver-directed thyroid-hormone-receptor-β
  agonist) became the **first FDA-approved drug for MASH with fibrosis** on the strength of the **MAESTRO-NASH**
  phase-3 trial (Harrison et al., NEJM 2024),[^maestro] which showed significant MASH
  resolution and fibrosis improvement versus placebo. And **semaglutide** (GLP-1) showed MASH resolution and
  fibrosis benefit in the phase-3 **ESSENCE** trial (Sanyal et al., NEJM 2025).[^essence]
  `rct`. This is a real shift — for the first time there is pharmacotherapy beyond "lose weight" — though these
  drugs *augment*, not replace, the metabolic lever.
- **Honest grade.** MASLD is **largely a reversible, lifestyle-and-metabolism disease caught early**, and the
  liver has no special "liver supplement" lever (cross-ref the `17 §3.5` detox debunk). The new drugs are
  genuine progress for those with fibrotic MASH, but the foundation remains weight and metabolic control, and
  the prognosis is driven as much by the heart as the liver.

### C2. Viral hepatitis B and C — and the curable-now revolution

**Hepatitis C — one of the great wins of modern medicine.** HCV is a blood-borne virus that, untreated,
causes chronic infection in most, leading over decades to cirrhosis and liver cancer. Until ~2014, treatment
was a brutal year of interferon + ribavirin with ~50% cure and severe side effects. Then came **direct-acting
antivirals (DAAs)** — oral drugs targeting HCV replication proteins. The pivotal trials (e.g., Afdhal et al.,
ledipasvir-sofosbuvir, NEJM 2014) showed **>95% cure ("sustained virologic
response") in 8–12 weeks of well-tolerated pills.**[^daa] **Hepatitis C is now curable for nearly everyone** — a
chronic viral disease essentially solved pharmacologically, and cure reduces liver-cancer and mortality risk.
The remaining problem is not the science but **diagnosis and access** (most infected people don't know it) —
hence universal-screening recommendations. `rct`/`meta`. This belongs in any honest manual as proof that "chronic
and incurable" is not permanent.

@@FIG:D12-hepc-cure@@

**Hepatitis B — suppressible and vaccine-preventable.** HBV is also blood-/body-fluid-borne and can cause
chronic infection (especially when acquired in infancy), cirrhosis, and liver cancer. The two anchors: **(1)
prevention by vaccination** — the HBV vaccine is highly effective and is arguably the first "anti-cancer
vaccine" (it prevents HBV-driven hepatocellular carcinoma); **(2) chronic HBV is *controlled, not yet routinely
cured*** — oral nucleos(t)ide analogues (tenofovir, entecavir) suppress the virus, halt progression, and reduce
cancer risk, but usually require **long-term/lifelong** therapy (the virus persists as covalently-closed
circular DNA). `rct`/`meta`. Honest grade: HBV is a strong *prevention and control* story (vaccinate; suppress);
the *cure* (eliminating cccDNA) is an active research frontier, not yet standard.

### C3. Cirrhosis — end-stage, but the cause matters enormously

**Cirrhosis** is the end-stage of chronic liver injury: diffuse fibrosis and nodular regeneration that destroy
architecture, causing **portal hypertension** (varices, ascites, hepatic encephalopathy) and synthetic failure,
plus a high hepatocellular-carcinoma risk. Any chronic insult can cause it — alcohol, MASH, viral hepatitis,
autoimmune and genetic diseases (hemochromatosis — cross-ref `17 §5.2`; Wilson's; α₁-antitrypsin).

The honest, hopeful nuance: **compensated cirrhosis is not always a one-way street.** Removing the cause early —
curing HCV, stopping alcohol, reversing MASH with weight loss — can **stabilize or even partially regress
fibrosis** and dramatically improve prognosis. Once **decompensated** (ascites, variceal bleed, encephalopathy),
the situation is far more serious and **liver transplantation** becomes the definitive option. Management is
specialist-led: treat the cause, screen for varices and HCC, manage complications. `cohort`/guideline. Takeaway:
*the single most important thing is to identify and remove the cause before decompensation.*

### C4. Gallstones — and when *not* to operate

**Gallstones** (mostly cholesterol stones from bile supersaturation + gallbladder stasis; the classic risk
factors "female, forty, fertile, fat" plus rapid weight loss and genetics) are very common. The crucial honest
point: **most gallstones are silent and should be left alone** — the risk of an asymptomatic stone ever causing
trouble is low. **Cholecystectomy (gallbladder removal) is indicated when stones cause symptoms** (biliary colic)
or complications (cholecystitis, choledocholithiasis, gallstone pancreatitis). Operating on silent stones is
*not* recommended (the harms outweigh the benefits). guideline. Mechanistically this is a bile-chemistry +
motility problem; dramatic crash dieting paradoxically *causes* stones, a relevant caveat for the weight-loss
advice elsewhere — lose weight, but not recklessly fast.

### C5. Pancreatitis — acute and chronic

**Acute pancreatitis** is sudden pancreatic inflammation (severe epigastric pain radiating to the back, raised
lipase), most often from **gallstones or alcohol**. Mechanism: premature intra-pancreatic activation of
digestive enzymes → autodigestion and inflammation, which can escalate to systemic inflammatory response and
necrosis. Management has shifted to **early aggressive fluid resuscitation, pain control, and *early* enteral
nutrition** (the old "rest the gut by starving" dogma is out — early feeding improves outcomes) — plus removing
the cause (cholecystectomy after gallstone pancreatitis; alcohol cessation). `rct`/guideline.

**Chronic pancreatitis** is progressive fibrotic destruction (most often from **chronic alcohol use**, also
genetic, autoimmune, obstructive) causing chronic pain, **exocrine insufficiency** (maldigestion, steatorrhea —
treated with pancreatic enzyme replacement) and **endocrine insufficiency** (diabetes). Management centers on
**removing the cause (alcohol, smoking — both major drivers), pain control, enzyme replacement, and nutritional
support.** Honest grade: chronic pancreatitis is largely *irreversible* once established, which makes the
preventable causes (alcohol, smoking) the real lever.

---

## Part D — The Honest Debunks

The gut and liver are the wellness industry's favorite organs to monetize, precisely because their real biology
(microbiome, "detox," inflammation) is interesting and incomplete — the perfect substrate
for selling certainty where the science offers nuance. Held to the same evidence ladder as everything else:

### D1. "Leaky gut syndrome" — a real phenomenon, an overstated diagnosis

**Intestinal permeability is real biology.** The gut barrier's tight junctions can loosen, and increased
permeability is *observed in association with* established diseases (celiac, IBD, some infections,
critical illness). What is **not** established is the wellness construct of **"leaky gut syndrome"** as a
**standalone diagnosis that causes** fatigue, brain fog, autoimmune disease, and a long symptom list — and is
**fixable by supplements** (glutamine, "gut-healing" powders, specific probiotics, restrictive diets). The honest
read: increased permeability is more often a **consequence or correlate** of disease than a proven root cause of
vague systemic symptoms, the causal direction is mostly unestablished in humans, and **no supplement is proven to
"seal" the gut and resolve those symptoms.** `mechanistic` (real phenomenon) but the syndrome-and-cure narrative
is `anecdotal`/refutes. Treat the real disease if there is one; be skeptical of "heal your leaky gut" product
funnels.

### D2. IgG food-sensitivity testing — not a valid test

**This is one of the clearest debunks in the manual.** Direct-to-consumer **IgG/IgG4 "food sensitivity" panels**
(test your blood against dozens of foods, get a list to eliminate) are **not validated to diagnose food
sensitivity or intolerance.** Multiple allergy/immunology societies (AAAAI, EAACI, CSACI, and others) explicitly
recommend **against** them. The reason is mechanistic: **food-specific IgG is a normal marker of *exposure and
tolerance*, not of pathology** — having IgG to foods you eat is *expected and healthy*, not a sign they harm you.
Acting on these panels leads to unnecessary, often extensive dietary restriction (with real nutritional and
psychological cost) chasing a result that reflects what you ate, not what's wrong. `meta`/guideline-grade refutation.
(True food **allergy** is IgE-mediated and tested differently; celiac has its own validated serology; lactose
intolerance has breath testing. Those are real. The IgG food-panel is the fake one.)

### D3. "Gut health" supplements — mostly unproven claims

The probiotic/prebiotic/"gut health" supplement market sells confidence the evidence doesn't support. The honest
grading (cross-ref `C2-microbiome-deepdive.md`, whose headline is that microbiome-aging evidence is *front-loaded
with mouse and association data*): **no over-the-counter probiotic is proven to extend healthspan or "optimize"
a healthy person's gut.** Probiotic *effects are strain-specific, condition-specific, and generally modest* where
they exist at all (e.g., specific strains for antibiotic-associated diarrhea or some IBS symptoms), and **most
products don't match the strains/doses with any trial evidence.** Buying a generic "gut health" probiotic for
general wellness is buying a hope, not a result. The boring, better-evidenced gut levers are the ones already in
`17 §4.4` and `C2`: **eat fiber and a diversity of whole/fermented foods, move, sleep, and don't smoke** — which
feed your own microbiome far more reliably than a capsule. `mechanistic`/mixed; the "optimize your gut" product
claims are `anecdotal`.

### D4. "Detox" cleanses — cross-ref the flat debunk

**Juice cleanses, "colon cleanses"/coffee enemas, "liver detoxes," and "candida cleanse" protocols do not remove
"toxins" and are not health interventions** (full treatment in `17 §3.5` and `09-exposures-environment.md`). The
liver and kidneys detoxify continuously; the colon does not need "cleansing"; there is **no quality evidence** any
commercial cleanse improves health, and some cause harm — **colon "cleansing" can cause dehydration, electrolyte
disturbance, and bowel injury**, and some "detox"/herbal-liver products are themselves a documented cause of
drug-/supplement-induced liver injury (the irony of a "cleanse" damaging the organ it claims to clean). `anecdotal`
/refutes. The only evidence-based way to help the gut and liver is to give them less to deal with — less alcohol,
less excess calories, fewer unnecessary supplements — and let the organs you were born with do the job they do.

---

## Synthesis — how this atlas ties to the fundamentals

Step back, and the respiratory/GI/hepatic diseases collapse into a few fundamentals already established in this
manual:

1. **The lungs and liver inherit your exposures and metabolism.** The lung's master lever is *not smoking*
   (COPD, lung cancer, pneumonia risk all fall); the liver's master lever is *metabolic health and not poisoning
   it* (MASLD reverses with weight loss; cirrhosis is preventable by removing the cause). No supplement matches
   either.
2. **Some of these diseases went from sentence to cure in one lifetime — by finding the real cause.** Peptic
   ulcer (it was an infection → eradicate it) and hepatitis C (DAAs → >95% cured) are the proof that "chronic
   and incurable" is a statement about current knowledge, not destiny. The lesson generalizes: *find the
   mechanism, and management follows.*
3. **Predictor ≠ lever, sharply, in two places.** OSA *predicts* cardiovascular disease, but CPAP *added* to
   standard care didn't move hard CV endpoints in RCTs — treat OSA to feel and function better and help BP/
   metabolism, and pursue weight loss as the durable lever. PPIs are *associated* with scary outcomes in
   confounded cohorts that an RCT mostly *didn't confirm* — use them when indicated without the fear.
4. **The gut-brain axis is a real therapeutic target, not a dismissal.** IBS is a genuine disorder of gut-brain
   interaction; the most effective treatments combine the gut (FODMAP, fiber, targeted drugs) *and* the brain
   (CBT, hypnotherapy, neuromodulators) — which is the opposite of "it's all in your head."
5. **The clearest debunks in the body live here.** IgG food-sensitivity tests (invalid), "leaky gut syndrome"
   as a curable diagnosis (overstated), generic "gut health" probiotics (mostly unproven), and detox cleanses
   (useless-to-harmful). The honest gut/liver protocol is unglamorous: *fiber, whole and fermented foods,
   movement, sleep, weight control, vaccines for the infections, screening for the cancers, get tested before
   you go gluten-free, and take the actual cure when one exists.*

**Not medical advice.** These are diseases that need real diagnosis and individualized care. Use this map to ask
sharper questions and to recognize the difference between a treatment that *modifies a disease* and one that
*quiets a symptom* — and to spot, fast, the products selling you a cleanse for an organ that already cleans
itself.

---

### Go deeper

- **McEvoy RD, et al. "CPAP for Prevention of Cardiovascular Events in Obstructive Sleep Apnea." NEJM 2016.**
  `10.1056/NEJMoa1606599` — the SAVE trial; CPAP improved sleepiness/QoL but did **not** reduce CV events in
  largely non-sleepy, under-adherent patients. The canonical predictor-≠-lever case for OSA.
- **Marshall BJ, et al. "Attempt to fulfil Koch's postulates for pyloric Campylobacter." Med J Aust 1985**
  (PMID 3982345); and the original Marshall & Warren *Lancet* 1984 description — the self-experiment and the
  discovery that peptic ulcer is an infection (2005/2006 Nobel). The cleanest "find the cause → cure the
  disease" story in the section.
- **Halmos EP, et al. "A diet low in FODMAPs reduces symptoms of irritable bowel syndrome." Gastroenterology
  2014.** `10.1053/j.gastro.2013.09.046` — the landmark controlled feeding trial behind low-FODMAP; remember
  it is a 3-phase, dietitian-guided, not-forever protocol.
- **Harrison SA, et al. "A Phase 3, Randomized, Controlled Trial of Resmetirom in NASH with Fibrosis." NEJM
  2024.** `10.1056/NEJMoa2309000` — MAESTRO-NASH; the first FDA-approved drug for MASH/fibrosis. Pairs with
  **Sanyal AJ, et al. semaglutide in MASH, NEJM 2025** `10.1056/NEJMoa2413258`.
- **Afdhal N, et al. "Ledipasvir and Sofosbuvir for Untreated HCV Genotype 1 Infection." NEJM 2014.**
  `10.1056/NEJMoa1402454` — direct-acting antivirals; >95% cure in 8–12 weeks. Hepatitis C went from
  incurable-and-brutal to solved.
- **Bretthauer M, et al. "Effect of Colonoscopy Screening on Risks of Colorectal Cancer and Related Death."
  NEJM 2022.** `10.1056/NEJMoa2208375` — NordICC; the randomized evidence that screening lowers CRC incidence
  (and, per-protocol, mortality). The adenoma→carcinoma window is the lever.
- **McCarthy B, et al. "Pulmonary rehabilitation for COPD." Cochrane 2015.** `10.1002/14651858.CD003793.pub3`
  — improves exercise capacity and quality of life; the honest "function lever, not a structural cure" for COPD.
- **Monami M, et al. "Weight Loss as a Determinant of Histological Improvement in MASLD." Diabetes Obes Metab
  2026.** `10.1111/dom.70617` — meta-analytic confirmation that weight loss drives histological improvement
  across modalities; the foundation under MASLD pharmacotherapy.
- **AAAAI / EAACI / CSACI position statements on IgG food testing** — the multi-society consensus that IgG/IgG4
  food panels are **not** valid for diagnosing food sensitivity (IgG reflects exposure/tolerance, not
  pathology). The basis for the §D2 debunk.

[^copd-rehab]: McCarthy B, et al. — Pulmonary rehabilitation for COPD, Cochrane 2015. doi:10.1002/14651858.CD003793.pub3. claim: copd-pulm-rehab (meta)
[^save]: SAVE — McEvoy RD, et al., NEJM 2016. doi:10.1056/NEJMoa1606599. claim: osa-cpap-cv-null (rct)
[^fodmap]: Halmos EP, et al. — low-FODMAP in IBS, Gastroenterology 2014. doi:10.1053/j.gastro.2013.09.046. claim: ibs-fodmap-symptom (rct)
[^nordicc]: NordICC — Bretthauer M, et al., NEJM 2022. doi:10.1056/NEJMoa2208375. claim: crc-colonoscopy-screening (rct)
[^masld-wl]: Vilar-Gomez E, et al. — Gastroenterology 2015; meta-confirmed Monami M, et al., Diabetes Obes Metab 2026. doi:10.1111/dom.70617. claim: masld-weightloss-histology (cohort/meta)
[^maestro]: MAESTRO-NASH — Harrison SA, et al., NEJM 2024. doi:10.1056/NEJMoa2309000. claim: mash-resmetirom (rct)
[^essence]: ESSENCE — Sanyal AJ, et al., NEJM 2025. doi:10.1056/NEJMoa2413258. claim: mash-semaglutide (rct)
[^daa]: Afdhal N, et al. — ledipasvir-sofosbuvir for HCV, NEJM 2014. doi:10.1056/NEJMoa1402454. claim: hcv-daa-cure (rct)
