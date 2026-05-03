# Patent Data Licensing — Per-Jurisdiction Redistribution Matrix

**Bead:** bkt-z6k (parent epic bkt-tfu)
**Status:** Pre-launch legal review for paid feed402 redistribution
**Author:** Operations pillar
**Date:** 2026-05-03
**Context:** Bucket Foundation plans to expose a `/patents/*` endpoint family on feed402 (x402 micropayments on Base, raw $0.010 / query $0.005 / insight $0.002 per call). This document determines, per source, whether we can resell content, link out only, or must skip.

---

## Executive Summary

Of the 10 sources reviewed, **3 are clean for paid commercial redistribution** (USPTO/PatentsView, Google Patents BigQuery, JPO J-PlatPat — the latter only after API trial graduation), **2 are conditionally clean with attribution + derivative-value requirements** (WIPO PATENTSCOPE, EPO OPS within fair-use cap), **3 require a paid commercial license** before any resale (Lens.org, IFI CLAIMS, KIPO/KIPRIS bulk), and **2 are effectively closed to non-domestic resellers** (CNIPA, JPO bulk beyond trial API). The good news: the three cleanest sources (USPTO + Google Patents BigQuery + EPO bibliographic) cover **>85% of the world's patent corpus by volume** when combined, because Google Patents BigQuery already aggregates DOCDB/INPADOC under CC-BY 4.0.

**Recommendation:** Launch v1 feed402 `/patents/*` on USPTO + Google Patents BigQuery (CC-BY 4.0). Add EPO OPS as a query-tier passthrough within fair-use caps. Treat Lens, IFI, KIPO, CNIPA, JPO as v2+ once paid-license budget is approved or an API-trial graduation is granted.

---

## Redistribution Matrix

