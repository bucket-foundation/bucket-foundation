/**
 * Every Research OS route that can put node or edge content in a reply
 * either decides who may see it, or is named here with the reason it
 * does not have to.
 *
 * `class/route.ts` took `loadSubgraph(branch)` unfiltered and emitted
 * node titles from it, for nine review rounds, while
 * `directions/route.ts` beside it filtered. Nothing caught that,
 * because the only structural gate in the repo covers writes. This is
 * the read equivalent: a route added tomorrow that reads the graph and
 * authorizes nobody fails here rather than waiting for a reviewer.
 *
 * The first version of this gate named two helpers, `loadSubgraph` and
 * `loadNodeAccess`, and matched them with a regex over raw source. It
 * saw neither of the two ways a route reaches the graph in this repo.
 * A route that calls `loadConnections` or `listNodeProposals` reads
 * node rows through a helper the list never mentioned, and a route
 * whose comment spelled `authorizeNode()` satisfied the authorization
 * regex without calling anything. Both are closed here: the helpers
 * are discovered from the library itself, and every match is an AST
 * call site, so no comment and no string can answer for code.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as ts from "typescript";
import { callsAny, functionsIn, parse, readsContentFrom, tsFiles } from "./research-os/scan-source";

const ROOT = path.join(__dirname, "..", "src/app/api/research-os");
const LIB = path.join(__dirname, "..", "src/lib/research-os");

/** The tables whose rows carry content a viewer might not be allowed to see. */
const GRAPH_TABLES = ["nodes", "edges"] as const;

/** Anything that decides who may see a node. */
const AUTHORIZES = ["authorizeNode", "authorizeNodes", "authorizeVerbs", "filterSubgraphForViewer", "storeWithNodes"] as const;

/**
 * The library functions that can put a node or edge field in their
 * result, found rather than listed.
 *
 * A function qualifies when it selects from `nodes` or `edges`, or
 * calls something that does. A function that authorizes inside itself
 * is sealed: `loadConnections` filters the titles it joins before it
 * returns them, so a route calling it has already had the decision
 * made and needs no second one.
 */
function graphReaders(): { readers: Set<string>; sealed: Set<string>; scanned: number } {
  interface Def { reads: boolean; seals: boolean; calls: Set<string> }
  const defs = new Map<string, Def>();
  const files = tsFiles(LIB);
  for (const file of files) {
    for (const fn of functionsIn(file)) {
      const reads = readsContentFrom(fn.body, fn.sf, GRAPH_TABLES);
      const seals = callsAny(fn.body, AUTHORIZES);
      const calls = new Set<string>();
      const collect = (n: ts.Node) => {
        if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) calls.add(n.expression.text);
        ts.forEachChild(n, collect);
      };
      collect(fn.body);
      // A name declared twice in the library keeps the reading copy,
      // because a route calling that name might reach either.
      const prior = defs.get(fn.name);
      const merged = new Set<string>();
      if (prior) prior.calls.forEach((c) => merged.add(c));
      calls.forEach((c) => merged.add(c));
      defs.set(fn.name, {
        reads: reads || Boolean(prior && prior.reads),
        seals: seals && (prior ? prior.seals : true),
        calls: merged,
      });
    }
  }

  const readers = new Set<string>();
  const sealed = new Set<string>();
  defs.forEach((d, name) => {
    if (d.seals) sealed.add(name);
    else if (d.reads) readers.add(name);
  });
  // A caller of a reader is a reader, unless it seals the decision itself.
  for (let changed = true; changed; ) {
    changed = false;
    defs.forEach((d, name) => {
      if (readers.has(name) || d.seals) return;
      let reaches = false;
      d.calls.forEach((c) => { if (readers.has(c)) reaches = true; });
      if (reaches) { readers.add(name); changed = true; }
    });
  }
  return { readers, sealed, scanned: files.length };
}

/**
 * Routes that can emit graph content without authorizing, and why that
 * is right.
 *
 * A reason has to say what bounds the exposure, and `proof` has to
 * match the route's own code, so a route that loses the bound fails
 * here rather than keeping the excuse. "It is only used internally" is
 * not a reason, because the reply reaches a browser.
 */
