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
 *
 * What a green run means, and what it does not. The gate sees a route
 * that selects from `nodes` or `edges` in a chain it can resolve, and a
 * route that calls a library function which does, through an import
 * alias or one level of property access. It does not follow a helper
 * defined in another route file, a call made through a value it cannot
 * name, or SQL inside an RPC: `svc.rpc("idea_dependents", ...)` joins
 * graph.nodes in its body and reads here as nothing. A chain whose
 * `.select()` it cannot find counts as a read, so the unresolved cases
 * fail loudly, and that is the whole of the guarantee. A green run is
 * the absence of these shapes, and nothing more.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as ts from "typescript";
import { calleeNames, callsAny, functionsIn, importAliases, parse, readsContentFrom, stripComments, tsFiles } from "./research-os/scan-source";

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
/**
 * `proof` patterns run over the route with its comments and string
 * bodies blanked.
 *
 * The first version matched raw source, which is the hole the AST test
 * below was written against, reintroduced on the path seven routes take
 * to pass. Deleting the frontier query's public pin and leaving a
 * comment naming it kept the gate green, and the GET takes no auth at
 * all, so that comment was worth every private flagged node in a branch.
 *
 * A route with two branches carries two patterns, and all of them have
 * to match.
 */
/**
 * A route that reads the graph and authorizes nobody in its own body,
 * with the reason it does not have to and the code that bound it.
 *
 * `proof` is matched against the route. `alsoIn` is matched against
 * another file, for the case where the bound is a filter inside the
 * helper the route calls: without it, an entry for such a route can
 * rest on nothing stronger than the helper's name, and a name is what
 * this gate exists to stop standing in for a filter.
 */
