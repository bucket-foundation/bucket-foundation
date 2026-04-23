# Bucket Foundation — Demo / Music Video v1 Production Plan

> Status: **PLAN ONLY — do not begin asset generation.**
> Bead: `bkt- · demo-video v1 production plan` (priority=2, ready)
> Author: Revenue pillar, 2026-04-23
> Target length: 60–90 sec
> Target ship: T+5 days from founder green-light

---

## 0. Environment verification (done 2026-04-23)

### API keys actually present
| Key | Status | Source |
|---|---|---|
| `OPENAI_API_KEY` | **AVAILABLE** | `~/DerbyFish/derbyfish-gtm/.env` → gpt-image-1, TTS (`tts-1-hd` with `onyx`/`ash`/`sage`), Whisper, gpt-4o-audio |
| `ANTHROPIC_API_KEY` | **AVAILABLE** | same env — script regen via Claude |
| `HEYGEN_API_KEY` | **AVAILABLE** | same env — **not used** for v1 (talking-head aesthetic wrong for stone/museum brief; parked for v2 narrator cameo) |
| `FIGMA_TOKEN` | **AVAILABLE** | `~/.bashrc` + `figma-agf` MCP |
| `ELEVENLABS_API_KEY` | **NOT AVAILABLE** | fallback → OpenAI TTS `onyx` |
| `SUNO_API_KEY` / `UDIO_API_KEY` | **NOT AVAILABLE** | fallback → YouTube Audio Library / Pixabay royalty-free |
| `RUNWAY_API_KEY` / `PIKA_API_KEY` / `REPLICATE_API_TOKEN` / `STABILITY_API_KEY` | **NOT AVAILABLE** | fallback → gpt-image-1 stills + Ken Burns in ffmpeg |
| `ASSEMBLYAI` / `DEEPGRAM` | **NOT AVAILABLE** | fallback → OpenAI Whisper for captions |

### Binaries present
`ffmpeg` ✅ · `obs` ✅ · `google-chrome` ✅ · `convert`/`magick` (ImageMagick) ✅ · `cairosvg` ✅ · `node` v22 ✅ · `python3` 3.13 ✅

### Binaries missing (installable, no paid SaaS)
- `playwright` → `npx playwright@1.49 install chromium` (one-time, ~180 MB)
- `whisper` → `pip install openai-whisper` OR (preferred, no local GPU) use the OpenAI Whisper **API** we already have keys for
- `yt-dlp` → `pip install yt-dlp` (for pulling royalty-free tracks)
- `rsvg-convert` → `sudo dnf install librsvg2-tools` (optional — cairosvg already works)
- `sox` → not required; ffmpeg covers all audio DSP

### Session context
Wayland session (`XDG_SESSION_TYPE=wayland`). **Implication:** `ffmpeg -f x11grab` will not work natively; use Playwright headed-in-Xvfb or, better, Playwright `page.video()` in headless mode (no display server needed). OBS can record via PipeWire as a backup.

---

## 1. Strategic framing (120 words)

**Audience.** Not the general public. Two wedges, watched in the same 90 seconds:
(a) the small number of humans who can pair with a frontier model and push an axiom forward — call them the *canon contributors*; and (b) long-horizon funders (longtermism orgs, open-science programs, protocol-aligned grantmakers on Base) who already fund this archetype.

**Action.** One CTA, one URL: **bucket.foundation** → *contribute, cite, or fund.* No newsletter capture. No "learn more." The site is the funnel.

**Why a music video.** The thesis is aesthetic before it is financial. A talking-head explainer flattens "written in stone" into a pitch. A scored, chiseled 75-second piece lets the limestone carry the argument — it films the product *as artifact*, which is what the product claims to be.

**Watchable metric.** Completion rate > 55% on X native video (threshold for algorithmic lift) and >100 unique `bucket.foundation` visits attributed within 72h of post.

---

## 2. Script — full text (75 sec)

> Voice: grave, unhurried, inscriptional. 90 WPM max. Each line lands on an image, not during a transition.

