import PageShell from "@/components/PageShell";
import { Markdown } from "@/lib/markdown";
import { readDoc } from "@/lib/docs";

export const metadata = { title: "Governance · bucket.foundation" };

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
