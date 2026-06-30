# 12 — The Mechanism Bridge

> **Status:** v0.1 (Wave 2 synthesis) — 2026-06-28. This chapter is the *connective spine* of the
> manual. Every other section grades **what works**; this one traces **why it could work**, from the
> visible practice all the way down to the fundamental biophysical layer. It exists so that no lever in
> the manual is a black box — so that "just do Zone 2" is never an instruction without a derivation
> behind it.
>
> **It builds on the six mechanism threads** (`02-domains/threads/thread-{mitochondria,nad-redox,
> hormesis,inflammation,autonomic-hrv,circadian-light}.md`) and the graded domain files
> (`E-exercise`, `H-thermal`, `G-breath`, `D-metabolic-nutrition`, `B-aging-mechanisms`,
> `S-pharma-claims`, `P-clinical-claims`, `D2-supplements-claims`, `I-sleep-circadian`,
> `R-exposures-claims`). The intended foundations chapter (`01-foundations.md`) is **not yet written**;
> where it lands, its section anchors should replace the provisional `→ canon 05-biophysics` pointers
> used here. Until then this chapter also carries part of the foundations vocabulary.

---

## 12.0 — How to read a mechanism chain (and why the honesty tag is the whole point)

A **mechanism chain** is the causal ladder from a thing you *do* down to the physics of *why it
matters*. We write it in five rungs:

```
PRACTICE  →  proximate signal  →  cellular / molecular pathway  →  FUNDAMENTAL LAYER  →  outcome
```

- **PRACTICE** — the lever a human actually pulls (run easy for 45 min; eat 40 g protein; sit in a sauna).
- **proximate signal** — the immediate physical perturbation the body registers (a rise in AMP:ATP
  ratio; mechanical tension on a myofibril; core-temperature rise; photons on the retina).
- **cellular / molecular pathway** — the named transduction cascade (PGC-1α; mTORC1; HSF1→HSP70;
  melanopsin→SCN→BMAL1/CLOCK).
- **FUNDAMENTAL LAYER** — the bedrock category the chain ultimately acts on. The manual uses **six**:
  **energy** (ATP / proton-motive force / chemiosmosis), **redox** (electron flow, NAD⁺/NADH, ROS as
  signal), **proteostasis** (folding, chaperoning, autophagic recycling), **membrane** (phospholipid
  bilayers, ion gradients, receptor allostery), **epigenetic** (chromatin / methylation / clock gene
  expression), and **signaling** (hormones, cytokines, nutrient sensors as information). These are the
  layers the Bucket canon's `05-biophysics` branch is built to hold — chemiosmosis (Mitchell),
  redox/submolecular biology (Szent-Györgyi), excitability (Hodgkin–Huxley), endosymbiosis (Margulis),
  the proton-gradient origin of life (Lane/Martin), mtDNA as a second genome (Wallace).
- **outcome** — the health endpoint people actually want (lower mortality, more muscle, sharper
  cognition, slower aging).

**The honesty tag is non-negotiable.** Each chain is marked:

- **`[mechanism: established]`** — the chain is settled biochemistry/physiology, structurally or
  genetically confirmed. *The mechanism is true.* (It does **not** by itself mean the outcome is proven.)
- **`[mechanism: partial]`** — the early rungs are solid but the chain has a contested or unproven joint
  (usually the jump from molecular pathway to human hard endpoint).
- **`[mechanism: hypothesized]`** — the chain is a plausible story drawn from adjacent facts, not yet
  demonstrated end-to-end in humans.

