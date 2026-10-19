import { SecureStorage } from "@aparajita/capacitor-secure-storage";
import { parseSession, type StoredSession, type TokenVault } from "../../../src/lib/academy/token-store";

export const SESSION_KEY = "bkt.sync.session";
const LEGACY_TOKEN_KEY = "bkt.sync.token";

export interface SecureStore {
  get(key: string): Promise<unknown>;
  set(key: string, value: string): Promise<unknown>;
  remove(key: string): Promise<unknown>;
}

export class SecureStorageVault implements TokenVault {
  readonly kind = "secure-storage" as const;
  constructor(private store: SecureStore = SecureStorage as unknown as SecureStore) {}

  async get(): Promise<StoredSession | null> {
    const v = await this.store.get(SESSION_KEY);
    return parseSession(typeof v === "string" ? v : v ? JSON.stringify(v) : null);
  }

  async set(s: StoredSession): Promise<void> {
    await this.store.set(SESSION_KEY, JSON.stringify(s));
  }

  async clear(): Promise<void> {
    await this.store.remove(SESSION_KEY);
    await this.store.remove(LEGACY_TOKEN_KEY);
  }
}
