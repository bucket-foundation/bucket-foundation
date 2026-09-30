import ExploreClient from "./ExploreClient";
import SpaceView from "@/components/explore/SpaceView";

export const metadata = {
  title: "Explore · bucket.foundation",
  description: "Search canon excerpts and advisors together.",
};

export default function Page({ searchParams }: { searchParams: { view?: string } }) {
  if (searchParams.view === "circle") return <SpaceView view="circle" />;
  return <ExploreClient />;
}
