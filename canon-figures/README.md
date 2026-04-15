# canon-figures — *Build History*

> *"Build history."* — the original bucket slogan.

This folder is the **contributor index** of bucket.foundation: contact cards for the figures who built the foundations the canon is made of, mapped to the branches they contributed to.

The slogan **build history** is older than `bucket is the new renaissance`. The renaissance is the *thesis*; build history is the *verb*. The contributor index is what the verb produces — a structured record of *who built what foundation*, attached to the canon, so that any reader of a bucketed paper can trace any term, any law, any axiom back to the human who first wrote it down.

## Why a contributor index, not just a citation graph

A citation graph tells you *what cites what*. It does not tell you *who built what*. The two are different and the distinction matters:

- **Citation graphs** treat all sources as equal nodes. They do not distinguish between the paper that *introduced* the second law of thermodynamics and the paper that *re-applies* it.
- **Contributor indexes** rank by **contribution to foundations**, not by citation count. A figure with one paper that founded a discipline outranks a figure with a thousand papers that refined it.

The bucket canon is foundations-only. The contributor index is the human side of the same filter: only the people whose work added an axiom, a principle, a primary derivation, a method, or a substrate to the canon.

## Scope

| Branch | Domain | Examples |
|---|---|---|
| **01-mathematics** | Pure math, logic, foundations | Euclid, al-Khwarizmi, Gauss, Gödel |
| **02-physics** | Classical, quantum, statistical | Newton, Maxwell, Einstein, Noether |
| **03-chemistry** | Atoms, bonds, reactions, materials | Lavoisier, Mendeleev, Pauling |
| **04-information** | Computation, complexity, networks | Turing, Shannon, von Neumann |
| **05-biophysics** | Molecular biology, neurophysiology, biochem | Mendel, Watson–Crick, Hodgkin–Huxley |
| **06-cosmology** | The universe at scale | Copernicus, Hubble, Lemaître |
| **07-mind** | Cognition, language, philosophy of mind | Aristotle, Frege, Chomsky, Marr |
| **08-tradition** *(new)* | Religion, theology, philosophy of religion | Lao Tzu, Augustine, Aquinas, al-Ghazali |
| **09-art** *(new)* | Visual art, music, literature, drama | Homer, Bach, Hokusai, Borges |
| **10-earth** *(new)* | Geology, oceanography, atmosphere | Steno, Hutton, Wegener, Milankovitch |

The first seven branches mirror the strict canon defined in `PROTOCOL.md` § Foundations. The last three branches are **expansion branches** added on 2026-04-14 to honor the *build history* slogan, which scopes the contributor index broader than the strict canon. They are flagged in `TAXONOMY_NOTES.md` so the canon team knows the contributor index is a superset of the canon proper.

## What's in this folder

| File | Purpose |
|---|---|
| `README.md` | This file |
| `SCHEMA.md` | The contact card schema (markdown + JSON) |
| `CONTRIBUTORS.md` | Master index of every figure across all branches |
| `figures.json` | Machine-readable manifest (one entry per figure) |
| `01-mathematics.md` … `10-earth.md` | One file per branch, containing the cards |
| `_pass-log.md` | Pass log (which figures were added in which pass, by whom, with what depth) |

## Pass model

The contributor index is built in **passes**, not in one shot. Each pass is logged in `_pass-log.md`.

| Pass | Date | Author | Scope |
|---|---|---|---|
| 1 | 2026-04-14 | founding maintainer + Nucleus | Seed pass — ~5 cards per branch, broad coverage, deliberately diverse traditions |
| 2 | TBD | TBD | Deepen one branch on signal |
| 3+ | TBD | TBD | Cross-branch links, downstream-influence graph, gdrive mirroring |

The seed pass is the floor, not the ceiling. If a branch you care about looks thin, that means it gets the next pass. Open an issue or just say *"go deep on tradition"* and the next pass will 5x that branch.

## Editorial principles

1. **Foundation, not biography.** A card explains what the figure built that became canon. It is not a Wikipedia article. Personal life, political views, anecdotes — out, unless they directly explain the foundation.
2. **Contribution, not centrality.** A figure with one foundation outranks a figure with a thousand refinements. Centrality (how many people cited them) is a downstream metric, not a canon-tier signal.
3. **Diverse traditions.** The canon is not a Western-European canon. Greek, Arab, Persian, Indian, Chinese, African, and Indigenous traditions all built foundations. The seed pass is deliberately spread across traditions, not weighted toward one.
4. **Disputed sources are flagged.** When attribution is uncertain (Pythagoras, Lao Tzu, multi-author traditions), the card says so. We do not pretend to know what we do not know.
5. **Cards are short on purpose.** ~250 words each. Density beats length. A card is a *contact card*, not an essay.
6. **Cross-branch figures get cross-references.** Da Vinci is in `09-art` and cross-linked from `02-physics`, `05-biophysics`, and `10-earth`. Aristotle is in `07-mind` and cross-linked from `02-physics`, `05-biophysics`, `08-tradition`, and `10-earth`. The cross-references live in the JSON manifest.
7. **No living-figure cards in the seed pass.** Living figures (Penrose, Witten, Chomsky, Hawking before 2018, Margulis before 2011) need a higher bar of editorial care to avoid hagiography. Pass 1 includes a few unambiguous ones; pass 2+ will broaden carefully.

## What this is not

- **Not a hall of fame.** No ranking. No "top 10." The canon does not have winners.
- **Not exhaustive.** The seed pass covers ~50 figures. The full target is ~500. Most of the work is ahead.
- **Not a closed list.** Anyone can propose a card. The editorial bar is "did this figure add a foundation to the canon, and can the addition be cited to a primary source?"
- **Not a popularity contest.** Whether a figure is famous today is irrelevant. Brahmagupta, Ibn al-Haytham, and Émilie du Châtelet built foundations that almost no general reader has heard of. They are in. Influencers and TED-talk philosophers are not.
