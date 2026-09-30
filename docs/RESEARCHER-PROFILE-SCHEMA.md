# Researcher Profile Schema

Design only. No code, migration or deploy ships with this file. It defines the data behind one researcher's profile in Bucket: who the person is, every place on the internet that holds a record about them, everything they are connected to inside Bucket, and the sourced statement behind each fact the page shows. Read with `_intake/ideas/ADVISOR-DB-PLAN.md` (advisor record, match tiers, privacy rules 1 to 7), `_intake/ideas/FACULTY-EMAIL-PLAN.md` (official-directory email rules), research-atlas `docs/USERS_POLICY.md` (contact data contract) and `docs/agents/MATH-CONTRACT.md` (claim tags). Where this file and those plans disagree on privacy, the stricter rule wins.

## Principles

1. **Every fact is a statement.** A profile page renders statements, each with a subject, a predicate, an object, one or more sources and a date. No field on the page lacks a source link. This extends the rule every other Bucket surface already follows: canon nodes carry `provenance`, productions carry `sources[]` and `evidence[]`, history factoids carry `source_node_id`, `locator` and `confidence`, and the Math Contract tags every number with `[bm:...]` or `[empirical: source, date, command]`.
2. **Identity comes from identifiers.** A person record exists only when one strong identifier backs it: ORCID iD, OpenAlex author id, or a Bucket account holder's own claim. A name alone never creates a person, and a name match never merges two people.
3. **Store what the licence allows, link the rest.** Each source has a storage class: `store` (open licence, facts copied with attribution), `store_ids` (identifier and a few facts, content linked), or `link_only` (URL and our own one-line statement about it, nothing copied).
4. **Public professional facts only in public views.** Email, fit scores, viewer decisions and inferred traits never reach a public row. The person can see, correct and remove anything about them.
5. **Reuse Bucket shapes.** Provenance keys match research-atlas (`source`, `source_id`, `source_url`, `as_of`). External identifiers extend `graph.node_external_ids`. Withdrawal reuses the `status in ('active','withdrawn')` plus reason-log pattern from `graph.factoids` and `graph.withdrawn_factoids`. Review reuses `external_id_proposals`.

## Existing Shapes This Builds On

| Shape | Where | What it gives the profile |
|---|---|---|
| `graph.nodes`, `graph.edges` | `supabase/migrations/20260910000000_research_os_graph.sql` | Topic, concept, production and canon nodes a person links to. `NodeKind` in `src/lib/research-os/types.ts` already has `figure`, `topic`, `software`, `discovery`; `EdgeKind` has `authored`, `contributes`, `influences`, `descends_from` |
| `graph.productions` | same file, kinds in `20260916030000_research_os_production_kinds.sql` | Bucket-native work: `production`, `extension`, `replication`, `peer_review`, each with `sources[]` and `evidence[]` |
| `graph.factoids`, `graph.withdrawn_factoids` | `20260924130000_research_os_history_factoids.sql`, `20260924220000_research_os_history_identity_withdrawal.sql` | The dated, sourced, confidence-scored fact row with EDTF dates, a `preferred` flag and withdrawal. The statement table below generalizes it |
| `graph.node_external_ids`, `graph.external_id_proposals`, `graph.evidence_source_admissions` | `20260924210000_research_os_history_wikidata.sql` | Authority plus id, a reviewed proposal flow for ambiguous matches, and a rights record per admitted source |
| `bucket.identities`, `bucket.academy_profiles` | `20260916000000_bucket_identities.sql`, `20260925020000_academy_profiles.sql` | The signed-in account: `handle`, `display_name`, `wallet`, `is_public` |
| Atlas `person`, `organization`, `grant`, `work`, `field`, `funder` and the edge tables `person_org`, `grant_person`, `grant_pi_person`, `grant_work`, `work_field` | `~/agfarms/research-atlas/research_atlas.duckdb` | 1,438,636 people with `orcid`, `openalex_author_id`, and provenance columns on every row and edge |
| Atlas `researchers_public` | same database | Derived counts: `works_count`, `total_citations`, `h_index_proxy`, `first_year`, `last_year`, `seniority`, `activity_tier`, `corresponding_count` |
| Advisor rows | `tools/prime-directions/prime_directions/advisors.py` | `score`, `percentile`, `term_overlap`, `shared_terms`, `shared_topics`, `star_prime` (position on the prime axes), `star_ours` (position on our research directions) |
| PI fit | `tools/pi-fit/README.md` | Cosine fit over OpenAlex topic embeddings, private output outside the repo |
| Viewer decisions | `advisor_page.html` on `feat/ros-advisor-decisions` | `shortlist`, `maybe`, `skip` per person, in browser storage today |
| feed402 envelope | `PROTOCOL.md` | `data` plus `citation` plus optional `receipt`; `citation.type` is the extension point |

## External Sources

Licence and terms checked on 2026-09-29 from each provider's published terms. Each row names the storage class the profile uses. `store` rows still carry attribution in `licence` on every source record.

| Source | Identifier | What it gives | Licence or terms | Class |
|---|---|---|---|---|
| ORCID public API | ORCID iD `0000-0000-0000-000X` | Name, other names, employments, educations, works, fundings, peer reviews, researcher URLs, public email when the person set it public | Public data file CC0 | store |
| OpenAlex | `A` author id, `W` work, `I` institution, `T` topic, `F` funder, `S` source | Works, authorships, affiliations by year, topics with scores, counts | CC0 | store |
| ROR | ROR id `0xxxxxx00` | Institution name, aliases, country, parent and child orgs, domains | CC0 | store |
| Crossref | DOI, Crossref Funder id | Work metadata, funder and award ids, licence of each work | Metadata facts free to reuse; abstracts may carry publisher copyright | store metadata, link abstracts |
| DataCite | DOI | Datasets and software with creators and ORCID | CC0 metadata | store |
| Semantic Scholar | S2 author id, corpus id | Citation intents, influential citations, TLDRs | API licence agreement; S2AG datasets ODC-BY | store_ids |
| arXiv | arXiv id, category | Preprints, versions, categories | Metadata CC0; each paper has its own licence | store metadata, link full text |
| PubMed and PMC | PMID, PMCID | Biomedical works, MeSH terms, grant ids in the record | NLM terms; abstracts may be copyrighted | store metadata, link abstracts |
| NIH RePORTER | project number, PI profile id | Awards, amounts, dates, PIs | US government public domain | store |
| NSF Award Search | award id | Awards, amounts, PIs, institutions | US government public domain | store |
| CORDIS | project id | EU Horizon projects, participants, amounts | EU open data, CC BY 4.0 | store |
| Wellcome via 360Giving | grant id | Awards, amounts, recipients | CC BY 4.0 | store |
| Other funders | funder grant id | UKRI Gateway to Research (OGL), DFG GEPRIS (link), ERC (CC BY) | per funder | store or link_only |
| Wikidata | QID | Birth year only for deceased or notable public figures, employers, awards, doctoral advisor (P184), doctoral student (P185), external ids | CC0 | store |
| Wikipedia | article URL | Narrative biography | CC BY-SA 4.0 | link_only |
| DBLP | DBLP pid | Computer science works and venues | CC0 | store |
| GitHub | user login, repo id | Repositories, languages, stars, releases | GitHub terms; per-repo licence | store_ids |
| Zenodo | DOI, record id | Datasets, software, posters | Metadata CC0 | store |
| Software Heritage | SWHID | Archived source code | Metadata open | store_ids |
| USPTO and PatentsView | patent number | Patents, inventors, assignees, CPC classes | US government public domain | store |
| EPO and Lens | publication number, Lens id | Non-US patents, patent-to-paper citations | Lens terms restrict bulk reuse | link_only |
| ClinicalTrials.gov | NCT id | Trials, investigators, sites, status | US government public domain | store |
| EU CTR, ISRCTN | trial id | Non-US trials | registry terms | link_only |
| Mathematics Genealogy Project | MGP id | Advisor and student lineage, thesis title and year | MGP retains rights to its compilation | link_only, store MGP id |
| Academic Family Tree | tree id | Lineage outside mathematics | site terms | link_only |
| Google Scholar | user id from the profile URL | Citation counts | No API; terms bar automated access | link_only, never fetched |
| Lab page, university profile | URL | Title, department, research areas, official email | Institution copyright | link_only; title and department as statements with the URL; email private under FACULTY-EMAIL-PLAN |
| Conference and committee pages | URL | Program committee, editorial board, society roles | site copyright | link_only with a statement |
| Course catalogs, syllabi | URL, course code | Courses taught by term | institution copyright | link_only with a statement |
| Media, talks, podcasts | URL, YouTube id | Interviews, lectures | platform terms | link_only; transcripts only through `agf-yt` into a venture folder, never onto the profile |
| Bucket | node slug, production id, handle | Productions, canon claims, Research OS nodes, reviews | Bucket content licence per node | store |

