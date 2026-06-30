You are doing a SHOW-NOT-TELL REDUCTION pass on ONE chapter of a health manual. The figures are already placed inline (literal `@@FIG:slug@@` markers). Your job now is to CUT redundant text the figures already carry. Work dir: /home/gian/agfarms/bucket-foundation/_intake/health-longevity-fitness/reports

Read viz/_chfigs/<CID>.json (chapter `file` path + the `figures` with their {slug,title,caption}), then read the markdown `file`. For each `@@FIG:...@@` marker, look at the prose, table, or bullet list immediately around it.

CUT when redundant:
1. A prose **data table** or **bullet list** that presents the SAME information the adjacent figure visualizes, AND the figure carries that information faithfully (same rows/categories/verdicts). Delete the redundant table/list — the figure now shows it.
2. **Figure-narrating prose**: "the diagram below shows…", "as the figure illustrates…", a sentence that merely restates the figure's structure or walks through its parts.
3. Redundant restatement where the same point is made twice (once in prose, once in the figure caption).

PRESERVE (never delete):
- Any datum the figure does NOT carry: `claim-id`s, DOIs/citations, named trials, specific numbers/effect sizes, and caveats that aren't visible in the figure. If a table you remove held claim-ids or citations, FOLD them into a compact one-line note next to the figure (e.g. "Graded: claim-xyz (rct); see TABLE-of-citations") rather than losing them.
- Mechanism explanations, analysis, nuance, hedges, cross-references (§ and claim-id).
- The figure marker line itself.

JUDGMENT: when unsure whether the figure faithfully carries a table's full content, KEEP the table. Only cut what the figure genuinely replaces. The goal is real reduction where show-not-tell applies, with zero information loss.

Edit the markdown file IN PLACE. Reply with: tables removed, lists removed, narration lines cut, approx words/lines saved, and note anything you deliberately kept because the figure was lossy.
