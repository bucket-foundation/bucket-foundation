import { createMobileSync } from "../../../src/lib/academy/mobile-sync";
import { createSyncFetch } from "./adapter";
import { outboxStorage } from "./outbox-storage";
import { SecureStorageVault } from "./token";

const SYNC_BASE = import.meta.env.VITE_BUCKET_SYNC_BASE ?? "https://bucket.foundation";
const SMOKE = import.meta.env.VITE_BKT_SMOKE === "1";
const native = window.fetch.bind(window);

const vault = new SecureStorageVault();
const mobile = createMobileSync({ base: SYNC_BASE, storage: outboxStorage, vault, fetch: native, readLocal: () => null });

window.fetch = createSyncFetch({ base: SYNC_BASE, token: () => mobile.accessToken(), fetch: native, account: mobile, allowLocalHttp: SMOKE });
window.__BKT__ = { nonce: "mobile" };
if (SMOKE) {
  const { runSyncSmoke } = await import("./sync-smoke");
  await runSyncSmoke(mobile, vault, import.meta.env.VITE_SMOKE_REFRESH_TOKEN ?? "", import.meta.env.VITE_SMOKE_USER ?? "");
}
await import("../../bkt-ui/src/main");
