# US Government Declassified Corpus — Inventory and Map

Intake document. Not promoted. Landscape/archive memo for `08-deep-history/`. Inventories the major publicly released US intelligence and government document archives, marquee collections, programmatic-access surfaces, and proposes a discipline rule for handling this material without importing the conspiracy-research aesthetic.

Author: data pillar (research sweep).
Mirror: `~/agfarms/bucket-foundation/_intake/gov-declassified/2026-05-01/` (index manifest + agency stub folders for later, deliberate ingest).

Reality check: this corpus is large enough that "mirror it all" is not a goal. CREST alone is ~13M pages. The job here is to build the index a serious researcher would want as a starting point, identify the 3–5 archives where a real ingest pipeline could attach, and state plainly what (if anything) crosses Bucket's canon promotion bar.

---

## 1. Inventory of primary release archives

### CIA — Central Intelligence Agency

**FOIA Electronic Reading Room (cia.gov/readingroom)** — the agency's public document portal. Hosts the CREST collection plus topical FOIA releases (UFO/UAP, Bay of Pigs, Stargate, Family Jewels, etc.) and curated narrative releases ("Stories"). Document organization is by collection (named topical sets) and by free-text search across the full index. PDF (mostly multi-page TIFF-derived scans, OCR'd). No public API; the search front-end is a Drupal/Solr implementation. Bot-mitigation is aggressive (our WebFetch returned 403; a normal browser User-Agent is not blocked).

**CREST — CIA Records Search Tool (`/readingroom/collection/crest-25-year-program-archive`).** ~930,000 documents, ~13 million pages, declassified under Executive Order 12958's automatic 25-year program. Brought online publicly in January 2017 after a multi-year MuckRock / Emma Best / Kel McClanahan FOIA lawsuit; before 2017 the database was reachable only on four terminals at NARA II in College Park. Format: scanned PDFs with OCR text layer of variable quality. License: US government work, public domain. Mirror exists at `archive.org/details/CIA-CREST` (Internet Archive item, populated from a 2016 scrape by Jurre van Bergen, organized by Michael Best — useful but not a complete or always-current mirror).

**CIA Library / Center for the Study of Intelligence (CSI) — `cia.gov/resources/csi/`.** Studies in Intelligence (the in-house journal, unclassified articles), books and monographs (the "Pfeiffer volumes" on the Bay of Pigs sit here, as does the in-house *Venona: Soviet Espionage and the American Response, 1939–1957*). License: US government work.

### NSA — National Security Agency

**NSA FOIA / Declassification & Transparency Initiatives (`nsa.gov/Helpful-Links/NSA-FOIA/Declassification-Transparency-Initiatives/`).** Hub page for NSA's public document releases. WebFetch returned 403 here; structure pulled from search and from the `nsa.gov/portals/75/documents/` static-PDF tree.

**VENONA collection.** ~3,000 decrypted Soviet intelligence cables, 1940–1948, released in seven tranches 1995–1996 under DCI John Deutch. Each cable is a multi-page PDF; introductory monographs by Robert Louis Benson and others accompany the release. Available at `nsa.gov/portals/75/documents/news-features/declassified-documents/venona/` and mirrored in the National Cryptologic Museum exhibit pages.

**Friedman Collection.** ~52,000 pages from William F. Friedman's personal cryptologic library and papers, released April 2015 in a single batch. Includes Friedman's *Military Cryptanalysis* monograph series (the in-house pedagogy that became the Aegean Park Press reprints).

**Cryptologic Heritage / Center for Cryptologic History.** Hosts the *Cryptologic Almanac*, the *Cryptologic Quarterly*, anniversary monographs (Korean War SIGINT, Cuban Missile Crisis SIGINT, USS Liberty, Pueblo, Tonkin Gulf reassessment), and the National Cryptologic Museum exhibit catalog.

**Black Chamber / pre-NSA materials.** Yardley-era and Signal Intelligence Service materials, partially mirrored in the Friedman Collection and the UK National Archives HW series.

No API. Bulk download is per-PDF, per-page from the static portals tree. Format: PDF, almost all OCR'd.

### NARA — National Archives and Records Administration

**National Archives Catalog (`catalog.archives.gov`).** The master catalog for all NARA holdings, including digitized presidential records, military service records, photographs, motion pictures, and the declassified document series. Two-tier API: a fielded REST/JSON search endpoint at `catalog.archives.gov/api/v2/` (key required, request via `Catalog_API@nara.gov`) and a bulk-export pipeline (CSV/PDF metadata + media). The catalog API is a real ingest surface — open-source server code is at `github.com/usnationalarchives/Catalog-API`. License: US government work for federal records; mixed for donated collections.

