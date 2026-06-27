# Evidence & Claim Schema — how "unbiased" is operationalized

Every indexed claim in this corpus carries a tier + provenance. Nothing is excluded for being
fringe; nothing is laundered into fact for being popular. The grade *is* the neutrality.

## Claim object (json / frontmatter)
```json
{
  "id": "claim-slug",
  "statement": "Sauna use 4–7x/week is associated with lower all-cause mortality.",
  "claim_type": "outcome",              // mechanism | outcome | protocol | hypothesis
  "domain": "H-thermal",
  "evidence_tier": "cohort",            // see ladder below
  "direction": "supports",              // supports | refutes | mixed | unfalsifiable
  "effect_size": "HR 0.60 (highest vs lowest frequency)",
  "population": "2315 Finnish men, KIHD cohort",
  "provenance": {
    "primary": "Laukkanen et al., JAMA Intern Med 2015",
    "doi": "10.1001/jamainternmed.2014.8187",
    "surfaced_via": "Attia podcast → reference mine → PubMed"
  },
  "conflicts_with": [],
  "canon_link": "bucket-canon/05-biophysics/...",   // if it rests on a foundation
  "confidence_notes": "Observational; healthy-user & reverse-causation not fully excluded.",
  "added_on": "2026-06-27"
}
```

## Evidence ladder (tier — descending rigor)
| Tier | Meaning | Example |
|------|---------|---------|
| `meta` | Systematic review / meta-analysis of RCTs | Cochrane review |
| `rct` | Randomized controlled trial in humans | Rapamycin RCT |
| `cohort` | Prospective observational cohort | Finnish sauna study |
| `case-control` / `cross-sectional` | Weaker observational | most epi associations |
| `mechanistic` | Plausible biological mechanism, human/animal | brown fat thermogenesis |
| `animal` | Model organism only (mouse, worm, fly) | C. elegans daf-2 lifespan |
| `invitro` | Cell/tissue only | senolytic cell assays |
| `nequals1` | Self-experiment / quantified-self | Bryan Johnson Blueprint |
| `anecdotal` | Testimonial, clinical impression | practitioner claim |
| `theoretical` | Model/derivation, untested | quantum-biology longevity link |
| `speculative` | Hypothesis stated as such | Kruse cold-EMF claims |

## Direction flags
- `supports` / `refutes` / `mixed` / `unfalsifiable` (claim can't be tested as stated)

## Conflict object (first-class — disagreement is data)
```json
{
  "id": "conflict-protein-mtor",
  "question": "Does high protein intake shorten or lengthen healthy lifespan?",
  "side_a": {"claim": "high protein → mTOR → faster aging", "champions": ["Longo"], "tier": "animal+epi"},
  "side_b": {"claim": "high protein → muscle → lower mortality, esp. elderly", "champions": ["Attia","Galpin"], "tier": "cohort+rct"},
  "status": "open",
  "resolution_notes": "Likely age- and context-dependent; not a single answer."
}
```

## Hard rules
- A `mechanism` claim may NEVER be presented as an `outcome` claim. (Most hype lives in this gap.)
- A practitioner's name attached to a claim is provenance, not evidence — grade the primary source.
- "Associated with" (cohort) and "causes" (rct/mechanism-confirmed) are different tiers — never merge.
- Conflicts stay `open` unless a `meta`-tier source resolves them.
