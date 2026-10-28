import type { Metadata } from "next";
import { summarizeRevenue } from "@/lib/admin/revenue";
import { adminSource } from "@/lib/admin/source";
import { requireStaff } from "@/lib/admin/session";
import AdminFrame, { H2, pct, Stat, Table, Unavailable } from "../AdminFrame";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Revenue", robots: { index: false, follow: false } };

const WINDOW_DAYS = 400;

function money(mrr: Record<string, number>): string {
  const parts = Object.entries(mrr).map(([cur, v]) => `${cur} ${v.toFixed(2)}`);
  return parts.length ? parts.join(", ") : "0";
}

export default async function RevenuePage() {
  const staff = await requireStaff();
  const source = adminSource();
  const now = new Date();
  const rows = source ? await source.revenueEvents(new Date(now.getTime() - WINDOW_DAYS * 86_400_000).toISOString()) : [];
  const summary = summarizeRevenue(rows, WINDOW_DAYS, now);
  return (
    <AdminFrame title="Revenue" staff={staff.email}>
      {!source && <Unavailable />}
      <p className="text-[12px] text-[color:var(--basalt-3)]">
        App Store Server Notifications, last {WINDOW_DAYS} days, production only. {summary.sandboxSkipped} sandbox events left out.
      </p>
      {summary.apps.length === 0 && <p className="text-[13px] text-[color:var(--basalt-3)]">No App Store events yet.</p>}
      {summary.apps.map((a) => (
        <section key={a.app} className="flex flex-col gap-4">
          <h2 className={H2}>{a.app}</h2>
          <div className="flex flex-wrap gap-6">
            <Stat label="MRR" value={money(a.mrr)} />
            <Stat label="active subscriptions" value={a.activeSubscriptions} />
            <Stat label="trials" value={a.trials} />
            <Stat label="trial to paid" value={`${pct(a.trialToPaid)} (${a.trialsConverted})`} />
            <Stat label="refunds" value={a.refunds} />
          </div>
          <Table head={["plan", "active", "share"]} rows={a.planMix.map((m) => [m.productId, m.active, pct(a.activeSubscriptions ? m.active / a.activeSubscriptions : null)])} />
        </section>
      ))}
    </AdminFrame>
  );
}
