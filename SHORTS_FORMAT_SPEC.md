# Guess The Concept: Canonical Knowledge Shorts Format Spec

**Status:** v1, locked until v2. Sibling spec to `PROTOCOL.md` and `MANIFESTO.md`.
**Owner:** Bucket Foundation. **Processor:** Longtail.
**Bead epic:** `bkt-o62`.
**Source of authority:** This doc. If pipeline disagrees with spec, pipeline is wrong.

---

## 1. Thesis

A canonical-knowledge short is a 35-45-second video that opens an
**information gap** about a concept from the bucket canon (math, physics,
chemistry, info, biophysics, cosmology, mind), holds the gap with an
**accurate** animated rendering of the concept's behavior, **closes** the
Gap with the name + a one-line "why it matters," and **opens a second
gap** that routes the viewer to a deeper canonical artifact.

The format is built on three load-bearing claims from cognitive
science and platform data:

1. **Curiosity = information gap.** (Loewenstein 1994; PACE framework,
 Gruber & Ranganath 2019.) Curiosity activates the hippocampus + midbrain
 reward circuit; **curious states encode stronger memories**. The format
 exists to weaponize that for canon retention.
2. **Curiosity stacking beats single-gap.** ([Curious Shorts, CHI 2025](
 https://dl.acm.org/doi/full/10.1145/3706598.3713951); OpusClip 2026
 data.) Top short-form retention closes one gap and opens the next in
 the same beat. Our format makes this explicit: gap 1 closes at the
 reveal, gap 2 opens at the stack.
3. **Length follows payoff.** 2026 educational sweet spot
 is 30-60s on TikTok, 30-45s on Reels, retention bar is ≥70% past 3s
 and ≥60% completion under 30s. We trim each short until the reveal
 lands at the natural cognitive payoff. Adaptive 35-45s; hard cap 50s.

## 2. Hard rules

A produced short MUST satisfy ALL of:

1. **Substance is accurate.** The animated rendering of the concept's
 behavior is produced by a deterministic, citeable engine: Manim CE
 for math/dynamics, RDKit + py3Dmol for chemistry, scipy + matplotlib
 for ODE/signal/fields. **No diffusion-model imagery on the substance,
 ever.** AI-gen imagery is permitted ONLY for the branded shell
 (title cards, transitions, mascot frames, backgrounds).
2. **One concept per short.** The reveal names exactly one thing.
3. **One concept = one canon node.** Every short is rooted in a single
 `canon_get_claim(id)` result. The claim's `url` is the dive-deeper
 target.
4. **The dive-deeper CTA is real and citeable.** Priority order:
 (a) `bucket.foundation/canon/<id>` (canon entry), (b)
 `longtail.agfarms.dev/shop/<slug>` (paid artifact, if one exists),
 (c) feed402 paid endpoint (v2+).
5. **Length 35-45s. Hard cap 50s.** Outro is 1.5s locked.
6. **Substance never AI-gen.** (Repeated for emphasis; this is the
 accuracy contract that distinguishes us from generic AI-slop shorts.)
7. **Every published short was reviewed.** First ~5 batches per branch
 (4 variants each, ~20 reviewed per branch) go through the human
 chisel-queue review loop on Longtail. **No auto-publish in v1.**

## 3. Structure

| Beat | Time | Purpose | Mechanism |
|------|------|---------|-----------|
| **Hook** | 0:00-0:03 | Open gap 1; clear the 70% retention bar | Branded title card. Visual mystery (partial reveal of the substance). One-line provocation ("This single shape governs every clock, every quantum well, every guitar string. What is it?") |
| **Tease** | 0:03-0:15 | Hold curiosity at maximum tension | Accurate substance animation (Manim/RDKit/scipy). Concept demonstrates its *behavior* without being named. |
| **Reveal** | 0:15-0:35 | Close gap 1 → cognitive payoff lands → hippocampus fires | Name the concept. One crisp "why it matters" sentence. One takeaway the viewer can repeat to a friend tomorrow. |
| **Stack** | 0:35-0:45 | Open gap 2 → route to canon | "The deeper version lives at 0" (or Longtail shop, in priority order). Subtle. |
| **Outro** | 0:45, ~0:48 | Branded sign-off; lock channel identity | 1.5s locked. Sub-brand mark + Bucket Foundation attribution. |

Total: 35-45s adaptive. 50s hard cap. Outro fixed.

## 4. Sub-brand palettes

All sub-brands inherit:
- Bucket scholarly cream base `#f4ede2`
- AGFarms green accent `#1a4d3a`
- Locked title-card grammar, same font family (DejaVu Sans Bold for now;
 consider Computer Modern variant once typesetting deps are in)
- Same caption rules (1-2 lines, max 7 words, switch on voice-line
 boundary)

Per-branch variants change palette + b-roll style + voice-tone weighting:

| Branch | Sub-brand title | Accent palette | Pacing |
|--------|-----------------|----------------|--------|
| `01-mathematics` | **The Shape Of It** | scholarly cream + AG green + ink blue `#1e3a5f` | vector-clean, steady |
| `02-physics` | **Forces At Work** | cream + AG green + warm rust `#b8552d` | motion-heavy, momentum |
| `03-chemistry` | **Bonds & Builds** | cream + AG green + amber `#d4a017` | warm, atomic |
| `04-information` | **Signal In Noise** | cream + AG green + terminal cyan `#3a8a9e` | crisp, terminal aesthetic |
| `05-biophysics` | **The Living Substrate** | cream + AG green + slate green `#4a6741` | organic, slower |
| `06-cosmology` | **Scale Of Things** | dark canvas `#0d1117` + AG green + cold violet `#5a4fc4` | vast, dark |
| `07-mind` | **Inside The Loop** | cream + AG green + warm coral `#c4655a` | recursive, soft |

**Single visual identity, 7 flavors.** Sub-brand is a palette object +
b-roll style ID + voice-tone variant; everything else is shared.

## 5. The 4-variant RLHF loop

The shorts pipeline does **not** ship single shorts. It ships **batches
of 4 variants per concept**:

```
canon_node = canon.pick_unshorts(branch)
variants = [
  (hook_style_A, render_template_A, seed_A),  # e.g. shocking-stat + phase-portrait
  (hook_style_B, render_template_A, seed_B),  # direct-question + phase-portrait
  (hook_style_A, render_template_B, seed_C),  # shocking-stat + transform
  (hook_style_C, render_template_B, seed_D),  # shape-reveal + transform
]
render_all_in_parallel(variants)  # 4 final MP4s
submit_4up_to_chisel(slug, variants)
```

The 4-up is submitted to `longtail.agfarms.dev/chisel` over the same
HMAC-authed pattern Bucket already uses for grant-draft reviews
(`bucket-foundation/scripts/submit-to-longtail.mjs`). Reviewer (Gian)
sees all 4 side-by-side and rates each on:

**Tier-1 gut axes (5-point or yes/no/unsure):**
- `gut.would_watch`, would I keep watching past 3s?
- `gut.hook_lands`, does the hook open a real gap?
- `gut.payoff_lands`, does the reveal close the gap satisfyingly?
- `gut.feels_ai`, does this look like AI slop? (lower = better)
- `gut.would_share`, would I send this to someone?

**Tier-2 quality axes (yes/no):**
- `quality.substance_clear`, is the concept's behavior visible?
- `quality.substance_accurate`, does what's shown match the canon?
- `quality.branding_on`, does it look like a Bucket short?
- `quality.length_right`, too long, too short, just right?
- `quality.cta_natural`, does the stack feel forced?

Plus **free-text feedback** per variant + a **pick-winner** action.

**Cost-Weighted Thompson Sampling** (existing chisel selector,
`~/agfarms/longtail/playbooks/algorithms/2026-05-05-chisel-selector-memo.md`)
Updates beta priors per `(branch, hook_style, render_template)` tuple
based on the verdicts. Next batch's variant generator biases toward
winners but always reserves **1 of 4 slots as exploration** to avoid
mode collapse on the first thing that worked.

**Maturity gate.** A branch's template policy is considered "mature"
When, across the last 3 batches, the human pick is the
same `(hook, template)` combo OR the win rate of the top-3 combos
exceeds 80% combined. Mature branches can move to spot-check review
(human reviews 1 in N batches). **Not v1.**

## 6. Accuracy contract: what each renderer guarantees

| Renderer | What it produces | Accuracy guarantee |
|----------|------------------|--------------------|
| `render/math_manim.py` | ODE phase portraits, Fourier reconstructions, matrix transforms, oscillators (driven, coupled, parametric) | Manim CE = vector-rendered exactly per the math. Same engine as 3Blue1Brown. No diffusion in the math path. |
| `render/chem_rdkit.py` | 2D structural formulas, 3D conformer rotations, reaction arrows with bond-change highlight | RDKit-computed geometries from SMILES. py3Dmol for 3D. Bond changes from explicit reaction SMARTS. |
| `render/plot_scipy.py` | FFT decompositions, vector fields, parametric curves, signal layered reveals | Deterministic scipy integration. Seeded RNG. Same-seed-same-frame across machines. |
| `shell/sdxl_local.py` | Title cards, transition frames, mascot frames, atmospheric backgrounds | NOT load-bearing. Pure aesthetic. May hallucinate freely on the shell, never on the substance. |

**Hard separation in the file tree:** Manim/RDKit/scipy clips live in
`shorts-runs/<slug>/<variant>/substance/`; SDXL frames live in
`shorts-runs/<slug>/<variant>/shell/`. Compose step keeps them in
distinct ffmpeg input streams so the substance can never be replaced by
shell output without an explicit code change.

## 7. Hook variants

Seeded deterministically per `(slug, variant)`. `--reroll` reseeds.

| ID | Hook style | Template |
|----|-----------|----------|
| `shocking-stat` | A number that doesn't make sense yet | "X is calculable from Y alone. Watch." |
| `direct-question` | A question the reveal answers | "What does every clock, every quantum well, every guitar string have in common?" |
| `shape-reveal` | Visual partial-reveal of substance | (no spoken hook, substance plays muted for 1.5s, caption pops "What is this?") |
| `list-preview` | "3 places this hides" | "This shows up in 3 places you wouldn't guess. #1 …" |
| `contrarian` | A wrong common belief, corrected by the reveal | "Most people think X. They're wrong. Here's what's happening." |
| `paradox` | An apparent paradox that the concept resolves | "It oscillates. It decays. It cannot do both. Watch." |

Variants in a 4-up batch MUST use ≥3 distinct hook styles to give the
RLHF loop signal across hook-style * render-template combinations.

## 8. CTA priority

The stack beat (0:35-0:45) routes to exactly ONE of, in this priority:

1. **`bucket.foundation/canon/<concept>/<slug>`**, the canonical artifact.
 Default if the canon entry is published. Establishes credibility,
 feeds the canon's pagerank, no money asked.
2. **`longtail.agfarms.dev/shop/<artifact>`**, only if a paid artifact
 exists for this concept (e.g. `m1-lissajous`). Soft-sell: "I made
 this into a wall print, link below if you want one."
3. **`feed402` paid endpoint**, v2 only. Once feed402 has live merchants
 and a real dataset, technical reveals can route to the paid x402
 endpoint for the underlying paper / dossier.

Never more than one CTA per short. Stacking CTAs trains nobody to click.

## 9. Output tree

```
~/agfarms/bucket-foundation/shorts-runs/<slug>/
├── canon-source.json                  # full canon claim card snapshot
├── batch-1/
│   ├── A/ {script.json, substance/*.mp4, shell/*.png, voice.mp3, timing.json, final.mp4, meta.json}
│   ├── B/ ...
│   ├── C/ ...
│   ├── D/ ...
│   └── chisel-submission.json         # what was sent to longtail
├── batch-1-verdicts.json              # pulled from longtail
├── batch-2/ ...
└── shipped/<picked-variant>.mp4 -> ../batch-N/X/final.mp4 (symlink)
```

Plus mirrored to `gdrive:AGFarms/Nucleus/bucket-foundation/shorts/<slug>/<YYYY-MM-DD>/`
on the same rclone pattern as Figma/YouTube exports.

## 10. Manifest of produced slugs

Single source of truth for "have we already shorts'd this concept":
`~/agfarms/bucket-foundation/shorts-manifest.jsonl`. Append-only.
One row per shipped short: `{slug, canon_id, branch, picked_variant,
shipped_at, gdrive_url, longtail_url}`. The MCP server's
`canon_list_unshorts(branch)` reads this and filters canon claims.

## 11. Out of scope for v1

- External publishing (YouTube Shorts, TikTok, IG Reels API). Tracked
 separately. Reviewed shorts ship to `/shorts/<slug>` on the Longtail
 hub as their canonical home; external syndication is a follow-on bead.
- Auto-publish without human review.
- Multi-language. English only v1.
- Long-form (8-15min) deep-dive companion videos. Different epic.
- feed402 paid-CTA. V2.
- Story Protocol IP minting. Opt-in, off by default in v1.

## 12. References

- Loewenstein, G. (1994). "The psychology of curiosity: a review and
 reinterpretation." *Psychological Bulletin*.
- Gruber, M. D., & Ranganath, C. (2019). "How Curiosity Enhances
 Hippocampus-Dependent Memory: The Prediction, Appraisal, Curiosity,
 and Exploration (PACE) Framework." *Trends in Cognitive Sciences*.
 https://www.sciencedirect.com/science/article/pii/S1364661319302384
- Curious Shorts (CHI 2025).
 https://dl.acm.org/doi/full/10.1145/3706598.3713951
- OpusClip, Ideal YouTube Shorts Length & Format for Retention (2026).
 https://www.opus.pro/blog/ideal-youtube-shorts-length-format-retention
- Joyspace, Ideal Video Length 2026 data study.
 https://joyspace.ai/ideal-video-length-social-platform-2026
- Education Shorts RPM 2026, course funnel beats ad RPM 100-1000×.
 https://fluxnote.io/guides/youtube-shorts-rpm-education-niche
- ManimCommunity/manim. https://github.com/manimCommunity/manim
- xtechsouthie/manim-shorts (closest autonomous-shorts pipeline in the
 wild). https://github.com/xtechsouthie/manim-shorts

---

*build the past. build history. bucket is the new renaissance.*
