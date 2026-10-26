import { supabaseBetaStore } from "@/lib/beta/store";
import { supabaseSnapshotStore } from "@/lib/growth/store";
import { getWaitlistStore, listSignups } from "@/lib/waitlist/store";
import type { GrowthDeps } from "./handler";

export const growthDeps: GrowthDeps = {
  adminKey: () => process.env.WAITLIST_ADMIN_KEY,
  beta: supabaseBetaStore,
  snapshots: supabaseSnapshotStore,
  waitlist: async () => {
    const store = getWaitlistStore();
    return store ? listSignups(store) : null;
  },
};
