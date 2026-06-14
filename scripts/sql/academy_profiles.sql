-- bucket.academy_profiles  (bkt-coh)
-- =====================================================================
-- The opt-in public "Mastery Profile" handle table for Bucket Academy.
-- One row per learner who has claimed a public handle.
--
-- Mirrors the bucket.academy_progress pattern (bkt-aja):
--   * lives in the PRIVATE `bucket` Postgres schema, which the shared
--     PostgREST (agf-supabase-rest) does NOT expose
--     (PGRST_DB_SCHEMAS = public,storage,graphql_public,zona_franca,polingual).
--     So the browser can never reach this table directly — all access is via
--     the same-origin Next.js service-role API route /api/academy/profile.
--   * RLS policies are defined for defense-in-depth / parity with progress,
--     even though the service-role key bypasses them; the per-user boundary is
--     ALSO enforced in application code (every write forces user_id = the
--     verified token's user). Keeping the schema out of PostgREST means no
--     shared-PostgREST restart is required.
--
-- PRIVACY: default private (is_public = false). A profile is only rendered at
-- bucket.foundation/m/<handle> when is_public = true. Minimal PII: a handle and
-- an optional display name. Email is NEVER stored here (it lives in auth.users
-- and is never exposed on the public page).
--
-- Idempotent: safe to run repeatedly (CREATE ... IF NOT EXISTS, DROP POLICY
-- IF EXISTS before CREATE POLICY).
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS bucket;

CREATE TABLE IF NOT EXISTS bucket.academy_profiles (
  user_id      uuid        NOT NULL
                 REFERENCES auth.users (id) ON DELETE CASCADE,
  handle       text        NOT NULL,
  display_name text,
  is_public    boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  -- one profile per user
  CONSTRAINT academy_profiles_pkey PRIMARY KEY (user_id),
  -- handles are case-insensitively unique; enforce a tidy slug shape:
  -- 3-32 chars, lowercase alnum + single internal hyphens/underscores.
  CONSTRAINT academy_profiles_handle_shape
    CHECK (handle ~ '^[a-z0-9](?:[a-z0-9_-]{1,30}[a-z0-9])$')
);

-- Case-insensitive unique handle. Handles are stored lowercased by the API, but
-- guard at the DB level too so two users can never share a handle.
CREATE UNIQUE INDEX IF NOT EXISTS academy_profiles_handle_uidx
  ON bucket.academy_profiles (lower(handle));

-- Fast public lookup (the /m/<handle> page filters on is_public).
CREATE INDEX IF NOT EXISTS academy_profiles_public_idx
  ON bucket.academy_profiles (is_public)
  WHERE is_public = true;

-- keep updated_at fresh on every write (reuse the existing helper).
DROP TRIGGER IF EXISTS academy_profiles_touch ON bucket.academy_profiles;
CREATE TRIGGER academy_profiles_touch
  BEFORE INSERT OR UPDATE ON bucket.academy_profiles
  FOR EACH ROW EXECUTE FUNCTION bucket.touch_updated_at();

-- RLS (defense-in-depth; service-role bypasses it, the API enforces ownership).
ALTER TABLE bucket.academy_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS own_select ON bucket.academy_profiles;
CREATE POLICY own_select ON bucket.academy_profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS own_insert ON bucket.academy_profiles;
CREATE POLICY own_insert ON bucket.academy_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS own_update ON bucket.academy_profiles;
CREATE POLICY own_update ON bucket.academy_profiles
  FOR UPDATE USING (auth.uid() = user_id)
              WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS own_delete ON bucket.academy_profiles;
CREATE POLICY own_delete ON bucket.academy_profiles
  FOR DELETE USING (auth.uid() = user_id);
