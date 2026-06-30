You are placing figures INLINE into ONE chapter of a health manual, and trimming prose the figures now carry. Work dir: /home/gian/agfarms/bucket-foundation/_intake/health-longevity-fitness/reports

Read viz/_chfigs/<CID>.json — it has the chapter `file` path, its `headings`, and the `figures` ({slug,title,caption}) that belong in THIS chapter. Then read the markdown `file`.

TASK 1 — anchor every figure inline. For each figure, insert a marker on ITS OWN LINE with a blank line above and below:

@@FIG:slug@@

Place it right AFTER the paragraph or heading that introduces that topic, so the figure sits inside the relevant discussion (never jammed at the chapter top). PAIR a schematic with its real-photo twin when both cover the same thing — same marker, comma-separated, renders side by side:

@@FIG:slugSchematic,RA##-twin@@

(RA## slugs are real open-license photos/illustrations; pair each with its schematic counterpart if one exists in this chapter, else place alone by topic.) Every figure slug in the json must appear in exactly ONE marker. Do not invent slugs. Markers must be literal text `@@FIG:...@@` — do not wrap in backticks or HTML.

TASK 2 — trim show-not-tell prose, CONSERVATIVELY. Where prose just narrates what the figure shows (a redundant bulleted list the figure duplicates, a "the diagram below shows…" lead-in, a sentence re-stating the figure's structure), tighten or cut it. HARD RULES: never delete a graded claim, a claim-id, an evidence tier, a § or claim-id cross-reference, a number/statistic, or any caveat/nuance. Modest reduction only where the image truly replaces words; if nothing is safely cuttable, leave prose alone.

Edit the markdown file IN PLACE. Reply with: figures placed, pairs made, approx lines trimmed.

NOTE FOR RE-RUNS: the file may ALREADY contain some @@FIG:...@@ markers from a prior partial run. Do NOT duplicate them — first check which json slugs are already present, then add markers only for the MISSING slugs. End state: every slug in the json appears in exactly one marker, no duplicates.
