import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify, type KeyObject } from "node:crypto";
import { newDataKey } from "./crypto";
import { KeyringLockedError, type Keyring } from "./keyring";

export const DEVICE_ACCOUNT = "device-ed25519";
export const DATA_KEY_ACCOUNT = "db-data-key";

export interface DeviceIdentity {
  id: string;
  publicKey: string;
  created: boolean;
  sign(message: string | Uint8Array): string;
}

export function publicKeyRaw(pub: KeyObject): Buffer {
  const der = pub.export({ type: "spki", format: "der" });
  return der.subarray(der.length - 32);
}

export function deviceIdFor(publicKeyB64: string): string {
  return "dev_" + createHash("sha256").update(Buffer.from(publicKeyB64, "base64")).digest("hex").slice(0, 20);
}

export function verifyDeviceSignature(publicKeyB64: string, message: string | Uint8Array, signatureB64: string): boolean {
  const spki = Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), Buffer.from(publicKeyB64, "base64")]);
  const key = createPublicKey({ key: spki, format: "der", type: "spki" });
  return verify(null, Buffer.from(message), key, Buffer.from(signatureB64, "base64"));
}

async function lookup(keyring: Keyring, account: string, existingDb?: string): Promise<string | null> {
  if (!existingDb) return keyring.get(account);
  let found: string | null;
  try {
    found = await keyring.get(account);
  } catch (e) {
    throw new KeyringLockedError(keyring.kind, existingDb, `${account} lookup failed: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!found) throw new KeyringLockedError(keyring.kind, existingDb, `no ${account} entry`);
  return found;
}

export interface KeyAccounts {
  data: string;
  device: string;
}

export const LEGACY_ACCOUNTS: KeyAccounts = { data: DATA_KEY_ACCOUNT, device: DEVICE_ACCOUNT };

export function scopedAccounts(scope: string): KeyAccounts {
  return { data: `${DATA_KEY_ACCOUNT}.${scope}`, device: `${DEVICE_ACCOUNT}.${scope}` };
}

export async function ensureDevice(keyring: Keyring, existingDb?: string, account = DEVICE_ACCOUNT): Promise<DeviceIdentity> {
  let pem = await lookup(keyring, account, existingDb);
  let created = false;
  if (!pem) {
    const { privateKey } = generateKeyPairSync("ed25519");
    pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    await keyring.set(account, pem);
    const stored = await keyring.get(account);
    if (stored?.trim() !== pem.trim()) throw new Error("keyring did not persist the device key");
    created = true;
  }
  const priv = createPrivateKey(pem);
  if (priv.asymmetricKeyType !== "ed25519") throw new Error("device key is not ed25519");
  const publicKey = publicKeyRaw(createPublicKey(priv)).toString("base64");
  return {
    id: deviceIdFor(publicKey),
    publicKey,
    created,
    sign: (message) => sign(null, Buffer.from(message), priv).toString("base64"),
  };
}

export async function ensureDataKey(keyring: Keyring, existingDb?: string, account = DATA_KEY_ACCOUNT): Promise<Buffer> {
  const hex = await lookup(keyring, account, existingDb);
  if (hex) {
    const key = Buffer.from(hex.trim(), "hex");
    if (key.length !== 32) throw new Error("stored data key has the wrong length");
    return key;
  }
  const key = newDataKey();
  await keyring.set(account, key.toString("hex"));
  return key;
}
