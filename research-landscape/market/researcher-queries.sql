-- researcher-queries.sql
-- Every query run for the researcher data brief, 2026-10-11. Result on the line after each query, prefixed "-- =>".
-- Engine: DuckDB 1.5.4 through Python, source files opened read_only=True. Postgres through psql with
-- default_transaction_read_only=on and a statement timeout. No repo, database or data file was changed.
-- Scratch database: a temporary DuckDB file outside every repo holds derived id tables (wide, ids, ent, person1, granted, career).
--   wide    = one row per parquet row of .wt-atlas-openalex-wide/data/processed/openalex_authors_wide (ids, field, dated affiliation count)
--   ids/ent = union of ORCID and OpenAlex author ids from ten tables; ekey = ORCID when any table gives one, else OpenAlex author id
-- Queries whose label says "scratch" read those tables. Label format: [label] database path.

-- [atlas-person] research_atlas.duckdb
select count(*) n, count(orcid) orcid, count(openalex_author_id) oa, count(*) filter (where orcid is null and openalex_author_id is null) name_only, count(distinct orcid) d_orcid, count(distinct openalex_author_id) d_oa, count(distinct atlas_id) d_id from person;
-- => [[1438636, 804248, 1100975, 330813, 804248, 1097483, 1438636]]

-- [atlas-person] research_atlas.duckdb
select source, count(*), count(orcid), count(openalex_author_id) from person group by 1 order by 2 desc;
-- => [["openalex", 1162944, 804248, 1100975], ["nih", 161081, 0, 0], ["nsf", 85029, 0, 0], ["wellcome", 22556, 0, 0], ["dfg", 4779, 0, 0], ["sloan", 2247, 0, 0]]

-- [atlas-person] research_atlas.duckdb
select min(as_of), max(as_of) from person;
-- => [["2026-06-19T03:34:29Z", "2026-06-21T17:54:08Z"]]

-- [atlas-person] research_atlas.duckdb
select count(*) n, count(orcid) orcid, count(openalex_author_id) oa, count(distinct orcid), count(distinct openalex_author_id), count(distinct atlas_id), count(*) filter (where orcid is null and openalex_author_id is null) from researchers_public;
-- => [[1165557, 805931, 1106176, 805931, 1102643, 1165557, 55443]]

-- [atlas-person] research_atlas.duckdb
select count(*) filter (where primary_field is null), count(*) filter (where country_code is null), count(*) filter (where primary_org_ror is null), count(*) filter (where first_year is null), count(*) filter (where full_name is null or full_name='') from researchers_public;
-- => [[0, 57830, 54780, 0, 0]]

-- [atlas-person] research_atlas.duckdb
select primary_domain, count(*) from researchers_public group by 1 order by 2 desc;
-- => [["Physical Sciences", 422893], ["Life Sciences", 350420], ["Health Sciences", 347599], ["Social Sciences", 44645]]

-- [atlas-person] research_atlas.duckdb
select primary_field, count(*) from researchers_public group by 1 order by 2 desc;
-- => [["Medicine", 296340], ["Biochemistry, Genetics and Molecular Biology", 242219], ["Physics and Astronomy", 108466], ["Engineering", 93027], ["Environmental Science", 73527], ["Neuroscience", 47996], ["Agricultural and Biological Sciences", 44709], ["Materials Science", 44536], ["Computer Science", 41104], ["Immunology and Microbiology", 41069], ["Earth and Planetary Sciences", 33270], ["Psychology", 17813], ["Chemistry", 17234], ["Social Sciences", 16339], ["Energy", 10043], ["Health Professions", 8327], ["Mathematics", 5198], ["Decision Sciences", 3895], ["Nursing", 3894], ["Economics, Econometrics and Finance", 3630], ["Chemical Engineering", 3297], ["Business, Management and Accounting", 3121], ["Pharmacology, Toxicology and Pharmaceutics", 2831], ["Dentistry", 1626], ["Arts and Humanities", 1373], ["Veterinary", 673]]

-- [atlas-person] research_atlas.duckdb
select field_slug, count(*) from researchers_public group by 1 order by 2 desc;
-- => [["biomed-bio", 689684], ["earth-climate", 116840], ["physics-astro", 108466], ["engineering", 93027], ["cs-ml", 44999], ["materials", 44536], ["econ-social", 42276], ["chemistry", 20531], ["math", 5198]]

-- [atlas-person] research_atlas.duckdb
select country_code, count(*) from researchers_public group by 1 order by 2 desc limit 40;
-- => [["US", 524645], ["GB", 68326], ["DE", 62523], [null, 57830], ["CN", 54564], ["IT", 42788], ["FR", 40602], ["ES", 38367], ["NL", 26933], ["CH", 20594], ["CA", 19636], ["AU", 15738], ["BE", 13460], ["JP", 13250], ["SE", 12998], ["DK", 10642], ["BR", 8482], ["AT", 8453], ["FI", 7095], ["KR", 7008], ["PT", 6981], ["PL", 6519], ["IL", 6162], ["GR", 6001], ["NO", 5832], ["IN", 5535], ["CZ", 5151], ["IE", 4327], ["RU", 4162], ["ZA", 3645], ["HU", 3630], ["SG", 3387], ["TW", 2438], ["CL", 2302], ["AR", 2299], ["TR", 2296], ["MX", 2282], ["HK", 2146], ["NZ", 1835], ["IR", 1782]]

-- [atlas-person] research_atlas.duckdb
select count(distinct country_code), count(*) filter (where c<100), count(*) filter (where c<10) from (select country_code, count(*) c from researchers_public where country_code is not null group by 1) t, (select 1) x;
-- => [[216, 110, 40]]

-- [atlas-person] research_atlas.duckdb
select seniority, count(*) from researchers_public group by 1 order by 2 desc;
-- => [["rising-star", 795084], ["early/unknown", 294075], ["established", 52638], ["eminent", 23760]]

-- [atlas-person] research_atlas.duckdb
select activity_tier, count(*) from researchers_public group by 1 order by 2 desc;
-- => [["dormant", 760682], ["active", 320879], ["active-pi", 83996]]

-- [atlas-person] research_atlas.duckdb
select min(first_year), max(last_year), median(works_count), avg(works_count), count(*) filter (where works_count=1) from researchers_public;
-- => [[2013, 2026, 1.0, 2.4125400988540244, 711006]]

-- [atlas-person] research_atlas.duckdb
select source, count(*), min(as_of), max(as_of) from researchers_public group by 1;
-- => [["atlas-users", 1165557, "2026-06-22T00:03:07Z", "2026-06-22T00:03:07Z"]]

-- [atlas-person] research_atlas.duckdb
select count(*), count(email), count(*) filter (where contactable), count(*) filter (where opt_out) from researchers;
-- => [[1165557, 750, 750, 0]]

-- [atlas-person] research_atlas.duckdb
select email_source, email_method, count(*) from researchers where email is not null group by 1,2;
-- => [["orcid", "orcid-public", 211], ["crossref", "crossref-author-metadata", 1], ["europepmc", "corresponding-author-metadata", 522], ["labpage", "public-homepage", 16]]

-- [atlas-person] research_atlas.duckdb
select engagement_status, count(*) from researchers group by 1;
-- => [["not-contacted", 1165557]]

