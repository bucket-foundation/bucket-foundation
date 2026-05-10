# Bucket Canon — Branch Coverage Audit (2026-05-09)

*Assessment of what's indexed vs. what's missing across the 7+ canon branches,
with concrete external sources to ingest.*

## Internal: where we are

| Branch | FTS hits | Status | Heavy / light |
|---|---|---|---|
| 05-biophysics  | 735 | ✅ rich | Becker, Pollack, Marino, Mitchell, Popp, Nordenström, Frohlich, Szent-Györgyi, Kruse 460-article corpus, 51 Ray Peat, 100+ podcast transcripts, 195 PubMed papers |
| 04-information | 584 | ⚠️ noisy | Mostly cross-mention noise. **Missing primary**: Shannon 1948, Turing 1936, Chaitin, Kolmogorov, Solomonoff, Wolfram |
| 03-chemistry   | 437 | ✓ medium | Mendeleev 1901 (vols 1-2), Russell 1926, Pasteur, Lavoisier-adjacent. **Missing**: Pauling textbook, IUPAC modern, Seaborg actinide papers |
| 06-cosmology   | 416 | ⚠️ noisy | "universe" hits mostly from biophysics. **Missing primary**: Hawking, Hoyle, Penrose-Hawking singularity, Sandage, Sagan, Lemaître |
| 02-physics     | 317 | ✓ medium | Newton (Principia + Opticks), Maxwell (Treatise + Papers), Faraday (3 vols), Einstein, Tesla, Planck, Galileo, Boltzmann, Helmholtz, Schrödinger. **Missing**: Dirac, Feynman lectures, Pauli, Heisenberg primary, modern QFT/GR foundations |
| 08-deep-history| 191 | ⚠️ noisy | Mostly cross-noise. **Missing**: Diamond, Harari, Mann, Crosby, Christian, archaeological canon |
| 09-art         | 187 | ⚠️ noisy | Random "painting" mentions. **Missing**: Gombrich *Story of Art*, Berger *Ways of Seeing*, Vasari, Panofsky |
| 07-mind        | 174 | ⚠️ light | Penrose-Hameroff covered. **Missing**: William James *Principles of Psychology* (PD), Chalmers, Dennett, Husserl, Merleau-Ponty, Jung, Bergson, neuroscience canon |
| 01-mathematics |  76 | 🔴 sparse | Euclid Heath, Gauss *Disquisitiones*. **Missing**: Riemann 1859, Cantor set theory, Gödel 1931, Hilbert *Grundlagen*, Noether 1918, Poincaré, Brouwer, category theory, topology, all 20th-century foundations |
| 09-sacred-texts|  35 | 🔴 empty | Single intake stub. **Missing**: literally everything — Bible, Quran, Vedas, Tao Te Ching, Upanishads, Heart Sutra, Plato dialogues, Marcus Aurelius |

## Verdict

**Most under-indexed (in priority order):**
1. **01-mathematics** — Bucket's first canonical branch and we have ~zero primary
2. **09-sacred-texts** — entirely public-domain, easy win, currently at 35 docs of cross-noise
3. **07-mind** — branch exists, has Penrose, missing entire cognitive-science / phenomenology canon
4. **06-cosmology** — big numbers but mostly noise; need real cosmology primary
5. **08-deep-history** & **09-art** — same noise issue; need targeted ingestion

**Already saturated** (further pulling = diminishing returns):
- 05-biophysics — comprehensive
- 03-chemistry — solid foundations
- 02-physics — foundations covered, 20th-cen QFT/GR copyrighted

---

## External: data sources mapped to branches

### Tier 1 — open + bulk + automatable

| Source | URL | Branch fit | Why | Tool |
|---|---|---|---|---|
| **Project Gutenberg** | gutenberg.org | math · physics · mind · sacred · art · history | 70K+ PD books with txt/epub. RDF metadata. | bulk catalog + per-book pull (`agf-gutenberg`) |
| **Internet Archive Texts** | archive.org/details/texts | all branches | Deeper than what we've pulled; specific collections like NASA, MIT OCW. | extend `agf-archive` queries |
| **Wikisource** | en.wikisource.org | math · physics · sacred · mind | PD translations + transcribed primary sources (Newton, Cantor, Gödel translations). API exposes raw text. | new `agf-wikisource` |
| **arXiv** | arxiv.org | math · physics · cosmology · info | math.* and astro-ph.* sections we haven't mined. | extend `agf-arxiv` with section queries |
| **PhilPapers** | philpapers.org | mind | OA philosophy index; many abstracts + DOI links. | new `agf-philpapers` |
| **Stanford Encyclopedia of Philosophy** | plato.stanford.edu | mind | CC-BY-NC-SA peer-reviewed canonical entries on every philosophical topic. | extend `agf-blog` |
| **NASA ADS** | ui.adsabs.harvard.edu | physics · cosmology | The astrophysics literature index. Free API with key. | new `agf-ads` |
| **Sacred-Texts.com** | sacred-texts.com | sacred-texts | Comprehensive PD archive: Bible, Quran, Vedas, Upanishads, Tao Te Ching, etc. | extend `agf-blog` (static HTML) |
| **MIT OpenCourseWare** | ocw.mit.edu | math · physics · info · biophysics | Lecture videos + PDFs CC-BY-NC-SA. (Already have MIT 7.01SCF11 + MIT 8.701F20 in archive!) | extend `agf-archive` |
| **HathiTrust** | hathitrust.org | all | 17M+ scanned books, PD subset huge. Bulk download for OA via API. | new `agf-hathi` |

