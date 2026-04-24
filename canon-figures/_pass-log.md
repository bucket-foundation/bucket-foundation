# Pass Log — canon-figures/

> Each pass is a discrete, dated, intentional addition to the contributor index. Passes are not "edits in general" — they are batched, branch-balanced commits that move the index forward as a whole. The log exists so that future contributors can see what each pass *intended*, not just what was added.

---

## Pass 1 — Seed pass

**Date:** 2026-04-14
**Author:** Bucket Foundation, founding maintainer
**Slogan being honored:** *build history* (the original bucket slogan, predating *bucket is the new renaissance*)

**Intent.** Establish the contributor index across all ten branches with enough depth that the *shape* of canon is visible — what bucket means by "foundation-tier," what counts and what doesn't, which traditions feed in. Not exhaustive. Not balanced across branches by raw count. The point is to make the editorial standard legible by example.

**What was added (76 figures total):**

| Branch | Count | Figures |
|---|---:|---|
| `01-mathematics` | 10 | Euclid, Archimedes, Brahmagupta, al-Khwarizmi, Gauss, Galois, Riemann, Cantor, Hilbert, Gödel |
| `02-physics` | 10 | Ibn al-Haytham, Galileo, Newton, du Châtelet, Maxwell, Boltzmann, Einstein, Noether, Bohr, Dirac |
| `03-chemistry` | 6 | Lavoisier, Dalton, Mendeleev, Curie, Pauling, Sanger |
| `04-information` | 7 | Boole, Frege, Turing, Church, Shannon, von Neumann, Kolmogorov |
| `05-biophysics` | 7 | Mendel, Pasteur, Franklin, Watson & Crick, Hodgkin & Huxley, Mitchell, Margulis |
| `06-cosmology` | 8 | Aristarchus, Ptolemy, Aryabhata, Copernicus, Kepler, Hubble, Lemaître, Rubin |
| `07-mind` | 7 | Aristotle, Descartes, Kant, James, Wittgenstein, Chomsky, Marr |
| `08-tradition` | 7 | Lao Tzu, Confucius, the Buddha, Augustine, Maimonides, al-Ghazali, Aquinas |
| `09-art` | 8 | Homer, Sappho, Du Fu, Dante, Shakespeare, Bach, Hokusai, Borges |
| `10-earth` | 6 | Steno, Hutton, Lyell, Wegener, Milanković, Tharp |

**Editorial decisions made in this pass:**

1. **Three expansion branches (08, 09, 10) added alongside the strict canon (01–07).** `PROTOCOL.md` defines the strict canon as foundations-only across seven branches. Tradition, art, and earth sciences are added here as *contributor-index* branches under the *build history* slogan, not as strict-canon branches. If a future canon council folds them in, the branch labels survive as sub-categorization. If they stay separate, this folder doubles as a sister-canon. Both readings are intended.

2. **Foundation-tier discipline enforced even in the expansion branches.** Tradition does not include "founders of X popular religious movement"; it includes figures whose *foundational reasoning structures* shaped how a tradition reasons about its own foundations. Art does not include "best-of" lists; it includes figures whose work *founded a form* (epic, lyric, regulated verse, vernacular literature, equal-tempered counterpoint, ukiyo-e, fictional metafiction). Earth sciences includes the figures who *first saw* deep time, plate tectonics, orbital climate forcing, the structure of the seafloor — not refiners of measurements.

3. **Cross-branch tagging.** Several figures legitimately belong to more than one branch (Newton, Descartes, Aristotle, Kant, Maxwell, Einstein, Noether, von Neumann, Marr). The card lives in the *primary* branch; `cross_branches` lists the others. `figures.json` is the source of truth for the cross-branch graph.

4. **Posthumous / delayed-canon entries flagged explicitly.** Mendel, Wegener, Milanković, Marie Tharp, Galois, Boltzmann, Cantor — figures whose canon status was established only after their death, sometimes by decades. The pattern is itself instructive and is something future passes should track.

