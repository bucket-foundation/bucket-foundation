import test from "node:test";
import assert from "node:assert/strict";
import { scrub } from "./beads-export.mjs";

test("owner fields go and emails in text are masked", () => {
  const row = scrub({ id: "bkt-1", owner: "a@b.co", created_by: "x@y.io", description: "mail me at a@b.co", priority: 2 });
  assert.equal(row.owner, undefined);
  assert.equal(row.created_by, undefined);
  assert.equal(row.description, "mail me at [email]");
  assert.equal(row.priority, 2);
});
