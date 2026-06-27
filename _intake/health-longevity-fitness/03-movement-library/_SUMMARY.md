# Movement Media Library (Domain F) — Wave 2 Summary

> Built 2026-06-27 by the Movement Media Library research agent. Media-heavy stream of the
> Health · Longevity · Fitness corpus. Source of truth for downloaded assets =
> `media/MANIFEST.jsonl` (202 lines, idempotent — re-runs skip existing files).

## Inventories written (8/8 categories)

Each `03-movement-library/<category>/INVENTORY.md` lists core movements with: name, what it
trains, key cues, primary source/teacher, and a candidate demonstration URL. Movements inventoried:

| Category | Movements inventoried | High-value (download targets) |
|----------|----------------------|-------------------------------|
| mobility | 9 (shoulder/hip/spinal CARs, 90/90, dislocates, deep squat, ankle DF, t-spine, wrist) | 6 |
| flexibility | 7 (couch, pancake, PNF hamstring, front split, Jefferson curl, butterfly, doorway) | 5 |
| strength | 8 (squat, deadlift, push, pull, carry, split squat, plank/Pallof, KB swing) | 6 |
| yoga | 7 (Sun Salutation A, down dog, Warrior 1/2, Triangle, Tree, Child/Savasana, Cobra) | 5 |
| breath | 7 (box, physiological sigh, Wim Hof, Buteyko, coherent, nasal, diaphragmatic) | 5 |
| cold-thermogenesis | 5 (cold shower, cold plunge, Søberg principle, breath control, contrast) | 4 |
| heat-sauna | 4 (Finnish dry sauna, Laukkanen frequency, sauna+cold contrast, hydration) | 3 |
| balance-locomotion | 6 (baby crawl, Turkish get-up, sit-to-rise, single-leg balance, gait, bear crawl) | 5 |
| **Total** | **53 movements** | **39 targeted** |

## Media downloaded

| Asset type | Count | Notes |
|------------|-------|-------|
| Demonstration videos (`media/video/<cat>/<slug>.mp4`) | **37** | yt-dlp, ≤720p, duration-capped; 26 carry a recovered real YouTube URL, 11 fall back to a documented search-query note (candidate URLs also in INVENTORY) |
| Extracted still frames (`media/images/<cat>/<slug>-frame-NN.jpg`) | **147** | ffmpeg, ~4 frames/video @ 1 per 8s, scaled 640px wide |
| Wikimedia Commons anatomy/exercise images (`media/images/anatomy/`) | **18** | CC-BY / CC-BY-SA / Public domain; license recorded per file in MANIFEST |
| **Total assets in MANIFEST.jsonl** | **202** | |

Per-category video coverage: mobility 6, strength 6, balance-locomotion 5, yoga 5, breath 5,
flexibility 5, cold-thermogenesis 3, heat-sauna 2.

## Footprint & disk

- **Total media dir:** ~305 MB (videos 297 MB, frames 4.5 MB, anatomy 2.5 MB) — far under the 40 GB cap.
- **Disk /home before:** 225 GB free (76% used).
- **Disk /home after:** 224 GB free (76% used). Well above the 150 GB stop-floor.

## Provenance / licensing notes

- Anatomy images: license captured from Wikimedia `extmetadata.LicenseShortName` per file
  (CC-BY-SA 4.0, CC-BY 3.0, Public domain, "No restrictions"). Source file page URL in `source_url`.
- Demonstration videos: YouTube standard license — held as **research/citation reference**
  (cite `source_url`, no redistribution), consistent with the Bucket citation-only pattern.
  These are graded `anecdotal`/demonstration tier per `06-evidence/SCHEMA.md` — they show *how*,
  they are not outcome evidence.
- 3 PDF-fallback "images" from Commons were detected and deleted (book/PDF page thumbs, not diagrams).

## Gaps for Wave 3

1. **11 videos lack a deterministic source URL** — re-run `--print` recovery or re-download with a
   non-colliding `--write-info-json` template (the playlist info.json overwrote per-video sidecars).
2. **Primary-evidence pairing.** Each demonstration should link to its evidence-tier claim:
   - sauna → Laukkanen 2015 JAMA Intern Med (`cohort`); sit-to-rise → Brito 2012; 10-s balance → Araujo 2022;
     physiological sigh → Balban 2023 Cell Reports (`rct`); Wim Hof immune → Kox 2014 PNAS.
3. **Missing anatomy:** vertebral-column raster diagram (only PDFs returned), thoracic spine, rotator cuff,
   brown-adipose distribution map, gluteal complex.
4. **Conflicts to record as first-class objects:** static stretch before lifting (perf debate);
   cold-after-resistance-training blunts hypertrophy; infrared vs traditional sauna.
5. **Safety flags to formalize** for breath/cold: shallow-water-blackout (Wim Hof + water), cold-water
   immersion cardiac/afterdrop risk, heat + alcohol/pregnancy/cardiac.
6. **Yoga ↔ breath overlap** (pranayama) and yoga→HRV RCTs (Domain I bridge) not yet pulled.
7. **Deeper teacher attribution:** FRC PAILs/RAILs, McGill big-3 full series, Ido Portal locomotion system,
   Otago fall-prevention program.

## Re-run / idempotency

- Videos: `media/video/<cat>/<slug>.mp4` — skipped if present.
- Frames: skipped if `<slug>-frame-*.jpg` already exist.
- Anatomy: skipped if target filename present.
- MANIFEST.jsonl is regenerated from on-disk assets (dedupe by path), so re-runs converge.
