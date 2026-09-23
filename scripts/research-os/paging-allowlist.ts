/**
 * Reads that filter on a list of ids without paging, and why each one is
 * tolerated for now.
 *
 * `scripts/research-os/paging-scan.ts` finds every such read by walking
 * the AST. A read is at risk when the number of rows it can return
 * exceeds PostgREST's cap of 1,000, which is a different question from
 * how long the id list is. Two shapes:
 *
 *   many rows per filter value   class_members by class_id, assignments
 *                                by class_id. These were paged, because
 *                                an ordinary class overflows the cap.
 *
 *   one row per id               nodes by id, classes by id,
 *                                learner_profiles by learner_id. These
 *                                truncate only when the id list itself
 *                                passes 1,000, which needs a caller
 *                                holding that many ids.
 *
 * Every entry here is the second shape. None is safe forever: a caller
 * that grows past a thousand ids turns one into a silent truncation, and
 * the entry says which caller to watch. Removing an entry without fixing
 * the read fails the gate, and so does adding a read that is not listed.
 */

/**
 * Six of the reasons in the first version of this list were false
 * against the schema, and one contradicted this file's own docstring.
 * They were generated from the table name without reading the
 * constraints. A reason now has to cite a primary key, a unique index or
 * a pinning `eq()`, or say UNTRIAGED, and the gate checks that.
 */
export interface PagingException {
  /** `path:line` as `paging-scan` reports it. */
  at: string;
  /** Why this read cannot overflow today. */
  because: string;
}

export const PAGING_EXCEPTIONS: PagingException[] = [
  { at: "src/lib/research-os/read-access.ts::nodes::nodes::1", because: "nodes.id is the primary key, so one row per id, and the loop hands in() one chunk at a time" },
  { at: "src/lib/research-os/inference/merge-actions.ts::listMergeProposals::nodes::1", because: "graph.nodes.slug is not null unique, so one row per slug, and the loop hands in() at most 100 slugs a call" },
  { at: "scripts/research-os/ingest/canon-all.ts::apply::nodes::1", because: "graph.nodes.slug is not null unique, so one row per slug, and the loop hands in() at most 200 slugs a call" },
  { at: "scripts/research-os/ingest/lib/apply-drafts.ts::applyDrafts::nodes::1", because: "graph.nodes.slug is not null unique, so one row per slug, and the loop hands in() at most 60 slugs a call" },
  { at: "src/lib/research-os/classes.ts::listMyClasses::classes::1", because: "classes.id is the primary key, so one row per id and at most as many rows as the list is long" },
  { at: "src/lib/research-os/consent.ts::resolveConsentPaths::classes::1", because: "classes.id is the primary key, so one row per id and at most as many rows as the list is long" },
  { at: "src/lib/research-os/db.ts::loadForcingEnabledForLearner::classes::1", because: "classes.id is the primary key, so one row per id and at most as many rows as the list is long" },
  { at: "src/lib/research-os/db.ts::loadSecondSourceRequiredForLearner::classes::1", because: "classes.id is the primary key, so one row per id and at most as many rows as the list is long" },
  { at: "src/lib/research-os/db.ts::loadXpForLearners::learner_profiles::1", because: "UNTRIAGED: reads learner_profiles by learner_id, and nothing here has checked the rows per value against the schema" },
  { at: "src/lib/research-os/db.ts::isGuidanceEnabledForLearner::classes::1", because: "classes.id is the primary key, so one row per id and at most as many rows as the list is long" },
  { at: "src/lib/research-os/db.ts::resolveNodeIdsBySlug::nodes::1", because: "nodes.slug is unique, so one row per slug" },
  { at: "src/lib/research-os/inference/review-actions.ts::nodesBySlug::nodes::1", because: "nodes.slug is unique, so one row per slug" },
  { at: "src/lib/research-os/inference/review-actions.ts::branchesResting::nodes::1", because: "nodes.id is the primary key, so one row per id and at most as many rows as the list is long" },
  { at: "src/lib/research-os/learn-sync.ts::syncAcademyMastery::nodes::1", because: "UNTRIAGED: reads nodes by ?, and nothing here has checked the rows per value against the schema" },
  { at: "src/lib/research-os/learn-sync.ts::syncAcademyMastery::learner_node_state::1", because: "learner_node_state has primary key (learner_id, node_id) and learner_id is pinned with eq, so one row per node" },
  { at: "src/lib/research-os/roster/apply.ts::applyRosterImport::classes::1", because: "UNTRIAGED: reads classes by sourced_id, and nothing here has checked the rows per value against the schema" },
  { at: "src/app/api/research-os/probe/route.ts::POST::nodes::1", because: "nodes.id is the primary key, so one row per id and at most as many rows as the list is long" },
  { at: "src/app/api/research-os/production/route.ts::GET::nodes::1", because: "nodes.id is the primary key, so one row per id and at most as many rows as the list is long" },
  { at: "src/app/api/research-os/search/route.ts::GET::learner_node_state::1", because: "learner_node_state has primary key (learner_id, node_id) and learner_id is pinned with eq, so one row per node" },
  { at: "src/app/api/research-os/state/route.ts::GET::learner_node_state::1", because: "learner_node_state has primary key (learner_id, node_id) and learner_id is pinned with eq, so one row per node" },
  { at: "src/app/api/research-os/workspace/route.ts::POST::nodes::1", because: "nodes.id is the primary key, so one row per id and at most as many rows as the list is long" },
];