```
[00:00–00:08]  (silence over hero logo fade-in, then, low:)
               "Every civilization leaves a layer."

[00:10–00:20]  "Clay. Stone. Paper. Server.
                Each one cheaper. Each one louder.
                Each one less permanent."

[00:24–00:34]  "This is the next layer.
                Not faster. Not more.
                Foundations — cut once, and kept."

[00:38–00:50]  "Free to read.
                Paid to cite.
                The fee returns to the hand that carved it."

[00:55–01:05]  "Not a platform. Not a feed.
                A public record for the small number of people
                doing the real work with the new machines."

[01:10–01:15]  (over the closing plinth)
               "Bucket.
                Written in stone."
```

Word count: 69. Spoken length at `tts-1-hd` speed 0.92 ≈ 72 seconds with pauses = ~75 s final.

**Longtermism beat.** "A public record for the small number of people doing the real work with the new machines" — EA/longtermism semantic signature without the jargon. Pairs to a shot of the Canon branches glyph fanning out across centuries (see storyboard shot 9).

---

## 3. Storyboard — shot by shot

Legend: **PW** = Playwright screen capture · **GEN** = gpt-image-1 still · **ARC** = archival/own-asset · **SVG** = rendered supers · **FFX** = ffmpeg effect

| # | Time | Source | Action | VO line | Music cue | Super |
|---|---|---|---|---|---|---|
| 1 | 0:00–0:04 | SVG + FFX | Black → single gold chisel-strike reveals inverse-omega-lyre logo, 5 gold strings glint | — | drone enters, low C | — |
| 2 | 0:04–0:10 | GEN | Slow push-in on weathered limestone tablet, faint cuneiform | "Every civilization leaves a layer." | drone + dulcimer tap | — |
| 3 | 0:10–0:16 | GEN | Cross-dissolve montage: clay tablet → carved marble stele → vellum page → glowing server rack | "Clay. Stone. Paper. Server." | dulcimer enters | each noun chisels on in Cinzel as spoken |
| 4 | 0:16–0:22 | GEN | Antikythera bronze gears rotating, patinated, shallow DOF | "Each one cheaper. Each one louder. Each one less permanent." | sub-bass swell | — |
| 5 | 0:22–0:30 | **PW** | `bucket.foundation` hero loads cleanly, cursor scrolls to § I Thesis, text reveals | "This is the next layer." | held drone | — |
| 6 | 0:30–0:38 | **PW** | Scroll through § II Canon — 8 plinths of branches (mathematics → earth), hover pauses on `05-biophysics` | "Not faster. Not more. Foundations — cut once, and kept." | dulcimer + distant choir | lower-third: "§ II Canon" in Cinzel |
| 7 | 0:38–0:44 | **PW** | Scroll to § III Protocol — chisel into the `402 Payment Required` glyph | "Free to read." | sustained Low D | — |
| 8 | 0:44–0:50 | GEN | Rosetta-stone-style triptych: left = open book, center = x402 signature, right = hand holding coin returning toward carved name | "Paid to cite. The fee returns to the hand that carved it." | choir enters | "402 · Base · cite → author" |
| 9 | 0:50–0:58 | ARC + SVG | Pull from `canon-figures/figures.json` — Euclid, Newton, Maxwell, Turing, Shannon, McClintock, Margulis, Bohm fade in as plinths across a carved arc | — (music breath) | choir peaks | — |
| 10 | 0:58–1:08 | **PW** | Scroll to § IV The Cut — the chisel-edge separator animates; then § V Closer appears | "Not a platform. Not a feed. A public record for the small number of people doing the real work with the new machines." | first drum hit (final 8 bars) | — |
| 11 | 1:08–1:12 | GEN | Slow dolly up a single tall limestone plinth, lyre logo carved at the top, gold glyph catches light | "Bucket." | drums + sub-bass lock | — |
| 12 | 1:12–1:18 | SVG | Full-frame carved inscription on bone-limestone: **"written in stone."** — five gold string-marks beneath | "Written in stone." | tail decay | url: **bucket.foundation** in hairline Cinzel |

