# Evolution Plan

Critic: 8.90 after three rounds against the founder's 9.0 bar. The one open medium, E15 (the purge contract), is fixed below from the critic's own prescription without a fourth review; the E1 build PR is reviewed against it.

Epic bkt-3vu7, on `origin/dev` c909d4398 and `origin/ops/integration`, measured 2026-09-24. **UNVERIFIED** marks what no live check confirmed.

## 1. Answer

Extend the history model with six node kinds, nine edge kinds and ten roles; links get dates and places through factoids that point at an edge. Postgres holds 0.83M nodes, 2.0M edges and 6.4M factoids, 38 GB with headroom. Patents, packages and works stay as Parquet read by DuckDB; only aggregates and promoted items enter the graph. Every derived number is a silver item until a reviewer or sampled batch review promotes it.

Two inputs change: the disk has **110 GB free** (`df -h /home`, 2026-09-24) against an assumed 288 GB, and each factoid needs silver and lineage rows, so the input's "tractable ideal" needs about 1.0 TB in Postgres.

## 2. Ideal State

The team uses DuckDB, the globe, node page, primes and attention.

1. **AI and work today.** Which occupations carry the most task weight Eloundou et al. rate exposed, which of those tasks gained a `uses` edge to an AI tool from 2023, and which unheld task combinations sit on the work frontier?
2. **Deep history.** After the printing press's `invented` factoid (Mainz, c. 1450), how long until printer HISCO groups appear in each region, and which scribal tasks show a `replaces` edge? The gap report states how thin each cell is.
3. **Discovery to technology.** For each `enables` edge, what is the lag from `discovered` to `invented` by century and region, against Comin and Hobijn's lags?
4. **Language lineage.** Which languages descend from ALGOL (P144, P737), when did each release, which keep support, and which occupations list them as tools?
5. **What replaced what.** Which OS lineages were replaced, and where did use decline after the successor's release?
6. **Disruption and work.** Does corrected disruption in a field's papers lead or lag task turnover in occupations using that field's technologies?

## 3. Data Model Deltas

The date model stays EDTF plus four astronomical bounds (`20260924130000_research_os_history_factoids.sql:29-39`) and the place model `graph.places`. One migration, `20260925010000_research_os_evolution_model.sql`, carries the SQL.

### 3.1 Node Kinds

`nodes_kind_check` (set last at `20260924120000_research_os_history_places_periods.sql:1-6`) gains six kinds. `NodeKind` in `src/lib/research-os/types.ts:1-16` mirrors it.

| Kind | Levels, in `provenance.level` | Branch | Examples |
|---|---|---|---|
| `occupation` | `onet`, `isco_unit`, `hisco_micro` | new `11-work` | Software developers, 15-1252.00 |
| `task` | `onet_task`, `dwa`, `iwa`, `gwa`, `factor` | `11-work` | "Maintain records" |
| `technology` | `class`, `artifact` | CPC map from `PATENTS.md` | CPC G06F; the telephone |
| `software` | `os`, `language`, `package`, `application` | `04-information` | Linux kernel, Python |
| `discovery` | `finding`, `work` | OpenAlex field map | Penicillin; a top-cited paper |
| `topic` | `openalex_topic` | OpenAlex field map | An OpenAlex topic |

A CHECK requires `provenance->>'level'` from the list. `patent` stays with ros-patents 2 (`PATENTS.md` line 103).

### 3.2 Edge Kinds

`edges_kind_check`, last set at `20260916040000_research_os_canon_kinds.sql:12-17` with 13 kinds, and `EdgeKind` at `src/lib/research-os/types.ts:18-31` gain nine:

| Kind | From, to | Source |
|---|---|---|
| `performs` | occupation, task | O*NET tasks and DWAs |
| `uses` | occupation, task or software; technology or software | O*NET Technology Skills, 32,435 rows; package dependencies |
| `automates` | technology or software, task | Eloundou et al. |
| `enables` | discovery or technology, technology or software | Wikidata, reviewer |
| `replaces` | any new kind, same kind | Wikidata P1366/P1365 (**UNVERIFIED** coverage), reviewer |
| `descends_from` | software or technology, same | Wikidata P144, 95,800 claims |
| `influences` | software, software | Wikidata P737, 32,170 claims |
| `part_of` | task, task | O*NET hierarchy |
| `maps_to` | occupation to occupation; work, patent to topic or class | Crosswalks; OpenAlex, CPC |

