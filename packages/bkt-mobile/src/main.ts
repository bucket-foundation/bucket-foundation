import { createSyncFetch } from "./adapter";
import { readSyncToken } from "./token";

const SYNC_BASE = import.meta.env.VITE_BUCKET_SYNC_BASE ?? "https://bucket.foundation";

window.fetch = createSyncFetch({ base: SYNC_BASE, token: readSyncToken, fetch: window.fetch.bind(window) });
window.__BKT__ = { nonce: "mobile" };
await import("../../bkt-ui/src/main");
