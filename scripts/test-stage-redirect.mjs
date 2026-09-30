import test from "node:test";
import assert from "node:assert/strict";

async function redirectsWith(flag) {
  const prev = process.env.STAGE_V2;
  if (flag === undefined) delete process.env.STAGE_V2;
  else process.env.STAGE_V2 = flag;
  try {
    const mod = await import(`../next.config.mjs?flag=${flag ?? "unset"}`);
    return await mod.default.redirects();
  } finally {
    if (prev === undefined) delete process.env.STAGE_V2;
    else process.env.STAGE_V2 = prev;
  }
}

test("explore redirects to canon search only when STAGE_V2 is on", async () => {
  const off = await redirectsWith(undefined);
  assert.ok(!off.some((r) => r.source === "/explore"));
  const zero = await redirectsWith("0");
  assert.ok(!zero.some((r) => r.source === "/explore"));
  const on = await redirectsWith("1");
  const hit = on.find((r) => r.source === "/explore");
  assert.ok(hit);
  assert.equal(hit.destination, "/canon/search");
  assert.equal(hit.permanent, false);
  assert.ok(!hit.destination.includes("?"));
  assert.equal(hit.has, undefined);
  assert.equal(hit.missing, undefined);
});
