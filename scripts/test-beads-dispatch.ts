import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  acquireLock,
  findCycle,
  httpApi,
  latestEntries,
  parseLinks,
  parsePending,
  reconcile,
  titleKey,
  type LedgerEntry,
  type PendingRow,
} from "./beads/dispatch";

type CreateMode = "ok" | "error200" | "reject400" | "proxy500AfterWrite" | "slowAfterWrite" | "slowNoWrite";

interface Fake {
  url: string;
  issues: { id: string; title: string; labels: string[] }[];
  deps: Map<string, { depends_on_id: string; dep_type: string }[]>;
  counts: { list: number; create: number; depsGet: number; depsPost: number; unauthorized: number };
  mode: Map<string, CreateMode>;
  dropDeps: boolean;
  failList: boolean;
  close(): Promise<void>;
}

const USER = "tester";
const PASS = "secret-pass";

async function fakeServer(seed: { id: string; title: string }[] = []): Promise<Fake> {
  let seq = 0;
  const f = {
    issues: seed.map((s) => ({ ...s, labels: [] as string[] })),
    deps: new Map<string, { depends_on_id: string; dep_type: string }[]>(),
    counts: { list: 0, create: 0, depsGet: 0, depsPost: 0, unauthorized: 0 },
    mode: new Map<string, CreateMode>(),
    dropDeps: false,
    failList: false,
  } as Fake;
  const auth = `Basic ${Buffer.from(`${USER}:${PASS}`).toString("base64")}`;
  const send = (res: http.ServerResponse, status: number, body: unknown) => {
    if (res.destroyed) return;
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      if (req.headers.authorization !== auth) {
        f.counts.unauthorized++;
        return send(res, 401, { error: "auth" });
      }
      const url = req.url ?? "";
      const depMatch = /^\/issues\/([^/]+)\/deps$/.exec(url);
      if (req.method === "GET" && url === "/issues") {
        f.counts.list++;
        if (f.failList) return send(res, 502, { error: "bad gateway" });
        return send(res, 200, f.issues.map((i) => ({ id: i.id, title: i.title, status: "open" })));
      }
      if (req.method === "POST" && url === "/issues") {
        f.counts.create++;
        const body = JSON.parse(raw);
        const mode = f.mode.get(body.title) ?? "ok";
        const write = () => {
          const id = `bkt-t${++seq}`;
          f.issues.push({ id, title: body.title, labels: body.labels ?? [] });
          return id;
        };
        if (mode === "error200") return send(res, 200, { error: "store down" });
        if (mode === "reject400") return send(res, 400, { error: "bad body" });
        if (mode === "proxy500AfterWrite") {
          write();
          return send(res, 502, { error: "upstream reset" });
        }
        if (mode === "slowAfterWrite") {
          const id = write();
          setTimeout(() => send(res, 200, { status: "created", id }), 1500);
          return;
        }
        if (mode === "slowNoWrite") {
          setTimeout(() => send(res, 503, { error: "late" }), 1500);
          return;
        }
        return send(res, 200, { status: "created", id: write() });
      }
      if (depMatch && req.method === "GET") {
        f.counts.depsGet++;
        return send(res, 200, f.deps.get(decodeURIComponent(depMatch[1])) ?? []);
      }
      if (depMatch && req.method === "POST") {
        f.counts.depsPost++;
        const id = decodeURIComponent(depMatch[1]);
        const body = JSON.parse(raw);
        if (!f.dropDeps) {
          const list = f.deps.get(id) ?? [];
          list.push({ depends_on_id: body.depends_on_id, dep_type: body.type });
          f.deps.set(id, list);
        }
        return send(res, 200, { status: "added" });
      }
      send(res, 404, { error: "no route" });
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  f.url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  f.close = () =>
    new Promise<void>((r) => {
      server.closeAllConnections();
      server.close(() => r());
    });
  return f;
}

const row = (title: string, description: string, line = 1): PendingRow => ({
  source: "research-os-ai",
  title,
  description,
  issue_type: "task",
  priority: 2,
  line,
});

function batch(): PendingRow[] {
  return [
    row("ai-x: The epic", "Depends on: none. The plan."),
    row("ai-a: First", "Parent: ai-x. Depends on: none. Build A."),
    row("ai-b: Second", "Parent: ai-x. Depends on: ai-a. Build B."),
    row("ai-c: Third", "Parent: ai-x. Depends on: ai-b, ros-import 1, PR #190 merge. Build C."),
  ];
}

const EXTERNAL = { id: "bkt-ext1", title: "ros-import 1: data model and storage for imports" };

function ledgerStore(start: LedgerEntry[] = []) {
  const entries = [...start];
  return {
    entries,
    map: () => latestEntries(entries.map((e) => JSON.stringify(e)).join("\n")),
    record: (e: LedgerEntry) => {
      entries.push(e);
    },
  };
}

const api = (f: Fake, timeoutMs = 30_000) => httpApi(f.url, { user: USER, password: PASS }, timeoutMs);
const titled = (f: Fake, title: string) => f.issues.filter((i) => i.title === title);

test("titleKey and parseLinks read the pending records' own wording", () => {
  assert.equal(titleKey("ros-ai-corpus: Build permitted public source manifests"), "ros-ai-corpus");
  assert.equal(titleKey("ros-import 1: data model"), "ros-import 1");
  assert.equal(titleKey("no colon here"), "no colon here");
  assert.deepEqual(parseLinks("Parent: ros-ai. Depends on: ros-ai-find, ros-import 1, ros-import 2, ros-import 3. Coordinate as subwork."), {
    parent: "ros-ai",
    dependsOn: ["ros-ai-find", "ros-import 1", "ros-import 2", "ros-import 3"],
    conditions: [],
  });
  assert.deepEqual(parseLinks("Parent: ros-ai. Depends on: PR #190 merge. After PR190 lands, add rows."), {
    parent: "ros-ai",
    dependsOn: [],
    conditions: ["PR #190 merge"],
  });
  assert.deepEqual(parseLinks("Depends on: none. Own the approved architecture."), { parent: null, dependsOn: [], conditions: [] });
  assert.deepEqual(parseLinks("No links at all"), { parent: null, dependsOn: [], conditions: [] });
});

test("parsePending keeps the named source, reports bad lines, and keeps the first of a repeated title", () => {
  const text = [
    JSON.stringify({ source: "research-os-ai", title: "ai-a: First", description: "x", priority: 1, issue_type: "bug" }),
    "{not json",
    JSON.stringify({ source: "other", title: "ai-z: Elsewhere" }),
    JSON.stringify({ source: "research-os-ai", title: "ai-a: First", description: "second copy" }),
    JSON.stringify({ source: "research-os-ai", description: "no title" }),
    "",
  ].join("\n");
  const { rows, problems } = parsePending(text, ["research-os-ai"]);
  assert.deepEqual(rows.map((r) => [r.title, r.priority, r.issue_type, r.description, r.line]), [["ai-a: First", 1, "bug", "x", 1]]);
  assert.equal(problems.length, 3);
  assert.match(problems.join("\n"), /line 2: not JSON/);
  assert.match(problems.join("\n"), /line 4: repeats/);
  assert.match(problems.join("\n"), /line 5: no title/);
});

test("latestEntries takes the last state per title and skips a torn line", () => {
  const e = (state: LedgerEntry["state"], id: string | null) =>
    JSON.stringify({ source: "s", key: "k", title: "k: t", id, state, at: "2026-09-22T00:00:00Z" });
  const map = latestEntries([e("uncertain", null), e("adopted", "bkt-1"), e("retired", "bkt-1"), '{"source":"s","ti'].join("\n"));
  assert.equal(map.size, 1);
  assert.equal(map.get("s\u0000k: t")?.state, "retired");
});

test("findCycle names a loop among in-batch links and ignores links out of the batch", () => {
  assert.equal(findCycle(batch()), null);
  const loop = [row("ai-p: P", "Depends on: ai-q."), row("ai-q: Q", "Depends on: ai-p.")];
  assert.deepEqual(findCycle(loop), ["ai-p", "ai-q", "ai-p"]);
});

test("a cycle stops the run before any request", async () => {
  const f = await fakeServer();
  try {
    const l = ledgerStore();
    await assert.rejects(
      reconcile([row("ai-p: P", "Depends on: ai-q."), row("ai-q: Q", "Depends on: ai-p.")], l.map(), api(f), { apply: true, record: l.record }),
      /dependency cycle/,
    );
    assert.deepEqual(f.counts, { list: 0, create: 0, depsGet: 0, depsPost: 0, unauthorized: 0 });
  } finally {
    await f.close();
  }
});

test("a dry run sends only GETs and writes no ledger entry", async () => {
  const f = await fakeServer([EXTERNAL]);
  try {
    const l = ledgerStore();
    const r = await reconcile(batch(), l.map(), api(f), { apply: false, record: l.record });
    assert.equal(f.counts.create + f.counts.depsPost, 0);
    assert.equal(l.entries.length, 0);
    assert.deepEqual(r.rows.map((x) => x.outcome), ["would_create", "would_create", "would_create", "would_create"]);
    assert.deepEqual(r.conditions, [{ title: "ai-c: Third", condition: "PR #190 merge" }]);
  } finally {
    await f.close();
  }
});

test("apply files each row with one request, adds every edge, reads it back, and retires the row", async () => {
  const f = await fakeServer([EXTERNAL]);
  try {
    const l = ledgerStore();
    const r = await reconcile(batch(), l.map(), api(f), { apply: true, record: l.record });
    assert.equal(r.posts, 4);
    assert.equal(f.counts.create, 4, "one POST per created bead");
    assert.equal(f.counts.unauthorized, 0);
    assert.deepEqual(r.rows.map((x) => [x.key, x.outcome, x.edges]), [
      ["ai-x", "created", "retired"],
      ["ai-a", "created", "retired"],
      ["ai-b", "created", "retired"],
      ["ai-c", "created", "retired"],
    ]);
    const id = (key: string) => r.rows.find((x) => x.key === key)!.id!;
    assert.deepEqual(f.deps.get(id("ai-c")), [
      { depends_on_id: id("ai-x"), dep_type: "parent-child" },
      { depends_on_id: id("ai-b"), dep_type: "block" },
      { depends_on_id: "bkt-ext1", dep_type: "block" },
    ]);
    assert.deepEqual(f.deps.get(id("ai-b")), [
      { depends_on_id: id("ai-x"), dep_type: "parent-child" },
      { depends_on_id: id("ai-a"), dep_type: "block" },
    ]);
    assert.equal(f.deps.get(id("ai-x")), undefined, "the epic names no links");
    assert.deepEqual(titled(f, "ai-a: First")[0].labels, ["source:research-os-ai"]);
    assert.deepEqual(l.entries.map((e) => e.state), ["created", "created", "created", "created", "retired", "retired", "retired", "retired"]);
  } finally {
    await f.close();
  }
});

test("a rerun with the ledger sends no writes at all", async () => {
  const f = await fakeServer([EXTERNAL]);
  try {
    const l = ledgerStore();
    await reconcile(batch(), l.map(), api(f), { apply: true, record: l.record });
    const before = { ...f.counts };
    const written = l.entries.length;
    const r = await reconcile(batch(), l.map(), api(f), { apply: true, record: l.record });
    assert.equal(r.posts, 0);
    assert.equal(f.counts.create, before.create);
    assert.equal(f.counts.depsPost, before.depsPost);
    assert.equal(l.entries.length, written);
    assert.ok(r.rows.every((x) => x.outcome === "existing" && x.edges === "retired"));
    assert.equal(f.issues.length, 5);
  } finally {
    await f.close();
  }
});

test("a rerun with the ledger lost adopts by exact title and adds no edge twice", async () => {
  const f = await fakeServer([EXTERNAL]);
  try {
    await reconcile(batch(), new Map(), api(f), { apply: true, record: () => {} });
    const depsPosts = f.counts.depsPost;
    const creates = f.counts.create;
    const l = ledgerStore();
    const r = await reconcile(batch(), l.map(), api(f), { apply: true, record: l.record });
    assert.equal(f.counts.create, creates);
    assert.equal(f.counts.depsPost, depsPosts);
    assert.ok(r.rows.every((x) => x.outcome === "adopted" && x.edges === "retired"));
    assert.equal(f.issues.length, 5);
  } finally {
    await f.close();
  }
});

test("a timeout after the server wrote the row is found by lookup, and nothing is sent twice", async () => {
  const f = await fakeServer();
  try {
    f.mode.set("ai-a: First", "slowAfterWrite");
    const l = ledgerStore();
    const r = await reconcile([row("ai-a: First", "Depends on: none.")], l.map(), api(f, 1000), { apply: true, record: l.record });
    assert.equal(f.counts.create, 1);
    assert.equal(r.rows[0].outcome, "adopted");
    assert.match(r.rows[0].detail.join(" "), /the lookup found it/);
    assert.equal(titled(f, "ai-a: First").length, 1);
    assert.deepEqual(l.entries.map((e) => e.state), ["adopted", "retired"]);
  } finally {
    await f.close();
  }
});

test("a timeout with no write stays uncertain; the next run looks it up and files it once", async () => {
  const f = await fakeServer();
  try {
    f.mode.set("ai-a: First", "slowNoWrite");
    const l = ledgerStore();
    const first = await reconcile([row("ai-a: First", "Depends on: none.")], l.map(), api(f, 1000), { apply: true, record: l.record });
    assert.equal(first.rows[0].outcome, "uncertain");
    assert.equal(first.rows[0].edges, "none");
    assert.equal(l.entries.at(-1)?.state, "uncertain");
    f.mode.delete("ai-a: First");
    const listsBefore = f.counts.list;
    const second = await reconcile([row("ai-a: First", "Depends on: none.")], l.map(), api(f), { apply: true, record: l.record });
    assert.ok(f.counts.list > listsBefore, "the rerun lists before it sends");
    assert.equal(second.rows[0].outcome, "created");
    assert.equal(titled(f, "ai-a: First").length, 1);
    assert.equal(f.counts.create, 2);
  } finally {
    await f.close();
  }
});

test("a 5xx after the write is treated as unknown and resolved by lookup", async () => {
  const f = await fakeServer();
  try {
    f.mode.set("ai-a: First", "proxy500AfterWrite");
    const l = ledgerStore();
    const r = await reconcile([row("ai-a: First", "Depends on: none.")], l.map(), api(f), { apply: true, record: l.record });
    assert.equal(r.rows[0].outcome, "adopted");
    assert.equal(titled(f, "ai-a: First").length, 1);
    assert.equal(l.entries[0].http, 502);
  } finally {
    await f.close();
  }
});

test("a 200 carrying an error is a failure, keeps the row, and a later run files it", async () => {
  const f = await fakeServer();
  try {
    f.mode.set("ai-a: First", "error200");
    const l = ledgerStore();
    const r = await reconcile([row("ai-a: First", "Depends on: none.")], l.map(), api(f), { apply: true, record: l.record });
    assert.equal(r.rows[0].outcome, "failed");
    assert.match(r.rows[0].detail[0], /HTTP 200: store down/);
    assert.equal(f.issues.length, 0);
    assert.deepEqual([l.entries[0].state, l.entries[0].http, l.entries[0].note], ["failed", 200, "store down"]);
    f.mode.delete("ai-a: First");
    const again = await reconcile([row("ai-a: First", "Depends on: none.")], l.map(), api(f), { apply: true, record: l.record });
    assert.equal(again.rows[0].outcome, "created");
    assert.equal(f.issues.length, 1);
  } finally {
    await f.close();
  }
});

test("a 4xx is a failure with no lookup and no second request", async () => {
  const f = await fakeServer();
  try {
    f.mode.set("ai-a: First", "reject400");
    const l = ledgerStore();
    const r = await reconcile([row("ai-a: First", "Depends on: none.")], l.map(), api(f), { apply: true, record: l.record });
    assert.equal(r.rows[0].outcome, "failed");
    assert.equal(f.counts.create, 1);
    assert.equal(f.counts.list, 1);
  } finally {
    await f.close();
  }
});

test("two remote issues with one title stop that row and send nothing for it", async () => {
  const f = await fakeServer([
    { id: "bkt-d1", title: "ai-a: First" },
    { id: "bkt-d2", title: "ai-a: First" },
  ]);
  try {
    const l = ledgerStore();
    const r = await reconcile([row("ai-a: First", "Depends on: none.")], l.map(), api(f), { apply: true, record: l.record });
    assert.equal(r.rows[0].outcome, "ambiguous");
    assert.match(r.rows[0].detail[0], /bkt-d1, bkt-d2/);
    assert.equal(f.counts.create + f.counts.depsPost, 0);
    assert.equal(l.entries.length, 0);
  } finally {
    await f.close();
  }
});

test("a ledger id the server no longer lists is reported and never recreated", async () => {
  const f = await fakeServer();
  try {
    const l = ledgerStore([{ source: "research-os-ai", key: "ai-a", title: "ai-a: First", id: "bkt-gone", state: "created", at: "2026-09-22T00:00:00Z" }]);
    const r = await reconcile([row("ai-a: First", "Depends on: none.")], l.map(), api(f), { apply: true, record: l.record });
    assert.equal(r.rows[0].outcome, "missing");
    assert.equal(f.counts.create, 0);
  } finally {
    await f.close();
  }
});

test("a link to a bead the server lacks keeps the row waiting until it appears", async () => {
  const f = await fakeServer();
  try {
    const l = ledgerStore();
    const r = await reconcile(batch(), l.map(), api(f), { apply: true, record: l.record });
    const c = r.rows.find((x) => x.key === "ai-c")!;
    assert.equal(c.edges, "waiting");
    assert.match(c.detail.join(" "), /no single remote issue for: ros-import 1/);
    assert.ok(!l.entries.some((e) => e.key === "ai-c" && e.state === "retired"));
    f.issues.push({ ...EXTERNAL, labels: [] });
    const creates = f.counts.create;
    const again = await reconcile(batch(), l.map(), api(f), { apply: true, record: l.record });
    assert.equal(f.counts.create, creates);
    assert.equal(again.rows.find((x) => x.key === "ai-c")!.edges, "retired");
    assert.equal(f.deps.get(c.id!)!.filter((d) => d.depends_on_id === again.rows.find((x) => x.key === "ai-b")!.id).length, 1);
  } finally {
    await f.close();
  }
});

test("an edge the server accepts but does not keep fails the read-back, so the row waits", async () => {
  const f = await fakeServer([EXTERNAL]);
  try {
    f.dropDeps = true;
    const l = ledgerStore();
    const r = await reconcile([row("ai-a: First", "Depends on: ros-import 1.")], l.map(), api(f), { apply: true, record: l.record });
    assert.equal(r.rows[0].edges, "waiting");
    assert.match(r.rows[0].detail.join(" "), /the read-back lacks: block bkt-ext1/);
    assert.ok(!l.entries.some((e) => e.state === "retired"));
  } finally {
    await f.close();
  }
});

test("a failed list stops the run with nothing written", async () => {
  const f = await fakeServer();
  try {
    f.failList = true;
    const l = ledgerStore();
    await assert.rejects(reconcile(batch(), l.map(), api(f), { apply: true, record: l.record }), /list issues: HTTP 502/);
    assert.equal(f.counts.create + f.counts.depsPost, 0);
    assert.equal(l.entries.length, 0);
  } finally {
    await f.close();
  }
});

test("a batch key whose row failed never borrows an older remote issue with that key", async () => {
  const f = await fakeServer([{ id: "bkt-old", title: "ai-a: An older bead with the same key" }]);
  try {
    f.mode.set("ai-a: First", "reject400");
    const l = ledgerStore();
    const r = await reconcile([row("ai-a: First", "Depends on: none."), row("ai-b: Second", "Depends on: ai-a.")], l.map(), api(f), {
      apply: true,
      record: l.record,
    });
    const b = r.rows.find((x) => x.key === "ai-b")!;
    assert.equal(b.edges, "waiting");
    assert.match(b.detail.join(" "), /no single remote issue for: ai-a/);
    assert.equal(f.deps.get(b.id!), undefined, "no edge to bkt-old");
  } finally {
    await f.close();
  }
});

test("the run lock holds against a live process, takes over a dead one, and releases", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "dispatch-lock-"));
  try {
    const file = path.join(dir, "lock");
    const release = acquireLock(file);
    assert.equal(readFileSync(file, "utf8"), String(process.pid));
    assert.throws(() => acquireLock(file), /another dispatch holds/);
    release();
    assert.equal(existsSync(file), false);
    writeFileSync(file, "999999999");
    const again = acquireLock(file);
    assert.equal(readFileSync(file, "utf8"), String(process.pid));
    again();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the twelve research-os-ai records parse, form no cycle, and name only known keys", async () => {
  const { rows } = parsePending(readFileSync(path.join(__dirname, "..", "BEADS-PENDING.jsonl"), "utf8"), ["research-os-ai"]);
  assert.equal(rows.length, 12);
  assert.equal(findCycle(rows), null);
  const keys = new Set(rows.map((r) => titleKey(r.title)));
  const outside = new Set<string>();
  for (const r of rows) {
    const l = parseLinks(r.description);
    if (l.parent) assert.ok(keys.has(l.parent), `${r.title} names parent ${l.parent}`);
    for (const d of l.dependsOn) if (!keys.has(d)) outside.add(d);
  }
  assert.deepEqual(Array.from(outside).sort(), ["ros-import 1", "ros-import 2", "ros-import 3", "ros-truth 1", "ros-truth 2"]);
});
