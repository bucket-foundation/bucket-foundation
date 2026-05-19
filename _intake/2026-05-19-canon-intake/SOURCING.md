# Bucket Canon — Sourcing Strategy (which queries, which APIs, what it costs)

**Bead:** `bkt-epic-canon-intake` — P0 post-hotfix
**Date:** 2026-05-19
**Pillar:** Data
**Status:** recommended path + explicit payment status

---

## TL;DR (the recommendation)

**Use the existing `tools/canon-pipeline/canon.py` against free public metadata
APIs. It already works, end-to-end, with NO wallet, NO x402, NO payment, NO
agent funding. Do NOT route canon sourcing through the x402 research gateway.**

Verified live this session:

```
$ python3 tools/canon-pipeline/canon.py resolve 10.1038/191144a0
title: Coupling of Phosphorylation to Electron and Hydrogen Transfer by a
        Chemi-Osmotic type of Mechanism
authors: Mitchell, Peter   year: 1961   venue: Nature
doi: 10.1038/191144a0   canonical_url: https://doi.org/10.1038/191144a0
citation_count: 4616
canon_score: 85  (+30 type, +25 cited, +15 age, +15 venue)
```

That is a perfect canon record produced by one zero-cost command. The pipeline
plumbing is **not the gap** — content coverage is.

---

## Payment status — explicit, because we just lost days to exactly this

| path | auth/payment | recommendation |
|---|---|---|
| **`canon.py` → Crossref `api.crossref.org`** | none (polite pool: `mailto` param only) | ✅ **USE** |
| **`canon.py` → OpenAlex `api.openalex.org`** | none (polite pool: `mailto` param) | ✅ **USE** (default title/author/citation truth) |
| **`canon.py` → PubMed eutils `eutils.ncbi.nlm.nih.gov`** | none (optional free API key raises rate limit) | ✅ **USE** for PMID resolution |
| **`canon.py` → arXiv `export.arxiv.org`** | none | ✅ **USE** for preprint → DOI |
| **`canon.py` → Unpaywall** (OA status only, no full text) | none (free, `email` param) | ✅ **USE** for `oa_status` |
| **x402-research-gateway** `x402-research.agfarms.dev/research/*` | **PAID. x402 on Base Sepolia. `price: 0.001`–`0.005` USDC/call. Requires a FUNDED wallet; gateway wallet is UNFUNDED (DEPLOY.md 2026-04-23). Client must hold/sign a Base wallet.** | ❌ **DO NOT USE for canon sourcing** |

**Why the gateway is the wrong tool here:** the gateway's own `routes.yaml`
proxies the *identical free upstreams* (`eutils.ncbi.nlm.nih.gov`,
`api.semanticscholar.org`, `api.openalex.org`) and adds an x402 paywall on top.
Canon needs only DOI + bibliographic metadata + abstract (citation-only thesis).
Paying USDC for an agent to fetch a DOI we can get free, while introducing a
wallet-funding dependency that already cost this org days, is strictly worse.
The gateway is for *external paying consumers* of Bucket's research, not for
*Bucket's own canon ingestion*. **No part of this pipeline requires an agent to
pay for anything.**

If a future need arises for the gateway's *insight* tier (LLM-summarized
answers), that is a downstream product feature, NOT canon sourcing — keep it out
of `bkt-epic-canon-intake`.

---

## The sourcing model (per concept)

The convention already exists and is proven by the 104 existing biophysics
records. One folder per concept; one `queries.txt` of identifiers; one pipeline
command produces the curated triplet.

```
bucket-canon/<branch>/<concept>/
  queries.txt          ← operator-curated seed: one DOI / arxiv:id / pmid: / "free text" per line
  primary-papers.yaml  ← machine-emitted, gate-passed records  (the served layer)
  primary-papers.bib   ← BibTeX twin
  primary-papers.md    ← annotated human-readable twin
  CANON_INDEX.md        ← authoritative manifest (gate decisions logged here)
```

Pipeline (idempotent, cached 7d, convergent):

```bash
python3 tools/canon-pipeline/canon.py dossier bucket-canon/01-mathematics/godel/
```

`dossier` reads `queries.txt`, resolves each identifier via the free-API
cascade, applies the RUBRIC gate, writes only gate-passing records to
`primary-papers.yaml`, and updates `CANON_INDEX.md`. Re-running is a no-op when
nothing changed (stable `bkt-sha1(doi)` ids, on-disk cache).

### How each concept's `queries.txt` is built (the actual sourcing)

For a foundational concept, the foundational paper is usually *known* — it is
the paper the field is named after. We do NOT free-text search and hope; we
**seed the known founding DOI(s)** (operator-asserted = the RUBRIC §Stage-2
allow-list), then optionally widen with one targeted search.

Two-step recipe per concept:

1. **Anchor (always):** put the founding work's DOI directly in `queries.txt`.
   DOIs for canonical works are stable and findable from the paper itself, the
   journal, or a one-shot Crossref title search:

   ```bash
   # resolve a known title to its DOI, free, no key:
   curl -s 'https://api.crossref.org/works?query.bibliographic=Noether+invariante+variationsprobleme&rows=1&mailto=gianyrox@gmail.com' \
     | python3 -c "import sys,json;print(json.load(sys.stdin)['message']['items'][0]['DOI'])"
   ```

