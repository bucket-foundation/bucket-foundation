/**
 * Every unique key on every table under the `graph` schema, as the
 * paging gates read it.
 *
 * A paged read needs a total order. Postgres is free to return the rows
 * of a tie group in any order across LIMIT and OFFSET, so a page
 * boundary landing inside one repeats a row on one page and drops
 * another, with no error and no sign of it in the result. An order is
 * total when its keys cover a unique key of the table.
 *
 * Why a map rather than a rule of thumb: four of these tables have a
 * composite primary key, and a read of one of them ordered on a single
 * column looks right. `class_members` ordered on `learner_id` reads
 * like a sorted roster, and a learner enrolled in two classes of the
 * same chunk sits in a tie group with another. Two reads shipped that
 * way and under-counted a roster.
 *
 * Partial unique indexes are left out. `evidence_source_admissions` has
 * a unique `(source_id, scope)` under `where status = 'active'`, which
 * makes a read total only when it also pins the predicate, and treating
 * it as a key would excuse reads that do not.
 *
 * `scripts/test-research-os-access-paging.ts` checks this map against
 * the live catalog, so a migration that adds or drops a key fails a
 * test instead of silently widening what the gate accepts.
 */
export const GRAPH_UNIQUE_KEYS: Record<string, readonly (readonly string[])[]> = {
  access_requests: [["id"]],
  assignments: [["id"]],
  check_attempts: [["id"]],
  class_members: [["class_id", "learner_id"]],
  classes: [["id"], ["source_system", "sourced_id"]],
  consent_requests: [["id"]],
  edge_flags: [["id"], ["edge_id", "learner_id"]],
  edge_proposals: [["id"], ["from_slug", "to_slug"]],
  edges: [["id"], ["from_id", "to_id", "kind"]],
  evidence_source_admissions: [["source_id", "source_revision"]],
  import_files: [["id"], ["import_id", "sha256"]],
  imports: [["id"]],
  irreducible_proposals: [["id"], ["node_slug"]],
  learner_node_state: [["learner_id", "node_id"]],
  learner_profiles: [["learner_id"], ["source_system", "sourced_id"]],
  level_overrides: [["id"]],
  merge_proposals: [["id"], ["keep_slug", "drop_slug"]],
  node_grants: [["id"], ["node_id", "grantee_group", "role"], ["node_id", "grantee_id", "role"]],
  node_proposals: [["id"], ["key"]],
  nodes: [["id"], ["slug"]],
  prereq_ancestor: [["node_id", "ancestor_id"]],
  privacy_events: [["id"]],
  productions: [["id"]],
  reviewer_candidates: [["id"], ["source_system", "sourced_id"]],
  source_quote_receipts: [["id"], ["learner_id", "idempotency_key"]],
  teacher_reviews: [["id"]],
};

/**
 * Whether `ordered` plus `pinned` covers some unique key of the table.
 *
 * A column pinned to one value with `eq()` cannot vary across the
 * result, so it contributes to the order for free: `learner_node_state`
 * read with `.eq("learner_id", x).order("node_id")` is total. A column
 * handed a list with `in()` takes many values and pins nothing.
 *
 * A table this map does not name answers true. The gate polices the
 * graph schema, and an unknown table is out of its scope.
 */
export function orderIsTotal(table: string, ordered: readonly string[], pinned: readonly string[]): boolean {
  const keys = GRAPH_UNIQUE_KEYS[table];
  if (!keys) return true;
  return keys.some((key) => key.every((col) => ordered.includes(col) || pinned.includes(col)));
}