| # | Source | Redist. scope | Commercial resale OK? | Attribution | Rate / cap | Paid tier (if needed) | Bucket verdict |
|---|--------|---------------|------------------------|-------------|-----------|------------------------|----------------|
| 1 | **USPTO bulk + PatentsView** ([data.uspto.gov](https://data.uspto.gov/), [USPTO TOU](https://www.uspto.gov/terms-use-uspto-websites)) | ✅ full text + metadata | **Yes** — public domain in US; PatentsView is CC-BY 4.0 | "USPTO acknowledged" requested; CC-BY 4.0 attribution for PatentsView | API: see [USPTO API rate limits](https://data.uspto.gov/apis/api-rate-limits); bulk: unlimited download | n/a — free | **Redistribute (v1 anchor)** |
| 2 | **EPO OPS** ([developers.epo.org](https://developers.epo.org/), [Fair Use Charter](https://ea.espacenet.com/?locale=en_EA&view=fairusecharter)) | ⚠️ bibliographic + abstracts; full text limited | **Conditional** — within fair-use cap commercial re-query is tolerated, but redistribution at scale requires reseller agreement (`ops@epo.org`) | "European Patent Office" credit required | **4 GB/week** free tier; 10 search-actions/min/IP | Reseller / "data usage agreement" — pricing on request, typically EUR low-thousands/yr | **Bibliographic-only via passthrough (v1)**, reseller agreement before bulk redistribution (v2) |
| 3 | **EPO Espacenet / DOCDB / INPADOC** (bibliographic) | ⚠️ bibliographic only | Yes via OPS within cap; bulk DOCDB/INPADOC is a paid EPO product | EPO credit | Bulk product = paid | DOCDB front-file ~EUR 4–6k/yr (contact EPO) | **Use Google Patents BigQuery passthrough (DOCDB is mirrored there CC-BY 4.0)** |
| 4 | **Google Patents Public Datasets on BigQuery** (`patents-public-data.patents.publications`, [announcement](https://cloud.google.com/blog/topics/public-datasets/google-patents-public-datasets-connecting-public-paid-and-private-patent-data)) | ✅ full text where source permits + global biblio | **Yes — CC BY 4.0** | "Google Patents Public Data by IFI CLAIMS Patent Services and Google, used under CC BY 4.0" | BigQuery query egress billed to caller | n/a — free dataset; pay BigQuery compute only | **Redistribute (v1 anchor — primary global source)** |
| 5 | **WIPO PATENTSCOPE** ([authorized uses](https://www.wipo.int/en/web/patentscope/data/terms)) | ✅ full text | **Conditional** — basic license = copy/publish/extract OK; commercial resale requires **derivative license** with "added value" + price-floor (no undercutting WIPO) | Mandatory: "Source: WIPO PATENTSCOPE" + WIPO disclaimer | Bulk anti-scrape on web app; bulk drops OK | Derivative license — request via WIPO; fees scaled to use | **Redistribute on `insight` tier only** (derivation = added value satisfies clause); cite PCT publications by number on `query` tier |
| 6 | **JPO (J-PlatPat / API trial)** ([JPO API page](https://www.jpo.go.jp/e/system/laws/koho/internet/api-patent_info.html), [handbook v14](https://www.jpo.go.jp/e/system/laws/koho/internet/document/api-patent_info/handbook_v14_e.pdf)) | ⚠️ bibliographic + classification; CSV export capped at 100 results | **Trial only** — currently in restricted-access trial; commercial redistribution explicitly not granted under trial terms | "JPO" credit | Per-account access cap; CSV ≤100 results | No public commercial tier; data also flows into Google Patents BigQuery under CC-BY 4.0 | **Skip direct integration; serve JP via Google Patents BigQuery passthrough** |
| 7 | **KIPO (KIPRIS)** | ⚠️ bibliographic | **Paid only** — KIPRIS free for search; bulk download / API for fee | KIPO credit | Per-account API quotas | KIPRISPlus paid tier — fees on request to KIPI | **Skip in v1; serve KR via Google Patents BigQuery passthrough** |
| 8 | **CNIPA (China)** | ❌ link-out only for non-CN entities | **No** — CNIPA requires a contractual agreement, and the contracting entity must be **based in China** | n/a | n/a | Not available to AGFarms (US entity) | **Skip; serve CN via Google Patents BigQuery passthrough** (which has CN biblio under CC-BY) |
| 9 | **The Lens** ([about.lens.org/policies](https://about.lens.org/policies/), [Commercial Use Agreement](https://support.lens.org/knowledge-base/commercial-use-agreement/)) | ⚠️ bibliographic + Lens IDs; no automated scraping | **Paid only** — free tier prohibits commercial use; **automated scraping/indexing is explicitly forbidden**; redistribution requires Commercial Use Agreement | "Enabled by The Lens" + Lens logo + Lens ID retained | Anon: 1k records; reg: no stated limit (non-commercial) | **Individual Commercial Use Agreement: $1,000/yr USD**; institutional toolkit higher | **Skip in v1.** If we want Lens enrichment in v2, buy the $1k/yr commercial license + obey the Lens-ID-retention rule |
| 10 | **IFI CLAIMS** ([ificlaims.com](https://www.ificlaims.com/), [reseller page](https://www.ificlaims.com/usage/data-reseller-commercial-use/)) | ✅ full text + enrichments under license | **Yes — but commercial license required**; IFI explicitly supports data-reseller licensing | Per contract | Per contract (CLAIMS Direct API) | Custom quote; not published — typical reseller licenses for global patent corpora run **$15k–$60k/yr** in this market | **Skip in v1.** Hold as the paid-fallback if v1 free-source coverage gaps prove material |

Legend: ✅ full text  ·  ⚠️ bibliographic only  ·  ❌ link-out only

---

## Recommended Launch Tier

### v1 — `/patents/*` ships at launch (clean for paid redistribution)

1. **`/patents/raw` ($0.010/call)** — USPTO full-text via Open Data Portal + Google Patents BigQuery (`patents-public-data.patents.publications`). Both CC-BY 4.0 / public domain. Full text legally redistributable.
2. **`/patents/query` ($0.005/call)** — same backing corpus, structured query results. Add EPO OPS bibliographic passthrough within the 4 GB/week fair-use envelope (cache aggressively to stay under cap; degrade to BigQuery DOCDB mirror if exceeded).
3. **`/patents/insight` ($0.002/call)** — Bucket-derived analytics on the v1 corpus. WIPO PATENTSCOPE content can enter here under the derivative-license "added value" clause (insights are by definition derived, not raw resale).

**Attribution payload included with every response:**
- `"USPTO acknowledged; data sourced from PatentsView (CC-BY 4.0) and Google Patents Public Data by IFI CLAIMS Patent Services and Google (CC-BY 4.0). EPO bibliographic data via OPS — © European Patent Office."`

### v2 — defer until license budget approved

- **The Lens** — purchase $1k/yr Individual Commercial Use Agreement, retain Lens IDs, add scholarly-patent linkage as a premium tier.
- **IFI CLAIMS** — quote and contract a reseller license if v1 coverage gaps are quantitatively material (likely not — Google Patents BigQuery already pulls IFI CLAIMS content under CC-BY).
- **EPO reseller agreement** — escalate to `ops@epo.org` once weekly traffic exceeds the 4 GB cap.
- **JPO API trial graduation** — apply for production API access once we can demonstrate sustained legitimate traffic.
- **KIPO KIPRISPlus** — purchase only if Korean coverage proves a customer-driven gap.

### Skip indefinitely

- **CNIPA direct** — non-CN entity contracting bar is absolute. Continue serving CN biblio via Google Patents BigQuery passthrough.

---

## Risk Notes

1. **Google Patents BigQuery downstream license stacking:** the dataset is CC-BY 4.0 overall, but specific IFI CLAIMS *enrichments* (CPC reclassification, etc.) within the dataset may carry separate commercial restrictions. Stick to the base `patents.publications` table for v1, defer the IFI-enriched columns to v2 license.
2. **WIPO derivative-license "no undercutting" clause:** our pricing ($0.002–$0.010/call) is unlikely to compete with WIPO's enterprise products, but if WIPO ever launches a per-call API at similar pricing we must re-evaluate.
3. **Lens automated-scraping prohibition:** even citing Lens IDs from third-party data is fine; what is forbidden is *bot-driven harvesting from lens.org*. We must not scrape; we must license if we want their data.
4. **EPO fair-use 4 GB/week:** at 1 KB average bibliographic record, that's ~4M records/week. Aggressive caching + BigQuery fallback keeps us well clear at v1 scale.

---

## Sources (date of access: 2026-05-03)

- USPTO Terms of Use — https://www.uspto.gov/terms-use-uspto-websites
- USPTO Open Data Portal API rate limits — https://data.uspto.gov/apis/api-rate-limits
- PatentsView transition guide — https://data.uspto.gov/support/transition-guide/patentsview
- EPO OPS developer portal — https://developers.epo.org/
- EPO Fair Use Charter — https://ea.espacenet.com/?locale=en_EA&view=fairusecharter
- Google Patents Public Datasets announcement — https://cloud.google.com/blog/topics/public-datasets/google-patents-public-datasets-connecting-public-paid-and-private-patent-data
- WIPO PATENTSCOPE authorized uses — https://www.wipo.int/en/web/patentscope/data/terms
- JPO Patent Information API trial — https://www.jpo.go.jp/e/system/laws/koho/internet/api-patent_info.html
- JPO API Handbook v14 — https://www.jpo.go.jp/e/system/laws/koho/internet/document/api-patent_info/handbook_v14_e.pdf
- The Lens policies — https://about.lens.org/policies/
- The Lens Commercial Use Agreement — https://support.lens.org/knowledge-base/commercial-use-agreement/
- IFI CLAIMS — https://www.ificlaims.com/
- IFI CLAIMS reseller / commercial use — https://www.ificlaims.com/usage/data-reseller-commercial-use/