5. **Diversity is a real editorial constraint, not a footnote.** Pass 1 includes figures from Greek, Hellenistic, Roman, Arab, Persian, Indian, Chinese, Japanese, European (multiple traditions), Russian, Belgian, Hungarian, Serbian, Argentine, and American contexts. Eight women (Sappho, du Châtelet, Curie, Noether, Franklin, Margulis, Rubin, Tharp). This is *visibly partial* and pass 2 should correct the gaps listed in `CONTRIBUTORS.md` § Coverage notes.

6. **No marketing voice. No anachronisms. No hagiography.** Each card states what the figure actually did, in the vocabulary of the field, with sources that exist. Disagreements (authorship of Homer, dating of Buddha, mechanism gap in Wegener, the `Tahāfut` debate) are flagged in a `Disputed` field rather than smoothed over.

**What pass 1 deliberately did NOT include** (and why):

- **Living figures other than Chomsky.** Living figures' contributions are still being evaluated by their fields. Including too many of them would tilt the index toward present-day reputation effects. Pass 2 may add a small number of clearly-canonized living figures.
- **20th-century giants whose foundation-tier status is still settling.** No Feynman, no Witten, no Hawking, no Penrose. Their work is unquestionably significant; whether it is *foundation-tier in the bucket sense* is a judgment that should be made deliberately, not by default.
- **Engineering and applied-science founders.** Tesla, Edison, the Wright brothers, Tim Berners-Lee, von Braun. Pass 2 may add a small "applied/engineering" sub-branch under `04-information` or as a separate branch — TBD.
- **Economics, anthropology, social science.** Smith, Marx, Weber, Durkheim, Lévi-Strauss. These are real foundations, but they sit in disciplines that bucket has not yet decided whether to include. Defer to a future pass with an explicit branch decision.

**Open questions for pass 2:**

- Do the expansion branches (`08-tradition`, `09-art`, `10-earth`) get folded into the strict canon, kept as a sister-canon, or split off into their own repo? The answer should be made by the canon council (not yet formed) or by the founding maintainer with explicit reasoning, and recorded here.
- Add Hypatia, Ada Lovelace, Lise Meitner, Chien-Shiung Wu, Henrietta Leavitt, Cecilia Payne-Gaposchkin, Dorothy Hodgkin, Barbara McClintock at minimum.
- Add Ramanujan, Nāgārjuna, Avicenna, al-Bīrūnī, Alhazen-as-mathematician (currently filed under physics), Sushruta, Charaka, Madhava of Sangamagrama.
- Add a serious treatment of the African scholarly tradition (Timbuktu, Ethiopia, Yoruba philosophy) — currently absent and the most glaring gap.
- Decide whether Mesoamerican astronomy/calendrics gets its own card under `06-cosmology`.

---

## Pass 2 — Bioelectric / deep-history / polyglot pass

**Date:** 2026-04-23
**Author:** Data pillar (Nucleus agent), on beads `bkt-research-03`, `bkt-research-10`, `bkt-research-11`
**Slogan being honored:** *build history* (continued from pass 1) — this pass widens the biophysics branch toward its contested / bioelectric lineage, and adds two derived registers (`_polymaths.md`, `_polyglots.md`) to make cross-branch structure legible.

**Intent.** Three parallel aims: (1) close the pass-1 biophysics gap around bioelectric and structured-water lineages (Burr → Becker → Marino → Levin; Ling → Pollack; plus Szent-Györgyi, Popp, Wallace, Lane, Solís-Herrera, Khavinson); (2) add a deep-history cluster under `10-earth` around weathering-geology and Neolithic chronology (Schmidt, Schoch, West, Carlson) with explicit contested-status flags; (3) extract the polymath and polyglot structure from the index as derived registers rather than new branches.

**What was added (23 new figures, total now 99):**

| Branch | Count | Figures |
|---|---:|---|
| `04-information` | 1 | Wiener |
| `05-biophysics` | 12 | Szent-Györgyi, Burr, Becker, Marino, Ling, Pollack, Popp, Levin, Wallace (Doug), Lane, Solís-Herrera, Khavinson |
| `08-tradition` | 4 | Hildegard of Bingen, Champollion, William Jones, Ventris |
| `09-art` | 2 | Leonardo da Vinci, Tolkien |
| `10-earth` | 4 | Klaus Schmidt, Robert Schoch, John Anthony West, Randall Carlson |

**New register files:**

