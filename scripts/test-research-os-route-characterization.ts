import test from "node:test";
import assert from "node:assert/strict";
import { characterize, fixturePath, folders, readFixture } from "./research-os/route-characterization";

const only = process.argv.slice(2);

test("every research-os API folder has a characterization fixture", () => {
  const missing = folders().filter((f) => !readFixture(f));
  assert.deepEqual(missing, [], `run scripts/research-os/route-characterization.ts --update ${missing.join(" ")}`);
});

for (const folder of only.length ? only : folders()) {
  test(`api/research-os/${folder} answers what its fixture pins`, async () => {
    const pinned = readFixture(folder);
    assert.ok(pinned, `no fixture at ${fixturePath(folder)}`);
    assert.deepEqual(await characterize(folder), pinned);
  });
}
