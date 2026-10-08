import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { branchStatus, canonEntryUrl, CANON_CITE_PRICE_USD } from "../src/lib/canon-branch-status";

const ROOT = path.resolve(__dirname, "..");
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8");

test("a branch with no entries, figures or claims is open for submissions", () => {
  assert.equal(branchStatus({ entries: 0, figures: 0, claims: 0, fsStatus: "seeded" }), "open for submissions");
});

test("a branch with figures or claims keeps its status", () => {
  assert.equal(branchStatus({ entries: 0, figures: 3, claims: 0, fsStatus: "seeded" }), "seeded");
  assert.equal(branchStatus({ entries: 0, figures: 0, claims: 2 }), "in progress");
  assert.equal(branchStatus({ entries: 5, figures: 0, claims: 0, fsStatus: null }), "in progress");
});

test("canon entry URLs are absolute and anchored on the bibkey", () => {
  assert.equal(canonEntryUrl("physics", "maxwell-1865"), "https://www.bucket.foundation/canon/physics#maxwell-1865");
  assert.ok(CANON_CITE_PRICE_USD > 0);
});

test("the branch page renders the V2 table with no mint control", () => {
  const page = read("src/app/canon/[slug]/page.tsx");
  assert.match(page, /BranchEntriesTableV2/);
  assert.doesNotMatch(page, /from "\.\/BranchEntriesTable"/);
  const v2 = read("src/app/canon/[slug]/BranchEntriesTableV2.tsx");
  assert.doesNotMatch(v2, /mint|IP NFT|Story Protocol/i);
});

test("rendered 2b pages carry no Story, Walrus or IP NFT claims", () => {
  for (const f of ["src/app/contribute/page.tsx", "src/app/protocol/page.tsx", "src/app/feed.xml/route.ts", "docs/foundation/PROTOCOL.md"]) {
    assert.doesNotMatch(read(f), /Story Protocol|IP NFT|Walrus/, f);
  }
  const about = read("src/app/about/page.tsx");
  assert.equal((about.match(/Story Protocol/g) || []).length, 1);
  assert.doesNotMatch(about, /IP NFT/);
});

test("no page links the /join redirect", () => {
  for (const f of ["src/app/canon/[slug]/page.tsx", "src/app/canon/[slug]/figures/[figure]/page.tsx"]) assert.doesNotMatch(read(f), /href="\/join"/, f);
});
