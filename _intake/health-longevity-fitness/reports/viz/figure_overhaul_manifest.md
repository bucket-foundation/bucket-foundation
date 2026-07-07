# Figure-Quality Overhaul — Manifest (Session 3)

Book-wide audit and upgrade of the Bucket Foundation figure set. Every change is
reproducible (a committed generator regenerates the PNG), house-style, and
evidence-honest. Real captured-data images were never stylized; nothing was
fabricated; every quantitative callout is graded or cited.

Nothing here is wired into `build_manual.py` yet — the `@@FIG:` markers for the
new figures are the next step, to be placed deliberately per chapter.

---

## 1. Provenance + quality audit (Phases 1)

**What was done.** Inventoried all **387 PNGs** in `media/figures/`, mapped each to
its generator in `reports/viz/*.py` by literal-slug scan, then ran a vision
quality audit (content type, house-style adherence, quality 1–5, legibility 1–5,
issues) over every figure.

**Provenance classes:**

| class | count | meaning |
|---|---|---|
| A — original house-style | 367 | has a generator in `reports/viz/`, drawn in the design system |
| B — borrowed/illustrative | 12 | open-license Wikimedia diagrams composited via `build_realmedia.py` |
| C — real captured data | 3 | histology micrographs — **must stay real, never stylized** |
| D — low quality / off-style | 1 | `F06-debunks` (unreadable strikethrough + tofu glyphs) |
| utility | 4 | contact sheets / design-system sheet (prom 0) |

**Quality distribution:** 323 at 5/5, 62 at 4/5, one at 3 (`RA13`, protected
histology — left untouched), one at 2 (`F06-debunks` — upgraded).

**Deliverables:**
- `figure_provenance_index.csv` — slug → class, generator, prominence, chapter
- `figure_provenance_quality.csv` — full 387-row audit (class, content type,
  quality, legibility, prominence, priority, generator, chapter, issues)
- `figure_provenance_quality.md` — class counts, quality distribution, B/C/D tables

**Finding.** The set is strong and remarkably consistent: 99% already house-style
originals. The work was therefore targeted, not wholesale — replace the 12 borrowed
images with originals, fix the one broken figure, add cheap high-value molecules,
and fill the biggest concept gaps.

---

## 2. Ranked gap list (Phase 2)

Read all 48 chapters, inventoried existing `@@FIG` markers, and identified concepts
a smart lay reader most needs a picture for — then dropped six candidates already
covered by an existing figure. **14 verified gaps** in
`figure_gap_list.md`, led by the five user-prioritized biophysics topics, each
graded on the project's two-axis framework
(`reports/_review/_biophysics-grading-framework.md`).

---

## 3. Upgrades + additions (Phase 3)

### 3a — Seven foundational molecules added to `build_structures.py`

Structures fetched from PubChem (verified CID, formula, MW), drawn in RDKit, each
with four evidence-graded callout cards (what-it-is / mechanism / evidence / honest
caveat).

| slug | CID | chapter homes |
|---|---|---|
| cholesterol-structure | 5997 | 02 · 07 · 22 |
| testosterone-structure | 6013 | 10 · 13 · 19 |
| nad-structure | 5893 | 02 · 37 |
| cortisol-structure | 5754 | 06 · 05 · 13 |
| aspirin-structure | 2244 | 07 · 10 · 28 |
| vitamin-d3-structure | 5280795 | 03 · 07 · 13 |
| creatine-structure | 586 | 03 · 12 · 37 |

### 3b — Twelve class-B borrowed images redrawn as house-style originals

New reproducible generator **`build_anatomy_originals.py`** draws all 12 from
scratch in the design system — no borrowed pixels. `build_realmedia.py` was trimmed
to keep only the 3 protected histology micrographs (RA11/12/13), so re-running it
can never overwrite the originals. Each redraw carries the footer:
*"Original house-style schematic (design-system draw, no borrowed image) ·
anatomical/mechanistic — no clinical-effect claim."*

