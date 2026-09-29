import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DATA_KEY_ACCOUNT, DEVICE_ACCOUNT, deviceIdFor, ensureDataKey, ensureDevice, verifyDeviceSignature } from "../src/device";
import { MemoryKeyring, PassphraseKeyring, SecretToolKeyring } from "../src/keyring";
import { openSession, parseArgs, pickKeyring } from "../src/setup";

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
    await intruder.set(DATA_KEY_ACCOUNT, (await kr.get(DATA_KEY_ACCOUNT))!);
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
    const { cmd, opts } = parseArgs(["init", "--keyring=passphrase", "--passphrase-fd", String(fd)]);
    expect(cmd).toBe("init");
    const kr = await pickKeyring(opts, dir, {});
    expect(kr.kind).toBe("passphrase");
    expect(() => new PassphraseKeyring(join(dir, "keyring.json"), "secret")).not.toThrow();
  });

  test("rejects unknown flags and bad fds", () => {
    expect(() => parseArgs(["--nope"])).toThrow("unknown flag");
    expect(() => parseArgs(["--passphrase-fd", "x"])).toThrow("file descriptor");
  });
});
