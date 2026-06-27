# Domain K — Labs, Institutions & Funding

> **Wave:** Labs/Trials build, 2026-06-27. Companion machine file: `labs.json` (24 orgs).
> **Cross-refs:** people → `01-people/cards/<id>.md`; trials → `TRIALS.md` / `trials.json`;
> claims that rest on these orgs' work → `02-domains/B-claims.json`.
> **Rule:** an institution's prestige is provenance, not evidence. A famous lab's mouse result is
> still `animal`-tier; a well-funded company's thesis is still unproven until a hard-endpoint
> human trial says otherwise. Grade the output, not the letterhead.

This is the **map of who does the work and who pays for it** — the structural layer under the
people map (Domain J/people) and the claims (Domain B). Three sub-layers: academic benches,
industry, and the funding/nonprofit substrate. OpenAlex institution IDs + works/citation counts
are recorded in `labs.json` where available (verified via the institutions API,
`mailto=gianyrox@gmail.com`).

---

## 1. Academic / nonprofit benches

| Lab | Type | Key people (→ card) | Focus | Notable output |
|---|---|---|---|---|
| **Buck Institute** (Novato CA) | nonprofit institute | Verdin, Campisi, Lithgow, Kennedy | Senescence/SASP, NAD+, proteostasis | SASP characterization; geroscience hypothesis |
| **Salk Institute** (La Jolla CA) | nonprofit institute | Panda, Izpisua Belmonte→Altos, Shadel | Circadian/TRE, partial reprogramming | Ocampo 2016 in-vivo reprogramming (Cell) |
| **Harvard / HMS** (Boston MA) | university | Sinclair, Gladyshev, Church, Wagers | Sirtuins/NAD+, clocks, comparative genomics | Lu 2020 OSK vision reset (Nature) |
| **Stanford — Wyss-Coray** | university | Wyss-Coray, Villeda→UCSF | Young plasma, organ aging clocks | Plasma-proteomic organ-age clocks (Nature 2023) |
| **UW — Kaeberlein / Pollack** (Seattle) | university | Kaeberlein→Optispan, Pollack | Rapamycin/mTOR, Dog Aging Project; EZ water | Dog Aging Project / TRIAD; 'Fourth Phase of Water' |
| **UC Berkeley — Conboy** | university | I. & M. Conboy | Parabiosis, blood dilution / TPE | Conboy 2005 stem-cell rejuvenation (Nature) |
| **Tufts — Levin / CALERIE** (Medford MA) | university | Levin (bioelectricity) | Bioelectric morphogenesis; human CR | Xenobots; CALERIE Legacy (NCT05651620) |
| **Albert Einstein** (Bronx NY) | medical school | Barzilai, Cuervo | Centenarian genetics, metformin/TAME, autophagy | TAME trial design; longevity-gene cohort |
| **USC Longevity Institute** (LA) | university | Longo | Fasting-mimicking diet, IGF-1 | FMD protocol; Laron-syndrome protection cohort |

**Biophysics bridge (UP to bucket-canon/05-biophysics):** three benches above carry the
fringe-to-canon biophysics nodes named in the ideal-state map's A-branch — **Pollack** (EZ/structured
water, UW), **Levin** (bioelectricity/morphogenetic fields, Tufts), and the mitochondrial-stress work
at Salk (Shadel). These are graded at the foundation layer, not the outcome layer.

## 2. Industry

| Company | Status | Thesis | Key people | Reality check |
|---|---|---|---|---|
| **Altos Labs** | private, ~$3B | Cellular rejuvenation reprogramming | Izpisua Belmonte, Horvath, Levine, Yamanaka (advisor) | Largest biotech launch ever; no product yet |
| **Calico** (Alphabet) | Alphabet+AbbVie, ~$2.5B | Basic biology of aging | Kenyon, Botstein | 10+ yrs, little public clinical output — cautionary |
| **Retro Biosciences** | private, ~$180M (Altman) | Reprogramming + autophagy + plasma | Betts-LaCroix | Early-stage |
| **NewLimit** | private, ~$240M | ML-guided epigenetic reprogramming | Armstrong, Byers, Davis | Publishes preprints; hepatocyte/T-cell programs |
| **BioAge Labs** | public (BIOA) | Human-biobank target discovery | Fortney | Pivoted to metabolic/obesity; azelaprag setback |
| **Unity Biotechnology** | public (UBX) | Senolytics | David, Campisi, van Deursen | UBX0101 knee-OA Ph2 **failed** (2020) → eye programs |
| **Loyal (Cellular Longevity)** | private, ~$150M | Dog lifespan drugs (IGF-1/metabolic) | Halioua | **FDA RXE** for a canine aging drug (2023) — regulatory first |
| **Gero** | private | Physics-of-aging / resilience modeling | Fedichev | DOSI resilience-limit paper; Pfizer partnership |
| **Rejuveron** | private (CH) | Senescence/regeneration portfolio | — | European node |