Excluded sources: people-search sites, purchased lists, social media scraping, LinkedIn (terms bar automated access), ResearchGate (same), personal photos, anything behind a login.

## Entities

Twenty entities. Names are table names in the DDL below. `profile` is a new schema; Open Decision 1 covers the alternative of adding `person` to `graph.nodes`.

| Entity | Table | Key | Role |
|---|---|---|---|
| Person | `profile.persons` | uuid, one per real person | The subject of every statement |
| Identity | `profile.person_ids` | (authority, external_id) | ORCID, OpenAlex, S2, DBLP, Wikidata, MGP, GitHub, Scholar, NIH profile id, Bucket user |
| Name | `profile.person_names` | uuid | Display, legal, transliterated and prior names, each sourced |
| Organization | `profile.orgs` | ROR id where present | Universities, institutes, companies, funders |
| Affiliation | statement `affiliated_with` | statement id | Person to org with role, department and date range |
| Work | `profile.works` | DOI, else OpenAlex W, else arXiv, else PMID | Papers, preprints, books, theses, chapters |
| Authorship | `profile.authorships` | (work, person, position) | Order, corresponding flag, CRediT roles, affiliation on that work |
| Grant | `profile.grants` | (funder, award id) | Award with amount, currency, USD rate and date, dates, status |
| Dataset | `profile.outputs`, kind `dataset` | DOI or repository id | DataCite, Zenodo, Dryad, OSF |
| Software | `profile.outputs`, kind `software` | repo id, DOI, SWHID | GitHub, Zenodo, Software Heritage |
| Patent | `profile.outputs`, kind `patent` | publication number | USPTO, EPO |
| Trial | `profile.outputs`, kind `trial` | NCT or registry id | Investigator role per trial |
| Venue | `profile.venues` | ISSN-L, OpenAlex S, DBLP venue key | Journals, conferences, repositories |
| Service role | statement `served_as` | statement id | Editor, reviewer, program committee, society office |
| Course | `profile.courses` | (org, course code, term) | Courses taught |
| Lineage | statement `advised` | statement id | Doctoral and postdoctoral advisor and student |
| Collaboration | `profile.collaborations` | (person_a, person_b) | Derived from shared works and grants, with counts and years |
| Topic position | `profile.topic_positions` | (person, topic, as_of) | OpenAlex topic share, Research OS topic node, prime-axis coordinates |
| Media | `profile.outputs`, kind `media` | URL | Talks, interviews, press |
| Statement | `profile.statements` | uuid | The fact layer; every row above surfaces on the page through statements |

Bucket-native links, all through statements or existing tables:

| Link | Existing row | Predicate |
|---|---|---|
| Account | `bucket.identities.user_id` | `holds_account` (only after the person claims the profile) |
| Productions | `graph.productions`, accepted, kind `production`, `extension`, `replication` or `peer_review` | `produced`, `extended`, `replicated`, `reviewed` |
| Canon claims | `graph.nodes` kinds `law`, `derivation`, `fact`, `discovery` | `authored_claim` when the person's work is the node's `provenance.doi` |
| Research OS nodes | `graph.nodes` kind `topic`, `concept`, `figure` | `works_on`, `is_figure` (a canon figure node for historical people) |
| Fit and stars | viewer-private `profile.viewer_fit` | never a statement; see Viewer-Private Layer |
| Decisions | viewer-private `profile.viewer_decisions` | never a statement |

## Provenance Record

Every source attached to a statement, identity or entity row has this shape. It merges the atlas columns, the advisor plan's `match_tier` and the `graph.nodes.provenance` keys.

```ts
type SourceRef = {
  source: "orcid" | "openalex" | "ror" | "crossref" | "datacite" | "s2" | "arxiv"
        | "pubmed" | "nih_reporter" | "nsf" | "cordis" | "wellcome" | "ukri"
        | "wikidata" | "wikipedia" | "dblp" | "github" | "zenodo" | "swh"
        | "uspto" | "lens" | "ctgov" | "mgp" | "academictree" | "scholar"
        | "official_directory" | "labpage" | "conference" | "catalog"
        | "media" | "bucket" | "self";
  source_id: string;
  url: string;
  as_of: string;
  match_tier: "T0" | "T1" | "T2" | "T3" | "self";
  licence: string;
  storage: "store" | "store_ids" | "link_only";
  locator?: string;
  content_hash?: string;
  retrieved_by: string;
};
```

| Field | Meaning |
|---|---|
| `source_id` | The id inside that source, such as `W4390000001` or `R01GM000000` |
| `url` | The page a reader clicks. Always resolvable, never an API URL with a key |
| `as_of` | ISO-8601 UTC time the source was read |
| `match_tier` | How the source record was tied to this person. `T0` the source record carries the person's ORCID iD; `T1` exact OpenAlex author id; `T2` surname, first initial and ROR, unique candidate, admitted only at 95% audited precision per ADVISOR-DB-PLAN; `T3` reviewer-confirmed through `external_id_proposals`; `self` the claimed person asserted it |
| `licence` | SPDX id or terms name, such as `CC0-1.0`, `CC-BY-4.0`, `us-gov-pd`, `terms:lens` |
| `locator` | JSON path, page anchor or line in the source |
| `content_hash` | SHA-256 of the fetched record, for change detection |
| `retrieved_by` | Pipeline name and revision, such as `atlas-build@2026-06-21` |