None is in `FACTOR_EDGES` (`primes.ts:36-39`) or the walk sets of `directions.ts:17-18`, so idea-layer primes and walks stay put.

### 3.3 Roles and Edge Factoids

`factoids_role` (`20260924130000...:29`) gains `invented`, `discovered`, `released`, `emerged`, `adopted`, `declined` and `retired` for nodes, plus `began`, `ended` and `measured` for edges. `graph.factoid_role_fits` (lines 48-64) gains: occupation and task take `emerged`, `declined`; technology `invented`, `adopted`, `declined`; software `released`, `adopted`, `declined`, `retired`; discovery `discovered`, `published`; topic `emerged`.

The migration drops `not null` on `factoids.subject_id`, adds `edge_id uuid references graph.edges on delete restrict`, and adds `check (num_nonnulls(subject_id, edge_id) = 1)`, the pattern of `gold_lineage_one_target` (line 89). Restrict keeps the audit trail: an edge with factoids is withdrawn through its silver, never deleted. A new `graph.edge_factoid_role_fits(edge_kind, role)` admits `began`, `ended` and `measured` on the nine new edge kinds only. A partial unique index on `(edge_id, role) where preferred and status = 'active'` mirrors `factoids_preferred_uidx`. A nullable `measure jsonb` column, CHECK object with keys `metric`, `value`, `unit` and optional `threshold`, holds an exposure score or an adoption threshold. Confidence is the lowest of source prior, match score and fit quality (HISTORY-PLAN section 6); `graph.edges.confidence` copies the preferred factoid's.

An edge subject in silver is written `edge:<edge uuid>`, so no slug is parsed; slugs carry no CHECK today and 0 of 1,924 contain `|` or `:`, and a CHECK `^[a-z0-9][a-z0-9-]{0,199}$` on the six new kinds keeps it so. Each `subject_id` consumer in migrations 130000 to 220000 gets an edge branch in E1:

| Consumer, keyed on `subject_id` at | Edge branch |
|---|---|
| `factoids_attachment` trigger, 130000:66-84, fires on `subject_id, role` | Fires on `edge_id` too; checks `edge_factoid_role_fits` |
| `promote_history_factoid`, 130000:205, 224 | Refuses edge subjects; `promote_evolution_factoid(p_silver, p_reviewer, p_preferred)` locks by `edge_id` |
| `prefer_history_factoid`, 180000:52-54 | Lock and unset keyed on `coalesce(subject_id, edge_id)`; `preferred_via` (180000:8) adds `evolution-import`, `batch` |
| `revive_history_factoids`, 220000:181 | Same preferred test on `edge_id`, so a revive never trips the `(edge_id, role)` index |
| `restore_withdrawn_node`, 130000:390 | Also revives factoids on edges incident to `p_node` |
| `restore_withdrawn_history`, 130000:446 | Skips an edge factoid when either endpoint is queued |
| `withdraw_identity_dependents`, 220000:37; `tag_identity_silver`, 220000:206, both `history-import` only | Add `evolution-import`; edge silver matches either endpoint's slug |
| `reject_history_silver`, 170000:31, `history-import` only | New `reject_evolution_silver` |
| `factoid_conflicts`, 140000:13; `history_anchors`, 200000 | Joins on `subject_id` drop edge rows; `graph.edge_factoid_conflicts` covers them |
| `node_when_where`, 140000:46-55, joins no node | Adds `f.subject_id is not null`; without it every edge factoid shows as preferred with a null subject |
| `medallion_withdrawal_cascade`, 210000:93 | Covers edge factoids by silver; adds series rows by source |
| Recast deletes edges, 020000:78,128 | Refuses an edge with factoids until `graph.move_edge_factoids(old, new)` runs in its transaction |
| Node delete cascades to edges, 20260910000000:91-92 | Fails closed on an edge with factoids; delete follows a source withdrawal and `graph.purge_edge_factoids(p_edge)`, which archives each row as jsonb in `graph.purged_factoids`; silver stays |

