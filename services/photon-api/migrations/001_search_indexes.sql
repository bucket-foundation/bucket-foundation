CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX CONCURRENTLY IF NOT EXISTS photons_full_meaning_trgm ON photons_full USING gin (lower(meaning_en) gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS photons_full_ipa_norm_trgm ON photons_full USING gin ((translate(coalesce(ipa,''), '/[]ˈˌ.ː ', '')) gin_trgm_ops) WHERE ipa IS NOT NULL;
