import { createMobileSync } from "../../../src/lib/academy/mobile-sync";
import { MemoryVault } from "../../../src/lib/academy/token-store";
import { runSyncSmoke } from "../src/sync-smoke";

const base = process.env.SITE_URL ?? "http://127.0.0.1:3000";
const m = new Map<string, string>();
const storage = {
  getItem: (k: string) => m.get(k) ?? null,
  setItem: (k: string, v: string) => void m.set(k, v),
  removeItem: (k: string) => void m.delete(k),
  clear: () => m.clear(),
  key: (i: number) => Array.from(m.keys())[i] ?? null,
  get length() {
    return m.size;
  },
} as Storage;
const vault = new MemoryVault();
const mobile = createMobileSync({ base, storage: () => storage, vault, fetch: (i, n) => fetch(i, n), readLocal: () => null });
await runSyncSmoke(mobile, vault, process.env.SMOKE_REFRESH_TOKEN ?? "", process.env.SMOKE_USER ?? "");
