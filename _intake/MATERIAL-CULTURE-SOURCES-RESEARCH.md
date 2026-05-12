# Religious texts · manuscripts · archaeology · numismatics · physical objects

*Drafted 2026-05-12. Founder ask: "have you deep-dived religion / religious
texts / handwritten artifacts / archaeological findings / numismatics / coins
/ physical objects?" Honest answer: partial. Here's the audit + the gap fix.*

## Current corpus coverage (audit, 2026-05-12)

| Term | Docs in FTS | Source |
|---|---:|---|
| "sacred text" | 1,032 | sacred-texts.com blog scrape (1,000 pages) |
| egyptian | 466 | sacred-texts.com + Stanford SEP + Gutenberg |
| archaeology | 655 | scattered across openalex-citers, blog |
| manuscript | 425 | blog + Gutenberg |
| coin | 501 | scattered (mostly metaphorical / financial) |
| temple | 547 | mixed |
| tablet | 228 | mixed |
| inscription | 198 | mixed |
| gnostic | 251 | sacred-texts.com Hermetic + Nag Hammadi |
| hermetic | 112 | same |
| tarot | 211 | sacred-texts.com |
| sufi | 70 | sacred-texts.com |
| vedanta | 57 | sacred-texts.com Hindu corpus |
| sumerian | 58 | scattered |
| codex | 47 | mixed |
| kabbalah | 54 | sacred-texts.com Zohar |
| **cuneiform** | **14** | **GAP — no CDLI ingestion** |
| **numismatic** | **5** | **GAP — no Nomisma / ANS ingestion** |

**What's working**: world religious-text corpus is decently covered via
sacred-texts.com scrape (Hindu, Buddhist, Egyptian, Hermetic, Gnostic,
Kabbalistic, Sufi, Native American, Norse, etc.).

**What's missing**: structured museum/archaeology/coin data, manuscript
metadata, linked-open-data archaeology, cuneiform tablets.

## Open-license data sources, ranked by usefulness for canon

### Tier 1 — CC0 / public domain, with clean API (just ingest)

| Source | What | License | API | Est. items |
|---|---|---|---|---:|
| **Smithsonian Open Access** | All Smithsonian collections — physical objects, manuscripts, scientific instruments, anthropological artifacts | CC0 | `api.si.edu` (free, register for key) | ~4.4M |
| **Met Museum Open Access** | Met collection — paintings, sculptures, manuscripts, ancient artifacts | CC0 | `collectionapi.metmuseum.org` (no key) | ~492K |
| **Rijksmuseum** | Dutch national museum | CC0 | API (free key) | ~700K |
| **Walters Art Museum** | Medieval manuscripts, ancient art | CC0 | API (free) | ~36K |
| **Getty Open Content** | J. Paul Getty objects + Getty Research Institute archives | CC0 | API | ~140K |
| **Cleveland Museum of Art** | Ancient → modern art | CC0 | API | ~62K |

### Tier 2 — CC-BY or CC-BY-NC, free API

| Source | What | License | API |
|---|---|---|---|
| **Nomisma.org** | Ancient numismatic linked-data (OCRE, CRRO, PELLA) | CC BY 4.0 | SPARQL + RDF + JSON-LD |
| **British Museum** | World's largest encyclopaedic collection | CC BY-NC-SA 4.0 | SPARQL endpoint |
| **Europeana** | Aggregated EU cultural heritage (1000+ institutions) | varies, often CC BY | REST + SPARQL (free key) |
| **Open Context** | Archaeology data publishing — sites, contexts, artifacts | CC BY 4.0 | JSON-LD + Atom |
| **iDAI Arachne** | German Archaeological Institute — objects, sites, fieldwork | CC BY-NC-SA | REST API |
| **Pleiades** | Ancient places gazetteer — geocoded ancient world | CC BY 3.0 | JSON downloads + API |
| **Linked Ancient World Data** | Federated LOD over Pleiades, Pelagios, etc. | CC BY | SPARQL |

### Tier 3 — Specialized, public domain content, varies-quality APIs

