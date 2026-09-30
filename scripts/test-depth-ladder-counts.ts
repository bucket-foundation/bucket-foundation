import test from "node:test";
import assert from "node:assert/strict";
import { DEPTH_LADDER } from "../src/lib/depth-ladder";
import { TOOLS } from "../src/lib/tools";

test("ladder notes quote the live tool count", () => {
  const notes = DEPTH_LADDER.flatMap((r) => r.surfaces.map((s) => s.note)).join(" ");
  assert.ok(notes.includes(`${TOOLS.length} instruments`));
  assert.ok(notes.includes(`${TOOLS.length} tools`));
});
