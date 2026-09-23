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
