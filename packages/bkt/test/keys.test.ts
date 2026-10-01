import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DATA_KEY_ACCOUNT, DEVICE_ACCOUNT, deviceIdFor, ensureDataKey, ensureDevice, scopedAccounts, verifyDeviceSignature } from "../src/device";
import { MemoryKeyring, PassphraseKeyring, SecretToolKeyring, type Keyring } from "../src/keyring";
import { keyringOptions, resolve } from "../src/cli/run";
import { Database } from "bun:sqlite";
import { existingDb, keyAccounts, keyScope, openSession, pickKeyring } from "../src/setup";
import { Store } from "../src/store";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "bkt-keys-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("device key", () => {
  test("first run creates an ed25519 key, second run loads the same one", async () => {
    const kr = new MemoryKeyring();
    const first = await ensureDevice(kr);
    expect(first.created).toBe(true);
    expect(Buffer.from(first.publicKey, "base64")).toHaveLength(32);
    expect(first.id).toBe(deviceIdFor(first.publicKey));
    expect(await kr.get(DEVICE_ACCOUNT)).toContain("BEGIN PRIVATE KEY");
    const second = await ensureDevice(kr);
    expect(second.created).toBe(false);
    expect(second.publicKey).toBe(first.publicKey);
  });

  test("signatures verify against the public key and fail on tamper", async () => {
    const d = await ensureDevice(new MemoryKeyring());
    const sig = d.sign("v1\nhub.bucket.foundation\n/sync\n1700000000\nnonce\n{}");
    expect(verifyDeviceSignature(d.publicKey, "v1\nhub.bucket.foundation\n/sync\n1700000000\nnonce\n{}", sig)).toBe(true);
    expect(verifyDeviceSignature(d.publicKey, "v1\nhub.bucket.foundation\n/sync\n1700000001\nnonce\n{}", sig)).toBe(false);
    const other = await ensureDevice(new MemoryKeyring());
    expect(verifyDeviceSignature(other.publicKey, "x", d.sign("x"))).toBe(false);
  });

  test("rejects a non-ed25519 key in the keyring", async () => {
    const kr = new MemoryKeyring();
    const { generateKeyPairSync } = await import("node:crypto");
    const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    await kr.set(DEVICE_ACCOUNT, privateKey.export({ type: "pkcs8", format: "pem" }).toString());
    await expect(ensureDevice(kr)).rejects.toThrow("not ed25519");
  });

  test("fails when the keyring drops the write", async () => {
    const kr = { kind: "memory" as const, get: async () => null, set: async () => {} };
    await expect(ensureDevice(kr)).rejects.toThrow("did not persist");
  });
});

describe("data key", () => {
  test("is 32 bytes and stable", async () => {
    const kr = new MemoryKeyring();
    const a = await ensureDataKey(kr);
    expect(a).toHaveLength(32);
    expect((await ensureDataKey(kr)).equals(a)).toBe(true);
  });

  test("rejects a truncated stored key", async () => {
    const kr = new MemoryKeyring();
    await kr.set(DATA_KEY_ACCOUNT, "abcd");
    await expect(ensureDataKey(kr)).rejects.toThrow("wrong length");
  });
});

describe("passphrase keyring", () => {
  test("stores secrets sealed on disk with mode 600", async () => {
    const file = join(dir, "keyring.json");
    const kr = new PassphraseKeyring(file, "correct horse");
    await kr.set("db-data-key", "SECRET-VALUE");
    expect(readFileSync(file, "utf8")).not.toContain("SECRET-VALUE");
    expect(statSync(file).mode & 0o777).toBe(0o600);
    expect(await new PassphraseKeyring(file, "correct horse").get("db-data-key")).toBe("SECRET-VALUE");
  });

  test("wrong passphrase is refused", () => {
    const file = join(dir, "keyring.json");
    new PassphraseKeyring(file, "right");
    expect(() => new PassphraseKeyring(file, "wrong")).toThrow("wrong passphrase");
  });

  test("empty passphrase is refused", () => {
    expect(() => new PassphraseKeyring(join(dir, "k.json"), "")).toThrow("empty passphrase");
  });
});

