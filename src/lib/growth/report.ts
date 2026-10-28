import type { BetaReport, CohortSummary, RetentionDay } from "@/lib/beta/metrics";
import type { BetaTester, StoredBetaEvent } from "@/lib/beta/store";
import { buildActivity, type ActivityReport } from "./activity";
import type { WaitlistEntry } from "@/lib/waitlist/core";
import { GROWTH_APPS, type GrowthApp, type GrowthSnapshot, type SnapshotBuild } from "./snapshot";

export const ACTIVE_WINDOW_DAYS = 7;
const DAY_MS = 86_400_000;

export interface FunnelStep {
  key: "site_visits" | "beta_signups" | "testflight_invites" | "installs" | "active_learners";
  label: string;
  count: number | null;
  source: string;
}

export interface CadenceBuild extends SnapshotBuild {
  daysSincePrevious: number | null;
}

export interface GrowthReport {
  generatedAt: string;
  snapshotAt: string | null;
  funnel: FunnelStep[];
  retention: Record<RetentionDay, number | null>;
  signupsByWeek: { week: string; count: number }[];
  cadence: Record<GrowthApp, CadenceBuild[]>;
  medianDaysBetweenBuilds: Record<GrowthApp, number | null>;
  activity: ActivityReport;
}

export function weekStart(iso: string): string {
  const d = new Date(iso);
  const day = (d.getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
  return monday.toISOString().slice(0, 10);
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function cadenceFor(builds: SnapshotBuild[], app: GrowthApp): CadenceBuild[] {
  const mine = builds.filter((b) => b.app === app).sort((a, b) => Date.parse(a.uploadedAt) - Date.parse(b.uploadedAt));
  return mine
    .map((b, i) => ({ ...b, daysSincePrevious: i === 0 ? null : Math.round(((Date.parse(b.uploadedAt) - Date.parse(mine[i - 1].uploadedAt)) / DAY_MS) * 10) / 10 }))
    .reverse();
}

export function siteVisits(snap: GrowthSnapshot | null): FunnelStep {
  const v = snap?.visits;
  const counts = v ? GROWTH_APPS.map((a) => v.byApp[a]).filter((n): n is number => typeof n === "number") : [];
  if (!v || counts.length === 0) return { key: "site_visits", label: "Site visits", count: null, source: "Vercel Web Analytics, not reachable from the snapshot yet" };
  return { key: "site_visits", label: `Site visits, last ${v.days} days`, count: counts.reduce((a, b) => a + b, 0), source: `Vercel Web Analytics, ${GROWTH_APPS.filter((a) => typeof v.byApp[a] === "number").join(" and ")}` };
}

export function buildGrowthReport(input: {
  waitlist: WaitlistEntry[] | null;
  beta: BetaReport;
  overall: CohortSummary;
  snapshot: GrowthSnapshot | null;
  testers?: BetaTester[];
  events?: StoredBetaEvent[];
  now?: Date;
}): GrowthReport {
  const now = input.now ?? new Date();
  const snap = input.snapshot;
  const since = now.getTime() - ACTIVE_WINDOW_DAYS * DAY_MS;
  const active = input.beta.users.filter((u) => u.lastSeen && Date.parse(u.lastSeen) >= since).length;
  const invited = snap ? snap.testers.filter((t) => t.state !== "NOT_INVITED").length : null;
  const installed = snap ? snap.testers.filter((t) => t.state === "INSTALLED").length : null;
  const weeks = new Map<string, number>();
  for (const e of input.waitlist ?? []) weeks.set(weekStart(e.created_at), (weeks.get(weekStart(e.created_at)) ?? 0) + 1);
  const cadence = {} as Record<GrowthApp, CadenceBuild[]>;
  const medianDays = {} as Record<GrowthApp, number | null>;
  for (const app of GROWTH_APPS) {
    cadence[app] = snap ? cadenceFor(snap.builds, app) : [];
    medianDays[app] = median(cadence[app].map((b) => b.daysSincePrevious).filter((d): d is number => d !== null));
  }
  return {
    generatedAt: now.toISOString(),
    snapshotAt: snap?.takenAt ?? null,
    funnel: [
      siteVisits(snap),
      { key: "beta_signups", label: "Beta signups", count: input.waitlist ? input.waitlist.length : null, source: "launch list" },
      { key: "testflight_invites", label: "TestFlight invites", count: invited, source: "App Store Connect snapshot" },
      { key: "installs", label: "Installs", count: installed, source: "App Store Connect snapshot" },
      { key: "active_learners", label: `Active learners, last ${ACTIVE_WINDOW_DAYS} days`, count: active, source: "beta events" },
    ],
    retention: input.overall.retention,
    signupsByWeek: Array.from(weeks.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, count]) => ({ week, count })),
    cadence,
    medianDaysBetweenBuilds: medianDays,
    activity: buildActivity(input.testers ?? [], input.events ?? [], now),
  };
}
