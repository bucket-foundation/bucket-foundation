export interface UniqueKey {
  readonly columns: readonly string[];
  readonly nullable: readonly string[];
}

export const GRAPH_UNIQUE_KEYS: Record<string, readonly UniqueKey[]> = {
  access_requests: [{ columns: ["id"], nullable: [] }],
  assignments: [{ columns: ["id"], nullable: [] }],
  bronze_file_paths: [{ columns: ["source_id", "source_revision", "repo_path"], nullable: [] }],
  check_attempts: [{ columns: ["id"], nullable: [] }],
  class_members: [{ columns: ["class_id", "learner_id"], nullable: [] }],
  classes: [{ columns: ["id"], nullable: [] }, { columns: ["source_system", "sourced_id"], nullable: ["source_system", "sourced_id"] }],
  consent_requests: [{ columns: ["id"], nullable: [] }],
  country_regions: [{ columns: ["adm0_a3"], nullable: [] }],
  edge_flags: [{ columns: ["id"], nullable: [] }, { columns: ["edge_id", "learner_id"], nullable: [] }],
  edge_proposals: [{ columns: ["id"], nullable: [] }, { columns: ["from_slug", "to_slug"], nullable: [] }],
  edges: [{ columns: ["id"], nullable: [] }, { columns: ["from_id", "to_id", "kind"], nullable: [] }],
  evidence_source_admissions: [{ columns: ["source_id", "source_revision"], nullable: [] }],
  factoids: [{ columns: ["id"], nullable: [] }, { columns: ["silver_item_id", "role"], nullable: [] }],
  gold_lineage: [{ columns: ["id"], nullable: [] }],
  han_components: [{ columns: ["char", "ord"], nullable: [] }],
  history_reference_counts: [{ columns: ["run_date", "kind", "period", "region"], nullable: [] }],
  import_files: [{ columns: ["id"], nullable: [] }, { columns: ["import_id", "sha256"], nullable: [] }],
  import_quota: [{ columns: ["owner_id"], nullable: [] }],
  imports: [{ columns: ["id"], nullable: [] }],
  irreducible_proposals: [{ columns: ["id"], nullable: [] }, { columns: ["node_slug"], nullable: [] }],
  learner_node_state: [{ columns: ["learner_id", "node_id"], nullable: [] }],
  learner_profiles: [{ columns: ["learner_id"], nullable: [] }, { columns: ["source_system", "sourced_id"], nullable: ["source_system", "sourced_id"] }],
  level_overrides: [{ columns: ["id"], nullable: [] }],
  llm_usage: [{ columns: ["subject", "route", "day"], nullable: [] }],
  medallion_withdrawn_nodes: [{ columns: ["node_id"], nullable: [] }],
  merge_proposals: [{ columns: ["id"], nullable: [] }, { columns: ["keep_slug", "drop_slug"], nullable: [] }],
  node_embeddings: [{ columns: ["node_id", "model"], nullable: [] }],
  node_external_ids: [{ columns: ["authority", "external_id"], nullable: [] }],
  node_grants: [{ columns: ["id"], nullable: [] }, { columns: ["node_id", "grantee_group", "role"], nullable: ["grantee_group"] }, { columns: ["node_id", "grantee_id", "role"], nullable: ["grantee_id"] }],
  node_proposals: [{ columns: ["id"], nullable: [] }, { columns: ["key"], nullable: [] }],
  node_words: [{ columns: ["id"], nullable: [] }, { columns: ["node_id", "lang", "word"], nullable: [] }],
  nodes: [{ columns: ["id"], nullable: [] }, { columns: ["slug"], nullable: [] }],
  nsm_colex: [{ columns: ["prime_a", "prime_b", "lang"], nullable: [] }],
  nsm_exponents: [{ columns: ["prime_id", "lang", "word"], nullable: [] }],
  nsm_links: [{ columns: ["id"], nullable: [] }, { columns: ["node_id", "prime_id"], nullable: [] }],
  nsm_primes: [{ columns: ["id"], nullable: [] }, { columns: ["ord"], nullable: [] }],
  periods: [{ columns: ["id"], nullable: [] }],
  places: [{ columns: ["id"], nullable: [] }, { columns: ["slug"], nullable: [] }, { columns: ["pleiades_id"], nullable: ["pleiades_id"] }, { columns: ["tgn_id"], nullable: ["tgn_id"] }, { columns: ["geonames_id"], nullable: ["geonames_id"] }, { columns: ["wikidata_qid"], nullable: ["wikidata_qid"] }, { columns: ["site_node_id"], nullable: ["site_node_id"] }],
  prereq_ancestor: [{ columns: ["node_id", "ancestor_id"], nullable: [] }],
  privacy_events: [{ columns: ["id"], nullable: [] }],
  productions: [{ columns: ["id"], nullable: [] }],
  reviewer_candidates: [{ columns: ["id"], nullable: [] }, { columns: ["source_system", "sourced_id"], nullable: [] }],
  silver_items: [{ columns: ["id"], nullable: [] }, { columns: ["source_id", "source_revision", "parser", "parser_revision", "kind", "span_start", "span_end", "subject"], nullable: [] }],
  source_quote_receipts: [{ columns: ["id"], nullable: [] }, { columns: ["learner_id", "idempotency_key"], nullable: [] }],
  teacher_reviews: [{ columns: ["id"], nullable: [] }],
};

export function orderIsTotal(table: string, ordered: readonly string[], pinned: readonly string[]): boolean {
  const keys = GRAPH_UNIQUE_KEYS[table];
  if (!keys) return true;
  return keys.some((key) =>
    key.columns.every((col) => {
      if (key.nullable.includes(col)) return pinned.includes(col);
      return ordered.includes(col) || pinned.includes(col);
    }),
  );
}
