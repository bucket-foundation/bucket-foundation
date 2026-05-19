# Sacred-History Corpus — Source Inventory (rights-aware)

**Status:** inventory only. Nothing here is fetched until a human flips a
runner from `--dry-run` to live, and only after the LICENSE/RIGHTS column is
satisfied. When in doubt, a source is **metadata-only**.

Legend:
- **full-text-allowed?** = `Y` (public-domain / open license permits storing
  full text) · `metadata-only` (copyrighted or unclear — store only
  structure, IDs, verse counts, canonical URLs, never full text)
- **manuscript-provenance?** = does this source carry shelfmark / collection /
  digitised-manuscript provenance we can record (Wikidata P195/P276 style)
- A row being listed here is **not** an authorization to mirror it. It is an
  authorization to *consider* it, subject to the rights column.

---

## 1. Scripture / sacred-text sources, by tradition

### Judaism

| tradition | source | API/endpoint | format | LICENSE/RIGHTS | full-text-allowed? | manuscript-provenance? | notes |
|---|---|---|---|---|---|---|---|
| Judaism | Sefaria | `https://www.sefaria.org/api/` (texts, index, links) + GitHub `Sefaria/Sefaria-Export` + public GCS dump | JSON / structured text | Mixed per-text: PD, CC0, CC-BY, CC-BY-SA, **some CC-BY-NC** | **Y (per-text)** — must read per-text license field; CC-BY-NC = metadata-only for our (potentially commercial) use | indirect (links to mss editions) | Tanakh, Mishnah, Talmud Bavli/Yerushalmi, Midrash, Halakha, Kabbalah. Honor each text's `license` field; default to metadata-only when license absent. **In first slice: index structure only (dry-run), no text bodies.** |
| Judaism | Mechon-Mamre | `https://mechon-mamre.org/` (static) | HTML / plain | Public domain (Hebrew text, JPS-style); site terms allow copying | Y | no | Aleppo/Leningrad-tradition Hebrew Tanakh. Verify per-page terms. Not in first slice. |
| Judaism | Open Siddur Project | `https://opensiddur.org/` + GitHub | XML/TEI | CC0 / CC-BY (per item) | Y (per item) | no | Liturgy. Inventory only. |

### Christianity

