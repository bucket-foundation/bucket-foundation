# 46 — Practitioner Claims vs. the Evidence (the claim-checker)

Every other section grades the *science*. This one grades the **people who sell the science** — the
podcasters, clinicians, and scientists whose YouTube reach is, for most of the public, the actual
interface to longevity research. The job is not to praise or dunk. It is to score how well each voice's
*high-confidence public claims* track the corpus's honest tiering, and to make the failure modes legible
so a reader can do this triage themselves.

_Not medical advice. This chapter scores public claims against the book's graded claim-sets; the raw
cluster-by-cluster cross-checks are linked at the end._

> **Bottom line:** The field's dividing line is calibration, not correctness. Almost nobody contradicts
> the corpus on the boring core (fitness, sleep, strength); flat contradictions are ~8% of claims, while
> overstatement ≈ agreement (~37% each). Jump to the **Calibration Spectrum** (the ranking) and the
> **five-question filter** at the end.

This chapter runs on the corpus's three standing honesty rules:

1. **Predictor ≠ lever.** A biomarker that predicts death is not automatically something that, when changed,
   prevents death.
2. **Cohort ≠ RCT** (a randomized controlled trial, the strongest evidence tier)**.** You can't randomize
   fitness/sleep/sauna over decades, so healthy-user and reverse-causation bias inflate the strong-looking
   numbers.
3. **Mechanism / mouse ≠ human outcome.** "It activates SIRT1 (a longevity-linked enzyme) / raises NAD+
   (a cell-energy molecule) / spikes dopamine 250%" is a
   *mechanism* claim. "It makes you live longer / happier / leaner" is an *outcome* claim. Almost all hype
   lives in the quiet upgrade from the first to the second.

And the governing provenance rule: **a practitioner's name attached to a claim is provenance,
not evidence.** We grade the underlying claim against its primary source, then note who relayed it.

## Method, and its honest limits

Six parallel YouTube cross-check waves ran on 2026-06-29, one per practitioner cluster. Across them,
**~98 transcripts** were pulled and **~139 headline claims** were hand-extracted and graded against the
**1,019-claim corpus** on a four-point scale:[^method-tools]

- **AGREES** — the claim matches a graded corpus claim at its stated strength.
- **OVERSTATED** — there is a real kernel (a genuine mechanism, cohort, or acute effect), but the
  confidence, effect size, or dose claimed exceeds the evidence tier.
- **CONTRADICTS** — higher-tier corpus evidence runs the other way.
- **NOT-YET-IN-CORPUS** — plausible or notable, but no graded corpus claim exists yet (an intake candidate).

| Cluster | Practitioners | Transcripts | Claims graded |
|---|---|---|---|
| Attia | Peter Attia (*The Drive*) | 19 (1 failed) | 22 |
| Huberman | Andrew Huberman (Huberman Lab) | 18 | 22 |
| Rhonda + Galpin | Rhonda Patrick (FoundMyFitness), Andy Galpin | 16 | 24 |
| Longevity scientists | Kaeberlein, Sinclair, Levine, Horvath, Barzilai, Verdin, Gladyshev | 17 | 24 |
| Metabolic & N=1 | Bryan Johnson, Casey Means, Lustig, Bikman, Taubes | 16 | 22 |
| Movement / strength / breath | Starrett, McGill, Pavel, Ido, McKeown, Wim Hof | 12 | 25 |

**Limits, stated up front.** This is a *sample*, not a census. Transcripts were chosen for signal and
constrained by YouTube rate-limiting (a meaningful fraction of target videos failed to pull and were
covered by sibling episodes, not independently verified). Headline claims were **hand-extracted** by
reading transcripts.[^method-miner] Verdicts are one analyst's mapping; a different reader would split
some borderline calls differently. **This page adds no new evidence** — every verdict resolves to an
already-graded claim or conflict. It is triage, not adjudication.

## The Calibration Spectrum (the headline finding)

The single most useful output of the six waves is a **ranking** — from the voices whose public claims
track the corpus most tightly to the ones whose slogans most outrun it. The pattern is clean, and it's this
chapter's headline: **what separates the field is calibration.** Almost nobody in the
sample says things the corpus flatly refutes on the *boring core* (fitness, strength, sleep, movement).
They diverge on the *optimization margin* and the *commercial frontier* — and there, the spread is enormous.

@@FIG:07-calibration-spectrum@@

