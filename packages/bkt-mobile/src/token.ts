import { SecureStorage } from "@aparajita/capacitor-secure-storage";

const KEY = "bkt.sync.token";

export async function readSyncToken(): Promise<string | null> {
  const v = await SecureStorage.get(KEY);
  return typeof v === "string" && v ? v : null;
}

export async function writeSyncToken(token: string): Promise<void> {
  await SecureStorage.set(KEY, token);
}

export async function clearSyncToken(): Promise<void> {
  await SecureStorage.remove(KEY);
}
