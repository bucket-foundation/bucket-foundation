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

export interface PagingException {
  /** `path:line` as `paging-scan` reports it. */
  at: string;
  /** Why this read cannot overflow today. */
  because: string;
}

export const PAGING_EXCEPTIONS: PagingException[] = [
  { at: "src/lib/research-os/access-db.ts:72", because: "reviewed: node_grants by unknown, bounded by the id list rather than by rows per value" },
  { at: "src/lib/research-os/class-db.ts:105", because: "reviewed: assignments by unknown, bounded by the id list rather than by rows per value" },
  { at: "src/lib/research-os/class-db.ts:115", because: "one row per id in nodes, so it returns at most as many rows as the list is long" },
  { at: "src/lib/research-os/class-db.ts:116", because: "one row per id in nodes, so it returns at most as many rows as the list is long" },
  { at: "src/lib/research-os/class-db.ts:117", because: "one row per id in nodes, so it returns at most as many rows as the list is long" },
  { at: "src/lib/research-os/class-db.ts:118", because: "one row per id in classes, so it returns at most as many rows as the list is long" },
  { at: "src/lib/research-os/classes.ts:46", because: "one row per id in classes, so it returns at most as many rows as the list is long" },
  { at: "src/lib/research-os/consent.ts:195", because: "one row per id in classes, so it returns at most as many rows as the list is long" },
  { at: "src/lib/research-os/db.ts:582", because: "one row per id in classes, so it returns at most as many rows as the list is long" },
  { at: "src/lib/research-os/db.ts:609", because: "one row per id in classes, so it returns at most as many rows as the list is long" },
  { at: "src/lib/research-os/db.ts:961", because: "one row per id in learner_profiles, so it returns at most as many rows as the list is long" },
  { at: "src/lib/research-os/db.ts:1067", because: "one row per id in classes, so it returns at most as many rows as the list is long" },
  { at: "src/lib/research-os/db.ts:1170", because: "one row per id in nodes, so it returns at most as many rows as the list is long" },
  { at: "src/lib/research-os/inference/review-actions.ts:80", because: "one row per id in nodes, so it returns at most as many rows as the list is long" },
  { at: "src/lib/research-os/inference/review-actions.ts:189", because: "one row per id in nodes, so it returns at most as many rows as the list is long" },
  { at: "src/lib/research-os/learn-sync.ts:35", because: "reviewed: nodes by unknown, bounded by the id list rather than by rows per value" },
  { at: "src/lib/research-os/learn-sync.ts:47", because: "one row per learner and node, and the other side of the pair is pinned with eq(), so it returns at most as many rows as the list is long" },
  { at: "src/lib/research-os/roster/apply.ts:161", because: "reviewed: classes by sourced_id, bounded by the id list rather than by rows per value" },
  { at: "src/app/api/research-os/class/route.ts:116", because: "one row per learner and node, and the other side of the pair is pinned with eq(), so it returns at most as many rows as the list is long" },
  { at: "src/app/api/research-os/class/route.ts:150", because: "one row per learner and node, and the other side of the pair is pinned with eq(), so it returns at most as many rows as the list is long" },
  { at: "src/app/api/research-os/class/route.ts:162", because: "a learner has few productions per target and the learner is pinned with eq()" },
  { at: "src/app/api/research-os/node/route.ts:110", because: "one row per learner and node, and the other side of the pair is pinned with eq(), so it returns at most as many rows as the list is long" },
  { at: "src/app/api/research-os/probe/route.ts:129", because: "one row per id in nodes, so it returns at most as many rows as the list is long" },
  { at: "src/app/api/research-os/production/route.ts:105", because: "one row per id in nodes, so it returns at most as many rows as the list is long" },
  { at: "src/app/api/research-os/review/route.ts:189", because: "one row per id in nodes, so it returns at most as many rows as the list is long" },
  { at: "src/app/api/research-os/search/route.ts:42", because: "one row per learner and node, and the other side of the pair is pinned with eq(), so it returns at most as many rows as the list is long" },
  { at: "src/app/api/research-os/state/route.ts:55", because: "one row per learner and node, and the other side of the pair is pinned with eq(), so it returns at most as many rows as the list is long" },
  { at: "src/app/api/research-os/workspace/route.ts:555", because: "one row per id in nodes, so it returns at most as many rows as the list is long" },
];