**Purge contract, from critic finding E15.** `graph.purge_edge_factoids(p_edge uuid, p_reviewer uuid)` is `security definer`, granted to service_role only, and the calling route checks `RESEARCH_OS_REVIEWER_EMAILS` first. It raises unless every factoid on the edge has `status = 'withdrawn'`. In one transaction it copies each factoid and each of its `gold_lineage` rows (which would otherwise cascade away, 130000:87) into `graph.purged_factoids` and `graph.purged_gold_lineage`, then deletes. Both archive tables have RLS on and are revoked from anon and authenticated. E1 tests: purging an edge with an active factoid is refused; a withdrawn factoid is archived with its lineage rows intact; anon and authenticated calls are refused.

E1's SQL tests prefer, withdraw, restore and revive an edge factoid beside a node factoid from one source, assert history rows are untouched, assert `node_when_where` returns no edge rows, and assert a node delete refuses while a dated edge remains; `scripts/test-research-os-*.ts` cleanup purges edge factoids first.

### 3.4 Authorities and Lineage

`node_external_ids_authority` (`20260924120000...:92-97`) and `node_external_ids_shape` gain, with shapes: `onet` `^[0-9]{2}-[0-9]{4}\.[0-9]{2}$`; `onet_task` `^[0-9]{1,6}$`; `onet_dwa` `^4\.A\.[0-9A-Za-z.]+$`; `isco08` `^[0-9]{1,4}$`; `hisco` `^[0-9]{5}$`; `cpc` `^[A-HY][0-9]{2}[A-Z]$` at subclass level; `patent_us` `^(D|PP|RE|H|T)?[0-9]{1,8}$`; `openalex` `^[WT][0-9]+$`; `swh` `^swh:1:(ori|snp|rel|rev|dir|cnt):[0-9a-f]{40}$`; `purl` `^pkg:[a-z0-9.+-]+/.{1,400}$`; `eol` `^[a-z0-9][a-z0-9._+-]{0,99}$`.

Wikidata matches go through `graph.external_id_proposals` unchanged (`20260924210000...:15-37`). `gold_lineage_importer` (`20260924130000...:90-94`) adds `evolution-import`. `gold_lineage_promoted_by` (`20260924000000...:254`) adds `batch`, with `check ((promoted_by = 'batch') = (batch_review_id is not null))`; `reviewer_id` on a batch row names the approver of the sample, so the UI reads "batch approved by X on a sample of 200" and never credits a reviewer with an unseen item. `gold_lineage_rules` hard-codes `history-import` for factoids (130000:127) and `academy_atom` and `canon_entry` for nodes and edges (130000:150-155). It gains two branches: `evolution-import` may promote nodes and edges whose provenance type is `onet_occupation`, `onet_task`, `onet_dwa`, `onet_tech_skill` or `bls_oews`, and factoids whose rule is `onet-cc-by` or `bls-oews-pd`; `batch` requires an approved `graph.evolution_batch_reviews` row whose `(source_id, source_revision, parser, role)` equals the silver item's. Everything else waits for a reviewer.

### 3.5 Authorization and Writes

RLS stays on, revoked from anon and authenticated. Reads run as service role through `authorizeNodes` (`src/lib/research-os/read-access.ts:113`); an edge factoid shows only when both endpoints pass. Gold writes go through `promote_evolution_factoid` and `graph.promote_evolution_batch(p_review)`, both security definer, service role only, behind the `RESEARCH_OS_REVIEWER_EMAILS` check in `src/lib/research-os/reviewer.ts:11`. A batch locks its rows with `for update skip locked` in chunks of 10,000, skips items a reviewer already decided, and resumes idempotently on `(silver_item_id, role)`.

### 3.6 Series

Adoption shares and counts per CPC or topic and year go in `graph.evolution_series (subject_id, metric, place_id, year, value, unit, source_id, source_revision, run_hash, status)`, with astronomical int4 years and `graph.places`. A series is evidence; events read from it, such as crossing 10% adoption, are factoids.

### 3.7 Relation to Primes

An occupation factors into tasks and tools as a concept factors into primes. In the work layer, DWAs, or IWAs for tractability, are the primes, irreducible in O*NET's taxonomy and provisional like Leibniz's primitives (`PRIMES.md`). An occupation's Leibniz number divides another's exactly when the second does every activity of the first (`PRIME-ALGEBRA.md` M2). `decompose` in `primes.ts:135` gains an optional factor-edge map, defaulting to `FACTOR_EDGES`, so `decompose(nodes, edges, { performs: "to" })` builds the work layer over exact DWA sets; tools join only through the factor pipelines of section 6. `attend`, `coverage`, `frontier`, `nullFrontier`, `pmiPairs` and `implications` in `prime-algebra.ts` then run on it unchanged. A work-layer minimal nonface, a task combination no occupation holds while every smaller subset occurs, is a candidate new job. The idea layer keeps its 41 primes.

