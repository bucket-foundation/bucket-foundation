import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRemoteSync } from "../../../src/lib/academy/remote-sync";
import { newDataKey } from "../src/crypto";
import { MemoryKeyring } from "../src/keyring";
import { ensureDevice } from "../src/device";
import { Store } from "../src/store";
import { sealedMetaStorage, SYNC_META_PREFIX } from "../src/sync/store-storage";
import { syncRoutes } from "../src/sync/routes";
import { FileVault, MemoryVault, pickVault, VaultError, type StoredSession } from "../src/sync/token-vault";

const session: StoredSession = { access_token: "at", refresh_token: "rt", expires_at: 4_000_000_000, user_id: "u1", device_id: "dev_x", supabase_url: "http://sb", anon_key: "anon" };

let dir: string;
let store: Store;
let key: Buffer;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "bkt-sync-"));
  key = newDataKey();
  store = new Store(join(dir, "bkt.db"), key);
});

afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

describe("file session vault", () => {
  test("writes the session with mode 0600 in a 0700 folder and reads it back", async () => {
    const v = new FileVault(join(dir, "account", "session.json"));
    await v.set(session);
    expect(statSync(join(dir, "account", "session.json")).mode & 0o777).toBe(0o600);
    expect(statSync(join(dir, "account")).mode & 0o777).toBe(0o700);
    expect(await v.get()).toEqual(session);
    await v.set({ ...session, refresh_token: "rt2" });
    expect((await v.get())?.refresh_token).toBe("rt2");
    await v.clear();
    expect(await v.get()).toBeNull();
  });

  test("refuses a session file other users can read", async () => {
    const f = join(dir, "session.json");
    const v = new FileVault(f);
    await v.set(session);
    chmodSync(f, 0o644);
    await expect(v.get()).rejects.toBeInstanceOf(VaultError);
  });

  test("headless Linux without a session bus falls back to the file vault", () => {
    expect(pickVault(join(dir, "s.json"), { PATH: "/usr/bin" }).kind).toBe("file");
    expect(pickVault(join(dir, "s.json"), { PATH: "/usr/bin", DBUS_SESSION_BUS_ADDRESS: "x", BKT_SESSION_STORE: "file" }).kind).toBe("file");
  });
});

describe("SQLite outbox", () => {
  test("sync state is sealed in the database and survives a reopen", () => {
    const s = sealedMetaStorage(store, key);
    s.setItem("bucket-academy/outbox/v1", JSON.stringify({ reviews: [{ review_id: "r1" }] }));
    const raw = store.meta(`${SYNC_META_PREFIX}bucket-academy/outbox/v1`)!;
    expect(raw.startsWith("v1:")).toBe(true);
    expect(raw.includes("review_id")).toBe(false);
    store.close();
    store = new Store(join(dir, "bkt.db"), key);
    expect(JSON.parse(sealedMetaStorage(store, key).getItem("bucket-academy/outbox/v1")!).reviews[0].review_id).toBe("r1");
    expect(sealedMetaStorage(store, key).length).toBe(1);
    sealedMetaStorage(store, key).removeItem("bucket-academy/outbox/v1");
    expect(sealedMetaStorage(store, key).getItem("bucket-academy/outbox/v1")).toBeNull();
  });

  test("a review appended through bkt serve waits in the database while signed out and carries the device key id", async () => {
    const device = await ensureDevice(new MemoryKeyring());
    const remote = createRemoteSync({
      base: "http://bucket.test",
      storage: () => sealedMetaStorage(store, key),
      vault: new MemoryVault(),
      device: { id: device.id, publicKey: device.publicKey, sign: (m) => device.sign(m) },
      readLocal: () => null,
      fetch: async () => new Response("{}", { status: 500 }),
    });
    const routes = syncRoutes(remote, { label: () => "test" });
    const res = await routes["POST /local/review-log"](new Request("http://127.0.0.1/local/review-log", { method: "POST", body: JSON.stringify({ branch: "lang", review: { card_id: "ru:da", rating: 3, level: "recall", reviewed_at: 1_760_000_000_000, tz: "UTC", atoms_version: "lang" } }) }), new URL("http://127.0.0.1/local/review-log"), { cli: false });
    expect(res.status).toBe(200);
    await remote.sync.flush();
    const pending = remote.sync.pending();
    expect(pending.length).toBe(1);
    expect(pending[0].device_id).toBe(device.id);
    const account = await routes["GET /local/account"](new Request("http://127.0.0.1/local/account"), new URL("http://127.0.0.1/local/account"), { cli: false });
    expect(((await account.json()) as { signed_in: boolean }).signed_in).toBe(false);
    const bad = await routes["POST /local/review-log"](new Request("http://127.0.0.1/local/review-log", { method: "POST", body: JSON.stringify({ branch: "lang", review: { rating: 9 } }) }), new URL("http://127.0.0.1/local/review-log"), { cli: false });
    expect(bad.status).toBe(400);
  });
});
