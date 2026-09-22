/**
 * Every read the allowlist is permitted to name.
 *
 * The ceilings count entries and a count cannot tell a repair from a
 * swap: repairing one trivial lookup paid for one new dropped read in
 * an authorization path, and every test stayed green. This is the set,
 * so the list may only shrink against it. Adding a read means editing
 * this file, which is a deliberate line in a diff whose only purpose is
 * to be that.
 */
export const ALLOWED_BASELINE: readonly string[] = [
  "src/app/api/academy/credential/verify/route.ts::liveProfile::academy_profiles::1",
  "src/app/api/research-os/consent/route.ts::POST::class_members::1",
  "src/app/api/research-os/hypothesize/route.ts::POST::nodes::1",
  "src/app/api/research-os/node/route.ts::GET::productions::1",
  "src/app/api/research-os/payee/route.ts::load::learner_profiles::1",
  "src/app/api/research-os/probe/route.ts::POST::edges::1",
  "src/app/api/research-os/probe/route.ts::POST::nodes::1",
  "src/app/api/research-os/production/route.ts::GET::nodes::1",
  "src/app/api/research-os/review/route.ts::GET::nodes::1",
  "src/app/api/research-os/search/route.ts::GET::learner_node_state::1",
  "src/app/api/research-os/state/route.ts::POST::learner_node_state::1",
  "src/app/api/research-os/workspace/route.ts::POST::edges::1",
  "src/app/api/research-os/workspace/route.ts::POST::learner_node_state::1",
  "src/app/api/research-os/workspace/route.ts::POST::nodes::1",
  "src/app/api/research-os/workspace/route.ts::POST::nodes::2",
  "src/app/api/research-os/workspace/route.ts::POST::nodes::3",
  "src/app/m/[handle]/page.tsx::fetchPublicProfile::academy_profiles::1",
  "src/lib/academy/credential/store.ts::getCredential::<unknown>::1",
  "src/lib/academy/credential/store.ts::listCredentialsForUser::<unknown>::1",
  "src/lib/academy/credential/store.ts::revokeCredential::<unknown>::1",
  "src/lib/auth/identity.ts::getIdentity::identities::1",
  "src/lib/auth/identity.ts::getIdentity::identities::2",
  "src/lib/research-os/access-db.ts::filterSubgraphForViewer::node_grants::1",
  "src/lib/research-os/access-db.ts::loadGrants::node_grants::1",
  "src/lib/research-os/access-db.ts::loadNodeAccess::nodes::1",
  "src/lib/research-os/access-db.ts::loadOwnedNodes::nodes::1",
  "src/lib/research-os/access-db.ts::loadRequestsByRequester::access_requests::1",
  "src/lib/research-os/access-db.ts::loadRequestsForNode::access_requests::1",
  "src/lib/research-os/access-db.ts::loadViewerGroups::class_members::1",
  "src/lib/research-os/check-attempts-db.ts::dbGetPendingAttempt::check_attempts::1",
  "src/lib/research-os/check-attempts-db.ts::dbPurgeExpiredAttempts::purge_expired_check_attempts::1",
  "src/lib/research-os/class-db.ts::isClassStaffAnywhere::class_members::1",
  "src/lib/research-os/classes.ts::joinClass::class_members::1",
  "src/lib/research-os/db.ts::awardProgress::learner_profiles::1",
  "src/lib/research-os/db.ts::findNodeById::nodes::1",
  "src/lib/research-os/db.ts::findNodeBySlug::nodes::1",
  "src/lib/research-os/db.ts::loadAncestorRows::prereq_ancestor::1",
  "src/lib/research-os/db.ts::loadCurrentStage::learner_node_state::1",
  "src/lib/research-os/db.ts::loadForcingEnabledForLearner::class_members::1",
  "src/lib/research-os/db.ts::loadForcingEnabledForLearner::classes::1",
  "src/lib/research-os/db.ts::loadGame::learner_profiles::1",
  "src/lib/research-os/db.ts::loadRecentCheckEvents::learner_node_state::1",
  "src/lib/research-os/db.ts::loadSecondSourceRequiredForLearner::class_members::1",
  "src/lib/research-os/db.ts::loadSecondSourceRequiredForLearner::classes::1",
  "src/lib/research-os/learn-sync.ts::syncAcademyMastery::learner_node_state::1",
  "src/lib/research-os/production-node.ts::createNodeFromProduction::nodes::1",
  "src/lib/research-os/production-node.ts::createNodeFromProduction::nodes::2",
];
