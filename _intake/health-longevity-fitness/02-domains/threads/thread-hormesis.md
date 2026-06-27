# Thread — Hormesis (the dose-of-stress frame)

> **Status:** v0.1 (Wave 1 cross-cut) — 2026-06-27. Connective tissue, not a domain.
> Weaves graded claims that already live in domains D, E, G, H by reference — it does not
> re-derive them. Read each cited claim in its home `*-claims.json` for tier + provenance.
> **One rule inherited from the map:** hormesis is a *mechanism/framework* tag, almost never an
> *outcome*. Where it is used to predict a hard human endpoint, it is `theoretical` until a
> primary derivation or RCT says otherwise.

## What connects
A single shape recurs across four otherwise-unrelated stressors: a **sub-damaging dose of stress
triggers an adaptive program that leaves the system net-better; an excess harms.** The biphasic
(inverted-U / J-shaped) dose-response is the unifying object. It appears as:

- **Thermal (H):** cold → norepinephrine + BAT/UCP1 thermogenic remodeling; heat → HSP70/90
  proteostasis. Hormesis is named explicitly as the frame (`hormesis-unifying-frame`,
  `heat-shock-proteins-mechanism`, `cold-norepinephrine-thermogenesis-mechanism`,
  `cold-activated-bat-adult-humans`).
- **Exercise (E):** training is the best-evidenced hormetic stressor — transient ROS + mechanical
  load drive mitochondrial biogenesis and myokine signaling
  (`exercise-mitochondrial-biogenesis-holloszy`, `muscle-endocrine-organ-myokines`). The
  J-shaped dose-response of resistance training (`resistance-training-mortality-meta`, benefit
  peaking ~30–60 min/wk, *more is not better*) is hormesis made quantitative.
- **Fasting / nutrition (D):** the metabolic switch + cellular-stress-response rationale
  (`if-metabolic-switching-mechanism`, `fmd-mouse-healthspan-lifespan`,
  `bhb-signaling-metabolite`) is a hormesis story; so is CR (`cr-conserved-lifespan-extension`).
- **Breath / hypoxia (G):** voluntary hyperventilation + breath-hold (Wim Hof) is an
  intermittent-hypoxia/hypercapnia + adrenaline stressor
  (`wim-hof-voluntary-sns-immune-attenuation`, `wim-hof-lactate-mediated-antiinflammatory`).
  CO2-tolerance training (`bohr-effect-co2-tolerance`) is an adjacent dose-of-stress idea.

The biophysical engine under all four is the same: **transient ROS / redox signaling at the
mitochondrion** (mitohormesis) — the UP-link to `bucket-canon/05-biophysics/` (redox, electron
transport) and the shared root with `thread-mitochondria.md` and `thread-nad-redox.md`.

## Spanned claim ids
H: `hormesis-unifying-frame`, `heat-shock-proteins-mechanism`,
`cold-norepinephrine-thermogenesis-mechanism`, `cold-activated-bat-adult-humans`,
`cold-acclimation-insulin-sensitivity-t2d`, `sauna-frequency-mortality-kihd` ·
E: `exercise-mitochondrial-biogenesis-holloszy`, `resistance-training-mortality-meta`,
`hiit-crf-cardiometabolic-meta`, `muscle-endocrine-organ-myokines` ·
D: `if-metabolic-switching-mechanism`, `fmd-mouse-healthspan-lifespan`,
`bhb-signaling-metabolite`, `cr-conserved-lifespan-extension` ·
G: `wim-hof-voluntary-sns-immune-attenuation`, `wim-hof-lactate-mediated-antiinflammatory`,
`bohr-effect-co2-tolerance` ·
B: `mito-dysfunction-hallmark` (the damage end of the curve).
Conflicts: `conflict-free-radical-theory`, `conflict-cold-after-resistance`,
`conflict-sauna-healthy-user`, `conflict-wim-hof-mechanism`, `conflict-zone2-optimal-mito`.

## Where it's SOLID
- **Exercise as hormesis** is the load-bearing case and the only one with a quantitative
  dose-response *and* a mechanism: transient exercise-ROS is *required* for the adaptation, and
  blanket antioxidant supplementation **blunts** training benefit. This is the cleanest empirical
  win for the whole frame.
- **Mitohormesis** (Ristow): the corollary that *low ROS are beneficial signals* is the resolved
  side of `conflict-free-radical-theory` — antioxidant RCT meta-analyses are null/harmful, which
  is direct evidence the "more antioxidant = less aging" naive model is wrong and the hormetic
  model is right.
- **HSP induction by heat** and **BAT recruitment by cold** are real, reproducible adaptive
  programs (`mechanistic`). The *adaptation* is not in doubt.

## Where it's HYPE / overstretched
- **The frame becomes unfalsifiable** when used to retro-explain any result ("it was hormetic").
  Flagged explicitly in `hormesis-unifying-frame` (tier `theoretical`). A frame that can absorb
  every outcome predicts none.
- **The beneficial-dose window is unknown for cold and heat in humans.** "Any stress is good" is
  false — the same biphasic curve that licenses the benefit guarantees a harm zone, and we don't
  know where it is for plunges/sauna. Mechanism (`cold-norepinephrine…`) is routinely laundered
  into outcome ("cold makes you healthier/sharper/live longer").
- **Stressors can interfere, not just stack.** `conflict-cold-after-resistance` (cold immersion
  right after lifting blunts hypertrophy) and `conflict-concurrent-interference` (endurance blunts
  strength via AMPK-vs-mTOR) show two "good" hormetic stressors can cancel. The frame's implicit
  additivity is wrong.
- **Wim Hof**: the effect is real but is an **acute adrenaline stress response in a bundle**
  (breath+cold+meditation), not demonstrated durable benefit, and the breathing component is not
  isolated (`conflict-wim-hof-mechanism`). Safety: never hyperventilate in water.
- **Sauna/cold outcome data**: `conflict-sauna-healthy-user` — the strongest thermal-longevity
  signal is one observational male cohort; healthy-user bias unexcluded.

## Open questions
1. Where are the human dose-response *windows* for cold and heat (the missing inverted-U axes)?
2. Does cross-stressor adaptation transfer (does cold tolerance buy heat or exercise tolerance), or
   do stressors compete for a shared adaptive budget?
3. Is mitohormesis a single mechanism under all four stressors, or convergent distinct pathways
   that merely look alike? (Decides whether "hormesis" is a canon-tier principle or a useful
   metaphor — see `CANON-BRIDGE-PROPOSAL.md`.)
4. Can the frame be made falsifiable — i.e. stated so a result could contradict it?