**JFK Assassination Records Collection (`archives.gov/research/jfk`).** The full collection is ~6 million pages across documents, photographs, motion pictures, sound recordings, and artifacts, mandated by the 1992 JFK Records Act. Major recent releases: March 18–20, 2025 (77,100 pages in 2,343 PDFs, 7.0 GB, under a March 17 2025 Trump executive order); April 3, 2025 (704 pages, 207 PDFs); January 30, 2026 (11,022 pages, 140 PDFs). The 2025 release was one of the largest single releases in US history; it also exposed live Social Security numbers of former staffers, which is a separate problem worth flagging when discussing the cost of bulk releases. Format: PDF.

**Nazi War Crimes & Japanese Imperial Government Records.** ~8.5 million pages declassified under the 1998 Nazi War Crimes Disclosure Act and the 2000 Japanese Imperial Government Disclosure Act. Hosted in the Catalog and via the IWG (Interagency Working Group) finding aids.

**Founders Online (`founders.archives.gov`).** ~185,000 documents from the papers of Washington, Adams, Franklin, Hamilton, Jefferson, and Madison. Open access, full text, searchable. Not declassified-intelligence-tier but is the gold standard for what a NARA digital collection looks like when properly funded.

**Presidential Libraries (FDR through Obama).** Each library hosts its own digital collection; most holdings are not online; quality of digital catalogs varies dramatically (FDR is good, Reagan and Bush 41 are partial).

### FBI — Federal Bureau of Investigation

**FBI Records Vault (`vault.fbi.gov`).** The FBI's electronic FOIA reading room. ~7,000 file groups (a file group can be one document or thousands of pages on a single subject). Organized by A–Z subject index plus topical browse categories: Civil Rights, Counterterrorism, Espionage, Famous Persons, Gangsters/Notorious Criminals, Organized Crime, Popular Culture, Unexplained Phenomena, Violent Crime, World War II, Foreign Counterintelligence, Bureau Personnel. WebFetch 403'd here too. Format: PDF (scanned, OCR variable). No API. License: US government work.

### State Department — Office of the Historian

**Foreign Relations of the United States (FRUS) — `history.state.gov/historicaldocuments`.** The official documentary record of US foreign policy. ~500 published volumes covering Lincoln (1861) through Clinton (2000), with new volumes still being added on a 30-year-rolling basis. Full text, fully open, multiple formats: HTML, PDF, EPUB, MOBI. Source files are TEI P5 XML and are kept in a public GitHub repository: `github.com/HistoryAtState/frus`. Two APIs: a no-auth, no-key OPDS-formatted ebook catalog at `history.state.gov/developer/catalog`, and the GitHub TEI source itself (effectively a free programmatic dataset). License: US government work, public domain.

**This is the highest-quality state-supplied historical document corpus the US government produces, and it is the easiest to ingest of anything in this memo.** If Bucket builds an ingest pipeline against exactly one US government archive, this is the one.

### DoD / DIA / Pentagon

**DTIC Public (`discover.dtic.mil`).** The Defense Technical Information Center's public-access portal. Holds unclassified and declassified DoD-funded technical reports — large in volume (millions of records), heavy in engineering, weapons, operations research, and basic-science contractor reports. Search affordance: full-text plus fielded metadata. Bulk export limited; classified and CUI subsets are gated.

**DIA FOIA Reading Room (`dia.mil/FOIA/FOIA-Electronic-Reading-Room/`).** Smaller than CIA's; topical FOIA releases plus the Intelligence Information Reports (IIRs) the agency has chosen to publish. Format: PDF.

**Pentagon Papers.** The full 7,000-page *Report of the Office of the Secretary of Defense Vietnam Task Force* was leaked by Daniel Ellsberg in 1971 (partial), the Senator Mike Gravel edition published the same year (Beacon Press, 4 vols.), and the full text was officially declassified and released by NARA in June 2011 on the 40th anniversary. Hosted at `archives.gov/research/pentagon-papers`.

### DOE — Department of Energy

**OpenNet (`osti.gov/opennet`).** ~485,000 bibliographic references and ~140,000 full-text declassified documents covering Manhattan Project, Atomic Energy Commission, nuclear-weapons history, nuclear-testing health effects, environmental remediation. Includes the full 36-volume *Manhattan District History* (released 2014). Search affordance: fielded metadata + full-text. No standalone API but the parent OSTI.gov has APIs and bulk-download options for the broader scientific/technical-report holdings.

**Nuclear Testing Archive (Las Vegas).** Physical archive; the in-scope digitized subset is in OpenNet. The declassified nuclear-test films (~10,000 reels released 2017–2018 by LLNL) are a separate corpus on YouTube and `archive.org`.