describe("libsecret keyring", () => {
  test("round trips through a secret-tool compatible binary", async () => {
    const store = join(dir, "store");
    const bin = join(dir, "secret-tool");
    writeFileSync(
      bin,
      `#!/usr/bin/env bash\nset -e\nf="${store}.\${@: -1}"\nif [ "$1" = store ]; then cat > "$f"; elif [ -f "$f" ]; then cat "$f"; else exit 1; fi\n`,
    );
    chmodSync(bin, 0o755);
    const kr = new SecretToolKeyring(bin);
    expect(await kr.get("device-ed25519")).toBeNull();
    const d = await ensureDevice(kr);
    expect(d.created).toBe(true);
    expect((await ensureDevice(kr)).publicKey).toBe(d.publicKey);
  });
});

describe("openSession", () => {
  test("records the device and refuses a db bound to another device", async () => {
    const path = dir;
    const kr = new MemoryKeyring();
    const s = await openSession(kr, path, 1);
    expect(s.store.device()!.id).toBe(s.device.id);
    s.store.close();
    const reopened = await openSession(kr, path, 2);
    expect(reopened.device.created).toBe(false);
    reopened.store.close();
    const intruder = new MemoryKeyring();
    const held = keyAccounts(path);
    await intruder.set(held.data, (await kr.get(held.data))!);
    await ensureDevice(intruder, undefined, held.device);
    await expect(openSession(intruder, path, 3)).rejects.toThrow("belongs to device");
  });
});

function fakeSecretTool(body: string): SecretToolKeyring {
  const bin = join(dir, "fake-secret-tool");
  writeFileSync(bin, `#!/usr/bin/env bash\n${body}\n`);
  chmodSync(bin, 0o755);
  return new SecretToolKeyring(bin);
}

describe("keyring failures never mint keys", () => {
  test("lookup error with stderr throws and stores nothing", async () => {
    const marker = join(dir, "stored");
    const kr = fakeSecretTool(`if [ "$1" = store ]; then touch "${marker}"; exit 0; fi\necho "Cannot autolaunch D-Bus" >&2; exit 1`);
    await expect(ensureDataKey(kr)).rejects.toThrow("secret-tool lookup failed");
    await expect(ensureDevice(kr)).rejects.toThrow("secret-tool lookup failed");
    expect(existsSync(marker)).toBe(false);
  });

  test("lookup exit codes other than 1 throw", async () => {
    await expect(fakeSecretTool("exit 2").get("x")).rejects.toThrow("exit 2");
  });

  test("a throwing keyring surfaces the error from openSession", async () => {
    let sets = 0;
    const kr = {
      kind: "memory" as const,
      get: async (): Promise<string | null> => {
        throw new Error("locked collection");
      },
      set: async () => {
        sets++;
      },
    };
    await expect(openSession(kr, dir)).rejects.toThrow("locked collection");
    expect(sets).toBe(0);
  });

  test("set refuses to overwrite an existing secret", async () => {
    const kr = new MemoryKeyring();
    await kr.set("a", "1");
    await expect(kr.set("a", "2")).rejects.toThrow("refusing to overwrite");
    expect(await kr.get("a")).toBe("1");
    const vault = new PassphraseKeyring(join(dir, "v.json"), "pw");
    await vault.set("a", "1");
    await expect(vault.set("a", "2")).rejects.toThrow("refusing to overwrite");
    const st = fakeSecretTool(`if [ "$1" = store ]; then exit 0; fi\nprintf existing`);
    await expect(st.set("a", "new")).rejects.toThrow("refusing to overwrite");
  });

  test("parallel first runs share one data key and one device key", async () => {
    const kr = new MemoryKeyring();
    const runs = await Promise.all([1, 2, 3, 4].map(() => openSession(kr, dir)));
    expect(new Set(runs.map((r) => r.device.id)).size).toBe(1);
    expect(runs.filter((r) => r.device.created)).toHaveLength(1);
    runs.forEach((r) => r.store.close());
  });

  test("vault dir is reset to 0700 on start", () => {
    mkdirSync(join(dir, "vault"), { mode: 0o755 });
    chmodSync(join(dir, "vault"), 0o755);
    new PassphraseKeyring(join(dir, "vault", "k.json"), "pw");
    expect(statSync(join(dir, "vault")).mode & 0o777).toBe(0o700);
  });
});