12 shots. Three **PW** (hero, Canon, Protocol→Cut), five **GEN** stills (tablet, triptych of civilizations, Antikythera, Rosetta triptych, final plinth), one **ARC** (canon-figures pull), three **SVG+FFX**.

---

## 4. Voice — decision tree

### Primary path: OpenAI TTS (keys present)
```bash
# model: tts-1-hd  voice: onyx (grave male)  speed: 0.92
curl -s https://api.openai.com/v1/audio/speech \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d @gtm/inputs/voice-v1.payload.json \
  -o gtm/voice-v1.mp3
```
`payload.json` contains the full script with period-pause notation. OpenAI TTS doesn't honor SSML, but **periods and newlines control pacing** — script above is period-pointed.

**Voice choice:** `onyx` is the closest to the brief (Attenborough-adjacent grave male). `ash` is slightly younger, more editorial — run both, A/B with founder. Cost: ~$0.015 per full pass.

### If ElevenLabs becomes available later
Recommended voice: **`Daniel` (ID `onwK4e9ZLuTAKqWW03F9`)** — British male, editorial, ~50. Alternative: **`Adam` (ID `pNInz6obpgDQGcFmaJgB`)** for depth at expense of age. `eleven_turbo_v2_5`, stability 0.55, similarity 0.75, style 0.20.

### Fallback: Gian self-records
USB mic → `arecord -f cd -c 1 gtm/voice-raw.wav` → clean with:
```bash
ffmpeg -i gtm/voice-raw.wav -af "highpass=f=80, lowpass=f=12000, afftdn=nf=-25, acompressor=threshold=-18dB:ratio=3:attack=5:release=200, loudnorm=I=-16:TP=-1.5" gtm/voice-v1.mp3
```

### Caption track
Regardless of which voice, generate `captions.vtt` by sending the final mp3 to Whisper API:
```bash
curl -s https://api.openai.com/v1/audio/transcriptions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -F file=@gtm/voice-v1.mp3 -F model=whisper-1 -F response_format=vtt \
  > gtm/captions.vtt
```

---

## 5. Music — decision tree

### No Suno/Udio key. Use royalty-free + ffmpeg composition.

**Brief to match.** "Ancient carved stone cinematic, deep male choir, slow hammered dulcimer, sub-bass drone, no drums until final 8 bars, Jon Hopkins × Jóhann Jóhannsson × Anno Domini Beats."

### Shortlist (all free for commercial use with attribution where noted)
1. **YouTube Audio Library** — search "cinematic drone", "epic ancient", filter Attribution-not-required: *"Ethereal Relaxation"*, *"Before Dawn"*, *"Stonefall"* — preview at https://www.youtube.com/audiolibrary
2. **Pixabay Music** — https://pixabay.com/music/search/ancient%20cinematic/ — strong hits: "Ancient Ritual", "Cinematic Ethereal Choir", "The Legend of Atlantis" — free, no attribution required
3. **Free Music Archive** — https://freemusicarchive.org/genre/Soundtrack/ — filter CC-BY or CC0

**Download workflow:**
```bash
pip install --user yt-dlp
yt-dlp -x --audio-format mp3 --audio-quality 0 -o 'gtm/inputs/music/%(title)s.%(ext)s' "<url>"
```

### Stretch: gpt-image-1-style AI music via OpenAI gpt-4o-audio
Not reliable yet for cinematic score. **Skip for v1.**

### Mix — ffmpeg ducking command
Assuming `music.mp3` and `voice-v1.mp3` prepared:
```bash
ffmpeg -i gtm/inputs/music/track.mp3 -i gtm/voice-v1.mp3 -filter_complex \
"[0:a]volume=0.85[m];[1:a]volume=1.0[v];[m][v]sidechaincompress=threshold=0.05:ratio=8:attack=80:release=600[ducked];[ducked][v]amix=inputs=2:duration=longest[mix];[mix]loudnorm=I=-14:TP=-1.0:LRA=11" \
-c:a aac -b:a 256k gtm/mix-v1.m4a
```

---

## 6. Production pipeline — runnable

> Every command below assumes cwd = `~/agfarms/bucket-foundation/`.