### DNI / ODNI — Director of National Intelligence

**IC on the Record (`intel.gov/ic-on-the-record-database/`, formerly `icontherecord.tumblr.com`).** Created in 2013 in the wake of the Snowden leaks. Posts declassified documents on US foreign-intelligence surveillance practice — primarily FISA Section 702 compliance assessments (now in their 27th–28th joint assessments), FISC opinions, transparency reports, and agency-wide procedural documents. Format: PDF, with HTML summaries. License: US government work.

Distinction worth flagging: the documents released here are *officially declassified* and are categorically different from the *Snowden-leaked NSA materials*, which are unauthorized disclosures of still-classified material currently hosted by news outlets and third-party archives (The Intercept's archive, ACLU's NSA Documents Database, Cryptome). Bucket should treat the two stacks as different evidentiary tiers — declassified releases are admissible primary sources; leaked materials are reliable in practice but legally and ethically distinct, and the provenance chain matters.

### Congressional investigations

**Church Committee (Senate Select Committee to Study Governmental Operations with Respect to Intelligence Activities, 1975–1976).** Six volumes of hearings, seven books of final reports. Full text on the Church Committee section of `intelligence.senate.gov` and mirrored at the Mary Ferrell Foundation (`maryferrell.org`).

**Pike Committee (House Select Committee on Intelligence, 1975).** The official report was suppressed by House vote; the Village Voice published a leaked draft in February 1976. Full text via the National Security Archive's Cyber Vault and various academic mirrors.

**9/11 Commission (National Commission on Terrorist Attacks Upon the United States, 2002–2004).** Final report (567 pp) plus 17 staff monographs and hearing transcripts. Hosted at `9-11commission.gov` (archived) and `govinfo.gov`. Full text, public domain.

**SSCI Committee Study of CIA Detention and Interrogation (the "Torture Report"), 2014.** 6,700-page full report (still classified); 525-page redacted Executive Summary released December 9, 2014. Executive Summary at `intelligence.senate.gov`, `archive.org/details/CIA-Senate-Torture-Report-2014`, and the National Security Archive's torture-archive section. Tens of thousands of footnotes; the citation apparatus alone is a research artifact.

**Iran-Contra (Tower Commission 1987; Joint Congressional Iran-Contra Committees 1987; Walsh Independent Counsel Final Report 1993).** Full text in govinfo.gov and in the National Security Archive's Iran-Contra collection.

### Third-party aggregators

**National Security Archive (`nsarchive.gwu.edu`).** Non-governmental research institution at George Washington University, founded 1985. Operates as: (a) a free, open Virtual Reading Room of curated declassified documents organized into thematic Briefing Books (now ~700+ Briefing Books, one of the most cited declassified-document publishers in academic IR), (b) a subscription product, the *Digital National Security Archive* (DNSA), with ~100,000 declassified records sold to libraries via ProQuest. The free side is the load-bearing one for Bucket. License posture: NSArchive copyrights its editorial work and indexing but the underlying documents are US-government public domain. Educational/non-commercial use permitted; permission needed for commercial reuse of NSArchive-curated compilations.

**The Black Vault (`theblackvault.com`).** John Greenewald Jr.'s long-running personal FOIA project (since 1996). Heavily UFO/UAP-focused but covers a broader range. Reported holdings of ~2.4M pages across ~100,000 PDF documents. WebFetch returned a low-content landing-page intro; the document indexes are gated behind a click-through. Useful as a FOIA-aggregator-of-last-resort for files that no agency has digitized but that Greenewald has paid out of pocket for.

**Government Attic (`governmentattic.org`).** Single-curator FOIA aggregator (Michael Ravnitzky). Smaller than the Black Vault but extremely high signal — the documents Ravnitzky requests are the obscure operational stuff (mandatory-declassification-review logs, agency policy manuals, IG reports). One-page-per-document index. No API.

**MuckRock (`muckrock.com`).** FOIA filing platform plus a public archive of all responsive documents from successful requests routed through it. Drove the 2017 CREST liberation (with National Security Counselors). Their CREST search guide and the broader "Unearthing CREST" project sit at `muckrock.com/project/unearthing-crest-cias-declassified-archives-100/`. Has a real API and a real search.

**Internet Archive (`archive.org`).** Hosts the CIA-CREST mirror (`archive.org/details/CIA-CREST`), a CIA-collection topical pool (`archive.org/details/cia-collection`), the JFK Records mirror, and innumerable individual document items. Bulk download via S3-style API + per-item torrents. Open license deference (preserves the underlying public-domain status of US government works).

