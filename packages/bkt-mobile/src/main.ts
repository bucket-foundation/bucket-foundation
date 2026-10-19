import { createMobileSync } from "../../../src/lib/academy/mobile-sync";
import { createSyncFetch } from "./adapter";
import { outboxStorage } from "./outbox-storage";
import { SecureStorageVault } from "./token";

const SYNC_BASE = import.meta.env.VITE_BUCKET_SYNC_BASE ?? "https://bucket.foundation";
const native = window.fetch.bind(window);

const mobile = createMobileSync({ base: SYNC_BASE, storage: outboxStorage, vault: new SecureStorageVault(), fetch: native, readLocal: () => null });

window.fetch = createSyncFetch({ base: SYNC_BASE, token: () => mobile.accessToken(), fetch: native, account: mobile });
window.__BKT__ = { nonce: "mobile" };
await import("../../bkt-ui/src/main");
