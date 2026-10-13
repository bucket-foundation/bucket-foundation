import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import feedData from "../../../feed.json";
import { publicWhatsNew } from "@/lib/whats-new/cached";
import type { Feed, FeedEvent } from "./types";
import FeedFilters from "./FeedFilters";
import LiveTimeline from "./LiveTimeline";
import type { TimelineEntry } from "@/lib/whats-new/timeline";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "What's New",
  description:
    "Merged pull requests, productions, canon contributions and branch openings on bucket.foundation.",
  alternates: { canonical: "/whats-new" },
  openGraph: {
    type: "website",
    title: "What's New · bucket.foundation",
    url: "https://www.bucket.foundation/whats-new",
  },
};

export type Milestone = {
  id: string;
  date: string;
  category: string;
  branch: string | null;
  title: string;
  summary: string;
  commit?: string | null;
  pr?: number | null;
  url?: string;
};

export type Production = Milestone & {
  category: "production";
  status: "merged" | "open";
  plot_title: string;
  discussion?: string;
  image?: string;
  image_alt: string;
  extra_images?: { src: string; alt: string }[];
  links: { label: string; href: string }[];
};

export default async function Page() {
  const feed = feedData as Feed;
  const events: FeedEvent[] = [...feed.events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  const entries = (await publicWhatsNew()) as unknown as TimelineEntry[];
  const productions = entries.filter((e) => (e.kind ?? e.category) === "production").length;
  const generations = entries.filter((e) => (e.kind ?? e.category) === "generation").length;

  return (
    <PageShell
      eyebrow="§ what's new"
      title="What's New"
      subtitle={
        "Everything that lands on Bucket, newest first: productions with their plots, and short rows for merged pull requests, machine-made claims and canon changes."
      }
    >
      <div className="mb-8 small-caps text-[10px] text-[color:var(--parchment-dim)]">
        feed schema v{feed.schema_version} · {feed.total_events.toLocaleString()} paper events · {entries.length} entries · {productions} productions · {generations} generations
      </div>

      <section id="timeline" className="mb-16">
        <h2 className="font-serif-display text-2xl text-[color:var(--basalt)] mb-2">Timeline</h2>
        <p className="text-sm text-[color:var(--parchment-dim)] mb-6">Times are in UTC. The page checks for new entries every minute.</p>
        <LiveTimeline initial={entries} />
      </section>

      <section>
        <h2 className="font-serif-display text-2xl text-[color:var(--basalt)] mb-6">Canon stream</h2>
        <FeedFilters events={events} />
      </section>
    </PageShell>
  );
}
