/**
 * Every Research OS route that reads graph content either decides who
 * may see it, or is named here with the reason it does not have to.
 *
 * `class/route.ts` took `loadSubgraph(branch)` unfiltered and emitted
 * node titles from it, for nine review rounds, while
 * `directions/route.ts` beside it filtered. Nothing caught that,
 * because the only structural gate in the repo covers writes. This is
 * the read equivalent: a route added tomorrow that reads the graph and
 * authorizes nobody fails here rather than waiting for a reviewer.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(__dirname, "..", "src/app/api/research-os");

/** Calls that read graph content a viewer might not be allowed to see. */
const READS = /loadSubgraph\(|\.from\("nodes"\)|\.from\("edges"\)|loadNodeAccess\(/;
/** Anything that decides who may see it. */
const AUTHORIZES = /authorizeNode\(|authorizeNodes\(|authorizeVerbs\(|filterSubgraphForViewer\(|storeWithNodes\(/;

/**
 * Routes that read without authorizing, and why that is right.
 *
 * A reason has to say what bounds the exposure. "It is only used
 * internally" is not one, because the reply reaches a browser.
 */
const EXEMPT: { route: string; because: string }[] = [
  { route: "access/route.ts", because: "loadNodeAccess is the decision here: this route exists to compute canView and the verb map, and it emits the node's own visibility and owner and nothing else" },
  { route: "assignments/route.ts", because: "loadNodeAccess feeds a best-effort share that proceeds only when the caller owns the node, and no field of it is emitted" },
  { route: "frontier/route.ts", because: "gated by verifyReviewer, and the read is the graph reviewer's own working set rather than one learner's view of it" },
  { route: "loop/route.ts", because: "the only nodes read are a head count of rows the learner owns, pinned by eq on owner_id, and no node field is emitted" },
];

function routeFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...routeFiles(full));
    else if (entry.name === "route.ts") out.push(full);
  }
  return out;
}

test("the gate is looking at the routes", () => {
  const files = routeFiles(ROOT);
  assert.ok(files.length > 15, `found ${files.length} route handlers`);
});

test("every route that reads graph content authorizes someone", () => {
  const offenders: string[] = [];
  for (const file of routeFiles(ROOT)) {
    const rel = path.relative(ROOT, file);
    const src = fs.readFileSync(file, "utf8");
    if (!READS.test(src)) continue;
    if (AUTHORIZES.test(src)) continue;
    if (EXEMPT.some((e) => e.route === rel)) continue;
    offenders.push(rel);
  }
  assert.deepEqual(
    offenders,
    [],
    `these routes read graph content and authorize nobody. Filter the read, or add an entry to EXEMPT in this file saying what bounds the exposure: ${offenders.join(", ")}`,
  );
});

test("an exemption names a route that still exists and still reads", () => {
  for (const e of EXEMPT) {
    const full = path.join(ROOT, e.route);
    assert.ok(fs.existsSync(full), `${e.route} is exempt and does not exist`);
    assert.ok(READS.test(fs.readFileSync(full, "utf8")), `${e.route} is exempt and reads nothing; drop the entry`);
    assert.ok(e.because.length > 25, `${e.route} needs a real reason`);
  }
});
