import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Academy · learn the nucleus",
  description:
    "Bucket Academy — learn the optimal nucleus of each field with spaced repetition over a foundations-first knowledge graph. Biophysics first; every canon branch next.",
  alternates: { canonical: "/academy" },
  openGraph: {
    title: "Bucket Academy — learn the nucleus",
    description:
      "Spaced repetition over a foundations-first knowledge graph. Start with the biophysics nucleus.",
    url: "https://www.bucket.foundation/academy",
    type: "website",
  },
};

// The Academy is a self-contained app (source of truth: learning/app, synced into
// public/academy-app by scripts/sync-academy.mjs). We frame it so it inherits the site
// header/nav as a real tab while keeping its own local-first engine intact.
export default function AcademyPage() {
  return (
    <iframe
      src="/academy-app/index.html"
      title="Bucket Academy"
      loading="eager"
      style={{
        width: "100%",
        height: "calc(100dvh - 58px)",
        border: 0,
        display: "block",
      }}
    />
  );
}
