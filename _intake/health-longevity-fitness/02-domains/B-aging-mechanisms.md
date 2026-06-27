# Domain B — Hallmarks & Mechanisms of Aging

> **Status:** v0.1 (Wave 1) — 2026-06-27. Graded claim set; companion data in `B-claims.json` (38 claims).
> **Discipline:** mainstream geroscience spine. This is the **outcome/application layer** — where a
> mechanism rests on a foundation (mitochondria, redox, electron transport), it carries a `canon_link`
> up to `bucket-canon/05-biophysics/`.
>
> **The one rule that governs this file:** a *mechanism* claim is never laundered into an *outcome*
> claim. "Rapamycin inhibits mTOR" (mechanism, certain) is not "rapamycin extends human lifespan"
> (outcome, unproven). Almost every piece of longevity hype lives in that gap. Tiers below are explicit
> so the reader can see exactly how far each claim is from a human hard endpoint.

## How to read the tiers (descending rigor)
`meta` > `rct` > `cohort` > `case-control` > `mechanistic` > `animal` > `invitro` > `theoretical`.
A mouse lifespan result is `animal` no matter how clean. A human vaccine-titer RCT is `rct` but its
*outcome* is a surrogate, not lifespan. Read the `confidence_notes` in `B-claims.json` — they carry the
caveats.

---

## 0. The organizing framework — the Hallmarks of Aging

- **López-Otín et al., *The Hallmarks of Aging*, Cell 2013** (`10.1016/j.cell.2013.05.039`, ~15k cites) —
  nine hallmarks: genomic instability, telomere attrition, epigenetic alterations, loss of proteostasis,
  deregulated nutrient sensing, mitochondrial dysfunction, cellular senescence, stem-cell exhaustion,
  altered intercellular communication. Modeled deliberately on Hanahan & Weinberg's *Hallmarks of Cancer*.
- **López-Otín et al., *Hallmarks of aging: an expanding universe*, Cell 2023** (`10.1016/j.cell.2022.11.001`) —
  twelve hallmarks: adds **disabled macroautophagy, chronic inflammation (inflammaging), dysbiosis**.
  Grouped as **primary** (damage), **antagonistic** (responses gone bad), **integrative** (phenotype drivers).

This is a **taxonomy, not a unified causal theory** (`evidence_tier: mechanistic`). It is the spine everything
else hangs on, but it does not by itself prove what causes aging.

---

## 1. Nutrient-sensing pathways (the most actionable hallmark)

