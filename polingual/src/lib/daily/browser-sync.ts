import { appAuth } from "@/lib/app/auth";
import type { SyncDeps } from "./store";

export function syncDeps(): SyncDeps {
  return { fetch: window.fetch.bind(window), token: () => appAuth().mobile.accessToken().catch(() => null), user: () => appAuth().userId().catch(() => null) };
}
