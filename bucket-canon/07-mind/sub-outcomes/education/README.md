# sub-outcomes/education: Outcome-tier

## What this folder is

Intervention and meta-analysis studies on tutoring, mastery-learning, and
AI-assisted-learning effectiveness, and on human-AI team performance. Every
record here reports an educational or team-performance outcome (an effect
size) rather than a primary mechanism of mind. Per RUBRIC.md Stage-0 rule
E7, an outcome/application study does not enter `bucket-canon/07-mind/`
proper; it lives in `sub-outcomes/<topic>/` instead, the convention
`05-biophysics/README.md` documents for `sub-outcomes/longevity/`
(downstream-application records that cross-mirror the gdrive outcome canon
rather than sitting in the foundation-tier branch).

This is the first `sub-outcomes/` folder built under `07-mind/`, mirroring
that documented convention: same dossier shape as a canon folder
(`CANON_INDEX.md`, `primary-papers.yaml`, `primary-papers.bib`,
`queries.txt`), different tier. `canon-primary.ts` only walks
`bucket-canon/<branch>/<concept>/primary-papers.yaml` one level deep, so a
record nested at `sub-outcomes/education/` is not picked up by the site's
canon-serving layer, the same way `sub-claims/<figure>/` is not, keeping
outcome-tier material out of the citeable canon surface by construction.

## Tier

**OUTCOME.** Every record here passes the mechanical
`canon_score` floor, with two founder-overridden exceptions noted in
`CANON_INDEX.md` (see `primary-papers.yaml`), but is excluded from
`bucket-canon/07-mind/` proper by RUBRIC E7 because the work reports an
intervention effect size instead of a primary mechanism claim.

## Dependency convention

Each record names the canon-tier foundation it depends on, in
`primary-papers.yaml` (`depends_on_foundation`) and in the index tables.
Each source paper reports its own effect size on its own terms; no
record states a shared mechanism itself. This dossier's promoting passes
(one, two, and three) draw that connection themselves; the source papers
state their own findings only. The pass-one four, plus five of the
pass-two seven, depend on the retrieval-practice / testing-effect
mechanism in `bucket-canon/07-mind/memory-systems/` (Roediger and
Karpicke 2006, DOI `10.1111/j.1745-6916.2006.00012.x`). The promoting
passes read mastery learning, step-based tutoring, and AI-tutoring RCTs
as working by inserting, or in Kosmyna et al. 2025's case removing,
frequent low-stakes retrieval-and-feedback checkpoints, and treat the
outcome studies here as measuring that mechanism's effect size at the
classroom, field-deployment, or national-program scale. Kosmyna et al.
2025 depends instead on the external-memory-offloading foundation,
Sparrow, Liu and Wegner 2011 (DOI `10.1126/science.1207745`, same
`memory-systems/` folder). Four records, the two pass-two human-AI
complementarity meta-analyses (Vaccaro, Almaatouq and Malone 2024;
Bansal et al. 2021) and two pass-three source-evaluation studies
(Wineburg and McGrew 2019; Breakstone et al. 2021), depend on the
information-foraging foundation, Pirolli and Card 1999 (DOI
`10.1037/0033-295x.106.4.643`, `bucket-canon/07-mind/
information-foraging/`): the promoting passes read the first pair as
measuring when a human-AI pair forages a task's information space
better together than either does alone, and the second pair as
measuring an expert patch-leaving strategy and its absence, readings
neither source paper states in foraging terms. Pass three adds two
further foundations: five guidance-and-inquiry outcome studies (Chen
and Yang 2019; Furtak et al. 2012; Lazonder and Harmsen 2016; Kirschner,
Sweller and Clark 2006; Hmelo-Silver, Duncan and Chinn 2007) depend on
the new cognitive-load foundation, Sweller 1988 (DOI
`10.1207/s15516709cog1202_4`, `bucket-canon/07-mind/cognitive-load/`),
this same pass promoted; three student-research-experience studies
(Grinnell, Dalley and Reisch 2020; Bangera and Brownell 2014; Sadler,
Burgin, McKinney and Ponjuán 2010) depend on the curiosity-and-motivation
foundation, Deci and Ryan 2000, self-determination theory (DOI
`10.1207/s15327965pli1104_01`, `bucket-canon/07-mind/
curiosity-and-motivation/`). Establishing each mechanism itself is the
job of the foundation record it depends on; each `relation` field in
`primary-papers.yaml` separates the source's own finding from the
promoting pass's mechanism reading.

## Files in this dossier

| File | Purpose |
|------|---------|
| `CANON_INDEX.md` | Manifest of outcome entries. See its own header for the tier statement. |
| `queries.txt` | Operator-curated seed identifiers. |
| `primary-papers.yaml` | Machine-resolved records (`canon.py resolve`), tier marked by hand. |
| `primary-papers.bib` | BibTeX twin. |
