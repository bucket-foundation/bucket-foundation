import type { Metadata } from "next";
import { eventFunnel, pixelConsentStatus } from "@/lib/admin/tracking";
import { adminSource } from "@/lib/admin/source";
import { requireStaff } from "@/lib/admin/session";
import { readoutAll } from "@/lib/beta/readout";
import AdminFrame, { H2, pct, Table, Unavailable } from "../AdminFrame";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tracking", robots: { index: false, follow: false } };

const WINDOW_DAYS = 90;

export default async function TrackingPage() {
  const staff = await requireStaff();
  const source = adminSource();
  const now = new Date();
  if (!source) {
    return (
      <AdminFrame title="Tracking" staff={staff.email}>
        <Unavailable />
      </AdminFrame>
    );
  }
  const [testers, events, assignments] = await Promise.all([
    source.beta.testers(),
    source.beta.events(new Date(now.getTime() - WINDOW_DAYS * 86_400_000).toISOString()),
    source.beta.assignments(),
  ]);
  const readouts = readoutAll(testers, events.rows, assignments, now);
  const consent = pixelConsentStatus();
  return (
    <AdminFrame title="Tracking" staff={staff.email}>
      <p className="text-[12px] text-[color:var(--basalt-3)]">
        Beta events, last {WINDOW_DAYS} days. {events.truncated ? "Event cap reached: counts are partial." : ""} Per-user timelines live on each user page.
      </p>
      {(["bucket", "polingual"] as const).map((app) => (
        <div key={app}>
          <h2 className={H2}>{app} funnel</h2>
          <Table head={["step", "learners", "of first step"]} rows={eventFunnel(events.rows, app).map((s) => [s.name, s.users, pct(s.ofFirst)])} />
        </div>
      ))}
      <div>
        <h2 className={H2}>Experiments</h2>
        <Table
          head={["experiment", "arm", "learners", "D1 retention", "D7 retention", "D7 recall"]}
          rows={readouts.flatMap((r) =>
            r.randomized.map((arm) => {
              const d1 = arm.windows.find((w) => w.day === 1);
              const d7 = arm.windows.find((w) => w.day === 7);
              return [r.key, arm.arm + (arm.isControl ? " control" : ""), arm.users, pct(d1?.retention.rate ?? null), pct(d7?.retention.rate ?? null), pct(d7?.recall.rate ?? null)];
            }),
          )}
        />
      </div>
      <div>
        <h2 className={H2}>Pixels and consent</h2>
        <p className="text-[13px] text-[color:var(--basalt-2)]">{consent.state === "pending" ? consent.note : `${consent.granted} granted, ${consent.denied} denied.`}</p>
      </div>
    </AdminFrame>
  );
}
