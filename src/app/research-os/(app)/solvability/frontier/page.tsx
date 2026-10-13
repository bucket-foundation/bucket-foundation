import type { Metadata } from "next";
import report from "@/lib/research-os/solvability-frontier-report-data.json";
import neighbors from "@/lib/research-os/solvability-neighbors-data.json";
import makeup from "@/lib/research-os/solvability-makeup-data.json";
import { buildFrontier, frontierRows, type NeighborData } from "@/lib/research-os/solvability-frontier";
import { frontierSvg } from "@/lib/research-os/solvability-frontier-render";
import type { ReportData } from "@/lib/research-os/solvability-frontier-report-copy";
import type { MakeupData } from "@/lib/research-os/solvability-frontier-provenance";
import SolvabilityFrontierReport from "@/components/research-os/views/SolvabilityFrontierReport";

export const metadata: Metadata = { title: "Solvability frontier report", robots: { index: false, follow: false } };

export default function SolvabilityFrontierReportPage() {
  const data = neighbors as unknown as NeighborData;
  const svg = frontierSvg(buildFrontier(frontierRows(data), data));
  return <SolvabilityFrontierReport data={report as unknown as ReportData} makeup={makeup as unknown as MakeupData} svg={svg} />;
}
