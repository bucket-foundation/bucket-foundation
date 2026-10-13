import ExploreClient from "./ExploreClient";
import ExploreShell from "./ExploreShell";
import { samplesAllowed } from "@/lib/explore/sample-gate";
import { signInClosed } from "@/lib/sign-in-gate";

export const metadata = {
  title: "Explore · bucket.foundation",
  description: "Search canon excerpts and advisors together.",
};

export default function Page({ searchParams }: { searchParams: { view?: string; space?: string } }) {
  if (searchParams.view === "circle" || searchParams.view === "slices" || searchParams.space) return <ExploreShell samples={samplesAllowed()} workspaceLinks={!signInClosed()} saveInPlace={signInClosed()} />;
  return <ExploreClient />;
}