## Statement Layer

A statement is one fact about one person. The page is a list of statements grouped by predicate. The shape generalizes `graph.factoids` from dates to any predicate.

| Field | Type | Rule |
|---|---|---|
| `id` | uuid | |
| `subject_id` | uuid | `profile.persons.id` |
| `predicate` | text | From the predicate vocabulary below |
| `object_kind` | text | `person`, `org`, `work`, `grant`, `output`, `venue`, `course`, `topic`, `node`, `production`, `literal` |
| `object_id` | uuid, null | Set when the object is a row |
| `object_value` | jsonb, null | Set for literals: `{"text": "Associate Professor"}`, `{"count": 41}` |
| `qualifiers` | jsonb | `role`, `department`, `position`, `credit_roles[]`, `amount_usd`, `term` |
| `edtf_start`, `edtf_end` | text, null | EDTF dates, same check as `factoids_edtf` |
| `sources` | jsonb array of `SourceRef` | At least one. Two sources that agree raise confidence |
| `confidence` | real 0..1 | Computed: best `match_tier` weight times source agreement; formula in Confidence below |
| `as_of` | timestamptz | Newest `as_of` among sources |
| `visibility` | text | `public`, `owner`, `private` |
| `preferred` | boolean | One preferred row per (subject, predicate, object) when sources conflict |
| `status` | text | `active`, `disputed`, `withdrawn` |
| `asserted_by` | text | `pipeline:<name>@<rev>`, `self`, `reviewer:<user_id>` |
| `derived` | boolean | True for computed facts such as counts and collaborations |
| `derivation` | jsonb, null | `{"command": "...", "inputs": [...]}` so a derived number meets `[empirical: source, date, command]` |

### Predicates

| Group | Predicates |
|---|---|
| Identity | `has_id`, `has_name`, `has_homepage`, `holds_account` |
| Position | `affiliated_with`, `employed_as`, `member_of_department`, `educated_at`, `received_degree` |
| Output | `authored`, `corresponding_author_of`, `created_dataset`, `created_software`, `invented`, `investigator_on`, `appeared_in` |
| Funding | `principal_investigator_of`, `co_investigator_of`, `funded_by` |
| Lineage | `advised`, `advised_by`, `postdoc_under`, `hosted_postdoc` |
| Service | `served_as` with `qualifiers.role` in `editor`, `associate_editor`, `reviewer`, `program_committee`, `chair`, `society_officer` |
| Teaching | `taught` |
| Recognition | `received_award` |
| Collaboration | `coauthored_with`, `co_funded_with` (derived) |
| Topic | `works_on` (derived, topic node or OpenAlex T id with share) |
| Metrics | `works_count`, `citation_count`, `h_index_proxy`, `active_years`, `recent_works_3yr` (derived, each with `derivation`) |
| Bucket | `produced`, `extended`, `replicated`, `reviewed`, `authored_claim`, `is_figure` |

### Confidence

| Input | Weight |
|---|---|
| `self` on a claimed profile | 1.0 |
| `T0` | 0.98 |
| `T1` | 0.95 |
| `T3` | 0.9 |
| `T2` | 0.8 |
| Each additional agreeing independent source | raises confidence by `0.5 * (1 - c)` |

These weights are starting inputs, cite them as `[empirical: ADVISOR-DB-PLAN T2 precision gate, 2026-09-27, hand audit of 100 T2 pairs]` once the audit runs. Until then the page shows the tier label beside each source instead of a number.

### Rendering

The profile renders each statement as one sentence with inline source chips, the same pattern productions use for `sources[]` and the Math Contract uses for tags:

> Associate Professor of Physics, Northgate Institute of Technology, since 2021. [ORCID, 2026-09-20] [university profile, 2026-09-28]

> 41 works, 2011 to 2026. [empirical: OpenAlex A5000000001, 2026-09-20, `atlas works_count`]

> PI on R01GM000000, "Mechanics of membrane curvature", $1.2M, 2023 to 2027. [NIH RePORTER, 2026-06-21]

> Doctoral student of Dr. Ines Varga, 2014. [Mathematics Genealogy Project 000000] [ORCID education]

Each chip links to `SourceRef.url` and shows `as_of`, `match_tier` and `licence` on hover. A statement with `status = 'disputed'` renders with both conflicting sources side by side. A `link_only` source renders our one-line statement plus the link, with no copied text. Derived numbers render the `derivation.command` on expand.

## Privacy

| Rule | Mechanism |
|---|---|
| Public professional facts only | `visibility = 'public'` allowed only for predicates in the public set: identity, position, output, funding, lineage, service, teaching, recognition, topic, metrics, Bucket |
| No email in any public or served table | Email lives in research-atlas private `researchers.parquet` under USERS_POLICY and FACULTY-EMAIL-PLAN. Bucket stores `has_public_contact boolean` only, with a link to the source page where the person published their own address. Open Decision 3 |
| No inferred traits | No gender, age, ethnicity, nationality, reply likelihood, photo. Birth year only for deceased canon figures from Wikidata |
| No minors | Persons with any `educated_at` statement ending after `today - 5 years` at secondary level, or any sign of age under 18, are excluded; `educated_at` below doctoral level is never stored for living people |
| No public ranking of named people | Lists sort by neutral keys (recent works in topic, name). Fit and stars never leave the viewer layer. Server tests assert no score field in any public response, as ADVISOR-DB-PLAN step 4 does |
| Opt-out | ORCID OAuth sign-in whose iD equals `person_ids` ORCID sets `persons.opt_out`. Without ORCID, a maintainer confirms through the institutional page contact. Opt-out hides the page and every statement from public views within 7 days, keeps a tombstone row with the ORCID so rebuilds do not recreate it, and propagates to the atlas slim DB |
| Claim and correct | A claimed person sees every statement including `owner` ones, can mark any statement `disputed` with a reason, add `self` statements, and choose which predicates show. Disputes land in `graph.external_id_proposals`-style review |
| Withdrawal | Same pattern as `graph.withdraw_identity_dependents`: a wrong identity match withdraws every dependent statement in one call, logged with reason |
| No contact actions | No "email this person" button, no bulk send, no automated contact from any Bucket surface |
| Retention | Pipeline statements rebuild from source each refresh; a source record that disappears withdraws its statements on the next build |
| Deceased and historical figures | Canon figures (Kruse, Becker, Szent-Györgyi and the `canon-figures/` index) use the same schema with `persons.kind = 'historical'`, link to their `figure` node, and may carry Wikidata life dates |

## Viewer-Private Layer

Fit, stars and decisions belong to the viewer. RLS limits each row to `viewer_id = auth.uid()`. No public view, export or API joins them.

