# Patents in Research OS

Patents as first-class research objects: a paid patents gateway over x402 with feed402 envelopes, patent nodes in the graph beside papers and canon, prior-art search on any node or production, claims read as combinations of known ideas, and invention disclosure as a production.

The founder, 2026-09-18: "if we are focused on scientific research, discovery, and innovation, patents are super important too," and "patents should have its own x402 researchgateway and feed402, do some internal external research on that."

The founder, 2026-09-19: "the x402 feed402 patents work is a different bucket org repo." The gateway lives in [bucket-foundation/x402-research-gateway](https://github.com/bucket-foundation/x402-research-gateway) and the protocol in [bucket-foundation/feed402](https://github.com/bucket-foundation/feed402); their patent work is tracked there. This file holds the Research OS side of the ros-patents epic: what Research OS reads, how patents enter the graph, and where a researcher meets them. Slice 0 comes first; slices 1 to 4 (the research memo, the first corpus, prior-art search, claims and disclosure) follow in the queue.

## Slice 0: the gateway and Research OS

### What the repositories hold

As of 2026-09-19.

**feed402** (`~/agfarms/feed402`, Gian's MIT protocol and reference server; remotes `gianyrox/feed402` and `bucket-foundation/feed402` on GitHub):

- `SPEC.md` §6.1 defines six routes: `/patents/search`, `/patents/{id}`, `/patents/by-coord`, `/patents/family/{id}`, `/patents/citations/{id}` at the query and raw tiers ($0.005, $0.010), and `/patents/insight` at $0.002. Section 6.1.1 turns the jurisdiction rules into a structured rights block: US records from PatentsView or Google Patents carry CC-BY-4.0 on metadata and content with every action allowed; EP records through EPO OPS allow metadata and deny content, text mining, and training; WO records reach the insight tier alone. The fixture is `fixtures/v0.3/insight-rights-patents-jurisdiction.json`.
- `routes/patents.ts` (651 lines) mounts the six routes and a seventh, `/citation`, behind a payment guard, with domain types that mirror this repository's USPTO schema, a `PatentsRepo` interface, and a `MockPatentsRepo`. No real data backs it.

**x402-research-gateway** (bucket-foundation org, `main` at `af92a61`; the local checkout under `~/agfarms` follows `gianyrox` and lags it):

- A provider registry (`config/providers.yaml`) with typed adapters behind feed402/0.3 envelopes.
- One live patent provider, `uspto-odp` (gateway #18, closed by #64 on 2026-08-18): search and fetch over USPTO ODP's Patent File Wrapper API, with parties, CPC and USPC classes, and the parent and child continuity that stands in for a family. It is US only and public domain, verified live against an ODP key provisioned to the founder's USPTO account.
  - Forward and backward citations are verified absent from that API, so the gateway answers a citation request for this provider as unsupported.
  - The routes are `/research/uspto/search` and `/research/uspto/fetch` in `config/routes.yaml`, the config `deploy.sh` loads through `docker-compose.prod.yml`. They are missing from `config/routes.hetzner.yaml`, which `docker-compose.hetzner.yml` loads. Which of the two runs at `x402-research.agfarms.dev` is unconfirmed.
- Google Patents, EPO OPS, and WIPO PATENTSCOPE are registered as `discovered`, with redistribution unknown and no adapter. Lens is registered.
- It settles on FareSide's free testnet facilitator. `decodeAndVerifyPayment` builds its payment requirements from the client's payload, as on the older copy.

**bucket-foundation**:

- `data/patents/uspto/`: the USPTO Postgres schema (`schema/uspto.sql`, bead bkt-5qg), fetch scripts, and a loader skeleton, with no data directories. Both fetch scripts point at hosts that no longer serve the data: the PatentsView S3 path answers 403 and `bulkdata.uspto.gov` does not answer (checked 2026-09-19).
- `local/patents/`: a local DuckDB index with vector search (bkt-ibj), with no data. Its `scripts/05-serve.ts` already holds a DuckDB-backed `PatentsRepo` and serves feed402's routes with payment off, but calls `mountPatents(app, repo, {...})`, which no longer matches the current signature `mountPatents(app, {repo, guard})`, and writes receipts as `tx: "local-mode-no-payment"`.
- `docs/FEED402_PATENTS.md`: the route surface (bkt-zx6), with the real repository, pgvector claims, and PostGIS locations pending.
- `docs/PATENT_LICENSING.md` (2026-05-03, bkt-z6k): ten sources reviewed for paid redistribution. Its v1 verdict is USPTO with PatentsView and Google Patents Public Data on BigQuery, both CC-BY-4.0, plus EPO OPS bibliographic data within the fair-use cap, and WIPO PATENTSCOPE content on the insight tier under a derivative license. Lens, IFI CLAIMS, KIPO, CNIPA, and JPO wait on paid licenses. Its claims are checked against the sources below before the design rests on them.

**Research OS's chat** already reads patents. `src/app/api/chat/route.ts` gives the model a `feed402_search_patents` tool, which calls the patents service through `src/lib/feed402-client.ts` at `FEED402_BASE_URL` (default `http://localhost:8402`) with a stub `X-Payment` header. The client does not match the service: it asks `/citation?url=` where feed402 reads `canonical_url`, and it expects `results` where the service answers `data.rows`.

So the protocol side is written and mocked, the licensing is mapped, the schema exists, and no patent record has been loaded anywhere.

### What changed outside since the licensing matrix

Checked 2026-09-19 against the sources named.

**PatentsView is now part of the USPTO Open Data Portal, and its search API is paused.** On 2026-03-20 PatentsView moved into the Open Data Portal (ODP). Its downloads and data dictionaries are served from ODP, while its search, APIs, visualizations, and support "will pause temporarily", and the USPTO "plans to reintroduce these functions in updated forms" with no date given ([USPTO notice, 2026-03-18](https://www.uspto.gov/subscription-center/2026/patentsview-migrating-uspto-open-data-portal-march-20); [ODP transition guide](https://data.uspto.gov/support/transition-guide/patentsview)). Keys issued for the old PatentSearch API do not work on ODP. The matrix's v1 plan, a query tier in front of PatentsView, has no live API to stand in front of.

**ODP needs a verified account.** ODP APIs take an API key tied to a USPTO.gov account verified through ID.me, limited to 60 requests a minute per key and 4 a minute for PDF and ZIP downloads, with a weekly download quota that answers HTTP 429 for seven days once exceeded ([ODP getting started](https://data.uspto.gov/apis/getting-started); [ODP rate limits](https://data.uspto.gov/apis/api-rate-limits)). From 2026-06-18 every use of ODP, the web included, requires a signed-in USPTO.gov account with multi-factor authentication; the USPTO gave site security and "costly, unregistered bot traffic" as the reasons ([Patent Riff, 2026-05-01](https://blog.patentriff.com/p/not-so-open-uspto-to-require-registration)). A key belongs to a person, so loading the bulk tables waits on the founder's account.

**Google Patents Public Data is unchanged.** The BigQuery tables `patents-public-data.patents.publications` and the rest stay under CC BY 4.0, "Google Patents Public Data by IFI CLAIMS Patent Services and Google", with worldwide bibliographic data and US full text ([Google Cloud blog](https://cloud.google.com/blog/topics/public-datasets/google-patents-public-datasets-connecting-public-paid-and-private-patent-data); [google/patents-public-data](https://github.com/google/patents-public-data)). BigQuery bills by bytes scanned, so a slice by CPC class exported once costs one query.

**EPO OPS data may go inside Bucket's own products.** The EPO's terms for OPS (version 2.0, September 2017) grant a licence to "use and include these data in their own machine-readable databases, products and services" and to "distribute the data as part of these products" (clause 3.1), and forbid making "the data as such available to the public" or copying and distributing "the data as such" (3.2). No royalties are due on products built with OPS data (4.6). A weekly volume is free and a yearly subscription covers more (4.1, 4.2); both figures sit in the EPO price list, which was not read, and secondary sources give 3.5, 4, and 5 GB a week ([EPO OPS terms](https://developers.epo.org/sites/default/files/terms_and_conditions_OPS%202.0%20EN_DE_FR.pdf)). So an EP record may appear inside a Bucket answer or a merged record, and a query route that relays OPS results as they come breaks 3.2. The matrix's plan of an OPS "query-tier passthrough" does not hold.

**EPO's bulk data became free in 2025.** Under a pricing change dated 2025-01-01, with the products released between 2025-01-23 and 2025-02-17, the EPO serves seven bulk products, DOCDB worldwide bibliographic data, INPADOC, and EP full text among them, free and without an account from the public area of its Bulk Data Distribution Service ([patent.dev](https://patent.dev/game-changer-key-epo-patent-datasets-are-now-free/); [patent-dev/epo-bdds](https://github.com/patent-dev/epo-bdds)). They fall under the EPO's raw-data licensing terms, which did not render to the tools used here and were not read. Until they are, EP data stays out of v1.

**ODP has one live US API.** The Open Data Portal's Patent File Wrapper search answers today with US application data ([ODP search API](https://data.uspto.gov/apis/patent-file-wrapper/search)). It runs on one person's key, and the ODP pages give 60 requests a minute per key, while the gateway's registry records weekly quotas for its key. A loader or a nightly refresh fits within that; whether a public paid route can run on a personal key, and at what volume, is a question in gateway #68.

**WIPO data costs a licence before any resale.** WIPO's terms for PCT data products (last updated 2025-11-12) grant bulk redistribution only under a paid derivative licence, and only "with 'added value' (i.e., with substantial modification of the PCT data, beyond that made available 'as is')"; the basic, non-derivative, and derivative licences all carry fees ([WIPO terms](https://www.wipo.int/en/web/patentscope/data/terms)). The matrix admitted WIPO content to the insight tier under the derivative clause; that clause applies after a licence is bought. WIPO stays out of v1.

**The patent-to-paper link data is non-commercial.** Reliance on Science by Matt Marx and Aaron Fuegi, version 65 (2026-07-22), holds patent-to-paper citations through patents granted in 2025, front page and body text, with a confidence score from 1 to 10 for each, in `pcs_oa_uspto.csv` (1.4 GB) keyed to OpenAlex works, under CC BY-NC 4.0 ([Zenodo](https://zenodo.org/records/21493744); Marx and Fuegi, [Strategic Management Journal 41(9) 2020](https://doi.org/10.1002/smj.3145) and [Journal of Economics and Management Strategy 31(2)](https://doi.org/10.1111/jems.12455), published though Zenodo still calls it forthcoming; both DOIs checked in OpenAlex). The licence bars use "primarily intended for or directed towards commercial advantage or monetary compensation". Bucket charges x402 citation fees and is not yet a filed nonprofit, so Reliance on Science stays out of v1 everywhere, Research OS included. Patent-to-paper links come from the non-patent literature references in the PatentsView bulk tables (CC BY 4.0), matched to OpenAlex by Bucket.

**Patent data already sells over x402, at far higher prices.** Apify's "USPTO Patent Search" actor accepts x402 payment in USDC with no API key and charges $0.10 per patent, returning claims text, CPC classes, cited patents, and forward citation counts ([Apify, nexgendata/uspto-patent-search](https://apify.com/nexgendata/uspto-patent-search)). Catalogs of keyless x402 endpoints list patents among hundreds of data kinds ([2s.io](https://2s.io/learn/x402)). Subscription sellers price by the month: SerpApi's Google Patents API from $25 a month, about 2.5 cents a search at the entry plan; PQAI's API from $199 a month for 600 queries; IFI CLAIMS by quote with no metering ([SerpApi](https://serpapi.com/google-patents-api); [PQAI on Lens alternatives](https://projectpq.ai/lens-org-alternatives/); [IFI CLAIMS FAQ](https://www.ificlaims.com/about-us/faqs/)). feed402's $0.010 for a full grant is a tenth of that x402 seller's price.

**The facilitator fee is a floor on price.** Coinbase's CDP facilitator settles the first 1,000 onchain transactions a month free, then charges $0.001 each, and needs a CDP API key; it covers Base, Polygon, Arbitrum, World, and Solana, and indexes an endpoint in the Bazaar discovery layer once it settles a payment for an endpoint that advertises Bazaar metadata ([CDP facilitator](https://docs.cdp.coinbase.com/x402/core-concepts/facilitator)). Past the free thousand, a $0.002 insight call pays half its price to settlement. The research gateway settles through `facilitator.x402.rs` on Base Sepolia today, which its operator, FareSide, runs as "a free testnet facilitator" whose tokens have "no real value" ([facilitator.x402.rs](https://facilitator.x402.rs)). The gateway takes no real money yet.

### Design

The gateway sells citeable patent records over x402. Research OS reads patents free from its own graph, and links each patent to the gateway for the citeable record: free to read, paid to cite.

**What the gateway serves, and what it still needs.** `uspto-search` and `uspto-fetch` are on the gateway's org `main`, answering with US applications and grants in feed402/0.3 envelopes. They are not confirmed on the deployed host: the two deploy configs differ on them, as above, and `x402-research.agfarms.dev` did not answer when checked. The rest is tracked in the org repositories:

- [gateway #67](https://github.com/bucket-foundation/x402-research-gateway/issues/67): payment checks built from the route's own price, payee, and asset. This gates any mainnet traffic.
- [gateway #68](https://github.com/bucket-foundation/x402-research-gateway/issues/68) carries the provider terms read here into the registry: EPO OPS inside composed answers only, EPO bulk data with its terms unread, WIPO paid, Google Patents Public Data CC BY 4.0. It also covers a licensed citation source, the deployed routes, the capacity of the ODP key behind a public route, and the mainnet facilitator, wallet, and host.
- [feed402 #12](https://github.com/bucket-foundation/feed402/issues/12): §6.1's EP and WO rights brought in line with those terms, an `attribution` field, rights emission, canonical URLs, and patent-to-paper links.

**Research OS's patents come from the graph.** ODP's API has no citations, and Research OS needs them, so the ros-patents 2 importer writes patent nodes and `cites` edges into the Supabase `graph` schema from a bulk corpus:

- the PatentsView bulk tables on ODP (grants, claims, application numbers, patent-to-patent citations, non-patent literature references, CPC classes, disambiguated assignees and inventors; CC BY 4.0, to be confirmed on the signed-in download page); or
- Google Patents Public Data on BigQuery (CC BY 4.0), whose `publications` table was 899.4 GB over 98,176,830 rows with no documented partitioning when its schema page was written (2018-11-26), so a dry run gives the bytes before any slice query runs. The BigQuery sandbox allows 1 TiB of queries a month and 10 GiB of storage for the project's life, and expires tables after 60 days ([BigQuery sandbox](https://docs.cloud.google.com/bigquery/docs/sandbox), updated 2026-09-16).

The slice is the CPC classes that match the graph's branches, chosen in ros-patents 1. The fetch scripts in `data/patents/uspto/scripts` need new hosts either way. Each patent node carries its application number, converted to the 8-digit form ODP takes: PatentsView writes it as series and serial (`02/002761`), and BigQuery in DOCDB forms that vary by year (`US-87124404-A` in its schema's example, `US201514643719A` for a 2015 filing) or not at all, with `application_number_formatted` (`US14/643,719`) preferred when set. The conversion comes with tests over both DOCDB forms and the design series, whose PatentsView code `D` becomes the `29` prefix of ODP's 8-digit design application numbers. A granted patent's page links to the public record by patent number, with no sign-in: the USPTO's PDF at `https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/{patent_number}` and Google Patents at `https://patents.google.com/patent/US{patent_number}`. The bare number resolves for utility and design patents alike, where a wrong kind code gives 404 (Google writes a design grant as `S1`, the USPTO as `S`). Patent Center (`patentcenter.uspto.gov/applications/{application_number}`) is labelled "sign-in required", since the USPTO ended guest access on 2025-09-11 ([USPTO notice](https://www.uspto.gov/subscription-center/2025/effective-tomorrow-identity-verification-will-be-required-all-patent)). The page links to the gateway's `uspto-fetch` for the citeable record once gateway #68 confirms the routes on the deployed host; a node with no application number gets no `uspto-fetch` link. It also shows its source with attribution: "USPTO; PatentsView, CC BY 4.0" or "Google Patents Public Data by IFI CLAIMS Patent Services and Google, CC BY 4.0". Node pages, search, and the map read patents from Supabase like any node, with no call to the gateway.

**Readers inside Research OS.**

- **Prior-art search** (ros-patents 3) runs over the imported patent nodes, by text and by embeddings, as search does today. Past the imported slice, it offers the gateway's `uspto-search` as a paid call that the researcher or their agent makes.
- **The MCP endpoint** in `src/app/api/mcp` takes no sign-in and answers any origin. Its `patents_search` tool reads the imported nodes: titles, abstracts, CPC classes, their `cites` links, and a link to the gateway record. It runs under a per-IP limit that the tool's slice adds, since the endpoint has none today.
- **Research OS's chat** tool `feed402_search_patents` moves to the same imported nodes in ros-patents 2. Today it calls a local feed402 server through `src/lib/feed402-client.ts`, with a stub payment and paths the service does not answer (PR-070).
- **The local DuckDB index** in `local/patents`, served by feed402's `mountPatents` through `05-serve.ts`, is the protocol's reference path. Research OS does not depend on it.

**Rights Research OS shows.** Research OS is free to read, and it sits beside paid citation, so it holds to the same licences as the paid routes in v1. What the gateway may sell is settled in gateway #68 and feed402 #12.

| Source | Research OS | Gateway paid routes |
|---|---|---|
| USPTO ODP (public domain) | yes | on org `main`, deployment unconfirmed (#68) |
| PatentsView and Google Patents Public Data, CC BY 4.0 | yes, with attribution | yes, with attribution, per #68 |
| Patent-to-paper links Bucket builds from PatentsView references matched to OpenAlex | yes, marked as Bucket's adaptation of CC BY data | once feed402 #12 adds a field |
| Reliance on Science, CC BY-NC 4.0 | not in v1: Bucket charges citation fees and is not yet a filed nonprofit | no |
| EPO, through OPS or the free bulk products | not in v1 | inside composed answers only, per #68 |
| WIPO PATENTSCOPE | no | no, until a paid licence |

**Where the fees go.** PROTOCOL.md sends a citation fee to the author's `payout_wallet`. A patent's inventors and assignees have no wallet on record and never signed up. The options are Bucket's operating costs with a public ledger, an escrow per inventor that a claim releases, or a donation to the open data sources. It is the founder's call. Until then patent fees go to operations with a public ledger; on testnet no real money moves.

**Graph model by slice.**

- ros-patents 2 adds the node kind `patent`: to `NodeKind` in `src/lib/research-os/types.ts`, to the node kind check constraint in a migration, and to `WORK_NODE_KINDS` in `directions.ts`. Provenance holds `{type: "patent", number, jurisdiction, grant_date, cpc, assignees, inventors, license, source, attribution}`, with the first independent claim as the summary. `branch` is required, so each patent takes the graph branch its main CPC class maps to, with the map written in ros-patents 1.
- ros-patents 2 writes edges of the existing kind `cites`: a patent citing a patent, and a patent citing a paper when the paper is a literature or canon node, with the link's source and confidence in its provenance. `cites` is not in either walk set of `directions.ts`, so "where it leads" does not follow citations; patents reach the walk through the edges of ros-patents 4.
- ros-patents 4 proposes `derives_from` edges from a patent to the ideas its claims combine, through the decompose-further queue, reviewed at `/research-os/edges`. `isIdeaNode` in `src/lib/research-os/idea.ts` picks both the targets and the candidate factors, and gates the makeup snapshot and the "made of" section, so it stays as it is: patents join the targets through `isIdea` in `decompose-further.ts`, which also brings them into `ideaLayer`, and through the three "made of" gates, `NodeView.tsx`, the makeup route, and `snapshotFrom` in `makeup.ts`, and never become candidate factors. Patents enter the queue only when a researcher asks for one or a reviewer flags it, with a cap per run: the runner takes every target by default and spends two model calls on each, and an imported patent with no edges would count as a prime. Disclosure as a production kind needs `productions_kind_check` widened in a migration.

**Where a researcher meets it.**

- **Access.** A patent's own page at `/research-os/n/<slug>` shows its claims, its citations both ways, and its source with attribution. Search returns patents beside papers and canon. Both come in ros-patents 2.
- **Awareness.** An idea's node page lists the patents that cite its papers (ros-patents 2), and the patents that rest on it once those edges exist (ros-patents 4).
- **Understanding.** A claim reads as the ideas it combines, in the "made of" section (ros-patents 4).
- **Internalization.** A patent's claims become practice: reading an independent claim, naming its elements, and telling the new one from the known ones, as items in the node's drill once claims decompose (ros-patents 4).
- **Production.** The production form checks prior art before a production is submitted, and the node page offers the same check (ros-patents 3). Invention disclosure becomes a production kind (ros-patents 4).
- **Agents.** The MCP endpoint in `src/app/api/mcp` gets a `patents_search` tool over the patent nodes Research OS has imported, the free layer described above, with links to the gateway for full records, so an agent working beside a researcher reaches the patent record the way it reaches the literature.

The split of work is the human-AI-computer one this epic serves:

- **The computer** holds the index and ranks prior art by text, vectors, and CPC overlap.
- **The model** proposes what a claim combines, and summarizes a patent for a researcher who asks.
- **The researcher** reads both, judges novelty, and approves or rejects each proposed edge.

**Waiting on the founder.** Until he answers, the loop does only work that can be undone and spends nothing.

1. **The account for the bulk data.** The gateway's ODP adapter was verified live on 2026-08-18 with a key provisioned to his USPTO account.
   - The recommendation is that ros-patents 2 downloads the PatentsView bulk tables with that account.
   - The option is BigQuery, either the sandbox within its limits or a project with billing and a daily cost cap.
   - ros-patents 2 waits on one of them.
2. **Where patent citation fees go.** The recommendation is Bucket's operations, with a public ledger.
3. **The IP stance before disclosure becomes a production.**
   - The options are defensive publication (Bucket publishes disclosures as prior art and files nothing), filing and pledging the patents open, or counsel's review first.
   - Publishing cannot be undone: in Europe it ends novelty at once, and in the US it starts a one-year grace period.
   - Until he answers, a disclosure stays private to its author.

The gateway's own questions, who owns the mainnet facilitator and receiving wallet and who hosts the service, are in gateway #68.

**Slices after this one:**

- ros-patents 1 (the research memo) fills this file with the prior work on patents in discovery and picks the CPC slice.
- ros-patents 2 loads the corpus and writes patent nodes and links.
- ros-patents 3 builds prior-art search.
- ros-patents 4 decomposes claims into elements and adds disclosure.

The gateway's USPTO routes are on its org `main`; Research OS links to them once gateway #68 confirms them on the deployed host, and to the public patent records until then.
