import { POLINGUAL_BUNDLE_ID } from "@/app/api/app-store/notifications/handler";
import { supabaseAppStoreEventStore } from "@/lib/app-store/store";
import { readEntitlementState, readTrialFlag } from "./entitlement-store";
import type { TrialSources } from "./trial-used";

export function trialSources(userId: string): TrialSources {
  return {
    flag: () => readTrialFlag(userId),
    webRow: async () => (await readEntitlementState(userId, "polingual")) !== null,
    appStoreEvents: async () => {
      const store = supabaseAppStoreEventStore();
      return store?.eventsFor ? store.eventsFor(userId, POLINGUAL_BUNDLE_ID) : [];
    },
  };
}