**Mary Ferrell Foundation (`maryferrell.org`).** JFK records, MLK records, Church Committee, Iran-Contra, drug-trafficking. Subscription-tier search but most documents free to view. Heavily JFK-research-community-flavored; quality of indexing is excellent, the editorial framing leans toward the assassination-research school.

### International peers worth flagging

**UK National Archives — HW series (`discovery.nationalarchives.gov.uk`, dept ref HW).** GCHQ and predecessor (Government Code & Cypher School, GC&CS) records, 17 series covering 1914–1949, primarily WWII SIGINT including the Bletchley Park decrypts, Diplomatic Section decrypts (HW 12), WWII intelligence summaries (HW 13), VENONA UK-side (HW 15). Free online access for digitized files; physical files require Kew visit or paid scan-on-demand. Gale's *Twentieth-Century British Intelligence: Monitoring the World* is the subscription-aggregated digital edition.

**Wilson Center Digital Archive — Cold War International History Project (`digitalarchive.wilsoncenter.org`).** ~100,000+ documents from ~100 archives in ~24 languages, with English translations of Soviet, PRC, North Korean, North Vietnamese, Eastern European, and Cuban primary sources. Free, open, academically curated. The single best non-US-side companion to FRUS.

**German Federal Archive (Bundesarchiv) Stasi Records, French Service Historique de la Défense, Israeli State Archives.** Each has its own digital surface; none is in scope for this sweep but flagged for completeness.

---

## 2. Marquee declassified collections worth knowing by name

**VENONA.** ~3,000 decrypted Soviet GRU/NKVD cables, 1940–1948, released by NSA + CIA 1995–1996. Provides the strongest documentary basis for Soviet penetration of the Manhattan Project, the State Department, and the OSS. The cables themselves are short and operational; the secondary literature (Haynes & Klehr, Benson, Weinstein) reads them.

**Family Jewels (CIA).** 702 pages of internal CIA reports on agency activities possibly outside its charter, compiled 1973 at DCI Schlesinger's order, released June 2007 by DCI Hayden. The original document trail behind the 1975 Church Committee revelations.

**MKULTRA.** ~20,000 pages on the CIA's behavioral-modification research program (1953–1973). The bulk of the program's records were destroyed by DCI Helms's order in 1973; the surviving fragment was found in 1977 in a financial-records storage area and released to the Senate Church/Kennedy hearings. Available in the CIA Reading Room and on archive.org. **The conspiracy-research aesthetic is heaviest here; the documents themselves are mostly contract paperwork, expense reports, and dosing protocols, which is duller and more administratively damning than the popular narrative around them.**

**Pentagon Papers.** *Report of the Office of the Secretary of Defense Vietnam Task Force*, 7,000 pp, 1967. Leaked partial 1971 (Ellsberg, NYT/WaPo); Gravel edition 1971 (Beacon Press, 4 vols.); officially declassified in full June 2011 (NARA).

**JFK Assassination Records.** ~6 million pages mandated for release under the 1992 JFK Records Act. Major release tranches 2017, 2018, 2021, 2022, 2023, March 2025, April 2025, January 2026. The 2025 releases are the largest single tranches.

**Church Committee Final Report (1976).** Six books, the foundational documentary record of US intelligence-agency abuse 1947–1975. Distinct from the hearings (six earlier volumes).

**9/11 Commission Report (2004).** 567 pp plus 17 staff monographs, including the redacted "Joint Inquiry" 28 pages later released 2016.

**SSCI Torture Report Executive Summary (2014).** 525 pp from a 6,700-page underlying study still classified. Citation apparatus is an artifact in itself.

**Snowden-released NSA materials (2013–onward).** Tens of thousands of pages of NSA, GCHQ, and partner-agency documents disclosed by Edward Snowden via journalists. Hosted across The Intercept's archive, ACLU's NSA Documents Database, Cryptome, and academic mirrors. **These are leaked, not declassified — categorically distinct from anything else in this memo. Bucket should not file these alongside official declassified material without an explicit provenance flag.**

**Manhattan Project records.** *Manhattan District History* (36 vols., declassified in full 2014, on OpenNet); the underlying technical reports across DOE/OSTI; the Smyth Report (1945, the official public account).

**CORONA / ARGON / LANYARD satellite imagery.** 860,000+ images of the Earth's surface 1960–1972, declassified February 23, 1995 by Executive Order 12951 (Clinton). Hosted at USGS EROS / EarthExplorer. Subsequent declassifications of HEXAGON (KH-9, declassified 2011), GAMBIT (KH-7/KH-8), and DORIAN (KH-10) have followed. Heavily used in archaeology, climate science, and historical geography. **This is primary observational data, not a written document corpus.**