> **The corpus's core failure mode (stated once, here, and revisited in §12.4):** *a real mechanism is
> repeatedly laundered into an unproven outcome.* "NAD⁺ runs the electron-transport chain" (established)
> becomes "NAD⁺ pills extend your life" (unproven). The mechanism tag and the outcome tier are **two
> different axes.** A chain can be `[mechanism: established]` and still rest on a `theoretical`-tier
> outcome. Keep them apart, always. This is the discipline the whole manual is organized around (see
> `E-exercise.md` "governing rule"; `D-metabolic-nutrition.md` "the gap is widest and the marketing is
> loudest"; `H-thermal.md` "the canonical mechanism-laundering move").

---

## 12.1 — The Master Mechanism Table

Each row: **PRACTICE → proximate signal → pathway → fundamental layer → outcome**, with the honesty tag
and the corpus claim-ids it anchors to. Read the linked claim in its home `*-claims.json` for tier +
provenance; this table is the *bridge*, not the evidence base.

| # | Practice | Proximate signal | Cellular / molecular pathway | Fundamental layer | Outcome (and its real tier) | Tag | Anchor claim-ids |
|---|----------|------------------|------------------------------|-------------------|-----------------------------|-----|------------------|
| 1 | **Aerobic / Zone 2 endurance** | repeated Ca²⁺ transients + ↑AMP:ATP + transient ROS in working muscle | **PGC-1α** co-activation → NRF1/2 + TFAM → **mitochondrial biogenesis** (more cristae, more ETC complexes) | **energy** (proton-motive capacity, chemiosmosis) + redox | ↑VO₂max, fat oxidation, lactate clearance; VO₂max = strongest mortality predictor (`cohort`/`meta`) | `[established]` (biogenesis) / `[partial]` (→mortality) | `exercise-mitochondrial-biogenesis-holloszy`, `lactate-threshold-metabolic-flexibility-zone2`, `crf-vo2max-strongest-mortality-predictor` |
| 2 | **High-intensity intervals (HIIT)** | large Ca²⁺ flux + steep AMP:ATP + larger ROS burst | same PGC-1α axis, more strongly per-minute; +β-adrenergic | **energy** + redox | ↑VO₂max per unit time (`meta`, surrogate) | `[established]` (biogenesis) | `hiit-crf-cardiometabolic-meta`, `conflict-zone2-optimal-mito` |
| 3 | **Resistance training** | **mechanotransduction** — tension on integrins/FAK, titin strain, focal adhesions | mechanical load + leucine → **mTORC1** at the lysosome → p70S6K/4E-BP1 → ↑ribosomal **translation** → **myofibrillar protein synthesis** | **signaling** (mTORC1) + proteostasis | ↑muscle/strength; ↓all-cause mortality (`meta`, J-shaped, ~30–60 min/wk) | `[established]` (MPS) / `[partial]` (→mortality) | `resistance-training-mortality-meta`, `muscle-energy-metabolism-intensity`, `muscle-endocrine-organ-myokines` |
| 4 | **Muscle contraction (any)** | secretory response to contraction | **myokine** release (IL-6, irisin, BDNF, SPARC) → endocrine signaling to fat/liver/bone/brain | **signaling** | systemic anti-inflammatory tone (`mechanistic`) | `[partial]` (irisin quant contested) | `muscle-endocrine-organ-myokines`, `inflammaging-franceschi` |
| 5 | **Dietary protein / leucine** | rise in plasma essential amino acids, esp. **leucine** | leucine sensed by Sestrin2/Rag-GTPase → **mTORC1** activation → translation | **signaling** | ↑MPS / anabolism; **age-dependent** longevity tradeoff (mid-life IGF-1/cancer risk ↔ late-life anti-sarcopenia) | `[established]` (mTOR) / `[partial]` (longevity sign flips with age) | `conflict-protein-mtor-longevity` (Levine, Solon-Biet, PROT-AGE, Morton-Phillips) |
| 6 | **Fasting / CR / TRE** | drop in glucose/insulin/leucine; rise in AMP:ATP; ketone rise | **AMPK ↑ / mTORC1 ↓** → ULK1 de-repression → **autophagy/mitophagy**; ketogenesis; circadian (peripheral-clock) alignment | **energy** + proteostasis + signaling | metabolic markers ↑ (`rct`, surrogate); much of real-world benefit reduces to calories | `[established]` (AMPK/autophagy in models) / `[partial]` (human longevity unproven) | `if-metabolic-switching-mechanism`, `bhb-signaling-metabolite`, `calerie-cr-cardiometabolic-humans`, `conflict-tre-efficacy-vs-cr` |
| 7 | **Ketone signaling (BHB)** | rise in β-hydroxybutyrate | BHB inhibits class-I HDACs; blocks **NLRP3 inflammasome**; binds GPCRs | **signaling** + epigenetic | anti-inflammatory / metabolic (`mechanistic`) | `[established]` (mechanism) / `[hypothesized]` (clinical) | `bhb-signaling-metabolite` |
| 8 | **Heat / sauna** | core-temperature rise, fluid/cardiovascular strain | **HSF1** trimerizes → **HSP70/90** (molecular chaperones) → refold/triage damaged proteins | **proteostasis** | ↓mortality/dementia in one cohort (`cohort`, healthy-user bias unexcluded) | `[established]` (HSP) / `[partial]` (→mortality) | `heat-shock-proteins-mechanism`, `sauna-frequency-mortality-kihd`, `conflict-sauna-healthy-user` |
| 9 | **Cold exposure** | skin thermoreceptors → sympathetic outflow | **norepinephrine** (+~530%) → β3-AR on brown fat → **UCP1** uncoupling → non-shivering thermogenesis; transient ROS → **mitohormesis** | **energy** (proton-leak/uncoupling) + redox | ↑insulin sensitivity w/ *prolonged mild* cold (`rct`, surrogate); plunge outcomes thin | `[established]` (UCP1/NE) / `[partial]` (human outcomes; protocol mismatch) | `cold-norepinephrine-thermogenesis-mechanism`, `cold-activated-bat-adult-humans`, `cold-acclimation-insulin-sensitivity-t2d` |
| 10 | **Sleep (deep / NREM)** | reduced arousal, slow-wave activity, interstitial-space expansion | **glymphatic** clearance via **aquaporin-4** astrocyte channels; GH secretory pulse; synaptic downscaling (homeostasis) | **proteostasis** (clearance) + signaling + membrane | ↓amyloid burden; metabolic/endocrine repair (`mechanistic`/`rct`) | `[established]` (GH/synaptic) / `[partial]` (human glymphatic) | `glymphatic-clearance-sleep`, `sleep-deprivation-amyloid-human`, `sleep-debt-metabolic-endocrine` |
| 11 | **Morning / daytime bright light** | short-wavelength photons on retina | **melanopsin** ipRGCs → retinohypothalamic tract → **SCN** → **BMAL1/CLOCK ↔ PER/CRY** loop → melatonin/cortisol timing | **epigenetic** (clock-gene transcription) + signaling | better entrainment, sleep, mood, metabolic timing (`mechanistic`/`rct` on melatonin surrogate) | `[established]` (entrainment) / `[partial]` (hard outcomes) | `light-melatonin-action-spectrum`, `room-light-melatonin-suppression`, `etrf-insulin-sensitivity-weight-independent` |
| 12 | **Slow breathing (~6/min)** | rhythmic stretch + baroreflex loading at ~0.1 Hz resonance | vagal afferents → nucleus ambiguus → **RSA**; prolonged exhale ↑vagal output to SA node | **membrane** (excitable-tissue/baroreflex) + signaling | ↑HRV, ↓arousal/cortisol (`rct`, subjective/surrogate) | `[established]` (vagal mechanism) / `[partial]` (HRV is biomarker, not outcome) | `slow-breathing-autonomic-hrv`, `exhalation-vagal-mechanism`, `cyclic-sighing-mood-arousal-rct` |
| 13 | **Nasal breathing / CO₂ tolerance** | airflow over paranasal sinuses; ↑arterial CO₂ | sinus **nitric oxide** → pulmonary vasodilation/V-Q; **Bohr effect** (↓pH → right-shift O₂-Hb) → tissue O₂ release | **membrane** (Hb allostery, gas exchange) | better V/Q, O₂ delivery (`mechanistic`); performance leap is extrapolation | `[established]` (Bohr/NO) / `[hypothesized]` (performance) | `bohr-effect-co2-tolerance`, `nasal-breathing-nitric-oxide` |
| 14 | **Polyphenols / "hormetic" plant compounds** | mild electrophilic/xenobiotic stress (xenohormesis) | Keap1 oxidation releases **NRF2** → **ARE** → endogenous antioxidant/phase-II enzymes (glutathione, HO-1, NQO1) | **redox** | induced endogenous defense (`mechanistic`); clinical longevity unproven | `[established]` (NRF2/ARE) / `[hypothesized]` (outcome) | `rp-sulforaphane-mechanism`, `resveratrol-human-null`, `sinclair-resveratrol-sirt1-contested` |
| 15 | **High-dose antioxidant supplements** | blunting of exercise/cold ROS | suppress the **redox signal** that PGC-1α/NRF2 adaptation *requires* | **redox** | **blunts** training adaptation; antioxidant RCTs null/harmful | `[established]` (counter-mechanism) | `conflict-free-radical-theory` |
| 16 | **Omega-3 (EPA/DHA)** | incorporation into membrane phospholipids | **membrane remodeling** (fluidity, raft composition) + enzymatic conversion to **specialized pro-resolving mediators** (resolvins, protectins) → active inflammation **resolution** | **membrane** + signaling | ↓triglycerides (dose-dependent, `rct`); CVD events equivocal | `[established]` (SPM/membrane) / `[partial]` (CVD outcome) | `omega3-triglyceride-lowering-dose-dependent`, `omega3-cvd-events-equivocal`, `omega3-index-predictor-not-proven-lever` |
| 17 | **Creatine** | muscle creatine loading | **phosphocreatine shuttle** — creatine kinase rapidly re-phosphorylates ADP→ATP at sites of demand | **energy** (ATP rebuffering) | ↑strength/power w/ training (`meta`); cognition under stress (`partial`) | `[established]` (PCr shuttle) | `creatine-strength-muscle-resistance-training`, `creatine-cognition-stress-aging` |
| 18 | **Statins / apoB-lowering** | inhibit **HMG-CoA reductase** | ↓hepatic cholesterol → **LDL-receptor** upregulation → ↓circulating **apoB/LDL** particles → less subendothelial cholesterol deposition | **membrane** (lipoprotein/arterial wall) + signaling | ↓ASCVD events, dose-dependent in LDL (`meta`/`rct`) — a *causal* chain | `[established]` (the cleanest outcome chain in the manual) | `statin-ldl-event-dose-response`, `ldl-apob-causal-ascvd`, `apob-superior-to-ldlc`, `pcsk9-fourier-mace` |
| 19 | **GLP-1 agonists (semaglutide/tirzepatide)** | pharmacologic incretin-receptor agonism | **GLP-1R** in hypothalamus (satiety), gut (slowed gastric emptying), β-cell (glucose-dependent insulin) | **signaling** | weight loss + CV/renal benefit (`rct`, hard outcomes); muscle-loss caveat | `[established]` (mechanism + outcome both proven) | `semaglutide-step1-weight`, `semaglutide-select-cv-nondiabetic`, `glp1-muscle-loss-caveat` |
| 20 | **Metformin** | mild complex-I inhibition → ↑AMP:ATP | **AMPK** activation (+ lysosomal/microbiome routes) → ↓gluconeogenesis | **energy** + signaling | glucose control proven; *aging* benefit **unproven/experimental** | `[partial]` (anti-aging hypothesized) | `metformin-for-aging-unproven`, `ampk-energy-sensor` |
| 21 | **Rapamycin** | binds FKBP12 | direct **mTORC1** inhibition → ↑autophagy, ↓translation | **signaling** + proteostasis | +9–14% mouse lifespan (`animal`); human longevity **experimental** | `[partial]`/`[hypothesized]` (human) | `rapamycin-for-aging-experimental` |
| 22 | **Sunlight / UV** | UVB photons on skin; UVA-driven photochemistry | 7-dehydrocholesterol → **vitamin D₃** synthesis; photo-release of cutaneous **nitric oxide** (↓BP); ocular light → circadian | **membrane** + signaling + epigenetic (clock) | two-sided: cardio/circadian benefit vs skin-cancer/photoaging | `[established]` (both arms) / `[partial]` (net optimum) | `uv-nitric-oxide-bp-mechanism`, `uv-sun-avoidance-mortality-risk`, `uv-skin-cancer-photoaging`, `vitamin-d-real-in-deficiency` |
| 23 | **Senolytics (D+Q, fisetin)** | clear senescent cells | disable pro-survival SCAP networks → apoptosis of p16⁺ cells → ↓**SASP** | **signaling** (inflammaging) | +function/lifespan in mice (`animal`); one tiny human pilot | `[partial]`/`[hypothesized]` (human) | `senescence-accumulation-mechanism`, `senolytics-extend-function-mouse`, `dq-ipf-first-in-human-pilot` |
| 24 | **NAD⁺ precursors (NR/NMN)** | raise blood NAD⁺ ~60% | substrate for sirtuins + ETC redox cofactor pool | **redox** + signaling | surrogate moves; **no hard endpoint** in humans | `[partial]` (mechanism real, outcome absent) | `nad-precursor-nr-human-surrogate`, `sirtuins-nad-decline`, `conflict-nad-precursor-efficacy` |

---

## 12.2 — The convergence map: many practices, six layers

@@FIG:18-mechanism-convergence@@

Read the table column-wise and most of the manual collapses onto the **energy/redox** core:

- **Energy (chemiosmosis / proton-motive force):** Zone 2, HIIT, cold (UCP1 uncoupling), fasting (AMPK),
  creatine (PCr shuttle), metformin. This is the spine the mitochondria thread
  (`thread-mitochondria.md`) calls "the single object every other domain reaches up to."
- **Redox (electron flow / ROS-as-signal):** every hormetic stressor (exercise, cold, heat, fasting),
  polyphenols via NRF2, NAD⁺. The NAD/redox thread (`thread-nad-redox.md`) and the hormesis thread
  (`thread-hormesis.md`) are *facets of one redox-bioenergetics core* — transient ROS at the
  mitochondrion is the shared engine under all four classic stressors.
- **Proteostasis (folding/chaperoning/recycling):** heat (HSP70), fasting/rapamycin (autophagy), sleep
  (glymphatic clearance). The "loss of proteostasis" and "disabled macroautophagy" hallmarks
  (`B-aging-mechanisms.md` §0, §3) are this layer's aging readout.
- **Signaling (nutrient sensors / hormones / cytokines as information):** mTORC1 (protein, resistance
  training, rapamycin), AMPK (fasting, metformin), myokines, incretins (GLP-1), inflammaging cytokines.
- **Membrane (bilayers / ion gradients / allostery):** omega-3 phospholipid remodeling, Bohr-effect gas
  exchange, baroreflex excitability, apoB/LDL in the arterial wall.
- **Epigenetic (chromatin / clock-gene transcription):** circadian light (BMAL1/CLOCK/PER/CRY), BHB→HDAC
  inhibition, partial reprogramming.

That convergence is *why* the threads exist and why the Bucket canon treats bioenergetics, redox, and
proteostasis as **foundation-tier** candidates rather than outcome-tier curiosities: the same handful of
physical principles is what exercise, fasting, cold, heat, and aging itself all operate through.

---

## 12.3 — Narrative deep-dives (the highest-value chains)

### 12.3.1 — Aerobic training → PGC-1α → mitochondrial biogenesis `[mechanism: established]`

This is the cleanest interventional mechanism chain in the entire manual, and the one place the
biophysical foundation has a direct human handle. When muscle contracts repeatedly at a sustainable
intensity, three proximate signals accumulate: **Ca²⁺ transients** from each contraction, a falling
**energy charge** (rising AMP:ATP, sensed by AMPK), and a **transient ROS** pulse from working
mitochondria. All three converge on **PGC-1α**, the master transcriptional co-activator of
mitochondrial biogenesis. PGC-1α co-activates NRF1/NRF2 and the mitochondrial transcription factor
**TFAM**, which together build new electron-transport-chain complexes and replicate mtDNA — literally
adding cristae surface area. More cristae means more **proton-motive capacity**: Mitchell's chemiosmotic
gradient (canon `05-biophysics`) gets more machinery pumping across it, so the muscle can regenerate ATP
oxidatively at a higher absolute rate. Downstream, that shows up as higher fat oxidation at a given
workload, lower lactate production (the "metabolic flexibility" of `lactate-threshold-metabolic-
flexibility-zone2`), and a higher VO₂max — which, integrated over the whole body, *is* mitochondrial
capacity expressed as a single number.

Holloszy's 1967 result (`exercise-mitochondrial-biogenesis-holloszy`) — endurance training roughly
doubles muscle mitochondrial enzyme content — is mechanistically certain and reproducible. **The honest
seam is the last rung.** VO₂max is the strongest mortality predictor in preventive medicine
(`crf-vo2max-strongest-mortality-predictor`), but that link is `cohort`/`meta`, not `rct`: you cannot
randomize people to decades of fitness, and fitness partly *reflects* underlying health (reverse
causation). So the chain is `[mechanism: established]` for biogenesis and `[partial]` for the jump to
mortality. (Note also `conflict-zone2-optimal-mito`: the claim that Zone 2 is *uniquely* optimal is an
over-extrapolation — HIIT drives strong biogenesis too.)

### 12.3.2 — Resistance training → mechanotransduction → mTORC1 → protein synthesis `[mechanism: established]`

Lifting is information, not just damage. Mechanical tension on a muscle fiber is sensed by
**mechanotransduction** machinery — integrins and focal-adhesion kinase at the cell membrane, titin
strain within the sarcomere — and converted into a biochemical signal that, together with a rise in
intracellular **leucine**, activates **mTORC1** at the lysosomal surface. Active mTORC1 phosphorylates
p70S6K and 4E-BP1, releasing the brakes on **ribosomal translation**, and the cell ramps up
**myofibrillar protein synthesis** — building the contractile apparatus itself. This is the `signaling`
layer in its purest form: a physical force is transduced into a transcription/translation decision.
Pedersen & Febbraio's "muscle as an endocrine organ" adds a parallel branch — contraction also secretes
**myokines** (`muscle-endocrine-organ-myokines`) that carry an anti-inflammatory signal to distant
tissues, the mechanistic basis for exercise lowering systemic inflammation (`thread-inflammation.md`).

The mechanism is established; the *outcome* shows the manual's recurring shape. Muscle-strengthening
activity lowers all-cause mortality ~10–17% (`resistance-training-mortality-meta`) — but with a
**J-shaped dose-response peaking at ~30–60 min/week** (more is not better, an often-omitted nuance), and
the data are `meta` of cohorts, not interventional mortality trials. And note the **cross-stressor
interference** the hormesis thread flags: endurance work can blunt strength gains via AMPK antagonizing
mTOR (`conflict-concurrent-interference`), so two "good" stressors are not simply additive.

### 12.3.3 — Protein/leucine → mTORC1, and the age-dependent longevity tradeoff `[mechanism: established / partial]`

The *same* mTORC1 node that builds muscle is the node longevity biology wants to **suppress**. This is
the manual's sharpest illustration that "a mechanism is not a verdict." Leucine is sensed by Sestrin2 and
the Rag GTPases, which recruit and activate mTORC1; chronic high mTORC1 / IGF-1 signaling accelerates
aging in model organisms (worm *daf-2*, Solon-Biet's low-protein/high-carb mice). But the **human
cohort data are age-stratified and the sign flips**: in Levine & Longo's NHANES analysis high protein at
ages 50–65 tracked higher all-cause and cancer mortality, **but at 65+ the association reversed and
protein was protective** (`conflict-protein-mtor-longevity`). The reconciliation is not "protein good" or
"protein bad" but a genuine **mid-life cancer/IGF-1 risk ↔ late-life sarcopenia/frailty risk** tradeoff,
modulated by protein source, leucine load, and whether resistance training re-partitions that protein
toward muscle. Established mechanism; `[partial]` and *context-dependent* outcome. This is exactly why the
table tags rows 3, 5, and 21 the way it does — they all touch one signaling node whose "good direction"
depends on who and when.

### 12.3.4 — Fasting → AMPK↑ / mTOR↓ → autophagy `[mechanism: established / partial]`

When fuel falls, the energy-charge sensor **AMPK** rises (high AMP:ATP) and the nutrient sensor
**mTORC1** falls (low amino acids/insulin). Together they de-repress **ULK1**, the trigger for
**macroautophagy** — the cell's recycling program that engulfs damaged organelles (mitophagy) and
misfolded protein aggregates and returns the monomers to use. In parallel the liver shifts to
**ketogenesis**, and β-hydroxybutyrate becomes a signaling molecule in its own right
(`bhb-signaling-metabolite`): inhibiting class-I HDACs and blocking the NLRP3 inflammasome. And because
feeding is itself a peripheral-clock zeitgeber, *when* you eat aligns metabolism with the circadian
system (`thread-circadian-light.md`). The molecular chain is established and autophagy is *required*
downstream of CR and rapamycin for their longevity effects in animals (`B-aging-mechanisms.md` §3).

The seam, again, is the human outcome. CALERIE (`calerie-cr-cardiometabolic-humans`) is surrogate-only at
~12% achieved CR; and the cleanest TRE isolations (`conflict-tre-efficacy-vs-cr` — Liu NEJM 2022,
Trepanowski) show that *most* real-world time-restricted-eating benefit reduces to caloric restriction by
another route. The durable exception worth keeping is **circadian meal-timing** (early-TRF, Sutton 2018)
— a weight-independent mechanism, but tiny and short. So: `[established]` molecular chain,
`[partial]`/unproven human longevity outcome.

### 12.3.5 — Heat → HSF1 → HSP70 proteostasis, and Cold → UCP1 thermogenesis `[mechanism: established]`

The two thermal levers are mirror images that both bottom out in the same canon layers. **Heat:** a rise
in core temperature partially unfolds proteins, freeing **HSF1** to trimerize and transcribe
**heat-shock proteins (HSP70/90)** — molecular chaperones that refold or triage damaged proteins
(`heat-shock-proteins-mechanism`). That is the **proteostasis** layer directly — the same layer whose
decline is a Hallmark of Aging. **Cold:** skin thermoreceptors drive a sympathetic **norepinephrine**
surge (~+530%, `cold-norepinephrine-thermogenesis-mechanism`) that acts on β3-adrenergic receptors in
brown adipose tissue, activating **UCP1** — a protein that deliberately *uncouples* the proton gradient
from ATP synthase, dissipating the proton-motive force as heat (non-shivering thermogenesis). That is
the **energy** layer — Mitchell's chemiosmosis run in reverse-purpose — plus a redox/**mitohormesis**
component from the transient ROS.

Both adaptive programs are real and reproducible (`cold-activated-bat-adult-humans`). **The laundering
happens at the outcome rung,** and the thermal domain is where the manual says it matters most. "HSP
induction extends human healthspan" is unproven (the sauna-mortality signal is one Finnish male cohort
with healthy-user bias unexcluded, `conflict-sauna-healthy-user`). And cold shows a **protocol mismatch**:
the protocol with actual outcome data is *prolonged mild* cold (Hanssen's 10-day insulin-sensitivity RCT,
`cold-acclimation-insulin-sensitivity-t2d`), **not** the brief intense plunge that's marketed. Mechanism
established; human outcome `[partial]` and frequently mis-sold.

### 12.3.6 — Sleep → glymphatic clearance + GH pulse + synaptic homeostasis `[mechanism: established / partial]`

Deep NREM sleep is not passive. During slow-wave activity the brain's interstitial space expands and
**glymphatic** flow — paravascular cerebrospinal-fluid exchange gated by astrocytic **aquaporin-4**
water channels — accelerates the clearance of metabolic waste including amyloid-β
(`glymphatic-clearance-sleep`; the human amyloid link `sleep-deprivation-amyloid-human`). This is a
**proteostasis** function at the organ scale: the same "clear the garbage" imperative that autophagy
serves intracellularly. In parallel, the largest **growth-hormone** secretory pulse of the day rides
early slow-wave sleep (anabolic/repair signaling), and **synaptic homeostasis** downscales the
connections potentiated during waking — restoring signal-to-noise. The endocrine and synaptic arms are
well established; the human glymphatic chain is strong but still partly `mechanistic` (much of the
foundational glymphatic work is rodent). `[established]` for GH/synaptic, `[partial]` for human
glymphatic magnitude.

### 12.3.7 — Light → melanopsin → SCN → BMAL1/CLOCK/PER/CRY `[mechanism: established]`

This is the chain where mainstream chronobiology and the corpus's heavy Kruse layer **agree** — the most
important agreement in the manual (`thread-circadian-light.md`). Short-wavelength photons strike
**melanopsin**-expressing intrinsically-photosensitive retinal ganglion cells (ipRGCs), which signal via
the retinohypothalamic tract to the **suprachiasmatic nucleus (SCN)**, the master clock. Inside SCN
neurons the **BMAL1/CLOCK** heterodimer drives transcription of **PER/CRY**, which feed back to inhibit
their own activators — a ~24-hour transcription-translation feedback loop (the **epigenetic** layer
expressed as timed gene expression). The SCN's phase then sets melatonin onset, the cortisol awakening
response, and the timing of peripheral clocks in liver/muscle/fat — which is *why* meal timing has a
metabolic effect independent of calories (`etrf-insulin-sensitivity-weight-independent`).

The melanopsin→SCN→melatonin spine is settled human science (`light-melatonin-action-spectrum`,
`room-light-melatonin-suppression`) — so the *core* of the Kruse circadian thesis is independently
validated and genuinely citeable. **Where it diverges:** Kruse's claims of sunlight's *causal primacy
over food*, of broad UV/IR systemic therapy, and of non-native-EMF disruption *exceed* the evidence tier
(`speculative`); and the consumer **blue-blocking-glasses product** is not validated (Cochrane 2023 found
no clear benefit, `conflict-blue-blocking-glasses`) even though the underlying mechanism — evening blue
light suppresses melatonin — is real. The supported lever is behavioral light timing, not the eyewear.

### 12.3.8 — Polyphenols → NRF2/ARE, and why antioxidants can *blunt* adaptation `[mechanism: established]`

This pair is the manual's best teaching case for **redox-as-signal**, the resolved correct frame of the
old free-radical theory. Hormetic plant compounds (sulforaphane is the cleanest example,
`rp-sulforaphane-mechanism`) act not as direct radical scavengers but as mild electrophilic stressors —
**xenohormesis.** They oxidize cysteine residues on Keap1, releasing **NRF2** to translocate to the
nucleus and bind the **antioxidant-response element (ARE)**, inducing the cell's *own* phase-II and
glutathione machinery. The defense is endogenous and adaptive — a hormetic up-regulation, not a chemical
mop. That is robust **mechanism**; the clinical longevity outcome is unproven, and the flagship "direct
SIRT1 activator" resveratrol story collapsed (the in-vitro finding was a fluorophore artifact;
human-null, `resveratrol-human-null`, `sinclair-resveratrol-sirt1-contested`).

