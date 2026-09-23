/**
 * Every unique key on every table under the `graph` schema, as the
 * paging gates read it, with the nullability of each column.
 *
 * A paged read needs a total order. Postgres is free to return the rows
 * of a tie group in any order across LIMIT and OFFSET, so a page
 * boundary landing inside one repeats a row on one page and drops
 * another, with no error and no sign of it in the result. An order is
 * total when its columns cover a unique key that admits no duplicates
 * over the rows being read.
 *
 * Nullability is here because Postgres indexes are NULLS DISTINCT by
 * default: a unique index over a nullable column admits any number of
 * rows sharing the non-null part. `node_grants` carries a unique
 * `(node_id, grantee_group, role)` and a unique
 * `(node_id, grantee_id, role)`, and every group grant has a null
 * `grantee_id`, so a thousand group grants on one node with role 'view'
 * are one tie group under the second. Counting that as a key would have
 * this gate approve the exact read it exists to refuse. A nullable
 * column counts only where the read pins it with `eq()`, which excludes
 * the nulls.
 *
 * Why a map rather than a rule of thumb: four of these tables have a
 * composite primary key, and a read of one ordered on a single column
 * looks right. `class_members` ordered on `learner_id` reads like a
 * sorted roster, and a learner enrolled in two classes of the same
 * chunk sits in a tie group with another. Two reads shipped that way
 * and under-counted a roster.
 *
 * Partial unique indexes are left out. `evidence_source_admissions` has
 * a unique `(source_id, scope)` under `where status = 'active'`, which
 * makes a read total only when it also pins the predicate, and treating
 * it as a key would excuse reads that do not.
 *
 * `scripts/test-research-os-access-paging.ts` checks this map against
 * the live catalog, columns and nullability both, so a migration that
 * changes a key fails a test instead of silently widening what the gate
 * accepts. It checks both directions, and both have fired: CI carried
 * keys this map lacked when the map was generated before a migration
 * landed, and this map carried `source_quote_receipts` keys CI did not
 * have, because a development database accumulates tables from branches
 * that never merged and is a superset of what any one branch builds.
 * Generate this from a database holding only this branch's migrations,
 * or check every table here against them.
 */
export interface UniqueKey {
  readonly columns: readonly string[];
  /** The subset of `columns` that admits NULL. */
  readonly nullable: readonly string[];
}

export const GRAPH_UNIQUE_KEYS: Record<string, readonly UniqueKey[]> = {
  access_requests: [{ columns: ["id"], nullable: [] }],
  assignments: [{ columns: ["id"], nullable: [] }],
  check_attempts: [{ columns: ["id"], nullable: [] }],
  class_members: [{ columns: ["class_id", "learner_id"], nullable: [] }],
  classes: [{ columns: ["id"], nullable: [] }, { columns: ["source_system", "sourced_id"], nullable: ["source_system", "sourced_id"] }],
  consent_requests: [{ columns: ["id"], nullable: [] }],
  edge_flags: [{ columns: ["id"], nullable: [] }, { columns: ["edge_id", "learner_id"], nullable: [] }],
  edge_proposals: [{ columns: ["id"], nullable: [] }, { columns: ["from_slug", "to_slug"], nullable: [] }],
  edges: [{ columns: ["id"], nullable: [] }, { columns: ["from_id", "to_id", "kind"], nullable: [] }],
  evidence_source_admissions: [{ columns: ["source_id", "source_revision"], nullable: [] }],
  import_files: [{ columns: ["id"], nullable: [] }, { columns: ["import_id", "sha256"], nullable: [] }],
  import_quota: [{ columns: ["owner_id"], nullable: [] }],
  imports: [{ columns: ["id"], nullable: [] }],
  irreducible_proposals: [{ columns: ["id"], nullable: [] }, { columns: ["node_slug"], nullable: [] }],
  learner_node_state: [{ columns: ["learner_id", "node_id"], nullable: [] }],
  learner_profiles: [{ columns: ["learner_id"], nullable: [] }, { columns: ["source_system", "sourced_id"], nullable: ["source_system", "sourced_id"] }],
  level_overrides: [{ columns: ["id"], nullable: [] }],
  merge_proposals: [{ columns: ["id"], nullable: [] }, { columns: ["keep_slug", "drop_slug"], nullable: [] }],
  node_grants: [{ columns: ["id"], nullable: [] }, { columns: ["node_id", "grantee_group", "role"], nullable: ["grantee_group"] }, { columns: ["node_id", "grantee_id", "role"], nullable: ["grantee_id"] }],
  node_proposals: [{ columns: ["id"], nullable: [] }, { columns: ["key"], nullable: [] }],
  nodes: [{ columns: ["id"], nullable: [] }, { columns: ["slug"], nullable: [] }],
  prereq_ancestor: [{ columns: ["node_id", "ancestor_id"], nullable: [] }],
  privacy_events: [{ columns: ["id"], nullable: [] }],
  productions: [{ columns: ["id"], nullable: [] }],
  reviewer_candidates: [{ columns: ["id"], nullable: [] }, { columns: ["source_system", "sourced_id"], nullable: [] }],
  teacher_reviews: [{ columns: ["id"], nullable: [] }],
};

/**
 * Whether `ordered` plus `pinned` covers some unique key of the table.
 *
 * A column pinned to one value with `eq()` cannot vary across the
 * result, so it contributes to the order for free: `learner_node_state`
 * read with `.eq("learner_id", x).order("node_id")` is total. A column
 * handed a list with `in()` takes many values and pins nothing. A
 * nullable column has to be pinned, because ordering on it leaves every
 * row that is null to it in one tie group.
 *
 * A table this map does not name answers true. The gate polices the
 * graph schema, and an unknown table is out of its scope.
 */
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