`src/lib/research-os/primes-report.ts:209` and `scripts/research-os/primes-report.ts:37` exclude `event`; both switch to one exported `NON_IDEA_REPORT_KINDS` in `idea.ts`, and `scripts/test-research-os-primes-report.ts` pins `unfactoredByKind` with a node of each new kind. `isIdeaNode` (`idea.ts:7-9`) already excludes them from attention and decompose-further.

## 4. Storage and Scale

### 4.1 Measured Unit Costs

| Item | Bytes | Basis |
|---|---:|---|
| Node row with indexes | 2,725 | `graph.nodes`, 1,924 rows |
| Vector, 384-d `real[]` heap | 1,638 | test container, 20,000 rows |
| HNSW entry, `halfvec(384)`, m=16 | 1,141 | same |
| Silver item with indexes | 1,463 | `graph.silver_items`, 4,099 rows |
| Lineage row | 368 | `graph.gold_lineage`, 2,646 rows |
| Edge row with indexes | 1,595 | `graph.edges`, 2,511 rows |
| Factoid row with indexes | 600 | 249-byte tuple; indexes ESTIMATE |

A node with vector, silver and lineage costs 7.3 KB, an edge 3.4 KB, a factoid 2.4 KB. Polingual's 768-d HNSW measures 3,812 bytes an entry, matching the input's rule.

### 4.2 Tier Arithmetic

| Tier | Nodes | Edges | Factoids | Postgres | Verdict |
|---|---:|---:|---:|---:|---|
| T1 core | 231,929 | 180,017 | 2.50M | 1.7 + 0.6 + 6.1 = 8.4 GB | Fits |
| T2 as nodes | 21.5M | 35.8M | 251M | 157.7 + 122.7 + 610.2 = 890.5 GB | Infeasible |
| Input "tractable ideal" as nodes | 25.8M | 35.8M | 294M | 189.2 + 122.7 + 714.7 = 1,026.6 GB | Infeasible |
| Chosen graph tier | 0.83M | 1.98M | 6.40M | 6.1 + 6.8 + 15.6 + 0.5 series = 29.0 GB, x1.3 = 37.7 GB | Fits |

T2's edges include 35.6M Reliance on Science links, which `PATENTS.md` (line 58) excludes as CC BY-NC while Bucket charges x402 fees; PatentsView non-patent references matched to OpenAlex replace them, count **UNVERIFIED**.

The chosen tier is T1 plus 600,000 promoted items under importer caps: 300,000 works (the top 0.12% of 254.4M by citations within topic and year), 150,000 patents that a factoid or an `enables` edge cites, 100,000 packages, and 50,000 other Wikidata items. Factoids: T1's 2,499,307, plus 5 per promoted item (3.0M), plus 0.5 per new edge (0.9M), 6,399,307 at 2,431 bytes = 15.6 GB. The 1.8M new edges (ESTIMATE): works to their primary topic, 300,000 `maps_to`; patents to a CPC class plus 2 `cites`, 450,000; packages to a language plus 5 dependencies, 600,000 `uses`; other Wikidata items, 3 links each, 150,000; derived `enables`, `automates` and factor edges, 300,000. `maps_to` therefore also runs from a work or patent to its class, and `uses` from software to software. Raising a cap reruns this arithmetic.

**Evidence tier, Parquet under `EVOLUTION_DATA`** (default `_intake/evolution/`, the pattern of bucket_eval/datasets/common.py line 11 on ops/integration), at most 31.3 GB steady. Conversions stream: pyarrow reads each PatentsView TSV from its zip without unzipping, one table at a time, and a download is deleted once row counts match, leaving URL and SHA-256 in the manifest. Large bronze stays untracked; manifests are tracked.