| Table | Fields | Source |
|---|---|---|
| `profile.viewer_fit` | `viewer_id`, `person_id`, `score`, `percentile`, `term_overlap`, `shared_terms[]`, `shared_topics[]`, `star_prime real[]`, `star_ours real[]`, `axes_revision`, `computed_at` | `advisors.py` rows; `pi-fit` `fit.json` |
| `profile.viewer_decisions` | `viewer_id`, `person_id`, `decision in ('shortlist','maybe','skip')`, `note`, `decided_at` | replaces the `localStorage` store in `advisor_page.html` |
| `profile.viewer_weights` | `viewer_id`, `weights jsonb` (fit, impact, recency, funding, distinct) | ADVISOR-DB-PLAN step 6 |

Every fit card carries the line from `tools/pi-fit`: fit is cosine similarity over topic embeddings and has not been validated against advising outcomes.

## DDL Sketch

Sketch only, for review. Types and checks follow the `graph.*` migrations.

```sql
create schema if not exists profile;

create table profile.persons (
  id              uuid        primary key default gen_random_uuid(),
  kind            text        not null default 'living' check (kind in ('living','historical')),
  display_name    text        not null,
  sort_name       text        not null,
  figure_node_id  uuid        references graph.nodes (id) on delete set null,
  claimed_by      uuid        unique references auth.users (id) on delete set null,
  claimed_at      timestamptz,
  is_public       boolean     not null default false,
  opt_out         boolean     not null default false,
  opt_out_at      timestamptz,
  has_public_contact boolean  not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  merged_into     uuid        references profile.persons (id),
  constraint persons_opt_out_hidden check (not (opt_out and is_public))
);

create table profile.person_ids (
  authority    text        not null,
  external_id  text        not null,
  person_id    uuid        not null references profile.persons (id) on delete cascade,
  sources      jsonb       not null,
  status       text        not null default 'active' check (status in ('active','withdrawn')),
  reviewed_by  uuid        references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  primary key (authority, external_id),
  constraint person_ids_authority check (authority in (
    'orcid','openalex','s2','dblp','wikidata','mgp','academictree','github',
    'scholar','nih_profile','scopus','researcherid','bucket_user','atlas')),
  constraint person_ids_shape check (
    (authority = 'orcid' and external_id ~ '^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$')
    or (authority = 'openalex' and external_id ~ '^A\d+$')
    or (authority = 'wikidata' and external_id ~ '^Q\d+$')
    or (authority = 'mgp' and external_id ~ '^\d+$')
    or authority not in ('orcid','openalex','wikidata','mgp')),
  constraint person_ids_sources check (jsonb_typeof(sources) = 'array' and jsonb_array_length(sources) > 0)
);
create unique index person_ids_one_orcid on profile.person_ids (person_id) where authority = 'orcid' and status = 'active';

create table profile.orgs (
  id           uuid primary key default gen_random_uuid(),
  ror          text unique check (ror ~ '^0[a-z0-9]{6}\d{2}$'),
  name         text not null,
  country_code text,
  parent_id    uuid references profile.orgs (id),
  org_type     text,
  domains      text[] not null default '{}',
  provenance   jsonb not null
);

create table profile.works (
  id               uuid primary key default gen_random_uuid(),
  doi              text unique,
  openalex_id      text unique,
  arxiv_id         text unique,
  pmid             text unique,
  title            text not null,
  work_type        text not null,
  publication_date text,
  venue_id         uuid references profile.venues (id),
  is_oa            boolean,
  work_licence     text,
  cited_by_count   integer,
  node_id          uuid references graph.nodes (id) on delete set null,
  provenance       jsonb not null,
  constraint works_has_id check (coalesce(doi, openalex_id, arxiv_id, pmid) is not null)
);

create table profile.authorships (
  work_id       uuid not null references profile.works (id) on delete cascade,
  person_id     uuid not null references profile.persons (id) on delete cascade,
  position      smallint not null,
  is_corresponding boolean not null default false,
  credit_roles  text[] not null default '{}',
  org_ids       uuid[] not null default '{}',
  statement_id  uuid not null references profile.statements (id),
  primary key (work_id, person_id, position)
);

create table profile.grants (
  id            uuid primary key default gen_random_uuid(),
  funder_org_id uuid not null references profile.orgs (id),
  award_id      text not null,
  title         text,
  amount_original numeric,
  currency      text,
  amount_usd    numeric,
  fx_as_of      date,
  start_date    date,
  end_date      date,
  status        text,
  provenance    jsonb not null,
  unique (funder_org_id, award_id)
);

create table profile.outputs (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('dataset','software','patent','trial','media','thesis','talk')),
  authority    text not null,
  external_id  text not null,
  title        text not null,
  date         text,
  url          text not null,
  storage      text not null check (storage in ('store','store_ids','link_only')),
  provenance   jsonb not null,
  unique (authority, external_id)
);

create table profile.venues (
  id          uuid primary key default gen_random_uuid(),
  issn_l      text unique,
  openalex_id text unique,
  dblp_key    text unique,
  name        text not null,
  venue_type  text not null
);

create table profile.courses (
  id        uuid primary key default gen_random_uuid(),
  org_id    uuid not null references profile.orgs (id),
  code      text not null,
  title     text not null,
  term      text not null,
  url       text not null,
  unique (org_id, code, term)
);

create table profile.statements (
  id            uuid        primary key default gen_random_uuid(),
  subject_id    uuid        not null references profile.persons (id) on delete cascade,
  predicate     text        not null,
  object_kind   text        not null,
  object_id     uuid,
  object_value  jsonb,
  qualifiers    jsonb       not null default '{}'::jsonb,
  edtf_start    text,
  edtf_end      text,
  sources       jsonb       not null,
  confidence    real        not null check (confidence between 0 and 1),
  as_of         timestamptz not null,
  visibility    text        not null default 'public' check (visibility in ('public','owner','private')),
  preferred     boolean     not null default true,
  status        text        not null default 'active' check (status in ('active','disputed','withdrawn')),
  asserted_by   text        not null,
  derived       boolean     not null default false,
  derivation    jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint statements_object check ((object_id is null) <> (object_value is null)),
  constraint statements_object_kind check (object_kind in ('person','org','work','grant','output','venue','course','topic','node','production','literal')),
  constraint statements_sources check (jsonb_typeof(sources) = 'array' and jsonb_array_length(sources) > 0),
  constraint statements_derivation check (not derived or derivation is not null),
  constraint statements_private_predicates check (visibility <> 'public' or predicate <> 'has_contact')
);
create index statements_subject_pred_idx on profile.statements (subject_id, predicate) where status = 'active';
create index statements_object_idx on profile.statements (object_kind, object_id);

create table profile.withdrawn_statements (
  statement_id uuid primary key references profile.statements (id) on delete cascade,
  reason       text not null check (length(reason) between 1 and 500),
  withdrawn_at timestamptz not null default now(),
  reviewer_id  uuid references auth.users (id) on delete set null
);

create table profile.collaborations (
  person_a     uuid not null references profile.persons (id) on delete cascade,
  person_b     uuid not null references profile.persons (id) on delete cascade,
  shared_works integer not null,
  shared_grants integer not null default 0,
  first_year   integer,
  last_year    integer,
  derivation   jsonb not null,
  as_of        timestamptz not null,
  primary key (person_a, person_b),
  check (person_a < person_b)
);

create table profile.topic_positions (
  person_id    uuid not null references profile.persons (id) on delete cascade,
  topic_ref    text not null,
  node_id      uuid references graph.nodes (id) on delete set null,
  share        real not null,
  works        integer not null,
  as_of        timestamptz not null,
  derivation   jsonb not null,
  primary key (person_id, topic_ref, as_of)
);

create table profile.viewer_fit (
  viewer_id     uuid not null references auth.users (id) on delete cascade,
  person_id     uuid not null references profile.persons (id) on delete cascade,
  score         real,
  percentile    real,
  term_overlap  real,
  shared_terms  text[],
  shared_topics text[],
  star_prime    real[],
  star_ours     real[],
  axes_revision text not null,
  computed_at   timestamptz not null default now(),
  primary key (viewer_id, person_id)
);

create table profile.viewer_decisions (
  viewer_id  uuid not null references auth.users (id) on delete cascade,
  person_id  uuid not null references profile.persons (id) on delete cascade,
  decision   text not null check (decision in ('shortlist','maybe','skip')),
  note       text,
  decided_at timestamptz not null default now(),
  primary key (viewer_id, person_id)
);

alter table profile.persons         enable row level security;
alter table profile.statements      enable row level security;
alter table profile.viewer_fit      enable row level security;
alter table profile.viewer_decisions enable row level security;

create view profile.public_statements as
  select s.* from profile.statements s
  join profile.persons p on p.id = s.subject_id
  where p.is_public and not p.opt_out and p.merged_into is null
    and s.visibility = 'public' and s.status in ('active','disputed');
```

