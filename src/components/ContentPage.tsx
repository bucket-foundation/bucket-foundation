import PageShell from "@/components/PageShell";
import { Markdown } from "@/lib/markdown";

export default function ContentPage({
  source,
  eyebrow,
  title,
  subtitle,
}: {
  source: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <PageShell eyebrow={eyebrow} title={title} subtitle={subtitle}>
      <Markdown source={source} />
    </PageShell>
  );
}