| slug | before | after |
|---|---|---|
| RA01-neuron | framed Wikimedia PNG | original: dendrites → soma → axon+myelin → terminals |
| RA02-synapse | framed Wikimedia PNG | original: vesicles, cleft, receptors |
| RA03-mitochondrion | framed Wikimedia PNG | original: cristae, matrix + mtDNA |
| RA15-the-cell | framed Wikimedia PNG | original: nucleus, mitochondria, ER, membrane |
| RA04-nephron | framed Wikimedia PNG | original: glomerulus → tubule, reabsorption arrows |
| RA09-brain-lobes | framed Wikimedia PNG | original: 4 colour-keyed lobes + cerebellum + brainstem |
| RA06-action-potential | framed Wikimedia PNG | original: mV curve, 4 phases labelled |
| RA07-dna-replication | framed Wikimedia PNG | original: fork, leading vs lagging (Okazaki) |
| RA08-telomere | framed Wikimedia PNG | original: caps + shortening series |
| RA10-atherosclerosis | framed Wikimedia PNG | original: 4-stage cross-sections |
| RA14-heart | framed Wikimedia PNG | original: 4 chambers, one-way valves, R/L |
| RA05-endocrine-glands | framed Wikimedia PNG | original: 6 gland groups on a body silhouette |

### 3c — One class-D upgrade + nine gap-fillers

**Class-D fix** (`build_final_svg.py`):
- `F06-debunks` — was quality-2 (strikethrough ran through the text; status badges
  rendered as tofu boxes). Rewritten as a legible myth → evidence table with a drawn
  crossed-circle mark and per-row citations. Numeric citations web-verified:
  **Lally 2010** (habit formation median 66 days, range 18–254; *Eur J Soc Psychol*)
  and **Hagger 2016 RRR** (ego-depletion; 23 labs, N≈2,141, d≈0.04, null).

**New generator `build_biophysics.py`** — the five user-prioritized biophysics
figures, each graded on the two-axis framework (M-score × per-tradition evidence
cells W/R/C/X + gate). Axis 1 alone never promotes a claim; each figure states
plainly what is established, what is frontier, and what is overreach that did not
hold:

| slug | topic | grade shown |
|---|---|---|
| BP01-biophysics-framework | the two-axis grading method itself (calibration plane) | — |
| BP02-ultraweak-photon-emission | UPE (37 §37.5.1) | M-solid, X:established, gate:partial; Popp coherent field = failed |
| BP03-bioelectricity | Vmem instructive signal (14) | M3–M4, X:established, gate:partial; established in models, frontier in mammals |
| BP04-radical-pair-magnetoreception | cryptochrome compass (01 §3.2/§6.5) | M3, X:mixed, gate:partial; not demonstrated in humans |
| BP05-piezoelectricity-bone | bone/collagen piezo (01 §3) | M4 physics, gate:pass; Fukada & Yasuda 1957; contributory role |

**New generator `build_gapfillers.py`** — four more from the ranked list:

| slug | topic | type |
|---|---|---|
| BP06-mitohormesis | ROS dose-response inverted-U (37 §37.5.2) | data chart |
| BP07-metabolic-fuel-crossover | fat/glucose/ketones vs intensity (01 §2.5) | data chart |
| BP08-fringe-biophysics-verdict | grounding / H₂-water / EZ-water / EMF (32 §7) | verdict panel, book's own grades |
| BP09-modality-capacity-matrix | training style × capacity (44) | comparison matrix |

---

## 4. Generators (all committed, all reproducible)

| generator | figures | run |
|---|---|---|
| `build_structures.py` | 16 structures + 7 new molecules | `python build_structures.py [--only S] [--list]` |
| `build_anatomy_originals.py` | 12 anatomy redraws | `python build_anatomy_originals.py [--only K] [--list]` |
| `build_realmedia.py` (trimmed) | 3 protected histology only | `python build_realmedia.py` |
| `build_final_svg.py` | F06-debunks (upgraded) + others | `python build_final_svg.py` |
| `build_biophysics.py` | BP01–BP05 (graded) | `python build_biophysics.py [--only K] [--list]` |
| `build_gapfillers.py` | BP06–BP09 | `python build_gapfillers.py [--only K] [--list]` |

## 5. Totals

- **7** new molecule figures
- **12** borrowed images replaced with house-style originals
- **1** broken figure upgraded
- **9** new gap-filler figures (5 graded biophysics + 4 concept figures)
- **29** figures added or upgraded, across **6** committed generators
- Provenance + quality audit of all **387** figures

## 6. Next step (not done here)

Place `@@FIG:` markers for the 16 new figures (7 molecules + 9 gap-fillers) in their
chapter homes, then run `build_manual.py` to regenerate the PDF/EPUB. The 12 anatomy
redraws and the F06 upgrade reuse existing slugs, so they flow into the build with no
marker changes.
