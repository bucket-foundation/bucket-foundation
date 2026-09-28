import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";

async function noNetwork<T>(run: () => Promise<T> | T): Promise<T> {
  const real = globalThis.fetch;
  globalThis.fetch = (() => {
    throw new Error("no network call expected");
  }) as typeof fetch;
  try {
    return await run();
  } finally {
    globalThis.fetch = real;
  }
}

test("polingual route: unset API URLs skip the network and report the baked-subset fallback", async () => {
  delete process.env.POLINGUAL_API_URL;
  delete process.env.POLINGUAL_FALLBACK_API_URL;
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { GET } = require("../src/app/api/polingual/route");
  /* eslint-enable @typescript-eslint/no-require-imports */
  const res: Response = await noNetwork(() => GET(new NextRequest("http://localhost/api/polingual?op=health")));
  assert.equal(res.status, 503);
  assert.equal(res.headers.get("x-polingual-upstream"), "none");
  const body = await res.json();
  assert.equal(body.error.code, "upstream_not_configured");
});

test("research route: unset gateway URL skips the network and serves the local canon fallback", async () => {
  delete process.env.BUCKET_GATEWAY_URL;
  delete process.env.BUCKET_WALLET_PRIVATE_KEY;
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { GET } = require("../src/app/api/research/route");
  /* eslint-enable @typescript-eslint/no-require-imports */
  const res: Response = await noNetwork(() => GET(new NextRequest("http://localhost/api/research?q=entropy&tier=insight")));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.receipt.status, "served_from_canon");
});

test("research-agent retrievers: unset gateway URLs skip the network and report degraded", async () => {
  delete process.env.ATLAS_API_URL;
  delete process.env.TOOLS_GATEWAY_URL;
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { retrieveAtlas, matchMethods } = require("../src/app/api/research-agent/retrievers");
  /* eslint-enable @typescript-eslint/no-require-imports */
  const atlas = await noNetwork(() => retrieveAtlas());
  assert.deepEqual(atlas.sources, []);
  assert.equal(atlas.log[0].ok, false);
  assert.match(atlas.log[0].note ?? "", /ATLAS_API_URL/);

  const methods = await noNetwork(() => matchMethods("what method fits this experiment?"));
  assert.equal(methods.match.ok, false);
  assert.equal(methods.match.degraded, true);
  assert.match(methods.log.note ?? "", /TOOLS_GATEWAY_URL/);
});
