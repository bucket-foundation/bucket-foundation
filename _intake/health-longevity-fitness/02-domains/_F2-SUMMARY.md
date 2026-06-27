# Wave 5 Summary - F2: Yoga / Meditation / Mind-Body Lineages & Evidence

> Written 2026-06-27. Deepens Domains **F (Movement)**, **G (Breath)**, **I (Recovery/autonomic)** with the
> mind-body traditions and their graded evidence. Extends Wave 4 (yoga -> HRV/BP/stress) without duplicating it.

## What was added

**1. Lineages map** - `02-domains/F2-yoga-meditation-lineages.md`
- **Yoga** (9 traditions): Patanjali's Yoga Sutras (classical meditative root, NOT postures), Hatha,
  Krishnamacharya (modern root), Iyengar (alignment/props, most-studied), Ashtanga/Pattabhi Jois (athletic
  fixed series), Vinyasa flow, Yin, Kundalini (org-contested), Restorative. Each: origin / emphasis / what's
  measurable / key figure.
- **Meditation** (8 traditions): Vipassana/Insight, MBSR (Kabat-Zinn), MBCT, TM (Maharishi), Relaxation
  Response (Benson), Loving-kindness/metta, Zen, Yoga Nidra. Plus a contemplative-neuroscience measurement
  layer (Davidson, Lazar, Blackburn/Epel).
- Load-bearing publication-bias section: small/unblindable/expectancy-prone trials; TM allegiance bias;
  telomere over-reach; the movement+breath+attention "bundle problem"; lineage != evidence.

**2. People cards** - `01-people/cards/` + appended to `figures.json` (valid JSON, 180 figures total)
- 6 NEW: `patanjali`, `krishnamacharya`, `pattabhi-jois`, `kabat-zinn`, `herbert-benson`, `richard-davidson`.
- Iyengar was already carded (Wave 1) - extended via the lineage map, not duplicated.
- ~15 names appended to `00-map/discovered-people.md` (the 6 carded + evidence-anchor authors: Goyal, Epel,
  Jacobs, Lazar, Schneider, Anderson, Brook, Rees, Wallace).
- evidence_posture used: `fringe-to-canon` (Patanjali), `practitioner-n1` (Krishnamacharya, Jois),
  `clinical-translator` (Kabat-Zinn, Benson), `mainstream-rigorous` (Davidson).

**3. Graded claims** - appended to `02-domains/I-claims.json` (valid JSON, 30 claims total). 10 new, all
PRIMARY-sourced + Europe PMC-verified (DOI + PMID):
| id | source | tier | honest read |
|---|---|---|---|
| `mbsr-brain-immune-davidson` | Davidson & Kabat-Zinn, Psychosom Med 2003 | `rct` | small (n~41), wait-list, surrogate (antibody titer) |
| `goyal-meditation-meta-moderate` | Goyal, JAMA Intern Med 2014 | `meta` | THE deflator: moderate for anxiety/depression/pain, NO superiority over active treatments |
| `meditation-telomerase-retreat` | Jacobs & Epel, Psychoneuroendocrinology 2011 | `rct` | canonical over-reach; telomerase is a surrogate-of-a-surrogate |
| `benson-relaxation-response-hypometabolic` | Wallace & Benson, Am J Physiol 1971 | `mechanistic` | real acute physiology; mechanism not outcome |
| `lazar-meditation-cortical-thickness` | Lazar, NeuroReport 2005 | `cross-sectional` | n=35, self-selection unresolved |
| `tm-blood-pressure-meta` | Anderson, Am J Hypertens 2008 | `meta` | small real effect; allegiance bias |
| `aha-meditation-bp-statement` | Brook (AHA), Hypertension 2013 | `meta` | TM only "may be considered" IIB/B; others not recommended |
| `tm-cvd-events-rct-schneider` | Schneider, Circ CQO 2012 | `rct` | striking ~48% RRR but single allegiance-linked unreplicated trial |
| `cochrane-meditation-cvd-uncertain` | Rees (Cochrane) 2024 | `meta` | low/very-low certainty - the independent counterweight |
| `mbsr-psoriasis-phototherapy` | Kabat-Zinn, Psychosom Med 1998 | `rct` | clean small proof-of-principle (mind state -> objective skin endpoint) |

**4. Conflicts** - appended to `06-evidence/CONFLICTS.md` (32 inline JSON blocks all validate). 3 new:
- `conflict-meditation-telomere-overclaim` - telomerase association real, cellular-aging interpretation unestablished (open, leans skeptic).
- `conflict-tm-research-allegiance-bias` - TM CV benefits vs Maharishi-affiliated research; AHA IIB/B ceiling, Cochrane low-certainty floor (open/partially-resolved).
- `conflict-mindfulness-active-control` - mindfulness beats wait-list but not active treatments; grade by comparator (mostly-resolved, effect modest).

## The honest one-paragraph verdict
The mind-body literature is the corpus's clearest stress-test of "index all, grade everything." The
*physiology* is real and modest: meditation produces an acute relaxation response (Benson 1971), yoga and
mindfulness nudge HRV, blood pressure, cortisol and mood a little (Wave 4 + Goyal 2014), and MBSR can shift
brain/immune markers (Davidson 2003) - but almost always in small, unblindable, expectancy-prone, often
allegiance-funded studies. The two places hype most outruns evidence are **telomeres/"cellular aging"** and
**TM cardiovascular outcomes**, both now carded as conflicts. The single most useful citation for puncturing
over-claims is **Goyal 2014**: against active controls, meditation is a modest, broadly-as-good-as-other-options
stress/mood tool - not a superior cure, and certainly not a longevity intervention. Lineage is cultural
provenance; the grade lives on the primary study.

## Data provenance
All 10 claims + 3 conflicts verified against **Europe PMC** (DOI + PMID confirmed for every primary source).
OpenAlex not needed this wave. `curl|python3` hook respected (saved JSON to scratchpad, parsed separately).
No fabricated effect sizes - where a number wasn't directly confirmed it is qualified ("~", "on the order of").
</content>
