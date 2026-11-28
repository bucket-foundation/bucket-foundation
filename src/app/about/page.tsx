import type { Metadata } from "next";
import ContentPage from "@/components/ContentPage";
import { readPage } from "@/lib/pages";

export const metadata: Metadata = {
  title: "About",
  description:
    "A nonprofit canon of foundations — axioms, real math, laws, principles, primary derivations. Held in founder's personal capacity pending formal nonprofit filing.",
  alternates: { canonical: "/about" },
  openGraph: { type: "article", title: "About · bucket.foundation", url: "https://www.bucket.foundation/about" },
};

export default function Page() {
  return (
    <ContentPage
      source={readPage("about")}
      eyebrow="§ about"
      title="A nonprofit canon of foundations."
      subtitle="Held in founder's personal capacity pending formal nonprofit filing."
    />
  );
}