-- [atlas-person] research_atlas.duckdb
select count(*) from (select orcid from researchers_public where orcid is not null group by 1 having count(*)>1);
-- => [[0]]

-- [atlas-person] research_atlas.duckdb
select count(*) from (select lower(full_name) from researchers_public group by 1 having count(*)>1);
-- => [[67044]]

-- [atlas-grants] research_atlas.duckdb
select count(*) from researchers_public r join person p using(atlas_id);
-- => [[1162944]]

-- [atlas-grants] research_atlas.duckdb
select count(*) from researchers_public r where orcid is not null and orcid in (select orcid from person);
-- => [[804248]]

-- [atlas-grants] research_atlas.duckdb
select role, source, count(*), count(distinct dst_id) from grant_person group by 1,2 order by 3 desc;
-- => [["pi", "nih", 1267009, 150206], ["co-pi", "nih", 231096, 40288], ["pi", "nsf", 201354, 85029], ["pi", "wellcome", 26050, 17571], ["co-pi", "wellcome", 6087, 5794], ["co-pi", "dfg", 4514, 4171], ["pi", "sloan", 3411, 2247], ["pi", "dfg", 805, 721]]

-- [atlas-grants] research_atlas.duckdb
select count(distinct gp.dst_id) n_people, count(distinct gp.dst_id) filter (where p.orcid is not null or p.openalex_author_id is not null) with_id from grant_person gp join person p on p.atlas_id=gp.dst_id;
-- => [[275692, 0]]

-- [atlas-grants] research_atlas.duckdb
select count(*), count(distinct grant_id), count(distinct pi_person_id), count(person_atlas_id), count(distinct person_atlas_id), count(orcid), count(distinct orcid) from grant_pi_person;
-- => [[528570, 459002, 64586, 528570, 59180, 490839, 53203]]

-- [atlas-grants] research_atlas.duckdb
select match_method, count(*), round(avg(match_score),3), count(person_atlas_id) from grant_pi_person group by 1 order by 2 desc;
-- => [["name+org", 478612, 0.9, 478612], ["name+org+field", 49958, 0.97, 49958]]

-- [atlas-grants] research_atlas.duckdb
select source, count(*), count(distinct person_atlas_id) from grant_pi_person group by 1 order by 2 desc;
-- => [["nih", 468148, 38962], ["nsf", 54366, 20518], ["wellcome", 5142, 2901], ["sloan", 527, 368], ["dfg", 387, 348]]

-- [atlas-grants] research_atlas.duckdb
select field_slug, count(*), count(distinct person_atlas_id) from grant_pi_person group by 1 order by 2 desc;
-- => [[null, 478612, 55527], ["biomed-bio", 34898, 17921], ["earth-climate", 4507, 2653], ["engineering", 2951, 1862], ["cs-ml", 2443, 1411], ["physics-astro", 1705, 1036], ["econ-social", 1277, 999], ["materials", 1161, 742], ["chemistry", 727, 465], ["math", 289, 220]]

-- [atlas-grants] research_atlas.duckdb
select min(as_of), max(as_of) from grant_pi_person;
-- => [["2026-06-24T20:17:39Z", "2026-06-24T20:17:39Z"]]

-- [atlas-grants] research_atlas.duckdb
select count(distinct g.person_atlas_id) from grant_pi_person g join researchers_public r on r.atlas_id=g.person_atlas_id;
-- => [[59180]]

-- [atlas-grants] research_atlas.duckdb
select count(distinct g.person_atlas_id) from grant_pi_person g join researchers_public r on r.atlas_id=g.person_atlas_id where r.orcid is not null or r.openalex_author_id is not null;
-- => [[58536]]

-- [atlas-grants] research_atlas.duckdb
select count(distinct g.person_atlas_id) from grant_pi_person g join person r on r.atlas_id=g.person_atlas_id where r.orcid is not null or r.openalex_author_id is not null;
-- => [[58526]]

-- [atlas-grants] research_atlas.duckdb
select source, count(*), min(substr(start_date,1,4)), max(substr(start_date,1,4)), count(*) filter (where amount_usd is null), count(*) filter (where abstract is null) from "grant" group by 1 order by 2 desc;
-- => [["nih", 1125130, "1965", "2026", 2147, 1125130], ["nsf", 201676, "1995", "2026", 6, 1690], ["ukri", 174405, null, null, 134896, 0], ["cordis", 92463, "2002", "the ", 388, 0], ["gates", 40814, "1994", "2026", 1, 40814], ["wellcome", 26050, "1995", "2027", 2278, 0], ["czi", 5503, "2018", "2024", 1, 5503], ["sloan", 3419, "2008", "2026", 0, 3419], ["dfg", 974, "1982", "2007", 974, 974]]

-- [atlas-grants] research_atlas.duckdb
select role, source, count(*), count(distinct src_id), count(distinct dst_id) from person_org group by 1,2;
-- => [["affiliation", "dfg", 4608, 4491, 79], ["affiliation", "nih", 221276, 160536, 10565], ["affiliation", "sloan", 2365, 2247, 913], ["affiliation", "nsf", 97737, 85029, 12908], ["affiliation", "openalex", 2097690, 1108467, 37233], ["affiliation", "wellcome", 24098, 22556, 2332]]

-- [atlas-grants] research_atlas.duckdb
select short_name, country_code, funder_type from funder order by 1 limit 80;
-- => [["AHRC", "GB", "government"], ["APC", "GB", "government"], ["ATI", "GB", "government"], ["Ayrton Fund", "GB", "government"], ["BBSRC", "GB", "government"], ["BEIS", "GB", "government"], ["CCAV", "GB", "government"], ["CIT", "US", "government"], ["CLC", "US", "government"], ["COVID", "GB", "government"], ["CZI", "US", "private"], ["DBT", "GB", "government"], ["DEFRA", "GB", "government"], ["DFG", "DE", "government"], ["DRI", "GB", "government"], ["DSIT", "GB", "government"], ["EC", null, "supranational"], ["EPSRC", "GB", "government"], ["ERC", null, "supranational"], ["ESRC", "GB", "government"], ["EU", "GB", "government"], ["FIC", "US", "government"], ["FIC", "GB", "government"], ["GCRF", "GB", "government"], ["Gates Foundation", "US", "nonprofit"], ["Horizon Europe Guarantee", "GB", "government"], ["ISCF", "GB", "government"], ["ISPF", "GB", "government"], ["Infrastructure Fund", "GB", "government"], ["Innovate UK", "GB", "government"], ["MRC", "GB", "government"], ["NC3Rs", "GB", "government"], ["NCATS", "US", "government"], ["NCCIH", "US", "government"], ["NCI", "US", "government"], ["NCRR", "US", "government"], ["NEI", "US", "government"], ["NERC", "GB", "government"], ["NHGRI", "US", "government"], ["NHLBI", "US", "government"], ["NIA", "US", "government"], ["NIAAA", "US", "government"], ["NIAID", "US", "government"], ["NIAMS", "US", "government"], ["NIBIB", "US", "government"], ["NICHD", "US", "government"], ["NIDA", "US", "government"], ["NIDCD", "US", "government"], ["NIDCR", "US", "government"], ["NIDDK", "US", "government"], ["NIEHS", "US", "government"], ["NIGMS", "US", "government"], ["NIH", "US", "government"], ["NIMH", "US", "government"], ["NIMHD", "US", "government"], ["NINDS", "US", "government"], ["NINR", "US", "government"], ["NLM", "US", "government"], ["NSF", "US", "government"], ["Newton Fund", "GB", "government"], ["OD", "US", "government"], ["Open Access Block Grant", "GB", "government"], ["Other NPIF", "GB", "government"], ["SPF", "GB", "government"], ["STFC", "GB", "government"], ["SiPF", "GB", "government"], ["Sloan Foundation", "US", "nonprofit"], ["TMF", "GB", "government"], ["UKRI", "GB", "government"], ["UKRI", "GB", "government"], ["UKRI CRCRM", "GB", "government"], ["UKRI FLF", "GB", "government"], ["UKRI Inn.Scholar", "GB", "government"], ["UUI", "GB", "government"], ["Wellcome", "GB", "nonprofit"]]

