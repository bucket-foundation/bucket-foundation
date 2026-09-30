import ExploreClient from "./ExploreClient";
import ExploreShell from "./ExploreShell";

export const metadata = {
  title: "Explore · bucket.foundation",
  description: "Search canon excerpts and advisors together.",
};

export default function Page({ searchParams }: { searchParams: { view?: string; space?: string } }) {
  if (searchParams.view === "circle" || searchParams.view === "slices" || searchParams.space) return <ExploreShell />;
  return <ExploreClient />;
}
