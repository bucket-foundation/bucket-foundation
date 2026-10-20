export type SyncState = "idle" | "synced" | "waiting" | "offline" | "syncing";

export interface SyncSnapshot {
  pending: number;
  online: boolean;
  syncing: boolean;
  signedIn: boolean;
}

export interface SyncView {
  state: SyncState;
  label: string;
  badge: boolean;
  canSync: boolean;
}

export function changesLabel(n: number): string {
  return n === 1 ? "1 change waiting to sync" : `${n} changes waiting to sync`;
}

export function syncView(s: SyncSnapshot): SyncView {
  const pending = Math.max(0, Math.floor(s.pending));
  if (!s.signedIn && pending === 0) return { state: "idle", label: "", badge: false, canSync: false };
  if (s.syncing) return { state: "syncing", label: "Syncing", badge: pending > 0, canSync: false };
  if (!s.online) return { state: "offline", label: pending ? `Offline, ${changesLabel(pending)}` : "Offline", badge: true, canSync: false };
  if (pending > 0) return { state: "waiting", label: changesLabel(pending), badge: true, canSync: s.signedIn };
  return { state: "synced", label: "Synced", badge: false, canSync: s.signedIn };
}