| tradition | source | API/endpoint | format | LICENSE/RIGHTS | full-text-allowed? | manuscript-provenance? | notes |
|---|---|---|---|---|---|---|---|
| Christianity | KJV | bible-api / eBible / GitHub PD dumps | JSON / USFM / txt | **Public domain** (US); KJV is Crown copyright in UK — record provenance note | Y | no | Authorized Version 1769 Blayney. |
| Christianity | World English Bible (WEB) | eBible.org / bible-api | JSON / USFM | **Public domain** (explicitly dedicated) | Y | no | Modern PD translation, ideal canon base. |
| Christianity | ASV 1901 | eBible.org / GitHub PD | USFM / txt | **Public domain** | Y | no | |
| Christianity | Young's Literal (YLT) | eBible.org / GitHub PD | txt | **Public domain** | Y | no | |
| Christianity | Douay-Rheims (1899) | sacred-texts / GitHub PD | txt | **Public domain** | Y | no | Catholic English. |
| Christianity | Latin Vulgate (Clementine) | `vulsearch` / GitHub PD / sacred-texts | txt | **Public domain** | Y | no | Clementine 1592. |
| Christianity | STEP Bible (Tyndale House) | GitHub `STEPBible/STEPBible-Data` | TSV / tagged | **CC-BY 4.0** | Y (with attribution) | no | Original-language tagged: Hebrew (OSHB-derived), Greek (morphology, lemmas), translators' amalgamated tags. Strong canon source for original-language layer. |
| Christianity | bible-api.com | `https://bible-api.com/<ref>` | JSON | API returns mostly PD translations; per-translation license applies | Y for PD translations only | no | Convenience API; do not assume all returned translations are PD — gate on translation ID. |
| Christianity | API.Bible (ABS) | `https://api.scripture.api.bible/` | JSON | **Mostly copyrighted** (modern translations licensed to ABS) | **metadata-only** (versification, book/chapter structure, edition IDs) | no | Use only for structure/edition catalog, never full text of copyrighted versions. Requires API key. |
| Christianity | Codex Sinaiticus | `https://www.codexsinaiticus.org/` | images + transcription | Transcription: research/PD-leaning; images: per holding institution (BL/Leipzig/St Catherine's/NLR) | transcription Y (verify); images metadata-only | **yes** (4 holding institutions, folio-level shelfmarks) | 4th-c. Greek majuscule. Provenance is the high-value payload. |
| Christianity | Nag Hammadi / NT apocrypha | Wikisource / sacred-texts / Marvin Meyer (copyrighted) editions | txt | Old translations PD; modern critical translations **copyrighted** | mixed: PD editions Y, modern metadata-only | indirect | Gnostic codices. Record Coptic Museum provenance for the codices. |

### Islam

| tradition | source | API/endpoint | format | LICENSE/RIGHTS | full-text-allowed? | manuscript-provenance? | notes |
|---|---|---|---|---|---|---|---|
| Islam | Tanzil | `https://tanzil.net/` (Quran text downloads) | txt / XML | **Tanzil license** — verbatim Quran Arabic free to use unmodified, with attribution; modifications restricted | **Y (Arabic Uthmani/Simple, verbatim only)** | no | Authoritative verified Arabic text. Must not alter text; preserve license file. **In first slice (dry-run).** |
| Islam | quran.com API (Quran Foundation) | `https://api.quran.com/api/v4/` | JSON | Arabic: free; translations: **per-translation license** (many copyrighted) | Arabic Y; translations metadata-only unless PD/CC | no | Rich structure (juz, hizb, page, tajweed). Gate translations on license. |
| Islam | Quranic Arabic Corpus | `https://corpus.quran.com/` | morphology / treebank | **GNU GPL / CC-BY-style** (Leeds; verify current terms) | Y (with attribution) | no | Word-by-word morphology, syntactic treebank. High-value linguistic layer. |
| Islam | Sunnah.com | `https://sunnah.com/` (+ unofficial API) | JSON/HTML | Hadith Arabic generally PD; English translations **often copyrighted** | Arabic Y; English metadata-only unless PD | no | Bukhari, Muslim, the Six Books + Malik/Ahmad. Gate translations. |
| Islam | OpenITI | GitHub `OpenITI` | mARkdown/txt | **CC-BY / CC-BY-NC per text** | Y (per text) | indirect | Islamicate texts incl. classical commentary; per-text license. Inventory only. |

### Buddhism

| tradition | source | API/endpoint | format | LICENSE/RIGHTS | full-text-allowed? | manuscript-provenance? | notes |
|---|---|---|---|---|---|---|---|
| Buddhism | SuttaCentral | GitHub `suttacentral/bilara-data` + `suttacentral/sc-data` + `https://suttacentral.net/api/` | JSON / Bilara | **CC0** (all SC translations required CC0); root texts per source | **Y (CC0)** | indirect (links to canonical editions) | Pali Canon, Āgamas, parallels, structure. Cleanest open Buddhist corpus. **In first slice (dry-run).** |
| Buddhism | CBETA | `https://cbeta.org/` + GitHub `cbeta-org/xml-p5` | TEI/XML | **CC-BY-NC-SA** (CBETA edition) | Y for NC use only — **metadata-only for our potentially-commercial posture** | yes (Taishō/Manji vol/page refs) | Chinese Buddhist canon (Taishō, Manji). NC license → treat as metadata-only unless nonprofit-only use is contractually clear. |
| Buddhism | 84000 | `https://84000.co/` + `https://api.84000.co/` | JSON / TEI | **CC-BY-NC 4.0** | metadata-only (NC) | indirect (Tibetan Tengyur/Kangyur refs) | Translating the Tibetan Kangyur/Tengyur. NC → metadata-only. |
| Buddhism | GRETIL (Buddhist) | `http://gretil.sub.uni-goettingen.de/` | txt / TEI | Mixed — many texts PD/free for scholarly use; **per-file header governs** | per-file Y/metadata-only | no | Sanskrit Buddhist texts. Must parse per-file rights header. |

### Hinduism

| tradition | source | API/endpoint | format | LICENSE/RIGHTS | full-text-allowed? | manuscript-provenance? | notes |
|---|---|---|---|---|---|---|---|
| Hinduism | GRETIL | `http://gretil.sub.uni-goettingen.de/` | txt / TEI | Per-file header; many free for scholarly/non-commercial | per-file Y/metadata-only | no | Vedas, Upanishads, Itihāsa, Purāṇa, Śāstra. Parse per-file rights. |
| Hinduism | sacred-texts.com | `https://sacred-texts.com/hin/` | HTML/txt | Site content **public domain** (old translations, e.g. Müller, Griffith) | Y (PD editions) | no | PD-era English translations only. |
| Hinduism | Wikisource | `https://*.wikisource.org/` (REST + dumps) | wikitext / HTML | **CC-BY-SA / PD** | Y (with attribution / share-alike) | no | Bhagavad Gita, Upanishads (PD translations). |
| Hinduism | Vedabase / GRETIL adjacents | various | txt | Frequently **copyrighted** (e.g. BBT editions) | metadata-only unless PD/CC | no | Do not mirror BBT/copyright editions; structure only. |

### Sikhism

| tradition | source | API/endpoint | format | LICENSE/RIGHTS | full-text-allowed? | manuscript-provenance? | notes |
|---|---|---|---|---|---|---|---|
| Sikhism | SriGranth | `https://www.srigranth.org/` | HTML / DB | Gurmukhi text PD; site DB terms — verify; English translations may be copyrighted | Gurmukhi Y (verify); translations metadata-only | no | Sri Guru Granth Sahib, ang-by-ang. |
| Sikhism | iGurbani / BaniDB | `https://api.banidb.com/` | JSON | **MIT / open** (BaniDB project) | Y (verify per-source) | no | Open Gurbani DB API; cleaner than scraping SriGranth. Preferred open source. |

### Zoroastrianism

| tradition | source | API/endpoint | format | LICENSE/RIGHTS | full-text-allowed? | manuscript-provenance? | notes |
|---|---|---|---|---|---|---|---|
| Zoroastrianism | Avesta.org | `https://www.avesta.org/` | HTML/txt | Public-domain era translations (Darmesteter, Mills, West) | Y (PD editions) | indirect | Avesta (Yasna, Visperad, Vendidad, Yashts), Pahlavi texts. |
| Zoroastrianism | TITUS / GRETIL | `http://titus.uni-frankfurt.de/` | txt | Per-file; scholarly use | per-file | no | Avestan/Pahlavi critical text. Inventory only. |

### Taoism / Confucianism (Chinese classics)

| tradition | source | API/endpoint | format | LICENSE/RIGHTS | full-text-allowed? | manuscript-provenance? | notes |
|---|---|---|---|---|---|---|---|
| Tao/Confucian | ctext.org | `https://api.ctext.org/` | JSON | Source texts (pre-modern) **public domain**; ctext API ToS = personal/research, attribution; **bulk/redistribution restricted** | **Y (PD source text) but rate-limited & no bulk redistribution** | indirect (links to editions) | Daodejing, Zhuangzi, Analects, Mengzi, Yijing, Liji, etc. **First slice: dry-run lists target works only, respects ToS, no bulk pull.** |
| Tao/Confucian | Chinese Text Wikisource | `https://zh.wikisource.org/` | wikitext | **PD / CC-BY-SA** | Y | no | Backstop for PD source text without ctext ToS constraints. |

### Jainism

| tradition | source | API/endpoint | format | LICENSE/RIGHTS | full-text-allowed? | manuscript-provenance? | notes |
|---|---|---|---|---|---|---|---|
| Jainism | Jain Agamas (jainelibrary / GRETIL / sacred-texts) | various HTML/PDF | PDF/txt | PD-era translations (Jacobi, SBE vol 22/45) PD; modern Āgama editions **copyrighted** | PD editions Y; modern metadata-only | indirect | Śvetāmbara Āgamas, Tattvārtha Sūtra. JAINA elibrary terms vary — verify. |

### Baháʼí

| tradition | source | API/endpoint | format | LICENSE/RIGHTS | full-text-allowed? | manuscript-provenance? | notes |
|---|---|---|---|---|---|---|---|
| Baháʼí | Baháʼí Reference Library | `https://www.bahai.org/library/` | HTML | **Copyrighted** (© Bahá'í International Community; authorized translations) | **metadata-only** (work titles, structure, canonical URLs) | no | Authoritative English translations are © BIC. Index structure + cite only. |

### Latter-day Saints

| tradition | source | API/endpoint | format | LICENSE/RIGHTS | full-text-allowed? | manuscript-provenance? | notes |
|---|---|---|---|---|---|---|---|
| LDS | LDS scriptures (Book of Mormon, D&C, PoGP) | `https://www.churchofjesuschrist.org/` + community JSON (e.g. `bcbooks`/openscriptureapi) | JSON/txt | Original 1830 Book of Mormon text **public domain**; current official editions/footnotes © Intellectual Reserve | 1830 PD text Y; current editions metadata-only | indirect (printer's MS, original MS provenance) | KJV-based Bible used by LDS already covered. Record Original/Printer's Manuscript provenance. |

### Cross-tradition / apocrypha / comparative

| tradition | source | API/endpoint | format | LICENSE/RIGHTS | full-text-allowed? | manuscript-provenance? | notes |
|---|---|---|---|---|---|---|---|
| Cross | sacred-texts.com | `https://sacred-texts.com/` | HTML/txt | **Public domain** (Evinity / PD compilation) | Y (PD editions) | no | The widest PD comparative-religion corpus. PD translations only. |
| Cross | Project Gutenberg | `https://gutenberg.org/` + Gutendex API | txt/epub | **Public domain** | Y | no | PD sacred texts & SBE volumes. |
| Cross | Internet Archive | `https://archive.org/` + IA API | many | Per-item; many PD scans + metadata | per-item Y/metadata-only | **yes** (scanned mss, library provenance) | Already wired via `agf-archive`. Reuse for PD scans + provenance. |
| Cross | Wikisource (all langs) | REST API + dumps | wikitext | **CC-BY-SA / PD** | Y | no | PD sacred-text translations across traditions. |

---

## 2. Manuscript-location / provenance sources

| source | API/endpoint | format | LICENSE/RIGHTS | full-text-allowed? | manuscript-provenance? | notes |
|---|---|---|---|---|---|---|
| Wikidata | `https://query.wikidata.org/sparql` (P195 collection, P276 location, P217 inventory no.) | JSON/SPARQL | **CC0** | Y (metadata is CC0) | **yes (primary)** | Authoritative graph of which manuscript is held where + shelfmark. Core of the provenance index. |
| DigiVatLib (BAV) | `https://digi.vatlib.it/` + IIIF manifests | IIIF / images | Images per BAV terms (often CC-BY-NC for some, all-rights for others); **metadata Y** | metadata Y; images metadata-only | **yes** | Vatican Apostolic Library digitised mss (Vat. gr., Vat. lat., etc.). Record IIIF manifest URL + shelfmark, not images. |
| British Library digitised mss | `https://www.bl.uk/manuscripts/` + IIIF | IIIF / images | BL metadata generally **PD/CC0**; images per BL terms | metadata Y; images metadata-only | **yes** | Codex Sinaiticus (BL portion), Hebrew/Greek/Arabic mss. |
| e-codices | `https://www.e-codices.unifr.ch/` + IIIF | IIIF / images | Per-manuscript license (often CC-BY-NC); metadata open | metadata Y; images metadata-only | **yes** | Swiss medieval mss incl. Biblical/patristic. |
| Dead Sea Scrolls Digital Library | `https://www.deadseascrolls.org.il/` (Leon Levy, IAA) | images / metadata | IAA terms (research use; redistribution restricted) | metadata Y; images metadata-only | **yes** | Qumran scrolls — fragment-level provenance + plate IDs. |
| Trismegistos | `https://www.trismegistos.org/` | DB / API | **Academic; per-section terms (some CC-BY)** | metadata Y | **yes** | Texts/people/places from the ancient world; ties papyri/inscriptions to places & networks. |
| Internet Archive | `https://archive.org/` IA API | many | per-item | per-item | **yes** | Scanned manuscript facsimiles + library provenance fields. |

---

## 3. Historical-timeline source

| source | API/endpoint | format | LICENSE/RIGHTS | full-text-allowed? | manuscript-provenance? | notes |
|---|---|---|---|---|---|---|
| Wikidata SPARQL | `https://query.wikidata.org/sparql` | JSON/SPARQL | **CC0** | Y | indirect | Sacred/historical **events** via: `P585` (point in time), `P580/P582` (start/end), `P155/P156` (follows / followed by — sequence chains), `P361` (part of — e.g. part of a council/era), `P31` (instance of: religious event, council, schism, prophet, scripture). Drives the sacred/historical timeline graph. **In first slice (dry-run query, no bulk pull).** |

---

## Headline

- **Traditions covered:** 12 (Judaism, Christianity, Islam, Buddhism,
  Hinduism, Sikhism, Zoroastrianism, Taoism/Confucianism, Jainism, Baháʼí,
  LDS, plus a cross-tradition / comparative group) + manuscript-provenance
  layer + historical-timeline layer.
- **Distinct sources inventoried:** ~40 (scripture ~31, manuscript ~7,
  timeline 1, with overlap on Wikidata/IA/Wikisource).
- **full-text-allowed (PD/open):** the clearly-Y set includes KJV, WEB, ASV,
  YLT, Douay, Vulgate, STEP Bible (CC-BY), Tanzil Arabic, Quranic Arabic
  Corpus, SuttaCentral (CC0), sacred-texts.com PD editions, Gutenberg,
  Wikisource PD, BaniDB, Avesta.org PD, ctext PD source text (rate-limited,
  no bulk), Wikidata (CC0). Sefaria & GRETIL & OpenITI are **per-item**.
- **metadata-only (copyrighted / NC / unclear):** API.Bible modern versions,
  CBETA (NC), 84000 (NC), Baháʼí Reference Library, current LDS editions,
  modern Nag Hammadi/Agama critical translations, copyrighted Quran/Hadith
  English translations, all digitised-manuscript **images** (provenance
  metadata is recorded; images are not mirrored).

**Operating rule:** absent an unambiguous PD/open license in the row above, a
source is treated as **metadata-only**. Per-item sources (Sefaria, GRETIL,
OpenITI) must read the per-item license field at fetch time and fall back to
metadata-only on absence.

Sources verified during inventory:
- [Sefaria Copyright FAQ](https://github.com/Sefaria/Sefaria-Project/wiki/Copyright-FAQ)
- [Sefaria-Export README](https://github.com/Sefaria/Sefaria-Export/blob/master/README.md)
- [suttacentral/bilara-data (CC0)](https://github.com/suttacentral/bilara-data)
- [suttacentral/sc-data](https://github.com/suttacentral/sc-data)