RLS: `anon` and `authenticated` read `profile.public_statements` only. The owner reads all rows where `persons.claimed_by = auth.uid()`. `viewer_*` tables allow `viewer_id = auth.uid()` for all operations and nothing else. Pipeline writes go through `security definer` functions, as the history import does.

Graph links: a work that is the `provenance.doi` of a canon node gets `works.node_id`. A person with a canon `figure` node gets `persons.figure_node_id`. No `person` row enters `graph.nodes`, so learners cannot edit people through the graph editor.

## Example Profile

Every name, id, award and URL below is fictional. ORCID, OpenAlex, ROR and award ids use reserved or invalid ranges.

```json
{
  "person": {
    "id": "7c1e0a52-0000-4000-8000-000000000001",
    "kind": "living",
    "display_name": "Dr. Maren Okafor-Lind",
    "is_public": true,
    "opt_out": false,
    "claimed": true,
    "has_public_contact": true
  },
  "ids": [
    {"authority": "orcid", "external_id": "0000-0000-0000-0019",
     "sources": [{"source": "orcid", "source_id": "0000-0000-0000-0019", "url": "https://orcid.org/0000-0000-0000-0019", "as_of": "2026-09-20T04:00:00Z", "match_tier": "self", "licence": "CC0-1.0", "storage": "store", "retrieved_by": "profile-claim@1"}]},
    {"authority": "openalex", "external_id": "A0000000001",
     "sources": [{"source": "orcid", "source_id": "0000-0000-0000-0019", "url": "https://openalex.org/A0000000001", "as_of": "2026-09-20T04:00:00Z", "match_tier": "T0", "licence": "CC0-1.0", "storage": "store", "retrieved_by": "atlas-build@2026-06-21"}]},
    {"authority": "mgp", "external_id": "000001", "sources": [{"source": "mgp", "source_id": "000001", "url": "https://www.mathgenealogy.org/id.php?id=000001", "as_of": "2026-09-22T10:00:00Z", "match_tier": "T3", "licence": "terms:mgp", "storage": "link_only", "retrieved_by": "reviewer:5d0e"}]},
    {"authority": "github", "external_id": "okafor-lind-lab", "sources": [{"source": "orcid", "source_id": "researcher-urls/1", "url": "https://github.com/okafor-lind-lab", "as_of": "2026-09-20T04:00:00Z", "match_tier": "T0", "licence": "terms:github", "storage": "store_ids", "retrieved_by": "orcid-sync@3"}]},
    {"authority": "scholar", "external_id": "XXXXXXXXXXXX", "sources": [{"source": "self", "source_id": "claim", "url": "https://scholar.google.com/citations?user=XXXXXXXXXXXX", "as_of": "2026-09-21T12:00:00Z", "match_tier": "self", "licence": "terms:google", "storage": "link_only", "retrieved_by": "profile-claim@1"}]}
  ],
  "statements": [
    {"predicate": "affiliated_with", "object_kind": "org", "object": {"name": "Northgate Institute of Technology", "ror": "000000000"},
     "qualifiers": {"role": "Associate Professor", "department": "Physics"}, "edtf_start": "2021-07", "edtf_end": null,
     "sources": [
       {"source": "orcid", "source_id": "employment/1", "url": "https://orcid.org/0000-0000-0000-0019", "as_of": "2026-09-20T04:00:00Z", "match_tier": "T0", "licence": "CC0-1.0", "storage": "store"},
       {"source": "official_directory", "source_id": "profile/okafor-lind", "url": "https://www.northgate.example/profile/okafor-lind", "as_of": "2026-09-28T15:00:00Z", "match_tier": "T2", "licence": "terms:northgate", "storage": "link_only"}],
     "confidence": 0.99, "visibility": "public", "status": "active", "asserted_by": "pipeline:profile-build@1"},
    {"predicate": "received_degree", "object_kind": "org", "object": {"name": "University of Easthaven", "ror": "000000001"},
     "qualifiers": {"degree": "PhD", "field": "Biophysics"}, "edtf_start": "2014",
     "sources": [{"source": "orcid", "source_id": "education/1", "url": "https://orcid.org/0000-0000-0000-0019", "as_of": "2026-09-20T04:00:00Z", "match_tier": "T0", "licence": "CC0-1.0", "storage": "store"}],
     "confidence": 0.98, "visibility": "public", "status": "active", "asserted_by": "pipeline:orcid-sync@3"},
    {"predicate": "advised_by", "object_kind": "person", "object": {"display_name": "Dr. Ines Varga", "person_id": "7c1e0a52-0000-4000-8000-000000000002"},
     "qualifiers": {"relation": "doctoral"}, "edtf_start": "2014",
     "sources": [{"source": "mgp", "source_id": "000001", "url": "https://www.mathgenealogy.org/id.php?id=000001", "as_of": "2026-09-22T10:00:00Z", "match_tier": "T3", "licence": "terms:mgp", "storage": "link_only"}],
     "confidence": 0.9, "visibility": "public", "status": "active", "asserted_by": "reviewer:5d0e"},
    {"predicate": "authored", "object_kind": "work", "object": {"title": "Curvature sensing by amphipathic helices at low tension", "doi": "10.0000/example.2024.001", "openalex_id": "W0000000001", "publication_date": "2024-03-11"},
     "qualifiers": {"position": 3, "is_corresponding": true, "credit_roles": ["conceptualization", "supervision"]},
     "sources": [
       {"source": "openalex", "source_id": "W0000000001", "url": "https://openalex.org/W0000000001", "as_of": "2026-09-20T04:00:00Z", "match_tier": "T1", "licence": "CC0-1.0", "storage": "store"},
       {"source": "crossref", "source_id": "10.0000/example.2024.001", "url": "https://doi.org/10.0000/example.2024.001", "as_of": "2026-09-20T04:00:00Z", "match_tier": "T0", "licence": "terms:crossref-metadata", "storage": "store"}],
     "confidence": 0.99, "visibility": "public", "status": "active", "asserted_by": "pipeline:atlas-build@2026-06-21"},
    {"predicate": "principal_investigator_of", "object_kind": "grant", "object": {"funder": "National Institutes of Health", "award_id": "R01GM000000", "title": "Mechanics of membrane curvature", "amount_usd": 1200000, "start_date": "2023-04-01", "end_date": "2027-03-31"},
     "sources": [{"source": "nih_reporter", "source_id": "R01GM000000", "url": "https://reporter.nih.gov/project-details/R01GM000000", "as_of": "2026-06-21T00:00:00Z", "match_tier": "T2", "licence": "us-gov-pd", "storage": "store"}],
     "confidence": 0.8, "visibility": "public", "status": "active", "asserted_by": "pipeline:atlas-build@2026-06-21"},
    {"predicate": "created_software", "object_kind": "output", "object": {"kind": "software", "title": "membrane-mc", "authority": "github", "external_id": "000000001", "url": "https://github.com/okafor-lind-lab/membrane-mc"},
     "sources": [{"source": "github", "source_id": "000000001", "url": "https://github.com/okafor-lind-lab/membrane-mc", "as_of": "2026-09-25T09:00:00Z", "match_tier": "T0", "licence": "MIT", "storage": "store_ids"}],
     "confidence": 0.98, "visibility": "public", "status": "active", "asserted_by": "pipeline:github-sync@1"},
    {"predicate": "served_as", "object_kind": "venue", "object": {"name": "Journal of Soft Membranes", "issn_l": "0000-0000"},
     "qualifiers": {"role": "associate_editor"}, "edtf_start": "2024",
     "sources": [{"source": "conference", "source_id": "editorial-board", "url": "https://jsm.example/editorial-board", "as_of": "2026-09-26T08:00:00Z", "match_tier": "T2", "licence": "terms:publisher", "storage": "link_only"}],
     "confidence": 0.8, "visibility": "public", "status": "active", "asserted_by": "pipeline:service-crawl@1"},
    {"predicate": "taught", "object_kind": "course", "object": {"code": "PHY 452", "title": "Biological Physics", "term": "2026 Spring"},
     "sources": [{"source": "catalog", "source_id": "PHY452-2026S", "url": "https://registrar.northgate.example/schedule/2026S/PHY452", "as_of": "2026-09-26T08:00:00Z", "match_tier": "T2", "licence": "terms:northgate", "storage": "link_only"}],
     "confidence": 0.8, "visibility": "public", "status": "active", "asserted_by": "pipeline:catalog-crawl@1"},
    {"predicate": "works_on", "object_kind": "topic", "object": {"openalex_topic": "T00001", "label": "Lipid membrane mechanics", "node_slug": "membrane-curvature"},
     "qualifiers": {"share": 0.46, "works": 19}, "derived": true,
     "derivation": {"command": "python3 scripts/topic_positions.py --person A0000000001", "inputs": ["openalex:A0000000001@2026-09-20"]},
     "sources": [{"source": "openalex", "source_id": "A0000000001", "url": "https://openalex.org/A0000000001", "as_of": "2026-09-20T04:00:00Z", "match_tier": "T1", "licence": "CC0-1.0", "storage": "store"}],
     "confidence": 0.95, "visibility": "public", "status": "active", "asserted_by": "pipeline:topic-positions@1"},
    {"predicate": "works_count", "object_kind": "literal", "object_value": {"count": 41, "first_year": 2011, "last_year": 2026}, "derived": true,
     "derivation": {"command": "atlas researchers_public works_count", "inputs": ["research_atlas.duckdb@2026-06-21"]},
     "sources": [{"source": "openalex", "source_id": "A0000000001", "url": "https://openalex.org/A0000000001", "as_of": "2026-06-21T00:00:00Z", "match_tier": "T1", "licence": "CC0-1.0", "storage": "store"}],
     "confidence": 0.95, "visibility": "public", "status": "active", "asserted_by": "pipeline:atlas-build@2026-06-21"},
    {"predicate": "coauthored_with", "object_kind": "person", "object": {"display_name": "Dr. Tomas Reyes-Hal", "person_id": "7c1e0a52-0000-4000-8000-000000000003"},
     "qualifiers": {"shared_works": 7, "first_year": 2016, "last_year": 2025}, "derived": true,
     "derivation": {"command": "profile collaborations build", "inputs": ["openalex authorships@2026-09-20"]},
     "sources": [{"source": "openalex", "source_id": "A0000000001", "url": "https://openalex.org/A0000000001", "as_of": "2026-09-20T04:00:00Z", "match_tier": "T1", "licence": "CC0-1.0", "storage": "store"}],
     "confidence": 0.95, "visibility": "public", "status": "active", "asserted_by": "pipeline:collab@1"},
    {"predicate": "reviewed", "object_kind": "production", "object": {"production_id": "a9f3b1c0-0000-4000-8000-00000000000a", "kind": "peer_review", "target_node_slug": "helfrich-bending-energy"},
     "sources": [{"source": "bucket", "source_id": "production/a9f3b1c0", "url": "https://bucket.foundation/research-os/production/a9f3b1c0", "as_of": "2026-09-24T18:00:00Z", "match_tier": "self", "licence": "CC-BY-4.0", "storage": "store"}],
     "confidence": 1.0, "visibility": "public", "status": "active", "asserted_by": "self"},
    {"predicate": "has_homepage", "object_kind": "literal", "object_value": {"url": "https://okafor-lind.northgate.example"},
     "sources": [{"source": "orcid", "source_id": "researcher-urls/0", "url": "https://orcid.org/0000-0000-0000-0019", "as_of": "2026-09-20T04:00:00Z", "match_tier": "T0", "licence": "CC0-1.0", "storage": "store"}],
     "confidence": 0.98, "visibility": "public", "status": "active", "asserted_by": "pipeline:orcid-sync@3"}
  ],
  "viewer_private": {
    "visible_to": "the signed-in viewer only",
    "fit": {"score": 0.71, "percentile": 96.4, "term_overlap": 0.38, "shared_topics": ["membrane curvature", "coarse-grained simulation"], "star_prime": [0.82, 0.41, 0.66, 0.12, 0.55, 0.30, 0.71, 0.08], "star_ours": [0.77, 0.52, 0.19, 0.64], "axes_revision": "prime-directions@2026-09-29"},
    "decision": {"decision": "shortlist", "decided_at": "2026-09-29T14:02:00Z"}
  }
}
```

