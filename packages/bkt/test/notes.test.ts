import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { newDataKey } from "../src/crypto";
import { MAX_TITLE, NotesStore, notesRoutes, type Note } from "../src/notes";
import { startServe, type Serve } from "../src/serve";
import { Store } from "../src/store";

let dir: string;
let store: Store;
let s: Serve;
let auth: Record<string, string>;
let clock = 1000;
const req = (path: string, init: { method?: string; body?: unknown } = {}) =>
  fetch(`http://127.0.0.1:${s.port}${path}`, { method: init.method ?? "GET", body: init.body === undefined ? undefined : JSON.stringify(init.body), headers: { host: `127.0.0.1:${s.port}`, ...auth } });

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), "bkt-notes-"));
  const key = newDataKey();
  store = new Store(join(dir, "bkt.db"), key);
  s = startServe({ uid: 6, resolvePeerUid: () => 6, routes: notesRoutes(new NotesStore(store, key), () => clock) });
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

describe("notes", () => {
  test("create, update, pin, list order and delete", async () => {
    const a = (await (await req("/local/notes", { method: "POST", body: { title: "Water", body: "Exclusion zones grow near hydrophilic surfaces." } })).json()) as Note;
    clock = 2000;
    const b = (await (await req("/local/notes", { method: "POST", body: { title: "Light", body: "Red light and mitochondria." } })).json()) as Note;
    let list = ((await (await req("/local/notes")).json()) as { notes: Note[] }).notes;
    expect(list.map((n) => n.title)).toEqual(["Light", "Water"]);
    clock = 3000;
    await req("/local/notes", { method: "POST", body: { id: a.id, title: "Water", body: "edited", pinned: true } });
    list = ((await (await req("/local/notes")).json()) as { notes: Note[] }).notes;
    expect(list.map((n) => [n.title, n.pinned, n.body])).toEqual([
      ["Water", true, "edited"],
      ["Light", false, "Red light and mitochondria."],
    ]);
    expect(list[0].createdAt).toBe(1000);
    expect(list[0].updatedAt).toBe(3000);
    expect(await (await req("/local/notes/delete", { method: "POST", body: { id: b.id } })).json()).toEqual({ deleted: b.id });
    expect((await req("/local/notes/delete", { method: "POST", body: { id: b.id } })).status).toBe(404);
  });

  test("notes are sealed at rest", async () => {
    await req("/local/notes", { method: "POST", body: { title: "Private plan", body: "structured water hypothesis draft" } });
    store.db.run("pragma wal_checkpoint(truncate)");
    for (const f of readdirSync(dir)) {
      const bytes = readFileSync(join(dir, f));
      expect(bytes.includes("Private plan")).toBe(false);
      expect(bytes.includes("structured water")).toBe(false);
    }
  });

  test("bad input is refused", async () => {
    expect((await req("/local/notes", { method: "POST", body: { title: "x" } })).status).toBe(400);
    expect((await req("/local/notes", { method: "POST", body: { id: "../x", title: "x", body: "y" } })).status).toBe(400);
    expect((await req("/local/notes", { method: "POST", body: { id: "00000000-0000-0000-0000-000000000000", title: "x", body: "y" } })).status).toBe(404);
    expect((await req("/local/notes", { method: "POST", body: { title: "x".repeat(MAX_TITLE + 1), body: "y" } })).status).toBe(413);
    auth = {};
    expect((await req("/local/notes")).status).toBe(401);
  });
});
