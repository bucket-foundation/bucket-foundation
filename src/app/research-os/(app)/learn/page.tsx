import type { Metadata } from "next";
import LearnHome from "./LearnHome";

export const metadata: Metadata = { title: "Learn", robots: { index: false, follow: false } };

export default function LearnPage() {
  return <LearnHome />;
}