2. **Widen (optional, gated):** add 1–3 OpenAlex concept-scoped queries for the
   landmark follow-ups (the structure paper, the review of record). These run
   through the same RUBRIC gate; force-fits fail E9 and land in `_intake/`, not
   canon.

   ```bash
   # OpenAlex search, free, returns DOIs ranked by relevance+citations:
   curl -s 'https://api.openalex.org/works?search=chemiosmotic%20coupling%20proton%20gradient&filter=type:article&per-page=5&mailto=gianyrox@gmail.com' \
     | python3 -c "import sys,json;[print(w['doi']) for w in json.load(sys.stdin)['results']]"
   ```

`queries.txt` is the only hand-curated artifact. Everything downstream is
mechanical and convergent.

### Per-branch seed query plan (anchors for the spine)

The validated golden seeds shipped this bead (01-mathematics, 02-physics) are
the worked example. The same recipe extends to the remaining branches; the
founding DOIs to seed (the operator allow-list) per concept:

- **01-mathematics:** Gödel 1931 (`10.1007/BF01700692`), Turing 1936
  (`10.1112/plms/s2-42.1.230`), Eilenberg–Mac Lane 1945
  (`10.1090/S0002-9947-1945-0013131-6`), Kolmogorov 1933 (book DOI),
  Cohen 1963 forcing (`10.1073/pnas.50.6.1143`). *(5 shipped — see below.)*
- **02-physics:** Einstein 1905 SR (`10.1002/andp.19053221004`), Einstein 1916 GR
  (`10.1002/andp.19163540702`), Bell 1964 (`10.1103/PhysicsPhysiqueFizika.1.195`),
  Yang–Mills 1954 (`10.1103/PhysRev.96.191`), Weinberg 1967
  (`10.1103/PhysRevLett.19.1264`). *(5 shipped — see below.)*
- **03-chemistry:** Lewis 1916 (`10.1021/ja02261a002`), Heitler–London 1927
  (`10.1007/BF01397394`), Eyring 1935 (`10.1063/1.1749604`),
  Pauling resonance (`10.1021/ja01355a027`), Marcus theory
  (`10.1063/1.1742723`).
- **04-information:** Shannon 1948 (`10.1002/j.1538-7305.1948.tb01338.x`),
  Turing 1936 (shared), Cook 1971 (`10.1145/800157.805047`),
  Landauer 1961 (`10.1147/rd.53.0183`), Hamming 1950
  (`10.1002/j.1538-7305.1950.tb00463.x`).
- **06-cosmology:** Friedmann 1922 (`10.1007/BF01332580`), Hubble 1929
  (`10.1073/pnas.15.3.168`), Penzias–Wilson 1965 (`10.1086/148307`),
  Guth 1981 (`10.1103/PhysRevD.23.347`), Riess 1998 (`10.1086/300499`).
- **07-mind:** Hodgkin–Huxley 1952 (`10.1113/jphysiol.1952.sp004764`),
  Hebb 1949 (book), Rao–Ballard 1999 (`10.1038/4580`), Scoville–Milner 1957
  (`10.1136/jnnp.20.1.11`), Schultz 1997 (`10.1126/science.275.5306.1593`).
- **05-biophysics (gap concepts):** Watson–Crick 1953
  (`10.1038/171737a0`), Anfinsen 1973 (`10.1126/science.181.4096.223`),
  Singer–Nicolson 1972 (`10.1126/science.175.4023.720`), Monod–Wyman–Changeux
  1965 (`10.1016/S0022-2836(65)80285-6`), Michaelis–Menten 1913 (DOI varies).

These are *anchors*, not the full list — each concept's `queries.txt` then
widens by 2–5 landmark follow-ups via the OpenAlex step. The RUBRIC gate is the
authority; a seeded DOI that fails the gate (e.g. retracted) is reported and
dropped, not written.

### Edge cases the recipe handles

- **Pre-citation-index founding works** (Gödel 1931, Noether 1918): may score
  lower on raw citation_count. RUBRIC §Stage-2 foundational-anchor override
  applies *because the DOI is in the operator-curated `queries.txt`* — that IS
  the auditable allow-list. They still must pass E1–E9 (they do: real DOI, real
  journal-article, real venue).
- **Books as edition-of-record** (Hebb 1949, Kolmogorov 1933, Hilbert 1899):
  allowed via E3 `book`/`monograph`; flagged `landscape-adjacent` in
  `primary-papers.md` exactly as the mitochondria dossier already does for
  Margulis 1970.
- **No-DOI historical papers:** rare for canon-tier (most have been assigned
  DOIs by Crossref/JSTOR). If genuinely none → CANDIDATE in `_intake/`, with a
  note; not silently dropped, not faked into canon.

## Rate / politeness (already implemented in resolvers.py)

- UA `BucketCanonPipeline/0.1 (mailto:gianyrox@gmail.com)`, polite pool.
- 429 → `Retry-After` honored, capped 60s. 5xx → exp backoff, 4 tries.
- `~/.cache/bucket-canon/` 7-day TTL → re-runs make zero network calls.

No payment, no wallet, no rate-limit wall at canon scale (~79 concepts ×
~5 DOIs ≈ 400 metadata lookups, one-time, cached).