-- [atlas-grants] research_atlas.duckdb
select level, count(*) from field group by 1;
-- => [["subfield", 242], ["domain", 4], ["field", 3214], ["topic", 3322]]

-- [atlas-grants] research_atlas.duckdb
select count(*), count(doi), min(publication_year), max(publication_year) from work;
-- => [[278839, 278400, 2013, 2026]]

-- [atlas-grants] research_atlas.duckdb
select role, count(*) from grant_work group by 1;
-- => [["acknowledges", 470269]]

-- [atlas-affil] research-atlas/research_atlas.duckdb
select count(*) filter (where n>=2), count(*) from (select src_id, count(distinct dst_id) n from person_org group by 1);
-- => [[540753, 1383326]]

-- [atlas-affil] research-atlas/research_atlas.duckdb
select count(*) filter (where source_id is not null), count(distinct source_id) from person where source='nih';
-- => [[161081, 161081]]

-- [atlas-affil] research-atlas/research_atlas.duckdb
select count(*) from information_schema.columns where table_name='person_org' and column_name like '%date%';
-- => [[0]]

-- [faculty-haul] :memory:
create view r as select * from read_json_auto('research-atlas/data/raw/contacts/official/*/records.jsonl', union_by_name=true, format='newline_delimited');
-- => []

-- [faculty-haul] :memory:
select count(*), count(distinct ror_id), count(email), count(distinct profile_url), count(distinct lower(name)||ror_id), count(*) filter (where name is null or name=''), count(*) filter (where len(research_areas)=0), count(*) filter (where len(departments)=0), count(*) filter (where title is null or title='') from r;
-- => [[65214, 92, 35921, 64610, 52263, 0, 0, 54604, 56953]]

-- [faculty-haul] :memory:
select match_tier, count(*) from r group by 1 order by 2 desc;
-- => [[null, 65214]]

-- [faculty-haul] :memory:
select licence, count(*) from r group by 1 order by 2 desc;
-- => [["institution-copyright", 65214]]

-- [faculty-haul] :memory:
select storage, source, source_kind, count(*) from r group by 1,2,3 order by 4 desc;
-- => [["link_only", "official_directory", "profile", 64592], ["link_only", "official_directory", "listing", 622]]

-- [faculty-haul] :memory:
select min(as_of), max(as_of), min(fetched_at), max(fetched_at) from r;
-- => [["2026-09-30 03:36:10", "2026-10-01 12:00:35", "2026-09-30 03:36:10", "2026-10-01 12:00:35"]]

-- [faculty-haul] :memory:
select typeof(match_candidates), count(*) filter (where len(match_candidates)>0) from r group by 1;
-- => [["JSON", 0]]

-- [faculty-haul] :memory:
select retrieved_by, count(*) from r group by 1 order by 2 desc limit 5;
-- => [["cms/0.3", 64564], ["stevens/0.3", 650]]

-- [faculty-haul] :memory:
create view e as select * from read_json_auto('research-atlas/data/raw/contacts/official/*/extracted.jsonl', union_by_name=true, format='newline_delimited');
-- => []

-- [faculty-haul] :memory:
select count(*), count(orcid), count(email), count(distinct ror_id) from e;
-- => [[2263, 0, 1783, 5]]

-- [faculty-haul] :memory:
select count(*) n, sum(c) from (select ror_id, count(*) c from r group by 1 having count(*)<20);
-- => [[35, 161]]

-- [openalex-authors-wide] :memory:
create view w as select * from read_parquet('.wt-atlas-openalex-wide/data/processed/openalex_authors_wide/*/*.parquet', hive_partitioning=true, union_by_name=true);
-- => []

-- [openalex-authors-wide] :memory:
describe w;
-- => [["id", "VARCHAR", "YES", null, null, null], ["display_name", "VARCHAR", "YES", null, null, null], ["display_name_alternatives", "VARCHAR[]", "YES", null, null, null], ["orcid", "VARCHAR", "YES", null, null, null], ["works_count", "BIGINT", "YES", null, null, null], ["cited_by_count", "BIGINT", "YES", null, null, null], ["h_index", "BIGINT", "YES", null, null, null], ["i10_index", "BIGINT", "YES", null, null, null], ["last_known_institutions", "STRUCT(ror VARCHAR, display_name VARCHAR, country_code VARCHAR, \"type\" VARCHAR)[]", "YES", null, null, null], ["affiliations", "STRUCT(ror VARCHAR, \"years\" INTEGER[])[]", "YES", null, null, null], ["topics", "STRUCT(id VARCHAR, display_name VARCHAR, field VARCHAR)[]", "YES", null, null, null], ["updated_date", "VARCHAR", "YES", null, null, null], ["pulled_at", "VARCHAR", "YES", null, null, null], ["source", "VARCHAR", "YES", null, null, null], ["source_id", "VARCHAR", "YES", null, null, null], ["source_url", "VARCHAR", "YES", null, null, null], ["as_of", "VARCHAR", "YES", null, null, null], ["match_tier", "VARCHAR", "YES", null, null, null], ["licence", "VARCHAR", "YES", null, null, null], ["country", "VARCHAR", "YES", null, null, null]]

-- [openalex-authors-wide (scratch table wide built by wide.py from data/processed/openalex_authors_wide/*/*.parquet)] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select count(*), count(distinct oa_id), count(orcid), count(distinct orcid), count(*) filter (where no_name), count(*) filter (where field1 is null), count(*) filter (where last_cc is null), count(*) filter (where n_affil=0), min(works_count), median(works_count) from wide;
-- => [[21806840, 19650457, 8897391, 7292319, 0, 86958, 16671, 0, 3, 8.0]]

-- [openalex-authors-wide (scratch table wide built by wide.py from data/processed/openalex_authors_wide/*/*.parquet)] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select licence, source, match_tier, count(*) from wide group by 1,2,3;
-- => [["CC0-1.0", "openalex", "T0", 8897391], ["CC0-1.0", "openalex", "T1", 12909449]]