| Item | Steady | Peak transient |
|---|---:|---:|
| OpenAlex column slice, shared with S1 | 8.5 GB (pilot projection, `runs/d2-pilot.json`) | 17 GB, parts plus dedup (ESTIMATE) |
| PatentsView, per table | at most 10 GB (ESTIMATE) | one zipped table plus its Parquet, 10 GB (ESTIMATE) |
| libraries.io | at most 10 GB (ESTIMATE) | 20 GB |
| Science4Cast, HistPat, small sources | 2.8 GB | 2.9 GB |
| Graph tier with headroom | 37.7 GB | HNSW build 0.95 GB on disk |
| WAL during bulk loads | | 3 GB (`max_wal_size` measured at 1 GB) |
| One `pg_dump` of the graph tier | 10 GB (ESTIMATE) | |
| Total | 69.0 + 10 = 79.0 GB | largest job 20 + 3 = 23 GB |

`MIN_FREE_BYTES` is a fixed 60 GB today (common.py line 13 on ops/integration). The E2 ops PR replaces it with one shared rule for S1 and evolution, a 30 GB floor plus the job's declared transient, and its description states that S1's `openalex_slice` guard drops from 60 GB to 47 GB. At 110 GB free the steady state leaves 31 GB, so the largest jobs refuse. **The Docker prune (founder question 1) gates E5**; E1 to E4 need about 15 GB.

### 4.3 Vectors

Install pgvector in `supabase_db_bucket-foundation`: 0.8.2 is available and uninstalled there (`pg_available_extensions`). CI and `package.json` run `npx supabase@latest` (`.github/workflows/site-ci.yml:109,113,171,174`; `package.json:41-44`), so E2 pins the CLI to the tested version (2.117.0 locally) and its SQL test asserts `extversion = '0.8.2'`. Keep `graph.node_embeddings.vector real[]` (`20260924040000...:1-8`) and add a partial expression index, `hnsw (((vector::extensions.vector(384))::extensions.halfvec(384)) halfvec_cosine_ops) where model = 'BAAI/bge-small-en-v1.5'`. A pg16 test container built and used this index; E2 repeats the check on the pg17 image. No data moves, and rollback drops the index and extension. bge-small-en-v1.5 at 384 dims stays, the model attention and decompose-further use, so one space serves both layers. Non-English historical titles match through codes.

`loadNodeVectors` (`src/lib/research-os/attention-db.ts:65`) reads every row for the model, about 3 GB of JSON at 0.83M rows, so E2 filters it to the snapshot's node ids. Evolution kNN runs in `graph.nearest_nodes(p_node, p_kinds, p_k)`, service role only: plpgsql reads the query vector into a variable and names the model as a literal, so the partial index matches, and sets `hnsw.iterative_scan = relaxed_order` for the kind filter. An E2 test fails unless EXPLAIN shows the HNSW index scan and no Sort node.

### 4.4 Partitioning and Latency

No Postgres partitioning below 20M factoids; past that, list-partition `graph.factoids` by role family. Parquet partitions hive style by source, snapshot and year.

| Query | Store | Target, local p95 |
|---|---|---|
| Node page evolution section | Postgres | under 150 ms, the history P3 target |
| Markers window, up to 5,000 markers | GiST on `span` | under 150 ms |
| kNN top 20 over 0.83M, `ef_search` 40 | HNSW | under 50 ms, recall@20 at least 0.95 against exact |
| One node's series | Postgres | under 50 ms |
| Topic by year rollup over 250M works | DuckDB | under 60 s, batch |
| Work frontier, top 5,000 nonfaces, 1,000 draws | TypeScript | under 30 s, cached per run |

Hosted path: the web reads Postgres alone, so the graph moves to any Postgres with pgvector and Parquet to object storage via DuckDB `httpfs`; cost **UNVERIFIED**.

## 5. Penetration and Coverage

