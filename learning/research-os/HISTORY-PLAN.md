# History and Timeline Plan

Bead bkt-sjan. Grounded on `origin/dev` at 2a29127ba; local `dev` lacks the medallion layer, so site branches start from `origin/dev` and engine branches from `origin/hte/integration`. Labels: `history`, `source-founder` on the epic; `needs-founder`, `source-agent` on children.

## 1. Goal and Outcomes

Every figure, site, event, text and idea carries a sourced time and place. A reader scrubs history on the globe and sees thin and disputed records.

| Phase | What the user sees | Done when |
|---|---|---|
| P1 One model | Nothing yet | Migrations replay twice on `supabase db reset`. TS and Python pass the shared golden file. `/research-os/primes` counts and `unfactoredByKind` are unchanged. The BRONZE_ROOTS parity test passes. |
| P2 Reconcile | Nodes carry dates and places | 47 of 47 sites and 58 of 58 timeline births have a preferred factoid. Of 97 `figures.json` targets, 95 yield `born`, 85 `died`, 2 `flourished`. A rerun writes 0 rows. |
| P3 Globe and node page | `/canon` scrubs cumulative or window; uncertain dates fade; the node page shows "When and where" | Cumulative mode at 2020 returns the 161 marker ids `/canon` shows today (47 + 114). Window mode passes its own e2e cases. Local p95 under 150 ms. |
| P4 Gap report | A region by period table with intervals, and one Eurocentrism line | One command runs it. Each printed cell names b, E and an interval. |
| P5 Fill | More markers in thin cells | The report reruns with before and after numbers. No history source is NC or unclear. |

## 2. What Exists and What Is Wrong