-- [openalex-authors-wide (scratch table wide built by wide.py from data/processed/openalex_authors_wide/*/*.parquet)] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select min(pulled_at), max(pulled_at), max(updated_date) from wide;
-- => [["2026-09-30T03:39:35Z", "2026-09-30T14:45:09Z", "2026-09-22"]]

-- [openalex-authors-wide (scratch table wide built by wide.py from data/processed/openalex_authors_wide/*/*.parquet)] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select count(distinct country) from wide;
-- => [[227]]

-- [openalex-authors-wide (scratch table wide built by wide.py from data/processed/openalex_authors_wide/*/*.parquet)] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select country, count(*) c from wide group by 1 order by 2 desc limit 30;
-- => [["US", 4110736], ["CN", 2979969], ["IN", 994825], ["GB", 928929], ["DE", 912075], ["JP", 873138], ["BR", 858899], ["FR", 689762], ["ID", 557449], ["ES", 516168], ["RU", 513103], ["IT", 497770], ["CA", 492341], ["KR", 415199], ["AU", 351400], ["TR", 271568], ["NL", 267023], ["IR", 243780], ["CH", 220767], ["PL", 220555], ["TW", 216912], ["MX", 208901], ["SE", 152002], ["BE", 147051], ["UA", 147029], ["MY", 139594], ["PK", 138598], ["NG", 131323], ["EG", 131173], ["PT", 123447]]

-- [openalex-authors-wide (scratch table wide built by wide.py from data/processed/openalex_authors_wide/*/*.parquet)] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select count(*) filter (where c<1000), count(*) filter (where c<100) from (select country, count(*) c from wide group by 1);
-- => [[62, 14]]

-- [openalex-authors-wide (scratch table wide built by wide.py from data/processed/openalex_authors_wide/*/*.parquet)] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select country, count(*) c from wide group by 1 order by 2 asc limit 25;
-- => [["AI", 1], ["CK", 7], ["BQ", 14], ["TV", 24], ["AX", 29], ["TC", 51], ["MP", 62], ["KI", 63], ["FK", 68], ["NU", 70], ["SB", 82], ["MS", 92], ["FM", 94], ["GQ", 96], ["JE", 100], ["VC", 101], ["PW", 129], ["IM", 133], ["DM", 138], ["AD", 138], ["VA", 149], ["SJ", 155], ["AW", 163], ["SM", 197], ["LC", 199]]

-- [openalex-authors-wide (scratch table wide built by wide.py from data/processed/openalex_authors_wide/*/*.parquet)] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select field1, count(*) c from wide group by 1 order by 2 desc;
-- => [["Medicine", 5451763], ["Engineering", 3025896], ["Biochemistry, Genetics and Molecular Biology", 1629993], ["Social Sciences", 1583944], ["Computer Science", 1254814], ["Agricultural and Biological Sciences", 1186994], ["Environmental Science", 1033062], ["Physics and Astronomy", 1023739], ["Materials Science", 865779], ["Health Professions", 496841], ["Psychology", 484585], ["Chemistry", 471021], ["Neuroscience", 429185], ["Arts and Humanities", 396077], ["Earth and Planetary Sciences", 386796], ["Business, Management and Accounting", 373946], ["Immunology and Microbiology", 337887], ["Economics, Econometrics and Finance", 313141], ["Mathematics", 185332], ["Energy", 159225], ["Dentistry", 145636], ["Decision Sciences", 141744], ["Nursing", 117302], ["Pharmacology, Toxicology and Pharmaceutics", 95071], [null, 86958], ["Chemical Engineering", 79753], ["Veterinary", 50356]]

-- [openalex-authors-wide (scratch table wide built by wide.py from data/processed/openalex_authors_wide/*/*.parquet)] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select count(*) filter (where n_dated_affil>=2) two_dated_positions, count(*) filter (where n_dated_affil>=2 and orcid is not null) with_orcid, count(*) filter (where n_dated_affil=1), count(*) filter (where n_dated_affil=0) from wide;
-- => [[16429683, 7681375, 5377157, 0]]

-- [openalex-authors-wide (scratch table wide built by wide.py from data/processed/openalex_authors_wide/*/*.parquet)] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select min(first_year), max(last_year), count(*) filter (where last_year>=2023) from wide;
-- => [[1403, 2025002, 14267725]]

-- [openalex-authors-wide (scratch table wide built by wide.py from data/processed/openalex_authors_wide/*/*.parquet)] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select count(*) - count(distinct oa_id) dup_rows from wide;
-- => [[2156383]]

-- [openalex-authors-wide (scratch table wide built by wide.py from data/processed/openalex_authors_wide/*/*.parquet)] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select count(*) from (select orcid from wide where orcid is not null group by 1 having count(*)>1);
-- => [[1188881]]

-- [openalex-authors-wide dedup] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select count(*) from (select oa_id from wide group by 1 having count(distinct country)>1);
-- => [[1790389]]

-- [openalex-authors-wide dedup] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select count(*) from (select oa_id, country from wide group by 1,2 having count(*)>1);
-- => [[0]]

-- [openalex-authors-wide dedup] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select country, count(*)-count(distinct oa_id) d from wide group by 1 order by 2 desc limit 5;
-- => [["TW", 0], ["CI", 0], ["MA", 0], ["MG", 0], ["BY", 0]]

-- [openalex-authors-wide dedup] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
create or replace temp table d as select oa_id, any_value(orcid) orcid, max(n_dated_affil) nda, any_value(field1) field1, any_value(last_cc) last_cc, max(works_count) wc from wide group by 1;
-- => [[19650457]]

-- [openalex-authors-wide dedup] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select count(*), count(orcid), count(distinct orcid), count(*) filter (where nda>=2), count(*) filter (where nda>=2 and orcid is not null) from d;
-- => [[19650457, 7709698, 7292319, 14273300, 6493682]]

-- [openalex-authors-wide dedup] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select count(*) from (select orcid from d where orcid is not null group by 1 having count(*)>1);
-- => [[342740]]

-- [phd-cockpit] :memory:
create view f as select * from read_csv_auto('biophysics-phd-review/data/processed/faculty.csv');
-- => []

-- [phd-cockpit] :memory:
select count(*), count(distinct author_id), count(distinct openalex_institution_id), count(*) filter (where author_id is null) from f;
-- => [[152996, 108475, 881, 0]]

-- [phd-cockpit] :memory:
create view a as select * from read_csv_auto('biophysics-phd-review/data/processed/advisors.csv', sample_size=-1);
-- => []

-- [phd-cockpit] :memory:
select count(*), count(distinct author_id), count(*) filter (where author_id is null), count(*) filter (where ror is null), count(*) filter (where country_code is null), count(distinct country_code), count(distinct openalex_institution_id), count(*) filter (where active) from a;
-- => [[14894, 14894, 0, 0, 11, 71, 869, 12672]]

-- [phd-cockpit] :memory:
select country_code, count(*) from a group by 1 order by 2 desc limit 15;
-- => [["US", 3651], ["DE", 1127], ["CN", 1060], ["GB", 931], ["IT", 885], ["FR", 643], ["JP", 567], ["CA", 454], ["AU", 394], ["IN", 362], ["ES", 336], ["NL", 269], ["RU", 267], ["CZ", 194], ["PL", 189]]

-- [phd-cockpit] :memory:
select continent, count(*) from a group by 1 order by 2 desc;
-- => [["Europe", 6569], ["North America", 4261], ["Asia", 3066], ["Oceania", 425], ["South America", 345], ["Africa", 217], [null, 11]]

