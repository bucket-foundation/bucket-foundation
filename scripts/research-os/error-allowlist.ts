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
  { at: "src/lib/research-os/access-db.ts:100", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/access-db.ts:106", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/access-db.ts:116", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/access-db.ts:126", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/access-db.ts:87", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/access-db.ts:93", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/check-attempts-db.ts:113", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/check-attempts-db.ts:159", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/class-db.ts:283", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/class-db.ts:46", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/class-db.ts:52", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/class-db.ts:93", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/classes.ts:43", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/db.ts:1002", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/db.ts:579", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/db.ts:582", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/db.ts:606", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/db.ts:609", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/db.ts:674", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/db.ts:717", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/db.ts:740", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/db.ts:904", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/production-node.ts:60", because: "not yet triaged, empty-guard: this read binds error and returns the same empty value either way, and nothing here has read the caller to say whether that is right" },
  { at: "src/lib/research-os/access-db.ts:72", because: "not yet triaged: a failed read here answers an empty collection, and nothing has checked what that reaches" },
  { at: "src/lib/research-os/class-db.ts:115", because: "not yet triaged: a failed read here answers an empty collection, and nothing has checked what that reaches" },
  { at: "src/lib/research-os/classes.ts:46", because: "not yet triaged: a failed read here answers an empty collection, and nothing has checked what that reaches" },
  { at: "src/lib/research-os/classes.ts:91", because: "a maybeSingle lookup whose miss and whose failure both mean carry on without it" },
  { at: "src/lib/research-os/db.ts:356", because: "a maybeSingle lookup whose miss and whose failure both mean carry on without it" },
  { at: "src/lib/research-os/db.ts:947", because: "not yet triaged: a failed read here answers an empty collection, and nothing has checked what that reaches" },
  { at: "src/lib/research-os/learn-sync.ts:47", because: "not yet triaged: a failed read here answers an empty collection, and nothing has checked what that reaches" },
  { at: "src/lib/research-os/production-node.ts:56", because: "a maybeSingle lookup whose miss and whose failure both mean carry on without it" },
  { at: "src/app/api/research-os/consent/route.ts:143", because: "a maybeSingle lookup whose miss and whose failure both mean carry on without it" },
  { at: "src/app/api/research-os/hypothesize/route.ts:97", because: "not yet triaged: a failed read here answers an empty collection, and nothing has checked what that reaches" },
  { at: "src/app/api/research-os/node/route.ts:83", because: "not yet triaged: a failed read here answers an empty collection, and nothing has checked what that reaches" },
  { at: "src/app/api/research-os/payee/route.ts:25", because: "a maybeSingle lookup whose miss and whose failure both mean carry on without it" },
  { at: "src/app/api/research-os/probe/route.ts:129", because: "not yet triaged: a failed read here answers an empty collection, and nothing has checked what that reaches" },
  { at: "src/app/api/research-os/probe/route.ts:133", because: "not yet triaged: a failed read here answers an empty collection, and nothing has checked what that reaches" },
  { at: "src/app/api/research-os/production/route.ts:105", because: "not yet triaged: a failed read here answers an empty collection, and nothing has checked what that reaches" },
  { at: "src/app/api/research-os/review/route.ts:189", because: "not yet triaged: a failed read here answers an empty collection, and nothing has checked what that reaches" },
  { at: "src/app/api/research-os/search/route.ts:42", because: "not yet triaged: a failed read here answers an empty collection, and nothing has checked what that reaches" },
  { at: "src/app/api/research-os/state/route.ts:114", because: "not yet triaged: a failed read here answers an empty collection, and nothing has checked what that reaches" },
  { at: "src/app/api/research-os/workspace/route.ts:431", because: "not yet triaged: a failed read here answers an empty collection, and nothing has checked what that reaches" },
  { at: "src/app/api/research-os/workspace/route.ts:468", because: "a maybeSingle lookup whose miss and whose failure both mean carry on without it" },
  { at: "src/app/api/research-os/workspace/route.ts:554", because: "not yet triaged: a failed read here answers an empty collection, and nothing has checked what that reaches" },
  { at: "src/app/api/research-os/workspace/route.ts:558", because: "not yet triaged: a failed read here answers an empty collection, and nothing has checked what that reaches" },
  { at: "src/app/api/research-os/workspace/route.ts:591", because: "not yet triaged: a failed read here answers an empty collection, and nothing has checked what that reaches" },
];