The corollary is the most counter-intuitive practical chain in the manual (table row 15). Because
exercise and cold adaptation *require* the transient ROS signal that activates PGC-1α and NRF2,
**high-dose antioxidant supplementation can blunt the training adaptation** — and antioxidant RCT
meta-analyses are null or harmful (`conflict-free-radical-theory`). "Mop up free radicals to slow aging"
is the canonical *wrong* lesson from redox biology. The mechanism here is established precisely as a
*counter*-mechanism: suppressing the signal suppresses the benefit.

### 12.3.9 — apoB/LDL & statins → HMG-CoA / LDL-receptor → atherosclerosis `[mechanism: established]`

This is the **single cleanest practice→mechanism→outcome chain in the manual** — the one place where
every rung, including the human hard endpoint, is established. Apolipoprotein-B-containing lipoproteins
(LDL and friends) are *causal* in atherosclerosis: they cross and are retained in the arterial
subendothelium, where their cholesterol cargo seeds plaque (`ldl-apob-causal-ascvd`; apoB particle count
is a better marker than LDL-C, `apob-superior-to-ldlc`). **Statins** inhibit **HMG-CoA reductase**, the
rate-limiting enzyme of hepatic cholesterol synthesis; the liver compensates by upregulating
**LDL-receptors**, which pull apoB particles out of circulation. Lower circulating apoB → less arterial
deposition → fewer cardiovascular events, and the relationship is **dose-dependent in the magnitude of
LDL lowering** across statins, ezetimibe, and PCSK9 inhibitors alike (`statin-ldl-event-dose-response`,
`pcsk9-fourier-mace`) — the convergence of *different* mechanisms on the *same* outcome via the *same*
intermediary is what makes the causal chain airtight. The "membrane" layer here is the lipoprotein/
arterial-wall interface. (`statin-side-effects-nocebo`: most reported statin intolerance is nocebo in
blinded trials — a separate, important honesty note.)

