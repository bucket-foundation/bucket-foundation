# SAM.gov Registration Prep — Three Parallel Filings

**Bead:** bkt-040
**Date:** 2026-05-04
**Goal:** File SAM.gov entity registrations for **AGFarms LLC**, **Bucket Foundation**, and **MamaTeeTees** in parallel during week of 2026-05-04. SAM is the gating dependency for every federal grant (NSF, NOAA, NIH, USDA, USAID).

**Cost:** $0 per entity. There is no fee. Ignore third-party "SAM filing services" — they charge $500–$2,000 for a free service.

**Realistic timeline (per entity, all parallel):**
- Day 0: Login.gov account + start registration at https://sam.gov/entity-registration
- Day 0–2: Get UEI (Unique Entity ID) — assigned ~immediately after entity validation
- Day 3–14: Entity validation (legal name + address must match IRS/state records exactly)
- Day 7–21: IRS TIN match (1–10 business days; can be slow)
- Day 14–35: CAGE code assignment by DLA (5–7 business days after SAM submits)
- **Total: 4–8 weeks to "Active" status.** File now even if grant target undecided.

**Key URLs:**
- Registration: https://sam.gov/entity-registration
- Login.gov: https://secure.login.gov
- Checklist (official): https://alpha.sam.gov/sites/default/files/2024-10/entity-checklist.pdf
- NAICS lookup: https://www.census.gov/naics/
- NSF UEI guidance: https://seedfund.nsf.gov/how-to-submit/unique-entity-id/

---

## Universal Required Information (per entity)

For each entity collect, BEFORE starting:

1. **Legal entity name** — must EXACTLY match IRS letter / state articles. One character mismatch = validation rejection + 2-week loop.
2. **EIN** — 9 digits, from IRS CP-575 letter or SS-4 confirmation.
3. **Physical address** — street address (no PO box for primary). Must match IRS records.
4. **Mailing address** — can differ from physical.
5. **Date of incorporation/formation** — from state filing.
6. **State of incorporation** — for legal authority.
7. **Entity structure** — LLC, 501(c)(3) nonprofit, etc.
8. **Business purpose / activity description** — 1–2 sentences.
9. **NAICS codes** — primary + up to ~10 secondary. See below.
10. **Bank info for EFT** — routing # + account # + account holder name (federal payments must go EFT).
11. **Authorized representative** — name, title, phone, email (typically founder).
12. **Government POC + Electronic Business POC** — usually same person for small entities.
13. **Notarized letter** — NO LONGER REQUIRED as of April 2022 for new registrations (verify on sam.gov before filing; some edge cases still trigger it).

---

## Common NAICS Codes for AGFarms Portfolio

Pick a primary + 2–4 secondary per entity. Multiple is fine and broadens grant eligibility.

| NAICS | Description | Use for |
|---|---|---|
| **541511** | Custom Computer Programming Services | All three (software work) |
| **541512** | Computer Systems Design Services | AGFarms LLC, Bucket |
| **541715** | R&D in Phys/Eng/Life Sciences (not biotech) | AGFarms (NSF SBIR), Bucket |
| **541714** | R&D in Biotechnology (except nanobiotech) | AGFarms (Kala/marine), Bucket |
| **541720** | R&D in Social Sciences and Humanities | Bucket (canon/research infra) |
| **519290** | Web Search Portals, Libraries, Archives | Bucket |
| **611710** | Educational Support Services | MamaTeeTees, Bucket |
| **624190** | Other Individual & Family Services | MamaTeeTees |
| **813211** | Grantmaking Foundations | Bucket (post-c3), MamaTeeTees |
| **813219** | Other Grantmaking & Giving Services | MamaTeeTees |
| **611699** | All Other Misc Schools and Instruction | MamaTeeTees |
| **114111** | Finfish Fishing | AGFarms (DerbyFish/Kala research) |

---

## Entity 1 — AGFarms LLC (READY TO FILE)

| Field | Value | Source |
|---|---|---|
| Legal name | **AG Farms LLC** (verify exact form on DE certificate of formation) | Delaware Articles |
| EIN | Look in `~/.env` ops vault, or pull from 2024 federal return / Stripe Atlas onboarding email | IRS CP-575 |
| State of formation | Delaware | DE Division of Corporations |
| Physical address | Founder's primary address — confirm with Gian (NJ or NY) | — |
| Entity structure | Limited Liability Company (member-managed) | DE certificate |
| Primary NAICS | **541511** Custom Computer Programming | — |
| Secondary NAICS | 541715, 541512, 114111, 541720 | — |
| Bank EFT | Mercury or Stripe Atlas account | Mercury dashboard |
| Authorized rep | Gianangelo Dichio, Founder/Member | — |

**Status:** READY. All facts known or quickly retrievable. **File first.**

**Use cases unlocked:** NSF SBIR (DerbyFish, multiple ventures), NOAA Saltonstall-Kennedy, USDA, state EDA programs.

---

## Entity 2 — MamaTeeTees (READY TO FILE)

| Field | Value | Source |
|---|---|---|
| Legal name | **MamaTeeTees Inc.** (or exact form on IRS determination letter) | IRS 501(c)(3) det. letter |
| EIN | On IRS determination letter; in `mamateetees/` if cloned, or request from board | IRS det. letter |
| State of incorporation | (verify — likely NJ; check articles) | State articles |
| Entity structure | 501(c)(3) Nonprofit Corporation | IRS det. letter |
| Physical address | Registered agent / principal office address | State filing |
| Primary NAICS | **624190** Other Individual & Family Services | — |
| Secondary NAICS | 611710, 813219, 611699 | — |
| Bank EFT | MamaTeeTees operating account | Treasurer |
| Authorized rep | Confirm w/ board chair (likely Gian or co-founder) | — |

