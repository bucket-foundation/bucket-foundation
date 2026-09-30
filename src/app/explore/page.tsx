import { stageV2Enabled } from "@/lib/stage/flag";
import ExploreClient from "./ExploreClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Explore · bucket.foundation",
  description: "Search canon excerpts and advisors together.",
};

export default function Page() {
  return <ExploreClient stage={stageV2Enabled()} />;
}