### Step 0 — one-time setup (~5 min)
```bash
cd ~/agfarms/bucket-foundation
mkdir -p gtm/inputs/{images,music,voice,svg} gtm/takes gtm/out
npx -y playwright@1.49 install chromium
pip install --user yt-dlp openai-whisper
```

### Step 1 — generate imagery (gpt-image-1)

For each GEN shot, call gpt-image-1 at `1792x1024` (cinematic 16:9) with quality `high`. Prompts below are the exact payloads.

Prompts file: `gtm/inputs/image-prompts.json`
```json
[
  {"id":"s02_tablet","prompt":"A weathered limestone tablet lit by soft oblique morning light, faint eroded cuneiform carved across its surface, warm bone-white stone (hex #E7DCC3), museum-grade archaeology photography, no text legible, no borders, 16:9, shallow depth of field, KALA earth-ambient palette (V06.1: bone, ochre, hearth, patina, wine), Antikythera/Atlantean archaeological aesthetic, no watermark, no modern elements."},
  {"id":"s03a_clay","prompt":"Single Mesopotamian clay tablet, close macro, eroded edges, warm amber key light, shallow DOF, museum-grade stone photography, no text, 16:9, bone/ochre palette."},
  {"id":"s03b_marble","prompt":"Fragment of Greco-Roman marble stele, chisel-carved lettering faintly visible but illegible, oblique light, patinated veining, museum-grade, 16:9, stone/patina palette."},
  {"id":"s03c_vellum","prompt":"A single page of illuminated medieval vellum, thick parchment, gold leaf initial, faint Latin script, raking candlelight, 16:9, bone/ochre/wine palette, museum-grade."},
  {"id":"s03d_server","prompt":"A single matte-black 1U server in a dim datacenter cold aisle, one cyan status LED, faint dust in a narrow light beam, cinematic still, 16:9, shallow DOF, not glossy, not render-like — photographic."},
  {"id":"s04_antikythera","prompt":"Antikythera mechanism fragment, bronze gears with sea-patina, shallow macro depth of field, museum studio lighting on charcoal velvet, extreme detail on gear teeth, 16:9, no text, no caption, no watermark, photographic."},
  {"id":"s08_rosetta","prompt":"Rosetta-stone style dark-basalt triptych panel, three carved vertical registers: left register an open book icon carved, center register a stylized signature glyph with chain-link carving, right register a hand passing a coin toward a carved name — all in the same hieratic carving style, bone-limestone ground, warm oblique light, 16:9, museum-grade, no color text — only carving, Atlantean aesthetic."},
  {"id":"s11_plinth","prompt":"Single tall limestone plinth rising in warm dawn light against a dim neutral ground, the top of the plinth carved with an inverse omega symbol crossed by five gold string-marks as a lyre motif, gold catches the light, KALA earth-ambient palette, museum-grade cinematic still, 16:9, shallow DOF, no background text."}
]
```

Run (pseudocode script `scripts/gen_images.py` — to be written at execution time; OpenAI Python SDK one-liner per prompt, saves to `gtm/inputs/images/<id>.png`). Est cost: **8 images × $0.19 = $1.52**.

### Step 2 — generate voice
See §4. Output: `gtm/voice-v1.mp3`. Cost: ~$0.015.

### Step 3 — download music
See §5. Output: `gtm/inputs/music/track.mp3`. Cost: $0.

### Step 4 — Playwright website capture

Ship `gtm/record.spec.ts`:
```ts
import { test } from '@playwright/test';

test('bucket.foundation capture', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(process.env.BF_URL || 'https://bucket.foundation');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // hero hold

  // Shot 5 — hero → § I Thesis
  await page.evaluate(() => window.scrollTo({ top: 800, behavior: 'smooth' }));
  await page.waitForTimeout(3500);

  // Shot 6 — § II Canon scroll + hover biophysics
  await page.evaluate(() => document.querySelector('#canon')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  await page.waitForTimeout(2500);
  const bio = page.locator('[data-branch="biophysics"]').first();
  if (await bio.count()) { await bio.hover(); await page.waitForTimeout(1500); }

  // Shot 7 — § III Protocol
  await page.evaluate(() => document.querySelector('#protocol')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  await page.waitForTimeout(3000);

  // Shot 10 — § IV Cut → § V Closer
  await page.evaluate(() => document.querySelector('#cut')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.querySelector('#closer')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  await page.waitForTimeout(3000);
});
```