| Source | What | API |
|---|---|---|
| **CDLI** (Cuneiform Digital Library Initiative) | ~370K cuneiform tablets (Sumerian, Akkadian, etc.) — full text transliterations | JSON dumps + ATF format |
| **ORACC** (Open Richly Annotated Cuneiform) | Annotated cuneiform corpus | JSON dumps |
| **Codex Sinaiticus** | Earliest complete NT manuscript | IIIF |
| **Dead Sea Scrolls Digital Library** | Leon Levy Digital Library | image-only, limited metadata |
| **Cairo Genizah** | Cambridge Genizah Research Unit | IIIF + metadata |
| **British Library Digitised MSS** | ~6,000 manuscripts | IIIF |
| **Vatican Apostolic Library** | DigiVatLib | IIIF |
| **Gallica / BnF** | Bibliothèque nationale de France | IIIF + REST |
| **Tibetan Buddhist Resource Center (BDRC)** | Tibetan Buddhist canon + manuscripts | Public IIIF |
| **Perseus Digital Library** | Greek + Latin + Arabic classical texts | TEI XML downloads |
| **Loeb Classical Library** | Classical Greek + Latin parallel texts | paywalled |
| **Tipitaka.org / SuttaCentral** | Pali Canon Buddhism + translations | downloads |
| **Tanzil / Quran.com** | Quran with translations + recitations | API |
| **STEPBible** | Hebrew + Greek + parallel translations | API |

### Tier 4 — Lower-priority or harder-to-ingest

| Source | Why lower |
|---|---|
| HathiTrust | IP-based auth; works only for member institutions |
| JSTOR | Paywalled |
| ARTstor | Academic-paywalled |
| Loeb digital | Subscription |

## What we should ingest tonight (high-leverage, easy)

### Priority A — fire immediately
1. **Smithsonian Open Access** — sample 5,000 items in canon-relevant categories: Scientific Instruments, Manuscripts, Anthropology, Asia, Egypt. CC0 → republishable.
2. **Met Museum** — search "ancient" + "manuscript" + "instrument" + "alchemy" + "astronomy" → ~10,000 CC0 records.
3. **Nomisma.org coin RDF** — full dump of OCRE (Roman imperial coinage) + CRRO (Republican) + PELLA (Macedonian). All RDF/JSON-LD with iconography descriptions.
4. **Pleiades** — full gazetteer of ancient places (~38,000 sites). JSON download. Geocodes our timeline.

### Priority B — slightly more work, very high value
5. **CDLI cuneiform dumps** — 370K tablets, transliterated.
6. **Open Context** — archaeology JSON-LD dumps for big projects (e.g. Petra North Ridge, Çatalhöyük).
7. **British Library Manuscripts** — IIIF metadata harvest (not images yet).
8. **Perseus TEI** — Greek + Latin classical corpus — would massively strengthen 09-sacred-texts.

### Priority C — image-heavy, defer
9. Vatican Library / BnF / BDRC — IIIF images need separate pipeline.
10. Dead Sea Scrolls — image-only.

## Why this matters for canon

The canon currently has a strong **text-of-ideas** layer (papers, books,
podcasts) but a weak **material-evidence** layer. Material culture is
**the strongest possible primary source** because:

1. **Objects are dateable independently of texts** — radiocarbon,
   stratigraphy, dendrochronology, numismatic typology. They ground
   the chronology with non-textual evidence.
2. **Objects existed before they were written about** — Göbekli Tepe
   (9500 BCE) predates writing by 6,000 years. The site is the
   evidence; we read it as primary.
3. **Coins are political-historical chronicles in metal** — Roman
   coins date emperors precisely, show iconography, reveal economic
   conditions. They're the most-replicated artifact class in
   history.
4. **Manuscripts ARE the texts** — when canon cites "Plato Republic
   374b" we should be linking to the actual surviving manuscript
   (e.g. Codex Parisinus graecus 1807). Otherwise we're citing
   modern editions, which are interpretations.