| Domain | Source and share of the real world | Known bias |
|---|---|---|
| Occupations now | O*NET: 100% of the US taxonomy (1,016), 0% of workers; ISCO-08, 436 unit groups; IPUMS, 104 of about 195 countries, out of v1 | US only; analyst-logged software |
| Occupations past | HISCO, 1,675 micro-groups, 16th to 20th century; DOT, 12,741 titles | Depends on digitized censuses; DOT out of v1 |
| Technologies | Wikidata P61 134,774 and P575 128,743 claims; CHAT, 100+ technologies in 150+ countries | Notable, Western; P61 also names discoverers of minor planets (**UNVERIFIED** share), so a class filter runs first |
| Patents | US grant 12,000,000 on 2024-06-04; PatentsView from 1976; HistPat about 83% of resident patents 1836 to 1975 | US only; no trade secrets; examiners add two-thirds of citations |
| Discoveries | OpenAlex 327.9M works, 4,516 topics | Thin before 1900 and outside English; topics carry hindsight |
| Languages | Wikidata 1,901 of HOPL's 8,945, 21.3%; Rosetta Code 1,007 | HOPL forbids copying; its count is a reference total only |
| Operating systems | Wikidata 2,222; endoflife.date 67 `os` of 477 products | Mainstream stacks only |
| Code | Software Heritage 443,587,859 origins; libraries.io 11.9M packages | Incomplete; libraries.io unvalidated |

**Report.** Reuse HISTORY-PLAN section 5: E(r,p) = Σ B_k·w_k(r,p)/W_k, Garwood intervals, cells printed when E ≥ 5, seven M49 regions. `history_reference_counts_kind` (`20260924190000...:143`) adds `technology`, `software`, `discovery`, and `graph.history_anchors` (`20260924200000...:28,44`), which maps unknown kinds to `event`, gains anchors on `invented`, `released`, `discovered`. `graph.evolution_period` bins 1500-1799, 1800-1899, 1900-1945, 1946-1979, 1980-1999 and 2000-2026; the history grid stays fixed. References are QLever aggregates, as in `scripts/research-os/history/reference.ts:10`. Each kind adds a line against the real-world totals above; occupations report the share of ISCO unit groups each region's taxonomy covers, with a US-share index.

## 6. Dimensionality Reduction

Pipelines live in `tools/research-eval/bucket_eval/evolution/` (scikit-learn 1.9, DuckDB 1.5.4 and pyarrow 24 are installed). Each run writes its config hash, input SHA-256 values and `results.jsonl` to `_intake/evolution/<pipeline>/<date>/`; the importer bronzes that file, so silver spans are byte offsets into it.

| Pipeline | Matrix and method | Interpretability | Evaluation |
|---|---|---|---|
| Work factors | Occupation by DWA, binary, 1,016 by about 2,000 (**UNVERIFIED**); NMF with a 0/1 mask by multiplicative updates, since scikit-learn's takes no mask; k 5 to 40, 50 seeds each | Sparse loadings, top 20 DWAs each; two reviewers name each factor independently, kappa reported, disagreement stays silver | Seed stability (cophenetic correlation); masked loss on 10% held-out cells against logistic PCA, truncated SVD and random at the same k |
| Occupation and technology space | Occupation by tool; coupled NMF sharing occupation weights with the DWA matrix; Hidalgo proximity | A factor lists its activities and its tools together | Proximity predicts a tool's next occupation across O*NET releases, **UNVERIFIED** archive depth |
| Topics | Counts per OpenAlex topic or CPC subclass, year and country | Published taxonomies | Kelly et al. 2021 as benchmark |
| Adoption | Logistic fit per technology and country with bootstrap; PCA over curves aligned on years since invention | Named loadings; only fitted parameters become factoids | Fit through year Y, predict the midpoint after Y |
| Disruption | CD index, inflation-corrected, promoted works | Beside raw CD | A referenced-works pilot sizes the pull |

The config hash covers seeds, solver, init, loss, k, mask seed and the scikit-learn pin. NMF factors are neither unique nor irreducible, so they are named work factors. The words "prime", Leibniz numbers and M2 divisibility apply only to exact DWA sets (section 3.7). The work frontier's 1,000 draws are the curveball null of `PRIME-ALGEBRA.md` M5, keeping each occupation's DWA count and each DWA's frequency, with Benjamini-Hochberg at 0.05. UMAP pictures start from PCA and carry no distance claim.

**Results become factoids.** A logistic midpoint becomes an `adopted` factoid with the country's place, the threshold in `measure` and bootstrap bounds as `start_min` and `start_max`; an exposure score becomes a `measured` factoid on an `automates` edge. Anything under the 0.5 promotion floor stays in silver. A batch review samples 200 items, seeded, from one `(source, revision, parser, role)` set and promotes the set only when the Wilson upper bound on the error rate is at most 5%. A causal claim needs an event study on that edge.

## 7. Live Feeds

