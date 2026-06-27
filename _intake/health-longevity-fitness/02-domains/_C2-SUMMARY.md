# Domain C2 — Summary (Wave 4 deepening: microbiome + Blue Zones)

**Built:** 2026-06-27. **Files:** `C2-microbiome-deepdive.md`, `C2-claims.json` (11 claims), +2 conflicts in
`06-evidence/CONFLICTS.md`, +11 figures in `00-map/discovered-people.md`. Raw JSON → `_intake-raw/openalex/c2-*.json`.

## What this wave added (EXTENDS C §4 + D §8, no duplication)
Domain C had the microbiome **association** layer (Biagi, Le Chatelier, Wilmanski uniqueness-survival, Sato
isoalloLCA bile acids, Galkin clock, SCFA sketch). C2 adds the **intervention + deeper-mechanism + human-RCT**
layers, and the full **Blue Zones demography-vs-lifestyle** split that D only flagged.

### Microbiome causal stack (8 claims) — honest verdict: mostly animal/association
- **Animal FMT** = strongest causal hint: Smith/Valenzano killifish (young-donor microbiota → **lifespan
  extension**, `animal`), Parker mouse bidirectional FMT (reverses/induces gut-eye-brain inflammaging, `animal`).
- **Akkermansia**: Everard/Cani mouse mechanism (`animal`) → Depommier/Cani **n=40 exploratory** human PoC
  (`rct`, surrogate; strongest effect from the **pasteurized/dead** bug — a wrinkle for the probiotic story).
- **SCFA/fiber mechanism**: Furusawa butyrate→colonic-Treg via HDAC inhibition (`animal`, canon-linked);
  Desai/Martens fiber-starvation→mucus-erosion (`animal`); Sonnenburg MAC hypothesis (`theoretical`).
- **The one human RCT**: Wastyk/Gardner/Sonnenburg fermented-foods (`rct`) — fermented foods raised diversity +
  cut 19 inflammatory proteins, but the **high-fiber arm did NOT raise diversity** and was person-dependent. The
  counterintuitive fiber null is the honest headline.
- **Hard stop:** NO human study shows a microbiome intervention extends healthspan/lifespan. Relationship is
  bidirectional.

### Blue Zones / population longevity (3 claims) — the unbiased-grading test case
- **Poulain AKEA 2004** (`cross-sectional`): the validated, peer-reviewed Sardinian origin (the defensible end).
- **Buettner Power 9 2016** (`cross-sectional`): the popular uncontrolled lifestyle synthesis.
- **Newman 2019 / Ig Nobel 2024** (`theoretical`, contested): extreme-age records track birth-registration gaps,
  poverty, missing death certs, and pension fraud — undercutting the centenarian counts the marketing rests on.
- **Grading rule applied:** Blue-Zone DIET/lifestyle claims are graded on their OWN stronger evidence (PREDIMED
  `rct`, Adventist cohort) — as a *Blue-Zones causal inference* they are downgraded to `theoretical`/contested,
  because the underlying age denominator is unreliable.

## Conflicts
- **`conflict-microbiome-causality`** — deepens C's `conflict-microbiome-cause-or-consequence` with the
  animal-intervention + human-RCT evidence. Status `open` (bidirectional; human evidence stops at small surrogate RCT).
- **`conflict-blue-zones-data-quality`** — new. Status `open / partially-resolved-against-the-strong-claim`.

## Discovered figures (11): Buettner, Poulain, Pes, J. Sonnenburg, E. Sonnenburg, Gardner, Valenzano, Parker,
Cani, Martens, Ohno. (Wilmanski, Gibbons, Honda, Biagi, Franceschi, Saul/John Newman already mapped in Wave 1.)

## Honest-grading flags (the point of this domain)
1. Microbiome-aging is **front-loaded with mouse/fish + association data**; the lone human RCT is small/surrogate.
2. Akkermansia's human signal is from the **dead** bacterium — mechanism unsettled.
3. Blue Zones diet advice is plausible but its **causal proof (centenarian counts) is contested**; resolve the
   diet claim UP to PREDIMED, not to the counts.

## Gaps → Wave 5
Human FMT/fiber RCTs with aging endpoints; Akkermansia live-vs-pasteurized; Robine/GRG demographic rebuttal to
Newman (card side_a properly); Okinawa/Loma Linda primary cohorts (Willcox, Adventist Health Study);
fermented-food replication + diversity-rise mechanism.

## Provenance / method
OpenAlex direct-DOI lookups, `mailto=gianyrox@gmail.com`; hook-safe (saved to file, parsed separately — no
`curl|python3`). Hit a 429 mid-run, recovered via backoff + direct-DOI fallback. All 11 new DOIs verified to
correct title/author/venue. 10 new raw JSONs archived; Newman reuses existing `D-newman_bluezones_search.json`.
