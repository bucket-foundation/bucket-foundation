import type { Metadata } from "next";
import Link from "next/link";
import { configured, graphService } from "@/lib/research-os/db";
import { loadPrimesReport } from "@/lib/research-os/primes-report";
import { primesView, type PrimesViewState } from "@/components/research-os/views/PrimesView";

export const metadata: Metadata = { title: "Primes", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const PrimesView = primesView((p) => <Link {...p} />);

export default async function PrimesPage() {
  let state: PrimesViewState = { kind: "unconfigured" };
  if (configured()) {
    try {
      state = { kind: "ready", report: await loadPrimesReport(graphService()) };
    } catch (err) {
      console.error("[primes] report failed:", err instanceof Error ? err.message : err);
      state = { kind: "failed" };
    }
  }
  return <PrimesView state={state} />;
}
