import type { Metadata } from "next";
import Link from "next/link";
import { readPrimesViewState } from "@/lib/research-os/primes-view-state";
import { primesView } from "@/components/research-os/views/PrimesView";

export const metadata: Metadata = { title: "Primes", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const PrimesView = primesView((p) => <Link {...p} />);

export default async function PrimesPage() {
  return <PrimesView state={await readPrimesViewState()} />;
}
