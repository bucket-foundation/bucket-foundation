import type { Metadata } from "next";
import AdvisorMatch from "./AdvisorMatch";

export const metadata: Metadata = { title: "Advisor match", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function AdvisorsPage() {
  return <AdvisorMatch />;
}
