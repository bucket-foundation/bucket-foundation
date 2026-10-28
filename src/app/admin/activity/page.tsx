import type { Metadata } from "next";
import { loadGrowthReport } from "@/app/api/admin/growth/handler";
import { adminSource } from "@/lib/admin/source";
import { requireStaff } from "@/lib/admin/session";
import AdminFrame, { Unavailable } from "../AdminFrame";
import GrowthReportView from "../growth/GrowthReportView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Activity", robots: { index: false, follow: false } };

export default async function ActivityPage() {
  const staff = await requireStaff();
  const source = adminSource();
  const report = source ? await loadGrowthReport(source.beta, source.snapshots, source.waitlist, new Date()) : null;
  return (
    <AdminFrame title="Activity and growth" staff={staff.email}>
      {report ? <GrowthReportView data={report} /> : <Unavailable />}
    </AdminFrame>
  );
}