### 12.3.10 — GLP-1 agonists → incretin receptor → satiety + insulin + gastric emptying `[mechanism: established]`

The other chain where mechanism *and* hard outcome are both proven. GLP-1 receptor agonists
(semaglutide, and the dual GLP-1/GIP agonist tirzepatide) pharmacologically activate the **incretin
receptor** across three tissues: hypothalamic appetite centers (↑satiety), the gut (slowed **gastric
emptying**), and pancreatic β-cells (glucose-*dependent* insulin secretion — hence low hypoglycemia
risk). The integrated result is large weight loss with proven cardiovascular and renal hard-endpoint
benefit in RCTs (`semaglutide-step1-weight`, `semaglutide-select-cv-nondiabetic`). The honest caveat is
not in the mechanism but in body composition: appetite suppression drives **loss of lean mass alongside
fat** (`glp1-muscle-loss-caveat`), which is *why* this row cross-links to the resistance-training and
protein chains — the muscle-preserving levers are the natural pairing.

### 12.3.11 — Creatine → phosphocreatine shuttle → ATP rebuffering `[mechanism: established]`

A short, fully-established energy chain worth stating plainly. Supplemental creatine loads muscle (and
brain) creatine; via **creatine kinase**, **phosphocreatine** acts as a spatial-temporal ATP buffer,
instantly re-phosphorylating ADP back to ATP at exactly the subcellular sites where demand spikes faster
than oxidative phosphorylation can respond. That is the **energy** layer at millisecond resolution. The
outcome is well-supported for strength/power when paired with resistance training
(`creatine-strength-muscle-resistance-training`) and `[partial]` but promising for cognition under
stress or sleep deprivation (`creatine-cognition-stress-aging`). One of the few supplements where the
mechanism and a real outcome both hold up.