| Feed | What | Cadence | Cost |
|---|---|---|---|
| endoflife.date API v1 | Releases and end of support, 67 OS and 34 language products | Daily | $0; product list 85,593 bytes |
| Wikidata via QLever | Q9143 and Q9135 trees, P348 versions with P577 dates, P144, P737 | Weekly | $0; 4,123 items |
| libraries.io snapshot | Packages per language and month, internal | Monthly, latest kept | $0; at most 10 GB on disk |
| GitHub Innovation Graph | Language activity by economy and quarter | Quarterly, after its license gate | $0; license and schema **UNVERIFIED** |
| SO Survey, PYPL | Usage shares | Annual, monthly | $0; ODbL, CC BY 3.0 |

"Live" means a new release reaches silver within 24 hours for endoflife products and 7 days for Wikidata-only items, then the globe after review or batch promotion. Until endoflife.date clears its license gate, every product runs on the weekly Wikidata cadence. `evolution-live.timer`, a systemd user unit like `sacred-history-mirror.timer`, is idempotent on the silver unique key. Growth: under 50 MB a year (ESTIMATE, 10,000 factoids at 2.4 KB). GH Archive and TIOBE history ($5,000) are out.

## 8. Tool Integration

History P3 has not shipped (`src/app/api/research-os/history/route.ts` serves review only; `CanonGlobeMount.tsx:264-265` filters static events). Evolution shares its markers API, export, window mode and "When and where", adding a `kinds` parameter. `/canon/timeline` redirects to `/canon`, whose year scrubber is the timeline.

| Surface | Change |
|---|---|
| `/canon` | Evolution markers under the P3 modes; `EVOLUTION_MARKERS=off` hides them |
| Node page, `n/NodeView.tsx` | Evolution section: lineage, series sparkline, occupations using the tool, exposure with its rubric, each row's source and review state |
| `/research-os/primes` | A Work tab: coverage, frontier with curveball classes, tasks that travel together, implications |
| `/research-os/attend` | `layer=work` runs `attend` over the work decomposition |
| `/research-os/review` | Batch sample review beside history review |


## 9. What Bucket Must Integrate

- **pgvector 0.8.2** with a `halfvec` HNSW expression index: kNN over 0.83M vectors, where today's full-table read cannot scale.
- **DuckDB over Parquet**: keeps 31 GB of evidence outside Postgres and rolls up 250M works.
- **systemd user timers**: the scheduler already in use.
- **scikit-learn and SciPy**, pinned in `tools/research-eval`: NMF, PCA, logistic fits.
- **Disk**: a Docker prune or a volume; 110 GB free, 219.8 GB reclaimable.
- **Object storage and hosted Postgres with pgvector**: the hosted path.

## 10. Phases

Migrations, importers and pages go on `feat/ros-evo-*` into `dev`; pipelines, timers and disk gates on `measure/evo-*` or `ops/evo-*` into `ops/integration`; nothing targets `hte/integration`. A JSONL contract fixture on `dev` joins them. E1 to E6 and E8 are founder-authorized: children carry `needs-founder` and `source-agent` until he approves the plan, then `source-founder`. E7 follows HISTORY-PLAN question 1. After E1, E2 runs beside E4, then E3 and E5.

