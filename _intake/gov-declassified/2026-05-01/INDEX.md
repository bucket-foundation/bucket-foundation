# US Government Declassified Corpus — Index Manifest

Created 2026-05-01 by data pillar. Companion to the research memo at `bucket-canon/08-deep-history/_intake/us-gov-declassified-corpus-index-2026-05-01.md`. This is an inventory only — no documents have been mirrored yet. Subfolders are stubs ready for later, deliberate ingest.

## Reference table

| Archive | URL | Host agency / operator | Est. doc count | Search affordance | Bulk download | Notes |
|---|---|---|---|---|---|---|
| CIA FOIA Electronic Reading Room | https://www.cia.gov/readingroom/ | CIA | ~13M pages (CREST + topical) | Solr full-text + collection browse | Per-PDF; no API | Bot mitigation aggressive; mirror via archive.org |
| CIA CREST | https://www.cia.gov/readingroom/collection/crest-25-year-program-archive | CIA | ~930k docs / ~13M pages | Same as Reading Room | Via archive.org mirror (2016 snapshot) | 2017 release after MuckRock lawsuit |
| CIA-CREST mirror (Internet Archive) | https://archive.org/details/CIA-CREST | Internet Archive (Best/van Bergen) | Mirror of 2016 CREST | IA full-text + metadata | Yes (S3 API + torrent) | Not live-synced |
| NSA Declassification & Transparency | https://www.nsa.gov/Helpful-Links/NSA-FOIA/Declassification-Transparency-Initiatives/ | NSA | unconfirmed (tens of thousands of pages across releases) | Static portal browse | Per-PDF; no API | 403 to bots |
| NSA VENONA | https://www.nsa.gov/Helpful-Links/NSA-FOIA/Declassification-Transparency-Initiatives/Historical-Releases/Venona/ | NSA | ~3,000 cables | Browse by year/series | Per-PDF | Released 1995–96 |
| NSA Friedman Collection | (Cryptologic Heritage portal) | NSA / NCM | ~52,000 pages | Browse | Per-PDF | Released April 2015 |
| NARA National Archives Catalog | https://catalog.archives.gov/ | NARA | hundreds of millions of records (whole holdings) | Fielded REST/JSON API | Yes — bulk export pipeline | API key via Catalog_API@nara.gov |
| NARA JFK Records Collection | https://www.archives.gov/research/jfk | NARA | ~6M pages total; 88k+ pp released 2025–2026 | Browse + search | Per-PDF + tranche-archive ZIP | Mar/Apr 2025 + Jan 2026 large releases |
| NARA Founders Online | https://founders.archives.gov/ | NARA | ~185k documents | Full text + fielded | Bulk export available | Gold standard digital edition |
| FBI Records Vault | https://vault.fbi.gov/ | FBI | ~7,000 file groups | A–Z + topical browse | Per-file-group | No API; 403 to bots |
| FRUS / Office of the Historian | https://history.state.gov/historicaldocuments | State Dept | ~500 volumes (1861–2000) | Full text + fielded | **Yes — TEI XML on GitHub** | OPDS API; cleanest US gov surface |
| FRUS source repository | https://github.com/HistoryAtState/frus | State Dept | ~500 volumes | git | git clone | TEI P5 XML |
| DTIC Public | https://discover.dtic.mil/ | DoD | millions of technical reports | Full text + fielded | OAI-PMH endpoint | Engineering / contractor reports |
| DIA FOIA Reading Room | https://www.dia.mil/FOIA/FOIA-Electronic-Reading-Room/ | DIA | unconfirmed, est. low thousands | Topical browse | Per-PDF | Smaller than CIA |
| DOE OpenNet | https://www.osti.gov/opennet/ | DOE | ~485k bib refs / ~140k full text | Fielded + full text | Per-doc; OSTI APIs adjacent | Manhattan Project + nuclear |
| Pentagon Papers (NARA) | https://www.archives.gov/research/pentagon-papers | NARA | ~7,000 pp | Browse | Yes (full set ZIP) | Officially declassified June 2011 |
| DNI IC on the Record | https://www.intelligence.gov/ic-on-the-record-database/ | ODNI | hundreds of doc-sets, thousands of pages | Topical browse | Per-PDF | Created 2013 post-Snowden |
| USGS EROS Declassified Imagery 1 (CORONA/ARGON/LANYARD) | https://www.usgs.gov/centers/eros/science/usgs-eros-archive-declassified-data-declassified-satellite-imagery-1 | USGS / NRO | 860,000+ images | EarthExplorer | Free digital + paid scan-on-demand | Declassified Feb 23 1995 (EO 12951) |
| USGS EROS Declassified Imagery 2 (HEXAGON) | https://www.usgs.gov/centers/eros/science/usgs-eros-archive-declassified-data-declassified-satellite-imagery-2 | USGS / NRO | unconfirmed (large) | EarthExplorer | Same | Declassified 2011 |
| Senate Intelligence Cmte (SSCI) | https://www.intelligence.senate.gov/ | US Senate | report PDFs | Browse | Per-PDF | Torture Report exec summary 525 pp |
| Church Committee final reports | https://www.intelligence.senate.gov/ + maryferrell.org | US Senate | 6 books + 6 hearings vols | Per-page browse | Per-PDF | 1975–76 |
| 9/11 Commission | https://govinfo.gov/ + 9-11commission.gov (archived) | Independent commission | 567pp report + 17 staff monographs | Browse | Per-PDF | 2002–04 |
| National Security Archive (GWU) | https://nsarchive.gwu.edu/ | GWU (NGO) | ~700+ Briefing Books; DNSA ~100k records (paywalled) | Virtual Reading Room search | Per-Briefing-Book | Free side is the load-bearing one |
| The Black Vault | https://www.theblackvault.com/ | John Greenewald Jr. | ~2.4M pp / ~100k PDFs | Catalog browse | Per-PDF, click-through gated | UFO/UAP-heavy; broad scope |
| Government Attic | https://www.governmentattic.org/ | Michael Ravnitzky | unconfirmed, thousands | Index page browse | Per-PDF | High-signal obscure-document FOIA |
| MuckRock | https://www.muckrock.com/ | MuckRock Foundation | growing; 100k+ requests | REST API | Per-doc + project bundles | Drove 2017 CREST release |
| Internet Archive — CIA collection | https://archive.org/details/cia-collection | Internet Archive | tens of thousands of items | IA search + facets | S3 API + torrent | Mixed-quality individual uploads |
| Mary Ferrell Foundation | https://www.maryferrell.org/ | Mary Ferrell Foundation | hundreds of thousands of pp | Subscription search; free view | Per-doc | JFK / MLK / Church / Iran-Contra |
| UK National Archives — Discovery (HW series) | https://discovery.nationalarchives.gov.uk/details/r/C156 | UK National Archives | 17 series 1914–1949 | REST/JSON Discovery API | Digital files free; physical paid | GCHQ / GC&CS records |
| Wilson Center Digital Archive (CWIHP) | https://digitalarchive.wilsoncenter.org/ | Woodrow Wilson International Center | ~100k+ docs from ~100 archives in ~24 languages | Site search (undocumented JSON) | Per-doc | Translated Soviet/PRC/etc. primaries |

