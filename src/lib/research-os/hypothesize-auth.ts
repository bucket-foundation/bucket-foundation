/**
 * Ownership check for `/api/research-os/hypothesize` (ros-13, "apply the
 * research-os-hypothesize-route patch"). Pure, dependency-free, matching
 * engine-bridge.ts's own convention: unit-testable with a plain object and
 * no database (scripts/test-research-os-hypothesize-route.ts).
 */

/**
 * Whether `learnerId` may forward `production` to the engine.
 * `production === null` covers both "no such row" and "the row belongs to
 * someone else": the route's own lookup does not filter by learner, so a
 * foreign production's `production` argument here is a real row with a
 * different `learner_id`, not `null`; both cases read as unauthorized here,
 * and the route responds with the same 404 either way rather than a 403
 * that would confirm the id exists (closes the ownership gap PR #6's own
 * `production/route.ts` POST handler left open, flagged in that PR's
 * review).
 */
export function authorizeHypothesize(
  production: { learner_id?: string } | null,
  learnerId: string,
): boolean {
  return production !== null && production.learner_id === learnerId;
}
