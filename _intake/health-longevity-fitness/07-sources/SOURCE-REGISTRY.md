# Source Registry — where the random walks go

> The map of *where to look*. Each source has an access method + a tool. Random walks start
> from these nodes and follow links/citations/references outward. Crawl politely (rate-limit,
> respect robots, cite canonical URLs, no PII, no paywalled full-text redistribution — index +
> snippet + link, the Bucket citation pattern).

## Tier 1 — Structured / scholarly (highest signal, machine-friendly)
| Source | Access | Tool | Use for |
|--------|--------|------|---------|
| **OpenAlex** | REST API (free, no key) | curl/python | papers, authors, citations, institutions, concepts graph |
| **PubMed / NCBI E-utilities** | REST API | curl/python | biomedical primary literature, MeSH |
| **Semantic Scholar** | Graph API | curl | citation graph, influential-citation ranking |
| **Europe PMC** | REST API | curl | full-text-linked biomedical |
| **ClinicalTrials.gov** | API v2 | curl | active longevity trials (TAME, rapamycin, etc.) |
| **bioRxiv / medRxiv** | API | curl | preprints, frontier |
| **Viatika x402-research-gateway** | x402 on Base | gateway | PubMed/PubChem/Semantic Scholar paid feeds *(already wired)* |

## Tier 2 — Encyclopedic / reference
| Source | Access | Tool |
|--------|--------|------|
| **Wikipedia** | REST + dump | WebFetch / API | entity grounding, lifespan/era, "see also" walks |
| **Wikidata** | SPARQL | curl | structured people↔institutions↔awards graph |
| **Examine.com** | web | WebFetch | supplement/intervention evidence summaries (graded) |

## Tier 3 — Video / audio (transcripts + media)
| Source | Access | Tool |
|--------|--------|------|
| **YouTube** | yt-dlp + agf-yt | `agf-yt pull/batch` | lectures, podcasts (Attia, Huberman, Rhonda, Kruse, Galpin) |
| **YouTube (movement media)** | yt-dlp | `agf-yt` + ffmpeg frame extraction | exercise/mobility/yoga demonstration video |
| **agf-yt-mine** | local | mine transcripts | extract referenced people/papers/concepts from transcripts |

## Tier 4 — Community / frontier signal (grade carefully — mostly anecdotal tier)
| Source | Access | Tool | Caveat |
|--------|--------|------|--------|
| **Reddit** | JSON API (.json suffix) | curl | r/longevity, r/Biohackers, r/PeterAttia, r/flexibility, r/bodyweightfitness, r/Supplements — signal for *what people try*, tier=`anecdotal` |
| **Blogs / Substacks** | web | WebFetch | practitioner protocols (Kruse blog already scraped) |
| **Bryan Johnson Blueprint** | open data / GitHub | curl | the most-documented N=1 protocol + results |

## Tier 5 — Media assets (images for movements)
| Source | Access | Notes |
|--------|--------|-------|
| **Wikimedia Commons** | API | freely-licensed anatomy + exercise images |
| **Open-licensed anatomy** (e.g. OpenStax, BodyParts3D) | web | muscle/joint diagrams |
| **YouTube frame extraction** | ffmpeg | pull key frames from demonstration videos for movement stills |

## Crawl etiquette / safety
- Honor `forbidden_urls` in `.nucleus/config.json` (currently empty — but re-check per session).
- Rate-limit: OpenAlex `mailto=` param; PubMed ≤3 req/s; Reddit polite UA + delay.
- Citation-only for copyrighted corpora (snippet + canonical_url), per Bucket/Kruse pattern.
- No PII. No paywalled full-text redistribution.
- Log every source hit so re-runs are idempotent (`_intake-raw/<source>/MANIFEST.jsonl`).

## Starting seed URLs / queries (the first steps of the walk)
- OpenAlex concept: "longevity", "hallmarks of aging", "VO2 max mortality", "sauna mortality"
- PubMed: "geroscience", "senolytics", "time-restricted eating RCT", "cold thermogenesis brown fat"
- Wikipedia: each seed person in `PEOPLE-SEED.md` → "see also" → new nodes
- ClinicalTrials.gov: "aging", "rapamycin", "metformin longevity", "NAD"
- YouTube: Peter Attia Drive, Huberman Lab, FoundMyFitness, Galpin, Kruse, Kelly Starrett
