/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_BUCKET_SYNC_BASE?: string;
  readonly VITE_BKT_SMOKE?: string;
  readonly VITE_SMOKE_REFRESH_TOKEN?: string;
  readonly VITE_SMOKE_USER?: string;
}
interface Window {
  __BKT__?: { nonce?: string };
}
