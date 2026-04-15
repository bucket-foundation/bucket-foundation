# Contact Card Schema

> The schema for a single figure in the canon contributor index. Each card is both a markdown block (for humans) and a JSON entry in `figures.json` (for machines).

## Markdown form

```markdown
### <Name>

| | |
|---|---|
| **id** | <slug> |
| **lifespan** | <birth–death or fl.> |
| **era** | <plain-English era> |
| **region / tradition** | <where & in what tradition> |
| **branches** | <branch ids, comma-separated> |
| **primary works** | <key works with year + language> |

**Foundation contribution.** <2–4 sentences. What did this figure add to the canon. Specific, not vague.>

**Why canon.** <1–2 sentences. Why this contribution is foundation-tier and not refinement-tier.>

**Downstream.** <Names of who built on it. Optional but useful.>

**Disputed / known unknowns.** <Optional. Attribution issues, lost works, multi-author problems.>

**Tags.** `<tag>` `<tag>` `<tag>`
```

## JSON form

```json
{
  "id": "euclid",
  "name": "Euclid of Alexandria",
  "lifespan": "c.325–c.265 BCE",
  "era": "Hellenistic",
  "region": "Alexandria, Ptolemaic Egypt",
  "tradition": "Greek geometry",
  "branches": ["01-mathematics"],
  "cross_branches": [],
  "primary_works": [
    {
      "title": "Elements",
      "year": "c.300 BCE",
      "language": "Koine Greek"
    }
  ],
  "canon_contribution": "Codified the axiomatic-deductive method...",
  "why_canon": "Defines what a mathematical foundation IS for the next 2300 years.",
  "downstream": ["Hilbert", "Tarski", "Bourbaki"],
  "disputed": null,
  "tags": ["axiomatic-method", "geometry", "proof", "foundation-of-foundations"],
  "added_in_pass": 1,
  "added_on": "2026-04-14"
}
```

## Field reference

| Field | Required | Notes |
|---|---|---|
| `id` | yes | URL-safe slug, lowercase, hyphens. Globally unique across the index. |
| `name` | yes | Canonical English-language name. Use the most-cited form. |
| `lifespan` | yes | Use `c.` for uncertain dates, `fl.` for floruit-only figures, `?–?` for fully unknown. |
| `era` | yes | Plain-English era ("Renaissance," "Han dynasty," "Islamic Golden Age"). |
| `region` | yes | Where the figure worked, not necessarily where they were born. |
| `tradition` | yes | The intellectual tradition the work sits inside. |
| `branches` | yes | Primary canon branch(es). Use the branch ids `01-mathematics` … `10-earth`. |
| `cross_branches` | optional | Branches the figure also touches but is not primarily filed under. |
| `primary_works` | yes | At least one. Title + year + language. |
| `canon_contribution` | yes | 2–4 sentences. The single most important thing the field cites this figure for. Specific. |
| `why_canon` | yes | 1–2 sentences. Why this is foundation-tier. |
| `downstream` | optional | Other figures or fields that built on this work. |
| `disputed` | optional | Attribution problems, lost works, multi-author traditions. |
| `tags` | yes | 3–7 short tags for retrieval. Lowercase, hyphenated. |
| `added_in_pass` | yes | Which pass added this card (see `_pass-log.md`). |
| `added_on` | yes | ISO date. |

## Editorial constraints

1. **No marketing voice.** Cards do not say "revolutionary," "brilliant," "ahead of his time," or "the father of X." They say what the work was.
2. **No anachronisms.** Newton was not "doing physics" — he was doing natural philosophy. Mendel was not "doing genetics" — the word *gene* was coined 40 years after he died.
3. **Sources must exist.** Every card should be supportable by at least one citation to a peer-reviewed history of the field, the *Stanford Encyclopedia of Philosophy*, or the *MacTutor History of Mathematics archive*. The seed pass does not include inline citations to keep cards short, but each card is auditable.
4. **Living figures need a higher bar.** Hagiography risk is real. Living-figure cards must explicitly identify the *single* contribution and refuse to summarize a career.
5. **Disputed attribution is not a reason to exclude.** It is a reason to include the dispute *in the card*. See: Pythagoras, the Pythagorean theorem, and what the historical record actually supports.
6. **The card is not the canon.** A card describes a figure; the canon contains the *bucketed primary works* the figure produced. Cards link to canon entries when the work has been bucketed; cards exist independently when the work has not yet been bucketed.

## Cross-branch figures

When a figure contributes to multiple branches, the card lives in the **branch where the contribution is largest** and is cross-referenced from the others. Examples in the seed pass:

| Figure | Primary | Cross-referenced from |
|---|---|---|
| Aristotle | 07-mind | 02-physics, 05-biophysics, 08-tradition, 10-earth |
| Leonardo da Vinci | 09-art | 02-physics, 05-biophysics, 10-earth |
| Ibn al-Haytham | 02-physics | 01-mathematics, 07-mind |
| Émilie du Châtelet | 02-physics | 01-mathematics |
| Aryabhata | 01-mathematics | 06-cosmology |
| René Descartes | 07-mind | 01-mathematics, 02-physics |
| Pascal | 01-mathematics | 04-information, 08-tradition |

Cross-references are tracked in `figures.json` via the `cross_branches` field.

## Pass log discipline

Each card records which pass added it and when. This lets us:

- See which branches are deep and which are thin.
- Audit the seed pass against later passes.
- Allow distributed contribution (each contributor's pass is logged in `_pass-log.md`).
- Roll back a bad pass without losing earlier work.
