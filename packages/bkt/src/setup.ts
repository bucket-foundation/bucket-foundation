import { homedir } from "node:os";
import { join } from "node:path";
import { ensureDataKey, ensureDevice, type DeviceIdentity } from "./device";
import { PassphraseKeyring, SecretToolKeyring, type Keyring } from "./keyring";
import { Store } from "./store";

export function dataDir(env = process.env): string {
  return env.BKT_HOME ?? join(env.XDG_DATA_HOME ?? join(homedir(), ".local/share"), "bkt");
}

export function pickKeyring(env = process.env): Keyring {
  const forced = env.BKT_KEYRING;
  if (forced !== "passphrase" && SecretToolKeyring.available()) return new SecretToolKeyring();
  const pass = env.BKT_PASSPHRASE;
  if (!pass) throw new Error("no keyring: libsecret is unavailable and BKT_PASSPHRASE is unset");
  return new PassphraseKeyring(join(dataDir(env), "keyring.json"), pass);
}

export interface Session {
  store: Store;
  device: DeviceIdentity;
  keyring: Keyring;
}

export async function openSession(keyring: Keyring, dbPath: string, now = Date.now()): Promise<Session> {
  const key = await ensureDataKey(keyring);
  const device = await ensureDevice(keyring);
  const store = new Store(dbPath, key);
  store.recordDevice(device.id, device.publicKey, now);
  const recorded = store.device();
  if (recorded && recorded.id !== device.id) {
    store.close();
    throw new Error(`database belongs to device ${recorded.id}; this keyring holds ${device.id}`);
  }
  return { store, device, keyring };
}
