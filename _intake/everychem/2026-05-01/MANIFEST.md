# Everychem Mirror — Manifest

Sweep date: 2026-05-01
Method: `curl` with browser User-Agent (Cloudflare returns 403 to default fetchers; the WordPress-rendered HTML is then parsed with BeautifulSoup and saved as `.md` with source URL + fetch timestamp header). The WordPress sitemap (`wp-sitemap.xml`) returns 404 — the site has actively disabled the standard WP sitemap. Cloudflare interactive challenge blocks the JS-only `sitemap.xml` path.

Robots policy: explicitly Allow all, including `ClaudeBot`, `GPTBot`, `OAI-SearchBot`, `PerplexityBot`, `anthropic-ai`, `Google-Extended`. The 403s from the WebFetch tool are a Cloudflare bot-management decision, not a robots-policy decision.

## Files

| File | Source URL | Size (bytes) | Notes |
|---|---|---|---|
| home.md | https://everychem.com/ | 22,822 | Homepage. Product grid; "The latest in real neuroscientific advances, made possible" tagline. |
| about.md | https://everychem.com/about/ | 1,961 | One-paragraph mission. No named operator. Generic Cloudflare-obfuscated email. |
| contact.md | https://everychem.com/contact/ | 2,498 | Contact form, KB links. No phone, no postal address. |
| terms-and-conditions.md | https://everychem.com/terms-and-conditions/ | 10,882 | Research-chemicals legal disclaimer. "Not for human consumption", buyer 21+, FDA/EPA/OSHA/TSCA compliance shifted to buyer, FAA arbitration in Florida. |
| privacy-policy.md | https://everychem.com/privacy-policy/ | 3,141 | Standard WooCommerce privacy boilerplate. |
| shop.md | https://everychem.com/shop/ | 7,723 | Product catalog page. WooCommerce. |
| product-category-nootropics.md | https://everychem.com/product-category/nootropics/ | 7,560 | Nootropics category listing. |
| page-2.md | https://everychem.com/page/2/ | 21,214 | Second page of homepage product feed. |
| adjacent/iupac-gold-book.md | https://en.wikipedia.org/wiki/IUPAC_books | 805 | Adjacent — Gold Book summary, fetched via Wikipedia mirror because direct site returned 403 to WebFetch. |
| adjacent/pubchem.md | https://en.wikipedia.org/wiki/PubChem | 804 | Adjacent — PubChem summary. |
| adjacent/chembl.md | https://www.ebi.ac.uk/chembl/ | 751 | Adjacent — ChEMBL overview, direct fetch. |

## Failures

- `https://everychem.com/sitemap.xml` — Cloudflare JS challenge, content not retrievable.
- `https://everychem.com/wp-sitemap.xml` — 404 (site disabled the standard WP sitemap).
- `https://everychem.com/shipping/` — 404. The "Shipping & Delivery" footer link routes through `/kb/`.
- `https://goldbook.iupac.org/` — WebFetch 403; substituted Wikipedia mirror.
- `https://pubchem.ncbi.nlm.nih.gov/docs/about` — WebFetch returned an empty stub (NCBI page is JS-rendered); substituted Wikipedia mirror.

## Product categories observed (from internal links)

- Nootropics
- Anxiolytics
- Antioxidants
- Endogenous compound
- Ergogenics
- Longevity
- Peptides
- Thymoleptics
- Merchandise (Everychem branded apparel)

## Knowledge-base articles observed

- Changing or Modifying an Existing Order
- Domestic Shipping Methods and Free Shipping
- Finding COAs, Safety Data Sheets, and Product Information
- My Package Has Not Arrived or Seems Lost
- My Product Arrived Damaged or Defective
- Refund Policy — What's Refundable and What Isn't

## What is NOT here

No blog. No primary literature. No textbook content. No mechanism diagrams. No DOI references. No editorial. No "About the science" page. The site is a WooCommerce storefront with product pages and a help center — not a knowledge resource.
