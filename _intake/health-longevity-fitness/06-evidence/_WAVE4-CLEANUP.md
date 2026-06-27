# Wave 4 — Evidence Cleanup

> 2026-06-27. Closes the open TODOs left by Wave 3 (movement library): formalizes the recorded movement
> conflicts as first-class objects, grades yoga/meditation evidence into Domain I, and adds the Araújo
> 10-second balance → mortality claim to Domain L. All embedded JSON validated. Raw OpenAlex responses
> archived under `_intake-raw/openalex/`.

## 1. Movement conflicts formalized → `06-evidence/CONFLICTS.md`

`03-movement-library/SAFETY-FLAGS.md` recorded **four** unformalized evidence conflicts. Status after Wave 4:

| Flagged conflict (SAFETY-FLAGS) | Conflict object | Status |
|---|---|---|
| 1. Static stretching before lifting | `conflict-static-stretch-performance` | **Already existed** (Wave 3, Domain E append) — NOT duplicated |
| 2. Cold-water immersion after resistance training | `conflict-cold-after-resistance` | **Already existed** (Wave 3, Domain E append) — NOT duplicated; verified it covers the hypertrophy-blunting mechanism (Roberts 2015) |
| 3. Infrared vs traditional (convective) sauna | `conflict-infrared-vs-traditional-sauna` | **NEW Wave 4** |
| 4. Contrast therapy (hot↔cold) for recovery | `conflict-contrast-therapy-recovery` | **NEW Wave 4** |
| (related, requested) Foam rolling / recovery efficacy | `conflict-foam-rolling-efficacy` | **NEW Wave 4** |

**3 new conflict objects** appended (each with both sides + champions + tier + status + embedded JSON):

- **`conflict-infrared-vs-traditional-sauna`** (`open`) — the KIHD mortality/dementia data are on *traditional*
  convective Finnish sauna (Laukkanen 2015 `10.1001/jamainternmed.2014.8187`; review `10.1016/j.mayocp.2018.04.008`).
  IR cabins run cooler (~45-60°C) with a different radiant heat load; their outcome evidence is small/surrogate
  (BP, endothelial function, Waon therapy). Borrowing the Laukkanen numbers for IR is an unlicensed transfer. The
  KIHD healthy-user confound (`conflict-sauna-healthy-user`) stacks on top.
- **`conflict-contrast-therapy-recovery`** (`mostly-resolved-contested-benefit`) — meta (Bieuzen/Bleakley/Costello
  2013 `10.1371/journal.pone.0062356`, 18 trials, all high risk of bias): CWT beats *passive* recovery for
  soreness/strength loss through 96h, but shows **little/no superiority over** cold-water/warm-water/compression/
  active recovery/stretching → a non-specific, placebo-grade effect, oversold. Cold phase can also blunt
  hypertrophy (links `conflict-cold-after-resistance`).
- **`conflict-foam-rolling-efficacy`** (`mostly-resolved-small-short-lived`) — meta (Wiewelhove et al. 2019
  `10.3389/fphys.2019.00376`, 21 studies): small acute gains (sprint +0.7%, g≈0.28; flexibility +4.0%) + reduced
  soreness, but transient and NOT structural ("myofascial release" unsupported; acute ROM is neural/stretch-
  tolerance). Safe, mildly useful warm-up/recovery aid; good pre-activity alternative to long static holds
  (links `conflict-static-stretch-performance`).

CONFLICTS.md total: **24 → 27** conflict objects.

## 2. Yoga / meditation evidence graded → `02-domains/I-claims.json` (+ note in `I-sleep-circadian.md`)

Yoga had movement-library coverage but no graded Domain I evidence. **4 claims added** (16 → 20 claims):

| id | Tier | Primary | DOI | Headline |
|---|---|---|---|---|
| `yoga-hrv-vagal-increase` | `meta` (weak content) | Tyagi & Cohen, Int J Yoga 2016 | 10.4103/0973-6131.183712 | Yoga ↑ HRV / vagal tone across 59 studies; authors caution evidence is poor-quality/premature |
| `yoga-blood-pressure-meta` | `meta` | Cramer et al., Am J Hypertens 2014 | 10.1093/ajh/hpu078 | Yoga lowers BP (SBP −9.65, DBP −7.22 mmHg) vs usual care; GRADE very-low, I²~90% |
| `yoga-stress-mood-rct-review` | `meta` | Pascoe & Bauer, J Psychiatr Res 2015 | 10.1016/j.jpsychires.2015.07.013 | RCTs: yoga ↓ stress markers (cortisol) + ↑ mood; heterogeneous |
| `mindfulness-meditation-physiological-stress-meta` | `meta` | Pascoe et al., J Psychiatr Res 2017 | 10.1016/j.jpsychires.2017.08.004 | Meditation ↓ cortisol/CRP/SBP/HR/triglycerides (45 controlled studies) — strongest of the set |

Honest framing carried on every claim: all are **surrogate/biomarker** outcomes (HRV, cortisol, BP), not hard
endpoints; the yoga-specific evidence is weaker/more heterogeneous than the meditation meta; seated meditation ≠
physical yoga (don't assume transfer). New §4a in `I-sleep-circadian.md` bridges the movement-library yoga
demonstrations to the autonomic axis.

## 3. Araújo 10-second balance → mortality added → `02-domains/L-claims.json`

**1 claim added** (19 → 20 claims):

- **`one-leg-stance-10s-mortality`** (`cohort`) — Araújo et al., Br J Sports Med 2022, `10.1136/bjsports-2021-105360`.
  Inability to hold a 10-s one-legged stance: adjusted **HR 1.84 (95% CI 1.23-2.78)** for all-cause mortality;
  1702 adults 51-75y (CLINIMEX, Brazil), median 7y follow-up; adds prognostic value beyond age/sex/BMI/comorbidity
  (IDI). Completes the five "movement biomarkers" set alongside gait speed (`gait-speed-survival-studenski`),
  capability battery (`physical-capability-battery-mortality-meta`), sit-to-rise (`sit-to-rise-mortality`, J),
  and grip strength (E). Reverse-causation caveat recorded.

**Brito sit-to-rise:** already in corpus as `sit-to-rise-mortality` (`02-domains/J-claims.json`,
`10.1177/2047487312471759`) — verified present, not re-added.

## 4. Stale markers refreshed → `03-movement-library/MOVEMENT-EVIDENCE.md`

Updated the single-leg-balance row ("not yet in corpus" → graded `one-leg-stance-10s-mortality`), the yoga row
("pairing pending" → 4 graded Domain I claims), the cross-domain biomarker list, and checked off all three
"TODO for next wave" items.

## Provenance / data

- Source: OpenAlex (direct-DOI), `mailto=gianyrox@gmail.com`. No `curl|python3` piping (hook-blocked): raw saved
  to scratch, parsed separately, archived to `_intake-raw/openalex/`.
- Raw files archived: `10_1136_bjsports-2021-105360.json`, `10_4103_0973-6131_183712.json`, `10_1093_ajh_hpu078.json`,
  `10_1016_j_jpsychires_2015_07_013.json`, `10_1016_j_jpsychires_2017_08_004.json`, `10_1371_journal_pone_0062356.json`,
  `10_3389_fphys_2019_00376.json` (+ `10_1016_j_mayocp_2018_04_008` already present from prior waves).
- Validation: `I-claims.json` (20) + `L-claims.json` (20) parse clean; all 27 embedded JSON blocks in CONFLICTS.md valid.