5. **Archaeology corrects textual narratives** — sphinx erosion,
   Younger Dryas impact-layer evidence, Antikythera mechanism — the
   physical record sometimes overturns what the texts claim.

## Branch & tier integration

```
bucket-canon/
  08-deep-history/
    sub-objects/                                    ← NEW
      cuneiform-tablets/   (CDLI ingestion)
      ancient-coins/       (Nomisma RDF)
      ancient-places/      (Pleiades gazetteer)
      monuments/           (Stonehenge, Göbekli, Sphinx, etc.)
      anthropological/     (Smithsonian, Walters)
  09-sacred-texts/
    sub-manuscripts/                                ← NEW
      codex-sinaiticus/
      dead-sea-scrolls/
      cairo-genizah/
      vatican-mss/
      bnf-gallica/
      tibetan-bdrc/
  _bridges/
    material-record/                                ← NEW BRIDGE
      → links text claims to surviving physical objects
```

Tier assignment for material evidence:
- **Nucleus**: dated artifact + peer-reviewed publication + replicated
  finding → e.g. Antikythera mechanism, Göbekli Tepe, Younger Dryas
  Boundary layer.
- **Functional**: catalogued object with provenance but contested
  interpretation → e.g. Sphinx water-erosion thesis.
- **Edge**: claimed artifacts without provenance / single-source → e.g.
  Crystal Skulls, Ica Stones, Voynich (uninterpreted).

## Tools to build (one per source)

| Tool | Source | Status |
|---|---|---|
| `agf-museum` | Met / Smithsonian / Rijksmuseum / Walters / Getty / Cleveland | TODO |
| `agf-nomisma` | Nomisma.org SPARQL/RDF | TODO |
| `agf-pleiades` | Pleiades JSON dump | TODO |
| `agf-cdli` | CDLI cuneiform JSON | TODO |
| `agf-opencontext` | Open Context JSON-LD | TODO |
| `agf-iiif` | Generic IIIF manifest fetcher (BL/Vatican/BnF/BDRC) | TODO |
| `agf-perseus` | Perseus TEI XML | TODO |

Each follows the existing `agf-*` pattern: stdlib + minimal deps,
idempotent, writes to `<venture>/<source>/<id>/`, integrates into
`agf-fts` automatically.

## Concrete grant case (this opens)

> "bucket.foundation is the first cross-domain canon that integrates
> textual claims, peer-reviewed papers, AND material evidence — coins,
> manuscripts, archaeology, museum objects — under a single tier-graded,
> bridge-detected, citation-linked knowledge graph."

Adding ~1M material-culture records ($0 cost via CC0 APIs) turns the
canon from "library of ideas" into "library of ideas + their physical
substrate." This is the Mellon Foundation / NEH / DAAD pitch.

## Risks

| Risk | Mitigation |
|---|---|
| CC BY-NC-SA conflicts with canon's open-source ethic | Keep BM data in `_intake/` (for research) not `bucket-canon/` (which is CC-BY) |
| Image-heavy IIIF blows up disk | Store metadata + thumbnail URLs only |
| Hallucinated "physical evidence" in claim cards | Require artifact ID + permalink for every nucleus-tier object |
| Language coverage (cuneiform, Akkadian, Tibetan) | Index transliteration; let LLM do translation on-demand via canon-llm |

## What's getting built TONIGHT

Step 1: Pull Met Museum CC0 sample (~500 ancient objects, no key needed)
Step 2: Pull Smithsonian sample (with API key request)
Step 3: Pull Nomisma OCRE Roman-coin dataset (~75,000 records)
Step 4: Pull Pleiades gazetteer (geocodes the timeline)

Each is a few hours of CPU work. By tomorrow morning we'll have:
- ~75,000 ancient coins indexed (numismatic gap closed)
- ~500 Met CC0 ancient artifacts
- ~38,000 ancient place gazetteer entries
- New web routes: `/canon/objects` (browse material evidence), `/canon/coins/[id]` (single coin), `/canon/places/[id]` (ancient place)

That's a tractable overnight build.