describe("keyring selection", () => {
  test("refuses silent fallback when libsecret is missing", async () => {
    await expect(pickKeyring({}, dir, { PATH: "/nonexistent" })).rejects.toThrow("--keyring passphrase");
  });

  test("reads the passphrase from --passphrase-fd", async () => {
    const f = join(dir, "pass");
    writeFileSync(f, "secret\n");
    const fd = openSync(f, "r");
    const inv = resolve(["init", "--keyring=passphrase", "--passphrase-fd", String(fd)]);
    if (inv.kind !== "run") throw new Error("expected a command");
    expect(inv.command.name).toBe("init");
    const kr = await pickKeyring(keyringOptions(inv), dir, {});
    expect(kr.kind).toBe("passphrase");
    expect(() => new PassphraseKeyring(join(dir, "keyring.json"), "secret")).not.toThrow();
  });

  test("rejects unknown flags and bad fds", () => {
    expect(() => resolve(["--nope"])).toThrow("unknown option --nope");
    expect(() => resolve(["--passphrase-fd", "x"])).toThrow("file descriptor");
  });
});

function counting(inner: Keyring) {
  const calls = { get: 0, set: 0 };
  const kr: Keyring = {
    kind: inner.kind,
    get: (a) => (calls.get++, inner.get(a)),
    set: (a, v) => (calls.set++, inner.set(a, v)),
  };
  return { kr, calls };
}

