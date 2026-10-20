"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { trackFunnel, type FunnelEvent } from "@/lib/analytics/funnel";

export default function TrackedLink({ href, event, from, className, children }: { href: string; event: FunnelEvent; from: string; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={className} data-funnel-event={event} onClick={() => trackFunnel(event, { from })}>
      {children}
    </Link>
  );
}
