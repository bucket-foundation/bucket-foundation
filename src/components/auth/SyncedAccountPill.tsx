"use client";

import AccountPill from "@/components/auth/AccountPill";
import { useSyncStatus } from "@/components/academy/useSyncStatus";
import { useSession } from "@/providers/SessionProvider";

export default function SyncedAccountPill() {
  const { user } = useSession();
  const sync = useSyncStatus(Boolean(user));
  if (sync.state === "idle") return <AccountPill />;
  const badge = sync.badge ? (
    <span
      data-sync-badge={sync.state}
      aria-hidden="true"
      className={"block w-3 h-3 rounded-full border-2 border-[color:var(--bone)] " + (sync.state === "offline" ? "bg-[color:var(--basalt-3)]" : "bg-[color:var(--ochre)]")}
    />
  ) : undefined;
  const row = (
    <div className="flex items-center justify-between gap-3" data-sync-state={sync.state}>
      <span role="status" aria-live="polite" className="inline-flex items-center gap-1.5">
        {sync.state === "offline" && (
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 2l12 12M4.5 9.5a5 5 0 016-1M2 6.5a9 9 0 013.5-2M8 13h0" />
          </svg>
        )}
        {sync.label}
      </span>
      {sync.canSync && (
        <button type="button" data-sync-now onClick={() => void sync.syncNow()} className="min-h-[44px] px-2 text-[13px] font-semibold underline underline-offset-4 text-[color:var(--basalt)]">
          Sync now
        </button>
      )}
    </div>
  );
  return <AccountPill status={{ badge, row }} />;
}