describe("keyring guard", () => {
  const db = () => join(dir, "bkt.db");

  test("a fresh home mints one data key and one device key", async () => {
    const { kr, calls } = counting(new MemoryKeyring());
    const s = await openSession(kr, dir, 1);
    s.store.close();
    expect(calls.set).toBe(2);
    expect(s.device.created).toBe(true);
    expect(existsSync(db())).toBe(true);
  });

  test("an existing database with its keys opens and stores nothing", async () => {
    const inner = new MemoryKeyring();
    (await openSession(inner, dir, 1)).store.close();
    const { kr, calls } = counting(inner);
    const s = await openSession(kr, dir, 2);
    s.store.close();
    expect(calls.set).toBe(0);
    expect(s.device.created).toBe(false);
  });

  test("an existing database with a lookup miss refuses and leaves the database and keyring alone", async () => {
    (await openSession(new MemoryKeyring(), dir, 1)).store.close();
    const before = readFileSync(db());
    const { kr, calls } = counting(new MemoryKeyring());
    const failure = await openSession(kr, dir, 2).catch((e: Error) => e);
    expect((failure as Error).message).toContain("keyring locked or key missing");
    expect((failure as Error).message).toContain("--keyring");
    expect(calls.set).toBe(0);
    expect(await kr.get(keyAccounts(dir).data)).toBeNull();
    expect(readFileSync(db()).equals(before)).toBe(true);
  });

  test("an existing database with a failing lookup refuses and stores nothing", async () => {
    (await openSession(new MemoryKeyring(), dir, 1)).store.close();
    let sets = 0;
    const kr: Keyring = {
      kind: "libsecret",
      get: async () => {
        throw new Error("collection is locked");
      },
      set: async () => {
        sets++;
      },
    };
    const failure = await openSession(kr, dir, 2).catch((e: Error) => e);
    expect((failure as Error).message).toContain("keyring locked or key missing");
    expect((failure as Error).message).toContain("collection is locked");
    expect((failure as Error).message).toContain("Unlock the login keyring");
    expect(sets).toBe(0);
  });

  test("a locked secret-service collection that exits 1 with empty stderr never reaches store", async () => {
    (await openSession(new MemoryKeyring(), dir, 1)).store.close();
    const marker = join(dir, "stored");
    const kr = fakeSecretTool(`if [ "$1" = store ]; then touch "${marker}"; exit 0; fi\nexit 1`);
    await expect(openSession(kr, dir, 2)).rejects.toThrow("keyring locked or key missing");
    expect(existsSync(marker)).toBe(false);
  });

  test("a data key without a device key refuses instead of minting a device", async () => {
    const first = new MemoryKeyring();
    (await openSession(first, dir, 1)).store.close();
    const partial = new MemoryKeyring();
    const held = keyAccounts(dir);
    await partial.set(held.data, (await first.get(held.data))!);
    await expect(openSession(partial, dir, 2)).rejects.toThrow("keyring locked or key missing");
    expect(await partial.get(held.device)).toBeNull();
  });

  test("the passphrase vault mints on a fresh home and reopens with the same key", async () => {
    const vault = join(dir, "keyring.json");
    const first = await openSession(new PassphraseKeyring(vault, "pw"), dir, 1);
    first.store.close();
    const second = await openSession(new PassphraseKeyring(vault, "pw", db()), dir, 2);
    second.store.close();
    expect(second.key.equals(first.key)).toBe(true);
    expect(second.device.created).toBe(false);
  });

  test("a missing passphrase vault beside a database refuses and writes no vault", async () => {
    const vault = join(dir, "keyring.json");
    (await openSession(new PassphraseKeyring(vault, "pw"), dir, 1)).store.close();
    rmSync(vault);
    const f = join(dir, "pass");
    writeFileSync(f, "pw\n");
    await expect(pickKeyring({ keyring: "passphrase", passphraseFd: openSync(f, "r") }, dir, {})).rejects.toThrow("keyring locked or key missing");
    expect(() => new PassphraseKeyring(vault, "pw", db())).toThrow("keyring locked or key missing");
    expect(existsSync(vault)).toBe(false);
  });

  test("a vault that lost its data key refuses beside a database", async () => {
    const vault = join(dir, "keyring.json");
    (await openSession(new PassphraseKeyring(vault, "pw"), dir, 1)).store.close();
    rmSync(vault);
    const empty = new PassphraseKeyring(vault, "pw");
    const before = readFileSync(vault, "utf8");
    await expect(openSession(empty, dir, 2)).rejects.toThrow("keyring locked or key missing");
    expect(readFileSync(vault, "utf8")).toBe(before);
  });
});

describe("a database that holds nothing counts as absent", () => {
  const db = () => join(dir, "bkt.db");

  test("a 0-byte bkt.db lets a fresh install mint its keys", async () => {
    writeFileSync(db(), "");
    expect(existingDb(dir)).toBeUndefined();
    const s = await openSession(new MemoryKeyring(), dir, 1);
    expect(s.device.created).toBe(true);
    s.store.close();
    expect(existingDb(dir)).toBe(db());
  });

  test("a schema-0 bkt.db with no tables lets a fresh install mint its keys", async () => {
    const blank = new Database(db(), { create: true });
    blank.run("pragma journal_mode = wal");
    blank.run("vacuum");
    blank.close();
    expect(statSync(db()).size).toBeGreaterThan(0);
    expect(existingDb(dir)).toBeUndefined();
    const s = await openSession(new MemoryKeyring(), dir, 1);
    expect(s.device.created).toBe(true);
    s.store.close();
  });

  test("a schema-0 file with a table, and a file that is no database, both count as present", async () => {
    const odd = new Database(db(), { create: true });
    odd.run("create table t (x)");
    odd.close();
    expect(existingDb(dir)).toBe(db());
    await expect(openSession(new MemoryKeyring(), dir, 1)).rejects.toThrow("keyring locked or key missing");
    writeFileSync(db(), "not a sqlite file, sixteen bytes and more");
    expect(existingDb(dir)).toBe(db());
  });

  test("the refusal names both recoveries", async () => {
    (await openSession(new MemoryKeyring(), dir, 1)).store.close();
    const failure = (await openSession(new MemoryKeyring(), dir, 2).catch((e: Error) => e)) as Error;
    expect(failure.message).toContain("Run bkt again with the keyring that made the database");
    expect(failure.message).toContain(`To start fresh, move ${db()} aside and run bkt init`);
  });
});