const EXEMPT: { route: string; because: string; proof: RegExp }[] = [
  {
    route: "access/route.ts",
    because:
      "this route exists to answer who may see a node, so refusing the read would refuse the question. It emits the node's id, visibility and owner, which a locked-out requester needs in order to ask the right person, the grants and the pending requests to the owner alone, and the caller's own requests. No field of the node's content is read at all: loadNodeAccess selects id, visibility and owner_id",
    proof: /isOwner\s*\(/,
  },
  {
    route: "assignments/route.ts",
    because:
      "loadNodeAccess feeds a best-effort share that proceeds only when the caller owns the node, and no field of it is emitted: the reply is the assignment",
    proof: /ownerId\s*===\s*staff\.id/,
  },
  {
    route: "frontier/route.ts",
    because:
      "the GET is pinned to public nodes in the query itself, so no decision remains to make. The POST is gated on verifyReviewer or class staff. An earlier version of this entry claimed verifyReviewer covered the read, which was false: it is called in the POST, twenty lines below a GET that anyone may call",
    proof: /\.eq\("visibility",\s*"public"\)/,
  },
  {
    route: "edges/route.ts",
    because: "every handler returns 403 before reading unless verifyGraphReviewer passes, and a graph reviewer's remit is the proposal queue itself rather than one learner's view of it",
    proof: /verifyGraphReviewer/,
  },
  {
    route: "irreducible/route.ts",
    because: "every handler returns 403 before reading unless verifyGraphReviewer passes, and a graph reviewer's remit is the proposal queue itself rather than one learner's view of it",
    proof: /verifyGraphReviewer/,
  },
  {
    route: "merges/route.ts",
    because: "every handler returns 403 before reading unless verifyGraphReviewer passes, and a graph reviewer's remit is the proposal queue itself rather than one learner's view of it",
    proof: /verifyGraphReviewer/,
  },
  {
    route: "node-proposals/route.ts",
    because: "every handler returns 403 before reading unless verifyGraphReviewer passes, and a graph reviewer's remit is the proposal queue itself rather than one learner's view of it",
    proof: /verifyGraphReviewer/,
  },
];

function routeFiles(): string[] {
  return tsFiles(ROOT).filter((f) => path.basename(f) === "route.ts");
}

/** What a route reads, and through what. */
function readsOf(file: string, readers: Set<string>): { direct: boolean; via: string[] } {
  const sf = parse(fs.readFileSync(file, "utf8"), file);
  const direct = readsContentFrom(sf, sf, GRAPH_TABLES);
  const via = Array.from(readers).filter((r) => callsAny(sf, [r])).sort();
  return { direct, via };
}

test("the gate is looking at the routes and at the library", () => {
  const files = routeFiles();
  assert.ok(files.length > 15, `found ${files.length} route handlers`);
  const { readers, sealed, scanned } = graphReaders();
  assert.ok(scanned > 30, `scanned ${scanned} library sources`);
  // A scanner that finds nothing passes every route. These three are
  // the shapes it has to see: a direct branch read, a read behind a
  // helper, and a helper that authorizes for its callers.
  assert.ok(readers.has("loadSubgraph"), "loadSubgraph reads the graph");
  assert.ok(readers.has("listNodeProposals"), "listNodeProposals reads node rows through a helper the first version of this gate never named");
  assert.ok(sealed.has("loadConnections"), "loadConnections authorizes the titles it joins, so its callers inherit the decision");
});

test("every route that can emit graph content authorizes someone", () => {
  const { readers } = graphReaders();
  const offenders: string[] = [];
  for (const file of routeFiles()) {
    const rel = path.relative(ROOT, file);
    const src = fs.readFileSync(file, "utf8");
    const { direct, via } = readsOf(file, readers);
    if (!direct && via.length === 0) continue;
    if (callsAny(parse(src, file), AUTHORIZES)) continue;
    if (EXEMPT.some((e) => e.route === rel)) continue;
    offenders.push(`${rel} (${direct ? "reads the graph directly" : `through ${via.join(", ")}`})`);
  }
  assert.deepEqual(
    offenders,
    [],
    `these routes can emit graph content and authorize nobody. Filter the read, or add an entry to EXEMPT in this file saying what bounds the exposure: ${offenders.join("; ")}`,
  );
});

test("an exemption names a route that still exists, still reads, and still holds its bound", () => {
  const { readers } = graphReaders();
  for (const e of EXEMPT) {
    const full = path.join(ROOT, e.route);
    assert.ok(fs.existsSync(full), `${e.route} is exempt and does not exist`);
    const src = fs.readFileSync(full, "utf8");
    const { direct, via } = readsOf(full, readers);
    assert.ok(direct || via.length > 0, `${e.route} is exempt and reads nothing; drop the entry`);
    assert.ok(e.because.length > 25, `${e.route} needs a real reason`);
    // The reason names a bound; this is the bound, in the code.
    assert.match(src, e.proof, `${e.route} no longer matches the bound its exemption rests on`);
  }
});

test("a comment cannot authorize a route", () => {
  // The first version of this gate ran its regexes over raw source, so
  // a route could satisfy the authorization check with a comment and
  // read the graph freely. Both sides are AST call sites now.
  const pretend = parse(`
    // authorizeNodes(ids, viewer, "view", store)
    const sql = "filterSubgraphForViewer(nodes, edges, viewer)";
    export async function GET() {
      const { data } = await svc.from("nodes").select("id,title").eq("branch", b);
      return Response.json(data);
    }
  `);
  assert.equal(callsAny(pretend, AUTHORIZES), false, "a comment and a string do not authorize anything");
  assert.equal(readsContentFrom(pretend, pretend, GRAPH_TABLES), true, "and the read under them is still a read");
});

test("a write and a head count are not reads", () => {
  const write = parse(`await svc.from("nodes").update({ frontier_flag: null }).eq("id", id);`);
  assert.equal(readsContentFrom(write, write, GRAPH_TABLES), false, "an update exposes no row");
  const count = parse(`await svc.from("nodes").select("id", { count: "exact", head: true }).eq("owner_id", me);`);
  assert.equal(readsContentFrom(count, count, GRAPH_TABLES), false, "a head count yields a number, which is why loop/route.ts needs no exemption");
  const read = parse(`await svc.from("edges").select("id,from_id,to_id").in("from_id", ids);`);
  assert.equal(readsContentFrom(read, read, GRAPH_TABLES), true);
});
