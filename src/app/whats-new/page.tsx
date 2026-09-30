import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import feedData from "../../../feed.json";
import whatsNewData from "../../../data/whats-new.json";
import type { Feed, FeedEvent } from "./types";
import FeedFilters from "./FeedFilters";
import MilestoneTimeline from "./MilestoneTimeline";
import ProductionCard from "./ProductionCard";

export const revalidate = 300;

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
  discussion: string;
  image: string;
  image_alt: string;
  extra_images?: { src: string; alt: string }[];
  links: { label: string; href: string }[];
};

export default function Page() {
  const feed = feedData as Feed;
  const events: FeedEvent[] = [...feed.events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  const entries: Milestone[] = [...((whatsNewData as any).entries as Milestone[])].sort(
    (a, b) => b.date.localeCompare(a.date),
  );
  const productions = entries.filter((m): m is Production => m.category === "production");
  const milestones = entries.filter((m) => m.category !== "production");

  return (
    <PageShell
      eyebrow="§ what's new"
      title="What's New"
      subtitle={
        "Merged pull requests, productions, branch openings and canon promotions. Every entry links to its pull request or commit on github.com/bucket-foundation/bucket-foundation."
      }
    >
      <div className="mb-8 small-caps text-[10px] text-[color:var(--parchment-dim)]">
        feed schema v{feed.schema_version} · {feed.total_events.toLocaleString()} paper events ·{" "}
        {milestones.length} milestones · {productions.length} productions
      </div>

      {productions.length > 0 && (
        <section className="mb-16">
          <h2 className="font-serif-display text-2xl text-[color:var(--basalt)] mb-6">Productions</h2>
          <div className="grid gap-8">
            {productions.map((p) => (
              <ProductionCard key={p.id} production={p} />
            ))}
          </div>
        </section>
      )}

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