Counts below are per the six raw files (some claims carry split verdicts; counted by dominant verdict).

| Rank | Voice (cluster) | Agree | Overstate | Contradict | One-line verdict |
|---|---|---|---|---|---|
| 1 | **Andy Galpin** (Rhonda+Galpin) | ~9 | ~2 | 0 | The most corpus-aligned voice in any wave — strength/creatine/protein claims map to `REAL`-graded entries; hydration heuristic is practitioner-tier[^cal-galpin]; already cited by name.[^cal-galpin] |
| 2 | **Matt Kaeberlein** (longevity-sci) | 5 | 0 | 0 | The in-field validator: a geroscientist who runs the gold-standard testbeds and *refuses to overclaim*. The anti-Sinclair. |
| 3 | **Clock-builders** — Levine / Horvath / Gladyshev | ~7 | ~2 | 0 | The people who *build* the epigenetic clocks are more cautious about them than the people who *sell* them. |
| 4 | **Peter Attia** (Attia) | 12 | 6 | 0 | Core stack *is* the Tier-A levers; errors cluster in the biohacking margin (CGM — continuous glucose monitor, rapamycin, protein dose); demonstrably updates toward evidence (dropped metformin & heavy fasting). |
| 5 | **Rhonda Patrick** (Rhonda+Galpin) | 13 | 8 | 0 | Right answers, oversold confidence. The honest end of the influencer spectrum; her misses are pure predictor→lever (omega-3 index, vitamin D). |
| 6 | **Andrew Huberman** (Huberman) | 6 | 11 | 0 | Mechanism-right, effect-overstated — the laundering archetype. Contradicts the corpus almost nowhere (0/22), miscalibrates it constantly (~11/22). |
| 7 | **Movement/breath cluster** — Starrett, McGill, Pavel, Ido, McKeown | 9 | 9 | 3 | Boring core (move more, train strength, breathe nasally) is gold; the *branded* layer (slogans, proprietary scores, "fascia release," posture-causes-pain) skis out over the evidence. |
| 8 | **Lustig / Bikman** (metabolic) | low | high | several | Real mechanism (fructose→NAFLD; insulin resistance is a genuine marker) inflated into monocausal "it's all insulin / sugar is a toxin" laws. |
| 9 | **Wim Hof** (movement/breath) | — | high | 1 (safety) | One striking endotoxemia RCT, bundled and small; the metabolic/longevity sell rides on the wrong cold dose; ⚠️ dangerous in/near water. |
| 10 | **Casey Means** (metabolic) | 2 | high | yes | A real personalization signal (glycemic response is individual) and a useful tool for dysglycemia, oversold as universal optimization for the healthy. |
| 11 | **Bryan Johnson** (metabolic/N=1) | 1 | high | 1 | One honest data point (he discontinued rapamycin) wrapped in unfalsifiable N=1 (single-person) marketing graded against unvalidated clocks. |
| 12 | **Gary Taubes** (metabolic) | 0 | some | many | The strong-form carbohydrate-insulin model — contradicted by isocaloric controlled-feeding data; the surviving kernel is about appetite, not thermodynamics. |
| 13 | **David Sinclair** (longevity-sci) | 0 | most | 1 | The corpus's canonical "mechanism sold as outcome." Every headline claim is a real mechanism or animal result wearing a human outcome's clothes. |

**Consolidated tallies across all six waves (~139 claims):** AGREES ~52, OVERSTATED ~52,
CONTRADICTS ~11, NOT-YET-IN-CORPUS ~21.

@@FIG:26-verdict-donut@@

The shape is the story. **Flat contradictions are rare (~8%)** — and they concentrate almost entirely in
three clusters (metabolic/N=1, the Sinclair line, and the branded movement layer). **Overstatement is as common as agreement (~37% each)** — the
modal failure across the entire sample is *rounding up* — taking something real and
narrating it one tier more confident than it has earned. Almost nobody is lying. And **~15% of claims point at genuine gaps** the
corpus should fill — the practitioners are net-additive even where they're miscalibrated.

## The two universal failure modes

Strip away the topics and nearly every OVERSTATED / CONTRADICTS verdict in all six files reduces to one of
exactly **two** moves. They are the same two the State of the Field names. Learn these two and you can
de-risk a health podcast in real time.

### Failure mode 1 — predictor → lever

