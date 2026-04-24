import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import EventCard from "../../whats-new/EventCard";
import { dayKey, formatDayHeader } from "../../whats-new/types";
import { getAllEvents, getAllHandles, computeStats } from "../lib";

export const revalidate = 300;

export function generateStaticParams() {
  return getAllHandles().map((handle) => ({ handle }));
}

export function generateMetadata({
  params,
}: {
  params: { handle: string };
}): Metadata {
  const handle = params.handle;
  return {
    title: `@${handle}`,
    description: `Canon contributions by @${handle} to bucket.foundation.`,
    alternates: { canonical: `/contributors/${handle}` },
    openGraph: {
      type: "profile",
      title: `@${handle} · bucket.foundation`,
      url: `https://www.bucket.foundation/contributors/${handle}`,
    },
  };
}

export default function Page({ params }: { params: { handle: string } }) {
  const stats = computeStats(params.handle, getAllEvents());
  if (!stats) notFound();

  const first = stats.firstContribution
    ? new Date(stats.firstContribution).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      })
    : "—";

  // group events by day (events are already reverse-chron)
  const grouped = new Map<string, typeof stats.events>();
  for (const e of stats.events) {
    const k = dayKey(e.timestamp);
    const arr = grouped.get(k) ?? [];
    arr.push(e);
    grouped.set(k, arr);
  }

  const subtitle = `${stats.eventCount} canon event${stats.eventCount === 1 ? "" : "s"} · first contribution ${first} · branches touched: ${stats.branches.length > 0 ? stats.branches.join(", ") : "—"}`;

  return (
    <PageShell
      eyebrow="§ contributor"
      title={`@${stats.handle}`}
      subtitle={subtitle}
    >
      {/* TODO(founder): look up Dynamic wallet address via Supabase by github handle */}

      <div className="mb-10 grid grid-cols-2 sm:grid-cols-4 gap-px bg-[color:var(--hairline)]">
        <Stat label="canon events" value={stats.canonEvents} />
        <Stat label="landscape" value={stats.landscapeEvents} />
        <Stat label="figures" value={stats.figures} />
        <Stat label="branches" value={stats.branches.length} />
      </div>

      <div className="mb-10 flex flex-wrap gap-4 small-caps text-[11px]">
        <a
          href={`https://github.com/${stats.handle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[color:var(--gold)] hover:text-[color:var(--parchment)]"
        >
          github.com/{stats.handle} ↗
        </a>
      </div>

      <h2 className="font-serif-display text-2xl text-[color:var(--parchment)] mb-6">
        Contributions
      </h2>

      <div>
        {Array.from(grouped.entries()).map(([day, items]) => (
          <section key={day} className="mb-10">
            <h3 className="small-caps text-[11px] text-[color:var(--gold)] mb-3 pb-2 border-b hairline">
              {formatDayHeader(day)}
            </h3>
            <div className="bg-[color:var(--hairline)]">
              {items.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-[color:var(--bone-2)] p-4">
      <div className="font-serif-display text-2xl text-[color:var(--parchment)]">
        {value}
      </div>
      <div className="small-caps text-[10px] text-[color:var(--parchment-dim)] mt-1">
        {label}
      </div>
    </div>
  );
}