`gtm/playwright.config.ts` sets `use: { video: { mode: 'on', size: { width: 1920, height: 1080 } } }` and `fullyParallel: false`. Output: `test-results/**/video.webm` → move to `gtm/takes/site-raw.webm`.

Run:
```bash
BF_URL=https://bucket.foundation npx playwright test gtm/record.spec.ts --config=gtm/playwright.config.ts
```

If site section IDs (`#canon`, `#protocol`, `#cut`, `#closer`) don't match: confirm in `src/app/page.tsx` and adjust selectors before execution (see §10).

### Step 5 — supplementary takes
Not needed if Playwright spec covers all PW shots. If OBS is preferred for a cinematic cursor: OBS → PipeWire Screen Capture source → 1920×1080/60 → record separately, drop into `gtm/takes/`.

### Step 6 — SVG supers rendered to PNG
Author `gtm/inputs/svg/super_cinzel.svg` templates (one per text card). Render via cairosvg already installed:
```bash
cairosvg gtm/inputs/svg/super_clay.svg -o gtm/inputs/images/super_clay.png -W 1920 -H 1080
```

### Step 7 — ffmpeg edit

Concat list + Ken Burns per still + overlays + sync to music. Canonical build:

```bash
# 7a — Ken Burns each still to a 6s 1080p clip
for f in gtm/inputs/images/s*.png; do
  name=$(basename "$f" .png)
  ffmpeg -y -loop 1 -i "$f" -vf \
    "zoompan=z='min(zoom+0.0008,1.12)':d=150:s=1920x1080:fps=25, \
     fade=in:0:20,fade=out:130:20" \
    -t 6 -r 25 -c:v libx264 -pix_fmt yuv420p gtm/takes/$name.mp4
done

# 7b — concat manifest
cat > gtm/takes/concat.txt <<'EOF'
file 's01_logo.mp4'
file 's02_tablet.mp4'
# ...
file 's12_closer.mp4'
EOF

# 7c — concat picture track
ffmpeg -f concat -safe 0 -i gtm/takes/concat.txt -c copy gtm/takes/picture.mp4

# 7d — overlay music-ducked voice (from §5)
ffmpeg -i gtm/takes/picture.mp4 -i gtm/mix-v1.m4a \
  -c:v copy -c:a aac -b:a 256k -shortest gtm/out/bucket-v1-1080p.mp4

# 7e — 4K master (upscale only if source images were 2048+; otherwise ship 1080 as master)
ffmpeg -i gtm/out/bucket-v1-1080p.mp4 -vf "scale=3840:2160:flags=lanczos" \
  -c:v libx264 -crf 16 -preset slow -c:a copy gtm/out/bucket-v1-4k.mp4

# 7f — captions
# already produced as gtm/captions.vtt in §4

# 7g — poster
ffmpeg -ss 00:01:12 -i gtm/out/bucket-v1-1080p.mp4 -frames:v 1 gtm/out/poster.png
```

Audio target: **-14 LUFS integrated, -1.0 dBTP** (loudnorm in §5). Final duration target: **75 sec ± 3 sec**.

---

## 7. Post & distribution

| Target | Spec | Notes |
|---|---|---|
| **bucket.foundation hero** | 1080p mp4, autoplay muted, loop; poster.png fallback | Replace or add under hero; PR into `gianyrox/bucket-foundation` |
| **X native upload** | 1080p mp4, < 140s, < 512 MB | Caption below post: *"free to read. paid to cite. bucket.foundation"* — link in reply to avoid algo penalty |
| **YouTube** | 4K master, captions.vtt, poster | Unlisted first 24h for review; then public |
| **Warpcast** | 1080p mp4 (≤ 100 MB) + frame preview | x402/Base adjacency — prime audience |
| **Canonical URL** | https://bucket.foundation/video/v1 | Serve from `/public/video/` in Next.js |
| **OG card** | `og:video` = canonical, `og:image` = poster.png | Update `src/app/layout.tsx` metadata |
| **Thumbnail** | poster.png — the Shot 11 plinth — with **"written in stone."** hairline Cinzel centered | Export 1280×720 |
| **gdrive mirror** | `gdrive:AGFarms/Nucleus/bucket-foundation/gtm/video-v1/` | Contains: `bucket-v1-1080p.mp4`, `bucket-v1-4k.mp4`, `poster.png`, `captions.vtt`, `script.md`, `shot-manifest.json` |