- `_polymaths.md` — derived view over `figures.json` for figures with load-bearing contribution in ≥3 branches. 13 entries in the register table (12 existing + 1 new via Hildegard); flags for pass-3 additions (Leibniz, Avicenna).
- `_polyglots.md` — editorially-curated register of figures whose multilingualism was the epistemic instrument for the canonical work. 4 canon-tier rows (Champollion, Ventris, Jones, Tolkien) + 4 landscape rows (Mezzofanti, Schliemann, Burton, Lomb, with explicit "not canon-tier, listed for completeness" framing).

**Editorial decisions made in this pass:**

1. **Contested contributions are included *with* the dispute, not excluded.** Solís-Herrera, Khavinson, Schoch, Carlson are flagged `contested` in tags and have an explicit `Disputed.` paragraph. The schema requires this, and the bioelectric / structured-water / deep-history lineages cannot be honestly indexed without it. The editorial rule: if the underlying *phenomenon or observation* is reproducible, the figure can enter the index with the interpretation marked as disputed. If only the interpretation exists, they stay out or go to a landscape note.
2. **Graham Hancock: excluded.** Hancock is a landscape-level synthesizer (media popularizer), not a field researcher; he does not meet even the Schoch / Carlson bar (field-documented geological observation as the foundation contribution). If a future pass adds a "media/popularization" sub-track, he's a candidate there.
3. **Derek Parfit: excluded.** Ethics / philosophy of personal identity is real foundational philosophy, but it sits further from the foundations-only canon spine defined in `PROTOCOL.md` than pass 2 is willing to rule on. Deferred to pass 3 with an explicit branch-scope decision.
4. **Living-figure bar enforced.** Every living-figure card (Marino, Pollack, Levin, Wallace, Lane, Solís-Herrera, Khavinson, Schoch, Carlson) explicitly names a *single* contribution and refuses career summary, as the schema requires. Cards are tagged `living-figure` for filterability.
5. **Polymath register is a view, not a branch.** We specifically chose not to make `polymath` a new branch in `figures.json`; it's a derived index regenerable from the data. Same for polyglots. This keeps the branch set stable at 10.
6. **`canon_contribution` / `why_canon` / `downstream` / `disputed` fields in `figures.json`:** pass-1 entries do not carry these as JSON fields (the prose lives in the markdown cards). Pass-2 JSON entries follow the same convention for consistency; the markdown cards carry the full prose per schema.

**What pass 2 deliberately did NOT include** (and why):

- **Graham Hancock** — landscape-only popularizer (see above).
- **Derek Parfit** — branch-scope decision deferred.
- **Hypatia, Ada Lovelace, Lise Meitner, Chien-Shiung Wu, Henrietta Leavitt, Cecilia Payne-Gaposchkin, Dorothy Hodgkin, Barbara McClintock** — carried forward from pass-1 open questions; pass 2 ran out of scope, still owed in pass 3.
- **Ramanujan, Nāgārjuna, Avicenna, al-Bīrūnī, Sushruta, Charaka, Madhava of Sangamagrama** — still owed from pass 1, deferred to pass 3.
- **African scholarly traditions (Timbuktu, Ethiopia, Yoruba), Mesoamerican astronomy** — still the most glaring gap, deferred.
- **Leibniz** — noted as priority pass-3 polymath addition.
- **Rawlinson (Behistun)** — noted for pass-3 polyglot canon row.

**Open questions for pass 3:**

- Should `05-biophysics` be split into a conventional-biology branch and a contested-biophysics sub-track, or does the `contested` tag suffice? Pass 2 used the tag; pass 3 should either commit or split.
- Should `10-earth` carry the deep-history / alternative-chronology material at all? Pass 2 added it with contested flags because the Schoch weathering observation is a legitimate geological question; pass 3 should decide whether to keep this cluster in `10-earth` or move it to a new `11-archaeology` branch.
- Hildegard is now the only pre-modern woman polymath in the register; the pre-modern polymath gap (no Émilie du Châtelet cross-branches, no Hypatia, no Maria the Jewess) should be closed in pass 3.

---

## Pass 3 — *(not yet run)*

When pass 3 is run, append a new heading here with the same structure: date, author, intent, what was added (table), editorial decisions, what was deliberately omitted, open questions for pass 4.