*"This marker predicts death, so raising/lowering it will prevent death."* The marker is a real risk
predictor; the inference that **moving it is therapeutic** is unproven (and sometimes refuted by the very
RCT that moved it).

| Claim (who) | The predictor is real… | …but the lever is unproven |
|---|---|---|
| Omega-3 index → +5 yr life (Patrick)[^fm1-omega3] | low index tracks higher mortality | VITAL was null at 1 g/d in the replete |
| "Take 5,000 IU vitamin D, deficiency causes disease" (Patrick)[^fm1-vitd] | low 25-OH-D tracks worse outcomes | raising it in the replete moved nothing |
| CGM glucose "spikes" damage healthy people (Means)[^fm1-cgm] | variability is measurable & individual | no outcome RCT in non-diabetics; sensors disagree |
| "My clock dropped, the protocol works" (Johnson, Sinclair)[^fm1-clocks] | clocks predict at the population level | not a validated *surrogate*; clocks disagree, poor test-retest |
| VO₂max (an aerobic-fitness score) spoken of as a pure causal lever (Attia, Galpin)[^fm1-vo2max] | strongest mortality *predictor* in the corpus | cohort-tier; reverse-causation inflates magnitude |

### Failure mode 2 — mechanism → outcome

*"It triggers this real biological mechanism (in a cell, a mouse, or an acute blood draw), therefore it
delivers this human outcome."* The mechanism is genuine and often beautifully cited; the outcome leap is
the unearned part.

| Claim (who) | Real mechanism / acute / animal result | The unearned outcome |
|---|---|---|
| **Cold for dopamine** (Huberman)[^fm2-cold] | +250% dopamine, +530% NE (noradrenaline) acutely (Šrámek 2000) | "durable mood / focus / resilience / longevity" |
| Resveratrol "CR (calorie-restriction) mimetic, extends lifespan" (Sinclair)[^fm2-resv] | in-vitro SIRT1 activation | was a **fluorophore assay artifact**; no extension in lean animals |
| NMN/NR (NAD+ precursor supplements) "slows aging" (Sinclair, Verdin)[^fm2-nad] | raises NAD+ ~40–60% | only surrogates move; no hard-endpoint RCT |
| Sulforaphane "cuts cancer" (Patrick)[^fm2-sulf] | robust Nrf2 (antioxidant-pathway) induction | human hard-endpoint cancer data thin |
| Sauna acute GH (growth-hormone) spike → anabolic/recovery (Huberman)[^fm2-sauna] | transient GH rise is real | no outcome tying it to body comp/longevity |
| "Reverse aging — cells 75% younger" (Sinclair)[^fm2-reprog] | mouse optic-nerve reprogramming | not a whole-body human outcome |
| Keto "reverses insulin resistance" → longevity (Bikman)[^fm2-keto] | glycemic markers improve (real) | no hard-endpoint/longevity benefit |

### The single most-laundered claim in the whole sample

**Cold exposure raises dopamine ~250%** (Šrámek 2000) → therefore **cold plunging durably improves mood,
focus, and longevity.** This is the cleanest case in all six waves, and it is striking *because the corpus
cites the exact same numbers Huberman uses.* The corpus then says this is **"the most-laundered claim in
cold-exposure media: it is NOT 'cold improves mood/focus/longevity' as an outcome."**[^cold-launder] The
+250% is an **acute neurochemical response measured in the water**, not evidence of a durable trait change.
Huberman makes precisely the prohibited leap, and the broader cold-plunge economy is built on it. The
dose-laundering twin: the only human *metabolic* cold outcome used **prolonged mild cold (hours at
14–15°C)**, not the brief plunge being sold — so even the metabolic version is the right result attached to
the wrong dose.[^cold-dose]

## The hard contradictions (consolidated)

These are the ~11 claims where higher-tier corpus evidence runs the *other way* — not "unproven" but
"the data point against it." They cluster, as the spectrum predicts, in the metabolic/N=1 cluster, the
Sinclair line, and the branded movement layer.

