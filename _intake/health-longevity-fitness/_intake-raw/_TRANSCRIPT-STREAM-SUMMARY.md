# Transcript Stream — Summary

> Wave 2 transcript mining + targeted new pulls for the health/longevity/fitness corpus.
> Run 2026-06-27. Tool stack: `agf-yt` (pull/batch), `agf-yt-mine`, `yt-dlp` (search).

## What ran

1. **Scanned the existing corpus.** 1288 `yt/` folders → keyword-matched titles/channels/tags/desc
   → **304 health/longevity/fitness-relevant** (262 with usable transcripts).
   Index: `existing-corpus-relevant.md` + `relevant-folders.txt`. Later waves should NOT re-pull these.
2. **Mined the existing relevant subset.** → `mined-existing-corpus/` (REFERENCES.md, PER-VIDEO.md,
   references.json). 110 concepts / 91 titled people / 158 by-author / 1947 capitalized names.
3. **Targeted new pulls.** 20 YouTube searches across the target roster → curated 22 high-signal
   long-form talks NOT already in corpus → pulled via `agf-yt batch`. **21/22 got transcripts**
   first pass; the 1 failure (Satchin Panda TRE-implementation, no subs) was replaced with an
   alternate Panda episode → **22/22 final**. All landed in `~/agfarms/bucket-foundation/yt/`.
4. **Mined the new pulls.** → `mined-new-pulls/`. 52 concepts / 18 titled people.
5. **Synthesized.** `MINED-EXPANSION.md` + appended 26 people to `00-map/discovered-people.md`
   (Wave 2 block) + created `00-map/discovered-concepts.md` (12 concepts).

## New pulls (22 transcripts, the mainstream spine the corpus lacked)
Attia×Joyner (VO2max) · Attia×San-Millán (Zone 2 deep dive) · Galpin (strength/muscle) ·
Galpin (recovery) · Kaeberlein (rapamycin roundtable) · Rhonda Patrick (omega-3 biological aging) ·
Rhonda Patrick (sauna guide) · Bryan Johnson (2025 Blueprint full day) · Kelly Starrett (mobility) ·
Stuart McGill (pain-proof back) · Wim Hof ("cold hard science" critical dissection) ·
McKeown (nasal breathing TEDx) · Søberg (cold/heat Huberman) · Søberg×Spector (ZOE sauna/cold) ·
Matt Walker (biology of sleep) · Satchin Panda (time-restricted feeding) · Valter Longo (FMD) ·
Sinclair (NAD/reversing aging) · Barzilai (centenarians/metformin) ·
Nick Lane (bioenergetics ×2: future of bioenergetics + three domains of life) ·
Norton×Stu Phillips (protein masterclass).

## Top expansion candidates (full detail in MINED-EXPANSION.md)
- **Bioenergetics / origin-of-mitochondria lineage = the highest-value vein** — it bridges the
  Kruse-biophysics corpus (Domain A) to mainstream mitochondrial geroscience (Domain B):
  **Nick Lane, Peter Mitchell (chemiosmosis, Nobel '78), Jennifer Moyle, Lynn Margulis
  (endosymbiosis), Bill Martin (proton-gradient origin of life), Carl Woese, Hans Krebs.**
  Several are *foundation-tier* → candidates to promote UP into `bucket-canon/05-biophysics`.
- **Exercise/nutrition:** Mike Joyner (VO2max), Bruce Ames (micronutrient triage theory),
  Don Layman (leucine threshold), Dan Garner, Bill Harris (Omega-3 Index).
- **Movement/breath:** Jill Miller (fascia), Brian Mackenzie (breath×performance), Ori Hofmekler.
- **Domain-A deepening:** Glen Jeffery (670nm/NIR photobiomodulation — academic red-light anchor),
  Alexis Cowan, Que Collins / Richard J. Roberts (deuterium).
- **Mind branch (07):** Karl Friston (free-energy principle — canon-tier), Donald Hoffman,
  Nolan Williams, Paul Conti.
- **Practitioner-n1 (index, don't endorse):** Dave Asprey, Ben Greenfield.
- **New concepts:** chemiosmosis/proton-motive force, endosymbiosis, proton-gradient origin of life,
  triage theory, Omega-3 Index, leucine threshold, NIR photobiomodulation, free-energy principle,
  SCN master clock, myokines, lactate shuttle, Soeberg principle.

## Gaps still open (for the next wave)
- Yoga/asana lineages (Domain F) — almost no spoken coverage pulled.
- Blue Zones / Dan Buettner — population-longevity angle absent.
- Microbiome deep-dive (Sonnenburg, Knight) — only grazed via Tim Spector.
- CGM/glucose N=1 (Levels/Means) — not pulled.
- Pavel Tsatsouline, Ido Portal (in seed) — no transcript yet.
- Wearables/HRV measurement layer (Domain L) — only indirect.

## Caveat
ASR auto-captions are noisy; the miner mangles names (Kruse→"Cruz", Pollack→"Pollock",
San-Millán→"San Mill", Friston→"Fristen", Layman→"Lane Norton"). All names above were
de-noised by hand against source-video topics. Frequency counts are indicative, not exact.

## Disk
yt/ corpus ~2.1 GB; transcripts only (no video pulled). /home at 76% (225G free) — no concern.

## Idempotency note for the next wave
`relevant-folders.txt` (262 entries) + the 22 new-pull folder names already in `yt/` are the
de-dup set. Re-running searches will re-surface the same IDs; check against existing `yt/<id>-*`
folders before pulling (the dedup loop in this wave found 0 collisions).