const EXEMPT: { route: string; because: string; proof: RegExp[]; alsoIn?: { file: string; proof: RegExp[] }[] }[] = [
  {
    route: "access/route.ts",
    because:
      "two branches. ?node= exists to answer who may see a node, so refusing the read would refuse the question: it emits the node's id, visibility and owner, which a locked-out requester needs in order to ask the right person, the grants and the pending requests to the owner alone, and the caller's own requests. ?mine= does read node content, through loadOwnedNodes, and it is pinned to viewer.id, so a caller reads their own nodes and no others. An earlier version of this entry said no node content was read at all, which was false of the second branch and left it unpinned",
    proof: [/isOwner\s*\(/, /loadOwnedNodes\(\s*viewer\.id\s*\)/],
  },
  {
    route: "assignments/route.ts",
    because:
      "loadNodeAccess feeds a best-effort share that proceeds only when the caller owns the node, and no field of it is emitted: the reply is the assignment",
    proof: [/ownerId\s*===\s*staff\.id/],
  },
  {
    route: "frontier/route.ts",
    because:
      "the GET is pinned to public nodes in the query itself, so no decision remains to make. The POST is gated on verifyReviewer or class staff. An earlier version of this entry claimed verifyReviewer covered the read, which was false: it is called in the POST, twenty lines below a GET that anyone may call",
    proof: [/\.eq\("visibility",\s*"public"\)/],
  },
  {
    route: "edges/route.ts",
    because: "every handler returns 403 before reading unless verifyGraphReviewer passes, and a graph reviewer's remit is the proposal queue itself rather than one learner's view of it",
    proof: [/verifyGraphReviewer\s*\(/],
  },
  {
    route: "irreducible/route.ts",
    because: "every handler returns 403 before reading unless verifyGraphReviewer passes, and a graph reviewer's remit is the proposal queue itself rather than one learner's view of it",
    proof: [/verifyGraphReviewer\s*\(/],
  },
  {
    route: "merges/route.ts",
    because: "every handler returns 403 before reading unless verifyGraphReviewer passes, and a graph reviewer's remit is the proposal queue itself rather than one learner's view of it",
    proof: [/verifyGraphReviewer\s*\(/],
  },
  {
    route: "node-proposals/route.ts",
    because: "every handler returns 403 before reading unless verifyGraphReviewer passes, and a graph reviewer's remit is the proposal queue itself rather than one learner's view of it",
    proof: [/verifyGraphReviewer\s*\(/],
  },
  {
    route: "import/route.ts",
    because:
      "both handlers read one import by id and the caller's own learner id, and refuse with 404 when that pair matches no row, so a stranger's import id reads as absent rather than forbidden. The node content is the POST's nodeId and nodeSlug, reached in ownedImport from the node_id of the owner-matched import row, so the caller reads the slug of a node their own import points at. The GET emits file rows and no node field",
    proof: [/ownedImport\([^)]*who\.learnerId\)/, /if \(!imp\) return answer\(404,/],
    alsoIn: [
      {
        file: "src/lib/research-os/import-upload.ts",
        proof: [/\.from\("imports"\)[\s\S]{0,120}?\.eq\("owner_id", ownerId\)/, /\.from\("nodes"\)[\s\S]{0,80}?\.eq\("id", row\.node_id\)/],
      },
    ],
  },
];

/**
 * The library readers that decide for their callers, and how the
 * decision reaches what they return.
 *
 * A function was sealed by calling an authorizer anywhere in its body,
 * and nothing checked that the answer gated the result. Keeping
 * `authorizeNodes` and its `allowed` set in `loadConnections` while
 * deleting the two `.filter` calls that use it left this gate green and
 * put every bridge title in front of a learner who may not read them.
 *
 * So each one is named here with the line that applies the decision,
 * and a route trusting the seal is trusting something checked.
 */
const SEALED: { fn: string; file: string; because: string; proof: RegExp[] }[] = [
  {
    fn: "loadConnections",
    file: "src/lib/research-os/connections-db.ts",
    because: "a bridge points at a node the learner holds no state on, which is exactly the node they may have no right to see, so the titles are filtered before they are joined and an edge is dropped with either end",
    proof: [/\.filter\(\(n\) => visible\.has\(n\.id\)\)/, /edges\.filter\(\(e\) => visible\.has\(e\.fromId\) && visible\.has\(e\.toId\)\)/],
  },
  {
    fn: "listAssignmentsForLearner",
    file: "src/lib/research-os/class-db.ts",
    because: "an assignment names a target node, and the learner may not be allowed to read that node, so the target map is built from the ids authorizeNodes allowed and an unreadable target carries no slug",
    proof: [/nodes\.filter\(\(n\) => visibleTargets\.has\(n\.id\)\)/],
  },
  {
    fn: "createAssignment",
    file: "src/lib/research-os/class-db.ts",
    because: "a teacher cannot assign a node they cannot read themselves, so the write refuses before it happens and answers target_not_found, which tells a stranger nothing about whether the node exists",
    proof: [/if \(!staffMayRead\.ok\) return \{ ok: false, error:/],
  },
];

test("every sealed reader shows where its decision gates the result", () => {
  const { sealed, readers } = graphReaders();
  const sealedReaders = Array.from(sealed).filter((name) => {
    // A function that authorizes and reads nothing seals nothing worth
    // checking; authorizeNode itself is in that set.
    return SEALED.some((e) => e.fn === name) || readers.has(name);
  });
  for (const name of sealedReaders) {
    const entry = SEALED.find((e) => e.fn === name);
    assert.ok(entry, `${name} seals a read for its callers and is not listed in SEALED; say where the decision is applied`);
  }
  for (const e of SEALED) {
    assert.ok(sealed.has(e.fn), `${e.fn} is listed as sealed and no longer authorizes anything`);
    const full = path.join(__dirname, "..", e.file);
    assert.ok(fs.existsSync(full), `${e.file} does not exist`);
    const code = stripComments(fs.readFileSync(full, "utf8"), { keepStrings: true });
    for (const proof of e.proof) {
      assert.match(code, proof, `${e.fn} no longer applies its decision where this says it does: ${proof}`);
    }
  }
});

function routeFiles(): string[] {
  return tsFiles(ROOT).filter((f) => path.basename(f) === "route.ts");
}

/**
 * What a route reads, and through what.
 *
 * Calls resolve through the file's imports, so a helper brought in as
 * `import { loadSubgraph as graphOf }` is still the reader it is.
 */
function readsOf(file: string, readers: Set<string>): { direct: boolean; via: string[] } {
  const sf = parse(fs.readFileSync(file, "utf8"), file);
  const direct = readsContentFrom(sf, sf, GRAPH_TABLES);
  const aliases = importAliases(sf);
  const called = calleeNames(sf);
  const resolved = new Set<string>();
  called.forEach((name) => {
    resolved.add(aliases.get(name) ?? name);
    // `store.method()` is recorded whole and by its method name, and a
    // reader may be declared under either.
    const dot = name.indexOf(".");
    if (dot > 0) resolved.add(name.slice(dot + 1));
  });
  const via = Array.from(readers).filter((r) => resolved.has(r) || resolved.has(r.slice(r.indexOf(".") + 1))).sort();
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
    // The reason names a bound; this is the bound, in the code, with
    // comments and string bodies blanked so none of them can stand in
    // for it.
    // keepStrings, because a proof names the table or column the bound
    // turns on. Comments go, which is the hole this closes: a comment
    // naming the frontier query's public pin stood in for the pin.
    const code = stripComments(src, { keepStrings: true });
    for (const proof of e.proof) {
      assert.match(code, proof, `${e.route} no longer matches the bound its exemption rests on: ${proof}`);
    }
    // A bound that lives in the helper the route calls, checked in that
    // helper's file rather than taken on the helper's name.
    for (const other of e.alsoIn ?? []) {
      const otherFull = path.join(__dirname, "..", other.file);
      assert.ok(fs.existsSync(otherFull), `${e.route} rests on ${other.file}, which does not exist`);
      const otherCode = stripComments(fs.readFileSync(otherFull, "utf8"), { keepStrings: true });
      for (const proof of other.proof) {
        assert.match(otherCode, proof, `${e.route} rests on a bound in ${other.file} that no longer matches: ${proof}`);
      }
    }
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