| # | Contradicted claim | Who | Loses to |
|---|---|---|---|
| 1 | Resveratrol *directly* activates SIRT1 & extends mammalian lifespan | Sinclair | in-vitro activation = fluorophore artifact; no lean-animal extension[^hc-resv] |
| 2 | Everyone, including the metabolically healthy, benefits from a CGM | Means | no non-diabetic outcome RCT[^hc-cgm] |
| 3 | **Carbohydrate-insulin model (strong form):** carbs→insulin→fat storage *causes* obesity, not energy balance | Taubes, Bikman | isocaloric controlled feeding (Hall) weighs against[^hc-cim] |
| 4 | "A calorie is not a calorie" / sugar drives disease *independent of calories* | Taubes, Lustig | isocaloric feeding holds; time-restricted and alternate-day eating match plain calorie restriction[^hc-cal] |
| 5 | Low-carb/keto is *uniquely* superior for weight loss | Taubes | matched-protein/calorie diet trials (DIETFITS-class) show parity[^hc-keto] |
| 6 | N=1 Blueprint results generalize; others should adopt the protocol | Johnson | a protocol is not evidence; one person's results don't generalize[^hc-n1] |
| 7 | Posture causes pain / "neutral spine at all times" prevents it | movement cluster | population posture variants largely *not* associated with pain[^hc-posture] |
| 8 | Mobility / stretching / soft-tissue work **prevents injury** | Starrett (mobility side) | a replicated negative; foam-rolling is acute range-of-motion, not "fascia release"[^hc-stretch] |
| 9 | Static stretching before lifting is a necessary warm-up | movement cluster | long-hold static stretch *transiently reduces* strength/power[^hc-static] |
| 10 | Wim Hof breathing is safe to practice anywhere | Wim Hof | ⚠️ hyperventilation is dangerous in/near water (hypoxic blackout)[^hc-whm] |
| 11 | Seed oils / linoleic acid drive chronic disease | Lustig-adjacent | RCTs show no CHD-mortality harm; replacing saturated fat with linoleic acid lowers CHD[^hc-seedoil] |

A twelfth, bordering: Sinclair's **"we can reverse aging of the whole body / cells 75% younger"** is graded
OVERSTATED but borders CONTRADICTS for humans, because it rests entirely on a mouse optic-nerve result and
clock readouts that are not validated surrogates.[^hc-twelfth]

## Where the practitioners are RIGHT and corpus-additive

The NOT-YET-IN-CORPUS column is where the practitioners are *ahead* of the
corpus — real claims the index hasn't graded yet. It's a credit column, not a demerit one. These are the promote-worthy leads (the
highest-value ten are captured as graded stubs in the practitioner claim-set):

| Lead | Who surfaced it | Why it's promote-worthy |
|---|---|---|
| **UPF (ultra-processed food) drives overconsumption** (Hall 2019 inpatient RCT, +~500 kcal/day at matched macros) | Lustig | A genuine **RCT** — one of the few clean experimental results in nutrition; arguably Lustig's single best claim, and the corpus has no graded D-claim for it. |
| **Omega-3 ↔ slower biological aging** (DO-HEALTH; omega-3 index) | Patrick, Attia | DO-HEALTH's falls/infection RCT signal is real; the omega-3→epigenetic-aging link is a contemporary lead worth a graded entry (under the clock caveat). |
| **Fructose → uric acid → hypertension/metabolic syndrome** (R. Johnson hypothesis) | Lustig | Mechanistically specific, testable, currently ungraded. |
| **Søberg cold dose: ~11 min/week, "end on cold"** | Huberman/Søberg | A specific, falsifiable dose heuristic for BAT (brown-fat) recruitment; usable even if the outcome is unproven. |
| **Caffeine timing: delay 90–120 min after waking** | Huberman | A clean hypothesis (adenosine clearance) with no RCT yet — exactly the kind of testable protocol the corpus should track. |
| **Bruce Ames "triage theory" / longevity vitamins** | Patrick/Ames | A coherent micronutrient hypothesis absent from the corpus; multivitamin-in-replete data is the skeptic baseline to grade it against. |
| **Sit-to-rise / floor-transfer test as mortality predictor** (Brito) | Starrett | A functional predictor that would slot beside gait/grip; currently ungraded. |
| **CD38 (NADase) drives age-related NAD+ decline** (Chini) | Verdin | A mechanistic lead that pairs with the corpus's NAD-decline entry.[^lead-cd38] |
| **Dog Aging Project: rapamycin improves canine cardiac function** | Kaeberlein | A companion-dog translational model — better than mice, ungraded. |
| **Hispanic mortality paradox / slower epigenetic aging** | Horvath | A population-specific epigenetic-aging finding; a new lead. |

