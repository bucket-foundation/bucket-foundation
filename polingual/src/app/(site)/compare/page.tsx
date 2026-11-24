import type { Metadata } from "next";
import { CompareIndexView } from "./views";
import { COMPARE_INDEX } from "@/lib/compare";
import { pageMeta } from "@/lib/meta";

export const metadata: Metadata = pageMeta({ path: "/compare", title: COMPARE_INDEX.title, documentTitle: `${COMPARE_INDEX.title} | Polingual`, description: COMPARE_INDEX.description });

export default function Page() {
  return <CompareIndexView />;
}
