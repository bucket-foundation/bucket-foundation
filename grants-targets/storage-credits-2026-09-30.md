# Storage Credits 2026

Bucket needs hosted storage for the research atlas (OpenAlex, ORCID, PubMed, DBLP bulk data as DuckDB and parquet, 100 GB now, several TB later), a place for the 6.5M-row pgvector photon index, and the small Supabase app. All facts checked 2026-09-30. `[UNVERIFIED]` marks anything I could not confirm from a primary source.

## Legal Status

Bucket is held in the founder's personal capacity. No EIN, no board, no 501(c)(3) letter (`nonprofit-application/00-BASE-INFO-MEMO.md` §1, gaps G-1, G-2). HCB is the preferred fiscal sponsor and has not been contacted (same file, §1 status line and table row 1). Every program below is scored against that fact.

Column key: **Indiv** = accepts an individual researcher, **Spons** = accepts a fiscally sponsored project, **c3** = needs the applicant's own 501(c)(3).

## Program Survey

| Program | Amount | Covers | Indiv | Spons | c3 | Deadline | Fit | Source |
|---|---|---|---|---|---|---|---|---|
| AWS Open Data Sponsorship | Storage plus egress paid by AWS for 2 years | S3 hosting of an open dataset | `[UNVERIFIED]`, terms page did not load | `[UNVERIFIED]` | No stated requirement | Quarterly review, cycles start Jan, Apr, Jul, Oct | 5 | [program](https://pages.awscloud.com/open-data-sponsorship-program.html), [apply](https://application.opendata.aws/), [search summary](https://aws.amazon.com/opendata/open-data-sponsorship-program) |
| AWS Cloud Credit for Research | Faculty and staff uncapped, students up to $5,000 | Any AWS service incl. S3, RDS, Athena | No, needs accredited research institution | No | No | Rolling, 90 to 120 day review; free-tier accounts ineligible from 2026-02-16 | 2 | [program](https://aws.amazon.com/government-education/research-and-technical-computing/cloud-credit-for-research/), [FAQ](https://aws.amazon.com/government-education/research-and-technical-computing/cloud-credit-for-research/faqs/) |
| AWS Imagine Grant | Up to $50K, $150K or $200K plus credits | Cash plus AWS credits | No | No | Yes, registered 501(c) | 2026 round closed 2026-06-05; next cycle 2027 | 2 | [US guidelines](https://pages.awscloud.com/aws-imagine-grant-guidelines-US-2026.html), [Opportunity Desk](https://opportunitydesk.org/2026/04/13/aws-imagine-grant-2026/) |
| Google Cloud Research Credits | Faculty and postdocs up to $5,000; PhD students $1,000 a year | Most GCP services incl. storage and BigQuery | No, needs accredited institution or eligible nonprofit research institute | No | No | Rolling, 6 to 8 weeks | 2 | [program](https://edu.google.com/programs/credits/research/) |
| Google for Nonprofits cloud credits | Up to $10,000 a year `[UNVERIFIED]`, figure from search summary | GCP | No | No `[UNVERIFIED]` | Yes | Rolling | 2 | [help page](https://support.google.com/nonprofits/answer/16245748?hl=en) |
| Microsoft Azure nonprofit grant | $2,000 a year, renew yearly, no rollover | First-party Azure incl. storage and databases | No | No `[UNVERIFIED]` | Yes, or equivalent status | Rolling after Nonprofit Portal approval | 2 | [eligibility](https://www.microsoft.com/en-us/nonprofits/eligibility), [activate](https://learn.microsoft.com/en-us/industry/nonprofit/microsoft-for-nonprofits/claim-activate-nonprofit-azure-grant) |
| Microsoft Azure research credits | `[UNVERIFIED]`, no current public program found | | | | | | 1 | none found |
| Cloudflare Project Alexandria | Custom; annual recurring credits for larger projects | R2, Workers, Pages, plan upgrades | Yes in practice, OSS project with OSI license run on a non-profit basis | Yes | No | Rolling | 4 | [blog 2024-09-27](https://blog.cloudflare.com/expanding-our-support-for-oss-projects-with-project-alexandria/), [apply](https://www.cloudflare.com/lp/project-alexandria/) |
| Cloudflare for Startups | $10,000 tier for self-funded under $1M raised | R2 capped at $10,000 | Needs a startup entity | No | No | Rolling | 1, Bucket is a nonprofit project | [startups](https://www.cloudflare.com/startups/) |
| Cloudflare Project Galileo | Free security plan | DDoS and WAF; no storage `[UNVERIFIED]` | Public-interest groups | Yes `[UNVERIFIED]` | No | Rolling | 1 | [Galileo](https://www.cloudflare.com/galileo/) |
| Snowflake Academia | Free credits for instructors | Teaching only | No | No | No | Rolling | 1 | [blog](https://www.snowflake.com/en/blog/academia-educator-data-ai/) |
| Databricks | No public nonprofit or research credit program found `[UNVERIFIED]` | | | | | | 1 | none found |
| MotherDuck Startup Program | $16,000 value for an $8,000 yearly commitment | MotherDuck consumption | Startups under $5M raised | No | No | Rolling | 2, costs cash | [startups](https://motherduck.com/startups/) |
| Supabase Startup Program | Team plan free 6 months, about $3,600 `[UNVERIFIED]`, third-party figure | Supabase | Startups only | No | No | Rolling | 2 | [third-party summary](https://guptadeepak.com/startup-offers/programs/supabase-startups) |
| Backblaze B2 | No credit program found; free egress up to 3x stored data | Object storage at list price | n/a | n/a | n/a | n/a | 3 as a paid fallback | [pricing](https://www.backblaze.com/cloud-storage) |
| Wasabi | No nonprofit or research program found `[UNVERIFIED]` | | | | | | 1 | none found |
| Hugging Face Datasets | Free public storage best-effort; PRO $9/mo `[UNVERIFIED price]` gives 10TB public; storage grants for high-impact open work | Public dataset repos, parquet, dataset viewer | Yes | Yes | No | Rolling, email datasets@huggingface.co | 5 | [storage limits](https://huggingface.co/docs/hub/en/storage-limits) |
| NSF ACCESS, Explore tier | Credits; Explore approved in 1 to 2 business days | Compute and storage on ACCESS resources | No, self-employed and unaffiliated users are ineligible | No | No, needs US academic or nonprofit research institution | Rolling | 2 until an academic co-PI joins | [policy](https://allocations.access-ci.org/allocations-policy), [for researchers](https://access-ci.org/get-started/for-researchers/) |
| Open Storage Network | 10 TB to 50 TB, 1 ACCESS credit per GB | S3-compatible storage, up to 1.6M files | Through ACCESS, same rules | No | No | Rolling | 3 with a co-PI | [allocations](https://www.openstoragenetwork.org/get-involved/get-an-allocation/), [docs](https://openstoragenetwork.github.io/docs/allocations/) |
| Zenodo | Free; 50 GB and 100 files per record, one-time increase to 200 GB on request | DOI-versioned deposits | Yes | Yes | No | Rolling | 4 for snapshots | [quota help](https://help.zenodo.org/docs/deposit/manage-quota/), [policies](https://about.zenodo.org/policies) |
| Source Cooperative | Free hosting; amount per dataset not published `[UNVERIFIED]` | S3-compatible public data hosting, over 1 PB hosted | Yes, "organizations and individuals" | Yes | No | Rolling, beta publisher application | 5 | [what is Source](https://docs.source.coop/what-is-source), [1 PB update](https://radiant.earth/blog/2025/06/source-cooperative-update-1pb-and-growing/) |

Two facts shape the list. OpenAlex already lives on the AWS Open Data registry, so an Open Data pitch must sell Bucket's derived atlas (researcher graph, cross-source joins, canon tags) instead of a mirror `[UNVERIFIED]` that AWS rejects duplicates. The pgvector index needs a running Postgres, which no free storage program covers; the plan is to publish the vectors as parquet and keep the live index local.

## Top 6

Ranked by fit times speed, given no EIN and no 501(c)(3).

| Rank | Program | Amount | Blocker |
|---|---|---|---|
| 1 | Hugging Face Datasets | Free public storage, grant beyond that | None. Founder signs up an org |
| 2 | Source Cooperative | Free S3 hosting | Beta publisher approval |
| 3 | AWS Open Data Sponsorship | 2 years of storage plus egress | Individual eligibility unverified; next review cycle starts October 2026 |
| 4 | Cloudflare Project Alexandria | Annual R2 and Workers credits, custom | Needs Cloudflare account; "non-profit basis" is judged by Cloudflare |
| 5 | Zenodo | Free DOI snapshots, 50 to 200 GB per record | None |
| 6 | Open Storage Network via ACCESS | 10 TB to 50 TB | Needs an academic or nonprofit-institution PI; founder alone is ineligible |

Deferred until the 501(c)(3) letter: Azure $2,000 a year, Google for Nonprofits, AWS Imagine 2027.

## Application Answers

Repo facts cited: `CLAUDE.md` (photon index: 6,564,942 vectors, 35 languages, LaBSE-768 plus 64-d phonetic, HNSW, local `bucket-pgvector`), `LICENSE` (MIT), `PROTOCOL.md` (CC0-in-intent spec), `GOVERNANCE.md` (COI disclosure, founder custody), `nonprofit-application/00-BASE-INFO-MEMO.md` (legal status), `openalex/` (about 1 GB of OpenAlex author records on disk today). The 1.4M researcher count and the 100 GB to several TB range come from the founder's brief and are `[UNVERIFIED]` in the repo.

### 1. Hugging Face Datasets

Contact: datasets@huggingface.co, org at https://huggingface.co/organizations/new

**Project.** Bucket is an open research atlas. It joins OpenAlex, ORCID, PubMed and DBLP into one researcher graph, about 1.4M researchers today `[UNVERIFIED]`, headed for tens of millions. The code is MIT (`LICENSE`); the protocol spec is CC0 in intent (`PROTOCOL.md`).

**Data.** Parquet shards, under 200 GB per file and under 10k files per folder, with a dataset card. Second dataset: 6,564,942 multilingual word vectors across 35 languages, LaBSE-768 plus a 64-d phonetic vector (`CLAUDE.md`, photon index).

**Reuse.** Anyone building citation graphs, author disambiguation or cross-lingual search can load it with `datasets` in one line. I will post download counts and citing work in the card.

**Size ask.** 500 GB now, 2 to 5 TB over 12 months as ORCID and PubMed joins land. I am asking for a storage grant for the part above the free tier.

**Who.** Gianangelo Dichio, independent researcher. Bucket runs as a personal project pending 501(c)(3) filing (`nonprofit-application/`).

### 2. Source Cooperative

Apply: beta publisher form linked from https://docs.source.coop/

**Organization.** Bucket Foundation, a research-infrastructure project held by its founder pending nonprofit filing. Public site bucket.foundation.

**Dataset.** Bucket Research Atlas: researcher-level parquet built from OpenAlex, ORCID, PubMed and DBLP bulk dumps, with source IDs kept on every row so users can trace each record to its origin.

**License.** Derived data follows its sources: OpenAlex CC0, ORCID public data file CC0 `[UNVERIFIED]`, PubMed baseline under NLM terms `[UNVERIFIED]`, DBLP CC0. Bucket's own columns CC0.

**Size and cadence.** 100 GB at launch `[UNVERIFIED]`, quarterly refresh, several TB within a year.

**Why Source.** The atlas is read by DuckDB straight from object storage. Source gives an S3 endpoint and a public catalog without a server to run.

### 3. AWS Open Data Sponsorship

Apply: https://application.opendata.aws/ (review cycle starting October 2026)

**Dataset name.** Bucket Research Atlas.

**Description.** A researcher-level graph that joins OpenAlex authors with ORCID, PubMed and DBLP, then adds cross-source identity links and a multilingual word-vector table (6,564,942 vectors, 35 languages, `CLAUDE.md`). OpenAlex is already on the registry; this dataset is the join layer on top of it, which does not exist as open data today `[UNVERIFIED]`.

**Format.** Partitioned parquet, readable from Athena, DuckDB and Spark.

**Size and growth.** About 100 GB now `[UNVERIFIED]`, 1 to 5 TB in 24 months, quarterly updates.

**License.** CC0 for Bucket-authored columns; source licenses carried per column.

**Users.** Bibliometrics researchers, funders mapping fields, and AI agents that query the Bucket canon over the feed402 interface (`PROTOCOL.md`).

**Maintainer.** Gianangelo Dichio, individual; Bucket Foundation pending 501(c)(3) (`nonprofit-application/00-BASE-INFO-MEMO.md`).

### 4. Cloudflare Project Alexandria

Apply: https://www.cloudflare.com/lp/project-alexandria/

**Project.** bucket.foundation, MIT-licensed (`LICENSE`), run with no equity and no investors (`GOVERNANCE.md`).

**Need.** R2 for public atlas shards and the site's static canon, with zero egress so readers and agents can pull parquet without a bill landing on the project.

**Usage estimate.** 200 GB to 2 TB stored, 1 to 10 TB egress a month `[UNVERIFIED]`, Workers for the feed402 discovery endpoint.

**Non-profit basis.** Bucket routes citation fees to authors over x402 (`PROTOCOL.md`); it takes no investment. 501(c)(3) packet drafted in `nonprofit-application/`.

### 5. Zenodo

Deposit: https://zenodo.org/uploads/new, quota request through https://help.zenodo.org/docs/deposit/manage-quota/

**Record.** Bucket Research Atlas, quarterly snapshot, with DOI.

**Contents.** Compressed parquet under 50 GB per record, schema doc, build script hash.

**Quota ask.** One-time increase to 200 GB for the first full snapshot, justified by the size of the photon vector table.

### 6. Open Storage Network via ACCESS

Request: https://allocations.access-ci.org/ (Explore tier), then OSN at 10 TB.

**Blocker.** ACCESS rejects self-employed PIs. A faculty collaborator must be PI with the founder as a user. No collaborator is named in the repo `[UNVERIFIED]`.

**Abstract draft.** We request 10 TB on the Open Storage Network to host an open researcher atlas joining OpenAlex, ORCID, PubMed and DBLP, plus a 6.5M-vector multilingual index. The data serves bibliometrics and cross-lingual retrieval research and is released CC0 where sources allow.

## Founder Only

- Sign up: Hugging Face org, Source Cooperative publisher form, AWS account (non-free-tier), Cloudflare account, Zenodo account with ORCID login.
- EIN and the 501(c)(3) letter unlock Azure, Google for Nonprofits and AWS Imagine 2027.
- Name a faculty co-PI for ACCESS and OSN.
- Confirm the 1.4M researcher count and current atlas size so the `[UNVERIFIED]` sizes can be replaced.
- Grant Draft Review queue is retired (`docs/internal/OPERATIONS.md`), so these drafts have had no chisel review.
