import PageShell from "@/components/PageShell";
import { Markdown } from "@/lib/markdown";
import { readDoc } from "@/lib/docs";

export const metadata = { title: "Manifesto · bucket.foundation" };

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