async function legacyHome(kr: Keyring, home: string) {
  const key = await ensureDataKey(kr);
  const device = await ensureDevice(kr);
  mkdirSync(home, { recursive: true });
  const store = new Store(join(home, "bkt.db"), key);
  store.recordDevice(device.id, device.publicKey, 1);
  store.close();
  return { key, device };
}

describe("keyring entries scoped to the data folder", () => {
  test("a fresh home writes a scope file and stores its keys under that scope alone", async () => {
    const inner = new MemoryKeyring();
    const s = await openSession(inner, dir, 1);
    s.store.close();
    const scope = keyScope(dir)!;
    expect(scope).toMatch(/^[0-9a-f]{32}$/);
    expect(statSync(join(dir, "keyring-scope")).mode & 0o777).toBe(0o600);
    expect(keyAccounts(dir)).toEqual({ data: `db-data-key.${scope}`, device: `device-ed25519.${scope}` });
    expect(await inner.get(`db-data-key.${scope}`)).toHaveLength(64);
    expect(await inner.get(DATA_KEY_ACCOUNT)).toBeNull();
    expect(await inner.get(DEVICE_ACCOUNT)).toBeNull();
  });

  test("a second data folder on the same keyring gets its own entries and leaves the first alone", async () => {
    const kr = new MemoryKeyring();
    const a = join(dir, "a");
    const b = join(dir, "b");
    const first = await openSession(kr, a, 1);
    first.store.close();
    const before = await kr.get(keyAccounts(a).data);
    const second = await openSession(kr, b, 2);
    second.store.close();
    expect(keyScope(b)).not.toBe(keyScope(a));
    expect(second.key.equals(first.key)).toBe(false);
    expect(second.device.id).not.toBe(first.device.id);
    expect(await kr.get(keyAccounts(a).data)).toBe(before);
    const again = await openSession(kr, a, 3);
    again.store.close();
    expect(again.key.equals(first.key)).toBe(true);
  });

  test("a 0.4.0 home with unscoped entries opens, and nothing is written to the keyring or the folder", async () => {
    const inner = new MemoryKeyring();
    const old = await legacyHome(inner, dir);
    const { kr, calls } = counting(inner);
    const s = await openSession(kr, dir, 2);
    expect(s.key.equals(old.key)).toBe(true);
    expect(s.device.id).toBe(old.device.id);
    expect(s.device.created).toBe(false);
    expect(s.store.device()!.id).toBe(old.device.id);
    s.store.close();
    expect(calls.set).toBe(0);
    expect(keyScope(dir)).toBeUndefined();
    expect(keyAccounts(dir)).toEqual({ data: DATA_KEY_ACCOUNT, device: DEVICE_ACCOUNT });
  });

  test("a new home beside a 0.4.0 keyring never touches the unscoped entries", async () => {
    const kr = new MemoryKeyring();
    const old = await legacyHome(kr, join(dir, "old"));
    const pem = await kr.get(DEVICE_ACCOUNT);
    const s = await openSession(kr, join(dir, "new"), 2);
    s.store.close();
    expect(s.key.equals(old.key)).toBe(false);
    expect(await kr.get(DATA_KEY_ACCOUNT)).toBe(old.key.toString("hex"));
    expect(await kr.get(DEVICE_ACCOUNT)).toBe(pem);
    const reopened = await openSession(kr, join(dir, "old"), 3);
    reopened.store.close();
    expect(reopened.key.equals(old.key)).toBe(true);
  });

  test("a scope with its keys and no database reuses the keys", async () => {
    const inner = new MemoryKeyring();
    const first = await openSession(inner, dir, 1);
    first.store.close();
    for (const f of ["bkt.db", "bkt.db-wal", "bkt.db-shm"]) rmSync(join(dir, f), { force: true });
    const scope = keyScope(dir);
    const { kr, calls } = counting(inner);
    const s = await openSession(kr, dir, 2);
    s.store.close();
    expect(calls.set).toBe(0);
    expect(keyScope(dir)).toBe(scope);
    expect(s.key.equals(first.key)).toBe(true);
  });

  test("a scope whose keys are gone for certain, with no database, mints under a new scope", async () => {
    (await openSession(new MemoryKeyring(), dir, 1)).store.close();
    for (const f of ["bkt.db", "bkt.db-wal", "bkt.db-shm"]) rmSync(join(dir, f), { force: true });
    const scope = keyScope(dir);
    const s = await openSession(new MemoryKeyring(), dir, 2);
    s.store.close();
    expect(s.device.created).toBe(true);
    expect(keyScope(dir)).not.toBe(scope);
  });

  test("a scope with no database and a keyring that cannot answer refuses and writes nothing", async () => {
    (await openSession(new MemoryKeyring(), dir, 1)).store.close();
    for (const f of ["bkt.db", "bkt.db-wal", "bkt.db-shm"]) rmSync(join(dir, f), { force: true });
    const scope = keyScope(dir);
    let sets = 0;
    const kr: Keyring = {
      kind: "libsecret",
      get: async () => {
        throw new Error("keyring locked: no answer");
      },
      set: async () => {
        sets++;
      },
    };
    await expect(openSession(kr, dir, 2)).rejects.toThrow("keyring locked");
    expect(sets).toBe(0);
    expect(keyScope(dir)).toBe(scope);
    expect(existsSync(join(dir, "bkt.db"))).toBe(false);
  });

  test("a damaged scope file stops the run", async () => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "keyring-scope"), "nonsense\n");
    await expect(openSession(new MemoryKeyring(), dir, 1)).rejects.toThrow("is damaged");
  });
});

