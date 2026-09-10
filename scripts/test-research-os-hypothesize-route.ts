/**
 * Unit test: `src/lib/research-os/hypothesize-auth.ts`'s
 * `authorizeHypothesize`, the ownership check `/api/research-os/
 * hypothesize/route.ts` (ros-13, "apply the research-os-hypothesize-route
 * patch") calls before ever forwarding a production to the engine. Ros-13's
 * own review item: "add a route test that a learner can only hypothesize
 * over their own productions." Pure, no I/O, matching every other
 * scripts/test-research-os-*.ts convention (node:test + node:assert, no
 * framework configured in this repo).
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-research-os-hypothesize-route.ts
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { authorizeHypothesize } from "../src/lib/research-os/hypothesize-auth";

test("authorizeHypothesize: the caller's own production is authorized", () => {
  assert.equal(authorizeHypothesize({ learner_id: "learner-1" }, "learner-1"), true);
});

test("authorizeHypothesize: another learner's production is refused", () => {
  assert.equal(authorizeHypothesize({ learner_id: "learner-2" }, "learner-1"), false);
});

test("authorizeHypothesize: no matching row (null) is refused, same as a foreign row", () => {
  assert.equal(authorizeHypothesize(null, "learner-1"), false);
});

test("authorizeHypothesize: a row with no learner_id at all is refused", () => {
  assert.equal(authorizeHypothesize({}, "learner-1"), false);
});