Mirror command:
```bash
rclone mkdir "gdrive:AGFarms/Nucleus/bucket-foundation/gtm/video-v1"
rclone copy gtm/out/ "gdrive:AGFarms/Nucleus/bucket-foundation/gtm/video-v1/" -v
rclone link "gdrive:AGFarms/Nucleus/bucket-foundation/gtm/video-v1"
```

---

## 8. Longtermism / regenerative input pipeline

### Folder convention
```
gtm/
├── demo-video-plan.md          # this file
├── script-generator.md         # the prompt template (below)
├── inputs/
│   ├── reading/                # markdown/PDF drops: longtermism papers, OS manifestos, canon branches
│   │   ├── 01-bostrom-astronomical-waste.pdf
│   │   ├── 02-80k-long-reflection.md
│   │   ├── 03-macaskill-wwotf-ch3.pdf
│   │   ├── 04-lessig-free-culture.md
│   │   ├── 05-kruse-mitochondrial-axioms.md
│   │   └── 10-canon-branch-snapshots/        # rsync'd from gdrive bucket-canon
│   ├── image-prompts.json
│   ├── music/
│   ├── svg/
│   └── voice-v1.payload.json
└── versions/
    ├── v1-script.md            # 2026-04 — this ship
    ├── v2-script.md            # next regen
    └── ...
```

### Script regeneration template — `gtm/script-generator.md`
The founder drops new reading into `gtm/inputs/reading/`, then runs a Claude API call with the template below. Output: a new `vN-script.md` in the same stone voice, re-timed to the existing 12-shot storyboard.

**Prompt skeleton (Claude/Anthropic):**
```
You are the editorial voice of Bucket Foundation. Your task is to revise the
bucket.foundation 75-second video script using the attached reading.

Constraints (hard):
- Voice: grave, inscriptional, unhurried. Sentences short. No jargon.
- End on "written in stone."
- Include one longtermism beat, implicit, never name-drop.
- Preserve the 12-shot storyboard time windows (attached).
- Total spoken length 65–75 seconds at 90 WPM.
- Do not mention crypto, tokens, web3, decentralized, DeSci, NFT. Say
  "cite," "carve," "return," "record."
- Say "bucket" only once, in the closer.

Inputs:
<reading_1>...</reading_1>
<reading_2>...</reading_2>
<current_script>v1-script.md contents</current_script>
<storyboard>gtm/demo-video-plan.md §3 table</storyboard>

Output exactly:
1. The new script, with timecode brackets per line.
2. A diff summary (≤ 80 words) of what shifted and why.
3. Any shot retargeting (e.g. "Shot 8 VO now implies fee-recirculation more strongly; imagery still holds.")
```

Automated runner (deferred to v2):
```bash
# scripts/regen-script.sh
python3 scripts/regen_script.py --readings gtm/inputs/reading/ \
  --current gtm/versions/v1-script.md --out gtm/versions/v2-script.md
```

This is the *engine* that makes the video regenerable as the canon grows. Every new canon-tier paper that lands in `gdrive:AGFarms/Nucleus/research/bucket-canon/` can be fed in; the script sharpens each pass.

---

## 9. Total time + cost

