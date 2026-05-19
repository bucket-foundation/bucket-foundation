/**
 * One-off audit harness (bkt canon-integrity bead): exercise the live GET
 * handler on the canon-fallback path (wallet unfunded — exactly prod) for the
 * flagship query and print the caller-facing answer + citation + tier.
 *
 *   npx ts-node --compiler-options '{"module":"commonjs"}' \
 *     scripts/audit-research-beforeafter.ts
 */
import { NextRequest } from "next/server";
import * as path from "path";

// Resolve the "@/..." alias the same way next/tsconfig does (./src/*) so this
// standalone harness can require the route module directly.
/* eslint-disable @typescript-eslint/no-require-imports */
const Mod = require("module");
const origResolve = Mod._resolveFilename;
Mod._resolveFilename = function (request: string, ...rest: unknown[]) {
  if (request.startsWith("@/")) {
    request = path.join(__dirname, "..", "src", request.slice(2));
  }
  return origResolve.call(this, request, ...rest);
};
/* eslint-enable @typescript-eslint/no-require-imports */

delete process.env.BUCKET_WALLET_PRIVATE_KEY; // force zero-key canon fallback

/* eslint-disable @typescript-eslint/no-require-imports */
const { GET } = require("../src/app/api/research/route");
/* eslint-enable @typescript-eslint/no-require-imports */

async function run(q: string, tier = "insight") {
  const url = `http://localhost/api/research?q=${encodeURIComponent(q)}&tier=${tier}`;
  const res: Response = await GET(new NextRequest(url));
  const body = await res.json();
  console.log(`\n=== q="${q}" tier=${tier} ===`);
  console.log("x-bucket-source :", res.headers.get("x-bucket-source"));
  console.log("canon_tier      :", body.canon_tier);
  console.log("citation.type   :", body.citation?.type);
  console.log("citation.url    :", body.citation?.canonical_url);
  console.log("citation.doi    :", body.citation?.doi ?? "(none)");
  console.log("answer          :", String(body.data?.answer).slice(0, 360));
  const ev = body.data?.evidence ?? [];
  console.log(`evidence[${ev.length}] (headline tier=${ev[0]?.tier ?? "?"})`);
  ev.slice(0, 3).forEach((e: any) =>
    console.log(
      `  - [${e.tier ?? "?"}] ${e.title?.slice(0, 70)} :: ${e.canonical_url}`,
    ),
  );
  const sc = body.data?.supporting_candidates ?? [];
  if (sc.length)
    console.log(
      `supporting_candidates[${sc.length}] (all demoted, post-quarantine)`,
    );
}

(async () => {
  await run("mitochondrial ATP synthesis", "insight");
  await run("Bell inequality quantum entanglement", "insight");
  await run("Mitchell chemiosmotic coupling", "query");
  await run("how do I tan my skin in France", "insight"); // expect no primary
})();