## Subfolders (stubs)

Each subfolder is a placeholder for later, deliberate ingest. Each has a `README.md` pointing back to the relevant section of the research memo.

- `cia/` — CIA Reading Room, CREST, CSI, library
- `nsa/` — VENONA, Friedman, Cryptologic Heritage, Black Chamber
- `nara/` — NARA Catalog, JFK Records, Nazi War Crimes, Founders Online, presidential libraries
- `fbi/` — FBI Records Vault
- `state-frus/` — Foreign Relations of the United States, Office of the Historian
- `dod/` — DTIC, DIA, Pentagon Papers
- `doe/` — OpenNet, Manhattan District History, nuclear-test films
- `congressional/` — Church, Pike, 9/11 Commission, SSCI Torture Report, Iran-Contra
- `third-party-aggregators/` — National Security Archive, Black Vault, Government Attic, MuckRock, Internet Archive, Mary Ferrell
- `international-peers/` — UK National Archives HW series, Wilson Center Digital Archive

## Provenance discipline

Per memo §5, file according to three tiers when ingest happens:

- **Tier A** — Primary documents from official declassification programs. Filed by agency / collection / date.
- **Tier B** — Curated thematic compilations from reputable third-party aggregators. Filed under host org with curator named.
- **Tier C** — Leaked materials and curator-driven personal collections. Filed under collection name with explicit provenance flag.

No conspiracy-research secondary literature in this folder tree. Documents only.
