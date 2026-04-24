import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import feedData from "../../../feed.json";
import type { Feed, FeedEvent } from "./types";
import FeedFilters from "./FeedFilters";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "What's New",
  description:
    "Latest canon contributions, figures, and dossier updates. Every entry is a git commit to the bucket-foundation canon.",
  alternates: { canonical: "/whats-new" },
  openGraph: {
    type: "website",
    title: "What's New · bucket.foundation",
    url: "https://www.bucket.foundation/whats-new",
  },
};

export default function Page() {
  const feed = feedData as Feed;
  const events: FeedEvent[] = [...feed.events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <PageShell
      eyebrow="§ what's new"
      title="What's New"
      subtitle={
        "Latest canon contributions, figures, and dossier updates. Every entry is a git commit to github.com/bucket-foundation/bucket-foundation."
      }
    >
      <div className="mb-8 small-caps text-[10px] text-[color:var(--parchment-dim)]">
        feed schema v{feed.schema_version} · generated {feed.generated} ·{" "}
        {feed.total_events.toLocaleString()} events
      </div>
      <FeedFilters events={events} />
    </PageShell>
  );
}