**Two negative datapoints worth keeping loud:** (1) **Unity UBX0101** — strong mouse p16-clearance
senescence biology (van Deursen, Nature 2011/2016) did **not** translate to the first human joint
trial. (2) **Calico** — ~$2.5B and 10+ years with minimal public clinical translation. Both are
evidence that bench-tier and industry-funding-tier signals do not equal outcome-tier proof.

**One positive regulatory wedge:** **Loyal's** FDA Center for Veterinary Medicine "reasonable
expectation of effectiveness" (2023) is the closest thing to a regulator treating **aging itself**
as a addressable indication — in dogs first.

## 3. Funding / nonprofit substrate

| Funder | Type | Mechanism | Notes |
|---|---|---|---|
| **NIA (NIH)** | government | Grants + ITP + BLSA + CALERIE + Dog Aging | The **ITP** is the field's gold-standard mouse-lifespan filter; ~$4.5B/yr, much Alzheimer's-earmarked |
| **Hevolution Foundation** | nonprofit (Saudi) | Grants + venture, up to ~$1B/yr pledged | Largest new healthspan funder; reshapes global funding |
| **SENS RF / LEV Foundation** | nonprofit | Damage-repair research; Robust Mouse Rejuvenation | de Grey; frontier-contested 'engineering' paradigm |
| **Methuselah Foundation** | nonprofit | Prizes (Mprize) + venture philanthropy | Original prize catalyst (2003); seeded Organovo, Oisin |
| **Astera Institute** | nonprofit | Focused Research Organizations (FROs), open science | Jed McCaleb; mechanism-design funder |
| **Impetus Grants** | nonprofit | Fast 'apply in a weekend' aging grants | Buterin/Open Phil-backed; lowers activation energy |
| **AFAR** | nonprofit | Administers TAME; New Investigator awards | American Federation for Aging Research |

**The funding fault line:** mainstream **geroscience** (slow the rate of aging; NIA/ITP/Buck/Einstein)
vs the **damage-repair / engineering** paradigm (SENS/LEV/Methuselah, de Grey) vs **reprogramming**
(Altos/Retro/NewLimit, big private capital). These aren't just different bets — they're different
**theories of what aging is**, which makes the funding map also a map of an open foundational conflict.

---

## People ↔ institution index (cross-ref)

Carded figures (`01-people/cards/`) and their primary institution here:
Verdin·Campisi → Buck · Panda·Izpisua-Belmonte → Salk · Sinclair·Gladyshev·Church·Wagers → Harvard ·
Wyss-Coray·Villeda → Stanford · Kaeberlein → UW/Optispan · Conboy → Berkeley · Barzilai → Einstein ·
Longo → USC · Horvath·Levine·Yamanaka·Izpisua-Belmonte → Altos · Kenyon → Calico · de-Grey → SENS/LEV.

**Uncarded but referenced (queue people cards):** Gerald Pollack (UW, EZ water), Michael Levin
(Tufts, bioelectricity), Ana Maria Cuervo (Einstein, CMA autophagy), Gordon Lithgow (Buck),
Gerald Shadel (Salk), Jan van Deursen (senescence/Unity), Peter Fedichev (Gero, physics of aging),
Celine Halioua (Loyal), Kristen Fortney (BioAge). Appended to `00-map/discovered-labs.md`.

---
*Companion: `trials.json` / `TRIALS.md` (active interventions these orgs run). Summary in `_SUMMARY.md`.*