**Status:** READY pending pull of EIN + state filing details from `~/agfarms/mamateetees/`.

**Use cases unlocked:** USAID, State Department education grants, federal pass-through, GlobalGiving Accelerator (federal match).

---

## Entity 3 — Bucket Foundation (BLOCKED — see workaround)

**This is the hard case.** Per `nonprofit-application/00-BASE-INFO-MEMO.md`:
- No EIN exists yet (G-1).
- No state of incorporation chosen (G-4 — packet defaults to DE, memo recommends NY/NJ).
- No board (G-2).
- No bylaws (G-3).
- Held in founder's personal capacity.

### Can a personal-capacity unincorporated entity register on SAM?

**No, not as "Bucket Foundation."** SAM.gov entity validation (run by Dun & Bradstreet/SAM via the Entity Validation Service) requires the legal name + address to match a verifiable government record (IRS EIN registration OR state business filing OR local business license). An unincorporated personal project has none of these.

**Three workaround options (ranked):**

#### Option A — File with HCB as fiscal sponsor (RECOMMENDED for short-term)
HCB / The Hack Foundation is an established 501(c)(3) (EIN: **81-2908499**, look up at https://apps.irs.gov/app/eos/) with active SAM registration. Once Bucket onboards as a sponsored project, **The Hack Foundation is the legal applicant for federal grants**, and "Bucket Foundation" is named as the project. **No separate Bucket SAM registration needed for Path A.** This is exactly how HCB-sponsored projects access federal funds today.

- Pro: Zero filing work. Unblocks ESP / Sloan / Templeton / federal-pass-through immediately.
- Con: NSF rules typically require the **prime applicant** to be the c3 directly; HCB-as-sponsor satisfies this for many but not all federal programs. Confirm per-NOFO.

#### Option B — Get EIN via SS-4 immediately, even pre-incorporation
Form SS-4 can be filed for a "trust or other entity" or as a sole-proprietor DBA. **Apply online at https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online** — instant EIN issued in ~10 minutes for domestic applicants. Then SAM-register as either:
- (i) sole proprietor "Gianangelo Dichio DBA Bucket Foundation" (requires DBA / fictitious name filing in founder's home state — NJ ~$50, NY county-level filing) OR
- (ii) wait for state nonprofit incorporation, then file SS-4 with the entity name.

- Pro: Standalone Bucket SAM registration. Cleaner for NSF prime.
- Con: Requires (a) incorporation decision (G-4) + (b) state filing (~1–4 weeks) + (c) THEN SS-4 + (d) THEN SAM (4–8 weeks). **8–14 week total path.**

#### Option C — File AGFarms LLC SAM, bridge Bucket grants under AGFarms umbrella
Disqualified for c3-restricted grants. Skip.

### Recommended Bucket SAM Path

**Parallel-track both Path A and Path B.**

- **This week (2026-05-W1):** Apply to HCB (Path A — see `hcb-application-packet.md`). This unlocks federal access in ~1 week.
- **Within 30 days:** Founder picks NY vs NJ incorporation (per memo §4.2), files state nonprofit articles, files SS-4 for EIN, then files Bucket-Foundation SAM under its own EIN. This puts Bucket on track for **late-July 2026 SAM-active** status — in time for FY27 NSF POSE cycle.

### Bucket SAM filing inputs (assemble while incorporation pending)

| Field | Plan |
|---|---|
| Legal name | "Bucket Foundation" (or "Bucket Foundation Inc." per state requirements) — NY requires "Inc." or "Corp."; NJ allows "Foundation" alone |
| EIN | Apply via SS-4 online same day as state filing approval |
| State | Decide NY vs NJ this week (memo §4.2 leans home-state of founder) |
| Physical address | Founder's domicile (not AGFarms address — keep COI separation per memo §6) |
| Entity structure | Nonprofit Corporation (post-incorporation) |
| Primary NAICS | **541720** R&D in Social Sciences & Humanities |
| Secondary NAICS | 541715, 519290, 813211, 541511 |
| Bank EFT | Mercury or local credit union nonprofit account (open after EIN) |
| Authorized rep | Gianangelo Dichio, Founder/Director |

---

## Recommended Filing Sequence (Week of 2026-05-04)

| Day | Action | Owner |
|---|---|---|
| Mon | Pull AGFarms EIN + DE cert from ops vault. Pull MamaTeeTees EIN + state docs. Founder confirms domicile state. | Gian |
| Mon | Create login.gov account (use ops@agfarms.dev or founder personal) | Gian |
| Tue | Start AGFarms LLC SAM registration | Gian |
| Tue | Start MamaTeeTees SAM registration (parallel session) | Gian or MTT board chair |
| Wed | Submit HCB application for Bucket (see `hcb-application-packet.md`) | Gian |
| Thu | Bucket NY-vs-NJ incorporation decision; file state articles | Gian |
| Fri | Once state approves (1–2 weeks NJ, 1–4 weeks NY), file SS-4 instant EIN, then file Bucket SAM | Gian |

**Verification once Active:**
```
curl -s "https://api.sam.gov/entity-information/v3/entities?ueiSAM=<UEI>&api_key=<KEY>"
```

## Sources
- [SAM.gov Entity Registration](https://sam.gov/entity-registration)
- [SAM.gov Entity Checklist PDF](https://alpha.sam.gov/sites/default/files/2024-10/entity-checklist.pdf)
- [NSF SBIR UEI guidance](https://seedfund.nsf.gov/how-to-submit/unique-entity-id/)
- [SAM.gov Registration in 2026 — Funding Landscape](https://fundinglandscape.com/answers/sam-gov-registration-guide-2026)
- [IRS EIN Online Application](https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online)
- [Grants.gov Applicant Registration](https://www.grants.gov/applicants/applicant-registration)