---

## 12.4 — Where the mechanism is OVERSOLD (the corpus's core failure mode)

Every chain above carries an honesty tag for a reason: **a real mechanism is not a proven outcome, and
the gap between them is where almost all longevity hype lives.** The manual's single most repeated
discipline — stated in `E-exercise.md`, `D-metabolic-nutrition.md`, `H-thermal.md`, `B-aging-mechanisms.md`,
and every thread — is *never launder a mechanism into an outcome.* This chapter, by making mechanisms
**pervasive and explicit**, also makes the laundering easier to catch. The worst offenders, named:

1. **NAD⁺ precursors (row 24).** The chain "NAD⁺ runs the ETC and declines with age" is `[established]`
   bedrock biochemistry. "NAD⁺ pills extend healthspan" is `[partial]` at best — they reliably raise the
   **surrogate** (blood NAD⁺ ~60%) and move **no powered human hard endpoint**
   (`conflict-nad-precursor-efficacy`). The mechanism's prestige is doing the selling. This is the
   thread's flagship case (`thread-nad-redox.md`): "a genuine foundation most aggressively laundered into
   an unproven outcome."

2. **Resveratrol / "CR-mimetic sirtuin activators."** The in-vitro direct-activation finding was a
   fluorophore assay artifact; lifespan extension does not replicate in lean mammals; human-null
   (`resveratrol-human-null`). A textbook case of foundation-prestige laundering a *failed* outcome.