-- [phd-cockpit] :memory:
select min(advisor_last_active), max(advisor_last_active) from a;
-- => [[1939, 2029]]

-- [phd-cockpit] :memory:
create view r as select * from read_csv_auto('biophysics-phd-review/data/processed/advisors_ranked.csv', sample_size=-1);
-- => []

-- [phd-cockpit] :memory:
select count(*), count(distinct openalex_url), count(*) filter (where openalex_url is null), count(distinct country_code), count(distinct institution) from r;
-- => [[3870, 3870, 0, 16, 454]]

-- [phd-cockpit] :memory:
select tier, count(*) from r group by 1 order by 1;
-- => [["A", 387], ["A+", 194], ["B", 967], ["C", 2322]]

-- [phd-cockpit] :memory:
select country_code, count(*) from r group by 1 order by 2 desc limit 12;
-- => [["US", 1819], ["DE", 616], ["GB", 478], ["CA", 192], ["AU", 146], ["NL", 128], ["CH", 93], ["SE", 79], ["AT", 71], ["DK", 67], ["BE", 51], ["FI", 45]]

-- [phd-cockpit] :memory:
select count(*) from r join a on replace(r.openalex_url,'https://openalex.org/','')=replace(a.author_id,'https://openalex.org/','');
-- => [[3743]]

-- [phd-cockpit] :memory:
select count(*), count(email) from read_csv_auto('biophysics-phd-review/data/processed/qc_pi_emails.csv');
-- => [[27, 27]]

-- [phd-cockpit] :memory:
select email_confidence, count(*) from read_csv_auto('biophysics-phd-review/data/processed/qc_pi_emails.csv') group by 1;
-- => [["verified", 23], ["pattern", 4]]

-- [phd-cockpit] :memory:
select count(*), count(pi_email) from read_csv_auto('biophysics-phd-review/data/processed/send_queue_asap.csv');
-- => [[10, 10]]

-- [phd-cockpit] :memory:
select email_status, count(*) from read_csv_auto('biophysics-phd-review/data/processed/funnel_targets.csv') group by 1;
-- => [[null, 38]]

-- [HEADLINE union (scratch tables ids/ent built by union.py; ekey = ORCID if any dataset gives one for the row or its OpenAlex id, else OpenAlex author id)] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select count(distinct ekey) total_distinct, count(distinct ekey) filter (where src<>'openalex_wide') without_wide, count(distinct oa) distinct_openalex_ids, count(distinct orcid) distinct_orcids from ent;
-- => [[19407444, 1252228, 19823019, 7349752]]

-- [HEADLINE union (scratch tables ids/ent built by union.py; ekey = ORCID if any dataset gives one for the row or its OpenAlex id, else OpenAlex author id)] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select count(*) from (select ekey from ent group by 1 having count(distinct src)>=2);
-- => [[1214128]]

-- [HEADLINE union (scratch tables ids/ent built by union.py; ekey = ORCID if any dataset gives one for the row or its OpenAlex id, else OpenAlex author id)] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select a.src, b.src, count(distinct a.ekey) from ent a join ent b on a.ekey=b.ekey and a.src<b.src group by 1,2 order by 1,2;
-- => [["advisor_public", "advisor_review", 3934], ["advisor_public", "atlas_person", 2590], ["advisor_public", "atlas_researchers", 2590], ["advisor_public", "bf_author_works", 161], ["advisor_public", "bf_fanout", 364], ["advisor_public", "bf_solvability", 6], ["advisor_public", "cockpit_advisors", 3500], ["advisor_public", "cockpit_faculty", 3544], ["advisor_public", "openalex_wide", 3752], ["advisor_review", "atlas_person", 2837], ["advisor_review", "atlas_researchers", 2837], ["advisor_review", "bf_author_works", 194], ["advisor_review", "bf_fanout", 408], ["advisor_review", "bf_solvability", 6], ["advisor_review", "cockpit_advisors", 3738], ["advisor_review", "cockpit_faculty", 3790], ["advisor_review", "openalex_wide", 4098], ["atlas_person", "atlas_researchers", 1099689], ["atlas_person", "bf_author_works", 14944], ["atlas_person", "bf_fanout", 28019], ["atlas_person", "bf_solvability", 260], ["atlas_person", "cockpit_advisors", 6920], ["atlas_person", "cockpit_faculty", 39455], ["atlas_person", "openalex_wide", 966624], ["atlas_researchers", "bf_author_works", 14963], ["atlas_researchers", "bf_fanout", 28042], ["atlas_researchers", "bf_solvability", 260], ["atlas_researchers", "cockpit_advisors", 6928], ["atlas_researchers", "cockpit_faculty", 39503], ["atlas_researchers", "openalex_wide", 968661], ["bf_author_works", "bf_fanout", 10297], ["bf_author_works", "bf_solvability", 126], ["bf_author_works", "cockpit_advisors", 375], ["bf_author_works", "cockpit_faculty", 1437], ["bf_author_works", "openalex_wide", 37057], ["bf_fanout", "bf_solvability", 175], ["bf_fanout", "cockpit_advisors", 901], ["bf_fanout", "cockpit_faculty", 3281], ["bf_fanout", "openalex_wide", 56199], ["bf_solvability", "cockpit_advisors", 14], ["bf_solvability", "cockpit_faculty", 35], ["bf_solvability", "openalex_wide", 620], ["cockpit_advisors", "cockpit_faculty", 14881], ["cockpit_advisors", "openalex_wide", 13721], ["cockpit_faculty", "openalex_wide", 98054]]

-- [HEADLINE union breakdowns (scratch db, write allowed for the scratch table only; research_atlas.duckdb attached read-only as ra)] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
attach 'research-atlas/research_atlas.duckdb' as ra (read_only);
-- => []

-- [HEADLINE union breakdowns (scratch db, write allowed for the scratch table only; research_atlas.duckdb attached read-only as ra)] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
create or replace table person1 as select ekey, max(orcid) orcid, any_value(field) filter (where field is not null and src='openalex_wide') fw, any_value(field) filter (where field is not null and src<>'openalex_wide') fa, any_value(cc) filter (where cc is not null and src='openalex_wide') cw, any_value(cc) filter (where cc is not null and src<>'openalex_wide') ca, bool_or(src<>'openalex_wide') in_other, bool_or(src='openalex_wide') in_wide from ent group by 1;
-- => [[19407444]]

-- [HEADLINE union breakdowns (scratch db, write allowed for the scratch table only; research_atlas.duckdb attached read-only as ra)] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select count(*), count(orcid), count(*) filter (where coalesce(fw,fa) is null), count(*) filter (where coalesce(cw,ca) is null), count(*) filter (where in_other and not in_wide), count(*) filter (where in_other and in_wide) from person1;
-- => [[19407444, 7349752, 117591, 57424, 174381, 1077847]]