## Enrichment Functions

Each function fills or refreshes one slice of a profile. It reads ids already on the person, calls one source, and writes statements whose `sources[]` carry a full `SourceRef`. The pipeline runs in stage order from a seed id to a full profile. Every function is idempotent: it upserts by (subject, predicate, object) and withdraws its own earlier statements that the source no longer returns.

### Shared Contract

| Rule | Value |
|---|---|
| Signature | `enrich_<name>(person_id, ids, since) -> Result{written, withdrawn, skipped, errors}` |
| User agent | `bucket.foundation profile-enrich (mailto:<PI_FIT_CONTACT>)`, the pattern in `tools/pi-fit/fetch.py` `user_agent()` and research-atlas `atlas/connectors/base.py` `DEFAULT_UA` |
| Rate ceiling | Per host token bucket at or below the ceiling in each row; the lower of our ceiling and the provider's published limit wins |
| Retry | Exponential backoff `2 ** i` seconds, 4 tries, honours `Retry-After` capped at 120 s, as `fetch.py` `get()` and `base.py` do |
| Cache | On-disk, keyed by SHA-256 of the request URL, under `research-atlas/data/raw/profile/<source>/`; stores body, status, `as_of` and `content_hash`. A fetch inside the refresh interval reads the cache |
| Opt-out gate | Every function returns `skipped` for a person with `opt_out = true` before any network call; FACULTY-EMAIL-PLAN applies the same gate at crawl time |
| Failure | A network or parse failure writes nothing and withdraws nothing; it logs the error with the URL and leaves the previous statements active with their older `as_of`. A parse that yields zero records from a source that returned records last run exits non-zero, as the faculty crawler plan requires |
| Ambiguity | A candidate match below its tier rule goes to `graph.external_id_proposals` style review, never to a statement |
| Where it runs | Local by default (Local First, CLAUDE.md), against the local Supabase stack; the hosted site reads the built tables |
| Consent | `none` means public records keyed by a strong id; `claim` means it runs only after the person claims the profile or for sources the person listed on their own ORCID record; `founder` means private use only, output never public |