**STARGATE Project (CIA / DIA / Army INSCOM, 1972–1995, "remote viewing").** 12,000+ pages released January 2017 in the CREST drop. The program produced no operationally actionable intelligence; its release fueled a credulous secondary literature. The documents are an interesting record of how a US intelligence agency spent two decades and ~$20M on parapsychology.

**Project AZORIAN / JENNIFER (1968–1974).** CIA's covert recovery of the Soviet submarine K-129 using the *Hughes Glomar Explorer*. Partially declassified 2010 in a redacted CIA history.

**Iran-Contra documents.** Tower Commission Report (1987), Joint Congressional Iran-Contra Committee Report (1987), Walsh Final Report (1993, 3 vols.). Plus the National Security Archive's curated Iran-Contra collection.

**Pinochet / Chile Declassification Project (1999–2000).** ~24,000 documents on US support for the 1973 Chilean coup and the Pinochet regime. Released under Clinton-era reviews; hosted at the National Security Archive's Chile collection.

**Argentina dirty war declassification (2002, 2016, 2019).** State Department, CIA, and DIA records on US relations with the Argentine junta 1976–1983. Roughly 47,000 documents across the three releases.

**Guatemala 1954.** CIA's own internal history (the Cullather *Operation PBSUCCESS* monograph, 1994 internal, 1999 declassified, published 2006 by Stanford).

**Bay of Pigs.** Pfeiffer volumes (Vols. I, II, III, IV — Vol. III was withheld and finally released 2016). Plus the Inspector General's Survey of the Cuban Operation (the Kirkpatrick report, declassified 1998).

**CIA Iraq WMD post-mortems.** Duelfer Report / Iraq Survey Group Comprehensive Report (2004); SSCI's Phase I and Phase II reports on prewar intelligence on Iraq (2004, 2006, 2008).

**Operation NORTHWOODS (1962).** Joint Chiefs proposal for false-flag pretexts for war with Cuba; declassified late 1990s, released by NARA via the JFK Records Act. ~200 pp.

**Operation MOCKINGBIRD-related materials.** No single coherent document set with that codename; the relevant records are Church Committee Book I, plus various individual CIA-press relationship files in CREST. The popular usage of "Operation MOCKINGBIRD" is broader than what the documents support — flag this for the conspiracy-adjacency section.

**Operation PAPERCLIP.** Joint Intelligence Objectives Agency files (declassified across the 1970s–1990s); supplemented by the Nazi War Crimes Disclosure Act releases.

**OSS records (RG 226 at NARA).** ~7 million pages of Office of Strategic Services records, declassified across the 1980s and digitized in part by Fold3 (subscription).

**Project SHAMROCK / Project MINARET.** NSA mass-surveillance programs of the 1947–1975 era; surfaced in Church Committee Book III. Limited primary documentation released; most of what is known comes from the Church and Pike committee reports rather than the underlying agency files.

---

## 3. Search / API / programmatic access map

