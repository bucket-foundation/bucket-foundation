import PageShell from "@/components/PageShell";
import { Markdown } from "@/lib/markdown";
import { readDoc } from "@/lib/docs";

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Manifesto",
  description:
    "bucket is the new renaissance. build the past. build history. AI + foundations + a small number of brilliant humans = the next layer of reality.",
  alternates: { canonical: "/manifesto" },
  openGraph: { type: "article", title: "Manifesto · bucket.foundation", url: "https://www.bucket.foundation/manifesto" },
};

export default function Page() {
  const md = readDoc("MANIFESTO.md");
  return (
    <PageShell
      eyebrow="§ manifesto"
      title="bucket is the new renaissance."
      subtitle="build the past. build history."
    >
      <Markdown source={md} />
    </PageShell>
  );
}
