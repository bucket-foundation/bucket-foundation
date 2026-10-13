CREATE TABLE person (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, name_norm TEXT, name_variants TEXT, openalex_id TEXT, orcid TEXT,
  institution TEXT, institution_ror TEXT, country TEXT, position TEXT, homepage TEXT, field TEXT, topics TEXT,
  works_count INTEGER, cited_by_count INTEGER, h_index INTEGER, grant_count INTEGER, first_source TEXT, created_at TEXT, updated_at TEXT
);
CREATE TABLE person_xid (scheme TEXT NOT NULL, value TEXT NOT NULL, person_id INTEGER NOT NULL, PRIMARY KEY (scheme, value)) WITHOUT ROWID;
CREATE TABLE topic (id TEXT PRIMARY KEY, name TEXT, field TEXT) WITHOUT ROWID;
CREATE TABLE contact (
  id INTEGER PRIMARY KEY, person_id INTEGER NOT NULL, kind TEXT NOT NULL, value TEXT NOT NULL, value_norm TEXT NOT NULL,
  source TEXT NOT NULL, source_url TEXT NOT NULL, date_seen TEXT NOT NULL, how_obtained TEXT NOT NULL, UNIQUE (person_id, kind, value_norm)
);
CREATE TABLE advisor_link (
  id INTEGER PRIMARY KEY, advisor_id INTEGER NOT NULL, student_id INTEGER NOT NULL, year INTEGER, institution TEXT, degree TEXT,
  source TEXT NOT NULL, source_url TEXT, UNIQUE (advisor_id, student_id, source)
);
CREATE TABLE do_not_contact (
  id INTEGER PRIMARY KEY, person_id INTEGER, email_norm TEXT, orcid TEXT, openalex_id TEXT, name TEXT, reason TEXT,
  requested_at TEXT NOT NULL, recorded_by TEXT
);
CREATE TABLE person_merge (old_key TEXT NOT NULL, person_id INTEGER NOT NULL, reason TEXT NOT NULL, PRIMARY KEY (old_key, reason)) WITHOUT ROWID;
CREATE TABLE person_match (
  person_id INTEGER PRIMARY KEY, match_id INTEGER NOT NULL, method TEXT NOT NULL, created_at TEXT NOT NULL,
  confidence TEXT, name_count INTEGER, field_agree INTEGER
) WITHOUT ROWID;
CREATE INDEX contact_value ON contact (kind, value_norm);
CREATE INDEX contact_person ON contact (person_id);
CREATE INDEX xid_person ON person_xid (person_id);
CREATE INDEX person_openalex ON person (openalex_id);
CREATE INDEX person_orcid ON person (orcid);
CREATE TRIGGER dnc_purge AFTER INSERT ON do_not_contact
BEGIN
  DELETE FROM contact WHERE person_id = NEW.person_id;
  DELETE FROM contact WHERE kind = 'email' AND value_norm = NEW.email_norm;
END;