3. **Antioxidant supplements.** The mechanism is real but *backwards*: high-dose antioxidants suppress
   the redox signal adaptation requires, so they **blunt** exercise/cold benefit and RCTs run
   null/harmful (`conflict-free-radical-theory`). Here the popular practice contradicts its own
   mechanism.

4. **Cold plunges.** Strong `[established]` mechanism (UCP1, norepinephrine), genuinely thin human
   outcomes, and a **protocol mismatch** — the data are on prolonged mild cold, the marketing is on brief
   intense plunges (`H-thermal.md` §3).

5. **HSP / sauna "extends lifespan."** HSP induction is real; the longevity claim rests on one
   observational male cohort with healthy-user bias unexcluded (`conflict-sauna-healthy-user`).

6. **HRV optimization.** HRV is a `[established]` readout of vagal tone but is a **biomarker, not an
   intervention** (`thread-autonomic-hrv.md`). "Raise your HRV" is not itself a validated outcome, and
   cross-person comparison is close to meaningless.

7. **CGM in the metabolically healthy.** Glucose variability is real (`mechanism`), but **no RCT** shows
   CGM in healthy people improves any hard outcome (`cgm-healthy-no-outcome-rct`).

8. **Senolytics / metformin / rapamycin for aging.** Strong-to-spectacular `animal` mechanism chains
   (rows 20, 21, 23), near-absent human longevity outcomes — explicitly `[partial]`/experimental
   (`metformin-for-aging-unproven`, `rapamycin-for-aging-experimental`, `dq-ipf-first-in-human-pilot`).

