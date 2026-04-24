# Canon Index — Robert O. Becker

**Branch**: 05-biophysics
**Figure**: Robert Otto Becker, M.D. (1923–2008)
**Status**: seeded 2026-04-23, bead `bkt-research-17`
**Discipline**: bioelectric control of growth and regeneration; tissue
semiconductor electronics; environmental electromagnetic-field bioeffects

Canon contract: primary material only (papers Becker authored or coauthored,
his three books, estate-maintained site, direct-collaborator lineage). If a
file is not listed below, treat it as **not canon**.

---

## Manifest

| File | Purpose |
|------|---------|
| `CANON_INDEX.md` | This manifest — authoritative. |
| `biography.md` | Concise sourced biography and research-program summary. |
| `papers.bib` | BibTeX of all 56 Becker-authored/coauthored PubMed-indexed papers, 1961–2004. Generated from NCBI EUtils 2026-04-23. |
| `books.md` | Three books (*Electromagnetism and Life* 1982, *The Body Electric* 1985, *Cross Currents* 1990) with WorldCat/OpenLibrary links. No PDFs stored. |
| `lineage.md` | Influenced-by and extends-from network: Marino, Spadaro, Reichmanis (direct); Oschman, Ho, Liboff, Goodman, Blank, Blackman, Smith, Pollack, Levin (second-generation); Lund, Burr, Szent-Györgyi, Fröhlich (precursors Becker himself cited). |
| `site-mirror/2026-04-23/` | Full offline mirror of robertobecker.net (estate-maintained archive). Captured with `wget --mirror --page-requisites` honoring robots.txt. |

---

## Sources used

- **PubMed / NCBI EUtils** (`esearch` + `efetch`, 2026-04-23): query
  `becker+ro[au] AND (bioelectric OR regeneration OR electromagnetic OR
  electrical)`, 63 hits, filtered to 56 where an author named "Becker"
  appears. Filtering is conservative — some records may include other
  "Becker, R." authors; review `papers.bib` before citing in production.
- **robertobecker.net**: 94 WP pages extracted via `/wp-json/wp/v2/pages`.
  Publication-index pages (`orthopedics-publications`,
  `tissue-biophysics-publications`, `biocybernetics-publications`,
  `silver-publications`, `public-health-publications`,
  `science-policy-publications`, `1960s-publications`, `articles`) informed
  `biography.md` and cross-checked against PubMed.

## Known gaps (2026-04-23)

1. **Pre-1961 papers**: PubMed's coverage of early-1960s orthopedics
   journals is incomplete. robertobecker.net lists items in
   `1960s-publications` not indexed by PubMed. Not yet merged into
   `papers.bib`. Todo: manual entry from WP page + journal archives.
2. **Book chapters and conference proceedings**: not in PubMed. A manual
   pass against `biocybernetics-publications` and
   `tissue-biophysics-publications` is pending.
3. **Author disambiguation**: PubMed filter kept any author surname
   "Becker". A small number of the 56 entries may be coauthored by other
   Beckers. Flag any suspicious entry before canon-tier citation.
4. **`site-mirror/2026-04-23/`**: 262 files / 419 MB / 66 HTML pages
   captured (robertobecker.net, robots-compliant, wget exit 0). Rerun
   `wget --mirror` from inside the dated folder to refresh idempotently.
5. **Non-English sources**: none captured. Becker was primarily
   English-language; unlikely to matter.
6. **Legal / full-text PDFs**: not stored. Open-access reprints on
   Marino's LSU site (ortho.lsuhsc.edu/Faculty/Marino/) could be mirrored
   on a later pass if the server's reprint list is confirmed OA.

## Commentariat (NOT canon)

Interviews, third-party talks, and popular-science commentary live at
`../../../research-landscape/biophysics/becker-commentariat/`:
- `interviews.md`
- `talks.md`

These are landscape-tier — useful for provenance, not citable as canon.
