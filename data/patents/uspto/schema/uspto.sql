-- USPTO Patent Corpus Schema (bkt-5qg)
-- Bucket Foundation Global Patent Index (parent epic: bkt-tfu)
--
-- Sources:
--   1. PatentsView parquet snapshots (https://patentsview.org/download/data-download-tables) — quarterly
--   2. USPTO Bulk Data weekly red books (https://bulkdata.uspto.gov)        — weekly
--
-- Conventions:
--   - All IDs are TEXT (USPTO patent numbers can be alphanumeric: D-design, RE-reissue, PP-plant, X-pre-1836)
--   - All dates are DATE (filing/priority/grant/publication)
--   - Raw upstream JSON/XML payloads are kept in `raw_blob JSONB` for reprocessing without re-fetching
--   - Embedding columns + PostGIS geometries are intentionally NOT in this schema
--     (sibling beads: bkt-sq8 = pgvector embeddings, bkt-nk7 = geom on uspto_location)
--
-- Extensions assumed available (created by separate ops bead):
--   CREATE EXTENSION IF NOT EXISTS postgis;
--   CREATE EXTENSION IF NOT EXISTS vector;

CREATE SCHEMA IF NOT EXISTS patents;

-- =============================================================================
-- uspto_grant — issued patents (utility, design, plant, reissue)
-- =============================================================================
CREATE TABLE IF NOT EXISTS patents.uspto_grant (
    patent_id           TEXT PRIMARY KEY,                  -- e.g. "10000000", "D0900000", "RE48000"
    patent_kind         TEXT,                              -- A1/A2/B1/B2/E/P1/P2/S etc (USPTO kind code)
    patent_type         TEXT,                              -- utility | design | plant | reissue | defensive_publication
    patent_title        TEXT,
    patent_abstract     TEXT,
    application_id      TEXT,                              -- FK -> uspto_application.application_id
    filing_date         DATE,
    grant_date          DATE,
    publication_date    DATE,
    priority_date       DATE,
    num_claims          INTEGER,
    num_figures         INTEGER,
    cpc_codes           TEXT[],                            -- denormalized CPC classifications for fast filter
    ipc_codes           TEXT[],
    examiner_name       TEXT,
    art_unit            TEXT,
    raw_blob            JSONB,                             -- full PatentsView row + bulk XML merged
    ingested_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE  patents.uspto_grant IS 'Issued USPTO patents 1976-present. Source: PatentsView g_patent + USPTO weekly grant red book.';
COMMENT ON COLUMN patents.uspto_grant.patent_id IS 'USPTO patent number as printed on the cover page; alphanumeric.';
COMMENT ON COLUMN patents.uspto_grant.cpc_codes IS 'Denormalized CPC array for index-only scans; full history in patents.uspto_cpc (TODO).';

CREATE INDEX IF NOT EXISTS idx_uspto_grant_grant_date  ON patents.uspto_grant (grant_date);
CREATE INDEX IF NOT EXISTS idx_uspto_grant_filing_date ON patents.uspto_grant (filing_date);
CREATE INDEX IF NOT EXISTS idx_uspto_grant_app         ON patents.uspto_grant (application_id);
CREATE INDEX IF NOT EXISTS idx_uspto_grant_cpc_gin     ON patents.uspto_grant USING GIN (cpc_codes);

-- =============================================================================
-- uspto_application — patent applications (published 18mo post-filing)
-- =============================================================================
CREATE TABLE IF NOT EXISTS patents.uspto_application (
    application_id      TEXT PRIMARY KEY,                  -- USPTO application serial, e.g. "16/123,456"
    publication_id      TEXT,                              -- pre-grant pub id, e.g. "US20210000001A1"
    application_type    TEXT,                              -- utility | design | plant | provisional | pct
    application_title   TEXT,
    application_abstract TEXT,
    filing_date         DATE,
    publication_date    DATE,
    priority_date       DATE,
    examiner_name       TEXT,
    art_unit            TEXT,
    status              TEXT,                              -- pending | abandoned | granted | withdrawn
    granted_patent_id   TEXT REFERENCES patents.uspto_grant(patent_id) ON DELETE SET NULL,
    raw_blob            JSONB,
    ingested_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE patents.uspto_application IS 'Published patent applications (pre-grant). Source: USPTO weekly application red book.';

CREATE INDEX IF NOT EXISTS idx_uspto_app_filing_date ON patents.uspto_application (filing_date);
CREATE INDEX IF NOT EXISTS idx_uspto_app_pub_date    ON patents.uspto_application (publication_date);
CREATE INDEX IF NOT EXISTS idx_uspto_app_granted     ON patents.uspto_application (granted_patent_id);

-- =============================================================================
-- uspto_location — disambiguated locations referenced by inventors/assignees
-- =============================================================================
CREATE TABLE IF NOT EXISTS patents.uspto_location (
    location_id         TEXT PRIMARY KEY,                  -- PatentsView disambiguated location_id
    city                TEXT,
    state               TEXT,                              -- ISO 3166-2 subdivision (e.g. US-CA)
    country             TEXT,                              -- ISO 3166-1 alpha-2
    latitude            DOUBLE PRECISION,
    longitude           DOUBLE PRECISION,
    -- geom GEOGRAPHY(POINT, 4326) -- added by bkt-nk7
    raw_blob            JSONB,
    ingested_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE patents.uspto_location IS 'Disambiguated location entities. Source: PatentsView g_location_disambiguated.';

CREATE INDEX IF NOT EXISTS idx_uspto_location_country ON patents.uspto_location (country);
CREATE INDEX IF NOT EXISTS idx_uspto_location_state   ON patents.uspto_location (state);

-- =============================================================================
-- uspto_inventor — disambiguated inventors with per-patent attribution
-- =============================================================================
CREATE TABLE IF NOT EXISTS patents.uspto_inventor (
    id                  BIGSERIAL PRIMARY KEY,
    inventor_id         TEXT NOT NULL,                     -- PatentsView disambiguated inventor_id
    patent_id           TEXT NOT NULL REFERENCES patents.uspto_grant(patent_id) ON DELETE CASCADE,
    name_first          TEXT,
    name_last           TEXT,
    location_id         TEXT REFERENCES patents.uspto_location(location_id) ON DELETE SET NULL,
    sequence            INTEGER,                           -- order on the patent cover
    raw_blob            JSONB,
    ingested_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (inventor_id, patent_id)
);
COMMENT ON TABLE patents.uspto_inventor IS 'Inventor↔patent attribution. Source: PatentsView g_inventor + g_inventor_disambiguated.';

CREATE INDEX IF NOT EXISTS idx_uspto_inventor_patent   ON patents.uspto_inventor (patent_id);
CREATE INDEX IF NOT EXISTS idx_uspto_inventor_inventor ON patents.uspto_inventor (inventor_id);
CREATE INDEX IF NOT EXISTS idx_uspto_inventor_location ON patents.uspto_inventor (location_id);

-- =============================================================================
-- uspto_assignee — disambiguated assignees (organizations / individuals)
-- =============================================================================
CREATE TABLE IF NOT EXISTS patents.uspto_assignee (
    id                  BIGSERIAL PRIMARY KEY,
    assignee_id         TEXT NOT NULL,                     -- PatentsView disambiguated assignee_id
    patent_id           TEXT NOT NULL REFERENCES patents.uspto_grant(patent_id) ON DELETE CASCADE,
    organization        TEXT,
    name_first          TEXT,
    name_last           TEXT,
    assignee_type       TEXT,                              -- US_company | US_individual | foreign_company | etc
    location_id         TEXT REFERENCES patents.uspto_location(location_id) ON DELETE SET NULL,
    sequence            INTEGER,
    raw_blob            JSONB,
    ingested_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (assignee_id, patent_id)
);
COMMENT ON TABLE patents.uspto_assignee IS 'Assignee↔patent attribution. Source: PatentsView g_assignee + g_assignee_disambiguated.';

CREATE INDEX IF NOT EXISTS idx_uspto_assignee_patent   ON patents.uspto_assignee (patent_id);
CREATE INDEX IF NOT EXISTS idx_uspto_assignee_assignee ON patents.uspto_assignee (assignee_id);
CREATE INDEX IF NOT EXISTS idx_uspto_assignee_org      ON patents.uspto_assignee (organization);

-- =============================================================================
-- uspto_claim — individual patent claims (independent + dependent)
-- =============================================================================
CREATE TABLE IF NOT EXISTS patents.uspto_claim (
    id                  BIGSERIAL PRIMARY KEY,
    patent_id           TEXT NOT NULL REFERENCES patents.uspto_grant(patent_id) ON DELETE CASCADE,
    claim_number        INTEGER NOT NULL,
    claim_text          TEXT NOT NULL,
    is_independent      BOOLEAN,
    parent_claim_number INTEGER,                           -- NULL if independent
    -- embedding VECTOR(1536) -- added by bkt-sq8
    raw_blob            JSONB,
    ingested_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (patent_id, claim_number)
);
COMMENT ON TABLE patents.uspto_claim IS 'Individual claims parsed from bulk XML grant red book.';

CREATE INDEX IF NOT EXISTS idx_uspto_claim_patent ON patents.uspto_claim (patent_id);
CREATE INDEX IF NOT EXISTS idx_uspto_claim_indep  ON patents.uspto_claim (is_independent) WHERE is_independent;

-- =============================================================================
-- uspto_citation — patent-to-patent citations (US-only here; foreign sibling later)
-- =============================================================================
CREATE TABLE IF NOT EXISTS patents.uspto_citation (
    id                  BIGSERIAL PRIMARY KEY,
    citing_patent_id    TEXT NOT NULL REFERENCES patents.uspto_grant(patent_id) ON DELETE CASCADE,
    cited_patent_id     TEXT NOT NULL,                     -- not FK: cited patent may be foreign / pre-1976
    cited_country       TEXT,                              -- ISO alpha-2 of cited patent's authority
    cited_kind          TEXT,
    citation_category   TEXT,                              -- examiner | applicant | other
    citation_sequence   INTEGER,
    raw_blob            JSONB,
    ingested_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (citing_patent_id, cited_patent_id, citation_sequence)
);
COMMENT ON TABLE patents.uspto_citation IS 'Citation graph. Source: PatentsView g_us_patent_citation.';

CREATE INDEX IF NOT EXISTS idx_uspto_citation_citing ON patents.uspto_citation (citing_patent_id);
CREATE INDEX IF NOT EXISTS idx_uspto_citation_cited  ON patents.uspto_citation (cited_patent_id);
