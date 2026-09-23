export interface PagingException {
  at: string;
  because: string;
}

export const PAGING_EXCEPTIONS: PagingException[] = [
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
  { at: "src/lib/research-os/inference/review-actions.ts::lowestIdeaTier::nodes::1", because: "limit(1) after the order on tier caps the read at one row by construction" },
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
  { at: "src/lib/research-os/medallion/review-view.ts::silverForReview::silver_items::1", because: "silver_items.id is the primary key, so one row per id, and the loop hands in() at most 40 ids a call" },
  { at: "scripts/research-os/ingest/lib/medallion-shadow.ts::existingNodeIds::nodes::1", because: "graph.nodes.slug is not null unique, so one row per slug, and the loop hands in() at most 60 slugs a call" },
  { at: "scripts/research-os/ingest/lib/medallion-shadow.ts::writeImporterLineage::nodes::1", because: "graph.nodes.slug is not null unique, so one row per slug, and the loop hands in() at most 60 slugs a call" },
  { at: "scripts/research-os/medallion/enqueue-demotions.ts::main::nodes::1", because: "nodes.id is the primary key, so one row per id, and the loop hands in() at most 100 ids a call" },
];
