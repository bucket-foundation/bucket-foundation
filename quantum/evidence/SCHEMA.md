# Evidence Schema — how every quantum claim is graded

Inherited from the health manual's neutrality mechanism, adapted for a field
where the loudest claims come from vendors with something to sell.

## Every claim carries
- `claim`: the statement, in plain language
- `tier`: evidence strength (below)
- `source`: primary citation (arXiv ID, DOI, journal, or named press release)
- `provenance`: who is making the claim and what they gain from it
- `status`: `established` · `demonstrated` · `claimed` · `contested` · `roadmap`

## Tiers (strongest → weakest)
| Tier | Meaning | Example |
|---|---|---|
| **T1 Established physics** | Textbook, reproduced for decades | Superposition, Bell violation |
| **T2 Peer-reviewed result** | Published, refereed, ideally reproduced | Google Willow below-threshold QEC (Nature 2024) |
| **T3 Preprint / conference** | arXiv or talk, not yet refereed | Most fresh hardware milestones |
| **T4 Vendor claim** | Company announcement, not independently verified | Roadmap qubit counts, "advantage" PRs |
| **T5 Analyst / forecast** | Market projection, punditry | BCG/McKinsey TAM numbers |
| **T6 Speculative** | Plausible but unproven | Room-temp qubit timelines, killer-app dates |

## Rules
1. A vendor announcing its own benchmark is **T4 until independently reproduced** —
   never promote to T2 on the strength of a blog post.
2. "Quantum advantage / supremacy" claims are **contested by default** and must
   carry the classical-counterattack status (was it later matched classically?).
3. National-program dollar figures are **T5** and flagged for double-counting.
4. Conflicts are first-class objects — see `evidence/CONFLICTS.md`. When two
   credible sources disagree (e.g. "FTQC by 2029" vs "not before 2040"), keep both.
5. Timeline / roadmap nodes are **T4/T6** and say so in the manual text.

## Conflict object format
```
id: C-<slug>
topic: <one line>
positions:
  - who: <source>  claim: <...>  tier: T?
  - who: <source>  claim: <...>  tier: T?
what_would_resolve_it: <the experiment/event that settles it>
```