| Phase | PRs | Depends on | Tests | Rollback |
|---|---|---|---|---|
| E1 Model | 2, dev: migration, types, primes exclusion, read access; rights rules and importer core | none | `supabase/tests/research_os_evolution.sql`: role fits, `num_nonnulls`, `edge_id` trigger, authority shapes, importer and batch refusals, anon refused, the edge cases of 3.3; primes pin | Revert, drop migration after withdrawal |
| E2 Store | 1 dev: CLI pin, pgvector index, `nearest_nodes`, filtered `loadNodeVectors`; 1 ops: store, manifests, shared floor | E1 | `extversion`; EXPLAIN shows the index, no Sort; recall@20 at least 0.95; `eval-attention.ts` nDCG unchanged; `require_free` refusal | Drop index and extension |
| E3 Labor | 1 ops: O*NET, ISCO, HISCO, Eloundou to Parquet; 1 dev: importer, batch review | E1, E2 | Counts equal 1,016, 18,838 and 32,435; rerun writes 0 rows; Wilson gate | Withdrawal runner per source |
| E4 Computing and live | 2 dev: Wikidata and endoflife importer, Software Atlas merge, series table; 1 ops: timer | E1 | One fixture release gives one silver item; unapproved rule refused; lineage cycles flagged | Disable timer, withdraw |
| E5 Technology and discovery | 2 ops: PatentsView, HistPat, OpenAlex rollups, CHAT fits; 1 dev: promoted items, P61 class filter | E2, E4, founder question 1 | CPC longest prefix; synthetic curve midpoint within 1 year; minor-planet fixture excluded | Withdraw; delete Parquet per manifest |
| E6 Reduction | 1 ops: pipelines and evaluations; 1 dev: derived factoids, `decompose` factor map, TS and Python work-frontier parity | E3, E5 | Config hash reproduces; masked held-out loss against logistic PCA; kappa of the two namers; parity fixture | Withdraw run |
| E7 Tools | 3 dev: markers kinds, Evolution section, Work tab and `layer=work` | E6, history P3 | e2e: `kinds=software` at 1990 hides the Linux kernel and at 1992 shows it; primes counts unchanged; p95 targets | `EVOLUTION_MARKERS=off` |
| E8 Coverage | 1 dev: grid, anchors, references, report | E5 | Hand-computed fixture as in history P4 | Drop view |

**Budget.** 18 PRs, at most 3 build agents at once. About 24 build sessions at up to 400k tokens and up to 3 critic rounds per PR at 150k: a ceiling near 17.7M tokens (24 x 400k + 18 x 3 x 150k).

## 11. Rights

New rules in `learning/research-os/ai/rights-policy.json`, in the shape of `wikidata-cc0` (line 125): `onet-cc-by`, `bls-oews-pd`, `wikidata-evolution-cc0`, `openalex-cc0`, `patentsview-cc-by`, `histpat-cc0`, `science4cast-cc-by`, `eloundou-mit`, `libraries-io-cc-by-sa`, `so-survey-odbl`, `pypl-cc-by`. License gates, **UNVERIFIED**, each loading nothing until confirmed: ISCO, HISCO, endoflife.date, CHAT beneath OWID, AIOE (no license file) and GitHub Innovation Graph. Excluded: HOPL, Webb (gated), Reliance on Science, TIOBE history, full IPUMS microdata, EPO PATSTAT. Share-alike sources (libraries.io, Stack Overflow Survey) stay internal by default: their series, and the libraries.io dependents ranking behind the 100,000 package cap, stay out of feed402 exports and public pages until founder question 3.

## 12. Risks

Minor planets in P61; six license gates; topic hindsight; US-centred labor data; review hours; disk; QLever limits; NMF instability; E7 waits on history P3.

## 13. Founder Questions

1. **Disk, gating E5.** Prune Docker images and build cache (219.8 GB reclaimable, shared with other ventures' k3s stacks), or add a volume?
2. **Batch promotion.** May a 200-item sample with a Wilson upper bound of 5% promote a whole CC0 or derived batch?
3. **Reviewer hours.** About 20 first batches at 200 items is 4,000 items, near 22 hours at 20 seconds an item (ESTIMATE), plus about 50 items a week for live feeds. Who reviews, and does a second reviewer name work factors?
4. **Share-alike.** May CC BY-SA and ODbL series reach feed402 exports and public pages?
5. **Launch.** Are the evolution markers and the Evolution section launch screens, or `post-launch`?
6. **Hosted budget.** What monthly spend caps a hosted graph tier and object storage?
7. **Branch.** Is `11-work` the right branch for occupations and tasks?

## Round 2 Changes

| Finding | Fixed in |
|---|---|
| E1 edge factoids and `subject_id` consumers | 3.3 consumer table, 10 E1 tests |
| E2 batch credit, lineage rules | 3.4 |
| E3 disk | 4.2 transient table, shared floor, 10 E5 gate, question 1 |
| E4 CLI pin, bound vector, EXPLAIN | 4.3, 10 E2 |
| E5 reduction discipline | 6, 3.1 `factor` level, 10 E6 |
| E6 rights | 7, 11 |
| E7 founder questions | 13, questions 3 and 6 |
| E8 to E10 factoid count, slugs, endoflife | 4.2, 3.3, 7 |
| E11, E12 views and node delete | 3.3 |
| E13, E14 order, S1 floor | 10, 4.2 |