| Archive | API | Bulk download | Format | Real ingest target? |
|---|---|---|---|---|
| **FRUS / Office of the Historian** | OPDS REST catalog API at `history.state.gov/developer/catalog` (no key). TEI P5 XML source on GitHub at `HistoryAtState/frus`. Bibliographic metadata for ~500 vols. as a structured dataset. | Yes — `git clone` the GitHub repo gets you the entire corpus as XML. Plus per-volume EPUB/PDF. | TEI XML, HTML, PDF, EPUB. | **Yes — highest leverage.** Clean, well-structured, fully open, no auth, no scraping. |
| **NARA Catalog** | REST/JSON at `catalog.archives.gov/api/v2/` (key required, email request to `Catalog_API@nara.gov`). Open-source server at `github.com/usnationalarchives/Catalog-API`. | Yes — bulk export pipeline (CSV/PDF metadata + media) via authenticated bulk-export endpoint. | JSON/XML metadata; PDF/JPG/MP4 media. | **Yes — second highest.** Slower than FRUS to build against (key + bulk-export job model) but covers a far larger surface. |
| **Wilson Center Digital Archive** | No documented public API. Site search is JS-front-end; JSON endpoint exists but is undocumented. | Per-document PDF download. | PDF + HTML metadata. | Maybe — would require scraping; politically clean (academic, citation-friendly). |
| **MuckRock** | Yes — REST API at `muckrock.com/api_v1/` (auth required). Covers requests, agencies, and responsive documents. | Per-document; the platform itself archives to S3 + Internet Archive. | PDF + JSON metadata. | Yes for targeted topical pulls. |
| **Internet Archive (CIA-CREST + collections)** | Yes — Internet Archive REST + S3-style API, plus per-item BitTorrent. Documented at `archive.org/developers`. | Yes — torrent + `ia` Python CLI. | PDF + OCR'd text. | Yes — operationally the easiest way to grab the CREST mirror in bulk, but the mirror is a 2016 snapshot not a live sync. |
| **CIA Reading Room (cia.gov/readingroom)** | None public. Solr-backed search front-end. Aggressive bot mitigation. | Per-PDF only. | PDF (scanned, OCR variable). | No — go through the archive.org mirror or via FOIA. |
| **NSA portals** | None. Static `/portals/75/documents/` PDF tree. | Per-PDF. | PDF. | No. |
| **FBI Vault** | None. Plone CMS. | Per-file-group download. | PDF. | No (low priority). |
| **DOE OpenNet / OSTI** | OSTI has APIs (DOE.gov data services); OpenNet itself has no documented separate API. | Bulk metadata via OSTI; full text per-doc. | PDF + structured metadata. | Maybe — if a future Bucket effort wants Manhattan-Project-era nuclear physics primary sources, this is the route. |
| **DNI IC on the Record** | None. WordPress / static. | Per-PDF. | PDF. | No. |
| **DTIC** | OAI-PMH endpoint exists (`discover.dtic.mil/oai`); REST search front-end. | Per-report. | PDF. | Maybe — for DoD-funded technical reports specifically; large surface, narrow usefulness for canon. |
| **National Security Archive** | None (their own holdings). DNSA via ProQuest is paywalled. | Per-Briefing-Book PDF bundle. | PDF + HTML. | No — but cite extensively. |
| **The Black Vault** | None. | Per-PDF, click-through gated. | PDF. | No. |
| **Government Attic** | None. | Per-PDF. | PDF. | No. |
| **UK National Archives Discovery** | Yes — REST/JSON Discovery API (`discovery.nationalarchives.gov.uk/API/`). | Per-record; physical files require visit or paid scan. | Mixed (PDF, image, born-digital). | Yes for HW-series-specific work. |

**The five archives where a real ingest pipeline could attach are: FRUS, NARA Catalog, Wilson Center Digital Archive, MuckRock, and Internet Archive (for the CREST mirror specifically).** Of these, only the first two are first-class US-government-supplied programmatic surfaces. The other three are aggregator/community surfaces of varying durability.

---

## 4. What Bucket should and should not absorb

The corpus is large and the temptation is to over-absorb. Bucket's promotion rule for canon is **primary statement of an axiom, law, principle, or mechanism**. Almost nothing in this corpus meets that bar. Declassified intelligence and government documents are **primary historical sources** — they are evidence, not foundation. They belong in `08-deep-history/` as landscape/archive, not in any of the seven foundation branches.

Two narrow slices may approach canon-adjacent status; both are weak candidates and neither is being recommended for promotion in this sweep.

**(a) Cryptologic foundations.** William F. Friedman's *Military Cryptanalysis* monograph series (Volumes I–IV, written 1938–1941 as Signal Intelligence Service training material, declassified in tranches across the 1980s and republished by Aegean Park Press, then released in full by NSA in the April 2015 Friedman Collection drop) is a pedagogical primary text on classical cryptanalysis. It is the load-bearing cryptographic-pedagogy text for the pre-Shannon era. Bucket's `04-information/` branch will eventually need a cryptography sub-folder; *Military Cryptanalysis* is a defensible candidate at the pedagogical-primary tier, alongside Shannon's 1949 *Communication Theory of Secrecy Systems* (the actual canon text — published in *Bell System Technical Journal*, never classified). **Verdict: re-evaluate when `04-information/` is being seeded; do not promote out of an `08-deep-history/` intake.**

**(b) Remote-sensing / observational data.** The CORONA imagery (860,000+ images of the Earth's surface, 1960–1972) is primary observational data of historic significance. It is not a written document; it is not an axiom or law. It is in the same epistemic category as the WMAP/Planck CMB data or the Apollo lunar samples — primary measurement, with downstream scientific value. **Verdict: not canon. Belongs in `08-deep-history/` as a landscape entry, with a cross-reference to `06-cosmology/` if and when Bucket builds an observational-data convention.**

The honest call: **nothing from this corpus crosses Bucket's canon promotion bar in this sweep.** Two items (Friedman's *Military Cryptanalysis* and the Shannon 1949 paper that lives next to it) are flagged as future-canon-eligible candidates for `04-information/cryptography/` when that branch is being seeded; both are conditional on a separate sweep.

---

## 5. The conspiracy-theory adjacency problem

