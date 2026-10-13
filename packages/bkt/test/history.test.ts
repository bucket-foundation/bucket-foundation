import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseProductionsSnapshot, SnapshotError } from "../../../src/lib/research-os/productions-snapshot";
import { newDataKey } from "../src/crypto";
import { DAY_MS, HistoryStore, historyRoutes, type ActivityDay } from "../src/history";
import { NotesStore } from "../src/notes";
import { startServe, type Serve } from "../src/serve";
import { Store } from "../src/store";

const SNAP = {
  productions: [
    { id: "p1", kind: "production", status: "accepted", claim: "Structured water forms near hydrophilic walls", target_node_id: "n1", related_node_id: null, node_id: "n9", notes: [{ at: "2026-09-01", decision: "accept" }], updated_at: "2026-09-02T00:00:00Z" },
    { id: "p2", kind: "extension", status: "draft", claim: null, target_node_id: "n1", related_node_id: "n2", node_id: null, notes: null, updated_at: "2026-09-20T00:00:00Z" },
    { id: "bad", status: "nope", target_node_id: "n1", updated_at: "x" },
  ],
  nodes: { n1: { slug: "water", title: "Water", kind: "concept" }, n9: { slug: "ez", title: "Exclusion zone", kind: "claim" } },
};

describe("productions snapshot", () => {
  test("keeps valid rows and drops malformed ones", () => {
    const s = parseProductionsSnapshot(SNAP);
    expect(s.productions.map((p) => [p.id, p.status])).toEqual([
      ["p1", "accepted"],
      ["p2", "draft"],
    ]);
    expect(s.productions[1].notes).toEqual([]);
    expect(Object.keys(s.nodes)).toEqual(["n1", "n9"]);
    expect(() => parseProductionsSnapshot({ rows: [] })).toThrow(SnapshotError);
  });
});

describe("history routes", () => {
  let dir: string;
  let store: Store;
  let s: Serve;
  let auth: Record<string, string>;
  const NOW = Date.UTC(2026, 8, 30, 12);
  const req = (path: string, init: { method?: string; body?: unknown } = {}) =>
    fetch(`http://127.0.0.1:${s.port}${path}`, { method: init.method ?? "GET", body: init.body === undefined ? undefined : JSON.stringify(init.body), headers: { host: `127.0.0.1:${s.port}`, ...auth } });

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), "bkt-hist-"));
    const key = newDataKey();
    store = new Store(join(dir, "bkt.db"), key);
    new NotesStore(store, key).save({ title: "t", body: "b", pinned: false }, NOW - DAY_MS);
    s = startServe({ uid: 8, resolvePeerUid: () => 8, routes: historyRoutes(new HistoryStore(store, key), () => NOW) });
    auth = {};
    const nonce = (await (await req("/")).text()).match(/"nonce":"([A-Za-z0-9_-]+)"/)![1];
    const r = await fetch(`http://127.0.0.1:${s.port}/session`, { method: "POST", body: JSON.stringify({ nonce }), headers: { host: `127.0.0.1:${s.port}`, origin: `http://127.0.0.1:${s.port}` } });
    auth = { authorization: `Bucket ${((await r.json()) as { token: string }).token}` };
  });
  afterEach(() => {
    s.stop();
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });

  test("import, read, activity and forget; the snapshot is sealed", async () => {
    expect(await (await req("/local/history/import", { method: "POST", body: SNAP })).json()).toEqual({ productions: 2 });
    const got = (await (await req("/local/history")).json()) as { snapshot: { productions: unknown[] }; activity: ActivityDay[] };
    expect(got.snapshot.productions).toHaveLength(2);
    expect(got.activity).toHaveLength(60);
    expect(got.activity.find((d) => d.day === "2026-09-29")!.notes).toBe(1);
    store.db.run("pragma wal_checkpoint(truncate)");
    for (const f of readdirSync(dir)) expect(readFileSync(join(dir, f)).includes("Structured water")).toBe(false);
    await req("/local/history/forget", { method: "POST", body: {} });
    expect(((await (await req("/local/history")).json()) as { snapshot: unknown }).snapshot).toBeNull();
  });

  test("a snapshot over the size cap is refused and nothing is stored", async () => {
    const big = { productions: Array.from({ length: 1200 }, (_, i) => ({ ...SNAP.productions[0], id: `p${i}`, claim: "x".repeat(3900) })), nodes: SNAP.nodes };
    const r = await req("/local/history/import", { method: "POST", body: big });
    expect(r.status).toBe(413);
    expect(((await (await req("/local/history")).json()) as { snapshot: unknown }).snapshot).toBeNull();
  });

  test("bad files are refused", async () => {
    expect((await req("/local/history/import", { method: "POST", body: { productions: "x" } })).status).toBe(400);
    auth = {};
    expect((await req("/local/history")).status).toBe(401);
  });
});