9. **The hormesis frame itself.** Useful and often `[established]` at the molecular level, but it becomes
   **unfalsifiable** when used to retro-explain *any* result ("it was hormetic"), and the beneficial-dose
   *window* for cold and heat in humans is genuinely unknown (`hormesis-unifying-frame`, tier
   `theoretical`). A frame that absorbs every outcome predicts none.

**The asymmetry to remember.** The chains where *both* mechanism and human hard outcome are established
are a short list: **statins/apoB-lowering** (row 18), **GLP-1 agonists** (row 19), and — at the
population level, observationally — **cardiorespiratory fitness** (row 1). Notice these are also the
least hyped relative to their evidence. The inverse correlation between marketing volume and
outcome-tier is not a coincidence; it is the signal. When a mechanism chain is beautiful and the product
is loud, **check the last rung** — the practice→signal→pathway→layer ladder can be flawless and the
arrow into "outcome" still be dotted.

> **One-line rule for the reader:** a mechanism tells you a lever *can* work; only the outcome tier tells
> you whether, in humans, it *does*. This chapter exists to give you the first; the rest of the manual
> guards the second.

---

## Cross-links

- **UP to canon (`bucket-canon/05-biophysics/`):** chemiosmosis/proton-motive force (Mitchell), redox &
  submolecular biology (Szent-Györgyi), excitability/baroreflex (Hodgkin–Huxley), endosymbiosis
  (Margulis), proton-gradient origin of life (Lane/Martin), mtDNA second genome (Wallace),
  hemoglobin allostery / Bohr effect, melanopsin non-visual photoreception.
- **Threads:** `thread-mitochondria.md` (energy spine), `thread-nad-redox.md` (redox + the supplement
  reality check), `thread-hormesis.md` (the dose-of-stress frame), `thread-inflammation.md` (the
  integrative readout), `thread-autonomic-hrv.md` (the shared biomarker), `thread-circadian-light.md`
  (light → clock).
- **Domains:** `E-exercise.md`, `H-thermal.md`, `G-breath.md`, `D-metabolic-nutrition.md`,
  `B-aging-mechanisms.md`, `I-sleep-circadian.md`; pharma/supplement anchors in `S-pharma-claims.json`,
  `P-clinical-claims.json`, `D2-supplements-claims.json`, `R-exposures-claims.json`.
- **Sibling sections:** `02-training.md`, `03-nutrition-supplements.md`, `07-clinical-prevention.md`,
  `08-brain-cognitive.md`, `10-medical-pharmacology.md`, `11-body-systems.md`.
- **Foundations (pending):** when `01-foundations.md` is written, repoint the `→ canon 05-biophysics`
  pointers in §12.0 and the table to its section anchors, and demote the foundations-vocabulary glossary
  in §12.0 to a cross-reference.