This corpus is the favorite hunting ground of conspiracy thinking. MKULTRA → mind-control panic. JFK files → an entire industry of assassination research. UFO/UAP releases → alien narratives. STARGATE → credulous psi-research literature. Operation MOCKINGBIRD → a load-bearing reference in three decades of media-criticism polemic that the underlying documents do not actually support. Operation NORTHWOODS → false-flag-everything frameworks. The Snowden archive → adjacent to but distinct from a post-2013 paranoid-online-culture aesthetic.

Bucket's canon rule is "primary statement of a law, principle, or mechanism." On that rule:

1. **The documents themselves are admissible** as historical primary sources. A declassified MKULTRA dosing protocol is a primary record of what an agency did. A CIA Office of Security memo is a primary record of an internal decision. A FRUS volume is the official documentary record of US foreign policy. These belong in `08-deep-history/` exactly because they are primary.

2. **The narratives built on top of these documents are landscape commentary at best, noise at worst.** Whittaker Chambers and Alger Hiss are a different epistemic case from the popular literature on MKULTRA, and both are different again from Greenewald's UFO catalogs. Bucket should not import a writer because they have a popular thesis built on declassified documents; Bucket should import the *documents themselves* and let canon-tier treatments cite them.

3. **Provenance flags matter.** Officially declassified ≠ leaked. Released-in-full ≠ released-with-redactions. Released-by-the-agency ≠ released-by-Congress-over-the-agency's-objection. Released-under-one-administration ≠ a stable historical position. The 2025 JFK release exposed live SSNs, which is a separate cost-of-bulk-release problem worth tracking.

**Proposed discipline rule for `08-deep-history/` re: declassified material.**

Three filing tiers, each with a different bar.

- **Tier A: Primary documents from official declassification programs.** FRUS volumes, NARA Catalog records, CREST collection items, OpenNet documents, FBI Vault file groups, DNI IC-on-the-Record postings, Congressional investigation final reports. Filed by agency / by collection / by date. No editorial framing required beyond a one-paragraph descriptor of what the document is, who released it, when, and under what authority. Citable; promotable to canon only via the sub-branch promotion process for `04-information/cryptography/` (or equivalent).

- **Tier B: Curated thematic compilations from reputable third-party aggregators.** National Security Archive Briefing Books, Wilson Center Digital Archive collections, Mary Ferrell Foundation collections (with caveat below), the CIA-CREST Internet Archive mirror. Filed under the host organization, with the curator named. The editorial framing is part of the artifact; cite both the documents and the curator's framing.

- **Tier C: Leaked materials and curator-driven personal collections.** Snowden archive, Wikileaks releases, The Black Vault, Cryptome. Filed under the collection name with an explicit provenance flag (`leaked`, `personal-FOIA-aggregator`, etc.). Citable as evidence with provenance noted; never filed alongside Tier A without the provenance flag.