The pattern: the practitioners are **net-additive at the frontier** even when miscalibrated in the
mainstream. The same people who overstate cold-for-dopamine are the ones surfacing Hall 2019 and the Søberg
dose. Mine them for *pointers*; grade the *source*.

## Kaeberlein as the anti-Sinclair

The two longevity scientists bracket the field's entire rigor gradient, and putting them side by side is the
clearest single illustration of this chapter's thesis.

| | **Matt Kaeberlein** | **David Sinclair** |
|---|---|---|
| On NAD precursors | "the science hasn't backed the claims"; flags a *harm* signal | personal stack includes ~1 g NR; "slows aging" |
| On rapamycin | "strongest mouse drug, unknown human dose, I'm a skeptic" — *then runs the RCT* | — |
| On metformin for aging | "I don't know if it works" | (Barzilai-adjacent; TAME will "prove" it) |
| On supplements broadly | "mostly scams / we just don't know" | sells the stack |
| Resveratrol | — | "direct SIRT1 activator, CR mimetic" (the corpus's one outright CONTRADICTS) |
| Commercial COI (conflict of interest) | runs academic testbeds + Dog Aging Project | Sirtris/GSK, InsideTracker, Athletic Greens, affiliate links |
| Corpus verdict | **5 claims, all AGREES** — the in-field embodiment of the three honesty rules | **6 claims: 0 agree, mostly OVERSTATED, 1 CONTRADICTS** — the canonical mechanism-sold-as-outcome case |

Kaeberlein is the corpus's natural **external validator**: an in-field geroscientist landing exactly where
the honest grades already are raises confidence they're calibrated, not merely contrarian. Sinclair is the
opposite pole — real science *narrated past its evidence tier*, with a dense commercial COI as the
mechanism by which the laundering gap is monetized. **When the toolmaker is more cautious than the
marketer, grade with the toolmaker.**

## Practical takeaway — how to listen to a health podcast

You do not need the corpus open to run this. Five questions, applied to any claim in real time, catch the
overwhelming majority of overstatement in this entire sample:

1. **Is this a mechanism or an outcome?** "It activates / raises / spikes X" is a *mechanism*. "It makes you
   live longer / leaner / happier" is an *outcome*. A mechanism never licenses an outcome on its own. (The
   single biggest filter — failure mode 2.)
2. **Is this a predictor or a lever?** "People with high X live longer" (predictor) is *not* "raising X
   makes you live longer" (lever). Ask whether the RCT that *moved* the marker actually moved the outcome.
   (Often it was run, and came back null — failure mode 1.)
3. **Does the dose match the studied dose?** Cold for metabolism used *hours* of mild cold, not a 3-minute
   plunge. Sauna mortality came from *traditional* saunas 4–7×/week, not an infrared cabin. If the protocol
   being sold isn't the protocol that was studied, the evidence doesn't transfer.
4. **What's the sponsor?** Disclosed advertising is not disqualifying, but commercial incentives align with
   the over-claiming *direction* (supplements, wearables, gadgets, clocks). When the recommendation happens
   to be the thing the speaker sells, raise your skepticism a notch. (Provenance, not evidence — but it
   explains the lean.)
5. **Does the confidence match the evidence tier?** "Mouse," "one cohort," "acute blood draw," and "n=1"
   are not "proven." If the certainty in the voice exceeds `cohort` / `mechanism` / `animal`, the gap between
   how sure they sound and how sure the data is *is* the overstatement.

And the meta-rule that makes all five work: **the boring core is almost always right; the branded frontier
is where evidence gets out over its skis.** Don't smoke; build and keep VO2max and strength; move more;
sleep ~7h; keep apoB/LDL (cholesterol-carrying particles) low; protect a healthy metabolic profile and your relationships. Every voice in
this sample agrees on that. They diverge — and the spectrum above ranks them — on everything sold *past* it.

---

### Go deeper

The six raw cross-check files, one per cluster, with full claim-by-claim tables, the verdict for every
headline claim, the resolving claim-ids, and the list of transcripts pulled (and which failed):

