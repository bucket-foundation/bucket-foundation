import { createMobileSync } from "../../../src/lib/academy/mobile-sync";
import type { TokenVault } from "../../../src/lib/academy/token-store";
import { createSyncFetch } from "./adapter";
import { outboxStorage } from "./outbox-storage";
import { SecureStorageVault } from "./token";

const SYNC_BASE = import.meta.env.VITE_BUCKET_SYNC_BASE ?? "https://bucket.foundation";
const SMOKE = import.meta.env.VITE_BKT_SMOKE === "1";
const native = window.fetch.bind(window);

const make = (vault: TokenVault) => createMobileSync({ base: SYNC_BASE, storage: outboxStorage, vault, fetch: native, readLocal: () => null });
const vault = new SecureStorageVault();
const mobile = make(vault);

window.fetch = createSyncFetch({ base: SYNC_BASE, token: () => mobile.accessToken(), fetch: native, account: mobile, allowLocalHttp: SMOKE });
window.__BKT__ = { nonce: "mobile" };
if (SMOKE) {
  const { runSyncSmoke } = await import("./sync-smoke");
  void runSyncSmoke({ make, secure: vault, refreshToken: import.meta.env.VITE_SMOKE_REFRESH_TOKEN ?? "", userId: import.meta.env.VITE_SMOKE_USER ?? "", probe: () => native(`${SYNC_BASE}/sign-in?smoke=1`).then((r) => r.status) });
}
await import("../../bkt-ui/src/main");
