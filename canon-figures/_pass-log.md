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

## Pass 2 — *(not yet run)*

When pass 2 is run, append a new heading here with the same structure: date, author, intent, what was added (table), editorial decisions, what was deliberately omitted, open questions for pass 3.
