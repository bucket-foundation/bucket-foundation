import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import PickQuiz from "./PickQuiz";

export const metadata: Metadata = {
  title: "Brand pick",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function BrandPickPage() {
  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-8 md:py-10">
      <PageHeader
        eyebrow="brand pick"
        title="Which Bucket do you like best"
        lede="Seven directions, two at a time. Pick the one you like, or skip. A note on why helps and is never required."
      />
      <PickQuiz />
    </main>
  );
}