### Pipeline

| Stage | Function | Inputs | Source and endpoint | Writes | Our ceiling | Refresh | Consent | Reuses |
|---|---|---|---|---|---|---|---|---|
| 0 | `seed` | ORCID iD or OpenAlex A id or Bucket user | ORCID `pub.orcid.org/v3.0/{orcid}/record`; OpenAlex `api.openalex.org/authors/{id}` | `persons` row, `has_id` for the seed, `has_name` | ORCID 10/s, OpenAlex 10/s | on demand | none | `atlas/users/pi_resolve.py` `parse_name`; pi-fit `fetch.py` `profile()` |
| 1 | `resolve_ids` | ORCID or OpenAlex | OpenAlex author `ids` block (orcid, scopus, twitter, wikipedia); Wikidata SPARQL on P496 ORCID | `has_id` for OpenAlex, ORCID, Scopus, Wikidata, all `T0` when the source record carries the ORCID | OpenAlex 10/s, Wikidata 1 concurrent query | 30 days | none | research-atlas `person` table; `graph.node_external_ids` shape checks |
| 2 | `enrich_orcid` | ORCID | ORCID public API `/employments`, `/educations`, `/works`, `/fundings`, `/peer-reviews`, `/researcher-urls`, `/distinctions` | `affiliated_with`, `employed_as`, `educated_at` (doctoral level only), `received_degree`, `authored`, `principal_investigator_of`, `served_as` reviewer, `received_award`, `has_homepage` | 10/s | 7 days | none | new; ORCID public email handling already in `atlas/users/contacts.py` |
| 3 | `enrich_orgs` | org names and ROR ids from stages 2 and 4 | ROR `api.ror.org/v2/organizations/{id}` and the ROR data dump | `profile.orgs` rows, parent and domains | 2000 per 5 min | 30 days, dump monthly | none | `prime_directions/ror.py` `RorClient`, `check`, `validate`; research-atlas `atlas/ror.py`, `atlas/ror_bulk.py` |
| 4 | `enrich_openalex` | OpenAlex A id | `api.openalex.org/works?filter=author.id:{id}&per_page=200` with `mailto` | `authored` with position, corresponding flag and institutions, `profile.works`, `profile.venues`, `affiliated_with` by year | 10/s, 100k per day | 7 days | none | `atlas/connectors/openalex_works.py` polite pool and cursor paging |
| 5 | `enrich_crossref` | DOIs from stage 4 | `api.crossref.org/works/{doi}` with `mailto` | work licence, funder and award ids, ORCID-asserted authorship upgrading tier to `T0` | 10/s | 30 days | none | new; award ids feed `atlas/award_match.py` |
| 6 | `enrich_grants` | person ORCID, name plus ROR, award ids from stage 5 | NIH RePORTER `api.reporter.nih.gov/v2/projects/search`; NSF `api.nsf.gov/services/v1/awards.json`; CORDIS dump; Wellcome 360Giving file; UKRI GtR API; ERC, DFG, Sloan, Gates, CZI | `principal_investigator_of`, `co_investigator_of`, `funded_by`, `profile.grants` with USD rate and date | RePORTER 1/s, NSF 1/s, bulk files local | 30 days, bulk per atlas build | none | `atlas/connectors/nih.py`, `nsf.py`, `nsf_bulk.py`, `cordis.py`, `wellcome.py`, `ukri.py`, `erc.py`, `dfg.py`, `sloan.py`, `gates.py`, `czi.py`; `atlas/award_match.py`; `grant_pi_person` match tiers |
| 7 | `enrich_pubmed` | DOIs, PMIDs | NCBI E-utilities `esummary`, `efetch` | `authored` for biomedical works, MeSH as `works_on` inputs, grant ids to stage 6 | 3/s without key, 10/s with key | 30 days | none | `atlas/users/contacts.py` EuropePMC and PubMed readers |
| 8 | `enrich_arxiv` | ORCID, arXiv ids from stages 4 and 5 | arXiv API `export.arxiv.org/api/query` | `authored` for preprints, versions, categories | 1 request per 3 s | 30 days | none | new |
| 9 | `enrich_s2` | DOIs, S2 author id | Semantic Scholar Graph API `/author/{id}`, `/paper/batch` | `has_id` S2, influential citation counts as derived literals | 1/s with key | 30 days | none | new |
| 10 | `enrich_dblp` | ORCID or DBLP pid | `dblp.org/pid/{pid}.xml`, ORCID search | `authored` for CS works, `served_as` program committee where DBLP lists it | 1/s | 30 days | none | new |
| 11 | `enrich_outputs` | ORCID, GitHub login from `researcher-urls` | DataCite `api.datacite.org/dois?query=creators.nameIdentifiers.nameIdentifier:{orcid}`; Zenodo `/api/records?q=creators.orcid:{orcid}`; GitHub REST `/users/{login}/repos`; Software Heritage `/api/1/origin/` | `created_dataset`, `created_software`, `profile.outputs` | DataCite 5/s, Zenodo 60/min, GitHub 5000/h with token, SWH 120/h | 30 days | none for ORCID-keyed records; claim for a GitHub login found anywhere except the person's ORCID | new |
| 12 | `enrich_patents` | person name plus assignee ROR, ORCID where the record has it | PatentsView `search.patentsview.org/api/v1/patent/` | `invented`, `profile.outputs` kind `patent`; Lens and EPO as `link_only` URLs | 45/min with key | 90 days | none; T2 matches to review queue | new |
| 13 | `enrich_trials` | person name plus site ROR | ClinicalTrials.gov `clinicaltrials.gov/api/v2/studies?query.term=` | `investigator_on`, `profile.outputs` kind `trial` | 1/s | 90 days | none; T2 matches to review queue | new |
| 14 | `enrich_wikidata` | Wikidata QID | `query.wikidata.org/sparql`: P108 employer, P166 award, P184 doctoral advisor, P185 doctoral student, P1026 MGP id, P2456 DBLP id | `received_award`, `advised`, `advised_by`, more `has_id`; Wikipedia article as `link_only` | 1 concurrent, 60 s per query | 30 days | none | history import path `20260924210000_research_os_history_wikidata.sql` and its `external_id_proposals` |
| 15 | `link_lineage` | MGP id from stage 14 or reviewer input; Academic Family Tree id | no fetch; the reviewer opens the MGP or tree page and confirms | `advised`, `advised_by` with `link_only` source and `T3` | none | on review | none | `graph.external_id_proposals` review flow |
| 16 | `enrich_directory` | ROR, name, department | University profile pages through per-ROR adapters: `seeds()`, `parse(html)`, robots.txt obeyed | `affiliated_with` title and department as `link_only` statements; email to the private parquet only | 1/s per host | 30 days; re-fetch before use when older than 180 days | none for title and department; founder for email | FACULTY-EMAIL-PLAN adapters under `atlas/users/directories/`, Stevens first, generic JSON-LD second; `ALLOWED_EMAIL_SOURCES` gains `official_directory` |
| 17 | `enrich_service` | ORCID peer reviews, DBLP committees, journal board pages | Board and committee pages found by the reviewer or listed on ORCID | `served_as` with role, `link_only` | 1/s per host | 180 days | claim for pages outside ORCID and DBLP | new |
| 18 | `enrich_courses` | ROR, name | Registrar schedule and catalog pages | `taught` with course code and term, `link_only` | 1/s per host | per term | claim, or founder-private use | registrar scrape pattern under `~/resume/job-search/scrapes/stevens-registrar/` per FACULTY-EMAIL-PLAN |
| 19 | `enrich_media` | ORCID `researcher-urls`, claimed links | YouTube and podcast pages the person listed | `appeared_in`, `link_only` | 1/s | 180 days | claim | `agf-yt info` for title and date only |
| 20 | `link_scholar` | Scholar user id the person supplied | no fetch | `has_id` scholar, `link_only` | none | never | claim | none |
| 21 | `derive_metrics` | stages 4 to 13 | local SQL over built tables | `works_count`, `citation_count`, `h_index_proxy`, `active_years`, `recent_works_3yr`, each with `derivation` | local | after each build | none | `atlas/users/profiles.py`, `segment.py` (`seniority`, `activity_tier`) |
| 22 | `derive_collaborations` | authorships, grants | local | `profile.collaborations`, `coauthored_with`, `co_funded_with` | local | after each build | none | atlas `grant_person`, work authorships |
| 23 | `derive_topics` | works with OpenAlex topics, Research OS topic nodes | local join on OpenAlex topic id | `profile.topic_positions`, `works_on` | local | after each build | none | atlas `work_field`; ADVISOR-DB-PLAN topic join |
| 24 | `link_bucket` | Bucket user id after claim, DOIs | local Supabase: `graph.productions` accepted, `graph.nodes` `provenance.doi`, `figure` nodes | `produced`, `extended`, `replicated`, `reviewed`, `authored_claim`, `is_figure`, `holds_account` | local | on write | claim for `holds_account`; none for DOI matches to canon nodes | `graph.productions`, `graph.nodes` |
| 25 | `viewer_fit` | viewer's own research text, person topic vector | local embedding | `profile.viewer_fit` only, never a statement | local | on viewer request | viewer's own session | `prime_directions/advisors.py` (`star_prime`, `star_ours`, `shared_topics`), `tools/pi-fit/fitmap.py` |
| 26 | `render_profile` | all public statements | `profile.public_statements` | page and a feed402 envelope: `data` is the statement list, `citation` is the per-statement `sources[]` | local | on read | none | `PROTOCOL.md` envelope; `src/app/api/research-os/node/route.ts` source rendering |

