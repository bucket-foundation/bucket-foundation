import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET } from "../src/app/api/explore/search/route";
import { ERAS as SHIM_ERAS, eraOf as shimEraOf, timeCoord as shimTimeCoord } from "../src/lib/research-os/solvability-space";
import { ERAS, eraOf, timeCoord } from "../src/lib/explore/time";
import { EDGE_KINDS, isEdge } from "../src/lib/stage/record";
import { unify } from "../src/lib/explore/search";
import { advisorSources } from "../src/lib/explore/advisors";
import { parseAdvisorReview, parsePrimeDirections } from "../src/lib/research-os/advisor-review";
import sampleReview from "../src/lib/explore/fixtures/advisors.sample.json";
import samplePrime from "../src/lib/explore/fixtures/prime.sample.json";
import pinned from "../tests/fixtures/explore-search-links.json";
import { stageV2Enabled } from "../src/lib/stage/flag";

interface ApiHit {
  id: string;
  links: unknown;
  edges?: unknown;
}

async function search(q: string, flag: string | undefined): Promise<ApiHit[]> {
  const prev = process.env.STAGE_V2;
  if (flag === undefined) delete process.env.STAGE_V2;
  else process.env.STAGE_V2 = flag;
  try {
    const res = await GET(new NextRequest(`http://localhost/api/explore/search?q=${encodeURIComponent(q)}&top_k=30`));
    assert.equal(res.status, 200);
    return ((await res.json()) as { results: ApiHit[] }).results;
  } finally {
    if (prev === undefined) delete process.env.STAGE_V2;
    else process.env.STAGE_V2 = prev;
  }
}

test("the solvability-space shims are the one time table", () => {
  assert.equal(SHIM_ERAS, ERAS);
  assert.equal(shimEraOf, eraOf);
  assert.equal(shimTimeCoord, timeCoord);
});

test("ERAS values are unchanged", () => {
  assert.deepEqual(
    ERAS.map((e) => [e.from, e.to, e.label]),
    [
      [-Infinity, 1899, "before 1900"],
      [1900, 1949, "1900 to 1949"],
      [1950, 1979, "1950 to 1979"],
      [1980, 1999, "1980 to 1999"],
      [2000, 2019, "2000 to 2019"],
      [2020, Infinity, "2020 on"],
    ],
  );
});

test("the STAGE_V2 flag reads 1, true and on", () => {
  assert.equal(stageV2Enabled({}), false);
  assert.equal(stageV2Enabled({ STAGE_V2: "0" }), false);
  for (const v of ["1", "true", "on", "TRUE"]) assert.equal(stageV2Enabled({ STAGE_V2: v }), true);
});

test("search keeps links as string[] and leaves edges off without the flag", async () => {
  const hits = await search("photon quantum light", undefined);
  assert.ok(hits.length > 0);
  for (const h of hits) {
    assert.ok(Array.isArray(h.links) && h.links.every((l) => typeof l === "string"), h.id);
    assert.ok(!("edges" in h), h.id);
  }
});

test("search adds edges with the same ids as links under the flag", async () => {
  const before = await search("photon quantum light", undefined);
  const after = await search("photon quantum light", "1");
  assert.deepEqual(
    after.map((h) => [h.id, h.links]),
    before.map((h) => [h.id, h.links]),
  );
  let withEdges = 0;
  for (const h of after) {
    const edges = h.edges as unknown[];
    assert.ok(Array.isArray(edges) && edges.every(isEdge), h.id);
    assert.deepEqual(
      edges.map((e) => (e as { to: string }).to),
      h.links,
      h.id,
    );
    if (edges.length) withEdges++;
  }
  assert.ok(withEdges > 0);
  for (const h of after) for (const e of h.edges as { kind: string }[]) assert.ok((EDGE_KINDS as readonly string[]).includes(e.kind));
});

test("links match the fixture pinned from dev", () => {
  const advisors = advisorSources(parseAdvisorReview(sampleReview), parsePrimeDirections(samplePrime));
  const got = unify({ query: pinned.query, excerpts: pinned.excerpts, advisors }).map((h) => ({ id: h.id, links: h.links }));
  assert.deepEqual(got, pinned.links);
});

test("edge reasons name the matched terms and each direction has its own kind", () => {
  const advisors = advisorSources(parseAdvisorReview(sampleReview), parsePrimeDirections(samplePrime));
  const hits = unify({ query: pinned.query, excerpts: pinned.excerpts, advisors });
  const advisor = hits.find((h) => h.type === "advisor" && h.edges?.length);
  const excerpt = hits.find((h) => h.type === "excerpt" && h.edges?.some((e) => e.to.startsWith("advisor:")));
  assert.ok(advisor && excerpt);
  for (const e of advisor.edges ?? []) {
    assert.equal(e.kind, "advises");
    assert.match(e.reason, /^shares \w+/);
  }
  for (const e of (excerpt.edges ?? []).filter((x) => x.to.startsWith("advisor:"))) {
    assert.equal(e.kind, "shares-token");
    assert.match(e.reason, /^shares \w+/);
  }
});
