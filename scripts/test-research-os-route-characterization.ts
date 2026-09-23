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
    const now = await characterize(folder);
    const changed = Array.from(new Set([...Object.keys(now), ...Object.keys(pinned)]))
      .filter((k) => JSON.stringify(now[k]) !== JSON.stringify(pinned[k]))
      .sort();
    assert.deepEqual(
      changed,
      [],
      `${folder} moved off its fixture. An intended change is a declared diff: run scripts/research-os/route-characterization.ts --update ${folder} and list each case in the PR body.`,
    );
  });
}