- `_intake-raw/yt-wave/attia-claims-vs-evidence.md` — Peter Attia / *The Drive* (19 transcripts, 22 claims)
- `_intake-raw/yt-wave/huberman-claims-vs-evidence.md` — Andrew Huberman (18 transcripts, 22 claims)
- `_intake-raw/yt-wave/rhonda-galpin-claims-vs-evidence.md` — Rhonda Patrick + Andy Galpin (16, 24)
- `_intake-raw/yt-wave/longevity-sci-claims-vs-evidence.md` — Kaeberlein, Sinclair, Levine, Horvath, Barzilai, Verdin, Gladyshev (17, 24)
- `_intake-raw/yt-wave/metabolic-n1-claims-vs-evidence.md` — Bryan Johnson, Casey Means, Lustig, Bikman, Taubes (16, 22)
- `_intake-raw/yt-wave/movement-breath-claims-vs-evidence.md` — Starrett, McGill, Pavel, Ido, McKeown, Wim Hof (12, 25)

[^method-tools]: Transcripts pulled with `agf-yt` and mined with `agf-yt-mine`. Graded claims live in the domain claim-sets (`02-domains/*-claims.json`); conflicts in `06-evidence/CONFLICTS.md`. This wave produced two new first-class objects: `conflict-carbohydrate-insulin-model` and ten promote-worthy graded stubs in the practitioner claim-set. No new evidence is added; verdicts resolve to already-graded claims and converge on re-runs.

[^method-miner]: The regex miner (`agf-yt-mine`) is tuned for the Kruse biophysics corpus and produced mostly false-positive concept matches outside it, so its value here was the people/name list, not claim detection.

[^cal-galpin]: claim: galpin-hydration-heuristic.

[^fm1-omega3]: claims: omega3-index-predictor-not-proven-lever, omega3-cvd-events-equivocal.

[^fm1-vitd]: claims: vitamin-d-null-in-replete-VITAL vs vitamin-d-real-in-deficiency.

[^fm1-cgm]: claims: cgm-healthy-no-outcome-rct, glucotypes-cgm-nondiabetic-variability, conflict-cgm-healthy-utility.

[^fm1-clocks]: claims: biological-age-tests-not-validated-surrogate, conflict-which-clock-is-valid.

[^fm1-vo2max]: claims: crf-vo2max-strongest-mortality-predictor, vo2max-gold-standard-clinical-vital-sign.

[^fm2-cold]: claim: cold-norepinephrine-thermogenesis-mechanism.

[^fm2-resv]: claim: conflict-resveratrol-sirtuin.

[^fm2-nad]: claims: nad-precursor-nr-human-surrogate, conflict-nad-precursor-efficacy.

[^fm2-sulf]: claim: rp-sulforaphane-mechanism.

[^fm2-sauna]: claims: heat-shock-proteins-mechanism, sauna-cardiovascular-physiology.

[^fm2-reprog]: claims: reprogramming-vision-lu-2020, partial-reprogramming-ocampo-2016.

[^fm2-keto]: claims: ketogenic-diet-mouse-longevity, bhb-signaling-metabolite.

[^cold-launder]: claim: cold-norepinephrine-thermogenesis-mechanism.

[^cold-dose]: claim: cold-acclimation-insulin-sensitivity-t2d.

[^hc-resv]: claim: conflict-resveratrol-sirtuin.

[^hc-cgm]: claims: cgm-healthy-no-outcome-rct, conflict-cgm-healthy-utility.

[^hc-cim]: claim: conflict-carbohydrate-insulin-model (new this wave).

[^hc-cal]: claims: tre-adds-nothing-to-cr-nejm, adf-not-superior-to-cr.

[^hc-keto]: claim: tre-treat-null-weight-loss (DIETFITS-class parity).

[^hc-n1]: claims: n-of-1-self-tracking-epistemics, protocol-not-evidence-axiom.

[^hc-posture]: claim: posture-does-not-cause-pain-simply.

[^hc-stretch]: claims: stretching-does-not-prevent-injury, foam-rolling-acute-rom-not-fascia-release.

[^hc-static]: conflict #8 (static-stretch).

[^hc-whm]: cross-ref: 01-STATE-OF-THE-FIELD §3 (WHM hyperventilation).

[^hc-seedoil]: claims: linoleic-acid-rct-no-chd-mortality-benefit, pufa-replacement-reduces-chd-meta, omega6-cochrane-little-or-no-effect, conflict-seed-oils-linoleic-acid.

[^hc-twelfth]: claims: reprogramming-vision-lu-2020, conflict-which-clock-is-valid.

[^lead-cd38]: claim: sirtuins-nad-decline.