Stages 2 and 4 run in parallel after stage 1. Stages 5 to 14 depend only on ids and works from stages 2 and 4 and run in parallel per host. Stages 15 to 20 need a reviewer, a claim or founder use. Stages 21 to 23 run after every build. A full refresh for one person with 40 works costs about 60 requests under these ceilings [empirical: this plan's stage table, 2026-09-29, count of per-person calls in stages 0 to 14 at 40 works and 200 per page].

## Build Order

| Step | Work | Depends on |
|---|---|---|
| 1 | Founder settles the three open decisions | this file |
| 2 | `profile` schema migration with RLS and the public view; tests prove no email-like string and no score field in any public row | step 1, ADVISOR-DB-PLAN step 3 opt-out |
| 3 | Loader from atlas `person`, `person_org`, `grant_pi_person`, `work` into persons, ids, statements, T0 to T2 tiers | step 2 |
| 4 | ORCID claim flow and owner view | step 2 |
| 5 | Profile page rendering statements with source chips | steps 3 and 4 |
| 6 | Link-only sources: MGP, service roles, courses, media, through reviewer-confirmed proposals | step 5 |
| 7 | Move `advisor_page.html` decisions and fit into the viewer tables | step 2 |

Each step files as its own bead with `needs-founder` and `source-agent` and goes through the Bucket critic.

## Open Decisions

1. **Where people live.** A separate `profile` schema (this file) keeps people out of the learner-editable knowledge graph, as ADVISOR-DB-PLAN requires. The alternative adds `person` to `NodeKind` and reuses `graph.edges`, which gives one graph query surface and puts real people inside a graph learners edit.
2. **Who gets a public page.** Option A: only people who claim their profile through ORCID get a public page; everyone else appears as a name with source links inside topic panels. Option B: every T0 or T1 person gets a public page with opt-out. B covers 1.4M people and carries the privacy exposure; A starts near zero pages.
3. **Email in Bucket.** Keep official and public emails only in the research-atlas private parquet and show a link to the source page (this file), or copy them into a Bucket `private` statement readable by the founder account for correspondence. The second puts contact data in Supabase and needs a new USERS_POLICY version.