-- [HEADLINE union breakdowns (scratch db, write allowed for the scratch table only; research_atlas.duckdb attached read-only as ra)] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select coalesce(fw,fa) field, count(*) n, count(*) filter (where in_other) n_without_wide from person1 group by 1 order by 2 desc;
-- => [["Medicine", 4861520, 325024], ["Engineering", 2709140, 102445], ["Biochemistry, Genetics and Molecular Biology", 1468444, 216203], ["Social Sciences", 1418861, 23580], ["Computer Science", 1108462, 44587], ["Agricultural and Biological Sciences", 1057728, 45719], ["Environmental Science", 912482, 72708], ["Physics and Astronomy", 819216, 95922], ["Materials Science", 765994, 56064], ["Health Professions", 442514, 9277], ["Psychology", 435292, 20996], ["Chemistry", 426335, 20397], ["Neuroscience", 385452, 54941], ["Arts and Humanities", 355163, 5548], ["Earth and Planetary Sciences", 338716, 33696], ["Business, Management and Accounting", 336913, 4593], ["Immunology and Microbiology", 304162, 38657], ["Economics, Econometrics and Finance", 275628, 6063], ["Mathematics", 165710, 6469], ["Energy", 137367, 8835], ["Dentistry", 130850, 2524], ["Decision Sciences", 125283, 3957], [null, 117591, 41108], ["Nursing", 105041, 4915], ["Pharmacology, Toxicology and Pharmaceutics", 86138, 3869], ["Chemical Engineering", 72082, 2856], ["Veterinary", 45360, 1275]]

-- [HEADLINE union breakdowns (scratch db, write allowed for the scratch table only; research_atlas.duckdb attached read-only as ra)] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select coalesce(cw,ca) cc, count(*) n, count(*) filter (where in_other) n_without_wide from person1 group by 1 order by 2 desc limit 40;
-- => [["US", 3725055, 483131], ["CN", 2731569, 106152], ["IN", 909029, 15086], ["DE", 816564, 66056], ["JP", 811325, 21089], ["BR", 798608, 11115], ["GB", 771624, 70939], ["FR", 614518, 46555], ["ID", 530135, 962], ["RU", 462657, 7121], ["ES", 453143, 38659], ["IT", 444081, 46266], ["CA", 424286, 26047], ["KR", 373218, 12134], ["AU", 300245, 20742], ["TR", 246241, 3419], ["IR", 232097, 3147], ["NL", 228113, 26491], ["TW", 194259, 4997], ["PL", 193787, 8147], ["CH", 180571, 20859], ["MX", 177836, 3410], ["SE", 132291, 13542], ["UA", 130273, 1225], ["MY", 123539, 1247], ["BE", 121540, 13039], ["NG", 119719, 1144], ["PK", 118472, 1851], ["EG", 116874, 1460], ["AT", 97398, 9909], ["PT", 95281, 7022], ["CO", 93886, 1427], ["IL", 90751, 7459], ["DK", 90701, 11166], ["CZ", 90178, 6248], ["AR", 88302, 3144], ["GR", 86441, 6528], ["SA", 85330, 1995], ["TH", 80773, 1448], ["NO", 79172, 6770]]

-- [HEADLINE union breakdowns (scratch db, write allowed for the scratch table only; research_atlas.duckdb attached read-only as ra)] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select count(*) countries, count(*) filter (where n<1000) under_1000, count(*) filter (where n<100) under_100 from (select coalesce(cw,ca) cc, count(*) n from person1 where coalesce(cw,ca) is not null group by 1);
-- => [[226, 72, 18]]

-- [HEADLINE union breakdowns (scratch db, write allowed for the scratch table only; research_atlas.duckdb attached read-only as ra)] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
create or replace table granted as select distinct coalesce(nullif(upper(regexp_extract(coalesce(p.orcid,''),'([0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9Xx])',1)),''), m.orcid, nullif(upper(regexp_extract(coalesce(p.openalex_author_id,''),'(A[0-9]+)$',1)),'')) ekey from ra.grant_pi_person g join ra.person p on p.atlas_id=g.person_atlas_id left join oa2or m on m.oa=nullif(upper(regexp_extract(coalesce(p.openalex_author_id,''),'(A[0-9]+)$',1)),'');
-- => [[58496]]

-- [HEADLINE union breakdowns (scratch db, write allowed for the scratch table only; research_atlas.duckdb attached read-only as ra)] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select count(*), count(ekey) from granted;
-- => [[58496, 58495]]

-- [HEADLINE union breakdowns (scratch db, write allowed for the scratch table only; research_atlas.duckdb attached read-only as ra)] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select count(*) from granted g join person1 p using(ekey);
-- => [[58495]]

-- [HEADLINE union breakdowns (scratch db, write allowed for the scratch table only; research_atlas.duckdb attached read-only as ra)] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select coalesce(fw,fa) field, count(*) from granted g join person1 p using(ekey) group by 1 order by 2 desc;
-- => [["Medicine", 17363], ["Biochemistry, Genetics and Molecular Biology", 11540], ["Neuroscience", 4562], ["Engineering", 3573], ["Environmental Science", 2947], ["Immunology and Microbiology", 2489], ["Computer Science", 2226], ["Physics and Astronomy", 2149], ["Earth and Planetary Sciences", 2035], ["Materials Science", 1707], ["Psychology", 1685], ["Agricultural and Biological Sciences", 1420], ["Social Sciences", 1341], ["Chemistry", 825], ["Mathematics", 600], ["Health Professions", 551], ["Nursing", 280], ["Economics, Econometrics and Finance", 267], ["Decision Sciences", 213], ["Dentistry", 144], ["Energy", 133], ["Pharmacology, Toxicology and Pharmaceutics", 115], ["Arts and Humanities", 110], ["Business, Management and Accounting", 97], ["Chemical Engineering", 86], ["Veterinary", 37]]

-- [HEADLINE union breakdowns (scratch db, write allowed for the scratch table only; research_atlas.duckdb attached read-only as ra)] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select coalesce(cw,ca) cc, count(*) from granted g join person1 p using(ekey) group by 1 order by 2 desc limit 12;
-- => [["US", 50525], ["GB", 2448], ["CN", 1640], ["DE", 507], ["CA", 422], ["AU", 280], ["ZA", 239], ["IN", 224], ["FR", 192], ["CH", 135], ["KR", 114], ["JP", 102]]

-- [HEADLINE union breakdowns (scratch db, write allowed for the scratch table only; research_atlas.duckdb attached read-only as ra)] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
create or replace table career as select coalesce(m.orcid, nullif(upper(regexp_extract(coalesce(w.orcid,''),'([0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9Xx])',1)),''), w.oa_id) ekey, max(n_dated_affil) nda from wide w left join oa2or m on m.oa=w.oa_id group by 1;
-- => [[19233453]]

-- [HEADLINE union breakdowns (scratch db, write allowed for the scratch table only; research_atlas.duckdb attached read-only as ra)] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select count(*) filter (where nda>=2) two_plus, count(*) filter (where nda=1) one, count(*) total from career;
-- => [[14006094, 5227359, 19233453]]

-- [HEADLINE union breakdowns (scratch db, write allowed for the scratch table only; research_atlas.duckdb attached read-only as ra)] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select count(*) from career c join person1 p using(ekey) where c.nda>=2 and p.in_other;
-- => [[1030062]]

-- [HEADLINE union breakdowns (scratch db, write allowed for the scratch table only; research_atlas.duckdb attached read-only as ra)] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select count(*) from career c join granted g using(ekey) where c.nda>=2;
-- => [[55285]]

