/**
 * Reads that drop their error, and why each is tolerated for now.
 *
 * A PostgREST call resolves with `{ data, error }`. Destructuring only
 * `data` turns a failed read into an empty result, and the surface then
 * reports that emptiness as fact. This repository has shipped that four
 * times: an assignment list that rendered "No assignments yet" on an
 * outage, a loop panel that showed the first-run screen to a learner
 * with a started deck, a graph route that served an empty standing map,
 * and a branch counter that answered a graph with no branches in it.
 *
 * An entry is tolerable when the answer is the same either way. A
 * `maybeSingle()` lookup whose miss and whose failure both mean "carry
 * on without it" is one. A read whose emptiness reaches a person as a
 * statement about their own work is not, and none of those belong here.
 */

export interface ErrorException {
  /** `path:line` as `error-scan` reports it. */
  at: string;
  /** Why a failed read and an empty result mean the same thing here. */
  because: string;
}

export const ERROR_EXCEPTIONS: ErrorException[] = [
  { at: "src/lib/research-os/class-db.ts::isClassStaffAnywhere::class_members::data::1", because: "isClassStaffAnywhere answers an authorization gate, and false is the closed direction. A failed read hides staff navigation from a teacher for as long as the outage lasts, and grants nobody anything. The cost of the other direction is a stranger reaching a staff page." },
  { at: "src/app/api/academy/credential/verify/route.ts::liveProfile::academy_profiles::data::1", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/app/m/[handle]/page.tsx::fetchPublicProfile::academy_profiles::data::1", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/academy/credential/store.ts::listCredentialsForUser::<unknown>::data::1", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/academy/credential/store.ts::getCredential::<unknown>::data::1", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/auth/identity.ts::getIdentity::identities::data::1", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/auth/identity.ts::getIdentity::identities::made::1", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/check-attempts-db.ts::dbGetPendingAttempt::check_attempts::data::1", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/check-attempts-db.ts::dbPurgeExpiredAttempts::purge_expired_check_attempts::data::1", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/db.ts::loadRecentCheckEvents::learner_node_state::data::1", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/db.ts::loadForcingEnabledForLearner::class_members::memberRows::1", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/db.ts::loadForcingEnabledForLearner::classes::classRows::1", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/db.ts::loadSecondSourceRequiredForLearner::class_members::memberRows::1", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/db.ts::loadSecondSourceRequiredForLearner::classes::classRows::1", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/db.ts::loadAncestorRows::prereq_ancestor::data::1", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/db.ts::findNodeBySlug::nodes::data::1", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/db.ts::findNodeById::nodes::data::1", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/db.ts::loadGame::learner_profiles::data::1", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/classes.ts::joinClass::class_members::existing::1", because: "a maybeSingle lookup whose miss and whose failure both mean carry on without it" },
  { at: "src/lib/research-os/db.ts::awardProgress::learner_profiles::exists::1", because: "not yet triaged: a failed read here answers an empty collection, and nothing has checked what that reaches" },
  { at: "src/lib/research-os/learn-sync.ts::syncAcademyMastery::learner_node_state::states::1", because: "not yet triaged: a failed read here answers an empty collection, and nothing has checked what that reaches" },
  { at: "src/lib/research-os/production-node.ts::createNodeFromProduction::nodes::node::1", because: "a maybeSingle lookup whose miss and whose failure both mean carry on without it" },
  { at: "src/app/api/research-os/hypothesize/route.ts::POST::nodes::node::1", because: "not yet triaged: a failed read here answers an empty collection, and nothing has checked what that reaches" },
  { at: "src/app/api/research-os/node/route.ts::GET::productions::data::1", because: "not yet triaged: a failed read here answers an empty collection, and nothing has checked what that reaches" },
  { at: "src/app/api/research-os/payee/route.ts::load::learner_profiles::data::1", because: "a maybeSingle lookup whose miss and whose failure both mean carry on without it" },
  { at: "src/app/api/research-os/probe/route.ts::POST::edges::prereqEdges::1", because: "not yet triaged: a failed read here answers an empty collection, and nothing has checked what that reaches" },
  { at: "src/app/api/research-os/production/route.ts::GET::nodes::nodes::1", because: "not yet triaged: a failed read here answers an empty collection, and nothing has checked what that reaches" },
  { at: "src/app/api/research-os/search/route.ts::GET::learner_node_state::st::1", because: "not yet triaged: a failed read here answers an empty collection, and nothing has checked what that reaches" },
  { at: "src/app/api/research-os/state/route.ts::POST::learner_node_state::existing::1", because: "not yet triaged: a failed read here answers an empty collection, and nothing has checked what that reaches" },
  { at: "src/app/api/research-os/workspace/route.ts::POST::nodes::sourceNodes::1", because: "not yet triaged: a failed read here answers an empty collection, and nothing has checked what that reaches" },
  { at: "src/app/api/research-os/workspace/route.ts::POST::nodes::pendingNode::1", because: "a maybeSingle lookup whose miss and whose failure both mean carry on without it" },
  { at: "src/app/api/research-os/workspace/route.ts::POST::edges::prereqEdges::1", because: "not yet triaged: a failed read here answers an empty collection, and nothing has checked what that reaches" },
  { at: "src/app/api/research-os/workspace/route.ts::POST::learner_node_state::existingState::1", because: "not yet triaged: a failed read here answers an empty collection, and nothing has checked what that reaches" },
];
