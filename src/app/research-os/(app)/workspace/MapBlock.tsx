"use client";

import Link from "next/link";

export default function MapBlock({
  node,
}: {
  node: { title: string; branch?: string; provenance?: Record<string, unknown> | null };
}) {
  const p = node.provenance ?? {};
  const concept = p.type === "canon_entry" && typeof p.concept === "string" ? p.concept : null;
  const branchSlug = (node.branch ?? "").replace(/^\d+-/, "");
  const q = new URLSearchParams({ q: node.title }).toString();
  const link = "underline decoration-[color:var(--gold)] underline-offset-4 hover:text-[color:var(--basalt)]";

  return (
    <div className="mt-3 border-t border-[color:var(--hairline)] pt-3 text-[12px] text-[color:var(--basalt-2)]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--aegean-deep)]">map</span>
        {concept && (
          <Link href={`/excerpts/${encodeURIComponent(concept)}`} className={link}>
            canon claims for {concept} →
          </Link>
        )}
        <Link href={`/research-os/map?${q}`} className={link}>
          find on the globe →
        </Link>
        {branchSlug && (
          <Link href={`/canon/${encodeURIComponent(branchSlug)}`} className={link}>
            {branchSlug} branch →
          </Link>
        )}
        <Link href="/canon/bridges" className={link}>
          bridges →
        </Link>
      </div>
    </div>
  );
}