### Tier 2 — high-value, more friction

| Source | URL | Branch fit | Notes |
|---|---|---|---|
| **PubMed Central OA** | pmc.ncbi.nlm.nih.gov | biophysics · mind | Full-text OA papers; we hit metadata via `agf-pubmed` but not bulk OA fulltext yet |
| **bioRxiv / medRxiv** | biorxiv.org | biophysics · mind | Preprints; OA + RSS feeds |
| **DOAJ** | doaj.org | all | 20K+ OA journals discoverable |
| **Europe PMC** | europepmc.org | biophysics | EU mirror with broader OA coverage than PubMed |
| **Library Genesis** | libgen.* | all (gray) | Out-of-scope as policy: copyrighted-book proxy. Skip. |
| **Anna's Archive** | annas-archive.org | all (gray) | Same. Skip for canon. |
| **NIST Webbook** | webbook.nist.gov | chemistry | Element/compound thermochemistry data |
| **Periodic-table.org sources** | iupac.org | chemistry | IUPAC official tables, atomic weights, naming conventions |
| **PhysRev archive (1893+)** | journals.aps.org | physics | PD pre-1923 portion |
| **arXiv math.HO (history)** | arxiv.org/list/math.HO | math · history | Math history surveys |

### Tier 3 — discovery / enrichment (no bulk, but high signal)

| Source | URL | Branch fit | Notes |
|---|---|---|---|
| **Wikipedia** | wikipedia.org | all | Author/concept stub generation; never canonical, always pointer |
| **Google Scholar** | scholar.google.com | all | No API but useful for citation network mapping |
| **OpenAlex** | api.openalex.org | all | Replaces MAG; 200M+ works, free API, citation graph |
| **Semantic Scholar** | semanticscholar.org | all | Free API + AI-extracted abstracts |
| **OpenLibrary** | openlibrary.org | all | Book metadata + linked archive.org full text |

### Tier 4 — cultural-corpus (sacred + art + history)

| Source | URL | Branch fit | Notes |
|---|---|---|---|
| **CCEL** (Christian Classics Ethereal Library) | ccel.org | sacred-texts | Augustine, Aquinas, Pascal, etc. PD |
| **Perseus Digital Library** | perseus.tufts.edu | sacred · history | Greek + Latin classical corpus |
| **The Met Open Access** | metmuseum.org/art/collection/api | art | 470K+ CC0 art images + metadata |
| **Smithsonian Open Access** | si.edu/openaccess | art · deep-history | 4.5M items CC0 |
| **DPLA** | dp.la | history · art | Aggregator for US digital libraries |
| **Wikidata** | wikidata.org | all | Structured entities for cross-linking canon |

---

## Recommended next-action sequence

1. **Spin up `agf-gutenberg`** — enables bulk PD ingestion across math/mind/sacred/art/history. ~1hr to build, then ~30 high-value targets queued.
2. **Spin up `agf-wikisource`** — gets us Cantor, Gödel, Riemann, Noether translations that aren't on archive.org.
3. **arXiv math + cosmology backfill** — extend existing `agf-arxiv` with `cat:math.*` + `cat:astro-ph.*` queries × top 50 each.
4. **Sacred texts mass scrape** — `agf-blog scrape sacred-texts.com` (static HTML, easy).
5. **PhilPapers + plato.stanford.edu** — closes the mind branch gap.
6. **OpenAlex citation graph** — for any canon-target person we have, pull every paper they cite + every paper that cites them.

## Estimated yield

- Gutenberg + Wikisource ≈ +500 docs (math/mind/sacred/history)
- arXiv math/cosmology ≈ +150 papers
- Sacred-Texts.com ≈ +200 documents
- PhilPapers + Stanford SEP ≈ +300 articles
- OpenAlex citation backfill ≈ +1000 papers

**Realistic next-week target: bucket-foundation FTS index from 1,159 → ~3,000 docs**, with every branch ≥200 primary-source docs and 01-mathematics + 09-sacred-texts moving from "sparse" to "covered".
