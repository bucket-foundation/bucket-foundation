# Canon Promotion Log — Bioenergetics Lineage (pass-3)

> **Date:** 2026-06-27 · **Status:** DONE · **Authority:** founder-approved
> **Driver memo:** `CANON-BRIDGE-PROPOSAL.md` §3a, §3b, §5
> **Scope:** promote 3 FOUNDATION-tier figures + 1 foundation-principle concept node into
> the Bucket Foundation canon (05-biophysics).

## Figures promoted (3)

Added as both a markdown card and a `figures.json` entry. `added_in_pass: 3`,
`added_on: 2026-06-27`.

| id | name | branches | cross | rationale |
|---|---|---|---|---|
| `krebs` | Hans Krebs (1900–1981) | 05-biophysics | 03-chemistry | Citric-acid (Krebs) cycle — central catabolic hub; identification of a metabolic law. Szent-Györgyi supplied precursor acids, Krebs assembled the cycle. (§3a) |
| `moyle` | Jennifer Moyle (1921–2016) | 05-biophysics | — | Co-developed AND experimentally proved chemiosmosis with Mitchell at Glynn; under-credited. Attribution-parity correction (cf. Franklin), cross-linked to `mitchell`. (§3a) |
| `martin-william` | William F. Martin (1957–) | 05-biophysics | — | With Lane, alkaline-vent / proton-gradient origin-of-life & eukaryogenesis programme. Co-card parity with `lane` (which already names Martin). Living-figure. (§3a) |

## Concept node added (1)

| node | path | rationale |
|---|---|---|
| Chemiosmosis / proton-motive force / redox bioenergetics | `bucket-canon/05-biophysics/concepts/chemiosmosis-proton-motive-force.md` | First canon **concept node** (foundation-principle, not a figure card). The law the outcome domains B/C/D/E/H `canon_link` UP to. Includes the law statement (Δp = Δψ − (2.303RT/F)·ΔpH), foundation-tier justification, the Mitchell 1961 → Mitchell-Moyle proof chain, and downstream outcome-domain cross-refs. New `concepts/` directory created (no prior concept-file convention existed under `bucket-canon/05-biophysics/`). (§3b) |

## Files touched

- `canon-figures/05-biophysics.md` — appended 3 markdown cards (krebs, moyle, martin-william) after the Khavinson card.
- `canon-figures/figures.json` — appended 3 JSON entries; bumped `pass` 2→3 and `generated` to 2026-06-27; total figures 99 → 102. JSON re-validated OK.
- `bucket-canon/05-biophysics/concepts/chemiosmosis-proton-motive-force.md` — new file (new `concepts/` dir).
- `_intake/health-longevity-fitness/00-map/_CANON-PROMOTION-LOG.md` — this log.

## NOT promoted (per §3c / §3d — kept outcome-tier or under review)

- Outcome-tier (stay in `02-domains/`): mitochondrial-dysfunction Hallmark, free-radical
  theory of aging, NAD-precursor/sirtuin/resveratrol claims, VO₂max/Zone2/myokines/UCP1-BAT,
  epigenetic clocks, mtDNA-mutation-causality.
- Branch-TBD, deferred: Carl Woese (information ↔ biophysics boundary) — flagged in §3a/§5,
  not promoted in this pass.
- Under review (status quo): inherited Kruse/structured-water/biophoton/bioelectric layer —
  already carded as contested/living; not re-litigated here.

## Note for `canon-figures/_pass-log.md`

These three figures + the concept node constitute a pass-3 addition not yet narrated in
`_pass-log.md` (which currently documents passes 1–2). `figures.json` `pass` is bumped to 3;
a pass-3 entry in `_pass-log.md` is a recommended follow-up to keep the narrative log in sync.