### Founder time (assuming no asset surprises)
| Phase | Hours |
|---|---|
| Setup (playwright install, read plan, confirm decisions in §10) | 0.5 |
| Run image gen + regenerate any rejects | 1.0 |
| Voice generation + A/B listen | 0.5 |
| Music selection + download | 0.75 |
| Playwright spec tune (selector verification) + capture | 0.5 |
| SVG supers design + render | 1.0 |
| ffmpeg edit pass 1 | 1.5 |
| Review + edit pass 2 (timing trim) | 1.0 |
| Caption + poster + gdrive mirror + distribution upload | 1.0 |
| **Total** | **~7.75 hours** |

### API cost
| Item | $ |
|---|---|
| gpt-image-1 × 8 high-quality @ $0.19 | 1.52 |
| OpenAI TTS full script × 2 voices (A/B) | 0.05 |
| Whisper API captions pass | 0.01 |
| Claude script regen (optional) | 0.10 |
| **Total** | **< $2.00** |

### Critical-path blockers
1. **Site section IDs** — Playwright spec assumes `#canon`, `#protocol`, `#cut`, `#closer`. Must verify in `src/app/page.tsx` before running.
2. **Music selection** — without Suno/Udio, founder must listen to 3–5 candidates and pick. Plan on 30 min, not 5.
3. **Voice A/B** — `onyx` vs `ash`. Founder ear required. 10 min.
4. **gpt-image-1 rejects** — ~15% of prompts reroll on first pass; budget 3 rerolls.
5. **Wayland screen record** — if Playwright video output isn't cinematic enough (cursor rendering, font hinting), fall back to OBS+PipeWire; adds 1 hr.

---

## 10. Decisions Gian must answer before bash executes

1. **Script approved as-is (§2)?** Or revise specific lines? (If revise: which, and why.)
2. **Voice — `onyx` or `ash`?** Or provision ElevenLabs ($5/mo Starter) for `Daniel`/`Adam`? Or self-record?
3. **Music policy — royalty-free Pixabay/YouTube Audio Library OK?** Or hold video until Suno/Udio paid pilot (~$10/mo) for bespoke score?
4. **Target URL for Playwright capture — `https://bucket.foundation` prod, or `localhost:3000` of a feature branch?** (Matters if a video-hero branch is in-flight.)
5. **Distribution order — site-first (replace hero, then post) or X-first (drive curiosity → site)?**
6. **Thumbnail text — `"written in stone."` or clean plinth with no super?** (Recommend: clean; Cinzel competes with motion.)
7. **v1 length — stick to 75s or cut to 60s for X feed completion-rate?**

Founder green-lights → execution begins at §6 Step 1.

---

## Appendix A — shot-manifest.json schema (for gdrive sidecar)
```json
{
  "version": "v1",
  "duration_sec": 75,
  "shots": [
    {"id":"s01","t_start":0,"t_end":4,"source":"SVG+FFX","vo":null,"super":null},
    {"id":"s02","t_start":4,"t_end":10,"source":"GEN","prompt_id":"s02_tablet","vo":"Every civilization leaves a layer.","super":null}
    // ... full list per §3
  ],
  "voice": {"provider":"openai","model":"tts-1-hd","voice":"onyx","speed":0.92},
  "music": {"source":"pixabay","title":"TBD","license":"pixabay-free"},
  "loudness_lufs": -14,
  "export": {"codec":"h264","resolution":"1920x1080","fps":25}
}
```

## Appendix B — reading seed list for §8 regen pipeline
Drop these into `gtm/inputs/reading/` on first regen:
- Bostrom, *Astronomical Waste* (2003) — foundational longtermism
- MacAskill, *What We Owe The Future* (2022) ch. 1, 3 — long reflection framing
- 80,000 Hours, *The Long Reflection* brief
- Lessig, *Free Culture* (2004) ch. 1 — citation-as-infrastructure argument
- Benkler, *The Wealth of Networks* (2006) ch. 9
- Nielsen, *Reinventing Discovery* (2011) — open science operating system
- MANIFESTO.md (current bucket)
- HISTORY.md § "Three slogans, three eras"
- `canon-figures/figures.json` pass-1 seed
- One representative paper from each of the 8 canon branches

Each pass through §8 should sharpen at least one line. Target: v5 script is 30% tighter than v1.

---

*End of plan. Do not begin asset generation until §10 decisions are answered.*