-- [csrankings raw dump] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
create temp view c as select * from read_csv_auto('research-atlas/data/raw/csrankings/CSrankings/csrankings.csv', all_varchar=true);
-- => []

-- [csrankings raw dump] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select count(*), count(distinct name), count(nullif(orcid,'')), count(nullif(scholarid,'NOSCHOLARPAGE')), count(distinct affiliation), count(nullif(homepage,'')) from c;
-- => [[34655, 34655, 34655, 29261, 702, 34655]]

-- [csrankings raw dump] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select count(distinct upper(c.orcid)) from c join person1 p on p.ekey=upper(c.orcid) where c.orcid<>'';
-- => [[16199]]

-- [csrankings raw dump 2] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select count(*), count(*) filter (where regexp_matches(orcid,'^[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]$')), count(distinct orcid) filter (where regexp_matches(orcid,'^[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]$')) from read_csv_auto('research-atlas/data/raw/csrankings/CSrankings/csrankings.csv', all_varchar=true);
-- => [[34655, 34655, 17114]]

-- [csrankings raw dump 2] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select region, count(*) from read_csv_auto('research-atlas/data/raw/csrankings/CSrankings/institutions.csv', all_varchar=true) group by 1 order by 2 desc;
-- => [["europe", 258], ["northamerica", 235], ["asia", 196], ["southamerica", 24], ["australasia", 23], ["africa", 5]]

-- [csrankings raw dump 2] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select count(distinct c.orcid) from read_csv_auto('research-atlas/data/raw/csrankings/CSrankings/csrankings.csv', all_varchar=true) c anti join person1 p on p.ekey=upper(c.orcid) where regexp_matches(c.orcid,'^[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]$');
-- => [[915]]

-- [JOINS measured on full tables] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
attach 'research-atlas/research_atlas.duckdb' as ra (read_only);
-- => []

-- [JOINS measured on full tables] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select a.src, count(distinct a.ekey) n, count(distinct a.ekey) filter (where b.ekey is not null) in_wide, round(100.0*count(distinct a.ekey) filter (where b.ekey is not null)/count(distinct a.ekey),1) pct from ent a left join (select distinct ekey from ent where src='openalex_wide') b using(ekey) where a.src<>'openalex_wide' group by 1 order by 2 desc;
-- => [["atlas_researchers", 1101963, 968661, 87.9], ["atlas_person", 1099689, 966624, 87.9], ["cockpit_faculty", 108347, 98054, 90.5], ["bf_fanout", 69158, 56199, 81.3], ["bf_author_works", 61718, 37057, 60.0], ["cockpit_advisors", 14881, 13721, 92.2], ["advisor_review", 4315, 4098, 95.0], ["advisor_public", 3934, 3752, 95.4], ["bf_solvability", 777, 620, 79.8]]

-- [JOINS measured on full tables] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select a.src, count(distinct a.ekey) n, count(distinct a.ekey) filter (where b.ekey is not null) in_atlas, round(100.0*count(distinct a.ekey) filter (where b.ekey is not null)/count(distinct a.ekey),1) pct from ent a left join (select distinct ekey from ent where src='atlas_researchers') b using(ekey) where a.src not in ('atlas_researchers','atlas_person') group by 1 order by 2 desc;
-- => [["openalex_wide", 19233063, 968661, 5.0], ["cockpit_faculty", 108347, 39503, 36.5], ["bf_fanout", 69158, 28042, 40.5], ["bf_author_works", 61718, 14963, 24.2], ["cockpit_advisors", 14881, 6928, 46.6], ["advisor_review", 4315, 2837, 65.7], ["advisor_public", 3934, 2590, 65.8], ["bf_solvability", 777, 260, 33.5]]

-- [JOINS measured on full tables] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select a.src, count(distinct a.ekey) n, count(distinct a.ekey) filter (where g.ekey is not null) with_grant from ent a left join granted g using(ekey) group by 1 order by 2 desc;
-- => [["openalex_wide", 19233063, 55605], ["atlas_researchers", 1101963, 58495], ["atlas_person", 1099689, 58495], ["cockpit_faculty", 108347, 5606], ["bf_fanout", 69158, 3637], ["bf_author_works", 61718, 1719], ["cockpit_advisors", 14881, 1277], ["advisor_review", 4315, 823], ["advisor_public", 3934, 752], ["bf_solvability", 777, 58]]

-- [JOINS measured on full tables] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select orcid, count(*) from read_csv_auto('research-atlas/data/raw/csrankings/CSrankings/csrankings.csv', all_varchar=true) group by 1 order by 2 desc limit 1;
-- => [["0000-0000-0000-0000", 15526]]

-- [JOINS measured on full tables] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
create temp view fh as select lower(trim(name)) nm, ror_id from read_json_auto('research-atlas/data/raw/contacts/official/*/records.jsonl', union_by_name=true, format='newline_delimited');
-- => []

-- [JOINS measured on full tables] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select count(*) from (select distinct nm, ror_id from fh);
-- => [[52263]]

-- [JOINS measured on full tables] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select count(*) from (select distinct nm, ror_id from fh) f semi join (select lower(trim(full_name)) nm, regexp_extract(primary_org_ror,'([0-9a-z]{9})$',1) ror from ra.researchers_public where primary_org_ror is not null) r on r.nm=f.nm and r.ror=f.ror_id;
-- => [[965]]

-- [JOINS measured on full tables] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select primary_org_ror from ra.researchers_public where primary_org_ror is not null limit 1;
-- => [["https://ror.org/00jmfr291"]]

-- [JOIN faculty-haul name+ROR to openalex wide (display_name + any last_known_institutions ror)] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
create temp view fh as select distinct lower(trim(name)) nm, ror_id from read_json_auto('research-atlas/data/raw/contacts/official/*/records.jsonl', union_by_name=true, format='newline_delimited');
-- => []

-- [JOIN faculty-haul name+ROR to openalex wide (display_name + any last_known_institutions ror)] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
create temp table wn as select lower(trim(display_name)) nm, regexp_extract(i.ror,'([0-9a-z]{9})$',1) ror from (select display_name, unnest(last_known_institutions) i from read_parquet('.wt-atlas-openalex-wide/data/processed/openalex_authors_wide/country=US/*.parquet')) where regexp_extract(i.ror,'([0-9a-z]{9})$',1) in (select ror_id from fh);
-- => [[634888]]

-- [JOIN faculty-haul name+ROR to openalex wide (display_name + any last_known_institutions ror)] /tmp/claude-1000/-home-gian-agfarms/d8d59e10-23b4-41eb-bff8-b838b00b0230/scratchpad/wide.duckdb
select (select count(*) from fh), count(*) from fh f semi join wn w on w.nm=f.nm and w.ror=f.ror_id;
-- => [[52263, 5395]]

-- [atlas committed sample] :memory:
select count(*), count(full_name), count(orcid) from read_parquet('research-atlas/data/processed/sample/researchers_sample.parquet');
-- => [[360, 360, 358]]