| Pathway | Core claim | Tier | Key paper |
|---|---|---|---|
| **mTOR** | Rapamycin from late life extends mouse lifespan (+9-14%) | `animal` (outcome) | Harrison et al., Nature 2009 `10.1038/nature08221` |
| **mTOR** | Central nutrient/growth sensor; inhibition phenocopies CR | `mechanistic` | Panwar 2023 review |
| **mTOR** | Everolimus improved elderly flu-vaccine response (human) | `rct` (surrogate outcome) | Mannick et al., Sci Transl Med 2014 `10.1126/scitranslmed.3009892` |
| **AMPK** | Energy sensor (AMP:ATP); proposed CR/metformin/exercise mediator | `mechanistic` | Hardie et al., Nat Rev Mol Cell Biol 2012 `10.1038/nrm3311` |
| **Sirtuins/NAD+** | NAD+ declines with age, lowering sirtuin activity | `mechanistic` | Imai/Guarente; Kanfi 2012 |
| **NAD+ precursor (NR)** | Raises blood NAD+ ~60% in humans; NO disease/longevity outcome | `rct` (surrogate, mixed) | Martens et al., Nat Commun 2018 `10.1038/s41467-018-03421-7` |
| **IGF-1/insulin (IIS)** | *daf-2* mutation doubles worm lifespan via FOXO/*daf-16* | `animal` (outcome) | Kenyon et al., Nature 1993 `10.1038/366461a0` |

**Watch the gap:** Harrison 2009 is a genuine, replicated **lifespan** result — but in **mice**. Mannick 2014
is a genuine **human RCT** — but the outcome is a **vaccine antibody titer**, not lifespan. The NAD+/NR story
has a proven **surrogate** (NAD+ goes up) and an **unproven outcome** (no hard endpoint moved). These three
are routinely conflated in popular media.

---

## 2. Cellular senescence & senolytics

- **Mechanism:** senescent cells (irreversible arrest + pro-inflammatory SASP) accumulate with age
  (Hernandez-Segura 2018, `10.1016/j.tcb.2018.02.001`). Note senescence is *also* anti-cancer and pro-wound-healing —
  context-dependent, not purely bad.
- **Causal proof in mice:** genetic clearance of p16Ink4a+ cells delays pathology (Baker 2011, `10.1038/nature10600`)
  and extends median lifespan ~25-27% in naturally aged mice (Baker 2016, `10.1038/nature16932`). These use a
  *genetic ablation tool*, not a drug.
- **Senolytic drugs:**
  - **D+Q (dasatinib + quercetin):** discovered via pro-survival "SCAP" targeting (Zhu 2015, `10.1111/acel.12344`, `invitro`);
    improved function + extended post-treatment lifespan ~36% in old mice (Xu 2018, `10.1038/s41591-018-0092-9`, `animal`).
  - **Fisetin:** senotherapeutic, extends median+max mouse lifespan even started late (Yousefzadeh 2018, `10.1016/j.ebiom.2018.09.015`, `animal`).
  - **First-in-human:** D+Q open-label IPF pilot, n=14, improved 6-min walk (Justice 2019, `10.1016/j.ebiom.2018.12.052`).
    **Uncontrolled pilot — not efficacy.** Larger RCTs ongoing.

Senolytics are the strongest *animal* longevity story in the file. The human evidence is one tiny open-label pilot.
Supplements (fisetin, quercetin) are sold on the strength of mouse data — grade accordingly.

---

## 3. Autophagy (Ohsumi, Nobel 2016)

- Yeast screens defined the **ATG machinery** of macroautophagy (Tsukada & Ohsumi 1993; Mizushima review `10.1101/gad.1599207`).
- Macroautophagy **declines with age**; it is **required downstream** of CR, rapamycin, and spermidine for their
  longevity effects, and "disabled macroautophagy" is a 2023 hallmark. `mechanistic`/`animal` — no established human
  autophagy-induction *outcome*. Cross-links to biophysics (mitophagy/redox).

---

## 4. Epigenetic clocks & reprogramming

**Clocks (biomarkers — correlation, not causation of aging):**
| Clock | What | Tier | Paper |
|---|---|---|---|
| **Horvath 2013** | 353-CpG multi-tissue age predictor, MAE ~3.6y | `mechanistic` (biomarker) | `10.1186/gb-2013-14-10-r115` |
| **PhenoAge (Levine 2018)** | Trained on clinical phenotype; predicts mortality | `cohort` | `10.18632/aging.101414` |
| **GrimAge (Lu 2019)** | DNAm protein surrogates; best mortality predictor | `cohort` | `10.18632/aging.101684` |
| **DunedinPACE (Belsky 2022)** | *Rate* of aging from one sample | `cohort` | `10.7554/elife.73420` |

First-gen clocks (Horvath) are trained on **chronological age** → they correlate, they don't prove methylation
*drives* aging. Second-gen (PhenoAge/GrimAge/DunedinPACE) predict **outcomes** but remain **observational**.
They are increasingly used as **surrogate endpoints** in trials before mortality data can exist — a methodological
bet, not a validated equivalence.

**Reprogramming (the frontier):**
- **Yamanaka factors** (OSKM) reprogram somatic cells to iPSCs, resetting epigenetic age (Takahashi & Yamanaka 2006,
  `10.1016/j.cell.2006.07.024`, Nobel 2012). Full reprogramming erases cell identity / causes teratomas → motivates *partial*.
- **Partial reprogramming** ameliorates aging hallmarks + extends lifespan in *progeroid* mice (Ocampo 2016, `10.1016/j.cell.2016.11.052`).
- **OSK restores vision** in aged/glaucomatous mice — evidence aging carries *recoverable* epigenetic information (Lu/Sinclair 2020,
  `10.1038/s41586-020-2975-4`), the empirical basis of the **"information theory of aging."**

All `animal`. The central open hazard is **teratoma / loss of cell identity**; human work is early (Altos Labs, NewLimit, Retro Bio).

---

## 5. Caloric restriction / fasting

- **CR is the most reproducible non-genetic longevity intervention** in short-lived species (yeast→rodent),
  up to +50% rodent lifespan — but the magnitude is **strain/diet-dependent** and shrinks (even reverses) in some
  mouse genetic backgrounds. (de Cabo & Mattson, NEJM 2019, `10.1056/nejmra1905136`.)
- **The primate conflict (first-class — see CONFLICTS.md):**
  - Wisconsin (Colman 2009 `10.1126/science.1173635`; 2014 `10.1038/ncomms4557`): CR **reduced** age-related & all-cause mortality.
  - NIA (Mattison 2012 `10.1038/nature11432`): CR did **NOT** significantly extend survival.
  - Reconciliation (Mattison/Colman 2017 `10.1038/ncomms14063`): difference attributed to onset age, diet composition, sex,
    and how *control* monkeys were fed. CR's primate *outcome* is **context-dependent**, not universal.
- **Human CR RCT:** CALERIE-2 (~12% achieved CR, 2y) improved cardiometabolic markers and slowed DunedinPACE
  (Ravussin 2015; Waziry 2023). **Surrogate endpoints** — long-term mortality effect unknown.
- **Intermittent fasting:** metabolic switch to ketones + autophagy/circadian engagement (de Cabo & Mattson 2019).
  Human benefits are mostly metabolic and may reduce largely to caloric/weight effects.

---

## 6. Mitochondria, inflammaging, telomeres (hallmarks with caveats)

- **Mitochondrial dysfunction** — bioenergetic decline + ROS leak + impaired mitophagy. `mechanistic`; **primary UP-link to
  biophysics canon** (`bucket-canon/05-biophysics/`: mitochondria, redox, electron transport). The naive **free-radical /
  oxidative-damage theory is contested** (mitohormesis: low ROS can be *beneficial*) — see CONFLICTS.
- **Inflammaging** (Franceschi) — chronic sterile low-grade inflammation; IL-6/CRP/TNF predict frailty & mortality
  (`cohort`). Cause-vs-consequence is debated.
- **Telomere attrition** — solid as a *hallmark mechanism*; but short leukocyte telomere length as a *mortality biomarker*
  is **modest and confounded** (Mendelian-randomization signals are bidirectional with cancer). Popular framing overstates it.

---

## 7. (touch into Domain C) Longevity genetics

Full set in `B-claims.json` tagged `domain: C-genetics`; deeper build belongs in `C-genetics.md`.
- **FOXO3A** — most replicated longevity gene after APOE; human ortholog of worm *daf-16* (Willcox 2008, `10.1073/pnas.0801030105`). `case-control`.
- **APOE** — ε4 shortens lifespan / raises AD & CVD risk; ε2 enriched in centenarians (Deelen 2019, `10.1038/s41467-019-11558-2`). `case-control`.
- **Polygenic reality check** — lifespan heritability only ~10-25%; beyond APOE/FOXO3 most longevity-GWAS hits **don't replicate**.
  Most longevity is environmental/stochastic, not a few "longevity genes."
- **Metformin / TAME** — Bannister 2014 cohort (`10.1111/dom.12354`) is **observational and confounded** (immortal-time/prevalent-user);
  TAME (Barzilai, Cell Metab 2016 `10.1016/j.cmet.2016.05.011`) is a **trial *design*** whose real target is making "aging" an FDA endpoint
  — a `protocol`, not a result. See CONFLICTS.

---

## Cross-links
- **UP to canon:** mitochondria / redox / electron-transport claims → `bucket-canon/05-biophysics/`.
- **SIDEWAYS:** nutrient-sensing ↔ Domain D (metabolic/nutrition), CR/fasting ↔ Domain D, hormesis frame ↔ Domain H (thermal).
- **DOWN:** epigenetic clocks ↔ Domain L (measurement/biomarkers).

## Gaps flagged for Wave 2
See `_B-SUMMARY.md`. Headline gaps: proteostasis & stem-cell-exhaustion need own claims; no `meta`-tier claim yet
(all senolytic/CR human evidence is pilot/surrogate); dysbiosis hallmark un-built; spermidine/urolithin-A human data;
NAD+ NMN human RCTs; partial-reprogramming safety data.
