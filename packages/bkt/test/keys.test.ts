import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DATA_KEY_ACCOUNT, DEVICE_ACCOUNT, deviceIdFor, ensureDataKey, ensureDevice, verifyDeviceSignature } from "../src/device";
import { MemoryKeyring, PassphraseKeyring, SecretToolKeyring } from "../src/keyring";
import { openSession } from "../src/setup";

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
    const path = join(dir, "bkt.db");
    const kr = new MemoryKeyring();
    const s = await openSession(kr, path, 1);
    expect(s.store.device()!.id).toBe(s.device.id);
    s.store.close();
    const reopened = await openSession(kr, path, 2);
    expect(reopened.device.created).toBe(false);
    reopened.store.close();
    const intruder = new MemoryKeyring();
    await intruder.set(DATA_KEY_ACCOUNT, (await kr.get(DATA_KEY_ACCOUNT))!);
    await expect(openSession(intruder, path, 3)).rejects.toThrow("belongs to device");
  });
});
