import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildEncompassingMap, grade, normalizeState, type Atom } from "../../../src/lib/academy/engine";
import { SyncError, type RemoteSync } from "../../../src/lib/academy/remote-sync";
import { newDataKey } from "../src/crypto";
import { Store } from "../src/store";
import { pullRemoteProgress } from "../src/sync/pull-progress";
import { startSyncLoop } from "../src/sync/routes";

const ATOMS = [
  { id: "a", title: "A", shell: "nucleus" },
  { id: "b", title: "B", shell: "nucleus" },
] as unknown as Atom[];
const T = Date.UTC(2026, 9, 19, 9);

let dir: string;
let store: Store;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "bkt-pull-"));
  store = new Store(join(dir, "bkt.db"), newDataKey());
});

afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

const remoteWith = (branches: unknown, status = 200) => ({ signedFetch: async () => new Response(JSON.stringify({ branches }), { status }) });

describe("pulling the account's progress into the desktop store", () => {
  test("a grade made on the web shows on the desktop and keeps the desktop's own grades", async () => {
    const enc = buildEncompassingMap(ATOMS);
    store.putLearnState("phys", grade(normalizeState(null), ATOMS, enc, "a", 3, "recall", T), T);
    const web = grade(normalizeState(null), ATOMS, enc, "b", 4, "recall", T + 1000);
    const changed = await pullRemoteProgress(remoteWith({ phys: { data: web }, "lang-systems": { data: { systems: [] } }, "bad key!": { data: web } }), store, () => T + 2000);
    expect(changed).toEqual(["phys"]);
    expect(Object.keys(store.learnState("phys").cards).sort()).toEqual(["a", "b"]);
    expect(store.learnDecks()).not.toContain("lang-systems");
    expect(await pullRemoteProgress(remoteWith({ phys: { data: web } }), store)).toEqual([]);
  });

  test("a refused or offline pull changes nothing", async () => {
    expect(await pullRemoteProgress(remoteWith({}, 401), store)).toBeNull();
    const offline = { signedFetch: async (): Promise<Response> => { throw new SyncError("off", "offline"); } };
    expect(await pullRemoteProgress(offline, store)).toBeNull();
    expect(store.learnDecks()).toEqual([]);
  });

  test("the serve loop flushes, pulls and folds while signed in, and stays quiet while signed out", async () => {
    const calls: string[] = [];
    let signedIn = false;
    const remote = {
      session: async () => (signedIn ? { user_id: "u1" } : null),
      sync: { flush: async () => void calls.push("flush"), pullLog: async () => (calls.push("pull"), []) },
    } as unknown as RemoteSync;
    const errors: string[] = [];
    let stop = startSyncLoop(remote, async () => calls.push("progress"), (m) => errors.push(m), 60_000);
    await new Promise((r) => setTimeout(r, 5));
    stop();
    expect(calls).toEqual([]);
    signedIn = true;
    stop = startSyncLoop(remote, async () => calls.push("progress"), (m) => errors.push(m), 60_000);
    await new Promise((r) => setTimeout(r, 5));
    stop();
    expect(calls).toEqual(["flush", "pull", "progress"]);
    expect(errors).toEqual([]);
  });
});