- **Three date encodings.** Wikidata ISO strings (106 bindings), free text in `canon-figures/figures.json` (99, such as `"c.325-c.265 BCE"`), and signed integers in `src/data/canon-sites.json` (47) and `src/data/canon-timeline.json` (114).
- **Two year conventions.** `canon-all.ts` reads -570 as 570 BCE. `hte/timeline.py`, ISO 8601 and EDTF use astronomical years, where 570 BCE is -569.
- **Dates older than Postgres `date`.** Eridu (-5400) and Lascaux (-17000) predate its 4713 BC floor (https://www.postgresql.org/docs/current/datatype-datetime.html).
- **Wikidata precision is lost.** The seed SPARQL keeps only the `wdt:` value. Those are proleptic Gregorian, as `build-timeline.py` in the sacred-history tools, line 141, records, so nothing is reconverted. Precision lives on the `psv:` node (https://www.wikidata.org/wiki/Help:Dates) and was dropped.
- **Untracked inputs.** Both sacred-history inputs sit under `work/`, which `_intake/sacred-history-corpus/.gitignore:6` ignores: `work/wikidata-sacred-events.json` (45 KB) and `work/graph/timeline-events.jsonl` (74 KB, 74 lines). A fresh clone cannot bronze them.
- **Irregular lifespans.** Two composites (`watson-crick`, `hodgkin-huxley`), ten open-ended living entries (`chomsky`, `marino`, `pollack`, `levin`, `wallace-doug`, `lane`, `solis-herrera`, `khavinson`, `schoch`, `carlson-randall`), two single-century floruits (`laozi`, `homer`), and one Old Style pair (`newton`, "25 Dec 1642 OS" and "20 Mar 1727 OS"). `marino` and `pollack` share the text "1939-".
- **Pleiades is outside bronze.** `archaeology/pleiades/` holds 42,076 CC BY 3.0 `place.json` records. Its root is missing from `BRONZE_ROOTS` in `src/lib/research-os/medallion/paths.ts:1` and from the regex in `20260924000000_research_os_medallion.sql:176`, and no test compares the two lists.

## 3. Data Model

A span is an EDTF string (https://www.loc.gov/standards/datetime/) plus nominal years and four astronomical bounds, the year system of `hte.timeline.Interval`. Each factoid states what one source says about one subject; contradicting rows coexist. Event, time-span and place stay separate, after CIDOC-CRM E5/E52/E53 (https://cidoc-crm.org/Entity/e5-event/version-7.1.1).

### 3.1 graph.factoids

| Column | Type | Rule |
|---|---|---|
| id | uuid pk | `gen_random_uuid()` |
| subject_id | uuid not null | FK `graph.nodes`, on delete cascade |
| role | text not null | `born`, `died`, `flourished`, `occurred`, `founded`, `occupied`, `composed`, `published`, `arose` |
| place_id | uuid | FK `graph.places`, on delete restrict |
| period_id | text | FK `graph.periods` |
| edtf | text not null | Supported subset only, see 3.5 |
| start_year, end_year | int4 not null | The stated extent, astronomical |
| start_min, start_max, end_min, end_max | int4 not null | Endpoint bounds. CHECK `start_min<=start_year<=start_max`, `end_min<=end_year<=end_max`, `start_year<=end_year`, `start_min<=end_min`, `start_max<=end_max` |
| span | int4range | Generated, `int4range(start_min, end_max, '[]')` |
| precision | text not null | `day`, `month`, `year`, `decade`, `century`, `millennium`, `ka`, `10ka`, `100ka` |
| calendar | text not null | `gregorian`, `julian`, `julian-os`, `hebrew`, `islamic`, `chinese`, `other` |
| qualifier | text not null | `none`, `approximate`, `uncertain`, `both` |
| as_recorded | text | The source string |
| uncertainty | jsonb not null | `Uncertainty.to_dict()` shape, see 3.6 |
| confidence | real not null | 0 to 1, lowest of its parts |
| source_node_id | uuid | FK to a `primary_source` node |
| locator | text | Page, verse or property id |
| silver_item_id | uuid not null | FK `graph.silver_items`, on delete restrict |
| preferred | boolean not null default false | |
| status | text not null | `active` or `withdrawn` |
| reviewed_by | uuid | FK `auth.users`, on delete set null |

Constraints: unique `(silver_item_id, role)`, so one lifespan string yields its `born` and `died` rows from one silver item. Partial unique `(subject_id, role) where preferred and status = 'active'`, so a withdrawn preferred row never blocks its replacement. Indexes: btree `(subject_id, role)`, GiST `span`, btree `place_id`.

### 3.2 graph.places

| Column | Type | Notes |
|---|---|---|
| id, slug, title | uuid pk, text unique, text | `pleiades-579885`, `bucket-site-eridu` |
| pleiades_id, tgn_id | text unique | CHECK `^[0-9]+$` |
| geonames_id | bigint unique | |
| wikidata_qid | text unique | CHECK `^Q[0-9]+$` |
| lat, lng | double precision not null | Pleiades `reprPoint` is `[lng, lat]`, pinned by a test |
| valid_start, valid_end | int4 | Pleiades location dates |
| site_node_id | uuid unique | FK to the `site` node |
| source_id, source_revision | text not null | FK `graph.evidence_source_admissions` |
| status | text not null | `active` or `withdrawn` |

P4 adds `geom extensions.geography(Point,4326)` generated from lat and lng, with a GiST index, and `region text`.

### 3.3 Periods and Events

- **`graph.periods`**: PeriodO or Pleiades id, `label`, `spatial_qids`, the four bounds, `span`, source FK, `status`.
- **`graph.node_external_ids`**, primary key `(authority, external_id)`: one node per QID.
- **Node kind `event`**, added to `nodes_kind_check` on the pattern of `20260921050000`. `readPrimesInputs` has no kind filter, so P1 adds `.neq("kind", "event")` at `src/lib/research-os/primes-report.ts:209` and `scripts/research-os/primes-report.ts:37`, and `scripts/test-research-os-primes-report.ts` pins `unfactoredByKind` with an event node in its fixture.

### 3.4 Attachment

| Node kind | Roles |
|---|---|
| `figure` | born, died, flourished |
| `site` | founded, occupied, plus `places.site_node_id` |
| `primary_source` | composed, published |
| `fact`, `concept`, `law` | arose |
| `event` | occurred |

Factoids create no factor edges, so PRIMES is untouched. `graph.node_when_where` gives each subject its preferred span and point, or every active span when none is preferred, with a `disputed` flag. `graph.factoid_conflicts` lists `(subject, role)` pairs with disjoint spans or differing places.

### 3.5 Parsing Rules

`src/lib/history/span.ts` is the one parser; Python reads bounds only. The column CHECK admits the emitted subset:

`^(Y-?[1-9][0-9]{4,8}|-?[0-9]{4}(-[0-9]{2}){0,2}|-?[0-9]{2}([0-9]X|XX))[?~%]?(/(Y-?[1-9][0-9]{4,8}|-?[0-9]{4}(-[0-9]{2}){0,2}|-?[0-9]{2}([0-9]X|XX))[?~%]?)?$`

Level 0 dates, level 1 qualifiers, `X` in the last two year digits with no month or day, `Y` years of 5 to 9 digits (inside int4), closed intervals. Open or unknown ends stay in silver.

- **Years.** Historical to astronomical: 570 BCE becomes -569, Lascaux 17000 BCE becomes `Y-16999`. A `c.` prefix on a year widens that endpoint by 10 years each way.
- **Centuries.** EDTF `05XX` means 500 to 599. An ordinal century is emitted as a closed interval: "6th century" CE is `0501/0600`; "6th century BCE" (600 to 501 BCE) is `-0599/-0500`. `X` forms are read with their EDTF meaning and never produced from ordinals.
- **Julian dates.** D(Y) = floor(Y/100) - floor(Y/400) - 2 days, Y the astronomical Julian year, Y-1 in January and February. D is 10 in 1500, 13 from 1900 to 2099, and -42 near -5399. A source marked Julian converts exactly: Gregorian = Julian + D. When the calendar is unknown and the date is day precision before 1923, the year bounds widen by one on the side the shift points, if the date lies within |D| days of 1 January.
- **Old Style.** In English OS contexts before 1752 the year began on 25 March. A date between 1 January and 24 March marked OS, without a dual year such as "1726/27", widens to both candidate years. A dual year resolves exactly. When an exact conversion crosses 1 January, the bounds keep the source's own year label as well. Calendar is `julian-os`.
- **Figures.** The parse target excludes the 2 composites. The 10 living entries yield `born` only. `laozi` and `homer` yield `flourished`. Spans are found by searching forward from the subject's `"id"` key, since equal strings occur.

Golden cases, at least 70, in `scripts/fixtures/history-span-golden.json`:

| Input | Expect |
|---|---|
| `2020-13-45` | rejected: impossible month and day |
| `-570` historical | `-0569`, bounds -569 |
| `c.325-c.265 BCE` | born `-0324~` (-334..-314), died `-0264~` (-274..-254) |
| `6th century` | `0501/0600` |
| `6th century BCE` | `-0599/-0500` |
| `05XX` | 500..599 |
| Julian `1582-10-04` | Gregorian `1582-10-14`, D=10 |
| Julian `1900-12-25` | Gregorian `1901-01-07`, D=13, year 1901 |
| Julian `-5399-01-01` | D=-42, year -5400 |
| `25 Dec 1642 OS` | Gregorian `1643-01-04`, start 1642..1643, `julian-os` |
| `20 Mar 1727 OS` | Gregorian `1727-03-31`, end 1727..1728 |
| `20 Mar 1726/27` | Gregorian `1727-03-31`, end 1727..1727 |
| `1939-` | born 1939 only |
| `Watson 1928-, Crick 1916-2004` | refused, composite |

### 3.6 Mapping to the Engine

| Graph | hte |
|---|---|
| A factoid | `Interval(start_year, end_year, u)`. The extent lives in the Interval. |
| Endpoint bounds | `u = Uncertainty(UNIFORM, {"min": start_min, "max": end_max, "endpoints": {"start": [start_min, start_max], "end": [end_min, end_max]}})`, or `Uncertainty.point()` when both pairs collapse. `min` and `max` match `Uncertainty.uniform`. `from_dict` copies params verbatim (`timeline.py` on hte/integration, line 176,); no hte code reads them yet. |
| `graph.periods` | `Period(id, NodeLevel.PERIOD, interval, label, region=spatial_qids, disputed)` |
| precision | `Resolution`: day, month, year to YEAR; decade, century, millennium to their own; `ka` to MILLENNIUM; `10ka` (Wikidata 5) and `100ka` (Wikidata 4) to ERA |
| Conflicts | `combine_date_observations` at query time, never stored |

## 4. Storage Decisions

| Decision | Reason |
|---|---|
| int4 astronomical years | Eridu and Lascaux predate `date`. hte's `DEFAULT_SPAN_START` is -20000. |
| Generated `int4range` plus GiST | The window query is `span && int4range($from,$to,'[]')` (https://www.postgresql.org/docs/current/rangetypes.html) |
| PostGIS in P4 | `supabase/postgres:17.6.1.167` offers postgis 3.3.7, uninstalled; CI runs the same stack (the CI workflow (site-ci, line 102)). Only region assignment needs it. |
| `graph` schema | `20260916010000_service_role_grants.sql` default privileges cover new tables. |
| RLS on, revoked from anon and authenticated, no authenticated policy | `authenticated` holds no USAGE on schema `graph` (`20260922020000_research_os_import_files.sql:86-87`). Reads run as service role, filtered through `authorizeNodes` (`src/lib/research-os/read-access.ts:113`); route tests prove a private subject's factoids never appear. |
| Writes via `graph.promote_history_factoid(p_silver, p_reviewer, p_preferred)` | Security definer, service_role only, behind the `RESEARCH_OS_REVIEWER_EMAILS` check. Locks the silver row and the `(subject, role)` set; idempotent on `(silver_item_id, role)`. |

**Bronze.** Snapshots go under `_intake/history/<source>/<yyyy-mm-dd>/`. `archaeology/` joins `BRONZE_ROOTS` and the SQL regex in one migration, and a new case in `scripts/test-research-os-medallion.ts` parses the regex from the migration and asserts equality with the TS list. `learning/research-os/ai/rights-policy.json` gains rules in its existing shape (`id`, one-key `match`, `allow`, `permission`, `basis`, `evidence`, `rightsRevision`); `canon-site` and `canon-figure` exist. P1 adds `canon-timeline`, `match: {"seedFile": "src/data/canon-timeline.json"}`, project-authored. P2 adds `wikidata-cc0`, `match: {"seedFile": "_intake/history/wikidata-sacred/<date>/timeline-events.jsonl"}`, CC0. `seedSlugs` (`scripts/research-os/medallion/lib/repo-io.ts:35`) throws on a file without `nodes`, so P1 extends it to read `events[].id` and JSONL `id`. Unnamed types are refused.

**Silver.** `kind = 'claim'`, `subject` = the node slug, `proposal` holds `roles` and the parsed fields. Spans are UTF-8 byte offsets, the unit of `silverItem` and `verifySilver`, covering the JSON value string without quotes, located after the subject's record key. The unique key `(source_id, source_revision, parser, parser_revision, kind, span_start, span_end, subject)` from `20260924010000` then separates `marino` and `pollack`.

**Gold.** `gold_lineage` gains `factoid_id` with `num_nonnulls(node_id, edge_id, factoid_id) = 1` and a unique index on `(factoid_id, silver_item_id) where factoid_id is not null`. `gold_lineage_rules` gains a factoid branch. `history-import` joins the importer list, allowed only for silver whose rule is `canon-site`, `canon-figure` or `canon-timeline`.

**Withdrawal.** `medallion_withdrawal_cascade` gains three updates: factoids whose silver it withdrew, and places and periods whose `source_id` and `source_revision` match, go to `withdrawn`. A factoid with a withdrawn place keeps its time and loses its point. `restore_withdrawn_node` revives factoids of `p_node` whose silver it revives. A new `graph.restore_withdrawn_history(p_source, p_reviewer)` revives factoids, places and periods of a re-activated source whose subject node was never queued.

**Migration order**, after `20260924080000`: `_history_places_periods`, `_history_factoids`, `_history_views`; P4 adds `_history_postgis`.

## 5. Gap Analysis Method

- **Unit.** One subject counts once. Its anchor is the preferred factoid of one role per kind: figure `born`, matching the P569 reference; site `occupied`, else `founded`; event `occurred`. The subject lands in the bin holding its anchor midpoint. Anchors wider than their bin are "unresolved". Unresolved and unplaced subjects leave both B_k and W_k, and the report prints their counts.
- **Regions.** 7 from UN M49 (https://unstats.un.org/unsd/methodology/m49/): Europe; Northern America; Latin America and Caribbean; Western Asia and Northern Africa; Sub-Saharan Africa; Central and Southern Asia; Eastern and South-eastern Asia with Oceania. `ST_Covers` against Natural Earth 1:50m admin-0 polygons, mapped by `SUBREGION`. A point in no polygon takes the nearest one within 50 km (`ST_DWithin`); farther points are "unplaced". Natural Earth is public domain (https://www.naturalearthdata.com/about/terms-of-use/); its zip is bronzed at `_intake/history/natural-earth/<date>/` under rule `natural-earth`.
- **Periods.** 6 bins: before -3000, -3000 to -1001, -1000 to -1, 0 to 999, 1000 to 1499, 1500 to 2100. 42 cells in all. P4 opens with about 170 subjects in these kinds, a mean E near 4, so about a third of cells pass the gate; doubling the cells would halve that. The grid stays fixed across P5.
- **Reference, by kind, from Wikidata (CC0).** Humans: P31 Q5 with P569 and P19, counted in one aggregate query grouped by birth year and the birthplace's P17 country, counting distinct people (COUNT(DISTINCT ?p)) and keeping one country per person, the first P17 value by rank, run on QLever (https://qlever.dev/api/wikidata; engine Apache 2.0, https://github.com/ad-freiburg/qlever). `src/lib/history/regions.ts` maps country QIDs to regions; unmapped countries count as unplaced. On 2026-09-23 the 1950 slice alone returned HTTP 504 from WDQS after 65 s, while QLever answered the full 1500 to 2025 aggregate in 3.1 s (70,189 rows, 4.35 million people). Sites (P31/P279* Q839954 with P625 and a P571, P580 or P1319 date) and events (P585 or P580, with P625) are small and run per century on WDQS. Queries are bronzed with their text.
- **Expected count.** E(r,p) = Σ_k B_k · w_k(r,p) / W_k over the three kinds, where B_k is Bucket's total and W_k the reference total. A cell is printed only when E ≥ 5.
- **Coverage.** C = b / E, with the exact Poisson 95% interval on b (Garwood, chi-square bounds) divided by E. A gap is a cell whose upper bound on C is below 0.5. With b = 0 that requires E above 7.4.
- **Eurocentrism index.** EI(p) = b / E summed over Europe and Northern America, with its interval. One line per period. It measures skew relative to Wikidata's record. A population-baseline line waits for an approved HYDE rights rule; its license page (public.yoda.uu.nl) was unreachable on 2026-09-23.
- **Other measures.** Precision share per region, sources per cell, conflict rate, and the unplaced count.
- **Output.** `scripts/research-os/history/gap-report.ts` reads materialized view `graph.history_coverage`, refreshed after each import.

## 6. Filling Plan

Licenses checked 2026-09-23.

| Rank | Source | License | Fills | Promotion |
|---|---|---|---|---|
| 1 | Wikidata figure and event properties, precision from `psv:` nodes | CC0 | Figure dates and places, events | Reviewer |
| 2 | Pleiades (https://pleiades.stoa.org/) | CC BY 3.0, per record | Ancient places | Places load as authority data. Place-to-site matches go to review. |
| 3 | PeriodO | CC0 (https://perio.do/license/) | Named periods | Load |
| 4 | GeoNames | CC BY 4.0 (https://www.geonames.org/about.html) | Modern birthplaces | Rows in use only |
| 5 | Getty TGN | ODC-By 1.0 (http://vocab.getty.edu/) | Hierarchy where GeoNames misses | Reviewer |

**Flagged and excluded.**

- **World Historical Gazetteer.** The aggregate database is CC BY-NC 4.0 in addition to each dataset's license (https://whgazetteer.org/licenses/).
- **ctext.** `spec/rights.json` sets `no_bulk_redistribution: true`.
- **Quranic Arabic Corpus.** Marked `"gpl"`, which a CC BY export cannot carry.
- **Sefaria NC items**, **Seshat** and **CHGIS**: NC or unverified terms.
- **OpenHistoricalMap boundaries**: deferred.

**Dedup.** Subjects match by QID; the figures lack QIDs, so name and lifespan candidates go to review. Places merge on a shared authority id (P1584 links QID to Pleiades); near-duplicates within 5 km go to review. Disjoint spans stay as conflicts. Confidence is the lowest of source prior (project 0.9, Wikidata 0.8, free text 0.6), match score and parse score.

## 7. Reconciling the Existing Systems

| Existing | Moves to | Afterwards |
|---|---|---|
| `canon-sites.json` (47) | Places plus `founded` factoids, auto-promoted | Stays authored input |
| `canon-timeline.json` (58 births, 54 works, 2 events) | `born`, `composed`, `occurred` factoids | Founder question 7 |
| `figures.json` (99) | 97 parse targets as in 3.5 | Unparsed rows stay in hidden silver |
| Sacred-history (106 raw, 21 published) | P2 commits both inputs to `_intake/history/wikidata-sacred/<date>/` (119 KB, CC0 plus project fields, rule `wikidata-cc0`), then bronzes them. P5 refetches with `psv:` precision. The snapshot is a bounded query over 4 event classes with P585; the 21 published anchors come from the curated `_intake/sacred-history-corpus/tools/timeline-anchor-events.json` and share no QID with it. | Drift tests pin the snapshot population to its raw bindings, and the published set to the anchor file and to gold |
| `archaeology/pleiades/` | Bronze, rows load on first reference | Founder question 5 |
| hte | `hte/corpus/history_graph.py` reads the export | `timeline.py` unchanged |

`/canon` reads `GET /api/research-os/history/markers?mode=cumulative&to=` or `?mode=window&from=&to=`. `mode` defaults to `cumulative`, which returns every active marker with `start_year <= to`, the behavior of `CanonGlobeMount.tsx:264-265` (`e.year <= year`). `window` returns `span && [from, to]`. `from` and `to` are astronomical years; the slider shows historical years and converts before calling. Parity with today holds for cumulative. On API failure the page falls back to `src/data/history-markers.json`, written by `scripts/research-os/history/export.ts`, which hte also reads.

**Golden file sequencing.** The fixture is `scripts/fixtures/history-span-golden.json`, a site path. First the P1 span PR lands it on dev with `span.ts` and `scripts/test-history-span.ts`. Then a `fix/hte-sync-dev-<date>` PR merges `origin/dev` into `hte/integration`, following #181; the engine branch is 124 commits behind dev today. Then `feat/hte-history-span` targets `hte/integration` with `hte/history_span.py` and a test that reads the fixture by repo-relative path and fails when it is absent. The batch PR brings the engine side to dev.

## 8. Phases

| Phase | PRs | Depends on | Tests | Rollback | Screens | Launch |
|---|---|---|---|---|---|---|
| P1 | 4: migrations, paths, primes filter, `canon-timeline` rule; span library and golden file; `fix/hte-sync-dev-<date>`; `feat/hte-history-span` | none; sync after the span PR, engine PR after the sync | `supabase/tests/research_os_history.sql`: bounds, -5400, preferred with a withdrawn row, `(silver_item_id, role)`, importer refusing Wikidata, anon refused, withdraw and restore of factoids, places, periods. `scripts/test-research-os-history-db.ts` in the `db` suite; paths parity; primes pin; golden in both languages | Revert, then a drop migration | none | Per Q1 |
| P2 | 2: canon importer with sacred snapshot and `wikidata-cc0` rule; sacred-history silver plus review list | P1 | Idempotent rerun, OS cases, drift test | `withdraw.ts --apply` per source | `/research-os/review` | Per Q1 |
| P3 | 2: API, export and `/canon` modes; node page section in `n/NodeView.tsx` | P2 | Route access; `tests/e2e/history-globe.spec.ts`: cumulative at 2020 returns 161 ids; cumulative at -500 shows Giza and hides Palenque; window -2600 to -2500 shows Giza and hides Pythagoras; direct link reloads; API down shows snapshot | `HISTORY_MARKERS_SOURCE=static` | `/canon`, `/research-os/n/[slug]` | Per Q1 |
| P4 | 2: PostGIS, Natural Earth, regions, reference; coverage view and report | P2 | Binning, E, Garwood bounds, EI on a hand-computed fixture; a coastal point; the human reference run records the row count and runtime of its largest slice and fails above 30 s | Drop the view | CLI | Post-launch |
| P5 | 3: Wikidata; Pleiades and PeriodO; GeoNames | P4 | Every history source has an approved rule | Withdrawal runner | `/research-os/review` | Post-launch |

## 9. Founder Questions and Risks

1. **Launch list.** Are the `/canon` history modes and "When and where" launch screens? If not, all phases carry `post-launch`.
2. **Review capacity.** Should CC0 Wikidata factoids at confidence 0.75 or above with no conflict auto-promote, or wait in a batch queue?
3. **Truth tiers.** A date conflict moves no `footing`. Should a paid citation record the preferred span at purchase (FD-11)?
4. **Rights.** Do you accept the exclusions in section 6 and the Pleiades CC BY attribution on the globe and in feed402 exports?
5. **Pleiades mirror.** Keep 84,152 tracked files as bronze, or replace them with one dated dump?
6. **Contested sites.** `gunung-padang` and `yonaguni-monument` carry -10000. Plot them as dated sites, draw them with a `disputed` band, or hide them from the history modes until a second source agrees?
7. **canon-timeline.json.** Delete it after the P3 parity test, or keep it as authored input like `canon-sites.json`?

Risks: public SPARQL limits (QLever aggregate, timed in P4, with per-year WDQS slices after 1800 as fallback), a PostGIS version change (a P4 test asserts it), label regressions (golden file), and sparse cells (the E gate).

## 10. Budget

13 PRs, at most 3 build agents at once: P1 runs 2 site agents, then the sync and 1 engine agent; P2 and P3 run in sequence; P4 and P5 in parallel. About 16 build sessions at up to 400k tokens each, and up to 3 critic rounds per PR at up to 150k each, a ceiling near 12.3M tokens (16 x 400k plus 13 x 3 x 150k). Critics inherit the parent model (`docs/agents/BUCKET-CRITIC.md:63`).

Critical files, on `origin/dev`: `supabase/migrations/20260924000000_research_os_medallion.sql`, `20260924010000_research_os_medallion_proposals.sql`, `20260924030000_research_os_medallion_restore.sql`, `src/lib/research-os/medallion/paths.ts`, `src/lib/research-os/medallion/silver.ts`, `src/lib/research-os/primes-report.ts`, `src/lib/research-os/read-access.ts`, `src/app/canon/CanonGlobeMount.tsx`. On `origin/hte/integration`: `tools/hypothesis-engine/hte/timeline.py`.

## Round 2 Changes

| Finding | Fixed in |
|---|---|
| H1 | 3.1 constraints, 4 Silver and Gold |
| M1 | 3.5 |
| M2 | 3.1 bounds and precision, 3.6 |
| M3 | 4 RLS row |
| M4 | 3.1 to 3.3, 4 |
| M5 | 5 |
| M6 | 7 Golden file sequencing, 8 P1 |
| M7 | 2 Untracked inputs, 7 sacred row |
| M8 | 7, 8 P3 |
| L1 | 3.3 |
| L2 | 2 Wikidata precision |
| L3 | 5 EI, figure cut |
| L4 | 3.2, 4 order, 5 Regions |
| L5 | 2, 3.5 Figures, 1 |
| L6 | 4 Bronze |
| L7 | 10 |
| L8 | 3.5 regex |
| Founder 6, 7 | 9 |
| Licensing | 6 |
| Paths | 10 |
| M9 | 5 Reference, 8 P4, 9 Risks |
| N1 | 3.5 regex |
| N2 | 4 Bronze, 8 P1 and P2 |
| N3 | 5 Unit |
| N4 | 7 Golden file sequencing, 8 P1, 10 |
| N5 | 3.6 |
| N6 | 3.3, 7 |
