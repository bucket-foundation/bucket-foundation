export interface StoredSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user_id: string;
  device_id: string;
  supabase_url: string;
  anon_key: string;
}

export interface TokenVault {
  readonly kind: "libsecret" | "file" | "memory";
  get(): Promise<StoredSession | null>;
  set(s: StoredSession): Promise<void>;
  clear(): Promise<void>;
}

export function parseSession(raw: string | null): StoredSession | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Partial<StoredSession>;
    if (typeof s.access_token !== "string" || typeof s.refresh_token !== "string" || typeof s.expires_at !== "number" || typeof s.user_id !== "string") return null;
    if (typeof s.device_id !== "string" || typeof s.supabase_url !== "string" || typeof s.anon_key !== "string") return null;
    return s as StoredSession;
  } catch {
    return null;
  }
}

export class MemoryVault implements TokenVault {
  readonly kind = "memory" as const;
  private value: string | null = null;
  async get() {
    return parseSession(this.value);
  }
  async set(s: StoredSession) {
    this.value = JSON.stringify(s);
  }
  async clear() {
    this.value = null;
  }
}
