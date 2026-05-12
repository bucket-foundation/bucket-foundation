#!/usr/bin/env bash
# Create the bkt-epic-shorts epic + 15 child beads in Bucket Foundation.
set -euo pipefail
API="https://bucket-foundation.nucleus.agfarms.dev/issues"
AUTH="-u $NUCLEUS_ADMIN_USER:$NUCLEUS_ADMIN_PASSWORD"

mk() {
  local title="$1" desc="$2" type="${3:-task}" prio="${4:-2}"
  curl -s $AUTH -X POST "$API" -H "Content-Type: application/json" \
    -d "$(jq -n --arg t "$title" --arg d "$desc" --arg ty "$type" --argjson p "$prio" \
        '{title:$t,description:$d,issue_type:$ty,priority:$p}')" \
    | jq -r '.id // .issue.id // "ERR:" + tostring'
}

echo "--- creating epic ---"
EPIC=$(mk "Guess The Concept — AGFarms canonical knowledge shorts" \
"Bucket-owned canonical shorts format. Pulls nodes from bucket-canon, renders accurate substance (Manim/RDKit/scipy), wraps in branded AI-gen shell (local SDXL on ROCm RX 7700S), voiced via Longtail tts-cascade (local Kokoro), composed via Longtail render-short chassis. 4-variant batches reviewed in Longtail chisel queue (HMAC POST, existing pattern) for RLHF-style preference learning over hook + render templates.

Architecture: Bucket = brain (canon, branding, IP minting). Longtail = body (TTS, render, chisel review queue, /shorts/<slug> hub).

Format: 35-45s hard. Hook 0-3s, tease 3-15s, reveal 15-35s, stack 35-45s. Substance always real, shell may be AI-gen. CTA priority: Bucket canon entry > Longtail shop > feed402.

Sub-brands per branch: 01-mathematics 'The Shape Of It', 02-physics 'Forces At Work', 03-chemistry 'Bonds & Builds', 04-information 'Signal In Noise', 05-biophysics 'The Living Substrate', 06-cosmology 'Scale Of Things', 07-mind 'Inside The Loop'.

Hard rule: human reviews 4-up batches in Longtail chisel until template policy is mature per branch (~5 batches each). NO auto-publish v1." \
  "epic" 1)
echo "EPIC=$EPIC"

echo "--- creating children ---"
B1=$(mk  "Format spec doc: SHORTS_FORMAT_SPEC.md" \
"Write bucket-foundation/SHORTS_FORMAT_SPEC.md. Immutable until v2. Locks: 35-45s structure (hook/tease/reveal/stack/outro), accuracy contract (substance = Manim/RDKit/scipy; shell = local SDXL OK), sub-brand palette per branch (7 variants), CTA priority order, 4-variant RLHF loop, seed/reroll semantics. Research citations included (Loewenstein info-gap, PACE, OpusClip retention, 2026 length data). Parent: $EPIC" task 1)
B2=$(mk  "Install render deps: manim CE, rdkit, diffusers, accelerate" \
"pip install manim rdkit diffusers accelerate transformers safetensors. Verify ROCm PyTorch is used by diffusers (already installed: torch 2.9.1+rocm6.4). Download Kokoro voice model if Longtail tts-cascade needs it locally. Verify ffmpeg drawtext + ass subtitle support. Parent: $EPIC" task 0)
B3=$(mk  "Audit bucket-canon-mcp.py for shorts-selection needs; add canon.pick_unshorts helper" \
"Existing MCP server already has canon_search/canon_get_claim/canon_list_branches. ADD: canon_list_unshorts(branch) — reads ~/agfarms/bucket-foundation/shorts-manifest.jsonl (slugs already produced) and returns unused canon claims for that branch. Small PR to mcp-server/bucket-canon-mcp.py. Parent: $EPIC" task 2)
B4=$(mk  "Scaffold tools/shorts/ CLI in bucket-foundation repo" \
"Create bucket-foundation/tools/shorts/{shorts.py,render/,shell/,voice/,compose/,review/,learn/,mint/}. Symlink ~/bin/agf-canon-short. Subcommands: pick, render-batch (4 variants), submit-chisel, pull-verdicts, retrain, publish, mint. Output tree: ~/agfarms/bucket-foundation/shorts-runs/<slug>/<variant>/. Parent: $EPIC" task 1)
B5=$(mk  "Manim CE module + 4 concept templates" \
"render/math_manim.py with 4 reusable Scene classes: PhasePortrait (ODE field), Transform (matrix/Fourier), Oscillator (driven/coupled), FourierBuildup (series visualization). Each accepts a canon claim dict and renders a 12-15s clip. Parent: $EPIC" feature 2)
B6=$(mk  "RDKit module + 2 chemistry templates" \
"render/chem_rdkit.py: SmallMoleculeReveal (2D->3D rotation, atom-by-atom highlight) + ReactionArrow (reactants->products with bond changes). Uses py3Dmol for 3D where animation needs it. Parent: $EPIC" feature 2)
B7=$(mk  "scipy/matplotlib module + 2 templates" \
"render/plot_scipy.py: SignalDecomposition (FFT layered reveal), VectorField (2D dynamical system flow). Deterministic seeded. Parent: $EPIC" feature 2)
B8=$(mk  "Local SDXL/FLUX-schnell branded-shell pipeline (ROCm RX 7700S)" \
"shell/sdxl_local.py: load SDXL-base + a small style LoRA per sub-brand. Renders title cards, transition frames, optional mascot. 8GB VRAM constraint -> SDXL is fine, FLUX-schnell as alt, FLUX-dev too big. Use diffusers with torch_dtype=float16, attention slicing. Generation 5-10s per frame on gfx1102. Parent: $EPIC" feature 1)
B9=$(mk  "Voice integration with Longtail tts-cascade (local Kokoro first)" \
"voice/longtail.py: invokes ~/agfarms/longtail/scripts/synthesize-voice.mjs as subprocess OR direct import of lib/tts-cascade.mjs. Local Kokoro/Piper preferred, no cloud unless PREFER_ELEVEN=1. Returns voice.mp3 + timing.json per variant. Parent: $EPIC" task 2)
B10=$(mk "Compose via extended Longtail render-short chassis" \
"compose/longtail.py: invokes ~/agfarms/longtail/scripts/render-short.mjs with override flags for b-roll source (use our Manim/RDKit clips instead of generative-art origin.png), sub-brand palette (override AGFarms green with branch palette), outro CTA (bucket.foundation/canon/<id>). PR Longtail to accept --b-roll-source and --palette flags. Parent: $EPIC" feature 1)
B11=$(mk "4-variant batch renderer + chisel queue submitter" \
"orchestrator: agf-canon-short render-batch <slug> emits 4 variants (deterministic seeds A/B/C/D varying hook style + render template). Then submits 4-up to longtail.agfarms.dev/chisel via HMAC POST (reuse submit-to-longtail.mjs pattern). Custom axes: gut.would_watch, gut.hook_lands, gut.payoff_lands, gut.feels_ai, quality.substance_clear, quality.branding_on, quality.length_right, quality.cta_natural. Parent: $EPIC" feature 1)
B12=$(mk "Preference learner: Thompson Sampling extension for shorts variants" \
"learn/preference.py: pulls verdicts from Longtail chisel, updates beta-distribution priors per (branch, hook_style, render_template) tuple. Bias next batch sampling toward winners with 1 exploration slot. Extends ~/agfarms/longtail/playbooks/algorithms/2026-05-05-chisel-selector-memo.md sampler to shorts artifact type. Parent: $EPIC" feature 2)
B13=$(mk "Longtail hub /shorts/<slug> Next.js route" \
"PR to longtail-hub: new /shorts/[slug]/page.tsx mirroring /shop/[slug] UX. Page shows the final MP4, the canon-source link (bucket.foundation/canon/<id>), and an optional CTA to the Longtail shop artifact if one exists. Parent: $EPIC" feature 2)
B14=$(mk "Story Protocol IP NFT minting hook for picked variant" \
"mint/story.py: after a 4-up batch resolves and human picks a winner, optionally mint the concept-as-short as an IP NFT on Story Protocol (reuses existing bucket-foundation Story SDK wiring). Off by default in v1, opt-in flag. Parent: $EPIC" task 3)
B15=$(mk "Pilot: 12 shorts (4 each across math/physics/chemistry) + RLHF iteration" \
"Run 3 batches per branch (4 variants each = 12 review events total = 36 rendered clips). Human reviews in Longtail chisel each batch, learner updates weights. By batch 3, template policy should be mature enough that 1 variant clearly wins. Document outcomes in playbooks/shorts-pilot-results.md. Parent: $EPIC" task 1)

echo "BEADS CREATED:"
for v in EPIC B1 B2 B3 B4 B5 B6 B7 B8 B9 B10 B11 B12 B13 B14 B15; do
  echo "  $v = ${!v}"
done
