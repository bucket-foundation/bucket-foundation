# Domains K + J — Labs / Trials / Protocols build — Summary (2026-06-27)

## Deliverables written
| File | What | Count |
|---|---|---|
| `05-labs/LABS.md` | Human-readable labs/funding map (academic · industry · funders) | 24 orgs |
| `05-labs/labs.json` | Machine file, schema-shaped, OpenAlex-grounded where available | 24 orgs |
| `05-labs/TRIALS.md` | Aging/longevity trial landscape, endpoint-flagged | 15 trials + TAME design |
| `05-labs/trials.json` | Machine file, per-NCT detail + endpoint_type | 15 records |
| `04-protocols/bryan-johnson-blueprint.md` | Blueprint/Don't Die recipe (tier-neutral) | — |
| `04-protocols/peter-attia-medicine3.md` | Medicine 3.0 / Centenarian Decathlon framework + recipe | — |
| `04-protocols/rhonda-patrick-stack.md` | FoundMyFitness micronutrient stack recipe | — |
| `02-domains/J-claims.json` | Graded efficacy claims, separated from the recipes | 10 claims |
| `00-map/discovered-labs.md` | Random-walk node index (people/orgs/trials) | ~35 nodes |

## Labs map (Domain K)
- **9 academic/nonprofit benches** (Buck, Salk, Harvard, Stanford-Wyss-Coray, UW-Kaeberlein/Pollack,
  Berkeley-Conboy, Tufts-Levin/CALERIE, Einstein-Barzilai, USC-Longo) — all OpenAlex-ID'd + cross-ref'd
  to existing people cards.
- **9 industry** (Altos, Calico, Retro, NewLimit, BioAge, Unity, Loyal, Gero, Rejuveron).
- **6 funders/government** (NIA, Hevolution, SENS/LEV, Methuselah, Astera, Impetus) + AFAR noted.
- **Biophysics bridge flagged:** Pollack (EZ water, UW) + Levin (bioelectricity, Tufts) carry the
  fringe-to-canon A-branch nodes UP to `bucket-canon/05-biophysics` — both queued for people cards.
- **Two loud negative datapoints kept:** Unity UBX0101 knee-OA Phase-2 failure; Calico's ~$2.5B / 10+yr
  low public clinical output. **One positive wedge:** Loyal's FDA RXE for a canine aging drug (2023).

## Trials (Domain K) — the central finding
**Every active human aging/longevity trial uses a SURROGATE endpoint** (body comp, VO2max, gait speed,
endothelial function, inflammatory/epigenetic clock, oxidative-stress markers, CSF amyloid). **Only TAME
proposes a HARD composite morbidity/mortality endpoint — and TAME is still unfunded and unregistered**
(the metformin-aging search returns CALERIE-Legacy, not TAME). This exactly mirrors the Domain-B finding
that zero hard-endpoint human longevity claims exist in the literature. Endpoint type is flagged on every
record in `trials.json` (`endpoint_type`: SURROGATE vs HARD). Sponsor COIs (AgelessRx, Amazentis, Metro
Intl Biotech, L-Nutra) recorded per-trial.

## Protocols (Domain J) — protocol ≠ evidence, enforced
The three practitioner files record **only the recipe** (tier-neutral). Every efficacy assertion was
pulled out into `02-domains/J-claims.json` and graded:
- `protocol-not-evidence-axiom` (the methodological rule, made a first-class object).
- Blueprint: `bj-pace-of-aging` (nequals1, mixed), `bj-rapamycin-discontinued` (nequals1, refutes —
  a self-reported NEGATIVE that conflicts with the mouse rapamycin lifespan claim).
- Attia: `attia-vo2max-mortality` (cohort, the strongest pillar — Mandsager 2018), `attia-strength-mortality`
  (cohort, PURE), `attia-protein-muscle` (cohort, **mixed** — conflicts with Longo on protein/mTOR).
- Patrick: `rp-omega3-mixed` + `rp-vitd-mixed` (meta, both **mixed** outcomes), `rp-sulforaphane-mechanism`
  (mechanistic — flagged NOT outcome), `rp-sauna-cohort` (Laukkanen, the SCHEMA example).

## Cross-links established
- People ↔ institution index in `LABS.md` (Verdin/Campisi→Buck, Sinclair/Gladyshev/Church→Harvard, etc.).
- Trials ↔ labs (PEARL→AgelessRx, CALERIE→Tufts, fisetin→Mayo/CU, TPE→Conboy thesis, TAME→Einstein/AFAR).
- J-claims ↔ existing conflicts (`conflict-protein-mtor`) and B-claims (`mtor-rapamycin-mouse-lifespan`).
- Biophysics A-branch ↔ bucket-canon/05-biophysics (Pollack, Levin).

## Provenance / method
- OpenAlex institutions API (`mailto=gianyrox@gmail.com`) for 13 orgs (IDs, works/citation counts);
  private startups (Retro, NewLimit, BioAge, Loyal, Gero, Rejuveron, Hevolution, Impetus) grounded from
  established public record (not OpenAlex-indexed).
- ClinicalTrials.gov API v2: 10 topic searches + 14 per-NCT detail pulls.
- Hook-safe throughout: every `curl` saved to a /tmp file, parsed in a separate `python3` step (no `curl|python3`).
- Raw dumps archived to `_intake-raw/openalex/` (22) and `_intake-raw/clinicaltrials/` (24) for idempotent re-runs.

## Gaps / next wave
1. Card Pollack, Levin, Cuervo, Lithgow, Shadel, van Deursen, Fedichev (+ founders) — in `discovered-labs.md`.
2. Consider a first-class CONFLICTS object: **"what is aging — rate-slowing vs damage-repair vs
   information/reprogramming"** (the three funding/industry clusters are three theories of aging).
3. Re-check TAME funding/NCT status on next run.
4. GLP-1 ↔ longevity overlap (BioAge pivot, biological-aging-in-weight-loss trials) deserves a D/K bridge.
5. Veterinary trials (Dog Aging Project/TRIAD, LEV Robust Mouse Rejuvenation) tracked separately from the human registry.
