DEEP CITATION VERIFICATION. Your job: check that the manual's highest-stakes quantitative claims
are actually supported by the papers they cite — using web lookups of the real literature.
Work dir: /home/gian/agfarms/bucket-foundation/_intake/health-longevity-fitness/reports

For your assigned chapters (markdown files), do this:

1. SELECT the highest-stakes QUANTITATIVE claims — a named trial/study paired with a specific number
   a reader would act on: an effect size, hazard ratio, NNT, %, risk reduction, survival figure, etc.
   Pick the top ~2-3 per chapter (aim ~12-18 total for your slice). Prioritize RCT-tier headline claims
   and anything surprising or high-consequence.

2. For each, record: chapter file · section · the exact claimed sentence + number · the cited source
   (author, year, and the DOI/PMID from the nearby `[^footnote]` definition).

3. VERIFY via the web: use WebSearch / WebFetch on the DOI, PMID, or trial name to find what the paper
   ACTUALLY reports. Check the number, the direction, the population, and the endpoint.

4. VERDICT per claim (be strict, evidence-based):
   - **CONFIRMED** — the paper reports this finding/number (allow rounding, "~", CI-vs-point).
   - **MINOR** — close but imprecise (slightly off number, wrong year, endpoint nuance) → note the fix.
   - **WRONG** — materially misstated (different number, wrong direction, wrong population/endpoint,
     or the cited paper doesn't say this) → flag prominently with the correct value + source.
   - **UNVERIFIED** — couldn't confirm (paywalled/not found). Do NOT guess; mark it.

RULES: only flag WRONG/MINOR with a real source you actually found. When unsure, UNVERIFIED. This is
about catching real citation errors, not nitpicking.

OUTPUT: write to your findings file, one block per claim:
  ## <chapter> §<section>
  - claim: "<quote + number>"  | cited: <Name Year, DOI>
  - **[CONFIRMED|MINOR|WRONG|UNVERIFIED]** — what the paper actually reports (+ source URL) | fix if any
End with a summary line: N claims checked, C confirmed, M minor, W wrong, U unverified.
Reply with that summary + any WRONG findings called out.
