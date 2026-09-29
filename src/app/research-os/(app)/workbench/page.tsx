import type { Metadata } from "next";
import WorkbenchClient from "./WorkbenchClient";

export const metadata: Metadata = { title: "Workbench", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function WorkbenchPage() {
  return <WorkbenchClient />;
}
