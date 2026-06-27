# Movement Media Library (Domain F) — Wave 3 Summary

> Built 2026-06-27 by the Wave 3 media scale-up agent. Continues `_SUMMARY.md` (Wave 1/2).
> Source of truth for assets = `media/MANIFEST.jsonl` (now **294 lines**, idempotent).

## What Wave 3 did

### Job 1 — filled video gaps + fixed weak provenance
- **16 new demonstration videos** added for movements that had no downloaded video, bringing every
  category to solid coverage. All sourced via `yt-dlp ytsearch1` so a **real deterministic source URL**
  is captured in the manifest (no more search-query fallbacks).
- **11 weak-provenance videos** from Wave 1 (the ones whose `source_url` was just a search note) were
  **re-downloaded and re-sourced** — they now carry real YouTube watch URLs + titles + uploaders.
- **27 videos total touched** (16 new + 11 re-sourced), **296.7 MB**.
- **108 fresh still frames** extracted (4 per touched video, ffmpeg @ even time-splits, scaled 640px).

New videos by category (slug → captured URL):
- **mobility (+3 → 9):** spinal-cars, thoracic-open-book, wrist-cars
- **flexibility (+2 → 7):** front-split, doorway-stretch
- **strength (+2 → 8):** split-squat, plank-pallof
- **yoga (+2 → 7):** child-savasana, cobra-pose
- **breath (+2 → 7):** nasal-breathing, diaphragmatic
- **cold-thermogenesis (+2 → 5):** breath-control-cold, contrast-therapy
- **heat-sauna (+2 → 4):** hydration-protocol, laukkanen-frequency
- **balance-locomotion (+1 → 6):** gait-walking

### Job 2 — anatomy images (filled Wave 1 gaps)
- **11 raster anatomy images** from Wikimedia Commons (rasters only; PDFs/SVGs skipped), **5.72 MB**.
  License captured per file from `extmetadata.LicenseShortName`.
- Filled: **vertebral-column** (2), **thoracic-spine** (1), **rotator-cuff** (2), **brown-fat** (2),
  **gluteal-muscles** (2), **major-muscle-groups** (2). Anatomy total now **29 images**.

### Job 3 — movement ↔ evidence pairing
- Wrote `03-movement-library/MOVEMENT-EVIDENCE.md`. Pairs each movement to the **already-graded primary
  evidence** in `02-domains/*-claims.json`, with corpus claim-id + tier + DOI. Highlights the five
  "movement biomarkers" (VO2max→Mandsager, grip→Leong/PURE, sit-to-rise→Brito, gait→Studenski,
  10-s balance→Araujo). All DOIs pulled from the corpus except Araujo 2022 (flagged to add).

### Job 4 — safety
- Wrote `03-movement-library/SAFETY-FLAGS.md`. Severity-graded hard contraindications:
  🔴 breath-hold+water (shallow-water blackout), 🔴 cold-immersion cardiac/afterdrop/drowning,
  🟠 heat+alcohol/pregnancy/cardiac/dehydration, 🟠 loaded-spine flexion, plus 4 recorded evidence
  conflicts (static-stretch-pre-lift, cold-blunts-hypertrophy, infrared-vs-traditional sauna, contrast therapy).

## Manifest state (`media/MANIFEST.jsonl`)
| asset_type | count |
|------------|-------|
| video | 53 |
| frame | 212 |
| anatomy-image | 29 |
| **total** | **294** |

Per-category video coverage: mobility 9, strength 8, flexibility 7, yoga 7, breath 7, balance 6,
cold 5, heat 4. Every video has exactly 4 frames; 0 duplicate paths in the manifest.

## Disk / footprint
- **Wave 3 net new bytes:** ~**202 MB** (videos 296.7 MB touched, of which ~11 overwrote Wave-1 files;
  net media-dir growth ≈ 305 MB → **504 MB**; anatomy +5.72 MB).
- **media/video:** 485 MB · **media/images:** 19 MB.
- **/home before:** 224 GB free (76% used). **/home after:** 224 GB free (76% used).
  Far under the 25 GB run cap and well above the 150 GB stop-floor.

## Provenance / licensing
- Videos: real YouTube watch URLs captured per file. Held as **research/citation reference**
  (cite `source_url`, no redistribution) — demonstration tier per `06-evidence/SCHEMA.md`.
- Anatomy: Wikimedia Commons, license per file (CC-BY / CC-BY-SA / Public domain / No restrictions),
  source = Commons file page URL.

## Remaining gaps for Wave 4
1. **Add Araujo 2022 (10-s balance) to `02-domains/L-claims.json`** — referenced in pairing, not yet graded.
2. **Yoga→HRV RCTs** — grade into Domain I, then back-link the yoga rows in MOVEMENT-EVIDENCE.md.
3. **Resolve the 4 recorded conflicts** as first-class objects (static-stretch, cold-after-lifting,
   infrared sauna, contrast therapy).
4. **Brown-fat *distribution map*** — Commons only yielded histology (cell-level) rasters; a whole-body
   BAT PET-CT distribution diagram is still missing (mostly PDF/figure-locked).
5. **FRC PAILs/RAILs, McGill big-3 full series, Otago fall-prevention program** — deeper teacher series
   still un-downloaded (single demos only).
6. **Some demos are talking-head explainers** (laukkanen-frequency, breath-control-cold, contrast-therapy)
   rather than pure movement demonstrations — acceptable for those protocol-style entries, but a cleaner
   demonstration clip could replace them later.