describe("secret-tool lookups that cannot tell absent from locked", () => {
  const account = scopedAccounts("0".repeat(32)).data;

  test("exit 1 with empty stderr and an entry listed by search counts as locked, and store never runs", async () => {
    const marker = join(dir, "stored");
    const kr = fakeSecretTool(
      `if [ "$1" = store ]; then touch "${marker}"; exit 0; fi\nif [ "$1" = search ]; then echo "[/org/freedesktop/secrets/collection/login/7]"; echo "attribute.account = x" >&2; exit 0; fi\nexit 1`,
    );
    await expect(kr.get(account)).rejects.toThrow("keyring locked");
    await expect(kr.set(account, "new")).rejects.toThrow("keyring locked");
    await expect(ensureDataKey(kr, undefined, account)).rejects.toThrow("keyring locked");
    await expect(openSession(kr, join(dir, "fresh"), 1)).rejects.toThrow("keyring locked");
    expect(existsSync(marker)).toBe(false);
    expect(existsSync(join(dir, "fresh", "bkt.db"))).toBe(false);
  });

  test("exit 1 with empty stderr and an empty search is a positive not-found", async () => {
    expect(await fakeSecretTool(`if [ "$1" = search ]; then exit 0; fi\nexit 1`).get(account)).toBeNull();
    expect(await fakeSecretTool("exit 1").get(account)).toBeNull();
  });

  test("a search that fails counts as locked", async () => {
    await expect(fakeSecretTool(`if [ "$1" = search ]; then echo "Cannot autolaunch D-Bus" >&2; exit 1; fi\nexit 1`).get(account)).rejects.toThrow("secret-tool search failed");
    await expect(fakeSecretTool(`if [ "$1" = search ]; then exit 3; fi\nexit 1`).get(account)).rejects.toThrow("exit 3");
  });
});
