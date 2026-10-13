/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_BUCKET_SYNC_BASE?: string;
}
interface Window {
  __BKT__?: { nonce?: string };
}
