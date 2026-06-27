# Domain B — Summary (Wave 1, 2026-06-27)

**Deliverables written:**
- `02-domains/B-aging-mechanisms.md` — human-readable, organized by mechanism.
- `02-domains/B-claims.json` — **38 graded claims** (schema-conformant).
- `06-evidence/CONFLICTS.md` — **6 first-class conflicts** (created; was empty).
- `00-map/discovered-aging.md` — random-walk node index (created).

## Claims by evidence tier (38 total)
| Tier | Count | Note |
|---|---|---|
| `rct` | 4 | everolimus immune (Mannick), NR NAD+ (Martens), CALERIE CR, D+Q IPF pilot — **all surrogate/pilot endpoints, none hard-outcome** |
| `cohort` | 7 | PhenoAge, GrimAge, DunedinPACE, inflammaging, telomere, metformin, centenarian GWAS |
| `case-control` | 2 | FOXO3A, APOE (longevity genetics) |
| `mechanistic` | 10 | both hallmarks papers, mTOR/AMPK/sirtuins, autophagy, mito, Horvath clock |
| `animal` | 12 | rapamycin, daf-2, p16 clearance, senolytics (Xu/fisetin), reprogramming (Ocampo/Lu), CR primate × 3, IIS |
| `invitro` | 2 | D+Q discovery, Yamanaka iPSC |
| `theoretical` | 1 | TAME trial design |

## Claims by type
- `outcome` 23 · `mechanism` 14 · `protocol` 1.
- **Mechanism/outcome discipline enforced:** every mouse lifespan result is tagged `animal` (not laundered to human outcome); every human RCT here is flagged as a **surrogate** in `confidence_notes` (vaccine titer, NAD+ level, cardiometabolic markers, 6-min-walk) — **zero hard-endpoint human longevity claims exist in the literature and the file says so.**

## Top conflicts (all logged in CONFLICTS.md)
1. **CR primate survival** — Wisconsin (positive) vs NIA (null); partially resolved (context-dependent).
2. **NAD+ precursor efficacy** — surrogate proven, outcome unproven (open).
3. **Resveratrol/SIRT1** — direct activator vs assay artifact (open, leans skeptic).
4. **Rapamycin dosing** — geroprotective window vs immunosuppression (open).
5. **Free-radical theory / mitohormesis** — mostly resolved *against* the naive antioxidant view (closest to `meta`).
6. **Metformin geroprotection** — confounded cohort + exercise-interference vs TAME premise (open).

## Canon cross-links made (UP to bucket-canon/05-biophysics)
mTOR-as-CR-mimetic, AMPK, sirtuins/NAD+, autophagy decline, **mitochondrial dysfunction** (primary link: mitochondria/redox/electron-transport), rapamycin lifespan. Redox conflict explicitly flagged as a live biophysics-canon question.

## Gaps for Wave 2 (priority order)
1. **No `meta`-tier claim yet.** Pull Cochrane/meta on antioxidants (to close the free-radical conflict), TRE/IF meta-analyses, and any senolytic/exercise meta.
2. **Three hallmarks under-built:** loss of proteostasis, stem-cell exhaustion, dysbiosis (gut–aging) need their own claims.
3. **Altered intercellular communication** — parabiosis / young plasma / GDF11 (Conboy, Wyss-Coray) not yet carded; controversial → conflict candidate.
4. **NAD+ depth:** NMN human RCTs, NR vs NMN bioavailability; finish the precursor conflict.
5. **Autophagy inducers with human data:** spermidine (Eisenberg), urolithin A (mitophagy, has muscle RCTs).
6. **Reprogramming safety:** teratoma/identity-loss data; industry (Altos/NewLimit/Retro/Turn) → Domain K.
7. **Trials to watch → Domain K:** PEARL (rapamycin), Dog Aging Project, TAME funding status.
8. **Evolutionary foundations** (antagonistic pleiotropy, disposable soma — Williams/Kirkwood) sit near canon; decide placement.
9. **People carding:** ~30 figures surfaced in `discovered-aging.md` → push to `01-people/` in canon-figures schema.

## Provenance method
All DOIs verified via OpenAlex (direct DOI lookup or cited-by-desc search), `mailto=gianyrox@gmail.com`.
Landmark papers confirmed by title+author+year+citation count. No `curl|python3` (hook-safe: saved to /tmp, parsed separately). Random walk followed citations from López-Otín 2013 → nutrient-sensing → senescence → reprogramming → CR primate conflict → longevity genetics.
