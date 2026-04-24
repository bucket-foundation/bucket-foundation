import PageShell from "@/components/PageShell";
import { Markdown } from "@/lib/markdown";
import { readDoc } from "@/lib/docs";

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Governance",
  description:
    "Nonprofit in intent. MIT code, CC0 protocol. Conflicts of interest disclosed, not hidden.",
  alternates: { canonical: "/governance" },
  openGraph: { type: "article", title: "Governance · bucket.foundation", url: "https://www.bucket.foundation/governance" },
};

export default function Page() {
  const md = readDoc("GOVERNANCE.md");
  return (
    <PageShell
      eyebrow="§ governance"
      title="How bucket is held."
      subtitle="Nonprofit in intent. MIT code, CC0 protocol. Conflicts of interest disclosed, not hidden."
    >
      <Markdown source={md} />
    </PageShell>
  );
}