-- ===================== BUILD STATEMENTS FOR THE SCRATCH TABLES =====================
-- [wide] built from read_parquet('.wt-atlas-openalex-wide/data/processed/openalex_authors_wide/*/*.parquet', hive_partitioning=true)
create table wide as select replace(id,'https://openalex.org/','') oa_id, replace(orcid,'https://orcid.org/','') orcid, country, works_count, cited_by_count, h_index,
 topics[1].field field1, len(affiliations) n_affil, len(list_filter(affiliations, a -> len(a.years)>0)) n_dated_affil,
 list_min(flatten(list_transform(affiliations, a -> a.years))) first_year, list_max(flatten(list_transform(affiliations, a -> a.years))) last_year,
 last_known_institutions[1].country_code last_cc, licence, match_tier, source, pulled_at, updated_date from read_parquet(...);
-- => 21806840 rows
-- [ids] union all of (source label, OpenAlex id, ORCID, field, country) from: ra.researchers_public, ra.person, wide,
--   biophysics-phd-review faculty.csv and advisors.csv, bucket-advisor-review professors.jsonl, graph.advisor_public,
--   bucket-foundation openalex-fanout authorships, openalex/A*/works.json authorships, solvability-atlas records people;
--   ids normalised with regexp_extract(.., '(A[0-9]+)$') and the ORCID pattern; rows with neither id dropped; distinct.
create table oa2or as select oa, min(orcid) orcid from ids where oa is not null and orcid is not null group by 1;
create table ent as select i.src, i.oa, coalesce(i.orcid, m.orcid) orcid, coalesce(i.orcid, m.orcid, i.oa) ekey, i.field, i.cc from ids i left join oa2or m on m.oa=i.oa;
select src, count(*), count(distinct oa), count(distinct orcid), count(distinct ekey) from ent group by 1 order by 2 desc;
-- => [["openalex_wide",19650457,19650457,7292319,19233063],["atlas_researchers",1110114,1102643,836872,1101963],["atlas_person",1107823,1097483,835114,1099689],["cockpit_faculty",108475,108475,79021,108347],["bf_fanout",69353,69353,46263,69158],["bf_author_works",62024,62024,27099,61718],["cockpit_advisors",14894,14894,12139,14881],["advisor_review",4315,4315,3958,4315],["advisor_public",3934,3934,3622,3934],["bf_solvability",777,777,508,777]]
select count(distinct ekey) total_distinct, count(distinct ekey) filter (where src<>'openalex_wide') without_wide, count(distinct oa), count(distinct orcid) from ent;
-- => [[19407444, 1252228, 19823019, 7349752]]
select count(*) from (select ekey from ent group by 1 having count(distinct src)>=2);
-- => [[1214128]]

-- ===================== POSTGRES, local Supabase 127.0.0.1:54322, read-only session =====================
set statement_timeout='20s'; set default_transaction_read_only=on;
select count(*), count(openalex_id), count(distinct openalex_id), count(orcid), count(ror), count(*) filter (where hidden), min(updated_at)::date, max(updated_at)::date, count(distinct country), count(distinct model_version) from graph.advisor_public;
-- => 3934|3934|3934|3622|3934|0|2026-09-28|2026-09-28|17|1
select country, count(*) from graph.advisor_public group by 1 order by 2 desc limit 10;
-- => US 2035, DE 551, GB 458, CA 152, AU 139, NL 127, CH 93, SE 79, AT 71, BE 51
select field, count(*) from graph.advisor_public group by 1 order by 2 desc limit 5;
-- => Biochemistry, Genetics and Molecular Biology 2315, Medicine 459, Neuroscience 334, Engineering 140, Physics and Astronomy 129
select count(*) from graph.advisor_optouts;   -- => 0
select count(*) from bucket.advisor_swipes;   -- => 0
select count(*) from graph.advisor_space;     -- => 1
-- bucket-pgvector (db polingual): tables public.photons, public.photons_full only. No researcher table.

-- ===================== SQLITE, <local-share>/bkt/bkt.db opened mode=ro =====================
select count(*) from advisor_review;  -- => 1
select count(*) from advisor_rows;    -- => 67
select count(*) from people_forget;   -- => 0

-- ===================== FILE SCANS IN PYTHON, json and csv modules, counts only =====================
-- faculty haul: research-atlas/data/raw/contacts/official/*/records.jsonl
--   => 168 files, 65214 rows, 24 keys; faculty.jsonl 4 files 1309 rows; extracted.jsonl 6 files 2263 rows
--   _state.json updated 2026-10-11T15:00:38Z => status counts pending_adapter 153, pending 138, zero_yield 106, done 55, low_yield 7
--   journalctl --user -u faculty-haul.service, runs 2026-10-10 23:21, 2026-10-11 00:21, 2026-10-11 11:00 => profiles=65214 emails=35921 on each run
--   seeds: .wt-atlas-ops/data/seeds/institutions.csv => 321 rows, US 319, PR 2, R1 187, R2 134
-- bucket-foundation/openalex/A*/author.json => 402 authors, 103 with ORCID, 340 with two or more dated affiliations, 248 with no last known country; file dates 2026-05-09 to 2026-05-11
-- bucket-foundation/openalex-fanout/W*/{work,cited-by}.json => 3370 files, 32787 works, 119946 authorship rows, 7535 without author id, 69353 distinct authors, 44420 with ORCID
-- bucket-foundation/openalex/A*/works.json => 402 files, 58116 works, 205053 authorship rows, 3308 without author id, 62024 distinct authors, 25714 with ORCID
-- bucket-foundation/pubmed/PMID*/metadata.json => 8214 records, 73063 author name strings, no author ids
-- bucket-foundation/openalex-citers/*.md => 10766 files, author names in markdown only
-- bucket-foundation/_intake/connections/graph.json => 283 author nodes, 344 edges; coauthor.json => 507 pairs
-- bucket-foundation/canon-figures/figures.json => 99 figures, generated 2026-04-23, 2 with a downstream field, 0 with ORCID or OpenAlex id
-- bucket-foundation/tools/solvability-atlas/records/*.json => 71 records, 851 people rows, 777 distinct OpenAlex ids, 57 rows without id, 793 organisation rows; retrieved 2026-10-05 and 2026-10-06
-- <local-share>/bucket-advisor-review/professors.jsonl => 4657 rows; openalex 4315, orcid 3958, ror 4634, email 745, funding 952, atlas_topics 2827, name-only 342
--   sources: cockpit 3870, stevens 652, tracker 121, network 12, network+tracker 2; email_source: none 3912, official_directory 644, founder_tracker 87, europepmc 12, labpage 1, orcid 1
-- <local-share>/bucket-network/people-corpus/people.csv => 128 rows, 15 columns; organizations.csv => 57 rows; README states 10 rows with an email
-- <local-share>/bucket-profiles/gianyrox.json => 1 profile; top-level keys person, counts, branches, interests, skills, evidence, errors
-- <local-share>/bucket-pi-fit/2026-09-29/fit.csv => 3886 data rows
-- gh repo view gianyrox/biophysics-phd-review --json visibility,licenseInfo => PRIVATE, no licence
-- gh repo view bucket-foundation/research-atlas --json visibility,licenseInfo => PUBLIC, MIT
-- education-atlas/education_atlas.duckdb tables: country 298, indicator 30, observation 78326, observation_full 78326, problem 5036, problem_full 5036. No person table.