The Mary Ferrell Foundation sits between B and C — academically credible documentary indexing, in service of an editorial position (the JFK assassination-research community's). Bucket should treat it as Tier B with the editorial-framing-named convention.

The conspiracy-research literature itself (the secondary tier built on these documents — books, podcasts, YouTube channels) does **not** belong in `08-deep-history/`. If a particular author is canon-tier on some other branch (rare), they enter through that branch on the standard promotion bar. If they are merely the popular interpreter of a declassified corpus, they are landscape commentary on someone else's site, not Bucket's job.

---

## 6. Recommended next actions

**(a) Mirror or build ingest against: National Security Archive (free side) + FRUS.** FRUS first because it is the cleanest programmatic surface in US government work — TEI XML, GitHub source repo, free OPDS API, no auth. A first pass can `git clone HistoryAtState/frus`, parse the TEI per-volume into structured Bucket-side metadata, and stand up a citable index of the entire ~500-volume series in a weekend. National Security Archive second because it provides the curated editorial framing (Briefing Books) that turns raw FRUS volumes into thematic narratives — the two stacks are complements, not substitutes. Both are acceptable to cite, both are stable, neither requires a paid subscription for the parts Bucket cares about.

The CREST mirror at `archive.org/details/CIA-CREST` is the third candidate but is a much larger, much messier ingest. Defer it; revisit when the FRUS/NSArchive pipeline is shipping.

**(b) Seed `08-deep-history/` with FRUS as the worked example.** It is the most boring choice and that is the point. FRUS is unimpeachable, fully open, well-indexed, and demonstrates what the Tier A filing convention looks like in practice. Pick one volume from the Cuban Missile Crisis sub-series (FRUS 1961–63 Vol. XI, *Cuban Missile Crisis and Aftermath*), write the one-paragraph descriptor and the two-paragraph context note, and that becomes the template for every subsequent agency/collection landing in `08-deep-history/`.

A more dramatic alternative — seed with the JFK Records Collection — is not recommended for the worked example. JFK is high-volume, high-noise, conspiracy-adjacent, and the 2025 SSN-exposure incident makes it a poor template. Save it for after the discipline rule is in place.

**(c) feed402 candidacy.** No. The entire US-government declassified corpus is already free and public. There is no payment substrate to bolt on, no merchant pattern to build, no agent-discoverable supply gap. The two narrow exceptions (DNSA at ProQuest, the Gale British Intelligence collection) are already-paywalled academic-vendor products that are not candidates for an x402 wrapper. **Verdict: not a feed402 candidate. Different protocol entirely; this is a citation-and-mirror problem, not a metered-data-merchant problem.**

---

## Sources used in this sweep

- [CIA Reading Room — CREST 25-Year Program Archive](https://www.cia.gov/readingroom/collection/crest-25-year-program-archive)
- [CIA — "CIA Posts More Than 12 Million Pages of CREST Records Online" (Jan 2017)](https://www.cia.gov/stories/story/cia-posts-more-than-12-million-pages-of-crest-records-online/)
- [Internet Archive — CIA CREST mirror](https://archive.org/details/CIA-CREST)
- [MuckRock — Unearthing CREST project](https://www.muckrock.com/project/unearthing-crest-cias-declassified-archives-100/)
- [NSA — VENONA portal](https://www.nsa.gov/Helpful-Links/NSA-FOIA/Declassification-Transparency-Initiatives/Historical-Releases/Venona/)
- [NSA — Cold War VENONA exhibit](https://www.nsa.gov/History/National-Cryptologic-Museum/Exhibits-Artifacts/Exhibit-View/Article/2718842/cold-war-venona/)
- [FBI Records Vault](https://vault.fbi.gov/)
- [NARA — JFK Assassination Records 2025 release](https://www.archives.gov/research/jfk/release-2025)
- [NARA — National Archives Catalog API documentation](https://www.archives.gov/research/catalog/help/api)
- [usnationalarchives/Catalog-API on GitHub](https://github.com/usnationalarchives/Catalog-API)
- [Office of the Historian — Developer Resources](https://history.state.gov/developer)
- [Office of the Historian — Ebook Catalog API](https://history.state.gov/developer/catalog)
- [HistoryAtState/frus on GitHub (TEI XML source for the FRUS series)](https://github.com/HistoryAtState/frus)
- [DOE — Manhattan Project Historical Resources](https://www.energy.gov/lm/manhattan-project-historical-resources)
- [DOE OpenNet — Manhattan Project Library](https://www.osti.gov/opennet/manhattan-project-history/Resources/library.htm)
- [DIA — FOIA Electronic Reading Room](https://www.dia.mil/FOIA/FOIA-Electronic-Reading-Room/)
- [USGS EROS — Declassified Satellite Imagery 1 (CORONA/ARGON/LANYARD)](https://www.usgs.gov/centers/eros/science/usgs-eros-archive-declassified-data-declassified-satellite-imagery-1)
- [USGS EROS — Declassified Satellite Imagery 2 (HEXAGON)](https://www.usgs.gov/centers/eros/science/usgs-eros-archive-declassified-data-declassified-satellite-imagery-2)
- [DNI — IC on the Record (Newly Declassified Documents)](https://www.intelligence.gov/ic-on-the-record-database/declassified/newly-declassified-documents)
- [SSCI — Torture Report Findings & Conclusions PDF](https://www.intelligence.senate.gov/wp-content/uploads/2024/08/sites-default-files-press-findings-and-conclusions.pdf)
- [Internet Archive — Senate CIA Torture Report Executive Summary](https://archive.org/details/CIA-Senate-Torture-Report-2014)
- [National Security Archive (GWU)](https://nsarchive.gwu.edu/)
- [National Security Archive — Torture Archive landing](https://nsarchive2.gwu.edu/torture_archive/report.html)
- [The Black Vault](https://www.theblackvault.com/)
- [Government Attic](https://www.governmentattic.org/)
- [UK National Archives — Discovery (GCHQ records)](https://discovery.nationalarchives.gov.uk/details/r/C156)
- [UK National Archives — Intelligence and security services research guide](https://www.nationalarchives.gov.uk/help-with-your-research/research-guides/intelligence-and-security-services/)
- [Wilson Center — Cold War International History Project](https://www.wilsoncenter.org/program/cold-war-international-history-project)
- [Harvard Library — US Declassified Documents by Agency research guide](https://guides.library.harvard.edu/usdeclassifieddocs/agency)
- [Library of Congress — Declassified Documents research guide](https://guides.loc.gov/finding-government-documents/declassified-documents)
