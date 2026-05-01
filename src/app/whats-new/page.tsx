import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import feedData from "../../../feed.json";
import whatsNewData from "../../../data/whats-new.json";
import type { Feed, FeedEvent } from "./types";
import FeedFilters from "./FeedFilters";
import MilestoneTimeline from "./MilestoneTimeline";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "What's New",
  description:
    "Latest canon contributions, branch openings, and site changes. Every entry is a git commit to the bucket-foundation canon.",
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
  commit: string;
};

export default function Page() {
  const feed = feedData as Feed;
  const events: FeedEvent[] = [...feed.events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  const milestones: Milestone[] = [...((whatsNewData as any).entries as Milestone[])].sort(
    (a, b) => b.date.localeCompare(a.date),
  );

  return (
    <PageShell
      eyebrow="§ what's new"
      title="What's New"
      subtitle={
        "Branch openings, canon promotions, site changes. Every entry is a git commit to github.com/bucket-foundation/bucket-foundation."
      }
    >
      <div className="mb-8 small-caps text-[10px] text-[color:var(--parchment-dim)]">
        feed schema v{feed.schema_version} · {feed.total_events.toLocaleString()} paper events ·{" "}
        {milestones.length} milestones
      </div>

      <section className="mb-16">
        <h2 className="font-serif-display text-2xl text-[color:var(--basalt)] mb-6">Milestones</h2>
        <MilestoneTimeline milestones={milestones} />
      </section>

      <section>
        <h2 className="font-serif-display text-2xl text-[color:var(--basalt)] mb-6">Canon stream</h2>
        <FeedFilters events={events} />
      </section>
    </PageShell>
  );
}
