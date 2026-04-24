# Bucket Canon Pipeline

Resolve a DOI, arXiv id, PubMed id, or free-text query into a canonical citation
record fit for `bucket-canon/<branch>/<topic>/`. Outputs YAML metadata + BibTeX.

## Non-Redistribution Policy

This pipeline **does not** access, cache, or redistribute paywalled full-text.
It resolves citation metadata from public APIs (OpenAlex, Crossref, PubMed,
arXiv, bioRxiv, Unpaywall) and only downloads PDFs when Unpaywall or PMC
reports an OA version with a declared license. Canon entries store citations,
not content.

Sci-Hub is **not** integrated and will not be. Operators who need full-text for
reading (fair use, manual review) handle that out-of-band.

## Install

```bash
pip install -r requirements.txt
```

Python 3.10+; only `requests` + `PyYAML` are required. `PyYAML` is optional —
a stdlib fallback emitter is included.

## Usage

```bash
# single record → YAML on stdout
python3 tools/canon-pipeline/canon.py resolve 10.1126/science.208.4448.1095
python3 tools/canon-pipeline/canon.py resolve arxiv:2405.14909
python3 tools/canon-pipeline/canon.py resolve pmid:17426811
python3 tools/canon-pipeline/canon.py resolve "mitochondrial free radical theory of aging"

# batch: one identifier per line → writes <name>.bib + <name>.yaml next to input
python3 tools/canon-pipeline/canon.py bib seeds.txt

# dossier: reads queries.txt in a canon folder, writes primary-papers.{bib,yaml}
# and updates the "last updated" line in CANON_INDEX.md
python3 tools/canon-pipeline/canon.py dossier bucket-canon/05-biophysics/mitochondria/

# fetch OA PDF (only if license permits); otherwise writes .citation.yaml
python3 tools/canon-pipeline/canon.py fetch 10.1126/science.208.4448.1095
```

## How it works

Resolution cascade (by input kind):

| Input        | Path                                                         |
|--------------|--------------------------------------------------------------|
| DOI          | OpenAlex(DOI) ∪ Crossref(DOI) → merge                        |
| PMID         | PubMed esummary → DOI → OpenAlex + Crossref                  |
| arXiv id     | arXiv Atom → (DOI if available) → OpenAlex + Crossref        |
| free text    | OpenAlex search → DOI → Crossref; fallback Crossref search   |
| bioRxiv DOI  | + bioRxiv details for version metadata                       |

Records merge across sources; OpenAlex is the default title/author/citations
truth, Crossref fills venue + type + retraction, PubMed/arXiv fill when neither
has the work indexed.

### Canon score (0–100, explainable)

- +30 peer-reviewed Crossref type
- +25 / +20 / +10 citation tiers (>1000 / >50 / >10)
- +15 year survived >5 years
- +10 open access
- +15 foundational venue (Nature, Science, PNAS, Phys Rev, Cell, Annual Reviews,
  Phil Trans, NEJM, JAMA, BMJ, Lancet, Rev Mod Phys)
- −30 retracted

Reasons list is emitted alongside the score — no black-box scoring.

### Branch hints

Keyword match over title + concepts against `BRANCH_KEYWORDS` in `scoring.py`.
Seven branches: `01-mathematics`, `02-physics`, `03-chemistry`,
`04-information`, `05-biophysics`, `06-cosmology`, `07-mind`.

## Cache

API responses are cached at `~/.cache/bucket-canon/` (7-day TTL). Reruns are
idempotent: a fully-cached run makes zero network calls.

## Rate limits

- User-Agent: `BucketCanonPipeline/0.1 (mailto:gianyrox@gmail.com)`
- OpenAlex + Crossref polite pool (`mailto` param)
- 429 → `Retry-After` honoured, capped at 60s per request
- Exponential backoff on 5xx, 4 attempts max

## Tests

```bash
cd tools/canon-pipeline
python3 -m pytest tests/ -v
```

Tests are network-free (mocked fixtures / pure-function checks). Real end-to-end
resolve/dossier runs exercise the live APIs — expect occasional flakes from
upstream; the cache plus backoff absorb most transient issues.

## Files

```
tools/canon-pipeline/
  canon.py          CLI entrypoint
  resolvers.py      OpenAlex, Crossref, PubMed, arXiv, bioRxiv clients
  scoring.py        canon_score + branch_hints
  oa_fetch.py       Unpaywall + OA PDF fetcher (no paywall bypass)
  bibtex.py         BibTeX emitter
  cache.py          on-disk JSON cache
  tests/            unit tests
```
